import { loadScript } from './utils.js';
import { paypalService } from './service.js';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../firebase-config.js'; // Asegúrate que esta ruta es correcta
import { CartService } from '../cart/cart.js'; 

const db = getFirestore(app);
const auth = getAuth(app);

// Variables globales para el estado del checkout
let currentCheckoutData = null;

// ===============================================
//      FUNCIONES PRINCIPALES DE INICIALIZACIÓN
// ===============================================

/**
 * Inicializa el flujo de pago de PayPal en la página.
 * @param {Object} config - Opciones de configuración (ej. { clientId: 'YOUR_PAYPAL_CLIENT_ID' }).
 */
export async function initPayPalCheckout(config = {}) {
  try {
    window.showLoading(true); 

    // 1. Cargar datos del carrito
    const checkoutData = await loadCheckoutData();
    currentCheckoutData = checkoutData; 

    // 2. Validar que hay algo que procesar
    validateCheckoutData(checkoutData);

    // 3. Renderizar items y totales en la UI
    renderCartItems(checkoutData);
    updateTotals(checkoutData);

    // 4. Configurar el formulario de dirección (si aplica)
    setupAddressForm(); 

    // 5. Cargar el SDK de PayPal
    await loadPayPalSDK(config.clientId || 'SB', config); 

    // 6. Configurar y renderizar el botón de PayPal
    setupPayPalButton(checkoutData, config);

    // 7. Configurar botón de pago alternativo (si existe y está habilitado)
    if (config.alternativePayment !== false) {
      setupAlternativePayment(checkoutData); 
    }

    // 8. Configurar cierre de modal (si aplica)
    setupModalClose(); 

  } catch (error) {
    handleInitializationError(error);
  } finally {
    window.showLoading(false); 
  }
}

/**
 * Carga el SDK de PayPal si aún no está cargado.
 * @param {string} clientId - El Client ID de PayPal.
 * @param {Object} config - Configuración adicional para el SDK.
 */
