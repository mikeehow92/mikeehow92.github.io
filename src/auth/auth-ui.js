import { AuthService } from './auth.js'; // Asegúrate de que esta ruta sea correcta
import { showFeedback } from '../shared/feedback.js'; // Asegúrate de que esta ruta sea correcta
import { auth } from '../firebase-config.js'; // Importa la instancia de auth directamente

/**
 * Configura toda la lógica de la interfaz de usuario relacionada con la autenticación:
 * - Muestra/oculta botones de login/logout.
 * - Muestra información del usuario logueado.
 * - Maneja la apertura y cierre de los modales de login y reseteo de contraseña.
 * - Procesa los formularios de login y reseteo.
 * - Actualiza el estado del carrito.
 */
export function setupAuthUI() {
    console.log("Configurando UI de autenticación...");

    // Elementos del DOM
    const loginModal = document.getElementById('login-modal');
    const resetModal = document.getElementById('reset-modal');
    const openLoginBtn = document.getElementById('open-login-btn');
    const guestButtons = document.getElementById('guest-buttons');
    const userInfo = document.getElementById('user-info');
    const userNameDisplay = document.getElementById('user-name');
    const userAvatarDisplay = document.getElementById('user-avatar');
    const logoutBtn = document.getElementById('logout-btn');
    const loginForm = document.getElementById('login-form');
    const resetForm = document.getElementById('reset-form');
    const switchToSignupLink = document.getElementById('switch-to-signup');
    const switchToLoginFromResetLink = document.getElementById('switch-to-login-from-reset');
    const profileLink = document.getElementById('profile-link');
    const ordersLink = document.getElementById('orders-link');

    // Funciones para mostrar/ocultar modales
    const toggleModal = (modal, show) => {
        if (modal) {
            modal.classList.toggle('active', show);
            document.body.style.overflow = show ? 'hidden' : ''; // Previene el scroll del fondo
        }
    };

    // Event Listeners para abrir/cerrar modales
    openLoginBtn?.addEventListener('click', () => toggleModal(loginModal, true));
    loginModal?.querySelector('.close-modal')?.addEventListener('click', () => toggleModal(loginModal, false));
    resetModal?.querySelector('.close-modal')?.addEventListener('click', () => toggleModal(resetModal, false));

    // Navegación entre modales
    switchToSignupLink?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleModal(loginModal, false);
        // Redirigir a la página de registro
        window.location.href = 'registro.html'; 
    });

    switchToLoginFromResetLink?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleModal(resetModal, false);
        toggleModal(loginModal, true);
    });

    document.getElementById('forgot-password')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleModal(loginModal, false);
        toggleModal(resetModal, true);
    });

    // Manejo del formulario de Login
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm['login-email'].value;
        const password = loginForm['login-password'].value;

        try {
            await AuthService.login(email, password);
            showFeedback('Inicio de Sesión Exitoso', '¡Bienvenido de nuevo!', 'success');
            toggleModal(loginModal, false);
            // La función onAuthStateChanged manejará la actualización de la UI
        } catch (error) {
            console.error("Error al iniciar sesión:", error);
            showFeedback('Error de Inicio de Sesión', error.message, 'error');
        }
    });

    // Manejo del formulario de Reseteo de Contraseña
    resetForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = resetForm['reset-email'].value;

        try {
            await AuthService.resetPassword(email);
            showFeedback('Correo Enviado', 'Se ha enviado un enlace para restablecer tu contraseña a tu correo electrónico.', 'info');
            toggleModal(resetModal, false);
        } catch (error) {
            console.error("Error al restablecer contraseña:", error);
            showFeedback('Error', error.message, 'error');
        }
    });

    // Manejo del botón de Logout
    logoutBtn?.addEventListener('click', async () => {
        try {
            await AuthService.logout();
            showFeedback('Sesión Cerrada', 'Has cerrado tu sesión correctamente.', 'info');
            // La función onAuthStateChanged manejará la actualización de la UI
            window.location.href = 'index.html'; // Redirigir a la página de inicio
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            showFeedback('Error al Cerrar Sesión', error.message, 'error');
        }
    });

    // Listener de cambios de estado de autenticación de Firebase
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Usuario logueado
            guestButtons.style.display = 'none';
            userInfo.style.display = 'flex';
            userNameDisplay.textContent = user.displayName || user.email.split('@')[0];
            
            // Actualizar avatar en el header
            if (user.photoURL) {
                userAvatarDisplay.src = user.photoURL;
            } else {
                // Generar avatar por defecto si no hay photoURL
                const initials = (user.displayName || user.email)[0]?.toUpperCase() || 'U';
                userAvatarDisplay.src = `https://placehold.co/40x40/e63946/ffffff?text=${initials}`;
            }

            // Mostrar enlaces de perfil y compras
            if (profileLink) profileLink.style.display = 'block';
            if (ordersLink) ordersLink.style.display = 'block';

        } else {
            // Usuario no logueado
            guestButtons.style.display = 'flex';
            userInfo.style.display = 'none';
            
            // Ocultar enlaces de perfil y compras
            if (profileLink) profileLink.style.display = 'none';
            if (ordersLink) ordersLink.style.display = 'none';
        }
    });
}
