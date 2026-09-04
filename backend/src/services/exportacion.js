// backend/src/services/exportacion.js
//
// Construcción del paquete de distribución del corpus validado
// (DDS §3.4.5.7).
//
// La estructura del paquete responde a las conclusiones de la revisión
// sistemática sobre interoperabilidad de corpus de voz: audio en el
// formato estándar, transcripciones y metadatos en texto delimitado
// legible por cualquier herramienta, y la licencia incluida en el
// propio paquete para que acompañe siempre a los datos.

// A partir de la versión 8, archiver se publica únicamente como módulo
// ESM. Al importarlo con require() desde CommonJS, Node devuelve el
// objeto del módulo en lugar de la función, y la exportación por
// defecto queda bajo la propiedad "default". Esta comprobación permite
// que el código funcione con ambas versiones.
//
// El proyecto fija archiver@^7 en package.json por ser la última
// versión con soporte de CommonJS.
const archiverModulo = require('archiver');
const archiver =
  typeof archiverModulo === 'function' ? archiverModulo : archiverModulo.default;
const almacenamiento = require('./almacenamiento');
const { normalizarLengua } = require('../utils/normalizarLengua');

const LICENCIA = `Corpus de voz en lenguas originarias
Generado con NampiVoz

Este corpus se distribuye bajo la licencia
Creative Commons Attribution-ShareAlike (CC BY-SA 4.0).

Usted es libre de compartir y adaptar este material, incluso con fines
comerciales, siempre que:

  - Atribuya el crédito a la comunidad de hablantes que lo produjo.
  - Distribuya cualquier obra derivada bajo esta misma licencia.

Texto completo de la licencia:
https://creativecommons.org/licenses/by-sa/4.0/deed.es

Los participantes otorgaron su consentimiento para la incorporación de
sus grabaciones a este corpus. El conjunto no contiene datos personales
identificables: los hablantes se identifican mediante un código interno
sin correspondencia pública con su identidad.
`;

/**
 * Escapa un valor para su inclusión en un archivo CSV.
 * Las comillas dobles internas se duplican, conforme al RFC 4180.
 */
function escaparCsv(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  return `"${texto.replace(/"/g, '""')}"`;
}

function construirCsv(cabeceras, filas) {
  const lineas = [cabeceras.join(',')];

  for (const fila of filas) {
    lineas.push(fila.map(escaparCsv).join(','));
  }

  // BOM al inicio: permite que las hojas de cálculo reconozcan la
  // codificación UTF-8 y muestren correctamente los caracteres de las
  // lenguas originarias en lugar de interpretarlos como Latin-1.
  return '\uFEFF' + lineas.join('\n');
}

/**
 * Genera el nombre del paquete: {lengua}-{AAAAMMDD-HHMMSS}.zip
 */
function generarNombrePaquete(lengua) {
  const ahora = new Date();
  const pad = (n) => String(n).padStart(2, '0');

  const fecha = `${ahora.getFullYear()}${pad(ahora.getMonth() + 1)}${pad(ahora.getDate())}`;
  const hora = `${pad(ahora.getHours())}${pad(ahora.getMinutes())}${pad(ahora.getSeconds())}`;

  const prefijo = lengua ? normalizarLengua(lengua) : 'corpus';

  return `${prefijo}-${fecha}-${hora}.zip`;
}

/**
 * Construye el paquete y lo escribe directamente sobre la respuesta
 * HTTP, sin materializar el archivo completo en memoria ni en disco.
 *
 * @param {object} res            Respuesta de Express.
 * @param {Array}  grabaciones    Filas del corpus validado.
 * @param {string} nombrePaquete
 * @param {string|null} lengua
 * @returns {Promise<void>}
 */
