// assets/js/registro.js
import { auth, db } from './firebase-config.js'; // Importar auth y db (para guardar datos de usuario en Firestore)
import { AuthService } from './auth.js';
import { showFeedback, showLoading } from './feedback.js';
import { setDoc, doc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js'; // Importar serverTimestamp


document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const sendVerificationBtn = document.getElementById('send-verification-btn');
    const verificationStatus = document.getElementById('verification-status');

    if (!registerForm) {
        console.error("Formulario de registro no encontrado en registro.html.");
        return;
    }

    // Envío del formulario de registro
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading(true);
        const email = registerForm['email'].value;
        const password = registerForm['password'].value;
        const confirmPassword = registerForm['confirm-password'].value;
        const displayName = registerForm['displayName'].value; // Asumiendo un campo de nombre para mostrar

        if (password !== confirmPassword) {
            showFeedback('Error de Registro', 'Las contraseñas no coinciden.', 'error');
            showLoading(false);
            return;
        }

        try {
            const userCredential = await AuthService.register(email, password);
            const user = userCredential.user;

            // Actualizar perfil de usuario con el nombre para mostrar
            await AuthService.updateUserProfile(user, { displayName: displayName });

            // Guardar datos del usuario en Firestore (opcional, pero buena práctica para información de perfil)
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                displayName: displayName,
                createdAt: serverTimestamp()
            });

            // Enviar verificación de correo electrónico
            await AuthService.sendEmailVerification(user);

            showFeedback('Registro Exitoso', '¡Tu cuenta ha sido creada! Se ha enviado un correo de verificación. Por favor, revisa tu bandeja de entrada.', 'success');
            // Redirigir a una página de verificación pendiente o al índice
            // window.location.href = 'index.html';

        } catch (error) {
            console.error("Error al registrar:", error);
            let errorMessage = 'Error al registrar usuario.';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'El email ya está en uso.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'El formato del email es inválido.';
            }
            showFeedback('Error de Registro', errorMessage, 'error');
        } finally {
            showLoading(false);
        }
    });

    // Botón reenviar correo de verificación
    if (sendVerificationBtn) {
        sendVerificationBtn.addEventListener('click', async () => {
            showLoading(true);
            try {
                const user = auth.currentUser;
                if (user) {
                    await AuthService.sendEmailVerification(user);
                    verificationStatus.textContent = '¡Correo de verificación reenviado!';
                    verificationStatus.style.color = '#27ae60';
                    showFeedback('Correo Reenviado', 'Se ha reenviado el correo de verificación.', 'info');
                } else {
                    showFeedback('Error', 'No hay usuario autenticado para reenviar verificación.', 'error');
                }
            } catch (error) {
                console.error("Error reenviando verificación:", error);
                verificationStatus.textContent = 'Error: ' + error.message;
                verificationStatus.style.color = '#e74c3c';
                showFeedback('Error', 'No se pudo reenviar el correo de verificación: ' + error.message, 'error');
            } finally {
                showLoading(false);
            }
        });
    }

    // Verificar si el usuario ya está verificado al cargar la página y redirigir
    auth.onAuthStateChanged((user) => {
        if (user && user.emailVerified) {
            // Redirige a la página principal o a perfil.html si ya está logueado y verificado
            window.location.href = 'index.html';
        }
    });
});
