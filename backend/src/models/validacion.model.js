// backend/src/models/validacion.model.js
//
// Consultas de apoyo al módulo de validación por pares.

const pool = require('../config/db');

/**
 * Busca una grabación disponible para que el validador indicado la
 * evalúe.
 *
 * La consulta aplica los tres filtros del DDS §3.2.4 antes de
 * presentar la grabación, y no después de recibir el voto:
 *
 *   1. Solo grabaciones en estado "pendiente": las que ya alcanzaron
 *      un umbral no admiten más votos.
 *   2. Que no pertenezcan al propio validador: nadie valida sus
 *      contribuciones.
 *   3. Que el validador no haya votado antes.
 *
 * Resolver la tercera condición dentro de la consulta —en lugar de
 * mostrar la grabación y rechazar el voto después— evita que el
 * validador escuche un audio que no va a poder evaluar.
 *
 * El orden por fecha de creación ascendente atiende primero a las
 * contribuciones más antiguas, de modo que ninguna quede sin validar
 * indefinidamente mientras se acumulan otras más recientes.
 *
 * @returns {object|null}
 */
async function buscarGrabacionPendiente(idValidador) {
  const [filas] = await pool.query(
    `SELECT g.id_grabacion,
            g.url_audio,
            g.duracion_segundos,
            g.votos_positivos,
            g.votos_negativos,
            t.texto_transcripcion
       FROM grabacion g
       JOIN transcripcion t ON t.id_transcripcion = g.id_transcripcion
      WHERE g.estado = 'pendiente'
        AND g.id_metadatos <> ?
        AND NOT EXISTS (
              SELECT 1 FROM voto v
               WHERE v.id_grabacion = g.id_grabacion
                 AND v.id_metadatos = ?
            )
      ORDER BY g.fecha_creacion ASC
      LIMIT 1`,
    [idValidador, idValidador]
  );

  return filas.length > 0 ? filas[0] : null;
}

/**
 * Cuenta cuántas grabaciones quedan disponibles para este validador.
 * Permite informarle del trabajo pendiente sin recorrerlas una a una.
 */
async function contarPendientesPara(idValidador) {
  const [filas] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM grabacion g
      WHERE g.estado = 'pendiente'
        AND g.id_metadatos <> ?
        AND NOT EXISTS (
              SELECT 1 FROM voto v
               WHERE v.id_grabacion = g.id_grabacion
                 AND v.id_metadatos = ?
            )`,
    [idValidador, idValidador]
  );

  return Number(filas[0].total);
}

module.exports = { buscarGrabacionPendiente, contarPendientesPara };
