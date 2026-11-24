import { useState } from 'react';
import { Activity, PauseCircle, X } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { OPCIONES_PRIORIDAD as PRIORIDADES } from '../UI/Badge.jsx';
import SelectorFotos from '../UI/SelectorFotos.jsx';
import RangoFechas from './RangoFechas.jsx';
import { hoyISO, esFechaISO } from '../../utils/fechas.js';
import { componerMotivoPausa, MOTIVO_ESPERANDO } from '../../utils/actividad.js';

const labelCls = 'block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1';
const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-isp-teal/30 focus:border-isp-teal';

export default function NuevaActividadForm({ responsables, onCreada, onCancelar }) {
  const { usuario } = useAuth();
  const soyResponsable = responsables.some((r) => r.id === usuario?.id);

  const [titulo, setTitulo] = useState('');
  const [area, setArea] = useState('Infraestructura');
  const [responsableId, setResponsableId] = useState(soyResponsable ? String(usuario.id) : '');
  const [prioridad, setPrioridad] = useState('media');
  const [estatus, setEstatus] = useState('en_curso');
  const [esperando, setEsperando] = useState(true);
  const [comentarioPausa, setComentarioPausa] = useState('');
  const [sinFecha, setSinFecha] = useState(false);
  const [rango, setRango] = useState({ inicio: hoyISO(), fin: '' });
  const [avance, setAvance] = useState('');
  const [fotos, setFotos] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    if (!titulo.trim()) {
      setError('Escribe en qué consiste la actividad.');
      return;
    }
    if (!sinFecha && !(esFechaISO(rango.inicio) && esFechaISO(rango.fin) && rango.inicio <= rango.fin)) {
      setError('Indica la fecha de inicio y la de terminación, o marca "Sin fecha compromiso".');
      return;
    }
    const motivo = componerMotivoPausa(esperando, comentarioPausa);
    if (estatus === 'pausada' && !motivo) {
      setError('Indica por qué está en pausa.');
      return;
    }

    setGuardando(true);
    try {
      const form = new FormData();
      form.append('titulo', titulo.trim());
      form.append('area', area.trim());
      form.append('prioridad', prioridad);
      form.append('responsable_id', responsableId);
      form.append('estatus', estatus);
      if (estatus === 'pausada') form.append('motivo_pausa', motivo);
      if (!sinFecha) {
        form.append('fecha_inicio', rango.inicio);
        form.append('fecha_objetivo', rango.fin);
      }
      if (avance !== '') form.append('avance', avance);
      fotos.forEach((f) => form.append('imagenes', f));

      const { data } = await api.post('/api/solicitudes/actividad', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onCreada(data.solicitud);
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo crear la actividad.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} className="bg-white rounded-2xl border border-isp-teal/40 shadow-md p-4 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-isp-navy">Nueva actividad</h2>
          <p className="text-sm text-slate-500">Entra directo como aprobada; las fotos son opcionales.</p>
        </div>
        <button type="button" onClick={onCancelar} className="text-slate-400 hover:text-slate-600" title="Cerrar">
          <X size={18} />
        </button>
      </div>

      <div>
        <label className={labelCls}>Actividad</label>
        <textarea
          rows={2}
          maxLength={2000}
          placeholder="Ej. Reparar la escalera de acceso de camino norte a plan de dique"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className={inputCls}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Responsable</label>
          <select value={responsableId} onChange={(e) => setResponsableId(e.target.value)} className={inputCls}>
            <option value="">Sin responsable por ahora</option>
            {responsables.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Área</label>
          <input value={area} maxLength={100} onChange={(e) => setArea(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Prioridad</label>
          <div className="flex gap-2 flex-wrap">
            {PRIORIDADES.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPrioridad(p.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition ${
                    prioridad === p.value ? p.cls : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={14} /> {p.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className={labelCls}>Estatus</label>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setEstatus('en_curso')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition ${
                estatus === 'en_curso' ? 'border-isp-teal/40 bg-isp-teal/10 text-isp-teal' : 'border-slate-200 text-slate-400 hover:bg-slate-50'
              }`}
            >
              <Activity size={14} /> En curso
            </button>
            <button
              type="button"
              onClick={() => setEstatus('pausada')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition ${
                estatus === 'pausada' ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-400 hover:bg-slate-50'
              }`}
            >
              <PauseCircle size={14} /> En pausa
            </button>
          </div>
        </div>
      </div>

      {estatus === 'pausada' && (
        <div className="bg-sky-50/60 border border-sky-100 rounded-lg p-3 space-y-2">
          <label className="flex items-center gap-2 text-sm text-sky-800 font-medium">
            <input type="checkbox" checked={esperando} onChange={(e) => setEsperando(e.target.checked)} className="accent-sky-600" />
            {MOTIVO_ESPERANDO}
          </label>
          <input
            placeholder="Comentario: ¿por qué está en pausa? (ej. esperando cotización del proveedor)"
            value={comentarioPausa}
            maxLength={900}
            onChange={(e) => setComentarioPausa(e.target.value)}
            className={inputCls}
          />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={labelCls}>Fechas</span>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={sinFecha} onChange={(e) => setSinFecha(e.target.checked)} className="accent-isp-teal" />
            Sin fecha compromiso
          </label>
        </div>
        {sinFecha ? (
          <p className="text-xs text-slate-400">No aparecerá en el calendario hasta que le pongas fechas desde el tablero.</p>
        ) : (
          <RangoFechas inicio={rango.inicio} fin={rango.fin} onChange={setRango} />
        )}
      </div>

      <div className="grid sm:grid-cols-[180px_1fr] gap-4 items-start">
        <div>
          <label className={labelCls}>Avance (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            placeholder="Automático"
            value={avance}
            onChange={(e) => setAvance(e.target.value)}
            className={inputCls}
          />
          <p className="text-[11px] text-slate-400 mt-1">Vacío = se calcula solo por fechas.</p>
        </div>
        <SelectorFotos fotos={fotos} onChange={setFotos} max={5} />
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={guardando}
          className="px-5 py-2.5 rounded-xl bg-isp-navyDark text-white font-semibold text-sm hover:brightness-110 transition shadow-sm disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : 'Crear actividad'}
        </button>
        <button type="button" onClick={onCancelar} className="text-sm text-slate-400 hover:text-slate-600 px-2">
          Cancelar
        </button>
      </div>
    </form>
  );
}
