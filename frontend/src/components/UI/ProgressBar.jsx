const STRIPES = {
  backgroundImage: 'repeating-linear-gradient(45deg, rgba(148,163,184,0.9) 0, rgba(148,163,184,0.9) 6px, rgba(203,213,225,0.9) 6px, rgba(203,213,225,0.9) 12px)',
};

export default function ProgressBar({ value, colorClass = 'bg-isp-teal', pausada = false, height = 'h-3' }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`w-full rounded-full bg-slate-100 overflow-hidden ${height}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ${pausada ? '' : colorClass}`}
        style={{ width: `${Math.max(pct ? 4 : 0, pct)}%`, ...(pausada ? STRIPES : {}) }}
      />
    </div>
  );
}
