// backend/src/routes/grabacion.routes.js
//
// Usa multer con almacenamiento en memoria: el archivo llega como
// Buffer en req.file.buffer, listo para pasarlo al servicio de
// almacenamiento sin escribir un archivo temporal intermedio.

const express = require('express');
const multer = require('multer');
const controlador = require('../controllers/grabacion.controller');
const { CODIGOS, enviarError } = require('../utils/errores');

const subidaAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB: de sobra para un clip de voz corto
});

const router = express.Router();

// POST /api/grabaciones → Registrar grabación (RF04, RF06, RF08–RF11, RF15, RF26)
//
// Se envuelve multer manualmente (en vez de pasarlo directo como
// middleware) para poder convertir sus errores —por ejemplo, un
// archivo demasiado grande— al formato de error uniforme del sistema,
// en lugar del error genérico que produciría por defecto.
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
