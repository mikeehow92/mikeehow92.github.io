// js/pago.js

// ==========================================================================================================================
// 1. IMPORTACIONES DE MÓDULOS DE FIREBASE
// ==========================================================================================================================
// Importa las funciones necesarias de Firebase Auth, Firestore y Storage
// Se utilizan URLs de CDN para que el código sea completamente autocontenido en el contexto del navegador.
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; // Importar getDoc

// ==========================================================================================================================
// 2. DATOS GEOGRÁFICOS DE EL SALVADOR
// ==========================================================================================================================
// Objeto que contiene los datos de Departamentos y Municipios de El Salvador.
// Esta información se utiliza para poblar dinámicamente los selectores del formulario de envío.
const departmentsAndMunicipalities = {
    "Ahuachapán": ["Ahuachapán", "Apaneca", "Atiquizaya", "Concepción de Ataco", "El Refugio", "Jujutla", "San Francisco Menéndez", "San Lorenzo", "San Pedro Puxtla", "Tacuba", "Turín"],
    "Cabañas": ["Cinquera", "Dolores", "Guacotecti", "Ilobasco", "Sensuntepeque", "Tejutepeque", "Victoria"],
    "Chalatenango": ["Agua Caliente", "Arcatao", "Azacualpa", "Cancasque", "Chalatenango", "Chesal", "Citalá", "Comalapa", "Concepción Quezaltepeque", "Dulce Nombre de María", "El Carrizal", "El Paraíso", "La Laguna", "La Palma", "La Reina", "Las Vueltas", "Nombre de Jesús", "Nueva Concepción", "Nueva Trinidad", "Ojos de Agua", "Potonico", "San Antonio de la Cruz", "San Antonio Los Ranchos", "San Fernando", "San Ignacio", "San Isidro Labrador", "San Luis del Carmen", "San Miguel de Mercedes", "San Rafael", "Santa Rita", "Tejutla"],
    "Cuscatlán": ["Cojutepeque", "Candelaria", "El Carmen", "El Rosario", "Monte San Juan", "Oratorio de Concepción", "San Bartolomé Perulapía", "San Cristóbal", "San José Guayabal", "San Pedro Perulapán", "San Rafael Cedros", "San Ramón", "Santa Cruz Analquito", "Santa Cruz Michapa", "Suchitoto", "Tenancingo"],
    "La Libertad": ["Antiguo Cuscatlán", "Chiltiupán", "Ciudad Arce", "Colón", "Comasagua", "Huizúcar", "Jayaque", "Jicalapa", "La Libertad", "Santa Tecla", "Nuevo Cuscatlán", "Quezaltepeque", "Sacacoyo", "San Juan Opico", "San Matías", "San Pablo Tacachico", "Talnique", "Tamanique", "Teotepeque", "Tepecoyo", "Zaragoza"],
    "La Paz": ["Cuyultitán", "El Rosario", "Jerusalén", "Mercedes La Ceiba", "Olocuilta", "Paraíso de Osorio", "San Antonio Masahuat", "San Emigdio", "San Francisco Chinameca", "San Juan Nonualco", "San Juan Talpa", "San Juan Tepezontes", "San Luis La Herradura", "San Luis Talpa", "San Miguel Tepezontes", "San Pedro Masahuat", "San Pedro Nonualco", "San Rafael Obrajuelo", "Santa María Ostuma", "Santiago Nonualco", "Tapalhuaca", "Zacatecoluca"],
    "La Unión": ["Anamorós", "Bolívar", "Concepción de Oriente", "Conchagua", "El Carmen", "El Sauce", "Intipucá", "La Unión", "Lislique", "Meanguera del Golfo", "Nueva Esparta", "Pasaquina", "Polorós", "San Alejo", "San José", "Santa Rosa de Lima", "Yayantique", "Yucuaiquín"],
    "Morazán": ["Arambala", "Cacaopera", "Chilanga", "Corinto", "Delicias de Concepción", "El Divisadero", "El Rosario", "Gualococti", "Guatajiagua", "Joateca", "Jocoro", "Lolotique", "Meanguera", "Osicala", "Perquín", "San Fernando", "San Isidro", "San Simón", "Sensembra", "Sociedad", "Torola", "Yamabal", "Yoloaiquín"],
    "San Miguel": ["Carolina", "Chapeltique", "Chinameca", "Chirilagua", "Ciudad Barrios", "Comacarán", "El Tránsito", "Lolotique", "Moncagua", "Nueva Guadalupe", "Quelepa", "San Antonio del Mosco", "San Gerardo", "San Jorge", "San Luis de la Reina", "San Miguel", "San Rafael Oriente", "Sesori", "Uluazapa"],
    "San Salvador": ["Aguilares", "Apopa", "Ayutuxtepeque", "Cuscatancingo", "Delgado", "El Paisnal", "Guazapa", "Ilopango", "Mejicanos", "Nejapa", "Panchimalco", "Rosario de Mora", "San Marcos", "San Martín", "San Salvador", "Soyapango", "Santo Tomás", "Tonacatepeque"],
    "San Vicente": ["Apastepeque", "Guadalupe", "San Cayetano Istepeque", "San Esteban Catarina", "San Ildefonso", "San Lorenzo", "San Sebastián", "San Simón", "Sensembra", "Sociedad", "Torola", "Yamabal", "Yoloaiquín"],
    "Santa Ana": ["Candelaria de la Frontera", "Chalchuapa", "Coatepeque", "El Congo", "El Porvenir", "Masahuat", "Metapán", "Santa Ana", "Santa Rosa Guachipilín", "Santiago de la Frontera", "Texistepeque"],
    "Sonsonate": ["Acajutla", "Armenia", "Caluco", "Cuisnahuat", "Izalco", "Juayúa", "Nahualingo", "Nahulingo", "Salcoatitán", "San Antonio del Monte", "San Julián", "Santa Catarina Masahuat", "Santa Isabel Ishuatán", "Santo Domingo de Guzmán", "Sonsonate", "Sonzacate"],
    "Usulután": ["Alegría", "Berlín", "California", "Concepción Batres", "El Triunfo", "Ereguayquín", "Estanzuelas", "Jiquilisco", "Jucuapa", "Jucuarán", "Mercedes Umaña", "Nueva Granada", "Ozatlán", "Puerto El Triunfo", "San Agustín", "San Buenaventura", "San Dionisio", "San Francisco Javier", "Santa Elena", "Santa María", "Santiago de María", "Tecapán", "Usulután"]
};

