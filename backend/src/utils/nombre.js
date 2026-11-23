export function titleCaseArea(str) {
  return titleCase(str);
}

function titleCase(str) {
  return str
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Convierte "APELLIDOS, NOMBRES" (formato de nómina) a { nombreCompleto, nombreCorto }
export function formatearNombreNomina(nombreNomina) {
  const [apellidosRaw, nombresRaw] = nombreNomina.split(',');
  const apellidos = titleCase((apellidosRaw || '').trim());
  const nombres = titleCase((nombresRaw || '').trim());
  const primerApellido = apellidos.split(' ')[0] || '';
  const primerNombre = nombres.split(' ')[0] || '';
  return {
    nombreCompleto: `${nombres} ${apellidos}`.trim(),
    nombreCorto: `${primerNombre} ${primerApellido}`.trim(),
  };
}

// Best-effort para nombres escritos libremente (registro de invitados): primer nombre + un apellido
export function nombreCortoLibre(nombreCompleto) {
  const palabras = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (palabras.length <= 2) return palabras.join(' ');
  return `${palabras[0]} ${palabras[palabras.length - 1]}`;
}
