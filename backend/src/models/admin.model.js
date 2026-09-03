// backend/src/models/admin.model.js
//
// Consultas de apoyo a las funciones administrativas de gestión del
// corpus (DDS §3.2.6).

const pool = require('../config/db');

// ---------------------------------------------------------------------
// Autenticación
// ---------------------------------------------------------------------

async function buscarAdministradorPorUsuario(usuario) {
  const [filas] = await pool.query(
    'SELECT id_administrador, usuario, password_hash FROM administrador WHERE usuario = ?',
    [usuario]
  );

  return filas.length > 0 ? filas[0] : null;
}

// ---------------------------------------------------------------------
// Hablantes
// ---------------------------------------------------------------------

/**
 * Lista los hablantes registrados con búsqueda y filtros combinables.
 *
 * @param {object}  opciones
 * @param {string}  opciones.busqueda   Texto libre: coincide con el DNI
 *                                      o con el nombre de la lengua.
 * @param {string}  opciones.lengua     Filtro exacto por lengua.
 * @param {string}  opciones.rangoEdad  Filtro exacto por rango de edad.
 * @param {string}  opciones.genero     Filtro exacto por género.
 */
async function listarHablantes({
  busqueda,
  lengua,
  rangoEdad,
  genero,
  pagina = 1,
  limite = 50,
} = {}) {
  const desplazamiento = (pagina - 1) * limite;

  const condiciones = [];
  const parametros = [];

  if (busqueda) {
    // El DNI admite coincidencia por prefijo, de modo que el
    // administrador pueda localizar a un participante escribiendo solo
    // los primeros dígitos. La lengua admite coincidencia parcial en
    // cualquier posición.
    condiciones.push('(dni LIKE ? OR lengua LIKE ?)');
    parametros.push(`${busqueda}%`, `%${busqueda}%`);
  }

  if (lengua) {
    condiciones.push('lengua = ?');
    parametros.push(lengua);
  }

  if (rangoEdad) {
    condiciones.push('rango_edad = ?');
    parametros.push(rangoEdad);
  }

  if (genero) {
    condiciones.push('genero = ?');
    parametros.push(genero);
  }

  const filtro = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [conteo] = await pool.query(
    `SELECT COUNT(*) AS total FROM metadatos ${filtro}`,
    parametros
  );

  const [filas] = await pool.query(
    `SELECT id_metadatos, dni, rango_edad, genero, lengua, fecha_creacion
       FROM metadatos
       ${filtro}
      ORDER BY id_metadatos DESC
      LIMIT ? OFFSET ?`,
    [...parametros, limite, desplazamiento]
  );

  return { total: Number(conteo[0].total), pagina, hablantes: filas };
}

async function actualizarHablante(idMetadatos, { dni, rango_edad, genero, lengua }) {
  const [resultado] = await pool.query(
    `UPDATE metadatos
        SET dni = ?, rango_edad = ?, genero = ?, lengua = ?
      WHERE id_metadatos = ?`,
    [dni, rango_edad, genero, lengua, idMetadatos]
  );

  if (resultado.affectedRows === 0) return null;

  const [filas] = await pool.query(
    `SELECT id_metadatos, dni, rango_edad, genero, lengua, fecha_creacion
       FROM metadatos WHERE id_metadatos = ?`,
    [idMetadatos]
  );

  return filas[0];
}

// ---------------------------------------------------------------------
// Grabaciones
// ---------------------------------------------------------------------

