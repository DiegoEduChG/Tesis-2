// backend/src/models/grabacion.model.js

const pool = require('../config/db');

/**
 * Obtiene la lengua declarada por un hablante. Se usa para nombrar el
 * archivo de audio y, de paso, para confirmar que el id_metadatos
 * recibido corresponde a un hablante existente.
 * @returns {string|null}
 */
async function buscarLenguaDeHablante(idMetadatos) {
  const [filas] = await pool.query(
    'SELECT lengua FROM metadatos WHERE id_metadatos = ?',
    [idMetadatos]
  );

  return filas.length > 0 ? filas[0].lengua : null;
}

/**
 * Registra una grabación con estado inicial "pendiente".
 */
async function crear({ idMetadatos, idTranscripcion, urlAudio, nombreArchivo, duracionSegundos }) {
  const [resultado] = await pool.query(
    `INSERT INTO grabacion
       (id_metadatos, id_transcripcion, url_audio, nombre_archivo, duracion_segundos)
     VALUES (?, ?, ?, ?, ?)`,
    [idMetadatos, idTranscripcion, urlAudio, nombreArchivo, duracionSegundos ?? null]
  );

  const [filas] = await pool.query(
    `SELECT id_grabacion, id_metadatos, id_transcripcion, url_audio,
            nombre_archivo, duracion_segundos, estado, fecha_creacion
       FROM grabacion
      WHERE id_grabacion = ?`,
    [resultado.insertId]
  );

  return filas[0];
}

module.exports = { buscarLenguaDeHablante, crear };
