// frontend/src/services/almacenamientoLocal.js
//
// Módulo de Persistencia Local sobre IndexedDB (DDS §2.2.1.1).
//
// Mantiene dos almacenes:
//   - borradores_enunciado      : autoguardado del texto mientras el
//                                 hablante escribe (flujo 3.2.2).
//   - contribuciones_pendientes : contribuciones completas (enunciado +
//                                 audio) generadas sin conexión, a la
//                                 espera de sincronizarse (flujo 3.2.5).
//
// IndexedDB almacena objetos Blob de forma nativa, por lo que el audio
// se conserva tal cual, sin necesidad de convertirlo a texto (base64),
// lo que evitaría un aumento de aproximadamente 33 % en el espacio
// ocupado.

const NOMBRE_BD = 'nampivoz-local';
const VERSION_BD = 2; // v2: se añade contribuciones_pendientes

const ALMACEN_BORRADORES = 'borradores_enunciado';
const ALMACEN_PENDIENTES = 'contribuciones_pendientes';

function abrirBD() {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(NOMBRE_BD, VERSION_BD);

    solicitud.onupgradeneeded = () => {
      const db = solicitud.result;

      if (!db.objectStoreNames.contains(ALMACEN_BORRADORES)) {
        db.createObjectStore(ALMACEN_BORRADORES, { keyPath: 'idMetadatos' });
      }

      if (!db.objectStoreNames.contains(ALMACEN_PENDIENTES)) {
        db.createObjectStore(ALMACEN_PENDIENTES, { keyPath: 'idLocal' });
      }
    };

    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

function ejecutar(almacen, modo, operacion) {
  return abrirBD().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(almacen, modo);
        const solicitud = operacion(tx.objectStore(almacen));

        tx.oncomplete = () => resolve(solicitud ? solicitud.result : undefined);
        tx.onerror = () => reject(tx.error);
      })
  );
}

// ---------------------------------------------------------------------
// Borradores de enunciado
// ---------------------------------------------------------------------

export function guardarBorrador(idMetadatos, texto) {
  return ejecutar(ALMACEN_BORRADORES, 'readwrite', (almacen) =>
    almacen.put({ idMetadatos, texto, fecha: new Date().toISOString() })
  );
}

export function obtenerBorrador(idMetadatos) {
  return ejecutar(ALMACEN_BORRADORES, 'readonly', (almacen) =>
    almacen.get(idMetadatos)
  ).then((resultado) => resultado || null);
}

export function eliminarBorrador(idMetadatos) {
  return ejecutar(ALMACEN_BORRADORES, 'readwrite', (almacen) =>
    almacen.delete(idMetadatos)
  );
}

// ---------------------------------------------------------------------
// Contribuciones pendientes de sincronización
// ---------------------------------------------------------------------

/**
 * Guarda localmente una contribución completa generada sin conexión.
 * @returns {Promise<string>} El idLocal asignado.
 */
export async function guardarContribucionPendiente({ idMetadatos, texto, wavBlob }) {
  // crypto.randomUUID está disponible en todos los navegadores
  // modernos sobre contextos seguros (https o localhost).
  const idLocal =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  await ejecutar(ALMACEN_PENDIENTES, 'readwrite', (almacen) =>
    almacen.put({
      idLocal,
      idMetadatos,
      texto,
      wavBlob,
      fecha: new Date().toISOString(),
    })
  );

  return idLocal;
}

export function listarContribucionesPendientes() {
  return ejecutar(ALMACEN_PENDIENTES, 'readonly', (almacen) =>
    almacen.getAll()
  ).then((resultado) => resultado || []);
}

export function contarContribucionesPendientes() {
  return ejecutar(ALMACEN_PENDIENTES, 'readonly', (almacen) => almacen.count());
}

export function eliminarContribucionPendiente(idLocal) {
  return ejecutar(ALMACEN_PENDIENTES, 'readwrite', (almacen) =>
    almacen.delete(idLocal)
  );
}
