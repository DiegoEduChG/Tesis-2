// frontend/src/services/sincronizacionService.js
//
// Implementa el lado cliente del flujo 3.2.5 del DDS: detecta el
// restablecimiento de la conexión, envía en lote las contribuciones
// pendientes y limpia del almacenamiento local únicamente las que el
// servidor confirmó.
//
// ---------------------------------------------------------------------
// DESVIACIÓN RESPECTO DEL DDS — DOCUMENTAR EN EL INFORME DEL OE2
// ---------------------------------------------------------------------
// El DDS (§2.2.1.1 y §3.2.5) especifica un Service Worker con
// Background Sync API para disparar la sincronización. Esa API solo
// está implementada en navegadores basados en Chromium: ni Firefox ni
// Safari la soportan. Como el ERS (§3.2.1) compromete compatibilidad
// con Chrome, Firefox y Edge, depender exclusivamente de ella dejaría
// el modo offline inoperante en uno de los tres navegadores exigidos.
//
// Por eso la detección se implementa sobre los eventos "online" y
// "offline" de window, disponibles en todos los navegadores. La
// diferencia funcional es que la sincronización ocurre mientras la
// pestaña está abierta, y no en segundo plano con la aplicación
// cerrada. Para el alcance del prototipo y el escenario de la prueba
// piloto —sesiones guiadas con la aplicación en primer plano— la
// limitación no afecta el resultado.
// ---------------------------------------------------------------------

import {
  listarContribucionesPendientes,
  eliminarContribucionPendiente,
} from './almacenamientoLocal';

import { API_BASE } from '../config/api.js';

let sincronizacionEnCurso = false;

/**
 * Envía todas las contribuciones pendientes al servidor.
 * @returns {Promise<{sincronizadas: number, fallidas: number}>}
 */
export async function sincronizarPendientes() {
  // Evita que dos disparos simultáneos (por ejemplo, el evento "online"
  // y una pulsación manual del botón) envíen el mismo lote dos veces.
  if (sincronizacionEnCurso) {
    return { sincronizadas: 0, fallidas: 0 };
  }

  if (!navigator.onLine) {
    return { sincronizadas: 0, fallidas: 0 };
  }

  const pendientes = await listarContribucionesPendientes();
  if (pendientes.length === 0) {
    return { sincronizadas: 0, fallidas: 0 };
  }

  sincronizacionEnCurso = true;

  try {
    const formData = new FormData();

    formData.append(
      'contribuciones',
      JSON.stringify(
        pendientes.map((c) => ({
          id_local: c.idLocal,
          id_metadatos: c.idMetadatos,
          texto_transcripcion: c.texto,
        }))
      )
    );

    // Cada archivo se nombra con el idLocal de su contribución: así el
    // servidor los empareja sin depender del orden de envío.
    for (const contribucion of pendientes) {
      formData.append('audios', contribucion.wavBlob, `${contribucion.idLocal}.wav`);
    }

    const respuesta = await fetch(`${API_BASE}/sincronizacion`, {
      method: 'POST',
      body: formData,
    });

    if (!respuesta.ok) {
      throw new Error('El servidor rechazó el lote de sincronización.');
    }

    const { sincronizadas = [], fallidas = [] } = await respuesta.json();

    // Solo se eliminan del almacenamiento local las contribuciones que
    // el servidor confirmó. Las fallidas se conservan para reintentarlas
    // en la siguiente detección de conectividad.
    for (const item of sincronizadas) {
      await eliminarContribucionPendiente(item.id_local);
    }

    return { sincronizadas: sincronizadas.length, fallidas: fallidas.length };
  } finally {
    sincronizacionEnCurso = false;
  }
}

/**
 * Registra la escucha del evento "online" para disparar la
 * sincronización automáticamente al recuperar la conexión.
 *
 * @param {Function} alTerminar Callback con el resultado de cada intento.
 * @returns {Function} Función para cancelar la escucha.
 */
export function iniciarSincronizacionAutomatica(alTerminar) {
  async function manejarConexionRecuperada() {
    try {
      const resultado = await sincronizarPendientes();
      alTerminar?.(resultado);
    } catch (error) {
      console.error('Error durante la sincronización:', error.message);
    }
  }

  window.addEventListener('online', manejarConexionRecuperada);

  // Intento inicial: cubre el caso de que la aplicación se abra ya con
  // conexión y contribuciones acumuladas de una sesión anterior.
  manejarConexionRecuperada();

  return () => window.removeEventListener('online', manejarConexionRecuperada);
}
