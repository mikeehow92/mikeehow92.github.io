// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
  authDomain: "mitienda-c2609.firebaseapp.com",
  databaseURL: "https://mitienda-c2609-default-rtdb.firebaseio.com",
  projectId: "mitienda-c2609",
  storageBucket: "mitienda-c2609.firebasestorage.app",
  messagingSenderId: "536746062790",
  appId: "1:536746062790:web:6e545efbc8f037e36538c7"
};

// Inicializar Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Datos de municipios por departamento (El Salvador)
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
let paypalSdkLoaded = false;

// ==================== FUNCIONES PRINCIPALES ====================

// Función para inicializar PayPal
async function initializePayPal() {
  try {
    console.log("Inicializando PayPal...");
    
    // 1. Obtener configuración de PayPal desde Cloud Functions
    const getPaypalConfig = firebase.functions().httpsCallable('getPaypalConfig');
    const { data } = await getPaypalConfig();
    
    if (!data || !data.clientId) {
      throw new Error("No se recibió clientId de PayPal");
    }

    // 2. Cargar SDK de PayPal dinámicamente
    await loadPayPalSdk(data.clientId);
    
    // 3. Configurar botones de PayPal
    setupPayPalButton();
    
  } catch (error) {
    console.error("Error al inicializar PayPal:", error);
    showFeedback('Aviso', 'El pago con PayPal no está disponible. Por favor use el método alternativo.', 'info');
    activateAlternativePayment();
  }
}

// Función para cargar el SDK de PayPal
function loadPayPalSdk(clientId) {
  return new Promise((resolve, reject) => {
    if (window.paypal) {
      paypalSdkLoaded = true;
      return resolve();
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    script.async = true;
    
    // Timeout para evitar espera infinita
    const timeout = setTimeout(() => {
      reject(new Error("Timeout al cargar SDK de PayPal"));
    }, 10000);

    script.onload = () => {
      clearTimeout(timeout);
      paypalSdkLoaded = true;
      console.log("SDK de PayPal cargado correctamente");
      resolve();
    };
    
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Error al cargar SDK de PayPal"));
    };
    
    document.head.appendChild(script);
  });
}

// Configurar botones de PayPal
function setupPayPalButton() {
  try {
    if (!window.paypal || !window.paypal.Buttons) {
      throw new Error("PayPal Buttons no disponible");
    }

    paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'paypal'
      },
      createOrder: function(data, actions) {
        if (!validateForm()) {
          return Promise.reject(new Error('Complete todos los campos requeridos'));
        }
        
        return actions.order.create({
          purchase_units: [{
            amount: {
              value: checkoutData.total.toFixed(2),
              currency_code: 'USD'
            },
            shipping: {
              address: {
                address_line_1: document.getElementById('shippingAddress').value,
                admin_area_2: document.getElementById('municipio').value,
                admin_area_1: document.getElementById('departamento').value,
                country_code: 'SV'
              }
            }
          }]
        });
      },
      onApprove: function(data, actions) {
        return actions.order.capture().then(function(details) {
          processPaymentSuccess(details, data.orderID, 'paypal');
        });
      },
      onError: function(err) {
        console.error("Error en PayPal:", err);
        handlePaymentError(err);
      }
    }).render('#paypal-button-container');
    
  } catch (error) {
    console.error("Error al configurar botón PayPal:", error);
    handlePaymentError(error);
  }
}

// Activar método de pago alternativo
function activateAlternativePayment() {
  console.log("Activando método de pago alternativo...");
  document.getElementById('paypal-button-container').style.display = 'none';
  document.getElementById('alternativePayment').style.display = 'block';
}

// Configurar botón de pago alternativo
function setupAlternativePayment() {
  const altPaymentBtn = document.getElementById('alternativePayment');
  
  altPaymentBtn.addEventListener('click', async function() {
    if (!validateForm()) {
      showFeedback('Error', 'Complete todos los campos requeridos', 'error');
      return;
    }
    
    try {
      showFeedback('Procesando', 'Procesando su pago alternativo...', 'info');
      
      const orderId = generateOrderId();
      await processPaymentSuccess({
        status: 'completed',
        payer: {
          name: { given_name: document.getElementById('customerName').value },
          email_address: document.getElementById('customerEmail').value
        }
      }, orderId, 'alternative');
      
    } catch (error) {
      console.error("Error en pago alternativo:", error);
      showFeedback('Error', 'Error al procesar el pago alternativo', 'error');
    }
  });
}

// Procesar pago exitoso
async function processPaymentSuccess(details, orderId, paymentMethod) {
  try {
    await saveTransactionToFirebase(details, orderId, paymentMethod);
    
    showFeedback(
      '¡Pago completado!', 
      `Pedido #${orderId} procesado correctamente`, 
      'success'
    );
    
    localStorage.removeItem('currentCheckout');
    setTimeout(() => window.location.href = 'confirmacion.html', 3000);
    
  } catch (error) {
    console.error("Error al procesar pago:", error);
    throw error;
  }
}

