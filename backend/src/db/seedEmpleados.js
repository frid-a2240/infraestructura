import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { formatearNombreNomina, titleCaseArea } from '../utils/nombre.js';
import { PASSWORD_GENERICA_COLABORADOR } from '../utils/passwordGenerica.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const raw = fs.readFileSync(path.join(__dirname, 'empleados_isp.json'), 'utf8');
  const empleados = JSON.parse(raw);

  const passwordHash = await bcrypt.hash(PASSWORD_GENERICA_COLABORADOR, 10);

  let creados = 0;
  let actualizados = 0;

  for (const emp of empleados) {
    const { nombreCompleto, nombreCorto } = formatearNombreNomina(emp.nombre);
    const area = emp.departamento ? titleCaseArea(emp.departamento) : null;

    const { rows } = await pool.query(
      `INSERT INTO usuarios (numero_empleado, nombre, nombre_corto, area, rol, password_hash, primera_vez)
       VALUES ($1, $2, $3, $4, 'colaborador', $5, true)
       ON CONFLICT (numero_empleado) DO UPDATE
         SET nombre = EXCLUDED.nombre, nombre_corto = EXCLUDED.nombre_corto, area = EXCLUDED.area
       RETURNING (xmax = 0) AS es_nuevo`,
      [emp.clave, nombreCompleto, nombreCorto, area, passwordHash]
    );
    if (rows[0].es_nuevo) creados++;
    else actualizados++;
  }

  console.log(`Empleados sembrados: ${creados} nuevos, ${actualizados} actualizados (de ${empleados.length} en el archivo).`);
  if (creados > 0) {
    console.log(`Las cuentas nuevas quedaron con la contraseña genérica "${PASSWORD_GENERICA_COLABORADOR}" y se les pedirá crear la suya en su primer ingreso.`);
  }

  await pool.end();
}

run().catch((err) => {
  console.error('Error sembrando empleados:', err);
  process.exit(1);
});
