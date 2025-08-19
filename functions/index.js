const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();
const MAX_ORDER_ITEMS = 20;
const MAX_ORDER_VALUE = 10000;

// =============================================================================
// 1. Cloud Function para el Formulario de Contacto (HTTP)
// =============================================================================
exports.api = functions.https.onRequest(async (req, res) => {
  // Configuración CORS
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Método no permitido. Solo POST.");
  }

  const { fullName, email, message } = req.body;

  if (!fullName || !email || !message) {
    return res.status(400).send("Faltan campos requeridos.");
  }

  try {
    await db.collection("contacts").add({
      fullName,
      email,
      message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(200).send({ success: true, message: "Mensaje enviado." });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Error interno del servidor.");
  }
});

// =============================================================================
// 2. Cloud Function para Procesar Órdenes (Callable)
// =============================================================================
exports.processOrder = functions.https.onCall(async (data, context) => {
  // Validar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Debes iniciar sesión para realizar pedidos."
    );
  }

  const userId = context.auth.uid;
  const orderDetails = data.orderDetails;

  // Validar datos de la orden
  if (!orderDetails?.items || !orderDetails?.total) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Datos de la orden incompletos."
    );
  }

  if (orderDetails.items.length > MAX_ORDER_ITEMS) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Máximo ${MAX_ORDER_ITEMS} productos por orden.`
    );
  }

  if (orderDetails.total > MAX_ORDER_VALUE) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `El total no puede exceder $${MAX_ORDER_VALUE}.`
    );
  }

  try {
    await db.runTransaction(async (transaction) => {
      // Actualizar inventario
      for (const item of orderDetails.items) {
        const productRef = db.collection("products").doc(item.id);
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists) {
          throw new Error(`Producto ${item.id} no encontrado.`);
        }

        const currentStock = productDoc.data().stock;
        const newStock = currentStock - item.quantity;

        if (newStock < 0) {
          throw new Error(`Stock insuficiente para ${productDoc.data().name}.`);
        }

        transaction.update(productRef, { stock: newStock });
      }

      // Crear orden
      const orderRef = db.collection("orders").doc();
      const orderId = orderRef.id;
      const orderData = {
        ...orderDetails,
        userId,
        orderId,
        status: "pending",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Guardar en ambas colecciones
      transaction.set(orderRef, orderData);
      transaction.set(
        db.collection("users").doc(userId).collection("orders").doc(orderId),
        orderData
      );
    });

    return { success: true, message: "Orden procesada correctamente." };
  } catch (error) {
    console.error("Error en la transacción:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// =============================================================================
// 3. Trigger para Sincronizar Estados (Firestore)
// =============================================================================
exports.syncOrderStatus = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const orderId = context.params.orderId;

    // Solo sincronizar si cambió el estado
    if (newData.status === oldData.status) return null;

    try {
      await db
        .collection("users")
        .doc(newData.userId)
        .collection("orders")
        .doc(orderId)
        .update({
          status: newData.status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      console.log(`Estado sincronizado para orden ${orderId}`);
    } catch (error) {
      console.error("Error al sincronizar:", error);
      if (shouldRetry(error)) throw error; // Reintentar si es un error temporal
    }
  });

// =============================================================================
// 4. Trigger para Notificaciones (Firestore)
// =============================================================================
exports.sendOrderNotification = functions.firestore
  .document("users/{userId}/orders/{orderId}")
  .onUpdate(async (change, context) => {
    const newStatus = change.after.data().status;
    const oldStatus = change.before.data().status;
    const userId = context.params.userId;

    // Solo notificar si cambió el estado
    if (newStatus === oldStatus) return null;

    try {
      const userDoc = await db.collection("users").doc(userId).get();
      const fcmToken = userDoc.data()?.fcmToken;

      if (!fcmToken) {
        console.log("Usuario sin token FCM.");
        return null;
      }

      await admin.messaging().send({
        token: fcmToken,
        notification: {
          title: `Actualización de tu orden`,
          body: `Estado: ${translateStatus(newStatus)}`,
        },
        data: {
          orderId: context.params.orderId,
          type: "status_update",
        },
      });

      console.log("Notificación enviada.");
    } catch (error) {
      console.error("Error al enviar notificación:", error);
    }
  });

// =============================================================================
// Funciones de Utilidad
// =============================================================================
function shouldRetry(error) {
  const retryableErrors = ["resource-exhausted", "unavailable", "deadline-exceeded"];
  return retryableErrors.includes(error.code);
}

function translateStatus(status) {
  const statusMap = {
    pending: "pendiente",
    processing: "en proceso",
    shipped: "enviado",
    delivered: "entregado",
    cancelled: "cancelado",
  };
  return statusMap[status] || status;
}
