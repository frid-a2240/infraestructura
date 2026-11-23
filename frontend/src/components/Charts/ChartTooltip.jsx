export default function ChartTooltip({ x, y, children }) {
  if (x == null || y == null) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-lg bg-isp-navyDark text-white text-xs px-2.5 py-1.5 shadow-lg whitespace-nowrap"
      style={{ left: x, top: y, transform: 'translate(-50%, calc(-100% - 10px))' }}
    >
      {children}
    </div>
  );
}
