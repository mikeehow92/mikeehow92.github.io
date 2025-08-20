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
// 0. FUNCIÓN DE DEBUG (Para diagnosticar problemas)
// =============================================================================
exports.debugFunction = onCall(
  {
    enforceAppCheck: false,
    minInstances: 0,
    maxInstances: 3,
  },
  async (request) => {
    console.log("=== 🐛 DEBUG FUNCTION STARTED ===");
    console.log("📋 Request data:", JSON.stringify(request.data, null, 2));
    console.log("🔐 Request auth:", request.auth);
    console.log("📅 Timestamp:", new Date().toISOString());

    try {
      // Test de conexión a Firestore
      const testRef = db.collection("debug_logs").doc();
      await testRef.set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        auth: request.auth ? {
          uid: request.auth.uid,
          email: request.auth.token?.email || "no-email"
        } : "no-auth",
        data: request.data || "no-data",
        type: "debug_test",
        status: "success"
      });

      console.log("✅ Firestore connection test passed");

      return {
        success: true,
        message: "Debug function executed successfully",
        debugInfo: {
          auth: request.auth,
          dataReceived: request.data,
          firestoreWrite: "success",
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error("❌ DEBUG ERROR:", error);
      console.error("Stack trace:", error.stack);

      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          stack: error.stack
        },
        debugInfo: {
          timestamp: new Date().toISOString(),
          firestoreError: "Failed to write to debug_logs"
        }
      };
    }
  }
);

// =============================================================================
// 1. Función HTTP para Formulario de Contacto (exports.api)
// =============================================================================
exports.api = onRequest(
  {
    cors: true,
    minInstances: 0,
    maxInstances: 3,
  },
  async (req, res) => {
    console.log("📨 Contact form API called");
    
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).send("Método no permitido. Solo POST.");
    }

    const { fullName, email, message } = req.body;
    console.log("📝 Form data:", { fullName, email, message });

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
      
      console.log("✅ Contact saved successfully");
      return res.status(200).json({ success: true });
      
    } catch (error) {
      console.error("❌ Error en api:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  }
);

// =============================================================================
// 2. Función para Procesar Órdenes (VERSIÓN MEJORADA)
// =============================================================================
exports.updateInventoryAndSaveOrder = onCall(
  {
    enforceAppCheck: false,
    minInstances: 0,
    maxInstances: 5,
  },
  async (request) => {
    console.log("=== 🛒 updateInventoryAndSaveOrder STARTED ===");
    console.log("📦 Request data:", JSON.stringify(request.data, null, 2));
    console.log("👤 Request auth:", request.auth);

    try {
      // 1. Validaciones básicas
      if (!request.data) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "No se proporcionaron datos"
        );
      }

      // Desestructuramos los campos del objeto de datos para un acceso más sencillo
      const {
        orderDetails,
        payerEmail,
        payerId,
        paymentStatus,
        paypalTransactionId,
        shippingDetails,
      } = request.data;
      
      if (!orderDetails) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "No se proporcionaron detalles de la orden"
        );
      }

      // 2. Obtener userId (auth o guest)
      const userId = request.auth?.uid || request.data.guestUserId;
      if (!userId) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Usuario no autenticado y no se proporcionó guestUserId"
        );
      }

      console.log("👤 User ID:", userId);

      // 3. Validaciones simples
      if (!Array.isArray(orderDetails.items)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Items debe ser un array"
        );
      }

      if (typeof orderDetails.total !== "number") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Total debe ser un número"
        );
      }

      // 4. Crear orden con todos los campos (sin transactions complejas)
      const orderRef = db.collection("orders").doc();
      const orderData = {
        // Campos de la imagen "full info.png"
        estado: "pendiente",
        fechaOrden: admin.firestore.FieldValue.serverTimestamp(),
        items: orderDetails.items,
        payerEmail: payerEmail || null,
        payerId: payerId || null,
        paymentStatus: paymentStatus || null,
        paypalTransactionId: paypalTransactionId || null,
        shippingDetails: shippingDetails || null,
        total: orderDetails.total,
        userId: userId,
        // Campos de la imagen "actual.png" y lógica existente
        orderId: orderRef.id,
        isGuestOrder: !request.auth,
        createdAt: new Date().toISOString(),
        debug: {
          source: "full_version",
          auth: request.auth ? request.auth.uid : "guest",
        },
      };

      console.log("📝 Order data to save:", JSON.stringify(orderData, null, 2));

      // 5. Guardar orden en colección principal
      await orderRef.set(orderData);
      console.log("✅ Order saved in main collection:", orderRef.id);

      // 6. Guardar en subcolección del usuario
      const userOrderRef = db
        .collection("users")
        .doc(userId)
        .collection("orders")
        .doc(orderRef.id);

      await userOrderRef.set(orderData);
      console.log("✅ Order saved in user subcollection:", orderRef.id);

      // 7. Log de éxito
      await db.collection("debug_logs").add({
        type: "order_created",
        orderId: orderRef.id,
        userId: userId,
        timestamp: new Date().toISOString(),
        status: "success",
        itemsCount: orderDetails.items.length,
        total: orderDetails.total,
      });

      console.log("🎉 Order created successfully:", orderRef.id);

      return {
        success: true,
        orderId: orderRef.id,
        message: "Orden creada exitosamente",
        debug: {
          timestamp: new Date().toISOString(),
          version: "full",
        },
      };
    } catch (error) {
      console.error("💥 ERROR in updateInventoryAndSaveOrder:", error);
      console.error("📋 Error stack:", error.stack);

      // Log del error
      await db
        .collection("debug_logs")
        .add({
          type: "order_error",
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          status: "error",
          data: request.data,
        })
        .catch((e) => console.error("Failed to log error:", e));

      throw new functions.https.HttpsError(
        "internal",
        error.message || "Error interno del servidor",
        {
          details: error.stack,
          debug: "Check Firebase logs for more info",
        }
      );
    }
  }
);

