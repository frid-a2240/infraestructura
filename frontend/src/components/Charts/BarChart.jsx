import { useRef, useState } from 'react';
import ChartTooltip from './ChartTooltip.jsx';

export default function BarChart({ items, defaultColor = '#00AFAA', vacio = 'Sin datos todavía.' }) {
  const contenedorRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const max = Math.max(1, ...items.map((i) => i.value));
  const sinDatos = items.length === 0 || items.every((i) => i.value === 0);

  const mostrarTooltip = (e, item) => {
    const cont = contenedorRef.current?.getBoundingClientRect();
    const fila = e.currentTarget.getBoundingClientRect();
    if (!cont) return;
    setTooltip({
      x: fila.left - cont.left + fila.width / 2,
      y: fila.top - cont.top,
      label: item.label,
      value: item.value,
    });
  };

  if (sinDatos) {
    return <p className="text-sm text-slate-400 py-6 text-center">{vacio}</p>;
  }

  return (
    <div ref={contenedorRef} className="relative space-y-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3"
          onMouseEnter={(e) => mostrarTooltip(e, item)}
          onMouseMove={(e) => mostrarTooltip(e, item)}
          onMouseLeave={() => setTooltip(null)}
        >
          <span className="w-24 shrink-0 text-xs font-medium text-slate-600 truncate" title={item.label}>
            {item.label}
          </span>
          <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(4, (item.value / max) * 100)}%`,
                backgroundColor: item.color || defaultColor,
              }}
            />
          </div>
          <span className="w-6 shrink-0 text-xs font-semibold text-slate-500 text-right">{item.value}</span>
        </div>
      ))}
      {tooltip && (
        <ChartTooltip x={tooltip.x} y={tooltip.y}>
          <strong>{tooltip.value}</strong> · {tooltip.label}
        </ChartTooltip>
      )}
    </div>
  );
}
