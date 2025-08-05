// functions/index.js

// Importa las funciones necesarias para la nueva sintaxis de Firebase Functions v2
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

// Inicializa el SDK de Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// =============================================================================
// Cloud Function para la API de manejo de Contacto y Órdenes
//
// Esta función ahora usa el nuevo formato `onRequest` de v2.
// =============================================================================
exports.api = onRequest(async (req, res) => {
    // Configura los encabezados CORS para permitir peticiones desde cualquier origen
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Maneja las peticiones OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    // Solo permite peticiones POST
    if (req.method !== 'POST') {
        res.status(405).send('Método no permitido. Solo POST.');
        return;
    }

    // Intenta procesar el cuerpo de la petición como JSON
    let requestBody;
    try {
        requestBody = req.body;
    } catch (e) {
        console.error('Error al parsear el JSON:', e);
        res.status(400).send('Cuerpo de la petición no es un JSON válido.');
        return;
    }

    // Si la petición es para la ruta del formulario de contacto
    if (req.path === '/contact-form') {
        const { fullName, email, message } = requestBody;

        if (!fullName || !email || !message) {
            console.error('Datos del formulario de contacto incompletos:', requestBody);
            res.status(400).send('Por favor, proporciona nombre completo, correo electrónico y mensaje.');
            return;
        }

        try {
            console.log('Mensaje de contacto recibido:', { fullName, email, message });
            await db.collection('contactMessages').add({
                fullName: fullName,
                email: email,
                message: message,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
            res.status(200).send('Mensaje de contacto enviado con éxito.');
        } catch (error) {
            console.error('Error al guardar el mensaje de contacto en Firestore:', error);
            res.status(500).send('Error interno del servidor al guardar el mensaje.');
        }
    }
    // Si la petición es para la ruta de guardar orden y actualizar inventario
    else if (req.path === '/save-order') {
        const { orderDetails, userId } = requestBody;

        if (!orderDetails || !userId) {
            res.status(400).send('Detalles de la orden o ID de usuario faltante.');
            return;
        }

        try {
            await db.runTransaction(async (transaction) => {
                const userOrdersCollectionRef = db.collection('users').doc(userId).collection('orders');
                const orderToSaveUser = {
                    date: admin.firestore.FieldValue.serverTimestamp(),
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
                
                // Agrega la nueva orden a la subcolección de órdenes del usuario
                transaction.set(userOrdersCollectionRef.doc(), orderToSaveUser);

                // Actualiza el inventario de cada producto
                for (const item of orderDetails.items) {
                    const productDocRef = db.collection('products').doc(item.id);
                    const productDoc = await transaction.get(productDocRef);

                    if (!productDoc.exists) {
                        throw new Error(`El producto con ID ${item.id} no existe.`);
                    }

                    const newStock = productDoc.data().stock - item.quantity;
                    if (newStock < 0) {
                        throw new Error(`No hay suficiente stock para el producto: ${item.name}.`);
                    }

                    transaction.update(productDocRef, { stock: newStock });
                }
            });

            console.log('Inventario actualizado y orden guardada con éxito.');
            res.status(200).json({ message: 'Inventario actualizado y orden guardada con éxito.' });

        } catch (error) {
            console.error('Error en la transacción de actualización de inventario o guardado de orden:', error);
            const errorMessage = error.message || 'Error interno del servidor.';
            res.status(500).json({ message: `Error interno del servidor: ${errorMessage}` });
        }
    } else {
        res.status(404).send('Ruta no encontrada.');
    }
});

// =============================================================================
// Cloud Function para el Disparador de Firestore
//
// Esta función ahora usa el nuevo formato `onDocumentCreated` de v2.
// =============================================================================
exports.createOrderEmail = onDocumentCreated('users/{userId}/orders/{orderId}', async (event) => {
    // La información del documento creado está en `event.data`
    const snapshot = event.data;

    // Si el snapshot no existe, termina la función
    if (!snapshot) {
        console.log("No se encontró el documento en el evento.");
        return;
    }

    const orderData = snapshot.data();
    const { userId, orderId } = event.params; // Captura los parámetros de la ruta
    console.log(`Nueva orden creada para el usuario ${userId}:`, orderData);
    console.log(`El ID de la orden es: ${orderId}`);

    // Nota: Aquí se debería agregar la lógica para enviar un correo electrónico.
    // Esto podría implicar llamar a otra API o usar una librería de correo.
    // Como no se ha proporcionado, solo se registra un mensaje.
    // Ejemplo de cómo obtener los datos necesarios:
    const customerEmail = orderData.shippingDetails.email;
    const orderItems = orderData.items;

    console.log(`Simulando el envío de un correo electrónico a ${customerEmail} con los detalles de la orden:`);
    console.log(JSON.stringify(orderItems, null, 2));

    // Retorna para finalizar la función
    return null;
});
