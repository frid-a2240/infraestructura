import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { GESTOR_USUARIOS_ID } from '../utils/permisos.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ detail: 'No autenticado' });
  }
  try {
    req.user = jwt.verify(token, env.jwt.secret);
    return next();
  } catch {
    return res.status(401).json({ detail: 'Sesión inválida o expirada' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ detail: 'No tienes permiso para esta acción' });
    }
    return next();
  };
}

// El módulo de Usuarios es exclusivo del área de sistemas (GESTOR_USUARIOS_ID),
// ni siquiera los administradores entran aquí.
export function requireGestionUsuarios(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ detail: 'No autenticado' });
  }
  if (req.user.numero_empleado === GESTOR_USUARIOS_ID) {
    return next();
  }
  return res.status(403).json({ detail: 'No tienes permiso para esta acción' });
}
