import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ADMINS = [
  { numero_empleado: '203076', nombre: 'Gilberto M.', email: null },
  { numero_empleado: '202244', nombre: 'Juan Lapizco', email: null },
];

const PASSWORD_GENERICA = '123456';

async function run() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Esquema aplicado.');

  const passwordHash = await bcrypt.hash(PASSWORD_GENERICA, 10);

  for (const admin of ADMINS) {
    await pool.query(
      `INSERT INTO usuarios (numero_empleado, nombre, email, rol, password_hash, primera_vez)
       VALUES ($1, $2, $3, 'admin', $4, true)
       ON CONFLICT (numero_empleado) DO NOTHING`,
      [admin.numero_empleado, admin.nombre, admin.email, passwordHash]
    );
  }
  console.log(`Admins listos (contraseña genérica: "${PASSWORD_GENERICA}", se pedirá cambio en el primer login).`);

  await pool.end();
}

run().catch((err) => {
  console.error('Error inicializando la base de datos:', err);
  process.exit(1);
});
