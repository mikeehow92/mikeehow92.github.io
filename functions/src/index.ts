import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as paypal from '@paypal/paypal-server-sdk';

// Inicialización
admin.initializeApp();
const db = admin.firestore();

// Configura PayPal
const paypalClient = new paypal.core.PayPalHttpClient(
  new paypal.core.SandboxEnvironment(
    functions.config().paypal.client_id,
    functions.config().paypal.client_secret
  )
);

// Middleware para parsear JSON
const handleJson = (handler: (req: functions.Request, res: functions.Response) => Promise<void>) => {
  return async (req: functions.Request, res: functions.Response) => {
    try {
      if (req.method === 'POST' && !req.body) {
        req.body = JSON.parse(req.rawBody.toString());
      }
      await handler(req, res);
    } catch (error) {
      functions.logger.error('Middleware error:', error);
      res.status(400).json({ error: 'Invalid JSON' });
    }
  };
};

// API de estado
export const api = functions.region('us-central1').https.onRequest(async (req, res) => {
  res.json({ 
    status: 'online',
    timestamp: admin.firestore.Timestamp.now().toMillis() 
  });
});

// Crear orden (HTTP)
export const createOrder = functions.region('us-central1').https.onRequest(handleJson(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { amount, userId } = req.body;

    // Validación manual (reemplazo de Callable)
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Lógica de PayPal
    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: 'USD', value: amount.toFixed(2) }
      }]
    });

    const paypalResponse = await paypalClient.execute(request);
    const orderId = paypalResponse.result.id;

    // Firestore
    await db.collection('orders').doc(orderId).set({
      userId,
      amount,
      status: 'CREATED',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ orderId });
  } catch (error) {
    functions.logger.error('CreateOrder error:', error);
    res.status(500).json({ 
      error: 'Error al crear orden',
      debugId: error.headers?.['paypal-debug-id'] 
    });
  }
}));

// Procesar pago (HTTP)
export const processPayment = functions.region('us-central1').https.onRequest(handleJson(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { orderId, userId } = req.body;

    // Validación
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Capturar en PayPal
    const captureRequest = new paypal.orders.OrdersCaptureRequest(orderId);
    const captureResponse = await paypalClient.execute(captureRequest);

    // Actualizar Firestore
    await db.collection('orders').doc(orderId).update({
      status: 'COMPLETED',
      captureId: captureResponse.result.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true });
  } catch (error) {
    functions.logger.error('ProcessPayment error:', error);
    res.status(500).json({ 
      error: 'Error al procesar pago',
      details: error.message 
    });
  }
}));
