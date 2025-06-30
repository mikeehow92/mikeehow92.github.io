import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';

// Configuración de Firebase (ajusta según tu proyecto)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Guarda una orden de pago en Firestore
 * @param {Object} orderData - Datos de la orden
 * @param {string} orderData.id - ID de la orden PayPal
 * @param {string} orderData.userId - ID del usuario
 * @param {number} orderData.amount - Monto total
 * @param {string} orderData.status - Estado del pago
 * @param {Array} orderData.items - Productos comprados
 * @returns {Promise<void>}
 */
export const saveOrder = async (orderData) => {
  try {
    const orderRef = doc(db, 'orders', orderData.id);
    
    await setDoc(orderRef, {
      ...orderData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('Orden guardada con ID:', orderData.id);
  } catch (error) {
    console.error('Error guardando orden:', error);
    throw new Error('No se pudo guardar la orden');
  }
};

/**
 * Obtiene una orden específica
 * @param {string} orderId - ID de la orden
 * @returns {Promise<Object|null>}
 */
export const getOrder = async (orderId) => {
  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);
  
  if (orderSnap.exists()) {
    return { id: orderSnap.id, ...orderSnap.data() };
  }
  
  return null;
};

/**
 * Obtiene todas las órdenes de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>}
 */
export const getUserOrders = async (userId) => {
  const ordersQuery = query(
    collection(db, 'orders'),
    where('userId', '==', userId)
  );
  
  const querySnapshot = await getDocs(ordersQuery);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Actualiza el estado de una orden
 * @param {string} orderId - ID de la orden
 * @param {string} status - Nuevo estado
 * @returns {Promise<void>}
 */
export const updateOrderStatus = async (orderId, status) => {
  const orderRef = doc(db, 'orders', orderId);
  
  await setDoc(orderRef, {
    status,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

/**
 * Guarda información de perfil del usuario
 * @param {string} userId - ID del usuario
 * @param {Object} profileData - Datos del perfil
 * @returns {Promise<void>}
 */
export const saveUserProfile = async (userId, profileData) => {
  const profileRef = doc(db, 'profiles', userId);
  
  await setDoc(profileRef, {
    ...profileData,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

/**
 * Obtiene el perfil de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object|null>}
 */
export const getUserProfile = async (userId) => {
  const profileRef = doc(db, 'profiles', userId);
  const profileSnap = await getDoc(profileRef);
  
  if (profileSnap.exists()) {
    return profileSnap.data();
  }
  
  return null;
};

// Exporta la instancia de Firestore por si se necesita directamente
export { db };
