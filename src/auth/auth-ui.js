import { AuthService } from './auth';
import { showFeedback } from '../shared/feedback';
import { CartUI } from '../cart/cart-ui';

// Constantes para selectores y clases
const SELECTORS = {
  LOGIN_MODAL: '#login-modal',
  REGISTER_MODAL: '#register-modal',
  LOGIN_FORM: '#login-form',
  REGISTER_FORM: '#register-form',
  LOGOUT_BTN: '#logout-btn',
  OPEN_LOGIN: '#open-login-btn',
  OPEN_REGISTER: '#open-register-btn',
  GOOGLE_LOGIN: '#google-login-btn',
  USER_EMAIL: '#user-email',
  USER_AVATAR: '#user-avatar',
  GUEST_UI: '#guest-buttons',
  USER_UI: '#user-info'
};

// Clases CSS para estados
const CLASSES = {
  ACTIVE: 'active',
  HIDDEN: 'hidden'
};

/**
 * Inicializa la interfaz de autenticación
 */
export const initAuthUI = () => {
  setupEventListeners();
  setupAuthStateListener();
};

/**
 * Configura los listeners de eventos
 */
const setupEventListeners = () => {
  // Abrir modales
  document.querySelector(SELECTORS.OPEN_LOGIN)?.addEventListener('click', () => {
    toggleModal(SELECTORS.LOGIN_MODAL, true);
  });

  document.querySelector(SELECTORS.OPEN_REGISTER)?.addEventListener('click', () => {
    toggleModal(SELECTORS.REGISTER_MODAL, true);
  });

  // Cerrar modales
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleModal(SELECTORS.LOGIN_MODAL, false);
      toggleModal(SELECTORS.REGISTER_MODAL, false);
    });
  });

  // Login con email
  document.querySelector(SELECTORS.LOGIN_FORM)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.querySelector('#email').value;
    const password = e.target.querySelector('#password').value;
    await handleLogin(email, password);
  });

  // Registro
  document.querySelector(SELECTORS.REGISTER_FORM)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = getFormData(e.target);
    await handleRegister(formData);
  });

  // Login con Google
  document.querySelector(SELECTORS.GOOGLE_LOGIN)?.addEventListener('click', handleGoogleLogin);

  // Logout
  document.querySelector(SELECTORS.LOGOUT_BTN)?.addEventListener('click', handleLogout);
};

/**
 * Configura el listener de cambios de autenticación
 */
const setupAuthStateListener = () => {
  AuthService.onAuthStateChanged((user) => {
    updateUI(user);
    if (user) {
      CartUI.updateCartUI(); // Actualizar carrito al autenticarse
    }
  });
};

/**
 * Actualiza la UI según el estado de autenticación
 * @param {Object|null} user - Objeto de usuario o null
 */
const updateUI = (user) => {
  const guestUI = document.querySelector(SELECTORS.GUEST_UI);
  const userUI = document.querySelector(SELECTORS.USER_UI);
  const userEmail = document.querySelector(SELECTORS.USER_EMAIL);
  const userAvatar = document.querySelector(SELECTORS.USER_AVATAR);

  // Mostrar/ocultar secciones
  toggleElement(guestUI, !user);
  toggleElement(userUI, !!user);

  // Actualizar datos de usuario
  if (user) {
    userEmail.textContent = user.email;
    if (user.photoURL) {
      userAvatar.src = user.photoURL;
      userAvatar.classList.remove(CLASSES.HIDDEN);
    }
  }
};

/**
 * Maneja el login con email/contraseña
 * @param {string} email 
 * @param {string} password 
 */
const handleLogin = async (email, password) => {
  try {
    await AuthService.login(email, password);
    toggleModal(SELECTORS.LOGIN_MODAL, false);
    showFeedback('Sesión iniciada correctamente', 'success');
  } catch (error) {
    showFeedback(error.message, 'error');
  }
};

/**
 * Maneja el registro de nuevo usuario
 * @param {Object} formData 
 */
const handleRegister = async (formData) => {
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
    toggleModal(SELECTORS.REGISTER_MODAL, false);
    showFeedback('¡Registro exitoso!', 'success');
  } catch (error) {
    showFeedback(error.message, 'error');
  }
};

/**
 * Maneja el login con Google
 */
const handleGoogleLogin = async () => {
  try {
    await AuthService.loginWithGoogle();
    toggleModal(SELECTORS.LOGIN_MODAL, false);
    showFeedback('Sesión con Google iniciada', 'success');
  } catch (error) {
    showFeedback(error.message, 'error');
  }
};

/**
 * Maneja el logout
 */
const handleLogout = async () => {
  try {
    await AuthService.logout();
    showFeedback('Sesión cerrada correctamente', 'success');
  } catch (error) {
    showFeedback('Error al cerrar sesión', 'error');
  }
};

/**
 * Extrae datos del formulario
 * @param {HTMLFormElement} form 
 * @returns {Object}
 */
const getFormData = (form) => {
  const inputs = form.querySelectorAll('input');
  return Array.from(inputs).reduce((data, input) => {
    data[input.name] = input.value;
    return data;
  }, {});
};

/**
 * Muestra/oculta un modal
 * @param {string} selector 
 * @param {boolean} show 
 */
const toggleModal = (selector, show) => {
  const modal = document.querySelector(selector);
  if (!modal) return;
  
  if (show) {
    modal.classList.add(CLASSES.ACTIVE);
    document.body.style.overflow = 'hidden';
  } else {
    modal.classList.remove(CLASSES.ACTIVE);
    document.body.style.overflow = '';
  }
};

/**
 * Muestra/oculta un elemento
 * @param {HTMLElement} element 
 * @param {boolean} show 
 */
const toggleElement = (element, show) => {
  if (!element) return;
  element.style.display = show ? 'flex' : 'none';
};

// Auto-inicialización si hay elementos de auth en el DOM
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector(SELECTORS.LOGIN_MODAL) || document.querySelector(SELECTORS.LOGOUT_BTN)) {
    initAuthUI();
  }
});
