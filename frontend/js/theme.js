/* GRC Flow — Theme Manager
   Carregado no <head> para evitar flash de tema errado (FOUC) */
(function () {
  var saved = localStorage.getItem('grc_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
})();

var ThemeManager = {
  get: function () {
    return localStorage.getItem('grc_theme') || 'light';
  },

  set: function (theme) {
    localStorage.setItem('grc_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    ThemeManager._updateButtons(theme);
  },

  toggle: function () {
    ThemeManager.set(ThemeManager.get() === 'dark' ? 'light' : 'dark');
  },

  _updateButtons: function (theme) {
    document.querySelectorAll('[data-theme-value]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-theme-value') === theme);
    });
  },

  init: function () {
    ThemeManager._updateButtons(ThemeManager.get());
  }
};

document.addEventListener('DOMContentLoaded', function () {
  ThemeManager.init();
});
