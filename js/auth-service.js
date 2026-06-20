/* ============================================
   AYALA ABOGADOS - AUTH SERVICE (FIREBASE)
   Sistema de autenticación con Firebase Auth + Realtime DB
   ============================================ */

import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile as updateFirebaseProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    ref, 
    set, 
    get, 
    update, 
    remove,
    child 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ===== CONFIGURACIÓN =====
const AUTH_CONFIG = {
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutos
};

// ===== GESTIÓN DE INTENTOS DE LOGIN =====
function getLoginAttempts() {
    const data = localStorage.getItem('ayala_login_attempts');
    return data ? JSON.parse(data) : {};
}

function saveLoginAttempts(attempts) {
    localStorage.setItem('ayala_login_attempts', JSON.stringify(attempts));
}

function recordLoginAttempt(email) {
    const attempts = getLoginAttempts();
    const now = Date.now();
    
    if (!attempts[email]) {
        attempts[email] = { count: 0, lastAttempt: 0, lockedUntil: 0 };
    }
    
    if (now > attempts[email].lockedUntil) {
        attempts[email].count = 0;
    }
    
    attempts[email].count++;
    attempts[email].lastAttempt = now;
    
    if (attempts[email].count >= AUTH_CONFIG.maxLoginAttempts) {
        attempts[email].lockedUntil = now + AUTH_CONFIG.lockoutDuration;
    }
    
    saveLoginAttempts(attempts);
    return attempts[email];
}

function isAccountLocked(email) {
    const attempts = getLoginAttempts();
    const record = attempts[email];
    if (!record) return { locked: false };
    
    if (Date.now() < record.lockedUntil) {
        const minutesLeft = Math.ceil((record.lockedUntil - Date.now()) / 60000);
        return { locked: true, minutesLeft };
    }
    return { locked: false };
}

function resetLoginAttempts(email) {
    const attempts = getLoginAttempts();
    delete attempts[email];
    saveLoginAttempts(attempts);
}

