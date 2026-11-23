import crypto from 'crypto';

// Código de 6 dígitos de un solo uso para recuperar contraseña por correo.
export function generarCodigo() {
  const n = crypto.randomInt(100000, 1000000);
  return String(n);
}
