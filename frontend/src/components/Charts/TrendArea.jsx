import { useState } from 'react';
import ChartTooltip from './ChartTooltip.jsx';

const VB_W = 600;
const VB_H = 180;
const PAD = 8;

export default function TrendArea({ items, color = '#00AFAA', vacio = 'Sin datos todavía.' }) {
  const [hover, setHover] = useState(null);

  const sinDatos = items.length === 0;
  const max = Math.max(1, ...items.map((i) => i.value));
  const n = items.length;

  const xAt = (i) => (n <= 1 ? VB_W / 2 : PAD + (i / (n - 1)) * (VB_W - PAD * 2));
  const yAt = (v) => VB_H - PAD - (v / max) * (VB_H - PAD * 2);

  const puntos = items.map((it, i) => ({ x: xAt(i), y: yAt(it.value), ...it }));
  const lineaPath = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${lineaPath} L${puntos[n - 1]?.x ?? 0},${VB_H - PAD} L${puntos[0]?.x ?? 0},${VB_H - PAD} Z`;

  if (sinDatos) {
    return <p className="text-sm text-slate-400 py-6 text-center">{vacio}</p>;
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" className="w-full h-40">
        <line x1={PAD} y1={VB_H - PAD} x2={VB_W - PAD} y2={VB_H - PAD} stroke="#e1e0d9" strokeWidth="1" />
        <path d={areaPath} fill={color} opacity="0.1" stroke="none" />
        <path d={lineaPath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {puntos.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r="4" fill={color} stroke="#ffffff" strokeWidth="2" />
        ))}
        {hover != null && (
          <line x1={puntos[hover].x} y1={PAD} x2={puntos[hover].x} y2={VB_H - PAD} stroke="#c3c2b7" strokeWidth="1" strokeDasharray="3,3" />
        )}
      </svg>

      <div className="absolute inset-0 flex">
        {puntos.map((p, i) => (
          <div
            key={p.label}
            className="flex-1 h-40 cursor-crosshair"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </div>

      <div className="flex mt-1">
        {puntos.map((p) => (
          <span key={p.label} className="flex-1 text-center text-[10px] text-slate-400">
            {p.label}
          </span>
        ))}
      </div>

      {hover != null && (
        <ChartTooltip x={`${(puntos[hover].x / VB_W) * 100}%`} y={`${(puntos[hover].y / VB_H) * 100}%`}>
          <strong>{puntos[hover].value}</strong> · semana del {puntos[hover].label}
        </ChartTooltip>
      )}
    </div>
  );
}
