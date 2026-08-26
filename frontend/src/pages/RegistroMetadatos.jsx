// frontend/src/pages/RegistroMetadatos.jsx
//
// Implementa el flujo 3.2.1 del DDS ("Identificación y Registro de
// Metadatos"). Sigue el flujo básico paso a paso:
//   1. El hablante ingresa su DNI.
//   2. Si no existe, se le pide rango_edad, género y lengua.
//   3. Si ya existe, se le muestran sus datos para confirmar.
//
// No usa librerías de UI: solo HTML + CSS mínimo en línea, suficiente
// para un prototipo. Las clases de Tailwind no aplican aquí porque el
// proyecto no las incluyó en el DDS ni en las herramientas del cap. 1.

import { useState } from 'react';
import { consultarPorDni, registrar } from '../services/metadatosService';

// Debe coincidir con backend/src/config/catalogos.js. Si cambias uno,
// cambia el otro y actualiza el diccionario de datos del DDS.
const RANGOS_EDAD = ['18-29', '30-39', '40-49', '50-59', '60+'];
const GENEROS = ['Femenino', 'Masculino', 'Otro', 'Prefiero no indicar'];
const LENGUAS = ['Quechua', 'Aimara', 'Asháninka', 'Shipibo-Konibo', 'Awajún'];

// Los cuatro "momentos" de la pantalla, según el flujo del DDS.
const ETAPA = {
  INGRESAR_DNI: 'INGRESAR_DNI',
  CONFIRMAR_EXISTENTE: 'CONFIRMAR_EXISTENTE',
  COMPLETAR_NUEVO: 'COMPLETAR_NUEVO',
  LISTO: 'LISTO',
};

