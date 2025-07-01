import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as paypal from '@paypal/paypal-server-sdk';

// 1. Inicialización de Firebase
admin.initializeApp();

// 2. Configuración de Firestore optimizada
const db = admin.firestore();
db.settings({
  preferRest: true,
  timeout: 5000
});

// 3. Configuración de PayPal
const paypalClient = new paypal.core.PayPalHttpClient(
  new paypal.core.SandboxEnvironment(
    functions.config().paypal.client_id,
    functions.config().paypal.client_secret
  )
);

// 4. Función API HTTP (para rewrites)
export const api = functions.region('us-central1').https.onRequest(async (req, res) => {
  try {
    res.json({
      status: 'success',
      country: 'SV',
      currency: 'USD',
      timestamp: admin.firestore.Timestamp.now().toMillis()
    });
  } catch (error) {
    functions.logger.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. Función para crear órdenes (Callable)
export const createOrder = functions.region('us-central1').https.onCall(async (data, context) => {
  // Validación de autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Debes iniciar sesión para crear órdenes',
      { code: 'UNAUTHENTICATED' }
    );
  }

  try {
    // Lógica de creación de orden en PayPal
    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: data.amount.toFixed(2)
        }
      }]
    });

    const paypalResponse = await paypalClient.execute(request);
    const orderId = paypalResponse.result.id;

    // Guardar en Firestore
    await db.collection('orders').doc(orderId).set({
      userId: context.auth.uid,
      amount: data.amount,
      currency: 'USD',
      status: 'CREATED',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      paypalOrderId: orderId
    });

    return { 
      success: true,
      orderId: orderId
    };

  } catch (error) {
    functions.logger.error('CreateOrder Error:', { 
      userId: context.auth?.uid, 
      error: error.message 
    });
    throw new functions.https.HttpsError(
      'internal',
      'Error al crear la orden',
      { paypalDebugId: error.headers?.['paypal-debug-id'] }
    );
  }
});

// 6. Función para procesar pagos (Callable)
export const processPayment = functions.region('us-central1').https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Autenticación requerida',
      { code: 'AUTH_REQUIRED' }
    );
  }

  try {
    // Capturar pago en PayPal
    const captureRequest = new paypal.orders.OrdersCaptureRequest(data.orderId);
    const captureResponse = await paypalClient.execute(captureRequest);
    const captureId = captureResponse.result.id;

    // Actualizar Firestore
    await db.collection('orders').doc(data.orderId).update({
      status: 'COMPLETED',
      captureId: captureId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      captureId: captureId
    };

  } catch (error) {
    await db.collection('payment_errors').add({
      orderId: data.orderId,
      error: error.message,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Error al procesar el pago',
      { 
        paypalError: error.message,
        orderId: data.orderId
      }
    );
  }
});
