// ===================== CONFIGURACIÓN INICIAL =====================
// Variables globales
let checkoutData = null;

// Configuración de Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inicializar Firebase si no está inicializado
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// ===================== DATOS DE EL SALVADOR =====================
const municipiosPorDepartamento = {
  'Ahuachapán': ['Ahuachapán', 'Apaneca', 'Atiquizaya', 'Concepción de Ataco', 'El Refugio', 'Guaymango', 'Jujutla', 'San Francisco Menéndez', 'San Lorenzo', 'San Pedro Puxtla', 'Tacuba', 'Turín'],
  'Santa Ana': ['Santa Ana', 'Candelaria de la Frontera', 'Chalchuapa', 'Coatepeque', 'El Congo', 'El Porvenir', 'Masahuat', 'Metapán', 'San Antonio Pajonal', 'San Sebastián Salitrillo', 'Santiago de la Frontera', 'Texistepeque'],
  'Sonsonate': ['Sonsonate', 'Acajutla', 'Armenia', 'Caluco', 'Cuisnahuat', 'Izalco', 'Juayúa', 'Nahuizalco', 'Nahulingo', 'Salcoatitán', 'San Antonio del Monte', 'San Julián', 'Santa Catarina Masahuat', 'Santa Isabel Ishuatán', 'Santo Domingo de Guzmán', 'Sonzacate'],
  'Chalatenango': ['Chalatenango', 'Agua Caliente', 'Arcatao', 'Azacualpa', 'Cancasque', 'Citalá', 'Comalapa', 'Concepción Quezaltepeque', 'Dulce Nombre de María', 'El Carrizal', 'El Paraíso', 'La Laguna', 'La Palma', 'La Reina', 'Las Flores', 'Las Vueltas', 'Nombre de Jesús', 'Nueva Concepción', 'Nueva Trinidad', 'Ojos de Agua', 'Potonico', 'San Antonio de la Cruz', 'San Antonio Los Ranchos', 'San Fernando', 'San Francisco Lempa', 'San Francisco Morazán', 'San Ignacio', 'San Isidro Labrador', 'San José Cancasque', 'San José Las Flores', 'San Luis del Carmen', 'San Miguel de Mercedes', 'San Rafael', 'Santa Rita', 'Tejutla'],
  'La Libertad': ['Santa Tecla', 'Antiguo Cuscatlán', 'Chiltiupán', 'Ciudad Arce', 'Colón', 'Comasagua', 'Huizúcar', 'Jayaque', 'Jicalapa', 'La Libertad', 'Nuevo Cuscatlán', 'Opico', 'Quezaltepeque', 'Sacacoyo', 'San José Villanueva', 'San Juan Opico', 'San Matías', 'San Pablo Tacachico', 'Talnique', 'Tamanique', 'Teotepeque', 'Tepecoyo', 'Zaragoza'],
  'San Salvador': ['San Salvador', 'Aguilares', 'Apopa', 'Ayutuxtepeque', 'Cuscatancingo', 'Delgado', 'El Paisnal', 'Guazapa', 'Ilopango', 'Mejicanos', 'Nejapa', 'Panchimalco', 'Rosario de Mora', 'San Marcos', 'San Martín', 'Santiago Texacuangos', 'Santo Tomás', 'Soyapango', 'Tonacatepeque'],
  'Cuscatlán': ['Cojutepeque', 'Candelaria', 'El Carmen', 'El Rosario', 'Monte San Juan', 'Oratorio de Concepción', 'San Bartolomé Perulapía', 'San Cristóbal', 'San José Guayabal', 'San Pedro Perulapán', 'San Rafael Cedros', 'San Ramón', 'Santa Cruz Analquito', 'Santa Cruz Michapa', 'Suchitoto', 'Tenancingo'],
  'La Paz': ['Zacatecoluca', 'Cuyultitán', 'El Rosario', 'Jerusalén', 'Mercedes La Ceiba', 'Olocuilta', 'Paraíso de Osorio', 'San Antonio Masahuat', 'San Emigdio', 'San Francisco Chinameca', 'San Juan Nonualco', 'San Juan Talpa', 'San Juan Tepezontes', 'San Luis La Herradura', 'San Luis Talpa', 'San Miguel Tepezontes', 'San Pedro Masahuat', 'San Pedro Nonualco', 'San Rafael Obrajuelo', 'Santa María Ostuma', 'Santiago Nonualco', 'Tapalhuaca'],
  'Cabañas': ['Sensuntepeque', 'Cinquera', 'Dolores', 'Guacotecti', 'Ilobasco', 'Jutiapa', 'San Isidro', 'Tejutepeque', 'Victoria'],
  'San Vicente': ['San Vicente', 'Apastepeque', 'Guadalupe', 'San Cayetano Istepeque', 'San Esteban Catarina', 'San Ildefonso', 'San Lorenzo', 'San Sebastián', 'Santa Clara', 'Santo Domingo', 'Tecoluca', 'Tepetitán', 'Verapaz'],
  'Usulután': ['Usulután', 'Alegría', 'Berlín', 'California', 'Concepción Batres', 'El Triunfo', 'Ereguayquín', 'Estanzuelas', 'Jiquilisco', 'Jucuapa', 'Jucuarán', 'Mercedes Umaña', 'Nueva Granada', 'Ozatlán', 'Puerto El Triunfo', 'San Agustín', 'San Buenaventura', 'San Dionisio', 'San Francisco Javier', 'Santa Elena', 'Santa María', 'Santiago de María', 'Tecapán'],
  'San Miguel': ['San Miguel', 'Carolina', 'Chapeltique', 'Chinameca', 'Chirilagua', 'Ciudad Barrios', 'Comacarán', 'El Tránsito', 'Lolotique', 'Moncagua', 'Nueva Guadalupe', 'Nuevo Edén de San Juan', 'Quelepa', 'San Antonio del Mosco', 'San Gerardo', 'San Jorge', 'San Luis de la Reina', 'San Rafael Oriente', 'Sesori', 'Uluazapa'],
  'Morazán': ['San Francisco Gotera', 'Arambala', 'Cacaopera', 'Chilanga', 'Corinto', 'Delicias de Concepción', 'El Divisadero', 'El Rosario', 'Gualococti', 'Guatajiagua', 'Joateca', 'Jocoaitique', 'Jocoro', 'Lolotiquillo', 'Meanguera', 'Osicala', 'Perquín', 'San Carlos', 'San Fernando', 'San Isidro', 'San Simón', 'Sensembra', 'Sociedad', 'Torola', 'Yamabal', 'Yoloaiquín'],
  'La Unión': ['La Unión', 'Anamorós', 'Bolívar', 'Concepción de Oriente', 'Conchagua', 'El Carmen', 'El Sauce', 'Intipucá', 'Lislique', 'Meanguera del Golfo', 'Nueva Esparta', 'Pasaquina', 'Polorós', 'San Alejo', 'San José', 'Santa Rosa de Lima', 'Yayantique', 'Yucuaiquín']
};

