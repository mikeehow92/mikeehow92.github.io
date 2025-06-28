const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.getPaypalConfig = functions.https.onCall(async (data, context) => {
  try {
    // 1. Verificación de autenticación (más flexible para desarrollo)
    const isDebugMode = process.env.VITE_DEBUG_MODE === 'true';
    
    if (!isDebugMode && !context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated', 
        'Acceso no autorizado. Por favor inicie sesión.',
        { code: 'UNAUTHENTICATED' }
      );
    }

    // 2. Obtener configuración con validación
    const paypalConfig = functions.config().paypal;
    
    if (!paypalConfig || !paypalConfig.client_id) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Configuración de PayPal no disponible',
        { code: 'MISSING_CONFIG' }
      );
    }

    // 3. Determinar entorno
    const environment = isDebugMode ? 'sandbox' : 
                      (paypalConfig.env === 'sandbox' ? 'sandbox' : 'production');

    // 4. Retornar configuración segura
    return {
      clientId: paypalConfig.client_id,
      env: environment,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

  } catch (error) {
    console.error('Error en getPaypalConfig:', error);
    
    // Si ya es un error de Firebase, lo relanzamos
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    // Para otros errores, lanzamos uno genérico
    throw new functions.https.HttpsError(
      'internal',
      'Error al obtener configuración de PayPal',
      { originalError: error.message }
    );
  }
});
