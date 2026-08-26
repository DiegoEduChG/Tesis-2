// backend/src/controllers/grabacion.controller.js
//
// Implementa el flujo 3.2.3 del DDS ("Grabación de Audio") y el
// endpoint 3.4.4.4. Da soporte a RF04, RF06, RF08, RF09, RF10, RF11,
// RF15 y RF26.

const modelo = require('../models/grabacion.model');
const almacenamiento = require('../services/almacenamiento');
const { validarWav } = require('../utils/validarWav');
const { CODIGOS, enviarError } = require('../utils/errores');

/**
 * Genera el nombre de archivo estándar:
 *   {lengua}-{idMetadatos}-{AAAAMMDD}-{HHMMSS}.wav
 *
 * Se usa id_metadatos y no el DNI del hablante: el nombre del archivo
 * viaja dentro del corpus exportado, que se distribuye bajo licencia
 * abierta, y el DNI es un dato personal identificable protegido por la
 * Ley N.º 29733.
 */
function generarNombreArchivo(lengua, idMetadatos) {
  const ahora = new Date();
  const pad = (n) => String(n).padStart(2, '0');

  const fecha = `${ahora.getFullYear()}${pad(ahora.getMonth() + 1)}${pad(ahora.getDate())}`;
  const hora = `${pad(ahora.getHours())}${pad(ahora.getMinutes())}${pad(ahora.getSeconds())}`;
  const lenguaSlug = lengua.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // quita tildes
    .replace(/[^a-z0-9]/g, '');

  return `${lenguaSlug}-${idMetadatos}-${fecha}-${hora}.wav`;
}

// ---------------------------------------------------------------------
// POST /api/grabaciones     (DDS 3.4.4.4)
// ---------------------------------------------------------------------
async function registrar(req, res) {
  const { id_metadatos, id_transcripcion } = req.body;

  // --- 1. Validación de los identificadores ---
  if (!id_metadatos || !id_transcripcion) {
    return enviarError(
      res,
      400,
      CODIGOS.DATOS_INVALIDOS,
      'Faltan los campos id_metadatos o id_transcripcion.'
    );
  }

  if (!req.file) {
    return enviarError(
      res,
      400,
      CODIGOS.AUDIO_NO_RECIBIDO,
      'No se recibió ningún archivo de audio.'
    );
  }

  // --- 2. Validación del formato de audio ---
  // Se comprueban los parámetros reales de la cabecera, no el nombre ni
  // el mimetype declarados por el cliente. Un archivo fuera de
  // especificación se rechaza antes de tocar el almacenamiento o la
  // base de datos.
  const analisis = validarWav(req.file.buffer);

  if (!analisis.valido) {
    return enviarError(
      res,
      400,
      CODIGOS.FORMATO_AUDIO_INVALIDO,
      'El audio no cumple el formato requerido (WAV PCM, 16 bits, 16 kHz, mono).',
      [{ campo: 'audio', problema: analisis.motivo }]
    );
  }

  try {
    // --- 3. Resolución de la lengua del hablante ---
    // Sirve para nombrar el archivo y, de paso, confirma que el
    // id_metadatos corresponde a un hablante existente.
    const lengua = await modelo.buscarLenguaDeHablante(Number(id_metadatos));

    if (!lengua) {
      return enviarError(
        res,
        404,
        CODIGOS.RECURSO_NO_ENCONTRADO,
        'El hablante indicado no existe.'
      );
    }

    // --- 4. Almacenamiento del archivo ---
    const nombreArchivo = generarNombreArchivo(lengua, id_metadatos);
    const urlAudio = await almacenamiento.subirArchivo(req.file.buffer, nombreArchivo);

    // --- 5. Registro en la base de datos ---
    // La duración proviene del análisis de la cabecera, no del valor
    // que reporta el cliente: es el insumo del indicador del R4.1
    // ("al menos 20 minutos de audio validado") y debe ser una
    // medición verificable.
    const creado = await modelo.crear({
      idMetadatos: Number(id_metadatos),
      idTranscripcion: Number(id_transcripcion),
      urlAudio,
      nombreArchivo,
      duracionSegundos: analisis.duracionSegundos,
    });

    return res.status(201).json({
      ...creado,
      formato: {
        canales: analisis.canales,
        frecuencia_muestreo: analisis.frecuenciaMuestreo,
        bits_por_muestra: analisis.bitsPorMuestra,
      },
    });
  } catch (error) {
    // La restricción uq_grabacion_transcripcion impide que un mismo
    // enunciado tenga más de una grabación asociada.
    if (error.code === 'ER_DUP_ENTRY') {
      return enviarError(
        res,
        409,
        CODIGOS.GRABACION_YA_EXISTE,
        'Ya existe una grabación asociada a este enunciado.'
      );
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
      return enviarError(
        res,
        404,
        CODIGOS.RECURSO_NO_ENCONTRADO,
        'El enunciado indicado no existe.'
      );
    }

    console.error('Error al registrar la grabación:', error.message);

    return enviarError(
      res,
      500,
      CODIGOS.ERROR_INTERNO,
      'Ocurrió un error al guardar la grabación.'
    );
  }
}

module.exports = { registrar };
