// backend/src/config/db.js
//
// Pool de conexiones a la base de datos "nampivoz".
// Se usa mysql2/promise para poder trabajar con async/await en los
// controladores, en lugar de callbacks.

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
