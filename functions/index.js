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
exports.updateInventoryAndSaveOrder = functions.https.onRequest(async (req, res) => {
    // Configurar CORS para permitir solicitudes desde cualquier origen (ajusta según sea necesario para producción)
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

    // Log para depuración: Verificar el userId recibido
    functions.logger.info(`updateInventoryAndSaveOrder: Solicitud recibida. UserId: ${userId}`, { body: req.body });


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
            // Primero, obtener todos los documentos de productos necesarios dentro de la transacción
            for (const item of items) {
                const productRef = db.collection('productos').doc(item.id);
                productRefs[item.id] = productRef; // Guardar referencia para la fase de escritura
                const productDoc = await transaction.get(productRef);

                if (!productDoc.exists) {
                    // Si el producto no existe, lanzamos un error claro
                    throw new Error(`Producto con ID ${item.id} no encontrado en la base de datos.`);
                }

                // Usar 'cantidadInventario' como el nombre del campo de stock
                const currentStock = productDoc.data().cantidadInventario;

                // Validar que currentStock sea un número
                if (typeof currentStock === 'undefined' || currentStock === null || isNaN(currentStock)) {
                    throw new Error(`El campo 'cantidadInventario' no es válido para el producto ${item.name} (ID: ${item.id}). Valor actual: ${currentStock}.`);
                }

                if (currentStock < item.quantity) {
                    throw new Error(`Inventario insuficiente para el producto ${item.name}. Cantidad disponible: ${currentStock}, solicitada: ${item.quantity}.`);
                }
                productsData[item.id] = { doc: productDoc, currentStock: currentStock };
            }

            // Opcional: Si necesitas leer otros documentos (ej. datos del usuario para la orden), hazlo aquí también
            // Si el userId es un UUID de invitado y no un UID de Firebase Auth,
            // la colección 'users' podría no tener un documento para él.
            // Si intentas leerlo, asegúrate de manejar el caso donde no existe.
            // Ejemplo de lectura de datos de usuario (si fuera necesario y existiera):
            // const userDocRef = db.collection('users').doc(userId);
            // const userDocSnap = await transaction.get(userDocRef);
            // const userData = userDocSnap.exists ? userDocSnap.data() : {};


            // --- FASE 2: TODAS LAS ESCRITURAS ---
            // Ahora que todas las lecturas se han completado, procede con las escrituras.

            // 1. Actualizar el inventario de cada producto
            for (const item of items) {
                const newStock = productsData[item.id].currentStock - item.quantity;
                // Usar 'cantidadInventario' para la actualización
                transaction.update(productRefs[item.id], { cantidadInventario: newStock });
                functions.logger.info(`Inventario actualizado para producto ${item.id}: ${productsData[item.id].currentStock} -> ${newStock}`);
            }

            // 2. Guardar la orden en la colección central 'orders'
            const orderRef = db.collection('orders').doc(); // Genera un nuevo ID de documento
            const orderToSave = {
                ...orderDetails,
                userId: userId,
                fechaOrden: admin.firestore.FieldValue.serverTimestamp(), // Marca de tiempo del servidor
                estado: 'pendiente' // Estado inicial de la orden
            };
            transaction.set(orderRef, orderToSave);
            functions.logger.info(`Orden guardada con ID: ${orderRef.id} en 'orders' para el usuario: ${userId}`);

            // 3. Guardar la orden en la subcolección del usuario 'users/{userId}/orders'
            // Esto funcionará para UIDs de Firebase Auth y para UUIDs generados por crypto.randomUUID()
            // siempre y cuando las reglas de seguridad de Firestore lo permitan.
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
        // Devolver un error 500 al cliente si la transacción falla
        // Si el error es una instancia de Error (como los que lanzamos), usamos su mensaje.
        // Si es un error de Firebase HttpsError, su mensaje ya es adecuado.
        const errorMessage = error.message || 'Error interno del servidor.';
        res.status(500).json({ message: `Error interno del servidor: ${errorMessage}` });
    }
});
