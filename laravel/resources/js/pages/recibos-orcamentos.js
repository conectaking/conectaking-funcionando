/** recibos-orcamentos — Vite entry (extracted inline) */
import '@css/css/recibos-modulo-mobile.css';
import '@css/pages/recibos-orcamentos.css';
import '@mod/js/ck-auth-gate.js';
import '@mod/js/ck-csrf.js';

(function () {
            var origin = (window.location && window.location.origin) || 'https://www.conectaking.com.br';
            window.CONECTAKING_API_BASE = window.CONECTAKING_API_BASE || window.API_BASE || origin;
            window.API_BASE = window.API_BASE || window.CONECTAKING_API_BASE;
        })();


(async function() {
    if (!(await window.CkAuth.requireAuth('/login?redirect=' + encodeURIComponent(location.pathname + location.search)))) return;

    // Usar a mesma base da API do dashboard (banner/carrossel). Assim o upload de logo usa o mesmo servidor e CORS.
    var PROD_API_BASE = 'https://www.conectaking.com.br';
    var host = window.location.hostname || '';
    var port = String(window.location.port || '');
    var isLocal = /^127\.0\.0\.1|localhost$/i.test(host);
    var portasEstaticas = ['5500', '3000', '8080', '5173', '4173'];
    function resolveApiOrigin() {
        var explicit = (typeof window !== 'undefined' && (window.API_BASE || window.CONECTAKING_API_BASE));
        if (explicit) return String(explicit).replace(/\/$/, '');
        // Padrão Laravel/FrankenPHP: mesma origem (produção e Docker local :8080)
        if (typeof window !== 'undefined' && window.location && window.location.origin) {
            return window.location.origin.replace(/\/$/, '');
        }
        return PROD_API_BASE;
    }
    var apiOrigin = resolveApiOrigin();
    var API = apiOrigin + '/api/documentos';
    var API_SETTINGS = apiOrigin + '/api/documentos/settings';
    var UPLOAD_API = apiOrigin + '/api/upload';
    var docId = (function() { var m = /[?&]id=([^&]+)/.exec(location.search); return m ? m[1] : null; })();
    var novoTipo = (function() {
        var m = /[?&]novo=(recibo|orcamento)/i.exec(location.search);
        return m ? m[1].toLowerCase() : null;
    })();
    var linkToken = null;
    var defaultLogoUrlFromApi = null;

    function saveLastDocumentId(id) {
        if (!id || !API_SETTINGS) return;
        fetch(API_SETTINGS, { method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ lastDocumentId: parseInt(id, 10) || id }), credentials: 'include' }).catch(function() {});
    }

    function getAuthHeaders(extra) {
        var h = extra ? Object.assign({}, extra) : {};
        try {
            var token = (typeof localStorage !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('conectaKingToken'))) || null;
            if (token) h['Authorization'] = 'Bearer ' + token;
        } catch (e) {}
        try {
            if (window.CkCsrf && typeof window.CkCsrf.attachToHeaders === 'function') {
                h = window.CkCsrf.attachToHeaders(h, 'POST');
            } else {
                var m = document.cookie.match(/(?:^|; )ck_csrf=([^;]*)/);
                var csrf = m ? decodeURIComponent(m[1]) : '';
                if (csrf && !h['X-CK-CSRF']) h['X-CK-CSRF'] = csrf;
            }
        } catch (e2) {}
        return h;
    }

    function isMobileDevice() {
        try {
            return /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
        } catch (e) { return false; }
    }

    function apiFetchTimeoutMs() {
        return isMobileDevice() ? 180000 : 120000;
    }

    function friendlyFetchError(err, context) {
        var msg = (err && err.message) ? String(err.message) : '';
        if (err && err.name === 'AbortError') {
            return 'Demorou demais para responder. No celular a primeira vez pode levar até 2 min (servidor acordando). Tente de novo.';
        }
        if (/failed to fetch|load failed|networkerror|network request failed|network connection/i.test(msg)) {
            return (context || 'Não foi possível conectar ao servidor') + '. Verifique a internet e tente novamente. Se persistir, aguarde 30s e repita (API: ' + apiOrigin + ').';
        }
        return msg || 'Erro de rede ao comunicar com o servidor.';
    }

    function isCrossOriginApi(url) {
        try {
            if (!url || String(url).indexOf('http') !== 0) return false;
            var u = new URL(String(url), window.location.href);
            return u.origin !== window.location.origin;
        } catch (e) { return true; }
    }

    function apiCredentials(url, opts) {
        if (opts && opts.credentials !== undefined) return opts.credentials;
        return isCrossOriginApi(url) ? 'omit' : 'include';
    }

    function apiFetch(url, opts) {
        opts = opts || {};
        var timeout = opts.timeout != null ? opts.timeout : apiFetchTimeoutMs();
        var controller = new AbortController();
        var tid = setTimeout(function () { controller.abort(); }, timeout);
        var headers = getAuthHeaders(opts.headers || {});
        if (opts.body instanceof FormData) {
            delete headers['Content-Type'];
        }
        return fetch(url, {
            method: opts.method || 'GET',
            body: opts.body,
            headers: headers,
            credentials: apiCredentials(url, opts),
            signal: controller.signal
        }).then(function (r) {
            clearTimeout(tid);
            return r;
        }).catch(function (err) {
            clearTimeout(tid);
            throw new Error(friendlyFetchError(err, 'Não foi possível conectar ao servidor'));
        });
    }

    /** Mobile: XHR primeiro (fetch+FormData falha em vários Android/iOS cross-origin). */
    function uploadFormData(url, formData, timeoutMs) {
        timeoutMs = timeoutMs != null ? timeoutMs : apiFetchTimeoutMs();
        function xhrUpload() {
            return new Promise(function (resolve, reject) {
                var xhr = new XMLHttpRequest();
                var tid = setTimeout(function () { xhr.abort(); }, timeoutMs);
                xhr.open('POST', url, true);
                var headers = getAuthHeaders();
                Object.keys(headers).forEach(function (k) {
                    if (k.toLowerCase() === 'content-type') return;
                    xhr.setRequestHeader(k, headers[k]);
                });
                xhr.onload = function () {
                    clearTimeout(tid);
                    resolve({
                        ok: xhr.status >= 200 && xhr.status < 300,
                        status: xhr.status,
                        headers: { get: function (h) { return xhr.getResponseHeader(h); } },
                        text: function () { return Promise.resolve(xhr.responseText || ''); }
                    });
                };
                xhr.onerror = function () {
                    clearTimeout(tid);
                    reject(new Error(friendlyFetchError({ message: 'Failed to fetch' }, 'Falha ao enviar a foto')));
                };
                xhr.onabort = function () {
                    clearTimeout(tid);
                    reject(new Error(friendlyFetchError({ name: 'AbortError' })));
                };
                xhr.send(formData);
            });
        }
        if (isMobileDevice()) return xhrUpload();
        if (typeof fetch === 'function') {
            return apiFetch(url, { method: 'POST', body: formData, timeout: timeoutMs }).catch(function () {
                return xhrUpload();
            });
        }
        return xhrUpload();
    }

    var apiWarmPromise = null;
    function warmUpApi() {
        if (window.__recibosApiWarmed) return Promise.resolve();
        var ping = apiFetch(apiOrigin + '/health', { timeout: 20000, credentials: 'omit' }).catch(function () {});
        if (isMobileDevice()) {
            apiFetch(apiOrigin + '/api/documentos/warm-ocr', { timeout: 60000, credentials: 'omit' }).catch(function () {});
            window.__recibosApiWarmed = true;
            return ping;
        }
        if (apiWarmPromise) return apiWarmPromise;
        apiWarmPromise = ping
            .then(function () {
                return apiFetch(apiOrigin + '/api/documentos/warm-ocr', { timeout: 90000, credentials: 'omit' });
            })
            .then(function () { window.__recibosApiWarmed = true; })
            .catch(function () { window.__recibosApiWarmed = true; apiWarmPromise = null; });
        return apiWarmPromise;
    }

    /** Comprime foto para OCR no celular (evita timeout no servidor + mantém texto legível). */
    function compressImageFileForUpload(file, maxSide) {
        maxSide = maxSide || 1600;
        var quality = isMobileDevice() ? 0.86 : 0.84;
        return new Promise(function (resolve) {
            if (!file || !file.type || file.type.indexOf('image/') !== 0) { resolve(file); return; }
            if (!isMobileDevice() && file.size < 700000) { resolve(file); return; }
            var img = new Image();
            var objUrl = URL.createObjectURL(file);
            img.onload = function () {
                URL.revokeObjectURL(objUrl);
                var w = img.width;
                var h = img.height;
                var scale = Math.min(1, maxSide / Math.max(w, h));
                if (!isMobileDevice() && scale >= 1 && file.size < 1200000) { resolve(file); return; }
                var cw = Math.max(1, Math.round(w * scale));
                var ch = Math.max(1, Math.round(h * scale));
                var canvas = document.createElement('canvas');
                canvas.width = cw;
                canvas.height = ch;
                canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
                canvas.toBlob(function (blob) {
                    if (!blob) { resolve(file); return; }
                    var name = (file.name || 'foto').replace(/\.[^.]+$/, '') + '.jpg';
                    resolve(new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }));
                }, 'image/jpeg', quality);
            };
            img.onerror = function () { URL.revokeObjectURL(objUrl); resolve(file); };
            img.src = objUrl;
        });
    }

    function handleResponse(r, msgLogin) {
        msgLogin = msgLogin || 'Faça login na aplicação para usar recibos e orçamentos.';
        if (r.status === 401) throw new Error(msgLogin);
        if (r.status === 404) throw new Error('Serviço indisponível (404). Verifique se está no mesmo domínio do painel e se a API está ativa.');
        var ct = (r.headers.get('content-type') || '').toLowerCase();
        return r.text().then(function(text) {
            if (ct.indexOf('application/json') === -1) throw new Error(r.ok ? 'Resposta inválida do servidor.' : (msgLogin));
            var data;
            try { data = JSON.parse(text); } catch (e) { throw new Error(msgLogin); }
            if (!r.ok) throw new Error((data && data.message) || msgLogin);
            return data;
        });
    }

    var CONDICOES_PADRAO_KEY = 'recibosOrcamentosCondicoesPadrao';
    function highlightBottomNav(tipo) {
        var isRec = (tipo || '').toLowerCase() === 'recibo';
        document.querySelectorAll('.bottom-nav-safe a').forEach(function(a) {
            a.classList.remove('text-primary');
            a.classList.add('text-slate-400');
        });
        var sel = isRec
            ? document.querySelector('.bottom-nav-safe a[href*="abrir=recibo"]')
            : document.querySelector('.bottom-nav-safe a[href*="abrir=orcamento"]');
        if (sel) {
            sel.classList.remove('text-slate-400');
            sel.classList.add('text-primary');
        }
    }
    function applyTipoUI(tipo) {
        var isRecibo = (tipo || '').toLowerCase() === 'recibo';
        highlightBottomNav(tipo);
        if (!isRecibo) {
            var condInp = document.querySelector('textarea[name="condicoes_pagamento"]');
            if (condInp && (!condInp.value || !condInp.value.trim())) {
                try {
                    var padrao = localStorage.getItem(CONDICOES_PADRAO_KEY);
                    if (padrao && padrao.trim()) condInp.value = padrao.trim();
                } catch (e) {}
            }
        }
        document.querySelector('input[name="tipo"]').value = isRecibo ? 'recibo' : 'orcamento';
        document.getElementById('page-title').textContent = isRecibo ? 'Novo Recibo' : 'Novo Orçamento';
        document.getElementById('page-subtitle').textContent = isRecibo ? 'Emita recibos profissionais' : 'Crie documentos profissionais em segundos';
        document.getElementById('label-validade').textContent = isRecibo ? 'Validade (Até)' : 'Validade do Orçamento (Até)';
        document.getElementById('itens-section-title').textContent = isRecibo ? 'Itens do Recibo' : 'Itens';
        updateItensCount();
        document.getElementById('total-label').textContent = isRecibo ? 'Valor Total' : 'Valor Total Estimado';
        document.getElementById('btn-submit-text').textContent = isRecibo ? 'Salvar Recibo' : 'Salvar Orçamento';
        document.getElementById('btn-add-item-label').textContent = isRecibo ? 'Adicionar Linha' : 'Adicionar Nova Linha';
        var reciboBlock = document.getElementById('recibo-tirar-configurar');
        var notasBlock = document.getElementById('recibo-notas-fiscais');
        reciboBlock.style.display = isRecibo ? 'block' : 'none';
        if (notasBlock) notasBlock.style.display = isRecibo ? 'block' : 'none';
        if (isRecibo) {
            renderNotasFiscais();
            document.getElementById('comprovante-upload-area').style.display = 'flex';
            document.getElementById('comprovante-sem-id').style.display = docId ? 'none' : 'block';
        }
    }
    function ensureDocIdThen(callback) {
        if (docId) return callback();
        document.querySelector('input[name="tipo"]').value = 'recibo';
        var body = getFormDoc();
        apiFetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            .then(function(r) { return handleResponse(r, 'Faça login na aplicação para criar recibos.'); })
            .then(function(data) {
                var id = data.data && data.data.id;
                if (!id) throw new Error('Recibo não foi criado.');
                docId = id;
                saveLastDocumentId(docId);
                var newUrl = location.pathname + '?id=' + docId;
                history.replaceState(null, '', newUrl);
                document.getElementById('btn-exportar-pdf').style.display = '';
                document.getElementById('comprovante-sem-id').style.display = 'none';
                callback();
            })
            .catch(function(err) {
                var msg = err.message || 'Erro ao salvar recibo.';
                if (msg.indexOf('login') === -1) msg += ' Faça login na aplicação (mesmo domínio Laravel).';
                alert(msg);
            });
    }
    function syncFormBeforeOcr(callback) {
        ensureDocIdThen(function() {
            apiFetch(API + '/' + docId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(getFormDoc()) })
                .then(function(r) { return handleResponse(r, 'Faça login para salvar o recibo.'); })
                .then(function() { callback(); })
                .catch(function() { callback(); });
        });
    }
    function uploadComprovanteComRetry(fd, jaTentou) {
        return uploadFormData(API + '/' + docId + '/processar-comprovante', fd)
            .then(function(r) { return handleResponse(r, 'Faça login para enviar comprovantes.'); })
            .catch(function(err) {
                if (isMobileDevice() && !jaTentou) {
                    return new Promise(function(resolve) { setTimeout(resolve, 3000); })
                        .then(function() { return warmUpApi(); })
                        .then(function() { return uploadComprovanteComRetry(fd, true); });
                }
                throw err;
            });
    }
    function enviarComprovante(fileInput) {
        var files = fileInput.files ? Array.prototype.slice.call(fileInput.files) : [];
        if (!files.length) return;
        syncFormBeforeOcr(function() {
            var scanResumo = { lidosOcr: 0, inseridos: 0, duplicata: 0, porFoto: [], ocrIa: false, openAiError: null, iaIndisponivel: false };
            var etiqueta = document.getElementById('ocr-etiqueta-itens');
            var etiquetaVal = etiqueta && etiqueta.value.trim() ? etiqueta.value.trim() : '';
            var btn = document.getElementById('btn-tirar-foto');
            var btnArq = document.getElementById('btn-enviar-arquivo');
            var origHtml = btn ? btn.innerHTML : '';
            var origArq = btnArq ? btnArq.innerHTML : '';
            function setBusy(on, idx, total) {
                var label = on && total > 1
                    ? '<span class="material-icons-outlined">hourglass_empty</span> Foto ' + (idx + 1) + '/' + total + '...'
                    : (on ? '<span class="material-icons-outlined">hourglass_empty</span> Digitalizando...' : origHtml);
                if (btn) { btn.disabled = on; btn.innerHTML = on ? label : origHtml; }
                if (btnArq) { btnArq.disabled = on; btnArq.innerHTML = on ? label : origArq; }
            }
            function montarMsgScan(total) {
                var linhas = [];
                if (files.length > 1) {
                    linhas.push(files.length + ' foto(s) processada(s):');
                    scanResumo.porFoto.forEach(function(p, idx) {
                        var det = 'Foto ' + (idx + 1) + ': ' + p.lidosOcr + ' lido(s)';
                        if (p.inseridos !== p.lidosOcr) det += ', ' + p.inseridos + ' adicionado(s)';
                        else if (p.inseridos > 0) det += ', ' + p.inseridos + ' adicionado(s)';
                        if (p.duplicata > 0) det += ' (' + p.duplicata + ' já na tabela)';
                        linhas.push(det);
                    });
                    linhas.push('');
                }
                linhas.push('Desta digitalização: ' + scanResumo.lidosOcr + ' item(ns) lido(s) na imagem' + (scanResumo.ocrIa ? ' (IA OpenAI)' : '') + '.');
                if (scanResumo.inseridos !== scanResumo.lidosOcr) {
                    linhas.push(scanResumo.inseridos + ' adicionado(s) Ã  tabela' + (scanResumo.duplicata ? ' (' + scanResumo.duplicata + ' já existiam).' : '.'));
                } else if (scanResumo.inseridos > 0) {
                    linhas.push(scanResumo.inseridos + ' adicionado(s) Ã  tabela.');
                } else if (scanResumo.lidosOcr > 0) {
                    linhas.push('Nenhum item novo (todos já estavam na tabela).');
                } else if (scanResumo.openAiError) {
                    linhas.push('Erro na IA: ' + scanResumo.openAiError);
                } else if (scanResumo.iaIndisponivel) {
                    linhas.push('IA OpenAI não configurada no servidor — peça para ativar OPENAI_API_KEY no ambiente da VPS.');
                } else {
                    linhas.push('Nenhum item identificado. Marque "Usar IA OpenAI" e tente outra foto.');
                }
                linhas.push('Total na tabela: ' + total + ' item(ns).');
                return linhas.join('\n');
            }
            function enviarUm(i, docAcumulado) {
                if (i >= files.length) {
                    setBusy(false);
                    fileInput.value = '';
                    if (docAcumulado) {
                        setFormDoc(docAcumulado);
                        var total = (docAcumulado.itens_json || []).length;
                        alert(montarMsgScan(total));
                    }
                    return;
                }
                setBusy(true, i, files.length);
                warmUpApi()
                    .then(function() { return compressImageFileForUpload(files[i]); })
                    .then(function(filePrepared) {
                        var fd = new FormData();
                        fd.append('image', filePrepared);
                        if (etiquetaVal) fd.append('etiqueta_itens', etiquetaVal);
                        fd.append('acumular', '1');
                        var chkIa = document.getElementById('ocr-usar-ia');
                        fd.append('usar_ia', (chkIa && !chkIa.checked) ? '0' : '1');
                        return uploadComprovanteComRetry(fd, false);
                    })
                    .then(function(data) {
                        var payload = data && data.data;
                        var doc = payload && payload.documento;
                        if (!doc) throw new Error(data.message || 'Falha ao digitalizar.');
                        var st = (payload && payload.stats) || {};
                        var itensResp = (payload && payload.itensAdicionados) || [];
                        var lidosFoto = (typeof st.lidosOcr === 'number' && st.lidosOcr > 0)
                            ? st.lidosOcr
                            : Math.max(itensResp.length, (payload.parse_result && payload.parse_result.openAiItens) || 0, itensResp.length);
                        var insFoto = (typeof st.inseridos === 'number') ? st.inseridos : itensResp.length;
                        scanResumo.porFoto.push({
                            lidosOcr: lidosFoto,
                            inseridos: insFoto,
                            duplicata: st.ignoradosDuplicata || 0
                        });
                        scanResumo.lidosOcr += lidosFoto;
                        scanResumo.inseridos += insFoto;
                        scanResumo.duplicata += st.ignoradosDuplicata || 0;
                        if (st.ocrEngine === 'openai' || st.ocrEngine === 'hybrid') scanResumo.ocrIa = true;
                        if (payload.parse_result && payload.parse_result.parallel) scanResumo.ocrIa = true;
                        if (st.openAiError) scanResumo.openAiError = st.openAiError;
                        if (st.openAiAvailable === false) scanResumo.iaIndisponivel = true;
                        enviarUm(i + 1, doc);
                    })
                    .catch(function(err) {
                        setBusy(false);
                        fileInput.value = '';
                        alert(err.message || 'Erro ao enviar. Faça login na aplicação.');
                    });
            }
            enviarUm(0, null);
        });
    }
    (function initOcrIaStatus() {
        var el = document.getElementById('ocr-ia-status');
        if (!el) return;
        function showPending() {
            el.textContent = 'IA OpenAI: ao digitalizar, usa OPENAI_API_KEY deste servidor. Checkbox marcado = prioridade IA.';
            el.className = 'text-xs text-slate-400 dark:text-slate-500 mb-3';
        }
        fetch(apiOrigin + '/api/documentos/ocr-info', { credentials: 'omit' })
            .then(function(r) {
                if (!r.ok) { showPending(); return null; }
                return r.json();
            })
            .then(function(data) {
                if (!data || !data.data) { showPending(); return; }
                var info = data.data;
                if (info.openAiAvailable) {
                    el.textContent = 'IA OpenAI ativa no servidor (' + (info.model || 'gpt-4o-mini') + ').';
                    el.className = 'text-xs text-emerald-600 dark:text-emerald-400 mb-3';
                } else {
                    el.textContent = 'OPENAI_API_KEY ausente neste servidor — digitalização usará só OCR local.';
                    el.className = 'text-xs text-amber-600 dark:text-amber-400 mb-3';
                }
            })
            .catch(function() { showPending(); });
    })();
    (function initOcrEtiquetaVoz() {
        var btn = document.getElementById('btn-ocr-etiqueta-voz');
        var inp = document.getElementById('ocr-etiqueta-itens');
        if (!btn || !inp) return;
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            btn.style.display = 'none';
            return;
        }
        var rec = new SR();
        rec.lang = 'pt-BR';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        btn.onclick = function() {
            try {
                rec.onresult = function(ev) {
                    var t = ev.results && ev.results[0] && ev.results[0][0] && ev.results[0][0].transcript;
                    if (t) inp.value = (inp.value ? inp.value + ' ' : '') + t.trim();
                };
                rec.onerror = function() { alert('Não foi possível usar o microfone. Digite a etiqueta.'); };
                rec.start();
            } catch (e) { alert('Microfone indisponível neste navegador.'); }
        };
    })();
    document.getElementById('btn-tirar-foto').onclick = function() { document.getElementById('file-comprovante-camera').click(); };
    document.getElementById('btn-enviar-arquivo').onclick = function() { document.getElementById('file-comprovante-arquivo').click(); };
    document.getElementById('file-comprovante-camera').onchange = function() { enviarComprovante(this); };
    document.getElementById('file-comprovante-arquivo').onchange = function() { enviarComprovante(this); };
    document.getElementById('btn-configurar').onclick = function() {
        var tbody = document.getElementById('itens-tbody');
        if (tbody && tbody.firstElementChild) {
            tbody.scrollIntoView({ behavior: 'smooth', block: 'start' });
            var firstVal = tbody.querySelector('.item-valor');
            if (firstVal) firstVal.focus();
        }
    };

    function fmtMoney(n) {
        if (n == null || isNaN(n)) return '0,00';
        return Number(n).toFixed(2).replace('.', ',');
    }
    function parseBr(s) {
        if (!s || !String(s).trim()) return 0;
        return parseFloat(String(s).replace(/\s/g, '').replace(/\./g, '').replace(',', '.')) || 0;
    }

    function newItemUid() {
        return 'it-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    }

    var ITENS_SORT_STORAGE_KEY = 'recibosItensOrdenacao';
    var itemSortMode = 'data-desc';
    try {
        var savedSort = localStorage.getItem(ITENS_SORT_STORAGE_KEY);
        if (savedSort === 'nome' || savedSort === 'data-desc' || savedSort === 'data-asc') itemSortMode = savedSort;
        if (savedSort === 'data') itemSortMode = 'data-desc';
    } catch (eSort) {}

    function parseItemDateSort(s) {
        var t = (s || '').trim();
        var m = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
        if (!m) return 0;
        var day = parseInt(m[1], 10);
        var month = parseInt(m[2], 10);
        var year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
        if (year < 100) year += 2000;
        var dt = new Date(year, month - 1, day);
        return isNaN(dt.getTime()) ? 0 : dt.getTime();
    }

    function getItemRowNomeSort(tr) {
        return (tr.querySelector('input[name="item_descricao[]"]').value || '').trim().toLowerCase();
    }

    function updateOrdenacaoButtonsUI() {
        var btnDesc = document.getElementById('btn-ordenar-data-desc');
        var btnAsc = document.getElementById('btn-ordenar-data-asc');
        var btnNome = document.getElementById('btn-ordenar-nome');
        if (!btnDesc || !btnAsc || !btnNome) return;
        btnDesc.classList.toggle('is-active', itemSortMode === 'data-desc');
        btnAsc.classList.toggle('is-active', itemSortMode === 'data-asc');
        btnNome.classList.toggle('is-active', itemSortMode === 'nome');
    }

    function sortItemRows() {
        var tbody = document.getElementById('itens-tbody');
        if (!tbody) return;
        var rows = Array.prototype.slice.call(tbody.querySelectorAll('.item-row'));
        rows.sort(function(a, b) {
            if (itemSortMode === 'nome') {
                var cmp = getItemRowNomeSort(a).localeCompare(getItemRowNomeSort(b), 'pt-BR', { sensitivity: 'base' });
                if (cmp !== 0) return cmp;
                return parseItemDateSort(b.querySelector('input[name="item_data[]"]').value)
                    - parseItemDateSort(a.querySelector('input[name="item_data[]"]').value);
            }
            var da = parseItemDateSort(a.querySelector('input[name="item_data[]"]').value);
            var db = parseItemDateSort(b.querySelector('input[name="item_data[]"]').value);
            if (da !== db) {
                return itemSortMode === 'data-asc' ? (da - db) : (db - da);
            }
            return getItemRowNomeSort(a).localeCompare(getItemRowNomeSort(b), 'pt-BR', { sensitivity: 'base' });
        });
        rows.forEach(function(tr) { tbody.appendChild(tr); });
        renderNotasFiscais();
    }

    function setItemSortMode(mode) {
        if (mode === 'nome' || mode === 'data-asc' || mode === 'data-desc') itemSortMode = mode;
        else itemSortMode = 'data-desc';
        try { localStorage.setItem(ITENS_SORT_STORAGE_KEY, itemSortMode); } catch (e) {}
        updateOrdenacaoButtonsUI();
        sortItemRows();
    }

    function getItemRowValor(tr) {
        var inp = tr.querySelector('.item-valor');
        if (inp) return parseBr(inp.value);
        var qtd = parseInt(tr.querySelector('input[name="item_qtd[]"]').value, 10) || 1;
        return qtd * parseBr(tr.querySelector('.item-unit').value);
    }

    function syncItemRowHidden(tr) {
        var val = getItemRowValor(tr);
        var unit = tr.querySelector('.item-unit');
        var qtd = tr.querySelector('input[name="item_qtd[]"]');
        if (unit) unit.value = fmtMoney(val);
        if (qtd) qtd.value = '1';
    }

    function bindItemRowEvents(tr) {
        var valInp = tr.querySelector('.item-valor');
        if (valInp) valInp.addEventListener('input', function() { syncItemRowHidden(tr); updateTotal(); });
        var descInp = tr.querySelector('input[name="item_descricao[]"]');
        if (descInp) descInp.addEventListener('input', function() { renderNotasFiscais(); });
    }

    function buildItemRow(opts) {
        opts = opts || {};
        var tr = document.createElement('tr');
        tr.className = 'item-row bg-slate-50 dark:bg-black/40 group';
        tr.dataset.itemUid = opts.item_uid || newItemUid();
        if (opts.nota_fiscal_url) tr.dataset.notaUrl = opts.nota_fiscal_url;
        tr.innerHTML = '<td class="item-td-desc px-4 py-3 lg:rounded-l-lg border-y border-l border-slate-200 dark:border-border-dark" data-label=""><input name="item_descricao[]" lang="pt-BR" spellcheck="true" class="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium" placeholder="Serviço ou Produto" type="text"/><input name="item_pacote[]" lang="pt-BR" spellcheck="true" class="w-full mt-1 bg-transparent border-none focus:ring-0 p-0 text-xs text-slate-400" placeholder="O que vai no pacote (opcional)" type="text"/></td>' +
            '<td class="item-td-data px-4 py-3 border-y border-slate-200 dark:border-border-dark" data-label="Data"><input name="item_data[]" class="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-right lg:text-left" placeholder="DD/MM" type="text"/></td>' +
            '<td class="item-td-valor px-4 py-3 border-y border-slate-200 dark:border-border-dark text-right font-medium" data-label="Valor (R$)"><input name="item_valor[]" class="item-valor w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-right lg:text-left text-primary font-semibold" placeholder="0,00" type="text"/><input type="hidden" name="item_qtd[]" value="1"/><input type="hidden" name="item_unit[]" class="item-unit" value=""/></td>' +
            '<td class="item-td-remove px-4 py-3 lg:rounded-r-lg border-y border-r border-slate-200 dark:border-border-dark text-center" data-label=""><button type="button" class="btn-remove-item text-slate-400 hover:text-red-500 transition-colors"><span class="material-icons-outlined text-sm">close</span></button></td>';
        tr.querySelector('.btn-remove-item').onclick = function() { tr.remove(); updateTotal(); renderNotasFiscais(); };
        bindItemRowEvents(tr);
        return tr;
    }

    function applyDocItensToForm(itens) {
        var tbody = document.getElementById('itens-tbody');
        tbody.innerHTML = '';
        (itens || []).forEach(function(item) {
            var tr = buildItemRow({
                item_uid: item.item_uid,
                nota_fiscal_url: item.nota_fiscal_url
            });
            tr.querySelector('input[name="item_descricao[]"]').value = item.descricao || '';
            var pacoteInp = tr.querySelector('input[name="item_pacote[]"]');
            if (pacoteInp) pacoteInp.value = item.conteudo_pacote || item.detalhes || '';
            tr.querySelector('input[name="item_data[]"]').value = item.data || '';
            var valorLinha = item.valor != null ? item.valor : ((item.quantidade != null ? item.quantidade : 1) * (item.valor_unitario || 0));
            var valInp = tr.querySelector('.item-valor');
            if (valInp) valInp.value = valorLinha ? fmtMoney(valorLinha) : '';
            syncItemRowHidden(tr);
            tbody.appendChild(tr);
        });
        if ((itens || []).length === 0) tbody.appendChild(buildItemRow());
        updateTotal();
        sortItemRows();
    }

    function renderNotasFiscais() {
        var list = document.getElementById('notas-fiscais-list');
        if (!list) return;
        var rows = document.querySelectorAll('#itens-tbody .item-row');
        if (!rows.length) {
            list.innerHTML = '<p class="text-xs text-slate-500">Adicione linhas na tabela acima (ou digitalize o extrato do cartão).</p>';
            return;
        }
        list.innerHTML = '';
        rows.forEach(function(tr, idx) {
            if (!tr.dataset.itemUid) tr.dataset.itemUid = newItemUid();
            var desc = (tr.querySelector('input[name="item_descricao[]"]').value || '').trim() || ('Item ' + (idx + 1));
            var valorLabel = 'R$ ' + fmtMoney(getItemRowValor(tr));
            var uid = tr.dataset.itemUid;
            var notaUrl = tr.dataset.notaUrl || '';
            var card = document.createElement('div');
            card.className = 'nota-fiscal-card flex flex-wrap gap-3 items-start p-4 rounded-xl border border-slate-200 dark:border-border-dark bg-slate-50/80 dark:bg-black/30';
            var thumb = notaUrl
                ? '<a href="' + escapeHtmlAttr(notaUrl) + '" target="_blank" rel="noopener" class="shrink-0 block w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-border-dark"><img src="' + escapeHtmlAttr(notaUrl) + '" alt="" class="w-full h-full object-cover"/></a>'
                : '<div class="shrink-0 w-20 h-20 rounded-lg border border-dashed border-slate-300 dark:border-border-dark flex items-center justify-center text-slate-400"><span class="material-icons-outlined">receipt</span></div>';
            card.innerHTML = thumb +
                '<div class="flex-1 min-w-[180px]">' +
                '<p class="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">' +
                escapeHtml(desc) + ' <span class="text-primary font-bold tabular-nums whitespace-nowrap">' + escapeHtml(valorLabel) + '</span></p>' +
                '<p class="text-xs text-slate-500 mt-0.5">' + (notaUrl ? 'Nota anexada' : 'Sem foto ainda') + '</p>' +
                '<div class="flex flex-wrap gap-2 mt-2">' +
                '<button type="button" class="btn-nota-camera px-3 py-1.5 rounded-lg bg-primary text-black text-xs font-semibold">Tirar foto</button>' +
                '<button type="button" class="btn-nota-arquivo px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-dark text-xs font-medium">Enviar arquivo</button>' +
                (notaUrl ? '<button type="button" class="btn-nota-remover px-3 py-1.5 rounded-lg text-xs text-red-500 border border-red-500/30">Remover</button>' : '') +
                '</div></div>' +
                '<input type="file" accept="image/*" capture="environment" class="nota-file-camera hidden"/>' +
                '<input type="file" accept="image/*" class="nota-file-arquivo hidden"/>';
            list.appendChild(card);
            card.querySelector('.btn-nota-camera').onclick = function() { card.querySelector('.nota-file-camera').click(); };
            card.querySelector('.btn-nota-arquivo').onclick = function() { card.querySelector('.nota-file-arquivo').click(); };
            function onNotaFile(fileInput) {
                var file = fileInput.files && fileInput.files[0];
                if (!file) return;
                enviarNotaFiscal(uid, desc, file, function(doc) {
                    var item = (doc.itens_json || []).find(function(it) { return it.item_uid === uid; });
                    if (item && item.nota_fiscal_url) {
                        tr.dataset.notaUrl = item.nota_fiscal_url;
                        renderNotasFiscais();
                    }
                });
                fileInput.value = '';
            }
            card.querySelector('.nota-file-camera').onchange = function() { onNotaFile(this); };
            card.querySelector('.nota-file-arquivo').onchange = function() { onNotaFile(this); };
            var btnRem = card.querySelector('.btn-nota-remover');
            if (btnRem) {
                btnRem.onclick = function() {
                    if (!confirm('Remover a foto desta nota?')) return;
                    removerNotaFiscal(uid, function(doc) {
                        tr.dataset.notaUrl = '';
                        applyDocItensToForm(doc.itens_json || []);
                    });
                };
            }
        });
    }

    function enviarNotaFiscal(itemUid, titulo, file, onOk) {
        ensureDocIdThen(function() {
            var fd = new FormData();
            fd.append('image', file);
            fd.append('item_uid', itemUid);
            fd.append('titulo', titulo || '');
            uploadFormData(API + '/' + docId + '/nota-fiscal', fd)
                .then(function(r) { return handleResponse(r, 'Faça login para anexar notas.'); })
                .then(function(data) {
                    if (data && data.data && data.data.documento) {
                        if (onOk) onOk(data.data.documento);
                    } else { alert(data.message || 'Falha ao enviar nota.'); }
                })
                .catch(function(err) { alert(err.message || 'Erro ao enviar nota.'); });
        });
    }

    function removerNotaFiscal(itemUid, onOk) {
        if (!docId) return;
        apiFetch(API + '/' + docId + '/nota-fiscal', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_uid: itemUid })
        })
            .then(function(r) { return handleResponse(r); })
            .then(function(data) {
                if (data && data.data && data.data.documento && onOk) onOk(data.data.documento);
            })
            .catch(function(err) { alert(err.message || 'Erro ao remover.'); });
    }
    function updateItensCount() {
        var badge = document.getElementById('itens-count-badge');
        if (!badge) return;
        var n = document.querySelectorAll('#itens-tbody .item-row').length;
        badge.textContent = n === 1 ? '1 item' : (n + ' itens');
    }

    function updateTotal() {
        var total = 0;
        document.querySelectorAll('.item-row').forEach(function(tr) {
            total += getItemRowValor(tr);
            syncItemRowHidden(tr);
        });
        document.getElementById('total-display').textContent = 'R$ ' + fmtMoney(total);
        updateItensCount();
        renderNotasFiscais();
    }

    document.getElementById('btn-add-item').onclick = function() {
        document.getElementById('itens-tbody').appendChild(buildItemRow());
        sortItemRows();
    };
    var btnOrdenarDataDesc = document.getElementById('btn-ordenar-data-desc');
    var btnOrdenarDataAsc = document.getElementById('btn-ordenar-data-asc');
    var btnOrdenarNome = document.getElementById('btn-ordenar-nome');
    if (btnOrdenarDataDesc) btnOrdenarDataDesc.onclick = function() { setItemSortMode('data-desc'); };
    if (btnOrdenarDataAsc) btnOrdenarDataAsc.onclick = function() { setItemSortMode('data-asc'); };
    if (btnOrdenarNome) btnOrdenarNome.onclick = function() { setItemSortMode('nome'); };
    updateOrdenacaoButtonsUI();
    updateItensCount();
    var btnCatalogo = document.getElementById('btn-inserir-catalogo');
    var catalogoDrop = document.getElementById('catalogo-dropdown');
    btnCatalogo.onclick = function() {
        var list = [];
        try { var s = localStorage.getItem('recibosOrcamentosCatalogo'); if (s) list = JSON.parse(s); } catch (e) {}
        if (!list.length) { alert('Nenhum item no catálogo. Adicione em Configurações.'); return; }
        catalogoDrop.innerHTML = list.map(function(item) {
            return '<button type="button" class="catalogo-item w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-black/60" data-desc="' + escapeHtmlAttr(item.descricao) + '" data-val="' + escapeHtmlAttr(String(item.valor || 0)) + '">' + escapeHtml(item.descricao) + ' — R$ ' + Number(item.valor || 0).toFixed(2).replace('.', ',') + '</button>';
        }).join('');
        catalogoDrop.classList.toggle('hidden');
        catalogoDrop.querySelectorAll('.catalogo-item').forEach(function(btn) {
            btn.onclick = function() {
                var tr = buildItemRow();
                tr.querySelector('input[name="item_descricao[]"]').value = this.dataset.desc || '';
                var valInp = tr.querySelector('.item-valor');
                if (valInp) valInp.value = (this.dataset.val || '0').replace('.', ',');
                syncItemRowHidden(tr);
                document.getElementById('itens-tbody').appendChild(tr);
                updateTotal();
                catalogoDrop.classList.add('hidden');
            };
        });
    };
    document.addEventListener('click', function(e) {
        if (!btnCatalogo.contains(e.target) && !catalogoDrop.contains(e.target)) catalogoDrop.classList.add('hidden');
    });

    document.getElementById('btn-duplicar').onclick = function() {
        if (!docId) return;
        var body = getFormDoc();
        delete body.id; body.tipo = document.querySelector('input[name="tipo"]').value;
        fetch(API, { method: 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(body), credentials: 'include' })
            .then(function(r) { return handleResponse(r); })
            .then(function(res) {
                var id = res.data && res.data.id;
                if (id) location.replace(location.pathname + '?id=' + id);
            })
            .catch(function(err) { alert(err.message || 'Erro ao duplicar.'); });
    };
    document.getElementById('btn-converter-recibo').onclick = function() {
        if (!docId) return;
        if (!confirm('Converter este orçamento em recibo? O tipo será alterado.')) return;
        document.querySelector('input[name="tipo"]').value = 'recibo';
        applyTipoUI('recibo');
        var body = getFormDoc();
        fetch(API + '/' + docId, { method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(body), credentials: 'include' })
            .then(function(r) { return handleResponse(r); })
            .then(function() { alert('Convertido em recibo.'); location.reload(); })
            .catch(function(err) { alert(err.message || 'Erro.'); });
    };

    var CLIENTES_KEY = 'recibosOrcamentosClientes';
    function getClientes() {
        try {
            var s = localStorage.getItem(CLIENTES_KEY);
            return s ? JSON.parse(s) : [];
        } catch (e) { return []; }
    }
    function addCliente(c) {
        var list = getClientes();
        var existe = list.some(function(x) {
            return (x.nome || '').toLowerCase().trim() === (c.nome || '').toLowerCase().trim();
        });
        if (!existe && (c.nome || '').trim()) {
            list.push({ nome: (c.nome || '').trim(), cpf_cnpj: (c.cpf_cnpj || '').trim(), endereco: (c.endereco || '').trim(), contato: (c.contato || '').trim() });
            localStorage.setItem(CLIENTES_KEY, JSON.stringify(list));
        }
    }
    var nomeInput = document.getElementById('cliente_nome');
    var autocompleteDiv = document.getElementById('cliente-autocomplete');
    var acTimeout;
    nomeInput.addEventListener('input', function() {
        clearTimeout(acTimeout);
        var q = (this.value || '').trim();
        autocompleteDiv.classList.add('hidden');
        autocompleteDiv.innerHTML = '';
        if (q.length < 2) return;
        acTimeout = setTimeout(function() {
            var list = getClientes().filter(function(c) {
                return (c.nome || '').toLowerCase().indexOf(q.toLowerCase()) >= 0;
            });
            if (!list.length) return;
            autocompleteDiv.innerHTML = list.map(function(c) {
                return '<button type="button" class="autocomplete-item w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-black/60 transition-colors" data-nome="' + escapeHtmlAttr(c.nome) + '" data-cpf="' + escapeHtmlAttr(c.cpf_cnpj) + '" data-endereco="' + escapeHtmlAttr(c.endereco) + '" data-contato="' + escapeHtmlAttr(c.contato) + '">' + escapeHtml(c.nome) + '</button>';
            }).join('');
            autocompleteDiv.classList.remove('hidden');
            autocompleteDiv.querySelectorAll('.autocomplete-item').forEach(function(btn) {
                btn.onclick = function() {
                    document.querySelector('input[name="cliente_nome"]').value = btn.dataset.nome || '';
                    document.querySelector('input[name="cliente_cpf"]').value = btn.dataset.cpf || '';
                    document.querySelector('input[name="cliente_endereco"]').value = btn.dataset.endereco || '';
                    document.querySelector('input[name="cliente_contato"]').value = btn.dataset.contato || '';
                    autocompleteDiv.classList.add('hidden');
                    autocompleteDiv.innerHTML = '';
                };
            });
        }, 150);
    });
    document.addEventListener('click', function(e) {
        if (!autocompleteDiv.contains(e.target) && e.target !== nomeInput) autocompleteDiv.classList.add('hidden');
    });
    function escapeHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function escapeHtmlAttr(s) { return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    document.getElementById('itens-tbody').querySelectorAll('.btn-remove-item').forEach(function(btn) {
        btn.onclick = function() { btn.closest('tr').remove(); updateTotal(); };
    });
    document.getElementById('itens-tbody').querySelectorAll('.item-row').forEach(function(tr) {
        bindItemRowEvents(tr);
    });

    function getFormDoc() {
        var rawLogo = (document.getElementById('input-logo-url').value || '').trim();
        if (rawLogo.endsWith('?') || rawLogo.length < 10) rawLogo = '';
        if (!rawLogo && defaultLogoUrlFromApi && String(defaultLogoUrlFromApi).trim().length > 10) rawLogo = String(defaultLogoUrlFromApi).trim();
        var pix = {};
        try {
            var px = localStorage.getItem('recibosOrcamentosPix');
            if (px) pix = JSON.parse(px);
        } catch (e) {}
        var emitente = {
            nome: document.querySelector('input[name="emitente_nome"]').value,
            cpf_cnpj: document.querySelector('input[name="emitente_cpf"]').value,
            contato: document.querySelector('input[name="emitente_contato"]').value,
            endereco: document.querySelector('input[name="emitente_endereco"]').value,
            logo_url: rawLogo || undefined,
            pix_chave: (pix.chave || '').trim() || undefined,
            pix_nome: (pix.nome || '').trim() || undefined,
            pix_cidade: (pix.cidade || '').trim() || undefined
        };
        var cliente = {
            nome: document.querySelector('input[name="cliente_nome"]').value,
            cpf_cnpj: document.querySelector('input[name="cliente_cpf"]').value,
            endereco: document.querySelector('input[name="cliente_endereco"]').value,
            contato: document.querySelector('input[name="cliente_contato"]').value
        };
        var itens = [];
        document.querySelectorAll('.item-row').forEach(function(tr) {
            var desc = (tr.querySelector('input[name="item_descricao[]"]').value || '').trim();
            var pacote = (tr.querySelector('input[name="item_pacote[]"]').value || '').trim();
            var data = (tr.querySelector('input[name="item_data[]"]').value || '').trim();
            var val = getItemRowValor(tr);
            if (!tr.dataset.itemUid) tr.dataset.itemUid = newItemUid();
            var item = { descricao: desc || '-', data: data, quantidade: 1, valor_unitario: val, valor: val, item_uid: tr.dataset.itemUid };
            if (pacote) item.conteudo_pacote = pacote;
            if (tr.dataset.notaUrl) {
                item.nota_fiscal_url = tr.dataset.notaUrl;
                item.nota_fiscal_titulo = desc;
            } else {
                delete item.nota_fiscal_url;
                delete item.nota_fiscal_titulo;
            }
            itens.push(item);
        });
        var tituloVal = (document.querySelector('input[name="titulo"]') && document.querySelector('input[name="titulo"]').value || '').trim();
        return {
            tipo: document.querySelector('input[name="tipo"]').value || 'orcamento',
            titulo: tituloVal || null,
            emitente_json: emitente,
            cliente_json: cliente,
            itens_json: itens,
            observacoes: (document.querySelector('textarea[name="observacoes"]').value || '').trim() || null,
            condicoes_pagamento: (document.querySelector('textarea[name="condicoes_pagamento"]').value || '').trim() || null,
            data_documento: (document.querySelector('input[name="data_documento"]').value || '').trim() || null,
            validade_ate: (document.querySelector('input[name="validade_ate"]').value || '').trim() || null
        };
    }
    function setFormDoc(doc) {
        linkToken = doc.link_token || null;
        var tituloInp = document.querySelector('input[name="titulo"]');
        if (tituloInp) tituloInp.value = doc.titulo || '';
        document.getElementById('btn-duplicar').classList.toggle('hidden', !docId);
        var isOrc = (doc.tipo || '').toLowerCase() === 'orcamento';
        document.getElementById('btn-converter-recibo').classList.toggle('hidden', !docId || !isOrc);
        if (linkToken) {
            document.getElementById('link-compartilhar-wrap').classList.remove('hidden');
            var baseUrl = (typeof window !== 'undefined' && (window.API_BASE || window.CONECTAKING_API_BASE)) ? (window.API_BASE || window.CONECTAKING_API_BASE).replace(/\/$/, '') : location.origin;
            var shareUrl = baseUrl + '/documentos-preview?token=' + encodeURIComponent(linkToken);
            document.getElementById('btn-copiar-link').onclick = function() {
                navigator.clipboard.writeText(shareUrl).then(function() { alert('Link copiado!'); }).catch(function() {});
            };
            document.getElementById('btn-whatsapp').href = 'https://wa.me/?text=' + encodeURIComponent('Confira seu documento: ' + shareUrl);
        } else {
            document.getElementById('link-compartilhar-wrap').classList.add('hidden');
        }
        var e = doc.emitente_json || {};
        var c = doc.cliente_json || {};
        document.querySelector('input[name="emitente_nome"]').value = e.nome || '';
        document.querySelector('input[name="emitente_cpf"]').value = e.cpf_cnpj || '';
        document.querySelector('input[name="emitente_contato"]').value = e.contato || '';
        document.querySelector('input[name="emitente_endereco"]').value = e.endereco || '';
        document.getElementById('input-logo-url').value = '';
        document.querySelector('input[name="cliente_nome"]').value = c.nome || '';
        document.querySelector('input[name="cliente_cpf"]').value = c.cpf_cnpj || '';
        document.querySelector('input[name="cliente_endereco"]').value = c.endereco || '';
        document.querySelector('input[name="cliente_contato"]').value = c.contato || '';
        document.querySelector('textarea[name="observacoes"]').value = doc.observacoes || '';
        document.querySelector('textarea[name="condicoes_pagamento"]').value = doc.condicoes_pagamento || '';
        document.querySelector('input[name="data_documento"]').value = (doc.data_documento || '').slice(0, 10);
        document.querySelector('input[name="validade_ate"]').value = (doc.validade_ate || '').slice(0, 10);
        applyTipoUI(doc.tipo || 'orcamento');
        applyDocItensToForm(doc.itens_json || []);
    }

    document.getElementById('btn-visualizar').onclick = function() {
        var doc = getFormDoc();
        if (docId) doc.id = parseInt(docId, 10) || docId;
        var key = 'docPreview_' + Date.now();
        var logoAtual = (doc.emitente_json && doc.emitente_json.logo_url) || '';
        if ((!logoAtual || logoAtual.length < 10) && defaultLogoUrlFromApi && String(defaultLogoUrlFromApi).trim().length > 10) {
            if (!doc.emitente_json) doc.emitente_json = {};
            doc.emitente_json.logo_url = String(defaultLogoUrlFromApi).trim();
        }
        try {
            sessionStorage.setItem('documentoPreview', JSON.stringify(doc));
            localStorage.setItem(key, JSON.stringify(doc));
        } catch (e) {}
        window.open('/documentos-preview?k=' + key, '_blank', 'noopener');
    };
    document.getElementById('btn-exportar-pdf').onclick = function() {
        if (!docId) return;
        var body = getFormDoc();
        var colors = {};
        try {
            var s = localStorage.getItem('recibosOrcamentosCores');
            if (s) colors = JSON.parse(s);
        } catch (e) {}
        var escurecer = localStorage.getItem('recibosOrcamentosEscurecer') === '1' || localStorage.getItem('recibosOrcamentosEscurecer') === 'true';
        var q = [];
        if (colors.cabecalho) q.push('headerColor=' + encodeURIComponent(colors.cabecalho.replace('#', '')));
        if (colors.destaque) q.push('accentColor=' + encodeURIComponent(colors.destaque.replace('#', '')));
        var bg = escurecer ? '#1e1e1e' : (colors.fundo || '#ffffff');
        q.push('bgColor=' + encodeURIComponent(bg.replace('#', '')));
        var pdfUrl = API + '/' + docId + '/pdf' + (q.length ? '?' + q.join('&') : '');
        var btn = document.getElementById('btn-exportar-pdf');
        var origHtml = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-icons-outlined text-sm">hourglass_empty</span> Exportando PDF...'; }
        fetch(API + '/' + docId, { method: 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(body), credentials: 'include' })
            .then(function(r) { if (!r.ok && r.status !== 404) throw new Error('Erro ao atualizar documento.'); return r.ok ? r.json() : null; })
            .then(function() {
                return fetch(pdfUrl, { method: 'GET', headers: getAuthHeaders(), credentials: 'include' });
            })
            .then(function(r) {
                if (r.status === 401) throw new Error('Faça login para exportar o PDF.');
                if (!r.ok) throw new Error('Erro ao gerar PDF. Verifique se está autenticado.');
                var cd = r.headers.get('Content-Disposition');
                var tipo = (body && body.tipo) ? String(body.tipo).toLowerCase() : (document.querySelector('input[name="tipo"]') && document.querySelector('input[name="tipo"]').value || 'orcamento');
                var filename = (tipo === 'recibo' ? 'recibo-' : 'orcamento-') + docId + '.pdf';
                if (cd) { var m = cd.match(/filename[*]?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i); if (m) filename = m[1].trim().replace(/^["']|["']$/g, ''); }
                return r.blob().then(function(blob) { return { blob: blob, filename: filename }; });
            })
            .then(function(o) {
                var blob = o.blob, filename = o.filename;
                var blobUrl = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                a.click();
                setTimeout(function() { URL.revokeObjectURL(blobUrl); }, 60000);
            })
            .catch(function(err) { alert(err.message || 'Erro ao exportar PDF.'); })
            .finally(function() { if (btn) { btn.disabled = false; btn.innerHTML = origHtml; } });
    };
    if (docId) document.getElementById('btn-exportar-pdf').style.display = '';

    document.getElementById('form-doc').onsubmit = function(ev) {
        ev.preventDefault();
        var cadastrarCliente = document.getElementById('cadastrar_cliente') && document.getElementById('cadastrar_cliente').checked;
        if (cadastrarCliente) {
            addCliente({
                nome: document.querySelector('input[name="cliente_nome"]').value,
                cpf_cnpj: document.querySelector('input[name="cliente_cpf"]').value,
                endereco: document.querySelector('input[name="cliente_endereco"]').value,
                contato: document.querySelector('input[name="cliente_contato"]').value
            });
        }
        var body = getFormDoc();
        var opts = { method: docId ? 'PUT' : 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(body), credentials: 'include' };
        var url = docId ? API + '/' + docId : API;
        fetch(url, opts)
            .then(function(r) { return handleResponse(r, 'Faça login para salvar o documento.'); })
            .then(function(data) {
                var id = data.data && data.data.id;
                if (id && !docId) { docId = id; saveLastDocumentId(id); location.replace(location.pathname + '?id=' + id); document.getElementById('btn-exportar-pdf').style.display = ''; }
                var tipo = document.querySelector('input[name="tipo"]').value;
                var msg = tipo === 'recibo' ? 'Recibo salvo.' : 'Orçamento salvo.';
                if (cadastrarCliente) msg += ' Cliente cadastrado na lista.';
                alert(id ? msg : (data.message || 'Salvo.'));
            })
            .catch(function(err) { alert(err.message || 'Erro ao salvar. Verifique se está autenticado.'); });
    };

    function applyDefaultLogo() {
        var inp = document.getElementById('input-logo-url');
        if (!inp) return;
        inp.value = '';
        var url = (defaultLogoUrlFromApi && String(defaultLogoUrlFromApi).trim().length > 10) ? String(defaultLogoUrlFromApi).trim() : '';
        if (url) inp.value = url;
    }
    if (docId) {
        saveLastDocumentId(docId);
        Promise.all([
            fetch(API_SETTINGS, { credentials: 'include', headers: getAuthHeaders() }).then(function(r) { return r.ok ? r.json() : null; }),
            fetch(API + '/' + docId, { credentials: 'include', headers: getAuthHeaders() }).then(function(r) { return handleResponse(r); })
        ]).then(function(results) {
            var settingsData = results[0];
            var docData = results[1];
            if (settingsData && settingsData.data) defaultLogoUrlFromApi = settingsData.data.defaultLogoUrl || '';
            if (docData && docData.data) setFormDoc(docData.data);
        }).catch(function() {
            fetch(API + '/' + docId, { credentials: 'include', headers: getAuthHeaders() })
                .then(function(r) { return handleResponse(r); })
                .then(function(res) { if (res && res.data) setFormDoc(res.data); })
                .catch(function() {});
        });
    } else if (novoTipo === 'recibo' || novoTipo === 'orcamento') {
        fetch(API_SETTINGS, { credentials: 'include', headers: getAuthHeaders() })
            .then(function(r) { return r.ok ? r.json() : null; })
            .then(function(data) {
                if (data && data.data) defaultLogoUrlFromApi = data.data.defaultLogoUrl || '';
                initNovoDocumento(novoTipo);
            })
            .catch(function() { initNovoDocumento(novoTipo); });
    } else {
        location.replace('dashboard-recibos-orcamentos');
    }
    function initNovoDocumento(tipo) {
        applyTipoUI(tipo || 'orcamento');
        applyDefaultLogo();
    }
    if (isMobileDevice()) warmUpApi();
})();
