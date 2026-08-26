// frontend/src/pages/RedactarEnunciado.jsx
//
// Implementa el flujo 3.2.2 del DDS ("Transcripción de Audio"):
//   1. Se presenta un campo de texto.
//   2. Mientras el hablante escribe, se autoguarda en IndexedDB.
//   3. Al presionar "Continuar", se envía al backend y se pasa a la
//      interfaz de grabación con el id_transcripcion obtenido.
//
// Comportamiento sin conexión:
// el enunciado NO se envía al servidor. Se conserva en memoria y viaja
// junto con el audio cuando se sincroniza la contribución completa, tal
// como espera el endpoint de sincronización del DDS (§3.4.4.7), que
// recibe texto y audio en una sola petición y crea ambos registros.
// Intentar persistir el enunciado por separado sin conexión dejaría al
// hablante bloqueado en esta pantalla.

import { useEffect, useRef, useState } from 'react';
import { crear } from '../services/transcripcionesService';
import {
  guardarBorrador,
  obtenerBorrador,
  eliminarBorrador,
} from '../services/almacenamientoLocal';

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

  // Autoguardado con debounce: espera a que el hablante deje de
  // escribir antes de persistir, en vez de guardar en cada tecla.
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
   * resultante no tiene id_transcripcion: esa es la señal de que la
   * contribución deberá guardarse completa en el almacenamiento local
   * y crearse en el servidor durante la sincronización.
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
      setError('El enunciado no puede estar vacío.');
      return;
    }

    if (textoLimpio.length > LONGITUD_MAXIMA) {
      setError(`El enunciado no puede superar los ${LONGITUD_MAXIMA} caracteres.`);
      return;
    }

    // Sin conexión conocida: ni se intenta la petición.
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

      // El enunciado ya vive en el servidor: el borrador local deja de
      // ser necesario.
      await eliminarBorrador(idMetadatos);

      onEnunciadoListo(creado);
    } catch (err) {
      // Un fallo de red llega sin código de error del sistema. En ese
      // caso se continúa en modo local en lugar de bloquear al
      // hablante; un rechazo legítimo del servidor (enunciado vacío,
      // hablante inexistente) sí se muestra como error.
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
      <h1 style={estilos.titulo}>Redacta tu enunciado</h1>
      <p style={estilos.subtitulo}>
        Escribe en tu lengua originaria la frase que luego vas a leer en voz alta.
      </p>

      {borradorRecuperado && (
        <div style={estilos.aviso}>
          Recuperamos un borrador que habías dejado a medias.
        </div>
      )}

      {error && <div style={estilos.error}>{error}</div>}

      <form onSubmit={manejarEnvio} style={estilos.formulario}>
        <textarea
          value={texto}
          onChange={manejarCambioTexto}
          rows={5}
          maxLength={LONGITUD_MAXIMA}
          placeholder="Escribe aquí tu enunciado…"
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
  contenedor: { maxWidth: 420, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' },
  titulo: { fontSize: 24, marginBottom: 4 },
  subtitulo: { color: '#555', marginBottom: 24 },
  formulario: { display: 'flex', flexDirection: 'column', gap: 8 },
  textarea: { padding: 10, fontSize: 16, borderRadius: 6, border: '1px solid #ccc', resize: 'vertical' },
  contador: { textAlign: 'right', fontSize: 13, color: '#888' },
  boton: { padding: 12, fontSize: 16, borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', marginTop: 8 },
  aviso: { background: '#fef9c3', color: '#854d0e', padding: 12, borderRadius: 6, marginBottom: 16 },
  error: { background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 6, marginBottom: 16 },
};
