// functions/index.js - Versão 2024-07-26 2:00 PM CST - Correção do campo 'estado'

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore(); // Obter a instância de Firestore Admin

// =============================================================================
// Cloud Function para o Formulario de Contacto (exports.api)
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
        return res.status(405).send('Método não permitido. Solo POST.');
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
        return res.status(400).json({ message: 'Datos de pedido o ítems inválidos o vazios.' });
    }

    try {
        // Iniciar una transacción de Firestore
        await db.runTransaction(async (transaction) => {
            const productRefs = {};
            const productsData = {};

            // --- FASE 1: TODAS LAS LECTURAS ---
            // Primeiro, obter todos os documentos de produtos necessários dentro da transação
            for (const item of items) {
                const productRef = db.collection('productos').doc(item.id);
                productRefs[item.id] = productRef; // Guardar referência para a fase de escrita
                const productDoc = await transaction.get(productRef);

                if (!productDoc.exists) {
                    // Se o produto não existe, lançamos um erro claro
                    throw new Error(`Producto con ID ${item.id} no encontrado en la base de datos.`);
                }

                // Usar 'cantidadInventario' como o nome do campo de stock
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
            // Agora que todas as leituras foram concluídas, prossiga com as escrituras.

            // 1. Atualizar o inventario de cada produto
            for (const item of items) {
                const newStock = productsData[item.id].currentStock - item.quantity;
                // Usar 'cantidadInventario' para a atualização
                transaction.update(productRefs[item.id], { cantidadInventario: newStock });
                functions.logger.info(`Inventario actualizado para producto ${item.id}: ${productsData[item.id].currentStock} -> ${newStock}`);
            }

            // 2. Guardar a ordem na coleção central 'orders'
            const orderRef = db.collection('orders').doc(); // Gera um novo ID de documento
            const orderToSave = {
                ...orderDetails,
                userId: userId,
                fechaOrden: admin.firestore.FieldValue.serverTimestamp(), // Marca de tempo do servidor
                // Usar el estado enviado desde el cliente, o 'pendiente' por defecto
                estado: orderDetails.estado || 'pendiente'
            };
            transaction.set(orderRef, orderToSave);
            functions.logger.info(`Orden guardada con ID: ${orderRef.id} en 'orders' para el usuario: ${userId}`);

            // 3. Guardar a ordem na subcoleção do usuário 'users/{userId}/orders'
            const userOrdersCollectionRef = db.collection('users').doc(userId).collection('orders');
            const orderToSaveUser = {
                // Incluir todas las propiedades de orderDetails, incluyendo 'estado' y 'userId'
                ...orderDetails,
                timestamp: admin.firestore.FieldValue.serverTimestamp(), // Usar timestamp del servidor para la subcolección
                // Asegurarse de que el userId también esté en la subcolección si no viene en orderDetails
                userId: userId // Asegura que el userId está explícitamente en la subcolección
            };
            transaction.set(userOrdersCollectionRef.doc(), orderToSaveUser);
            functions.logger.info(`Orden guardada en la subcolección 'users/${userId}/orders' con éxito.`);

        });

        res.status(200).json({ message: 'Inventario actualizado y orden guardada con éxito.' });

    } catch (error) {
        functions.logger.error('Error en la transacción de actualización de inventario o guardado de orden:', error);
        // Devolver un error 500 al cliente si a transação falha
        // Se o erro é uma instância de Error (como os que lançamos), usamos sua mensagem.
        // Se é um erro de Firebase HttpsError, sua mensagem já é adequada.
        const errorMessage = error.message || 'Error interno del servidor.';
        res.status(500).json({ message: `Error interno del servidor: ${errorMessage}` });
    }
});
