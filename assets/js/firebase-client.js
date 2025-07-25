// ==================== CONFIGURACIÓN UNIFICADA ====================
// ¡IMPORTANTE! Importaciones estándar de Firebase desde npm
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
    authDomain: "mitienda-c2609.firebaseapp.com",
    databaseURL: "https://mitienda-c2609-default-rtdb.firebaseio.com",
    projectId: "mitienda-c2609",
    storageBucket: "mitienda-c2609.appspot.com", // Unificado con pago.js
    messagingSenderId: "536746062790",
    appId: "1:536746062790:web:6e545efbc8f037e36538c7", // Usar misma appId
    measurementId: "G-XXXXXXXXXX" // Opcional (solo si usas Analytics)
};

// ==================== INICIALIZACIÓN MODULAR ====================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Opcional: Inicializar Analytics (si se usa)
// import { getAnalytics } from "firebase/analytics";
// const analytics = getAnalytics(app);

// ==================== EXPORTACIONES ====================
export { app, auth, db, storage };
