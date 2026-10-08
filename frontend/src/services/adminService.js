// frontend/src/services/adminService.js
//
// Comunicación con los endpoints administrativos. El token de sesión
// se conserva en memoria del módulo y no en el almacenamiento del
// navegador: al recargar la página se exige iniciar sesión nuevamente,
// lo que reduce la ventana de exposición si el dispositivo queda
// desatendido.

import { API_BASE } from '../config/api.js';
const ADMIN_API_BASE = `${API_BASE}/admin`;

let tokenSesion = null;

export function establecerToken(token) {
  tokenSesion = token;
}

export function cerrarSesion() {
  tokenSesion = null;
}

export function haySesion() {
  return tokenSesion !== null;
}

/**
 * Envoltorio de fetch que añade la cabecera de autorización y
 * normaliza el tratamiento de errores.
 */
async function peticion(ruta, opciones = {}) {
  const respuesta = await fetch(`${ADMIN_API_BASE}${ruta}`, {
    ...opciones,
    headers: {
      ...(opciones.headers || {}),
      ...(tokenSesion ? { Authorization: `Bearer ${tokenSesion}` } : {}),
    },
  });

  if (respuesta.status === 204) return null;

  const cuerpo = await respuesta.json();

  if (respuesta.ok) return cuerpo;

  const error = new Error(cuerpo.mensaje || 'La operación no se completó.');
  error.codigo = cuerpo.codigo;
  error.detalles = cuerpo.detalles || [];
  throw error;
}

// ---------------------------------------------------------------------

export async function iniciarSesion(usuario, contrasena) {
  const respuesta = await fetch(`${ADMIN_API_BASE}/sesion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, contrasena }),
  });

  const cuerpo = await respuesta.json();

  if (!respuesta.ok) {
    const error = new Error(cuerpo.mensaje || 'No fue posible iniciar sesión.');
    error.codigo = cuerpo.codigo;
    throw error;
  }

  establecerToken(cuerpo.token);
  return cuerpo;
}

export function obtenerMetricas() {
  return peticion('/metricas');
}

export function listarGrabaciones({ estado, lengua, pagina = 1 } = {}) {
  const parametros = new URLSearchParams({ pagina });
  if (estado) parametros.set('estado', estado);
  if (lengua) parametros.set('lengua', lengua);

  return peticion(`/grabaciones?${parametros}`);
}

export function cambiarEstado(idGrabacion, estado) {
  return peticion(`/grabaciones/${idGrabacion}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado }),
  });
}

export function eliminarGrabacion(idGrabacion) {
  return peticion(`/grabaciones/${idGrabacion}`, { method: 'DELETE' });
}

export function listarHablantes({
  busqueda,
  lengua,
  rangoEdad,
  genero,
  pagina = 1,
} = {}) {
  const parametros = new URLSearchParams({ pagina });
  if (busqueda) parametros.set('busqueda', busqueda);
  if (lengua) parametros.set('lengua', lengua);
  if (rangoEdad) parametros.set('rango_edad', rangoEdad);
  if (genero) parametros.set('genero', genero);

  return peticion(`/metadatos?${parametros}`);
}

export function editarHablante(idMetadatos, datos) {
  return peticion(`/metadatos/${idMetadatos}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
}

/**
 * Descarga el corpus validado.
 *
 * La descarga no puede realizarse con un enlace directo porque el
 * endpoint exige la cabecera de autorización. Se recupera el archivo
 * como blob y se dispara la descarga mediante un enlace temporal.
 */
export async function exportarCorpus(lengua) {
  const parametros = lengua ? `?lengua=${encodeURIComponent(lengua)}` : '';

  const respuesta = await fetch(`${ADMIN_API_BASE}/exportacion${parametros}`, {
    headers: { Authorization: `Bearer ${tokenSesion}` },
  });

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json();
    const error = new Error(cuerpo.mensaje || 'No fue posible exportar el corpus.');
    error.codigo = cuerpo.codigo;
    throw error;
  }

  const blob = await respuesta.blob();

  // El nombre del archivo viene en la cabecera Content-Disposition,
  // que el servidor construye según el formato estándar del proyecto.
  const disposicion = respuesta.headers.get('Content-Disposition') || '';
  const coincidencia = disposicion.match(/filename="?([^"]+)"?/);
  const nombreArchivo = coincidencia ? coincidencia[1] : 'corpus.zip';

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);

  return nombreArchivo;
}
