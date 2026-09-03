// frontend/src/App.jsx
//
// Orquesta la navegación entre las pantallas del sistema. El estado
// vive aquí, en el "Gestor de Estado" del Frontend descrito en el DDS
// §2.2.1.1, y se pasa hacia abajo por props.
//
// Orden del flujo:
//   1. Seleccionar actividad  (punto de entrada, sin identificación)
//   2. Identificarse mediante DNI
//   3. Según la actividad elegida:
//        Contribuir : redactar enunciado → grabar voz
//        Validar    : evaluar las grabaciones de otros miembros

import { useState } from 'react';
import SeleccionarActividad from './pages/SeleccionarActividad';
import RegistroMetadatos from './pages/RegistroMetadatos';
import RedactarEnunciado from './pages/RedactarEnunciado';
import GrabarVoz from './pages/GrabarVoz';
import ValidarGrabaciones from './pages/ValidarGrabaciones';
import AdminLogin from './pages/admin/AdminLogin';
import AdminPanel from './pages/admin/AdminPanel';
import { cerrarSesion as limpiarTokenAdmin } from './services/adminService';
import BarraSincronizacion from './components/BarraSincronizacion';

const ACTIVIDAD = {
  CONTRIBUIR: 'CONTRIBUIR',
  VALIDAR: 'VALIDAR',
  ADMINISTRAR: 'ADMINISTRAR',
};

