// frontend/src/components/BarraSincronizacion.jsx
//
// Indicador permanente del estado de conexión y del número de
// contribuciones pendientes de sincronizar.
//
// Cumple una función explícita del flujo 3.2.3 del DDS: "El sistema
// informa al hablante que la grabación quedó guardada localmente y se
// enviará al servidor cuando se restablezca la conexión". Sin una
// señal visible, el hablante no tendría forma de saber si sus
// contribuciones ya llegaron al servidor.

import { useEffect, useState } from 'react';
import { contarContribucionesPendientes } from '../services/almacenamientoLocal';
import {
  sincronizarPendientes,
  iniciarSincronizacionAutomatica,
} from '../services/sincronizacionService';

export default function BarraSincronizacion() {
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [pendientes, setPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  async function actualizarConteo() {
    try {
      setPendientes(await contarContribucionesPendientes());
    } catch {
      // Si IndexedDB no está disponible, el indicador simplemente no
      // muestra pendientes; no debe romper la aplicación.
    }
  }

  useEffect(() => {
    actualizarConteo();

    const alCambiarConexion = () => setEnLinea(navigator.onLine);
    window.addEventListener('online', alCambiarConexion);
    window.addEventListener('offline', alCambiarConexion);

    const cancelar = iniciarSincronizacionAutomatica(actualizarConteo);

    // Refresco periódico: cubre las contribuciones que se guardan
    // localmente desde otras pantallas de la aplicación.
    const intervalo = setInterval(actualizarConteo, 3000);

    return () => {
      window.removeEventListener('online', alCambiarConexion);
      window.removeEventListener('offline', alCambiarConexion);
      cancelar();
      clearInterval(intervalo);
    };
  }, []);

  async function sincronizarAhora() {
    setSincronizando(true);
    try {
      await sincronizarPendientes();
      await actualizarConteo();
    } finally {
      setSincronizando(false);
    }
  }

  // Sin pendientes y con conexión, no hay nada que informar.
  if (enLinea && pendientes === 0) return null;

  return (
    <div style={enLinea ? estilos.barraPendiente : estilos.barraSinConexion}>
      {!enLinea && <span>Sin conexión. Tus grabaciones se guardan en este dispositivo.</span>}

      {pendientes > 0 && (
        <span>
          {' '}
          {pendientes} contribución{pendientes === 1 ? '' : 'es'} pendiente
          {pendientes === 1 ? '' : 's'} de enviar.
        </span>
      )}

      {enLinea && pendientes > 0 && (
        <button onClick={sincronizarAhora} disabled={sincronizando} style={estilos.boton}>
          {sincronizando ? 'Enviando…' : 'Enviar ahora'}
        </button>
      )}
    </div>
  );
}

const estilos = {
  barraSinConexion: {
    background: '#fef3c7',
    color: '#92400e',
    padding: '10px 16px',
    fontSize: 14,
    fontFamily: 'sans-serif',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  barraPendiente: {
    background: '#dbeafe',
    color: '#1e40af',
    padding: '10px 16px',
    fontSize: 14,
    fontFamily: 'sans-serif',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  boton: {
    padding: '6px 12px',
    fontSize: 13,
    borderRadius: 4,
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
  },
};
