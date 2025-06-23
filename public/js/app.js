import { app, db, auth } from './firebase-config.js';
import { 
  doc, setDoc, getDoc, serverTimestamp,
  collection, addDoc 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// ==================== VARIABLES GLOBALES ====================
let cart = [];
let currentUser = null;

// ==================== FUNCIONES DEL CARRITO ====================

/**
 * Carga el carrito desde Firestore (usuario) o localStorage (invitado)
 */
async function loadCart() {
  try {
    // Limpiar carrito si se completó un pago
    if (sessionStorage.getItem('clearCartOnLoad')) {
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

    // 1. Cargar desde localStorage
    const localCart = localStorage.getItem('cart');
    if (localCart) cart = JSON.parse(localCart);

    // 2. Sincronizar con Firestore si hay usuario
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

/**
 * Actualiza la interfaz del carrito (modal + contador)
 */
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

/**
 * Actualiza el contador del ícono del carrito
 */
function updateCartCounter() {
  const counter = document.getElementById('cartCounter');
  if (counter) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    counter.textContent = totalItems;
    counter.style.display = totalItems > 0 ? 'inline-block' : 'none';
  }
}

/**
 * Guarda el carrito en Firestore o localStorage
 */
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
    console.error("Error al guardar el carrito:", error);
    localStorage.setItem('cart', JSON.stringify(cart));
  }
}

// ==================== OPERACIONES DEL CARRITO ====================

/**
 * Añade un producto al carrito (exportada para uso en productos.html)
 */
export function addToCart(product) {
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
  showFeedback(`${product.name} añadido al carrito`, 'success');
}

/**
 * Elimina un producto del carrito
 */
function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCartToFirestore();
  updateCartUI();
}

/**
 * Modifica la cantidad de un producto
 */
function updateQuantity(productId, newQuantity) {
  const item = cart.find(item => item.id === productId);
  if (item) {
    item.quantity = Math.max(1, newQuantity);
    saveCartToFirestore();
    updateCartUI();
  }
}

// ==================== CHECKOUT ====================

/**
 * Procesa el checkout (exportada para uso en productos.html)
 */
export async function proceedToCheckout() {
  if (cart.length === 0) {
    showFeedback('Tu carrito está vacío', 'error');
    return false;
  }

  try {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.12;
    const total = subtotal + tax;

    const checkoutData = {
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image || 'img/default-product.webp'
      })),
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      userId: currentUser?.uid || `guest_${Date.now()}`,
      userEmail: currentUser?.email || null,
      isGuest: !currentUser,
      createdAt: new Date().toISOString()
    };

    // Guardar en múltiples lugares para redundancia
    localStorage.setItem('currentCheckout', JSON.stringify(checkoutData));
    sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));

    if (currentUser) {
      await addDoc(collection(db, 'checkouts'), {
        ...checkoutData,
        status: 'pending',
        createdAt: serverTimestamp()
      });
    }

    window.location.href = 'pago.html';
    return true;
  } catch (error) {
    console.error('Error en checkout:', error);
    showFeedback('Error al procesar el pedido', 'error');
    return false;
  }
}

// ==================== UTILIDADES ====================

/**
 * Muestra notificaciones al usuario
 */
function showFeedback(message, type = 'success') {
  const feedback = document.createElement('div');
  feedback.className = `feedback ${type}`;
  feedback.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(feedback);
  setTimeout(() => feedback.remove(), 3000);
}

// ==================== INICIALIZACIÓN ====================

/**
 * Función principal de inicialización (exportada para productos.html)
 */
export function initializeCart() {
  console.log("Inicializando sistema de carrito...");

  // 1. Configurar observador de autenticación
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    loadCart();
  });

  // 2. Manejador de eventos delegado (para elementos dinámicos)
  document.addEventListener('click', (e) => {
    // Añadir al carrito
    if (e.target.closest('.add-to-cart')) {
      const button = e.target.closest('.add-to-cart');
      addToCart({
        id: button.dataset.id,
        name: button.dataset.name,
        price: parseFloat(button.dataset.price),
        image: button.dataset.image || ''
      });
    }
    
    // Eliminar producto
    if (e.target.closest('.remove-item')) {
      removeFromCart(e.target.closest('.remove-item').dataset.id);
    }
    
    // Modificar cantidad
    if (e.target.closest('.quantity-btn')) {
      const btn = e.target.closest('.quantity-btn');
      const item = cart.find(item => item.id === btn.dataset.id);
      if (item) {
        const newQuantity = btn.classList.contains('plus') 
          ? item.quantity + 1 
          : item.quantity - 1;
        updateQuantity(item.id, newQuantity);
      }
    }
    
    // Checkout
    if (e.target.closest('#checkoutBtn')) {
      e.preventDefault();
      proceedToCheckout();
    }
  });

  // 3. Configurar modal del carrito
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

    cartModal.addEventListener('click', (e) => {
      if (e.target === cartModal) {
        cartModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }
}
