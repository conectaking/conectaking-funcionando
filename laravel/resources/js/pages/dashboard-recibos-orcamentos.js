/** dashboard-recibos-orcamentos — Vite entry (extracted inline) */
import '@mod/js/recibos-modulo-nav.js';
import '@css/css/recibos-modulo-mobile.css';
import '@mod/js/ck-auth-gate.js';

(function () {
            var origin = (window.location && window.location.origin) || 'https://www.conectaking.com.br';
            window.CONECTAKING_API_BASE = window.CONECTAKING_API_BASE || window.API_BASE || origin;
            window.API_BASE = window.API_BASE || window.CONECTAKING_API_BASE;
        })();


(async function() {
    var host = window.location.hostname || '';
    var port = String(window.location.port || '');
    var isLocal = /^127\.0\.0\.1|localhost$/i.test(host);
    var portasEstaticas = ['5500', '3000', '8080', '5173', '4173'];
    if (isLocal && portasEstaticas.indexOf(port) >= 0) {
        if (!(await window.CkAuth.requireAuth('/login'))) return;
    }
    var apiBase = (typeof window !== 'undefined' && (window.API_BASE || window.CONECTAKING_API_BASE));
    var PROD_API_BASE = 'https://www.conectaking.com.br';
    var apiOrigin = apiBase ? (apiBase.replace(/\/$/, '')) : ((typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin.replace(/\/$/, '') : PROD_API_BASE);
    var API = apiOrigin + '/api/documentos';

    function getAuthHeaders(extra) {
        var h = extra ? Object.assign({}, extra) : {};
        try {
            var token = (typeof localStorage !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('conectaKingToken'))) || null;
            if (token) h['Authorization'] = 'Bearer ' + token;
        } catch (e) {}
        return h;
    }

    var lista = document.getElementById('lista-documentos');
    var loading = document.getElementById('loading-docs');
    var empty = document.getElementById('empty-docs');
    var loadMoreWrap = document.getElementById('docs-load-more-wrap');
    var loadMoreBtn = document.getElementById('btn-docs-load-more');
    var allDocsCache = [];
    var docsMeta = { total: 0, limit: 30, offset: 0, hasMore: false, loading: false };
    var modalEl = document.getElementById('modal-escolha-doc');
    var modalTipoAtual = null;
    var ultimoPorTipo = { recibo: null, orcamento: null };

    function abrirModalEscolha(tipo) {
        tipo = (tipo || 'orcamento').toLowerCase();
        modalTipoAtual = tipo;
        var isRecibo = tipo === 'recibo';
        var label = isRecibo ? 'Recibo' : 'Orçamento';
        document.getElementById('modal-escolha-titulo').textContent = label;
        document.getElementById('modal-escolha-sub').textContent = 'Escolha se quer um documento novo ou continuar um existente.';
        var ult = ultimoPorTipo[tipo];
        var btnCont = document.getElementById('modal-btn-continuar');
        if (ult && ult.id) {
            btnCont.classList.remove('hidden');
            var tit = ult.titulo || (ult.emitente_json && ult.emitente_json.nome) || ('#' + ult.id);
            document.getElementById('modal-continuar-label').textContent = 'Continuar o último ' + label.toLowerCase();
            document.getElementById('modal-continuar-sub').textContent = tit + (ult.data_documento ? ' Â· ' + ult.data_documento.slice(0, 10) : '');
            btnCont.dataset.id = String(ult.id);
        } else {
            btnCont.classList.add('hidden');
            btnCont.dataset.id = '';
        }
        modalEl.classList.remove('hidden');
        modalEl.classList.add('flex');
        modalEl.setAttribute('aria-hidden', 'false');
        var ft = document.getElementById('filter-tipo');
        if (ft) ft.value = tipo;
    }
    function fecharModalEscolha() {
        modalEl.classList.add('hidden');
        modalEl.classList.remove('flex');
        modalEl.setAttribute('aria-hidden', 'true');
        modalTipoAtual = null;
        if (history.replaceState) {
            var u = new URL(location.href);
            u.searchParams.delete('abrir');
            history.replaceState(null, '', u.pathname + (u.search || ''));
        }
    }
    document.getElementById('modal-btn-novo').onclick = function() {
        if (!modalTipoAtual) return;
        location.href = 'recibos-orcamentos?novo=' + encodeURIComponent(modalTipoAtual);
    };
    document.getElementById('modal-btn-continuar').onclick = function() {
        var id = this.dataset.id;
        if (!id) return;
        location.href = 'recibos-orcamentos?id=' + encodeURIComponent(id);
    };
    document.getElementById('modal-btn-lista').onclick = function() {
        fecharModalEscolha();
        var sec = document.getElementById('lista-documentos');
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    document.getElementById('modal-btn-fechar').onclick = fecharModalEscolha;
    modalEl.addEventListener('click', function(e) { if (e.target === modalEl) fecharModalEscolha(); });
    document.getElementById('btn-abrir-recibo').onclick = function() { abrirModalEscolha('recibo'); };
    document.getElementById('btn-abrir-orcamento').onclick = function() { abrirModalEscolha('orcamento'); };

    (function abrirFromQuery() {
        var m = /[?&]abrir=(recibo|orcamento)/i.exec(location.search);
        if (m) abrirModalEscolha(m[1].toLowerCase());
        var ft = /[?&]tipo=(recibo|orcamento)/i.exec(location.search);
        if (ft && document.getElementById('filter-tipo')) document.getElementById('filter-tipo').value = ft[1].toLowerCase();
    })();

    function currentTipoFilter() {
        return (document.getElementById('filter-tipo') && document.getElementById('filter-tipo').value) || '';
    }

    function syncLoadMoreUi() {
        if (!loadMoreWrap || !loadMoreBtn) return;
        if (!docsMeta.hasMore) {
            loadMoreWrap.classList.add('hidden');
            return;
        }
        loadMoreWrap.classList.remove('hidden');
        var loaded = allDocsCache.length;
        var total = docsMeta.total || loaded;
        loadMoreBtn.disabled = !!docsMeta.loading;
        loadMoreBtn.textContent = docsMeta.loading
            ? 'A carregarâ€¦'
            : ('Carregar mais (' + loaded + ' de ' + total + ')');
    }

    function appendDocRow(doc) {
        var tipo = (doc.tipo || 'orcamento').toLowerCase();
        var label = tipo === 'recibo' ? 'Recibo' : 'Orçamento';
        var titulo = doc.titulo || (doc.emitente_json && doc.emitente_json.nome) || ('Documento #' + doc.id);
        var dataDoc = doc.data_documento ? String(doc.data_documento).slice(0, 10) : '';
        var row = document.createElement('div');
        row.className = 'flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-border-dark hover:bg-slate-50 dark:hover:bg-black/40 transition-colors doc-row';
        row.dataset.id = doc.id;
        row.dataset.tipo = tipo;
        var editUrl = 'recibos-orcamentos?id=' + encodeURIComponent(doc.id);
        row.innerHTML = '<label class="flex-shrink-0 cursor-pointer"><input type="checkbox" class="doc-check rounded border-slate-300 text-primary focus:ring-primary" data-id="' + escapeHtmlAttr(doc.id) + '"/></label>' +
            '<div class="flex-1 flex items-center gap-2 min-w-0">' +
            '<a href="' + editUrl + '" class="flex-1 flex items-center justify-between no-underline text-inherit min-w-0 gap-2">' +
            '<div class="min-w-0"><span class="font-medium dark:text-white">' + escapeHtml(titulo) + '</span><span class="text-sm ml-2 ' + (tipo === 'recibo' ? 'text-green-500' : 'text-blue-500') + '">' + label + '</span></div>' +
            '<span class="text-slate-500 text-sm flex-shrink-0">' + escapeHtml(dataDoc) + '</span></a>' +
            '<div class="flex items-center gap-0.5 flex-shrink-0">' +
            '<a href="' + editUrl + '" class="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors" title="Editar"><span class="material-icons-outlined text-lg">edit</span></a>' +
            '<button type="button" class="btn-duplicar p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors" title="Duplicar" data-id="' + escapeHtmlAttr(doc.id) + '"><span class="material-icons-outlined text-lg">content_copy</span></button>' +
            '<button type="button" class="btn-excluir p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Excluir" data-id="' + escapeHtmlAttr(doc.id) + '"><span class="material-icons-outlined text-lg">delete</span></button>' +
            '</div></div>';
        lista.appendChild(row);
        row.querySelector('.btn-duplicar').onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            var idDup = this.dataset.id;
            var btnDup = this;
            btnDup.disabled = true;
            fetch(API + '/' + idDup + '/duplicate', { method: 'POST', credentials: 'include', headers: getAuthHeaders({ 'Content-Type': 'application/json' }) })
                .then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j: j }; }); })
                .then(function(res) {
                    if (!res.ok || !res.j || !res.j.success || !res.j.data || !res.j.data.id) {
                        alert((res.j && res.j.message) || 'Erro ao duplicar.');
                        return;
                    }
                    window.location.href = 'recibos-orcamentos?id=' + encodeURIComponent(res.j.data.id);
                })
                .catch(function() { alert('Erro ao duplicar.'); })
                .finally(function() { btnDup.disabled = false; });
        };
        row.querySelector('.btn-excluir').onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            var id = this.dataset.id;
            if (!id || !confirm('Excluir este documento?')) return;
            var btn = this;
            btn.disabled = true;
            fetch(API + '/' + id, { method: 'DELETE', credentials: 'include', headers: getAuthHeaders() })
                .then(function(r) {
                    if (r.ok) {
                        row.remove();
                        allDocsCache = allDocsCache.filter(function(d) { return String(d.id) !== String(id); });
                        if (!lista.querySelector('.doc-row:not([style*="display: none"])')) empty.classList.remove('hidden');
                        syncLoadMoreUi();
                    } else { alert('Erro ao excluir.'); }
                })
                .catch(function() { alert('Erro ao excluir.'); })
                .finally(function() { btn.disabled = false; });
        };
    }

    function applyTipoFilterToDom() {
        var ft = currentTipoFilter();
        var visible = 0;
        lista.querySelectorAll('.doc-row').forEach(function(row) {
            var show = !ft || row.dataset.tipo === ft;
            row.style.display = show ? '' : 'none';
            if (show) visible += 1;
        });
        if (visible === 0 && allDocsCache.length) empty.classList.remove('hidden');
        else if (visible > 0) empty.classList.add('hidden');
        else if (!allDocsCache.length) empty.classList.remove('hidden');
    }

    function renderDocsFromCache(replace) {
        if (replace) lista.innerHTML = '';
        var seen = new Set();
        if (!replace) {
            lista.querySelectorAll('.doc-row').forEach(function(row) { seen.add(String(row.dataset.id)); });
        }
        allDocsCache.forEach(function(doc) {
            if (seen.has(String(doc.id))) return;
            appendDocRow(doc);
        });
        applyTipoFilterToDom();
        syncLoadMoreUi();
    }

    function fetchDocsPage(offset, replace) {
        if (docsMeta.loading) return Promise.resolve();
        docsMeta.loading = true;
        syncLoadMoreUi();
        var q = new URLSearchParams({
            limit: String(docsMeta.limit),
            offset: String(Math.max(0, offset || 0))
        });
        return fetch(API + '?' + q.toString(), { method: 'GET', credentials: 'include', headers: getAuthHeaders() })
            .then(function(r) {
                if (r.status === 401) { loading.textContent = 'Faça login para ver os documentos.'; return null; }
                return r.json().then(function(data) { return r.ok ? data : null; }).catch(function() { return null; });
            })
            .then(function(data) {
                loading.classList.add('hidden');
                if (!data) {
                    docsMeta.loading = false;
                    syncLoadMoreUi();
                    return;
                }
                var payload = (data && data.data) ? data.data : data;
                var pageDocs = (payload && payload.documentos) ? payload.documentos : (Array.isArray(payload) ? payload : []);
                docsMeta.total = Number(payload && payload.total != null ? payload.total : (replace ? pageDocs.length : docsMeta.total)) || 0;
                docsMeta.limit = Number(payload && payload.limit != null ? payload.limit : docsMeta.limit) || 30;
                docsMeta.offset = Number(payload && payload.offset != null ? payload.offset : offset) || 0;
                docsMeta.hasMore = !!(payload && payload.hasMore);
                if (replace) {
                    allDocsCache = pageDocs.slice();
                    ultimoPorTipo = { recibo: null, orcamento: null };
                } else {
                    var ids = new Set(allDocsCache.map(function(d) { return String(d.id); }));
                    pageDocs.forEach(function(d) {
                        if (ids.has(String(d.id))) return;
                        ids.add(String(d.id));
                        allDocsCache.push(d);
                    });
                }
                allDocsCache.forEach(function(d) {
                    var t = (d.tipo || '').toLowerCase();
                    if (t === 'recibo' && !ultimoPorTipo.recibo) ultimoPorTipo.recibo = d;
                    if (t === 'orcamento' && !ultimoPorTipo.orcamento) ultimoPorTipo.orcamento = d;
                });
                if (!allDocsCache.length) {
                    empty.classList.remove('hidden');
                    document.getElementById('bulk-actions').classList.add('hidden');
                } else {
                    empty.classList.add('hidden');
                    document.getElementById('bulk-actions').classList.remove('hidden');
                }
                renderDocsFromCache(!!replace);
            })
            .catch(function() {
                loading.textContent = 'Erro ao carregar. Verifique o login.';
                empty.classList.add('hidden');
            })
            .finally(function() {
                docsMeta.loading = false;
                syncLoadMoreUi();
            });
    }

    if (loadMoreBtn) {
        loadMoreBtn.onclick = function() {
            if (!docsMeta.hasMore || docsMeta.loading) return;
            fetchDocsPage(allDocsCache.length, false);
        };
    }

    fetchDocsPage(0, true).then(function() {
        document.getElementById('filter-tipo').onchange = function() { applyTipoFilterToDom(); };
        document.getElementById('select-all').onchange = function() {
            lista.querySelectorAll('.doc-row').forEach(function(row) {
                if (row.style.display === 'none') return;
                var cb = row.querySelector('.doc-check');
                if (cb) cb.checked = this.checked;
            }.bind(this));
        };
        document.getElementById('btn-excluir-selecionados').onclick = function() {
            var ids = [];
            lista.querySelectorAll('.doc-check:checked').forEach(function(cb) { ids.push(cb.dataset.id); });
            if (!ids.length) { alert('Selecione pelo menos um documento.'); return; }
            if (!confirm('Excluir ' + ids.length + ' documento(s)?')) return;
            var btn = this;
            btn.disabled = true;
            var promises = ids.map(function(id) {
                return fetch(API + '/' + id, { method: 'DELETE', credentials: 'include', headers: getAuthHeaders() });
            });
            Promise.all(promises).then(function() {
                ids.forEach(function(id) {
                    var r = lista.querySelector('.doc-row[data-id="' + id + '"]');
                    if (r) r.remove();
                });
                allDocsCache = allDocsCache.filter(function(d) { return ids.indexOf(String(d.id)) < 0; });
                if (lista.children.length === 0) empty.classList.remove('hidden');
                syncLoadMoreUi();
            }).catch(function() { alert('Erro ao excluir.'); }).finally(function() { btn.disabled = false; });
        };
    });

    function escapeHtml(s) {
        if (!s) return '';
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }
    function escapeHtmlAttr(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
})();
