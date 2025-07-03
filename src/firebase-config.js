import { initializeApp, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuración de Firebase usando variables de entorno de Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

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

// Configuración de persistencia de autenticación
const initializeAuthPersistence = async () => {
  try {
    const { browserLocalPersistence, inMemoryPersistence } = await import('firebase/auth');
    await auth.setPersistence(
      import.meta.env.PROD ? browserLocalPersistence : inMemoryPersistence
    );
  } catch (error) {
    console.error("Error setting auth persistence:", error);
  }
};

initializeAuthPersistence();

// Configuración de emuladores para desarrollo
const configureEmulators = async () => {
  if (!import.meta.env.DEV) return;

  try {
    const [{ connectAuthEmulator }, { connectFirestoreEmulator }, { connectStorageEmulator }] = 
      await Promise.all([
        import('firebase/auth'),
        import('firebase/firestore'),
        import('firebase/storage')
      ]);

    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    
    console.log("Firebase emulators initialized");
  } catch (error) {
    console.error("Error initializing emulators:", error);
  }
};

configureEmulators();

// Exportaciones
export { app, auth, db, storage };
