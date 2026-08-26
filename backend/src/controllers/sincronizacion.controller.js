// backend/src/controllers/sincronizacion.controller.js
//
// Implementa el flujo 3.2.5 del DDS ("Sincronización de Datos en Modo
// Offline") y el endpoint 3.4.4.7. Da soporte a RF13 y RF14.
//
// Recibe en lote las contribuciones que el cliente acumuló mientras no
// tenía conexión. Cada contribución se procesa de forma independiente:
// el fallo de una no interrumpe el tratamiento de las restantes, tal
// como especifica el flujo de excepción "Sincronización parcial".

const pool = require('../config/db');
const almacenamiento = require('../services/almacenamiento');
const { validarWav } = require('../utils/validarWav');
const { generarNombreArchivo } = require('../utils/nombreArchivo');
const { CODIGOS, enviarError } = require('../utils/errores');

const MAXIMO_POR_LOTE = 50;

/**
 * Procesa una contribución dentro de una transacción.
 *
 * El orden transcripción → grabación no es arbitrario: la tabla
 * grabacion mantiene una clave foránea hacia transcripcion, de modo que
 * el enunciado debe existir antes de registrar el audio. Si la
 * grabación falla, la transacción revierte también la transcripción,
 * evitando enunciados huérfanos sin audio asociado.
 */
async function procesarContribucion({ idMetadatos, texto, bufferAudio }) {
  const conexion = await pool.getConnection();

  try {
    // Verificación previa fuera de la transacción: no tiene sentido
    // abrir una transacción para un hablante que no existe.
    const [hablantes] = await conexion.query(
      'SELECT lengua FROM metadatos WHERE id_metadatos = ?',
      [idMetadatos]
    );

    if (hablantes.length === 0) {
      return { ok: false, codigo: CODIGOS.RECURSO_NO_ENCONTRADO };
    }

    const analisis = validarWav(bufferAudio);
    if (!analisis.valido) {
      return { ok: false, codigo: CODIGOS.FORMATO_AUDIO_INVALIDO };
    }

    const nombreArchivo = generarNombreArchivo(hablantes[0].lengua, idMetadatos);
    const urlAudio = await almacenamiento.subirArchivo(bufferAudio, nombreArchivo);

    await conexion.beginTransaction();

    const [resTranscripcion] = await conexion.query(
      `INSERT INTO transcripcion (id_metadatos, texto_transcripcion)
       VALUES (?, ?)`,
      [idMetadatos, texto]
    );
    const idTranscripcion = resTranscripcion.insertId;

    const [resGrabacion] = await conexion.query(
      `INSERT INTO grabacion
         (id_metadatos, id_transcripcion, url_audio, nombre_archivo, duracion_segundos)
       VALUES (?, ?, ?, ?, ?)`,
      [idMetadatos, idTranscripcion, urlAudio, nombreArchivo, analisis.duracionSegundos]
    );

    await conexion.commit();

    return {
      ok: true,
      idTranscripcion,
      idGrabacion: resGrabacion.insertId,
    };
  } catch (error) {
    await conexion.rollback().catch(() => {});
    console.error('Error al sincronizar una contribución:', error.message);
    return { ok: false, codigo: CODIGOS.ERROR_INTERNO };
  } finally {
    conexion.release();
  }
}

// ---------------------------------------------------------------------
// POST /api/sincronizacion     (DDS 3.4.4.7)
//
// Formato esperado (multipart/form-data):
//   contribuciones : JSON con [{ id_local, id_metadatos, texto_transcripcion }]
//   audios         : un archivo por contribución, nombrado {id_local}.wav
// ---------------------------------------------------------------------
async function sincronizar(req, res) {
  let contribuciones;

  try {
    contribuciones = JSON.parse(req.body.contribuciones || '[]');
  } catch {
    return enviarError(
      res,
      400,
      CODIGOS.DATOS_INVALIDOS,
      'El campo "contribuciones" no contiene un JSON válido.'
    );
  }

  if (!Array.isArray(contribuciones) || contribuciones.length === 0) {
    return enviarError(
      res,
      400,
      CODIGOS.DATOS_INVALIDOS,
      'No se recibió ninguna contribución para sincronizar.'
    );
  }

  if (contribuciones.length > MAXIMO_POR_LOTE) {
    return enviarError(
      res,
      400,
      CODIGOS.DATOS_INVALIDOS,
      `Un lote no puede superar las ${MAXIMO_POR_LOTE} contribuciones.`
    );
  }

  // Los archivos llegan nombrados con el id_local de su contribución,
  // que es lo que permite emparejarlos sin depender del orden de envío.
  const archivosPorIdLocal = new Map();
  for (const archivo of req.files || []) {
    const idLocal = archivo.originalname.replace(/\.wav$/i, '');
    archivosPorIdLocal.set(idLocal, archivo.buffer);
  }

  const sincronizadas = [];
  const fallidas = [];

  for (const contribucion of contribuciones) {
    const { id_local: idLocal, id_metadatos: idMetadatos, texto_transcripcion: texto } =
      contribucion;

    if (!idLocal) continue;

    const bufferAudio = archivosPorIdLocal.get(idLocal);
    const textoLimpio = typeof texto === 'string' ? texto.trim() : '';

    if (!idMetadatos || textoLimpio.length === 0 || !bufferAudio) {
      fallidas.push({ id_local: idLocal, codigo: CODIGOS.DATOS_INVALIDOS });
      continue;
    }

    const resultado = await procesarContribucion({
      idMetadatos: Number(idMetadatos),
      texto: textoLimpio,
      bufferAudio,
    });

    if (resultado.ok) {
      sincronizadas.push({
        id_local: idLocal,
        id_transcripcion: resultado.idTranscripcion,
        id_grabacion: resultado.idGrabacion,
      });
    } else {
      fallidas.push({ id_local: idLocal, codigo: resultado.codigo });
    }
  }

  return res.status(200).json({ sincronizadas, fallidas });
}

module.exports = { sincronizar };
