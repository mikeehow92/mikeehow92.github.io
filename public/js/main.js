import { AuthService } from './auth.js';
import { loadAuthModals } from './ui/auth-ui.js';

// Carga los componentes de UI
loadAuthModals();

// Manejo del estado de autenticación
AuthService.onAuthStateChanged((user) => {
  if (user) {
    // Usuario autenticado
    updateUIForAuthenticatedUser(user);
  } else {
    // Usuario no autenticado
    updateUIForGuest();
  }
});

// Funciones para actualizar la UI
function updateUIForAuthenticatedUser(user) {
  // Oculta botones de login/registro
  document.querySelector('.auth-buttons').style.display = 'none';
  
  // Muestra información del usuario
  const userDropdown = document.querySelector('.user-dropdown');
  userDropdown.style.display = 'flex';
  userDropdown.querySelector('.user-name').textContent = user.displayName || user.email;
}

function updateUIForGuest() {
  // Muestra botones de login/registro
  document.querySelector('.auth-buttons').style.display = 'flex';
  
  // Oculta información del usuario
  document.querySelector('.user-dropdown').style.display = 'none';
}
