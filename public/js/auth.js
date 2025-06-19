import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "{{FIREBASE_API_KEY}}",
  authDomain: "{{FIREBASE_AUTH_DOMAIN}}",
  databaseURL: "{{FIREBASE_DATABASE_URL}}", 
  projectId: "{{FIREBASE_PROJECT_ID}}",
  storageBucket: "{{FIREBASE_STORAGE_BUCKET}}",
  messagingSenderId: "{{FIREBASE_MESSAGING_SENDER_ID}}",
  appId: "{{FIREBASE_APP_ID}}"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Elementos del DOM
const loginModal = document.getElementById('login-modal');
const openLoginBtn = document.getElementById('open-login-btn');
const closeLoginBtn = document.querySelector('.close-modal');
const loginForm = document.getElementById('login-form');
const guestButtons = document.getElementById('guest-buttons');
const userInfo = document.getElementById('user-info');
const userEmail = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

// Abrir modal de login
openLoginBtn.addEventListener('click', () => {
  loginModal.classList.add('active');
});

// Cerrar modal de login
closeLoginBtn.addEventListener('click', () => {
  loginModal.classList.remove('active');
});

// Cerrar modal al hacer clic fuera
loginModal.addEventListener('click', (e) => {
  if (e.target === loginModal) {
    loginModal.classList.remove('active');
  }
});

// Login con email y contraseña
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Cerrar modal después de login exitoso
      loginModal.classList.remove('active');
      // Limpiar formulario
      loginForm.reset();
    })
    .catch((error) => {
      alert(error.message); // Mejora esto con un mensaje más amigable
    });
});

// Cerrar sesión
logoutBtn.addEventListener('click', () => {
  signOut(auth).catch((error) => {
    console.error("Error al cerrar sesión:", error);
  });
});

// Observador de estado de autenticación
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Usuario logueado
    guestButtons.style.display = 'none';
    userInfo.style.display = 'flex';
    userEmail.textContent = user.email;
    
    // Actualizar navegación para usuario autenticado
    updateNavForAuthenticatedUser();
  } else {
    // Usuario no logueado
    guestButtons.style.display = 'flex';
    userInfo.style.display = 'none';
    
    // Restaurar navegación original
    restoreOriginalNav();
  }
});

// Función para actualizar navegación
function updateNavForAuthenticatedUser() {
  const nav = document.querySelector('nav ul');
  // Agrega enlaces adicionales para usuarios autenticados
  nav.innerHTML += `
    <li><a href="perfil.html"><i class="fas fa-user"></i> Mi Perfil</a></li>
    <li><a href="pedidos.html"><i class="fas fa-shopping-bag"></i> Mis Pedidos</a></li>
  `;
}

// Función para restaurar navegación original
function restoreOriginalNav() {
  const nav = document.querySelector('nav ul');
  nav.innerHTML = `
    <li><a href="#nosotros"><i class="fas fa-users"></i> Nosotros</a></li>
    <li><a href="productos.html"><i class="fas fa-cogs"></i> Productos</a></li>
    <li><a href="#contacto"><i class="fas fa-envelope"></i> Contacto</a></li>
  `;
}
