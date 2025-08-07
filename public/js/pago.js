// js/pago.js

// Importa las funciones necesarias de Firebase Auth, Firestore y Storage
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js';


// Datos de Departamentos y Municipios de El Salvador
const departmentsAndMunicipalities = {
    "Ahuachapán": ["Ahuachapán", "Apaneca", "Atiquizaya", "Concepción de Ataco", "El Refugio", "Jujutla", "San Francisco Menéndez", "San Lorenzo", "San Pedro Puxtla", "Tacuba", "Turín"],
    "Cabañas": ["Cinquera", "Dolores", "Guacotecti", "Ilobasco", "Sensuntepeque", "Tejutepeque", "Victoria"],
    "Chalatenango": ["Agua Caliente", "Arcatao", "Azacualpa", "Cancasque", "Chalatenango", "Chesal", "Citalá", "Comalapa", "Concepción Quezaltepeque", "Dulce Nombre de María", "El Carrizal", "El Paraíso", "La Laguna", "La Palma", "La Reina", "Las Vueltas", "Nombre de Jesús", "Nueva Concepción", "Nueva Trinidad", "Ojos de Agua", "Potonico", "San Antonio de la Cruz", "San Antonio Los Ranchos", "San Fernando", "San Francisco Lempa", "San Francisco Morazán", "San Ignacio", "San Isidro Labrador", "San José Cancasque", "San José Las Flores", "San Luis del Carmen", "San Miguel de Mercedes", "San Rafael", "Santa Rita", "Tejutla"],
    "Cuscatlán": ["Candelaria", "Cojutepeque", "El Carmen", "El Rosario", "Monte San Juan", "Oratorio de Concepción", "San Bartolomé Perulapía", "San Cristóbal", "San José Guayabal", "San Pedro Perulapán", "San Rafael Cedros", "San Ramón", "Santa Cruz Analquito", "Santa Cruz Michapa", "Suchitoto", "Tenancingo"],
    "La Libertad": ["Antiguo Cuscatlán", "Chiltiupán", "Ciudad Arce", "Colón", "Comasagua", "Huizúcar", "Jayaque", "Jicalapa", "La Libertad", "Santa Tecla", "Nuevo Cuscatlán", "San Juan Opico", "Quezaltepeque", "Sacacoyo", "San José Villanueva", "San Matías", "San Pablo Tacachico", "Talnique", "Tamanique", "Teotepeque", "Tepecoyo", "Zaragoza", "Santa Tecla"],
    "La Paz": ["Cuyultitán", "El Rosario", "Jerusalén", "Mercedes La Ceiba", "Olocuilta", "Paraíso de Osorio", "San Antonio Masahuat", "San Emigdio", "San Francisco Chinameca", "San Juan Nonualco", "San Juan Talpa", "San Juan Tepezontes", "San Luis Talpa", "San Miguel Tepezontes", "San Pedro Masahuat", "San Pedro Nonualco", "San Rafael Obrajuelo", "Santa María Ostuma", "Santiago Nonualco", "Tapalhuaca", "Zacatecoluca"],
    "La Unión": ["Anamorós", "Bolívar", "Concepción de Oriente", "Conchagua", "El Carmen", "El Sauce", "Intipucá", "La Unión", "Lislique", "Meanguera del Golfo", "Nueva Esparta", "Pasaquina", "Polorós", "San Alejo", "San José", "Santa Rosa de Lima", "Yayantique", "Yucuaiquín"],
    "Morazán": ["Arambala", "Cacaopera", "Chilanga", "Corinto", "Delicias de Concepción", "El Divisadero", "El Sauce", "Gualococti", "Guatajiagua", "Joateca", "Jocoaitique", "Jocoro", "Lolotiquillo", "Meanguera", "Osicala", "Perquín", "San Carlos", "San Fernando", "San Francisco Gotera", "San Isidro", "San Simón", "Sensembra", "Sociedad", "Torola", "Yamabal", "Yoloaiquín"],
    "San Miguel": ["Carolina", "Chapeltique", "Chinameca", "Chirilagua", "Ciudad Barrios", "Comacarán", "El Tránsito", "Lolotique", "Moncagua", "Nueva Guadalupe", "Nuevo Edén de San Juan", "Quelepa", "San Antonio del Mosco", "San Gerardo", "San Jorge", "San Luis de la Reina", "San Miguel", "San Rafael Oriente", "Sesori", "Uluazapa"],
    "San Salvador": ["Aguilares", "Apopa", "Ayutuxtepeque", "Cuscatancingo", "Delgado", "El Paisnal", "Guazapa", "Ilopango", "Mejicanos", "Nejapa", "Panchimalco", "Rosario de Mora", "San Marcos", "San Martín", "San Salvador", "Santiago Texacuangos", "Santo Tomás", "Soyapango", "Tonacatepeque"],
    "San Vicente": ["Apastepeque", "Guadalupe", "San Cayetano Istepeque", "San Sebastián", "San Vicente", "Santa Clara", "Santo Domingo", "Tecoluca", "Tepetitán", "Verapaz"],
    "Santa Ana": ["Candelaria de la Frontera", "Chalchuapa", "Coatepeque", "El Congo", "El Porvenir", "Masahuat", "Metapán", "San Antonio Pajonal", "Santa Ana", "Santa Rosa Guachipilín", "Santiago de la Frontera", "Texistepeque"],
    "Sonsonate": ["Acajutla", "Armenia", "Caluco", "Cuisnahuat", "Izalco", "Juayúa", "Nahulingo", "Nahuizalco", "Salcoatitán", "San Antonio del Monte", "San Julián", "Santa Catarina Masahuat", "Santa Isabel Ishuatán", "Santo Domingo de Guzmán", "Sonsonate", "Sonza"],
    "Usulután": ["Alegría", "Berlín", "California", "Concepción Batres", "El Triunfo", "Ereguayquín", "Estanzuelas", "Jiquilisco", "Jucuapa", "Jucuarán", "Mercedes Umaña", "Nueva Granada", "Ozatlán", "Puerto El Triunfo", "San Agustín", "San Buenaventura", "San Dionisio", "Santa Elena", "Santa María", "Santiago de María", "Tecapán", "Usulután"]
};

