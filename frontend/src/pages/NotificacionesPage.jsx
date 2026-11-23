import { useEffect, useState, useCallback } from 'react';
import { Bell, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Layout from '../components/Layout/Layout.jsx';
import SectionCard from '../components/UI/SectionCard.jsx';
import EmptyState from '../components/UI/EmptyState.jsx';
import { api } from '../api/client.js';
import { tituloDe } from '../utils/actividad.js';

function estiloPendiente(dias) {
  if (dias < 0) return 'border-red-200 bg-red-50 text-red-700';
  if (dias <= 15) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-500';
}

function textoPendiente(dias) {
  if (dias < 0) return `Venció hace ${Math.abs(dias)} día(s)`;
  if (dias === 0) return 'Es hoy';
  return `Faltan ${dias} día(s)`;
}

export default function NotificacionesPage() {
  const [pendientes, setPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/api/notificaciones/pendientes');
      setPendientes(data.pendientes);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <Layout>
      <div className="flex items-center gap-2 mb-6">
        <Bell size={22} className="text-isp-navy" />
        <div>
          <h1 className="text-2xl font-bold text-isp-navy">Notificaciones</h1>
          <p className="text-sm text-slate-500">
            Actividades aprobadas que aún no se marcan como completadas. Se avisa por correo cuando faltan 15 días o menos.
          </p>
        </div>
      </div>

      <SectionCard title="Pendientes por concluir" className="max-w-3xl">
        {cargando && <p className="text-sm text-slate-400">Cargando…</p>}
        {!cargando && pendientes.length === 0 && (
          <EmptyState icon={CheckCircle2} title="Sin pendientes por concluir" />
        )}

        <div className="space-y-2">
          {pendientes.map((p) => (
            <div key={p.id} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${estiloPendiente(p.dias_restantes)}`}>
              <span className="flex items-center gap-1.5 font-medium truncate min-w-0">
                {p.dias_restantes <= 15 && <AlertTriangle size={13} className="shrink-0" />}
                {tituloDe(p)} · {p.area}
              </span>
              <span className="text-xs font-semibold whitespace-nowrap shrink-0">{textoPendiente(p.dias_restantes)}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </Layout>
  );
}
