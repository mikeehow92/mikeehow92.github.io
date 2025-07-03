/**
 * Configuración de Firebase para el cliente (SDK Modular v9+)
 * Ubicación: /public/js/firebase-client.js
 * Seguro para frontend - No incluye credenciales sensibles
 */

// Importaciones modulares de Firebase v9
import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// import { getAnalytics } from "firebase/analytics"; // Descomenta si necesitas Analytics

// Configuración pública (puedes exponerla en el frontend)
const firebaseConfig = {
  apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
  authDomain: "mitienda-c2609.firebaseapp.com",
  projectId: "mitienda-c2609",
  storageBucket: "mitienda-c2609.appspot.com",
  messagingSenderId: "536746062790",
  appId: "1:536746062790:web:cd39eb0057aac14c6538c7",
  measurementId: "G-XXXXXXXXXX" // Opcional para Analytics
};

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);

// Inicialización de servicios
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
// const analytics = getAnalytics(app); // Descomenta si necesitas Analytics

// Configuración adicional para Auth (sesión persistente)
auth.setPersistence(browserLocalPersistence)
  .catch((error) => {
    console.error("Error configurando persistencia de auth:", error);
  });

// Exporta solo lo necesario (seguridad y optimización)
export { 
  app,
  auth,
  db,
  storage
  // No exportes 'firebase' completo en v9+
};
