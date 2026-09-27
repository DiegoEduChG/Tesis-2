// frontend/src/pages/GrabarVoz.jsx
//
// Implementa el flujo de grabación de audio, incluido su flujo
// alternativo sin conexión: si al guardar no hay conectividad, la
// contribución se conserva en el dispositivo y se marca como pendiente
// de sincronización.

import { useState } from 'react';
import { useGrabadorAudio } from '../hooks/useGrabadorAudio';
import { subir } from '../services/grabacionesService';
import { guardarContribucionPendiente, eliminarBorrador } from '../services/almacenamientoLocal';
import Icono, { BotonGrande, AvisoConIcono } from '../components/Icono';

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
      // Se guarda localmente en dos situaciones: cuando no hay
      // conexión, y cuando el enunciado nunca llegó al servidor porque
      // se redactó sin conexión, de modo que no existe un identificador
      // al que asociar la grabación.
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
      const esFalloDeRed = !err.codigo;

      if (esFalloDeRed) {
        try {
          await guardarLocalmente();
          return;
        } catch {
          setErrorSubida('No se pudo guardar la grabación ni enviarla.');
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

      {/* El enunciado se presenta en tamaño grande porque el hablante
          debe leerlo en voz alta mientras graba. */}
      <div style={estilos.enunciado}>{transcripcion.texto_transcripcion}</div>

      {(errorGrabador || errorSubida) && (
        <div style={estilos.error}>{errorGrabador || errorSubida}</div>
      )}

      {estado === 'inactivo' && (
        <>
          <p style={estilos.instruccion}>Lee la frase en voz alta</p>
          <BotonGrande
            icono="grabar"
            etiqueta="Grabar"
            onClick={iniciarGrabacion}
            color="#DC2626"
          />
        </>
      )}

      {estado === 'grabando' && (
        <>
          <div style={estilos.grabandoAviso}>
            <span style={estilos.puntoRojo} />
            Grabando…
          </div>
          <BotonGrande
            icono="detener"
            etiqueta="Detener"
            onClick={detenerGrabacion}
            color="#DC2626"
            variante="contorno"
          />
        </>
      )}

      {estado === 'procesando' && (
        <AvisoConIcono icono="pendiente">Preparando tu grabación…</AvisoConIcono>
      )}

      {estado === 'listo' && (
        <>
          <div style={estilos.reproductor}>
            <div style={estilos.filaEscuchar}>
              <Icono nombre="escuchar" tamano={40} />
              <span style={estilos.instruccion}>Escucha antes de guardar</span>
            </div>
            <audio src={audioUrl} controls style={{ width: '100%' }} />
            {duracionSegundos != null && (
              <p style={estilos.duracion}>{duracionSegundos.toFixed(1)} segundos</p>
            )}
          </div>

          <div style={estilos.acciones}>
            <BotonGrande
              icono="guardar"
              etiqueta="Guardar"
              onClick={manejarGuardar}
              disabled={subiendo}
              color="#16A34A"
            />
            <BotonGrande
              icono="volver-a-grabar"
              etiqueta="Grabar otra vez"
              onClick={volverAGrabar}
              disabled={subiendo}
              color="#F59E0B"
              variante="contorno"
            />
          </div>
        </>
      )}
    </div>
  );
}

const estilos = {
  contenedor: { maxWidth: 420, margin: '32px auto', padding: 24, fontFamily: 'sans-serif' },
  titulo: { fontSize: 24, marginBottom: 16 },
  enunciado: {
    background: '#F3F4F6',
    padding: 20,
    borderRadius: 10,
    fontSize: 22,
    lineHeight: 1.4,
    marginBottom: 20,
    textAlign: 'center',
  },
  instruccion: { color: '#4B5563', fontSize: 16, marginBottom: 12 },
  reproductor: { background: '#F9FAFB', padding: 16, borderRadius: 10, marginBottom: 16 },
  filaEscuchar: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  duracion: { fontSize: 14, color: '#6B7280', marginTop: 8, marginBottom: 0 },
  acciones: { display: 'flex', flexDirection: 'column', gap: 12 },
  grabandoAviso: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 16,
  },
  puntoRojo: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: '#DC2626',
    display: 'inline-block',
  },
  error: { background: '#FEE2E2', color: '#991B1B', padding: 12, borderRadius: 8, marginBottom: 16 },
};
