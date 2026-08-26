// backend/src/utils/errores.js
//
// Respuestas de error normalizadas según la sección 3.4.2 del DDS.
// Todas las respuestas de error del sistema comparten la misma
// estructura, de modo que el frontend pueda tratarlas de forma uniforme
// con independencia del endpoint que las origine.

// Catálogo de códigos definido en el DDS, sección 3.4.2.1
const CODIGOS = {
  DATOS_INVALIDOS: 'DATOS_INVALIDOS',
  HABLANTE_NO_ENCONTRADO: 'HABLANTE_NO_ENCONTRADO',
  DNI_YA_REGISTRADO: 'DNI_YA_REGISTRADO',
  ENUNCIADO_VACIO: 'ENUNCIADO_VACIO',
  RECURSO_NO_ENCONTRADO: 'RECURSO_NO_ENCONTRADO',
  FORMATO_AUDIO_INVALIDO: 'FORMATO_AUDIO_INVALIDO',
  VOTO_DUPLICADO: 'VOTO_DUPLICADO',
  GRABACION_NO_PENDIENTE: 'GRABACION_NO_PENDIENTE',
  SIN_GRABACIONES_PENDIENTES: 'SIN_GRABACIONES_PENDIENTES',
  CREDENCIALES_INVALIDAS: 'CREDENCIALES_INVALIDAS',
  SESION_NO_VALIDA: 'SESION_NO_VALIDA',
  SIN_DATOS_PARA_EXPORTAR: 'SIN_DATOS_PARA_EXPORTAR',
  ERROR_ALMACENAMIENTO: 'ERROR_ALMACENAMIENTO',
  ERROR_INTERNO: 'ERROR_INTERNO',
};

/**
 * Envía una respuesta de error con el formato definido en el DDS.
 *
 * @param {object} res      Objeto response de Express
 * @param {number} estado   Código de estado HTTP
 * @param {string} codigo   Uno de los valores de CODIGOS
 * @param {string} mensaje  Texto orientado a mostrarse al usuario
 * @param {Array}  detalles Campos afectados, en errores de validación
 */
function enviarError(res, estado, codigo, mensaje, detalles = []) {
  return res.status(estado).json({
    error: true,
    codigo,
    mensaje,
    detalles,
  });
}

module.exports = { CODIGOS, enviarError };