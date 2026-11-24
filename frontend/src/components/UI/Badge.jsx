import { Clock3, CheckCircle2, XCircle, PauseCircle, Flame, Minus, Equal } from 'lucide-react';

export function Badge({ children, className = '', icon: Icon }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${className}`}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}

const ESTADO_STYLES = {
  pendiente: { cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock3, label: 'Pendiente' },
  aprobada: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, label: 'Aprobada' },
  rechazada: { cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, label: 'Rechazada' },
  completada: { cls: 'bg-slate-100 text-slate-500 border-slate-200', icon: CheckCircle2, label: 'Completada' },
  pausada: { cls: 'bg-sky-50 text-sky-700 border-sky-200', icon: PauseCircle, label: 'Pausada' },
};

export function EstadoBadge({ solicitud }) {
  let key = solicitud.estado;
  if (solicitud.estado === 'aprobada' && solicitud.completada) key = 'completada';
  else if (solicitud.estado === 'aprobada' && solicitud.pausada) key = 'pausada';
  const { cls, icon, label } = ESTADO_STYLES[key] || ESTADO_STYLES.pendiente;
  return (
    <Badge className={cls} icon={icon}>
      {label}
    </Badge>
  );
}

export const PRIORIDAD_STYLES = {
  alta: {
    cls: 'bg-rose-50 text-rose-700 border-rose-200',
    header: 'bg-rose-50 text-rose-700 border-b-rose-200',
    icon: Flame,
    label: 'Alta',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
  },
  media: {
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    header: 'bg-amber-50 text-amber-700 border-b-amber-200',
    icon: Equal,
    label: 'Media',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
  },
  baja: {
    cls: 'bg-sky-50 text-sky-700 border-sky-200',
    header: 'bg-sky-50 text-sky-700 border-b-sky-200',
    icon: Minus,
    label: 'Baja',
    dot: 'bg-sky-500',
    bar: 'bg-sky-500',
  },
};

export const OPCIONES_PRIORIDAD = ['alta', 'media', 'baja'].map((value) => ({ value, ...PRIORIDAD_STYLES[value] }));

export function PrioridadBadge({ prioridad }) {
  const estilo = PRIORIDAD_STYLES[prioridad] || PRIORIDAD_STYLES.media;
  return (
    <Badge className={estilo.cls} icon={estilo.icon}>
      {estilo.label}
    </Badge>
  );
}
