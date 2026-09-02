// frontend/src/App.jsx
//
// Orquesta la navegación entre las pantallas del sistema. El estado
// vive aquí, en el "Gestor de Estado" del Frontend descrito en el DDS
// §2.2.1.1, y se pasa hacia abajo por props.
//
// Tras identificarse, el hablante elige entre dos actividades:
//   - Contribuir : redactar enunciado → grabar voz
//   - Validar    : evaluar las grabaciones de otros miembros

import { useState } from 'react';
import RegistroMetadatos from './pages/RegistroMetadatos';
import MenuPrincipal from './pages/MenuPrincipal';
import RedactarEnunciado from './pages/RedactarEnunciado';
import GrabarVoz from './pages/GrabarVoz';
import ValidarGrabaciones from './pages/ValidarGrabaciones';
import BarraSincronizacion from './components/BarraSincronizacion';

const VISTA = {
  MENU: 'MENU',
  CONTRIBUIR: 'CONTRIBUIR',
  VALIDAR: 'VALIDAR',
};

function App() {
  const [hablante, setHablante] = useState(null);
  const [vista, setVista] = useState(VISTA.MENU);

  const [enunciado, setEnunciado] = useState(null);
  const [grabacion, setGrabacion] = useState(null);
  const [guardadaLocal, setGuardadaLocal] = useState(null);

  /**
   * Limpia el estado de la contribución terminada (DDS §3.2.3, paso 14).
   * Deben limpiarse los tres valores: si solo se reinicia el enunciado,
   * la grabación anterior permanece y la aplicación se salta la
   * pantalla de grabación.
   */
  function reiniciarContribucion() {
    setEnunciado(null);
    setGrabacion(null);
    setGuardadaLocal(null);
  }

  function volverAlMenu() {
    reiniciarContribucion();
    setVista(VISTA.MENU);
  }

  function cerrarSesion() {
    setHablante(null);
    volverAlMenu();
  }

  function contenido() {
    if (!hablante) {
      return <RegistroMetadatos onHablanteListo={setHablante} />;
    }

    if (vista === VISTA.MENU) {
      return (
        <MenuPrincipal
          hablante={hablante}
          onContribuir={() => setVista(VISTA.CONTRIBUIR)}
          onValidar={() => setVista(VISTA.VALIDAR)}
          onSalir={cerrarSesion}
        />
      );
    }

    if (vista === VISTA.VALIDAR) {
      return (
        <ValidarGrabaciones idMetadatos={hablante.id_metadatos} onSalir={volverAlMenu} />
      );
    }

    // --- Flujo de contribución ---

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
            <button onClick={volverAlMenu} style={estilos.botonSecundario}>
              Volver al menú
            </button>
          </div>
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
          <button onClick={volverAlMenu} style={estilos.botonSecundario}>
            Volver al menú
          </button>
        </div>
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
};

export default App;
