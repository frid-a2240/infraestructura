import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, LayoutGrid, CalendarDays, Bell, History, Users, Home, PlusCircle, LogOut, Menu, X as CloseIcon,
  FileBarChart2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../api/client.js';
import { esGestorUsuarios } from '../../utils/permisos.js';

const NAV_ADMIN = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/solicitudes', label: 'Tablero', icon: LayoutGrid },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/reportes', label: 'Reportes de trabajo', icon: FileBarChart2 },
  { to: '/notificaciones', label: 'Notificaciones', icon: Bell },
  { to: '/historial', label: 'Historial', icon: History },
];
const ITEM_USUARIOS = { to: '/usuarios', label: 'Usuarios', icon: Users };

const NAV_OTROS = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/solicitudes/nueva', label: 'Nueva solicitud', icon: PlusCircle },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays, roles: ['colaborador'] },
];

function inicialesDe(nombre) {
  if (!nombre) return '?';
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export default function Layout({ children }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const esAdmin = usuario?.rol === 'admin';
  const [noLeidas, setNoLeidas] = useState(0);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const items = esAdmin
    ? [...NAV_ADMIN]
    : NAV_OTROS.filter((item) => !item.roles || item.roles.includes(usuario?.rol));
  if (esGestorUsuarios(usuario)) {
    items.push(ITEM_USUARIOS);
  }

  useEffect(() => {
    if (!esAdmin) return;
    const cargarConteo = () => {
      api.get('/api/notificaciones/conteo-urgentes').then(({ data }) => setNoLeidas(data.count)).catch(() => {});
    };
    cargarConteo();
    const interval = setInterval(cargarConteo, 60000);
    return () => clearInterval(interval);
  }, [esAdmin]);

  const salir = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-dvh flex bg-slate-100 overflow-hidden">
      {menuAbierto && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 text-white flex flex-col shrink-0 transform transition-transform duration-200 lg:static lg:translate-x-0 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'linear-gradient(180deg, #24334A 0%, #1B2638 100%)' }}
      >
        <div className="p-6 flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}isotipo.png`} alt="ISP" className="w-10 h-10 rounded-lg object-contain bg-white p-1.5 shadow-sm" />
          <div>
            <p className="text-sm font-bold leading-tight tracking-wide">ISP</p>
            <p className="text-[11px] text-white/50 leading-tight">Infraestructura</p>
          </div>
          <button
            onClick={() => setMenuAbierto(false)}
            className="ml-auto lg:hidden text-white/60 hover:text-white p-1"
            aria-label="Cerrar menú"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 pt-2 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMenuAbierto(false)}
              className={({ isActive }) =>
                `relative flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-isp-teal text-white shadow-[0_4px_14px_-4px_rgba(0,175,170,0.6)]'
                    : 'text-white/65 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <item.icon size={16} className="shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.to === '/notificaciones' && noLeidas > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {noLeidas > 99 ? '99+' : noLeidas}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 mx-3 mb-3 rounded-xl bg-white/5 shrink-0">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-isp-teal/25 border border-isp-teal/40 flex items-center justify-center text-xs font-bold text-isp-tealLight shrink-0">
              {inicialesDe(usuario?.nombre_corto || usuario?.nombre)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{usuario?.nombre_corto || usuario?.nombre}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wide">{usuario?.rol}</p>
            </div>
          </div>
          <button
            onClick={salir}
            className="flex items-center gap-1.5 w-full text-left text-xs text-white/60 hover:text-white transition"
          >
            <LogOut size={13} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shrink-0">
          <button
            onClick={() => setMenuAbierto(true)}
            className="text-isp-navy p-1 -ml-1"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <img src={`${import.meta.env.BASE_URL}isotipo.png`} alt="ISP" className="w-6 h-6 object-contain" />
          <span className="font-bold text-isp-navy text-sm">Infraestructura</span>
          {esAdmin && (
            <Link
              to="/notificaciones"
              className="ml-auto relative p-2 -mr-2 text-isp-navy"
              aria-label={`Notificaciones${noLeidas > 0 ? `: ${noLeidas} urgentes` : ''}`}
            >
              <Bell size={20} />
              {noLeidas > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {noLeidas > 99 ? '99+' : noLeidas}
                </span>
              )}
            </Link>
          )}
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
