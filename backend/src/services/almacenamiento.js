// backend/src/services/almacenamiento.js
//
// ============================================================
// DECISIÓN DE DISEÑO — LEER ANTES DE MODIFICAR
// ============================================================
// El DDS (sección 2.2.1.4) especifica AWS S3 como Componente de
// Almacenamiento de archivos. Esta implementación usa el sistema de
// archivos local del servidor como SUSTITUTO DURANTE EL DESARROLLO,
// para no depender de una cuenta de AWS mientras se construye y prueba
// el prototipo en la máquina local.
//
// Antes de la prueba piloto con la comunidad de hablantes (o de
// cualquier despliegue fuera de tu propia computadora), hay que
// reemplazar el cuerpo de subirArchivo() por una llamada al SDK de AWS
// S3 (paquete @aws-sdk/client-s3), conservando la misma firma de
// función. El resto del código (el controlador de grabaciones) no
// necesita cambiar, porque solo conoce esta función, no su
// implementación interna.
//
// Documenta esta decisión en el informe de avance del OE2: es una
// desviación deliberada y temporal respecto del DDS, no un error.
// ============================================================

const fs = require('fs');
const path = require('path');

const CARPETA_UPLOADS = path.join(__dirname, '..', '..', 'uploads');

// Asegura que la carpeta exista antes de la primera subida.
if (!fs.existsSync(CARPETA_UPLOADS)) {
  fs.mkdirSync(CARPETA_UPLOADS, { recursive: true });
}

/**
 * Guarda el buffer de audio en disco y devuelve la URL desde la que
 * puede servirse.
 *
 * @param {Buffer} buffer
 * @param {string} nombreArchivo
 * @returns {Promise<string>} La URL pública del archivo.
 */
async function subirArchivo(buffer, nombreArchivo) {
  const rutaDestino = path.join(CARPETA_UPLOADS, nombreArchivo);
  await fs.promises.writeFile(rutaDestino, buffer);

  const puerto = process.env.PORT || 3000;
  return `http://localhost:${puerto}/uploads/${nombreArchivo}`;
}

module.exports = { subirArchivo };
