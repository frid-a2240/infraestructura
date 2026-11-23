import { useState } from 'react';
import {
  Check, X, RotateCcw, Trash2, Camera, Pause, Play, Pencil, AlertTriangle, Clock3, MessageSquare, SlidersHorizontal,
} from 'lucide-react';
import { EstadoBadge, PrioridadBadge, PRIORIDAD_STYLES } from '../UI/Badge.jsx';
import ProgressBar from '../UI/ProgressBar.jsx';
import RangoFechas from './RangoFechas.jsx';
import { hoyISO, diasEntre, formatoCorto, inicioDeActividad, esFechaISO } from '../../utils/fechas.js';
import { esActividadAdmin, componerMotivoPausa, MOTIVO_ESPERANDO } from '../../utils/actividad.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function diasDesde(fechaISO) {
  if (!fechaISO) return null;
  return Math.max(0, Math.round((Date.now() - new Date(fechaISO).getTime()) / 86400000));
}

export function rangoTexto(solicitud) {
  const inicio = inicioDeActividad(solicitud);
  const fin = solicitud.fecha_objetivo?.slice(0, 10);
  if (!inicio || !fin) return null;
  const dias = diasEntre(inicio, fin);
  return `${formatoCorto(inicio)} → ${formatoCorto(fin)} · ${dias} día${dias === 1 ? '' : 's'}`;
}

function rangoValido({ inicio, fin }) {
  return esFechaISO(inicio) && esFechaISO(fin) && inicio <= fin;
}

export function EsperaInfo({ solicitud }) {
  if (solicitud.estado === 'pendiente') {
    const dias = diasDesde(solicitud.fecha_creacion);
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Clock3 size={12} /> Esperando revisión: {dias === 0 ? 'hoy' : `${dias} día(s)`}
      </span>
    );
  }
  if (solicitud.estado === 'aprobada' && !solicitud.completada) {
    if (solicitud.pausada) {
      const dias = diasDesde(solicitud.fecha_pausa_inicio);
      return (
        <span className="inline-flex items-center gap-1 text-xs text-sky-600 font-medium">
          <Pause size={12} /> En pausa desde hace {dias === 0 ? 'hoy' : `${dias} día(s)`}
        </span>
      );
    }
    const dr = solicitud.dias_restantes;
    if (dr == null) return null;
    if (dr < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold">
          <AlertTriangle size={12} /> Vencida hace {Math.abs(dr)} día(s)
        </span>
      );
    }
    if (dr <= 3) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold">
          <AlertTriangle size={12} /> Vence en {dr} día(s)
        </span>
      );
    }
    return <span className="text-xs text-slate-400">Vence en {dr} días</span>;
  }
  return null;
}

