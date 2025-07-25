// assets/js/pago.js
import { auth, db } from './firebase-config.js'; // Importar auth y db para datos de usuario/guardado de pedidos
import { CartService } from './cart.js';
import { showFeedback, showLoading } from './feedback.js';
import { addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async () => {
    const paymentForm = document.getElementById('payment-form');
    const cartSummaryContainer = document.getElementById('cartSummary');
    const totalAmountSpan = document.getElementById('totalAmount');
    const paypalButtonContainer = document.getElementById('paypal-button-container');

    // Cargar SDK de PayPal dinámicamente
    const paypalScript = document.createElement('script');
    paypalScript.src = "https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID&currency=USD"; // **REEMPLAZA CON TU CLIENT ID DE PAYPAL**
    paypalScript.onload = setupPayPalButtons;
    document.body.appendChild(paypalScript);

    const renderPaymentSummary = async () => {
        const cart = await CartService.getCart();
        cartSummaryContainer.innerHTML = '';
        if (cart.length === 0) {
            cartSummaryContainer.innerHTML = '<p>Tu carrito está vacío. Redirigiendo a la página principal...</p>';
            totalAmountSpan.textContent = '0.00';
            setTimeout(() => {
                window.location.href = 'index.html'; // Redirigir si el carrito está vacío
            }, 3000);
            return;
        }

        let total = 0;
        cart.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'summary-item';
            itemElement.innerHTML = `
                <span>${item.name} (x${item.quantity})</span>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
            `;
            cartSummaryContainer.appendChild(itemElement);
            total += item.price * item.quantity;
        });
        totalAmountSpan.textContent = total.toFixed(2);
    };

    await renderPaymentSummary();

    function setupPayPalButtons() {
        if (typeof paypal === 'undefined') {
            console.error("SDK de PayPal no cargado.");
            showFeedback("Error", "Error al cargar PayPal. Intenta de nuevo más tarde.", "error");
            return;
        }

        paypal.Buttons({
            createOrder: async function(data, actions) {
                const cart = await CartService.getCart();
                const total = CartService.getTotal(cart);
                if (total <= 0) {
                    showFeedback('Error', 'El carrito está vacío.', 'error');
                    return actions.reject('Cart is empty');
                }
                return actions.order.create({
                    purchase_units: [{
                        amount: {
                            currency_code: 'USD',
                            value: total.toFixed(2)
                        }
                    }]
                });
            },
            onApprove: async function(data, actions) {
                showLoading(true);
                try {
                    const order = await actions.order.capture();
                    console.log('Orden capturada:', order);
                    await processPaymentSuccess(order);
                } catch (error) {
                    console.error('Error al capturar la orden de PayPal:', error);
                    showFeedback('Error de Pago', 'Hubo un problema al procesar tu pago con PayPal. Inténtalo de nuevo.', 'error');
                } finally {
                    showLoading(false);
                }
            },
            onError: function(err) {
                console.error('PayPal onError:', err);
                showFeedback('Error de PayPal', 'Ha ocurrido un error con PayPal. Por favor, inténtalo de nuevo.', 'error');
            }
        }).render('#paypal-button-container');
    }

    async function processPaymentSuccess(paypalOrderDetails) {
        const cart = await CartService.getCart();
        const user = auth.currentUser; // Obtener usuario autenticado actual

        try {
            const orderData = {
                userId: user ? user.uid : 'guest', // Guardar ID de usuario o 'guest'
                userEmail: user ? user.email : 'guest@example.com', // Guardar email de usuario
                items: cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    image: item.image
                })),
                total: CartService.getTotal(cart),
                paymentMethod: 'PayPal',
                paypalOrderId: paypalOrderDetails.id,
                status: 'completed',
                timestamp: serverTimestamp() // Marca de tiempo del servidor de Firestore
            };

            await addDoc(collection(db, 'orders'), orderData);
            await CartService.clearCart(); // Vaciar carrito después de un pedido exitoso

            showFeedback('Pago Exitoso', '¡Tu compra se ha realizado con éxito! Redirigiendo...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html'; // O una página de confirmación
            }, 3000);

        } catch (error) {
            console.error("Error al guardar el pedido o vaciar el carrito:", error);
            showFeedback('Error', 'Tu pago fue exitoso, pero hubo un problema al registrar la orden. Contacta a soporte.', 'error');
        }
    }

    // Manejar el comportamiento del botón de cerrar el modal de feedback para pago.html
    const feedbackModalPago = document.getElementById('feedback-modal');
    if (feedbackModalPago) {
        const closeButtonPago = feedbackModalPago.querySelector('.close-modal-btn');
        if (closeButtonPago) {
            closeButtonPago.addEventListener('click', () => {
                feedbackModalPago.classList.remove('active');
                // Podrías querer redirigir a index.html o a otra página después de cerrar el feedback
                // window.location.href = 'index.html'; // Solo redirige si ese es el flujo deseado
            });
        }
    }
});
