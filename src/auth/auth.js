import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification // Importar sendEmailVerification
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"; [cite: 2]
import { app } from "../firebase-config.js"; [cite: 2]
// Path is correct as firebase-config.js is in src/
import { CartService } from "../cart/cart.js"; [cite: 3]
// CORRECCIÓN: Cambiado a cart.js

// Inicialización de servicios
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider(); [cite: 4]
// Configuración adicional del proveedor Google
googleProvider.setCustomParameters({
  prompt: 'select_account',
  login_hint: 'email'
}); [cite: 5]
export const AuthService = {
  // ==================== AUTENTICACIÓN BÁSICA ====================
  /**
   * Inicia sesión con email y contraseña
   * @param {string} email
   * @param {string} password
   * @returns {Promise<UserCredential>}
   */
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password); [cite: 6]
      // Actualizar lastLogin en Firestore
      await this._updateUserLoginData(userCredential.user.uid); [cite: 7]
      // Migrar datos de invitado
      await migrateGuestData(userCredential.user.uid); [cite: 8]

      return userCredential; [cite: 8]
    } catch (error) {
      console.error("Error en login:", error); [cite: 9]
      throw handleAuthError(error); [cite: 9]
    }
  },

  /**
   * Cierra la sesión actual
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      await signOut(auth); [cite: 10]
    } catch (error) {
      console.error("Error en logout:", error); [cite: 11]
      throw error; [cite: 11]
    }
  },

  // ==================== REGISTRO ====================
  /**
   * Registra un nuevo usuario
   * @param {string} email
   * @param {string} password
   * @param {Object} userData
   * @returns {Promise<UserCredential>}
   */
  async register(email, password, userData) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password); [cite: 12]
      // Actualizar perfil con nombre
      if (userData.name) {
        await updateProfile(userCredential.user, {
          displayName: userData.name
        }); [cite: 13]
      }

      // Crear documento en Firestore
      await this._createUserProfile(userCredential.user, userData); [cite: 14]
      // Migrar datos de invitado
      await migrateGuestData(userCredential.user.uid); [cite: 15]

      return userCredential; [cite: 15]
    } catch (error) {
      console.error("Error en registro:", error); [cite: 16]
      throw handleAuthError(error); [cite: 16]
    }
  },

  /**
   * Envía un correo de verificación al usuario
   * @param {User} user - El objeto User de Firebase
   * @returns {Promise<void>}
   */
  async sendEmailVerification(user) {
    try {
      await sendEmailVerification(user);
    } catch (error) {
      console.error("Error enviando correo de verificación:", error);
      throw handleAuthError(error);
    }
  },

  // ==================== AUTENTICACIÓN SOCIAL ====================
  /**
   * Inicia sesión con Google
   * @returns {Promise<UserCredential>}
   */
  async loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider); [cite: 17]
      // Verifica si es un nuevo usuario
      if (result._tokenResponse?.isNewUser) {
        await this._createUserProfile(result.user, {
          name: result.user.displayName,
          photoURL: result.user.photoURL
        }); [cite: 18]
      } else {
        // Actualizar lastLogin para usuarios existentes
        await this._updateUserLoginData(result.user.uid); [cite: 19]
      }

      // Migrar datos de invitado
      await migrateGuestData(result.user.uid); [cite: 20]

      return result; [cite: 20]
    } catch (error) {
      console.error("Error en Google Sign-In:", error); [cite: 21]
      throw handleAuthError(error); [cite: 21]
    }
  },

  // ==================== GESTIÓN DE SESIÓN ====================
  /**
   * Obtiene el usuario actual
   * @returns {User|null}
   */
  getCurrentUser() {
    return auth.currentUser; [cite: 22]
  },

  /**
   * Escucha cambios en el estado de autenticación
   * @param {(user: User|null) => void} callback
   * @returns {() => void} Función para desuscribirse
   */
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Obtener datos adicionales de Firestore
          const userProfile = await this.getUserProfile(user.uid); [cite: 23]

          callback({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            profile: userProfile
          }); [cite: 24]
        } catch (error) {
          console.error("Error cargando perfil:", error); [cite: 25]
          callback({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified:
              user.emailVerified [cite: 26]
          }); [cite: 26]
        }
      } else {
        callback(null); [cite: 27]
      }
    });
  },

  // ==================== GESTIÓN DE CONTRASEÑA ====================
  /**
   * Cambia la contraseña del usuario actual
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<void>}
   */
  async changePassword(currentPassword, newPassword) {
    const user = auth.currentUser; [cite: 28]
    if (!user || !user.email) throw new Error("Usuario no autenticado"); [cite: 29]

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword); [cite: 29]
      await reauthenticateWithCredential(user, credential); [cite: 30]
      await updatePassword(user, newPassword); [cite: 30]
    } catch (error) {
      console.error("Error cambiando contraseña:", error); [cite: 30]
      throw handleAuthError(error); [cite: 31]
    }
  },

  // ==================== UTILIDADES ====================
  /**
   * Obtiene el perfil del usuario desde Firestore
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  async getUserProfile(userId) {
    try {
      const userDoc = await getDoc(doc(db, "users", userId)); [cite: 31]
      return userDoc.exists() ? userDoc.data() : null; [cite: 32]
    } catch (error) {
      console.error("Error obteniendo perfil:", error); [cite: 32]
      throw error; [cite: 33]
    }
  },

  /**
   * Actualiza el perfil del usuario
   * @param {string} userId
   * @param {Object} profileData
   * @returns {Promise<void>}
   */
  async updateUserProfile(userId, profileData) {
    try {
      await setDoc(doc(db, "users", userId), profileData, { merge: true }); [cite: 33]
      // Actualizar también en auth si hay campos relevantes
      const user = auth.currentUser; [cite: 34]
      if (user && user.uid === userId) {
        const updates = {}; [cite: 35]
        if (profileData.name) updates.displayName = profileData.name; [cite: 36]
        if (profileData.photoURL) updates.photoURL = profileData.photoURL; [cite: 36]
        if (Object.keys(updates).length > 0) {
          await updateProfile(user, updates); [cite: 37]
        }
      }
    } catch (error) {
      console.error("Error actualizando perfil:", error); [cite: 38]
      throw error; [cite: 39]
    }
  },

  // ==================== MÉTODOS PRIVADOS ====================
  /**
   * Crea el perfil del usuario en Firestore
   * @private
   */
  async _createUserProfile(user, additionalData = {}) {
    await setDoc(doc(db, "users", user.uid), {
      name: user.displayName || additionalData.name,
      email: user.email,
      photoURL: user.photoURL || additionalData.photoURL || null,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      role: "customer",
      ...additionalData
    }); [cite: 40]
  },

  /**
   * Actualiza los datos de login del usuario
   * @private
   */
  async _updateUserLoginData(userId) {
    await setDoc(doc(db, "users", userId), {
      lastLogin: serverTimestamp()
    }, { merge: true }); [cite: 41]
  }
};

