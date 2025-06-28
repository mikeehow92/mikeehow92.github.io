// ==================== CONFIGURACIÓN INICIAL ====================
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
  authDomain: "mitienda-c2609.firebaseapp.com",
  databaseURL: "https://mitienda-c2609-default-rtdb.firebaseio.com",
  projectId: "mitienda-c2609",
  storageBucket: "mitienda-c2609.firebasestorage.app",
  messagingSenderId: "536746062790",
  appId: "1:536746062790:web:6e545efbc8f037e36538c7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Datos de municipios (Ejemplo para El Salvador)
const municipiosPorDepartamento = {
  'Ahuachapán': ['Ahuachapán', 'Apaneca', 'Atiquizaya', 'Concepción de Ataco', 'El Refugio', 
                'Guaymango', 'Jujutla', 'San Francisco Menéndez', 'San Lorenzo', 'San Pedro Puxtla',
                'Tacuba', 'Turín'],
  // ... (mantén el resto de municipios)
};

let checkoutData = null;

// ==================== FUNCIONES PAYPAL CON BACKEND ====================
async function createPayPalOrder() {
  try {
    const response = await fetch('https://us-central1-mitienda-c2609.cloudfunctions.net/api/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: checkoutData.total,
        items: checkoutData.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        customer: {
          email: document.getElementById('customerEmail').value,
          name: document.getElementById('customerName').value
        },
        shipping: {
          address: document.getElementById('shippingAddress').value,
          department: document.getElementById('departamento').value,
          municipality: document.getElementById('municipio').value
        }
      })
    });
    return await response.json();
  } catch (error) {
    console.error("Error creando orden PayPal:", error);
    throw error;
  }
}

async function capturePayPalOrder(orderID) {
  try {
    const response = await fetch('https://us-central1-mitienda-c2609.cloudfunctions.net/api/capture-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderID })
    });
    return await response.json();
  } catch (error) {
    console.error("Error capturando orden PayPal:", error);
    throw error;
  }
}

// ==================== FUNCIONES DE FIRESTORE ====================
async function saveTransaction(paymentDetails, orderId) {
  try {
    const user = auth.currentUser;
    
    await setDoc(doc(db, "transactions", orderId), {
      orderId: orderId,
      amount: checkoutData.total,
      items: checkoutData.items,
      customer: {
        userId: user?.uid || "guest",
        email: document.getElementById('customerEmail').value,
        name: document.getElementById('customerName').value,
        phone: document.getElementById('customerPhone').value
      },
      shipping: {
        address: document.getElementById('shippingAddress').value,
        department: document.getElementById('departamento').value,
        municipality: document.getElementById('municipio').value
      },
      paymentMethod: 'paypal',
      status: paymentDetails.status,
      paypalData: paymentDetails,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Error guardando transacción:", error);
    throw error;
  }
}

// ==================== INTEGRACIÓN PAYPAL BUTTON ====================
function setupPayPalButton() {
  if (!window.paypal) {
    console.error("PayPal SDK no cargado");
    return;
  }

  window.paypal.Buttons({
    style: {
      layout: 'vertical',
      color: 'blue',
      shape: 'rect',
      label: 'paypal',
      height: 40
    },
    createOrder: async function() {
      if (!validateForm()) {
        throw new Error('Complete todos los campos requeridos');
      }
      try {
        const order = await createPayPalOrder();
        return order.id;
      } catch (error) {
        showFeedback('Error', 'No se pudo iniciar el pago', 'error');
        throw error;
      }
    },
    onApprove: async function(data) {
      try {
        const details = await capturePayPalOrder(data.orderID);
        await saveTransaction(details, data.orderID);
        
        showFeedback('¡Pago completado!', `Orden #${data.orderID} procesada`, 'success');
        localStorage.removeItem('currentCheckout');
        
        setTimeout(() => {
          window.location.href = 'confirmacion.html';
        }, 3000);
      } catch (error) {
        console.error("Error en el pago:", error);
        showFeedback('Error', 'Error al procesar el pago', 'error');
      }
    },
    onError: function(err) {
      console.error("Error en PayPal:", err);
      showFeedback('Error', 'Error al procesar pago con PayPal', 'error');
      document.getElementById('alternativePayment').style.display = 'block';
    }
  }).render('#paypal-button-container');
}

// ==================== MÉTODO ALTERNATIVO ====================
function setupAlternativePayment() {
  const altBtn = document.getElementById('alternativePayment');
  
  altBtn.addEventListener('click', async function() {
    if (!validateForm()) {
      showFeedback('Error', 'Complete todos los campos', 'error');
      return;
    }
    
    try {
      const orderId = 'ALT-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      
      await saveTransaction({
        status: 'completed',
        id: orderId,
        payer: {
          name: { given_name: document.getElementById('customerName').value },
          email_address: document.getElementById('customerEmail').value
        }
      }, orderId);
      
      showFeedback('¡Pago exitoso!', `Orden #${orderId} procesada`, 'success');
      localStorage.removeItem('currentCheckout');
      
      setTimeout(() => {
        window.location.href = 'confirmacion.html';
      }, 3000);
    } catch (error) {
      console.error("Error en pago alternativo:", error);
      showFeedback('Error', 'Error al procesar pago alternativo', 'error');
    }
  });
}

// ==================== FUNCIONES AUXILIARES ====================
function validateForm() {
  const requiredFields = [
    'customerName', 'customerEmail', 'customerPhone',
    'shippingAddress', 'departamento', 'municipio'
  ];
  
  let isValid = true;
  
  requiredFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (!field.value.trim()) {
      isValid = false;
      field.style.borderColor = '#ff0000';
    } else {
      field.style.borderColor = '';
    }
  });
  
  return isValid;
}

