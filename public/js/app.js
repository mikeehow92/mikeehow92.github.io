// Importaciones Firebase v9 (modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
  getFirestore, doc, setDoc, getDoc, serverTimestamp,
  collection, addDoc, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { 
  getAuth, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";
import { AuthService } from './auth.js';

// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
  authDomain: "mitienda-c2609.firebaseapp.com",
  databaseURL: "https://mitienda-c2609-default-rtdb.firebaseio.com",
  projectId: "mitienda-c2609",
  storageBucket: "mitienda-c2609.firebasestorage.app",
  messagingSenderId: "536746062790",
  appId: "1:536746062790:web:cd39eb0057aac14c6538c7"
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

// Funciones del carrito (actualizadas)
async function loadCart() {
  try {
    // Verificar si debemos limpiar el carrito (después de pago completado)
    const shouldClearCart = sessionStorage.getItem('clearCartOnLoad');
    
    if (shouldClearCart) {
      cart = [];
      localStorage.removeItem('cart');
      sessionStorage.removeItem('clearCartOnLoad');
      
      if (currentUser) {
        await setDoc(doc(db, 'carts', currentUser.uid), {
          items: [],
          lastUpdated: serverTimestamp()
        });
      }
      
      updateCartUI();
      return;
    }

    // Carga normal del carrito
    const localCart = localStorage.getItem('cart');
    if (localCart) {
      cart = JSON.parse(localCart);
    }
    
    if (currentUser) {
      const docSnap = await getDoc(doc(db, 'carts', currentUser.uid));
      if (docSnap.exists()) {
        cart = docSnap.data().items || [];
        localStorage.setItem('cart', JSON.stringify(cart));
      }
    }
    
    updateCartUI();
  } catch (error) {
    console.error("Error al cargar el carrito:", error);
    showFeedback('Error al cargar el carrito', 'error');
  }
}

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

    if (cartTotal) cartTotal.textContent = total.toFixed(2);
  }
  updateCartCounter();
}

function updateCartCounter() {
  const counter = document.getElementById('cartCounter');
  if (counter) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    counter.textContent = totalItems;
    counter.style.display = totalItems > 0 ? 'inline-block' : 'none';
  }
}

async function saveCartToFirestore() {
  try {
    if (!currentUser) {
      localStorage.setItem('cart', JSON.stringify(cart));
      return;
    }

    await setDoc(doc(db, 'carts', currentUser.uid), {
      items: cart,
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error("Error al guardar en Firestore:", error);
    localStorage.setItem('cart', JSON.stringify(cart));
  }
}

function addToCart(product) {
  const existingItem = cart.find(item => item.id === product.id);
  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.image || ''
    });
  }
  
  saveCartToFirestore();
  updateCartUI();
  
  // Feedback visual mejorado
  const feedback = document.createElement('div');
  feedback.className = 'cart-feedback show';
  feedback.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <span>${product.name} añadido al carrito</span>
  `;
  document.body.appendChild(feedback);
  setTimeout(() => {
    feedback.classList.remove('show');
    setTimeout(() => feedback.remove(), 300);
  }, 2000);
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
    // Calcular totales
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = parseFloat((subtotal * 0.12).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    // Preparar datos del checkout
    const checkoutData = {
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image || 'img/default-product.webp'
      })),
      subtotal: subtotal,
      tax: tax,
      total: total,
      userId: currentUser ? currentUser.uid : `guest_${Date.now()}`,
      userEmail: currentUser ? currentUser.email : null,
      isGuest: !currentUser,
      createdAt: new Date().toISOString(),
      timestamp: new Date().getTime() // Para identificación única
    };

    // Guardar datos en múltiples lugares para redundancia
    localStorage.setItem('currentCheckout', JSON.stringify(checkoutData));
    sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));
    
    // Backup adicional
    localStorage.setItem('lastCheckoutBackup', JSON.stringify(checkoutData));

    // Guardar en Firestore solo si hay usuario autenticado
    if (currentUser) {
      await addDoc(collection(db, 'checkouts'), {
        ...checkoutData,
        status: 'pending',
        createdAt: serverTimestamp()
      });
    }

    // Redireccionar a pago.html
    window.location.href = 'pago.html';
    return true;
  } catch (error) {
    console.error('Error en checkout:', error);
    showFeedback('Error al procesar tu pedido: ' + error.message, 'error');
    return false;
  }
}

async function migrateGuestCart(user) {
  try {
    const guestCart = localStorage.getItem('cart');
    if (guestCart && user) {
      await setDoc(doc(db, 'carts', user.uid), {
        items: JSON.parse(guestCart),
        lastUpdated: serverTimestamp()
      });
      
      // Limpiar datos locales
      localStorage.removeItem('cart');
      localStorage.removeItem('currentCheckout');
      sessionStorage.removeItem('checkoutData');
      
      // Actualizar el carrito local
      cart = JSON.parse(guestCart);
      updateCartUI();
    }
  } catch (error) {
    console.error("Error al migrar carrito de invitado:", error);
  }
}

function calculateTax() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  return parseFloat((subtotal * 0.12).toFixed(2));
}

function calculateTotal() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = calculateTax();
  return parseFloat((subtotal + tax).toFixed(2));
}

function showFeedback(message, type = 'success') {
  const feedback = document.createElement('div');
  feedback.className = `feedback ${type}`;
  feedback.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(feedback);
  setTimeout(() => {
    feedback.classList.add('hide');
    setTimeout(() => feedback.remove(), 300);
  }, 3000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  loadCart();

  // Delegación de eventos mejorada
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
    
    // Proceder al pago
    if (e.target.closest('#checkoutBtn')) {
      e.preventDefault();
      proceedToCheckout();
    }
  });

  // Modal del carrito mejorado
  const cartModal = document.getElementById('cartModal');
  if (cartModal) {
    const cartIcon = document.getElementById('cartIcon');
    const closeModal = document.querySelector('.close-modal');
    
    if (cartIcon) {
      cartIcon.addEventListener('click', () => {
        cartModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    }

    if (closeModal) {
      closeModal.addEventListener('click', () => {
        cartModal.classList.remove('active');
        document.body.style.overflow = '';
      });
    }

    // Cerrar al hacer clic fuera del modal
    cartModal.addEventListener('click', (e) => {
      if (e.target === cartModal) {
        cartModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }
});

// Exportar funciones necesarias
export { migrateGuestCart, proceedToCheckout, calculateTotal };
