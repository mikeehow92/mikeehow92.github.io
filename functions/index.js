// functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore(); // Obtener la instancia de Firestore Admin

// =============================================================================
// Cloud Function para el Formulario de Contacto (exports.api)
// =============================================================================
// Maneja las peticiones POST para guardar mensajes de contacto en Firestore.
exports.api = functions.https.onRequest(async (req, res) => {
    // Configuración de CORS
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

    // Validación de los datos del formulario
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
        functions.logger.info('Mensaje de contacto guardado en Firestore.');

        return res.status(200).send('Mensaje recibido con éxito.');

    } catch (error) {
        functions.logger.error('Error al procesar el mensaje de contacto:', error);
        return res.status(500).send('Error interno del servidor al procesar tu mensaje.');
    }
});

// =============================================================================
// Cloud Function para Actualizar Inventario y Guardar Orden (exports.updateInventoryAndSaveOrder)
// =============================================================================
// Procesa las solicitudes de compra dentro de una transacción para garantizar
// la integridad de los datos del inventario y el registro de la orden.
exports.updateInventoryAndSaveOrder = functions.https.onRequest(async (req, res) => {
    // Configuración de CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar solicitudes OPTIONS (preflight requests)
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    // Asegurarse de que la solicitud sea POST
    if (req.method !== 'POST') {
        return res.status(405).send('Método no permitido. Solo POST.');
    }

    const { items, orderDetails, userId } = req.body;

    // Log para depuración
    functions.logger.info(`updateInventoryAndSaveOrder: Solicitud recibida. UserId: ${userId}`, { body: req.body });

    // Validación de los datos de entrada
    if (!items || !Array.isArray(items) || items.length === 0 || !orderDetails || !userId) {
        functions.logger.error('updateInventoryAndSaveOrder: Datos de entrada inválidos.', { items, orderDetails, userId });
        return res.status(400).json({ message: 'Datos de pedido o ítems inválidos o vacíos.' });
    }

    try {
        // Iniciar una transacción de Firestore
        await db.runTransaction(async (transaction) => {
            const productRefs = {};
            const productsData = {};

            // --- FASE 1: TODAS LAS LECTURAS ---
            // Se leen los documentos de los productos dentro de la transacción.
            for (const item of items) {
                const productRef = db.collection('productos').doc(item.id);
                productRefs[item.id] = productRef;
                const productDoc = await transaction.get(productRef);

                if (!productDoc.exists) {
                    throw new Error(`Producto con ID ${item.id} no encontrado en la base de datos.`);
                }

                const currentStock = productDoc.data().cantidadInventario;

                // Validar que el stock es un número y es suficiente
                if (typeof currentStock === 'undefined' || currentStock === null || isNaN(currentStock)) {
                    throw new Error(`El campo 'cantidadInventario' no es válido para el producto ${item.name} (ID: ${item.id}). Valor actual: ${currentStock}.`);
                }

                if (currentStock < item.quantity) {
                    throw new Error(`Inventario insuficiente para el producto ${item.name}. Cantidad disponible: ${currentStock}, solicitada: ${item.quantity}.`);
                }
                productsData[item.id] = { doc: productDoc, currentStock: currentStock };
            }

            // --- FASE 2: TODAS LAS ESCRITURAS ---
            // Una vez validados todos los datos, se realizan las escrituras.

            // 1. Actualizar el inventario de cada producto
            for (const item of items) {
                const newStock = productsData[item.id].currentStock - item.quantity;
                transaction.update(productRefs[item.id], { cantidadInventario: newStock });
                functions.logger.info(`Inventario actualizado para producto ${item.id}: ${productsData[item.id].currentStock} -> ${newStock}`);
            }

            // 2. Guardar la orden en la colección central 'orders'
            const orderRef = db.collection('orders').doc();
            // AHORA NO SE FORZA EL ESTADO A 'pendiente', SE USARÁ EL QUE VIENE EN orderDetails
            const orderToSave = {
                ...orderDetails,
                userId: userId,
                fechaOrden: admin.firestore.FieldValue.serverTimestamp(),
            };
            transaction.set(orderRef, orderToSave);
            functions.logger.info(`Orden guardada con ID: ${orderRef.id} en 'orders' para el usuario: ${userId}`);

            // 3. Guardar la orden en la subcolección del usuario 'users/{userId}/orders'
            // NOTA: El estado 'procesando' ya está en orderDetails, que se usará aquí también.
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
                estado: orderDetails.estado // Aseguramos que el estado se guarde explícitamente aquí.
            };
            transaction.set(userOrdersCollectionRef.doc(), orderToSaveUser);
            functions.logger.info(`Orden guardada en la subcolección 'users/${userId}/orders' con éxito.`);

        });

        // Respuesta exitosa
        res.status(200).json({ message: 'Inventario actualizado y orden guardada con éxito.' });

    } catch (error) {
        functions.logger.error('Error en la transacción de actualización de inventario o guardado de orden:', error);
        const errorMessage = error.message || 'Error interno del servidor.';
        res.status(500).json({ message: `Error interno del servidor: ${errorMessage}` });
    }
});
