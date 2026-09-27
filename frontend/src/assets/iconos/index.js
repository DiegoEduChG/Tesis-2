// frontend/src/assets/iconos/index.js
//
// Carga automática de los archivos de iconografía presentes en esta
// carpeta.
//
// Se emplea import.meta.glob en lugar de importaciones individuales por
// una razón práctica: si un ícono todavía no se ha incorporado, la
// aplicación sigue funcionando y el componente muestra únicamente la
// etiqueta de texto. Con importaciones explícitas, un solo archivo
// ausente impediría compilar toda la aplicación.
//
// Para añadir un ícono basta con depositar el archivo PNG en esta
// carpeta con el nombre correspondiente y registrar su texto
// alternativo en TEXTOS_ALTERNATIVOS.

const modulos = import.meta.glob('./*.png', { eager: true, import: 'default' });

// Mapa de nombre → ruta del archivo, derivado de los archivos presentes.
const ICONOS = {};
for (const [ruta, url] of Object.entries(modulos)) {
  const nombre = ruta.replace('./', '').replace('.png', '');
  ICONOS[nombre] = url;
}

// ---------------------------------------------------------------------
// Textos alternativos
// ---------------------------------------------------------------------
// Describen lo que el ícono representa, no la acción que ejecuta: la
// etiqueta de texto del botón ya comunica la acción, y repetirla en el
// atributo alt haría que un lector de pantalla la anunciara dos veces.
//
// Documentan además, dentro del código, qué se supone que comunica cada
// dibujo, lo que resulta útil al contrastar los resultados de la prueba
// de comprensión con los participantes.
// ---------------------------------------------------------------------

const TEXTOS_ALTERNATIVOS = {
  'aportar-voz': 'Persona hablando, con ondas de sonido saliendo de su boca',
  validar: 'Persona escuchando, con la mano detrás de la oreja',
  documento: 'Mano sosteniendo una tarjeta',
  ayuda: 'Símbolo de reproducción sobre una persona que saluda',
  escribir: 'Mano escribiendo sobre una hoja de papel',
  'borrador-recuperado': 'Hoja escrita con una flecha que regresa hacia ella',
  grabar: 'Círculo rojo con una boca hablando',
  detener: 'Palma de la mano abierta hacia adelante',
  escuchar: 'Oreja recibiendo ondas de sonido',
  guardar: 'Mano colocando un objeto dentro de un cesto',
  'volver-a-grabar': 'Flecha circular alrededor de una boca',
  aprobar: 'Marca de verificación junto a un rostro sonriente',
  desaprobar: 'Equis junto a un rostro neutro',
  omitir: 'Flecha que pasa por encima de un círculo sin tocarlo',
  pendiente: 'Reloj de arena',
  validada: 'Cesto con objetos y una marca de verificación',
  'sin-conexion': 'Teléfono con la señal tachada',
  'guardado-local': 'Teléfono con un cesto en su pantalla',
  enviado: 'Flecha ascendente con una marca de verificación',
  'sin-pendientes': 'Cesto vacío',
  bienvenida: 'Tres personas en círculo: una habla y dos escuchan',
};

/**
 * @param {string} nombre
 * @returns {string|null} URL del archivo, o null si aún no existe.
 */
export function obtenerIcono(nombre) {
  return ICONOS[nombre] || null;
}

export function obtenerTextoAlternativo(nombre) {
  return TEXTOS_ALTERNATIVOS[nombre] || '';
}

/**
 * Nombres de los íconos efectivamente presentes en la carpeta.
 * Útil para verificar el estado de la incorporación.
 */
export function iconosDisponibles() {
  return Object.keys(ICONOS).sort();
}
