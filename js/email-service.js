/* ============================================
   AYALA ABOGADOS - EMAIL SERVICE + FIREBASE
   Envío de formularios y sincronización con Realtime DB
   ============================================ */

import './appointment-service.js';

// Configuración de EmailJS
// IMPORTANTE: rellena estos 4 valores con los de tu cuenta de EmailJS
// (emailjs.com → Account → API Keys / Email Services / Email Templates):
// - publicKey / serviceId: los mismos para toda la cuenta.
// - templateId: plantilla para el AVISO INTERNO al despacho de que ha
//   entrado una nueva solicitud de cita (variables: nombre, apellidos,
//   telefono, email, tipo_consulta, modalidad, urgencia, fecha_preferida,
//   hora_preferida, descripcion, admin_asignado).
// - confirmationTemplateId: plantilla NUEVA para el correo que se le
//   envía AL CLIENTE cuando el admin pulsa "Aceptar" en una cita
//   (variables: to_email, to_name, nombre, tipo_consulta, modalidad,
//   fecha, hora, telefono_despacho).
// Mientras publicKey siga en 'YOUR_PUBLIC_KEY', todo funciona en modo
// simulación / con el cliente de correo como respaldo, sin dar error.
const EMAILJS_CONFIG = {
    publicKey: 'YOUR_PUBLIC_KEY',
    serviceId: 'YOUR_SERVICE_ID',
    templateId: 'YOUR_TEMPLATE_ID',
    confirmationTemplateId: 'YOUR_CONFIRMATION_TEMPLATE_ID'
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
// ===== VALIDACIÓN DE NIF / NIE / CIF (con dígito/letra de control real) =====
// Cubre: NIF/DNI (8 dígitos + letra), NIE (X/Y/Z + 7 dígitos + letra) y
// CIF de empresas (letra + 7 dígitos + dígito o letra de control).
window.validarNifNieCif = function(valorOriginal) {
    if (!valorOriginal) return false;
    const valor = valorOriginal.toUpperCase().replace(/[\s-]/g, '');
    const LETRAS_NIF = 'TRWAGMYFPDXBNJZSQVHLCKE';

    // NIF / DNI: 8 dígitos + letra de control
    if (/^\d{8}[A-Z]$/.test(valor)) {
        const numero = parseInt(valor.slice(0, 8), 10);
        return LETRAS_NIF[numero % 23] === valor.charAt(8);
    }

    // NIE: X/Y/Z + 7 dígitos + letra de control
    if (/^[XYZ]\d{7}[A-Z]$/.test(valor)) {
        const prefijos = { X: '0', Y: '1', Z: '2' };
        const numero = parseInt(prefijos[valor.charAt(0)] + valor.slice(1, 8), 10);
        return LETRAS_NIF[numero % 23] === valor.charAt(8);
    }

    // CIF: letra inicial + 7 dígitos + dígito o letra de control
    if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-Z]$/.test(valor)) {
        const letraInicial = valor.charAt(0);
        const digitos = valor.slice(1, 8);
        const control = valor.charAt(8);

        let sumaPar = 0;
        let sumaImpar = 0;
        for (let i = 0; i < digitos.length; i++) {
            const n = parseInt(digitos[i], 10);
            if ((i + 1) % 2 === 0) {
                sumaPar += n;
            } else {
                let doble = n * 2;
                if (doble > 9) doble -= 9;
                sumaImpar += doble;
            }
        }
        const digitoControl = (10 - ((sumaPar + sumaImpar) % 10)) % 10;
        const letraControl = 'JABCDEFGHI'.charAt(digitoControl);

        // Organizaciones cuyo control es siempre letra o siempre número
        const requiereLetra = ['P', 'Q', 'S', 'N', 'W', 'R'].includes(letraInicial);
        const requiereNumero = ['A', 'B', 'E', 'H'].includes(letraInicial);

        if (requiereLetra) return control === letraControl;
        if (requiereNumero) return control === String(digitoControl);
        return control === String(digitoControl) || control === letraControl;
    }

    return false;
};

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

    const dniField = form.querySelector('[name="dni"]');
    if (dniField) {
        const dni = dniField.value.trim();
        if (!dni) errors.push('El DNI/NIE/CIF es obligatorio.');
        else if (!window.validarNifNieCif(dni)) errors.push('El DNI/NIE/CIF introducido no es válido.');
    }

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
            dni: formData.dni || '',
            telefono: formData.telefono,
            email: formData.email,
            tipo_consulta: formData.tipo_consulta || 'General',
            modalidad: formData.modalidad || 'Presencial',
            urgencia: formData.urgencia || 'normal',
            fecha_preferida: formData.fecha_preferida || '',
            hora_preferida: formData.hora_preferida || '',
            descripcion: formData.descripcion || formData.mensaje || '',
            admin_asignado: formData.admin_asignado || 'cualquiera',
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