// ===================== FUNCIONES PRINCIPALES =====================

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', async () => {
  // Cargar datos del carrito desde localStorage
  checkoutData = JSON.parse(localStorage.getItem('currentCheckout'));
  
  // Verificar si hay items en el carrito
  if (!checkoutData || !checkoutData.items || checkoutData.items.length === 0) {
    showErrorAndRedirect('No se encontraron productos en el carrito');
    return;
  }

  // Inicializar componentes
  renderCartItems();
  setupAddressForm();
  initializePayPal();
  setupEventListeners();
});

// Configurar formulario de dirección
function setupAddressForm() {
  const deptoSelect = document.getElementById('departamento');
  
  // Llenar departamentos
  Object.keys(municipiosPorDepartamento).forEach(depto => {
    deptoSelect.innerHTML += `<option value="${depto}">${depto}</option>`;
  });

  // Actualizar municipios cuando cambia el departamento
  deptoSelect.addEventListener('change', updateMunicipios);
}

// Actualizar select de municipios
function updateMunicipios() {
  const deptoSelect = document.getElementById('departamento');
  const muniSelect = document.getElementById('municipio');
  const selectedDepto = deptoSelect.value;

  muniSelect.innerHTML = '<option value="">Seleccione...</option>';
  
  if (selectedDepto && municipiosPorDepartamento[selectedDepto]) {
    municipiosPorDepartamento[selectedDepto].forEach(muni => {
      muniSelect.innerHTML += `<option value="${muni}">${muni}</option>`;
    });
  }
}

