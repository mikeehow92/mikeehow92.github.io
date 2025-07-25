// assets/js/products-page.js
import { ProductService } from './products.js';
import { CartService } from './cart.js';
import { showFeedback } from './feedback.js';
import { CartUI } from './cart-ui.js'; // Importar CartUI para inicializar el carrito en esta página

document.addEventListener('DOMContentLoaded', async () => {
    const productsGrid = document.getElementById('products-grid');
    const categoryButtons = document.querySelectorAll('.category-filter button');

    if (!productsGrid) {
        console.error("La cuadrícula de productos no se encontró en productos.html. Asegúrate de que haya un elemento con id 'products-grid'.");
        return;
    }

    const renderProducts = async (category = 'all') => {
        productsGrid.innerHTML = '<p>Cargando productos...</p>'; // Mostrar mensaje de carga
        try {
            let products = [];
            if (category === 'all') {
                products = await ProductService.getAllProducts();
            } else {
                products = await ProductService.getProductsByCategory(category);
            }

            productsGrid.innerHTML = ''; // Limpiar mensaje de carga

            if (products.length === 0) {
                productsGrid.innerHTML = '<p>No hay productos disponibles para esta categoría.</p>';
                return;
            }

            products.forEach(product => {
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
                productsGrid.appendChild(productCard);
            });
        } catch (error) {
            console.error("Error al cargar productos:", error);
            productsGrid.innerHTML = '<p class="error-message">Error al cargar los productos.</p>';
            showFeedback('Error', 'No se pudieron cargar los productos.', 'error');
        }
    };

    // Carga inicial de todos los productos
    await renderProducts();

    // Filtrado por categoría
    categoryButtons.forEach(button => {
        button.addEventListener('click', async () => {
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const category = button.dataset.category;
            await renderProducts(category);
        });
    });

    // Funcionalidad Añadir al Carrito (similar a index.html pero específica de products-page)
    productsGrid.addEventListener('click', async (event) => {
        if (event.target.classList.contains('btn-add-to-cart')) {
            const button = event.target;
            const productId = button.dataset.productId;
            const productName = button.dataset.productName;
            const productPrice = parseFloat(button.dataset.productPrice);
            const productImage = button.dataset.productImage;

            if (productId && productName && !isNaN(productPrice)) {
                try {
                    const product = {
                        id: productId,
                        name: productName,
                        price: productPrice,
                        image: productImage
                    };
                    await CartService.addItem(product, 1);
                    showFeedback('Producto Añadido', `${productName} se ha añadido al carrito.`, 'success');
                    // Opcionalmente actualizar el contador del carrito en la cabecera si existe
                    CartUI.updateCartCount(); // Actualiza el contador del carrito
                } catch (error) {
                    console.error("Error al añadir el artículo al carrito:", error);
                    showFeedback('Error', `No se pudo añadir ${productName} al carrito.`, 'error');
                }
            }
        }
    });

    // Inicializar CartUI para la página de productos (si el modal del carrito está presente)
    CartUI.init(); // Asumiendo que CartUI se importa y se puede inicializar de forma segura varias veces
});
