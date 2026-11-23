import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, PlusCircle } from 'lucide-react';
import Layout from '../components/Layout/Layout.jsx';
import SolicitudCard from '../components/Solicitudes/SolicitudCard.jsx';
import EmptyState from '../components/UI/EmptyState.jsx';
import { api } from '../api/client.js';

export default function HomePage() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/api/solicitudes');
      setSolicitudes(data.solicitudes);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList size={22} className="text-isp-navy" />
          <div>
            <h1 className="text-2xl font-bold text-isp-navy">Mis solicitudes</h1>
            <p className="text-sm text-slate-500">Consulta el estado de tus solicitudes enviadas.</p>
          </div>
        </div>
        <Link
          to="/solicitudes/nueva"
          className="flex items-center gap-1.5 justify-center px-4 py-2 rounded-lg bg-isp-navyDark text-white text-sm font-semibold hover:brightness-110 text-center"
        >
          <PlusCircle size={15} /> Nueva solicitud
        </Link>
      </div>

      <div className="space-y-4 max-w-3xl">
        {cargando && <p className="text-slate-400 text-sm">Cargando…</p>}
        {!cargando && solicitudes.length === 0 && (
          <EmptyState title="No has registrado solicitudes todavía" subtitle="Usa el botón de arriba para levantar tu primera solicitud." />
        )}
        {solicitudes.map((s) => (
          <SolicitudCard key={s.id} solicitud={s} esAdmin={false} />
        ))}
      </div>
    </Layout>
  );
}
