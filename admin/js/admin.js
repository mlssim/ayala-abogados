/* ============================================
   AYALA ABOGADOS - ADMIN PANEL JAVASCRIPT
   Con calendario interactivo y modal mejorado
   Versión con estilos CSS (sin inline)
   ============================================ */

// ===== DATOS GLOBALES =====
let appointments = JSON.parse(localStorage.getItem('ayala_appointments')) || [];
let clients = JSON.parse(localStorage.getItem('ayala_clients')) || [];
let notifications = JSON.parse(localStorage.getItem('ayala_notifications')) || [];
let nextId = parseInt(localStorage.getItem('ayala_nextId')) || 1;

// ===== GUARDADO =====
function saveData() {
    localStorage.setItem('ayala_appointments', JSON.stringify(appointments));
    localStorage.setItem('ayala_clients', JSON.stringify(clients));
    localStorage.setItem('ayala_notifications', JSON.stringify(notifications));
    localStorage.setItem('ayala_nextId', nextId.toString());
}

function generateId() {
    const id = nextId++;
    saveData();
    return id;
}

function formatDate(dateStr) {
    if (!dateStr) return 'No especificada';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Función para formatear fecha a YYYY-MM-DD (para comparar)
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

// ========== CALENDARIO ==========
let calendarCurrentMonth = new Date().getMonth();
let calendarCurrentYear = new Date().getFullYear();

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
        // Verificar si hay alguna cita en esa fecha (sin importar el estado)
        const hasApp = appointments.some(a => {
            const appDate = toDateStr(a.fecha_preferida);
            return appDate === dateStr;
        });
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
function onDayClick(dateStr) {
    const dayApps = appointments.filter(a => toDateStr(a.fecha_preferida) === dateStr);
    if (dayApps.length === 0) {
        showAdminNotification('info', 'Sin citas', 'No hay citas programadas para este día.');
        return;
    }

    // Eliminar modal previo
    const existing = document.getElementById('dayAppointmentsModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'dayAppointmentsModal';
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content';

    const dateObj = new Date(dateStr + 'T00:00:00');
    const fechaFormateada = dateObj.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
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
                    <button class="action-btn edit" title="Editar" onclick="closeDayModal(); editAppointment(${app.id});"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" title="Eliminar" onclick="closeDayModal(); deleteAppointment(${app.id}, this);"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `;
    });

    modal.innerHTML = `
        <button class="modal-close" onclick="closeDayModal()"><i class="fas fa-times-circle"></i></button>
        <h2 class="modal-title">
            <i class="fas fa-calendar-day"></i> ${fechaFormateada}
        </h2>
        <p class="modal-subtitle">${dayApps.length} cita${dayApps.length > 1 ? 's' : ''} programada${dayApps.length > 1 ? 's' : ''}</p>
        <div class="appointments-list">
            ${citasHtml}
        </div>
        <div class="modal-footer">
            <button class="btn-admin btn-admin-outline" onclick="closeDayModal()">Cerrar</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeDayModal();
    });
}

function closeDayModal() {
    const modal = document.getElementById('dayAppointmentsModal');
    if (modal) modal.remove();
}

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
                <button class="action-btn edit" onclick="editAppointment(${app.id})"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" onclick="deleteAppointment(${app.id}, this)"><i class="fas fa-times"></i></button>
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
            <td>#${String(app.id).padStart(3,'0')}</td>
            <td><strong>${app.nombre} ${app.apellidos || ''}</strong></td>
            <td>${app.telefono}</td>
            <td>${app.tipo_consulta || 'General'}</td>
            <td>${app.fecha_preferida ? formatDate(app.fecha_preferida) : 'Pendiente'} ${app.hora_preferida || ''}</td>
            <td>${app.modalidad || 'Presencial'}</td>
            <td>${getStatusBadge(app.status || 'pendiente')}</td>
            <td>
                <button class="action-btn edit" onclick="editAppointment(${app.id})"><i class="fas fa-edit"></i></button>
                <button class="action-btn" onclick="viewAppointment(${app.id})"><i class="fas fa-eye"></i></button>
                <button class="action-btn delete" onclick="deleteAppointment(${app.id}, this)"><i class="fas fa-times"></i></button>
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
                <button class="action-btn" onclick="viewClient(${c.id})"><i class="fas fa-eye"></i></button>
                <button class="action-btn edit" onclick="editClient(${c.id})"><i class="fas fa-edit"></i></button>
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
            <div class="notification-icon ${n.type}"><i class="fas ${n.icon}"></i></div>
            <div class="notification-content"><p><strong>${n.title}:</strong> ${n.message}</p><div class="notification-time">${n.time}</div></div>
            <button class="action-btn delete" onclick="deleteNotification(${n.id}, this)"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

// ========== ESTADÍSTICAS Y ACTUALIZACIÓN ==========
function updateStats() {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    document.getElementById('statWeekAppointments').textContent = appointments.filter(a => a.fecha_envio >= weekAgo).length;
    document.getElementById('statActiveClients').textContent = clients.length;
    document.getElementById('statTodayPending').textContent = appointments.filter(a => a.fecha_preferida === today && (a.status === 'pendiente' || !a.status)).length;
    document.getElementById('statUrgentCases').textContent = appointments.filter(a => a.urgencia === 'urgente' || a.urgencia === 'muy-urgente').length;

    const appBadge = document.getElementById('appointmentsBadge');
    const notifBadge = document.getElementById('notificationsBadge');
    const pendingToday = appointments.filter(a => a.fecha_preferida === today && (a.status === 'pendiente' || !a.status)).length;
    if (appBadge) { appBadge.textContent = pendingToday; appBadge.style.display = pendingToday > 0 ? 'inline-flex' : 'none'; }
    if (notifBadge) { notifBadge.textContent = notifications.length; notifBadge.style.display = notifications.length > 0 ? 'inline-flex' : 'none'; }

    // Refrescar calendario
    renderCalendar(calendarCurrentMonth, calendarCurrentYear);
}

// ========== CRUD CITAS ==========
function deleteAppointment(id, btn) {
    if (!confirm('¿Eliminar esta cita?')) return;
    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) return;
    const deleted = appointments[index];
    appointments.splice(index, 1);
    saveData();
    renderDashboardAppointments();
    renderAppointmentsTable();
    updateStats();
    showAdminNotification('success', 'Cita eliminada', `Cita de ${deleted.nombre} eliminada.`);
}

function deleteNotification(id, btn) {
    const index = notifications.findIndex(n => n.id === id);
    if (index === -1) return;
    notifications.splice(index, 1);
    saveData();
    renderNotifications();
    updateStats();
}

// ========== MODAL DE EDICIÓN ==========
let editingAppointmentId = null;

function editAppointment(id) {
    const app = appointments.find(a => a.id === id);
    if (!app) return;
    editingAppointmentId = id;
    showEditModal(app);
}

function showEditModal(app) {
    // Eliminar modal existente
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
        <h2 class="modal-title">Editar cita #${String(app.id).padStart(3,'0')}</h2>
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
            <button class="btn-admin" style="background:var(--admin-success);color:white;" onclick="acceptAppointment()"><i class="fas fa-check"></i> Aceptar</button>
            <button class="btn-admin" style="background:var(--admin-warning);color:white;" onclick="reprogramAppointment()"><i class="fas fa-calendar-plus"></i> Reprogramar</button>
            <button class="btn-admin" style="background:var(--admin-danger);color:white;" onclick="cancelAppointment()"><i class="fas fa-times"></i> Cancelar</button>
            <button class="btn-admin btn-admin-primary" onclick="saveAppointmentChanges()"><i class="fas fa-save"></i> Guardar</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeEditModal(); });
}

function closeEditModal() {
    const modal = document.getElementById('editAppointmentModal');
    if (modal) modal.remove();
    editingAppointmentId = null;
}

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

function saveAppointmentChanges() {
    if (editingAppointmentId === null) return;
    const app = appointments.find(a => a.id === editingAppointmentId);
    if (!app) return;
    const data = getModalData();
    Object.assign(app, {
        status: data.status,
        modalidad: data.modalidad,
        fecha_preferida: data.fecha,
        hora_preferida: data.hora,
        nota_interna: data.nota,
        mensaje_cliente: data.mensaje
    });
    saveData();
    closeEditModal();
    renderDashboardAppointments();
    renderAppointmentsTable();
    updateStats();
    notifications.unshift({ id: Date.now() + Math.random(), type: 'appointment', icon: 'fa-edit', title: 'Cita actualizada', message: `Cita de ${app.nombre} actualizada.`, time: 'Ahora mismo' });
    saveData();
    renderNotifications();
    showAdminNotification('success', 'Cita actualizada', `Cita de ${app.nombre} guardada.`);
}

function acceptAppointment() {
    if (editingAppointmentId === null) return;
    const app = appointments.find(a => a.id === editingAppointmentId);
    if (!app) return;
    app.status = 'confirmada';
    if (!app.mensaje_cliente) app.mensaje_cliente = `Su cita ha sido confirmada para el ${formatDate(app.fecha_preferida)} a las ${app.hora_preferida || 'hora convenida'}.`;
    saveData();
    closeEditModal();
    renderDashboardAppointments();
    renderAppointmentsTable();
    updateStats();
    showAdminNotification('success', 'Cita aceptada', `Cita de ${app.nombre} confirmada.`);
}

function reprogramAppointment() {
    if (editingAppointmentId === null) return;
    const app = appointments.find(a => a.id === editingAppointmentId);
    if (!app) return;
    const data = getModalData();
    app.status = 'pendiente';
    app.fecha_preferida = data.fecha;
    app.hora_preferida = data.hora;
    app.modalidad = data.modalidad;
    app.nota_interna = data.nota;
    app.mensaje_cliente = data.mensaje || `Hemos reprogramado su cita para el ${formatDate(data.fecha)} a las ${data.hora}.`;
    saveData();
    closeEditModal();
    renderDashboardAppointments();
    renderAppointmentsTable();
    updateStats();
    showAdminNotification('warning', 'Cita reprogramada', `Cita de ${app.nombre} reprogramada.`);
    // Abrir mail
    const asunto = encodeURIComponent('Su cita ha sido reprogramada');
    const cuerpo = encodeURIComponent(`Estimado/a ${app.nombre},\n\nSu cita ha sido reprogramada para el ${formatDate(data.fecha)} a las ${data.hora}.\n\n${app.mensaje_cliente}\n\nAtentamente,\nAyala Abogados`);
    window.location.href = `mailto:${app.email}?subject=${asunto}&body=${cuerpo}`;
}

function cancelAppointment() {
    if (editingAppointmentId === null) return;
    const app = appointments.find(a => a.id === editingAppointmentId);
    if (!app) return;
    if (!confirm(`¿Cancelar cita de ${app.nombre}?`)) return;
    app.status = 'cancelada';
    if (!app.mensaje_cliente) app.mensaje_cliente = 'Su cita ha sido cancelada.';
    saveData();
    closeEditModal();
    renderDashboardAppointments();
    renderAppointmentsTable();
    updateStats();
    showAdminNotification('danger', 'Cita cancelada', `Cita de ${app.nombre} cancelada.`);
}

function viewAppointment(id) {
    const app = appointments.find(a => a.id === id);
    if (!app) return;
    alert(`Cita #${id}\nCliente: ${app.nombre}\nTeléfono: ${app.telefono}\nServicio: ${app.tipo_consulta}\nFecha: ${formatDate(app.fecha_preferida)} ${app.hora_preferida || ''}\nEstado: ${app.status}`);
}

