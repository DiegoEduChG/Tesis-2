// frontend/src/utils/wavEncoder.js
//
// Convierte el audio capturado por el navegador al formato WAV exigido
// por el ERS (§3.5) y el DDS (§2.2.1.1): PCM sin comprimir, 16 bits,
// 16 kHz, monoaural.
//
// ---------------------------------------------------------------------
// POR QUÉ ESTE MÓDULO EXISTE
// ---------------------------------------------------------------------
// Los navegadores no generan archivos WAV de forma nativa. MediaRecorder
// entrega el audio en un contenedor comprimido que varía según el
// navegador (WebM/Opus en Chrome y Edge, Ogg u otros en Firefox), y no
// ofrece ninguna opción para producir PCM sin comprimir.
//
// Se descartó recurrir a una biblioteca externa de codificación porque
// ninguna figura entre las herramientas declaradas en el proyecto, y
// porque las APIs estándar del navegador bastan para el proceso. La
// conversión se realiza en tres etapas:
//
//   1. Decodificar el blob a muestras de audio en bruto
//      (AudioContext.decodeAudioData).
//   2. Remuestrear a 16 kHz y reducir a un canal
//      (OfflineAudioContext: procesa el audio sin reproducirlo).
//   3. Escribir la cabecera RIFF/WAVE y volcar las muestras como
//      enteros PCM de 16 bits.
//
// El backend vuelve a verificar estos mismos parámetros sobre el archivo
// recibido (backend/src/utils/validarWav.js): la conversión correcta en
// el cliente no puede darse por garantizada desde el servidor.
// ---------------------------------------------------------------------

// Estos tres valores definen el formato del corpus. Deben coincidir con
// las constantes del validador del backend y con lo especificado en el
// ERS §3.5. Se exportan para que las pruebas unitarias puedan
// verificarlos sin duplicar literales.
export const FRECUENCIA_MUESTREO = 16000;
export const BITS_POR_MUESTRA = 16;
export const NUMERO_CANALES = 1;

const TAMANO_CABECERA = 44;

/**
 * @param {Blob} blobOriginal El blob que entrega MediaRecorder.
 * @returns {Promise<{blob: Blob, duracionSegundos: number}>}
 */
export async function convertirBlobAWav(blobOriginal) {
  const ContextoAudio = window.AudioContext || window.webkitAudioContext;
  const contexto = new ContextoAudio();

  try {
    const arrayBuffer = await blobOriginal.arrayBuffer();
    const audioOriginal = await contexto.decodeAudioData(arrayBuffer);

    const muestras = await remuestrearAMono16k(audioOriginal);
    const blob = codificarPcmComoWav(muestras);

    return {
      blob,
      duracionSegundos: muestras.length / FRECUENCIA_MUESTREO,
    };
  } finally {
    // Se cierra el contexto pase lo que pase: cada AudioContext abierto
    // consume recursos de audio del sistema, y el navegador limita
    // cuántos pueden existir simultáneamente.
    await contexto.close();
  }
}

/**
 * Remuestrea a 16 kHz y mezcla a un solo canal.
 * @returns {Float32Array} Muestras en el rango [-1, 1].
 */
async function remuestrearAMono16k(audioBuffer) {
  const numeroMuestras = Math.ceil(audioBuffer.duration * FRECUENCIA_MUESTREO);

  const contextoOffline = new OfflineAudioContext(
    NUMERO_CANALES,
    numeroMuestras,
    FRECUENCIA_MUESTREO
  );

  const fuente = contextoOffline.createBufferSource();
  fuente.buffer = audioBuffer;
  fuente.connect(contextoOffline.destination);
  fuente.start();

  const resultado = await contextoOffline.startRendering();
  return resultado.getChannelData(0);
}

/**
 * Construye el archivo WAV completo: cabecera de 44 bytes + datos PCM.
 * @param {Float32Array} muestras Valores en el rango [-1, 1].
 * @returns {Blob}
 */
export function codificarPcmComoWav(muestras) {
  const bytesPorMuestra = BITS_POR_MUESTRA / 8;
  const tamanoDatos = muestras.length * bytesPorMuestra;
  const buffer = new ArrayBuffer(TAMANO_CABECERA + tamanoDatos);
  const vista = new DataView(buffer);

  const escribirTexto = (offset, texto) => {
    for (let i = 0; i < texto.length; i++) {
      vista.setUint8(offset + i, texto.charCodeAt(i));
    }
  };

  const bytesPorSegundo = FRECUENCIA_MUESTREO * NUMERO_CANALES * bytesPorMuestra;
  const alineacionBloque = NUMERO_CANALES * bytesPorMuestra;

  // --- Bloque RIFF ---
  escribirTexto(0, 'RIFF');
  vista.setUint32(4, 36 + tamanoDatos, true); // tamaño restante del archivo
  escribirTexto(8, 'WAVE');

  // --- Bloque "fmt " ---
  escribirTexto(12, 'fmt ');
  vista.setUint32(16, 16, true);              // tamaño del bloque (16 = PCM)
  vista.setUint16(20, 1, true);               // 1 = PCM sin comprimir
  vista.setUint16(22, NUMERO_CANALES, true);
  vista.setUint32(24, FRECUENCIA_MUESTREO, true);
  vista.setUint32(28, bytesPorSegundo, true);
  vista.setUint16(32, alineacionBloque, true);
  vista.setUint16(34, BITS_POR_MUESTRA, true);

  // --- Bloque "data" ---
  escribirTexto(36, 'data');
  vista.setUint32(40, tamanoDatos, true);

  // Conversión Float32 [-1, 1] → entero PCM con signo de 16 bits.
  // Los rangos positivo y negativo son asimétricos (32767 frente a
  // -32768), por eso se escalan con factores distintos.
  let offset = TAMANO_CABECERA;
  for (let i = 0; i < muestras.length; i++, offset += bytesPorMuestra) {
    const acotada = Math.max(-1, Math.min(1, muestras[i]));
    vista.setInt16(offset, acotada < 0 ? acotada * 0x8000 : acotada * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
