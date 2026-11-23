import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History } from 'lucide-react';
import Layout from '../components/Layout/Layout.jsx';
import SolicitudCard from '../components/Solicitudes/SolicitudCard.jsx';
import EmptyState from '../components/UI/EmptyState.jsx';
import { api } from '../api/client.js';

const FILTROS = [
  { id: 'todas', label: 'Todas', aplica: () => true },
  { id: 'completadas', label: 'Completadas', aplica: (s) => s.estado === 'aprobada' },
  { id: 'rechazadas', label: 'Rechazadas', aplica: (s) => s.estado === 'rechazada' },
];

// Solo lo ya cerrado: completadas (de consulta) y rechazadas (se pueden reabrir).
// Las aprobadas en curso se manejan únicamente desde el tablero.
export default function HistorialPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);

  const filtro = FILTROS.find((f) => f.id === searchParams.get('filtro')) || FILTROS[0];
  const visibles = useMemo(() => solicitudes.filter(filtro.aplica), [solicitudes, filtro]);
  const conteo = (f) => solicitudes.filter(f.aplica).length;

  const cargar = useCallback(async () => {
    try {
      const [rechazadas, aprobadas] = await Promise.all([
        api.get('/api/solicitudes?estado=rechazada'),
        api.get('/api/solicitudes?estado=aprobada'),
      ]);
      const completadas = aprobadas.data.solicitudes.filter((s) => s.completada);
      const todas = [...rechazadas.data.solicitudes, ...completadas].sort(
        (a, b) => new Date(b.fecha_completada || b.fecha_creacion) - new Date(a.fecha_completada || a.fecha_creacion)
      );
      setSolicitudes(todas);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const reabrir = async (id) => {
    try {
      await api.post(`/api/solicitudes/${id}/reabrir`);
    } finally {
      cargar();
    }
  };

  const eliminar = async (id) => {
    try {
      await api.delete(`/api/solicitudes/${id}`);
    } finally {
      cargar();
    }
  };

  return (
    <Layout>
      <div className="flex items-center gap-2 mb-1">
        <History size={22} className="text-isp-navy" />
        <h1 className="text-2xl font-bold text-isp-navy">Historial</h1>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Solicitudes cerradas: las completadas quedan solo para consulta y las rechazadas se pueden reabrir para volver a
        revisarlas. Las aprobadas en curso se manejan desde el Tablero.
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setSearchParams(f.id === 'todas' ? {} : { filtro: f.id })}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
              filtro.id === f.id
                ? 'bg-isp-navyDark text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {f.label} <span className={filtro.id === f.id ? 'text-white/70' : 'text-slate-400'}>({conteo(f)})</span>
          </button>
        ))}
      </div>

      <div className="space-y-4 max-w-3xl">
        {cargando && <p className="text-slate-400 text-sm">Cargando…</p>}
        {!cargando && visibles.length === 0 && (
          <EmptyState title={solicitudes.length === 0 ? 'Aún no hay solicitudes cerradas' : 'No hay solicitudes en este filtro'} />
        )}
        {visibles.map((s) =>
          s.estado === 'rechazada' ? (
            <SolicitudCard key={s.id} solicitud={s} esAdmin onReabrir={reabrir} onEliminar={eliminar} />
          ) : (
            <SolicitudCard key={s.id} solicitud={s} esAdmin={false} />
          )
        )}
      </div>
    </Layout>
  );
}
