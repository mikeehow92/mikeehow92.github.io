/**
 * Configuración de Firebase (SDK Modular v9+)
 * Ubicación: /public/js/firebase-client.js
 * Seguro para frontend - No expone credenciales sensibles
 */

// Importaciones modulares de Firebase v9
import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuración pública (segura para frontend)
const firebaseConfig = {
  apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
  authDomain: "mitienda-c2609.firebaseapp.com",
  projectId: "mitienda-c2609",
  storageBucket: "mitienda-c2609.appspot.com",
  messagingSenderId: "536746062790",
  appId: "1:536746062790:web:cd39eb0057aac14c6538c7"
};

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);

// Servicios de Firebase
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Configura persistencia de autenticación
auth.setPersistence(browserLocalPersistence)
  .catch((error) => {
    console.error("Error al configurar persistencia:", error);
  });

// Exporta solo lo necesario (sin 'firebase' global)
export { 
  app,
  auth,
  db,
  storage
};
