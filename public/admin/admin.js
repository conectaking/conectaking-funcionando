document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('conectaKingToken');
    let user = null;
    try {
        const userStr = localStorage.getItem('conectaKingUser');
        if (userStr) {
            user = JSON.parse(userStr);
        }
    } catch (e) {
        console.error('Erro ao parsear dados do usuário:', e);
        user = null;
    }

    
    // GUARDA DE SEGURAN?A
    if (!token || !user || !user.isAdmin) {
        alert('Acesso negado.');
        window.location.href = '/';
        return;
    }

    const API_BASE = String(window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');
    const API_URL = API_BASE + '/api/admin';
    const HEADERS = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Função para testar conectividade com a API
    async function testAPIConnectivity() {
        try {
            const response = await fetch(`${API_URL}/stats`, { headers: HEADERS });
            if (response.ok) {
                /* console.log removed (encoding) */
                return true;
            } else {
                console.error('O API retornou erro:', response.status, response.statusText);
                return false;
            }
        } catch (error) {
            console.error('O Erro de conectividade com API:', error);
            return false;
        }
    }

    // --- Seletores do DOM ---
    const userModal = document.getElementById('user-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const saveUserBtn = document.getElementById('save-user-btn');
    const accountTypeSelect = document.getElementById('modal-account-type');

    // Função para mapear account_type antigo para novo ao exibir no dropdown
    // DEVE estar no escopo global para ser acessível pelo event listener
    function mapAccountTypeForDisplay(accountType) {
        const mapping = {
            'individual': 'basic',
            'individual_com_logo': 'premium',
            'business_owner': 'king_corporate'
        };
        return mapping[accountType] || accountType;
    }

    // --- L"GICA DE NAVEGA—fO ---
    const navLinks = document.querySelectorAll('.nav-link');
    const contentPanes = document.querySelectorAll('.content-pane');

    function activateAdminPane(link) {
        const targetId = link && link.dataset && link.dataset.target;
        if (!targetId) return false;
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        contentPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === targetId);
        });
        if (targetId === 'branding-pane') loadDefaultBranding();
        try { window.scrollTo(0, 0); } catch (_) {}
        return true;
    }

    navLinks.forEach(link => {
        const onActivate = (e) => {
            const href = link.getAttribute('href');
            const targetId = link.dataset.target;

            // Link externo (outra página): deixa navegar
            if (href && href !== '#' && !href.startsWith('#') && !targetId) {
                return;
            }

            if (targetId) {
                e.preventDefault();
                e.stopPropagation();
                activateAdminPane(link);
            }
        };
        link.addEventListener('click', onActivate);
        // Mobile: alguns browsers só disparam touch; reforça troca de aba
        link.addEventListener('pointerup', (e) => {
            if (e.pointerType === 'touch' || e.pointerType === 'pen') onActivate(e);
        });
    });

    // --- Logomarca padrão (ADM): upload em vez de URL ---
    function updateDefaultLogoPreview() {
        const urlInput = document.getElementById('default-logo-url');
        const url = (urlInput && urlInput.value) ? urlInput.value.trim() : '';
        const size = Math.min(420, Math.max(20, parseInt(document.getElementById('default-logo-size')?.value, 10) || 60));
        const placeholder = document.getElementById('default-logo-upload-placeholder');
        const previewWrap = document.getElementById('default-logo-upload-preview');
        const previewImg = document.getElementById('default-logo-preview-img');
        const sizePreviewContainer = document.getElementById('default-logo-size-preview-img');
        if (placeholder) placeholder.style.display = url ? 'none' : 'block';
        if (previewWrap) previewWrap.style.display = url ? 'flex' : 'none';
        if (previewImg && url) {
            previewImg.src = url;
            previewImg.onerror = function () { if (sizePreviewContainer) sizePreviewContainer.innerHTML = '<span style="color: var(--text-dark);">Imagem não acessível.</span>'; };
        }
        if (sizePreviewContainer) {
            if (!url) {
                sizePreviewContainer.innerHTML = '<span style="color: var(--text-dark);">Nenhuma logo — no rodapé será usado o logo Conecta King.</span>';
            } else {
                sizePreviewContainer.innerHTML = '<img src="' + url.replace(/"/g, '&quot;') + '" alt="Preview" style="max-height: ' + size + 'px; max-width: 420px; height: auto; width: auto; object-fit: contain;" onerror="this.parentElement.innerHTML=\'<span style=color:var(--text-dark);>Erro ao carregar.</span>\'">';
            }
        }
    }

    async function loadDefaultBranding() {
        const msgEl = document.getElementById('default-branding-message');
        if (msgEl) msgEl.textContent = '';
        try {
            const res = await fetch(`${API_URL}/default-branding`, { headers: { 'Authorization': HEADERS.Authorization } });
            if (!res.ok) throw new Error(res.status === 403 ? 'Acesso negado.' : 'Erro ao carregar.');
            const data = await res.json();
            if (data.success) {
                const urlInput = document.getElementById('default-logo-url');
                const sizeInput = document.getElementById('default-logo-size');
                const linkInput = document.getElementById('default-logo-link');
                if (urlInput) urlInput.value = data.logo_url || '';
                if (sizeInput) sizeInput.value = data.logo_size != null ? data.logo_size : 60;
                if (linkInput) linkInput.value = data.logo_link || '';
                updateDefaultLogoPreview();
            }
        } catch (err) {
            if (msgEl) msgEl.textContent = err.message || 'Erro ao carregar logomarca padrão.';
        }
    }

    const defaultLogoSizeInput = document.getElementById('default-logo-size');
    if (defaultLogoSizeInput) defaultLogoSizeInput.addEventListener('input', updateDefaultLogoPreview);

    const defaultLogoUploadArea = document.getElementById('default-logo-upload-area');
    const defaultLogoFileInput = document.getElementById('default-logo-file-input');
    if (defaultLogoUploadArea && defaultLogoFileInput) {
        defaultLogoUploadArea.addEventListener('click', function (e) {
            if (e.target.closest('#default-logo-remove-btn')) return;
            defaultLogoFileInput.click();
        });
    }
    if (defaultLogoFileInput) {
        defaultLogoFileInput.addEventListener('change', async function () {
            const file = this.files && this.files[0];
            this.value = '';
            if (!file) return;
            if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
                alert('Apenas imagens PNG ou JPG são permitidas.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('A imagem deve ter no máximo 5MB.');
                return;
            }
            const msgEl = document.getElementById('default-branding-message');
            if (msgEl) msgEl.textContent = 'Enviando...';
            try {
                const authRes = await fetch(`${API_BASE}/api/upload/auth`, { method: 'POST', headers: { 'Authorization': HEADERS.Authorization } });
                if (!authRes.ok) throw new Error('Falha ao obter autorização para upload.');
                const { uploadURL } = await authRes.json();
                const formData = new FormData();
                formData.append('file', file);
                const uploadRes = await fetch(uploadURL, { method: 'POST', body: formData, headers: { 'Authorization': HEADERS.Authorization } });
                if (!uploadRes.ok) throw new Error('Falha no upload da imagem.');
                const uploadData = await uploadRes.json();
                const imageUrl = uploadData.url || uploadData.imageUrl || (uploadData.result && (uploadData.result.variants && uploadData.result.variants[0]) || uploadData.result.id);
                if (!imageUrl) throw new Error('Resposta do upload sem URL.');
                const urlInput = document.getElementById('default-logo-url');
                if (urlInput) urlInput.value = imageUrl;
                updateDefaultLogoPreview();
                if (msgEl) msgEl.textContent = 'Logo enviada. Clique em "Salvar" para aplicar.';
            } catch (err) {
                if (msgEl) msgEl.textContent = '';
                alert('Erro ao fazer upload: ' + (err.message || 'Tente novamente.'));
            }
        });
    }
    const defaultLogoRemoveBtn = document.getElementById('default-logo-remove-btn');
    if (defaultLogoRemoveBtn) {
        defaultLogoRemoveBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const urlInput = document.getElementById('default-logo-url');
            if (urlInput) urlInput.value = '';
            updateDefaultLogoPreview();
        });
    }

    const saveDefaultBrandingBtn = document.getElementById('save-default-branding-btn');
    if (saveDefaultBrandingBtn) {
        saveDefaultBrandingBtn.addEventListener('click', async () => {
            const msgEl = document.getElementById('default-branding-message');
            if (msgEl) msgEl.textContent = 'Salvando...';
            saveDefaultBrandingBtn.disabled = true;
            try {
                const logo_url = (document.getElementById('default-logo-url') || {}).value.trim() || null;
                const logo_size = Math.min(420, Math.max(20, parseInt(document.getElementById('default-logo-size')?.value, 10) || 60));
                const logo_link = (document.getElementById('default-logo-link') || {}).value.trim() || null;
                const res = await fetch(`${API_URL}/default-branding`, {
                    method: 'PUT',
                    headers: HEADERS,
                    body: JSON.stringify({ logo_url, logo_size, logo_link })
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data.success) {
                    if (msgEl) msgEl.textContent = 'Logomarca padrão salva.';
                    updateDefaultLogoPreview();
                } else {
                    if (msgEl) msgEl.textContent = data.message || 'Erro ao salvar.';
                }
            } catch (err) {
                if (msgEl) msgEl.textContent = err.message || 'Erro de conexão.';
            } finally {
                saveDefaultBrandingBtn.disabled = false;
            }
        });
    }

    // Arrastar para rolar a tabela horizontalmente (sem depender só da barra)
    function setupDragToScroll(container) {
        if (!container || container._dragScrollSetup) return;
        container._dragScrollSetup = true;
        container.classList.add('drag-scroll');
        var isDown = false, startX, scrollLeftStart, dragged = false;
        container.addEventListener('mousedown', function(e) {
            if (e.target.closest('input, button, a, select, th')) return;
            isDown = true;
            dragged = false;
            startX = e.pageX;
            scrollLeftStart = container.scrollLeft;
            container.style.cursor = 'grabbing';
            container.style.userSelect = 'none';
        });
        container.addEventListener('mouseleave', function() {
            isDown = false;
            container.style.cursor = 'grab';
            container.style.userSelect = '';
        });
        container.addEventListener('mouseup', function() {
            isDown = false;
            container.style.cursor = 'grab';
            container.style.userSelect = '';
            setTimeout(function() { dragged = false; }, 0);
        });
        container.addEventListener('mousemove', function(e) {
            if (!isDown) return;
            dragged = true;
            e.preventDefault();
            container.scrollLeft = scrollLeftStart - (e.pageX - startX);
        });
        container.addEventListener('click', function(e) {
            if (dragged) { e.preventDefault(); e.stopPropagation(); }
        }, true);
    }
    document.querySelectorAll('#users-pane .table-container, #codes-pane .table-container').forEach(setupDragToScroll);

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '/';
        });
    }

    const logoutAdminBtn = document.getElementById('logout-admin-btn');
    if (logoutAdminBtn) {
        logoutAdminBtn.addEventListener('click', () => {
            window.location.href = '/dashboard';
        });
    }

    // --- FUN—.ES DE CARREGAMENTO DE DADOS ---
    /** Respostas da API: { success: true, data: ... } — extrai o payload útil. */
    function unwrapApiJson(body) {
        if (body == null || typeof body !== 'object') return body;
        const ok = body.success === true || body.success === 'true';
        if (ok && Object.prototype.hasOwnProperty.call(body, 'data')) {
            return body.data;
        }
        return body;
    }

    async function fetchData(endpoint) {
        try {
            const fullUrl = `${API_URL}/${endpoint}`;
            /* console.log removed (encoding) */
            const response = await fetch(fullUrl, { headers: HEADERS });
            /* console.log removed (encoding) */
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`O Erro na resposta para ${endpoint}:`, {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                // Retornar array vazio para endpoints de analytics em caso de erro 404 ou similar
                if (endpoint.includes('analytics') && (response.status === 404 || response.status === 500)) {
                    console.warn(`Endpoint ${endpoint} não disponível, retornando array vazio`);
                    return [];
                }
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }
            
            const raw = await response.json();
            const payload = unwrapApiJson(raw);
            console.log(`Dados recebidos para ${endpoint}:`, {
                type: Array.isArray(payload) ? 'array' : typeof payload,
                length: Array.isArray(payload) ? payload.length : 'N/A',
                sample: Array.isArray(payload) && payload.length > 0 ? payload[0] : payload
            });
            return payload;
        } catch (error) {
            console.error(`O Erro ao buscar ${endpoint}:`, error);
            // Para endpoints de analytics, retornar array vazio em vez de null
            if (endpoint.includes('analytics')) {
                console.warn(`Retornando array vazio para ${endpoint} devido a erro`);
                return [];
            }
            // Não mostrar alerta para não interromper o fluxo
            return null;
        }
    }

    // Variável global para armazenar analytics de usuários
    let userAnalytics = [];

    async function loadDashboard() {
        /* console.log removed (encoding) */
        
        try {
            const [stats, users, codes, analytics] = await Promise.all([
                fetchData('stats'),
                fetchData('users'),
                fetchData('codes'),
                fetchData('analytics/users').catch(err => {
                    console.error('O Erro ao buscar analytics:', err);
                    // Retornar array vazio em caso de erro
                    return [];
                })
            ]);


            // Armazenar analytics globalmente
            userAnalytics = (Array.isArray(analytics) ? analytics : []) || [];

            if (stats) {
                renderStats(stats);
                // Carregar métricas avançadas usando dados disponíveis
                loadAdvancedStats(users, stats);
            } else {
                console.warn('Stats não carregados, usando valores padrão');
                renderStats({ totalUsers: 0, totalCodes: 0, claimedCodes: 0, totalClicks: 0, totalViews: 0 });
                // Tentar carregar métricas avançadas mesmo sem stats
                loadAdvancedStats(users, { totalUsers: 0, totalCodes: 0, claimedCodes: 0, totalClicks: 0, totalViews: 0 });
            }

            if (users) {
                allUsers = users;
                updateUserStats(users);
                const initial = getUserFiltered();
                applyUserPagination(initial);
                // Renderizar top perfis e lista completa com analytics
                const analyticsArray = Array.isArray(analytics) ? analytics : [];
                /* console.log removed (encoding) */
                renderTopPerformedProfiles(analyticsArray);
                renderAllProfilesList(users, analyticsArray);
            } else {
                console.warn('Usuários não carregados');
                allUsers = [];
                updateUserStats([]);
                renderUsers([]);
                updateUserCount(0, 0);
            }

            // Carregar códigos (sem filtro inicial)
            await loadCodes();
            updateCodeStats(allCodes);
        } catch (error) {
            console.error('O Erro ao carregar dashboard:', error);
            // Renderizar com dados vazios para não quebrar a interface
            renderStats({ totalUsers: 0, totalCodes: 0, claimedCodes: 0, totalClicks: 0, totalViews: 0 });
            renderUsers([]);
            renderCodes([]);
            renderAdvancedStatsWithDefaults();
        }
    }

    // Função para carregar estatísticas avançadas
    async function loadAdvancedStats(users, stats) {
        try {
            const response = await fetch(`${API_URL}/advanced-stats`, { headers: HEADERS });
            
            if (!response.ok) {
                console.error(`O Erro ao buscar advanced-stats: ${response.status} ${response.statusText}`);
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { message: errorText || 'Erro desconhecido' };
                }
                console.error('Y"< Detalhes do erro:', errorData);
                throw new Error(`Erro ${response.status}: ${errorData.message || response.statusText}`);
            }
            
            const rawAdvanced = await response.json();
            const advancedStats = unwrapApiJson(rawAdvanced);
            console.log(advancedStats);
            
            const statsData = {
                activeUsers7d: parseInt(advancedStats.activeUsers7d, 10) || 0,
                activeUsersToday: parseInt(advancedStats.activeUsersToday, 10) || 0,
                loginsToday: parseInt(advancedStats.loginsToday, 10) || 0,
                modifiedToday: parseInt(advancedStats.modifiedToday, 10) || 0,
                expiredSubscriptions: parseInt(advancedStats.expiredSubscriptions, 10) || 0,
                expiringSoon: parseInt(advancedStats.expiringSoon, 10) || 0,
                totalLinks: parseInt(advancedStats.totalLinks, 10) || 0,
                usersWithProfile: parseInt(advancedStats.usersWithProfile, 10) || 0,
                notUsedToday: parseInt(advancedStats.notUsedToday, 10) || 0,
                activeUsersCount: parseInt(advancedStats.activeUsersCount, 10) || 0,
                expiredUsersCount: parseInt(advancedStats.expiredUsersCount, 10) || 0,
                usersActivity: advancedStats.usersActivity || [],
                activeUsersList: advancedStats.activeUsersList || [],
                expiredUsersList: advancedStats.expiredUsersList || []
            };
            
            console.log(statsData);
            
            // Renderizar as novas estatísticas
            renderAdvancedStats(statsData);
            
        } catch (error) {
            console.error('O Erro ao carregar estatísticas avançadas:', error);
            console.error('Y"< Stack trace:', error.stack);
            // Em caso de erro, definir todos os valores como 0
            renderAdvancedStats({
                activeUsers7d: 0,
                activeUsersToday: 0,
                loginsToday: 0,
                modifiedToday: 0,
                expiredSubscriptions: 0,
                expiringSoon: 0,
                totalLinks: 0,
                usersWithProfile: 0,
                notUsedToday: 0,
                activeUsersCount: 0,
                expiredUsersCount: 0,
                usersActivity: [],
                activeUsersList: [],
                expiredUsersList: []
            });
        }
    }
    
    function renderAdvancedStatsWithDefaults() {
        const fields = [
            'active-users-7d',
            'active-users-today',
            'logins-today',
            'modified-today',
            'users-with-profile',
            'total-links',
            'expired-subscriptions',
            'expiring-soon',
            'not-used-today'
        ];
        
        fields.forEach(fieldId => {
            const el = document.getElementById(fieldId);
            if (el) el.textContent = '0';
        });

        // Renderizar tabela vazia
        const container = document.getElementById('users-active-expired-table-container');
        if (container) {
            container.innerHTML = `
                <div style="margin-top: 20px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <div style="background: var(--card-background-color, #1C1C21); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F);">
                            <h4 style="color: var(--dourado-principal, #FFC700); margin-bottom: 10px;">
                                <i class="fas fa-check-circle"></i> Usuários Ativos
                            </h4>
                            <p style="font-size: 2rem; font-weight: bold; color: var(--text); margin: 0;">0</p>
                        </div>
                        <div style="background: var(--card-background-color, #1C1C21); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F);">
                            <h4 style="color: #ff4444; margin-bottom: 10px;">
                                <i class="fas fa-times-circle"></i> Usuários Vencidos
                            </h4>
                            <p style="font-size: 2rem; font-weight: bold; color: var(--text); margin: 0;">0</p>
                        </div>
                    </div>
                    <p style="text-align: center; color: var(--text-dark); padding: 20px;">Carregando dados...</p>
                </div>
            `;
        }
    }

    // Função para renderizar estatísticas avançadas
    function renderAdvancedStats(analytics) {
        const activeUsers7dEl = document.getElementById('active-users-7d');
        if (activeUsers7dEl) {
            activeUsers7dEl.textContent = analytics.activeUsers7d !== undefined ? analytics.activeUsers7d.toLocaleString('pt-BR') : '0';
        }
        
        const activeUsersTodayEl = document.getElementById('active-users-today');
        if (activeUsersTodayEl) {
            activeUsersTodayEl.textContent = analytics.activeUsersToday !== undefined ? analytics.activeUsersToday.toLocaleString('pt-BR') : '0';
        }
        
        const usersWithProfileEl = document.getElementById('users-with-profile');
        if (usersWithProfileEl) {
            usersWithProfileEl.textContent = analytics.usersWithProfile !== undefined ? analytics.usersWithProfile.toLocaleString('pt-BR') : '0';
        }
        
        const totalLinksEl = document.getElementById('total-links');
        if (totalLinksEl) {
            totalLinksEl.textContent = analytics.totalLinks !== undefined ? analytics.totalLinks.toLocaleString('pt-BR') : '0';
        }
        
        // Novos campos - SEMPRE atualizar, mesmo se for 0 ou undefined
        const loginsTodayEl = document.getElementById('logins-today');
        if (loginsTodayEl) {
            loginsTodayEl.textContent = (analytics.loginsToday !== undefined && analytics.loginsToday !== null) 
                ? analytics.loginsToday.toLocaleString('pt-BR') : '0';
        }
        
        const modifiedTodayEl = document.getElementById('modified-today');
        if (modifiedTodayEl) {
            modifiedTodayEl.textContent = (analytics.modifiedToday !== undefined && analytics.modifiedToday !== null)
                ? analytics.modifiedToday.toLocaleString('pt-BR') : '0';
        }
        
        const expiredSubscriptionsEl = document.getElementById('expired-subscriptions');
        if (expiredSubscriptionsEl) {
            expiredSubscriptionsEl.textContent = (analytics.expiredSubscriptions !== undefined && analytics.expiredSubscriptions !== null)
                ? analytics.expiredSubscriptions.toLocaleString('pt-BR') : '0';
        }
        
        const expiringSoonEl = document.getElementById('expiring-soon');
        if (expiringSoonEl) {
            expiringSoonEl.textContent = (analytics.expiringSoon !== undefined && analytics.expiringSoon !== null)
                ? analytics.expiringSoon.toLocaleString('pt-BR') : '0';
        }
        
        const notUsedTodayEl = document.getElementById('not-used-today');
        if (notUsedTodayEl) {
            notUsedTodayEl.textContent = (analytics.notUsedToday !== undefined && analytics.notUsedToday !== null)
                ? analytics.notUsedToday.toLocaleString('pt-BR') : '0';
        }

        // Renderizar tabela de usuários ativos vs vencidos
        renderUsersActiveVsExpiredTable(analytics);
    }

    // Função para renderizar tabela de usuários ativos vs vencidos
    function renderUsersActiveVsExpiredTable(analytics) {
        const container = document.getElementById('users-active-expired-table-container');
        if (!container) return;

        const activeList = analytics.activeUsersList || [];
        const expiredList = analytics.expiredUsersList || [];
        const activeCount = analytics.activeUsersCount || 0;
        const expiredCount = analytics.expiredUsersCount || 0;

        let html = `
            <div style="margin-top: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div style="background: var(--card-background-color, #1C1C21); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F);">
                        <h4 style="color: var(--dourado-principal, #FFC700); margin-bottom: 10px;">
                            <i class="fas fa-check-circle"></i> Usuários Ativos
                        </h4>
                        <p style="font-size: 2rem; font-weight: bold; color: var(--text); margin: 0;">${activeCount.toLocaleString('pt-BR')}</p>
                    </div>
                    <div style="background: var(--card-background-color, #1C1C21); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F);">
                        <h4 style="color: #ff4444; margin-bottom: 10px;">
                            <i class="fas fa-times-circle"></i> Usuários Vencidos
                        </h4>
                        <p style="font-size: 2rem; font-weight: bold; color: var(--text); margin: 0;">${expiredCount.toLocaleString('pt-BR')}</p>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <!-- Tabela de Usuários Ativos -->
                    <div style="background: var(--card-background-color, #1C1C21); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F);">
                        <h4 style="color: var(--text); margin-bottom: 15px;">
                            <i class="fas fa-check-circle"></i> Lista de Usuários Ativos
                        </h4>
                        <div style="max-height: 400px; overflow-y: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                                <thead>
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <th style="padding: 10px; text-align: left; color: var(--text-dark);">Nome</th>
                                        <th style="padding: 10px; text-align: left; color: var(--text-dark);">Status</th>
                                        <th style="padding: 10px; text-align: left; color: var(--text-dark);">ltima Atividade</th>
                                    </tr>
                                </thead>
                                <tbody>
        `;

        if (activeList.length === 0) {
            html += `
                                    <tr>
                                        <td colspan="3" style="padding: 20px; text-align: center; color: var(--text-dark);">Nenhum usuário ativo encontrado</td>
                                    </tr>
            `;
        } else {
            activeList.slice(0, 20).forEach(user => {
                const lastActivity = user.lastActivityDate ? 
                    new Date(user.lastActivityDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 
                    'Nunca';
                const daysSince = user.daysSinceLastActivity !== null ? user.daysSinceLastActivity : '-';
                
                html += `
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                                        <td style="padding: 10px; color: var(--text);">${user.displayName || user.email}</td>
                                        <td style="padding: 10px;">
                                            <span style="padding: 4px 8px; background: #4CAF50; color: white; border-radius: 4px; font-size: 0.8rem;">
                                                ${user.subscriptionStatus || 'free'}
                                            </span>
                                        </td>
                                        <td style="padding: 10px; color: var(--text-dark);">
                                            ${lastActivity} ${daysSince !== '-' && daysSince !== null ? `(${daysSince} dias)` : ''}
                                        </td>
                                    </tr>
                `;
            });
            
            if (activeList.length > 20) {
                html += `
                                    <tr>
                                        <td colspan="3" style="padding: 10px; text-align: center; color: var(--text-dark); font-style: italic;">
                                            ... e mais ${activeList.length - 20} usuários
                                        </td>
                                    </tr>
                `;
            }
        }

        html += `
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Tabela de Usuários Vencidos -->
                    <div style="background: var(--card-background-color, #1C1C21); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color, #2C2C2F);">
                        <h4 style="color: var(--text); margin-bottom: 15px;">
                            <i class="fas fa-times-circle"></i> Lista de Usuários Vencidos
                        </h4>
                        <div style="max-height: 400px; overflow-y: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                                <thead>
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <th style="padding: 10px; text-align: left; color: var(--text-dark);">Nome</th>
                                        <th style="padding: 10px; text-align: left; color: var(--text-dark);">Vencido há</th>
                                        <th style="padding: 10px; text-align: left; color: var(--text-dark);">ltima Atividade</th>
                                    </tr>
                                </thead>
                                <tbody>
        `;

        if (expiredList.length === 0) {
            html += `
                                    <tr>
                                        <td colspan="3" style="padding: 20px; text-align: center; color: var(--text-dark);">Nenhum usuário vencido encontrado</td>
                                    </tr>
            `;
        } else {
            expiredList.slice(0, 20).forEach(user => {
                const daysExpired = user.daysExpired !== null ? user.daysExpired : '-';
                const lastActivity = user.lastActivityDate ? 
                    new Date(user.lastActivityDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 
                    'Nunca';
                
                html += `
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                                        <td style="padding: 10px; color: var(--text);">${user.displayName || user.email}</td>
                                        <td style="padding: 10px;">
                                            <span style="padding: 4px 8px; background: #ff4444; color: white; border-radius: 4px; font-size: 0.8rem;">
                                                ${daysExpired !== '-' ? `${daysExpired} dias` : '-'}
                                            </span>
                                        </td>
                                        <td style="padding: 10px; color: var(--text-dark);">${lastActivity}</td>
                                    </tr>
                `;
            });
            
            if (expiredList.length > 20) {
                html += `
                                    <tr>
                                        <td colspan="3" style="padding: 10px; text-align: center; color: var(--text-dark); font-style: italic;">
                                            ... e mais ${expiredList.length - 20} usuários
                                        </td>
                                    </tr>
                `;
            }
        }

        html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // Função para renderizar top 20 perfis mais visualizados
    function renderTopPerformedProfiles(analytics) {
        const topViewedEl = document.getElementById('top-viewed-profiles');
        if (!topViewedEl) {
            console.warn('Elemento #top-viewed-profiles não encontrado');
            return;
        }
        
        
        if (!analytics || !Array.isArray(analytics) || analytics.length === 0) {
            topViewedEl.innerHTML = `
                <div style="color: var(--text-dark); text-align: center; padding: 20px;">
                    <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 10px; display: block; color: var(--primary);"></i>
                    <p style="margin: 0;">Nenhum dado de analytics disponível</p>
                    <small style="display: block; margin-top: 5px; opacity: 0.7;">Aguarde alguns segundos e atualize a página</small>
                    <small style="display: block; margin-top: 5px; opacity: 0.5; font-size: 0.75rem;">Ou verifique se há visualizações registradas na plataforma</small>
                </div>
            `;
            return;
        }
        
        // Ordenar por visualizações (já vem ordenado da API, mas garantir)
        const sorted = [...analytics].sort((a, b) => parseInt(b.total_views) - parseInt(a.total_views));
        const topUsers = sorted.slice(0, 20);
        
        if (topUsers.length === 0) {
            topViewedEl.innerHTML = '<p style="color: var(--text-dark); text-align: center; padding: 20px;">Nenhum perfil encontrado</p>';
            return;
        }
        
        const listHTML = topUsers.map((user, index) => {
            const displayName = user.display_name || user.email || 'Sem nome';
            const views = parseInt(user.total_views) || 0;
            const clicks = parseInt(user.total_clicks) || 0;
            const hasViews = views > 0;
            
            return `
                <div class="top-item profile-item-clickable" 
                     data-user-id="${user.id}" 
                     data-display-name="${displayName.replace(/"/g, '&quot;')}"
                     style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background-color 0.2s;"
                     role="button"
                     tabindex="0">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                        <span style="color: var(--primary); font-weight: bold; min-width: 25px; font-size: 1.1rem;">${index + 1}.</span>
                        <div style="flex: 1;">
                            <div style="color: var(--text); font-weight: 600; margin-bottom: 3px;" data-display-name="${displayName.replace(/"/g, '&quot;')}">${displayName}</div>
                            <div style="color: var(--text-dark); font-size: 0.85rem;">${user.email}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 15px; align-items: center;">
                        <div style="text-align: right;">
                            <div style="color: var(--primary); font-weight: bold; font-size: 1.1rem;">${views.toLocaleString()}</div>
                            <div style="color: var(--text-dark); font-size: 0.75rem;">visualizações</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: var(--text); font-weight: bold;">${clicks.toLocaleString()}</div>
                            <div style="color: var(--text-dark); font-size: 0.75rem;">cliques</div>
                        </div>
                        <i class="fas fa-chevron-right" style="color: var(--text-dark); margin-left: 10px;"></i>
                    </div>
                </div>
            `;
        }).join('');
        
        topViewedEl.innerHTML = listHTML || '<p style="color: var(--text-dark); text-align: center; padding: 20px;">Nenhum dado disponível</p>';
        
        // Adicionar event listeners após renderizar
        topViewedEl.querySelectorAll('.profile-item-clickable').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const userId = item.getAttribute('data-user-id');
                const displayNameAttr = item.getAttribute('data-display-name');
                const displayNameEl = item.querySelector('[data-display-name]');
                const displayName = displayNameAttr || 
                                  (displayNameEl ? displayNameEl.getAttribute('data-display-name') : null) ||
                                  item.textContent.trim().split('\n')[0] || 'Usuário';
                /* console.log removed (encoding) */
                if (userId && window.showProfileAnalytics) {
                    window.showProfileAnalytics(userId, displayName.replace(/&quot;/g, '"'));
                } else {
                    console.error('O userId ou showProfileAnalytics não disponível', { userId, hasFunction: !!window.showProfileAnalytics });
                }
            });
            
            // Adicionar suporte para Enter (acessibilidade)
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            });
            
            // Adicionar hover effects via JS para melhor controle
            item.addEventListener('mouseenter', () => {
                item.style.borderColor = 'var(--primary)';
                item.style.transform = 'translateX(4px)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.borderColor = 'var(--border-color)';
                item.style.transform = 'translateX(0)';
            });
        });
    }

    // Função para renderizar lista completa de perfis
    function renderAllProfilesList(users, analytics) {
        const profilesListEl = document.getElementById('all-profiles-list');
        if (!profilesListEl) return;
        
        if (!users || users.length === 0) {
            profilesListEl.innerHTML = '<p style="color: var(--text-dark); text-align: center; padding: 20px;">Nenhum usuário encontrado</p>';
            return;
        }
        
        // Criar mapa de analytics por user_id para busca rápida
        const analyticsMap = {};
        if (analytics && analytics.length > 0) {
            analytics.forEach(a => {
                analyticsMap[a.id] = a;
            });
        }
        
        // Separar perfis com e sem visualizações
        const profilesWithViews = [];
        const profilesWithoutViews = [];
        
        users.forEach(user => {
            const userAnalytic = analyticsMap[user.id] || { total_views: 0, total_clicks: 0 };
            const views = parseInt(userAnalytic.total_views) || 0;
            
            const profileData = {
                ...user,
                ...userAnalytic,
                total_views: views,
                total_clicks: parseInt(userAnalytic.total_clicks) || 0
            };
            
            if (views > 0) {
                profilesWithViews.push(profileData);
            } else {
                profilesWithoutViews.push(profileData);
            }
        });
        
        // Ordenar por visualizações
        profilesWithViews.sort((a, b) => b.total_views - a.total_views);
        
        let listHTML = '';
        
        // Seção de perfis com visualizações
        if (profilesWithViews.length > 0) {
            listHTML += `
                <div style="margin-bottom: 30px;">
                    <h4 style="color: var(--success); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-check-circle"></i> Perfis com Visualizações (${profilesWithViews.length})
                    </h4>
                    ${profilesWithViews.map(user => createProfileListItem(user)).join('')}
                </div>
            `;
        }
        
        // Seção de perfis sem visualizações
        if (profilesWithoutViews.length > 0) {
            listHTML += `
                <div>
                    <h4 style="color: var(--text-dark); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-times-circle"></i> Perfis sem Visualizações (${profilesWithoutViews.length})
                    </h4>
                    ${profilesWithoutViews.map(user => createProfileListItem(user)).join('')}
                </div>
            `;
        }
        
        if (listHTML === '') {
            listHTML = '<p style="color: var(--text-dark); text-align: center; padding: 20px;">Nenhum perfil encontrado</p>';
        }
        
        profilesListEl.innerHTML = listHTML;
        
        // Adicionar event listeners após renderizar
        profilesListEl.querySelectorAll('.profile-item-clickable').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const userId = item.getAttribute('data-user-id');
                const displayNameEl = item.querySelector('[data-display-name]');
                const displayName = displayNameEl ? displayNameEl.getAttribute('data-display-name') : 
                                  item.textContent.trim().split('\n')[0] || 'Usuário';
                /* console.log removed (encoding) */
                if (userId && window.showProfileAnalytics) {
                    window.showProfileAnalytics(userId, displayName.replace(/&quot;/g, '"'));
                } else {
                    console.error('O userId ou showProfileAnalytics não disponível', { userId, hasFunction: !!window.showProfileAnalytics });
                }
            });
            
            // Adicionar suporte para Enter (acessibilidade)
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            });
            
            // Adicionar hover effects via JS para melhor controle
            item.addEventListener('mouseenter', () => {
                item.style.borderColor = 'var(--primary)';
                item.style.transform = 'translateX(4px)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.borderColor = 'var(--border-color)';
                item.style.transform = 'translateX(0)';
            });
        });
        
        // Adicionar evento de busca
        setupProfileSearch();
    }

    function createProfileListItem(user) {
        const displayName = user.display_name || user.email || 'Sem nome';
        const views = parseInt(user.total_views) || 0;
        const clicks = parseInt(user.total_clicks) || 0;
        const hasViews = views > 0;
        const lastViewDate = user.last_view_date ? new Date(user.last_view_date).toLocaleDateString('pt-BR') : 'Nunca';
        
        return `
            <div class="profile-list-item profile-item-clickable" 
                 data-user-id="${user.id}"
                 data-search-text="${(displayName + ' ' + user.email).toLowerCase()}"
                 style="background: var(--bg-light); padding: 15px; margin-bottom: 10px; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center;"
                 role="button"
                 tabindex="0">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                        <span style="color: ${hasViews ? 'var(--success)' : 'var(--text-dark)'}; font-size: 0.9rem;">
                            <i class="fas fa-${hasViews ? 'check-circle' : 'times-circle'}"></i>
                        </span>
                        <span style="color: var(--text); font-weight: 600; font-size: 1rem;" data-display-name="${displayName.replace(/"/g, '&quot;')}">${displayName}</span>
                    </div>
                    <div style="color: var(--text-dark); font-size: 0.85rem; margin-left: 24px;">${user.email}</div>
                    <div style="color: var(--text-dark); font-size: 0.75rem; margin-left: 24px; margin-top: 5px;">
                        ltima visualização: ${lastViewDate}
                    </div>
                </div>
                <div style="display: flex; gap: 20px; align-items: center;">
                    <div style="text-align: right;">
                        <div style="color: var(--primary); font-weight: bold; font-size: 1.1rem;">${views.toLocaleString()}</div>
                        <div style="color: var(--text-dark); font-size: 0.75rem;">visualizações</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: var(--text); font-weight: bold;">${clicks.toLocaleString()}</div>
                        <div style="color: var(--text-dark); font-size: 0.75rem;">cliques</div>
                    </div>
                    <i class="fas fa-chevron-right" style="color: var(--text-dark); margin-left: 10px;"></i>
                </div>
            </div>
        `;
    }

    function setupProfileSearch() {
        const searchInput = document.getElementById('profile-search-input');
        if (!searchInput) return;
        
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            const items = document.querySelectorAll('.profile-list-item');
            
            items.forEach(item => {
                const searchText = item.getAttribute('data-search-text') || '';
                if (searchText.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }

    // Variáveis globais para gráficos
    let performanceChart = null;
    let linksChart = null;
    let currentAnalyticsUserId = null;
    
    // Função para carregar analytics com período específico
    async function loadAnalyticsWithPeriod(userId, period = '30') {
        try {
            const fullUrl = `${API_URL}/analytics/user/${userId}/details?period=${period}`;
            /* console.log removed (encoding) */
            const response = await fetch(fullUrl, { headers: HEADERS });
            /* console.log removed (encoding) */
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`O Erro na resposta:`, {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                throw new Error(`Erro ${response.status}: ${errorText || response.statusText}`);
            }
            
            const details = await response.json();
            console.log(details);
            
            // Validar estrutura dos dados
            if (!details || typeof details !== 'object') {
                console.warn('Dados recebidos não são um objeto válido:', details);
                return null;
            }
            
            return details;
        } catch (error) {
            console.error(`O Erro ao buscar detalhes do usuário ${userId}:`, error);
            throw error;
        }
    }
    
    // Função para renderizar gráficos e conteúdo completo
    function renderCompleteAnalytics(details, period = '30') {
        const contentEl = document.getElementById('profile-analytics-content');
        if (!contentEl) {
            console.error('O Elemento profile-analytics-content não encontrado!');
            return;
        }
        
        
        const stats = details.stats || {};
        const links = details.links || [];
        const periodStats = details.period_stats || {};
        const performance = details.performance || [];
        const recentClicks = details.recent_clicks || [];
        
        
        // Debug detalhado dos links
        
        const totalViews = parseInt(stats.total_views) || 0;
        const totalClicks = parseInt(stats.total_clicks) || 0;
        const totalVcards = parseInt(stats.total_vcard_downloads) || 0;
        const viewsPeriod = parseInt(periodStats.views_period) || 0;
        const clicksPeriod = parseInt(periodStats.clicks_period) || 0;
        
        
        // Calcular últimas datas dentro do período
        const periodDays = parseInt(period) || 30;
        const periodStartDate = new Date();
        periodStartDate.setDate(periodStartDate.getDate() - periodDays);
        
        // Filtrar performance para pegar última view/click do período
        const periodPerformance = performance.filter(p => {
            const pDate = new Date(p.date);
            return pDate >= periodStartDate;
        });
        
        const lastViewInPeriod = periodPerformance.length > 0 && periodPerformance.some(p => parseInt(p.views) > 0) 
            ? new Date(Math.max(...periodPerformance.filter(p => parseInt(p.views) > 0).map(p => new Date(p.date))))
            : null;
        const lastClickInPeriod = periodPerformance.length > 0 && periodPerformance.some(p => parseInt(p.clicks) > 0)
            ? new Date(Math.max(...periodPerformance.filter(p => parseInt(p.clicks) > 0).map(p => new Date(p.date))))
            : null;
            
        const lastViewDate = stats.last_view_date ? new Date(stats.last_view_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nunca';
        const lastClickDate = stats.last_click_date ? new Date(stats.last_click_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nunca';
        const firstViewDate = stats.first_view_date ? new Date(stats.first_view_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Nunca';
        
        const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';
        const ctrPeriod = viewsPeriod > 0 ? ((clicksPeriod / viewsPeriod) * 100).toFixed(1) : '0.0';
        
        // Renderizar HTML completo
        contentEl.innerHTML = `
            <!-- Estatísticas Gerais -->
            <div style="margin-bottom: 30px;">
                <h4 style="color: var(--text); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-chart-bar"></i> Estatísticas Gerais
                </h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px;">
                    <div style="background: var(--bg-dark); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); text-align: center;">
                        <div style="color: var(--primary); font-size: 2.5rem; font-weight: bold; margin-bottom: 5px;">${totalViews.toLocaleString()}</div>
                        <div style="color: var(--text-dark); font-size: 0.85rem;">Visualizações Totais</div>
                        <div style="color: var(--text-dark); font-size: 0.75rem; margin-top: 5px; opacity: 0.7;">${viewsPeriod.toLocaleString()} no período</div>
                    </div>
                    <div style="background: var(--bg-dark); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); text-align: center;">
                        <div style="color: var(--text); font-size: 2.5rem; font-weight: bold; margin-bottom: 5px;">${totalClicks.toLocaleString()}</div>
                        <div style="color: var(--text-dark); font-size: 0.85rem;">Cliques Totais</div>
                        <div style="color: var(--text-dark); font-size: 0.75rem; margin-top: 5px; opacity: 0.7;">${clicksPeriod.toLocaleString()} no período</div>
                    </div>
                    <div style="background: var(--bg-dark); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); text-align: center;">
                        <div style="color: var(--text); font-size: 2.5rem; font-weight: bold; margin-bottom: 5px;">${ctr}%</div>
                        <div style="color: var(--text-dark); font-size: 0.85rem;">Taxa de Conversão</div>
                        <div style="color: var(--text-dark); font-size: 0.75rem; margin-top: 5px; opacity: 0.7;">${ctrPeriod}% no período</div>
                    </div>
                    <div style="background: var(--bg-dark); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); text-align: center;">
                        <div style="color: var(--text); font-size: 2.5rem; font-weight: bold; margin-bottom: 5px;">${totalVcards.toLocaleString()}</div>
                        <div style="color: var(--text-dark); font-size: 0.85rem;">vCards Baixados</div>
                    </div>
                </div>
                <div style="background: var(--bg-dark); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <div style="color: var(--text-dark); font-size: 0.85rem; margin-bottom: 3px;">Primeira visualização:</div>
                        <div style="color: var(--text); font-size: 0.9rem; font-weight: 500;">${firstViewDate}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-dark); font-size: 0.85rem; margin-bottom: 3px;">ltima visualização:</div>
                        <div style="color: var(--text); font-size: 0.9rem; font-weight: 500;">${lastViewDate}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-dark); font-size: 0.85rem; margin-bottom: 3px;">ltimo clique:</div>
                        <div style="color: var(--text); font-size: 0.9rem; font-weight: 500;">${lastClickDate}</div>
                    </div>
                </div>
            </div>
            
            <!-- Gráfico de Performance -->
            ${performance.length > 0 ? `
            <div style="margin-bottom: 30px;">
                <h4 style="color: var(--text); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-chart-line"></i> Performance ao Longo do Tempo
                </h4>
                <div style="background: var(--bg-dark); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <canvas id="performance-chart" style="max-height: 300px;"></canvas>
                </div>
            </div>
            ` : `
            <div style="margin-bottom: 30px;">
                <h4 style="color: var(--text); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-chart-line"></i> Performance ao Longo do Tempo
                </h4>
                <div style="background: var(--bg-dark); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); text-align: center;">
                    <p style="color: var(--text-dark); margin: 0;">Ainda não há dados de performance para exibir no gráfico.</p>
                    <small style="color: var(--text-dark); opacity: 0.7;">Os gráficos aparecerão quando houver visualizações ou cliques registrados.</small>
                </div>
            </div>
            `}
            
            <!-- Gráfico de Distribuição de Cliques por Link -->
            ${links.length > 0 ? `
            <div style="margin-bottom: 30px;">
                <h4 style="color: var(--text); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-chart-pie"></i> Distribuição de Cliques por Link
                </h4>
                <div style="background: var(--bg-dark); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <canvas id="links-distribution-chart" style="max-height: 300px;"></canvas>
                </div>
            </div>
            ` : ''}
            
            <!-- Detalhes por Link -->
            <div style="margin-bottom: 30px;">
                <h4 style="color: var(--text); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-link"></i> Detalhes de Cada Link (${links.length} ${links.length === 1 ? 'link cadastrado' : 'links cadastrados'})
                </h4>
            </div>
        `;
        
        // Renderizar links
        let linksHTML = '';
        if (links.length === 0) {
            linksHTML = '<p style="color: var(--text-dark); text-align: center; padding: 20px;">Este perfil ainda não possui links cadastrados.</p>';
        } else {
            const sortedLinks = [...links].sort((a, b) => (parseInt(b.click_count) || 0) - (parseInt(a.click_count) || 0));
            
            linksHTML = '<div style="display: grid; gap: 15px;">' + sortedLinks.map((link) => {
                // Garantir que estamos usando os valores corretos
                const clickCount = parseInt(link.click_count) || 0;
                const clickCountPeriod = parseInt(link.click_count_period) || 0;
                const lastClickDate = link.last_click_date || null;
                const firstClickDate = link.first_click_date || null;
                
                const lastClick = lastClickDate ? new Date(lastClickDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nunca';
                const firstClick = firstClickDate ? new Date(firstClickDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Nunca';
                
                console.log(`Y"- Renderizando link "${link.title || 'Sem título'}":`, {
                    clickCount,
                    clickCountPeriod,
                    lastClickDate,
                    firstClickDate,
                    lastClick,
                    firstClick
                });
                const iconClass = link.icon_class || 'fas fa-link';
                const linkTitle = link.title || 'Sem título';
                const linkUrl = link.url || 'N/A';
                
                // Detectar tipo de link
                let linkType = 'Link Personalizado';
                let linkTypeColor = 'var(--primary)';
                if (linkUrl.includes('whatsapp.com') || linkUrl.includes('wa.me')) {
                    linkType = 'WhatsApp';
                    linkTypeColor = '#25D366';
                } else if (linkUrl.includes('instagram.com')) {
                    linkType = 'Instagram';
                    linkTypeColor = '#E4405F';
                } else if (linkUrl.includes('facebook.com')) {
                    linkType = 'Facebook';
                    linkTypeColor = '#1877F2';
                } else if (linkUrl.includes('youtube.com')) {
                    linkType = 'YouTube';
                    linkTypeColor = '#FF0000';
                } else if (linkUrl.includes('linkedin.com')) {
                    linkType = 'LinkedIn';
                    linkTypeColor = '#0077B5';
                }
                
                return `
                    <div style="background: var(--bg-dark); padding: 20px; border-radius: 8px; border: 2px solid var(--border-color); transition: all 0.2s;" 
                         onmouseover="this.style.borderColor='var(--primary)'; this.style.transform='translateY(-2px)'"
                         onmouseout="this.style.borderColor='var(--border-color)'; this.style.transform='translateY(0)'">
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                            <div style="background: var(--bg-light); padding: 15px; border-radius: 10px; border: 2px solid ${linkTypeColor};">
                                <i class="${iconClass}" style="color: ${linkTypeColor}; font-size: 2rem;"></i>
                            </div>
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px; flex-wrap: wrap;">
                                    <span style="color: var(--text); font-weight: 600; font-size: 1.1rem;">${linkTitle}</span>
                                    <span style="background: ${linkTypeColor}; color: white; padding: 4px 10px; border-radius: 5px; font-size: 0.75rem; font-weight: bold;">${linkType}</span>
                                </div>
                                <div style="color: var(--text-dark); font-size: 0.9rem; word-break: break-all; margin-bottom: 5px;">${linkUrl}</div>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                            <div>
                                <div style="color: ${linkTypeColor}; font-weight: bold; font-size: 1.8rem; margin-bottom: 3px;">${clickCount.toLocaleString()}</div>
                                <div style="color: var(--text-dark); font-size: 0.75rem;">Total de Cliques</div>
                                <div style="color: var(--text-dark); font-size: 0.7rem; margin-top: 3px; opacity: 0.7;">${clickCountPeriod} no período</div>
                            </div>
                            <div>
                                <div style="color: var(--text-dark); font-size: 0.85rem; margin-bottom: 3px;">Primeiro clique:</div>
                                <div style="color: var(--text); font-size: 0.85rem; font-weight: 500;">${firstClick}</div>
                            </div>
                            <div>
                                <div style="color: var(--text-dark); font-size: 0.85rem; margin-bottom: 3px;">ltimo clique:</div>
                                <div style="color: var(--text); font-size: 0.85rem; font-weight: 500;">${lastClick}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('') + '</div>';
        }
        
        contentEl.innerHTML += linksHTML;
        
        // Renderizar gráfico de performance
        if (performance.length > 0 && typeof Chart !== 'undefined') {
            const ctx = document.getElementById('performance-chart');
            if (ctx) {
                // Destruir gráfico anterior se existir
                if (performanceChart) {
                    performanceChart.destroy();
                }
                
                const labels = performance.map(p => {
                    const date = new Date(p.date);
                    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                });
                
                performanceChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Visualizações',
                            data: performance.map(p => parseInt(p.views) || 0),
                            borderColor: 'rgb(255, 199, 0)',
                            backgroundColor: 'rgba(255, 199, 0, 0.1)',
                            tension: 0.4,
                            fill: true
                        }, {
                            label: 'Cliques',
                            data: performance.map(p => parseInt(p.clicks) || 0),
                            borderColor: 'rgb(255, 255, 255)',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                labels: { color: 'var(--text)' }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: { color: 'var(--text-dark)' },
                                grid: { color: 'rgba(255, 255, 255, 0.1)' }
                            },
                            x: {
                                ticks: { color: 'var(--text-dark)' },
                                grid: { color: 'rgba(255, 255, 255, 0.1)' }
                            }
                        }
                    }
                });
            }
        }
        
        // Renderizar gráfico de distribuição de cliques
        const ctx2 = document.getElementById('links-distribution-chart');
        if (ctx2 && typeof Chart !== 'undefined') {
            // Destruir gráfico anterior se existir
            if (linksChart) {
                linksChart.destroy();
            }
            
            // Filtrar links com cliques no período e pegar top 10
            const linksWithClicks = links.filter(l => {
                const periodClicks = parseInt(l.click_count_period) || 0;
                const totalClicks = parseInt(l.click_count) || 0;
                return periodClicks > 0 || totalClicks > 0;
            })
            .sort((a, b) => {
                // Ordenar por cliques no período primeiro, depois por total
                const aPeriod = parseInt(a.click_count_period) || 0;
                const bPeriod = parseInt(b.click_count_period) || 0;
                if (aPeriod !== bPeriod) return bPeriod - aPeriod;
                return (parseInt(b.click_count) || 0) - (parseInt(a.click_count) || 0);
            })
            .slice(0, 10);
            
            if (linksWithClicks.length === 0) {
                ctx2.parentElement.innerHTML = '<p style="color: var(--text-dark); text-align: center; padding: 20px; margin: 0;">Ainda não há cliques registrados em nenhum link para exibir no gráfico.</p>';
            } else {
                linksChart = new Chart(ctx2, {
                    type: 'bar',
                    data: {
                        labels: linksWithClicks.map(l => {
                            const title = l.title || 'Sem título';
                            return title.length > 20 ? title.substring(0, 20) + '...' : title;
                        }),
                        datasets: [{
                            label: 'Cliques no Período',
                            data: linksWithClicks.map(l => parseInt(l.click_count_period) || 0),
                            backgroundColor: 'rgba(255, 199, 0, 0.8)',
                            borderColor: 'rgb(255, 199, 0)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: { color: 'var(--text-dark)' },
                                grid: { color: 'rgba(255, 255, 255, 0.1)' }
                            },
                            x: {
                                ticks: { color: 'var(--text-dark)', maxRotation: 45, minRotation: 45 },
                                grid: { display: false }
                            }
                        }
                    }
                });
            }
        }
        
        // Adicionar tabela de histórico recente
        if (recentClicks.length > 0) {
            const historyHTML = `
                <div style="margin-bottom: 30px;">
                    <h4 style="color: var(--text); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-history"></i> Histórico Recente de Cliques (ltimos ${recentClicks.length})
                    </h4>
                    <div style="background: var(--bg-dark); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <th style="padding: 10px; text-align: left; color: var(--text); font-weight: 600;">Data/Hora</th>
                                    <th style="padding: 10px; text-align: left; color: var(--text); font-weight: 600;">Link</th>
                                    <th style="padding: 10px; text-align: left; color: var(--text); font-weight: 600;">Tipo</th>
                                    <th style="padding: 10px; text-align: left; color: var(--text); font-weight: 600;">URL</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${recentClicks.map(click => {
                                    const clickDate = new Date(click.created_at).toLocaleString('pt-BR', { 
                                        day: '2-digit', 
                                        month: '2-digit', 
                                        year: 'numeric', 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    });
                                    const linkTitle = click.title || 'Sem título';
                                    const linkUrl = click.url || 'N/A';
                                    
                                    let linkType = 'Outro';
                                    if (linkUrl.includes('whatsapp.com') || linkUrl.includes('wa.me')) linkType = 'WhatsApp';
                                    else if (linkUrl.includes('instagram.com')) linkType = 'Instagram';
                                    else if (linkUrl.includes('facebook.com')) linkType = 'Facebook';
                                    else if (linkUrl.includes('youtube.com')) linkType = 'YouTube';
                                    else if (linkUrl.includes('linkedin.com')) linkType = 'LinkedIn';
                                    
                                    return `
                                        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                            <td style="padding: 10px; color: var(--text-dark); font-size: 0.9rem;">${clickDate}</td>
                                            <td style="padding: 10px; color: var(--text);">${linkTitle}</td>
                                            <td style="padding: 10px;"><span style="background: var(--primary); color: var(--bg-dark); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">${linkType}</span></td>
                                            <td style="padding: 10px;"><a href="${linkUrl}" target="_blank" style="color: var(--primary); text-decoration: none; font-size: 0.85rem; word-break: break-all;">${linkUrl.length > 40 ? linkUrl.substring(0, 40) + '...' : linkUrl}</a></td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            contentEl.innerHTML += historyHTML;
        }
    }
    
    // Função para mostrar detalhes de analytics de um perfil específico
    window.showProfileAnalytics = async function(userId, displayName, period = '30') {
        /* console.log removed (encoding) */
        
        const modal = document.getElementById('profile-analytics-modal');
        const titleEl = document.getElementById('profile-analytics-title');
        const contentEl = document.getElementById('profile-analytics-content');
        const periodSelector = document.getElementById('analytics-period-selector');
        
        if (!modal) {
            console.error('O Modal não encontrado!');
            alert('Erro: Modal não encontrado. Verifique o console.');
            return;
        }
        
        if (!titleEl || !contentEl) {
            console.error('O Elementos do modal não encontrados!');
            return;
        }
        
        // Guardar userId atual
        currentAnalyticsUserId = userId;
        
        // Mostrar modal imediatamente
        console.log(displayName);
        titleEl.textContent = `Analytics: ${displayName}`;
        contentEl.innerHTML = '<p style="color: var(--text-dark); text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Carregando detalhes...</p>';
        
        // Configurar seletor de período
        if (periodSelector) {
            periodSelector.value = period;
            // Remover listeners antigos
            periodSelector.replaceWith(periodSelector.cloneNode(true));
            const newSelector = document.getElementById('analytics-period-selector');
            newSelector.addEventListener('change', async (e) => {
                const newPeriod = e.target.value;
                if (currentAnalyticsUserId) {
                    contentEl.innerHTML = '<p style="color: var(--text-dark); text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Carregando dados do período selecionado...</p>';
                    try {
                        const details = await loadAnalyticsWithPeriod(currentAnalyticsUserId, newPeriod);
                        renderCompleteAnalytics(details, newPeriod);
                    } catch (error) {
                        console.error('Erro ao carregar analytics:', error);
                        contentEl.innerHTML = '<p style="color: var(--danger); text-align: center; padding: 20px;">Erro ao carregar dados. Tente novamente.</p>';
                    }
                }
            });
        }
        
        // Forçar exibição do modal
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevenir scroll
        
        /* console.log removed (encoding) */
        
        try {
            /* console.log removed (encoding) */
            const details = await loadAnalyticsWithPeriod(userId, period);
            console.log(details);
            
            if (!details) {
                console.error('O Detalhes é null ou undefined');
                contentEl.innerHTML = `
                    <div style="color: var(--text-dark); text-align: center; padding: 20px;">
                        <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 10px; display: block; color: var(--primary);"></i>
                        <p>Nenhum dado disponível para este perfil.</p>
                        <small style="opacity: 0.7;">Este perfil pode não ter visualizações ou cliques registrados ainda.</small>
                    </div>
                `;
                return;
            }
            
            // Validar estrutura básica dos dados
            if (typeof details !== 'object' || Array.isArray(details)) {
                console.error('O Detalhes não é um objeto válido:', typeof details, details);
                contentEl.innerHTML = `
                    <div style="color: var(--danger); text-align: center; padding: 20px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                        <p>Erro: Formato de dados inválido recebido da API.</p>
                        <small style="opacity: 0.7;">Por favor, verifique o console para mais detalhes.</small>
                    </div>
                `;
                return;
            }
            
            // Validar se tem pelo menos stats ou links (mesmo que vazios)
            if (!details.stats && !details.links) {
                console.warn('Detalhes recebidos mas sem estrutura esperada:', details);
                contentEl.innerHTML = `
                    <div style="color: var(--text-dark); text-align: center; padding: 20px;">
                        <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 10px; display: block; color: var(--primary);"></i>
                        <p>Este perfil ainda não possui dados de analytics.</p>
                        <small style="opacity: 0.7;">Os dados aparecerão quando houver visualizações ou cliques no perfil.</small>
                    </div>
                `;
                return;
            }
            
            // Renderizar analytics completo com gráficos
            renderCompleteAnalytics(details, period);
        } catch (error) {
            console.error('O Erro ao carregar detalhes do perfil:', error);
            contentEl.innerHTML = `
                <div style="color: var(--danger); text-align: center; padding: 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    <p style="margin: 0 0 10px 0;">Erro ao carregar detalhes.</p>
                    <small style="display: block; opacity: 0.7;">${error.message || 'Erro desconhecido'}</small>
                    <button onclick="window.showProfileAnalytics('${userId}', '${displayName.replace(/'/g, "\\'")}', '${period}')"
                            class="btn btn-primary" style="margin-top: 15px; padding: 10px 20px; background: var(--primary); color: var(--bg-dark); border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-redo"></i> Tentar Novamente
                    </button>
                </div>
            `;
        }
    };

    window.showAdminUserDashboard = async function(userId, displayName) {
        const modal = document.getElementById('admin-user-dashboard-modal');
        const titleEl = document.getElementById('admin-user-dashboard-title');
        const contentEl = document.getElementById('admin-user-dashboard-content');
        if (!modal || !titleEl || !contentEl) return;
        titleEl.textContent = 'Dashboard: ' + (displayName || 'Usuário');
        contentEl.innerHTML = '<p style="color: var(--text-dark); text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Carregando dashboard...</p>';
        modal.style.display = 'flex';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        try {
            const res = await fetch(API_URL + '/users/' + encodeURIComponent(userId) + '/dashboard', {
                headers: HEADERS
            });
            if (!res.ok) throw new Error(res.status === 404 ? 'Usuário não encontrado.' : 'Erro ao carregar dados.');
            const d = await res.json();
            const fmtDate = (x) => x ? new Date(x).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nunca';
            const tagCode = (d.user && d.user.tag_code) ? String(d.user.tag_code).trim() : ((d.user && d.user.profile_slug) ? String(d.user.profile_slug).trim() : '');
            const cardUrl = tagCode ? ('https://tag.conectaking.com.br/' + tagCode) : '';
            const lastLogin = d.logins && d.logins.last_at ? new Date(d.logins.last_at).getTime() : 0;
            const lastView = d.card_views && d.card_views.last_at ? new Date(d.card_views.last_at).getTime() : 0;
            const lastClick = d.link_clicks && d.link_clicks.last_at ? new Date(d.link_clicks.last_at).getTime() : 0;
            const lastActivityMs = Math.max(lastLogin, lastView, lastClick);
            const daysSince = lastActivityMs ? Math.floor((Date.now() - lastActivityMs) / (24 * 60 * 60 * 1000)) : null;
            var statusLabel = 'Sem atividade', statusColor = 'var(--text-dark)';
            if (daysSince !== null) {
                if (daysSince === 0) { statusLabel = 'Ativo hoje'; statusColor = '#22c55e'; }
                else if (daysSince === 1) { statusLabel = 'Ativo ontem'; statusColor = '#22c55e'; }
                else if (daysSince <= 7) { statusLabel = 'Ativo (últimos 7 dias)'; statusColor = '#22c55e'; }
                else if (daysSince <= 30) { statusLabel = 'Pouco ativo'; statusColor = '#eab308'; }
                else { statusLabel = 'Inativo'; statusColor = '#ef4444'; }
            }
            const memberSince = (d.user && d.user.created_at) ? new Date(d.user.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
            const email = (d.user && d.user.email) ? String(d.user.email).replace(/</g, '&lt;').replace(/"/g, '&quot;') : '';
            var html = '<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; margin-bottom: 16px; padding: 12px 0; border-bottom: 1px solid var(--border-color);">';
            html += '<span style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; background: rgba(0,0,0,0.3); color: ' + statusColor + '"><span style="width: 8px; height: 8px; border-radius: 50%; background: ' + statusColor + ';"></span>' + statusLabel + '</span>';
            if (daysSince !== null && daysSince > 0) html += '<span style="font-size: 0.8rem; color: var(--text-dark);">ltima atividade há ' + daysSince + ' dia(s)</span>';
            if (memberSince) html += '<span style="font-size: 0.8rem; color: var(--text-dark);"><i class="fas fa-calendar-plus"></i> Membro desde ' + memberSince + '</span>';
            if (email) html += '<span style="font-size: 0.8rem; color: var(--text-dark);"><i class="fas fa-envelope"></i> ' + email + '</span>';
            html += '</div>';
            html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px;">';
            html += '<div style="background: var(--card-bg, #1c1c21); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color);"><div style="font-size: 0.75rem; color: var(--text-dark); margin-bottom: 4px;"><i class="fas fa-sign-in-alt"></i> Logins no sistema</div><div style="font-size: 1.5rem; font-weight: 800; color: var(--primary);">' + ((d.logins && d.logins.total) || 0) + '</div><div style="font-size: 0.7rem; color: var(--text-dark); margin-top: 4px;">ltimo: ' + fmtDate(d.logins && d.logins.last_at) + '</div></div>';
            html += '<div style="background: var(--card-bg); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color);"><div style="font-size: 0.75rem; color: var(--text-dark); margin-bottom: 4px;"><i class="fas fa-id-card"></i> Acessos ao cartão</div><div style="font-size: 1.5rem; font-weight: 800; color: #22c55e;">' + ((d.card_views && d.card_views.total) || 0) + '</div><div style="font-size: 0.7rem; color: var(--text-dark); margin-top: 4px;">ltimo: ' + fmtDate(d.card_views && d.card_views.last_at) + '</div></div>';
            html += '<div style="background: var(--card-bg); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color);"><div style="font-size: 0.75rem; color: var(--text-dark); margin-bottom: 4px;"><i class="fas fa-link"></i> Cliques em links</div><div style="font-size: 1.5rem; font-weight: 800; color: #3b82f6;">' + ((d.link_clicks && d.link_clicks.total) || 0) + '</div><div style="font-size: 0.7rem; color: var(--text-dark); margin-top: 4px;">ltimo: ' + fmtDate(d.link_clicks && d.link_clicks.last_at) + '</div></div>';
            html += '</div>';
            html += '<div style="margin-bottom: 16px;"><strong style="font-size: 0.85rem;"><i class="fas fa-external-link-alt"></i> Link do cartão:</strong> ';
            if (cardUrl) {
                html += '<a href="' + cardUrl.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener" style="color: var(--primary); word-break: break-all;">' + cardUrl.replace(/</g, '&lt;') + '</a>';
                html += ' <button type="button" class="btn-copy-card-link" data-url="' + cardUrl.replace(/"/g, '&quot;') + '" style="margin-left: 8px; padding: 4px 10px; font-size: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text); cursor: pointer;" title="Copiar link"><i class="fas fa-copy"></i> Copiar</button>';
            } else html += '<span style="color: var(--text-dark);">—</span>';
            html += '</div>';
            if (d.logins && d.logins.last_detail) {
                const last = d.logins.last_detail;
                const uaEsc = (last.user_agent || '').replace(/</g, '&lt;').replace(/"/g, '&quot;');
                const uaShort = last.user_agent ? (last.user_agent.length > 60 ? last.user_agent.slice(0, 60) + '—' : last.user_agent).replace(/</g, '&lt;') : '';
                html += '<div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 0.8rem;"><strong><i class="fas fa-key"></i> ltimo login:</strong> ' + fmtDate(last.created_at) + (last.ip_address ? ' · IP: ' + String(last.ip_address).replace(/</g, '&lt;') : '') + (last.user_agent ? ' · <span style="word-break: break-all;" title="' + uaEsc + '">' + uaShort + '</span>' : '') + '</div>';
            }
            if (d.by_ip && d.by_ip.length > 0) {
                html += '<h5 style="margin: 16px 0 8px 0; font-size: 1rem;"><i class="fas fa-globe"></i> Acessos por IP / origem</h5><div style="max-height: 220px; overflow-y: auto;"><table style="width: 100%; font-size: 0.8rem; border-collapse: collapse;"><thead><tr style="border-bottom: 1px solid var(--border-color);"><th style="text-align: left; padding: 8px;">IP</th><th style="text-align: center; padding: 8px;">Visualizações</th><th style="text-align: center; padding: 8px;">Cliques</th><th style="text-align: left; padding: 8px;">ltimo</th><th style="text-align: left; padding: 8px;">User-Agent (origem)</th></tr></thead><tbody>';
                d.by_ip.forEach(function(r) {
                    const ua = (r.user_agent || '').trim();
                    const uaShort = ua.length > 45 ? ua.slice(0, 45) + '—' : ua;
                    const uaTitle = ua ? ua.replace(/</g, '&lt;').replace(/"/g, '&quot;') : '';
                    html += '<tr style="border-bottom: 1px solid rgba(255,255,255,0.06);"><td style="padding: 8px;">' + (r.ip_address || '-').replace(/</g, '&lt;') + '</td><td style="text-align: center;">' + (r.views || 0) + '</td><td style="text-align: center;">' + (r.clicks || 0) + '</td><td style="padding: 8px;">' + fmtDate(r.last_at) + '</td><td style="padding: 8px; max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="' + uaTitle + '">' + (uaShort || '-').replace(/</g, '&lt;') + '</td></tr>';
                });
                html += '</tbody></table></div>';
            }
            if (d.by_link && d.by_link.length > 0) {
                html += '<h5 style="margin: 16px 0 8px 0; font-size: 1rem;"><i class="fas fa-mouse-pointer"></i> Cliques por link (Instagram, WhatsApp, etc.)</h5><div style="max-height: 260px; overflow-y: auto;"><table style="width: 100%; font-size: 0.8rem; border-collapse: collapse;"><thead><tr style="border-bottom: 1px solid var(--border-color);"><th style="text-align: left; padding: 8px;">Tipo / Título</th><th style="text-align: center; padding: 8px;">Cliques</th><th style="text-align: left; padding: 8px;">ltimo</th><th style="text-align: left; padding: 8px;">Link</th></tr></thead><tbody>';
                d.by_link.forEach(function(r) {
                    const tipo = (r.item_type || 'link').toLowerCase().replace(/</g, '&lt;');
                    const titulo = (r.title || tipo).replace(/</g, '&lt;').replace(/"/g, '&quot;');
                    const dest = (r.destination_url || '').trim();
                    const destEsc = dest.replace(/</g, '&lt;').replace(/"/g, '&quot;');
                    var linkCell = '—';
                    if (dest) linkCell = '<a href="' + destEsc + '" target="_blank" rel="noopener" style="color: var(--primary); max-width: 180px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + destEsc + '">Abrir</a>';
                    html += '<tr style="border-bottom: 1px solid rgba(255,255,255,0.06);"><td style="padding: 8px;"><span style="color: var(--text-dark);">' + tipo + '</span> · ' + titulo + '</td><td style="text-align: center;">' + (r.clicks || 0) + '</td><td style="padding: 8px;">' + fmtDate(r.last_at) + '</td><td style="padding: 8px;">' + linkCell + '</td></tr>';
                });
                html += '</tbody></table></div>';
            }
            if ((!d.by_ip || d.by_ip.length === 0) && (!d.by_link || d.by_link.length === 0) && (!d.card_views || d.card_views.total === 0))
                html += '<p style="color: var(--text-dark); font-size: 0.9rem;">Nenhum acesso ao cartão ou clique em links registrado ainda.</p>';
            contentEl.innerHTML = html;
            contentEl.querySelectorAll('.btn-copy-card-link').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var u = this.getAttribute('data-url');
                    if (u && navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(u).then(function() { btn.innerHTML = '<i class="fas fa-check"></i> Copiado!'; setTimeout(function() { btn.innerHTML = '<i class="fas fa-copy"></i> Copiar'; }, 2000); }).catch(function() { btn.textContent = 'Erro'; });
                    }
                });
            });
        } catch (err) {
            contentEl.innerHTML = '<p style="color: var(--danger); text-align: center; padding: 20px;">' + (err.message || 'Erro ao carregar dashboard.').replace(/</g, '&lt;') + '</p>';
        }
    };

    function closeAdminUserDashboardModal() {
        const modal = document.getElementById('admin-user-dashboard-modal');
        if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); document.body.style.overflow = ''; }
    }
    document.getElementById('close-admin-user-dashboard-btn')?.addEventListener('click', closeAdminUserDashboardModal);
    document.getElementById('admin-user-dashboard-modal')?.addEventListener('click', function(e) {
        if (e.target === this) closeAdminUserDashboardModal();
    });
    document.addEventListener('keydown', function adminDashboardEsc(e) {
        if (e.key !== 'Escape') return;
        var m = document.getElementById('admin-user-dashboard-modal');
        if (m && m.classList.contains('active')) { closeAdminUserDashboardModal(); }
    });

    function renderStats(stats) {
        if (!stats || typeof stats !== 'object') stats = {};
        // Valores padrão caso não existam
        const totalUsers = stats.totalUsers || 0;
        const totalCodes = stats.totalCodes || 0;
        const claimedCodes = stats.claimedCodes || 0;
        const totalViews = stats.totalViews || 0;
        const totalClicks = stats.totalClicks || 0;
        
        // Renderizar estatísticas básicas
        document.getElementById('total-users').textContent = totalUsers;
        document.getElementById('total-codes').textContent = totalCodes;
        document.getElementById('claimed-codes').textContent = claimedCodes;
        document.getElementById('total-views').textContent = totalViews;
        document.getElementById('total-clicks').textContent = totalClicks;
        
        // Calcular usuários empresariais (modo empresarial ativo)
        const enterpriseUsers = allUsers.filter(u => 
            u.account_type === 'business_owner' || 
            u.account_type === 'king_corporate' || 
            u.account_type === 'enterprise'
        ).length;
        
        const enterpriseUsersEl = document.getElementById('total-enterprise-users');
        if (enterpriseUsersEl) {
            enterpriseUsersEl.textContent = enterpriseUsers.toLocaleString('pt-BR');
        }
        
        // Calcular e renderizar métricas adicionais
        const codeUsageRate = totalCodes > 0 ? ((claimedCodes / totalCodes) * 100).toFixed(1) : 0;
        const clickThroughRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : 0;
        
        // Renderizar métricas calculadas se os elementos existirem
        const ctrElement = document.getElementById('click-through-rate');
        if (ctrElement) {
            ctrElement.textContent = `${clickThroughRate}%`;
        }
        
        const usageRateElement = document.getElementById('code-usage-rate');
        if (usageRateElement) {
            usageRateElement.textContent = `${codeUsageRate}%`;
        }
        
        // Renderizar valores formatados
        const avgViewsElement = document.getElementById('avg-views-per-user');
        if (avgViewsElement && totalUsers > 0) {
            const avgViews = (totalViews / totalUsers).toFixed(1);
            avgViewsElement.textContent = avgViews;
        }
        
        const avgClicksElement = document.getElementById('avg-clicks-per-user');
        if (avgClicksElement && totalUsers > 0) {
            const avgClicks = (totalClicks / totalUsers).toFixed(1);
            avgClicksElement.textContent = avgClicks;
        }
    }

function renderUsers(users) {
    console.log(users);
    const tableBody = document.querySelector('#users-table tbody');
    const tableContainer = document.getElementById('users-table-container');
    const emptyState = document.getElementById('users-empty-state');
    tableBody.innerHTML = ''; 

    if (!users || users.length === 0) {
        /* console.log removed (encoding) */
        if (tableContainer) tableContainer.style.display = 'none';
        if (emptyState) { emptyState.style.display = 'block'; }
        return;
    }
    if (tableContainer) tableContainer.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    const accountTypeBadges = {
        'adm_principal': `<span class="badge badge-admin">ADM Principal</span>`,
        'abm': `<span class="badge badge-admin">ADM Principal</span>`,
        'basic': `<span class="badge badge-individual">King Start</span>`,
        'premium': `<span class="badge badge-individual">King Prime</span>`,
        'king_base': `<span class="badge badge-individual">King Essential</span>`,
        'king_finance': `<span class="badge badge-individual">King Finance</span>`,
        'king_finance_plus': `<span class="badge badge-individual">King Finance Plus</span>`,
        'king_premium_plus': `<span class="badge badge-individual">King Premium Plus</span>`,
        'king_corporate': `<span class="badge badge-business">King Corporate</span>`,
        'team_member': `<span class="badge badge-team">Membro</span>`,
        // Manter compatibilidade com planos antigos (mapear para novos)
        'free': `<span class="badge badge-free">Free</span>`,
        'individual': `<span class="badge badge-individual">King Start</span>`,
        'individual_com_logo': `<span class="badge badge-individual">King Prime</span>`,
        'business_owner': `<span class="badge badge-business">King Corporate</span>`,
    };

    // Calcular número baseado na página atual (se paginação aplicada)
    const perPage = usersPerPage === 'all' ? users.length : parseInt(usersPerPage);
    const startIndex = usersPerPage === 'all' ? 0 : (currentUsersPage - 1) * perPage;
    
    users.forEach((u, index) => {
        const row = document.createElement('tr');
        const rowNumber = startIndex + index + 1; // Número sequencial considerando paginação

        // calcular dias restantes ou vencidos
        let expirationStatusText = 'N/A';
        let daysLeft = null;
        let daysExpired = null;
        
        if (u.subscription_expires_at) {
            const now = new Date();
            const exp = new Date(u.subscription_expires_at);
            daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
            
            if (daysLeft >= 0) {
                expirationStatusText = `Faltam ${daysLeft} dia(s)`;
            } else {
                daysExpired = Math.abs(daysLeft);
                expirationStatusText = `Vencido há ${daysExpired} dia(s)`;
            }
        }

        // classe de destaque
        // Verificar se é o dono principal (admin principal)
        const isMainOwner = u.is_admin && !u.parent_user_id;
        
        if (isMainOwner) {
            // Dono principal fica amarelo
            row.classList.add('row-yellow');
        } else if (typeof daysLeft === 'number') {
            if (daysLeft > 10) row.classList.add('row-green');
            else if (daysLeft > 0) row.classList.add('row-yellow');
            else row.classList.add('row-red');
        }

        // Checkbox de seleção
        const checkboxCell = document.createElement('td');
        checkboxCell.setAttribute('data-label', '');
        checkboxCell.className = 'td-checkbox';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'user-checkbox';
        checkbox.dataset.userId = u.id;
        checkboxCell.appendChild(checkbox);

        const displayName = (u.display_name || 'N/A').replace(/</g, '&lt;').replace(/"/g, '&quot;');
        row.innerHTML = `
            <td data-label="#" data-col="num"><strong style="color: var(--text-dark);">${rowNumber}</strong></td>
            <td data-label="Nome" data-col="name" class="admin-user-name-cell" data-user-id="${u.id}" data-display-name="${displayName}" style="cursor: pointer; color: var(--primary); text-decoration: underline; font-weight: 600;" title="Ver dashboard completo do usuário">${u.display_name || 'N/A'}</td>
            <td data-label="Email" data-col="email">${u.email}</td>
            <td data-label="Tipo de Conta" data-col="account_type" class="account-type-cell" style="cursor: pointer; user-select: none;" data-user-id="${u.id}" data-user-email="${u.email}" data-account-type="${u.account_type}" data-is-admin="${u.is_admin}" data-subscription-status="${u.subscription_status || ''}" data-expires-at="${u.subscription_expires_at || ''}" data-max-team-invites="${u.max_team_invites}" data-profile-slug="${u.profile_slug || ''}" data-tag-code="${u.tag_code || ''}">${accountTypeBadges[u.account_type] || u.account_type}</td>
            <td data-label="Status Assinatura" data-col="subscription_status">${u.subscription_status || 'N/A'}</td>
            <td data-label="Expira em" data-col="expires_at">${u.subscription_expires_at ? new Date(u.subscription_expires_at).toLocaleDateString('pt-BR') : 'N/A'}</td>
            <td data-label="Status Vencimento" data-col="days_left">
                <span style="color: ${daysLeft !== null && daysLeft < 0 ? '#e74c3c' : daysLeft !== null && daysLeft <= 10 ? '#f39c12' : '#2ecc71'}; font-weight: 600;">
                    ${expirationStatusText}
                </span>
            </td>
            <td data-label="Conta Principal" data-col="parent_email">${u.parent_email || 'N/A'}</td>
            <td data-label="Status Admin" data-col="is_admin">${u.is_admin ? '<span class="badge badge-admin">Sim</span>' : 'Não'}</td>
            <td data-label="Data de Criação" data-col="created_at">${new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
        `;
        
        // Inserir checkbox como primeira célula
        row.insertBefore(checkboxCell, row.firstChild);
        
        tableBody.appendChild(row);
    });
    
    var applyColumnVisibility = window._applyUsersColumnVisibility;
    if (typeof applyColumnVisibility === 'function') applyColumnVisibility();
    
    // Adicionar event listeners para checkboxes
    const userCheckboxes = document.querySelectorAll('.user-checkbox');
    userCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateUserSelectedCount);
    });
    
    // Event listener para selecionar todos
    const selectAllUsersCheckbox = document.getElementById('select-all-users');
    if (selectAllUsersCheckbox) {
        selectAllUsersCheckbox.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.user-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
            updateUserSelectedCount();
        });
    }
    
    // Atualizar contador inicial
    updateUserSelectedCount();
}

function renderCodes(codes) {
    console.log(codes);
    const tableBody = document.querySelector('#codes-table tbody');
    const tableContainer = document.getElementById('codes-table-container');
    const emptyState = document.getElementById('codes-empty-state');
    tableBody.innerHTML = '';
    
    if (!codes || codes.length === 0) {
        /* console.log removed (encoding) */
        if (tableContainer) tableContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        updateCodePagination(0, 0);
        return;
    }
    if (tableContainer) tableContainer.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    
    const perPage = codesPerPage === 'all' ? codes.length : parseInt(codesPerPage);
    const startIndex = codesPerPage === 'all' ? 0 : (currentCodesPage - 1) * perPage;
    
    codes.forEach((code, index) => {
        const rowNumber = startIndex + index + 1;
        const row = document.createElement('tr');
        const createdDate = new Date(code.created_at);
        const now = new Date();
        const daysSinceCreation = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
        let timeSinceCreation = daysSinceCreation === 0 ? 'Hoje' : daysSinceCreation === 1 ? '1 dia atrás' : daysSinceCreation < 30 ? `${daysSinceCreation} dias atrás` : daysSinceCreation < 365 ? `${Math.floor(daysSinceCreation / 30)} ${Math.floor(daysSinceCreation / 30) === 1 ? 'mês' : 'meses'} atrás` : `${Math.floor(daysSinceCreation / 365)} ${Math.floor(daysSinceCreation / 365) === 1 ? 'ano' : 'anos'} atrás`;
        const usedDate = code.claimed_at ? new Date(code.claimed_at).toLocaleDateString('pt-BR') : 'N/A';
        
        let daysLeft = null;
        let expirationStatusText = 'N/A';
        let expiresAtFormatted = 'N/A';
        if (code.expires_at) {
            const exp = new Date(code.expires_at);
            expiresAtFormatted = exp.toLocaleDateString('pt-BR');
            daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
            if (daysLeft >= 0) {
                expirationStatusText = daysLeft === 0 ? 'Vence hoje' : `Faltam ${daysLeft} dia(s)`;
            } else {
                expirationStatusText = `Vencido há ${Math.abs(daysLeft)} dia(s)`;
            }
        }
        
        if (daysLeft !== null) {
            if (daysLeft < 0) row.classList.add('row-red');
            else if (daysLeft <= 30) row.classList.add('row-yellow');
            else row.classList.add('row-green');
        } else {
            row.classList.add('row-green');
        }
        
        const statusColor = daysLeft !== null && daysLeft < 0 ? '#e74c3c' : daysLeft !== null && daysLeft <= 30 ? '#f39c12' : '#2ecc71';
        
        row.innerHTML = `
            <td class="td-checkbox"><input type="checkbox" class="code-checkbox" data-code="${code.code}"></td>
            <td data-label="#" data-col="num"><strong style="color: var(--text-dark); font-weight: 600;">${rowNumber}</strong></td>
            <td data-label="Código" data-col="code" class="code-cell">
                <strong class="code-value">${String(code.code || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')}</strong>
                <button type="button" class="copy-link-btn copy-code-btn" data-copy-code="${String(code.code || '').replace(/"/g, '&quot;')}" title="Copiar código para enviar ao cliente">Copiar</button>
            </td>
            <td data-label="Link" data-col="link" class="link-cell">
                <a href="https://tag.conectaking.com.br/${code.code}" target="_blank" class="code-link">https://tag.conectaking.com.br/${code.code}</a>
                <button type="button" class="copy-link-btn" data-copy-link="https://tag.conectaking.com.br/${code.code}">Copiar</button>
            </td>
            <td data-label="Status" data-col="status" class="${code.is_claimed ? 'status-claimed' : 'status-available'}">${code.is_claimed ? 'Utilizado' : 'Disponível'}</td>
            <td data-label="Status Vencimento" data-col="expiration_status"><span style="color: ${statusColor}; font-weight: 600;">${expirationStatusText}</span></td>
            <td data-label="Expira em" data-col="expires_at">${expiresAtFormatted}</td>
            <td data-label="Utilizado por" data-col="claimed_by">${code.claimed_by_email || 'N/A'}</td>
            <td data-label="Data de Utilização" data-col="claimed_at">${usedDate}</td>
            <td data-label="Gerado por" data-col="generated_by">${code.generated_by_email || 'Admin'}</td>
            <td data-label="Data de Criação" data-col="created_at">${new Date(code.created_at).toLocaleDateString('pt-BR')}</td>
            <td data-label="Tempo desde Criação" data-col="time_since" style="color: var(--text-dark);">${timeSinceCreation}</td>
        `;
        tableBody.appendChild(row);
    });
    
    const checkboxes = tableBody.querySelectorAll('.code-checkbox');
    checkboxes.forEach(checkbox => { checkbox.addEventListener('change', updateSelectedCount); });
    
    var applyColsCodes = window._applyCodesColumnVisibility;
    if (typeof applyColsCodes === 'function') applyColsCodes();
}

    const usersTable = document.querySelector('#users-table');
if (usersTable) {
    usersTable.addEventListener('click', e => {
        const nameCell = e.target.closest('.admin-user-name-cell');
        if (nameCell) {
            e.preventDefault();
            const userId = nameCell.getAttribute('data-user-id');
            const displayName = (nameCell.getAttribute('data-display-name') || 'Usuário').replace(/&quot;/g, '"').replace(/&lt;/g, '<');
            if (userId && window.showAdminUserDashboard) window.showAdminUserDashboard(userId, displayName);
            return;
        }
        // Verificar se clicou na célula "Tipo de Conta" ou no badge dentro dela
        const accountTypeCell = e.target.closest('.account-type-cell');
        if (accountTypeCell) {
            // Abrir modal de gerenciamento ao clicar na coluna "Tipo de Conta"
            document.getElementById('modal-title').textContent = `Gerenciar: ${accountTypeCell.dataset.userEmail}`;
            document.getElementById('modal-user-id').value = accountTypeCell.dataset.userId;
            
            document.getElementById('modal-user-email').value = accountTypeCell.dataset.userEmail;
            document.getElementById('modal-max-invites').value = accountTypeCell.dataset.maxTeamInvites;

            // Mapear account_type antigo para novo ao exibir no dropdown
            const accountType = accountTypeCell.dataset.accountType;
            const mappedAccountType = mapAccountTypeForDisplay(accountType);
            document.getElementById('modal-account-type').value = mappedAccountType;
            document.getElementById('modal-is-admin').value = accountTypeCell.dataset.isAdmin;
            const rawStatus = accountTypeCell.dataset.subscriptionStatus || '';
            const statusForModal = (rawStatus === 'pre_sale_trial' || rawStatus === 'expired_trial') ? 'active' : rawStatus;
            document.getElementById('modal-subscription-status').value = statusForModal;
            
            const expiresAtISO = accountTypeCell.dataset.expiresAt;
            if (expiresAtISO) {
                const date = new Date(expiresAtISO);
                document.getElementById('modal-expires-at').value = date.toISOString().split('T')[0];
            } else {
                document.getElementById('modal-expires-at').value = '';
            }

            const slugEl = document.getElementById('modal-profile-slug');
            if (slugEl) slugEl.value = accountTypeCell.dataset.profileSlug || '';
            const actEl = document.getElementById('modal-activation-code');
            if (actEl) actEl.value = accountTypeCell.dataset.tagCode || '';
            accountTypeSelect.dispatchEvent(new Event('change'));
            userModal.classList.add('active');
        }
        
        // Manter compatibilidade com botão "Gerenciar" caso ainda exista em algum lugar
        if (e.target.classList.contains('manage-user-btn')) {
            const button = e.target;
            document.getElementById('modal-title').textContent = `Gerenciar: ${button.dataset.email}`;
            document.getElementById('modal-user-id').value = button.dataset.id;
            
            document.getElementById('modal-user-email').value = button.dataset.email;
            document.getElementById('modal-max-invites').value = button.dataset.maxTeamInvites;
            const slugElBtn = document.getElementById('modal-profile-slug');
            if (slugElBtn) slugElBtn.value = button.dataset.profileSlug || '';
            const actElBtn = document.getElementById('modal-activation-code');
            if (actElBtn) actElBtn.value = button.dataset.tagCode || '';

            // Mapear account_type antigo para novo ao exibir no dropdown
            const accountType = button.dataset.accountType;
            const mappedAccountType = mapAccountTypeForDisplay(accountType);
            document.getElementById('modal-account-type').value = mappedAccountType;
            document.getElementById('modal-is-admin').value = button.dataset.isAdmin;
            const rawStatusBtn = button.dataset.subscriptionStatus || '';
            const statusForModalBtn = (rawStatusBtn === 'pre_sale_trial' || rawStatusBtn === 'expired_trial') ? 'active' : rawStatusBtn;
            document.getElementById('modal-subscription-status').value = statusForModalBtn;
            
            const expiresAtISO = button.dataset.expiresAt;
            if (expiresAtISO) {
                const date = new Date(expiresAtISO);
                document.getElementById('modal-expires-at').value = date.toISOString().split('T')[0];
            } else {
                document.getElementById('modal-expires-at').value = '';
            }

            accountTypeSelect.dispatchEvent(new Event('change'));
            userModal.classList.add('active');
        }
    });
}


        closeModalBtn.addEventListener('click', () => userModal.classList.remove('active'));
    userModal.addEventListener('click', e => {
        if (e.target === userModal) userModal.classList.remove('active');
    });

    accountTypeSelect.addEventListener('change', () => {
    const maxInvitesGroup = document.getElementById('max-invites-group');
    if (accountTypeSelect.value === 'king_corporate') {
        maxInvitesGroup.style.display = 'block';
    } else {
        maxInvitesGroup.style.display = 'none';
        }
});

saveUserBtn.addEventListener('click', async () => {
    const id = document.getElementById('modal-user-id').value;
    const email = document.getElementById('modal-user-email').value; 
    let accountType = document.getElementById('modal-account-type').value;
    const isAdmin = document.getElementById('modal-is-admin').value === 'true';
    const subscriptionStatus = document.getElementById('modal-subscription-status').value;
    const expiresAt = document.getElementById('modal-expires-at').value;
     const maxTeamInvites = document.getElementById('modal-max-invites').value;
    const activationCode = (document.getElementById('modal-activation-code')?.value || '').trim();

    // Mapear account_type para o formato correto (já está no formato novo, então manter)
    // accountType já está no formato correto (basic, premium, king_corporate, etc.)

    try {
        const response = await fetch(`${API_URL}/users/${id}/manage`, {
            method: 'PUT',
            headers: HEADERS,
            body: JSON.stringify({ 
                email, 
                accountType, 
                isAdmin,
                subscriptionStatus, 
                expiresAt,
                maxTeamInvites,
                activationCode
            })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        alert('Usuário atualizado com sucesso!');
        userModal.classList.remove('active');
        loadDashboard(); 
    } catch (error) {
        alert(`Erro ao salvar: ${error.message}`);
    }
});

const deleteUserBtn = document.getElementById('delete-user-btn');
if (deleteUserBtn) {
    deleteUserBtn.addEventListener('click', async () => {
        const id = document.getElementById('modal-user-id').value;
        const email = document.getElementById('modal-user-email').value;

        if (confirm(`ATENÇÃO!\n\nVocê tem certeza que deseja deletar permanentemente o usuário '${email}'?\n\nTODOS os dados associados a esta conta (perfil, links, analytics) serão perdidos. Esta ação é IRREVERSÍVEL.`)) {
            try {
                const response = await fetch(`${API_URL}/users/${id}`, {
                    method: 'DELETE',
                    headers: HEADERS
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                
                alert(result.message);
                userModal.classList.remove('active');
                loadDashboard();

            } catch (error) {
                alert(`Erro ao deletar: ${error.message}`);
            }
        }
    });
}


    document.getElementById('generate-code-btn').addEventListener('click', async () => {
    if (!confirm('Deseja gerar um novo código aleatório?')) {
        return;
    }
    try {
        const response = await fetch(`${API_URL}/generate-code`, { 
            method: 'POST', 
            headers: HEADERS 
        });
        const result = await response.json();
        
        if (!response.ok) {
            const msg = result.message || (result.error && result.error.message) || `Erro ${response.status}`;
            throw new Error(msg);
        }

        const codeVal = result.code || (result.data && result.data.code);
        if (!codeVal) {
            throw new Error('Resposta da API sem código. Tente novamente.');
        }
        if (typeof window.copyToClipboard === 'function') {
            window.copyToClipboard(codeVal, null, true);
        } else {
            try { await navigator.clipboard.writeText(codeVal); } catch (_) {}
        }
        alert(`Novo código gerado e copiado:\n\n${codeVal}\n\nCole no cadastro do cliente ou envie para ele.`);
        loadDashboard(); 

    } catch (error) {
        alert(`Erro ao gerar código: ${error.message}`);
    }
});

    // --- EVENT LISTENERS PARA GERA—fO DE C"DIGOS ---
    
    // Geração em lote com prefixo
    const generateBatchBtn = document.getElementById('generate-batch-btn');
    if (generateBatchBtn) {
        generateBatchBtn.addEventListener('click', async () => {
            const prefix = document.getElementById('prefix-input').value.trim();
            const count = document.getElementById('batch-count').value;
            
            if (!prefix) {
                alert('Por favor, digite um prefixo.');
                return;
            }
            
            if (!count || count < 1 || count > 100) {
                alert('Por favor, digite um número entre 1 e 100.');
                return;
            }

            if (prefix.length > 8) {
                alert('O prefixo deve ter no máximo 8 caracteres.');
                return;
            }

            if (!confirm(`Deseja gerar ${count} códigos com prefixo "${prefix}"?`)) {
                return;
            }

            try {
                // Usar novo endpoint de geração em lote
                const response = await fetch(`${API_URL}/codes/generate-batch`, {
                    method: 'POST',
                    headers: HEADERS,
                    body: JSON.stringify({ prefix, count: parseInt(count), expiresAt: null })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    const em = error.message || (error.error && error.error.message) || 'Erro ao gerar códigos';
                    throw new Error(em);
                }
                
                const result = await response.json();
                alert(result.message || `${count} códigos com prefixo "${prefix}" gerados com sucesso!`);
                
                // Limpar inputs
                document.getElementById('prefix-input').value = '';
                document.getElementById('batch-count').value = '10';
                
                await loadCodes();
            } catch (error) {
                console.error('Erro detalhado:', error);
                alert(`Erro ao gerar códigos em lote: ${error.message}`);
            }
        });
    }


    // Criação manual
    const createManualCodeBtn = document.getElementById('create-manual-code-btn');
    if (createManualCodeBtn) {
        createManualCodeBtn.addEventListener('click', async () => {
        const input = document.getElementById('custom-code-input');
        const customCode = input.value.trim();

        if (!customCode) {
            alert('Por favor, digite um código.');
            return;
        }
        if (customCode.length > 32 || customCode.includes(' ')) {
            alert('Código personalizado inválido. Deve ter no máximo 32 caracteres e não conter espaços.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/codes/generate-manual`, {
                method: 'POST',
                headers: HEADERS,
                body: JSON.stringify({ customCode })
            });

                // Verificar se a resposta é JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const textResponse = await response.text();
                    console.error('Resposta não é JSON:', textResponse);
                    throw new Error('Servidor retornou resposta inválida. Verifique se a API está funcionando.');
                }

            const result = await response.json();

            if (!response.ok) {
                    const em = result.message || (result.error && result.error.message) || `Erro do servidor: ${response.status}`;
                    throw new Error(em);
            }

            input.value = '';
            if (customCode && typeof window.copyToClipboard === 'function') {
                window.copyToClipboard(customCode, null, true);
            } else if (customCode) {
                try { await navigator.clipboard.writeText(customCode); } catch (_) {}
            }
            alert(`Código criado e copiado:\n\n${customCode}\n\nCole no cadastro do cliente ou envie para ele.`);
            await loadCodes(); 
        
        } catch (error) {
                console.error('Erro detalhado:', error);
            alert(`Erro ao criar código: ${error.message}`);
        }
    });
    }

    document.querySelector('#users-table').addEventListener('click', async (e) => {
        if (e.target.closest('.account-type-cell')) return;
        if (e.target.closest('.admin-user-name-cell')) return;
    });
    
    document.querySelector('#codes-table').addEventListener('click', async (e) => {
        const copyBtn = e.target.closest('[data-copy-code], [data-copy-link]');
        if (copyBtn) {
            e.preventDefault();
            const text = copyBtn.getAttribute('data-copy-code') || copyBtn.getAttribute('data-copy-link') || '';
            if (text) window.copyToClipboard(text, copyBtn);
            return;
        }
        // Verificar se é um botão de deletar (não checkbox)
        if (e.target.matches('button[data-code]') && e.target.textContent === 'Deletar') {
            const code = e.target.dataset.code;
            if (confirm(`Tem certeza que deseja deletar o código ${code}?`)) {
                 try {
                    const response = await fetch(`${API_URL}/codes/${code}`, { method: 'DELETE', headers: HEADERS });
                    if (!response.ok) throw new Error((await response.json()).message);
                    alert('Código deletado com sucesso.');
                    await loadCodes();
                } catch (error) {
                    alert(`Erro ao deletar código: ${error.message}`);
                }
            }
        }
    });




    // Função para copiar link para a área de transferência
    window.copyToClipboard = function(text, buttonElement, silent) {
        const done = function () {
            if (buttonElement) {
                const originalText = buttonElement.textContent;
                buttonElement.textContent = 'Copiado!';
                buttonElement.style.backgroundColor = 'var(--success)';
                setTimeout(() => {
                    buttonElement.textContent = originalText;
                    buttonElement.style.backgroundColor = '';
                }, 2000);
            } else if (!silent) {
                alert('Copiado: ' + text);
            }
        };
        if (!navigator.clipboard) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                done();
            } catch (err) {
                console.error('Erro ao copiar:', err);
                if (!silent) alert('Erro ao copiar para a área de transferência');
            }
            document.body.removeChild(textArea);
            return;
        }
        navigator.clipboard.writeText(text).then(done).catch((err) => {
            console.error('Erro ao copiar:', err);
            if (!silent) alert('Erro ao copiar para a área de transferência');
        });
    };

    // Variáveis globais para controle de dados
    let allCodes = [];
    
    // Função para carregar códigos
    async function loadCodes() {
        try {
            const rows = await fetchData('codes');
            const codes = Array.isArray(rows) ? rows : [];
            allCodes = codes;
            updateCodeStats(codes);
            const filtered = getFilteredCodes();
            currentCodesPage = 1;
            applyCodePagination(filtered);
            /* console.log removed (encoding) */
        } catch (error) {
            console.error('O Erro ao carregar códigos:', error);
            allCodes = [];
            updateCodeStats([]);
            renderCodes([]);
        }
    }
    
    // Função para abrir modal de exclusão automática de usuários
    async function openUserAutoDeleteModal() {
        const modal = document.getElementById('auto-delete-modal');
        const configsList = document.getElementById('auto-delete-configs-list');
        
        try {
            const response = await fetch(`${API_URL}/users/auto-delete-config`, { headers: HEADERS });
            if (!response.ok) throw new Error('Erro ao carregar configurações');
            
            const configs = await response.json();
            
            configsList.innerHTML = '';
            if (configs.length === 0) {
                configsList.innerHTML = '<p style="color: var(--text-dark);">Nenhuma configuração encontrada.</p>';
            } else {
                configs.forEach(config => {
                    const configDiv = document.createElement('div');
                    configDiv.className = 'auto-delete-config-item';
                    configDiv.style.cssText = 'padding: 15px; background: var(--bg-card); border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;';
                    configDiv.innerHTML = `
                        <div>
                            <strong>${config.days_after_expiration} dias após expiração</strong>
                            <span style="color: var(--text-dark); margin-left: 10px;">
                                ${config.is_active ? '<span style="color: var(--success);">Ativo</span>' : '<span style="color: var(--text-dark);">< Inativo</span>'}
                            </span>
                        </div>
                        <button class="btn btn-danger delete-config-btn" data-id="${config.id}" data-days="${config.days_after_expiration}" style="margin-left: 10px;">
                            <i class="fas fa-trash"></i> Remover
                        </button>
                    `;
                    configsList.appendChild(configDiv);
                    
                    // Event listener para deletar configuração
                    const deleteBtn = configDiv.querySelector('.delete-config-btn');
                    deleteBtn.addEventListener('click', async function() {
                        const days = this.dataset.days;
                        if (!confirm(`Tem certeza que deseja remover a configuração de ${days} dias?`)) {
                            return;
                        }
                        
                        try {
                            const response = await fetch(`${API_URL}/users/auto-delete-config`, {
                                method: 'POST',
                                headers: HEADERS,
                                body: JSON.stringify({ days_after_expiration: parseInt(days), is_active: false })
                            });
                            
                            if (!response.ok) throw new Error('Erro ao remover configuração');
                            
                            alert('Configuração removida com sucesso!');
                            await openUserAutoDeleteModal();
                        } catch (error) {
                            console.error('Erro ao remover configuração:', error);
                            alert('Erro ao remover configuração.');
                        }
                    });
                });
            }
            
            modal.classList.add('active');
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            alert('Erro ao carregar configurações de exclusão automática.');
        }
    }
    let allUsers = [];
    let filteredCodes = [];
    let currentUserSort = { key: null, direction: 'desc' }; // 'asc' | 'desc'
    
    // Variáveis de paginação
    let currentUsersPage = 1;
    let usersPerPage = 50;
    let currentCodesPage = 1;
    let codesPerPage = 50;
    
    // Variáveis de filtros avançados
    let advancedUserFilters = {
        accountType: '',
        subscriptionStatus: '',
        isAdmin: '',
        createdFrom: '',
        createdTo: ''
    };
    let currentInactivityDays = null; // 30, 60, 90, 180 ou null
    
    let advancedCodeFilters = {
        status: '',
        generator: '',
        createdFrom: '',
        createdTo: ''
    };
    let currentCodeQuickFilter = 'all'; // 'all' | 'claimed' | 'available'

    function updateSelectedCount() {
        const checkboxes = document.querySelectorAll('.code-checkbox:checked');
        const count = checkboxes.length;
        const selectedCountElement = document.getElementById('selected-count');
        if (selectedCountElement) selectedCountElement.textContent = count === 1 ? '1 selecionado' : `${count} selecionados`;
        const codesCountEl = document.getElementById('codes-count');
        if (codesCountEl && codesCountEl.dataset.baseCountText) {
            const selectedText = count > 0 ? ` (${count} selecionado${count > 1 ? 's' : ''})` : '';
            codesCountEl.textContent = codesCountEl.dataset.baseCountText + selectedText;
        }
    }

    // Função para obter códigos selecionados
    function getSelectedCodes() {
        const checkboxes = document.querySelectorAll('.code-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.dataset.code);
    }

    // Função para obter códigos filtrados
    function getFilteredCodes() {
        const filterInput = document.getElementById('filter-input');
        const filterValue = filterInput ? filterInput.value.toLowerCase() : '';
        
        if (!filterValue) {
            return allCodes;
        }
        
        return allCodes.filter(code => {
            const codeStr = (code.code || '').toLowerCase();
            const linkStr = `https://tag.conectaking.com.br/${code.code}`.toLowerCase();
            const claimedEmail = (code.claimed_by_email || '').toLowerCase();
            const generatedEmail = (code.generated_by_email || '').toLowerCase();
            return (
                codeStr.includes(filterValue) ||
                linkStr.includes(filterValue) ||
                claimedEmail.includes(filterValue) ||
                generatedEmail.includes(filterValue)
            );
        });
    }

    function applyTextFilter() {
        filteredCodes = getFilteredCodes();
        currentCodesPage = 1;
        applyCodePagination(filteredCodes);
        updateCodeStats(filteredCodes);
        updateSelectedCount();
        if (typeof updateFiltersActiveBarCodes === 'function') updateFiltersActiveBarCodes();
    }
    

    // ====== Funções de Estatísticas ======
    function updateUserStats(users) {
        if (!users || users.length === 0) {
            document.getElementById('stat-total-users').textContent = '0';
            document.getElementById('stat-active-users').textContent = '0';
            document.getElementById('stat-expired-users').textContent = '0';
            document.getElementById('stat-expiring-soon-users').textContent = '0';
            return;
        }
        
        const now = new Date();
        let active = 0, expired = 0, expiringSoon = 0;
        
        users.forEach(u => {
            if (u.subscription_expires_at) {
                const exp = new Date(u.subscription_expires_at);
                const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
                
                if (daysLeft < 0) {
                    expired++;
                } else if (daysLeft <= 7) {
                    expiringSoon++;
                    active++;
                } else {
                    active++;
                }
            } else {
                active++;
            }
        });
        
        document.getElementById('stat-total-users').textContent = users.length;
        document.getElementById('stat-active-users').textContent = active;
        document.getElementById('stat-expired-users').textContent = expired;
        document.getElementById('stat-expiring-soon-users').textContent = expiringSoon;
    }
    
    function updateCodeStats(codes) {
        if (!codes || codes.length === 0) {
            document.getElementById('stat-total-codes').textContent = '0';
            document.getElementById('stat-available-codes').textContent = '0';
            document.getElementById('stat-used-codes').textContent = '0';
            document.getElementById('stat-usage-rate').textContent = '0%';
            return;
        }
        
        const total = codes.length;
        const used = codes.filter(c => c.is_claimed).length;
        const available = total - used;
        const usageRate = total > 0 ? Math.round((used / total) * 100) : 0;
        
        document.getElementById('stat-total-codes').textContent = total;
        document.getElementById('stat-available-codes').textContent = available;
        document.getElementById('stat-used-codes').textContent = used;
        document.getElementById('stat-usage-rate').textContent = `${usageRate}%`;
    }
    
    // ====== Funções de Paginação ======
    function applyUserPagination(users) {
        if (!users) users = [];
        
        if (usersPerPage === 'all') {
            renderUsers(users);
            const totalPages = users.length > 0 ? 1 : 0;
            updateUserPagination(users.length, totalPages);
            return;
        }
        
        const perPage = parseInt(usersPerPage);
        const totalPages = users.length > 0 ? Math.ceil(users.length / perPage) : 0;
        const start = (currentUsersPage - 1) * perPage;
        const end = start + perPage;
        const paginatedUsers = users.slice(start, end);
        
        renderUsers(paginatedUsers);
        updateUserPagination(users.length, totalPages);
    }
    
    function updateUserPagination(totalItems, totalPages) {
        const prevBtn = document.getElementById('users-prev-page');
        const nextBtn = document.getElementById('users-next-page');
        const pageInfo = document.getElementById('users-page-info');
        const pageRangeEl = document.getElementById('users-page-range');
        
        updateUserCount(totalItems, allUsers.length);
        
        if (!prevBtn || !nextBtn || !pageInfo) return;
        
        prevBtn.disabled = currentUsersPage === 1 || totalPages === 0;
        nextBtn.disabled = currentUsersPage >= totalPages || totalPages === 0;
        
        if (totalPages === 0) {
            pageInfo.textContent = 'Nenhum usuário';
            if (pageRangeEl) pageRangeEl.textContent = '';
        } else {
            pageInfo.textContent = `Página ${currentUsersPage} de ${totalPages} (${totalItems} usuário${totalItems !== 1 ? 's' : ''})`;
            const perPage = usersPerPage === 'all' ? totalItems : parseInt(usersPerPage);
            const start = (currentUsersPage - 1) * perPage + 1;
            const end = Math.min(start + perPage - 1, totalItems);
            if (pageRangeEl) pageRangeEl.textContent = totalItems > 0 ? `Mostrando ${start}—${end} de ${totalItems}` : '';
        }
    }
    
    function applyCodePagination(codes) {
        if (!codes) codes = [];
        
        if (codesPerPage === 'all') {
            renderCodes(codes);
            const totalPages = codes.length > 0 ? 1 : 0;
            updateCodePagination(codes.length, totalPages);
            return;
        }
        
        const perPage = parseInt(codesPerPage);
        const totalPages = codes.length > 0 ? Math.ceil(codes.length / perPage) : 0;
        const start = (currentCodesPage - 1) * perPage;
        const end = start + perPage;
        const paginatedCodes = codes.slice(start, end);
        
        renderCodes(paginatedCodes);
        updateCodePagination(codes.length, totalPages);
    }
    
    function updateCodeCount(filteredLength, totalLength) {
        if (totalLength === undefined) totalLength = allCodes.length;
        const el = document.getElementById('codes-count');
        if (!el) return;
        const plural = filteredLength === 1 ? 'código' : 'códigos';
        let base = filteredLength === totalLength
            ? `${filteredLength} ${plural}`
            : `Mostrando ${filteredLength} de ${totalLength} códigos`;
        el.dataset.baseCountText = base;
        const checkboxes = document.querySelectorAll('.code-checkbox:checked');
        const sel = checkboxes.length;
        const selectedText = sel > 0 ? ` (${sel} selecionado${sel > 1 ? 's' : ''})` : '';
        el.textContent = base + selectedText;
    }
    
    function updateCodePagination(totalItems, totalPages) {
        const prevBtn = document.getElementById('codes-prev-page');
        const nextBtn = document.getElementById('codes-next-page');
        const pageInfo = document.getElementById('codes-page-info');
        const pageRangeEl = document.getElementById('codes-page-range');
        
        updateCodeCount(totalItems, allCodes.length);
        
        if (!prevBtn || !nextBtn || !pageInfo) return;
        
        prevBtn.disabled = currentCodesPage === 1 || totalPages === 0;
        nextBtn.disabled = currentCodesPage >= totalPages || totalPages === 0;
        
        if (totalPages === 0) {
            pageInfo.textContent = 'Nenhum código';
            if (pageRangeEl) pageRangeEl.textContent = '';
        } else {
            pageInfo.textContent = `Página ${currentCodesPage} de ${totalPages} (${totalItems} código${totalItems !== 1 ? 's' : ''})`;
            const perPage = codesPerPage === 'all' ? totalItems : parseInt(codesPerPage);
            const start = (currentCodesPage - 1) * perPage + 1;
            const end = Math.min(start + perPage - 1, totalItems);
            if (pageRangeEl) pageRangeEl.textContent = totalItems > 0 ? `Mostrando ${start}—${end} de ${totalItems}` : '';
        }
    }
    
    // ====== Filtro de Usuários (com filtros avançados) ======
    function getUserFiltered() {
        const input = document.getElementById('user-search-input');
        const query = input ? input.value.trim().toLowerCase() : '';
        
        let filtered = allUsers;
        
        // Filtro de texto
        if (query) {
            filtered = filtered.filter(u => {
                const name = (u.display_name || '').toLowerCase();
                const email = (u.email || '').toLowerCase();
                return name.includes(query) || email.includes(query);
            });
        }
        
        // Filtros avançados
        if (advancedUserFilters.accountType) {
            filtered = filtered.filter(u => u.account_type === advancedUserFilters.accountType);
        }
        
        if (advancedUserFilters.subscriptionStatus) {
            filtered = filtered.filter(u => u.subscription_status === advancedUserFilters.subscriptionStatus);
        }
        
        if (advancedUserFilters.isAdmin !== '') {
            const isAdmin = advancedUserFilters.isAdmin === 'true';
            filtered = filtered.filter(u => u.is_admin === isAdmin);
        }
        
        if (advancedUserFilters.createdFrom) {
            const fromDate = new Date(advancedUserFilters.createdFrom);
            filtered = filtered.filter(u => new Date(u.created_at) >= fromDate);
        }
        
        if (advancedUserFilters.createdTo) {
            const toDate = new Date(advancedUserFilters.createdTo);
            toDate.setHours(23, 59, 59, 999); // Fim do dia
            filtered = filtered.filter(u => new Date(u.created_at) <= toDate);
        }
        
        if (currentInactivityDays != null) {
            const now = Date.now();
            const minExpiredMs = currentInactivityDays * 24 * 60 * 60 * 1000;
            filtered = filtered.filter(u => {
                if (!u.subscription_expires_at) return false;
                const exp = new Date(u.subscription_expires_at).getTime();
                if (exp >= now) return false;
                return (now - exp) >= minExpiredMs;
            });
        }
        
        return sortUsers(filtered);
    }
    
    function updateFiltersActiveBar() {
        const bar = document.getElementById('users-filters-active-bar');
        const textEl = document.getElementById('users-filters-active-text');
        const searchVal = (document.getElementById('user-search-input') || {}).value || '';
        const hasSearch = searchVal.trim() !== '';
        const hasAdvanced = advancedUserFilters.accountType || advancedUserFilters.subscriptionStatus || advancedUserFilters.isAdmin !== '' || advancedUserFilters.createdFrom || advancedUserFilters.createdTo;
        const expActive = document.querySelector('#user-filter-expired-btn.active') || document.querySelector('#user-filter-active-btn.active') || document.querySelector('#user-filter-expiring-soon-btn.active');
        const hasInactivity = currentInactivityDays != null;
        const active = hasSearch || hasAdvanced || expActive || hasInactivity;
        if (!bar || !textEl) return;
        if (!active) {
            bar.style.display = 'none';
            return;
        }
        const parts = [];
        if (hasSearch) parts.push('busca');
        if (hasAdvanced) parts.push('filtros avançados');
        if (expActive) parts.push('vencimento');
        if (hasInactivity) parts.push('inatividade ' + currentInactivityDays + ' dias');
        textEl.textContent = 'Filtros ativos: ' + parts.join(', ');
        bar.style.display = 'flex';
    }
    
    function clearAllUserFilters() {
        const input = document.getElementById('user-search-input');
        if (input) input.value = '';
        advancedUserFilters = { accountType: '', subscriptionStatus: '', isAdmin: '', createdFrom: '', createdTo: '' };
        const at = document.getElementById('filter-account-type');
        const ss = document.getElementById('filter-subscription-status');
        const ia = document.getElementById('filter-is-admin');
        const cf = document.getElementById('filter-created-from');
        const ct = document.getElementById('filter-created-to');
        if (at) at.value = ''; if (ss) ss.value = ''; if (ia) ia.value = '';
        if (cf) cf.value = ''; if (ct) ct.value = '';
        currentInactivityDays = null;
        document.querySelectorAll('#user-filter-all-btn, #user-filter-expired-btn, #user-filter-active-btn, #user-filter-expiring-soon-btn').forEach(btn => {
            if (!btn) return;
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', btn.id === 'user-filter-all-btn' ? 'true' : 'false');
            if (btn.id === 'user-filter-all-btn') btn.classList.add('active');
        });
        document.querySelectorAll('[id^="user-filter-inactive-"]').forEach(btn => { btn.classList.remove('active'); });
        currentUsersPage = 1;
        const filtered = getUserFiltered();
        applyUserPagination(filtered);
        updateUserStats(filtered);
        updateFiltersActiveBar();
    }
    
    // ====== Filtro de Códigos (com filtros avançados) ======
    function getFilteredCodes() {
        const filterInput = document.getElementById('filter-input');
        const filterValue = filterInput ? filterInput.value.toLowerCase() : '';
        
        let filtered = allCodes;
        
        // Filtro de texto
        if (filterValue) {
            filtered = filtered.filter(code => {
                const codeStr = (code.code || '').toLowerCase();
                const linkStr = `https://tag.conectaking.com.br/${code.code}`.toLowerCase();
                const claimedEmail = (code.claimed_by_email || '').toLowerCase();
                const generatedEmail = (code.generated_by_email || '').toLowerCase();
                return (
                    codeStr.includes(filterValue) ||
                    linkStr.includes(filterValue) ||
                    claimedEmail.includes(filterValue) ||
                    generatedEmail.includes(filterValue)
                );
            });
        }
        
        if (currentCodeQuickFilter === 'claimed') {
            filtered = filtered.filter(c => c.is_claimed);
        } else if (currentCodeQuickFilter === 'available') {
            filtered = filtered.filter(c => !c.is_claimed);
        }
        
        if (advancedCodeFilters.status) {
            if (advancedCodeFilters.status === 'available') {
                filtered = filtered.filter(c => !c.is_claimed);
            } else if (advancedCodeFilters.status === 'used') {
                filtered = filtered.filter(c => c.is_claimed);
            }
        }
        
        if (advancedCodeFilters.generator) {
            const generatorLower = advancedCodeFilters.generator.toLowerCase();
            filtered = filtered.filter(c => {
                const genEmail = (c.generated_by_email || '').toLowerCase();
                return genEmail.includes(generatorLower);
            });
        }
        
        if (advancedCodeFilters.createdFrom) {
            const fromDate = new Date(advancedCodeFilters.createdFrom);
            filtered = filtered.filter(c => new Date(c.created_at) >= fromDate);
        }
        
        if (advancedCodeFilters.createdTo) {
            const toDate = new Date(advancedCodeFilters.createdTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(c => new Date(c.created_at) <= toDate);
        }
        
        return filtered;
    }

    // (applyUserFilter principal está mais abaixo, com paginação e stats)
    
    // Função para obter usuários selecionados
    function getSelectedUsers() {
        const checkboxes = document.querySelectorAll('.user-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.dataset.userId);
    }
    
    function updateUserCount(filteredLength, totalLength) {
        if (totalLength === undefined) totalLength = allUsers.length;
        const el = document.getElementById('user-count');
        if (!el) return;
        const plural = filteredLength === 1 ? 'usuário' : 'usuários';
        let base = filteredLength === totalLength
            ? `${filteredLength} ${plural}`
            : `Mostrando ${filteredLength} de ${totalLength} usuários`;
        el.dataset.baseCountText = base;
        const checkboxes = document.querySelectorAll('.user-checkbox:checked');
        const sel = checkboxes.length;
        const selectedText = sel > 0 ? ` (${sel} selecionado${sel > 1 ? 's' : ''})` : '';
        el.textContent = base + selectedText;
        el.setAttribute('aria-live', 'polite');
    }
    
    function updateUserSelectedCount() {
        const checkboxes = document.querySelectorAll('.user-checkbox:checked');
        const count = checkboxes.length;
        const bulkActions = document.getElementById('user-bulk-actions');
        const selectedCountEl = document.getElementById('user-selected-count');
        
        if (bulkActions) bulkActions.style.display = count > 0 ? 'block' : 'none';
        if (selectedCountEl) selectedCountEl.textContent = `${count} usuário${count !== 1 ? 's' : ''} selecionado${count !== 1 ? 's' : ''}`;
        
        const userCountEl = document.getElementById('user-count');
        if (userCountEl && userCountEl.dataset.baseCountText) {
            const selectedText = count > 0 ? ` (${count} selecionado${count > 1 ? 's' : ''})` : '';
            userCountEl.textContent = userCountEl.dataset.baseCountText + selectedText;
        }
    }
    
    // Função para obter usuários selecionados
    function getSelectedUsers() {
        const checkboxes = document.querySelectorAll('.user-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.dataset.userId);
    }

    // ====== Ordenação de Usuários ======
    function sortUsers(list) {
        if (!currentUserSort.key) return list;
        const dir = currentUserSort.direction === 'asc' ? 1 : -1;
        const key = currentUserSort.key;

        const getDaysLeft = (u) => {
            if (!u.subscription_expires_at) return Number.POSITIVE_INFINITY; // N/A vai para o fim no asc
            const now = new Date();
            const exp = new Date(u.subscription_expires_at);
            return Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
        };

        const getValue = (u) => {
            switch (key) {
                case 'name': return (u.display_name || '').toLowerCase();
                case 'email': return (u.email || '').toLowerCase();
                case 'account_type': return (u.account_type || '').toLowerCase();
                case 'subscription_status': return (u.subscription_status || '').toLowerCase();
                case 'expires_at': return u.subscription_expires_at ? new Date(u.subscription_expires_at).getTime() : 0;
                case 'days_left': return getDaysLeft(u);
                case 'parent_email': return (u.parent_email || '').toLowerCase();
                case 'is_admin': return u.is_admin ? 1 : 0;
                case 'created_at': return u.created_at ? new Date(u.created_at).getTime() : 0;
                default: return '';
            }
        };

        return [...list].sort((a, b) => {
            const va = getValue(a);
            const vb = getValue(b);
            if (va < vb) return -1 * dir;
            if (va > vb) return 1 * dir;
            return 0;
        });
    }

    function setupUserSorting() {
        const headers = document.querySelectorAll('#users-table thead th.sortable');
        headers.forEach(th => {
            th.addEventListener('click', () => {
                const key = th.dataset.key;
                if (currentUserSort.key === key) {
                    currentUserSort.direction = currentUserSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentUserSort.key = key;
                    currentUserSort.direction = 'desc';
                }

                // Indicadores visuais
                document.querySelectorAll('#users-table thead th.sortable').forEach(header => {
                    header.classList.remove('active');
                    const span = header.querySelector('.sort-indicator');
                    if (span) span.textContent = '';
                });
                
                th.classList.add('active');
                const indicator = th.querySelector('.sort-indicator');
                if (indicator) {
                    indicator.textContent = currentUserSort.direction === 'asc' ? '' : '';
                    indicator.style.color = 'var(--primary)';
                }

                // aplicar
                const filtered = getUserFiltered();
                currentUsersPage = 1;
                applyUserPagination(filtered);
            });
        });
    }
    
    // Função para aplicar filtros e renderizar usuários
    function applyUserFilter() {
        const filtered = getUserFiltered();
        currentUsersPage = 1;
        applyUserPagination(filtered);
        updateUserStats(filtered);
        updateFiltersActiveBar();
    }

    // Event listener para filtro de texto (removido - já está abaixo)

    const copyFilteredBtn = document.getElementById('copy-filtered-links-btn');
    if (copyFilteredBtn) {
        copyFilteredBtn.addEventListener('click', () => {
            const filtered = getFilteredCodes();
            const links = filtered.map(code => `https://tag.conectaking.com.br/${code.code}`);
            const linksText = links.join('\n');
            
            navigator.clipboard.writeText(linksText).then(() => {
                alert(`${links.length} links copiados para a área de transferência!`);
            }).catch(err => {
                console.error('Erro ao copiar:', err);
                alert('Erro ao copiar links');
            });
        });
    }

    const copySelectedBtn = document.getElementById('copy-selected-btn');
    if (copySelectedBtn) {
        copySelectedBtn.addEventListener('click', () => {
            const selectedCodes = getSelectedCodes();
            if (selectedCodes.length === 0) {
                alert('Nenhum código selecionado!');
                return;
            }
            
            const codesText = selectedCodes.join('\n');
            
            navigator.clipboard.writeText(codesText).then(() => {
                alert(`${selectedCodes.length} código(s) copiado(s)!\n\nCole no cadastro do cliente ou envie pelo WhatsApp.`);
            }).catch(err => {
                console.error('Erro ao copiar:', err);
                alert('Erro ao copiar códigos selecionados');
            });
        });
    }

    const deleteSelectedBtn = document.getElementById('delete-selected-btn');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', async () => {
            const selectedCodes = getSelectedCodes();
            if (selectedCodes.length === 0) {
                alert('Nenhum código selecionado!');
                return;
            }
            
            if (!confirm(`Tem certeza que deseja deletar ${selectedCodes.length} código(s) selecionado(s)?`)) {
                return;
            }
            
            try {
                // Deletar códigos em paralelo
                const deletePromises = selectedCodes.map(code => 
                    fetch(`${API_URL}/codes/${code}`, { 
                        method: 'DELETE', 
                        headers: HEADERS 
                    })
                );
                
                const responses = await Promise.all(deletePromises);
                const failed = responses.filter(r => !r.ok);
                
                if (failed.length > 0) {
                    throw new Error(`${failed.length} códigos falharam na deleção`);
                }
                
                alert(`${selectedCodes.length} código(s) deletado(s) com sucesso!`);
                await loadCodes(); // Recarregar a tabela
            } catch (error) {
                console.error('Erro ao deletar códigos:', error);
                alert(`Erro ao deletar códigos: ${error.message}`);
            }
        });
    }

    // Event listener para selecionar todos
    const selectAllCheckbox = document.getElementById('select-all-codes');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.code-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
            updateSelectedCount();
        });
    }

    // Função para selecionar 10 de uma vez
    window.selectNext10 = function() {
        const checkboxes = document.querySelectorAll('.code-checkbox:not(:checked)');
        const toSelect = Math.min(10, checkboxes.length);
        
        for (let i = 0; i < toSelect; i++) {
            checkboxes[i].checked = true;
        }
        updateSelectedCount();
    };

    // Event listener para busca de usuários (com debounce)
    const userSearchInput = document.getElementById('user-search-input');
    if (userSearchInput) {
        let searchTimeout;
        userSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                applyUserFilter();
            }, 300); // Debounce de 300ms
        });
    }
    
    // Event listener para filtro de texto de códigos
    const filterInputElement = document.getElementById('filter-input');
    if (filterInputElement) {
        let filterTimeout;
        filterInputElement.addEventListener('input', () => {
            clearTimeout(filterTimeout);
            filterTimeout = setTimeout(() => {
                applyTextFilter();
            }, 300); // Debounce de 300ms
        });
    }
    
    // Inicializar ordenação de usuários
    setupUserSorting();
    
    // Event listeners para filtros de vencimento de USUÁRIOS
    const userFilterAllBtn = document.getElementById('user-filter-all-btn');
    const userFilterExpiredBtn = document.getElementById('user-filter-expired-btn');
    const userFilterActiveBtn = document.getElementById('user-filter-active-btn');
    
    if (userFilterAllBtn) {
        userFilterAllBtn.addEventListener('click', () => applyUserExpirationFilter('all'));
    }
    if (userFilterExpiredBtn) {
        userFilterExpiredBtn.addEventListener('click', () => applyUserExpirationFilter('expired'));
    }
    if (userFilterActiveBtn) {
        userFilterActiveBtn.addEventListener('click', () => applyUserExpirationFilter('active'));
    }
    const userFilterExpiringSoonBtn = document.getElementById('user-filter-expiring-soon-btn');
    if (userFilterExpiringSoonBtn) {
        userFilterExpiringSoonBtn.addEventListener('click', () => applyUserExpirationFilter('expiring_soon'));
    }
    
    // Clique nos cards de estatísticas de usuários aplica o filtro correspondente
    document.querySelectorAll('#users-pane .stat-card-clickable[data-user-expiration-filter]').forEach(card => {
        card.addEventListener('click', function() {
            const filter = this.getAttribute('data-user-expiration-filter') || 'all';
            applyUserExpirationFilter(filter);
        });
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.click(); }
        });
    });
    
    // Função para aplicar filtro de vencimento em usuários
    function applyUserExpirationFilter(filter) {
        let filtered = getUserFiltered();
        
        if (filter !== 'all') {
            filtered = filtered.filter(user => {
                if (!user.subscription_expires_at) {
                    return filter === 'active'; // Sem expiração = em dias
                }
                const now = new Date();
                const expiresDate = new Date(user.subscription_expires_at);
                const isExpired = expiresDate < now;
                const daysLeft = Math.ceil((expiresDate - now) / (1000 * 60 * 60 * 24));
                
                if (filter === 'expired') return isExpired;
                if (filter === 'active') return !isExpired && (daysLeft > 7);
                if (filter === 'expiring_soon') return !isExpired && daysLeft >= 0 && daysLeft <= 7;
                return true;
            });
        }
        
        currentUsersPage = 1; // Resetar para primeira página
        applyUserPagination(filtered);
        updateUserStats(filtered);
        
        const expirationBtns = '#user-filter-all-btn, #user-filter-expired-btn, #user-filter-active-btn, #user-filter-expiring-soon-btn';
        document.querySelectorAll(expirationBtns).forEach(btn => {
            if (!btn) return;
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', btn.dataset.filter === filter ? 'true' : 'false');
            if (btn.dataset.filter === filter) btn.classList.add('active');
        });
        updateFiltersActiveBar();
    }
    
    document.getElementById('users-clear-all-filters-btn')?.addEventListener('click', clearAllUserFilters);
    document.getElementById('users-empty-state-clear-btn')?.addEventListener('click', clearAllUserFilters);
    
    userSearchInput?.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); applyUserFilter(); }
    });
    
    [30, 60, 90, 180].forEach(days => {
        const btn = document.getElementById('user-filter-inactive-' + days);
        if (!btn) return;
        btn.addEventListener('click', function() {
            const isActive = currentInactivityDays === days;
            currentInactivityDays = isActive ? null : days;
            document.querySelectorAll('[id^="user-filter-inactive-"]').forEach(b => {
                b.classList.toggle('active', currentInactivityDays === parseInt(b.dataset.inactiveDays));
            });
            currentUsersPage = 1;
            const filtered = getUserFiltered();
            applyUserPagination(filtered);
            updateUserStats(filtered);
            updateFiltersActiveBar();
        });
    });
    
    const USERS_COLUMNS = [
        { id: 'num', label: '#' },
        { id: 'name', label: 'Nome' },
        { id: 'email', label: 'Email' },
        { id: 'account_type', label: 'Tipo de Conta' },
        { id: 'subscription_status', label: 'Status Assinatura' },
        { id: 'expires_at', label: 'Expira em' },
        { id: 'days_left', label: 'Status Vencimento' },
        { id: 'parent_email', label: 'Conta Principal' },
        { id: 'is_admin', label: 'Status Admin' },
        { id: 'created_at', label: 'Data de Criação' }
    ];
    const COLUMNS_STORAGE_KEY = 'adminUsersVisibleCols';
    function getVisibleColumns() {
        try {
            const s = localStorage.getItem(COLUMNS_STORAGE_KEY);
            if (s) {
                const arr = JSON.parse(s);
                if (Array.isArray(arr)) return arr;
            }
        } catch (e) {}
        return USERS_COLUMNS.map(c => c.id);
    }
    function setVisibleColumns(ids) {
        localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(ids));
        USERS_COLUMNS.forEach(col => {
            const th = document.querySelector('#users-table thead th[data-col="' + col.id + '"]');
            const tds = document.querySelectorAll('#users-table tbody td[data-col="' + col.id + '"]');
            const visible = ids.indexOf(col.id) !== -1;
            [th, ...tds].forEach(el => { if (el) el.classList.toggle('col-hidden', !visible); });
        });
    }
    const visibleCols = getVisibleColumns();
    setVisibleColumns(visibleCols);
    window._applyUsersColumnVisibility = function() { setVisibleColumns(getVisibleColumns()); };
    
    const columnsToggle = document.getElementById('users-columns-toggle');
    const columnsDropdown = document.getElementById('users-columns-dropdown');
    if (columnsToggle && columnsDropdown) {
        columnsDropdown.innerHTML = USERS_COLUMNS.map(col => {
            const checked = visibleCols.indexOf(col.id) !== -1;
            return '<label><input type="checkbox" data-col="' + col.id + '" ' + (checked ? 'checked' : '') + '> ' + col.label + '</label>';
        }).join('');
        columnsToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            const open = columnsDropdown.style.display === 'block';
            columnsDropdown.style.display = open ? 'none' : 'block';
            columnsToggle.setAttribute('aria-expanded', !open);
        });
        columnsDropdown.querySelectorAll('input').forEach(cb => {
            cb.addEventListener('change', function() {
                const ids = Array.from(columnsDropdown.querySelectorAll('input:checked')).map(i => i.dataset.col);
                setVisibleColumns(ids.length ? ids : USERS_COLUMNS.map(c => c.id));
            });
        });
        document.addEventListener('click', function() { columnsDropdown.style.display = 'none'; columnsToggle.setAttribute('aria-expanded', 'false'); });
        columnsDropdown.addEventListener('click', function(e) { e.stopPropagation(); });
    }
    
    (function setupColumnResize() {
        const thead = document.querySelector('#users-table thead');
        if (!thead) return;
        const ths = thead.querySelectorAll('th');
        ths.forEach((th, i) => {
            const handle = document.createElement('span');
            handle.className = 'resize-handle';
            handle.setAttribute('aria-hidden', 'true');
            th.appendChild(handle);
            let startX = 0, startW = 0;
            handle.addEventListener('mousedown', function(e) {
                e.preventDefault();
                startX = e.pageX;
                startW = th.offsetWidth;
                const onMove = function(e2) {
                    const dx = e2.pageX - startX;
                    const newW = Math.max(40, startW + dx);
                    th.style.width = newW + 'px';
                    th.style.minWidth = newW + 'px';
                };
                const onUp = function() {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        });
    })();
    
    document.getElementById('copy-selected-users-btn')?.addEventListener('click', function() {
        const ids = getSelectedUsers();
        if (ids.length === 0) { alert('Nenhum usuário selecionado.'); return; }
        const lines = allUsers.filter(u => ids.includes(u.id)).map(u => (u.display_name || u.email || '').replace(/,/g, ';') + ',' + (u.email || ''));
        const text = 'Nome,Email\n' + lines.join('\n');
        navigator.clipboard.writeText(text).then(() => alert(ids.length + ' usuário(s) copiado(s) (nome + e-mail).')).catch(() => alert('Erro ao copiar.'));
    });
    
    function showUsersTableLoading(show) {
        const el = document.getElementById('users-table-loading');
        const container = document.getElementById('users-table-container');
        if (el) el.style.display = show ? 'flex' : 'none';
        if (container) container.style.display = show ? 'none' : 'block';
    }
    
    const origApplyUserPagination = applyUserPagination;
    applyUserPagination = function(users) {
        showUsersTableLoading(true);
        setTimeout(() => {
            origApplyUserPagination(users);
            showUsersTableLoading(false);
        }, 80);
    };
    
    navLinks.forEach(link => {
        const targetId = link.dataset.target;
        if (targetId === 'users-pane') {
            const oldClick = link.onclick;
            link.addEventListener('click', function() {
                setTimeout(() => {
                    if (document.getElementById('users-pane')?.classList.contains('active')) {
                        document.getElementById('user-search-input')?.focus();
                    }
                }, 100);
            });
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const searchEl = document.getElementById('user-search-input');
            if (document.activeElement === searchEl && searchEl?.value) {
                searchEl.value = '';
                applyUserFilter();
            }
            if (columnsDropdown?.style.display === 'block') {
                columnsDropdown.style.display = 'none';
                columnsToggle?.setAttribute('aria-expanded', 'false');
            }
            return;
        }
        if (e.ctrlKey && e.key === 'f') { e.preventDefault(); document.getElementById('user-search-input')?.focus(); return; }
        if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName)) { e.preventDefault(); document.getElementById('user-search-input')?.focus(); }
    });
    
    // Event listeners para exclusão automática de USUÁRIOS
    const userAutoDeleteModal = document.getElementById('auto-delete-modal');
    const openUserAutoDeleteBtn = document.getElementById('open-user-auto-delete-modal-btn');
    const closeUserAutoDeleteBtn = document.getElementById('close-auto-delete-modal-btn');
    const saveUserAutoDeleteBtn = document.getElementById('save-auto-delete-config-btn');
    const executeUserAutoDeleteBtn = document.getElementById('execute-user-auto-delete-btn');
    
    if (openUserAutoDeleteBtn) {
        openUserAutoDeleteBtn.addEventListener('click', openUserAutoDeleteModal);
    }
    if (closeUserAutoDeleteBtn) {
        closeUserAutoDeleteBtn.addEventListener('click', () => {
            userAutoDeleteModal.classList.remove('active');
        });
    }
    if (saveUserAutoDeleteBtn) {
        saveUserAutoDeleteBtn.addEventListener('click', async () => {
            const days = parseInt(document.getElementById('new-auto-delete-days').value);
            const isActive = document.getElementById('new-auto-delete-active').checked;
            
            if (!days || days < 1) {
                alert('Por favor, informe um número de dias válido.');
                return;
            }
            
            try {
                const response = await fetch(`${API_URL}/users/auto-delete-config`, {
                    method: 'POST',
                    headers: HEADERS,
                    body: JSON.stringify({ days_after_expiration: days, is_active: isActive })
                });
                
                if (!response.ok) throw new Error('Erro ao salvar configuração');
                
                const result = await response.json();
                alert(result.message);
                document.getElementById('new-auto-delete-days').value = '';
                document.getElementById('new-auto-delete-active').checked = false;
                await openUserAutoDeleteModal();
            } catch (error) {
                console.error('Erro ao salvar configuração:', error);
                alert('Erro ao salvar configuração de exclusão automática.');
            }
        });
    }
    if (executeUserAutoDeleteBtn) {
        executeUserAutoDeleteBtn.addEventListener('click', () => {
            openExecuteDeleteModal();
        });
    }
    
    // Função para abrir modal de execução de exclusão
    function openExecuteDeleteModal() {
        const modal = document.getElementById('execute-delete-modal');
        if (!modal) {
            // Criar modal se não existir
            createExecuteDeleteModal();
        }
        document.getElementById('execute-delete-modal').classList.add('active');
        document.getElementById('execute-delete-days-input').value = '60';
        document.getElementById('execute-delete-days-input').focus();
    }
    
    // Função para criar modal de execução de exclusão
    function createExecuteDeleteModal() {
        const modalHTML = `
            <div id="execute-delete-modal" class="modal-overlay">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h4><i class="fas fa-broom"></i> Executar Exclusão de Usuários Vencidos</h4>
                        <button id="close-execute-delete-modal-btn" class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p style="color: var(--text-light); margin-bottom: 20px;">
                            Informe quantos dias após a expiração os usuários devem ter para serem excluídos.
                        </p>
                        <div class="input-group">
                            <label for="execute-delete-days-input">Dias após expiração:</label>
                            <input type="number" id="execute-delete-days-input" 
                                   class="modal-input-text" 
                                   min="1" 
                                   value="60" 
                                   placeholder="Ex: 60, 70, 90..."
                                   required>
                            <small style="color: var(--text-dark); margin-top: 5px; display: block;">
                                Usuários vencidos há mais de X dias serão excluídos permanentemente.
                            </small>
                        </div>
                        <div style="background: var(--bg-card); padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid var(--warning);">
                            <strong style="color: var(--warning);">
                                <i class="fas fa-exclamation-triangle"></i> Atenção:
                            </strong>
                            <p style="color: var(--text-light); margin-top: 8px; margin-bottom: 0;">
                                Esta ação é <strong>irreversível</strong>. Todos os dados dos usuários excluídos serão perdidos permanentemente.
                            </p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="cancel-execute-delete-btn" class="btn btn-secondary">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button id="confirm-execute-delete-btn" class="btn btn-danger">
                            <i class="fas fa-trash"></i> Executar Exclusão
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Event listeners para o modal
        const closeBtn = document.getElementById('close-execute-delete-modal-btn');
        const cancelBtn = document.getElementById('cancel-execute-delete-btn');
        const confirmBtn = document.getElementById('confirm-execute-delete-btn');
        const modal = document.getElementById('execute-delete-modal');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                const daysInput = document.getElementById('execute-delete-days-input');
                const days = parseInt(daysInput.value);
                
                if (!days || days < 1) {
                    alert('Por favor, informe um número de dias válido (maior que 0).');
                    daysInput.focus();
                    return;
                }
                
                if (!confirm(`Tem CERTEZA ABSOLUTA que deseja excluir usuários vencidos há mais de ${days} dias?\n\nEsta ação é IRREVERSÍVEL e todos os dados serão perdidos permanentemente.`)) {
                    return;
                }
                
                // Desabilitar botão durante execução
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executando...';
                
                try {
                    const response = await fetch(`${API_URL}/users/execute-auto-delete`, {
                        method: 'POST',
                        headers: HEADERS,
                        body: JSON.stringify({ days_after_expiration: days })
                    });
                    
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.message || 'Erro ao executar exclusão automática');
                    }
                    
                    const result = await response.json();
                    
                    modal.classList.remove('active');
                    
                    if (result.deleted > 0) {
                        alert(`${result.message}\n\n${result.deleted} usuário(s) foram excluído(s) permanentemente.`);
                    } else {
                        alert(`${result.message}`);
                    }
                    
                    loadDashboard(); // Recarregar usuários
                } catch (error) {
                    console.error('Erro ao executar exclusão automática:', error);
                    alert(`O Erro ao executar exclusão: ${error.message}`);
                } finally {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Executar Exclusão';
                }
            });
        }
        
        // Fechar modal ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }
    
    // Função para abrir modal de exclusão automática de usuários
    async function openUserAutoDeleteModal() {
        const modal = document.getElementById('auto-delete-modal');
        const configsList = document.getElementById('auto-delete-configs-list');
        
        try {
            const response = await fetch(`${API_URL}/users/auto-delete-config`, { headers: HEADERS });
            if (!response.ok) throw new Error('Erro ao carregar configurações');
            
            const configs = await response.json();
            
            configsList.innerHTML = '';
            if (configs.length === 0) {
                configsList.innerHTML = '<p style="color: var(--text-dark);">Nenhuma configuração encontrada.</p>';
            } else {
                configs.forEach(config => {
                    const configDiv = document.createElement('div');
                    configDiv.className = 'auto-delete-config-item';
                    configDiv.style.cssText = 'padding: 15px; background: var(--bg-card); border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;';
                    configDiv.innerHTML = `
                        <div>
                            <strong>${config.days_after_expiration} dias após expiração</strong>
                            <span style="color: var(--text-dark); margin-left: 10px;">
                                ${config.is_active ? '<span style="color: var(--success);">Ativo</span>' : '<span style="color: var(--text-dark);">< Inativo</span>'}
                            </span>
                        </div>
                        <button class="btn btn-danger delete-config-btn" data-id="${config.id}" data-days="${config.days_after_expiration}" style="margin-left: 10px;">
                            <i class="fas fa-trash"></i> Remover
                        </button>
                    `;
                    configsList.appendChild(configDiv);
                    
                    const deleteBtn = configDiv.querySelector('.delete-config-btn');
                    deleteBtn.addEventListener('click', async function() {
                        const days = this.dataset.days;
                        if (!confirm(`Tem certeza que deseja remover a configuração de ${days} dias?`)) {
                            return;
                        }
                        
                        try {
                            const response = await fetch(`${API_URL}/users/auto-delete-config`, {
                                method: 'POST',
                                headers: HEADERS,
                                body: JSON.stringify({ days_after_expiration: parseInt(days), is_active: false })
                            });
                            
                            if (!response.ok) throw new Error('Erro ao remover configuração');
                            
                            alert('Configuração removida com sucesso!');
                            await openUserAutoDeleteModal();
                        } catch (error) {
                            console.error('Erro ao remover configuração:', error);
                            alert('Erro ao remover configuração.');
                        }
                    });
                });
            }
            
            modal.classList.add('active');
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            alert('Erro ao carregar configurações de exclusão automática.');
        }
    }
    
    // ====== Event Listeners para Paginação ======
    const usersPrevPageBtn = document.getElementById('users-prev-page');
    const usersNextPageBtn = document.getElementById('users-next-page');
    const usersPerPageSelect = document.getElementById('users-per-page');
    
    if (usersPrevPageBtn) {
        usersPrevPageBtn.addEventListener('click', () => {
            if (currentUsersPage > 1) {
                currentUsersPage--;
                const filtered = getUserFiltered();
                applyUserPagination(filtered);
            }
        });
    }
    
    if (usersNextPageBtn) {
        usersNextPageBtn.addEventListener('click', () => {
            const filtered = getUserFiltered();
            const perPage = usersPerPage === 'all' ? filtered.length : parseInt(usersPerPage);
            const totalPages = Math.ceil(filtered.length / perPage);
            if (currentUsersPage < totalPages) {
                currentUsersPage++;
                applyUserPagination(filtered);
            }
        });
    }
    
    if (usersPerPageSelect) {
        usersPerPageSelect.addEventListener('change', (e) => {
            usersPerPage = e.target.value;
            currentUsersPage = 1;
            const filtered = getUserFiltered();
            applyUserPagination(filtered);
        });
    }
    
    const codesPrevPageBtn = document.getElementById('codes-prev-page');
    const codesNextPageBtn = document.getElementById('codes-next-page');
    const codesPerPageSelect = document.getElementById('codes-per-page');
    
    if (codesPrevPageBtn) {
        codesPrevPageBtn.addEventListener('click', () => {
            if (currentCodesPage > 1) {
                currentCodesPage--;
                const filtered = getFilteredCodes();
                applyCodePagination(filtered);
            }
        });
    }
    
    if (codesNextPageBtn) {
        codesNextPageBtn.addEventListener('click', () => {
            const filtered = getFilteredCodes();
            const perPage = codesPerPage === 'all' ? filtered.length : parseInt(codesPerPage);
            const totalPages = Math.ceil(filtered.length / perPage);
            if (currentCodesPage < totalPages) {
                currentCodesPage++;
                applyCodePagination(filtered);
            }
        });
    }
    
    if (codesPerPageSelect) {
        codesPerPageSelect.addEventListener('change', (e) => {
            codesPerPage = e.target.value;
            currentCodesPage = 1;
            const filtered = getFilteredCodes();
            applyCodePagination(filtered);
        });
    }
    
    // ====== Event Listeners para Filtros Avançados de Usuários ======
    const toggleAdvancedFiltersBtn = document.getElementById('toggle-advanced-filters');
    const applyAdvancedFiltersBtn = document.getElementById('apply-advanced-filters');
    const clearAdvancedFiltersBtn = document.getElementById('clear-advanced-filters');
    
    if (toggleAdvancedFiltersBtn) {
        toggleAdvancedFiltersBtn.addEventListener('click', () => {
            const content = document.getElementById('advanced-filters-content');
            const icon = toggleAdvancedFiltersBtn.querySelector('i');
            if (content) {
                const isVisible = content.style.display !== 'none';
                content.style.display = isVisible ? 'none' : 'grid';
                if (icon) {
                    icon.className = isVisible ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
                }
                toggleAdvancedFiltersBtn.innerHTML = isVisible 
                    ? '<i class="fas fa-chevron-down"></i> Mostrar'
                    : '<i class="fas fa-chevron-up"></i> Ocultar';
            }
        });
    }
    
    if (applyAdvancedFiltersBtn) {
        applyAdvancedFiltersBtn.addEventListener('click', () => {
            advancedUserFilters.accountType = document.getElementById('filter-account-type')?.value || '';
            advancedUserFilters.subscriptionStatus = document.getElementById('filter-subscription-status')?.value || '';
            advancedUserFilters.isAdmin = document.getElementById('filter-is-admin')?.value || '';
            advancedUserFilters.createdFrom = document.getElementById('filter-created-from')?.value || '';
            advancedUserFilters.createdTo = document.getElementById('filter-created-to')?.value || '';
            
            applyUserFilter();
        });
    }
    
    if (clearAdvancedFiltersBtn) {
        clearAdvancedFiltersBtn.addEventListener('click', () => {
            advancedUserFilters = {
                accountType: '',
                subscriptionStatus: '',
                isAdmin: '',
                createdFrom: '',
                createdTo: ''
            };
            
            document.getElementById('filter-account-type').value = '';
            document.getElementById('filter-subscription-status').value = '';
            document.getElementById('filter-is-admin').value = '';
            document.getElementById('filter-created-from').value = '';
            document.getElementById('filter-created-to').value = '';
            
            applyUserFilter();
        });
    }
    
    // ====== Event Listeners para Filtros Avançados de Códigos ======
    const toggleAdvancedFiltersCodesBtn = document.getElementById('toggle-advanced-filters-codes');
    const applyAdvancedFiltersCodesBtn = document.getElementById('apply-advanced-filters-codes');
    const clearAdvancedFiltersCodesBtn = document.getElementById('clear-advanced-filters-codes');
    
    if (toggleAdvancedFiltersCodesBtn) {
        toggleAdvancedFiltersCodesBtn.addEventListener('click', () => {
            const content = document.getElementById('advanced-filters-content-codes');
            if (content) {
                const isVisible = content.style.display !== 'none';
                content.style.display = isVisible ? 'none' : 'grid';
                toggleAdvancedFiltersCodesBtn.innerHTML = isVisible 
                    ? '<i class="fas fa-chevron-down"></i> Mostrar'
                    : '<i class="fas fa-chevron-up"></i> Ocultar';
            }
        });
    }
    
    function updateFiltersActiveBarCodes() {
        const bar = document.getElementById('codes-filters-active-bar');
        const textEl = document.getElementById('codes-filters-active-text');
        const filterVal = (document.getElementById('filter-input') || {}).value || '';
        const hasSearch = filterVal.trim() !== '';
        const hasQuick = currentCodeQuickFilter !== 'all';
        const hasAdvanced = advancedCodeFilters.status || (advancedCodeFilters.generator || '').trim() || advancedCodeFilters.createdFrom || advancedCodeFilters.createdTo;
        const active = hasSearch || hasQuick || hasAdvanced;
        if (!bar || !textEl) return;
        if (!active) { bar.style.display = 'none'; return; }
        const parts = [];
        if (hasSearch) parts.push('busca');
        if (hasQuick) parts.push(currentCodeQuickFilter === 'claimed' ? 'cadastrados' : 'não cadastrados');
        if (hasAdvanced) parts.push('filtros avançados');
        textEl.textContent = 'Filtros ativos: ' + parts.join(', ');
        bar.style.display = 'flex';
    }
    
    function clearAllCodeFilters() {
        const input = document.getElementById('filter-input');
        if (input) input.value = '';
        currentCodeQuickFilter = 'all';
        document.querySelectorAll('#code-filter-all-btn, #code-filter-claimed-btn, #code-filter-available-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.codeFilter === 'all') btn.classList.add('active');
        });
        advancedCodeFilters = { status: '', generator: '', createdFrom: '', createdTo: '' };
        const fs = document.getElementById('filter-code-status');
        const fg = document.getElementById('filter-code-generator');
        const ff = document.getElementById('filter-code-created-from');
        const ft = document.getElementById('filter-code-created-to');
        if (fs) fs.value = ''; if (fg) fg.value = ''; if (ff) ff.value = ''; if (ft) ft.value = '';
        currentCodesPage = 1;
        const filtered = getFilteredCodes();
        applyCodePagination(filtered);
        updateCodeStats(filtered);
        updateFiltersActiveBarCodes();
    }
    
    if (applyAdvancedFiltersCodesBtn) {
        applyAdvancedFiltersCodesBtn.addEventListener('click', () => {
            advancedCodeFilters.status = document.getElementById('filter-code-status')?.value || '';
            advancedCodeFilters.generator = (document.getElementById('filter-code-generator')?.value || '').trim();
            advancedCodeFilters.createdFrom = document.getElementById('filter-code-created-from')?.value || '';
            advancedCodeFilters.createdTo = document.getElementById('filter-code-created-to')?.value || '';
            const filtered = getFilteredCodes();
            currentCodesPage = 1;
            applyCodePagination(filtered);
            updateCodeStats(filtered);
            updateFiltersActiveBarCodes();
        });
    }
    
    if (clearAdvancedFiltersCodesBtn) {
        clearAdvancedFiltersCodesBtn.addEventListener('click', () => {
            clearAllCodeFilters();
        });
    }
    
    document.getElementById('codes-clear-all-filters-btn')?.addEventListener('click', clearAllCodeFilters);
    document.getElementById('codes-empty-state-clear-btn')?.addEventListener('click', clearAllCodeFilters);
    
    document.querySelectorAll('#code-filter-all-btn, #code-filter-claimed-btn, #code-filter-available-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            currentCodeQuickFilter = this.dataset.codeFilter || 'all';
            document.querySelectorAll('#code-filter-all-btn, #code-filter-claimed-btn, #code-filter-available-btn').forEach(b => {
                b.classList.remove('active');
                if (b.dataset.codeFilter === currentCodeQuickFilter) b.classList.add('active');
            });
            currentCodesPage = 1;
            const filtered = getFilteredCodes();
            applyCodePagination(filtered);
            updateCodeStats(filtered);
            updateFiltersActiveBarCodes();
        });
    });
    
    // Clique nos cards de estatísticas de códigos aplica o filtro correspondente
    document.querySelectorAll('#codes-pane .stat-card-clickable[data-code-quick-filter]').forEach(card => {
        card.addEventListener('click', function() {
            const filter = this.getAttribute('data-code-quick-filter') || 'all';
            currentCodeQuickFilter = filter;
            document.querySelectorAll('#code-filter-all-btn, #code-filter-claimed-btn, #code-filter-available-btn').forEach(b => {
                b.classList.remove('active');
                if (b.dataset.codeFilter === currentCodeQuickFilter) b.classList.add('active');
            });
            currentCodesPage = 1;
            const filtered = getFilteredCodes();
            applyCodePagination(filtered);
            updateCodeStats(filtered);
            updateFiltersActiveBarCodes();
        });
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.click(); }
        });
    });
    
    (function() {
        const codeFilterInput = document.getElementById('filter-input');
        if (codeFilterInput) codeFilterInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); applyTextFilter(); }
        });
    })();
    
    const CODES_COLUMNS = [
        { id: 'num', label: '#' },
        { id: 'code', label: 'Código' },
        { id: 'link', label: 'Link' },
        { id: 'status', label: 'Status' },
        { id: 'expiration_status', label: 'Status Vencimento' },
        { id: 'expires_at', label: 'Expira em' },
        { id: 'claimed_by', label: 'Utilizado por' },
        { id: 'claimed_at', label: 'Data de Utilização' },
        { id: 'generated_by', label: 'Gerado por' },
        { id: 'created_at', label: 'Data de Criação' },
        { id: 'time_since', label: 'Tempo desde Criação' }
    ];
    const CODES_COLUMNS_STORAGE_KEY = 'adminCodesVisibleCols';
    function getVisibleColumnsCodes() {
        try {
            const s = localStorage.getItem(CODES_COLUMNS_STORAGE_KEY);
            if (s) { const arr = JSON.parse(s); if (Array.isArray(arr)) return arr; }
        } catch (e) {}
        return CODES_COLUMNS.map(c => c.id);
    }
    function setVisibleColumnsCodes(ids) {
        localStorage.setItem(CODES_COLUMNS_STORAGE_KEY, JSON.stringify(ids));
        CODES_COLUMNS.forEach(col => {
            const th = document.querySelector('#codes-table thead th[data-col="' + col.id + '"]');
            const tds = document.querySelectorAll('#codes-table tbody td[data-col="' + col.id + '"]');
            const visible = ids.indexOf(col.id) !== -1;
            [th, ...tds].forEach(el => { if (el) el.classList.toggle('col-hidden', !visible); });
        });
    }
    setVisibleColumnsCodes(getVisibleColumnsCodes());
    window._applyCodesColumnVisibility = function() { setVisibleColumnsCodes(getVisibleColumnsCodes()); };
    
    const codesColumnsToggle = document.getElementById('codes-columns-toggle');
    const codesColumnsDropdown = document.getElementById('codes-columns-dropdown');
    if (codesColumnsToggle && codesColumnsDropdown) {
        codesColumnsDropdown.innerHTML = CODES_COLUMNS.map(col => {
            const checked = getVisibleColumnsCodes().indexOf(col.id) !== -1;
            return '<label><input type="checkbox" data-col="' + col.id + '" ' + (checked ? 'checked' : '') + '> ' + col.label + '</label>';
        }).join('');
        codesColumnsToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            const open = codesColumnsDropdown.style.display === 'block';
            codesColumnsDropdown.style.display = open ? 'none' : 'block';
            codesColumnsToggle.setAttribute('aria-expanded', !open);
        });
        codesColumnsDropdown.querySelectorAll('input').forEach(cb => {
            cb.addEventListener('change', function() {
                const ids = Array.from(codesColumnsDropdown.querySelectorAll('input:checked')).map(i => i.dataset.col);
                setVisibleColumnsCodes(ids.length ? ids : CODES_COLUMNS.map(c => c.id));
            });
        });
        document.addEventListener('click', function() { codesColumnsDropdown.style.display = 'none'; codesColumnsToggle.setAttribute('aria-expanded', 'false'); });
        codesColumnsDropdown.addEventListener('click', function(e) { e.stopPropagation(); });
    }
    
    (function setupCodesColumnResize() {
        const thead = document.querySelector('#codes-table thead');
        if (!thead) return;
        thead.querySelectorAll('th').forEach(th => {
            const handle = document.createElement('span');
            handle.className = 'resize-handle';
            handle.setAttribute('aria-hidden', 'true');
            th.appendChild(handle);
            let startX = 0, startW = 0;
            handle.addEventListener('mousedown', function(e) {
                e.preventDefault();
                startX = e.pageX;
                startW = th.offsetWidth;
                const onMove = function(e2) {
                    const newW = Math.max(40, startW + (e2.pageX - startX));
                    th.style.width = newW + 'px';
                    th.style.minWidth = newW + 'px';
                };
                const onUp = function() {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        });
    })();
    
    function showCodesTableLoading(show) {
        const el = document.getElementById('codes-table-loading');
        const container = document.getElementById('codes-table-container');
        if (el) el.style.display = show ? 'flex' : 'none';
        if (container) container.style.display = show ? 'none' : 'block';
    }
    const origApplyCodePagination = applyCodePagination;
    applyCodePagination = function(codes) {
        showCodesTableLoading(true);
        setTimeout(() => {
            origApplyCodePagination(codes);
            showCodesTableLoading(false);
        }, 80);
    };
    
    navLinks.forEach(link => {
        if (link.dataset.target === 'codes-pane') {
            link.addEventListener('click', function() {
                setTimeout(() => {
                    if (document.getElementById('codes-pane')?.classList.contains('active')) {
                        document.getElementById('filter-input')?.focus();
                    }
                }, 100);
            });
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const codesFilter = document.getElementById('filter-input');
            if (document.activeElement === codesFilter && codesFilter?.value) {
                codesFilter.value = '';
                applyTextFilter();
            }
            if (codesColumnsDropdown?.style.display === 'block') {
                codesColumnsDropdown.style.display = 'none';
                codesColumnsToggle?.setAttribute('aria-expanded', 'false');
            }
        }
        if (document.getElementById('codes-pane')?.classList.contains('active')) {
            if (e.ctrlKey && e.key === 'f') { e.preventDefault(); document.getElementById('filter-input')?.focus(); return; }
            if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName)) { e.preventDefault(); document.getElementById('filter-input')?.focus(); }
        }
    });
    
    // ====== Event Listeners para Exportação ======
    const exportAllUsersBtn = document.getElementById('export-all-users-btn');
    if (exportAllUsersBtn) {
        exportAllUsersBtn.addEventListener('click', () => {
            exportUsersToCSV(allUsers, 'todos_usuarios');
        });
    }
    
    const exportAllCodesBtn = document.getElementById('export-all-codes-btn');
    if (exportAllCodesBtn) {
        exportAllCodesBtn.addEventListener('click', () => {
            exportCodesToCSV(allCodes, 'todos_codigos');
        });
    }
    
    // Função para exportar usuários para CSV
    function exportUsersToCSV(users, filename) {
        const headers = ['#', 'Nome', 'Email', 'Tipo de Conta', 'Status Assinatura', 'Expira em', 'Status Vencimento', 'Conta Principal', 'Status Admin', 'Data de Criação'];
        const rows = users.map((u, index) => {
            let expirationStatus = 'N/A';
            if (u.subscription_expires_at) {
                const now = new Date();
                const exp = new Date(u.subscription_expires_at);
                const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
                expirationStatus = daysLeft >= 0 ? `Faltam ${daysLeft} dias` : `Vencido há ${Math.abs(daysLeft)} dias`;
            }
            
            return [
                index + 1,
                u.display_name || 'N/A',
                u.email,
                u.account_type,
                u.subscription_status || 'N/A',
                u.subscription_expires_at ? new Date(u.subscription_expires_at).toLocaleDateString('pt-BR') : 'N/A',
                expirationStatus,
                u.parent_email || 'N/A',
                u.is_admin ? 'Sim' : 'Não',
                new Date(u.created_at).toLocaleDateString('pt-BR')
            ];
        });
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }
    
    function exportCodesToCSV(codes, filename) {
        const headers = ['#', 'Código', 'Link', 'Status', 'Status Vencimento', 'Expira em', 'Utilizado por', 'Data de Utilização', 'Gerado por', 'Data de Criação', 'Tempo desde Criação'];
        const rows = codes.map((code, index) => {
            const now = new Date();
            const createdDate = new Date(code.created_at);
            const daysSinceCreation = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
            let timeSinceCreation = daysSinceCreation === 0 ? 'Hoje' : daysSinceCreation === 1 ? '1 dia atrás' : daysSinceCreation < 30 ? `${daysSinceCreation} dias atrás` : daysSinceCreation < 365 ? `${Math.floor(daysSinceCreation / 30)} ${Math.floor(daysSinceCreation / 30) === 1 ? 'mês' : 'meses'} atrás` : `${Math.floor(daysSinceCreation / 365)} ${Math.floor(daysSinceCreation / 365) === 1 ? 'ano' : 'anos'} atrás`;
            let expirationStatus = 'N/A';
            let expiresAtFormatted = 'N/A';
            if (code.expires_at) {
                const exp = new Date(code.expires_at);
                expiresAtFormatted = exp.toLocaleDateString('pt-BR');
                const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
                expirationStatus = daysLeft >= 0 ? (daysLeft === 0 ? 'Vence hoje' : `Faltam ${daysLeft} dia(s)`) : `Vencido há ${Math.abs(daysLeft)} dia(s)`;
            }
            return [
                index + 1,
                code.code,
                `https://tag.conectaking.com.br/${code.code}`,
                code.is_claimed ? 'Utilizado' : 'Disponível',
                expirationStatus,
                expiresAtFormatted,
                code.claimed_by_email || 'N/A',
                code.claimed_at ? new Date(code.claimed_at).toLocaleDateString('pt-BR') : 'N/A',
                code.generated_by_email || 'Admin',
                new Date(code.created_at).toLocaleDateString('pt-BR'),
                timeSinceCreation
            ];
        });
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }
    
    // Event listener para deletar usuário
    document.querySelector('#users-table')?.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-user-btn')) {
            const btn = e.target.closest('.delete-user-btn');
            const userId = btn.dataset.id;
            const userName = btn.dataset.name;
            
            if (!confirm(`Tem certeza que deseja deletar o usuário "${userName}"? Esta ação é irreversível e deletará todos os dados associados.`)) {
                return;
            }
            
            try {
                const response = await fetch(`${API_URL}/users/${userId}`, { 
                    method: 'DELETE', 
                    headers: HEADERS 
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Erro ao deletar usuário');
                }
                
                alert('Usuário deletado com sucesso.');
                loadDashboard();
            } catch (error) {
                console.error('Erro ao deletar usuário:', error);
                alert(`Erro ao deletar usuário: ${error.message}`);
            }
        }
    });
    
    // Event listeners para ações em massa de usuários
    const deleteSelectedUsersBtn = document.getElementById('delete-selected-users-btn');
    const exportSelectedUsersBtn = document.getElementById('export-selected-users-btn');
    const clearSelectionBtn = document.getElementById('clear-selection-btn');
    
    if (deleteSelectedUsersBtn) {
        deleteSelectedUsersBtn.addEventListener('click', async () => {
            const selectedUsers = getSelectedUsers();
            if (selectedUsers.length === 0) {
                alert('Nenhum usuário selecionado!');
                return;
            }
            
            if (!confirm(`Tem certeza que deseja deletar ${selectedUsers.length} usuário(s) selecionado(s)? Esta ação é irreversível.`)) {
                return;
            }
            
            try {
                const deletePromises = selectedUsers.map(userId => 
                    fetch(`${API_URL}/users/${userId}`, { 
                        method: 'DELETE', 
                        headers: HEADERS 
                    })
                );
                
                const responses = await Promise.all(deletePromises);
                const failed = responses.filter(r => !r.ok);
                
                if (failed.length > 0) {
                    throw new Error(`${failed.length} usuário(s) falharam na deleção`);
                }
                
                alert(`${selectedUsers.length} usuário(s) deletado(s) com sucesso!`);
                loadDashboard();
            } catch (error) {
                console.error('Erro ao deletar usuários:', error);
                alert(`Erro ao deletar usuários: ${error.message}`);
            }
        });
    }
    
    if (exportSelectedUsersBtn) {
        exportSelectedUsersBtn.addEventListener('click', () => {
            const selectedUsers = getSelectedUsers();
            if (selectedUsers.length === 0) {
                alert('Nenhum usuário selecionado!');
                return;
            }
            
            const selectedUserData = allUsers.filter(u => selectedUsers.includes(u.id));
            exportUsersToCSV(selectedUserData, 'usuarios_selecionados');
        });
    }
    
    const exportSelectedUsersExcelBtn = document.getElementById('export-selected-users-excel-btn');
    if (exportSelectedUsersExcelBtn) {
        exportSelectedUsersExcelBtn.addEventListener('click', () => {
            const selectedUsers = getSelectedUsers();
            if (selectedUsers.length === 0) {
                alert('Nenhum usuário selecionado!');
                return;
            }
            
            const selectedUserData = allUsers.filter(u => selectedUsers.includes(u.id));
            exportUsersToExcel(selectedUserData, 'usuarios_selecionados');
        });
    }
    
    const changeAccountTypeBulkBtn = document.getElementById('change-account-type-bulk-btn');
    if (changeAccountTypeBulkBtn) {
        changeAccountTypeBulkBtn.addEventListener('click', () => {
            const selectedUsers = getSelectedUsers();
            if (selectedUsers.length === 0) {
                alert('Nenhum usuário selecionado!');
                return;
            }
            
            const newAccountType = prompt(`Alterar tipo de conta para ${selectedUsers.length} usuário(s).\n\nDigite o novo tipo:\n(basic, premium, king_base, king_finance, king_finance_plus, king_premium_plus, king_corporate, team_member, free)`);
            if (!newAccountType) return;
            
            if (!confirm(`Tem certeza que deseja alterar o tipo de conta de ${selectedUsers.length} usuário(s) para "${newAccountType}"?`)) {
                return;
            }
            
            // Implementar alteração em massa via API
            changeUsersAccountTypeBulk(selectedUsers, newAccountType);
        });
    }
    
    // Função para alterar tipo de conta em massa
    async function changeUsersAccountTypeBulk(userIds, newAccountType) {
        try {
            const promises = userIds.map(userId => 
                fetch(`${API_URL}/users/${userId}`, {
                    method: 'PUT',
                    headers: HEADERS,
                    body: JSON.stringify({ account_type: newAccountType })
                })
            );
            
            const responses = await Promise.all(promises);
            const failed = responses.filter(r => !r.ok);
            
            if (failed.length > 0) {
                const errorData = await failed[0].json();
                throw new Error(errorData.message || `${failed.length} usuário(s) falharam na atualização`);
            }
            
            alert(`${userIds.length} usuário(s) atualizado(s) com sucesso!`);
            loadDashboard();
        } catch (error) {
            console.error('Erro ao alterar tipo de conta:', error);
            alert(`Erro ao alterar tipo de conta: ${error.message}`);
        }
    }
    
    // Função para exportar para Excel (formato CSV com extensão .xlsx ou usar biblioteca)
    function exportUsersToExcel(users, filename) {
        // Por enquanto, exportar como CSV (Excel pode abrir CSV)
        // Para verdadeiro Excel, seria necessário biblioteca como xlsx.js
        exportUsersToCSV(users, filename);
        alert('Arquivo exportado como CSV (pode ser aberto no Excel)');
    }
    
    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.user-checkbox');
            checkboxes.forEach(checkbox => checkbox.checked = false);
            const selectAllCheckbox = document.getElementById('select-all-users');
            if (selectAllCheckbox) selectAllCheckbox.checked = false;
            updateUserSelectedCount();
        });
    }
    
    // Event listener para deletar código (atualizado para usar delete-code-btn)
    document.querySelector('#codes-table')?.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-code-btn')) {
            const code = e.target.closest('.delete-code-btn').dataset.code;
            if (confirm(`Tem certeza que deseja deletar o código ${code}?`)) {
                try {
                    const response = await fetch(`${API_URL}/codes/${code}`, { method: 'DELETE', headers: HEADERS });
                    if (!response.ok) throw new Error((await response.json()).message);
                    alert('Código deletado com sucesso.');
                    await loadCodes();
                } catch (error) {
                    alert(`Erro ao deletar código: ${error.message}`);
                }
            }
        }
    });

    // Botão de refresh
    const refreshBtn = document.getElementById('refresh-data-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            /* console.log removed (encoding) */
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
            refreshBtn.disabled = true;
            
            try {
                await loadDashboard();
                /* console.log removed (encoding) */
            } catch (error) {
                console.error('O Erro ao atualizar dados:', error);
                alert('Erro ao atualizar dados. Verifique o console para mais detalhes.');
            } finally {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar';
                refreshBtn.disabled = false;
            }
        });
    }

    // Fechar modal de analytics de perfil
    const closeProfileAnalyticsBtn = document.getElementById('close-profile-analytics-btn');
    const profileAnalyticsModal = document.getElementById('profile-analytics-modal');
    
    function closeProfileAnalyticsModal() {
        if (profileAnalyticsModal) {
            profileAnalyticsModal.classList.remove('active');
            profileAnalyticsModal.style.display = 'none';
            document.body.style.overflow = ''; // Restaurar scroll
        }
    }
    
    if (closeProfileAnalyticsBtn) {
        closeProfileAnalyticsBtn.addEventListener('click', closeProfileAnalyticsModal);
    }
    
    if (profileAnalyticsModal) {
        profileAnalyticsModal.addEventListener('click', (e) => {
            if (e.target === profileAnalyticsModal) {
                closeProfileAnalyticsModal();
            }
        });
    }
    
    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && profileAnalyticsModal && profileAnalyticsModal.classList.contains('active')) {
            closeProfileAnalyticsModal();
        }
    });

    // Testar conectividade antes de carregar dados
    testAPIConnectivity().then(isConnected => {
        if (isConnected) {
            loadDashboard();
        } else {
            console.error('O API não conectada');
            // Mesmo sem conexão, carregar com dados vazios
            loadDashboard();
        }
        setupUserSorting();
    });
});