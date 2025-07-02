import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors'; // 

import { createOrder, captureOrder } from './paypal';

admin.initializeApp();
const db = admin.firestore();

const app = express();
const corsHandler = cors({ origin: true });

app.use(corsHandler);
app.use(express.json());

// Crear orden PayPal
app.post('/create-paypal-order', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const orderID = await createOrder(amount);
    return res.status(200).json({ orderID });
  } catch (err) {
    console.error('Error creating PayPal order:', err);
    return res.status(500).json({ error: 'Failed to create PayPal order' });
  }
});

// Capturar orden PayPal
app.post('/capture-paypal-order', async (req, res) => {
  try {
    const { orderID } = req.body;

    if (!orderID) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const captureData = await captureOrder(orderID);

    await db.collection('pagos').add({
      orderID,
      payer: captureData.payer,
      amount: captureData.purchase_units[0].payments.captures[0].amount,
      status: captureData.status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ success: true, data: captureData });
  } catch (err) {
    console.error('Error capturing PayPal order:', err);
    return res.status(500).json({ error: 'Failed to capture PayPal order' });
  }
});

// Obtener client ID de forma segura
app.get('/paypal-client-id', async (_req, res) => {
  const clientId = functions.config().paypal.client_id;
  return res.status(200).json({ clientId });
});

export const api = functions.https.onRequest(app);
