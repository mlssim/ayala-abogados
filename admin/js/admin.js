/* ============================================
   AYALA ABOGADOS - ADMIN PANEL (FIREBASE)
   Con calendario interactivo y sincronización en tiempo real
   ============================================ */

// admin/js/admin.js → ../../js/firebase-config.js (sube 2 niveles: admin/js → admin → raíz → js/)
import { db } from '../../js/firebase-config.js';
import { 
    ref, 
    onValue, 
    get, 
    update, 
    remove,
    set,
    push
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ===== DATOS GLOBALES =====
let appointments = [];
let clients = [];
let notifications = [];
let admins = [];
let calendarCurrentMonth = new Date().getMonth();
let calendarCurrentYear = new Date().getFullYear();
let appointmentsUnsubscribe = null;

// ===== UTILIDADES =====
function formatDate(dateStr) {
    if (!dateStr) return 'No especificada';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toDateStr(date) {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d)) return null;
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getStatusBadge(status) {
    const map = {
        'pendiente': '<span class="status-badge pending">Pendiente</span>',
        'confirmada': '<span class="status-badge confirmed">Confirmada</span>',
        'completada': '<span class="status-badge completed">Completada</span>',
        'cancelada': '<span class="status-badge cancelled">Cancelada</span>'
    };
    return map[status] || map['pendiente'];
}

// Función para sanitizar datos y evitar referencias circulares
function sanitizeData(data) {
    if (data === null || data === undefined) return data;
    try {
        return JSON.parse(JSON.stringify(data));
    } catch (e) {
        console.warn('Error al sanitizar datos:', e);
        return {};
    }
}

// ========== SINCRONIZACIÓN CON FIREBASE ==========
function syncWithFirebase() {
    // Escuchar citas en tiempo real
    const citasRef = ref(db, 'citas');
    appointmentsUnsubscribe = onValue(citasRef, (snapshot) => {
        try {
            const citas = sanitizeData(snapshot.val()) || {};
            appointments = Object.values(citas).sort((a, b) => 
                new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0)
            );

            renderDashboardAppointments();
            renderAppointmentsTable();
            updateStats();
            renderCalendar(calendarCurrentMonth, calendarCurrentYear);
        } catch (error) {
            console.error('Error al procesar citas:', error);
        }
    });

    // Escuchar usuarios (clientes) - CORREGIDO con sanitización
    const usersRef = ref(db, 'usuarios');
    onValue(usersRef, (snapshot) => {
        try {
            const users = sanitizeData(snapshot.val()) || {};
            clients = Object.values(users).filter(u => u.role !== 'administrador').map(u => ({
                id: u.uid || '',
                nombre: u.nombre || '',
                apellidos: u.apellidos || '',
                dni: u.dni || 'N/D',
                telefono: u.telefono || '',
                email: u.email || '',
                total_citas: 0,
                ultima_cita: 'Nunca',
                role: u.role || 'cliente',
                active: u.active !== false,
                createdAt: u.createdAt || null
            }));
            renderClientsTable();
            updateStats();
        } catch (error) {
            console.error('Error al procesar usuarios:', error);
        }
    });

    // Escuchar notificaciones
    const notifRef = ref(db, 'notificaciones');
    onValue(notifRef, (snapshot) => {
        try {
            const notifs = sanitizeData(snapshot.val()) || {};
            notifications = Object.values(notifs).filter(n => !n.leida).sort((a, b) => 
                new Date(b.fecha || 0) - new Date(a.fecha || 0)
            );
            renderNotifications();
            updateStats();
        } catch (error) {
            console.error('Error al procesar notificaciones:', error);
        }
    });

    // Escuchar administradores
    const adminsRef = ref(db, 'usuarios');
    onValue(adminsRef, (snapshot) => {
        try {
            const users = sanitizeData(snapshot.val()) || {};
            admins = Object.entries(users)
                .filter(([uid, u]) => u.role === 'administrador' || u.role === 'editor' || u.role === 'visor')
                .map(([uid, u]) => ({
                    uid: uid,
                    nombre: u.nombre || '',
                    apellidos: u.apellidos || '',
                    dni: u.dni || 'N/D',
                    telefono: u.telefono || '',
                    email: u.email || '',
                    cargo: u.cargo || 'Administrador',
                    role: u.role || 'administrador',
                    active: u.active !== false,
                    createdAt: u.createdAt || null,
                    lastLogin: u.lastLogin || null
                }));
            renderAdminsList();
        } catch (error) {
            console.error('Error al procesar administradores:', error);
        }
    });
}

