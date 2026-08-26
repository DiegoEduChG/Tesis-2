// backend/src/config/catalogos.js
//
// Valores admitidos para los campos de metadatos del hablante nativo.
// El ERS y el DDS exigen que rango_edad, genero y lengua "correspondan a
// valores admitidos por el sistema", pero no los enumeran. Este archivo
// es la fuente única de verdad de esos valores.
//
// Si agregas o cambias un valor aquí, actualízalo también en el
// diccionario de datos del DDS y en el catálogo de requisitos.

const RANGOS_EDAD = ['18-29', '30-39', '40-49', '50-59', '60+'];

const GENEROS = ['Femenino', 'Masculino', 'Otro', 'Prefiero no indicar'];

// Lista acotada para el prototipo. La prueba piloto se ejecuta con una
// sola comunidad, pero el sistema se diseñó para ser agnóstico a la
// lengua, por lo que ampliarla no requiere cambios de código.
const LENGUAS = [
  'Quechua',
  'Aimara',
  'Asháninka',
  'Shipibo-Konibo',
  'Awajún',
];

module.exports = { RANGOS_EDAD, GENEROS, LENGUAS };
