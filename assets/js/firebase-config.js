// assets/js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
