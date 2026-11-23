import { useState, useMemo } from 'react';
import { fechaLocal, claveFecha, formatoCorto, diasEntre } from '../../utils/fechas.js';
import { tituloDe } from '../../utils/actividad.js';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MAX_DIAS_POR_ACTIVIDAD = 731;

function inicioDeHoy() {
  const h = new Date();
  return new Date(h.getFullYear(), h.getMonth(), h.getDate());
}

function colorActividad(actividad) {
  if (actividad.pausada) return { dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700 border-sky-200' };
  const dias = Math.round((fechaLocal(actividad.fecha_objetivo) - inicioDeHoy()) / 86400000);
  if (dias < 0) return { dot: 'bg-red-500', chip: 'bg-red-50 text-red-700 border-red-200' };
  if (dias <= 15) return { dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { dot: 'bg-isp-teal', chip: 'bg-isp-teal/10 text-isp-teal border-isp-teal/30' };
}

function rangoDe(actividad) {
  const finISO = (actividad.fecha_fin || actividad.fecha_objetivo)?.slice(0, 10);
  if (!finISO) return null;
  let inicioISO = (actividad.fecha_inicio || finISO).slice(0, 10);
  if (inicioISO > finISO) inicioISO = finISO;
  return { inicioISO, finISO };
}

export default function CalendarView({ actividades }) {
  const hoy = inicioDeHoy();
  const [cursor, setCursor] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  // Cada actividad pendiente de terminar se repite en todos los días de su periodo (inicio → terminación).
  const porDia = useMemo(() => {
    const map = new Map();
    for (const a of actividades) {
      if (a.completada) continue;
      const rango = rangoDe(a);
      if (!rango) continue;
      const actividad = { ...a, ...rango };
      const dia = fechaLocal(rango.inicioISO);
      const fin = fechaLocal(rango.finISO);
      for (let i = 0; dia <= fin && i < MAX_DIAS_POR_ACTIVIDAD; i++) {
        const key = claveFecha(dia);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(actividad);
        dia.setDate(dia.getDate() + 1);
      }
    }
    return map;
  }, [actividades]);

  const celdas = useMemo(() => {
    const primerDiaMes = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (primerDiaMes.getDay() + 6) % 7; // semana empieza en lunes
    const inicioGrid = new Date(primerDiaMes);
    inicioGrid.setDate(inicioGrid.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicioGrid);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [cursor]);

  const cambiarMes = (delta) => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
    setDiaSeleccionado(null);
  };

  const irAHoy = () => {
    setCursor(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    setDiaSeleccionado(hoy);
  };

  const actividadesDelDia = diaSeleccionado ? porDia.get(claveFecha(diaSeleccionado)) || [] : [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div
        className="flex items-center justify-between px-3 sm:px-6 py-4"
        style={{ background: 'linear-gradient(135deg, #24334A 0%, #1B2638 100%)' }}
      >
        <button
          onClick={() => cambiarMes(-1)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition text-lg"
        >
          ‹
        </button>
        <button onClick={irAHoy} className="text-white font-bold text-lg tracking-wide hover:opacity-80 transition">
          {MESES[cursor.getMonth()]} <span className="text-isp-tealLight">{cursor.getFullYear()}</span>
        </button>
        <button
          onClick={() => cambiarMes(1)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition text-lg"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100">
        {DIAS.map((d) => (
          <div key={d} className="text-center text-[11px] font-bold uppercase tracking-wide text-slate-400 py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {celdas.map((d, i) => {
          const enMes = d.getMonth() === cursor.getMonth();
          const key = claveFecha(d);
          const evs = porDia.get(key) || [];
          const esHoy = key === claveFecha(hoy);
          const seleccionado = diaSeleccionado && claveFecha(diaSeleccionado) === key;

          return (
            <button
              key={i}
              onClick={() => setDiaSeleccionado(evs.length ? d : null)}
              className={`relative h-20 sm:h-28 overflow-hidden border-b border-r border-slate-100 p-1.5 sm:p-2 text-left align-top transition-colors ${
                enMes ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/60'
              } ${seleccionado ? 'ring-2 ring-inset ring-isp-teal' : ''} ${evs.length ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                  esHoy ? 'bg-isp-navyDark text-white' : enMes ? 'text-slate-600' : 'text-slate-300'
                }`}
              >
                {d.getDate()}
              </span>
              {evs.length > 0 && (
                <>
                  <div className="mt-1 hidden sm:flex flex-col gap-0.5">
                    {evs.slice(0, 3).map((a) => (
                      <span
                        key={a.id}
                        title={`${tituloDe(a)} · ${a.area} (${formatoCorto(a.inicioISO)} → ${formatoCorto(a.finISO)})`}
                        className={`block truncate text-[10px] leading-4 px-1 rounded border ${colorActividad(a).chip} ${
                          enMes ? '' : 'opacity-60'
                        }`}
                      >
                        {tituloDe(a)}
                      </span>
                    ))}
                    {evs.length > 3 && (
                      <span className="text-[9px] text-slate-400 font-semibold">+{evs.length - 3} más</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex sm:hidden flex-wrap gap-1 items-center">
                    {evs.slice(0, 4).map((a) => (
                      <span key={a.id} className={`w-1.5 h-1.5 rounded-full ${colorActividad(a).dot}`} />
                    ))}
                    {evs.length > 4 && <span className="text-[9px] text-slate-400 font-semibold">+{evs.length - 4}</span>}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {diaSeleccionado && (
        <div className="border-t border-slate-100 p-4 bg-slate-50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            {diaSeleccionado.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {actividadesDelDia.length === 0 ? (
            <p className="text-sm text-slate-400">Sin actividades este día.</p>
          ) : (
            <div className="space-y-2">
              {actividadesDelDia.map((a) => {
                const dias = diasEntre(a.inicioISO, a.finISO);
                return (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${colorActividad(a).chip}`}
                  >
                    <span className="min-w-0">
                      <span className="font-medium block truncate">{tituloDe(a)} · {a.area}</span>
                      <span className="text-[11px] opacity-80">
                        {formatoCorto(a.inicioISO)} → {formatoCorto(a.finISO)} · {dias} día{dias === 1 ? '' : 's'}
                      </span>
                    </span>
                    {a.pausada && <span className="text-[10px] font-bold uppercase shrink-0">Pausada</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 px-6 py-3 border-t border-slate-100 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-isp-teal" /> A tiempo</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Próxima (≤15 días)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Vencida</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-500" /> Pausada</span>
      </div>
    </div>
  );
}
