import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as paypal from '@paypal/checkout-server-sdk';

admin.initializeApp();
const db = admin.firestore();

// Configura PayPal
const environment = new paypal.core.SandboxEnvironment(
  functions.config().paypal.client_id,
  functions.config().paypal.client_secret
);
const paypalClient = new paypal.core.PayPalHttpClient(environment);

// Estado simple
export const api = functions.https.onRequest((_req, res) => {
  res.json({
    status: 'online',
    timestamp: admin.firestore.Timestamp.now().toMillis()
  });
});

// Crear orden
export const createOrder = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { amount, userId } = req.body;

    if (!amount || !userId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const orderRef = await db.collection('orders').add({
      amount: parseFloat(amount),
      userId,
      status: 'CREATED',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({
      success: true,
      orderId: orderRef.id
    });

  } catch (error: any) {
    console.error('Error creating order:', error.message || error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Procesar pago
export const processPayment = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { orderId } = req.body;

    if (!orderId) {
      res.status(400).json({ error: 'Missing order ID' });
      return;
    }

    await db.collection('orders').doc(orderId).update({
      status: 'COMPLETED',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({
      success: true,
      orderId
    });

  } catch (error: any) {
    console.error('Error processing payment:', error.message || error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