async function listarGrabaciones({ estado, lengua, pagina = 1, limite = 50 }) {
  const desplazamiento = (pagina - 1) * limite;

  const condiciones = [];
  const parametros = [];

  if (estado) {
    condiciones.push('g.estado = ?');
    parametros.push(estado);
  }
  if (lengua) {
    condiciones.push('m.lengua = ?');
    parametros.push(lengua);
  }

  const filtro = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [conteo] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM grabacion g
       JOIN metadatos m ON m.id_metadatos = g.id_metadatos
       ${filtro}`,
    parametros
  );

  const [filas] = await pool.query(
    `SELECT g.id_grabacion, g.nombre_archivo, g.url_audio, g.duracion_segundos,
            g.estado, g.votos_positivos, g.votos_negativos, g.fecha_creacion,
            t.texto_transcripcion, m.lengua, m.id_metadatos
       FROM grabacion g
       JOIN transcripcion t ON t.id_transcripcion = g.id_transcripcion
       JOIN metadatos m ON m.id_metadatos = g.id_metadatos
       ${filtro}
      ORDER BY g.id_grabacion DESC
      LIMIT ? OFFSET ?`,
    [...parametros, limite, desplazamiento]
  );

  return { total: Number(conteo[0].total), pagina, grabaciones: filas };
}

/**
 * Cambia el estado de una grabación por decisión administrativa.
 *
 * Los contadores de votos se conservan sin alteración: constituyen el
 * registro histórico del proceso colaborativo y permiten distinguir
 * después una grabación validada por la comunidad de una validada
 * manualmente.
 */
async function actualizarEstadoGrabacion(idGrabacion, estado) {
  const [resultado] = await pool.query(
    'UPDATE grabacion SET estado = ? WHERE id_grabacion = ?',
    [estado, idGrabacion]
  );

  if (resultado.affectedRows === 0) return null;

  const [filas] = await pool.query(
    `SELECT id_grabacion, nombre_archivo, estado, votos_positivos, votos_negativos
       FROM grabacion WHERE id_grabacion = ?`,
    [idGrabacion]
  );

  return filas[0];
}

async function buscarGrabacion(idGrabacion) {
  const [filas] = await pool.query(
    `SELECT id_grabacion, id_transcripcion, nombre_archivo, estado
       FROM grabacion WHERE id_grabacion = ?`,
    [idGrabacion]
  );

  return filas.length > 0 ? filas[0] : null;
}

/**
 * Elimina una grabación y su enunciado asociado.
 *
 * Los votos se eliminan en cascada por la definición de la clave
 * foránea. El enunciado se elimina en la misma transacción porque, sin
 * su grabación, carece de utilidad para el corpus y quedaría huérfano.
 */
async function eliminarGrabacion(idGrabacion, idTranscripcion) {
  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();
    await conexion.query('DELETE FROM grabacion WHERE id_grabacion = ?', [idGrabacion]);
    await conexion.query('DELETE FROM transcripcion WHERE id_transcripcion = ?', [
      idTranscripcion,
    ]);
    await conexion.commit();
  } catch (error) {
    await conexion.rollback().catch(() => {});
    throw error;
  } finally {
    conexion.release();
  }
}

// ---------------------------------------------------------------------
// Exportación
// ---------------------------------------------------------------------

async function obtenerCorpusValidado(lengua) {
  const filtro = lengua ? 'AND m.lengua = ?' : '';
  const parametros = lengua ? [lengua] : [];

  const [filas] = await pool.query(
    `SELECT g.id_grabacion, g.id_transcripcion, g.nombre_archivo,
            g.duracion_segundos, t.texto_transcripcion,
            m.id_metadatos, m.rango_edad, m.genero, m.lengua
       FROM grabacion g
       JOIN transcripcion t ON t.id_transcripcion = g.id_transcripcion
       JOIN metadatos m ON m.id_metadatos = g.id_metadatos
      WHERE g.estado = 'validada' ${filtro}
      ORDER BY g.id_grabacion ASC`,
    parametros
  );

  return filas;
}

async function registrarExportacion({ idAdministrador, lengua, nGrabaciones, nombreArchivo }) {
  await pool.query(
    `INSERT INTO exportacion (id_administrador, lengua, n_grabaciones, nombre_archivo)
     VALUES (?, ?, ?, ?)`,
    [idAdministrador, lengua || null, nGrabaciones, nombreArchivo]
  );
}

// ---------------------------------------------------------------------
// Métricas del corpus
// ---------------------------------------------------------------------

/**
 * Resumen del estado del corpus. Alimenta el indicador del resultado
 * R4.1 ("al menos 20 minutos de audio validado con un mínimo de 5
 * hablantes"), permitiendo consultarlo durante la prueba piloto sin
 * necesidad de ejecutar consultas manuales.
 */
async function obtenerMetricas() {
  const [filas] = await pool.query(
    `SELECT
       COUNT(*) AS total_grabaciones,
       COALESCE(SUM(estado = 'validada'), 0) AS validadas,
       COALESCE(SUM(estado = 'pendiente'), 0) AS pendientes,
       COALESCE(SUM(estado = 'rechazada'), 0) AS rechazadas,
       COALESCE(SUM(CASE WHEN estado = 'validada' THEN duracion_segundos END), 0) AS segundos_validados,
       COUNT(DISTINCT CASE WHEN estado = 'validada' THEN id_metadatos END) AS hablantes_validados
     FROM grabacion`
  );

  const m = filas[0];

  // Desglose por lengua: permite al administrador saber qué lenguas
  // tienen material validado antes de exportar, sin recorrer el
  // listado completo de grabaciones.
  const [porLengua] = await pool.query(
    `SELECT m.lengua,
            COUNT(*) AS validadas,
            COALESCE(SUM(g.duracion_segundos), 0) AS segundos,
            COUNT(DISTINCT g.id_metadatos) AS hablantes
       FROM grabacion g
       JOIN metadatos m ON m.id_metadatos = g.id_metadatos
      WHERE g.estado = 'validada'
      GROUP BY m.lengua
      ORDER BY validadas DESC`
  );

  return {
    total_grabaciones: Number(m.total_grabaciones),
    validadas: Number(m.validadas),
    pendientes: Number(m.pendientes),
    rechazadas: Number(m.rechazadas),
    minutos_validados: Number((Number(m.segundos_validados) / 60).toFixed(2)),
    hablantes_con_audio_validado: Number(m.hablantes_validados),
    por_lengua: porLengua.map((f) => ({
      lengua: f.lengua,
      validadas: Number(f.validadas),
      minutos: Number((Number(f.segundos) / 60).toFixed(2)),
      hablantes: Number(f.hablantes),
    })),
  };
}

module.exports = {
  buscarAdministradorPorUsuario,
  listarHablantes,
  actualizarHablante,
  listarGrabaciones,
  actualizarEstadoGrabacion,
  buscarGrabacion,
  eliminarGrabacion,
  obtenerCorpusValidado,
  registrarExportacion,
  obtenerMetricas,
};
