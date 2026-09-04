// frontend/src/pages/admin/AdminPanel.jsx
//
// Panel de gestión del corpus (DDS §3.2.6). Agrupa las cuatro
// funciones administrativas: validación manual, eliminación,
// exportación y edición de metadatos de los hablantes.
//
// El panel de métricas responde a una necesidad de la prueba piloto:
// permite consultar en cualquier momento cuántos minutos de audio
// validado lleva acumulados el corpus y cuántos hablantes han
// aportado, que son los dos valores del indicador del resultado R4.1.

import { useCallback, useEffect, useState } from 'react';
import {
  obtenerMetricas,
  listarGrabaciones,
  cambiarEstado,
  eliminarGrabacion,
  listarHablantes,
  editarHablante,
  exportarCorpus,
  cerrarSesion as limpiarToken,
} from '../../services/adminService';
import { RANGOS_EDAD, GENEROS, LENGUAS } from '../../config/catalogos';

const SECCION = { GRABACIONES: 'GRABACIONES', HABLANTES: 'HABLANTES' };

export default function AdminPanel({ usuario, onCerrarSesion }) {
  const [seccion, setSeccion] = useState(SECCION.GRABACIONES);
  const [metricas, setMetricas] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroLenguaGrab, setFiltroLenguaGrab] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [filtroLenguaHab, setFiltroLenguaHab] = useState('');
  const [filtroRangoEdad, setFiltroRangoEdad] = useState('');
  const [filtroGenero, setFiltroGenero] = useState('');

  const [totalHablantes, setTotalHablantes] = useState(0);
  const [grabaciones, setGrabaciones] = useState([]);
  const [hablantes, setHablantes] = useState([]);
  const [editando, setEditando] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Una sesión expirada produce el mismo código en cualquier endpoint;
  // se centraliza aquí para devolver al inicio de sesión en lugar de
  // dejar al administrador ante errores sucesivos.
  const manejarError = useCallback(
    (err) => {
      if (err.codigo === 'SESION_NO_VALIDA') {
        limpiarToken();
        onCerrarSesion();
        return;
      }
      setError(err.message);
    },
    [onCerrarSesion]
  );

  const refrescar = useCallback(async () => {
    setCargando(true);
    setError(null);

    try {
      setMetricas(await obtenerMetricas());

      if (seccion === SECCION.GRABACIONES) {
        const datos = await listarGrabaciones({
          estado: filtroEstado || undefined,
          lengua: filtroLenguaGrab || undefined,
        });
        setGrabaciones(datos.grabaciones);
      } else {
        const datos = await listarHablantes({
          busqueda: busquedaAplicada || undefined,
          lengua: filtroLenguaHab || undefined,
          rangoEdad: filtroRangoEdad || undefined,
          genero: filtroGenero || undefined,
        });
        setHablantes(datos.hablantes);
        setTotalHablantes(datos.total);
      }
    } catch (err) {
      manejarError(err);
    } finally {
      setCargando(false);
    }
  }, [
    seccion,
    filtroEstado,
    filtroLenguaGrab,
    busquedaAplicada,
    filtroLenguaHab,
    filtroRangoEdad,
    filtroGenero,
    manejarError,
  ]);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  async function accionEstado(idGrabacion, estado) {
    try {
      await cambiarEstado(idGrabacion, estado);
      setAviso(`Grabación ${idGrabacion} marcada como ${estado}.`);
      await refrescar();
    } catch (err) {
      manejarError(err);
    }
  }

  async function accionEliminar(idGrabacion) {
    if (!window.confirm(`¿Eliminar permanentemente la grabación ${idGrabacion}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await eliminarGrabacion(idGrabacion);
      setAviso(`Grabación ${idGrabacion} eliminada.`);
      await refrescar();
    } catch (err) {
      manejarError(err);
    }
  }

  /**
   * Exporta el corpus validado. Si hay un filtro de lengua activo en la
   * sección de grabaciones, la exportación se restringe a esa lengua y
   * los audios quedan en un directorio plano. Sin filtro, se exporta
   * todo el corpus con los audios agrupados por lengua.
   */
  async function accionExportar() {
    setError(null);
    try {
      const nombre = await exportarCorpus(filtroLenguaGrab || undefined);
      setAviso(
        filtroLenguaGrab
          ? `Corpus de ${filtroLenguaGrab} exportado: ${nombre}`
          : `Corpus completo exportado (agrupado por lengua): ${nombre}`
      );
      await refrescar();
    } catch (err) {
      manejarError(err);
    }
  }

  function limpiarFiltrosHablantes() {
    setBusqueda('');
    setBusquedaAplicada('');
    setFiltroLenguaHab('');
    setFiltroRangoEdad('');
    setFiltroGenero('');
  }

  async function guardarHablante(evento) {
    evento.preventDefault();
    try {
      await editarHablante(editando.id_metadatos, {
        dni: editando.dni,
        rango_edad: editando.rango_edad,
        genero: editando.genero,
        lengua: editando.lengua,
      });
      setAviso('Datos del hablante actualizados.');
      setEditando(null);
      await refrescar();
    } catch (err) {
      manejarError(err);
    }
  }

  return (
    <div style={estilos.contenedor}>
      <header style={estilos.cabecera}>
        <h1 style={estilos.titulo}>Administración del corpus</h1>
        <div>
          <span style={estilos.usuario}>{usuario}</span>
          <button onClick={onCerrarSesion} style={estilos.botonSalir}>
            Cerrar sesión
          </button>
        </div>
      </header>

      {metricas && (
        <div style={estilos.metricas}>
          <Metrica valor={metricas.minutos_validados} etiqueta="minutos validados" destacado />
          <Metrica valor={metricas.hablantes_con_audio_validado} etiqueta="hablantes" destacado />
          <Metrica valor={metricas.validadas} etiqueta="validadas" />
          <Metrica valor={metricas.pendientes} etiqueta="pendientes" />
          <Metrica valor={metricas.rechazadas} etiqueta="rechazadas" />
        </div>
      )}

      {error && <div style={estilos.error}>{error}</div>}
      {aviso && <div style={estilos.aviso}>{aviso}</div>}

      <nav style={estilos.pestanas}>
        <button
          onClick={() => setSeccion(SECCION.GRABACIONES)}
          style={seccion === SECCION.GRABACIONES ? estilos.pestanaActiva : estilos.pestana}
        >
          Grabaciones
        </button>
        <button
          onClick={() => setSeccion(SECCION.HABLANTES)}
          style={seccion === SECCION.HABLANTES ? estilos.pestanaActiva : estilos.pestana}
        >
          Hablantes
        </button>
        <button onClick={accionExportar} style={estilos.botonExportar}>
          ⬇ Exportar {filtroLenguaGrab ? filtroLenguaGrab : 'todo el corpus'}
        </button>
      </nav>

      {cargando && <p style={estilos.cargando}>Cargando…</p>}

      {seccion === SECCION.GRABACIONES && (
        <>
          <div style={estilos.filtros}>
            <label style={estilos.etiquetaFiltro}>Estado:</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              style={estilos.select}
            >
              <option value="">Todas</option>
              <option value="pendiente">Pendientes</option>
              <option value="validada">Validadas</option>
              <option value="rechazada">Rechazadas</option>
            </select>

            <label style={estilos.etiquetaFiltro}>Lengua:</label>
            <select
              value={filtroLenguaGrab}
              onChange={(e) => setFiltroLenguaGrab(e.target.value)}
              style={estilos.select}
            >
              <option value="">Todas</option>
              {LENGUAS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>

            {filtroLenguaGrab && (
              <button onClick={() => setFiltroLenguaGrab('')} style={estilos.botonLimpiar}>
                Quitar filtro
              </button>
            )}
          </div>

          {metricas?.por_lengua?.length > 0 && (
            <div style={estilos.desglose}>
              Validadas por lengua:{' '}
              {metricas.por_lengua.map((l) => (
                <button
                  key={l.lengua}
                  onClick={() => setFiltroLenguaGrab(l.lengua)}
                  style={estilos.chip}
                  title={`${l.hablantes} hablante(s)`}
                >
                  {l.lengua}: {l.validadas} · {l.minutos} min
                </button>
              ))}
            </div>
          )}

          {grabaciones.length === 0 && !cargando && (
            <p style={estilos.vacio}>No hay grabaciones que coincidan con el filtro.</p>
          )}

          {grabaciones.map((g) => (
            <div key={g.id_grabacion} style={estilos.tarjeta}>
              <div style={estilos.filaTarjeta}>
                <strong>#{g.id_grabacion}</strong>
                <EstadoEtiqueta estado={g.estado} />
              </div>

              <p style={estilos.enunciado}>"{g.texto_transcripcion}"</p>
              <audio src={g.url_audio} controls style={{ width: '100%' }} />

              <p style={estilos.metadato}>
                {g.lengua} · hablante #{g.id_metadatos} ·{' '}
                {Number(g.duracion_segundos || 0).toFixed(1)} s · {g.votos_positivos} a favor,{' '}
                {g.votos_negativos} en contra
              </p>

              <div style={estilos.acciones}>
                <button onClick={() => accionEstado(g.id_grabacion, 'validada')} style={estilos.botonValidar}>
                  Validar
                </button>
                <button onClick={() => accionEstado(g.id_grabacion, 'rechazada')} style={estilos.botonRechazar}>
                  Rechazar
                </button>
                <button onClick={() => accionEliminar(g.id_grabacion)} style={estilos.botonEliminar}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {seccion === SECCION.HABLANTES && (
        <>
          <div style={estilos.filtros}>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setBusquedaAplicada(busqueda.trim())}
              placeholder="Buscar por DNI o lengua…"
              style={estilos.inputBusqueda}
            />
            <button
              onClick={() => setBusquedaAplicada(busqueda.trim())}
              style={estilos.botonBuscar}
            >
              Buscar
            </button>
          </div>

          <div style={estilos.filtros}>
            <select
              value={filtroLenguaHab}
              onChange={(e) => setFiltroLenguaHab(e.target.value)}
              style={estilos.select}
            >
              <option value="">Todas las lenguas</option>
              {LENGUAS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>

            <select
              value={filtroRangoEdad}
              onChange={(e) => setFiltroRangoEdad(e.target.value)}
              style={estilos.select}
            >
              <option value="">Toda edad</option>
              {RANGOS_EDAD.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>

            <select
              value={filtroGenero}
              onChange={(e) => setFiltroGenero(e.target.value)}
              style={estilos.select}
            >
              <option value="">Todo género</option>
              {GENEROS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>

            {(busquedaAplicada || filtroLenguaHab || filtroRangoEdad || filtroGenero) && (
              <button onClick={limpiarFiltrosHablantes} style={estilos.botonLimpiar}>
                Limpiar
              </button>
            )}
          </div>

          <p style={estilos.metadato}>
            {totalHablantes} hablante{totalHablantes === 1 ? '' : 's'}
            {(busquedaAplicada || filtroLenguaHab || filtroRangoEdad || filtroGenero) &&
              ' con los filtros aplicados'}
          </p>

          {hablantes.length === 0 && !cargando && (
            <p style={estilos.vacio}>Ningún hablante coincide con la búsqueda.</p>
          )}

          {editando && (
            <form onSubmit={guardarHablante} style={estilos.formularioEdicion}>
              <h3 style={{ marginTop: 0 }}>Editar hablante #{editando.id_metadatos}</h3>

              <label style={estilos.etiqueta}>DNI</label>
              <input
                value={editando.dni}
                onChange={(e) => setEditando({ ...editando, dni: e.target.value.replace(/\D/g, '') })}
                maxLength={8}
                style={estilos.input}
              />

              <label style={estilos.etiqueta}>Rango de edad</label>
              <select
                value={editando.rango_edad}
                onChange={(e) => setEditando({ ...editando, rango_edad: e.target.value })}
                style={estilos.input}
              >
                {RANGOS_EDAD.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>

              <label style={estilos.etiqueta}>Género</label>
              <select
                value={editando.genero}
                onChange={(e) => setEditando({ ...editando, genero: e.target.value })}
                style={estilos.input}
              >
                {GENEROS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>

              <label style={estilos.etiqueta}>Lengua</label>
              <select
                value={editando.lengua}
                onChange={(e) => setEditando({ ...editando, lengua: e.target.value })}
                style={estilos.input}
              >
                {LENGUAS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>

              <div style={estilos.acciones}>
                <button type="submit" style={estilos.botonValidar}>Guardar</button>
                <button type="button" onClick={() => setEditando(null)} style={estilos.botonCancelar}>
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {hablantes.map((h) => (
            <div key={h.id_metadatos} style={estilos.tarjeta}>
              <div style={estilos.filaTarjeta}>
                <strong>#{h.id_metadatos} · DNI {h.dni}</strong>
                <button onClick={() => setEditando({ ...h })} style={estilos.botonEditar}>
                  Editar
                </button>
              </div>
              <p style={estilos.metadato}>
                {h.lengua} · {h.rango_edad} · {h.genero}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function Metrica({ valor, etiqueta, destacado }) {
  return (
    <div style={destacado ? estilos.metricaDestacada : estilos.metrica}>
      <div style={estilos.metricaValor}>{valor}</div>
      <div style={estilos.metricaEtiqueta}>{etiqueta}</div>
    </div>
  );
}

function EstadoEtiqueta({ estado }) {
  const colores = {
    pendiente: { background: '#fef3c7', color: '#92400e' },
    validada: { background: '#dcfce7', color: '#166534' },
    rechazada: { background: '#fee2e2', color: '#991b1b' },
  };

  return (
    <span style={{ ...estilos.etiquetaEstado, ...colores[estado] }}>{estado}</span>
  );
}

const estilos = {
  contenedor: { maxWidth: 800, margin: '32px auto', padding: 24, fontFamily: 'sans-serif' },
  cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  titulo: { fontSize: 22, margin: 0 },
  usuario: { fontSize: 14, color: '#666', marginRight: 12 },
  botonSalir: { padding: '6px 12px', fontSize: 13, borderRadius: 4, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' },
  metricas: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  metrica: { flex: '1 1 90px', padding: 12, background: '#f3f4f6', borderRadius: 6, textAlign: 'center' },
  metricaDestacada: { flex: '1 1 90px', padding: 12, background: '#dbeafe', borderRadius: 6, textAlign: 'center' },
  metricaValor: { fontSize: 22, fontWeight: 'bold' },
  metricaEtiqueta: { fontSize: 12, color: '#555' },
  pestanas: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  pestana: { padding: '8px 16px', fontSize: 14, borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' },
  pestanaActiva: { padding: '8px 16px', fontSize: 14, borderRadius: 6, border: 'none', background: '#1f2937', color: '#fff', cursor: 'pointer' },
  botonExportar: { marginLeft: 'auto', padding: '8px 16px', fontSize: 14, borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' },
  filtros: { marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
  etiquetaFiltro: { fontSize: 14 },
  select: { padding: 6, fontSize: 14, borderRadius: 4, border: '1px solid #ccc' },
  tarjeta: { border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 12 },
  filaTarjeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  enunciado: { fontStyle: 'italic', fontSize: 16, margin: '8px 0' },
  metadato: { fontSize: 13, color: '#666', margin: '8px 0' },
  acciones: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  botonValidar: { padding: '8px 14px', fontSize: 14, borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer' },
  botonRechazar: { padding: '8px 14px', fontSize: 14, borderRadius: 6, border: 'none', background: '#ea580c', color: '#fff', cursor: 'pointer' },
  botonEliminar: { padding: '8px 14px', fontSize: 14, borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer' },
  botonEditar: { padding: '6px 12px', fontSize: 13, borderRadius: 4, border: '1px solid #2563eb', background: '#fff', color: '#2563eb', cursor: 'pointer' },
  botonCancelar: { padding: '8px 14px', fontSize: 14, borderRadius: 6, border: '1px solid #999', background: '#fff', cursor: 'pointer' },
  formularioEdicion: { display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid #2563eb', borderRadius: 8, padding: 16, marginBottom: 16 },
  etiqueta: { fontWeight: 'bold', fontSize: 13, marginTop: 6 },
  input: { padding: 8, fontSize: 15, borderRadius: 4, border: '1px solid #ccc' },
  etiquetaEstado: { padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 'bold' },
  error: { background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 6, marginBottom: 16 },
  aviso: { background: '#dcfce7', color: '#166534', padding: 12, borderRadius: 6, marginBottom: 16 },
  cargando: { color: '#666' },
  vacio: { color: '#888', textAlign: 'center', padding: 24 },
  inputBusqueda: { flex: 1, padding: 8, fontSize: 15, borderRadius: 4, border: '1px solid #ccc' },
  botonBuscar: { padding: '8px 16px', fontSize: 14, borderRadius: 4, border: 'none', background: '#1f2937', color: '#fff', cursor: 'pointer' },
  botonLimpiar: { padding: '6px 12px', fontSize: 13, borderRadius: 4, border: '1px solid #ccc', background: '#fff', color: '#555', cursor: 'pointer' },
  desglose: { fontSize: 13, color: '#555', marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  chip: { padding: '4px 10px', fontSize: 12, borderRadius: 12, border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer' },
};
