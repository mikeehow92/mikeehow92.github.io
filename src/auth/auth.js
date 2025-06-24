import { 
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { app } from "../firebase-config";
import { CartService } from "../cart/cart-service";

// Inicialización de servicios
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Configuración adicional del proveedor Google (opcional)
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const AuthService = {
  // ==================== AUTENTICACIÓN BÁSICA ====================
  /**
   * Inicia sesión con email y contraseña
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<UserCredential>}
   */
  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await migrateGuestData(userCredential.user.uid);
      
      // Actualizar lastLogin en Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        lastLogin: serverTimestamp()
      }, { merge: true });
      
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
  logout: async () => {
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
  register: async (email, password, userData) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Actualizar perfil con nombre
      if (userData.name) {
        await updateProfile(userCredential.user, {
          displayName: userData.name
        });
      }
      
      // Crear documento en Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        ...userData,
        email: userCredential.user.email,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        role: "customer", // Rol por defecto
        photoURL: userCredential.user.photoURL || null
      });

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
  loginWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Verifica si es un nuevo usuario
      if (result._tokenResponse?.isNewUser) {
        await setDoc(doc(db, "users", result.user.uid), {
          name: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          role: "customer"
        });
      } else {
        // Actualizar lastLogin para usuarios existentes
        await setDoc(doc(db, "users", result.user.uid), {
          lastLogin: serverTimestamp()
        }, { merge: true });
      }

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
  getCurrentUser: () => {
    return auth.currentUser;
  },

  /**
   * Escucha cambios en el estado de autenticación
   * @param {(user: User|null) => void} callback 
   * @returns {() => void} Función para desuscribirse
   */
  onAuthStateChanged: (callback) => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Obtener datos adicionales de Firestore
          const userProfile = await getDoc(doc(db, "users", user.uid));
          callback({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            profile: userProfile.exists() ? userProfile.data() : null
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
  changePassword: async (currentPassword, newPassword) => {
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
  getUserProfile: async (userId) => {
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
  updateUserProfile: async (userId, profileData) => {
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
  }
};

// ==================== FUNCIONES INTERNAS ====================
/**
 * Migra datos de invitado al autenticarse
 * @param {string} userId 
 */
const migrateGuestData = async (userId) => {
  try {
    await CartService.migrateGuestCart(userId);
    // Aquí puedes añadir más migraciones (ej: favoritos, historial)
  } catch (error) {
    console.error("Error migrando datos:", error);
  }
};

/**
 * Maneja errores de autenticación
 * @param {Error} error 
 * @returns {Error}
 */
const handleAuthError = (error) => {
  const errorMap = {
    "auth/wrong-password": "Contraseña incorrecta",
    "auth/user-not-found": "Usuario no encontrado",
    "auth/email-already-in-use": "El email ya está registrado",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres",
    "auth/too-many-requests": "Demasiados intentos. Por favor, inténtalo más tarde",
    "auth/account-exists-with-different-credential": "Ya existe una cuenta con este email",
    "auth/popup-closed-by-user": "El popup de autenticación fue cerrado",
    "auth/network-request-failed": "Error de conexión. Verifica tu conexión a internet"
  };

  return new Error(errorMap[error.code] || "Error en autenticación");
};
