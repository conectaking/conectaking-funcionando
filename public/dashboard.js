var __ckDashLog = function () { try { if (localStorage.getItem('ck_debug') === '1') console.log.apply(console, arguments); } catch (e) {} };
document.addEventListener('DOMContentLoaded', () => {
    __ckDashLog('Dashboard iniciando... v2026-08-13-banner-url-models');

    // Handler global de erros não capturados
    window.addEventListener('error', (event) => {
        console.error('[GLOBAL ERROR] Erro não capturado:', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error,
            stack: event.error?.stack
        });
    });

    // Handler para promessas rejeitadas não tratadas
    window.addEventListener('unhandledrejection', (event) => {
        console.error('[GLOBAL ERROR] Promise rejeitada não tratada:', {
            reason: event.reason,
            promise: event.promise
        });
    });

    // --- GUARDA DE ROTA (MODO DESENVOLVIMENTO) ---
    const user = JSON.parse(localStorage.getItem('conectaKingUser'));

    // Para desenvolvimento, permite acesso mesmo sem usuário
    if (!user) {
        console.warn('Usuário não encontrado, criando usuário de teste para desenvolvimento');
        const testUser = {
            id: 'test-user',
            accountType: 'premium',
            email: 'test@test.com'
        };
        localStorage.setItem('conectaKingUser', JSON.stringify(testUser));
    } else if (user.accountType === 'free') {
        alert('Acesso negado. Faça um upgrade do seu plano para acessar o dashboard.');
        window.location.href = '/#planos';
        return;
    }

    /** Login/painel na mesma pasta (localhost usa .html; Laravel/prod usa rota limpa). */
    function sameFolderPage(file) {
        try {
            var h = (typeof window !== 'undefined' && window.location && window.location.hostname)
                ? String(window.location.hostname).toLowerCase()
                : '';
            var isLocalDev = (h === '127.0.0.1' || h === 'localhost');
            var name = String(file || '');
            if (!isLocalDev) {
                name = name.replace(/\.html$/i, '');
                if (name && name.indexOf('/') === -1 && name.indexOf('?') === -1 && name.indexOf('#') === -1) {
                    return new URL('/' + name, window.location.origin).href;
                }
            }
            return new URL(name, window.location.href).href;
        } catch (e) {
            return file;
        }
    }
    function isLoginPath() {
        const p = (window.location.pathname || '').toLowerCase();
        return p.endsWith('/login.html') || p.endsWith('login.html') || /\/login\/?$/.test(p);
    }

    let token = localStorage.getItem('conectaKingToken');
    const hostLower = (typeof window !== 'undefined' && window.location && window.location.hostname)
        ? String(window.location.hostname).toLowerCase()
        : '';
    const isProdHost = hostLower === 'conectaking.com.br' || hostLower === 'www.conectaking.com.br' || hostLower.endsWith('.conectaking.com.br');
    if (isProdHost) {
        try {
            localStorage.removeItem('useLocalApi');
            localStorage.setItem('useProductionApi', 'true');
        } catch (e) {}
    }
    const useLocalApi = (typeof window !== 'undefined') && !isProdHost && (
        (window.location.search || '').toLowerCase().includes('api=local') ||
        (localStorage.getItem('useLocalApi') === 'true')
    );
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const inheritedApi = (typeof window !== 'undefined' && (window.API_BASE || window.API_URL))
        ? String(window.API_BASE || window.API_URL).replace(/\/$/, '')
        : '';
    const sameOrigin = (typeof window !== 'undefined' && window.location && window.location.origin)
        ? String(window.location.origin).replace(/\/$/, '')
        : '';
    const localPort = isLocalhost ? String(window.location.port || '') : '';
    const computedLocal = (isLocalhost && (localPort === '8080' || localPort === '80' || localPort === ''))
        ? sameOrigin
        : (window.API_CONFIG?.baseURL || `http://${window.location.hostname}:8080`);
    const computedProd = isProdHost ? (sameOrigin || 'https://www.conectaking.com.br') : 'https://www.conectaking.com.br';
    // Nunca herdar API Node antiga (:5000) em producao
    if (inheritedApi && /:5000$/i.test(inheritedApi) && isProdHost) {
        try { window.API_BASE = computedProd; window.API_URL = computedProd; } catch (e) {}
    }
    const safeInherited = (inheritedApi && /^https?:\/\//i.test(inheritedApi) && !(isProdHost && /:5000$/i.test(inheritedApi)))
        ? inheritedApi
        : '';
    const explicitLocalApi = !!(useLocalApi && isLocalhost);
    let API_URL = safeInherited
        ? safeInherited
        : (explicitLocalApi ? computedLocal : computedProd);
    if (!API_URL || !/^https?:\/\//i.test(API_URL) || (isProdHost && /:5000$/i.test(API_URL))) {
        API_URL = explicitLocalApi && !isProdHost ? computedLocal : computedProd;
    }

    // Tornar API_URL disponível globalmente para planRenderer.js, module-link-limits.js e kingForms.html (nova aba)
    window.API_URL = API_URL;
    try { localStorage.setItem('apiBase', API_URL); } catch (e) {}

    function kingSelectionAdminUrl() {
        var params = new URLSearchParams();
        try {
            if (localStorage.getItem('useLocalApi') === 'true') {
                params.set('api', 'local');
            }
        } catch (e) {}
        // Anti-cache: garante refresh da versão nova no browser normal
        params.set('v', '2026-09-09-cleanUrls1');
        var q = '?' + params.toString();
        var h = (typeof window !== 'undefined' && window.location && window.location.hostname) ? String(window.location.hostname).toLowerCase() : '';
        // Localhost sem rewrite /kingSelection — usar o HTML direto
        if (h === '127.0.0.1' || h === 'localhost') {
            return 'kingSelectionEdit.html' + q;
        }
        return '/kingSelection' + q;
    }
    // Usado por dashboard-listeners / edit-modal (scripts separados)
    window.kingSelectionAdminUrl = kingSelectionAdminUrl;

    function isLegacyKingSelectionUrl(rawUrl) {
        if (!rawUrl) return false;
        try {
            var parsed = new URL(rawUrl, window.location.origin);
            var path = (parsed.pathname || '').toLowerCase();
            return /^(?:\/mr\/)?(?:ring|rings|king)selection(?:edit|project)(?:\.html)?\/?$/.test(path);
        } catch (e) {
            return /(?:ring|rings|king)selection(?:edit|project)(?:\.html)?/i.test(String(rawUrl));
        }
    }

    // Abrir painel do KingSelection (produção: /kingSelection com .htaccess; local: kingSelectionEdit.html)
    window.openKingSelectionAdmin = function () {
        window.location.href = kingSelectionAdminUrl();
    };

    // Função para atualizar headers com o token atual
    function getHeaders() {
        const currentToken = localStorage.getItem('conectaKingToken');
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken || token}` };
    }

    function getAuthHeaders() {
        const currentToken = localStorage.getItem('conectaKingToken');
        return { 'Authorization': `Bearer ${currentToken || token}` };
    }

    // Inicializa headers
    let HEADERS = getHeaders();
    let HEADERS_AUTH = getAuthHeaders();

    window.DashboardCore = {
        getApiUrl: function () { return API_URL; },
        getHeadersAuth: function () { return HEADERS_AUTH; },
        getAuthHeaders: function () { return getAuthHeaders(); },
        getHeaders: function () { return getHeaders(); },
        safeFetch: function (url, options) { return safeFetch(url, options); },
        updateHeaders: function () { return updateHeaders(); }
    };

    window.navigateToKingSelectionAdmin = function navigateToKingSelectionAdmin() {
        window.location.href = kingSelectionAdminUrl();
    };

    // Desktop pode manter links antigos em cache; força o caminho canônico no clique.
    document.addEventListener('click', function (event) {
        var anchor = event && event.target && event.target.closest ? event.target.closest('a[href]') : null;
        if (!anchor) return;
        var href = anchor.getAttribute('href') || '';
        if (!isLegacyKingSelectionUrl(href)) return;
        event.preventDefault();
        event.stopPropagation();
        window.navigateToKingSelectionAdmin();
    }, true);

    // Meu site: carregar orçamentos e resultados do teste de arquétipo no painel

    // Função para atualizar headers (chamada após renovar token)
    function updateHeaders() {
        HEADERS = getHeaders();
        HEADERS_AUTH = getAuthHeaders();
    }

    // Se abriu o dashboard com ?import_form=TOKEN, oferecer importar formulário de outro usuário
    const importFormToken = (new URLSearchParams(window.location.search)).get('import_form');
    if (importFormToken) {
        (async () => {
            const t = localStorage.getItem('conectaKingToken');
            if (!t) {
                window.location.href = sameFolderPage('login.html') + '?returnUrl=' + encodeURIComponent(window.location.href);
                return;
            }
            try {
                const infoRes = await fetch(`${API_URL}/api/profile/import-form-info?token=${encodeURIComponent(importFormToken)}`);
                const info = await infoRes.json().catch(() => ({}));
                if (!infoRes.ok) {
                    alert(info.message || 'Link inválido ou expirado.');
                    return;
                }
                const msg = 'Deseja importar o formulário "' + (info.formTitle || 'Formulário') + '"' + (info.ownerName ? ' de ' + info.ownerName : '') + '" para sua conta?\n\nEle será copiado com todas as perguntas, imagens e configurações.';
                if (!confirm(msg)) return;
                const impRes = await fetch(`${API_URL}/api/profile/import-form`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ token: importFormToken })
                });
                const impData = await impRes.json().catch(() => ({}));
                if (!impRes.ok) {
                    alert(impData.message || 'Erro ao importar.');
                    return;
                }
                const newId = impData.id;
                let cleanSearch = (window.location.search || '').replace(/^\?/, '').split('&').filter(function (p) { return !p.startsWith('import_form='); }).join('&');
                if (cleanSearch) cleanSearch = '?' + cleanSearch;
                history.replaceState({}, '', window.location.pathname + cleanSearch);
                window.location.href = '/formPageEdit?itemId=' + newId;
            } catch (e) {
                alert('Erro ao importar: ' + (e.message || 'tente novamente.'));
            }
        })();
    }

    // Função para renovar token
    async function refreshAccessToken() {
        const refreshToken = localStorage.getItem('conectaKingRefreshToken');

        if (!refreshToken) {
            throw new Error('Nenhum refresh token encontrado');
        }

        try {
            const response = await fetch(`${API_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Erro ao renovar token' }));
                throw new Error(errorData.message || 'Erro ao renovar token');
            }

            const data = await response.json();

            // Atualiza tokens
            token = data.token;
            localStorage.setItem('conectaKingToken', data.token);
            if (data.refreshToken) {
                localStorage.setItem('conectaKingRefreshToken', data.refreshToken);
            }

            // Atualiza headers
            updateHeaders();

            return data.token;
        } catch (error) {
            // Se falhar, limpa tokens e redireciona para login
            localStorage.removeItem('conectaKingToken');
            localStorage.removeItem('conectaKingRefreshToken');
            localStorage.removeItem('conectaKingUser');
            if (!isLoginPath()) {
                window.location.href = sameFolderPage('login.html');
            }
            throw error;
        }
    }

    // --- FUNf—AO MELHORADA PARA FETCH (COMPATfVEL COM ANDROID) ---
    // Cache de requisições para evitar rate limit
    const requestCache = new Map();
    const CACHE_DURATION = 30000; // 30 segundos de cache para GET requests
    const RATE_LIMIT_COOLDOWN = 60000; // 60 segundos de cooldown após rate limit

    function safeFetchDefaultTimeoutMs() {
        try {
            const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
            // Mobile: TLS/CPU mais lentos + rede instável; Safari costuma não dizer "Failed to fetch"
            if (/Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
                return 120000;
            }
        } catch (e) { /* ignore */ }
        return 90000; // Render cold start pode levar ~60s
    }

    function isLikelyNetworkTransportError(error) {
        if (!error) return false;
        const n = String(error.name || '');
        const m = String(error.message || '').toLowerCase();
        if (n === 'AbortError') return false; // tratado à parte (timeout)
        if (m.includes('failed to fetch')) return true;
        if (m.includes('load failed')) return true; // Safari iOS
        if (m.includes('networkerror')) return true;
        if (m.includes('network request failed')) return true;
        if (m.includes('err_internet_disconnected') || m.includes('err_network_changed')) return true;
        if (m.includes('network connection was lost')) return true;
        if (m.includes('connection was lost')) return true;
        if (m.includes('internet connection appears to be offline')) return true;
        if (n === 'TypeError' && (m.includes('fetch') || m.includes('network') || m.includes('load'))) return true;
        return false;
    }

    async function safeFetch(url, options = {}) {
        const combinedHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            ...(options.headers || {})
        };

        // Se o body for FormData, remove o Content-Type para o browser setar o boundary corretamente
        if (options.body && options.body instanceof FormData) {
            delete combinedHeaders['Content-Type'];
        }

        const defaultOptions = {
            method: 'GET',
            timeout: safeFetchDefaultTimeoutMs(),
            ...options,
            headers: combinedHeaders
        };

        // Verificar cache para requisições GET
        if (defaultOptions.method === 'GET' || !defaultOptions.method) {
            const cacheKey = `${url}_${JSON.stringify(defaultOptions.headers || {})}`;
            const cached = requestCache.get(cacheKey);

            if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
                __ckDashLog(`Usando cache para: ${url}`);
                return cached.response.clone();
            }
        }

        // Adiciona headers de autorização se necessário
        const currentToken = localStorage.getItem('conectaKingToken');
        if (currentToken && !defaultOptions.headers.Authorization) {
            defaultOptions.headers.Authorization = `Bearer ${currentToken}`;
        }

        try {
            __ckDashLog(` Fazendo requisição para: ${url}`);

            // Cria um AbortController para timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), defaultOptions.timeout);

            const response = await fetch(url, {
                ...defaultOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Não lança erro em 401 para permitir tratamento/refresh de token no caller
            // Trata 429 (Rate Limit) de forma especial
            if (!response.ok) {
                if (response.status === 401) {
                    console.warn(`Requisição retornou 401 para: ${url}`);
                    return response;
                }
                if (response.status === 429) {
                    console.warn(`Rate limit atingido para: ${url}`);
                    const retryAfter = response.headers.get('Retry-After') || '60';
                    const err = new Error(`Muitas requisições. Aguarde ${retryAfter} segundos antes de tentar novamente.`);
                    err.status = 429;
                    err.retryAfter = parseInt(retryAfter);

                    // Armazenar cooldown no localStorage
                    const cooldownKey = `rateLimit_${url}`;
                    localStorage.setItem(cooldownKey, Date.now().toString());

                    throw err;
                }
                const err = new Error(`HTTP ${response.status}: ${response.statusText}`);
                err.status = response.status;
                throw err;
            }

            // Cachear resposta bem-sucedida para GET requests
            if (defaultOptions.method === 'GET' || !defaultOptions.method) {
                const cacheKey = `${url}_${JSON.stringify(defaultOptions.headers || {})}`;
                requestCache.set(cacheKey, {
                    response: response.clone(),
                    timestamp: Date.now()
                });
            }

            __ckDashLog(`Requisição bem-sucedida para: ${url}`);
            return response;

        } catch (error) {
            console.error(` Erro na requisição para ${url}:`, error);

            // Tratamento específico para diferentes tipos de erro
            if (error.name === 'AbortError') {
                throw new Error('Timeout: A requisição demorou muito para responder');
            } else if (error.message && (error.message.includes('ERR_NETWORK_CHANGED') || error.message.includes('ERR_INTERNET_DISCONNECTED'))) {
                throw new Error('Erro de conexão: Sua rede mudou ou foi desconectada. Verifique sua internet e tente novamente');
            } else if (error.message && error.message.includes('Failed to fetch')) {
                throw new Error('Erro de conexão: Não foi possível conectar ao servidor. Verifique sua internet e tente novamente');
            } else if (error.message && error.message.includes('NetworkError')) {
                throw new Error('Erro de rede: Verifique sua conexão');
            } else if (isLikelyNetworkTransportError(error)) {
                throw new Error('Erro de conexão: Não foi possível conectar ao servidor. Verifique sua internet e tente novamente');
            } else {
                throw error;
            }
        }
    }

    // --- FUNf—AO ESPECfFICA PARA UPLOAD DE PDF ---
    async function uploadPDF(file, progressCallback = null) {
        if (!file) {
            throw new Error('Nenhum arquivo selecionado');
        }

        // Validação do arquivo
        if (file.type !== 'application/pdf') {
            throw new Error('Por favor, selecione um arquivo PDF válido');
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB
            throw new Error('O arquivo deve ter no máximo 10MB');
        }

        __ckDashLog(`?o Iniciando upload do PDF: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

        if (progressCallback) {
            progressCallback('Enviando para servidor...');
        }

        // APENAS API - SEM MODO OFFLINE
        const formData = new FormData();
        formData.append('pdfFile', file);

        try {
            const response = await safeFetch(`${API_URL}/api/upload/pdf`, {
                method: 'POST',
                body: formData
            });

            __ckDashLog(`?o¡ Resposta do servidor: ${response.status} ${response.statusText}`);

            // Verifica se a resposta é JSON válida
            const contentType = response.headers.get('content-type');
            __ckDashLog(`?o— Content-Type da resposta: ${contentType}`);

            if (!contentType || !contentType.includes('application/json')) {
                const responseText = await response.text();
                console.error('Resposta não é JSON:', responseText.substring(0, 500));

                // Mensagens específicas para diferentes tipos de erro
                if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
                    throw new Error('SERVIDOR COM PROBLEMA: O endpoint /api/upload/pdf não está funcionando. Verifique o arquivo SERVER-FIXES.md para correções necessárias.');
                } else if (response.status === 404) {
                    throw new Error('ENDPOINT NAO ENCONTRADO: O endpoint /api/upload/pdf não existe no servidor. Implemente conforme SERVER-FIXES.md');
                } else if (response.status === 401) {
                    throw new Error('NAO AUTORIZADO: Token inválido ou expirado. Faça login novamente.');
                } else if (response.status === 500) {
                    throw new Error('ERRO DO SERVIDOR: Erro interno no servidor. Verifique os logs do servidor e implemente as correções do SERVER-FIXES.md');
                } else {
                    throw new Error(` ERRO DO SERVIDOR (${response.status}): ${response.statusText}. Verifique SERVER-FIXES.md para correções.`);
                }
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Erro do servidor: ${response.status}`);
            }

            __ckDashLog(`✓ Upload do PDF bem-sucedido:`, result);

            if (progressCallback) {
                progressCallback('Arquivo Carregado!');
            }

            return result;

        } catch (error) {
            console.error('Erro no upload do PDF:', error);

            if (progressCallback) {
                progressCallback('Erro no envio');
            }

            // Re-lança o erro com informações específicas
            if (error.message.includes('Failed to fetch')) {
                throw new Error('ERRO DE CONEXAO: Não foi possível conectar ao servidor. Verifique sua internet e se o servidor está funcionando.');
            } else if (error.message.includes('Unexpected token')) {
                throw new Error('ERRO DE RESPOSTA: Servidor retornou dados inválidos. Implemente as correções do SERVER-FIXES.md');
            } else {
                throw error;
            }
        }
    }

    // --- FUNf—AO DE TESTE PARA VERIFICAR ENDPOINT ---
    async function testPDFEndpoint() {
        __ckDashLog(' Testando conectividade com o servidor...');

        try {
            // Testa um endpoint que sabemos que existe
            const testResponse = await fetch(`${API_URL}/api/account/status`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            __ckDashLog(` Teste de conectividade: ${testResponse.status} ${testResponse.statusText}`);

            if (testResponse.ok) {
                __ckDashLog('✓ Servidor está funcionando');
                return {
                    server: true,
                    status: testResponse.status,
                    message: 'Servidor funcionando normalmente'
                };
            } else {
                __ckDashLog('âš ï¸ Servidor com problemas');
                return {
                    server: false,
                    status: testResponse.status,
                    message: 'Servidor com problemas, usando modo offline'
                };
            }

        } catch (error) {
            console.error('Servidor não acessível:', error);
            return {
                server: false,
                error: error.message,
                message: 'Servidor não acessível, usando modo offline'
            };
        }
    }

    // Disponibiliza a função de teste globalmente
    window.testPDFEndpoint = testPDFEndpoint;

    // --- FUNf—f—ES PARA QR CODE PIX VfLIDO ---

    // Função para calcular CRC16 (necessário para PIX)
    function calculateCRC16(data) {
        const polynomial = 0x1021;
        let crc = 0xFFFF;

        for (let i = 0; i < data.length; i++) {
            crc ^= data.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                if (crc & 0x8000) {
                    crc = (crc << 1) ^ polynomial;
                } else {
                    crc <<= 1;
                }
                crc &= 0xFFFF;
            }
        }

        return crc.toString(16).toUpperCase().padStart(4, '0');
    }

    // Função para formatar chave PIX
    function formatPixKey(pixKey) {
        const cleanKey = pixKey.trim().replace(/\D/g, ''); // Remove tudo que não é número

        // Se for celular (11 dígitos), adiciona +55
        if (cleanKey.length === 11) {
            return '+55' + cleanKey;
        }

        // Se for celular com DDD (13 dígitos), adiciona +
        if (cleanKey.length === 13 && cleanKey.startsWith('55')) {
            return '+' + cleanKey;
        }

        // Se já tem +, mantém como está
        if (pixKey.startsWith('+')) {
            return pixKey;
        }

        // Para outros tipos (CPF, email, chave aleatória), mantém como está
        return pixKey;
    }

    // Função para gerar código PIX EMV válido
    function generatePixEMVCode(pixKey, recipientName, amount = null, description = '') {
        if (!pixKey || !recipientName) {
            throw new Error('Chave PIX e nome do recebedor são obrigatórios');
        }

        // Limpar e validar dados
        const cleanPixKey = formatPixKey(pixKey);
        const cleanName = recipientName.trim().substring(0, 25);
        const cleanDescription = description.trim().substring(0, 25);
        const cleanAmount = amount ? parseFloat(amount).toFixed(2) : '0.00';

        __ckDashLog(' Gerando código PIX com dados:', {
            pixKeyOriginal: pixKey,
            pixKeyFormatted: cleanPixKey,
            name: cleanName,
            amount: cleanAmount,
            description: cleanDescription
        });

        // Construir código EMV manualmente para garantir formato correto
        let emvString = '';

        // Payload Format Indicator
        emvString += '000201';

        // Point of Initiation Method (12 = Static)
        emvString += '010212';

        // Merchant Account Information
        const pixData = '0014BR.GOV.BCB.PIX' + cleanPixKey.length.toString().padStart(2, '0') + cleanPixKey;
        emvString += '26' + pixData.length.toString().padStart(2, '0') + pixData;

        // Merchant Category Code
        emvString += '52040000';

        // Transaction Currency (BRL = 986)
        emvString += '5303986';

        // Transaction Amount
        emvString += '54' + cleanAmount.length.toString().padStart(2, '0') + cleanAmount;

        // Country Code
        emvString += '5802BR';

        // Merchant Name
        emvString += '59' + cleanName.length.toString().padStart(2, '0') + cleanName;

        // Merchant City
        emvString += '6006CIDADE';

        // Additional Data Field Template (se houver descrição)
        if (cleanDescription) {
            const additionalData = '05' + cleanDescription.length.toString().padStart(2, '0') + cleanDescription;
            emvString += '62' + additionalData.length.toString().padStart(2, '0') + additionalData;
        }

        // CRC16
        const crc = calculateCRC16(emvString + '6304');
        emvString += '6304' + crc;

        __ckDashLog('?o Código EMV final:', emvString);
        __ckDashLog('?o Tamanho:', emvString.length);

        return emvString;
    }

    // Função para criar QR Code PIX visual
    function createPixQRCode(pixKey, recipientName, amount = null, description = '') {
        try {
            const pixCode = generatePixEMVCode(pixKey, recipientName, amount, description);

            // Criar container para QR Code
            const container = document.createElement('div');
            container.style.textAlign = 'center';
            container.style.padding = '20px';

            // Gerar QR Code usando a biblioteca QRCode
            const qrCode = new QRCode(container, {
                text: pixCode,
                width: 300,
                height: 300,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });

            // Adicionar informações abaixo do QR Code
            const info = document.createElement('div');
            info.style.marginTop = '10px';
            info.style.fontSize = '14px';
            info.style.color = '#666';
            info.innerHTML = `
                <div><strong>${recipientName}</strong></div>
                <div>Chave: ${pixKey}</div>
                ${amount ? `<div>Valor: R$ ${parseFloat(amount).toFixed(2)}</div>` : ''}
                ${description ? `<div>Descrição: ${description}</div>` : ''}
            `;

            container.appendChild(info);

            return container;

        } catch (error) {
            console.error('Erro ao gerar QR Code PIX:', error);
            return null;
        }
    }

    // Função para abrir modal com QR Code PIX
    function openPixQRModal(pixKey, recipientName, amount = null, description = '') {
        const modal = document.createElement('div');
        modal.className = 'pix-qr-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            max-width: 400px;
            width: 90%;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Escaneie para pagar com PIX';
        title.style.marginBottom = '20px';

        const qrContainer = createPixQRCode(pixKey, recipientName, amount, description);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Fechar';
        closeBtn.style.cssText = `
            margin-top: 20px;
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        `;
        closeBtn.onclick = () => modal.remove();

        content.appendChild(title);
        content.appendChild(qrContainer);
        content.appendChild(closeBtn);
        modal.appendChild(content);

        document.body.appendChild(modal);

        // Fechar ao clicar fora
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    }

    // disponibiliza as funções globalmente
    window.openPixQRModal = openPixQRModal;
    window.generatePixEMVCode = generatePixEMVCode;

    function parseBannerDestination(raw) {
        const s = String(raw || '').trim();
        if (!s) return { primary_url: '', instagram_url: '', whatsapp_url: '' };
        if (s.startsWith('{')) {
            try {
                const o = JSON.parse(s);
                return {
                    primary_url: String(o.primary_url || o.link || '').trim(),
                    instagram_url: String(o.instagram_url || '').trim(),
                    whatsapp_url: String(o.whatsapp_url || '').trim()
                };
            } catch (e) { /* legado */ }
        }
        return { primary_url: s, instagram_url: '', whatsapp_url: '' };
    }

    if (window.DashboardCore) {
        window.DashboardCore.parseBannerDestination = parseBannerDestination;
    }

    function serializeBannerDestination(primaryUrl, instagramRaw, whatsappRaw) {
        // Atalhos IG/WA abaixo do banner foram removidos: grava só a URL principal
        // (ignora instagram/whatsapp legados para não recriar o overlay no cartão).
        void instagramRaw;
        void whatsappRaw;
        return String(primaryUrl || '').trim();
    }

    if (window.DashboardCore) window.DashboardCore.serializeBannerDestination = serializeBannerDestination;

    function normalizeBannerInstagramUrl(raw) {
        const v = String(raw || '').trim();
        if (!v) return '';
        if (/^https?:\/\//i.test(v)) {
            try {
                const u = new URL(v);
                if (!/instagram\.com$/i.test(u.hostname.replace(/^www\./, '')) && !u.hostname.includes('instagram.com')) {
                    return v;
                }
                const parts = u.pathname.split('/').filter(Boolean);
                const handle = parts[0] || '';
                return handle ? `https://www.instagram.com/${encodeURIComponent(handle)}/` : '';
            } catch (e) {
                return v;
            }
        }
        const handle = v.replace(/^@/, '').replace(/^instagram\.com\//i, '').split(/[/?#]/)[0].trim();
        return handle ? `https://www.instagram.com/${encodeURIComponent(handle)}/` : '';
    }

    function normalizeBannerWhatsAppUrl(raw) {
        const v = String(raw || '').trim();
        if (!v) return '';
        if (/^https?:\/\//i.test(v)) {
            if (v.includes('wa.me') || v.includes('api.whatsapp.com')) return v;
            return v;
        }
        const digits = v.replace(/\D/g, '');
        return digits ? `https://wa.me/${digits}` : '';
    }

    function bannerInstagramEditorValue(storedUrl) {
        const u = String(storedUrl || '').trim();
        if (!u) return '';
        const m = u.match(/instagram\.com\/([^/?#]+)/i);
        return m ? `@${m[1]}` : u;
    }

    function bannerWhatsAppEditorValue(storedUrl) {
        const u = String(storedUrl || '').trim();
        if (!u) return '';
        const m = u.match(/wa\.me\/(\d+)/i);
        return m ? `https://wa.me/${m[1]}` : u;
    }

    function readBannerSocialFromItemEl(itemEl) {
        const itemId = itemEl?.dataset?.id;
        let modal = null;
        if (SELECTORS.editItemModal?.classList?.contains('active') && itemId
            && String(SELECTORS.editItemModal.dataset.editingId) === String(itemId)) {
            modal = SELECTORS.editItemModal;
        } else if (itemId) {
            modal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"]`);
        }
        const igRaw = modal?.querySelector('#edit-banner-instagram')?.value
            ?? itemEl?.querySelector('.banner-instagram-input')?.value
            ?? '';
        const waRaw = modal?.querySelector('#edit-banner-whatsapp')?.value
            ?? itemEl?.querySelector('.banner-whatsapp-input')?.value
            ?? '';
        return {
            instagram_url: normalizeBannerInstagramUrl(igRaw),
            whatsapp_url: normalizeBannerWhatsAppUrl(waRaw)
        };
    }

    function bannerUrlModelsHtml() {
        const igModel = 'https://www.instagram.com/seuusuario/';
        const waModel = 'https://wa.me/5511999999999';
        return `
                <div class="banner-social-extras" style="margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08);">
                    <label style="font-weight: 600;">Modelos de link (cole na URL acima)</label>
                    <p class="banner-field-hint" style="margin: 6px 0 12px; font-size: 0.8rem; color: #a1a1a1; line-height: 1.35;">Copie o modelo, troque o @ ou o número e cole no campo <strong style="color:#ececec">URL ao clicar na imagem</strong>. Assim o banner fica com um link só - sem atalhos por cima da foto.</p>
                    <div class="banner-field-row" style="margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 6px;"><i class="fab fa-instagram" style="margin-right: 6px;"></i>Modelo Instagram</label>
                        <code class="banner-url-model" data-model="${igModel}" style="display:block;padding:10px;border-radius:8px;border:1px solid var(--border-color,#2C2C2F);background:rgba(0,0,0,0.25);color:#facc15;font-size:0.82rem;word-break:break-all;">${igModel}</code>
                        <div class="banner-field-actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
                            <button type="button" class="banner-copy-model-btn" data-model="${igModel}" style="padding:6px 12px;border-radius:6px;border:1px solid rgba(255,199,0,0.4);background:transparent;color:var(--dourado-principal,#FFC700);cursor:pointer;font-size:0.85rem;">Copiar modelo</button>
                            <button type="button" class="banner-use-model-btn" data-model="${igModel}" style="padding:6px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#ececec;cursor:pointer;font-size:0.85rem;">Usar na URL</button>
                        </div>
                    </div>
                    <div class="banner-field-row">
                        <label style="display: block; margin-bottom: 6px;"><i class="fab fa-whatsapp" style="margin-right: 6px;"></i>Modelo WhatsApp</label>
                        <code class="banner-url-model" data-model="${waModel}" style="display:block;padding:10px;border-radius:8px;border:1px solid var(--border-color,#2C2C2F);background:rgba(0,0,0,0.25);color:#facc15;font-size:0.82rem;word-break:break-all;">${waModel}</code>
                        <div class="banner-field-actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
                            <button type="button" class="banner-copy-model-btn" data-model="${waModel}" style="padding:6px 12px;border-radius:6px;border:1px solid rgba(255,199,0,0.4);background:transparent;color:var(--dourado-principal,#FFC700);cursor:pointer;font-size:0.85rem;">Copiar modelo</button>
                            <button type="button" class="banner-use-model-btn" data-model="${waModel}" style="padding:6px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#ececec;cursor:pointer;font-size:0.85rem;">Usar na URL</button>
                        </div>
                    </div>
                </div>`;
    }

    if (window.DashboardCore) window.DashboardCore.bannerUrlModelsHtml = bannerUrlModelsHtml;

    function bannerDestDisplayLabel(raw) {
        const p = parseBannerDestination(raw);
        if (!p.primary_url) return 'Sem destino';
        return p.primary_url.length > 48 ? p.primary_url.slice(0, 48) + '...': p.primary_url;
    }

    if (window.DashboardCore) window.DashboardCore.bannerDestDisplayLabel = bannerDestDisplayLabel;

    if (window.DashboardCore) window.DashboardCore.wifiBannerUploadBlockHtml = function () { return wifiBannerUploadBlockHtml.apply(null, arguments); };
    function wifiBannerUploadBlockHtml(itemId, bannerUrl) {
        const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        const url = (bannerUrl || '').trim();
        const hasImg = url && !url.includes('placeholder');
        const uploadLabel = hasImg ? 'Trocar Imagem' : 'Clique para fazer upload';
        const imgDisp = hasImg ? 'block' : 'none';
        const safeId = esc(itemId || 'temp');
        return `
                <div class="input-group">
                    <label>Imagem do banner</label>
                    <div class="image-upload-area wifi-banner-upload-area banner-item" data-item-type="wifi-banner" data-item-id="${safeId}">
                        <input type="file" class="item-file-input" accept="image/*" data-item-type="wifi-banner" data-item-id="${safeId}">
                        <div class="image-upload-text">
                            <p><i class="fas fa-cloud-upload-alt"></i> ${uploadLabel}</p>
                            <span>ou arraste uma imagem aqui</span>
                        </div>
                        <img id="edit-wifi-banner-preview" class="banner-preview wifi-banner-preview" src="${esc(url)}" alt="" style="max-width: 100%; max-height: 200px; margin-top: 10px; display: ${imgDisp}; border-radius: 8px;">
                        <div class="upload-loader"></div>
                    </div>
                    <input type="hidden" id="edit-wifi-banner-url" value="${esc(url)}">
                </div>`;
    }

    // --- FUNf—AO DE TESTE E DEBUG PARA PIX ---
    function testPixCode(pixKey, recipientName, amount = null, description = '') {
        __ckDashLog(' Testando código PIX...');
        __ckDashLog('?o— Dados de entrada:');
        __ckDashLog('- Chave PIX:', pixKey);
        __ckDashLog('- Nome:', recipientName);
        __ckDashLog('- Valor:', amount);
        __ckDashLog('- Descrição:', description);

        try {
            const pixCode = generatePixEMVCode(pixKey, recipientName, amount, description);
            __ckDashLog('✓ Código EMV gerado:', pixCode);
            __ckDashLog('?o Tamanho do código:', pixCode.length);

            // Verificar se começa com 000201
            if (pixCode.startsWith('000201')) {
                __ckDashLog('✓ Código começa corretamente com 000201');
            } else {
                __ckDashLog('ERRO: Código não começa com 000201');
            }

            // Verificar se termina com CRC válido
            const crc = pixCode.slice(-4);
            __ckDashLog(' CRC calculado:', crc);

            // Verificar estrutura básica
            if (pixCode.includes('BR.GOV.BCB.PIX')) {
                __ckDashLog('✓ Contém identificador BR.GOV.BCB.PIX');
            } else {
                __ckDashLog('ERRO: Não contém BR.GOV.BCB.PIX');
            }

            if (pixCode.includes(pixKey)) {
                __ckDashLog('✓ Contém chave PIX');
            } else {
                __ckDashLog('ERRO: Não contém chave PIX');
            }

            return pixCode;

        } catch (error) {
            console.error('Erro ao gerar código PIX:', error);
            return null;
        }
    }

    // Função para testar com dados reais do cliente
    function testClientPix() {
        __ckDashLog(' Testando com dados reais do cliente...');
        return testPixCode(
            '1119478723275204000053039865802BR',
            'ASSEMBLEIA DE DEUS CHAMA',
            null,
            'Doação'
        );
    }

    // Função para testar celular
    function testCelularPix(celular) {
        __ckDashLog('?o± Testando PIX com celular:', celular);
        return testPixCode(
            celular,
            'TESTE CELULAR',
            null,
            'Teste'
        );
    }

    // Disponibiliza funções de teste
    window.testPixCode = testPixCode;
    window.testClientPix = testClientPix;
    window.testCelularPix = testCelularPix;
    window.formatPixKey = formatPixKey;

    let activeItemIdForIconPicker = null;
    // qrCodeInstance → dashboard-qr.js
    // cropper / imageToUpload → js/dashboard-upload.js (DashboardUpload)

    // --- 2. SELETORES DE DOM ---
    const SELECTORS = {
        mainPanes: document.querySelectorAll('[data-pane]'),
        sidebarNavLinks: document.querySelectorAll('.sidebar .nav-link'),
        editorPanes: document.querySelectorAll('.editor-pane'),
        editorNavLinks: document.querySelectorAll('.editor-nav-link'),
        displayNameInput: document.getElementById('displayName'),
        whatsappNumberInput: document.getElementById('whatsappNumber'),
        bioInput: document.getElementById('bio'),
        profileSlugInput: document.getElementById('profileSlug'),
        itemsContainer: document.getElementById('items-container'),
        previewCard: document.querySelector('.preview-card'),
        addItemBtn: document.getElementById('add-item-btn'),
        addItemModal: document.getElementById('add-item-modal'),
        closeAddModalBtn: document.getElementById('close-add-modal-btn'),
        saveAllBtn: document.getElementById('save-all-btn'),
        publicLink: document.getElementById('public-link'),
        previewScreen: document.getElementById('preview-screen'),
        previewAvatar: document.getElementById('preview-avatar'),
        previewName: document.getElementById('preview-name'),
        previewBio: document.getElementById('preview-bio'),
        previewItemsContainer: document.createElement('div'),
        fontFamilySelect: document.getElementById('font-family-select'),
        backgroundTypeOptions: document.querySelectorAll('input[name="bg-type"]'),
        backgroundColorContainer: document.getElementById('background-color-container'),
        backgroundImageContainer: document.getElementById('background-image-container'),
        backgroundUploadArea: document.getElementById('background-upload-area'),
        backgroundFileInput: document.getElementById('background-file-input'),
        backgroundImagePreview: document.getElementById('background-image-preview'),
        backgroundImageUrlInput: document.getElementById('background-image-url-input'),
        backgroundColorPicker: document.getElementById('background-color-picker'),
        cardBackgroundColorPicker: document.getElementById('card-background-color-picker'),
        cardOpacityPicker: document.getElementById('card-opacity-picker'),
        cardOpacityValue: document.getElementById('card-opacity-value'),
        textColorPicker: document.getElementById('text-color-picker'),
        buttonColorPicker: document.getElementById('button-color-picker'),
        buttonTextColorPicker: document.getElementById('button-text-color-picker'),
        buttonOpacityPicker: document.getElementById('button-opacity-picker'),
        buttonOpacityValue: document.getElementById('button-opacity-value'),
        radiusTL: document.getElementById('radius-tl'),
        radiusTR: document.getElementById('radius-tr'),
        radiusBR: document.getElementById('radius-br'),
        radiusBL: document.getElementById('radius-bl'),
        buttonBorderRadiusValue: document.getElementById('button-border-radius-value'),
        buttonAlignOptions: document.querySelectorAll('input[name="button-align"]'),
        buttonFontSizePicker: document.getElementById('button-font-size-picker'),
        buttonFontSizeValue: document.getElementById('button-font-size-value'),
        iconModal: document.getElementById('icon-modal'),
        iconGrid: document.getElementById('icon-grid'),
        iconSearchInput: document.getElementById('icon-search'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        livePreview: document.querySelector('.live-preview'),
        previewToggleBtn: document.getElementById('preview-toggle-btn'),
        periodSelector: document.getElementById('period-selector'),
        kpiTotalViews: document.getElementById('kpi-total-views'),
        kpiTotalClicks: document.getElementById('kpi-total-clicks'),
        kpiCtr: document.getElementById('kpi-ctr'),
        kpiTotalSaves: document.getElementById('kpi-total-saves'),
        performanceChartCanvas: document.getElementById('performance-chart'),
        topItemsList: document.getElementById('top-items-list'),
        dashboardPhotoUploadArea: document.getElementById('dashboard-photo-upload-area'),
        dashboardPhotoPreview: document.getElementById('dashboard-photo-preview'),
        dashboardPhotoFileInput: document.getElementById('dashboard-photo-file-input'),
        dashboardAvatarUploadArea: document.getElementById('dashboard-avatar-upload-area'),
        dashboardAvatarPreview: document.getElementById('dashboard-avatar-preview'),
        dashboardAvatarFileInput: document.getElementById('dashboard-avatar-file-input'),
        avatarFormatSelector: document.getElementById('avatar-format-selector'),
        avatarFormatButtons: document.querySelectorAll('.avatar-format-btn'),
        editItemModal: document.getElementById('edit-item-modal'),
        editModalTitle: document.getElementById('edit-modal-title'),
        editModalBody: document.getElementById('edit-modal-body'),
        closeEditModalBtn: document.getElementById('close-edit-modal-btn'),
        saveEditModalBtn: document.getElementById('save-edit-modal-btn'),
        deleteModalBtn: document.getElementById('delete-modal-btn'),
        mobilePreviewBtn: document.getElementById('mobile-preview-btn'),
        previewCloseBtn: document.getElementById('preview-close-btn'),
        backgroundImageOpacityPicker: document.getElementById('background-image-opacity-picker'),
        backgroundImageOpacityValue: document.getElementById('background-image-opacity-value'),
        showVcardButtonOptions: document.querySelectorAll('input[name="vcard-toggle"]'),
        btnConfigCabecalho: document.getElementById('btn-config-cabecalho'),
        logoAlignLeft: document.getElementById('logo-align-left'),
        logoAlignCenter: document.getElementById('logo-align-center'),
        logoAlignRight: document.getElementById('logo-align-right'),
        configExpandedContent: document.getElementById('config-expanded-content')
    };

    // Placeholder SVG padrão para avatar (usado quando não há imagem ou falha no carregamento)
    const DEFAULT_AVATAR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNzUiIGN5PSI3NSIgcj0iNzAiIGZpbGw9IiMzMzMzMzMiLz48dGV4dCB4PSI3NSIgeT0iODUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0MCI+8J+RiDwvdGV4dD48L3N2Zz4=';

    // Função auxiliar para atualizar avatares com tratamento de erro
    function setAvatarSrc(element, src) {
        if (!element) return;
        // Se a URL for do serviço externo que está falhando, usar placeholder direto
        if (src && src.includes('avatar.iran.liara.run')) {
            element.src = DEFAULT_AVATAR_PLACEHOLDER;
            return;
        }
        element.src = src || DEFAULT_AVATAR_PLACEHOLDER;
        // Garantir que há tratamento de erro para fallback
        element.onerror = function () {
            this.onerror = null;
            this.src = DEFAULT_AVATAR_PLACEHOLDER;
        };
    }

    if (window.DashboardCore) {
        window.DashboardCore.getSelectors = function () { return SELECTORS; };
        window.DashboardCore.setAvatarSrc = setAvatarSrc;
        window.DashboardCore.getDefaultAvatarPlaceholder = function () { return DEFAULT_AVATAR_PLACEHOLDER; };
    }


    async function fetchAndUpdateUserStatus() {
        if (!token) {
            console.warn('Token não encontrado, usando dados mock');
            return JSON.parse(localStorage.getItem('conectaKingUser'));
        }

        try {
            // Cooldown para evitar muitas requisições
            const now = Date.now();
            const lastStatusCheck = localStorage.getItem('lastStatusCheck');
            const STATUS_CHECK_COOLDOWN = 5000; // 5 segundos

            if (lastStatusCheck && (now - parseInt(lastStatusCheck)) < STATUS_CHECK_COOLDOWN) {
                __ckDashLog('⏳ Cooldown ativo para status. Usando dados locais.');
                return JSON.parse(localStorage.getItem('conectaKingUser'));
            }

            localStorage.setItem('lastStatusCheck', now.toString());

            const response = await fetch(`${API_URL}/api/account/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                console.warn('Token inválido, usando dados locais para desenvolvimento');
                return JSON.parse(localStorage.getItem('conectaKingUser'));
            }

            // Tratar 429 (Rate Limit)
            if (response.status === 429) {
                console.warn('Rate limit atingido ao verificar status. Usando dados locais.');
                return JSON.parse(localStorage.getItem('conectaKingUser'));
            }

            if (!response.ok) {
                throw new Error('Falha ao buscar status do usuário.');
            }

            const freshUser = await response.json();

            localStorage.setItem('conectaKingUser', JSON.stringify(freshUser));

            __ckDashLog('[fetchAndUpdateUserStatus] Status do usuário atualizado:', {
                email: freshUser.email,
                hasFinance: freshUser.hasFinance,
                hasContract: freshUser.hasContract,
                hasAgenda: freshUser.hasAgenda,
                plan_code: freshUser.plan_code
            });

            // Aplicar visibilidade dos módulos imediatamente
            if (typeof window.applyModulesVisibility === 'function') {
                __ckDashLog('[fetchAndUpdateUserStatus] Aplicando visibilidade dos módulos...');
                window.applyModulesVisibility(freshUser);
            } else {
                console.warn('[fetchAndUpdateUserStatus] window.applyModulesVisibility não está disponível ainda');
            }

            return freshUser;

        } catch (error) {
            // Tratar erro 429 especificamente
            if (error.status === 429 || (error.message && error.message.includes('429'))) {
                console.warn('Rate limit atingido. Usando dados locais.');
            } else {
                console.error('Erro na API, usando dados locais:', error);
            }
            return JSON.parse(localStorage.getItem('conectaKingUser'));
        }
    }

    SELECTORS.previewItemsContainer.className = 'preview-items';
    if (SELECTORS.previewBio) SELECTORS.previewBio.insertAdjacentElement('afterend', SELECTORS.previewItemsContainer);


    // Cartão/preview: js/dashboard-cartao.js (DashboardCartao)
    function updateLivePreviewFromForm() {
        if (window.DashboardCartao && typeof window.DashboardCartao.updateLivePreviewFromForm === 'function') {
            return window.DashboardCartao.updateLivePreviewFromForm();
        }
    }
    function updateVcardPreviewButton(buttonEl) {
        if (window.DashboardCartao && typeof window.DashboardCartao.updateVcardPreviewButton === 'function') {
            return window.DashboardCartao.updateVcardPreviewButton(buttonEl);
        }
    }
    function preserveLocalItemStates() {
        if (window.DashboardCartao && typeof window.DashboardCartao.preserveLocalItemStates === 'function') {
            return window.DashboardCartao.preserveLocalItemStates();
        }
        return {};
    }
    function restoreLocalItemStates(preservedStates) {
        if (window.DashboardCartao && typeof window.DashboardCartao.restoreLocalItemStates === 'function') {
            return window.DashboardCartao.restoreLocalItemStates(preservedStates);
        }
    }
    function appendMinimalModuleListItem(item) {
        if (window.DashboardCartao && typeof window.DashboardCartao.appendMinimalModuleListItem === 'function') {
            return window.DashboardCartao.appendMinimalModuleListItem(item);
        }
        return false;
    }
    function reconcileModulesListWithProfileData(profileData) {
        if (window.DashboardCartao && typeof window.DashboardCartao.reconcileModulesListWithProfileData === 'function') {
            return window.DashboardCartao.reconcileModulesListWithProfileData(profileData);
        }
    }
    function normalizeProfileItemType(item) {
        if (window.DashboardCartao && typeof window.DashboardCartao.normalizeProfileItemType === 'function') {
            return window.DashboardCartao.normalizeProfileItemType(item);
        }
        return item;
    }
    function getModuleListItemsFromProfile(profileData) {
        if (window.DashboardCartao && typeof window.DashboardCartao.getModuleListItemsFromProfile === 'function') {
            return window.DashboardCartao.getModuleListItemsFromProfile(profileData);
        }
        return [];
    }
    window.reconcileModulesListWithProfileData = reconcileModulesListWithProfileData;



    // Editor de módulos: js/dashboard-editor.js (DashboardEditor.renderEditor)
    function renderEditor(profileData) {
        if (window.DashboardEditor && typeof window.DashboardEditor.renderEditor === 'function') {
            return window.DashboardEditor.renderEditor(profileData);
        }
    }
    window.renderEditor = renderEditor;
    if (window.DashboardCore) window.DashboardCore.renderEditor = renderEditor;


    function updateAvatarFormatSelector(format) {
        const buttons = document.querySelectorAll('.avatar-format-btn');
        if (!buttons || buttons.length === 0) return;
        buttons.forEach(btn => {
            if (btn.dataset.format === format) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    if (window.DashboardCore) window.DashboardCore.updateAvatarFormatSelector = updateAvatarFormatSelector;

    // Função para aplicar formato CSS ao preview do avatar
    function applyAvatarFormatToPreview(avatarElement, format) {
        if (!avatarElement) return;

        // Remover classes de formato anteriores
        avatarElement.classList.remove('avatar-circular', 'avatar-square-full', 'avatar-square-small');

        // Aplicar classe do formato atual
        const formatClass = `avatar-${format}`;
        avatarElement.classList.add(formatClass);

        // Aplicar estilos específicos baseados no formato
        if (format === 'circular') {
            avatarElement.style.borderRadius = '50%';
            avatarElement.style.width = '120px';
            avatarElement.style.height = '120px';
            avatarElement.style.maxWidth = 'none';
            avatarElement.style.aspectRatio = 'auto';
        } else if (format === 'square-full') {
            avatarElement.style.borderRadius = '0';
            avatarElement.style.width = '100%';
            avatarElement.style.maxWidth = '680px';
            avatarElement.style.height = 'auto';
            avatarElement.style.aspectRatio = '1 / 1';
            avatarElement.style.objectFit = 'cover';
        } else if (format === 'square-small') {
            avatarElement.style.borderRadius = '0';
            avatarElement.style.width = '120px';
            avatarElement.style.height = '120px';
            avatarElement.style.maxWidth = 'none';
            avatarElement.style.aspectRatio = 'auto';
        }
    }

    if (window.DashboardCore) {
        window.DashboardCore.applyAvatarFormatToPreview = applyAvatarFormatToPreview;
    }

    // Função para salvar o formato do avatar
    async function saveAvatarFormat(format) {
        try {
            __ckDashLog('Salvando formato do avatar:', format);
            const response = await safeFetch(`${API_URL}/api/profile/avatar-format`, {
                method: 'PUT',
                headers: {
                    ...HEADERS_AUTH,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ avatar_format: format })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao salvar formato do avatar');
            }

            // Atualizar dados do perfil na memória
            if (window.currentProfileData && window.currentProfileData.details) {
                window.currentProfileData.details.avatar_format = format;
            }
            if (window.lastProfileData && window.lastProfileData.details) {
                window.lastProfileData.details.avatar_format = format;
            }

            // Atualizar preview
            if (SELECTORS.previewAvatar) {
                applyAvatarFormatToPreview(SELECTORS.previewAvatar, format);
            }

            __ckDashLog('Formato do avatar salvo com sucesso:', format);

        } catch (error) {
            console.error('Erro ao salvar formato do avatar:', error);
            alert(`Erro: ${error.message}`);
        }
    }

    
    // Upload/Cropper: js/dashboard-upload.js
    async function handleDashboardPhotoUpload(imageFile) {
        if (window.DashboardUpload && window.DashboardUpload.handleDashboardPhotoUpload) {
            return window.DashboardUpload.handleDashboardPhotoUpload(imageFile);
        }
    }
    async function handleDashboardAvatarUpload(imageFile) {
        if (window.DashboardUpload && window.DashboardUpload.handleDashboardAvatarUpload) {
            return window.DashboardUpload.handleDashboardAvatarUpload(imageFile);
        }
    }
    async function handleImageUpload(imageFile, itemElement) {
        if (window.DashboardUpload && window.DashboardUpload.handleImageUpload) {
            return window.DashboardUpload.handleImageUpload(imageFile, itemElement);
        }
    }
    function openCropper(file, triggerType, itemElement, customRatio) {
        if (window.DashboardUpload && window.DashboardUpload.openCropper) {
            return window.DashboardUpload.openCropper(file, triggerType, itemElement, customRatio);
        }
    }
    function closeCropper() {
        if (window.DashboardUpload && window.DashboardUpload.closeCropper) {
            return window.DashboardUpload.closeCropper();
        }
    }
    window.openCropper = openCropper;
    window.closeCropper = closeCropper;


    // Edit modal: js/dashboard-edit-modal.js
    async function openEditModal(itemEl) {
        if (window.DashboardEditModal && window.DashboardEditModal.openEditModal) {
            return window.DashboardEditModal.openEditModal(itemEl);
        }
    }
    function openEditModalForNewItem(tempItem) {
        if (window.DashboardEditModal && window.DashboardEditModal.openEditModalForNewItem) {
            return window.DashboardEditModal.openEditModalForNewItem(tempItem);
        }
    }
    window.openEditModal = openEditModal;
    window.openEditModalForNewItem = openEditModalForNewItem;

    if (window.DashboardCore) window.DashboardCore.duplicateItem = function () { return duplicateItem.apply(null, arguments); };
    async function duplicateItem(itemId) {
        if (!itemId) {
            console.warn('duplicateItem chamado sem itemId');
            return;
        }
        if (String(itemId).startsWith('temp_')) {
            alert('Publique as alterações primeiro para poder duplicar este módulo.');
            return;
        }
        const btn = document.querySelector(`.duplicate-item-btn[data-item-id="${itemId}"], .module-action-btn.duplicate[data-item-id="${itemId}"]`);
        const origTitle = btn?.getAttribute?.('title');
        const url = `${typeof API_URL !== 'undefined' ? API_URL : window.API_URL || ''}/api/profile/items/${itemId}/duplicate`;
        __ckDashLog(' Duplicando módulo:', itemId, '', url);
        try {
            if (btn) {
                btn.disabled = true;
                btn.setAttribute('title', 'Duplicando...');
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'fas fa-spinner fa-spin';
            }
            const response = await fetch(url, {
                method: 'POST',
                headers: typeof getHeaders === 'function' ? getHeaders() : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('conectaKingToken') || '') }
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                const msg = result?.message || result?.error || (typeof result === 'string' ? result : null) || `Erro ${response.status}`;
                console.error('Duplicar falhou:', response.status, result);
                throw new Error(msg);
            }
            // Sucesso (2xx): sempre recarregar o perfil completo para trazer digital_form_data (perguntas, fotos, etc.) do novo item
            const newItem = result?.id != null ? result : (result?.item || result?.data);
            if (newItem?.id != null) __ckDashLog('Módulo duplicado com id:', newItem.id);
            const doRefresh = typeof fetchProfileData === 'function' ? fetchProfileData : (typeof window.fetchProfileData === 'function' ? window.fetchProfileData : null);
            if (doRefresh) {
                await doRefresh(true);
            } else {
                window.location.reload();
            }
        } catch (err) {
            console.error('Erro ao duplicar módulo:', err);
            alert(err.message || 'Não foi possível duplicar o módulo. Verifique se a API está atualizada e tente novamente.');
        } finally {
            if (btn) {
                btn.disabled = false;
                if (origTitle) btn.setAttribute('title', origTitle);
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'fas fa-copy';
            }
        }
    }
    window.duplicateItem = duplicateItem;

    // Função para deletar item
    if (window.DashboardCore) window.DashboardCore.deleteItem = function () { return deleteItem.apply(null, arguments); };
    async function deleteItem(itemId) {
        if (!itemId) {
            console.error('O ID do item não fornecido para deleção');
            alert('Erro: ID do módulo não encontrado.');
            return;
        }

        // Verificar se é um item temporário (não salvo ainda)
        const isTemporary = itemId.toString().startsWith('temp_');
        const itemEl = document.querySelector(`[data-id="${itemId}"]`);
        const isUnsaved = itemEl?.dataset.isUnsaved === 'true';

        if (isTemporary || isUnsaved) {
            // Item temporário: apenas remover do DOM e dos dados locais
            __ckDashLog(`'️ Removendo item temporário ${itemId} (não salvo no servidor)...`);

            if (itemEl) {
                itemEl.remove();
                __ckDashLog(`Item temporário ${itemId} removido do DOM`);
            }

            // Remover dos dados locais também
            if (window.currentProfileData && window.currentProfileData.items) {
                window.currentProfileData.items = window.currentProfileData.items.filter(item => String(item.id) !== String(itemId));
            }

            __ckDashLog(`Item temporário ${itemId} removido completamente (não era necessário salvar no servidor)`);
            return; // Não fazer requisição ao servidor
        }

        try {
            __ckDashLog(`'️ Tentando deletar item ${itemId} do servidor...`);
            __ckDashLog(`Y"< URL da requisição: ${API_URL}/api/profile/items/${itemId}`);

            // Atualizar headers antes de fazer a requisição
            const currentHeaders = getHeaders();
            __ckDashLog(`Headers da requisição:`, Object.keys(currentHeaders));

            const response = await fetch(`${API_URL}/api/profile/items/${itemId}`, {
                method: 'DELETE',
                headers: currentHeaders
            });

            __ckDashLog(`Resposta do servidor:`, {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            // Se receber 401, tentar renovar token e tentar novamente
            if (response.status === 401) {
                __ckDashLog('Token expirado ao deletar, tentando renovar...');
                try {
                    await refreshAccessToken();
                    const newHeaders = getHeaders();
                    const retryResponse = await fetch(`${API_URL}/api/profile/items/${itemId}`, {
                        method: 'DELETE',
                        headers: newHeaders
                    });

                    if (!retryResponse.ok) {
                        throw new Error(`Erro ${retryResponse.status}: ${retryResponse.statusText}`);
                    }

                    const result = await retryResponse.json();
                    __ckDashLog(`Resposta do servidor:`, result);

                    // Remover visualmente o item IMEDIATAMENTE
                    let itemEl = document.querySelector(`.module-item[data-id="${itemId}"]`);
                    if (!itemEl) {
                        itemEl = document.querySelector(`.item[data-id="${itemId}"]`);
                    }
                    if (!itemEl) {
                        itemEl = document.querySelector(`[data-id="${itemId}"]`);
                    }

                    if (itemEl) {
                        __ckDashLog(`'️ Removendo item ${itemId} do DOM...`);
                        itemEl.remove();
                        __ckDashLog(`Item ${itemId} removido do DOM imediatamente`);
                    } else {
                        console.warn(`Item ${itemId} não encontrado no DOM`);
                    }

                    // IMPORTANTE: Remover também dos dados locais para evitar que volte ao recarregar
                    if (window.currentProfileData && window.currentProfileData.items) {
                        const initialLength = window.currentProfileData.items.length;
                        window.currentProfileData.items = window.currentProfileData.items.filter(item => String(item.id) !== String(itemId));
                        const removed = initialLength > window.currentProfileData.items.length;
                        if (removed) {
                            __ckDashLog(`Item ${itemId} removido dos dados locais (currentProfileData)`);
                        } else {
                            console.warn(`Item ${itemId} não encontrado nos dados locais`);
                        }
                    }

                    // IMPORTANTE: NÃO recarregar dados após deletar!
                    // O item foi removido do servidor e do DOM. Não fazer fetchProfileData aqui.
                    __ckDashLog(`Módulo ${itemId} deletado com sucesso do servidor, removido do DOM e dos dados locais`);
                    __ckDashLog(`Y' Nota: Clique em "Publicar alterações" para sincronizar todas as mudanças`);
                    return;
                } catch (refreshError) {
                    console.error('Erro ao renovar token:', refreshError);
                    throw new Error('Sessão expirada. Por favor, faça login novamente.');
                }
            }

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Falha ao deletar item';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    errorMessage = `Erro ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            __ckDashLog(`Resposta do servidor:`, result);

            // Remover visualmente o item IMEDIATAMENTE do DOM
            // Tentar múltiplos seletores para garantir que encontramos o elemento
            let itemEl = document.querySelector(`.module-item[data-id="${itemId}"]`);
            if (!itemEl) {
                itemEl = document.querySelector(`.item[data-id="${itemId}"]`);
            }
            if (!itemEl) {
                itemEl = document.querySelector(`[data-id="${itemId}"]`);
            }

            if (itemEl) {
                __ckDashLog(`'️ Removendo item ${itemId} do DOM imediatamente...`);
                // Remover imediatamente sem animação
                itemEl.remove();
                __ckDashLog(`Item ${itemId} removido do DOM`);
            } else {
                console.warn(`Item ${itemId} não encontrado no DOM`);
            }

            // IMPORTANTE: Remover também dos dados locais para evitar que volte ao recarregar
            if (window.currentProfileData && window.currentProfileData.items) {
                const initialLength = window.currentProfileData.items.length;
                window.currentProfileData.items = window.currentProfileData.items.filter(item => String(item.id) !== String(itemId));
                const removed = initialLength > window.currentProfileData.items.length;
                if (removed) {
                    __ckDashLog(`Item ${itemId} removido dos dados locais (currentProfileData)`);
                } else {
                    console.warn(`Item ${itemId} não encontrado nos dados locais`);
                }
            }

            // IMPORTANTE: NÃO recarregar dados após deletar!
            // O item foi removido do servidor e do DOM. Não fazer fetchProfileData aqui
            // porque isso pode trazer o item de volta se houver algum problema de sincronização.
            // O usuário pode clicar em "Publicar alterações" depois se quiser sincronizar.
            __ckDashLog(`Módulo ${itemId} deletado com sucesso do servidor, removido do DOM e dos dados locais`);
            __ckDashLog(`Y' Nota: Clique em "Publicar alterações" para sincronizar todas as mudanças`);
        } catch (error) {
            console.error('Erro ao deletar item:', error);
            console.error('Stack trace:', error.stack);

            let errorMessage = error.message || 'Erro desconhecido ao deletar módulo';
            if (error.message.includes('Sessão expirada')) {
                alert('Sessão expirada. Por favor, faça login novamente.');
                localStorage.removeItem('conectaKingToken');
                localStorage.removeItem('conectaKingRefreshToken');
                localStorage.removeItem('conectaKingUser');
                window.location.href = sameFolderPage('login.html');
                return;
            }

            alert(`Erro ao deletar módulo: ${errorMessage}\n\nTente atualizar a página e tentar novamente.`);
        }
    }

    // Função para atualizar status ativo do item
    if (window.DashboardCore) {
        window.DashboardCore.updateItemActiveStatus = function () {
            return updateItemActiveStatus.apply(null, arguments);
        };
    }
    async function updateItemActiveStatus(itemId, isActive) {
        try {
            const itemEl = document.querySelector(`.module-item[data-id="${itemId}"], .item[data-id="${itemId}"]`);
            if (!itemEl) {
                console.error(`Item ${itemId} não encontrado no DOM`);
                return;
            }

            const itemType = itemEl.dataset.itemType;

            // IMPORTANTE: sales_page salva DIRETAMENTE no servidor (não espera "Publicar alterações")
            if (itemType === 'sales_page') {
                __ckDashLog(` [TOGGLE] Sales_page ${itemId} - salvando diretamente no servidor: ${isActive ? 'ativado' : 'desativado'}`);

                // Salvar diretamente no servidor
                const response = await fetch(`${API_URL}/api/profile/items/${itemId}`, {
                    method: 'PUT',
                    headers: HEADERS,
                    body: JSON.stringify({ is_active: isActive })
                });

                if (!response.ok) {
                    throw new Error(`Erro ${response.status} ao salvar status do sales_page`);
                }

                // Atualizar visualmente após salvar no servidor
                itemEl.dataset.isActive = isActive;
                const toggleInput = itemEl.querySelector('.module-toggle-input');
                if (toggleInput) {
                    toggleInput.checked = isActive;
                }

                // Atualizar dados locais
                if (window.currentProfileData && window.currentProfileData.items) {
                    const item = window.currentProfileData.items.find(i => String(i.id) === String(itemId));
                    if (item) {
                        item.is_active = isActive;
                    }
                }

                __ckDashLog(`Sales_page ${itemId} salvo no servidor: ${isActive ? 'ativado' : 'desativado'}`);
                return;
            }

            // Para outros módulos: salvar APENAS localmente (frontend)
            // O botão "Publicar alterações" é que salva no servidor
            __ckDashLog(` [TOGGLE] Atualizando status do módulo ${itemId} apenas localmente: ${isActive ? 'ativado' : 'desativado'}`);
            __ckDashLog(`Y' Nota: Clique em "Publicar alterações" para salvar esta mudança no servidor`);

            // Atualizar visualmente apenas localmente
            itemEl.dataset.isActive = isActive;

            // Garantir que o toggle está sincronizado
            const toggleInput = itemEl.querySelector('.module-toggle-input');
            if (toggleInput) {
                toggleInput.checked = isActive;
            }

            // Atualizar também no currentProfileData para manter sincronizado
            if (window.currentProfileData && window.currentProfileData.items) {
                const itemIndex = window.currentProfileData.items.findIndex(item => String(item.id) === String(itemId));
                if (itemIndex !== -1) {
                    window.currentProfileData.items[itemIndex].is_active = isActive;
                    __ckDashLog(`Status do módulo ${itemId} atualizado localmente nos dados do perfil`);
                }
            }

            // Atualizar preview local
            updateLivePreviewFromForm();

            __ckDashLog(`Status do módulo ${itemId} atualizado localmente. Clique em "Publicar alterações" para salvar no servidor.`);

            // NÃO fazer requisição ao servidor aqui - isso será feito quando o usuário clicar em "Publicar alterações"
            return;
        } catch (error) {
            console.error('Erro ao atualizar status do item localmente:', error);
            alert(`Erro ao atualizar status do módulo: ${error.message}`);
        }
    }

    // Função para atualizar item na lista usando dados retornados pela API após salvar
    if (window.DashboardCore) window.DashboardCore.updateItemFromApiResponse = function () { return updateItemFromApiResponse.apply(null, arguments); };
    async function updateItemFromApiResponse(itemId, apiResult, itemType) {
        if (!apiResult) {
            console.warn(`Item ${itemId} não encontrado ou dados da API vazios`);
            return;
        }
        let itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
        if (!itemEl) {
            console.warn(`Item ${itemId} (${itemType}) não está na lista do editor - re-render`);
            const pid = String(itemId);
            if (window.currentProfileData?.items) {
                const idx = window.currentProfileData.items.findIndex(function (i) { return String(i.id) === pid; });
                const merged = Object.assign(
                    {},
                    idx >= 0 ? window.currentProfileData.items[idx] : {},
                    apiResult,
                    { id: apiResult.id || itemId, item_type: apiResult.item_type || itemType }
                );
                if (idx >= 0) window.currentProfileData.items[idx] = merged;
                else window.currentProfileData.items.push(merged);
            }
            if (!window.__reconcileModulesScheduled) {
                window.__reconcileModulesScheduled = true;
                requestAnimationFrame(function () {
                    window.__reconcileModulesScheduled = false;
                    if (window.currentProfileData) {
                        renderEditor(window.currentProfileData);
                        reconcileModulesListWithProfileData(window.currentProfileData);
                    }
                });
            }
            return;
        }

        __ckDashLog(` Atualizando item ${itemId} (${itemType}) na interface usando dados da API...`);

        // Preparar timestamp para evitar cache de imagens
        const imageUrlWithTimestamp = apiResult.image_url ? `${apiResult.image_url}?t=${Date.now()}` : '';

        // ATUALIZAR TÍTULO - Todos os campos relacionados ao título
        if (apiResult.title !== undefined) {
            const titleInput = itemEl.querySelector('.item-title-input');
            const displayTitle = itemEl.querySelector('.item-display-title');
            const moduleName = itemEl.querySelector('.module-name');

            // Para banners, o título está em um input visível (item-banner-name-input)
            if (itemType === 'banner') {
                const bannerNameInput = itemEl.querySelector('.item-banner-name-input');
                if (bannerNameInput) {
                    bannerNameInput.value = apiResult.title || '';
                }
            }

            // Atualizar campos padrão de título
            if (titleInput) titleInput.value = apiResult.title || '';
            if (displayTitle) {
                // Se for um input (como banner), atualizar value, senão textContent
                if (displayTitle.tagName === 'INPUT') {
                    displayTitle.value = apiResult.title || '';
                } else {
                    displayTitle.textContent = apiResult.title || '';
                }
            }
            if (moduleName) {
                moduleName.textContent = moduleListDisplayTitle({
                    title: apiResult.title,
                    item_type: itemType || apiResult.item_type
                });
            }
        }

        // ATUALIZAR IMAGEM - Todos os campos relacionados à imagem
        if (apiResult.image_url !== undefined) {
            const imageInput = itemEl.querySelector('.item-image-url-input');
            if (imageInput) {
                imageInput.value = apiResult.image_url || '';
            }

            // Atualizar previews/imagens visíveis com timestamp para evitar cache
            const thumbPreview = itemEl.querySelector('.banner-preview-thumb, .item-logo-preview, .item-image-preview, img[data-item-image]');
            if (thumbPreview) {
                if (apiResult.image_url) {
                    thumbPreview.src = imageUrlWithTimestamp;
                    thumbPreview.style.display = 'block';
                } else {
                    thumbPreview.style.display = 'none';
                }
            }

            // Para links, atualizar logo preview (múltiplos seletores possíveis)
            if (itemType === 'link') {
                const logoPreview = itemEl.querySelector('.link-logo-preview, .item-logo, .item-logo-preview');
                if (logoPreview) {
                    if (apiResult.image_url) {
                        if (logoPreview.tagName === 'IMG') {
                            logoPreview.src = imageUrlWithTimestamp;
                            logoPreview.style.display = 'block';
                        } else {
                            logoPreview.style.backgroundImage = `url('${imageUrlWithTimestamp}')`;
                            logoPreview.style.display = 'block';
                        }
                        // Esconder ícone se tiver logo
                        const iconPicker = itemEl.querySelector('.item-icon-picker');
                        if (iconPicker) iconPicker.style.display = 'none';
                    } else {
                        logoPreview.style.display = 'none';
                        // Mostrar ícone se não tiver logo
                        const iconPicker = itemEl.querySelector('.item-icon-picker');
                        if (iconPicker) iconPicker.style.display = 'inline-block';
                    }
                }
            }
        }

        // ATUALIZAR DESTINATION_URL - Todos os campos relacionados à URL de destino
        if (apiResult.destination_url !== undefined) {
            const destInput = itemEl.querySelector('.item-destination-url-input');
            const destDisplay = itemEl.querySelector('.item-display-dest');

            // Para banners, sanitizar destination_url (pode vir com URLs de imagem)
            let displayDest = apiResult.destination_url || '';
            if (itemType === 'banner') {
                const sanitizeBannerDest = (raw) => {
                    if (!raw || typeof raw !== 'string') return '';
                    if (raw.startsWith('[')) return '';
                    const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
                    const filtered = parts.filter(p => !p.includes('imagedelivery.net'));
                    return (filtered[0] || parts[0] || '').trim();
                };
                displayDest = sanitizeBannerDest(displayDest);
            }

            if (destInput) destInput.value = displayDest || '';
            if (destDisplay) {
                // Para carrossel, mostrar quantidade de imagens
                if (itemType === 'carousel' && displayDest && displayDest.startsWith('[')) {
                    try {
                        const images = JSON.parse(displayDest);
                        const realImages = images.filter(img => {
                            const url = typeof img === 'string' ? img : (img.image_url || img);
                            return url && !url.includes('placeholder') && !url.startsWith('data:image/svg');
                        });
                        destDisplay.textContent = `${realImages.length} imagem${realImages.length !== 1 ? 'ns' : ''}`;
                    } catch (e) {
                        destDisplay.textContent = displayDest || '#';
                    }
                } else if (itemType === 'wifi' && apiResult.destination_url && String(apiResult.destination_url).trim().startsWith('{')) {
                    try {
                        const cfg = JSON.parse(apiResult.destination_url);
                        const ssid = (cfg.ssid || '').trim();
                        const fmt = cfg.display_format === 'banner' ? 'banner' : 'button';
                        destDisplay.textContent = ssid ? `${fmt === 'banner' ? 'Banner' : 'Botão'} · Rede: ${ssid}` : 'Informe o nome da rede (SSID)';
                    } catch (e) {
                        destDisplay.textContent = displayDest || '#';
                    }
                } else {
                    destDisplay.textContent = displayDest || '#';
                }
            }
        }

        // ATUALIZAR CAMPOS ESPECÍFICOS POR TIPO DE MÓDULO
        if (itemType === 'banner') {
            // Atualizar whatsapp_message (mensagem do banner)
            if (apiResult.whatsapp_message !== undefined) {
                const whatsappHidden = itemEl.querySelector('.item-title-input-hidden');
                if (whatsappHidden) {
                    whatsappHidden.value = apiResult.whatsapp_message || '';
                }
            }
        }

        if (itemType === 'pix' || itemType === 'pix_qrcode') {
            // Atualizar campos específicos do PIX
            if (apiResult.pix_key !== undefined) {
                const pixKeyInput = itemEl.querySelector('.item-pix-key-input');
                const pixDisplayDest = itemEl.querySelector('.item-display-dest');
                if (pixKeyInput) pixKeyInput.value = apiResult.pix_key || '';
                if (pixDisplayDest) pixDisplayDest.textContent = apiResult.pix_key || 'Nenhuma chave configurada';
            }
            if (apiResult.recipient_name !== undefined) {
                const recipientInput = itemEl.querySelector('.item-recipient-name-input');
                if (recipientInput) recipientInput.value = apiResult.recipient_name || '';
            }
            if (apiResult.pix_amount !== undefined) {
                const amountInput = itemEl.querySelector('.item-pix-amount-input');
                if (amountInput) amountInput.value = apiResult.pix_amount || '';
            }
            if (apiResult.pix_description !== undefined) {
                const descInput = itemEl.querySelector('.item-pix-description-input');
                if (descInput) descInput.value = apiResult.pix_description || '';
            }
        }

        if (itemType === 'pdf' || itemType === 'pdf_embed') {
            // Atualizar campos específicos do PDF
            if (apiResult.pdf_url !== undefined) {
                const pdfUrlInput = itemEl.querySelector('.item-pdf-url-input');
                const pdfDisplayDest = itemEl.querySelector('.item-display-dest');
                if (pdfUrlInput) pdfUrlInput.value = apiResult.pdf_url || '';
                if (pdfDisplayDest) {
                    pdfDisplayDest.textContent = (apiResult.pdf_url && apiResult.pdf_url !== '#') ? 'Arquivo carregado' : 'Nenhum arquivo';
                }
            }
        }

        // ATUALIZAR ICON_CLASS (para links, PIX e outros que usam ícones)
        if (apiResult.icon_class !== undefined && (itemType === 'link' || itemType === 'pix' || itemType === 'pix_qrcode' || ['whatsapp', 'telegram', 'email', 'facebook', 'instagram', 'pinterest', 'reddit', 'tiktok', 'twitch', 'twitter', 'youtube', 'linkedin', 'portfolio', 'spotify'].includes(itemType))) {
            const iconElement = itemEl.querySelector('.item-icon, .module-icon, .item-icon-picker i, i[class*="fa-"]');
            if (iconElement && apiResult.icon_class) {
                iconElement.className = apiResult.icon_class;
            }
        }

        // ATUALIZAR LOGO_SIZE (para links)
        if (apiResult.logo_size !== undefined && itemType === 'link') {
            const logoSizeInput = itemEl.querySelector('.item-logo-size-input');
            if (logoSizeInput) {
                logoSizeInput.value = apiResult.logo_size || '24';
            }
            itemEl.dataset.logoSize = apiResult.logo_size || '24';
        }

        // ATUALIZAR ASPECT_RATIO (para banners e carousels)
        if (apiResult.aspect_ratio !== undefined && (itemType === 'banner' || itemType === 'carousel')) {
            itemEl.dataset.aspectRatio = apiResult.aspect_ratio || '';
            const aspectRatioIndicator = itemEl.querySelector('[data-aspect-ratio]');
            if (aspectRatioIndicator) {
                aspectRatioIndicator.dataset.aspectRatio = apiResult.aspect_ratio || '';
            }
        }

        // ATUALIZAR FORM_DATA (para digital_form)
        if (itemType === 'digital_form' && apiResult.form_data) {
            // Atualizar form_data no currentProfileData
            if (window.currentProfileData && window.currentProfileData.items) {
                const itemIndex = window.currentProfileData.items.findIndex(item => String(item.id) === String(itemId));
                if (itemIndex !== -1) {
                    window.currentProfileData.items[itemIndex].form_data = apiResult.form_data;
                }
            }
        }

        // ATUALIZAR originalData para manter sincronizado
        if (itemEl.dataset.originalData) {
            try {
                const originalData = JSON.parse(itemEl.dataset.originalData);
                Object.assign(originalData, apiResult);
                itemEl.dataset.originalData = JSON.stringify(originalData);
            } catch (e) {
                console.warn('Erro ao atualizar originalData:', e);
            }
        }

        // ATUALIZAR dados em currentProfileData se existir
        if (window.currentProfileData && window.currentProfileData.items) {
            const itemIndex = window.currentProfileData.items.findIndex(item => String(item.id) === String(itemId));
            if (itemIndex !== -1) {
                window.currentProfileData.items[itemIndex] = { ...window.currentProfileData.items[itemIndex], ...apiResult };
                __ckDashLog(`Dados do item ${itemId} atualizados em currentProfileData`);
            }
        }

        __ckDashLog(`Item ${itemId} atualizado na interface em tempo real (todos os campos visíveis)`);
    }

    // Função para sincronizar dados do modal para o item da lista antes de salvar
    function syncModalDataToItem() {
        const itemId = SELECTORS.editItemModal?.dataset.editingId;
        if (!itemId || !SELECTORS.editItemModal.classList.contains('active')) {
            return; // Modal não está aberto ou não há item sendo editado
        }

        const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
        if (!itemEl) return;

        const itemType = itemEl.dataset.itemType;

        __ckDashLog(` Sincronizando dados do modal para item ${itemId} (${itemType}) antes de salvar`);

        // Aplicar as mesmas atualizações que o botão "Salvar Alterações" do modal faz
        // IMPORTANTE: Usar querySelector com data-editing-id para pegar apenas o valor do modal deste item específico
        const newTitle = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`)?.value;
        if (newTitle !== undefined && itemEl.querySelector('.item-title-input')) {
            itemEl.querySelector('.item-title-input').value = newTitle;
            const disp = itemEl.querySelector('.item-display-title');
            const moduleName = itemEl.querySelector('.module-name');
            if (disp) disp.textContent = newTitle;
            if (moduleName) moduleName.textContent = newTitle;
        }

        // Para cada tipo de item, aplicar as atualizações específicas
        if (itemType === 'link') {
            // Atualizar título (apenas se o modal estiver aberto para este item específico)
            const linkTitleModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`)?.value;
            const linkTitleInput = itemEl.querySelector('.item-title-input');
            const linkModuleName = itemEl.querySelector('.module-name');
            const linkDisplayTitle = itemEl.querySelector('.item-display-title');
            if (linkTitleModal !== undefined) {
                if (linkTitleInput) linkTitleInput.value = linkTitleModal || 'Link Personalizado';
                if (linkModuleName) linkModuleName.textContent = linkTitleModal || 'Link Personalizado';
                if (linkDisplayTitle) linkDisplayTitle.textContent = linkTitleModal || 'Link Personalizado';
            }

            // Atualizar image_url
            const modalImageUrlInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-link-image-url`) ||
                document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .item-image-url-input`);
            const itemImageUrlInput = itemEl.querySelector('.item-image-url-input');
            if (modalImageUrlInput && itemImageUrlInput) {
                itemImageUrlInput.value = modalImageUrlInput.value || '';
            }

            // Atualizar logo_size
            const modalLogoSizeInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-logo-size-input-${itemId}`) ||
                document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .item-logo-size-input`);
            const itemLogoSizeInput = itemEl.querySelector('.item-logo-size-input');
            if (modalLogoSizeInput) {
                const logoSizeValue = modalLogoSizeInput.value || '24';
                if (itemLogoSizeInput) itemLogoSizeInput.value = logoSizeValue;
                itemEl.dataset.logoSize = logoSizeValue;
            }

            // Atualizar destination_url (apenas se o modal estiver aberto para este item específico)
            const newDestUrl = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url`)?.value || '';
            const destInput = itemEl.querySelector('.item-destination-url-input');
            const destDisplay = itemEl.querySelector('.item-display-dest');
            if (newDestUrl) {
                if (destInput) destInput.value = newDestUrl;
                if (destDisplay) destDisplay.textContent = newDestUrl || '#';
            }
        } else if (['whatsapp', 'telegram', 'email', 'facebook', 'instagram', 'pinterest', 'reddit', 'tiktok', 'twitch', 'twitter', 'youtube', 'linkedin', 'portfolio', 'spotify', 'instagram_embed', 'youtube_embed', 'tiktok_embed', 'spotify_embed', 'linkedin_embed', 'pinterest_embed'].includes(itemType)) {
            // Atualizar título (apenas se o modal estiver aberto para este item específico)
            const socialTitleModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`)?.value;
            const socialTitleInput = itemEl.querySelector('.item-title-input');
            const socialModuleName = itemEl.querySelector('.module-name');
            const socialDisplayTitle = itemEl.querySelector('.item-display-title');
            if (socialTitleModal !== undefined) {
                if (socialTitleInput) socialTitleInput.value = socialTitleModal;
                if (socialModuleName) socialModuleName.textContent = socialTitleModal;
                if (socialDisplayTitle) socialDisplayTitle.textContent = socialTitleModal;
            }

            // Atualizar destination_url (apenas se o modal estiver aberto para este item específico)
            const newDestUrl = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url`)?.value || '';
            const destInput = itemEl.querySelector('.item-destination-url-input');
            const destDisplay = itemEl.querySelector('.item-display-dest');
            if (newDestUrl) {
                if (destInput) destInput.value = newDestUrl;
                if (destDisplay) destDisplay.textContent = newDestUrl || '#';
            }
        } else if (itemType === 'carousel') {
            // Atualizar título do carrossel
            const carouselTitleModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`)?.value;
            const carouselTitleInput = itemEl.querySelector('.item-title-input');
            const carouselModuleName = itemEl.querySelector('.module-name');
            const carouselDisplayTitle = itemEl.querySelector('.item-display-title');
            if (carouselTitleModal !== undefined) {
                if (carouselTitleInput) carouselTitleInput.value = carouselTitleModal || 'Carrossel';
                if (carouselModuleName) carouselModuleName.textContent = carouselTitleModal || 'Carrossel';
                if (carouselDisplayTitle) carouselDisplayTitle.textContent = carouselTitleModal || 'Carrossel';
            }

            // Atualizar JSON de imagens do carrossel (do modal para o item da lista)
            const modalCarouselJsonInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .carousel-images-json-new`);
            const itemCarouselJsonInput = itemEl.querySelector('.carousel-images-json-new');
            if (modalCarouselJsonInput && itemCarouselJsonInput) {
                const modalJsonValue = modalCarouselJsonInput.value || '[]';
                itemCarouselJsonInput.value = modalJsonValue;

                // Atualizar também o image_url (primeira imagem)
                try {
                    const images = JSON.parse(modalJsonValue);
                    if (Array.isArray(images) && images.length > 0) {
                        const firstImg = typeof images[0] === 'string' ? images[0] : (images[0].image_url || images[0]);
                        const itemImageUrlInput = itemEl.querySelector('.item-image-url-input');
                        if (itemImageUrlInput) {
                            itemImageUrlInput.value = firstImg || '';
                        }

                        // Atualizar display para mostrar quantidade de imagens
                        const destDisplay = itemEl.querySelector('.item-display-dest');
                        if (destDisplay) {
                            const realImages = images.filter(img => {
                                const url = typeof img === 'string' ? img : (img.image_url || img);
                                return url && !url.includes('placeholder') && !url.startsWith('data:image/svg');
                            });
                            destDisplay.textContent = `${realImages.length} imagem${realImages.length !== 1 ? 'ns' : ''}`;
                        }
                    } else {
                        const itemImageUrlInput = itemEl.querySelector('.item-image-url-input');
                        if (itemImageUrlInput) {
                            itemImageUrlInput.value = '';
                        }
                        const destDisplay = itemEl.querySelector('.item-display-dest');
                        if (destDisplay) {
                            destDisplay.textContent = '0 imagens';
                        }
                    }
                } catch (e) {
                    console.error('Erro ao parsear JSON do carrossel:', e);
                }
            }

            // Atualizar aspect_ratio se houver
            const aspectRatioModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] input[name="aspect-ratio-selector"]:checked`)?.value;
            if (aspectRatioModal) {
                itemEl.dataset.aspectRatio = aspectRatioModal;
            }
        } else if (itemType === 'banner') {
            // Sincronizar dados do banner do modal para o item da lista
            const nameInputModal = document.getElementById('edit-banner-name');
            const destInputModal = document.getElementById('edit-dest-url');
            const msgInputModal = document.getElementById('edit-banner-title');
            const imageInputModal = document.getElementById('edit-image-url');

            const nameInputList = itemEl.querySelector('.item-banner-name-input');
            const destInputList = itemEl.querySelector('.item-destination-url-input');
            const msgHiddenList = itemEl.querySelector('.item-title-input-hidden');
            const imageInputList = itemEl.querySelector('.item-image-url-input');
            const thumbList = itemEl.querySelector('.banner-preview-thumb');
            const displayDest = itemEl.querySelector('.item-display-dest');

            const newName = nameInputModal?.value?.trim() || '';
            const newDest = destInputModal?.value?.trim() || '';
            const newMsg = msgInputModal?.value?.trim() || '';
            const newImg = imageInputModal?.value?.trim() || '';

            __ckDashLog(` [BANNER] Sincronizando imagem do modal para item ${itemId}:`, newImg);

            if (nameInputList) nameInputList.value = newName;
            if (destInputList) destInputList.value = newDest;
            if (msgHiddenList) msgHiddenList.value = newMsg;
            if (imageInputList) {
                imageInputList.value = newImg;
                __ckDashLog(`[BANNER] Campo .item-image-url-input atualizado na lista:`, newImg);
            }
            if (thumbList && newImg) {
                thumbList.src = newImg;
                thumbList.style.display = 'block';
            }
            const serializedDest = serializeBannerDestination(newDest, '', '');
            if (destInputList) destInputList.value = newDest;
            if (displayDest) {
                displayDest.textContent = bannerDestDisplayLabel(serializedDest);
            }

            // Atualizar originalData também
            try {
                const originalData = itemEl.dataset.originalData ? JSON.parse(itemEl.dataset.originalData) : {};
                originalData.image_url = newImg;
                originalData.destination_url = serializedDest;
                originalData.title = newName;
                originalData.whatsapp_message = newMsg;
                itemEl.dataset.originalData = JSON.stringify(originalData);
            } catch (e) {
                console.warn('Erro ao atualizar originalData do banner:', e);
            }

            // Atualizar aspect_ratio se houver
            const aspectRatioModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] input[name="aspect-ratio-selector"]:checked`)?.value;
            if (aspectRatioModal) {
                itemEl.dataset.aspectRatio = aspectRatioModal;
            }
        } else if (itemType === 'location') {
            const modal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"]`);
            if (!modal) return;
            const locTitle = modal.querySelector('#edit-title')?.value?.trim() || 'Localização';
            const locAddr = modal.querySelector('#location-address-input')?.value?.trim() || '';
            const locFormatted = modal.querySelector('.location-formatted-display')?.textContent?.trim() || locAddr;
            const locLat = modal.querySelector('.location-lat-input')?.value?.trim() || '';
            const locLng = modal.querySelector('.location-lng-input')?.value?.trim() || '';
            const titleInput = itemEl.querySelector('.item-title-input');
            const displayTitle = itemEl.querySelector('.item-display-title');
            const moduleName = itemEl.querySelector('.module-name');
            const displayDest = itemEl.querySelector('.item-display-dest');
            if (titleInput) titleInput.value = locTitle;
            if (displayTitle) displayTitle.textContent = locTitle;
            if (moduleName) moduleName.textContent = locTitle;
            if (displayDest) displayDest.textContent = locFormatted || locAddr || 'Endereço não definido';
            const listAddrInput = itemEl.querySelector('.location-address-input');
            const listLatInput = itemEl.querySelector('.location-lat-input');
            const listLngInput = itemEl.querySelector('.location-lng-input');
            const listFormattedP = itemEl.querySelector('.location-formatted-display');
            if (listAddrInput) listAddrInput.value = locAddr;
            if (listLatInput) listLatInput.value = locLat;
            if (listLngInput) listLngInput.value = locLng;
            if (listFormattedP) listFormattedP.textContent = locFormatted;
            if (locLat && locLng) {
                var listIframe = itemEl.querySelector('#location-map-iframe-' + itemId);
                var listPlaceholder = itemEl.querySelector('.location-map-placeholder');
                if (listIframe) {
                    var latNum = parseFloat(locLat);
                    var lngNum = parseFloat(locLng);
                    var delta = 0.005;
                    var bbox = (lngNum - delta) + ',' + (latNum - delta) + ',' + (lngNum + delta) + ',' + (latNum + delta);
                    listIframe.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' + encodeURIComponent(bbox) + '&layer=mapnik&marker=' + encodeURIComponent(latNum + ',' + lngNum);
                }
                if (listPlaceholder) listPlaceholder.style.display = 'none';
            }
            const payload = { address: locAddr, address_formatted: locFormatted, latitude: locLat ? parseFloat(locLat) : null, longitude: locLng ? parseFloat(locLng) : null, place_name: locTitle };
            fetch('/api/location/config/' + itemId, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(payload)
            }).then(function (r) {
                if (r.ok && window.currentProfileData && window.currentProfileData.items) {
                    const item = window.currentProfileData.items.find(function (i) { return String(i.id) === String(itemId); });
                    if (item) {
                        item.location_data = item.location_data || {};
                        item.location_data.address = payload.address;
                        item.location_data.address_formatted = payload.address_formatted;
                        item.location_data.latitude = payload.latitude;
                        item.location_data.longitude = payload.longitude;
                        item.location_data.place_name = payload.place_name;
                    }
                }
            }).catch(function (err) { console.warn('Erro ao salvar localização:', err); });
        } else if (itemType === 'pix' || itemType === 'pix_qrcode') {
            // Sincronizar dados do PIX/PIX QR Code do modal para o item da lista
            const pixTitleModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`)?.value;
            const pixRecipientModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-recipient-name`)?.value;
            const pixKeyModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-pix-key`)?.value;
            const pixAmountModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-pix-amount`)?.value;
            const pixDescriptionModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-pix-description`)?.value;

            const pixTitleInput = itemEl.querySelector('.item-title-input');
            const pixRecipientInput = itemEl.querySelector('.item-recipient-name-input');
            const pixKeyInput = itemEl.querySelector('.item-pix-key-input');
            const pixAmountInput = itemEl.querySelector('.item-pix-amount-input');
            const pixDescriptionInput = itemEl.querySelector('.item-pix-description-input');
            const pixDisplayTitle = itemEl.querySelector('.item-display-title');
            const pixDisplayDest = itemEl.querySelector('.item-display-dest');
            const pixModuleName = itemEl.querySelector('.module-name');

            if (pixTitleModal !== undefined) {
                if (pixTitleInput) pixTitleInput.value = pixTitleModal;
                if (pixDisplayTitle) pixDisplayTitle.textContent = pixTitleModal;
                if (pixModuleName) pixModuleName.textContent = pixTitleModal;
            }
            if (pixRecipientModal !== undefined && pixRecipientInput) {
                pixRecipientInput.value = pixRecipientModal;
            }
            if (pixKeyModal !== undefined) {
                if (pixKeyInput) pixKeyInput.value = pixKeyModal;
                if (pixDisplayDest) pixDisplayDest.textContent = pixKeyModal || 'Nenhuma chave configurada';
            }
            if (pixAmountModal !== undefined && pixAmountInput) {
                pixAmountInput.value = pixAmountModal;
            }
            if (pixDescriptionModal !== undefined && pixDescriptionInput) {
                pixDescriptionInput.value = pixDescriptionModal;
            }
        } else if (itemType === 'wifi') {
            const modal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"]`);
            if (!modal) return;
            const titleModal = modal.querySelector('#edit-title')?.value;
            const ssidModal = modal.querySelector('#edit-wifi-ssid')?.value;
            const passModal = modal.querySelector('#edit-wifi-password')?.value;
            const secModal = modal.querySelector('#edit-wifi-security')?.value;
            const hiddenModal = modal.querySelector('#edit-wifi-hidden')?.checked;
            const bannerModal = modal.querySelector('#edit-wifi-banner-url')?.value;
            const logoModal = modal.querySelector('#edit-wifi-logo-url')?.value;
            const logoSizeModal = modal.querySelector('#edit-wifi-logo-size')?.value;
            const fmtModal = modal.querySelector('.wifi-display-format-input:checked')?.value || 'button';
            const titleInput = itemEl.querySelector('.item-title-input');
            const displayTitle = itemEl.querySelector('.item-display-title');
            const moduleName = itemEl.querySelector('.module-name');
            if (titleModal !== undefined && titleInput) {
                titleInput.value = titleModal;
                if (displayTitle) displayTitle.textContent = titleModal;
                if (moduleName) moduleName.textContent = titleModal;
            }
            if (ssidModal !== undefined && itemEl.querySelector('.wifi-ssid-input')) {
                itemEl.querySelector('.wifi-ssid-input').value = ssidModal;
            }
            if (passModal !== undefined && itemEl.querySelector('.wifi-password-input')) {
                itemEl.querySelector('.wifi-password-input').value = passModal;
            }
            if (secModal !== undefined && itemEl.querySelector('.wifi-security-input')) {
                itemEl.querySelector('.wifi-security-input').value = secModal;
            }
            const hidList = itemEl.querySelector('.wifi-hidden-input');
            if (hidList) hidList.checked = !!hiddenModal;
            if (bannerModal !== undefined && itemEl.querySelector('.wifi-banner-url-input')) {
                itemEl.querySelector('.wifi-banner-url-input').value = bannerModal;
                const bp = itemEl.querySelector('.wifi-banner-preview');
                const bt = itemEl.querySelector('.banner-preview-thumb');
                if (bannerModal && bp) {
                    bp.src = bannerModal;
                    bp.style.display = 'block';
                }
                if (bannerModal && bt) {
                    bt.src = bannerModal;
                    bt.style.display = 'block';
                }
            }
            if (logoModal !== undefined && itemEl.querySelector('.wifi-logo-url-input')) {
                itemEl.querySelector('.wifi-logo-url-input').value = logoModal;
                const lp = itemEl.querySelector('.wifi-logo-preview');
                if (logoModal && lp) {
                    lp.src = logoModal;
                    lp.style.display = 'block';
                }
            }
            if (logoSizeModal !== undefined && itemEl.querySelector('.wifi-logo-size-input')) {
                itemEl.querySelector('.wifi-logo-size-input').value = logoSizeModal;
                itemEl.dataset.logoSize = logoSizeModal;
            }
            itemEl.querySelectorAll('.wifi-display-format-input').forEach(r => {
                r.checked = r.value === fmtModal;
            });
            const logoSec = itemEl.querySelector('.wifi-logo-section');
            const banSec = itemEl.querySelector('.wifi-banner-section');
            if (logoSec) logoSec.style.display = fmtModal === 'banner' ? 'none' : 'block';
            if (banSec) banSec.style.display = fmtModal === 'banner' ? 'block' : 'none';

            const ssid = (itemEl.querySelector('.wifi-ssid-input')?.value || '').trim();
            const displayDest = itemEl.querySelector('.item-display-dest');
            if (displayDest) {
                displayDest.textContent = ssid ? `${fmtModal === 'banner' ? 'Banner' : 'Botão'} · Rede: ${ssid}` : 'Informe o nome da rede (SSID)';
            }
        } else if (itemType === 'digital_form') {
            // Sincronizar dados do formulário digital do modal para o item da lista
            const formTitleModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-digital-form-title`)?.value;
            const formTitleInput = itemEl.querySelector('.item-title-input');
            const formDisplayTitle = itemEl.querySelector('.item-display-title');
            const formModuleName = itemEl.querySelector('.module-name');

            if (formTitleModal !== undefined) {
                if (formTitleInput) formTitleInput.value = formTitleModal;
                if (formDisplayTitle) formDisplayTitle.textContent = formTitleModal;
                if (formModuleName) formModuleName.textContent = formTitleModal;
            }

            // Sincronizar outros campos (campos do formulário são salvos no servidor, não localmente)
            // Os campos principais já estão sincronizados acima
        }

        __ckDashLog(`Dados sincronizados do modal para item ${itemId}`);
    }

    if (window.DashboardCore) {
        window.DashboardCore.syncModalDataToItem = syncModalDataToItem;
    }
    window.syncModalDataToItem = syncModalDataToItem;

    // ============================================
    // FUNÇÕES ESPECÍFICAS PARA CADA TIPO DE MÓDULO
    // ============================================

    // Salvar banner usando rota específica
    async function saveBannerItem(itemId) {
        __ckDashLog(`Salvando banner ${itemId} via rota específica...`);
        // Atualizar HEADERS antes de fazer a requisição
        HEADERS = getHeaders();
        const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
        if (!itemEl) {
            console.error(`O Item ${itemId} não encontrado para salvar banner.`);
            return;
        }

        // Se o item ainda é temporário (temp_...), precisamos criar no servidor antes de salvar via rota específica
        async function ensureServerIdForTempItem(el) {
            const currentId = String(el?.dataset?.id || '');
            if (!currentId || !currentId.startsWith('temp_')) return currentId;

            const itemType = el.dataset.itemType || 'banner';
            console.warn(`[BANNER] Item ${currentId} ainda é temporário. Criando no servidor antes de salvar...`);

            // Capturar dados mínimos do item
            let destinationUrl = el.querySelector('.item-destination-url-input')?.value || (itemType === 'whatsapp' ? '' : '#');
            if (itemType === 'whatsapp' && destinationUrl) destinationUrl = destinationUrl.replace(/\D/g, '');

            const tempItemData = {
                item_type: itemType,
                title: el.querySelector('.item-title-input')?.value || (typeof getItemTypeName === 'function' ? getItemTypeName(itemType) : 'Banner'),
                destination_url: destinationUrl,
                image_url: el.querySelector('.item-image-url-input')?.value || null,
                aspect_ratio: el.dataset.aspectRatio || 'tarja',
                icon_class: el.querySelector('.item-icon-picker i')?.className || (typeof getDefaultIcon === 'function' ? getDefaultIcon(itemType) : 'fas fa-image'),
                is_active: el.querySelector('.module-toggle-input')?.checked !== false,
                display_order: parseInt(el.dataset.displayOrder, 10) || 1
            };

            // Criar no servidor e trocar o ID no DOM/estado
            const createResponse = await fetch(`${API_URL}/api/profile/items`, {
                method: 'POST',
                headers: HEADERS,
                body: JSON.stringify(tempItemData)
            });
            if (!createResponse.ok) {
                const errorData = await createResponse.json().catch(() => ({}));
                throw new Error(errorData.message || `Erro ${createResponse.status} ao criar o banner no servidor`);
            }

            const createdItem = await createResponse.json();
            const newId = String(createdItem.id);

            // Atualizar o elemento do item
            el.dataset.id = newId;
            el.setAttribute('data-id', newId);
            delete el.dataset.isUnsaved;
            if (el.hasAttribute('data-is-temporary')) el.removeAttribute('data-is-temporary');
            if (el.dataset.isTemporary) delete el.dataset.isTemporary;

            // Atualizar modal (data-editing-id) para o novo ID
            const modal = document.querySelector(`#edit-item-modal[data-editing-id="${currentId}"]`);
            if (modal) modal.setAttribute('data-editing-id', newId);

            // Atualizar botões/atributos que guardam o itemId
            document.querySelectorAll(`[data-item-id="${currentId}"]`).forEach(node => {
                node.setAttribute('data-item-id', newId);
            });

            // Atualizar cache local
            if (window.currentProfileData && Array.isArray(window.currentProfileData.items)) {
                const idx = window.currentProfileData.items.findIndex(it => String(it.id) === currentId);
                if (idx !== -1) window.currentProfileData.items[idx] = createdItem;
            }

            __ckDashLog(`[BANNER] Item temporário ${currentId} criado no servidor com ID ${newId}`);
            return newId;
        }

        let realItemId = String(itemId);
        if (realItemId.startsWith('temp_') || itemEl.dataset.isUnsaved === 'true' || itemEl.dataset.isTemporary === 'true') {
            realItemId = await ensureServerIdForTempItem(itemEl);
        }

        const nameInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${realItemId}"] #edit-banner-name`);
        const destInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${realItemId}"] #edit-dest-url`);
        const whatsappInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${realItemId}"] #edit-banner-title`);
        const aspectRatioInput = document.querySelector(`#edit-item-modal[data-editing-id="${realItemId}"] input[name="aspect-ratio-selector"]:checked`);

        // CAPTURAR image_url DE MLTIPLAS FONTES (prioridade: modal > preview > lista > originalData)
        let imageUrl = null;

        // 1. Tentar pegar do campo hidden do modal
        let imageInputModal = document.getElementById('edit-image-url');
        if (!imageInputModal) {
            imageInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-image-url`);
        }
        if (!imageInputModal) {
            imageInputModal = SELECTORS.editModalBody?.querySelector('#edit-image-url');
        }
        if (!imageInputModal) {
            imageInputModal = document.querySelector('#edit-item-modal #edit-image-url');
        }

        if (imageInputModal && imageInputModal.value && imageInputModal.value.trim()) {
            const modalValue = imageInputModal.value.trim();
            if (modalValue && !modalValue.includes('placeholder') && !modalValue.startsWith('data:image/svg')) {
                imageUrl = modalValue;
                __ckDashLog(`[BANNER] Image URL capturado do campo #edit-image-url do modal:`, imageUrl);
            }
        }

        // 2. Se não encontrou no campo, tentar pegar do preview do modal
        if (!imageUrl) {
            const bannerPreview = document.getElementById('edit-banner-preview');
            if (bannerPreview && bannerPreview.src && !bannerPreview.src.includes('placeholder') && !bannerPreview.src.startsWith('data:image/svg')) {
                imageUrl = bannerPreview.src;
                __ckDashLog(`[BANNER] Image URL capturado do preview #edit-banner-preview:`, imageUrl);
            }
        }

        // 3. Se ainda não encontrou, tentar pegar do campo da lista
        if (!imageUrl) {
            const listImageInput = itemEl.querySelector('.item-image-url-input');
            if (listImageInput && listImageInput.value && listImageInput.value.trim()) {
                const listValue = listImageInput.value.trim();
                if (listValue && !listValue.includes('placeholder') && !listValue.startsWith('data:image/svg')) {
                    imageUrl = listValue;
                    __ckDashLog(`[BANNER] Image URL capturado do campo .item-image-url-input da lista:`, imageUrl);
                }
            }
        }

        // 4. Se ainda não encontrou, tentar pegar do preview da lista
        if (!imageUrl) {
            const thumbPreview = itemEl.querySelector('.banner-preview-thumb');
            if (thumbPreview && thumbPreview.src && !thumbPreview.src.includes('placeholder') && !thumbPreview.src.startsWith('data:image/svg')) {
                imageUrl = thumbPreview.src;
                __ckDashLog(`[BANNER] Image URL capturado do preview .banner-preview-thumb da lista:`, imageUrl);
            }
        }

        // 5. Se ainda não encontrou, tentar pegar do originalData
        if (!imageUrl && itemEl.dataset.originalData) {
            try {
                const originalData = JSON.parse(itemEl.dataset.originalData);
                if (originalData.image_url && !originalData.image_url.includes('placeholder') && !originalData.image_url.startsWith('data:image/svg')) {
                    imageUrl = originalData.image_url.trim();
                    __ckDashLog(`[BANNER] Image URL capturado do originalData:`, imageUrl);
                }
            } catch (e) {
                console.warn('Erro ao parsear originalData:', e);
            }
        }

        // Log detalhado de todas as tentativas
        __ckDashLog(`[BANNER] Resumo da captura de image_url para item ${realItemId}:`, {
            campoModal: imageInputModal?.value || 'não encontrado',
            previewModal: document.getElementById('edit-banner-preview')?.src || 'não encontrado',
            campoLista: itemEl.querySelector('.item-image-url-input')?.value || 'não encontrado',
            previewLista: itemEl.querySelector('.banner-preview-thumb')?.src || 'não encontrado',
            originalData: itemEl.dataset.originalData ? 'presente' : 'ausente',
            imageUrlFinal: imageUrl || 'NÃO ENCONTRADO'
        });

        const updateData = {
            title: nameInputModal?.value?.trim() || null,
            destination_url: destInputModal?.value?.trim() || null,
            whatsapp_message: whatsappInputModal?.value?.trim() || null,
            image_url: imageUrl || null,
            aspect_ratio: aspectRatioInput?.value || 'tarja',
            is_active: itemEl.dataset.isActive !== 'false',
            display_order: parseInt(itemEl.dataset.displayOrder, 10)
        };

        // NÃO filtrar image_url - sempre enviar mesmo se null para garantir que seja salvo
        // Filtrar apenas outros valores nulos ou vazios
        const finalUpdateData = {};
        for (const key in updateData) {
            if (key === 'image_url') {
                // Para image_url, sempre incluir (mesmo se null)
                finalUpdateData[key] = updateData[key];
            } else if (updateData[key] !== null && updateData[key] !== '') {
                finalUpdateData[key] = updateData[key];
            }
        }

        __ckDashLog(`[BANNER] image_url FINAL que será enviado:`, finalUpdateData.image_url || 'null');
        __ckDashLog(`[BANNER] Dados completos para rota específica:`, finalUpdateData);

        try {
            const response = await fetch(`${API_URL}/api/profile/items/banner/${realItemId}`, {
                method: 'PUT',
                headers: HEADERS,
                body: JSON.stringify(finalUpdateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao salvar banner.');
            }

            const result = await response.json();
            __ckDashLog(`Banner ${realItemId} salvo com sucesso via rota específica.`);
            __ckDashLog(`[BANNER] image_url salvo no banco:`, result.image_url ? result.image_url.substring(0, 50) + '...' : 'null');

            // Atualizar item na lista usando dados retornados pela API (em tempo real)
            await updateItemFromApiResponse(realItemId, result, 'banner');

            __ckDashLog(`Banner ${realItemId} salvo e interface atualizada em tempo real`);
        } catch (error) {
            console.error(`Erro ao salvar banner ${realItemId} via rota específica:`, error);
            throw error;
        }
    }

    // Salvar link personalizado usando rota específica
    async function saveLinkItem(itemId) {
        __ckDashLog(`Salvando link ${itemId} via rota específica...`);
        // Atualizar HEADERS antes de fazer a requisição
        HEADERS = getHeaders();
        const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
        if (!itemEl) {
            console.error(`O Item ${itemId} não encontrado para salvar link.`);
            return;
        }

        const titleInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`);
        const destInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url`);
        const imageInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-image-url`);
        const logoSizeInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-logo-size-input-${itemId}`);
        const iconPicker = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .item-icon-picker i`);

        const updateData = {
            title: titleInputModal?.value?.trim() || null,
            destination_url: destInputModal?.value?.trim() || null,
            image_url: imageInputModal?.value?.trim() || null,
            icon_class: iconPicker?.className?.trim() || null,
            logo_size: logoSizeInputModal ? parseInt(logoSizeInputModal.value) || 24 : null,
            is_active: itemEl.dataset.isActive !== 'false',
            display_order: parseInt(itemEl.dataset.displayOrder, 10)
        };

        // Filtrar valores nulos ou vazios
        for (const key in updateData) {
            if (updateData[key] === null || updateData[key] === '') {
                delete updateData[key];
            }
        }

        __ckDashLog(`Dados para rota específica do link:`, updateData);

        try {
            const response = await fetch(`${API_URL}/api/profile/items/link/${itemId}`, {
                method: 'PUT',
                headers: HEADERS,
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao salvar link.');
            }

            const result = await response.json();
            __ckDashLog(`Link ${itemId} salvo com sucesso via rota específica.`);

            // Atualizar item na lista usando dados retornados pela API (em tempo real)
            await updateItemFromApiResponse(itemId, result, 'link');

            __ckDashLog(`Link ${itemId} salvo e interface atualizada em tempo real`);
        } catch (error) {
            console.error(`Erro ao salvar link ${itemId} via rota específica:`, error);
            throw error;
        }
    }

    // Salvar carousel usando rota específica
    async function saveCarouselItem(itemId) {
        __ckDashLog(`Salvando carousel ${itemId} via rota específica...`);
        // Atualizar HEADERS antes de fazer a requisição
        HEADERS = getHeaders();
        const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
        if (!itemEl) {
            console.error(`O Item ${itemId} não encontrado para salvar carousel.`);
            return;
        }

        const titleInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`);
        const destInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url`);
        const imageInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-image-url`);
        const aspectRatioInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] input[name="aspect-ratio-selector"]:checked`);

        const updateData = {
            title: titleInputModal?.value?.trim() || null,
            destination_url: destInputModal?.value?.trim() || null,
            image_url: imageInputModal?.value?.trim() || null,
            aspect_ratio: aspectRatioInput?.value || 'quadrado',
            is_active: itemEl.dataset.isActive !== 'false',
            display_order: parseInt(itemEl.dataset.displayOrder, 10)
        };

        // Filtrar valores nulos ou vazios
        for (const key in updateData) {
            if (updateData[key] === null || updateData[key] === '') {
                delete updateData[key];
            }
        }

        __ckDashLog(`Dados para rota específica do carousel:`, updateData);

        try {
            const response = await fetch(`${API_URL}/api/profile/items/carousel/${itemId}`, {
                method: 'PUT',
                headers: HEADERS,
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao salvar carousel.');
            }

            const result = await response.json();
            __ckDashLog(`Carousel ${itemId} salvo com sucesso via rota específica.`);

            // Atualizar item na lista usando dados retornados pela API (em tempo real)
            await updateItemFromApiResponse(itemId, result, 'carousel');

            __ckDashLog(`Carousel ${itemId} salvo e interface atualizada em tempo real`);
        } catch (error) {
            console.error(`Erro ao salvar carousel ${itemId} via rota específica:`, error);
            throw error;
        }
    }

    // Salvar PIX usando rota específica
    async function savePixItem(itemId) {
        __ckDashLog(`Salvando PIX ${itemId} via rota específica...`);
        // Atualizar HEADERS antes de fazer a requisição
        HEADERS = getHeaders();
        const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
        if (!itemEl) {
            console.error(`O Item ${itemId} não encontrado para salvar PIX.`);
            return;
        }

        const titleInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`);
        const pixKeyInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-pix-key`);
        const recipientNameInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-recipient-name`);
        const pixAmountInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-pix-amount`);
        const pixDescriptionInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-pix-description`);
        const iconPicker = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .item-icon-picker i`);

        const updateData = {
            title: titleInputModal?.value?.trim() || null,
            pix_key: pixKeyInputModal?.value?.trim() || null,
            recipient_name: recipientNameInputModal?.value?.trim() || null,
            pix_amount: pixAmountInputModal?.value ? parseFloat(pixAmountInputModal.value) : null,
            pix_description: pixDescriptionInputModal?.value?.trim() || null,
            icon_class: iconPicker?.className?.trim() || null,
            is_active: itemEl.dataset.isActive !== 'false',
            display_order: parseInt(itemEl.dataset.displayOrder, 10)
        };

        // Filtrar valores nulos ou vazios
        for (const key in updateData) {
            if (updateData[key] === null || updateData[key] === '') {
                delete updateData[key];
            }
        }

        __ckDashLog(`Dados para rota específica do PIX:`, updateData);

        try {
            const response = await fetch(`${API_URL}/api/profile/items/pix/${itemId}`, {
                method: 'PUT',
                headers: HEADERS,
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao salvar PIX.');
            }

            const result = await response.json();
            __ckDashLog(`PIX ${itemId} salvo com sucesso via rota específica.`);

            // Atualizar item na lista usando dados retornados pela API (em tempo real)
            await updateItemFromApiResponse(itemId, result, 'pix');

            __ckDashLog(`PIX ${itemId} salvo e interface atualizada em tempo real`);
        } catch (error) {
            console.error(`Erro ao salvar PIX ${itemId} via rota específica:`, error);
            throw error;
        }
    }

    // Salvar PDF usando rota específica
    async function savePdfItem(itemId) {
        __ckDashLog(`Salvando PDF ${itemId} via rota específica...`);
        // Atualizar HEADERS antes de fazer a requisição
        HEADERS = getHeaders();
        const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
        if (!itemEl) {
            console.error(`O Item ${itemId} não encontrado para salvar PDF.`);
            return;
        }

        const titleInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`);
        const pdfUrlInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-pdf-url`);
        const destInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url`);

        const updateData = {
            title: titleInputModal?.value?.trim() || null,
            pdf_url: pdfUrlInputModal?.value?.trim() || null,
            destination_url: destInputModal?.value?.trim() || null,
            is_active: itemEl.dataset.isActive !== 'false',
            display_order: parseInt(itemEl.dataset.displayOrder, 10)
        };

        // Filtrar valores nulos ou vazios
        for (const key in updateData) {
            if (updateData[key] === null || updateData[key] === '') {
                delete updateData[key];
            }
        }

        __ckDashLog(`Dados para rota específica do PDF:`, updateData);

        try {
            const response = await fetch(`${API_URL}/api/profile/items/pdf/${itemId}`, {
                method: 'PUT',
                headers: HEADERS,
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao salvar PDF.');
            }

            const result = await response.json();
            __ckDashLog(`PDF ${itemId} salvo com sucesso via rota específica.`);

            // Atualizar item na lista usando dados retornados pela API (em tempo real)
            await updateItemFromApiResponse(itemId, result, 'pdf');

            __ckDashLog(`PDF ${itemId} salvo e interface atualizada em tempo real`);
        } catch (error) {
            console.error(`Erro ao salvar PDF ${itemId} via rota específica:`, error);
            throw error;
        }
    }

    // Salvar Formulário King usando rota específica
    async function saveDigitalFormItem(itemId) {
        __ckDashLog(`Salvando Formulário King ${itemId} via rota específica...`);
        HEADERS = getHeaders();
        const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
        if (!itemEl) {
            console.error(`O Item ${itemId} não encontrado para salvar formulário digital.`);
            return;
        }

        // Capturar dados do modal
        const titleInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-digital-form-title`);
        const formTitleInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-form-title`);
        const formLogoInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-form-logo-url`);
        const formDescriptionInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-form-description`);
        const whatsappInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-digital-form-whatsapp`);
        const displayFormatInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] input[name="digital-form-display-format"]:checked`);
        const bannerImageInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-digital-form-banner-image`);
        const headerImageInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-digital-form-header-image`);
        const backgroundImageInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-digital-form-background-image`);
        const backgroundOpacityInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-digital-form-background-opacity`);
        const themeInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-digital-form-theme`);
        const primaryColorInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-digital-form-primary-color`);
        const textColorInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-digital-form-text-color`);

        // Capturar campos do formulário (form_fields JSON)
        let formFields = [];
        try {
            const formFieldsInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-digital-form-fields`);
            if (formFieldsInput && formFieldsInput.value) {
                formFields = JSON.parse(formFieldsInput.value);
            }
        } catch (e) {
            console.warn('Erro ao parsear form_fields:', e);
            formFields = [];
        }

        const updateData = {
            title: titleInput?.value?.trim() || null,
            form_title: formTitleInput?.value?.trim() || null,
            form_logo_url: formLogoInput?.value?.trim() || null,
            form_description: formDescriptionInput?.value?.trim() || null,
            whatsapp_number: whatsappInput?.value?.trim() || null,
            display_format: displayFormatInput?.value || 'button',
            banner_image_url: bannerImageInput?.value?.trim() || null,
            header_image_url: headerImageInput?.value?.trim() || null,
            background_image_url: backgroundImageInput?.value?.trim() || null,
            background_opacity: backgroundOpacityInput ? parseFloat(backgroundOpacityInput.value) : undefined,
            theme: themeInput?.value || 'light',
            primary_color: primaryColorInput?.value || '#4A90E2',
            text_color: textColorInput?.value || '#333333',
            form_fields: formFields.length > 0 ? formFields : undefined,
            is_active: itemEl.dataset.isActive !== 'false',
            display_order: parseInt(itemEl.dataset.displayOrder, 10)
        };

        // Para banner_format, também atualizar image_url no profile_items
        if (updateData.display_format === 'banner' && updateData.banner_image_url) {
            updateData.image_url = updateData.banner_image_url;
        }

        __ckDashLog(`Dados para rota específica do Formulário King:`, updateData);

        try {
            const response = await fetch(`${API_URL}/api/profile/items/digital_form/${itemId}`, {
                method: 'PUT',
                headers: HEADERS,
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao salvar Formulário King.');
            }

            const result = await response.json();
            __ckDashLog(`Formulário King ${itemId} salvo com sucesso via rota específica.`);

            // Atualizar item na lista usando dados retornados pela API (em tempo real)
            await updateItemFromApiResponse(itemId, result, 'digital_form');

            __ckDashLog(`Formulário King ${itemId} salvo e interface atualizada em tempo real`);
        } catch (error) {
            console.error(`Erro ao salvar Formulário King ${itemId} via rota específica:`, error);
            throw error;
        }
    }


    // Save + Sortable: js/dashboard-save.js + js/dashboard-sortable.js
    async function saveAllChanges(event) {
        if (window.DashboardSave && typeof window.DashboardSave.saveAllChanges === 'function') {
            return window.DashboardSave.saveAllChanges(event);
        }
        if (typeof window.saveAllChanges === 'function' && window.saveAllChanges !== saveAllChanges) {
            return window.saveAllChanges(event);
        }
    }
    async function saveItemOrder(itemsOrder) {
        if (window.DashboardSortable && typeof window.DashboardSortable.saveItemOrder === 'function') {
            return window.DashboardSortable.saveItemOrder(itemsOrder);
        }
    }
    function initSortable() {
        if (window.DashboardSortable && typeof window.DashboardSortable.initSortable === 'function') {
            return window.DashboardSortable.initSortable();
        }
    }
    function setupMoveButtons() {
        if (window.DashboardSortable && typeof window.DashboardSortable.setupMoveButtons === 'function') {
            return window.DashboardSortable.setupMoveButtons();
        }
    }
    window.saveAllChanges = saveAllChanges;
    window.saveItemOrder = saveItemOrder;
    window.initSortable = initSortable;
    window.setupMoveButtons = setupMoveButtons;
    if (window.DashboardCore) {
        window.DashboardCore.initSortable = initSortable;
        window.DashboardCore.setupMoveButtons = setupMoveButtons;
        window.DashboardCore.saveItemOrder = saveItemOrder;
        window.DashboardCore.saveAllChanges = saveAllChanges;
    }



    // QR: js/dashboard-qr.js
    function generateQRCode() {
        if (window.DashboardQR && typeof window.DashboardQR.generateQRCode === 'function') {
            return window.DashboardQR.generateQRCode();
        }
    }
    function getShareQrMeta() {
        if (window.DashboardQR && typeof window.DashboardQR.getShareQrMeta === 'function') {
            return window.DashboardQR.getShareQrMeta();
        }
        return { userUrl: '', slug: '', name: '', logoUrl: '' };
    }
    async function composeShareQrArt() {
        if (window.DashboardQR && typeof window.DashboardQR.composeShareQrArt === 'function') {
            return window.DashboardQR.composeShareQrArt();
        }
    }
    window.generateQRCode = generateQRCode;

    // Assinatura: js/dashboard-assinatura.js
    async function loadSubscriptionInfo() {
        if (window.DashboardAssinatura && typeof window.DashboardAssinatura.loadSubscriptionInfo === 'function') {
            return window.DashboardAssinatura.loadSubscriptionInfo();
        }
    }
    window.loadSubscriptionInfo = loadSubscriptionInfo;

    function getDefaultIcon(itemType) {
        const defaultIcons = {
            'whatsapp': 'fab fa-whatsapp',
            'telegram': 'fab fa-telegram',
            'email': 'fas fa-envelope',
            'pix': 'fa-solid fa-copy',
            'pix_qrcode': 'fas fa-qrcode',
            'wifi': 'fas fa-wifi',
            'facebook': 'fab fa-facebook',
            'instagram': 'fab fa-instagram',
            'tiktok': 'fab fa-tiktok',
            'twitter': 'fab fa-twitter',
            'youtube': 'fab fa-youtube',
            'spotify': 'fab fa-spotify',
            'linkedin': 'fab fa-linkedin',
            'pinterest': 'fab fa-pinterest',
            'portfolio': 'fas fa-briefcase',
            'banner': 'fas fa-image',
            'texto_com_botao': 'fas fa-font',
            'banner_carousel': 'fas fa-images',
            'instagram_embed': 'fab fa-instagram',
            'youtube_embed': 'fab fa-youtube',
            'tiktok_embed': 'fab fa-tiktok',
            'spotify_embed': 'fab fa-spotify',
            'linkedin_embed': 'fab fa-linkedin',
            'pinterest_embed': 'fab fa-pinterest',
            'sales_page': 'fas fa-store',
            'digital_form': 'fas fa-file-signature',
            'convite': 'fas fa-envelope-open-text',

            'king_selection': 'fas fa-images',
            'bible': 'fas fa-bible',
            'location': 'fas fa-map-marker-alt'
        };
        return defaultIcons[itemType] || 'fas fa-link';
    }

    if (window.DashboardCore) window.DashboardCore.getDefaultIcon = getDefaultIcon;

    // Função para obter nome amigável do tipo de item
    function getItemTypeName(itemType) {
        const names = {
            'link': 'Link Personalizado',
            'whatsapp': 'WhatsApp',
            'telegram': 'Telegram',
            'email': 'Email',
            'pix': 'PIX (Copia e Cola)',
            'pix_qrcode': 'PIX QR Code',
            'facebook': 'Facebook',
            'instagram': 'Instagram',
            'tiktok': 'TikTok',
            'twitter': 'X (Twitter)',
            'youtube': 'YouTube',
            'spotify': 'Spotify',
            'linkedin': 'LinkedIn',
            'pinterest': 'Pinterest',
            'portfolio': 'Portfólio',
            'banner': 'Banner',
            'texto_com_botao': 'Texto com Botão',
            'carousel': 'Carrossel',
            'banner_carousel': 'Carrossel (Banner)',
            'pdf': 'PDF',
            'wifi': 'Wi-Fi',
            'instagram_embed': 'Instagram Incorporado',
            'youtube_embed': 'YouTube Incorporado',
            'tiktok_embed': 'TikTok Incorporado',
            'spotify_embed': 'Spotify Incorporado',
            'linkedin_embed': 'LinkedIn Incorporado',
            'pinterest_embed': 'Pinterest Incorporado',
            'sales_page': 'Página de Vendas',
            'digital_form': 'Formulário King',
            'guest_list': 'Lista de Convidados',
            'convite': 'Convite Digital',
            'king_selection': 'King Selection',
            'bible': 'Bíblia',
            'location': 'Localização',
            'wifi': 'Wi-Fi (QR Code)'
        };
        return names[itemType] || 'Item';
    }

    function moduleListDisplayTitle(item) {
        const t = (item && item.title) ? String(item.title).trim() : '';
        if (item && item.item_type === 'wifi' && (!t || t === 'Item')) {
            return getItemTypeName('wifi');
        }
        return t || getItemTypeName(item && item.item_type) || 'Novo Módulo';
    }

    if (window.DashboardCore) window.DashboardCore.moduleListDisplayTitle = moduleListDisplayTitle;

    // Função para abrir modal de edição para novo item

    // Listeners: js/dashboard-listeners.js
    function setupEventListeners() {
        if (window.DashboardListeners && typeof window.DashboardListeners.setupEventListeners === 'function') {
            return window.DashboardListeners.setupEventListeners();
        }
    }
    window.setupEventListeners = setupEventListeners;


    // Função para renderizar lista de imagens do carrossel
    // Função específica para o novo módulo Carrossel (não banner)
    // ===== NOVO CARROSSEL - FUNÇÕES LIMPAS =====

    // Função para renderizar imagens do carrossel
    if (window.DashboardCore) window.DashboardCore.renderCarouselImagesNew = function () { return renderCarouselImagesNew.apply(null, arguments); };
    function renderCarouselImagesNew(itemId, images) {
        // Procurar por ambos os IDs possíveis (com e sem "-new")
        let container = document.getElementById(`carousel-images-list-new-${itemId}`);
        if (!container) {
            container = document.getElementById(`carousel-images-list-${itemId}`);
        }
        if (!container) {
            console.error(`[CARROSSEL] Container não encontrado para itemId: ${itemId}`);
            console.error(`   Tentou: carousel-images-list-new-${itemId} e carousel-images-list-${itemId}`);
            return;
        }

        container.innerHTML = '';

        // Filtrar placeholders
        const realImages = (images || []).filter(img => {
            const url = typeof img === 'string' ? img : (img.image_url || img);
            return url && !url.includes('placeholder') && !url.startsWith('data:image/svg');
        });

        if (realImages.length === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px; font-size: 0.9rem; grid-column: 1/-1;">Nenhuma imagem adicionada ainda.</p>';
            return;
        }

        // ===== EXATAMENTE IGUAL AO BANNER: width: 100%; height: auto; sem object-fit, sem max-height =====
        realImages.forEach((imgUrl, index) => {
            const url = typeof imgUrl === 'string' ? imgUrl : (imgUrl.image_url || imgUrl);
            const imageItem = document.createElement('div');
            imageItem.className = 'carousel-image-item-new';
            imageItem.style.cssText = 'position: relative; border: 1px solid var(--border-color, #2C2C2F); border-radius: 8px; overflow: hidden; background: var(--card-background-color, #1C1C21);';
            // EXATAMENTE IGUAL AO BANNER: apenas width: 100%; height: auto; sem object-fit
            imageItem.innerHTML = `
                <img src="${url}" style="width: 100%; height: auto; display: block; background: var(--card-background-color, #1C1C21);" loading="lazy">
                <div style="position: absolute; bottom: 5px; left: 5px; background: rgba(0,0,0,0.7); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">Foto ${index + 1} de ${realImages.length}</div>
                <button type="button" class="remove-carousel-new" data-item-id="${itemId}" data-image-index="${index}" style="position: absolute; top: 5px; right: 5px; background: rgba(255,0,0,0.9); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; z-index: 10;">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(imageItem);
        });

        // Atualizar inputs (modal e item) para garantir sincronização
        const jsonInputModal = SELECTORS.editModalBody?.querySelector(`.carousel-images-json-new[data-item-id="${itemId}"]`);
        const jsonInputItem = document.querySelector(`.item[data-id="${itemId}"] .carousel-images-json-new`);
        const jsonValue = JSON.stringify(realImages);

        // Atualizar ambos para garantir que estão sincronizados
        if (jsonInputModal) {
            jsonInputModal.value = jsonValue;
            __ckDashLog(`[CARROSSEL] JSON do modal atualizado: ${realImages.length} imagem(ns)`);
        }
        if (jsonInputItem) {
            jsonInputItem.value = jsonValue;
            __ckDashLog(`[CARROSSEL] JSON do item atualizado: ${realImages.length} imagem(ns)`);
        }

        if (!jsonInputModal && !jsonInputItem) {
            console.warn(`[CARROSSEL] Nenhum input JSON encontrado para itemId: ${itemId}`);
        }

        // Atualizar image_url
        const firstImg = realImages[0] || '';
        const imageInputModal = SELECTORS.editModalBody?.querySelector(`#edit-image-url`);
        const imageInputItem = document.querySelector(`.item[data-id="${itemId}"] .item-image-url-input`);
        if (imageInputModal) imageInputModal.value = firstImg;
        if (imageInputItem) imageInputItem.value = firstImg;

        // Atualizar display (buscar item no DOM para evitar ReferenceError)
        const itemEl = document.querySelector(`.item[data-id="${itemId}"]`);
        if (itemEl) {
            const displayDest = itemEl.querySelector('.item-display-dest');
            if (displayDest) {
                displayDest.textContent = `${realImages.length} imagem${realImages.length !== 1 ? 'ns' : ''}`;
            }
        }
    }

    // Função para remover imagem
    if (window.DashboardCore) window.DashboardCore.removeCarouselImageNew = function () { return removeCarouselImageNew.apply(null, arguments); };
    function removeCarouselImageNew(itemId, imageIndex) {
        const jsonInput = SELECTORS.editModalBody?.querySelector(`.carousel-images-json-new[data-item-id="${itemId}"]`) ||
            document.querySelector(`.item[data-id="${itemId}"] .carousel-images-json-new`);
        if (!jsonInput) return;

        try {
            const images = JSON.parse(jsonInput.value || '[]');
            images.splice(imageIndex, 1);
            jsonInput.value = JSON.stringify(images);
            renderCarouselImagesNew(itemId, images);
            updateLivePreviewFromForm();
        } catch (e) {
            console.error('Erro ao remover:', e);
        }
    }

    if (window.DashboardCore) window.DashboardCore.handleShareImageUpload = function () { return handleShareImageUpload.apply(null, arguments); };
    async function handleShareImageUpload(imageBlob) {
        try {
            __ckDashLog('Iniciando upload da imagem de compartilhamento...');

            // Obter autorização para upload
            const authResponse = await safeFetch(`${API_URL}/api/upload/auth`, {
                method: 'POST',
                headers: HEADERS_AUTH
            });

            if (!authResponse.ok) {
                const errorText = await authResponse.text();
                console.error('Erro na autorização:', errorText);
                throw new Error('Falha na autorização para upload.');
            }

            const authData = await authResponse.json();
            const uploadURL = authData.uploadURL;

            if (!uploadURL) {
                throw new Error('URL de upload não recebida');
            }

            __ckDashLog('Autorização obtida, fazendo upload...');

            // Fazer upload para Cloudflare
            const formData = new FormData();
            const isPNG = imageBlob.type === 'image/png';
            const fileName = isPNG ? 'share-image.png' : 'share-image.jpg';
            formData.append('file', imageBlob, fileName);

            const uploadResponse = await fetch(uploadURL, { method: 'POST', headers: getAuthHeaders(), body: formData });

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error('Erro no upload para Cloudflare:', errorText);
                throw new Error('Falha no upload para o Cloudflare.');
            }

            const uploadData = await uploadResponse.json();
            __ckDashLog('Upload para Cloudflare concluído:', uploadData);

            const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";
            const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : '');
            if (!finalUrl) {
                throw new Error('Resposta do servidor de upload inválida. Tente novamente.');
            }
            __ckDashLog('URL final gerada:', finalUrl);

            // Salvar no servidor
            __ckDashLog('Salvando URL no servidor...');
            const saveResponse = await safeFetch(`${API_URL}/api/profile/share-image`, {
                method: 'PUT',
                headers: {
                    ...HEADERS_AUTH,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ share_image_url: finalUrl })
            });

            if (!saveResponse.ok) {
                const errorData = await saveResponse.json().catch(() => ({ message: 'Erro desconhecido' }));
                console.error('Erro ao salvar no servidor:', errorData);

                // Verificar se é erro de migration
                if (errorData.error === 'MIGRATION_REQUIRED') {
                    alert('? necessário executar a migration 019 primeiro. A coluna share_image_url ainda não existe no banco de dados.');
                } else {
                    throw new Error(errorData.message || 'Erro ao salvar imagem de compartilhamento');
                }
                return;
            }

            const saveData = await saveResponse.json();
            __ckDashLog('Imagem salva com sucesso:', saveData);

            alert('Imagem de compartilhamento salva com sucesso!');

            // Recarregar dados
            await fetchProfileData(true);

            // Reabrir seção se estiver aberta
            if (SELECTORS.btnConfigCabecalho?.classList.contains('active')) {
                SELECTORS.btnConfigCabecalho.click();
            }

        } catch (error) {
            console.error('Erro completo no upload da imagem de compartilhamento:', error);
            console.error('O Stack trace:', error.stack);

            // Tratamento específico de erros de rede
            let errorMessage = 'Erro ao fazer upload da imagem.';

            if (error.message && error.message.includes('ERR_NETWORK_CHANGED')) {
                errorMessage = 'Erro de conexão: Sua rede mudou durante o upload. Verifique sua conexão e tente novamente.';
            } else if (error.message && error.message.includes('Erro de conexão')) {
                errorMessage = error.message;
            } else if (error.message && error.message.includes('Failed to fetch')) {
                errorMessage = 'Erro de conexão: Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
            } else if (error.message && error.message.includes('Timeout')) {
                errorMessage = 'Timeout: A requisição demorou muito. Tente novamente.';
            } else if (error.message) {
                errorMessage = `Erro: ${error.message}`;
            }

            alert(errorMessage);
        }
    }

    /** Upload da arte do topo (Modelo Vitrine) após crop 16:9 */
    if (window.DashboardCore) window.DashboardCore.handleVitrineHeroUpload = function () { return handleVitrineHeroUpload.apply(null, arguments); };
    async function handleVitrineHeroUpload(imageBlob) {
        try {
            const authResponse = await safeFetch(`${API_URL}/api/upload/auth`, {
                method: 'POST',
                headers: HEADERS_AUTH
            });
            if (!authResponse.ok) throw new Error('Falha na autorização para upload.');
            const authData = await authResponse.json();
            const uploadURL = authData.uploadURL;
            if (!uploadURL) throw new Error('URL de upload não recebida');

            const formData = new FormData();
            const isPNG = imageBlob.type === 'image/png';
            formData.append('file', imageBlob, isPNG ? 'vitrine-hero.png' : 'vitrine-hero.jpg');

            const uploadResponse = await fetch(uploadURL, { method: 'POST', headers: getAuthHeaders(), body: formData });
            if (!uploadResponse.ok) throw new Error('Falha no upload para o Cloudflare.');

            const uploadData = await uploadResponse.json();
            const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";
            const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : '');
            if (!finalUrl) throw new Error('Resposta do servidor de upload inválida.');

            if (typeof window.applyVitrineHeroFromCrop === 'function') {
                window.applyVitrineHeroFromCrop(finalUrl);
            } else {
                console.warn('applyVitrineHeroFromCrop não disponível');
            }
        } catch (error) {
            console.error('Erro no upload da arte Vitrine:', error);
            alert(error.message || 'Não foi possível enviar a arte. Tente novamente.');
        }
    }

    if (window.DashboardCore) window.DashboardCore.handleBackgroundUpload = function () { return handleBackgroundUpload.apply(null, arguments); };
    async function handleBackgroundUpload(imageBlob) {
        SELECTORS.backgroundUploadArea.classList.add('is-uploading');
        try {
            const authResponse = await safeFetch(`${API_URL}/api/upload/auth`, {
                method: 'POST',
                headers: HEADERS_AUTH
            });
            if (!authResponse.ok) throw new Error('Falha na autorização para upload.');
            const { uploadURL } = await authResponse.json();

            const formData = new FormData();
            formData.append('file', imageBlob, 'background.jpg');

            const uploadResponse = await fetch(uploadURL, { method: 'POST', headers: getAuthHeaders(), body: formData });
            if (!uploadResponse.ok) throw new Error('Falha no upload para o Cloudflare.');
            const uploadData = await uploadResponse.json();

            const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ"; // Seu Account Hash
            const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : '');
            if (!finalUrl) throw new Error('Resposta do servidor de upload inválida. Tente novamente.');

            SELECTORS.backgroundImagePreview.src = finalUrl;
            SELECTORS.backgroundImageUrlInput.value = finalUrl;

            updateLivePreviewFromForm();

        } catch (error) {
            console.error('Erro no upload da imagem de fundo:', error);
            alert(`Erro: ${error.message}`);
        } finally {
            SELECTORS.backgroundUploadArea.classList.remove('is-uploading');
        }
    }

    // Cache para evitar requisições repetidas muito rapidamente
    let lastProfileFetch = 0;
    let profileFetchPromise = null;
    const PROFILE_FETCH_COOLDOWN = 1000; // 1 segundo entre requisições (reduzido para atualização mais rápida)

    if (window.DashboardCore) window.DashboardCore.fetchProfileData = function () { return fetchProfileData.apply(null, arguments); };
    async function fetchProfileData(forceRefresh = false) {
        window.fetchProfileData = fetchProfileData; // permite que duplicateItem chame após duplicar
        try {
            // Se forceRefresh for true, SEMPRE forçar atualização imediata
            if (forceRefresh) {
                __ckDashLog(' FOR?ANDO atualização imediata (ignorando cooldown e requisições em andamento)...');
                // Limpar promise anterior se existir para forçar nova requisição
                profileFetchPromise = null;
                lastProfileFetch = 0; // Resetar cooldown completamente
            } else {
                // Implementar cooldown apenas se não for forçado
                const now = Date.now();

                // Verificar se há requisição em andamento apenas se não for forçado
                if (profileFetchPromise) {
                    __ckDashLog('⏳ Aguardando requisição em andamento...');
                    return await profileFetchPromise;
                }

                // Verificar cooldown apenas se não for forçado
                if ((now - lastProfileFetch) < PROFILE_FETCH_COOLDOWN) {
                    const waitSeconds = Math.ceil((PROFILE_FETCH_COOLDOWN - (now - lastProfileFetch)) / 1000);
                    __ckDashLog(`⏳ Cooldown ativo. Aguarde ${waitSeconds} segundos.`);
                    // Não fazer a requisição, apenas retornar silenciosamente
                    return;
                }
            }

            // Criar promise para evitar requisições simultâneas
            profileFetchPromise = (async () => {
                try {
                    lastProfileFetch = Date.now();

                    const profileAttempts = 2;
                    const profileBackoffMs = [0, 800];
                    let lastAttemptError = null;

                    for (let attempt = 0; attempt < profileAttempts; attempt++) {
                        if (profileBackoffMs[attempt] > 0) {
                            await new Promise(function (r) { setTimeout(r, profileBackoffMs[attempt]); });
                        }
                        try {
                            let response = await safeFetch(`${API_URL}/api/profile`, {
                                method: 'GET',
                                headers: getHeaders()
                            });

                            // Se receber 401, tenta renovar o token
                            if (response.status === 401) {
                                __ckDashLog('Token expirado, tentando renovar...');
                                try {
                                    await refreshAccessToken();
                                    response = await safeFetch(`${API_URL}/api/profile`, {
                                        method: 'GET',
                                        headers: getHeaders()
                                    });

                                    if (response.status === 401) {
                                        throw new Error('Não foi possível autenticar. Por favor, faça login novamente.');
                                    }
                                } catch (refreshError) {
                                    console.error('Erro ao renovar token:', refreshError);
                                    throw new Error('Sessão expirada. Por favor, faça login novamente.');
                                }
                            }

                            if (response.status === 429) {
                                const retryAfter = response.headers.get('Retry-After') || '900';
                                const waitTime = parseInt(retryAfter, 10);
                                const waitMinutes = Math.ceil(waitTime / 60);
                                const err = new Error(`Muitas requisições ao servidor. Por favor, aguarde ${waitMinutes} minutos antes de tentar novamente.`);
                                err.status = 429;
                                err.retryAfter = waitTime;
                                throw err;
                            }

                            if (!response.ok) {
                                const err = new Error(`Erro ${response.status}: ${response.statusText}`);
                                err.status = response.status;
                                throw err;
                            }

                            return response;
                        } catch (e) {
                            lastAttemptError = e;
                            const msg = (e && e.message) ? String(e.message) : '';
                            const authRelated = /Sessão expirada|Não foi possível autenticar/i.test(msg);
                            const transient = /Timeout|Erro de conexão|Erro de rede/i.test(msg) || isLikelyNetworkTransportError(e);
                            if (authRelated || e.status === 429 || !transient || attempt >= profileAttempts - 1) {
                                throw e;
                            }
                            console.warn('Perfil: falha de rede transitória, nova tentativa', attempt + 1, '/', profileAttempts, e);
                        }
                    }
                    throw lastAttemptError || new Error('Erro ao carregar perfil');
                } finally {
                    profileFetchPromise = null; // Limpar promise sempre
                }
            })();

            const response = await profileFetchPromise;

            const data = await response.json();

            // Log para debug - ver o que está sendo retornado
            __ckDashLog('Dados recebidos da API:', data);
            __ckDashLog('Estrutura dos dados:', {
                hasData: !!data,
                hasDetails: !!data?.details,
                hasItems: !!data?.items,
                itemsType: Array.isArray(data?.items) ? 'array' : typeof data?.items,
                itemsLength: Array.isArray(data?.items) ? data.items.length : 'N/A'
            });

            // Validar estrutura dos dados antes de processar
            if (!data) {
                throw new Error('A API retornou dados vazios ou nulos');
            }

            // Normalizar estrutura dos dados
            // A API pode retornar { details, items } ou apenas { details }
            let profileData;
            if (data.details) {
                // Formato esperado: { details: {...}, items: [...] }
                profileData = {
                    details: data.details,
                    items: Array.isArray(data.items) ? data.items : []
                };
            } else if (typeof data === 'object' && !Array.isArray(data)) {
                // Pode ser que a API retorne os dados diretamente sem o wrapper 'details'
                // Tentar usar os dados como 'details' e criar array vazio para items
                console.warn('API retornou dados sem wrapper "details". Tentando normalizar...');
                profileData = {
                    details: data,
                    items: []
                };
            } else {
                throw new Error(`Estrutura de dados inválida: esperado objeto com "details", recebido: ${typeof data}`);
            }

            // Validar se details existe e não está vazio após normalização
            if (!profileData.details || typeof profileData.details !== 'object') {
                throw new Error('Dados do perfil incompletos: campo "details" está vazio ou inválido');
            }

            // Garantir que items é sempre um array
            if (!Array.isArray(profileData.items)) {
                console.warn('Campo "items" não é um array. Convertendo...');
                profileData.items = [];
            }

            __ckDashLog('Dados validados com sucesso. Renderizando editor...');
            __ckDashLog(`Y"S Total de itens para renderizar: ${profileData.items?.length || 0}`);
            if (profileData.items && profileData.items.length > 0) {
                __ckDashLog(`Y"< IDs dos itens:`, profileData.items.map(item => `${item.id} (${item.item_type})`).join(', '));
            }

            // IMPORTANTE: Atualizar window.currentProfileData para garantir que está sincronizado
            window.currentProfileData = profileData;
            currentProfileData = profileData;

            __ckDashLog('window.currentProfileData atualizado com', profileData.items?.length || 0, 'itens');
            if (profileData.items && profileData.items.length > 0) {
                __ckDashLog('Y"< Itens atualizados:', profileData.items.map(item => ({
                    id: item.id,
                    type: item.item_type,
                    hasImage: !!item.image_url,
                    imageUrl: item.image_url ? item.image_url.substring(0, 50) + '...' : 'sem logo'
                })));
            }

            // Renderizar editor com dados validados
            try {
                __ckDashLog('YZ Chamando renderEditor...');
                renderEditor(profileData);
                __ckDashLog('renderEditor concluído com sucesso');

                reconcileModulesListWithProfileData(profileData);
            } catch (renderError) {
                console.error('Erro ao renderizar editor:', renderError);
                console.error('O Stack trace:', renderError.stack);
                throw new Error(`Erro ao renderizar interface: ${renderError.message}`);
            }

            // Atualizar link público apenas se tiver dados necessários
            if (profileData.details && SELECTORS.publicLink) {
                SELECTORS.publicLink.href = `https://tag.conectaking.com.br/${profileData.details.profile_slug || user.id}`;
            }

            // Gerar QR Code se a aba de compartilhar estiver visível
            const compartilharPane = document.getElementById('compartilhar-pane');
            if (compartilharPane && compartilharPane.classList.contains('active')) {
                setTimeout(() => {
                    generateQRCode();
                }, 300);
            }
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            console.error('Stack trace:', error.stack);

            // Se for erro de autenticação, redireciona para login
            if (error.message.includes('Sessão expirada') || error.message.includes('autenticar')) {
                alert(error.message);
                localStorage.removeItem('conectaKingToken');
                localStorage.removeItem('conectaKingRefreshToken');
                localStorage.removeItem('conectaKingUser');
                window.location.href = sameFolderPage('login.html');
                return;
            }

            // Limpar promise em caso de erro
            profileFetchPromise = null;

            // Tratar 429 (Rate Limit) silenciosamente - sem alerta para o usuário
            if (error.status === 429 || error.message.includes('Muitas requisições')) {
                // Erro 429 - Rate Limit - apenas log no console, sem incomodar o usuário
                console.warn('Rate limit atingido. Usando dados locais do cache.');

                // Não tentar novamente automaticamente em caso de 429
                return;
            } else if (error.message.includes('Erro de conexão') || error.message.includes('Timeout')) {
                alert('Problema de conexão detectado. Verifique sua internet e tente novamente.');
            } else {
                alert('Erro ao carregar dados do perfil. Tente novamente.');
            }
        }
    }

    // ========== FUNÇÕES PARA GERENCIAR PRODUTOS DO CATÁLOGO ==========
    // REMOVIDO COMPLETAMENTE
    /*
    if (window.DashboardCore) window.DashboardCore.loadProductsForCatalog = function () { return loadProductsForCatalog.apply(null, arguments); };
    async function loadProductsForCatalog(itemId) {
        // Tentar primeiro dentro do modal aberto; se não achar, usa o documento inteiro
        const productsListEl = SELECTORS.editModalBody?.querySelector(`#products-list-${itemId}`) 
            || document.getElementById(`products-list-${itemId}`);
        if (!productsListEl) {
            console.error('Elemento products-list não encontrado para itemId:', itemId);
            return;
        }
        
        __ckDashLog('Carregando produtos para itemId:', itemId);
        
        try {
            const response = await safeFetch(`${API_URL}/api/profile/items/${itemId}/products`, { headers: HEADERS });
            __ckDashLog('Resposta da API:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Erro na resposta da API:', errorText);
                throw new Error(`Erro ao carregar produtos: ${response.status}`);
            }
            
            const data = await response.json();
            __ckDashLog('Dados recebidos da API:', data);
            const products = data.products || [];
            __ckDashLog('Produtos processados:', products.length);
            
            // Atualizar contador no display do item
            const itemEl = document.querySelector(`[data-id="${itemId}"]`);
            if (itemEl) {
                const displayEl = itemEl.querySelector('.item-display-dest');
                if (displayEl) {
                    displayEl.textContent = `${products.length} produto${products.length !== 1 ? 's' : ''}`;
                }
            }
            
            __ckDashLog('Elemento productsListEl encontrado:', productsListEl);
            __ckDashLog('Tentando renderizar produtos. Quantidade:', products.length);
            
            if (products.length === 0) {
                __ckDashLog('Nenhum produto encontrado, exibindo mensagem vazia');
                productsListEl.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Nenhum produto cadastrado ainda.</p>';
            } else {
                __ckDashLog('Renderizando produtos no HTML...');
                // Exibir contador acima da lista
                const productsHTML = `
                    <div style="margin-bottom: 15px; padding: 10px; background: var(--background-color, #0D0D0F); border-radius: 6px; border: 1px solid var(--border-color, #2C2C2F);">
                        <strong style="color: var(--text, #ECECEC);">Total de produtos: ${products.length}</strong>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;">
                        ${products.map(product => `
                            <div class="product-item-card" data-product-id="${product.id}" style="background: var(--card-background-color, #1C1C21); border-radius: 8px; padding: 15px; border: 1px solid var(--border-color, #2C2C2F); display: flex; flex-direction: column;">
                                <div style="width: 100%; height: 200px; margin-bottom: 12px; border-radius: 8px; overflow: hidden; background: var(--background-color, #0D0D0F); display: flex; align-items: center; justify-content: center;">
                                    ${product.image_url ? 
                                        `<img src="${product.image_url}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 6px;" alt="${product.name}">` 
                                        : '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #2C2C2F;"><i class="fas fa-image" style="font-size: 3rem; color: #666;"></i></div>'
                                    }
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-weight: 600; color: var(--text, #ECECEC); margin-bottom: 6px; font-size: 1rem; word-wrap: break-word;">${product.name}</div>
                                    ${product.description ? `<div style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1); margin-bottom: 8px; line-height: 1.4; word-wrap: break-word; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${product.description}</div>` : ''}
                                    <div style="font-size: 1.1rem; color: var(--dourado-principal, #FFC700); font-weight: 700; margin-bottom: 12px;">R$ ${(parseFloat(product.price) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                </div>
                                <div style="display: flex; gap: 8px; margin-top: auto;">
                                    <button type="button" class="edit-product-btn" data-product-id="${product.id}" data-item-id="${itemId}" style="flex: 1; padding: 10px; background: #2C2C2F; color: var(--text, #ECECEC); border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                                        <i class="fas fa-edit"></i> Editar
                                    </button>
                                    <button type="button" class="delete-product-btn" data-product-id="${product.id}" data-item-id="${itemId}" style="padding: 10px 15px; background: #d32f2f; color: white; border: none; border-radius: 6px; cursor: pointer;">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                __ckDashLog('HTML gerado, definindo innerHTML...');
                productsListEl.innerHTML = productsHTML;
                __ckDashLog('innerHTML definido com sucesso');
            }
            
            // Adicionar event listeners
            productsListEl.querySelectorAll('.edit-product-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const productId = btn.dataset.productId;
                    const catalogItemId = btn.dataset.itemId;
                    openProductEditModal(catalogItemId, productId);
                });
            });
            
            productsListEl.querySelectorAll('.delete-product-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const productId = btn.dataset.productId;
                    const catalogItemId = btn.dataset.itemId;
                    deleteProduct(catalogItemId, productId);
                });
            });
            
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            productsListEl.innerHTML = `<p style="color: #d32f2f; text-align: center; padding: 20px;">Erro ao carregar produtos: ${error.message}<br><small>Verifique o console para mais detalhes</small></p>`;
        }
    }
    
    if (window.DashboardCore) window.DashboardCore.openProductEditModal = function () { return openProductEditModal.apply(null, arguments); };
    async function openProductEditModal(itemId, productId = null) {
        let product = null;
        if (productId) {
            try {
                const response = await safeFetch(`${API_URL}/api/profile/items/${itemId}/products`, { headers: HEADERS });
                const data = await response.json();
                product = data.products.find(p => p.id == productId);
            } catch (error) {
                alert('Erro ao carregar produto');
                return;
            }
        }
        
        const modal = document.createElement('div');
        modal.className = 'product-modal-overlay';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        modal.innerHTML = `
            <div style="background: var(--card-background-color, #1C1C21); border-radius: 12px; padding: 30px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <h2 style="margin: 0 0 20px 0; color: var(--text, #ECECEC);">${productId ? 'Editar Produto' : 'Adicionar Produto'}</h2>
                <form id="product-form" style="display: flex; flex-direction: column; gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: var(--text, #ECECEC);">Nome do Produto *</label>
                        <input type="text" id="product-name" required value="${product?.name || ''}" placeholder="Ex: Camiseta Premium" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color, #2C2C2F); background: var(--background-color, #0D0D0F); color: var(--text, #ECECEC);">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: var(--text, #ECECEC);">Descrição</label>
                        <textarea id="product-description" placeholder="Descreva o produto..." style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color, #2C2C2F); background: var(--background-color, #0D0D0F); color: var(--text, #ECECEC); min-height: 100px; resize: vertical;">${product?.description || ''}</textarea>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: var(--text, #ECECEC);">Preço (R$) *</label>
                        <input type="text" id="product-price" required inputmode="numeric" autocomplete="off" value="" placeholder="Digite o valor (ex: 9999)" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color, #2C2C2F); background: var(--background-color, #0D0D0F); color: var(--text, #ECECEC);">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: var(--text, #ECECEC);">Imagem do Produto</label>
                        <div id="product-image-preview" style="margin-bottom: 10px; width: 100%; min-height: 250px; background: var(--background-color, #0D0D0F); border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; display: flex; align-items: center; justify-content: center; padding: 15px;">
                            ${product?.image_url ? 
                                `<img src="${product.image_url}" style="max-width: 100%; max-height: 250px; border-radius: 8px; object-fit: contain;" alt="Preview do produto">` 
                                : '<div style="text-align: center; color: var(--text-dark, #A1A1A1);"><i class="fas fa-image" style="font-size: 3rem; margin-bottom: 10px; display: block;"></i><span>Nenhuma imagem selecionada</span></div>'
                            }
                        </div>
                        <input type="file" id="product-image-upload" accept="image/*" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color, #2C2C2F); background: var(--background-color, #0D0D0F); color: var(--text, #ECECEC); margin-bottom: 8px;">
                        <small style="color: var(--text-dark, #A1A1A1); display: block; margin-bottom: 8px;">
                            <i class="fas fa-info-circle"></i> A imagem será exibida completamente sem corte (object-fit: contain)
                        </small>
                        <input type="hidden" id="product-image-url" value="${product?.image_url || ''}">
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        <button type="submit" style="flex: 1; padding: 12px; background: var(--dourado-principal, #FFC700); color: #000; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">Salvar</button>
                        <button type="button" class="close-product-modal" style="padding: 12px 20px; background: #2C2C2F; color: var(--text, #ECECEC); border: none; border-radius: 6px; cursor: pointer;">Cancelar</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelector('.close-product-modal').addEventListener('click', () => modal.remove());
        modal.querySelector('#product-image-upload').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const authResponse = await safeFetch(`${API_URL}/api/upload/auth`, { method: 'POST', headers: HEADERS_AUTH });
                if (!authResponse.ok) throw new Error('Erro ao obter autorização');
                const { uploadURL } = await authResponse.json();
                
                const formData = new FormData();
                formData.append('file', file);
                const uploadResponse = await fetch(uploadURL, { method: 'POST', headers: getAuthHeaders(), body: formData });
                if (!uploadResponse.ok) throw new Error('Erro no upload');
                const uploadData = await uploadResponse.json();
                
                document.getElementById('product-image-url').value = uploadData.result.variants[0];
                const previewContainer = document.getElementById('product-image-preview');
                previewContainer.style.minHeight = '250px';
                previewContainer.style.padding = '15px';
                previewContainer.innerHTML = `<img src="${uploadData.result.variants[0]}" style="max-width: 100%; max-height: 250px; border-radius: 8px; object-fit: contain;" alt="Preview do produto">`;
            } catch (error) {
                alert('Erro ao fazer upload da imagem');
                console.error(error);
            }
        });
        
        // Máscara de moeda BRL no preço - versão simplificada
        const priceInput = modal.querySelector('#product-price');
        
        const formatCurrencyBRL = (num) => {
            return num.toLocaleString('pt-BR', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            });
        };
        
        const parseCurrencyBRL = (value) => {
            if (!value) return 0;
            const digits = String(value).replace(/\D/g, '');
            if (!digits) return 0;
            return Number(digits) / 100;
        };
        
        const formatValue = () => {
            const digits = priceInput.value.replace(/\D/g, '');
            if (!digits || digits === '0') {
                priceInput.value = 'R$ 0,00';
                return;
            }
            const num = Number(digits) / 100;
            priceInput.value = `R$ ${formatCurrencyBRL(num)}`;
        };
        
        // Formatar valor inicial
        if (product && product.price) {
            const initialPrice = parseFloat(product.price) || 0;
            if (initialPrice > 0) {
                const cents = Math.round(initialPrice * 100);
                priceInput.value = cents.toString();
                formatValue();
            } else {
                priceInput.value = 'R$ 0,00';
            }
        } else {
            priceInput.value = 'R$ 0,00';
        }
        
        // Interceptar digitação
        priceInput.addEventListener('keydown', (e) => {
            // Permitir teclas de navegação e controle
            if (['Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                return;
            }
            
            // Tratar Backspace e Delete
            if (['Backspace', 'Delete'].includes(e.key)) {
                e.preventDefault();
                
                const digits = priceInput.value.replace(/\D/g, '');
                if (digits && digits.length > 0) {
                    // Remove o último dígito
                    const newDigits = digits.slice(0, -1);
                    if (newDigits === '' || newDigits === '0') {
                        priceInput.value = 'R$ 0,00';
                    } else {
                        const num = Number(newDigits) / 100;
                        priceInput.value = `R$ ${formatCurrencyBRL(num)}`;
                    }
                    priceInput.setSelectionRange(priceInput.value.length, priceInput.value.length);
                } else {
                    priceInput.value = 'R$ 0,00';
                    priceInput.setSelectionRange(3, 3);
                }
                return;
            }
            
            // Permitir Ctrl+A, Ctrl+C, Ctrl+X
            if (e.ctrlKey && ['a', 'c', 'x'].includes(e.key.toLowerCase())) {
                return;
            }
            
            // Tratar Ctrl+V (colar)
            if (e.ctrlKey && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                navigator.clipboard.readText().then(text => {
                    // Extrai apenas dígitos do texto colado
                    const digits = text.replace(/\D/g, '');
                    if (digits) {
                        const num = Number(digits) / 100;
                        priceInput.value = `R$ ${formatCurrencyBRL(num)}`;
                    } else {
                        priceInput.value = 'R$ 0,00';
                    }
                    priceInput.setSelectionRange(priceInput.value.length, priceInput.value.length);
                }).catch(() => {
                    // Se falhar, deixa o comportamento padrão
                });
                return;
            }
            
            // Se é um número
            if (/[0-9]/.test(e.key)) {
                e.preventDefault();
                
                // Pega os dígitos atuais (remove tudo que não é dígito)
                const currentDigits = priceInput.value.replace(/\D/g, '');
                
                // Adiciona o novo dígito ao final
                const newDigits = currentDigits === '0' ? e.key : currentDigits + e.key;
                
                // Converte e formata
                const num = Number(newDigits) / 100;
                priceInput.value = `R$ ${formatCurrencyBRL(num)}`;
                
                // Posiciona cursor no final
                priceInput.setSelectionRange(priceInput.value.length, priceInput.value.length);
            } else {
                // Bloqueia qualquer outra tecla que não seja número ou comando
                e.preventDefault();
            }
        });
        
        // Prevenir entrada manual no campo (tornar readonly visualmente mas permitir interação via teclado)
        priceInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            const digits = pastedText.replace(/\D/g, '');
            if (digits) {
                const num = Number(digits) / 100;
                priceInput.value = `R$ ${formatCurrencyBRL(num)}`;
                priceInput.setSelectionRange(priceInput.value.length, priceInput.value.length);
            }
        });
        
        modal.querySelector('#product-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('product-name').value.trim();
            const description = document.getElementById('product-description').value.trim();
            const price = parseCurrencyBRL(document.getElementById('product-price').value);
            const imageUrl = document.getElementById('product-image-url').value;
            
            if (!name || !price || price <= 0) {
                alert('Preencha nome e preço corretamente');
                return;
            }
            
            const submitBtn = modal.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Salvando...';
            
            try {
                const url = productId 
                    ? `${API_URL}/api/profile/items/${itemId}/products/${productId}`
                    : `${API_URL}/api/profile/items/${itemId}/products`;
                const method = productId ? 'PUT' : 'POST';
                
                // Garantir que o preço é um número válido
                const priceValue = parseFloat(price);
                if (isNaN(priceValue) || priceValue <= 0) {
                    alert('Preço inválido. Por favor, insira um valor maior que zero.');
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                    return;
                }
                
                const requestBody = { 
                    name: name.trim(), 
                    description: description.trim() || null, 
                    price: priceValue, 
                    image_url: imageUrl || null 
                };
                
                __ckDashLog(`Y' Salvando produto:`, { itemId, productId, requestBody, method, url });
                __ckDashLog(`Headers:`, HEADERS);
                
                const response = await safeFetch(url, {
                    method,
                    headers: HEADERS,
                    body: JSON.stringify(requestBody)
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    let errorMessage = 'Erro ao salvar produto';
                    try {
                        const errorData = JSON.parse(errorText);
                        errorMessage = errorData.message || errorMessage;
                    } catch (e) {
                        errorMessage = `Erro ${response.status}: ${errorText || response.statusText}`;
                    }
                    console.error('Erro ao salvar produto:', errorMessage);
                    throw new Error(errorMessage);
                }
                
                const result = await response.json();
                __ckDashLog('Produto salvo com sucesso:', result);
                
                // Verificar se o produto foi realmente salvo
                if (!result.product && !result.message) {
                    console.warn('Resposta da API não contém produto ou mensagem:', result);
                }
                
                // Fechar modal do produto
                modal.remove();
                
                // Aguardar um pouco antes de recarregar para garantir que o backend processou
                setTimeout(async () => {
                    try {
                        __ckDashLog(` Recarregando produtos após salvar produto para catálogo ${itemId}...`);
                        await loadProductsForCatalog(itemId);
                        __ckDashLog('Produtos recarregados com sucesso');
                    } catch (err) {
                        console.error('Erro ao recarregar produtos após salvar:', err);
                    }
                }, 500);
                
                // Atualizar contagem no display
                const itemEl = document.querySelector(`[data-id="${itemId}"]`);
                if (itemEl) {
                    setTimeout(async () => {
                        try {
                            const response2 = await safeFetch(`${API_URL}/api/profile/items/${itemId}/products`, { headers: HEADERS });
                            if (response2.ok) {
                            const data2 = await response2.json();
                            const count = data2.products?.length || 0;
                            const displayEl = itemEl.querySelector('.item-display-dest');
                            if (displayEl) displayEl.textContent = `${count} produto${count !== 1 ? 's' : ''}`;
                            }
                        } catch (err) {
                            console.error('Erro ao atualizar contagem:', err);
                        }
                    }, 500);
                }
            } catch (error) {
                console.error('Erro ao salvar produto:', error);
                alert(`Erro ao salvar produto: ${error.message}`);
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }
    
    async function deleteProduct(itemId, productId) {
        if (!confirm('Tem certeza que deseja remover este produto?')) return;
        
        try {
            const response = await safeFetch(`${API_URL}/api/profile/items/${itemId}/products/${productId}`, {
                method: 'DELETE',
                headers: HEADERS
            });
            
            if (!response.ok) throw new Error('Erro ao remover produto');
            
            loadProductsForCatalog(itemId);
            
            // Atualizar contagem
            const itemEl = document.querySelector(`[data-id="${itemId}"]`);
            if (itemEl) {
                setTimeout(async () => {
                    try {
                        const response2 = await safeFetch(`${API_URL}/api/profile/items/${itemId}/products`, { headers: HEADERS });
                        const data2 = await response2.json();
                        const count = data2.products?.length || 0;
                        const displayEl = itemEl.querySelector('.item-display-dest');
                        if (displayEl) displayEl.textContent = `${count} produto${count !== 1 ? 's' : ''}`;
                    } catch (err) {
                        console.error('Erro ao atualizar contagem:', err);
                    }
                }, 500);
            }
        } catch (error) {
            alert('Erro ao remover produto');
            console.error(error);
        }
    }
    
    // Event listener para botão adicionar produto (delegation)
    // REMOVIDO COMPLETAMENTE
    */

    window.__dashboardMain = null;

    async function main() {
        __ckDashLog(' Iniciando função main()...');
        setupEventListeners();
        // Re-ligar após splits (idempotente) — cobre race com defer
        setTimeout(function () {
            try { setupEventListeners(); } catch (e) { /* ignore */ }
        }, 0);

        // Aplicar visibilidade da aba Empresa e outros controles (ADM, logo) em um único lugar
        // ADM tem acesso sempre. King Corporate / modo empresa ou plano com Modo Empresa (separação de pacotes).
        function applyEmpresaTabAndControls(user) {
            if (!user) return;
            const accountType = user.accountType || user.account_type;
            const isAdmin = user.isAdmin === true || user.is_admin === true;
            const hasEnterpriseMode = accountType === 'business_owner' || accountType === 'king_corporate' || accountType === 'enterprise';
            const hasModoEmpresa = user.hasModoEmpresa === true;
            const showEmpresa = isAdmin || hasEnterpriseMode || hasModoEmpresa;

            const empresaTab = document.querySelector('.sidebar-tab[data-tab="times"]');
            if (empresaTab) {
                empresaTab.style.display = showEmpresa ? 'flex' : 'none';
                __ckDashLog(showEmpresa ? 'Aba "Empresa" visível (ADM, modo empresa ou plano com Modo Empresa)' : 'Aba "Empresa" oculta');
            }

            const admLink = document.getElementById('adm-link');
            if (admLink) {
                admLink.style.display = isAdmin ? 'flex' : 'none';
            }
            const dev365AdminLink = document.getElementById('dev365-admin-link');
            if (dev365AdminLink) {
                dev365AdminLink.style.display = isAdmin ? 'flex' : 'none';
            }
            const personalizacaoLogoLink = document.getElementById('personalizacao-logo-link');
            if (personalizacaoLogoLink) {
                const planosComPersonalizarLogo = ['king_finance', 'king_finance_plus', 'king_premium_plus', 'king_corporate'];
                const showLogo = planosComPersonalizarLogo.includes(accountType);
                personalizacaoLogoLink.style.display = showLogo ? 'flex' : 'none';
            }

            const separacaoLink = document.getElementById('separacao-pacotes-link');
            if (separacaoLink) {
                separacaoLink.style.display = isAdmin ? 'block' : 'none';
            }
        }

        // Aplicar IMEDIATAMENTE com localStorage (antes de qualquer await) para evitar aba aparecer e sumir
        try {
            const localUser = JSON.parse(localStorage.getItem('conectaKingUser') || '{}');
            if (localUser && (localUser.accountType || localUser.account_type)) {
                applyEmpresaTabAndControls(localUser);
            }
        } catch (e) {
            console.warn('Erro ao aplicar visibilidade inicial da aba Empresa:', e);
        }

        // Perfil e status em paralelo (antes o painel esperava o perfil inteiro para só depois pedir o plano)
        const profilePromise = fetchProfileData().then(function () {
            __ckDashLog('fetchProfileData() concluído com sucesso');
        }).catch(function (error) {
            console.error('Erro ao carregar dados do perfil:', error);
            if (error && error.status !== 429) {
                console.warn('Erro ao carregar perfil, continuando com interface básica:', error);
            } else if (error && error.status === 429) {
                console.error('Ys Rate limit atingido. Aguarde antes de tentar novamente.');
            }
        });
        const statusPromise = fetchAndUpdateUserStatus();
        await profilePromise;
        try {
            const openFormId = new URLSearchParams(window.location.search).get('openForm');
            if (openFormId && typeof openEditModal === 'function') {
                var editarLink = document.querySelector('.sidebar .nav-link[data-target="editar-pane"]');
                if (editarLink && !editarLink.classList.contains('active')) editarLink.click();
                var modulosTab = document.querySelector('[data-editor-target="items-editor"]');
                if (modulosTab) modulosTab.click();
                function tryOpenFormModal() {
                    var id = String(openFormId).trim();
                    var container = document.getElementById('items-container');
                    var itemEl = container
                        ? container.querySelector('.module-item[data-id="' + id + '"], .item[data-id="' + id + '"]')
                        : document.querySelector('.module-item[data-id="' + id + '"], .item[data-id="' + id + '"]');
                    if (itemEl) {
                        openEditModal(itemEl);
                        try { history.replaceState({}, document.title, window.location.pathname + (window.location.hash || '')); } catch (e) {}
                        return true;
                    }
                    return false;
                }
                setTimeout(function () {
                    if (!tryOpenFormModal()) setTimeout(tryOpenFormModal, 500);
                }, 600);
            }
        } catch (eOpen) { /* ignore */ }

        // Atualizar status do usuário e reaplicar visibilidade (API é fonte da verdade)
        try {
            const updatedUser = await statusPromise;
            if (!updatedUser) return;

            if (updatedUser.accountType === 'free') {
                alert('Acesso negado. Faça um upgrade do seu plano para acessar o dashboard.');
                window.location.href = '/#planos';
                return;
            }

            applyEmpresaTabAndControls(updatedUser);

            // Aplicar visibilidade dos módulos (Gestão Financeira, Contratos, Agenda)
            __ckDashLog('[Dashboard] Aplicando visibilidade dos módulos para:', {
                email: updatedUser.email,
                hasFinance: updatedUser.hasFinance,
                hasContract: updatedUser.hasContract,
                hasAgenda: updatedUser.hasAgenda,
                hasModoEmpresa: updatedUser.hasModoEmpresa
            });

            if (typeof window.applyModulesVisibility === 'function') {
                window.applyModulesVisibility(updatedUser);
            } else {
                var applied = false;
                function tryApply() {
                    if (typeof window.applyModulesVisibility === 'function') {
                        window.applyModulesVisibility(updatedUser);
                        applied = true;
                    }
                }
                setTimeout(function () {
                    tryApply();
                    if (!applied) setTimeout(function () {
                        tryApply();
                        if (!applied) console.warn('[Dashboard] applyModulesVisibility ainda não disponível; visibilidade dos módulos será aplicada quando o script carregar.');
                    }, 600);
                }, 300);
            }
        } catch (error) {
            console.warn('Erro ao atualizar status do usuário:', error);
        }
    }

    // --- CONTROLE DO MENU MOBILE ---
    function initMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.getElementById('sidebar');
        const navLinks = document.querySelectorAll('.sidebar-nav .nav-link, .sidebar-footer .nav-link');

        if (!mobileMenuToggle || !sidebar) {
            console.warn('Elementos do menu mobile não encontrados. Tentando novamente...');
            setTimeout(initMobileMenu, 100);
            return;
        }

        // Criar overlay real para melhor controle no mobile
        let overlay = document.getElementById('sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sidebar-overlay';
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }

        function openMobileMenu(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            __ckDashLog('Abrindo menu mobile');
            if (sidebar) {
                sidebar.classList.add('mobile-open');
                document.body.classList.add('mobile-menu-open');
                document.body.style.overflow = 'hidden';
                if (overlay) {
                    overlay.classList.add('active');
                }
            }
        }

        function closeMobileMenu(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            __ckDashLog('Fechando menu mobile');
            if (sidebar) {
                sidebar.classList.remove('mobile-open');
                document.body.classList.remove('mobile-menu-open');
                document.body.style.overflow = '';
                if (overlay) {
                    overlay.classList.remove('active');
                }
            }
        }

        // Evento no overlay real - apenas fecha o menu, não bloqueia cliques nos links
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                // Só fechar se clicar diretamente no overlay, não em elementos filhos
                if (e.target === overlay) {
                    e.preventDefault();
                    e.stopPropagation();
                    closeMobileMenu(e);
                }
            });

            overlay.addEventListener('touchend', (e) => {
                // Só fechar se tocar diretamente no overlay, não em elementos filhos
                if (e.target === overlay) {
                    e.preventDefault();
                    e.stopPropagation();
                    closeMobileMenu(e);
                }
            }, { passive: false });
        }

        // Eventos para o botão de abrir
        // Função para toggle (abrir/fechar) do menu
        function toggleMobileMenu(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            // Verifica se o menu está aberto
            const isOpen = sidebar.classList.contains('mobile-open');

            if (isOpen) {
                closeMobileMenu(e);
            } else {
                openMobileMenu(e);
            }
        }

        mobileMenuToggle.addEventListener('click', function (e) {
            toggleMobileMenu(e);
        });

        mobileMenuToggle.addEventListener('touchend', function (e) {
            toggleMobileMenu(e);
        }, { passive: false });

        // Garantir que o botão está clicável
        mobileMenuToggle.style.pointerEvents = 'auto';
        mobileMenuToggle.style.cursor = 'pointer';
        mobileMenuToggle.setAttribute('tabindex', '0');

        // Botão de fechar removido - agora usa toggle no botão hamburger

        // Fechar menu ao clicar em um link - GARANTIR QUE OS LINKS FUNCIONEM
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {

                // Não fechar se for link externo (conta.html, admin, business)
                if (link.href && (link.href.includes('conta.html') || link.href.includes('admin') || link.href.includes('business'))) {
                    // Fechar menu antes de navegar
                    closeMobileMenu();
                    return; // Deixa o navegador seguir o link normalmente
                }

                // Para links internos com data-target, garantir que o evento não seja bloqueado
                const targetId = link.dataset.target;
                if (targetId) {
                    // Não prevenir default aqui - deixar o event listener principal tratar
                    // Apenas fechar o menu após um pequeno delay para permitir a navegação
                    setTimeout(() => {
                        closeMobileMenu();
                    }, 150);
                } else {
                    // Para outros links, fechar o menu
                    setTimeout(() => {
                        closeMobileMenu();
                    }, 100);
                }
            }, true); // Usar capture phase para garantir que o evento seja capturado
        });

        // Fechar menu ao clicar no overlay (fora do menu) - melhorado para mobile
        function handleOverlayClick(e) {
            if (sidebar && sidebar.classList.contains('mobile-open')) {
                const clickedElement = e.target;
                const isMenuButton = clickedElement === mobileMenuToggle || mobileMenuToggle.contains(clickedElement);
                const isInsideSidebar = sidebar.contains(clickedElement);
                const isNavLink = clickedElement.closest('.nav-link');

                // Não fechar se clicar em um link do menu
                if (isNavLink) {
                    return; // Deixa o link funcionar normalmente
                }

                // Verificar se é o overlay (fora do sidebar)
                const isOverlay = clickedElement === overlay ||
                    clickedElement === document.body ||
                    (!isInsideSidebar && !isMenuButton);

                if (isOverlay) {
                    e.preventDefault();
                    e.stopPropagation();
                    closeMobileMenu();
                }
            }
        }

        // Eventos melhorados para mobile - usar capture phase false para não interferir nos links
        document.addEventListener('click', handleOverlayClick, false);
        document.addEventListener('touchend', handleOverlayClick, { passive: false });

        // Fechar ao tocar no overlay usando o pseudo-elemento
        sidebar.addEventListener('click', (e) => {
            // Se clicar diretamente no sidebar mas não em um elemento filho interativo
            if (e.target === sidebar && sidebar.classList.contains('mobile-open')) {
                closeMobileMenu();
            }
        });

        // Fechar menu ao pressionar ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar && sidebar.classList.contains('mobile-open')) {
                closeMobileMenu();
            }
        });

        __ckDashLog('Menu mobile inicializado com sucesso!');
    }

    // Inicializar menu mobile
    initMobileMenu();

    window.__dashboardMain = main;
    if (window.DashboardCore) window.DashboardCore.main = main;
    main();

    // Event listener para upload de avatar
    if (SELECTORS.dashboardAvatarUploadArea && SELECTORS.dashboardAvatarFileInput) {
        // Usar tanto click quanto touchend para garantir funcionamento no mobile
        const openAvatarFileInput = (e) => {
            e.preventDefault();
            e.stopPropagation();
            SELECTORS.dashboardAvatarFileInput?.click();
        };
        SELECTORS.dashboardAvatarUploadArea.addEventListener('click', openAvatarFileInput);
        SELECTORS.dashboardAvatarUploadArea.addEventListener('touchend', openAvatarFileInput, { passive: false });

        SELECTORS.dashboardAvatarFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleDashboardAvatarUpload(file);
            }
        });
    }
    // Separação de Pacotes: js/dashboard-separacao.js
    // King Forms editor: js/dashboard-forms-editor.js

    // FILTRO DE MÓDULOS POR PLANO
    // ============================================

    let userAvailableModules = null;
    Object.defineProperty(window, 'userAvailableModules', {
        get: function () { return userAvailableModules; },
        set: function (v) { userAvailableModules = v; },
        configurable: true
    });

    // Carregar módulos disponíveis para o usuário
    async function loadUserAvailableModules() {
        try {
            const response = await safeFetch(`${API_URL}/api/modules/available`, {
                method: 'GET',
                headers: HEADERS_AUTH
            });

            if (response.ok) {
                const data = await response.json();
                userAvailableModules = new Set(data.available_modules || []);
                userAvailableModules.add('wifi');
            }
        } catch (error) {
            console.error('Erro ao carregar módulos disponíveis:', error);
            userAvailableModules = null;
        }
        applySidebarModulesVisibility();
    }

    // Mostrar/ocultar links do sidebar por plano (Recibos e Orçamentos, Contratos, Agenda, etc.)
    function applySidebarModulesVisibility() {
        document.querySelectorAll('.sidebar .nav-link-by-plan').forEach(function (link) {
            const moduleType = link.getAttribute('data-module');
            if (!moduleType) return;
            if (userAvailableModules === null) {
                link.style.display = 'none';
                return;
            }
            link.style.display = userAvailableModules.has(moduleType) ? 'flex' : 'none';
        });
    }

    /** Garante cartão Wi-Fi no modal (deploy antigo do dashboard.html sem o bloco no HTML). */
    function ensureWifiModuleCardInAddModal() {
        const modal = document.getElementById('add-item-modal');
        if (!modal || modal.querySelector('.module-choice-card[data-item-type="wifi"]')) return;
        const galleries = modal.querySelectorAll('.module-gallery');
        if (!galleries.length) return;
        const contactGallery = galleries[0];
        const card = document.createElement('div');
        card.className = 'module-choice-card';
        card.setAttribute('data-item-type', 'wifi');
        card.innerHTML = '<i class="fas fa-wifi"></i><span>Wi-Fi (QR Code)</span>';
        const pixQr = contactGallery.querySelector('.module-choice-card[data-item-type="pix_qrcode"]');
        if (pixQr && pixQr.parentNode) {
            pixQr.insertAdjacentElement('afterend', card);
        } else {
            contactGallery.appendChild(card);
        }
    }

    // Filtrar módulos no modal baseado no plano
    async function filterModulesByPlan() {
        ensureWifiModuleCardInAddModal();
        // Carregar módulos disponíveis se ainda não carregou
        if (userAvailableModules === null) {
            await loadUserAvailableModules();
        }
        if (userAvailableModules) {
            userAvailableModules.add('wifi');
        }

        // Se não conseguiu carregar, mostrar todos (fallback), mas ainda ocultar Agenda/Contratos para não-admin
        if (userAvailableModules === null) {
            let isAdminFallback = false;
            try {
                const u = JSON.parse(localStorage.getItem('conectaKingUser') || '{}');
                isAdminFallback = u.isAdmin === true || u.is_admin === true;
            } catch (_) { }
            if (!isAdminFallback) {
                document.querySelectorAll('#add-item-modal .module-choice-card[data-item-type="agenda"], #add-item-modal .module-choice-card[data-item-type="contract"]').forEach(c => { c.style.display = 'none'; });
            }
            const wifiCard = document.querySelector('#add-item-modal .module-choice-card[data-item-type="wifi"]');
            if (wifiCard) wifiCard.style.display = 'block';
            return;
        }

        // Ocultar módulos não disponíveis
        const allModuleCards = document.querySelectorAll('#add-item-modal .module-choice-card');
        let isAdmin = false;
        try {
            const user = JSON.parse(localStorage.getItem('conectaKingUser') || '{}');
            isAdmin = user.isAdmin === true || user.is_admin === true;
        } catch (_) { }
        allModuleCards.forEach(card => {
            const moduleType = card.dataset.itemType;
            // Módulos descontinuados: nunca mostrar no modal
            if (moduleType === 'agenda' || moduleType === 'contract' || moduleType === 'kingbrief' || moduleType === 'king_bolao' || moduleType === 'photographer_site') {
                card.style.display = 'none';
                return;
            }
            // Wi-Fi (QR): módulo do cartão virtual - sempre visível no modal «Adicionar módulo»
            if (moduleType === 'wifi') {
                card.style.display = 'block';
                return;
            }
            if (moduleType && !userAvailableModules.has(moduleType)) {
                card.style.display = 'none';
            } else {
                card.style.display = 'block';
            }
        });
    }
    window.filterModulesByPlan = filterModulesByPlan;
    window.loadUserAvailableModules = loadUserAvailableModules;

    // Carregar módulos disponíveis ao carregar página
    loadUserAvailableModules();

    // ============================================
    // PERSONALIZAR LINK DO SITE (APENAS ADM)
    // ============================================
    const personalizarLinkPane = document.getElementById('personalizar-link-pane');
    if (personalizarLinkPane) {
        const linkPreviewForm = document.getElementById('link-preview-form');
        const linkPreviewTitle = document.getElementById('link-preview-title');
        const linkPreviewSubtitle = document.getElementById('link-preview-subtitle');
        const linkPreviewBg1 = document.getElementById('link-preview-bg1');
        const linkPreviewBg1Text = document.getElementById('link-preview-bg1-text');
        const linkPreviewBg2 = document.getElementById('link-preview-bg2');
        const linkPreviewBg2Text = document.getElementById('link-preview-bg2-text');
        const linkPreviewTextColor = document.getElementById('link-preview-text-color');
        const linkPreviewTextColorText = document.getElementById('link-preview-text-color-text');
        const linkPreviewSubtitleColor = document.getElementById('link-preview-subtitle-color');
        const linkPreviewSubtitleColorText = document.getElementById('link-preview-subtitle-color-text');
        const linkPreviewImage = document.getElementById('link-preview-image');
        const linkPreviewSaveBtn = document.getElementById('link-preview-save-btn');
        const linkPreviewPreviewBtn = document.getElementById('link-preview-preview-btn');
        const linkPreviewResetBtn = document.getElementById('link-preview-reset-btn');

        // Sincronizar inputs de cor
        if (linkPreviewBg1 && linkPreviewBg1Text) {
            linkPreviewBg1.addEventListener('input', (e) => {
                linkPreviewBg1Text.value = e.target.value.toUpperCase();
                updatePreview();
            });
            linkPreviewBg1Text.addEventListener('input', (e) => {
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                    linkPreviewBg1.value = e.target.value;
                    updatePreview();
                }
            });
        }

        if (linkPreviewBg2 && linkPreviewBg2Text) {
            linkPreviewBg2.addEventListener('input', (e) => {
                linkPreviewBg2Text.value = e.target.value.toUpperCase();
                updatePreview();
            });
            linkPreviewBg2Text.addEventListener('input', (e) => {
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                    linkPreviewBg2.value = e.target.value;
                    updatePreview();
                }
            });
        }

        if (linkPreviewTextColor && linkPreviewTextColorText) {
            linkPreviewTextColor.addEventListener('input', (e) => {
                linkPreviewTextColorText.value = e.target.value.toUpperCase();
                updatePreview();
            });
            linkPreviewTextColorText.addEventListener('input', (e) => {
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                    linkPreviewTextColor.value = e.target.value;
                    updatePreview();
                }
            });
        }

        if (linkPreviewSubtitleColor && linkPreviewSubtitleColorText) {
            linkPreviewSubtitleColor.addEventListener('input', (e) => {
                linkPreviewSubtitleColorText.value = e.target.value.toUpperCase();
                updatePreview();
            });
            linkPreviewSubtitleColorText.addEventListener('input', (e) => {
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                    linkPreviewSubtitleColor.value = e.target.value;
                    updatePreview();
                }
            });
        }

        // Atualizar preview da imagem
        function updatePreview() {
            if (linkPreviewImage) {
                const timestamp = new Date().getTime();
                linkPreviewImage.src = `/og-image.jpg?t=${timestamp}`;
            }
        }

        // Carregar configuração atual
        async function loadLinkPreviewConfig() {
            try {
                const response = await fetch(`${API_URL}/api/admin/link-preview-config`, {
                    headers: HEADERS_AUTH
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.config) {
                        const config = data.config;
                        if (linkPreviewTitle) linkPreviewTitle.value = config.title || 'CONECTAKING';
                        if (linkPreviewSubtitle) linkPreviewSubtitle.value = config.subtitle || 'Sua Presença Digital. Um Toque. Poder Absoluto.';
                        if (linkPreviewBg1) linkPreviewBg1.value = config.bg_color_1 || '#991B1B';
                        if (linkPreviewBg1Text) linkPreviewBg1Text.value = config.bg_color_1 || '#991B1B';
                        if (linkPreviewBg2) linkPreviewBg2.value = config.bg_color_2 || '#000000';
                        if (linkPreviewBg2Text) linkPreviewBg2Text.value = config.bg_color_2 || '#000000';
                        if (linkPreviewTextColor) linkPreviewTextColor.value = config.text_color || '#F5F5F5';
                        if (linkPreviewTextColorText) linkPreviewTextColorText.value = config.text_color || '#F5F5F5';
                        if (linkPreviewSubtitleColor) linkPreviewSubtitleColor.value = config.subtitle_color || '#FFC700';
                        if (linkPreviewSubtitleColorText) linkPreviewSubtitleColorText.value = config.subtitle_color || '#FFC700';

                        updatePreview();
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar configuração:', error);
            }
        }

        // Salvar configuração
        if (linkPreviewForm) {
            linkPreviewForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                if (!linkPreviewSaveBtn) return;

                linkPreviewSaveBtn.disabled = true;
                linkPreviewSaveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

                try {
                    const config = {
                        title: linkPreviewTitle?.value || 'CONECTAKING',
                        subtitle: linkPreviewSubtitle?.value || 'Sua Presença Digital. Um Toque. Poder Absoluto.',
                        bg_color_1: linkPreviewBg1?.value || '#991B1B',
                        bg_color_2: linkPreviewBg2?.value || '#000000',
                        text_color: linkPreviewTextColor?.value || '#F5F5F5',
                        subtitle_color: linkPreviewSubtitleColor?.value || '#FFC700'
                    };

                    const response = await fetch(`${API_URL}/api/admin/link-preview-config`, {
                        method: 'POST',
                        headers: HEADERS,
                        body: JSON.stringify(config)
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                            alert('Configuração salva com sucesso! A preview será atualizada em alguns segundos.');
                            updatePreview();
                        } else {
                            alert('Erro ao salvar configuração. Tente novamente.');
                        }
                    } else {
                        const error = await response.json();
                        alert(`Erro: ${error.message || 'Erro ao salvar configuração'}`);
                    }
                } catch (error) {
                    console.error('Erro ao salvar configuração:', error);
                    alert('Erro ao salvar configuração. Verifique sua conexão e tente novamente.');
                } finally {
                    linkPreviewSaveBtn.disabled = false;
                    linkPreviewSaveBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Configuração';
                }
            });
        }

        // Botão de preview
        if (linkPreviewPreviewBtn) {
            linkPreviewPreviewBtn.addEventListener('click', () => {
                updatePreview();
            });
        }

        // Botão de reset
        if (linkPreviewResetBtn) {
            linkPreviewResetBtn.addEventListener('click', () => {
                if (confirm('Deseja restaurar as configurações padrão?')) {
                    if (linkPreviewTitle) linkPreviewTitle.value = 'CONECTAKING';
                    if (linkPreviewSubtitle) linkPreviewSubtitle.value = 'Sua Presença Digital. Um Toque. Poder Absoluto.';
                    if (linkPreviewBg1) linkPreviewBg1.value = '#991B1B';
                    if (linkPreviewBg1Text) linkPreviewBg1Text.value = '#991B1B';
                    if (linkPreviewBg2) linkPreviewBg2.value = '#000000';
                    if (linkPreviewBg2Text) linkPreviewBg2Text.value = '#000000';
                    if (linkPreviewTextColor) linkPreviewTextColor.value = '#F5F5F5';
                    if (linkPreviewTextColorText) linkPreviewTextColorText.value = '#F5F5F5';
                    if (linkPreviewSubtitleColor) linkPreviewSubtitleColor.value = '#FFC700';
                    if (linkPreviewSubtitleColorText) linkPreviewSubtitleColorText.value = '#FFC700';
                    updatePreview();
                }
            });
        }

        // Carregar configuração quando o painel for aberto
        const personalizarLinkLink = document.getElementById('personalizar-link-link');
        if (personalizarLinkLink) {
            personalizarLinkLink.addEventListener('click', () => {
                loadLinkPreviewConfig();
            });
        }
    }

    // ==========================================================

    // Finanças e Branding foram extraídos para:
    //   js/dashboard-finance.js  (window.initFinancePane, …)
    //   js/dashboard-empresa.js  (loadBrandingData / saveBranding / clearBranding)
    // Carregados após este arquivo no dashboard.html.

    try {
        if (window.DashboardInfo && typeof window.DashboardInfo.init === 'function') window.DashboardInfo.init();
        if (window.DashboardEmpresa && typeof window.DashboardEmpresa.init === 'function') window.DashboardEmpresa.init();
        if (window.DashboardPersonalizar && typeof window.DashboardPersonalizar.init === 'function') window.DashboardPersonalizar.init();
        if (window.DashboardRelatorios && typeof window.DashboardRelatorios.init === 'function') window.DashboardRelatorios.init();
    } catch (eMod) { /* módulos opcionais */ }

    try {
        const qsKs = new URLSearchParams(window.location.search || '');
        if (qsKs.get('open') === 'kingSelection') {
            qsKs.delete('open');
            const clean = window.location.pathname + (qsKs.toString() ? '?' + qsKs.toString() : '') + (window.location.hash || '');
            window.history.replaceState({}, '', clean);
            window.navigateToKingSelectionAdmin();
        }
    } catch (e) { /* ignore */ }

});
