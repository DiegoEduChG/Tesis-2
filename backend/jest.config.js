// backend/jest.config.js
//
// Configuración de las pruebas unitarias del backend.
//
// ---------------------------------------------------------------------
// DEFINICIÓN DE "COMPONENTES CRÍTICOS"
// ---------------------------------------------------------------------
// El resultado R2.2 del proyecto exige "una cobertura de código
// superior al 80 % en los componentes críticos". Para que ese indicador
// sea verificable, se declaran aquí explícitamente cuáles son:
//
//   src/utils/validarWav.js     Único control que garantiza que el
//                               corpus cumpla el formato del ERS §3.5.
//                               Un fallo admitiría audio fuera de
//                               especificación.
//
//   src/utils/nombreArchivo.js  Determina la identidad de cada archivo
//                               del corpus y evita exponer el DNI del
//                               hablante (Ley N.º 29733).
//
//   src/services/umbral.js      Regla que decide si una contribución se
//                               incorpora al corpus, se descarta o
//                               permanece en evaluación. Un fallo aquí
//                               produciría un corpus cuyo contenido no
//                               corresponde a lo que la comunidad
//                               decidió.
//
// Quedan fuera los controladores y modelos, cuya verificación
// corresponde a las pruebas funcionales de integración previstas en el
// cronograma, y las configuraciones sin lógica de negocio.
//
// El umbral configurado hace fallar la ejecución si la cobertura cae
// por debajo del 80 %: el indicador se comprueba automáticamente en
// cada corrida, no por inspección manual.
// ---------------------------------------------------------------------

module.exports = {
  testEnvironment: 'node',

  collectCoverageFrom: [
    'src/utils/validarWav.js',
    'src/utils/nombreArchivo.js',
    'src/services/umbral.js',
  ],

  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },

  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
};
