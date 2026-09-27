// frontend/src/components/Icono.jsx
//
// Componentes de presentación de la iconografía.
//
// El criterio que rige este archivo es que el ícono **acompaña** a la
// etiqueta de texto, nunca la sustituye. Un ícono comprendido más una
// palabra escrita resulta más accesible que cualquiera de los dos por
// separado: quien no lee con fluidez se apoya en la imagen, y quien sí
// lee confirma con el texto su interpretación del dibujo.
//
// Los íconos se presentan siempre con sus colores originales. Alterar
// su apariencia mediante filtros anularía las decisiones de color del
// dibujo y, en el caso de archivos con fondo opaco, produciría un
// rectángulo uniforme en lugar de la ilustración.

import { obtenerIcono, obtenerTextoAlternativo } from '../assets/iconos';

/**
 * Muestra un ícono. Si el archivo todavía no se ha incorporado a la
 * carpeta de recursos, no renderiza nada y el componente que lo
 * contiene conserva su etiqueta de texto.
 */
export default function Icono({ nombre, tamano = 48, estilo = {} }) {
  const url = obtenerIcono(nombre);

  if (!url) return null;

  return (
    <img
      src={url}
      alt={obtenerTextoAlternativo(nombre)}
      width={tamano}
      height={tamano}
      style={{ display: 'block', objectFit: 'contain', ...estilo }}
    />
  );
}

/**
 * Convierte un color hexadecimal en una versión muy tenue del mismo,
 * apta como fondo. Permite que cada botón conserve su identidad
 * cromática sin comprometer la visibilidad del ícono.
 */
function tinte(hex, alfa = 0.08) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
}

/**
 * Botón de acción principal con ícono sobre etiqueta.
 *
 * El fondo es claro y el color distintivo se aplica al borde y al
 * texto. Este reparto cumple dos propósitos: el ícono se muestra sin
 * alteraciones, y el contraste entre el texto oscuro y el fondo claro
 * supera al que se obtendría con texto blanco sobre color saturado.
 *
 * La altura mínima de 96 px responde a la precisión de toque reducida
 * que suele observarse en personas con poca experiencia con pantallas
 * táctiles: un objetivo pequeño produce pulsaciones fallidas que el
 * usuario interpreta como que el sistema no responde.
 */
export function BotonGrande({
  icono,
  etiqueta,
  descripcion,
  onClick,
  disabled = false,
  color = '#2563EB',
  variante = 'relleno',
  style = {},
}) {
  // La variante determina la intensidad del énfasis: "relleno" para la
  // acción principal de la pantalla, "contorno" para las alternativas.
  const destacado = variante === 'relleno';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        minHeight: 96,
        width: '100%',
        padding: '16px 20px',
        borderRadius: 12,
        border: `${destacado ? 3 : 2}px solid ${color}`,
        background: destacado ? tinte(color) : '#FFFFFF',
        color: '#1F2937',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        textAlign: 'left',
        fontFamily: 'inherit',
        ...style,
      }}
    >
      <Icono nombre={icono} tamano={64} estilo={{ flexShrink: 0 }} />

      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 19, fontWeight: 700, color }}>{etiqueta}</span>
        {descripcion && (
          <span style={{ fontSize: 14, color: '#4B5563', fontWeight: 400 }}>{descripcion}</span>
        )}
      </span>
    </button>
  );
}

/**
 * Aviso con ícono, para estados del sistema: sin conexión, contribución
 * guardada, ausencia de tareas pendientes.
 */
export function AvisoConIcono({ icono, children, color = '#1F2937', fondo = '#F3F4F6' }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 8,
        background: fondo,
        color,
        fontSize: 15,
      }}
    >
      <Icono nombre={icono} tamano={40} estilo={{ flexShrink: 0 }} />
      <div>{children}</div>
    </div>
  );
}