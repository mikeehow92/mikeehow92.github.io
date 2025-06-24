// app.js - Archivo unificado completo

/**************************************
 * 1. CONSTANTES Y CONFIGURACIÓN INICIAL
 **************************************/
const CART_STORAGE_KEY = 'tecnoexpress_cart';

/**************************************
 * 2. INICIALIZACIÓN DE LA APLICACIÓN
 **************************************/
document.addEventListener('DOMContentLoaded', () => {
  try {
    initAuth();
    initCart();
    initProductos();
    updateAuthUI();
    console.log('Aplicación inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);
    showError('Error al cargar la aplicación. Por favor recarga la página.');
  }
});

/**************************************
 * 3. SISTEMA DE AUTENTICACIÓN
 **************************************/
function initAuth() {
  // Elementos del DOM
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const logoutBtn = document.getElementById('logout-btn');
  const openLoginBtn = document.getElementById('open-login-btn');

  // Manejadores de eventos
  if (openLoginBtn) {
    openLoginBtn.addEventListener('click', () => {
      document.getElementById('login-modal').classList.add('active');
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginForm.querySelector('#login-email').value;
      const password = loginForm.querySelector('#login-password').value;
      
      try {
        // Aquí iría la lógica real de autenticación con Firebase
        console.log('Iniciando sesión con:', email);
        document.getElementById('login-modal').classList.remove('active');
        updateAuthUI({ email });
      } catch (error) {
        showError(error.message);
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      // Lógica de cierre de sesión
      updateAuthUI(null);
      showFeedback('Sesión cerrada correctamente', 'success');
    });
  }
}

function updateAuthUI(user) {
  const guestUI = document.getElementById('guest-buttons');
  const userUI = document.getElementById('user-info');
  const userEmail = document.getElementById('user-email');

  if (guestUI) guestUI.style.display = user ? 'none' : 'block';
  if (userUI) userUI.style.display = user ? 'flex' : 'none';
  if (userEmail && user) userEmail.textContent = user.email;
}

/**************************************
 * 4. SISTEMA DE CARRITO DE COMPRAS
 **************************************/
function initCart() {
  let cart = loadCart();
  const cartIcon = document.getElementById('cartIcon');
  const cartModal = document.getElementById('cartModal');

  // Actualizar contador inicial
  updateCartCounter(cart.length);

  // Eventos del carrito
  if (cartIcon && cartModal) {
    cartIcon.addEventListener('click', () => cartModal.classList.toggle('active'));
    
    document.querySelector('.close-modal')?.addEventListener('click', () => {
      cartModal.classList.remove('active');
    });
  }

  // Añadir productos al carrito
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const product = {
        id: btn.dataset.id,
        name: btn.dataset.name,
        price: parseFloat(btn.dataset.price),
        image: btn.dataset.image,
        quantity: 1
      };
      cart = addToCart(cart, product);
      updateCartUI(cart);
      showFeedback(`${product.name} añadido al carrito`, 'success');
    });
  });

  // Botón de pago
  document.getElementById('checkoutBtn')?.addEventListener('click', () => {
    if (cart.length > 0) {
      proceedToCheckout(cart);
    } else {
      showError('El carrito está vacío');
    }
  });
}

function loadCart() {
  const cartData = localStorage.getItem(CART_STORAGE_KEY);
  return cartData ? JSON.parse(cartData) : [];
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function addToCart(cart, product) {
  const existingItem = cart.find(item => item.id === product.id);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push(product);
  }
  
  saveCart(cart);
  return cart;
}

function updateCartUI(cart) {
  updateCartCounter(cart.length);
  
  const cartItemsContainer = document.getElementById('cartItems');
  if (!cartItemsContainer) return;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <p>Tu carrito está vacío</p>
      </div>
    `;
    return;
  }

  // Generar lista de productos
  cartItemsContainer.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" width="60">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <div>$${item.price.toFixed(2)} x ${item.quantity}</div>
      </div>
      <button class="remove-item" data-id="${item.id}">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');

  // Actualizar total
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  document.getElementById('cartTotal').textContent = total.toFixed(2);

  // Eventos para eliminar items
  document.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const newCart = cart.filter(item => item.id !== btn.dataset.id);
      saveCart(newCart);
      updateCartUI(newCart);
    });
  });
}

function updateCartCounter(count) {
  const counter = document.getElementById('cartCounter');
  if (counter) {
    counter.textContent = count;
    counter.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

function proceedToCheckout(cart) {
  console.log('Procesando compra:', cart);
  // Aquí iría la lógica de pago real
  showFeedback('Compra realizada con éxito', 'success');
  localStorage.removeItem(CART_STORAGE_KEY);
  updateCartUI([]);
}

/**************************************
 * 5. FUNCIONALIDAD ESPECÍFICA DE PRODUCTOS
 **************************************/
function initProductos() {
  if (!document.querySelector('.productos-grid')) return;

  // Filtros de productos (ejemplo)
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.category;
      filterProducts(category);
    });
  });
}

function filterProducts(category) {
  console.log('Filtrando productos por:', category);
  // Implementar lógica de filtrado según sea necesario
}

/**************************************
 * 6. FUNCIONES DE UTILIDAD
 **************************************/
function showFeedback(message, type = 'success') {
  const feedback = document.createElement('div');
  feedback.className = `feedback ${type}`;
  feedback.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}"></i>
    ${message}
  `;
  document.body.appendChild(feedback);
  
  setTimeout(() => {
    feedback.classList.add('fade-out');
    setTimeout(() => feedback.remove(), 500);
  }, 3000);
}

function showError(message) {
  showFeedback(message, 'error');
}

// Para manejar el cierre de modales al hacer clic fuera
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});
