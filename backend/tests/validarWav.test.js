// backend/tests/validarWav.test.js
//
// Pruebas unitarias del validador de formato de audio.
//
// Este módulo es el único punto del sistema que garantiza que el corpus
// cumpla el formato especificado en el ERS §3.5 (WAV PCM, 16 bits,
// 16 kHz, mono). Un fallo aquí admitiría en el corpus archivos fuera de
// especificación, comprometiendo su utilidad para el entrenamiento de
// modelos de voz. Por eso se cubren tanto el caso correcto como cada
// motivo de rechazo por separado.

const { validarWav } = require('../src/utils/validarWav');
const { construirWav } = require('./helpers/construirWav');

describe('validarWav', () => {
  describe('archivos que cumplen la especificación', () => {
    test('acepta un WAV PCM de 16 bits, 16 kHz y mono', () => {
      const resultado = validarWav(construirWav());

      expect(resultado.valido).toBe(true);
      expect(resultado.canales).toBe(1);
      expect(resultado.frecuenciaMuestreo).toBe(16000);
      expect(resultado.bitsPorMuestra).toBe(16);
    });

    test('acepta archivos con bloques adicionales entre "fmt " y "data"', () => {
      // Algunos codificadores insertan bloques LIST o fact. Un parser
      // que asumiera posiciones fijas fallaría con estos archivos.
      const resultado = validarWav(construirWav({ incluirBloqueExtra: true }));

      expect(resultado.valido).toBe(true);
      expect(resultado.frecuenciaMuestreo).toBe(16000);
    });
  });

  describe('cálculo de la duración', () => {
    // La duración acumulada del corpus es el insumo del indicador del
    // resultado R4.1 ("al menos 20 minutos de audio validado"), por lo
    // que debe derivarse del archivo y no de un valor declarado.

    test('calcula un segundo exacto a 16 kHz', () => {
      const resultado = validarWav(construirWav({ numeroMuestras: 16000 }));
      expect(resultado.duracionSegundos).toBe(1);
    });

    test('calcula duraciones fraccionarias', () => {
      const resultado = validarWav(construirWav({ numeroMuestras: 40000 }));
      expect(resultado.duracionSegundos).toBe(2.5);
    });
  });

  describe('rechazo por parámetros fuera de especificación', () => {
    test('rechaza audio estéreo', () => {
      const resultado = validarWav(construirWav({ canales: 2 }));

      expect(resultado.valido).toBe(false);
      expect(resultado.motivo).toMatch(/monoaural/i);
    });

    test('rechaza una frecuencia de muestreo distinta de 16 kHz', () => {
      const resultado = validarWav(construirWav({ frecuencia: 44100 }));

      expect(resultado.valido).toBe(false);
      expect(resultado.motivo).toMatch(/16 kHz/);
    });

    test('rechaza una profundidad distinta de 16 bits', () => {
      const resultado = validarWav(construirWav({ bits: 8 }));

      expect(resultado.valido).toBe(false);
      expect(resultado.motivo).toMatch(/16 bits/);
    });

    test('rechaza audio comprimido (formato distinto de PCM)', () => {
      const resultado = validarWav(construirWav({ formatoAudio: 3 }));

      expect(resultado.valido).toBe(false);
      expect(resultado.motivo).toMatch(/PCM/);
    });

    test('rechaza un archivo sin datos de audio', () => {
      const resultado = validarWav(construirWav({ numeroMuestras: 0 }));

      expect(resultado.valido).toBe(false);
      expect(resultado.motivo).toMatch(/datos de audio/i);
    });
  });

  describe('rechazo por archivos malformados', () => {
    test('rechaza un buffer vacío', () => {
      expect(validarWav(Buffer.alloc(0)).valido).toBe(false);
    });

    test('rechaza un valor nulo sin lanzar excepción', () => {
      expect(() => validarWav(null)).not.toThrow();
      expect(validarWav(null).valido).toBe(false);
    });

    test('rechaza un archivo demasiado corto para contener una cabecera', () => {
      const resultado = validarWav(Buffer.alloc(20));

      expect(resultado.valido).toBe(false);
      expect(resultado.motivo).toMatch(/demasiado peque/i);
    });

    test('rechaza un archivo sin identificador RIFF', () => {
      const buffer = construirWav();
      buffer.write('XXXX', 0, 'ascii');

      const resultado = validarWav(buffer);

      expect(resultado.valido).toBe(false);
      expect(resultado.motivo).toMatch(/RIFF/);
    });

    test('rechaza un archivo sin identificador WAVE', () => {
      const buffer = construirWav();
      buffer.write('XXXX', 8, 'ascii');

      const resultado = validarWav(buffer);

      expect(resultado.valido).toBe(false);
      expect(resultado.motivo).toMatch(/WAVE/);
    });

    test('rechaza un archivo sin bloque de formato', () => {
      const buffer = construirWav();
      buffer.write('junk', 12, 'ascii');

      const resultado = validarWav(buffer);

      expect(resultado.valido).toBe(false);
      expect(resultado.motivo).toMatch(/formato/i);
    });

    test('rechaza un MP3 renombrado como .wav', () => {
      // Caso realista: el usuario sube otro archivo desde su equipo.
      // La validación se basa en el contenido, no en la extensión.
      const mp3 = Buffer.concat([
        Buffer.from([0xff, 0xfb, 0x90, 0x00]), // cabecera de trama MP3
        Buffer.alloc(1000),
      ]);

      expect(validarWav(mp3).valido).toBe(false);
    });
  });
});