// ============================================
// EMAIL DE CONFIRMACIÓN AL CLIENTE (botón "Aceptar" del panel de admin)
// ============================================

// Respaldo: abre el cliente de correo predeterminado (Outlook u otro) con
// un borrador ya redactado, dirigido al cliente. Se usa automáticamente
// si EmailJS no está configurado o si el envío falla.
function openMailClientFallback(cita) {
    const nombre = cita.nombre || 'cliente';
    const fecha = cita.fecha_preferida ? ` para el ${cita.fecha_preferida}` : '';
    const hora = cita.hora_preferida ? ` a las ${cita.hora_preferida}` : '';
    const modalidad = cita.modalidad || 'Presencial';

    const subject = `Confirmación de su cita - Ayala Abogados`;
    const body =
        `Estimado/a ${nombre},\n\n` +
        `Le confirmamos su cita de ${cita.tipo_consulta || 'consulta'}${fecha}${hora} ` +
        `(modalidad: ${modalidad}).\n\n` +
        `Si necesita modificar o cancelar la cita, puede contactarnos en el 679 448 261 ` +
        `o respondiendo a este correo.\n\n` +
        `Un cordial saludo,\nAyala Abogados`;

    const mailtoUrl = `mailto:${encodeURIComponent(cita.email || '')}` +
        `?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.open(mailtoUrl, '_self');
}

// Se llama desde el panel de admin al pulsar "Aceptar". Intenta enviar el
// correo automáticamente por EmailJS; si no está configurado (publicKey
// sigue siendo 'YOUR_PUBLIC_KEY') o el envío falla, abre el cliente de
// correo del ordenador (Outlook u otro predeterminado) con el mensaje ya
// redactado, para que el admin solo tenga que darle a enviar.
window.sendClientConfirmationEmail = async function(cita) {
    if (!cita || !cita.email) {
        return { success: false, error: 'La cita no tiene email del cliente.' };
    }

    const templateParams = {
        to_email: cita.email,
        to_name: `${cita.nombre || ''} ${cita.apellidos || ''}`.trim(),
        nombre: cita.nombre || '',
        tipo_consulta: cita.tipo_consulta || 'Consulta General',
        modalidad: cita.modalidad || 'Presencial',
        fecha: cita.fecha_preferida || '',
        hora: cita.hora_preferida || '',
        telefono_despacho: '679 448 261'
    };

    const notConfigured =
        EMAILJS_CONFIG.publicKey === 'YOUR_PUBLIC_KEY' ||
        EMAILJS_CONFIG.confirmationTemplateId === 'YOUR_CONFIRMATION_TEMPLATE_ID' ||
        typeof emailjs === 'undefined';

    if (notConfigured) {
        openMailClientFallback(cita);
        return { success: true, fallback: true };
    }

    try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.confirmationTemplateId, templateParams);
        return { success: true, fallback: false };
    } catch (error) {
        console.error('Error al enviar email de confirmación por EmailJS:', error);
        openMailClientFallback(cita);
        return { success: true, fallback: true, error };
    }
};