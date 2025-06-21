import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";
import { 
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Habilita persistencia offline (opcional)
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn("Persistencia offline solo disponible en una pestaña");
  } else if (err.code === 'unimplemented') {
    console.warn("El navegador no soporta persistencia offline");
  }
});

// Servicio de Autenticación
export const AuthService = {
  getCurrentUser: () => auth.currentUser,
  
  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw new Error(this.getFriendlyErrorMessage(error.code));
    }
  },
  
  logout: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      throw error;
    }
  },
  
  onAuthStateChanged: (callback) => onAuthStateChanged(auth, callback),
  
  changePassword: async (currentPassword, newPassword) => {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay usuario autenticado");
    
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
    } catch (error) {
      throw new Error(this.getFriendlyErrorMessage(error.code));
    }
  },
  
  checkAuth: () => {
    return new Promise((resolve, reject) => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          if (user.emailVerified) {
            resolve(user);
          } else {
            reject(new Error("Por favor verifica tu correo electrónico antes de continuar"));
          }
        } else {
          reject(new Error("Debes iniciar sesión para acceder a esta página"));
        }
      });
    });
  },
  
  getFriendlyErrorMessage: (errorCode) => {
    const messages = {
      'auth/invalid-email': 'Correo electrónico inválido',
      'auth/user-disabled': 'Cuenta deshabilitada',
      'auth/user-not-found': 'Usuario no encontrado',
      'auth/wrong-password': 'Contraseña incorrecta',
      'auth/email-already-in-use': 'El correo ya está en uso',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
      'permission-denied': 'No tienes permisos para realizar esta acción'
    };
    return messages[errorCode] || 'Ocurrió un error inesperado';
  }
};

// Servicio de Firestore
export const FirestoreService = {
  getUserData: async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('No se encontraron datos del usuario');
      }
      return userDoc.data();
    } catch (error) {
      console.error("Error al obtener datos del usuario:", error);
      throw error;
    }
  },
  
  updateUserData: async (userId, data) => {
    try {
      await updateDoc(doc(db, 'users', userId), data);
    } catch (error) {
      console.error("Error al actualizar datos:", error);
      throw error;
    }
  },
  
  getOrders: async (userId) => {
    try {
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error al obtener pedidos:", error);
      throw error;
    }
  }
};

// Inicialización de UI (solo si los elementos existen)
export const initAuthUI = () => {
  const loginModal = document.getElementById('login-modal');
  const openLoginBtn = document.getElementById('open-login-btn');
  const loginForm = document.getElementById('login-form');
  const logoutBtn = document.getElementById('logout-btn');

  if (openLoginBtn && loginModal) {
    openLoginBtn.addEventListener('click', () => loginModal.classList.add('active'));
  }

  if (loginModal) {
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) loginModal.classList.remove('active');
    });
    
    const closeBtn = loginModal.querySelector('.close-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => loginModal.classList.remove('active'));
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginForm.querySelector('#login-email')?.value;
      const password = loginForm.querySelector('#login-password')?.value;
      
      try {
        await AuthService.login(email, password);
        loginModal?.classList.remove('active');
        loginForm.reset();
      } catch (error) {
        alert(error.message);
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await AuthService.logout();
      } catch (error) {
        alert(error.message);
      }
    });
  }

  // Actualizar UI según estado de autenticación
  AuthService.onAuthStateChanged((user) => {
    const guestSection = document.getElementById('guest-buttons');
    const userSection = document.getElementById('user-info');
    const userEmailSpan = document.getElementById('user-email');
    
    if (guestSection) guestSection.style.display = user ? 'none' : 'block';
    if (userSection) userSection.style.display = user ? 'block' : 'none';
    if (userEmailSpan && user) userEmailSpan.textContent = user.email;
  });
};

// Inicialización automática si es necesario
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('login-form')) initAuthUI();
  });
} else if (document.getElementById('login-form')) {
  initAuthUI();
}
