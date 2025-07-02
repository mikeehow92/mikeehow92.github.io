import * as functions from 'firebase-functions';
import * as express from 'express';
import cors from 'cors';

const app = express();

// Habilitar CORS para todas las rutas
app.use(cors({ origin: true }));
app.use(express.json());

// Ruta para crear la orden de PayPal
app.post('/create-paypal-order', async (req, res) => {
  try {
    // Lógica para crear la orden aquí
    const orderId = 'fake_order_id'; // reemplaza con la lógica real
    res.status(200).json({ orderId });
  } catch (error) {
    console.error('Error al crear orden:', error);
    res.status(500).send('Error al crear orden');
  }
});

// Ruta para capturar la orden de PayPal
app.post('/capture-paypal-order', async (req, res) => {
  try {
    // Lógica para capturar la orden aquí
    const captureResult = { success: true }; // reemplaza con la lógica real
    res.status(200).json(captureResult);
  } catch (error) {
    console.error('Error al capturar orden:', error);
    res.status(500).send('Error al capturar orden');
  }
});

// Exportar como función HTTP en la región us-central1 (1st Gen)
export const api = functions
  .region('us-central1')
  .https
  .onRequest(app);
