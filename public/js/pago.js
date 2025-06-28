// ==================== CONFIGURACIÓN INICIAL ====================
// Firebase Configuration
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
  authDomain: "mitienda-c2609.firebaseapp.com",
  databaseURL: "https://mitienda-c2609-default-rtdb.firebaseio.com",
  projectId: "mitienda-c2609",
  storageBucket: "mitienda-c2609.firebasestorage.app",
  messagingSenderId: "536746062790",
  appId: "1:536746062790:web:6e545efbc8f037e36538c7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app);

// Variables para almacenar las credenciales de PayPal
let paypalClientId = '';

// Función para obtener las credenciales de PayPal desde Firebase Functions
async function getPayPalCredentials() {
  try {
    const response = await fetch('https://us-central1-mitienda-c2609.cloudfunctions.net/getPayPalCredentials');
    const data = await response.json();
    paypalClientId = data.clientId;
  } catch (error) {
    console.error("Error obteniendo credenciales de PayPal:", error);
    // Mostrar método de pago alternativo si falla
    document.getElementById('alternativePayment').style.display = 'block';
  }
}

// Datos de municipios (Ejemplo para El Salvador)
const municipiosPorDepartamento = {
  'Ahuachapán': ['Ahuachapán', 'Apaneca', 'Atiquizaya', 'Concepción de Ataco', 'El Refugio', 
                'Guaymango', 'Jujutla', 'San Francisco Menéndez', 'San Lorenzo', 'San Pedro Puxtla',
                'Tacuba', 'Turín'],
  'Santa Ana': ['Santa Ana', 'Candelaria de la Frontera', 'Chalchuapa', 'Coatepeque', 'El Congo',
              'El Porvenir', 'Masahuat', 'Metapán', 'San Antonio Pajonal', 'San Sebastián Salitrillo',
              'Santiago de la Frontera', 'Texistepeque'],
  'Sonsonate': ['Sonsonate', 'Acajutla', 'Armenia', 'Caluco', 'Cuisnahuat', 'Izalco', 'Juayúa',
              'Nahuizalco', 'Nahulingo', 'Salcoatitán', 'San Antonio del Monte', 'San Julián',
              'Santa Catarina Masahuat', 'Santa Isabel Ishuatán', 'Santo Domingo de Guzmán',
              'Sonzacate'],
  'Chalatenango': ['Chalatenango', 'Agua Caliente', 'Arcatao', 'Azacualpa', 'Cancasque', 'Citalá',
                  'Comalapa', 'Concepción Quezaltepeque', 'Dulce Nombre de María', 'El Carrizal',
                  'El Paraíso', 'La Laguna', 'La Palma', 'La Reina', 'Las Flores', 'Las Vueltas',
                  'Nombre de Jesús', 'Nueva Concepción', 'Nueva Trinidad', 'Ojos de Agua',
                  'Potonico', 'San Antonio de la Cruz', 'San Antonio Los Ranchos', 'San Fernando',
                  'San Francisco Lempa', 'San Francisco Morazán', 'San Ignacio', 'San Isidro Labrador',
                  'San José Cancasque', 'San José Las Flores', 'San Luis del Carmen', 'San Miguel de Mercedes',
                  'San Rafael', 'Santa Rita', 'Tejutla'],
  'La Libertad': ['Santa Tecla', 'Antiguo Cuscatlán', 'Chiltiupán', 'Ciudad Arce', 'Colón', 'Comasagua',
                'Huizúcar', 'Jayaque', 'Jicalapa', 'La Libertad', 'Nuevo Cuscatlán', 'Opico',
                'Quezaltepeque', 'Sacacoyo', 'San José Villanueva', 'San Juan Opico', 'San Matías',
                'San Pablo Tacachico', 'Talnique', 'Tamanique', 'Teotepeque', 'Tepecoyo', 'Zaragoza'],
  'San Salvador': ['San Salvador', 'Aguilares', 'Apopa', 'Ayutuxtepeque', 'Cuscatancingo', 'Delgado',
                  'El Paisnal', 'Guazapa', 'Ilopango', 'Mejicanos', 'Nejapa', 'Panchimalco',
                  'Rosario de Mora', 'San Marcos', 'San Martín', 'Santiago Texacuangos',
                  'Santo Tomás', 'Soyapango', 'Tonacatepeque'],
  'Cuscatlán': ['Cojutepeque', 'Candelaria', 'El Carmen', 'El Rosario', 'Monte San Juan', 'Oratorio de Concepción',
              'San Bartolomé Perulapía', 'San Cristóbal', 'San José Guayabal', 'San Pedro Perulapán',
              'San Rafael Cedros', 'San Ramón', 'Santa Cruz Analquito', 'Santa Cruz Michapa', 'Suchitoto',
              'Tenancingo'],
  'La Paz': ['Zacatecoluca', 'Cuyultitán', 'El Rosario', 'Jerusalén', 'Mercedes La Ceiba', 'Olocuilta',
            'Paraíso de Osorio', 'San Antonio Masahuat', 'San Emigdio', 'San Francisco Chinameca',
            'San Juan Nonualco', 'San Juan Talpa', 'San Juan Tepezontes', 'San Luis La Herradura',
            'San Luis Talpa', 'San Miguel Tepezontes', 'San Pedro Masahuat', 'San Pedro Nonualco',
            'San Rafael Obrajuelo', 'Santa María Ostuma', 'Santiago Nonualco', 'Tapalhuaca'],
  'Cabañas': ['Sensuntepeque', 'Cinquera', 'Dolores', 'Guacotecti', 'Ilobasco', 'Jutiapa', 'San Isidro',
            'Tejutepeque', 'Victoria'],
  'San Vicente': ['San Vicente', 'Apastepeque', 'Guadalupe', 'San Cayetano Istepeque', 'San Esteban Catarina',
                'San Ildefonso', 'San Lorenzo', 'San Sebastián', 'Santa Clara', 'Santo Domingo',
                'Tecoluca', 'Tepetitán', 'Verapaz'],
  'Usulután': ['Usulután', 'Alegría', 'Berlín', 'California', 'Concepción Batres', 'El Triunfo',
              'Ereguayquín', 'Estanzuelas', 'Jiquilisco', 'Jucuapa', 'Jucuarán', 'Mercedes Umaña',
              'Nueva Granada', 'Ozatlán', 'Puerto El Triunfo', 'San Agustín', 'San Buenaventura',
              'San Dionisio', 'San Francisco Javier', 'Santa Elena', 'Santa María', 'Santiago de María',
              'Tecapán'],
  'San Miguel': ['San Miguel', 'Carolina', 'Chapeltique', 'Chinameca', 'Chirilagua', 'Ciudad Barrios',
                'Comacarán', 'El Tránsito', 'Lolotique', 'Moncagua', 'Nueva Guadalupe', 'Nuevo Edén de San Juan',
                'Quelepa', 'San Antonio del Mosco', 'San Gerardo', 'San Jorge', 'San Luis de la Reina',
                'San Rafael Oriente', 'Sesori', 'Uluazapa'],
  'Morazán': ['San Francisco Gotera', 'Arambala', 'Cacaopera', 'Chilanga', 'Corinto', 'Delicias de Concepción',
            'El Divisadero', 'El Rosario', 'Gualococti', 'Guatajiagua', 'Joateca', 'Jocoaitique',
            'Jocoro', 'Lolotiquillo', 'Meanguera', 'Osicala', 'Perquín', 'San Carlos', 'San Fernando',
            'San Isidro', 'San Simón', 'Sensembra', 'Sociedad', 'Torola', 'Yamabal', 'Yoloaiquín'],
  'La Unión': ['La Unión', 'Anamorós', 'Bolívar', 'Concepción de Oriente', 'Conchagua', 'El Carmen',
              'El Sauce', 'Intipucá', 'Lislique', 'Meanguera del Golfo', 'Nueva Esparta', 'Pasaquina',
              'Polorós', 'San Alejo', 'San José', 'Santa Rosa de Lima', 'Yayantique', 'Yucuaiquín']
};

