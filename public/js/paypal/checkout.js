/**
 * Integración de PayPal Checkout con Firebase Firestore
 * Ubicación: /public/js/paypal/checkout.js
 * Versión segura y modular (Firebase v9 + PayPal SDK)
 */

import { loadScript } from './utils.js';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase-client.js'; // Conexión a Firestore

// ==================== CONSTANTES ====================
const PAYPAL_SDK_URL = 'https://www.paypal.com/sdk/js?client-id=';
const DEFAULT_CURRENCY = 'USD';

// ==================== FUNCIÓN PRINCIPAL ====================
export async function initPayPalCheckout(config = {}) {
  try {
    // 1. Cargar datos del carrito
    const checkoutData = loadCheckoutData();
    validateCheckoutData(checkoutData);

    // 2. Renderizar UI
    renderCartItems(checkoutData);
    updateTotals(checkoutData);
    setupAddressForm();

    // 3. Inicializar PayPal
    await loadPayPalSDK(config.clientId || 'SB'); // 'SB' = Sandbox
    setupPayPalButton(checkoutData, config);

    // 4. Método de pago alternativo
    if (config.alternativePayment !== false) {
      setupAlternativePayment(checkoutData);
    }

  } catch (error) {
    handleInitializationError(error);
  }
}

// ==================== FUNCIONES DE FIRESTORE ====================
async function saveOrderToFirestore(orderData) {
  try {
    await setDoc(doc(db, "orders", orderData.id), {
      ...orderData,
      status: 'completed',
      timestamp: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error saving order to Firestore:", error);
    return false;
  }
}

// ==================== FUNCIONES DE PAYPAL ====================
async function loadPayPalSDK(clientId) {
  if (!window.paypal) {
    await loadScript(`${PAYPAL_SDK_URL}${clientId}&currency=${DEFAULT_CURRENCY}`);
  }
}

function setupPayPalButton(checkoutData, config) {
  window.paypal.Buttons({
    style: {
      layout: 'vertical',
      color: 'blue',
      shape: 'rect'
    },
    createOrder: async () => {
      if (!validateForm()) throw new Error('Complete los campos requeridos');
      return await createPayPalOrder(checkoutData);
    },
    onApprove: async (data) => {
      try {
        const captureResult = await capturePayPalOrder(data.orderID);
        
        // Guardar en Firestore
        const orderData = {
          id: data.orderID,
          items: checkoutData.items,
          total: checkoutData.total,
          payer: captureResult.payer
        };
        
        await saveOrderToFirestore(orderData);
        
        showFeedback('¡Pago completado!', `Orden #${data.orderID}`, 'success');
        clearCart();
        
        setTimeout(() => {
          config.onSuccess?.(captureResult) || (window.location.href = 'confirmacion.html');
        }, 3000);

      } catch (error) {
        handlePaymentError(error, config);
      }
    },
    onError: (err) => handlePaymentError(err, config)
  }).render('#paypal-button-container');
}

// ==================== FUNCIONES AUXILIARES ====================
function loadCheckoutData() {
  const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.13;
  const shipping = parseFloat(localStorage.getItem('shippingCost')) || 0;

  return {
    items: cartItems,
    subtotal,
    tax,
    shipping,
    total: subtotal + tax + shipping,
    currency: DEFAULT_CURRENCY
  };
}

function validateForm() {
  const requiredFields = ['customerName', 'customerEmail', 'shippingAddress'];
  return requiredFields.every(field => {
    const value = document.getElementById(field)?.value?.trim();
    if (!value) {
      document.getElementById(field).style.borderColor = 'red';
      return false;
    }
    return true;
  });
}

// ==================== MANEJO DE ERRORES ====================
function handlePaymentError(error, config) {
  console.error("Payment error:", error);
  const message = error.message || 'Error al procesar el pago';
  showFeedback('Error', message, 'error');
  config.onError?.(error);
}

function handleInitializationError(error) {
  console.error("Initialization error:", error);
  showFeedback('Error', 'No se pudo iniciar el pago', 'error');
}

// ==================== UI FUNCTIONS ====================
function renderCartItems(data) {
  const container = document.getElementById('orderItems');
  if (!container) return;

  container.innerHTML = data.items.map(item => `
    <div class="cart-item">
      <span>${item.name} x${item.quantity}</span>
      <span>$${(item.price * item.quantity).toFixed(2)}</span>
    </div>
  `).join('');
}

function showFeedback(title, message, type) {
  // Implementa tu lógica de visualización de feedback
}

export default {
  init: initPayPalCheckout
};
