import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AuthService } from '../auth/auth';
import { showFeedback } from '../shared/feedback';
import { app } from '../firebase-config';

const db = getFirestore(app);
const LOCAL_STORAGE_KEY = 'tecnoexpress_guest_cart';

// ==================== CORE CART FUNCTIONS ====================
export const CartService = {
  // -------------------- LOCAL CART --------------------
  getLocalCart: () => {
    const cartData = localStorage.getItem(LOCAL_STORAGE_KEY);
    return cartData ? JSON.parse(cartData) : [];
  },

  saveLocalCart: (cart) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cart));
  },

  clearLocalCart: () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  },

  // -------------------- FIRESTORE CART --------------------
  getUserCart: async (userId) => {
    try {
      const cartDoc = await getDoc(doc(db, 'carts', userId));
      return cartDoc.exists() ? cartDoc.data().items : [];
    } catch (error) {
      console.error("Error loading user cart:", error);
      return [];
    }
  },

  saveUserCart: async (userId, cart) => {
    try {
      await setDoc(doc(db, 'carts', userId), {
        items: cart,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("Error saving user cart:", error);
      return false;
    }
  },

  // -------------------- CART OPERATIONS --------------------
  addItem: async (product) => {
    const user = AuthService.getCurrentUser();
    let currentCart = [];

    if (user) {
      currentCart = await CartService.getUserCart(user.uid);
    } else {
      currentCart = CartService.getLocalCart();
    }

    const existingItem = currentCart.find(item => item.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += product.quantity || 1;
    } else {
      currentCart.push({
        ...product,
        quantity: product.quantity || 1
      });
    }

    if (user) {
      await CartService.saveUserCart(user.uid, currentCart);
    } else {
      CartService.saveLocalCart(currentCart);
    }

    return currentCart;
  },

  removeItem: async (productId) => {
    const user = AuthService.getCurrentUser();
    let currentCart = [];

    if (user) {
      currentCart = await CartService.getUserCart(user.uid);
    } else {
      currentCart = CartService.getLocalCart();
    }

    const updatedCart = currentCart.filter(item => item.id !== productId);

    if (user) {
      await CartService.saveUserCart(user.uid, updatedCart);
    } else {
      CartService.saveLocalCart(updatedCart);
    }

    return updatedCart;
  },

  updateItemQuantity: async (productId, newQuantity) => {
    if (newQuantity < 1) return CartService.removeItem(productId);

    const user = AuthService.getCurrentUser();
    let currentCart = [];

    if (user) {
      currentCart = await CartService.getUserCart(user.uid);
    } else {
      currentCart = CartService.getLocalCart();
    }

    const itemToUpdate = currentCart.find(item => item.id === productId);
    if (itemToUpdate) itemToUpdate.quantity = newQuantity;

    if (user) {
      await CartService.saveUserCart(user.uid, currentCart);
    } else {
      CartService.saveLocalCart(currentCart);
    }

    return currentCart;
  },

  clearCart: async () => {
    const user = AuthService.getCurrentUser();
    
    if (user) {
      await CartService.saveUserCart(user.uid, []);
    } else {
      CartService.clearLocalCart();
    }
  },

  // -------------------- MIGRATION --------------------
  migrateGuestCart: async (userId) => {
    const guestCart = CartService.getLocalCart();
    if (guestCart.length > 0) {
      const userCart = await CartService.getUserCart(userId);
      
      // Merge carts (prioritize guest cart quantities)
      const mergedCart = [...userCart];
      guestCart.forEach(guestItem => {
        const existingIndex = mergedCart.findIndex(item => item.id === guestItem.id);
        if (existingIndex >= 0) {
          mergedCart[existingIndex].quantity += guestItem.quantity;
        } else {
          mergedCart.push(guestItem);
        }
      });

      await CartService.saveUserCart(userId, mergedCart);
      CartService.clearLocalCart();
    }
  },

  // -------------------- UTILITIES --------------------
  getCartTotal: (cart) => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  },

  getItemCount: (cart) => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  }
};

