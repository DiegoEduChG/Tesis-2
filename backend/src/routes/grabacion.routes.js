// backend/src/routes/grabacion.routes.js
//
// Usa multer con almacenamiento en memoria: el archivo llega como
// Buffer en req.file.buffer, listo para pasarlo al servicio de
// almacenamiento sin escribir un archivo temporal intermedio.

const express = require('express');
const multer = require('multer');
const controlador = require('../controllers/grabacion.controller');
const validacionControlador = require('../controllers/validacion.controller');
const { CODIGOS, enviarError } = require('../utils/errores');

const subidaAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const router = express.Router();

// GET /api/grabaciones/validar → Obtener grabación pendiente de
// validación (RF18, RF19, RF27, RF37).
//
// Debe declararse ANTES de cualquier ruta con parámetro dinámico como
// /:id, ya que Express resuelve las rutas en orden de declaración y
// "validar" sería interpretado como un valor del parámetro.
router.get('/validar', validacionControlador.obtenerPendiente);

// POST /api/grabaciones → Registrar grabación (RF04, RF06, RF08–RF11, RF15, RF26)
router.post('/', (req, res, next) => {
  subidaAudio.single('audio')(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return enviarError(
        res,
        413,
        CODIGOS.FORMATO_AUDIO_INVALIDO,
        'El archivo de audio excede el tamaño máximo permitido (10 MB).'
      );
    }

    if (error) {
      return enviarError(
        res,
        400,
        CODIGOS.FORMATO_AUDIO_INVALIDO,
        'No fue posible procesar el archivo enviado.'
      );
    }

    next();
  });
}, controlador.registrar);

module.exports = router;