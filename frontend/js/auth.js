/**
 * auth.js — Sterling Advisory Frontend Auth Module
 * JWT-based login/register with bcrypt password hashing (backend)
 * Falls back to demo mode when no backend is present
 */

const Auth = (() => {
const host = window.location.hostname;

const API =
  (host === 'localhost' || host === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : '/api';  const TOKEN_KEY = 'sterling_token';
  const USER_KEY  = 'sterling_user';

  // ── Show/hide form helpers ──────────────────────────────────────
  function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
  }
  function showLogin() {
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
  }

  // ── Login ───────────────────────────────────────────────────────
  async function login() {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl    = document.getElementById('login-error');

    if (!email || !password) {
      return showError(errEl, 'Please enter email and password');
    }

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const data = await res.json();
        return showError(errEl, data.message || 'Login failed');
      }

      const data = await res.json();
      storeSession(data.token, data.user);
      bootApp(data.user);

    } catch (err) {
      // ── DEMO MODE: backend unavailable ──
      console.warn('Backend unavailable — entering demo mode');
      const demoUser = { name: email.split('@')[0] || 'Demo User', email };
      storeSession('demo-token', demoUser);
      bootApp(demoUser);
    }
  }

  // ── Register ────────────────────────────────────────────────────
  async function register() {
    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const errEl    = document.getElementById('reg-error');

    if (!name || !email || !password) {
      return showError(errEl, 'All fields are required');
    }
    if (password.length < 8) {
      return showError(errEl, 'Password must be at least 8 characters');
    }

    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      if (!res.ok) {
        const data = await res.json();
        return showError(errEl, data.message || 'Registration failed');
      }

      const data = await res.json();
      storeSession(data.token, data.user);
      bootApp(data.user);

    } catch (err) {
      // ── DEMO MODE ──
      console.warn('Backend unavailable — entering demo mode');
      const demoUser = { name, email };
      storeSession('demo-token', demoUser);
      bootApp(demoUser);
    }
  }

  // ── Logout ──────────────────────────────────────────────────────
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.getElementById('app').classList.add('hidden');
    document.getElementById('auth-overlay').style.display = 'flex';
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    showLogin();
  }

  // ── Session helpers ─────────────────────────────────────────────
  function storeSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); }
    catch { return null; }
  }

  // ── Boot App ────────────────────────────────────────────────────
  function bootApp(user) {
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('app').classList.remove('hidden');

    // Set avatar initial
    const initial = (user.name || 'U')[0].toUpperCase();
    document.getElementById('user-avatar').textContent = initial;

    // Show tax banner
    const banner = document.getElementById('tax-banner');
    if (banner) {
      banner.classList.remove('hidden');
      setTimeout(() => banner.classList.add('hidden'), 8000);
    }

    // Init modules
    if (typeof Dashboard !== 'undefined') Dashboard.init();
  }

  // ── Check existing session ──────────────────────────────────────
  function checkSession() {
    const token = getToken();
    const user  = getUser();
    if (token && user) {
      bootApp(user);
    }
  }

  function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
  }

  return { login, register, logout, showLogin, showRegister, getToken, getUser, checkSession };
})();

// ── Auto-check session on load ──
window.addEventListener('DOMContentLoaded', () => {
  Auth.checkSession();
});