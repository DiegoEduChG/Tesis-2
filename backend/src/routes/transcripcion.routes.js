// backend/src/routes/transcripcion.routes.js

const express = require('express');
const controlador = require('../controllers/transcripcion.controller');

const router = express.Router();

// POST /api/transcripciones → Registrar enunciado (RF07, RF11, RF17, RF24)
router.post('/', controlador.registrar);

module.exports = router;
