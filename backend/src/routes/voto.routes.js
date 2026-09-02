// backend/src/routes/voto.routes.js

const express = require('express');
const controlador = require('../controllers/validacion.controller');

const router = express.Router();

// POST /api/votos → Emitir voto (RF20, RF28, RF35, RF37)
router.post('/', controlador.emitirVoto);

module.exports = router;
