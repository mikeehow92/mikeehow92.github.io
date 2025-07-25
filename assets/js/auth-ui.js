// assets/js/auth-ui.js
import { AuthService } from './auth.js';
import { showFeedback, showLoading } from './feedback.js';
import { auth } from './firebase-config.js'; // Necesario para el listener onAuthStateChanged

export const AuthUI = {
    init: () => {
        const loginModal = document.getElementById('login-modal');
        const openLoginBtn = document.getElementById('open-login-btn');
        const closeLoginBtn = loginModal ? loginModal.querySelector('.close-button') : null;
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const resetForm = document.getElementById('reset-form');
        const switchToRegisterBtn = document.getElementById('switch-to-register');
        const switchToLoginFromRegisterBtn = document.getElementById('switch-to-login-from-register');
        const switchToResetBtn = document.getElementById('switch-to-reset');
        const switchToLoginFromResetBtn = document.getElementById('switch-to-login-from-reset');
        const loginSection = document.getElementById('login-section');
        const registerSection = document.getElementById('register-section');
        const resetSection = document.getElementById('reset-password-section');
        const logoutBtn = document.getElementById('logout-btn'); // Asumiendo un botón de cerrar sesión en la página misma

        // Mostrar modal de inicio de sesión
        if (openLoginBtn) {
            openLoginBtn.addEventListener('click', () => {
                if (loginModal) {
                    loginModal.classList.add('active');
                    loginSection.style.display = 'block';
                    registerSection.style.display = 'none';
                    resetSection.style.display = 'none';
                }
            });
        }

        // Cerrar modal de inicio de sesión
        if (closeLoginBtn) {
            closeLoginBtn.addEventListener('click', () => {
                if (loginModal) loginModal.classList.remove('active');
            });
        }

        // Cambiar entre formularios
        if (switchToRegisterBtn) {
            switchToRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                loginSection.style.display = 'none';
                registerSection.style.display = 'block';
            });
        }

        if (switchToLoginFromRegisterBtn) {
            switchToLoginFromRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                registerSection.style.display = 'none';
                loginSection.style.display = 'block';
            });
        }

        if (switchToResetBtn) {
            switchToResetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                loginSection.style.display = 'none';
                resetSection.style.display = 'block';
            });
        }

        if (switchToLoginFromResetBtn) {
            switchToLoginFromResetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                resetSection.style.display = 'none';
                loginSection.style.display = 'block';
            });
        }

        // Envío del formulario de inicio de sesión
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                showLoading(true);
                const email = loginForm['login-email'].value;
                const password = loginForm['login-password'].value;

                try {
                    await AuthService.login(email, password);
                    showFeedback('Inicio de Sesión Exitoso', '¡Bienvenido de nuevo!', 'success');
                    if (loginModal) loginModal.classList.remove('active');
                } catch (error) {
                    console.error("Error al iniciar sesión:", error);
                    let errorMessage = 'Error al iniciar sesión. Por favor, verifica tus credenciales.';
                    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                        errorMessage = 'Email o contraseña incorrectos.';
                    } else if (error.code === 'auth/invalid-email') {
                        errorMessage = 'El formato del email es inválido.';
                    }
                    showFeedback('Error de Inicio de Sesión', errorMessage, 'error');
                } finally {
                    showLoading(false);
                }
            });
        }

        // Envío del formulario de registro
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                showLoading(true);
                const email = registerForm['register-email'].value;
                const password = registerForm['register-password'].value;

                try {
                    await AuthService.register(email, password);
                    showFeedback('Registro Exitoso', '¡Tu cuenta ha sido creada! Por favor, verifica tu correo electrónico.', 'success');
                    if (loginModal) loginModal.classList.remove('active');
                } catch (error) {
                    console.error("Error al registrar:", error);
                    let errorMessage = 'Error al registrar usuario.';
                    if (error.code === 'auth/email-already-in-use') {
                        errorMessage = 'El email ya está en uso.';
                    } else if (error.code === 'auth/weak-password') {
                        errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
                    }
                    showFeedback('Error de Registro', errorMessage, 'error');
                } finally {
                    showLoading(false);
                }
            });
        }

        // Envío del formulario de restablecimiento de contraseña
        if (resetForm) {
            resetForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                showLoading(true);
                const email = resetForm['reset-email'].value;

                try {
                    await AuthService.sendPasswordReset(email);
                    showFeedback('Restablecimiento de Contraseña', 'Se ha enviado un enlace para restablecer tu contraseña a tu email.', 'success');
                    if (loginModal) loginModal.classList.remove('active');
                } catch (error) {
                    console.error("Error al restablecer contraseña:", error);
                    showFeedback('Error', 'No se pudo enviar el enlace de restablecimiento. Verifica el email.', 'error');
                } finally {
                    showLoading(false);
                }
            });
        }

        // Botón de cerrar sesión
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                showLoading(true);
                try {
                    await AuthService.logout();
                    showFeedback('Sesión Cerrada', 'Has cerrado sesión correctamente.', 'success');
                    // Redirigir o actualizar UI
                    window.location.href = 'index.html'; // O simplemente ocultar elementos de autenticación
                } catch (error) {
                    console.error("Error al cerrar sesión:", error);
                    showFeedback('Error', 'No se pudo cerrar la sesión.', 'error');
                } finally {
                    showLoading(false);
                }
            });
        }
    }
};
