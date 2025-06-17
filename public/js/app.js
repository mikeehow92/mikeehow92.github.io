// Inicialización de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
  authDomain: "mitienda-c2609.firebaseapp.com",
  projectId: "mitienda-c2609",
  storageBucket: "mitienda-c2609.appspot.com",
  messagingSenderId: "536746062790",
  appId: "1:536746062790:web:6e545efbc8f037e36538c7"
};

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Variables globales
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Función para guardar el carrito
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCounter();
}

// Actualizar interfaz del carrito
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

// Función para proceder al pago (Mejorada)
function proceedToCheckout() {
  if (cart.length === 0) {
    alert("🛒 Tu carrito está vacío");
    return false;
  }

  // Guardar en localStorage y sessionStorage como respaldo
  const checkoutData = {
    items: cart,
    total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    timestamp: new Date().getTime()
  };

  localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
  sessionStorage.setItem('tempCheckoutData', JSON.stringify(checkoutData));

  // Redirección con verificación
  setTimeout(() => {
    window.location.href = 'pago.html';
  }, 100);
  return true;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Cargar carrito al iniciar
  const savedCart = localStorage.getItem('cart');
  if (savedCart) cart = JSON.parse(savedCart);
  updateCartUI();

  // Botón de pago
  document.getElementById('checkoutBtn')?.addEventListener('click', proceedToCheckout);

  // Añadir productos
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

      saveCart();
      updateCartUI();
    });
  });

  // Modal del carrito
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
