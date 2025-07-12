import { getFirestore, collection, getDocs, doc, getDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { app } from '../firebase-config.js'; 
import { showFeedback } from '../shared/feedback.js'; 

const db = getFirestore(app);

export const ProductService = {
  // ==================== OPERACIONES BÁSICAS ====================
  
  /**
   * Obtiene todos los productos
   * @param {number} [maxResults=12] - Límite de resultados
   * @returns {Promise<Array>} Lista de productos
   */
  getAllProducts: async (maxResults = 12) => {
    console.log('6. ProductService.getAllProducts() iniciado'); 
    try {
      const productsRef = collection(db, 'productos'); // CORRECCIÓN: 'products' a 'productos'
      const q = query(
        productsRef, 
        orderBy('fechaCreacion', 'desc'), 
        limit(maxResults)
      );
      
      console.log('7. Realizando getDocs(q)...'); 
      const snapshot = await getDocs(q);
      console.log('8. getDocs(q) completado. Snapshot docs:', snapshot.docs.length); 
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("ERROR EN ProductService.getAllProducts:", error); 
      if (typeof showFeedback === 'function') {
        showFeedback('Error al cargar productos', 'No se pudieron cargar los productos.', 'error');
      }
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
      const productRef = doc(db, 'productos', productId); // CORRECCIÓN: 'products' a 'productos'
      const productSnap = await getDoc(productRef);

      if (productSnap.exists()) {
        return { id: productSnap.id, ...productSnap.data() };
      } else {
        console.log("No such document!");
        return null;
      }
    } catch (error) {
      console.error("Error fetching product by ID:", error);
      if (typeof showFeedback === 'function') {
        showFeedback('Error al cargar producto', 'No se pudo cargar la información del producto.', 'error');
      }
      return null;
    }
  },

  /**
   * Busca productos por nombre o descripción
   * @param {string} searchTerm 
   * @returns {Promise<Array>} Productos encontrados
   */
  searchProducts: async (searchTerm) => {
    try {
      const productsRef = collection(db, 'productos'); // CORRECCIÓN: 'products' a 'productos'
      let q;
      if (searchTerm) {
        q = query(
          productsRef,
          where('nombre', '>=', searchTerm), 
          where('nombre', '<=', searchTerm + '\uf8ff'), 
          orderBy('nombre'), 
          limit(50) 
        );
      } else {
        q = query(
          productsRef,
          orderBy('fechaCreacion', 'desc'), 
          limit(50)
        );
      }

      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      return results.filter(product => 
        product.nombre.toLowerCase().includes(lowerCaseSearchTerm) || 
        product.descripcion.toLowerCase().includes(lowerCaseSearchTerm)
      );

    } catch (error) {
      console.error("Error searching products:", error);
      if (typeof showFeedback === 'function') {
        showFeedback('Error de búsqueda', 'No se pudieron buscar los productos.', 'error');
      }
      return [];
    }
  },

  /**
   * Obtiene productos por categoría
   * @param {string} category 
   * @param {number} [maxResults=20] 
   * @returns {Promise<Array>} Productos de la categoría
   */
  getProductsByCategory: async (category, maxResults = 20) => {
    try {
      const productsRef = collection(db, 'productos'); // CORRECCIÓN: 'products' a 'productos'
      const q = query(
        productsRef,
        where('categoria', '==', category), 
        orderBy('fechaCreacion', 'desc'), 
        limit(maxResults)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error fetching products by category:", error);
      if (typeof showFeedback === 'function') {
        showFeedback('Error de categoría', 'No se pudieron cargar los productos de esa categoría.', 'error');
      }
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
      const products = await ProductService.getProductsByCategory(category, maxResults + 1); 
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
      const productsRef = collection(db, 'productos'); // CORRECCIÓN: 'products' a 'productos'
      const q = query(
        productsRef, 
        where('activo', '==', true), 
        orderBy('fechaCreacion', 'desc'), 
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