// ==========================================================================================================================
// 3. DECLARACIÓN DE VARIABLES GLOBALES
// ==========================================================================================================================
// Estas variables se declaran aquí para que puedan ser accesibles en todo el archivo.
// Sus valores se asignarán una vez que el DOM esté completamente cargado.
let shippingForm;
let shippingFullNameInput;
let shippingEmailInput;
let shippingPhoneInput;
let shippingDepartmentSelect;
let shippingMunicipalitySelect;
let shippingAddressInput;
let paypalButtonContainer;
let validationMessageDiv; // Para el mensaje de validación de PayPal

// ==========================================================================================================================
// 4. FUNCIONES PRINCIPALES
// ==========================================================================================================================

/**
 * @function renderPayPalButtons
 * @description Esta función es la encargada de inicializar y renderizar los botones de PayPal.
 * Se ejecuta una vez que el SDK de PayPal se ha cargado dinámicamente y el carrito no está vacío.
 * También contiene la lógica para validar el formulario de envío antes de permitir la creación de una orden.
 */
function renderPayPalButtons() {
    console.log('renderPayPalButtons: Función iniciada.');
    const cart = window.getCart();

    // ----------------------------------------------------------------------
    // a. Verificación del contenedor y del carrito
    // ----------------------------------------------------------------------
    // Se verifica si el contenedor para los botones existe en la página.
    if (!paypalButtonContainer) {
        console.error('renderPayPalButtons: Contenedor #paypal-button-container no encontrado. Asegúrate de que pago.html tenga este ID.');
        return;
    }
    // Si el carrito está vacío, no se renderizan los botones de PayPal.
    if (cart.length === 0) {
        console.log('renderPayPalButtons: Carrito vacío, no se renderizan los botones de PayPal.');
        paypalButtonContainer.innerHTML = ''; // Limpia el contenedor para mayor seguridad.
        return;
    }

    // ----------------------------------------------------------------------
    // b. Preparación del contenedor
    // ----------------------------------------------------------------------
    // Se limpia el contenedor antes de renderizar para evitar duplicados en caso de que la función se llame múltiples veces.
    paypalButtonContainer.innerHTML = '';

    // Crea un div secundario dentro del contenedor principal.
    const buttonsDiv = document.createElement('div');
    buttonsDiv.id = 'paypal-buttons-actual';
    paypalButtonContainer.appendChild(buttonsDiv);

    // Crea o actualiza el div para mostrar un mensaje de validación del formulario de envío.
    if (!validationMessageDiv) {
        validationMessageDiv = document.createElement('p');
        validationMessageDiv.id = 'paypal-validation-message';
        validationMessageDiv.className = 'text-red-500 text-sm mt-2 text-center';
        paypalButtonContainer.appendChild(validationMessageDiv);
    } else {
        // Si el div ya existe, se asegura de que esté en el contenedor correcto.
        if (!paypalButtonContainer.contains(validationMessageDiv)) {
            paypalButtonContainer.appendChild(validationMessageDiv);
        }
    }

    // ----------------------------------------------------------------------
    // c. Verificación del SDK de PayPal
    // ----------------------------------------------------------------------
    // Se verifica que el objeto `paypal` esté disponible globalmente.
    if (typeof paypal === 'undefined') {
        console.error('renderPayPalButtons: Objeto "paypal" no definido. El SDK de PayPal no se ha cargado correctamente.');
        validationMessageDiv.textContent = 'Error: El servicio de pago no está disponible. Por favor, recarga la página o inténtalo más tarde.';
        validationMessageDiv.classList.remove('hidden');
        return;
    } else {
        console.log('renderPayPalButtons: Objeto "paypal" detectado, intentando renderizar botones.');
    }

    // ----------------------------------------------------------------------
    // d. Renderizado de los botones de PayPal
    // ----------------------------------------------------------------------
    paypal.Buttons({
        /**
         * @function createOrder
         * @description Se activa cuando el usuario hace clic en el botón de PayPal.
         * Es la primera etapa del flujo de pago.
         * @param {object} data - Datos de la transacción de PayPal.
         * @param {object} actions - Acciones disponibles para la creación de la orden.
         * @returns {Promise} - Una promesa que resuelve con la ID de la orden de PayPal.
         */
        createOrder: function(data, actions) {
            // Se valida el formulario de envío.
            if (!shippingForm || !shippingForm.checkValidity()) {
                // Si el formulario es inválido, muestra un mensaje de error y detiene la creación de la orden.
                validationMessageDiv.textContent = 'Por favor, completa todos los detalles de envío para continuar.';
                validationMessageDiv.classList.remove('hidden');
                throw new Error('Formulario de envío incompleto o inválido.');
            } else {
                // Si el formulario es válido, oculta cualquier mensaje de validación previo.
                validationMessageDiv.classList.add('hidden');
            }

            // Obtiene el total del carrito y los ítems.
            const total = window.getCartTotal();
            const items = cart.map(item => ({
                name: item.name,
                quantity: item.quantity,
                unit_amount: {
                    currency_code: 'USD',
                    value: item.price.toFixed(2)
                }
            }));

            // Crea la orden de PayPal.
            return actions.order.create({
                purchase_units: [{
                    amount: {
                        currency_code: 'USD',
                        value: total.toFixed(2),
                        breakdown: {
                            item_total: {
                                currency_code: 'USD',
                                value: total.toFixed(2)
                            }
                        }
                    },
                    items: items
                }]
            });
        },

        /**
         * @function onApprove
         * @description Se activa cuando el usuario ha aprobado el pago en la ventana de PayPal.
         * Aquí se captura la orden y se procesa el pedido en el backend (Cloud Function).
         * @param {object} data - Datos de la transacción aprobada.
         * @param {object} actions - Acciones disponibles para la captura de la orden.
         * @returns {Promise} - Una promesa que resuelve cuando la orden ha sido capturada.
         */
        onApprove: function(data, actions) {
            // Captura la orden una vez que el usuario ha aprobado el pago.
            return actions.order.capture().then(function(details) {
                console.log('Pago completado por ' + details.payer.name.given_name, details);
                window.showAlert('¡Pago completado con éxito! Procesando tu pedido...', 'success');

                // ----------------------------------------------------------------------
                // i. Recopilación de detalles de envío
                // ----------------------------------------------------------------------
                // Se recopilan los detalles de envío del formulario local.
                const shippingFullName = shippingFullNameInput ? shippingFullNameInput.value : '';
                const shippingEmail = shippingEmailInput ? shippingEmailInput.value : '';
                const shippingPhone = shippingPhoneInput ? shippingPhoneInput.value : '';
                const shippingDepartment = shippingDepartmentSelect ? shippingDepartmentSelect.value : '';
                const shippingMunicipality = shippingMunicipalitySelect ? shippingMunicipalitySelect.value : '';
                const shippingAddress = shippingAddressInput ? shippingAddressInput.value : '';

                const cloudFunctionUrl = 'https://us-central1-mitienda-c2609.cloudfunctions.net/updateInventoryAndSaveOrder';

                // ----------------------------------------------------------------------
                // ii. CORRECCIÓN CLAVE: Generación de una ID de orden única
                // ----------------------------------------------------------------------
                // Se genera una ID de orden única usando `crypto.randomUUID()`.
                // Esto es crucial para asegurar la consistencia entre la transacción y la base de datos.
                const orderId = `order_${crypto.randomUUID()}`;

                // ----------------------------------------------------------------------
                // iii. Estructura de los detalles del pedido
                // ----------------------------------------------------------------------
                // Se crea un objeto `orderDetails` que contiene todos los datos relevantes del pedido.
                const orderDetails = {
                    orderId: orderId,
                    paypalTransactionId: details.id,
                    paymentStatus: details.status,
                    payerId: details.payer.payer_id,
                    payerEmail: shippingEmail,
                    total: parseFloat(details.purchase_units[0].amount.value),
                    items: window.getCart(),
                    shippingDetails: {
                        fullName: shippingFullName,
                        email: shippingEmail,
                        phone: shippingPhone,
                        department: shippingDepartment,
                        municipality: shippingMunicipality,
                        address: shippingAddress
                    }
                };

                // ----------------------------------------------------------------------
                // iv. Verificación del ID de usuario
                // ----------------------------------------------------------------------
                // Se verifica que el ID de usuario (logueado o invitado) esté disponible.
                const currentUserId = window.currentUserIdGlobal;
                if (!currentUserId) {
                    console.error("Error: currentUserId no está definido al intentar enviar la orden a la Cloud Function.");
                    window.showAlert('Error interno: No se pudo identificar al usuario para procesar el pedido.', 'error');
                    return;
                }

                // ----------------------------------------------------------------------
                // v. Llamada a la Cloud Function
                // ----------------------------------------------------------------------
                // Se realiza una llamada `fetch` a la Cloud Function para procesar la orden.
                fetch(cloudFunctionUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: window.getCart(),
                        orderDetails: orderDetails,
                        userId: currentUserId,
                        orderId: orderId
                    })
                })
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    }
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Error desconocido de la Cloud Function');
                    });
                })
                .then(data => {
                    console.log('Respuesta de la Cloud Function:', data);
                    window.showAlert('¡Pedido procesado con éxito!', 'success');
                    window.clearCart();
                    window.updateCartDisplay();
                    setTimeout(() => {
                        window.location.href = 'confirmation.html';
                    }, 2000);
                })
                .catch(error => {
                    console.error('Error al enviar la orden a la Cloud Function:', error);
                    window.showAlert(`Error al procesar tu pedido: ${error.message}`, 'error');
                });
            });
        },

        /**
         * @function onCancel
         * @description Se activa cuando el usuario cancela el pago en la ventana de PayPal.
         * Muestra una alerta informativa al usuario.
         * @param {object} data - Datos de la transacción cancelada.
         */
        onCancel: function(data) {
            console.log('Pago cancelado por el usuario:', data);
            window.showAlert('Has cancelado el pago.', 'info');
        },

        /**
         * @function onError
         * @description Se activa si ocurre un error durante el proceso de pago.
         * Muestra una alerta de error al usuario.
         * @param {object} err - Objeto de error de PayPal.
         */
        onError: function(err) {
            console.error('Error de PayPal:', err);
            window.showAlert('Ocurrió un error con el pago de PayPal. Inténtalo de nuevo.', 'error');
        }
    }).render('#paypal-buttons-actual');
}

