// backend/src/controllers/metadatos.controller.js
//
// Controlador de Metadatos. Implementa el flujo 3.2.1 del DDS
// ("Identificación y Registro de Metadatos") y los endpoints 3.4.4.1 y
// 3.4.4.2. Da soporte a los requerimientos RF05, RF12 y RF25.

const modelo = require('../models/metadatos.model');
const { CODIGOS, enviarError } = require('../utils/errores');
const { RANGOS_EDAD, GENEROS, LENGUAS } = require('../config/catalogos');

// El DNI debe contener exactamente 8 dígitos numéricos. La misma regla
// está replicada como CHECK constraint en la base de datos, de modo que
// la validación no depende únicamente de la capa de aplicación.
const PATRON_DNI = /^[0-9]{8}$/;

/**
 * Valida el cuerpo de la petición de registro.
 * @returns {Array} Lista de campos con problemas. Vacía si todo es válido.
 */
function validarDatosRegistro({ dni, rango_edad, genero, lengua }) {
  const detalles = [];

  if (!dni || !PATRON_DNI.test(dni)) {
    detalles.push({
      campo: 'dni',
      problema: 'Debe contener exactamente 8 dígitos numéricos.',
    });
  }

  if (!rango_edad || !RANGOS_EDAD.includes(rango_edad)) {
    detalles.push({
      campo: 'rango_edad',
      problema: `Debe ser uno de: ${RANGOS_EDAD.join(', ')}.`,
    });
  }

  if (!genero || !GENEROS.includes(genero)) {
    detalles.push({
      campo: 'genero',
      problema: `Debe ser uno de: ${GENEROS.join(', ')}.`,
    });
  }

  if (!lengua || !LENGUAS.includes(lengua)) {
    detalles.push({
      campo: 'lengua',
      problema: `Debe ser una de: ${LENGUAS.join(', ')}.`,
    });
  }

  return detalles;
}

// ---------------------------------------------------------------------
// GET /api/metadatos/:dni      (DDS 3.4.4.1)
//
// Verifica si existe un registro asociado al DNI y, de existir, recupera
// sus metadatos. La respuesta 404 no representa una condición anómala,
// sino la indicación de que el frontend debe solicitar los metadatos al
// hablante.
// ---------------------------------------------------------------------
async function consultarPorDni(req, res) {
  const { dni } = req.params;

  if (!PATRON_DNI.test(dni)) {
    return enviarError(
      res,
      400,
      CODIGOS.DATOS_INVALIDOS,
      'El DNI debe contener exactamente 8 dígitos numéricos.',
      [{ campo: 'dni', problema: 'Formato inválido.' }]
    );
  }

  try {
    const hablante = await modelo.buscarPorDni(dni);

    if (!hablante) {
      return enviarError(
        res,
        404,
        CODIGOS.HABLANTE_NO_ENCONTRADO,
        'No existe un registro asociado al DNI consultado.'
      );
    }

    return res.status(200).json(hablante);
  } catch (error) {
    console.error('Error al consultar metadatos:', error.message);

    return enviarError(
      res,
      500,
      CODIGOS.ERROR_INTERNO,
      'Ocurrió un error al consultar los datos del hablante.'
    );
  }
}

// ---------------------------------------------------------------------
// POST /api/metadatos          (DDS 3.4.4.2)
//
// Crea el registro de un nuevo hablante nativo usando su DNI como
// identificador único.
// ---------------------------------------------------------------------
async function registrar(req, res) {
  const { dni, rango_edad, genero, lengua } = req.body;

  const detalles = validarDatosRegistro({ dni, rango_edad, genero, lengua });

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
    const idMetadatos = await modelo.crear({ dni, rango_edad, genero, lengua });

    return res.status(201).json({
      id_metadatos: idMetadatos,
      dni,
      rango_edad,
      genero,
      lengua,
    });
  } catch (error) {
    // La restricción UNIQUE sobre la columna dni actúa como salvaguarda
    // frente a dos peticiones simultáneas con el mismo documento, un
    // caso que una verificación previa en la aplicación no cubriría.
    if (error.code === 'ER_DUP_ENTRY') {
      return enviarError(
        res,
        409,
        CODIGOS.DNI_YA_REGISTRADO,
        'El DNI ingresado ya se encuentra registrado en el sistema.'
      );
    }

    console.error('Error al registrar metadatos:', error.message);

    return enviarError(
      res,
      500,
      CODIGOS.ERROR_INTERNO,
      'Ocurrió un error al registrar al hablante.'
    );
  }
}

module.exports = { consultarPorDni, registrar };
