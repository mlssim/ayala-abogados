# Ayala Abogados — sitio web y panel de administración

Sitio estático (HTML/CSS/JS) con Firebase Authentication y Realtime
Database. No requiere build ni servidor propio: puede abrirse sirviendo
la carpeta con cualquier servidor estático.

## Estructura

- `index.html`, `pages/` — sitio público (inicio, servicios, nosotros,
  solicitar cita, contacto, perfil de usuario, legal).
- `admin/` — panel de administración (`login.html` + `index.html`).
- `js/` — servicios compartidos: `firebase-config.js`, `auth-service.js`
  (registro/login/gestión de usuarios), `appointment-service.js` (citas y
  notificaciones), `email-service.js` (envío de formularios), `main.js`,
  `responsive.js`.
- `admin/js/admin.js` — lógica del panel (calendario, listados, edición).
- `database.rules.json` — reglas de seguridad recomendadas para Firebase
  Realtime Database (ver `SECURITY.md` — **hay que desplegarlas a mano**).

## Puesta en marcha

1. Servir la carpeta con cualquier servidor estático (por ejemplo
   `npx serve` o la extensión Live Server). No usar `file://` directamente:
   los módulos de JavaScript (`type="module"`) necesitan http/https.
2. Desplegar `database.rules.json` en la consola de Firebase.
3. Dar de alta al primer administrador siguiendo el punto 4 de
   `SECURITY.md` (ya no se crea ningún admin automáticamente).

## Seguridad

Antes de publicar cualquier cambio de este proyecto, leer `SECURITY.md`:
recoge la auditoría realizada, lo que se ha corregido y la acción manual
pendiente en la consola de Firebase.

## Correo de confirmación al cliente ("Aceptar" en el panel)

Al pulsar **Aceptar** sobre una cita en el panel de administración:

- **Sin configurar nada**, se abre tu cliente de correo predeterminado
  (Outlook u otro) con un borrador ya redactado dirigido al cliente —
  solo hay que revisar y pulsar enviar.
- **Configurando EmailJS** (recomendado, envío automático sin pasos
  manuales), edita `js/email-service.js` y rellena estos 4 valores en
  `EMAILJS_CONFIG` con los de tu cuenta gratuita en
  [emailjs.com](https://www.emailjs.com):
  - `publicKey` y `serviceId` — en Account → API Keys / Email Services.
  - `templateId` — plantilla para el aviso interno de nueva solicitud de
    cita (ya existente, variables: `nombre`, `apellidos`, `telefono`,
    `email`, `tipo_consulta`, `modalidad`, `urgencia`, `fecha_preferida`,
    `hora_preferida`, `descripcion`, `admin_asignado`).
  - `confirmationTemplateId` — plantilla **nueva** que debes crear en
    EmailJS para el correo al cliente, con las variables: `to_email`,
    `to_name`, `nombre`, `tipo_consulta`, `modalidad`, `fecha`, `hora`,
    `telefono_despacho`.

  Mientras `publicKey` siga con el valor `'YOUR_PUBLIC_KEY'`, el sitio
  sigue funcionando con normalidad (modo simulación / cliente de correo
  como respaldo) — no hace falta configurarlo para que nada se rompa.
