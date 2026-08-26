// frontend/src/services/transcripcionesService.js

const API_BASE = 'http://localhost:3000/api';

/**
 * Registra el enunciado redactado por el hablante.
 * @returns {Promise<object>} El registro creado, con su id_transcripcion.
 * @throws {Error & {codigo?: string, detalles?: Array}}
 */
export async function crear({ id_metadatos, texto_transcripcion }) {
  const respuesta = await fetch(`${API_BASE}/transcripciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_metadatos, texto_transcripcion }),
  });

  const cuerpo = await respuesta.json();

  if (respuesta.status === 201) {
    return cuerpo;
  }

  const error = new Error(cuerpo.mensaje || 'No fue posible guardar el enunciado.');
  error.codigo = cuerpo.codigo;
  error.detalles = cuerpo.detalles || [];
  throw error;
}
