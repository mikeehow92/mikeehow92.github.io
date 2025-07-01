import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { app } from '../firebase/firebase-client.js';

/**
 * Servicio para manejar operaciones con PayPal
 */
export const paypalService = {
  /**
   * Crea una orden de PayPal y la registra en Firestore
   * @param {Object} cart - Carrito de compras
   * @param {Array} cart.items - Productos en el carrito
   * @param {number} cart.total - Total del carrito
   * @returns {Promise<string>} ID de la orden PayPal
   */
  createOrder: async (cart) => {
    try {
      // 1. Crear orden en PayPal via Cloud Functions
      const functions = getFunctions(app);
      const createPayPalOrder = httpsCallable(functions, 'createPayPalOrder');
      
      const { data } = await createPayPalOrder({
        cart: {
          items: cart.items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          total: cart.total
        }
      });

      // 2. Guardar en Firestore (opcional)
      const db = getFirestore(app);
      await setDoc(doc(db, 'orderAttempts', data.id), {
        status: 'CREATED',
        userId: cart.userId, // Asegúrate de pasar el userId desde el frontend
        createdAt: new Date().toISOString(),
        amount: cart.total
      });

      return data.id;

    } catch (error) {
      console.error('Error al crear orden:', error);
      throw new Error(parsePayPalError(error));
    }
  },

  /**
   * Captura un pago de PayPal
   * @param {string} orderId - ID de la orden PayPal
   * @returns {Promise<Object>} Resultado de la transacción
   */
  captureOrder: async (orderId) => {
    try {
      const functions = getFunctions(app);
      const capturePayPalOrder = httpsCallable(functions, 'capturePayPalOrder');
      
      const { data } = await capturePayPalOrder({ orderId });

      // Registrar en Firestore
      const db = getFirestore(app);
      await setDoc(doc(db, 'transactions', data.transactionId), {
        orderId,
        status: data.status,
        amount: data.amount,
        completedAt: new Date().toISOString()
      }, { merge: true });

      return data;

    } catch (error) {
      console.error('Error al capturar orden:', error);
      throw new Error(parsePayPalError(error));
    }
  },

  /**
   * Guarda los detalles de la transacción en Firestore
   * @param {Object} transaction - Datos de la transacción
   */
  saveTransactionDetails: async (transaction) => {
    const db = getFirestore(app);
    await setDoc(doc(db, 'transactions', transaction.id), {
      ...transaction,
      processedAt: new Date().toISOString()
    });
  }
};

// ==================== Helpers ====================

/**
 * Parsea errores de PayPal/Firebase
 * @param {Error} error 
 * @returns {string}
 */
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

/**
 * Verifica si el error es recuperable
 * @param {Error} error 
 * @returns {boolean}
 */
export function isRecoverableError(error) {
  return error.message.includes('INSTRUMENT_DECLINED') || 
         error.message.includes('PAYER_ACTION_REQUIRED');
}
