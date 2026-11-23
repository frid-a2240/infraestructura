import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import HomePage from './pages/HomePage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AdminSolicitudesPage from './pages/AdminSolicitudesPage.jsx';
import NuevaSolicitudPage from './pages/NuevaSolicitudPage.jsx';
import CalendarioPage from './pages/CalendarioPage.jsx';
import HistorialPage from './pages/HistorialPage.jsx';
import UsuariosPage from './pages/UsuariosPage.jsx';
import NotificacionesPage from './pages/NotificacionesPage.jsx';
import ReportesPage from './pages/ReportesPage.jsx';

// Excepción puntual: el área de sistemas administra el módulo de Usuarios
// aunque su rol en el sistema sea colaborador.
const GESTOR_USUARIOS_ID = '204862';

function RutaPrivada({ children, roles, extraId }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  const permitidoPorExtra = extraId && usuario.numero_empleado === extraId;
  if (roles && !roles.includes(usuario.rol) && !permitidoPorExtra) return <Navigate to="/" replace />;
  return children;
}

function InicioSegunRol() {
  const { usuario } = useAuth();
  return usuario?.rol === 'admin' ? <DashboardPage /> : <HomePage />;
}

export default function App() {
  const { usuario } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<RutaPrivada><InicioSegunRol /></RutaPrivada>} />
      <Route path="/solicitudes" element={<RutaPrivada roles={['admin']}><AdminSolicitudesPage /></RutaPrivada>} />
      <Route path="/solicitudes/nueva" element={<RutaPrivada roles={['colaborador', 'invitado']}><NuevaSolicitudPage /></RutaPrivada>} />
      <Route
        path="/calendario"
        element={
          <RutaPrivada roles={['admin', 'colaborador']}>
            <CalendarioPage />
          </RutaPrivada>
        }
      />
      <Route path="/notificaciones" element={<RutaPrivada roles={['admin']}><NotificacionesPage /></RutaPrivada>} />
      <Route path="/historial" element={<RutaPrivada roles={['admin']}><HistorialPage /></RutaPrivada>} />
      <Route path="/reportes" element={<RutaPrivada roles={['admin']}><ReportesPage /></RutaPrivada>} />
      <Route path="/usuarios" element={<RutaPrivada roles={[]} extraId={GESTOR_USUARIOS_ID}><UsuariosPage /></RutaPrivada>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
