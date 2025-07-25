// assets/js/main.js
import { auth } from './firebase-config.js'; // Importar auth para cambios de estado global
import { AuthService } from './auth.js';
import { ProductService } from './products.js';
import { CartService } from './cart.js';
import { showFeedback, showLoading } from './feedback.js';
import { AuthUI } from './auth-ui.js';
import { ProductsUI } from './products-ui.js';
import { CartUI } from './cart-ui.js';


document.addEventListener('DOMContentLoaded', () => {
    // Inicializar componentes de UI
    AuthUI.init();
    ProductsUI.init();
    CartUI.init();

    // Listeners globales para cambios de estado de autenticación (ej. actualizar UI del header)
    AuthService.onAuthStateChanged(user => {
        const openLoginBtn = document.getElementById('open-login-btn');
        const userAvatarHeader = document.getElementById('user-avatar'); // Asumiendo un avatar en el header
        const userNameHeader = document.getElementById('user-name-header'); // Asumiendo un nombre en el header
        const logoutBtnHeader = document.getElementById('logout-btn'); // Asumiendo un botón de cerrar sesión en el header

        if (user) {
            // Usuario ha iniciado sesión
            if (openLoginBtn) openLoginBtn.style.display = 'none';
            if (userAvatarHeader) {
                userAvatarHeader.src = user.photoURL || '/assets/imagenes/default-avatar.png'; // Avatar predeterminado
                userAvatarHeader.style.display = 'block';
            }
            if (userNameHeader) {
                userNameHeader.textContent = user.displayName || user.email;
                userNameHeader.style.display = 'block';
            }
            if (logoutBtnHeader) logoutBtnHeader.style.display = 'block';
        } else {
            // Usuario ha cerrado sesión
            if (openLoginBtn) openLoginBtn.style.display = 'block';
            if (userAvatarHeader) userAvatarHeader.style.display = 'none';
            if (userNameHeader) userNameHeader.style.display = 'none';
            if (logoutBtnHeader) logoutBtnHeader.style.display = 'none';
        }
    });

    // Ejemplo: Manejar botón de búsqueda (si existe en index.html)
    const searchButton = document.querySelector('.search-button');
    const searchInput = document.querySelector('.search-input');
    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                showFeedback('Búsqueda', `Buscando: ${query}`, 'info');
                // Implementar lógica de búsqueda real o redirigir a página de productos con query
                window.location.href = `productos.html?q=${encodeURIComponent(query)}`;
            } else {
                showFeedback('Información', 'Por favor, introduce un término de búsqueda.', 'info');
            }
        });
    }

    // Desplazamiento suave para enlaces de navegación (si es común entre páginas)
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // Cierre general del modal de feedback (si existe un modal de feedback compartido)
    const feedbackModal = document.getElementById('feedback-modal');
    if (feedbackModal) {
        const closeFeedbackBtn = feedbackModal.querySelector('.close-modal-btn');
        if (closeFeedbackBtn) {
            closeFeedbackBtn.addEventListener('click', () => {
                feedbackModal.classList.remove('active');
            });
        }
    }
});

// Exponer funciones globales si es necesario para scripts en línea antiguos o acceso directo
window.showFeedback = showFeedback;
window.showLoading = showLoading;
