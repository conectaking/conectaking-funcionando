/** kingDocsShare — Vite entry (extracted inline) */
(function () {
      try {
        var params = new URLSearchParams(window.location.search || '');
        var host = (window.location.hostname || 'localhost').toLowerCase();
        var isLocalHost = host === 'localhost' || host === '127.0.0.1';
        var isProdHost = host === 'conectaking.com.br' || host.endsWith('.conectaking.com.br') || host === 'cnking.bio' || host === 'www.cnking.bio';
        var wantLocal =
          !isProdHost && (
            (params.get('api') || '').toLowerCase() === 'local' ||
            (typeof localStorage !== 'undefined' && localStorage.getItem('useLocalApi') === 'true')
          );
        var localApiBase = window.location.origin || ('http://' + host + ':8080');
        var prodApiBase = isProdHost ? (window.location.origin || 'https://www.conectaking.com.br') : 'https://www.conectaking.com.br';
        window.API_BASE = wantLocal && isLocalHost ? localApiBase : (isProdHost ? prodApiBase : (wantLocal ? localApiBase : prodApiBase));
        if (isProdHost) window.API_BASE = window.location.origin || prodApiBase;
        window.API_URL = window.API_BASE;
        if (isProdHost) {
          try { localStorage.removeItem('useLocalApi'); } catch (e) {}
        }
      } catch (e) {
        window.API_BASE = window.API_BASE || window.API_URL || 'https://www.conectaking.com.br';
        window.API_URL = window.API_URL || window.API_BASE;
      }
    })();

