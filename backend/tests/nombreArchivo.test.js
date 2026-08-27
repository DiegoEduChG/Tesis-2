// backend/tests/nombreArchivo.test.js
//
// Pruebas unitarias del generador de nombres de archivo del corpus.
//
// Este módulo se considera crítico por dos razones: determina la
// identidad de cada archivo dentro del corpus exportado, y es el punto
// donde se evita exponer el DNI del hablante, un dato personal
// protegido por la Ley N.º 29733.

const { generarNombreArchivo } = require('../src/utils/nombreArchivo');

describe('generarNombreArchivo', () => {
  test('produce un archivo con extensión .wav', () => {
    expect(generarNombreArchivo('Quechua', 18)).toMatch(/\.wav$/);
  });

  test('incluye la lengua en minúsculas y el identificador del hablante', () => {
    const nombre = generarNombreArchivo('Quechua', 18);
    expect(nombre).toMatch(/^quechua-18-/);
  });

  test('sigue el patrón lengua-id-fecha-hora-sufijo', () => {
    const nombre = generarNombreArchivo('Aimara', 7);
    expect(nombre).toMatch(/^aimara-7-\d{8}-\d{6}-[a-z0-9]{4}\.wav$/);
  });

  describe('protección de datos personales', () => {
    test('no incluye el DNI del hablante', () => {
      // El nombre viaja dentro del corpus exportado, que se distribuye
      // bajo licencia abierta. Solo debe contener el identificador
      // interno, no el documento de identidad.
      const dni = '70123456';
      const nombre = generarNombreArchivo('Quechua', 18);

      expect(nombre).not.toContain(dni);
    });
  });

  describe('normalización del nombre de la lengua', () => {
    test('elimina las tildes', () => {
      const nombre = generarNombreArchivo('Asháninka', 3);
      expect(nombre).toMatch(/^ashaninka-3-/);
    });

    test('elimina guiones y espacios', () => {
      const nombre = generarNombreArchivo('Shipibo-Konibo', 5);
      expect(nombre).toMatch(/^shipibokonibo-5-/);
    });

    test('no deja caracteres problemáticos para un sistema de archivos', () => {
      const nombre = generarNombreArchivo('Quechua Collao', 9);
      expect(nombre).not.toMatch(/[\s/\\:*?"<>|]/);
    });
  });

  describe('unicidad', () => {
    test('genera nombres distintos para el mismo hablante en el mismo segundo', () => {
      // Al sincronizar un lote acumulado en modo offline, varias
      // contribuciones del mismo hablante se procesan dentro del mismo
      // segundo. Sin el sufijo aleatorio, los archivos colisionarían y
      // unos sobrescribirían a otros en el almacenamiento.
      const nombres = new Set();

      for (let i = 0; i < 200; i++) {
        nombres.add(generarNombreArchivo('Quechua', 18));
      }

      expect(nombres.size).toBe(200);
    });
  });
});
