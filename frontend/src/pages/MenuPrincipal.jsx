// frontend/src/pages/MenuPrincipal.jsx
//
// Pantalla intermedia que permite al hablante elegir entre las dos
// actividades que el sistema le ofrece: aportar una contribución propia
// o validar las de otros miembros de la comunidad.
//
// El ERS y el DDS especifican ambos flujos pero no un punto de entrada
// que los articule, porque cada caso de uso se describe de forma
// independiente. Esta pantalla resuelve esa necesidad de navegación.
// Conviene incorporarla al DDS como parte del flujo del hablante.

export default function MenuPrincipal({ hablante, onContribuir, onValidar, onSalir }) {
  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>¿Qué quieres hacer?</h1>
      <p style={estilos.subtitulo}>
        Estás participando en {hablante.lengua}.
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

      <button onClick={onSalir} style={estilos.botonSecundario}>
        Salir
      </button>
    </div>
  );
}

const estilos = {
  contenedor: { maxWidth: 420, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' },
  titulo: { fontSize: 24, marginBottom: 4 },
  subtitulo: { color: '#555', marginBottom: 24 },
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
  botonSecundario: {
    width: '100%',
    padding: 10,
    fontSize: 15,
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: '#2563eb',
    cursor: 'pointer',
    marginTop: 16,
  },
};
