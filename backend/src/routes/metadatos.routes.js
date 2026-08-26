// backend/src/routes/metadatos.routes.js
//
// Rutas del módulo de metadatos. Corresponde al Router (Gestor de
// Endpoints) descrito en el DDS, sección 2.2.1.2, que recibe las
// peticiones HTTP y las delega al controlador especializado.

const express = require('express');
const controlador = require('../controllers/metadatos.controller');

const router = express.Router();

// GET /api/metadatos/:dni  → Consultar hablante por DNI (RF05, RF12)
router.get('/:dni', controlador.consultarPorDni);

// POST /api/metadatos      → Registrar hablante (RF05, RF12, RF25)
router.post('/', controlador.registrar);

module.exports = router;
