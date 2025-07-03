import { loadScript } from './utils.js';

// Configuración base de la API
const API_BASE = "https://api-id2wh2idaa-uc.a.run.app";

/**
 * Inicializa el sistema de pago PayPal
 */
export async function initPayPalCheckout() {
  try {
    // 1. Cargar datos del carrito
    const checkoutData = loadCheckoutData();
    validateCheckoutData(checkoutData);

    // 2. Renderizar resumen del pedido
    renderCartItems(checkoutData);
    updateTotals(checkoutData);

    // 3. Configurar formulario de dirección
    setupAddressForm();

    // 4. Cargar SDK de PayPal
    await loadPayPalSDK();

    // 5. Configurar botón de PayPal
    setupPayPalButton(checkoutData);

    // 6. Configurar método alternativo
    setupAlternativePayment(checkoutData);

    // 7. Configurar cierre del modal
    setupModalClose();

  } catch (error) {
    console.error('Error inicializando pago:', error);
    showFeedback('Error', error.message, 'error');
    
    // Redirigir si no hay productos
    if (error.message.includes('carrito')) {
      setTimeout(() => window.location.href = 'productos.html', 2000);
    }
  }
}

// ==================== FUNCIONES PRINCIPALES ====================

async function loadPayPalSDK() {
  if (!window.paypal) {
    await loadScript(
      'https://www.paypal.com/sdk/js?client-id=SB&currency=USD&components=buttons,card-fields'
    );
  }
}

function setupPayPalButton(checkoutData) {
  window.paypal.Buttons({
    style: {
      layout: 'vertical',
      color: 'blue',
      shape: 'rect',
      label: 'paypal',
      height: 40
    },
    
    createOrder: async () => {
      if (!validateForm()) {
        throw new Error('Complete todos los campos requeridos');
      }
      
      try {
        const order = await createPayPalOrder(checkoutData);
        return order.id;
      } catch (error) {
        showFeedback('Error', 'No se pudo iniciar el pago', 'error');
        throw error;
      }
    },
    
    onApprove: async (data) => {
      try {
        const details = await capturePayPalOrder(data.orderID);
        await saveTransaction(details, data.orderID, checkoutData);
        
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
    
    onError: (err) => {
      console.error("Error en PayPal:", err);
      showFeedback('Error', 'Error al procesar pago con PayPal', 'error');
      document.getElementById('alternativePayment').style.display = 'block';
    }
    
  }).render('#paypal-button-container');
}

// ==================== FUNCIONES DE PAYPAL ====================

async function createPayPalOrder(checkoutData) {
  const response = await fetch(`${API_BASE}/create-paypal-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
}

async function capturePayPalOrder(orderID) {
  const response = await fetch(`${API_BASE}/capture-paypal-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderID })
  });
  return await response.json();
}

// ==================== FUNCIONES DE FIRESTORE ====================

async function saveTransaction(paymentDetails, orderId, checkoutData) {
  const user = auth.currentUser;
  
  await setDoc(doc(db, "transactions", orderId), {
    orderId: orderId,
    amount: checkoutData.total,
    subtotal: checkoutData.subtotal,
    tax: checkoutData.tax,
    shipping: checkoutData.shipping,
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
    timestamp: serverTimestamp(),
    isGuest: !user
  });
}

// ==================== FUNCIONES AUXILIARES ====================

function loadCheckoutData() {
  const data = JSON.parse(localStorage.getItem('currentCheckout')) || { 
    items: [],
    total: 0,
    subtotal: 0,
    tax: 0,
    shipping: 0,
    isGuest: false
  };
  
  console.log('Datos del carrito cargados:', data);
  return data;
}

function validateCheckoutData(checkoutData) {
  if (!checkoutData.items || checkoutData.items.length === 0) {
    throw new Error('No hay productos en el carrito');
  }
}

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

function setupAlternativePayment(checkoutData) {
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
      }, orderId, checkoutData);
      
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

