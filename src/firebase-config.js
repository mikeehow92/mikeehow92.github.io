// src/shared/firebase-config.js

import { initializeApp, getApp } from "firebase/app";
import { getAuth, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
  authDomain: "mitienda-c2609.firebaseapp.com",
  databaseURL: "https://mitienda-c2609-default-rtdb.firebaseio.com",
  projectId: "mitienda-c2609",
  storageBucket: "mitienda-c2609.firebasestorage.app",
  messagingSenderId: "536746062790",
  appId: "1:536746062790:web:cd39eb0057aac14c6538c7"
};

// Inicialización simplificada
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    app = getApp();
  } else {
    console.error("Firebase initialization error", error);
    // Es importante relanzar el error para que la aplicación sepa que la inicialización falló
    throw error;
  }
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Configuración básica de persistencia (sin async)
auth.setPersistence(browserLocalPersistence)
  .catch((error) => console.error("Auth persistence error", error));

export { app, auth, db, storage };