// Obtiene referencias a los elementos del DOM que se necesitarán
const departmentSelect = document.getElementById('department');
const municipalitySelect = document.getElementById('municipality');
const addressInput = document.getElementById('address');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalElement = document.getElementById('cart-total');
const checkoutButton = document.getElementById('checkout-button');
const checkoutForm = document.getElementById('checkout-form');
const checkoutModal = document.getElementById('checkout-modal');
const closeButton = document.querySelector('.close-button');
const paymentStatusElement = document.getElementById('payment-status');
const paypalButtonsContainer = document.getElementById('paypal-button-container');

// Obtener la instancia de Firebase y los servicios de auth y firestore del window global
const auth = window.firebase.auth;
const db = window.firebase.db;
const storage = window.firebase.storage;

// Función para obtener el carrito de compras del localStorage
function getCart() {
    const cart = localStorage.getItem('shoppingCart');
    return cart ? JSON.parse(cart) : [];
}

// Función para guardar el carrito en el localStorage
function saveCart(cart) {
    localStorage.setItem('shoppingCart', JSON.stringify(cart));
    window.updateCartDisplay();
}

// Función para inicializar los selectores de departamentos y municipios
function initializeSelectors() {
    if (departmentSelect && municipalitySelect) {
        // Llena el selector de departamentos
        for (const department in departmentsAndMunicipalities) {
            const option = document.createElement('option');
            option.value = department;
            option.textContent = department;
            departmentSelect.appendChild(option);
        }

        // Listener para el cambio de departamento
        departmentSelect.addEventListener('change', (e) => {
            const selectedDepartment = e.target.value;
            const municipalities = departmentsAndMunicipalities[selectedDepartment] || [];

            // Limpia el selector de municipios
            municipalitySelect.innerHTML = '<option value="">Selecciona un municipio</option>';
            municipalitySelect.disabled = !selectedDepartment;

            // Llena el selector de municipios
            municipalities.forEach(municipality => {
                const option = document.createElement('option');
                option.value = municipality;
                option.textContent = municipality;
                municipalitySelect.appendChild(option);
            });
        });
    }
}

// Función para renderizar los productos del carrito en la página de pago
function renderCartItems() {
    const cart = getCart();
    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="text-center text-gray-500">Tu carrito está vacío.</p>';
        if (cartTotalElement) cartTotalElement.textContent = '$0.00';
        if (checkoutButton) checkoutButton.disabled = true;
        if (paypalButtonsContainer) paypalButtonsContainer.innerHTML = '';
        return;
    }

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const itemElement = document.createElement('div');
        itemElement.className = 'flex justify-between items-center py-2 border-b';
        itemElement.innerHTML = `
            <div class="flex-1">
                <span class="font-semibold">${item.name}</span>
                <p class="text-sm text-gray-500">${item.quantity} x $${item.price.toFixed(2)}</p>
            </div>
            <span class="font-semibold">$${itemTotal.toFixed(2)}</span>
        `;
        cartItemsContainer.appendChild(itemElement);
    });

    if (cartTotalElement) cartTotalElement.textContent = `$${total.toFixed(2)}`;
    if (checkoutButton) checkoutButton.disabled = false;
    // Vuelve a renderizar los botones de PayPal con el nuevo total
    renderPayPalButtons(total);
}

// Función para obtener los datos de la dirección del formulario
function getShippingAddress() {
    return {
        department: departmentSelect.value,
        municipality: municipalitySelect.value,
        address: addressInput.value,
    };
}

// Función para validar la dirección de envío
function validateShippingAddress() {
    const { department, municipality, address } = getShippingAddress();
    if (!department || !municipality || !address) {
        window.showAlert('Por favor, completa todos los campos de la dirección de envío.', 'error');
        return false;
    }
    return true;
}

// --- Lógica de PayPal y Cloud Function ---

