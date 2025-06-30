import { getFunctions, httpsCallable } from 'firebase/firebase-client.js';

/**
 * Cliente para llamar a Cloud Functions
 */
export const functionsService = {
    /**
     * Crea una orden de PayPal
     * @param {Object} cart - Datos del carrito
     * @param {Array} cart.items - Productos en el carrito
     * @param {number} cart.total - Total a pagar
     * @returns {Promise<{id: string}>} ID de la orden PayPal
     */
    createPayPalOrder: async (cart) => {
        try {
            const createOrder = httpsCallable(getFunctions(), 'createPayPalOrder');
            const { data } = await createOrder({
                cart: {
                    items: cart.items,
                    total: cart.total,
                    currency: 'USD' // Puede ser dinámico
                }
            });
            return data;
        } catch (error) {
            console.error('Error creating order:', error);
            throw parseFirebaseError(error);
        }
    },

    /**
     * Captura el pago de una orden PayPal
     * @param {string} orderId - ID de la orden PayPal
     * @returns {Promise<Object>} Datos de la transacción
     */
    capturePayPalOrder: async (orderId) => {
        try {
            const captureOrder = httpsCallable(getFunctions(), 'capturePayPalOrder');
            const { data } = await captureOrder({ orderId });
            return data;
        } catch (error) {
            console.error('Error capturing order:', error);
            throw parseFirebaseError(error);
        }
    },

    /**
     * Obtiene el historial de órdenes del usuario
     * @param {string} userId - ID del usuario autenticado
     * @returns {Promise<Array>} Lista de órdenes
     */
    getOrderHistory: async (userId) => {
        try {
            const getOrders = httpsCallable(getFunctions(), 'getUserOrders');
            const { data } = await getOrders({ userId });
            return data;
        } catch (error) {
            console.error('Error getting orders:', error);
            throw parseFirebaseError(error);
        }
    }
};

/**
 * Parsea errores de Firebase Functions
 * @param {Object} error - Error original
 * @returns {Error} Error formateado
 */
function parseFirebaseError(error) {
    // Firebase Functions v2 usa error.details
    if (error.details) {
        return new Error(error.details.message || 'Unknown Firebase error');
    }
    
    // Firebase Functions v1 usa error.message
    if (error.message) {
        try {
            const errorDetails = JSON.parse(error.message.split('INTERNAL:')[1] || '{}');
            return new Error(errorDetails.message || error.message);
        } catch {
            return error;
        }
    }
    
    return error;
}

/**
 * Verifica si el error es por falta de permisos
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
