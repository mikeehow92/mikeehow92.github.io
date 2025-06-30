import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as paypal from '@paypal/paypal-server-sdk';

// Inicialización condicional para evitar múltiples inicializaciones
if (!admin.apps.length) {
  admin.initializeApp();
}

// Configuración reusable del cliente PayPal
const getPayPalClient = () => {
  return new paypal.core.PayPalHttpClient(
    new paypal.core.SandboxEnvironment(
      functions.config().paypal.client_id,
      functions.config().paypal.client_secret
    )
  );
};

export const createPayPalOrder = functions.https.onCall(async (data, context) => {
  // 1. Validación de autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated', 
      'Debes iniciar sesión para realizar pedidos',
      { code: 'NO_AUTH' }
    );
  }

  // 2. Validación del carrito (adaptado a tu estructura)
  if (!data.cart || !Array.isArray(data.cart.items) || !data.cart.total) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'El carrito no es válido',
      { 
        requiredFields: ['cart.items', 'cart.total'],
        received: Object.keys(data)
      }
    );
  }

  const paypalClient = getPayPalClient();
  const db = admin.firestore();
  const batch = db.batch();

  try {
    // 3. Crear la orden en PayPal
    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: data.cart.total.toFixed(2),
          breakdown: {
            item_total: {
              currency_code: 'USD',
              value: data.cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)
            }
          }
        },
        items: data.cart.items.map(item => ({
          name: item.name.substring(0, 127), // PayPal limita a 127 caracteres
          quantity: item.quantity.toString(),
          unit_amount: {
            currency_code: 'USD',
            value: item.price.toFixed(2)
          },
          sku: item.id || 'NO_SKU'
        }))
      }],
      application_context: {
        shipping_preference: 'NO_SHIPPING' // Adaptar si tienes envíos
      }
    });

    const response = await paypalClient.execute(request);
    const order = response.result;

    // 4. Guardar en Firestore (adaptado a tu DB)
    const orderRef = db.collection('orders').doc(order.id);
    batch.set(orderRef, {
      userId: context.auth.uid,
      status: 'CREATED',
      amount: data.cart.total,
      items: data.cart.items,
      paypalData: order,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Campos adicionales para tu estructura:
      merchantId: 'TU_MERCHANT_ID', // Reemplazar con tu lógica
      platform: 'web'
    });

    // 5. Actualizar metadatos del usuario
    const userRef = db.collection('users').doc(context.auth.uid);
    batch.update(userRef, {
      lastOrderAttempt: admin.firestore.FieldValue.serverTimestamp(),
      orderCount: admin.firestore.FieldValue.increment(1)
    });

    await batch.commit();

    return { 
      id: order.id,
      status: order.status,
      paypalOrderId: order.id
    };

  } catch (error) {
    functions.logger.error('Error en createOrder:', {
      userId: context.auth?.uid,
      error: error.message,
      stack: error.stack,
      cartSummary: {
        itemCount: data.cart.items.length,
        total: data.cart.total
      }
    });

    // Error específico para PayPal
    if (error instanceof paypal.core.HttpError) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Error en PayPal: ' + error.message,
        {
          paypalDebugId: error.headers['paypal-debug-id'],
          details: JSON.parse(error.message)
        }
      );
    }

    throw new functions.https.HttpsError(
      'internal',
      'Error al crear la orden',
      { debugId: context.instanceIdToken }
    );
  }
});