// ========== CALENDARIO ==========
function renderCalendar(month, year) {
    const container = document.getElementById('dynamicCalendar');
    if (!container) return;

    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const titleElem = document.getElementById('calendarMonthTitle');
    if (titleElem) titleElem.textContent = monthNames[month] + ' ' + year;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    let html = '';
    const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    weekDays.forEach(day => html += `<div class="calendar-header">${day}</div>`);

    let startOffset = (firstDay === 0) ? 6 : firstDay - 1;
    for (let i = startOffset - 1; i >= 0; i--) {
        html += `<div class="calendar-day other-month">${prevMonthDays - i}</div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const hasApp = appointments.some(a => toDateStr(a.fecha_preferida) === dateStr);
        let classes = 'calendar-day';
        if (d === todayDate && month === todayMonth && year === todayYear) classes += ' today';
        if (hasApp) classes += ' has-event';
        html += `<div class="${classes}" data-date="${dateStr}" onclick="onDayClick('${dateStr}')">${d}</div>`;
    }

    const totalCells = startOffset + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
        html += `<div class="calendar-day other-month">${d}</div>`;
    }

    container.innerHTML = html;
}

// ========== MODAL DE CITAS DEL DÍA ==========
window.onDayClick = function(dateStr) {
    const dayApps = appointments.filter(a => toDateStr(a.fecha_preferida) === dateStr);
    if (dayApps.length === 0) {
        showAdminNotification('info', 'Sin citas', 'No hay citas programadas para este día.');
        return;
    }

    const existing = document.getElementById('dayAppointmentsModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'dayAppointmentsModal';
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content';

    const dateObj = new Date(dateStr + 'T00:00:00');
    const fechaFormateada = dateObj.toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    let citasHtml = '';
    dayApps.forEach((app) => {
        const estadoBadge = getStatusBadge(app.status || 'pendiente');
        const hora = app.hora_preferida || 'No especificada';
        const servicio = app.tipo_consulta || 'General';
        const modalidad = app.modalidad || 'Presencial';
        const descripcion = app.descripcion ? `<div class="appointment-desc"><strong>Descripción:</strong> ${app.descripcion}</div>` : '';

        citasHtml += `
            <div class="appointment-card">
                <div class="appointment-main">
                    <div class="appointment-header">
                        <span class="appointment-name">${app.nombre} ${app.apellidos || ''}</span>
                        ${estadoBadge}
                    </div>
                    <div class="appointment-contact">
                        <i class="fas fa-phone"></i> ${app.telefono} &nbsp;|&nbsp;
                        <i class="fas fa-envelope"></i> ${app.email}
                    </div>
                    <div class="appointment-meta">
                        <span><i class="fas fa-briefcase"></i> ${servicio}</span>
                        <span><i class="fas fa-clock"></i> ${hora}</span>
                        <span><i class="fas fa-video"></i> ${modalidad}</span>
                    </div>
                    ${descripcion}
                </div>
                <div class="appointment-actions">
                    <button class="action-btn edit" title="Editar" onclick="closeDayModal(); window.editAppointment('${app.id}');"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" title="Eliminar" onclick="closeDayModal(); window.deleteAppointment('${app.id}');"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `;
    });

    modal.innerHTML = `
        <button class="modal-close" onclick="closeDayModal()"><i class="fas fa-times-circle"></i></button>
        <h2 class="modal-title"><i class="fas fa-calendar-day"></i> ${fechaFormateada}</h2>
        <p class="modal-subtitle">${dayApps.length} cita${dayApps.length > 1 ? 's' : ''} programada${dayApps.length > 1 ? 's' : ''}</p>
        <div class="appointments-list">${citasHtml}</div>
        <div class="modal-footer">
            <button class="btn-admin btn-admin-outline" onclick="closeDayModal()">Cerrar</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeDayModal(); });
};

window.closeDayModal = function() {
    const modal = document.getElementById('dayAppointmentsModal');
    if (modal) modal.remove();
};

// ========== RENDERIZADO DE TABLAS ==========
function renderDashboardAppointments() {
    const tbody = document.getElementById('dashboardAppointmentsTable');
    if (!tbody) return;
    const recent = appointments.slice(0, 5);
    if (recent.length === 0) {
        tbody.innerHTML = `<tr class="empty-state"><td colspan="5" style="text-align:center;padding:40px;color:var(--admin-text-muted);"><i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:12px;"></i>No hay citas registradas</td></tr>`;
        return;
    }
    tbody.innerHTML = recent.map(app => `
        <tr>
            <td><strong>${app.nombre} ${app.apellidos || ''}</strong><br><span style="font-size:0.8rem;color:var(--admin-text-muted);">${app.telefono}</span></td>
            <td>${app.tipo_consulta || 'General'}</td>
            <td>${app.fecha_preferida ? formatDate(app.fecha_preferida) : 'Pendiente'} ${app.hora_preferida || ''}</td>
            <td>${getStatusBadge(app.status || 'pendiente')}</td>
            <td>
                <button class="action-btn edit" onclick="window.editAppointment('${app.id}')"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" onclick="window.deleteAppointment('${app.id}')"><i class="fas fa-times"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderAppointmentsTable() {
    const tbody = document.getElementById('appointmentsTableBody');
    if (!tbody) return;
    if (appointments.length === 0) {
        tbody.innerHTML = `<tr class="empty-state"><td colspan="8" style="text-align:center;padding:60px 20px;color:var(--admin-text-muted);"><i class="fas fa-calendar-plus" style="font-size:3rem;display:block;margin-bottom:16px;opacity:0.5;"></i>No hay citas registradas</td></tr>`;
        return;
    }
    tbody.innerHTML = appointments.map(app => `
        <tr>
            <td>#${String(app.id || '').slice(-3).padStart(3,'0')}</td>
            <td><strong>${app.nombre} ${app.apellidos || ''}</strong></td>
            <td>${app.telefono}</td>
            <td>${app.tipo_consulta || 'General'}</td>
            <td>${app.fecha_preferida ? formatDate(app.fecha_preferida) : 'Pendiente'} ${app.hora_preferida || ''}</td>
            <td>${app.modalidad || 'Presencial'}</td>
            <td>${getStatusBadge(app.status || 'pendiente')}</td>
            <td>
                <button class="action-btn edit" onclick="window.editAppointment('${app.id}')"><i class="fas fa-edit"></i></button>
                <button class="action-btn" onclick="window.viewAppointment('${app.id}')"><i class="fas fa-eye"></i></button>
                <button class="action-btn delete" onclick="window.deleteAppointment('${app.id}')"><i class="fas fa-times"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderClientsTable() {
    const tbody = document.getElementById('clientsTableBody');
    if (!tbody) return;
    if (clients.length === 0) {
        tbody.innerHTML = `<tr class="empty-state"><td colspan="7" style="text-align:center;padding:60px 20px;color:var(--admin-text-muted);"><i class="fas fa-user-plus" style="font-size:3rem;display:block;margin-bottom:16px;opacity:0.5;"></i>No hay clientes registrados</td></tr>`;
        return;
    }
    tbody.innerHTML = clients.map(c => `
        <tr>
            <td><strong>${c.nombre} ${c.apellidos || ''}</strong></td>
            <td>${c.dni || 'N/D'}</td>
            <td>${c.telefono}</td>
            <td>${c.email}</td>
            <td>${c.ultima_cita || 'Nunca'}</td>
            <td>${c.total_citas || 0}</td>
            <td>
                <button class="action-btn" onclick="window.viewClient('${c.id}')"><i class="fas fa-eye"></i></button>
                <button class="action-btn edit" onclick="window.editClient('${c.id}')"><i class="fas fa-edit"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderNotifications() {
    const list = document.getElementById('notificationsList');
    if (!list) return;
    if (notifications.length === 0) {
        list.innerHTML = `<div class="notification-item" style="text-align:center;padding:40px 20px;color:var(--admin-text-muted);"><i class="fas fa-bell-slash" style="font-size:2rem;display:block;margin-bottom:12px;opacity:0.5;"></i>No hay notificaciones pendientes</div>`;
        return;
    }
    list.innerHTML = notifications.map(n => `
        <div class="notification-item">
            <div class="notification-icon ${n.type || 'appointment'}"><i class="fas ${n.icon || 'fa-bell'}"></i></div>
            <div class="notification-content"><p><strong>${n.title || 'Notificación'}:</strong> ${n.message}</p><div class="notification-time">${new Date(n.fecha).toLocaleString('es-ES')}</div></div>
            <button class="action-btn delete" onclick="window.deleteNotification('${n.id}')"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

// ========== RENDERIZAR LISTA DE ADMINISTRADORES ==========
function renderAdminsList() {
    const container = document.getElementById('adminsList');
    if (!container) return;

    if (admins.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--admin-text-muted);">
                <i class="fas fa-user-shield" style="font-size: 3rem; display: block; margin-bottom: 16px; opacity: 0.5;"></i>
                <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 8px; color: var(--admin-text);">No hay administradores registrados</div>
                <div style="font-size: 0.9rem; max-width: 400px; margin: 0 auto;">
                    Use el formulario superior para crear el primer administrador del sistema.
                </div>
            </div>
        `;
        return;
    }

    let html = '';
    admins.forEach(admin => {
        const iniciales = `${(admin.nombre?.charAt(0) || 'A')}${(admin.apellidos?.charAt(0) || 'D')}`;
        const nombreCompleto = `${admin.nombre} ${admin.apellidos || ''}`.trim();
        const estadoClass = admin.active ? 'confirmed' : 'cancelled';
        const estadoTexto = admin.active ? 'Activo' : 'Inactivo';
        const rolTexto = admin.role === 'administrador' ? 'Admin Total' : admin.role === 'editor' ? 'Editor' : 'Visor';
        const rolColor = admin.role === 'administrador' ? 'var(--admin-primary)' : admin.role === 'editor' ? 'var(--admin-warning)' : 'var(--admin-info)';

        html += `
            <div class="admin-list-item">
                <div class="admin-list-avatar">${iniciales}</div>
                <div class="admin-list-info">
                    <div class="name">${nombreCompleto}</div>
                    <div class="email">
                        <i class="fas fa-envelope" style="font-size: 0.7rem; margin-right: 4px;"></i>${admin.email}
                        <span style="margin: 0 8px;">|</span>
                        <i class="fas fa-phone" style="font-size: 0.7rem; margin-right: 4px;"></i>${admin.telefono || 'N/D'}
                        <span style="margin: 0 8px;">|</span>
                        <i class="fas fa-id-card" style="font-size: 0.7rem; margin-right: 4px;"></i>${admin.dni || 'N/D'}
                    </div>
                    <div style="margin-top: 6px; display: flex; gap: 8px; align-items: center;">
                        <span class="status-badge ${estadoClass}" style="font-size: 0.7rem;">${estadoTexto}</span>
                        <span style="font-size: 0.75rem; color: ${rolColor}; font-weight: 600; background: ${rolColor}15; padding: 2px 8px; border-radius: 4px;">${rolTexto}</span>
                        <span style="font-size: 0.75rem; color: var(--admin-text-muted);">${admin.cargo || ''}</span>
                    </div>
                </div>
                <div class="admin-list-actions">
                    <button class="btn-icon edit" title="Editar" onclick="window.editAdmin('${admin.uid}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" title="Eliminar" onclick="window.deleteAdmin('${admin.uid}', '${nombreCompleto.replace(/'/g, "\'")}')"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ========== CREAR NUEVO ADMINISTRADOR ==========
window.createNewAdmin = async function() {
    const nombre = document.getElementById('admin-nombre').value.trim();
    const apellidos = document.getElementById('admin-apellidos').value.trim();
    const dni = document.getElementById('admin-dni').value.trim();
    const telefono = document.getElementById('admin-telefono').value.trim();
    const email = document.getElementById('admin-email').value.trim();
    const cargo = document.getElementById('admin-cargo').value.trim();
    const password = document.getElementById('admin-password').value;
    const active = document.getElementById('admin-active').value === 'true';
    const role = document.getElementById('admin-permisos').value;

    // Validaciones
    if (!nombre || !apellidos || !dni || !telefono || !email || !password) {
        showAdminNotification('error', 'Campos requeridos', 'Por favor complete todos los campos obligatorios (*).');
        return;
    }

    if (password.length < 6) {
        showAdminNotification('error', 'Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAdminNotification('error', 'Email inválido', 'Por favor introduzca un email válido.');
        return;
    }

    try {
        // Generar un UID único para el nuevo admin
        const newUid = 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        const adminData = {
            uid: newUid,
            nombre: nombre,
            apellidos: apellidos,
            dni: dni,
            telefono: telefono,
            email: email,
            cargo: cargo || 'Administrador',
            role: role,
            active: active,
            password: password, // Nota: en producción debería hashearse
            createdAt: new Date().toISOString(),
            createdBy: 'manual',
            lastLogin: null
        };

        await set(ref(db, 'usuarios/' + newUid), adminData);

        showAdminNotification('success', 'Administrador creado', `${nombre} ${apellidos} ha sido añadido como ${role === 'administrador' ? 'Administrador' : role === 'editor' ? 'Editor' : 'Visor'}.`);

        // Limpiar formulario
        document.getElementById('newAdminForm').reset();
        document.getElementById('passwordStrengthBar').className = 'password-strength-bar';

    } catch (error) {
        console.error('Error al crear administrador:', error);
        showAdminNotification('error', 'Error', 'No se pudo crear el administrador. Inténtelo de nuevo.');
    }
};

// ========== EDITAR ADMINISTRADOR ==========
window.editAdmin = async function(uid) {
    try {
        const snapshot = await get(ref(db, 'usuarios/' + uid));
        if (!snapshot.exists()) {
            showAdminNotification('error', 'Error', 'No se encontró el administrador.');
            return;
        }

        const admin = sanitizeData(snapshot.val());

        // Crear modal de edición
        const existing = document.getElementById('editAdminModal');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'editAdminModal';
        overlay.className = 'modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'modal-content';
        modal.style.maxWidth = '600px';

        modal.innerHTML = `
            <button class="modal-close" onclick="closeEditAdminModal()"><i class="fas fa-times-circle"></i></button>
            <h2 class="modal-title"><i class="fas fa-user-edit"></i> Editar Administrador</h2>
            <p class="modal-subtitle">${admin.nombre} ${admin.apellidos || ''}</p>

            <div class="admin-form-grid">
                <div class="settings-group">
                    <label class="settings-label">Nombre</label>
                    <input type="text" id="edit-admin-nombre" class="settings-input" value="${admin.nombre || ''}">
                </div>
                <div class="settings-group">
                    <label class="settings-label">Apellidos</label>
                    <input type="text" id="edit-admin-apellidos" class="settings-input" value="${admin.apellidos || ''}">
                </div>
                <div class="settings-group">
                    <label class="settings-label">DNI / NIE</label>
                    <input type="text" id="edit-admin-dni" class="settings-input" value="${admin.dni || ''}">
                </div>
                <div class="settings-group">
                    <label class="settings-label">Teléfono</label>
                    <input type="tel" id="edit-admin-telefono" class="settings-input" value="${admin.telefono || ''}">
                </div>
                <div class="settings-group">
                    <label class="settings-label">Email</label>
                    <input type="email" id="edit-admin-email" class="settings-input" value="${admin.email || ''}">
                </div>
                <div class="settings-group">
                    <label class="settings-label">Cargo</label>
                    <input type="text" id="edit-admin-cargo" class="settings-input" value="${admin.cargo || ''}">
                </div>
                <div class="settings-group">
                    <label class="settings-label">Estado</label>
                    <select id="edit-admin-active" class="filter-select" style="width: 100%;">
                        <option value="true" ${admin.active !== false ? 'selected' : ''}>Activo</option>
                        <option value="false" ${admin.active === false ? 'selected' : ''}>Inactivo</option>
                    </select>
                </div>
                <div class="settings-group">
                    <label class="settings-label">Nivel de permisos</label>
                    <select id="edit-admin-role" class="filter-select" style="width: 100%;">
                        <option value="administrador" ${admin.role === 'administrador' ? 'selected' : ''}>Administrador Total</option>
                        <option value="editor" ${admin.role === 'editor' ? 'selected' : ''}>Editor</option>
                        <option value="visor" ${admin.role === 'visor' ? 'selected' : ''}>Visor</option>
                    </select>
                </div>
            </div>

            <div class="modal-actions" style="margin-top: 24px;">
                <button class="btn-admin btn-admin-outline" onclick="closeEditAdminModal()">Cancelar</button>
                <button class="btn-admin btn-admin-primary" onclick="window.saveAdminChanges('${uid}')"><i class="fas fa-save"></i> Guardar Cambios</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        overlay.addEventListener('click', function(e) { if (e.target === overlay) closeEditAdminModal(); });

    } catch (error) {
        console.error('Error al cargar admin:', error);
        showAdminNotification('error', 'Error', 'No se pudo cargar los datos del administrador.');
    }
};

window.closeEditAdminModal = function() {
    const modal = document.getElementById('editAdminModal');
    if (modal) modal.remove();
};

window.saveAdminChanges = async function(uid) {
    try {
        const updates = {
            nombre: document.getElementById('edit-admin-nombre').value.trim(),
            apellidos: document.getElementById('edit-admin-apellidos').value.trim(),
            dni: document.getElementById('edit-admin-dni').value.trim(),
            telefono: document.getElementById('edit-admin-telefono').value.trim(),
            email: document.getElementById('edit-admin-email').value.trim(),
            cargo: document.getElementById('edit-admin-cargo').value.trim(),
            active: document.getElementById('edit-admin-active').value === 'true',
            role: document.getElementById('edit-admin-role').value,
            updatedAt: new Date().toISOString()
        };

        await update(ref(db, 'usuarios/' + uid), updates);
        closeEditAdminModal();
        showAdminNotification('success', 'Actualizado', 'Los datos del administrador han sido actualizados.');

    } catch (error) {
        console.error('Error al guardar:', error);
        showAdminNotification('error', 'Error', 'No se pudieron guardar los cambios.');
    }
};

// ========== ELIMINAR ADMINISTRADOR ==========
window.deleteAdmin = async function(uid, nombre) {
    if (!confirm(`¿Eliminar al administrador "${nombre}"?\n\nEsta acción no se puede deshacer.`)) return;

    try {
        await remove(ref(db, 'usuarios/' + uid));
        showAdminNotification('success', 'Eliminado', `El administrador "${nombre}" ha sido eliminado.`);
    } catch (error) {
        console.error('Error al eliminar admin:', error);
        showAdminNotification('error', 'Error', 'No se pudo eliminar el administrador.');
    }
};

// ========== FUERZA DE CONTRASEÑA ==========
window.checkPasswordStrength = function(password) {
    const bar = document.getElementById('passwordStrengthBar');
    const hint = document.getElementById('passwordHint');
    if (!bar || !hint) return;

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    bar.className = 'password-strength-bar';

    if (password.length === 0) {
        hint.textContent = 'La contraseña debe tener al menos 6 caracteres';
    } else if (strength <= 2) {
        bar.classList.add('weak');
        hint.textContent = 'Contraseña débil - Añada mayúsculas, números o símbolos';
        hint.style.color = '#ef4444';
    } else if (strength <= 4) {
        bar.classList.add('medium');
        hint.textContent = 'Contraseña media - Puede mejorarla con más caracteres';
        hint.style.color = '#f59e0b';
    } else {
        bar.classList.add('strong');
        hint.textContent = 'Contraseña fuerte - Excelente seguridad';
        hint.style.color = '#10b981';
    }
};

// ========== ESTADÍSTICAS ==========
function updateStats() {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const statWeek = document.getElementById('statWeekAppointments');
    const statClients = document.getElementById('statActiveClients');
    const statPending = document.getElementById('statTodayPending');
    const statUrgent = document.getElementById('statUrgentCases');

    if (statWeek) statWeek.textContent = appointments.filter(a => (a.fechaCreacion || '').split('T')[0] >= weekAgo).length;
    if (statClients) statClients.textContent = clients.length;
    if (statPending) statPending.textContent = appointments.filter(a => a.fecha_preferida === today && (a.status === 'pendiente' || !a.status)).length;
    if (statUrgent) statUrgent.textContent = appointments.filter(a => a.urgencia === 'urgente' || a.urgencia === 'muy-urgente').length;

    const appBadge = document.getElementById('appointmentsBadge');
    const notifBadge = document.getElementById('notificationsBadge');
    const pendingToday = appointments.filter(a => a.fecha_preferida === today && (a.status === 'pendiente' || !a.status)).length;

    if (appBadge) { 
        appBadge.textContent = pendingToday; 
        appBadge.style.display = pendingToday > 0 ? 'inline-flex' : 'none'; 
    }
    if (notifBadge) { 
        notifBadge.textContent = notifications.length; 
        notifBadge.style.display = notifications.length > 0 ? 'inline-flex' : 'none'; 
    }

    renderCalendar(calendarCurrentMonth, calendarCurrentYear);
}

// ========== CRUD CITAS ==========
window.deleteAppointment = async function(id) {
    if (!confirm('¿Eliminar esta cita?')) return;

    try {
        await remove(ref(db, 'citas/' + id));
        showAdminNotification('success', 'Cita eliminada', 'La cita ha sido eliminada correctamente.');
    } catch (error) {
        showAdminNotification('error', 'Error', 'No se pudo eliminar la cita.');
    }
};

window.deleteNotification = async function(id) {
    try {
        await remove(ref(db, 'notificaciones/' + id));
    } catch (error) {
        console.error('Error al eliminar notificación:', error);
    }
};

// ========== MODAL DE EDICIÓN ==========
let editingAppointmentId = null;

window.editAppointment = async function(id) {
    try {
        const snapshot = await get(ref(db, 'citas/' + id));
        if (!snapshot.exists()) return;

        const app = sanitizeData(snapshot.val());
        editingAppointmentId = id;
        showEditModal(app);
    } catch (error) {
        console.error('Error al cargar cita:', error);
        showAdminNotification('error', 'Error', 'No se pudo cargar la cita.');
    }
};

function showEditModal(app) {
    const existing = document.getElementById('editAppointmentModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'editAppointmentModal';
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content';

    const today = new Date().toISOString().split('T')[0];
    const currentDate = app.fecha_preferida || today;
    const currentTime = app.hora_preferida || '09:00';

    modal.innerHTML = `
        <button class="modal-close" onclick="closeEditModal()"><i class="fas fa-times-circle"></i></button>
        <h2 class="modal-title">Editar cita</h2>
        <p class="modal-subtitle">Cliente: <strong>${app.nombre} ${app.apellidos || ''}</strong> · ${app.telefono}</p>

        <div class="form-group">
            <label>Estado</label>
            <select id="modal-status" class="filter-select">
                <option value="pendiente" ${app.status==='pendiente'?'selected':''}>Pendiente</option>
                <option value="confirmada" ${app.status==='confirmada'?'selected':''}>Confirmada</option>
                <option value="completada" ${app.status==='completada'?'selected':''}>Completada</option>
                <option value="cancelada" ${app.status==='cancelada'?'selected':''}>Cancelada</option>
            </select>
        </div>
        <div class="form-group">
            <label>Modalidad</label>
            <select id="modal-modalidad" class="filter-select">
                <option value="Presencial" ${app.modalidad==='Presencial'?'selected':''}>Presencial</option>
                <option value="Telefónica" ${app.modalidad==='Telefónica'?'selected':''}>Telefónica</option>
                <option value="Videollamada" ${app.modalidad==='Videollamada'?'selected':''}>Videollamada</option>
            </select>
        </div>
        <div class="form-group">
            <label>Fecha</label>
            <input type="date" id="modal-fecha" class="settings-input" value="${currentDate}">
        </div>
        <div class="form-group">
            <label>Hora</label>
            <input type="time" id="modal-hora" class="settings-input" value="${currentTime}">
        </div>
        <div class="form-group">
            <label>Nota interna</label>
            <textarea id="modal-nota" rows="2" class="settings-input">${app.nota_interna || ''}</textarea>
        </div>
        <div class="form-group">
            <label>Mensaje para el cliente</label>
            <textarea id="modal-mensaje" rows="2" class="settings-input">${app.mensaje_cliente || ''}</textarea>
        </div>

        <div class="modal-actions">
            <button class="btn-admin btn-admin-outline" onclick="closeEditModal()">Cancelar</button>
            <button class="btn-admin" style="background:var(--admin-success);color:white;" onclick="window.acceptAppointment()"><i class="fas fa-check"></i> Aceptar</button>
            <button class="btn-admin" style="background:var(--admin-warning);color:white;" onclick="window.reprogramAppointment()"><i class="fas fa-calendar-plus"></i> Reprogramar</button>
            <button class="btn-admin" style="background:var(--admin-danger);color:white;" onclick="window.cancelAppointment()"><i class="fas fa-times"></i> Cancelar</button>
            <button class="btn-admin btn-admin-primary" onclick="window.saveAppointmentChanges()"><i class="fas fa-save"></i> Guardar</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeEditModal(); });
}

window.closeEditModal = function() {
    const modal = document.getElementById('editAppointmentModal');
    if (modal) modal.remove();
    editingAppointmentId = null;
};

function getModalData() {
    return {
        status: document.getElementById('modal-status').value,
        modalidad: document.getElementById('modal-modalidad').value,
        fecha: document.getElementById('modal-fecha').value,
        hora: document.getElementById('modal-hora').value,
        nota: document.getElementById('modal-nota').value,
        mensaje: document.getElementById('modal-mensaje').value
    };
}

window.saveAppointmentChanges = async function() {
    if (editingAppointmentId === null) return;

    const data = getModalData();
    try {
        await update(ref(db, 'citas/' + editingAppointmentId), {
            status: data.status,
            modalidad: data.modalidad,
            fecha_preferida: data.fecha,
            hora_preferida: data.hora,
            nota_interna: data.nota,
            mensaje_cliente: data.mensaje,
            fechaActualizacion: new Date().toISOString()
        });

        closeEditModal();
        showAdminNotification('success', 'Cita actualizada', 'Los cambios han sido guardados.');
    } catch (error) {
        showAdminNotification('error', 'Error', 'No se pudieron guardar los cambios.');
    }
};

window.acceptAppointment = async function() {
    if (editingAppointmentId === null) return;

    try {
        await update(ref(db, 'citas/' + editingAppointmentId), {
            status: 'confirmada',
            fechaActualizacion: new Date().toISOString()
        });

        closeEditModal();
        showAdminNotification('success', 'Cita aceptada', 'La cita ha sido confirmada.');
    } catch (error) {
        showAdminNotification('error', 'Error', 'No se pudo confirmar la cita.');
    }
};

window.reprogramAppointment = async function() {
    if (editingAppointmentId === null) return;

    const data = getModalData();
    try {
        await update(ref(db, 'citas/' + editingAppointmentId), {
            status: 'pendiente',
            fecha_preferida: data.fecha,
            hora_preferida: data.hora,
            modalidad: data.modalidad,
            nota_interna: data.nota,
            mensaje_cliente: data.mensaje || `Hemos reprogramado su cita para el ${formatDate(data.fecha)} a las ${data.hora}.`,
            fechaActualizacion: new Date().toISOString()
        });

        closeEditModal();
        showAdminNotification('warning', 'Cita reprogramada', 'La cita ha sido reprogramada.');
    } catch (error) {
        showAdminNotification('error', 'Error', 'No se pudo reprogramar la cita.');
    }
};

window.cancelAppointment = async function() {
    if (editingAppointmentId === null) return;

    if (!confirm('¿Cancelar esta cita?')) return;

    try {
        await update(ref(db, 'citas/' + editingAppointmentId), {
            status: 'cancelada',
            fechaActualizacion: new Date().toISOString()
        });

        closeEditModal();
        showAdminNotification('danger', 'Cita cancelada', 'La cita ha sido cancelada.');
    } catch (error) {
        showAdminNotification('error', 'Error', 'No se pudo cancelar la cita.');
    }
};

window.viewAppointment = async function(id) {
    try {
        const snapshot = await get(ref(db, 'citas/' + id));
        if (!snapshot.exists()) return;

        const app = sanitizeData(snapshot.val());
        alert(`Cita #${id}\nCliente: ${app.nombre}\nTeléfono: ${app.telefono}\nServicio: ${app.tipo_consulta}\nFecha: ${formatDate(app.fecha_preferida)} ${app.hora_preferida || ''}\nEstado: ${app.status}`);
    } catch (error) {
        console.error('Error al ver cita:', error);
    }
};

window.viewClient = function(id) {
    const c = clients.find(c => c.id === id);
    if (!c) return;
    alert(`Cliente: ${c.nombre} ${c.apellidos || ''}\nDNI: ${c.dni}\nTeléfono: ${c.telefono}\nEmail: ${c.email}`);
};

window.editClient = function(id) {
    alert('Función de edición de cliente en desarrollo.');
};

// ========== LOGOUT ==========
window.logoutAdmin = async function() {
    if (!confirm('¿Cerrar sesión?')) return;
    try {
        // Importar auth dinámicamente
        const { auth } = await import('../../js/firebase-config.js');
        const { signOut } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        window.location.href = 'login.html';
    }
};

// ========== NOTIFICACIÓN ADMIN ==========
function showAdminNotification(type, title, message) {
    const existing = document.querySelector('.admin-notification');
    if (existing) existing.remove();

    const notif = document.createElement('div');
    notif.className = `admin-notification ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    notif.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:10px;">
            <i class="fas ${icon}" style="font-size:1.3rem;margin-top:2px;"></i>
            <div style="flex:1;"><div style="font-weight:700;font-size:0.95rem;">${title}</div><div style="font-size:0.85rem;opacity:0.95;">${message}</div></div>
            <i class="fas fa-times" style="font-size:0.9rem;opacity:0.7;cursor:pointer;" onclick="this.parentElement.parentElement.remove()"></i>
        </div>
    `;
    document.body.appendChild(notif);
    setTimeout(() => {
        if (notif.parentElement) {
            notif.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => notif.remove(), 300);
        }
    }, 5000);
}

// ========== DOM READY ==========
document.addEventListener('DOMContentLoaded', function() {
    renderCalendar(calendarCurrentMonth, calendarCurrentYear);

    document.getElementById('calendarPrev')?.addEventListener('click', function() {
        if (calendarCurrentMonth === 0) { calendarCurrentMonth = 11; calendarCurrentYear--; }
        else calendarCurrentMonth--;
        renderCalendar(calendarCurrentMonth, calendarCurrentYear);
    });

    document.getElementById('calendarNext')?.addEventListener('click', function() {
        if (calendarCurrentMonth === 11) { calendarCurrentMonth = 0; calendarCurrentYear++; }
        else calendarCurrentMonth++;
        renderCalendar(calendarCurrentMonth, calendarCurrentYear);
    });

    document.getElementById('calendarToday')?.addEventListener('click', function() {
        const today = new Date();
        calendarCurrentMonth = today.getMonth();
        calendarCurrentYear = today.getFullYear();
        renderCalendar(calendarCurrentMonth, calendarCurrentYear);
    });

    // Tema oscuro/claro
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('admin-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
        html.setAttribute('data-theme', 'dark');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    themeToggle?.addEventListener('click', function() {
        const isDark = html.getAttribute('data-theme') === 'dark';
        if (isDark) {
            html.removeAttribute('data-theme');
            localStorage.setItem('admin-theme', 'light');
            this.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            html.setAttribute('data-theme', 'dark');
            localStorage.setItem('admin-theme', 'dark');
            this.innerHTML = '<i class="fas fa-sun"></i>';
        }
    });

    // Sidebar toggle
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');

    sidebarToggle?.addEventListener('click', function() {
        sidebar?.classList.toggle('collapsed');
        const icon = this.querySelector('i');
        if (sidebar?.classList.contains('collapsed')) {
            icon?.classList.remove('fa-chevron-left');
            icon?.classList.add('fa-chevron-right');
        } else {
            icon?.classList.remove('fa-chevron-right');
            icon?.classList.add('fa-chevron-left');
        }
    });

    // Navegación entre páginas
    const navItems = document.querySelectorAll('.nav-item');
    const pageTitle = document.getElementById('pageTitle');
    const pageTitles = { 
        dashboard:'Panel Principal', 
        appointments:'Citas', 
        clients:'Clientes', 
        reports:'Informes', 
        notifications:'Notificaciones', 
        content:'Contenido Web', 
        settings:'Configuración',
        admins:'Administradores'
    };

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            window.showPage(page);
        });
    });

    window.showPage = function(page) {
        navItems.forEach(i => i.classList.remove('active'));
        document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
        document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
        document.getElementById('page-'+page).style.display = 'block';
        if (pageTitle) pageTitle.textContent = pageTitles[page] || 'Panel Principal';
        sidebar?.classList.remove('mobile-open');
    };

    // Menú móvil
    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn) {
        mobileBtn.style.display = window.innerWidth <= 768 ? 'block' : 'none';
        mobileBtn.addEventListener('click', () => sidebar?.classList.toggle('mobile-open'));
        window.addEventListener('resize', function() {
            mobileBtn.style.display = window.innerWidth <= 768 ? 'block' : 'none';
            if (window.innerWidth > 768) sidebar?.classList.remove('mobile-open');
        });
    }

    // Iniciar sincronización con Firebase
    syncWithFirebase();

    // Botones "Nueva Cita" y "Nuevo Cliente"
    document.querySelectorAll('.btn-admin-primary').forEach(btn => {
        if (btn.textContent.includes('Nueva Cita')) {
            btn.addEventListener('click', async function() {
                const nombre = prompt('Nombre:');
                if (!nombre) return;
                const apellidos = prompt('Apellidos:');
                const telefono = prompt('Teléfono:');
                const email = prompt('Email:');
                const tipo = prompt('Tipo de consulta:');
                if (!telefono || !email) return showAdminNotification('error', 'Error', 'Teléfono y email requeridos.');

                const fechaPreferida = new Date().toISOString().split('T')[0];
                const newApp = {
                    nombre, 
                    apellidos: apellidos || '', 
                    telefono, 
                    email, 
                    tipo_consulta: tipo || 'General', 
                    modalidad: 'Presencial', 
                    fecha_preferida: fechaPreferida,
                    usuarioId: window.AuthService?.getCurrentSession()?.userId || 'admin'
                };

                const result = await window.AppointmentService.createAppointment(newApp);
                if (result.success) {
                    showAdminNotification('success', 'Cita añadida', `Cita para ${nombre} añadida.`);
                } else {
                    showAdminNotification('error', 'Error', result.error);
                }
            });
        }
        if (btn.textContent.includes('Nuevo Cliente')) {
            btn.addEventListener('click', function() {
                alert('Use el formulario de registro público o cree el usuario desde Firebase Console.');
            });
        }
    });

    // Exportar informe
    document.querySelectorAll('.btn-admin-outline').forEach(btn => {
        if (btn.textContent.includes('Exportar') || btn.textContent.includes('PDF')) {
            btn.addEventListener('click', function() {
                if (appointments.length === 0) return showAdminNotification('warning', 'Sin datos', 'No hay citas.');
                let report = 'INFORME DE CITAS - AYALA ABOGADOS\n';
                report += `Generado: ${new Date().toLocaleString('es-ES')}\n`;
                report += '========================================\n\n';
                appointments.forEach(a => {
                    report += `ID: #${a.id} | ${a.nombre} ${a.apellidos || ''} | ${a.telefono} | ${a.tipo_consulta} | ${formatDate(a.fecha_preferida)} ${a.hora_preferida || ''} | ${a.status}\n`;
                });
                const blob = new Blob([report], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `informe_${new Date().toISOString().slice(0,10)}.txt`;
                a.click();
                URL.revokeObjectURL(url);
                showAdminNotification('success', 'Informe generado', 'Descargado correctamente.');
            });
        }
    });

    console.log('✅ Admin panel (Firebase) cargado correctamente.');
});
