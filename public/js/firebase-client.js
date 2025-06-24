/**
 * Configuración pública de Firebase para el cliente
 * ¡No incluye credenciales sensibles!
 */

// Configuración pública (segura para exponer en el frontend)
const firebaseConfig = {
  apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
  authDomain: "mitienda-c2609.firebaseapp.com",
  projectId: "mitienda-c2609",
  storageBucket: "mitienda-c2609.appspot.com",
  messagingSenderId: "536746062790",
  appId: "1:536746062790:web:cd39eb0057aac14c6538c7",
  measurementId: "G-XXXXXXXXXX" // Opcional para Analytics
};

// Inicialización básica de Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Opcional: Inicialización de Analytics
// const analytics = firebase.analytics();

// Exportaciones seguras para el cliente
export { 
  app,
  auth, 
  db, 
  storage,
  firebase // Exportar firebase completo si necesitas funciones específicas
};
