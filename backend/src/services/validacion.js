// backend/src/services/validacion.js
//
// Servicio de Validación descrito en el DDS §2.2.1.2. Concentra la
// lógica de doble umbral que determina el estado final de una
// grabación dentro del proceso de validación por pares.
//
// Reglas implementadas (DDS §3.2.4 y resultado R3.1 del proyecto):
//   - Una grabación se marca como "validada" al alcanzar 3 votos
//     positivos, y como "rechazada" al alcanzar 3 votos negativos.
//   - Ambos umbrales operan de forma independiente: el primero en
//     alcanzarse determina el estado final.
//   - Alcanzado cualquiera de los dos, la grabación deja de admitir
//     nuevos votos.
//   - Cada hablante puede emitir como máximo un voto por grabación.
//   - Un hablante no puede votar sus propias grabaciones.
//
// ---------------------------------------------------------------------
// SOBRE LA CONCURRENCIA
// ---------------------------------------------------------------------
// El registro de un voto no es una operación atómica trivial: requiere
// leer el estado de la grabación, insertar el voto, recontar y
// actualizar. Si dos validadores votan la misma grabación
// simultáneamente, ambas ejecuciones podrían leer el mismo conteo
// previo y producir un estado final incorrecto.
//
// Por eso toda la operación transcurre dentro de una transacción que
// comienza bloqueando la fila de la grabación con SELECT ... FOR
// UPDATE. El segundo votante espera a que el primero confirme antes de
// leer, de modo que los votos se procesan en serie aunque lleguen a la
// vez. Esta garantía es la que hace que el umbral de tres votos
// signifique exactamente tres.
// ---------------------------------------------------------------------

const pool = require('../config/db');

const UMBRAL_VOTOS = 3;

const RESULTADO = {
  OK: 'OK',
  GRABACION_NO_ENCONTRADA: 'GRABACION_NO_ENCONTRADA',
  GRABACION_NO_PENDIENTE: 'GRABACION_NO_PENDIENTE',
  AUTOVOTO_NO_PERMITIDO: 'AUTOVOTO_NO_PERMITIDO',
  VOTO_DUPLICADO: 'VOTO_DUPLICADO',
  HABLANTE_NO_ENCONTRADO: 'HABLANTE_NO_ENCONTRADO',
};

/**
 * Determina el estado que corresponde a una grabación según su conteo
 * de votos. Función pura: se aísla de la base de datos para poder
 * verificarse mediante pruebas unitarias.
 *
 * @param {number} positivos
 * @param {number} negativos
 * @returns {'pendiente'|'validada'|'rechazada'}
 */
function evaluarUmbral(positivos, negativos) {
  if (positivos >= UMBRAL_VOTOS) return 'validada';
  if (negativos >= UMBRAL_VOTOS) return 'rechazada';
  return 'pendiente';
}

/**
 * Registra un voto y evalúa si la grabación alcanzó algún umbral.
 *
 * @param {number} idGrabacion
 * @param {number} idMetadatos  Hablante que emite el voto.
 * @param {boolean} esValido    true = "Aprobada", false = "Desaprobada".
 * @returns {Promise<object>} { resultado, ...datos } según el desenlace.
 */
async function registrarVoto(idGrabacion, idMetadatos, esValido) {
  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    // Bloqueo de la fila hasta el final de la transacción. Cualquier
    // otro voto sobre esta misma grabación espera aquí.
    const [grabaciones] = await conexion.query(
      `SELECT id_grabacion, id_metadatos, estado
         FROM grabacion
        WHERE id_grabacion = ?
        FOR UPDATE`,
      [idGrabacion]
    );

    if (grabaciones.length === 0) {
      await conexion.rollback();
      return { resultado: RESULTADO.GRABACION_NO_ENCONTRADA };
    }

    const grabacion = grabaciones[0];

    // Una grabación que ya alcanzó un umbral no admite más votos.
    if (grabacion.estado !== 'pendiente') {
      await conexion.rollback();
      return { resultado: RESULTADO.GRABACION_NO_PENDIENTE, estado: grabacion.estado };
    }

    // Un hablante no puede validar sus propias contribuciones. La
    // consulta de asignación ya evita presentárselas, pero esta
    // comprobación cierra la vía de una petición construida a mano.
    if (grabacion.id_metadatos === idMetadatos) {
      await conexion.rollback();
      return { resultado: RESULTADO.AUTOVOTO_NO_PERMITIDO };
    }

    try {
      await conexion.query(
        `INSERT INTO voto (id_grabacion, id_metadatos, es_valido)
         VALUES (?, ?, ?)`,
        [idGrabacion, idMetadatos, esValido ? 1 : 0]
      );
    } catch (error) {
      await conexion.rollback();

      // La restricción de unicidad (id_grabacion, id_metadatos) es la
      // garantía última del requerimiento RF37.
      if (error.code === 'ER_DUP_ENTRY') {
        return { resultado: RESULTADO.VOTO_DUPLICADO };
      }

      // La clave foránea hacia metadatos rechaza validadores
      // inexistentes.
      if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
        return { resultado: RESULTADO.HABLANTE_NO_ENCONTRADO };
      }

      throw error;
    }

    // Se recuenta sobre la tabla de votos en lugar de incrementar los
    // contadores: el recuento es la fuente de verdad, los contadores
    // de la tabla "grabacion" son una copia desnormalizada para
    // evitar agregaciones repetidas en las consultas de listado.
    const [conteos] = await conexion.query(
      `SELECT
         COALESCE(SUM(es_valido = 1), 0) AS positivos,
         COALESCE(SUM(es_valido = 0), 0) AS negativos
       FROM voto
      WHERE id_grabacion = ?`,
      [idGrabacion]
    );

    const positivos = Number(conteos[0].positivos);
    const negativos = Number(conteos[0].negativos);
    const nuevoEstado = evaluarUmbral(positivos, negativos);

    await conexion.query(
      `UPDATE grabacion
          SET votos_positivos = ?, votos_negativos = ?, estado = ?
        WHERE id_grabacion = ?`,
      [positivos, negativos, nuevoEstado, idGrabacion]
    );

    await conexion.commit();

    return {
      resultado: RESULTADO.OK,
      idGrabacion,
      votosPositivos: positivos,
      votosNegativos: negativos,
      estado: nuevoEstado,
    };
  } catch (error) {
    await conexion.rollback().catch(() => {});
    throw error;
  } finally {
    conexion.release();
  }
}

module.exports = { registrarVoto, evaluarUmbral, RESULTADO, UMBRAL_VOTOS };
