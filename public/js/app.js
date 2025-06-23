// Configuración de Firebase
import { app, db, auth } from './firebase-config.js';
import { 
  doc, setDoc, getDoc, serverTimestamp,
  collection, addDoc 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// Variables globales
let cart = [];
let currentUser = null;

// Función para mostrar notificaciones
function showFeedback(message, type = 'success') {
  const feedback = document.createElement('div');
  feedback.className = `feedback ${type}`;
  feedback.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(feedback);
  setTimeout(() => feedback.remove(), 3000);
}

// Función principal de inicialización
export function initializeCart() {
  console.log("Inicializando sistema de carrito...");
  
  // Configurar observador de autenticación
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    loadCart();
  });

  // Manejador de eventos mejorado
  document.addEventListener('click', (e) => {
    // Añadir al carrito
    if (e.target.closest('.add-to-cart')) {
      const button = e.target.closest('.add-to-cart');
      console.log("Añadiendo producto:", button.dataset.name);
      
      const product = {
        id: button.dataset.id,
        name: button.dataset.name,
        price: parseFloat(button.dataset.price),
        image: button.dataset.image || ''
      };
      
      // Lógica para añadir al carrito
      const existingItem = cart.find(item => item.id === product.id);
      if (existingItem) {
        existingItem.quantity++;
      } else {
        cart.push({
          ...product,
          quantity: 1
        });
      }
      
      // Actualizar interfaz
      updateCartCounter();
      showFeedback(`${product.name} añadido al carrito`, 'success');
      
      // Guardar en localStorage temporalmente
      localStorage.setItem('cart', JSON.stringify(cart));
    }
    
    // Otros manejadores de eventos...
  });

  // Actualizar contador inicial
  updateCartCounter();
}

// Función para actualizar el contador del carrito
function updateCartCounter() {
  const counter = document.getElementById('cartCounter');
  if (counter) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    counter.textContent = totalItems;
    counter.style.display = totalItems > 0 ? 'inline-block' : 'none';
  }
}

// Función para cargar el carrito
async function loadCart() {
  const localCart = localStorage.getItem('cart');
  if (localCart) {
    cart = JSON.parse(localCart);
    updateCartCounter();
  }
}
