// functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializa Firebase Admin SDK. Esto es esencial para interactuar con
// Firestore y otros servicios de Firebase desde las funciones.
admin.initializeApp();

// Obtiene una referencia a la base de datos de Firestore.
const db = admin.firestore();

// =============================================================================
// Cloud Function para el Formulario de Contacto
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
        res.status(200).send('Mensaje recibido con éxito.');
    } catch (error) {
        functions.logger.error('Error al guardar el mensaje de contacto:', error);
        res.status(500).send('Error interno del servidor.');
    }
});

// =============================================================================
// Cloud Function para procesar la compra (tu código existente)
// =============================================================================
exports.processOrder = functions.https.onRequest(async (req, res) => {
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

    const { userId, orderDetails } = req.body;

    if (!userId || !orderDetails || !orderDetails.items || orderDetails.items.length === 0) {
        return res.status(400).json({ message: 'Datos de la orden incompletos.' });
    }

    try {
        const result = await db.runTransaction(async (transaction) => {
            const inventoryUpdates = [];
            const itemsWithOutOfStock = [];
            
            for (const item of orderDetails.items) {
                const productDocRef = db.collection('products').doc(item.id);
                const productDoc = await transaction.get(productDocRef);

                if (!productDoc.exists) {
                    throw new Error(`El producto con ID ${item.id} no existe.`);
                }

                const productData = productDoc.data();
                const newStock = (productData.stock || 0) - item.quantity;

                if (newStock < 0) {
                    itemsWithOutOfStock.push(item.name);
                } else {
                    inventoryUpdates.push({ ref: productDocRef, newStock: newStock });
                }
            }

            if (itemsWithOutOfStock.length > 0) {
                throw new Error(`Los siguientes productos no tienen suficiente stock: ${itemsWithOutOfStock.join(', ')}`);
            }

            inventoryUpdates.forEach(update => {
                transaction.update(update.ref, { stock: update.newStock });
            });

            // Guardar la orden en la subcolección de 'orders' del usuario
            const userOrdersCollectionRef = db.collection('users').doc(userId).collection('orders');
            const orderToSaveUser = {
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
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
            transaction.set(userOrdersCollectionRef.doc(), orderToSaveUser);
            functions.logger.info(`Orden guardada en la subcolección 'users/${userId}/orders' con éxito.`);
        });

        res.status(200).json({ message: 'Inventario actualizado y orden guardada con éxito.' });
    } catch (error) {
        functions.logger.error('Error en la transacción de actualización de inventario o guardado de orden:', error);
        const errorMessage = error.message || 'Error interno del servidor.';
        res.status(500).json({ message: `Error interno del servidor: ${errorMessage}` });
    }
});
