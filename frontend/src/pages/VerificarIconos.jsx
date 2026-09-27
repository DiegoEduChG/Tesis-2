// frontend/src/pages/VerificarIconos.jsx
//
// Pantalla de apoyo al desarrollo y a la prueba de comprensión.
//
// Cumple dos funciones. Durante el desarrollo, permite comprobar de un
// vistazo qué íconos ya se incorporaron y cuáles faltan. Durante la
// prueba piloto, el modo de presentación aislada muestra cada ícono sin
// su etiqueta, que es la condición necesaria para preguntar al
// participante qué cree que representa sin darle la respuesta escrita.
//
// Esta pantalla no forma parte del sistema en producción: es una
// herramienta de verificación. Para acceder, móntala temporalmente en
// App.jsx.

import { useState } from 'react';
import Icono from '../components/Icono';
import { iconosDisponibles, obtenerTextoAlternativo } from '../assets/iconos';

// Inventario completo esperado, en el orden en que aparecen en la
// interfaz. Permite detectar ausencias, no solo listar lo presente.
const INVENTARIO = [
  { grupo: 'Selección de actividad', nombres: ['bienvenida', 'aportar-voz', 'validar'] },
  { grupo: 'Identificación', nombres: ['documento', 'ayuda'] },
  { grupo: 'Redacción', nombres: ['escribir', 'borrador-recuperado'] },
  { grupo: 'Grabación', nombres: ['grabar', 'detener', 'escuchar', 'guardar', 'volver-a-grabar'] },
  { grupo: 'Validación', nombres: ['aprobar', 'desaprobar', 'omitir'] },
  {
    grupo: 'Estados',
    nombres: ['pendiente', 'validada', 'sin-conexion', 'guardado-local', 'enviado', 'sin-pendientes'],
  },
];

export default function VerificarIconos({ onSalir }) {
  const [modoAislado, setModoAislado] = useState(false);
  const [indiceAislado, setIndiceAislado] = useState(0);

  const presentes = iconosDisponibles();
  const todos = INVENTARIO.flatMap((g) => g.nombres);
  const faltantes = todos.filter((n) => !presentes.includes(n));

  // Modo de presentación aislada: un ícono a la vez, sin etiqueta ni
  // contexto, para la prueba de comprensión con los participantes.
  if (modoAislado) {
    const nombre = todos[indiceAislado];

    return (
      <div style={estilos.aislado}>
        <Icono nombre={nombre} tamano={280} />

        <div style={estilos.navegacionAislada}>
          <button
            onClick={() => setIndiceAislado((i) => Math.max(0, i - 1))}
            disabled={indiceAislado === 0}
            style={estilos.botonNav}
          >
            ← Anterior
          </button>

          <span style={estilos.posicion}>
            {indiceAislado + 1} / {todos.length}
          </span>

          <button
            onClick={() => setIndiceAislado((i) => Math.min(todos.length - 1, i + 1))}
            disabled={indiceAislado === todos.length - 1}
            style={estilos.botonNav}
          >
            Siguiente →
          </button>
        </div>

        {/* El nombre se muestra en gris muy tenue y tamaño pequeño:
            sirve al facilitador para anotar la respuesta, sin resultar
            legible a distancia para el participante. */}
        <p style={estilos.nombreTenue}>{nombre}</p>

        <button onClick={() => setModoAislado(false)} style={estilos.botonSalir}>
          Salir del modo aislado
        </button>
      </div>
    );
  }

  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>Inventario de iconografía</h1>

      <div style={estilos.resumen}>
        <strong>{presentes.length}</strong> de <strong>{todos.length}</strong> íconos incorporados
        {faltantes.length > 0 && (
          <div style={estilos.faltantes}>
            Faltan: {faltantes.join(', ')}
          </div>
        )}
      </div>

      <div style={estilos.acciones}>
        <button onClick={() => setModoAislado(true)} style={estilos.botonPrueba}>
          Modo prueba de comprensión
        </button>
        {onSalir && (
          <button onClick={onSalir} style={estilos.botonSalir}>
            Volver
          </button>
        )}
      </div>

      {INVENTARIO.map((grupo) => (
        <section key={grupo.grupo} style={estilos.seccion}>
          <h2 style={estilos.tituloGrupo}>{grupo.grupo}</h2>

          <div style={estilos.rejilla}>
            {grupo.nombres.map((nombre) => {
              const existe = presentes.includes(nombre);

              return (
                <div key={nombre} style={existe ? estilos.celda : estilos.celdaFaltante}>
                  {existe ? (
                    <Icono nombre={nombre} tamano={72} />
                  ) : (
                    <div style={estilos.marcador}>?</div>
                  )}
                  <code style={estilos.nombre}>{nombre}</code>
                  {existe && (
                    <span style={estilos.alt}>{obtenerTextoAlternativo(nombre)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

const estilos = {
  contenedor: { maxWidth: 900, margin: '32px auto', padding: 24, fontFamily: 'sans-serif' },
  titulo: { fontSize: 24, marginBottom: 16 },
  resumen: { background: '#F3F4F6', padding: 16, borderRadius: 8, marginBottom: 16 },
  faltantes: { marginTop: 8, color: '#92400E', fontSize: 14 },
  acciones: { display: 'flex', gap: 12, marginBottom: 24 },
  botonPrueba: {
    padding: '10px 20px',
    fontSize: 15,
    borderRadius: 6,
    border: 'none',
    background: '#2563EB',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  seccion: { marginBottom: 32 },
  tituloGrupo: { fontSize: 17, color: '#374151', marginBottom: 12 },
  rejilla: { display: 'flex', flexWrap: 'wrap', gap: 16 },
  celda: {
    width: 150,
    padding: 12,
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    textAlign: 'center',
    background: '#fff',
  },
  celdaFaltante: {
    width: 150,
    padding: 12,
    border: '1px dashed #D1D5DB',
    borderRadius: 8,
    textAlign: 'center',
    background: '#FAFAFA',
  },
  marcador: {
    width: 72,
    height: 72,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 32,
    color: '#D1D5DB',
  },
  nombre: { display: 'block', fontSize: 12, marginTop: 8, color: '#374151' },
  alt: { display: 'block', fontSize: 11, color: '#9CA3AF', marginTop: 4, lineHeight: 1.3 },
  aislado: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    fontFamily: 'sans-serif',
  },
  navegacionAislada: { display: 'flex', alignItems: 'center', gap: 24 },
  botonNav: {
    padding: '10px 20px',
    fontSize: 15,
    borderRadius: 6,
    border: '1px solid #D1D5DB',
    background: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  posicion: { fontSize: 15, color: '#6B7280' },
  nombreTenue: { fontSize: 11, color: '#E5E7EB' },
  botonSalir: {
    padding: '10px 20px',
    fontSize: 15,
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: '#2563EB',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
