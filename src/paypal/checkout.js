import { loadScript } from './utils.js';
import { createPayPalOrder, capturePayPalOrder } from './service.js';
import { saveOrderToFirestore } from '../firebase/firestore.js';

/**
 * Inicializa el botón de PayPal en el contenedor especificado
 * @param {Object} config - Configuración del checkout
 * @param {string} config.container - Selector del contenedor (ej: '#paypal-button-container')
 * @param {Object} config.cart - Datos del carrito de compras
 * @param {function} [config.onSuccess] - Callback al completar el pago
 * @param {function} [config.onError] - Callback para manejo de errores
 * @param {boolean} [config.enableCardFields=true] - Habilitar campos de tarjeta
 */
export async function initPayPalCheckout(config) {
    try {
        // Cargar SDK de PayPal dinámicamente
        await loadPayPalSDK(config.clientId);
        
        // Renderizar botón principal
        renderPayPalButton(config);
        
        // Renderizar campos de tarjeta si está habilitado
        if (config.enableCardFields !== false) {
            renderCardFields(config);
        }
    } catch (error) {
        console.error('Error al inicializar PayPal:', error);
        config.onError?.(error);
    }
}

// ==================== Funciones Internas ====================

async function loadPayPalSDK(clientId) {
    if (!window.paypal) {
        await loadScript(
            `https://www.paypal.com/sdk/js?client-id=${clientId}&components=buttons,card-fields&currency=USD`
        );
    }
}

function renderPayPalButton({ container, cart, onSuccess, onError }) {
    return window.paypal.Buttons({
        style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal'
        },
        
        createOrder: async () => {
            try {
                const { id } = await createPayPalOrder(cart);
                return id;
            } catch (error) {
                console.error('Error al crear orden:', error);
                onError?.(error);
                throw error;
            }
        },
        
        onApprove: async (data) => {
            try {
                const captureData = await capturePayPalOrder(data.orderID);
                await handleSuccessfulPayment(captureData, data, onSuccess);
            } catch (error) {
                console.error('Error al capturar pago:', error);
                onError?.(error);
            }
        },
        
        onError: (err) => {
            console.error('Error en el flujo de PayPal:', err);
            onError?.(err);
        }
    }).render(container);
}

function renderCardFields({ container = '#card-form', cart, onSuccess, onError }) {
    if (!window.paypal.CardFields.isEligible()) {
        console.warn('Campos de tarjeta no disponibles');
        return;
    }

    const cardFields = window.paypal.CardFields({
        createOrder: () => createPayPalOrder(cart),
        onApprove: async (data) => {
            try {
                const captureData = await capturePayPalOrder(data.orderID);
                await handleSuccessfulPayment(captureData, data, onSuccess);
            } catch (error) {
                onError?.(error);
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
        }).catch(onError);
    });
}

async function handleSuccessfulPayment(captureData, paypalData, callback) {
    const transaction = captureData.purchase_units[0].payments.captures[0];
    
    // Guardar en Firestore
    await saveOrderToFirestore({
        id: paypalData.orderID,
        status: 'COMPLETED',
        amount: transaction.amount.value,
        transactionId: transaction.id,
        createdAt: new Date().toISOString()
    });
    
    // Ejecutar callback de éxito
    callback?.({
        orderId: paypalData.orderID,
        transactionId: transaction.id,
        amount: transaction.amount.value,
        status: transaction.status
    });
}

function getBillingAddress() {
    return {
        addressLine1: document.getElementById('billing-address-line1').value,
        addressLine2: document.getElementById('billing-address-line2').value,
        adminArea1: document.getElementById('billing-state').value,
        adminArea2: document.getElementById('billing-city').value,
        countryCode: document.getElementById('billing-country').value,
        postalCode: document.getElementById('billing-zip').value
    };
}
