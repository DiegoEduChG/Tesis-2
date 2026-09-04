// backend/src/utils/nombreArchivo.js
//
// Generación del nombre estándar de los archivos de audio del corpus.
// Se extrae a un módulo compartido porque lo usan tanto el controlador
// de grabaciones (subida en línea) como el de sincronización (subida
// diferida desde el modo offline), y ambos deben producir exactamente
// el mismo formato.

/**
 * Formato: {lengua}-{idMetadatos}-{AAAAMMDD}-{HHMMSS}.wav
 *
 * Se usa id_metadatos y no el DNI del hablante: el nombre del archivo
 * viaja dentro del corpus exportado, que se distribuye bajo licencia
 * abierta, y el DNI es un dato personal identificable protegido por la
 * Ley N.º 29733.
 */
const { normalizarLengua } = require('./normalizarLengua');

function generarNombreArchivo(lengua, idMetadatos) {
  const ahora = new Date();
  const pad = (n) => String(n).padStart(2, '0');

  const fecha = `${ahora.getFullYear()}${pad(ahora.getMonth() + 1)}${pad(ahora.getDate())}`;
  const hora = `${pad(ahora.getHours())}${pad(ahora.getMinutes())}${pad(ahora.getSeconds())}`;

  const lenguaSlug = normalizarLengua(lengua);

  // El sufijo aleatorio evita colisiones cuando se sincronizan varias
  // contribuciones del mismo hablante dentro del mismo segundo, algo
  // habitual al procesar un lote acumulado en modo offline.
  const sufijo = Math.random().toString(36).slice(2, 6);

  return `${lenguaSlug}-${idMetadatos}-${fecha}-${hora}-${sufijo}.wav`;
}

module.exports = { generarNombreArchivo };
