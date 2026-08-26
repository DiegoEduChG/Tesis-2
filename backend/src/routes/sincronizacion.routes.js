// backend/src/routes/sincronizacion.routes.js

const express = require('express');
const multer = require('multer');
const controlador = require('../controllers/sincronizacion.controller');
const { CODIGOS, enviarError } = require('../utils/errores');

const MAXIMO_ARCHIVOS = 50;

const subidaLote = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB por archivo
    files: MAXIMO_ARCHIVOS,
  },
});

const router = express.Router();

// POST /api/sincronizacion → Sincronizar contribuciones offline (RF13, RF14)
router.post(
  '/',
  (req, res, next) => {
    subidaLote.array('audios', MAXIMO_ARCHIVOS)(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        const mensaje =
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Uno de los archivos de audio excede el tamaño máximo permitido (10 MB).'
            : 'El lote enviado supera los límites permitidos.';

        return enviarError(res, 413, CODIGOS.FORMATO_AUDIO_INVALIDO, mensaje);
      }

      if (error) {
        return enviarError(
          res,
          400,
          CODIGOS.FORMATO_AUDIO_INVALIDO,
          'No fue posible procesar los archivos enviados.'
        );
      }

      next();
    });
  },
  controlador.sincronizar
);

module.exports = router;
