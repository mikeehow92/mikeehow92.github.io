// src/cart/cart-ui.js

import { CartService } from './cart.js';
// Asumiendo que tienes una función global showFeedback
// Si no, necesitarías importarla o definirla aquí.
// import { showFeedback } from '../shared/feedback.js'; // Ejemplo de importación

const SELECTORS = {
  CART_MODAL: '#cartModal',
  CART_ITEMS_CONTAINER: '#cartItems',
  CART_TOTAL_ELEMENT: '#cartTotal',
  CART_COUNT_ELEMENT: '#cartCount',
  ADD_TO_CART_BUTTON: '.add-to-cart-btn',
  OPEN_CART_BUTTON: '#openCartBtn',
  CLOSE_CART_BUTTON: '.close-button',
  CLEAR_CART_BUTTON: '#clearCartBtn',
  CHECKOUT_BTN: '#checkoutBtn',
  QUANTITY_INPUT: '.cart-item-quantity',
  REMOVE_ITEM_BUTTON: '.remove-item-btn',
};

/**
 * Muestra u oculta el modal del carrito.
 * @param {boolean} show - True para mostrar, false para ocultar.
 */
const toggleCartModal = (show) => {
  const cartModal = document.querySelector(SELECTORS.CART_MODAL);
  if (cartModal) {
    cartModal.style.display = show ? 'block' : 'none';
  }
};

/**
 * Renderiza los ítems del carrito en el modal.
 * @param {Array} cart - El array del carrito.
 */
const renderCart = (cart) => {
  const cartItemsContainer = document.querySelector(SELECTORS.CART_ITEMS_CONTAINER);
  const cartTotalElement = document.querySelector(SELECTORS.CART_TOTAL_ELEMENT);
  const cartCountElement = document.querySelector(SELECTORS.CART_COUNT_ELEMENT);

  if (!cartItemsContainer || !cartTotalElement || !cartCountElement) {
    console.error('Elementos del DOM del carrito no encontrados.');
    return;
  }

  cartItemsContainer.innerHTML = ''; // Limpiar ítems existentes

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p class="empty-cart-message">Tu carrito está vacío.</p>';
  } else {
    cart.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.classList.add('cart-item');
      itemElement.innerHTML = `
        <img src="${item.imageUrl || '/assets/images/placeholder.png'}" alt="${item.name}">
        <div class="item-details">
          <h4>${item.name}</h4>
          <p>Precio: $${item.price.toFixed(2)}</p>
          <div class="quantity-controls">
            <button class="quantity-minus" data-id="${item.id}">-</button>
            <input type="number" class="cart-item-quantity" value="${item.quantity}" min="1" data-id="${item.id}">
            <button class="quantity-plus" data-id="${item.id}">+</button>
          </div>
        </div>
        <button class="remove-item-btn" data-id="${item.id}">
          <i class="fas fa-trash"></i>
        </button>
      `;
      cartItemsContainer.appendChild(itemElement);
    });
  }

  const total = CartService.getTotal(cart);
  const itemCount = CartService.getItemCount(cart);

  cartTotalElement.textContent = total.toFixed(2);
  cartCountElement.textContent = itemCount;
};

/**
 * Maneja la adición de un producto al carrito.
 * @param {Event} event - El evento de click.
 */
const handleAddToCart = async (event) => {
  const button = event.target.closest(SELECTORS.ADD_TO_CART_BUTTON);
  if (!button) return;

  const productId = button.dataset.id;
  const productName = button.dataset.name;
  const productPrice = parseFloat(button.dataset.price);
  const productImageUrl = button.dataset.image; // Asegúrate de que este data-attribute exista en tu HTML

  if (!productId || !productName || isNaN(productPrice)) {
    console.error('Datos de producto incompletos para añadir al carrito.');
    return;
  }

  const product = {
    id: productId,
    name: productName,
    price: productPrice,
    imageUrl: productImageUrl
  };

  await CartService.addItem(product, 1); // Añade una unidad por defecto
  const updatedCart = await CartService.getCart();
  renderCart(updatedCart);
  toggleCartModal(true); // Abrir el carrito automáticamente
  if (typeof window.showFeedback === 'function') {
    window.showFeedback('Producto Añadido', `${productName} ha sido añadido al carrito.`, 'success');
  }
};

