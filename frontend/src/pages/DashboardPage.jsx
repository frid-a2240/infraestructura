import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Clock3, Activity, PauseCircle, CheckCircle2, XCircle, AlertTriangle, ArrowRight, ListChecks,
} from 'lucide-react';
import Layout from '../components/Layout/Layout.jsx';
import BarChart from '../components/Charts/BarChart.jsx';
import TrendArea from '../components/Charts/TrendArea.jsx';
import SectionCard from '../components/UI/SectionCard.jsx';
import EmptyState from '../components/UI/EmptyState.jsx';
import { PrioridadBadge } from '../components/UI/Badge.jsx';
import { api } from '../api/client.js';
import { tituloDe } from '../utils/actividad.js';

function StatCard({ label, valor, accent, icon: Icon, to }) {
  return (
    <Link
      to={to}
      title={`Ver ${label.toLowerCase()}`}
      className="group relative block bg-white rounded-2xl border border-slate-200 p-4 pl-5 sm:p-5 sm:pl-6 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-isp-teal"
    >
      <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${accent.bar}`} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide leading-tight">{label}</p>
        <Icon size={16} className={`shrink-0 ${accent.text}`} />
      </div>
      <p className={`text-2xl sm:text-3xl font-bold mt-1 ${accent.text}`}>{valor}</p>
      <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-isp-teal transition-colors">
        Ver <ArrowRight size={11} />
      </span>
    </Link>
  );
}

function fechaCortaLocal(fechaISO) {
  const [y, m, d] = fechaISO.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export default function DashboardPage() {
  const [resumen, setResumen] = useState({ total: 0, pendientes: 0, aprobadas: 0, pausadas: 0, completadas: 0, rechazadas: 0 });
  const [porArea, setPorArea] = useState([]);
  const [porSemana, setPorSemana] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [pausadas, setPausadas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [{ data: stats }, { data: alertasData }, { data: prioridadData }] = await Promise.all([
        api.get('/api/solicitudes/estadisticas'),
        api.get('/api/solicitudes/alertas'),
        api.get('/api/solicitudes/prioridad'),
      ]);
      setResumen({
        total: stats.porEstado.total,
        pendientes: stats.porEstado.pendientes,
        aprobadas: stats.porEstado.aprobadas_activas,
        pausadas: stats.porEstado.pausadas,
        completadas: stats.porEstado.completadas,
        rechazadas: stats.porEstado.rechazadas,
      });
      setPorArea(stats.porArea.map((a) => ({ label: a.area, value: a.total })));
      setPorSemana(stats.porSemana.map((s) => ({ label: fechaCortaLocal(s.semana), value: s.total })));
      setAlertas(alertasData.alertas);
      setPausadas(prioridadData.listado.filter((i) => i.pausada));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const porEstadoItems = [
    { label: 'Pendientes', value: resumen.pendientes, color: '#fbbf24' },
    { label: 'Aprobadas activas', value: resumen.aprobadas, color: '#00AFAA' },
    { label: 'En pausa', value: resumen.pausadas, color: '#38bdf8' },
    { label: 'Completadas', value: resumen.completadas, color: '#94a3b8' },
    { label: 'Rechazadas', value: resumen.rechazadas, color: '#f87171' },
  ];

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={22} className="text-isp-navy" />
          <div>
            <h1 className="text-2xl font-bold text-isp-navy">Dashboard</h1>
            <p className="text-sm text-slate-500">Resumen general del sistema de infraestructura.</p>
          </div>
        </div>
        <Link
          to="/solicitudes"
          className="px-4 py-2.5 rounded-xl bg-isp-navyDark text-white text-sm font-semibold hover:brightness-110 transition shadow-sm text-center"
        >
          Ir al tablero de solicitudes
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
        <StatCard to="/solicitudes" label="Total de actividades" valor={resumen.total} icon={ListChecks} accent={{ bar: 'bg-isp-navyDark', text: 'text-isp-navy' }} />
        <StatCard to="/solicitudes?filtro=pendientes" label="Pendientes por revisar" valor={resumen.pendientes} icon={Clock3} accent={{ bar: 'bg-amber-400', text: 'text-amber-600' }} />
        <StatCard to="/solicitudes?filtro=en_curso" label="Aprobadas activas" valor={resumen.aprobadas} icon={Activity} accent={{ bar: 'bg-isp-teal', text: 'text-isp-teal' }} />
        <StatCard to="/solicitudes?filtro=pausadas" label="En pausa" valor={resumen.pausadas} icon={PauseCircle} accent={{ bar: 'bg-sky-400', text: 'text-sky-500' }} />
        <StatCard to="/historial?filtro=completadas" label="Completadas" valor={resumen.completadas} icon={CheckCircle2} accent={{ bar: 'bg-slate-400', text: 'text-slate-500' }} />
        <StatCard to="/historial?filtro=rechazadas" label="Rechazadas (historial)" valor={resumen.rechazadas} icon={XCircle} accent={{ bar: 'bg-red-400', text: 'text-red-500' }} />
      </div>

      {cargando ? (
        <p className="text-slate-400 text-sm">Cargando…</p>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-6 mb-6 *:min-w-0">
            <SectionCard
              title="Alertas por fecha"
              subtitle="Aprobadas que están por vencer o ya vencieron."
              action={<AlertTriangle size={18} className="text-amber-500" />}
            >
              {alertas.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Todo en orden" subtitle="No hay actividades por vencer ni vencidas." />
              ) : (
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {alertas.map((a) => (
                    <Link
                      key={a.id}
                      to={`/solicitudes?id=${a.id}`}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm border ${
                        a.dias_restantes < 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                      }`}
                    >
                      <span className="min-w-0 truncate font-medium">{tituloDe(a)} · {a.area}</span>
                      <span className="shrink-0 flex items-center gap-1 text-xs font-semibold">
                        {a.dias_restantes < 0 ? `Vencida hace ${Math.abs(a.dias_restantes)}d` : `Vence en ${a.dias_restantes}d`}
                        <ArrowRight size={12} />
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Actividades pausadas"
              subtitle="Trabajo detenido temporalmente; se retoman desde el tablero."
              action={<PauseCircle size={18} className="text-sky-500" />}
            >
              {pausadas.length === 0 ? (
                <EmptyState icon={Activity} title="Nada en pausa" subtitle="Todas las actividades activas siguen en curso." />
              ) : (
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {pausadas.map((p) => (
                    <Link
                      key={p.id}
                      to={`/solicitudes?id=${p.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm border bg-sky-50 border-sky-200 text-sky-700"
                    >
                      <span className="min-w-0">
                        <span className="font-medium block truncate">{tituloDe(p)} · {p.area}</span>
                        {p.motivo_pausa && <span className="text-xs block text-sky-600/80 truncate">{p.motivo_pausa}</span>}
                      </span>
                      <PrioridadBadge prioridad={p.prioridad} />
                    </Link>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
            <h3 className="text-lg font-bold text-isp-navy mb-1">Solicitudes por semana</h3>
            <p className="text-sm text-slate-500 mb-4">Últimas 8 semanas, por fecha de creación.</p>
            <TrendArea items={porSemana} color="#00AFAA" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6 *:min-w-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <h3 className="text-lg font-bold text-isp-navy mb-1">Distribución por estado</h3>
              <p className="text-sm text-slate-500 mb-4">Todas las solicitudes registradas.</p>
              <BarChart items={porEstadoItems} />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <h3 className="text-lg font-bold text-isp-navy mb-1">Solicitudes por área</h3>
              <p className="text-sm text-slate-500 mb-4">Áreas con más solicitudes registradas.</p>
              <BarChart items={porArea} defaultColor="#00AFAA" />
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
