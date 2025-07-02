import paypal from '@paypal/checkout-server-sdk';

// Crear entorno PayPal desde variables de entorno configuradas en Firebase
const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID!,
  process.env.PAYPAL_CLIENT_SECRET!
);

// Instancia del cliente
const client = new paypal.core.PayPalHttpClient(environment);

/**
 * Crear una orden en PayPal
 * @param total Monto total como string (ej. "49.99")
 */
export async function createOrder(total: string) {
  const request = new paypal.orders.OrdersCreateRequest();
  request.headers['Prefer'] = 'return=representation';

  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'USD',
        value: total
      }
    }]
  });

  const response = await client.execute(request);
  return response.result;
}

/**
 * Capturar una orden existente
 * @param orderId ID de la orden PayPal
 */
export async function captureOrder(orderId: string) {
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});
  const response = await client.execute(request);
  return response.result;
}
