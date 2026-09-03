// frontend/src/pages/admin/AdminLogin.jsx
//
// Inicio de sesión del rol Administrador (DDS §3.4.5.1).
//
// A diferencia del hablante nativo, que se identifica únicamente
// mediante su DNI, el acceso a las funciones administrativas exige
// credenciales de usuario y contraseña, conforme al ERS §3.6.1.

import { useState } from 'react';
import { iniciarSesion } from '../../services/adminService';

export default function AdminLogin({ onSesionIniciada, onVolver }) {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError(null);

    if (!usuario || !contrasena) {
      setError('Completa ambos campos.');
      return;
    }

    setCargando(true);
    try {
      const sesion = await iniciarSesion(usuario, contrasena);
      onSesionIniciada(sesion);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={estilos.contenedor}>
      <h1 style={estilos.titulo}>Administración</h1>
      <p style={estilos.subtitulo}>Acceso restringido</p>

      {error && <div style={estilos.error}>{error}</div>}

      <form onSubmit={manejarEnvio} style={estilos.formulario}>
        <label style={estilos.etiqueta}>Usuario</label>
        <input
          type="text"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          autoComplete="username"
          style={estilos.input}
        />

        <label style={estilos.etiqueta}>Contraseña</label>
        <input
          type="password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          autoComplete="current-password"
          style={estilos.input}
        />

        <button type="submit" disabled={cargando} style={estilos.boton}>
          {cargando ? 'Verificando…' : 'Iniciar sesión'}
        </button>
      </form>

      <button onClick={onVolver} style={estilos.botonVolver}>
        ← Volver al inicio
      </button>
    </div>
  );
}

const estilos = {
  contenedor: { maxWidth: 380, margin: '64px auto', padding: 24, fontFamily: 'sans-serif' },
  titulo: { fontSize: 24, marginBottom: 4 },
  subtitulo: { color: '#555', marginBottom: 24 },
  formulario: { display: 'flex', flexDirection: 'column', gap: 8 },
  etiqueta: { fontWeight: 'bold', marginTop: 8, fontSize: 14 },
  input: { padding: 10, fontSize: 16, borderRadius: 6, border: '1px solid #ccc' },
  boton: { padding: 12, fontSize: 16, borderRadius: 6, border: 'none', background: '#1f2937', color: '#fff', cursor: 'pointer', marginTop: 16 },
  botonVolver: { width: '100%', padding: 10, fontSize: 15, borderRadius: 6, border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer', marginTop: 20 },
  error: { background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 6, marginBottom: 16 },
};
