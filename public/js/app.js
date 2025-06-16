// Variables globales
let cart = [];

// DOM Elements
const cartIcon = document.getElementById('cartIcon');
const cartModal = document.getElementById('cartModal');
const closeModal = document.querySelector('.close-modal');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    // Botones "Añadir al carrito"
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', (e) => {
            const product = {
                id: e.target.dataset.id,
                name: e.target.dataset.name,
                price: parseFloat(e.target.dataset.price)
            };
            addToCart(product);
        });
    });

    // Carrito modal
    cartIcon.addEventListener('click', toggleCart);
    closeModal.addEventListener('click', toggleCart);
}

// Funciones del carrito
function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        product.quantity = 1;
        cart.push(product);
    }
    
    updateCartUI();
    saveCartToFirestore();
    showFeedback('✅ Producto añadido al carrito');
}

function toggleCart() {
    cartModal.style.display = cartModal.style.display === 'block' ? 'none' : 'block';
}

function updateCartUI() {
    const cartCounter = document.getElementById('cartCounter');
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalElement = document.getElementById('cartTotal');
    
    // Actualizar contador
    cartCounter.textContent = cart.reduce((total, item) => total + item.quantity, 0);
    
    // Actualizar items del carrito
    cartItemsContainer.innerHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        const cartItemElement = document.createElement('div');
        cartItemElement.className = 'cart-item';
        cartItemElement.innerHTML = `
            <div class="cart-item-info">
                <span>${item.name}</span>
                <span>${item.quantity} x $${item.price.toFixed(2)}</span>
            </div>
            <button class="remove-item" data-id="${item.id}">🗑️</button>
        `;
        cartItemsContainer.appendChild(cartItemElement);
        total += item.price * item.quantity;
    });
    
    // Actualizar total
    cartTotalElement.textContent = total.toFixed(2);
    
    // Event listeners para botones de eliminar
    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', (e) => {
            removeFromCart(e.target.dataset.id);
        });
    });
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
    saveCartToFirestore();
}

// Firebase Firestore Integration
async function saveCartToFirestore() {
    try {
        const user = firebase.auth().currentUser;
        const userId = user ? user.uid : 'guest';
        
        await db.collection('carts').doc(userId).set({
            items: cart,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error al guardar el carrito:", error);
    }
}

async function loadCart() {
    try {
        const user = firebase.auth().currentUser;
        const userId = user ? user.uid : 'guest';
        
        const doc = await db.collection('carts').doc(userId).get();
        if (doc.exists) {
            cart = doc.data().items || [];
            updateCartUI();
        }
    } catch (error) {
        console.error("Error al cargar el carrito:", error);
    }
}

// Helpers
function showFeedback(message) {
    const feedback = document.createElement('div');
    feedback.className = 'feedback-message';
    feedback.textContent = message;
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.remove();
    }, 2000);
}
