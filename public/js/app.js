// Importaciones Firebase v9 (modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
  getFirestore, doc, setDoc, getDoc, serverTimestamp,
  collection, addDoc
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
          <span class="cart-item-name">${item.name}</span>
          <div class="cart-item-controls">
            <button class="quantity-btn minus" data-id="${item.id}">-</button>
            <span class="item-quantity">${item.quantity}</span>
            <button class="quantity-btn plus" data-id="${item.id}">+</button>
          </div>
          <span class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
        <button class="remove-item" data-id="${item.id}">
          <i class="fas fa-trash"></i>
        </button>
      `;
      cartItems.appendChild(itemElement);
      total += item.price * item.quantity;
    });

    if (cartTotal) cartTotal.innerHTML = `$${total.toFixed(2)}`;
    
    // Actualizar total en botón de pago si existe
    const paymentTotal = document.getElementById('paymentTotal');
    if (paymentTotal) paymentTotal.textContent = total.toFixed(2);
  }
  updateCartCounter();
}

function updateCartCounter() {
  const counter = document.getElementById('cartCounter');
  if (counter) {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    counter.textContent = totalItems;
    counter.style.display = totalItems > 0 ? 'inline-block' : 'none';
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
    // Cargar del localStorage primero
    const localCart = localStorage.getItem('cart');
    if (localCart) {
      cart = JSON.parse(localCart);
      updateCartUI();
    }
    
    // Si hay usuario, cargar desde Firestore
    if (currentUser) {
      const userId = currentUser.uid;
      const docSnap = await getDoc(doc(db, 'carts', userId));
      
      if (docSnap.exists()) {
        cart = docSnap.data().items || [];
        updateCartUI();
        localStorage.setItem('cart', JSON.stringify(cart));
      }
    }
  } catch (error) {
    console.error("Error al cargar el carrito:", error);
  }
}

function addToCart(product) {
  const existingItem = cart.find(item => item.id === product.id);
  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({...product, quantity: 1});
  }
  saveCartToFirestore();
  updateCartUI();
  
  // Feedback visual
  const feedback = document.createElement('div');
  feedback.className = 'cart-feedback';
  feedback.innerHTML = `<i class="fas fa-check"></i> ${product.name} añadido`;
  document.body.appendChild(feedback);
  setTimeout(() => feedback.remove(), 2000);
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCartToFirestore();
  updateCartUI();
}

function updateQuantity(productId, newQuantity) {
  const item = cart.find(item => item.id === productId);
  if (item) {
    item.quantity = Math.max(1, newQuantity);
    saveCartToFirestore();
    updateCartUI();
  }
}

async function proceedToCheckout() {
  if (cart.length === 0) {
    showFeedback('🛒 Tu carrito está vacío', 'error');
    return false;
  }

  try {
    const checkoutData = {
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      subtotal: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      tax: calculateTax(),
      total: calculateTotal(),
      createdAt: new Date().toISOString(),
      userId: currentUser?.uid || 'guest'
    };

    // Guardar en múltiples lugares
    localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
    sessionStorage.setItem('tempCheckout', JSON.stringify(checkoutData));
    
    // Guardar en Firestore si hay usuario
    if (currentUser) {
      await addDoc(collection(db, 'checkouts'), {
        ...checkoutData,
        status: 'pending',
        user: {
          uid: currentUser.uid,
          email: currentUser.email || 'guest'
        }
      });
    }

    // Redireccionar
    window.location.href = 'pago.html';
    return true;
  } catch (error) {
    console.error('Error en checkout:', error);
    showFeedback('Error al procesar tu pedido', 'error');
    return false;
  }
}

function calculateTax() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  return parseFloat((subtotal * 0.12).toFixed(2)); // 12% de IVA
}

function calculateTotal() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = calculateTax();
  return parseFloat((subtotal + tax).toFixed(2));
}

function showFeedback(message, type = 'success') {
  const feedback = document.createElement('div');
  feedback.className = `feedback ${type}`;
  feedback.textContent = message;
  document.body.appendChild(feedback);
  setTimeout(() => feedback.remove(), 3000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  loadCart();

  // Delegación de eventos
  document.addEventListener('click', function(e) {
    // Añadir al carrito
    if (e.target.closest('.add-to-cart')) {
      const button = e.target.closest('.add-to-cart');
      const product = {
        id: button.dataset.id,
        name: button.dataset.name,
        price: parseFloat(button.dataset.price),
        image: button.dataset.image || ''
      };
      addToCart(product);
    }
    
    // Eliminar item
    if (e.target.closest('.remove-item')) {
      const productId = e.target.closest('.remove-item').dataset.id;
      removeFromCart(productId);
    }
    
    // Aumentar cantidad
    if (e.target.closest('.quantity-btn.plus')) {
      const productId = e.target.closest('.quantity-btn').dataset.id;
      const item = cart.find(item => item.id === productId);
      if (item) updateQuantity(productId, item.quantity + 1);
    }
    
    // Disminuir cantidad
    if (e.target.closest('.quantity-btn.minus')) {
      const productId = e.target.closest('.quantity-btn').dataset.id;
      const item = cart.find(item => item.id === productId);
      if (item) updateQuantity(productId, item.quantity - 1);
    }
    
    // Checkout
    if (e.target.closest('#checkoutBtn')) {
      e.preventDefault();
      proceedToCheckout();
    }
  });

  // Modal del carrito
  const cartModal = document.getElementById('cartModal');
  if (cartModal) {
    document.getElementById('cartIcon')?.addEventListener('click', () => {
      cartModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });

    document.querySelector('.close-modal')?.addEventListener('click', () => {
      cartModal.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
});
