// js/pago.js

// Datos de Departamentos y Municipios de El Salvador
const departmentsAndMunicipalities = {
    "Ahuachapán": ["Ahuachapán", "Apaneca", "Atiquizaya", "Concepción de Ataco", "El Refugio", "Jujutla", "San Francisco Menéndez", "San Lorenzo", "San Pedro Puxtla", "Tacuba", "Turín"],
    "Cabañas": ["Cinquera", "Dolores", "Guacotecti", "Ilobasco", "Sensuntepeque", "Tejutepeque", "Victoria"],
    "Chalatenango": ["Agua Caliente", "Arcatao", "Azacualpa", "Cancasque", "Chalatenango", "Chesal", "Citalá", "Comalapa", "Concepción Quezaltepeque", "Dulce Nombre de María", "El Carrizal", "El Paraíso", "La Laguna", "La Palma", "La Reina", "Las Vueltas", "Nombre de Jesús", "Nueva Concepción", "Nueva Trinidad", "Ojos de Agua", "Potonico", "San Antonio de la Cruz", "San Antonio Los Ranchos", "San Fernando", "San Ignacio", "San Isidro Labrador", "San Luis del Carmen", "San Miguel de Mercedes", "San Rafael", "Santa Rita", "Tejutla"],
    "Cuscatlán": ["Cojutepeque", "Candelaria", "El Carmen", "El Rosario", "Monte San Juan", "Oratorio de Concepción", "San Bartolomé Perulapía", "San Cristóbal", "San José Guayabal", "San Pedro Perulapán", "San Rafael Cedros", "San Ramón", "Santa Cruz Analquito", "Santa Cruz Michapa", "Suchitoto", "Tenancingo"],
    "La Libertad": ["Antiguo Cuscatlán", "Chiltiupán", "Ciudad Arce", "Colón", "Comasagua", "Huizúcar", "Jayaque", "Jicalapa", "La Libertad", "Santa Tecla", "Nuevo Cuscatlán", "Quezaltepeque", "Sacacoyo", "San Juan Opico", "San Matías", "San Pablo Tacachico", "Talnique", "Tamanique", "Teotepeque", "Tepecoyo", "Zaragoza"],
    "La Paz": ["Cuyultitán", "El Rosario", "Jerusalén", "Mercedes La Ceiba", "Olocuilta", "Paraíso de Osorio", "San Antonio Masahuat", "San Emigdio", "San Francisco Chinameca", "San Juan Nonualco", "San Juan Talpa", "San Juan Tepezontes", "San Luis La Herradura", "San Luis Talpa", "San Miguel Tepezontes", "San Pedro Masahuat", "San Pedro Nonualco", "San Rafael Obrajuelo", "Santa María Ostuma", "Santiago Nonualco", "Tapalhuaca", "Zacatecoluca"],
    "La Unión": ["Anamorós", "Bolívar", "Concepción de Oriente", "Conchagua", "El Sauce", "Intipucá", "La Unión", "Lislique", "Meanguera del Golfo", "Nueva Esparta", "Pasaquina", "Polorós", "San Alejo", "San José", "Santa Rosa de Lima", "Yayantique", "Yucuaiquín"],
    "Morazán": ["Arambala", "Cacaopera", "Chilanga", "Corinto", "Delicias de Concepción", "El Divisadero", "El Rosario", "Gualococti", "Guatajiagua", "Joateca", "Jocoaitique", "Jocoro", "Lolotiquillo", "Meanguera", "Osicala", "Perquín", "San Carlos", "San Fernando", "San Francisco Gotera", "San Simón", "Sensembra", "Sociedad", "Torola", "Yamabal", "Yoloaiquín"],
    "San Miguel": ["Carolina", "Chapeltique", "Chinameca", "Chirilagua", "Ciudad Barrios", "Comacarán", "El Tránsito", "Lolotique", "Moncagua", "Nueva Guadalupe", "Quelepa", "San Antonio del Mosco", "San Gerardo", "San Jorge", "San Luis de la Reina", "San Miguel", "San Rafael Oriente", "Sesori", "Uluazapa"],
    "San Salvador": ["Aguilares", "Apopa", "Ayutuxtepeque", "Ciudad Delgado", "Cuscatancingo", "El Paisnal", "Guazapa", "Ilopango", "Mejicanos", "Nejapa", "Panchimalco", "Rosario de Mora", "San Marcos", "San Martín", "San Salvador", "Santiago Texacuangos", "Santo Tomás", "Soyapango", "Tonacatepeque"],
    "San Vicente": ["Apastepeque", "Guadalupe", "San Cayetano Istepeque", "San Ildefonso", "San Vicente", "Santa Clara", "Tecoluca", "Tepetitán", "Verapaz"],
    "Santa Ana": ["Candelaria de la Frontera", "Chalchuapa", "Coatepeque", "El Congo", "El Porvenir", "Masahuat", "Metapán", "San Sebastián Salitrillo", "Santa Ana", "Santa Rosa Guachipilín", "Santiago de la Frontera"],
    "Sonsonate": ["Acajutla", "Armenia", "Caluco", "Cuisnahuat", "Izalco", "Juayúa", "Nahuizalco", "Nahulingo", "Salcoatitán", "San Antonio del Monte", "San Julián", "Santa Catarina Masahuat", "Santa Isabel Ishuatán", "Santo Domingo de Guzmán", "Sonsonate", "Sonzaacate"],
    "Usulután": ["Alegría", "Berlín", "California", "Concepción Batres", "El Triunfo", "Ereguayquín", "Jiquilisco", "Jucuapa", "Jucuarán", "Mercedes Umaña", "Ozatlán", "Puerto El Triunfo", "San Agustín", "San Buenaventura", "San Dionisio", "San Francisco Javier", "Santa Elena", "Santa María", "Santiago de María", "Tecapán", "Usulután"]
};

