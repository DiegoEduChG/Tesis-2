// frontend/src/pages/ValidarGrabaciones.jsx
//
// Implementa el flujo de validación por pares: presenta al hablante una
// grabación de otro miembro de su comunidad lingüística junto con su
// transcripción, y registra su evaluación.
//
// El flujo es cíclico: tras cada voto se solicita automáticamente la
// siguiente grabación disponible, de modo que el validador puede
// encadenar evaluaciones sin volver a un menú.

import { useCallback, useEffect, useState } from 'react';
import { obtenerPendiente, emitirVoto } from '../services/validacionService';
import Icono, { BotonGrande, AvisoConIcono } from '../components/Icono';

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
      setGrabacion(await obtenerPendiente(idMetadatos));
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
        <AvisoConIcono icono="pendiente">Buscando grabaciones…</AvisoConIcono>
      </div>
    );
  }

  // Un fallo al consultar el servidor no debe presentarse como "no hay
  // nada que validar": son situaciones distintas y confundirlas oculta
  // problemas reales de conexión o de configuración.
  if (error && !grabacion) {
    return (
      <div style={estilos.contenedor}>
        <AvisoConIcono icono="sin-conexion" color="#991B1B" fondo="#FEE2E2">
          {error}
        </AvisoConIcono>
        <div style={{ marginTop: 16 }}>
          <BotonGrande icono="volver-a-grabar" etiqueta="Intentar de nuevo" onClick={cargarSiguiente} />
        </div>
        <button onClick={onSalir} style={estilos.botonSalir}>
          Volver al inicio
        </button>
      </div>
    );
  }

  if (!grabacion) {
    return (
      <div style={estilos.contenedor}>
        <div style={estilos.centrado}>
          <Icono nombre="sin-pendientes" tamano={140} />
        </div>
        <h1 style={estilos.titulo}>No hay grabaciones por validar</h1>
        <p style={estilos.subtitulo}>
          Ya escuchaste todas las grabaciones de tu comunidad. Vuelve más tarde.
        </p>
        {totalEvaluadas > 0 && (
          <p style={estilos.contador}>
            Escuchaste {totalEvaluadas} grabación{totalEvaluadas === 1 ? '' : 'es'}.
          </p>
        )}
        <button onClick={onSalir} style={estilos.botonSalir}>
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>Escucha y decide</h1>

      {ultimoResultado && (
        <div style={estilos.exito}>
          <Icono
            nombre={ultimoResultado.estado === 'rechazada' ? 'desaprobar' : 'aprobar'}
            tamano={32}
          />
          <span>
            {ultimoResultado.estado === 'validada' && 'La grabación anterior quedó aceptada.'}
            {ultimoResultado.estado === 'rechazada' && 'La grabación anterior quedó descartada.'}
            {ultimoResultado.estado === 'pendiente' && 'Tu voto quedó registrado.'}
          </span>
        </div>
      )}

      {error && <div style={estilos.error}>{error}</div>}

      <div style={estilos.tarjeta}>
        <div style={estilos.filaEscuchar}>
          <Icono nombre="escuchar" tamano={36} />
          <span style={estilos.instruccion}>Escucha</span>
        </div>
        <audio src={grabacion.url_audio} controls style={{ width: '100%', marginBottom: 16 }} />

        <div style={estilos.separador} />

        <p style={estilos.etiquetaTexto}>Dice:</p>
        <p style={estilos.enunciado}>{grabacion.texto_transcripcion}</p>
      </div>

      <p style={estilos.pregunta}>¿La voz dice lo mismo que el texto y se entiende bien?</p>

      <div style={estilos.acciones}>
        <BotonGrande
          icono="aprobar"
          etiqueta="Sí, está bien"
          onClick={() => votar(true)}
          disabled={enviandoVoto}
          color="#16A34A"
        />
        <BotonGrande
          icono="desaprobar"
          etiqueta="No está bien"
          onClick={() => votar(false)}
          disabled={enviandoVoto}
          color="#DC2626"
        />
        <BotonGrande
          icono="omitir"
          etiqueta="No estoy seguro"
          descripcion="Pasar a la siguiente"
          onClick={omitir}
          disabled={enviandoVoto}
          color="#6B7280"
          variante="contorno"
        />
      </div>

      <p style={estilos.contador}>
        Escuchaste {totalEvaluadas}
        {grabacion.restantes != null && ` · Faltan ${grabacion.restantes}`}
      </p>

      <button onClick={onSalir} style={estilos.botonSalir}>
        Volver al inicio
      </button>
    </div>
  );
}

const estilos = {
  contenedor: { maxWidth: 420, margin: '32px auto', padding: 24, fontFamily: 'sans-serif' },
  centrado: { display: 'flex', justifyContent: 'center', marginBottom: 16 },
  titulo: { fontSize: 24, marginBottom: 8, textAlign: 'center' },
  subtitulo: { color: '#4B5563', marginBottom: 20, textAlign: 'center' },
  tarjeta: { background: '#F9FAFB', padding: 20, borderRadius: 10, marginBottom: 20 },
  filaEscuchar: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  instruccion: { fontSize: 17, color: '#374151' },
  separador: { height: 1, background: '#E5E7EB', margin: '16px 0' },
  etiquetaTexto: { fontSize: 14, color: '#6B7280', marginBottom: 6 },
  enunciado: { fontSize: 21, lineHeight: 1.4, margin: 0 },
  pregunta: { fontSize: 17, textAlign: 'center', marginBottom: 16, color: '#374151' },
  acciones: { display: 'flex', flexDirection: 'column', gap: 12 },
  contador: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 20 },
  botonSalir: {
    width: '100%',
    padding: 12,
    fontSize: 15,
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: '#2563EB',
    cursor: 'pointer',
    marginTop: 8,
    fontFamily: 'inherit',
  },
  exito: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#DCFCE7',
    color: '#166534',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 15,
  },
  error: { background: '#FEE2E2', color: '#991B1B', padding: 12, borderRadius: 8, marginBottom: 16 },
};
