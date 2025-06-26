import { AuthService } from './auth.js';
import { showFeedback } from '../shared/feedback.js';
import { CartUI } from '../cart/cart-ui.js';

// Selectors and classes
const SELECTORS = {
  LOGIN_MODAL: '#login-modal',
  LOGIN_FORM: '#login-form',
  LOGOUT_BTN: '#logout-btn',
  OPEN_LOGIN: '#loginBtn', // Changed to match your HTML button ID
  FORGOT_PASSWORD: '#forgot-password',
  USER_NAME: '#user-name',
  USER_AVATAR: '#user-avatar',
  GUEST_UI: '#guest-buttons',
  USER_UI: '#user-info',
  CLOSE_MODAL: '.close-btn',
  PROFILE_LINK: '#profile-link',
  ORDERS_LINK: '#orders-link'
};

const CLASSES = {
  ACTIVE: 'active',
  HIDDEN: 'hidden'
};

// Initialize auth UI
export function initAuthUI() {
  setupEventListeners();
  setupAuthStateListener();
}

// Set up event listeners
function setupEventListeners() {
  // Open login modal
  document.querySelector(SELECTORS.OPEN_LOGIN)?.addEventListener('click', () => {
    toggleModal(SELECTORS.LOGIN_MODAL, true);
  });

  // Close modal
  document.querySelector(SELECTORS.CLOSE_MODAL)?.addEventListener('click', closeAllModals);

  // Forgot password
  document.querySelector(SELECTORS.FORGOT_PASSWORD)?.addEventListener('click', (e) => {
    e.preventDefault();
    showFeedback('Contact support to reset your password', 'info');
  });

  // Login form submission
  document.querySelector(SELECTORS.LOGIN_FORM)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.querySelector('#email').value;
    const password = e.target.querySelector('#password').value;
    await handleLogin(email, password);
  });

  // Logout
  document.querySelector(SELECTORS.LOGOUT_BTN)?.addEventListener('click', handleLogout);
}

// Auth state listener
function setupAuthStateListener() {
  AuthService.onAuthStateChanged((user) => {
    updateUI(user);
    if (user) {
      CartUI.updateCartUI();
    }
  });
}

// Update UI based on auth state
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

// Update user avatar
function updateUserAvatar(element, user) {
  if (!element) return;
  
  if (user.photoURL) {
    element.src = user.photoURL;
    element.classList.remove(CLASSES.HIDDEN);
  } else {
    const nameInitials = user.displayName 
      ? user.displayName.split(' ').map(n => n[0]).join('')
      : user.email[0].toUpperCase();
    element.src = `https://ui-avatars.com/api/?name=${nameInitials}&background=e63946&color=fff`;
    element.classList.remove(CLASSES.HIDDEN);
  }
}

// Handle login
async function handleLogin(email, password) {
  try {
    await AuthService.login(email, password);
    closeAllModals();
    showFeedback('Login successful', 'success');
  } catch (error) {
    showFeedback(error.message, 'error');
  }
}

// Handle logout
async function handleLogout() {
  try {
    await AuthService.logout();
    showFeedback('Logged out successfully', 'success');
  } catch (error) {
    showFeedback('Error logging out', 'error');
  }
}

// Close all modals
function closeAllModals() {
  toggleModal(SELECTORS.LOGIN_MODAL, false);
}

// Toggle modal visibility
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

// Toggle element visibility
function toggleElement(element, show) {
  if (!element) return;
  element.style.display = show ? 'flex' : 'none';
}
