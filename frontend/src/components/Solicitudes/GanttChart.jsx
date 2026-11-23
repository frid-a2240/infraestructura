import { useState, useMemo } from 'react';
import { CheckCircle2, PauseCircle, AlertTriangle, Activity } from 'lucide-react';
import { PRIORIDAD_STYLES } from '../UI/Badge.jsx';
import EmptyState from '../UI/EmptyState.jsx';
import { fechaLocal, diasEntre } from '../../utils/fechas.js';
import { tituloDe } from '../../utils/actividad.js';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const INICIAL_DIA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const DIA_MS = 86400000;

const STRIPES = {
  backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.55) 0, rgba(255,255,255,0.55) 4px, transparent 4px, transparent 8px)',
};

const BARRA_BASE = {
  alta: 'bg-rose-100 border-rose-200',
  media: 'bg-amber-100 border-amber-200',
  baja: 'bg-sky-100 border-sky-200',
};

const ESTADOS = {
  en_curso: { label: 'En curso', icon: Activity, chip: 'bg-isp-teal/10 text-isp-teal border-isp-teal/30' },
  vencida: { label: 'Vencida', icon: AlertTriangle, chip: 'bg-red-50 text-red-700 border-red-200' },
  pausada: { label: 'En pausa', icon: PauseCircle, chip: 'bg-sky-50 text-sky-700 border-sky-200' },
  completada: { label: 'Completada', icon: CheckCircle2, chip: 'bg-slate-100 text-slate-600 border-slate-200' },
};
const ORDEN_ESTADO = { vencida: 0, en_curso: 1, pausada: 2, completada: 3 };

function inicioDeHoy() {
  const h = new Date();
  return new Date(h.getFullYear(), h.getMonth(), h.getDate());
}

