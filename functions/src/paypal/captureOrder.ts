import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as paypal from '@paypal/paypal-server-sdk';

// Inicialización condicional de Firebase
if (!admin.apps.length) {
    admin.initializeApp();
}

// Configuración reusable del cliente PayPal
const getPayPalClient = () => {
    return new paypal.core.PayPalHttpClient(
        new paypal.core.SandboxEnvironment(
            functions.config().paypal.client_id,
            functions.config().paypal.client_secret
        )
    );
};

export const capturePayPalOrder = functions.https.onCall(async (data, context) => {
    // 1. Validación de autenticación
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Debes iniciar sesión para completar el pago',
            { code: 'UNAUTHENTICATED' }
        );
    }

    // 2. Validación del orderID
    if (!data.orderID || typeof data.orderID !== 'string') {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'El ID de la orden es inválido',
            { field: 'orderID', received: data.orderID }
        );
    }

    const paypalClient = getPayPalClient();
    const db = admin.firestore();
    const orderRef = db.collection('orders').doc(data.orderID);
    const batch = db.batch();

    try {
        // 3. Verificar que la orden existe y pertenece al usuario
        const orderSnapshot = await orderRef.get();
        
        if (!orderSnapshot.exists) {
            throw new functions.https.HttpsError(
                'not-found',
                'La orden no existe',
                { orderID: data.orderID }
            );
        }

        const orderData = orderSnapshot.data();

        if (orderData?.userId !== context.auth.uid) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'No tienes permiso para capturar esta orden',
                { userId: context.auth.uid }
            );
        }

        // 4. Capturar el pago con PayPal
        const captureRequest = new paypal.orders.OrdersCaptureRequest(data.orderID);
        const response = await paypalClient.execute(captureRequest);
        const captureResult = response.result;

        // 5. Actualizar la orden en Firestore
        batch.update(orderRef, {
            status: 'COMPLETED',
            transactionId: captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.id,
            paypalCaptureData: captureResult,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 6. Crear registro en la subcolección de transacciones
        const transactionRef = orderRef.collection('transactions').doc();
        batch.set(transactionRef, {
            type: 'CAPTURE',
            status: captureResult.status,
            amount: captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value,
            currency: captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            paypalData: captureResult
        });

        // 7. Actualizar inventario (si aplica)
        if (orderData.items && Array.isArray(orderData.items)) {
            for (const item of orderData.items) {
                const productRef = db.collection('products').doc(item.id);
                batch.update(productRef, {
                    stock: admin.firestore.FieldValue.increment(-item.quantity),
                    lastSold: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        await batch.commit();

        // 8. Retornar datos relevantes al cliente
        return {
            status: captureResult.status,
            transactionId: captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.id,
            amount: captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value,
            currency: captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code,
            orderId: data.orderID
        };

    } catch (error) {
        // Manejo detallado de errores
        functions.logger.error('Error capturando orden PayPal:', {
            orderID: data.orderID,
            userId: context.auth.uid,
            error: error.message,
            stack: error.stack,
            paypalDebugId: error.headers?.['paypal-debug-id']
        });

        // Actualizar estado de la orden como fallida
        try {
            await orderRef.update({
                status: 'FAILED',
                error: {
                    message: error.message,
                    code: error.statusCode || 'UNKNOWN',
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (dbError) {
            functions.logger.error('Error actualizando orden fallida:', dbError);
        }

        // Error específico para PayPal
        if (error instanceof paypal.core.HttpError) {
            const errorDetails = tryParsePayPalError(error);
            
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Error en PayPal: ' + errorDetails.message,
                {
                    code: errorDetails.code,
                    paypalDebugId: error.headers['paypal-debug-id'],
                    details: errorDetails.details
                }
            );
        }

        // Error genérico
        throw new functions.https.HttpsError(
            'internal',
            'Error al capturar el pago',
            { debugId: context.instanceIdToken }
        );
    }
});

// Función auxiliar para parsear errores de PayPal
function tryParsePayPalError(error) {
    try {
        const errorResponse = JSON.parse(error.message);
        return {
            code: errorResponse.name || 'PAYPAL_ERROR',
            message: errorResponse.message || 'Error desconocido de PayPal',
            details: errorResponse.details || []
        };
    } catch (parseError) {
        return {
            code: 'PAYPAL_PARSE_ERROR',
            message: error.message,
            details: []
        };
    }
}
