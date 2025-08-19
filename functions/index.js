const functions = require('firebase-functions/v1'); // ¡Versión v1!
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// Límites de validación
const MAX_ORDER_ITEMS = 20;
const MAX_ORDER_VALUE = 10000;

// =============================================================================
// 1. Función HTTP para Formulario de Contacto (exports.api)
// =============================================================================
exports.api = functions.https.onRequest(async (req, res) => {
  // Configuración CORS
  res.set('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Método no permitido. Solo POST.');
  }

  const { fullName, email, message } = req.body;
  if (!fullName || !email || !message) {
    return res.status(400).json({ 
      error: 'Faltan campos requeridos: nombre, email o mensaje' 
    });
  }

  try {
    await db.collection('contacts').add({
      fullName,
      email,
      message,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error en api:', error);
    return res.status(500).json({ error: 'Error al guardar el mensaje' });
  }
});

// =============================================================================
// 2. Función para Procesar Órdenes (exports.updateInventoryAndSaveOrder)
// =============================================================================
exports.updateInventoryAndSaveOrder = functions.https.onCall(async (data, context) => {
  // 1. Validar usuario (autenticado o invitado)
  let userId;
  if (context.auth) {
    userId = context.auth.uid;
  } else if (data.guestUserId) {
    userId = data.guestUserId;
  } else {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Debes iniciar sesión o proporcionar un ID de invitado'
    );
  }

  // 2. Validar datos de la orden
  const orderDetails = data.orderDetails;
  if (!orderDetails?.items?.length || typeof orderDetails?.total !== 'number') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'La orden debe incluir items y total válido'
    );
  }

  if (orderDetails.items.length > MAX_ORDER_ITEMS) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Máximo ${MAX_ORDER_ITEMS} productos por orden`
    );
  }

  if (orderDetails.total > MAX_ORDER_VALUE) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `El total no puede exceder $${MAX_ORDER_VALUE}`
    );
  }

  // 3. Procesar transacción
  try {
    const orderRef = db.collection('orders').doc();
    await db.runTransaction(async (transaction) => {
      // Actualizar inventario
      for (const item of orderDetails.items) {
        const productRef = db.collection('products').doc(item.id);
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists) {
          throw new functions.https.HttpsError('not-found', `Producto ${item.id} no existe`);
        }

        const newStock = productDoc.data().stock - item.quantity;
        if (newStock < 0) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            `Stock insuficiente para ${productDoc.data().name}`
          );
        }
        transaction.update(productRef, { stock: newStock });
      }

      // Crear orden
      const orderData = {
        ...orderDetails,
        userId,
        orderId: orderRef.id,
        status: 'pending',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        isGuestOrder: !context.auth
      };

      // Guardar en ambas colecciones
      transaction.set(orderRef, orderData);
      transaction.set(
        db.collection('users').doc(userId).collection('orders').doc(orderRef.id),
        orderData
      );
    });

    return { 
      success: true,
      orderId: orderRef.id,
      message: 'Orden procesada exitosamente'
    };

  } catch (error) {
    console.error('Error en updateInventoryAndSaveOrder:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'Error al procesar la orden');
  }
});

// =============================================================================
// 3. Función para Actualizar Estado (exports.updateOrderStatus)
// =============================================================================
exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Solo usuarios autenticados pueden actualizar órdenes'
    );
  }

  const { orderId, userId, newStatus } = data;
  if (!orderId || !userId || !newStatus) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Faltan parámetros: orderId, userId o newStatus'
    );
  }

  try {
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
    return { success: true };

  } catch (error) {
    console.error('Error en updateOrderStatus:', error);
    throw new functions.https.HttpsError('internal', 'Error al actualizar estado');
  }
});

// =============================================================================
// 4. Trigger para Sincronizar Estados (exports.syncOrderStatus)
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
      console.log(`Estado sincronizado para orden ${orderId}`);
    } catch (error) {
      console.error('Error en syncOrderStatus:', error);
      if (error.code === 14) throw error; // Reintentar si es error temporal
    }
  });
