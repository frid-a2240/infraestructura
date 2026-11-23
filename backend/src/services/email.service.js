import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { pool } from '../config/db.js';
import { fechaISO, diasEntre, formatearFecha } from '../utils/fechas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'isotipo.png');

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.password,
  },
});

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderNota(cuerpo) {
  return cuerpo
    ? `
      <tr>
        <td style="padding:0 28px 20px;">
          <div style="font-size:13px;color:#5a6b7a;line-height:1.55;background:#f4f7f9;border-radius:10px;padding:12px 14px;">${cuerpo}</div>
        </td>
      </tr>`
    : '';
}

function renderCampos(campos) {
  if (!campos || campos.length === 0) return '';
  const celdas = campos
    .map(
      (c) => `
        <td style="vertical-align:top;padding-right:20px;">
          <div style="font-size:10.5px;color:#7a8fa0;text-transform:uppercase;font-weight:bold;letter-spacing:0.06em;">${escapeHtml(c.label)}</div>
          <div style="font-size:14px;color:#1a1a2e;font-weight:600;margin-top:3px;">${escapeHtml(c.valor)}</div>
        </td>`
    )
    .join('');
  return `
    <tr>
      <td style="padding:14px 28px 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>${celdas}</tr></table>
      </td>
    </tr>`;
}

