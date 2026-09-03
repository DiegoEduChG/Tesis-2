// backend/scripts/crear-admin.js
//
// Crea o actualiza la cuenta de administrador con la contraseña
// hasheada mediante bcrypt.
//
// Uso:
//   node scripts/crear-admin.js <usuario> <contraseña>
//
// Ejemplo:
//   node scripts/crear-admin.js admin MiClaveSegura2026
//
// La contraseña nunca se almacena en texto plano: solo se guarda su
// hash, conforme al atributo de seguridad definido en el ERS §3.6.1.

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../src/config/db');

// Número de rondas del algoritmo. Cada incremento duplica el tiempo de
// cálculo, lo que encarece proporcionalmente un ataque por fuerza
// bruta sobre los hashes en caso de filtración de la base de datos.
const RONDAS_BCRYPT = 10;

async function main() {
  const [usuario, contrasena] = process.argv.slice(2);

  if (!usuario || !contrasena) {
    console.error('Uso: node scripts/crear-admin.js <usuario> <contraseña>');
    process.exit(1);
  }

  if (contrasena.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  try {
    const hash = await bcrypt.hash(contrasena, RONDAS_BCRYPT);

    await pool.query(
      `INSERT INTO administrador (usuario, password_hash)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
      [usuario, hash]
    );

    console.log(`Cuenta de administrador "${usuario}" creada o actualizada.`);
  } catch (error) {
    console.error('Error al crear la cuenta:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
