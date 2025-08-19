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
// Esta función consolida la lógica de actualizar el inventario y guardar la orden.
// Ahora genera un único ID y lo usa para ambas colecciones, resolviendo el problema de sincronización inicial.
exports.updateInventoryAndSaveOrder = functions.https.onCall(async (data, context) => {
    // 1. Verificar si la solicitud está autenticada
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'La función requiere autenticación.'
        );
    }
    const userId = context.auth.uid; // Usar el userId del contexto de autenticación

    // 2. Extraer los datos de la llamada.
    const orderDetails = data.orderDetails;
    if (!orderDetails || !orderDetails.items || !orderDetails.total) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Faltan detalles de la orden para procesar la compra.'
        );
    }

    // 3. Iniciar una transacción de Firestore para garantizar la atomicidad.
    try {
        await db.runTransaction(async (transaction) => {
            // 4. Actualizar el inventario de los productos
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
            
            // 5. Generar un único ID para la orden y usarlo para ambas colecciones.
            const newOrderRef = db.collection('orders').doc(); // Genera un ID de documento único
            const orderId = newOrderRef.id;

            // 6. Crear el objeto de la orden final con el estado 'pending'
            const newOrder = {
                ...orderDetails,
                userId: userId,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: 'pending', // Estado inicial: pendiente
                orderId: orderId // Referencia al ID único de la orden
            };

            // 7. Guardar la orden en la colección principal 'orders'
            transaction.set(newOrderRef, newOrder);
            functions.logger.info(`Orden con ID ${orderId} guardada en la colección principal 'orders'.`);

            // 8. Guardar la orden en la subcolección 'orders' del usuario usando el mismo ID
            const userOrdersCollection = db.collection('users').doc(userId).collection('orders');
            const userOrderRef = userOrdersCollection.doc(orderId);
            transaction.set(userOrderRef, newOrder);
            functions.logger.info(`Orden con ID ${orderId} guardada en la subcolección 'users/${userId}/orders'.`);
            
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

// =============================================================================
// Cloud Function para sincronizar el estado de la orden (exports.syncOrderStatus)
// =============================================================================
// Se activa cuando una orden en la colección 'orders' es actualizada.
// Sincroniza el estado con la subcolección del usuario para mantener la consistencia.
exports.syncOrderStatus = functions.firestore
    .document('orders/{orderId}')
    .onUpdate(async (change, context) => {
        const orderId = context.params.orderId;
        const newStatus = change.after.data().status;
        const userId = change.after.data().userId;

        // Validaciones básicas
        if (!userId || !newStatus) {
            console.log('No userId or status in order, skipping sync');
            return null;
        }

        try {
            // Referencia a la orden en la subcolección del usuario
            const userOrderRef = admin.firestore()
                .collection('users')
                .doc(userId)
                .collection('orders')
                .doc(orderId); // Usamos el ID único para encontrar el documento

            // Actualizar el estado de la orden del usuario
            await userOrderRef.update({ status: newStatus });

            console.log(`Successfully synced status for order ${orderId} in user subcollection`);
            
        } catch (error) {
            console.error('Error syncing order status:', error);
            // La función no debe fallar si la orden no se encuentra, solo registrar el error.
        }
    });