function corta(fechaISO) {
  return fechaLocal(fechaISO).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function estadoDe(actividad, hoy) {
  if (actividad.completada) return 'completada';
  if (actividad.pausada) return 'pausada';
  if (fechaLocal(actividad.fecha_objetivo) < hoy) return 'vencida';
  return 'en_curso';
}

export default function GanttChart({ actividades }) {
  const hoy = inicioDeHoy();
  const [cursor, setCursor] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));

  const mesInicio = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const mesFin = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const totalDias = mesFin.getDate();

  const cambiarMes = (delta) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  const dias = useMemo(
    () => Array.from({ length: totalDias }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
    [cursor, totalDias]
  );

  const filas = useMemo(() => {
    const indice = (d) => Math.round((d - mesInicio) / DIA_MS);
    return actividades
      .filter((a) => a.fecha_objetivo)
      .map((a) => {
        const finISO = (a.fecha_fin || a.fecha_objetivo).slice(0, 10);
        let inicioISO = (a.fecha_inicio || a.fecha_aprobacion || finISO).slice(0, 10);
        if (inicioISO > finISO) inicioISO = finISO;
        const idxInicio = indice(fechaLocal(inicioISO));
        const idxFin = indice(fechaLocal(finISO));
        return {
          ...a,
          inicioISO,
          finISO,
          estado: estadoDe(a, hoy),
          avance: a.completada ? 100 : a.avance ?? 0,
          idxInicio,
          idxFin,
        };
      })
      .filter((a) => a.idxFin >= 0 && a.idxInicio <= totalDias - 1)
      .sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || a.finISO.localeCompare(b.finISO));
  }, [actividades, cursor, totalDias]);

  const hoyIdx = Math.round((hoy - mesInicio) / DIA_MS);
  const hoyEnMes = hoyIdx >= 0 && hoyIdx < totalDias;
  const pct = (i) => (i / totalDias) * 100;

  const fondoDias = (
    <div className="absolute inset-0 flex pointer-events-none">
      {dias.map((d, i) => {
        const finDeSemana = d.getDay() === 0 || d.getDay() === 6;
        return (
          <div
            key={i}
            className={`flex-1 border-r border-slate-100 ${i === hoyIdx ? 'bg-isp-teal/10' : finDeSemana ? 'bg-slate-50' : ''}`}
          />
        );
      })}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div
        className="flex items-center justify-between px-3 sm:px-6 py-4"
        style={{ background: 'linear-gradient(135deg, #24334A 0%, #1B2638 100%)' }}
      >
        <button onClick={() => cambiarMes(-1)} className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition text-lg">
          ‹
        </button>
        <span className="text-white font-bold text-lg tracking-wide">
          {MESES[cursor.getMonth()]} <span className="text-isp-tealLight">{cursor.getFullYear()}</span>
        </span>
        <button onClick={() => cambiarMes(1)} className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition text-lg">
          ›
        </button>
      </div>

      <p className="px-4 sm:px-6 py-3 text-xs text-slate-500 border-b border-slate-100 bg-slate-50/60">
        Cada renglón es una actividad aprobada. La <strong>barra</strong> va de su fecha de inicio a su fecha de terminación
        y la <strong>parte rellena</strong> es cuánto lleva de avance. La columna resaltada es el día de hoy.
      </p>

      {filas.length === 0 ? (
        <EmptyState title="Sin actividades este mes" subtitle="No hay solicitudes aprobadas que caigan en este rango de fechas." />
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="flex border-b border-slate-200">
              <div className="w-64 shrink-0 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-end">
                Actividad
              </div>
              <div className="flex-1 flex">
                {dias.map((d, i) => {
                  const esHoy = i === hoyIdx;
                  const finDeSemana = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div key={i} className={`flex-1 text-center py-1.5 ${finDeSemana && !esHoy ? 'bg-slate-50' : ''}`}>
                      <div className={`text-[9px] font-semibold ${esHoy ? 'text-isp-teal' : 'text-slate-400'}`}>
                        {esHoy ? 'HOY' : INICIAL_DIA[d.getDay()]}
                      </div>
                      <div
                        className={`mx-auto mt-0.5 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-semibold ${
                          esHoy ? 'bg-isp-teal text-white' : 'text-slate-600'
                        }`}
                      >
                        {d.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filas.map((a) => {
                const estilo = PRIORIDAD_STYLES[a.prioridad] || PRIORIDAD_STYLES.media;
                const estado = ESTADOS[a.estado];
                const EstadoIcon = estado.icon;
                const completada = a.estado === 'completada';
                const continuaAntes = a.idxInicio < 0;
                const continuaDespues = a.idxFin > totalDias - 1;
                const ini = Math.max(0, a.idxInicio);
                const fin = Math.min(totalDias - 1, a.idxFin);
                const duracion = diasEntre(a.inicioISO, a.finISO);
                const detalleFechas = completada
                  ? `${corta(a.inicioISO)} → terminó el ${corta(a.finISO)}`
                  : `${corta(a.inicioISO)} → ${corta(a.finISO)} · ${duracion} día${duracion === 1 ? '' : 's'}`;

                return (
                  <div key={a.id} className="flex items-stretch hover:bg-slate-50/50">
                    <div className="w-64 shrink-0 px-4 py-2.5 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${estilo.dot}`} title={`Prioridad ${estilo.label.toLowerCase()}`} />
                        <p className="text-xs font-semibold text-slate-700 truncate" title={tituloDe(a)}>
                          {tituloDe(a)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${estado.chip}`}>
                          <EstadoIcon size={10} /> {estado.label}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">{a.area}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {detalleFechas}
                        {!completada && <span className="font-semibold text-slate-600"> · {a.avance}% avance</span>}
                      </p>
                    </div>

                    <div className="flex-1 relative min-h-[64px]">
                      {fondoDias}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 h-6 border overflow-hidden z-10 ${
                          completada ? 'bg-slate-200 border-slate-300' : BARRA_BASE[a.prioridad] || BARRA_BASE.media
                        } ${continuaAntes ? 'rounded-l-none border-l-0' : 'rounded-l-md'} ${
                          continuaDespues ? 'rounded-r-none border-r-0' : 'rounded-r-md'
                        }`}
                        style={{ left: `${pct(ini)}%`, width: `${pct(fin - ini + 1)}%` }}
                        title={`${tituloDe(a)} · ${a.area}\n${detalleFechas}\n${estado.label}${completada ? '' : ` · ${a.avance}% de avance`}`}
                      >
                        <div
                          className={`h-full ${completada ? 'bg-slate-400' : estilo.bar}`}
                          style={{ width: `${a.avance}%`, ...(a.estado === 'pausada' ? STRIPES : {}) }}
                        />
                        {(fin - ini + 1) >= 3 && (
                          <span
                            className={`absolute inset-y-0 flex items-center text-[10px] font-bold ${
                              a.avance >= 50 ? 'left-1.5 text-white' : 'right-1.5 text-slate-600'
                            }`}
                          >
                            {completada ? '✓' : `${a.avance}%`}
                          </span>
                        )}
                      </div>
                      {continuaAntes && (
                        <span className="absolute left-0.5 top-1/2 -translate-y-1/2 z-20 text-[10px] text-slate-500 font-bold" title="Empezó el mes anterior">‹</span>
                      )}
                      {continuaDespues && (
                        <span className="absolute right-0.5 top-1/2 -translate-y-1/2 z-20 text-[10px] text-slate-500 font-bold" title="Continúa el mes siguiente">›</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-3 border-t border-slate-100 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="relative w-8 h-3 rounded-sm bg-amber-100 border border-amber-200 overflow-hidden">
            <span className="absolute inset-y-0 left-0 w-1/2 bg-amber-500" />
          </span>
          Periodo planeado · relleno = avance
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-8 h-3 rounded-sm bg-sky-500 opacity-80" style={STRIPES} /> En pausa
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-8 h-3 rounded-sm bg-slate-400" /> Completada (hasta el día real de cierre)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-isp-teal/20 border border-isp-teal/40" /> Hoy
        </span>
        <span className="flex items-center gap-3 sm:ml-auto">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Alta</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Media</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500" /> Baja</span>
        </span>
      </div>
    </div>
  );
}
