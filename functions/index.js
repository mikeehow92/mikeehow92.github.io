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
        return res.status(200).send('Mensaje de contacto enviado con éxito.');
    } catch (error) {
        functions.logger.error('Error al guardar el mensaje de contacto:', error);
        return res.status(500).send('Error interno del servidor al guardar el mensaje.');
    }
});

// =============================================================================
// Nueva Cloud Function para actualizar el estado de las órdenes
// Se invoca desde el front-end (Orders.jsx)
// =============================================================================
exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
    // 1. Verificar si el usuario está autenticado. Esto es una buena práctica de seguridad.
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
        await orderRef.update({ estado: newStatus });
        functions.logger.info(`Estado de la orden ${orderId} actualizado a ${newStatus} en la colección principal.`);

        // 5. Actualizar el estado en la subcolección 'orders' del usuario
        // Esto asegura que el estado se refleje en la sección de perfil del usuario
        const userOrderRef = db.collection('users').doc(userId).collection('orders').doc(orderId);
        await userOrderRef.update({ estado: newStatus });
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
