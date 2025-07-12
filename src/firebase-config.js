    import { initializeApp } from "firebase/app";
    import { getAuth } from "firebase/auth";
    // Solo importamos getFirestore, sin setFirestoreSettings ni enableIndexedDbPersistence por ahora
    import { getFirestore } from "firebase/firestore"; 
    import { getStorage } from "firebase/storage";

    // Tu configuración de Firebase
    const firebaseConfig = {
      apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
      authDomain: "mitienda-c2609.firebaseapp.com",
      databaseURL: "https://mitienda-c2609-default-rtdb.firebaseio.com",
      projectId: "mitienda-c2609",
      storageBucket: "mitienda-c2609.firebasestorage.app",
      messagingSenderId: "536746062790",
      appId: "1:536746062790:web:cd39eb0057aac14c6538c7"
    };

    // Inicializa Firebase y exporta las instancias de servicio
    export const app = initializeApp(firebaseConfig);
    export const auth = getAuth(app);
    export const db = getFirestore(app); // Inicialización directa de Firestore
    export const storage = getStorage(app);

    // Eliminamos cualquier llamada a setFirestoreSettings o enableIndexedDbPersistence por ahora
    // para asegurar la conexión básica.

    console.log("Firebase config loaded and app initialized.");
