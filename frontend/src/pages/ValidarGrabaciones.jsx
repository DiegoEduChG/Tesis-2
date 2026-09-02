// frontend/src/pages/ValidarGrabaciones.jsx
//
// Implementa el flujo 3.2.4 del DDS ("Validación por Pares"): presenta
// al hablante una grabación de otro miembro de la comunidad junto con
// su transcripción, y registra su evaluación.
//
// El flujo es cíclico: tras cada voto se solicita automáticamente la
// siguiente grabación disponible, de modo que el validador puede
// encadenar evaluaciones sin volver a un menú.

import { useCallback, useEffect, useState } from 'react';
import { obtenerPendiente, emitirVoto } from '../services/validacionService';

export default function ValidarGrabaciones({ idMetadatos, onSalir }) {
  const [grabacion, setGrabacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [enviandoVoto, setEnviandoVoto] = useState(false);
  const [error, setError] = useState(null);
  const [ultimoResultado, setUltimoResultado] = useState(null);
  const [totalEvaluadas, setTotalEvaluadas] = useState(0);

  const cargarSiguiente = useCallback(async () => {
    setCargando(true);
    setError(null);

    try {
      const siguiente = await obtenerPendiente(idMetadatos);
      setGrabacion(siguiente);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [idMetadatos]);

  useEffect(() => {
    cargarSiguiente();
  }, [cargarSiguiente]);

  async function votar(esValido) {
    setEnviandoVoto(true);
    setError(null);

    try {
      const resultado = await emitirVoto({
        idGrabacion: grabacion.id_grabacion,
        idMetadatos,
        esValido,
      });

      setTotalEvaluadas((n) => n + 1);
      setUltimoResultado(resultado);
      await cargarSiguiente();
    } catch (err) {
      // Si otro validador completó el umbral mientras esta persona
      // escuchaba, o si el voto ya estaba registrado, no es un fallo:
      // simplemente se pasa a la siguiente grabación.
      if (err.codigo === 'GRABACION_NO_PENDIENTE' || err.codigo === 'VOTO_DUPLICADO') {
        await cargarSiguiente();
      } else {
        setError(err.message);
      }
    } finally {
      setEnviandoVoto(false);
    }
  }

  // Omitir no registra voto alguno: la grabación seguirá disponible
  // para este mismo validador en una sesión posterior.
  async function omitir() {
    setUltimoResultado(null);
    await cargarSiguiente();
  }

  if (cargando) {
    return (
      <div style={estilos.contenedor}>
        <p style={estilos.aviso}>Buscando grabaciones por validar…</p>
      </div>
    );
  }

  if (!grabacion) {
    return (
      <div style={estilos.contenedor}>
        <h1 style={estilos.titulo}>No hay grabaciones por validar</h1>
        <p style={estilos.subtitulo}>
          Ya evaluaste todas las contribuciones disponibles de la comunidad.
          Vuelve más tarde, cuando otros hablantes hayan aportado nuevas
          grabaciones.
        </p>
        {totalEvaluadas > 0 && (
          <p style={estilos.contador}>
            Evaluaste {totalEvaluadas} grabación{totalEvaluadas === 1 ? '' : 'es'} en esta sesión.
          </p>
        )}
        <button onClick={onSalir} style={estilos.botonSecundario}>
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>Valida esta grabación</h1>
      <p style={estilos.subtitulo}>
        Escucha el audio y confirma si corresponde al texto y se entiende con claridad.
      </p>

      {error && <div style={estilos.error}>{error}</div>}

      {ultimoResultado && (
        <div style={estilos.exito}>
          Voto registrado.{' '}
          {ultimoResultado.estado === 'validada' && 'La grabación anterior quedó validada.'}
          {ultimoResultado.estado === 'rechazada' && 'La grabación anterior quedó rechazada.'}
          {ultimoResultado.estado === 'pendiente' &&
            `La grabación anterior lleva ${ultimoResultado.votos_positivos} a favor y ${ultimoResultado.votos_negativos} en contra.`}
        </div>
      )}

      <div style={estilos.tarjeta}>
        <p style={estilos.enunciado}>"{grabacion.texto_transcripcion}"</p>
        <audio src={grabacion.url_audio} controls style={{ width: '100%' }} />
        <p style={estilos.metadato}>
          {grabacion.votos_positivos} a favor · {grabacion.votos_negativos} en contra
          {grabacion.duracion_segundos != null &&
            ` · ${Number(grabacion.duracion_segundos).toFixed(1)} s`}
        </p>
      </div>

      <div style={estilos.filaBotones}>
        <button onClick={() => votar(true)} disabled={enviandoVoto} style={estilos.botonAprobar}>
          👍 Aprobada
        </button>
        <button onClick={() => votar(false)} disabled={enviandoVoto} style={estilos.botonDesaprobar}>
          👎 Desaprobada
        </button>
      </div>

      <button onClick={omitir} disabled={enviandoVoto} style={estilos.botonOmitir}>
        Omitir esta grabación
      </button>

      <p style={estilos.contador}>
        Evaluadas en esta sesión: {totalEvaluadas}
        {grabacion.restantes != null && ` · Disponibles: ${grabacion.restantes}`}
      </p>

      <button onClick={onSalir} style={estilos.botonSecundario}>
        Volver al inicio
      </button>
    </div>
  );
}

const estilos = {
  contenedor: { maxWidth: 420, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' },
  titulo: { fontSize: 24, marginBottom: 4 },
  subtitulo: { color: '#555', marginBottom: 20 },
  tarjeta: { background: '#f3f4f6', padding: 16, borderRadius: 6, marginBottom: 16 },
  enunciado: { fontStyle: 'italic', fontSize: 18, marginTop: 0 },
  metadato: { fontSize: 13, color: '#666', marginBottom: 0, marginTop: 12 },
  filaBotones: { display: 'flex', gap: 12, marginBottom: 12 },
  botonAprobar: { flex: 1, padding: 14, fontSize: 16, borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer' },
  botonDesaprobar: { flex: 1, padding: 14, fontSize: 16, borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer' },
  botonOmitir: { width: '100%', padding: 10, fontSize: 15, borderRadius: 6, border: '1px solid #ccc', background: '#fff', color: '#444', cursor: 'pointer' },
  botonSecundario: { width: '100%', padding: 10, fontSize: 15, borderRadius: 6, border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer', marginTop: 16 },
  contador: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 16 },
  aviso: { color: '#555' },
  exito: { background: '#dcfce7', color: '#166534', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14 },
  error: { background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 6, marginBottom: 16 },
};