(function(){
  function apiBase() {
    if (typeof window.API_BASE === 'string' && window.API_BASE) return window.API_BASE.replace(/\/$/, '');
    if (typeof window.API_URL === 'string' && window.API_URL) return window.API_URL.replace(/\/$/, '');
    return '';
  }
  function api(path) { return apiBase() + path; }

  const params = new URLSearchParams(window.location.search);
  const token = params.get('t') || '';
  const storageKey = 'kingDocsViewer_' + token;

  function getViewer() {
    try { return sessionStorage.getItem(storageKey) || ''; } catch (e) { return ''; }
  }
  function setViewer(v) {
    try { sessionStorage.setItem(storageKey, v); } catch (e) {}
  }

  function headersJson() {
    const h = { 'Content-Type': 'application/json' };
    const v = getViewer();
    if (v) h['X-King-Docs-Viewer'] = v;
    try {
      if (sessionStorage.getItem('kingDocsRepeat_' + token) === '1') {
        h['X-King-Docs-Repeat-Visit'] = '1';
      }
    } catch (e) {}
    return h;
  }
  function headersDl() {
    const h = {};
    const v = getViewer();
    if (v) h['X-King-Docs-Viewer'] = v;
    try {
      if (sessionStorage.getItem('kingDocsRepeat_' + token) === '1') {
        h['X-King-Docs-Repeat-Visit'] = '1';
      }
    } catch (e) {}
    return h;
  }

  const root = document.getElementById('root');
  const toastEl = document.getElementById('kd-toast');
  var toastTimer = null;
  function showToast(msg, isErr) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.toggle('kd-toast--err', !!isErr);
    toastEl.classList.add('kd-toast--show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      toastEl.classList.remove('kd-toast--show');
    }, 2600);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function normShareKey(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  }
  function isFotoPessoalLabel(label) {
    var n = normShareKey(label);
    return n === 'foto pessoal' || n.indexOf('foto pessoal') === 0;
  }
  function isFotoPessoalFileMeta(file) {
    if (!file) return false;
    var dt = normShareKey(file.docType || '');
    return dt === 'foto pessoal' || dt.indexOf('foto pessoal') >= 0;
  }
  /** Foto do cartão de visita: campo dedicado ou «Foto pessoal» incluída no link */
  function resolveProfileFileId(snap) {
    var pid = snap.profileImageFileId != null ? parseInt(snap.profileImageFileId, 10) : null;
    if (pid && Number.isFinite(pid)) return pid;
    var found = null;
    (snap.sections || []).forEach(function (sec) {
      (sec.rows || []).forEach(function (row) {
        if (found) return;
        if (!row.file || !row.file.id) return;
        var mime = String(row.file.mime || '').toLowerCase();
        if (isFotoPessoalFileMeta(row.file) || (isFotoPessoalLabel(row.label) && mime.indexOf('image/') === 0)) {
          found = row.file.id;
        }
      });
    });
    if (found) return found;
    (snap.extraDocs || []).forEach(function (ed) {
      if (found) return;
      if (!ed.id) return;
      var mime = String(ed.mime || '').toLowerCase();
      if (isFotoPessoalLabel(ed.label) && mime.indexOf('image/') === 0) found = ed.id;
    });
    return found;
  }
  function shouldHideRowForProfile(row, profileFid) {
    if (!profileFid) return false;
    if (row.file && row.file.id === profileFid) return true;
    if (isFotoPessoalFileMeta(row.file) || isFotoPessoalLabel(row.label)) return true;
    return false;
  }
  function shouldHideExtraForProfile(ed, profileFid) {
    if (!profileFid) return false;
    if (ed.id === profileFid) return true;
    if (isFotoPessoalLabel(ed.label)) return true;
    return false;
  }
  function loadShareAvatar(fileId) {
    var slot = document.getElementById('kd-profile-top-img');
    if (!slot || !fileId) return;
    fetch(api('/api/king-docs/public/' + encodeURIComponent(token) + '/file/' + fileId), { headers: headersDl() })
      .then(function (r) { return r.ok ? r.blob() : null; })
      .then(function (blob) {
        if (!blob || String(blob.type || '').toLowerCase().indexOf('image/') !== 0) return;
        var im = document.createElement('img');
        im.src = URL.createObjectURL(blob);
        im.alt = 'Foto de perfil';
        slot.innerHTML = '';
        slot.appendChild(im);
      });
  }

  async function load() {
    if (!token) {
      root.innerHTML = '<div class="card"><p class="bad">Token em falta na URL.</p></div>';
      return;
    }
    const rm = await fetch(api('/api/king-docs/public/' + encodeURIComponent(token) + '/meta'));
    const meta = await rm.json();
    if (!meta.ok) {
      root.innerHTML = '<div class="card"><p class="bad">' + esc(meta.message || 'Link inválido ou expirado.') + '</p></div>';
      return;
    }
    if (meta.needsPassword && !getViewer()) {
      root.innerHTML = '<div class="card"><p class="tag">King Docs</p><h1>Partilha protegida</h1><div class="pwd"><input type="password" id="pw" placeholder="Senha"/></div><button class="btn primary" id="go">Desbloquear</button><p class="bad" id="pe"></p></div>';
      document.getElementById('go').onclick = async function() {
        const pw = document.getElementById('pw').value;
        const r = await fetch(api('/api/king-docs/public/' + encodeURIComponent(token) + '/unlock'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pw })
        });
        const j = await r.json();
        if (!r.ok || !j.data || !j.data.viewerToken) {
          document.getElementById('pe').textContent = (j.message || 'Senha incorreta.');
          return;
        }
        setViewer(j.data.viewerToken);
        showData();
      };
      return;
    }
    showData();
  }

  function buildTextFromSnapshot(snap) {
    let t = '';
    if (snap.displayName) t += '*Nome:* ' + snap.displayName + '\n\n';
    (snap.sections || []).forEach(sec => {
      t += '*' + sec.title + '*\n';
      (sec.rows || []).forEach(row => {
        if (row.showText && row.text !== undefined) t += row.label + ': ' + row.text + '\n';
        if (row.showFile && row.file) t += row.label + ' (ficheiro): #' + row.file.id + '\n';
      });
      t += '\n';
    });
    (snap.extraDocs || []).forEach(ed => {
      t += '*' + (ed.label || 'Documento') + '* (anexo)\n';
    });
    return t.trim();
  }

  function hydratePreviewSlots(scope) {
    scope.querySelectorAll('.kd-preview-slot').forEach(function (slot) {
      var id = slot.getAttribute('data-file-id');
      var mimeHint = (slot.getAttribute('data-mime') || '').toLowerCase();
      if (!id) return;
      var fileUrl = api('/api/king-docs/public/' + encodeURIComponent(token) + '/file/' + id);
      fetch(fileUrl, { headers: headersDl() }).then(function (r) {
        if (!r.ok) throw new Error('load');
        return r.blob();
      }).then(function (blob) {
        var mime = mimeHint || (blob.type || '').toLowerCase();
        slot.innerHTML = '';
        var bu = URL.createObjectURL(blob);
        if (mime.indexOf('image/') === 0) {
          var img = document.createElement('img');
          img.className = 'kd-share-preview-img';
          img.alt = 'Pré-visualização do documento';
          img.src = bu;
          slot.appendChild(img);
        } else if (mime.indexOf('pdf') >= 0 || (blob.type && String(blob.type).indexOf('pdf') >= 0)) {
          var iframe = document.createElement('iframe');
          iframe.className = 'kd-share-preview-pdf';
          iframe.src = bu;
          iframe.title = 'Documento PDF';
          slot.appendChild(iframe);
        } else {
          URL.revokeObjectURL(bu);
          slot.innerHTML = '<p class="hint" style="margin:0">Pré-visualização não disponível para este tipo de ficheiro. Usa o botão para descarregar.</p>';
        }
      }).catch(function () {
        slot.innerHTML = '<p class="bad" style="margin:0;font-size:.85rem">Não foi possível mostrar a pré-visualização.</p>';
      });
    });
  }

  async function showData() {
    const r = await fetch(api('/api/king-docs/public/' + encodeURIComponent(token) + '/data'), { headers: headersJson() });
    if (r.status === 401) {
      sessionStorage.removeItem(storageKey);
      location.reload();
      return;
    }
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      root.innerHTML = '<div class="card"><p class="bad">' + esc(j.message || 'Erro ao carregar.') + '</p></div>';
      return;
    }
    const j = await r.json();
    const snap = (j.data && j.data.snapshot) || {};
    try {
      sessionStorage.setItem('kingDocsRepeat_' + token, '1');
    } catch (e) {}

    var profileFid = resolveProfileFileId(snap);

    let html = '<div class="card"><div class="head">';
    if (profileFid) {
      html += '<div class="kd-share-avatar" id="kd-profile-top-img" aria-hidden="false"></div>';
    } else if (snap.profileImageUrl) {
      html += '<div class="kd-share-avatar"><img src="' + esc(snap.profileImageUrl) + '" alt="Foto de perfil"/></div>';
    }
    html += '<h1>' + esc(snap.displayName || 'Dados partilhados') + '</h1></div>';

    html += '<div class="toolbar"><button type="button" class="btn primary" id="copy-all">Copiar tudo (texto)</button> <button type="button" class="btn" id="copy-sel">Copiar selecionados</button> <button type="button" class="btn" id="btn-wa-share">WhatsApp</button></div>';

    (snap.sections || []).forEach(sec => {
      const visibleRows = (sec.rows || []).filter(function (row) {
        return !shouldHideRowForProfile(row, profileFid);
      });
      if (!visibleRows.length) return;
      html += '<div class="sec"><h2>' + esc(sec.title) + '</h2>';
      visibleRows.forEach((row, ri) => {
        const rid = 'row-' + Math.random().toString(36).slice(2);
        const lineText = (row.showText && row.text !== undefined) ? (row.label + ': ' + row.text) : '';
        html += '<div class="line" id="' + rid + '">';
        html += lineText ? '<input type="checkbox" class="pick" data-enc="' + encodeURIComponent(lineText) + '" style="margin-right:.35rem"/>' : '<span style="width:18px;display:inline-block"></span>';
        html += '<label>' + esc(row.label) + '</label>';
        html += '<div style="flex:1;text-align:right">';
        if (row.showText && row.text !== undefined) {
          html += '<div class="val">' + esc(row.text) + '</div>';
        }
        if (row.file) {
          const fm = esc(row.file.mime || '');
          html += '<div class="kd-preview-slot kd-preview-slot--inline" data-file-id="' + row.file.id + '" data-mime="' + fm + '"><p class="kd-preview-loading">A carregar pré-visualização—</p></div>';
          const url = api('/api/king-docs/public/' + encodeURIComponent(token) + '/file/' + row.file.id);
          html += '<div class="actions"><a class="btn kd-dl" href="' + esc(url) + '">Baixar ficheiro</a></div>';
        }
        html += '<div class="actions">';
        if (lineText) {
          html += '<button type="button" class="btn copy-one" data-enc="' + encodeURIComponent(lineText) + '">Copiar linha</button>';
        }
        html += '</div></div></div>';
      });
      html += '</div>';
    });

    (snap.extraDocs || []).forEach(ed => {
      if (shouldHideExtraForProfile(ed, profileFid)) return;
      html += '<div class="sec"><h2>' + esc(ed.label || 'Documento') + '</h2>';
      const fm = esc(ed.mime || '');
      html += '<div class="kd-preview-slot" data-file-id="' + ed.id + '" data-mime="' + fm + '"><p class="kd-preview-loading">A carregar pré-visualização—</p></div>';
      const url = api('/api/king-docs/public/' + encodeURIComponent(token) + '/file/' + ed.id);
      html += '<div class="actions" style="margin-top:.5rem"><a class="btn primary kd-dl" href="' + esc(url) + '">Baixar</a></div></div>';
    });

    html += '<p class="hint">Os links de download só funcionam neste browser enquanto a sessão de partilha for válida. Se usaste senha, não feches o separador sem guardar o que precisas.</p>';
    html += '</div>';

    root.innerHTML = html;

    if (profileFid) loadShareAvatar(profileFid);

    hydratePreviewSlots(root);

    root.querySelector('#copy-all').onclick = function() {
      const txt = buildTextFromSnapshot(snap);
      navigator.clipboard.writeText(txt).then(function() { showToast('Texto copiado.'); });
    };
    var btnWa = root.querySelector('#btn-wa-share');
    if (btnWa) btnWa.onclick = function() {
      var txt = buildTextFromSnapshot(snap) + '\n\n' + window.location.href;
      window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener,noreferrer');
    };
    var btnSel = root.querySelector('#copy-sel');
    if (btnSel) btnSel.onclick = function() {
      var parts = [];
      root.querySelectorAll('.pick:checked').forEach(function(cb) {
        parts.push(decodeURIComponent(cb.getAttribute('data-enc') || ''));
      });
      if (!parts.length) { showToast('Marca pelo menos uma linha.', true); return; }
      navigator.clipboard.writeText(parts.join('\n')).then(function() { showToast('Copiado.'); });
    };
    root.querySelectorAll('.copy-one').forEach(b => {
      b.onclick = function() {
        const t = decodeURIComponent(this.getAttribute('data-enc') || '');
        navigator.clipboard.writeText(t).then(function() { showToast('Copiado.'); });
      };
    });

    root.querySelectorAll('a.kd-dl').forEach(a => {
      a.addEventListener('click', function(ev) {
        ev.preventDefault();
        fetch(this.href, { headers: headersDl() }).then(function(r) {
          if (!r.ok) { showToast('Não foi possível descarregar.', true); return; }
          return r.blob();
        }).then(function(blob) {
          if (!blob) return;
          const u = URL.createObjectURL(blob);
          const a2 = document.createElement('a');
          a2.href = u;
          a2.download = 'documento';
          a2.click();
          URL.revokeObjectURL(u);
        });
      });
    });
  }

  load();
})();
