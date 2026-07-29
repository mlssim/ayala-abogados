# Seguridad — cambios realizados y acciones pendientes

Este documento resume la auditoría de seguridad realizada sobre la web y el
panel de administración, y lo que se ha corregido en el código. **Hay una
acción manual obligatoria al final que solo puede hacer quien tenga acceso
a la consola de Firebase del proyecto.**

## 1. Qué se ha corregido en el código

- **Admin por defecto eliminado.** El sitio creaba automáticamente, en cada
  carga de página, una cuenta `admin@ayalaabogados.es` / `Admin123!` y
  escribía esa contraseña en la consola del navegador. Se ha eliminado por
  completo. Ver el punto 4 más abajo: **acción obligatoria**.
- **Verificación de rol reforzada.** Antes, si alguien era o había sido
  administrador, `isAdmin()` confiaba en un dato guardado en `localStorage`
  que cualquiera puede editar desde las herramientas de desarrollador del
  navegador. Ahora las acciones sensibles (listar usuarios, cambiar roles,
  activar/desactivar cuentas, eliminar usuarios, listar todas las citas,
  cambiar el estado de una cita, eliminar una cita, ver notificaciones)
  vuelven a comprobar el rol directamente en Firebase, usando el UID real
  de la sesión autenticada.
- **Fuga de datos de clientes corregida.** Las funciones que devuelven
  todas las citas o todas las notificaciones no comprobaban ningún permiso;
  cualquier script cargado en el sitio podía leer nombres, teléfonos y
  motivo de consulta de todos los clientes. Ahora exigen rol de
  administrador verificado.
- **Fuga de privilegios al degradar un admin, corregida.** El panel
  comprobaba el acceso de administrador mirando el nodo
  `administradores/{uid}`, pero al quitarle el rol de admin a alguien
  solo se actualizaba `usuarios/{uid}.role`, sin tocar `administradores`.
  Resultado: una persona degradada seguía entrando al panel indefinidamente.
  Se ha corregido para que también se revoque `administradores/{uid}`.
- **Tres herramientas sin ninguna protección, eliminadas:**
  `admin/admin-create-user.html` y `admin/admin-fix.html` creaban cuentas
  con rol de administrador sin pedir ningún inicio de sesión — cualquiera
  que encontrara la URL podía convertirse en admin. `admin/admin-index.html`
  era una copia antigua y desactualizada del panel real. Los tres se han
  borrado. También se ha borrado `pages/admin.html`, un tercer panel de
  administración huérfano (no enlazado desde ningún sitio) que usaba las
  comprobaciones débiles antiguas.
- **`admin/login.html` redirigía a un archivo que ya no existía**
  (`admin-index.html`); ahora redirige al panel real (`index.html`).
- **Fallo funcional grave corregido: las citas de "Solicitar Cita" nunca
  llegaban al panel.** El formulario público de `pages/cita.html` guardaba
  la solicitud solo en el `localStorage` del navegador de la persona
  visitante — nunca se enviaba a Firebase, así que jamás aparecía en el
  panel de administración ni generaba notificación. Se ha conectado el
  formulario al servicio que ya existía en el proyecto
  (`js/email-service.js` + `js/appointment-service.js`), que sí guarda en
  Firebase correctamente.
- **Condición de carrera en el panel corregida.** El panel empezaba a
  descargar citas, clientes y notificaciones en paralelo a la comprobación
  de si la persona era realmente administradora, en lugar de esperar el
  resultado. Ahora espera confirmación antes de pedir cualquier dato.

## 2. Qué NO se puede arreglar solo con código de cliente

Esta es una aplicación 100% del lado del cliente (sin servidor propio,
solo Firebase). Eso significa que **por mucho que el código JavaScript
compruebe permisos, cualquier persona con conocimientos técnicos puede
saltárselo** modificando las peticiones o el propio código en su
navegador. La única protección que no se puede evitar así son las
**Reglas de Seguridad de Firebase**, que se aplican en los servidores de
Firebase, no en el navegador.

Este proyecto **no incluía ningún archivo de reglas**. Se ha añadido
`database.rules.json` con una propuesta que refleja cómo usa realmente los
datos la aplicación (lectura de citas y usuarios solo para administradores
verificados, cada persona puede leer/editar su propio perfil, nadie puede
autoasignarse el rol de administrador al registrarse, etc.).

**Es imprescindible desplegar este archivo de reglas en la consola de
Firebase** (Realtime Database → Reglas) para que las correcciones de este
documento tengan efecto real. Sin las reglas desplegadas, los cambios en
el código son solo una capa adicional, no la protección definitiva.

## 3. Limitación conocida (no corregible sin backend)

