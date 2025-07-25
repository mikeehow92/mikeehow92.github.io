// assets/js/products-ui.js
import { ProductService } from './products.js';
import { CartService } from './cart.js';
import { showFeedback } from './feedback.js';

export const ProductsUI = {
    init: async () => {
        const productsGrid = document.querySelector('#products .products-grid'); // Apunta a la cuadrícula de productos en index.html

        if (!productsGrid) {
            console.warn("La cuadrícula de productos no se encontró en esta página (#products .products-grid). ProductsUI podría no ser necesaria aquí.");
            return;
        }

        // Cargar productos destacados en index.html
        await ProductsUI.loadFeaturedProducts(productsGrid);

        // Añadir event listeners para los botones "Añadir al Carrito" dinámicamente
        productsGrid.addEventListener('click', async (event) => {
            if (event.target.classList.contains('btn-add-to-cart')) {
                const button = event.target;
                const productId = button.dataset.productId;
                const productName = button.dataset.productName;
                const productPrice = parseFloat(button.dataset.productPrice);
                const productImage = button.dataset.productImage; // Asegúrate de que esto se pase desde HTML o se obtenga

                if (productId && productName && !isNaN(productPrice)) {
                    try {
                        const product = {
                            id: productId,
                            name: productName,
                            price: productPrice,
                            image: productImage // Incluir imagen para mostrar en el carrito
                        };
                        await CartService.addItem(product, 1);
                        showFeedback('Producto Añadido', `${productName} se ha añadido al carrito.`, 'success');
                        // Opcional: Actualizar el contador del carrito (asumiendo que CartUI tiene un método para esto)
                        CartUI.updateCartCount();
                    } catch (error) {
                        console.error("Error al añadir el artículo al carrito:", error);
                        showFeedback('Error', `No se pudo añadir ${productName} al carrito.`, 'error');
                    }
                }
            }
        });
    },

    loadFeaturedProducts: async (containerElement) => {
        try {
            const products = await ProductService.getAllProducts(); // O obtener un conjunto específico de productos destacados
            containerElement.innerHTML = ''; // Limpiar mensaje de carga

            if (products.length === 0) {
                containerElement.innerHTML = '<p>No hay productos destacados disponibles en este momento.</p>';
                return;
            }

            products.slice(0, 4).forEach(product => { // Mostrar los primeros 4 como ejemplo destacado
                const productCard = document.createElement('div');
                productCard.className = 'product-card';
                productCard.innerHTML = `
                    <div class="product-image-container">
                        <img src="${product.image || '/assets/imagenes/default-product.jpg'}" alt="${product.name}" class="product-image">
                    </div>
                    <div class="product-info">
                        <h3 class="product-name">${product.name}</h3>
                        <p class="product-description">${product.description || 'Sin descripción.'}</p>
                        <span class="product-price">$${product.price.toFixed(2)}</span>
                        <button class="btn btn-primary btn-add-to-cart"
                                data-product-id="${product.id}"
                                data-product-name="${product.name}"
                                data-product-price="${product.price}"
                                data-product-image="${product.image || '/assets/imagenes/default-product.jpg'}">
                            Añadir al Carrito
                        </button>
                    </div>
                `;
                containerElement.appendChild(productCard);
            });
        } catch (error) {
            console.error("Error al cargar productos destacados:", error);
            containerElement.innerHTML = '<p class="error-message">Error al cargar los productos destacados.</p>';
            showFeedback('Error', 'No se pudieron cargar los productos destacados.', 'error');
        }
    }
};
