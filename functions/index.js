const { onRequest } = require("firebase-functions/v2/https");
const { onCall } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
admin.initializeApp();

// Configuración global para Gen 2
setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

const db = admin.firestore();
const MAX_ORDER_ITEMS = 20;
const MAX_ORDER_VALUE = 10000;

// =============================================================================
// 1. Función HTTP para Formulario de Contacto (exports.api) - GEN 2
// =============================================================================
exports.api = onRequest(
  {
    cors: true,
    minInstances: 0,
    maxInstances: 3,
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).send("Método no permitido. Solo POST.");
    }

    const { fullName, email, message } = req.body;
    if (!fullName || !email || !message) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    try {
      await db.collection("contacts").add({
        fullName,
        email,
        message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error en api:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  }
);

// =============================================================================
// 2. Función para Procesar Órdenes (exports.updateInventoryAndSaveOrder) - GEN 2
// =============================================================================
exports.updateInventoryAndSaveOrder = onCall(
  {
    enforceAppCheck: false,
    minInstances: 0,
    maxInstances: 5,
  },
  async (request) => {
    // 1. Validar usuario (autenticado o invitado)
    let userId;
    if (request.auth) {
      userId = request.auth.uid;
    } else if (request.data.guestUserId) {
      userId = request.data.guestUserId;
    } else {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Debes iniciar sesión o proporcionar un ID de invitado"
      );
    }

    // 2. Validar datos de la orden
    const orderDetails = request.data.orderDetails;
    if (!orderDetails?.items?.length || typeof orderDetails?.total !== "number") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "La orden debe incluir items y total válido"
      );
    }

    if (orderDetails.items.length > MAX_ORDER_ITEMS) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Máximo ${MAX_ORDER_ITEMS} productos por orden`
      );
    }

    if (orderDetails.total > MAX_ORDER_VALUE) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `El total no puede exceder $${MAX_ORDER_VALUE}`
      );
    }

    // 3. Procesar transacción
    try {
      const orderRef = db.collection("orders").doc();
      await db.runTransaction(async (transaction) => {
        // Actualizar inventario
        for (const item of orderDetails.items) {
          const productRef = db.collection("products").doc(item.id);
          const productDoc = await transaction.get(productRef);

          if (!productDoc.exists) {
            throw new functions.https.HttpsError("not-found", `Producto ${item.id} no existe`);
          }

          const newStock = productDoc.data().stock - item.quantity;
          if (newStock < 0) {
            throw new functions.https.HttpsError(
              "failed-precondition",
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
          status: "pending",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          isGuestOrder: !request.auth,
        };

        // Guardar en ambas colecciones
        transaction.set(orderRef, orderData);
        transaction.set(
          db.collection("users").doc(userId).collection("orders").doc(orderRef.id),
          orderData
        );
      });

      return {
        success: true,
        orderId: orderRef.id,
        message: "Orden procesada exitosamente",
      };
    } catch (error) {
      console.error("Error en updateInventoryAndSaveOrder:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Error al procesar la orden"
      );
    }
  }
);

// =============================================================================
// 3. Función para Actualizar Estado (exports.updateOrderStatus) - GEN 2
// =============================================================================
exports.updateOrderStatus = onCall(
  {
    enforceAppCheck: false,
    minInstances: 0,
    maxInstances: 3,
  },
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Solo usuarios autenticados pueden actualizar órdenes"
      );
    }

    const { orderId, userId, newStatus } = request.data;
    if (!orderId || !userId || !newStatus) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Faltan parámetros: orderId, userId o newStatus"
      );
    }

    try {
      const batch = db.batch();
      const orderRef = db.collection("orders").doc(orderId);
      const userOrderRef = db.collection("users").doc(userId).collection("orders").doc(orderId);

      batch.update(orderRef, {
        status: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batch.update(userOrderRef, {
        status: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error en updateOrderStatus:", error);
      throw new functions.https.HttpsError("internal", "Error al actualizar estado");
    }
  }
);

// =============================================================================
// 4. Trigger para Sincronizar Estados (exports.syncOrderStatus) - GEN 2
// =============================================================================
exports.syncOrderStatus = onDocumentUpdated(
  {
    document: "orders/{orderId}",
    maxInstances: 5,
  },
  async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();
    const orderId = event.params.orderId;

    if (newData.status === oldData.status) return;

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
      console.log(`Sincronizado: Orden ${orderId} -> ${newData.status}`);
    } catch (error) {
      console.error("Error en syncOrderStatus:", error);
      if (["unavailable", "resource-exhausted"].includes(error.code)) {
        throw error; // Reintentar automáticamente
      }
    }
  }
);