// Variables globales
let checkoutData = null;

// ==================== FUNCIONES DE FIRESTORE ====================
async function saveTransaction(paymentDetails, orderId) {
  try {
    const user = auth.currentUser;
    
    await setDoc(doc(db, "transactions", orderId), {
      orderId: orderId,
      amount: checkoutData.total,
      items: checkoutData.items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
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
      paypalData: {
        transactionId: paymentDetails.id,
        payer: paymentDetails.payer
      },
      timestamp: serverTimestamp()
    });
    
    console.log("Transacción guardada:", orderId);
  } catch (error) {
    console.error("Error guardando transacción:", error);
    throw error;
  }
}

// ==================== INTEGRACIÓN PAYPAL ====================
function loadPayPalSDK() {
  return new Promise((resolve, reject) => {
    if (window.paypal) return resolve();
    
    if (!paypalClientId) {
      return reject(new Error('Credenciales de PayPal no disponibles'));
    }
    
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD`;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Error cargando PayPal SDK'));
    document.head.appendChild(script);
  });
}

function setupPayPalButton() {
  window.paypal.Buttons({
    style: {
      layout: 'vertical',
      color: 'blue',
      shape: 'rect',
      label: 'paypal',
      height: 40
    },
    createOrder: function(data, actions) {
      if (!validateForm()) {
        return Promise.reject(new Error('Complete todos los campos requeridos'));
      }
      
      return actions.order.create({
        purchase_units: [{
          amount: {
            value: checkoutData.total.toFixed(2),
            currency_code: 'USD',
            breakdown: {
              item_total: {
                value: checkoutData.total.toFixed(2),
                currency_code: 'USD'
              }
            }
          },
          items: checkoutData.items.map(item => ({
            name: item.name.substring(0, 127),
            unit_amount: {
              value: item.price.toFixed(2),
              currency_code: 'USD'
            },
            quantity: item.quantity.toString()
          })),
          shipping: {
            address: {
              address_line_1: document.getElementById('shippingAddress').value,
              admin_area_2: document.getElementById('municipio').value,
              admin_area_1: document.getElementById('departamento').value,
              country_code: 'SV'
            }
          }
        }],
        application_context: {
          shipping_preference: 'SET_PROVIDED_ADDRESS'
        }
      });
    },
    onApprove: async function(data, actions) {
      try {
        const details = await actions.order.capture();
        await saveTransaction(details, data.orderID);
        
        showFeedback('¡Pago completado!', `Orden #${data.orderID} procesada`, 'success');
        localStorage.removeItem('currentCheckout');
        
        setTimeout(() => {
          window.location.href = 'confirmacion.html';
        }, 3000);
      } catch (error) {
        console.error("Error procesando pago:", error);
        showFeedback('Error', 'Pago completado pero error al guardar datos', 'error');
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

  // Llenar departamentos
  deptoSelect.innerHTML = '<option value="">Seleccione departamento...</option>';
  Object.keys(municipiosPorDepartamento).forEach(depto => {
    deptoSelect.innerHTML += `<option value="${depto}">${depto}</option>`;
  });

  // Actualizar municipios
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
  
  // Obtener credenciales de PayPal primero
  await getPayPalCredentials();
  
  try {
    await loadPayPalSDK();
    setupPayPalButton();
  } catch (error) {
    console.error("Error inicializando PayPal:", error);
    document.getElementById('alternativePayment').style.display = 'block';
  }
  
  setupAlternativePayment();
  
  // Cerrar modal de feedback
  document.getElementById('feedbackClose').addEventListener('click', () => {
    document.getElementById('feedbackModal').classList.remove('active');
  });
});
