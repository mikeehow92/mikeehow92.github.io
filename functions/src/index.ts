import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { PayPalHttpClient, SandboxEnvironment, orders } from '@paypal/paypal-server-sdk';

admin.initializeApp();
const db = admin.firestore();

const paypalClient = new PayPalHttpClient(
  new SandboxEnvironment(
    functions.config().paypal.client_id,
    functions.config().paypal.client_secret
  )
);

export const createOrder = functions.https.onRequest(async (req, res) => {
  try {
    const request = new orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: '10.00'
        }
      }]
    });

    const response = await paypalClient.execute(request);
    res.status(200).json({
      id: response.result.id,
      status: response.result.status
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Something went wrong' });
  }
});
