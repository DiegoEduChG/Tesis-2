// frontend/src/services/almacenamientoLocal.js
//
// Wrapper mínimo sobre la API nativa IndexedDB del navegador (sin
// librerías externas), tal como especifica el DDS en 2.2.1.1: "el
// Frontend incorpora un Módulo de Persistencia Local, implementado
// sobre IndexedDB".
//
// Por ahora solo se usa para el autoguardado del enunciado mientras el
// hablante escribe (flujo 3.2.2, paso 4). La misma base de datos local
// se reutilizará para el almacenamiento de contribuciones completas en
// modo offline (flujo 3.2.5), agregando un segundo "object store".

const NOMBRE_BD = 'nampivoz-local';
const VERSION_BD = 1;
const ALMACEN_BORRADORES = 'borradores_enunciado';

function abrirBD() {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(NOMBRE_BD, VERSION_BD);

    solicitud.onupgradeneeded = () => {
      const db = solicitud.result;
      if (!db.objectStoreNames.contains(ALMACEN_BORRADORES)) {
        db.createObjectStore(ALMACEN_BORRADORES, { keyPath: 'idMetadatos' });
      }
    };

    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

/**
 * Guarda (o sobrescribe) el borrador de enunciado de un hablante.
 */
export async function guardarBorrador(idMetadatos, texto) {
  const db = await abrirBD();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(ALMACEN_BORRADORES, 'readwrite');
    tx.objectStore(ALMACEN_BORRADORES).put({
      idMetadatos,
      texto,
      fecha: new Date().toISOString(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Recupera el borrador guardado de un hablante, o null si no existe.
 */
export async function obtenerBorrador(idMetadatos) {
  const db = await abrirBD();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(ALMACEN_BORRADORES, 'readonly');
    const solicitud = tx.objectStore(ALMACEN_BORRADORES).get(idMetadatos);

    solicitud.onsuccess = () => resolve(solicitud.result || null);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

/**
 * Elimina el borrador una vez que el enunciado ya se envió al servidor.
 */
export async function eliminarBorrador(idMetadatos) {
  const db = await abrirBD();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(ALMACEN_BORRADORES, 'readwrite');
    tx.objectStore(ALMACEN_BORRADORES).delete(idMetadatos);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