// Manejar errores de pago
function handlePaymentError(error) {
  console.error("Error en el proceso de pago:", error);
  showFeedback(
    'Error en el pago', 
    'No pudimos procesar su pago. Por favor intente con el método alternativo.', 
    'error'
  );
  activateAlternativePayment();
}

// ==================== FUNCIONES AUXILIARES ====================

// Validar formulario
function validateForm() {
  const requiredFields = [
    'customerName', 'customerEmail', 
    'customerPhone', 'shippingAddress', 
    'departamento', 'municipio'
  ];
  
  let isValid = true;

  requiredFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (!field.value.trim()) {
      isValid = false;
      field.style.borderColor = '#e63946';
    } else {
      field.style.borderColor = '';
    }
  });

  return isValid;
}

// Guardar transacción en Firebase
async function saveTransactionToFirebase(details, orderId, paymentMethod) {
  try {
    const transactionData = {
      orderId,
      amount: checkoutData.total,
      items: checkoutData.items,
      customer: {
        name: document.getElementById('customerName').value,
        email: document.getElementById('customerEmail').value,
        phone: document.getElementById('customerPhone').value
      },
      shipping: {
        address: document.getElementById('shippingAddress').value,
        department: document.getElementById('departamento').value,
        municipality: document.getElementById('municipio').value
      },
      status: details.status || 'completed',
      paymentMethod,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    await firebase.firestore().collection('transactions').add(transactionData);
  } catch (error) {
    console.error("Error al guardar transacción:", error);
    throw error;
  }
}

// Mostrar feedback al usuario
function showFeedback(title, message, type = 'success') {
  const modal = document.getElementById('feedbackModal');
  const icon = document.getElementById('feedbackIcon');
  
  icon.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'times-circle'} ${type}"></i>`;
  document.getElementById('feedbackTitle').textContent = title;
  document.getElementById('feedbackMessage').textContent = message;
  modal.classList.add('active');
}

// Generar ID de orden
function generateOrderId() {
  return 'ORD-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Configurar formulario de dirección
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

// Actualizar lista de municipios
function updateMunicipios(departamento) {
  const muniSelect = document.getElementById('municipio');
  muniSelect.innerHTML = '<option value="">Seleccione municipio...</option>';

  if (departamento && municipiosPorDepartamento[departamento]) {
    municipiosPorDepartamento[departamento].forEach(municipio => {
      muniSelect.innerHTML += `<option value="${municipio}">${municipio}</option>`;
    });
  }
}

// Mostrar error y redirigir
function showErrorAndRedirect(message) {
  showFeedback('Error', message, 'error');
  setTimeout(() => window.location.href = 'productos.html', 3000);
}

// Renderizar items del carrito
function renderCartItems() {
  const orderItemsContainer = document.getElementById('orderItems');
  let html = '';
  
  checkoutData.items.forEach(item => {
    html += `
      <div class="order-item" data-id="${item.id}">
        <span class="item-name">${item.name}</span>
        <span class="item-quantity">${item.quantity} ×</span>
        <span class="item-price">$${item.price.toFixed(2)}</span>
        <button class="btn-remove" data-id="${item.id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
  });
  
  orderItemsContainer.innerHTML = html || '<p>No hay productos en el carrito</p>';
  updateTotals();
  
  // Agregar event listeners para eliminar items
  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', handleRemoveItem);
  });
}

// Manejar eliminación de items
function handleRemoveItem(e) {
  const productId = e.currentTarget.dataset.id;
  checkoutData.items = checkoutData.items.filter(item => item.id !== productId);
  checkoutData.total = checkoutData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  localStorage.setItem('currentCheckout', JSON.stringify(checkoutData));
  renderCartItems();
  
  if (!checkoutData.items.length) {
    setTimeout(() => window.location.href = 'productos.html', 1500);
  }
}

// Actualizar totales
function updateTotals() {
  document.getElementById('orderTotal').textContent = checkoutData.total.toFixed(2);
  document.getElementById('paymentTotal').textContent = checkoutData.total.toFixed(2);
}

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
  // Cargar datos del carrito
  checkoutData = JSON.parse(localStorage.getItem('currentCheckout')) || { items: [], total: 0 };
  
  if (!checkoutData.items.length) {
    showErrorAndRedirect('No hay productos en el carrito');
    return;
  }

  // Configurar formulario de dirección
  setupAddressForm();
  
  // Mostrar items del carrito
  renderCartItems();
  
  // Inicializar métodos de pago
  initializePayPal();
  setupAlternativePayment();
  
  // Configurar cierre de modal de feedback
  document.getElementById('feedbackClose').addEventListener('click', () => {
    document.getElementById('feedbackModal').classList.remove('active');
  });
});
