// functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore(); // Obtener la instancia de Firestore Admin

// Constantes de validación
const MAX_ORDER_ITEMS = 20;
const MAX_ORDER_VALUE = 10000; // $10,000

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
        await db.collection('contacts').add({
            fullName,
            email,
            message,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return res.status(200).send({ message: 'Mensaje enviado con éxito.' });
    } catch (error) {
        functions.logger.error('Error al guardar el mensaje de contacto:', error);
        return res.status(500).send('Error interno del servidor.');
    }
});

// =============================================================================
// Cloud Function para actualizar el inventario y guardar la orden
// =============================================================================
exports.updateInventoryAndSaveOrder = functions.https.onCall(async (data, context) => {
    // 1. Verificar autenticación
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'La función requiere autenticación.'
        );
    }
    const userId = context.auth.uid;

    // 2. Extraer y validar datos de la orden
    const orderDetails = data.orderDetails;
    if (!orderDetails || !orderDetails.items || !orderDetails.total) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Faltan detalles de la orden para procesar la compra.'
        );
    }

    // Validaciones adicionales
    if (orderDetails.items.length > MAX_ORDER_ITEMS) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            `No se pueden ordenar más de ${MAX_ORDER_ITEMS} productos en una sola orden.`
        );
    }

    if (orderDetails.total > MAX_ORDER_VALUE) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            `El valor total de la orden no puede exceder $${MAX_ORDER_VALUE}.`
        );
    }

    for (const [index, item] of orderDetails.items.entries()) {
        if (!item.id || !item.quantity || item.quantity <= 0) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                `El ítem en posición ${index + 1} no tiene un ID o cantidad válida.`
            );
        }
    }

    // 3. Iniciar transacción
    try {
        await db.runTransaction(async (transaction) => {
            // 4. Actualizar inventario
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

            // 5. Crear orden con ID único
            const newOrderRef = db.collection('orders').doc();
            const orderId = newOrderRef.id;
            const timestamp = admin.firestore.FieldValue.serverTimestamp();

            const newOrder = {
                ...orderDetails,
                userId,
                timestamp,
                status: 'pending',
                orderId,
                version: 1 // Campo para control de concurrencia
            };

            // 6. Guardar en ambas colecciones
            transaction.set(newOrderRef, newOrder);
            
            const userOrderRef = db.collection('users')
                .doc(userId)
                .collection('orders')
                .doc(orderId);
                
            transaction.set(userOrderRef, newOrder);
        });

        return {
            success: true,
            message: 'Inventario actualizado y orden guardada con éxito.'
        };

    } catch (error) {
        functions.logger.error('Transaction error:', error, {
            userId: context.auth.uid,
            orderDetails: {
                itemsCount: orderDetails.items.length,
                total: orderDetails.total
            }
        });

        let errorCode = 'internal';
        let errorMessage = 'Error al procesar la orden';

        if (error.message.includes('no hay suficiente stock')) {
            errorCode = 'failed-precondition';
            errorMessage = 'Uno o más productos no tienen suficiente stock';
        } else if (error.message.includes('no existe')) {
            errorCode = 'not-found';
            errorMessage = 'Uno o más productos no existen';
        }
        
        throw new functions.https.HttpsError(errorCode, errorMessage);
    }
});

// =============================================================================
// Cloud Function para actualizar el estado de las órdenes
// Se invoca desde el front-end (Orders.jsx)
// =============================================================================
exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
    // 1. Verificar si el usuario está autenticado.
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Solo los usuarios autenticados pueden actualizar el estado de las órdenes.'
        );
    }

    // 2. Extraer los datos de la solicitud
    const { orderId, userId, newStatus } = data;

    // 3. Validar que los datos requeridos no estén vacíos
    if (!orderId || !userId || !newStatus) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Faltan parámetros para actualizar la orden (orderId, userId, newStatus).'
        );
    }

    try {
        // 4. Actualizar el estado en la colección principal 'orders'
        const orderRef = db.collection('orders').doc(orderId);
        await orderRef.update({ status: newStatus });
        functions.logger.info(`Estado de la orden ${orderId} actualizado a ${newStatus} en la colección principal.`);

        // 5. Actualizar el estado en la subcolección 'orders' del usuario
        const userOrderRef = db.collection('users').doc(userId).collection('orders').doc(orderId);
        await userOrderRef.update({ status: newStatus });
        functions.logger.info(`Estado de la orden ${orderId} del usuario ${userId} actualizado a ${newStatus} en la subcolección.`);

        // 6. Devolver una respuesta exitosa al cliente
        return { success: true, message: 'Estado de la orden actualizado con éxito.' };
    } catch (error) {
        // 7. Manejar y registrar cualquier error
        functions.logger.error('Error al actualizar el estado de la orden:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Error al actualizar el estado de la orden. Por favor, inténtalo de nuevo más tarde.',
            error.message
        );
    }
});
