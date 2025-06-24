import { CartService } from './cart-service';
import { AuthService } from '../auth/auth';
import { showFeedback } from '../shared/feedback';

// Selectores del DOM
const SELECTORS = {
  CART_CONTAINER: '#cart-container',
  CART_TOGGLE: '#cart-toggle',
  CART_OVERLAY: '#cart-overlay',
  CART_ITEMS: '#cart-items',
  CART_TOTAL: '#cart-total',
  CART_COUNT: '#cart-count',
  CHECKOUT_BTN: '#checkout-btn',
  EMPTY_CART: '#empty-cart'
};

// Clases CSS
const CLASSES = {
  ACTIVE: 'active',
  HIDDEN: 'hidden'
};

/**
 * Inicializa la UI del carrito
 */
export const initCartUI = () => {
  setupEventListeners();
  renderCart();
  setupAuthListener();
};

/**
 * Configura los event listeners
 */
const setupEventListeners = () => {
  // Toggle del carrito
  document.querySelector(SELECTORS.CART_TOGGLE)?.addEventListener('click', toggleCart);
  document.querySelector(SELECTORS.CART_OVERLAY)?.addEventListener('click', closeCart);

  // Delegación de eventos para botones dinámicos
  document.querySelector(SELECTORS.CART_ITEMS)?.addEventListener('click', handleCartActions);
  
  // Checkout
  document.querySelector(SELECTORS.CHECKOUT_BTN)?.addEventListener('click', handleCheckout);
};

/**
 * Configura el listener de cambios de autenticación
 */
const setupAuthListener = () => {
  AuthService.onAuthStateChanged(() => {
    renderCart();
  });
};

/**
 * Renderiza el carrito
 */
const renderCart = async () => {
  const cart = await CartService.getCart();
  updateCartCount(cart);
  renderCartItems(cart);
  updateCartTotal(cart);
  toggleEmptyState(cart);
};

/**
 * Renderiza los items del carrito
 * @param {Array} cart 
 */
const renderCartItems = (cart) => {
  const container = document.querySelector(SELECTORS.CART_ITEMS);
  if (!container) return;

  container.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img src="${item.image}" alt="${item.name}" class="cart-item-image">
      <div class="cart-item-details">
        <h4 class="cart-item-title">${item.name}</h4>
        <p class="cart-item-price">$${item.price.toFixed(2)}</p>
      </div>
      <div class="cart-item-actions">
        <button class="btn-quantity" data-action="decrease">−</button>
        <span class="cart-item-quantity">${item.quantity}</span>
        <button class="btn-quantity" data-action="increase">+</button>
        <button class="btn-remove" data-action="remove">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
};

/**
 * Maneja las acciones del carrito
 * @param {Event} e 
 */
const handleCartActions = async (e) => {
  const itemElement = e.target.closest('.cart-item');
  if (!itemElement) return;

  const productId = itemElement.dataset.id;
  const action = e.target.closest('[data-action]')?.dataset.action;

  try {
    switch (action) {
      case 'increase':
        await CartService.addItem({ id: productId }, 1);
        break;
      case 'decrease':
        const quantityElement = itemElement.querySelector('.cart-item-quantity');
        const currentQty = parseInt(quantityElement.textContent);
        await CartService.updateQuantity(productId, currentQty - 1);
        break;
      case 'remove':
        await CartService.removeItem(productId);
        showFeedback('Producto eliminado', 'success');
        break;
    }
    await renderCart();
  } catch (error) {
    showFeedback('Error al actualizar carrito', 'error');
  }
};

/**
 * Maneja el proceso de checkout
 */
const handleCheckout = async () => {
  const user = AuthService.getCurrentUser();
  if (!user) {
    showFeedback('Inicia sesión para continuar', 'error');
    return;
  }

  const cart = await CartService.getCart();
  if (cart.length === 0) {
    showFeedback('El carrito está vacío', 'error');
    return;
  }

  try {
    // Lógica de checkout aquí (puede integrarse con un servicio de pago)
    await CartService.clearCart();
    showFeedback('Compra realizada con éxito', 'success');
    closeCart();
    await renderCart();
  } catch (error) {
    showFeedback('Error en el checkout', 'error');
  }
};

/**
 * Actualiza el contador del carrito
 * @param {Array} cart 
 */
const updateCartCount = (cart) => {
  const countElement = document.querySelector(SELECTORS.CART_COUNT);
  if (!countElement) return;

  const count = CartService.getItemCount(cart);
  countElement.textContent = count;
  countElement.classList.toggle(CLASSES.HIDDEN, count === 0);
};

/**
 * Actualiza el total del carrito
 * @param {Array} cart 
 */
const updateCartTotal = (cart) => {
  const totalElement = document.querySelector(SELECTORS.CART_TOTAL);
  if (totalElement) {
    totalElement.textContent = `$${CartService.getTotal(cart).toFixed(2)}`;
  }
};

/**
 * Muestra/oculta el estado de carrito vacío
 * @param {Array} cart 
 */
const toggleEmptyState = (cart) => {
  const emptyElement = document.querySelector(SELECTORS.EMPTY_CART);
  const itemsElement = document.querySelector(SELECTORS.CART_ITEMS);
  if (!emptyElement || !itemsElement) return;

  if (cart.length === 0) {
    emptyElement.classList.remove(CLASSES.HIDDEN);
    itemsElement.classList.add(CLASSES.HIDDEN);
  } else {
    emptyElement.classList.add(CLASSES.HIDDEN);
    itemsElement.classList.remove(CLASSES.HIDDEN);
  }
};

/**
 * Abre/cierra el carrito
 */
const toggleCart = () => {
  document.querySelector(SELECTORS.CART_CONTAINER)?.classList.toggle(CLASSES.ACTIVE);
  document.querySelector(SELECTORS.CART_OVERLAY)?.classList.toggle(CLASSES.ACTIVE);
  document.body.style.overflow = 'hidden';
};

const closeCart = () => {
  document.querySelector(SELECTORS.CART_CONTAINER)?.classList.remove(CLASSES.ACTIVE);
  document.querySelector(SELECTORS.CART_OVERLAY)?.classList.remove(CLASSES.ACTIVE);
  document.body.style.overflow = '';
};

// Auto-inicialización si existe el contenedor del carrito
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector(SELECTORS.CART_CONTAINER)) {
    initCartUI();
  }
});
