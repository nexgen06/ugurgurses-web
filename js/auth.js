import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseReady } from './auth-config.js';
import { ensureFirebaseBridge, signOutFirebase } from './firebase-auth-bridge.js';
import { signInEkip, signOutEkip } from './ekip-auth.js';

const supabaseClient = isSupabaseReady()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

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

let currentUser = null;

function normalizeUser(user) {
  if (!user) return null;
  return { email: user.email || '', id: user.id, source: 'supabase' };
}

async function syncFirebaseBridge(session) {
  if (!session?.access_token) return;
  const bridge = await ensureFirebaseBridge(session.access_token);
  if (!bridge.ok) {
    console.warn('Firebase köprü uyarısı:', bridge.error);
  }
}

function isLoginPage() {
  const path = window.location.pathname;
  return /\/login\/?$/i.test(path) || path.includes('login.html');
}

function resolvePostLoginRedirect() {
  const returnUrl = localStorage.getItem('auth_return_url');
  if (returnUrl) {
    localStorage.removeItem('auth_return_url');
    return returnUrl;
  }
  const redirect = new URLSearchParams(window.location.search).get('redirect');
  if (redirect === 'phone') return 'phone/index.html';
  if (redirect === 'ekip') return 'ekip/index.html';
  const stored = sessionStorage.getItem('post_login_redirect');
  if (stored) {
    sessionStorage.removeItem('post_login_redirect');
    return stored;
  }
  return null;
}

function wantsPhoneAccess() {
  if (new URLSearchParams(window.location.search).get('redirect') === 'phone') return true;
  return sessionStorage.getItem('post_login_redirect')?.includes('phone') ?? false;
}

async function performSignIn(email, password, options = {}) {
  const requireEkip = options.requireEkip ?? wantsPhoneAccess();
  if (!supabaseClient) throw new Error('supabase_not_configured');
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  const ekip = await signInEkip(email, password);
  if (!ekip.ok) {
    const ekipMsg =
      'Telefon Rehberi oturumu açılamadı. Ekip Supabase (mmahcxmfnuoovgqgvjag) → Authentication → Users bölümünde aynı e-posta ile hesap olmalı.';
    if (requireEkip) throw new Error(ekipMsg);
    console.warn(ekipMsg, ekip.error);
  }
  await syncFirebaseBridge(data.session);
  return normalizeUser(data.user);
}

async function performSignOut() {
  await signOutEkip();
  await signOutFirebase();
  if (supabaseClient) await supabaseClient.auth.signOut();
}

async function sendPasswordReset(email) {
  if (!supabaseClient) throw new Error('Şifre sıfırlama yapılandırılmamış.');
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/index.html`
  });
  if (error) throw error;
}

function mapLoginError(error) {
  const code = typeof error === 'string' ? error : error?.message || '';
  if (String(code).toLowerCase().includes('invalid login credentials')) {
    return 'E-posta veya şifre hatalı.';
  }
  if (String(code).toLowerCase().includes('too many')) {
    return 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.';
  }
  if (code === 'supabase_not_configured') {
    return 'Giriş sistemi yapılandırılmamış.';
  }
  return 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';
}

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
  if (errCenter) {
    errCenter.textContent = '';
    errCenter.classList.remove('visible');
  }
  document.getElementById('loginFormCenter')?.reset();
};

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

function setCurrentUser(user) {
  currentUser = user;
  updateUI(user);
}

authLinks.forEach((authLink) => {
  authLink.addEventListener('click', async (e) => {
    e.preventDefault();
    if (currentUser) {
      try {
        await performSignOut();
        setCurrentUser(null);
      } catch (error) {
        console.error('Çıkış hatası:', error);
      }
    } else if (quickLoginPanel?.classList.contains('open')) {
      hideQuickPanel();
    } else {
      showModal();
    }
  });
});

if (closeModal) closeModal.addEventListener('click', hideModal);

window.addEventListener('click', (e) => {
  if (e.target === loginModal) hideModal();
});

document.querySelector('.btn-open-quick-login')?.addEventListener('click', () => {
  if (loginModal) loginModal.style.display = 'none';
  showQuickPanel();
});

async function handleLoginSubmit(email, password, errorEl, btn, btnIdleHtml) {
  if (errorEl) {
    errorEl.classList.remove('visible');
    errorEl.textContent = '';
  }
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Giriş yapılıyor...</span>';
  }

  try {
    const user = await performSignIn(email, password, { requireEkip: wantsPhoneAccess() });
    setCurrentUser(user);
    hideModal();
    hideCenteredLoginModal();
    showLoginSuccessToast();

    const postLogin = resolvePostLoginRedirect();
    if (isLoginPage()) {
      window.location.replace(postLogin || 'index.html');
      return;
    }
    if (postLogin) {
      window.location.assign(postLogin);
    }
  } catch (error) {
    console.error('Giriş hatası:', error);
    if (errorEl) {
      errorEl.textContent = mapLoginError(error);
      errorEl.classList.add('visible');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = btnIdleHtml;
    }
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput?.value;
    const password = passwordInput?.value;
    const btn = loginForm.querySelector('button[type="submit"]') || loginButton;
    await handleLoginSubmit(
      email,
      password,
      authError,
      btn,
      '<i class="fa-solid fa-arrow-right-to-bracket"></i><span>Giriş Yap</span>'
    );
  });
}

projectCards.forEach((card) => {
  card.addEventListener('click', (e) => {
    if (!currentUser) {
      e.preventDefault();
      showModal();
    }
  });
});

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
    const btn = loginFormCenter.querySelector('.btn-login');
    await handleLoginSubmit(email, password, authErrorCenter, btn, 'Giriş Yap');
  });
}

if (typeof window !== 'undefined' && window.location.search.includes('showLogin=1')) {
  history.replaceState({}, '', window.location.pathname);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showCenteredLoginModal);
  } else {
    showCenteredLoginModal();
  }
}

async function refreshAuthState() {
  if (!supabaseClient) {
    setCurrentUser(null);
    return;
  }
  const { data } = await supabaseClient.auth.getSession();
  if (data.session?.user) {
    await syncFirebaseBridge(data.session);
    setCurrentUser(normalizeUser(data.session.user));
    return;
  }
  setCurrentUser(null);
}

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      await syncFirebaseBridge(session);
      setCurrentUser(normalizeUser(session.user));
    } else {
      await signOutFirebase();
      setCurrentUser(null);
    }
  });
}

refreshAuthState();

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

if (resetModalClose) resetModalClose.addEventListener('click', hideResetModal);

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
      await sendPasswordReset(email);
      setResetMessage(
        'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu (ve gerekiyorsa spam klasörünü) kontrol edin.',
        true
      );
      resetPasswordForm.reset();
    } catch (error) {
      let message = 'Şifre sıfırlama isteği gönderilemedi. Lütfen e-posta adresinizi kontrol edip tekrar deneyin.';
      if (error?.message) message = error.message;
      setResetMessage(message, false);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Sıfırlama bağlantısı gönder';
      }
    }
  });
}
