// js/detalle-producto.js

// Importa las funciones necesarias de Firebase Firestore, Auth y Storage
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js"; // Importar Storage

document.addEventListener('DOMContentLoaded', async () => {
    // Asegúrate de que Firebase Firestore esté inicializado en common.js
    const db = window.firebaseDb;

    const productDetailContainer = document.getElementById('productDetailContainer');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    const notFoundMessage = document.getElementById('notFoundMessage');

    // Elementos del encabezado para el estado de autenticación
    const loginButton = document.getElementById('loginButton');
    const loggedInUserDisplay = document.getElementById('loggedInUserDisplay');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const profileAvatarHeader = document.getElementById('profileAvatarHeader'); // Elemento para el avatar en el header
    const logoutButton = document.getElementById('logoutButton');
    const navCarrito = document.getElementById('navCarrito');
    // const navPerfil = document.getElementById('navPerfil'); // Ya no se necesita esta referencia ya que el elemento fue eliminado del HTML
    const cartItemCountElement = document.getElementById('cartItemCount'); // Obtener el elemento del contador de ítems del carrito

    // Obtener referencias de Firebase
    const auth = window.firebaseAuth;
    const app = window.firebaseApp;
    const storage = app ? getStorage(app) : null; // Inicializa Storage solo si app está disponible

    // Función para mostrar solo un mensaje a la vez
    const showMessage = (elementToShow) => {
        [loadingMessage, errorMessage, notFoundMessage].forEach(el => el.classList.add('hidden'));
        if (elementToShow) {
            elementToShow.classList.remove('hidden');
        }
    };

    // Ocultar todos los mensajes al inicio, excepto el de carga
    showMessage(loadingMessage);

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
        // Lógica adicional específica de UI para detalle-producto.html si es necesaria
    };

    // Manejo del estado de autenticación en el encabezado
    if (auth) {
        onAuthStateChanged(auth, async (user) => { // Añadido 'async'
            if (user) {
                // Usuario logueado
                loginButton.classList.add('hidden');
                loggedInUserDisplay.classList.remove('hidden');
                userNameDisplay.textContent = user.displayName || user.email || 'Tu Usuario';
                // navPerfil.classList.remove('hidden'); // Ya no se necesita esta línea
                
                // Cargar avatar en el encabezado
                if (user.photoURL) {
                    profileAvatarHeader.src = user.photoURL;
                } else if (storage) { // Solo intentar desde Storage si está inicializado
                    const avatarPathPng = `avatars/${user.uid}.png`;
                    const avatarPathJpg = `avatars/${user.uid}.jpg`;

                    try {
                        const avatarRefPng = ref(storage, avatarPathPng);
                        const avatarUrl = await getDownloadURL(avatarRefPng);
                        profileAvatarHeader.src = avatarUrl;
                    } catch (pngError) {
                        try {
                            const avatarRefJpg = ref(storage, avatarPathJpg);
                            const avatarUrl = await getDownloadURL(avatarRefJpg);
                            profileAvatarHeader.src = avatarUrl;
                        } catch (jpgError) {
                            console.warn(`No se encontró avatar por UID para ${user.uid} (.png o .jpg) en el header. Usando placeholder.`, pngError.code, jpgError.code);
                            profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A'; // Placeholder genérico
                        }
                    }
                } else {
                    profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A'; // Placeholder si Storage no está listo
                }

            } else {
                // Usuario no logueado
                loginButton.classList.remove('hidden');
                loggedInUserDisplay.classList.add('hidden');
                // navPerfil.classList.add('hidden'); // Ya no se necesita esta línea
                profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A'; // Resetear a placeholder
            }
            window.updateCartDisplay(); // Llama a la función para actualizar el contador al cambiar el estado de autenticación
        });
    } else {
        console.warn("Firebase Auth no está inicializado. La funcionalidad de autenticación en el encabezado no estará disponible.");
        // navPerfil.classList.add('hidden'); // Ya no se necesita esta línea
        profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A'; // Asegurar placeholder
        window.updateCartDisplay(); // Llama a la función para actualizar el contador incluso sin autenticación
    }

    // Manejo del botón "Iniciar Sesión" en el encabezado
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            console.log('Botón "Iniciar Sesión" clickeado en detalle-producto. Redirigiendo a login.html...');
            window.location.href = 'login.html';
        });
    }

    // Manejo del botón "Cerrar Sesión" en el encabezado
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            if (auth) {
                try {
                    await signOut(auth);
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


    if (!db) {
        console.error("Firebase Firestore no está inicializado. No se puede cargar el detalle del producto.");
        showMessage(errorMessage);
        errorMessage.textContent = "Error: No se pudo conectar con la base de datos. Asegúrate de configurar Firebase en common.js.";
        return;
    }

    // Obtener el ID del producto de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        console.warn("No se encontró el ID del producto en la URL.");
        showMessage(notFoundMessage);
        notFoundMessage.textContent = "ID de producto no proporcionado en la URL.";
        return;
    }

    try {
        // Obtener la referencia al documento del producto en Firestore
        const productRef = doc(db, "productos", productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
            const product = { id: productSnap.id, ...productSnap.data() };
            console.log("Producto cargado:", product);

            // Ocultar mensajes de carga/error
            showMessage(null);

            // Construir el HTML para mostrar los detalles del producto
            productDetailContainer.innerHTML = `
                <div class="md:w-1/2 flex justify-center items-center">
                    <img src="${product.imagenUrl || 'https://placehold.co/600x600/F0F0F0/333333?text=No+Image'}"
                         alt="${product.nombre || 'Producto sin nombre'}"
                         class="w-full max-w-md h-auto rounded-lg shadow-md object-contain">
                </div>
                <div class="md:w-1/2 p-4">
                    <h1 class="text-4xl font-bold text-dark-blue mb-4">${product.nombre || 'Producto sin nombre'}</h1>
                    <p class="text-gray-700 text-lg mb-6">${product.descripcion || 'Sin descripción detallada.'}</p>
                    <div class="flex items-center justify-between mb-6">
                        <span class="text-3xl font-extrabold text-red-button">$${(product.precio || 0).toFixed(2)}</span>
                        <div class="flex items-center space-x-4">
                            <label for="quantity" class="text-gray-700 font-semibold">Cantidad:</label>
                            <input type="number" id="quantity" value="1" min="1" class="w-20 p-2 border rounded-md text-center">
                        </div>
                    </div>
                    <button id="addToCartButton"
                            class="bg-dark-blue hover:bg-blue-800 text-white font-semibold py-3 px-8 rounded-full shadow-lg transition duration-300 w-full"
                            data-product-id="${product.id}"
                            data-product-name="${product.nombre || 'Producto sin nombre'}"
                            data-product-price="${product.precio || 0}"
                            data-product-image="${product.imagenUrl || ''}">
                        Añadir al Carrito
                    </button>
                    <a href="productos.html" class="block text-center mt-4 text-dark-blue hover:underline">Volver a Productos</a>
                </div>
            `;

            // Añadir event listener al botón "Añadir al Carrito"
            const addToCartButton = document.getElementById('addToCartButton');
            if (addToCartButton) {
                addToCartButton.addEventListener('click', () => {
                    const quantityInput = document.getElementById('quantity');
                    const quantity = parseInt(quantityInput.value, 10);

                    const productId = addToCartButton.dataset.productId;
                    const productName = addToCartButton.dataset.productName;
                    const productPrice = parseFloat(addToCartButton.dataset.productPrice);
                    const productImage = addToCartButton.dataset.productImage;

                    if (isNaN(quantity) || quantity < 1) {
                        window.showAlert('Por favor, introduce una cantidad válida (mínimo 1).', 'error');
                        return;
                    }

                    window.addToCart({
                        id: productId,
                        name: productName,
                        price: productPrice,
                        imageUrl: productImage,
                        quantity: quantity
                    });
                });
            }

        } else {
            console.warn("Producto no encontrado en Firestore con ID:", productId);
            showMessage(notFoundMessage);
            notFoundMessage.textContent = "Producto no encontrado. El ID proporcionado no existe.";
        }

    } catch (error) {
        console.error('Error al cargar el detalle del producto desde Firestore:', error);
        showMessage(errorMessage);
        errorMessage.textContent = `Error al cargar el producto: ${error.message}. Verifica tu conexión y reglas de seguridad.`;
    }
    // Llama a la función para actualizar el contador al cargar la página
    window.updateCartDisplay();
});
