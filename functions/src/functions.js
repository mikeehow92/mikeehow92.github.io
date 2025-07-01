import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase-client.js';

/**
 * Cliente para interactuar con Cloud Functions
 */
export const functionsClient = {
  /**
   * Crea una orden de PayPal
   * @param {Object} cart - Carrito de compras
   * @param {Array} cart.items - Productos
   * @param {number} cart.total - Total a pagar
   * @returns {Promise<string>} ID de la orden PayPal
   */
  createPayPalOrder: async (cart) => {
    try {
      const functions = getFunctions(app);
      const createOrder = httpsCallable(functions, 'createPayPalOrder');
      
      const { data } = await createOrder({
        cart: {
          items: cart.items.map(item => ({
            id: item.id,
            name: item.name.substring(0, 127), // PayPal limita a 127 caracteres
            price: parseFloat(item.price),
            quantity: parseInt(item.quantity)
          })),
          total: parseFloat(cart.total)
        }
      });

      return data.id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error(formatFirebaseError(error));
    }
  },

  /**
   * Captura un pago de PayPal
   * @param {string} orderId - ID de la orden PayPal
   * @returns {Promise<Object>} Datos de la transacción
   */
  capturePayPalOrder: async (orderId) => {
    try {
      const functions = getFunctions(app);
      const captureOrder = httpsCallable(functions, 'capturePayPalOrder');
      
      const { data } = await captureOrder({ 
        orderId: orderId 
      });

      return {
        transactionId: data.transactionId,
        amount: data.amount,
        status: data.status
      };
    } catch (error) {
      console.error('Error capturing order:', error);
      throw new Error(formatFirebaseError(error));
    }
  },

  /**
   * Obtiene el historial de órdenes del usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} Lista de órdenes
   */
  getUserOrders: async (userId) => {
    const functions = getFunctions(app);
    const getOrders = httpsCallable(functions, 'getUserOrders');
    
    const { data } = await getOrders({ userId });
    return data.orders || [];
  }
};

// ==================== Helpers ====================

/**
 * Formatea errores de Firebase Functions
 * @param {Error} error - Error original
 * @returns {string} Mensaje legible
 */
function formatFirebaseError(error) {
  // Firebase Functions v2
  if (error.details) {
    return error.details.message || 'Error desconocido';
  }
  
  // Firebase Functions v1
  if (error.message) {
    try {
      const errorObj = JSON.parse(error.message.split('INTERNAL:')[1] || '{}');
      return errorObj.message || error.message;
    } catch {
      return error.message;
    }
  }
  
  return 'Error al comunicarse con el servidor';
}

/**
 * Verifica si el error es por permisos
 * @param {Error} error 
 * @returns {boolean}
 */
export function isPermissionError(error) {
  return error.message.includes('permission-denied') || 
         error.message.includes('PERMISSION_DENIED');
}

/**
 * Verifica si el error es por no autenticado
 * @param {Error} error 
 * @returns {boolean}
 */
export function isUnauthenticatedError(error) {
  return error.message.includes('unauthenticated') ||
         error.message.includes('UNAUTHENTICATED');
}
