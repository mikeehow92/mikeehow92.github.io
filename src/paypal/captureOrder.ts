import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as paypal from '@paypal/paypal-server-sdk';

admin.initializeApp();

const paypalClient = new paypal.core.PayPalHttpClient(
  new paypal.core.SandboxEnvironment(
    functions.config().paypal.client_id,
    functions.config().paypal.client_secret
  )
);

export const capturePayPalOrder = functions.https.onCall(async (data, context) => {
  // 1. Validar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required'
    );
  }

  // 2. Validar orderID
  if (!data.orderID) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing orderID'
    );
  }

  try {
    // 3. Capturar pago con PayPal
    const captureRequest = new paypal.orders.OrdersCaptureRequest(data.orderID);
    const captureResponse = await paypalClient.execute(captureRequest);
    const captureData = captureResponse.result;

    // 4. Actualizar Firestore
    const orderRef = admin.firestore().collection('orders').doc(data.orderID);
    
    await orderRef.update({
      status: 'COMPLETED',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      paypalCaptureData: captureData,
      transactionId: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id
    });

    // 5. Registrar en subcolección de transacciones
    await orderRef.collection('transactions').add({
      type: 'CAPTURE',
      amount: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value,
      currency: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code,
      status: captureData.status,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // 6. Actualizar inventario (ejemplo)
    const orderDoc = await orderRef.get();
    const orderItems = orderDoc.data()?.items || [];
    
    await updateProductInventory(orderItems);

    return {
      status: captureData.status,
      transactionId: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id,
      amount: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value
    };

  } catch (error) {
    functions.logger.error('Error capturing PayPal order:', error);

    // Manejo específico de errores de PayPal
    if (error instanceof paypal.core.HttpError) {
      await handlePayPalError(data.orderID, error);
    }

    throw new functions.https.HttpsError(
      'internal',
      'Error capturing payment',
      { paypalError: error.message }
    );
  }
});

// ============ Funciones Auxiliares ============

async function updateProductInventory(items: any[]) {
  const db = admin.firestore();
  const batch = db.batch();
  
  for (const item of items) {
    const productRef = db.collection('products').doc(item.id);
    batch.update(productRef, {
      stock: admin.firestore.FieldValue.increment(-item.quantity),
      lastSold: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  await batch.commit();
}

async function handlePayPalError(orderId: string, error: paypal.core.HttpError) {
  const db = admin.firestore();
  const errorData = {
    code: error.statusCode,
    details: error.message,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('orders').doc(orderId).update({
    status: 'FAILED',
    lastError: errorData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await db.collection('paypal_errors').add({
    orderId,
    ...errorData,
    rawResponse: error.headers?.['paypal-debug-id']
  });
}
