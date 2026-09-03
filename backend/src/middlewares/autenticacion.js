// backend/src/middlewares/autenticacion.js
//
// Middleware de Autenticación descrito en el DDS §2.2.1.2. Toda
// petición dirigida a un endpoint administrativo atraviesa esta
// verificación antes de alcanzar su controlador.
//
// Implementa el atributo de seguridad del ERS §3.6.1: "Las funciones
// administrativas estarán restringidas exclusivamente a usuarios con
// rol de Administrador" y "La sesión del Administrador se gestionará
// mediante tokens (JWT) con un tiempo de expiración definido".

const jwt = require('jsonwebtoken');
const { CODIGOS, enviarError } = require('../utils/errores');

const DURACION_SESION_SEGUNDOS = 8 * 60 * 60; // 8 horas

/**
 * Genera un token de sesión para un administrador autenticado.
 */
function generarToken(idAdministrador, usuario) {
  return jwt.sign(
    { id_administrador: idAdministrador, usuario },
    process.env.JWT_SECRET,
    { expiresIn: DURACION_SESION_SEGUNDOS }
  );
}

/**
 * Verifica el token presente en la cabecera Authorization.
 * Si es válido, adjunta los datos del administrador a req.admin y
 * cede el paso al controlador; en caso contrario rechaza la petición.
 */
function verificarSesion(req, res, next) {
  const cabecera = req.headers.authorization || '';

  // Formato esperado: "Bearer <token>"
  const [esquema, token] = cabecera.split(' ');

  if (esquema !== 'Bearer' || !token) {
    return enviarError(
      res,
      401,
      CODIGOS.SESION_NO_VALIDA,
      'Se requiere una sesión de administrador para acceder a este recurso.'
    );
  }

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    // Se agrupan la expiración y la manipulación del token en una sola
    // respuesta: distinguirlas daría información útil a un atacante y
    // el frontend actúa igual en ambos casos, redirigiendo al inicio
    // de sesión.
    return enviarError(
      res,
      401,
      CODIGOS.SESION_NO_VALIDA,
      'La sesión es inválida o ha expirado. Vuelve a iniciar sesión.'
    );
  }
}

module.exports = { generarToken, verificarSesion, DURACION_SESION_SEGUNDOS };
