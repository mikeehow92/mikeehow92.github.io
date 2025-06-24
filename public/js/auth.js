import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
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

// Initialize Firebase with duplicate check
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    app = getApp();
  } else {
    console.error("Firebase initialization error", error);
    throw error;
  }
}

const auth = getAuth(app);
const db = getFirestore(app);

// ==================== AUTHENTICATION SERVICE ====================

export const AuthService = {
  getCurrentUser: () => auth.currentUser,

  login: (email, password) => signInWithEmailAndPassword(auth, email, password),

  logout: () => signOut(auth),

  onAuthStateChanged: (callback) => onAuthStateChanged(auth, callback),

  changePassword: async (currentPassword, newPassword) => {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");
    
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    return await updatePassword(user, newPassword);
  },

  register: async (email, password, userData) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        ...userData,
        createdAt: serverTimestamp(),
        email: user.email
      });

      return user;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  },

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

export function initAuthUI() {
  const loginModal = document.getElementById('login-modal');
  const loginForm = document.getElementById('login-form');
  const logoutBtn = document.getElementById('logout-btn');

  // Open login modal
  const openLoginBtn = document.getElementById('open-login-btn');
  if (openLoginBtn && loginModal) {
    openLoginBtn.addEventListener('click', () => {
      loginModal.classList.add('active');
    });
  }

  // Close modal
  if (loginModal) {
    const closeBtn = loginModal.querySelector('.close-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => loginModal.classList.remove('active'));
    }

    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) loginModal.classList.remove('active');
    });
  }

  // Login form
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = loginForm.querySelector('#login-email')?.value;
      const password = loginForm.querySelector('#login-password')?.value;

      AuthService.login(email, password)
        .then(() => loginModal?.classList.remove('active'))
        .catch(error => alert(`Error: ${error.message}`));
    });
  }

  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => AuthService.logout());
  }

  // Update UI based on auth state
  AuthService.onAuthStateChanged((user) => {
    const guestUI = document.getElementById('guest-buttons');
    const userUI = document.getElementById('user-info');
    
    if (guestUI) guestUI.style.display = user ? 'none' : 'flex';
    if (userUI) {
      userUI.style.display = user ? 'flex' : 'none';
      if (user) document.getElementById('user-email')?.textContent = user.email;
    }
  });
}

// Auto-initialize if auth elements exist
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('login-modal') || document.getElementById('logout-btn')) {
    initAuthUI();
  }
});
