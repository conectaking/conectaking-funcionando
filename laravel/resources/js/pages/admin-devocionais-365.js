import '@legacy/js/ck-auth-gate.js';

await (window.CkAuth && typeof window.CkAuth.requireAuth === 'function'
  ? window.CkAuth.requireAuth('/login')
  : Promise.resolve(true));

(function () {
    var yNow = new Date().getFullYear();
    var LS_API = 'CONECTAKING_API_BASE';
    var LS_JOB = 'dev365_bg_job_id';
    var bgPollTimer = null;

    function flash(msg, kind) {
        var el = document.getElementById('flash');
        el.className = 'msg ' + (kind === 'err' ? 'msg-err' : kind === 'ok' ? 'msg-ok' : 'msg-warn');
        el.textContent = msg;
        el.style.display = 'block';
        if (kind === 'ok' || kind === 'err') {
            setTimeout(function () { el.style.display = 'none'; }, 8000);
        }
    }

    function getToken() {
        // Cookie HttpOnly (CkAuth) — não usar localStorage para JWT.
        try {
            var manual = document.getElementById('token-manual');
            if (manual && manual.value.trim()) return manual.value.trim();
        } catch (e) {}
        return '';
    }

    function getApiBase() {
        var el = document.getElementById('api-base-url');
        var v = el && el.value.trim();
        if (v) return v.replace(/\/$/, '');
        try {
            v = localStorage.getItem(LS_API);
            if (v) return v.replace(/\/$/, '');
        } catch (e) {}
        return window.location.origin.replace(/\/$/, '');
    }

    function setApiBaseUi() {
        var el = document.getElementById('api-base-url');
        if (el) {
            try {
                var s = localStorage.getItem(LS_API);
                if (s && !el.value.trim()) el.value = s;
            } catch (e) {}
        }
        var link = document.getElementById('link-biblia-api');
        if (link) link.href = getApiBase() + '/bible';
    }

    function apiFetch(path, opts) {
        opts = opts || {};
        var headers = opts.headers || {};
        var tok = getToken();
        if (tok) headers['Authorization'] = 'Bearer ' + tok;
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        var base = getApiBase();
        return fetch(base + path, Object.assign({ credentials: 'include' }, opts, { headers: headers }));
    }

    var studyBooksData = [];

    function apiUploadStudyBook(bookId, file) {
        var fd = new FormData();
        fd.append('file', file);
        var headers = {};
        var tok = getToken();
        if (tok) headers['Authorization'] = 'Bearer ' + tok;
        return fetch(getApiBase() + '/api/admin/bible/study/book/' + encodeURIComponent(bookId) + '/upload', {
            method: 'POST',
            credentials: 'include',
            headers: headers,
            body: fd
        });
    }

    function escStudyCell(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }

    function renderStudyBooksTable() {
        var tb = document.getElementById('tbody-study-books');
        if (!tb) return;
        var searchEl = document.getElementById('study-book-search');
        var q = (searchEl && searchEl.value || '').toLowerCase().trim();
        var rows = studyBooksData.filter(function (b) {
            if (!q) return true;
            var name = (b.book_name || '').toLowerCase();
            var id = (b.book_id || '').toLowerCase();
            return name.indexOf(q) >= 0 || id.indexOf(q) >= 0;
        });
        if (!rows.length) {
            tb.innerHTML = '<tr><td colspan="5">Nenhum livro com este filtro.</td></tr>';
            return;
        }
        tb.innerHTML = rows.map(function (b) {
            var bid = String(b.book_id || '').replace(/"/g, '&quot;');
            var has = b.has_study;
            var st = has ? '<span style="color:#86efac">Com estudo</span>' : '<span style="color:#888">Sem estudo</span>';
            return '<tr data-bid="' + bid + '">' +
                '<td style="text-align:center;vertical-align:middle"><input type="checkbox" class="study-row-cb" data-bid="' + bid + '" aria-label="Seleccionar ' + escStudyCell(b.book_name) + '"></td>' +
                '<td><strong>' + escStudyCell(b.book_name) + '</strong><br><span style="font-size:0.8rem;color:#888">' + escStudyCell(b.book_id) + '</span></td>' +
                '<td>' + st + '</td>' +
                '<td style="min-width:200px"><input type="file" class="study-file-inp" accept=".doc,.docx,.pdf" data-bid="' + bid + '" style="max-width:180px;font-size:0.72rem;vertical-align:middle"></td>' +
                '<td style="white-space:normal"><button type="button" class="btn btn-secondary btn-sm study-upload-btn" data-bid="' + bid + '">Enviar</button> ' +
                '<button type="button" class="btn btn-sm study-ai-btn" data-bid="' + bid + '" title="Gera estudo longo completo (como Gênesis)"><i class="fas fa-magic"></i> Gerar por IA</button> ' +
                '<button type="button" class="btn btn-secondary btn-sm study-remove-btn" data-bid="' + bid + '">Remover</button></td></tr>';
        }).join('');

        tb.querySelectorAll('.study-upload-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var bid = btn.getAttribute('data-bid');
                var tr = btn.closest('tr');
                var inp = tr && tr.querySelector('.study-file-inp');
                if (!inp || !inp.files || !inp.files[0]) { flash('Escolha um ficheiro Word ou PDF.', 'err'); return; }
                btn.disabled = true;
                apiUploadStudyBook(bid, inp.files[0])
                    .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
                    .then(function (x) {
                        if (!x.ok || !x.j.success) throw new Error((x.j && x.j.message) || 'Falha no envio');
                        flash((x.j && x.j.message) || 'Importado.', 'ok');
                        loadStudyBooksList();
                    })
                    .catch(function (e) { flash(e.message || 'Erro no upload.', 'err'); })
                    .finally(function () { btn.disabled = false; });
            });
        });
        tb.querySelectorAll('.study-ai-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var bid = btn.getAttribute('data-bid');
                if (!confirm('Gerar estudo COMPLETO por IA para este livro? Pode demorar vários minutos e usar muitos tokens. Para livros que não sejam Gênesis, o servidor usa o estudo de Gênesis (se existir) só como referência de formato.')) return;
                btn.disabled = true;
                flash('A gerar estudo por IA— aguarde (não feche o separador).', 'warn');
                apiFetch('/api/admin/bible/study/book/' + encodeURIComponent(bid) + '/generate-ai', { method: 'POST', body: '{}' })
                    .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
                    .then(function (x) {
                        if (!x.ok || !x.j.success) throw new Error((x.j && x.j.message) || 'Falha na IA');
                        flash((x.j && x.j.message) || 'Estudo gerado e gravado.', 'ok');
                        loadStudyBooksList();
                    })
                    .catch(function (e) { flash(e.message || 'Erro ao gerar.', 'err'); })
                    .finally(function () { btn.disabled = false; });
            });
        });
        tb.querySelectorAll('.study-remove-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var bid = btn.getAttribute('data-bid');
                if (!confirm('Remover o estudo gravado para ' + bid + '?')) return;
                btn.disabled = true;
                apiFetch('/api/admin/bible/study/book/' + encodeURIComponent(bid), { method: 'DELETE' })
                    .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
                    .then(function (x) {
                        if (!x.ok || !x.j.success) throw new Error((x.j && x.j.message) || 'Falha');
                        flash('Estudo removido.', 'ok');
                        loadStudyBooksList();
                    })
                    .catch(function (e) { flash(e.message || 'Erro.', 'err'); })
                    .finally(function () { btn.disabled = false; });
            });
        });

        var master = document.getElementById('study-select-all');
        if (master) {
            master.checked = false;
            master.onchange = function () {
                var on = master.checked;
                tb.querySelectorAll('.study-row-cb').forEach(function (cb) { cb.checked = on; });
            };
        }
    }

    function getSelectedStudyBookIds() {
        var ids = [];
        document.querySelectorAll('#tbody-study-books .study-row-cb:checked').forEach(function (cb) {
            var bid = cb.getAttribute('data-bid');
            if (bid) ids.push(bid);
        });
        return ids;
    }

    function deleteStudyBook(bid) {
        return apiFetch('/api/admin/bible/study/book/' + encodeURIComponent(bid), { method: 'DELETE' })
            .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j, status: r.status }; }); });
    }

    function loadStudyBooksList() {
        var tb = document.getElementById('tbody-study-books');
        if (!tb) return;
        tb.innerHTML = '<tr><td colspan="5">A carregar—</td></tr>';
        apiFetch('/api/admin/bible/study/books')
            .then(function (r) { return r.json(); })
            .then(function (j) {
                if (!j.success || !j.data || !j.data.books) throw new Error(j.message || 'Lista inválida');
                studyBooksData = j.data.books;
                renderStudyBooksTable();
            })
            .catch(function (e) {
                tb.innerHTML = '<tr><td colspan="5">' + escStudyCell(e.message || 'Erro ao carregar') + '</td></tr>';
            });
    }

    function monthNamesPt() {
        return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    }

    function buildThemesHost() {
        var host = document.getElementById('themes-months-host');
        var names = monthNamesPt();
        host.innerHTML = names.map(function (nm, i) {
            var m = i + 1;
            return '<div class="theme-row"><div><label for="theme-m-' + m + '">' + nm + '</label>' +
                '<textarea id="theme-m-' + m + '" rows="2" placeholder="Tema ou linha de orientação para o mês—"></textarea></div>' +
                '<button type="button" class="btn btn-secondary btn-sm btn-theme-gen" data-month="' + m + '">Gerar</button></div>';
        }).join('');
        host.querySelectorAll('.btn-theme-gen').forEach(function (b) {
            b.addEventListener('click', function () {
                var mo = parseInt(b.getAttribute('data-month'), 10);
                var yr = parseInt(document.getElementById('themes-year').value, 10) || yNow;
                var hintEl = document.getElementById('theme-m-' + mo);
                var hint = hintEl ? hintEl.value.trim() : '';
                b.disabled = true;
                apiFetch('/api/admin/bible/devotionals-365/month-themes/' + yr + '/generate/' + mo, {
                    method: 'POST',
                    body: JSON.stringify({ hint: hint })
                })
                    .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
                    .then(function (x) {
                        if (!x.ok || !x.j.success) throw new Error((x.j && x.j.message) || 'Falha');
                        var t = x.j.data && x.j.data.text;
                        if (hintEl && t) hintEl.value = t;
                        flash('Tema do mês ' + mo + ' gerado e guardado no servidor.', 'ok');
                    })
                    .catch(function (e) { flash(e.message || 'Erro ao gerar tema.', 'err'); })
                    .finally(function () { b.disabled = false; });
            });
        });
    }

    function buildBatchMonthChecks() {
        var host = document.getElementById('batch-month-checks');
        var names = monthNamesPt();
        host.innerHTML = names.map(function (nm, i) {
            var m = i + 1;
            return '<label><input type="checkbox" class="batch-m-cb" value="' + m + '" ' + (m === 1 ? 'checked' : '') + '> ' + nm + '</label>';
        }).join('');
    }

    function getSelectedBatchMonths() {
        var out = [];
        document.querySelectorAll('.batch-m-cb:checked').forEach(function (cb) {
            out.push(parseInt(cb.value, 10));
        });
        return out.sort(function (a, b) { return a - b; });
    }

    function applyJobUi(d) {
        var panel = document.getElementById('batch-job-panel');
        var bar = document.getElementById('batch-progress-bar');
        var st = document.getElementById('batch-job-status');
        var btnStop = document.getElementById('btn-batch-stop');
        if (!d) {
            panel.style.display = 'none';
            btnStop.style.display = 'none';
            return;
        }
        panel.style.display = 'block';
        btnStop.style.display = (d.status === 'running' || d.status === 'queued') ? 'inline-flex' : 'none';
        var pct = d.progress != null ? d.progress : 0;
        bar.style.width = Math.min(100, pct) + '%';
        var eta = d.etaMinutes != null ? ' — ~' + d.etaMinutes + ' min restantes' : '';
        var cur = d.currentDay != null ? ' — a gerar: dia ' + d.currentDay : '';
        st.textContent = (pct || 0) + '%' + eta + ' — ' + (d.processed || 0) + '/' + (d.total || 0) + ' dias' + cur +
            ' — estado: ' + (d.status || '?') + (d.errorMessage ? ' — ' + d.errorMessage : '') +
            ' — última actualização: ' + new Date().toLocaleTimeString('pt-BR');
    }

    function stopBgPoll() {
        if (bgPollTimer) {
            clearInterval(bgPollTimer);
            bgPollTimer = null;
        }
    }

    function pollJob(jobId) {
        apiFetch('/api/admin/bible/devotionals-365/generation-job/' + encodeURIComponent(jobId))
            .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j, status: r.status }; }); })
            .then(function (x) {
                if (x.status === 404 || !x.ok) {
                    try { localStorage.removeItem(LS_JOB); } catch (e) {}
                    stopBgPoll();
                    applyJobUi(null);
                    flash('Trabalho em segundo plano não encontrado (servidor reiniciou ou expirou).', 'warn');
                    return;
                }
                if (!x.j.success || !x.j.data) {
                    applyJobUi(null);
                    return;
                }
                var d = x.j.data;
                applyJobUi(d);
                if (d.status === 'done' || d.status === 'error' || d.status === 'cancelled') {
                    try { localStorage.removeItem(LS_JOB); } catch (e) {}
                    stopBgPoll();
                    if (d.status === 'done') flash('Geração em segundo plano concluída.', 'ok');
                    else if (d.status === 'cancelled') flash('Geração em segundo plano cancelada.', 'warn');
                    else flash('Geração em segundo plano terminou com erro.', 'err');
                    loadTable();
                }
            })
            .catch(function () {
                flash('Erro ao consultar estado do trabalho.', 'err');
            });
    }

    function startBgPoll(jobId) {
        try { localStorage.setItem(LS_JOB, jobId); } catch (e) {}
        stopBgPoll();
        pollJob(jobId);
        bgPollTimer = setInterval(function () { pollJob(jobId); }, 4000);
    }

    function resumeBgJobIfAny() {
        var id;
        try { id = localStorage.getItem(LS_JOB); } catch (e) { id = null; }
        if (!id) return;
        startBgPoll(id);
    }

    document.getElementById('gen-year-day').value = yNow;
    document.getElementById('gen-year-month').value = yNow;
    document.getElementById('filtro-ano-tabela').value = yNow;
    document.getElementById('themes-year').value = yNow;
    document.getElementById('batch-year').value = yNow;

    document.getElementById('btn-save-api-base').addEventListener('click', function () {
        var v = document.getElementById('api-base-url').value.trim();
        if (!v) {
            try { localStorage.removeItem(LS_API); } catch (e) {}
            setApiBaseUi();
            flash('A usar o domínio desta página. Para gerar devocionais ou temas por IA noutro host, indique a URL da API.', 'warn');
            return;
        }
        try {
            localStorage.setItem(LS_API, v.replace(/\/$/, ''));
            setApiBaseUi();
            flash('URL da API guardada. Geração com IA e devocionais passam a usar este servidor.', 'ok');
        } catch (e) {
            flash('Não foi possível guardar.', 'err');
        }
    });

    function collectThemesBody() {
        var o = {};
        for (var m = 1; m <= 12; m++) {
            var el = document.getElementById('theme-m-' + m);
            o[String(m)] = el ? (el.value || '').trim() : '';
        }
        return o;
    }

    function fillThemesFromServer(themes) {
        themes = themes || {};
        for (var m = 1; m <= 12; m++) {
            var el = document.getElementById('theme-m-' + m);
            if (el) el.value = themes[String(m)] != null ? String(themes[String(m)]) : '';
        }
    }

    function clearAllThemeFields() {
        for (var m = 1; m <= 12; m++) {
            var el = document.getElementById('theme-m-' + m);
            if (el) el.value = '';
        }
    }

    /** Aceita { year, themes: { "1": "..." } }, ou só themes, ou objecto plano com chaves "1".."12". */
    function parseThemesJsonObject(raw) {
        var obj = raw;
        if (!obj || typeof obj !== 'object') return { year: null, themes: {} };
        var year = null;
        if (obj.year != null && !Array.isArray(obj)) {
            var y = parseInt(obj.year, 10);
            if (!isNaN(y) && y >= 2000 && y <= 2100) year = y;
        }
        var themes = {};
        var src = obj.themes;
        if (src && typeof src === 'object' && !Array.isArray(src)) {
            Object.keys(src).forEach(function (k) {
                var n = parseInt(k, 10);
                if (n >= 1 && n <= 12) themes[String(n)] = String(src[k] == null ? '' : src[k]);
            });
        } else {
            Object.keys(obj).forEach(function (k) {
                if (k === 'year') return;
                var n = parseInt(k, 10);
                if (n >= 1 && n <= 12) themes[String(n)] = String(obj[k] == null ? '' : obj[k]);
            });
        }
        return { year: year, themes: themes };
    }

    function applyThemesFromFileParsed(parsed) {
        clearAllThemeFields();
        var t = parsed.themes || {};
        var count = 0;
        Object.keys(t).forEach(function (k) {
            var el = document.getElementById('theme-m-' + k);
            if (el) {
                el.value = t[k];
                if (String(t[k]).trim().length) count += 1;
            }
        });
        if (parsed.year != null) {
            document.getElementById('themes-year').value = String(parsed.year);
        }
        return count;
    }

    document.getElementById('btn-themes-load').addEventListener('click', function () {
        var inp = document.getElementById('themes-file-input');
        if (inp) inp.click();
    });

    document.getElementById('themes-file-input').addEventListener('change', function () {
        var f = this.files && this.files[0];
        this.value = '';
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
            try {
                var text = String(reader.result || '');
                var obj = JSON.parse(text);
                var parsed = parseThemesJsonObject(obj);
                var n = applyThemesFromFileParsed(parsed);
                flash('Ficheiro importado: ' + n + ' mês(es) com texto. Clique em «Guardar no servidor» para gravar na base de dados.', 'ok');
            } catch (e) {
                flash('Ficheiro inválido. Use JSON com formato { "year": 2026, "themes": { "1": "...", "2": "..." } } ou só as chaves dos meses.', 'err');
            }
        };
        reader.onerror = function () {
            flash('Não foi possível ler o ficheiro.', 'err');
        };
        reader.readAsText(f, 'UTF-8');
    });

    function loadThemesFromServer() {
        var yr = parseInt(document.getElementById('themes-year').value, 10) || yNow;
        return apiFetch('/api/admin/bible/devotionals-365/month-themes/' + yr)
            .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
            .then(function (x) {
                if (!x.ok || !x.j.success) throw new Error((x.j && x.j.message) || 'Falha ao carregar temas.');
                fillThemesFromServer(x.j.data && x.j.data.themes);
                flash('Temas de ' + yr + ' carregados do servidor.', 'ok');
            });
    }

    var btnLoadServer = document.getElementById('btn-themes-load-server');
    if (btnLoadServer) {
        btnLoadServer.addEventListener('click', function () {
            btnLoadServer.disabled = true;
            loadThemesFromServer()
                .catch(function (e) { flash(e.message || 'Erro.', 'err'); })
                .finally(function () { btnLoadServer.disabled = false; });
        });
    }

    document.getElementById('btn-themes-save').addEventListener('click', function () {
        var yr = parseInt(document.getElementById('themes-year').value, 10) || yNow;
        var btn = document.getElementById('btn-themes-save');
        btn.disabled = true;
        apiFetch('/api/admin/bible/devotionals-365/month-themes/' + yr, {
            method: 'PUT',
            body: JSON.stringify(collectThemesBody())
        })
            .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
            .then(function (x) {
                if (!x.ok || !x.j.success) throw new Error((x.j && x.j.message) || 'Falha ao guardar.');
                fillThemesFromServer(x.j.data && x.j.data.themes);
                flash('Temas de ' + yr + ' guardados na base de dados.', 'ok');
            })
            .catch(function (e) { flash(e.message || 'Erro ao guardar temas.', 'err'); })
            .finally(function () { btn.disabled = false; });
    });

    var btnExport = document.getElementById('btn-themes-export');
    if (btnExport) {
        btnExport.addEventListener('click', function () {
            var yr = parseInt(document.getElementById('themes-year').value, 10) || yNow;
            var blob = new Blob([JSON.stringify({ year: yr, themes: collectThemesBody() }, null, 2)], { type: 'application/json;charset=utf-8' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'dev365_temas_' + yr + '.json';
            a.click();
            URL.revokeObjectURL(a.href);
            flash('JSON exportado: dev365_temas_' + yr + '.json', 'ok');
        });
    }

    // Carregar temas do servidor ao abrir a aba Devocionais 365
    try { loadThemesFromServer().catch(function () { /* silencioso no arranque */ }); } catch (e) { /* ignore */ }
    document.getElementById('btn-themes-generate-all').addEventListener('click', function () {
        var yr = parseInt(document.getElementById('themes-year').value, 10) || yNow;
        if (!confirm('Gerar automaticamente uma linha de tema para cada um dos 12 meses de ' + yr + '? Isto chama a IA várias vezes.')) return;
        var btn = document.getElementById('btn-themes-generate-all');
        btn.disabled = true;
        apiFetch('/api/admin/bible/devotionals-365/month-themes/' + yr + '/generate-all', {
            method: 'POST',
            body: JSON.stringify({ delayMs: 400 })
        })
            .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
            .then(function (x) {
                if (!x.ok || !x.j.success) throw new Error((x.j && x.j.message) || 'Falha.');
                fillThemesFromServer(x.j.data && x.j.data.themes);
                flash('Temas gerados e guardados no servidor.', 'ok');
            })
            .catch(function (e) { flash(e.message || 'Erro.', 'err'); })
            .finally(function () { btn.disabled = false; });
    });

    document.getElementById('btn-batch-sync').addEventListener('click', function () {
        var months = getSelectedBatchMonths();
        if (!months.length) { flash('Seleccione pelo menos um mês.', 'err'); return; }
        var year = parseInt(document.getElementById('batch-year').value, 10) || yNow;
        var delayMs = parseInt(document.getElementById('gen-delay').value, 10) || 400;
        if (!confirm('Gerar com IA todos os dias dos meses seleccionados em ' + year + ', um mês após o outro? O navegador fica à espera até terminar.')) return;
        var btn = document.getElementById('btn-batch-sync');
        btn.disabled = true;
        var o = bodyGenOpts();
        var chain = Promise.resolve();
        months.forEach(function (m) {
            chain = chain.then(function () {
                return apiFetch('/api/admin/bible/devotionals-365/generate-month-ai/' + year + '/' + m, {
                    method: 'POST',
                    body: JSON.stringify(Object.assign({ delayMs: delayMs }, o))
                }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
                    .then(function (x) {
                        if (!x.ok || !x.j.success) throw new Error((x.j && x.j.message) || ('Mês ' + m + ' falhou'));
                    });
            });
        });
        chain
            .then(function () { flash('Todos os meses seleccionados foram gerados.', 'ok'); loadTable(); })
            .catch(function (e) { flash(e.message || 'Erro na geração síncrona.', 'err'); })
            .finally(function () { btn.disabled = false; });
    });

    document.getElementById('btn-batch-async').addEventListener('click', function () {
        var months = getSelectedBatchMonths();
        if (!months.length) { flash('Seleccione pelo menos um mês.', 'err'); return; }
        var year = parseInt(document.getElementById('batch-year').value, 10) || yNow;
        var delayMs = parseInt(document.getElementById('gen-delay').value, 10) || 400;
        var o = bodyGenOpts();
        var btn = document.getElementById('btn-batch-async');
        btn.disabled = true;
        apiFetch('/api/admin/bible/devotionals-365/generate-calendar-months-async', {
            method: 'POST',
            body: JSON.stringify(Object.assign({ year: year, months: months, delayMs: delayMs }, o))
        })
            .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j, status: r.status }; }); })
            .then(function (x) {
                if (!x.ok || !x.j.success) throw new Error((x.j && x.j.message) || 'Falha ao iniciar trabalho.');
                var jobId = x.j.data && x.j.data.jobId;
                if (!jobId) throw new Error('Sem jobId.');
                flash('Geração em segundo plano iniciada. Pode recarregar a página — o progresso continua enquanto o servidor não reiniciar.', 'ok');
                startBgPoll(jobId);
            })
            .catch(function (e) { flash(e.message || 'Erro.', 'err'); })
            .finally(function () { btn.disabled = false; });
    });

    document.getElementById('btn-batch-stop').addEventListener('click', function () {
        var id;
        try { id = localStorage.getItem(LS_JOB); } catch (e) { id = null; }
        if (!id) { flash('Nenhum trabalho activo.', 'warn'); return; }
        var btn = document.getElementById('btn-batch-stop');
        btn.disabled = true;
        apiFetch('/api/admin/bible/devotionals-365/generation-job/' + encodeURIComponent(id) + '/cancel', { method: 'POST', body: '{}' })
            .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
            .then(function (x) {
                if (!x.ok || !x.j.success) throw new Error((x.j && x.j.message) || 'Não cancelou');
                flash('Pedido de paragem enviado (termina após o dia actual).', 'ok');
                pollJob(id);
            })
            .catch(function (e) { flash(e.message || 'Erro.', 'err'); })
            .finally(function () { btn.disabled = false; });
    });

    document.getElementById('btn-save-token').addEventListener('click', function () {
        var v = document.getElementById('token-manual').value.trim();
        if (!v) {
            flash('Sessão admin usa cookie HttpOnly. Faça login no painel; só cole Bearer se precisar espelhar numa aba isolada.', 'warn');
            return;
        }
        fetch('/api/auth/sync-session-cookie', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Authorization': 'Bearer ' + v, 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: '{}'
        }).then(function (r) {
            return r.json().then(function (j) { return { ok: r.ok, j: j }; });
        }).then(function (x) {
            if (!x.ok || !x.j.success) throw new Error((x.j && x.j.message) || 'Falha ao sincronizar cookie');
            try {
                localStorage.removeItem('token');
                localStorage.removeItem('conectaKingToken');
            } catch (e) {}
            flash('Sessão espelhada em cookie HttpOnly (JWT não fica no localStorage).', 'ok');
        }).catch(function (e) {
            flash(e.message || 'Não foi possível sincronizar.', 'err');
        });
    });

    document.querySelectorAll('.tabs button').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var tab = btn.getAttribute('data-tab');
            document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('active', b === btn); });
            document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
            var map = { dev365: 'panel-dev365', prosperidade: 'panel-prosperidade', plano: 'panel-plano', estudo: 'panel-estudo', ajuda: 'panel-ajuda' };
            var el = document.getElementById(map[tab]);
            if (el) el.classList.add('active');
            if (tab === 'prosperidade') loadProsperidadeGrid();
        });
    });

    document.getElementById('btn-goto-gen').addEventListener('click', function () {
        document.querySelector('.tabs button[data-tab="dev365"]').click();
        window.scrollTo(0, 0);
    });

    function bodyGenOpts() {
        return {
            temaModo: document.getElementById('gen-tema').value,
            temaPersonalizado: '',
            estilo: document.getElementById('gen-estilo').value
        };
    }

    document.getElementById('btn-gen-one-day').addEventListener('click', function () {
        var day = parseInt(document.getElementById('gen-day').value, 10);
        var year = parseInt(document.getElementById('gen-year-day').value, 10);
        if (day < 1 || day > 365) { flash('Dia entre 1 e 365.', 'err'); return; }
        if (isNaN(year)) year = yNow;
        var btn = document.getElementById('btn-gen-one-day');
        btn.disabled = true;
        var o = bodyGenOpts();
        apiFetch('/api/admin/bible/devotionals-365/day/' + day + '/generate-ai', {
            method: 'POST',
            body: JSON.stringify(Object.assign({ year: year }, o))
        })
            .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
            .then(function (x) {
                if (!x.ok || !x.j.success) throw new Error((x.j && x.j.message) || 'Falha');
                flash('Dia ' + day + ' gerado e gravado.', 'ok');
                loadTable();
            })
            .catch(function (e) { flash(e.message || 'Erro ao gerar.', 'err'); })
            .finally(function () { btn.disabled = false; });
    });

    document.getElementById('btn-gen-whole-month').addEventListener('click', function () {
        var month = parseInt(document.getElementById('gen-month').value, 10);
        var year = parseInt(document.getElementById('gen-year-month').value, 10);
        var delayMs = parseInt(document.getElementById('gen-delay').value, 10) || 400;
        if (isNaN(year)) year = yNow;
        if (!confirm('Gerar com IA todos os dias do mês ' + month + '/' + year + '? Pode demorar.')) return;
        var btn = document.getElementById('btn-gen-whole-month');
        btn.disabled = true;
        var o = bodyGenOpts();
        apiFetch('/api/admin/bible/devotionals-365/generate-month-ai/' + year + '/' + month, {
            method: 'POST',
            body: JSON.stringify(Object.assign({ delayMs: delayMs }, o))
        })
            .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
            .then(function (x) {
                if (!x.ok || !x.j.success) throw new Error((x.j && x.j.message) || 'Falha');
                var d = x.j.data || {};
                flash('Mês gerado. Total: ' + (d.total != null ? d.total : '—') + '. Erros: ' + (d.errors != null ? d.errors : '—'), 'ok');
                loadTable();
            })
            .catch(function (e) { flash(e.message || 'Erro ao gerar mês.', 'err'); })
            .finally(function () { btn.disabled = false; });
    });

    function dayOfYearToMonth(doy, y) {
        var leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
        var dim = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        var d = doy;
        for (var m = 0; m < 12; m++) {
            if (d <= dim[m]) return m + 1;
            d -= dim[m];
        }
        return 12;
    }

    var tableRows = [];

    function loadTable() {
        var tb = document.getElementById('tbody-dev365');
        tb.innerHTML = '<tr><td colspan="5">A carregar—</td></tr>';
        apiFetch('/api/admin/bible/devotionals-365/admin-full')
            .then(function (r) { return r.json(); })
            .then(function (j) {
                if (!j.success || !j.data || !j.data.rows) throw new Error(j.message || 'Lista inválida');
                tableRows = j.data.rows;
                renderTable();
            })
            .catch(function (e) {
                tb.innerHTML = '<tr><td colspan="5">' + (e.message || 'Erro ao carregar') + '</td></tr>';
            });
    }

    function renderTable() {
        var filtroDia = (document.getElementById('filtro-dia').value || '').trim();
        var filtroMes = document.getElementById('filtro-mes').value;
        var ano = parseInt(document.getElementById('filtro-ano-tabela').value, 10) || yNow;
        var tb = document.getElementById('tbody-dev365');
        var rows = tableRows.filter(function (r) {
            var day = r.day_of_year;
            if (filtroDia) {
                if (String(day).indexOf(filtroDia) === -1) return false;
            }
            if (filtroMes) {
                if (String(dayOfYearToMonth(day, ano)) !== filtroMes) return false;
            }
            return true;
        });
        if (!rows.length) {
            tb.innerHTML = '<tr><td colspan="5">Nenhum registo com este filtro.</td></tr>';
            return;
        }
        tb.innerHTML = rows.map(function (r) {
            var prev = (r.reflexao_preview || '').replace(/</g, '&lt;');
            return '<tr data-day="' + r.day_of_year + '">' +
                '<td>' + r.day_of_year + '</td>' +
                '<td>' + (r.titulo || '').replace(/</g, '&lt;') + '</td>' +
                '<td>' + (r.versiculo_ref || '').replace(/</g, '&lt;') + '</td>' +
                '<td class="preview">' + prev + '</td>' +
                '<td><button type="button" class="btn btn-secondary btn-sm btn-ver" data-day="' + r.day_of_year + '">Ver</button> ' +
                '<button type="button" class="btn btn-sm btn-gen-row" data-day="' + r.day_of_year + '">Gerar</button></td></tr>';
        }).join('');
        tb.querySelectorAll('.btn-ver').forEach(function (b) {
            b.addEventListener('click', function () {
                var day = parseInt(b.getAttribute('data-day'), 10);
                apiFetch('/api/admin/bible/devotionals-365/day/' + day)
                    .then(function (r) { return r.json(); })
                    .then(function (j) {
                        if (!j.success || !j.data) throw new Error(j.message || 'Erro');
                        var d = j.data;
                        document.getElementById('modal-ver-title').textContent = 'Dia ' + day + ' — ' + (d.titulo || '');
                        var text = [
                            d.versiculo_ref || '',
                            d.versiculo_texto ? '\n\n' + d.versiculo_texto : '',
                            d.reflexao ? '\n\n— Reflexão —\n' + d.reflexao : '',
                            d.aplicacao ? '\n\n— Aplicação —\n' + d.aplicacao : '',
                            d.oracao ? '\n\n— Oração —\n' + d.oracao : ''
                        ].join('');
                        document.getElementById('modal-ver-body').textContent = text;
                        document.getElementById('modal-ver').classList.add('show');
                    })
                    .catch(function (e) { flash(e.message || 'Erro', 'err'); });
            });
        });
        tb.querySelectorAll('.btn-gen-row').forEach(function (b) {
            b.addEventListener('click', function () {
                var day = parseInt(b.getAttribute('data-day'), 10);
                var year = parseInt(document.getElementById('gen-year-day').value, 10) || yNow;
                if (!confirm('Gerar com IA o dia ' + day + ' (' + year + ')?')) return;
                b.disabled = true;
                var o = bodyGenOpts();
                apiFetch('/api/admin/bible/devotionals-365/day/' + day + '/generate-ai', {
                    method: 'POST',
                    body: JSON.stringify(Object.assign({ year: year }, o))
                })
                    .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
                    .then(function (x) {
                        if (!x.ok || !x.j.success) throw new Error((x.j && x.j.message) || 'Falha');
                        flash('Dia ' + day + ' gerado.', 'ok');
                        loadTable();
                    })
                    .catch(function (e) { flash(e.message || 'Erro', 'err'); })
                    .finally(function () { b.disabled = false; });
            });
        });
    }

    document.getElementById('filtro-dia').addEventListener('input', renderTable);
    document.getElementById('filtro-mes').addEventListener('change', renderTable);
    document.getElementById('filtro-ano-tabela').addEventListener('change', renderTable);
    document.getElementById('btn-reload-table').addEventListener('click', loadTable);

    function yearForMonthActions() {
        var y = parseInt(document.getElementById('gen-year-month').value, 10);
        return isNaN(y) ? yNow : y;
    }

    function buildMonthQuick() {
        var host = document.getElementById('month-quick-btns');
        var names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        host.innerHTML = '<span style="width:100%;font-size:0.82rem;color:#888;margin-bottom:4px">Gerar IA — mês civil (use o ano do bloco &quot;Gerar todo o mês&quot; acima):</span>';
        names.forEach(function (nm, i) {
            var m = i + 1;
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn btn-secondary btn-sm';
            b.textContent = nm + ' — Gerar';
            b.addEventListener('click', function () {
                var yr = yearForMonthActions();
                if (!confirm('Gerar com IA todos os dias de ' + nm + '/' + yr + '?')) return;
                b.disabled = true;
                var o = bodyGenOpts();
                var delayMs = parseInt(document.getElementById('gen-delay').value, 10) || 400;
                apiFetch('/api/admin/bible/devotionals-365/generate-month-ai/' + yr + '/' + m, {
                    method: 'POST',
                    body: JSON.stringify(Object.assign({ delayMs: delayMs }, o))
                })
                    .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
                    .then(function (x) {
                        if (!x.ok || !x.j.success) throw new Error((x.j && x.j.message) || 'Falha');
                        flash(nm + ' concluído.', 'ok');
                        loadTable();
                    })
                    .catch(function (e) { flash(e.message || 'Erro', 'err'); })
                    .finally(function () { b.disabled = false; });
            });
            host.appendChild(b);
        });
    }

    document.getElementById('modal-ver-close').addEventListener('click', function () {
        document.getElementById('modal-ver').classList.remove('show');
    });
    document.getElementById('modal-ver').addEventListener('click', function (e) {
        if (e.target.id === 'modal-ver') document.getElementById('modal-ver').classList.remove('show');
    });

    buildThemesHost();
    buildBatchMonthChecks();
    setApiBaseUi();
    buildMonthQuick();
    loadTable();
    resumeBgJobIfAny();

    var studySearchEl = document.getElementById('study-book-search');
    if (studySearchEl) studySearchEl.addEventListener('input', renderStudyBooksTable);
    var studyReloadBtn = document.getElementById('btn-study-reload');
    if (studyReloadBtn) studyReloadBtn.addEventListener('click', loadStudyBooksList);
    var studyBulkRemoveBtn = document.getElementById('btn-study-bulk-remove');
    if (studyBulkRemoveBtn) {
        studyBulkRemoveBtn.addEventListener('click', function () {
            var ids = getSelectedStudyBookIds();
            if (!ids.length) { flash('Marque as checkboxes dos livros cujo estudo quer remover.', 'warn'); return; }
            if (!confirm('Remover o estudo gravado de ' + ids.length + ' livro(s) seleccionado(s)?')) return;
            studyBulkRemoveBtn.disabled = true;
            var ok = 0;
            var fail = 0;
            var i = 0;
            function next() {
                if (i >= ids.length) {
                    studyBulkRemoveBtn.disabled = false;
                    var master = document.getElementById('study-select-all');
                    if (master) master.checked = false;
                    flash('Removidos: ' + ok + (fail ? ' · Não removidos (sem estudo ou erro): ' + fail : ''), fail ? 'warn' : 'ok');
                    loadStudyBooksList();
                    return;
                }
                var bid = ids[i];
                i += 1;
                deleteStudyBook(bid)
                    .then(function (x) {
                        if (x.ok && x.j && x.j.success) ok++;
                        else fail++;
                    })
                    .catch(function () { fail++; })
                    .then(next);
            }
            next();
        });
    }
    loadStudyBooksList();

    // --- Prosperidade antes de dormir (31 Ativações) ---
    var LS_PROS_JOB = 'prosperidade_bg_job_id';
    var prosCurrentN = null;
    var prosPollTimer = null;
    var prosGridLoaded = false;

    function prosBadgeClass(s) {
        return 'badge-pros badge-pros-' + (s || 'vazio');
    }

    function prosApiJson(path, opts) {
        return apiFetch(path, opts).then(function (r) {
            return r.json().then(function (j) {
                if (!r.ok || j.success === false) {
                    var msg = (j && j.message) || r.statusText;
                    if (j && j.missing && j.missing.length) msg += ' — Falta: ' + j.missing.join(', ');
                    throw new Error(msg);
                }
                return j;
            });
        });
    }

    function prosIeFromFraseFields() {
        var parts = [];
        for (var i = 1; i <= 4; i++) {
            var el = document.getElementById('pros-f-frase-' + i);
            var v = el ? String(el.value || '').trim() : '';
            if (v) parts.push(v);
        }
        return parts.join('\n\n');
    }

    function prosFillFraseFields(ieText) {
        var raw = String(ieText || '').trim();
        var phrases = raw ? raw.split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean) : [];
        if (phrases.length <= 1 && raw) {
            phrases = raw.split(/\n/).map(function (s) { return s.replace(/^\*\s*/, '').trim(); }).filter(function (s) {
                return s && /^["'""]/.test(s);
            });
        }
        for (var i = 1; i <= 4; i++) {
            var el = document.getElementById('pros-f-frase-' + i);
            if (el) el.value = phrases[i - 1] || '';
        }
        var ieEl = document.getElementById('pros-f-ie');
        if (ieEl) ieEl.value = phrases.join('\n\n');
    }

    function prosFieldsFromForm() {
        var ie = prosIeFromFraseFields();
        var ieEl = document.getElementById('pros-f-ie');
        if (ieEl) ieEl.value = ie;
        return {
            titulo: document.getElementById('pros-f-titulo').value,
            decreto_entrada: document.getElementById('pros-f-decreto').value,
            fundamento_sagrado: document.getElementById('pros-f-fundamento').value,
            diagnostico_escassez: document.getElementById('pros-f-diagnostico').value,
            estrada_com_king: document.getElementById('pros-f-estrada').value,
            diretriz_ilustracao: document.getElementById('pros-f-ilustracao').value,
            mentalidade_travada: document.getElementById('pros-f-travada').value,
            nova_mentalidade: document.getElementById('pros-f-nova').value,
            exercicio_fixacao: document.getElementById('pros-f-exercicio').value,
            ie_chave: ie,
            treino_negocios: document.getElementById('pros-f-negocios').value,
            treino_altar: document.getElementById('pros-f-altar').value,
            sentenca_ativacao: document.getElementById('pros-f-sentenca').value,
            proximo_episodio: document.getElementById('pros-f-proximo').value,
            content_source: 'manual'
        };
    }

    function prosFillForm(d) {
        document.getElementById('pros-f-titulo').value = d.titulo || '';
        document.getElementById('pros-f-decreto').value = d.decreto_entrada || '';
        document.getElementById('pros-f-fundamento').value = d.fundamento_sagrado || '';
        document.getElementById('pros-f-diagnostico').value = d.diagnostico_escassez || '';
        document.getElementById('pros-f-estrada').value = d.estrada_com_king || '';
        document.getElementById('pros-f-ilustracao').value = d.diretriz_ilustracao || '';
        document.getElementById('pros-f-travada').value = d.mentalidade_travada || '';
        document.getElementById('pros-f-nova').value = d.nova_mentalidade || '';
        document.getElementById('pros-f-exercicio').value = d.exercicio_fixacao || '';
        prosFillFraseFields(d.ie_chave || '');
        document.getElementById('pros-f-negocios').value = d.treino_negocios || '';
        document.getElementById('pros-f-altar').value = d.treino_altar || '';
        document.getElementById('pros-f-sentenca').value = d.sentenca_ativacao || '';
        document.getElementById('pros-f-proximo').value = d.proximo_episodio || '';
    }

    function prosRenderPreview(d) {
        var h = '<h3 style="color:#FFC700">' + (d.titulo || '') + '</h3>';
        ['decreto_entrada', 'fundamento_sagrado', 'diagnostico_escassez', 'estrada_com_king', 'sentenca_ativacao', 'proximo_episodio'].forEach(function (k) {
            if (d[k]) h += '<p><strong>' + k + '</strong><br>' + String(d[k]).replace(/\n/g, '<br>') + '</p>';
        });
        document.getElementById('pros-preview-host').innerHTML = h;
    }

    function prosPayloadForSave() {
        var fields = prosFieldsFromForm();
        var pasteEl = document.getElementById('pros-paste-full');
        var paste = pasteEl ? pasteEl.value.trim() : '';
        if (paste) fields.text = paste;
        return fields;
    }

    function prosUpdateSaveHint(d) {
        var el = document.getElementById('pros-save-hint');
        if (!el) return;
        if (!d) { el.textContent = ''; return; }
        if (d.can_publish) {
            el.textContent = 'Ativação pronta para publicar na Bíblia pública.';
            el.style.color = '#86efac';
        } else if (d.missing_for_publish && d.missing_for_publish.length) {
            el.textContent = 'Para publicar, falta: ' + d.missing_for_publish.join(', ') + '.';
            el.style.color = '#f5a097';
        } else {
            el.textContent = '';
        }
    }

    function prosParsePasteAlways() {
        if (!prosCurrentN) return Promise.resolve();
        var pasteEl = document.getElementById('pros-paste-full');
        var paste = pasteEl ? pasteEl.value.trim() : '';
        if (!paste) return Promise.resolve();
        return prosApiJson('/api/admin/bible/prosperidade/' + prosCurrentN + '/parse-paste', {
            method: 'POST',
            body: JSON.stringify({ text: paste })
        }).then(function (json) {
            prosFillForm((json.data && json.data.sections) || {});
        });
    }

    function prosSaveActivation() {
        if (!prosCurrentN) return Promise.resolve();
        var btn = document.getElementById('btn-pros-save-activation');
        if (btn) btn.disabled = true;
        var payload = prosPayloadForSave();
        return prosParsePasteAlways()
            .then(function () {
                return apiFetch('/api/admin/bible/prosperidade/' + prosCurrentN + '/save-activation', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }).then(function (r) {
                    return r.json().then(function (j) {
                        if (r.status === 404) {
                            return apiFetch('/api/admin/bible/prosperidade/' + prosCurrentN, {
                                method: 'PUT',
                                body: JSON.stringify(payload)
                            }).then(function (r2) {
                                return r2.json().then(function (j2) {
                                    if (!r2.ok || !j2.success) throw new Error((j2 && j2.message) || 'Erro ao salvar.');
                                    return j2;
                                });
                            });
                        }
                        if (!r.ok || !j.success) {
                            var msg = (j && j.message) || 'Erro ao salvar.';
                            if (j && j.missing && j.missing.length) msg += ' — Falta: ' + j.missing.join(', ');
                            throw new Error(msg);
                        }
                        return j;
                    });
                });
            })
            .then(function (json) {
                var d = (json && json.data) || {};
                prosFillForm(d);
                document.getElementById('pros-ed-status').textContent = d.status || '';
                prosUpdateSaveHint(d);
                flash(json.message || 'Ativação salva.', 'ok');
                loadProsperidadeGrid();
                return d;
            })
            .finally(function () { if (btn) btn.disabled = false; });
    }

    function loadProsperidadeGrid() {
        var host = document.getElementById('pros-grid-31');
        if (!host) return;
        host.innerHTML = '<p style="color:#888">A carregar—</p>';
        prosApiJson('/api/admin/bible/prosperidade')
            .then(function (json) {
                var list = (json.data && json.data.activations) || [];
                prosGridLoaded = true;
                host.innerHTML = list.map(function (a) {
                    return '<div class="act-card" data-n="' + a.activation_number + '"><strong>Ativação ' + a.activation_number + '</strong><div style="font-size:0.78rem;color:#888;margin-top:4px">' + String(a.titulo || '').substring(0, 36) + '</div><span class="' + prosBadgeClass(a.status) + '">' + a.status + '</span></div>';
                }).join('');
                host.querySelectorAll('.act-card').forEach(function (c) {
                    c.addEventListener('click', function () { openProsperidadeEditor(parseInt(c.getAttribute('data-n'), 10)); });
                });
            })
            .catch(function (e) { host.innerHTML = '<p style="color:#f5a097">' + e.message + '</p>'; });
    }

    function openProsperidadeEditor(n) {
        prosCurrentN = n;
        document.getElementById('pros-editor-panel').style.display = 'block';
        document.getElementById('pros-ed-num').textContent = n;
        document.querySelectorAll('#pros-grid-31 .act-card').forEach(function (c) {
            c.classList.toggle('selected', parseInt(c.getAttribute('data-n'), 10) === n);
        });
        prosApiJson('/api/admin/bible/prosperidade/' + n)
            .then(function (json) {
                var d = json.data || {};
                document.getElementById('pros-ed-status').textContent = d.status || '';
                var st = d.storytelling || {};
                document.getElementById('pros-cheatsheet').innerHTML = '<strong>Fase ' + n + ':</strong> ' + (st.titulo || '') + ' — ' + (st.resumo || '');
                prosFillForm(d);
                prosRenderPreview(d);
                prosUpdateSaveHint(d);
            })
            .catch(function (e) { flash(e.message, 'err'); });
    }

    document.querySelectorAll('.tabs-ed button').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var ed = btn.getAttribute('data-ed');
            document.querySelectorAll('.tabs-ed button').forEach(function (b) { b.classList.toggle('active', b === btn); });
            document.querySelectorAll('.panel-ed').forEach(function (p) { p.classList.remove('active'); });
            var panel = document.getElementById('pros-panel-' + ed);
            if (panel) panel.classList.add('active');
            if (ed === 'preview') prosRenderPreview(prosFieldsFromForm());
            if (ed === 'campos' && prosCurrentN) {
                var pasteEl = document.getElementById('pros-paste-full');
                var paste = pasteEl ? pasteEl.value.trim() : '';
                if (paste) {
                    prosParsePasteAlways()
                        .then(function () { flash('Campos preenchidos a partir do texto colado.', 'ok'); })
                        .catch(function (e) { flash(e.message, 'err'); });
                }
            }
        });
    });

    document.getElementById('btn-pros-reload-grid').addEventListener('click', loadProsperidadeGrid);

    document.getElementById('btn-pros-parse').addEventListener('click', function () {
        if (!prosCurrentN) return;
        prosApiJson('/api/admin/bible/prosperidade/' + prosCurrentN + '/parse-paste', {
            method: 'POST',
            body: JSON.stringify({ text: document.getElementById('pros-paste-full').value })
        })
            .then(function (json) {
                var s = (json.data && json.data.sections) || {};
                prosFillForm(s);
                flash('Seções divididas — revise em Campos.', 'ok');
                document.querySelector('.tabs-ed button[data-ed="campos"]').click();
            })
            .catch(function (e) { flash(e.message, 'err'); });
    });

    document.getElementById('btn-pros-gen-one').addEventListener('click', function () {
        if (!prosCurrentN) return;
        var st = document.getElementById('pros-gen-status');
        st.textContent = 'Gerando—';
        var btn = document.getElementById('btn-pros-gen-one');
        btn.disabled = true;
        prosApiJson('/api/admin/bible/prosperidade/' + prosCurrentN + '/generate-ai', { method: 'POST', body: '{}' })
            .then(function (json) {
                prosFillForm(Object.assign({}, json.data, { content_source: 'ai' }));
                st.textContent = 'Tokens: ' + ((json.tokens && json.tokens.total) || '—');
                flash('IA concluída — revise e salve.', 'ok');
                document.querySelector('.tabs-ed button[data-ed="campos"]').click();
            })
            .catch(function (e) { st.textContent = e.message; flash(e.message, 'err'); })
            .finally(function () { btn.disabled = false; });
    });

    document.getElementById('btn-pros-save-activation').addEventListener('click', function () {
        if (!prosCurrentN) return;
        prosSaveActivation().catch(function (e) {
            flash(e.message, 'err');
            document.querySelector('.tabs-ed button[data-ed="campos"]').click();
        });
    });

    document.getElementById('btn-pros-save').addEventListener('click', function () {
        if (!prosCurrentN) return;
        prosSaveActivation().catch(function (e) { flash(e.message, 'err'); });
    });

    document.getElementById('btn-pros-publish').addEventListener('click', function () {
        if (!prosCurrentN) return;
        var payload = prosPayloadForSave();
        prosSaveActivation()
            .then(function (d) {
                if (d && d.can_publish === false) {
                    throw new Error('Para publicar, falta: ' + (d.missing_for_publish || []).join(', ') + '. Cole a Ativação completa e use Salvar ativação.');
                }
                return prosApiJson('/api/admin/bible/prosperidade/' + prosCurrentN + '/publish', {
                    method: 'PATCH',
                    body: JSON.stringify({ published: true, text: payload.text || '' })
                });
            })
            .then(function (json) {
                var d = (json && json.data) || {};
                prosFillForm(d);
                prosUpdateSaveHint(d);
                flash('Ativação publicada na Bíblia!', 'ok');
                loadProsperidadeGrid();
                openProsperidadeEditor(prosCurrentN);
            })
            .catch(function (e) {
                flash(e.message, 'err');
                document.querySelector('.tabs-ed button[data-ed="campos"]').click();
            });
    });

    document.getElementById('btn-pros-unpublish').addEventListener('click', function () {
        if (!prosCurrentN) return;
        prosApiJson('/api/admin/bible/prosperidade/' + prosCurrentN + '/publish', {
            method: 'PATCH',
            body: JSON.stringify({ published: false })
        })
            .then(function () { flash('Despublicada.', 'ok'); loadProsperidadeGrid(); })
            .catch(function (e) { flash(e.message, 'err'); });
    });

    document.getElementById('btn-pros-export').addEventListener('click', function () {
        prosApiJson('/api/admin/bible/prosperidade/export')
            .then(function (json) {
                var blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'prosperidade-31-backup.json';
                a.click();
            })
            .catch(function (e) { flash(e.message, 'err'); });
    });

    document.getElementById('pros-import-file').addEventListener('change', function (ev) {
        var f = ev.target.files[0];
        if (!f) return;
        f.text().then(function (text) {
            var data = JSON.parse(text);
            var items = data.activations || data;
            return prosApiJson('/api/admin/bible/prosperidade/import', {
                method: 'POST',
                body: JSON.stringify({ activations: items })
            });
        })
            .then(function () { flash('Importação concluída.', 'ok'); loadProsperidadeGrid(); })
            .catch(function (e) { flash(e.message, 'err'); });
        ev.target.value = '';
    });

    function pollProsJob(jobId) {
        if (prosPollTimer) clearInterval(prosPollTimer);
        document.getElementById('pros-batch-progress-wrap').style.display = 'block';
        prosPollTimer = setInterval(function () {
            prosApiJson('/api/admin/bible/prosperidade/generation-job/' + jobId)
                .then(function (json) {
                    var j = json.data || {};
                    var pct = j.total ? Math.round((j.done / j.total) * 100) : 0;
                    document.getElementById('pros-batch-progress-bar').style.width = pct + '%';
                    document.getElementById('pros-batch-status').textContent = 'Job ' + j.status + ' — ' + j.done + '/' + j.total + ' (tokens: ' + (j.tokensTotal || 0) + ')';
                    if (j.status === 'done' || j.status === 'partial' || j.status === 'failed' || j.status === 'cancelled') {
                        clearInterval(prosPollTimer);
                        localStorage.removeItem(LS_PROS_JOB);
                        loadProsperidadeGrid();
                    }
                })
                .catch(function () {});
        }, 5000);
    }

    document.getElementById('btn-pros-batch-async').addEventListener('click', function () {
        var start = parseInt(document.getElementById('pros-batch-start').value, 10);
        var end = parseInt(document.getElementById('pros-batch-end').value, 10);
        if (end - start + 1 > 15) { flash('Máximo 15 Ativações por lote.', 'err'); return; }
        if (!confirm('Gerar Ativações ' + start + ' a ' + end + ' com IA? Revise antes de publicar.')) return;
        prosApiJson('/api/admin/bible/prosperidade/generate-range-ai', {
            method: 'POST',
            body: JSON.stringify({
                start: start,
                end: end,
                async: true,
                delayMs: parseInt(document.getElementById('pros-batch-delay').value, 10) || 800
            })
        })
            .then(function (json) {
                var jobId = json.data && json.data.jobId;
                if (jobId) {
                    localStorage.setItem(LS_PROS_JOB, jobId);
                    pollProsJob(jobId);
                    flash('Lote iniciado.', 'ok');
                }
            })
            .catch(function (e) { flash(e.message, 'err'); });
    });

    var savedProsJob = localStorage.getItem(LS_PROS_JOB);
    if (savedProsJob) pollProsJob(savedProsJob);

    if (location.hash === '#study' || location.hash === '#estudo') {
        var tabEstudo = document.querySelector('.tabs button[data-tab="estudo"]');
        if (tabEstudo) tabEstudo.click();
    }
    if (location.hash === '#prosperidade' || location.hash === '#prosperidade-dormir') {
        var tabPros = document.querySelector('.tabs button[data-tab="prosperidade"]');
        if (tabPros) tabPros.click();
    }

    // Voltar = tela anterior (de onde veio, ex.: painel ADM). Fallback: /admin/
    var btnVoltar = document.getElementById('btn-voltar-dashboard');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', function (e) {
            e.preventDefault();
            try {
                if (window.history.length > 1) {
                    window.history.back();
                    return;
                }
            } catch (_) {}
            window.location.href = '/admin/';
        });
    }

})();