/**
 * @function updateMunicipalities
 * @description Esta función actualiza las opciones del selector de municipios
 * en base al departamento seleccionado por el usuario.
 */
function updateMunicipalities() {
    const selectedDepartment = shippingDepartmentSelect.value;
    const municipalities = departmentsAndMunicipalities[selectedDepartment] || [];

    // Limpia el selector de municipios.
    shippingMunicipalitySelect.innerHTML = '<option value="">Selecciona un Municipio</option>';

    // Itera sobre los municipios del departamento seleccionado y agrega cada uno como una opción.
    municipalities.forEach(municipality => {
        const option = document.createElement('option');
        option.value = municipality;
        option.textContent = municipality;
        shippingMunicipalitySelect.appendChild(option);
    });

    // Deshabilita el selector de municipios si no hay opciones disponibles.
    shippingMunicipalitySelect.disabled = municipalities.length === 0;
}


// ==========================================================================================================================
// 5. EVENT LISTENERS
// ==========================================================================================================================
// El evento 'DOMContentLoaded' se dispara cuando el documento HTML ha sido completamente cargado.
document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // a. Asignación de variables a elementos del DOM
    // ----------------------------------------------------------------------
    shippingForm = document.getElementById('shipping-form');
    shippingFullNameInput = document.getElementById('shippingFullName');
    shippingEmailInput = document.getElementById('shippingEmail');
    shippingPhoneInput = document.getElementById('shippingPhone');
    shippingDepartmentSelect = document.getElementById('shippingDepartment');
    shippingMunicipalitySelect = document.getElementById('shippingMunicipality');
    shippingAddressInput = document.getElementById('shippingAddress');
    paypalButtonContainer = document.getElementById('paypal-button-container');

    // ----------------------------------------------------------------------
    // b. Llenado inicial del selector de departamentos
    // ----------------------------------------------------------------------
    Object.keys(departmentsAndMunicipalities).forEach(department => {
        const option = document.createElement('option');
        option.value = department;
        option.textContent = department;
        shippingDepartmentSelect.appendChild(option);
    });

    // ----------------------------------------------------------------------
    // c. Listener para el selector de departamentos
    // ----------------------------------------------------------------------
    if (shippingDepartmentSelect) {
        shippingDepartmentSelect.addEventListener('change', updateMunicipalities);
    }

    // ----------------------------------------------------------------------
    // d. Listener para el evento de carga del SDK de PayPal
    // ----------------------------------------------------------------------
    // Este evento se dispara desde `common.js` una vez que el script de PayPal ha sido cargado.
    document.addEventListener('paypalSDKLoaded', () => {
        console.log('Evento paypalSDKLoaded disparado.');
        renderPayPalButtons();
    });

    // ----------------------------------------------------------------------
    // e. Listener para el envío del formulario de envío
    // ----------------------------------------------------------------------
    if (shippingForm) {
        shippingForm.addEventListener('submit', (event) => {
            event.preventDefault();
            console.log('Formulario de envío validado.');
        });
    }

    // ----------------------------------------------------------------------
    // f. Listener para el estado de autenticación de Firebase
    // ----------------------------------------------------------------------
    onAuthStateChanged(auth, async (user) => {
        const loginContainer = document.getElementById('login-container');
        const userProfileContainer = document.getElementById('user-profile-container');
        const profileAvatarHeader = document.getElementById('profile-avatar-header');
        const profileName = document.getElementById('profile-name');
        const profileEmail = document.getElementById('profile-email');
        const profileAvatarSidebar = document.getElementById('profile-avatar-sidebar');
        const profileNameSidebar = document.getElementById('profile-name-sidebar');
        const logoutButton = document.getElementById('logout-button');
        const loginButtonNav = document.getElementById('login-button-nav');

        if (user) {
            // Lógica para usuarios AUTENTICADOS
            console.log("Usuario autenticado:", user.uid);
            window.currentUserIdGlobal = user.uid; // Se usa el UID real del usuario.

            if (loginContainer) loginContainer.classList.add('hidden');
            if (userProfileContainer) userProfileContainer.classList.remove('hidden');

            const userDocRef = doc(window.db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            let userName = user.email;
            let avatarUrl = 'https://placehold.co/40x40/F0F0F0/333333?text=A';

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                if (userData.displayName) userName = userData.displayName;
                if (userData.profilePicture) avatarUrl = userData.profilePicture;
            }

            if (profileAvatarHeader) profileAvatarHeader.src = avatarUrl;
            if (profileAvatarSidebar) profileAvatarSidebar.src = avatarUrl;
            if (profileName) profileName.textContent = userName;
            if (profileNameSidebar) profileNameSidebar.textContent = userName;
            if (profileEmail) profileEmail.textContent = user.email;
            
            window.updateCartDisplay();
        } else {
            // Lógica para usuarios INVITADOS
            console.log("Usuario no autenticado. Usando ID de invitado.");
            if (loginContainer) loginContainer.classList.remove('hidden');
            if (userProfileContainer) userProfileContainer.classList.add('hidden');
            
            if (loginButtonNav) {
                loginButtonNav.classList.remove('hidden');
                loginButtonNav.textContent = 'Iniciar Sesión';
            }
            if (logoutButton) logoutButton.classList.add('hidden');

            let guestId = sessionStorage.getItem('guestUserId');
            if (!guestId) {
                guestId = crypto.randomUUID();
                sessionStorage.setItem('guestUserId', guestId);
            }
            window.currentUserIdGlobal = guestId;
            console.log("ID de invitado asignado:", window.currentUserIdGlobal);

            if (profileName) { profileName.textContent = 'Usuario Invitado'; }
            if (profileEmail) { profileEmail.textContent = 'Invítalo a iniciar sesión'; }
            if (profileAvatarHeader) { profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A'; }
            
            window.updateCartDisplay();
        }
    });

    // ----------------------------------------------------------------------
    // g. Listener para el botón de "Cerrar Sesión"
    // ----------------------------------------------------------------------
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            if (window.auth) {
                try {
                    await signOut(window.auth);
                    window.showAlert('Has cerrado sesión correctamente.', 'success');
                } catch (error) {
                    console.error('Error al cerrar sesión:', error.message);
                    window.showAlert('Error al cerrar sesión. Por favor, inténtalo de nuevo.', 'error');
                }
            } else {
                window.showAlert('Firebase Auth no está disponible para cerrar sesión.', 'error');
            }
        });
    }

    // ----------------------------------------------------------------------
    // h. Inicialización de la lógica del carrito y PayPal
    // ----------------------------------------------------------------------
    window.updateCartDisplay();
    window.loadPayPalSDK();
    document.addEventListener('paypalSDKLoaded', () => {
        console.log('Evento paypalSDKLoaded disparado. Actualizando display del carrito para renderizar botones.');
        window.updateCartDisplay();
    });
});