// Declaración de variables globales para los elementos del formulario de envío y contenedores
let shippingForm;
let shippingFullNameInput;
let shippingEmailInput;
let shippingPhoneInput;
let shippingDepartmentSelect;
let shippingMunicipalitySelect;
let shippingAddressInput;
let paypalButtonContainer;
let validationMessageDiv;

// Variable global para la URL de la imagen de perfil
window.profileImageUrlGlobal = '';
window.currentUserIdGlobal = null;

// =============================================================================
// FUNCIÓN PARA PROCESAR EL PAGO Y ENVIAR DATOS A CLOUD FUNCTION
// =============================================================================
window.processOrder = async () => {
    try {
        if (!shippingForm || !shippingForm.checkValidity()) {
            window.showAlert('Por favor, completa todos los campos del formulario de envío.', 'error');
            return;
        }

        const shippingFullName = shippingFullNameInput ? shippingFullNameInput.value : '';
        const shippingEmail = shippingEmailInput ? shippingEmailInput.value : '';
        const shippingPhone = shippingPhoneInput ? shippingPhoneInput.value : '';
        const shippingDepartment = shippingDepartmentSelect ? shippingDepartmentSelect.value : '';
        const shippingMunicipality = shippingMunicipalitySelect ? shippingMunicipalitySelect.value : '';
        const shippingAddress = shippingAddressInput ? shippingAddressInput.value : '';
        const cartItems = window.getCart();
        const totalAmount = window.getCartTotal();

        if (!shippingFullName || !shippingEmail || !shippingPhone || !shippingDepartment || !shippingMunicipality || !shippingAddress || cartItems.length === 0) {
            window.showAlert('Por favor, completa todos los campos y añade productos al carrito.', 'error');
            return;
        }

        // Estructurar los datos de envío
        const shippingInfo = {
            department: shippingDepartment,
            municipality: shippingMunicipality,
            address: shippingAddress,
            phone: shippingPhone,
            email: shippingEmail
        };

        // Estructurar los detalles de la orden
        const orderDetails = {
            items: cartItems.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            total: totalAmount,
            fullName: shippingFullName,
            shippingInfo: shippingInfo
        };

        const updateInventoryAndSaveOrder = httpsCallable(window.firebaseFunctions, 'updateInventoryAndSaveOrder');
        
        // Preparar el payload según el tipo de usuario
        const payload = {
            orderDetails: orderDetails,
        };

        // Si es usuario anónimo, enviar guestUserId
        if (window.firebaseAuth.currentUser?.isAnonymous) {
            payload.guestUserId = window.currentUserIdGlobal;
        }

        const result = await updateInventoryAndSaveOrder(payload);

        if (result.data.success) {
            console.log('Orden procesada con éxito.');
            window.showAlert('Tu orden ha sido procesada con éxito.', 'success');
            localStorage.removeItem('shoppingCart');
            window.updateCartDisplay();
        } else {
            window.showAlert('Hubo un error al procesar tu orden. Por favor, intenta de nuevo.', 'error');
        }

    } catch (error) {
        console.error('Error al procesar la orden:', error.message);
        window.showAlert(`Error al procesar la orden: ${error.message}`, 'error');
    }
};

