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
    const cartItemCountElement = document.getElementById('cartItemCount');


    // Elementos del cuerpo principal del perfil
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileLastLogin = document.getElementById('profileLastLogin');
    const profileAvatar = document.getElementById('profileAvatar');
    const ordersList = document.getElementById('ordersList');
    const noOrdersMessage = document.getElementById('noOrdersMessage');
    const logoutButtonProfile = document.getElementById('logoutButtonProfile');

    // Elementos de visualización de dirección
    const profilePhone = document.getElementById('profilePhone');
    const profileDepartment = document.getElementById('profileDepartment');
    const profileMunicipality = document.getElementById('profileMunicipality');
    const profileAddress = document.getElementById('profileAddress');
    const editAddressButton = document.getElementById('editAddressButton');

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
    const editPhone = document = document.getElementById('editPhone');
    const editDepartment = document.getElementById('editDepartment');
    const editMunicipality = document.getElementById('editMunicipality');
    const editAddress = document.getElementById('editAddress');
    const saveAddressButton = document.getElementById('saveAddressButton');

    // Referencias de Firebase
    const auth = window.firebaseAuth;
    const db = window.firebaseDb;
    const app = window.firebaseApp;
    const storage = app ? getStorage(app) : null;

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
        const cart = window.getCart();
        const totalItemsInCart = cart.reduce((total, item) => total + item.quantity, 0);
        if (cartItemCountElement) {
            cartItemCountElement.textContent = totalItemsInCart;
            if (totalItemsInCart > 0) {
                cartItemCountElement.classList.remove('hidden');
            } else {
                cartItemCountElement.classList.add('hidden');
            }
        }
        if (navCarrito) {
            navCarrito.classList.remove('hidden');
        }
    }

    window.updateCartDisplay = function() {
        updateCartCountDisplay();
    };

    if (auth) {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                loginButton.classList.add('hidden');
                loggedInUserDisplay.classList.remove('hidden');
                userNameDisplay.textContent = user.displayName || user.email || 'Tu Usuario';

                await loadUserProfile(user);
                await loadRecentOrders(user.uid);

            } else {
                // *** SE ELIMINA LA REDIRECCIÓN A login.html AQUÍ ***
                // Esto evita el bucle de redirección en caso de que la sesión se cargue con un pequeño retraso.
                // La redirección para usuarios no autenticados debe estar en el flujo de la aplicación.
                console.log("Usuario no autenticado, no se redirige desde perfil.js");
            }
            window.updateCartDisplay();
        });
    } else {
        console.warn("Firebase Auth no está inicializado. La funcionalidad de autenticación en el encabezado no estará disponible.");
        window.showAlert("Error: Firebase Auth no está disponible. Redirigiendo a inicio de sesión.", "error");
        window.location.href = 'login.html';
        window.updateCartDisplay();
    }

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

    if (loginButton) loginButton.addEventListener('click', () => { window.location.href = 'login.html'; });
    if (logoutButtonHeader) logoutButtonHeader.addEventListener('click', handleLogout);
    if (logoutButtonProfile) logoutButtonProfile.addEventListener('click', handleLogout);

    async function loadUserProfile(user) {
        profileName.textContent = user.displayName || 'Cargando Nombre...';
        profileEmail.textContent = user.email || 'Cargando Correo...';
        profileLastLogin.textContent = user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'N/A';

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

                editPhone.value = userData.phone || '';
                loadDepartments(editDepartment);
                editDepartment.value = userData.department || '';
                loadMunicipalities(editMunicipality, userData.department, userData.municipality);
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

    async function loadRecentOrders(userId) {
        ordersList.innerHTML = '';
        noOrdersMessage.classList.add('hidden');

        try {
            const ordersCollectionRef = collection(db, "users", userId, "orders");
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
                const dateA = a.fechaOrden && typeof a.fechaOrden.toDate === 'function' ? a.fechaOrden.toDate() : new Date(0);
                const dateB = b.fechaOrden && typeof b.fechaOrden.toDate === 'function' ? b.fechaOrden.toDate() : new Date(0);
                return dateB - dateA;
            });

            orders.forEach((order) => {
                const orderDate = order.fechaOrden && typeof order.fechaOrden.toDate === 'function' ? order.fechaOrden.toDate().toLocaleDateString() : 'N/A';
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
            window.showAlert("Error al cargar tus pedidos recientes: " + error.message, "error");
            noOrdersMessage.textContent = "Error al cargar pedidos.";
            noOrdersMessage.classList.remove('hidden');
        }
    }

    async function loadPredeterminedAvatars() {
        avatarGallery.innerHTML = '';
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
            const avatarsRef = ref(storage, 'avatars');
            const result = await listAll(avatarsRef);

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
                avatarImg.dataset.avatarUrl = url;

                avatarImg.addEventListener('click', async () => {
                    profileAvatar.src = url;
                    if (auth.currentUser) {
                        try {
                            await updateProfile(auth.currentUser, { photoURL: url });
                            window.showAlert('Avatar actualizado con éxito.', 'success');
                        } catch (error) {
                            console.error('Error al actualizar photoURL en Auth:', error);
                            window.showAlert('Error al guardar el avatar en tu perfil.', 'error');
                        }
                    }
                    avatarModal.classList.add('hidden');
                });
                avatarGallery.appendChild(avatarImg);
            }
            loadingAvatarsMessage.classList.add('hidden');
        } catch (error) {
            console.error('Error al listar avatares de Storage:', error);
            errorAvatarsMessage.textContent = `Error al cargar avatares: ${error.message}. Verifica las reglas de Storage.`;
            errorAvatarsMessage.classList.remove('hidden');
            loadingAvatarsMessage.classList.add('hidden');
        }
    }

    if (selectAvatarButton) {
        selectAvatarButton.addEventListener('click', () => {
            avatarModal.classList.remove('hidden');
            loadPredeterminedAvatars();
        });
    }

    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => {
            avatarModal.classList.add('hidden');
        });
    }

    avatarModal.addEventListener('click', (event) => {
        if (event.target === avatarModal) {
            avatarModal.classList.add('hidden');
        }
    });

    if (editAddressButton) {
        editAddressButton.addEventListener('click', () => {
            addressModal.classList.remove('hidden');
            if (auth.currentUser) {
                loadUserProfile(auth.currentUser);
            }
        });
    }

    if (closeAddressModalButton) {
        closeAddressModalButton.addEventListener('click', () => {
            addressModal.classList.add('hidden');
        });
    }

    if (addressModal) {
        addressModal.addEventListener('click', (event) => {
            if (event.target === addressModal) {
                addressModal.classList.add('hidden');
            }
        });
    }

    editDepartment.addEventListener('change', (event) => {
        loadMunicipalities(editMunicipality, event.target.value);
    });

    if (editAddressForm) {
        editAddressForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const user = auth.currentUser;
            if (!user) {
                window.showAlert('No hay usuario autenticado para actualizar la dirección.', 'error');
                return;
            }

            const newPhone = editPhone.value.trim();
            const newDepartment = editDepartment.value;
            const newMunicipality = editMunicipality.value;
            const newAddress = editAddress.value.trim();

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
                addressModal.classList.add('hidden');
                await loadUserProfile(user);
            } catch (error) {
                console.error('Error al actualizar la dirección en Firestore:', error);
                window.showAlert('Error al guardar la dirección. Por favor, inténtalo de nuevo.', 'error');
            }
        });
    }

    loadDepartments(editDepartment);
});
