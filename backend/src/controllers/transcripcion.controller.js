// backend/src/controllers/transcripcion.controller.js
//
// Implementa el flujo 3.2.2 del DDS ("Transcripción de Audio") y el
// endpoint 3.4.4.3. Da soporte a RF07, RF11, RF17 y RF24.

const modelo = require('../models/transcripcion.model');
const { CODIGOS, enviarError } = require('../utils/errores');

// Debe coincidir exactamente con VARCHAR(500) en el esquema de la BD.
// Si cambias uno, cambia el otro y el diccionario de datos del DDS.
const LONGITUD_MAXIMA = 500;

// ---------------------------------------------------------------------
// POST /api/transcripciones     (DDS 3.4.4.3)
// ---------------------------------------------------------------------
async function registrar(req, res) {
  const { id_metadatos, texto_transcripcion } = req.body || {};

  if (!id_metadatos || !Number.isInteger(Number(id_metadatos))) {
    return enviarError(
      res,
      400,
      CODIGOS.DATOS_INVALIDOS,
      'Falta o es inválido el identificador del hablante.',
      [{ campo: 'id_metadatos', problema: 'Debe ser un número entero.' }]
    );
  }

  const texto = typeof texto_transcripcion === 'string' ? texto_transcripcion.trim() : '';

  // Corresponde al flujo de excepción "Enunciado vacío o inválido"
  // del DDS §3.2.2.
  if (texto.length === 0) {
    return enviarError(
      res,
      400,
      CODIGOS.ENUNCIADO_VACIO,
      'El enunciado no puede estar vacío.'
    );
  }

  if (texto.length > LONGITUD_MAXIMA) {
    return enviarError(
      res,
      400,
      CODIGOS.DATOS_INVALIDOS,
      `El enunciado no puede superar los ${LONGITUD_MAXIMA} caracteres.`,
      [{ campo: 'texto_transcripcion', problema: `Longitud actual: ${texto.length}.` }]
    );
  }

  try {
    const creado = await modelo.crear(Number(id_metadatos), texto);
    return res.status(201).json(creado);
  } catch (error) {
    // La clave foránea hacia "metadatos" rechaza el INSERT si el
    // id_metadatos no existe (por ejemplo, un id manipulado a mano
    // desde el cliente).
    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
      return enviarError(
        res,
        404,
        CODIGOS.RECURSO_NO_ENCONTRADO,
        'El hablante indicado no existe.'
      );
    }

    console.error('Error al registrar la transcripción:', error.message);

    return enviarError(
      res,
      500,
      CODIGOS.ERROR_INTERNO,
      'Ocurrió un error al guardar el enunciado.'
    );
  }
}

module.exports = { registrar };
