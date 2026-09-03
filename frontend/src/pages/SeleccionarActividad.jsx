// frontend/src/pages/SeleccionarActividad.jsx
//
// Punto de entrada del sistema. Implementa el caso de uso
// "Seleccionar actividad" (ERS §2.1.2.1) y el flujo 3.2.1 del DDS.
//
// Se presenta antes de la identificación: el hablante elige primero
// qué desea hacer y solo entonces se le solicita su DNI. Esta pantalla
// no realiza peticiones al Backend.

export default function SeleccionarActividad({ onContribuir, onValidar, onAdministrar }) {
  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>NampiVoz</h1>
      <p style={estilos.subtitulo}>
        Ayuda a documentar tu lengua originaria. ¿Qué quieres hacer?
      </p>

      <button onClick={onContribuir} style={estilos.opcion}>
        <span style={estilos.icono}>🎙️</span>
        <span>
          <strong style={estilos.tituloOpcion}>Aportar mi voz</strong>
          <span style={estilos.descripcionOpcion}>
            Escribe una frase en tu lengua y grábala
          </span>
        </span>
      </button>

      <button onClick={onValidar} style={estilos.opcion}>
        <span style={estilos.icono}>👂</span>
        <span>
          <strong style={estilos.tituloOpcion}>Validar grabaciones</strong>
          <span style={estilos.descripcionOpcion}>
            Escucha las contribuciones de otros y evalúalas
          </span>
        </span>
      </button>

      <button onClick={onAdministrar} style={estilos.enlaceAdmin}>
        Administración
      </button>
    </div>
  );
}

const estilos = {
  contenedor: { maxWidth: 420, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' },
  titulo: { fontSize: 28, marginBottom: 4 },
  subtitulo: { color: '#555', marginBottom: 28 },
  opcion: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    padding: 20,
    marginBottom: 12,
    fontSize: 16,
    textAlign: 'left',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    background: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  icono: { fontSize: 32 },
  tituloOpcion: { display: 'block', fontSize: 17, marginBottom: 2 },
  descripcionOpcion: { display: 'block', fontSize: 14, color: '#666' },
  enlaceAdmin: { width: '100%', padding: 10, fontSize: 13, borderRadius: 6, border: 'none', background: 'transparent', color: '#9ca3af', cursor: 'pointer', marginTop: 24 },
};
