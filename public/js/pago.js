// js/pago.js

// Importa las funciones necesarias de Firebase Auth, Firestore y Storage
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";

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
    "Usulután": ["Alegría", "Berlín", "California", "Concepción Batres", "El Triunfo", "Ereguayquín", "Estanzuelas", "Jiquilisco", "Jucuarán", "Jucuarán", "Mercedes Umaña", "Nueva Granada", "Ozatlán", "Puerto El Triunfo", "San Agustín", "San Buenaventura", "San Dionisio", "San Francisco Javier", "Santa Elena", "Santa María", "Santiago de María", "Tecapán", "Usulután"]
};

let shippingForm;
let shippingFullNameInput;
let shippingEmailInput;
let shippingPhoneInput;
let shippingDepartmentSelect;
let shippingMunicipalitySelect;
let shippingAddressInput;
let paypalButtonContainer;
let validationMessageDiv;
let cartItemsContainer;
let cartTotalElement;
let checkoutButton;
let logoutButton;
let loginButtonNav;

window.updateCartDisplay = function() {
    const cart = window.getCart();
    const total = window.getCartTotal();

    if (!cartItemsContainer) {
        cartItemsContainer = document.getElementById('cart-items-container');
    }
    if (!cartTotalElement) {
        cartTotalElement = document.getElementById('cart-total');
    }
    if (!checkoutButton) {
        checkoutButton = document.getElementById('checkout-button');
    }

    if (!cartItemsContainer || !cartTotalElement) {
        return;
    }

    cartItemsContainer.innerHTML = '';
    let cartIsEmpty = cart.length === 0;

    if (cartIsEmpty) {
        cartItemsContainer.innerHTML = '<p class="text-center text-gray-500">Tu carrito está vacío.</p>';
        cartTotalElement.textContent = '$0.00';
    } else {
        cart.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'flex justify-between items-center py-2 border-b border-gray-200';
            itemElement.innerHTML = `
                <div class="flex items-center gap-4">
                    <img src="${item.image}" alt="${item.name}" class="w-12 h-12 object-cover rounded-md">
                    <div>
                        <p class="font-semibold text-gray-800">${item.name}</p>
                        <p class="text-sm text-gray-500">Cantidad: ${item.quantity}</p>
                    </div>
                </div>
                <span class="font-bold text-gray-800">$${(item.price * item.quantity).toFixed(2)}</span>
            `;
            cartItemsContainer.appendChild(itemElement);
        });
        cartTotalElement.textContent = `$${total.toFixed(2)}`;
    }

    if (checkoutButton) {
        checkoutButton.disabled = cartIsEmpty;
    }
    
    if (window.loadPayPalSDK) {
        window.loadPayPalSDK();
    }
};

function renderPayPalButtons() {
    const cart = window.getCart();

    if (!paypalButtonContainer) {
        console.error('renderPayPalButtons: Contenedor #paypal-button-container no encontrado.');
        return;
    }

    if (cart.length === 0) {
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
        onApprove: function(data, actions) {
            return actions.order.capture().then(function(details) {
                console.log('Pago completado por ' + details.payer.name.given_name, details);
                window.showAlert('¡Pago completado con éxito! Procesando tu pedido...', 'success');

                const shippingFullName = shippingFullNameInput ? shippingFullNameInput.value : '';
                const shippingEmail = shippingEmailInput ? shippingEmailInput.value : '';
                const shippingPhone = shippingPhoneInput ? shippingPhoneInput.value : '';
                const shippingDepartment = shippingDepartmentSelect ? shippingDepartmentSelect.value : '';
                const shippingMunicipality = shippingMunicipalitySelect ? shippingMunicipalitySelect.value : '';
                const shippingAddress = shippingAddressInput ? shippingAddressInput.value : '';

                const functions = getFunctions(window.firebase.app);
                const processOrder = httpsCallable(functions, 'createOrderAndAdjustInventory');
                
                const orderDetails = {
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
                
                processOrder({ orderDetails })
                .then((result) => {
                    const data = result.data;
                    console.log('Respuesta de la Cloud Function:', data);
                    window.showAlert('¡Pedido procesado con éxito!', 'success');
                    window.clearCart();
                    window.updateCartDisplay();
                    setTimeout(() => {
                        window.location.href = 'confirmation.html';
                    }, 2000);
                })
                .catch(error => {
                    console.error('Error al llamar a la Cloud Function:', error);
                    window.showAlert(`Error al procesar tu pedido: ${error.message}`, 'error');
                });
            });
        },
        onCancel: function(data) {
            console.log('Pago cancelado por el usuario:', data);
            window.showAlert('Has cancelado el pago.', 'info');
        },
        onError: function(err) {
            console.error('Error de PayPal:', err);
            window.showAlert('Ocurrió un error con el pago de PayPal. Inténtalo de nuevo.', 'error');
        }
    }).render('#paypal-buttons-actual');
}

