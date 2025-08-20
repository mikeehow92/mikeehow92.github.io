// js/common.js

// Funciones de utilidad para el carrito y UI
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
    }, 3000);
}
window.alert = showAlert;

function getCart() {
    const cart = localStorage.getItem('shoppingCart');
    return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
    localStorage.setItem('shoppingCart', JSON.stringify(cart));
    if (typeof window.updateCartDisplay === 'function') {
        window.updateCartDisplay();
    } else {
        console.warn("window.updateCartDisplay no está definida. La UI del carrito no se actualizará.");
    }
}

function addToCart(product) {
    let cart = getCart();
    const existingProductIndex = cart.findIndex(item => item.id === product.id);
    if (existingProductIndex > -1) {
        cart[existingProductIndex].quantity += product.quantity || 1;
    } else {
        cart.push({ ...product, quantity: product.quantity || 1 });
    }
    saveCart(cart);
    showAlert(`"${product.name}" añadido al carrito.`, 'success');
}

function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    showAlert('Producto eliminado del carrito.', 'info');
}

function updateCartItemQuantity(productId, newQuantity) {
    let cart = getCart();
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = newQuantity;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart(cart);
        }
    }
}

function getCartTotal() {
    return getCart().reduce((total, item) => total + (item.price * item.quantity), 0);
}

window.getCart = getCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.getCartTotal = getCartTotal;
window.showAlert = showAlert;

// Carga del SDK de PayPal
const PAYPAL_CLIENT_ID = 'AVQpOYnmo31PwFuK1rNOHJN-zp6cHl1BdMkac2K0PhJ2ucmHSosW8iKg4fWHiF817wVu6y9jcAL9ibFd';

function loadPayPalSDK() {
    if (document.getElementById('paypal-sdk')) {
        return;
    }
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
    script.id = 'paypal-sdk';
    script.async = true;
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
window.loadPayPalSDK = loadPayPalSDK;

// --- Inicialización de Firebase y Lógica de Autenticación ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app);

window.firebaseApp = app;
window.firebaseDb = db;
window.firebaseAuth = auth;
window.firebaseStorage = storage;
window.firebaseFunctions = functions;
window.currentUserIdGlobal = null;

document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('loginButton');
    const loggedInUserDisplay = document.getElementById('loggedInUserDisplay');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const profileAvatarHeader = document.getElementById('profileAvatarHeader');
    const logoutButton = document.getElementById('logoutButton');
    const navCarrito = document.getElementById('navCarrito');
    const cartItemCountElement = document.getElementById('cartItemCount');

    // Maneja el estado de autenticación de forma asíncrona
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("Usuario autenticado globalmente:", user.uid);
            window.currentUserIdGlobal = user.uid;
            if (loginButton) loginButton.classList.add('hidden');
            if (loggedInUserDisplay) loggedInUserDisplay.classList.remove('hidden');
            if (userNameDisplay) userNameDisplay.textContent = user.displayName || user.email;

            if (profileAvatarHeader) {
                if (user.photoURL) {
                    profileAvatarHeader.src = user.photoURL;
                } else {
                    try {
                        const avatarRef = ref(storage, `avatars/${user.uid}.png`);
                        const avatarUrl = await getDownloadURL(avatarRef);
                        profileAvatarHeader.src = avatarUrl;
                    } catch (error) {
                        profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A';
                    }
                }
            }

        } else {
            console.log("No hay usuario autenticado. Sesión como invitado.");
            if (loginButton) loginButton.classList.remove('hidden');
            if (loggedInUserDisplay) loggedInUserDisplay.classList.add('hidden');
            if (profileAvatarHeader) profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A';

            let guestId = sessionStorage.getItem('guestUserId');
            if (!guestId) {
                guestId = `guest_${crypto.randomUUID()}`;
                sessionStorage.setItem('guestUserId', guestId);
            }
            window.currentUserIdGlobal = guestId;
        }

        // Asegura que los elementos del carrito se actualicen
        if (navCarrito) {
            navCarrito.classList.remove('hidden');
            const cart = getCart();
            const totalItemsInCart = cart.reduce((total, item) => total + item.quantity, 0);
            if (cartItemCountElement) {
                cartItemCountElement.textContent = totalItemsInCart;
                cartItemCountElement.classList.toggle('hidden', totalItemsInCart === 0);
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
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Error al cerrar sesión:', error.message);
                showAlert('Error al cerrar sesión. Por favor, inténtalo de nuevo.', 'error');
            }
        });
    }
});
