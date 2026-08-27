// frontend/src/App.jsx
//
// Encadena las pantallas del flujo del hablante nativo:
// identificación → redacción del enunciado → grabación de voz →
// validación (siguiente tarea del cronograma, OE3).
//
// El estado vive aquí, en el "Gestor de Estado" del Frontend descrito
// en el DDS §2.2.1.1, y se pasa hacia abajo por props.

import { useState } from 'react';
import RegistroMetadatos from './pages/RegistroMetadatos';
import RedactarEnunciado from './pages/RedactarEnunciado';
import GrabarVoz from './pages/GrabarVoz';
import BarraSincronizacion from './components/BarraSincronizacion';

function App() {
  const [hablante, setHablante] = useState(null);
  const [enunciado, setEnunciado] = useState(null);
  const [grabacion, setGrabacion] = useState(null);
  const [guardadaLocal, setGuardadaLocal] = useState(null);

  /**
   * Limpia el estado de la contribución terminada y devuelve al
   * hablante a la interfaz de transcripción (DDS §3.2.3, paso 14).
   *
   * Deben limpiarse todos los valores: si solo se reinicia el
   * enunciado, la grabación anterior permanece en el estado y la
   * aplicación se salta la pantalla de grabación.
   */
  function iniciarNuevaContribucion() {
    setEnunciado(null);
    setGrabacion(null);
    setGuardadaLocal(null);
  }

  function cambiarDeHablante() {
    setHablante(null);
    iniciarNuevaContribucion();
  }

  function contenido() {
    if (!hablante) {
      return <RegistroMetadatos onHablanteListo={setHablante} />;
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

    // Contribución guardada sin conexión: no hay id_grabacion ni URL
    // todavía, porque el registro se creará al sincronizar.
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
            No cierres la aplicación hasta entonces.
          </p>
          <div style={estilos.filaBotones}>
            <button onClick={iniciarNuevaContribucion} style={estilos.boton}>
              Grabar otro enunciado
            </button>
            <button onClick={cambiarDeHablante} style={estilos.botonSecundario}>
              Salir
            </button>
          </div>
        </div>
      );
    }

    // Contribución enviada al servidor.
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
          <button onClick={iniciarNuevaContribucion} style={estilos.boton}>
            Grabar otro enunciado
          </button>
          <button onClick={cambiarDeHablante} style={estilos.botonSecundario}>
            Salir
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
