// frontend/src/services/validacionService.js

const API_BASE = 'http://localhost:3000/api';

/**
 * Solicita una grabación pendiente de validación para este hablante.
 * @returns {Promise<object|null>} La grabación, o null si no hay
 *          ninguna disponible para este validador.
 */
export async function obtenerPendiente(idMetadatos) {
  const respuesta = await fetch(
    `${API_BASE}/grabaciones/validar?id_metadatos=${idMetadatos}`
  );

  // 204 significa que el validador está al día: no hay contribuciones
  // de otros hablantes que le queden por evaluar.
  if (respuesta.status === 204) {
    return null;
  }

  const cuerpo = await respuesta.json();

  if (respuesta.status === 200) {
    return cuerpo;
  }

  throw new Error(cuerpo.mensaje || 'No fue posible obtener una grabación.');
}

/**
 * Emite un voto sobre una grabación.
 * @param {boolean} esValido true = "Aprobada", false = "Desaprobada".
 * @returns {Promise<object>} Conteo actualizado y estado resultante.
 * @throws {Error & {codigo?: string}}
 */
export async function emitirVoto({ idGrabacion, idMetadatos, esValido }) {
  const respuesta = await fetch(`${API_BASE}/votos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_grabacion: idGrabacion,
      id_metadatos: idMetadatos,
      es_valido: esValido,
    }),
  });

  const cuerpo = await respuesta.json();

  if (respuesta.status === 200) {
    return cuerpo;
  }

  const error = new Error(cuerpo.mensaje || 'No fue posible registrar el voto.');
  error.codigo = cuerpo.codigo;
  throw error;
}