`AuthService.deleteUser()` borra el perfil de la persona en la base de
datos, pero **no puede borrar su cuenta de Firebase Authentication**: el
SDK de cliente únicamente permite borrar la cuenta de quien ha iniciado
sesión en ese momento, nunca la de otra persona. Para poder eliminar
cuentas de verdad haría falta una Cloud Function con el Admin SDK de
Firebase (requiere el plan de pago "Blaze" y algo de código de servidor).
Mientras tanto, "eliminar usuario" en el panel debe entenderse como
"revocar su acceso", no como un borrado completo de la cuenta.

## 4. ACCIÓN OBLIGATORIA — solo la puede hacer quien administre Firebase

1. **Averiguar si la cuenta `admin@ayalaabogados.es` con la contraseña
   `Admin123!` llegó a crearse en el proyecto real de Firebase** (Firebase
   Console → Authentication). Si existe: cambiarle la contraseña de
   inmediato o eliminarla, porque esa contraseña ha estado expuesta en
   este código y en la consola del navegador de cualquier visitante.
2. **Dar de alta al primer administrador manualmente**, ya que se ha
   quitado la creación automática: registrar una cuenta normal desde la
   web y, en Firebase Console → Realtime Database, cambiar a mano
   `usuarios/<uid>/role` a `"administrador"` y crear
   `administradores/<uid>/activo` a `true`.
3. **Desplegar `database.rules.json`** en Realtime Database → Reglas.
4. Revisar si hay otras cuentas con rol de administrador que no deberían
   tenerlo (por ejemplo, creadas antes de esta corrección a través de las
   herramientas ya eliminadas).

## 5. Auditoría de inyección de código (XSS) — corregido

Se ha revisado todo el sitio en busca de vulnerabilidades de inyección.
No hay base de datos SQL (Firebase Realtime Database no es SQL, así que
la inyección SQL clásica no aplica), pero sí se encontraron y corrigieron
dos problemas graves:

- **XSS almacenado en el panel de administración.** Los datos que
  cualquier visitante anónimo escribe en el formulario público de
  "Solicitar Cita" (nombre, apellidos, descripción del caso...) se
  mostraban en el panel de admin (citas, clientes, notificaciones,
  modales de edición) directamente en el HTML, sin ningún escapado.
  Un visitante malicioso podía escribir, por ejemplo, un "nombre" que en
  realidad fuera código JavaScript, y ese código se habría ejecutado en
  el navegador del administrador en cuanto abriera el panel — pudiendo
  robar su sesión o manipular datos con sus mismos permisos. Se ha
  añadido una función de escapado y se aplica a todos los puntos donde se
  muestran estos datos (también en el menú de usuario del sitio público y
  en el historial de citas del perfil de cliente).
- **Contraseñas en texto plano al crear administradores.** El formulario
  "Nuevo Administrador" del panel guardaba la contraseña sin cifrar
  directamente en la base de datos, y encima generaba una cuenta
  "de mentira" que nunca podría iniciar sesión de verdad (no existía en
  Firebase Authentication). Se ha corregido para que cree una cuenta real
  de Firebase Authentication (la contraseña la gestiona Firebase, cifrada,
  fuera de la base de datos) sin cerrar la sesión de quien la está creando.

## 6. Otros puntos revisados (sin cambios necesarios, o ya cubiertos)

- **Fuerza bruta en el login**: existe un límite de intentos, pero se
  guarda en el propio navegador (`localStorage`), así que alguien decidido
  podría saltárselo borrando sus datos de navegación. La protección real
  contra fuerza bruta la aplica el propio Firebase Authentication en sus
  servidores, independientemente de este límite del lado del cliente.
- **Redirecciones abiertas, `eval`/`Function`/`document.write`**: no se ha
  encontrado ningún caso en el código.
- **Cabeceras de seguridad** (Content-Security-Policy, X-Frame-Options,
  etc.): no se pueden fijar desde los archivos HTML — dependen de cómo
  configures el hosting donde publiques el sitio. Si me dices dónde vas a
  alojarlo (Firebase Hosting, Netlify, etc.) puedo ayudarte a configurarlas.


1. **Averiguar si la cuenta `admin@ayalaabogados.es` con la contraseña
   `Admin123!` llegó a crearse en el proyecto real de Firebase** (Firebase
   Console → Authentication). Si existe: cambiarle la contraseña de
   inmediato o eliminarla, porque esa contraseña ha estado expuesta en
   este código y en la consola del navegador de cualquier visitante.
2. **Dar de alta al primer administrador manualmente**, ya que se ha
   quitado la creación automática: registrar una cuenta normal desde la
   web y, en Firebase Console → Realtime Database, cambiar a mano
   `usuarios/<uid>/role` a `"administrador"` y crear
   `administradores/<uid>/activo` a `true`.
3. **Desplegar `database.rules.json`** en Realtime Database → Reglas.
4. Revisar si hay otras cuentas con rol de administrador que no deberían
   tenerlo (por ejemplo, creadas antes de esta corrección a través de las
   herramientas ya eliminadas).
