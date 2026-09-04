// backend/src/config/catalogos.js
//
// Valores admitidos para los campos de metadatos del hablante nativo.
// El ERS y el DDS exigen que rango_edad, genero y lengua "correspondan
// a valores admitidos por el sistema"; este archivo es la fuente única
// de verdad de esos valores.
//
// Si agregas o cambias un valor aquí, actualízalo también en el
// diccionario de datos del DDS y en el catálogo de requisitos.

const RANGOS_EDAD = ['18-29', '30-39', '40-49', '50-59', '60+'];

const GENEROS = ['Femenino', 'Masculino', 'Otro', 'Prefiero no indicar'];

// ---------------------------------------------------------------------
// Lenguas indígenas u originarias del Perú
// ---------------------------------------------------------------------
// Las 48 lenguas oficialmente reconocidas por el Ministerio de Cultura,
// según la Base de Datos de Pueblos Indígenas u Originarios (BDPI):
// https://bdpi.cultura.gob.pe/lenguas
//
// Cuatro de ellas se hablan en los Andes y cuarenta y cuatro en la
// Amazonía. Los nombres se consignan con la grafía oficial de la BDPI,
// que en algunos casos difiere de la escritura de uso corriente: la
// lista distingue "Ashaninka" de "Asheninka" como lenguas separadas, y
// emplea caracteres fuera del alfabeto latino básico, como la i barrada
// de "Maijɨki" y "Murui-Muinanɨ".
//
// Adoptar la lista oficial completa, en lugar de un subconjunto, hace
// que el sistema resulte aplicable a cualquier comunidad del país sin
// requerir modificaciones de código, y alinea los metadatos del corpus
// con la nomenclatura que emplean los organismos del Estado.
// ---------------------------------------------------------------------

const LENGUAS = [
  'Achuar',
  'Aimara',
  'Amahuaca',
  'Arabela',
  'Ashaninka',
  'Asheninka',
  'Awajún',
  'Bora',
  'Cashinahua',
  'Chamikuro',
  'Ese eja',
  'Harakbut',
  'Ikitu',
  'Iñapari',
  'Iskonawa',
  'Jaqaru',
  'Kakataibo',
  'Kakinte',
  'Kandozi-Chapra',
  'Kapanawa',
  'Kawki',
  'Kukama Kukamiria',
  'Madija',
  'Maijɨki',
  'Matsés',
  'Matsigenka',
  'Matsigenka Montetokunirira',
  'Munichi',
  'Murui-Muinanɨ',
  'Nahua',
  'Nomatsigenga',
  'Ocaina',
  'Omagua',
  'Quechua',
  'Resígaro',
  'Secoya',
  'Sharanahua',
  'Shawi',
  'Shipibo-Konibo',
  'Shiwilu',
  'Taushiro',
  'Ticuna',
  'Urarina',
  'Wampis',
  'Yagua',
  'Yaminahua',
  'Yanesha',
  'Yine',
];

module.exports = { RANGOS_EDAD, GENEROS, LENGUAS };