function construirPaquete(res, grabaciones, nombrePaquete, lengua) {
  return new Promise((resolve, reject) => {
    const archivo = archiver('zip', { zlib: { level: 6 } });

    archivo.on('error', reject);
    archivo.on('end', resolve);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${nombrePaquete}"`);
    archivo.pipe(res);

    // --- transcripciones.csv ---
    archivo.append(
      construirCsv(
        ['id_grabacion', 'nombre_archivo', 'texto', 'lengua', 'duracion_segundos'],
        grabaciones.map((g) => [
          g.id_grabacion,
          g.nombre_archivo,
          g.texto_transcripcion,
          g.lengua,
          g.duracion_segundos,
        ])
      ),
      { name: 'transcripciones.csv' }
    );

    // --- hablantes.csv ---
    // Se incluye un registro por hablante, sin su DNI: el corpus se
    // distribuye públicamente y ese dato está protegido por la
    // Ley N.º 29733.
    const hablantes = new Map();
    for (const g of grabaciones) {
      if (!hablantes.has(g.id_metadatos)) {
        hablantes.set(g.id_metadatos, [g.id_metadatos, g.rango_edad, g.genero, g.lengua]);
      }
    }

    archivo.append(
      construirCsv(
        ['id_hablante', 'rango_edad', 'genero', 'lengua'],
        Array.from(hablantes.values())
      ),
      { name: 'hablantes.csv' }
    );

    // --- metadatos.json ---
    const segundosTotales = grabaciones.reduce(
      (suma, g) => suma + Number(g.duracion_segundos || 0),
      0
    );

    archivo.append(
      JSON.stringify(
        {
          generado_por: 'NampiVoz',
          version_formato: '1.0',
          fecha_exportacion: new Date().toISOString(),
          lengua: lengua || 'todas',
          estructura_audio: lengua ? 'plana' : 'por_lengua',
          n_grabaciones: grabaciones.length,
          n_hablantes: hablantes.size,
          desglose_por_lengua: Object.entries(
            grabaciones.reduce((acumulado, g) => {
              const clave = g.lengua;
              if (!acumulado[clave]) acumulado[clave] = { grabaciones: 0, segundos: 0 };
              acumulado[clave].grabaciones += 1;
              acumulado[clave].segundos += Number(g.duracion_segundos || 0);
              return acumulado;
            }, {})
          ).map(([nombre, datos]) => ({
            lengua: nombre,
            directorio: `audio/${normalizarLengua(nombre)}`,
            n_grabaciones: datos.grabaciones,
            duracion_minutos: Number((datos.segundos / 60).toFixed(2)),
          })),
          duracion_total_segundos: Number(segundosTotales.toFixed(2)),
          duracion_total_minutos: Number((segundosTotales / 60).toFixed(2)),
          formato_audio: {
            contenedor: 'WAV',
            codificacion: 'PCM',
            bits_por_muestra: 16,
            frecuencia_muestreo_hz: 16000,
            canales: 1,
          },
          licencia: 'CC BY-SA 4.0',
        },
        null,
        2
      ),
      { name: 'metadatos.json' }
    );

    // --- LICENCIA.txt ---
    archivo.append(LICENCIA, { name: 'LICENCIA.txt' });

    // --- audio/ ---
    // Cuando la exportación se restringe a una lengua, los archivos van
    // directamente bajo audio/. Cuando abarca todo el corpus, se
    // agrupan en un subdirectorio por lengua: un corpus multilingüe
    // en un único directorio plano obligaría a quien lo recibe a
    // reconstruir la separación a partir del CSV antes de poder
    // entrenar un modelo por lengua.
    //
    // Los archivos se incorporan de forma secuencial. Si alguno no se
    // encuentra en el almacenamiento, se omite y se deja constancia en
    // el registro del servidor: es preferible entregar un paquete
    // incompleto y documentado a interrumpir toda la exportación.
    (async () => {
      for (const g of grabaciones) {
        try {
          const contenido = await almacenamiento.leerArchivo(g.nombre_archivo);

          const ruta = lengua
            ? `audio/${g.nombre_archivo}`
            : `audio/${normalizarLengua(g.lengua)}/${g.nombre_archivo}`;

          archivo.append(contenido, { name: ruta });
        } catch (error) {
          console.error(
            `No se pudo incorporar el archivo ${g.nombre_archivo} al paquete:`,
            error.message
          );
        }
      }

      archivo.finalize();
    })().catch(reject);
  });
}

module.exports = { construirPaquete, generarNombrePaquete };
