// js/pago.js

// Importa las funciones necesarias de Firebase Auth, Firestore y Storage.
// Es crucial que estos imports apunten a las rutas correctas del CDN.
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

// Esta es la solución principal: se asegura de que todo el DOM y los scripts
// (incluyendo common.js) estén cargados antes de ejecutar cualquier lógica.
document.addEventListener('DOMContentLoaded', () => {

    // Esperar a que la instancia de Firebase esté disponible
    // Esta es una solución más robusta que solo esperar a 'DOMContentLoaded'
    function waitForFirebase() {
        return new Promise(resolve => {
            const check = () => {
                // Chequeamos si la instancia de Firebase y las funciones del carrito están definidas
                if (window.firebase && typeof window.getCart === 'function') {
                    resolve({
                        db: window.firebase.db,
                        auth: window.firebase.auth
                    });
                } else {
                    // Si no están listas, esperamos un poco y volvemos a intentar
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    // Inicia toda la lógica de la página de pago solo cuando Firebase esté listo
    waitForFirebase().then(({ db, auth }) => {

        // Referencias a los elementos del DOM
        const shippingDepartmentSelect = document.getElementById('shippingDepartment');
        const shippingMunicipalitySelect = document.getElementById('shippingMunicipality');
        const shippingDetailsForm = document.getElementById('shippingDetailsForm');
        const paypalButtonContainer = document.getElementById('paypal-button-container');
        const cartItemsContainer = document.getElementById('cartItemsContainer');
        const cartTotalElement = document.getElementById('cartTotal');
        const emptyCartMessage = document.getElementById('emptyCartMessage');
        const logoutButton = document.getElementById('logoutButton');
        const profileAvatarHeader = document.getElementById('profileAvatarHeader');
        
        // Manejo del botón "Cerrar Sesión"
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                if (auth) {
                    try {
                        await signOut(auth);
                        window.showAlert('Has cerrado sesión correctamente.', 'success');
                        window.location.reload(); // Recarga la página para reflejar el estado de logout
                    } catch (error) {
                        console.error('Error al cerrar sesión:', error.message);
                        window.showAlert('Error al cerrar sesión. Por favor, inténtalo de nuevo.', 'error');
                    }
                } else {
                    window.showAlert('Firebase Auth no está disponible para cerrar sesión.', 'error');
                }
            });
        }

        // Rellenar el select de departamentos
        function populateDepartments() {
            if (!shippingDepartmentSelect) return;
            shippingDepartmentSelect.innerHTML = '<option value="">Seleccione un departamento</option>';
            Object.keys(departmentsAndMunicipalities).forEach(department => {
                const option = document.createElement('option');
                option.value = department;
                option.textContent = department;
                shippingDepartmentSelect.appendChild(option);
            });
        }

        // Actualizar el select de municipios basado en el departamento seleccionado
        function updateMunicipalities() {
            if (!shippingDepartmentSelect || !shippingMunicipalitySelect) return;
            const selectedDepartment = shippingDepartmentSelect.value;
            const municipalities = departmentsAndMunicipalities[selectedDepartment] || [];
            shippingMunicipalitySelect.innerHTML = '<option value="">Seleccione un municipio</option>';
            if (municipalities.length > 0) {
                shippingMunicipalitySelect.disabled = false;
                municipalities.forEach(municipality => {
                    const option = document.createElement('option');
                    option.value = municipality;
                    option.textContent = municipality;
                    shippingMunicipalitySelect.appendChild(option);
                });
            } else {
                shippingMunicipalitySelect.disabled = true;
            }
        }

        // Función para renderizar los botones de PayPal
        function renderPayPalButtons() {
            const cart = window.getCart();
            const total = window.getCartTotal();

            if (!paypalButtonContainer) return;

            if (cart.length === 0) {
                paypalButtonContainer.innerHTML = '<p class="text-center text-gray-500">Tu carrito está vacío, no se puede proceder al pago.</p>';
                return;
            }

            paypalButtonContainer.innerHTML = '';
            paypal.Buttons({
                createOrder: function(data, actions) {
                    if (!shippingDetailsForm || !shippingDetailsForm.checkValidity()) {
                        window.showAlert('Por favor, completa todos los campos del formulario de envío.', 'error');
                        return actions.reject();
                    }
                    return actions.order.create({
                        purchase_units: [{
                            amount: {
                                currency_code: 'USD',
                                value: total.toFixed(2),
                            }
                        }]
                    });
                },
                onApprove: function(data, actions) {
                    return actions.order.capture().then(function(details) {
                        window.showAlert('¡Pago completado con éxito! Procesando tu pedido...', 'success');
                        window.clearCart();
                        setTimeout(() => { window.location.href = 'confirmation.html'; }, 2000);
                    });
                },
                onCancel: function(data) {
                    window.showAlert('Has cancelado el pago.', 'info');
                },
                onError: function(err) {
                    console.error('Error de PayPal:', err);
                    window.showAlert('Ocurrió un error con el pago de PayPal. Inténtalo de nuevo.', 'error');
                }
            }).render('#paypal-button-container');
        }

        // Reemplaza la función global de common.js para la página de pago
        window.updateCartDisplay = () => {
            const cart = window.getCart();
            const total = window.getCartTotal();
            
            if (cartItemsContainer) {
                cartItemsContainer.innerHTML = '';
                if (cart.length === 0) {
                    if (emptyCartMessage) emptyCartMessage.classList.remove('hidden');
                } else {
                    if (emptyCartMessage) emptyCartMessage.classList.add('hidden');
                    
                    cart.forEach(item => {
                        const itemElement = document.createElement('div');
                        itemElement.className = 'flex justify-between items-center py-2 border-b border-gray-200';
                        itemElement.innerHTML = `
                            <div class="flex items-center space-x-4">
                                <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded-md shadow">
                                <div>
                                    <p class="font-semibold text-gray-900">${item.name}</p>
                                    <p class="text-gray-600">Cantidad: ${item.quantity}</p>
                                    <p class="text-sm font-bold text-blue-600">$${(item.price).toFixed(2)} c/u</p>
                                </div>
                            </div>
                            <span class="font-bold text-gray-900">$${(item.price * item.quantity).toFixed(2)}</span>
                        `;
                        cartItemsContainer.appendChild(itemElement);
                    });
                }
            }

            if (cartTotalElement) {
                cartTotalElement.textContent = `$${total.toFixed(2)}`;
            }
            
            renderPayPalButtons();
        };

        // Escuchar cambios en la autenticación para rellenar el formulario de envío
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log("Usuario autenticado en la página de pagos:", user.uid);
                
                // Actualiza el avatar del perfil si es necesario
                if (profileAvatarHeader) {
                     const userDocRef = doc(db, "users", user.uid);
                     const userDoc = await getDoc(userDocRef);
                     if (userDoc.exists()) {
                         const userData = userDoc.data();
                         if (userData.profileImageUrl) {
                            profileAvatarHeader.src = userData.profileImageUrl;
                         } else {
                            // Si no hay imagen, usa la inicial del nombre
                            const firstLetter = (userData.displayName || user.email || 'A').charAt(0).toUpperCase();
                            profileAvatarHeader.src = `https://placehold.co/40x40/F0F0F0/333333?text=${firstLetter}`;
                         }
                         const shippingFullNameInput = document.getElementById('shippingFullName');
                         const shippingEmailInput = document.getElementById('shippingEmail');
                         const shippingPhoneInput = document.getElementById('shippingPhone');

                         if (shippingFullNameInput) shippingFullNameInput.value = userData.displayName || '';
                         if (shippingEmailInput) shippingEmailInput.value = userData.email || '';
                         if (shippingPhoneInput) shippingPhoneInput.value = userData.phone || '';
                     }
                }
            } else {
                console.log("Usuario no autenticado en la página de pagos.");
                // Limpiar el formulario si el usuario cierra sesión
                if (shippingDetailsForm) shippingDetailsForm.reset();
            }
            
            // Llamada inicial para asegurar que el carrito se renderiza
            window.updateCartDisplay();
        });

        // Carga inicial de datos de la página
        populateDepartments();
        if (shippingDepartmentSelect) {
            shippingDepartmentSelect.addEventListener('change', updateMunicipalities);
        }
        updateMunicipalities();

        // Carga el SDK de PayPal
        window.loadPayPalSDK = () => {
            // Verifica si el SDK ya ha sido cargado para no duplicarlo
            if (!document.querySelector('script[src*="paypal.com/sdk"]')) {
                const paypalScript = document.createElement('script');
                paypalScript.src = "https://www.paypal.com/sdk/js?client-id=TU_CLIENTE_ID_DE_PAYPAL&currency=USD";
                paypalScript.id = 'paypal-sdk-script';
                document.body.appendChild(paypalScript);
                paypalScript.onload = () => {
                    console.log("PayPal SDK ha sido cargado.");
                    const event = new Event('paypalSDKLoaded');
                    document.dispatchEvent(event);
                };
            }
        };
        
        // Escucha el evento 'paypalSDKLoaded' para renderizar los botones
        document.addEventListener('paypalSDKLoaded', () => {
            console.log('Evento paypalSDKLoaded disparado. Renderizando botones.');
            renderPayPalButtons();
        });
        
        // Dispara la carga del SDK
        window.loadPayPalSDK();
    });
});
