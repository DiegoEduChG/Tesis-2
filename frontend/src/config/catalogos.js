// frontend/src/config/catalogos.js
//
// Valores admitidos para los metadatos del hablante nativo.
//
// IMPORTANTE: este archivo debe mantenerse sincronizado con
// backend/src/config/catalogos.js. Si un valor existe aquí pero no
// allí, el formulario permitiría seleccionar una opción que el servidor
// rechazaría.
//
// Se conserva la duplicación de forma deliberada: exponer los catálogos
// mediante un endpoint eliminaría el riesgo de divergencia, pero
// introduciría una petición de red adicional antes de poder mostrar el
// formulario de registro, que es la primera pantalla del sistema.

export const RANGOS_EDAD = ['18-29', '30-39', '40-49', '50-59', '60+'];

export const GENEROS = ['Femenino', 'Masculino', 'Otro', 'Prefiero no indicar'];

// Las 48 lenguas indígenas u originarias del Perú reconocidas por el
// Ministerio de Cultura, según la Base de Datos de Pueblos Indígenas u
// Originarios: https://bdpi.cultura.gob.pe/lenguas
export const LENGUAS = [
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