import { useEffect, useState } from 'react';
import { CalendarDays, GanttChartSquare } from 'lucide-react';
import Layout from '../components/Layout/Layout.jsx';
import CalendarView from '../components/Solicitudes/CalendarView.jsx';
import GanttChart from '../components/Solicitudes/GanttChart.jsx';
import { api } from '../api/client.js';

export default function CalendarioPage() {
  const [actividades, setActividades] = useState([]);
  const [vista, setVista] = useState('calendario');

  useEffect(() => {
    api.get('/api/solicitudes/calendario').then(({ data }) => {
      setActividades(data.actividades);
    });
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-isp-navy mb-3 sm:mb-1">Calendario y avance</h1>
      <p className="hidden sm:block text-sm text-slate-500 mb-4">
        Cada solicitud aprobada que sigue en curso aparece en todos los días desde su fecha de inicio hasta su fecha de
        terminación; al completarse deja de mostrarse. Cambia a la vista de Gantt para ver el avance de cada actividad en
        el tiempo.
      </p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setVista('calendario')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            vista === 'calendario' ? 'bg-isp-navyDark text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          <CalendarDays size={15} /> Calendario
        </button>
        <button
          onClick={() => setVista('gantt')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            vista === 'gantt' ? 'bg-isp-navyDark text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          <GanttChartSquare size={15} /> Gantt
        </button>
      </div>

      {vista === 'calendario' ? <CalendarView actividades={actividades} /> : <GanttChart actividades={actividades} />}
    </Layout>
  );
}
