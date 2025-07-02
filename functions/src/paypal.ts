import axios from 'axios';
import * as functions from 'firebase-functions';

const config = functions.config();
const PAYPAL_CLIENT = config.paypal.client_id;
const PAYPAL_SECRET = config.paypal.client_secret;
const PAYPAL_API = 'https://api-m.sandbox.paypal.com'; // Usa https://api-m.paypal.com en producción

// Obtener token de acceso
export async function generateAccessToken(): Promise<string> {
  const response = await axios({
    url: `${PAYPAL_API}/v1/oauth2/token`,
    method: 'post',
    auth: {
      username: PAYPAL_CLIENT,
      password: PAYPAL_SECRET,
    },
    params: {
      grant_type: 'client_credentials',
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data.access_token;
}

// Crear orden
export async function createOrder(amount: string): Promise<string> {
  const accessToken = await generateAccessToken();

  const response = await axios.post(
    `${PAYPAL_API}/v2/checkout/orders`,
    {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount,
          },
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.id;
}

// Capturar orden
export async function captureOrder(orderID: string): Promise<any> {
  const accessToken = await generateAccessToken();

  const response = await axios.post(
    `${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}