// =============================================================================
// 3. Función para Actualizar Estado - ACTUALIZADA A ESPAÑOL
// =============================================================================
exports.updateOrderStatus = onCall(
  {
    enforceAppCheck: false,
    minInstances: 0,
    maxInstances: 3,
  },
  async (request) => {
    console.log("🔄 updateOrderStatus called");
    
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Solo usuarios autenticados pueden actualizar órdenes"
      );
    }

    const { orderId, userId, newStatus } = request.data;
    console.log("📋 Update data:", { orderId, userId, newStatus });

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

      // CAMBIO: status -> estado
      batch.update(orderRef, {
        estado: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // CAMBIO: status -> estado
      batch.update(userOrderRef, {
        estado: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();
      console.log("✅ Order status updated:", orderId);
      
      return { success: true };

    } catch (error) {
      console.error("❌ Error en updateOrderStatus:", error);
      throw new functions.https.HttpsError("internal", "Error al actualizar estado");
    }
  }
);

// =============================================================================
// 4. Trigger para Sincronizar Estados - ACTUALIZADA A ESPAÑOL
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

    // CAMBIO: status -> estado
    if (newData.estado === oldData.estado) return;

    console.log("🔄 Sync trigger for order:", orderId, "New status:", newData.estado);

    try {
      await db
        .collection("users")
        .doc(newData.userId)
        .collection("orders")
        .doc(orderId)
        .update({
          // CAMBIO: status -> estado
          estado: newData.estado,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      
      console.log("✅ Status synced for order:", orderId);
      
    } catch (error) {
      console.error("❌ Error en syncOrderStatus:", error);
      if (["unavailable", "resource-exhausted"].includes(error.code)) {
        throw error;
      }
    }
  }
);

console.log("✅ Firebase Functions initialized successfully");
