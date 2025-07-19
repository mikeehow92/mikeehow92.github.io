// js/perfil.js

// Importa las funciones necesarias de Firebase Auth, Firestore y Storage
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

document.addEventListener('DOMContentLoaded', () => {
    // Elementos del encabezado
    const loginButton = document.getElementById('loginButton');
    const loggedInUserDisplay = document.getElementById('loggedInUserDisplay');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const navCarrito = document.getElementById('navCarrito');
    // const navPerfil = document.getElementById('navPerfil'); // Se comenta o elimina ya que el elemento se quitará del HTML
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

    // Elementos del modal de selección de avatar
    const selectAvatarButton = document.getElementById('selectAvatarButton');
    const avatarModal = document.getElementById('avatarModal');
    const closeModalButton = document.getElementById('closeModalButton');
    const avatarGallery = document.getElementById('avatarGallery');
    const loadingAvatarsMessage = document.getElementById('loadingAvatarsMessage');
    const errorAvatarsMessage = document.getElementById('errorAvatarsMessage');
    const noAvatarsMessage = document.getElementById('noAvatarsMessage');

    // Referencias de Firebase
    const auth = window.firebaseAuth;
    const db = window.firebaseDb;
    const app = window.firebaseApp;
    const storage = app ? getStorage(app) : null; // Inicializa Storage solo si app está disponible

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
        // Lógica adicional específica de UI para perfil.html si es necesaria
    };

    // Manejo del estado de autenticación en el encabezado
    if (auth) {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                loginButton.classList.add('hidden');
                loggedInUserDisplay.classList.remove('hidden');
                userNameDisplay.textContent = user.displayName || user.email || 'Tu Usuario';
                // navPerfil.classList.remove('hidden'); // Se comenta o elimina ya que el elemento se quitará del HTML

                // Cargar datos del perfil y pedidos
                await loadUserProfile(user);
                await loadRecentOrders(user.uid); // Pasar el UID del usuario logueado

            } else {
                // Usuario no logueado, redirigir a la página de inicio de sesión
                window.showAlert('Debes iniciar sesión para ver tu perfil.', 'info');
                window.location.href = 'login.html';
            }
            window.updateCartDisplay(); // Llama a la función para actualizar el contador al cambiar el estado de autenticación
        });
    } else {
        console.warn("Firebase Auth no está inicializado. La funcionalidad de autenticación en el encabezado no estará disponible.");
        // navPerfil.classList.add('hidden'); // Se comenta o elimina ya que el elemento se quitará del HTML
        window.showAlert("Error: Firebase Auth no está disponible. Redirigiendo a inicio de sesión.", "error");
        window.location.href = 'login.html';
        window.updateCartDisplay(); // Llama a la función para actualizar el contador incluso sin autenticación
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

        // Cargar datos adicionales del perfil desde Firestore (si los guardaste al registrar)
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                profileName.textContent = userData.fullName || user.displayName || 'Usuario';
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
            // --- CAMBIO CLAVE AQUÍ: Leer de la subcolección de órdenes del usuario ---
            const ordersCollectionRef = collection(db, "users", userId, "orders"); // Ruta correcta
            const q = query(ordersCollectionRef, orderBy("timestamp", "desc")); // Asegúrate de que 'timestamp' sea el campo de fecha de la orden
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                noOrdersMessage.classList.remove('hidden');
                return;
            }

            querySnapshot.forEach((doc) => {
                const order = doc.data();
                // Usar 'timestamp' de la Cloud Function
                const orderDate = order.timestamp && typeof order.timestamp.toDate === 'function' ? order.timestamp.toDate().toLocaleDateString() : 'N/A';
                const orderStatus = order.estado || 'Pendiente'; // Usar 'estado' de la Cloud Function
                const orderTotal = order.total ? `$${order.total.toFixed(2)}` : '$0.00';

                let productsHtml = '';
                if (order.items && Array.isArray(order.items)) {
                    productsHtml = order.items.map(item => `<li>${item.name} (x${item.quantity})</li>`).join('');
                }

                const orderHtml = `
                    <div class="border border-gray-200 p-4 rounded-md">
                        <p class="font-bold">Pedido #${doc.id.substring(0, 8)} - <span class="${orderStatus === 'entregado' ? 'text-green-600' : 'text-orange-500'}">${orderStatus}</span></p>
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

    // Event listeners para abrir/cerrar el modal
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

    // Cerrar modal al hacer clic fuera de él
    avatarModal.addEventListener('click', (event) => {
        if (event.target === avatarModal) {
            avatarModal.classList.add('hidden');
        }
    });
});
