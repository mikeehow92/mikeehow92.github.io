import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Inicialización de Firebase Admin
admin.initializeApp();

// Importación de las funciones PayPal
import { createPayPalOrder } from './paypal/createOrder';
import { capturePayPalOrder } from './paypal/captureOrder';

// Configuración global
const region = 'southamerica-east1'; // Ajusta tu región preferida

/**
 * ======================================
 *  FUNCIONES PRINCIPALES
 * ======================================
 */

// Función para crear órdenes PayPal
exports.createPayPalOrder = functions
  .region(region)
  .https
  .onCall(createPayPalOrder);

// Función para capturar pagos PayPal
exports.capturePayPalOrder = functions
  .region(region)
  .https
  .onCall(capturePayPalOrder);

/**
 * ======================================
 *  FUNCIONES AUXILIARES
 * ======================================
 */

// Función para limpiar órdenes antiguas (ejecución diaria)
exports.cleanupOldOrders = functions
  .region(region)
  .pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 días atrás

    const ordersRef = admin.firestore().collection('orders');
    const query = ordersRef
      .where('status', 'in', ['CREATED', 'PENDING'])
      .where('createdAt', '<', cutoffDate);

    const snapshot = await query.get();
    const batch = admin.firestore().batch();

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'EXPIRED',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
    return { processed: snapshot.size };
  });

/**
 * ======================================
 *  TRIGGERS DE FIRESTORE
 * ======================================
 */

// Trigger cuando se actualiza una orden
exports.onOrderUpdate = functions
  .region(region)
  .firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();

    // Solo procesar si cambió el estado
    if (newData.status === previousData.status) return null;

    const userRef = admin.firestore().collection('users').doc(newData.userId);

    // Actualizar estadísticas del usuario
    await userRef.update({
      lastOrderStatus: newData.status,
      [`statusCounts.${newData.status}`]: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { result: 'User stats updated' };
  });

/**
 * ======================================
 *  CONFIGURACIÓN Y UTILIDADES
 * ======================================
 */

// Health Check endpoint
exports.healthCheck = functions
  .region(region)
  .https
  .onRequest((req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.FUNCTIONS_EMULATOR ? 'development' : 'production'
    });
  });
