// backend/src/services/umbral.js
//
// Lógica de doble umbral de la validación por pares.
//
// Se aísla en su propio módulo, sin dependencia alguna de la base de
// datos, por dos razones. La primera es de diseño: la regla que decide
// el destino de una contribución es independiente de cómo se
// almacenen los votos. La segunda es de verificación: al no requerir
// conexión ni datos de prueba, la regla puede comprobarse de forma
// exhaustiva mediante pruebas unitarias.
//
// Reglas (resultado R3.1 del proyecto y DDS, flujo de validación por
// pares):
//   - Tres votos positivos marcan la grabación como "validada".
//   - Tres votos negativos la marcan como "rechazada".
//   - Ambos umbrales operan de forma independiente: el primero en
//     alcanzarse determina el estado final.
//   - Mientras ninguno se alcance, la grabación permanece "pendiente".

const UMBRAL_VOTOS = 3;

const ESTADO = {
  PENDIENTE: 'pendiente',
  VALIDADA: 'validada',
  RECHAZADA: 'rechazada',
};

/**
 * Determina el estado que corresponde a una grabación según su conteo
 * de votos.
 *
 * Los votos positivos se evalúan primero. En la práctica el orden es
 * indiferente, porque una grabación deja de admitir votos en cuanto
 * alcanza un umbral y no puede llegar a acumular tres de cada signo;
 * la precedencia se fija de todos modos para que la función sea
 * determinista ante cualquier par de valores.
 *
 * @param {number} positivos
 * @param {number} negativos
 * @returns {'pendiente'|'validada'|'rechazada'}
 */
function evaluarUmbral(positivos, negativos) {
  if (positivos >= UMBRAL_VOTOS) return ESTADO.VALIDADA;
  if (negativos >= UMBRAL_VOTOS) return ESTADO.RECHAZADA;
  return ESTADO.PENDIENTE;
}

/**
 * Cuántos votos faltan para que la grabación alcance alguno de los dos
 * umbrales. Permite informar al validador del efecto de su voto.
 *
 * @returns {number} 0 si ya alcanzó un umbral.
 */
function votosRestantes(positivos, negativos) {
  if (evaluarUmbral(positivos, negativos) !== ESTADO.PENDIENTE) return 0;

  return Math.min(UMBRAL_VOTOS - positivos, UMBRAL_VOTOS - negativos);
}

module.exports = { evaluarUmbral, votosRestantes, UMBRAL_VOTOS, ESTADO };
