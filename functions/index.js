// functions/index.js - Versión 2024-07-26 3:30 PM CST - Corrección de estado inicial consistente y Sincronización

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

    // Log para depuración: Verificar el userId y orderDetails recibidos
    functions.logger.info(`updateInventoryAndSaveOrder: Solicitud recibida. UserId: ${userId}`, { orderDetails: orderDetails });


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

            // --- FASE 2: TODAS LAS ESCRITURAS ---
            // Ahora que todas las lecturas se han completado, procede con las escrituras.

            // 1. Actualizar el inventario de cada producto
            for (const item of items) {
                const newStock = productsData[item.id].currentStock - item.quantity;
                // Usar 'cantidadInventario' para la actualización
                transaction.update(productRefs[item.id], { cantidadInventario: newStock });
                functions.logger.info(`Inventario actualizado para producto ${item.id}: ${productsData[item.id].currentStock} -> ${newStock}`);
            }

            // Determinar el estado inicial de la orden
            // Si orderDetails.estado existe y no es null/undefined, úsalo. De lo contrario, 'pendiente'.
            const initialOrderStatus = orderDetails.estado || 'pendiente';

            // 2. Guardar la orden en la colección central 'orders'
            const orderRef = db.collection('orders').doc(); // Genera un nuevo ID de documento
            const orderToSave = {
                ...orderDetails,
                userId: userId,
                fechaOrden: admin.firestore.FieldValue.serverTimestamp(), // Marca de tiempo del servidor
                estado: initialOrderStatus // Usar el estado determinado
            };
            transaction.set(orderRef, orderToSave);
            functions.logger.info(`Orden guardada con ID: ${orderRef.id} en 'orders' para el usuario: ${userId} con estado: ${initialOrderStatus}`);

            // 3. Guardar la orden en la subcolección del usuario 'users/{userId}/orders'
            const userOrdersCollectionRef = db.collection('users').doc(userId).collection('orders');
            const orderToSaveUser = {
                // Incluir todas las propiedades de orderDetails
                ...orderDetails,
                timestamp: admin.firestore.FieldValue.serverTimestamp(), // Usar timestamp del servidor para la subcolección
                userId: userId, // Asegura que el userId está explícitamente en la subcolección
                estado: initialOrderStatus // Asegura que el estado se guarde aquí también
            };
            // Usar el mismo ID de orden que la colección central para facilitar la sincronización
            transaction.set(userOrdersCollectionRef.doc(orderRef.id), orderToSaveUser);
            functions.logger.info(`Orden guardada en la subcolección 'users/${userId}/orders' con éxito con estado: ${initialOrderStatus}`);

        });

        res.status(200).json({ message: 'Inventario actualizado y orden guardada con éxito.' });

    } catch (error) {
        functions.logger.error('Error en la transacción de actualización de inventario o guardado de orden:', error);
        const errorMessage = error.message || 'Error interno del servidor.';
        res.status(500).json({ message: `Error interno del servidor: ${errorMessage}` });
    }
});

// =============================================================================
// NUEVA Cloud Function: Sincronizar Estado de Orden (exports.syncOrderStatus)
// Escucha cambios en la colección central 'orders' y actualiza la subcolección del usuario.
// =============================================================================
exports.syncOrderStatus = functions.firestore
    .document('orders/{orderId}') // Escucha cualquier cambio en un documento de la colección 'orders'
    .onUpdate(async (change, context) => {
        const newOrderData = change.after.data(); // Datos del documento después de la actualización
        const previousOrderData = change.before.data(); // Datos del documento antes de la actualización
        const orderId = context.params.orderId; // ID del documento de la orden

        // Log para depuración: Mostrar datos de la orden antes y después
        functions.logger.info(`syncOrderStatus: Detectado cambio en orden ${orderId}. Estado anterior: ${previousOrderData.estado}, Estado nuevo: ${newOrderData.estado}`);

        // Solo proceder si el campo 'estado' ha cambiado
        if (newOrderData.estado === previousOrderData.estado) {
            functions.logger.info(`syncOrderStatus: El estado de la orden ${orderId} no ha cambiado. No se requiere sincronización.`);
            return null; // No hacer nada si el estado no cambió
        }

        const userId = newOrderData.userId; // Obtener el userId de los datos de la orden
        const newStatus = newOrderData.estado; // Obtener el nuevo estado

        if (!userId) {
            functions.logger.warn(`syncOrderStatus: userId no encontrado para la orden ${orderId}. No se puede sincronizar la subcolección.`);
            return null;
        }

        functions.logger.info(`syncOrderStatus: Estado de la orden ${orderId} cambiado a ${newStatus}. Sincronizando para userId: ${userId}`);

        try {
            // Referencia al documento de la orden en la subcolección del usuario
            const userOrderRef = db.collection('users').doc(userId).collection('orders').doc(orderId);

            // Verificar si el documento existe en la subcolección antes de intentar actualizarlo
            const userOrderDoc = await userOrderRef.get();
            if (!userOrderDoc.exists) {
                functions.logger.warn(`syncOrderStatus: Documento de orden ${orderId} no encontrado en la subcolección del usuario ${userId}. No se puede actualizar.`);
                return null;
            }

            // Actualizar solo el campo 'estado' en la subcolección del usuario
            await userOrderRef.update({ estado: newStatus });
            functions.logger.info(`syncOrderStatus: Estado de la orden ${orderId} actualizado a ${newStatus} en la subcolección del usuario ${userId}.`);

        } catch (error) {
            functions.logger.error(`syncOrderStatus: Error al sincronizar el estado de la orden ${orderId} para el usuario ${userId}:`, error);
        }

        return null; // Las funciones Cloud Functions deben devolver null o una Promise
    });
