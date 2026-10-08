// frontend/src/services/metadatosService.js
//
// Único punto de contacto con el endpoint /api/metadatos. Corresponde
// a la responsabilidad del "Gestor de Estado" descrito en el DDS
// (2.2.1.1): es el único que hace peticiones HTTP; los componentes de
// interfaz no llaman a fetch directamente.

import { API_BASE } from '../config/api.js';

/**
 * Consulta si existe un hablante registrado con ese DNI.
 * @returns {Promise<{existe: boolean, datos: object|null}>}
 */
export async function consultarPorDni(dni) {
  const respuesta = await fetch(`${API_BASE}/metadatos/${dni}`);
  const cuerpo = await respuesta.json();

  if (respuesta.status === 200) {
    return { existe: true, datos: cuerpo };
  }

  if (respuesta.status === 404) {
    return { existe: false, datos: null };
  }

  // Cualquier otro código (400, 500...) es un problema real, no un
  // "no encontrado" esperado.
  throw new Error(cuerpo.mensaje || 'No fue posible consultar el DNI.');
}

/**
 * Registra un nuevo hablante nativo.
 * @returns {Promise<object>} Los metadatos creados, con su id_metadatos.
 * @throws {Error & {detalles?: Array}} Si el backend rechaza la petición.
 */
export async function registrar({ dni, rango_edad, genero, lengua }) {
  const respuesta = await fetch(`${API_BASE}/metadatos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dni, rango_edad, genero, lengua }),
  });

  const cuerpo = await respuesta.json();

  if (respuesta.status === 201) {
    return cuerpo;
  }

  const error = new Error(cuerpo.mensaje || 'No fue posible registrar al hablante.');
  error.codigo = cuerpo.codigo;
  error.detalles = cuerpo.detalles || [];
  throw error;
}
