import { CartService } from './cart-service';
import { AuthService } from '../auth/auth';
import { showFeedback } from '../shared/feedback';

// ==================== CONSTANTES Y SELECTORES ====================
const SELECTORS = {
  CART_CONTAINER: '#cart-container',
  CART_TOGGLE: '#cart-toggle',
  CART_DROPDOWN: '#cart-dropdown',
  CART_COUNT: '#cart-count',
  CART_TOTAL: '#cart-total',
  CHECKOUT_BTN: '#checkout-btn',
  CART_ITEMS: '.cart-items',
  CART_EMPTY: '.cart-empty',
  ADD_TO_CART: '[data-action="add-to-cart"]',
  INCREASE_QTY: '[data-action="increase-qty"]',
  DECREASE_QTY: '[data-action="decrease-qty"]',
  REMOVE_ITEM: '[data-action="remove-item"]'
};

// ==================== FUNCIONES PRIVADAS ====================
const renderCartItems = async (cart) => {
  const container = document.querySelector(SELECTORS.CART_CONTAINER);
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <i class="fas fa-shopping-cart"></i>
        <p>Tu carrito está vacío</p>
      </div>
    `;
    return;
  }

  const total = CartService.getCartTotal(cart);
  const itemsHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img src="${item.image}" alt="${item.name}" class="cart-item-image">
      <div class="cart-item-details">
        <h4 class="cart-item-title">${item.name}</h4>
        <p class="cart-item-price">$${item.price.toFixed(2)}</p>
      </div>
      <div class="cart-item-actions">
        <button class="cart-item-qty-btn" data-action="decrease-qty" data-id="${item.id}">−</button>
        <span class="cart-item-qty">${item.quantity}</span>
        <button class="cart-item-qty-btn" data-action="increase-qty" data-id="${item.id}">+</button>
        <button class="cart-item-remove" data-action="remove-item" data-id="${item.id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="cart-items">
      ${itemsHTML}
    </div>
    <div class="cart-summary">
      <div class="cart-total">
        <span>Total:</span>
        <span>$${total.toFixed(2)}</span>
      </div>
      <button id="checkout-btn" class="checkout-btn">Proceder al Pago</button>
    </div>
  `;
};

const updateCartCounter = async () => {
  const user = AuthService.getCurrentUser();
  const cart = user ? await CartService.getUserCart(user.uid) : CartService.getLocalCart();
  const count = CartService.getItemCount(cart);
  const countElement = document.querySelector(SELECTORS.CART_COUNT);
  
  if (countElement) {
    countElement.textContent = count;
    countElement.style.display = count > 0 ? 'flex' : 'none';
  }
};

const setupAddToCartButtons = () => {
  document.querySelectorAll(SELECTORS.ADD_TO_CART).forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      const product = {
        id: button.dataset.productId,
        name: button.dataset.productName,
        price: parseFloat(button.dataset.productPrice),
        image: button.dataset.productImage,
        quantity: parseInt(button.dataset.quantity) || 1
      };

      try {
        await CartService.addItem(product);
        await updateCartUI();
        showFeedback(`${product.name} añadido al carrito`, 'success');
      } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
      }
    });
  });
};

const setupCartItemEvents = () => {
  // Delegación de eventos para botones dinámicos
  document.querySelector(SELECTORS.CART_CONTAINER)?.addEventListener('click', async (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    const id = e.target.closest('[data-id]')?.dataset.id;

    if (!action || !id) return;

    try {
      switch (action) {
        case 'increase-qty':
          await CartService.updateItemQuantity(id, 
            parseInt(e.target.closest('[data-id]').querySelector('.cart-item-qty').textContent) + 1
          );
          break;
        case 'decrease-qty':
          const currentQty = parseInt(e.target.closest('[data-id]').querySelector('.cart-item-qty').textContent);
          if (currentQty > 1) {
            await CartService.updateItemQuantity(id, currentQty - 1);
          } else {
            await CartService.removeItem(id);
          }
          break;
        case 'remove-item':
          await CartService.removeItem(id);
          showFeedback('Producto eliminado', 'success');
          break;
      }
      await updateCartUI();
    } catch (error) {
      showFeedback(`Error: ${error.message}`, 'error');
    }
  });
};

const setupCheckoutButton = () => {
  document.querySelector(SELECTORS.CHECKOUT_BTN)?.addEventListener('click', async () => {
    const user = AuthService.getCurrentUser();
    
    if (!user) {
      showFeedback('Debes iniciar sesión para continuar', 'error');
      return;
    }

    const cart = await CartService.getUserCart(user.uid);
    if (cart.length === 0) {
      showFeedback('El carrito está vacío', 'error');
      return;
    }

    try {
      // Lógica de checkout (puede ser reemplazada por tu implementación)
      await CartService.saveUserCart(user.uid, []);
      showFeedback('Compra realizada con éxito', 'success');
      await updateCartUI();
    } catch (error) {
      showFeedback(`Error en el pago: ${error.message}`, 'error');
    }
  });
};

// ==================== FUNCIÓN PÚBLICA PRINCIPAL ====================
export const updateCartUI = async () => {
  const user = AuthService.getCurrentUser();
  const cart = user ? await CartService.getUserCart(user.uid) : CartService.getLocalCart();
  
  await renderCartItems(cart);
  await updateCartCounter();
  setupCartItemEvents();
  setupCheckoutButton();
};

// ==================== INICIALIZACIÓN ====================
export const initCartUI = () => {
  // Configurar eventos del carrito
  document.querySelector(SELECTORS.CART_TOGGLE)?.addEventListener('click', () => {
    document.querySelector(SELECTORS.CART_DROPDOWN)?.classList.toggle('active');
  });

  // Cerrar carrito al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!e.target.closest(SELECTORS.CART_DROPDOWN) && 
        !e.target.closest(SELECTORS.CART_TOGGLE)) {
      document.querySelector(SELECTORS.CART_DROPDOWN)?.classList.remove('active');
    }
  });

  // Configurar botones "Añadir al carrito"
  setupAddToCartButtons();

  // Escuchar cambios de autenticación para actualizar el carrito
  AuthService.onAuthStateChanged(async (user) => {
    if (user) {
      await CartService.migrateGuestCart(user.uid);
    }
    await updateCartUI();
  });

  // Carga inicial
  updateCartUI();
};

// Auto-inicialización si hay elementos del carrito en la página
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector(SELECTORS.CART_CONTAINER)) {
    initCartUI();
  }
});
