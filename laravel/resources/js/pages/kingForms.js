(function () {
            var host = (window.location && window.location.hostname || '').toLowerCase();
            var sameOrigin = (window.location && window.location.origin) || '';
            var API_URL = window.API_BASE || window.API_URL || '';
            if (!API_URL) {
                if (host.endsWith('conectaking.com.br') || host === 'cnking.bio' || host === 'www.cnking.bio' || host === 'localhost' || host === '127.0.0.1') {
                    API_URL = sameOrigin;
                } else {
                    API_URL = 'https://www.conectaking.com.br';
                }
            }
            if (typeof window !== 'undefined') { window.API_URL = API_URL; window.API_BASE = API_URL; }
            var params = new URLSearchParams(window.location.search);
            var editId = params.get('edit');
            if (editId) {
                document.getElementById('kf-editor-view').classList.add('kf-active');
                document.getElementById('kf-list-view').classList.add('kf-hidden');
                document.getElementById('kf-editor-frame').src = '/formPageEdit?itemId=' + encodeURIComponent(editId) + '&v=2026-09-07-utf8clean';
            }
            function getToken() {
                try {
                    return localStorage.getItem('conectaKingToken') || localStorage.getItem('token') || sessionStorage.getItem('conectaKingToken') || sessionStorage.getItem('token') || '';
                } catch (e) { return ''; }
            }
            function getHeaders() {
                var t = getToken();
                var h = { 'Content-Type': 'application/json' };
                if (t) h['Authorization'] = 'Bearer ' + t;
                return h;
            }
            function showLoginRequired() {
                var list = document.getElementById('kf-list');
                var empty = document.getElementById('kf-empty');
                empty.remove();
                list.innerHTML = '<div class="kf-empty" id="kf-empty">' +
                    '<p><strong>Você precisa estar logado para usar o King Forms.</strong></p>' +
                    '<p>Abra o painel, faça login e depois abra &quot;King Forms&quot; pelo menu lateral.</p>' +
                    '<a href="/dashboard" class="kf-btn kf-btn-primary" style="margin-top:16px;text-decoration:none;"><i class="fas fa-external-link-alt"></i> Abrir painel</a>' +
                    '</div>';
                document.getElementById('kf-btn-new').style.display = 'none';
            }
            function loadForms() {
                var list = document.getElementById('kf-list');
                var empty = document.getElementById('kf-empty');
                if (!getToken()) {
                    showLoginRequired();
                    return;
                }
                fetch(API_URL + '/api/profile', { headers: getHeaders() })
                    .then(function (r) {
                        if (r.status === 401) {
                            showLoginRequired();
                            return Promise.reject(new Error('Não autorizado'));
                        }
                        return r.json();
                    })
                    .then(function (data) {
                        if (!data || data.success === false) {
                            empty.textContent = 'Erro ao carregar. Faça login no painel e tente novamente.';
                            empty.classList.remove('kf-empty');
                            return;
                        }
                        var items = (data && data.items && Array.isArray(data.items)) ? data.items.filter(function (it) { return it.item_type === 'digital_form'; }) : [];
                        empty.remove();
                        list.innerHTML = '';
                        if (items.length === 0) {
                            list.innerHTML = '<div class="kf-empty" id="kf-empty"><p>Nenhum formulário ainda.</p><p>Crie um usando o botão acima e depois edite perguntas e aparência.</p></div>';
                            return;
                        }
                        items.forEach(function (item) {
                            var title = item.title || (item.digital_form_data && item.digital_form_data.form_title) || 'Formulário King';
                            var card = document.createElement('div');
                            card.className = 'kf-card';
                            card.innerHTML = '<div class="kf-card-title"><i class="fas fa-file-signature"></i><span>' + escapeHtml(title) + '</span></div>' +
                                '<div class="kf-card-actions">' +
                                '<a href="/kingForms?edit=' + encodeURIComponent(item.id) + '" class="kf-btn kf-btn-secondary"><i class="fas fa-pencil-alt"></i> Editar</a>' +
                                '<button type="button" class="kf-btn kf-btn-danger kf-btn-delete" data-item-id="' + encodeURIComponent(item.id) + '" title="Apagar formulário"><i class="fas fa-trash-alt"></i> Apagar</button>' +
                                '</div>';
                            list.appendChild(card);
                        });
                    })
                    .catch(function (err) {
                        if (err && err.message === 'Não autorizado') return;
                        var emptyEl = document.getElementById('kf-empty');
                        if (emptyEl) {
                            emptyEl.textContent = 'Erro ao carregar. Faça login no painel e tente novamente.';
                            emptyEl.classList.remove('kf-empty');
                        }
                    });
            }
            function escapeHtml(s) {
                var d = document.createElement('div');
                d.textContent = s;
                return d.innerHTML;
            }
            document.getElementById('kf-btn-new').addEventListener('click', function () {
                if (!getToken()) {
                    showLoginRequired();
                    return;
                }
                var btn = this;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';
                fetch(API_URL + '/api/profile/items', {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ item_type: 'digital_form', title: 'Formulário King', is_active: false, display_order: 999 })
                })
                    .then(function (r) {
                        if (r.status === 401) {
                            showLoginRequired();
                            return Promise.reject(new Error('Não autorizado'));
                        }
                        return r.json();
                    })
                    .then(function (data) {
                        if (data && data.id) {
                            window.location.href = '/kingForms?edit=' + encodeURIComponent(data.id);
                            return;
                        } else {
                            alert(data && data.message ? data.message : 'Erro ao criar formulário.');
                        }
                    })
                    .catch(function (err) {
                        if (err && err.message !== 'Não autorizado') alert('Erro ao criar formulário.');
                    })
                    .finally(function () { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Criar novo formulário'; });
            });
            document.getElementById('kf-list-view').addEventListener('click', function (e) {
                var delBtn = e.target.closest('.kf-btn-delete');
                if (!delBtn) return;
                e.preventDefault();
                var id = delBtn.getAttribute('data-item-id');
                if (!id || !confirm('Tem certeza que deseja apagar este formulário? Esta ação não pode ser desfeita.')) return;
                delBtn.disabled = true;
                delBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Apagando...';
                fetch(API_URL + '/api/profile/items/' + encodeURIComponent(id), { method: 'DELETE', headers: getHeaders() })
                    .then(function (r) {
                        if (r.status === 401) { showLoginRequired(); return Promise.reject(new Error('Não autorizado')); }
                        if (!r.ok) return r.json().then(function (d) { throw new Error(d.message || 'Erro ao apagar'); });
                        return r.json();
                    })
                    .then(function () {
                        var card = delBtn.closest('.kf-card');
                        if (card) card.remove();
                        var list = document.getElementById('kf-list');
                        if (list && list.querySelectorAll('.kf-card').length === 0) {
                            list.innerHTML = '<div class="kf-empty" id="kf-empty"><p>Nenhum formulário ainda.</p><p>Crie um usando o botão acima e depois edite perguntas e aparência.</p></div>';
                        }
                    })
                    .catch(function (err) {
                        if (err && err.message !== 'Não autorizado') alert(err.message || 'Erro ao apagar formulário.');
                        delBtn.disabled = false;
                        delBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Apagar';
                    });
            });
            loadForms();
        })();
