// backend/src/config/catalogos.js
//
// Valores admitidos para los campos de metadatos del hablante nativo.
// El ERS y el DDS exigen que rango_edad, genero y lengua "correspondan
// a valores admitidos por el sistema"; este archivo es la fuente única
// de verdad de esos valores.
//
// Si agregas o cambias un valor aquí, actualízalo también en
// frontend/src/config/catalogos.js, en el diccionario de datos del DDS
// y en el catálogo de requisitos.

const RANGOS_EDAD = ['18-29', '30-39', '40-49', '50-59', '60+'];

const GENEROS = ['Femenino', 'Masculino', 'Otro', 'Prefiero no indicar'];

// ---------------------------------------------------------------------
// Lenguas indígenas u originarias del Perú y sus variedades geográficas
// ---------------------------------------------------------------------
// Fuente: Base de Datos de Pueblos Indígenas u Originarios (BDPI) del
// Ministerio de Cultura, https://bdpi.cultura.gob.pe/lenguas
//
// La lista reúne dos clases de entrada:
//
//   1. Las 48 lenguas oficialmente reconocidas (cuatro andinas y
//      cuarenta y cuatro amazónicas), con la grafía de la BDPI. Esa
//      grafía difiere en algunos casos de la escritura corriente:
//      distingue "Ashaninka" de "Asheninka" como lenguas separadas y
//      emplea caracteres fuera del alfabeto latino básico, como la i
//      barrada de "Maijɨki" y "Murui-Muinanɨ".
//
//   2. Las variedades geográficas que la BDPI documenta para algunas de
//      esas lenguas, atribuidas a la tabla del Ministerio de Educación
//      de 2018: las doce del quechua y las de cuatro lenguas
//      amazónicas.
//
// ---------------------------------------------------------------------
// ADVERTENCIA SOBRE EL EFECTO EN LA VALIDACIÓN POR PARES
// ---------------------------------------------------------------------
// El sistema restringe la validación a hablantes de la misma lengua, y
// la comparación se realiza sobre el valor exacto de este campo. En
// consecuencia, quien declare "Quechua Chanka" NO podrá validar
// grabaciones de quien haya declarado "Quechua" a secas, ni de quien
// haya declarado "Quechua Collao".
//
// Esto es deliberado —un hablante chanka no está en condiciones de
// juzgar una grabación wanka— pero fragmenta el grupo de validadores.
// En una comunidad reducida, si los participantes se reparten entre
// varias entradas, ninguna grabación alcanzará los tres votos exigidos
// y todas quedarán indefinidamente pendientes.
//
// Para la prueba piloto conviene acordar de antemano una sola entrada
// por comunidad participante, en lugar de dejar la elección al criterio
// de cada hablante.
//
// La entrada genérica de cada lengua se conserva junto a sus variedades
// porque un hablante puede desconocer a cuál pertenece; obligarlo a
// elegir produciría metadatos inventados.
// ---------------------------------------------------------------------

const LENGUAS = [
  'Achuar',
  'Aimara',
  'Amahuaca',
  'Arabela',
  'Ashaninka',
  // Variedades del ashaninka (BDPI, Minedu 2018)
  'Ashaninka del Alto Perené',
  'Ashaninka del Ene, Tambo y Satipo (bajo Perené)',
  'Asheninka',
  'Awajún',
  // Variedades del awajún (BDPI, Minedu 2018)
  'Awajún de Chiriaco (Imaza)',
  'Awajún del Marañón y tributarios',
  'Awajún del Nieva y tributarios',
  'Bora',
  'Cashinahua',
  'Chamikuro',
  'Ese eja',
  'Harakbut',
  // Variedades del harakbut (BDPI, Minedu 2018). La ficha de la BDPI es
  // internamente inconsistente: su texto introductorio menciona seis
  // variedades con una grafía y la tabla enumera siete con otra. Se
  // adopta la tabla, que es la fuente citada en la propia ficha.
  'Harakbut (Arakbut)',
  'Harakbut (Aräsäeri)',
  'Harakbut (Kisamberi)',
  'Harakbut (Pukirieri)',
  'Harakbut (Sapiteri)',
  'Harakbut (Töyöeri)',
  'Harakbut (Wachiperi)',
  'Ikitu',
  'Iñapari',
  'Iskonawa',
  'Jaqaru',
  'Kakataibo',
  'Kakinte',
  'Kandozi-Chapra',
  'Kapanawa',
  'Kawki',
  // Variedad amazónica del quechua. Conserva el nombre que le da la
  // BDPI, por lo que en el orden alfabético no aparece junto a las
  // demás variedades de esa lengua.
  'Kichwa amazónico',
  'Kukama Kukamiria',
  'Madija',
  'Maijɨki',
  'Matsés',
  'Matsigenka',
  // Variedades del matsigenka (BDPI, Minedu 2018)
  'Matsigenka del Alto Urubamba',
  'Matsigenka del Bajo Urubamba',
  'Matsigenka del Manu',
  'Matsigenka Montetokunirira',
  'Munichi',
  'Murui-Muinanɨ',
  'Nahua',
  'Nomatsigenga',
  'Ocaina',
  'Omagua',
  'Quechua',
  // Once de las doce variedades del quechua (BDPI, Minedu 2018),
  // agrupadas en ramas: norteña (Cajamarca, Inkawasi Kañaris), central
  // (Pataz, Cajatambo, Yauyos, Áncash, Huánuco, Pasco, Wanka) y sureña
  // (Chanka, Collao). La duodécima es el Kichwa amazónico, listado
  // arriba con su propio nombre.
  'Quechua Áncash',
  'Quechua Cajamarca',
  'Quechua Cajatambo, Oyón y Huaura',
  'Quechua Chanka',
  'Quechua Collao',
  'Quechua Huánuco',
  'Quechua Inkawasi Kañaris',
  'Quechua Pasco',
  'Quechua Pataz',
  'Quechua Wanka',
  'Quechua Yauyos',
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
