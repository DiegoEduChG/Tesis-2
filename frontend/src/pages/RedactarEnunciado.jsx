// frontend/src/pages/RedactarEnunciado.jsx
//
// Implementa el flujo de redacción del enunciado:
//   1. Se presenta un campo de texto.
//   2. Mientras el hablante escribe, se autoguarda en el dispositivo.
//   3. Al continuar, se envía al servidor y se pasa a la grabación.
//
// Comportamiento sin conexión: el enunciado NO se envía al servidor. Se
// conserva en memoria y viaja junto con el audio cuando se sincroniza
// la contribución completa. Intentar persistirlo por separado sin
// conexión dejaría al hablante bloqueado en esta pantalla.

import { useEffect, useRef, useState } from 'react';
import { crear } from '../services/transcripcionesService';
import {
  guardarBorrador,
  obtenerBorrador,
  eliminarBorrador,
} from '../services/almacenamientoLocal';
import Icono, { AvisoConIcono } from '../components/Icono';

const LONGITUD_MAXIMA = 500;
const RETRASO_AUTOGUARDADO_MS = 800;

export default function RedactarEnunciado({ idMetadatos, onEnunciadoListo }) {
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [borradorRecuperado, setBorradorRecuperado] = useState(false);

  const temporizadorAutoguardado = useRef(null);

  useEffect(() => {
    obtenerBorrador(idMetadatos).then((borrador) => {
      if (borrador?.texto) {
        setTexto(borrador.texto);
        setBorradorRecuperado(true);
      }
    });
  }, [idMetadatos]);

  // Autoguardado con espera: se persiste cuando el hablante deja de
  // escribir, en lugar de hacerlo en cada tecla presionada.
  function manejarCambioTexto(evento) {
    const valor = evento.target.value;
    setTexto(valor);
    setBorradorRecuperado(false);

    if (temporizadorAutoguardado.current) {
      clearTimeout(temporizadorAutoguardado.current);
    }

    temporizadorAutoguardado.current = setTimeout(() => {
      guardarBorrador(idMetadatos, valor);
    }, RETRASO_AUTOGUARDADO_MS);
  }

  /**
   * Continúa sin persistir el enunciado en el servidor. El objeto
   * resultante no tiene identificador: esa es la señal de que la
   * contribución deberá guardarse completa en el dispositivo y crearse
   * en el servidor durante la sincronización.
   *
   * El borrador se conserva a propósito: si el hablante abandona antes
   * de grabar, su texto no se pierde.
   */
  function continuarSinConexion(textoLimpio) {
    onEnunciadoListo({
      id_transcripcion: null,
      texto_transcripcion: textoLimpio,
      pendienteDeSincronizar: true,
    });
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError(null);

    const textoLimpio = texto.trim();

    if (textoLimpio.length === 0) {
      setError('Escribe una frase antes de continuar.');
      return;
    }

    if (textoLimpio.length > LONGITUD_MAXIMA) {
      setError(`La frase es muy larga. El máximo es ${LONGITUD_MAXIMA} letras.`);
      return;
    }

    if (!navigator.onLine) {
      continuarSinConexion(textoLimpio);
      return;
    }

    setCargando(true);
    try {
      const creado = await crear({
        id_metadatos: idMetadatos,
        texto_transcripcion: textoLimpio,
      });

      await eliminarBorrador(idMetadatos);
      onEnunciadoListo(creado);
    } catch (err) {
      // Un fallo de red llega sin código de error del sistema. En ese
      // caso se continúa en modo local en lugar de bloquear al
      // hablante; un rechazo legítimo del servidor sí se muestra.
      if (!err.codigo) {
        continuarSinConexion(textoLimpio);
      } else {
        setError(err.message);
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.cabecera}>
        <Icono nombre="escribir" tamano={96} />
        <h1 style={estilos.titulo}>Escribe una frase</h1>
      </div>

      <p style={estilos.subtitulo}>
        Escribe en tu lengua la frase que vas a decir en voz alta.
      </p>

      {borradorRecuperado && (
        <div style={{ marginBottom: 16 }}>
          <AvisoConIcono icono="borrador-recuperado" color="#854D0E" fondo="#FEF9C3">
            Aquí está lo que habías empezado a escribir.
          </AvisoConIcono>
        </div>
      )}

      {error && <div style={estilos.error}>{error}</div>}

      <form onSubmit={manejarEnvio} style={estilos.formulario}>
        <textarea
          value={texto}
          onChange={manejarCambioTexto}
          rows={5}
          maxLength={LONGITUD_MAXIMA}
          placeholder="Escribe aquí…"
          style={estilos.textarea}
        />

        <div style={estilos.contador}>
          {texto.length} / {LONGITUD_MAXIMA}
        </div>

        <button type="submit" disabled={cargando} style={estilos.boton}>
          {cargando ? 'Guardando…' : 'Continuar'}
        </button>
      </form>
    </div>
  );
}

const estilos = {
  contenedor: { maxWidth: 420, margin: '32px auto', padding: 24, fontFamily: 'sans-serif' },
  cabecera: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 8 },
  titulo: { fontSize: 26, margin: 0 },
  subtitulo: { color: '#4B5563', marginBottom: 20, textAlign: 'center', fontSize: 16 },
  formulario: { display: 'flex', flexDirection: 'column', gap: 8 },
  textarea: {
    padding: 14,
    fontSize: 20,
    lineHeight: 1.4,
    borderRadius: 8,
    border: '2px solid #D1D5DB',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  contador: { textAlign: 'right', fontSize: 13, color: '#9CA3AF' },
  boton: {
    minHeight: 60,
    padding: 14,
    fontSize: 18,
    fontWeight: 600,
    borderRadius: 10,
    border: 'none',
    background: '#2563EB',
    color: '#fff',
    cursor: 'pointer',
    marginTop: 8,
    fontFamily: 'inherit',
  },
  error: { background: '#FEE2E2', color: '#991B1B', padding: 12, borderRadius: 8, marginBottom: 16 },
};