function setupAddressForm() {
  const deptoSelect = document.getElementById('departamento');
  const muniSelect = document.getElementById('municipio');

  // Llenar departamentos
  deptoSelect.innerHTML = '<option value="">Seleccione departamento...</option>';
  Object.keys(municipiosPorDepartamento).forEach(depto => {
    deptoSelect.innerHTML += `<option value="${depto}">${depto}</option>`;
  });

  // Actualizar municipios al cambiar departamento
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

function renderCartItems(checkoutData) {
  const container = document.getElementById('orderItems');
  let html = '';
  
  checkoutData.items.forEach(item => {
    html += `
      <div class="order-item">
        <img src="${item.image || 'assets/default-product.png'}" alt="${item.name}" width="50">
        <div class="item-details">
          <span class="item-name">${item.name}</span>
          <span class="item-price">${item.quantity} × $${item.price.toFixed(2)}</span>
          <span class="item-total">$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
      </div>
    `;
  });
  
  // Resumen de totales
  html += `
    <div class="order-summary">
      <div class="summary-row">
        <span>Subtotal:</span>
        <span>$${checkoutData.subtotal.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>Impuestos (${(checkoutData.tax/checkoutData.subtotal*100).toFixed(0)}%):</span>
        <span>$${checkoutData.tax.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>Envío:</span>
        <span>$${checkoutData.shipping.toFixed(2)}</span>
      </div>
      <div class="summary-row total">
        <span>Total:</span>
        <span>$${checkoutData.total.toFixed(2)}</span>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

function updateTotals(checkoutData) {
  document.getElementById('orderTotal').textContent = checkoutData.total.toFixed(2);
  document.getElementById('paymentTotal').textContent = checkoutData.total.toFixed(2);
}

function showFeedback(title, message, type = 'success') {
  const modal = document.getElementById('feedbackModal');
  const icon = document.getElementById('feedbackIcon');
  
  icon.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'times-circle'} ${type}"></i>`;
  document.getElementById('feedbackTitle').textContent = title;
  document.getElementById('feedbackMessage').textContent = message;
  modal.classList.add('active');
}

function setupModalClose() {
  document.getElementById('feedbackClose').addEventListener('click', () => {
    document.getElementById('feedbackModal').classList.remove('active');
  });
}

// Datos geográficos (deberían importarse de un archivo aparte)
const municipiosPorDepartamento = {
  'Ahuachapán': ['Ahuachapán', 'Apaneca', 'Atiquizaya', 'Concepción de Ataco', 'El Refugio', 
                'Guaymango', 'Jujutla', 'San Francisco Menéndez', 'San Lorenzo', 'San Pedro Puxtla',
                'Tacuba', 'Turín'],
  'Santa Ana': ['Santa Ana', 'Candelaria de la Frontera', 'Chalchuapa', 'Coatepeque', 'El Congo',
               'El Porvenir', 'Masahuat', 'Metapán', 'San Antonio Pajonal', 'San Sebastián Salitrillo',
               'Santiago de la Frontera', 'Texistepeque'],
  'Sonsonate': ['Sonsonate', 'Acajutla', 'Armenia', 'Caluco', 'Cuisnahuat', 'Izalco',
               'Juayúa', 'Nahuizalco', 'Nahulingo', 'Salcoatitán', 'San Antonio del Monte',
               'San Julián', 'Santa Catarina Masahuat', 'Santa Isabel Ishuatán', 'Santo Domingo de Guzmán',
               'Sonzacate'],
  'La Libertad': ['Santa Tecla', 'Antiguo Cuscatlán', 'Chiltiupán', 'Ciudad Arce', 'Colón',
                 'Comasagua', 'Huizúcar', 'Jayaque', 'Jicalapa', 'La Libertad',
                 'Nuevo Cuscatlán', 'Opico', 'Quezaltepeque', 'Sacacoyo', 'San José Villanueva',
                 'San Matías', 'San Pablo Tacachico', 'Talnique', 'Tamanique', 'Teotepeque',
                 'Tepecoyo', 'Zaragoza'],
  'Chalatenango': ['Chalatenango', 'Agua Caliente', 'Arcatao', 'Azacualpa', 'Citalá',
                  'Comalapa', 'Concepción Quezaltepeque', 'Dulce Nombre de María', 'El Carrizal',
                  'El Paraíso', 'La Laguna', 'La Palma', 'La Reina', 'Las Flores',
                  'Las Vueltas', 'Nombre de Jesús', 'Nueva Concepción', 'Nueva Trinidad',
                  'Ojos de Agua', 'Potonico', 'San Antonio de la Cruz', 'San Antonio Los Ranchos',
                  'San Fernando', 'San Francisco Lempa', 'San Francisco Morazán', 'San Ignacio',
                  'San Isidro Labrador', 'San José Cancasque', 'San José Las Flores', 'San Luis del Carmen',
                  'San Miguel de Mercedes', 'San Rafael', 'Santa Rita', 'Tejutla'],
  'San Salvador': ['San Salvador', 'Aguilares', 'Apopa', 'Ayutuxtepeque', 'Cuscatancingo',
                  'Delgado', 'El Paisnal', 'Guazapa', 'Ilopango', 'Mejicanos',
                  'Nejapa', 'Panchimalco', 'Rosario de Mora', 'San Marcos', 'San Martín',
                  'San Salvador', 'Santiago Texacuangos', 'Santo Tomás', 'Soyapango', 'Tonacatepeque'],
  'Cuscatlán': ['Cojutepeque', 'Candelaria', 'El Carmen', 'El Rosario', 'Monte San Juan',
               'Oratorio de Concepción', 'San Bartolomé Perulapía', 'San Cristóbal', 'San José Guayabal',
               'San Pedro Perulapán', 'San Rafael Cedros', 'San Ramón', 'Santa Cruz Analquito',
               'Santa Cruz Michapa', 'Suchitoto', 'Tenancingo'],
  'La Paz': ['Zacatecoluca', 'Cuyultitán', 'El Rosario', 'Jerusalén', 'Mercedes La Ceiba',
            'Olocuilta', 'Paraíso de Osorio', 'San Antonio Masahuat', 'San Emigdio',
            'San Francisco Chinameca', 'San Juan Nonualco', 'San Juan Talpa', 'San Juan Tepezontes',
            'San Luis La Herradura', 'San Luis Talpa', 'San Miguel Tepezontes', 'San Pedro Masahuat',
            'San Pedro Nonualco', 'San Rafael Obrajuelo', 'Santa María Ostuma', 'Santiago Nonualco',
            'Tapalhuaca'],
  'Cabañas': ['Sensuntepeque', 'Cinquera', 'Dolores', 'Guacotecti', 'Ilobasco',
             'Jutiapa', 'San Isidro', 'Tejutepeque', 'Victoria'],
  'San Vicente': ['San Vicente', 'Apastepeque', 'Guadalupe', 'San Cayetano Istepeque',
                 'San Esteban Catarina', 'San Ildefonso', 'San Lorenzo', 'San Sebastián',
                 'Santa Clara', 'Santo Domingo', 'Tecoluca', 'Tepetitán', 'Verapaz'],
  'Usulután': ['Usulután', 'Alegría', 'Berlín', 'California', 'Concepción Batres',
              'El Triunfo', 'Ereguayquín', 'Estanzuelas', 'Jiquilisco', 'Jucuapa',
              'Jucuarán', 'Mercedes Umaña', 'Nueva Granada', 'Ozatlán', 'Puerto El Triunfo',
              'San Agustín', 'San Buenaventura', 'San Dionisio', 'San Francisco Javier',
              'Santa Elena', 'Santa María', 'Santiago de María', 'Tecapán'],
  'San Miguel': ['San Miguel', 'Carolina', 'Chapeltique', 'Chinameca', 'Chirilagua',
                'Ciudad Barrios', 'Comacarán', 'El Tránsito', 'Lolotique', 'Moncagua',
                'Nueva Guadalupe', 'Nuevo Edén de San Juan', 'Quelepa', 'San Antonio del Mosco',
                'San Gerardo', 'San Jorge', 'San Luis de la Reina', 'San Rafael Oriente',
                'Sesori', 'Uluazapa'],
  'Morazán': ['San Francisco Gotera', 'Arambala', 'Cacaopera', 'Chilanga', 'Corinto',
             'Delicias de Concepción', 'El Divisadero', 'El Rosario', 'Gualococti',
             'Guatajiagua', 'Joateca', 'Jocoaitique', 'Jocoro', 'Lolotiquillo', 'Meanguera',
             'Osicala', 'Perquín', 'San Carlos', 'San Fernando', 'San Isidro',
             'San Simón', 'Sensembra', 'Sociedad', 'Torola', 'Yamabal', 'Yoloaiquín'],
  'La Unión': ['La Unión', 'Anamorós', 'Bolívar', 'Concepción de Oriente', 'Conchagua',
              'El Carmen', 'El Sauce', 'Intipucá', 'Lislique', 'Meanguera del Golfo',
              'Nueva Esparta', 'Pasaquina', 'Polorós', 'San Alejo', 'San José',
              'Santa Rosa de Lima', 'Yayantique', 'Yucuaiquín']
};
// Inicialización de Firebase (debería importarse)
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
