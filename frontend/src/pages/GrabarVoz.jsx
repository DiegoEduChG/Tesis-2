// frontend/src/pages/GrabarVoz.jsx
//
// Implementa el flujo 3.2.3 del DDS ("Grabación de Audio"): presenta el
// enunciado, captura la voz del hablante, permite autoevaluarla
// (Escuchar / Guardar / Volver a grabar) y la envía al backend.
//
// La opción de volver a grabar constituye el primer filtro de calidad
// del corpus, ejercido por el propio contribuyente antes de que la
// grabación llegue a la validación comunitaria.

import { useState } from 'react';
import { useGrabadorAudio } from '../hooks/useGrabadorAudio';
import { subir } from '../services/grabacionesService';

export default function GrabarVoz({ idMetadatos, transcripcion, onGrabacionLista }) {
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

  async function manejarGuardar() {
    setErrorSubida(null);
    setSubiendo(true);

    try {
      const resultado = await subir({
        idMetadatos,
        idTranscripcion: transcripcion.id_transcripcion,
        wavBlob,
      });
      onGrabacionLista(resultado);
    } catch (err) {
      // El backend detalla el motivo exacto cuando rechaza el formato
      // (por ejemplo, frecuencia de muestreo incorrecta). Mostrarlo
      // ayuda a diagnosticar problemas de compatibilidad entre
      // navegadores durante las pruebas del OE2.
      const detalle = err.detalles?.[0]?.problema;
      setErrorSubida(detalle ? `${err.message} ${detalle}` : err.message);
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