// ==================== CART UI CONTROLLER ====================
export const CartUI = {
  init: () => {
    // Initialize cart UI elements
    this.setupEventListeners();
    this.updateCartUI();

    // Listen for auth changes to handle cart migration
    AuthService.onAuthStateChanged((user) => {
      if (user) {
        CartService.migrateGuestCart(user.uid);
      }
      this.updateCartUI();
    });
  },

  setupEventListeners: () => {
    // Cart toggle
    document.getElementById('cart-toggle')?.addEventListener('click', () => {
      document.getElementById('cart-dropdown').classList.toggle('active');
    });

    // Add to cart buttons
    document.querySelectorAll('[data-action="add-to-cart"]').forEach(button => {
      button.addEventListener('click', async () => {
        const product = {
          id: button.dataset.productId,
          name: button.dataset.productName,
          price: parseFloat(button.dataset.productPrice),
          image: button.dataset.productImage
        };

        await CartService.addItem(product);
        this.updateCartUI();
        showFeedback(`${product.name} added to cart`, 'success');
      });
    });

    // Checkout button
    document.getElementById('checkout-btn')?.addEventListener('click', async () => {
      const user = AuthService.getCurrentUser();
      if (!user) {
        showFeedback('Please login to checkout', 'error');
        return;
      }

      const cart = await CartService.getUserCart(user.uid);
      if (cart.length === 0) {
        showFeedback('Your cart is empty', 'error');
        return;
      }

      // Proceed to checkout logic
      this.handleCheckout(cart);
    });
  },

  updateCartUI: async () => {
    const cartContainer = document.getElementById('cart-container');
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');
    
    if (!cartContainer || !cartCount || !cartTotal) return;

    const user = AuthService.getCurrentUser();
    const cart = user ? await CartService.getUserCart(user.uid) : CartService.getLocalCart();
    const total = CartService.getCartTotal(cart);

    // Update count
    cartCount.textContent = CartService.getItemCount(cart);
    cartCount.style.display = cart.length > 0 ? 'block' : 'none';

    // Update total
    cartTotal.textContent = `$${total.toFixed(2)}`;

    // Update cart items
    if (cart.length === 0) {
      cartContainer.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
      return;
    }

    cartContainer.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" width="60">
        <div class="cart-item-details">
          <h4>${item.name}</h4>
          <div>$${item.price.toFixed(2)} × ${item.quantity}</div>
        </div>
        <div class="cart-item-actions">
          <button data-action="decrease-quantity" data-id="${item.id}">−</button>
          <button data-action="increase-quantity" data-id="${item.id}">+</button>
          <button data-action="remove-item" data-id="${item.id}">×</button>
        </div>
      </div>
    `).join('');

    // Add event listeners to dynamic buttons
    document.querySelectorAll('[data-action="decrease-quantity"]').forEach(button => {
      button.addEventListener('click', async () => {
        const itemId = button.dataset.id;
        const cart = await CartService.getUserCart(user.uid);
        const item = cart.find(i => i.id === itemId);
        if (item) {
          await CartService.updateItemQuantity(itemId, item.quantity - 1);
          this.updateCartUI();
        }
      });
    });

    document.querySelectorAll('[data-action="increase-quantity"]').forEach(button => {
      button.addEventListener('click', async () => {
        const itemId = button.dataset.id;
        const cart = await CartService.getUserCart(user.uid);
        const item = cart.find(i => i.id === itemId);
        if (item) {
          await CartService.updateItemQuantity(itemId, item.quantity + 1);
          this.updateCartUI();
        }
      });
    });

    document.querySelectorAll('[data-action="remove-item"]').forEach(button => {
      button.addEventListener('click', async () => {
        await CartService.removeItem(button.dataset.id);
        this.updateCartUI();
        showFeedback('Item removed from cart', 'success');
      });
    });
  },

  handleCheckout: async (cart) => {
    try {
      // Implement your checkout logic here
      // This could involve creating an order document in Firestore
      // and processing payment with Stripe or similar
      
      showFeedback('Checkout completed successfully!', 'success');
      await CartService.clearCart();
      this.updateCartUI();
    } catch (error) {
      showFeedback(`Checkout error: ${error.message}`, 'error');
    }
  }
};

// Auto-initialize if cart elements are present
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('cart-container')) {
    CartUI.init();
  }
});
