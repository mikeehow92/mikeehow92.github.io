// js/productos.js

// Importa las funciones necesarias de Firebase Firestore, Auth y Storage
import { collection, getDocs, query } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js"; // Importar Storage

document.addEventListener('DOMContentLoaded', () => {
    // Elementos del encabezado para el estado de autenticación
    const loginButton = document.getElementById('loginButton');
    const loggedInUserDisplay = document.getElementById('loggedInUserDisplay');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const profileAvatarHeader = document.getElementById('profileAvatarHeader'); // Elemento para el avatar en el header
    const logoutButton = document.getElementById('logoutButton');
    const navCarrito = document.getElementById('navCarrito');
    // const navPerfil = document.getElementById('navPerfil'); // Se comenta o elimina ya que el elemento se quitará del HTML
    const cartItemCountElement = document.getElementById('cartItemCount'); // Obtener el elemento del contador de ítems del carrito

    // Obtener referencias de Firebase
    const auth = window.firebaseAuth;
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
        // Lógica adicional específica de UI para productos.html si es necesaria
    };

    // Manejo del estado de autenticación en el encabezado
    if (auth) {
        onAuthStateChanged(auth, async (user) => { // Añadido 'async'
            if (user) {
                // Usuario logueado
                loginButton.classList.add('hidden');
                loggedInUserDisplay.classList.remove('hidden');
                userNameDisplay.textContent = user.displayName || user.email || 'Tu Usuario';
                // navPerfil.classList.remove('hidden'); // Se comenta o elimina ya que el elemento se quitará del HTML

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
                // navPerfil.classList.add('hidden'); // Se comenta o elimina ya que el elemento se quitará del HTML
                profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A'; // Resetear a placeholder
            }
            window.updateCartDisplay(); // Llama a la función para actualizar el contador al cambiar el estado de autenticación
        });
    } else {
        console.warn("Firebase Auth no está inicializado. La funcionalidad de autenticación en el encabezado no estará disponible.");
        // navPerfil.classList.add('hidden'); // Se comenta o elimina ya que el elemento se quitará del HTML
        profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A'; // Asegurar placeholder
        window.updateCartDisplay(); // Llama a la función para actualizar el contador incluso sin autenticación
    }

    // Manejo del botón "Iniciar Sesión" en el encabezado
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            console.log('Botón "Iniciar Sesión" clickeado en productos. Redirigiendo a login.html...');
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
                } catch (error) {
                    console.error('Error al cerrar sesión:', error.message);
                    window.showAlert('Error al cerrar sesión. Por favor, inténtalo de nuevo.', 'error');
                }
            } else {
                window.showAlert('Firebase Auth no está disponible para cerrar sesión.', 'error');
            }
        });
    }

    const productGrid = document.getElementById('productGrid');

    // Función para cargar y mostrar productos
    async function loadProducts() {
        productGrid.innerHTML = ''; // Limpia los placeholders estáticos

        // Asegúrate de que Firebase Firestore esté inicializado en common.js
        const db = window.firebaseDb;

        if (!db) {
            console.error("Firebase Firestore no está inicializado. No se pueden cargar los productos.");
            window.showAlert("Error: No se pudo conectar con la base de datos de productos. Asegúrate de configurar Firebase en common.js.", "error");
            return;
        }

        try {
            const productsCollection = collection(db, "productos");
            const productSnapshot = await getDocs(productsCollection);
            const productList = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (productList.length === 0) {
                productGrid.innerHTML = '<p class="text-gray-600 text-center col-span-full">No hay productos disponibles en este momento en Firestore.</p>';
                return;
            }

            productList.forEach(product => {
                // Usar 'imagenUrl' y otros nombres de campo de tu Firestore
                const productCard = `
                    <div class="bg-white rounded-lg shadow-lg overflow-hidden transform hover:scale-105 transition duration-300">
                        <a href="detalle-producto.html?id=${product.id}" class="block">
                            <img src="${product.imagenUrl || 'https://placehold.co/400x300/F0F0F0/333333?text=No+Image'}" 
                                 alt="${product.nombre || 'Producto sin nombre'}" 
                                 class="w-full h-48 object-contain"> <!-- Cambiado a object-contain -->
                            <div class="p-6">
                                <h3 class="text-xl font-semibold text-gray-900 mb-2">${product.nombre || 'Producto sin nombre'}</h3>
                                <p class="text-gray-700 mb-4">${product.descripcion || 'Sin descripción.'}</p>
                                <div class="flex justify-between items-center">
                                    <span class="text-2xl font-bold text-dark-blue">$${(product.precio || 0).toFixed(2)}</span>
                                    <button class="add-to-cart-btn bg-dark-blue hover:bg-blue-800 text-white py-2 px-4 rounded-full text-sm font-semibold transition duration-300"
                                            data-product-id="${product.id}"
                                            data-product-name="${product.nombre || 'Producto sin nombre'}"
                                            data-product-price="${product.precio || 0}"
                                            data-product-image="${product.imagenUrl || ''}">
                                        Añadir al Carrito
                                    </button>
                                </div>
                            </div>
                        </a>
                    </div>
                `;
                productGrid.innerHTML += productCard;
            });

            // Añadir event listeners a los botones "Añadir al Carrito"
            document.querySelectorAll('.add-to-cart-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    event.preventDefault(); // Evita la navegación del enlace padre
                    event.stopPropagation(); // Evita que el clic se propague al enlace del producto

                    const productId = button.dataset.productId;
                    const productName = button.dataset.productName;
                    const productPrice = parseFloat(button.dataset.productPrice);
                    const productImage = button.dataset.productImage;

                    // Llama a la función global addToCart (definida en common.js)
                    window.addToCart({
                        id: productId,
                        name: productName,
                        price: productPrice,
                        imageUrl: productImage,
                        quantity: 1 // Siempre añade 1 desde la vista de lista
                    });
                });
            });

        } catch (error) {
            console.error('Error al cargar los productos desde Firestore:', error);
            productGrid.innerHTML = '<p class="text-red-500 text-center col-span-full">Error al cargar los productos. Por favor, verifica tu conexión a Firestore y las reglas de seguridad.</p>';
        }
    }

    // Cargar productos cuando la página esté lista
    loadProducts();
});
