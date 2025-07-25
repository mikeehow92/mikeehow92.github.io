// assets/js/cart-ui.js
import { CartService } from './cart.js';
import { showFeedback } from './feedback.js';

export const CartUI = {
    init: () => {
        const cartModal = document.getElementById('cartModal');
        const closeCartBtn = cartModal ? cartModal.querySelector('.close-button') : null;
        const cartToggleBtn = document.querySelector('.cart-toggle-btn');
        const cartItemsContainer = document.getElementById('cartItems');
        const cartTotalSpan = document.getElementById('cartTotal');
        const cartCountSpan = document.querySelector('.cart-count');
        const clearCartBtn = document.getElementById('clearCartBtn');
        const checkoutBtn = document.getElementById('checkoutBtn');

        // Abrir modal del carrito
        if (cartToggleBtn) {
            cartToggleBtn.addEventListener('click', async () => {
                if (cartModal) {
                    cartModal.classList.add('active');
                    await CartUI.renderCart(); // Renderizar el carrito cada vez que se abre
                }
            });
        }

        // Cerrar modal del carrito
        if (closeCartBtn) {
            closeCartBtn.addEventListener('click', () => {
                if (cartModal) cartModal.classList.remove('active');
            });
        }

        // Botón Vaciar carrito
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', async () => {
                if (confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
                    await CartService.clearCart();
                    await CartUI.renderCart();
                    showFeedback('Carrito Vaciado', 'El carrito ha sido vaciado.', 'info');
                }
            });
        }

        // Botón Proceder al Pago
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', async () => {
                const cart = await CartService.getCart();
                if (cart.length > 0) {
                    window.location.href = 'pago.html'; // Redirigir a la página de pago
                } else {
                    showFeedback('Carrito Vacío', 'No hay productos en el carrito para proceder al pago.', 'info');
                }
            });
        }

        // Renderizado inicial y actualización del contador
        CartUI.renderCart();
    },

    renderCart: async () => {
        const cartItemsContainer = document.getElementById('cartItems');
        const cartTotalSpan = document.getElementById('cartTotal');
        const cartCountSpan = document.querySelector('.cart-count');

        if (!cartItemsContainer || !cartTotalSpan || !cartCountSpan) {
            console.warn("Elementos de la UI del carrito no encontrados. CartUI podría no ser completamente funcional en esta página.");
            return;
        }

        const cart = await CartService.getCart();
        cartItemsContainer.innerHTML = ''; // Limpiar artículos actuales

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>El carrito está vacío.</p>';
        } else {
            cart.forEach(item => {
                const cartItemDiv = document.createElement('div');
                cartItemDiv.className = 'cart-item';
                cartItemDiv.innerHTML = `
                    <img src="${item.image || '/assets/imagenes/default-product.jpg'}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-details">
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-price">$${item.price.toFixed(2)}</span>
                    </div>
                    <div class="cart-item-quantity-controls">
                        <button class="quantity-decrease" data-product-id="${item.id}">-</button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-increase" data-product-id="${item.id}">+</button>
                    </div>
                    <button class="cart-item-remove" data-product-id="${item.id}">X</button>
                `;
                cartItemsContainer.appendChild(cartItemDiv);
            });
        }

        cartTotalSpan.textContent = CartService.getTotal(cart).toFixed(2);
        cartCountSpan.textContent = CartService.getItemCount(cart);

        // Añadir event listeners para controles de cantidad y botones de eliminar
        cartItemsContainer.querySelectorAll('.quantity-decrease').forEach(button => {
            button.addEventListener('click', async (event) => {
                const productId = event.target.dataset.productId;
                const item = cart.find(i => i.id === productId);
                if (item) {
                    await CartService.updateItemQuantity(productId, item.quantity - 1);
                    await CartUI.renderCart();
                }
            });
        });

        cartItemsContainer.querySelectorAll('.quantity-increase').forEach(button => {
            button.addEventListener('click', async (event) => {
                const productId = event.target.dataset.productId;
                const item = cart.find(i => i.id === productId);
                if (item) {
                    await CartService.updateItemQuantity(productId, item.quantity + 1);
                    await CartUI.renderCart();
                }
            });
        });

        cartItemsContainer.querySelectorAll('.cart-item-remove').forEach(button => {
            button.addEventListener('click', async (event) => {
                const productId = event.target.dataset.productId;
                if (confirm('¿Estás seguro de que quieres eliminar este producto del carrito?')) {
                    await CartService.removeItem(productId);
                    await CartUI.renderCart();
                    showFeedback('Producto Eliminado', 'Producto eliminado del carrito.', 'info');
                }
            });
        });
    },

    updateCartCount: async () => {
        const cartCountSpan = document.querySelector('.cart-count');
        if (cartCountSpan) {
            const cart = await CartService.getCart();
            cartCountSpan.textContent = CartService.getItemCount(cart);
        }
    }
};
