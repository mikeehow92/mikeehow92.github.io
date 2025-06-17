// Firebase v9 modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
  authDomain: "mitienda-c2609.firebaseapp.com",
  projectId: "mitienda-c2609",
  storageBucket: "mitienda-c2609.appspot.com",
  messagingSenderId: "536746062790",
  appId: "1:536746062790:web:6e545efbc8f037e36538c7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let cart = [];
let currentUser = null;

onAuthStateChanged(auth, user => {
  currentUser = user;
  loadCart();
});

// ========== Funciones compartidas ==========
function updateCartCounter() {
  const counter = document.getElementById('cartCounter');
  if (counter) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    counter.textContent = totalItems;
    counter.style.display = totalItems > 0 ? 'inline-block' : 'none';
  }
}

async function loadCart() {
  try {
    const localCart = localStorage.getItem('cart');
    if (localCart) {
      cart = JSON.parse(localCart);
    }
    if (currentUser) {
      const docSnap = await getDoc(doc(db, 'carts', currentUser.uid));
      if (docSnap.exists()) {
        cart = docSnap.data().items || cart;
        localStorage.setItem('cart', JSON.stringify(cart));
      }
    }
    updateCartCounter();
    updateCheckoutUI();
  } catch (err) {
    console.error("Error al cargar el carrito:", err);
  }
}

function updateCheckoutUI() {
  const orderItems = document.getElementById('orderItems');
  const orderTotal = document.getElementById('orderTotal');
  const paymentTotal = document.getElementById('paymentTotal');

  if (!orderItems || !orderTotal || !paymentTotal) return;

  if (!cart || cart.length === 0) {
    orderItems.innerHTML = `
      <div class="error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>No se encontraron productos. Redirigiendo...</p>
      </div>
    `;
    setTimeout(() => window.location.href = 'productos.html', 2000);
    return;
  }

  let html = '';
  let total = 0;

  cart.forEach(item => {
    html += `
      <div class="order-item">
        <span>${item.name}</span>
        <span class="item-quantity">${item.quantity} ×</span>
        <span class="item-price">$${item.price.toFixed(2)}</span>
      </div>
    `;
    total += item.price * item.quantity;
  });

  orderItems.innerHTML = html;
  orderTotal.textContent = total.toFixed(2);
  paymentTotal.textContent = total.toFixed(2);
}

function clearCartAndRedirect() {
  localStorage.removeItem('cart');
  localStorage.removeItem('checkoutData');
  sessionStorage.removeItem('tempCheckout');
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  // Verificamos si estamos en la página de pago
  if (document.getElementById('paymentForm')) {
    document.getElementById('paymentForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      // Aquí podrías validar campos, pero hacemos una simulación:
      alert('✅ Pago procesado correctamente');

      // Opción: guardar en Firestore
      try {
        if (currentUser) {
          await addDoc(collection(db, 'pagos'), {
            userId: currentUser.uid,
            items: cart,
            total: cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
            timestamp: serverTimestamp(),
            estado: 'completado'
          });
        }
      } catch (e) {
        console.error("Error guardando el pago:", e);
      }

      clearCartAndRedirect();
    });
  }
});