function App() {
  const [actividad, setActividad] = useState(null);
  const [hablante, setHablante] = useState(null);

  const [enunciado, setEnunciado] = useState(null);
  const [grabacion, setGrabacion] = useState(null);
  const [guardadaLocal, setGuardadaLocal] = useState(null);
  const [sesionAdmin, setSesionAdmin] = useState(null);

  /**
   * Limpia el estado de la contribución terminada (DDS, flujo de
   * grabación, último paso). Deben limpiarse los tres valores: si solo
   * se reinicia el enunciado, la grabación anterior permanece y la
   * aplicación se salta la pantalla de grabación.
   */
  function reiniciarContribucion() {
    setEnunciado(null);
    setGrabacion(null);
    setGuardadaLocal(null);
  }

  /**
   * Vuelve al punto de entrada. Se conserva la identificación del
   * hablante: quien acaba de aportar una grabación puede pasar a
   * validar sin volver a ingresar su DNI.
   */
  function volverASeleccion() {
    reiniciarContribucion();
    setActividad(null);
  }

  function cerrarSesionAdmin() {
    limpiarTokenAdmin();
    setSesionAdmin(null);
    setActividad(null);
  }

  /**
   * Cierra la sesión por completo. Necesario en las sesiones de prueba
   * donde varios participantes comparten un mismo dispositivo.
   */
  function cerrarSesion() {
    setHablante(null);
    volverASeleccion();
  }

  function contenido() {
    // Paso 1 — Selección de actividad
    if (!actividad) {
      return (
        <SeleccionarActividad
          onContribuir={() => setActividad(ACTIVIDAD.CONTRIBUIR)}
          onValidar={() => setActividad(ACTIVIDAD.VALIDAR)}
          onAdministrar={() => setActividad(ACTIVIDAD.ADMINISTRAR)}
        />
      );
    }

    // El rol Administrador tiene su propio mecanismo de autenticación,
    // independiente de la identificación por DNI de los hablantes.
    if (actividad === ACTIVIDAD.ADMINISTRAR) {
      if (!sesionAdmin) {
        return (
          <AdminLogin onSesionIniciada={setSesionAdmin} onVolver={volverASeleccion} />
        );
      }

      return (
        <AdminPanel usuario={sesionAdmin.usuario} onCerrarSesion={cerrarSesionAdmin} />
      );
    }

    // Paso 2 — Identificación
    if (!hablante) {
      return (
        <RegistroMetadatos
          actividad={actividad}
          onHablanteListo={setHablante}
          onVolver={volverASeleccion}
        />
      );
    }

    // Paso 3 — Actividad elegida
    if (actividad === ACTIVIDAD.VALIDAR) {
      return (
        <ValidarGrabaciones
          idMetadatos={hablante.id_metadatos}
          onSalir={volverASeleccion}
        />
      );
    }

    if (!enunciado) {
      return (
        <RedactarEnunciado
          idMetadatos={hablante.id_metadatos}
          onEnunciadoListo={setEnunciado}
        />
      );
    }

    if (!grabacion && !guardadaLocal) {
      return (
        <GrabarVoz
          idMetadatos={hablante.id_metadatos}
          transcripcion={enunciado}
          onGrabacionLista={setGrabacion}
          onGuardadaLocalmente={setGuardadaLocal}
        />
      );
    }

    // Contribución guardada sin conexión: aún no existe id_grabacion
    // ni URL, porque el registro se creará al sincronizar.
    if (guardadaLocal) {
      return (
        <div style={estilos.contenedor}>
          <h1 style={estilos.titulo}>Guardada en este dispositivo</h1>
          <div style={estilos.resumen}>
            <p style={estilos.enunciado}>"{guardadaLocal.texto_transcripcion}"</p>
            <p style={estilos.metadato}>
              Duración: {guardadaLocal.duracionSegundos?.toFixed(1)} s
            </p>
          </div>
          <p style={estilos.nota}>
            Se enviará automáticamente cuando vuelvas a tener conexión a internet.
          </p>
          <div style={estilos.filaBotones}>
            <button onClick={reiniciarContribucion} style={estilos.boton}>
              Grabar otro enunciado
            </button>
            <button onClick={volverASeleccion} style={estilos.botonSecundario}>
              Inicio
            </button>
          </div>
          <button onClick={cerrarSesion} style={estilos.botonTerciario}>
            Cambiar de hablante
          </button>
        </div>
      );
    }

    return (
      <div style={estilos.contenedor}>
        <h1 style={estilos.titulo}>✅ Contribución guardada</h1>

        <div style={estilos.resumen}>
          <p style={estilos.enunciado}>"{enunciado.texto_transcripcion}"</p>
          <audio src={grabacion.url_audio} controls style={{ width: '100%' }} />
          <p style={estilos.metadato}>
            Duración: {Number(grabacion.duracion_segundos).toFixed(1)} s · Estado:{' '}
            {grabacion.estado}
          </p>
        </div>

        <p style={estilos.nota}>
          Tu grabación quedó pendiente de validación por la comunidad.
        </p>

        <div style={estilos.filaBotones}>
          <button onClick={reiniciarContribucion} style={estilos.boton}>
            Grabar otro enunciado
          </button>
          <button onClick={volverASeleccion} style={estilos.botonSecundario}>
            Inicio
          </button>
        </div>

        <button onClick={cerrarSesion} style={estilos.botonTerciario}>
          Cambiar de hablante
        </button>
      </div>
    );
  }

  return (
    <>
      <BarraSincronizacion />
      {contenido()}
    </>
  );
}

const estilos = {
  contenedor: { maxWidth: 420, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' },
  titulo: { fontSize: 22, marginBottom: 20 },
  resumen: { background: '#f3f4f6', padding: 16, borderRadius: 6, marginBottom: 16 },
  enunciado: { fontStyle: 'italic', fontSize: 17, marginTop: 0 },
  metadato: { fontSize: 13, color: '#666', marginBottom: 0 },
  nota: { color: '#555', fontSize: 14 },
  filaBotones: { display: 'flex', gap: 12, marginTop: 20 },
  boton: { padding: 12, fontSize: 16, borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', flex: 1 },
  botonSecundario: { padding: 12, fontSize: 16, borderRadius: 6, border: '1px solid #999', background: '#fff', color: '#444', cursor: 'pointer' },
  botonTerciario: { width: '100%', padding: 10, fontSize: 14, borderRadius: 6, border: 'none', background: 'transparent', color: '#888', cursor: 'pointer', marginTop: 12 },
};

export default App;
