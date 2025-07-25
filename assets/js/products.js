// assets/js/products.js
import { db } from './firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

export const ProductService = {
    /**
     * Obtiene todos los productos de Firestore.
     * @returns {Promise<Array<Object>>} Un array de productos.
     */
    getAllProducts: async () => {
        const productsCol = collection(db, 'products');
        const productSnapshot = await getDocs(productsCol);
        const productList = productSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return productList;
    },

    /**
     * Obtiene productos por categoría de Firestore.
     * @param {string} category - La categoría de los productos.
     * @returns {Promise<Array<Object>>} Un array de productos.
     */
    getProductsByCategory: async (category) => {
        const productsCol = collection(db, 'products');
        const q = query(productsCol, where('category', '==', category));
        const productSnapshot = await getDocs(q);
        const productList = productSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return productList;
    }
};
