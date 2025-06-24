import { getFirestore, collection, getDocs, doc, getDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { app } from '../firebase-config';
import { showFeedback } from '../shared/feedback';

const db = getFirestore(app);

export const ProductService = {
  // ==================== OPERACIONES BÁSICAS ====================
  
  /**
   * Obtiene todos los productos
   * @param {number} [maxResults=12] - Límite de resultados
   * @returns {Promise<Array>} Lista de productos
   */
  getAllProducts: async (maxResults = 12) => {
    try {
      const productsRef = collection(db, 'products');
      const q = query(
        productsRef, 
        orderBy('createdAt', 'desc'), 
        limit(maxResults)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error fetching products:", error);
      showFeedback('Error al cargar productos', 'error');
      return [];
    }
  },

  /**
   * Obtiene un producto por ID
   * @param {string} productId 
   * @returns {Promise<Object|null>} Producto encontrado o null
   */
  getProductById: async (productId) => {
    try {
      const docRef = doc(db, 'products', productId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } catch (error) {
      console.error("Error fetching product:", error);
      showFeedback('Error al cargar el producto', 'error');
      return null;
    }
  },

  /**
   * Obtiene productos por categoría
   * @param {string} category 
   * @param {number} [maxResults=8] 
   * @returns {Promise<Array>} Productos filtrados
   */
  getProductsByCategory: async (category, maxResults = 8) => {
    try {
      const productsRef = collection(db, 'products');
      const q = query(
        productsRef, 
        where('category', '==', category),
        orderBy('createdAt', 'desc'),
        limit(maxResults)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error fetching products by category:", error);
      showFeedback(`Error al cargar productos de ${category}`, 'error');
      return [];
    }
  },

  /**
   * Busca productos por término
   * @param {string} searchTerm 
   * @returns {Promise<Array>} Resultados de búsqueda
   */
  searchProducts: async (searchTerm) => {
    try {
      const allProducts = await this.getAllProducts(50); // Limite aumentado para búsquedas
      const term = searchTerm.toLowerCase();
      
      return allProducts.filter(product => 
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error("Error searching products:", error);
      return [];
    }
  },

  // ==================== OPERACIONES AVANZADAS ====================
  
  /**
   * Obtiene productos relacionados
   * @param {string} productId - ID del producto actual
   * @param {string} category - Categoría para buscar relacionados
   * @param {number} [maxResults=4] 
   * @returns {Promise<Array>} Productos relacionados
   */
  getRelatedProducts: async (productId, category, maxResults = 4) => {
    try {
      const products = await this.getProductsByCategory(category, maxResults + 1);
      return products.filter(product => product.id !== productId).slice(0, maxResults);
    } catch (error) {
      console.error("Error fetching related products:", error);
      return [];
    }
  },

  /**
   * Obtiene productos destacados
   * @param {number} [maxResults=6] 
   * @returns {Promise<Array>} Productos destacados
   */
  getFeaturedProducts: async (maxResults = 6) => {
    try {
      const productsRef = collection(db, 'products');
      const q = query(
        productsRef, 
        where('isFeatured', '==', true),
        limit(maxResults)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error fetching featured products:", error);
      return [];
    }
  }
};
