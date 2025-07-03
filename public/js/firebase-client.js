/**
 * Configuración pública de Firebase para el cliente (versión modular v9+)
 * ¡No incluye credenciales sensibles!
 */

// Importaciones desde el SDK modular
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// import { getAnalytics } from "firebase/analytics"; // Opcional

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

// Inicialización de servicios con Firebase v9+
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
// const analytics = getAnalytics(app); // Opcional

// Exportaciones seguras para el cliente
export { 
  app,
  auth, 
  db, 
  storage
};