// ==================== FUNCIONES INTERNAS ====================
/**
 * Migra datos de invitado al autenticarse
 * @param {string} userId
 */
async function migrateGuestData(userId) {
  try {
    // CORRECCIÓN: CartService.migrateGuestCart es una función de CartService
    await CartService.migrateGuestCart(userId); [cite: 42]
    // Aquí puedes añadir más migraciones (ej: favoritos, historial)
  } catch (error) {
    console.error("Error migrando datos:", error); [cite: 42]
  }
}

/**
 * Maneja errores de autenticación
 * @param {Error} error
 * @returns {Error}
 */
function handleAuthError(error) {
  const errorMap = {
    // Errores comunes de Firebase Auth
    "auth/invalid-email": "El correo electrónico no es válido",
    "auth/user-disabled": "Esta cuenta ha sido deshabilitada",
    "auth/user-not-found": "No existe una cuenta con este correo",
    "auth/wrong-password": "Contraseña incorrecta",
    "auth/email-already-in-use": "Este correo ya está registrado",
    "auth/operation-not-allowed": "Operación no permitida",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres",
    "auth/too-many-requests": "Demasiados intentos. Intenta más tarde", [cite: 43]
    "auth/account-exists-with-different-credential": "Ya existe una cuenta con este email",
    "auth/popup-closed-by-user": "La ventana de autenticación fue cerrada",
    "auth/network-request-failed": "Error de conexión. Verifica tu internet",

    // Errores personalizados
    "auth/requires-recent-login": "Debes iniciar sesión nuevamente para realizar esta acción"
  }; [cite: 44]
  return new Error(errorMap[error.code] || "Error en autenticación. Por favor intenta nuevamente."); [cite: 45]
}
