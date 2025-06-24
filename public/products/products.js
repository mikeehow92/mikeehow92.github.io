import { getFirestore, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { app } from '../firebase-config';
import { showFeedback } from '../shared/feedback';
import { CartService } from '../cart/cart-service';

const db = getFirestore(app);

// ==================== SERVICIO DE PRODUCTOS ====================
export const ProductService = {
  /**
   * Obtiene todos los productos de la colección
   * @param {number} limit - Límite de productos a obtener
   * @returns {Promise<Array>} Lista de productos
   */
  getAllProducts: async (limit = 20) => {
    try {
      const productsCol = collection(db, 'products');
      const productSnapshot = await getDocs(productsCol);
      const productList = productSnapshot.docs
        .slice(0, limit)
        .map(doc => ({ id: doc.id, ...doc.data() }));
      
      return productList;
    } catch (error) {
      console.error("Error al obtener productos:", error);
      showFeedback('Error al cargar productos', 'error');
      return [];
    }
  },

  /**
   * Obtiene productos por categoría
   * @param {string} category - Categoría a filtrar
   * @returns {Promise<Array>} Lista de productos filtrados
   */
  getProductsByCategory: async (category) => {
    try {
      const productsCol = collection(db, 'products');
      const q = query(productsCol, where('category', '==', category));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`Error al obtener productos de ${category}:`, error);
      showFeedback(`Error al cargar productos de ${category}`, 'error');
      return [];
    }
  },

  /**
   * Obtiene un producto por su ID
   * @param {string} productId - ID del producto
   * @returns {Promise<Object|null>} Objeto del producto o null si no existe
   */
  getProductById: async (productId) => {
    try {
      const docRef = doc(db, 'products', productId);
      const docSnap = await getDoc(docRef);
      
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
      console.error(`Error al obtener producto ${productId}:`, error);
      showFeedback('Error al cargar el producto', 'error');
      return null;
    }
  },

  /**
   * Busca productos por término
   * @param {string} searchTerm - Término de búsqueda
   * @returns {Promise<Array>} Lista de productos que coinciden
   */
  searchProducts: async (searchTerm) => {
    try {
      const allProducts = await ProductService.getAllProducts();
      const term = searchTerm.toLowerCase();
      
      return allProducts.filter(product => 
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error("Error en búsqueda de productos:", error);
      return [];
    }
  }
};

// ==================== INTERFAZ DE USUARIO DE PRODUCTOS ====================
export const ProductUI = {
  /**
   * Inicializa la UI de productos
   */
  init: async () => {
    await ProductUI.renderProductGrid();
    ProductUI.setupEventListeners();
    ProductUI.setupSearch();
  },

  /**
   * Renderiza la cuadrícula de productos
   * @param {Array} products - Lista de productos a renderizar (opcional)
   */
  renderProductGrid: async (products) => {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return;

    const productsToRender = products || await ProductService.getAllProducts();
    
    if (productsToRender.length === 0) {
      productsGrid.innerHTML = '<p class="no-products">No se encontraron productos</p>';
      return;
    }

    productsGrid.innerHTML = productsToRender.map(product => `
      <div class="product-card" data-id="${product.id}">
        <div class="product-image">
          <img src="${product.image || 'img/placeholder-product.png'}" alt="${product.name}">
          <button class="add-to-cart-btn" data-product-id="${product.id}">
            <i class="fas fa-cart-plus"></i>
          </button>
        </div>
        <div class="product-info">
          <h3 class="product-title">${product.name}</h3>
          <p class="product-category">${product.category}</p>
          <div class="product-footer">
            <span class="product-price">$${product.price.toFixed(2)}</span>
            <button class="view-details-btn" data-product-id="${product.id}">Ver detalles</button>
          </div>
        </div>
      </div>
    `).join('');
  },

  /**
   * Renderiza la página de detalles de un producto
   * @param {string} productId - ID del producto
   */
  renderProductDetails: async (productId) => {
    const productDetails = document.getElementById('product-details');
    if (!productDetails) return;

    const product = await ProductService.getProductById(productId);
    if (!product) {
      productDetails.innerHTML = '<p class="error">Producto no encontrado</p>';
      return;
    }

    productDetails.innerHTML = `
      <div class="product-detail-container">
        <div class="product-detail-image">
          <img src="${product.image || 'img/placeholder-product.png'}" alt="${product.name}">
        </div>
        <div class="product-detail-info">
          <h1>${product.name}</h1>
          <p class="product-category">${product.category}</p>
          <p class="product-price">$${product.price.toFixed(2)}</p>
          <p class="product-description">${product.description || 'Sin descripción disponible'}</p>
          
          <div class="product-quantity">
            <button class="quantity-btn" data-action="decrease">-</button>
            <input type="number" value="1" min="1" class="quantity-input">
            <button class="quantity-btn" data-action="increase">+</button>
          </div>
          
          <button class="add-to-cart-btn" data-product-id="${product.id}">
            Añadir al carrito
          </button>
        </div>
      </div>
    `;

    ProductUI.setupProductDetailEvents(product);
  },

  /**
   * Configura los event listeners para los productos
   */
  setupEventListeners: () => {
    // Delegación de eventos para la cuadrícula de productos
    document.addEventListener('click', async (e) => {
      const productCard = e.target.closest('.product-card');
      const addToCartBtn = e.target.closest('.add-to-cart-btn');
      const viewDetailsBtn = e.target.closest('.view-details-btn');

      if (viewDetailsBtn && productCard) {
        const productId = viewDetailsBtn.dataset.productId;
        await ProductUI.renderProductDetails(productId);
        window.scrollTo(0, 0);
      }

      if (addToCartBtn) {
        const productId = addToCartBtn.dataset.productId;
        const product = await ProductService.getProductById(productId);
        
        if (product) {
          await CartService.addItem({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
          });
          showFeedback(`${product.name} añadido al carrito`, 'success');
        }
      }
    });

    // Filtros de categoría
    document.querySelectorAll('.category-filter').forEach(filter => {
      filter.addEventListener('click', async () => {
        const category = filter.dataset.category;
        const products = await ProductService.getProductsByCategory(category);
        await ProductUI.renderProductGrid(products);
        
        // Actualizar estado activo de los filtros
        document.querySelectorAll('.category-filter').forEach(f => 
          f.classList.remove('active')
        );
        filter.classList.add('active');
      });
    });
  },

  /**
   * Configura los eventos para la página de detalles del producto
   * @param {Object} product - Objeto del producto
   */
  setupProductDetailEvents: (product) => {
    const quantityInput = document.querySelector('.quantity-input');
    const addToCartBtn = document.querySelector('.add-to-cart-btn');

    // Control de cantidad
    document.querySelectorAll('.quantity-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        if (btn.dataset.action === 'increase') {
          quantityInput.value = currentValue + 1;
        } else if (btn.dataset.action === 'decrease' && currentValue > 1) {
          quantityInput.value = currentValue - 1;
        }
      });
    });

    // Añadir al carrito desde la página de detalles
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', async () => {
        const quantity = parseInt(quantityInput.value) || 1;
        
        await CartService.addItem({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: quantity
        });
        
        showFeedback(`${quantity} ${product.name} añadido(s) al carrito`, 'success');
      });
    }
  },

  /**
   * Configura la funcionalidad de búsqueda
   */
  setupSearch: () => {
    const searchInput = document.getElementById('product-search');
    const searchBtn = document.getElementById('search-btn');

    const performSearch = async () => {
      const searchTerm = searchInput.value.trim();
      if (searchTerm.length < 2) return;

      const results = await ProductService.searchProducts(searchTerm);
      await ProductUI.renderProductGrid(results);
    };

    if (searchInput) {
      searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') performSearch();
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', performSearch);
    }
  }
};

// ==================== INICIALIZACIÓN AUTOMÁTICA ====================
document.addEventListener('DOMContentLoaded', () => {
  // Auto-inicializar si hay elementos de productos en la página
  if (document.getElementById('products-grid') || document.getElementById('product-details')) {
    ProductUI.init();
  }

  // Cargar detalles del producto si hay un ID en la URL
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  if (productId && document.getElementById('product-details')) {
    ProductUI.renderProductDetails(productId);
  }
});
