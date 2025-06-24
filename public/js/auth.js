import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";
import { 
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCR-axayENUg4FFb4jj0uVW2BnfwQ5EiXY",
  authDomain: "mitienda-c2609.firebaseapp.com",
  databaseURL: "https://mitienda-c2609-default-rtdb.firebaseio.com",
  projectId: "mitienda-c2609",
  storageBucket: "mitienda-c2609.firebasestorage.app",
  messagingSenderId: "536746062790",
  appId: "1:536746062790:web:cd39eb0057aac14c6538c7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==================== AUTHENTICATION FUNCTIONS ====================

/**
 * Migrates guest cart to user's account after login
 * @param {Object} user - Firebase user object
 */
export const migrateGuestCart = async (user) => {
  try {
    const guestCart = localStorage.getItem('cart');
    if (guestCart && user) {
      await setDoc(doc(db, 'carts', user.uid), {
        items: JSON.parse(guestCart),
        lastUpdated: serverTimestamp()
      });
      localStorage.removeItem('cart');
    }
  } catch (error) {
    console.error("Error migrating cart:", error);
    throw error;
  }
};

/**
 * Authentication Service
 */
export const AuthService = {
  // Get current authenticated user
  getCurrentUser: () => auth.currentUser,

  // Login with email and password
  login: (email, password) => signInWithEmailAndPassword(auth, email, password),

  // Logout current user
  logout: () => signOut(auth),

  // Listen for auth state changes
  onAuthStateChanged: (callback) => onAuthStateChanged(auth, callback),

  // Change user password (requires reauthentication)
  changePassword: async (currentPassword, newPassword) => {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");
    
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    return await updatePassword(user, newPassword);
  },

  // Register new user with email and password
  register: async (email, password, userData) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        ...userData,
        createdAt: new Date().toISOString(),
        email: user.email
      });

      await migrateGuestCart(user);
      return user;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  },

  // Check authentication status
  checkAuth: () => {
    return new Promise((resolve, reject) => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            resolve(userDoc.exists() ? { ...user, profileData: userDoc.data() } : user);
          } catch (error) {
            console.error("Error getting user profile:", error);
            resolve(user);
          }
        } else {
          reject(new Error("User not authenticated"));
        }
      });
    });
  },

  // Get user profile data
  getUserProfile: async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
      console.error("Error getting user profile:", error);
      throw error;
    }
  }
};

// ==================== AUTH UI MANAGEMENT ====================

/**
 * Initialize authentication UI components
 */
export function initAuthUI() {
  // DOM elements
  const loginModal = document.getElementById('login-modal');
  const registerModal = document.getElementById('register-modal');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const logoutBtn = document.getElementById('logout-btn');

  // Open login modal
  const openLoginBtn = document.getElementById('open-login-btn');
  if (openLoginBtn && loginModal) {
    openLoginBtn.addEventListener('click', () => {
      loginModal.classList.add('active');
    });
  }

  // Open register modal
  const openRegisterBtn = document.getElementById('open-register-btn');
  if (openRegisterBtn && registerModal) {
    openRegisterBtn.addEventListener('click', () => {
      registerModal.classList.add('active');
    });
  }

  // Close modals when clicking X or outside
  const modals = [loginModal, registerModal].filter(modal => modal !== null);
  modals.forEach(modal => {
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  // Login form submission
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = loginForm.querySelector('#login-email')?.value;
      const password = loginForm.querySelector('#login-password')?.value;

      if (!email || !password) {
        alert("Please enter both email and password");
        return;
      }

      AuthService.login(email, password)
        .then(() => {
          if (loginModal) loginModal.classList.remove('active');
        })
        .catch(error => {
          console.error("Login error:", error);
          alert(`Login failed: ${error.message}`);
        });
    });
  }

  // Register form submission
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = registerForm.querySelector('#register-email')?.value;
      const password = registerForm.querySelector('#register-password')?.value;
      const confirmPassword = registerForm.querySelector('#register-confirm-password')?.value;
      const name = registerForm.querySelector('#register-name')?.value;

      if (password !== confirmPassword) {
        alert("Passwords don't match");
        return;
      }

      try {
        await AuthService.register(email, password, { name, role: 'customer' });
        if (registerModal) registerModal.classList.remove('active');
        alert("Registration successful!");
      } catch (error) {
        console.error("Registration error:", error);
        alert(`Registration failed: ${error.message}`);
      }
    });
  }

  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      AuthService.logout().catch(error => {
        console.error("Logout error:", error);
        alert("Logout failed");
      });
    });
  }

  // Update UI based on auth state
  AuthService.onAuthStateChanged((user) => {
    const guestUI = document.getElementById('guest-buttons');
    const userUI = document.getElementById('user-info');
    const userEmail = document.getElementById('user-email');
    
    if (guestUI) guestUI.style.display = user ? 'none' : 'block';
    if (userUI) userUI.style.display = user ? 'flex' : 'none';
    if (userEmail && user) userEmail.textContent = user.email;
  });
}

// Auto-initialize if auth elements exist
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('login-modal') || document.getElementById('logout-btn')) {
    initAuthUI();
  }
});
