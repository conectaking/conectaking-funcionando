/** configuracoes-recibos-orcamentos — Vite entry (extracted inline) */
import '@legacy/css/recibos-modulo-mobile.css';

tailwind.config = { darkMode: "class", theme: { extend: { colors: { primary: "#EAB308", "background-dark": "#0A0A0A", "card-dark": "#171717", "border-dark": "#262626" }, fontFamily: { display: ["Inter", "sans-serif"] } } } };

(function() {
    var STORAGE_KEY = 'recibosOrcamentosCores';
    var ESCURIR_KEY = 'recibosOrcamentosEscurecer';
    var host = window.location.hostname || '';
    var port = String(window.location.port || '');
    var isLocal = /^127\.0\.0\.1|localhost$/i.test(host);
    var portasEstaticas = ['5500', '3000', '8080', '5173', '4173'];
    var apiOrigin = (typeof window !== 'undefined' && (window.API_BASE || window.CONECTAKING_API_BASE))
        ? (window.API_BASE || window.CONECTAKING_API_BASE).replace(/\/$/, '')
        : ((typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin.replace(/\/$/, '') : '');
    var API_SETTINGS = apiOrigin ? (apiOrigin + '/api/documentos/settings') : '/api/documentos/settings';
    function getAuthHeaders(extra) {
        var h = extra ? Object.assign({}, extra) : {};
        try {
            var token = (typeof localStorage !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('conectaKingToken'))) || null;
            if (token) h['Authorization'] = 'Bearer ' + token;
        } catch (e) {}
        return h;
    }
    function applyCoresToUI(cabecalho, destaque, fundo, escurecer) {
        if (cabecalho) { document.getElementById('cor-cabecalho').value = cabecalho; document.getElementById('cor-cabecalho-hex').value = cabecalho; }
        if (destaque) { document.getElementById('cor-destaque').value = destaque; document.getElementById('cor-destaque-hex').value = destaque; }
        if (fundo) { document.getElementById('cor-fundo').value = fundo; document.getElementById('cor-fundo-hex').value = fundo; }
        var chk = document.getElementById('escurecer-documentos');
        if (chk) chk.checked = escurecer === true || escurecer === '1' || escurecer === 'true';
    }
    function loadCores() {
        if (API_SETTINGS) {
            fetch(API_SETTINGS, { credentials: 'include', headers: getAuthHeaders() })
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(data) {
                    var d = (data && data.data) ? data.data : null;
                    if (d && (d.headerColor || d.accentColor || d.bgColor)) {
                        var cab = d.headerColor ? ('#' + String(d.headerColor).replace(/^#/, '')) : '#1e3a5f';
                        var des = d.accentColor ? ('#' + String(d.accentColor).replace(/^#/, '')) : '#e67e22';
                        var bg = d.bgColor ? ('#' + String(d.bgColor).replace(/^#/, '')) : '#ffffff';
                        var esc = (bg.toLowerCase() === '#1e1e1e' || bg.toLowerCase() === '#1a1a1a');
                        applyCoresToUI(cab, des, bg, esc);
                        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ cabecalho: cab, destaque: des, fundo: bg })); localStorage.setItem(ESCURIR_KEY, esc ? '1' : '0'); } catch (e) {}
                        return;
                    }
                    loadCoresLocal();
                })
                .catch(function() { loadCoresLocal(); });
        } else { loadCoresLocal(); }
    }
    function loadCoresLocal() {
        try {
            var s = localStorage.getItem(STORAGE_KEY);
            if (s) {
                var c = JSON.parse(s);
                applyCoresToUI(c.cabecalho, c.destaque, c.fundo, false);
            }
            var esc = localStorage.getItem(ESCURIR_KEY);
            var chk = document.getElementById('escurecer-documentos');
            if (chk) chk.checked = esc === '1' || esc === 'true';
        } catch (e) {}
    }
    var CONDICOES_PADRAO_KEY = 'recibosOrcamentosCondicoesPadrao';
    var PIX_KEY = 'recibosOrcamentosPix';
    var CATALOGO_KEY = 'recibosOrcamentosCatalogo';
    function loadCondicoesPadraoLocal() {
        try {
            var s = localStorage.getItem(CONDICOES_PADRAO_KEY);
            if (s) document.getElementById('condicoes-padrao').value = s;
        } catch (e) {}
    }
    function loadPixLocal() {
        try {
            var s = localStorage.getItem(PIX_KEY);
            if (s) {
                var p = JSON.parse(s);
                document.getElementById('pix-chave').value = p.chave || '';
                document.getElementById('pix-nome').value = p.nome || '';
                document.getElementById('pix-cidade').value = p.cidade || '';
            }
        } catch (e) {}
    }
    function loadLogoFixaLocal() {
        try {
            var url = localStorage.getItem(LOGO_FIXA_KEY);
            if (url && url.length > 10) applyLogoToUI(url);
        } catch (e) {}
    }
    function saveCores() {
        var escurecer = document.getElementById('escurecer-documentos') && document.getElementById('escurecer-documentos').checked;
        var fundo = escurecer ? '#1e1e1e' : document.getElementById('cor-fundo').value;
        var c = {
            cabecalho: document.getElementById('cor-cabecalho').value,
            destaque: document.getElementById('cor-destaque').value,
            fundo: fundo
        };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ cabecalho: c.cabecalho, destaque: c.destaque, fundo: c.fundo })); localStorage.setItem(ESCURIR_KEY, escurecer ? '1' : '0'); } catch (e) {}
        if (API_SETTINGS) {
            var payload = {
                headerColor: (c.cabecalho || '').replace(/^#/, ''),
                accentColor: (c.destaque || '').replace(/^#/, ''),
                bgColor: (c.fundo || '').replace(/^#/, '')
            };
            var btn = document.getElementById('btn-salvar-cores');
            var origText = btn.textContent;
            btn.textContent = 'Salvando...';
            btn.disabled = true;
            fetch(API_SETTINGS, { method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(payload), credentials: 'include' })
                .then(function(r) {
                    if (!r.ok) throw new Error('Erro ao salvar.');
                    btn.textContent = 'Salvo!';
                    setTimeout(function() { btn.textContent = origText; btn.disabled = false; }, 1500);
                })
                .catch(function() { btn.textContent = origText; btn.disabled = false; alert('Erro ao salvar. Verifique se está autenticado.'); });
        } else {
            var btn = document.getElementById('btn-salvar-cores');
            btn.textContent = 'Salvo!';
            setTimeout(function() { btn.textContent = 'Salvar cores'; }, 1500);
        }
    }
    function syncColor(id) {
        var picker = document.getElementById('cor-' + id);
        var hex = document.getElementById('cor-' + id + '-hex');
        picker.addEventListener('input', function() { hex.value = picker.value; });
        hex.addEventListener('input', function() {
            if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) picker.value = hex.value;
        });
    }
    function loadAllSettings() {
        if (!API_SETTINGS) {
            loadCoresLocal();
            loadLogoFixa();
            loadCondicoesPadraoLocal();
            loadPixLocal();
            loadCatalogoLocal();
            return;
        }
        fetch(API_SETTINGS, { credentials: 'include', headers: getAuthHeaders() })
            .then(function(r) { return r.ok ? r.json() : null; })
            .then(function(data) {
                var d = (data && data.data) ? data.data : null;
                if (d) {
                    if (d.headerColor || d.accentColor || d.bgColor) {
                        var cab = d.headerColor ? ('#' + String(d.headerColor).replace(/^#/, '')) : '#1e3a5f';
                        var des = d.accentColor ? ('#' + String(d.accentColor).replace(/^#/, '')) : '#e67e22';
                        var bg = d.bgColor ? ('#' + String(d.bgColor).replace(/^#/, '')) : '#ffffff';
                        var esc = (bg.toLowerCase() === '#1e1e1e' || bg.toLowerCase() === '#1a1a1a');
                        applyCoresToUI(cab, des, bg, esc);
                        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ cabecalho: cab, destaque: des, fundo: bg })); localStorage.setItem(ESCURIR_KEY, esc ? '1' : '0'); } catch (e) {}
                    }
                    /* Só a logo fixa do módulo (default_logo_url). Não usar companyLogoUrl do perfil — era isso que ?otrazia a logo de volta— após remover. */
                    if (d.defaultLogoUrl && String(d.defaultLogoUrl).trim()) {
                        applyLogoToUI(String(d.defaultLogoUrl).trim());
                    } else {
                        applyLogoToUI('');
                    }
                    var cp = document.getElementById('condicoes-padrao');
                    if (cp && d.condicoesPagamentoPadrao != null) { cp.value = d.condicoesPagamentoPadrao; try { localStorage.setItem(CONDICOES_PADRAO_KEY, d.condicoesPagamentoPadrao); } catch (e) {} }
                    if (d.pixChave != null) document.getElementById('pix-chave').value = d.pixChave;
                    if (d.pixNome != null) document.getElementById('pix-nome').value = d.pixNome;
                    if (d.pixCidade != null) document.getElementById('pix-cidade').value = d.pixCidade;
                    try { localStorage.setItem(PIX_KEY, JSON.stringify({ chave: d.pixChave || '', nome: d.pixNome || '', cidade: d.pixCidade || '' })); } catch (e) {}
                    if (Array.isArray(d.catalogoServicos) && d.catalogoServicos.length) {
                        try { localStorage.setItem(CATALOGO_KEY, JSON.stringify(d.catalogoServicos)); } catch (e) {}
                        loadCatalogoFromList(d.catalogoServicos);
                    }
                }
                if (!d || !d.headerColor && !d.accentColor && !d.bgColor) loadCoresLocal();
                if (!d) loadLogoFixaLocal();
                if (!d || d.condicoesPagamentoPadrao == null) loadCondicoesPadraoLocal();
                if (!d || d.pixChave == null && d.pixNome == null) loadPixLocal();
                if (!d || !Array.isArray(d.catalogoServicos) || !d.catalogoServicos.length) loadCatalogoLocal();
            })
            .catch(function() {
                loadCoresLocal();
                loadLogoFixaLocal();
                loadCondicoesPadraoLocal();
                loadPixLocal();
                loadCatalogoLocal();
            });
    }
    function loadCatalogoFromList(list) {
        var ul = document.getElementById('lista-catalogo');
        if (!ul) return;
        ul.innerHTML = list.map(function(item, i) {
            return '<li class="flex justify-between items-center py-2 px-3 rounded bg-slate-50 dark:bg-black/40"><span class="text-sm">' + escapeHtml(item.descricao) + ' — R$ ' + (item.valor != null ? Number(item.valor).toFixed(2).replace('.', ',') : '0,00') + '</span><button type="button" class="catalogo-rm text-red-500 hover:underline text-xs" data-i="' + i + '">Remover</button></li>';
        }).join('');
        ul.querySelectorAll('.catalogo-rm').forEach(function(btn) {
            btn.onclick = function() {
                list.splice(parseInt(this.dataset.i, 10), 1);
                localStorage.setItem(CATALOGO_KEY, JSON.stringify(list));
                saveCatalogoToApi(list);
                loadCatalogoFromList(list);
            };
        });
    }
    loadAllSettings();
    syncColor('cabecalho');
    syncColor('destaque');
    syncColor('fundo');
    document.getElementById('btn-salvar-cores').onclick = saveCores;

    var LOGO_FIXA_KEY = 'recibosOrcamentosLogoFixa';
    var API_UPLOAD_LOGO = apiOrigin ? (apiOrigin + '/api/documentos/upload-logo') : '/api/documentos/upload-logo';
    var logoArea = document.getElementById('logo-fixa-upload-area');
    var fileLogoFixa = document.getElementById('file-logo-fixa');
    var logoPreview = document.getElementById('logo-fixa-preview');
    var logoText = document.getElementById('logo-fixa-text');
    var btnRemoverLogoFixa = document.getElementById('btn-remover-logo-fixa');

    function applyLogoToUI(url) {
        if (url && url.length > 10) {
            logoPreview.src = url;
            logoPreview.style.display = 'block';
            logoText.style.display = 'none';
            btnRemoverLogoFixa.style.display = 'inline-block';
            try { localStorage.setItem(LOGO_FIXA_KEY, url); } catch (e) {}
        } else {
            logoPreview.src = '';
            logoPreview.style.display = 'none';
            logoText.style.display = 'block';
            btnRemoverLogoFixa.style.display = 'none';
            try { localStorage.removeItem(LOGO_FIXA_KEY); } catch (e) {}
        }
    }
    function loadLogoFixa() {
        if (API_SETTINGS) {
            fetch(API_SETTINGS, { credentials: 'include', headers: getAuthHeaders() })
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(data) {
                    var d = (data && data.data) ? data.data : null;
                    var url = (d && d.defaultLogoUrl && d.defaultLogoUrl.trim()) ? d.defaultLogoUrl.trim() : null;
                    if (url) {
                        applyLogoToUI(url);
                        return;
                    }
                    try {
                        var local = localStorage.getItem(LOGO_FIXA_KEY);
                        if (local && local.length > 10) applyLogoToUI(local);
                    } catch (e) {}
                })
                .catch(function() {
                    try {
                        var local = localStorage.getItem(LOGO_FIXA_KEY);
                        if (local && local.length > 10) applyLogoToUI(local);
                    } catch (e) {}
                });
        } else {
            try {
                var local = localStorage.getItem(LOGO_FIXA_KEY);
                if (local && local.length > 10) applyLogoToUI(local);
            } catch (e) {}
        }
    }

    var logoPreviewModal = document.getElementById('logo-preview-modal');
    var logoPreviewModalImg = document.getElementById('logo-preview-modal-img');
    var logoModalConfirm = document.getElementById('logo-modal-confirm');
    var logoModalCancel = document.getElementById('logo-modal-cancel');
    var logoPendingDataUrl = null;
    var logoPendingFile = null;

    function openLogoPreview(dataUrl, file) {
        logoPendingDataUrl = dataUrl;
        logoPendingFile = file || null;
        if (logoPreviewModalImg) logoPreviewModalImg.src = dataUrl || '';
        if (logoPreviewModal) { logoPreviewModal.style.display = 'flex'; }
    }
    function closeLogoPreview(save) {
        if (save && (logoPendingDataUrl || logoPendingFile)) {
            if (logoPendingFile && API_UPLOAD_LOGO) {
                var fd = new FormData();
                fd.append('image', logoPendingFile);
                var btn = logoModalConfirm;
                if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
                fetch(API_UPLOAD_LOGO, { method: 'POST', body: fd, credentials: 'include', headers: getAuthHeaders() })
                    .then(function(r) {
                        if (!r.ok) throw new Error('Falha no envio.');
                        return r.json();
                    })
                    .then(function(res) {
                        var url = (res && res.data && res.data.url) ? res.data.url : null;
                        if (url && API_SETTINGS) {
                            return fetch(API_SETTINGS, { method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ defaultLogoUrl: url }), credentials: 'include' })
                                .then(function(r2) { if (!r2.ok) throw new Error('Falha ao salvar.'); return url; });
                        }
                        return url;
                    })
                    .then(function(url) {
                        if (url) applyLogoToUI(url);
                    })
                    .catch(function(err) { alert(err.message || 'Erro ao salvar a logo. Verifique se está autenticado.'); })
                    .finally(function() { if (btn) { btn.disabled = false; btn.textContent = 'Usar esta logo'; } });
            } else if (logoPendingDataUrl && logoPendingDataUrl.length > 100 && API_SETTINGS) {
                fetch(API_SETTINGS, { method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ defaultLogoUrl: logoPendingDataUrl }), credentials: 'include' })
                    .then(function(r) {
                        if (!r.ok) throw new Error('Falha ao salvar.');
                        applyLogoToUI(logoPendingDataUrl);
                    })
                    .catch(function(err) { alert(err.message || 'Erro ao salvar a logo.'); });
            } else if (logoPendingDataUrl && logoPendingDataUrl.length > 100) {
                applyLogoToUI(logoPendingDataUrl);
            }
        }
        logoPendingDataUrl = null;
        logoPendingFile = null;
        if (logoPreviewModal) { logoPreviewModal.style.display = 'none'; }
        if (fileLogoFixa) fileLogoFixa.value = '';
    }

    logoArea.onclick = function() { fileLogoFixa.click(); };
    fileLogoFixa.onchange = function() {
        var file = this.files && this.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function() {
            var dataUrl = reader.result;
            if (dataUrl && dataUrl.length > 100) {
                openLogoPreview(dataUrl, file);
            } else { fileLogoFixa.value = ''; }
        };
        reader.readAsDataURL(file);
    };
    if (logoModalConfirm) logoModalConfirm.onclick = function() { closeLogoPreview(true); };
    if (logoModalCancel) logoModalCancel.onclick = function() { closeLogoPreview(false); };
    if (logoPreviewModal) {
        logoPreviewModal.onclick = function(e) {
            if (e.target === logoPreviewModal) closeLogoPreview(false);
        };
    }
    btnRemoverLogoFixa.onclick = function() {
        if (API_SETTINGS) {
            fetch(API_SETTINGS, { method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ defaultLogoUrl: null }), credentials: 'include' })
                .then(function(r) { if (!r.ok) throw new Error('Falha ao remover.'); return r.json(); })
                .then(function() { applyLogoToUI(''); })
                .catch(function() { alert('Não foi possível remover a logo fixa. Verifique se está autenticado.'); });
        } else {
            applyLogoToUI('');
        }
    };

    function saveCondicoesPadrao() {
        var val = document.getElementById('condicoes-padrao').value.trim();
        try { localStorage.setItem(CONDICOES_PADRAO_KEY, val); } catch (e) {}
        if (API_SETTINGS) {
            var btn = document.getElementById('btn-salvar-condicoes-padrao');
            var orig = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Salvando...';
            fetch(API_SETTINGS, { method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ condicoesPagamentoPadrao: val }), credentials: 'include' })
                .then(function(r) { if (!r.ok) throw new Error('Erro ao salvar.'); btn.textContent = 'Salvo!'; setTimeout(function() { btn.textContent = orig; btn.disabled = false; }, 1500); })
                .catch(function() { btn.textContent = orig; btn.disabled = false; alert('Erro ao salvar. Verifique se está autenticado.'); });
        } else {
            var btn = document.getElementById('btn-salvar-condicoes-padrao');
            btn.textContent = 'Salvo!';
            setTimeout(function() { btn.textContent = 'Salvar texto padrão'; }, 1500);
        }
    }
    document.getElementById('btn-salvar-condicoes-padrao').onclick = saveCondicoesPadrao;

    document.getElementById('escurecer-documentos').addEventListener('change', function() {
        try {
            localStorage.setItem(ESCURIR_KEY, this.checked ? '1' : '0');
        } catch (e) {}
    });

    function savePixToApi() {
        var p = {
            chave: document.getElementById('pix-chave').value.trim(),
            nome: document.getElementById('pix-nome').value.trim(),
            cidade: document.getElementById('pix-cidade').value.trim()
        };
        try { localStorage.setItem(PIX_KEY, JSON.stringify(p)); } catch (e) {}
        if (API_SETTINGS) {
            fetch(API_SETTINGS, { method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ pixChave: p.chave, pixNome: p.nome, pixCidade: p.cidade }), credentials: 'include' }).catch(function() {});
        }
    }
    document.getElementById('pix-chave').addEventListener('blur', savePixToApi);
    document.getElementById('pix-nome').addEventListener('blur', savePixToApi);
    document.getElementById('pix-cidade').addEventListener('blur', savePixToApi);

    function loadCatalogoLocal() {
        try {
            var s = localStorage.getItem(CATALOGO_KEY);
            var list = s ? JSON.parse(s) : [];
            loadCatalogoFromList(list);
        } catch (e) {}
    }
    function saveCatalogoToApi(list) {
        try { localStorage.setItem(CATALOGO_KEY, JSON.stringify(list)); } catch (e) {}
        if (API_SETTINGS) {
            fetch(API_SETTINGS, { method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ catalogoServicos: list }), credentials: 'include' }).catch(function() {});
        }
    }
    function escapeHtml(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
    document.getElementById('btn-add-catalogo').onclick = function() {
        var desc = document.getElementById('cat-desc').value.trim();
        var val = document.getElementById('cat-valor').value.trim().replace(',', '.');
        if (!desc) return;
        var list = [];
        try { var s = localStorage.getItem(CATALOGO_KEY); if (s) list = JSON.parse(s); } catch (e) {}
        list.push({ descricao: desc, valor: parseFloat(val) || 0 });
        saveCatalogoToApi(list);
        document.getElementById('cat-desc').value = ''; document.getElementById('cat-valor').value = '';
        loadCatalogoFromList(list);
    };
})();
