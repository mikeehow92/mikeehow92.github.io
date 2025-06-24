import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";
import { 
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
  authDomain: "mitienda-c2609.firebaseapp.com",
  databaseURL: "https://mitienda-c2609-default-rtdb.firebaseio.com",
  projectId: "mitienda-c2609",
  storageBucket: "mitienda-c2609.firebasestorage.app",
  messagingSenderId: "536746062790",
  appId: "1:536746062790:web:cd39eb0057aac14c6538c7"
};

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==================== FUNCIONES DE AUTENTICACIÓN ====================

/**
 * Migra el carrito de localStorage a Firestore cuando un usuario se registra/inicia sesión
 * @param {Object} user - Usuario de Firebase Auth
 */
export const migrateGuestCart = async (user) => {
  try {
    const guestCart = localStorage.getItem('cart');
    if (guestCart && user) {
      await setDoc(doc(db, 'carts', user.uid), {
        items: JSON.parse(guestCart),
        lastUpdated: serverTimestamp()
      });
      localStorage.removeItem('cart');
    }
  } catch (error) {
    console.error("Error al migrar carrito:", error);
    throw error;
  }
};

/**
 * Servicio de autenticación encapsulado
 */
export const AuthService = {
  // Obtiene el usuario actual
  getCurrentUser: () => auth.currentUser,

  // Inicia sesión
  login: (email, password) => signInWithEmailAndPassword(auth, email, password),

  // Cierra sesión
  logout: () => signOut(auth),

  // Escucha cambios de autenticación
  onAuthStateChanged: (callback) => onAuthStateChanged(auth, callback),

  // Cambia la contraseña (requiere reautenticación)
  changePassword: async (currentPassword, newPassword) => {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay usuario autenticado");
    
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    return await updatePassword(user, newPassword);
  },

  // Registra un nuevo usuario
  register: async (email, password, userData) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        ...userData,
        createdAt: new Date().toISOString(),
        email: user.email
      });

      await migrateGuestCart(user); // Migrar carrito si existe
      return user;
    } catch (error) {
      console.error("Error en registro:", error);
      throw error;
    }
  },

  // Verifica autenticación y devuelve datos del usuario
  checkAuth: () => {
    return new Promise((resolve, reject) => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            resolve(userDoc.exists() ? { ...user, profileData: userDoc.data() } : user);
          } catch (error) {
            console.error("Error al obtener perfil:", error);
            resolve(user); // Devuelve datos básicos si falla Firestore
          }
        } else {
          reject(new Error("Usuario no autenticado"));
        }
      });
    });
  },

  // Obtiene el perfil del usuario desde Firestore
  getUserProfile: async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
      console.error("Error al obtener perfil:", error);
      throw error;
    }
  }
};

// ==================== MANEJO DE LA INTERFAZ DE AUTENTICACIÓN ====================

/**
 * Inicializa los listeners para los modales de login/registro
 */
export function initAuthUI() {
  // Elementos del DOM
  const loginModal = document.getElementById('login-modal');
  const registerModal = document.getElementById('register-modal');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const logoutBtn = document.getElementById('logout-btn');

  // Abrir/Cerrar Modales
  if (document.getElementById('open-login-btn')) {
    document.getElementById('open-login-btn').addEventListener('click', () => {
      if (loginModal) loginModal.classList.add('active');
    });
  }

  if (document.getElementById('open-register-btn')) {
    document.getElementById('open-register-btn').addEventListener('click', () => {
      if (registerModal) registerModal.classList.add('active');
    });
  }

  // Cerrar modales al hacer clic en 'X' o fuera
  [loginModal, registerModal].forEach(modal => {
    if (!modal) return;
    
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  // Login
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = loginForm.querySelector('#login-email')?.value;
      const password = loginForm.querySelector('#login-password')?.value;

      AuthService.login(email, password)
        .then(() => loginModal?.classList.remove('active'))
        .catch(error => alert(`Error: ${error.message}`));
    });
  }

  // Registro
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = registerForm.querySelector('#register-email')?.value;
      const password = registerForm.querySelector('#register-password')?.value;
      const confirmPassword = registerForm.querySelector('#register-confirm-password')?.value;
      const name = registerForm.querySelector('#register-name')?.value;

      if (password !== confirmPassword) {
        alert("Las contraseñas no coinciden");
        return;
      }

      try {
        await AuthService.register(email, password, { name, role: 'customer' });
        registerModal?.classList.remove('active');
        alert("¡Registro exitoso!");
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => AuthService.logout());
  }

  // Actualizar UI según estado de autenticación
  AuthService.onAuthStateChanged((user) => {
    const guestUI = document.getElementById('guest-buttons');
    const userUI = document.getElementById('user-info');
    
    if (guestUI) guestUI.style.display = user ? 'none' : 'flex';
    if (userUI) {
      userUI.style.display = user ? 'flex' : 'none';
      if (user) document.getElementById('user-email')?.textContent = user.email;
    }
  });
}

// Inicialización automática si hay elementos de auth en la página
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('#login-modal, #logout-btn')) {
    initAuthUI();
  }
});
