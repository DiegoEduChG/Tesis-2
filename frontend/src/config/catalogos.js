// frontend/src/config/catalogos.js
//
// Valores admitidos para los metadatos del hablante nativo.
//
// IMPORTANTE: este archivo debe mantenerse sincronizado con
// backend/src/config/catalogos.js. Si un valor existe aquí pero no
// allí, el formulario permitiría seleccionar una opción que el servidor
// rechazaría con DATOS_INVALIDOS.
//
// Se conserva la duplicación de forma deliberada: exponer los catálogos
// mediante un endpoint eliminaría el riesgo de divergencia, pero
// introduciría una petición de red adicional antes de poder mostrar el
// formulario de registro, que es la primera pantalla del sistema.
//
// El detalle de las fuentes y la advertencia sobre el efecto de las
// variedades en la validación por pares están documentados en el
// archivo del backend, que es la fuente de verdad.

export const RANGOS_EDAD = ['18-29', '30-39', '40-49', '50-59', '60+'];

export const GENEROS = ['Femenino', 'Masculino', 'Otro', 'Prefiero no indicar'];

// ---------------------------------------------------------------------
// Lenguas indígenas u originarias del Perú y sus variedades geográficas
// ---------------------------------------------------------------------
// Fuente: Base de Datos de Pueblos Indígenas u Originarios (BDPI) del
// Ministerio de Cultura, https://bdpi.cultura.gob.pe/lenguas
//
// Incluye las 48 lenguas oficialmente reconocidas y las variedades
// geográficas que la BDPI documenta para el quechua (12) y para cuatro
// lenguas amazónicas: ashaninka, awajún, harakbut y matsigenka.
//
// ADVERTENCIA: la validación por pares empareja por el valor exacto de
// este campo. Quien declare "Quechua Chanka" no podrá validar
// grabaciones de quien declare "Quechua" o "Quechua Collao". Para la
// prueba piloto conviene acordar una sola entrada por comunidad.
// ---------------------------------------------------------------------

export const LENGUAS = [
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
