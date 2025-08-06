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
// Nueva Cloud Function para crear la orden de compra y actualizar el inventario
// Esta función usará la misma ID para ambos documentos
// =============================================================================
exports.createOrderAndAdjustInventory = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'El usuario debe estar autenticado para realizar esta acción.');
    }

    const { orderDetails, userId } = data;
    const itemsToUpdate = orderDetails.items;
    
    // Validar si el carrito está vacío
    if (!itemsToUpdate || itemsToUpdate.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'El carrito de compras está vacío.');
    }
    
    // Obtener una ID única para la orden antes de iniciar la transacción
    const newOrderId = db.collection('orders').doc().id;

    try {
        await db.runTransaction(async (transaction) => {
            // Verificar el inventario
            const promises = itemsToUpdate.map(item => {
                const itemRef = db.collection(`artifacts/${__app_id}/users/${userId}/products`).doc(item.id);
                return transaction.get(itemRef);
            });
            const itemDocs = await Promise.all(promises);

            for (let i = 0; i < itemDocs.length; i++) {
                const docSnap = itemDocs[i];
                if (!docSnap.exists) {
                    throw new functions.https.HttpsError('not-found', `Producto con ID ${itemsToUpdate[i].id} no encontrado.`);
                }

                const currentQuantity = docSnap.data().cantidadInventario;
                const requestedQuantity = itemsToUpdate[i].quantity;

                if (currentQuantity < requestedQuantity) {
                    throw new functions.https.HttpsError('failed-precondition', `No hay suficiente stock para el producto ${docSnap.data().nombre}.`);
                }
                
                // Actualizar la cantidad del inventario
                const newQuantity = currentQuantity - requestedQuantity;
                transaction.update(docSnap.ref, { cantidadInventario: newQuantity });
            }

            // Crear el documento en la colección principal 'orders' usando la ID pre-generada
            const orderRef = db.collection(`artifacts/${__app_id}/public/data/orders`).doc(newOrderId);
            transaction.set(orderRef, {
                ...orderDetails,
                userId: userId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Crear el documento en la subcolección del usuario 'orders' usando la MISMA ID
            const userOrderRef = db.collection(`artifacts/${__app_id}/users/${userId}/orders`).doc(newOrderId);
            transaction.set(userOrderRef, {
                ...orderDetails,
                userId: userId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        });

        return { orderId: newOrderId, message: 'Inventario actualizado y orden guardada con éxito.' };

    } catch (error) {
        functions.logger.error('Error en la transacción de actualización de inventario o guardado de orden:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Error interno del servidor.');
    }
});
