// js/index.js

// Importa las funciones necesarias de Firebase Firestore y Storage
import { collection, getDocs, query, limit } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js"; // Importar Storage
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"; // Importar Auth para el encabezado

document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('loginButton');
    console.log('Elemento del botón de Iniciar Sesión:', loginButton);

    const loggedInUserDisplay = document.getElementById('loggedInUserDisplay');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const profileAvatarHeader = document.getElementById('profileAvatarHeader'); // Nuevo elemento para el avatar en el header
    const logoutButton = document.getElementById('logoutButton');
    const navCarrito = document.getElementById('navCarrito');
    // CAMBIO: Ahora usamos profileLinkHeader en lugar de navPerfil
    const profileLinkHeader = document.getElementById('profileLinkHeader'); // Obtener el nuevo elemento del enlace de perfil
    const cartItemCountElement = document.getElementById('cartItemCount'); // Obtener el elemento del contador de ítems del carrito

    // Obtener referencias de Firebase (asegúrate de que common.js las exporte a window)
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

    // Sobrescribe la función updateCartDisplay de common.js para esta página.
    // Esto asegura que cada vez que el carrito cambie (añadir/eliminar), el contador se actualice.
    window.updateCartDisplay = function() {
        updateCartCountDisplay();
        // Lógica adicional específica de UI para index.html si es necesaria
    };

    // Manejo del estado de autenticación
    if (auth) {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Usuario logueado
                loginButton.classList.add('hidden');
                loggedInUserDisplay.classList.remove('hidden');
                userNameDisplay.textContent = user.displayName || user.email || 'Tu Usuario';
                // CAMBIO: Mostrar el enlace de perfil junto al avatar
                if (profileLinkHeader) {
                    profileLinkHeader.classList.remove('hidden');
                }

                // Cargar avatar en el encabezado
                if (profileAvatarHeader) {
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
                                console.warn(`No se encontró avatar por UID para ${user.uid} (.png o .jpg) en el header. Usando placeholder.`, pngError.code, jpgError.code);
                                profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A';
                            }
                        }
                    } else {
                        profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A';
                    }
                }

            } else {
                // Usuario no logueado
                loginButton.classList.remove('hidden');
                loggedInUserDisplay.classList.add('hidden');
                // CAMBIO: Ocultar el enlace de perfil junto al avatar
                if (profileLinkHeader) {
                    profileLinkHeader.classList.add('hidden');
                }
                if (profileAvatarHeader) { profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A'; }
            }
            window.updateCartDisplay(); // Llama a la función para actualizar el contador al cambiar el estado de autenticación
        });
    } else {
        console.warn("Firebase Auth no está inicializado. La funcionalidad de autenticación no estará disponible.");
        // CAMBIO: Ocultar el enlace de perfil si Firebase Auth no está disponible
        if (profileLinkHeader) {
            profileLinkHeader.classList.add('hidden');
        }
        if (profileAvatarHeader) { profileAvatarHeader.src = 'https://placehold.co/40x40/F0F0F0/333333?text=A'; }
        window.updateCartDisplay(); // Llama a la función para actualizar el contador incluso sin autenticación
    }

    // Manejo del botón "Iniciar Sesión"
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            console.log('Botón "Iniciar Sesión" clickeado. Redirigiendo a login.html...');
            window.location.href = 'login.html';
        });
    }

    // Manejo del botón "Cerrar Sesión"
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            if (auth) {
                try {
                    await signOut(auth);
                    window.showAlert('Has cerrado sesión correctamente.', 'success');
                }
                catch (error) {
                    console.error('Error al cerrar sesión:', error.message);
                    window.showAlert('Error al cerrar sesión. Por favor, inténtalo de nuevo.', 'error');
                }
            }
            else {
                window.showAlert('Firebase Auth no está disponible para cerrar sesión.', 'error');
            }
        });
    }

    // Manejo del botón "Contáctanos" en la sección "Sobre Nosotros"
    const contactUsButton = document.querySelector('#nosotros a[href="#contacto"]');
    if (contactUsButton) {
        contactUsButton.addEventListener('click', (event) => {
            event.preventDefault();
            console.log('Botón "Contáctanos" clickeado.');
            document.getElementById('contacto').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Manejo del formulario de contacto
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const message = document.getElementById('message').value;

            console.log('Formulario de Contacto Enviado:');
            console.log('Nombre Completo:', fullName);
            console.log('Correo Electrónico:', email);
            console.log('Mensaje:', message);

            const cloudFunctionUrl = 'https://us-central1-mitienda-c2609.cloudfunctions.net/api'; // Asegúrate de que esta URL sea la correcta y actualizada

            try {
                const response = await fetch(cloudFunctionUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ fullName, email, message }),
                });

                if (response.ok) {
                    window.showAlert('¡Mensaje enviado con éxito! Nos pondremos en contacto pronto.', 'success');
                    contactForm.reset();
                } else {
                    const errorData = await response.json();
                    window.showAlert(`Error al enviar mensaje: ${errorData.message || 'Error desconocido'}`, 'error');
                    console.error('Error al enviar el formulario:', errorData);
                }
            } catch (error) {
                console.error('Error de red o del servidor al enviar el formulario:', error);
                window.showAlert('Hubo un error de red o del servidor. Por favor, inténtalo más tarde.', 'error');
            }
        });
    }

    // --- Lógica para cargar productos en la sección "Nuestros Productos" de la página de inicio ---
    const productGridHome = document.getElementById('productGridHome');

    async function loadProductsForHome() {
        productGridHome.innerHTML = '';

        const db = window.firebaseDb;

        if (!db) {
            console.error("Firebase Firestore no está inicializado. No se pueden cargar los productos.");
            window.showAlert("Error: No se pudo conectar con la base de datos de productos. Asegúrate de configurar Firebase en common.js.", "error");
            return;
        }

        try {
            const productsCollection = collection(db, "productos");
            const q = query(productsCollection, limit(6));
            const productSnapshot = await getDocs(q);
            const productList = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (productList.length === 0) {
                productGridHome.innerHTML = '<p class="text-gray-600 text-center col-span-full">No hay productos disponibles en este momento en Firestore.</p>';
                return;
            }

            productList.forEach(product => {
                console.log(`Producto: ${product.nombre}, URL de Imagen: ${product.imagenUrl}`);

                const productCard = `
                    <div class="bg-white rounded-lg shadow-lg overflow-hidden transform hover:scale-105 transition duration-300">
                        <a href="detalle-producto.html?id=${product.id}" class="block">
                            <img src="${product.imagenUrl || 'https://placehold.co/400x300/F0F0F0/333333?text=No+Image'}"
                                 alt="${product.nombre || 'Producto sin nombre'}"
                                 class="w-full h-48 object-contain">
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
                productGridHome.innerHTML += productCard;
            });

            document.querySelectorAll('#productGridHome .add-to-cart-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    const productId = button.dataset.productId;
                    const productName = button.dataset.productName;
                    const productPrice = parseFloat(button.dataset.productPrice);
                    const productImage = button.dataset.productImage;

                    window.addToCart({
                        id: productId,
                        name: productName,
                        price: productPrice,
                        imageUrl: productImage,
                        quantity: 1
                    });
                });
            });

        } catch (error) {
            console.error('Error al cargar los productos para la página de inicio desde Firestore:', error);
            productGridHome.innerHTML = '<p class="text-red-500 text-center col-span-full">Error al cargar los productos. Por favor, verifica tu conexión a Firestore y las reglas de seguridad.</p>';
        }
    }

    loadProductsForHome();
});
