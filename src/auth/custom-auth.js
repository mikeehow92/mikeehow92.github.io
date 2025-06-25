// custom-auth.js
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const loginBtn = document.getElementById('open-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const loginModal = document.getElementById('loginModal');
    const closeBtn = document.getElementById('closeBtn');
    const loginForm = document.getElementById('loginForm');
    const guestButtons = document.getElementById('guest-buttons');
    const userInfo = document.getElementById('user-info');
    const userEmail = document.getElementById('user-email');
    const userAvatar = document.getElementById('user-avatar');

    // Configuración de Firebase (debe coincidir con tu configuración)
    const firebaseConfig = {
        apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
        authDomain: "mitienda-c2609.firebaseapp.com",
        projectId: "mitienda-c2609",
        storageBucket: "mitienda-c2609.appspot.com",
        messagingSenderId: "536746062790",
        appId: "1:536746062790:web:cd39eb0057aac14c6538c7"
    };

    // Inicializa Firebase
    const app = firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Manejo del modal
    loginBtn.addEventListener('click', () => {
        loginModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });

    closeBtn.addEventListener('click', () => {
        loginModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });

    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });

    // Login con email y contraseña
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            
            if (!userCredential.user.emailVerified) {
                alert('Por favor verifica tu correo electrónico antes de iniciar sesión');
                await auth.signOut();
                return;
            }
            
            loginModal.style.display = 'none';
            updateUI(userCredential.user);
        } catch (error) {
            handleAuthError(error);
        }
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
            updateUI(null);
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            alert('Ocurrió un error al cerrar sesión');
        }
    });

    // Escuchar cambios de autenticación
    auth.onAuthStateChanged((user) => {
        updateUI(user);
    });

    // Actualizar la interfaz según el estado de autenticación
    function updateUI(user) {
        if (user) {
            guestButtons.style.display = 'none';
            userInfo.style.display = 'flex';
            userEmail.textContent = user.email;
            
            if (user.photoURL) {
                userAvatar.src = user.photoURL;
            } else {
                userAvatar.src = 'https://via.placeholder.com/32';
            }
        } else {
            guestButtons.style.display = 'flex';
            userInfo.style.display = 'none';
        }
    }

    // Manejo de errores
    function handleAuthError(error) {
        const errorMessages = {
            'auth/invalid-email': 'El correo electrónico no es válido',
            'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
            'auth/user-not-found': 'No existe una cuenta con este correo',
            'auth/wrong-password': 'Contraseña incorrecta',
            'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
            'auth/network-request-failed': 'Error de conexión. Verifica tu internet'
        };

        const message = errorMessages[error.code] || 'Error en autenticación. Por favor intenta nuevamente.';
        alert(message);
    }
});
