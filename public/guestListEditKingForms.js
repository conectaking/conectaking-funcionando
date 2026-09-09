/**
 * Editor Lista de Convidados no layout KingForms.
 * O ficheiro dedicado estava em falta; reutiliza formPageEdit.js + integração.
 */
(function () {
  'use strict';
  window.currentFormIsGuestList = true;

  function appendScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Falha ao carregar ' + src)); };
      document.body.appendChild(s);
    });
  }

  function ensureHiddenGuestFlag() {
    var el = document.getElementById('is-guest-list-mode');
    if (!el) {
      el = document.createElement('input');
      el.type = 'hidden';
      el.id = 'is-guest-list-mode';
      el.value = 'true';
      document.body.appendChild(el);
    } else {
      el.value = 'true';
    }
  }

  ensureHiddenGuestFlag();

  appendScript('formPageEdit.js?v=guest-list-bridge')
    .then(function () {
      return appendScript('guestListEditKingFormsIntegration.js?v=1');
    })
    .catch(function (err) {
      console.error('[guestListEditKingForms]', err);
      var box = document.createElement('div');
      box.style.cssText = 'position:fixed;inset:auto 16px 16px 16px;z-index:99999;padding:14px 16px;background:#7f1d1d;color:#fff;border-radius:10px;font:14px/1.4 system-ui';
      box.textContent = 'Não foi possível carregar o editor da lista. Recarregue a página.';
      document.body.appendChild(box);
    });
})();
