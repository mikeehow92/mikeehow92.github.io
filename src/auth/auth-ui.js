import { AuthService } from './auth.js';
import { showFeedback } from '../shared/feedback.js';
import { CartUI } from '../cart/cart-ui.js';

// Constantes para selectores y clases
const SELECTORS = {
  LOGIN_MODAL: '#login-modal',
  LOGIN_FORM: '#login-form',
  LOGOUT_BTN: '#logout-btn',
  OPEN_LOGIN: '#open-login-btn',
  FORGOT_PASSWORD: '#forgot-password',
  USER_NAME: '#user-name',
  USER_EMAIL: '#user-email',
  USER_AVATAR: '#user-avatar',
  GUEST_UI: '#guest-buttons',
  USER_UI: '#user-info',
  CLOSE_MODAL: '.close-modal',
  PROFILE_LINK: '#profile-link',
  ORDERS_LINK: '#orders-link'
};

const CLASSES = {
  ACTIVE: 'active',
  HIDDEN: 'hidden'
};

// Inicialización de la UI de autenticación
export function initAuthUI() {
  setupEventListeners();
  setupAuthStateListener();
}

// Configuración de event listeners
function setupEventListeners() {
  // Abrir modal de login
  document.querySelector(SELECTORS.OPEN_LOGIN)?.addEventListener('click', () => {
    toggleModal(SELECTORS.LOGIN_MODAL, true);
  });

  // Cerrar modales
  document.querySelectorAll(SELECTORS.CLOSE_MODAL).forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  // Recuperación de contraseña
  document.querySelector(SELECTORS.FORGOT_PASSWORD)?.addEventListener('click', (e) => {
    e.preventDefault();
    showFeedback('Por favor contacte al soporte técnico para recuperar su contraseña', 'info');
  });

  // Login con email
  document.querySelector(SELECTORS.LOGIN_FORM)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.querySelector('#login-email').value;
    const password = e.target.querySelector('#login-password').value;
    await handleLogin(email, password);
  });

  // Logout
  document.querySelector(SELECTORS.LOGOUT_BTN)?.addEventListener('click', handleLogout);
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
  const userName = document.querySelector(SELECTORS.USER_NAME);
  const userAvatar = document.querySelector(SELECTORS.USER_AVATAR);
  const profileLink = document.querySelector(SELECTORS.PROFILE_LINK);
  const ordersLink = document.querySelector(SELECTORS.ORDERS_LINK);

  toggleElement(guestUI, !user);
  toggleElement(userUI, !!user);
  toggleElement(profileLink, !!user);
  toggleElement(ordersLink, !!user);

  if (user) {
    userName.textContent = user.displayName || user.email.split('@')[0];
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
    // Usar placeholder o iniciales del nombre
    const nameInitials = user.displayName 
      ? user.displayName.split(' ').map(n => n[0]).join('')
      : user.email[0].toUpperCase();
    
    element.src = `https://ui-avatars.com/api/?name=${nameInitials}&background=${encodeURIComponent('#e63946')}&color=fff`;
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

async function handleLogout() {
  try {
    await AuthService.logout();
    showFeedback('Sesión cerrada correctamente', 'success');
  } catch (error) {
    showFeedback('Error al cerrar sesión', 'error');
  }
}

// Helpers
function closeAllModals() {
  toggleModal(SELECTORS.LOGIN_MODAL, false);
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