// Configurar PayPal de forma segura
async function initializePayPal() {
  try {
    // Obtener configuración desde Cloud Function
    const getPaypalConfig = firebase.functions().httpsCallable('getPaypalConfig');
    const { data } = await getPaypalConfig();
    
    // Cargar SDK de PayPal dinámicamente
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${data.clientId}&currency=USD&intent=capture`;
    script.async = true;
    
    script.onload = () => {
      setupPayPalButton(data.env);
    };
    
    script.onerror = () => {
      console.error('Error al cargar PayPal SDK');
      showFeedback('Error', 'No se pudo cargar el servicio de pagos', 'error');
      document.getElementById('alternativePayment').style.display = 'block';
    };
    
    document.head.appendChild(script);

  } catch (error) {
    console.error("Error inicializando PayPal:", error);
    showFeedback('Error', 'Error al conectar con el servidor de pagos', 'error');
  }
}

// Configurar botón de PayPal
function setupPayPalButton(environment) {
  try {
    paypal.Buttons({
      env: environment,
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
            items: checkoutData.items.map(item => ({
              name: item.name.substring(0, 127),
              unit_amount: {
                value: item.price.toFixed(2),
                currency_code: 'USD'
              },
              quantity: item.quantity
            })),
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
      onApprove: async function(data, actions) {
        try {
          const details = await actions.order.capture();
          await saveTransactionToFirebase(details, data.orderID);
          showFeedback('¡Pago completado!', `Pedido #${generateOrderId()} procesado`, 'success');
          
          // Limpiar carrito
          localStorage.removeItem('currentCheckout');
          
          setTimeout(() => {
            window.location.href = 'confirmacion.html';
          }, 3000);
        } catch (err) {
          console.error("Error al procesar pago:", err);
          showFeedback('Error', 'No se pudo completar el pago', 'error');
        }
      },
      onError: function(err) {
        console.error('Error en PayPal:', err);
        showFeedback('Error en el pago', 'Ocurrió un error al procesar el pago', 'error');
      }
    }).render('#paypal-button-container');
  } catch (error) {
    console.error("Error configurando PayPal:", error);
  }
}

// ===================== FUNCIONES AUXILIARES =====================

// Renderizar items del carrito
function renderCartItems() {
  const orderItemsContainer = document.getElementById('orderItems');
  const items = checkoutData.items;
  
  let html = '';
  items.forEach(item => {
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
  
  // Agregar event listeners a los botones de eliminar
  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', handleRemoveItem);
  });
}

// Manejar eliminación de items
async function handleRemoveItem(e) {
  const productId = e.currentTarget.dataset.id;
  const btn = e.currentTarget;
  
  try {
    btn.innerHTML = '<span class="loading"></span>';
    btn.disabled = true;
    
    checkoutData.items = checkoutData.items.filter(item => item.id !== productId);
    checkoutData.total = checkoutData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    localStorage.setItem('currentCheckout', JSON.stringify(checkoutData));
    renderCartItems();
    showFeedback('Producto eliminado', 'El producto ha sido removido de tu carrito', 'success');
    
    if (checkoutData.items.length === 0) {
      setTimeout(() => {
        window.location.href = 'productos.html';
      }, 1500);
    }
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    showFeedback('Error', 'No se pudo eliminar el producto', 'error');
    btn.innerHTML = '<i class="fas fa-trash"></i>';
    btn.disabled = false;
  }
}

// Validar formulario completo
function validateForm() {
  let isValid = true;
  const requiredFields = [
    'customerName', 'customerEmail', 'customerPhone', 
    'shippingAddress', 'departamento', 'municipio'
  ];

  requiredFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    const errorMsg = field.parentElement.querySelector('.error-message');
    
    if (!field.value.trim()) {
      if (errorMsg) errorMsg.style.display = 'block';
      isValid = false;
    } else {
      if (errorMsg) errorMsg.style.display = 'none';
    }
  });

  return isValid;
}

// Guardar transacción en Firebase
async function saveTransactionToFirebase(details, orderId) {
  try {
    await firebase.firestore().collection('transactions').add({
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
      status: details.status,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("Error guardando transacción:", error);
  }
}

// ===================== FUNCIONES DE UI =====================

// Actualizar totales
function updateTotals() {
  document.getElementById('orderTotal').textContent = checkoutData.total.toFixed(2);
  document.getElementById('paymentTotal').textContent = checkoutData.total.toFixed(2);
  updateCartCounter();
}

// Actualizar contador del carrito
function updateCartCounter() {
  const counter = document.getElementById('cart-counter');
  if (counter) {
    const totalItems = checkoutData.items.reduce((sum, item) => sum + item.quantity, 0);
    counter.textContent = totalItems;
  }
}

// Mostrar feedback
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

// Mostrar error y redirigir
function showErrorAndRedirect(message) {
  showFeedback('Error', message, 'error');
  setTimeout(() => {
    window.location.href = 'productos.html';
  }, 3000);
}

// Generar ID de pedido
function generateOrderId() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Configurar event listeners
function setupEventListeners() {
  // Cierre del modal de feedback
  document.getElementById('feedbackClose').addEventListener('click', () => {
    document.getElementById('feedbackModal').classList.remove('active');
  });
}