function viewClient(id) {
    const c = clients.find(c => c.id === id);
    if (!c) return;
    alert(`Cliente: ${c.nombre} ${c.apellidos || ''}\nDNI: ${c.dni}\nTeléfono: ${c.telefono}\nEmail: ${c.email}\nTotal citas: ${c.total_citas}`);
}

function editClient(id) {
    alert('Función de edición de cliente en desarrollo.');
}

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

// ========== SINCRONIZACIÓN CON FORMULARIO ==========
function checkForNewAppointments() {
    const pending = JSON.parse(localStorage.getItem('pending_appointments') || '[]');
    if (pending.length === 0) return;
    pending.forEach(app => {
        // Asegurar que la fecha tenga formato YYYY-MM-DD
        if (app.fecha_preferida) {
            const d = new Date(app.fecha_preferida);
            if (!isNaN(d)) {
                app.fecha_preferida = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            }
        }
        const newApp = { id: generateId(), ...app, status: 'pendiente', fecha_recepcion: new Date().toISOString() };
        appointments.unshift(newApp);
        const existing = clients.find(c => c.email === app.email);
        if (existing) {
            existing.total_citas = (existing.total_citas || 0) + 1;
            existing.ultima_cita = new Date().toLocaleDateString('es-ES');
        } else {
            clients.unshift({ id: generateId(), nombre: app.nombre, apellidos: app.apellidos || '', dni: app.dni || 'N/D', telefono: app.telefono, email: app.email, total_citas: 1, ultima_cita: new Date().toLocaleDateString('es-ES') });
        }
        notifications.unshift({ id: Date.now() + Math.random(), type: 'appointment', icon: 'fa-calendar-check', title: 'Nueva cita', message: `${app.nombre} ha solicitado cita.`, time: 'Ahora mismo' });
    });
    localStorage.removeItem('pending_appointments');
    saveData();
    renderDashboardAppointments();
    renderAppointmentsTable();
    renderClientsTable();
    renderNotifications();
    updateStats();
    showAdminNotification('success', 'Nuevas citas', `Se recibieron ${pending.length} solicitud(es).`);
}

