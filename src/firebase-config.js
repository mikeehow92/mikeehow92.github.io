import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { FIREBASE_CONFIG } from "../constants";

// Configuración de Firebase (extraída de constantes.js)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

/**
 * Inicializa Firebase con verificación de duplicados
 * @returns {FirebaseApp} Instancia de Firebase
 */
const initializeFirebaseApp = () => {
  try {
    return initializeApp(firebaseConfig);
  } catch (error) {
    if (error.code === 'app/duplicate-app') {
      return getApp();
    }
    console.error("Error initializing Firebase:", error);
    throw error;
  }
};

// Inicialización de servicios
const app = initializeFirebaseApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Configuración adicional de Firestore
const firestoreSettings = {
  experimentalForceLongPolling: import.meta.env.MODE === 'test' // Solo para entornos de prueba
};

// Configuración de persistencia de autenticación (opcional)
const setPersistence = async () => {
  const { browserLocalPersistence } = await import('firebase/auth');
  try {
    await auth.setPersistence(browserLocalPersistence);
  } catch (error) {
    console.error("Error setting auth persistence:", error);
  }
};

setPersistence();

// Configuración de emuladores en desarrollo
const configureEmulators = () => {
  if (import.meta.env.DEV) {
    import('firebase/auth').then(({ connectAuthEmulator }) => {
      connectAuthEmulator(auth, "http://localhost:9099");
    });

    import('firebase/firestore').then(({ connectFirestoreEmulator }) => {
      connectFirestoreEmulator(db, 'localhost', 8080);
    });

    import('firebase/storage').then(({ connectStorageEmulator }) => {
      connectStorageEmulator(storage, 'localhost', 9199);
    });

    console.log("Firebase emulators initialized");
  }
};

configureEmulators();

// Exportaciones tipadas
/**
 * @typedef {Object} FirebaseServices
 * @property {FirebaseApp} app - Instancia de Firebase App
 * @property {Auth} auth - Servicio de Autenticación
 * @property {Firestore} db - Servicio de Firestore
 * @property {Storage} storage - Servicio de Storage
 */

/**
 * Obtiene los servicios de Firebase inicializados
 * @returns {FirebaseServices} Objeto con los servicios
 */
export const getFirebaseServices = () => ({ app, auth, db, storage });

// Exportaciones individuales
export { app, auth, db, storage };