// Renderiza los botones de PayPal
function renderPayPalButtons(total) {
    if (paypalButtonsContainer && typeof paypal !== 'undefined') {
        paypalButtonsContainer.innerHTML = ''; // Limpia los botones anteriores
        paypal.Buttons({
            createOrder: function(data, actions) {
                // Configura la orden de PayPal
                return actions.order.create({
                    purchase_units: [{
                        amount: {
                            value: total.toFixed(2)
                        }
                    }]
                });
            },
            onApprove: function(data, actions) {
                return actions.order.capture().then(function(details) {
                    window.showAlert('Pago completado por ' + details.payer.name.given_name + '!', 'success');
                    console.log('Pago completado por', details.payer.name.given_name, details);

                    // Llama a la Cloud Function de Firebase
                    handlePaymentCompletion(details);
                });
            },
            onCancel: function(data) {
                window.showAlert('Pago cancelado.', 'info');
                console.log('Pago cancelado', data);
            },
            onError: function(err) {
                window.showAlert('Ha ocurrido un error con el pago.', 'error');
                console.error('Error de PayPal:', err);
            }
        }).render('#paypal-button-container');
    }
}

// Función para cargar el SDK de PayPal
window.loadPayPalSDK = function() {
    // Solo carga el script si no está ya en la página
    if (!document.querySelector('script[src*="paypal.com/sdk"]')) {
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=AVQpOYnmo31PwFuK1rNOHJN-zp6cHl1BdMkac2K0PhJ2ucmHSosW8iKg4fWHiF817wVu6y9jcAL9ibFd&currency=USD`;
        script.onload = () => {
            console.log("SDK de PayPal cargado.");
            // Dispara un evento para que los componentes que lo necesiten se actualicen
            document.dispatchEvent(new Event('paypalSDKLoaded'));
        };
        document.head.appendChild(script);
    }
};


// ESTE ES EL CAMBIO CRÍTICO: Usar httpsCallable
const updateInventoryAndSaveOrder = httpsCallable(getFunctions(), 'updateInventoryAndSaveOrder');

async function handlePaymentCompletion(paymentDetails) {
    if (!validateShippingAddress()) {
        paymentStatusElement.textContent = 'Error: Dirección de envío incompleta.';
        return;
    }

    const cart = getCart();
    if (cart.length === 0) {
        paymentStatusElement.textContent = 'Error: El carrito está vacío.';
        return;
    }

    try {
        // Prepara los datos a enviar a la Cloud Function
        const orderData = {
            cart,
            shippingAddress: getShippingAddress(),
            paymentDetails: paymentDetails,
            userId: auth.currentUser ? auth.currentUser.uid : window.currentUserIdGlobal,
            orderDate: new Date().toISOString()
        };

        // Llama a la Cloud Function de forma segura
        const result = await updateInventoryAndSaveOrder(orderData);
        console.log('Respuesta de la Cloud Function:', result.data);

        // Muestra el estado del pago y el ID de la orden
        paymentStatusElement.innerHTML = `
            <p class="text-green-600 font-semibold text-lg">¡Pago exitoso!</p>
            <p>Tu orden ha sido procesada. ID de la orden: ${result.data.orderId}</p>
        `;

        // Limpia el carrito
        saveCart([]);

        // Oculta el formulario de envío y los botones de PayPal
        checkoutForm.style.display = 'none';
        paypalButtonsContainer.style.display = 'none';
        
    } catch (error) {
        console.error('Error al llamar a la Cloud Function:', error);
        paymentStatusElement.innerHTML = `
            <p class="text-red-600 font-semibold text-lg">Error al procesar la orden.</p>
            <p>${error.message}</p>
        `;
    }
}

// Inicializa la página
document.addEventListener('DOMContentLoaded', () => {
    // Asegurarse de que las instancias de Firebase estén disponibles
    if (!window.firebase || !window.firebase.auth || !window.firebase.db) {
        console.error("Firebase no está inicializado. Asegúrate de importar common.js.");
        return;
    }

    // Esperar a que el usuario se autentique o se cree un ID de invitado
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Usuario autenticado
            window.currentUserIdGlobal = user.uid;
            // ... (lógica de perfil si es necesaria)
        } else {
            // Usuario no autenticado (invitado)
            let guestId = sessionStorage.getItem('guestUserId');
            if (!guestId) {
                guestId = crypto.randomUUID();
                sessionStorage.setItem('guestUserId', guestId);
            }
            window.currentUserIdGlobal = guestId;
        }

        // Una vez que tenemos un userId, podemos inicializar todo lo demás
        initializeSelectors();
        renderCartItems();
        window.loadPayPalSDK();
    });

    // Escucha el evento 'paypalSDKLoaded' para renderizar los botones
    document.addEventListener('paypalSDKLoaded', () => {
        console.log('Evento paypalSDKLoaded disparado. Actualizando display del carrito para renderizar botones.');
        renderCartItems();
    });

    // Manejo del formulario
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (validateShippingAddress()) {
                // Si la dirección es válida, muestra el modal de pago
                if (checkoutModal) checkoutModal.classList.remove('hidden');
                // No llamamos a la función de pago directamente aquí. Los botones de PayPal se encargarán.
            }
        });
    }

    // Manejo del botón para cerrar el modal
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            if (checkoutModal) checkoutModal.classList.add('hidden');
        });
    }
});
