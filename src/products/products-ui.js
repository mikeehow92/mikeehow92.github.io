import { ProductService } from './products';
import { CartService } from '../cart/cart-service';
import { showFeedback } from '../shared/feedback';
import { AuthService } from '../auth/auth';

// Selectores del DOM
const SELECTORS = {
  PRODUCTS_GRID: '#products-grid',
  PRODUCT_DETAIL: '#product-detail',
  SEARCH_INPUT: '#search-input',
  SEARCH_BUTTON: '#search-button',
  CATEGORY_FILTERS: '[data-category]',
  PAGINATION: '#pagination',
  PRODUCT_TEMPLATE: '#product-template',
  RELATED_PRODUCTS: '#related-products'
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
  renderProductsGrid();
  setupEventListeners();
  setupProductDetailPage();
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

  // Filtros de categoría
  document.querySelectorAll(SELECTORS.CATEGORY_FILTERS).forEach(filter => {
    filter.addEventListener('click', () => handleCategoryFilter(filter.dataset.category));
  });

  // Delegación de eventos para productos dinámicos
  document.querySelector(SELECTORS.PRODUCTS_GRID)?.addEventListener('click', handleProductActions);
};

/**
 * Renderiza la cuadrícula de productos
 * @param {Array} [products] - Lista opcional de productos a renderizar
 */
const renderProductsGrid = async (products) => {
  const grid = document.querySelector(SELECTORS.PRODUCTS_GRID);
  if (!grid) return;

  grid.classList.add(CLASSES.LOADING);
  
  try {
    const productsToRender = products || await ProductService.getAllProducts();
    const template = document.querySelector(SELECTORS.PRODUCT_TEMPLATE)?.content;
    
    if (!template) return;

    grid.innerHTML = '';

    if (productsToRender.length === 0) {
      grid.innerHTML = '<p class="no-products">No se encontraron productos</p>';
      return;
    }

    productsToRender.forEach(product => {
      const clone = template.cloneNode(true);
      const productElement = clone.querySelector('.product-card');
      
      productElement.dataset.id = product.id;
      clone.querySelector('.product-image').src = product.images?.[0] || 'img/placeholder-product.png';
      clone.querySelector('.product-image').alt = product.name;
      clone.querySelector('.product-title').textContent = product.name;
      clone.querySelector('.product-price').textContent = `$${product.price.toFixed(2)}`;
      clone.querySelector('.product-category').textContent = product.category;
      
      // Botón "Añadir al carrito"
      const addToCartBtn = clone.querySelector('.add-to-cart');
      if (addToCartBtn) {
        addToCartBtn.dataset.productId = product.id;
      }
      
      grid.appendChild(clone);
    });

  } catch (error) {
    showFeedback('Error al cargar productos', 'error');
    console.error("Error rendering products:", error);
  } finally {
    grid.classList.remove(CLASSES.LOADING);
  }
};

/**
 * Maneja la búsqueda de productos
 */
const handleSearch = async () => {
  const searchInput = document.querySelector(SELECTORS.SEARCH_INPUT);
  if (!searchInput) return;

  const term = searchInput.value.trim();
  if (term.length < 2) {
    showFeedback('Ingresa al menos 2 caracteres', 'warning');
    return;
  }

  try {
    const results = await ProductService.searchProducts(term);
    await renderProductsGrid(results);
    updateActiveFilter();
  } catch (error) {
    showFeedback('Error en la búsqueda', 'error');
  }
};

/**
 * Maneja el filtrado por categoría
 * @param {string} category 
 */
const handleCategoryFilter = async (category) => {
  try {
    const products = await ProductService.getProductsByCategory(category);
    await renderProductsGrid(products);
    updateActiveFilter(category);
  } catch (error) {
    showFeedback(`Error al filtrar por ${category}`, 'error');
  }
};

/**
 * Actualiza el filtro activo en la UI
 * @param {string} [activeCategory] - Categoría activa (opcional)
 */
const updateActiveFilter = (activeCategory) => {
  document.querySelectorAll(SELECTORS.CATEGORY_FILTERS).forEach(filter => {
    filter.classList.toggle(
      CLASSES.ACTIVE, 
      filter.dataset.category === activeCategory
    );
  });
};

/**
 * Maneja las acciones de producto (click en cards)
 * @param {Event} e 
 */
const handleProductActions = (e) => {
  const productCard = e.target.closest('.product-card');
  if (!productCard) return;

  const productId = productCard.dataset.id;
  const action = e.target.closest('[data-action]')?.dataset.action;

  if (action === 'view-detail') {
    navigateToProductDetail(productId);
  } else if (action === 'add-to-cart') {
    handleAddToCart(productId);
  }
};

/**
 * Navega a la página de detalle de producto
 * @param {string} productId 
 */
