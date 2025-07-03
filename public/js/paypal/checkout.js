import { loadScript } from './utils.js';
import { paypalService } from './service.js';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../firebase-client.js'; 

// Configuración de Firebase
const db = getFirestore(app);
const auth = getAuth(app);

/**
 * Inicializa el sistema de pago PayPal
 * @param {Object} config - Configuración opcional
 * @param {boolean} [config.enableCardFields=true] - Habilitar campos de tarjeta
 */
export async function initPayPalCheckout(config = {}) {
  try {
    // 1. Cargar y validar datos del carrito
    const checkoutData = loadCheckoutData();
    validateCheckoutData(checkoutData);

    // 2. Renderizar UI
    renderCartItems(checkoutData);
    updateTotals(checkoutData);
    setupAddressForm();

    // 3. Cargar SDK PayPal
    await loadPayPalSDK(config.clientId || 'SB'); // SB para sandbox

    // 4. Configurar botón de PayPal
    setupPayPalButton(checkoutData, config);

    // 5. Configurar método alternativo si es necesario
    if (config.alternativePayment !== false) {
      setupAlternativePayment(checkoutData);
    }

    // 6. Configurar cierre del modal
    setupModalClose();

  } catch (error) {
    handleInitializationError(error);
  }
}

// ==================== CORE FUNCTIONS ====================

async function loadPayPalSDK(clientId) {
  if (!window.paypal) {
    await loadScript(
      `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&components=buttons${config.enableCardFields ? ',card-fields' : ''}`
    );
  }
}

function setupPayPalButton(checkoutData, config) {
  const buttons = window.paypal.Buttons({
    style: {
      layout: 'vertical',
      color: 'blue',
      shape: 'rect',
      label: 'paypal',
      height: 40,
      ...config.buttonStyle
    },
    
    createOrder: async () => {
      if (!validateForm()) {
        throw new Error('Complete todos los campos requeridos');
      }
      return await paypalService.createOrder(checkoutData);
    },
    
    onApprove: async (data) => {
      try {
        const details = await paypalService.captureOrder(data.orderID, checkoutData);
        showFeedback('¡Pago completado!', `Orden #${data.orderID} procesada`, 'success');
        clearCart();
        
        setTimeout(() => {
          config.onSuccess?.(details) || window.location.href = 'confirmacion.html';
        }, 3000);
      } catch (error) {
        handlePaymentError(error, config);
      }
    },
    
    onError: (err) => {
      handlePaymentError(err, config);
    }
  });

  buttons.render('#paypal-button-container');
  
  if (config.enableCardFields) {
    renderCardFields(checkoutData, config);
  }
}

function renderCardFields(checkoutData, config) {
  if (!window.paypal.CardFields?.isEligible()) {
    console.warn('Campos de tarjeta no disponibles');
    return;
  }

  const cardFields = window.paypal.CardFields({
    createOrder: () => paypalService.createOrder(checkoutData),
    onApprove: async (data) => {
      try {
        const details = await paypalService.captureOrder(data.orderID, checkoutData);
        config.onSuccess?.(details) || showSuccessFeedback(data.orderID);
      } catch (error) {
        handlePaymentError(error, config);
      }
    }
  });

  // Renderizar campos individuales
  cardFields.NameField().render('#card-name-field');
  cardFields.NumberField().render('#card-number-field');
  cardFields.CVVField().render('#card-cvv-field');
  cardFields.ExpiryField().render('#card-expiry-field');

  // Configurar envío manual
  document.querySelector('#card-submit-button')?.addEventListener('click', () => {
    cardFields.submit({
      billingAddress: getBillingAddress()
    }).catch(error => handlePaymentError(error, config));
  });
}

// ==================== HELPER FUNCTIONS ====================

function loadCheckoutData() {
  const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
  const shippingCost = parseFloat(localStorage.getItem('shippingCost')) || 0;
  const taxRate = 0.13; // 13% de impuestos

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax + shippingCost;

  return {
    items: cartItems,
    subtotal,
    tax,
    shipping: shippingCost,
    total,
    currency: 'USD'
  };
}

function validateCheckoutData(data) {
  if (!data.items || data.items.length === 0) {
    throw new Error('No hay productos en el carrito');
  }
  if (data.total <= 0) {
    throw new Error('El total debe ser mayor que cero');
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
    if (!field?.value?.trim()) {
      isValid = false;
      field.style.borderColor = '#ff0000';
    } else {
      field.style.borderColor = '';
    }
  });
  
  return isValid;
}

function getBillingAddress() {
  return {
    addressLine1: document.getElementById('billing-address-line1')?.value || '',
    addressLine2: document.getElementById('billing-address-line2')?.value || '',
    adminArea1: document.getElementById('billing-state')?.value || '',
    adminArea2: document.getElementById('billing-city')?.value || '',
    countryCode: document.getElementById('billing-country')?.value || 'SV',
    postalCode: document.getElementById('billing-zip')?.value || ''
  };
}

