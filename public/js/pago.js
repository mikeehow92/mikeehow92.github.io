import { auth, db } from '../shared/firebase-config.js';
import { serverTimestamp } from 'firebase/firestore';
import { CartService } from '../cart/cart.js';

// Datos de municipios (Ejemplo para El Salvador)
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

let checkoutData = null;

// ==================== FUNCIONES PAYPAL ====================
async function createPayPalOrder() {
  if (!validateForm()) {
    throw new Error('Complete todos los campos requeridos');
  }

  try {
    const response = await fetch('https://us-central1-mitienda-c2609.cloudfunctions.net/api/create-paypal-order', {
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

    if (!response.ok) throw new Error('Error en la respuesta del servidor');
    return await response.json();
  } catch (error) {
    console.error("Error creando orden PayPal:", error);
    showFeedback('Error', 'No se pudo iniciar el pago con PayPal', 'error');
    throw error;
  }
}

async function capturePayPalOrder(orderID) {
  try {
    const response = await fetch('https://us-central1-mitienda-c2609.cloudfunctions.net/api/capture-paypal-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderID })
    });

    if (!response.ok) throw new Error('Error en la respuesta del servidor');
    return await response.json();
  } catch (error) {
    console.error("Error capturando orden PayPal:", error);
    showFeedback('Error', 'Error al procesar el pago', 'error');
    throw error;
  }
}

// ==================== FUNCIONES FIRESTORE ====================
async function saveTransaction(paymentDetails, orderId) {
  try {
    const user = auth.currentUser;
    
    const transactionData = {
      orderId,
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
    };

    await setDoc(doc(db, "transactions", orderId), transactionData);
    await CartService.clearCart(); // Limpiar carrito después de pago exitoso
  } catch (error) {
    console.error("Error guardando transacción:", error);
    throw error;
  }
}

// ==================== INTEGRACIÓN PAYPAL ====================
function setupPayPalButton() {
  if (!window.paypal) {
    console.error("PayPal SDK no cargado");
    document.getElementById('alternativePayment').style.display = 'block';
    return;
  }

  paypal.Buttons({
    style: {
      layout: 'vertical',
      color: 'blue',
      shape: 'rect',
      label: 'paypal',
      height: 40
    },
    createOrder: createPayPalOrder,
    onApprove: async (data) => {
      try {
        const details = await capturePayPalOrder(data.orderID);
        await saveTransaction(details, data.orderID);
        
        showFeedback('¡Pago completado!', `Orden #${data.orderID} procesada correctamente`, 'success');
        setTimeout(() => window.location.href = 'confirmacion.html', 3000);
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

// ==================== MÉTODO ALTERNATIVO ====================
function setupAlternativePayment() {
  const altBtn = document.getElementById('alternativePayment');
  
  altBtn.addEventListener('click', async function() {
    if (!validateForm()) {
      showFeedback('Error', 'Complete todos los campos requeridos', 'error');
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
      setTimeout(() => window.location.href = 'confirmacion.html', 3000);
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
  
  deptoSelect.innerHTML = '<option value="">Seleccione departamento...</option>';
  Object.keys(municipiosPorDepartamento).forEach(depto => {
    deptoSelect.innerHTML += `<option value="${depto}">${depto}</option>`;
  });

  deptoSelect.addEventListener('change', function() {
    const muniSelect = document.getElementById('municipio');
    muniSelect.innerHTML = '<option value="">Seleccione municipio...</option>';

    if (this.value && municipiosPorDepartamento[this.value]) {
      municipiosPorDepartamento[this.value].forEach(municipio => {
        muniSelect.innerHTML += `<option value="${municipio}">${municipio}</option>`;
      });
    }
  });
}

function renderCartItems() {
  const container = document.getElementById('orderItems');
  
  if (!checkoutData?.items?.length) {
    container.innerHTML = '<p>No hay productos en el carrito</p>';
    return;
  }

  container.innerHTML = checkoutData.items.map(item => `
    <div class="order-item">
      <img src="${item.image || 'assets/default-product.png'}" alt="${item.name}" width="50">
      <span>${item.name}</span>
      <span>${item.quantity} × $${item.price.toFixed(2)}</span>
    </div>
  `).join('');

  updateTotals();
}

function updateTotals() {
  if (!checkoutData) return;
  
  document.getElementById('orderTotal').textContent = checkoutData.total.toFixed(2);
  document.getElementById('paymentTotal').textContent = checkoutData.total.toFixed(2);
}

// ==================== INICIALIZACIÓN ====================
async function initializePayment() {
  try {
    // Cargar datos del carrito
    const savedCheckout = localStorage.getItem('currentCheckout');
    if (!savedCheckout) {
      showFeedback('Error', 'No se encontraron datos del carrito', 'error');
      setTimeout(() => window.location.href = 'productos.html', 2000);
      return;
    }

    checkoutData = JSON.parse(savedCheckout);
    if (!checkoutData?.items?.length) {
      showFeedback('Error', 'El carrito está vacío', 'error');
      setTimeout(() => window.location.href = 'productos.html', 2000);
      return;
    }

    // Inicializar componentes
    setupAddressForm();
    renderCartItems();
    
    // Cargar SDK PayPal dinámicamente
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${import.meta.env.VITE_PAYPAL_CLIENT_ID}&currency=USD`;
    script.onload = setupPayPalButton;
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

  } catch (error) {
    console.error("Error inicializando pago:", error);
    showFeedback('Error', 'Error al cargar la página de pago', 'error');
    setTimeout(() => window.location.href = 'productos.html', 2000);
  }
}

// Exportar para pago.html
export function initPayment() {
  document.addEventListener('DOMContentLoaded', initializePayment);
}
