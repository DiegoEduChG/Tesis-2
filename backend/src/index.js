// backend/src/index.js
//
// Punto de entrada del backend de NampiVoz.
//
// Rutas disponibles:
//   GET  /api/salud             Verificación de servidor y base de datos
//   GET  /api/metadatos/:dni    Consultar hablante por DNI      (DDS 3.4.4.1)
//   POST /api/metadatos         Registrar hablante              (DDS 3.4.4.2)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const { CODIGOS, enviarError } = require('./utils/errores');

const metadatosRoutes = require('./routes/metadatos.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------
// Verificación de salud
// ---------------------------------------------------------------------
app.get('/api/salud', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');

    res.status(200).json({
      estado: 'ok',
      db: rows[0].ok === 1 ? 'conectada' : 'sin respuesta',
    });
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error.message);

    return enviarError(
      res,
      503,
      CODIGOS.ERROR_INTERNO,
      'No fue posible conectar con la base de datos.'
    );
  }
});

// ---------------------------------------------------------------------
// Módulos del sistema
// ---------------------------------------------------------------------
app.use('/api/metadatos', metadatosRoutes);

// ---------------------------------------------------------------------
// Ruta no encontrada
// ---------------------------------------------------------------------
app.use((req, res) => {
  return enviarError(
    res,
    404,
    CODIGOS.RECURSO_NO_ENCONTRADO,
    'La ruta solicitada no existe.'
  );
});

app.listen(PORT, () => {
  console.log(`Servidor NampiVoz escuchando en http://localhost:${PORT}`);
});