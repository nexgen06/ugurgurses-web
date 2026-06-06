import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDkEVYHW6isG3Ga_ZixMNW8KUQfLefSeyM",
  authDomain: "mulakat-takip-sistemi.firebaseapp.com",
  projectId: "mulakat-takip-sistemi",
  storageBucket: "mulakat-takip-sistemi.firebasestorage.app",
  messagingSenderId: "1050671861081",
  appId: "1:1050671861081:web:1e41fc9305731961809048"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM Elements
const authLinks = document.querySelectorAll('.auth-link');
const loginModal = document.getElementById('loginModal');
const quickLoginPanel = document.getElementById('quickLoginPanel');
const closeModal = document.querySelector('.close-modal');
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authError = document.getElementById('authError');
const loginButton = document.querySelector('.btn-quick-login');
const projectCards = document.querySelectorAll('.project-card-h');

// State
let currentUser = null;

// Hızlı giriş paneli
const showQuickPanel = () => {
  if (!quickLoginPanel) return;
  quickLoginPanel.classList.add('open');
  quickLoginPanel.setAttribute('aria-hidden', 'false');
  const authLink = document.getElementById('authLink');
  if (authLink) authLink.setAttribute('aria-expanded', 'true');
  setTimeout(() => emailInput?.focus(), 100);
};

const hideQuickPanel = () => {
  if (!quickLoginPanel) return;
  quickLoginPanel.classList.remove('open');
  quickLoginPanel.setAttribute('aria-hidden', 'true');
  const authLink = document.getElementById('authLink');
  if (authLink) authLink.setAttribute('aria-expanded', 'false');
  if (authError) authError.textContent = '';
  loginForm?.reset();
};

// Ortada giriş modalı (çıkış sonrası anasayfada)
const showCenteredLoginModal = () => {
  if (!loginModal) return;
  loginModal.style.display = 'flex';
  loginModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('emailCenter')?.focus(), 100);
};

const hideCenteredLoginModal = () => {
  if (!loginModal) return;
  loginModal.style.display = 'none';
  loginModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  const errCenter = document.getElementById('authErrorCenter');
  if (errCenter) { errCenter.textContent = ''; errCenter.classList.remove('visible'); }
  document.getElementById('loginFormCenter')?.reset();
};

// UI Helper Functions – asıl giriş hızlı panelde
const showModal = () => {
  showQuickPanel();
  if (loginModal) loginModal.style.display = 'none';
};

const hideModal = () => {
  hideCenteredLoginModal();
  hideQuickPanel();
};

function showLoginSuccessToast() {
  const toast = document.createElement('div');
  toast.className = 'login-success-toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = '<i class="fa-solid fa-face-smile-beam" aria-hidden="true"></i> Giriş başarılı';
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function formatWelcomeEmail(email) {
  if (!email) return '';
  const at = email.indexOf('@');
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length > 12) return local.slice(0, 10) + '…' + domain;
  return email;
}

const updateUI = (user) => {
  const welcomeItem = document.getElementById('welcomeItem');
  const welcomeEmail = document.getElementById('welcomeEmail');

  if (user) {
    document.body.classList.add('user-logged-in');
    if (welcomeItem && welcomeEmail) {
      welcomeEmail.textContent = formatWelcomeEmail(user.email || '');
      welcomeItem.hidden = false;
    }
  } else {
    document.body.classList.remove('user-logged-in');
    if (welcomeItem) welcomeItem.hidden = true;
    if (welcomeEmail) welcomeEmail.textContent = '';
  }

  authLinks.forEach((el) => {
    if (user) {
      el.classList.add('logged-in');
      el.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> <span>Çıkış Yap</span>';
      el.setAttribute('title', `Giriş yapıldı: ${user.email || ''}`);
    } else {
      el.classList.remove('logged-in');
      el.innerHTML = 'Giriş Yap';
      el.removeAttribute('title');
    }
  });
};

// Event Listeners

// 1. Auth Link (Login/Logout) – tıklanınca panel aç/kapa
authLinks.forEach(authLink => {
  authLink.addEventListener('click', async (e) => {
    e.preventDefault();
    if (currentUser) {
      try {
        await signOut(auth);
        console.log("Çıkış yapıldı");
      } catch (error) {
        console.error("Çıkış hatası:", error);
      }
    } else {
      if (quickLoginPanel?.classList.contains('open')) hideQuickPanel();
      else showModal();
    }
  });
});

// 2. Modal / panel kapatma
if (closeModal) {
  closeModal.addEventListener('click', hideModal);
}

window.addEventListener('click', (e) => {
  if (e.target === loginModal) hideModal();
});

document.querySelector('.btn-open-quick-login')?.addEventListener('click', () => {
  if (loginModal) loginModal.style.display = 'none';
  showQuickPanel();
});

