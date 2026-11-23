import { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client.js';
import { PRIORIDAD_STYLES } from '../UI/Badge.jsx';
import SolicitudCard from './SolicitudCard.jsx';
import RenglonSolicitud from './RenglonSolicitud.jsx';

// Los renglones aprobados se arrastran para reordenarlos dentro de la prioridad,
// o se sueltan en otra sección para cambiarles la prioridad.
export default function TableroSeccion({
  prioridad, pendientes, activas, permitirOrden, expandidoId, resaltadoId, onToggle, onActualizado, handlers,
  arrastreGlobal, onIniciarArrastre, onFinArrastre, onMoverAPrioridad, responsables,
}) {
  const estilo = PRIORIDAD_STYLES[prioridad];
  const Icon = estilo.icon;
  const [items, setItems] = useState(activas);
  const [dragId, setDragId] = useState(null);
  const [guardandoOrden, setGuardandoOrden] = useState(false);
  const [errorOrden, setErrorOrden] = useState('');
  const [sobreSeccion, setSobreSeccion] = useState(false);
  const itemsRef = useRef(activas);
  const ordenAlIniciar = useRef(null);
  const indiceDestino = useRef(null);
  const arrastradoRef = useRef(null);

  useEffect(() => {
    setItems(activas);
    itemsRef.current = activas;
  }, [activas]);

  const arrastreAjeno = arrastreGlobal && arrastreGlobal.prioridad !== prioridad;

  useEffect(() => {
    if (!arrastreAjeno) {
      setSobreSeccion(false);
      indiceDestino.current = null;
    }
  }, [arrastreAjeno]);

  const iniciarArrastre = (e, id) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
    ordenAlIniciar.current = itemsRef.current.map((i) => i.id).join(',');
    setErrorOrden('');
    arrastradoRef.current = id;
    setDragId(id);
    // Diferido: si el DOM cambia dentro de dragstart, Chrome cancela el arrastre.
    setTimeout(() => onIniciarArrastre(id, prioridad), 0);
  };

  const moverA = (overId) => {
    if (dragId === null || dragId === overId) return;
    setItems((prev) => {
      const dragIdx = prev.findIndex((i) => i.id === dragId);
      const overIdx = prev.findIndex((i) => i.id === overId);
      if (dragIdx === -1 || overIdx === -1) return prev;
      const next = [...prev];
      const [movido] = next.splice(dragIdx, 1);
      next.splice(overIdx, 0, movido);
      itemsRef.current = next;
      return next;
    });
  };

  // Se guarda al terminar el arrastre, aunque se suelte en un espacio entre renglones.
  const terminarArrastre = async () => {
    const idArrastrado = arrastradoRef.current;
    arrastradoRef.current = null;
    setDragId(null);
    const movidoAOtra = onFinArrastre(idArrastrado);
    const inicial = ordenAlIniciar.current;
    ordenAlIniciar.current = null;
    if (movidoAOtra) {
      setItems(activas);
      itemsRef.current = activas;
      return;
    }
    const orden = itemsRef.current.map((i) => i.id);
    if (inicial === null || orden.join(',') === inicial) return;

    setGuardandoOrden(true);
    try {
      await api.put('/api/solicitudes/prioridad/orden', { orden });
      onActualizado();
    } catch {
      setItems(activas);
      itemsRef.current = activas;
      setErrorOrden('No se pudo guardar el nuevo orden.');
    } finally {
      setGuardandoOrden(false);
    }
  };

  const soltarAjeno = (e) => {
    if (!arrastreAjeno) return;
    e.preventDefault();
    const ids = itemsRef.current.map((i) => i.id);
    const indice = indiceDestino.current ?? ids.length;
    ids.splice(indice, 0, arrastreGlobal.id);
    setSobreSeccion(false);
    onMoverAPrioridad(arrastreGlobal.id, prioridad, ids);
  };

  const eventosSeccion = arrastreAjeno
    ? {
        onDragOver: (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (!sobreSeccion) setSobreSeccion(true);
        },
        onDragLeave: (e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setSobreSeccion(false);
            indiceDestino.current = null;
          }
        },
        onDrop: soltarAjeno,
      }
    : {};

  const total = pendientes.length + items.length;
  if (total === 0 && !arrastreAjeno) return null;

  return (
    <section
      {...eventosSeccion}
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition ${
        sobreSeccion ? 'border-isp-teal ring-2 ring-isp-teal/40' : 'border-slate-200'
      }`}
    >
      <header className={`flex items-center gap-2 px-4 py-2.5 border-b ${estilo.header}`}>
        <Icon size={16} />
        <h3 className="font-bold text-sm uppercase tracking-wide">Prioridad {estilo.label.toLowerCase()}</h3>
        <span className="ml-auto text-xs font-semibold bg-white/70 rounded-full px-2 py-0.5">{total}</span>
      </header>

      <div className="p-3 space-y-4">
        {pendientes.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-1">
              Por revisar ({pendientes.length})
            </p>
            {pendientes.map((s) => (
              <RenglonSolicitud
                key={s.id}
                solicitud={s}
                expandido={expandidoId === s.id}
                resaltado={resaltadoId === s.id}
                onToggle={() => onToggle(s.id)}
              >
                <SolicitudCard
                  embebida
                  solicitud={s}
                  esAdmin
                  onAprobar={handlers.aprobar}
                  onRechazar={handlers.rechazar}
                  onCambiarPrioridad={handlers.cambiarPrioridad}
                  onAsignarResponsable={handlers.asignarResponsable}
                  responsables={responsables}
                />
              </RenglonSolicitud>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div
            className="space-y-2"
            onDragOver={(e) => {
              if (dragId !== null) e.preventDefault();
            }}
          >
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-1">
              Aprobadas ({items.length}){guardandoOrden ? ' · guardando orden…' : ''}
            </p>
            {errorOrden && <p className="text-xs text-red-600 px-1">{errorOrden}</p>}
            {items.map((s, idx) => (
              <RenglonSolicitud
                key={s.id}
                solicitud={s}
                expandido={expandidoId === s.id}
                resaltado={resaltadoId === s.id}
                onToggle={() => onToggle(s.id)}
                arrastre={
                  permitirOrden
                    ? {
                        arrastrando: dragId === s.id,
                        onDragStart: (e) => iniciarArrastre(e, s.id),
                        onDragOver: (e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (arrastreAjeno) indiceDestino.current = idx;
                          else moverA(s.id);
                        },
                        onDrop: (e) => {
                          if (!arrastreAjeno) e.preventDefault();
                        },
                        onDragEnd: terminarArrastre,
                      }
                    : null
                }
              >
                <SolicitudCard
                  embebida
                  solicitud={s}
                  esAdmin
                  onPausar={handlers.pausar}
                  onReanudar={handlers.reanudar}
                  onCompletar={handlers.completar}
                  onCambiarPrioridad={handlers.cambiarPrioridad}
                  onEditarFecha={handlers.editarFecha}
                  onCambiarAvance={handlers.cambiarAvance}
                  onAsignarResponsable={handlers.asignarResponsable}
                  onEditarMotivoPausa={handlers.editarMotivoPausa}
                  responsables={responsables}
                />
              </RenglonSolicitud>
            ))}
          </div>
        )}

        {arrastreAjeno && (
          <div
            className={`rounded-xl border-2 border-dashed px-4 py-4 text-center text-sm font-medium transition ${
              sobreSeccion ? 'border-isp-teal bg-isp-teal/5 text-isp-teal' : 'border-slate-200 text-slate-400'
            }`}
          >
            Suelta aquí para pasarla a prioridad {estilo.label.toLowerCase()}
          </div>
        )}
      </div>
    </section>
  );
}
