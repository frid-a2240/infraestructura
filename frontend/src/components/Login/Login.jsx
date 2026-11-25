import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import './login.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { login } = useAuth();
  // login | nueva-password | olvide-solicitar | olvide-confirmar | visitante-correo | visitante-registro | visitante-codigo
  const [paso, setPaso] = useState('login');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [nombrePendiente, setNombrePendiente] = useState('');

  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [emailNuevo, setEmailNuevo] = useState('');

  const [visitante, setVisitante] = useState({ nombre: '', email: '', area: '' });
  const [noRegistrado, setNoRegistrado] = useState(false);
  const [aviso, setAviso] = useState('');

  const [olvideId, setOlvideId] = useState('');
  const [emailEnmascarado, setEmailEnmascarado] = useState('');
  const [codigo, setCodigo] = useState('');

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleLogin = async () => {
    setError('');
    if (!id.trim() || !pw) {
      setError('Ingresa tu ID y contraseña.');
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { identificador: id.trim(), password: pw });
      if (data.primera_vez) {
        setNombrePendiente(data.nombre_corto || data.nombre);
        setPaso('nueva-password');
      } else {
        login(data);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Error de conexión con el servidor');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleNuevaPassword = async () => {
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNuevo.trim())) {
      setError('Ingresa un correo válido; lo usamos si alguna vez olvidas tu contraseña.');
      triggerShake();
      return;
    }
    if (pw1.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      triggerShake();
      return;
    }
    if (pw1 !== pw2) {
      setError('Las contraseñas no coinciden.');
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/completar-registro', {
        numero_empleado: id.trim(),
        password_nueva: pw1,
        email: emailNuevo.trim(),
      });
      login(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error de conexión con el servidor');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitarCodigo = async () => {
    setError('');
    if (!olvideId.trim()) {
      setError('Ingresa tu número de control o correo.');
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/recuperar/solicitar', { identificador: olvideId.trim() });
      setEmailEnmascarado(data.email_enmascarado);
      setPw1('');
      setPw2('');
      setCodigo('');
      setPaso('olvide-confirmar');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error de conexión con el servidor');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarRecuperacion = async () => {
    setError('');
    if (!codigo.trim()) {
      setError('Ingresa el código que te enviamos por correo.');
      triggerShake();
      return;
    }
    if (pw1.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      triggerShake();
      return;
    }
    if (pw1 !== pw2) {
      setError('Las contraseñas no coinciden.');
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/recuperar/confirmar', {
        identificador: olvideId.trim(),
        codigo: codigo.trim(),
        password_nueva: pw1,
      });
      login(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error de conexión con el servidor');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const irACodigoVisitante = (enmascarado, mensaje) => {
    setEmailEnmascarado(enmascarado);
    setCodigo('');
    setError('');
    setAviso(mensaje);
    setPaso('visitante-codigo');
  };

  const handleVisitanteSolicitar = async () => {
    setError('');
    setAviso('');
    setNoRegistrado(false);
    if (!EMAIL_RE.test(visitante.email.trim())) {
      setError('Ingresa un correo válido.');
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/visitante/solicitar-codigo', { email: visitante.email.trim() });
      irACodigoVisitante(data.email_enmascarado, '');
    } catch (err) {
      if (err.response?.data?.no_registrado) setNoRegistrado(true);
      setError(err.response?.data?.detail || 'Error de conexión con el servidor');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleVisitanteRegistro = async () => {
    setError('');
    setAviso('');
    const { nombre, email, area } = visitante;
    if (!nombre.trim() || !area.trim() || !EMAIL_RE.test(email.trim())) {
      setError('Completa tu nombre, un correo válido y tu área o empresa.');
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/visitante/registro', {
        nombre: nombre.trim(),
        email: email.trim(),
        area: area.trim(),
      });
      irACodigoVisitante(
        data.email_enmascarado,
        data.ya_registrado
          ? 'Ya te registraste antes. Te enviamos tu código para entrar.'
          : 'Registro listo. Te enviamos tu código para entrar.'
      );
    } catch (err) {
      setError(err.response?.data?.detail || 'Error de conexión con el servidor');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleVisitanteVerificar = async () => {
    setError('');
    if (!/^\d{6}$/.test(codigo)) {
      setError('Escribe el código de 6 dígitos que te enviamos.');
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/visitante/verificar', { email: visitante.email.trim(), codigo });
      login(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error de conexión con el servidor');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleVisitanteReenviar = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/visitante/solicitar-codigo', { email: visitante.email.trim() });
      irACodigoVisitante(data.email_enmascarado, 'Te enviamos un código nuevo.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error de conexión con el servidor');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const irAVisitante = () => {
    setPaso('visitante-correo');
    setError('');
    setAviso('');
    setNoRegistrado(false);
  };

  const volverALogin = () => {
    setPaso('login');
    setError('');
    setAviso('');
    setNoRegistrado(false);
    setPw1('');
    setPw2('');
    setEmailNuevo('');
    setOlvideId('');
    setCodigo('');
    setEmailEnmascarado('');
  };

  return (
    <div className="ls-root">
      <motion.div
        className="ls-right"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
      >
        <img src={`${import.meta.env.BASE_URL}infra.jpg`} alt="Infraestructura ISP" className="ls-photo" />
      </motion.div>

      <motion.div
        className={`ls-left${shake ? ' shake' : ''}`}
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="ls-inner">
          <div className="ls-brand">
            <img src={`${import.meta.env.BASE_URL}isotipo.png`} alt="ISP" className="ls-logo" />
            <p className="ls-company">Infraestructura y Servicios Portuarios</p>
            <p className="ls-system">Sistema de Infraestructura</p>
          </div>

          <AnimatePresence mode="wait">
            {paso === 'login' && (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="ls-title">Iniciar sesión</h2>
                <p className="ls-subtitle">Ingresa tus credenciales para acceder al sistema</p>

                <div className="ls-field">
                  <label className="ls-label">Número de control</label>
                  <input
                    className="ls-input"
                    type="text"
                    placeholder="Ej. 204726"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                <div className="ls-field">
                  <label className="ls-label">Contraseña</label>
                  <div className="ls-input-wrap">
                    <input
                      className="ls-input"
                      type={showPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                    <button type="button" className="ls-eye" onClick={() => setShowPw((v) => !v)}>
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="ls-info">
                  Contraseña genérica: <strong>isp2026</strong>
                </div>

                {error && <div className="ls-error">{error}</div>}

                <button className="ls-btn" onClick={handleLogin} disabled={loading}>
                  {loading ? 'Verificando…' : 'Ingresar'}
                </button>

                <div className="ls-link-row">
                  <button className="ls-link" onClick={() => { setPaso('olvide-solicitar'); setError(''); setOlvideId(id); }}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="ls-visitante">
                  <span>¿Eres visitante o externo?</span>
                  <button className="ls-link ls-link-azul" onClick={irAVisitante}>
                    Entra aquí, sin contraseña →
                  </button>
                </div>
              </motion.div>
            )}

            {paso === 'nueva-password' && (
              <motion.div key="nueva-password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="ls-title">Bienvenido Colaborador ISP</h2>
                <p className="ls-subtitle">Hola {nombrePendiente}, crea tu contraseña para continuar. La usarás para entrar de aquí en adelante.</p>

                <div className="ls-field">
                  <label className="ls-label">Tu correo</label>
                  <input
                    className="ls-input"
                    type="email"
                    placeholder="tucorreo@ejemplo.com"
                    value={emailNuevo}
                    onChange={(e) => setEmailNuevo(e.target.value)}
                  />
                </div>
                <div className="ls-field">
                  <label className="ls-label">Nueva contraseña</label>
                  <input
                    className="ls-input"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={pw1}
                    onChange={(e) => setPw1(e.target.value)}
                  />
                </div>
                <div className="ls-field">
                  <label className="ls-label">Confirmar contraseña</label>
                  <input
                    className="ls-input"
                    type="password"
                    placeholder="Repítela"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleNuevaPassword()}
                  />
                </div>

                {error && <div className="ls-error">{error}</div>}

                <button className="ls-btn" onClick={handleNuevaPassword} disabled={loading}>
                  {loading ? 'Guardando…' : 'Crear y entrar'}
                </button>
                <button className="ls-btn-secondary" onClick={volverALogin}>← Volver</button>
              </motion.div>
            )}

            {paso === 'visitante-correo' && (
              <motion.div key="visitante-correo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="ls-title">Acceso de visitante</h2>
                <p className="ls-subtitle">
                  Escribe el correo con el que te registraste. Te enviaremos un código para entrar, sin contraseña.
                </p>

                <div className="ls-field">
                  <label className="ls-label">Tu correo</label>
                  <input
                    className="ls-input"
                    type="email"
                    placeholder="tucorreo@ejemplo.com"
                    value={visitante.email}
                    onChange={(e) => { setVisitante({ ...visitante, email: e.target.value }); setNoRegistrado(false); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleVisitanteSolicitar()}
                  />
                </div>

                {error && <div className="ls-error">{error}</div>}

                {noRegistrado ? (
                  <button className="ls-btn" onClick={() => { setPaso('visitante-registro'); setError(''); setNoRegistrado(false); }}>
                    Registrarme
                  </button>
                ) : (
                  <button className="ls-btn" onClick={handleVisitanteSolicitar} disabled={loading}>
                    {loading ? 'Enviando…' : 'Enviarme el código'}
                  </button>
                )}

                <div className="ls-link-row">
                  ¿Es tu primera vez?{' '}
                  <button className="ls-link" onClick={() => { setPaso('visitante-registro'); setError(''); setNoRegistrado(false); }}>
                    Regístrate aquí
                  </button>
                </div>
                <button className="ls-btn-secondary" onClick={volverALogin}>← Soy personal ISP</button>
              </motion.div>
            )}

            {paso === 'visitante-registro' && (
              <motion.div key="visitante-registro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="ls-title">Registro de visitante</h2>
                <p className="ls-subtitle">
                  Regístrate una sola vez para enviar solicitudes. No necesitas contraseña: cada vez que entres te llegará un código a tu correo.
                </p>

                <div className="ls-field">
                  <label className="ls-label">Nombre completo</label>
                  <input
                    className="ls-input"
                    type="text"
                    value={visitante.nombre}
                    onChange={(e) => setVisitante({ ...visitante, nombre: e.target.value })}
                  />
                </div>
                <div className="ls-field">
                  <label className="ls-label">Correo</label>
                  <input
                    className="ls-input"
                    type="email"
                    placeholder="tucorreo@ejemplo.com"
                    value={visitante.email}
                    onChange={(e) => setVisitante({ ...visitante, email: e.target.value })}
                  />
                </div>
                <div className="ls-field">
                  <label className="ls-label">Área / Empresa</label>
                  <input
                    className="ls-input"
                    type="text"
                    value={visitante.area}
                    onChange={(e) => setVisitante({ ...visitante, area: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleVisitanteRegistro()}
                  />
                </div>

                {error && <div className="ls-error">{error}</div>}

                <button className="ls-btn" onClick={handleVisitanteRegistro} disabled={loading}>
                  {loading ? 'Registrando…' : 'Registrarme y recibir código'}
                </button>
                <button className="ls-btn-secondary" onClick={irAVisitante}>← Ya me registré antes</button>
              </motion.div>
            )}

            {paso === 'visitante-codigo' && (
              <motion.div key="visitante-codigo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="ls-title">Revisa tu correo</h2>
                <p className="ls-subtitle">
                  Te enviamos un código de 6 dígitos a <strong>{emailEnmascarado}</strong>. Es válido por 10 minutos.
                </p>

                {aviso && <div className="ls-info">{aviso}</div>}

                <div className="ls-field">
                  <label className="ls-label">Código de 6 dígitos</label>
                  <input
                    className="ls-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && handleVisitanteVerificar()}
                  />
                </div>

                {error && <div className="ls-error">{error}</div>}

                <button className="ls-btn" onClick={handleVisitanteVerificar} disabled={loading}>
                  {loading ? 'Verificando…' : 'Entrar'}
                </button>
                <div className="ls-link-row">
                  ¿No te llegó?{' '}
                  <button className="ls-link" onClick={handleVisitanteReenviar} disabled={loading}>
                    Enviar otro código
                  </button>
                </div>
                <button className="ls-btn-secondary" onClick={irAVisitante}>← Cambiar correo</button>
              </motion.div>
            )}

            {paso === 'olvide-solicitar' && (
              <motion.div key="olvide-solicitar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="ls-title">Recuperar contraseña</h2>
                <p className="ls-subtitle">
                  Ingresa tu número de control o correo. Si tu cuenta ya tiene un correo registrado, te mandamos un código para restablecer tu contraseña.
                </p>

                <div className="ls-field">
                  <label className="ls-label">Número de control o correo</label>
                  <input
                    className="ls-input"
                    type="text"
                    placeholder="Ej. 204726 o correo@ejemplo.com"
                    value={olvideId}
                    onChange={(e) => setOlvideId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSolicitarCodigo()}
                  />
                </div>

                {error && <div className="ls-error">{error}</div>}

                <button className="ls-btn" onClick={handleSolicitarCodigo} disabled={loading}>
                  {loading ? 'Enviando…' : 'Enviar código por correo'}
                </button>
                <button className="ls-btn-secondary" onClick={volverALogin}>← Volver a iniciar sesión</button>
              </motion.div>
            )}

            {paso === 'olvide-confirmar' && (
              <motion.div key="olvide-confirmar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="ls-title">Revisa tu correo</h2>
                <p className="ls-subtitle">
                  Te enviamos un código a <strong>{emailEnmascarado}</strong>. Escríbelo aquí junto con tu nueva contraseña (válido 15 minutos).
                </p>

                <div className="ls-field">
                  <label className="ls-label">Código de 6 dígitos</label>
                  <input
                    className="ls-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div className="ls-field">
                  <label className="ls-label">Nueva contraseña</label>
                  <input
                    className="ls-input"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={pw1}
                    onChange={(e) => setPw1(e.target.value)}
                  />
                </div>
                <div className="ls-field">
                  <label className="ls-label">Confirmar contraseña</label>
                  <input
                    className="ls-input"
                    type="password"
                    placeholder="Repítela"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirmarRecuperacion()}
                  />
                </div>

                {error && <div className="ls-error">{error}</div>}

                <button className="ls-btn" onClick={handleConfirmarRecuperacion} disabled={loading}>
                  {loading ? 'Guardando…' : 'Cambiar contraseña y entrar'}
                </button>
                <button className="ls-btn-secondary" onClick={() => setPaso('olvide-solicitar')}>← Pedir otro código</button>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="ls-footer">ISP · {new Date().getFullYear()}</p>
        </div>
      </motion.div>
    </div>
  );
}
