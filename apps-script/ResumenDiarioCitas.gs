/* ============================================
   AYALA ABOGADOS - RESUMEN DIARIO DE CITAS
   Envía cada día a las 8:00 (hora de España) un correo a
   todos los administradores/editores activos con las citas
   del día.

   INSTALACIÓN:
   1. Ve a https://script.google.com → Nuevo proyecto.
   2. Pega este código completo en Code.gs.
   3. Rellena las constantes CRON_EMAIL / CRON_PASSWORD más abajo
      (ver punto 4).
   4. En Firebase, ve a Authentication → Users → Add user, y crea
      un usuario nuevo, por ejemplo:
        email: cron@ayalaabogados.local
        password: (una contraseña larga y aleatoria)
      Luego en Realtime Database, dentro de "usuarios", añade una
      entrada con el UID de ese usuario y estos datos:
        {
          "uid": "<UID_DEL_USUARIO>",
          "nombre": "Cron", "apellidos": "Resumen",
          "email": "cron@ayalaabogados.local",
          "role": "visor",
          "active": true
        }
      Esto le da permiso de solo lectura sobre "citas" y "usuarios"
      según las reglas actuales de la base de datos, sin darle
      acceso de escritura en ningún sitio.
   5. En el editor de Apps Script: Configuración del proyecto (icono
      engranaje) → marca "Mostrar archivo de manifiesto appsscript.json"
      y comprueba/pon "timeZone": "Europe/Madrid".
   6. Ejecuta una vez la función `crearTrigger` (menú Ejecutar) para
      programar el envío diario a las 8:00. Te pedirá autorizar el
      script (acceso a internet y a enviar correos en tu nombre).
   7. Prueba manualmente con la función `enviarResumenDiario` antes
      de dejarlo en automático.
   ============================================ */

// ---- CONFIGURA ESTOS 4 VALORES ----
const FIREBASE_WEB_API_KEY = 'AIzaSyCaxlVIHZ38VoZ59mcSlnCfgaF9jJ9nxL8';
const FIREBASE_DB_URL = 'https://ayala-abogados-default-rtdb.europe-west1.firebasedatabase.app';
const CRON_EMAIL = 'cron@ayalaabogados.local';   // usuario creado en el paso 4
const CRON_PASSWORD = 'PON_AQUI_LA_CONTRASEÑA';  // contraseña de ese usuario

/**
 * Crea el disparador que ejecuta enviarResumenDiario() cada día a las 8:00.
 * Ejecutar UNA sola vez manualmente desde el editor.
 */
function crearTrigger() {
  // Evita duplicar el trigger si ya existe
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'enviarResumenDiario') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('enviarResumenDiario')
    .timeBased()
    .atHour(8)
    .nearMinute(0)
    .everyDays(1)
    .create();
  Logger.log('Trigger diario a las 8:00 creado correctamente.');
}

/**
 * Función principal: se autentica, lee las citas de hoy y los
 * administradores activos, y envía el correo resumen.
 */
function enviarResumenDiario() {
  const idToken = obtenerIdToken_();

  const citas = leerFirebase_('/citas.json', idToken) || {};
  const usuarios = leerFirebase_('/usuarios.json', idToken) || {};

  const hoy = Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd');

  const citasHoy = Object.values(citas)
    .filter(c => c && c.fecha_preferida === hoy && c.status !== 'cancelada')
    .sort((a, b) => (a.hora_preferida || '').localeCompare(b.hora_preferida || ''));

  const destinatarios = Object.values(usuarios)
    .filter(u => u && u.active !== false &&
      ['administrador', 'editor', 'visor'].indexOf(u.role) !== -1 && u.email)
    .map(u => u.email);

  if (destinatarios.length === 0) {
    Logger.log('No hay administradores activos a los que avisar.');
    return;
  }

  const asunto = `Citas de hoy (${hoy}) - ${citasHoy.length} cita(s) - Ayala Abogados`;
  const cuerpoHtml = construirHtml_(citasHoy, hoy);

  MailApp.sendEmail({
    to: destinatarios.join(','),
    subject: asunto,
    htmlBody: cuerpoHtml
  });

  Logger.log(`Resumen enviado a: ${destinatarios.join(', ')} (${citasHoy.length} citas)`);
}

// ---------- Auxiliares ----------

function obtenerIdToken_() {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`;
  const resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      email: CRON_EMAIL,
      password: CRON_PASSWORD,
      returnSecureToken: true
    }),
    muteHttpExceptions: true
  });
  const data = JSON.parse(resp.getContentText());
  if (!data.idToken) {
    throw new Error('No se pudo autenticar en Firebase: ' + resp.getContentText());
  }
  return data.idToken;
}

function leerFirebase_(path, idToken) {
  const url = `${FIREBASE_DB_URL}${path}?auth=${idToken}`;
  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  return JSON.parse(resp.getContentText());
}

function construirHtml_(citasHoy, hoy) {
  if (citasHoy.length === 0) {
    return `<p>No hay citas programadas para hoy (${hoy}).</p>`;
  }
  const filas = citasHoy.map(c => `
    <tr>
      <td style="padding:6px 10px;border:1px solid #ddd;">${c.hora_preferida || '-'}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml_(c.nombre || '')} ${escapeHtml_(c.apellidos || '')}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml_(c.tipo_consulta || '-')}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml_(c.modalidad || '-')}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml_(c.telefono || '-')}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;">${c.status || '-'}</td>
    </tr>`).join('');

  return `
    <h2>Citas de hoy (${hoy})</h2>
    <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">
      <tr style="background:#0a2540;color:#fff;">
        <th style="padding:6px 10px;border:1px solid #ddd;">Hora</th>
        <th style="padding:6px 10px;border:1px solid #ddd;">Cliente</th>
        <th style="padding:6px 10px;border:1px solid #ddd;">Consulta</th>
        <th style="padding:6px 10px;border:1px solid #ddd;">Modalidad</th>
        <th style="padding:6px 10px;border:1px solid #ddd;">Teléfono</th>
        <th style="padding:6px 10px;border:1px solid #ddd;">Estado</th>
      </tr>
      ${filas}
    </table>`;
}

function escapeHtml_(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}
