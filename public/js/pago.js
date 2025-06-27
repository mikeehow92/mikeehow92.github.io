// Variables globales
let checkoutData = null;

// Municipios por departamento
const municipiosPorDepartamento = {
  'Ahuachapán': ['Ahuachapán', 'Apaneca', 'Atiquizaya', 'Concepción de Ataco', 'El Refugio', 
                'Guaymango', 'Jujutla', 'San Francisco Menéndez', 'San Lorenzo', 'San Pedro Puxtla',
                'Tacuba', 'Turín'],
  'Santa Ana': ['Santa Ana', 'Candelaria de la Frontera', 'Chalchuapa', 'Coatepeque', 'El Congo',
              'El Porvenir', 'Masahuat', 'Metapán', 'San Antonio Pajonal', 'San Sebastián Salitrillo',
              'Santiago de la Frontera', 'Texistepeque'],
  // ... (agrega el resto de departamentos y municipios)
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
    const municipioSelect = document.getElementById('municipio');
    municipioSelect.innerHTML = '<option value="">Seleccione...</option>';
    
    const selectedDepartamento = this.value;
    if (selectedDepartamento && municipiosPorDepartamento[selectedDepartamento]) {
      municipiosPorDepartamento[selectedDepartamento].forEach(municipio => {
        const option = document.createElement('option');
        option.value = municipio;
        option.textContent = municipio;
        municipioSelect.appendChild(option);
      });
    }
  });

  // Cierre del modal de feedback
  document.getElementById('feedbackClose').addEventListener('click', () => {
    document.getElementById('feedbackModal').classList.remove('active');
  });
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
  document.getElementById('orderTotal').textContent = checkoutData.total.toFixed(2);
  document.getElementById('paymentTotal').textContent = checkoutData.total.toFixed(2);
  
  // Actualizar contador del carrito
  updateCartCounter();
  
  // Agregar event listeners a los botones de eliminar
  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', handleRemoveItem);
  });
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
