import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { PayPalHttpClient, SandboxEnvironment } from '@paypal/paypalhttp';

admin.initializeApp();
const db = admin.firestore();

// Configura PayPal
const paypalClient = new PayPalHttpClient(
  new SandboxEnvironment(
    functions.config().paypal.client_id,
    functions.config().paypal.client_secret
  )
);

// API simple
export const api = functions.https.onRequest((req, res) => {
  res.json({ status: 'online', timestamp: admin.firestore.Timestamp.now().toMillis() });
});

// Función para crear orden (simplificada)
export const createOrder = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { amount, userId } = req.body;
    
    if (!amount || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Guardar en Firestore
    const orderRef = await db.collection('orders').add({
      amount: parseFloat(amount),
      userId,
      status: 'CREATED',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({ 
      success: true,
      orderId: orderRef.id
    });

  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Función para procesar pago (simplificada)
export const processPayment = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Missing order ID' });
    }

    // Actualizar en Firestore
    await db.collection('orders').doc(orderId).update({
      status: 'COMPLETED',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({ 
      success: true,
      orderId
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
