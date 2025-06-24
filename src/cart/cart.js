import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AuthService } from '../auth/auth';
import { app } from '../firebase-config';
import { showFeedback } from '../shared/feedback';

const db = getFirestore(app);
const CART_STORAGE_KEY = 'guest_cart';

export const CartService = {
  // ==================== OPERACIONES BÁSICAS ====================
  
  /**
   * Obtiene el carrito actual (usuario o invitado)
   * @returns {Promise<Array>} Lista de productos en el carrito
   */
  getCart: async () => {
    const user = AuthService.getCurrentUser();
    if (user) {
      return getCartFromFirestore(user.uid);
    } else {
      return getGuestCart();
    }
  },

  /**
   * Añade un producto al carrito
   * @param {Object} product - Producto a añadir
   * @param {number} [quantity=1] - Cantidad a añadir
   * @returns {Promise<Array>} Carrito actualizado
   */
  addItem: async (product, quantity = 1) => {
    const user = AuthService.getCurrentUser();
    const cart = await this.getCart();
    
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        ...product,
        quantity,
        addedAt: new Date().toISOString()
      });
    }

    if (user) {
      await saveCartToFirestore(user.uid, cart);
    } else {
      saveGuestCart(cart);
    }

    return cart;
  },

  /**
   * Actualiza la cantidad de un producto
   * @param {string} productId - ID del producto
   * @param {number} newQuantity - Nueva cantidad
   * @returns {Promise<Array>} Carrito actualizado
   */
  updateQuantity: async (productId, newQuantity) => {
    if (newQuantity < 1) return this.removeItem(productId);

    const user = AuthService.getCurrentUser();
    const cart = await this.getCart();
    
    const item = cart.find(item => item.id === productId);
    if (item) item.quantity = newQuantity;

    if (user) {
      await saveCartToFirestore(user.uid, cart);
    } else {
      saveGuestCart(cart);
    }

    return cart;
  },

  /**
   * Elimina un producto del carrito
   * @param {string} productId - ID del producto a eliminar
   * @returns {Promise<Array>} Carrito actualizado
   */
  removeItem: async (productId) => {
    const user = AuthService.getCurrentUser();
    let cart = await this.getCart();
    
    cart = cart.filter(item => item.id !== productId);

    if (user) {
      await saveCartToFirestore(user.uid, cart);
    } else {
      saveGuestCart(cart);
    }

    return cart;
  },

  /**
   * Vacía el carrito completamente
   * @returns {Promise<void>}
   */
  clearCart: async () => {
    const user = AuthService.getCurrentUser();
    if (user) {
      await saveCartToFirestore(user.uid, []);
    } else {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  },

  // ==================== MIGRACIÓN DE DATOS ====================
  
  /**
   * Migra el carrito de invitado al usuario autenticado
   * @param {string} userId - ID del usuario
   * @returns {Promise<void>}
   */
  migrateGuestCart: async (userId) => {
    const guestCart = getGuestCart();
    if (guestCart.length === 0) return;

    const userCart = await getCartFromFirestore(userId);
    const mergedCart = mergeCarts(userCart, guestCart);
    
    await saveCartToFirestore(userId, mergedCart);
    localStorage.removeItem(CART_STORAGE_KEY);
  },

  // ==================== UTILIDADES ====================
  
  /**
   * Calcula el total del carrito
   * @param {Array} cart - Lista de productos
   * @returns {number} Total calculado
   */
  getTotal: (cart) => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  },

  /**
   * Cuenta los items en el carrito
   * @param {Array} cart - Lista de productos
   * @returns {number} Cantidad total de items
   */
  getItemCount: (cart) => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  }
};

// ==================== FUNCIONES PRIVADAS ====================

/**
 * Obtiene el carrito desde Firestore
 * @param {string} userId 
 * @returns {Promise<Array>}
 */
const getCartFromFirestore = async (userId) => {
  try {
    const cartDoc = await getDoc(doc(db, 'carts', userId));
    return cartDoc.exists() ? cartDoc.data().items : [];
  } catch (error) {
    console.error("Error obteniendo carrito:", error);
    return [];
  }
};

/**
 * Guarda el carrito en Firestore
 * @param {string} userId 
 * @param {Array} cart 
 * @returns {Promise<void>}
 */
const saveCartToFirestore = async (userId, cart) => {
  try {
    await setDoc(doc(db, 'carts', userId), {
      items: cart,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error guardando carrito:", error);
    throw error;
  }
};

/**
 * Obtiene el carrito de invitado desde localStorage
 * @returns {Array}
 */
const getGuestCart = () => {
  const cartData = localStorage.getItem(CART_STORAGE_KEY);
  return cartData ? JSON.parse(cartData) : [];
};

/**
 * Guarda el carrito de invitado en localStorage
 * @param {Array} cart 
 */
const saveGuestCart = (cart) => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
};

/**
 * Combina dos carritos (para migración)
 * @param {Array} userCart 
 * @param {Array} guestCart 
 * @returns {Array} Carrito combinado
 */
const mergeCarts = (userCart, guestCart) => {
  const merged = [...userCart];
  
  guestCart.forEach(guestItem => {
    const existingIndex = merged.findIndex(item => item.id === guestItem.id);
    if (existingIndex >= 0) {
      merged[existingIndex].quantity += guestItem.quantity;
    } else {
      merged.push(guestItem);
    }
  });

  return merged;
};
