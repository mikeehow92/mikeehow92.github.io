import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as paypal from '@paypal/paypal-server-sdk';

// Inicializa Firebase Admin
admin.initializeApp();

// Configura cliente PayPal
const paypalClient = new paypal.core.PayPalHttpClient(
  new paypal.core.SandboxEnvironment(
    functions.config().paypal.client_id,
    functions.config().paypal.client_secret
  )
);

export const createPayPalOrder = functions.https.onCall(async (data, context) => {
  // 1. Validar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated', 
      'Debes iniciar sesión para realizar pagos'
    );
  }

  // 2. Validar datos del carrito
  if (!data.cart || !data.cart.total) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'El carrito de compras es inválido'
    );
  }

  try {
    // 3. Crear orden en PayPal
    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: data.cart.total.toString()
        },
        description: `Compra de ${data.cart.items.length} productos`
      }]
    });

    const response = await paypalClient.execute(request);
    const order = response.result;

    // 4. Guardar en Firestore
    await admin.firestore().collection('orders').doc(order.id).set({
      userId: context.auth.uid,
      amount: data.cart.total,
      items: data.cart.items,
      status: 'CREATED',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      paypalData: order
    });

    return { id: order.id };

  } catch (error) {
    functions.logger.error('Error creating PayPal order:', error);
    throw new functions.https.HttpsError(
      'internal', 
      'Error al crear la orden de pago'
    );
  }
});
