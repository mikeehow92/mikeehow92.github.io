import { app, auth, db, storage } from './firebase-config.js';

// Importa las funciones de inicialización de la UI
// CORRECCIÓN: Cambiado 'productos-ui.js' a 'products-ui.js'
import { initProductsUI } from './products/products-ui.js'; 
import { initCartUI } from './cart/cart-ui.js';
import { setupAuthUI } from './auth/auth-ui.js'; 
import { showFeedback, showLoading } from './shared/feedback.js'; 

// Asegúrate de que las funciones showFeedback y showLoading estén disponibles globalmente
// Esto es necesario porque checkout.js las llama directamente desde window.
window.showFeedback = showFeedback;
window.showLoading = showLoading;

// Función principal para inicializar toda la aplicación
function initializeApp() {
    console.log("Aplicación principal iniciada.");

    // Inicializa la UI de autenticación
    setupAuthUI();

    // Inicializa la UI de productos
    initProductsUI();

    // Inicializa la UI del carrito
    initCartUI();

    // Configura el año actual en el footer
    const currentYearElement = document.getElementById('current-year');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }

    // Smooth scrolling para enlaces internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    console.log("Todas las inicializaciones de la UI completadas.");
}

// Ejecuta la inicialización de la aplicación cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', initializeApp);

// Puedes exportar 'app', 'auth', 'db', 'storage' si otros módulos necesitan acceso directo
export { app, auth, db, storage };
