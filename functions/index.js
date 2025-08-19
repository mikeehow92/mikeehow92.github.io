const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();
const MAX_ORDER_ITEMS = 20;
const MAX_ORDER_VALUE = 10000;

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
  // 1. Determinar userId (cambio solicitado)
  let userId;
  if (context.auth) {
    userId = context.auth.uid;
  } else if (data.guestUserId) {
    userId = data.guestUserId;
  } else {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Debes estar autenticado o proporcionar un guestUserId.'
    );
  }

  // 2. Validaciones de la orden
  const orderDetails = data.orderDetails;
  if (!orderDetails || !orderDetails.items || !orderDetails.total) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Faltan detalles de la orden para procesar la compra.'
    );
  }

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

  // 3. Procesamiento de la transacción
  try {
    await db.runTransaction(async (transaction) => {
      // Actualizar inventario
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

      // Crear orden
      const newOrderRef = db.collection('orders').doc();
      const orderData = {
        ...orderDetails,
        userId,
        orderId: newOrderRef.id,
        status: 'pending',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        isGuestOrder: !context.auth
      };

      // Guardar en ambas colecciones
      transaction.set(newOrderRef, orderData);
      transaction.set(
        db.collection('users').doc(userId).collection('orders').doc(newOrderRef.id),
        orderData
      );
    });

    return { 
      success: true,
      message: 'Inventario actualizado y orden guardada con éxito.'
    };

  } catch (error) {
    functions.logger.error('Transaction error:', error, { 
      userId,
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
// =============================================================================
exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
  // 1. Verificar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Solo los usuarios autenticados pueden actualizar el estado de las órdenes.'
    );
  }

  // 2. Validar datos de entrada
  const { orderId, userId, newStatus } = data;
  if (!orderId || !userId || !newStatus) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Faltan parámetros para actualizar la orden (orderId, userId, newStatus).'
    );
  }

  // 3. Verificar permisos
  if (context.auth.uid !== userId && !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'No tienes permisos para actualizar esta orden.'
    );
  }

  try {
    // 4. Actualizar estado
    const batch = db.batch();
    const orderRef = db.collection('orders').doc(orderId);
    const userOrderRef = db.collection('users').doc(userId).collection('orders').doc(orderId);

    batch.update(orderRef, { 
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    batch.update(userOrderRef, { 
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    return { 
      success: true,
      message: 'Estado de la orden actualizado con éxito.'
    };

  } catch (error) {
    functions.logger.error('Error al actualizar el estado de la orden:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error al actualizar el estado de la orden. Por favor, inténtalo de nuevo más tarde.'
    );
  }
});

// =============================================================================
// Trigger para sincronización de estados
// =============================================================================
exports.syncOrderStatus = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const orderId = context.params.orderId;

    if (newData.status === oldData.status) return null;

    try {
      await db.collection('users')
        .doc(newData.userId)
        .collection('orders')
        .doc(orderId)
        .update({
          status: newData.status,
          updatedAt: newData.updatedAt || admin.firestore.FieldValue.serverTimestamp()
        });

      functions.logger.log(`Estado sincronizado para orden ${orderId}`);
    } catch (error) {
      functions.logger.error('Error al sincronizar estado:', error);
      if (error.code === 14 || error.code === 'UNAVAILABLE') {
        throw error; // Reintentar para errores temporales
      }
    }
  });
