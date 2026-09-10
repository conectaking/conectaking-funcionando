/** conviteEdit — Vite entry (extracted inline) */
import '@mod/js/ck-auth-gate.js';
import '@mod/js/ck-csrf.js';

(async function() {
  if (!(await window.CkAuth.requireAuth('/login?returnUrl=' + encodeURIComponent(location.href)))) return;

  const API = (window.API_URL || window.API_BASE || window.location.origin).replace(/\/$/, '');
  const qs = new URLSearchParams(location.search);
  const itemId = qs.get('itemId');
  const token = window.CkAuth.lsToken();
  if (!itemId) {
    document.getElementById('err').textContent = 'Informe itemId na URL (/conviteEdit?itemId=123)';
    document.getElementById('err').classList.add('show');
    return;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;

  const __rawFetch = window.fetch.bind(window);
  function fetch(url, init) {
    try {
      var __m = (init.method || 'GET').toUpperCase();
      if (__m === 'POST' || __m === 'PUT' || __m === 'PATCH' || __m === 'DELETE') {
        if (window.CkCsrf && typeof window.CkCsrf.attachToHeaders === 'function') {
          init.headers = window.CkCsrf.attachToHeaders(init.headers, __m);
        } else {
          var __cm = document.cookie.match(/(?:^|; )ck_csrf=([^;]*)/);
          var __csrf = __cm ? decodeURIComponent(__cm[1]) : '';
          if (__csrf) {
            var __h = Object.assign({}, init.headers || {});
            if (!__h['X-CK-CSRF']) __h['X-CK-CSRF'] = __csrf;
            init.headers = __h;
          }
        }
      }
    } catch (__e) {}

    return __rawFetch(url, Object.assign({ credentials: 'include' }, init || {}));
  }

  function showErr(msg) {
    const el = document.getElementById('err');
    el.textContent = msg || '';
    el.classList.toggle('show', !!msg);
    document.getElementById('ok').classList.remove('show');
  }
  function showOk(msg) {
    document.getElementById('ok').textContent = msg || 'Salvo!';
    document.getElementById('ok').classList.add('show');
    document.getElementById('err').classList.remove('show');
  }

  const fields = ['titulo','subtitulo','texto_abrir','subtitulo_extra','texto_pagina_2','data_dia','data_mes','data_ano','dia_semana','hora','local_nome','local_endereco','local_maps_url','dress_code','rsvp_url','rsvp_label','som_habilitado','audio_url','imagem_envelope_url','imagem_fundo_url','imagem_selo_url','cor_primaria','cor_secundaria','tema','mostrar_contagem_regressiva','share_habilitado','calendar_habilitado'];
  let lastPreviewUrl = '';

  function setFileInfo(id, url) {
    var el = document.getElementById(id);
    if (!el) return;
    if (url) {
      var name = url.split('/').pop().split('?')[0] || 'Arquivo carregado';
      el.textContent = name.length > 30 ? name.slice(0, 27) + '—' : name;
    } else el.textContent = '';
  }

  async function load() {
    try {
      const res = await fetch(API + '/api/convite/config/' + itemId, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showErr(data.message || 'Erro ao carregar'); return; }
      const c = data.data || data;
      fields.forEach(function(k) {
        const el = document.getElementById(k);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!c[k];
        else if (c[k] != null) el.value = c[k];
      });
      setFileInfo('info_audio', c.audio_url);
      setFileInfo('info_envelope', c.imagem_envelope_url);
      setFileInfo('info_selo', c.imagem_selo_url);
      setFileInfo('info_fundo', c.imagem_fundo_url);
      document.getElementById('view_count').textContent = c.view_count || 0;
      const statsRes = await fetch(API + '/api/convite/stats/' + itemId, { headers });
      const statsData = await statsRes.json().catch(() => ({}));
      if (statsData.data) {
        document.getElementById('view_count').textContent = statsData.data.view_count || 0;
        document.getElementById('views_7').textContent = statsData.data.views_last_7_days || 0;
      }
    } catch (e) {
      showErr('Falha ao carregar: ' + (e.message || ''));
    }
  }

  async function uploadImage(file, setUrl, setInfo) {
    var fd = new FormData();
    fd.append('image', file);
    var r = await fetch(API + '/api/upload/image', { method: 'POST', headers: token ? { 'Authorization': 'Bearer ' + token } : {}, body: fd });
    var d = await r.json().catch(function() { return {}; });
    if (!r.ok) { showErr(d.message || 'Erro ao enviar imagem'); return; }
    var url = (d.url || d.imageUrl || d.data && d.data.url) || '';
    if (url) { setUrl(url); setInfo(url); showOk('Imagem enviada.'); }
  }
  async function uploadAudioFile(file, setUrl, setInfo) {
    var fd = new FormData();
    fd.append('file', file);
    var r = await fetch(API + '/api/convite/upload-audio', { method: 'POST', headers: token ? { 'Authorization': 'Bearer ' + token } : {}, body: fd });
    var d = await r.json().catch(function() { return {}; });
    if (!r.ok) { showErr(d.message || (d.error && d.error.message) || 'Erro ao enviar áudio'); return; }
    var url = (d.data && d.data.url) || d.url || '';
    if (url) { setUrl(url); setInfo(url); showOk('Ãudio enviado.'); }
  }
  function bindUpload(fileId, btnId, infoId, urlId, isAudio) {
    var fileEl = document.getElementById(fileId);
    var btn = document.getElementById(btnId);
    var urlEl = document.getElementById(urlId);
    if (!fileEl || !btn || !urlEl) return;
    btn.addEventListener('click', function() { fileEl.click(); });
    fileEl.addEventListener('change', function() {
      var f = fileEl.files && fileEl.files[0];
      if (!f) return;
      if (isAudio) uploadAudioFile(f, function(u) { urlEl.value = u; }, function(u) { document.getElementById(infoId).textContent = f.name; });
      else uploadImage(f, function(u) { urlEl.value = u; }, function(u) { document.getElementById(infoId).textContent = f.name; });
      fileEl.value = '';
    });
  }
  bindUpload('file_audio', 'btn-import-audio', 'info_audio', 'audio_url', true);
  bindUpload('file_envelope', 'btn-import-envelope', 'info_envelope', 'imagem_envelope_url', false);
  bindUpload('file_selo', 'btn-import-selo', 'info_selo', 'imagem_selo_url', false);
  bindUpload('file_fundo', 'btn-import-fundo', 'info_fundo', 'imagem_fundo_url', false);

  document.getElementById('btn-save').addEventListener('click', async function() {
    const payload = {};
    fields.forEach(function(k) {
      const el = document.getElementById(k);
      if (!el) return;
      if (el.type === 'checkbox') payload[k] = el.checked;
      else payload[k] = el.value.trim();
    });
    payload.data_dia = payload.data_dia ? parseInt(payload.data_dia, 10) : null;
    payload.data_ano = payload.data_ano ? parseInt(payload.data_ano, 10) : null;
    try {
      const res = await fetch(API + '/api/convite/config/' + itemId, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showErr(data.message || 'Erro ao salvar'); return; }
      showOk('Convite salvo com sucesso.');
      load();
    } catch (e) {
      showErr('Falha ao salvar: ' + (e.message || ''));
    }
  });

  document.getElementById('btn-preview').addEventListener('click', async function() {
    try {
      const res = await fetch(API + '/api/convite/preview-link?itemId=' + itemId, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showErr(data.message || (data.error && data.error.message) || 'Erro'); return; }
      const url = (data.data && data.data.preview_url) || data.preview_url;
      if (url) {
        lastPreviewUrl = url;
        document.getElementById('preview_url').innerHTML = '<a href="' + url + '" target="_blank" rel="noopener" style="color:#facc15">' + url + '</a>';
        showOk('Link de preview gerado. Clique em "Ver preview" para ver ao lado.');
      }
    } catch (e) {
      showErr(e.message || 'Erro');
    }
  });

  document.getElementById('btn-ver-preview').addEventListener('click', function() {
    if (lastPreviewUrl) {
      document.getElementById('preview-placeholder').style.display = 'none';
      var ifr = document.getElementById('preview-iframe');
      ifr.style.display = 'block';
      ifr.src = lastPreviewUrl;
    } else {
      showErr('Gere o link de preview primeiro (botão "Gerar link de preview").');
    }
  });

  load();
})();