export default function SolicitudCard({
  solicitud,
  esAdmin,
  onAprobar,
  onRechazar,
  onReabrir,
  onEliminar,
  onCompletar,
  onPausar,
  onReanudar,
  onCambiarPrioridad,
  onEditarFecha,
  onCambiarAvance,
  onAsignarResponsable,
  onEditarMotivoPausa,
  responsables = [],
  embebida = false,
}) {
  const deAdmin = esActividadAdmin(solicitud);
  const [esperandoRespuesta, setEsperandoRespuesta] = useState(false);
  const [editandoMotivo, setEditandoMotivo] = useState(false);
  const [motivoEditado, setMotivoEditado] = useState('');
  const [errorMotivo, setErrorMotivo] = useState('');
  const [rangoAprobar, setRangoAprobar] = useState({ inicio: hoyISO(), fin: '' });
  const [aprobando, setAprobando] = useState(false);
  const [errorAprobar, setErrorAprobar] = useState('');
  const [motivo, setMotivo] = useState('');
  const [mostrarAprobar, setMostrarAprobar] = useState(false);
  const [mostrarRechazo, setMostrarRechazo] = useState(false);
  const [reabriendo, setReabriendo] = useState(false);
  const [mensajeReabrir, setMensajeReabrir] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [completando, setCompletando] = useState(false);
  const [mostrarCompletar, setMostrarCompletar] = useState(false);
  const [fotosEvidencia, setFotosEvidencia] = useState([]);
  const [mostrarPausar, setMostrarPausar] = useState(false);
  const [motivoPausa, setMotivoPausa] = useState('');
  const [pausando, setPausando] = useState(false);
  const [reanudando, setReanudando] = useState(false);
  const [editandoFecha, setEditandoFecha] = useState(false);
  const [rangoEdicion, setRangoEdicion] = useState({ inicio: '', fin: '' });
  const [comentario, setComentario] = useState('');
  const [guardandoFechas, setGuardandoFechas] = useState(false);
  const [errorFechas, setErrorFechas] = useState('');
  const [editandoAvance, setEditandoAvance] = useState(false);
  const [valorAvance, setValorAvance] = useState(solicitud.avance ?? 0);
  const [guardandoAvance, setGuardandoAvance] = useState(false);

  const activa = solicitud.estado === 'aprobada' && !solicitud.completada;
  // Solo en solicitudes de colaboradores hay alguien externo a quien avisarle el cambio de fechas.
  const comentarioObligatorio = !deAdmin;
  const puedeAsignar = esAdmin && onAsignarResponsable && (solicitud.estado === 'pendiente' || activa);
  const estiloPrioridad = PRIORIDAD_STYLES[solicitud.prioridad] || PRIORIDAD_STYLES.media;
  const puedeReclasificar = esAdmin && onCambiarPrioridad && (solicitud.estado === 'pendiente' || activa);

  const handleCompletar = async () => {
    if (completando || fotosEvidencia.length === 0) return;
    setCompletando(true);
    try {
      const form = new FormData();
      fotosEvidencia.forEach((f) => form.append('imagenes', f));
      await onCompletar(solicitud.id, form);
      setMostrarCompletar(false);
      setFotosEvidencia([]);
    } catch {
      setCompletando(false);
    }
  };

  const handleReabrir = async () => {
    if (reabriendo) return;
    setReabriendo(true);
    setMensajeReabrir('');
    try {
      await onReabrir(solicitud.id);
    } catch (err) {
      setMensajeReabrir(
        err.response?.status === 404 ? 'Ya se reabrió esta solicitud.' : 'No se pudo reabrir la solicitud.'
      );
      setReabriendo(false);
    }
  };

  const handleEliminar = async () => {
    if (eliminando) return;
    setEliminando(true);
    try {
      await onEliminar(solicitud.id);
    } catch {
      setEliminando(false);
      setConfirmarEliminar(false);
    }
  };

  const handlePausar = async () => {
    if (pausando) return;
    setPausando(true);
    try {
      await onPausar(solicitud.id, componerMotivoPausa(esperandoRespuesta, motivoPausa));
      setMostrarPausar(false);
      setMotivoPausa('');
      setEsperandoRespuesta(false);
    } finally {
      setPausando(false);
    }
  };

  const abrirEdicionMotivo = () => {
    setMotivoEditado(solicitud.motivo_pausa || '');
    setErrorMotivo('');
    setEditandoMotivo(true);
  };

  const guardarMotivo = async () => {
    if (!motivoEditado.trim()) return;
    try {
      await onEditarMotivoPausa(solicitud.id, motivoEditado.trim());
      setEditandoMotivo(false);
    } catch (err) {
      setErrorMotivo(err.response?.data?.detail || 'No se pudo guardar el motivo.');
    }
  };

  const handleReanudar = async () => {
    if (reanudando) return;
    setReanudando(true);
    try {
      await onReanudar(solicitud.id);
    } finally {
      setReanudando(false);
    }
  };

  const handleAprobar = async () => {
    if (aprobando || !rangoValido(rangoAprobar)) return;
    setAprobando(true);
    setErrorAprobar('');
    try {
      await onAprobar(solicitud.id, { fecha_inicio: rangoAprobar.inicio, fecha_objetivo: rangoAprobar.fin });
    } catch (err) {
      setErrorAprobar(err.response?.data?.detail || 'No se pudo aprobar la solicitud.');
      setAprobando(false);
    }
  };

  const abrirEdicionFechas = () => {
    if (editandoFecha) {
      setEditandoFecha(false);
      return;
    }
    setRangoEdicion({ inicio: inicioDeActividad(solicitud) || '', fin: solicitud.fecha_objetivo?.slice(0, 10) || '' });
    setComentario('');
    setErrorFechas('');
    setEditandoFecha(true);
  };

  const handleGuardarFechas = async () => {
    if (guardandoFechas || !rangoValido(rangoEdicion) || (comentarioObligatorio && !comentario.trim())) return;
    setGuardandoFechas(true);
    setErrorFechas('');
    try {
      await onEditarFecha(solicitud.id, {
        fecha_inicio: rangoEdicion.inicio,
        fecha_objetivo: rangoEdicion.fin,
        comentario: comentario.trim(),
      });
      setEditandoFecha(false);
    } catch (err) {
      setErrorFechas(err.response?.data?.detail || 'No se pudieron guardar las fechas.');
    } finally {
      setGuardandoFechas(false);
    }
  };

  const guardarAvanceManual = async () => {
    setGuardandoAvance(true);
    try {
      await onCambiarAvance(solicitud.id, { modo_avance: 'manual', avance_manual: valorAvance });
    } finally {
      setGuardandoAvance(false);
      setEditandoAvance(false);
    }
  };

  const volverAvanceAutomatico = async () => {
    setGuardandoAvance(true);
    try {
      await onCambiarAvance(solicitud.id, { modo_avance: 'automatico' });
    } finally {
      setGuardandoAvance(false);
    }
  };

  return (
    <div
      className={
        embebida
          ? 'space-y-3'
          : 'bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow'
      }
    >
      {embebida ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {deAdmin
              ? `${solicitud.origen === 'notion' ? 'Traída de Notion' : `Creada por ${solicitud.nombre_solicitante}`} el ${new Date(solicitud.fecha_creacion).toLocaleDateString('es-MX')}`
              : `Solicitada el ${new Date(solicitud.fecha_creacion).toLocaleDateString('es-MX')}`}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {puedeAsignar && (
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                Responsable
                <select
                  value={solicitud.responsable_id || ''}
                  onChange={(e) => onAsignarResponsable(solicitud.id, e.target.value || null)}
                  className="text-xs font-semibold px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-700"
                >
                  <option value="">Sin responsable</option>
                  {responsables.map((r) => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </label>
            )}
            {puedeReclasificar && (
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                Prioridad
                <select
                  value={solicitud.prioridad}
                  onChange={(e) => onCambiarPrioridad(solicitud.id, e.target.value)}
                  className={`text-xs font-semibold px-2 py-1 rounded-full border ${estiloPrioridad.cls}`}
                >
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </label>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-isp-navy truncate">{solicitud.nombre_solicitante}</p>
              <p className="text-xs text-slate-500">{solicitud.area} · {new Date(solicitud.fecha_creacion).toLocaleDateString('es-MX')}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <EstadoBadge solicitud={solicitud} />
                {puedeReclasificar ? (
                  <select
                    value={solicitud.prioridad}
                    onChange={(e) => onCambiarPrioridad(solicitud.id, e.target.value)}
                    className={`text-xs font-semibold px-2 py-1 rounded-full border ${estiloPrioridad.cls}`}
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                ) : (
                  <PrioridadBadge prioridad={solicitud.prioridad} />
                )}
              </div>
              <EsperaInfo solicitud={solicitud} />
            </div>
          </div>

          <p className="text-sm text-slate-700 whitespace-pre-wrap">{solicitud.explicacion}</p>
        </>
      )}

      {solicitud.imagenes?.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Fotos de la solicitud</p>
          <div className="flex gap-2 flex-wrap">
            {solicitud.imagenes.map((src) => (
              <a key={src} href={`${API_URL}${src}`} target="_blank" rel="noreferrer">
                <img src={`${API_URL}${src}`} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
              </a>
            ))}
          </div>
        </div>
      )}

      {solicitud.evidencias?.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wide mb-1">Evidencia de cierre</p>
          <div className="flex gap-2 flex-wrap">
            {solicitud.evidencias.map((src) => (
              <a key={src} href={`${API_URL}${src}`} target="_blank" rel="noreferrer">
                <img src={`${API_URL}${src}`} alt="" className="w-16 h-16 object-cover rounded-lg border border-emerald-200" />
              </a>
            ))}
          </div>
        </div>
      )}

      {activa && (
        <div className="space-y-1.5">
          {embebida && esAdmin && !solicitud.pausada && (onEditarFecha || onCambiarAvance) && (
            <div className="flex flex-wrap items-center gap-2">
              {onEditarFecha && (
                <button
                  onClick={abrirEdicionFechas}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <Pencil size={12} /> {solicitud.fecha_objetivo ? 'Modificar fechas' : 'Poner fechas'}
                </button>
              )}
              {onCambiarAvance && (
                <button
                  onClick={() => { setValorAvance(solicitud.avance ?? 0); setEditandoAvance((v) => !v); }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <SlidersHorizontal size={12} /> Ajustar avance
                  {solicitud.modo_avance === 'manual' && <span className="text-amber-600">(manual)</span>}
                </button>
              )}
            </div>
          )}

          {!embebida && (
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1 flex-wrap">
              Periodo: <strong>{rangoTexto(solicitud) || 'Sin fecha compromiso'}</strong>
              {esAdmin && onEditarFecha && !solicitud.pausada && (
                <button
                  onClick={abrirEdicionFechas}
                  title="Modificar fechas"
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-isp-teal ml-1"
                >
                  <Pencil size={12} /> <span className="underline-offset-2 hover:underline">Modificar</span>
                </button>
              )}
            </span>
            <span className="font-semibold shrink-0">{solicitud.avance ?? 0}%</span>
          </div>
          )}

          {editandoFecha && (
            <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <RangoFechas
                inicio={rangoEdicion.inicio}
                fin={rangoEdicion.fin}
                onChange={setRangoEdicion}
              />
              <label className="block">
                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  {comentarioObligatorio ? 'Comentario para el solicitante' : 'Comentario (opcional)'}
                </span>
                <textarea
                  rows={2}
                  maxLength={1000}
                  placeholder="Ej. Se recorre la fecha porque el material llega hasta el lunes."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                />
              </label>
              {comentarioObligatorio && (
                <p className="text-[11px] text-slate-400">Se le enviará un correo con las nuevas fechas y este comentario.</p>
              )}
              {errorFechas && <p className="text-xs text-red-600">{errorFechas}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGuardarFechas}
                  disabled={guardandoFechas || !rangoValido(rangoEdicion) || (comentarioObligatorio && !comentario.trim())}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-isp-navyDark text-white disabled:opacity-50"
                >
                  {guardandoFechas ? 'Guardando…' : comentarioObligatorio ? 'Guardar y notificar' : 'Guardar fechas'}
                </button>
                <button onClick={() => setEditandoFecha(false)} className="text-xs text-slate-400">Cancelar</button>
              </div>
            </div>
          )}

          {!embebida && (
            <div className="flex items-center gap-2">
              <ProgressBar value={solicitud.avance ?? 0} colorClass={estiloPrioridad.bar} pausada={solicitud.pausada} />
              {esAdmin && onCambiarAvance && !solicitud.pausada && (
                <button
                  onClick={() => { setValorAvance(solicitud.avance ?? 0); setEditandoAvance((v) => !v); }}
                  title="Dar seguimiento manual"
                  className={`shrink-0 w-2.5 h-2.5 rounded-full ${solicitud.modo_avance === 'manual' ? 'bg-amber-400' : 'bg-slate-200 hover:bg-slate-300'}`}
                />
              )}
            </div>
          )}

          {editandoAvance && (
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={valorAvance}
                onChange={(e) => setValorAvance(Number(e.target.value))}
                className="flex-1 accent-isp-teal"
              />
              <button onClick={guardarAvanceManual} disabled={guardandoAvance} className="text-[11px] px-2 py-1 rounded bg-isp-navyDark text-white font-semibold">
                OK
              </button>
              {solicitud.modo_avance === 'manual' && (
                <button onClick={volverAvanceAutomatico} disabled={guardandoAvance} className="text-[11px] text-slate-400 hover:underline">
                  auto
                </button>
              )}
            </div>
          )}

          {solicitud.pausada && !editandoMotivo && (solicitud.motivo_pausa || (esAdmin && onEditarMotivoPausa)) && (
            <div className="flex items-start gap-2 text-xs bg-sky-50 border border-sky-200 text-sky-800 rounded-lg px-3 py-2">
              <Pause size={13} className="shrink-0 mt-0.5" />
              <p className="flex-1 min-w-0 whitespace-pre-wrap">
                <span className="font-semibold">Motivo de la pausa: </span>
                {solicitud.motivo_pausa || <span className="italic text-sky-600">sin comentario</span>}
              </p>
              {esAdmin && onEditarMotivoPausa && (
                <button onClick={abrirEdicionMotivo} className="inline-flex items-center gap-1 shrink-0 text-sky-600 hover:text-sky-800 font-medium">
                  <Pencil size={11} /> Editar
                </button>
              )}
            </div>
          )}

          {editandoMotivo && (
            <div className="space-y-2 bg-sky-50 border border-sky-200 rounded-lg p-3">
              <label className="block text-[11px] font-semibold text-sky-800 uppercase tracking-wide">Motivo de la pausa</label>
              <div className="flex flex-wrap gap-1.5">
                {!motivoEditado.startsWith(MOTIVO_ESPERANDO) && (
                  <button
                    type="button"
                    onClick={() => setMotivoEditado((m) => componerMotivoPausa(true, m))}
                    className="text-[11px] font-semibold px-2 py-1 rounded-full border border-sky-300 text-sky-700 hover:bg-white"
                  >
                    + {MOTIVO_ESPERANDO}
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                maxLength={1000}
                value={motivoEditado}
                onChange={(e) => setMotivoEditado(e.target.value)}
                placeholder="¿Por qué está en pausa?"
                className="w-full text-sm border border-sky-200 rounded-lg px-2 py-1.5 bg-white"
              />
              {errorMotivo && <p className="text-xs text-red-600">{errorMotivo}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={guardarMotivo}
                  disabled={!motivoEditado.trim()}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-600 text-white disabled:opacity-50"
                >
                  Guardar motivo
                </button>
                <button onClick={() => setEditandoMotivo(false)} className="text-xs text-slate-400">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {solicitud.estado === 'aprobada' && solicitud.completada && (
        <p className="text-xs text-slate-500">
          {rangoTexto(solicitud) && <>Periodo planeado: {rangoTexto(solicitud)}</>}
          {solicitud.fecha_completada && (
            <>
              {rangoTexto(solicitud) ? ' · ' : ''}
              <strong className="text-slate-600">
                Completada el {new Date(solicitud.fecha_completada).toLocaleDateString('es-MX')}
              </strong>
            </>
          )}
        </p>
      )}

      {solicitud.comentario_admin && (
        <div className="flex gap-2 text-xs bg-sky-50 border border-sky-200 text-sky-800 rounded-lg px-3 py-2">
          <MessageSquare size={14} className="shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold">
              Comentario de administración
              {solicitud.fecha_comentario && (
                <span className="font-normal text-sky-600"> · {new Date(solicitud.fecha_comentario).toLocaleDateString('es-MX')}</span>
              )}
            </p>
            <p className="whitespace-pre-wrap">{solicitud.comentario_admin}</p>
          </div>
        </div>
      )}

      {solicitud.motivo_rechazo && (
        <p className="text-xs text-red-600">Motivo de rechazo: {solicitud.motivo_rechazo}</p>
      )}

      {esAdmin && solicitud.estado === 'pendiente' && (
        <div className="pt-3 border-t border-slate-100 space-y-2">
          {!mostrarAprobar ? (
            <div className="flex gap-2">
              <button
                onClick={() => setMostrarAprobar(true)}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
              >
                <Check size={14} /> Aprobar
              </button>
              {!mostrarRechazo ? (
                <button onClick={() => setMostrarRechazo(true)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 font-medium hover:bg-red-50 transition">
                  <X size={14} /> Rechazar
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2 bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
              <RangoFechas
                inicio={rangoAprobar.inicio}
                fin={rangoAprobar.fin}
                onChange={setRangoAprobar}
              />
              {errorAprobar && <p className="text-xs text-red-600">{errorAprobar}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAprobar}
                  disabled={aprobando || !rangoValido(rangoAprobar)}
                  className="text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium disabled:opacity-50"
                >
                  {aprobando ? 'Aprobando…' : 'Confirmar aprobación'}
                </button>
                <button onClick={() => setMostrarAprobar(false)} className="text-sm text-slate-400">Cancelar</button>
              </div>
            </div>
          )}

          {mostrarRechazo && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                placeholder="Motivo del rechazo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 flex-1"
              />
              <button
                onClick={() => onRechazar(solicitud.id, motivo)}
                className="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition"
              >
                Confirmar
              </button>
              <button onClick={() => setMostrarRechazo(false)} className="text-sm text-slate-400">Cancelar</button>
            </div>
          )}
        </div>
      )}

      {esAdmin && solicitud.estado === 'rechazada' && (
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleReabrir}
              disabled={reabriendo || eliminando}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-isp-teal text-white font-medium hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw size={14} /> {reabriendo ? 'Reabriendo…' : 'Reabrir'}
            </button>

            {!confirmarEliminar ? (
              <button
                onClick={() => setConfirmarEliminar(true)}
                disabled={reabriendo || eliminando}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 font-medium hover:bg-red-50 transition disabled:opacity-50"
              >
                <Trash2 size={14} /> Eliminar permanentemente
              </button>
            ) : (
              <>
                <span className="text-xs text-slate-500">¿Eliminar para siempre?</span>
                <button
                  onClick={handleEliminar}
                  disabled={eliminando}
                  className="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition disabled:opacity-50"
                >
                  {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
                </button>
                <button onClick={() => setConfirmarEliminar(false)} disabled={eliminando} className="text-sm text-slate-400">
                  Cancelar
                </button>
              </>
            )}
          </div>
          {mensajeReabrir && <p className="text-xs text-amber-600">{mensajeReabrir}</p>}
        </div>
      )}

      {esAdmin && activa && (
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {solicitud.pausada ? (
              onReanudar && (
                <button
                  onClick={handleReanudar}
                  disabled={reanudando}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 transition disabled:opacity-50"
                >
                  <Play size={14} /> {reanudando ? 'Reanudando…' : 'Reanudar'}
                </button>
              )
            ) : (
              <>
                {onPausar && !mostrarPausar && (
                  <button
                    onClick={() => setMostrarPausar(true)}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-sky-200 text-sky-600 font-medium hover:bg-sky-50 transition"
                  >
                    <Pause size={14} /> Pausar
                  </button>
                )}
                {onCompletar && !mostrarCompletar && (
                  <button
                    onClick={() => setMostrarCompletar(true)}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-isp-navyDark text-white font-medium hover:brightness-110 transition"
                  >
                    <Check size={14} /> Marcar como completada
                  </button>
                )}
              </>
            )}
          </div>

          {mostrarPausar && (
            <div className="space-y-2 bg-sky-50/60 border border-sky-100 rounded-lg p-3">
              <label className="flex items-center gap-2 text-sm text-sky-800 font-medium">
                <input
                  type="checkbox"
                  checked={esperandoRespuesta}
                  onChange={(e) => setEsperandoRespuesta(e.target.checked)}
                  className="accent-sky-600"
                />
                {MOTIVO_ESPERANDO}
              </label>
              <input
                placeholder="Comentario: ¿por qué se pausa? (ej. esperando cotización del proveedor)"
                value={motivoPausa}
                maxLength={900}
                onChange={(e) => setMotivoPausa(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
              />
              <div className="flex items-center gap-2">
                <button onClick={handlePausar} disabled={pausando} className="text-sm px-3 py-1.5 rounded-lg bg-sky-600 text-white font-medium disabled:opacity-50">
                  {pausando ? 'Pausando…' : 'Confirmar pausa'}
                </button>
                <button onClick={() => setMostrarPausar(false)} className="text-sm text-slate-400">Cancelar</button>
              </div>
            </div>
          )}

          {mostrarCompletar && (
            <div className="flex items-center gap-2 flex-wrap bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <Camera size={14} />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(e) => setFotosEvidencia(Array.from(e.target.files).slice(0, 6))}
                  className="text-xs"
                />
              </label>
              <button
                onClick={handleCompletar}
                disabled={completando || fotosEvidencia.length === 0}
                className="text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium disabled:opacity-50"
              >
                {completando ? 'Guardando…' : 'Confirmar'}
              </button>
              <button onClick={() => { setMostrarCompletar(false); setFotosEvidencia([]); }} className="text-sm text-slate-400">Cancelar</button>
              {fotosEvidencia.length === 0 && <span className="text-[11px] text-slate-400 w-full">Adjunta al menos 1 foto de evidencia.</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
