import { useEffect, useState, useCallback, useMemo } from 'react';
import { Users as UsersIcon, Search, KeyRound, Power } from 'lucide-react';
import Layout from '../components/Layout/Layout.jsx';
import SectionCard from '../components/UI/SectionCard.jsx';
import EmptyState from '../components/UI/EmptyState.jsx';
import { api } from '../api/client.js';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [tab, setTab] = useState('isp'); // isp | invitados
  const [busqueda, setBusqueda] = useState('');
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [passwordRevelada, setPasswordRevelada] = useState(null); // { id, password }

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/api/usuarios');
      setUsuarios(data.usuarios);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarRol = async (id, rol) => {
    setError('');
    try {
      await api.patch(`/api/usuarios/${id}/rol`, { rol });
      cargar();
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo cambiar el rol.');
    }
  };

  const toggleActivo = async (id) => {
    await api.patch(`/api/usuarios/${id}/activo`);
    cargar();
  };

  const regenerarPassword = async (id) => {
    setError('');
    setPasswordRevelada(null);
    try {
      const { data } = await api.post(`/api/usuarios/${id}/regenerar-password`);
      setPasswordRevelada({ id, password: data.password_temporal });
      cargar();
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo generar la contraseña.');
    }
  };

  const isp = useMemo(() => usuarios.filter((u) => u.rol !== 'invitado'), [usuarios]);
  const ispRegistrados = useMemo(() => isp.filter((u) => !u.primera_vez), [isp]);
  const invitados = useMemo(() => usuarios.filter((u) => u.rol === 'invitado'), [usuarios]);

  const listaBase = tab === 'isp' ? (mostrarTodos ? isp : ispRegistrados) : invitados;

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return listaBase;
    return listaBase.filter(
      (u) =>
        u.nombre.toLowerCase().includes(q) ||
        (u.numero_empleado || '').includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    );
  }, [listaBase, busqueda]);

  return (
    <Layout>
      <div className="flex items-center gap-2 mb-1">
        <UsersIcon size={22} className="text-isp-navy" />
        <h1 className="text-2xl font-bold text-isp-navy">Usuarios</h1>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Se muestra solo a quienes ya iniciaron sesión por primera vez. El resto del padrón está precargado pero no ha entrado todavía.
      </p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('isp')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            tab === 'isp' ? 'bg-isp-navyDark text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          Personal ISP ({ispRegistrados.length})
        </button>
        <button
          onClick={() => setTab('invitados')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            tab === 'invitados' ? 'bg-isp-navyDark text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          Invitados ({invitados.length})
        </button>
      </div>

      <SectionCard>
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={tab === 'isp' ? 'Buscar por nombre o número de control…' : 'Buscar por nombre o correo…'}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm"
          />
        </div>

        {tab === 'isp' && (
          <label className="flex items-center gap-2 text-xs text-slate-500 mb-4 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={mostrarTodos}
              onChange={(e) => setMostrarTodos(e.target.checked)}
              className="accent-isp-teal"
            />
            Mostrar también a quienes aún no han ingresado ({isp.length - ispRegistrados.length})
          </label>
        )}

        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
        {cargando && <p className="text-sm text-slate-400">Cargando…</p>}

        <div className="space-y-1 max-h-[560px] overflow-y-auto">
          {filtrados.map((u) => (
            <div key={u.id} className="border-b border-slate-100 py-2.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-700 truncate">{u.nombre_corto || u.nombre}</p>
                  <p className="text-xs text-slate-400">
                    {u.numero_empleado || u.email} {u.area ? `· ${u.area}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {tab === 'isp' ? (
                    <select
                      value={u.rol}
                      onChange={(e) => cambiarRol(u.id, e.target.value)}
                      className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1"
                    >
                      <option value="colaborador">Colaborador</option>
                      <option value="admin">Administrador</option>
                    </select>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                      Invitado
                    </span>
                  )}
                  {tab === 'isp' && u.rol === 'colaborador' && u.primera_vez && (
                    <button
                      onClick={() => regenerarPassword(u.id)}
                      title="Restablece la contraseña genérica para esta persona"
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                    >
                      <KeyRound size={12} /> Restablecer contraseña
                    </button>
                  )}
                  <button
                    onClick={() => toggleActivo(u.id)}
                    className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${u.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                  >
                    <Power size={12} /> {u.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
              </div>
              {passwordRevelada?.id === u.id && (
                <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                  <span>
                    Se restableció la contraseña genérica para <strong>{u.nombre_corto || u.nombre}</strong>: <strong className="font-mono">{passwordRevelada.password}</strong> — al entrar con ella se le pedirá crear la suya.
                  </span>
                  <button onClick={() => setPasswordRevelada(null)} className="ml-auto text-amber-600 hover:text-amber-800 shrink-0">✕</button>
                </div>
              )}
            </div>
          ))}
          {!cargando && filtrados.length === 0 && <EmptyState title="Sin resultados" />}
        </div>
      </SectionCard>
    </Layout>
  );
}
