const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.getPaypalConfig = functions.https.onCall(async (data, context) => {
  // Verifica autenticación si es necesario
  if (!context.auth && process.env.VITE_DEBUG_MODE !== 'true') {
    throw new functions.https.HttpsError('unauthenticated', 'Acceso no autorizado');
  }

  return {
    clientId: functions.config().paypal.client_id,
    env: process.env.VITE_DEBUG_MODE === 'true' ? 'sandbox' : 'production'
  };
});
