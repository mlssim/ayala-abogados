/* ============================================
   AYALA ABOGADOS - AUTH SERVICE
   Sistema de autenticación completo con roles
   ============================================ */

(function() {
    'use strict';

    // ===== CONFIGURACIÓN =====
    const AUTH_CONFIG = {
        storageKey: 'ayala_auth_session',
        usersKey: 'ayala_registered_users',
        tokenExpiry: 24 * 60 * 60 * 1000, // 24 horas
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000 // 15 minutos
    };

    // ===== UTILIDADES =====
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    function hashPassword(password) {
        // Simulación de hash (en producción usar bcrypt/argon2)
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'hash_' + Math.abs(hash).toString(16) + '_' + password.length;
    }

    function generateToken() {
        return btoa(generateId() + '_' + Date.now());
    }

    function getStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    }

    function setStorage(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function removeStorage(key) {
        localStorage.removeItem(key);
    }

    // ===== GESTIÓN DE USUARIOS =====
    function getUsers() {
        return getStorage(AUTH_CONFIG.usersKey) || {};
    }

    function saveUsers(users) {
        setStorage(AUTH_CONFIG.usersKey, users);
    }

    function getUserByEmail(email) {
        const users = getUsers();
        return Object.values(users).find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    function getUserById(id) {
        const users = getUsers();
        return users[id] || null;
    }

    // ===== SESIÓN =====
    function getSession() {
        const session = getStorage(AUTH_CONFIG.storageKey);
        if (!session) return null;

        // Verificar expiración
        if (Date.now() - session.createdAt > AUTH_CONFIG.tokenExpiry) {
            removeStorage(AUTH_CONFIG.storageKey);
            return null;
        }

        return session;
    }

    function createSession(user) {
        const session = {
            token: generateToken(),
            userId: user.id,
            email: user.email,
            nombre: user.nombre,
            apellidos: user.apellidos,
            role: user.role,
            createdAt: Date.now(),
            lastActivity: Date.now()
        };
        setStorage(AUTH_CONFIG.storageKey, session);
        return session;
    }

    function clearSession() {
        removeStorage(AUTH_CONFIG.storageKey);
    }

    function updateActivity() {
        const session = getSession();
        if (session) {
            session.lastActivity = Date.now();
            setStorage(AUTH_CONFIG.storageKey, session);
        }
    }

    // ===== INTENTOS DE LOGIN (protección contra fuerza bruta) =====
    function getLoginAttempts() {
        return getStorage('ayala_login_attempts') || {};
    }

    function recordLoginAttempt(email) {
        const attempts = getLoginAttempts();
        const now = Date.now();

        if (!attempts[email]) {
            attempts[email] = { count: 0, lastAttempt: 0, lockedUntil: 0 };
        }

        // Resetear si ya pasó el tiempo de bloqueo
        if (now > attempts[email].lockedUntil) {
            attempts[email].count = 0;
        }

        attempts[email].count++;
        attempts[email].lastAttempt = now;

        // Bloquear si supera el máximo
        if (attempts[email].count >= AUTH_CONFIG.maxLoginAttempts) {
            attempts[email].lockedUntil = now + AUTH_CONFIG.lockoutDuration;
        }

        setStorage('ayala_login_attempts', attempts);
        return attempts[email];
    }

    function isAccountLocked(email) {
        const attempts = getLoginAttempts();
        const record = attempts[email];
        if (!record) return false;

        if (Date.now() < record.lockedUntil) {
            const minutesLeft = Math.ceil((record.lockedUntil - Date.now()) / 60000);
            return { locked: true, minutesLeft };
        }
        return { locked: false };
    }

    function resetLoginAttempts(email) {
        const attempts = getLoginAttempts();
        delete attempts[email];
        setStorage('ayala_login_attempts', attempts);
    }

    // ===== API PÚBLICA =====
    window.AuthService = {

        // Registro de usuario
        register: function(userData) {
            const { nombre, apellidos, email, password, telefono, dni } = userData;

            // Validaciones
            if (!nombre || !apellidos || !email || !password) {
                return { success: false, error: 'Todos los campos obligatorios deben estar completos.' };
            }

            if (password.length < 6) {
                return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return { success: false, error: 'El formato del email no es válido.' };
            }

            // Verificar si el email ya existe
            if (getUserByEmail(email)) {
                return { success: false, error: 'Ya existe una cuenta con este email. Por favor, inicie sesión.' };
            }

            // Crear usuario
            const users = getUsers();
            const userId = generateId();

            const newUser = {
                id: userId,
                nombre: nombre.trim(),
                apellidos: apellidos.trim(),
                email: email.toLowerCase().trim(),
                passwordHash: hashPassword(password),
                telefono: telefono || '',
                dni: dni || '',
                role: 'usuario', // Por defecto todos son usuarios
                createdAt: Date.now(),
                active: true
            };

            users[userId] = newUser;
            saveUsers(users);

            // Crear sesión automáticamente
            const session = createSession(newUser);

            return { 
                success: true, 
                message: 'Registro completado correctamente.',
                user: {
                    id: newUser.id,
                    nombre: newUser.nombre,
                    apellidos: newUser.apellidos,
                    email: newUser.email,
                    role: newUser.role
                },
                session: session
            };
        },

        // Login
        login: function(email, password, rememberMe) {
            // Verificar bloqueo
            const lockStatus = isAccountLocked(email);
            if (lockStatus.locked) {
                return { 
                    success: false, 
                    error: `Cuenta bloqueada temporalmente. Inténtelo de nuevo en ${lockStatus.minutesLeft} minutos.` 
                };
            }

            // Buscar usuario
            const user = getUserByEmail(email);
            if (!user) {
                recordLoginAttempt(email);
                return { success: false, error: 'Email o contraseña incorrectos.' };
            }

            // Verificar contraseña
            if (user.passwordHash !== hashPassword(password)) {
                const attempt = recordLoginAttempt(email);
                const remaining = AUTH_CONFIG.maxLoginAttempts - attempt.count;
                return { 
                    success: false, 
                    error: `Email o contraseña incorrectos. Intentos restantes: ${remaining}` 
                };
            }

            // Verificar si está activo
            if (!user.active) {
                return { success: false, error: 'Su cuenta ha sido desactivada. Contacte con el administrador.' };
            }

            // Login exitoso
            resetLoginAttempts(email);
            const session = createSession(user);

            // Si rememberMe, extender expiración
            if (rememberMe) {
                session.rememberMe = true;
                setStorage(AUTH_CONFIG.storageKey, session);
            }

            return { 
                success: true, 
                message: 'Sesión iniciada correctamente.',
                user: {
                    id: user.id,
                    nombre: user.nombre,
                    apellidos: user.apellidos,
                    email: user.email,
                    role: user.role
                },
                session: session
            };
        },

        // Logout
        logout: function() {
            clearSession();
            return { success: true, message: 'Sesión cerrada correctamente.' };
        },

        // Obtener sesión actual
        getCurrentSession: function() {
            return getSession();
        },

        // Verificar si está autenticado
        isAuthenticated: function() {
            return getSession() !== null;
        },

        // Verificar si es admin
        isAdmin: function() {
            const session = getSession();
            return session && session.role === 'administrador';
        },

        // Obtener usuario actual
        getCurrentUser: function() {
            const session = getSession();
            if (!session) return null;
            return getUserById(session.userId);
        },

        // Actualizar perfil
        updateProfile: function(updates) {
            const user = this.getCurrentUser();
            if (!user) {
                return { success: false, error: 'No hay sesión activa.' };
            }

            const users = getUsers();
            const allowedFields = ['nombre', 'apellidos', 'telefono', 'dni'];

            allowedFields.forEach(field => {
                if (updates[field] !== undefined) {
                    users[user.id][field] = updates[field].trim();
                }
            });

            // Actualizar sesión si cambió el nombre
            if (updates.nombre || updates.apellidos) {
                const session = getSession();
                if (updates.nombre) session.nombre = updates.nombre.trim();
                if (updates.apellidos) session.apellidos = updates.apellidos.trim();
                setStorage(AUTH_CONFIG.storageKey, session);
            }

            saveUsers(users);
            return { success: true, message: 'Perfil actualizado correctamente.' };
        },

        // Cambiar contraseña
        changePassword: function(currentPassword, newPassword) {
            const user = this.getCurrentUser();
            if (!user) {
                return { success: false, error: 'No hay sesión activa.' };
            }

            if (user.passwordHash !== hashPassword(currentPassword)) {
                return { success: false, error: 'La contraseña actual es incorrecta.' };
            }

            if (newPassword.length < 6) {
                return { success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
            }

            const users = getUsers();
            users[user.id].passwordHash = hashPassword(newPassword);
            saveUsers(users);

            return { success: true, message: 'Contraseña actualizada correctamente.' };
        },

        // ===== FUNCIONES DE ADMINISTRADOR =====

        // Obtener todos los usuarios (solo admin)
        getAllUsers: function() {
            if (!this.isAdmin()) {
                return { success: false, error: 'Acceso denegado. Se requieren privilegios de administrador.' };
            }

            const users = getUsers();
            const userList = Object.values(users).map(u => ({
                id: u.id,
                nombre: u.nombre,
                apellidos: u.apellidos,
                email: u.email,
                telefono: u.telefono,
                dni: u.dni,
                role: u.role,
                createdAt: u.createdAt,
                active: u.active
            }));

            return { success: true, users: userList };
        },

        // Cambiar rol de usuario (solo admin)
        changeUserRole: function(userId, newRole) {
            if (!this.isAdmin()) {
                return { success: false, error: 'Acceso denegado.' };
            }

            if (!['usuario', 'administrador'].includes(newRole)) {
                return { success: false, error: 'Rol no válido.' };
            }

            const users = getUsers();
            if (!users[userId]) {
                return { success: false, error: 'Usuario no encontrado.' };
            }

            // No permitir cambiar el rol del último admin
            if (newRole === 'usuario') {
                const adminCount = Object.values(users).filter(u => u.role === 'administrador').length;
                if (adminCount <= 1 && users[userId].role === 'administrador') {
                    return { success: false, error: 'No puede eliminar el último administrador.' };
                }
            }

            users[userId].role = newRole;
            saveUsers(users);

            return { success: true, message: `Rol actualizado a ${newRole}.` };
        },

        // Activar/desactivar usuario (solo admin)
        toggleUserStatus: function(userId) {
            if (!this.isAdmin()) {
                return { success: false, error: 'Acceso denegado.' };
            }

            const users = getUsers();
            if (!users[userId]) {
                return { success: false, error: 'Usuario no encontrado.' };
            }

            // No permitir desactivar el último admin
            if (users[userId].role === 'administrador' && users[userId].active) {
                const activeAdmins = Object.values(users).filter(u => u.role === 'administrador' && u.active).length;
                if (activeAdmins <= 1) {
                    return { success: false, error: 'No puede desactivar el último administrador activo.' };
                }
            }

            users[userId].active = !users[userId].active;
            saveUsers(users);

            return { 
                success: true, 
                message: `Usuario ${users[userId].active ? 'activado' : 'desactivado'} correctamente.` 
            };
        },

        // Eliminar usuario (solo admin)
        deleteUser: function(userId) {
            if (!this.isAdmin()) {
                return { success: false, error: 'Acceso denegado.' };
            }

            const users = getUsers();
            if (!users[userId]) {
                return { success: false, error: 'Usuario no encontrado.' };
            }

            // No permitir eliminar el último admin
            if (users[userId].role === 'administrador') {
                const adminCount = Object.values(users).filter(u => u.role === 'administrador').length;
                if (adminCount <= 1) {
                    return { success: false, error: 'No puede eliminar el último administrador.' };
                }
            }

            delete users[userId];
            saveUsers(users);

            return { success: true, message: 'Usuario eliminado correctamente.' };
        },

        // Crear usuario admin por defecto (solo si no hay usuarios)
        createDefaultAdmin: function() {
            const users = getUsers();
            const hasUsers = Object.keys(users).length > 0;

            if (!hasUsers) {
                const adminId = generateId();
                users[adminId] = {
                    id: adminId,
                    nombre: 'Administrador',
                    apellidos: 'Sistema',
                    email: 'admin@ayalaabogados.es',
                    passwordHash: hashPassword('Admin123!'),
                    telefono: '679448261',
                    dni: '00000000A',
                    role: 'administrador',
                    createdAt: Date.now(),
                    active: true
                };
                saveUsers(users);
                console.log('Admin por defecto creado: admin@ayalaabogados.es / Admin123!');
                return true;
            }
            return false;
        }
    };

    // Crear admin por defecto al cargar
    document.addEventListener('DOMContentLoaded', function() {
        window.AuthService.createDefaultAdmin();
        updateActivity();
    });

    // Actualizar actividad en interacciones
    document.addEventListener('click', updateActivity);
    document.addEventListener('keypress', updateActivity);

    console.log('Auth Service inicializado. Admin por defecto: admin@ayalaabogados.es / Admin123!');
})();
