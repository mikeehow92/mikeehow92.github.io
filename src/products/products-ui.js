import { ProductService } from './productos.js'; // Asegúrate que esta ruta es correcta
import { CartService } from '../cart/cart.js'; // Asegúrate que esta ruta es correcta
import { showFeedback } from '../shared/feedback.js'; // Asegúrate de tener showFeedback

// Selectores del DOM
const SELECTORS = {
  PRODUCTS_GRID: '#products-grid',
  PRODUCT_DETAIL: '#product-detail', 
  SEARCH_INPUT: '#search-input',
  SEARCH_BUTTON: '#search-button',
  CATEGORY_FILTERS: '[data-category]',
  PAGINATION: '#pagination', 
  PRODUCT_TEMPLATE: '#product-template', 
  RELATED_PRODUCTS: '#related-products', 
  ADD_TO_CART_BUTTON: '.add-to-cart-btn', 
};

// Clases CSS
const CLASSES = {
  ACTIVE: 'active',
  LOADING: 'loading',
  HIDDEN: 'hidden'
};

/**
 * Inicializa la UI de productos
 */
export const initProductsUI = () => {
  console.log('1. initProductsUI iniciado'); // <-- CONSOLE.LOG
  renderProductsGrid();
  setupEventListeners();
  // setupProductDetailPage(); // Descomentar si tienes una página de detalle de producto
  console.log('2. initProductsUI terminado'); // <-- CONSOLE.LOG
};

/**
 * Renderiza la cuadrícula de productos
 * @param {Array<Object>} products - Opcional, lista de productos a renderizar. Si no se provee, los obtiene todos.
 */
