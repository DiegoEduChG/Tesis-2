// backend/src/index.js
//
// Punto de entrada del backend de NampiVoz.
//
// Rutas disponibles:
//   GET  /api/salud             Verificación de servidor y base de datos
//   GET  /api/metadatos/:dni    Consultar hablante por DNI      (DDS 3.4.4.1)
//   POST /api/metadatos         Registrar hablante              (DDS 3.4.4.2)

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const { CODIGOS, enviarError } = require('./utils/errores');

const metadatosRoutes = require('./routes/metadatos.routes');
const transcripcionRoutes = require('./routes/transcripcion.routes');
const grabacionRoutes = require('./routes/grabacion.routes');
const sincronizacionRoutes = require('./routes/sincronizacion.routes');
const votoRoutes = require('./routes/voto.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Sirve los archivos de audio guardados por el servicio de
// almacenamiento local (ver services/almacenamiento.js). Cuando se
// migre a AWS S3, esta línea deja de ser necesaria.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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
app.use('/api/transcripciones', transcripcionRoutes);
app.use('/api/grabaciones', grabacionRoutes);
app.use('/api/sincronizacion', sincronizacionRoutes);
app.use('/api/votos', votoRoutes);

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