function updateMunicipalities() {
    const selectedDepartment = shippingDepartmentSelect.value;
    const municipalities = departmentsAndMunicipalities[selectedDepartment] || [];

    shippingMunicipalitySelect.innerHTML = '<option value="">Selecciona un Municipio</option>';

    municipalities.forEach(municipality => {
        const option = document.createElement('option');
        option.value = municipality;
        option.textContent = municipality;
        shippingMunicipalitySelect.appendChild(option);
    });

    shippingMunicipalitySelect.disabled = municipalities.length === 0;
}

// NUEVA FUNCIÓN PARA ESPERAR LA INICIALIZACIÓN
function waitForGlobalScripts() {
    // Verificamos si window.auth y window.updateCartDisplay ya existen
    if (window.auth && typeof window.updateCartDisplay === 'function') {
        // Si existen, podemos proceder con la lógica del pago.
        // Ahora se inicializa onAuthStateChanged aquí
        onAuthStateChanged(window.auth, async (user) => {
            const loginContainer = document.getElementById('login-container');
            const userProfileContainer = document.getElementById('user-profile-container');
            const profileAvatarHeader = document.getElementById('profile-avatar-header');
            const profileName = document.getElementById('profile-name');
            const profileEmail = document.getElementById('profile-email');
            const profileAvatarSidebar = document.getElementById('profile-avatar-sidebar');
            const profileNameSidebar = document.getElementById('profile-name-sidebar');
            logoutButton = document.getElementById('logout-button');
            loginButtonNav = document.getElementById('login-button-nav');
    
            if (user) {
                window.currentUserIdGlobal = user.uid;
    
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
    
                if (profileName) { profileName.textContent = 'Usuario Invitado'; }
                if (profileEmail) { profileEmail.textContent = 'Invítalo a iniciar sesión'; }
                if (profileAvatarHeader) { profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A'; }
                
                window.updateCartDisplay();
            }
        });
    } else {
        // Si no, volvemos a intentarlo en 100ms.
        setTimeout(waitForGlobalScripts, 100);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    shippingForm = document.getElementById('shipping-form');
    shippingFullNameInput = document.getElementById('shippingFullName');
    shippingEmailInput = document.getElementById('shippingEmail');
    shippingPhoneInput = document.getElementById('shippingPhone');
    shippingDepartmentSelect = document.getElementById('shippingDepartment');
    shippingMunicipalitySelect = document.getElementById('shippingMunicipality');
    shippingAddressInput = document.getElementById('shippingAddress');
    paypalButtonContainer = document.getElementById('paypal-button-container');

    cartItemsContainer = document.getElementById('cart-items-container');
    cartTotalElement = document.getElementById('cart-total');
    checkoutButton = document.getElementById('checkout-button');

    Object.keys(departmentsAndMunicipalities).forEach(department => {
        const option = document.createElement('option');
        option.value = department;
        option.textContent = department;
        shippingDepartmentSelect.appendChild(option);
    });

    if (shippingDepartmentSelect) {
        shippingDepartmentSelect.addEventListener('change', updateMunicipalities);
    }

    document.addEventListener('paypalSDKLoaded', () => {
        renderPayPalButtons();
    });

    if (shippingForm) {
        shippingForm.addEventListener('submit', (event) => {
            event.preventDefault();
        });
    }

    logoutButton = document.getElementById('logout-button');
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

    // Inicia el proceso de espera
    waitForGlobalScripts();
});
