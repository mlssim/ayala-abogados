/* ============================================
   AYALA ABOGADOS - AUTH UI
   Interfaz de autenticación: modales, menús, paneles
   ============================================ */

(function() {
    'use strict';

    // ===== UTILIDADES UI =====
    function createElement(tag, className, innerHTML) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (innerHTML) el.innerHTML = innerHTML;
        return el;
    }

    function showNotification(type, title, message) {
        const existing = document.querySelector('.auth-notification');
        if (existing) existing.remove();

        const notification = createElement('div', 'auth-notification');
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
            z-index: 10001;
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
                <i class="fas fa-times" style="font-size: 1rem; opacity: 0.7; cursor: pointer;"></i>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.4s ease forwards';
                setTimeout(() => notification.remove(), 400);
            }
        }, 6000);

        notification.addEventListener('click', function(e) {
            if (e.target.classList.contains('fa-times')) {
                this.style.animation = 'slideOutRight 0.4s ease forwards';
                setTimeout(() => this.remove(), 400);
            }
        });
    }

    // ===== MODAL DE AUTENTICACIÓN =====
    function createAuthModal() {
        const existing = document.getElementById('authModal');
        if (existing) existing.remove();

        const modal = createElement('div', 'auth-modal', '');
        modal.id = 'authModal';
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(8px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        modal.innerHTML = `
            <div class="auth-modal-content" style="
                background: var(--bg-card, #ffffff);
                border-radius: 20px;
                width: 100%;
                max-width: 480px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 25px 50px rgba(0,0,0,0.25);
                position: relative;
                transform: translateY(20px);
                transition: transform 0.3s ease;
            ">
                <button class="auth-modal-close" style="
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    border: none;
                    background: var(--bg-secondary, #f8f9fa);
                    color: var(--text-secondary, #4a5568);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1rem;
                    transition: all 0.2s;
                    z-index: 10;
                "><i class="fas fa-times"></i></button>

                <div class="auth-tabs" style="
                    display: flex;
                    border-bottom: 2px solid var(--border-light, #edf2f7);
                ">
                    <button class="auth-tab active" data-tab="login" style="
                        flex: 1;
                        padding: 16px;
                        border: none;
                        background: none;
                        font-family: 'Inter', sans-serif;
                        font-size: 0.95rem;
                        font-weight: 600;
                        color: var(--text-primary, #1a202c);
                        cursor: pointer;
                        position: relative;
                        transition: color 0.2s;
                    ">Iniciar Sesión</button>
                    <button class="auth-tab" data-tab="register" style="
                        flex: 1;
                        padding: 16px;
                        border: none;
                        background: none;
                        font-family: 'Inter', sans-serif;
                        font-size: 0.95rem;
                        font-weight: 600;
                        color: var(--text-muted, #718096);
                        cursor: pointer;
                        position: relative;
                        transition: color 0.2s;
                    ">Crear Cuenta</button>
                </div>

                <div class="auth-tab-content" style="padding: 32px;">
                    <!-- LOGIN FORM -->
                    <div id="authTab-login" class="auth-form-panel active">
                        <h3 style="font-family: var(--font-heading, 'Playfair Display'); font-size: 1.5rem; margin-bottom: 8px; color: var(--text-primary, #1a202c);">Bienvenido de nuevo</h3>
                        <p style="color: var(--text-muted, #718096); font-size: 0.9rem; margin-bottom: 24px;">Inicie sesión para acceder a su cuenta</p>

                        <form id="loginForm">
                            <div class="form-group" style="margin-bottom: 16px;">
                                <label style="display: block; font-size: 0.9rem; font-weight: 500; color: var(--text-primary, #1a202c); margin-bottom: 6px;">Email</label>
                                <input type="email" name="email" placeholder="su@email.com" required style="
                                    width: 100%;
                                    padding: 12px 14px;
                                    border: 1px solid var(--border-color, #e2e8f0);
                                    border-radius: 10px;
                                    background: var(--bg-primary, #ffffff);
                                    color: var(--text-primary, #1a202c);
                                    font-family: 'Inter', sans-serif;
                                    font-size: 0.95rem;
                                    transition: all 0.2s;
                                ">
                            </div>
                            <div class="form-group" style="margin-bottom: 16px;">
                                <label style="display: block; font-size: 0.9rem; font-weight: 500; color: var(--text-primary, #1a202c); margin-bottom: 6px;">Contraseña</label>
                                <div style="position: relative;">
                                    <input type="password" name="password" placeholder="Su contraseña" required style="
                                        width: 100%;
                                        padding: 12px 14px;
                                        padding-right: 44px;
                                        border: 1px solid var(--border-color, #e2e8f0);
                                        border-radius: 10px;
                                        background: var(--bg-primary, #ffffff);
                                        color: var(--text-primary, #1a202c);
                                        font-family: 'Inter', sans-serif;
                                        font-size: 0.95rem;
                                        transition: all 0.2s;
                                    ">
                                    <button type="button" class="toggle-password" style="
                                        position: absolute;
                                        right: 12px;
                                        top: 50%;
                                        transform: translateY(-50%);
                                        background: none;
                                        border: none;
                                        color: var(--text-muted, #718096);
                                        cursor: pointer;
                                        font-size: 0.9rem;
                                    "><i class="fas fa-eye"></i></button>
                                </div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-muted, #718096); cursor: pointer;">
                                    <input type="checkbox" name="remember" style="accent-color: var(--accent-gold, #c9a227);">
                                    Recordarme
                                </label>
                            </div>
                            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 1rem;">
                                <span class="btn-text"><i class="fas fa-sign-in-alt"></i> Iniciar Sesión</span>
                                <span class="btn-loading" style="display:none;"><i class="fas fa-spinner fa-spin"></i> Entrando...</span>
                            </button>
                        </form>

                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-light, #edf2f7); text-align: center;">
                            <p style="font-size: 0.85rem; color: var(--text-muted, #718096);">
                                ¿No tiene cuenta? <a href="#" class="auth-switch-tab" data-target="register" style="color: var(--accent-gold, #c9a227); font-weight: 600;">Regístrese aquí</a>
                            </p>
                        </div>
                    </div>

                    <!-- REGISTER FORM -->
                    <div id="authTab-register" class="auth-form-panel" style="display: none;">
                        <h3 style="font-family: var(--font-heading, 'Playfair Display'); font-size: 1.5rem; margin-bottom: 8px; color: var(--text-primary, #1a202c);">Crear Cuenta</h3>
                        <p style="color: var(--text-muted, #718096); font-size: 0.9rem; margin-bottom: 24px;">Regístrese para acceder a nuestros servicios</p>

                        <form id="registerForm">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div class="form-group" style="margin-bottom: 12px;">
                                    <label style="display: block; font-size: 0.85rem; font-weight: 500; color: var(--text-primary, #1a202c); margin-bottom: 4px;">Nombre <span style="color: #e53e3e;">*</span></label>
                                    <input type="text" name="nombre" placeholder="Nombre" required style="
                                        width: 100%;
                                        padding: 10px 12px;
                                        border: 1px solid var(--border-color, #e2e8f0);
                                        border-radius: 10px;
                                        background: var(--bg-primary, #ffffff);
                                        color: var(--text-primary, #1a202c);
                                        font-family: 'Inter', sans-serif;
                                        font-size: 0.9rem;
                                    ">
                                </div>
                                <div class="form-group" style="margin-bottom: 12px;">
                                    <label style="display: block; font-size: 0.85rem; font-weight: 500; color: var(--text-primary, #1a202c); margin-bottom: 4px;">Apellidos <span style="color: #e53e3e;">*</span></label>
                                    <input type="text" name="apellidos" placeholder="Apellidos" required style="
                                        width: 100%;
                                        padding: 10px 12px;
                                        border: 1px solid var(--border-color, #e2e8f0);
                                        border-radius: 10px;
                                        background: var(--bg-primary, #ffffff);
                                        color: var(--text-primary, #1a202c);
                                        font-family: 'Inter', sans-serif;
                                        font-size: 0.9rem;
                                    ">
                                </div>
                            </div>
                            <div class="form-group" style="margin-bottom: 12px;">
                                <label style="display: block; font-size: 0.85rem; font-weight: 500; color: var(--text-primary, #1a202c); margin-bottom: 4px;">Email <span style="color: #e53e3e;">*</span></label>
                                <input type="email" name="email" placeholder="su@email.com" required style="
                                    width: 100%;
                                    padding: 10px 12px;
                                    border: 1px solid var(--border-color, #e2e8f0);
                                    border-radius: 10px;
                                    background: var(--bg-primary, #ffffff);
                                    color: var(--text-primary, #1a202c);
                                    font-family: 'Inter', sans-serif;
                                    font-size: 0.9rem;
                                ">
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div class="form-group" style="margin-bottom: 12px;">
                                    <label style="display: block; font-size: 0.85rem; font-weight: 500; color: var(--text-primary, #1a202c); margin-bottom: 4px;">Teléfono</label>
                                    <input type="tel" name="telefono" placeholder="679 448 261" style="
                                        width: 100%;
                                        padding: 10px 12px;
                                        border: 1px solid var(--border-color, #e2e8f0);
                                        border-radius: 10px;
                                        background: var(--bg-primary, #ffffff);
                                        color: var(--text-primary, #1a202c);
                                        font-family: 'Inter', sans-serif;
                                        font-size: 0.9rem;
                                    ">
                                </div>
                                <div class="form-group" style="margin-bottom: 12px;">
                                    <label style="display: block; font-size: 0.85rem; font-weight: 500; color: var(--text-primary, #1a202c); margin-bottom: 4px;">DNI/NIE</label>
                                    <input type="text" name="dni" placeholder="12345678A" style="
                                        width: 100%;
                                        padding: 10px 12px;
                                        border: 1px solid var(--border-color, #e2e8f0);
                                        border-radius: 10px;
                                        background: var(--bg-primary, #ffffff);
                                        color: var(--text-primary, #1a202c);
                                        font-family: 'Inter', sans-serif;
                                        font-size: 0.9rem;
                                    ">
                                </div>
                            </div>
                            <div class="form-group" style="margin-bottom: 12px;">
                                <label style="display: block; font-size: 0.85rem; font-weight: 500; color: var(--text-primary, #1a202c); margin-bottom: 4px;">Contraseña <span style="color: #e53e3e;">*</span></label>
                                <div style="position: relative;">
                                    <input type="password" name="password" placeholder="Mínimo 6 caracteres" required minlength="6" style="
                                        width: 100%;
                                        padding: 10px 12px;
                                        padding-right: 44px;
                                        border: 1px solid var(--border-color, #e2e8f0);
                                        border-radius: 10px;
                                        background: var(--bg-primary, #ffffff);
                                        color: var(--text-primary, #1a202c);
                                        font-family: 'Inter', sans-serif;
                                        font-size: 0.9rem;
                                    ">
                                    <button type="button" class="toggle-password" style="
                                        position: absolute;
                                        right: 12px;
                                        top: 50%;
                                        transform: translateY(-50%);
                                        background: none;
                                        border: none;
                                        color: var(--text-muted, #718096);
                                        cursor: pointer;
                                        font-size: 0.9rem;
                                    "><i class="fas fa-eye"></i></button>
                                </div>
                            </div>
                            <div class="form-group" style="margin-bottom: 16px;">
                                <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 0.8rem; color: var(--text-muted, #718096); cursor: pointer;">
                                    <input type="checkbox" name="terms" required style="margin-top: 2px; accent-color: var(--accent-gold, #c9a227);">
                                    <span>Acepto la <a href="pages/privacidad.html" style="color: var(--accent-gold, #c9a227);">política de privacidad</a> y los términos de uso.</span>
                                </label>
                            </div>
                            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 1rem;">
                                <span class="btn-text"><i class="fas fa-user-plus"></i> Crear Cuenta</span>
                                <span class="btn-loading" style="display:none;"><i class="fas fa-spinner fa-spin"></i> Creando...</span>
                            </button>
                        </form>

                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-light, #edf2f7); text-align: center;">
                            <p style="font-size: 0.85rem; color: var(--text-muted, #718096);">
                                ¿Ya tiene cuenta? <a href="#" class="auth-switch-tab" data-target="login" style="color: var(--accent-gold, #c9a227); font-weight: 600;">Inicie sesión</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            modal.querySelector('.auth-modal-content').style.transform = 'translateY(0)';
        });

        setupModalEvents(modal);

        return modal;
    }

    function setupModalEvents(modal) {
        modal.querySelector('.auth-modal-close').addEventListener('click', closeAuthModal);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeAuthModal();
        });

        modal.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                const target = this.dataset.tab;
                switchAuthTab(target);
            });
        });

        modal.querySelectorAll('.auth-switch-tab').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                switchAuthTab(this.dataset.target);
            });
        });

        modal.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', function() {
                const input = this.parentElement.querySelector('input');
                const icon = this.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });

        // Login form
        const loginForm = modal.querySelector('#loginForm');
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const email = formData.get('email');
            const password = formData.get('password');
            const remember = formData.get('remember') === 'on';

            const submitBtn = this.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoading = submitBtn.querySelector('.btn-loading');

            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
            submitBtn.disabled = true;

            const result = await window.AuthService.login(email, password, remember);

            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;

            if (result.success) {
                showNotification('success', '¡Bienvenido!', `Hola ${result.user.nombre}, ha iniciado sesión correctamente.`);
                closeAuthModal();
                // Forzar actualización de la UI
                setTimeout(() => updateAuthUI(), 300);
            } else {
                showNotification('error', 'Error de acceso', result.error);
            }
        });

        // Register form
        const registerForm = modal.querySelector('#registerForm');
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);

            const userData = {
                nombre: formData.get('nombre'),
                apellidos: formData.get('apellidos'),
                email: formData.get('email'),
                password: formData.get('password'),
                telefono: formData.get('telefono'),
                dni: formData.get('dni')
            };

            const submitBtn = this.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoading = submitBtn.querySelector('.btn-loading');

            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
            submitBtn.disabled = true;

            const result = await window.AuthService.register(userData);

            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;

            if (result.success) {
                showNotification('success', '¡Registro completado!', `Bienvenido ${result.user.nombre}, su cuenta ha sido creada.`);
                closeAuthModal();
                // Forzar actualización de la UI
                setTimeout(() => updateAuthUI(), 300);
            } else {
                showNotification('error', 'Error en el registro', result.error);
            }
        });
    }

    function switchAuthTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
            t.style.color = t.dataset.tab === tab ? 'var(--text-primary, #1a202c)' : 'var(--text-muted, #718096)';
        });
        document.querySelectorAll('.auth-form-panel').forEach(p => {
            p.style.display = p.id === 'authTab-' + tab ? 'block' : 'none';
        });
    }

    function closeAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.opacity = '0';
            modal.querySelector('.auth-modal-content').style.transform = 'translateY(20px)';
            setTimeout(() => modal.remove(), 300);
        }
    }

    // ===== MENÚ DE USUARIO =====
    function createUserMenu() {
        const session = window.AuthService.getCurrentSession();
        if (!session) return null;

        const menu = createElement('div', 'auth-user-menu', '');
        menu.id = 'authUserMenu';
        menu.style.cssText = `
            position: relative;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        const roleBadge = session.role === 'administrador' 
            ? '<span style="background: var(--accent-gold, #c9a227); color: #1a202c; font-size: 0.65rem; padding: 2px 8px; border-radius: 10px; font-weight: 700; text-transform: uppercase;">Admin</span>' 
            : '';

        const roleMap = {
            'administrador': 'Administrador',
            'editor': 'Abogado',
            'usuario': 'Cliente'
        };
        const roleDisplay = roleMap[session.role] || 'Cliente';

        menu.innerHTML = `
            <button class="auth-user-toggle" id="authUserToggle" style="
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                border-radius: 30px;
                border: 1px solid var(--border-color, #e2e8f0);
                background: var(--bg-secondary, #f8f9fa);
                color: var(--text-primary, #1a202c);
                font-family: 'Inter', sans-serif;
                font-size: 0.9rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            ">
                <div style="
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: var(--accent-navy, #1a365d);
                    color: var(--accent-gold, #c9a227);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.85rem;
                    font-weight: 700;
                ">${session.nombre.charAt(0)}${session.apellidos.charAt(0)}</div>
                <span style="display: flex; align-items: center; gap: 6px;">
                    ${session.nombre}
                    ${roleBadge}
                    <i class="fas fa-chevron-down" style="font-size: 0.7rem; opacity: 0.6;"></i>
                </span>
            </button>

            <div class="auth-user-dropdown" id="authUserDropdown" style="
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                min-width: 220px;
                background: var(--bg-card, #ffffff);
                border: 1px solid var(--border-light, #edf2f7);
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                padding: 8px 0;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.2s ease;
                z-index: 1000;
            ">
                <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-light, #edf2f7);">
                    <div style="font-weight: 600; color: var(--text-primary, #1a202c); font-size: 0.9rem;">${session.nombre} ${session.apellidos}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted, #718096);">${session.email}</div>
                    <div style="font-size: 0.75rem; color: var(--accent-gold, #c9a227); margin-top: 2px;">${roleDisplay}</div>
                </div>
                <a href="pages/perfil.html" style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; color: var(--text-secondary, #4a5568); font-size: 0.9rem; transition: all 0.15s; text-decoration: none;">
                    <i class="fas fa-user" style="width: 18px; color: var(--accent-gold, #c9a227);"></i> Mi Perfil
                </a>
                ${session.role === 'administrador' ? `
                <a href="admin/index.html" style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; color: var(--text-secondary, #4a5568); font-size: 0.9rem; transition: all 0.15s; text-decoration: none;">
                    <i class="fas fa-cog" style="width: 18px; color: var(--accent-gold, #c9a227);"></i> Panel Admin
                </a>
                ` : ''}
                <div style="border-top: 1px solid var(--border-light, #edf2f7); margin: 4px 0;"></div>
                <button class="auth-logout-btn" id="authLogoutBtn" style="
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    width: 100%;
                    padding: 10px 16px;
                    background: none;
                    border: none;
                    color: #e53e3e;
                    font-family: 'Inter', sans-serif;
                    font-size: 0.9rem;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.15s;
                ">
                    <i class="fas fa-sign-out-alt" style="width: 18px;"></i> Cerrar Sesión
                </button>
            </div>
        `;

        // Eventos del menú
        const toggle = menu.querySelector('#authUserToggle');
        const dropdown = menu.querySelector('#authUserDropdown');

        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            const isOpen = dropdown.style.visibility === 'visible';
            if (isOpen) {
                dropdown.style.opacity = '0';
                dropdown.style.visibility = 'hidden';
                dropdown.style.transform = 'translateY(-10px)';
            } else {
                dropdown.style.opacity = '1';
                dropdown.style.visibility = 'visible';
                dropdown.style.transform = 'translateY(0)';
            }
        });

        // Cerrar dropdown al hacer clic fuera
        document.addEventListener('click', function(e) {
            if (!menu.contains(e.target)) {
                dropdown.style.opacity = '0';
                dropdown.style.visibility = 'hidden';
                dropdown.style.transform = 'translateY(-10px)';
            }
        });

        // Cerrar sesión - CORREGIDO
        menu.querySelector('#authLogoutBtn').addEventListener('click', function() {
            window.AuthService.logout();
            showNotification('success', 'Sesión cerrada', 'Ha cerrado sesión correctamente.');
            // Actualizar UI inmediatamente
            updateAuthUI();
        });

        return menu;
    }

    // ===== BOTÓN DE LOGIN =====
    function createLoginButton() {
        const btn = createElement('button', 'auth-login-btn', '');
        btn.id = 'authLoginBtn';
        btn.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border-radius: 30px;
            border: 2px solid var(--accent-gold, #c9a227);
            background: transparent;
            color: var(--accent-gold, #c9a227);
            font-family: 'Inter', sans-serif;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        `;
        btn.innerHTML = '<i class="fas fa-user"></i> Acceder';

        btn.addEventListener('mouseenter', function() {
            this.style.background = 'var(--accent-gold, #c9a227)';
            this.style.color = '#1a202c';
        });
        btn.addEventListener('mouseleave', function() {
            this.style.background = 'transparent';
            this.style.color = 'var(--accent-gold, #c9a227)';
        });

        btn.addEventListener('click', function() {
            createAuthModal();
        });

        return btn;
    }

    // ===== ACTUALIZAR UI DE AUTENTICACIÓN =====
    function updateAuthUI() {
        const container = document.getElementById('authContainer');
        if (!container) return;

        // Limpiar el contenedor manteniendo el mismo elemento
        container.innerHTML = '';

        // Verificar autenticación
        const isAuth = window.AuthService.isAuthenticated();
        const session = window.AuthService.getCurrentSession();

        if (isAuth && session) {
            const userMenu = createUserMenu();
            if (userMenu) container.appendChild(userMenu);
        } else {
            container.appendChild(createLoginButton());
        }
    }

    // ===== INICIALIZACIÓN =====
    function initAuthUI() {
        const headerActions = document.querySelector('.header-actions');
        if (!headerActions) return;

        // Verificar si ya existe el contenedor
        let authContainer = document.getElementById('authContainer');
        if (!authContainer) {
            authContainer = createElement('div', '');
            authContainer.id = 'authContainer';
            authContainer.style.cssText = 'display: flex; align-items: center;';
            
            const menuToggle = headerActions.querySelector('.menu-toggle');
            if (menuToggle) {
                headerActions.insertBefore(authContainer, menuToggle);
            } else {
                headerActions.appendChild(authContainer);
            }
        }

        // Actualizar UI
        updateAuthUI();

        // Escuchar cambios en la autenticación
        if (window.AuthService && window.AuthService.onAuthChange) {
            window.AuthService.onAuthChange(() => {
                updateAuthUI();
            });
        }

        addAuthStyles();
    }

    function addAuthStyles() {
        const style = createElement('style', '');
        style.textContent = `
            .auth-modal-content::-webkit-scrollbar { width: 6px; }
            .auth-modal-content::-webkit-scrollbar-track { background: transparent; }
            .auth-modal-content::-webkit-scrollbar-thumb { background: var(--border-color, #e2e8f0); border-radius: 3px; }

            .auth-tab.active::after {
                content: '';
                position: absolute;
                bottom: -2px;
                left: 20%;
                width: 60%;
                height: 2px;
                background: var(--accent-gold, #c9a227);
            }

            .auth-user-dropdown a:hover,
            .auth-user-dropdown button:hover {
                background: var(--bg-secondary, #f8f9fa);
                color: var(--text-primary, #1a202c) !important;
            }

            @keyframes slideInRight {
                from { transform: translateX(120%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(120%); opacity: 0; }
            }

            .auth-login-btn:hover {
                background: var(--accent-gold, #c9a227) !important;
                color: #1a202c !important;
            }

            @media (max-width: 768px) {
                .auth-login-btn { 
                    padding: 8px 12px !important;
                    font-size: 0.8rem !important;
                }
                .auth-login-btn i { font-size: 0.9rem; }
                .auth-user-toggle { padding: 6px 12px !important; font-size: 0.8rem !important; }
                .auth-user-toggle div { width: 28px !important; height: 28px !important; font-size: 0.7rem !important; }
                .auth-user-toggle span { display: none; }
            }
        `;
        document.head.appendChild(style);
    }

    // CORREGIDO: Esperar a que AuthService esté disponible
    function delayedInit() {
        // Esperar a que AuthService esté disponible
        const checkAuthService = setInterval(() => {
            if (window.AuthService) {
                clearInterval(checkAuthService);
                initAuthUI();
                console.log('Auth UI inicializado correctamente');
            }
        }, 100);

        // Timeout por si acaso
        setTimeout(() => {
            clearInterval(checkAuthService);
            if (!window.AuthService) {
                console.warn('AuthService no disponible después de 3 segundos');
                initAuthUI();
            }
        }, 3000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', delayedInit);
    } else {
        delayedInit();
    }

    // Exponer funciones globales
    window.AuthUI = {
        openLogin: function() { createAuthModal(); switchAuthTab('login'); },
        openRegister: function() { createAuthModal(); switchAuthTab('register'); },
        closeModal: closeAuthModal,
        updateUI: updateAuthUI,
        showNotification: showNotification,
        init: initAuthUI
    };

    console.log('Auth UI cargado');
})();