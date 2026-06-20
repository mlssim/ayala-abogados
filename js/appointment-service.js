/* ============================================
   AYALA ABOGADOS - APPOINTMENT SERVICE (FIREBASE)
   Gestión de citas con Realtime Database
   ============================================ */

import { db } from './firebase-config.js';
import { 
    ref, 
    push, 
    set, 
    get, 
    update, 
    remove,
    onValue,
    query,
    orderByChild,
    equalTo
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ===== FUNCIONES PÚBLICAS =====
window.AppointmentService = {

    // Crear nueva cita
    createAppointment: async function(appointmentData) {
        try {
            const citaRef = push(ref(db, 'citas'));
            const citaId = citaRef.key;

            const newAppointment = {
                id: citaId,
                ...appointmentData,
                status: 'pendiente',
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString()
            };

            await set(citaRef, newAppointment);

            // Crear notificación para admins
            await this.createNotification({
                type: 'nueva_cita',
                title: 'Nueva cita solicitada',
                message: `${appointmentData.nombre} ha solicitado una cita para ${appointmentData.tipo_consulta}`,
                citaId: citaId,
                fecha: new Date().toISOString(),
                leida: false
            });

            return { success: true, id: citaId, message: 'Cita creada correctamente.' };
        } catch (error) {
            console.error('Error al crear cita:', error);
            return { success: false, error: 'Error al crear la cita. Inténtelo de nuevo.' };
        }
    },

    // Obtener todas las citas
    getAllAppointments: async function() {
        try {
            const snapshot = await get(ref(db, 'citas'));
            const citas = snapshot.val() || {};
            return { 
                success: true, 
                appointments: Object.values(citas).sort((a, b) => 
                    new Date(b.fechaCreacion) - new Date(a.fechaCreacion)
                )
            };
        } catch (error) {
            return { success: false, error: 'Error al obtener citas.' };
        }
    },

    // Obtener citas por usuario
    getUserAppointments: async function(userId) {
        try {
            const snapshot = await get(ref(db, 'citas'));
            const citas = snapshot.val() || {};
            const userAppointments = Object.values(citas).filter(c => c.usuarioId === userId);
            
            return { 
                success: true, 
                appointments: userAppointments.sort((a, b) => 
                    new Date(b.fechaCreacion) - new Date(a.fechaCreacion)
                )
            };
        } catch (error) {
            return { success: false, error: 'Error al obtener citas del usuario.' };
        }
    },

    // Obtener cita por ID
    getAppointmentById: async function(citaId) {
        try {
            const snapshot = await get(ref(db, 'citas/' + citaId));
            if (!snapshot.exists()) {
                return { success: false, error: 'Cita no encontrada.' };
            }
            return { success: true, appointment: snapshot.val() };
        } catch (error) {
            return { success: false, error: 'Error al obtener la cita.' };
        }
    },

    // Actualizar cita
    updateAppointment: async function(citaId, updates) {
        try {
            const updateData = {
                ...updates,
                fechaActualizacion: new Date().toISOString()
            };

            await update(ref(db, 'citas/' + citaId), updateData);

            // Si cambió el estado, crear notificación
            if (updates.status) {
                const citaSnap = await get(ref(db, 'citas/' + citaId));
                const cita = citaSnap.val();
                
                if (cita && cita.email) {
                    // Aquí podrías enviar email al cliente
                    console.log(`Estado de cita ${citaId} cambiado a: ${updates.status}`);
                }
            }

            return { success: true, message: 'Cita actualizada correctamente.' };
        } catch (error) {
            return { success: false, error: 'Error al actualizar la cita.' };
        }
    },

    // Eliminar cita
    deleteAppointment: async function(citaId) {
        try {
            await remove(ref(db, 'citas/' + citaId));
            return { success: true, message: 'Cita eliminada correctamente.' };
        } catch (error) {
            return { success: false, error: 'Error al eliminar la cita.' };
        }
    },

    // Escuchar citas en tiempo real
    onAppointmentsChange: function(callback) {
        const citasRef = ref(db, 'citas');
        return onValue(citasRef, (snapshot) => {
            const citas = snapshot.val() || {};
            callback(Object.values(citas));
        });
    },

    // Crear notificación
    createNotification: async function(notificationData) {
        try {
            const notifRef = push(ref(db, 'notificaciones'));
            await set(notifRef, {
                id: notifRef.key,
                ...notificationData
            });
            return { success: true };
        } catch (error) {
            console.error('Error al crear notificación:', error);
            return { success: false };
        }
    },

    // Obtener notificaciones
    getNotifications: async function() {
        try {
            const snapshot = await get(ref(db, 'notificaciones'));
            const notifs = snapshot.val() || {};
            return { 
                success: true, 
                notifications: Object.values(notifs).sort((a, b) => 
                    new Date(b.fecha) - new Date(a.fecha)
                )
            };
        } catch (error) {
            return { success: false, error: 'Error al obtener notificaciones.' };
        }
    },

    // Marcar notificación como leída
    markNotificationRead: async function(notifId) {
        try {
            await update(ref(db, 'notificaciones/' + notifId), { leida: true });
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    }
};

console.log('📅 Appointment Service (Firebase) inicializado');