// backend/src/routes/admin.routes.js
//
// Rutas administrativas. Todas, salvo el inicio de sesión, atraviesan
// el Middleware de Autenticación antes de alcanzar su controlador
// (DDS §2.2.1.2 y §3.2.6).

const express = require('express');
const controlador = require('../controllers/admin.controller');
const { verificarSesion } = require('../middlewares/autenticacion');

const router = express.Router();

// Público: es el endpoint que establece la sesión.
router.post('/sesion', controlador.iniciarSesion);

// A partir de aquí, toda ruta exige una sesión válida.
router.use(verificarSesion);

router.get('/metricas', controlador.obtenerMetricas);

router.get('/metadatos', controlador.listarHablantes);
router.put('/metadatos/:id', controlador.editarHablante);

router.get('/grabaciones', controlador.listarGrabaciones);
router.patch('/grabaciones/:id/estado', controlador.cambiarEstadoGrabacion);
router.delete('/grabaciones/:id', controlador.eliminarGrabacion);

router.get('/exportacion', controlador.exportarCorpus);

module.exports = router;
