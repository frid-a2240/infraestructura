import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { nombreCortoLibre } from '../utils/nombre.js';
import { generarCodigo } from '../utils/codigoVerificacion.js';
import { notificarCodigoRecuperacion, notificarCodigoVisitante } from '../services/email.service.js';

const CODIGO_VIGENCIA_MIN = 15;
const CODIGO_VISITANTE_MIN = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MSG_CORREO_EMPLEADO = 'Este correo pertenece a una cuenta de personal ISP. Entra con tu número de control y contraseña.';
const MSG_VISITANTE_INACTIVO = 'Tu acceso como visitante está desactivado. Contacta al equipo de administración.';

function enmascararEmail(email) {
  const [usuario, dominio] = email.split('@');
  if (!dominio) return email;
  const visible = usuario.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(1, usuario.length - visible.length))}@${dominio}`;
}

function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol, numero_empleado: usuario.numero_empleado },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

function usuarioPublico(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    nombre_corto: usuario.nombre_corto || usuario.nombre,
    email: usuario.email,
    area: usuario.area,
    rol: usuario.rol,
    numero_empleado: usuario.numero_empleado,
  };
}

export async function login(req, res) {
  const { identificador, password } = req.body;
  if (!identificador || !password) {
    return res.status(400).json({ detail: 'Ingresa tu número de control (o correo) y contraseña' });
  }

  const { rows } = await pool.query(
    'SELECT * FROM usuarios WHERE (numero_empleado = $1 OR email = $1) AND activo = true',
    [identificador]
  );
  const usuario = rows[0];
  if (!usuario) {
    return res.status(401).json({ detail: 'No reconocemos ese número de control o correo' });
  }
  if (usuario.rol === 'invitado') {
    return res.status(400).json({ detail: 'Los visitantes entran sin contraseña desde "¿Eres visitante? Entra aquí".' });
  }

  const coincide = await bcrypt.compare(password, usuario.password_hash);
  if (!coincide) {
    return res.status(401).json({ detail: 'Contraseña incorrecta' });
  }

  if (usuario.primera_vez) {
    return res.json({ primera_vez: true, nombre: usuario.nombre, nombre_corto: usuario.nombre_corto || usuario.nombre });
  }

  const token = firmarToken(usuario);
  return res.json({ token, usuario: usuarioPublico(usuario) });
}

export async function completarRegistro(req, res) {
  const { numero_empleado, password_nueva, email } = req.body;
  const correo = (email || '').trim().toLowerCase();
  const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

  if (!numero_empleado || !password_nueva || password_nueva.length < 6) {
    return res.status(400).json({ detail: 'Datos inválidos (mínimo 6 caracteres)' });
  }
  if (!correoValido) {
    return res.status(400).json({ detail: 'Ingresa un correo válido; lo usamos si alguna vez olvidas tu contraseña.' });
  }

  const { rows } = await pool.query('SELECT * FROM usuarios WHERE numero_empleado = $1', [numero_empleado]);
  const usuario = rows[0];
  if (!usuario || !usuario.primera_vez) {
    return res.status(400).json({ detail: 'No es posible completar el registro para este usuario' });
  }

  const enUso = await pool.query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [correo, usuario.id]);
  if (enUso.rows.length > 0) {
    return res.status(409).json({ detail: 'Ese correo ya está registrado en otra cuenta.' });
  }

  const hash = await bcrypt.hash(password_nueva, 10);
  await pool.query(
    'UPDATE usuarios SET password_hash = $1, primera_vez = false, email = $2 WHERE id = $3',
    [hash, correo, usuario.id]
  );

  const actualizado = { ...usuario, primera_vez: false, email: correo };
  const token = firmarToken(actualizado);
  return res.json({ token, usuario: usuarioPublico(actualizado) });
}

export async function solicitarCodigoRecuperacion(req, res) {
  const { identificador } = req.body;
  if (!identificador) {
    return res.status(400).json({ detail: 'Ingresa tu número de control o correo' });
  }

  const { rows } = await pool.query(
    'SELECT * FROM usuarios WHERE (numero_empleado = $1 OR email = $1) AND activo = true',
    [identificador.trim()]
  );
  const usuario = rows[0];
  if (!usuario) {
    return res.status(404).json({ detail: 'No reconocemos ese número de control o correo' });
  }
  if (usuario.rol === 'invitado') {
    return res.status(400).json({ detail: 'Los visitantes no usan contraseña: entra desde "¿Eres visitante? Entra aquí".' });
  }
  if (!usuario.email) {
    return res.status(400).json({
      detail: 'Esta cuenta no tiene un correo registrado todavía. Pide a un administrador que te restablezca la contraseña.',
    });
  }

  const codigo = generarCodigo();
  const hash = await bcrypt.hash(codigo, 10);
  await pool.query(
    `UPDATE usuarios SET codigo_recuperacion_hash = $1,
            codigo_recuperacion_expira = now() + interval '${CODIGO_VIGENCIA_MIN} minutes'
     WHERE id = $2`,
    [hash, usuario.id]
  );

  await notificarCodigoRecuperacion(usuario, codigo, CODIGO_VIGENCIA_MIN);

  return res.json({ ok: true, email_enmascarado: enmascararEmail(usuario.email) });
}

export async function confirmarRecuperacion(req, res) {
  const { identificador, codigo, password_nueva } = req.body;
  if (!identificador || !codigo || !password_nueva || password_nueva.length < 6) {
    return res.status(400).json({ detail: 'Completa el código y una contraseña nueva de al menos 6 caracteres' });
  }

  const { rows } = await pool.query(
    'SELECT * FROM usuarios WHERE (numero_empleado = $1 OR email = $1) AND activo = true',
    [identificador.trim()]
  );
  const usuario = rows[0];
  if (!usuario || !usuario.codigo_recuperacion_hash || !usuario.codigo_recuperacion_expira) {
    return res.status(400).json({ detail: 'Solicita un código nuevo antes de continuar.' });
  }
  if (new Date(usuario.codigo_recuperacion_expira) < new Date()) {
    return res.status(400).json({ detail: 'Ese código ya expiró, solicita uno nuevo.' });
  }

  const coincide = await bcrypt.compare(codigo, usuario.codigo_recuperacion_hash);
  if (!coincide) {
    return res.status(400).json({ detail: 'Código incorrecto.' });
  }

  const hash = await bcrypt.hash(password_nueva, 10);
  await pool.query(
    `UPDATE usuarios SET password_hash = $1, primera_vez = false,
            codigo_recuperacion_hash = NULL, codigo_recuperacion_expira = NULL
     WHERE id = $2`,
    [hash, usuario.id]
  );

  const actualizado = { ...usuario, primera_vez: false };
  const token = firmarToken(actualizado);
  return res.json({ token, usuario: usuarioPublico(actualizado) });
}

// Visitantes: entran sin contraseña, con un código de un solo uso que llega a su correo.

async function buscarPorCorreo(correo) {
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE LOWER(email) = $1', [correo]);
  return rows[0];
}

async function enviarCodigoVisitante(usuario) {
  const codigo = generarCodigo();
  const hash = await bcrypt.hash(codigo, 10);
  await pool.query(
    `UPDATE usuarios SET codigo_recuperacion_hash = $1,
            codigo_recuperacion_expira = now() + interval '${CODIGO_VISITANTE_MIN} minutes'
     WHERE id = $2`,
    [hash, usuario.id]
  );
  await notificarCodigoVisitante(usuario, codigo, CODIGO_VISITANTE_MIN);
  return enmascararEmail(usuario.email);
}

export async function visitanteSolicitarCodigo(req, res) {
  const correo = (req.body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(correo)) {
    return res.status(400).json({ detail: 'Ingresa un correo válido' });
  }

  const usuario = await buscarPorCorreo(correo);
  if (!usuario) {
    return res.status(404).json({ detail: 'No te has registrado. Primero regístrate para poder entrar.', no_registrado: true });
  }
  if (usuario.rol !== 'invitado') {
    return res.status(400).json({ detail: MSG_CORREO_EMPLEADO });
  }
  if (!usuario.activo) {
    return res.status(403).json({ detail: MSG_VISITANTE_INACTIVO });
  }

  const email_enmascarado = await enviarCodigoVisitante(usuario);
  return res.json({ ok: true, email_enmascarado });
}

export async function visitanteRegistro(req, res) {
  const nombre = (req.body.nombre || '').trim();
  const area = (req.body.area || '').trim();
  const correo = (req.body.email || '').trim().toLowerCase();
  if (!nombre || !area || !EMAIL_RE.test(correo)) {
    return res.status(400).json({ detail: 'Completa tu nombre, un correo válido y tu área o empresa' });
  }
  if (nombre.length > 150 || area.length > 100 || correo.length > 150) {
    return res.status(400).json({ detail: 'Alguno de los datos es demasiado largo' });
  }

  const existente = await buscarPorCorreo(correo);
  if (existente) {
    if (existente.rol !== 'invitado') {
      return res.status(409).json({ detail: MSG_CORREO_EMPLEADO });
    }
    if (!existente.activo) {
      return res.status(403).json({ detail: MSG_VISITANTE_INACTIVO });
    }
    const email_enmascarado = await enviarCodigoVisitante(existente);
    return res.json({ ok: true, ya_registrado: true, email_enmascarado });
  }

  // La columna exige un hash; se guarda uno aleatorio que nadie conoce porque el visitante no usa contraseña.
  const hashInutilizable = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nombre, nombre_corto, email, area, rol, password_hash, primera_vez)
     VALUES ($1, $2, $3, $4, 'invitado', $5, false)
     RETURNING *`,
    [nombre, nombreCortoLibre(nombre), correo, area, hashInutilizable]
  );

  const email_enmascarado = await enviarCodigoVisitante(rows[0]);
  return res.status(201).json({ ok: true, ya_registrado: false, email_enmascarado });
}

