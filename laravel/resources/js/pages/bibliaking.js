/** Bibliaking / painel Bíblia — Vite entry (restored from biblePanel.ejs) */
import '@legacy/js/ck-auth-gate.js';
import '@legacy/js/ck-csrf.js';

(async function () {
            if (!(await window.CkAuth.requireAuth('/login?returnUrl=' + encodeURIComponent(location.href)))) return;
            var SESSION_KEY = 'bible_panel_item_id';
            var API = (window.API_BASE || window.API_URL || window.location.origin || '').replace(/\/$/, '');
            function authHeaders(extra) {
                var h = Object.assign({ 'Accept': 'application/json' }, extra || {});
                try {
                    var t = (window.CkAuth && window.CkAuth.lsToken()) || localStorage.getItem('conectaKingToken') || localStorage.getItem('token') || '';
                    if (t) h['Authorization'] = 'Bearer ' + t;
                } catch (e) {}
                return h;
            }
            function apiFetch(path, opts) {
                opts = opts || {};
                opts.credentials = 'include';
                opts.headers = authHeaders(opts.headers || {});
                return fetch(API + path, opts);
            }
            var qs = new URLSearchParams(window.location.search);
            var itemIdFromQuery = qs.get('itemId') || qs.get('id');
            if (itemIdFromQuery) {
                try {
                    sessionStorage.setItem(SESSION_KEY, itemIdFromQuery);
                    sessionStorage.setItem('bible_item_id', itemIdFromQuery);
                } catch (e) {}
            }
            var itemId = itemIdFromQuery || (function () {
                try { return sessionStorage.getItem(SESSION_KEY); } catch (e) { return null; }
            })();

            var elLoad = document.getElementById('state-loading');
            var elNoItem = document.getElementById('state-no-item');
            var elAuth = document.getElementById('state-auth');
            var elMain = document.getElementById('state-main');
            var bannerProgErr = document.getElementById('banner-progress-error');
            var linkPublic = document.getElementById('link-public-bible');

            function show(el) { el.classList.remove('hidden'); }
            function hide(el) { el.classList.add('hidden'); }

            function normName(s) {
                return String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
            }

            function resolveBookId(livro, manifest) {
                var n = normName(livro);
                var all = [].concat(manifest.at || [], manifest.nt || []);
                for (var i = 0; i < all.length; i++) {
                    if (normName(all[i].name) === n) return all[i].id;
                }
                for (var j = 0; j < all.length; j++) {
                    if (n && normName(all[j].name).indexOf(n) !== -1) return all[j].id;
                }
                return null;
            }

            function json(res) { return res.json(); }

            if (!itemId) {
                hide(elLoad);
                show(elNoItem);
                return;
            }

            apiFetch('/api/bible/config/' + encodeURIComponent(itemId))
                .then(function (res) {
                    if (res.status === 401) {
                        hide(elLoad);
                        show(elAuth);
                        return Promise.reject({ _stop: true });
                    }
                    return res.ok ? json(res) : json(res).then(function (body) {
                        throw new Error((body && body.message) || 'Erro ao carregar configuração');
                    });
                })
                .then(function (body) {
                    if (!body || !body.success) {
                        throw new Error((body && body.message) || 'Resposta inválida');
                    }
                    var cfg = body.data || {};
                    var slug = cfg.profile_slug;
                    hide(elLoad);
                    show(elMain);
                    if (slug) {
                        var base = '/' + encodeURIComponent(slug) + '/biblia';
                        linkPublic.href = base;
                        var map = {
                            'hub-devocional': base + '/devocional',
                            'hub-salmo': base + '/salmo',
                            'hub-plano': base + '/plano',
                            'hub-inteira': base + '/biblia-inteira',
                            'hub-prosperidade': base + '/prosperidade',
                            'hub-livros': base
                        };
                        Object.keys(map).forEach(function (id) {
                            var a = document.getElementById(id);
                            if (a) a.href = map[id];
                        });
                    } else {
                        linkPublic.href = '/dashboard';
                        linkPublic.title = 'Slug do cartão não encontrado — volte ao painel e verifique o perfil';
                        linkPublic.innerHTML = '<i class="fas fa-th-large"></i> Painel principal';
                    }

                    return apiFetch('/api/bible/my-progress')
                        .then(function (pr) {
                            if (!pr.ok) {
                                bannerProgErr.textContent = 'Não foi possível carregar o progresso de leitura (HTTP ' + pr.status + '). Os dados locais podem estar desatualizados.';
                                show(bannerProgErr);
                                return null;
                            }
                            return json(pr);
                        })
                        .then(function (pb) {
                            if (!pb || !pb.success || !pb.data) {
                                if (pb && !pb.success) {
                                    bannerProgErr.textContent = 'Progresso: ' + (pb.message || 'erro desconhecido');
                                    show(bannerProgErr);
                                }
                                return;
                            }
                            var p = pb.data;
                            var pctCh = p.percent_chapters != null ? p.percent_chapters : Math.round((p.chapters_read / (p.total_chapters || 1189)) * 100);
                            document.getElementById('progress-stats').innerHTML =
                                '<strong>' + (p.chapters_read || 0) + '</strong> capítulos · <strong>' + (p.books_read || 0) + '</strong> livros · <strong>' + (p.verses_read || 0) + '</strong> versículos marcados<br>' +
                                '<span style="color:#888;font-size:0.85rem">Capítulos: ~' + pctCh + '% da Bíblia</span>';
                            document.getElementById('progress-chapters-pct').style.width = Math.min(100, pctCh) + '%';
                        });
                })
                .then(function () {
                    var trans = 'nvi';
                    return apiFetch('/api/bible/verse-of-day?translation=' + encodeURIComponent(trans))
                        .then(function (r) { return r.ok ? json(r) : Promise.reject(new Error('Versículo do dia indisponível')); })
                        .then(function (body) {
                            if (!body || !body.success || !body.data) return;
                            var v = body.data;
                            document.getElementById('vod-ref').textContent = v.ref || (v.livro + ' ' + v.capitulo + ':' + v.versiculo);
                            document.getElementById('vod-text').textContent = v.texto || '';
                            document.getElementById('vod-reflexao').textContent = v.reflexao ? ('Reflexão: ' + v.reflexao) : '';

                            var btnMark = document.getElementById('btn-mark-vod');
                            var msgEl = document.getElementById('vod-mark-msg');

                            return apiFetch('/api/bible/books').then(function (r) { return r.json(); }).then(function (mb) {
                                var manifest = (mb && mb.success && mb.data) ? mb.data : { at: [], nt: [] };
                                var bookId = resolveBookId(v.livro, manifest);

                                btnMark.addEventListener('click', function () {
                                    msgEl.textContent = '';
                                    if (!bookId) {
                                        msgEl.textContent = 'Não foi possível identificar o livro para registar a leitura.';
                                        return;
                                    }
                                    apiFetch('/api/bible/mark-read', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            book: bookId,
                                            chapter: v.capitulo,
                                            verse: v.versiculo,
                                            mode: 'read'
                                        })
                                    }).then(function (res) {
                                        if (res.status === 401) {
                                            msgEl.textContent = 'Sessão expirada. Entre novamente.';
                                            return;
                                        }
                                        return json(res).then(function (out) {
                                            if (out.success) {
                                                btnMark.disabled = true;
                                                btnMark.innerHTML = '<i class="fas fa-check-circle"></i> Registado';
                                                msgEl.textContent = 'Leitura registada no seu progresso.';
                                                return apiFetch('/api/bible/my-progress').then(function (pr) { return pr.json(); }).then(function (pb) {
                                                    if (pb && pb.success && pb.data) {
                                                        var p = pb.data;
                                                        var pctCh = p.percent_chapters != null ? p.percent_chapters : Math.round((p.chapters_read / (p.total_chapters || 1189)) * 100);
                                                        document.getElementById('progress-stats').innerHTML =
                                                            '<strong>' + (p.chapters_read || 0) + '</strong> capítulos · <strong>' + (p.books_read || 0) + '</strong> livros · <strong>' + (p.verses_read || 0) + '</strong> versículos marcados<br>' +
                                                            '<span style="color:#888;font-size:0.85rem">Capítulos: ~' + pctCh + '% da Bíblia</span>';
                                                        document.getElementById('progress-chapters-pct').style.width = Math.min(100, pctCh) + '%';
                                                    }
                                                });
                                            } else {
                                                msgEl.textContent = out.message || 'Não foi possível registar.';
                                            }
                                        });
                                    }).catch(function () {
                                        msgEl.textContent = 'Erro de rede ao registar.';
                                    });
                                });
                            });
                        });
                })
                .catch(function (err) {
                    if (err && err._stop) return;
                    hide(elLoad);
                    show(elNoItem);
                    var extra = document.createElement('div');
                    extra.className = 'msg msg-error';
                    extra.style.marginTop = '12px';
                    extra.textContent = err && err.message ? err.message : 'Erro ao carregar.';
                    elNoItem.insertBefore(extra, elNoItem.firstChild);
                });
        })();