// ========== DOM READY ==========
document.addEventListener('DOMContentLoaded', function() {

    // Inicializar calendario
    renderCalendar(calendarCurrentMonth, calendarCurrentYear);

    // Eventos de navegación
    document.getElementById('calendarPrev').addEventListener('click', function() {
        if (calendarCurrentMonth === 0) { calendarCurrentMonth = 11; calendarCurrentYear--; }
        else calendarCurrentMonth--;
        renderCalendar(calendarCurrentMonth, calendarCurrentYear);
    });
    document.getElementById('calendarNext').addEventListener('click', function() {
        if (calendarCurrentMonth === 11) { calendarCurrentMonth = 0; calendarCurrentYear++; }
        else calendarCurrentMonth++;
        renderCalendar(calendarCurrentMonth, calendarCurrentYear);
    });
    document.getElementById('calendarToday').addEventListener('click', function() {
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
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    themeToggle.addEventListener('click', function() {
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
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            const icon = this.querySelector('i');
            if (sidebar.classList.contains('collapsed')) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-left');
            }
        });
    }

    // Navegación entre páginas
    const navItems = document.querySelectorAll('.nav-item');
    const pageTitle = document.getElementById('pageTitle');
    const pageTitles = { dashboard:'Panel Principal', appointments:'Citas', clients:'Clientes', reports:'Informes', notifications:'Notificaciones', content:'Contenido Web', settings:'Configuración' };
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            showPage(page);
        });
    });
    window.showPage = function(page) {
        navItems.forEach(i => i.classList.remove('active'));
        document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
        document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
        document.getElementById('page-'+page).style.display = 'block';
        pageTitle.textContent = pageTitles[page] || 'Panel Principal';
        sidebar.classList.remove('mobile-open');
    };

    // Menú móvil
    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn) {
        mobileBtn.style.display = window.innerWidth <= 768 ? 'block' : 'none';
        mobileBtn.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
        window.addEventListener('resize', function() {
            mobileBtn.style.display = window.innerWidth <= 768 ? 'block' : 'none';
            if (window.innerWidth > 768) sidebar.classList.remove('mobile-open');
        });
    }

    // Render inicial
    renderDashboardAppointments();
    renderAppointmentsTable();
    renderClientsTable();
    renderNotifications();
    updateStats();

    // Verificar nuevas citas cada 5 segundos
    checkForNewAppointments();
    setInterval(checkForNewAppointments, 5000);

    // Botones "Nueva Cita" y "Nuevo Cliente"
    document.querySelectorAll('.btn-admin-primary').forEach(btn => {
        if (btn.textContent.includes('Nueva Cita')) {
            btn.addEventListener('click', function() {
                const nombre = prompt('Nombre:');
                if (!nombre) return;
                const apellidos = prompt('Apellidos:');
                const telefono = prompt('Teléfono:');
                const email = prompt('Email:');
                const tipo = prompt('Tipo de consulta:');
                if (!telefono || !email) return showAdminNotification('error', 'Error', 'Teléfono y email requeridos.');
                const fechaPreferida = new Date().toISOString().split('T')[0];
                const newApp = { id: generateId(), nombre, apellidos: apellidos || '', telefono, email, tipo_consulta: tipo || 'General', modalidad: 'Presencial', status: 'pendiente', fecha_envio: new Date().toISOString(), fecha_preferida: fechaPreferida };
                appointments.unshift(newApp);
                if (!clients.find(c => c.email === email)) {
                    clients.unshift({ id: generateId(), nombre, apellidos: apellidos || '', dni: 'N/D', telefono, email, total_citas: 1, ultima_cita: new Date().toLocaleDateString('es-ES') });
                }
                saveData();
                renderDashboardAppointments();
                renderAppointmentsTable();
                renderClientsTable();
                updateStats();
                showAdminNotification('success', 'Cita añadida', `Cita para ${nombre} añadida.`);
            });
        }
        if (btn.textContent.includes('Nuevo Cliente')) {
            btn.addEventListener('click', function() {
                const nombre = prompt('Nombre:');
                if (!nombre) return;
                const apellidos = prompt('Apellidos:');
                const dni = prompt('DNI:');
                const telefono = prompt('Teléfono:');
                const email = prompt('Email:');
                if (!telefono || !email) return showAdminNotification('error', 'Error', 'Teléfono y email requeridos.');
                clients.unshift({ id: generateId(), nombre, apellidos: apellidos || '', dni: dni || 'N/D', telefono, email, total_citas: 0, ultima_cita: 'Nunca' });
                saveData();
                renderClientsTable();
                updateStats();
                showAdminNotification('success', 'Cliente añadido', `${nombre} añadido.`);
            });
        }
    });

    // Exportar informe
    document.querySelectorAll('.btn-admin-outline').forEach(btn => {
        if (btn.textContent.includes('Exportar') || btn.textContent.includes('PDF')) {
            btn.addEventListener('click', function() {
                if (appointments.length === 0) return showAdminNotification('warning', 'Sin datos', 'No hay citas.');
                let report = 'INFORME DE CITAS\n';
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
                showAdminNotification('success', 'Informe generado', 'Descargado.');
            });
        }
    });

    // Guardar configuración (simulado)
    document.querySelectorAll('.btn-admin-primary').forEach(btn => {
        if (btn.textContent.includes('Guardar')) {
            btn.addEventListener('click', function() {
                const orig = this.innerHTML;
                this.innerHTML = '<i class="fas fa-check"></i> Guardado';
                this.style.background = 'var(--admin-success)';
                setTimeout(() => { this.innerHTML = orig; this.style.background = ''; }, 2000);
                showAdminNotification('success', 'Configuración', 'Guardada correctamente.');
            });
        }
    });

    console.log('✅ Admin panel cargado correctamente.');
});