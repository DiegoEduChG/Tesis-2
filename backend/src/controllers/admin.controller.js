// backend/src/controllers/admin.controller.js
//
// Implementa el flujo 3.2.6 del DDS ("Gestión Administrativa del
// Corpus") y los endpoints de la sección 3.4.5. Da soporte a RF16,
// RF21, RF22, RF23, RF29 a RF34, RF36 y RF38.

const bcrypt = require('bcrypt');
const modelo = require('../models/admin.model');
const almacenamiento = require('../services/almacenamiento');
const exportacion = require('../services/exportacion');
const { generarToken, DURACION_SESION_SEGUNDOS } = require('../middlewares/autenticacion');
const { CODIGOS, enviarError } = require('../utils/errores');
const { RANGOS_EDAD, GENEROS, LENGUAS } = require('../config/catalogos');

const ESTADOS_VALIDOS = ['pendiente', 'validada', 'rechazada'];
const PATRON_DNI = /^[0-9]{8}$/;

// ---------------------------------------------------------------------
// POST /api/admin/sesion                          (DDS 3.4.5.1)
// ---------------------------------------------------------------------
async function iniciarSesion(req, res) {
  const { usuario, contrasena } = req.body || {};

  if (!usuario || !contrasena) {
    return enviarError(
      res,
      400,
      CODIGOS.DATOS_INVALIDOS,
      'Se requieren el usuario y la contraseña.'
    );
  }

  try {
    const administrador = await modelo.buscarAdministradorPorUsuario(usuario);

    // Se responde igual ante un usuario inexistente y ante una
    // contraseña incorrecta: distinguirlos permitiría averiguar qué
    // usuarios existen en el sistema.
    const credencialesValidas =
      administrador && (await bcrypt.compare(contrasena, administrador.password_hash));

    if (!credencialesValidas) {
      return enviarError(
        res,
        401,
        CODIGOS.CREDENCIALES_INVALIDAS,
        'El usuario o la contraseña son incorrectos.'
      );
    }

    return res.status(200).json({
      token: generarToken(administrador.id_administrador, administrador.usuario),
      expira_en: DURACION_SESION_SEGUNDOS,
      usuario: administrador.usuario,
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error.message);
    return enviarError(res, 500, CODIGOS.ERROR_INTERNO, 'Ocurrió un error al iniciar sesión.');
  }
}

// ---------------------------------------------------------------------
// GET /api/admin/metadatos                        (DDS 3.4.5.2)
// ---------------------------------------------------------------------
async function listarHablantes(req, res) {
  try {
    const resultado = await modelo.listarHablantes({
      busqueda: req.query.busqueda,
      lengua: req.query.lengua,
      rangoEdad: req.query.rango_edad,
      genero: req.query.genero,
      pagina: Number(req.query.pagina) || 1,
      limite: Math.min(Number(req.query.limite) || 50, 200),
    });

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error al listar hablantes:', error.message);
    return enviarError(res, 500, CODIGOS.ERROR_INTERNO, 'Ocurrió un error al listar los hablantes.');
  }
}

// ---------------------------------------------------------------------
// PUT /api/admin/metadatos/:id                    (DDS 3.4.5.3)
// ---------------------------------------------------------------------
async function editarHablante(req, res) {
  const idMetadatos = Number(req.params.id);
  const { dni, rango_edad, genero, lengua } = req.body || {};

  const detalles = [];
  if (!dni || !PATRON_DNI.test(dni)) {
    detalles.push({ campo: 'dni', problema: 'Debe contener exactamente 8 dígitos numéricos.' });
  }
  if (!RANGOS_EDAD.includes(rango_edad)) {
    detalles.push({ campo: 'rango_edad', problema: `Debe ser uno de: ${RANGOS_EDAD.join(', ')}.` });
  }
  if (!GENEROS.includes(genero)) {
    detalles.push({ campo: 'genero', problema: `Debe ser uno de: ${GENEROS.join(', ')}.` });
  }
  if (!LENGUAS.includes(lengua)) {
    detalles.push({ campo: 'lengua', problema: `Debe ser una de: ${LENGUAS.join(', ')}.` });
  }

  if (detalles.length > 0) {
    return enviarError(
      res,
      400,
      CODIGOS.DATOS_INVALIDOS,
      'Uno o más campos no cumplen las reglas de validación.',
      detalles
    );
  }

  try {
    const actualizado = await modelo.actualizarHablante(idMetadatos, {
      dni,
      rango_edad,
      genero,
      lengua,
    });

    if (!actualizado) {
      return enviarError(res, 404, CODIGOS.RECURSO_NO_ENCONTRADO, 'El hablante indicado no existe.');
    }

    return res.status(200).json(actualizado);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return enviarError(
        res,
        409,
        CODIGOS.DNI_YA_REGISTRADO,
        'El DNI indicado ya corresponde a otro hablante.'
      );
    }

    console.error('Error al editar el hablante:', error.message);
    return enviarError(res, 500, CODIGOS.ERROR_INTERNO, 'Ocurrió un error al actualizar los datos.');
  }
}