// 3. Login Form Submission
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput?.value;
    const password = passwordInput?.value;
    const btn = loginForm.querySelector('button[type="submit"]') || loginButton;

    if (authError) {
      authError.classList.remove('visible');
      authError.textContent = '';
    }
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Giriş yapılıyor...</span>';
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Giriş başarılı:", userCredential.user);
      hideModal();
      hideCenteredLoginModal();
      showLoginSuccessToast();

      // login.html sayfasındaysak yönlendirme yap
      if (window.location.pathname.includes('login.html')) {
        const returnUrl = localStorage.getItem('auth_return_url');
        if (returnUrl) {
          localStorage.removeItem('auth_return_url');
          window.location.replace(returnUrl);
          return;
        }
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        if (redirect === 'phone') {
          window.location.replace('phone/index.html');
        } else {
          window.location.replace('ekip/index.html');
        }
      }
    } catch (error) {
      console.error("Giriş hatası:", error);

      let message = "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = "E-posta veya şifre hatalı.";
      } else if (error.code === 'auth/too-many-requests') {
        message = "Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.";
      }
      if (authError) {
        authError.textContent = message;
        authError.classList.add('visible');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i><span>Giriş Yap</span>';
      }
    }
  });
}

// 4. Proje kartı koruması: giriş yoksa giriş paneli aç
projectCards.forEach((card) => {
  card.addEventListener('click', (e) => {
    if (!currentUser) {
      e.preventDefault();
      showModal();
    }
  });
});

// Ortadaki giriş formu (çıkış sonrası anasayfa)
const loginFormCenter = document.getElementById('loginFormCenter');
const emailCenter = document.getElementById('emailCenter');
const passwordCenter = document.getElementById('passwordCenter');
const authErrorCenter = document.getElementById('authErrorCenter');

if (loginFormCenter) {
  loginFormCenter.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailCenter?.value;
    const password = passwordCenter?.value;
    if (!email || !password) return;
    if (authErrorCenter) { authErrorCenter.textContent = ''; authErrorCenter.classList.remove('visible'); }
    const btn = loginFormCenter.querySelector('.btn-login');
    if (btn) { btn.disabled = true; btn.textContent = 'Giriş yapılıyor...'; }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      hideCenteredLoginModal();
      showLoginSuccessToast();
    } catch (error) {
      let message = "E-posta veya şifre hatalı.";
      if (error.code === 'auth/too-many-requests') message = "Çok fazla deneme. Daha sonra tekrar deneyin.";
      if (authErrorCenter) { authErrorCenter.textContent = message; authErrorCenter.classList.add('visible'); }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Giriş Yap'; }
    }
  });
}

// Çıkış sonrası anasayfada ?showLogin=1 ile gelindiyse ortada giriş aç
if (typeof window !== 'undefined' && window.location.search.includes('showLogin=1')) {
  history.replaceState({}, '', window.location.pathname);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showCenteredLoginModal);
  } else {
    showCenteredLoginModal();
  }
}

// Auth State Observer
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  console.log("Auth State Changed:", user ? user.email : "Logged Out");
  updateUI(user);
});

// ---------- Şifre sıfırlama (login.html sayfasında) ----------
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const resetPasswordModal = document.getElementById('resetPasswordModal');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const resetEmailInput = document.getElementById('resetEmail');
const resetPasswordMessage = document.getElementById('resetPasswordMessage');
const resetModalClose = document.getElementById('resetModalClose');

function showResetModal() {
  if (!resetPasswordModal) return;
  resetPasswordModal.classList.add('open');
  resetPasswordModal.setAttribute('aria-hidden', 'false');
  if (resetPasswordMessage) {
    resetPasswordMessage.textContent = '';
    resetPasswordMessage.className = 'error-message';
    resetPasswordMessage.style.display = 'none';
  }
  resetPasswordForm?.reset();
  setTimeout(() => resetEmailInput?.focus(), 100);
}

function hideResetModal() {
  if (!resetPasswordModal) return;
  resetPasswordModal.classList.remove('open');
  resetPasswordModal.setAttribute('aria-hidden', 'true');
}

function setResetMessage(text, isSuccess) {
  if (!resetPasswordMessage) return;
  resetPasswordMessage.textContent = text;
  resetPasswordMessage.className = isSuccess ? 'success-message' : 'error-message visible';
  resetPasswordMessage.style.display = 'block';
}

if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    showResetModal();
  });
}

if (resetModalClose) {
  resetModalClose.addEventListener('click', hideResetModal);
}

if (resetPasswordModal) {
  resetPasswordModal.addEventListener('click', (e) => {
    if (e.target === resetPasswordModal) hideResetModal();
  });
}

if (resetPasswordForm) {
  resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = resetEmailInput?.value?.trim();
    if (!email) return;

    if (resetPasswordMessage) {
      resetPasswordMessage.textContent = '';
      resetPasswordMessage.className = 'error-message';
      resetPasswordMessage.style.display = 'none';
    }

    const btn = resetPasswordForm.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Gönderiliyor...';
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu (ve gerekiyorsa spam klasörünü) kontrol edin.', true);
      resetPasswordForm.reset();
    } catch (error) {
      let message = 'Şifre sıfırlama isteği gönderilemedi. Lütfen e-posta adresinizi kontrol edip tekrar deneyin.';
      if (error.code === 'auth/user-not-found') {
        message = 'Bu e-posta adresi sistemde kayıtlı değil.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Geçerli bir e-posta adresi girin.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Çok fazla istek. Lütfen daha sonra tekrar deneyin.';
      } else if (error.message) {
        message = error.message;
      }
      setResetMessage(message, false);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Sıfırlama bağlantısı gönder';
      }
    }
  });
}
