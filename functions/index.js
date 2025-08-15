// functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore(); // Obtener la instancia de Firestore Admin

// =============================================================================
// Cloud Function para el Formulario de Contacto (exports.api)
// =============================================================================
exports.api = functions.https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.set('Access-Control-Max-Age', '3600');
        return res.status(204).send('');
    }

    if (req.method !== 'POST') {
        return res.status(405).send('Método no permitido. Solo POST.');
    }

    const { fullName, email, message } = req.body;

    if (!fullName || !email || !message) {
        functions.logger.error('Datos del formulario de contacto incompletos:', req.body);
        return res.status(400).send('Por favor, proporciona nombre completo, correo electrónico y mensaje.');
    }

    try {
        functions.logger.info('Mensaje de contacto recibido:', { fullName, email, message });
        await db.collection('contactMessages').add({
            fullName: fullName,
            email: email,
            message: message,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return res.status(200).send('Mensaje enviado con éxito.');
    } catch (error) {
        functions.logger.error('Error al guardar el mensaje de contacto:', error);
        return res.status(500).send('Error interno del servidor.');
    }
});

// =============================================================================
// Cloud Function para actualizar el estado de una orden
// =============================================================================
exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Se requiere autenticación para realizar esta acción.'
        );
    }

    const { orderId, userId, newStatus } = data;

    if (!orderId || !userId || !newStatus) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Faltan parámetros para actualizar la orden (orderId, userId, newStatus).'
        );
    }

    const validStatuses = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'];
    if (!validStatuses.includes(newStatus)) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'El estado de la orden no es válido.'
        );
    }

    try {
        const orderRef = db.collection('orders').doc(orderId);
        await orderRef.update({ estado: newStatus });
        functions.logger.info(`Estado de la orden ${orderId} actualizado a ${newStatus} en la colección principal.`);

        const userOrderRef = db.collection('users').doc(userId).collection('orders').doc(orderId);
        await userOrderRef.update({ estado: newStatus });
        functions.logger.info(`Estado de la orden ${orderId} del usuario ${userId} actualizado a ${newStatus} en la subcolección.`);

        return { success: true, message: 'Estado de la orden actualizado con éxito.' };
    } catch (error) {
        functions.logger.error('Error al actualizar el estado de la orden:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Error al actualizar el estado de la orden. Por favor, inténtalo de nuevo más tarde.',
            error.message
        );
    }
});

// =============================================================================
// Cloud Function para actualizar inventario y guardar la orden
// =============================================================================
exports.updateInventoryAndSaveOrder = functions.https.onCall(async (data, context) => {
    // 1. Verificar la autenticación
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Se requiere autenticación para realizar esta acción.'
        );
    }

    const userId = context.auth.uid;
    const { orderDetails } = data;

    if (!orderDetails || !orderDetails.items || !orderDetails.shippingDetails || !orderDetails.total) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Faltan detalles de la orden (ítems, detalles de envío, total).'
        );
    }

    try {
        await db.runTransaction(async (transaction) => {
            const userOrdersCollectionRef = db.collection('users').doc(userId).collection('orders');
            const ordersCollectionRef = db.collection('orders');

            // 2. Crear un ID de documento único para la nueva orden
            // Este ID se usa para ambas colecciones
            const newOrderRef = ordersCollectionRef.doc();
            const orderId = newOrderRef.id;

            // 3. Preparar el objeto de la orden para guardar
            const orderToSave = {
                id: orderId,
                userId: userId,
                fechaOrden: admin.firestore.FieldValue.serverTimestamp(),
                estado: 'pendiente',
                total: orderDetails.total,
                items: orderDetails.items.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    imageUrl: item.imageUrl || ''
                })),
                shippingDetails: orderDetails.shippingDetails,
                paypalTransactionId: orderDetails.paypalTransactionId,
                paymentStatus: orderDetails.paymentStatus,
                payerId: orderDetails.payerId,
                payerEmail: orderDetails.payerEmail,
            };

            // 4. Guardar la orden en la colección principal 'orders'
            transaction.set(newOrderRef, orderToSave);
            functions.logger.info(`Orden ${orderId} guardada en la colección principal 'orders'.`);

            // 5. Guardar la misma orden en la subcolección 'orders' del usuario
            const userOrderRef = userOrdersCollectionRef.doc(orderId);
            transaction.set(userOrderRef, orderToSave);
            functions.logger.info(`Orden ${orderId} guardada en la subcolección 'users/${userId}/orders'.`);
            
            // 6. Actualizar el inventario de los productos
            const productsCollection = db.collection('products');
            for (const item of orderDetails.items) {
                const productRef = productsCollection.doc(item.id);
                const productDoc = await transaction.get(productRef);
                
                if (!productDoc.exists) {
                    throw new Error(`El producto con ID ${item.id} no existe.`);
                }
                
                const currentStock = productDoc.data().stock;
                const newStock = currentStock - item.quantity;
                
                if (newStock < 0) {
                    throw new Error(`No hay suficiente stock para el producto ${productDoc.data().name}.`);
                }
                
                transaction.update(productRef, { stock: newStock });
            }
            functions.logger.info('Inventario actualizado con éxito.');
        });

        return { success: true, message: 'Inventario actualizado y orden guardada con éxito.' };

    } catch (error) {
        functions.logger.error('Error en la transacción de actualización de inventario o guardado de orden:', error);
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'Error interno del servidor al procesar la orden.'
        );
    }
});
