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

// API simple de prueba
export const api = functions.https.onRequest((req, res) => {
  res.json({ status: 'online', timestamp: Date.now() });
});

// Función para crear orden (simplificada)
export const createOrder = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const { amount } = req.body;
    const order = {
      amount,
      status: 'CREATED',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('orders').add(order);
    return res.status(200).json({ id: docRef.id, ...order });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send('Internal Server Error');
  }
});