function plantillaCorreo({ badge, titulo, campos, explicacion, nota, ctaTexto, ctaUrl }) {
  const explicacionHtml = explicacion
    ? `
      <tr>
        <td style="padding:16px 28px 4px;">
          <div style="font-size:10.5px;color:#7a8fa0;text-transform:uppercase;font-weight:bold;letter-spacing:0.06em;margin-bottom:6px;">Explicación de la necesidad</div>
          <div style="font-size:14px;color:#334155;line-height:1.55;background:#f4f7f9;border-radius:10px;padding:12px 14px;">${escapeHtml(explicacion)}</div>
        </td>
      </tr>`
    : '';

  const ctaHtml = ctaTexto
    ? `
      <tr>
        <td style="padding:20px 28px 8px;">
          <a href="${ctaUrl}" style="display:inline-block;background:#00AFAA;color:#ffffff;text-decoration:none;font-weight:bold;font-size:13px;padding:11px 22px;border-radius:8px;">${ctaTexto}</a>
        </td>
      </tr>`
    : '';

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#24334A;padding:18px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="padding-right:10px;"><img src="cid:isp-logo" width="30" height="30" alt="ISP" style="display:block;"></td>
                <td style="vertical-align:middle;">
                  <div style="color:#ffffff;font-size:13px;font-weight:bold;line-height:1.3;">ISP</div>
                  <div style="color:rgba(255,255,255,0.55);font-size:10px;">Infraestructura y Servicios Portuarios</div>
                </td>
              </tr></table>
            </td>
          </tr>
          ${badge ? `
          <tr>
            <td style="padding:20px 28px 0;">
              <span style="display:inline-block;background:${badge.bg};color:${badge.color};font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.04em;padding:4px 10px;border-radius:20px;">${badge.texto}</span>
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding:${badge ? '10px' : '24px'} 28px 0;">
              <div style="font-size:19px;font-weight:bold;color:#1a1a2e;">${titulo}</div>
            </td>
          </tr>
          ${renderCampos(campos)}
          ${explicacionHtml}
          ${renderNota(nota)}
          ${ctaHtml}
          <tr><td style="padding:8px 28px 0;"><hr style="border:none;border-top:1px solid #e8edf2;"></td></tr>
          <tr>
            <td style="padding:14px 28px;text-align:center;">
              <span style="font-size:11px;color:#b0bec5;">Sistema de Infraestructura ISP &middot; ${new Date().getFullYear()}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

async function registrarNotificacion({ tipo, destinatario, asunto, solicitudId }) {
  try {
    await pool.query(
      `INSERT INTO notificaciones (tipo, destinatario, asunto, solicitud_id) VALUES ($1, $2, $3, $4)`,
      [tipo, Array.isArray(destinatario) ? destinatario.join(', ') : destinatario, asunto, solicitudId || null]
    );
  } catch (err) {
    console.error('Error registrando notificación:', err.message);
  }
}

async function send({ to, subject, html, tipo, solicitudId }) {
  if (!to || (Array.isArray(to) && to.length === 0)) return;
  await registrarNotificacion({ tipo, destinatario: to, asunto: subject, solicitudId });
  try {
    await transporter.sendMail({
      from: `"Sistema de Infraestructura ISP" <${env.smtp.user}>`,
      to,
      subject,
      html,
      attachments: [{ filename: 'isotipo.png', path: LOGO_PATH, cid: 'isp-logo' }],
    });
  } catch (err) {
    console.error('Error enviando correo:', err.message);
  }
}

export function notificarNuevaSolicitud(solicitud) {
  const html = plantillaCorreo({
    badge: { texto: 'Nueva solicitud', bg: '#E0F5F5', color: '#00807C' },
    titulo: 'Nueva solicitud de infraestructura',
    campos: [
      { label: 'Solicitante', valor: solicitud.nombre_solicitante },
      { label: 'Área', valor: solicitud.area },
    ],
    explicacion: solicitud.explicacion,
    ctaTexto: '&#8594; Revisar solicitud',
    ctaUrl: `${env.frontendUrl}/solicitudes`,
  });
  return send({
    to: env.adminNotifyEmails,
    subject: `Nueva solicitud: ${solicitud.nombre_solicitante} (${solicitud.area})`,
    html,
    tipo: 'nueva_solicitud',
    solicitudId: solicitud.id,
  });
}

function notificarRecordatorio(solicitud, diasRestantes) {
  const vencida = diasRestantes < 0;
  const cuando = vencida
    ? `venció hace ${Math.abs(diasRestantes)} día(s)`
    : diasRestantes === 0
    ? 'es hoy'
    : `faltan ${diasRestantes} día(s)`;

  const html = plantillaCorreo({
    badge: vencida
      ? { texto: 'Vencida', bg: '#FEE2E2', color: '#B91C1C' }
      : { texto: 'Recordatorio', bg: '#FEF3C7', color: '#B45309' },
    titulo: 'Actividad próxima a vencer',
    campos: [
      { label: 'Actividad', valor: `${solicitud.titulo || solicitud.nombre_solicitante} · ${solicitud.area}` },
      {
        label: 'Fecha objetivo',
        valor: new Date(solicitud.fecha_objetivo).toLocaleDateString('es-MX', { timeZone: 'UTC' }),
      },
    ],
    nota: `Esta actividad todavía no se ha marcado como concluida (${escapeHtml(cuando)}).`,
    ctaTexto: '&#8594; Ver en el sistema',
    ctaUrl: `${env.frontendUrl}/notificaciones`,
  });

  return send({
    to: env.adminNotifyEmails,
    subject: `Recordatorio: ${(solicitud.titulo || solicitud.nombre_solicitante).slice(0, 80)} (${solicitud.area}) ${cuando}`,
    html,
    tipo: 'recordatorio',
    solicitudId: solicitud.id,
  });
}

export async function generarRecordatorios() {
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre_solicitante, area, fecha_objetivo,
              CASE WHEN origen = 'solicitud' THEN nombre_solicitante ELSE explicacion END AS titulo,
              (fecha_objetivo - CURRENT_DATE) AS dias_restantes
       FROM solicitudes
       WHERE estado = 'aprobada' AND completada = false
         AND fecha_objetivo <= (CURRENT_DATE + INTERVAL '15 days')`
    );

    for (const solicitud of rows) {
      const yaNotificado = await pool.query(
        `SELECT 1 FROM notificaciones WHERE tipo = 'recordatorio' AND solicitud_id = $1 LIMIT 1`,
        [solicitud.id]
      );
      if (yaNotificado.rows.length > 0) continue;
      await notificarRecordatorio(solicitud, solicitud.dias_restantes);
    }
  } catch (err) {
    console.error('Error generando recordatorios:', err.message);
  }
}

export function notificarCodigoVisitante(usuario, codigo, vigenciaMin) {
  const html = plantillaCorreo({
    badge: { texto: 'Acceso de visitante', bg: '#E0F5F5', color: '#00807C' },
    titulo: 'Tu código para entrar al sistema',
    campos: [
      { label: 'Visitante', valor: usuario.nombre },
      { label: 'Código', valor: codigo },
    ],
    nota: `Escribe este código en la pantalla de inicio de sesión. Es válido por ${vigenciaMin} minutos y solo se puede usar una vez. Si tú no lo pediste, ignora este correo.`,
  });

  return send({
    to: usuario.email,
    subject: `Tu código de acceso: ${codigo}`,
    html,
    tipo: 'codigo_visitante',
  });
}

