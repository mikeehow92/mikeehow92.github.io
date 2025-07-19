// js/registro.js

// Importa las funciones necesarias de Firebase Auth y Firestore
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // Elementos del encabezado para el estado de autenticación
    const loginButton = document.getElementById('loginButton');
    const loggedInUserDisplay = document.getElementById('loggedInUserDisplay');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const logoutButton = document.getElementById('logoutButton');
    const navCarrito = document.getElementById('navCarrito');
    // const navPerfil = document.getElementById('navPerfil'); // Se comenta o elimina ya que el elemento se quitará del HTML
    const cartItemCountElement = document.getElementById('cartItemCount'); // Obtener el elemento del contador de ítems del carrito

    // --- Asegurar que el enlace del Carrito siempre sea visible ---
    // Esta función se moverá a common.js para ser global, pero la dejamos aquí por si acaso
    // para páginas que no usen common.js (aunque en este proyecto todas lo usan).
    // Si common.js ya tiene esta función, esta parte puede ser redundante.
    function updateCartCountDisplay() {
        const cart = window.getCart(); // Obtiene el carrito desde common.js
        const totalItemsInCart = cart.reduce((total, item) => total + item.quantity, 0);
        if (cartItemCountElement) {
            cartItemCountElement.textContent = totalItemsInCart;
            if (totalItemsInCart > 0) {
                cartItemCountElement.classList.remove('hidden'); // Muestra el contador si hay ítems
            } else {
                cartItemCountElement.classList.add('hidden'); // Oculta el contador si no hay ítems
            }
        }
        if (navCarrito) {
            navCarrito.classList.remove('hidden'); // Asegura que el enlace del carrito sea visible
        }
    }
    // Llama a la función para actualizar el contador al cargar la página
    updateCartCountDisplay();


    // Manejo del estado de autenticación en el encabezado
    if (window.firebaseAuth) {
        window.firebaseAuth.onAuthStateChanged((user) => {
            if (user) {
                // Usuario logueado
                loginButton.classList.add('hidden');
                loggedInUserDisplay.classList.remove('hidden');
                userNameDisplay.textContent = user.displayName || user.email || 'Tu Usuario';
                // navPerfil.classList.remove('hidden'); // Se comenta o elimina ya que el elemento se quitará del HTML
            } else {
                // Usuario no logueado
                loginButton.classList.remove('hidden');
                loggedInUserDisplay.classList.add('hidden');
                // navPerfil.classList.add('hidden'); // Se comenta o elimina ya que el elemento se quitará del HTML
            }
            updateCartCountDisplay(); // Actualiza el contador del carrito al cambiar el estado de autenticación
        });
    } else {
        console.warn("Firebase Auth no está inicializado. La funcionalidad de autenticación en el encabezado no estará disponible.");
        // navPerfil.classList.add('hidden'); // Se comenta o elimina ya que el elemento se quitará del HTML
        updateCartCountDisplay(); // Actualiza el contador del carrito incluso sin autenticación
    }

    // Manejo del botón "Iniciar Sesión" en el encabezado
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            console.log('Botón "Iniciar Sesión" clickeado en registro. Redirigiendo a login.html...');
            window.location.href = 'login.html';
        });
    }

    // Manejo del botón "Cerrar Sesión" en el encabezado
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            if (window.firebaseAuth) {
                try {
                    await window.firebaseAuth.signOut();
                    window.showAlert('Has cerrado sesión correctamente.', 'success');
                    // onAuthStateChanged manejará la UI
                } catch (error) {
                    console.error('Error al cerrar sesión:', error.message);
                    window.showAlert('Error al cerrar sesión. Por favor, inténtalo de nuevo.', 'error');
                }
            } else {
                window.showAlert('Firebase Auth no está disponible para cerrar sesión.', 'error');
            }
        });
    }

    // --- Lógica del Formulario de Registro ---
    const registerForm = document.getElementById('registerForm');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const departmentSelect = document.getElementById('department');
    const municipalitySelect = document.getElementById('municipality');
    const addressInput = document.getElementById('address');
    const acceptTermsCheckbox = document.getElementById('acceptTerms'); // Nuevo: Checkbox de términos
    const createAccountButton = document.getElementById('createAccountButton'); // Nuevo: Botón de crear cuenta
    const openTermsModalLink = document.getElementById('openTermsModal'); // Nuevo: Enlace para abrir modal
    const termsModal = document.getElementById('termsModal'); // Nuevo: Modal de términos
    const closeTermsModalButton = document.getElementById('closeTermsModal'); // Nuevo: Botón cerrar modal
    const agreeAndCloseTermsButton = document.getElementById('agreeAndCloseTerms'); // Nuevo: Botón Aceptar y Cerrar

    // Datos de Departamentos y Municipios de El Salvador (ejemplo)
    const departmentsAndMunicipalities = {
        "Ahuachapán": ["Ahuachapán", "Apaneca", "Atiquizaya", "Concepción de Ataco", "El Refugio", "Jujutla", "San Francisco Menéndez", "San Lorenzo", "San Pedro Puxtla", "Tacuba", "Turín"],
        "Cabañas": ["Cinquera", "Dolores", "Guacotecti", "Ilobasco", "Sensuntepeque", "Tejutepeque", "Victoria"],
        "Chalatenango": ["Agua Caliente", "Arcatao", "Azacualpa", "Cancasque", "Chalatenango", "Chesal", "Citalá", "Comalapa", "Concepción Quezaltepeque", "Dulce Nombre de María", "El Carrizal", "El Paraíso", "La Laguna", "La Palma", "La Reina", "Las Vueltas", "Nombre de Jesús", "Nueva Concepción", "Nueva Trinidad", "Ojos de Agua", "Potonico", "San Antonio de la Cruz", "San Antonio Los Ranchos", "San Fernando", "San Francisco Lempa", "San Ignacio", "San Isidro Labrador", "San Luis del Carmen", "San Miguel de Mercedes", "San Rafael", "Santa Rita", "Tejutla"],
        "Cuscatlán": ["Cojutepeque", "Candelaria", "El Carmen", "El Rosario", "Monte San Juan", "Oratorio de Concepción", "San Bartolomé Perulapía", "San Cristóbal", "San José Guayabal", "San Pedro Perulapán", "San Rafael Cedros", "San Ramón", "Santa Cruz Analquito", "Santa Cruz Michapa", "Suchitoto", "Tenancingo"],
        "La Libertad": ["Antiguo Cuscatlán", "Chiltiupán", "Ciudad Arce", "Colón", "Comasagua", "Huizúcar", "Jayaque", "Jicalapa", "La Libertad", "Santa Tecla", "Nuevo Cuscatlán", "Quezaltepeque", "Sacacoyo", "San Juan Opico", "San Matías", "San Pablo Tacachico", "Talnique", "Tamanique", "Teotepeque", "Tepecoyo", "Zaragoza"],
        "La Paz": ["Cuyultitán", "El Rosario", "Jerusalén", "Mercedes La Ceiba", "Olocuilta", "Paraíso de Osorio", "San Antonio Masahuat", "San Emigdio", "San Francisco Chinameca", "San Juan Nonualco", "San Juan Talpa", "San Juan Tepezontes", "San Luis La Herradura", "San Luis Talpa", "San Miguel Tepezontes", "San Pedro Masahuat", "San Pedro Nonualco", "San Rafael Obrajuelo", "Santa María Ostuma", "Santiago Nonualco", "Tapalhuaca", "Zacatecoluca"],
        "La Unión": ["Anamorós", "Bolívar", "Concepción de Oriente", "Conchagua", "El Carmen", "El Sauce", "Intipucá", "La Unión", "Lislique", "Meanguera del Golfo", "Nueva Esparta", "Pasaquina", "Polorós", "San Alejo", "San José", "Santa Rosa de Lima", "Yayantique", "Yucuaiquín"],
        "Morazán": ["Arambala", "Cacaopera", "Chilanga", "Corinto", "Delicias de Concepción", "El Divisadero", "El Rosario", "Gualococti", "Guatajiagua", "Joateca", "Jocoro", "Lolotique", "Meanguera", "Osicala", "Perquín", "San Fernando", "San Isidro", "San Simón", "Sensembra", "Sociedad", "Torola", "Yamabal", "Yoloaiquín"],
        "San Miguel": ["Carolina", "Chapeltique", "Chinameca", "Chirilagua", "Ciudad Barrios", "Comacarán", "El Tránsito", "Lolotique", "Moncagua", "Nueva Guadalupe", "Quelepa", "San Antonio del Mosco", "San Gerardo", "San Jorge", "San Luis de la Reina", "San Miguel", "San Rafael Oriente", "Sesori", "Uluazapa"],
        "San Salvador": ["Aguilares", "Apopa", "Ayutuxtepeque", "Cuscatancingo", "Delgado", "El Paisnal", "Guazapa", "Ilopango", "Mejicanos", "Nejapa", "Panchimalco", "Rosario de Mora", "San Marcos", "San Martín", "San Salvador", "Soyapango", "Santo Tomás", "Tonacatepeque"],
        "San Vicente": ["Apastepeque", "Guadalupe", "San Cayetano Istepeque", "San Esteban Catarina", "San Ildefonso", "San Lorenzo", "San Sebastián", "San Simón", "Sensembra", "Sociedad", "Torola", "Yamabal", "Yoloaiquín", "San Vicente", "Santa Clara", "Santo Domingo", "Tecoluca", "Tepetitán", "Verapaz"],
        "Santa Ana": ["Candelaria de la Frontera", "Chalchuapa", "Coatepeque", "El Congo", "El Porvenir", "Masahuat", "Metapán", "Santa Ana", "Santa Rosa Guachipilín", "Santiago de la Frontera", "Texistepeque"],
        "Sonsonate": ["Acajutla", "Armenia", "Caluco", "Cuisnahuat", "Izalco", "Juayúa", "Nahualingo", "Nahulingo", "Salcoatitán", "San Antonio del Monte", "San Julián", "Santa Catarina Masahuat", "Santa Isabel Ishuatán", "Santo Domingo de Guzmán", "Sonsonate", "Sonzacate"],
        "Usulután": ["Alegría", "Berlín", "California", "Concepción Batres", "El Triunfo", "Ereguayquín", "Estanzuelas", "Jiquilisco", "Jucuapa", "Jucuarán", "Mercedes Umaña", "Nueva Granada", "Ozatlán", "Puerto El Triunfo", "San Agustín", "San Buenaventura", "San Dionisio", "San Francisco Javier", "Santa Elena", "Santa María", "Santiago de María", "Tecapán", "Usulután"]
    };

    // Función para cargar departamentos
    function loadDepartments() {
        for (const dept in departmentsAndMunicipalities) {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            departmentSelect.appendChild(option);
        }
    }

    // Función para cargar municipios basado en el departamento seleccionado
    function loadMunicipalities(department) {
        municipalitySelect.innerHTML = '<option value="">Seleccione un municipio</option>'; // Limpiar y añadir opción por defecto
        municipalitySelect.disabled = true; // Deshabilitar hasta que se seleccione un depto

        if (department && departmentsAndMunicipalities[department]) {
            departmentsAndMunicipalities[department].forEach(muni => {
                const option = document.createElement('option');
                option.value = muni;
                option.textContent = muni;
                municipalitySelect.appendChild(option);
            });
            municipalitySelect.disabled = false; // Habilitar select de municipios
        } else {
            municipalitySelect.innerHTML = '<option value="">Primero seleccione un departamento</option>';
        }
    }

    // Event listener para el cambio de departamento
    departmentSelect.addEventListener('change', (event) => {
        loadMunicipalities(event.target.value);
    });

    // Cargar departamentos al inicio
    loadDepartments();
    loadMunicipalities(departmentSelect.value); // Cargar municipios iniciales (vacío)

    // --- Lógica para el checkbox de Términos y Condiciones y el botón de crear cuenta ---
    acceptTermsCheckbox.addEventListener('change', () => {
        createAccountButton.disabled = !acceptTermsCheckbox.checked;
    });

    // --- Lógica para el Modal de Términos y Condiciones ---
    if (openTermsModalLink) {
        openTermsModalLink.addEventListener('click', (e) => {
            e.preventDefault();
            termsModal.classList.remove('hidden');
        });
    }

    if (closeTermsModalButton) {
        closeTermsModalButton.addEventListener('click', () => {
            termsModal.classList.add('hidden');
        });
    }

    if (agreeAndCloseTermsButton) {
        agreeAndCloseTermsButton.addEventListener('click', () => {
            acceptTermsCheckbox.checked = true; // Marcar el checkbox al aceptar
            createAccountButton.disabled = false; // Habilitar el botón
            termsModal.classList.add('hidden'); // Cerrar el modal
        });
    }

    // Cerrar modal al hacer clic fuera de él
    if (termsModal) {
        termsModal.addEventListener('click', (event) => {
            if (event.target === termsModal) {
                termsModal.classList.add('hidden');
            }
        });
    }

    // Manejo del envío del formulario de registro
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Previene el envío por defecto del formulario

        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const department = departmentSelect.value;
        const municipality = municipalitySelect.value;
        const address = addressInput.value.trim();

        // Validaciones
        if (password !== confirmPassword) {
            window.showAlert('Las contraseñas no coinciden.', 'error');
            return;
        }
        if (password.length < 6) {
            window.showAlert('La contraseña debe tener al menos 6 caracteres.', 'error');
            return;
        }
        if (!department) {
            window.showAlert('Por favor, selecciona un departamento.', 'error');
            return;
        }
        if (!municipality) {
            window.showAlert('Por favor, selecciona un municipio.', 'error');
            return;
        }
        if (!acceptTermsCheckbox.checked) { // Nueva validación: checkbox de términos
            window.showAlert('Debes aceptar los Términos y Condiciones para crear una cuenta.', 'error');
            return;
        }

        // Asegúrate de que Firebase Auth y Firestore estén inicializados en common.js
        const auth = window.firebaseAuth;
        const db = window.firebaseDb;

        if (!auth || !db) {
            window.showAlert('Error: Firebase no está inicializado. No se puede registrar al usuario.', 'error');
            console.error('Firebase Auth o Firestore no inicializado.');
            return;
        }

        try {
            // 1. Registrar usuario con Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Actualizar el perfil del usuario (nombre de visualización)
            await updateProfile(user, {
                displayName: fullName
            });

            // 3. Guardar información adicional del usuario en Firestore
            // Usamos el UID del usuario como ID del documento para el perfil
            await setDoc(doc(db, "users", user.uid), {
                fullName: fullName,
                email: email,
                phone: phone,
                department: department,
                municipality: municipality,
                address: address,
                createdAt: new Date() // O admin.firestore.FieldValue.serverTimestamp() si estás en una Cloud Function
            });

            window.showAlert('¡Registro exitoso! Ahora puedes iniciar sesión.', 'success');
            registerForm.reset(); // Limpiar el formulario
            loadMunicipalities(''); // Resetear municipios
            acceptTermsCheckbox.checked = false; // Desmarcar checkbox
            createAccountButton.disabled = true; // Deshabilitar botón
            window.location.href = 'login.html'; // Redirigir a la página de inicio de sesión

        } catch (error) {
            console.error('Error durante el registro:', error.code, error.message);
            let errorMessage = 'Error al registrar usuario. Por favor, inténtalo de nuevo.';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'El correo electrónico ya está en uso. Por favor, usa otro o inicia sesión.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'El formato del correo electrónico no es válido.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'La contraseña es demasiado débil (mínimo 6 caracteres).';
            }
            window.showAlert(errorMessage, 'error');
        }
    });
});
