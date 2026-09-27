// frontend/src/pages/SeleccionarActividad.jsx
//
// Punto de entrada del sistema. Implementa el caso de uso
// "Seleccionar actividad".
//
// Se presenta antes de la identificación: el hablante elige primero
// qué desea hacer y solo entonces se le solicita su documento. Esta
// pantalla no realiza peticiones al servidor.

import Icono, { BotonGrande } from '../components/Icono';

export default function SeleccionarActividad({ onContribuir, onValidar, onAdministrar }) {
  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>NampiVoz</h1>

      {/* La ilustración comunica de un vistazo la idea del sistema:
          una comunidad donde unos aportan su voz y otros escuchan para
          validarla. Precede al texto porque es lo primero que puede
          interpretar quien no lee con fluidez. */}
      <div style={estilos.ilustracion}>
        <Icono nombre="bienvenida" tamano={280} estilo={{ width: '100%', height: 'auto' }} />
      </div>

      <p style={estilos.subtitulo}>
        Ayuda a documentar tu lengua originaria. ¿Qué quieres hacer?
      </p>

      <div style={estilos.opciones}>
        <BotonGrande
          icono="aportar-voz"
          etiqueta="Aportar mi voz"
          descripcion="Escribe una frase y grábala"
          onClick={onContribuir}
          color="#2563EB"
        />

        <BotonGrande
          icono="validar"
          etiqueta="Validar grabaciones"
          descripcion="Escucha a otros y evalúa"
          onClick={onValidar}
          color="#16A34A"
        />
      </div>

      <button onClick={onAdministrar} style={estilos.enlaceAdmin}>
        Administración
      </button>
    </div>
  );
}

const estilos = {
  contenedor: { maxWidth: 420, margin: '32px auto', padding: 24, fontFamily: 'sans-serif' },
  titulo: { fontSize: 30, marginBottom: 8, textAlign: 'center' },
  ilustracion: { display: 'flex', justifyContent: 'center', marginBottom: 16 },
  subtitulo: { color: '#4B5563', marginBottom: 24, textAlign: 'center', fontSize: 16 },
  opciones: { display: 'flex', flexDirection: 'column', gap: 16 },
  enlaceAdmin: {
    width: '100%',
    padding: 10,
    fontSize: 13,
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: '#9CA3AF',
    cursor: 'pointer',
    marginTop: 32,
    fontFamily: 'inherit',
  },
};
