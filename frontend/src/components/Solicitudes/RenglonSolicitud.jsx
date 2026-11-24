import { ChevronDown, GripVertical, UserRound } from 'lucide-react';
import { EstadoBadge, PRIORIDAD_STYLES } from '../UI/Badge.jsx';
import ProgressBar from '../UI/ProgressBar.jsx';
import { EsperaInfo, rangoTexto } from './SolicitudCard.jsx';
import { esActividadAdmin } from '../../utils/actividad.js';

export default function RenglonSolicitud({ solicitud, expandido, resaltado, onToggle, arrastre, children }) {
  const estilo = PRIORIDAD_STYLES[solicitud.prioridad] || PRIORIDAD_STYLES.media;
  const activa = solicitud.estado === 'aprobada' && !solicitud.completada;
  const rango = activa ? rangoTexto(solicitud) : null;
  const sinFecha = activa && !solicitud.fecha_objetivo;
  const deAdmin = esActividadAdmin(solicitud);

  const borde = resaltado
    ? 'border-isp-teal ring-2 ring-isp-teal/40 shadow-md'
    : expandido
    ? 'border-slate-300 shadow-md'
    : 'border-slate-200 hover:shadow-sm';

  return (
    <div
      id={`solicitud-${solicitud.id}`}
      onDragOver={arrastre?.onDragOver}
      onDrop={arrastre?.onDrop}
      className={`rounded-xl border bg-white transition-all scroll-mt-24 ${borde} ${arrastre?.arrastrando ? 'opacity-40' : ''}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        draggable={!!arrastre}
        onDragStart={arrastre?.onDragStart}
        onDragEnd={arrastre?.onDragEnd}
        className={`flex items-center gap-3 px-3 py-2.5 select-none ${arrastre ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
      >
        {arrastre && (
          // En pantallas táctiles no se puede arrastrar; ahí la prioridad se cambia al abrir el renglón.
          <span className="text-slate-400 hover:text-isp-teal shrink-0 [@media(pointer:coarse)]:hidden" title="Arrastra para cambiar el orden">
            <GripVertical size={16} />
          </span>
        )}
        <span className={`w-1 self-stretch rounded-full shrink-0 ${estilo.bar}`} />

        <div className="min-w-0 flex-1">
          {deAdmin ? (
            <p className={`text-sm font-semibold text-isp-navy ${expandido ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
              {solicitud.explicacion}
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-isp-navy truncate">
                {solicitud.nombre_solicitante} <span className="font-normal text-slate-400">· {solicitud.area}</span>
              </p>
              <p className={`text-xs text-slate-500 ${expandido ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
                {solicitud.explicacion}
              </p>
            </>
          )}
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <span
              className={`inline-flex items-center gap-1 text-[11px] ${
                solicitud.responsable_nombre ? 'text-slate-600 font-medium' : 'text-slate-400 italic'
              }`}
            >
              <UserRound size={11} /> {solicitud.responsable_nombre || 'Sin responsable'}
            </span>
            {deAdmin && <span className="text-[11px] text-slate-400">· {solicitud.area}</span>}
          </div>
          <div className="lg:hidden flex items-center gap-x-2 gap-y-0.5 flex-wrap mt-0.5">
            {activa && <span className="sm:hidden text-[11px] font-semibold text-slate-600">{solicitud.avance ?? 0}% avance</span>}
            {rango && <span className="text-[11px] text-slate-500">{rango}</span>}
            {sinFecha && <span className="text-[11px] text-slate-400 italic">Sin fecha compromiso</span>}
            <EsperaInfo solicitud={solicitud} />
          </div>
        </div>

        <div className="hidden lg:flex flex-col items-end gap-0.5 w-56 shrink-0 text-right">
          {rango && <span className="text-[11px] text-slate-500 truncate max-w-full">{rango}</span>}
          {sinFecha && <span className="text-[11px] text-slate-400 italic">Sin fecha compromiso</span>}
          <EsperaInfo solicitud={solicitud} />
        </div>

        {activa && (
          <div className="hidden sm:flex items-center gap-2 w-24 lg:w-28 shrink-0">
            <ProgressBar value={solicitud.avance ?? 0} colorClass={estilo.bar} pausada={solicitud.pausada} height="h-1.5" />
            <span className="text-[11px] font-semibold text-slate-500 w-8 text-right">{solicitud.avance ?? 0}%</span>
          </div>
        )}

        <span className="hidden lg:inline-flex shrink-0">
          <EstadoBadge solicitud={solicitud} />
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${expandido ? 'rotate-180' : ''}`} />
      </div>

      {expandido && <div className="border-t border-slate-100 px-4 py-4 cursor-auto">{children}</div>}
    </div>
  );
}
