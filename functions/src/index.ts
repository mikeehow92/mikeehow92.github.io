import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// 1. Configuración inicial de Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://tu-proyecto.firebaseio.com',
  storageBucket: 'tu-proyecto.appspot.com'
});

// 2. Configuración optimizada para El Salvador
const db = admin.firestore();
db.settings({
  preferRest: true,      // Mejor para HTTP en entornos serverless
  timeout: 5000,         // Timeout ajustado para conexiones desde Centroamérica
  ignoreUndefinedProperties: true  // Ignora campos undefined automáticamente
});

// 3. Inicialización de PayPal (si es necesario)
import * as paypal from '@paypal/paypal-server-sdk';
const paypalClient = new paypal.core.PayPalHttpClient(
  new paypal.core.SandboxEnvironment(
    functions.config().paypal.client_id,
    functions.config().paypal.client_secret
  )
);

// 4. Funciones principales
export const createOrder = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    // Validación de autenticación
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated', 
        'Debes iniciar sesión para realizar pedidos',
        { code: 'NO_AUTH' }
      );
    }

    try {
      // Crear orden en PayPal
      const request = new paypal.orders.OrdersCreateRequest();
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',  // Moneda oficial de El Salvador
            value: data.total.toFixed(2)
          },
          description: `Compra desde ${data.country || 'SV'}`
        }]
      });

      const response = await paypalClient.execute(request);
      const order = response.result;

      // Guardar en Firestore
      await db.collection('orders').doc(order.id).set({
        userId: context.auth.uid,
        status: 'CREATED',
        amount: data.total,
        currency: 'USD',
        country: 'SV',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { id: order.id };

    } catch (error) {
      functions.logger.error('Error en createOrder:', { 
        userId: context.auth?.uid, 
        error: error.message 
      });
      throw new functions.https.HttpsError(
        'internal', 
        'Error al crear la orden', 
        { debugId: context.instanceIdToken }
      );
    }
  });

export const capturePayment = functions
  .region('us-central1')
  .https
  .onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated', 
        'Acceso no autorizado'
      );
    }

    try {
      const captureRequest = new paypal.orders.OrdersCaptureRequest(data.orderId);
      const response = await paypalClient.execute(captureRequest);
      const captureData = response.result;

      // Actualizar Firestore
      await db.collection('orders').doc(data.orderId).update({
        status: 'COMPLETED',
        paypalCaptureId: captureData.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { status: 'success' };

    } catch (error) {
      await db.collection('payment_errors').add({
        orderId: data.orderId,
        error: error.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Error al procesar el pago',
        { paypalError: error.message }
      );
    }
  });

// 5. Función de utilidad para el cliente
export const getAppConfig = functions
  .region('us-central1')
  .https
  .onCall(() => {
    return {
      country: 'SV',
      currency: 'USD',
      paypalEnv: 'sandbox',
      allowedPaymentMethods: ['card', 'paypal']
    };
  });