export default function RegistroMetadatos({ onHablanteListo }) {
  const [etapa, setEtapa] = useState(ETAPA.INGRESAR_DNI);
  const [dni, setDni] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Datos del hablante, ya sea recuperados o recién ingresados.
  const [hablante, setHablante] = useState(null);

  // Campos del formulario para un hablante nuevo.
  const [rangoEdad, setRangoEdad] = useState('');
  const [genero, setGenero] = useState('');
  const [lengua, setLengua] = useState('');

  // -------------------------------------------------------------
  // Paso 1 del flujo: el hablante ingresa su DNI y el sistema
  // verifica si ya existe un registro asociado.
  // -------------------------------------------------------------
  async function manejarConsultaDni(evento) {
    evento.preventDefault();
    setError(null);

    if (!/^[0-9]{8}$/.test(dni)) {
      setError('El DNI debe tener exactamente 8 dígitos.');
      return;
    }

    setCargando(true);
    try {
      const resultado = await consultarPorDni(dni);

      if (resultado.existe) {
        setHablante(resultado.datos);
        setEtapa(ETAPA.CONFIRMAR_EXISTENTE);
      } else {
        setEtapa(ETAPA.COMPLETAR_NUEVO);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  // -------------------------------------------------------------
  // Rama "DNI ya registrado": el hablante confirma que los datos
  // mostrados son correctos.
  // -------------------------------------------------------------
  function confirmarDatosExistentes() {
    onHablanteListo(hablante);
    setEtapa(ETAPA.LISTO);
  }

  // Si el hablante indica que sus datos son incorrectos, el DDS
  // establece que debe solicitar la modificación al Administrador,
  // no que pueda editarlos él mismo.
  function marcarDatosIncorrectos() {
    setError(
      'Tus datos parecen no ser correctos. Por favor solicita al Administrador que los actualice antes de continuar.'
    );
  }

  // -------------------------------------------------------------
  // Rama "DNI nuevo": el hablante completa sus metadatos y el
  // sistema los registra.
  // -------------------------------------------------------------
  async function manejarRegistroNuevo(evento) {
    evento.preventDefault();
    setError(null);

    if (!rangoEdad || !genero || !lengua) {
      setError('Completa los tres campos antes de continuar.');
      return;
    }

    setCargando(true);
    try {
      const creado = await registrar({ dni, rango_edad: rangoEdad, genero, lengua });
      setHablante(creado);
      onHablanteListo(creado);
      setEtapa(ETAPA.LISTO);
    } catch (err) {
      if (err.codigo === 'DNI_YA_REGISTRADO') {
        // Caso borde: dos pestañas registrando el mismo DNI a la vez.
        setError('Este DNI acaba de registrarse. Vuelve a ingresarlo para recuperar tus datos.');
        setEtapa(ETAPA.INGRESAR_DNI);
      } else {
        setError(err.message);
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>NampiVoz</h1>
      <p style={estilos.subtitulo}>Identifícate para comenzar a contribuir</p>

      {error && <div style={estilos.error}>{error}</div>}

      {etapa === ETAPA.INGRESAR_DNI && (
        <form onSubmit={manejarConsultaDni} style={estilos.formulario}>
          <label style={estilos.etiqueta}>Ingresa tu DNI</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
            placeholder="12345678"
            style={estilos.input}
          />
          <button type="submit" disabled={cargando} style={estilos.boton}>
            {cargando ? 'Verificando…' : 'Continuar'}
          </button>
        </form>
      )}

      {etapa === ETAPA.CONFIRMAR_EXISTENTE && hablante && (
        <div style={estilos.formulario}>
          <p>Encontramos estos datos asociados a tu DNI:</p>
          <ul style={estilos.listaDatos}>
            <li><strong>Rango de edad:</strong> {hablante.rango_edad}</li>
            <li><strong>Género:</strong> {hablante.genero}</li>
            <li><strong>Lengua:</strong> {hablante.lengua}</li>
          </ul>
          <div style={estilos.filaBotones}>
            <button onClick={confirmarDatosExistentes} style={estilos.boton}>
              Sí, son correctos
            </button>
            <button onClick={marcarDatosIncorrectos} style={estilos.botonSecundario}>
              No son correctos
            </button>
          </div>
        </div>
      )}

      {etapa === ETAPA.COMPLETAR_NUEVO && (
        <form onSubmit={manejarRegistroNuevo} style={estilos.formulario}>
          <p>No encontramos un registro previo. Completa tus datos:</p>

          <label style={estilos.etiqueta}>Rango de edad</label>
          <select value={rangoEdad} onChange={(e) => setRangoEdad(e.target.value)} style={estilos.input}>
            <option value="">Selecciona…</option>
            {RANGOS_EDAD.map((valor) => (
              <option key={valor} value={valor}>{valor}</option>
            ))}
          </select>

          <label style={estilos.etiqueta}>Género</label>
          <select value={genero} onChange={(e) => setGenero(e.target.value)} style={estilos.input}>
            <option value="">Selecciona…</option>
            {GENEROS.map((valor) => (
              <option key={valor} value={valor}>{valor}</option>
            ))}
          </select>

          <label style={estilos.etiqueta}>Lengua originaria</label>
          <select value={lengua} onChange={(e) => setLengua(e.target.value)} style={estilos.input}>
            <option value="">Selecciona…</option>
            {LENGUAS.map((valor) => (
              <option key={valor} value={valor}>{valor}</option>
            ))}
          </select>

          <button type="submit" disabled={cargando} style={estilos.boton}>
            {cargando ? 'Registrando…' : 'Registrarme'}
          </button>
        </form>
      )}

      {etapa === ETAPA.LISTO && (
        <div style={estilos.formulario}>
          <p>✅ Identificación completa. Ya puedes continuar a la redacción de tu enunciado.</p>
        </div>
      )}
    </div>
  );
}

// Estilos en línea, suficientes para el prototipo. Si más adelante se
// documenta una librería de estilos en el DDS, migrar aquí.
const estilos = {
  contenedor: { maxWidth: 420, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' },
  titulo: { fontSize: 28, marginBottom: 4 },
  subtitulo: { color: '#555', marginBottom: 24 },
  formulario: { display: 'flex', flexDirection: 'column', gap: 12 },
  etiqueta: { fontWeight: 'bold', marginTop: 8 },
  input: { padding: 10, fontSize: 16, borderRadius: 6, border: '1px solid #ccc' },
  boton: { padding: 12, fontSize: 16, borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' },
  botonSecundario: { padding: 12, fontSize: 16, borderRadius: 6, border: '1px solid #2563eb', background: '#fff', color: '#2563eb', cursor: 'pointer' },
  filaBotones: { display: 'flex', gap: 12 },
  listaDatos: { background: '#f3f4f6', padding: 16, borderRadius: 6, listStyle: 'none' },
  error: { background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 6, marginBottom: 16 },
};
