import '@css/style.css';
import '@css/pages/kingForms.css';
import '@mod/js/ck-auth-gate.js';
import QRCode from 'qrcode';

(function () {
    const sameOrigin = (window.location && window.location.origin) || '';
    const API_URL = window.API_BASE || window.API_URL || sameOrigin || 'https://www.conectaking.com.br';
    if (typeof window !== 'undefined') {
        window.API_URL = API_URL;
        window.API_BASE = API_URL;
    }

    // Gerenciamento de Estado
    let allForms = [];
    let userSlug = '';
    let currentQrUrl = '';
    let currentQrTitle = '';

    // Detecção de Modo Editor via URL (?edit=ID)
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId) {
        const editorView = document.getElementById('kf-editor-view');
        const listView = document.getElementById('kf-list-view');
        const editorFrame = document.getElementById('kf-editor-frame');
        if (editorView && listView && editorFrame) {
            editorView.classList.add('kf-active');
            listView.classList.add('kf-hidden');
            editorFrame.src = '/formPageEdit?itemId=' + encodeURIComponent(editId) + '&v=' + Date.now();
        }
    }

    function getToken() {
        try {
            if (window.CkAuth && typeof window.CkAuth.lsToken === 'function') return window.CkAuth.lsToken() || '';
            return localStorage.getItem('conectaKingToken') || localStorage.getItem('token') || sessionStorage.getItem('conectaKingToken') || sessionStorage.getItem('token') || '';
        } catch (e) {
            return '';
        }
    }

    function getHeaders() {
        const t = getToken();
        const h = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (t) h['Authorization'] = 'Bearer ' + t;
        return h;
    }

    function escapeHtml(s) {
        if (!s) return '';
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function showLoginRequired() {
        const list = document.getElementById('kf-list');
        if (list) {
            list.innerHTML = `
                <div class="kf-empty-state">
                    <i class="fas fa-lock kf-empty-icon"></i>
                    <h3 class="kf-empty-title">Acesso Restrito</h3>
                    <p class="kf-empty-desc">Você precisa estar conectado à sua conta Conecta King para gerenciar o King Forms.</p>
                    <a href="/login?redirect=/kingForms" class="kf-btn-hero-create" style="text-decoration: none;">
                        <i class="fas fa-sign-in-alt"></i> Fazer Login
                    </a>
                </div>
            `;
        }
        const btnNew = document.getElementById('kf-btn-new');
        if (btnNew) btnNew.style.display = 'none';
    }

    // Atualiza os Cards de Estatísticas no Topo
    function updateStats(items) {
        const totalFormsEl = document.getElementById('kf-stat-total-forms');
        const totalLeadsEl = document.getElementById('kf-stat-total-leads');
        const mostActiveEl = document.getElementById('kf-stat-most-active');

        const totalForms = items.length;
        let totalLeads = 0;
        let maxLeads = -1;
        let mostActiveTitle = '-';

        items.forEach(item => {
            const formData = item.digital_form_data || {};
            const leads = Number(formData.responses_count) || (Array.isArray(formData.responses) ? formData.responses.length : 0);
            totalLeads += leads;

            if (leads > maxLeads && leads > 0) {
                maxLeads = leads;
                mostActiveTitle = item.title || formData.form_title || 'Formulário';
            }
        });

        if (totalFormsEl) totalFormsEl.textContent = totalForms;
        if (totalLeadsEl) totalLeadsEl.textContent = totalLeads;
        if (mostActiveEl) {
            mostActiveEl.textContent = mostActiveTitle;
            mostActiveEl.title = mostActiveTitle;
        }
    }

    // Renderiza a Lista de Cards
    function renderFormsList(items) {
        const list = document.getElementById('kf-list');
        const countIndicator = document.getElementById('kf-count-indicator');
        if (!list) return;

        if (countIndicator) {
            countIndicator.textContent = items.length === 1 
                ? '1 formulário disponível' 
                : `${items.length} formulários disponíveis`;
        }

        if (items.length === 0) {
            const hasFilter = document.getElementById('kf-search-input')?.value.trim() !== '';
            list.innerHTML = `
                <div class="kf-empty-state">
                    <i class="fas ${hasFilter ? 'fa-search' : 'fa-file-signature'} kf-empty-icon"></i>
                    <h3 class="kf-empty-title">${hasFilter ? 'Nenhum formulário encontrado' : 'Nenhum formulário criado ainda'}</h3>
                    <p class="kf-empty-desc">${hasFilter ? 'Tente buscar com outros termos.' : 'Crie seu primeiro formulário em poucos segundos e comece a capturar leads.'}</p>
                    ${hasFilter ? '' : `
                        <button type="button" class="kf-btn-hero-create" onclick="document.getElementById('kf-btn-new').click();">
                            <i class="fas fa-plus-circle"></i> Criar Meu Primeiro Formulário
                        </button>
                    `}
                </div>
            `;
            return;
        }

        list.innerHTML = '';
        items.forEach(item => {
            const formData = item.digital_form_data || {};
            const title = item.title || formData.form_title || 'Formulário Sem Título';
            const isActive = item.is_active !== false && item.is_active !== 'f';
            const leadsCount = Number(formData.responses_count) || (Array.isArray(formData.responses) ? formData.responses.length : 0);
            
            // Contagem de campos
            const fields = formData.form_fields || formData.fields || [];
            const fieldsCount = Array.isArray(fields) ? fields.length : (formData.fields_count || 0);

            // Cores do formulário
            const primaryColor = formData.primary_color || '#FFC700';
            const secondaryColor = formData.secondary_color || '#FFA500';
            const accentGradient = `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;

            // URL pública do formulário
            const publicUrl = userSlug 
                ? `${window.location.origin}/${userSlug}/form/${item.id}` 
                : `${window.location.origin}/form/${item.id}`;

            const card = document.createElement('div');
            card.className = 'kf-form-card';
            card.setAttribute('data-id', item.id);
            card.innerHTML = `
                <div class="kf-card-accent-bar" style="background: ${accentGradient};"></div>
                <div class="kf-card-content">
                    <div class="kf-card-header">
                        <div class="kf-card-title-group">
                            <h3 class="kf-card-title-text" title="${escapeHtml(title)}">${escapeHtml(title)}</h3>
                            <div class="kf-fields-count">
                                <i class="fas fa-list-check"></i>
                                <span>${fieldsCount} ${fieldsCount === 1 ? 'campo' : 'campos'} estruturados</span>
                            </div>
                        </div>
                        <span class="kf-status-pill ${isActive ? 'kf-status-active' : 'kf-status-draft'}">
                            <i class="fas fa-circle" style="font-size: 7px;"></i>
                            ${isActive ? 'Ativo' : 'Rascunho'}
                        </span>
                    </div>

                    <div class="kf-card-meta-row">
                        <a href="/responsesList?itemId=${encodeURIComponent(item.id)}" class="kf-leads-badge" title="Visualizar respostas e leads">
                            <i class="fas fa-inbox"></i>
                            <span>${leadsCount} ${leadsCount === 1 ? 'Resposta' : 'Respostas'}</span>
                        </a>
                    </div>
                </div>

                <div class="kf-card-footer">
                    <div class="kf-action-group-left">
                        <button type="button" class="kf-btn-icon-action kf-btn-copy-link" data-url="${escapeHtml(publicUrl)}" title="Copiar link público para divulgar">
                            <i class="fas fa-link"></i>
                            <span>Copiar Link</span>
                        </button>
                        <button type="button" class="kf-btn-icon-action kf-btn-qr-trigger" data-url="${escapeHtml(publicUrl)}" data-title="${escapeHtml(title)}" title="Gerar QR Code deste formulário">
                            <i class="fas fa-qrcode"></i>
                            <span>QR Code</span>
                        </button>
                    </div>

                    <div class="kf-action-group-right">
                        <a href="/kingForms?edit=${encodeURIComponent(item.id)}" class="kf-btn-icon-action kf-btn-edit-primary" title="Editar perguntas e tema">
                            <i class="fas fa-pencil-alt"></i>
                            <span>Editar</span>
                        </a>
                        <button type="button" class="kf-btn-icon-action kf-btn-duplicate" data-id="${encodeURIComponent(item.id)}" title="Duplicar este formulário">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button type="button" class="kf-btn-icon-action kf-btn-delete-item" data-id="${encodeURIComponent(item.id)}" title="Excluir formulário">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            list.appendChild(card);
        });
    }

    // Carregamento inicial de dados
    async function loadForms() {
        const list = document.getElementById('kf-list');
        const empty = document.getElementById('kf-empty');
        if (window.CkAuth && typeof window.CkAuth.requireAuth === 'function') {
            const ok = await window.CkAuth.requireAuth('/login');
            if (!ok) return;
        }

        try {
            const response = await fetch(API_URL + '/api/profile', {
                credentials: 'include',
                headers: getHeaders()
            });

            if (response.status === 401) {
                showLoginRequired();
                return;
            }

            const data = await response.json();
            if (!data || data.success === false) {
                if (empty) empty.textContent = 'Erro ao carregar dados. Faça login novamente.';
                return;
            }

            userSlug = (data.details && (data.details.slug || data.details.profile_slug)) || '';
            allForms = (data && data.items && Array.isArray(data.items))
                ? data.items.filter(it => it.item_type === 'digital_form')
                : [];

            updateStats(allForms);
            renderFormsList(allForms);
        } catch (err) {
            console.error('Erro ao buscar formulários:', err);
            if (empty) empty.textContent = 'Falha ao sincronizar formulários. Tente recarregar a página.';
        }
    }

    // Busca e Filtro em Tempo Real
    const searchInput = document.getElementById('kf-search-input');
    const searchClear = document.getElementById('kf-search-clear');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const query = this.value.toLowerCase().trim();
            if (searchClear) searchClear.style.display = query ? 'block' : 'none';

            if (!query) {
                renderFormsList(allForms);
                return;
            }

            const filtered = allForms.filter(item => {
                const title = (item.title || item.digital_form_data?.form_title || '').toLowerCase();
                const desc = (item.digital_form_data?.description || '').toLowerCase();
                return title.includes(query) || desc.includes(query);
            });
            renderFormsList(filtered);
        });
    }

    if (searchClear) {
        searchClear.addEventListener('click', function () {
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            this.style.display = 'none';
            renderFormsList(allForms);
        });
    }

    // Criar Novo Formulário
    const btnNew = document.getElementById('kf-btn-new');
    if (btnNew) {
        btnNew.addEventListener('click', async function () {
            if (window.CkAuth && typeof window.CkAuth.requireAuth === 'function') {
                const okAuth = await window.CkAuth.requireAuth('/login');
                if (!okAuth) return;
            }

            const btn = this;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';

            try {
                const r = await fetch(API_URL + '/api/profile/items', {
                    method: 'POST',
                    credentials: 'include',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        item_type: 'digital_form',
                        title: 'Formulário Sem Título',
                        is_active: true,
                        display_order: 999
                    })
                });

                if (r.status === 401) {
                    showLoginRequired();
                    return;
                }

                const data = await r.json();
                if (data && data.id) {
                    window.location.href = '/kingForms?edit=' + encodeURIComponent(data.id);
                } else {
                    alert(data?.message || 'Erro ao criar novo formulário.');
                }
            } catch (e) {
                alert('Erro na requisição ao criar formulário.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-plus"></i> <span>Criar Novo Formulário</span>';
            }
        });
    }

    // Delegação de Eventos na Lista (Copiar Link, QR Code, Duplicar, Excluir)
    const listView = document.getElementById('kf-list-view');
    if (listView) {
        listView.addEventListener('click', async function (e) {
            // Copiar Link
            const copyBtn = e.target.closest('.kf-btn-copy-link');
            if (copyBtn) {
                e.preventDefault();
                const url = copyBtn.getAttribute('data-url');
                if (url) {
                    try {
                        await navigator.clipboard.writeText(url);
                        const originalHtml = copyBtn.innerHTML;
                        copyBtn.innerHTML = '<i class="fas fa-check" style="color: #10B981;"></i> <span style="color: #10B981;">Copiado!</span>';
                        setTimeout(() => {
                            copyBtn.innerHTML = originalHtml;
                        }, 2000);
                    } catch (err) {
                        alert('Link: ' + url);
                    }
                }
                return;
            }

            // Abrir Modal de QR Code
            const qrBtn = e.target.closest('.kf-btn-qr-trigger');
            if (qrBtn) {
                e.preventDefault();
                const url = qrBtn.getAttribute('data-url') || '';
                const title = qrBtn.getAttribute('data-title') || 'Formulário';
                openQrModal(url, title);
                return;
            }

            // Duplicar Formulário
            const dupBtn = e.target.closest('.kf-btn-duplicate');
            if (dupBtn) {
                e.preventDefault();
                const id = dupBtn.getAttribute('data-id');
                if (!id) return;

                dupBtn.disabled = true;
                dupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                try {
                    const r = await fetch(API_URL + '/api/profile/items/' + encodeURIComponent(id) + '/duplicate', {
                        method: 'POST',
                        credentials: 'include',
                        headers: getHeaders()
                    });

                    if (r.ok) {
                        await loadForms();
                    } else {
                        const errData = await r.json().catch(() => ({}));
                        alert(errData.message || 'Erro ao duplicar formulário.');
                    }
                } catch (err) {
                    alert('Falha na comunicação ao duplicar formulário.');
                } finally {
                    dupBtn.disabled = false;
                    dupBtn.innerHTML = '<i class="fas fa-copy"></i>';
                }
                return;
            }

            // Excluir Formulário
            const delBtn = e.target.closest('.kf-btn-delete-item');
            if (delBtn) {
                e.preventDefault();
                const id = delBtn.getAttribute('data-id');
                if (!id) return;

                if (!confirm('Tem certeza que deseja apagar este formulário? Todas as respostas recebidas serão apagadas.')) {
                    return;
                }

                delBtn.disabled = true;
                delBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                try {
                    const r = await fetch(API_URL + '/api/profile/items/' + encodeURIComponent(id), {
                        method: 'DELETE',
                        credentials: 'include',
                        headers: getHeaders()
                    });

                    if (r.ok) {
                        allForms = allForms.filter(f => String(f.id) !== String(id));
                        updateStats(allForms);
                        renderFormsList(allForms);
                    } else {
                        const err = await r.json().catch(() => ({}));
                        alert(err.message || 'Erro ao apagar formulário.');
                        delBtn.disabled = false;
                        delBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                    }
                } catch (err) {
                    alert('Erro de conexão ao excluir formulário.');
                    delBtn.disabled = false;
                    delBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                }
                return;
            }
        });
    }

    // Modal de QR Code
    const qrModal = document.getElementById('kf-qr-modal');
    const qrCloseBtn = document.getElementById('kf-qr-modal-close');
    const qrCopyBtn = document.getElementById('kf-qr-copy-btn');
    const qrDownloadBtn = document.getElementById('kf-qr-download-btn');
    const qrCanvasBox = document.getElementById('kf-qr-canvas-box');
    const qrTitleEl = document.getElementById('kf-qr-form-title');
    const qrLinkInput = document.getElementById('kf-qr-link-input');

    function openQrModal(url, title) {
        if (!qrModal || !qrCanvasBox) return;
        currentQrUrl = url;
        currentQrTitle = title;

        if (qrTitleEl) qrTitleEl.textContent = title;
        if (qrLinkInput) qrLinkInput.value = url;

        qrCanvasBox.innerHTML = '';
        const canvas = document.createElement('canvas');
        qrCanvasBox.appendChild(canvas);

        QRCode.toCanvas(canvas, url, {
            width: 240,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        }, function (error) {
            if (error) console.error(error);
        });

        qrModal.style.display = 'flex';
    }

    function closeQrModal() {
        if (qrModal) qrModal.style.display = 'none';
    }

    if (qrCloseBtn) qrCloseBtn.addEventListener('click', closeQrModal);
    if (qrModal) {
        qrModal.addEventListener('click', function (e) {
            if (e.target === qrModal) closeQrModal();
        });
    }

    if (qrCopyBtn) {
        qrCopyBtn.addEventListener('click', async function () {
            if (!currentQrUrl) return;
            try {
                await navigator.clipboard.writeText(currentQrUrl);
                qrCopyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                setTimeout(() => {
                    qrCopyBtn.innerHTML = '<i class="fas fa-copy"></i> <span>Copiar Link</span>';
                }, 2000);
            } catch (e) {
                alert('Link: ' + currentQrUrl);
            }
        });
    }

    if (qrDownloadBtn) {
        qrDownloadBtn.addEventListener('click', function () {
            const canvas = qrCanvasBox ? qrCanvasBox.querySelector('canvas') : null;
            if (!canvas) return;

            const link = document.createElement('a');
            link.download = `qrcode_${(currentQrTitle || 'formulario').toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    }

    // Inicialização
    loadForms();
})();
