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
