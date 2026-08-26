// backend/src/models/metadatos.model.js
//
// Capa de acceso a datos de la tabla "metadatos". Corresponde al Modelo
// dentro de la arquitectura MVC definida en el DDS, sección 2.1.
//
// Todas las consultas usan parámetros con "?" en lugar de concatenar
// cadenas. mysql2 los escapa automáticamente, lo que previene la
// inyección de SQL.

const pool = require('../config/db');

/**
 * Busca un hablante nativo por su DNI.
 * @returns {object|null} El registro, o null si no existe.
 */
async function buscarPorDni(dni) {
  const [filas] = await pool.query(
    `SELECT id_metadatos, dni, rango_edad, genero, lengua, fecha_creacion
       FROM metadatos
      WHERE dni = ?`,
    [dni]
  );

  return filas.length > 0 ? filas[0] : null;
}

/**
 * Registra un nuevo hablante nativo.
 * @returns {number} El id_metadatos generado.
 */
async function crear({ dni, rango_edad, genero, lengua }) {
  const [resultado] = await pool.query(
    `INSERT INTO metadatos (dni, rango_edad, genero, lengua)
     VALUES (?, ?, ?, ?)`,
    [dni, rango_edad, genero, lengua]
  );

  return resultado.insertId;
}

module.exports = { buscarPorDni, crear };
