import { AuthService } from './auth.js';
import { showFeedback } from '../shared/feedback.js';
import { CartUI } from '../cart/cart-ui.js';

// Constantes para selectores y clases
const SELECTORS = {
  LOGIN_MODAL: '#login-modal',
  REGISTER_MODAL: '#register-modal',
  FORGOT_PASSWORD_MODAL: '#forgot-password-modal',
  LOGIN_FORM: '#login-form',
  REGISTER_FORM: '#register-form',
  FORGOT_PASSWORD_FORM: '#forgot-password-form',
  LOGOUT_BTN: '#logout-btn',
  OPEN_LOGIN: '#open-login-btn',
  OPEN_REGISTER: '#open-register-btn',
  GOOGLE_LOGIN: '#google-login-btn',
  USER_EMAIL: '#user-email',
  USER_AVATAR: '#user-avatar',
  GUEST_UI: '#guest-buttons',
  USER_UI: '#user-info',
  CLOSE_MODAL: '.close-modal',
  SWITCH_TO_SIGNUP: '#switch-to-signup',
  SWITCH_TO_LOGIN: '#switch-to-login',
  FORGOT_PASSWORD_LINK: '.forgot-password',
  BACK_TO_LOGIN: '#back-to-login'
};

const CLASSES = {
  ACTIVE: 'active',
  HIDDEN: 'hidden',
  AUTHENTICATED: 'authenticated'
};

// Inicialización de la UI de autenticación
export function initAuthUI() {
  setupEventListeners();
  setupAuthStateListener();
}

// Configuración de event listeners
function setupEventListeners() {
  // Abrir modales
  document.querySelector(SELECTORS.OPEN_LOGIN)?.addEventListener('click', () => {
    toggleModal(SELECTORS.LOGIN_MODAL, true);
  });

  document.querySelector(SELECTORS.OPEN_REGISTER)?.addEventListener('click', () => {
    toggleModal(SELECTORS.REGISTER_MODAL, true);
  });

  // Cerrar modales
  document.querySelectorAll(SELECTORS.CLOSE_MODAL).forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  // Cambiar entre login y registro
  document.querySelector(SELECTORS.SWITCH_TO_SIGNUP)?.addEventListener('click', (e) => {
    e.preventDefault();
    switchToRegister();
  });

  document.querySelector(SELECTORS.SWITCH_TO_LOGIN)?.addEventListener('click', (e) => {
    e.preventDefault();
    switchToLogin();
  });

  // Login con email
  document.querySelector(SELECTORS.LOGIN_FORM)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.querySelector('#login-email').value;
    const password = e.target.querySelector('#login-password').value;
    await handleLogin(email, password);
  });

  // Registro
  document.querySelector(SELECTORS.REGISTER_FORM)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = getFormData(e.target);
    await handleRegister(formData);
  });

  // Recuperación de contraseña
  document.querySelector(SELECTORS.FORGOT_PASSWORD_LINK)?.addEventListener('click', (e) => {
    e.preventDefault();
    closeAllModals();
    toggleModal(SELECTORS.FORGOT_PASSWORD_MODAL, true);
  });

  document.querySelector(SELECTORS.BACK_TO_LOGIN)?.addEventListener('click', (e) => {
    e.preventDefault();
    closeAllModals();
    toggleModal(SELECTORS.LOGIN_MODAL, true);
  });

  document.querySelector(SELECTORS.FORGOT_PASSWORD_FORM)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.querySelector('#forgot-email').value;
    try {
      await AuthService.sendPasswordResetEmail(email);
      showFeedback('Se ha enviado un enlace de recuperación a tu correo', 'success');
      closeAllModals();
    } catch (error) {
      showFeedback(error.message, 'error');
    }
  });

  // Login con Google
  document.querySelector(SELECTORS.GOOGLE_LOGIN)?.addEventListener('click', handleGoogleLogin);

  // Logout
  document.querySelector(SELECTORS.LOGOUT_BTN)?.addEventListener('click', handleLogout);

  // Cerrar modal al hacer clic fuera
  document.querySelectorAll([SELECTORS.LOGIN_MODAL, SELECTORS.REGISTER_MODAL, SELECTORS.FORGOT_PASSWORD_MODAL]).forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAllModals();
      }
    });
  });
}

