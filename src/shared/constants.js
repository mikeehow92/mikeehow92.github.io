const firebaseConfig = {
  apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
  authDomain: "mitienda-c2609.firebaseapp.com",
  databaseURL: "https://mitienda-c2609-default-rtdb.firebaseio.com",
  projectId: "mitienda-c2609",
  storageBucket: "mitienda-c2609.firebasestorage.app",
  messagingSenderId: "536746062790",
  appId: "1:536746062790:web:6e545efbc8f037e36538c7"
};

// ==================== CONSTANTES DE FIREBASE ====================
export const FIREBASE_CONFIG = {
  COLLECTIONS: {
    USERS: 'users',
    PRODUCTS: 'products',
    CARTS: 'carts',
    ORDERS: 'orders'
  },
  STORAGE_PATHS: {
    PRODUCT_IMAGES: 'product-images/',
    USER_AVATARS: 'user-avatars/'
  }
};

// ==================== CONSTANTES DE LA APLICACIÓN ====================
export const APP_CONSTANTS = {
  ROLES: {
    ADMIN: 'admin',
    CUSTOMER: 'customer',
    GUEST: 'guest'
  },
  CART: {
    LOCAL_STORAGE_KEY: 'guest_cart',
    MAX_ITEMS: 20,
    MAX_QUANTITY_PER_ITEM: 10
  },
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 12,
    MAX_PAGE_SIZE: 50
  },
  SESSION: {
    TOKEN_EXPIRATION_HOURS: 24,
    SESSION_TIMEOUT_MINUTES: 30
  }
};

// ==================== CONSTANTES DE UI ====================
export const UI_CONSTANTS = {
  BREAKPOINTS: {
    MOBILE: 576,
    TABLET: 768,
    DESKTOP: 992,
    LARGE_DESKTOP: 1200
  },
  TRANSITIONS: {
    DEFAULT: 'all 0.3s ease',
    FAST: 'all 0.15s ease',
    MODAL: 'all 0.4s cubic-bezier(0.32, 0.72, 0, 1)'
  },
  Z_INDEX: {
    MODAL: 1000,
    DROPDOWN: 900,
    TOOLTIP: 800,
    HEADER: 700
  }
};

// ==================== CONSTANTES DE VALIDACIÓN ====================
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 6,
  PHONE_REGEX: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
  NAME_MIN_LENGTH: 2
};

// ==================== MENSAJES PREDEFINIDOS ====================
export const MESSAGES = {
  ERRORS: {
    AUTH: {
      INVALID_EMAIL: 'Por favor ingresa un email válido',
      WEAK_PASSWORD: 'La contraseña debe tener al menos 6 caracteres',
      USER_DISABLED: 'Esta cuenta ha sido desactivada',
      USER_NOT_FOUND: 'No existe una cuenta con este email',
      WRONG_PASSWORD: 'Contraseña incorrecta',
      EMAIL_IN_USE: 'Este email ya está registrado',
      DEFAULT: 'Error en la autenticación'
    },
    PRODUCTS: {
      NOT_FOUND: 'Producto no encontrado',
      OUT_OF_STOCK: 'Producto agotado',
      DEFAULT: 'Error al cargar productos'
    },
    CART: {
      EMPTY: 'Tu carrito está vacío',
      MAX_ITEMS: 'Has alcanzado el límite de items en el carrito',
      MAX_QUANTITY: 'Has alcanzado la cantidad máxima para este producto',
      DEFAULT: 'Error al actualizar el carrito'
    }
  },
  SUCCESS: {
    AUTH: {
      LOGIN: 'Sesión iniciada correctamente',
      LOGOUT: 'Sesión cerrada correctamente',
      REGISTER: '¡Cuenta creada con éxito!'
    },
    CART: {
      ADD: 'Producto añadido al carrito',
      REMOVE: 'Producto eliminado del carrito',
      CLEAR: 'Carrito vaciado'
    },
    ORDER: {
      CREATE: '¡Pedido realizado con éxito!'
    }
  }
};

// ==================== CONFIGURACIÓN DE API ====================
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://api.mitienda.com/v1',
  ENDPOINTS: {
    PRODUCTS: '/products',
    ORDERS: '/orders',
    PAYMENTS: '/payments/intent'
  },
  HEADERS: {
    DEFAULT: {
      'Content-Type': 'application/json'
    },
    AUTH: {
      'Authorization': 'Bearer '
    }
  }
};

// ==================== CONSTANTES DE PRUEBAS ====================
export const TEST_CONSTANTS = {
  MOCK_USER: {
    uid: 'test-uid-123',
    email: 'test@example.com',
    displayName: 'Test User'
  },
  MOCK_PRODUCT: {
    id: 'test-prod-456',
    name: 'Producto de Prueba',
    price: 99.99
  }
};
