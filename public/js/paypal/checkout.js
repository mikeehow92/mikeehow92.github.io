/**
 * Integración de PayPal Checkout con Firebase
 * Ubicación: /public/js/paypal/checkout.js
 * Versión corregida (Firebase v9 + PayPal SDK)
 */

import { loadScript } from './utils.js';
import { paypalService } from './service.js';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db, auth } from '../firebase-client.js'; // Rutas ajustadas

// ==================== CONFIGURACIÓN INICIAL ====================
export async function initPayPalCheckout(config = {}) {
  try {
    const checkoutData = loadCheckoutData();
    validateCheckoutData(checkoutData);

    renderCartItems(checkoutData);
    updateTotals(checkoutData);
    setupAddressForm();

    await loadPayPalSDK(config.clientId || 'SB'); // 'SB' para sandbox

    setupPayPalButton(checkoutData, config);

    if (config.alternativePayment !== false) {
      setupAlternativePayment(checkoutData);
    }

    setupModalClose();
  } catch (error) {
    handleInitializationError(error);
  }
}

// ==================== FUNCIONES PRINCIPALES ====================
async function loadPayPalSDK(clientId) {
  if (!window.paypal) {
    await loadScript(
      `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`
    );
  }
}

function setupPayPalButton(checkoutData, config) {
  // ✅ Corrección: No reasignar paypal.Buttons, usarlo directamente
  window.paypal.Buttons({
    style: {
      layout: 'vertical',
      color: 'blue',
      shape: 'rect',
      label: 'paypal',
      ...config.buttonStyle
    },
    createOrder: async () => {
      if (!validateForm()) throw new Error('Complete los campos requeridos');
      return await paypalService.createOrder(checkoutData);
    },
    onApprove: async (data) => {
      try {
        const details = await paypalService.captureOrder(data.orderID, checkoutData);
        showFeedback('¡Pago completado!', `Orden #${data.orderID} procesada`, 'success');
        clearCart();
        
        setTimeout(() => {
          config.onSuccess?.(details) || (window.location.href = 'confirmacion.html');
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
  const shippingCost = parseFloat(localStorage.getItem('shippingCost')) || 0;
  const taxRate = 0.13;

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax + shippingCost;

  return {
    items: cartItems,
    subtotal,
    tax,
    shipping: shippingCost,
    total,
    currency: 'USD'
  };
}

// ✅ Corrección: Validación mejorada
function validateForm() {
  const requiredFields = ['customerName', 'customerEmail', 'shippingAddress'];
  let isValid = true;

  requiredFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (!field?.value?.trim()) {
      isValid = false;
      field.style.borderColor = '#ff0000';
    } else {
      field.style.borderColor = '';
    }
  });

  return isValid;
}

// ==================== MANEJO DE ERRORES ====================
function handleInitializationError(error) {
  console.error('Error inicializando pago:', error);
  showFeedback('Error', error.message, 'error');
  
  if (error.message.includes('carrito')) {
    setTimeout(() => window.location.href = 'productos.html', 2000);
  }
}

function handlePaymentError(error, config) {
  console.error("Error en el pago:", error);
  const message = config?.onError?.(error) || parsePayPalError(error);
  showFeedback('Error', message, 'error');
  
  if (isRecoverableError(error)) {
    document.getElementById('alternativePayment').style.display = 'block';
  }
}

// ==================== EXPORTACIONES ====================
export default {
  init: initPayPalCheckout
};