// Listener de cambios de autenticación
function setupAuthStateListener() {
  AuthService.onAuthStateChanged((user) => {
    updateUI(user);
    if (user) {
      CartUI.updateCartUI();
    }
  });
}

// Actualización de la UI según estado de autenticación
function updateUI(user) {
  const guestUI = document.querySelector(SELECTORS.GUEST_UI);
  const userUI = document.querySelector(SELECTORS.USER_UI);
  const userEmail = document.querySelector(SELECTORS.USER_EMAIL);
  const userAvatar = document.querySelector(SELECTORS.USER_AVATAR);

  toggleElement(guestUI, !user);
  toggleElement(userUI, !!user);
  
  // Actualizar clase en body para elementos .user-only
  document.body.classList.toggle(CLASSES.AUTHENTICATED, !!user);

  if (user) {
    // Mostrar nombre o email
    const displayText = user.displayName || user.email;
    userEmail.textContent = displayText;
    updateUserAvatar(userAvatar, user);
  }
}

// Actualizar avatar del usuario
function updateUserAvatar(element, user) {
  if (!element) return;
  
  if (user.photoURL) {
    element.src = user.photoURL;
    element.classList.remove(CLASSES.HIDDEN);
  } else if (user.profile?.photoURL) {
    element.src = user.profile.photoURL;
    element.classList.remove(CLASSES.HIDDEN);
  } else {
    // Mostrar iniciales si no hay avatar
    const name = user.displayName || user.email;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    
    // Crear avatar con iniciales
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    
    // Fondo aleatorio basado en el email
    const colors = ['#FF6B6B', '#48DBFB', '#6BCB77', '#FAA300', '#9C51B6'];
    const hash = user.email.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const bgColor = colors[hash % colors.length];
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials.substring(0, 2), 20, 20);
    
    element.src = canvas.toDataURL();
    element.classList.remove(CLASSES.HIDDEN);
  }
}

// Manejadores de autenticación
async function handleLogin(email, password) {
  try {
    await AuthService.login(email, password);
    closeAllModals();
    showFeedback('Sesión iniciada correctamente', 'success');
  } catch (error) {
    showFeedback(error.message, 'error');
  }
}

async function handleRegister(formData) {
  if (formData.password !== formData.confirmPassword) {
    showFeedback('Las contraseñas no coinciden', 'error');
    return;
  }

  try {
    await AuthService.register(
      formData.email, 
      formData.password, 
      { 
        name: formData.name,
        phone: formData.phone 
      }
    );
    closeAllModals();
    showFeedback('¡Registro exitoso!', 'success');
  } catch (error) {
    showFeedback(error.message, 'error');
  }
}

async function handleGoogleLogin() {
  try {
    await AuthService.loginWithGoogle();
    closeAllModals();
    showFeedback('Sesión con Google iniciada', 'success');
  } catch (error) {
    showFeedback(error.message, 'error');
  }
}

async function handleLogout() {
  try {
    await AuthService.logout();
    showFeedback('Sesión cerrada correctamente', 'success');
  } catch (error) {
    showFeedback('Error al cerrar sesión', 'error');
  }
}

// Helpers
function getFormData(form) {
  const inputs = form.querySelectorAll('input, textarea');
  return Array.from(inputs).reduce((data, input) => {
    if (input.name) {
      data[input.name] = input.value;
    }
    return data;
  }, {});
}

function closeAllModals() {
  toggleModal(SELECTORS.LOGIN_MODAL, false);
  toggleModal(SELECTORS.REGISTER_MODAL, false);
  toggleModal(SELECTORS.FORGOT_PASSWORD_MODAL, false);
}

function switchToRegister() {
  toggleModal(SELECTORS.LOGIN_MODAL, false);
  toggleModal(SELECTORS.REGISTER_MODAL, true);
}

function switchToLogin() {
  toggleModal(SELECTORS.REGISTER_MODAL, false);
  toggleModal(SELECTORS.LOGIN_MODAL, true);
}

function toggleModal(selector, show) {
  const modal = document.querySelector(selector);
  if (!modal) return;
  
  if (show) {
    modal.classList.add(CLASSES.ACTIVE);
    document.body.style.overflow = 'hidden';
  } else {
    modal.classList.remove(CLASSES.ACTIVE);
    document.body.style.overflow = '';
  }
}

function toggleElement(element, show) {
  if (!element) return;
  element.style.display = show ? 'flex' : 'none';
}
