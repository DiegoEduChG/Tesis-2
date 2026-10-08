// backend/src/index.js
//
// Punto de entrada del backend de NampiVoz.
//
// Rutas disponibles:
//   GET  /api/salud             Verificación de servidor y base de datos
//   GET  /api/metadatos/:dni    Consultar hablante por DNI      (DDS 3.4.4.1)
//   POST /api/metadatos         Registrar hablante              (DDS 3.4.4.2)
//   El resto se monta desde los módulos de rutas.

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const almacenamiento = require('./services/almacenamiento');
const { CODIGOS, enviarError } = require('./utils/errores');

const metadatosRoutes = require('./routes/metadatos.routes');
const transcripcionRoutes = require('./routes/transcripcion.routes');
const grabacionRoutes = require('./routes/grabacion.routes');
const sincronizacionRoutes = require('./routes/sincronizacion.routes');
const votoRoutes = require('./routes/voto.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------
// Confianza en el proxy inverso
// ---------------------------------------------------------------------
// En despliegue las peticiones no llegan directamente del navegador:
// atraviesan CloudFront y nginx. Sin esta línea, Express atribuiría
// todas las peticiones a la dirección del proxy y consideraría que
// llegan por HTTP, lo que falsearía cualquier registro y dejaría
// inservible una eventual limitación de tasa por dirección de origen.
app.set('trust proxy', 1);

// ---------------------------------------------------------------------
// Control de acceso entre orígenes
// ---------------------------------------------------------------------
// En desarrollo el frontend corre en el puerto 5173 y la API en el
// 3000: son orígenes distintos y el permiso resulta necesario.
//
// En despliegue ambos se sirven desde el mismo dominio de CloudFront y
// no hay petición entre orígenes que autorizar. La variable
// ORIGEN_PERMITIDO acota el permiso en ese caso, en lugar de dejarlo
// abierto a cualquier sitio.
const origenPermitido = process.env.ORIGEN_PERMITIDO;
app.use(cors(origenPermitido ? { origin: origenPermitido } : undefined));

app.use(express.json());

// ---------------------------------------------------------------------
// Audio almacenado localmente
// ---------------------------------------------------------------------
// Solo se expone cuando el almacenamiento es el disco del servidor. Con
// S3 configurado, las grabaciones se sirven desde CloudFront y esta
// ruta no debe existir.
if (!almacenamiento.USA_S3) {
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
}

// ---------------------------------------------------------------------
// Verificación de salud
// ---------------------------------------------------------------------
// Informa además del modo de almacenamiento activo. Durante el
// despliegue es la forma más rápida de confirmar que el servidor tomó
// la configuración esperada y no arrancó en modo de desarrollo.
app.get('/api/salud', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');

    res.status(200).json({
      estado: 'ok',
      db: rows[0].ok === 1 ? 'conectada' : 'sin respuesta',
      almacenamiento: almacenamiento.modoAlmacenamiento(),
      entorno: process.env.NODE_ENV || 'development',
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
app.use('/api/admin', adminRoutes);

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
  const donde = process.env.URL_PUBLICA || `http://localhost:${PORT}`;
  console.log(`Servidor NampiVoz escuchando en el puerto ${PORT}`);
  console.log(`  Publicado en   : ${donde}`);
  console.log(`  Almacenamiento : ${almacenamiento.modoAlmacenamiento()}`);
});
