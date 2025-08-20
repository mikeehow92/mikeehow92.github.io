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
    }, 3000); // Elimina la alerta después de 3 segundos
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
        console.warn("La función window.updateCartDisplay no está definida. La UI del carrito no se actualizará.");
    }
}

// Añadir un producto al carrito
function addToCart(product) {
    const cart = getCart();
    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart(cart);
    showAlert('Producto añadido al carrito.', 'success');
}

// Remover un producto del carrito
function removeFromCart(productId) {
    const cart = getCart();
    const updatedCart = cart.filter(item => item.id !== productId);
    saveCart(updatedCart);
    showAlert('Producto eliminado del carrito.', 'info');
}

// Actualizar la cantidad de un artículo en el carrito
function updateCartItemQuantity(productId, quantity) {
    const cart = getCart();
    const itemToUpdate = cart.find(item => item.id === productId);

    if (itemToUpdate) {
        if (quantity > 0) {
            itemToUpdate.quantity = quantity;
        } else {
            removeFromCart(productId);
            return;
        }
    }
    saveCart(cart);
}

// Calcular el total del carrito
function getCartTotal() {
    const cart = getCart();
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

// Exponer las funciones del carrito al ámbito global
window.getCart = getCart;
window.saveCart = saveCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.getCartTotal = getCartTotal;

// --- Lógica de Firebase y Autenticación (se ejecuta al cargar la página) ---

// Recomendación: Mantén la inicialización de Firebase aquí. Esto asegura que la
// inicialización se haga una vez y se exporte.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
// AÑADIDO: Importa getFunctions para Cloud Functions
import { getFunctions } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";

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
const storage = getStorage(app);
// AÑADIDO: Inicializa Firebase Functions
const functions = getFunctions(app);

// Exporta las instancias de Firebase para que otros scripts puedan usarlas
window.firebaseApp = app;
window.firebaseDb = db;
window.firebaseAuth = auth;
window.firebaseStorage = storage;
// AÑADIDO: Exporta firebaseFunctions
window.firebaseFunctions = functions;


document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('loginButton');
    const loggedInUserDisplay = document.getElementById('loggedInUserDisplay');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const profileAvatarHeader = document.getElementById('profileAvatarHeader');
    const logoutButton = document.getElementById('logoutButton');

    // Maneja el estado de la autenticación
    onAuthStateChanged(auth, async (user) => {
        const navCarrito = document.getElementById('navCarrito');
        const cartItemCountElement = document.getElementById('cartItemCount');

        if (user) {
            console.log("Usuario autenticado:", user.uid);
            window.currentUserIdGlobal = user.uid;
            
            // Oculta el botón de login y muestra la info del usuario
            if (loginButton) loginButton.classList.add('hidden');
            if (loggedInUserDisplay) loggedInUserDisplay.classList.remove('hidden');
            if (userNameDisplay) userNameDisplay.textContent = user.displayName || user.email;

            // Carga la foto de perfil del usuario desde Storage
            if (profileAvatarHeader && storage) {
                try {
                    const avatarRefPng = ref(storage, `avatars/${user.uid}.png`);
                    const avatarUrl = await getDownloadURL(avatarRefPng);
                    profileAvatarHeader.src = avatarUrl;
                } catch (pngError) {
                    try {
                        const avatarRefJpg = ref(storage, `avatars/${user.uid}.jpg`);
                        const avatarUrl = await getDownloadURL(avatarRefJpg);
                        profileAvatarHeader.src = avatarUrl;
                    } catch (jpgError) {
                        profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A';
                    }
                }
            }

        } else {
            console.log("No hay usuario autenticado. Sesión como invitado.");
            // Muestra el botón de login y oculta la info del usuario
            if (loginButton) loginButton.classList.remove('hidden');
            if (loggedInUserDisplay) loggedInUserDisplay.classList.add('hidden');
            if (profileAvatarHeader) profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A';

            // Crea o recupera un ID de invitado para el carrito
            let guestId = sessionStorage.getItem('guestUserId');
            if (!guestId) {
                guestId = `guest_${crypto.randomUUID()}`;
                sessionStorage.setItem('guestUserId', guestId);
            }
            window.currentUserIdGlobal = guestId;
        }

        // Si la página tiene el carrito, actualiza la visualización
        if (navCarrito) {
            navCarrito.classList.remove('hidden');
            const cartItemCount = getCart().length;
            if (cartItemCountElement) {
                cartItemCountElement.textContent = cartItemCount;
                cartItemCountElement.classList.toggle('hidden', cartItemCount === 0);
            }
        }
    });

    if (loginButton) {
        loginButton.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await signOut(auth);
                showAlert('Has cerrado sesión correctamente.', 'success');
                console.log("Cierre de sesión exitoso.");
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Error al cerrar sesión:', error.message);
                showAlert('Error al cerrar sesión. Por favor, inténtalo de nuevo.', 'error');
            }
        });
    }

    // Código para manejar la carga dinámica del SDK de PayPal
    window.loadPayPalSDK = function() {
        const paypalScriptId = 'paypal-sdk-script';
        if (!document.getElementById(paypalScriptId)) {
            const script = document.createElement('script');
            script.id = paypalScriptId;
            script.src = `https://www.paypal.com/sdk/js?client-id=AQJv8-r9dF987T3GkP1h9H9wA_xL9ZtN8_WqgV9V8_R4mS5D4_wYv4T8_xQkK9P6_zV7z8R6v_g8j9k&currency=USD`;
            script.async = true;
            script.onload = () => {
                console.log('PayPal SDK cargado dinámicamente.');
                document.dispatchEvent(new CustomEvent('paypalSDKLoaded'));
            };
            document.body.appendChild(script);
        }
    }
});
