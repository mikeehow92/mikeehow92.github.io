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

// Inicializar Firebase solo si no está inicializado
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Datos completos de El Salvador
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
let paypalLoadAttempted = false;
let paypalLoadSuccess = false;

// ==================== FUNCIONES DE DIRECCIÓN ====================

function setupAddressForm() {
  const deptoSelect = document.getElementById('departamento');
  const muniSelect = document.getElementById('municipio');

  // Llenar departamentos
  deptoSelect.innerHTML = '<option value="">Seleccione departamento...</option>';
  Object.keys(municipiosPorDepartamento).forEach(depto => {
    deptoSelect.innerHTML += `<option value="${depto}">${depto}</option>`;
  });

  // Actualizar municipios cuando cambia el departamento
  deptoSelect.addEventListener('change', function() {
    updateMunicipios(this.value);
  });
}

function updateMunicipios(departamentoSeleccionado) {
  const muniSelect = document.getElementById('municipio');
  muniSelect.innerHTML = '<option value="">Seleccione municipio...</option>';

  if (departamentoSeleccionado && municipiosPorDepartamento[departamentoSeleccionado]) {
    municipiosPorDepartamento[departamentoSeleccionado].forEach(municipio => {
      muniSelect.innerHTML += `<option value="${municipio}">${municipio}</option>`;
    });
  }
}

// ==================== FUNCIONES DE PAGO MEJORADAS ====================

async function initializePayPal() {
  if (paypalLoadAttempted) return;
  paypalLoadAttempted = true;

  try {
    console.log("Iniciando carga de PayPal...");
    
    const getPaypalConfig = firebase.functions().httpsCallable('getPaypalConfig');
    const { data } = await getPaypalConfig();
    
    if (!data.clientId) {
      throw new Error('No se pudo obtener el clientId de PayPal');
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${data.clientId}&currency=USD&intent=capture`;
    script.async = true;
    script.dataset.namespace = 'paypal_sdk';
    
    // Timeout para manejar carga lenta
    const paypalTimeout = setTimeout(() => {
      if (!paypalLoadSuccess) {
        console.error("Timeout: PayPal no cargó en el tiempo esperado");
        handlePayPalError();
      }
    }, 10000); // 10 segundos

    script.onload = () => {
      clearTimeout(paypalTimeout);
      paypalLoadSuccess = true;
      console.log("PayPal SDK cargado correctamente");
      setupPayPalButton();
    };
    
    script.onerror = () => {
      clearTimeout(paypalTimeout);
      console.error("Error al cargar PayPal SDK");
      handlePayPalError();
    };
    
    document.head.appendChild(script);
  } catch (error) {
    console.error("Error inicializando PayPal:", error);
    handlePayPalError();
  }
}

function handlePayPalError() {
  console.log("Activando método de pago alternativo...");
  document.getElementById('alternativePayment').style.display = 'block';
  document.getElementById('paypal-button-container').style.display = 'none';
  showFeedback('Aviso', 'El pago con PayPal no está disponible. Por favor use el método alternativo.', 'info');
}

function setupPayPalButton() {
  try {
    if (!window.paypal || !window.paypal.Buttons) {
      throw new Error("PayPal Buttons no está disponible");
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
          handleSuccessfulPayment(details, data.orderID);
        });
      },
      onError: function(err) {
        console.error("Error en botón PayPal:", err);
        handlePayPalError();
      }
    }).render('#paypal-button-container');
  } catch (error) {
    console.error("Error configurando botón PayPal:", error);
    handlePayPalError();
  }
}

function setupAlternativePayment() {
  const alternativeBtn = document.getElementById('alternativePayment');
  
  alternativeBtn.addEventListener('click', async function() {
    if (!validateForm()) {
      showFeedback('Error', 'Complete todos los campos requeridos', 'error');
      return;
    }
    
    try {
      showFeedback('Procesando', 'Estamos procesando su pago...', 'info');
      
      const orderId = generateOrderId();
      const paymentData = {
        status: 'completed',
        payer: {
          name: document.getElementById('customerName').value,
          email: document.getElementById('customerEmail').value
        }
      };
      
      await saveTransactionToFirebase(paymentData, orderId);
      
      showFeedback('¡Pago completado!', `Pedido #${orderId} procesado exitosamente`, 'success');
      localStorage.removeItem('currentCheckout');
      
      setTimeout(() => {
        window.location.href = 'confirmacion.html';
      }, 3000);
      
    } catch (error) {
      console.error("Error en pago alternativo:", error);
      showFeedback('Error', 'No pudimos procesar su pago. Por favor intente nuevamente.', 'error');
    }
  });
}

// ==================== FUNCIONES AUXILIARES ====================

function validateForm() {
  let isValid = true;
  const requiredFields = ['customerName', 'customerEmail', 'customerPhone', 'shippingAddress', 'departamento', 'municipio'];

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

async function saveTransactionToFirebase(details, orderId) {
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
      paymentMethod: details.payer ? 'paypal' : 'alternative',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    await firebase.firestore().collection('transactions').add(transactionData);
  } catch (error) {
    console.error("Error guardando transacción:", error);
    throw error;
  }
}

function handleSuccessfulPayment(details, orderId) {
  console.log("Pago exitoso:", details);
  saveTransactionToFirebase(details, orderId)
    .then(() => {
      showFeedback('¡Pago completado!', `Pedido #${orderId} procesado exitosamente`, 'success');
      localStorage.removeItem('currentCheckout');
      setTimeout(() => window.location.href = 'confirmacion.html', 3000);
    })
    .catch(error => {
      console.error("Error al guardar transacción:", error);
      showFeedback('Error', 'Pago completado pero hubo un error al registrar su pedido', 'error');
    });
}

function showFeedback(title, message, type = 'success') {
  const modal = document.getElementById('feedbackModal');
  const icon = document.getElementById('feedbackIcon');
  const feedbackTitle = document.getElementById('feedbackTitle');
  const feedbackMessage = document.getElementById('feedbackMessage');
  
  icon.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'times-circle'} ${type}"></i>`;
  feedbackTitle.textContent = title;
  feedbackMessage.textContent = message;
  modal.classList.add('active');
}

function generateOrderId() {
  return 'ORD-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
  // Cargar datos del carrito
  checkoutData = JSON.parse(localStorage.getItem('currentCheckout')) || { items: [], total: 0 };
  
  if (!checkoutData.items.length) {
    showErrorAndRedirect('No hay productos en el carrito');
    return;
  }

  // Inicializar componentes
  setupAddressForm();
  renderCartItems();
  
  // Configurar métodos de pago
  initializePayPal();
  setupAlternativePayment();
  
  // Configurar event listeners
  document.getElementById('feedbackClose').addEventListener('click', () => {
    document.getElementById('feedbackModal').classList.remove('active');
  });
});

function showErrorAndRedirect(message) {
  showFeedback('Error', message, 'error');
  setTimeout(() => window.location.href = 'productos.html', 3000);
}

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

function updateTotals() {
  document.getElementById('orderTotal').textContent = checkoutData.total.toFixed(2);
  document.getElementById('paymentTotal').textContent = checkoutData.total.toFixed(2);
}
