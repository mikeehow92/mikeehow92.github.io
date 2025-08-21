// js/common.js

// Función de utilidad para mostrar alertas personalizadas en lugar de alert()
function showAlert(message, type = 'info') {
    const alertBox = document.createElement('div');
    alertBox.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white z-50`;
    if (type === 'info') {
        alertBox.classList.add('bg-blue-500');
    } else if (type === 'success') {
        alertBox.classList.add('bg-green-500');
    } else if (type === 'error') {
        alertBox.classList.add('bg-red-500');
    }

    alertBox.textContent = message;
    document.body.appendChild(alertBox);

    setTimeout(() => {
        alertBox.remove();
    }, 7000); // Elimina la alerta después de 5 segundos
}

// Reemplaza el 'alert' global con nuestra función personalizada
window.alert = showAlert;

// --- Lógica del Carrito de Compras ---

// Obtener el carrito desde localStorage o inicializarlo
function getCart() {
    const cart = localStorage.getItem('shoppingCart');
    return cart ? JSON.parse(cart) : [];
}

// Guardar el carrito en localStorage
function saveCart(cart) {
    localStorage.setItem('shoppingCart', JSON.stringify(cart));
    // Llama a la función de actualización de UI que DEBE ser definida por la página específica
    if (typeof window.updateCartDisplay === 'function') {
        window.updateCartDisplay();
    } else {
        console.warn("window.updateCartDisplay no está definida. La UI del carrito no se actualizará.");
    }
}

// Añadir un producto al carrito
function addToCart(product) {
    let cart = getCart();
    const existingProductIndex = cart.findIndex(item => item.id === product.id);

    if (existingProductIndex > -1) {
        // Si el producto ya existe, incrementa la cantidad
        cart[existingProductIndex].quantity += product.quantity || 1;
    } else {
        // Si no existe, añade el nuevo producto
        cart.push({ ...product, quantity: product.quantity || 1 });
    }
    saveCart(cart);
    showAlert(`"${product.name}" añadido al carrito.`, 'success');
}

// Eliminar un producto del carrito
function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    showAlert('Producto eliminado del carrito.', 'info');
}

// Actualizar cantidad de un producto en el carrito
function updateCartItemQuantity(productId, newQuantity) {
    let cart = getCart();
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = newQuantity;
        if (item.quantity <= 0) {
            removeFromCart(productId); // Si la cantidad es 0 o menos, eliminar
        } else {
            saveCart(cart);
        }
    }
}

// Calcular el total del carrito
function getCartTotal() {
    return getCart().reduce((total, item) => total + (item.price * item.quantity), 0);
}

// NOTA IMPORTANTE:
// La función `updateCartDisplay` ya NO se define aquí en common.js.
// Cada script de página (index.js, productos.js, pago.js, detalle-producto.js)
// será responsable de definir `window.updateCartDisplay = function() { ... };`
// para su lógica específica de actualización de UI.


// --- Integración con PayPal ---

// Importa funciones de Firestore para leer datos
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

async function getPayPalClientId() {
    try {
        const db = window.firebaseDb;
        if (!db) {
            console.error("La instancia de Firestore no está disponible.");
            showAlert('Error de configuración. La tienda no puede procesar pagos.', 'error');
            return null;
        }
        
        const docRef = doc(db, "config", "api_keys");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Clave de PayPal obtenida de Firebase.");
            return data.paypalClientId;
        } else {
            console.error("No se encontró el documento de configuración de claves en Firestore.");
            showAlert('Error de configuración. Clave de PayPal no encontrada.', 'error');
            return null;
        }
    } catch (error) {
        console.error("Error al obtener la clave de PayPal:", error);
        showAlert('Hubo un problema al cargar la configuración de pago.', 'error');
        return null;
    }
}

async function loadPayPalSDK() {
    if (document.getElementById('paypal-sdk')) {
        return; // SDK ya cargado
    }

    const PAYPAL_CLIENT_ID = await getPayPalClientId();
    if (!PAYPAL_CLIENT_ID) {
        return; // Si no hay ID, no cargamos el SDK
    }
    
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
    script.id = 'paypal-sdk';
    script.onload = () => {
        console.log('SDK de PayPal cargado.');
        document.dispatchEvent(new CustomEvent('paypalSDKLoaded'));
    };
    script.onerror = () => {
        console.error('Error al cargar el SDK de PayPal.');
        showAlert('Error al cargar PayPal. Por favor, inténtalo de nuevo más tarde.', 'error');
    };
    document.head.appendChild(script);
}

// Exportar funciones para que otras páginas puedan usarlas
window.getCart = getCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.getCartTotal = getCartTotal;
window.loadPayPalSDK = loadPayPalSDK;
window.showAlert = showAlert; 
// window.updateCartDisplay NO se exporta aquí, se espera que cada página lo defina.


// --- Inicialización de Firebase (Descomenta y configura con tus credenciales) ---
// Comentario: Es crucial que esta inicialización se haga una vez y se exporte.
// Puedes instalar Firebase con: npm install firebase
// Luego, asegúrate de que los imports apunten a la versión modular correcta.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
  authDomain: "mitienda-c2609.firebaseapp.com",
  databaseURL: "https://mitienda-c2609-default-rtdb.firebaseio.com",
  projectId: "mitienda-c2609",
  storageBucket: "mitienda-c2609.firebasestorage.app",
  messagingSenderId: "536746062790",
  appId: "1:536746062790:web:6e545efbc8f037e36538c7"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Exporta las instancias de Firebase para que otros scripts puedan usarlas
window.firebaseApp = app;
window.firebaseDb = db;
window.firebaseAuth = auth;

// Opcional: Puedes añadir un listener global para el estado de autenticación aquí
// Si lo haces, asegúrate de que no duplique la lógica en index.js o perfil.js
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Usuario autenticado globalmente:", user.uid);
    } else {
        console.log("Usuario no autenticado globalmente.");
    }
});
