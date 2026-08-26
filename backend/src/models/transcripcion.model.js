// backend/src/models/transcripcion.model.js
//
// Capa de acceso a datos de la tabla "transcripcion".

const pool = require('../config/db');

/**
 * Crea un nuevo enunciado y devuelve el registro completo, incluida
 * la fecha_creacion que asigna la base de datos.
 */
async function crear(idMetadatos, textoTranscripcion) {
  const [resultado] = await pool.query(
    `INSERT INTO transcripcion (id_metadatos, texto_transcripcion)
     VALUES (?, ?)`,
    [idMetadatos, textoTranscripcion]
  );

  const [filas] = await pool.query(
    `SELECT id_transcripcion, id_metadatos, texto_transcripcion, fecha_creacion
       FROM transcripcion
      WHERE id_transcripcion = ?`,
    [resultado.insertId]
  );

  return filas[0];
}

module.exports = { crear };
