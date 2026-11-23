import { useEffect, useState } from 'react';
import { diasEntre, esFechaISO, sumarDias } from '../../utils/fechas.js';

const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white';
const labelCls = 'block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1';

// Inicio, terminación y duración están ligados: cambiar la duración mueve la fecha de
// terminación, y cambiar cualquiera de las fechas recalcula la duración.
export default function RangoFechas({ inicio, fin, onChange, minInicio }) {
  const rangoValido = esFechaISO(inicio) && esFechaISO(fin) && inicio <= fin;
  const [duracion, setDuracion] = useState(rangoValido ? String(diasEntre(inicio, fin)) : '');

  useEffect(() => {
    if (rangoValido) setDuracion(String(diasEntre(inicio, fin)));
  }, [inicio, fin, rangoValido]);

  const cambiarInicio = (nuevoInicio) => {
    const dias = Number(duracion);
    if (esFechaISO(nuevoInicio) && dias >= 1) {
      onChange({ inicio: nuevoInicio, fin: sumarDias(nuevoInicio, dias - 1) });
    } else {
      onChange({ inicio: nuevoInicio, fin });
    }
  };

  const cambiarDuracion = (valor) => {
    setDuracion(valor);
    const dias = Number(valor);
    if (esFechaISO(inicio) && Number.isInteger(dias) && dias >= 1 && dias <= 730) {
      onChange({ inicio, fin: sumarDias(inicio, dias - 1) });
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
      <label>
        <span className={labelCls}>Fecha de inicio</span>
        <input type="date" min={minInicio} value={inicio} onChange={(e) => cambiarInicio(e.target.value)} className={inputCls} />
      </label>
      <label>
        <span className={labelCls}>Fecha de terminación</span>
        <input
          type="date"
          min={esFechaISO(inicio) ? inicio : minInicio}
          value={fin}
          onChange={(e) => onChange({ inicio, fin: e.target.value })}
          className={inputCls}
        />
      </label>
      <label>
        <span className={labelCls}>Duración (días)</span>
        <input
          type="number"
          min="1"
          max="730"
          placeholder="Ej. 5"
          value={duracion}
          onChange={(e) => cambiarDuracion(e.target.value)}
          className={inputCls}
        />
      </label>
      {esFechaISO(inicio) && esFechaISO(fin) && inicio > fin && (
        <p className="sm:col-span-3 text-xs text-red-600">La fecha de inicio no puede ser posterior a la de terminación.</p>
      )}
    </div>
  );
}
