// backend/tests/helpers/construirWav.js
//
// Construye buffers WAV sintéticos para las pruebas, sin depender de
// archivos de audio reales en el repositorio. Permite generar tanto
// archivos correctos como variantes deliberadamente inválidas para
// verificar que el validador las rechaza.

/**
 * @param {object} opciones
 * @param {number} [opciones.canales=1]
 * @param {number} [opciones.frecuencia=16000]
 * @param {number} [opciones.bits=16]
 * @param {number} [opciones.formatoAudio=1]   1 = PCM
 * @param {number} [opciones.numeroMuestras=16000]
 * @param {boolean} [opciones.incluirBloqueExtra=false]
 *        Inserta un bloque LIST entre "fmt " y "data", como hacen
 *        algunos codificadores reales.
 * @returns {Buffer}
 */
function construirWav({
  canales = 1,
  frecuencia = 16000,
  bits = 16,
  formatoAudio = 1,
  numeroMuestras = 16000,
  incluirBloqueExtra = false,
} = {}) {
  const bytesPorMuestra = bits / 8;
  const tamanoDatos = numeroMuestras * canales * bytesPorMuestra;
  const bytesPorSegundo = frecuencia * canales * bytesPorMuestra;

  // Bloque LIST opcional: 4 (id) + 4 (tamaño) + 6 (contenido impar) + 1 (relleno)
  const contenidoExtra = incluirBloqueExtra ? Buffer.from('INFOxy', 'ascii') : null;
  const tamanoExtra = contenidoExtra
    ? 8 + contenidoExtra.length + (contenidoExtra.length % 2)
    : 0;

  const buffer = Buffer.alloc(44 + tamanoExtra + tamanoDatos);
  let cursor = 0;

  const escribirTexto = (texto) => {
    buffer.write(texto, cursor, 'ascii');
    cursor += texto.length;
  };
  const escribirUint32 = (valor) => {
    buffer.writeUInt32LE(valor, cursor);
    cursor += 4;
  };
  const escribirUint16 = (valor) => {
    buffer.writeUInt16LE(valor, cursor);
    cursor += 2;
  };

  // --- RIFF ---
  escribirTexto('RIFF');
  escribirUint32(36 + tamanoExtra + tamanoDatos);
  escribirTexto('WAVE');

  // --- fmt ---
  escribirTexto('fmt ');
  escribirUint32(16);
  escribirUint16(formatoAudio);
  escribirUint16(canales);
  escribirUint32(frecuencia);
  escribirUint32(bytesPorSegundo);
  escribirUint16(canales * bytesPorMuestra);
  escribirUint16(bits);

  // --- LIST (opcional) ---
  if (contenidoExtra) {
    escribirTexto('LIST');
    escribirUint32(contenidoExtra.length);
    contenidoExtra.copy(buffer, cursor);
    cursor += contenidoExtra.length + (contenidoExtra.length % 2);
  }

  // --- data ---
  escribirTexto('data');
  escribirUint32(tamanoDatos);
  // El contenido queda en ceros (silencio); el validador solo analiza
  // la cabecera y el tamaño declarado.

  return buffer;
}

module.exports = { construirWav };