export function notificarCodigoRecuperacion(usuario, codigo, vigenciaMin) {
  const html = plantillaCorreo({
    badge: { texto: 'Recuperar contraseña', bg: '#FEF3C7', color: '#B45309' },
    titulo: 'Tu código para restablecer tu contraseña',
    campos: [
      { label: 'Número de control', valor: usuario.numero_empleado || '—' },
      { label: 'Código', valor: codigo },
    ],
    nota: `Este código es válido por ${vigenciaMin} minutos. Si tú no lo pediste, ignora este correo — tu contraseña actual sigue funcionando.`,
  });

  return send({
    to: usuario.email,
    subject: `Tu código de recuperación: ${codigo}`,
    html,
    tipo: 'recuperar_password',
  });
}

function camposRango(inicio, fin) {
  const inicioISO = fechaISO(inicio);
  const finISO = fechaISO(fin);
  if (!inicioISO || !finISO) return [];
  return [
    { label: 'Inicio', valor: formatearFecha(inicioISO) },
    { label: 'Terminación', valor: formatearFecha(finISO) },
    { label: 'Duración', valor: `${diasEntre(inicioISO, finISO)} día(s)` },
  ];
}

function textoConSaltos(texto) {
  return escapeHtml(texto).replace(/\r?\n/g, '<br>');
}

export function notificarCambioFechas(solicitud, anterior) {
  if (!solicitud.email) return Promise.resolve();

  const previas = anterior.inicio && anterior.fin
    ? `${formatearFecha(anterior.inicio)} – ${formatearFecha(anterior.fin)}`
    : formatearFecha(anterior.fin);

  const html = plantillaCorreo({
    badge: { texto: 'Cambio de fecha', bg: '#E0F2FE', color: '#0369A1' },
    titulo: 'Se modificaron las fechas de tu solicitud',
    campos: camposRango(solicitud.fecha_inicio, solicitud.fecha_objetivo),
    nota: `<strong>Comentario de administración:</strong><br>${textoConSaltos(solicitud.comentario_admin)}`
      + `<br><br><span style="color:#94a3b8;">Fechas anteriores: ${escapeHtml(previas)} · Área: ${escapeHtml(solicitud.area)}</span>`,
    ctaTexto: '&#8594; Ver mis solicitudes',
    ctaUrl: `${env.frontendUrl}/`,
  });

  return send({
    to: solicitud.email,
    subject: `Cambio de fecha en tu solicitud (${solicitud.area})`,
    html,
    tipo: 'cambio_fecha',
    solicitudId: solicitud.id,
  });
}

export function notificarResultadoSolicitud(solicitud, aprobada) {
  if (!solicitud.email) return Promise.resolve();

  const html = plantillaCorreo({
    badge: aprobada
      ? { texto: 'Aprobada', bg: '#D1FAE5', color: '#047857' }
      : { texto: 'Rechazada', bg: '#FEE2E2', color: '#B91C1C' },
    titulo: aprobada ? 'Tu solicitud fue aprobada' : 'Tu solicitud fue rechazada',
    campos: aprobada
      ? camposRango(solicitud.fecha_inicio, solicitud.fecha_objetivo)
      : [{ label: 'Área', valor: solicitud.area }],
    nota: aprobada
      ? `Área: ${escapeHtml(solicitud.area)}. Se agregó al calendario de seguimiento del sistema durante todo ese periodo.`
      : `Motivo: ${escapeHtml(solicitud.motivo_rechazo || 'No especificado')}. Si consideras que debe revisarse de nuevo, contacta al equipo de administración.`,
    ctaTexto: aprobada ? '&#8594; Ver calendario' : null,
    ctaUrl: `${env.frontendUrl}/calendario`,
  });

  return send({
    to: solicitud.email,
    subject: aprobada ? 'Solicitud aprobada' : 'Solicitud rechazada',
    html,
    tipo: aprobada ? 'solicitud_aprobada' : 'solicitud_rechazada',
    solicitudId: solicitud.id,
  });
}