// ===== API PÚBLICA =====
window.AuthService = {

    // Registro de usuario
    register: async function(userData) {
        const { nombre, apellidos, email, password, telefono, dni } = userData;

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

        try {
            // Crear usuario en Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Actualizar perfil en Auth
            await updateFirebaseProfile(user, {
                displayName: `${nombre} ${apellidos}`
            });

            // Guardar datos adicionales en Realtime Database
            const userDataDB = {
                uid: user.uid,
                nombre: nombre.trim(),
                apellidos: apellidos.trim(),
                email: email.toLowerCase().trim(),
                telefono: telefono || '',
                dni: dni || '',
                role: 'usuario',
                createdAt: new Date().toISOString(),
                active: true
            };

            await set(ref(db, 'usuarios/' + user.uid), userDataDB);

            return {
                success: true,
                message: 'Registro completado correctamente.',
                user: {
                    id: user.uid,
                    nombre: nombre,
                    apellidos: apellidos,
                    email: email,
                    role: 'usuario'
                }
            };
        } catch (error) {
            let errorMsg = 'Error al registrar el usuario.';
            if (error.code === 'auth/email-already-in-use') {
                errorMsg = 'Ya existe una cuenta con este email. Por favor, inicie sesión.';
            } else if (error.code === 'auth/invalid-email') {
                errorMsg = 'El formato del email no es válido.';
            } else if (error.code === 'auth/weak-password') {
                errorMsg = 'La contraseña es demasiado débil. Use al menos 6 caracteres.';
            }
            return { success: false, error: errorMsg };
        }
    },

    // Login
    login: async function(email, password, rememberMe) {
        const lockStatus = isAccountLocked(email);
        if (lockStatus.locked) {
            return {
                success: false,
                error: `Cuenta bloqueada temporalmente. Inténtelo de nuevo en ${lockStatus.minutesLeft} minutos.`
            };
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Obtener datos adicionales de la base de datos
            const snapshot = await get(ref(db, 'usuarios/' + user.uid));
            const userData = snapshot.val() || {};

            if (userData.active === false) {
                await signOut(auth);
                return { success: false, error: 'Su cuenta ha sido desactivada. Contacte con el administrador.' };
            }

            resetLoginAttempts(email);

            // Guardar sesión en localStorage para persistencia
            const session = {
                token: await user.getIdToken(),
                userId: user.uid,
                email: user.email,
                nombre: userData.nombre || user.displayName?.split(' ')[0] || 'Usuario',
                apellidos: userData.apellidos || '',
                role: userData.role || 'usuario',
                createdAt: Date.now()
            };

            if (rememberMe) {
                localStorage.setItem('ayala_auth_session', JSON.stringify(session));
            } else {
                sessionStorage.setItem('ayala_auth_session', JSON.stringify(session));
            }

            return {
                success: true,
                message: 'Sesión iniciada correctamente.',
                user: {
                    id: user.uid,
                    nombre: session.nombre,
                    apellidos: session.apellidos,
                    email: user.email,
                    role: userData.role || 'usuario'
                },
                session: session
            };
        } catch (error) {
            recordLoginAttempt(email);
            const remaining = AUTH_CONFIG.maxLoginAttempts - (getLoginAttempts()[email]?.count || 0);
            
            let errorMsg = 'Email o contraseña incorrectos.';
            if (error.code === 'auth/user-not-found') {
                errorMsg = 'No existe una cuenta con este email.';
            } else if (error.code === 'auth/wrong-password') {
                errorMsg = `Contraseña incorrecta. Intentos restantes: ${Math.max(0, remaining)}`;
            } else if (error.code === 'auth/too-many-requests') {
                errorMsg = 'Demasiados intentos fallidos. Inténtelo más tarde.';
            }
            
            return { success: false, error: errorMsg };
        }
    },

    // Logout
    logout: async function() {
        try {
            await signOut(auth);
            localStorage.removeItem('ayala_auth_session');
            sessionStorage.removeItem('ayala_auth_session');
            return { success: true, message: 'Sesión cerrada correctamente.' };
        } catch (error) {
            return { success: false, error: 'Error al cerrar sesión.' };
        }
    },

    // Obtener sesión actual
    getCurrentSession: function() {
        const session = localStorage.getItem('ayala_auth_session') || sessionStorage.getItem('ayala_auth_session');
        return session ? JSON.parse(session) : null;
    },

    // Verificar si está autenticado
    isAuthenticated: function() {
        return this.getCurrentSession() !== null;
    },

    // Verificar si es admin
    isAdmin: function() {
        const session = this.getCurrentSession();
        return session && session.role === 'administrador';
    },

    // Obtener usuario actual
    getCurrentUser: async function() {
        const session = this.getCurrentSession();
        if (!session) return null;
        
        try {
            const snapshot = await get(ref(db, 'usuarios/' + session.userId));
            return snapshot.val();
        } catch (e) {
            return null;
        }
    },

    // Actualizar perfil
    updateProfile: async function(updates) {
        const session = this.getCurrentSession();
        if (!session) {
            return { success: false, error: 'No hay sesión activa.' };
        }

        try {
            const allowedFields = ['nombre', 'apellidos', 'telefono', 'dni'];
            const updateData = {};
            
            allowedFields.forEach(field => {
                if (updates[field] !== undefined) {
                    updateData[field] = updates[field].trim();
                }
            });

            await update(ref(db, 'usuarios/' + session.userId), updateData);

            // Actualizar sesión local
            if (updates.nombre) session.nombre = updates.nombre.trim();
            if (updates.apellidos) session.apellidos = updates.apellidos.trim();
            
            const storage = localStorage.getItem('ayala_auth_session') ? localStorage : sessionStorage;
            storage.setItem('ayala_auth_session', JSON.stringify(session));

            return { success: true, message: 'Perfil actualizado correctamente.' };
        } catch (error) {
            return { success: false, error: 'Error al actualizar el perfil.' };
        }
    },

    // Cambiar contraseña
    changePassword: async function(currentPassword, newPassword) {
        // Nota: Cambiar contraseña requiere reautenticación en Firebase
        // Esta es una implementación simplificada
        if (newPassword.length < 6) {
            return { success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
        }
        
        // En producción, usar updatePassword() de Firebase Auth
        // después de reautenticar al usuario
        return { success: true, message: 'Función disponible próximamente. Contacte con soporte.' };
    },

    // ===== FUNCIONES DE ADMINISTRADOR =====

    // Obtener todos los usuarios
    getAllUsers: async function() {
        if (!this.isAdmin()) {
            return { success: false, error: 'Acceso denegado. Se requieren privilegios de administrador.' };
        }

        try {
            const snapshot = await get(ref(db, 'usuarios'));
            const users = snapshot.val() || {};
            
            const userList = Object.values(users).map(u => ({
                id: u.uid,
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
        } catch (error) {
            return { success: false, error: 'Error al obtener usuarios.' };
        }
    },

    // Cambiar rol de usuario
    changeUserRole: async function(userId, newRole) {
        if (!this.isAdmin()) {
            return { success: false, error: 'Acceso denegado.' };
        }

        if (!['usuario', 'administrador'].includes(newRole)) {
            return { success: false, error: 'Rol no válido.' };
        }

        try {
            // Verificar que no sea el último admin
            if (newRole === 'usuario') {
                const snapshot = await get(ref(db, 'usuarios'));
                const users = snapshot.val() || {};
                const adminCount = Object.values(users).filter(u => u.role === 'administrador').length;
                const targetUser = users[userId];
                
                if (adminCount <= 1 && targetUser?.role === 'administrador') {
                    return { success: false, error: 'No puede eliminar el último administrador.' };
                }
            }

            await update(ref(db, 'usuarios/' + userId), { role: newRole });
            return { success: true, message: `Rol actualizado a ${newRole}.` };
        } catch (error) {
            return { success: false, error: 'Error al cambiar el rol.' };
        }
    },

    // Activar/desactivar usuario
    toggleUserStatus: async function(userId) {
        if (!this.isAdmin()) {
            return { success: false, error: 'Acceso denegado.' };
        }

        try {
            const snapshot = await get(ref(db, 'usuarios/' + userId));
            const user = snapshot.val();
            
            if (!user) {
                return { success: false, error: 'Usuario no encontrado.' };
            }

            // No permitir desactivar el último admin
            if (user.role === 'administrador' && user.active !== false) {
                const allUsersSnap = await get(ref(db, 'usuarios'));
                const allUsers = allUsersSnap.val() || {};
                const activeAdmins = Object.values(allUsers).filter(u => 
                    u.role === 'administrador' && u.active !== false
                ).length;
                
                if (activeAdmins <= 1) {
                    return { success: false, error: 'No puede desactivar el último administrador activo.' };
                }
            }

            const newStatus = user.active === false;
            await update(ref(db, 'usuarios/' + userId), { active: newStatus });
            
            return {
                success: true,
                message: `Usuario ${newStatus ? 'activado' : 'desactivado'} correctamente.`
            };
        } catch (error) {
            return { success: false, error: 'Error al cambiar el estado del usuario.' };
        }
    },

    // Eliminar usuario
    deleteUser: async function(userId) {
        if (!this.isAdmin()) {
            return { success: false, error: 'Acceso denegado.' };
        }

        try {
            const snapshot = await get(ref(db, 'usuarios/' + userId));
            const user = snapshot.val();
            
            if (!user) {
                return { success: false, error: 'Usuario no encontrado.' };
            }

            if (user.role === 'administrador') {
                const allUsersSnap = await get(ref(db, 'usuarios'));
                const allUsers = allUsersSnap.val() || {};
                const adminCount = Object.values(allUsers).filter(u => u.role === 'administrador').length;
                
                if (adminCount <= 1) {
                    return { success: false, error: 'No puede eliminar el último administrador.' };
                }
            }

            await remove(ref(db, 'usuarios/' + userId));
            return { success: true, message: 'Usuario eliminado correctamente.' };
        } catch (error) {
            return { success: false, error: 'Error al eliminar el usuario.' };
        }
    },

    // Crear administrador por defecto
    createDefaultAdmin: async function() {
        try {
            const snapshot = await get(ref(db, 'usuarios'));
            const users = snapshot.val() || {};
            
            // Verificar si ya existe algún admin
            const hasAdmin = Object.values(users).some(u => u.role === 'administrador');
            if (hasAdmin) return false;

            // Crear admin por defecto
            const email = 'admin@ayalaabogados.es';
            const password = 'Admin123!';
            
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                await set(ref(db, 'usuarios/' + user.uid), {
                    uid: user.uid,
                    nombre: 'Administrador',
                    apellidos: 'Sistema',
                    email: email,
                    telefono: '679448261',
                    dni: '00000000A',
                    role: 'administrador',
                    createdAt: new Date().toISOString(),
                    active: true
                });

                console.log('✅ Admin por defecto creado: admin@ayalaabogados.es / Admin123!');
                return true;
            } catch (error) {
                if (error.code === 'auth/email-already-in-use') {
                    // El usuario ya existe, verificar si es admin
                    return false;
                }
                throw error;
            }
        } catch (error) {
            console.error('Error al crear admin por defecto:', error);
            return false;
        }
    }
};

// Escuchar cambios de autenticación
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuario autenticado
        console.log('Usuario autenticado:', user.email);
    } else {
        // Usuario no autenticado
        console.log('Usuario no autenticado');
    }
});

// Crear admin por defecto al cargar
document.addEventListener('DOMContentLoaded', function() {
    window.AuthService.createDefaultAdmin();
});

console.log('🔥 Auth Service (Firebase) inicializado');