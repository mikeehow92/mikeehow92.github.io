import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../firebase/firebase-client.js';

export const paypalService = {
  createOrder: async (checkoutData) => {
    try {
      if (!checkoutData?.total || checkoutData.total <= 0) {
        throw new Error('Monto total inválido');
      }

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
        customer: _getCustomerData(),
        shipping: _getShippingData()
      });

      await _saveToFirestore('orderAttempts', {
        id: data.id,
        status: 'CREATED',
        userId: getAuth(app).currentUser?.uid || 'guest',
        amount: checkoutData.total,
        items: checkoutData.items.length,
        createdAt: serverTimestamp()
      });

      return data.id;

    } catch (error) {
      throw new Error(parsePayPalError(error));
    }
  },

  captureOrder: async (orderId, checkoutData) => {
    try {
      const functions = getFunctions(app);
      const captureOrder = httpsCallable(functions, 'capturePayPalOrder');
      
      const { data } = await captureOrder({ orderId });
      await _saveTransaction(data, orderId, checkoutData);
      
      return data;

    } catch (error) {
      throw new Error(parsePayPalError(error));
    }
  }
};

// ===== Funciones Auxiliares =====
async function _saveTransaction(paymentData, orderId, checkoutData) {
  const user = getAuth(app).currentUser;
  
  await _saveToFirestore('transactions', {
    id: orderId,
    status: paymentData.status,
    amount: checkoutData.total,
    subtotal: checkoutData.subtotal,
    tax: checkoutData.tax,
    shippingCost: checkoutData.shipping,
    items: checkoutData.items,
    customer: _getCustomerData(),
    shippingDetails: _getShippingData(),
    paymentMethod: 'paypal',
    paypalData: paymentData,
    timestamp: serverTimestamp(),
    isGuest: !user
  });
}

function _getCustomerData() {
  const email = document.getElementById('customerEmail')?.value.trim();
  if (!email?.includes('@')) throw new Error('Email inválido');

  return {
    userId: getAuth(app).currentUser?.uid || 'guest',
    email,
    name: document.getElementById('customerName')?.value.trim() || '',
    phone: document.getElementById('customerPhone')?.value.trim() || ''
  };
}

function _getShippingData() {
  return {
    address: document.getElementById('shippingAddress')?.value.trim() || '',
    department: document.getElementById('departamento')?.value || '',
    municipality: document.getElementById('municipio')?.value || ''
  };
}

async function _saveToFirestore(collection, data) {
  try {
    await setDoc(doc(getFirestore(app), collection, data.id), data);
  } catch (error) {
    console.error(`Error guardando en ${collection}:`, error);
    throw error;
  }
}

function parsePayPalError(error) {
  // Errores de Firebase Functions
  if (error.details?.code === 'PAYMENT_ERROR') {
    return 'Error al procesar el pago. Verifica tus datos.';
  }

  // Errores de PayPal
  const paypalError = error.message.match(/"message":"([^"]+)"/);
  if (paypalError) return paypalError[1];

  return error.message || 'Error desconocido';
}

export function isRecoverableError(error) {
  return error.message.includes('INSTRUMENT_DECLINED') || 
         error.message.includes('PAYER_ACTION_REQUIRED');
}