/**
 * Maneja la actualización de la cantidad de un ítem en el carrito.
 * @param {Event} event - El evento de input o click.
 */
const handleQuantityChange = async (event) => {
  const target = event.target;
  const productId = target.dataset.id;
  let newQuantity;

  if (target.classList.contains('quantity-minus')) {
    const input = target.nextElementSibling;
    newQuantity = parseInt(input.value) - 1;
  } else if (target.classList.contains('quantity-plus')) {
    const input = target.previousElementSibling;
    newQuantity = parseInt(input.value) + 1;
  } else if (target.classList.contains('cart-item-quantity')) {
    newQuantity = parseInt(target.value);
  } else {
    return;
  }

  if (isNaN(newQuantity) || newQuantity < 0) newQuantity = 0;

  await CartService.updateItemQuantity(productId, newQuantity);
  const updatedCart = await CartService.getCart();
  renderCart(updatedCart);
};

/**
 * Maneja la eliminación de un ítem del carrito.
 * @param {Event} event - El evento de click.
 */
const handleRemoveItem = async (event) => {
  const button = event.target.closest(SELECTORS.REMOVE_ITEM_BUTTON);
  if (!button) return;

  const productId = button.dataset.id;
  await CartService.removeItem(productId);
  const updatedCart = await CartService.getCart();
  renderCart(updatedCart);
  if (typeof window.showFeedback === 'function') {
    window.showFeedback('Producto Eliminado', 'El producto ha sido eliminado del carrito.', 'info');
  }
};

/**
 * Maneja la limpieza completa del carrito.
 */
const handleClearCart = async () => {
  if (confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
    await CartService.clearCart();
    const updatedCart = await CartService.getCart();
    renderCart(updatedCart);
    if (typeof window.showFeedback === 'function') {
      window.showFeedback('Carrito Vaciado', 'Todos los productos han sido eliminados del carrito.', 'info');
    }
  }
};

/**
 * Maneja el click en el botón "Proceder al Pago".
 */
const handleCheckout = async () => {
  const cart = await CartService.getCart(); // Obtén el carrito actual

  if (cart.length === 0) {
    if (typeof window.showFeedback === 'function') {
      window.showFeedback('Carrito Vacío', 'No puedes proceder al pago con un carrito vacío.', 'info');
    }
    return;
  }

  // Si el carrito no está vacío, simplemente redirige a la página de pago.
  // La lógica de "compra realizada" se manejará en la página de pago después de PayPal.
  window.location.href = 'pago.html';
};

/**
 * Configura todos los event listeners para el carrito.
 */
const setupEventListeners = () => {
  // Abrir carrito
  document.querySelector(SELECTORS.OPEN_CART_BUTTON)?.addEventListener('click', () => toggleCartModal(true));
  
  // Cerrar carrito
  document.querySelector(SELECTORS.CLOSE_CART_BUTTON)?.addEventListener('click', () => toggleCartModal(false));
  
  // Añadir al carrito (delegación de eventos para botones dinámicos)
  document.addEventListener('click', handleAddToCart);

  // Actualizar cantidad y eliminar ítem (delegación de eventos)
  document.querySelector(SELECTORS.CART_ITEMS_CONTAINER)?.addEventListener('click', (event) => {
    if (event.target.classList.contains('quantity-minus') || event.target.classList.contains('quantity-plus')) {
      handleQuantityChange(event);
    } else if (event.target.closest(SELECTORS.REMOVE_ITEM_BUTTON)) {
      handleRemoveItem(event);
    }
  });

  document.querySelector(SELECTORS.CART_ITEMS_CONTAINER)?.addEventListener('change', (event) => {
    if (event.target.classList.contains('cart-item-quantity')) {
      handleQuantityChange(event);
    }
  });

  // Vaciar carrito
  document.querySelector(SELECTORS.CLEAR_CART_BUTTON)?.addEventListener('click', handleClearCart);

  // Checkout
  document.querySelector(SELECTORS.CHECKOUT_BTN)?.addEventListener('click', handleCheckout);
};

/**
 * Inicializa la UI del carrito.
 */
export const initCartUI = async () => {
  setupEventListeners();
  const initialCart = await CartService.getCart();
  renderCart(initialCart);
};

// Auto-inicializar la UI del carrito cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', initCartUI);
