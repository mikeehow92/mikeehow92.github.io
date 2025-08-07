// functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore(); // Get the Firestore Admin instance

// =============================================================================
// Cloud Function for the Contact Form (exports.api)
// =============================================================================
exports.api = functions.https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.set('Access-Control-Max-Age', '3600');
        return res.status(204).send('');
    }

    if (req.method !== 'POST') {
        return res.status(405).send('Method not allowed. Only POST.');
    }

    const { fullName, email, message } = req.body;

    if (!fullName || !email || !message) {
        functions.logger.error('Incomplete contact form data:', req.body);
        return res.status(400).send('Please provide full name, email, and message.');
    }

    try {
        functions.logger.info('Contact message received:', { fullName, email, message });
        await db.collection('contactMessages').add({
            fullName: fullName,
            email: email,
            message: message,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return res.status(200).send('Message received successfully.');
    } catch (error) {
        functions.logger.error('Error saving contact message:', error);
        return res.status(500).send('Internal server error.');
    }
});

// =============================================================================
// Cloud Function to process the complete order (inventory and save order)
// This is the function called from PayPal payment
// =============================================================================
exports.updateInventoryAndSaveOrder = functions.https.onRequest(async (req, res) => {
    // Configure CORS
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.set('Access-Control-Max-Age', '3600');
        return res.status(204).send('');
    }

    if (req.method !== 'POST') {
        return res.status(405).send('Method not allowed. Only POST.');
    }

    const { items, orderDetails, userId } = req.body;

    if (!items || !orderDetails || !userId) {
        return res.status(400).send('Missing order or user data.');
    }

    // Use a transaction to ensure inventory consistency and order creation
    try {
        const orderId = await db.runTransaction(async (transaction) => {
            // 1. Verify and update inventory
            const productsRef = db.collection('products');
            for (const item of items) {
                const productRef = productsRef.doc(item.id);
                const productDoc = await transaction.get(productRef);

                if (!productDoc.exists) {
                    throw new Error(`Product with ID ${item.id} does not exist.`);
                }

                const currentStock = productDoc.data().stock;
                const newStock = currentStock - item.quantity;

                if (newStock < 0) {
                    throw new Error(`Insufficient stock for product ${productDoc.data().name}.`);
                }

                transaction.update(productRef, { stock: newStock });
            }

            // 2. Save the order in the main collection
            const newOrderRef = db.collection('orders').doc();
            const orderToSavePublic = {
                orderId: newOrderRef.id,
                userId: userId,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                total: orderDetails.total,
                status: 'Pendiente', // Initial order status
                items: orderDetails.items.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    imageUrl: item.imageUrl || ''
                })),
                shippingDetails: orderDetails.shippingDetails,
                paypalOrderId: orderDetails.paypalOrderId,
            };
            transaction.set(newOrderRef, orderToSavePublic);

            // 3. Save the same order in the user's subcollection
            const userOrdersCollectionRef = db.collection('users').doc(userId).collection('orders');
            const orderToSaveUser = {
                orderId: newOrderRef.id,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                total: orderDetails.total,
                status: 'Pendiente', // Initial order status
                items: orderDetails.items.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    imageUrl: item.imageUrl || ''
                })),
                shippingDetails: orderDetails.shippingDetails,
                paypalOrderId: orderDetails.paypalOrderId,
            };
            transaction.set(userOrdersCollectionRef.doc(newOrderRef.id), orderToSaveUser);

            return newOrderRef.id;
        });

        res.status(200).json({ message: 'Inventory updated and order saved successfully.', orderId: orderId });

    } catch (error) {
        console.error('Error in inventory update or order save transaction:', error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
});

// =============================================================================
// New Cloud Function to update an order's status
// =============================================================================
exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
    // 1. Verify caller authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Only authenticated users can update the status of orders.');
    }

    // 2. Validate input data
    const { orderId, newStatus, userId } = data;

    if (!orderId || !newStatus || !userId) {
        throw new functions.https.HttpsError('invalid-argument', 'orderId, newStatus, and userId are required.');
    }

    // 3. Define the references of the documents to update
    const publicOrderRef = db.collection('orders').doc(orderId);
    const userOrderRef = db.collection('users').doc(userId).collection('orders').doc(orderId);

    // 4. Start a transaction to ensure both updates are atomic
    try {
        await db.runTransaction(async (transaction) => {
            // Update the order in the public collection
            transaction.update(publicOrderRef, { status: newStatus });

            // Update the order in the user's subcollection
            transaction.update(userOrderRef, { status: newStatus });
        });

        console.log(`Order status ${orderId} updated to ${newStatus} for user ${userId}.`);
        return { success: true, message: `Order status updated to ${newStatus}.` };

    } catch (error) {
        console.error('Error in status update transaction:', error);
        throw new functions.https.HttpsError('internal', 'Error updating order status.', error);
    }
});