export async function visitanteVerificar(req, res) {
  const correo = (req.body.email || '').trim().toLowerCase();
  const codigo = (req.body.codigo || '').trim();
  if (!EMAIL_RE.test(correo) || !/^\d{6}$/.test(codigo)) {
    return res.status(400).json({ detail: 'Escribe el código de 6 dígitos que te enviamos' });
  }

  const usuario = await buscarPorCorreo(correo);
  if (!usuario || usuario.rol !== 'invitado' || !usuario.activo
      || !usuario.codigo_recuperacion_hash || !usuario.codigo_recuperacion_expira) {
    return res.status(400).json({ detail: 'Solicita un código nuevo antes de continuar.' });
  }
  if (new Date(usuario.codigo_recuperacion_expira) < new Date()) {
    return res.status(400).json({ detail: 'Ese código ya expiró, solicita uno nuevo.' });
  }
  const coincide = await bcrypt.compare(codigo, usuario.codigo_recuperacion_hash);
  if (!coincide) {
    return res.status(400).json({ detail: 'Código incorrecto.' });
  }

  await pool.query(
    'UPDATE usuarios SET codigo_recuperacion_hash = NULL, codigo_recuperacion_expira = NULL WHERE id = $1',
    [usuario.id]
  );

  const token = firmarToken(usuario);
  return res.json({ token, usuario: usuarioPublico(usuario) });
}

export async function yo(req, res) {
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE id = $1', [req.user.id]);
  if (!rows[0]) return res.status(404).json({ detail: 'Usuario no encontrado' });
  return res.json({ usuario: usuarioPublico(rows[0]) });
}
