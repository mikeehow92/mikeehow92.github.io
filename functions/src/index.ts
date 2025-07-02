import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';

admin.initializeApp();

const app = express();

// Middleware CORS
const corsHandler = cors({ origin: true });
app.use(corsHandler);

// Ruta: Crear orden de PayPal
app.post('/create-paypal-order', async (req, res) => {
  try {
    // Simulación lógica (reemplaza con tu lógica real)
    const orderId = 'fake-order-id';
    return res.status(200).json({ orderId });
  } catch (error: any) {
    console.error('Error creando orden:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Ruta: Capturar orden de PayPal
app.post('/capture-paypal-order', async (req, res) => {
  try {
    // Simulación lógica (reemplaza con tu lógica real)
    const status = 'captured';
    return res.status(200).json({ status });
  } catch (error: any) {
    console.error('Error capturando orden:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Exportar como función de Firebase
export const api = functions.https.onRequest(app);