// ==================== UI FUNCTIONS ====================

function renderCartItems(checkoutData) {
  const container = document.getElementById('orderItems');
  if (!container) return;

  container.innerHTML = checkoutData.items.map(item => `
    <div class="order-item">
      <img src="${item.image || 'assets/default-product.png'}" alt="${item.name}" width="50">
      <div class="item-details">
        <span class="item-name">${item.name}</span>
        <span class="item-price">${item.quantity} × $${item.price.toFixed(2)}</span>
        <span class="item-total">$${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    </div>
  `).join('') + `
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
}

function updateTotals(checkoutData) {
  const totalElements = [
    document.getElementById('orderTotal'),
    document.getElementById('paymentTotal')
  ];
  
  totalElements.forEach(el => {
    if (el) el.textContent = checkoutData.total.toFixed(2);
  });
}

function setupAddressForm() {
  const deptoSelect = document.getElementById('departamento');
  if (!deptoSelect) return;

  deptoSelect.innerHTML = '<option value="">Seleccione departamento...</option>' +
    Object.keys(municipiosPorDepartamento).map(depto => 
      `<option value="${depto}">${depto}</option>`
    ).join('');

  deptoSelect.addEventListener('change', function() {
    updateMunicipios(this.value);
  });
}

function updateMunicipios(departamento) {
  const muniSelect = document.getElementById('municipio');
  if (!muniSelect) return;

  muniSelect.innerHTML = '<option value="">Seleccione municipio...</option>';
  
  if (departamento && municipiosPorDepartamento[departamento]) {
    muniSelect.innerHTML += municipiosPorDepartamento[departamento]
      .map(muni => `<option value="${muni}">${muni}</option>`)
      .join('');
  }
}

function setupAlternativePayment(checkoutData) {
  const altBtn = document.getElementById('alternativePayment');
  if (!altBtn) return;

  altBtn.style.display = 'block';
  
  altBtn.addEventListener('click', async () => {
    if (!validateForm()) {
      showFeedback('Error', 'Complete todos los campos', 'error');
      return;
    }
    
    try {
      const orderId = 'ALT-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      await paypalService.saveTransactionDetails({
        id: orderId,
        status: 'completed',
        amount: checkoutData.total,
        payer: {
          name: { given_name: document.getElementById('customerName').value },
          email_address: document.getElementById('customerEmail').value
        }
      });
      
      showSuccessFeedback(orderId);
    } catch (error) {
      handlePaymentError(error);
    }
  });
}

// ==================== FEEDBACK HANDLERS ====================

function showSuccessFeedback(orderId) {
  showFeedback('¡Pago exitoso!', `Orden #${orderId} procesada`, 'success');
  clearCart();
  
  setTimeout(() => {
    window.location.href = 'confirmacion.html';
  }, 3000);
}

function handleInitializationError(error) {
  console.error('Error inicializando pago:', error);
  showFeedback('Error', error.message, 'error');
  
  if (error.message.includes('carrito')) {
    setTimeout(() => window.location.href = 'productos.html', 2000);
  }
}

function handlePaymentError(error, config) {
  console.error("Error en el pago:", error);
  const message = config?.onError?.(error) || parsePayPalError(error);
  showFeedback('Error', message, 'error');
  
  if (isRecoverableError(error)) {
    document.getElementById('alternativePayment')?.style.display = 'block';
  }
}

function showFeedback(title, message, type = 'success') {
  const modal = document.getElementById('feedbackModal');
  if (!modal) return;

  modal.querySelector('.feedback-icon').innerHTML = 
    `<i class="fas fa-${type === 'success' ? 'check-circle' : 'times-circle'} ${type}"></i>`;
  
  modal.querySelector('#feedbackTitle').textContent = title;
  modal.querySelector('#feedbackMessage').textContent = message;
  modal.classList.add('active');
}

function setupModalClose() {
  document.getElementById('feedbackClose')?.addEventListener('click', () => {
    document.getElementById('feedbackModal')?.classList.remove('active');
  });
}

function clearCart() {
  localStorage.removeItem('cartItems');
  localStorage.removeItem('shippingCost');
}

// ==================== UTILITIES ====================

function parsePayPalError(error) {
  if (error.details) return error.details.message || 'Error en el servidor';
  if (error.message.includes('PAYPAL')) {
    const match = error.message.match(/"message":"([^"]+)"/);
    return match ? match[1] : 'Error al procesar el pago con PayPal';
  }
  return error.message || 'Error desconocido';
}

function isRecoverableError(error) {
  return error.message.includes('INSTRUMENT_DECLINED') || 
         error.message.includes('PAYER_ACTION_REQUIRED');
}

// Datos geográficos (mejor en un archivo aparte)
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
