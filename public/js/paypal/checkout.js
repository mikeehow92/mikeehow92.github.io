/**
 * Integración segura PayPal + Firebase (Credenciales en servidor)
 * Ubicación: /public/js/paypal/checkout.js
 * Versión 2.0 - Credenciales manejadas por backend
 */

import { loadScript } from './utils.js';

// ==================== CONFIGURACIÓN INICIAL ====================
export async function initPayPalCheckout(config = {}) {
  try {
    // 1. Cargar datos del carrito (localStorage)
    const checkoutData = loadCheckoutData();
    validateCheckoutData(checkoutData);

    // 2. Renderizar UI
    renderCartItems(checkoutData);
    updateTotals(checkoutData);
    setupAddressForm();

    // 3. Cargar SDK PayPal (client-id seguro desde backend)
    await loadPayPalSDK(config.clientId || await fetchClientIdFromServer());

    // 4. Configurar botón PayPal
    setupPayPalButton(checkoutData, config);

    // 5. Método de pago alternativo
    if (config.alternativePayment !== false) {
      setupAlternativePayment(checkoutData);
    }

  } catch (error) {
    handleInitializationError(error);
  }
}

// ==================== FUNCIONES PRINCIPALES ====================
async function fetchClientIdFromServer() {
  const response = await fetch('/api/get-paypal-client-id');
  const data = await response.json();
  return data.clientId; // Ejemplo: { clientId: "AXX..." }
}

async function loadPayPalSDK(clientId) {
  if (!window.paypal) {
    await loadScript(
      `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`
    );
  }
}

function setupPayPalButton(checkoutData, config) {
  window.paypal.Buttons({
    style: {
      layout: 'vertical',
      color: 'blue',
      shape: 'rect',
      label: 'paypal'
    },
    createOrder: async () => {
      if (!validateForm()) throw new Error('Complete los campos requeridos');
      
      // ✅ Llama a tu endpoint seguro en el servidor
      const response = await fetch('/api/create-paypal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutData)
      });
      return await response.json().orderId;
    },
    onApprove: async (data) => {
      try {
        // ✅ Verifica el pago con tu backend
        const response = await fetch('/api/capture-paypal-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderID })
        });
        const result = await response.json();

        if (result.success) {
          showFeedback('¡Pago completado!', `Orden #${data.orderID}`, 'success');
          clearCart();
          setTimeout(() => window.location.href = 'confirmacion.html', 3000);
        } else {
          throw new Error(result.error || "Error al procesar el pago");
        }
      } catch (error) {
        handlePaymentError(error, config);
      }
    },
    onError: (err) => handlePaymentError(err, config)
  }).render('#paypal-button-container');
}

// ==================== FUNCIONES AUXILIARES ====================
// (Mantén las mismas funciones de utils, render, validación, etc.)
// ...

export default {
  init: initPayPalCheckout
};
