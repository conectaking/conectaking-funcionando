import '../../css/fonts.css';
import '../vendor-globals.js';

(async function() {
      const galleryId = window.__CK_BOOT_KS_CONFIG_FINALIZACAO.j0;
      const apiBase = window.__CK_BOOT_KS_CONFIG_FINALIZACAO.j1;
      const params = new URLSearchParams(window.location.search);
      let token = null;
      if (typeof localStorage !== 'undefined') {
        token = localStorage.getItem('conectaKingToken') || localStorage.getItem('conectaking_token') || localStorage.getItem('token') || localStorage.getItem('jwt');
      }
      if (!token) {
        const m = /(?:^|;\s*)token=([^;]+)/.exec(document.cookie || '');
        if (m) {
          try { token = decodeURIComponent(m[1]); } catch (_) { token = m[1]; }
        }
      }
      if (params.has('token')) {
        try { window.history.replaceState({}, '', window.location.pathname + window.location.hash); } catch (_) {}
      }
      if (!token) {
        try {
          const probe = await fetch('/api/account/status', { credentials: 'include', headers: { Accept: 'application/json' }, cache: 'no-store' });
          if (!probe.ok) {
            document.getElementById('msgErro').textContent = 'Sessão não encontrada. Abra esta página pelo painel King Selection (após login).';
            document.getElementById('msgErro').classList.remove('hidden');
          }
        } catch (_) {
          document.getElementById('msgErro').textContent = 'Sessão não encontrada. Abra esta página pelo painel King Selection (após login).';
          document.getElementById('msgErro').classList.remove('hidden');
        }
      }

      function authHeaders() {
        const h = { 'Accept': 'application/json' };
        if (token) h['Authorization'] = 'Bearer ' + token;
        return h;
      }

      function authHeadersJson() {
        const h = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (token) h['Authorization'] = 'Bearer ' + token;
        return h;
      }

      document.getElementById('btnVoltar').addEventListener('click', function(e) {
        e.preventDefault();
        if (document.referrer && document.referrer.indexOf(window.location.host) >= 0) {
          window.history.back();
        } else {
          window.close();
        }
      });

      function hideMessages() {
        document.getElementById('msgSucesso').classList.add('hidden');
        document.getElementById('msgErro').classList.add('hidden');
      }

      function showPreview(url) {
        const wrap = document.getElementById('thank_you_preview_wrap');
        const img = document.getElementById('thank_you_preview');
        const btnRemover = document.getElementById('btnRemoverLogo');
        if (url) {
          img.src = url;
          wrap.classList.remove('hidden');
          btnRemover.style.display = 'inline-flex';
        } else {
          img.removeAttribute('src');
          wrap.classList.add('hidden');
          btnRemover.style.display = 'none';
        }
      }

      async function load() {
        try {
          const r = await fetch(apiBase + '/galleries/' + galleryId, { credentials: 'include', headers: authHeaders() });
          if (!r.ok) throw new Error('Falha ao carregar');
          const data = await r.json();
          const g = data.gallery || data;
          document.getElementById('thank_you_photographer_name').value = g.thank_you_photographer_name || '';
          document.getElementById('thank_you_title').value = g.thank_you_title || 'Obrigado!';
          document.getElementById('thank_you_message').value = g.thank_you_message || '';
          showPreview(g.thank_you_image_url || null);
        } catch (e) {
          document.getElementById('msgErro').textContent = e.message || 'Erro ao carregar dados.';
          document.getElementById('msgErro').classList.remove('hidden');
        }
      }

      document.getElementById('thank_you_file').addEventListener('change', async function() {
        const file = this.files && this.files[0];
        if (!file) return;
        hideMessages();
        const btn = document.getElementById('btnEnviarLogo');
        btn.disabled = true;
        btn.textContent = 'Enviando...';
        try {
          const form = new FormData();
          form.append('file', file);
          const r = await fetch(apiBase + '/galleries/' + galleryId + '/thank-you-image', {
            method: 'POST',
            credentials: 'include',
            headers: authHeaders(),
            body: form
          });
          const data = await r.json().catch(function() { return {}; });
          if (!r.ok) throw new Error(data.message || 'Falha ao enviar');
          showPreview(data.thank_you_image_url || null);
          document.getElementById('msgSucesso').textContent = 'Logo enviada com sucesso.';
          document.getElementById('msgSucesso').classList.remove('hidden');
          document.getElementById('thank_you_file').value = '';
        } catch (err) {
          document.getElementById('msgErro').textContent = err.message || 'Erro ao enviar logo.';
          document.getElementById('msgErro').classList.remove('hidden');
        }
        btn.disabled = false;
        btn.textContent = 'Enviar logo';
      });

      document.getElementById('btnEnviarLogo').addEventListener('click', function() {
        document.getElementById('thank_you_file').click();
      });

      document.getElementById('btnRemoverLogo').addEventListener('click', async function() {
        hideMessages();
        const btn = document.getElementById('btnRemoverLogo');
        btn.disabled = true;
        try {
          const r = await fetch(apiBase + '/galleries/' + galleryId, {
            method: 'PUT',
            credentials: 'include',
            headers: authHeadersJson(),
            body: JSON.stringify({ thank_you_image_url: null })
          });
          const data = await r.json().catch(function() { return {}; });
          if (!r.ok) throw new Error(data.message || 'Falha ao remover');
          showPreview(null);
          document.getElementById('msgSucesso').textContent = 'Logo removida.';
          document.getElementById('msgSucesso').classList.remove('hidden');
        } catch (err) {
          document.getElementById('msgErro').textContent = err.message || 'Erro ao remover.';
          document.getElementById('msgErro').classList.remove('hidden');
        }
        btn.disabled = false;
      });

      document.getElementById('formFinalizacao').addEventListener('submit', async function(e) {
        e.preventDefault();
        hideMessages();
        const btn = document.getElementById('btnSalvar');
        btn.disabled = true;
        btn.textContent = 'Salvando...';
        try {
          const body = {
            thank_you_photographer_name: document.getElementById('thank_you_photographer_name').value.trim() || null,
            thank_you_title: document.getElementById('thank_you_title').value.trim() || null,
            thank_you_message: document.getElementById('thank_you_message').value.trim() || null
          };
          const r = await fetch(apiBase + '/galleries/' + galleryId, {
            method: 'PUT',
            credentials: 'include',
            headers: authHeadersJson(),
            body: JSON.stringify(body)
          });
          const data = await r.json().catch(function() { return {}; });
          if (!r.ok) {
            throw new Error(data.message || 'Falha ao salvar');
          }
          document.getElementById('msgSucesso').textContent = 'Mensagem de finalização salva com sucesso.';
          document.getElementById('msgSucesso').classList.remove('hidden');
        } catch (err) {
          document.getElementById('msgErro').textContent = err.message || 'Erro ao salvar.';
          document.getElementById('msgErro').classList.remove('hidden');
        }
        btn.disabled = false;
        btn.textContent = 'Salvar mensagem de finalização';
      });

      load();
    })();
