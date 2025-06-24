import { getFirebaseServices } from './firebase/firebase-config';
import { initAuthUI } from './auth/auth-ui';
import { initProductsUI } from './products/products-ui';
import { initCartUI } from './cart/cart-ui';
import { showFeedback } from './shared/feedback';

/**
 * Inicializa la aplicación
 */
const initApp = async () => {
  try {
    // 1. Inicializar servicios Firebase
    const { auth, db } = getFirebaseServices();
    
    // 2. Verificar autenticación inicial
    auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('Usuario autenticado:', user.email);
      } else {
        console.log('No autenticado (modo invitado)');
      }
    });

    // 3. Inicializar módulos UI
    initAuthUI();
    initProductsUI();
    initCartUI();
    
    // 4. Mostrar feedback de carga
    showFeedback('Aplicación cargada', 'success');
    
  } catch (error) {
    console.error('Error al inicializar la app:', error);
    showFeedback('Error al cargar la aplicación', 'error');
  }
};

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initApp);

// Exportar para pruebas (opcional)
export { initApp };
