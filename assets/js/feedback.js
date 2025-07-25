// assets/js/feedback.js
export const showFeedback = (title, message, type = 'success') => {
    const feedbackModal = document.getElementById('feedback-modal');
    const iconElement = document.getElementById('feedback-icon-element');
    const titleElement = document.getElementById('feedback-title-element');
    const messageElement = document.getElementById('feedback-message-element');

    if (iconElement) {
        // Limpiar clases anteriores
        iconElement.className = 'feedback-icon'; // Reset class
        if (type === 'success') {
            iconElement.classList.add('fas', 'fa-check-circle', 'success');
        } else if (type === 'error') {
            iconElement.classList.add('fas', 'fa-times-circle', 'error');
        } else if (type === 'info') {
            iconElement.classList.add('fas', 'fa-info-circle', 'info');
        } else {
            // Predeterminado a info si el tipo es desconocido
            iconElement.classList.add('fas', 'fa-info-circle', 'info');
        }
    }
    if (titleElement) titleElement.textContent = title;
    if (messageElement) messageElement.textContent = message;
    if (feedbackModal) feedbackModal.classList.add('active');

    // Añadir event listener al botón de cerrar si existe
    const closeButton = feedbackModal ? feedbackModal.querySelector('.close-modal-btn') : null;
    if (closeButton) {
        closeButton.onclick = () => {
            feedbackModal.classList.remove('active');
        };
    }
};

export const showLoading = (show) => {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.add('active');
        } else {
            loadingOverlay.classList.remove('active');
        }
    }
};
