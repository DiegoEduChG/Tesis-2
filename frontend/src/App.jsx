// frontend/src/App.jsx
//
// Orquesta la navegación entre las pantallas del sistema. El estado
// vive aquí y se transmite hacia abajo por propiedades.
//
// Orden del flujo:
//   1. Seleccionar actividad  (punto de entrada, sin identificación)
//   2. Identificarse mediante documento
//   3. Según la actividad elegida:
//        Contribuir : escribir frase → grabar voz
//        Validar    : evaluar las grabaciones de la comunidad

import { useState } from 'react';
import SeleccionarActividad from './pages/SeleccionarActividad';
import RegistroMetadatos from './pages/RegistroMetadatos';
import RedactarEnunciado from './pages/RedactarEnunciado';
import GrabarVoz from './pages/GrabarVoz';
import ValidarGrabaciones from './pages/ValidarGrabaciones';
import AdminLogin from './pages/admin/AdminLogin';
import AdminPanel from './pages/admin/AdminPanel';
import BarraSincronizacion from './components/BarraSincronizacion';
import Icono, { BotonGrande } from './components/Icono';
import { cerrarSesion as limpiarTokenAdmin } from './services/adminService';

const ACTIVIDAD = {
  CONTRIBUIR: 'CONTRIBUIR',
  VALIDAR: 'VALIDAR',
  ADMINISTRAR: 'ADMINISTRAR',
};

function App() {
  const [actividad, setActividad] = useState(null);
  const [hablante, setHablante] = useState(null);
  const [sesionAdmin, setSesionAdmin] = useState(null);

  const [enunciado, setEnunciado] = useState(null);
  const [grabacion, setGrabacion] = useState(null);
  const [guardadaLocal, setGuardadaLocal] = useState(null);

  /**
   * Limpia el estado de la contribución terminada. Deben limpiarse los
   * tres valores: si solo se reinicia el enunciado, la grabación
   * anterior permanece y la aplicación se salta la pantalla de
   * grabación.
   */
  function reiniciarContribucion() {
    setEnunciado(null);
    setGrabacion(null);
    setGuardadaLocal(null);
  }

  /**
   * Vuelve al punto de entrada conservando la identificación: quien
   * acaba de aportar una grabación puede pasar a validar sin volver a
   * ingresar su documento.
   */
  function volverASeleccion() {
    reiniciarContribucion();
    setActividad(null);
  }

  /**
   * Cierra la sesión por completo. Necesario en las sesiones donde
   * varios participantes comparten un mismo dispositivo.
   */
  function cerrarSesion() {
    setHablante(null);
    volverASeleccion();
  }

  function cerrarSesionAdmin() {
    limpiarTokenAdmin();
    setSesionAdmin(null);
    setActividad(null);
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
    // independiente de la identificación de los hablantes.
    if (actividad === ACTIVIDAD.ADMINISTRAR) {
      if (!sesionAdmin) {
        return <AdminLogin onSesionIniciada={setSesionAdmin} onVolver={volverASeleccion} />;
      }

      return <AdminPanel usuario={sesionAdmin.usuario} onCerrarSesion={cerrarSesionAdmin} />;
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
        <ValidarGrabaciones idMetadatos={hablante.id_metadatos} onSalir={volverASeleccion} />
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

    // Contribución guardada sin conexión: aún no existe registro en el
    // servidor, porque se creará al sincronizar.
    if (guardadaLocal) {
      return (
        <PantallaFinal
          icono="guardado-local"
          titulo="Guardada en este teléfono"
          texto={guardadaLocal.texto_transcripcion}
          detalle={`${guardadaLocal.duracionSegundos?.toFixed(1)} segundos`}
          nota="Se enviará sola cuando tengas internet."
          colorNota="#92400E"
          fondoNota="#FEF3C7"
          onOtra={reiniciarContribucion}
          onInicio={volverASeleccion}
          onSalir={cerrarSesion}
        />
      );
    }

    return (
      <PantallaFinal
        icono="enviado"
        titulo="Grabación enviada"
        texto={enunciado.texto_transcripcion}
        detalle={`${Number(grabacion.duracion_segundos).toFixed(1)} segundos`}
        nota="Ahora otros hablantes de tu comunidad la van a escuchar."
        colorNota="#166534"
        fondoNota="#DCFCE7"
        onOtra={reiniciarContribucion}
        onInicio={volverASeleccion}
        onSalir={cerrarSesion}
      />
    );
  }

  return (
    <>
      <BarraSincronizacion />
      {contenido()}
    </>
  );
}

/**
 * Pantalla de cierre de una contribución. Comparte estructura para los
 * dos desenlaces posibles —enviada al servidor o guardada en el
 * dispositivo— de modo que el hablante reconozca la misma disposición
 * en ambos casos y solo cambie el mensaje.
 */
function PantallaFinal({
  icono,
  titulo,
  texto,
  detalle,
  nota,
  colorNota,
  fondoNota,
  onOtra,
  onInicio,
  onSalir,
}) {
  return (
    <div style={estilos.contenedor}>
      <div style={estilos.cabecera}>
        <Icono nombre={icono} tamano={120} />
        <h1 style={estilos.titulo}>{titulo}</h1>
      </div>

      <div style={estilos.resumen}>
        <p style={estilos.enunciado}>{texto}</p>
        <p style={estilos.detalle}>{detalle}</p>
      </div>

      <p style={{ ...estilos.nota, color: colorNota, background: fondoNota }}>{nota}</p>

      <div style={estilos.acciones}>
        <BotonGrande
          icono="aportar-voz"
          etiqueta="Grabar otra frase"
          onClick={onOtra}
          color="#2563EB"
        />
        <BotonGrande
          icono="validar"
          etiqueta="Ir al inicio"
          descripcion="Elegir otra actividad"
          onClick={onInicio}
          color="#6B7280"
          variante="contorno"
        />
      </div>

      <button onClick={onSalir} style={estilos.botonSalir}>
        Soy otra persona
      </button>
    </div>
  );
}

const estilos = {
  contenedor: { maxWidth: 420, margin: '32px auto', padding: 24, fontFamily: 'sans-serif' },
  cabecera: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 16 },
  titulo: { fontSize: 25, margin: 0, textAlign: 'center' },
  resumen: { background: '#F3F4F6', padding: 20, borderRadius: 10, marginBottom: 16 },
  enunciado: { fontSize: 20, lineHeight: 1.4, margin: 0 },
  detalle: { fontSize: 14, color: '#6B7280', marginTop: 10, marginBottom: 0 },
  nota: { fontSize: 15, padding: 14, borderRadius: 8, marginBottom: 20 },
  acciones: { display: 'flex', flexDirection: 'column', gap: 12 },
  botonSalir: {
    width: '100%',
    padding: 12,
    fontSize: 15,
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: '#9CA3AF',
    cursor: 'pointer',
    marginTop: 20,
    fontFamily: 'inherit',
  },
};

export default App;
