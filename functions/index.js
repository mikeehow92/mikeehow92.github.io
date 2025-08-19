const functions = require("firebase-functions/v1"); // ¡Versión v1!
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
    functions.logger.error("Faltan campos requeridos:", req.body);
    return res.status(400).send("Por favor completa todos los campos.");
  }

  try {
    await db.collection("contacts").add({
      fullName,
      email,
      message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(200).send({ success: true, message: "Mensaje enviado con éxito." });
  } catch (error) {
    functions.logger.error("Error al guardar contacto:", error);
    return res.status(500).send("Error interno del servidor.");
  }
});

// =============================================================================
// 2. Cloud Function para Procesar Órdenes (Callable)
// =============================================================================
exports.updateInventoryAndSaveOrder = functions.https.onCall(async (data, context) => {
  // 1. Determinar userId (soporta invitados)
  let userId;
  if (context.auth) {
    userId = context.auth.uid;
  } else if (data.guestUserId) {
    userId = data.guestUserId;
  } else {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Debes estar autenticado o proporcionar un guestUserId."
    );
  }

  // 2. Validar datos de la orden
  const orderDetails = data.orderDetails;
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
      // 3. Actualizar inventario
      for (const item of orderDetails.items) {
        const productRef = db.collection("products").doc(item.id);
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists) {
          throw new functions.https.HttpsError("not-found", `Producto ${item.id} no encontrado.`);
        }

        const currentStock = productDoc.data().stock;
        const newStock = currentStock - item.quantity;

        if (newStock < 0) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            `Stock insuficiente para ${productDoc.data().name}.`
          );
        }

        transaction.update(productRef, { stock: newStock });
      }

      // 4. Crear orden
      const orderRef = db.collection("orders").doc();
      const orderData = {
        ...orderDetails,
        userId,
        orderId: orderRef.id,
        status: "pending",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        isGuestOrder: !context.auth
      };

      // 5. Guardar en ambas colecciones
      transaction.set(orderRef, orderData);
      transaction.set(
        db.collection("users").doc(userId).collection("orders").doc(orderRef.id),
        orderData
      );
    });

    return { 
      success: true,
      message: "Orden procesada correctamente.",
      orderId: orderRef.id
    };
  } catch (error) {
    functions.logger.error("Error en transacción:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Error al procesar la orden.");
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

      functions.logger.log(`Estado sincronizado para orden ${orderId}`);
    } catch (error) {
      functions.logger.error("Error al sincronizar:", error);
      if (error.code === 14 || error.code === "UNAVAILABLE") {
        throw error; // Reintentar para errores temporales
      }
    }
  });

// =============================================================================
// Funciones de Utilidad
// =============================================================================
function shouldRetry(error) {
  const retryableErrors = ["resource-exhausted", "unavailable", "deadline-exceeded"];
  return retryableErrors.includes(error.code);
}
