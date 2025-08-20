// js/perfil.js

// Importa las funciones necesarias de Firebase Auth, Firestore y Storage
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

document.addEventListener('DOMContentLoaded', () => {
    // Elementos del encabezado
    const loginButton = document.getElementById('loginButton');
    const loggedInUserDisplay = document.getElementById('loggedInUserDisplay');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const navCarrito = document.getElementById('navCarrito');
    const logoutButtonHeader = document.getElementById('logoutButtonHeader');
    const cartItemCountElement = document.getElementById('cartItemCount'); // Obtener el elemento del contador de ítems del carrito

    // Elementos del cuerpo principal del perfil
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileLastLogin = document.getElementById('profileLastLogin');
    const profileAvatar = document.getElementById('profileAvatar');
    const ordersList = document.getElementById('ordersList');
    const noOrdersMessage = document.getElementById('noOrdersMessage');
    const logoutButtonProfile = document.getElementById('logoutButtonProfile');
    const mainContent = document.querySelector('main');
    const loadingMessage = document.getElementById('loadingMessage'); // Asume que tienes un mensaje de carga

    // Elementos de visualización de dirección
    const profilePhone = document.getElementById('profilePhone');
    const profileDepartment = document.getElementById('profileDepartment');
    const profileMunicipality = document.getElementById('profileMunicipality');
    const profileAddress = document.getElementById('profileAddress');
    const editAddressButton = document.getElementById('editAddressButton'); // Nuevo botón para editar dirección

    // Elementos del modal de selección de avatar
    const selectAvatarButton = document.getElementById('selectAvatarButton');
    const avatarModal = document.getElementById('avatarModal');
    const closeModalButton = document.getElementById('closeModalButton');
    const avatarGallery = document.getElementById('avatarGallery');
    const loadingAvatarsMessage = document.getElementById('loadingAvatarsMessage');
    const errorAvatarsMessage = document.getElementById('errorAvatarsMessage');
    const noAvatarsMessage = document.getElementById('noAvatarsMessage');

    // Elementos del modal de edición de dirección
    const addressModal = document.getElementById('addressModal');
    const closeAddressModalButton = document.getElementById('closeAddressModalButton');
    const editAddressForm = document.getElementById('editAddressForm');
    const editPhone = document.getElementById('editPhone');
    const editDepartment = document.getElementById('editDepartment');
    const editMunicipality = document.getElementById('editMunicipality');
    const editAddress = document.getElementById('editAddress');
    const saveAddressButton = document.getElementById('saveAddressButton');

    // Referencias de Firebase
    const auth = window.firebaseAuth;
    const db = window.firebaseDb;
    const app = window.firebaseApp;
    const storage = app ? getStorage(app) : null; // Inicializa Storage solo si app está disponible

    // Datos de Departamentos y Municipios de El Salvador (ejemplo, duplicado para perfil.js)
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

    // Función para cargar departamentos en el select de edición
    function loadDepartments(selectElement) {
        selectElement.innerHTML = '<option value="">Seleccione un departamento</option>';
        for (const dept in departmentsAndMunicipalities) {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            selectElement.appendChild(option);
        }
    }

    // Función para cargar municipios basado en el departamento seleccionado en el select de edición
    function loadMunicipalities(selectElement, department, selectedMunicipality = '') {
        selectElement.innerHTML = '<option value="">Seleccione un municipio</option>';
        selectElement.disabled = true;

        if (department && departmentsAndMunicipalities[department]) {
            departmentsAndMunicipalities[department].forEach(muni => {
                const option = document.createElement('option');
                option.value = muni;
                option.textContent = muni;
                selectElement.appendChild(option);
            });
            selectElement.disabled = false;
            // Seleccionar el municipio si se proporciona
            if (selectedMunicipality) {
                selectElement.value = selectedMunicipality;
            }
        } else {
            selectElement.innerHTML = '<option value="">Primero seleccione un departamento</option>';
        }
    }

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
        updateCartCountDisplay();
    };

    // Manejo del estado de autenticación en el encabezado
    // La lógica de redirección se maneja exclusivamente dentro de onAuthStateChanged
    // para evitar redirecciones prematuras.
    if (auth) {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Si hay un usuario logueado
                loginButton.classList.add('hidden');
                loggedInUserDisplay.classList.remove('hidden');
                userNameDisplay.textContent = user.displayName || user.email || 'Tu Usuario';
                
                // Mostrar el contenido principal y ocultar el mensaje de carga
                if (mainContent) mainContent.classList.remove('hidden');
                if (loadingMessage) loadingMessage.classList.add('hidden');

                // Cargar datos del perfil y pedidos
                await loadUserProfile(user);
                await loadRecentOrders(user.uid); // Pasar el UID del usuario logueado

            } else {
                // Si no hay un usuario logueado
                console.warn("Usuario no autenticado, redirigiendo a login.");
                window.showAlert('Debes iniciar sesión para ver tu perfil.', 'info');
                window.location.href = 'login.html';
            }
            window.updateCartDisplay(); // Llama a la función para actualizar el contador al cambiar el estado de autenticación
        });
    } else {
        // En caso de que Firebase Auth no se haya inicializado por algún error
        console.error("Firebase Auth no está disponible. Asegúrate de que common.js se carga correctamente.");
        window.showAlert("Error: Firebase Auth no está disponible. Redirigiendo a inicio de sesión.", "error");
        window.location.href = 'login.html';
    }


    // Función para manejar el cierre de sesión (usada por ambos botones de logout)
    async function handleLogout() {
        if (auth) {
            try {
                await signOut(auth);
                window.showAlert('Has cerrado sesión correctamente.', 'success');
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Error al cerrar sesión:', error.message);
                window.showAlert('Error al cerrar sesión. Por favor, inténtalo de nuevo.', 'error');
            }
        } else {
            window.showAlert('Firebase Auth no está disponible para cerrar sesión.', 'error');
        }
    }

    // Event listeners para botones de encabezado
    if (loginButton) loginButton.addEventListener('click', () => { window.location.href = 'login.html'; });
    if (logoutButtonHeader) logoutButtonHeader.addEventListener('click', handleLogout);
    if (logoutButtonProfile) logoutButtonProfile.addEventListener('click', handleLogout);

    // Función para cargar datos del perfil del usuario
    async function loadUserProfile(user) {
        profileName.textContent = user.displayName || 'Cargando Nombre...';
        profileEmail.textContent = user.email || 'Cargando Correo...';
        profileLastLogin.textContent = user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'N/A';

        // Cargar avatar: 우선순위: user.photoURL -> Storage (UID.png/jpg) -> Placeholder
        if (user.photoURL) {
            profileAvatar.src = user.photoURL;
        } else {
            const avatarPathPng = `avatars/${user.uid}.png`;
            const avatarPathJpg = `avatars/${user.uid}.jpg`;

            try {
                const avatarRefPng = ref(storage, avatarPathPng);
                const avatarUrl = await getDownloadURL(avatarRefPng);
                profileAvatar.src = avatarUrl;
            } catch (pngError) {
                try {
                    const avatarRefJpg = ref(storage, avatarPathJpg);
                    const avatarUrl = await getDownloadURL(avatarRefJpg);
                    profileAvatar.src = avatarUrl;
                } catch (jpgError) {
                    console.warn(`No se encontró avatar por UID para ${user.uid} (.png o .jpg). Usando placeholder.`, pngError.code, jpgError.code);
                    profileAvatar.src = 'https://placehold.co/150x150/F0F0F0/333333?text=Avatar';
                }
            }
        }

        // Cargar datos adicionales del perfil desde Firestore (incluyendo dirección)
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                profileName.textContent = userData.fullName || user.displayName || 'Usuario';
                profilePhone.textContent = userData.phone || 'N/A';
                profileDepartment.textContent = userData.department || 'N/A';
                profileMunicipality.textContent = userData.municipality || 'N/A';
                profileAddress.textContent = userData.address || 'N/A';

                // Precargar el modal de edición de dirección con los datos actuales
                editPhone.value = userData.phone || '';
                loadDepartments(editDepartment); // Cargar departamentos
                editDepartment.value = userData.department || ''; // Seleccionar departamento actual
                loadMunicipalities(editMunicipality, userData.department, userData.municipality); // Cargar y seleccionar municipio
                editAddress.value = userData.address || '';

            } else {
                console.warn("No se encontraron datos adicionales del perfil en Firestore para el usuario:", user.uid);
                profilePhone.textContent = 'No disponible';
                profileDepartment.textContent = 'No disponible';
                profileMunicipality.textContent = 'No disponible';
                profileAddress.textContent = 'No disponible';
            }
        } catch (error) {
            console.error("Error al cargar datos adicionales del perfil desde Firestore:", error);
            window.showAlert("Error al cargar información adicional del perfil.", "error");
        }
    }

    // Función para cargar pedidos recientes
    async function loadRecentOrders(userId) {
        ordersList.innerHTML = '';
        noOrdersMessage.classList.add('hidden');

        try {
            const ordersCollectionRef = collection(db, "users", userId, "orders"); // Ruta correcta
            const querySnapshot = await getDocs(ordersCollectionRef);

            if (querySnapshot.empty) {
                noOrdersMessage.classList.remove('hidden');
                return;
            }

            const orders = [];
            querySnapshot.forEach((doc) => {
                orders.push({ id: doc.id, ...doc.data() });
            });

            orders.sort((a, b) => {
                const dateA = a.timestamp && typeof a.timestamp.toDate === 'function' ? a.timestamp.toDate() : new Date(0);
                const dateB = b.timestamp && typeof b.timestamp.toDate === 'function' ? b.timestamp.toDate() : new Date(0);
                return dateB - dateA; // Orden descendente
            });

            orders.forEach((order) => {
                let orderDate = 'N/A';
                if (order.timestamp && typeof order.timestamp.toDate === 'function') {
                    // Si el campo es un Timestamp de Firestore, convertirlo a una fecha legible
                    orderDate = order.timestamp.toDate().toLocaleDateString('es-ES', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    });
                } else if (order.fechaOrden) {
                    // Si el campo es una cadena de texto, usarlo directamente
                    orderDate = order.fechaOrden;
                }
                
                const orderStatus = order.estado || 'Pendiente';
                const orderTotal = order.total ? `$${order.total.toFixed(2)}` : '$0.00';

                let productsHtml = '';
                if (order.items && Array.isArray(order.items)) {
                    productsHtml = order.items.map(item => `<li>${item.name} (x${item.quantity})</li>`).join('');
                }

                const orderHtml = `
                    <div class="border border-gray-200 p-4 rounded-md">
                        <p class="font-bold">Pedido #${order.id.substring(0, 8)} - <span class="${orderStatus === 'entregado' ? 'text-green-600' : 'text-orange-500'}">${orderStatus}</span></p>
                        <p class="text-gray-700">Fecha: ${orderDate}</p>
                        <p class="text-gray-700">Total: ${orderTotal}</p>
                        <ul class="list-disc list-inside text-sm text-gray-600 mt-2">
                            ${productsHtml}
                        </ul>
                    </div>
                `;
                ordersList.innerHTML += orderHtml;
            });

        } catch (error) {
            console.error("Error al cargar pedidos:", error);
            window.showAlert("Error al cargar tus pedidos recientes: " + error.message, "error"); // Mostrar mensaje de error más específico
            noOrdersMessage.textContent = "Error al cargar pedidos.";
            noOrdersMessage.classList.remove('hidden');
        }
    }

    // --- Lógica para el Modal de Selección de Avatar ---

    // Función para cargar avatares predeterminados desde Storage
    async function loadPredeterminedAvatars() {
        avatarGallery.innerHTML = ''; // Limpiar galería
        loadingAvatarsMessage.classList.remove('hidden');
        errorAvatarsMessage.classList.add('hidden');
        noAvatarsMessage.classList.add('hidden');

        if (!storage) {
            errorAvatarsMessage.textContent = "Error: Firebase Storage no está inicializado.";
            errorAvatarsMessage.classList.remove('hidden');
            loadingAvatarsMessage.classList.add('hidden');
            return;
        }

        try {
            const avatarsRef = ref(storage, 'avatars'); // Referencia a la carpeta 'avatars'
            const result = await listAll(avatarsRef); // Listar todos los ítems en la carpeta

            if (result.items.length === 0) {
                noAvatarsMessage.classList.remove('hidden');
                loadingAvatarsMessage.classList.add('hidden');
                return;
            }

            for (const itemRef of result.items) {
                const url = await getDownloadURL(itemRef);
                const avatarImg = document.createElement('img');
                avatarImg.src = url;
                avatarImg.alt = itemRef.name;
                avatarImg.className = 'w-24 h-24 object-cover rounded-full cursor-pointer border-2 border-transparent hover:border-blue-500 transition duration-200';
                avatarImg.dataset.avatarUrl = url; // Guardar la URL para fácil acceso al seleccionar

                avatarImg.addEventListener('click', async () => {
                    // Actualizar el avatar del perfil
                    profileAvatar.src = url;
                    // Actualizar photoURL en Firebase Auth para persistencia
                    if (auth.currentUser) {
                        try {
                            await updateProfile(auth.currentUser, { photoURL: url });
                            window.showAlert('Avatar actualizado con éxito.', 'success');
                        } catch (error) {
                            console.error('Error al actualizar photoURL en Auth:', error);
                            window.showAlert('Error al guardar el avatar en tu perfil.', 'error');
                        }
                    }
                    avatarModal.classList.add('hidden'); // Cerrar el modal
                });
                avatarGallery.appendChild(avatarImg);
            }
            loadingAvatarsMessage.classList.add('hidden'); // Ocultar mensaje de carga
        } catch (error) {
            console.error('Error al listar avatares de Storage:', error);
            errorAvatarsMessage.textContent = `Error al cargar avatares: ${error.message}. Verifica las reglas de Storage.`;
            errorAvatarsMessage.classList.remove('hidden');
            loadingAvatarsMessage.classList.add('hidden');
        }
    }

    // Event listeners para abrir/cerrar el modal de avatar
    if (selectAvatarButton) {
        selectAvatarButton.addEventListener('click', () => {
            avatarModal.classList.remove('hidden');
            loadPredeterminedAvatars(); // Cargar avatares cada vez que se abre el modal
        });
    }

    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => {
            avatarModal.classList.add('hidden');
        });
    }

    // Cerrar modal de avatar al hacer clic fuera de él
    avatarModal.addEventListener('click', (event) => {
        if (event.target === avatarModal) {
            avatarModal.classList.add('hidden');
        }
    });

    // --- Lógica para el Modal de Edición de Dirección ---

    // Event listener para abrir el modal de edición de dirección
    if (editAddressButton) {
        editAddressButton.addEventListener('click', () => {
            addressModal.classList.remove('hidden');
            // Asegurarse de que los datos actuales del usuario estén cargados en el formulario
            // Esto ya se hace en loadUserProfile, pero se puede llamar explícitamente si es necesario
            if (auth.currentUser) {
                loadUserProfile(auth.currentUser); // Recargar para asegurar que los campos estén llenos
            }
        });
    }

    // Event listener para cerrar el modal de edición de dirección
    if (closeAddressModalButton) {
        closeAddressModalButton.addEventListener('click', () => {
            addressModal.classList.add('hidden');
        });
    }

    // Cerrar modal de edición de dirección al hacer clic fuera de él
    if (addressModal) {
        addressModal.addEventListener('click', (event) => {
            if (event.target === addressModal) {
                addressModal.classList.add('hidden');
            }
        });
    }

    // Event listener para el cambio de departamento en el modal de edición
    editDepartment.addEventListener('change', (event) => {
        loadMunicipalities(editMunicipality, event.target.value);
    });

    // Manejo del envío del formulario de edición de dirección
    if (editAddressForm) {
        editAddressForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Previene el envío por defecto del formulario

            const user = auth.currentUser;
            if (!user) {
                window.showAlert('No hay usuario autenticado para actualizar la dirección.', 'error');
                return;
            }

            const newPhone = editPhone.value.trim();
            const newDepartment = editDepartment.value;
            const newMunicipality = editMunicipality.value;
            const newAddress = editAddress.value.trim();

            // Validaciones básicas
            if (!newPhone || !newDepartment || !newMunicipality || !newAddress) {
                window.showAlert('Todos los campos de dirección son obligatorios.', 'error');
                return;
            }

            try {
                const userDocRef = doc(db, "users", user.uid);
                await updateDoc(userDocRef, {
                    phone: newPhone,
                    department: newDepartment,
                    municipality: newMunicipality,
                    address: newAddress
                });

                window.showAlert('Dirección actualizada con éxito.', 'success');
                addressModal.classList.add('hidden'); // Cerrar el modal
                await loadUserProfile(user); // Recargar los datos del perfil para mostrar los cambios
            } catch (error) {
                console.error('Error al actualizar la dirección en Firestore:', error);
                window.showAlert('Error al guardar la dirección. Por favor, inténtalo de nuevo.', 'error');
            }
        });
    }

    // Cargar los departamentos iniciales para el modal de edición
    loadDepartments(editDepartment);
});
