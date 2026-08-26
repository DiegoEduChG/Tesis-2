// frontend/src/pages/GrabarVoz.jsx
//
// Implementa el flujo 3.2.3 del DDS ("Grabación de Audio"), incluido su
// flujo alternativo "Grabación en modo offline": si al guardar no hay
// conexión, la contribución se conserva en IndexedDB y se marca como
// pendiente de sincronización.

import { useState } from 'react';
import { useGrabadorAudio } from '../hooks/useGrabadorAudio';
import { subir } from '../services/grabacionesService';
import {
  guardarContribucionPendiente,
  eliminarBorrador,
} from '../services/almacenamientoLocal';

export default function GrabarVoz({
  idMetadatos,
  transcripcion,
  onGrabacionLista,
  onGuardadaLocalmente,
}) {
  const {
    estado,
    audioUrl,
    wavBlob,
    duracionSegundos,
    error: errorGrabador,
    iniciarGrabacion,
    detenerGrabacion,
    volverAGrabar,
  } = useGrabadorAudio();

  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState(null);

  async function guardarLocalmente() {
    await guardarContribucionPendiente({
      idMetadatos,
      texto: transcripcion.texto_transcripcion,
      wavBlob,
    });

    // La contribución completa ya está a salvo en IndexedDB: el
    // borrador del enunciado, que se conservaba por si el hablante
    // abandonaba antes de grabar, deja de ser necesario.
    await eliminarBorrador(idMetadatos);

    onGuardadaLocalmente({
      texto_transcripcion: transcripcion.texto_transcripcion,
      duracionSegundos,
    });
  }

  async function manejarGuardar() {
    setErrorSubida(null);
    setSubiendo(true);

    try {
      // Se guarda localmente en dos situaciones:
      //   - No hay conexión.
      //   - El enunciado nunca llegó al servidor (se redactó sin
      //     conexión), por lo que no existe un id_transcripcion al que
      //     asociar la grabación. En ese caso la contribución completa
      //     debe crearse a través del endpoint de sincronización,
      //     aunque en este momento sí haya red.
      if (!navigator.onLine || !transcripcion.id_transcripcion) {
        await guardarLocalmente();
        return;
      }

      const resultado = await subir({
        idMetadatos,
        idTranscripcion: transcripcion.id_transcripcion,
        wavBlob,
      });
      onGrabacionLista(resultado);
    } catch (err) {
      // Un fallo de red (servidor caído, wifi que se corta a mitad del
      // envío) llega aquí como TypeError sin código de error del
      // sistema. En ese caso también se conserva la contribución en
      // lugar de perderla.
      const esFalloDeRed = !err.codigo;

      if (esFalloDeRed) {
        try {
          await guardarLocalmente();
          return;
        } catch {
          setErrorSubida('No se pudo guardar la grabación ni enviarla al servidor.');
        }
      } else {
        const detalle = err.detalles?.[0]?.problema;
        setErrorSubida(detalle ? `${err.message} ${detalle}` : err.message);
      }
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>Graba tu voz</h1>
      <p style={estilos.instruccion}>Lee en voz alta el siguiente enunciado:</p>
      <div style={estilos.enunciado}>"{transcripcion.texto_transcripcion}"</div>

      {(errorGrabador || errorSubida) && (
        <div style={estilos.error}>{errorGrabador || errorSubida}</div>
      )}

      {estado === 'inactivo' && (
        <button onClick={iniciarGrabacion} style={estilos.boton}>
          🎙️ Grabar
        </button>
      )}

      {estado === 'grabando' && (
        <>
          <p style={estilos.grabando}>● Grabando…</p>
          <button onClick={detenerGrabacion} style={estilos.botonDetener}>
            ⏹️ Detener
          </button>
        </>
      )}

      {estado === 'procesando' && (
        <p style={estilos.aviso}>Convirtiendo el audio al formato del corpus…</p>
      )}

      {estado === 'listo' && (
        <div style={estilos.formulario}>
          <p style={estilos.instruccion}>Escucha tu grabación antes de guardarla:</p>
          <audio src={audioUrl} controls style={{ width: '100%' }} />

          {duracionSegundos != null && (
            <p style={estilos.duracion}>
              Duración: {duracionSegundos.toFixed(1)} s · WAV 16 kHz mono
            </p>
          )}

          <div style={estilos.filaBotones}>
            <button onClick={manejarGuardar} disabled={subiendo} style={estilos.boton}>
              {subiendo ? 'Guardando…' : 'Guardar'}
            </button>
            <button onClick={volverAGrabar} disabled={subiendo} style={estilos.botonSecundario}>
              Volver a grabar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const estilos = {
  contenedor: { maxWidth: 420, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' },
  titulo: { fontSize: 24, marginBottom: 4 },
  instruccion: { color: '#555', marginBottom: 8 },
  enunciado: { background: '#f3f4f6', padding: 16, borderRadius: 6, fontStyle: 'italic', fontSize: 18, marginBottom: 24 },
  formulario: { display: 'flex', flexDirection: 'column', gap: 12 },
  boton: { padding: 12, fontSize: 16, borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' },
  botonDetener: { padding: 12, fontSize: 16, borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', width: '100%' },
  botonSecundario: { padding: 12, fontSize: 16, borderRadius: 6, border: '1px solid #2563eb', background: '#fff', color: '#2563eb', cursor: 'pointer' },
  filaBotones: { display: 'flex', gap: 12 },
  grabando: { color: '#dc2626', fontWeight: 'bold' },
  duracion: { fontSize: 13, color: '#666' },
  aviso: { color: '#555' },
  error: { background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 6, marginBottom: 16 },
};
