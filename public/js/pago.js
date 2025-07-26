// js/pago.js - Versión 2024-07-26 2:30 PM CST - Envío de estado y corrección de bucle

// Importa las funciones necesarias de Firebase Auth, Firestore y Storage
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; // Importar getDoc

// Datos de Departamentos y Municipios de El Salvador
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

// Declaración de variables globales para los elementos del formulario de envío y contenedores
// Se asignarán sus valores dentro de DOMContentLoaded
let shippingForm;
let shippingFullNameInput;
let shippingEmailInput;
let shippingPhoneInput;
let shippingDepartmentSelect;
let shippingMunicipalitySelect;
let shippingAddressInput;
let paypalButtonContainer;
let validationMessageDiv; // Para el mensaje de validación de PayPal

// Función para renderizar los botones de PayPal
function renderPayPalButtons() {
    console.log('pago.js: renderPayPalButtons - Función iniciada.');
    const cart = window.getCart();

    // Asegúrate de que el contenedor exista y el carrito no esté vacío
    if (!paypalButtonContainer) {
        console.error('pago.js: renderPayPalButtons - Contenedor #paypal-button-container no encontrado. Asegúrate de que pago.html tenga este ID.');
        return;
    }
    if (cart.length === 0) {
        console.log('pago.js: renderPayPalButtons - Carrito vacío, no se renderizan los botones de PayPal.');
        paypalButtonContainer.innerHTML = ''; // Limpia si no hay carrito
        return;
    }

    // Limpia el contenedor antes de renderizar para evitar duplicados
    paypalButtonContainer.innerHTML = '';

    // Crea un div para los botones de PayPal
    const buttonsDiv = document.createElement('div');
    buttonsDiv.id = 'paypal-buttons-actual';
    paypalButtonContainer.appendChild(buttonsDiv);

    // Crea o actualiza el div para el mensaje de validación del formulario
    if (!validationMessageDiv) {
        validationMessageDiv = document.createElement('p');
        validationMessageDiv.id = 'paypal-validation-message';
        validationMessageDiv.className = 'text-red-500 text-sm mt-2 text-center';
        paypalButtonContainer.appendChild(validationMessageDiv);
    } else {
        // Si ya existe, asegúrate de que esté en el lugar correcto
        if (!paypalButtonContainer.contains(validationMessageDiv)) {
            paypalButtonContainer.appendChild(validationMessageDiv);
        }
    }


    // Verifica si el objeto paypal está disponible
    if (typeof paypal === 'undefined') {
        console.error('pago.js: renderPayPalButtons - Objeto "paypal" no definido. El SDK de PayPal no se ha cargado correctamente. Verifica tu PAYPAL_CLIENT_ID en common.js.');
        validationMessageDiv.textContent = 'Error: El servicio de pago no está disponible. Por favor, recarga la página o inténtalo más tarde.';
        validationMessageDiv.classList.remove('hidden');
        return;
    } else {
        console.log('pago.js: renderPayPalButtons - Objeto "paypal" detectado, intentando renderizar botones.');
    }

    // Renderiza los botones de PayPal
    paypal.Buttons({
        createOrder: function(data, actions) {
            // Realiza la validación del formulario de envío aquí
            // Asegúrate de que shippingForm no sea null antes de llamar a checkValidity
            if (!shippingForm || !shippingForm.checkValidity()) {
                validationMessageDiv.textContent = 'Por favor, completa todos los detalles de envío para continuar.';
                validationMessageDiv.classList.remove('hidden');
                // Lanza un error para detener la creación de la orden si el formulario no es válido
                throw new Error('Formulario de envío incompleto o inválido.');
            } else {
                validationMessageDiv.classList.add('hidden'); // Oculta el mensaje si el formulario es válido
            }

            const total = window.getCartTotal();
            const items = cart.map(item => ({
                name: item.name,
                quantity: item.quantity,
                unit_amount: {
                    currency_code: 'USD',
                    value: item.price.toFixed(2)
                }
            }));

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
        onApprove: function(data, actions) {
            // Captura el pedido una vez aprobado
            return actions.order.capture().then(function(details) {
                console.log('pago.js: Pago completado por ' + details.payer.name.given_name, details);
                window.showAlert('¡Pago completado con éxito! Procesando tu pedido...', 'success');

                // --- Recopilar detalles de envío del formulario local ---
                // Asegúrate de que los elementos de input existan antes de acceder a .value
                const shippingFullName = shippingFullNameInput ? shippingFullNameInput.value : '';
                const shippingEmail = shippingEmailInput ? shippingEmailInput.value : '';
                const shippingPhone = shippingPhoneInput ? shippingPhoneInput.value : '';
                const shippingDepartment = shippingDepartmentSelect ? shippingDepartmentSelect.value : '';
                const shippingMunicipality = shippingMunicipalitySelect ? shippingMunicipalitySelect.value : '';
                const shippingAddress = shippingAddressInput ? shippingAddressInput.value : '';


                const cloudFunctionUrl = 'https://us-central1-mitienda-c2609.cloudfunctions.net/updateInventoryAndSaveOrder'; // Reemplaza con la URL REAL de tu Cloud Function

                const orderDetails = {
                    paypalTransactionId: details.id,
                    paymentStatus: details.status,
                    payerId: details.payer.payer_id,
                    payerEmail: shippingEmail, // Usar email del formulario de envío
                    total: parseFloat(details.purchase_units[0].amount.value),
                    items: window.getCart(), // Obtiene los ítems del carrito actual
                    shippingDetails: { // Usar los detalles del formulario
                        fullName: shippingFullName,
                        email: shippingEmail,
                        phone: shippingPhone,
                        department: shippingDepartment,
                        municipality: shippingMunicipality,
                        address: shippingAddress
                    },
                    estado: 'procesando', // AÑADIDO: Estado inicial de la orden
                    userId: window.currentUserIdGlobal // AÑADIDO: Asegura que el userId se envíe con la orden
                };

                console.log('pago.js: Enviando orderDetails a Cloud Function:', orderDetails); // Log para depuración

                // Asegúrate de que currentUserId esté disponible
                const currentUserId = window.currentUserIdGlobal; // Accede a la variable global
                if (!currentUserId) {
                    console.error("pago.js: Error: currentUserId no está definido al intentar enviar la orden a la Cloud Function.");
                    window.showAlert('Error interno: No se pudo identificar al usuario para procesar el pedido.', 'error');
                    return; // Detener el proceso si no hay ID de usuario
                }

                fetch(cloudFunctionUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        items: window.getCart(), // Los ítems del carrito para actualizar inventario
                        orderDetails: orderDetails, // Detalles completos de la orden
                        userId: currentUserId // El ID del usuario (autenticado o invitado)
                    })
                })
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    }
                    // Manejo de errores mejorado: Intenta leer el mensaje de error de la Cloud Function
                    return response.json().then(errorData => {
                        // Si la Cloud Function devuelve un mensaje específico (ej. "Inventario insuficiente")
                        // lo usamos, de lo contrario, un mensaje genérico.
                        throw new Error(errorData.message || 'Error desconocido de la Cloud Function');
                    });
                })
                .then(data => {
                    console.log('pago.js: Respuesta de la Cloud Function:', data);
                    window.showAlert('¡Tu pedido ha sido procesado y guardado con éxito! Gracias por tu compra.', 'success');
                    localStorage.removeItem('shoppingCart'); // Limpiar el carrito después de un pago exitoso
                    sessionStorage.removeItem('guestUserId'); // Limpiar ID de invitado si se completó la compra
                    window.updateCartDisplay(); // Actualiza la UI del carrito
                    // Redirigir al usuario a una página de confirmación de pedido
                    // window.location.href = 'confirmacion-pedido.html';
                })
                .catch(error => {
                    console.error('pago.js: Error al llamar a la Cloud Function:', error);
                    // Muestra el mensaje de error específico de la Cloud Function si está disponible
                    window.showAlert(`Hubo un error al procesar tu pago: ${error.message}. Por favor, inténtalo de nuevo.`, 'error');
                });

            }).catch(error => {
                console.error('pago.js: Error al capturar el pago:', error);
                window.showAlert('Hubo un error al procesar tu pago. Por favor, inténtalo de nuevo.', 'error');
            });
        },
        onError: function(err) {
            console.error('pago.js: Error en PayPal:', err);
            window.showAlert('Ocurrió un error con PayPal. Por favor, inténtalo de nuevo o elige otro método de pago.', 'error');
        },
        onCancel: function(data) {
            console.log('pago.js: Pago cancelado por el usuario.');
            window.showAlert('El pago ha sido cancelado.', 'info');
        }
    }).render(buttonsDiv); // Renderiza los botones en el div específico
}