// ---------------------------------------------------------------------
// GET /api/admin/grabaciones                      (DDS 3.4.5.4)
// ---------------------------------------------------------------------
async function listarGrabaciones(req, res) {
  const { estado } = req.query;

  if (estado && !ESTADOS_VALIDOS.includes(estado)) {
    return enviarError(
      res,
      400,
      CODIGOS.DATOS_INVALIDOS,
      `El estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}.`
    );
  }

  try {
    const resultado = await modelo.listarGrabaciones({
      estado,
      lengua: req.query.lengua,
      pagina: Number(req.query.pagina) || 1,
      limite: Math.min(Number(req.query.limite) || 50, 200),
    });

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error al listar grabaciones:', error.message);
    return enviarError(res, 500, CODIGOS.ERROR_INTERNO, 'Ocurrió un error al listar las grabaciones.');
  }
}

// ---------------------------------------------------------------------
// PATCH /api/admin/grabaciones/:id/estado         (DDS 3.4.5.5)
// ---------------------------------------------------------------------
async function cambiarEstadoGrabacion(req, res) {
  const idGrabacion = Number(req.params.id);
  const { estado } = req.body || {};

  if (!ESTADOS_VALIDOS.includes(estado)) {
    return enviarError(
      res,
      400,
      CODIGOS.DATOS_INVALIDOS,
      `El estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}.`
    );
  }

  try {
    const actualizada = await modelo.actualizarEstadoGrabacion(idGrabacion, estado);

    if (!actualizada) {
      return enviarError(res, 404, CODIGOS.RECURSO_NO_ENCONTRADO, 'La grabación indicada no existe.');
    }

    return res.status(200).json(actualizada);
  } catch (error) {
    console.error('Error al cambiar el estado:', error.message);
    return enviarError(res, 500, CODIGOS.ERROR_INTERNO, 'Ocurrió un error al actualizar el estado.');
  }
}

// ---------------------------------------------------------------------
// DELETE /api/admin/grabaciones/:id               (DDS 3.4.5.6)
// ---------------------------------------------------------------------
async function eliminarGrabacion(req, res) {
  const idGrabacion = Number(req.params.id);

  try {
    const grabacion = await modelo.buscarGrabacion(idGrabacion);

    if (!grabacion) {
      return enviarError(res, 404, CODIGOS.RECURSO_NO_ENCONTRADO, 'La grabación indicada no existe.');
    }

    // Primero el archivo y después los registros: si la eliminación
    // del archivo falla, se conservan los registros y la operación
    // puede reintentarse. El orden inverso dejaría un archivo sin
    // referencia alguna en la base de datos.
    await almacenamiento.eliminarArchivo(grabacion.nombre_archivo);
    await modelo.eliminarGrabacion(idGrabacion, grabacion.id_transcripcion);

    return res.status(204).end();
  } catch (error) {
    console.error('Error al eliminar la grabación:', error.message);
    return enviarError(
      res,
      503,
      CODIGOS.ERROR_ALMACENAMIENTO,
      'No fue posible completar la eliminación. Los registros se conservan.'
    );
  }
}

// ---------------------------------------------------------------------
// GET /api/admin/exportacion                      (DDS 3.4.5.7)
// ---------------------------------------------------------------------
async function exportarCorpus(req, res) {
  const { lengua } = req.query;

  try {
    const grabaciones = await modelo.obtenerCorpusValidado(lengua);

    if (grabaciones.length === 0) {
      return enviarError(
        res,
        404,
        CODIGOS.SIN_DATOS_PARA_EXPORTAR,
        'No existen grabaciones validadas que exportar.'
      );
    }

    const nombrePaquete = exportacion.generarNombrePaquete(lengua);

    await exportacion.construirPaquete(res, grabaciones, nombrePaquete, lengua);

    await modelo.registrarExportacion({
      idAdministrador: req.admin.id_administrador,
      lengua,
      nGrabaciones: grabaciones.length,
      nombreArchivo: nombrePaquete,
    });
  } catch (error) {
    console.error('Error al exportar el corpus:', error.message);

    // Si la respuesta ya comenzó a enviarse no es posible sustituirla
    // por un cuerpo de error: solo cabe interrumpir la conexión, y el
    // cliente detectará la descarga incompleta.
    if (res.headersSent) {
      return res.end();
    }

    return enviarError(
      res,
      503,
      CODIGOS.ERROR_ALMACENAMIENTO,
      'Ocurrió un error al generar el paquete de exportación.'
    );
  }
}

// ---------------------------------------------------------------------
// GET /api/admin/metricas
//
// Endpoint añadido durante la implementación: no figura en el DDS.
// Expone el estado agregado del corpus, insumo del indicador del
// resultado R4.1. Debe incorporarse a la sección 3.4.5 del documento.
// ---------------------------------------------------------------------
async function obtenerMetricas(req, res) {
  try {
    return res.status(200).json(await modelo.obtenerMetricas());
  } catch (error) {
    console.error('Error al obtener las métricas:', error.message);
    return enviarError(res, 500, CODIGOS.ERROR_INTERNO, 'Ocurrió un error al calcular las métricas.');
  }
}

module.exports = {
  iniciarSesion,
  listarHablantes,
  editarHablante,
  listarGrabaciones,
  cambiarEstadoGrabacion,
  eliminarGrabacion,
  exportarCorpus,
  obtenerMetricas,
};
