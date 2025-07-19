// js/login.js

// Importa las funciones necesarias de Firebase Auth al inicio del módulo
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    // Manejo del botón "Iniciar Sesión" en el header
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            console.log('Ya estás en la página de inicio de sesión.');
            // No hacer nada o mostrar un mensaje si ya está en esta página
        });
    }

    const loginForm = document.getElementById('loginForm');
    const registerLink = document.getElementById('registerLink');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Previene el envío por defecto del formulario

            const email = document.getElementById('emailLogin').value;
            const password = document.getElementById('passwordLogin').value;

            console.log('Intento de inicio de sesión:');
            console.log('Correo Electrónico:', email);
            // console.log('Contraseña:', password); // No loguear contraseñas en producción

            // Comentario: Aquí es donde integrarías Firebase Authentication.
            const auth = window.firebaseAuth; // Asumiendo que auth se exporta desde common.js

            if (!auth) {
                console.error("Firebase Auth no está inicializado.");
                window.showAlert("Error: No se pudo conectar con el servicio de autenticación.", "error");
                return;
            }

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                console.log('Usuario ha iniciado sesión:', user);
                window.showAlert('¡Inicio de sesión exitoso! Bienvenido.', 'success');
                // Redirigir al usuario a una página después del inicio de sesión (ej. index.html o un dashboard)
                window.location.href = 'productos.html'; // Redirige a la página de productos después del login
            } catch (error) {
                console.error('Error al iniciar sesión:', error.message);
                let errorMessage = 'Error al iniciar sesión. Por favor, verifica tus credenciales.';
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    errorMessage = 'Correo o contraseña incorrectos.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'El formato del correo electrónico es inválido.';
                }
                window.showAlert(errorMessage, 'error');
            }

            // window.showAlert('Intento de inicio de sesión. (Funcionalidad de Firebase Authentication pendiente)', 'info');
            // loginForm.reset(); // Opcional: limpiar el formulario después del intento
        });
    }

    if (registerLink) {
        registerLink.addEventListener('click', (event) => {
            event.preventDefault();
            console.log('Redirigiendo a la página de registro.');
            window.location.href = 'registro.html'; // Redirige a la página de registro
        });
    }
});
