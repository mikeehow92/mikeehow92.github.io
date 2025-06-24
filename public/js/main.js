// main.js
import { AuthService } from './auth.js';

// Initialize authentication state handling
function initAuthState() {
  const guestButtons = document.getElementById('guest-buttons');
  const userInfo = document.getElementById('user-info');
  const userEmail = document.getElementById('user-email');
  const logoutBtn = document.getElementById('logout-btn');

  // Update UI based on auth state
  function updateAuthUI(user) {
    if (user) {
      // User is logged in
      if (guestButtons) guestButtons.style.display = 'none';
      if (userInfo) userInfo.style.display = 'flex';
      if (userEmail) userEmail.textContent = user.email;
    } else {
      // User is logged out
      if (guestButtons) guestButtons.style.display = 'block';
      if (userInfo) userInfo.style.display = 'none';
    }
  }

  // Handle logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await AuthService.logout();
      } catch (error) {
        console.error('Logout error:', error);
        alert('Error al cerrar sesión: ' + error.message);
      }
    });
  }

  // Set up auth state listener
  AuthService.onAuthStateChanged((user) => {
    updateAuthUI(user);
  });

  // Check initial auth state
  AuthService.checkAuth()
    .then(user => updateAuthUI(user))
    .catch(() => updateAuthUI(null));
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Initialize authentication
  initAuthState();

  // Other initialization code can go here
  console.log('Application initialized');
});

// Export for testing purposes if needed
export function testableFunctions() {
  return {
    initAuthState
  };
}
