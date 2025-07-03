import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../firebase/firebase-client.js';

export const paypalService = {
  /**
   * Crea una orden de PayPal y la registra en Firestore
   * @param {Object} checkoutData - Datos completos del checkout
   * @returns {Promise<string>} ID de la orden PayPal
   */
  createOrder: async (checkoutData) => {
    try {
      const functions = getFunctions(app);
      const createOrder = httpsCallable(functions, 'createPayPalOrder');
      
      const { data } = await createOrder({
        amount: checkoutData.total,
        items: checkoutData.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        customer: {
          email: document.getElementById('customerEmail')?.value || '',
          name: document.getElementById('customerName')?.value || ''
        },
        shipping: {
          address: document.getElementById('shippingAddress')?.value || '',
          department: document.getElementById('departamento')?.value || '',
          municipality: document.getElementById('municipio')?.value || ''
        }
      });

      await saveOrderAttempt(data.id, checkoutData);
      return data.id;

    } catch (error) {
      console.error('Error al crear orden:', error);
      throw new Error(parsePayPalError(error));
    }
  },

  /**
   * Captura un pago de PayPal
   * @param {string} orderId - ID de la orden PayPal
   * @param {Object} checkoutData - Datos completos del checkout
   * @returns {Promise<Object>} Resultado de la transacción
   */
  captureOrder: async (orderId, checkoutData) => {
    try {
      const functions = getFunctions(app);
      const captureOrder = httpsCallable(functions, 'capturePayPalOrder');
      
      const { data } = await captureOrder({ orderId });
      await saveTransaction(data, orderId, checkoutData);
      
      return data;

    } catch (error) {
      console.error('Error al capturar orden:', error);
      throw new Error(parsePayPalError(error));
    }
  }
};

// ==================== Helpers Internos ====================

async function saveOrderAttempt(orderId, checkoutData) {
  const db = getFirestore(app);
  const auth = getAuth(app);
  
  await setDoc(doc(db, 'orderAttempts', orderId), {
    status: 'CREATED',
    userId: auth.currentUser?.uid || 'guest',
    createdAt: serverTimestamp(),
    amount: checkoutData.total,
    items: checkoutData.items.length,
    isGuest: !auth.currentUser
  });
}

async function saveTransaction(paymentData, orderId, checkoutData) {
  const db = getFirestore(app);
  const auth = getAuth(app);
  
  await setDoc(doc(db, 'transactions', orderId), {
    orderId,
    status: paymentData.status,
    amount: checkoutData.total,
    subtotal: checkoutData.subtotal,
    tax: checkoutData.tax,
    shipping: checkoutData.shipping,
    items: checkoutData.items,
    customer: {
      userId: auth.currentUser?.uid || 'guest',
      email: document.getElementById('customerEmail')?.value || '',
      name: document.getElementById('customerName')?.value || '',
      phone: document.getElementById('customerPhone')?.value || ''
    },
    shipping: {
      address: document.getElementById('shippingAddress')?.value || '',
      department: document.getElementById('departamento')?.value || '',
      municipality: document.getElementById('municipio')?.value || ''
    },
    paymentMethod: 'paypal',
    paypalData: paymentData,
    timestamp: serverTimestamp(),
    isGuest: !auth.currentUser
  });
}

function parsePayPalError(error) {
  // Error de Firebase Functions
  if (error.details) {
    return error.details.message || 'Error en el servidor';
  }

  // Error de PayPal
  if (error.message.includes('PAYPAL')) {
    const match = error.message.match(/"message":"([^"]+)"/);
    return match ? match[1] : 'Error al procesar el pago con PayPal';
  }

  // Error genérico
  return error.message || 'Error desconocido';
}

export function isRecoverableError(error) {
  return error.message.includes('INSTRUMENT_DECLINED') || 
         error.message.includes('PAYER_ACTION_REQUIRED');
}
