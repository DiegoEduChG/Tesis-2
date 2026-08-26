// frontend/src/hooks/useGrabadorAudio.js
//
// Orquesta el ciclo de vida de una grabación: pedir permiso al
// micrófono, capturar el audio con MediaRecorder, y convertirlo a WAV
// al detener. Corresponde a la "UI de Grabación" del DDS (2.2.1.1),
// separando la lógica de captura de la presentación visual.
//
// Estados posibles:
//   inactivo    → listo para iniciar una grabación
//   grabando    → capturando audio del micrófono
//   procesando  → convirtiendo el audio capturado a WAV
//   listo       → hay un WAV disponible para escuchar o guardar

import { useRef, useState } from 'react';
import { convertirBlobAWav } from '../utils/wavEncoder';

export function useGrabadorAudio() {
  const [estado, setEstado] = useState('inactivo');
  const [audioUrl, setAudioUrl] = useState(null);
  const [wavBlob, setWavBlob] = useState(null);
  const [duracionSegundos, setDuracionSegundos] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const fragmentosRef = useRef([]);
  const streamRef = useRef(null);

  async function iniciarGrabacion() {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      fragmentosRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (evento) => {
        if (evento.data.size > 0) {
          fragmentosRef.current.push(evento.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setEstado('procesando');

        const blobOriginal = new Blob(fragmentosRef.current, {
          type: mediaRecorder.mimeType,
        });

        try {
          const { blob, duracionSegundos: duracion } = await convertirBlobAWav(blobOriginal);
          setWavBlob(blob);
          setDuracionSegundos(duracion);
          setAudioUrl(URL.createObjectURL(blob));
          setEstado('listo');
        } catch (err) {
          console.error('Error al convertir el audio a WAV:', err);
          setError('No se pudo procesar el audio grabado. Intenta nuevamente.');
          setEstado('inactivo');
        }

        // Libera el micrófono en cuanto se deja de necesitar.
        streamRef.current?.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setEstado('grabando');
    } catch (err) {
      console.error('Error al acceder al micrófono:', err);
      setError('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
    }
  }

  function detenerGrabacion() {
    mediaRecorderRef.current?.stop();
  }

  // Descarta la grabación actual y vuelve al estado inicial, sin
  // liberar aún ningún recurso de red (nada se subió todavía).
  function volverAGrabar() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setWavBlob(null);
    setDuracionSegundos(null);
    setEstado('inactivo');
  }

  return {
    estado,
    audioUrl,
    wavBlob,
    duracionSegundos,
    error,
    iniciarGrabacion,
    detenerGrabacion,
    volverAGrabar,
  };
}
