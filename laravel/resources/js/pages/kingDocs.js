import * as PDFLibNS from 'pdf-lib';
import '../vendor-globals.js';
import '@css/pages/kingDocs.css';
import '@mod/js/ck-auth-gate.js';
import '@mod/js/ck-csrf.js';

if (typeof window !== 'undefined' && !window.PDFLib) {
  window.PDFLib = PDFLibNS;
}

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
        // Em produção/VPS: sempre mesma origem
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
  function getToken() {
    try {
      if (window.CkAuth && typeof window.CkAuth.lsToken === 'function') return window.CkAuth.lsToken() || '';
      return localStorage.getItem('token') || localStorage.getItem('conectaKingToken') || sessionStorage.getItem('token') || '';
    } catch (e) { return ''; }
  }
  function authHeaders() {
    const t = getToken();
    const h = { 'Content-Type': 'application/json' };
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  }
  var __rawFetch = window.fetch.bind(window);
  function fetch(input, init) {
    init = init || {};
    if (!init.credentials) init = Object.assign({}, init, { credentials: 'include' });
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

    return __rawFetch(input, init);
  }

  /** Cada toast tem o seu próprio temporizador (evita que vários toasts fiquem presos quando clearTimeout cancelava o anterior). */
  var KD_TOAST_MS = 2000;
  function showToast(message, variant) {
    var host = document.getElementById('kd-toast-host');
    if (!host) return;
    var el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.className = 'kd-toast' + (variant === 'ok' ? ' kd-toast--ok' : variant === 'err' ? ' kd-toast--err' : ' kd-toast--neutral');
    el.textContent = message;
    host.appendChild(el);
    while (host.children.length > 5) {
      try { host.removeChild(host.firstChild); } catch (e) { break; }
    }
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transition = 'opacity .18s ease';
      setTimeout(function () { try { if (el.parentNode) el.parentNode.removeChild(el); } catch (e) {} }, 200);
    }, KD_TOAST_MS);
  }

  function setAppLoading(on) {
    if (on) {
      document.body.classList.add('kd-app-loading');
      var o = document.getElementById('kd-load-overlay');
      if (o) o.setAttribute('aria-hidden', 'false');
    } else {
      document.body.classList.remove('kd-app-loading');
      var o2 = document.getElementById('kd-load-overlay');
      if (o2) o2.setAttribute('aria-hidden', 'true');
    }
  }

  var THEME_KEY = 'kingDocs_theme';
  function applyTheme(dark) {
    document.body.classList.toggle('kd-theme-dark', !!dark);
    var btn = document.getElementById('kd-theme-toggle');
    if (btn) btn.textContent = dark ? 'Tema claro' : 'Tema escuro';
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) {}
  }
  function initTheme() {
    try {
      applyTheme(localStorage.getItem(THEME_KEY) === 'dark');
    } catch (e) { applyTheme(false); }
  }

  var MODELS_KEY = 'kingDocs_models_v1';
  function loadModels() {
    try {
      var raw = localStorage.getItem(MODELS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function saveModels(arr) {
    try { localStorage.setItem(MODELS_KEY, JSON.stringify(arr)); } catch (e) {}
  }
  function shareFieldBlockIn(rootEl, fk) {
    if (!rootEl) return null;
    var found = null;
    rootEl.querySelectorAll('.kd-field-block[data-fk]').forEach(function (b) {
      if (b.getAttribute('data-fk') === fk) found = b;
    });
    return found;
  }
  function shareFieldBlock(fk) {
    var w = document.getElementById('share-table-wrap');
    return shareFieldBlockIn(w, fk);
  }
  function fieldBlockIncluded(block) {
    if (!block) return false;
    var st = block.querySelector('.st');
    var sf = block.querySelector('.sf');
    return !!(st && st.checked) || !!(sf && sf.checked);
  }
  function fieldBlockFid(block) {
    if (!block) return '';
    var el = block.querySelector('.st') || block.querySelector('.sf');
    return el ? el.getAttribute('data-fid') : '';
  }
  function collectShareState() {
    return {
      pairs: collectCurrentPresetPairs(),
      hours: document.getElementById('sh-hours') ? document.getElementById('sh-hours').value : ''
    };
  }
  function collectShareStateFrom(fieldRoot, extraRoot) {
    var rows = [];
    if (fieldRoot) {
      fieldRoot.querySelectorAll('.kd-field-block[data-fk]').forEach(function (tr) {
        var fk = tr.getAttribute('data-fk');
        var fid = fieldBlockFid(tr);
        if (!fid) return;
        var st = tr.querySelector('' + fid + '');
        var sf = tr.querySelector('' + fid + '');
        rows.push({
          fk: fk,
          st: !!(st && st.checked),
          sf: !!(sf && sf.checked),
          incl: fieldBlockIncluded(tr)
        });
      });
    }
    var extraFileIds = [];
    if (extraRoot) {
      extraRoot.querySelectorAll('.xd-check:checked').forEach(function (ch) {
        var id = ch.getAttribute('data-fid');
        var lab = extraRoot.querySelector('.xd-label[data-fid="' + id + '');
        extraFileIds.push({ id: id, label: lab ? lab.value : '' });
      });
    }
    return { rows: rows, extraFileIds: extraFileIds, hours: document.getElementById('sh-hours') ? document.getElementById('sh-hours').value : '' };
  }
  function applyShareState(state) {
    if (!state) return;
    clearAtalhoActive();
    clearAllShareCards();
    if (state.pairs && state.pairs.length) {
      state.pairs.forEach(function (entry) { applyPresetToShareCard(entry); });
    } else if (state.rows) {
      applyShareStateToRoots(document.getElementById('kd-sc-share-grid'), document.getElementById('kd-sc-extra-docs'), state, false);
    }
    if (state.hours != null && document.getElementById('sh-hours')) document.getElementById('sh-hours').value = state.hours;
    syncDocPreviewFromShareCards();
    updateSharePreview();
  }
  function applyShareStateToRoots(fieldRoot, extraRoot, state, runPreview) {
    if (!state || !state.rows) return;
    clearAtalhoActive();
    if (fieldRoot) {
      fieldRoot.querySelectorAll('.kd-field-block[data-fk]').forEach(function (tr) {
        var fk = tr.getAttribute('data-fk');
        var saved = state.rows.find(function (r) { return r.fk === fk; });
        var fid = fieldBlockFid(tr);
        if (!fid) return;
        var st = tr.querySelector('' + fid + '');
        var sf = tr.querySelector('' + fid + '');
        if (!saved) {
          if (st) st.checked = false;
          if (sf) sf.checked = false;
          return;
        }
        if (st) st.checked = saved.st != null ? !!saved.st : !!saved.incl;
        if (sf) sf.checked = !!saved.sf;
        if (saved.incl && saved.st == null && saved.sf == null) {
          if (st) st.checked = true;
        }
      });
    }
    if (extraRoot) {
      extraRoot.querySelectorAll('.xd-check').forEach(function (ch) { ch.checked = false; });
      (state.extraFileIds || []).forEach(function (ex) {
        var ch = extraRoot.querySelector('.xd-check[data-fid="' + ex.id + '');
        if (ch) ch.checked = true;
        var lab = extraRoot.querySelector('.xd-label[data-fid="' + ex.id + '');
        if (lab && ex.label != null) lab.value = ex.label;
      });
    }
    if (state.hours != null && document.getElementById('sh-hours')) document.getElementById('sh-hours').value = state.hours;
    if (runPreview) updateSharePreview();
  }
  function renderModelsChips() {
    var el = document.getElementById('kd-models-chips');
    if (!el) return;
    var arr = loadModels();
    el.innerHTML = arr.map(function (m, i) {
      return '<span class="kd-chip">' + escapeHtml(m.name) +
        ' <button type="button" data-apply="' + i + '">Aplicar</button>' +
        ' <button type="button" data-del="' + i + '" aria-label="Remover modelo"></button></span>';
    }).join('');
    el.querySelectorAll('[data-apply]').forEach(function (b) {
      b.onclick = function () {
        var list = loadModels();
        var m = list[parseInt(this.getAttribute('data-apply'), 10)];
        if (m && m.state) applyShareState(m.state);
        showToast('Modelo aplicado.', 'ok');
      };
    });
    el.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () {
        var list = loadModels();
        list.splice(parseInt(this.getAttribute('data-del'), 10), 1);
        saveModels(list);
        renderModelsChips();
        showToast('Modelo removido.', 'neutral');
      };
    });
  }

  function formatShortDate(d) {
    if (!d || isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function latestForDocType(docType) {
    var t = String(docType).trim();
    var best = null;
    filesList.forEach(function (f) {
      if (String(f.doc_type || '').trim() !== t || !f.created_at) return;
      var d = new Date(f.created_at);
      if (!best || d > best) best = d;
    });
    return best;
  }
  /** ltimo ficheiro deste tipo (para pré-visualização / link rápido) */
  function getLatestFileForDocType(docType) {
    var t = String(docType).trim();
    var best = null;
    filesList.forEach(function (f) {
      if (String(f.doc_type || '').trim() !== t) return;
      var d = f.created_at ? new Date(f.created_at).getTime() : 0;
      var bd = best && best.created_at ? new Date(best.created_at).getTime() : 0;
      if (!best || d > bd) best = f;
    });
    return best;
  }
  /** Foto redonda no topo do link (Partilhar ou último FOTO PESSOAL no cofre) */
  function resolveProfileImageFileIdForShare() {
    var el = document.getElementById('sh-profile-file-id');
    if (el && el.value) {
      var n = parseInt(el.value, 10);
      if (Number.isFinite(n)) return n;
    }
    var f = getLatestFileForDocType('FOTO PESSOAL');
    return f ? f.id : null;
  }
  function isFotoPessoalFileId(fileId) {
    if (fileId == null || !Number.isFinite(parseInt(fileId, 10))) return false;
    var f = filesList.find(function (x) { return x.id === parseInt(fileId, 10); });
    return !!(f && normalizeDocTypeKey(f.doc_type) === normalizeDocTypeKey('FOTO PESSOAL'));
  }

  /** Cartões Â«DocumentosÂ»: docType enviado no upload (tem de bater com a lista de ficheiros) */
  const DOC_CARD_PRESETS = [
    { docType: 'RG', label: 'RG', icon: '' },
    { docType: 'CNH', label: 'CNH', icon: '' },
    { docType: 'FOTO PESSOAL', label: 'Foto pessoal', icon: '' },
    { docType: 'CARTfO DO CNPJ', label: 'Cartão do CNPJ', icon: '' },
    { docType: 'CONTRATO SOCIAL', label: 'Contrato social', icon: '' },
    { docType: 'INSC. ESTADUAL', label: 'Insc. estadual', icon: '' },
    { docType: 'INSC. MUNICIPAL', label: 'Insc. municipal', icon: '' },
    { docType: 'CERTIDfO DE NASCIMENTO', label: 'Certidão de nascimento', icon: '' },
    { docType: 'CERTIDfO DE CASAMENTO', label: 'Certidão de casamento', icon: '' },
    { docType: 'CERTIDfO DOS FILHOS', label: 'Certidão dos filhos', icon: '' }
  ];
  let pendingDocType = '';
  var docPreviewBlobUrls = {};
  var docPreviewSelectedTypes = [];
  var docPreviewRefreshGen = 0;

  function revokeDocPreviewBlobAll() {
    Object.keys(docPreviewBlobUrls).forEach(function (k) {
      try { URL.revokeObjectURL(docPreviewBlobUrls[k]); } catch (e) {}
    });
    docPreviewBlobUrls = {};
  }
  async function quickShareVaultFile(fileId, label) {
    var body = {
      expiresInHours: 72,
      password: '',
      maxViews: '',
      selection: {
        displayName: (document.getElementById('sh-name') && document.getElementById('sh-name').value) || '',
        profileImageUrl: '',
        profileImageFileId: (function () {
          var el = document.getElementById('sh-profile-file-id');
          if (!el || !el.value) return null;
          var n = parseInt(el.value, 10);
          return Number.isFinite(n) ? n : null;
        })(),
        sections: [],
        extraDocs: [{ fileId: parseInt(fileId, 10), label: label || 'Documento' }]
      }
    };
    var r = await fetch(api('/api/king-docs/shares'), { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    if (!r.ok) {
      showToast('Não foi possível criar o link.', 'err');
      return null;
    }
    var j = await r.json();
    var d = j.data || {};
    return window.location.origin + (d.shareUrl || '');
  }
  /** Secções a partir dos cartões unificados (#doc-browse-root) */
  function buildShareSectionsAndExtraFromTable() {
    const sections = [];
    const sectionMap = {};
    const extraDocs = [];
    const usedFileIds = new Set();
    document.querySelectorAll('#doc-browse-root .doc-card--share').forEach(function (card) {
      var st = card.querySelector('.kd-sc-st');
      var sf = card.querySelector('.kd-sc-sf');
      var wantText = !!(st && st.checked);
      var wantFile = !!(sf && sf.checked);
      if (!wantText && !wantFile) return;
      var gid = card.getAttribute('data-gid') || '';
      var key = card.getAttribute('data-key') || '';
      var docType = card.getAttribute('data-doc-type') || '';
      if (gid && key) {
        var gInfo = GROUPS.find(function (x) { return x.id === gid; });
        var title = gInfo ? gInfo.title : 'Outros';
        if (!sectionMap[title]) sectionMap[title] = [];
        var dtHint = fieldKeyToDocTypeHint(key, gid);
        var canon = dtHint ? vaultDocTypeKeyForHint(dtHint) : null;
        var vaultFile = wantFile && canon ? (getLatestFileForDocType(canon) || findFileForFieldHint(gid, key)) : null;
        if (vaultFile) usedFileIds.add(vaultFile.id);
        sectionMap[title].push({
          group: gid,
          key: key,
          label: key,
          showText: wantText,
          showFile: !!(wantFile && vaultFile),
          fileId: vaultFile ? vaultFile.id : null
        });
      } else if (docType && wantFile) {
        var f = getLatestFileForDocType(docType);
        if (f && !usedFileIds.has(f.id)) {
          usedFileIds.add(f.id);
          extraDocs.push({ fileId: f.id, label: docTypeLabel(docType) });
        }
      }
    });
    Object.keys(sectionMap).forEach(function (title) {
      if (sectionMap[title].length) sections.push({ title: title, rows: sectionMap[title] });
    });
    return { sections: sections, extraDocs: extraDocs };
  }
  function fileIdsUsedInSections(sections) {
    var used = new Set();
    (sections || []).forEach(function (sec) {
      (sec.rows || []).forEach(function (row) {
        if (row.fileId != null) used.add(parseInt(row.fileId, 10));
      });
    });
    return used;
  }
  /** Um único payload: textos do perfil + ficheiros ligados aos campos + cartões de documento + Â«documentos extraÂ» */
  function buildUnifiedShareSelection() {
    var built = buildShareSectionsAndExtraFromTable();
    var sections = built.sections;
    var extraDocs = built.extraDocs.slice();
    var profileImageFileId = resolveProfileImageFileIdForShare();
    if (profileImageFileId != null && !Number.isFinite(profileImageFileId)) profileImageFileId = null;
    var hid = document.getElementById('sh-profile-file-id');
    if (hid && profileImageFileId) hid.value = String(profileImageFileId);
    extraDocs = extraDocs.filter(function (ed) {
      var fid = parseInt(ed.fileId, 10);
      if (profileImageFileId && fid === profileImageFileId) return false;
      return !isFotoPessoalFileId(fid);
    });
    sections = sections.map(function (sec) {
      return {
        title: sec.title,
        rows: (sec.rows || []).filter(function (row) {
          if (!row.fileId) return true;
          var fid = parseInt(row.fileId, 10);
          if (profileImageFileId && fid === profileImageFileId) return false;
          return !isFotoPessoalFileId(fid);
        })
      };
    }).filter(function (sec) { return (sec.rows || []).length > 0; });
    return {
      displayName: (document.getElementById('sh-name') && document.getElementById('sh-name').value) || '',
      profileImageUrl: '',
      profileImageFileId: profileImageFileId,
      sections: sections,
      extraDocs: extraDocs
    };
  }
  function hasUnifiedShareContent(sel) {
    if (!sel) return false;
    if (sel.profileImageFileId != null && Number.isFinite(parseInt(sel.profileImageFileId, 10))) return true;
    if (sel.extraDocs && sel.extraDocs.length) return true;
    if (sel.sections && sel.sections.some(function (s) { return (s.rows || []).length; })) return true;
    return false;
  }
  async function postKingDocsShare(body) {
    var r = await fetch(api('/api/king-docs/shares'), { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    if (!r.ok) {
      showToast('Não foi possível criar o link.', 'err');
      return null;
    }
    var j = await r.json();
    var d = j.data || {};
    return window.location.origin + (d.shareUrl || '');
  }
  /** Link único King Docs: mesmo URL para texto + ficheiros (usa seleção actual da página) */
  async function quickShareVaultMulti() {
    var selection = buildUnifiedShareSelection();
    if (!hasUnifiedShareContent(selection)) return null;
    var body = {
      expiresInHours: 72,
      password: '',
      maxViews: '',
      selection: selection
    };
    return postKingDocsShare(body);
  }
  function getSelectedExtraDocs() {
    return buildShareSectionsAndExtraFromTable().extraDocs || [];
  }
  function syncDocPreviewFromShareCards() {
    var types = [];
    document.querySelectorAll('#doc-browse-root .doc-card--share').forEach(function (card) {
      var sf = card.querySelector('.kd-sc-sf');
      if (!sf || !sf.checked) return;
      var dt = card.getAttribute('data-doc-type');
      if (dt && fileExistsForDocType(dt)) types.push(dt);
    });
    docPreviewSelectedTypes = types;
    refreshDocVaultPreview();
  }
  /** Ãcone próprio por campo (cartão igual aos tipos de documento) */
  var FIELD_ICONS = {
    'pessoal|Nome Completo': '',
    'pessoal|Data de Nasc.': '',
    'pessoal|RG': '',
    'pessoal|CPF': '',
    'contato|WhatsApp': '',
    'contato|E-mail': '',
    'contato|Instagram': '',
    'endereco|Rua': '',
    'endereco|Bairro': '',
    'endereco|Cidade': '',
    'endereco|CEP': '',
    'financeiro|PIX (CPF)': '',
    'financeiro|Banco': '',
    'financeiro|Agência': '',
    'financeiro|Conta': '',
    'empresa|Razão Social': '',
    'empresa|CNPJ': '',
    'empresa|IE': '',
    'empresa|C.C.M': '',
    'empresa|E-mail': '',
    'empresa|Site': '',
    'empresa|Endereço': '',
    'empresa|Bairro': '',
    'empresa|Cidade': '',
    'empresa|CEP': '',
    'financeiropj|PIX (CNPJ)': '',
    'financeiropj|Favorecido': '',
    'financeiropj|Banco': '',
    'financeiropj|Agência': '',
    'financeiropj|Conta': '',
  };
  function iconForField(groupId, key, fallbackIcon) {
    var fk = String(groupId || '') + '|' + String(key || '');
    if (FIELD_ICONS[fk]) return FIELD_ICONS[fk];
    return fallbackIcon || '';
  }
  function buildShareSections() {
    var coveredFields = {};
    var sections = [];
    var docItems = [];
    var presets = getDocCardPresetsMerged().slice();
    presets.sort(function (a, b) {
      var af = normalizeDocTypeKey(a.docType) === normalizeDocTypeKey('FOTO PESSOAL');
      var bf = normalizeDocTypeKey(b.docType) === normalizeDocTypeKey('FOTO PESSOAL');
      if (af && !bf) return -1;
      if (bf && !af) return 1;
      return 0;
    });
    presets.forEach(function (p) {
      var pair = fieldPairForDocType(p.docType);
      if (pair) coveredFields[pair[0] + '|' + pair[1]] = true;
      docItems.push({
        docType: p.docType,
        label: p.label,
        icon: p.icon,
        group: pair ? pair[0] : null,
        key: pair ? pair[1] : null
      });
    });
    if (docItems.length) {
      sections.push({ title: 'Documentos e fotos', icon: '', items: docItems });
    }
    GROUPS.forEach(function (g) {
      var items = [];
      g.keys.forEach(function (k) {
        var fk = g.id + '|' + k;
        if (coveredFields[fk]) return;
        items.push({
          docType: fieldKeyToDocTypeHint(k, g.id) ? vaultDocTypeKeyForHint(fieldKeyToDocTypeHint(k, g.id)) : null,
          label: k,
          icon: iconForField(g.id, k, g.icon),
          group: g.id,
          key: k
        });
      });
      if (items.length) sections.push({ title: g.title, icon: g.icon, items: items });
    });
    return sections;
  }
  function buildShareItemsList() {
    var all = [];
    buildShareSections().forEach(function (s) {
      (s.items || []).forEach(function (it) { all.push(it); });
    });
    return all;
  }
  function renderShareCardHtml(it) {
    ensureFieldData();
    var hasFile = it.docType && fileExistsForDocType(it.docType);
    var canFile = !!it.docType;
    var showText = !!(it.group && it.key);
    var dtAttr = it.docType ? '' + escapeAttr(it.docType) + '' : '';
    var gAttr = it.group ? '' + escapeAttr(it.group) + '' : '';
    var kAttr = it.key ? '' + escapeAttr(it.key) + '' : '';
    var modes = '';
    if (canFile) modes += '<label class="kd-sc-mode"><input type="checkbox" class="kd-sc-sf"/> Foto/PDF</label>';
    if (showText) modes += '<label class="kd-sc-mode"><input type="checkbox" class="kd-sc-st"/> Texto</label>';
    var valHint = '';
    if (it.group && it.key && fieldData[it.group] && String(fieldData[it.group][it.key] || '').trim()) {
      var v = String(fieldData[it.group][it.key]).trim();
      valHint = '<div class="dc-val-hint" title="' + escapeAttr(v) + '' + escapeHtml(v.length > 32 ? v.slice(0, 32) + '' : v) + '</div>';
    }
    var status = '';
    var dateLine = '';
    if (hasFile) {
      status = 'o" Ver pré-visualização';
      var lastD = latestForDocType(it.docType);
      if (lastD) dateLine = '<div class="dc-date">ltimo: ' + escapeHtml(formatShortDate(lastD)) + '</div>';
    } else if (canFile) {
      status = 'Envia em Dados';
    } else if (valHint) {
      status = 'o" Texto preenchido';
    } else {
      status = 'Marca Texto';
    }
    var cls = 'doc-card doc-card--share doc-card--browse';
    if (hasFile) cls += ' doc-card--has-file';
    return '' + cls + '' + dtAttr + gAttr + kAttr + '>' +
      '<div class="dc-icon" aria-hidden="true">' + (it.icon || '') + '</div>' +
      '<div class="dc-title">' + escapeHtml(it.label) + '</div>' +
      valHint +
      '<div class="dc-modes">' + modes + '</div>' +
      '<div class="dc-status">' + escapeHtml(status) + '</div>' +
      dateLine +
      '</div>';
  }
  function findShareCard(gid, key, docType) {
    var root = document.getElementById('doc-browse-root');
    if (!root) return null;
    if (docType) {
      var canon = vaultDocTypeKeyForHint(docType);
      var cards = root.querySelectorAll('.doc-card--share[data-doc-type]');
      for (var i = 0; i < cards.length; i++) {
        if (normalizeDocTypeKey(cards[i].getAttribute('data-doc-type')) === normalizeDocTypeKey(canon || docType)) return cards[i];
      }
    }
    if (gid && key) {
      return root.querySelector('.doc-card--share[data-gid="' + gid + '' + key + '');
    }
    return null;
  }
  function setShareCardModes(gid, key, docType, wantText, wantFile) {
    var card = findShareCard(gid, key, docType);
    if (!card) return;
    var st = card.querySelector('.kd-sc-st');
    var sf = card.querySelector('.kd-sc-sf');
    if (st) st.checked = !!wantText;
    if (sf) sf.checked = !!wantFile;
    card.classList.toggle('doc-card--on', !!(wantText || wantFile));
  }
  function clearAllShareCards() {
    document.querySelectorAll('#doc-browse-root .doc-card--share').forEach(function (card) {
      var st = card.querySelector('.kd-sc-st');
      var sf = card.querySelector('.kd-sc-sf');
      if (st) st.checked = false;
      if (sf) sf.checked = false;
      card.classList.remove('doc-card--on');
    });
    docPreviewSelectedTypes = [];
    revokeDocPreviewBlobAll();
  }
  function applyPresetToShareCard(entry) {
    if (entry && typeof entry === 'object' && !Array.isArray(entry) && entry.extraDoc) {
      setShareCardModes(null, null, String(entry.extraDoc), false, true);
      return;
    }
    if (!Array.isArray(entry) || entry.length < 2) return;
    var g = entry[0];
    var k = entry[1];
    var mode = entry.length >= 3 ? entry[2] : 't';
    var m = normalizePresetMode(mode);
    var dt = fieldKeyToDocTypeHint(k, g);
    var wantT = (m === 't' || m === 'b');
    var wantF = (m === 'f' || m === 'b');
    setShareCardModes(g, k, dt, wantT, wantF);
    if (wantF && dt) ensureVaultDocTypeSelectedForField(g, k);
  }
  function getProfileImageFileIdForUi() {
    return resolveProfileImageFileIdForShare();
  }
  function updateUnifiedActionButtons() {
    var hasShare = hasUnifiedShareContent(buildUnifiedShareSelection());
    var preview = collectSharePreviewData();
    var hasPreviewContent = !!(preview && preview.count > 0);
    var hasProfImg = !!getProfileImageFileIdForUi();
    var hasDocSel = document.querySelectorAll('#doc-browse-root .doc-card--share.doc-card--on').length > 0;
    var extraSep = getSelectedExtraDocs();
    ['btn-doc-copy-plain', 'btn-doc-copy-textonly', 'btn-doc-wa-text', 'btn-doc-wa-text-img'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.disabled = !hasPreviewContent;
    });
    var elCopyImg = document.getElementById('btn-doc-copy-with-img');
    if (elCopyImg) elCopyImg.disabled = !hasPreviewContent || !hasProfImg;
    ['btn-doc-copy-link', 'btn-doc-wa-link', 'btn-doc-wa-list', 'btn-doc-pdf-dl', 'btn-doc-pdf-share'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.disabled = !hasShare;
    });
    var clr = document.getElementById('btn-doc-clear-sel');
    if (clr) clr.disabled = !hasDocSel;
    var waSep = document.getElementById('btn-doc-wa-sep');
    if (waSep) waSep.disabled = !extraSep.length;
  }
  function ensurePdfLib() {
    return Promise.resolve(window.PDFLib || PDFLibNS).then(function (lib) {
      if (!lib || !lib.PDFDocument) throw new Error('pdf-lib');
      return lib;
    });
  }
  async function appendFileToUnifiedPdf(pdfDoc, PDFLibMod, f) {
    var PDFDocument = PDFLibMod.PDFDocument;
    var pageW = 595.28;
    var pageH = 841.89;
    var res = await fetch(api('/api/king-docs/files/' + f.id + '/download'), { headers: authHeaders() });
    if (!res.ok) return;
    var blob = await res.blob();
    var mime = (f.mime || '').toLowerCase();
    var ab = await blob.arrayBuffer();
    try {
      if (mime.indexOf('image/jpeg') === 0 || mime === 'image/jpg') {
        var jpg = await pdfDoc.embedJpg(ab);
        var page = pdfDoc.addPage([pageW, pageH]);
        var sc = jpg.scaleToFit(pageW - 40, pageH - 40);
        page.drawImage(jpg, { x: (pageW - sc.width) / 2, y: (pageH - sc.height) / 2, width: sc.width, height: sc.height });
      } else if (mime.indexOf('image/png') === 0) {
        var png = await pdfDoc.embedPng(ab);
        var page2 = pdfDoc.addPage([pageW, pageH]);
        var sc2 = png.scaleToFit(pageW - 40, pageH - 40);
        page2.drawImage(png, { x: (pageW - sc2.width) / 2, y: (pageH - sc2.height) / 2, width: sc2.width, height: sc2.height });
      } else if (mime.indexOf('pdf') >= 0) {
        var srcPdf = await PDFDocument.load(ab);
        var copied = await pdfDoc.copyPages(srcPdf, srcPdf.getPageIndices());
        copied.forEach(function (pg) { pdfDoc.addPage(pg); });
      } else {
        var page3 = pdfDoc.addPage([pageW, pageH]);
        var font3 = await pdfDoc.embedFont(PDFLibMod.StandardFonts.Helvetica);
        page3.drawText('Formato não incluído no PDF: ' + String(f.doc_type || mime).slice(0, 120), { x: 40, y: pageH - 60, size: 11, font: font3 });
      }
    } catch (e) {
      var pageE = pdfDoc.addPage([pageW, pageH]);
      var fontE = await pdfDoc.embedFont(PDFLibMod.StandardFonts.Helvetica);
      pageE.drawText('Erro ao incluir: ' + String(f.doc_type || ''), { x: 40, y: pageH - 60, size: 11, font: fontE });
    }
  }
  /** PDF = textos da mesma seleção do link + todos os ficheiros (perfil, campos, extras, cartões). */
  async function buildMergedPdfBlob() {
    var sel = buildUnifiedShareSelection();
    if (!hasUnifiedShareContent(sel)) return null;
    var PDFLibMod = await ensurePdfLib();
    var PDFDocument = PDFLibMod.PDFDocument;
    var pdfDoc = await PDFDocument.create();
    var pageW = 595.28;
    var pageH = 841.89;
    var font = await pdfDoc.embedFont(PDFLibMod.StandardFonts.Helvetica);
    var textLines = ['King Docs — resumo da partilha', ''];
    if (sel.displayName) textLines.push('Nome: ' + sel.displayName);
    (sel.sections || []).forEach(function (sec) {
      textLines.push('');
      textLines.push('' + (sec.title || 'Secção') + '');
      (sec.rows || []).forEach(function (row) {
        if (!row.showText) return;
        var g = row.group;
        var k = row.key;
        var val = '';
        if (g && k && fieldData[g] && fieldData[g][k] != null) val = String(fieldData[g][k]);
        textLines.push((row.label || k || '') + ': ' + val);
      });
    });
    var page = pdfDoc.addPage([pageW, pageH]);
    var y = pageH - 48;
    textLines.forEach(function (line) {
      var t = String(line).replace(/\r/g, '');
      for (var o = 0; o < t.length; o += 88) {
        var chunk = t.slice(o, o + 88);
        if (y < 44) {
          page = pdfDoc.addPage([pageW, pageH]);
          y = pageH - 48;
        }
        page.drawText(chunk, { x: 40, y: y, size: 10, font: font });
        y -= 12;
      }
    });
    var orderedIds = [];
    var seen = new Set();
    function pushId(id) {
      id = parseInt(id, 10);
      if (!id || seen.has(id)) return;
      seen.add(id);
      orderedIds.push(id);
    }
    if (sel.profileImageFileId) pushId(sel.profileImageFileId);
    (sel.sections || []).forEach(function (sec) {
      (sec.rows || []).forEach(function (row) {
        if (row.showFile && row.fileId) pushId(row.fileId);
      });
    });
    (sel.extraDocs || []).forEach(function (ed) { pushId(ed.fileId); });
    for (var i = 0; i < orderedIds.length; i++) {
      var fid = orderedIds[i];
      var f = filesList.find(function (x) { return x.id === fid; });
      if (f) await appendFileToUnifiedPdf(pdfDoc, PDFLibMod, f);
    }
    var out = await pdfDoc.save();
    return new Blob([out], { type: 'application/pdf' });
  }
  async function refreshDocVaultPreview() {
    var gen = ++docPreviewRefreshGen;
    var bodyEl = document.getElementById('doc-preview-body');
    var badgeEl = document.getElementById('doc-preview-sel-badge');
    if (!bodyEl) return;

    var types = docPreviewSelectedTypes.filter(function (dt) { return fileExistsForDocType(dt); });
    docPreviewSelectedTypes = types.slice();

    if (badgeEl) {
      if (types.length) {
        badgeEl.style.display = '';
        badgeEl.textContent = types.length === 1 ? '1 selecionado' : types.length + ' selecionados';
      } else {
        badgeEl.style.display = 'none';
        badgeEl.textContent = '';
      }
    }
    var dragHintEl = document.getElementById('doc-preview-drag-hint');
    if (dragHintEl) dragHintEl.style.display = types.length > 1 ? '' : 'none';

    revokeDocPreviewBlobAll();
    if (gen !== docPreviewRefreshGen) return;

    if (!types.length) {
      bodyEl.innerHTML = '<p class="preview-empty">Clica nos documentos Ã  esquerda (podes escolher vários).</p>';
      updateUnifiedActionButtons();
      return;
    }
    updateUnifiedActionButtons();
    bodyEl.innerHTML = '<p class="kd-hint">A carregar—</p>';
    try {
      var frag = document.createDocumentFragment();
      for (var ti = 0; ti < types.length; ti++) {
        if (gen !== docPreviewRefreshGen) return;
        var docType = types[ti];
        var f = getLatestFileForDocType(docType);
        if (!f) continue;
        var res = await fetch(api('/api/king-docs/files/' + f.id + '/download'), { headers: authHeaders() });
        if (gen !== docPreviewRefreshGen) return;
        if (!res.ok) {
          var errDiv = document.createElement('div');
          errDiv.className = 'doc-preview-stack-item';
          errDiv.innerHTML = '<div class="doc-preview-stack-head"><span class="doc-preview-stack-title">' + escapeHtml(docTypeLabel(docType)) + '</span><span class="doc-preview-sel-chip">Selecionado</span></div><p class="err">Não foi possível carregar.</p>';
          frag.appendChild(errDiv);
          continue;
        }
        var blob = await res.blob();
        if (gen !== docPreviewRefreshGen) return;
        var url = URL.createObjectURL(blob);
        docPreviewBlobUrls[docType] = url;
        var mime = (f.mime || '').toLowerCase();
        var wrap = document.createElement('div');
        wrap.className = 'doc-preview-stack-item';
        var head = document.createElement('div');
        head.className = 'doc-preview-stack-head';
        var title = document.createElement('span');
        title.className = 'doc-preview-stack-title';
        title.textContent = docTypeLabel(docType);
        var chip = document.createElement('span');
        chip.className = 'doc-preview-sel-chip';
        chip.textContent = 'Selecionado';
        head.appendChild(title);
        head.appendChild(chip);
        wrap.appendChild(head);
        var meta = document.createElement('p');
        meta.className = 'sub';
        meta.style.margin = '0 0 .45rem';
        meta.textContent = '#' + f.id + ' Â· ' + (f.doc_type || '') + ' Â· ' + (f.mime || '');
        wrap.appendChild(meta);
        if (mime.indexOf('image/') === 0) {
          var img = document.createElement('img');
          img.className = 'doc-preview-img';
          img.draggable = false;
          img.alt = f.doc_type || '';
          img.src = url;
          wrap.appendChild(img);
        } else if (mime.indexOf('pdf') >= 0) {
          var iframe = document.createElement('iframe');
          iframe.className = 'doc-preview-iframe';
          iframe.title = 'PDF';
          iframe.src = url;
          wrap.appendChild(iframe);
        } else {
          var p = document.createElement('p');
          p.className = 'sub';
          p.textContent = 'Pré-visualização limitada. Gera link ou PDF.';
          wrap.appendChild(p);
          var a = document.createElement('a');
          a.href = url;
          a.download = (f.original_name || 'documento').replace(/[\\/]/g, '');
          a.className = 'btn secondary';
          a.textContent = 'Descarregar';
          wrap.appendChild(a);
        }
        wrap.classList.add('doc-preview-stack-item--draggable');
        wrap.setAttribute('draggable', 'true');
        wrap.dataset.docType = docType;
        wrap.addEventListener('dragstart', function (e) {
          e.dataTransfer.setData('application/x-kd-doctype', docType);
          e.dataTransfer.effectAllowed = 'move';
          wrap.classList.add('doc-preview-stack-item--dragging');
        });
        wrap.addEventListener('dragend', function () {
          wrap.classList.remove('doc-preview-stack-item--dragging');
          if (bodyEl) bodyEl.querySelectorAll('.doc-preview-stack-item--drag-over').forEach(function (n) { n.classList.remove('doc-preview-stack-item--drag-over'); });
        });
        wrap.addEventListener('dragover', function (e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        });
        wrap.addEventListener('dragenter', function (e) {
          e.preventDefault();
          wrap.classList.add('doc-preview-stack-item--drag-over');
        });
        wrap.addEventListener('dragleave', function (e) {
          if (!wrap.contains(e.relatedTarget)) wrap.classList.remove('doc-preview-stack-item--drag-over');
        });
        wrap.addEventListener('drop', function (e) {
          e.preventDefault();
          wrap.classList.remove('doc-preview-stack-item--drag-over');
          var from = e.dataTransfer.getData('application/x-kd-doctype');
          if (from && from !== docType) reorderDocPreviewTypes(from, docType);
        });
        frag.appendChild(wrap);
      }
      if (gen !== docPreviewRefreshGen) return;
      bodyEl.innerHTML = '';
      bodyEl.appendChild(frag);
    } catch (err) {
      if (gen !== docPreviewRefreshGen) return;
      bodyEl.innerHTML = '<p class="err">Erro ao carregar a pré-visualização.</p>';
      updateUnifiedActionButtons();
    }
  }
  function reorderDocPreviewTypes(fromDt, toDt) {
    var a = docPreviewSelectedTypes.filter(function (dt) { return fileExistsForDocType(dt); });
    var fromI = a.indexOf(fromDt);
    var toI = a.indexOf(toDt);
    if (fromI < 0 || toI < 0 || fromI === toI) return;
    var item = a.splice(fromI, 1)[0];
    toI = a.indexOf(toDt);
    a.splice(toI, 0, item);
    docPreviewSelectedTypes = a;
    renderDocBrowseCards();
    refreshDocVaultPreview();
  }
  function toggleDocBrowse(docType) {
    var dt = String(docType).trim();
    if (!fileExistsForDocType(dt)) {
      showToast('Este documento ainda não está no cofre. Envia na aba Dados.', 'neutral');
      return;
    }
    var ix = docPreviewSelectedTypes.indexOf(dt);
    if (ix >= 0) {
      docPreviewSelectedTypes.splice(ix, 1);
      if (docPreviewBlobUrls[dt]) {
        try { URL.revokeObjectURL(docPreviewBlobUrls[dt]); } catch (e) {}
        delete docPreviewBlobUrls[dt];
      }
    } else {
      docPreviewSelectedTypes.push(dt);
    }
    renderDocBrowseCards();
    refreshDocVaultPreview();
    updateSharePreview();
  }
  function openQrModal(url) {
    var modal = document.getElementById('kd-qr-modal');
    var wrap = document.getElementById('kd-qr-wrap');
    if (!modal || !wrap) return;
    wrap.innerHTML = '';
    modal.classList.add('kd-modal--open');
    modal.setAttribute('aria-hidden', 'false');
    function draw() {
      if (typeof QRCode === 'undefined' || typeof QRCode.toCanvas !== 'function') {
        wrap.textContent = 'QRCode indisponível.';
        return;
      }
      var canvas = document.createElement('canvas');
      var dark = document.body.classList.contains('kd-theme-dark');
      QRCode.toCanvas(canvas, url, {
        width: 220,
        margin: 2,
        color: { dark: dark ? '#e8ebe9' : '#1a1714', light: dark ? '#1a221c' : '#ffffff' }
      }, function (err) {
        if (err) {
          wrap.textContent = 'Não foi possível gerar o QR.';
          return;
        }
        wrap.appendChild(canvas);
      });
    }
    draw();
  }
  function closeQrModal() {
    var modal = document.getElementById('kd-qr-modal');
    if (modal) {
      modal.classList.remove('kd-modal--open');
      modal.setAttribute('aria-hidden', 'true');
    }
    var w = document.getElementById('kd-qr-wrap');
    if (w) w.innerHTML = '';
  }
  function openShortcutModal(editId) {
    var m = document.getElementById('kd-shortcut-modal');
    if (m) {
      m.classList.add('kd-modal--open');
      m.setAttribute('aria-hidden', 'false');
    }
    var editEl = document.getElementById('kd-sc-edit-id');
    if (editEl) editEl.value = editId || '';
    setShortcutDeleteVisible(!!editId);
    var titleEl = document.getElementById('kd-shortcut-title');
    if (titleEl) titleEl.textContent = editId ? 'Editar atalho' : 'Novo atalho';
    var nameEl = document.getElementById('kd-sc-name');
    if (nameEl) nameEl.value = '';
    setShortcutEmoji('');
    closeEmojiPopover();
    var img = document.getElementById('kd-sc-img');
    if (img) img.value = '';
    if (editId) {
      var arr = loadCustomShortcuts();
      var it = arr.find(function (x) { return x.id === editId; });
      if (it) {
        if (nameEl) nameEl.value = it.name || '';
        setShortcutEmoji(it.icon || '');
        if (it.pairs && it.pairs.length) {
          renderShareTableInto('kd-sc-share-grid', 'msc');
          renderExtraDocsInto('kd-sc-extra-docs');
          clearModalShareRoots();
          it.pairs.forEach(function (entry) {
            var fr = document.getElementById('kd-sc-share-grid');
            var er = document.getElementById('kd-sc-extra-docs');
            applyOnePresetEntryIn(fr, er, entry);
          });
        } else if (it.presetKey && PRESETS[it.presetKey]) {
          renderShareTableInto('kd-sc-share-grid', 'msc');
          renderExtraDocsInto('kd-sc-extra-docs');
          clearModalShareRoots();
          PRESETS[it.presetKey].forEach(function (entry) {
            applyOnePresetEntryIn(document.getElementById('kd-sc-share-grid'), document.getElementById('kd-sc-extra-docs'), entry);
          });
        } else {
          syncModalShareFromMain();
        }
      } else {
        syncModalShareFromMain();
      }
    } else {
      syncModalShareFromMain();
    }
  }
  function clearModalShareRoots() {
    var fr = document.getElementById('kd-sc-share-grid');
    var er = document.getElementById('kd-sc-extra-docs');
    if (fr) {
      fr.querySelectorAll('.st').forEach(function (c) { c.checked = false; });
      fr.querySelectorAll('.sf').forEach(function (c) { c.checked = false; });
    }
    if (er) er.querySelectorAll('.xd-check').forEach(function (c) { c.checked = false; });
  }
  function syncModalShareFromMain() {
    var st = collectShareState();
    renderShareTableInto('kd-sc-share-grid', 'msc');
    renderExtraDocsInto('kd-sc-extra-docs');
    applyShareStateToRoots(document.getElementById('kd-sc-share-grid'), document.getElementById('kd-sc-extra-docs'), st, false);
  }
  function setShortcutDeleteVisible(show) {
    var delBtn = document.getElementById('kd-sc-delete');
    if (!delBtn) return;
    if (show) delBtn.removeAttribute('hidden');
    else delBtn.setAttribute('hidden', '');
  }
  function closeShortcutModal() {
    closeEmojiPopover();
    setShortcutDeleteVisible(false);
    var m = document.getElementById('kd-shortcut-modal');
    if (m) {
      m.classList.remove('kd-modal--open');
      m.setAttribute('aria-hidden', 'true');
    }
  }
  const GROUPS = [
    { id: 'pessoal', title: 'Dados pessoais', icon: '', keys: ['Nome Completo','Data de Nasc.','RG','CPF'] },
    { id: 'contato', title: 'Contato', icon: '', keys: ['WhatsApp','E-mail','Instagram'] },
    { id: 'endereco', title: 'Endereço pessoal', icon: '', keys: ['Rua','Bairro','Cidade','CEP'] },
    { id: 'financeiro', title: 'Financeiro & PIX (PF)', icon: '', keys: ['PIX (CPF)','Banco','Agência','Conta'] },
    { id: 'empresa', title: 'Dados da empresa', icon: '', keys: ['Razão Social','CNPJ','IE','C.C.M','E-mail','Site','Endereço','Bairro','Cidade','CEP'] },
    { id: 'financeiropj', title: 'Financeiro & PIX (PJ)', icon: '', keys: ['PIX (CNPJ)','Favorecido','Banco','Agência','Conta'] }
  ];
  var CUSTOM_SHORTCUTS_KEY = 'kingDocs_custom_atalhos_v1';

  /** Atalhos rápidos: [groupId, key] ou [groupId, key, modo] — modo t=texto, f=ficheiro (foto/PDF), b=ambos */
  const PRESETS = {
    festa: [
      ['endereco', 'Rua', 't'], ['endereco', 'Bairro', 't'], ['endereco', 'Cidade', 't'], ['endereco', 'CEP', 't'],
      ['contato', 'WhatsApp', 't'],
      ['pessoal', 'RG', 'f'],
    ],
    receberPf: [
      ['pessoal', 'Nome Completo', 't'], ['pessoal', 'CPF', 't'],
      ['financeiro', 'PIX (CPF)', 't'], ['financeiro', 'Banco', 't'], ['financeiro', 'Agência', 't'], ['financeiro', 'Conta', 't'],
    ],
    receberPj: [
      ['empresa', 'Razão Social', 't'], ['empresa', 'CNPJ', 't'],
      ['financeiropj', 'PIX (CNPJ)', 't'], ['financeiropj', 'Favorecido', 't'], ['financeiropj', 'Banco', 't'], ['financeiropj', 'Agência', 't'], ['financeiropj', 'Conta', 't'],
    ],
    correspondencia: [
      ['pessoal', 'Nome Completo', 't'], ['endereco', 'Rua', 't'], ['endereco', 'Bairro', 't'], ['endereco', 'Cidade', 't'], ['endereco', 'CEP', 't'],
    ],
    enviarNf: [
      ['empresa', 'Razão Social', 't'], ['empresa', 'CNPJ', 't'], ['empresa', 'IE', 't'], ['empresa', 'C.C.M', 't'], ['empresa', 'E-mail', 't'],
      ['empresa', 'Endereço', 't'], ['empresa', 'Bairro', 't'], ['empresa', 'Cidade', 't'], ['empresa', 'CEP', 't'],
    ],
  };

  /** Nome e ícone sugeridos ao personalizar um atalho fixo (oZ) */
  var PRESET_BAR_META = {
    festa: { name: 'Festa em Casa', emoji: '' },
    receberPf: { name: 'Receber PF', emoji: '' },
    receberPj: { name: 'Receber PJ', emoji: '' },
    correspondencia: { name: 'Correspondência', emoji: '' },
    enviarNf: { name: 'Enviar NF', emoji: '' },
  };
  function openShortcutModalFromPreset(presetId) {
    var list = PRESETS[presetId];
    if (!list) return;
    var m = document.getElementById('kd-shortcut-modal');
    if (m) {
      m.classList.add('kd-modal--open');
      m.setAttribute('aria-hidden', 'false');
    }
    var editEl = document.getElementById('kd-sc-edit-id');
    if (editEl) editEl.value = '';
    setShortcutDeleteVisible(false);
    var titleEl = document.getElementById('kd-shortcut-title');
    if (titleEl) titleEl.textContent = 'Personalizar atalho';
    var meta = PRESET_BAR_META[presetId] || { name: String(presetId), emoji: '' };
    var nameEl = document.getElementById('kd-sc-name');
    if (nameEl) nameEl.value = meta.name;
    setShortcutEmoji(meta.emoji);
    closeEmojiPopover();
    var img = document.getElementById('kd-sc-img');
    if (img) img.value = '';
    renderShareTableInto('kd-sc-share-grid', 'msc');
    renderExtraDocsInto('kd-sc-extra-docs');
    clearModalShareRoots();
    list.forEach(function (entry) {
      applyOnePresetEntryIn(document.getElementById('kd-sc-share-grid'), document.getElementById('kd-sc-extra-docs'), entry);
    });
  }

  function normalizePresetMode(m) {
    var s = String(m == null ? 't' : m).toLowerCase();
    if (s === 'text' || s === 'txt') return 't';
    if (s === 'file' || s === 'foto' || s === 'ficheiro') return 'f';
    if (s === 'both' || s === 'b' || s === 'tf' || s === 'ambos') return 'b';
    if (s === 't' || s === 'f' || s === 'b') return s;
    return 't';
  }
  function fieldKeyToDocTypeHint(key, g) {
    var k = String(key || '');
    var gg = String(g || '');
    if (gg === 'pessoal') {
      if (k === 'RG') return 'RG';
      if (k === 'CPF') return 'CPF';
    }
    if (gg === 'empresa') {
      if (k === 'CNPJ') return 'CARTfO DO CNPJ';
      if (k === 'IE') return 'INSC. ESTADUAL';
    }
    return k;
  }
  function findFileForFieldHint(g, k) {
    var hint = fieldKeyToDocTypeHint(k, g);
    var f = getLatestFileForDocType(hint);
    if (f) return f;
    f = getLatestFileForDocType(k);
    if (f) return f;
    var want = normalizeDocTypeKey(hint);
    var best = null;
    filesList.forEach(function (x) {
      if (normalizeDocTypeKey(x.doc_type) === want) best = x;
    });
    return best;
  }
  function fieldPairForDocType(dt) {
    var d = normalizeDocTypeKey(dt);
    var map = [
      ['RG', ['pessoal', 'RG']],
      ['CPF', ['pessoal', 'CPF']],
      ['CARTfO DO CNPJ', ['empresa', 'CNPJ']],
      ['CARTAO DO CNPJ', ['empresa', 'CNPJ']],
      ['INSC. ESTADUAL', ['empresa', 'IE']],
    ];
    for (var i = 0; i < map.length; i++) {
      if (normalizeDocTypeKey(map[i][0]) === d) return map[i][1];
    }
    return null;
  }
  function applyFieldModeToBlock(block, mode) {
    var m = normalizePresetMode(mode);
    var fid = fieldBlockFid(block);
    var st = block.querySelector('' + fid + '');
    var sf = block.querySelector('' + fid + '');
    var fk = block.getAttribute('data-fk') || '';
    var parts = fk.split('|');
    var g = parts[0];
    var k = parts.slice(1).join('|');
    var wantT = (m === 't' || m === 'b');
    var wantF = (m === 'f' || m === 'b');
    if (st) st.checked = wantT;
    if (sf) sf.checked = wantF;
    if (wantF) ensureVaultDocTypeSelectedForField(g, k);
  }
  function applyExtraDocPresetEntry(docType, extraRootEl) {
    var root = extraRootEl || document.getElementById('extra-docs-wrap');
    if (!root) root = document;
    var dt = String(docType || '').trim();
    if (!dt) return;
    var f = getLatestFileForDocType(dt);
    if (!f) {
      var want = normalizeDocTypeKey(dt);
      filesList.forEach(function (x) {
        if (!f && normalizeDocTypeKey(x.doc_type) === want) f = x;
      });
    }
    if (!f) return;
    var ch = root.querySelector('.xd-check[data-fid="' + f.id + '');
    if (!ch) return;
    ch.checked = true;
    var lab = root.querySelector('.xd-label[data-fid="' + f.id + '');
    if (lab && !String(lab.value || '').trim()) {
      var preset = DOC_CARD_PRESETS.find(function (p) { return normalizeDocTypeKey(p.docType) === normalizeDocTypeKey(f.doc_type); });
      lab.value = preset ? preset.label : (f.doc_type || 'Documento');
    }
  }
  function applyOnePresetEntryIn(fieldRoot, extraRoot, entry) {
    if (entry && typeof entry === 'object' && !Array.isArray(entry) && entry.extraDoc) {
      applyExtraDocPresetEntry(String(entry.extraDoc), extraRoot);
      return;
    }
    if (!Array.isArray(entry) || entry.length < 2) return;
    var g = entry[0];
    var k = entry[1];
    var mode = entry.length >= 3 ? entry[2] : 't';
    var fk = g + '|' + k;
    var block = shareFieldBlockIn(fieldRoot, fk);
    if (!block) return;
    applyFieldModeToBlock(block, mode);
  }
  function applyOnePresetEntry(entry) {
    var w = document.getElementById('share-table-wrap');
    var ex = document.getElementById('extra-docs-wrap');
    applyOnePresetEntryIn(w, ex, entry);
  }
  function applyDocTypeQuick(docType) {
    ensureFieldData();
    var dt = String(docType || '').trim();
    if (!dt) return;
    var pair = fieldPairForDocType(dt);
    if (pair) {
      setShareCardModes(pair[0], pair[1], dt, false, true);
      if (!findFileForFieldHint(pair[0], pair[1])) {
        showToast('Envia o ficheiro Â«' + dt + 'Â» na aba Dados antes de partilhar.', 'neutral');
      } else {
        showToast('Marcado: Foto/PDF no cartão Â«' + docTypeLabel(dt) + 'Â».', 'ok');
      }
    } else {
      setShareCardModes(null, null, dt, false, true);
      if (!fileExistsForDocType(dt)) {
        showToast('Ainda não tens este tipo no cofre. Envia na aba Dados.', 'neutral');
        return;
      }
      showToast('Marcado: Foto/PDF no cartão.', 'ok');
    }
    clearAtalhoActive();
    syncDocPreviewFromShareCards();
    updateSharePreview();
  }

  let fieldData = {};
  let filesList = [];
  var vaultDirty = false;
  var VAULT_META_KEY = '_meta';

  function getVaultMeta() {
    ensureFieldData();
    if (!fieldData[VAULT_META_KEY] || typeof fieldData[VAULT_META_KEY] !== 'object') fieldData[VAULT_META_KEY] = {};
    return fieldData[VAULT_META_KEY];
  }
  function getDisplayName() {
    return String((getVaultMeta().displayName != null ? getVaultMeta().displayName : '') || '').trim();
  }
  function setDisplayName(name) {
    getVaultMeta().displayName = String(name || '').trim();
  }
  function applyDisplayNameToHero() {
    var el = document.getElementById('sh-name');
    if (!el) return;
    var dn = getDisplayName();
    var nc = fieldData.pessoal && String(fieldData.pessoal['Nome Completo'] || '').trim();
    var finalName = dn || nc;
    if (!finalName) return;
    el.value = finalName;
    setDisplayName(finalName);
    if (!fieldData.pessoal) fieldData.pessoal = {};
    fieldData.pessoal['Nome Completo'] = finalName;
  }
  function syncHeroNameToForm(name) {
    var v = String(name || '').trim();
    setDisplayName(v);
    if (!fieldData.pessoal) fieldData.pessoal = {};
    fieldData.pessoal['Nome Completo'] = v;
    var ncInp = document.querySelector('#p-dados input[data-g="pessoal"][data-k="Nome Completo"]');
    if (ncInp && ncInp.value !== v) ncInp.value = v;
  }
  function collectFieldDataFromDom() {
    ensureFieldData();
    var panel = document.getElementById('p-dados');
    if (!panel) return;
    panel.querySelectorAll('input[data-g][data-k]').forEach(function (inp) {
      var g = inp.getAttribute('data-g');
      var k = inp.getAttribute('data-k');
      if (!fieldData[g]) fieldData[g] = {};
      fieldData[g][k] = inp.value;
    });
  }
  function syncNamesBeforeSave() {
    collectFieldDataFromDom();
    var hero = document.getElementById('sh-name');
    var heroVal = hero ? String(hero.value || '').trim() : '';
    var ncVal = fieldData.pessoal && String(fieldData.pessoal['Nome Completo'] || '').trim();
    var finalName = heroVal || ncVal;
    if (finalName) {
      setDisplayName(finalName);
      if (!fieldData.pessoal) fieldData.pessoal = {};
      fieldData.pessoal['Nome Completo'] = finalName;
      if (hero && hero.value !== finalName) hero.value = finalName;
    }
  }
  function vaultHasSavedName() {
    if (getDisplayName()) return true;
    return !!(fieldData.pessoal && String(fieldData.pessoal['Nome Completo'] || '').trim());
  }
  function dadosDocStatusHtml(docType) {
    var dt = vaultDocTypeKeyForHint(docType);
    if (!dt) return '';
    var has = fileExistsForDocType(dt);
    var last = latestForDocType(dt);
    var cls = 'kd-dados-doc-status' + (has ? ' has-file' : '');
    var txt = has
      ? ('' + escapeHtml(docTypeLabel(dt)) + ' no cofre' + (last ? ' Â· ' + escapeHtml(formatShortDate(last)) : ''))
      : ('Sem ficheiro — envia foto ou PDF');
    return '' + cls + '" data-doc-type="' + escapeAttr(dt) + '' + txt + '</span>';
  }
  function bindDadosUploadButtons(root) {
    if (!root) return;
    root.querySelectorAll('.kd-dados-upload-btn').forEach(function (btn) {
      btn.onclick = function () {
        pendingDocType = this.getAttribute('data-doc-type') || '';
        var hid = document.getElementById('doc-file-hidden');
        if (hid) { hid.value = ''; hid.click(); }
      };
    });
  }
  function refreshDadosFieldDocStatuses() {
    document.querySelectorAll('.kd-dados-doc-status[data-doc-type]').forEach(function (span) {
      var dt = span.getAttribute('data-doc-type');
      var has = fileExistsForDocType(dt);
      var last = latestForDocType(dt);
      span.className = 'kd-dados-doc-status' + (has ? ' has-file' : '');
      span.textContent = has
        ? ('' + docTypeLabel(dt) + ' no cofre' + (last ? ' Â· ' + formatShortDate(last) : ''))
        : 'Sem ficheiro — envia foto ou PDF';
    });
  }

  function setVaultDirty(on) {
    vaultDirty = !!on;
    var heroBar = document.getElementById('kd-hero-dirty-banner');
    if (heroBar) heroBar.hidden = !vaultDirty;
    var dadosBar = document.getElementById('kd-dados-dirty-banner');
    if (dadosBar) dadosBar.hidden = !vaultDirty;
  }

  function ensureFieldData() {
    GROUPS.forEach(g => {
      if (!fieldData[g.id]) fieldData[g.id] = {};
      g.keys.forEach(k => { if (fieldData[g.id][k] == null) fieldData[g.id][k] = ''; });
    });
  }

  function renderDados() {
    ensureFieldData();
    const el = document.getElementById('p-dados');
    var vaultHint = formatVaultSavedHint();
    let html = '<div id="kd-dados-dirty-banner" class="kd-dirty-banner" ' + (vaultDirty ? '' : 'hidden') + '><span>Tens alterações por guardar no servidor.</span><button type="button" class="btn" id="kd-dados-save-quick" style="font-size:.78rem;padding:.4rem .75rem">Guardar no servidor</button></div>';
    html += '<p class="sub">Preenche texto e envia documentos no mesmo sítio. <strong>Guardar no servidor</strong> grava tudo (nome, campos e documentos). Depois escolhe o que partilhar em <strong>Documentos</strong>.</p>';
    if (vaultHint) html += '<p class="kd-dados-saved-hint">' + escapeHtml(vaultHint) + '</p>';
    html += '<div class="btn-row">';
    html += '<button type="button" class="btn" id="btn-save-vault">Guardar no servidor</button>';
    html += '<button type="button" class="btn secondary" id="btn-import-profile">Importar do perfil (cartão)</button>';
    html += '<button type="button" class="btn secondary" id="btn-export-pdf">Exportar PDF</button>';
    html += '</div>';
    GROUPS.forEach(g => {
      html += '<details class="kd-collapsible" open><summary>' + escapeHtml(g.title) + '</summary><div class="kd-collapsible-body">';
      g.keys.forEach(k => {
        const v = (fieldData[g.id] && fieldData[g.id][k]) || '';
        const docHint = fieldKeyToDocTypeHint(k, g.id);
        const canonDt = docHint ? vaultDocTypeKeyForHint(docHint) : null;
        if (canonDt) {
          html += '<div class="kd-dados-field">';
          html += '<div class="row"><label>' + escapeHtml(k) + '</label><input type="text" data-g="' + escapeHtml(g.id) + '' + escapeHtml(k) + '' + escapeAttr(v) + '';
          html += '<div class="kd-dados-doc-row">' + dadosDocStatusHtml(docHint);
          html += '<button type="button" class="btn secondary kd-dados-upload-btn" data-doc-type="' + escapeAttr(canonDt) + '" style="font-size:.76rem;padding:.35rem .65rem">Enviar foto/PDF</button></div>';
          html += '</div>';
        } else {
          html += '<div class="row"><label>' + escapeHtml(k) + '</label><input type="text" data-g="' + escapeHtml(g.id) + '' + escapeHtml(k) + '' + escapeAttr(v) + '';
        }
      });
      html += '</div></details>';
    });
    html += '<details class="kd-collapsible" open><summary>Documentos no cofre (enviar ficheiros)</summary><div class="kd-collapsible-body">';
    html += '<p class="sub" style="margin-top:0">Cada cartão abre o explorador para esse tipo. Depois marca o que queres partilhar em <strong>Documentos</strong>.</p>';
    html += '<div class="doc-panel-card"><div class="doc-badge" role="status"><span aria-hidden="true">Y"Z</span> Enviar ao cofre</div>';
    html += '<div id="doc-upload-root" class="doc-grid"></div>';
    html += '<div class="kd-custom-doctypes" id="kd-custom-doctypes-wrap">';
    html += '<p class="group" style="margin:0 0 .5rem;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Tipos extra (nome + ícone)</p>';
    html += '<div class="kd-custom-doctype-form" style="position:relative">';
    html += '<input type="text" id="kd-cdt-label" placeholder="Nome (ex.: Passaporte)" maxlength="60"/>';
    html += '<span class="kd-cdt-emoji-wrap"><input type="text" id="kd-cdt-icon" maxlength="8" value="Y"Z" style="max-width:3.2rem"/>';
    html += '<button type="button" class="btn secondary" id="kd-cdt-emoji-btn" style="padding:.35rem .5rem;font-size:1rem">Y~?</button>';
    html += '<div id="kd-cdt-emoji-pop" class="kd-cdt-emoji-pop" hidden></div></span>';
    html += '<button type="button" class="btn secondary" id="kd-cdt-add">Adicionar tipo</button></div>';
    html += '<ul id="kd-cdt-list" class="kd-cdt-list"></ul></div></div>';
    html += '<p class="doc-fallback-title">Outro documento</p>';
    html += '<input type="file" id="up-file"/><input type="text" id="up-type" placeholder="Tipo" style="max-width:220px;margin-left:.5rem"/>';
    html += '<button type="button" class="btn" id="up-btn">Enviar</button>';
    html += '<div id="file-list" style="margin-top:1rem"></div></div></details>';
    el.innerHTML = html;
    document.getElementById('btn-save-vault').onclick = saveVault;
    var qSave = document.getElementById('kd-dados-save-quick');
    if (qSave) qSave.onclick = function () { saveVault(); };
    document.getElementById('btn-import-profile').onclick = importFromProfile;
    document.getElementById('btn-export-pdf').onclick = exportVaultPdf;
    bindDadosUploadButtons(el);
    initKdCdtEmojiPicker();
    renderCustomDocTypesList();
    bindCustomDocTypeAdd();
    renderDocUploadCards();
    el.querySelectorAll('input[data-g]').forEach(inp => {
      function syncField() {
        const g = inp.getAttribute('data-g');
        const k = inp.getAttribute('data-k');
        if (!fieldData[g]) fieldData[g] = {};
        fieldData[g][k] = inp.value;
        if (g === 'pessoal' && k === 'Nome Completo') syncHeroNameToForm(inp.value);
        setVaultDirty(true);
      }
      inp.addEventListener('input', syncField);
      inp.addEventListener('change', syncField);
    });
    var upBtn = document.getElementById('up-btn');
    if (upBtn) upBtn.onclick = async function () {
      const inp = document.getElementById('up-file');
      if (!inp || !inp.files || !inp.files[0]) { showToast('Escolhe um ficheiro primeiro.', 'neutral'); return; }
      var ok = await uploadKingDocFile(inp.files[0], document.getElementById('up-type').value || 'documento');
      if (!ok) { showToast('Erro no upload.', 'err'); return; }
      inp.value = '';
      showToast('Ficheiro enviado.', 'ok');
      loadFiles();
    };
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  var KD_EMOJI_PICKER = (
    'ðŸ“„ â­ âœ… ðŸ“Œ ðŸ“Ž ðŸ“ ðŸ“· ðŸªª ðŸš— ðŸ¢ ðŸ  âœ‰ï¸ ðŸ“± ðŸ’¼ ðŸ§¾ ðŸ”‘ ðŸ’³ ðŸ¦ ðŸ“ ðŸŒ ' +
    'ðŸ‘¤ ðŸ‘¥ ðŸ’ ðŸ‘¶ ðŸ“ ðŸ”’ ðŸ—“ï¸ â˜Žï¸ ðŸ’¬ ðŸ·ï¸'
  ).trim().split(/\s+/);

  function setShortcutEmoji(ch, skipManual) {
    var raw = ch != null ? String(ch) : '';
    var v = raw.trim().slice(0, 8);
    if (!v) v = 'ðŸ“„';
    var hid = document.getElementById('kd-sc-emoji');
    var prev = document.getElementById('kd-sc-emoji-preview');
    var manual = document.getElementById('kd-sc-emoji-manual');
    if (hid) hid.value = v;
    if (prev) prev.textContent = v;
    if (manual && !skipManual) manual.value = v;
  }
  function closeEmojiPopover() {
    var pop = document.getElementById('kd-emoji-popover');
    var toggle = document.getElementById('kd-emoji-toggle');
    if (pop) pop.setAttribute('hidden', '');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
  function initKdEmojiPicker() {
    var grid = document.getElementById('kd-emoji-grid');
    var toggle = document.getElementById('kd-emoji-toggle');
    var pop = document.getElementById('kd-emoji-popover');
    var manual = document.getElementById('kd-sc-emoji-manual');
    if (!grid) return;
    grid.innerHTML = KD_EMOJI_PICKER.map(function (emo) {
      return '<button type="button" class="kd-emoji-opt" data-emoji="' + escapeAttr(emo) + '' + escapeAttr(emo) + '' + escapeAttr(emo) + '' + emo + '</button>';
    }).join('');
    grid.querySelectorAll('.kd-emoji-opt').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        setShortcutEmoji(this.getAttribute('data-emoji') || this.textContent);
        closeEmojiPopover();
      };
    });
    if (toggle && pop) {
      toggle.onclick = function (e) {
        e.stopPropagation();
        if (pop.hasAttribute('hidden')) {
          pop.removeAttribute('hidden');
          toggle.setAttribute('aria-expanded', 'true');
        } else {
          closeEmojiPopover();
        }
      };
    }
    if (manual) {
      manual.addEventListener('input', function () {
        var v = this.value.trim().slice(0, 8) || '';
        var hid = document.getElementById('kd-sc-emoji');
        var prev = document.getElementById('kd-sc-emoji-preview');
        if (hid) hid.value = v;
        if (prev) prev.textContent = v;
      });
    }
    document.addEventListener('click', function (e) {
      if (!pop || pop.hasAttribute('hidden')) return;
      var t = e.target;
      if (pop.contains(t) || (toggle && toggle.contains(t))) return;
      closeEmojiPopover();
    });
  }

  function initKdCdtEmojiPicker() {
    var grid = document.getElementById('kd-cdt-emoji-pop');
    var btn = document.getElementById('kd-cdt-emoji-btn');
    var iconInp = document.getElementById('kd-cdt-icon');
    if (!grid || !btn || !KD_EMOJI_PICKER.length) return;
    grid.innerHTML = KD_EMOJI_PICKER.map(function (emo) {
      return '<button type="button" class="kd-emoji-opt" data-emoji="' + escapeAttr(emo) + '' + escapeAttr(emo) + '' + emo + '</button>';
    }).join('');
    grid.querySelectorAll('.kd-emoji-opt').forEach(function (b) {
      b.onclick = function (ev) {
        ev.stopPropagation();
        var ch = (this.getAttribute('data-emoji') || this.textContent || '').trim().slice(0, 8);
        if (iconInp) iconInp.value = ch || '';
        grid.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', 'false');
      };
    });
    btn.onclick = function (ev) {
      ev.stopPropagation();
      if (grid.hasAttribute('hidden')) {
        grid.removeAttribute('hidden');
        btn.setAttribute('aria-expanded', 'true');
      } else {
        grid.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', 'false');
      }
    };
    document.addEventListener('click', function cdtEmojiDocClick(ev) {
      if (grid.hasAttribute('hidden')) return;
      if (grid.contains(ev.target) || btn.contains(ev.target)) return;
      grid.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  async function loadVault() {
    if (window.CkAuth && typeof window.CkAuth.requireAuth === 'function') {
      if (!(await window.CkAuth.requireAuth('/login?returnUrl=' + encodeURIComponent(location.href)))) return;
    } else if (!getToken()) {
      document.getElementById('auth-hint').textContent = 'Inicia sessão no Conecta King e abre esta página a partir do painel (com token guardado).';
      return;
    }
    document.getElementById('auth-hint').textContent = '';
    setAppLoading(true);
    try {
      const r = await fetch(api('/api/king-docs/vault'), { headers: authHeaders() });
      if (r.status === 403) {
        document.getElementById('auth-hint').textContent = 'O módulo King Docs não está disponível no teu plano.';
        return;
      }
      if (!r.ok) {
        document.getElementById('auth-hint').textContent = 'Não foi possível carregar o cofre. Atualiza a página ou tenta mais tarde.';
        showToast('Erro ao carregar o cofre.', 'err');
        return;
      }
      const j = await r.json();
      const d = j.data && j.data.fieldData;
      if (d && typeof d === 'object') fieldData = d;
      ensureFieldData();
      setVaultDirty(false);
      applyDisplayNameToHero();
      renderDados();
      renderUnifiedShareCards();
      await loadFiles();
      await loadLinks();
    } finally {
      setAppLoading(false);
    }
  }

  async function saveVault() {
    syncNamesBeforeSave();
    var btns = [
      document.getElementById('btn-save-vault'),
      document.getElementById('kd-dados-save-quick'),
      document.getElementById('kd-hero-save-quick')
    ];
    btns.forEach(function (b) { if (b) { b.disabled = true; b.textContent = ''; } });
    try {
      const r = await fetch(api('/api/king-docs/vault'), { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ fieldData }) });
      const j = await r.json().catch(function () { return {}; });
      if (!r.ok || j.success === false) {
        showToast((j && j.message) || 'Não foi possível guardar no servidor. Tenta outra vez.', 'err');
        return;
      }
      if (j.data && j.data.fieldData && typeof j.data.fieldData === 'object') fieldData = j.data.fieldData;
      ensureFieldData();
      try { localStorage.setItem(VAULT_SAVED_AT_KEY, String(Date.now())); } catch (e) {}
      setVaultDirty(false);
      applyDisplayNameToHero();
      showToast('Guardado no servidor.', 'ok');
      renderDados();
      renderUnifiedShareCards();
    } catch (e) {
      showToast('Erro de rede ao guardar. Verifica a ligação.', 'err');
    } finally {
      btns.forEach(function (b) {
        if (!b) return;
        b.disabled = false;
        if (b.id === 'btn-save-vault') b.textContent = 'Guardar no servidor';
        else b.textContent = 'Guardar no servidor';
      });
    }
  }

  async function importFromProfile() {
    const r = await fetch(api('/api/king-docs/vault/import-profile'), { method: 'POST', headers: authHeaders() });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { showToast(j.message || 'Não foi possível importar o perfil.', 'err'); return; }
    const d = j.data && j.data.fieldData;
    if (d && typeof d === 'object') fieldData = d;
    ensureFieldData();
    setVaultDirty(false);
    applyDisplayNameToHero();
    renderDados();
    renderUnifiedShareCards();
    showToast(j.message || 'Dados do perfil importados.', 'ok');
  }

  async function exportVaultPdf() {
    const r = await fetch(api('/api/king-docs/vault/export-pdf'), { headers: authHeaders() });
    if (!r.ok) { showToast('Erro ao gerar o PDF.', 'err'); return; }
    const blob = await r.blob();
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = 'king-docs-cofre.pdf';
    a.click();
    URL.revokeObjectURL(u);
    showToast('PDF exportado — backup do cofre descarregado.', 'ok');
  }

  function fileExistsForDocType(docType) {
    const t = String(docType).trim();
    return filesList.some(function (f) { return String(f.doc_type || '').trim() === t; });
  }

  var CUSTOM_DOC_TYPES_KEY = 'kingDocs_custom_doc_types_v1';
  var VAULT_SAVED_AT_KEY = 'kingDocs_vault_saved_hint_v1';
  function loadCustomDocTypes() {
    try {
      var raw = localStorage.getItem(CUSTOM_DOC_TYPES_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter(function (x) { return x && String(x.docType || '').trim(); }) : [];
    } catch (e) { return []; }
  }
  function saveCustomDocTypes(arr) {
    try { localStorage.setItem(CUSTOM_DOC_TYPES_KEY, JSON.stringify(arr)); } catch (e) {}
  }
  function normalizeDocTypeKey(s) {
    return String(s || '').trim().toUpperCase().slice(0, 80);
  }
  function getDocCardPresetsMerged() {
    var seen = {};
    var out = [];
    DOC_CARD_PRESETS.forEach(function (p) {
      seen[p.docType] = true;
      out.push({ docType: p.docType, label: p.label, icon: p.icon, isCustom: false });
    });
    loadCustomDocTypes().forEach(function (c) {
      var dt = normalizeDocTypeKey(c.docType);
      if (!dt || seen[dt]) return;
      seen[dt] = true;
      out.push({
        docType: dt,
        label: String(c.label || dt).trim().slice(0, 60),
        icon: (String(c.icon || '').trim().slice(0, 8) || ''),
        isCustom: true
      });
    });
    if (filesList && filesList.length) {
      filesList.forEach(function (f) {
        var raw = String(f.doc_type || '').trim();
        if (!raw) return;
        if (seen[raw]) return;
        seen[raw] = true;
        out.push({ docType: raw, label: raw, icon: '', isCustom: true, orphan: true });
      });
    }
    return out;
  }
  function docTypeLabel(docType) {
    var t = String(docType || '').trim();
    var merged = getDocCardPresetsMerged();
    var p = merged.find(function (x) { return x.docType === t; });
    return p ? p.label : t;
  }
  /** Alinha o hint do campo (ex. RG) ao docType dos cartões (maiúsculas / acentos) */
  function vaultDocTypeKeyForHint(hint) {
    if (!hint) return null;
    var h = String(hint).trim();
    var merged = getDocCardPresetsMerged();
    var found = merged.find(function (x) {
      return normalizeDocTypeKey(x.docType) === normalizeDocTypeKey(h);
    });
    return found ? found.docType : h;
  }
  function docTypeSelectedInVault(dt) {
    if (!dt) return false;
    var card = findShareCard(null, null, dt);
    if (!card) return false;
    var sf = card.querySelector('.kd-sc-sf');
    return !!(sf && sf.checked);
  }
  function ensureVaultDocTypeSelectedForField(g, k) {
    var raw = fieldKeyToDocTypeHint(k, g);
    if (!raw) return;
    setShareCardModes(g, k, raw, false, true);
    syncDocPreviewFromShareCards();
  }
  function formatVaultSavedHint() {
    try {
      var raw = localStorage.getItem(VAULT_SAVED_AT_KEY);
      if (!raw) return '';
      var d = new Date(parseInt(raw, 10));
      if (isNaN(d.getTime())) return '';
      return 'ltima gravação neste dispositivo: ' + d.toLocaleString('pt-BR');
    } catch (e) { return ''; }
  }
  function renderCustomDocTypesList() {
    var ul = document.getElementById('kd-cdt-list');
    if (!ul) return;
    var arr = loadCustomDocTypes();
    if (!arr.length) {
      ul.innerHTML = '<li class="kd-cdt-empty">Nenhum tipo extra. Usa o formulário acima.</li>';
      return;
    }
    ul.innerHTML = arr.map(function (c, i) {
      return '<li class="kd-cdt-item"><span class="kd-cdt-ico" aria-hidden="true">' + escapeHtml(String(c.icon || '').slice(0, 8)) + '</span> <strong>' + escapeHtml(String(c.label || '').slice(0, 60)) + '</strong> <code style="font-size:.72rem;opacity:.85">' + escapeHtml(normalizeDocTypeKey(c.docType)) + '</code> ' +
        '<button type="button" class="btn secondary btn-kd-cdt-rem" data-i="' + i + '">Remover</button></li>';
    }).join('');
    ul.querySelectorAll('.btn-kd-cdt-rem').forEach(function (b) {
      b.onclick = function () {
        var ix = parseInt(this.getAttribute('data-i'), 10);
        var a = loadCustomDocTypes();
        if (ix < 0 || ix >= a.length) return;
        a.splice(ix, 1);
        saveCustomDocTypes(a);
        renderCustomDocTypesList();
        renderDocCards();
      };
    });
  }

  function renderDocUploadCards() {
    var root = document.getElementById('doc-upload-root');
    if (!root) return;
    var html = getDocCardPresetsMerged().map(function (p) {
      var sel = fileExistsForDocType(p.docType);
      var cls = 'doc-card' + (sel ? ' selected' : '');
      var lastD = latestForDocType(p.docType);
      var dateLine = lastD ? '<div class="dc-date">ltimo envio: ' + escapeHtml(formatShortDate(lastD)) + '</div>' : '';
      return '<button type="button" class="' + cls + '" data-doc-type="' + escapeAttr(p.docType) + '' + escapeAttr(p.label) + '' +
        '<div class="dc-icon" aria-hidden="true">' + p.icon + '</div>' +
        '<div class="dc-title">' + escapeHtml(p.label) + '</div>' +
        '<div class="dc-status">' + (sel ? '' : 'Toca para enviar') + '</div>' +
        dateLine +
        '</button>';
    }).join('');
    root.innerHTML = html;
    root.querySelectorAll('.doc-card[data-doc-type]').forEach(function (btn) {
      btn.onclick = function () {
        pendingDocType = this.getAttribute('data-doc-type') || '';
        var hid = document.getElementById('doc-file-hidden');
        if (hid) { hid.value = ''; hid.click(); }
      };
    });
  }
  function renderUnifiedShareCards() {
    var root = document.getElementById('doc-browse-root');
    if (!root) return;
    root.className = 'doc-grid doc-grid--unified';
    var addCard = '<button type="button" class="doc-card doc-card--browse doc-card--add-type" id="btn-kd-browse-new-type" title="Criar outro tipo de documento (nome + ícone)">' +
      '<div class="dc-icon" aria-hidden="true">z.</div>' +
      '<div class="dc-title">Novo tipo</div>' +
      '<div class="dc-status">Criar + ícone</div></button>';
    var html = addCard;
    buildShareSections().forEach(function (sec) {
      html += '<div class="kd-grid-section-label" role="heading" aria-level="3">' +
        '<span aria-hidden="true">' + (sec.icon || '') + '</span> ' + escapeHtml(sec.title) + '</div>';
      (sec.items || []).forEach(function (it) {
        html += renderShareCardHtml(it);
      });
    });
    root.innerHTML = html;
    var btnNew = document.getElementById('btn-kd-browse-new-type');
    if (btnNew) {
      btnNew.onclick = function (e) {
        e.preventDefault();
        var tab = document.getElementById('tab-p-dados');
        if (tab) tab.click();
        var el = document.getElementById('kd-custom-doctypes-wrap');
        if (el) { try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e2) {} }
        var inp = document.getElementById('kd-cdt-label');
        if (inp) inp.focus();
      };
    }
    root.querySelectorAll('.doc-card--share').forEach(function (card) {
      card.querySelectorAll('.kd-sc-st, .kd-sc-sf').forEach(function (inp) {
        inp.addEventListener('change', function () {
          var st = card.querySelector('.kd-sc-st');
          var sf = card.querySelector('.kd-sc-sf');
          card.classList.toggle('doc-card--on', !!((st && st.checked) || (sf && sf.checked)));
          clearAtalhoActive();
          syncDocPreviewFromShareCards();
          updateSharePreview();
        });
      });
    });
    syncDocPreviewFromShareCards();
  }
  function renderDocBrowseCards() {
    renderUnifiedShareCards();
  }
  function renderDocCards() {
    renderDocUploadCards();
    renderUnifiedShareCards();
    if (docPreviewSelectedTypes.length) {
      var pruned = docPreviewSelectedTypes.filter(function (dt) { return fileExistsForDocType(dt); });
      if (pruned.length !== docPreviewSelectedTypes.length) {
        docPreviewSelectedTypes = pruned;
        revokeDocPreviewBlobAll();
      }
      refreshDocVaultPreview();
    }
  }

  async function uploadKingDocFile(file, docTypeLabel) {
    var fd = new FormData();
    fd.append('file', file);
    fd.append('docType', docTypeLabel || 'documento');
    var upH = {};
    var tok = getToken();
    if (tok) upH.Authorization = 'Bearer ' + tok;
    var r = await fetch(api('/api/king-docs/files'), { method: 'POST', headers: upH, body: fd });
    return r.ok;
  }

  async function loadFiles() {
    const r = await fetch(api('/api/king-docs/files'), { headers: authHeaders() });
    if (!r.ok) return;
    const j = await r.json();
    filesList = (j.data && j.data.files) || [];
    renderDocCards();
    const el = document.getElementById('file-list');
    if (!filesList.length) { el.innerHTML = '<p class="sub">Ainda não tens ficheiros no cofre. Usa a aba <strong>Dados</strong> (secção Documentos) para enviar o primeiro.</p>'; renderUnifiedShareCards(); refreshDadosFieldDocStatuses(); return; }
    el.innerHTML = filesList.map(f => {
      var dt = f.created_at ? formatShortDate(new Date(f.created_at)) : '';
      return '<div class="file-row"><span>#' + f.id + '' + escapeHtml(f.doc_type) + ' <code>' + escapeHtml(f.mime || '') + '</code>' +
        (dt ? ' <span style="opacity:.78;font-size:.78rem">Â· ' + escapeHtml(dt) + '</span>' : '') +
        '</span><button type="button" class="btn secondary btn-del-file" data-id="' + f.id + '">Apagar</button></div>';
    }).join('');
    el.querySelectorAll('.btn-del-file').forEach(b => {
      b.onclick = async function() {
        if (!confirm('Apagar este ficheiro do cofre?')) return;
        const id = this.getAttribute('data-id');
        await fetch(api('/api/king-docs/files/' + id), { method: 'DELETE', headers: authHeaders() });
        showToast('Ficheiro removido do cofre.', 'ok');
        loadFiles();
      };
    });
    renderUnifiedShareCards();
    var hidPf = document.getElementById('sh-profile-file-id');
    if (hidPf && !String(hidPf.value || '').trim()) {
      var pfLatest = getLatestFileForDocType('FOTO PESSOAL');
      if (pfLatest) hidPf.value = String(pfLatest.id);
    }
    refreshProfilePhotoPreview();
    refreshDadosFieldDocStatuses();
  }

  function clearAtalhoActive() {
    document.querySelectorAll('.btn-atalho[data-preset]').forEach(function (b) { b.classList.remove('active'); });
    document.querySelectorAll('.btn-atalho[data-custom-id]').forEach(function (b) { b.classList.remove('active'); });
  }

  function collectCurrentPresetPairsFrom(fieldRoot, extraRoot) {
    var pairs = [];
    var useRoot = fieldRoot;
    if (!useRoot || useRoot.id === 'share-table-wrap') useRoot = document.getElementById('doc-browse-root');
    if (useRoot) {
      useRoot.querySelectorAll('.doc-card--share').forEach(function (card) {
        var st = card.querySelector('.kd-sc-st');
        var sf = card.querySelector('.kd-sc-sf');
        var wantT = !!(st && st.checked);
        var wantF = !!(sf && sf.checked);
        if (!wantT && !wantF) return;
        var gid = card.getAttribute('data-gid') || '';
        var key = card.getAttribute('data-key') || '';
        var docType = card.getAttribute('data-doc-type') || '';
        if (gid && key) {
          var mode = wantT && wantF ? 'b' : (wantF ? 'f' : 't');
          pairs.push([gid, key, mode]);
        } else if (docType && wantF) {
          pairs.push({ extraDoc: docType });
        }
      });
    }
    return pairs;
  }
  function collectCurrentPresetPairs() {
    return collectCurrentPresetPairsFrom(document.getElementById('doc-browse-root'), null);
  }

  function loadCustomShortcuts() {
    try {
      var raw = localStorage.getItem(CUSTOM_SHORTCUTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function saveCustomShortcuts(arr) {
    try { localStorage.setItem(CUSTOM_SHORTCUTS_KEY, JSON.stringify(arr)); } catch (e) {}
  }
  function renderCustomShortcuts() {
    var host = document.getElementById('kd-custom-atalhos-inner');
    if (!host) return;
    var arr = loadCustomShortcuts();
    if (!arr.length) { host.innerHTML = ''; return; }
    host.innerHTML = arr.map(function (it) {
      var img = it.imageDataUrl ? '' + escapeAttr(it.imageDataUrl) + '" alt="" class="kd-atalho-img"/>' : '<span aria-hidden="true">' + escapeHtml(it.icon || '') + '</span>';
      return '<span class="kd-atalho-item"><button type="button" class="btn-atalho" data-custom-id="' + escapeAttr(it.id) + '" title="Aplicar: ' + escapeAttr(it.name) + '' + img + ' <span>' + escapeHtml(it.name) + '</span></button><button type="button" class="btn secondary kd-atalho-cog" data-edit-id="' + escapeAttr(it.id) + '" aria-label="Editar atalho" title="Editar">âš™</button></span>';
    }).join('');
    host.querySelectorAll('[data-custom-id]').forEach(function (btn) {
      btn.onclick = function () { applyCustomShortcut(this.getAttribute('data-custom-id')); };
    });
    host.querySelectorAll('[data-edit-id]').forEach(function (btn) {
      btn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        openShortcutModal(this.getAttribute('data-edit-id'));
      };
    });
  }
  function applyCustomShortcut(id) {
    var arr = loadCustomShortcuts();
    var it = arr.find(function (x) { return x.id === id; });
    if (!it) return;
    ensureFieldData();
    clearAllShareCards();
    var list = it.pairs && it.pairs.length ? it.pairs : (it.presetKey && PRESETS[it.presetKey] ? PRESETS[it.presetKey] : null);
    if (!list) return;
    list.forEach(function (entry) { applyPresetToShareCard(entry); });
    clearAtalhoActive();
    var b = document.querySelector('.btn-atalho[data-custom-id="' + id + '');
    if (b) b.classList.add('active');
    syncDocPreviewFromShareCards();
    updateSharePreview();
  }

  function applyPreset(presetId) {
    const list = PRESETS[presetId];
    if (!list) return;
    ensureFieldData();
    clearAllShareCards();
    list.forEach(function (entry) { applyPresetToShareCard(entry); });
    clearAtalhoActive();
    var activeBtn = document.querySelector('.btn-atalho[data-preset="' + presetId + '');
    if (activeBtn) activeBtn.classList.add('active');
    syncDocPreviewFromShareCards();
    updateSharePreview();
  }

  function collectSharePreviewData() {
    ensureFieldData();
    const sections = {};
    let count = 0;

    document.querySelectorAll('#doc-browse-root .doc-card--share').forEach(function (card) {
      var st = card.querySelector('.kd-sc-st');
      var sf = card.querySelector('.kd-sc-sf');
      var wantText = !!(st && st.checked);
      var wantFile = !!(sf && sf.checked);
      if (!wantText && !wantFile) return;
      var gid = card.getAttribute('data-gid') || '';
      var key = card.getAttribute('data-key') || '';
      var docType = card.getAttribute('data-doc-type') || '';
      var label = card.querySelector('.dc-title') ? card.querySelector('.dc-title').textContent : '';
      if (gid && key) {
        var val = (fieldData[gid] && fieldData[gid][key] != null) ? String(fieldData[gid][key]) : '';
        var valDisp = val.trim() ? val : '(vazio)';
        var gInfo = GROUPS.find(function (x) { return x.id === gid; });
        var title = gInfo ? gInfo.title : 'Outros';
        if (!sections[title]) sections[title] = [];
        var dtHint = fieldKeyToDocTypeHint(key, gid);
        var canon = dtHint ? vaultDocTypeKeyForHint(dtHint) : null;
        var fn = wantFile && canon ? (getLatestFileForDocType(canon) || findFileForFieldHint(gid, key)) : null;
        var fileLabel = fn ? ('#' + fn.id + ' ' + (fn.doc_type || '')) : '';
        if (wantText && fn) {
          sections[title].push({ kind: 'merged', label: key, val: valDisp, fileLabel: fileLabel });
          count++;
        } else if (wantText) {
          sections[title].push({ kind: 'text', label: key, val: valDisp });
          count++;
        } else if (fn) {
          sections[title].push({ kind: 'file', label: key, fileLabel: fileLabel });
          count++;
        }
      } else if (docType && wantFile) {
        var f = getLatestFileForDocType(docType);
        if (!f) return;
        if (!sections['Documentos']) sections['Documentos'] = [];
        sections['Documentos'].push({
          kind: 'vault',
          label: label || docTypeLabel(docType),
          fileLabel: '#' + f.id + ' ' + (f.doc_type || ''),
          docType: docType
        });
        count++;
      }
    });

    var showName = document.getElementById('sh-name') && document.getElementById('sh-name').value.trim();
    var pfId = document.getElementById('sh-profile-file-id') && document.getElementById('sh-profile-file-id').value.trim();
    var showPhoto = !!pfId;
    if (showName) count++;
    if (showPhoto) count++;
    return { sections: sections, count: count, showName: showName, showPhoto: showPhoto, showPhotoIsFile: showPhoto };
  }

  function formatSharePreviewPlainText(data) {
    if (!data || !data.count) return '';
    var lines = [];
    lines.push('King Docs — resumo do conteúdo do link');
    lines.push('');
    if (data.showName) {
      lines.push('Nome no topo: ' + data.showName);
      lines.push('');
    }
    if (data.showPhoto) {
      lines.push('Foto no topo: imagem enviada para o cofre.');
      lines.push('');
    }
    Object.keys(data.sections).forEach(function (title) {
      lines.push('' + title);
      data.sections[title].forEach(function (item) {
        if (item.kind === 'merged') {
          lines.push('' + item.label + ': ' + item.val + ' | ficheiro: ' + item.fileLabel);
        } else if (item.kind === 'text') lines.push('' + item.label + ': ' + item.val);
        else if (item.kind === 'file') lines.push('' + item.label + ' (ficheiro): ' + item.fileLabel);
        else if (item.kind === 'vault') lines.push('' + item.label + ': ' + item.fileLabel);
        else lines.push('  — Documento extra: ' + item.label);
      });
      lines.push('');
    });
    return lines.join('\n').trim();
  }

  function formatSharePreviewPlainTextTextOnly(data) {
    if (!data || !data.count) return '';
    var lines = [];
    lines.push('King Docs — só campos de texto');
    lines.push('');
    if (data.showName) {
      lines.push('Nome no topo: ' + data.showName);
      lines.push('');
    }
    Object.keys(data.sections).forEach(function (title) {
      var items = (data.sections[title] || []).filter(function (item) {
        return item.kind === 'text' || item.kind === 'merged';
      });
      if (!items.length) return;
      lines.push('' + title);
      items.forEach(function (item) {
        if (item.kind === 'merged') lines.push('' + item.label + ': ' + item.val);
        else lines.push('' + item.label + ': ' + item.val);
      });
      lines.push('');
    });
    return lines.join('\n').trim();
  }

  function updateSharePreview() {
    const out = document.getElementById('share-preview-body');
    const badge = document.getElementById('preview-count');
    if (!out || !badge) return;
    const data = collectSharePreviewData();
    const count = data.count;

    badge.textContent = count + ' itens';
    var hintEl = document.getElementById('share-confirm-hint');
    if (hintEl) {
      if (count === 0) {
        hintEl.textContent = 'Marca Texto e/ou Foto/PDF nos cartões; o link gera-se na aba Â«PartilharÂ».';
        hintEl.classList.remove('kd-share-summary--ok');
      } else {
        hintEl.textContent = 'Incluíste ' + count + ' ' + (count === 1 ? 'item' : 'itens') + ' — verifica o resumo no painel acima; na aba Â«PartilharÂ» usa Â«Gerar link seguroÂ» quando estiver correto.';
        hintEl.classList.add('kd-share-summary--ok');
      }
    }
    if (count === 0) {
      out.innerHTML = '<p class="preview-empty">Marca Texto e/ou Foto/PDF nos cartões Ã  esquerda.</p>';
      updateUnifiedActionButtons();
      return;
    }

    var html = '';
    if (data.showName || data.showPhoto) {
      html += '<div class="preview-sec"><h4>No topo do link</h4>';
      if (data.showName) html += '<div class="preview-line"><span class="pl">Nome</span><span class="pv">' + escapeHtml(data.showName) + '</span></div>';
      if (data.showPhoto) html += '<div class="preview-line"><span class="pl">Foto no topo</span><span class="pv">Imagem do cofre (enviada por ti)</span></div>';
      html += '</div>';
    }
    Object.keys(data.sections).forEach(function (title) {
      html += '<div class="preview-sec"><h4>' + escapeHtml(title) + '</h4>';
      data.sections[title].forEach(function (item) {
        if (item.kind === 'merged') {
          html += '<div class="preview-line preview-line--merged"><span class="pl">' + escapeHtml(item.label) + '</span><div class="pv-merge">';
          html += '<div class="pv-row"><span class="pv-sub">Texto</span><span class="pv">' + escapeHtml(item.val) + '</span></div>';
          html += '<div class="pv-row"><span class="pv-sub">Ficheiro</span><span class="pv">' + escapeHtml(item.fileLabel) + '</span></div>';
          html += '</div></div>';
        } else if (item.kind === 'text') {
          html += '<div class="preview-line"><span class="pl">' + escapeHtml(item.label) + '</span><span class="pv">' + escapeHtml(item.val) + '</span></div>';
        } else if (item.kind === 'file' || item.kind === 'vault') {
          html += '<div class="preview-line preview-line--merged"><span class="pl">' + escapeHtml(item.label) + '</span><div class="pv-merge">';
          html += '<div class="pv-row"><span class="pv-sub">Ficheiro</span><span class="pv">' + escapeHtml(item.fileLabel) + '</span></div></div></div>';
        } else {
          html += '<div class="preview-line"><span class="pl">Anexo</span><span class="pv">' + escapeHtml(item.label) + '</span></div>';
        }
      });
      html += '</div>';
    });
    out.innerHTML = html;
    updateUnifiedActionButtons();
  }

  function renderShareTableInto(wrapId, idPrefix) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    let idx = 0;
    let html = '';
    GROUPS.forEach(function (g) {
      html += '<div class="kd-share-cat" data-gid="' + escapeAttr(g.id) + '';
      html += '<div class="kd-share-cat-head">';
      html += '<span class="kd-share-cat-ico" aria-hidden="true">' + (g.icon || '') + '</span>';
      html += '<span class="kd-share-cat-title">' + escapeHtml(g.title) + '</span>';
      html += '<span class="kd-share-cat-bulk">';
      html += '<button type="button" class="kd-link-btn" data-select-all-gid="' + escapeAttr(g.id) + '">Selecionar todos</button>';
      html += '<button type="button" class="kd-link-btn" data-clear-all-gid="' + escapeAttr(g.id) + '">Limpar todos</button>';
      html += '</span>';
      html += '</div><div class="kd-share-cat-body">';
      g.keys.forEach(function (k) {
        const fid = idPrefix + (idx++);
        const fk = g.id + '|' + k;
        html += '<div class="kd-field-block kd-share-field-card" data-fk="' + escapeAttr(fk) + '';
        html += '<div class="kd-share-field-card-head">';
        html += '<span class="kd-share-field-card-ico" aria-hidden="true">' + (g.icon || '') + '</span>';
        html += '<span class="kd-share-field-name">' + escapeHtml(k) + '</span>';
        html += '</div>';
        html += '<div class="kd-field-adv kd-field-mode-picker">';
        html += '<label class="kd-mini"><input type="checkbox" class="st" data-fid="' + fid + '"/> Texto</label>';
        html += '<label class="kd-mini"><input type="checkbox" class="sf" data-fid="' + fid + '"/> Foto / PDF</label>';
        html += '</div></div>';
      });
      html += '</div></div>';
    });
    wrap.innerHTML = html;
    wrap.querySelectorAll('[data-select-all-gid]').forEach(function (btn) {
      btn.onclick = function () {
        var gid = this.getAttribute('data-select-all-gid');
        var cat = wrap.querySelector('.kd-share-cat[data-gid="' + gid + '');
        if (!cat) return;
        cat.querySelectorAll('.kd-field-block .st').forEach(function (c) { c.checked = true; });
        cat.querySelectorAll('.kd-field-block .sf').forEach(function (c) { c.checked = true; });
        clearAtalhoActive();
        if (idPrefix === 'f') updateSharePreview();
      };
    });
    wrap.querySelectorAll('[data-clear-all-gid]').forEach(function (btn) {
      btn.onclick = function () {
        var gid = this.getAttribute('data-clear-all-gid');
        var cat = wrap.querySelector('.kd-share-cat[data-gid="' + gid + '');
        if (!cat) return;
        cat.querySelectorAll('.kd-field-block .st').forEach(function (c) { c.checked = false; });
        cat.querySelectorAll('.kd-field-block .sf').forEach(function (c) { c.checked = false; });
        clearAtalhoActive();
        if (idPrefix === 'f') updateSharePreview();
      };
    });
    wrap.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.classList) return;
      if (!t.classList.contains('st') && !t.classList.contains('sf')) return;
      if (t.classList.contains('sf') && t.checked) {
        var block = t.closest('.kd-field-block');
        if (block) {
          var fk = block.getAttribute('data-fk') || '';
          var parts = fk.split('|');
          ensureVaultDocTypeSelectedForField(parts[0], parts.slice(1).join('|'));
        }
      }
      clearAtalhoActive();
      if (idPrefix === 'f') updateSharePreview();
    });
    if (idPrefix === 'f') updateSharePreview();
  }
  function renderShareTable() {
    renderUnifiedShareCards();
  }

  function renderExtraDocsInto(wrapId) {
    const w = document.getElementById(wrapId);
    if (!w) return;
    if (!filesList.length) { w.innerHTML = '<p class="sub">Sem ficheiros.</p>'; return; }
    w.innerHTML = filesList.map(function (f) {
      return '<div class="row" style="grid-template-columns:1fr 120px;"><label><input type="checkbox" class="xd-check" data-fid="' + f.id + '' + f.id + ' ' + escapeHtml(f.doc_type) + '</label><input type="text" class="xd-label" data-fid="' + f.id + '" placeholder="Rótulo"/></div>';
    }).join('');
  }
  function renderExtraDocs() {
    renderExtraDocsInto('extra-docs-wrap');
    updateSharePreview();
  }

  document.getElementById('doc-file-hidden').addEventListener('change', async function () {
    var inp = this;
    if (!inp.files || !inp.files[0] || !pendingDocType) { pendingDocType = ''; inp.value = ''; return; }
    var ok = await uploadKingDocFile(inp.files[0], pendingDocType);
    pendingDocType = '';
    inp.value = '';
    if (!ok) { showToast('Erro ao enviar o ficheiro. Tenta outra vez.', 'err'); return; }
    showToast('Documento guardado no cofre.', 'ok');
    loadFiles();
  });

  document.getElementById('btn-create-link').onclick = async function() {
    var selection = buildUnifiedShareSelection();
    if (!hasUnifiedShareContent(selection)) {
      showToast('Marca campos ou documentos na aba Documentos antes de gerar o link.', 'neutral');
      return;
    }
    const body = {
      expiresInHours: parseInt(document.getElementById('sh-hours').value, 10) || 24,
      password: document.getElementById('sh-pass').value || '',
      maxViews: document.getElementById('sh-maxv').value || '',
      selection: selection
    };
    const r = await fetch(api('/api/king-docs/shares'), { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    const out = document.getElementById('share-out');
    if (!r.ok) {
      out.innerHTML = '<p class="err">Não foi possível criar o link.</p>';
      showToast('Erro ao criar o link. Verifica a rede ou tenta mais tarde.', 'err');
      return;
    }
    const j = await r.json();
    const d = j.data || {};
    const fullUrl = window.location.origin + (d.shareUrl || '');
    out.innerHTML = '<p class="okmsg">Link criado — já podes copiar, mostrar QR ou enviar por WhatsApp.</p><div class="linkbox">' + escapeHtml(fullUrl) + '</div><p class="btn-row"><button type="button" class="btn secondary" id="btn-copy-link">Copiar URL</button> <button type="button" class="btn secondary" id="btn-qr-link">QR Code</button> <button type="button" class="btn secondary" id="btn-wa-link">WhatsApp</button></p>';
    showToast('Link gerado com sucesso.', 'ok');
    document.getElementById('btn-copy-link').onclick = function() {
      navigator.clipboard.writeText(fullUrl).then(function() { showToast('URL copiada para a área de transferência.', 'ok'); });
    };
    document.getElementById('btn-qr-link').onclick = function() { openQrModal(fullUrl); };
    document.getElementById('btn-wa-link').onclick = function() {
      const msg = encodeURIComponent('Segue o link confidencial (King Docs):\n' + fullUrl);
      window.open('https://wa.me/?text=' + msg, '_blank', 'noopener,noreferrer');
    };
    loadLinks();
  };

  function shareLinkStatusBadge(s) {
    if (s.revoked_at) return '<span class="kd-badge kd-badge-bad">Revogado</span>';
    var exp = s.expires_at ? new Date(s.expires_at) : null;
    if (exp && !isNaN(exp.getTime()) && exp.getTime() < Date.now()) return '<span class="kd-badge kd-badge-muted">Expirado</span>';
    return '<span class="kd-badge kd-badge-ok">Ativo</span>';
  }

  function getSelectedShareIds() {
    var ids = [];
    document.querySelectorAll('#links-list .links-sel:checked').forEach(function (cb) {
      var id = parseInt(cb.getAttribute('data-id'), 10);
      if (id) ids.push(id);
    });
    return ids;
  }

  async function loadLinks() {
    const el = document.getElementById('links-list');
    const r = await fetch(api('/api/king-docs/shares'), { headers: authHeaders() });
    if (!r.ok) { el.innerHTML = '<p class="err">Não foi possível carregar a lista de links.</p>'; showToast('Erro ao listar os links.', 'err'); return; }
    const j = await r.json();
    const arr = (j.data && j.data.shares) || [];
    if (!arr.length) { el.innerHTML = '<p class="sub">Ainda não criaste nenhum link. Escolhe dados em <strong>Documentos</strong> e gera o URL na aba <strong>Partilhar</strong>.</p>'; return; }
    el.innerHTML = '<table style="width:100%;font-size:.85rem;border-collapse:collapse"><tr><th style="width:2.2rem"><input type="checkbox" id="links-sel-all" title="Selecionar todos"/></th><th>ID</th><th>Estado</th><th>Ações</th><th>Criado</th><th>Expira</th><th>Vistas</th><th>Senha</th><th>Gestão</th></tr>' +
      arr.map(s => {
        const u = window.location.origin + '/kingDocsShare?t=' + encodeURIComponent(s.token);
        return '<tr><td><input type="checkbox" class="links-sel" data-id="' + s.id + '" aria-label="Selecionar link #' + s.id + '"/></td><td>' + s.id + '</td><td>' + shareLinkStatusBadge(s) + '</td><td class="links-actions"><a class="btn secondary" href="' + escapeAttr(u) + '" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;font-size:.72rem;padding:.28rem .5rem">Abrir</a> <button type="button" class="btn secondary btn-copyt" data-u="' + escapeAttr(u) + '">Copiar</button> <button type="button" class="btn secondary btn-qr-row" data-u="' + escapeAttr(u) + '">QR</button></td><td>' + (s.created_at || '').slice(0,16) + '</td><td>' + (s.expires_at ? s.expires_at.slice(0,16) : '') + '</td><td>' + s.view_count + (s.max_views != null ? ' / ' + s.max_views : '') + '</td><td>' + (s.has_password ? 'sim' : 'não') + '</td><td class="kd-links-col-actions"><button type="button" class="btn bad btn-rev" data-id="' + s.id + '">Revogar</button><button type="button" class="btn secondary btn-del-perm" data-id="' + s.id + '">Excluir</button></td></tr>';
      }).join('') + '</table>';
    el.querySelectorAll('.btn-copyt').forEach(b => {
      b.onclick = function() { navigator.clipboard.writeText(this.getAttribute('data-u')); showToast('URL copiada.', 'ok'); };
    });
    el.querySelectorAll('.btn-qr-row').forEach(function (b) {
      b.onclick = function () { openQrModal(this.getAttribute('data-u')); };
    });
    el.querySelectorAll('.btn-rev').forEach(b => {
      b.onclick = async function() {
        if (!confirm('Revogar este link? O URL deixa de funcionar, mas o registo continua na lista como Â«RevogadoÂ».')) return;
        await fetch(api('/api/king-docs/shares/' + this.getAttribute('data-id')), { method: 'DELETE', headers: authHeaders() });
        showToast('Link revogado.', 'ok');
        loadLinks();
      };
    });
    el.querySelectorAll('.btn-del-perm').forEach(function (b) {
      b.onclick = async function () {
        if (!confirm('Excluir este registo da lista? O link deixa de existir no teu histórico (ação definitiva).')) return;
        var id = this.getAttribute('data-id');
        var r = await fetch(api('/api/king-docs/shares/' + id + '/permanent'), { method: 'DELETE', headers: authHeaders() });
        if (!r.ok) { showToast('Não foi possível excluir.', 'err'); return; }
        showToast('Link excluído da lista.', 'ok');
        loadLinks();
      };
    });
    var selAll = document.getElementById('links-sel-all');
    if (selAll) {
      selAll.checked = false;
      selAll.onchange = function () {
        var on = selAll.checked;
        el.querySelectorAll('.links-sel').forEach(function (cb) { cb.checked = on; });
      };
    }
    (function bindLinksFilterOnce() {
      var inp = document.getElementById('links-filter');
      if (!inp || inp._kdBound) return;
      inp._kdBound = true;
      inp.addEventListener('input', function () {
        var q = (inp.value || '').toLowerCase().trim();
        var table = document.querySelector('#links-list table');
        if (!table) return;
        var rows = table.querySelectorAll('tr');
        rows.forEach(function (tr, i) {
          if (i === 0) return;
          tr.style.display = !q || (tr.textContent || '').toLowerCase().indexOf(q) >= 0 ? '' : 'none';
        });
      });
    })();
  }

  document.getElementById('btn-links-revoke-sel').onclick = async function () {
    var ids = getSelectedShareIds();
    if (!ids.length) { showToast('Seleciona pelo menos um link.', 'neutral'); return; }
    if (!confirm('Revogar ' + ids.length + ' link(s)? O URL deixa de funcionar; os registos ficam como Â«RevogadoÂ» na lista.')) return;
    for (var i = 0; i < ids.length; i++) {
      var r = await fetch(api('/api/king-docs/shares/' + ids[i]), { method: 'DELETE', headers: authHeaders() });
      if (!r.ok) { showToast('Erro ao revogar o link #' + ids[i], 'err'); loadLinks(); return; }
    }
    showToast(ids.length === 1 ? 'Link revogado.' : 'Links revogados.', 'ok');
    loadLinks();
  };
  document.getElementById('btn-links-delete-sel').onclick = async function () {
    var ids = getSelectedShareIds();
    if (!ids.length) { showToast('Seleciona pelo menos um link.', 'neutral'); return; }
    if (!confirm('Excluir DEFINITIVAMENTE ' + ids.length + ' registo(s)? Deixam de aparecer nesta lista.')) return;
    for (var i = 0; i < ids.length; i++) {
      var r = await fetch(api('/api/king-docs/shares/' + ids[i] + '/permanent'), { method: 'DELETE', headers: authHeaders() });
      if (!r.ok) { showToast('Erro ao excluir o link #' + ids[i], 'err'); loadLinks(); return; }
    }
    showToast(ids.length === 1 ? 'Link excluído da lista.' : 'Links excluídos da lista.', 'ok');
    loadLinks();
  };

  function clearShareFieldSelection() {
    clearAtalhoActive();
    clearAllShareCards();
    updateSharePreview();
  }
  document.getElementById('btn-share-fields-clear').onclick = clearShareFieldSelection;

  document.querySelector('.wrap').addEventListener('click', function (e) {
    var editPreset = e.target && e.target.closest && e.target.closest('[data-edit-preset]');
    if (editPreset) {
      e.preventDefault();
      e.stopPropagation();
      openShortcutModalFromPreset(editPreset.getAttribute('data-edit-preset'));
      return;
    }
    var btn = e.target && e.target.closest && e.target.closest('.btn-atalho[data-preset]');
    if (!btn) return;
    e.preventDefault();
    applyPreset(btn.getAttribute('data-preset'));
  });
  document.getElementById('p-docs').addEventListener('change', function () {
    clearAtalhoActive();
    updateSharePreview();
  });
  document.getElementById('sh-name').addEventListener('input', function () {
    syncHeroNameToForm(this.value);
    setVaultDirty(true);
    updateSharePreview();
  });
  var heroSaveBtn = document.getElementById('kd-hero-save-quick');
  if (heroSaveBtn) heroSaveBtn.onclick = function () { saveVault(); };
  function refreshProfilePhotoPreview() {
    var wrap = document.getElementById('sh-profile-preview-wrap');
    var clearBtn = document.getElementById('sh-profile-clear');
    var fidEl = document.getElementById('sh-profile-file-id');
    if (!fidEl || !wrap) return;
    var id = parseInt(fidEl.value, 10);
    if (!id) {
      wrap.style.display = 'none';
      wrap.innerHTML = '';
      if (clearBtn) clearBtn.style.display = 'none';
      return;
    }
    var f = filesList.find(function (x) { return x.id === id; });
    if (!f || String(f.mime || '').indexOf('image/') !== 0) {
      wrap.style.display = 'none';
      if (clearBtn) clearBtn.style.display = '';
      return;
    }
    wrap.style.display = '';
    if (clearBtn) clearBtn.style.display = '';
    wrap.innerHTML = '<p class="kd-hint" style="margin:0 0 .35rem">Pré-visualização</p><img alt="" style="max-width:140px;max-height:140px;border-radius:10px;border:1px solid var(--border);object-fit:cover"/>';
    var img = wrap.querySelector('img');
    fetch(api('/api/king-docs/files/' + id + '/download'), { headers: authHeaders() }).then(function (r) {
      return r.ok ? r.blob() : null;
    }).then(function (blob) {
      if (!blob || !img) return;
      img.src = URL.createObjectURL(blob);
    });
  }
  var shProf = document.getElementById('sh-profile-file');
  if (shProf) {
    shProf.addEventListener('change', async function () {
      if (!this.files || !this.files[0]) return;
      showToast('', 'neutral');
      var ok = await uploadKingDocFile(this.files[0], 'FOTO PESSOAL');
      this.value = '';
      if (!ok) { showToast('Erro ao enviar a foto.', 'err'); return; }
      await loadFiles();
      var latest = getLatestFileForDocType('FOTO PESSOAL');
      if (latest) {
        var hid = document.getElementById('sh-profile-file-id');
        if (hid) hid.value = String(latest.id);
        refreshProfilePhotoPreview();
        updateSharePreview();
      }
    });
  }
  var shClr = document.getElementById('sh-profile-clear');
  if (shClr) {
    shClr.onclick = function () {
      var hid = document.getElementById('sh-profile-file-id');
      if (hid) hid.value = '';
      refreshProfilePhotoPreview();
      updateSharePreview();
    };
  }
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(function (x) {
        x.classList.remove('active');
        x.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');
      document.getElementById(this.getAttribute('data-panel')).classList.add('active');
      var panelId = this.getAttribute('data-panel');
      if (panelId === 'p-partilha') { updateSharePreview(); loadLinks(); }
      if (panelId === 'p-docs') {
        renderUnifiedShareCards();
        updateSharePreview();
      }
    });
  });
  document.getElementById('btn-doc-clear-sel').onclick = function () {
    clearAllShareCards();
    updateSharePreview();
  };
  function bindCustomDocTypeAdd() {
    var addBtn = document.getElementById('kd-cdt-add');
    if (!addBtn) return;
    addBtn.onclick = function () {
    var labelEl = document.getElementById('kd-cdt-label');
    var iconEl = document.getElementById('kd-cdt-icon');
    var label = labelEl && labelEl.value.trim();
    var icon = (iconEl && iconEl.value ? iconEl.value : '').trim().slice(0, 8) || '';
    if (!label) { showToast('Escreve um nome para o tipo.', 'neutral'); return; }
    var dt = normalizeDocTypeKey(label);
    if (!dt) { showToast('Nome inválido.', 'neutral'); return; }
    if (DOC_CARD_PRESETS.some(function (p) { return p.docType === dt; })) {
      showToast('Já existe um cartão padrão com esse nome.', 'neutral');
      return;
    }
    var arr = loadCustomDocTypes();
    if (arr.some(function (x) { return normalizeDocTypeKey(x.docType) === dt; })) {
      showToast('Esse tipo extra já existe.', 'neutral');
      return;
    }
    arr.push({ docType: dt, label: label.slice(0, 60), icon: icon });
    saveCustomDocTypes(arr);
    if (labelEl) labelEl.value = '';
    renderCustomDocTypesList();
    renderDocCards();
    showToast('Tipo criado. Clica no cartão Â«Enviar ao cofreÂ» para enviar.', 'ok');
    };
  }
  document.getElementById('btn-doc-copy-link').onclick = async function () {
    var url = await quickShareVaultMulti();
    if (!url) {
      showToast('Marca documentos nos cartões ou campos em Â«Incluir no linkÂ» (e nome no topo, se quiseres).', 'neutral');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link único copiado.', 'ok');
    } catch (e) {
      showToast(url, 'neutral');
    }
    loadLinks();
  };
  document.getElementById('btn-doc-wa-link').onclick = async function () {
    var url = await quickShareVaultMulti();
    if (!url) {
      showToast('Marca documentos ou campos para incluir no link.', 'neutral');
      return;
    }
    window.open('https://wa.me/?text=' + encodeURIComponent(url), '_blank', 'noopener,noreferrer');
    loadLinks();
  };
  document.getElementById('btn-doc-copy-plain').onclick = function () {
    var data = collectSharePreviewData();
    var t = formatSharePreviewPlainText(data);
    if (!t) { showToast('Marca campos ou documentos em Â«Incluir no linkÂ».', 'neutral'); return; }
    navigator.clipboard.writeText(t).then(function () { showToast('Mensagem copiada (tudo).', 'ok'); }).catch(function () { showToast(t, 'neutral'); });
  };
  document.getElementById('btn-doc-copy-textonly').onclick = function () {
    var data = collectSharePreviewData();
    var t = formatSharePreviewPlainTextTextOnly(data);
    if (!t) { showToast('Marca campos de texto em Â«Incluir no linkÂ».', 'neutral'); return; }
    navigator.clipboard.writeText(t).then(function () { showToast('Só texto copiado.', 'ok'); }).catch(function () { showToast(t, 'neutral'); });
  };
  document.getElementById('btn-doc-copy-with-img').onclick = async function () {
    var data = collectSharePreviewData();
    var text = formatSharePreviewPlainText(data);
    if (!text) { showToast('Sem resumo para copiar.', 'neutral'); return; }
    var fid = getProfileImageFileIdForUi();
    if (!fid) { showToast('Envia a foto em Partilhar — Foto no link.', 'neutral'); return; }
    try {
      var r = await fetch(api('/api/king-docs/files/' + fid + '/download'), { headers: authHeaders() });
      if (!r.ok) throw new Error('x');
      var blob = await r.blob();
      var mime = blob.type || 'image/jpeg';
      if (mime.indexOf('image/') !== 0) {
        await navigator.clipboard.writeText(text);
        showToast('Ficheiro não é imagem — copiei só o texto.', 'neutral');
        return;
      }
      if (typeof ClipboardItem === 'undefined') {
        showToast('Este browser não copia imagem — usa Â«WhatsApp Â· texto + imagemÂ».', 'neutral');
        return;
      }
      var plain = new Blob([text], { type: 'text/plain' });
      var item = new ClipboardItem((function () {
        var o = { 'text/plain': plain };
        o[mime] = blob;
        return o;
      })());
      await navigator.clipboard.write([item]);
      showToast('Texto e imagem copiados.', 'ok');
    } catch (e) {
      showToast('Não foi possível copiar a imagem — usa Â«WhatsApp Â· texto + imagemÂ».', 'neutral');
    }
  };
  document.getElementById('btn-doc-wa-text').onclick = function () {
    var data = collectSharePreviewData();
    var t = formatSharePreviewPlainTextTextOnly(data);
    if (!t) { showToast('Marca campos de texto primeiro.', 'neutral'); return; }
    window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener,noreferrer');
  };
  document.getElementById('btn-doc-wa-text-img').onclick = async function () {
    var data = collectSharePreviewData();
    var t = formatSharePreviewPlainText(data);
    if (!t) { showToast('Marca conteúdo no resumo primeiro.', 'neutral'); return; }
    var fid = getProfileImageFileIdForUi();
    if (!fid) {
      window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener,noreferrer');
      showToast('Sem foto no topo — enviei só o texto. Adiciona foto em Partilhar.', 'neutral');
      return;
    }
    var r = await fetch(api('/api/king-docs/files/' + fid + '/download'), { headers: authHeaders() });
    if (!r.ok) {
      window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener,noreferrer');
      showToast('Não foi possível carregar a foto — só texto.', 'err');
      return;
    }
    var rawBlob = await r.blob();
    var hdr = (r.headers.get('Content-Type') || '').split(';')[0].trim();
    var mime = rawBlob.type && rawBlob.type.indexOf('image/') === 0 ? rawBlob.type : (hdr.indexOf('image/') === 0 ? hdr : 'image/jpeg');
    var imgBlob = new Blob([rawBlob], { type: mime });
    var ext = mime.indexOf('png') >= 0 ? 'png' : 'jpeg';
    var file = new File([imgBlob], 'king-docs-foto.' + ext, { type: mime });

    /** wa.me só envia texto — imagem tem de ir por partilha nativa ou área de transferência */
    if (navigator.share) {
      try {
        await navigator.share({ text: t, files: [file] });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
      try {
        await navigator.share({ files: [file], title: 'King Docs', text: t });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
      try {
        await navigator.share({ files: [file] });
        try {
          await navigator.clipboard.writeText(t);
          showToast('Imagem enviada — texto copiado; cola na mensagem no WhatsApp.', 'ok');
        } catch (e2) {
          showToast('Imagem enviada — escreve o texto na mensagem.', 'neutral');
        }
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    try {
      if (typeof ClipboardItem !== 'undefined') {
        var plain = new Blob([t], { type: 'text/plain' });
        var item = new ClipboardItem((function () {
          var o = { 'text/plain': plain };
          o[mime] = imgBlob;
          return o;
        })());
        await navigator.clipboard.write([item]);
        window.open('https://wa.me/', '_blank', 'noopener,noreferrer');
        showToast('Texto e imagem na área de transferência — no WhatsApp mantém premido e cola, ou cola a imagem e depois o texto.', 'ok');
        return;
      }
    } catch (e) {
      /* continua */
    }
    try {
      await navigator.clipboard.writeText(t);
      window.open('https://wa.me/', '_blank', 'noopener,noreferrer');
      showToast('Texto copiado. Abre a galeria e envia a foto manualmente (Partilhar — Foto no link).', 'neutral');
    } catch (e2) {
      window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener,noreferrer');
      showToast('Só foi possível enviar texto pelo link. Usa Â«PDF Â· enviarÂ» ou envia a foto Ã  parte.', 'neutral');
    }
  };
  document.getElementById('btn-doc-wa-list').onclick = async function () {
    var extra = getSelectedExtraDocs();
    var url = await quickShareVaultMulti();
    if (!url) {
      showToast('Marca documentos ou campos para incluir no link.', 'neutral');
      return;
    }
    var lines = extra.map(function (e, i) { return (i + 1) + '. ' + e.label; }).join('\n');
    var text = (lines ? 'Lista dos ficheiros no link:\n' + lines + '\n\n' : '') + 'Link (tudo no mesmo URL):\n' + url;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
    loadLinks();
  };
  document.getElementById('btn-doc-wa-sep').onclick = async function () {
    var extra = getSelectedExtraDocs();
    if (!extra.length) return;
    var parts = [];
    for (var i = 0; i < extra.length; i++) {
      var ed = extra[i];
      var u = await quickShareVaultFile(ed.fileId, ed.label);
      if (u) parts.push(ed.label + ':\n' + u);
    }
    if (!parts.length) return;
    var text = 'Documentos (King Docs)\n\n' + parts.join('\n\n');
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
    loadLinks();
  };
  document.getElementById('btn-doc-pdf-dl').onclick = async function () {
    try {
      showToast('', 'neutral');
      var blob = await buildMergedPdfBlob();
      if (!blob) { showToast('Marca o que queres partilhar em Â«Incluir no linkÂ» (textos, foto, documentos).', 'neutral'); return; }
      var u = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = u;
      a.download = 'king-docs-documentos.pdf';
      a.click();
      URL.revokeObjectURL(u);
      showToast('PDF descarregado.', 'ok');
    } catch (e) {
      showToast('Erro ao gerar PDF.', 'err');
    }
  };
  document.getElementById('btn-doc-pdf-share').onclick = async function () {
    try {
      var blob = await buildMergedPdfBlob();
      if (!blob) { showToast('Marca o que queres partilhar em Â«Incluir no linkÂ».', 'neutral'); return; }
      var file = new File([blob], 'king-docs-documentos.pdf', { type: 'application/pdf' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'King Docs', text: 'PDF com texto, foto e documentos (resumo completo).' });
      } else if (navigator.share) {
        await navigator.share({ title: 'King Docs', text: 'PDF King Docs (resumo completo). Se não anexar, usa Â«PDF Â· descarregarÂ».' });
      } else {
        var u = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = u;
        a.download = 'king-docs-documentos.pdf';
        a.click();
        URL.revokeObjectURL(u);
        showToast('PDF descarregado — envia manualmente pelo WhatsApp.', 'neutral');
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      showToast('Não foi possível partilhar o PDF.', 'err');
    }
  };

  document.getElementById('kd-theme-toggle').onclick = function () {
    applyTheme(!document.body.classList.contains('kd-theme-dark'));
  };
  document.getElementById('btn-save-model').onclick = function () {
    var nameEl = document.getElementById('kd-model-name');
    var name = nameEl && nameEl.value.trim();
    if (!name) { showToast('Escreve um nome para o modelo.', 'neutral'); return; }
    var arr = loadModels();
    if (arr.length >= 12) { showToast('Limite de 12 modelos neste dispositivo. Remove um antes.', 'neutral'); return; }
    arr.push({ name: name, state: collectShareState(), savedAt: Date.now() });
    saveModels(arr);
    if (nameEl) nameEl.value = '';
    renderModelsChips();
    showToast('Modelo guardado neste dispositivo.', 'ok');
  };
  document.getElementById('kd-qr-close').onclick = closeQrModal;
  document.getElementById('kd-qr-backdrop').onclick = closeQrModal;
  document.getElementById('btn-add-custom-atalho').onclick = function () { openShortcutModal(); };
  document.getElementById('kd-sc-cancel').onclick = closeShortcutModal;
  document.getElementById('kd-shortcut-backdrop').onclick = closeShortcutModal;
  document.getElementById('kd-sc-delete').onclick = function () {
    var editId = (document.getElementById('kd-sc-edit-id') && document.getElementById('kd-sc-edit-id').value || '').trim();
    if (!editId) return;
    if (!window.confirm('Excluir este atalho? Esta ação não pode ser desfeita.')) return;
    var arr = loadCustomShortcuts();
    var ix = arr.findIndex(function (x) { return x.id === editId; });
    if (ix < 0) { showToast('Atalho não encontrado.', 'err'); return; }
    arr.splice(ix, 1);
    saveCustomShortcuts(arr);
    renderCustomShortcuts();
    clearAtalhoActive();
    closeShortcutModal();
    showToast('Atalho excluído.', 'ok');
  };
  document.getElementById('kd-sc-save').onclick = function () {
    var name = document.getElementById('kd-sc-name').value.trim();
    if (!name) { showToast('Escreve um nome para o atalho.', 'neutral'); return; }
    var emoji = (document.getElementById('kd-sc-emoji').value || '').trim().slice(0, 8) || '';
    var imgInput = document.getElementById('kd-sc-img');
    var editId = (document.getElementById('kd-sc-edit-id') && document.getElementById('kd-sc-edit-id').value || '').trim();
    function pushItem(imgData) {
      var pairs = collectCurrentPresetPairsFrom(document.getElementById('kd-sc-share-grid'), document.getElementById('kd-sc-extra-docs'));
      if (!pairs.length) { showToast('Marca pelo menos um campo ou documento extra na grelha acima.', 'neutral'); return; }
      var arr = loadCustomShortcuts();
      if (editId) {
        var ix = arr.findIndex(function (x) { return x.id === editId; });
        if (ix < 0) { showToast('Atalho não encontrado.', 'err'); return; }
        var prev = arr[ix];
        var next = { id: editId, name: name, icon: emoji, pairs: pairs };
        if (imgData) next.imageDataUrl = imgData;
        else if (prev.imageDataUrl) next.imageDataUrl = prev.imageDataUrl;
        arr[ix] = next;
        saveCustomShortcuts(arr);
        renderCustomShortcuts();
        closeShortcutModal();
        showToast('Atalho atualizado.', 'ok');
        return;
      }
      if (arr.length >= 24) { showToast('Limite de 24 atalhos personalizados.', 'neutral'); return; }
      var item = { id: 'c' + Date.now(), name: name, icon: emoji, pairs: pairs };
      if (imgData) item.imageDataUrl = imgData;
      arr.push(item);
      saveCustomShortcuts(arr);
      renderCustomShortcuts();
      closeShortcutModal();
      showToast('Atalho guardado neste dispositivo.', 'ok');
    }
    var f = imgInput && imgInput.files && imgInput.files[0];
    if (f) {
      if (f.size > 96000) { showToast('Imagem demasiado grande (máx. ~80 KB).', 'err'); return; }
      var fr = new FileReader();
      fr.onload = function () { pushItem(String(fr.result || '')); };
      fr.readAsDataURL(f);
    } else {
      pushItem('');
    }
  };
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var cdtPop = document.getElementById('kd-cdt-emoji-pop');
    if (cdtPop && !cdtPop.hasAttribute('hidden')) {
      cdtPop.setAttribute('hidden', '');
      var cdtBtn = document.getElementById('kd-cdt-emoji-btn');
      if (cdtBtn) cdtBtn.setAttribute('aria-expanded', 'false');
      return;
    }
    var scOpen = document.getElementById('kd-shortcut-modal') && document.getElementById('kd-shortcut-modal').classList.contains('kd-modal--open');
    var qrOpen = document.getElementById('kd-qr-modal') && document.getElementById('kd-qr-modal').classList.contains('kd-modal--open');
    if (scOpen) { closeShortcutModal(); return; }
    if (qrOpen) { closeQrModal(); return; }
    closeQrModal();
    closeShortcutModal();
    var pDocs = document.getElementById('p-docs');
    if (pDocs && pDocs.classList.contains('active') && docPreviewSelectedTypes.length) {
      var btnClear = document.getElementById('btn-doc-clear-sel');
      if (btnClear) btnClear.click();
    }
  });

  async function loadProfileHints() {
    if (vaultHasSavedName()) return;
    try {
      const r = await fetch(api('/api/account/status'), { headers: authHeaders() });
      if (!r.ok) return;
      const u = await r.json();
      var hero = document.getElementById('sh-name');
      if (!hero || hero.value.trim()) return;
      if (u.name) {
        hero.value = u.name;
        syncHeroNameToForm(u.name);
      }
    } catch (e) {}
  }

  initTheme();
  renderModelsChips();
  renderCustomShortcuts();
  initKdEmojiPicker();
  initKdCdtEmojiPicker();
  renderCustomDocTypesList();
  renderDocCards();
  updateUnifiedActionButtons();
  loadVault().then(loadProfileHints);
})();
