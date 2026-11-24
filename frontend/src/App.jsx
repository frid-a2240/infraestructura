import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { esGestorUsuarios } from './utils/permisos.js';

// Cada página se descarga solo cuando se abre: la primera carga (el login) es mucho más ligera.
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const AdminSolicitudesPage = lazy(() => import('./pages/AdminSolicitudesPage.jsx'));
const NuevaSolicitudPage = lazy(() => import('./pages/NuevaSolicitudPage.jsx'));
const CalendarioPage = lazy(() => import('./pages/CalendarioPage.jsx'));
const HistorialPage = lazy(() => import('./pages/HistorialPage.jsx'));
const UsuariosPage = lazy(() => import('./pages/UsuariosPage.jsx'));
const NotificacionesPage = lazy(() => import('./pages/NotificacionesPage.jsx'));
const ReportesPage = lazy(() => import('./pages/ReportesPage.jsx'));

function RutaPrivada({ children, roles, permitir }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  const permitido = permitir ? permitir(usuario) : !roles || roles.includes(usuario.rol);
  if (!permitido) return <Navigate to="/" replace />;
  return children;
}

function InicioSegunRol() {
  const { usuario } = useAuth();
  return usuario?.rol === 'admin' ? <DashboardPage /> : <HomePage />;
}

function Cargando() {
  return (
    <div className="h-dvh flex items-center justify-center bg-slate-100">
      <div className="w-8 h-8 rounded-full border-2 border-isp-teal border-t-transparent animate-spin" />
    </div>
  );
}

export default function App() {
  const { usuario } = useAuth();
  return (
    <Suspense fallback={<Cargando />}>
      <Routes>
        <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={<RutaPrivada><InicioSegunRol /></RutaPrivada>} />
        <Route path="/solicitudes" element={<RutaPrivada roles={['admin']}><AdminSolicitudesPage /></RutaPrivada>} />
        <Route path="/solicitudes/nueva" element={<RutaPrivada roles={['colaborador', 'invitado']}><NuevaSolicitudPage /></RutaPrivada>} />
        <Route path="/calendario" element={<RutaPrivada roles={['admin', 'colaborador']}><CalendarioPage /></RutaPrivada>} />
        <Route path="/notificaciones" element={<RutaPrivada roles={['admin']}><NotificacionesPage /></RutaPrivada>} />
        <Route path="/historial" element={<RutaPrivada roles={['admin']}><HistorialPage /></RutaPrivada>} />
        <Route path="/reportes" element={<RutaPrivada roles={['admin']}><ReportesPage /></RutaPrivada>} />
        <Route path="/usuarios" element={<RutaPrivada permitir={esGestorUsuarios}><UsuariosPage /></RutaPrivada>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
