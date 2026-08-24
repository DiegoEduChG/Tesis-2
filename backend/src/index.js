// backend/src/index.js
//
// Punto de entrada del backend de NampiVoz.
// Por ahora solo expone GET /api/salud, que confirma que el servidor
// está corriendo y que la conexión a la base de datos MySQL funciona.
// Los controladores de metadatos, transcripciones, grabaciones y votos
// se agregan sobre esta misma base en las siguientes tareas del OE2 y OE3.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// GET /api/salud
// Verifica que el servidor responde y que puede consultar la base de
// datos. Útil para descartar problemas de configuración (.env mal
// escrito, credenciales incorrectas, servicio MySQL detenido) antes de
// empezar a depurar la lógica de negocio.
app.get('/api/salud', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');

    res.status(200).json({
      estado: 'ok',
      db: rows[0].ok === 1 ? 'conectada' : 'sin respuesta',
    });
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error.message);

    res.status(503).json({
      error: true,
      codigo: 'ERROR_BASE_DE_DATOS',
      mensaje: 'No fue posible conectar con la base de datos.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor NampiVoz escuchando en http://localhost:${PORT}`);
});
