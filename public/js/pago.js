// Variables globales
let checkoutData = null;

// Municipios completos de El Salvador
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

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', async () => {
  // Cargar datos del carrito desde localStorage
  checkoutData = JSON.parse(localStorage.getItem('currentCheckout'));
  
  // Verificar si hay items en el carrito
  if (!checkoutData || !checkoutData.items || checkoutData.items.length === 0) {
    showErrorAndRedirect('No se encontraron productos en el carrito');
    return;
  }

  // Renderizar carrito y configurar PayPal
  renderCartItems();
  setupPayPalButton();
  setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
  // Selector de departamento
  document.getElementById('departamento').addEventListener('change', function() {
    updateMunicipios();
  });

  // Cierre del modal de feedback
  document.getElementById('feedbackClose').addEventListener('click', () => {
    document.getElementById('feedbackModal').classList.remove('active');
  });
}

// Actualizar municipios según departamento seleccionado
function updateMunicipios() {
  const departamentoSelect = document.getElementById('departamento');
  const municipioSelect = document.getElementById('municipio');
  const selectedDepartamento = departamentoSelect.value;

  municipioSelect.innerHTML = '<option value="">Seleccione...</option>';

  if (selectedDepartamento && municipiosPorDepartamento[selectedDepartamento]) {
    municipiosPorDepartamento[selectedDepartamento].forEach(municipio => {
      const option = document.createElement('option');
      option.value = municipio;
      option.textContent = municipio;
      municipioSelect.appendChild(option);
    });
  }
}

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
  
  // Actualizar totales
  updateTotals();
  
  // Agregar event listeners a los botones de eliminar
  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', handleRemoveItem);
  });
}

// Actualizar totales del pedido
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

// Manejar eliminación de items
async function handleRemoveItem(e) {
  const productId = e.currentTarget.dataset.id;
  const btn = e.currentTarget;
  
  try {
    // Mostrar estado de carga
    btn.innerHTML = '<span class="loading"></span>';
    btn.disabled = true;
    
    // Eliminar el item del carrito local
    checkoutData.items = checkoutData.items.filter(item => item.id !== productId);
    
    // Recalcular total
    checkoutData.total = checkoutData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Actualizar localStorage
    localStorage.setItem('currentCheckout', JSON.stringify(checkoutData));
    
    // Volver a renderizar
    renderCartItems();
    
    // Mostrar feedback
    showFeedback('Producto eliminado', 'El producto ha sido removido de tu carrito', 'success');
    
    // Si el carrito queda vacío, redirigir
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

// Configurar botón de PayPal
function setupPayPalButton() {
  try {
    paypal.Buttons({
      createOrder: function(data, actions) {
        if (!validateForm()) {
          return Promise.reject(new Error('Por favor complete todos los campos requeridos'));
        }
        
        return actions.order.create({
          purchase_units: [{
            amount: {
              value: checkoutData.total.toFixed(2),
              breakdown: {
                item_total: {
                  value: checkoutData.total.toFixed(2),
                  currency_code: 'USD'
                }
              }
            },
            items: checkoutData.items.map(item => ({
              name: item.name,
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
          }],
          application_context: {
            shipping_preference: 'SET_PROVIDED_ADDRESS'
          }
        });
      },
      onApprove: function(data, actions) {
        const paypalButton = document.querySelector('#paypal-button-container');
        paypalButton.innerHTML = '<div style="text-align: center;"><span class="loading"></span> Procesando pago...</div>';
        
        return actions.order.capture().then(function(details) {
          showFeedback('¡Pago completado!', `Pedido #${generateOrderId()} procesado`, 'success');
          
          // Guardar detalles de la transacción (puedes enviarlos a tu servidor)
          const transactionData = {
            orderID: data.orderID,
            payerID: details.payer.payer_id,
            paymentID: details.purchase_units[0].payments.captures[0].id,
            status: details.status,
            email: details.payer.email_address,
            name: `${details.payer.name.given_name} ${details.payer.name.surname}`,
            amount: checkoutData.total,
            items: checkoutData.items
          };
          
          // Limpiar carrito después de pago exitoso
          localStorage.removeItem('currentCheckout');
          
          setTimeout(() => {
            window.location.href = 'confirmacion.html';
          }, 3000);
        });
      },
      onError: function(err) {
        console.error('Error en PayPal:', err);
        showFeedback('Error en el pago', err.message || 'Ocurrió un error al procesar el pago', 'error');
      },
      onCancel: function(data) {
        showFeedback('Pago cancelado', 'El pago fue cancelado por el usuario', 'error');
      }
    }).render('#paypal-button-container');
    
    // Si PayPal no carga después de 5 segundos, mostrar botón alternativo
    setTimeout(() => {
      if (!document.querySelector('#paypal-button-container').hasChildNodes()) {
        document.getElementById('alternativePayment').style.display = 'block';
        document.getElementById('alternativePayment').addEventListener('click', () => {
          showFeedback('Método alternativo', 'Actualmente solo aceptamos PayPal. Por favor habilite JavaScript y recargue la página.', 'error');
        });
      }
    }, 5000);
  } catch (error) {
    console.error('Error al configurar PayPal:', error);
    document.getElementById('alternativePayment').style.display = 'block';
  }
}

// Validar formulario
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

// Generar ID de pedido
function generateOrderId() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Mostrar feedback
function showFeedback(title, message, type = 'success') {
  const modal = document.getElementById('feedbackModal');
  const icon = document.getElementById('feedbackIcon');
  const feedbackTitle = document.getElementById('feedbackTitle');
  const feedbackMessage = document.getElementById('feedbackMessage');
  
  // Configurar contenido
  icon.innerHTML = `<i class="fas fa-${
    type === 'success' ? 'check-circle' : 'times-circle'
  } ${type}"></i>`;
  
  feedbackTitle.textContent = title;
  feedbackMessage.textContent = message;
  
  // Mostrar modal
  modal.classList.add('active');
}

// Mostrar error y redirigir
function showErrorAndRedirect(message) {
  showFeedback('Error', message, 'error');
  setTimeout(() => {
    window.location.href = 'productos.html';
  }, 3000);
}
