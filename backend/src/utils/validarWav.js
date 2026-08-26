// backend/src/utils/validarWav.js
//
// Analiza la cabecera de un archivo WAV y verifica que cumpla los
// parámetros de calidad exigidos por el ERS (sección 3.5) y el DDS
// (sección 2.2.1.4): PCM sin comprimir, 16 bits, 16 kHz, monoaural.
//
// Por qué se valida aquí y no solo en el navegador:
// el frontend ya realiza la conversión al formato correcto, pero esa
// garantía depende de que la petición provenga de la aplicación
// legítima. Un cliente manipulado, una petición construida a mano o un
// error de conversión no detectado producirían archivos fuera de
// especificación que contaminarían el corpus. La verificación en el
// servidor es la única que no puede eludirse.
//
// Además de validar, la función calcula la duración real del audio a
// partir de la cabecera. Esto es preferible a confiar en el valor que
// reporta el cliente, porque la duración acumulada del corpus es el
// indicador del resultado R4.1 ("al menos 20 minutos de audio
// validado") y debe ser una medición, no una declaración.

const FORMATO_PCM = 1;
const CANALES_ESPERADOS = 1; // mono
const FRECUENCIA_ESPERADA = 16000; // 16 kHz
const BITS_ESPERADOS = 16;

/**
 * @param {Buffer} buffer Contenido completo del archivo.
 * @returns {{valido: boolean, motivo?: string, canales?: number,
 *            frecuenciaMuestreo?: number, bitsPorMuestra?: number,
 *            duracionSegundos?: number}}
 */
function validarWav(buffer) {
  if (!buffer || buffer.length < 44) {
    return { valido: false, motivo: 'El archivo es demasiado pequeño para ser un WAV válido.' };
  }

  if (buffer.toString('ascii', 0, 4) !== 'RIFF') {
    return { valido: false, motivo: 'Falta el identificador RIFF.' };
  }

  if (buffer.toString('ascii', 8, 12) !== 'WAVE') {
    return { valido: false, motivo: 'Falta el identificador WAVE.' };
  }

  // Los bloques ("chunks") de un WAV no siempre vienen en el mismo
  // orden ni son solo dos: algunos codificadores insertan bloques
  // adicionales como LIST o fact entre "fmt " y "data". Por eso se
  // recorren en lugar de asumir posiciones fijas.
  let cursor = 12;
  let fmt = null;
  let tamanoDatos = null;

  while (cursor + 8 <= buffer.length) {
    const idBloque = buffer.toString('ascii', cursor, cursor + 4);
    const tamanoBloque = buffer.readUInt32LE(cursor + 4);
    const inicioContenido = cursor + 8;

    if (idBloque === 'fmt ') {
      if (inicioContenido + 16 > buffer.length) {
        return { valido: false, motivo: 'El bloque de formato está incompleto.' };
      }

      fmt = {
        formatoAudio: buffer.readUInt16LE(inicioContenido),
        canales: buffer.readUInt16LE(inicioContenido + 2),
        frecuenciaMuestreo: buffer.readUInt32LE(inicioContenido + 4),
        bytesPorSegundo: buffer.readUInt32LE(inicioContenido + 8),
        bitsPorMuestra: buffer.readUInt16LE(inicioContenido + 14),
      };
    } else if (idBloque === 'data') {
      tamanoDatos = tamanoBloque;
      break; // los datos de audio son lo último que necesitamos leer
    }

    // Los bloques se alinean a bytes pares: si el tamaño es impar, hay
    // un byte de relleno que no forma parte del contenido.
    cursor = inicioContenido + tamanoBloque + (tamanoBloque % 2);
  }

  if (!fmt) {
    return { valido: false, motivo: 'No se encontró el bloque de formato.' };
  }

  if (tamanoDatos === null) {
    return { valido: false, motivo: 'No se encontró el bloque de datos de audio.' };
  }

  if (fmt.formatoAudio !== FORMATO_PCM) {
    return { valido: false, motivo: 'El audio debe estar en PCM sin comprimir.' };
  }

  if (fmt.canales !== CANALES_ESPERADOS) {
    return {
      valido: false,
      motivo: `El audio debe ser monoaural (recibido: ${fmt.canales} canales).`,
    };
  }

  if (fmt.frecuenciaMuestreo !== FRECUENCIA_ESPERADA) {
    return {
      valido: false,
      motivo: `La frecuencia de muestreo debe ser 16 kHz (recibido: ${fmt.frecuenciaMuestreo} Hz).`,
    };
  }

  if (fmt.bitsPorMuestra !== BITS_ESPERADOS) {
    return {
      valido: false,
      motivo: `La profundidad debe ser de 16 bits (recibido: ${fmt.bitsPorMuestra} bits).`,
    };
  }

  if (tamanoDatos === 0) {
    return { valido: false, motivo: 'El archivo no contiene datos de audio.' };
  }

  const duracionSegundos = tamanoDatos / fmt.bytesPorSegundo;

  return {
    valido: true,
    canales: fmt.canales,
    frecuenciaMuestreo: fmt.frecuenciaMuestreo,
    bitsPorMuestra: fmt.bitsPorMuestra,
    duracionSegundos: Number(duracionSegundos.toFixed(2)),
  };
}

module.exports = {
  validarWav,
  CANALES_ESPERADOS,
  FRECUENCIA_ESPERADA,
  BITS_ESPERADOS,
};
