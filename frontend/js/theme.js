/**
 * theme.js — Sterling Advisory Theme Engine
 * Smooth 300ms interpolated dark/light mode toggle
 */

const Theme = (() => {
  const KEY = 'sterling_theme';

  function apply(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem(KEY, mode);
    const btn = document.getElementById('theme-btn');
    const icon = document.getElementById('theme-icon');
    if (mode === 'dark') {
      if (icon) icon.textContent = '☀️';
      if (btn) btn.childNodes[1].textContent = ' Light Mode';
    } else {
      if (icon) icon.textContent = '🌙';
      if (btn) btn.childNodes[1].textContent = ' Dark Mode';
    }
    // Re-render any active charts to match new theme
    if (typeof Charts !== 'undefined') Charts.rerender();
  }

  function toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    apply(current === 'light' ? 'dark' : 'light');
  }

  function init() {
    const saved = localStorage.getItem(KEY) || 'dark';
    apply(saved);
  }

  return { toggle, init, apply };
})();

// Init on load
Theme.init();

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
