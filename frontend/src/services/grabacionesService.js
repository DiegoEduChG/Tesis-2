// frontend/src/services/grabacionesService.js

import { API_BASE } from '../config/api.js';

/**
 * Sube la grabación de voz al servidor.
 *
 * No se envía la duración: el backend la calcula a partir de la
 * cabecera del propio archivo WAV. La duración acumulada del corpus es
 * el indicador del resultado R4.1, así que debe medirse sobre el audio
 * real y no depender de un valor declarado por el cliente.
 *
 * @throws {Error & {codigo?: string, detalles?: Array}}
 */
export async function subir({ idMetadatos, idTranscripcion, wavBlob }) {
  const formData = new FormData();
  formData.append('audio', wavBlob, 'grabacion.wav');
  formData.append('id_metadatos', idMetadatos);
  formData.append('id_transcripcion', idTranscripcion);

  // No se define Content-Type manualmente: el navegador genera el valor
  // correcto para multipart/form-data, incluido el "boundary" que
  // separa los campos. Definirlo a mano rompe el envío del archivo.
  const respuesta = await fetch(`${API_BASE}/grabaciones`, {
    method: 'POST',
    body: formData,
  });

  const cuerpo = await respuesta.json();

  if (respuesta.status === 201) {
    return cuerpo;
  }

  const error = new Error(cuerpo.mensaje || 'No fue posible subir la grabación.');
  error.codigo = cuerpo.codigo;
  error.detalles = cuerpo.detalles || [];
  throw error;
}
