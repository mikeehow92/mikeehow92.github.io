// assets/js/cart.js
// Clave para almacenar el carrito en localStorage para usuarios no autenticados
const GUEST_CART_KEY = 'guest_cart';

export const CartService = {
    /**
     * Obtiene el carrito actual. Si el usuario está autenticado,
     * se debería cargar desde Firestore. Para usuarios no autenticados,
     * se carga desde localStorage.
     * Por ahora, solo implementa la lógica para localStorage.
     * @returns {Promise<Array>} El array del carrito.
     */
    getCart: async () => {
        // Lógica para usuarios autenticados (Firebase) iría aquí
        // Por ahora, solo para usuarios invitados:
        const guestCart = localStorage.getItem(GUEST_CART_KEY);
        return guestCart ? JSON.parse(guestCart) : [];
    },

    /**
     * Añade un producto al carrito.
     * @param {Object} product - El objeto del producto a añadir.
     * @param {number} quantity - La cantidad del producto.
     * @returns {Promise<Array>} El carrito actualizado.
     */
    addItem: async (product, quantity = 1) => {
        let cart = await CartService.getCart();
        const existingItemIndex = cart.findIndex(item => item.id === product.id);

        if (existingItemIndex > -1) {
            // Si el producto ya existe, actualiza la cantidad
            cart[existingItemIndex].quantity += quantity;
        } else {
            // Si el producto no existe, añádelo
            cart.push({ ...product, quantity });
        }
        await CartService.saveCart(cart);
        return cart;
    },

    /**
     * Actualiza la cantidad de un producto en el carrito.
     * @param {string} productId - ID del producto.
     * @param {number} newQuantity - Nueva cantidad.
     * @returns {Promise<Array>} El carrito actualizado.
     */
    updateItemQuantity: async (productId, newQuantity) => {
        let cart = await CartService.getCart();
        const itemIndex = cart.findIndex(item => item.id === productId);

        if (itemIndex > -1) {
            if (newQuantity <= 0) {
                // Si la cantidad es 0 o menos, elimina el ítem
                cart.splice(itemIndex, 1);
            } else {
                cart[itemIndex].quantity = newQuantity;
            }
            await CartService.saveCart(cart);
        }
        return cart;
    },

    /**
     * Elimina un producto del carrito.
     * @param {string} productId - ID del producto a eliminar.
     * @returns {Promise<Array>} El carrito actualizado.
     */
    removeItem: async (productId) => {
        let cart = await CartService.getCart();
        cart = cart.filter(item => item.id !== productId);
        await CartService.saveCart(cart);
        return cart;
    },

    /**
     * Guarda el carrito en el almacenamiento (localStorage para invitados, Firestore para usuarios).
     * @param {Array} cart - El array del carrito a guardar.
     */
    saveCart: async (cart) => {
        // Lógica para usuarios autenticados (Firebase) iría aquí
        // Por ahora, solo para usuarios invitados:
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
    },

    /**
     * Limpia completamente el carrito.
     */
    clearCart: async () => {
        // Lógica para usuarios autenticados (Firebase) iría aquí
        // Por ahora, solo para usuarios invitados:
        localStorage.removeItem(GUEST_CART_KEY);
    },

    /**
     * Calcula el total del carrito.
     * @param {Array} cart - El array del carrito.
     * @returns {number} El total monetario del carrito.
     */
    getTotal: (cart) => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    },

    /**
     * Obtiene el número total de ítems (unidades) en el carrito.
     * @param {Array} cart - El array del carrito.
     * @returns {number} El número total de unidades.
     */
    getItemCount: (cart) => {
        return cart.reduce((count, item) => count + item.quantity, 0);
    }
};
