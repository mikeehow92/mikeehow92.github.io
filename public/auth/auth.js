import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithRedirect
} from "firebase/auth";
import { 
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import firebaseConfig from './firebase-config';

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ==================== FUNCIONES DEL SERVICIO ====================

/**
 * Migra el carrito de localStorage a Firestore al autenticarse
 * @param {string} userId - ID del usuario
 */
const migrateGuestCart = async (userId) => {
  const guestCart = localStorage.getItem('cart');
  if (guestCart) {
    await setDoc(doc(db, 'carts', userId), {
      items: JSON.parse(guestCart),
      updatedAt: serverTimestamp()
    });
    localStorage.removeItem('cart');
  }
};

export const AuthService = {
  // -------------------- AUTENTICACIÓN BÁSICA --------------------
  getCurrentUser: () => auth.currentUser,

  login: async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await migrateGuestCart(userCredential.user.uid);
    return userCredential;
  },

  logout: () => signOut(auth),

  // -------------------- REGISTRO --------------------
  register: async (email, password, userData) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      ...userData,
      email: userCredential.user.email,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });

    await migrateGuestCart(userCredential.user.uid);
    return userCredential;
  },

  // -------------------- AUTENTICACIÓN CON GOOGLE --------------------
  loginWithGoogle: async () => {
    try {
      await signInWithRedirect(auth, googleProvider);
      const result = await getRedirectResult(auth);
      if (result?.user) {
        await migrateGuestCart(result.user.uid);
      }
      return result;
    } catch (error) {
      console.error("Error en Google Sign-In:", error);
      throw error;
    }
  },

  // -------------------- GESTIÓN DE PERFIL --------------------
  updateProfile: async (userId, data) => {
    await setDoc(doc(db, 'users', userId), data, { merge: true });
  },

  getProfile: async (userId) => {
    const docSnap = await getDoc(doc(db, 'users', userId));
    return docSnap.exists() ? docSnap.data() : null;
  },

  // -------------------- GESTIÓN DE CONTRASEÑA --------------------
  changePassword: async (currentPassword, newPassword) => {
    const user = auth.currentUser;
    if (!user) throw new Error("No autenticado");

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    return await updatePassword(user, newPassword);
  },

  // -------------------- LISTENERS --------------------
  onAuthStateChanged: (callback) => onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const profile = await this.getProfile(user.uid);
        callback({ ...user, profile });
      } catch (error) {
        console.error("Error cargando perfil:", error);
        callback(user);
      }
    } else {
      callback(null);
    }
  }),

  // -------------------- VERIFICACIÓN DE SESIÓN --------------------
  checkAuth: () => {
    return new Promise((resolve, reject) => {
      this.onAuthStateChanged((user) => {
        user ? resolve(user) : reject(new Error("No autenticado"));
      });
    });
  }
};

// ==================== INICIALIZACIÓN OPORTUNISTA ====================
// Para proyectos que necesitan autoinicialización
if (typeof window !== 'undefined' && document.getElementById('auth-container')) {
  AuthService.onAuthStateChanged((user) => {
    console.log("Estado de autenticación cambiado:", user ? "Autenticado" : "No autenticado");
  });
}