document.addEventListener('DOMContentLoaded', () => {
    // Elementos del encabezado para el estado de autenticación
    const loginButton = document.getElementById('loginButton');
    const loggedInUserDisplay = document.getElementById('loggedInUserDisplay');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const profileAvatarHeader = document.getElementById('profileAvatarHeader');
    const logoutButton = document.getElementById('logoutButton');
    const navCarrito = document.getElementById('navCarrito');
    const cartItemCountElement = document.getElementById('cartItemCount'); // Obtener el elemento del contador de ítems del carrito

    // Elementos del cuerpo principal de la página de pago
    const cartItemsContainer = document.getElementById('cartItemsContainer');
    const emptyCartMessage = document.getElementById('emptyCartMessage');
    const cartTotalElement = document.getElementById('cartTotal');
    paypalButtonContainer = document.getElementById('paypal-button-container');


    // Asignar elementos del formulario de envío a las variables globales aquí
    shippingForm = document.getElementById('shippingDetailsForm');
    shippingFullNameInput = document.getElementById('shippingFullName');
    shippingEmailInput = document.getElementById('shippingEmail');
    shippingPhoneInput = document.getElementById('shippingPhone');
    shippingDepartmentSelect = document.getElementById('shippingDepartment');
    shippingMunicipalitySelect = document.getElementById('shippingMunicipality');
    shippingAddressInput = document.getElementById('shippingAddress');

    // Verificar si el formulario de envío se encontró
    if (!shippingForm) {
        console.error('pago.js: Error: El formulario de envío con ID "shippingDetailsForm" no se encontró en el DOM. Los botones de PayPal podrían no funcionar correctamente.');
    }

    // Obtener referencias de Firebase
    const auth = window.firebaseAuth;
    const app = window.firebaseApp;
    const storage = app ? getStorage(app) : null;
    const db = window.firebaseDb;

    // Variable global para almacenar el UID del usuario o un ID de invitado
    window.currentUserIdGlobal = null;

    // Función para actualizar el contador del carrito en el header
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
        // Asegura que el enlace del carrito sea visible si hay ítems o si la página lo requiere
        if (navCarrito) {
            navCarrito.classList.remove('hidden');
        }
    }

    // Define la función global updateCartDisplay para esta página.
    window.updateCartDisplay = function() {
        console.log('pago.js: window.updateCartDisplay - Actualizando UI del carrito y renderizando PayPal.');
        updateCartCountDisplay();
        // Lógica de visualización de ítems del carrito en la página de pago
        const cart = window.getCart();
        cartItemsContainer.innerHTML = '';

        if (cart.length === 0) {
            emptyCartMessage.classList.remove('hidden');
            if (paypalButtonContainer) paypalButtonContainer.innerHTML = ''; // Limpiar si el carrito está vacío
        } else {
            emptyCartMessage.classList.add('hidden');
            cart.forEach(item => {
                const itemHtml = `
                    <div class="flex flex-col sm:flex-row items-center justify-between border-b border-gray-200 py-4 last:border-b-0">
                        <div class="flex items-center space-x-4 mb-4 sm:mb-0">
                            <img src="${item.imageUrl || 'https://placehold.co/100x100/F0F0F0/333333?text=Producto'}" alt="${item.name}" class="w-20 h-20 object-cover rounded-md">
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900">${item.name}</h3>
                                <p class="text-gray-600">Precio unitario: $${item.price.toFixed(2)}</p>
                                <div class="flex items-center mt-2">
                                    <label for="quantity-${item.id}" class="mr-2">Cantidad:</label>
                                    <input type="number" id="quantity-${item.id}" value="${item.quantity}" min="1"
                                           class="w-16 p-1 border rounded-md text-center quantity-input"
                                           data-product-id="${item.id}">
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4">
                            <span class="text-xl font-bold text-dark-blue">$${(item.price * item.quantity).toFixed(2)}</span>
                            <button class="remove-from-cart-btn text-red-500 hover:text-red-700 transition duration-300" data-product-id="${item.id}">
                                Eliminar
                            </button>
                        </div>
                    </div>
                `;
                cartItemsContainer.innerHTML += itemHtml;
            });

            document.querySelectorAll('.remove-from-cart-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const productId = event.target.dataset.productId;
                    window.removeFromCart(productId);
                });
            });

            document.querySelectorAll('.quantity-input').forEach(input => {
                input.addEventListener('change', (event) => {
                    const productId = event.target.dataset.productId;
                    const newQuantity = parseInt(event.target.value);
                    window.updateCartItemQuantity(productId, newQuantity);
                });
            });

            // NO SE AÑADE EL LISTENER 'input' AL FORMULARIO AQUÍ PARA EVITAR RECURSIÓN
            // renderPayPalButtons() se llamará al cargar el SDK y al cambiar el carrito.

            // Renderizar botones de PayPal si el SDK está cargado y el carrito no está vacío
            if (typeof paypal !== 'undefined' && cart.length > 0) {
                renderPayPalButtons();
            } else if (cart.length > 0) {
                // Si el SDK no está cargado pero hay ítems, intenta cargarlo.
                // El evento 'paypalSDKLoaded' disparará renderPayPalButtons.
                window.loadPayPalSDK();
            }
        }
        cartTotalElement.textContent = `$${window.getCartTotal().toFixed(2)}`;
    };

    // --- Lógica para cargar departamentos y municipios en el formulario de envío ---
    function loadShippingDepartments() {
        if (!shippingDepartmentSelect) return; // Protección adicional
        shippingDepartmentSelect.innerHTML = '<option value="">Seleccione un departamento</option>';
        for (const dept in departmentsAndMunicipalities) {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            shippingDepartmentSelect.appendChild(option);
        }
    }

    function loadShippingMunicipalities(department) {
        if (!shippingMunicipalitySelect) return; // Protección adicional
        shippingMunicipalitySelect.innerHTML = '<option value="">Seleccione un municipio</option>';
        shippingMunicipalitySelect.disabled = true;

        if (department && departmentsAndMunicipalities[department]) {
            departmentsAndMunicipalities[department].forEach(muni => {
                const option = document.createElement('option');
                option.value = muni;
                option.textContent = muni;
                shippingMunicipalitySelect.appendChild(option);
            });
            shippingMunicipalitySelect.disabled = false;
        } else {
            shippingMunicipalitySelect.innerHTML = '<option value="">Primero seleccione un departamento</option>';
        }
    }

    // Event listener para el cambio de departamento en el formulario de envío
    if (shippingDepartmentSelect) { // Protección adicional
        shippingDepartmentSelect.addEventListener('change', (event) => {
            loadShippingMunicipalities(event.target.value);
            // No se llama a renderPayPalButtons aquí para evitar el bucle.
            // Se asume que el cambio de carrito o la carga de la página lo manejará.
        });
    }


    // Cargar departamentos al inicio de la página de pago
    loadShippingDepartments();
    loadShippingMunicipalities(shippingDepartmentSelect ? shippingDepartmentSelect.value : ''); // Cargar municipios iniciales (vacío)

    // --- Asegurar que el enlace del Carrito siempre sea visible ---
    if (navCarrito) {
        navCarrito.classList.remove('hidden');
    }

    // Manejo del botón "Iniciar Sesión" en el encabezado
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            console.log('pago.js: Botón "Iniciar Sesión" clickeado en pago.html. Redirigiendo a login.html...');
            window.location.href = 'login.html';
        });
    }

    // Manejo del estado de autenticación en el encabezado
    if (auth) {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Usuario logueado
                loginButton.classList.add('hidden');
                loggedInUserDisplay.classList.remove('hidden');
                userNameDisplay.textContent = user.displayName || user.email || 'Tu Usuario';

                // Cargar avatar
                if (profileAvatarHeader) { // Protección adicional
                    if (user.photoURL) {
                        profileAvatarHeader.src = user.photoURL;
                    } else if (storage) {
                        try {
                            const avatarRefPng = ref(storage, `avatars/${user.uid}.png`);
                            const avatarUrl = await getDownloadURL(avatarRefPng);
                            profileAvatarHeader.src = avatarUrl;
                        } catch (pngError) {
                            try {
                                const avatarRefJpg = ref(storage, `avatars/${user.uid}.jpg`);
                                const avatarUrl = await getDownloadURL(avatarRefJpg);
                                profileAvatarHeader.src = avatarUrl;
                            } catch (jpgError) {
                                profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A';
                            }
                        }
                    } else {
                        profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A';
                    }
                }
                window.currentUserIdGlobal = user.uid;

                // Precargar datos de envío del usuario desde Firestore
                if (db && shippingForm) { // Asegúrate de que db y shippingForm existan
                    try {
                        const userDocRef = doc(db, "users", user.uid);
                        const userDocSnap = await getDoc(userDocRef);
                        if (userDocSnap.exists()) {
                            const userData = userDocSnap.data();
                            shippingFullNameInput.value = userData.fullName || '';
                            shippingEmailInput.value = userData.email || '';
                            shippingPhoneInput.value = userData.phone || '';
                            shippingAddressInput.value = userData.address || '';
                            // Cargar departamento y municipio
                            if (userData.department) {
                                shippingDepartmentSelect.value = userData.department;
                                loadShippingMunicipalities(userData.department);
                                if (userData.municipality) {
                                    shippingMunicipalitySelect.value = userData.municipality;
                                }
                            }
                        }
                    } catch (error) {
                        console.error("pago.js: Error al precargar datos de envío del usuario:", error);
                        window.showAlert("Error al cargar tus datos de envío. Por favor, introdúcelos manualmente.", "error");
                    }
                }

            } else {
                // Usuario no logueado (invitado)
                loginButton.classList.remove('hidden');
                loggedInUserDisplay.classList.add('hidden');
                if (profileAvatarHeader) { profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A'; }

                let guestId = sessionStorage.getItem('guestUserId');
                if (!guestId) {
                    guestId = crypto.randomUUID();
                    sessionStorage.setItem('guestUserId', guestId);
                }
                window.currentUserIdGlobal = guestId;
                // Para usuarios invitados, el formulario de envío estará vacío para que lo llenen.
            }
            window.updateCartDisplay(); // Actualiza la UI del carrito y renderiza PayPal
        });
    } else {
        console.warn("pago.js: Firebase Auth no está inicializado. Procediendo como invitado.");
        loginButton.classList.remove('hidden');
        loggedInUserDisplay.classList.add('hidden');
        if (profileAvatarHeader) { profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A'; }

        let guestId = sessionStorage.getItem('guestUserId');
        if (!guestId) {
            guestId = crypto.randomUUID();
            sessionStorage.setItem('guestUserId', guestId);
        }
        window.currentUserIdGlobal = guestId;
        window.updateCartDisplay();
    }

    // Manejo del botón "Cerrar Sesión"
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            if (auth) {
                try {
                    await signOut(auth);
                    window.showAlert('Has cerrado sesión correctamente.', 'success');
                } catch (error) {
                    console.error('pago.js: Error al cerrar sesión:', error.message);
                    window.showAlert('Error al cerrar sesión. Por favor, inténtalo de nuevo.', 'error');
                }
            } else {
                window.showAlert('Firebase Auth no está disponible para cerrar sesión.', 'error');
            }
        });
    }

    // Carga el SDK de PayPal cuando la página del carrito se carga
    window.loadPayPalSDK();

    // Escucha el evento 'paypalSDKLoaded' para renderizar los botones
    document.addEventListener('paypalSDKLoaded', () => {
        console.log('pago.js: Evento paypalSDKLoaded disparado. Actualizando display del carrito para renderizar botones.');
        window.updateCartDisplay();
    });
});