const navigateToProductDetail = (productId) => {
  window.location.href = `producto.html?id=${productId}`;
};

/**
 * Maneja la adición al carrito
 * @param {string} productId 
 */
const handleAddToCart = async (productId) => {
  try {
    const product = await ProductService.getProductById(productId);
    if (!product) return;

    await CartService.addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || '',
      quantity: 1
    });

    showFeedback(`${product.name} añadido al carrito`, 'success');
  } catch (error) {
    showFeedback('Error al añadir al carrito', 'error');
  }
};

/**
 * Configura la página de detalle de producto (si existe)
 */
const setupProductDetailPage = () => {
  const productDetail = document.querySelector(SELECTORS.PRODUCT_DETAIL);
  if (!productDetail) return;

  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (productId) {
    renderProductDetail(productId);
  } else {
    productDetail.innerHTML = '<p class="error">Producto no encontrado</p>';
  }
};

/**
 * Renderiza la página de detalle de producto
 * @param {string} productId 
 */
const renderProductDetail = async (productId) => {
  const container = document.querySelector(SELECTORS.PRODUCT_DETAIL);
  if (!container) return;

  container.classList.add(CLASSES.LOADING);

  try {
    const product = await ProductService.getProductById(productId);
    if (!product) {
      container.innerHTML = '<p class="error">Producto no encontrado</p>';
      return;
    }

    // Renderizar producto principal
    container.innerHTML = `
      <div class="product-detail-container">
        <div class="product-gallery">
          <div class="main-image">
            <img src="${product.images?.[0] || 'img/placeholder-product.png'}" alt="${product.name}">
          </div>
          <div class="thumbnails">
            ${product.images?.map((img, index) => `
              <img src="${img}" alt="${product.name} - ${index + 1}" 
                   onclick="this.closest('.product-gallery').querySelector('.main-image img').src = this.src">
            `).join('')}
          </div>
        </div>
        <div class="product-info">
          <h1>${product.name}</h1>
          <p class="product-category">${product.category}</p>
          <p class="product-price">$${product.price.toFixed(2)}</p>
          <p class="product-description">${product.description || 'Sin descripción disponible'}</p>
          
          <div class="product-actions">
            <div class="quantity-selector">
              <button data-action="decrease-qty">-</button>
              <input type="number" value="1" min="1" max="${product.stock || 10}">
              <button data-action="increase-qty">+</button>
            </div>
            <button class="add-to-cart" data-action="add-to-cart-detail">Añadir al carrito</button>
          </div>
        </div>
      </div>
    `;

    // Configurar eventos para la página de detalle
    setupDetailPageEvents(product);

    // Renderizar productos relacionados
    if (product.category) {
      renderRelatedProducts(product.id, product.category);
    }

  } catch (error) {
    container.innerHTML = '<p class="error">Error al cargar el producto</p>';
    console.error("Error rendering product detail:", error);
  } finally {
    container.classList.remove(CLASSES.LOADING);
  }
};

/**
 * Configura los eventos para la página de detalle
 * @param {Object} product 
 */
const setupDetailPageEvents = (product) => {
  const container = document.querySelector(SELECTORS.PRODUCT_DETAIL);
  if (!container) return;

  // Manejar cambio de cantidad
  container.querySelectorAll('[data-action="decrease-qty"], [data-action="increase-qty"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const input = e.target.closest('.quantity-selector').querySelector('input');
      let value = parseInt(input.value);
      
      if (e.target.dataset.action === 'decrease-qty' && value > 1) {
        input.value = value - 1;
      } else if (e.target.dataset.action === 'increase-qty' && value < (product.stock || 10)) {
        input.value = value + 1;
      }
    });
  });

  // Añadir al carrito desde detalle
  container.querySelector('[data-action="add-to-cart-detail"]')?.addEventListener('click', async () => {
    const quantity = parseInt(container.querySelector('.quantity-selector input').value) || 1;
    
    try {
      await CartService.addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || '',
        quantity: quantity
      });
      
      showFeedback(`${quantity} ${product.name} añadido(s) al carrito`, 'success');
    } catch (error) {
      showFeedback('Error al añadir al carrito', 'error');
    }
  });
};

/**
 * Renderiza productos relacionados
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
            <img src="${product.images?.[0] || 'img/placeholder-product.png'}" alt="${product.name}">
            <h4>${product.name}</h4>
            <p>$${product.price.toFixed(2)}</p>
          </div>
        `).join('')}
      </div>
    `;

  } catch (error) {
    console.error("Error rendering related products:", error);
    relatedContainer.classList.add(CLASSES.HIDDEN);
  }
};

// Auto-inicialización
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector(SELECTORS.PRODUCTS_GRID) || document.querySelector(SELECTORS.PRODUCT_DETAIL)) {
    initProductsUI();
  }
});
