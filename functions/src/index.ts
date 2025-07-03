import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import { createOrder, captureOrder } from './paypal';

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Endpoint: Crear orden
app.post('/create-paypal-order', async (req, res) => {
  try {
    const amount = req.body.amount?.toString() || '0.00';
    const result = await createOrder(amount);
    res.status(200).json({ orderId: result.id });
  } catch (error: any) {
    console.error('Error al crear la orden PayPal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Capturar orden
app.post('/capture-paypal-order', async (req, res) => {
  try {
    const orderID = req.body.orderID;
    const result = await captureOrder(orderID);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error al capturar la orden PayPal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Exportar como función Firebase 1st Gen
export const api = functions.region('us-central1').https.onRequest(app);
