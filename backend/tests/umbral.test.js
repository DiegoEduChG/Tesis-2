// backend/tests/umbral.test.js
//
// Pruebas unitarias de la lógica de doble umbral de la validación por
// pares.
//
// Este módulo concentra la regla que decide el destino de cada
// contribución al corpus: si una grabación se incorpora al conjunto
// final, se descarta, o permanece a la espera de más evaluaciones. Un
// fallo aquí no produciría un error visible, sino un corpus cuyo
// contenido no corresponde a lo que la comunidad decidió, que es
// precisamente el escenario que el mecanismo de validación pretende
// evitar.

const {
  evaluarUmbral,
  votosRestantes,
  UMBRAL_VOTOS,
  ESTADO,
} = require('../src/services/umbral');

describe('evaluarUmbral', () => {
  describe('grabaciones que permanecen pendientes', () => {
    test('una grabación sin votos permanece pendiente', () => {
      expect(evaluarUmbral(0, 0)).toBe(ESTADO.PENDIENTE);
    });

    test.each([
      [1, 0],
      [2, 0],
      [0, 1],
      [0, 2],
    ])('%i votos positivos y %i negativos no alcanzan ningún umbral', (pos, neg) => {
      expect(evaluarUmbral(pos, neg)).toBe(ESTADO.PENDIENTE);
    });

    test('votos divididos por igual mantienen la grabación pendiente', () => {
      // Dos a favor y dos en contra: ninguno de los dos umbrales se
      // alcanza, de modo que la decisión queda en manos del siguiente
      // validador.
      expect(evaluarUmbral(2, 2)).toBe(ESTADO.PENDIENTE);
    });
  });

  describe('validación por umbral positivo', () => {
    test('tres votos positivos validan la grabación', () => {
      expect(evaluarUmbral(3, 0)).toBe(ESTADO.VALIDADA);
    });

    test('la validación se mantiene con votos negativos por debajo del umbral', () => {
      expect(evaluarUmbral(3, 1)).toBe(ESTADO.VALIDADA);
      expect(evaluarUmbral(3, 2)).toBe(ESTADO.VALIDADA);
    });

    test('un conteo superior al umbral sigue produciendo validación', () => {
      // Situación inalcanzable en operación normal, ya que la
      // grabación deja de admitir votos al alcanzar el umbral. Se
      // verifica para que la función no dependa de una igualdad
      // exacta.
      expect(evaluarUmbral(5, 0)).toBe(ESTADO.VALIDADA);
    });
  });

  describe('rechazo por umbral negativo', () => {
    test('tres votos negativos rechazan la grabación', () => {
      expect(evaluarUmbral(0, 3)).toBe(ESTADO.RECHAZADA);
    });

    test('el rechazo se mantiene con votos positivos por debajo del umbral', () => {
      expect(evaluarUmbral(1, 3)).toBe(ESTADO.RECHAZADA);
      expect(evaluarUmbral(2, 3)).toBe(ESTADO.RECHAZADA);
    });

    test('un conteo superior al umbral sigue produciendo rechazo', () => {
      expect(evaluarUmbral(0, 5)).toBe(ESTADO.RECHAZADA);
    });
  });

  describe('determinismo ante conteos simultáneos', () => {
    test('con ambos umbrales alcanzados prevalece la validación', () => {
      // Este conteo no puede producirse en operación: la grabación
      // deja de admitir votos en cuanto uno de los umbrales se alcanza,
      // y el bloqueo de fila durante el registro impide que dos votos
      // concurrentes lo sobrepasen. Se verifica para dejar constancia
      // de que la función es determinista ante cualquier par de
      // valores, y no queda sujeta al orden de evaluación.
      expect(evaluarUmbral(3, 3)).toBe(ESTADO.VALIDADA);
    });
  });

  describe('independencia de los dos umbrales', () => {
    test('acumular votos negativos no impide alcanzar el umbral positivo', () => {
      expect(evaluarUmbral(2, 2)).toBe(ESTADO.PENDIENTE);
      expect(evaluarUmbral(3, 2)).toBe(ESTADO.VALIDADA);
    });

    test('acumular votos positivos no impide alcanzar el umbral negativo', () => {
      expect(evaluarUmbral(2, 2)).toBe(ESTADO.PENDIENTE);
      expect(evaluarUmbral(2, 3)).toBe(ESTADO.RECHAZADA);
    });
  });

  describe('correspondencia con el umbral configurado', () => {
    test('el umbral declarado es de tres votos', () => {
      // El valor está comprometido en el enunciado del resultado R3.1.
      expect(UMBRAL_VOTOS).toBe(3);
    });

    test('un voto menos que el umbral no basta para decidir', () => {
      expect(evaluarUmbral(UMBRAL_VOTOS - 1, 0)).toBe(ESTADO.PENDIENTE);
      expect(evaluarUmbral(0, UMBRAL_VOTOS - 1)).toBe(ESTADO.PENDIENTE);
    });

    test('alcanzar exactamente el umbral decide el estado', () => {
      expect(evaluarUmbral(UMBRAL_VOTOS, 0)).toBe(ESTADO.VALIDADA);
      expect(evaluarUmbral(0, UMBRAL_VOTOS)).toBe(ESTADO.RECHAZADA);
    });
  });
});

describe('votosRestantes', () => {
  test('una grabación sin votos requiere tres evaluaciones más', () => {
    expect(votosRestantes(0, 0)).toBe(3);
  });

  test('el conteo refleja el umbral más próximo', () => {
    expect(votosRestantes(2, 0)).toBe(1);
    expect(votosRestantes(0, 2)).toBe(1);
    expect(votosRestantes(1, 2)).toBe(1);
  });

  test('una grabación ya decidida no requiere más votos', () => {
    expect(votosRestantes(3, 0)).toBe(0);
    expect(votosRestantes(0, 3)).toBe(0);
  });
});
