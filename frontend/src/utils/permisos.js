// Excepción puntual: el área de sistemas administra el módulo de Usuarios
// aunque su rol en el sistema sea colaborador.
export const GESTOR_USUARIOS_ID = '204862';

export function esGestorUsuarios(usuario) {
  return usuario?.numero_empleado === GESTOR_USUARIOS_ID;
}
