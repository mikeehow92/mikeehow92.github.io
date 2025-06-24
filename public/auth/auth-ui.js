import { AuthService } from './auth';
import { showFeedback } from './feedback';
import { migrateCartToUser } from '../cart/cart-service';

// ==================== CONSTANTES ====================
const SELECTORS = {
  LOGIN_MODAL: '#login-modal',
  REGISTER_MODAL: '#register-modal',
  LOGIN_FORM: '#login-form',
  REGISTER_FORM: '#register-form',
  LOGOUT_BTN: '#logout-btn',
  OPEN_LOGIN: '#open-login-btn',
  OPEN_REGISTER: '#open-register-btn',
  USER_EMAIL: '#user-email',
  GUEST_UI: '#guest-buttons',
  USER_UI: '#user-info',
  GOOGLE_BTN: '#google-login-btn'
};

// ==================== FUNCIONES PRIVADAS ====================
const handleLogin = async (email, password) => {
  try {
    await AuthService.login(email, password);
    showFeedback('Sesión iniciada correctamente', 'success');
    closeAllModals();
  } catch (error) {
    showFeedback(`Error: ${error.message}`, 'error');
  }
};

const handleRegister = async (formData) => {
  const { email, password, name } = formData;
  
  try {
    await AuthService.register(email, password, { 
      name,
      role: 'customer',
      createdAt: new Date().toISOString()
    });
    showFeedback('¡Cuenta creada exitosamente!', 'success');
    closeAllModals();
  } catch (error) {
    showFeedback(`Error: ${error.message}`, 'error');
  }
};

const handleGoogleLogin = async () => {
  try {
    await AuthService.loginWithGoogle();
    closeAllModals();
  } catch (error) {
    showFeedback(`Error con Google: ${error.message}`, 'error');
  }
};

const closeAllModals = () => {
  document.querySelector(SELECTORS.LOGIN_MODAL)?.classList.remove('active');
  document.querySelector(SELECTORS.REGISTER_MODAL)?.classList.remove('active');
};

// ==================== MANEJO DE FORMULARIOS ====================
const setupLoginForm = () => {
  const form = document.querySelector(SELECTORS.LOGIN_FORM);
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('#login-email').value;
    const password = form.querySelector('#login-password').value;
    await handleLogin(email, password);
  });
};

const setupRegisterForm = () => {
  const form = document.querySelector(SELECTORS.REGISTER_FORM);
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
      email: form.querySelector('#register-email').value,
      password: form.querySelector('#register-password').value,
      confirmPassword: form.querySelector('#register-confirm-password').value,
      name: form.querySelector('#register-name').value
    };

    if (formData.password !== formData.confirmPassword) {
      showFeedback('Las contraseñas no coinciden', 'error');
      return;
    }

    await handleRegister(formData);
  });
};

// ==================== MANEJO DE UI ====================
const updateAuthUI = (user) => {
  const guestUI = document.querySelector(SELECTORS.GUEST_UI);
  const userUI = document.querySelector(SELECTORS.USER_UI);
  const userEmail = document.querySelector(SELECTORS.USER_EMAIL);

  if (guestUI) guestUI.style.display = user ? 'none' : 'flex';
  if (userUI) userUI.style.display = user ? 'flex' : 'none';
  if (userEmail && user) userEmail.textContent = user.email;
};

// ==================== EVENT LISTENERS ====================
const setupModalListeners = () => {
  // Abrir modales
  document.querySelector(SELECTORS.OPEN_LOGIN)?.addEventListener('click', () => {
    document.querySelector(SELECTORS.LOGIN_MODAL)?.classList.add('active');
  });

  document.querySelector(SELECTORS.OPEN_REGISTER)?.addEventListener('click', () => {
    document.querySelector(SELECTORS.REGISTER_MODAL)?.classList.add('active');
  });

  // Cerrar modales
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  // Cerrar al hacer clic fuera
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAllModals();
    });
  });

  // Botón de Google
  document.querySelector(SELECTORS.GOOGLE_BTN)?.addEventListener('click', handleGoogleLogin);

  // Logout
  document.querySelector(SELECTORS.LOGOUT_BTN)?.addEventListener('click', () => {
    AuthService.logout();
    showFeedback('Sesión cerrada correctamente', 'success');
  });
};

// ==================== INICIALIZACIÓN PÚBLICA ====================
export const initAuthUI = () => {
  // Configurar listeners
  setupModalListeners();
  setupLoginForm();
  setupRegisterForm();

  // Escuchar cambios de autenticación
  AuthService.onAuthStateChanged((user) => {
    updateAuthUI(user);
    
    // Migrar carrito si corresponde
    if (user) {
      migrateCartToUser(user.uid);
    }
  });

  // Verificar sesión al cargar
  AuthService.checkAuth()
    .then(user => updateAuthUI(user))
    .catch(() => updateAuthUI(null));
};

// Auto-inicialización si hay elementos de auth en el DOM
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector(SELECTORS.LOGIN_MODAL) || document.querySelector(SELECTORS.LOGOUT_BTN)) {
    initAuthUI();
  }
});
