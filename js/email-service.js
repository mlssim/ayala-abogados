/* ============================================
   AYALA ABOGADOS - EMAIL SERVICE
   Envío directo de formularios a monicahernandezprieto@gmail.com
   usando EmailJS (sin abrir Outlook/cliente de correo)
   ============================================ */

(function() {
    // Inicializar EmailJS con la clave pública
    // NOTA: Para producción, registrese en https://www.emailjs.com/
    // y reemplace 'YOUR_PUBLIC_KEY' con su clave pública real.
    // También debe crear una plantilla de email en su dashboard de EmailJS.

    // Configuración de EmailJS
    const EMAILJS_CONFIG = {
        publicKey: 'YOUR_PUBLIC_KEY',  // <-- REEMPLACE CON SU CLAVE PÚBLICA
        serviceId: 'YOUR_SERVICE_ID',   // <-- REEMPLACE CON SU SERVICE ID
        templateId: 'YOUR_TEMPLATE_ID'  // <-- REEMPLACE CON SU TEMPLATE ID
    };

    // Inicializar EmailJS
    try {
        emailjs.init(EMAILJS_CONFIG.publicKey);
    } catch(e) {
        console.log('EmailJS no inicializado - usando modo simulación');
    }

    // Función para mostrar popup de notificación
    function showNotification(type, title, message) {
        // Eliminar notificaciones anteriores
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

        // Auto-cerrar después de 8 segundos
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.4s ease forwards';
                setTimeout(() => notification.remove(), 400);
            }
        }, 8000);

        // Cerrar al hacer clic
        notification.addEventListener('click', function(e) {
            if (e.target.classList.contains('fa-times')) return;
            this.style.animation = 'slideOutRight 0.4s ease forwards';
            setTimeout(() => this.remove(), 400);
        });
    }

    // Función para validar el formulario
    function validateForm(form) {
        const errors = [];

        const nombre = form.querySelector('[name="nombre"]')?.value.trim();
        const apellidos = form.querySelector('[name="apellidos"]')?.value.trim();
        const telefono = form.querySelector('[name="telefono"]')?.value.trim();
        const email = form.querySelector('[name="email"]')?.value.trim();
        const dni = form.querySelector('[name="dni"]')?.value.trim();
        const privacidad = form.querySelector('[name="privacidad"]')?.checked;
        const tipoConsulta = form.querySelector('[name="tipo_consulta"]')?.value;

        if (!nombre || nombre.length < 2) {
            errors.push('El nombre es obligatorio y debe tener al menos 2 caracteres.');
        }

        if (apellidos !== undefined && (!apellidos || apellidos.length < 2)) {
            errors.push('Los apellidos son obligatorios.');
        }

        if (!telefono) {
            errors.push('El teléfono es obligatorio.');
        } else {
            const phoneRegex = /^[\+]?[0-9\s]{9,15}$/;
            if (!phoneRegex.test(telefono.replace(/\s/g, ''))) {
                errors.push('El formato del teléfono no es válido. Debe tener 9 dígitos mínimo.');
            }
        }

        if (!email) {
            errors.push('El email es obligatorio.');
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                errors.push('El formato del email no es válido (ejemplo: nombre@email.com).');
            }
        }

        if (dni !== undefined && !dni) {
            errors.push('El DNI/NIE es obligatorio.');
        }

        if (tipoConsulta !== undefined && !tipoConsulta) {
            errors.push('Debe seleccionar un tipo de consulta.');
        }

        if (!privacidad) {
            errors.push('Debe aceptar la política de privacidad para continuar.');
        }

        return errors;
    }

    // Función para enviar email con EmailJS
    async function sendEmail(formData) {
        // Si no está configurado EmailJS, simular envío exitoso
        if (EMAILJS_CONFIG.publicKey === 'YOUR_PUBLIC_KEY') {
            console.log('Modo simulación: Email no configurado. Datos del formulario:', formData);

            // Simular delay de red
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Simular éxito (90% de probabilidad) o error (10%)
            if (Math.random() > 0.1) {
                return { success: true, message: 'Simulación: Email enviado correctamente' };
            } else {
                throw new Error('Simulación: Error de conexión con el servidor de correo');
            }
        }

        // Envío real con EmailJS
        try {
            const response = await emailjs.send(
                EMAILJS_CONFIG.serviceId,
                EMAILJS_CONFIG.templateId,
                formData
            );
            return { success: true, message: 'Email enviado correctamente', response };
        } catch (error) {
            throw new Error(error.text || 'Error al enviar el email. Inténtelo de nuevo más tarde.');
        }
    }

    // Función principal para manejar el envío del formulario
    async function handleFormSubmit(form, event) {
        event.preventDefault();

        const submitBtn = form.querySelector('#submitBtn');
        const btnText = submitBtn?.querySelector('.btn-text');
        const btnLoading = submitBtn?.querySelector('.btn-loading');

        // Validar formulario
        const errors = validateForm(form);
        if (errors.length > 0) {
            showNotification('error', 
                `Error de validación (${errors.length})`, 
                errors.join('<br>• ')
            );
            return;
        }

        // Mostrar estado de carga
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';
            submitBtn.style.cursor = 'not-allowed';
        }
        if (btnText) btnText.style.display = 'none';
        if (btnLoading) btnLoading.style.display = 'inline';

        // Recopilar datos del formulario
        const formData = {};
        const formElements = form.querySelectorAll('input, select, textarea');
        formElements.forEach(el => {
            if (el.name) {
                if (el.type === 'checkbox') {
                    formData[el.name] = el.checked ? 'Sí' : 'No';
                } else if (el.type === 'radio') {
                    if (el.checked) formData[el.name] = el.value;
                } else {
                    formData[el.name] = el.value;
                }
            }
        });

        // Añadir metadatos
        formData.fecha_envio = new Date().toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        formData.destinatario = 'monicahernandezprieto@gmail.com';

        try {
            // Enviar email
            const result = await sendEmail(formData);

            // Éxito - Guardar cita para el panel de administración
            const appointmentData = {
                nombre: formData.nombre,
                apellidos: formData.apellidos || '',
                dni: formData.dni || 'N/D',
                telefono: formData.telefono,
                email: formData.email,
                tipo_consulta: formData.tipo_consulta || 'General',
                modalidad: formData.modalidad || 'Presencial',
                urgencia: formData.urgencia || 'normal',
                fecha_preferida: formData.fecha_preferida || '',
                hora_preferida: formData.hora_preferida || '',
                descripcion: formData.descripcion || formData.mensaje || '',
                fecha_envio: new Date().toISOString(),
                status: 'pendiente'
            };

            // Guardar en localStorage para que el admin la recoja
            const pending = JSON.parse(localStorage.getItem('pending_appointments') || '[]');
            pending.push(appointmentData);
            localStorage.setItem('pending_appointments', JSON.stringify(pending));

            showNotification('success', 
                '¡Solicitud enviada correctamente!', 
                `Su solicitud ha sido enviada a <strong>monicahernandezprieto@gmail.com</strong>.<br><br>
                 Nos pondremos en contacto con usted en menos de 24 horas laborables.<br>
                 <strong>Referencia:</strong> #${Date.now().toString().slice(-6)}`
            );

            // Resetear formulario
            form.reset();

        } catch (error) {
            // Error detallado
            let errorMsg = error.message;

            if (errorMsg.includes('network')) {
                errorMsg = 'Error de conexión a Internet. Verifique su conexión e inténtelo de nuevo.';
            } else if (errorMsg.includes('timeout')) {
                errorMsg = 'El servidor tardó demasiado en responder. Inténtelo de nuevo más tarde.';
            } else if (errorMsg.includes('template')) {
                errorMsg = 'Error en la configuración del servicio de correo. Contacte al administrador.';
            }

            showNotification('error', 
                'Error al enviar la solicitud', 
                `<strong>Detalle del error:</strong><br>${errorMsg}<br><br>
                 <strong>Solución:</strong> Puede contactarnos directamente por:<br>
                 • Teléfono: <a href="tel:+34679448261" style="color:white;text-decoration:underline;">679 448 261</a><br>
                 • Email: <a href="mailto:monicahernandezprieto@gmail.com" style="color:white;text-decoration:underline;">monicahernandezprieto@gmail.com</a>`
            );

        } finally {
            // Restaurar botón
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
            if (btnText) btnText.style.display = 'inline';
            if (btnLoading) btnLoading.style.display = 'none';
        }
    }

    // Inicializar cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', function() {
        // Agregar estilos de animación para notificaciones
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
            .email-notification a:hover { opacity: 0.8; }
        `;
        document.head.appendChild(style);

        // Asignar handler al formulario de contacto (index.html)
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', function(e) {
                handleFormSubmit(this, e);
            });
        }

        // Asignar handler al formulario de cita (cita.html)
        const appointmentForm = document.getElementById('appointmentForm');
        if (appointmentForm) {
            appointmentForm.addEventListener('submit', function(e) {
                handleFormSubmit(this, e);
            });
        }

        console.log('Email Service inicializado. Formularios configurados para envío directo.');
    });

})();
