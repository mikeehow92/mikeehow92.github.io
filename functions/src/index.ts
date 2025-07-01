import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { PayPalHttpClient, SandboxEnvironment } from '@paypal/paypal-server-sdk';

admin.initializeApp();
const db = admin.firestore();

// Configura PayPal
const paypalClient = new PayPalHttpClient(
  new SandboxEnvironment(
    functions.config().paypal.client_id,
    functions.config().paypal.client_secret
  )
);

// Middleware mejorado
const handleJson = (handler: (req: functions.Request, res: functions.Response) => Promise<void>) => {
  return functions.https.onRequest(async (req, res) => {
    try {
      if (req.method === 'POST' && !req.body && (req as any).rawBody) {
        req.body = JSON.parse((req as any).rawBody.toString());
      }
      return await handler(req, res);
    } catch (error) {
      functions.logger.error('Middleware error:', error);
      return res.status(400).json({ error: 'Invalid request format' });
    }
  });
};

// API de estado
export const api = functions.https.onRequest(async (req, res) => {
  res.json({ 
    status: 'online',
    timestamp: admin.firestore.Timestamp.now().toMillis() 
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

    const request = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { 
          currency_code: 'USD', 
          value: parseFloat(amount).toFixed(2) 
        }
      }]
    };

    const paypalResponse = await paypalClient.execute('OrdersCreateRequest', request);
    const orderId = paypalResponse.result.id;

    await db.collection('orders').doc(orderId).set({
      userId,
      amount: parseFloat(amount),
      status: 'CREATED',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.json({ 
      success: true,
      orderId
    });

  } catch (error: any) {
    functions.logger.error('CreateOrder error:', error);
    return res.status(500).json({ 
      error: 'Order creation failed',
      details: error.message
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

    const captureResponse = await paypalClient.execute('OrdersCaptureRequest', orderId);
    const captureId = captureResponse.result.id;

    await db.collection('orders').doc(orderId).update({
      status: 'COMPLETED',
      captureId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.json({ 
      success: true,
      captureId
    });

  } catch (error: any) {
    functions.logger.error('ProcessPayment error:', error);
    return res.status(500).json({
      error: 'Payment processing failed',
      details: error.message
    });
  }
});