async function loadPayPalSDK(clientId, config = {}) {
  if (!window.paypal) {
    const sdkUrl = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&components=buttons${config.enableCardFields ? ',card-fields' : ''}`;
    await loadScript(sdkUrl);
  }
}

/**
 * Configura y renderiza el botón de PayPal.
 * @param {Object} checkoutData - Datos del pedido.
 * @param {Object} config - Configuración del botón.
 */
function setupPayPalButton(checkoutData, config) {
  const buttons = window.paypal.Buttons({
    style: {
      layout: 'vertical', 
      color: 'blue',      
      shape: 'rect',      
      label: 'paypal'     
    },
    createOrder: async (data, actions) => {
      window.showLoading(true);
      try {
        const customerData = _getCustomerData();
        const shippingData = _getShippingData();
        validateForm(customerData, shippingData); 

        const orderId = await paypalService.createOrder({
          total: checkoutData.total,
          items: checkoutData.items,
          customer: customerData,
          shipping: shippingData
        });
        window.showLoading(false);
        return orderId;
      } catch (error) {
        window.showLoading(false);
        handlePaymentError(error);
        return actions.reject(error); 
      }
    },
    onApprove: async (data, actions) => {
      window.showLoading(true);
      try {
        const orderDetails = await paypalService.captureOrder(data.orderID);
        await _saveOrderDetailsToFirestore(orderDetails, currentCheckoutData);
        CartService.clearCart(); 
        window.showLoading(false);
        window.showFeedback('¡Pago Completado!', 'Tu pedido ha sido procesado correctamente.', 'success');
      } catch (error) {
        window.showLoading(false);
        handlePaymentError(error);
      }
    },
    onCancel: (data) => {
      console.warn('Pago cancelado:', data);
      window.showFeedback('Pago Cancelado', 'Has cancelado el proceso de pago.', 'info');
    },
    onError: (err) => {
      console.error('Error en el botón de PayPal:', err);
      handlePaymentError(err);
    }
  });

  if (buttons.isEnabled()) { 
    buttons.render('#paypal-button-container').catch(err => {
      console.error("Failed to render PayPal Buttons:", err);
      document.getElementById('paypal-button-container').innerHTML =
        '<p class="error">Error al cargar los botones de pago. Intenta recargar la página.</p>';
    });
  } else {
    console.warn("PayPal buttons are not enabled (e.g., currency not supported or invalid client ID)");
    document.getElementById('paypal-button-container').innerHTML =
      '<p class="error">Los botones de PayPal no están disponibles. Asegúrate de tener un Client ID válido y una moneda soportada.</p>';
  }
}

// ===============================================
//      MANEJO DE DATOS DEL CARRITO Y UI DE PAGO
// ===============================================

/**
 * Carga los datos del carrito desde CartService.
 * @returns {Promise<Object>} Datos del carrito con items y total.
 * @throws {Error} Si el carrito está vacío o hay un error.
 */
async function loadCheckoutData() {
  try {
    const cartItems = await CartService.getCart();
    if (!cartItems || cartItems.length === 0) {
      document.getElementById('orderItems').innerHTML =
        '<p class="error">Tu carrito está vacío. <a href="productos.html">Volver a productos</a></p>';
      throw new Error('El carrito está vacío.');
    }

    const total = CartService.getTotal(cartItems);

    return {
      items: cartItems,
      total: total,
    };
  } catch (error) {
    console.error("Error al cargar los datos del carrito:", error);
    document.getElementById('orderItems').innerHTML =
      `<p class="error">Error al cargar tu pedido. Recargue la página o <a href="productos.html">vuelve a productos</a>.</p>`;
    throw new Error('No se pudieron cargar los datos del pedido.');
  }
}

/**
 * Renderiza los ítems del carrito en el resumen del pedido.
 * @param {Object} checkoutData - Datos del pedido con la lista de ítems.
 */
function renderCartItems(checkoutData) {
  const orderItemsContainer = document.getElementById('orderItems');
  if (!orderItemsContainer) return;

  orderItemsContainer.innerHTML = ''; 

  checkoutData.items.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.classList.add('order-item');
    itemElement.innerHTML = `
      <span>${item.quantity} x ${item.name}</span>
      <span>$${(item.price * item.quantity).toFixed(2)}</span>
    `;
    orderItemsContainer.appendChild(itemElement);
  });
}

/**
 * Actualiza los totales en la UI de pago.
 * @param {Object} checkoutData - Datos del pedido con el total.
 */
function updateTotals(checkoutData) {
  const subtotalElement = document.getElementById('subtotal');
  const paymentTotalElement = document.getElementById('paymentTotal');
  const finalTotalElement = document.getElementById('finalTotal');

  if (subtotalElement) {
    subtotalElement.textContent = checkoutData.total.toFixed(2);
  }
  if (paymentTotalElement) {
    paymentTotalElement.textContent = checkoutData.total.toFixed(2);
  }
  if (finalTotalElement) {
    finalTotalElement.textContent = checkoutData.total.toFixed(2);
  }
}

// ===============================================
//      VALIDACIONES Y MANEJO DE ERRORES
// ===============================================

/**
 * Valida los datos esenciales del pedido.
 * @param {Object} checkoutData - Datos del pedido.
 * @throws {Error} Si los datos son inválidos.
 */
function validateCheckoutData(checkoutData) {
  if (!checkoutData || !checkoutData.items || checkoutData.items.length === 0 || checkoutData.total <= 0) {
    throw new Error('Datos de pedido inválidos o carrito vacío. Por favor, revisa tu selección.');
  }
}

/**
 * Valida los campos del formulario de cliente y envío.
 * @param {Object} customerData - Datos del cliente.
 * @param {Object} shippingData - Datos de envío.
 * @throws {Error} Si algún campo requerido no está lleno o es inválido.
 */
function validateForm(customerData, shippingData) {
  if (!customerData.name || !customerData.email || !customerData.phone ||
      !shippingData.address || !shippingData.department || !shippingData.municipality) {
    throw new Error('Por favor, rellena todos los campos del formulario antes de proceder.');
  }
  if (!customerData.email.includes('@')) {
    throw new Error('El formato del correo electrónico no es válido.');
  }
}

/**
 * Maneja errores durante la inicialización del proceso de pago.
 * @param {Error} error - El objeto de error.
 */
function handleInitializationError(error) {
  console.error("Error de inicialización de PayPal:", error);
  window.showLoading(false);
  window.showFeedback(
    'Error de Carga',
    error.message || 'No se pudo inicializar el proceso de pago. Intenta recargar la página.',
    'error'
  );
  const paypalButtonContainer = document.getElementById('paypal-button-container');
  if (paypalButtonContainer) {
    paypalButtonContainer.innerHTML = `<p class="error">${error.message || 'Error al cargar los botones de pago.'}</p>`;
  }
  const alternativePaymentBtn = document.getElementById('alternativePayment');
  if (alternativePaymentBtn) {
    alternativePaymentBtn.style.display = 'none';
  }
}

/**
 * Maneja errores durante el proceso de pago (creación/captura de orden).
 * @param {Error} error - El objeto de error.
 */
function handlePaymentError(error) {
  console.error("Error en el pago:", error);
  window.showLoading(false);
  window.showFeedback(
    'Error en el Pago',
    error.message || 'Ocurrió un error al procesar tu pago. Por favor, intenta de nuevo o contacta a soporte.',
    'error'
  );
}

// ===============================================
//      FUNCIONES AUXILIARES
// ===============================================

/**
 * Guarda los detalles de la orden en Firestore después de una captura exitosa de PayPal.
 * @param {Object} orderDetails - Detalles de la orden de PayPal.
 * @param {Object} checkoutData - Datos del carrito usados para el checkout.
 */
async function _saveOrderDetailsToFirestore(orderDetails, checkoutData) {
  try {
    const user = auth.currentUser;
    const orderRef = doc(db, 'ordenes', orderDetails.id); // CORRECCIÓN: Usar 'ordenes' como colección

    await setDoc(orderRef, {
      orderId: orderDetails.id,
      userId: user?.uid || 'guest',
      customerInfo: _getCustomerData(),
      shippingInfo: _getShippingData(),
      items: checkoutData.items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      totalAmount: orderDetails.purchase_units[0].payments.captures[0].amount.value,
      currency: orderDetails.purchase_units[0].payments.captures[0].amount.currency_code,
      paymentMethod: 'PayPal',
      paymentStatus: orderDetails.status,
      paypalTransactionId: orderDetails.purchase_units[0].payments.captures[0].id,
      createdAt: serverTimestamp(),
      status: 'completed' 
    });
    console.log('Orden guardada en Firestore con ID:', orderDetails.id);
  } catch (error) {
    console.error('Error al guardar la orden en Firestore:', error);
  }
}


/**
 * Obtiene los datos del cliente desde el formulario.
 * @returns {Object} Datos del cliente.
 */
function _getCustomerData() {
  const email = document.getElementById('customerEmail')?.value.trim();
  const name = document.getElementById('customerName')?.value.trim();
  const phone = document.getElementById('customerPhone')?.value.trim();
  return {
    userId: auth.currentUser?.uid || 'guest',
    email,
    name,
    phone
  };
}

/**
 * Obtiene los datos de envío desde el formulario.
 * @returns {Object} Datos de envío.
 */
function _getShippingData() {
  const address = document.getElementById('shippingAddress')?.value.trim();
  const department = document.getElementById('departamento')?.value;
  const municipality = document.getElementById('municipio')?.value;
  return {
    address,
    department,
    municipality
  };
}

/**
 * Configura la lógica para el formulario de dirección (ej. carga de departamentos/municipios).
 */
function setupAddressForm() {
    const departamentos = {
        'San Salvador': ['San Salvador', 'Apopa', 'Ayutuxtepeque', 'Cuscatancingo', 'Delgado', 'El Paisnal', 'Guazapa', 'Ilopango', 'Mejicanos', 'Nejapa', 'Panchimalco', 'Rosario de Mora', 'San Marcos', 'San Martín', 'Santiago Texacuangos', 'Santo Tomás', 'Soyapango', 'Tonacatepeque'],
        'La Libertad': ['Santa Tecla', 'Antiguo Cuscatlán', 'Chiltiupán', 'Ciudad Arce', 'Colón', 'Comasagua', 'Huizúcar', 'Jayaque', 'Jicalapa', 'La Libertad', 'Nuevo Cuscatlán', 'Quezaltepeque', 'Sacacoyo', 'San Juan Opico', 'San Matías', 'San Pablo Tacachico', 'Talnique', 'Tamanique', 'Teotepeque', 'Tepecoyo', 'Zaragoza'],
        'Santa Ana': ['Santa Ana', 'Candelaria de la Frontera', 'Chalchuapa', 'Coatepeque', 'El Congo', 'El Porvenir', 'Metapán', 'San Antonio Pajonal', 'San Sebastián Salitrillo', 'Santa Rosa Guachipilín', 'Santiago de la Frontera', 'Texistepeque'],
        'San Miguel': ['San Miguel', 'Carolina', 'Chapeltique', 'Chinameca', 'Chirilagua', 'Ciudad Barrios', 'Comacarán', 'El Tránsito', 'Lolotique', 'Moncagua', 'Nueva Guadalupe', 'Nuevo Edén de San Juan', 'Quelepa', 'San Antonio del Mosco', 'San Gerardo', 'San Jorge', 'San Luis de la Reina', 'San Rafael Oriente', 'Sesori', 'Uluazapa'],
        'Ahuachapán': ['Ahuachapán', 'Apaneca', 'Atiquizaya', 'Concepción de Ataco', 'El Refugio', 'Jujutla', 'San Francisco Menéndez', 'San Lorenzo', 'San Pedro Puxtla', 'Tacuba', 'Turín'],
        'Sonsonate': ['Sonsonate', 'Acajutla', 'Armenia', 'Caluco', 'Cuyultitán', 'Izalco', 'Juayúa', 'Nahuizalco', 'Nahulingo', 'Salcoatitán', 'San Antonio del Monte', 'San Julián', 'Santa Catarina Masahuat', 'Santa Isabel Ishuatán', 'Santo Domingo de Guzmán', 'Sonzacate'],
        'Usulután': ['Usulután', 'Alegría', 'Berlín', 'California', 'Concepción Batres', 'El Triunfo', 'Ereguayquín', 'Estanzuelas', 'Jiquilisco', 'Jucuapa', 'Jucuarán', 'Mercedes Umaña', 'Nueva Granada', 'Ozatlán', 'Puerto El Triunfo', 'San Agustín', 'San Buenaventura', 'San Dionisio', 'San Francisco Javier', 'Santa Elena', 'Santa María', 'Santiago de María', 'Tecapán'],
        'La Paz': ['Zacatecoluca', 'Cuyultitán', 'El Rosario', 'Jerusalén', 'Mercedes La Ceiba', 'Olocuilta', 'Paraíso de Osorio', 'San Antonio La Paz', 'San Emigdio', 'San Francisco Chinameca', 'San Juan Nonualco', 'San Juan Talpa', 'San Juan Tepezontes', 'San Luis Talpa', 'San Miguel Tepezontes', 'San Pedro Masahuat', 'San Pedro Nonualco', 'San Rafael Obrajuelo', 'Santa María Ostuma', 'Santiago Nonualco', 'Tapalhuaca'],
        'Cuscatlán': ['Cojutepeque', 'Candelaria', 'El Carmen', 'El Rosario', 'Monte San Juan', 'Oratorio de Concepción', 'San Bartolomé Perulapía', 'San Cristóbal', 'San José Guayabal', 'San Pedro Perulapán', 'San Rafael Cedros', 'San Ramón', 'Santa Cruz Analquito', 'Santa Cruz Michapa', 'Suchitoto', 'Tenancingo'],
        'Cabañas': ['Sensuntepeque', 'Cinquera', 'Guacotecti', 'Ilobasco', 'Jutiapa', 'San Isidro', 'Tejutepeque', 'Victoria'],
        'Chalatenango': ['Chalatenango', 'Aguilares', 'Arcatao', 'Azacualpa', 'Cancasque', 'Citalá', 'Comalapa', 'Concepción Quezaltepeque', 'Dulce Nombre de María', 'Erandique', 'La Laguna', 'La Palma', 'La Reina', 'Las Vueltas', 'Nombre de Jesús', 'Nueva Concepción', 'Ojos de Agua', 'Potonico', 'San Antonio de la Cruz', 'San Antonio Los Ranchos', 'San Fernando', 'San Francisco Lempa', 'San Francisco Morazán', 'San Ignacio', 'San Luis del Carmen', 'San Miguel de Mercedes', 'San Rafael', 'Santa Rita', 'Tejutla'],
        'Morazán': ['San Francisco Gotera', 'Arambala', 'Cacaopera', 'Chilanga', 'Corinto', 'Delicias de Concepción', 'El Divisadero', 'El Rosario', 'Gualococti', 'Guatajiagua', 'Joateca', 'Jocoaitique', 'Jocoro', 'Lolotiquillo', 'Meanguera', 'Osicala', 'Perquín', 'San Carlos', 'San Fernando', 'San Isidro', 'San Simón', 'Sensembra', 'Sociedad', 'Torola', 'Yamabal', 'Yoloaiquín'],
        'La Unión': ['La Unión', 'Anamorós', 'Bolívar', 'Concepción de Oriente', 'Conchagua', 'El Carmen', 'El Sauce', 'Intipucá', 'Lislique', 'Meanguera del Golfo', 'Nueva Esparta', 'Pasaquina', 'Polorós', 'San Alejo', 'San José', 'Santa Rosa de Lima', 'Yayantique', 'Yucuaiquín']
    };

    const departamentoSelect = document.getElementById('departamento');
    const municipioSelect = document.getElementById('municipio');

    if (departamentoSelect && municipioSelect) {
        for (const dep in departamentos) {
            const option = document.createElement('option');
            option.value = dep;
            option.textContent = dep;
            departamentoSelect.appendChild(option);
        }

        departamentoSelect.addEventListener('change', () => {
            const selectedDepartamento = departamentoSelect.value;
            municipioSelect.innerHTML = '<option value="">Selecciona tu municipio</option>'; 
            municipioSelect.disabled = true;

            if (selectedDepartamento) {
                const municipios = departamentos[selectedDepartamento];
                municipios.forEach(mun => {
                    const option = document.createElement('option');
                    option.value = mun;
                    option.textContent = mun;
                    municipioSelect.appendChild(option);
                });
                municipioSelect.disabled = false;
            }
        });
    }
}

/**
 * Configura la lógica para el botón de pago alternativo.
 */
function setupAlternativePayment(checkoutData) {
  const alternativePaymentBtn = document.getElementById('alternativePayment');
  if (alternativePaymentBtn) {
    alternativePaymentBtn.style.display = 'block'; 
    alternativePaymentBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      window.showLoading(true);
      try {
        const customerData = _getCustomerData();
        const shippingData = _getShippingData();
        validateForm(customerData, shippingData);

        console.log("Procesando pago alternativo para:", checkoutData.total);
        await new Promise(resolve => setTimeout(resolve, 2000)); 
        
        const simulatedOrderId = 'ALT_' + Date.now();
        await _saveOrderDetailsToFirestore({
            id: simulatedOrderId,
            purchase_units: [{
                payments: {
                    captures: [{
                        amount: {
                            value: checkoutData.total,
                            currency_code: 'USD'
                        },
                        id: 'ALT_TRANS_' + Date.now()
                    }]
                }
            }],
            status: 'COMPLETED_ALT'
        }, checkoutData);
        
        CartService.clearCart(); 
        window.showLoading(false);
        window.showFeedback('¡Pago Alternativo Completado!', 'Tu pedido ha sido procesado mediante el método alternativo.', 'success');
      } catch (error) {
        window.showLoading(false);
        console.error("Error en pago alternativo:", error);
        window.showFeedback('Error en Pago Alternativo', error.message || 'Ocurrió un error al procesar tu pago alternativo.', 'error');
      }
    });
  }
}

/**
 * Configura el comportamiento del cierre del modal de feedback.
 */
function setupModalClose() {
  const feedbackModal = document.getElementById('feedbackModal');
  const feedbackCloseBtn = document.getElementById('feedbackClose');

  if (feedbackCloseBtn) {
    feedbackCloseBtn.addEventListener('click', () => {
      if (feedbackModal) {
        feedbackModal.classList.remove('active');
      }
      window.location.href = 'index.html'; 
    });
  }
}