// =============================================================================
// FUNCIÓN PARA RENDERIZAR BOTONES DE PAYPAL
// =============================================================================
function renderPayPalButtons() {
    console.log('renderPayPalButtons: Función iniciada.');
    const cart = window.getCart();

    if (!paypalButtonContainer) {
        console.error('renderPayPalButtons: Contenedor #paypal-button-container no encontrado.');
        return;
    }
    if (cart.length === 0) {
        console.log('renderPayPalButtons: Carrito vacío, no se renderizan los botones de PayPal.');
        paypalButtonContainer.innerHTML = '';
        return;
    }

    paypalButtonContainer.innerHTML = '';

    const buttonsDiv = document.createElement('div');
    buttonsDiv.id = 'paypal-buttons-actual';
    paypalButtonContainer.appendChild(buttonsDiv);

    if (!validationMessageDiv) {
        validationMessageDiv = document.createElement('p');
        validationMessageDiv.id = 'paypal-validation-message';
        validationMessageDiv.className = 'text-red-500 text-sm mt-2 text-center';
        paypalButtonContainer.appendChild(validationMessageDiv);
    } else {
        if (!paypalButtonContainer.contains(validationMessageDiv)) {
            paypalButtonContainer.appendChild(validationMessageDiv);
        }
    }

    if (typeof paypal === 'undefined') {
        console.error('renderPayPalButtons: Objeto "paypal" no definido.');
        validationMessageDiv.textContent = 'Error: El servicio de pago no está disponible. Por favor, recarga la página o inténtalo más tarde.';
        validationMessageDiv.classList.remove('hidden');
        return;
    } else {
        console.log('renderPayPalButtons: Objeto "paypal" detectado, intentando renderizar botones.');
    }

    paypal.Buttons({
        createOrder: function(data, actions) {
            if (!shippingForm || !shippingForm.checkValidity()) {
                validationMessageDiv.textContent = 'Por favor, completa todos los detalles de envío para continuar.';
                validationMessageDiv.classList.remove('hidden');
                throw new Error('Formulario de envío incompleto o inválido.');
            } else {
                validationMessageDiv.classList.add('hidden');
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
        onApprove: async function(data, actions) {
            try {
                const details = await actions.order.capture();
                console.log('Pago completado por ' + details.payer.name.given_name, details);
                window.showAlert('¡Pago completado con éxito! Procesando tu pedido...', 'success');

                const shippingFullName = shippingFullNameInput ? shippingFullNameInput.value : '';
                const shippingEmail = shippingEmailInput ? shippingEmailInput.value : '';
                const shippingPhone = shippingPhoneInput ? shippingPhoneInput.value : '';
                const shippingDepartment = shippingDepartmentSelect ? shippingDepartmentSelect.value : '';
                const shippingMunicipality = shippingMunicipalitySelect ? shippingMunicipalitySelect.value : '';
                const shippingAddress = shippingAddressInput ? shippingAddressInput.value : '';

                const orderDetails = {
                    paypalTransactionId: details.id,
                    paymentStatus: details.status,
                    payerId: details.payer.payer_id,
                    payerEmail: shippingEmail,
                    total: parseFloat(details.purchase_units[0].amount.value),
                    items: window.getCart(),
                    fullName: shippingFullName,
                    shippingInfo: {
                        department: shippingDepartment,
                        municipality: shippingMunicipality,
                        address: shippingAddress,
                        phone: shippingPhone,
                        email: shippingEmail
                    }
                };

                const updateInventoryAndSaveOrder = httpsCallable(window.firebaseFunctions, 'updateInventoryAndSaveOrder');

                // Preparar el payload según el tipo de usuario
                const payload = {
                    orderDetails: orderDetails,
                };

                // Si es usuario anónimo, enviar guestUserId
                if (window.firebaseAuth.currentUser?.isAnonymous) {
                    payload.guestUserId = window.currentUserIdGlobal;
                }

                const result = await updateInventoryAndSaveOrder(payload);

                console.log('Respuesta de la Cloud Function:', result.data);
                window.showAlert('¡Tu pedido ha sido procesado y guardado con éxito! Gracias por tu compra.', 'success');
                
                localStorage.removeItem('shoppingCart');
                window.updateCartDisplay();

            } catch (error) {
                console.error('Error en el proceso de pago:', error);
                window.showAlert(`Hubo un error al procesar tu pago: ${error.message}. Por favor, inténtalo de nuevo.`, 'error');
            }
        },
        onError: function(err) {
            console.error('Error en PayPal:', err);
            window.showAlert('Ocurrió un error con PayPal. Por favor, inténtalo de nuevo o elige otro método de pago.', 'error');
        },
        onCancel: function(data) {
            console.log('Pago cancelado por el usuario.');
            window.showAlert('El pago ha sido cancelado.', 'info');
        }
    }).render(buttonsDiv);
}

// =============================================================================
// MANEJO DE LA INTERFAZ: Lógica para mostrar productos en el carrito y el total
// =============================================================================
window.updateCartDisplay = function() {
    const cartItemsContainer = document.getElementById('cartItemsContainer');
    const emptyCartMessage = document.getElementById('emptyCartMessage');
    const cartTotalElement = document.getElementById('cartTotal');
    const cartItemCountElement = document.getElementById('cartItemCount');
    const navCarrito = document.getElementById('navCarrito');
    
    if (!cartItemsContainer || !emptyCartMessage || !cartTotalElement) {
        console.error('Elementos del carrito no encontrados en el DOM');
        return;
    }

    const cart = window.getCart();
    
    // Actualizar contador de items en el carrito
    if (cartItemCountElement) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartItemCountElement.textContent = totalItems;
        if (totalItems > 0) {
            cartItemCountElement.classList.remove('hidden');
        } else {
            cartItemCountElement.classList.add('hidden');
        }
    }
    
    // Mostrar/ocultar carrito en nav
    if (navCarrito) {
        if (cart.length > 0) {
            navCarrito.classList.remove('hidden');
        } else {
            navCarrito.classList.add('hidden');
        }
    }

    // Limpiar contenedor
    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
        emptyCartMessage.classList.remove('hidden');
        if (paypalButtonContainer) paypalButtonContainer.innerHTML = '';
    } else {
        emptyCartMessage.classList.add('hidden');
        
        // Renderizar cada item del carrito
        cart.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'flex flex-col sm:flex-row items-center justify-between border-b border-gray-200 py-4 last:border-b-0';
            itemElement.innerHTML = `
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
            `;
            cartItemsContainer.appendChild(itemElement);
        });

        // Agregar event listeners para los botones de eliminar
        document.querySelectorAll('.remove-from-cart-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const productId = event.target.dataset.productId;
                window.removeFromCart(productId);
            });
        });

        // Agregar event listeners para los inputs de cantidad
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', (event) => {
                const productId = event.target.dataset.productId;
                const newQuantity = parseInt(event.target.value);
                window.updateCartItemQuantity(productId, newQuantity);
            });
        });

        // Renderizar botones de PayPal si están disponibles
        if (typeof paypal !== 'undefined') {
            renderPayPalButtons();
        }
    }
    
    // Actualizar total
    cartTotalElement.textContent = `$${window.getCartTotal().toFixed(2)}`;
};

