/* ============================================
   AYALA ABOGADOS - EMAIL SERVICE + FIREBASE
   Envío de formularios y sincronización con Realtime DB
   ============================================ */

import './appointment-service.js';

// Configuración de EmailJS
const EMAILJS_CONFIG = {
    publicKey: 'YOUR_PUBLIC_KEY',
    serviceId: 'YOUR_SERVICE_ID',
    templateId: 'YOUR_TEMPLATE_ID'
};

// Inicializar EmailJS si está configurado
if (EMAILJS_CONFIG.publicKey !== 'YOUR_PUBLIC_KEY') {
    try {
        emailjs.init(EMAILJS_CONFIG.publicKey);
    } catch(e) {
        console.log('EmailJS no inicializado - usando modo simulación');
    }
}

// Función para mostrar notificación
function showNotification(type, title, message) {
    const existing = document.querySelector('.email-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'email-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 400px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#f59e0b'};
        color: white;
        padding: 20px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: 'Inter', sans-serif;
        animation: slideInRight 0.4s ease;
        cursor: pointer;
    `;

    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';

    notification.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
            <i class="fas ${icon}" style="font-size: 1.5rem; margin-top: 2px;"></i>
            <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 6px;">${title}</div>
                <div style="font-size: 0.9rem; line-height: 1.5; opacity: 0.95;">${message}</div>
            </div>
            <i class="fas fa-times" style="font-size: 1rem; opacity: 0.7; cursor: pointer;" onclick="this.parentElement.parentElement.remove()"></i>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.4s ease forwards';
            setTimeout(() => notification.remove(), 400);
        }
    }, 8000);

    notification.addEventListener('click', function(e) {
        if (e.target.classList.contains('fa-times')) return;
        this.style.animation = 'slideOutRight 0.4s ease forwards';
        setTimeout(() => this.remove(), 400);
    });
}

// Validar formulario
function validateForm(form) {
    const errors = [];
    const nombre = form.querySelector('[name="nombre"]')?.value.trim();
    const apellidos = form.querySelector('[name="apellidos"]')?.value.trim();
    const telefono = form.querySelector('[name="telefono"]')?.value.trim();
    const email = form.querySelector('[name="email"]')?.value.trim();
    const privacidad = form.querySelector('[name="privacidad"]')?.checked;
    const tipoConsulta = form.querySelector('[name="tipo_consulta"]')?.value;

    if (!nombre || nombre.length < 2) errors.push('El nombre es obligatorio.');
    if (apellidos !== undefined && (!apellidos || apellidos.length < 2)) errors.push('Los apellidos son obligatorios.');
    if (!telefono) errors.push('El teléfono es obligatorio.');
    if (!email) errors.push('El email es obligatorio.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('El formato del email no es válido.');
    if (tipoConsulta !== undefined && !tipoConsulta) errors.push('Debe seleccionar un tipo de consulta.');
    if (!privacidad) errors.push('Debe aceptar la política de privacidad.');

    return errors;
}

// Enviar email (simulado o real)
async function sendEmail(formData) {
    if (EMAILJS_CONFIG.publicKey === 'YOUR_PUBLIC_KEY') {
        console.log('Modo simulación - Datos:', formData);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { success: true, message: 'Email enviado (simulación)' };
    }

    try {
        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            formData
        );
        return { success: true, message: 'Email enviado correctamente', response };
    } catch (error) {
        throw new Error(error.text || 'Error al enviar el email.');
    }
}

// Manejar envío de formulario
async function handleFormSubmit(form, event) {
    event.preventDefault();

    const submitBtn = form.querySelector('#submitBtn');
    const btnText = submitBtn?.querySelector('.btn-text');
    const btnLoading = submitBtn?.querySelector('.btn-loading');

    const errors = validateForm(form);
    if (errors.length > 0) {
        showNotification('error', `Error de validación (${errors.length})`, errors.join('<br>• '));
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
        submitBtn.style.cursor = 'not-allowed';
    }
    if (btnText) btnText.style.display = 'none';
    if (btnLoading) btnLoading.style.display = 'inline';

    const formData = {};
    form.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.name) {
            if (el.type === 'checkbox') formData[el.name] = el.checked ? 'Sí' : 'No';
            else if (el.type === 'radio') { if (el.checked) formData[el.name] = el.value; }
            else formData[el.name] = el.value;
        }
    });

    formData.fecha_envio = new Date().toLocaleString('es-ES');
    formData.destinatario = 'monicahernandezprieto@gmail.com';

    try {
        // 1. Enviar email
        await sendEmail(formData);

        // 2. Guardar en Firebase
        const appointmentData = {
            nombre: formData.nombre,
            apellidos: formData.apellidos || '',
            telefono: formData.telefono,
            email: formData.email,
            tipo_consulta: formData.tipo_consulta || 'General',
            modalidad: formData.modalidad || 'Presencial',
            urgencia: formData.urgencia || 'normal',
            fecha_preferida: formData.fecha_preferida || '',
            hora_preferida: formData.hora_preferida || '',
            descripcion: formData.descripcion || formData.mensaje || '',
            usuarioId: window.AuthService?.getCurrentSession()?.userId || 'anonimo'
        };

        const result = await window.AppointmentService.createAppointment(appointmentData);

        if (result.success) {
            showNotification('success', 
                '¡Solicitud enviada correctamente!', 
                `Su solicitud ha sido registrada con referencia #${result.id}.<br><br>
                 Nos pondremos en contacto en menos de 24 horas.`
            );
            form.reset();
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        showNotification('error', 
            'Error al enviar la solicitud', 
            `<strong>Detalle:</strong> ${error.message}<br><br>
             <strong>Contacte directamente:</strong><br>
             • Teléfono: <a href="tel:+34679448261" style="color:white;text-decoration:underline;">679 448 261</a><br>
             • Email: <a href="mailto:monicahernandezprieto@gmail.com" style="color:white;text-decoration:underline;">monicahernandezprieto@gmail.com</a>`
        );
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }
        if (btnText) btnText.style.display = 'inline';
        if (btnLoading) btnLoading.style.display = 'none';
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(120%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(120%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    const contactForm = document.getElementById('contactForm');
    if (contactForm) contactForm.addEventListener('submit', (e) => handleFormSubmit(contactForm, e));

    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) appointmentForm.addEventListener('submit', (e) => handleFormSubmit(appointmentForm, e));

    console.log('📧 Email Service + Firebase inicializado');
});