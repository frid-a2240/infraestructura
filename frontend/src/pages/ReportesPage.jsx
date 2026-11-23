import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FileBarChart2, FileText, UploadCloud, X, Eye, Download, Trash2, Search, CheckCircle2,
} from 'lucide-react';
import Layout from '../components/Layout/Layout.jsx';
import SectionCard from '../components/UI/SectionCard.jsx';
import EmptyState from '../components/UI/EmptyState.jsx';
import { api } from '../api/client.js';

const MAX_MB = 20;
const MAX_ARCHIVOS = 10;

function tamanoLegible(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function esPdf(archivo) {
  return archivo.name.toLowerCase().endsWith('.pdf') && (archivo.type === 'application/pdf' || archivo.type === '');
}

export default function ReportesPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [seleccion, setSeleccion] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [arrastrando, setArrastrando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [confirmarId, setConfirmarId] = useState(null);
  const inputRef = useRef(null);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/api/reportes/ordenes');
      setOrdenes(data.ordenes);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregarArchivos = (lista) => {
    const nuevos = Array.from(lista || []);
    if (nuevos.length === 0) return;
    const pdfs = nuevos.filter(esPdf);
    const validos = pdfs.filter((f) => f.size <= MAX_MB * 1024 * 1024);
    const avisos = [];
    if (pdfs.length < nuevos.length) avisos.push('Solo se aceptan archivos PDF; se omitieron los demás.');
    if (validos.length < pdfs.length) avisos.push(`Cada PDF puede pesar máximo ${MAX_MB} MB.`);

    const combinados = [...seleccion, ...validos];
    if (combinados.length > MAX_ARCHIVOS) avisos.push(`Puedes subir hasta ${MAX_ARCHIVOS} archivos a la vez.`);
    setSeleccion(combinados.slice(0, MAX_ARCHIVOS));
    setError(avisos.join(' '));
    setExito('');
  };

  const quitarDeSeleccion = (idx) => setSeleccion((prev) => prev.filter((_, i) => i !== idx));

  const subir = async () => {
    if (subiendo || seleccion.length === 0) return;
    setSubiendo(true);
    setError('');
    setExito('');
    try {
      const form = new FormData();
      seleccion.forEach((f) => form.append('archivos', f));
      const { data } = await api.post('/api/reportes/ordenes', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setExito(`Se guardaron ${data.ordenes.length} orden(es) de trabajo.`);
      setSeleccion([]);
      if (inputRef.current) inputRef.current.value = '';
      cargar();
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudieron subir los archivos.');
    } finally {
      setSubiendo(false);
    }
  };

  const abrir = async (orden, descargar = false) => {
    // La pestaña se abre antes de la petición para que el navegador no la bloquee como ventana emergente.
    const ventana = descargar ? null : window.open('', '_blank');
    try {
      const { data } = await api.get(`/api/reportes/ordenes/${orden.id}/archivo`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      if (descargar) {
        const a = document.createElement('a');
        a.href = url;
        a.download = orden.nombre_original;
        a.click();
      } else if (ventana) {
        ventana.location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      ventana?.close();
      setError('No se pudo abrir el archivo.');
    }
  };

  const eliminar = async (id) => {
    try {
      await api.delete(`/api/reportes/ordenes/${id}`);
      setConfirmarId(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo eliminar el archivo.');
    }
  };

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? ordenes.filter((o) => o.nombre_original.toLowerCase().includes(q)) : ordenes;
  }, [ordenes, busqueda]);

  return (
    <Layout>
      <div className="flex items-center gap-2 mb-6">
        <FileBarChart2 size={22} className="text-isp-navy" />
        <div>
          <h1 className="text-2xl font-bold text-isp-navy">Reportes de trabajo</h1>
          <p className="text-sm text-slate-500">Órdenes de trabajo y documentos de las actividades atendidas.</p>
        </div>
      </div>

      <SectionCard
        title="Órdenes de trabajo (PDF)"
        subtitle="Sube las órdenes de trabajo en PDF; quedan guardadas aquí para consultarlas después."
        className="mb-6"
      >
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            agregarArchivos(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center text-center rounded-xl border-2 border-dashed px-4 py-8 cursor-pointer transition ${
            arrastrando ? 'border-isp-teal bg-isp-teal/5' : 'border-slate-200 hover:border-isp-teal/60 hover:bg-slate-50'
          }`}
        >
          <UploadCloud size={28} className="text-isp-teal mb-2" />
          <p className="text-sm font-semibold text-slate-600">Arrastra aquí tus PDF o haz clic para elegirlos</p>
          <p className="text-xs text-slate-400 mt-1">Solo archivos PDF · máximo {MAX_MB} MB cada uno · hasta {MAX_ARCHIVOS} a la vez</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              agregarArchivos(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {seleccion.length > 0 && (
          <div className="mt-4 space-y-2">
            {seleccion.map((f, idx) => (
              <div key={`${f.name}-${idx}`} className="flex items-center gap-2 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <FileText size={15} className="text-red-500 shrink-0" />
                <span className="truncate flex-1">{f.name}</span>
                <span className="text-xs text-slate-400 shrink-0">{tamanoLegible(f.size)}</span>
                <button onClick={() => quitarDeSeleccion(idx)} className="text-slate-400 hover:text-red-500" title="Quitar">
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={subir}
              disabled={subiendo}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-isp-navyDark text-white font-semibold hover:brightness-110 transition disabled:opacity-50"
            >
              <UploadCloud size={15} />
              {subiendo ? 'Subiendo…' : `Subir ${seleccion.length} archivo${seleccion.length === 1 ? '' : 's'}`}
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {exito && (
          <p className="mt-3 text-sm text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 size={15} /> {exito}
          </p>
        )}
      </SectionCard>

      <SectionCard
        title={`Archivos guardados (${ordenes.length})`}
        action={
          ordenes.length > 0 && (
            <label className="relative w-56">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre…"
                className="w-full text-sm border border-slate-200 rounded-lg pl-8 pr-3 py-1.5"
              />
            </label>
          )
        }
      >
        {cargando ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : visibles.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={ordenes.length === 0 ? 'Todavía no hay órdenes de trabajo' : 'Sin resultados'}
            subtitle={ordenes.length === 0 ? 'Los PDF que subas aparecerán en esta lista.' : 'Prueba con otro nombre.'}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {visibles.map((o) => (
              <div key={o.id} className="flex flex-col sm:flex-row sm:items-center gap-2 py-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate" title={o.nombre_original}>{o.nombre_original}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(o.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                      {' · '}{tamanoLegible(o.tamano_bytes)}
                      {o.subido_por && ` · ${o.subido_por}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 sm:pl-2">
                  {confirmarId === o.id ? (
                    <>
                      <span className="text-xs text-slate-500">¿Eliminar?</span>
                      <button onClick={() => eliminar(o.id)} className="text-xs px-2.5 py-1.5 rounded-lg bg-red-600 text-white font-semibold">
                        Sí, eliminar
                      </button>
                      <button onClick={() => setConfirmarId(null)} className="text-xs text-slate-400 px-1">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => abrir(o)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        <Eye size={13} /> Ver
                      </button>
                      <button
                        onClick={() => abrir(o, true)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        <Download size={13} /> Descargar
                      </button>
                      <button
                        onClick={() => setConfirmarId(o.id)}
                        title="Eliminar"
                        className="flex items-center text-xs px-2 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </Layout>
  );
}