// =============================================================================
// INICIALIZACIÓN CUANDO EL DOM ESTÁ LISTO
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('loginButton');
    const loggedInUserDisplay = document.getElementById('loggedInUserDisplay');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const profileAvatarHeader = document.getElementById('profileAvatarHeader');
    const logoutButton = document.getElementById('logoutButton');
    const navCarrito = document.getElementById('navCarrito');
    const cartItemCountElement = document.getElementById('cartItemCount');

    const cartItemsContainer = document.getElementById('cartItemsContainer');
    const emptyCartMessage = document.getElementById('emptyCartMessage');
    const cartTotalElement = document.getElementById('cartTotal');
    paypalButtonContainer = document.getElementById('paypal-button-container');

    shippingForm = document.getElementById('shippingDetailsForm');
    shippingFullNameInput = document.getElementById('shippingFullName');
    shippingEmailInput = document.getElementById('shippingEmail');
    shippingPhoneInput = document.getElementById('shippingPhone');
    shippingDepartmentSelect = document.getElementById('shippingDepartment');
    shippingMunicipalitySelect = document.getElementById('shippingMunicipality');
    shippingAddressInput = document.getElementById('shippingAddress');

    if (!shippingForm) {
        console.error('Error: El formulario de envío con ID "shippingDetailsForm" no se encontró en el DOM.');
    }

    function loadShippingDepartments() {
        if (!shippingDepartmentSelect) return;
        shippingDepartmentSelect.innerHTML = '<option value="">Seleccione un departamento</option>';
        for (const dept in departmentsAndMunicipalities) {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            shippingDepartmentSelect.appendChild(option);
        }
    }

    function loadShippingMunicipalities(department) {
        if (!shippingMunicipalitySelect) return;
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

    if (shippingDepartmentSelect) {
        shippingDepartmentSelect.addEventListener('change', (event) => {
            loadShippingMunicipalities(event.target.value);
            if (typeof paypal !== 'undefined' && window.getCart().length > 0) {
                renderPayPalButtons();
            }
        });
    }

    loadShippingDepartments();
    loadShippingMunicipalities(shippingDepartmentSelect ? shippingDepartmentSelect.value : '');

    if (navCarrito) {
        navCarrito.classList.remove('hidden');
    }

    if (loginButton) {
        loginButton.addEventListener('click', () => {
            console.log('Botón "Iniciar Sesión" clickeado en pago.html. Redirigiendo a login.html...');
            window.location.href = 'login.html';
        });
    }

    // Escuchador de estado de autenticación de Firebase
    onAuthStateChanged(window.firebaseAuth, async (user) => {
        if (user) {
            window.currentUserIdGlobal = user.uid;
            if (loggedInUserDisplay) loggedInUserDisplay.classList.remove('hidden');
            if (loginButton) loginButton.classList.add('hidden');
            if (userNameDisplay) userNameDisplay.textContent = user.displayName || user.email || 'Tu Usuario';

            if (profileAvatarHeader) {
                if (user.photoURL) {
                    profileAvatarHeader.src = user.photoURL;
                } else {
                    try {
                        const avatarRefPng = ref(window.firebaseStorage, `avatars/${user.uid}.png`);
                        const avatarUrl = await getDownloadURL(avatarRefPng);
                        profileAvatarHeader.src = avatarUrl;
                    } catch (pngError) {
                        try {
                            const avatarRefJpg = ref(window.firebaseStorage, `avatars/${user.uid}.jpg`);
                            const avatarUrl = await getDownloadURL(avatarRefJpg);
                            profileAvatarHeader.src = avatarUrl;
                        } catch (jpgError) {
                            profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A';
                        }
                    }
                }
            }

            if (window.firebaseDb && shippingForm) {
                try {
                    const userDocRef = doc(window.firebaseDb, "users", user.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        if (shippingFullNameInput) shippingFullNameInput.value = userData.fullName || '';
                        if (shippingEmailInput) shippingEmailInput.value = userData.email || '';
                        if (shippingPhoneInput) shippingPhoneInput.value = userData.phone || '';
                        if (shippingAddressInput) shippingAddressInput.value = userData.address || '';
                        if (userData.department && shippingDepartmentSelect) {
                            shippingDepartmentSelect.value = userData.department;
                            loadShippingMunicipalities(userData.department);
                            if (userData.municipality && shippingMunicipalitySelect) {
                                shippingMunicipalitySelect.value = userData.municipality;
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error al precargar datos de envío del usuario:", error);
                    window.showAlert("Error al cargar tus datos de envío. Por favor, introdúcelos manualmente.", "error");
                }
            }

        } else {
            if (loggedInUserDisplay) loggedInUserDisplay.classList.add('hidden');
            if (loginButton) loginButton.classList.remove('hidden');
            if (profileAvatarHeader) profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A';

            try {
                const anonymousUser = await signInAnonymously(window.firebaseAuth);
                window.currentUserIdGlobal = anonymousUser.user.uid;
                console.log("Sesión anónima iniciada con éxito.");
            } catch (error) {
                console.error("Error al iniciar sesión anónima:", error);
            }
        }
        window.updateCartDisplay();
        window.loadPayPalSDK();
    });

    // Manejo del botón "Cerrar Sesión"
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                if (window.firebaseAuth.currentUser && !window.firebaseAuth.currentUser.isAnonymous) {
                    await signOut(window.firebaseAuth);
                    window.showAlert('Has cerrado sesión correctamente.', 'success');
                } else {
                    window.showAlert('No estás en una sesión de usuario para cerrar.', 'info');
                }
            } catch (error) {
                console.error('Error al cerrar sesión:', error.message);
                window.showAlert('Error al cerrar sesión. Por favor, inténtalo de nuevo.', 'error');
            }
        });
    }

    window.loadPayPalSDK();

    document.addEventListener('paypalSDKLoaded', () => {
        console.log('Evento paypalSDKLoaded disparado. Actualizando display del carrito para renderizar botones.');
        window.updateCartDisplay();
    });
});
