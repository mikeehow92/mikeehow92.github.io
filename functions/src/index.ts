import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {
  PayPalHttpClient,
  SandboxEnvironment,
  orders as paypalOrders
} from '@paypal/paypal-server-sdk';

admin.initializeApp();
const db = admin.firestore();

// Configurar PayPal
const paypalClient = new PayPalHttpClient(
  new SandboxEnvironment(
    functions.config().paypal.client_id,
    functions.config().paypal.client_secret
  )
);

// Estado simple
export const api = functions.https.onRequest((_req, res) => {
  res.json({
    status: 'online',
    timestamp: admin.firestore.Timestamp.now().toMillis()
  });
});

// Crear orden de PayPal + Firestore
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

    const request = new paypalOrders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: amount.toString()
        }
      }]
    });

    const order = await paypalClient.execute(request);

    const orderRef = await db.collection('orders').add({
      paypalOrderId: order.result.id,
      userId,
      amount: parseFloat(amount),
      status: 'CREATED',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({
      success: true,
      orderId: orderRef.id,
      paypalOrderId: order.result.id
    });

  } catch (error: any) {
    console.error('Error creating PayPal order:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Capturar pago (opcional: podrías llamarlo processPayment)
export const capturePayment = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { paypalOrderId } = req.body;
    if (!paypalOrderId) {
      res.status(400).json({ error: 'Missing PayPal order ID' });
      return;
    }

    const captureRequest = new paypalOrders.OrdersCaptureRequest(paypalOrderId);
    captureRequest.requestBody({});

    const capture = await paypalClient.execute(captureRequest);

    await db.collection('orders')
      .where('paypalOrderId', '==', paypalOrderId)
      .limit(1)
      .get()
      .then(snapshot => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          doc.ref.update({
            status: 'COMPLETED',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      });

    res.status(200).json({
      success: true,
      paypalOrderId,
      status: capture.result.status
    });

  } catch (error: any) {
    console.error('Error capturing payment:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});
