import { useState } from 'react';
import { Send } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import SelectorFotos from '../UI/SelectorFotos.jsx';
import { OPCIONES_PRIORIDAD as PRIORIDADES } from '../UI/Badge.jsx';

const MAX_FOTOS = 5;

export default function FormatoForm({ onCreada }) {
  const { usuario } = useAuth();
  const [nombre, setNombre] = useState(usuario?.nombre || '');
  const [area, setArea] = useState(usuario?.area || '');
  const [explicacion, setExplicacion] = useState('');
  const [prioridad, setPrioridad] = useState('media');
  const [imagenes, setImagenes] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    if (!nombre || !area || !explicacion) {
      setError('Completa nombre, área y explicación de la necesidad.');
      return;
    }
    if (imagenes.length === 0) {
      setError('Adjunta al menos una foto como evidencia de la necesidad.');
      return;
    }
    setEnviando(true);
    try {
      const form = new FormData();
      form.append('nombre_solicitante', nombre);
      form.append('area', area);
      form.append('explicacion', explicacion);
      form.append('prioridad', prioridad);
      imagenes.forEach((file) => form.append('imagenes', file));

      await api.post('/api/solicitudes', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMensaje('Solicitud enviada correctamente. Se notificó por correo al equipo de administración.');
      setExplicacion('');
      setPrioridad('media');
      setImagenes([]);
      onCreada && onCreada();
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo enviar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-5">
      <p className="text-sm text-slate-500">
        Describe la necesidad de infraestructura y adjunta al menos una foto como evidencia (máximo {MAX_FOTOS}).
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Nombre</label>
          <input
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-isp-teal/30 focus:border-isp-teal"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Área</label>
          <input
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-isp-teal/30 focus:border-isp-teal"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Explicación de la necesidad</label>
        <textarea
          rows={5}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-isp-teal/30 focus:border-isp-teal"
          value={explicacion}
          onChange={(e) => setExplicacion(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Prioridad</label>
        <div className="flex gap-2 flex-wrap">
          {PRIORIDADES.map((p) => {
            const Icon = p.icon;
            const activo = prioridad === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setPrioridad(p.value)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-sm font-semibold transition ${
                  activo ? p.cls : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                }`}
              >
                <Icon size={14} /> {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SelectorFotos fotos={imagenes} onChange={setImagenes} max={MAX_FOTOS} obligatoria />
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
      {mensaje && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{mensaje}</div>}

      <button
        type="submit"
        disabled={enviando || imagenes.length === 0}
        title={imagenes.length === 0 ? 'Agrega al menos una foto para poder enviar' : undefined}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-isp-navyDark text-white font-semibold text-sm hover:brightness-110 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Send size={15} /> {enviando ? 'Enviando…' : 'Enviar solicitud'}
      </button>
      {imagenes.length === 0 && (
        <p className="text-xs text-slate-400 -mt-3">Agrega al menos una foto para poder enviar la solicitud.</p>
      )}
    </form>
  );
}
