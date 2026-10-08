// backend/src/services/almacenamiento.js
//
// Componente de Almacenamiento de Archivos (DDS §2.2.1.4).
//
// ---------------------------------------------------------------------
// DOS IMPLEMENTACIONES, UNA SOLA INTERFAZ
// ---------------------------------------------------------------------
// El módulo expone tres funciones —subirArchivo, leerArchivo y
// eliminarArchivo— y resuelve internamente dónde viven los archivos:
//
//   Sin la variable S3_BUCKET definida → sistema de archivos local.
//     Es el modo de desarrollo: no requiere cuenta de proveedor alguno
//     ni conexión de red, y permite ejecutar el sistema completo en una
//     sola máquina.
//
//   Con S3_BUCKET definida → Amazon S3.
//     Es el modo de despliegue, y corresponde al diseño especificado en
//     el DDS. Resuelve la desviación que el informe del OE2 consignó
//     como pendiente: hasta esta versión, el almacenamiento en disco
//     local era un sustituto temporal del servicio en la nube.
//
// La elección se realiza por configuración y no por código, de modo que
// el mismo artefacto se ejecuta en ambos entornos. Ningún otro módulo
// del backend conoce esta distinción: el controlador de grabaciones
// llama a subirArchivo y recibe una URL, sin saber de dónde proviene.
//
// ---------------------------------------------------------------------
// POR QUÉ EL AUDIO NO SE SIRVE DIRECTAMENTE DESDE S3
// ---------------------------------------------------------------------
// El contenedor de S3 permanece privado. Las grabaciones se publican a
// través de la misma distribución de CloudFront que sirve la
// aplicación, bajo la ruta /audio/, mediante un control de acceso de
// origen.
//
// Mantenerlo privado importa porque el contenedor alberga también las
// grabaciones pendientes y las rechazadas, que no forman parte del
// corpus y cuya difusión no fue consentida en esos términos. Solo el
// paquete exportado, compuesto por grabaciones validadas, se distribuye
// bajo licencia abierta.
// ---------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

const CARPETA_UPLOADS = path.join(__dirname, '..', '..', 'uploads');
const PREFIJO_S3 = 'audio/';

const BUCKET = process.env.S3_BUCKET;
const USA_S3 = Boolean(BUCKET);

/**
 * Raíz pública desde la que se sirven los archivos. En despliegue es el
 * dominio de CloudFront; en desarrollo, el propio servidor local.
 */
function urlPublica() {
  if (process.env.URL_PUBLICA) {
    return process.env.URL_PUBLICA.replace(/\/+$/, '');
  }
  return `http://localhost:${process.env.PORT || 3000}`;
}

// ---------------------------------------------------------------------
// Cliente de S3, creado una sola vez y solo si hace falta
// ---------------------------------------------------------------------
// La carga diferida evita que el entorno de desarrollo necesite tener
// instalado el SDK de AWS para arrancar el servidor.

let clienteS3 = null;
let ordenesS3 = null;

function s3() {
  if (!clienteS3) {
    const sdk = require('@aws-sdk/client-s3');
    ordenesS3 = sdk;
    clienteS3 = new sdk.S3Client({ region: process.env.AWS_REGION || 'us-east-2' });
  }
  return { cliente: clienteS3, ...ordenesS3 };
}

// La carpeta local solo se crea cuando se va a usar.
if (!USA_S3 && !fs.existsSync(CARPETA_UPLOADS)) {
  fs.mkdirSync(CARPETA_UPLOADS, { recursive: true });
}

/**
 * Guarda el archivo de audio y devuelve la URL desde la que puede
 * reproducirse.
 *
 * @param {Buffer} buffer
 * @param {string} nombreArchivo
 * @returns {Promise<string>}
 */
async function subirArchivo(buffer, nombreArchivo) {
  if (USA_S3) {
    const { cliente, PutObjectCommand } = s3();

    await cliente.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: PREFIJO_S3 + nombreArchivo,
        Body: buffer,
        ContentType: 'audio/wav',
      })
    );

    return `${urlPublica()}/audio/${nombreArchivo}`;
  }

  await fs.promises.writeFile(path.join(CARPETA_UPLOADS, nombreArchivo), buffer);
  return `${urlPublica()}/uploads/${nombreArchivo}`;
}

/**
 * Recupera el contenido de un archivo previamente almacenado. Lo emplea
 * el servicio de exportación para componer el paquete del corpus.
 *
 * @param {string} nombreArchivo
 * @returns {Promise<Buffer>}
 */
async function leerArchivo(nombreArchivo) {
  if (USA_S3) {
    const { cliente, GetObjectCommand } = s3();

    const respuesta = await cliente.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: PREFIJO_S3 + nombreArchivo })
    );

    // El cuerpo llega como flujo; se acumula en memoria porque el
    // servicio de exportación necesita el contenido completo para
    // incorporarlo al archivo comprimido.
    const partes = [];
    for await (const parte of respuesta.Body) partes.push(parte);
    return Buffer.concat(partes);
  }

  return fs.promises.readFile(path.join(CARPETA_UPLOADS, nombreArchivo));
}

/**
 * Elimina un archivo del almacenamiento. No falla si el archivo ya no
 * existe: el objetivo es que deje de estar, y esa condición ya se
 * cumple.
 *
 * @param {string} nombreArchivo
 */
async function eliminarArchivo(nombreArchivo) {
  if (USA_S3) {
    const { cliente, DeleteObjectCommand } = s3();

    // S3 no distingue entre borrar un objeto existente y uno ausente:
    // ambas operaciones se consideran satisfactorias.
    await cliente.send(
      new DeleteObjectCommand({ Bucket: BUCKET, Key: PREFIJO_S3 + nombreArchivo })
    );
    return;
  }

  try {
    await fs.promises.unlink(path.join(CARPETA_UPLOADS, nombreArchivo));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

/** Permite conocer el modo activo sin duplicar la regla de selección. */
function modoAlmacenamiento() {
  return USA_S3 ? `s3:${BUCKET}` : 'disco-local';
}

module.exports = { subirArchivo, leerArchivo, eliminarArchivo, modoAlmacenamiento, USA_S3 };
