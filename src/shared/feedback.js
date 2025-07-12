// src/shared/feedback.js

// Constantes de configuración
const CONFIG = {
  DEFAULT_DURATION: 3000, // 3 segundos
  TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
  },
  ICONS: {
    success: 'check-circle',
    error: 'exclamation-circle',
    warning: 'exclamation-triangle',
    info: 'info-circle'
  },
  COLORS: {
    success: '#4BB543',
    error: '#FF3333',
    warning: '#FFAC33',
    info: '#3399FF'
  }
};

// Estilos dinámicos inyectados
const STYLES = `
.feedback-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 350px;
}

.feedback-message {
  position: relative;
  padding: 15px 20px;
  border-radius: 8px;
  color: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 12px;
  transform: translateX(120%);
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  opacity: 0;
  overflow: hidden;
}

.feedback-message.show {
  transform: translateX(0);
  opacity: 1;
}

.feedback-message.hide {
  transform: translateX(120%);
  opacity: 0;
}

.feedback-message .icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.feedback-message .content {
  flex-grow: 1;
}

.feedback-message .close-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.7;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.feedback-message .close-btn:hover {
  opacity: 1;
}

.feedback-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background: rgba(255,255,255,0.3);
  width: 100%;
}

.feedback-progress-bar {
  height: 100%;
  background: white;
  width: 100%;
  transform-origin: left;
}

/* Estilos para el overlay de carga (spinner) */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001; /* Asegúrate de que esté por encima de otros elementos */
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}
.loading-overlay.active {
  opacity: 1;
  visibility: visible;
}
.loading-spinner {
  border: 8px solid rgba(255, 255, 255, 0.3);
  border-top: 8px solid #fff;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

/**
 * Muestra una notificación al usuario
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación (success, error, warning, info)
 * @param {number} [duration] - Duración en milisegundos (opcional)
 */
export const showFeedback = (message, type = CONFIG.TYPES.INFO, duration = CONFIG.DEFAULT_DURATION) => {
  // Inyectar estilos si no existen
  injectStyles();

  // Crear contenedor si no existe
  let container = document.getElementById('feedback-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'feedback-container';
    container.className = 'feedback-container';
    document.body.appendChild(container);
  }

  // Crear elemento de mensaje
  const messageElement = document.createElement('div');
  messageElement.className = `feedback-message feedback-${type}`;
  messageElement.style.backgroundColor = CONFIG.COLORS[type] || CONFIG.COLORS.info;

  // Icono basado en el tipo
  const iconElement = document.createElement('i');
  iconElement.className = `icon fas fa-${CONFIG.ICONS[type] || CONFIG.ICONS.info}`;

  // Contenido del mensaje
  const contentElement = document.createElement('div');
  contentElement.className = 'content';
  contentElement.textContent = message;

  // Botón de cerrar
  const closeButton = document.createElement('button');
  closeButton.className = 'close-btn';
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', () => dismissFeedback(messageElement));

  // Barra de progreso
  const progressContainer = document.createElement('div');
  progressContainer.className = 'feedback-progress';

  const progressBar = document.createElement('div');
  progressBar.className = 'feedback-progress-bar';

  progressContainer.appendChild(progressBar);
  messageElement.append(iconElement, contentElement, closeButton, progressContainer);
  container.appendChild(messageElement);

  // Mostrar animación
  setTimeout(() => {
    messageElement.classList.add('show');
    
    // Animación de la barra de progreso
    progressBar.style.transition = `transform ${duration}ms linear`;
    progressBar.style.transform = 'scaleX(0)';
  }, 10);

  // Configurar auto-dismiss
  let dismissTimeout = setTimeout(() => {
    dismissFeedback(messageElement);
  }, duration);

  // Pausar al hacer hover
  messageElement.addEventListener('mouseenter', () => {
    clearTimeout(dismissTimeout);
    progressBar.style.transition = 'none';
    progressBar.style.transform = `scaleX(${progressBar.offsetWidth / messageElement.offsetWidth})`;
  });

  // Reanudar al salir del hover
  messageElement.addEventListener('mouseleave', () => {
    const remainingWidth = progressBar.offsetWidth / messageElement.offsetWidth;
    const remainingTime = remainingWidth * duration;
    
    progressBar.style.transition = `transform ${remainingTime}ms linear`;
    progressBar.style.transform = 'scaleX(0)';
    
    dismissTimeout = setTimeout(() => {
      dismissFeedback(messageElement);
    }, remainingTime);
  });
};

/**
 * Oculta un mensaje de feedback
 * @param {HTMLElement} messageElement 
 */
const dismissFeedback = (messageElement) => {
  if (!messageElement) return;

  messageElement.classList.remove('show');
  messageElement.classList.add('hide');

  // Eliminar después de la animación
  setTimeout(() => {
    messageElement.remove();
    
    // Eliminar contenedor si no hay más mensajes
    const container = document.getElementById('feedback-container');
    if (container && container.children.length === 0) {
      container.remove();
    }
  }, 300);
};

/**
 * Muestra u oculta un spinner de carga global.
 * @param {boolean} show - True para mostrar, false para ocultar.
 */
export const showLoading = (show) => { // <-- Nueva función exportada
  injectStyles(); // Asegura que los estilos del spinner estén inyectados
  let loadingOverlay = document.getElementById('loadingOverlay');
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loadingOverlay';
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(loadingOverlay);
  }

  if (show) {
    loadingOverlay.classList.add('active');
  } else {
    loadingOverlay.classList.remove('active');
  }
};

/**
 * Inyecta los estilos en el head del documento
 */
const injectStyles = () => {
  if (document.getElementById('feedback-styles')) return;

  const styleElement = document.createElement('style');
  styleElement.id = 'feedback-styles';
  styleElement.textContent = STYLES;
  document.head.appendChild(styleElement);
};

// Métodos directos para tipos específicos
export const showSuccess = (message, duration) => showFeedback(message, CONFIG.TYPES.SUCCESS, duration);
export const showError = (message, duration) => showFeedback(message, CONFIG.TYPES.ERROR, duration);
export const showWarning = (message, duration) => showFeedback(message, CONFIG.TYPES.WARNING, duration);
export const showInfo = (message, duration) => showFeedback(message, CONFIG.TYPES.INFO, duration);

// Auto-inicialización de estilos
document.addEventListener('DOMContentLoaded', injectStyles);
