// Importaciones Firebase v9 (modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
  getFirestore, doc, setDoc, getDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { 
  getAuth, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
  authDomain: "mitienda-c2609.firebaseapp.com",
  projectId: "mitienda-c2609",
  storageBucket: "mitienda-c2609.appspot.com",
  messagingSenderId: "536746062790",
  appId: "1:536746062790:web:6e545efbc8f037e36538c7"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Variables globales
let cart = [];
let currentUser = null;

// Observador de autenticación
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  loadCart();
});

// Funciones del carrito
function updateCartUI() {
  const cartItems = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');
  
  if (cartItems) {
    cartItems.innerHTML = cart.length > 0 ? '' : `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <p>Tu carrito está vacío</p>
      </div>
    `;

    let total = 0;
    cart.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'cart-item';
      itemElement.innerHTML = `
        <div class="cart-item-info">
          <span>${item.name}</span>
          <span>${item.quantity} x $${item.price.toFixed(2)}</span>
        </div>
        <button class="remove-item" data-id="${item.id}">🗑️</button>
      `;
      cartItems.appendChild(itemElement);
      total += item.price * item.quantity;
    });

    if (cartTotal) cartTotal.textContent = total.toFixed(2);
  }
  updateCartCounter();
}

function updateCartCounter() {
  const counter = document.getElementById('cartCounter');
  if (counter) {
    counter.textContent = cart.reduce((total, item) => total + item.quantity, 0);
  }
}

async function saveCartToFirestore() {
  try {
    const userId = currentUser ? currentUser.uid : 'guest';
    await setDoc(doc(db, 'carts', userId), {
      items: cart,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    console.error("Error al guardar en Firestore:", error);
    localStorage.setItem('cart', JSON.stringify(cart));
  }
}

async function loadCart() {
  try {
    const localCart = localStorage.getItem('cart');
    if (localCart) {
      cart = JSON.parse(localCart);
      updateCartUI();
    }
    
    const userId = currentUser ? currentUser.uid : 'guest';
    const docSnap = await getDoc(doc(db, 'carts', userId));
    
    if (docSnap.exists()) {
      cart = docSnap.data().items || [];
      updateCartUI();
    }
  } catch (error) {
    console.error("Error al cargar el carrito:", error);
  }
}

function proceedToCheckout() {
  if (cart.length === 0) {
    alert("🛒 Tu carrito está vacío");
    return false;
  }

  const checkoutData = {
    items: [...cart],
    total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  };

  localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
  sessionStorage.setItem('tempCheckout', JSON.stringify(checkoutData));

  // Redirección garantizada
  window.location.href = 'pago.html';
  return true;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  loadCart();

  document.getElementById('checkoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    proceedToCheckout();
  });

  document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', function() {
      const product = {
        id: this.dataset.id,
        name: this.dataset.name,
        price: parseFloat(this.dataset.price),
        quantity: 1
      };

      const existingItem = cart.find(item => item.id === product.id);
      if (existingItem) {
        existingItem.quantity++;
      } else {
        cart.push(product);
      }

      saveCartToFirestore();
      updateCartUI();
    });
  });

  const cartModal = document.getElementById('cartModal');
  if (cartModal) {
    document.getElementById('cartIcon')?.addEventListener('click', () => {
      cartModal.style.display = 'block';
    });

    document.querySelector('.close-modal')?.addEventListener('click', () => {
      cartModal.style.display = 'none';
    });
  }
});
