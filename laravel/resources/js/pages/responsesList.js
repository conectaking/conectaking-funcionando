import '../vendor-globals.js';
/** responsesList — Vite entry (extracted inline) */
import '@css/dashboard.css';
import '@mod/js/ck-auth-gate.js';
import '@mod/js/ck-csrf.js';

const API_URL = (typeof window !== 'undefined' && (window.API_BASE || window.API_URL || window.location.origin) || '').toString().replace(/\/$/, '');
        const urlParams = new URLSearchParams(window.location.search);
        const itemId = urlParams.get('itemId');
        
        // Função para obter headers de autenticação
        function getHeaders() {
            let token = '';
            try {
                if (window.CkAuth && typeof window.CkAuth.lsToken === 'function') {
                    token = window.CkAuth.lsToken() || '';
                }
            } catch (e) {}
            if (!token) {
                token = localStorage.getItem('conectaKingToken') ||
                       localStorage.getItem('authToken') ||
                       sessionStorage.getItem('authToken') ||
                       localStorage.getItem('userToken') ||
                       sessionStorage.getItem('userToken') ||
                       localStorage.getItem('token') ||
                       sessionStorage.getItem('token') || '';
            }
            if (!token) {
                const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
                if (userData) {
                    try {
                        const user = JSON.parse(userData);
                        token = user.token || user.authToken || user.accessToken || '';
                    } catch (e) {
                        console.warn('Não foi possível parsear dados do usuário');
                    }
                }
            }
            const h = { 'Content-Type': 'application/json' };
            if (token) h['Authorization'] = `Bearer ${token}`;
            return h;
        }

        const __rawFetch = window.fetch.bind(window);
        function fetch(url, init) {
            return __rawFetch(url, Object.assign({ credentials: 'include' }, init || {}));
        }
        
        let allData = [];
        let currentFilter = 'all';
        let isGuestListMode = false;
        let formFields = []; // Campos do formulário para mapear labels
        let leadLetterFilter = 'all';
        let leadSortMode = 'recent'; // recent | az | za
        let leadStatusFilter = 'all'; // all | pending | contacted | favorite
        let leadLeaderFilter = 'all';
        let leadGroupByDate = true;
        let __leadFilteredCache = [];
        let guestListTokens = {
            registration_token: null,
            confirmation_token: null,
            public_view_token: null,
            share_token: null, // Token do King Forms (profile_items.share_token)
            cadastro_slug: null // Slug personalizado para link de cadastro
        };
        
        // Sistema de cache e controle de requisições para evitar rate limiting
        const requestCache = new Map();
        const CACHE_TTL = 60000; // 60 segundos de cache
        let isAnyRequestPending = false;
        const REQUEST_DELAY = 500; // 500ms entre requisições (aumentado)
        
        // Função para fazer requisição com cache e delay
        async function cachedFetch(url, options = {}) {
            const cacheKey = `${options.method || 'GET'}:${url}`;
            const cached = requestCache.get(cacheKey);
            const now = Date.now();
            
            // Se há cache válido e não é requisição POST/PUT/DELETE, retornar cache
            if (cached && (now - cached.timestamp) < CACHE_TTL && (!options.method || options.method === 'GET')) {
                return new Response(JSON.stringify(cached.data), {
                    ok: true,
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // Aguardar se há requisição pendente
            if (isAnyRequestPending) {
                await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
            }
            
            isAnyRequestPending = true;
            try {
                // Delay antes da requisição
                await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY / 2));
                
                const response = await fetch(url, options);
                
                // Delay após a requisição
                await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY / 2));
                
                // Se foi bem-sucedida e é GET, salvar no cache
                if (response.ok && (!options.method || options.method === 'GET')) {
                    const data = await response.json();
                    requestCache.set(cacheKey, {
                        data: data,
                        timestamp: now
                    });
                    // Retornar nova Response com dados em cache
                    return new Response(JSON.stringify(data), {
                        ok: true,
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                return response;
            } finally {
                isAnyRequestPending = false;
            }
        }
        
        // Limpar cache após 5 minutos
        setInterval(() => {
            const now = Date.now();
            for (const [key, value] of requestCache.entries()) {
                if (now - value.timestamp > CACHE_TTL * 2) {
                    requestCache.delete(key);
                }
            }
        }, 300000);
        
        
        // Detectar modo: Check-in (lista+QR+chegada) vs Captação de Clientes (só respostas)
        async function detectMode() {
            try {
                const headers = getHeaders();
                if (!headers || Object.keys(headers).length === 0) {
                    isGuestListMode = false;
                    return;
                }
                
                // IMPORTANTE: Usar cachedFetch com delay para evitar rate limiting
                await new Promise(resolve => setTimeout(resolve, 300)); // Delay inicial
                
                const itemRes = await cachedFetch(`${API_URL}/api/profile/items/${itemId}`, {
                    headers: headers
                });
                
                if (itemRes.ok) {
                    const itemData = await itemRes.json();
                    const item = itemData.data || itemData;
                    
                    // Item nativo de portaria/lista
                    if (item && item.item_type === 'guest_list') {
                        isGuestListMode = true;
                        return;
                    }
                    
                    // King Forms: Captação vs Check-in pelas flags (não pela existência de guest_list_items)
                    const dfi = item?.digital_form_data || {};
                    let mode = (dfi.send_mode || '').toString().toLowerCase();
                    if (mode === 'system-only') mode = 'checkin';
                    if (mode === 'both' || mode === 'whatsapp-only') mode = 'lead';
                    const glOn = dfi.enable_guest_list_submit === true || dfi.enable_guest_list_submit === 'true' || dfi.enable_guest_list_submit === 1 || dfi.enable_guest_list_submit === '1';
                    if (mode === 'checkin' || (mode !== 'lead' && glOn)) {
                        isGuestListMode = true;
                        return;
                    }
                    if (mode === 'lead' || dfi.enable_guest_list_submit === false || dfi.enable_guest_list_submit === 'false') {
                        isGuestListMode = false;
                        return;
                    }
                }
            } catch (e) {
                console.warn('Erro ao detectar modo:', e);
            }
            
            isGuestListMode = false;
        }
        
        // Carregar dados
        async function loadData() {
            const loadingEl = document.getElementById('loading');
            const contentEl = document.getElementById('content');
            const emptyEl = document.getElementById('empty');
            
            if (!loadingEl || !contentEl || !emptyEl) {
                console.error('[loadData] Elementos do DOM não encontrados!');
                return;
            }

            if (window.CkAuth && typeof window.CkAuth.requireAuth === 'function') {
                const ok = await window.CkAuth.requireAuth('/login');
                if (!ok) return;
            }
            
            try {
                loadingEl.style.display = 'block';
                contentEl.style.display = 'none';
                emptyEl.style.display = 'none';
                
                await detectMode();
                
                if (isGuestListMode) {
                    await loadGuestListData();
                } else {
                    await loadFormResponsesData();
                }
                
            } catch (error) {
                console.error('[loadData] Erro capturado:', error);
                console.error('[loadData] Stack:', error.stack);
                document.getElementById('loading').style.display = 'block';
                document.getElementById('content').style.display = 'none';
                document.getElementById('empty').style.display = 'none';
                
                let errorMessage = 'Erro ao carregar dados';
                if (error.message) {
                    errorMessage = error.message;
                } else if (typeof error === 'string') {
                    errorMessage = error;
                }
                
                // Se for erro de autenticação, redirecionar
                if (errorMessage.includes('Autenticação') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
                    setTimeout(() => {
                        alert('Sua sessão expirou. Por favor, faça login novamente.');
                        window.location.href = '/dashboard';
                    }, 1000);
                    return;
                }
                
                document.getElementById('loading').innerHTML = `
                    <div style="color: #ff4444; text-align: center; padding: 40px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 16px; color: #ff4444;"></i>
                        <h3 style="color: #ff4444; margin-bottom: 12px;">Erro ao Carregar Dados</h3>
                        <div style="color: #ECECEC; margin-bottom: 20px;">${escapeHtml(errorMessage)}</div>
                        <button onclick="location.reload()" style="padding: 12px 24px; background: linear-gradient(135deg, #4A90E2, #357ABD); border: none; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer;">
                            <i class="fas fa-redo"></i> Tentar Novamente
                        </button>
                    </div>
                `;
            }
        }
        
        // Carregar dados de lista de convidados
        async function loadGuestListData() {
            try {
                // Verificar elementos do DOM
                const pageTitleEl = document.getElementById('page-title');
                const loadingEl = document.getElementById('loading');
                const contentEl = document.getElementById('content');
                const tabsContainerEl = document.getElementById('tabs-container');
                
                if (!loadingEl || !contentEl) {
                    console.error('[loadGuestListData] Elementos loading ou content não encontrados!');
                    throw new Error('Elementos do DOM não encontrados');
                }
                
                if (pageTitleEl) {
                    pageTitleEl.textContent = 'Confirmação de Check-in';
                }
                
                // Cookie-first: Content-Type sempre existe — não usar length === 0
                const headersForFetch = getHeaders();
                let hasAuth = !!(headersForFetch && headersForFetch.Authorization);
                if (!hasAuth && window.CkAuth && typeof window.CkAuth.probeCookieAuth === 'function') {
                    hasAuth = await window.CkAuth.probeCookieAuth();
                }
                if (!hasAuth) {
                    console.error('[loadGuestListData] Sessão não autenticada');
                    loadingEl.innerHTML = `
                        <div style="color: #ff4444; text-align: center; padding: 40px;">
                            <i class="fas fa-lock" style="font-size: 3rem; margin-bottom: 16px;"></i>
                            <h3 style="color: #ff4444; margin-bottom: 12px;">Autenticação Necessária</h3>
                            <div style="color: #ECECEC; margin-bottom: 20px;">Por favor, faça login novamente.</div>
                            <button onclick="window.location.href='/login'" style="padding: 12px 24px; background: linear-gradient(135deg, #4A90E2, #357ABD); border: none; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer;">
                                <i class="fas fa-sign-in-alt"></i> Ir para Login
                            </button>
                        </div>
                    `;
                    return;
                }
                
                
                // IMPORTANTE: Usar cachedFetch para reduzir requisições
                const profileItemRes = await cachedFetch(`${API_URL}/api/profile/items/${itemId}`, {
                    headers: headersForFetch
                });
                
                if (profileItemRes.ok) {
                    const profileItemData = await profileItemRes.json();
                    guestListTokens.share_token = profileItemData.data?.share_token || null;
                }
                
                // IMPORTANTE: Delay antes da requisição principal
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Buscar tokens da lista (para confirmação e portaria) - usar cache
                const listInfoRes = await cachedFetch(`${API_URL}/api/guest-lists/${itemId}`, {
                    headers: headersForFetch
                });
                
                if (listInfoRes.ok) {
                    const listInfo = await listInfoRes.json();
                    guestListTokens.registration_token = listInfo.registration_token;
                    guestListTokens.confirmation_token = listInfo.confirmation_token;
                    guestListTokens.public_view_token = listInfo.public_view_token;
                    guestListTokens.portaria_slug = listInfo.portaria_slug;
                    guestListTokens.cadastro_slug = listInfo.cadastro_slug || null;
                } else {
                    console.warn('Resposta não OK ao carregar lista:', listInfoRes.status);
                }
                
                // Inicialmente esconder links (serão mostrados na aba Links)
                const linksSection = document.getElementById('links-hero-section');
                if (linksSection) linksSection.style.display = 'none';
                
                // Carregar dados dos links (mas não mostrar ainda)
                try {
                    if (typeof displayPublicLinks === 'function') {
                        displayPublicLinks();
                    } else {
                        console.warn('[loadGuestListData] displayPublicLinks não é uma função');
                    }
                } catch (e) {
                    console.warn('[loadGuestListData] Erro ao chamar displayPublicLinks:', e);
                }
                
                // Criar tabs
                const tabsContainer = document.getElementById('tabs-container');
                if (!tabsContainer) {
                    console.error('[loadGuestListData] tabs-container não encontrado!');
                    throw new Error('Elemento tabs-container não encontrado');
                }
                
                // Verificar se há aba salva no localStorage
                const savedTab = localStorage.getItem(`activeTab_${itemId}`) || 'registered';
                
                tabsContainer.innerHTML = `
                    <button class="tab-btn ${savedTab === 'all' ? 'active' : ''}" data-tab="all">
                        <i class="fas fa-users"></i> Escritos (<span id="tab-count-all">0</span>)
                    </button>
                    <button class="tab-btn ${savedTab === 'registered' ? 'active' : ''}" data-tab="registered">
                        <i class="fas fa-user-plus"></i> Inscritos (<span id="tab-count-registered">0</span>)
                    </button>
                    <button class="tab-btn ${savedTab === 'arrived' ? 'active' : ''}" data-tab="arrived">
                        <i class="fas fa-check-circle"></i> Quem Chegou (<span id="tab-count-arrived">0</span>)
                    </button>
                    <button class="tab-btn ${savedTab === 'not-arrived' ? 'active' : ''}" data-tab="not-arrived">
                        <i class="fas fa-clock"></i> Quem Não Chegou (<span id="tab-count-not-arrived">0</span>)
                    </button>
                    <button class="tab-btn ${savedTab === 'links' ? 'active' : ''}" data-tab="links">
                        <i class="fas fa-link"></i> Links
                    </button>
                    <button class="tab-btn ${savedTab === 'pdf-settings' ? 'active' : ''}" data-tab="pdf-settings">
                        <i class="fas fa-file-pdf"></i> Personalizar PDF
                    </button>
                    <button class="tab-btn" data-tab="customize-portaria">
                        <i class="fas fa-paint-brush"></i> Personalizar Portaria
                    </button>
                `;
                
                // Definir filtro inicial com base na aba salva
                currentFilter = savedTab;
                
                // Setup tabs primeiro (antes de carregar dados)
                try {
                    if (typeof setupTabs === 'function') {
                        setupTabs();
                        // Após configurar as abas, ativar a aba salva se não for 'registered'
                        // Aguardar um pouco para garantir que as abas foram renderizadas
                        if (savedTab && savedTab !== 'registered') {
                            setTimeout(() => {
                                const savedTabBtn = document.querySelector(`.tab-btn[data-tab="${savedTab}"]`);
                                if (savedTabBtn) {
                                    savedTabBtn.click();
                                }
                            }, 300);
                        }
                    } else {
                        console.warn('[loadGuestListData] setupTabs não é uma função');
                    }
                } catch (e) {
                    console.warn('[loadGuestListData] Erro ao chamar setupTabs:', e);
                }
                
                // Carregar convidados
                const guestHeaders = getHeaders();
                if (!guestHeaders || Object.keys(guestHeaders).length === 0) {
                    throw new Error('Headers de autenticação não disponíveis');
                }
                
                // IMPORTANTE: Delay antes de carregar convidados
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const response = await cachedFetch(`${API_URL}/api/guest-lists/${itemId}/guests?mode=checkin&limit=100&offset=0`, {
                    headers: guestHeaders
                });
                
                if (!response.ok) {
                    if (response.status === 404) {
                        // Lista ainda não existe ou não tem convidados — tratar como vazio, não como erro
                        allData = [];
                    } else {
                        const errorText = await response.text();
                        console.error('[loadGuestListData] Erro ao carregar convidados:', response.status, errorText);
                        throw new Error(`Erro ao carregar convidados: ${response.status} ${response.statusText}`);
                    }
                } else {
                    const responseData = await response.json();
                    allData = Array.isArray(responseData)
                        ? responseData
                        : (responseData.guests || responseData.data || []);
                    window.__guestListMeta = {
                        total: responseData.total ?? allData.length,
                        limit: responseData.limit ?? 100,
                        offset: responseData.offset ?? 0,
                        hasMore: !!responseData.hasMore,
                    };
                }
                
                if (!allData) allData = [];
                
                // NÃƒO sobrescrever currentFilter - usar o valor salvo (savedTab) para manter a aba correta após refresh
                // currentFilter já foi definido como savedTab acima
                if (!currentFilter || currentFilter === 'registered') {
                    currentFilter = savedTab || 'registered';
                }
                
                // Buscar form_fields para mapear labels
                try {
                    // Primeiro tentar buscar custom_form_fields da guest_list (se existir)
                    // IMPORTANTE: Usar cachedFetch para evitar requisições duplicadas
                    const listInfoRes = await cachedFetch(`${API_URL}/api/guest-lists/${itemId}`, {
                        headers: getHeaders()
                    });
                    if (listInfoRes.ok) {
                        const listInfo = await listInfoRes.json();
                        if (listInfo.custom_form_fields) {
                            // Parsear se for string
                            let fields = listInfo.custom_form_fields;
                            if (typeof fields === 'string') {
                                try {
                                    fields = JSON.parse(fields);
                                } catch (e) {
                                    console.warn('Erro ao parsear custom_form_fields:', e);
                                    fields = [];
                                }
                            }
                            if (Array.isArray(fields) && fields.length > 0) {
                                formFields = fields;
                            }
                        }
                    }
                    
                    // Se não encontrou custom_form_fields, tentar digital_form_data
                    if (!formFields || formFields.length === 0) {
                        // IMPORTANTE: Usar cachedFetch e delay
                        await new Promise(resolve => setTimeout(resolve, 300));
                        const formFieldsRes = await cachedFetch(`${API_URL}/api/profile/items/${itemId}`, {
                            headers: getHeaders()
                        });
                        if (formFieldsRes.ok) {
                            const itemData = await formFieldsRes.json();
                            if (itemData.data && itemData.data.digital_form_data && itemData.data.digital_form_data.form_fields) {
                                const fields = itemData.data.digital_form_data.form_fields;
                                formFields = Array.isArray(fields) ? fields : (typeof fields === 'string' ? JSON.parse(fields) : []);
                            }
                        }
                    }
                    
                    if (formFields.length > 0) {
                    } else {
                        console.warn('[loadGuestListData] Nenhum formField encontrado!');
                    }
                } catch (e) {
                    console.warn('Erro ao carregar form_fields:', e);
                }
                
                // Renderizar dados
                try {
                    if (typeof renderGuestListData === 'function') {
                        renderGuestListData();
                    } else {
                        console.warn('[loadGuestListData] renderGuestListData não é uma função');
                    }
                } catch (e) {
                    console.error('[loadGuestListData] Erro ao renderizar:', e);
                    throw e;
                }
                
                // Esconder loading e mostrar conteúdo
                const loadingElFinal = document.getElementById('loading');
                const contentElFinal = document.getElementById('content');
                if (loadingElFinal) loadingElFinal.style.display = 'none';
                if (contentElFinal) contentElFinal.style.display = 'block';
                if (typeof hideLeadToolbar === 'function') hideLeadToolbar();
                if (typeof ensureGuestLoadMore === 'function') ensureGuestLoadMore();
                
            } catch (e) {
                console.warn('[loadGuestListData] Erro ao carregar informações da lista:', e);
                const loadingElErr = document.getElementById('loading');
                const contentElErr = document.getElementById('content');
                if (loadingElErr) {
                    loadingElErr.style.display = 'block';
                    loadingElErr.innerHTML = `
                        <div style="color: #ff4444; text-align: center; padding: 40px;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 16px;"></i>
                            <h3 style="color: #ff4444; margin-bottom: 12px;">Erro ao Carregar Lista</h3>
                            <div style="color: #ECECEC; margin-bottom: 20px;">Não foi possível carregar os dados dos convidados.</div>
                            <button onclick="location.reload()" style="padding: 12px 24px; background: linear-gradient(135deg, #4A90E2, #357ABD); border: none; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer; margin-right: 10px;">
                                <i class="fas fa-redo"></i> Tentar Novamente
                            </button>
                            <button onclick="window.location.href='/dashboard'" style="padding: 12px 24px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #ECECEC; font-weight: 600; cursor: pointer;">
                                <i class="fas fa-arrow-left"></i> Voltar
                            </button>
                        </div>
                    `;
                }
                if (contentElErr) contentElErr.style.display = 'none';
                return;
            }
            // Lista vazia (nenhum convidado cadastrado) não é erro: a tela já foi renderizada com "Nenhum convidado encontrado"
        }
        
        // Carregar dados de respostas de formulário
        async function loadFormResponsesData() {
            try {
                
                const pageTitleEl = document.getElementById('page-title');
                if (pageTitleEl) {
                    pageTitleEl.innerHTML = '<i class="fas fa-user-plus"></i> Captação de Clientes';
                }
                
                // Criar tabs (modo formulário digital não tem personalização de PDF)
                const tabsContainer = document.getElementById('tabs-container');
                if (!tabsContainer) {
                    throw new Error('Elemento tabs-container não encontrado');
                }
                
                tabsContainer.innerHTML = `
                    <button class="tab-btn active" data-tab="all">
                        <i class="fas fa-list"></i> Todos (<span id="tab-count-all">0</span>)
                    </button>
                    <button class="tab-btn" data-tab="today">
                        <i class="fas fa-calendar-day"></i> Hoje (<span id="tab-count-today">0</span>)
                    </button>
                    <button class="tab-btn" data-tab="week">
                        <i class="fas fa-calendar-week"></i> Esta Semana (<span id="tab-count-week">0</span>)
                    </button>
                    <button class="tab-btn" data-tab="month">
                        <i class="fas fa-calendar-alt"></i> Este Mês (<span id="tab-count-month">0</span>)
                    </button>
                `;
                
                // Carregar respostas
                const headersForFetch = getHeaders();
                if (!headersForFetch || Object.keys(headersForFetch).length === 0) {
                    console.error('[loadFormResponsesData] Headers de autenticação não encontrados');
                    const loadingEl = document.getElementById('loading');
                    if (loadingEl) {
                        loadingEl.innerHTML = `
                            <div style="color: #ff4444; text-align: center; padding: 40px;">
                                <i class="fas fa-lock" style="font-size: 3rem; margin-bottom: 16px;"></i>
                                <h3 style="color: #ff4444; margin-bottom: 12px;">Autenticação Necessária</h3>
                                <div style="color: #ECECEC; margin-bottom: 20px;">Por favor, faça login novamente.</div>
                                <button onclick="window.location.href='/dashboard'" style="padding: 12px 24px; background: linear-gradient(135deg, #4A90E2, #357ABD); border: none; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer;">
                                    <i class="fas fa-sign-in-alt"></i> Ir para Login
                                </button>
                            </div>
                        `;
                    }
                    return;
                }
                
                // IMPORTANTE: Usar cachedFetch e delays sequenciais em vez de Promise.all para evitar rate limiting
                await new Promise(resolve => setTimeout(resolve, 300));
                const responsesRes = await cachedFetch(`${API_URL}/api/profile/items/digital_form/${itemId}/responses?mode=lead&limit=100&offset=0`, {
                    headers: headersForFetch
                });
                
                await new Promise(resolve => setTimeout(resolve, 500));
                const formRes = await cachedFetch(`${API_URL}/api/profile`, {
                    headers: headersForFetch
                });
                
                if (!responsesRes.ok) {
                    throw new Error(`Erro ao carregar respostas: ${responsesRes.status} ${responsesRes.statusText}`);
                }
                
                let responsesPayload = await responsesRes.json();
                let responses = Array.isArray(responsesPayload)
                    ? responsesPayload
                    : (responsesPayload.responses || responsesPayload.data || []);
                window.__formResponsesMeta = {
                    total: responsesPayload.total ?? responses.length,
                    limit: responsesPayload.limit ?? 100,
                    offset: responsesPayload.offset ?? 0,
                    hasMore: !!responsesPayload.hasMore,
                    itemId: String(itemId),
                };
                
                const formData = await formRes.json();
                const currentForm = formData.items?.find(item => String(item.id) === String(itemId));
                
                allData = responses;
                currentFilter = 'all';
                leadSortMode = 'recent';
                
                // Carregar form_fields para labels amigáveis no detalhe
                try {
                    formFields = [];
                    const itemFieldsRes = await cachedFetch(`${API_URL}/api/profile/items/${itemId}`, {
                        headers: headersForFetch
                    });
                    if (itemFieldsRes.ok) {
                        const itemPayload = await itemFieldsRes.json();
                        const dfi = itemPayload?.data?.digital_form_data || itemPayload?.digital_form_data || {};
                        let fields = dfi.form_fields || [];
                        if (typeof fields === 'string') {
                            try { fields = JSON.parse(fields); } catch (e) { fields = []; }
                        }
                        formFields = Array.isArray(fields) ? fields : [];
                    }
                } catch (e) {
                    console.warn('[loadFormResponsesData] Não foi possível carregar form_fields:', e);
                    formFields = [];
                }
                
                // Mostrar CSV na Captação
                const csvBtn = document.getElementById('export-csv');
                if (csvBtn) csvBtn.style.display = 'inline-flex';
                const searchInputEl = document.getElementById('search-input');
                if (searchInputEl) searchInputEl.placeholder = 'Buscar por nome, CPF, WhatsApp ou email...';
                
                
                // Renderizar dados
                if (typeof renderFormResponsesData === 'function') {
                    renderFormResponsesData();
                } else {
                    console.warn('[loadFormResponsesData] renderFormResponsesData não é uma função');
                }
                
                if (typeof setupTabs === 'function') {
                    setupTabs();
                } else {
                    console.warn('[loadFormResponsesData] setupTabs não é uma função');
                }

                syncFormResponsesLoadMoreBtn();
                
                // Esconder loading e mostrar conteúdo
                const loadingEl = document.getElementById('loading');
                const contentEl = document.getElementById('content');
                if (loadingEl) loadingEl.style.display = 'none';
                if (contentEl) contentEl.style.display = 'block';
                
            } catch (error) {
                console.error('[loadFormResponsesData] Erro:', error);
                document.getElementById('loading').style.display = 'block';
                document.getElementById('content').style.display = 'none';
                document.getElementById('loading').innerHTML = `
                    <div style="color: #ff4444; text-align: center; padding: 40px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 16px;"></i>
                        <h3 style="color: #ff4444; margin-bottom: 12px;">Erro ao Carregar Formulário</h3>
                        <div style="color: #ECECEC; margin-bottom: 20px;">${error.message || 'Erro desconhecido'}</div>
                        <button onclick="location.reload()" style="padding: 12px 24px; background: linear-gradient(135deg, #4A90E2, #357ABD); border: none; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer; margin-right: 10px;">
                            <i class="fas fa-redo"></i> Tentar Novamente
                        </button>
                        <button onclick="window.location.href='/dashboard'" style="padding: 12px 24px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #ECECEC; font-weight: 600; cursor: pointer;">
                            <i class="fas fa-arrow-left"></i> Voltar
                        </button>
                    </div>
                `;
            }
        }

        function syncFormResponsesLoadMoreBtn() {
            const meta = window.__formResponsesMeta || {};
            let wrap = document.getElementById('form-responses-load-more-wrap');
            const listParent = document.getElementById('items-list')?.parentElement;
            if (!listParent) return;
            if (!wrap) {
                wrap = document.createElement('div');
                wrap.id = 'form-responses-load-more-wrap';
                wrap.style.cssText = 'text-align:center;padding:16px 0 8px;';
                listParent.appendChild(wrap);
            }
            if (!meta.hasMore) {
                wrap.innerHTML = '';
                wrap.style.display = 'none';
                return;
            }
            wrap.style.display = 'block';
            const loaded = Array.isArray(allData) ? allData.length : 0;
            const total = Number(meta.total || loaded);
            wrap.innerHTML = `
                <button type="button" id="form-responses-load-more" style="padding:12px 22px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:rgba(74,144,226,0.15);color:#ECECEC;font-weight:600;cursor:pointer;">
                    <i class="fas fa-plus"></i> Carregar mais respostas (${loaded} de ${total})
                </button>`;
            const btn = document.getElementById('form-responses-load-more');
            if (btn) btn.onclick = () => loadMoreFormResponses();
        }

        async function loadMoreFormResponses() {
            const meta = window.__formResponsesMeta || {};
            if (!meta.hasMore || !meta.itemId) return;
            const btn = document.getElementById('form-responses-load-more');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A carregarâ€¦';
            }
            try {
                const headersForFetch = getHeaders();
                const nextOffset = Number(meta.offset || 0) + Number(meta.limit || 100);
                const limit = Number(meta.limit || 100);
                const res = await cachedFetch(
                    `${API_URL}/api/profile/items/digital_form/${meta.itemId}/responses?mode=lead&limit=${limit}&offset=${nextOffset}&_nc=${Date.now()}`,
                    { headers: headersForFetch }
                );
                if (!res.ok) throw new Error('Falha ao carregar mais respostas');
                const payload = await res.json();
                const chunk = Array.isArray(payload)
                    ? payload
                    : (payload.responses || payload.data || []);
                const seen = new Set((allData || []).map((r) => String(r.id ?? r.response_id ?? '')));
                chunk.forEach((r) => {
                    const id = String(r.id ?? r.response_id ?? '');
                    if (id && seen.has(id)) return;
                    if (id) seen.add(id);
                    allData.push(r);
                });
                window.__formResponsesMeta = {
                    ...meta,
                    total: payload.total ?? meta.total,
                    limit: payload.limit ?? limit,
                    offset: payload.offset ?? nextOffset,
                    hasMore: !!payload.hasMore,
                };
                if (typeof renderFormResponsesData === 'function') renderFormResponsesData();
                syncFormResponsesLoadMoreBtn();
            } catch (e) {
                console.error('[loadMoreFormResponses]', e);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Tentar novamente';
                }
            }
        }
        
        async function ensureGuestLoadMore() {
            const meta = window.__guestListMeta || {};
            let btn = document.getElementById('guest-load-more-btn');
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'guest-load-more-btn';
                btn.type = 'button';
                btn.className = 'btn-secondary';
                btn.style.cssText = 'display:none;margin:16px auto;';
                btn.onclick = async function () {
                    const m = window.__guestListMeta || {};
                    if (!m.hasMore) return;
                    const nextOffset = (m.offset || 0) + (m.limit || 100);
                    const headersForFetch = getHeaders();
                    const res = await cachedFetch(
                        `${API_URL}/api/guest-lists/${itemId}/guests?mode=checkin&limit=100&offset=${nextOffset}`,
                        { headers: headersForFetch }
                    );
                    if (!res.ok) return;
                    const payload = await res.json();
                    const extra = Array.isArray(payload) ? payload : (payload.guests || payload.data || []);
                    allData = (allData || []).concat(extra);
                    window.__guestListMeta = {
                        total: payload.total ?? (allData.length),
                        limit: payload.limit ?? 100,
                        offset: payload.offset ?? nextOffset,
                        hasMore: !!payload.hasMore,
                    };
                    if (typeof renderGuestListData === 'function') renderGuestListData();
                    ensureGuestLoadMore();
                };
                const host = document.getElementById('content') || document.body;
                host.appendChild(btn);
            }
            if (meta.hasMore) {
                btn.style.display = 'block';
                btn.innerHTML = `<i class="fas fa-plus"></i> Carregar mais convidados (${(allData || []).length} de ${meta.total || '?'})`;
            } else {
                btn.style.display = 'none';
            }
        }

        // Renderizar dados de lista de convidados
        function renderGuestListData() {
            const total = allData.length; // Total de inscritos (todos, independente do status)
            const arrived = allData.filter(g => g.status === 'checked_in').length; // Só quem realmente chegou (checked_in)
            const notArrived = allData.filter(g => g.status === 'registered').length; // Quem não chegou ainda
            const confirmed = allData.filter(g => g.status === 'confirmed').length; // Confirmados (mas não chegaram)
            
            // Atualizar contadores das tabs
            const tabCountRegistered = document.getElementById('tab-count-registered');
            const tabCountArrived = document.getElementById('tab-count-arrived');
            const tabCountNotArrived = document.getElementById('tab-count-not-arrived');
            const tabCountConfirmed = document.getElementById('tab-count-confirmed');
            const tabCountAll = document.getElementById('tab-count-all');
            
            // "Inscritos" mostra TODOS que se inscreveram (independente do status)
            if (tabCountRegistered) tabCountRegistered.textContent = total;
            if (tabCountArrived) tabCountArrived.textContent = arrived;
            if (tabCountNotArrived) tabCountNotArrived.textContent = notArrived;
            if (tabCountConfirmed) tabCountConfirmed.textContent = confirmed;
            if (tabCountAll) tabCountAll.textContent = total;
            
            // Atualizar estatísticas hero (cards grandes) - APENAS se não estiver na aba Links
            if (currentFilter !== 'links' && currentFilter !== 'pdf-settings' && currentFilter !== 'customize-portaria') {
                updateHeroStats();
                // Mostrar stats-hero-section apenas se não estiver nas abas especiais
                const statsHeroSection = document.getElementById('stats-hero-section');
                if (statsHeroSection) {
                    statsHeroSection.style.display = 'grid';
                    statsHeroSection.style.visibility = 'visible';
                }
            } else {
                // Se estiver na aba Links, PDF ou Portaria, garantir que está escondido
                const statsHeroSection = document.getElementById('stats-hero-section');
                if (statsHeroSection) {
                    statsHeroSection.style.display = 'none';
                    statsHeroSection.style.visibility = 'hidden';
                }
            }
            
            // Esconder stats-grid antigo para lista de convidados (usar stats-hero-section)
            const statsGrid = document.getElementById('stats-grid');
            if (statsGrid) statsGrid.style.display = 'none';
            
            // Mostrar controles administrativos APENAS se não estiver nas abas especiais
            const adminControls = document.getElementById('admin-controls');
            if (adminControls) {
                if (currentFilter !== 'links' && currentFilter !== 'pdf-settings' && currentFilter !== 'customize-portaria') {
                    adminControls.style.display = 'flex';
                    adminControls.style.visibility = 'visible';
                } else {
                    adminControls.style.display = 'none';
                    adminControls.style.visibility = 'hidden';
                }
            }
            
            // Mostrar/esconder barra de busca APENAS se não estiver nas abas especiais
            const searchBar = document.querySelector('.search-bar');
            if (searchBar) {
                if (currentFilter !== 'links' && currentFilter !== 'pdf-settings' && currentFilter !== 'customize-portaria') {
                    searchBar.style.display = 'flex';
                    searchBar.style.visibility = 'visible';
                } else {
                    searchBar.style.display = 'none';
                    searchBar.style.visibility = 'hidden';
                }
            }
            
            filterAndRenderGuestList();
        }
        
        // Filtrar e renderizar lista de convidados
        function filterAndRenderGuestList() {
            const searchTerm = document.getElementById('search-input').value.toLowerCase();
            let filtered = [...allData];
            
            // Filtrar por status
            if (currentFilter === 'registered') {
                // "Inscritos" mostra TODOS que se inscreveram (todos os status)
                filtered = [...allData]; // Não filtrar, mostrar todos
            } else if (currentFilter === 'arrived') {
                // "Quem Chegou" mostra só quem tem status checked_in (chegou de fato)
                filtered = filtered.filter(g => g.status === 'checked_in');
            } else if (currentFilter === 'not-arrived') {
                // "Quem Não Chegou" mostra quem ainda está registered (não chegou)
                filtered = filtered.filter(g => g.status === 'registered');
            } else if (currentFilter === 'confirmed') {
                // "Confirmados" mostra quem confirmou mas não chegou ainda
                filtered = filtered.filter(g => g.status === 'confirmed');
            } else if (currentFilter === 'all') {
                // "Todos" mostra todos, igual a "Inscritos"
                filtered = [...allData];
            } else if (currentFilter === 'links') {
                // Mostrar seção de links
                showLinksTab();
                return;
            }
            
            // Garantir que a lista de itens esteja visível (não estamos na aba Links)
            const itemsList = document.getElementById('items-list');
            const linksSection = document.getElementById('links-hero-section');
            const pdfSettingsContainer = document.getElementById('pdf-settings-container');
            if (itemsList) itemsList.style.display = 'block';
            if (linksSection) linksSection.style.display = 'none';
            if (pdfSettingsContainer) pdfSettingsContainer.style.display = 'none';
            
            // Filtrar por busca
            if (searchTerm) {
                filtered = filtered.filter(g => {
                    const name = (g.name || '').toLowerCase();
                    const whatsapp = (g.whatsapp || '').toLowerCase();
                    const email = (g.email || '').toLowerCase();
                    const document = (g.document || '').toLowerCase();
                    return name.includes(searchTerm) || 
                           whatsapp.includes(searchTerm) || 
                           email.includes(searchTerm) || 
                           document.includes(searchTerm);
                });
            }
            
            renderGuestListItems(filtered);
        }
        
        // Renderizar itens de convidados
        function renderGuestListItems(guests) {
            const container = document.getElementById('items-list');
            
            if (guests.length === 0) {
                document.getElementById('content').style.display = 'none';
                document.getElementById('empty').style.display = 'block';
                document.getElementById('empty').querySelector('.empty-icon').innerHTML = '<i class="fas fa-users"></i>';
                document.getElementById('empty').querySelector('.empty-title').textContent = 'Nenhum convidado encontrado';
                return;
            }
            
            document.getElementById('content').style.display = 'block';
            document.getElementById('empty').style.display = 'none';
            
            container.innerHTML = guests.map(guest => {
                const checkedInTime = guest.checked_in_at ? new Date(guest.checked_in_at).toLocaleString('pt-BR') : '';
                const confirmedTime = guest.confirmed_at ? new Date(guest.confirmed_at).toLocaleString('pt-BR') : '';
                const statusClass = (guest.status === 'checked_in' || guest.status === 'confirmed') ? 'success' : 
                                   (guest.status === 'confirmed') ? 'info' : 'warning';
                const statusText = guest.status === 'checked_in' ? 'Chegou' : 
                                  guest.status === 'confirmed' ? 'Confirmado' : 'Não Chegou';
                const statusIcon = guest.status === 'checked_in' ? 'check-circle' : 
                                  guest.status === 'confirmed' ? 'user-check' : 'clock';
                
                // IMPORTANTE: Usar a função auxiliar para extrair informações corretamente (incluindo CPF)
                const { displayName, displayEmail, displayWhatsapp, displayDocument } = extractGuestInfo(guest);
                const safeName = escapeHtml(displayName || '');
                const safeEmail = escapeHtml(displayEmail || '');
                const safeWhatsapp = escapeHtml(displayWhatsapp || '');
                const safeDocument = escapeHtml(displayDocument || '');
                const safeAddress = escapeHtml(guest.address || '');
                const safeId = String(Number(guest.id) || 0);
                const safeNameAttr = escapeHtml(displayName || '').replace(/'/g, '&#39;');
                
                return `
                    <div class="item-card" data-guest-id="${safeId}">
                        <div class="item-header">
                            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                                <input type="checkbox" class="guest-checkbox" data-guest-id="${safeId}" style="width: 20px; height: 20px; cursor: pointer; accent-color: #FFC700;">
                                <div style="flex: 1;">
                                    <h4 class="item-title">${safeName}</h4>
                                    <span class="status-badge ${statusClass}">
                                        <i class="fas fa-${statusIcon}"></i> ${statusText}
                                    </span>
                                </div>
                            </div>
                            <div class="item-actions-container" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; width: 100%;">
                                ${(guest.status !== 'checked_in') ? `
                                <button class="item-action" onclick="checkInGuest(${safeId}, '${safeNameAttr}')">
                                    <i class="fas fa-check"></i> <span class="btn-text">Confirmar Chegada</span>
                                </button>
                                ` : ''}
                                <button class="item-action" style="background: linear-gradient(135deg, #4A90E2, #357ABD);" onclick="viewGuestDetails(${safeId})">
                                    <i class="fas fa-eye"></i> <span class="btn-text">Ver Inscrição</span>
                                </button>
                                <button class="item-action delete" onclick="deleteGuest(${safeId}, '${safeNameAttr}')">
                                    <i class="fas fa-times"></i> <span class="btn-text">Excluir</span>
                                </button>
                            </div>
                        </div>
                        <div class="item-details">
                            <div style="font-weight: 600; color: #FFC700; margin-bottom: 8px;">Informações de Contato:</div>
                            <div><i class="fab fa-whatsapp" style="color: #25D366;"></i> <strong>WhatsApp:</strong> ${safeWhatsapp}</div>
                            <div><i class="fas fa-envelope" style="color: #FFC700;"></i> <strong>Email:</strong> ${safeEmail}</div>
                            ${safeDocument ? `<div><i class="fas fa-id-card"></i> <strong>CPF/Documento:</strong> ${safeDocument}</div>` : ''}
                            ${safeAddress ? `<div><i class="fas fa-map-marker-alt"></i> <strong>Endereço:</strong> ${safeAddress}</div>` : ''}
                            ${checkedInTime ? `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);"><i class="fas fa-clock"></i> <strong>Chegou:</strong> ${escapeHtml(checkedInTime)}</div>` : ''}
                            ${confirmedTime ? `<div><i class="fas fa-check-double"></i> <strong>Confirmado:</strong> ${escapeHtml(confirmedTime)}</div>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
            // Configurar event listeners após renderizar
            setupGuestListEventListeners();
        }
        
        // Helpers Captação de Clientes
        function getLeadDisplayName(response) {
            const data = response.response_data || response.responses || {};
            const fromData = data.name || data.nome || data['Nome completo'] || data.nome_completo || data['Nome'];
            return (response.responder_name || response.name || fromData || 'Cliente sem nome').toString().trim() || 'Cliente sem nome';
        }

        function getLeadContact(response) {
            const data = response.response_data || response.responses || {};
            const email = response.responder_email || response.email || data.email || data.Email || data['E-mail'] || '';
            const phone = response.responder_phone || response.phone || response.whatsapp ||
                data.whatsapp || data.phone || data.telefone || data['Telefone/WhatsApp'] || data['Telefone'] || '';
            return { email: String(email || '').trim(), phone: String(phone || '').trim() };
        }

        function getLeadInitialLetter(name) {
            const cleaned = (name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            const ch = cleaned.charAt(0).toUpperCase();
            if (ch >= 'A' && ch <= 'Z') return ch;
            return '#';
        }

        function formatLeadFieldValue(value) {
            if (value == null || value === '') return '—';
            if (Array.isArray(value)) return value.join(', ');
            if (typeof value === 'object') {
                try { return JSON.stringify(value); } catch (e) { return String(value); }
            }
            return String(value);
        }

        function getLeadCpf(response) {
            const data = response.response_data || response.responses || {};
            const raw = data.cpf || data.CPF || data.document || data.documento || data['CPF'] || data.cnpj || data.CNPJ || '';
            return String(raw || '').trim();
        }

        function digitsOnly(str) {
            return String(str || '').replace(/\D/g, '');
        }

        function getLeadId(response) {
            return String(response.id || response.response_id || ((response.submitted_at || '') + '_' + getLeadDisplayName(response)));
        }

        function getLeadMetaStorageKey() {
            return 'captacao_meta_' + (itemId || '0');
        }

        function loadLeadMetaMap() {
            try {
                return JSON.parse(localStorage.getItem(getLeadMetaStorageKey()) || '{}') || {};
            } catch (e) {
                return {};
            }
        }

        function saveLeadMetaMap(map) {
            localStorage.setItem(getLeadMetaStorageKey(), JSON.stringify(map || {}));
        }

        function getLeadMeta(response) {
            const map = loadLeadMetaMap();
            return map[getLeadId(response)] || { contacted: false, favorite: false };
        }

        function setLeadMeta(response, patch) {
            const map = loadLeadMetaMap();
            const id = getLeadId(response);
            map[id] = { ...(map[id] || { contacted: false, favorite: false }), ...patch };
            saveLeadMetaMap(map);
            return map[id];
        }

        function getLeadLeaderValue(response) {
            const data = response.response_data || response.responses || {};
            const keys = Object.keys(data || {});
            for (const key of keys) {
                const label = ((typeof getFieldLabel === 'function' ? getFieldLabel(key) : key) + ' ' + key).toLowerCase();
                if (/l[ií]der|equipe|c[eé]lula|pastor|rede|ministerio|ministério/.test(label)) {
                    const v = formatLeadFieldValue(data[key]);
                    if (v && v !== '—') return String(v).trim();
                }
            }
            // fallback por chave direta
            for (const key of keys) {
                const kl = String(key).toLowerCase();
                if (/lider|líder|equipe|celula|célula|pastor/.test(kl)) {
                    const v = formatLeadFieldValue(data[key]);
                    if (v && v !== '—') return String(v).trim();
                }
            }
            return '';
        }

        function collectLeadLeaders() {
            const set = new Set();
            (allData || []).forEach(r => {
                const v = getLeadLeaderValue(r);
                if (v) set.add(v);
            });
            return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
        }

        function getLeadDateGroupLabel(dateVal) {
            if (!dateVal) return 'Sem data';
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return 'Sem data';
            const now = new Date();
            const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const diffDays = Math.round((startToday - startThat) / 86400000);
            if (diffDays === 0) return 'Hoje';
            if (diffDays === 1) return 'Ontem';
            if (diffDays > 1 && diffDays < 7) return 'Esta semana';
            if (diffDays >= 7 && diffDays < 30) return 'Este mês';
            return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        }

        function ensureLeadToolbar() {
            let toolbar = document.getElementById('lead-toolbar');
            const searchBar = document.querySelector('.search-bar');
            if (!searchBar) return;
            if (!toolbar) {
                toolbar = document.createElement('div');
                toolbar.id = 'lead-toolbar';
                toolbar.className = 'lead-toolbar';
                searchBar.parentNode.insertBefore(toolbar, searchBar.nextSibling);
            }
            const leaders = collectLeadLeaders();
            const leaderOptions = leaders.map(l => `<option value="${escapeHtml(l)}" ${leadLeaderFilter === l ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('');
            toolbar.innerHTML = `
                <div class="lead-toolbar-filters">
                    <button type="button" class="lead-chip ${leadStatusFilter === 'all' ? 'active' : ''}" data-status="all">Todos</button>
                    <button type="button" class="lead-chip ${leadStatusFilter === 'pending' ? 'active' : ''}" data-status="pending">Pendentes</button>
                    <button type="button" class="lead-chip ok ${leadStatusFilter === 'contacted' ? 'active' : ''}" data-status="contacted">Contatados</button>
                    <button type="button" class="lead-chip ${leadStatusFilter === 'favorite' ? 'active' : ''}" data-status="favorite"><i class="fas fa-star"></i> Favoritos</button>
                </div>
                <div class="lead-sort-row">
                    <label for="lead-sort-select"><i class="fas fa-sort-alpha-down"></i> Ordenar</label>
                    <select id="lead-sort-select" class="lead-sort-select">
                        <option value="recent" ${leadSortMode === 'recent' ? 'selected' : ''}>Mais recentes</option>
                        <option value="az" ${leadSortMode === 'az' ? 'selected' : ''}>Nome A — Z</option>
                        <option value="za" ${leadSortMode === 'za' ? 'selected' : ''}>Nome Z — A</option>
                    </select>
                    ${leaders.length ? `
                    <label for="lead-leader-select"><i class="fas fa-users"></i> Líder/Equipe</label>
                    <select id="lead-leader-select" class="lead-sort-select">
                        <option value="all" ${leadLeaderFilter === 'all' ? 'selected' : ''}>Todas</option>
                        ${leaderOptions}
                    </select>` : ''}
                    <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                        <input type="checkbox" id="lead-group-date" ${leadGroupByDate ? 'checked' : ''} style="accent-color:#FFC700;">
                        Agrupar por data
                    </label>
                </div>
                <div class="lead-result-count" id="lead-result-count"></div>
            `;
            toolbar.style.display = 'flex';

            toolbar.querySelectorAll('.lead-chip[data-status]').forEach(btn => {
                btn.onclick = () => {
                    leadStatusFilter = btn.dataset.status || 'all';
                    ensureLeadToolbar();
                    filterAndRenderFormResponses();
                };
            });
            const sortSelect = document.getElementById('lead-sort-select');
            if (sortSelect) {
                sortSelect.onchange = () => {
                    leadSortMode = sortSelect.value || 'recent';
                    filterAndRenderFormResponses();
                };
            }
            const leaderSelect = document.getElementById('lead-leader-select');
            if (leaderSelect) {
                leaderSelect.onchange = () => {
                    leadLeaderFilter = leaderSelect.value || 'all';
                    filterAndRenderFormResponses();
                };
            }
            const groupCb = document.getElementById('lead-group-date');
            if (groupCb) {
                groupCb.onchange = () => {
                    leadGroupByDate = !!groupCb.checked;
                    filterAndRenderFormResponses();
                };
            }
        }

        function hideLeadToolbar() {
            const toolbar = document.getElementById('lead-toolbar');
            if (toolbar) toolbar.style.display = 'none';
        }

        function setLeadResultCount(n, total) {
            const el = document.getElementById('lead-result-count');
            if (!el) return;
            if (n === total) el.textContent = total + ' cliente' + (total === 1 ? '' : 's') + ' na lista';
            else el.textContent = 'Mostrando ' + n + ' de ' + total;
        }

        function openLeadDetailModal(response) {
            const existing = document.getElementById('lead-detail-overlay');
            if (existing) existing.remove();
            document.body.style.overflow = 'hidden';

            const name = getLeadDisplayName(response);
            const { email, phone } = getLeadContact(response);
            const cpf = getLeadCpf(response);
            const submittedAt = response.submitted_at || response.created_at;
            const date = submittedAt ? new Date(submittedAt).toLocaleString('pt-BR') : '';
            const responsesData = response.response_data || response.responses || {};
            const phoneDigits = digitsOnly(phone);
            const initials = getLeadInitialLetter(name) === '#'
                ? (name.slice(0, 2).toUpperCase() || 'CL')
                : name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

            const skipKeys = new Set(['name', 'nome', 'nome completo', 'nome_completo', 'email', 'e-mail', 'phone', 'telefone', 'whatsapp', 'telefone/whatsapp', 'cpf', 'cnpj', 'document', 'documento']);
            const extraFields = [];
            Object.entries(responsesData || {}).forEach(([key, value]) => {
                const keyLower = String(key).toLowerCase();
                if (skipKeys.has(keyLower)) return;
                const label = (typeof getFieldLabel === 'function') ? getFieldLabel(key) : key;
                const val = formatLeadFieldValue(value);
                const isLong = String(val).length > 80;
                extraFields.push(`<div class="lead-detail-field${isLong ? ' wide' : ''}"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(val)}</div></div>`);
            });

            const mainFields = [];
            mainFields.push(`<div class="lead-detail-field"><div class="label">Nome completo</div><div class="value">${escapeHtml(name)}</div></div>`);
            if (cpf) mainFields.push(`<div class="lead-detail-field"><div class="label">CPF / Documento</div><div class="value">${escapeHtml(cpf)}</div></div>`);
            if (phone) mainFields.push(`<div class="lead-detail-field"><div class="label">WhatsApp / Telefone</div><div class="value">${escapeHtml(phone)}</div></div>`);
            if (email) mainFields.push(`<div class="lead-detail-field"><div class="label">Email</div><div class="value">${escapeHtml(email)}</div></div>`);
            if (date) mainFields.push(`<div class="lead-detail-field"><div class="label">Data do cadastro</div><div class="value">${escapeHtml(date)}</div></div>`);

            const meta = getLeadMeta(response);
            const actions = [];
            if (phoneDigits) {
                const wa = phoneDigits.startsWith('55') ? phoneDigits : ('55' + phoneDigits);
                actions.push(`<a class="lead-action-btn" style="background:linear-gradient(135deg,#25D366,#128C7E);" href="https://wa.me/${wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>`);
                actions.push(`<a class="lead-action-btn" style="background:rgba(74,144,226,0.95);" href="tel:${phoneDigits}"><i class="fas fa-phone"></i> Ligar</a>`);
            }
            if (email) {
                actions.push(`<a class="lead-action-btn" style="background:linear-gradient(135deg,#FFC700,#FFA500);color:#000;" href="mailto:${escapeHtml(email)}"><i class="fas fa-envelope"></i> Email</a>`);
            }
            actions.push(`<button type="button" class="lead-action-btn" id="lead-toggle-contacted" style="background:${meta.contacted ? 'rgba(37,211,102,0.25)' : 'rgba(255,255,255,0.08)'};color:${meta.contacted ? '#25D366' : '#ECECEC'};border:1px solid rgba(255,255,255,0.12);"><i class="fas fa-check"></i> ${meta.contacted ? 'Contatado' : 'Marcar contatado'}</button>`);
            actions.push(`<button type="button" class="lead-action-btn" id="lead-toggle-favorite" style="background:${meta.favorite ? 'rgba(255,199,0,0.2)' : 'rgba(255,255,255,0.08)'};color:${meta.favorite ? '#FFC700' : '#ECECEC'};border:1px solid rgba(255,255,255,0.12);"><i class="fas fa-star"></i> ${meta.favorite ? 'Favorito' : 'Favoritar'}</button>`);

            const overlay = document.createElement('div');
            overlay.id = 'lead-detail-overlay';
            overlay.className = 'lead-detail-overlay';
            overlay.innerHTML = `
                <div class="lead-detail-page" role="dialog" aria-modal="true" aria-label="Ficha de ${escapeHtml(name)}">
                    <div class="lead-detail-topbar">
                        <button type="button" class="lead-back-btn" id="lead-detail-close">
                            <i class="fas fa-arrow-left"></i> Voltar Ã  lista
                        </button>
                        <div style="color:#A1A1A1;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Ficha do cliente</div>
                    </div>
                    <div class="lead-detail-hero">
                        <div class="lead-avatar">${escapeHtml(initials)}</div>
                        <h1>${escapeHtml(name)}</h1>
                        <div class="lead-sub">${date ? ('Cadastrado em ' + escapeHtml(date)) : 'Cliente captado via King Forms'}</div>
                    </div>
                    <div class="lead-action-row">${actions.join('') || '<span style="color:#A1A1A1;font-size:13px;">Sem contato rápido disponível</span>'}</div>
                    <div class="lead-detail-section">
                        <div class="lead-detail-section-title"><i class="fas fa-id-card"></i> Dados principais</div>
                        <div class="lead-detail-grid">${mainFields.join('')}</div>
                    </div>
                    ${extraFields.length ? `
                    <div class="lead-detail-section">
                        <div class="lead-detail-section-title"><i class="fas fa-folder-open"></i> Respostas do formulário</div>
                        <div class="lead-detail-grid">${extraFields.join('')}</div>
                    </div>` : ''}
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.scrollTop = 0;

            const close = () => {
                overlay.remove();
                document.body.style.overflow = '';
            };
            overlay.querySelector('#lead-detail-close')?.addEventListener('click', close);
            overlay.querySelector('#lead-toggle-contacted')?.addEventListener('click', () => {
                const next = !getLeadMeta(response).contacted;
                setLeadMeta(response, { contacted: next });
                openLeadDetailModal(response);
                filterAndRenderFormResponses();
            });
            overlay.querySelector('#lead-toggle-favorite')?.addEventListener('click', () => {
                const next = !getLeadMeta(response).favorite;
                setLeadMeta(response, { favorite: next });
                openLeadDetailModal(response);
                filterAndRenderFormResponses();
            });
            document.addEventListener('keydown', function onEsc(ev) {
                if (ev.key === 'Escape') {
                    close();
                    document.removeEventListener('keydown', onEsc);
                }
            });
        }

        function escapeHtml(str) {
            return String(str == null ? '' : str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        // Renderizar dados de respostas de formulário (Captação de Clientes)
        function renderFormResponsesData() {
            const adminControls = document.getElementById('admin-controls');
            if (adminControls) adminControls.style.display = 'none';

            // Esconder stats de check-in (chegou/não chegou)
            const statsHeroSection = document.getElementById('stats-hero-section');
            if (statsHeroSection) {
                statsHeroSection.style.display = 'none';
                statsHeroSection.style.visibility = 'hidden';
            }

            const searchBar = document.querySelector('.search-bar');
            if (searchBar) {
                searchBar.style.display = 'flex';
                searchBar.style.visibility = 'visible';
            }

            ensureLeadToolbar();

            const loaded = allData.length;
            const serverTotal = Number(window.__formResponsesMeta?.total);
            const total = Number.isFinite(serverTotal) && serverTotal > 0 ? serverTotal : loaded;
            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);

            const todayResponses = allData.filter(r => {
                const date = new Date(r.submitted_at || r.created_at).toISOString().split('T')[0];
                return date === today;
            });
            const weekResponses = allData.filter(r => new Date(r.submitted_at || r.created_at) >= weekAgo);
            const monthResponses = allData.filter(r => new Date(r.submitted_at || r.created_at) >= monthAgo);

            const withEmail = allData.filter(r => !!getLeadContact(r).email).length;
            const withPhone = allData.filter(r => !!getLeadContact(r).phone).length;

            const setCount = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            };
            setCount('tab-count-all', total);
            setCount('tab-count-today', todayResponses.length);
            setCount('tab-count-week', weekResponses.length);
            setCount('tab-count-month', monthResponses.length);

            const statsGrid = document.getElementById('stats-grid');
            if (statsGrid) {
                statsGrid.style.display = 'grid';
                statsGrid.style.visibility = 'visible';
                statsGrid.innerHTML = `
                <div class="stat-card purple">
                    <div class="stat-content">
                        <i class="fas fa-user-plus" style="font-size: 1.5rem;"></i>
                        <div class="stat-value">${total}</div>
                    </div>
                    <div class="stat-label">Clientes captados${serverTotal > loaded ? ` (${loaded} carregados)` : ''}</div>
                </div>
                <div class="stat-card blue">
                    <div class="stat-content">
                        <i class="fas fa-envelope" style="font-size: 1.5rem;"></i>
                        <div class="stat-value">${withEmail}</div>
                    </div>
                    <div class="stat-label">Com Email</div>
                </div>
                <div class="stat-card green">
                    <div class="stat-content">
                        <i class="fab fa-whatsapp" style="font-size: 1.5rem;"></i>
                        <div class="stat-value">${withPhone}</div>
                    </div>
                    <div class="stat-label">Com WhatsApp</div>
                </div>
            `;
            }

            filterAndRenderFormResponses();
        }

        // Filtrar e renderizar respostas de formulário (Captação)
        function filterAndRenderFormResponses() {
            const searchEl = document.getElementById('search-input');
            const searchTerm = (searchEl?.value || '').toLowerCase().trim();
            let filtered = [...allData];

            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);

            if (currentFilter === 'today') {
                filtered = filtered.filter(r => {
                    const date = new Date(r.submitted_at || r.created_at).toISOString().split('T')[0];
                    return date === today;
                });
            } else if (currentFilter === 'week') {
                filtered = filtered.filter(r => new Date(r.submitted_at || r.created_at) >= weekAgo);
            } else if (currentFilter === 'month') {
                filtered = filtered.filter(r => new Date(r.submitted_at || r.created_at) >= monthAgo);
            }

            if (leadStatusFilter === 'pending') {
                filtered = filtered.filter(r => !getLeadMeta(r).contacted);
            } else if (leadStatusFilter === 'contacted') {
                filtered = filtered.filter(r => !!getLeadMeta(r).contacted);
            } else if (leadStatusFilter === 'favorite') {
                filtered = filtered.filter(r => !!getLeadMeta(r).favorite);
            }

            if (leadLeaderFilter && leadLeaderFilter !== 'all') {
                filtered = filtered.filter(r => getLeadLeaderValue(r) === leadLeaderFilter);
            }

            if (searchTerm) {
                const searchDigits = digitsOnly(searchTerm);
                filtered = filtered.filter(r => {
                    const name = getLeadDisplayName(r).toLowerCase();
                    const { email, phone } = getLeadContact(r);
                    const cpf = getLeadCpf(r);
                    const leader = getLeadLeaderValue(r).toLowerCase();
                    const blob = JSON.stringify(r.response_data || r.responses || {}).toLowerCase();
                    const textHit = name.includes(searchTerm) ||
                        email.toLowerCase().includes(searchTerm) ||
                        phone.toLowerCase().includes(searchTerm) ||
                        cpf.toLowerCase().includes(searchTerm) ||
                        leader.includes(searchTerm) ||
                        blob.includes(searchTerm);
                    const digitHit = searchDigits.length >= 3 && (
                        digitsOnly(phone).includes(searchDigits) ||
                        digitsOnly(cpf).includes(searchDigits) ||
                        digitsOnly(blob).includes(searchDigits)
                    );
                    return textHit || digitHit;
                });
            }

            if (leadSortMode === 'az') {
                filtered.sort((a, b) => getLeadDisplayName(a).localeCompare(getLeadDisplayName(b), 'pt-BR', { sensitivity: 'base' }));
            } else if (leadSortMode === 'za') {
                filtered.sort((a, b) => getLeadDisplayName(b).localeCompare(getLeadDisplayName(a), 'pt-BR', { sensitivity: 'base' }));
            } else {
                filtered.sort((a, b) => {
                    const da = new Date(a.submitted_at || a.created_at || 0).getTime();
                    const db = new Date(b.submitted_at || b.created_at || 0).getTime();
                    return db - da;
                });
            }

            __leadFilteredCache = filtered;
            window.__leadFilteredCache = filtered;
            const serverTotal = Number(window.__formResponsesMeta?.total);
            setLeadResultCount(filtered.length, Number.isFinite(serverTotal) && serverTotal > 0 ? serverTotal : allData.length);
            renderFormResponseItems(filtered);
            syncFormResponsesLoadMoreBtn();
        }

        // Renderizar itens de Captação de Clientes
        function renderFormResponseItems(responses) {
            const container = document.getElementById('items-list');
            const pdfSettingsContainer = document.getElementById('pdf-settings-container');
            if (pdfSettingsContainer) pdfSettingsContainer.style.display = 'none';
            if (!container) return;

            if (responses.length === 0) {
                document.getElementById('content').style.display = 'block';
                const empty = document.getElementById('empty');
                if (empty) {
                    empty.style.display = 'block';
                    const title = empty.querySelector('.empty-title');
                    const text = empty.querySelector('.empty-text');
                    if (title) title.textContent = 'Nenhum cliente neste filtro';
                    if (text) text.textContent = 'Tente outro período, status ou busque por nome, CPF ou WhatsApp.';
                }
                container.innerHTML = '';
                return;
            }

            document.getElementById('content').style.display = 'block';
            document.getElementById('empty').style.display = 'none';

            window.__leadResponsesCache = responses;

            const useGroups = leadGroupByDate && leadSortMode === 'recent';
            let html = '';
            let lastGroup = null;
            let flatIndex = 0;

            responses.forEach((response) => {
                const submittedAt = response.submitted_at || response.created_at;
                if (useGroups) {
                    const group = getLeadDateGroupLabel(submittedAt);
                    if (group !== lastGroup) {
                        lastGroup = group;
                        html += `<div class="lead-date-group"><i class="fas fa-calendar-day"></i> ${escapeHtml(group)}</div>`;
                    }
                }

                const date = submittedAt ? new Date(submittedAt).toLocaleString('pt-BR') : '';
                const name = getLeadDisplayName(response);
                const { email, phone } = getLeadContact(response);
                const letter = getLeadInitialLetter(name);
                const meta = getLeadMeta(response);
                const leader = getLeadLeaderValue(response);
                const responsesData = response.response_data || response.responses || {};
                const extraPreview = Object.entries(responsesData)
                    .filter(([k]) => {
                        const kl = String(k).toLowerCase();
                        return !['name', 'nome', 'nome completo', 'nome_completo', 'email', 'e-mail', 'phone', 'telefone', 'whatsapp', 'telefone/whatsapp'].includes(kl);
                    })
                    .slice(0, 2)
                    .map(([k, v]) => {
                        const label = (typeof getFieldLabel === 'function') ? getFieldLabel(k) : k;
                        return `${label}: ${formatLeadFieldValue(v)}`;
                    })
                    .join(' Â· ');

                const idx = flatIndex++;
                const classes = ['item-card', 'lead-card'];
                if (meta.contacted) classes.push('contacted');
                if (meta.favorite) classes.push('favorited');

                html += `
                    <div class="${classes.join(' ')}" data-lead-index="${idx}" role="button" tabindex="0">
                        <div class="item-header">
                            <h4 class="item-title" style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
                                <span style="width:36px;height:36px;border-radius:10px;background:rgba(255,199,0,0.15);color:#FFC700;display:inline-flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0;">${escapeHtml(letter)}</span>
                                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(name)}</span>
                            </h4>
                            <div class="lead-mini-actions">
                                <button type="button" class="lead-mini-btn ${meta.favorite ? 'on-star' : ''}" data-action="favorite" title="Favoritar"><i class="fas fa-star"></i></button>
                                <button type="button" class="lead-mini-btn ${meta.contacted ? 'on-check' : ''}" data-action="contacted" title="Marcar contatado"><i class="fas fa-check"></i></button>
                            </div>
                        </div>
                        <div class="item-details">
                            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
                                <span class="lead-status-pill ${meta.contacted ? 'done' : 'pending'}">
                                    <i class="fas ${meta.contacted ? 'fa-check-circle' : 'fa-clock'}"></i>
                                    ${meta.contacted ? 'Contatado' : 'Pendente'}
                                </span>
                                ${leader ? `<span class="lead-status-pill pending"><i class="fas fa-user-tie"></i> ${escapeHtml(leader)}</span>` : ''}
                            </div>
                            ${email ? `<div><i class="fas fa-envelope"></i> ${escapeHtml(email)}</div>` : ''}
                            ${phone ? `<div><i class="fab fa-whatsapp"></i> ${escapeHtml(phone)}</div>` : ''}
                            ${date ? `<div><i class="fas fa-clock"></i> ${escapeHtml(date)}</div>` : ''}
                            ${extraPreview ? `<div class="lead-card-preview">${escapeHtml(extraPreview)}</div>` : '<div class="lead-card-preview">Toque para abrir a ficha completa</div>'}
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;

            container.querySelectorAll('.lead-card').forEach(card => {
                const open = () => {
                    const idx = parseInt(card.dataset.leadIndex, 10);
                    const item = window.__leadResponsesCache?.[idx];
                    if (item) openLeadDetailModal(item);
                };
                card.addEventListener('click', (e) => {
                    const btn = e.target.closest('[data-action]');
                    if (btn) {
                        e.preventDefault();
                        e.stopPropagation();
                        const idx = parseInt(card.dataset.leadIndex, 10);
                        const item = window.__leadResponsesCache?.[idx];
                        if (!item) return;
                        if (btn.dataset.action === 'favorite') {
                            setLeadMeta(item, { favorite: !getLeadMeta(item).favorite });
                        } else if (btn.dataset.action === 'contacted') {
                            setLeadMeta(item, { contacted: !getLeadMeta(item).contacted });
                        }
                        filterAndRenderFormResponses();
                        return;
                    }
                    open();
                });
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        open();
                    }
                });
            });
        }

        // Mostrar aba de Links
        function showLinksTab() {
            // Ocultar estatísticas quando estiver na aba Links - FOR?AR ESCONDER
            const statsSection = document.getElementById('stats-hero-section');
            if (statsSection) {
                statsSection.style.display = 'none';
                statsSection.style.visibility = 'hidden';
            }
            const statsGrid = document.getElementById('stats-grid');
            if (statsGrid) {
                statsGrid.style.display = 'none';
                statsGrid.style.visibility = 'hidden';
            }
            // Esconder controles administrativos na aba Links
            const adminControls = document.getElementById('admin-controls');
            if (adminControls) {
                adminControls.style.display = 'none';
                adminControls.style.visibility = 'hidden';
            }
            // Esconder barra de busca e PDF na aba Links
            const searchBar = document.querySelector('.search-bar');
            if (searchBar) {
                searchBar.style.display = 'none';
                searchBar.style.visibility = 'hidden';
            }
            
            // Carregar dados do link de cadastro após um pequeno delay
            setTimeout(() => {
                carregarDadosLinkCadastro();
                loadCadastroLinks(); // Carregar lista de links personalizados
            }, 200);
            
            // Esconder seção de loading e empty
            const loading = document.getElementById('loading');
            const empty = document.getElementById('empty');
            const itemsList = document.getElementById('items-list');
            const pdfSettingsContainer = document.getElementById('pdf-settings-container');
            
            if (loading) loading.style.display = 'none';
            if (empty) empty.style.display = 'none';
            if (itemsList) itemsList.style.display = 'none';
            if (pdfSettingsContainer) pdfSettingsContainer.style.display = 'none';
            
            // Garantir que o conteúdo esteja visível
            const content = document.getElementById('content');
            if (content) content.style.display = 'block';
            
            // Mostrar seção de links
            const linksSection = document.getElementById('links-hero-section');
            if (linksSection) {
                linksSection.style.display = 'block';
                
                // IMPORTANTE: Chamar função para remover rolagem interna
                setTimeout(() => {
                    removeLinksSectionScroll();
                }, 100);
                
                displayPublicLinks(); // Garantir que os links estejam atualizados
            } else {
                console.error('O Seção de links não encontrada no DOM');
            }
        }
        
        // Exibir links públicos (versão melhorada com cards grandes)
        function displayPublicLinks() {
            const linksHeroSection = document.getElementById('links-hero-section');
            const statsHeroSection = document.getElementById('stats-hero-section');
            
            if (!linksHeroSection) {
                console.warn('Seção de links não encontrada no DOM');
                return;
            }
            
            // Obter domínio base (usar API URL para links públicos)
            const baseUrl = (typeof window !== 'undefined' && (window.API_BASE || window.API_URL || window.location.origin) || '').toString().replace(/\/$/, '');
            
            // Atualizar os inputs com os links
            const linkCadastro = document.getElementById('link-cadastro');
            const linkPortaria = document.getElementById('link-portaria');
            
            // Controlar visibilidade dos links de cadastro (original vs personalizado)
            const linkCadastroOriginalGroup = document.getElementById('link-cadastro-original-group');
            const linkCadastroPersonalizadoGroup = document.getElementById('link-cadastro-personalizado-group');
            const linkCadastroOriginal = document.getElementById('link-cadastro');
            const linkCadastroPersonalizado = document.getElementById('link-cadastro-personalizado');
            const cadastroSlugInput = document.getElementById('cadastro-slug-input');
            
            // Preencher input do slug se existir
            if (cadastroSlugInput) {
                cadastroSlugInput.value = guestListTokens.cadastro_slug || '';
            }
            
            if (guestListTokens.cadastro_slug) {
                // Se tem slug personalizado, mostrar apenas o link personalizado
                if (linkCadastroOriginalGroup) {
                    linkCadastroOriginalGroup.style.display = 'none';
                }
                if (linkCadastroPersonalizadoGroup) {
                    linkCadastroPersonalizadoGroup.style.display = 'flex';
                }
                if (linkCadastroPersonalizado) {
                    linkCadastroPersonalizado.value = `${baseUrl}/form/${guestListTokens.cadastro_slug}`;
                    linkCadastroPersonalizado.style.color = '#ECECEC';
                }
            } else {
                // Se não tem slug personalizado, mostrar apenas o link original
                if (linkCadastroOriginalGroup) {
                    linkCadastroOriginalGroup.style.display = 'flex';
                }
                if (linkCadastroPersonalizadoGroup) {
                    linkCadastroPersonalizadoGroup.style.display = 'none';
                }
                if (linkCadastroOriginal) {
                    if (guestListTokens.share_token) {
                        linkCadastroOriginal.value = `${baseUrl}/form/${guestListTokens.share_token}`;
                        linkCadastroOriginal.style.color = '#ECECEC';
                    } else {
                        linkCadastroOriginal.value = 'Link não disponível - Salve o formulário primeiro';
                        linkCadastroOriginal.style.color = '#A1A1A1';
                        console.warn('[LINKS] share_token não encontrado');
                    }
                }
            }
            
            // Controlar visibilidade dos links (original vs personalizado)
            const linkPortariaOriginalGroup = document.getElementById('link-portaria-original-group');
            const linkPortariaPersonalizadoGroup = document.getElementById('link-portaria-personalizado-group');
            const linkPortariaOriginal = document.getElementById('link-portaria');
            const linkPortariaPersonalizado = document.getElementById('link-portaria-personalizado');
            
            if (guestListTokens.portaria_slug) {
                // Se tem slug personalizado, mostrar apenas o link personalizado
                if (linkPortariaOriginalGroup) {
                    linkPortariaOriginalGroup.style.display = 'none';
                }
                if (linkPortariaPersonalizadoGroup) {
                    linkPortariaPersonalizadoGroup.style.display = 'flex';
                }
                if (linkPortariaPersonalizado) {
                    linkPortariaPersonalizado.value = `${baseUrl}/portaria/${guestListTokens.portaria_slug}`;
                    linkPortariaPersonalizado.style.color = '#ECECEC';
                }
            } else {
                // Se não tem slug personalizado, mostrar apenas o link original
                if (linkPortariaOriginalGroup) {
                    linkPortariaOriginalGroup.style.display = 'flex';
                }
                if (linkPortariaPersonalizadoGroup) {
                    linkPortariaPersonalizadoGroup.style.display = 'none';
                }
                if (linkPortariaOriginal) {
                    if (guestListTokens.public_view_token) {
                        linkPortariaOriginal.value = `${baseUrl}/portaria/${guestListTokens.public_view_token}`;
                        linkPortariaOriginal.style.color = '#ECECEC';
                    } else if (guestListTokens.confirmation_token) {
                        // Fallback para confirmation_token se public_view_token não existir
                        linkPortariaOriginal.value = `${baseUrl}/portaria/${guestListTokens.confirmation_token}`;
                        linkPortariaOriginal.style.color = '#ECECEC';
                    } else {
                        linkPortariaOriginal.value = 'Link não disponível - Salve o formulário primeiro';
                        linkPortariaOriginal.style.color = '#A1A1A1';
                    }
                }
            }
            
            // Carregar slug personalizado no input
            const portariaSlugInput = document.getElementById('portaria-slug-input');
            if (portariaSlugInput) {
                portariaSlugInput.value = guestListTokens.portaria_slug || '';
            }
            
            // NÃƒO mostrar automaticamente - será mostrado apenas na aba Links
            // linksHeroSection.style.display = 'block'; // Removido - será mostrado apenas na aba Links
            
            // Sempre mostrar stats
            if (statsHeroSection) {
                statsHeroSection.style.display = 'grid';
            }
        }
        
        // Função para obter label do campo pelo ID
        function getFieldLabel(fieldId) {
            const fieldIdStr = fieldId.toString();
            
            // Se não tiver formFields, tentar formatar o ID de forma amigável
            if (!formFields || !Array.isArray(formFields) || formFields.length === 0) {
                // Se for apenas um número, retornar "Campo [número]"
                if (/^\d+$/.test(fieldIdStr)) {
                    return `Campo ${fieldIdStr}`;
                }
                return fieldIdStr.replace(/^field_\d+_/, '').replace(/^field_/, '').replace(/_/g, ' ') || 'Campo';
            }
            
            // PRIORIDADE 1: ID no formato "field_TIMESTAMP_INDEX" (ex: "field_1768361340392_0")
            // Extrair o último número após o último underscore
            const timestampMatch = fieldIdStr.match(/field[_-]\d+[_-](\d+)$/i);
            if (timestampMatch && timestampMatch[1]) {
                const index = parseInt(timestampMatch[1]);
                if (index >= 0 && index < formFields.length) {
                    const field = formFields[index];
                    if (field) {
                        const label = field.label || field.question || field.placeholder || field.name || field.title || `Campo ${index + 1}`;
                        return label;
                    }
                }
            }
            
            // PRIORIDADE 2: ID é apenas um número (0, 1, 2, etc) - buscar pelo índice
            if (/^\d+$/.test(fieldIdStr)) {
                const index = parseInt(fieldIdStr);
                if (index >= 0 && index < formFields.length) {
                    const field = formFields[index];
                    if (field) {
                        // Tentar label, question, placeholder, ou name
                        const label = field.label || field.question || field.placeholder || field.name || field.title || `Campo ${index + 1}`;
                        return label;
                    }
                } else {
                }
            }
            
            // PRIORIDADE 3: ID é "field_0", "field_1", etc - extrair o número e buscar pelo índice
            const match = fieldIdStr.match(/field[_-](\d+)$/i);
            if (match && match[1]) {
                const index = parseInt(match[1]);
                if (index >= 0 && index < formFields.length) {
                    const field = formFields[index];
                    if (field) {
                        return field.label || field.question || field.name || `Campo ${index + 1}`;
                    }
                }
            }
            
            // PRIORIDADE 4: Tentar encontrar pelo ID exato
            let field = formFields.find(f => {
                const fId = (f.id || '').toString();
                return fId === fieldIdStr || fId === `field_${fieldIdStr}` || fId === `field${fieldIdStr}`;
            });
            if (field) {
                return field.label || field.question || field.name || fieldIdStr;
            }
            
            // PRIORIDADE 5: Tentar encontrar pelo ID sem prefixo
            const fieldIdClean = fieldIdStr.replace(/^field[_-]?\d+[_-]?/i, '').replace(/[_-]/g, '');
            field = formFields.find(f => {
                const fId = (f.id || '').toString().replace(/^field[_-]?/i, '').replace(/[_-]/g, '');
                return fId === fieldIdClean;
            });
            if (field) {
                return field.label || field.question || field.name || fieldIdStr;
            }
            
            // PRIORIDADE 6: Tentar encontrar pelo label (se o fieldId for parecido com algum label)
            const fieldIdLower = fieldIdStr.toLowerCase();
            field = formFields.find(f => {
                const label = (f.label || f.question || f.name || '').toLowerCase();
                return label.includes(fieldIdLower) || fieldIdLower.includes(label);
            });
            if (field) {
                return field.label || field.question || field.name || fieldIdStr;
            }
            
            // Se não encontrou, retornar o ID formatado
            if (/^\d+$/.test(fieldIdStr)) {
                return `Campo ${parseInt(fieldIdStr) + 1}`;
            }
            return fieldIdStr.replace(/^field[_-]?\d+[_-]?/i, '').replace(/[_-]/g, ' ') || 'Campo';
        }
        
        // ==========================================
        // FUN—.ES DE CONFIGURA—fO DO LINK DE CADASTRO
        // ==========================================
        
        // Função para mostrar/ocultar campos de validade
        function toggleExpiresInputs() {
            const type = document.getElementById('cadastro-expires-type').value;
            document.getElementById('cadastro-expires-hours').style.display = type === 'hours' ? 'block' : 'none';
            document.getElementById('cadastro-expires-minutes').style.display = type === 'minutes' ? 'block' : 'none';
            document.getElementById('cadastro-expires-date').style.display = type === 'date' ? 'block' : 'none';
        }

        // Função para mostrar/ocultar campo de limite de usos
        function toggleMaxUsesInput() {
            const type = document.getElementById('cadastro-max-uses-type').value;
            document.getElementById('cadastro-max-uses').style.display = type === 'limited' ? 'block' : 'none';
        }

        // Função para salvar configurações do link de cadastro
        async function salvarConfiguracoesCadastro() {
            const urlParams = new URLSearchParams(window.location.search);
            const itemId = urlParams.get('itemId');
            
            if (!itemId) {
                alert('O Erro: ID do item não encontrado na URL');
                return;
            }
            
            const description = document.getElementById('cadastro-description').value.trim();
            const expiresType = document.getElementById('cadastro-expires-type').value;
            let expiresInHours = null;
            let expiresAt = null;
            
            if (expiresType === 'hours') {
                const hours = parseInt(document.getElementById('cadastro-expires-hours').value);
                if (hours && hours > 0) {
                    expiresInHours = hours;
                }
            } else if (expiresType === 'minutes') {
                const minutes = parseInt(document.getElementById('cadastro-expires-minutes').value);
                if (minutes && minutes > 0) {
                    expiresInHours = minutes / 60;
                }
            } else if (expiresType === 'date') {
                const dateValue = document.getElementById('cadastro-expires-date').value;
                if (dateValue) {
                    expiresAt = new Date(dateValue).toISOString();
                }
            }
            
            const maxUsesType = document.getElementById('cadastro-max-uses-type').value;
            const maxUses = maxUsesType === 'unlimited' ? null : 
                            parseInt(document.getElementById('cadastro-max-uses').value);
            
            try {
                const headers = getHeaders();
                const API_URL = (typeof window !== 'undefined' && (window.API_BASE || window.API_URL || window.location.origin) || '').toString().replace(/\/$/, '');
                
                const response = await fetch(`${API_URL}/api/guest-lists/${itemId}`, {
                    method: 'PUT',
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        cadastro_description: description || null,
                        cadastro_expires_in_hours: expiresInHours,
                        cadastro_expires_at: expiresAt,
                        cadastro_max_uses: maxUses
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const guestList = data.guest_list_data || data;
                    alert('Configurações do link de cadastro salvas com sucesso!');
                    // Atualizar informações exibidas
                    atualizarInfoLinkCadastro(guestList);
                } else {
                    const error = await response.json();
                    alert('O Erro ao salvar: ' + (error.message || 'Erro desconhecido'));
                }
            } catch (error) {
                console.error('Erro ao salvar configurações:', error);
                alert('O Erro ao salvar configurações. Tente novamente.');
            }
        }

        // Função para atualizar informações do link após salvar
        function atualizarInfoLinkCadastro(data) {
            if (data.cadastro_current_uses !== undefined) {
                const currentUsesEl = document.getElementById('cadastro-current-uses-display');
                if (currentUsesEl) {
                    currentUsesEl.textContent = data.cadastro_current_uses || 0;
                }
            }
            
            if (data.cadastro_max_uses !== undefined) {
                const maxUsesDisplay = document.getElementById('cadastro-max-uses-display');
                if (maxUsesDisplay) {
                    if (data.cadastro_max_uses === 999999 || data.cadastro_max_uses === null) {
                        maxUsesDisplay.textContent = 'Ilimitado';
                    } else {
                        maxUsesDisplay.textContent = data.cadastro_max_uses;
                    }
                }
            }
            
            if (data.cadastro_expires_at) {
                const expiresInfo = document.getElementById('cadastro-expires-info');
                const expiresDisplay = document.getElementById('cadastro-expires-display');
                if (expiresDisplay) {
                    expiresDisplay.textContent = new Date(data.cadastro_expires_at).toLocaleString('pt-BR');
                }
                if (expiresInfo) {
                    expiresInfo.style.display = 'block';
                }
            } else {
                const expiresInfo = document.getElementById('cadastro-expires-info');
                if (expiresInfo) {
                    expiresInfo.style.display = 'none';
                }
            }
        }

        // Função para carregar dados do link ao abrir a página
        async function carregarDadosLinkCadastro() {
            const urlParams = new URLSearchParams(window.location.search);
            const itemId = urlParams.get('itemId');
            
            if (!itemId) return;
            
            try {
                const headers = getHeaders();
                const API_URL = (typeof window !== 'undefined' && (window.API_BASE || window.API_URL || window.location.origin) || '').toString().replace(/\/$/, '');
                
                const response = await fetch(`${API_URL}/api/guest-lists/${itemId}`, {
                    headers: headers
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const guestList = data.guest_list_data || data;
                    
                    // Preencher campos
                    const descriptionEl = document.getElementById('cadastro-description');
                    if (descriptionEl && guestList.cadastro_description) {
                        descriptionEl.value = guestList.cadastro_description;
                    }
                    
                    // Configurar validade
                    if (guestList.cadastro_expires_at) {
                        const expiresTypeEl = document.getElementById('cadastro-expires-type');
                        if (expiresTypeEl) {
                            expiresTypeEl.value = 'date';
                            const expiresDate = new Date(guestList.cadastro_expires_at);
                            const expiresDateEl = document.getElementById('cadastro-expires-date');
                            if (expiresDateEl) {
                                expiresDateEl.value = expiresDate.toISOString().slice(0, 16);
                            }
                            toggleExpiresInputs();
                        }
                    }
                    
                    // Configurar limite de usos
                    if (guestList.cadastro_max_uses && guestList.cadastro_max_uses !== 999999) {
                        const maxUsesTypeEl = document.getElementById('cadastro-max-uses-type');
                        const maxUsesEl = document.getElementById('cadastro-max-uses');
                        if (maxUsesTypeEl) {
                            maxUsesTypeEl.value = 'limited';
                        }
                        if (maxUsesEl) {
                            maxUsesEl.value = guestList.cadastro_max_uses;
                        }
                        toggleMaxUsesInput();
                    }
                    
                    // Atualizar informações
                    atualizarInfoLinkCadastro(guestList);
                }
            } catch (error) {
                console.error('Erro ao carregar dados do link:', error);
            }
        }
        
        // ==========================================
        // FUN—.ES PARA MLTIPLOS LINKS PERSONALIZADOS
        // ==========================================
        
        // Carregar links personalizados ao abrir a aba Links
        async function loadCadastroLinks() {
            const container = document.getElementById('cadastro-links-list');
            if (!container) {
                console.warn('[CADASTRO_LINKS] Container cadastro-links-list não encontrado no DOM');
                return;
            }
            
            const urlParams = new URLSearchParams(window.location.search);
            const itemId = urlParams.get('itemId');
            
            if (!itemId) {
                console.warn('[CADASTRO_LINKS] itemId não encontrado');
                container.innerHTML = '<p style="color: #A1A1A1; text-align: center; padding: 20px;">ID do item não encontrado.</p>';
                return;
            }
            
            const headers = getHeaders();
            const API_URL = (typeof window !== 'undefined' && (window.API_BASE || window.API_URL || window.location.origin) || '').toString().replace(/\/$/, '');
            
            // Mostrar loading
            container.innerHTML = '<p style="color: #A1A1A1; text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Carregando links personalizados...</p>';
            
            try {
                // Por enquanto, vamos usar uma API que precisará ser criada no backend
                // Por enquanto, vamos apenas mostrar uma mensagem
                const response = await fetch(`${API_URL}/api/guest-lists/${itemId}/cadastro-links`, {
                    method: 'GET',
                    headers: headers
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
                        renderCadastroLinksList(data.data);
                    } else {
                        container.innerHTML = '<p style="color: #A1A1A1; text-align: center; padding: 20px;">Nenhum link personalizado criado ainda.</p>';
                    }
                } else if (response.status === 404) {
                    // API ainda não existe - mostrar mensagem amigável
                    container.innerHTML = '<p style="color: #A1A1A1; text-align: center; padding: 20px;">Nenhum link personalizado criado ainda. Clique em "Criar Múltiplos Links Personalizados" para começar.</p>';
                } else {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }
            } catch (error) {
                console.error('[CADASTRO_LINKS] Erro ao carregar links:', error);
                // Se a API não existir ainda, mostrar mensagem amigável
                if (error.message.includes('404') || error.message.includes('not found')) {
                    container.innerHTML = '<p style="color: #A1A1A1; text-align: center; padding: 20px;">Nenhum link personalizado criado ainda. Clique em "Criar Múltiplos Links Personalizados" para começar.</p>';
                } else {
                    container.innerHTML = `<p style="color: #ff4444; text-align: center; padding: 20px; line-height: 1.6;"><i class="fas fa-exclamation-triangle"></i> <strong>Erro ao carregar links:</strong><br>${error.message}</p>`;
                }
            }
        }
        
        // Função para iniciar cronÃ´metro em tempo real
        function startCountdown(elementId, expiresAt) {
            const element = document.getElementById(elementId);
            if (!element) return;
            
            const countdownText = element.querySelector('.countdown-text');
            if (!countdownText) return;
            
            function updateCountdown() {
                const now = new Date();
                const diff = expiresAt.getTime() - now.getTime();
                
                if (diff <= 0) {
                    countdownText.textContent = 'Expirado';
                    countdownText.style.color = '#ff4444';
                    return;
                }
                
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                
                let timeStr = '';
                if (days > 0) {
                    timeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;
                } else if (hours > 0) {
                    timeStr = `${hours}h ${minutes}m ${seconds}s`;
                } else if (minutes > 0) {
                    timeStr = `${minutes}m ${seconds}s`;
                } else {
                    timeStr = `${seconds}s`;
                }
                
                countdownText.textContent = `Faltam ${timeStr}`;
                countdownText.style.color = '#43e97b';
            }
            
            updateCountdown();
            const interval = setInterval(() => {
                updateCountdown();
                const now = new Date();
                if (expiresAt.getTime() <= now.getTime()) {
                    clearInterval(interval);
                    // Recarregar lista quando expirar
                    setTimeout(() => loadCadastroLinks(), 1000);
                }
            }, 1000);
        }
        
        // Renderizar lista de links personalizados
        function renderCadastroLinksList(links) {
            const container = document.getElementById('cadastro-links-list');
            
            if (!container) {
                console.warn('[CADASTRO_LINKS] Container cadastro-links-list não encontrado ao renderizar');
                return;
            }
            
            if (!links || links.length === 0) {
                container.innerHTML = '<p style="color: #A1A1A1; text-align: center; padding: 20px;">Nenhum link personalizado criado ainda.</p>';
                return;
            }
            
            const baseUrl = (typeof window !== 'undefined' && (window.API_BASE || window.API_URL || window.location.origin) || '').toString().replace(/\/$/, '');
            const urlParams = new URLSearchParams(window.location.search);
            const itemId = urlParams.get('itemId');
            const slug = guestListTokens?.profile_slug || 'usuario';
            
            // Escapar HTML para prevenir XSS
            const escapeHtml = (text) => {
                if (!text) return '';
                const div = document.createElement('div');
                div.textContent = String(text);
                return div.innerHTML;
            };
            
            container.innerHTML = links.map(link => {
                const status = link.isExpired ? 'expired' : (link.isUsed ? 'used' : 'active');
                const statusColor = status === 'active' ? '#43e97b' : status === 'used' ? '#ff4444' : '#A1A1A1';
                const statusText = status === 'active' ? 'Disponível' : status === 'used' ? 'Usado' : 'Expirado';
                const hasExpiration = link.expires_at !== null && link.expires_at !== undefined;
                const expiresAtDate = link.expires_at ? new Date(link.expires_at) : null;
                const isCurrentlyExpired = expiresAtDate && expiresAtDate < new Date();
                const fullUrl = `${baseUrl}/form/${escapeHtml(link.slug)}`;
                const description = link.description ? escapeHtml(link.description) : '';
                const linkId = link.id;
                
                // Calcular tempo restante se não estiver expirado - criar versões separadas para desktop e mobile
                let timeRemainingHtmlDesktop = '';
                let timeRemainingHtmlMobile = '';
                if (hasExpiration && expiresAtDate && !isCurrentlyExpired) {
                    const timeRemainingIdDesktop = `countdown-desktop-${linkId}`;
                    const timeRemainingIdMobile = `countdown-mobile-${linkId}`;
                    timeRemainingHtmlDesktop = `<div id="${timeRemainingIdDesktop}" style="color: #43e97b; font-weight: 600; font-size: 13px;">
                        <i class="fas fa-clock"></i> <span class="countdown-text">Calculando...</span>
                    </div>`;
                    timeRemainingHtmlMobile = `<div id="${timeRemainingIdMobile}" style="color: #43e97b; font-weight: 600; font-size: 13px;">
                        <i class="fas fa-clock"></i> <span class="countdown-text">Calculando...</span>
                    </div>`;
                } else if (isCurrentlyExpired) {
                    timeRemainingHtmlDesktop = '<div style="color: #ff4444; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> Expirado</div>';
                    timeRemainingHtmlMobile = '<div style="color: #ff4444; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> Expirado</div>';
                } else {
                    timeRemainingHtmlDesktop = '<div style="color: #43e97b;"><i class="fas fa-infinity"></i> <strong>Sem expiração</strong></div>';
                    timeRemainingHtmlMobile = '<div style="color: #43e97b;"><i class="fas fa-infinity"></i> <strong>Sem expiração</strong></div>';
                }
                
                return `
                    <div class="personalized-link-item-mobile" style="background: rgba(43,233,123,0.1); border: 1px solid ${statusColor}40; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
                        <!-- Versão Desktop -->
                        <div class="link-item-desktop" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <span style="padding: 4px 12px; background: ${statusColor}20; color: ${statusColor}; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                        ${statusText}
                                    </span>
                                    ${description ? `<span style="color: #ECECEC; font-weight: 600; font-size: 14px;">${description}</span>` : ''}
                                </div>
                                <div class="cadastro-link-input-group" style="display: flex; gap: 8px; align-items: stretch; margin-bottom: 8px; flex-wrap: wrap;">
                                    <input type="text" id="cadastro-link-input-${linkId}" value="${fullUrl}" readonly 
                                           style="flex: 1; min-width: 0; padding: 10px 12px; background: rgba(0,0,0,0.4); border: 1px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 12px; font-family: monospace; word-break: break-all; overflow-wrap: break-word;">
                                    <button onclick="copyCadastroLink('cadastro-link-input-${linkId}', event)"
                                            class="cadastro-link-copy-btn"
                                            style="padding: 10px 16px; background: #000; border: 2px solid #43e97b; border-radius: 8px; color: #43e97b; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s; min-width: fit-content;"
                                            onmouseover="this.style.background='#43e97b'; this.style.color='#000';"
                                            onmouseout="this.style.background='#000'; this.style.color='#43e97b';">
                                        <i class="fas fa-copy"></i> Copiar
                                    </button>
                                </div>
                                <div style="color: #A1A1A1; font-size: 12px; display: flex; flex-direction: column; gap: 4px;">
                                    ${timeRemainingHtmlDesktop}
                                    <div><i class="fas fa-hashtag"></i> Slug: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">${escapeHtml(link.slug)}</code></div>
                                    <div><i class="fas fa-users"></i> Uso: <strong style="color: #ECECEC;">${link.current_uses || 0}</strong>/${link.max_uses === 999999 || link.max_uses === null ? 'Ilimitado' : link.max_uses}</div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px; flex-direction: column;">
                                <div style="display: flex; gap: 8px;">
                                    <button onclick="editCadastroLink(${linkId}, event)" 
                                            style="padding: 8px 12px; background: rgba(67,233,123,0.2); border: 1px solid #43e97b; border-radius: 8px; color: #43e97b; font-weight: 600; cursor: pointer; font-size: 12px; white-space: nowrap;"
                                            title="Editar link">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="deleteCadastroLink(${linkId}, event)" 
                                            style="padding: 8px 12px; background: rgba(255,68,68,0.2); border: 1px solid #ff4444; border-radius: 8px; color: #ff4444; font-weight: 600; cursor: pointer; font-size: 12px; white-space: nowrap;"
                                            title="Apagar link">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                                <button onclick="toggleActiveCadastroLink(${linkId}, event)" 
                                        style="padding: 6px 10px; background: ${link.isActiveForProfile ? 'rgba(67,233,123,0.3)' : 'rgba(255,68,68,0.1)'}; border: 1px solid ${link.isActiveForProfile ? '#43e97b' : '#ff4444'}; border-radius: 6px; color: ${link.isActiveForProfile ? '#43e97b' : '#ff4444'}; font-weight: 600; cursor: pointer; font-size: 11px; white-space: nowrap; width: 100%; transition: all 0.3s;"
                                        onmouseover="this.style.background='${link.isActiveForProfile ? 'rgba(67,233,123,0.2)' : 'rgba(255,68,68,0.2)'}';"
                                        onmouseout="this.style.background='${link.isActiveForProfile ? 'rgba(67,233,123,0.3)' : 'rgba(255,68,68,0.1)'}';"
                                        title="${link.isActiveForProfile ? 'Desativar do cartão público' : 'Ativar no cartão público'}">
                                    <i class="fas fa-${link.isActiveForProfile ? 'check-circle' : 'circle'}"></i> ${link.isActiveForProfile ? 'Ativo' : 'Ativar'}
                                </button>
                                ${link.isExpired || link.isUsed ? `
                                <button onclick="renewCadastroLink(${linkId}, event)" 
                                        style="padding: 6px 10px; background: rgba(67,233,123,0.1); border: 1px solid #43e97b; border-radius: 6px; color: #43e97b; font-weight: 600; cursor: pointer; font-size: 11px; white-space: nowrap; width: 100%; transition: all 0.3s;"
                                        onmouseover="this.style.background='rgba(67,233,123,0.2)';"
                                        onmouseout="this.style.background='rgba(67,233,123,0.1)';"
                                        title="Renovar link (permitir mais um uso)">
                                    <i class="fas fa-redo"></i> Renovar
                                </button>
                                ` : ''}
                            </div>
                        </div>
                        <!-- Versão Mobile - Ordem reorganizada -->
                        <div class="link-item-mobile" style="display: none;">
                            ${description ? `<div class="link-mobile-name" style="color: #ECECEC; font-weight: 600; font-size: 16px; margin-bottom: 8px;">${description}</div>` : ''}
                            <div class="link-mobile-status" style="margin-bottom: 8px;">
                                <span style="padding: 4px 12px; background: ${statusColor}20; color: ${statusColor}; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                    ${statusText}
                                </span>
                            </div>
                            <div class="link-mobile-slug" style="color: #ECECEC; font-size: 14px; margin-bottom: 8px; font-weight: 600;">
                                <i class="fas fa-hashtag"></i> ${escapeHtml(link.slug)}
                            </div>
                            <div class="link-mobile-url" style="margin-bottom: 8px;">
                                <input type="text" id="cadastro-link-input-mobile-${linkId}" value="${fullUrl}" readonly 
                                       style="width: 100%; padding: 10px 12px; background: rgba(0,0,0,0.4); border: 1px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 12px; font-family: monospace; word-break: break-all; overflow-wrap: break-word; box-sizing: border-box;">
                            </div>
                            <div class="link-mobile-copy" style="margin-bottom: 8px;">
                                <button onclick="copyCadastroLink('cadastro-link-input-mobile-${linkId}', event)"
                                        class="cadastro-link-copy-btn"
                                        style="width: 100%; padding: 10px 16px; background: #000; border: 2px solid #43e97b; border-radius: 8px; color: #43e97b; font-weight: 600; cursor: pointer; transition: all 0.3s; box-sizing: border-box;"
                                        onmouseover="this.style.background='#43e97b'; this.style.color='#000';"
                                        onmouseout="this.style.background='#000'; this.style.color='#43e97b';">
                                    <i class="fas fa-copy"></i> Copiar
                                </button>
                            </div>
                            <div class="link-mobile-actions" style="display: flex; gap: 8px; margin-bottom: 8px;">
                                <button onclick="editCadastroLink(${linkId}, event)" 
                                        style="flex: 1; padding: 8px 12px; background: rgba(67,233,123,0.2); border: 1px solid #43e97b; border-radius: 8px; color: #43e97b; font-weight: 600; cursor: pointer; font-size: 12px;"
                                        title="Editar link">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button onclick="deleteCadastroLink(${linkId}, event)" 
                                        style="flex: 1; padding: 8px 12px; background: rgba(255,68,68,0.2); border: 1px solid #ff4444; border-radius: 8px; color: #ff4444; font-weight: 600; cursor: pointer; font-size: 12px;"
                                        title="Apagar link">
                                    <i class="fas fa-trash"></i> Excluir
                                </button>
                            </div>
                            <div class="link-mobile-activate" style="margin-bottom: 8px;">
                                <button onclick="toggleActiveCadastroLink(${linkId}, event)" 
                                        style="width: 100%; padding: 8px 12px; background: ${link.isActiveForProfile ? 'rgba(67,233,123,0.3)' : 'rgba(255,68,68,0.1)'}; border: 1px solid ${link.isActiveForProfile ? '#43e97b' : '#ff4444'}; border-radius: 8px; color: ${link.isActiveForProfile ? '#43e97b' : '#ff4444'}; font-weight: 600; cursor: pointer; font-size: 12px; transition: all 0.3s; box-sizing: border-box;"
                                        title="${link.isActiveForProfile ? 'Desativar do cartão público' : 'Ativar no cartão público'}">
                                    <i class="fas fa-${link.isActiveForProfile ? 'check-circle' : 'circle'}"></i> ${link.isActiveForProfile ? 'Ativo' : 'Ativar'}
                                </button>
                            </div>
                            ${link.isExpired || link.isUsed ? `
                            <div class="link-mobile-renew" style="margin-bottom: 8px;">
                                <button onclick="renewCadastroLink(${linkId}, event)" 
                                        style="width: 100%; padding: 8px 12px; background: rgba(67,233,123,0.1); border: 1px solid #43e97b; border-radius: 8px; color: #43e97b; font-weight: 600; cursor: pointer; font-size: 12px; transition: all 0.3s; box-sizing: border-box;"
                                        title="Renovar link (permitir mais um uso)">
                                    <i class="fas fa-redo"></i> Renovar
                                </button>
                            </div>
                            ` : ''}
                            <div class="link-mobile-expiration" style="color: #A1A1A1; font-size: 12px;">
                                ${timeRemainingHtmlMobile}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Iniciar cronÃ´metros para links ativos (desktop e mobile)
            links.forEach(link => {
                if (link.expires_at && !link.isExpired) {
                    const expiresAt = new Date(link.expires_at);
                    // Iniciar countdown para desktop
                    startCountdown(`countdown-desktop-${link.id}`, expiresAt);
                    // Iniciar countdown para mobile
                    startCountdown(`countdown-mobile-${link.id}`, expiresAt);
                }
            });
        }
        
        // Mostrar modal para criar múltiplos links personalizados
        function showCreateMultipleCadastroLinksModal() {
            const urlParams = new URLSearchParams(window.location.search);
            const itemId = urlParams.get('itemId');
            
            if (!itemId) {
                alert('O Erro: ID do item não encontrado. Recarregue a página e tente novamente.');
                console.error('[CADASTRO_LINKS] itemId não encontrado ao abrir modal');
                return;
            }
            
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            `;
            
            modal.innerHTML = `
                <div style="background: #1C1C21; border: 2px solid #43e97b; border-radius: 20px; padding: 32px; max-width: 600px; width: 100%; color: #ECECEC; max-height: 90vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h2 style="margin: 0; color: #43e97b; font-size: 24px; font-weight: 700;">
                            <i class="fas fa-link"></i> Criar Múltiplos Links Personalizados
                        </h2>
                        <button onclick="this.closest('[style*=\\'position: fixed\\']').remove()" 
                                style="background: transparent; border: none; color: #ECECEC; font-size: 24px; cursor: pointer; padding: 0; width: 32px; height: 32px;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <div>
                            <label style="display: block; color: #43e97b; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                                Descrição Base (opcional)
                            </label>
                            <input type="text" id="multiple-link-description" 
                                   placeholder="Ex: Link para evento, Link para João"
                                   autocomplete="off"
                                   style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; caret-color: #43e97b; -webkit-text-fill-color: #ECECEC; font-size: 16px; line-height: 1.2; -webkit-appearance: none;">
                            <p style="color: #A1A1A1; font-size: 12px; margin-top: 6px; line-height: 1.4;">
                                <i class="fas fa-info-circle"></i> Esta descrição será usada como base. Se criar múltiplos links, será adicionado um número (ex: "Link para evento (1)", "Link para evento (2)")
                            </p>
                        </div>
                        
                        <div>
                            <label style="display: block; color: #43e97b; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                                Slug Base (opcional)
                            </label>
                            <input type="text" id="multiple-link-slug-base" 
                                   placeholder="Ex: evento-2026, inscricao-conecta"
                                   pattern="[a-z0-9-]+"
                                   maxlength="40"
                                   autocapitalize="none"
                                   autocorrect="off"
                                   spellcheck="false"
                                   style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; caret-color: #43e97b; -webkit-text-fill-color: #ECECEC; font-size: 16px; line-height: 1.2; -webkit-appearance: none;">
                            <p style="color: #A1A1A1; font-size: 12px; margin-top: 6px; line-height: 1.4;">
                                <i class="fas fa-info-circle"></i> Use apenas letras minúsculas, números e hífens. Se criar múltiplos links, será adicionado um número (ex: "evento-2026-1", "evento-2026-2")
                            </p>
                        </div>
                        
                        <div>
                            <label style="display: block; color: #43e97b; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                                Número de Usos (Quantas vezes cada link pode ser usado)
                            </label>
                            <select id="multiple-link-max-uses" 
                                    style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 16px; cursor: pointer; -webkit-appearance: none;">
                                <option value="">Ilimitado (sem limite de usos)</option>
                                <option value="1">1 vez</option>
                                <option value="2">2 vezes</option>
                                <option value="3">3 vezes</option>
                                <option value="5">5 vezes</option>
                                <option value="10">10 vezes</option>
                                <option value="50">50 vezes</option>
                                <option value="100">100 vezes</option>
                            </select>
                        </div>
                        
                        <div>
                            <label style="display: block; color: #43e97b; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                                Quantidade de Links
                            </label>
                            <input type="number" id="multiple-link-quantity" min="1" max="100" value="1"
                                   placeholder="Digite a quantidade"
                                   style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; caret-color: #43e97b; -webkit-text-fill-color: #ECECEC; font-size: 16px; line-height: 1.2; -webkit-appearance: none;">
                        </div>
                        
                        <div>
                            <label style="display: block; color: #43e97b; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                                Validade (opcional)
                            </label>
                            <div style="display: flex; gap: 8px;">
                                <input type="number" id="multiple-link-duration" min="0" value=""
                                       placeholder="Deixe em branco para sem expiração"
                                       style="flex: 1; padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; caret-color: #43e97b; -webkit-text-fill-color: #ECECEC; font-size: 16px; line-height: 1.2; -webkit-appearance: none;">
                                <select id="multiple-link-unit" 
                                        style="padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 16px; cursor: pointer; min-width: 120px; -webkit-appearance: none;">
                                    <option value="minutes">Minutos</option>
                                    <option value="hours" selected>Horas</option>
                                    <option value="days">Dias</option>
                                </select>
                            </div>
                            <p style="color: #A1A1A1; font-size: 12px; margin-top: 6px; line-height: 1.4;">
                                <i class="fas fa-info-circle"></i> Deixe em branco para criar links sem tempo de expiração.
                            </p>
                        </div>
                        
                        <div style="padding: 16px; background: rgba(67,233,123,0.1); border-radius: 12px; border-left: 4px solid #43e97b;">
                            <p style="color: #ECECEC; font-size: 13px; line-height: 1.6; margin: 0;">
                                <i class="fas fa-info-circle"></i> <strong>Como funciona:</strong><br>
                                — Cada link terá seu próprio slug único e personalizado<br>
                                — Você pode criar quantos links quiser de uma vez<br>
                                — Cada link pode ter suas próprias configurações de validade e limite de usos<br>
                                — Ideal para criar links diferentes para diferentes grupos ou eventos
                            </p>
                        </div>
                        
                        <div style="display: flex; gap: 12px; margin-top: 8px;">
                            <button onclick="createMultipleCadastroLinks(${itemId}, event)" 
                                    style="flex: 1; padding: 14px 24px; background: linear-gradient(135deg, #43e97b, #38f9d7); border: none; border-radius: 8px; color: #000; font-weight: 700; cursor: pointer; font-size: 16px;">
                                <i class="fas fa-plus-circle"></i> Criar Link(s)
                            </button>
                            <button onclick="this.closest('[style*=\\'position: fixed\\']').remove()" 
                                    style="padding: 14px 24px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #ECECEC; font-weight: 600; cursor: pointer;">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);

            // iOS: garantir que inputs sejam focáveis e texto apareça corretamente
            try {
                const slugInput = modal.querySelector('#multiple-link-slug-base');
                if (slugInput) {
                    const toSlugBase = (raw) => {
                        return (raw || '')
                            .toString()
                            .trim()
                            .toLowerCase()
                            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
                            .replace(/[——^']/g, '-') // traços ?oestranhos— do iOS — hífen
                            .replace(/[^a-z0-9-]+/g, '-') // espaços e símbolos — hífen
                            .replace(/-+/g, '-')
                            .replace(/^-+|-+$/g, '');
                    };
                    slugInput.addEventListener('blur', () => {
                        slugInput.value = toSlugBase(slugInput.value);
                    });
                }
            } catch (e) {}
            
            // Fechar ao clicar fora
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }
        
        // Criar múltiplos links personalizados
        async function createMultipleCadastroLinks(itemIdParam, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            const finalItemId = itemIdParam || itemId;
            
            if (!finalItemId) {
                alert('O Erro: ID do item não encontrado. Recarregue a página e tente novamente.');
                return;
            }
            
            const descriptionInput = document.getElementById('multiple-link-description');
            const slugBaseInput = document.getElementById('multiple-link-slug-base');
            const durationInput = document.getElementById('multiple-link-duration');
            const unitSelect = document.getElementById('multiple-link-unit');
            const quantityInput = document.getElementById('multiple-link-quantity');
            const maxUsesSelect = document.getElementById('multiple-link-max-uses');
            
            const descriptionBase = descriptionInput ? (descriptionInput.value || '').trim() : '';
            const toSlugBase = (raw) => {
                return (raw || '')
                    .toString()
                    .trim()
                    .toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos (ex.: João — joao)
                    .replace(/[——^']/g, '-') // traços do iOS
                    .replace(/[^a-z0-9-]+/g, '-') // espaços — hífen
                    .replace(/-+/g, '-')
                    .replace(/^-+|-+$/g, '');
            };
            const slugBase = slugBaseInput ? toSlugBase(slugBaseInput.value) : '';
            const quantity = quantityInput ? parseInt(quantityInput.value || '1') : 1;
            const maxUsesValue = maxUsesSelect ? (maxUsesSelect.value || '').trim() : '';
            const maxUses = maxUsesValue === '' ? null : parseInt(maxUsesValue);
            
            // Validar quantidade
            if (quantity <= 0 || quantity > 100 || isNaN(quantity)) {
                alert('O Por favor, digite uma quantidade entre 1 e 100.');
                return;
            }
            
            // Verificar se validade é opcional
            const hasExpiration = durationInput && durationInput.value && durationInput.value.trim() !== '';
            let expiresInHours = null;
            let expiresInMinutes = null;
            const unit = unitSelect ? unitSelect.value : 'hours';
            
            if (hasExpiration) {
                const duration = durationInput ? parseFloat(durationInput.value) : null;
                
                if (duration <= 0 || isNaN(duration)) {
                    alert('O Por favor, digite um valor válido para a validade, ou deixe em branco para link sem expiração.');
                    return;
                }
                
                if (unit === 'minutes') {
                    expiresInMinutes = duration;
                } else if (unit === 'days') {
                    expiresInHours = duration * 24;
                } else {
                    expiresInHours = duration;
                }
            }
            
            const headers = getHeaders();
            const API_URL = (typeof window !== 'undefined' && (window.API_BASE || window.API_URL || window.location.origin) || '').toString().replace(/\/$/, '');
            
            // Mostrar loading no botão
            const button = event ? event.target.closest('button') : null;
            const originalButtonText = button ? button.innerHTML : '';
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';
            }
            
            // Criar múltiplos links
            try {
                const createdLinks = [];
                const errors = [];
                
                for (let i = 0; i < quantity; i++) {
                    try {
                        // Gerar slug único para cada link
                        let slug = slugBase;
                        if (slug && quantity > 1) {
                            slug = `${slug}-${i + 1}`;
                        } else if (!slug) {
                            // Gerar slug aleatório se não fornecido
                            slug = `link-${Date.now()}-${i + 1}`;
                        }
                        
                        // Gerar descrição única para cada link
                        let description = descriptionBase;
                        if (description && quantity > 1) {
                            description = `${description} (${i + 1})`;
                        }
                        
                        // Por enquanto, vamos usar a API de guest-lists para salvar cada link
                        // Isso criará um novo registro ou atualizará o existente
                        // NOTA: Isso requer uma nova API no backend para suportar múltiplos links
                        const response = await fetch(`${API_URL}/api/guest-lists/${finalItemId}/cadastro-links`, {
                            method: 'POST',
                            headers: {
                                ...headers,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                description: description || null,
                                slug: slug,
                                expiresInHours: expiresInHours !== null ? expiresInHours : undefined,
                                expiresInMinutes: expiresInMinutes !== null ? expiresInMinutes : undefined,
                                maxUses: maxUses
                            })
                        });
                        
                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({ error: `Erro HTTP: ${response.status}` }));
                            throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
                        }
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            createdLinks.push(data.data);
                        } else {
                            throw new Error(data.error || 'Erro desconhecido ao criar link');
                        }
                    } catch (error) {
                        console.error(`[CADASTRO_LINKS] Erro ao criar link ${i + 1}/${quantity}:`, error);
                        errors.push(`Link ${i + 1}: ${error.message || 'Erro desconhecido'}`);
                    }
                }
                
                // Mostrar resultados
                if (createdLinks.length > 0) {
                    // Fechar modal
                    const modal = event ? event.target.closest('[style*="position: fixed"]') : null;
                    if (modal) {
                        modal.remove();
                    }
                    
                    // Recarregar lista de links
                    setTimeout(() => {
                        loadCadastroLinks();
                    }, 500);
                    
                    // Mostrar mensagem de sucesso
                    if (errors.length > 0) {
                        alert(`${createdLinks.length} link(s) criado(s) com sucesso!\nO ${errors.length} erro(s): ${errors.join(', ')}`);
                    } else {
                        alert(`${createdLinks.length} link(s) criado(s) com sucesso!`);
                    }
                } else {
                    throw new Error(`Não foi possível criar nenhum link. Erros: ${errors.join('; ')}`);
                }
            } catch (error) {
                console.error('[CADASTRO_LINKS] Erro ao criar link(s):', error);
                alert(`O Erro ao criar link(s): ${error.message || 'Erro desconhecido'}\n\nNota: Esta funcionalidade requer uma API no backend que ainda precisa ser criada.`);
            } finally {
                // Restaurar botão
                if (button) {
                    button.disabled = false;
                    button.innerHTML = originalButtonText;
                }
            }
        }
        
        // Editar link personalizado
        async function editCadastroLink(linkId, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            // Buscar dados do link
            const headers = getHeaders();
            const API_URL = (typeof window !== 'undefined' && (window.API_BASE || window.API_URL || window.location.origin) || '').toString().replace(/\/$/, '');
            const urlParams = new URLSearchParams(window.location.search);
            const itemId = urlParams.get('itemId');
            
            try {
                // Buscar todos os links para encontrar o que queremos editar
                const response = await fetch(`${API_URL}/api/guest-lists/${itemId}/cadastro-links`, {
                    method: 'GET',
                    headers: headers
                });
                
                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (!data.success || !data.data) {
                    throw new Error('Erro ao buscar dados do link');
                }
                
                const linkToEdit = data.data.find(link => link.id === linkId);
                
                if (!linkToEdit) {
                    throw new Error('Link não encontrado');
                }
                
                // Criar modal de edição
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.8);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                `;
                
                // Calcular expiresInHours e expiresInMinutes a partir de expires_at
                // IMPORTANTE: Se expires_at for null, não calcular nada - será "Sem expiração"
                let expiresInHours = null;
                let expiresInMinutes = null;
                let expiresDate = null;
                let expiresTime = null;
                let expiresType = 'never'; // Padrão: sem expiração
                
                if (linkToEdit.expires_at) {
                    const expiresDateObj = new Date(linkToEdit.expires_at);
                    const now = new Date();
                    const diffMs = expiresDateObj.getTime() - now.getTime();
                    
                    // Se a data já passou, usar datetime para permitir reativação
                    if (diffMs < 0) {
                        expiresType = 'datetime';
                        expiresDate = expiresDateObj.toISOString().split('T')[0];
                        expiresTime = expiresDateObj.toTimeString().split(' ')[0].substring(0, 5);
                    } else {
                        const diffHours = diffMs / (1000 * 60 * 60);
                        const diffMinutes = diffMs / (1000 * 60);
                        
                        // CORRIGIDO: Se for menos de 1 hora (60 minutos), usar minutos
                        // Priorizar minutos para valores pequenos (1-59 minutos)
                        if (diffHours < 1 && diffMinutes >= 1) {
                            expiresType = 'minutes';
                            expiresInMinutes = Math.floor(diffMinutes);
                        } else if (diffHours >= 1 && diffHours < 24) {
                            // Se for 1 hora ou mais, mas menos de 24 horas, verificar se é número redondo de horas
                            const wholeHours = Math.floor(diffHours);
                            const remainingMinutes = (diffHours - wholeHours) * 60;
                            
                            // Se restarem menos de 5 minutos, usar horas arredondadas
                            // Caso contrário, usar minutos para precisão
                            if (remainingMinutes < 5) {
                                expiresType = 'hours';
                                expiresInHours = wholeHours;
                            } else {
                                expiresType = 'minutes';
                                expiresInMinutes = Math.floor(diffMinutes);
                            }
                        } else if (diffHours >= 24) {
                            // Se for 24 horas ou mais, usar horas
                            expiresType = 'hours';
                            expiresInHours = Math.floor(diffHours);
                        } else {
                            // Se for muito próximo (menos de 1 minuto), usar datetime
                            expiresType = 'datetime';
                            expiresDate = expiresDateObj.toISOString().split('T')[0];
                            expiresTime = expiresDateObj.toTimeString().split(' ')[0].substring(0, 5);
                        }
                    }
                }
                
                modal.innerHTML = `
                    <div style="background: #1C1C21; border: 2px solid #43e97b; border-radius: 20px; padding: 32px; max-width: 600px; width: 100%; color: #ECECEC; max-height: 90vh; overflow-y: auto;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                            <h2 style="margin: 0; color: #43e97b; font-size: 24px; font-weight: 700;">
                                <i class="fas fa-edit"></i> Editar Link Personalizado
                            </h2>
                            <button onclick="this.closest('[style*=\\'position: fixed\\']').remove()" 
                                    style="background: transparent; border: none; color: #ECECEC; font-size: 24px; cursor: pointer; padding: 0; width: 32px; height: 32px;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 16px;">
                            <div>
                                <label style="display: block; color: #43e97b; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                                    Slug (Nome do Link) *
                                </label>
                                <input type="text" id="edit-link-slug" 
                                       value="${linkToEdit.slug || ''}"
                                       placeholder="Ex: evento-2026, inscricao-conecta"
                                       pattern="[a-z0-9-]+"
                                       maxlength="50"
                                       required
                                       style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 14px;">
                                <p style="color: #A1A1A1; font-size: 12px; margin-top: 6px; line-height: 1.4;">
                                    <i class="fas fa-info-circle"></i> Use apenas letras minúsculas, números e hífens. Mínimo 3 caracteres.
                                </p>
                            </div>
                            
                            <div>
                                <label style="display: block; color: #43e97b; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                                    Descrição (opcional)
                                </label>
                                <input type="text" id="edit-link-description" 
                                       value="${linkToEdit.description || ''}"
                                       placeholder="Ex: Link para evento, Link para João"
                                       style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 14px;">
                            </div>
                            
                            <div>
                                <label style="display: block; color: #43e97b; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                                    Validade do Link
                                </label>
                                <select id="edit-link-expires-type" onchange="toggleEditExpiresInputs()"
                                        style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 14px; cursor: pointer; margin-bottom: 12px;">
                                    <option value="never" ${expiresType === 'never' ? 'selected' : ''}>Sem expiração</option>
                                    <option value="hours" ${expiresType === 'hours' ? 'selected' : ''}>Expirar em X horas</option>
                                    <option value="minutes" ${expiresType === 'minutes' ? 'selected' : ''}>Expirar em X minutos</option>
                                    <option value="datetime" ${expiresType === 'datetime' ? 'selected' : ''}>Expirar em data/hora específica</option>
                                </select>
                                
                                <div id="edit-link-expires-hours" style="display: ${expiresInHours !== null ? 'block' : 'none'};">
                                    <input type="number" id="edit-link-expires-hours-value" 
                                           value="${expiresInHours || ''}"
                                           min="1" 
                                           placeholder="Digite o número de horas"
                                           style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 14px;">
                                </div>
                                
                                <div id="edit-link-expires-minutes" style="display: ${expiresInMinutes !== null ? 'block' : 'none'};">
                                    <input type="number" id="edit-link-expires-minutes-value" 
                                           value="${expiresInMinutes || ''}"
                                           min="1" 
                                           placeholder="Digite o número de minutos"
                                           style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 14px;">
                                </div>
                                
                                <div id="edit-link-expires-datetime" style="display: ${expiresType === 'datetime' ? 'flex' : 'none'}; gap: 8px; flex-direction: column;">
                                    <input type="date" id="edit-link-expires-date" 
                                           value="${expiresDate || ''}"
                                           style="padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 14px;">
                                    <input type="time" id="edit-link-expires-time" 
                                           value="${expiresTime || ''}"
                                           style="padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 14px;">
                                </div>
                            </div>
                            
                            <div>
                                <label style="display: block; color: #43e97b; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                                    Limite de Usos
                                </label>
                                <select id="edit-link-max-uses" onchange="toggleEditMaxUsesInput()"
                                        style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 14px; cursor: pointer; margin-bottom: 12px;">
                                    <option value="999999" ${linkToEdit.max_uses === 999999 || linkToEdit.max_uses === null ? 'selected' : ''}>Ilimitado</option>
                                    <option value="custom" ${linkToEdit.max_uses !== 999999 && linkToEdit.max_uses !== null ? 'selected' : ''}>Personalizado</option>
                                </select>
                                <input type="number" id="edit-link-max-uses-custom" 
                                       value="${linkToEdit.max_uses !== 999999 && linkToEdit.max_uses !== null ? linkToEdit.max_uses : ''}"
                                       min="1" 
                                       placeholder="Digite o número máximo de usos"
                                       style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 14px; display: ${linkToEdit.max_uses !== 999999 && linkToEdit.max_uses !== null ? 'block' : 'none'};">
                            </div>
                            
                            <div style="padding: 16px; background: rgba(67,233,123,0.1); border-radius: 12px; border-left: 4px solid #43e97b;">
                                <p style="color: #ECECEC; font-size: 13px; line-height: 1.6; margin: 0;">
                                    <i class="fas fa-info-circle"></i> <strong>Dica:</strong> Para reativar um link expirado, defina uma nova data de expiração no futuro ou escolha "Sem expiração".
                                </p>
                            </div>
                            
                            <div style="display: flex; gap: 12px; margin-top: 8px;">
                                <button onclick="saveEditCadastroLink(${linkId}, event)" 
                                        style="flex: 1; padding: 14px 24px; background: linear-gradient(135deg, #43e97b, #38f9d7); border: none; border-radius: 8px; color: #000; font-weight: 700; cursor: pointer; font-size: 16px;">
                                    <i class="fas fa-save"></i> Salvar Alterações
                                </button>
                                <button onclick="this.closest('[style*=\\'position: fixed\\']').remove()" 
                                        style="padding: 14px 24px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #ECECEC; font-weight: 600; cursor: pointer;">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // Fechar ao clicar fora
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.remove();
                    }
                });
                
                // Definir funções auxiliares no escopo global temporariamente
                window.toggleEditExpiresInputs = function() {
                    const expiresType = document.getElementById('edit-link-expires-type').value;
                    document.getElementById('edit-link-expires-hours').style.display = expiresType === 'hours' ? 'block' : 'none';
                    document.getElementById('edit-link-expires-minutes').style.display = expiresType === 'minutes' ? 'block' : 'none';
                    document.getElementById('edit-link-expires-datetime').style.display = expiresType === 'datetime' ? 'flex' : 'none';
                };
                
                window.toggleEditMaxUsesInput = function() {
                    const maxUsesType = document.getElementById('edit-link-max-uses').value;
                    document.getElementById('edit-link-max-uses-custom').style.display = maxUsesType === 'custom' ? 'block' : 'none';
                };
                
                // IMPORTANTE: Chamar as funções toggle imediatamente após definir para mostrar/esconder campos corretos
                setTimeout(() => {
                    window.toggleEditExpiresInputs();
                    window.toggleEditMaxUsesInput();
                }, 50);
                
            } catch (error) {
                console.error('[CADASTRO_LINKS] Erro ao abrir modal de edição:', error);
                alert(`O Erro ao carregar dados do link: ${error.message || 'Erro desconhecido'}`);
            }
        }
        
        // Salvar edição de link personalizado
        async function saveEditCadastroLink(linkId, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            const slugInput = document.getElementById('edit-link-slug');
            const descriptionInput = document.getElementById('edit-link-description');
            const expiresTypeSelect = document.getElementById('edit-link-expires-type');
            const expiresHoursInput = document.getElementById('edit-link-expires-hours-value');
            const expiresMinutesInput = document.getElementById('edit-link-expires-minutes-value');
            const expiresDateInput = document.getElementById('edit-link-expires-date');
            const expiresTimeInput = document.getElementById('edit-link-expires-time');
            const maxUsesSelect = document.getElementById('edit-link-max-uses');
            const maxUsesCustomInput = document.getElementById('edit-link-max-uses-custom');
            
            const slug = slugInput ? slugInput.value.trim() : '';
            const description = descriptionInput ? descriptionInput.value.trim() : '';
            
            // Validar slug
            if (!slug || slug.length < 3) {
                alert('O Por favor, digite um slug válido (mínimo 3 caracteres).');
                return;
            }
            
            // Preparar dados de expiração
            let expiresAt = null;
            let expiresInHours = undefined;
            let expiresInMinutes = undefined;
            
            const expiresType = expiresTypeSelect ? expiresTypeSelect.value : 'never';
            
            if (expiresType === 'hours' && expiresHoursInput && expiresHoursInput.value) {
                expiresInHours = parseInt(expiresHoursInput.value);
            } else if (expiresType === 'minutes' && expiresMinutesInput && expiresMinutesInput.value) {
                expiresInMinutes = parseInt(expiresMinutesInput.value);
            } else if (expiresType === 'datetime' && expiresDateInput && expiresDateInput.value) {
                const dateValue = expiresDateInput.value;
                const timeValue = expiresTimeInput ? expiresTimeInput.value : '23:59';
                expiresAt = new Date(`${dateValue}T${timeValue}:00`).toISOString();
            } else if (expiresType === 'never') {
                expiresAt = null;
            }
            
            // Preparar max_uses
            let maxUses = 999999;
            if (maxUsesSelect && maxUsesSelect.value === 'custom' && maxUsesCustomInput && maxUsesCustomInput.value) {
                maxUses = parseInt(maxUsesCustomInput.value);
            }
            
            const headers = getHeaders();
            const API_URL = (typeof window !== 'undefined' && (window.API_BASE || window.API_URL || window.location.origin) || '').toString().replace(/\/$/, '');
            
            // Mostrar loading no botão
            const button = event ? event.target.closest('button') : null;
            const originalButtonText = button ? button.innerHTML : '';
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            }
            
            try {
                const body = {
                    slug: slug,
                    description: description || null,
                    maxUses: maxUses
                };
                
                // Sempre definir expiresAt explicitamente
                if (expiresType === 'never') {
                    // Sem expiração - enviar null explicitamente
                    body.expiresAt = null;
                } else if (expiresAt !== null && expiresAt !== undefined) {
                    // Data/hora específica
                    body.expiresAt = expiresAt;
                } else if (expiresInHours !== undefined && expiresInHours !== null) {
                    // Expirar em X horas
                    body.expiresInHours = expiresInHours;
                } else if (expiresInMinutes !== undefined && expiresInMinutes !== null) {
                    // Expirar em X minutos
                    body.expiresInMinutes = expiresInMinutes;
                } else {
                    // Fallback: sem expiração
                    body.expiresAt = null;
                }
                
                
                
                const response = await fetch(`${API_URL}/api/guest-lists/cadastro-links/${linkId}`, {
                    method: 'PUT',
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });
                
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: `Erro HTTP: ${response.status}` }));
                    console.error('[EDIT_LINK] Erro na resposta:', errorData);
                    throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    // Fechar modal
                    const modal = event ? event.target.closest('[style*="position: fixed"]') : null;
                    if (modal) {
                        modal.remove();
                    }
                    
                    // Limpar funções auxiliares
                    delete window.toggleEditExpiresInputs;
                    delete window.toggleEditMaxUsesInput;
                    
                    // Recarregar lista de links
                    setTimeout(() => {
                        loadCadastroLinks();
                    }, 500);
                    
                    alert('Link editado com sucesso!');
                } else {
                    throw new Error(data.message || 'Erro desconhecido ao editar link');
                }
            } catch (error) {
                console.error('[CADASTRO_LINKS] Erro ao editar link:', error);
                alert(`O Erro ao editar link: ${error.message || 'Erro desconhecido'}`);
            } finally {
                // Restaurar botão
                if (button) {
                    button.disabled = false;
                    button.innerHTML = originalButtonText;
                }
            }
        }
        
        // Renovar link personalizado (abrir modal para configurar renovação)
        async function renewCadastroLink(linkId, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            const headers = getHeaders();
            const API_URL = (typeof window !== 'undefined' && (window.API_BASE || window.API_URL || window.location.origin) || '').toString().replace(/\/$/, '');
            const urlParams = new URLSearchParams(window.location.search);
            const itemId = urlParams.get('itemId');
            
            try {
                // Buscar dados do link
                const response = await fetch(`${API_URL}/api/guest-lists/${itemId}/cadastro-links`, {
                    method: 'GET',
                    headers: headers
                });
                
                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (!data.success || !data.data) {
                    throw new Error('Erro ao buscar dados do link');
                }
                
                const linkToRenew = data.data.find(link => link.id === linkId);
                
                if (!linkToRenew) {
                    throw new Error('Link não encontrado');
                }
                
                // Criar modal de renovação
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.8);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                `;
                
                // Calcular novo max_uses: incrementar em 1 por padrão
                let defaultMaxUses = linkToRenew.max_uses;
                if (defaultMaxUses !== 999999 && defaultMaxUses !== null) {
                    defaultMaxUses = defaultMaxUses + 1;
                }
                
                modal.innerHTML = `
                    <div style="background: #1C1C21; border: 2px solid #43e97b; border-radius: 20px; padding: 32px; max-width: 600px; width: 100%; color: #ECECEC; max-height: 90vh; overflow-y: auto;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                            <h2 style="margin: 0; color: #43e97b; font-size: 24px; font-weight: 700;">
                                <i class="fas fa-redo"></i> Renovar Link Personalizado
                            </h2>
                            <button onclick="this.closest('[style*=\\'position: fixed\\']').remove()" 
                                    style="background: transparent; border: none; color: #ECECEC; font-size: 24px; cursor: pointer; padding: 0; width: 32px; height: 32px;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div style="margin-bottom: 20px; padding: 16px; background: rgba(67,233,123,0.1); border-radius: 12px; border-left: 4px solid #43e97b;">
                            <p style="color: #ECECEC; font-size: 14px; line-height: 1.6; margin: 0;">
                                <i class="fas fa-info-circle"></i> <strong>Renovar este link:</strong><br>
                                — O contador de usos será resetado para 0<br>
                                — O limite de usos será incrementado automaticamente<br>
                                — Você pode definir uma nova data de expiração
                            </p>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 16px;">
                            <div>
                                <label style="display: block; color: #43e97b; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                                    Nova Validade do Link
                                </label>
                                <select id="renew-link-expires-type" onchange="toggleRenewExpiresInputs()"
                                        style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 14px; cursor: pointer; margin-bottom: 12px;">
                                    <option value="never">Sem expiração</option>
                                    <option value="minutes">Expirar em X minutos</option>
                                    <option value="hours">Expirar em X horas</option>
                                    <option value="days">Expirar em X dias</option>
                                    <option value="datetime">Expirar em data/hora específica</option>
                                </select>
                                
                                <div id="renew-link-expires-minutes" style="display: none;">
                                    <input type="number" id="renew-link-expires-minutes-value" 
                                           min="1" 
                                           placeholder="Digite o número de minutos"
                                           style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 14px;">
                                </div>
                                
                                <div id="renew-link-expires-hours" style="display: none;">
                                    <input type="number" id="renew-link-expires-hours-value" 
                                           min="1" 
                                           placeholder="Digite o número de horas"
                                           style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 14px;">
                                </div>
                                
                                <div id="renew-link-expires-days" style="display: none;">
                                    <input type="number" id="renew-link-expires-days-value" 
                                           min="1" 
                                           placeholder="Digite o número de dias"
                                           style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 14px;">
                                </div>
                                
                                <div id="renew-link-expires-datetime" style="display: none; gap: 8px; flex-direction: column;">
                                    <input type="date" id="renew-link-expires-date" 
                                           style="padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 14px;">
                                    <input type="time" id="renew-link-expires-time" 
                                           style="padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 14px;">
                                </div>
                            </div>
                            
                            <div>
                                <label style="display: block; color: #43e97b; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                                    Limite de Usos
                                </label>
                                <select id="renew-link-max-uses" onchange="toggleRenewMaxUsesInput()"
                                        style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 14px; cursor: pointer; margin-bottom: 12px;">
                                    <option value="999999">Ilimitado</option>
                                    <option value="custom" ${linkToRenew.max_uses !== 999999 && linkToRenew.max_uses !== null ? 'selected' : ''}>Personalizado</option>
                                </select>
                                <input type="number" id="renew-link-max-uses-custom" 
                                       value="${defaultMaxUses !== 999999 && defaultMaxUses !== null ? defaultMaxUses : ''}"
                                       min="1" 
                                       placeholder="Digite o número máximo de usos"
                                       style="width: 100%; padding: 12px 16px; background: rgba(0,0,0,0.4); border: 2px solid rgba(43,233,123,0.3); border-radius: 8px; color: #ECECEC; font-size: 14px; display: ${linkToRenew.max_uses !== 999999 && linkToRenew.max_uses !== null ? 'block' : 'none'};">
                                <p style="color: #A1A1A1; font-size: 12px; margin-top: 6px;">
                                    O contador de usos será resetado para 0. Defina o limite desejado acima.
                                </p>
                            </div>
                            
                            <div style="display: flex; gap: 12px; margin-top: 8px;">
                                <button onclick="saveRenewCadastroLink(${linkId}, event)" 
                                        style="flex: 1; padding: 14px 24px; background: #000; border: 2px solid #43e97b; border-radius: 12px; color: #43e97b; font-weight: 600; cursor: pointer; font-size: 16px; transition: all 0.3s;"
                                        onmouseover="this.style.background='#43e97b'; this.style.color='#000';"
                                        onmouseout="this.style.background='#000'; this.style.color='#43e97b';">
                                    <i class="fas fa-check"></i> Renovar Link
                                </button>
                                <button onclick="this.closest('[style*=\\'position: fixed\\']').remove()" 
                                        style="padding: 14px 24px; background: rgba(255,68,68,0.1); border: 2px solid #ff4444; border-radius: 12px; color: #ff4444; font-weight: 600; cursor: pointer; font-size: 16px; transition: all 0.3s;"
                                        onmouseover="this.style.background='rgba(255,68,68,0.2)';"
                                        onmouseout="this.style.background='rgba(255,68,68,0.1)';">
                                    <i class="fas fa-times"></i> Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
            } catch (error) {
                console.error('[CADASTRO_LINKS] Erro ao abrir modal de renovação:', error);
                alert(`O Erro ao abrir modal de renovação: ${error.message || 'Erro desconhecido'}`);
            }
        }
        
        // Função para alternar campos de expiração no modal de renovação
        function toggleRenewExpiresInputs() {
            const expiresType = document.getElementById('renew-link-expires-type').value;
            document.getElementById('renew-link-expires-minutes').style.display = expiresType === 'minutes' ? 'block' : 'none';
            document.getElementById('renew-link-expires-hours').style.display = expiresType === 'hours' ? 'block' : 'none';
            document.getElementById('renew-link-expires-days').style.display = expiresType === 'days' ? 'block' : 'none';
            document.getElementById('renew-link-expires-datetime').style.display = expiresType === 'datetime' ? 'flex' : 'none';
        }
        
        // Função para alternar campo de limite de usos no modal de renovação
        function toggleRenewMaxUsesInput() {
            const maxUsesType = document.getElementById('renew-link-max-uses').value;
            const customInput = document.getElementById('renew-link-max-uses-custom');
            if (customInput) {
                customInput.style.display = maxUsesType === 'custom' ? 'block' : 'none';
            }
        }
        
        // Tornar funções acessíveis globalmente para onclick inline
        if (typeof window !== 'undefined') {
            window.toggleRenewExpiresInputs = toggleRenewExpiresInputs;
            window.toggleRenewMaxUsesInput = toggleRenewMaxUsesInput;
        }
        
        // Salvar renovação do link
        async function saveRenewCadastroLink(linkId, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            const headers = getHeaders();
            const API_URL = (typeof window !== 'undefined' && (window.API_BASE || window.API_URL || window.location.origin) || '').toString().replace(/\/$/, '');
            const urlParams = new URLSearchParams(window.location.search);
            const itemId = urlParams.get('itemId');
            
            // Mostrar loading
            const button = event ? event.target.closest('button') : null;
            const originalButtonText = button ? button.innerHTML : '';
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Renovando...';
            }
            
            try {
                // Buscar dados atuais do link
                const listResponse = await fetch(`${API_URL}/api/guest-lists/${itemId}/cadastro-links`, {
                    method: 'GET',
                    headers: headers
                });
                
                if (!listResponse.ok) {
                    throw new Error('Erro ao buscar dados do link');
                }
                
                const listData = await listResponse.json();
                const currentLink = listData.data?.find(link => link.id === linkId);
                
                if (!currentLink) {
                    throw new Error('Link não encontrado');
                }
                
                // Calcular novo max_uses: incrementar em 1
                let newMaxUses = currentLink.max_uses;
                if (newMaxUses !== 999999 && newMaxUses !== null) {
                    newMaxUses = newMaxUses + 1;
                }
                
                // Coletar dados de expiração do modal
                const expiresType = document.getElementById('renew-link-expires-type').value;
                let expiresAt = null;
                let expiresInMinutes = null;
                let expiresInHours = null;
                
                if (expiresType === 'minutes') {
                    const minutesValue = parseInt(document.getElementById('renew-link-expires-minutes-value').value, 10);
                    if (!isNaN(minutesValue) && minutesValue > 0) {
                        expiresInMinutes = minutesValue;
                    }
                } else if (expiresType === 'hours') {
                    const hoursValue = parseInt(document.getElementById('renew-link-expires-hours-value').value, 10);
                    if (!isNaN(hoursValue) && hoursValue > 0) {
                        expiresInHours = hoursValue;
                    }
                } else if (expiresType === 'days') {
                    const daysValue = parseInt(document.getElementById('renew-link-expires-days-value').value, 10);
                    if (!isNaN(daysValue) && daysValue > 0) {
                        expiresInHours = daysValue * 24;
                    }
                } else if (expiresType === 'datetime') {
                    const dateValue = document.getElementById('renew-link-expires-date').value;
                    const timeValue = document.getElementById('renew-link-expires-time').value;
                    if (dateValue && timeValue) {
                        expiresAt = new Date(`${dateValue}T${timeValue}`).toISOString();
                    } else if (dateValue) {
                        expiresAt = new Date(`${dateValue}T23:59:59`).toISOString();
                    }
                }
                // Se expiresType === 'never', expiresAt permanece null
                
                // Coletar limite de usos do modal
                const maxUsesType = document.getElementById('renew-link-max-uses').value;
                let finalMaxUses = newMaxUses; // Padrão: incrementar em 1
                
                if (maxUsesType === 'custom') {
                    const customMaxUses = parseInt(document.getElementById('renew-link-max-uses-custom').value, 10);
                    if (!isNaN(customMaxUses) && customMaxUses > 0) {
                        finalMaxUses = customMaxUses;
                    }
                } else {
                    // Ilimitado
                    finalMaxUses = 999999;
                }
                
                // Preparar body para atualização
                const updateBody = {
                    currentUses: 0, // Sempre resetar para 0
                    maxUses: finalMaxUses // Usar limite definido no modal
                };
                
                // Adicionar expiração se fornecida
                if (expiresAt !== null) {
                    updateBody.expiresAt = expiresAt;
                } else if (expiresInHours !== null) {
                    updateBody.expiresInHours = expiresInHours;
                } else if (expiresInMinutes !== null) {
                    updateBody.expiresInMinutes = expiresInMinutes;
                } else {
                    // Se "Sem expiração", definir explicitamente como null
                    updateBody.expiresAt = null;
                }
                
                // Atualizar link
                const response = await fetch(`${API_URL}/api/guest-lists/cadastro-links/${linkId}`, {
                    method: 'PUT',
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateBody)
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: `Erro HTTP: ${response.status}` }));
                    throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    // Fechar modal
                    const modal = event ? event.target.closest('[style*="position: fixed"]') : null;
                    if (modal) {
                        modal.remove();
                    }
                    
                    // Recarregar lista de links
                    setTimeout(() => {
                        loadCadastroLinks();
                    }, 500);
                    
                    alert(`Link renovado com sucesso!\n\n` +
                        `— Contador resetado: 0\n` +
                        `— Limite de uso: ${finalMaxUses === 999999 || finalMaxUses === null ? 'Ilimitado' : finalMaxUses}\n` +
                        `— Status: Disponível`);
                } else {
                    throw new Error(data.message || 'Erro desconhecido ao renovar link');
                }
            } catch (error) {
                console.error('[CADASTRO_LINKS] Erro ao renovar link:', error);
                alert(`O Erro ao renovar link: ${error.message || 'Erro desconhecido'}`);
                // Restaurar botão em caso de erro
                if (button) {
                    button.disabled = false;
                    button.innerHTML = originalButtonText;
                }
            }
        }
        
        // Ativar/Desativar link para cartão público
        async function toggleActiveCadastroLink(linkId, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            const headers = getHeaders();
            const API_URL = (typeof window !== 'undefined' && (window.API_BASE || window.API_URL || window.location.origin) || '').toString().replace(/\/$/, '');
            
            // Buscar estado atual do link
            const urlParams = new URLSearchParams(window.location.search);
            const itemId = urlParams.get('itemId');
            
            if (!itemId) {
                alert('O Erro: ID do item não encontrado.');
                return;
            }
            
            // Buscar lista de links para verificar estado atual
            try {
                const listResponse = await fetch(`${API_URL}/api/guest-lists/${itemId}/cadastro-links`, {
                    method: 'GET',
                    headers: headers
                });
                
                if (!listResponse.ok) {
                    throw new Error('Erro ao buscar dados do link');
                }
                
                const listData = await listResponse.json();
                const currentLink = listData.data?.find(link => link.id === linkId);
                
                if (!currentLink) {
                    throw new Error('Link não encontrado');
                }
                
                const currentState = currentLink.isActiveForProfile || false;
                const newState = !currentState;
                
                // Mostrar loading no botão
                const button = event ? event.target.closest('button') : null;
                const originalButtonText = button ? button.innerHTML : '';
                if (button) {
                    button.disabled = true;
                    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
                }
                
                // Ativar/Desativar link
                const response = await fetch(`${API_URL}/api/guest-lists/cadastro-links/${linkId}/activate`, {
                    method: 'PUT',
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        activate: newState
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: `Erro HTTP: ${response.status}` }));
                    throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    // Recarregar lista de links
                    setTimeout(() => {
                        loadCadastroLinks();
                    }, 300);
                    
                    if (newState) {
                        alert('Link ativado! Agora ele aparecerá no cartão público quando alguém clicar em "Cadastro de Visitantes".');
                    } else {
                        alert('Link desativado! Ele não aparecerá mais no cartão público.');
                    }
                } else {
                    throw new Error(data.message || 'Erro desconhecido ao ativar/desativar link');
                }
            } catch (error) {
                console.error('[CADASTRO_LINKS] Erro ao ativar/desativar link:', error);
                alert(`O Erro ao ativar/desativar link: ${error.message || 'Erro desconhecido'}`);
            } finally {
                // Restaurar botão será feito no reload
            }
        }
        
        // Apagar link personalizado
        async function deleteCadastroLink(linkId, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            if (!confirm('Tem certeza que deseja APAGAR este link personalizado?\n\nEsta ação não pode ser desfeita. O link será removido permanentemente.')) {
                return;
            }
            
            const headers = getHeaders();
            const API_URL = (typeof window !== 'undefined' && (window.API_BASE || window.API_URL || window.location.origin) || '').toString().replace(/\/$/, '');
            
            // Mostrar loading no botão
            const button = event ? event.target.closest('button') : null;
            const originalButtonText = button ? button.innerHTML : '';
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }
            
            try {
                const response = await fetch(`${API_URL}/api/guest-lists/cadastro-links/${linkId}`, {
                    method: 'DELETE',
                    headers: headers
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: `Erro HTTP: ${response.status}` }));
                    throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    alert('Link personalizado apagado com sucesso!');
                    // Recarregar lista
                    setTimeout(() => {
                        loadCadastroLinks();
                    }, 300);
                } else {
                    throw new Error(data.error || 'Erro desconhecido ao apagar link');
                }
            } catch (error) {
                console.error('[CADASTRO_LINKS] Erro ao apagar link:', error);
                alert(`O Erro ao apagar link: ${error.message || 'Erro desconhecido'}\n\nNota: Esta funcionalidade requer uma API no backend que ainda precisa ser criada.`);
            } finally {
                // Restaurar botão
                if (button) {
                    button.disabled = false;
                    button.innerHTML = originalButtonText;
                }
            }
        }
        
        // Copiar link personalizado
        function copyCadastroLink(inputId, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            const input = document.getElementById(inputId);
            const button = event ? (event.target.closest('button') || event.target) : null;
            const value = input ? input.value : '';
            
            if (!value) {
                alert('O Link não encontrado.');
                return;
            }
            
            // Tentar usar Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(value).then(() => {
                    if (button) {
                        const originalText = button.innerHTML;
                        button.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                        button.style.background = 'linear-gradient(135deg, #43e97b, #38f9d7)';
                        setTimeout(() => {
                            button.innerHTML = originalText;
                            button.style.background = '';
                        }, 2000);
                    } else {
                        alert('Link copiado para a área de transferência!');
                    }
                }).catch(err => {
                    console.error('Erro ao copiar:', err);
                    alert('O Erro ao copiar link. Tente selecionar e copiar manualmente.');
                });
            } else {
                // Fallback
                input.select();
                document.execCommand('copy');
                if (button) {
                    const originalText = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                    setTimeout(() => { button.innerHTML = originalText; }, 2000);
                } else {
                    alert('Link copiado para a área de transferência!');
                }
            }
        }
        
        // Função auxiliar para extrair nome, email, whatsapp e CPF de um convidado
        function extractGuestInfo(guest) {
            let displayName = guest.name || '';
            let displayEmail = guest.email || '';
            let displayWhatsapp = guest.whatsapp || guest.phone || '';
            let displayDocument = guest.document || '';
            
            // Se não tiver nome/email/whatsapp/documento direto, tentar extrair de custom_responses
            if (!displayName || displayName.trim() === '' || displayName.toLowerCase() === 'visitante' || 
                !displayEmail || displayEmail.trim() === '' || 
                !displayWhatsapp || displayWhatsapp.trim() === '' ||
                !displayDocument || displayDocument.trim() === '') {
                try {
                    const customResponses = typeof guest.custom_responses === 'string' 
                        ? JSON.parse(guest.custom_responses) 
                        : (guest.custom_responses || {});
                    
                    // Procurar por campos comuns nos custom_responses
                    Object.keys(customResponses).forEach(key => {
                        const keyLower = key.toLowerCase().trim();
                        const value = customResponses[key];
                        const valueStr = Array.isArray(value) ? value[0] : (value || '').toString().trim();
                        
                        if ((!displayName || displayName.trim() === '' || displayName.toLowerCase() === 'visitante') && 
                            (keyLower.includes('nome') || keyLower.includes('name') || keyLower.includes('nome completo'))) {
                            displayName = valueStr;
                        }
                        if ((!displayWhatsapp || displayWhatsapp.trim() === '') && 
                            (keyLower.includes('whatsapp') || keyLower.includes('telefone') || keyLower.includes('phone') || keyLower.includes('celular'))) {
                            displayWhatsapp = valueStr;
                        }
                        if ((!displayEmail || displayEmail.trim() === '') && 
                            (keyLower.includes('email') || keyLower.includes('e-mail') || keyLower.includes('correio'))) {
                            displayEmail = valueStr;
                        }
                        // IMPORTANTE: Procurar CPF/documento nos custom_responses
                        if ((!displayDocument || displayDocument.trim() === '') && 
                            (keyLower.includes('cpf') || keyLower.includes('documento') || keyLower.includes('cnpj') || keyLower.includes('document'))) {
                            displayDocument = valueStr;
                        }
                    });
                    
                    // Se ainda não encontrou, tentar buscar pelo ID do campo usando formFields
                    if ((!displayName || displayName.trim() === '' || displayName.toLowerCase() === 'visitante') && formFields && formFields.length > 0) {
                        // Procurar campo de nome nos formFields
                        const nameField = formFields.find(f => {
                            const label = (f.label || '').toLowerCase();
                            return label.includes('nome') || label.includes('name');
                        });
                        if (nameField && nameField.id && customResponses[nameField.id]) {
                            const value = customResponses[nameField.id];
                            displayName = Array.isArray(value) ? value[0] : (value || '').toString().trim();
                        }
                    }
                    
                    if ((!displayWhatsapp || displayWhatsapp.trim() === '') && formFields && formFields.length > 0) {
                        const whatsappField = formFields.find(f => {
                            const label = (f.label || '').toLowerCase();
                            return label.includes('whatsapp') || label.includes('telefone') || label.includes('phone');
                        });
                        if (whatsappField && whatsappField.id && customResponses[whatsappField.id]) {
                            const value = customResponses[whatsappField.id];
                            displayWhatsapp = Array.isArray(value) ? value[0] : (value || '').toString().trim();
                        }
                    }
                    
                    if ((!displayEmail || displayEmail.trim() === '') && formFields && formFields.length > 0) {
                        const emailField = formFields.find(f => {
                            const label = (f.label || '').toLowerCase();
                            return label.includes('email') || label.includes('e-mail');
                        });
                        if (emailField && emailField.id && customResponses[emailField.id]) {
                            const value = customResponses[emailField.id];
                            displayEmail = Array.isArray(value) ? value[0] : (value || '').toString().trim();
                        }
                    }
                    
                    // IMPORTANTE: Buscar CPF/documento usando formFields
                    if ((!displayDocument || displayDocument.trim() === '') && formFields && formFields.length > 0) {
                        const documentField = formFields.find(f => {
                            const label = (f.label || '').toLowerCase();
                            return label.includes('cpf') || label.includes('documento') || label.includes('cnpj') || label.includes('document');
                        });
                        if (documentField && documentField.id && customResponses[documentField.id]) {
                            const value = customResponses[documentField.id];
                            displayDocument = Array.isArray(value) ? value[0] : (value || '').toString().trim();
                        }
                    }
                } catch (e) {
                    console.warn('Erro ao parsear custom_responses:', e);
                }
            }
            
            // Fallback final
            displayName = (displayName && displayName.trim() && displayName.toLowerCase() !== 'visitante') ? displayName.trim() : 'Sem nome';
            displayEmail = (displayEmail && displayEmail.trim()) ? displayEmail.trim() : '-';
            displayWhatsapp = (displayWhatsapp && displayWhatsapp.trim()) ? displayWhatsapp.trim() : '-';
            displayDocument = (displayDocument && displayDocument.trim()) ? displayDocument.trim() : '';
            
            return { displayName, displayEmail, displayWhatsapp, displayDocument };
        }
        
        // Atualizar estatísticas hero
        function updateHeroStats() {
            // IMPORTANTE: Não mostrar stats se estiver na aba Links, PDF ou Portaria
            if (currentFilter === 'links' || currentFilter === 'pdf-settings' || currentFilter === 'customize-portaria') {
                const statsHeroSection = document.getElementById('stats-hero-section');
                if (statsHeroSection) {
                    statsHeroSection.style.display = 'none';
                    statsHeroSection.style.visibility = 'hidden';
                }
                return; // Não atualizar valores se estiver nessas abas
            }
            
            const total = allData.length; // Total de inscritos (todos)
            const chegou = allData.filter(g => g.status === 'checked_in').length; // Só quem realmente chegou
            const falta = allData.filter(g => g.status === 'registered' || g.status === 'confirmed').length; // Quem não chegou ainda
            
            const statTotal = document.getElementById('stat-total');
            const statChegou = document.getElementById('stat-chegou');
            const statFalta = document.getElementById('stat-falta');
            
            if (statTotal) statTotal.textContent = total;
            if (statChegou) statChegou.textContent = chegou;
            if (statFalta) statFalta.textContent = falta;
        }
        
        // Copiar link para clipboard
        // Salvar slug personalizado da portaria
        async function savePortariaSlug(event) {
            const slugInput = document.getElementById('portaria-slug-input');
            if (!slugInput) {
                console.error('[savePortariaSlug] Input não encontrado!');
                return;
            }
            
            const slug = slugInput.value.trim().toLowerCase();
            
            // Validar slug
            if (slug && !/^[a-z0-9_-]+$/.test(slug)) {
                alert('Slug inválido! Use apenas letras minúsculas, números, hífens e underscores.');
                return;
            }
            
            try {
                const headersForFetch = getHeaders();
                if (!headersForFetch || Object.keys(headersForFetch).length === 0) {
                    alert('Sua sessão expirou. Por favor, faça login novamente.');
                    window.location.href = '/dashboard';
                    return;
                }
                
                const response = await fetch(`${API_URL}/api/guest-lists/${itemId}`, {
                    method: 'PUT',
                    headers: {
                        ...headersForFetch,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        portaria_slug: slug || null
                    })
                });
                
                
                if (!response.ok) {
                    let errorMessage = 'Erro ao atualizar lista';
                    try {
                        const errorData = await response.json();
                        console.error('[savePortariaSlug] Erro da API:', errorData);
                        errorMessage = errorData.message || errorData.error || `Erro ${response.status}: ${response.statusText}`;
                    } catch (e) {
                        const errorText = await response.text();
                        console.error('[savePortariaSlug] Erro ao parsear resposta:', errorText);
                        errorMessage = errorText || `Erro ${response.status}: ${response.statusText}`;
                    }
                    throw new Error(errorMessage);
                }
                
                const result = await response.json();
                
                // Atualizar tokens e recarregar links
                guestListTokens.portaria_slug = slug || null;
                
                // Recarregar dados da lista para obter o slug atualizado
                const listInfoRes = await fetch(`${API_URL}/api/guest-lists/${itemId}`, {
                    headers: headersForFetch
                });
                if (listInfoRes.ok) {
                    const listInfo = await listInfoRes.json();
                    guestListTokens.portaria_slug = listInfo.portaria_slug;
                }
                
                // Definir baseUrl (mesmo usado em displayPublicLinks)
                const baseUrl = (typeof window !== 'undefined' && (window.API_BASE || window.API_URL || window.location.origin) || '').toString().replace(/\/$/, '');
                
                // Recarregar dados da lista para obter o slug atualizado
                const listInfoRes2 = await fetch(`${API_URL}/api/guest-lists/${itemId}`, {
                    headers: headersForFetch
                });
                if (listInfoRes2.ok) {
                    const listInfo = await listInfoRes2.json();
                    guestListTokens.portaria_slug = listInfo.portaria_slug || null;
                }
                
                // Recarregar display dos links para atualizar visibilidade
                displayPublicLinks();
                
                // Forçar atualização visual imediata
                const linkPortariaOriginalGroup = document.getElementById('link-portaria-original-group');
                const linkPortariaPersonalizadoGroup = document.getElementById('link-portaria-personalizado-group');
                const linkPortariaOriginal = document.getElementById('link-portaria');
                const linkPortariaPersonalizado = document.getElementById('link-portaria-personalizado');
                
                
                if (guestListTokens.portaria_slug) {
                    // Se tem slug personalizado, mostrar apenas o link personalizado
                    if (linkPortariaOriginalGroup) {
                        linkPortariaOriginalGroup.style.display = 'none';
                    }
                    if (linkPortariaPersonalizadoGroup) {
                        linkPortariaPersonalizadoGroup.style.display = 'flex';
                    }
                    if (linkPortariaPersonalizado) {
                        linkPortariaPersonalizado.value = `${baseUrl}/portaria/${guestListTokens.portaria_slug}`;
                        linkPortariaPersonalizado.style.color = '#ECECEC';
                    }
                } else {
                    // Se não tem slug personalizado, mostrar apenas o link original
                    if (linkPortariaOriginalGroup) {
                        linkPortariaOriginalGroup.style.display = 'flex';
                    }
                    if (linkPortariaPersonalizadoGroup) {
                        linkPortariaPersonalizadoGroup.style.display = 'none';
                    }
                }
                
                // Feedback visual (encontrar o botão de salvar pelo ID ou pelo evento se disponível)
                let btn = null;
                if (typeof event !== 'undefined' && event && event.target) {
                    btn = event.target.closest('button') || event.target;
                } else {
                    // Se não houver evento, procurar o botão de salvar
                    const slugInput = document.getElementById('portaria-slug-input');
                    if (slugInput && slugInput.parentElement) {
                        btn = slugInput.parentElement.querySelector('button[onclick*="savePortariaSlug"]');
                    }
                }
                
                if (btn) {
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
                    btn.style.background = 'linear-gradient(135deg, #43e97b, #38f9d7)';
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.style.background = 'linear-gradient(135deg, #4A90E2, #357ABD)';
                    }, 2000);
                }
                
                alert('Slug salvo com sucesso!');
                
            } catch (error) {
                console.error('[savePortariaSlug] Erro ao salvar slug:', error);
                alert('Erro ao salvar slug: ' + error.message);
            }
        }
        
        // Limpar slug personalizado da portaria
        async function clearPortariaSlug() {
            if (!confirm('Deseja remover o slug personalizado? O link voltará a usar o token longo.')) {
                return;
            }
            
            const slugInput = document.getElementById('portaria-slug-input');
            if (slugInput) {
                slugInput.value = '';
            }
            
            await savePortariaSlug(null);
        }
        
        // Salvar slug personalizado do cadastro
        async function saveCadastroSlug(event) {
            const slugInput = document.getElementById('cadastro-slug-input');
            if (!slugInput) {
                console.error('[saveCadastroSlug] Input não encontrado!');
                return;
            }
            
            const slug = slugInput.value.trim().toLowerCase();
            
            // Validar slug
            if (slug && !/^[a-z0-9_-]+$/.test(slug)) {
                alert('Slug inválido! Use apenas letras minúsculas, números, hífens e underscores.');
                return;
            }
            
            try {
                const headersForFetch = getHeaders();
                if (!headersForFetch || Object.keys(headersForFetch).length === 0) {
                    alert('Sua sessão expirou. Por favor, faça login novamente.');
                    window.location.href = '/dashboard';
                    return;
                }
                
                const response = await fetch(`${API_URL}/api/guest-lists/${itemId}`, {
                    method: 'PUT',
                    headers: {
                        ...headersForFetch,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        cadastro_slug: slug || null
                    })
                });
                
                
                if (!response.ok) {
                    let errorMessage = 'Erro ao atualizar lista';
                    try {
                        const errorData = await response.json();
                        console.error('[saveCadastroSlug] Erro da API:', errorData);
                        errorMessage = errorData.message || errorData.error || `Erro ${response.status}: ${response.statusText}`;
                    } catch (e) {
                        const errorText = await response.text();
                        console.error('[saveCadastroSlug] Erro ao parsear resposta:', errorText);
                        errorMessage = errorText || `Erro ${response.status}: ${response.statusText}`;
                    }
                    throw new Error(errorMessage);
                }
                
                const result = await response.json();
                
                // Recarregar dados da lista para obter o slug atualizado
                const listInfoRes = await fetch(`${API_URL}/api/guest-lists/${itemId}`, {
                    headers: headersForFetch
                });
                if (listInfoRes.ok) {
                    const listInfo = await listInfoRes.json();
                    guestListTokens.cadastro_slug = listInfo.cadastro_slug || null;
                }
                
                // Recarregar display dos links para atualizar visibilidade
                displayPublicLinks();
                
                // Feedback visual
                let btn = null;
                if (typeof event !== 'undefined' && event && event.target) {
                    btn = event.target.closest('button') || event.target;
                } else {
                    const slugInputEl = document.getElementById('cadastro-slug-input');
                    if (slugInputEl && slugInputEl.parentElement) {
                        btn = slugInputEl.parentElement.querySelector('button[onclick*="saveCadastroSlug"]');
                    }
                }
                
                if (btn) {
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
                    btn.style.background = 'linear-gradient(135deg, #43e97b, #38f9d7)';
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.style.background = 'linear-gradient(135deg, #43e97b, #38f9d7)';
                    }, 2000);
                }
                
                alert('Slug salvo com sucesso!');
                
            } catch (error) {
                console.error('[saveCadastroSlug] Erro ao salvar slug:', error);
                alert('Erro ao salvar slug: ' + error.message);
            }
        }
        
        // Limpar slug personalizado do cadastro
        async function clearCadastroSlug() {
            if (!confirm('Deseja remover o slug personalizado? O link voltará a usar o token longo.')) {
                return;
            }
            
            const slugInput = document.getElementById('cadastro-slug-input');
            if (slugInput) {
                slugInput.value = '';
            }
            
            await saveCadastroSlug(null);
        }
        
        function copyLinkToClipboard(inputId, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            const input = document.getElementById(inputId);
            if (!input) return;
            
            input.select();
            input.setSelectionRange(0, 99999); // Para mobile
            
            try {
                document.execCommand('copy');
                
                // Feedback visual
                const button = event.target.closest('button');
                if (button) {
                    const originalText = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                    button.style.background = 'linear-gradient(135deg, #43e97b, #38f9d7)';
                    
                    setTimeout(() => {
                        button.innerHTML = originalText;
                        if (button.classList.contains('blue')) {
                            button.style.background = 'linear-gradient(135deg, #4A90E2, #357ABD)';
                        } else {
                            button.style.background = 'linear-gradient(135deg, #FFC700, #FFA500)';
                        }
                    }, 2000);
                }
                
                // Mostrar notificação
                alert('Link copiado para a área de transferência!');
            } catch (err) {
                console.error('Erro ao copiar:', err);
                alert('Erro ao copiar link. Tente selecionar e copiar manualmente.');
            }
        }
        
        // Configurar tabs
        function setupTabs() {
            // Remover event listeners antigos para evitar duplicação
            document.querySelectorAll('.tab-btn').forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
            });
            
            // Ouvir mensagens do iframe de personalização da Portaria
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'customize-portaria-back') {
                    if (event.data.action === 'switch-tab' && event.data.tab) {
                        // Trocar para a aba especificada
                        const targetTab = document.querySelector(`.tab-btn[data-tab="${event.data.tab}"]`);
                        if (targetTab) {
                            targetTab.click();
                        }
                    }
                }
            });
            
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentFilter = btn.dataset.tab;
                    
                    // Salvar aba ativa no localStorage
                    const urlParams = new URLSearchParams(window.location.search);
                    const itemId = urlParams.get('itemId');
                    if (itemId) {
                        localStorage.setItem(`activeTab_${itemId}`, btn.dataset.tab);
                    }
                    
                    // Controlar visibilidade dos controles administrativos (Selecionar Todos / Excluir Todos)
                    // Esses controles devem aparecer APENAS nas abas: registered, arrived, not-arrived, all
                    const adminControls = document.getElementById('admin-controls');
                    const guestListListTabs = ['registered', 'arrived', 'not-arrived', 'all', 'confirmed'];
                    const captacaoListTabs = ['all', 'today', 'week', 'month'];
                    const isListTab = isGuestListMode
                        ? guestListListTabs.includes(btn.dataset.tab)
                        : captacaoListTabs.includes(btn.dataset.tab);

                    if (adminControls) {
                        // Controles em massa só no Check-in
                        adminControls.style.display = (isGuestListMode && guestListListTabs.includes(btn.dataset.tab)) ? 'flex' : 'none';
                    }
                    
                    const statsHeroSection = document.getElementById('stats-hero-section');
                    const statsGrid = document.getElementById('stats-grid');
                    const searchBar = document.querySelector('.search-bar');
                    
                    if (isListTab) {
                        if (isGuestListMode) {
                            if (statsHeroSection) {
                                statsHeroSection.style.display = 'grid';
                                statsHeroSection.style.visibility = 'visible';
                            }
                        } else if (statsHeroSection) {
                            statsHeroSection.style.display = 'none';
                            statsHeroSection.style.visibility = 'hidden';
                        }
                        if (statsGrid) {
                            statsGrid.style.display = 'grid';
                            statsGrid.style.visibility = 'visible';
                        }
                        if (searchBar) {
                            searchBar.style.display = 'flex';
                            searchBar.style.visibility = 'visible';
                        }
                        if (!isGuestListMode) ensureLeadToolbar();
                        else hideLeadToolbar();
                    } else {
                        if (statsHeroSection) {
                            statsHeroSection.style.display = 'none';
                            statsHeroSection.style.visibility = 'hidden';
                        }
                        if (statsGrid) {
                            statsGrid.style.display = 'none';
                            statsGrid.style.visibility = 'hidden';
                        }
                        if (searchBar) {
                            searchBar.style.display = 'none';
                            searchBar.style.visibility = 'hidden';
                        }
                        hideLeadToolbar();
                    }
                    
                    // IMPORTANTE: Sempre esconder TODOS os containers de personalização primeiro
                    // Isso garante que não haja conflitos ao trocar entre abas
                    const pdfSettingsContainer = document.getElementById('pdf-settings-container');
                    const customizePortariaContainer = document.getElementById('customize-portaria-container');
                    const itemsList = document.getElementById('items-list');
                    const linksSection = document.getElementById('links-hero-section');
                    
                    // Esconder todos os containers primeiro
                    if (pdfSettingsContainer) {
                        pdfSettingsContainer.style.display = 'none';
                    }
                    if (customizePortariaContainer) {
                        customizePortariaContainer.style.display = 'none';
                    }
                    
                    // Agora mostrar apenas o conteúdo correto baseado na aba selecionada
                    if (btn.dataset.tab === 'pdf-settings') {
                        showPDFSettingsTab();
                    } else if (btn.dataset.tab === 'customize-portaria') {
                        showCustomizePortariaTab();
                    } else if (btn.dataset.tab === 'links') {
                        showLinksTab();
                    } else {
                        // Para outras abas (registered, arrived, not-arrived, all), garantir que containers de personalização estão escondidos
                        // e renderizar normalmente
                        if (itemsList) itemsList.style.display = 'block';
                        if (linksSection) linksSection.style.display = 'none';
                        
                        if (isGuestListMode) {
                            filterAndRenderGuestList();
                        } else {
                            filterAndRenderFormResponses();
                        }
                    }
                });
            });
        }
        
        // Mostrar aba de personalização do PDF
        function showPDFSettingsTab() {
            const content = document.getElementById('content');
            const loading = document.getElementById('loading');
            const itemsList = document.getElementById('items-list');
            const linksSection = document.getElementById('links-hero-section');
            const empty = document.getElementById('empty');
            const adminControls = document.getElementById('admin-controls');
            const customizePortariaContainer = document.getElementById('customize-portaria-container');
            const statsHeroSection = document.getElementById('stats-hero-section');
            const statsGrid = document.getElementById('stats-grid');
            const searchBar = document.querySelector('.search-bar');
            
            // Esconder elementos normais e garantir que containers de outras abas estão escondidos
            if (loading) loading.style.display = 'none';
            if (itemsList) itemsList.style.display = 'none';
            if (linksSection) linksSection.style.display = 'none';
            if (empty) empty.style.display = 'none';
            if (adminControls) adminControls.style.display = 'none'; // Esconder controles administrativos na aba PDF
            if (customizePortariaContainer) customizePortariaContainer.style.display = 'none'; // IMPORTANTE: Esconder container da Personalizar Portaria
            if (statsHeroSection) statsHeroSection.style.display = 'none'; // Esconder estatísticas na aba PDF
            if (statsGrid) statsGrid.style.display = 'none'; // Esconder estatísticas na aba PDF
            if (searchBar) searchBar.style.display = 'none'; // Esconder barra de busca e PDF na aba PDF
            
            // Criar ou obter container de personalização
            let pdfSettingsContainer = document.getElementById('pdf-settings-container');
            if (!pdfSettingsContainer) {
                pdfSettingsContainer = document.createElement('div');
                pdfSettingsContainer.id = 'pdf-settings-container';
                pdfSettingsContainer.style.display = 'block';
                content.appendChild(pdfSettingsContainer);
            } else {
                pdfSettingsContainer.style.display = 'block';
            }
            
            // Garantir que o conteúdo está visível
            if (content) content.style.display = 'block';
            
            const pdfSettings = getPDFSettings();
            
            pdfSettingsContainer.innerHTML = `
                <div style="padding: 20px;">
                    <h2 style="color: #FFC700; margin-bottom: 24px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-file-pdf"></i> Personalizar PDF Exportado
                    </h2>
                    
                    <div class="pdf-settings-card" style="background: linear-gradient(135deg, rgba(255,199,0,0.15), rgba(255,199,0,0.05)); border: 2px solid rgba(255,199,0,0.3); border-radius: 16px; padding: 20px 16px; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(255,199,0,0.1);">
                        <h3 style="color: #FFC700; margin-bottom: 20px; font-size: 18px; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-palette"></i> Cores do PDF
                        </h3>
                        
                        <div style="display: flex; flex-direction: column; gap: 24px;">
                            <!-- Degradê do Cabeçalho -->
                            <div class="pdf-setting-item" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,199,0,0.2); border-radius: 12px; padding: 16px;">
                                <label style="display: block; color: #FFC700; margin-bottom: 12px; font-weight: 700; font-size: 15px;">
                                    <i class="fas fa-fill-drip"></i> Cabeçalho com Degradê
                                </label>
                                
                                <div style="display: flex; flex-direction: column; gap: 16px;">
                                    <div>
                                        <label style="display: block; color: #ECECEC; margin-bottom: 8px; font-weight: 600; font-size: 13px;">
                                            Cor Inicial (Topo):
                                        </label>
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            <input type="color" id="pdf-header-color-start" value="${pdfSettings.headerColorStart || pdfSettings.headerColor || '#FFC700'}" 
                                                   style="width: 70px; height: 45px; border: 2px solid rgba(255,199,0,0.5); border-radius: 10px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                                            <input type="text" id="pdf-header-color-start-text" value="${pdfSettings.headerColorStart || pdfSettings.headerColor || '#FFC700'}" 
                                                   style="flex: 1; padding: 12px; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); border-radius: 10px; color: #ECECEC; font-family: monospace; max-width: 130px; font-size: 13px;">
                                            <button onclick="resetPDFColor('headerStart')" style="padding: 12px 18px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: #ECECEC; cursor: pointer; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,199,0,0.2)'; this.style.borderColor='#FFC700';" onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.borderColor='rgba(255,255,255,0.2)';">
                                                <i class="fas fa-undo"></i> Padrão
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label style="display: block; color: #ECECEC; margin-bottom: 8px; font-weight: 600; font-size: 13px;">
                                            Cor Final (Base):
                                        </label>
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            <input type="color" id="pdf-header-color-end" value="${pdfSettings.headerColorEnd || pdfSettings.headerColor || '#FFB700'}" 
                                                   style="width: 70px; height: 45px; border: 2px solid rgba(255,199,0,0.5); border-radius: 10px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                                            <input type="text" id="pdf-header-color-end-text" value="${pdfSettings.headerColorEnd || pdfSettings.headerColor || '#FFB700'}" 
                                                   style="flex: 1; padding: 12px; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); border-radius: 10px; color: #ECECEC; font-family: monospace; max-width: 130px; font-size: 13px;">
                                            <button onclick="resetPDFColor('headerEnd')" style="padding: 12px 18px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: #ECECEC; cursor: pointer; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,199,0,0.2)'; this.style.borderColor='#FFC700';" onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.borderColor='rgba(255,255,255,0.2)';">
                                                <i class="fas fa-undo"></i> Padrão
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <!-- Preview do degradê -->
                                    <div style="margin-top: 12px; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 10px;">
                                        <label style="display: block; color: #A1A1A1; margin-bottom: 8px; font-size: 12px; font-weight: 600;">
                                            Preview do Degradê:
                                        </label>
                                        <div id="gradient-preview" style="height: 50px; border-radius: 8px; background: linear-gradient(135deg, ${pdfSettings.headerColorStart || pdfSettings.headerColor || '#FFC700'}, ${pdfSettings.headerColorEnd || pdfSettings.headerColor || '#FFB700'}); border: 2px solid rgba(255,199,0,0.3); box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);"></div>
                                    </div>
                                </div>
                                <p style="color: #A1A1A1; font-size: 12px; margin-top: 12px; line-height: 1.5;">
                                    <i class="fas fa-info-circle"></i> O cabeçalho terá um efeito degradê bonito da cor inicial até a cor final
                                </p>
                            </div>
                            
                            <!-- Cor do Texto do Cabeçalho -->
                            <div class="pdf-setting-item" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,199,0,0.2); border-radius: 12px; padding: 16px;">
                                <label style="display: block; color: #ECECEC; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                                    Cor do Texto do Cabeçalho:
                                </label>
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <input type="color" id="pdf-header-text-color" value="${pdfSettings.headerTextColor}" 
                                           style="width: 70px; height: 45px; border: 2px solid rgba(255,199,0,0.5); border-radius: 10px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                                    <input type="text" id="pdf-header-text-color-text" value="${pdfSettings.headerTextColor}" 
                                           style="flex: 1; padding: 12px; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); border-radius: 10px; color: #ECECEC; font-family: monospace; max-width: 130px; font-size: 13px;">
                                    <button onclick="resetPDFColor('headerText')" style="padding: 12px 18px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: #ECECEC; cursor: pointer; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,199,0,0.2)'; this.style.borderColor='#FFC700';" onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.borderColor='rgba(255,255,255,0.2)';">
                                        <i class="fas fa-undo"></i> Padrão
                                    </button>
                                </div>
                                <p style="color: #A1A1A1; font-size: 12px; margin-top: 8px;">
                                    Cor do texto no cabeçalho (recomendado: branco ou preto para contraste)
                                </p>
                            </div>
                            
                            <!-- Cor do Texto Normal -->
                            <div class="pdf-setting-item" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,199,0,0.2); border-radius: 12px; padding: 16px;">
                                <label style="display: block; color: #ECECEC; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                                    Cor do Texto Normal (Conteúdo):
                                </label>
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <input type="color" id="pdf-text-color" value="${pdfSettings.textColor || '#000000'}" 
                                           style="width: 70px; height: 45px; border: 2px solid rgba(255,199,0,0.5); border-radius: 10px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                                    <input type="text" id="pdf-text-color-text" value="${pdfSettings.textColor || '#000000'}" 
                                           style="flex: 1; padding: 12px; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); border-radius: 10px; color: #ECECEC; font-family: monospace; max-width: 130px; font-size: 13px;">
                                    <button onclick="resetPDFColor('text')" style="padding: 12px 18px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: #ECECEC; cursor: pointer; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,199,0,0.2)'; this.style.borderColor='#FFC700';" onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.borderColor='rgba(255,255,255,0.2)';">
                                        <i class="fas fa-undo"></i> Padrão
                                    </button>
                                </div>
                                <p style="color: #A1A1A1; font-size: 12px; margin-top: 8px;">
                                    Cor do texto do conteúdo do PDF (nome, informações, etc.)
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background: rgba(255,199,0,0.1); border: 2px solid rgba(255,199,0,0.3); border-radius: 16px; padding: 20px 16px; margin-bottom: 20px;">
                        <h3 style="color: #FFC700; margin-bottom: 16px; font-size: 18px;">
                            <i class="fas fa-image"></i> Logomarca
                        </h3>
                        
                        <div style="display: flex; flex-direction: column; gap: 16px;">
                            <div>
                                <label style="display: block; color: #ECECEC; margin-bottom: 8px; font-weight: 600;">
                                    Logo do PDF:
                                </label>
                                <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                                    <div id="pdf-logo-preview" style="width: 120px; height: 120px; border: 2px dashed rgba(255,199,0,0.5); border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); overflow: hidden;">
                                        ${pdfSettings.logoUrl ? 
                                            `<img src="${pdfSettings.logoUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="Logo">` :
                                            `<div style="text-align: center; color: #A1A1A1;">
                                                <i class="fas fa-image" style="font-size: 32px; margin-bottom: 8px;"></i>
                                                <div style="font-size: 12px;">Sem logo</div>
                                            </div>`
                                        }
                                    </div>
                                    <div style="flex: 1; min-width: 200px;">
                                        <input type="file" id="pdf-logo-input" accept="image/*" 
                                               style="display: none;" onchange="handleLogoUpload(event)">
                                        <button onclick="document.getElementById('pdf-logo-input').click()" 
                                                style="padding: 12px 24px; background: linear-gradient(135deg, #FFC700, #FFB700); border: none; border-radius: 8px; color: #000; font-weight: 600; cursor: pointer; margin-bottom: 8px; display: block; width: 100%;">
                                            <i class="fas fa-upload"></i> ${pdfSettings.logoUrl ? 'Alterar Logo' : 'Adicionar Logo'}
                                        </button>
                                        ${pdfSettings.logoUrl ? 
                                            `<button onclick="removePDFLogo()" style="padding: 10px 20px; background: rgba(255,68,68,0.2); border: 1px solid rgba(255,68,68,0.5); border-radius: 8px; color: #ff4444; font-weight: 600; cursor: pointer; width: 100%;">
                                                <i class="fas fa-trash"></i> Remover Logo
                                            </button>` : ''
                                        }
                                        <p style="color: #A1A1A1; font-size: 12px; margin-top: 8px;">
                                            Formatos aceitos: PNG, JPG, SVG (recomendado: PNG transparente)
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label style="display: block; color: #ECECEC; margin-bottom: 8px; font-weight: 600;">
                                    Tamanho da Logo:
                                </label>
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <input type="range" id="pdf-logo-size" min="20" max="80" value="${pdfSettings.logoSize}" 
                                           style="flex: 1;" oninput="updateLogoSize(this.value)">
                                    <span id="pdf-logo-size-value" style="color: #FFC700; font-weight: 600; min-width: 50px;">${pdfSettings.logoSize}mm</span>
                                </div>
                                <p style="color: #A1A1A1; font-size: 12px; margin-top: 6px;">
                                    Ajuste o tamanho da logo no PDF (20mm a 80mm)
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
                        <button onclick="savePDFSettings()" 
                                style="padding: 14px 28px; background: linear-gradient(135deg, #43e97b, #38f9d7); border: none; border-radius: 12px; color: #000; font-weight: 700; cursor: pointer; font-size: 16px;">
                            <i class="fas fa-save"></i> Salvar Configurações
                        </button>
                    </div>
                </div>
            `;
            
            // Sincronizar inputs de cor
            setupColorInputs();
            
            // Garantir que funções estejam no window para onclick inline
            if (typeof window !== 'undefined') {
                window.handleLogoUpload = handleLogoUpload;
                window.removePDFLogo = removePDFLogo;
                window.updateLogoSize = updateLogoSize;
                window.savePDFSettings = savePDFSettings;
                window.resetPDFColor = resetPDFColor;
                window.updateGradientPreview = updateGradientPreview;
            }
            
            // Atualizar preview do degradê inicial após o DOM estar pronto
            setTimeout(() => {
                if (typeof updateGradientPreview === 'function') {
                    updateGradientPreview();
                }
            }, 150);
        }
        
        // Configurar inputs de cor para sincronizar
        function setupColorInputs() {
            // Degradê - Cor inicial
            const headerColorStartInput = document.getElementById('pdf-header-color-start');
            const headerColorStartText = document.getElementById('pdf-header-color-start-text');
            
            if (headerColorStartInput && headerColorStartText) {
                headerColorStartInput.addEventListener('input', (e) => {
                    headerColorStartText.value = e.target.value;
                    updateGradientPreview();
                });
                headerColorStartText.addEventListener('input', (e) => {
                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                        headerColorStartInput.value = e.target.value;
                        updateGradientPreview();
                    }
                });
            }
            
            // Degradê - Cor final
            const headerColorEndInput = document.getElementById('pdf-header-color-end');
            const headerColorEndText = document.getElementById('pdf-header-color-end-text');
            
            if (headerColorEndInput && headerColorEndText) {
                headerColorEndInput.addEventListener('input', (e) => {
                    headerColorEndText.value = e.target.value;
                    updateGradientPreview();
                });
                headerColorEndText.addEventListener('input', (e) => {
                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                        headerColorEndInput.value = e.target.value;
                        updateGradientPreview();
                    }
                });
            }
            
            // Texto do cabeçalho
            const headerTextColorInput = document.getElementById('pdf-header-text-color');
            const headerTextColorText = document.getElementById('pdf-header-text-color-text');
            
            if (headerTextColorInput && headerTextColorText) {
                headerTextColorInput.addEventListener('input', (e) => {
                    headerTextColorText.value = e.target.value;
                });
                headerTextColorText.addEventListener('input', (e) => {
                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                        headerTextColorInput.value = e.target.value;
                    }
                });
            }
            
            // Texto normal
            const textColorInput = document.getElementById('pdf-text-color');
            const textColorText = document.getElementById('pdf-text-color-text');
            
            if (textColorInput && textColorText) {
                textColorInput.addEventListener('input', (e) => {
                    textColorText.value = e.target.value;
                });
                textColorText.addEventListener('input', (e) => {
                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                        textColorInput.value = e.target.value;
                    }
                });
            }
        }
        
        // Atualizar preview do degradê
        function updateGradientPreview() {
            const preview = document.getElementById('gradient-preview');
            if (preview) {
                const startColor = document.getElementById('pdf-header-color-start')?.value || '#FFC700';
                const endColor = document.getElementById('pdf-header-color-end')?.value || '#FFB700';
                preview.style.background = `linear-gradient(135deg, ${startColor}, ${endColor})`;
            }
        }
        
        // Funções para gerenciar configurações do PDF
        function getPDFSettings() {
            const defaultSettings = {
                headerColor: '#FFC700', // Mantido para compatibilidade
                headerColorStart: '#FFC700',
                headerColorEnd: '#FFB700',
                headerTextColor: '#000000',
                textColor: '#000000',
                logoUrl: null,
                logoSize: 40
            };
            
            const saved = localStorage.getItem(`pdfSettings_${itemId}`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    // Migrar configurações antigas
                    if (parsed.headerColor && !parsed.headerColorStart) {
                        parsed.headerColorStart = parsed.headerColor;
                        parsed.headerColorEnd = parsed.headerColor;
                    }
                    return { ...defaultSettings, ...parsed };
                } catch (e) {
                    return defaultSettings;
                }
            }
            return defaultSettings;
        }
        
        function savePDFSettings() {
            const settings = {
                headerColorStart: document.getElementById('pdf-header-color-start').value,
                headerColorEnd: document.getElementById('pdf-header-color-end').value,
                headerTextColor: document.getElementById('pdf-header-text-color').value,
                textColor: document.getElementById('pdf-text-color').value,
                logoUrl: document.getElementById('pdf-logo-preview').querySelector('img')?.src || null,
                logoSize: parseInt(document.getElementById('pdf-logo-size').value)
            };
            
            localStorage.setItem(`pdfSettings_${itemId}`, JSON.stringify(settings));
            
            // Mostrar mensagem de sucesso
            const btn = event.target;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
            btn.style.background = 'linear-gradient(135deg, #43e97b, #38f9d7)';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = 'linear-gradient(135deg, #43e97b, #38f9d7)';
            }, 2000);
        }
        
        function resetPDFColor(type) {
            const defaultSettings = {
                headerColorStart: '#FFC700',
                headerColorEnd: '#FFB700',
                headerTextColor: '#000000',
                textColor: '#000000'
            };
            
            if (type === 'headerStart') {
                document.getElementById('pdf-header-color-start').value = defaultSettings.headerColorStart;
                document.getElementById('pdf-header-color-start-text').value = defaultSettings.headerColorStart;
                updateGradientPreview();
            } else if (type === 'headerEnd') {
                document.getElementById('pdf-header-color-end').value = defaultSettings.headerColorEnd;
                document.getElementById('pdf-header-color-end-text').value = defaultSettings.headerColorEnd;
                updateGradientPreview();
            } else if (type === 'headerText') {
                document.getElementById('pdf-header-text-color').value = defaultSettings.headerTextColor;
                document.getElementById('pdf-header-text-color-text').value = defaultSettings.headerTextColor;
            } else if (type === 'text') {
                document.getElementById('pdf-text-color').value = defaultSettings.textColor;
                document.getElementById('pdf-text-color-text').value = defaultSettings.textColor;
            }
        }
        
        function handleLogoUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            if (!file.type.startsWith('image/')) {
                alert('Por favor, selecione um arquivo de imagem válido.');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('pdf-logo-preview');
                preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="Logo">`;
                
                // Atualizar botão
                const uploadBtn = preview.nextElementSibling?.querySelector('button');
                if (uploadBtn) {
                    uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Alterar Logo';
                }
            };
            reader.readAsDataURL(file);
        }
        
        function removePDFLogo() {
            const preview = document.getElementById('pdf-logo-preview');
            preview.innerHTML = `
                <div style="text-align: center; color: #A1A1A1;">
                    <i class="fas fa-image" style="font-size: 32px; margin-bottom: 8px;"></i>
                    <div style="font-size: 12px;">Sem logo</div>
                </div>
            `;
            
            // Atualizar botão
            const uploadBtn = preview.nextElementSibling?.querySelector('button');
            if (uploadBtn) {
                uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Adicionar Logo';
            }
        }
        
        function updateLogoSize(value) {
            document.getElementById('pdf-logo-size-value').textContent = `${value}mm`;
        }
        
        // Tornar funções acessíveis globalmente para onclick inline (definir antes de usar)
        if (typeof window !== 'undefined') {
            window.handleLogoUpload = handleLogoUpload;
            window.removePDFLogo = removePDFLogo;
            window.updateLogoSize = updateLogoSize;
            window.savePDFSettings = savePDFSettings;
            window.resetPDFColor = resetPDFColor;
            window.updateGradientPreview = updateGradientPreview;
        }
        
        // Mostrar aba de personalização da Portaria
        async function showCustomizePortariaTab() {
            const content = document.getElementById('content');
            const loading = document.getElementById('loading');
            const itemsList = document.getElementById('items-list');
            const linksSection = document.getElementById('links-hero-section');
            const empty = document.getElementById('empty');
            const adminControls = document.getElementById('admin-controls');
            const pdfSettingsContainer = document.getElementById('pdf-settings-container');
            const statsHeroSection = document.getElementById('stats-hero-section');
            const statsGrid = document.getElementById('stats-grid');
            const searchBar = document.querySelector('.search-bar');
            
            // Esconder elementos normais e garantir que containers de outras abas estão escondidos
            if (loading) loading.style.display = 'none';
            if (itemsList) itemsList.style.display = 'none';
            if (linksSection) linksSection.style.display = 'none';
            if (empty) empty.style.display = 'none';
            if (adminControls) adminControls.style.display = 'none'; // Esconder controles administrativos na aba Personalizar Portaria
            if (pdfSettingsContainer) pdfSettingsContainer.style.display = 'none'; // IMPORTANTE: Esconder container do Personalizar PDF
            if (statsHeroSection) statsHeroSection.style.display = 'none'; // Esconder estatísticas na aba Personalizar Portaria
            if (statsGrid) statsGrid.style.display = 'none'; // Esconder estatísticas na aba Personalizar Portaria
            if (searchBar) searchBar.style.display = 'none'; // Esconder barra de busca e PDF na aba Personalizar Portaria
            
            // Criar ou obter container de personalização
            let customizePortariaContainer = document.getElementById('customize-portaria-container');
            if (!customizePortariaContainer) {
                customizePortariaContainer = document.createElement('div');
                customizePortariaContainer.id = 'customize-portaria-container';
                customizePortariaContainer.style.display = 'block';
                customizePortariaContainer.style.width = '100%';
                customizePortariaContainer.style.height = '100%';
                customizePortariaContainer.style.minHeight = '600px';
                customizePortariaContainer.style.border = 'none';
                customizePortariaContainer.style.overflow = 'hidden';
                content.appendChild(customizePortariaContainer);
            } else {
                customizePortariaContainer.style.display = 'block';
            }
            
            // Garantir que o conteúdo está visível
            if (content) content.style.display = 'block';
            
            // Obter token de autenticação usando a mesma lógica de getHeaders()
            // IMPORTANTE: Usar a mesma lógica para garantir consistência
            let token = localStorage.getItem('conectaKingToken') ||
                       localStorage.getItem('authToken') || 
                       sessionStorage.getItem('authToken') ||
                       localStorage.getItem('userToken') ||
                       sessionStorage.getItem('userToken') ||
                       localStorage.getItem('token') ||
                       sessionStorage.getItem('token');
            
            // Se ainda não encontrou, tentar obter do contexto da página anterior
            if (!token) {
                const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
                if (userData) {
                    try {
                        const user = JSON.parse(userData);
                        token = user.token || user.authToken || user.accessToken;
                    } catch (e) {
                        console.warn('[CUSTOMIZE_PORTARIA] Não foi possível parsear dados do usuário');
                    }
                }
            }
            
            // Verificar se itemId está disponível
            const currentItemId = itemId || (new URLSearchParams(window.location.search)).get('itemId');
            if (!currentItemId) {
                customizePortariaContainer.innerHTML = `
                    <div style="padding: 40px; text-align: center;">
                        <h2 style="color: #FFC700; margin-bottom: 24px;">
                            <i class="fas fa-exclamation-triangle"></i> Erro
                        </h2>
                        <p style="color: #ECECEC; margin-bottom: 24px;">
                            ID do item não encontrado. Por favor, acesse a página de Confirmação de Check-in novamente.
                        </p>
                    </div>
                `;
                console.error('[CUSTOMIZE_PORTARIA] itemId não encontrado');
                return;
            }
            
            if (!token) {
                console.warn('[CUSTOMIZE_PORTARIA] Token não encontrado, tentando carregar mesmo assim (pode funcionar se houver cookie de sessão)');
                // Não mostrar erro imediatamente - tentar carregar o iframe
                // O backend pode aceitar autenticação via cookie
            }
            
            // Cookie HttpOnly: sync via servidor (iframe não manda Authorization)
            try {
                if (token) {
                    await fetch((window.API_BASE || window.API_URL || window.location.origin || '').replace(/\/$/, '') + '/api/auth/sync-session-cookie', {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                            Authorization: 'Bearer ' + token,
                        },
                        body: '{}',
                    });
                }
            } catch (e) {}
            const apiBaseUrl = (window.API_BASE || window.API_URL || window.location.origin || '').replace(/\/$/, '');
            const customizeUrl = `${apiBaseUrl}/api/guest-lists/${currentItemId}/customize-portaria`;
            
            
            // Criar iframe para carregar a página de personalização
            customizePortariaContainer.innerHTML = `
                <iframe 
                    id="customize-portaria-iframe"
                    src="${customizeUrl}" 
                    style="width: 100%; height: calc(100vh - 200px); min-height: 600px; border: none; border-radius: 16px; overflow: hidden; background: transparent;"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation"
                    title="Personalizar Portaria"
                    allow="camera; microphone"
                    loading="eager"
                ></iframe>
            `;
            
            // Adicionar listener para erros no iframe (opcional - para debug)
            const iframe = document.getElementById('customize-portaria-iframe');
            if (iframe) {
                iframe.onload = function() {
                };
                
                iframe.onerror = function(e) {
                    console.error('[CUSTOMIZE_PORTARIA] Erro ao carregar iframe:', e);
                    customizePortariaContainer.innerHTML = `
                        <div style="padding: 40px; text-align: center;">
                            <h2 style="color: #FFC700; margin-bottom: 24px;">
                                <i class="fas fa-exclamation-triangle"></i> Erro ao Carregar
                            </h2>
                            <p style="color: #ECECEC; margin-bottom: 24px;">
                                Não foi possível carregar a página de personalização. Por favor, verifique sua conexão e tente novamente.
                            </p>
                            <button onclick="location.reload()" style="padding: 12px 24px; background: linear-gradient(135deg, #FFC700, #FFB700); border: none; border-radius: 8px; color: #000; font-weight: 600; cursor: pointer; margin-right: 12px;">
                                <i class="fas fa-sync-alt"></i> Recarregar
                            </button>
                        </div>
                    `;
                };
            }
            
        }
        
        // Função auxiliar para converter hex para RGB
        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 255, g: 199, b: 0 }; // Fallback para amarelo padrão
        }
        
        // Confirmar chegada
        async function checkInGuest(guestId, guestName) {
            if (!confirm(`Confirmar chegada de ${guestName}?`)) return;
            
            try {
                const headersForFetch = getHeaders();
                if (!headersForFetch || Object.keys(headersForFetch).length === 0) {
                    alert('Sua sessão expirou. Por favor, faça login novamente.');
                    window.location.href = '/dashboard';
                    return;
                }
                const response = await fetch(`${API_URL}/api/guest-lists/${itemId}/guests/${guestId}`, {
                    method: 'PUT',
                    headers: headersForFetch,
                    body: JSON.stringify({
                        status: 'checked_in',
                        checked_in_at: new Date().toISOString()
                    })
                });
                
                if (!response.ok) throw new Error('Erro ao confirmar chegada');
                
                await loadGuestListData();
            } catch (error) {
                console.error('Erro ao confirmar chegada:', error);
                alert('Erro ao confirmar chegada: ' + error.message);
            }
        }
        
        // Excluir convidado individual
        async function deleteGuest(guestId, guestName) {
            if (!confirm(`Tem certeza que deseja excluir ${guestName}? Esta ação não pode ser desfeita.`)) {
                return;
            }
            
            try {
                const headersForFetch = getHeaders();
                if (!headersForFetch || Object.keys(headersForFetch).length === 0) {
                    alert('Sua sessão expirou. Por favor, faça login novamente.');
                    window.location.href = '/dashboard';
                    return;
                }
                
                const response = await fetch(`${API_URL}/api/guest-lists/${itemId}/guests/${guestId}`, {
                    method: 'DELETE',
                    headers: headersForFetch
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                    throw new Error(errorData.message || 'Erro ao excluir convidado');
                }
                
                // Recarregar dados
                await loadGuestListData();
            } catch (error) {
                console.error('Erro ao excluir convidado:', error);
                alert('Erro ao excluir convidado: ' + error.message);
            }
        }
        
        // Atualizar contador de selecionados
        function updateSelectedCount() {
            const checkboxes = document.querySelectorAll('.guest-checkbox:not(#select-all-checkbox)');
            const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
            const selectedCountSpan = document.getElementById('selected-count');
            const deleteSelectedBtn = document.getElementById('delete-selected-btn');
            const selectAllCheckbox = document.getElementById('select-all-checkbox');
            
            if (selectedCountSpan) selectedCountSpan.textContent = selectedCount;
            if (deleteSelectedBtn) {
                deleteSelectedBtn.style.display = selectedCount > 0 ? 'inline-flex' : 'none';
            }
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = selectedCount > 0 && selectedCount === checkboxes.length;
                selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < checkboxes.length;
            }
        }
        
        // Excluir convidados selecionados
        async function deleteSelectedGuests() {
            const checkboxes = document.querySelectorAll('.guest-checkbox:not(#select-all-checkbox):checked');
            const guestIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.guestId));
            
            if (guestIds.length === 0) {
                alert('Nenhum convidado selecionado.');
                return;
            }
            
            if (!confirm(`Tem certeza que deseja excluir ${guestIds.length} convidado(s)? Esta ação não pode ser desfeita.`)) {
                return;
            }
            
            const deleteSelectedBtn = document.getElementById('delete-selected-btn');
            if (deleteSelectedBtn) {
                deleteSelectedBtn.disabled = true;
                deleteSelectedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
            }
            
            try {
                const headersForFetch = getHeaders();
                if (!headersForFetch || Object.keys(headersForFetch).length === 0) {
                    alert('Sua sessão expirou. Por favor, faça login novamente.');
                    window.location.href = '/dashboard';
                    return;
                }
                
                // Excluir em lote (1 request)
                const response = await fetch(`${API_URL}/api/guest-lists/${itemId}/guests/delete-bulk`, {
                    method: 'POST',
                    headers: {
                        ...headersForFetch,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ guestIds }),
                });
                const result = await response.json().catch(() => ({ success: false }));
                
                if (response.ok && result.success !== false) {
                    alert(`${result.deleted_count ?? guestIds.length} convidado(s) excluído(s) com sucesso.`);
                    await loadGuestListData();
                } else {
                    throw new Error(result.message || 'Alguns convidados não puderam ser excluídos');
                }
            } catch (error) {
                console.error('Erro ao excluir convidados selecionados:', error);
                alert('Erro ao excluir convidados: ' + error.message);
            } finally {
                if (deleteSelectedBtn) {
                    deleteSelectedBtn.disabled = false;
                    deleteSelectedBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Excluir Selecionados (<span id="selected-count">0</span>)';
                }
            }
        }
        
        // Excluir todos os convidados
        async function deleteAllGuests() {
            if (!confirm('Tem certeza que deseja excluir TODOS os convidados? Esta ação não pode ser desfeita.')) {
                return;
            }
            
            const deleteAllBtn = document.getElementById('delete-all-btn');
            if (deleteAllBtn) {
                deleteAllBtn.disabled = true;
                deleteAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
            }
            
            try {
                const headersForFetch = getHeaders();
                if (!headersForFetch || Object.keys(headersForFetch).length === 0) {
                    alert('Sua sessão expirou. Por favor, faça login novamente.');
                    window.location.href = '/dashboard';
                    return;
                }
                
                const response = await fetch(`${API_URL}/api/guest-lists/${itemId}/guests`, {
                    method: 'DELETE',
                    headers: headersForFetch
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    alert(`Todos os convidados foram excluídos com sucesso (${result.deleted_count || 0} excluídos).`);
                    await loadGuestListData();
                } else {
                    throw new Error(result.message || 'Erro ao excluir convidados');
                }
            } catch (error) {
                console.error('Erro ao excluir todos os convidados:', error);
                alert('Erro ao excluir convidados: ' + error.message);
            } finally {
                if (deleteAllBtn) {
                    deleteAllBtn.disabled = false;
                    deleteAllBtn.innerHTML = '<i class="fas fa-trash"></i> Excluir Todos';
                }
            }
        }
        
        // Ver detalhes completos da inscrição
        function viewGuestDetails(guestId) {
            const guest = allData.find(g => g.id === guestId);
            if (!guest) {
                alert('Convidado não encontrado');
                return;
            }
            
            // Garantir que formFields está disponível (debug)
            if (formFields && formFields.length > 0) {
            }
            
            // Criar modal com detalhes completos
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            `;
            
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: #1C1C21;
                border: 2px solid #FFC700;
                border-radius: 20px;
                padding: 32px;
                max-width: 600px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                color: #ECECEC;
            `;
            
            // Extrair informações usando a função auxiliar (incluindo CPF/documento)
            const { displayName, displayEmail, displayWhatsapp, displayDocument } = extractGuestInfo(guest);
            
            // Parsear custom_responses se for string
            let customResponses = {};
            if (guest.custom_responses) {
                try {
                    customResponses = typeof guest.custom_responses === 'string' 
                        ? JSON.parse(guest.custom_responses) 
                        : guest.custom_responses;
                } catch (e) {
                    customResponses = {};
                }
            }
            
            // Preparar HTML dos campos do formulário com labels corretos
            let formFieldsHTML = '';
            if (Object.keys(customResponses).length > 0) {
                // Debug: verificar se formFields está disponível
                
                formFieldsHTML = Object.entries(customResponses).map(([key, value]) => {
                    const label = getFieldLabel(key);
                    
                    // Debug para cada campo
                    
                    const displayValue = Array.isArray(value) ? value.join(', ') : (value || '');
                    
                    // Formatação especial para arrays (como checkbox, multiple_choice)
                    let formattedValue = displayValue;
                    if (Array.isArray(value) && value.length > 1) {
                        formattedValue = value.map(v => `<div style="margin-left: 16px;">— ${v}</div>`).join('');
                    }
                    
                    return `
                        <div style="padding: 12px; background: rgba(255,255,255,0.04); border-radius: 8px; border-left: 4px solid #FFC700;">
                            <div style="font-weight: 700; color: #FFC700; margin-bottom: 6px; font-size: 14px;">${label}</div>
                            <div style="color: #ECECEC; font-size: 14px; ${Array.isArray(value) && value.length > 1 ? 'line-height: 1.8;' : 'line-height: 1.5;'}">${formattedValue}</div>
                        </div>
                    `;
                }).join('');
            }
            
            modalContent.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2 style="margin: 0; color: #FFC700; font-size: 24px;">
                        <i class="fas fa-user"></i> Detalhes da Inscrição
                    </h2>
                    <button onclick="this.closest('[style*=\\'position: fixed\\']').remove()" 
                            style="background: transparent; border: none; color: #ECECEC; font-size: 24px; cursor: pointer; padding: 0; width: 32px; height: 32px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div style="padding: 16px; background: rgba(255,199,0,0.1); border-radius: 12px; border-left: 4px solid #FFC700;">
                        <div style="font-weight: 700; color: #FFC700; margin-bottom: 12px;">
                            <i class="fas fa-barcode"></i> Código da Inscrição: <span style="font-family: monospace; background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px;">King-${new Date(guest.created_at).getFullYear()}${String(new Date(guest.created_at).getMonth() + 1).padStart(2, '0')}${String(new Date(guest.created_at).getDate()).padStart(2, '0')}</span>
                        </div>
                        <div style="font-weight: 700; color: #FFC700; margin: 16px 0 8px 0;">Informações Básicas</div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <div><strong>Nome:</strong> ${displayName}</div>
                            ${displayEmail !== '-' ? `<div><strong>Email:</strong> ${displayEmail}</div>` : ''}
                            ${displayWhatsapp !== '-' ? `<div><strong>WhatsApp:</strong> ${displayWhatsapp}</div>` : ''}
                            ${displayDocument ? `<div><strong>CPF/Documento:</strong> ${displayDocument}</div>` : (guest.document ? `<div><strong>CPF/Documento:</strong> ${guest.document}</div>` : '')}
                        </div>
                        <div style="margin-top: 16px; display: flex; gap: 8px;">
                            <button onclick="downloadGuestPDF(${guest.id})" 
                                    style="padding: 10px 20px; background: linear-gradient(135deg, #DC2626, #B91C1C); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-file-pdf"></i> Baixar PDF
                            </button>
                        </div>
                    </div>
                    
                    ${guest.address || guest.neighborhood || guest.city ? `
                    <div style="padding: 16px; background: rgba(255,199,0,0.05); border-radius: 12px;">
                        <div style="font-weight: 700; color: #FFC700; margin-bottom: 8px;">Endereço</div>
                        <div style="display: flex; flex-direction: column; gap: 4px; color: #A1A1A1;">
                            ${guest.address ? `<div>${guest.address}</div>` : ''}
                            ${guest.neighborhood ? `<div>Bairro: ${guest.neighborhood}</div>` : ''}
                            ${guest.city ? `<div>Cidade: ${guest.city}${guest.state ? ` - ${guest.state}` : ''}</div>` : ''}
                            ${guest.zipcode ? `<div>CEP: ${guest.zipcode}</div>` : ''}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${formFieldsHTML ? `
                    <div style="padding: 20px; background: linear-gradient(135deg, rgba(255,199,0,0.08), rgba(255,199,0,0.03)); border-radius: 12px; border: 1px solid rgba(255,199,0,0.2);">
                        <div style="font-weight: 700; color: #FFC700; margin-bottom: 16px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-clipboard-list" style="font-size: 18px;"></i> Informações do Formulário
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            ${formFieldsHTML}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div style="padding: 16px; background: rgba(255,199,0,0.05); border-radius: 12px;">
                        <div style="font-weight: 700; color: #FFC700; margin-bottom: 8px;">Status e Datas</div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <div><strong>Status:</strong> 
                                <span style="padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; 
                                    ${guest.status === 'checked_in' ? 'background: rgba(67, 233, 123, 0.2); color: #43e97b;' : ''}
                                    ${guest.status === 'confirmed' ? 'background: rgba(59, 130, 246, 0.2); color: #3b82f6;' : ''}
                                    ${guest.status === 'registered' ? 'background: rgba(245, 158, 11, 0.2); color: #f59e0b;' : ''}">
                                    ${guest.status === 'checked_in' ? 'Chegou' : guest.status === 'confirmed' ? 'Confirmado' : 'Inscrito'}
                                </span>
                            </div>
                            ${guest.created_at ? `<div><strong>Inscrito em:</strong> ${new Date(guest.created_at).toLocaleString('pt-BR')}</div>` : ''}
                            ${guest.confirmed_at ? `<div><strong>Confirmado em:</strong> ${new Date(guest.confirmed_at).toLocaleString('pt-BR')}</div>` : ''}
                            ${guest.checked_in_at ? `<div><strong>Chegou em:</strong> ${new Date(guest.checked_in_at).toLocaleString('pt-BR')}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
            
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Fechar ao clicar fora
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }
        
        // Exportar PDF
        function exportToPDF() {
            if (isGuestListMode) {
                exportGuestListPDF();
            } else {
                exportFormResponsesPDF();
            }
        }
        
        // Função para baixar PDF de um convidado específico
        function downloadGuestPDF(guestId) {
            const guest = allData.find(g => g.id === guestId);
            if (!guest) {
                alert('Convidado não encontrado');
                return;
            }
            
            // Verificar se jsPDF está disponível
            if (!window.jspdf || !window.jspdf.jsPDF) {
                alert('Erro: Biblioteca jsPDF não encontrada. Por favor, recarregue a página.');
                console.error('[downloadGuestPDF] jsPDF não encontrado:', window.jspdf);
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Carregar configurações personalizadas do PDF
            const pdfSettings = getPDFSettings();
            
            // Converter cores hex para RGB
            const headerColorStart = hexToRgb(pdfSettings.headerColorStart || pdfSettings.headerColor || '#FFC700');
            const headerColorEnd = hexToRgb(pdfSettings.headerColorEnd || pdfSettings.headerColor || '#FFB700');
            const headerTextColor = hexToRgb(pdfSettings.headerTextColor || '#000000');
            const textColor = hexToRgb(pdfSettings.textColor || '#000000');
            
            // Código da inscrição
            const inscricaoCode = `King-${new Date(guest.created_at).getFullYear()}${String(new Date(guest.created_at).getMonth() + 1).padStart(2, '0')}${String(new Date(guest.created_at).getDate()).padStart(2, '0')}`;
            
            // Extrair informações usando a função auxiliar (incluindo CPF/documento)
            const { displayName, displayEmail, displayWhatsapp, displayDocument } = extractGuestInfo(guest);
            
            // Parsear custom_responses
            let customResponses = {};
            if (guest.custom_responses) {
                try {
                    customResponses = typeof guest.custom_responses === 'string' 
                        ? JSON.parse(guest.custom_responses) 
                        : guest.custom_responses;
                } catch (e) {
                    customResponses = {};
                }
            }
            
            // Calcular altura do cabeçalho baseado na logo
            let headerHeight = 40;
            let logoY = 15;
            if (pdfSettings.logoUrl) {
                headerHeight = Math.max(50, 5 + pdfSettings.logoSize + 25); // Altura mínima 50, ou logo + espaço
            }
            
            // Cabeçalho colorido (usando cor personalizada)
            doc.setFillColor(headerColorStart.r, headerColorStart.g, headerColorStart.b);
            doc.rect(0, 0, 210, headerHeight, 'F');
            
            // Adicionar logo se existir
            if (pdfSettings.logoUrl) {
                try {
                    const logoSize = pdfSettings.logoSize; // em mm
                    const logoX = 105 - (logoSize / 2); // Centralizado
                    
                    // Detectar formato da imagem
                    let imageFormat = 'PNG';
                    if (pdfSettings.logoUrl.includes('data:image/jpeg') || pdfSettings.logoUrl.includes('data:image/jpg')) {
                        imageFormat = 'JPEG';
                    } else if (pdfSettings.logoUrl.includes('data:image/png')) {
                        imageFormat = 'PNG';
                    }
                    
                    doc.addImage(pdfSettings.logoUrl, imageFormat, logoX, 5, logoSize, logoSize);
                    logoY = 5 + logoSize + 5; // Posição após a logo
                } catch (e) {
                    console.warn('Erro ao adicionar logo ao PDF:', e);
                    logoY = 15; // Fallback se der erro
                }
            }
            
            // Título no cabeçalho
            doc.setTextColor(headerTextColor.r, headerTextColor.g, headerTextColor.b);
            doc.setFontSize(22);
            doc.setFont(undefined, 'bold');
            doc.text('Detalhes da Inscrição', 105, logoY + 8, { align: 'center' });
            
            // Código da inscrição
            doc.setFontSize(10);
            doc.text(`Código: ${inscricaoCode}`, 105, logoY + 15, { align: 'center' });
            
            let y = headerHeight + 10; // Começar após o cabeçalho
            doc.setTextColor(textColor.r, textColor.g, textColor.b); // Cor do texto personalizada
            
            // Seção: Informações Básicas
            doc.setFillColor(255, 250, 230); // Amarelo claro
            doc.rect(10, y - 5, 190, 8, 'F');
            
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(255, 140, 0);
            doc.text('Informações Básicas', 14, y);
            y += 8;
            
            doc.setFontSize(11);
            doc.setTextColor(textColor.r, textColor.g, textColor.b);
            doc.setFont(undefined, 'bold');
            doc.text('Nome:', 14, y);
            doc.setFont(undefined, 'normal');
            doc.text(displayName, 50, y);
            
            y += 7;
            if (displayEmail !== '-') {
                doc.setFont(undefined, 'bold');
                doc.text('Email:', 14, y);
                doc.setFont(undefined, 'normal');
                doc.text(displayEmail, 50, y);
                y += 7;
            }
            
            if (displayWhatsapp !== '-') {
                doc.setFont(undefined, 'bold');
                doc.text('WhatsApp:', 14, y);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(37, 211, 102); // Verde WhatsApp
                doc.text(displayWhatsapp, 50, y);
                doc.setTextColor(textColor.r, textColor.g, textColor.b);
                y += 7;
            }
            
            // Usar displayDocument extraído (incluindo CPF de custom_responses se não estiver em guest.document)
            const finalDocument = displayDocument || guest.document || '';
            if (finalDocument) {
                doc.setFont(undefined, 'bold');
                doc.text('CPF/Documento:', 14, y);
                doc.setFont(undefined, 'normal');
                doc.text(finalDocument, 50, y);
                y += 7;
            }
            
            y += 5;
            
            // Endereço
            if (guest.address || guest.neighborhood || guest.city) {
                doc.setFillColor(230, 240, 255); // Azul claro
                doc.rect(10, y - 5, 190, 8, 'F');
                
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(74, 144, 226);
                doc.text('Endereço', 14, y);
                y += 8;
                
                doc.setFontSize(11);
                doc.setTextColor(textColor.r, textColor.g, textColor.b);
                if (guest.address) {
                    doc.text(guest.address, 14, y);
                    y += 6;
                }
                if (guest.neighborhood) {
                    doc.text(`Bairro: ${guest.neighborhood}`, 14, y);
                    y += 6;
                }
                if (guest.city) {
                    doc.text(`Cidade: ${guest.city}${guest.state ? ` - ${guest.state}` : ''}`, 14, y);
                    y += 6;
                }
                if (guest.zipcode) {
                    doc.text(`CEP: ${guest.zipcode}`, 14, y);
                    y += 6;
                }
                y += 3;
            }
            
            // Informações Adicionais (campos do formulário)
            if (Object.keys(customResponses).length > 0) {
                doc.setFillColor(255, 250, 230); // Amarelo claro
                doc.rect(10, y - 5, 190, 8, 'F');
                
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(255, 140, 0);
                doc.text('Informações Adicionais', 14, y);
                y += 8;
                
                doc.setFontSize(11);
                
                Object.entries(customResponses).forEach(([key, value]) => {
                    if (y > 270) {
                        doc.addPage();
                        y = 20;
                    }
                    
                    const label = getFieldLabel(key);
                    const displayValue = Array.isArray(value) ? value.join(', ') : (value || 'N/A');
                    
                    // Calcular largura do label
                    doc.setFont(undefined, 'bold');
                    doc.setFontSize(11);
                    const labelText = `${label}:`;
                    const labelWidth = doc.getTextWidth(labelText);
                    
                    // Se o label for muito longo (mais de 70mm), colocar em linha separada
                    const maxLabelWidth = 70;
                    const valueStartX = 14 + Math.min(labelWidth, maxLabelWidth) + 3;
                    
                    // Usar cor laranja/amarela para a pergunta
                    doc.setTextColor(255, 140, 0); // Laranja/Amarelo
                    doc.setFont(undefined, 'bold');
                    
                    if (labelWidth > maxLabelWidth) {
                        // Label muito longo: colocar em linha separada
                        const labelLines = doc.splitTextToSize(labelText, 180);
                        labelLines.forEach((line, idx) => {
                            doc.text(line, 14, y);
                            if (idx < labelLines.length - 1) {
                                y += 6;
                            }
                        });
                        y += 4; // Espaço entre label e valor
                    } else {
                        // Label normal: colocar na mesma linha
                        doc.text(labelText, 14, y);
                    }
                    
                    // Usar cor personalizada para a resposta
                    doc.setTextColor(textColor.r, textColor.g, textColor.b);
                    doc.setFont(undefined, 'normal');
                    
                    // Calcular largura disponível para o valor
                    const availableWidth = 190 - valueStartX;
                    
                    // Quebrar linha se o valor for muito longo
                    const valueLines = doc.splitTextToSize(displayValue, availableWidth);
                    valueLines.forEach((line, idx) => {
                        if (labelWidth <= maxLabelWidth && idx === 0) {
                            // Primeira linha na mesma linha do label
                            doc.text(line, valueStartX, y);
                        } else {
                            // Linhas seguintes ou se label foi em linha separada
                            if (idx > 0 || labelWidth > maxLabelWidth) {
                                y += 6;
                            }
                            doc.text(line, 14, y);
                        }
                    });
                    
                    // Ajustar Y baseado no número de linhas
                    if (labelWidth > maxLabelWidth) {
                        // Label em linha separada
                        y += valueLines.length * 6;
                    } else {
                        // Label e valor na mesma linha (ou valor quebrado)
                        y += valueLines.length > 1 ? (valueLines.length * 6) : 7;
                    }
                });
                y += 3;
            }
            
            // Status e Datas
            doc.setFillColor(230, 255, 240); // Verde claro
            doc.rect(10, y - 5, 190, 8, 'F');
            
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(67, 233, 123);
            doc.text('Status e Datas', 14, y);
            y += 8;
            
            doc.setFontSize(11);
            doc.setTextColor(textColor.r, textColor.g, textColor.b);
            doc.setFont(undefined, 'bold');
            doc.text('Status:', 14, y);
            doc.setFont(undefined, 'normal');
            const statusText = guest.status === 'checked_in' ? 'Chegou' :
                              guest.status === 'confirmed' ? 'Confirmado' :
                              'Inscrito';
            doc.setTextColor(guest.status === 'checked_in' ? 67 : guest.status === 'confirmed' ? 59 : 255);
            doc.text(statusText, 50, y);
            doc.setTextColor(textColor.r, textColor.g, textColor.b);
            
            y += 7;
            if (guest.created_at) {
                doc.setFont(undefined, 'bold');
                doc.text('Inscrito em:', 14, y);
                doc.setFont(undefined, 'normal');
                doc.text(new Date(guest.created_at).toLocaleString('pt-BR'), 50, y);
                y += 7;
            }
            
            if (guest.confirmed_at) {
                doc.setFont(undefined, 'bold');
                doc.text('Confirmado em:', 14, y);
                doc.setFont(undefined, 'normal');
                doc.text(new Date(guest.confirmed_at).toLocaleString('pt-BR'), 50, y);
                y += 7;
            }
            
            if (guest.checked_in_at) {
                doc.setFont(undefined, 'bold');
                doc.text('Chegou em:', 14, y);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(67, 233, 123); // Verde
                doc.text(new Date(guest.checked_in_at).toLocaleString('pt-BR'), 50, y);
                doc.setTextColor(textColor.r, textColor.g, textColor.b);
            }
            
            // Salvar o PDF
            try {
                const fileName = `inscricao_${inscricaoCode}_${displayName.replace(/[^a-z0-9]/gi, '_')}.pdf`;
                doc.save(fileName);
            } catch (error) {
                console.error('[downloadGuestPDF] Erro ao salvar PDF:', error);
                alert('Erro ao gerar o PDF. Por favor, verifique o console para mais detalhes.');
            }
        }
        
        function exportGuestListPDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Título
            doc.setFontSize(20);
            doc.text('Lista de Convidados', 14, 20);
            
            // Estatísticas
            doc.setFontSize(12);
            let y = 35;
            const total = allData.length;
            const chegou = allData.filter(g => g.status === 'checked_in').length;
            const falta = allData.filter(g => g.status === 'registered' || g.status === 'confirmed').length;
            
            doc.text(`Cadastrados: ${total}`, 14, y);
            y += 7;
            doc.text(`Não Chegou: ${falta}`, 14, y);
            y += 7;
            doc.text(`Chegou: ${chegou}`, 14, y);
            y += 15;
            
            // Cabeçalho da tabela
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text('Nome', 14, y);
            doc.text('WhatsApp', 60, y);
            doc.text('Email', 105, y);
            doc.text('Status', 150, y);
            doc.text('Chegada', 180, y);
            
            y += 7;
            doc.setLineWidth(0.5);
            doc.line(14, y, 200, y);
            y += 5;
            
            // Dados - usar função auxiliar para extrair informações corretas
            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            allData.forEach((guest, index) => {
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                    
                    // Redesenhar cabeçalho
                    doc.setFontSize(10);
                    doc.setFont(undefined, 'bold');
                    doc.text('Nome', 14, y);
                    doc.text('WhatsApp', 60, y);
                    doc.text('Email', 105, y);
                    doc.text('Status', 150, y);
                    doc.text('Chegada', 180, y);
                    y += 7;
                    doc.line(14, y, 200, y);
                    y += 5;
                    doc.setFont(undefined, 'normal');
                    doc.setFontSize(9);
                }
                
                // IMPORTANTE: Usar função auxiliar para extrair nome, email e whatsapp
                const { displayName, displayEmail, displayWhatsapp } = extractGuestInfo(guest);
                
                const checkedInAt = guest.checked_in_at 
                    ? new Date(guest.checked_in_at).toLocaleDateString('pt-BR')
                    : '-';
                
                const statusText = guest.status === 'checked_in' ? 'Chegou' : 
                                 guest.status === 'confirmed' ? 'Confirmado' : 'Não Chegou';
                
                doc.text(displayName.substring(0, 25), 14, y);
                doc.text(displayWhatsapp.substring(0, 15), 60, y);
                doc.text(displayEmail.substring(0, 20), 105, y);
                doc.text(statusText, 150, y);
                doc.text(checkedInAt.substring(0, 10), 180, y);
                
                y += 7;
            });
            
            // Salvar
            const fileName = `lista_convidados_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
        }
        
        function exportFormResponsesPDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.text('Exportação de respostas em PDF - Em desenvolvimento', 14, 20);
            doc.save('respostas.pdf');
        }
        
        // Exportar CSV
        function exportToCSV() {
            if (isGuestListMode) {
                exportGuestListCSV();
            } else {
                exportFormResponsesCSV();
            }
        }
        
        function exportGuestListCSV() {
            const headers = ['Nome', 'WhatsApp', 'Email', 'CPF/CNPJ', 'Status', 'Data de Chegada', 'Data de Confirmação'];
            const rows = allData.map(g => [
                g.name || '',
                g.whatsapp || '',
                g.email || '',
                g.document || '',
                g.status === 'checked_in' ? 'Chegou' : g.status === 'confirmed' ? 'Confirmado' : 'Não Chegou',
                g.checked_in_at ? new Date(g.checked_in_at).toLocaleString('pt-BR') : '',
                g.confirmed_at ? new Date(g.confirmed_at).toLocaleString('pt-BR') : ''
            ]);
            
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');
            
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `lista_convidados_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
        }
        
        function exportFormResponsesCSV() {
            const list = Array.isArray(window.__leadFilteredCache)
                ? window.__leadFilteredCache
                : (window.__leadResponsesCache || allData || []);
            if (!list.length) {
                alert('Não há clientes para exportar neste filtro.');
                return;
            }

            const dynamicKeys = new Set();
            list.forEach(r => {
                const data = r.response_data || r.responses || {};
                Object.keys(data || {}).forEach(k => dynamicKeys.add(k));
            });
            const dyn = Array.from(dynamicKeys);
            const headers = ['Nome', 'WhatsApp', 'Email', 'CPF', 'Lider/Equipe', 'Status', 'Favorito', 'Data cadastro', ...dyn.map(k => (typeof getFieldLabel === 'function' ? getFieldLabel(k) : k))];

            const rows = list.map(r => {
                const { email, phone } = getLeadContact(r);
                const meta = getLeadMeta(r);
                const data = r.response_data || r.responses || {};
                const submittedAt = r.submitted_at || r.created_at;
                const base = [
                    getLeadDisplayName(r),
                    phone,
                    email,
                    getLeadCpf(r),
                    getLeadLeaderValue(r),
                    meta.contacted ? 'Contatado' : 'Pendente',
                    meta.favorite ? 'Sim' : 'Não',
                    submittedAt ? new Date(submittedAt).toLocaleString('pt-BR') : ''
                ];
                const extras = dyn.map(k => formatLeadFieldValue(data[k]));
                return [...base, ...extras];
            });

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => '"' + String(cell == null ? '' : cell).replace(/"/g, '""') + '"').join(','))
            ].join('\n');

            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'captacao_clientes_' + new Date().toISOString().split('T')[0] + '.csv';
            link.click();
        }
        
        // Configurar event listeners quando DOM estiver pronto
        function setupEventListeners() {
            try {
                // Busca em tempo real
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.addEventListener('input', () => {
                        if (isGuestListMode) {
                            if (typeof filterAndRenderGuestList === 'function') {
                                filterAndRenderGuestList();
                            }
                        } else {
                            if (typeof filterAndRenderFormResponses === 'function') {
                                filterAndRenderFormResponses();
                            }
                        }
                    });
                }
                
                // Exportar
                const exportPdfBtn = document.getElementById('export-pdf');
                if (exportPdfBtn && typeof exportToPDF === 'function') {
                    exportPdfBtn.addEventListener('click', exportToPDF);
                }
                
                const exportCsvBtn = document.getElementById('export-csv');
                if (exportCsvBtn && typeof exportToCSV === 'function') {
                    exportCsvBtn.addEventListener('click', exportToCSV);
                }
                
                // Configurar botão voltar - deve voltar para /formPageEdit, não fazer login
                const btnVoltar = document.getElementById('btn-voltar');
                if (btnVoltar) {
                    // Remover qualquer onclick anterior para evitar conflitos
                    btnVoltar.onclick = function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Verificar se o itemId existe antes de navegar
                        const currentItemId = itemId || (new URLSearchParams(window.location.search)).get('itemId');
                        if (currentItemId) {
                            window.location.href = `/formPageEdit?itemId=${currentItemId}`;
                        } else {
                            // Fallback: voltar para dashboard se não tiver itemId
                            window.location.href = '/dashboard';
                        }
                        return false;
                    };
                    
                    // Configurar href também (fallback caso onclick não funcione)
                    if (itemId) {
                        btnVoltar.href = `/formPageEdit?itemId=${itemId}`;
                    } else {
                        btnVoltar.href = '/dashboard';
                    }
                }
            } catch (e) {
                console.warn('[setupEventListeners] Erro ao configurar listeners:', e);
            }
        }
        
        // Configurar event listeners para lista de convidados
        function setupGuestListEventListeners() {
            try {
                // Checkbox "Selecionar Todos"
                const selectAllCheckbox = document.getElementById('select-all-checkbox');
                if (selectAllCheckbox) {
                    selectAllCheckbox.onclick = function() {
                        const checkboxes = document.querySelectorAll('.guest-checkbox:not(#select-all-checkbox)');
                        checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
                        updateSelectedCount();
                    };
                }
                
                // Checkboxes individuais
                const guestCheckboxes = document.querySelectorAll('.guest-checkbox:not(#select-all-checkbox)');
                guestCheckboxes.forEach(checkbox => {
                    checkbox.onclick = updateSelectedCount;
                });
                
                // Botão "Excluir Selecionados"
                const deleteSelectedBtn = document.getElementById('delete-selected-btn');
                if (deleteSelectedBtn) {
                    deleteSelectedBtn.onclick = deleteSelectedGuests;
                }
                
                // Botão "Excluir Todos"
                const deleteAllBtn = document.getElementById('delete-all-btn');
                if (deleteAllBtn) {
                    deleteAllBtn.onclick = deleteAllGuests;
                }
                
                // Atualizar contador inicial
                updateSelectedCount();
            } catch (e) {
                console.warn('[setupGuestListEventListeners] Erro ao configurar listeners:', e);
            }
        }
        
        // Chamar setupEventListeners quando DOM estiver pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupEventListeners);
        } else {
            setTimeout(setupEventListeners, 100);
        }
        
        // Capturar erros não tratados
        window.addEventListener('error', function(event) {
            console.error('[GLOBAL ERROR] Erro não capturado:', event.error);
            console.error('[GLOBAL ERROR] Mensagem:', event.message);
            console.error('[GLOBAL ERROR] Arquivo:', event.filename, 'Linha:', event.lineno);
            
            const loadingEl = document.getElementById('loading');
            if (loadingEl && loadingEl.style.display !== 'none') {
                loadingEl.innerHTML = `
                    <div style="color: #ff4444; text-align: center; padding: 40px;">
                        <i class="fas fa-bug" style="font-size: 3rem; margin-bottom: 16px;"></i>
                        <h3 style="color: #ff4444; margin-bottom: 12px;">Erro no JavaScript</h3>
                        <div style="color: #ECECEC; margin-bottom: 20px; font-family: monospace; font-size: 12px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; max-width: 600px; margin: 0 auto 20px;">
                            ${event.message || 'Erro desconhecido'}
                        </div>
                        <button onclick="location.reload()" style="padding: 12px 24px; background: linear-gradient(135deg, #4A90E2, #357ABD); border: none; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer;">
                            <i class="fas fa-redo"></i> Recarregar Página
                        </button>
                    </div>
                `;
            }
        });
        
        // Capturar promessas rejeitadas não tratadas
        window.addEventListener('unhandledrejection', function(event) {
            console.error('[UNHANDLED PROMISE] Erro não tratado:', event.reason);
            event.preventDefault(); // Prevenir que apareça no console padrão
        });
        
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            // DOM já está pronto, executar imediatamente
            setTimeout(init, 100); // Pequeno delay para garantir que tudo está inicializado
        }
        
        // Função para remover rolagem interna de links-hero-section no mobile
        function removeLinksSectionScroll() {
            const linksSection = document.getElementById('links-hero-section');
            if (linksSection && window.innerWidth <= 768) {
                // Aplicar estilos inline para sobrescrever qualquer CSS
                linksSection.style.setProperty('overflow-y', 'visible', 'important');
                linksSection.style.setProperty('overflow-x', 'hidden', 'important');
                linksSection.style.setProperty('max-height', 'none', 'important');
                linksSection.style.setProperty('height', 'auto', 'important');
                linksSection.style.setProperty('webkit-overflow-scrolling', 'auto', 'important');
                linksSection.style.setProperty('ms-overflow-style', 'none', 'important');
                linksSection.style.setProperty('scrollbar-width', 'none', 'important');
                // IMPORTANTE: Usar 100vw para ocupar TODA a largura da tela (sem margens pretas)
                linksSection.style.setProperty('width', '100vw', 'important');
                linksSection.style.setProperty('max-width', '100vw', 'important');
                linksSection.style.setProperty('margin', '0', 'important');
                // IMPORTANTE: Padding zero nas laterais para remover espaços pretos
                linksSection.style.setProperty('padding', '8px 0', 'important');
                linksSection.style.setProperty('padding-left', '0', 'important');
                linksSection.style.setProperty('padding-right', '0', 'important');
                linksSection.style.setProperty('box-sizing', 'border-box', 'important');
                linksSection.style.setProperty('position', 'relative', 'important');
                return true;
            }
            return false;
        }
        
        // Observar mudanças no DOM para remover scroll quando a seção for exibida
        if (typeof MutationObserver !== 'undefined') {
            setTimeout(() => {
                const linksSection = document.getElementById('links-hero-section');
                if (linksSection) {
                    const observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                                const target = mutation.target;
                                if (target.id === 'links-hero-section' && target.style.display === 'block') {
                                    setTimeout(removeLinksSectionScroll, 100);
                                }
                            }
                        });
                    });
                    observer.observe(linksSection, {
                        attributes: true,
                        attributeFilter: ['style', 'class']
                    });
                }
            }, 1000);
        }
        
        // Listener para redimensionamento da janela
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768) {
                removeLinksSectionScroll();
            }
        });
        
        function init() {
            
            try {
                // Verificar se elementos existem
                const loadingEl = document.getElementById('loading');
                const contentEl = document.getElementById('content');
                const emptyEl = document.getElementById('empty');
                
                
                if (!loadingEl || !contentEl || !emptyEl) {
                    console.error('[INIT] Elementos do DOM não encontrados!');
                    document.body.innerHTML = `
                        <div style="color: #ff4444; text-align: center; padding: 40px;">
                            <h1>Erro: Elementos do DOM não encontrados</h1>
                            <p>Por favor, recarregue a página.</p>
                            <button onclick="location.reload()" style="padding: 12px 24px; background: linear-gradient(135deg, #4A90E2, #357ABD); border: none; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer;">
                                Recarregar
                            </button>
                        </div>
                    `;
                    return;
                }
                
                if (itemId) {
                    loadData().catch(error => {
                        console.error('[INIT] Erro fatal ao carregar dados:', error);
                        console.error('[INIT] Stack:', error.stack);
                        const loadingEl = document.getElementById('loading');
                        if (loadingEl) {
                            loadingEl.innerHTML = `
                                <div style="color: #ff4444; text-align: center; padding: 40px;">
                                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 16px;"></i>
                                    <h3 style="color: #ff4444; margin-bottom: 12px;">Erro ao Carregar</h3>
                                    <div style="color: #ECECEC; margin-bottom: 20px; font-family: monospace; font-size: 12px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; max-width: 600px; margin: 0 auto 20px;">
                                        ${error.message || 'Erro desconhecido'}
                                    </div>
                                    <div style="display: flex; gap: 12px; justify-content: center;">
                                        <button onclick="location.reload()" style="padding: 12px 24px; background: linear-gradient(135deg, #4A90E2, #357ABD); border: none; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer;">
                                            <i class="fas fa-redo"></i> Tentar Novamente
                                        </button>
                                        <button onclick="window.location.href='/dashboard'" style="padding: 12px 24px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #ECECEC; font-weight: 600; cursor: pointer;">
                                            <i class="fas fa-arrow-left"></i> Voltar
                                        </button>
                                    </div>
                                </div>
                            `;
                        }
                    });
                } else {
                    console.error('[INIT] itemId não fornecido');
                    const loadingEl = document.getElementById('loading');
                    if (loadingEl) {
                        loadingEl.innerHTML = `
                            <div style="color: #ff4444; text-align: center; padding: 40px;">
                                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 16px;"></i>
                                <h3 style="color: #ff4444; margin-bottom: 12px;">ID do Item Não Fornecido</h3>
                                <div style="color: #ECECEC; margin-bottom: 20px;">Por favor, acesse esta página através do dashboard.</div>
                                <button onclick="window.location.href='/dashboard'" style="padding: 12px 24px; background: linear-gradient(135deg, #4A90E2, #357ABD); border: none; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer;">
                                    <i class="fas fa-arrow-left"></i> Voltar ao Dashboard
                                </button>
                            </div>
                        `;
                    }
                }
            } catch (error) {
                console.error('[INIT] Erro na função init:', error);
                console.error('[INIT] Stack:', error.stack);
            }
        }
