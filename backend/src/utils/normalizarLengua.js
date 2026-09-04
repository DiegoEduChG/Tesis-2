// backend/src/utils/normalizarLengua.js
//
// Convierte el nombre oficial de una lengua en un identificador apto
// para nombres de archivo y rutas de directorio.
//
// ---------------------------------------------------------------------
// POR QUÉ ESTE MÓDULO NO ES TRIVIAL
// ---------------------------------------------------------------------
// La lista oficial del Ministerio de Cultura incluye nombres con
// caracteres fuera del alfabeto latino básico. Una normalización que se
// limitara a descomponer los acentos y descartar todo lo demás
// produciría resultados incorrectos:
//
//     Maijɨki        ->  maijki          (la ɨ desaparece)
//     Murui-Muinanɨ  ->  muruimuinan     (la ɨ desaparece)
//
// La i barrada (ɨ, U+0268) no es una letra acentuada, sino un carácter
// independiente: la descomposición Unicode no la separa en "i" más un
// diacrítico, de modo que el filtro posterior la elimina por completo.
// El resultado no solo pierde información, sino que puede hacer que dos
// lenguas distintas produzcan el mismo identificador.
//
// Se transliteran por tanto de forma explícita los caracteres presentes
// en la lista oficial, y se conservan los separadores de palabra como
// guiones, de modo que "Kukama Kukamiria" y "Kandozi-Chapra" mantengan
// legible su estructura.
// ---------------------------------------------------------------------

// Caracteres de la lista oficial que la descomposición Unicode no
// resuelve. Se transliteran a su equivalente más próximo en el
// alfabeto latino básico.
const TRANSLITERACIONES = {
  ɨ: 'i', // i barrada — Maijɨki, Murui-Muinanɨ
  ɨ̈: 'i',
  ñ: 'n', // Iñapari
};

/**
 * @param {string} lengua Nombre oficial de la lengua.
 * @returns {string} Identificador en minúsculas, con guiones como
 *                   separador y sin caracteres problemáticos para un
 *                   sistema de archivos.
 *
 * @example
 *   normalizarLengua('Quechua')                    // 'quechua'
 *   normalizarLengua('Maijɨki')                    // 'maijiki'
 *   normalizarLengua('Murui-Muinanɨ')              // 'murui-muinani'
 *   normalizarLengua('Kukama Kukamiria')           // 'kukama-kukamiria'
 *   normalizarLengua('Matsigenka Montetokunirira') // 'matsigenka-montetokunirira'
 */
function normalizarLengua(lengua) {
  if (!lengua) return 'sin-lengua';

  let resultado = String(lengua).toLowerCase();

  // Transliteración explícita, antes de la descomposición Unicode.
  for (const [origen, destino] of Object.entries(TRANSLITERACIONES)) {
    resultado = resultado.split(origen).join(destino);
  }

  resultado = resultado
    // Separa los caracteres acentuados de sus diacríticos y descarta
    // estos últimos: "awajún" pasa a "awajun".
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Los espacios y guiones se unifican en un solo separador, de modo
    // que los nombres compuestos conserven su estructura.
    .replace(/[\s_-]+/g, '-')
    // Cualquier carácter restante fuera del alfabeto latino básico se
    // descarta.
    .replace(/[^a-z0-9-]/g, '')
    // Guiones consecutivos o en los extremos.
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return resultado || 'sin-lengua';
}

module.exports = { normalizarLengua };
