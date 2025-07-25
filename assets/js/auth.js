// assets/js/auth.js
import { auth } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

export const AuthService = {
    /**
     * Registra un nuevo usuario con email y contraseña.
     * @param {string} email
     * @param {string} password
     * @returns {Promise<UserCredential>}
     */
    register: async (email, password) => {
        return await createUserWithEmailAndPassword(auth, email, password);
    },

    /**
     * Inicia sesión con email y contraseña.
     * @param {string} email
     * @param {string} password
     * @returns {Promise<UserCredential>}
     */
    login: async (email, password) => {
        return await signInWithEmailAndPassword(auth, email, password);
    },

    /**
     * Cierra la sesión del usuario actual.
     * @returns {Promise<void>}
     */
    logout: async () => {
        return await signOut(auth);
    },

    /**
     * Envía un correo electrónico de restablecimiento de contraseña.
     * @param {string} email
     * @returns {Promise<void>}
     */
    sendPasswordReset: async (email) => {
        return await sendPasswordResetEmail(auth, email);
    },

    /**
     * Actualiza el perfil de un usuario (nombre, foto de perfil, etc.).
     * @param {Object} user - Objeto de usuario de Firebase.
     * @param {Object} profileUpdates - Objeto con los campos a actualizar (e.g., { displayName: 'Nuevo Nombre' }).
     * @returns {Promise<void>}
     */
    updateUserProfile: async (user, profileUpdates) => {
        return await updateProfile(user, profileUpdates);
    },

    /**
     * Envía un correo de verificación al usuario actual.
     * @param {Object} user - Objeto de usuario de Firebase.
     * @returns {Promise<void>}
     */
    sendEmailVerification: async (user) => {
        return await sendEmailVerification(user);
    },

    /**
     * Observador del estado de autenticación.
     * @param {function(Object)} callback - Función a ejecutar cuando el estado de autenticación cambia.
     * @returns {function()} - Función para cancelar la suscripción.
     */
    onAuthStateChanged: (callback) => {
        return auth.onAuthStateChanged(callback);
    },

    /**
     * Obtiene el usuario actualmente autenticado.
     * @returns {Object | null}
     */
    getCurrentUser: () => {
        return auth.currentUser;
    }
};
