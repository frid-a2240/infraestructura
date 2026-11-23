import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, Search, Info, Plus, UserRound } from 'lucide-react';
import Layout from '../components/Layout/Layout.jsx';
import TableroSeccion from '../components/Solicitudes/TableroSeccion.jsx';
import NuevaActividadForm from '../components/Solicitudes/NuevaActividadForm.jsx';
import EmptyState from '../components/UI/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

const PRIORIDADES = ['alta', 'media', 'baja'];

const FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'pendientes', label: 'Por revisar' },
  { id: 'en_curso', label: 'En curso' },
  { id: 'pausadas', label: 'En pausa' },
];

export default function AdminSolicitudesPage() {
  const { usuario } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [responsables, setResponsables] = useState([]);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [soloMias, setSoloMias] = useState(false);
  const [pendientes, setPendientes] = useState([]);
  const [activas, setActivas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [expandidoId, setExpandidoId] = useState(null);
  const [resaltadoId, setResaltadoId] = useState(null);
  const [aviso, setAviso] = useState('');
  const [arrastre, setArrastre] = useState(null);
  const movidoAOtraPrioridad = useRef(null);

  const filtroParam = searchParams.get('filtro');
  const filtro = FILTROS.some((f) => f.id === filtroParam) ? filtroParam : 'todas';
  const idObjetivo = Number(searchParams.get('id')) || null;

  const cargar = useCallback(async () => {
    try {
      const [{ data: pend }, { data: aprob }] = await Promise.all([
        api.get('/api/solicitudes?estado=pendiente'),
        api.get('/api/solicitudes?estado=aprobada'),
      ]);
      setPendientes(pend.solicitudes);
      setActivas(aprob.solicitudes.filter((s) => !s.completada));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    api.get('/api/solicitudes/responsables').then(({ data }) => setResponsables(data.responsables)).catch(() => {});
  }, [cargar]);

  // Viene del dashboard con ?id=: abre ese renglón y lo resalta.
  useEffect(() => {
    if (cargando || !idObjetivo) return;
    const existe = [...pendientes, ...activas].some((s) => s.id === idObjetivo);
    if (existe) {
      setExpandidoId(idObjetivo);
      setResaltadoId(idObjetivo);
      setAviso('');
    } else {
      setAviso('Esa solicitud ya no está en el tablero; puede estar completada o rechazada (revisa Historial).');
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('id');
      next.delete('filtro');
      return next;
    }, { replace: true });
  }, [cargando, idObjetivo, pendientes, activas, setSearchParams]);

  useEffect(() => {
    if (!resaltadoId) return undefined;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`solicitud-${resaltadoId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const timer = setTimeout(() => setResaltadoId(null), 2500);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [resaltadoId]);

  const handlers = useMemo(
    () => ({
      aprobar: async (id, payload) => {
        await api.patch(`/api/solicitudes/${id}/aprobar`, payload);
        cargar();
      },
      rechazar: async (id, motivo) => {
        await api.patch(`/api/solicitudes/${id}/rechazar`, { motivo });
        cargar();
      },
      pausar: async (id, motivo) => {
        await api.post(`/api/solicitudes/${id}/pausar`, { motivo });
        cargar();
      },
      reanudar: async (id) => {
        await api.post(`/api/solicitudes/${id}/reanudar`);
        cargar();
      },
      completar: async (id, formData) => {
        await api.post(`/api/solicitudes/${id}/completar`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        cargar();
      },
      cambiarPrioridad: async (id, prioridad) => {
        await api.patch(`/api/solicitudes/${id}/prioridad`, { prioridad });
        cargar();
      },
      editarFecha: async (id, payload) => {
        await api.patch(`/api/solicitudes/${id}/fechas`, payload);
        cargar();
      },
      cambiarAvance: async (id, payload) => {
        await api.patch(`/api/solicitudes/${id}/avance`, payload);
        cargar();
      },
      asignarResponsable: async (id, responsable_id) => {
        await api.patch(`/api/solicitudes/${id}/responsable`, { responsable_id });
        cargar();
      },
      editarMotivoPausa: async (id, motivo) => {
        await api.patch(`/api/solicitudes/${id}/motivo-pausa`, { motivo });
        cargar();
      },
    }),
    [cargar]
  );

  const conteos = useMemo(() => ({
    todas: pendientes.length + activas.length,
    pendientes: pendientes.length,
    en_curso: activas.filter((s) => !s.pausada).length,
    pausadas: activas.filter((s) => s.pausada).length,
  }), [pendientes, activas]);

  const q = busqueda.trim().toLowerCase();

  const secciones = useMemo(() => {
    const coincide = (s) =>
      (!soloMias || s.responsable_id === usuario?.id)
      && (!q || `${s.nombre_solicitante} ${s.area} ${s.explicacion} ${s.responsable_nombre || ''}`.toLowerCase().includes(q));

    const pendVisibles = filtro === 'todas' || filtro === 'pendientes' ? pendientes.filter(coincide) : [];
    let actVisibles = [];
    if (filtro === 'todas') actVisibles = activas;
    else if (filtro === 'en_curso') actVisibles = activas.filter((s) => !s.pausada);
    else if (filtro === 'pausadas') actVisibles = activas.filter((s) => s.pausada);
    actVisibles = actVisibles.filter(coincide);

    const pendOrdenadas = [...pendVisibles].sort((a, b) => new Date(a.fecha_creacion) - new Date(b.fecha_creacion));
    const actOrdenadas = [...actVisibles].sort(
      (a, b) => (a.orden_prioridad ?? Infinity) - (b.orden_prioridad ?? Infinity)
    );

    return PRIORIDADES.map((p) => ({
      prioridad: p,
      pendientes: pendOrdenadas.filter((s) => s.prioridad === p),
      activas: actOrdenadas.filter((s) => s.prioridad === p),
    }));
  }, [pendientes, activas, filtro, q, soloMias, usuario?.id]);

  const actividadCreada = (nueva) => {
    setMostrarNueva(false);
    cargar();
    setResaltadoId(nueva.id);
  };

  const hayVisibles = secciones.some((s) => s.pendientes.length + s.activas.length > 0);

  const cambiarFiltro = (id) => {
    setSearchParams(id === 'todas' ? {} : { filtro: id });
    setExpandidoId(null);
    setAviso('');
  };

  const toggle = (id) => setExpandidoId((actual) => (actual === id ? null : id));

  const iniciarArrastre = useCallback((id, prioridad) => setArrastre({ id, prioridad }), []);

  // Devuelve true si el renglón se soltó en otra prioridad, para que su sección de origen no guarde orden.
  const finArrastre = useCallback((id) => {
    const movido = movidoAOtraPrioridad.current === id;
    movidoAOtraPrioridad.current = null;
    setArrastre(null);
    return movido;
  }, []);

  const moverAPrioridad = useCallback(async (id, prioridad, ordenIds) => {
    movidoAOtraPrioridad.current = id;
    setArrastre(null);
    setAviso('');
    try {
      await api.patch(`/api/solicitudes/${id}/prioridad`, { prioridad });
      await api.put('/api/solicitudes/prioridad/orden', { orden: ordenIds });
      setResaltadoId(id);
    } catch (err) {
      setAviso(err.response?.data?.detail || 'No se pudo cambiar la prioridad de la solicitud.');
    } finally {
      cargar();
    }
  }, [cargar]);

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutGrid size={22} className="text-isp-navy" />
            <h1 className="text-2xl font-bold text-isp-navy">Tablero de solicitudes</h1>
          </div>
          <p className="text-sm text-slate-500">
            Cada solicitud o actividad va en su propio renglón, agrupadas por prioridad. Haz clic en un renglón para ver el
            detalle y aprobar, asignar responsable, modificar fechas, pausar o completar.
          </p>
        </div>
        {!mostrarNueva && (
          <button
            onClick={() => setMostrarNueva(true)}
            className="flex items-center justify-center gap-1.5 shrink-0 px-4 py-2.5 rounded-xl bg-isp-navyDark text-white text-sm font-semibold hover:brightness-110 transition shadow-sm"
          >
            <Plus size={16} /> Nueva actividad
          </button>
        )}
      </div>

      {mostrarNueva && (
        <div className="mb-6">
          <NuevaActividadForm
            responsables={responsables}
            onCreada={actividadCreada}
            onCancelar={() => setMostrarNueva(false)}
          />
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => cambiarFiltro(f.id)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
                filtro === f.id
                  ? 'bg-isp-navyDark text-white'
                  : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {f.label} <span className={filtro === f.id ? 'text-white/70' : 'text-slate-400'}>({conteos[f.id]})</span>
            </button>
          ))}
          <button
            onClick={() => { setSoloMias((v) => !v); setExpandidoId(null); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
              soloMias
                ? 'bg-isp-teal text-white'
                : 'bg-white border border-dashed border-isp-teal/50 text-isp-teal hover:bg-isp-teal/5'
            }`}
            title="Mostrar solo las actividades donde tú eres responsable"
          >
            <UserRound size={14} /> Mis actividades
          </button>
        </div>
        <label className="relative lg:ml-auto lg:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, área o descripción…"
            className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2 bg-white"
          />
        </label>
      </div>

      {aviso && (
        <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 mb-4">
          <Info size={15} className="shrink-0" /> {aviso}
        </div>
      )}

      {cargando ? (
        <p className="text-slate-400 text-sm">Cargando…</p>
      ) : !hayVisibles ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            title={q ? 'Sin resultados' : soloMias ? 'No tienes actividades asignadas aquí' : 'No hay solicitudes aquí'}
            subtitle={q ? 'Prueba con otro nombre o área.' : 'Cuando haya solicitudes en este estado aparecerán en esta lista.'}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {secciones.map((sec) => (
            <TableroSeccion
              key={sec.prioridad}
              prioridad={sec.prioridad}
              pendientes={sec.pendientes}
              activas={sec.activas}
              permitirOrden={filtro === 'todas' && !q && !soloMias}
              responsables={responsables}
              expandidoId={expandidoId}
              resaltadoId={resaltadoId}
              onToggle={toggle}
              onActualizado={cargar}
              handlers={handlers}
              arrastreGlobal={arrastre}
              onIniciarArrastre={iniciarArrastre}
              onFinArrastre={finArrastre}
              onMoverAPrioridad={moverAPrioridad}
            />
          ))}
          {filtro === 'todas' && !q && !soloMias && (
            <p className="text-[11px] text-slate-400 px-1">
              Arrastra un renglón aprobado desde el ícono ⋮⋮: suéltalo en otra posición para cambiar su orden, o en otra
              sección para cambiarle la prioridad.
            </p>
          )}
        </div>
      )}
    </Layout>
  );
}
