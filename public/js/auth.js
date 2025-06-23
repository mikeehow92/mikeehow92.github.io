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
  setDoc
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { migrateGuestCart } from './app.js';

const firebaseConfig = {
  apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
  authDomain: "mitienda-c2609.firebaseapp.com",
  databaseURL: "https://mitienda-c2609-default-rtdb.firebaseio.com",
  projectId: "mitienda-c2609",
  storageBucket: "mitienda-c2609.firebasestorage.app",
  messagingSenderId: "536746062790",
  appId: "1:536746062790:web:cd39eb0057aac14c6538c7"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Servicio de autenticación encapsulado
export const AuthService = {
  getCurrentUser: () => auth.currentUser,
  
  login: (email, password) => 
    signInWithEmailAndPassword(auth, email, password),
  
  logout: () => signOut(auth),
  
  onAuthStateChanged: (callback) => 
    onAuthStateChanged(auth, callback),
    
  changePassword: async (currentPassword, newPassword) => {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay usuario autenticado");
    
    const credential = EmailAuthProvider.credential(
      user.email, 
      currentPassword
    );
    
    await reauthenticateWithCredential(user, credential);
    return await updatePassword(user, newPassword);
  },
  
  register: async (email, password, userData) => {
    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Crear documento en Firestore con datos adicionales
      await setDoc(doc(db, 'users', user.uid), {
        ...userData,
        createdAt: new Date().toISOString(),
        email: user.email
      });
      
      // Migrar carrito de invitado si existe
      await migrateGuestCart(user);
      
      return user;
    } catch (error) {
      console.error("Error en registro:", error);
      throw error;
    }
  },
  
  checkAuth: () => {
    return new Promise((resolve, reject) => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          if (user.emailVerified) {
            try {
              // Obtener datos adicionales del usuario desde Firestore
              const userDoc = await getDoc(doc(db, 'users', user.uid));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                // Combinar datos de autenticación con datos del perfil
                resolve({
                  ...user,
                  profileData: userData
                });
              } else {
                resolve(user); // Usuario existe pero no tiene datos adicionales
              }
            } catch (error) {
              console.error("Error al obtener datos del usuario:", error);
              resolve(user); // Devuelve al menos los datos básicos
            }
          } else {
            reject(new Error("El correo electrónico no está verificado"));
          }
        } else {
          reject(new Error("Usuario no autenticado"));
        }
      });
    });
  },

  getUserProfile: async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error("Error al obtener perfil:", error);
      throw error;
    }
  }
};

// Función para inicializar la UI de autenticación solo si los elementos existen
export function initAuthUI() {
  // Elementos del DOM
  const loginModal = document.getElementById('login-modal');
  const registerModal = document.getElementById('register-modal');
  const openLoginBtn = document.getElementById('open-login-btn');
  const openRegisterBtn = document.getElementById('open-register-btn');
  const closeLoginBtn = document.querySelector('.close-login-modal');
  const closeRegisterBtn = document.querySelector('.close-register-modal');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const guestButtons = document.getElementById('guest-buttons');
  const userInfo = document.getElementById('user-info');
  const userEmail = document.getElementById('user-email');
  const logoutBtn = document.getElementById('logout-btn');

  // Verificar y configurar eventos solo si los elementos existen
  if (openLoginBtn && loginModal) {
    openLoginBtn.addEventListener('click', () => {
      loginModal.classList.add('active');
    });
  }

  if (openRegisterBtn && registerModal) {
    openRegisterBtn.addEventListener('click', () => {
      registerModal.classList.add('active');
    });
  }

  if (closeLoginBtn && loginModal) {
    closeLoginBtn.addEventListener('click', () => {
      loginModal.classList.remove('active');
    });
  }

  if (closeRegisterBtn && registerModal) {
    closeRegisterBtn.addEventListener('click', () => {
      registerModal.classList.remove('active');
    });
  }

  if (loginModal) {
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) {
        loginModal.classList.remove('active');
      }
    });
  }

  if (registerModal) {
    registerModal.addEventListener('click', (e) => {
      if (e.target === registerModal) {
        registerModal.classList.remove('active');
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const email = document.getElementById('login-email')?.value;
      const password = document.getElementById('login-password')?.value;

      AuthService.login(email, password)
        .then(() => {
          if (loginModal) loginModal.classList.remove('active');
          if (loginForm) loginForm.reset();
        })
        .catch((error) => {
          alert(error.message);
        });
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('register-email')?.value;
      const password = document.getElementById('register-password')?.value;
      const confirmPassword = document.getElementById('register-confirm-password')?.value;
      const name = document.getElementById('register-name')?.value;
      const phone = document.getElementById('register-phone')?.value;

      if (password !== confirmPassword) {
        alert("Las contraseñas no coinciden");
        return;
      }

      try {
        await AuthService.register(email, password, {
          name,
          phone,
          role: 'customer'
        });
        
        if (registerModal) registerModal.classList.remove('active');
        if (registerForm) registerForm.reset();
        alert("Registro exitoso. Por favor verifica tu correo electrónico.");
      } catch (error) {
        alert(`Error en registro: ${error.message}`);
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      AuthService.logout().catch((error) => {
        console.error("Error al cerrar sesión:", error);
      });
    });
  }

  // Observador de estado de autenticación
  AuthService.onAuthStateChanged((user) => {
    if (guestButtons) guestButtons.style.display = user ? 'none' : 'flex';
    if (userInfo) userInfo.style.display = user ? 'flex' : 'none';
    if (userEmail && user) userEmail.textContent = user.email;
    
    if (user) {
      updateNavForAuthenticatedUser();
    } else {
      restoreOriginalNav();
    }
  });

  // Función para actualizar navegación
  function updateNavForAuthenticatedUser() {
    const nav = document.querySelector('nav ul');
    if (nav) {
      nav.innerHTML += `
        <li><a href="perfil.html"><i class="fas fa-user"></i> Mi Perfil</a></li>
        <li><a href="perfil.html"><i class="fas fa-shopping-bag"></i> Mis Pedidos</a></li>
      `;
    }
  }

  // Función para restaurar navegación original
  function restoreOriginalNav() {
    const nav = document.querySelector('nav ul');
    if (nav) {
      nav.innerHTML = `
        <li><a href="#nosotros"><i class="fas fa-users"></i> Nosotros</a></li>
        <li><a href="productos.html"><i class="fas fa-cogs"></i> Productos</a></li>
        <li><a href="#contacto"><i class="fas fa-envelope"></i> Contacto</a></li>
      `;
    }
  }
}

// Inicializar automáticamente si estamos en una página con elementos de auth
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('login-modal') || document.getElementById('logout-btn')) {
    initAuthUI();
  }
});
