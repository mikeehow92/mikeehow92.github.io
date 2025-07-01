import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as paypal from '@paypal/paypal-server-sdk';

// Inicialización optimizada
admin.initializeApp();
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true }); // Evita errores con campos undefined

// Configura PayPal con validación
const getPaypalClient = () => {
  const clientId = functions.config().paypal?.client_id;
  const clientSecret = functions.config().paypal?.client_secret;
  
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials missing in Firebase config');
  }

  return new paypal.core.PayPalHttpClient(
    new paypal.core.SandboxEnvironment(clientId, clientSecret)
  );
};

const paypalClient = getPaypalClient();

// Middleware mejorado
const handleJson = (handler: functions.HttpsFunction) => {
  return functions.https.onRequest(async (req, res) => {
    try {
      if (req.method === 'POST' && !req.body && req.rawBody) {
        req.body = JSON.parse(req.rawBody.toString());
      }
      return handler(req, res);
    } catch (error) {
      functions.logger.error('Middleware error:', { error });
      return res.status(400).json({ error: 'Invalid request format' });
    }
  });
};

// API de estado
export const api = functions.https.onRequest(async (req, res) => {
  res.json({ 
    status: 'online',
    timestamp: admin.firestore.Timestamp.now().toMillis(),
    environment: 'sandbox' // ← Útil para debugging
  });
});

// Crear orden
export const createOrder = handleJson(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, userId } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { 
          currency_code: 'USD', 
          value: parseFloat(amount).toFixed(2) 
        }
      }]
    });

    const paypalResponse = await paypalClient.execute(request);
    const orderId = paypalResponse.result.id;

    await db.collection('orders').doc(orderId).set({
      userId,
      amount: parseFloat(amount),
      status: 'CREATED',
      paypalOrderId: orderId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.json({ 
      success: true,
      orderId,
      paypalStatus: paypalResponse.result.status
    });

  } catch (error: any) {
    functions.logger.error('CreateOrder error:', { 
      error: error.message,
      debugId: error.headers?.['paypal-debug-id']
    });
    
    return res.status(500).json({ 
      error: 'Order creation failed',
      details: error.message,
      paypalDebugId: error.headers?.['paypal-debug-id']
    });
  }
});

// Procesar pago
export const processPayment = handleJson(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId, userId } = req.body;

    if (!orderId || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verificar existencia en Firestore primero
    const orderRef = db.collection('orders').doc(orderId);
    const doc = await orderRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const captureRequest = new paypal.orders.OrdersCaptureRequest(orderId);
    const captureResponse = await paypalClient.execute(captureRequest);
    const captureId = captureResponse.result.id;

    await orderRef.update({
      status: 'COMPLETED',
      captureId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.json({ 
      success: true,
      captureId,
      paypalStatus: captureResponse.result.status
    });

  } catch (error: any) {
    functions.logger.error('ProcessPayment error:', {
      orderId: req.body?.orderId,
      error: error.message
    });

    return res.status(500).json({
      error: 'Payment processing failed',
      details: error.message,
      paypalDebugId: error.headers?.['paypal-debug-id']
    });
  }
});

// Exporta TODAS las funciones como módulo
module.exports = {
  api,
  createOrder,
  processPayment
};
