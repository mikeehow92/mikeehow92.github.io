// Configuración de Firebase (RELLENA CON TUS DATOS)
const firebaseConfig = {
  apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
  authDomain: "mitienda-c2609.firebaseapp.com",
  projectId: "mitienda-c2609",
  storageBucket: "mitienda-c2609.firebasestorage.app",
  messagingSenderId: "536746062790",
  appId: "1:536746062790:web:6e545efbc8f037e36538c7"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Variables globales
let cart = [];

// Función para guardar en localStorage y Firebase
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  
  // Opcional: Guardar en Firebase si hay usuario logueado
  const user = firebase.auth().currentUser;
  if (user) {
    db.collection('carts').doc(user.uid).set({
      items: cart,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(error => {
      console.error("Error al guardar en Firebase:", error);
    });
  }
}

// Cargar carrito desde localStorage
function loadCart() {
  const savedCart = localStorage.getItem('cart');
  if (savedCart) {
    cart = JSON.parse(savedCart);
    updateCartUI();
  }
}

// Actualizar interfaz del carrito
function updateCartUI() {
  const cartItemsContainer = document.getElementById('cartItems');
  const cartTotalElement = document.getElementById('cartTotal');
  
  if (cartItemsContainer) {
    cartItemsContainer.innerHTML = cart.length > 0 ? '' : `
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
      cartItemsContainer.appendChild(itemElement);
      total += item.price * item.quantity;
    });

    if (cartTotalElement) {
      cartTotalElement.textContent = total.toFixed(2);
    }
  }

  // Actualizar contador
  const cartCounter = document.getElementById('cartCounter');
  if (cartCounter) {
    cartCounter.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  }
}

// Función para proceder al pago (Versión Mejorada)
function proceedToCheckout() {
  if (cart.length === 0) {
    alert("⚠️ Tu carrito está vacío");
    return;
  }

  // Guardar datos para la página de pago
  const checkoutData = {
    items: cart,
    total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    timestamp: new Date().getTime()
  };

  localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
  
  // Redirección con verificación
  try {
    window.location.href = 'pago.html';
  } catch (error) {
    console.error("Error en redirección:", error);
    alert("Error al redirigir a la página de pago");
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  loadCart();

  // Botón "Proceder al pago"
  document.getElementById('checkoutBtn')?.addEventListener('click', proceedToCheckout);

  // Botones "Añadir al carrito"
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
      alert(`✔ ${product.name} añadido al carrito`);
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
