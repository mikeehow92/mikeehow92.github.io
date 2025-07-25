// assets/js/perfil.js
import { auth, db } from './firebase-config.js';
import { AuthService } from './auth.js';
import { ProductService } from './products.js'; // Potencialmente para mostrar los artículos del pedido
import { showFeedback, showLoading } from './feedback.js';
import { doc, getDoc, updateDoc, collection, query, where, orderBy, getDocs } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { updateProfile } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js"; // Importar explícitamente para actualizar photoURL

document.addEventListener('DOMContentLoaded', () => {
    const profileUserAvatar = document.getElementById('profile-user-avatar');
    const profileUserName = document.getElementById('profile-user-name');
    const profileUserEmail = document.getElementById('profile-user-email');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const profileInfoSection = document.getElementById('profile-info-section');
    const editProfileSection = document.getElementById('edit-profile-section');
    const avatarGrid = document.getElementById('avatar-grid');
    const avatarModal = document.getElementById('avatar-modal');
    const avatarSelectBtn = document.getElementById('select-avatar-btn');
    const avatarModalCloseBtn = avatarModal ? avatarModal.querySelector('.close-button') : null;
    const saveSelectedAvatarBtn = document.getElementById('save-selected-avatar-btn');
    const orderHistoryContainer = document.getElementById('order-history');

    let currentSelectedAvatarUrl = '';

    const defaultAvatars = [
        // Ejemplos de avatares predeterminados. Podrías subirlos a Firebase Storage y obtener URL públicas.
        '/assets/imagenes/avatars/avatar1.png',
        '/assets/imagenes/avatars/avatar2.png',
        '/assets/imagenes/avatars/avatar3.png',
        '/assets/imagenes/avatars/avatar4.png',
        '/assets/imagenes/avatars/avatar5.png'
    ];

    const displayProfile = async (user) => {
        if (user) {
            profileUserAvatar.src = user.photoURL || '/assets/imagenes/default-avatar.png';
            profileUserName.textContent = user.displayName || 'No Nombre';
            profileUserEmail.textContent = user.email;

            // Rellenar formulario de edición
            const editDisplayName = document.getElementById('edit-display-name');
            const editEmail = document.getElementById('edit-email');
            if (editDisplayName) editDisplayName.value = user.displayName || '';
            if (editEmail) editEmail.value = user.email;

            // Actualizar avatar del header si existe
            const userAvatarHeader = document.getElementById('user-avatar');
            if (userAvatarHeader) userAvatarHeader.src = user.photoURL || '/assets/imagenes/default-avatar.png';

        } else {
            // No hay usuario logueado, redirigir a login o index
            showFeedback('Acceso Denegado', 'Debes iniciar sesión para ver tu perfil.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    };

    const loadOrderHistory = async (userId) => {
        orderHistoryContainer.innerHTML = '<p>Cargando historial de pedidos...</p>';
        try {
            const ordersRef = collection(db, 'orders');
            const q = query(ordersRef, where('userId', '==', userId), orderBy('timestamp', 'desc'));
            const querySnapshot = await getDocs(q);

            orderHistoryContainer.innerHTML = ''; // Limpiar mensaje de carga

            if (querySnapshot.empty) {
                orderHistoryContainer.innerHTML = '<p>No tienes pedidos realizados aún.</p>';
                return;
            }

            querySnapshot.forEach(doc => {
                const order = doc.data();
                const orderCard = document.createElement('div');
                orderCard.className = 'order-card';
                orderCard.innerHTML = `
                    <div class="order-header">
                        <span class="order-id">Pedido #${doc.id.substring(0, 8)}</span>
                        <span class="order-date">${order.timestamp ? new Date(order.timestamp.toDate()).toLocaleDateString() : 'Fecha no disponible'}</span>
                        <span class="order-status status-${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                    </div>
                    <div class="order-items">
                        ${order.items.map(item => `
                            <div class="order-item">
                                <img src="${item.image || '/assets/imagenes/default-product.jpg'}" alt="${item.name}" class="item-img">
                                <div class="item-details">
                                    <span class="item-name">${item.name} (x${item.quantity})</span>
                                    <span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="order-total">
                        Total: $${order.total.toFixed(2)}
                    </div>
                `;
                orderHistoryContainer.appendChild(orderCard);
            });

        } catch (error) {
            console.error("Error al cargar el historial de pedidos:", error);
            orderHistoryContainer.innerHTML = '<p class="error-message">Error al cargar el historial de pedidos.</p>';
            showFeedback('Error', 'No se pudo cargar el historial de pedidos.', 'error');
        }
    };


    // Verificación inicial del estado de autenticación y visualización del perfil
    AuthService.onAuthStateChanged(async (user) => {
        if (user) {
            await displayProfile(user);
            await loadOrderHistory(user.uid);
        } else {
            displayProfile(null); // Manejar estado sin usuario
        }
    });

    // Botón de editar perfil
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            if (profileInfoSection) profileInfoSection.classList.remove('active');
            if (editProfileSection) editProfileSection.classList.add('active');
        });
    }

    // Botón de guardar perfil
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (!user) {
                showFeedback('Error', 'Usuario no autenticado.', 'error');
                return;
            }

            showLoading(true);
            const newDisplayName = document.getElementById('edit-display-name').value;
            // Para la actualización del correo electrónico, Firebase requiere reautenticación, así que manténlo separado o manéjalo con cuidado
            // const newEmail = document.getElementById('edit-email').value;

            try {
                // Actualizar perfil de Firebase Auth
                await AuthService.updateUserProfile(user, { displayName: newDisplayName });

                // Actualizar documento de usuario en Firestore
                await updateDoc(doc(db, 'users', user.uid), {
                    displayName: newDisplayName
                });

                showFeedback('Perfil Actualizado', 'Tu perfil ha sido actualizado correctamente.', 'success');
                // Actualizar visualización del perfil
                await displayProfile(auth.currentUser);

                // Volver a la vista de información
                if (editProfileSection) editProfileSection.classList.remove('active');
                if (profileInfoSection) profileInfoSection.classList.add('active');

            } catch (error) {
                console.error("Error al actualizar el perfil:", error);
                showFeedback('Error', `No se pudo actualizar el perfil: ${error.message}`, 'error');
            } finally {
                showLoading(false);
            }
        });
    }

    // Botón de cancelar edición
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            if (editProfileSection) editProfileSection.classList.remove('active');
            if (profileInfoSection) profileInfoSection.classList.add('active');
            // Volver a rellenar el formulario con los datos del usuario actual para descartar cambios
            displayProfile(auth.currentUser);
        });
    }

    // Modal de selección de avatar
    const profileAvatarContainer = document.querySelector('.profile-avatar');
    if (profileAvatarContainer) {
        profileAvatarContainer.addEventListener('click', () => {
            if (avatarModal) {
                avatarModal.classList.add('active');
                renderAvatarGrid();
            }
        });
    }


    if (avatarModalCloseBtn) {
        avatarModalCloseBtn.addEventListener('click', () => {
            if (avatarModal) avatarModal.classList.remove('active');
        });
    }

    // Renderizar avatares predeterminados
    function renderAvatarGrid() {
        avatarGrid.innerHTML = '';
        defaultAvatars.forEach(url => {
            const avatarItem = document.createElement('div');
            avatarItem.className = 'avatar-item';
            if (currentSelectedAvatarUrl === url) {
                avatarItem.classList.add('selected');
            }
            avatarItem.innerHTML = `<img src="${url}" alt="Avatar">`;
            avatarItem.dataset.avatarUrl = url;
            avatarItem.addEventListener('click', () => {
                avatarGrid.querySelectorAll('.avatar-item').forEach(item => item.classList.remove('selected'));
                avatarItem.classList.add('selected');
                currentSelectedAvatarUrl = url;
            });
            avatarGrid.appendChild(avatarItem);
        });
    }

    if (saveSelectedAvatarBtn) {
        saveSelectedAvatarBtn.addEventListener('click', async () => {
            if (!currentSelectedAvatarUrl) {
                showFeedback('Información', 'Por favor, selecciona un avatar.', 'info');
                return;
            }
            showLoading(true);
            try {
                await saveSelectedAvatar(currentSelectedAvatarUrl);
                if (avatarModal) avatarModal.classList.remove('active');
            } catch (error) {
                console.error("Error al guardar el avatar seleccionado:", error);
                showFeedback('Error', 'No se pudo guardar el avatar. Intenta de nuevo.', 'error');
            } finally {
                showLoading(false);
            }
        });
    }

    // Función para guardar el avatar seleccionado (del script en línea)
    async function saveSelectedAvatar(avatarUrl) {
        const user = auth.currentUser;
        if (!user) {
            showFeedback('Error', 'Usuario no autenticado. Por favor, inicie sesión.', 'error');
            return;
        }

        try {
            // 1. Actualizar photoURL en Firebase Authentication
            await updateProfile(user, { photoURL: avatarUrl });

            // 2. Actualizar photoURL en el documento de usuario en Firestore
            await updateDoc(doc(db, 'users', user.uid), {
                photoURL: avatarUrl
            });

            // 3. Actualizar la UI del avatar en la página de perfil
            profileUserAvatar.src = avatarUrl;
            const userAvatarHeader = document.getElementById('user-avatar'); // Asumiendo que este es el avatar del header
            if (userAvatarHeader) {
                userAvatarHeader.src = avatarUrl;
            }

            showFeedback('Éxito', 'Avatar actualizado correctamente.', 'success');
        } catch (error) {
            console.error("Error al guardar el avatar:", error);
            showFeedback('Error', 'No se pudo guardar el avatar: ' + error.message, 'error');
            throw error; // Volver a lanzar para que sea capturado por el try-catch externo
        }
    }
});
