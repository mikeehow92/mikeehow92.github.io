import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Inicialización de Firebase Admin
admin.initializeApp();

// Configuración de Firestore optimizada para El Salvador
const db = admin.firestore();
db.settings({
  preferRest: true,
  timeout: 5000
});

// Función API principal (HTTP)
export const api = functions.region('us-central1').https.onRequest((req, res) => {
  res.json({
    status: 'API operativa',
    country: 'SV',
    currency: 'USD',
    timestamp: admin.firestore.Timestamp.now().toDate()
  });
});

// Función para creación de órdenes (Callable)
export const createOrder = functions.region('us-central1').https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Autenticación requerida');
  }

  try {
    const orderRef = await db.collection('orders').add({
      userId: context.auth.uid,
      amount: data.amount,
      currency: 'USD',
      status: 'CREATED',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      orderId: orderRef.id,
      status: 'success'
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Error al crear orden');
  }
});

// Función para procesar pagos (Callable)
export const processPayment = functions.region('us-central1').https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Autenticación requerida');
  }

  // Lógica de procesamiento de pago aquí
  return { status: 'completed' };
});
