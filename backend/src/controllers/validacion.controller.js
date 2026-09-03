// backend/src/controllers/validacion.controller.js
//
// Implementa el flujo 3.2.4 del DDS ("Validación por Pares") y los
// endpoints 3.4.4.5 y 3.4.4.6. Da soporte a RF18, RF19, RF20, RF27,
// RF28, RF35 y RF37.

const modelo = require('../models/validacion.model');
const servicio = require('../services/validacion');
const { CODIGOS, enviarError } = require('../utils/errores');

// ---------------------------------------------------------------------
// GET /api/grabaciones/validar?id_metadatos=N     (DDS 3.4.4.5)
//
// Devuelve una grabación disponible para que el hablante indicado la
// evalúe, junto con su transcripción asociada.
// ---------------------------------------------------------------------
async function obtenerPendiente(req, res) {
  const idValidador = Number(req.query.id_metadatos);

  if (!idValidador || !Number.isInteger(idValidador)) {
    return enviarError(
      res,
      400,
      CODIGOS.DATOS_INVALIDOS,
      'Falta o es inválido el identificador del validador.',
      [{ campo: 'id_metadatos', problema: 'Debe ser un número entero.' }]
    );
  }

  try {
    const grabacion = await modelo.buscarGrabacionPendiente(idValidador);

    // Sin grabaciones disponibles no hay contenido que devolver. Este
    // 204 no representa un error: significa que el validador está al
    // día con las contribuciones de la comunidad.
    if (!grabacion) {
      return res.status(204).end();
    }

    const restantes = await modelo.contarPendientesPara(idValidador);

    return res.status(200).json({ ...grabacion, estado: 'pendiente', restantes });
  } catch (error) {
    console.error('Error al obtener una grabación pendiente:', error.message);

    return enviarError(
      res,
      500,
      CODIGOS.ERROR_INTERNO,
      'Ocurrió un error al buscar grabaciones por validar.'
    );
  }
}

// ---------------------------------------------------------------------
// POST /api/votos                                 (DDS 3.4.4.6)
// ---------------------------------------------------------------------
async function emitirVoto(req, res) {
  const { id_grabacion, id_metadatos, es_valido } = req.body || {};

  if (!id_grabacion || !id_metadatos) {
    return enviarError(
      res,
      400,
      CODIGOS.DATOS_INVALIDOS,
      'Faltan los campos id_grabacion o id_metadatos.'
    );
  }

  if (typeof es_valido !== 'boolean') {
    return enviarError(
      res,
      400,
      CODIGOS.DATOS_INVALIDOS,
      'El campo es_valido debe ser un valor booleano.',
      [{ campo: 'es_valido', problema: 'Se espera true (Aprobada) o false (Desaprobada).' }]
    );
  }

  try {
    const salida = await servicio.registrarVoto(
      Number(id_grabacion),
      Number(id_metadatos),
      es_valido
    );

    switch (salida.resultado) {
      case servicio.RESULTADO.OK:
        return res.status(200).json({
          id_grabacion: salida.idGrabacion,
          votos_positivos: salida.votosPositivos,
          votos_negativos: salida.votosNegativos,
          estado: salida.estado,
        });

      case servicio.RESULTADO.GRABACION_NO_ENCONTRADA:
        return enviarError(
          res,
          404,
          CODIGOS.RECURSO_NO_ENCONTRADO,
          'La grabación indicada no existe.'
        );

      case servicio.RESULTADO.HABLANTE_NO_ENCONTRADO:
        return enviarError(
          res,
          404,
          CODIGOS.HABLANTE_NO_ENCONTRADO,
          'El hablante indicado no existe.'
        );

      case servicio.RESULTADO.GRABACION_NO_PENDIENTE:
        return enviarError(
          res,
          409,
          CODIGOS.GRABACION_NO_PENDIENTE,
          'Esta grabación ya alcanzó un umbral de validación y no admite más votos.'
        );

      case servicio.RESULTADO.VOTO_DUPLICADO:
        return enviarError(
          res,
          409,
          CODIGOS.VOTO_DUPLICADO,
          'Ya emitiste un voto sobre esta grabación.'
        );

      case servicio.RESULTADO.LENGUA_NO_COINCIDE:
        return enviarError(
          res,
          409,
          CODIGOS.LENGUA_NO_COINCIDE,
          'Solo puedes validar grabaciones en tu misma lengua.'
        );

      case servicio.RESULTADO.AUTOVOTO_NO_PERMITIDO:
        // NOTA PARA EL DDS: este código no figura en el catálogo de la
        // sección 3.4.2.1. Debe incorporarse allí, junto con
        // GRABACION_YA_EXISTE y AUDIO_NO_RECIBIDO.
        return enviarError(
          res,
          409,
          CODIGOS.AUTOVOTO_NO_PERMITIDO,
          'No puedes validar tus propias grabaciones.'
        );

      default:
        return enviarError(
          res,
          500,
          CODIGOS.ERROR_INTERNO,
          'Ocurrió un error al registrar el voto.'
        );
    }
  } catch (error) {
    console.error('Error al registrar el voto:', error.message);

    return enviarError(
      res,
      500,
      CODIGOS.ERROR_INTERNO,
      'Ocurrió un error al registrar el voto.'
    );
  }
}

module.exports = { obtenerPendiente, emitirVoto };
