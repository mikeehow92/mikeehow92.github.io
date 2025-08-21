// js/login.js

// Importa las funciones necesarias de Firebase Auth al inicio del módulo
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

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
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');

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
    
    // Nuevo manejador para el enlace "Olvidaste tu contraseña?"
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (event) => {
            event.preventDefault(); // Evita que la página se recargue

            // Solicita el correo electrónico al usuario antes de enviar el enlace de restablecimiento
            const email = prompt("Por favor, ingresa tu correo electrónico para restablecer la contraseña:");

            if (email) {
                try {
                    const auth = window.firebaseAuth; // Asumiendo que auth se exporta desde common.js

                    if (!auth) {
                        console.error("Firebase Auth no está inicializado.");
                        window.showAlert("Error: No se pudo conectar con el servicio de autenticación.", "error");
                        return;
                    }

                    // Envía el correo de restablecimiento de contraseña
                    await sendPasswordResetEmail(auth, email);

                    // Muestra una alerta de éxito
                    window.showAlert("Se ha enviado un correo electrónico para restablecer tu contraseña. Revisa tu bandeja de entrada.", "success");
                    console.log("Correo de restablecimiento enviado a:", email);
                } catch (error) {
                    console.error("Error al enviar el correo de restablecimiento:", error.message);
                    let errorMessage = "Ocurrió un error al intentar enviar el correo. Por favor, inténtalo de nuevo.";
                    if (error.code === 'auth/invalid-email') {
                        errorMessage = 'El formato del correo electrónico es inválido.';
                    } else if (error.code === 'auth/user-not-found') {
                        errorMessage = 'No se encontró ningún usuario con ese correo electrónico.';
                    }
                    window.showAlert(errorMessage, "error");
                }
            } else {
                window.showAlert("El restablecimiento de contraseña fue cancelado.", "info");
            }
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