function showFeedback(title, message, type = 'success') {
  const modal = document.getElementById('feedbackModal');
  const icon = document.getElementById('feedbackIcon');
  
  icon.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'times-circle'} ${type}"></i>`;
  document.getElementById('feedbackTitle').textContent = title;
  document.getElementById('feedbackMessage').textContent = message;
  modal.classList.add('active');
}

function setupAddressForm() {
  const deptoSelect = document.getElementById('departamento');
  const muniSelect = document.getElementById('municipio');

  deptoSelect.innerHTML = '<option value="">Seleccione departamento...</option>';
  Object.keys(municipiosPorDepartamento).forEach(depto => {
    deptoSelect.innerHTML += `<option value="${depto}">${depto}</option>`;
  });

  deptoSelect.addEventListener('change', function() {
    updateMunicipios(this.value);
  });
}

function updateMunicipios(departamento) {
  const muniSelect = document.getElementById('municipio');
  muniSelect.innerHTML = '<option value="">Seleccione municipio...</option>';

  if (departamento && municipiosPorDepartamento[departamento]) {
    municipiosPorDepartamento[departamento].forEach(municipio => {
      muniSelect.innerHTML += `<option value="${municipio}">${municipio}</option>`;
    });
  }
}

function renderCartItems() {
  const container = document.getElementById('orderItems');
  let html = '';
  
  checkoutData.items.forEach(item => {
    html += `
      <div class="order-item">
        <img src="${item.image || 'assets/default-product.png'}" alt="${item.name}" width="50">
        <span>${item.name}</span>
        <span>${item.quantity} × $${item.price.toFixed(2)}</span>
      </div>
    `;
  });
  
  container.innerHTML = html || '<p>No hay productos en el carrito</p>';
  updateTotals();
}

function updateTotals() {
  document.getElementById('orderTotal').textContent = checkoutData.total.toFixed(2);
  document.getElementById('paymentTotal').textContent = checkoutData.total.toFixed(2);
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
  // Cargar datos del carrito
  checkoutData = JSON.parse(localStorage.getItem('currentCheckout')) || { items: [], total: 0 };
  
  if (!checkoutData.items.length) {
    showFeedback('Error', 'No hay productos en el carrito', 'error');
    setTimeout(() => window.location.href = 'productos.html', 2000);
    return;
  }

  // Inicializar componentes
  setupAddressForm();
  renderCartItems();
  
  // Cargar SDK PayPal dinámicamente
  const script = document.createElement('script');
  script.src = 'https://www.paypal.com/sdk/js?client-id=SB&currency=USD'; // SB para sandbox
  script.onload = () => setupPayPalButton();
  script.onerror = () => {
    console.error("Error cargando PayPal SDK");
    document.getElementById('alternativePayment').style.display = 'block';
  };
  document.head.appendChild(script);
  
  setupAlternativePayment();
  
  // Cerrar modal de feedback
  document.getElementById('feedbackClose').addEventListener('click', () => {
    document.getElementById('feedbackModal').classList.remove('active');
  });
});
