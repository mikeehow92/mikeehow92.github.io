import { getFirestore, collection, getDocs, doc, getDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { app } from '../shared/firebase-config'; // Asegúrate que esta ruta es correcta
import { showFeedback } from '../shared/feedback'; // Asegúrate de tener showFeedback

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
        orderBy('fechaCreacion', 'desc'), // CORRECCIÓN: Usar 'fechaCreacion'
        limit(maxResults)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error fetching products:", error);
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
      const productRef = doc(db, 'products', productId);
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
      const productsRef = collection(db, 'products');
      let q;
      if (searchTerm) {
        // Implementación simple de búsqueda. Para búsquedas más robustas
        // se requerirían índices de texto completo (ej. Algolia, o Cloud Functions).
        // Aquí se asume una búsqueda básica por inicio del nombre.
        // Ojo: Firestore no soporta búsquedas "LIKE %term%" nativamente en el frontend.
        // Se puede hacer una búsqueda por rango si el término es un prefijo.
        // Para una búsqueda que no sea por prefijo, tendrías que cargar todos los productos
        // y filtrarlos en el cliente, lo cual no es escalable para muchos productos.
        q = query(
          productsRef,
          where('nombre', '>=', searchTerm), // CORRECCIÓN: Usar 'nombre'
          where('nombre', '<=', searchTerm + '\uf8ff'), // CORRECCIÓN: Usar 'nombre'
          orderBy('nombre'), // CORRECCIÓN: Usar 'nombre'
          limit(50) // Limitar resultados para evitar carga excesiva
        );
      } else {
        q = query(
          productsRef,
          orderBy('fechaCreacion', 'desc'), // CORRECCIÓN: Usar 'fechaCreacion'
          limit(50)
        );
      }

      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filtrado adicional en el cliente si la búsqueda no es por prefijo exacto
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      return results.filter(product => 
        product.nombre.toLowerCase().includes(lowerCaseSearchTerm) || // CORRECCIÓN: Usar 'nombre'
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
      const productsRef = collection(db, 'products');
      const q = query(
        productsRef,
        where('categoria', '==', category), // CORRECCIÓN: Usar 'categoria'
        orderBy('fechaCreacion', 'desc'), // CORRECCIÓN: Usar 'fechaCreacion'
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
      // Obtenemos un poco más para poder filtrar el producto actual
      const products = await ProductService.getProductsByCategory(category, maxResults + 1); 
      // Filtramos el producto actual y limitamos los resultados
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
        where('activo', '==', true), // CORRECCIÓN: Usar 'activo'
        orderBy('fechaCreacion', 'desc'), // CORRECCIÓN: Usar 'fechaCreacion'
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