const renderProductsGrid = async (products) => {
  console.log('3. renderProductsGrid iniciado'); // <-- CONSOLE.LOG
  const productsGrid = document.querySelector(SELECTORS.PRODUCTS_GRID);
  if (!productsGrid) {
    console.error('Elemento #products-grid no encontrado.');
    return;
  }

  productsGrid.innerHTML = '<p>Cargando productos...</p>'; // Mensaje de carga inicial

  try {
    console.log('4. Llamando a ProductService.getAllProducts()'); // <-- CONSOLE.LOG
    const productsToRender = products || await ProductService.getAllProducts();
    console.log('5. ProductService.getAllProducts() regresó:', productsToRender); // <-- CONSOLE.LOG
    
    if (productsToRender.length === 0) {
      productsGrid.innerHTML = '<p>No se encontraron productos.</p>';
      return;
    }

    productsGrid.innerHTML = productsToRender.map(product => `
      <div class="product-card" data-id="${product.id}">
        <img src="${product.imagenUrl || '/assets/images/placeholder.png'}" alt="${product.nombre}">
        <div class="product-info">
          <h3>${product.nombre}</h3>
          <p>${product.descripcion.substring(0, 100)}${product.descripcion.length > 100 ? '...' : ''}</p>
          <div class="product-price">$${product.precio.toFixed(2)}</div>
          <button class="btn-add-to-cart add-to-cart-btn" 
                  data-id="${product.id}" 
                  data-name="${product.nombre}" 
                  data-price="${product.precio}"
                  data-image="${product.imagenUrl}">
            <i class="fas fa-shopping-cart"></i> Añadir al Carrito
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error("Error rendering products grid:", error);
    productsGrid.innerHTML = '<p class="error-message">Error al cargar los productos. Inténtalo de nuevo más tarde.</p>';
  }
};

/**
 * Maneja la búsqueda de productos
 */
const handleSearch = async () => {
  const searchInput = document.querySelector(SELECTORS.SEARCH_INPUT);
  const searchTerm = searchInput ? searchInput.value.trim() : '';
  
  if (searchTerm.length < 2 && searchTerm.length > 0) {
    if (typeof showFeedback === 'function') {
      showFeedback('Búsqueda', 'Ingresa al menos 2 caracteres para buscar.', 'info');
    }
    return;
  }

  const products = await ProductService.searchProducts(searchTerm);
  renderProductsGrid(products);
};

/**
 * Maneja los filtros de categoría
 * @param {Event} event - El evento de click
 */
const handleCategoryFilter = async (event) => {
  const filterButton = event.target.closest(SELECTORS.CATEGORY_FILTERS);
  if (!filterButton) return;

  document.querySelectorAll(SELECTORS.CATEGORY_FILTERS).forEach(btn => {
    btn.classList.remove(CLASSES.ACTIVE);
  });
  filterButton.classList.add(CLASSES.ACTIVE);

  const category = filterButton.dataset.category;
  let products;
  if (category === 'all') {
    products = await ProductService.getAllProducts();
  } else {
    products = await ProductService.getProductsByCategory(category);
  }
  renderProductsGrid(products);
};


/**
 * Configura los event listeners
 */
const setupEventListeners = () => {
  // Búsqueda
  document.querySelector(SELECTORS.SEARCH_INPUT)?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  
  document.querySelector(SELECTORS.SEARCH_BUTTON)?.addEventListener('click', handleSearch);

  // Filtros de categoría (delegación de eventos en un contenedor padre si aplica)
  document.querySelectorAll(SELECTORS.CATEGORY_FILTERS).forEach(filterButton => {
    filterButton.addEventListener('click', handleCategoryFilter);
  });

  // Delegación de eventos para botones "Añadir al Carrito"
  document.querySelector(SELECTORS.PRODUCTS_GRID)?.addEventListener('click', async (event) => {
    const addToCartBtn = event.target.closest(SELECTORS.ADD_TO_CART_BUTTON);
    if (addToCartBtn) {
      const productId = addToCartBtn.dataset.id;
      const productName = addToCartBtn.dataset.name;
      const productPrice = parseFloat(addToCartBtn.dataset.price);
      const productImageUrl = addToCartBtn.dataset.image;

      const product = {
        id: productId,
        name: productName,
        price: productPrice,
        imageUrl: productImageUrl
      };

      try {
        await CartService.addItem(product, 1);
        if (typeof showFeedback === 'function') {
          showFeedback('¡Añadido!', `${productName} se añadió al carrito.`, 'success');
        }
        const currentCart = await CartService.getCart();
        document.getElementById('cartCount').textContent = CartService.getItemCount(currentCart);

      } catch (error) {
        console.error('Error al añadir al carrito:', error);
        if (typeof showFeedback === 'function') {
          showFeedback('Error', 'No se pudo añadir el producto al carrito.', 'error');
        }
      }
    }
  });
};

/**
 * Configura la página de detalle de producto si existe
 */
// const setupProductDetailPage = async () => {
//   const productDetailContainer = document.querySelector(SELECTORS.PRODUCT_DETAIL);
//   if (!productDetailContainer) return;

//   const urlParams = new URLSearchParams(window.location.search);
//   const productId = urlParams.get('id');

//   if (productId) {
//     const product = await ProductService.getProductById(productId);
//     if (product) {
//       productDetailContainer.innerHTML = `
//         <div class="product-detail-card">
//           <img src="${product.imageUrl || '/assets/images/placeholder.png'}" alt="${product.nombre}">
//           <div class="details">
//             <h2>${product.nombre}</h2>
//             <p class="description">${product.descripcion}</p>
//             <p class="price">$${product.precio.toFixed(2)}</p>
//             <button class="btn-add-to-cart add-to-cart-btn" 
//                     data-id="${product.id}" 
//                     data-name="${product.nombre}" 
//                     data-price="${product.precio}"
//                     data-image="${product.imagenUrl}">
//               <i class="fas fa-shopping-cart"></i> Añadir al Carrito
//             </button>
//           </div>
//         </div>
//       `;
//       renderRelatedProducts(product.id, product.categoria); 
//     } else {
//       productDetailContainer.innerHTML = '<p>Producto no encontrado.</p>';
//     }
//   } else {
//     productDetailContainer.innerHTML = '<p>Selecciona un producto para ver los detalles.</p>';
//   }
// };

/**
 * Renderiza productos relacionados (para una página de detalle de producto)
 * @param {string} productId - ID del producto actual
 * @param {string} category - Categoría para buscar relacionados
 */
const renderRelatedProducts = async (productId, category) => {
  const relatedContainer = document.querySelector(SELECTORS.RELATED_PRODUCTS);
  if (!relatedContainer) return;

  try {
    const relatedProducts = await ProductService.getRelatedProducts(productId, category);
    
    if (relatedProducts.length === 0) {
      relatedContainer.classList.add(CLASSES.HIDDEN);
      return;
    }

    relatedContainer.innerHTML = `
      <h3>Productos relacionados</h3>
      <div class="related-products-grid">
        ${relatedProducts.map(product => `
          <div class="related-product" data-id="${product.id}" onclick="window.location.href='producto.html?id=${product.id}'">
            <img src="${product.imagenUrl || '/assets/images/placeholder.png'}" alt="${product.nombre}">
            <h4>${product.nombre}</h4>
            <p>$${product.precio.toFixed(2)}</p>
          </div>
        `).join('')}
      </div>
    `;

  } catch (error) {
    console.error("Error rendering related products:", error);
    relatedContainer.classList.add(CLASSES.HIDDEN);
  }
};

// Auto-inicialización cuando el DOM está completamente cargado
document.addEventListener('DOMContentLoaded', initProductsUI);
