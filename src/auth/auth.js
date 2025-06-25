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
  signInWithPopup
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { app } from "../firebase-config.js";
import { CartService } from "../cart/cart-service.js";

// Inicialización de servicios
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Configuración adicional del proveedor Google
googleProvider.setCustomParameters({ 
  prompt: 'select_account',
  login_hint: 'email'
});

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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Actualizar lastLogin en Firestore
      await this._updateUserLoginData(userCredential.user.uid);
      
      // Migrar datos de invitado
      await migrateGuestData(userCredential.user.uid);
      
      return userCredential;
    } catch (error) {
      console.error("Error en login:", error);
      throw handleAuthError(error);
    }
  },

  /**
   * Cierra la sesión actual
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error en logout:", error);
      throw error;
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Actualizar perfil con nombre
      if (userData.name) {
        await updateProfile(userCredential.user, {
          displayName: userData.name
        });
      }
      
      // Crear documento en Firestore
      await this._createUserProfile(userCredential.user, userData);

      // Migrar datos de invitado
      await migrateGuestData(userCredential.user.uid);
      
      return userCredential;
    } catch (error) {
      console.error("Error en registro:", error);
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
      const result = await signInWithPopup(auth, googleProvider);
      
      // Verifica si es un nuevo usuario
      if (result._tokenResponse?.isNewUser) {
        await this._createUserProfile(result.user, {
          name: result.user.displayName,
          photoURL: result.user.photoURL
        });
      } else {
        // Actualizar lastLogin para usuarios existentes
        await this._updateUserLoginData(result.user.uid);
      }

      // Migrar datos de invitado
      await migrateGuestData(result.user.uid);
      
      return result;
    } catch (error) {
      console.error("Error en Google Sign-In:", error);
      throw handleAuthError(error);
    }
  },

  // ==================== GESTIÓN DE SESIÓN ====================
  /**
   * Obtiene el usuario actual
   * @returns {User|null}
   */
  getCurrentUser() {
    return auth.currentUser;
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
          const userProfile = await this.getUserProfile(user.uid);
          
          callback({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            profile: userProfile
          });
        } catch (error) {
          console.error("Error cargando perfil:", error);
          callback({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified
          });
        }
      } else {
        callback(null);
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
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("Usuario no autenticado");

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
    } catch (error) {
      console.error("Error cambiando contraseña:", error);
      throw handleAuthError(error);
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
      const userDoc = await getDoc(doc(db, "users", userId));
      return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
      console.error("Error obteniendo perfil:", error);
      throw error;
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
      await setDoc(doc(db, "users", userId), profileData, { merge: true });
      
      // Actualizar también en auth si hay campos relevantes
      const user = auth.currentUser;
      if (user && user.uid === userId) {
        const updates = {};
        if (profileData.name) updates.displayName = profileData.name;
        if (profileData.photoURL) updates.photoURL = profileData.photoURL;
        
        if (Object.keys(updates).length > 0) {
          await updateProfile(user, updates);
        }
      }
    } catch (error) {
      console.error("Error actualizando perfil:", error);
      throw error;
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
    });
  },

  /**
   * Actualiza los datos de login del usuario
   * @private
   */
  async _updateUserLoginData(userId) {
    await setDoc(doc(db, "users", userId), {
      lastLogin: serverTimestamp()
    }, { merge: true });
  }
};

// ==================== FUNCIONES INTERNAS ====================
/**
 * Migra datos de invitado al autenticarse
 * @param {string} userId 
 */
async function migrateGuestData(userId) {
  try {
    await CartService.migrateGuestCart(userId);
    // Aquí puedes añadir más migraciones (ej: favoritos, historial)
  } catch (error) {
    console.error("Error migrando datos:", error);
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
    "auth/too-many-requests": "Demasiados intentos. Intenta más tarde",
    "auth/account-exists-with-different-credential": "Ya existe una cuenta con este email",
    "auth/popup-closed-by-user": "La ventana de autenticación fue cerrada",
    "auth/network-request-failed": "Error de conexión. Verifica tu internet",
    
    // Errores personalizados
    "auth/requires-recent-login": "Debes iniciar sesión nuevamente para realizar esta acción"
  };

  return new Error(errorMap[error.code] || "Error en autenticación. Por favor intenta nuevamente.");
}
