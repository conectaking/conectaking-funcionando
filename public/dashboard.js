document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard iniciando... v2026-08-13-banner-url-models');

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
        window.location.href = 'index.html#planos';
        return;
    }

    /** Login/painel na mesma pasta do HTML atual (Hostinger public_html/, mobile, Live Server). */
    function sameFolderPage(file) {
        try {
            return new URL(file, window.location.href).href;
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
    const useLocalApi5000 = typeof window !== 'undefined' && window.USE_LOCAL_API_5000 === true && isLocalhost;
    const inheritedApi = (typeof window !== 'undefined' && (window.API_BASE || window.API_URL))
        ? String(window.API_BASE || window.API_URL).replace(/\/$/, '')
        : '';
    const sameOrigin = (typeof window !== 'undefined' && window.location && window.location.origin)
        ? String(window.location.origin).replace(/\/$/, '')
        : '';
    const computedLocal = (isLocalhost && String(window.location.port || '') === '5000')
        ? sameOrigin
        : (window.API_CONFIG?.baseURL || `http://${window.location.hostname}:5000`);
    const computedProd = isProdHost ? (sameOrigin || 'https://www.conectaking.com.br') : 'https://www.conectaking.com.br';
    // Nunca usar http://dominio:5000 em producao
    if (inheritedApi && /:5000$/i.test(inheritedApi) && isProdHost) {
        try { window.API_BASE = computedProd; window.API_URL = computedProd; } catch (e) {}
    }
    const safeInherited = (inheritedApi && /^https?:\/\//i.test(inheritedApi) && !(isProdHost && /:5000$/i.test(inheritedApi)))
        ? inheritedApi
        : '';
    const explicitLocalApi = !!(useLocalApi5000 || (useLocalApi && isLocalhost));
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
            if (window.USE_LOCAL_API_5000 || localStorage.getItem('useLocalApi') === 'true') {
                params.set('api', 'local');
            }
        } catch (e) {}
        // Anti-cache: garante refresh da versão nova no browser normal
        params.set('v', '2026-03-23-anticache-a1');
        var q = '?' + params.toString();
        var h = (typeof window !== 'undefined' && window.location && window.location.hostname) ? String(window.location.hostname).toLowerCase() : '';
        // Live Server / dev sem Apache: não existe rewrite /kingSelection — usar o HTML direto
        if (h === '127.0.0.1' || h === 'localhost') {
            return 'kingSelectionEdit.html' + q;
        }
        return '/kingSelection' + q;
    }

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
                window.location.href = 'formPageEdit.html?itemId=' + newId;
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
                console.log(`Usando cache para: ${url}`);
                return cached.response.clone();
            }
        }

        // Adiciona headers de autorização se necessário
        const currentToken = localStorage.getItem('conectaKingToken');
        if (currentToken && !defaultOptions.headers.Authorization) {
            defaultOptions.headers.Authorization = `Bearer ${currentToken}`;
        }

        try {
            console.log(` Fazendo requisição para: ${url}`);

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

            console.log(`Requisição bem-sucedida para: ${url}`);
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

        // Validaf§f£o do arquivo
        if (file.type !== 'application/pdf') {
            throw new Error('Por favor, selecione um arquivo PDF vf¡lido');
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB
            throw new Error('O arquivo deve ter no mf¡ximo 10MB');
        }

        console.log(`?o Iniciando upload do PDF: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

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

            console.log(`?o¡ Resposta do servidor: ${response.status} ${response.statusText}`);

            // Verifica se a resposta f© JSON vf¡lida
            const contentType = response.headers.get('content-type');
            console.log(`?o— Content-Type da resposta: ${contentType}`);

            if (!contentType || !contentType.includes('application/json')) {
                const responseText = await response.text();
                console.error('Resposta nf£o f© JSON:', responseText.substring(0, 500));

                // Mensagens especf­ficas para diferentes tipos de erro
                if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
                    throw new Error('SERVIDOR COM PROBLEMA: O endpoint /api/upload/pdf nf£o estf¡ funcionando. Verifique o arquivo SERVER-FIXES.md para corref§fµes necessf¡rias.');
                } else if (response.status === 404) {
                    throw new Error('ENDPOINT NAO ENCONTRADO: O endpoint /api/upload/pdf nf£o existe no servidor. Implemente conforme SERVER-FIXES.md');
                } else if (response.status === 401) {
                    throw new Error('NAO AUTORIZADO: Token invf¡lido ou expirado. Faf§a login novamente.');
                } else if (response.status === 500) {
                    throw new Error('ERRO DO SERVIDOR: Erro interno no servidor. Verifique os logs do servidor e implemente as corref§fµes do SERVER-FIXES.md');
                } else {
                    throw new Error(` ERRO DO SERVIDOR (${response.status}): ${response.statusText}. Verifique SERVER-FIXES.md para corref§fµes.`);
                }
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Erro do servidor: ${response.status}`);
            }

            console.log(`â"— Upload do PDF bem-sucedido:`, result);

            if (progressCallback) {
                progressCallback('Arquivo Carregado!');
            }

            return result;

        } catch (error) {
            console.error('Erro no upload do PDF:', error);

            if (progressCallback) {
                progressCallback('Erro no envio');
            }

            // Re-lanf§a o erro com informaf§fµes especf­ficas
            if (error.message.includes('Failed to fetch')) {
                throw new Error('ERRO DE CONEXAO: Nf£o foi possf­vel conectar ao servidor. Verifique sua internet e se o servidor estf¡ funcionando.');
            } else if (error.message.includes('Unexpected token')) {
                throw new Error('ERRO DE RESPOSTA: Servidor retornou dados invf¡lidos. Implemente as corref§fµes do SERVER-FIXES.md');
            } else {
                throw error;
            }
        }
    }

    // --- FUNf—AO DE TESTE PARA VERIFICAR ENDPOINT ---
    async function testPDFEndpoint() {
        console.log(' Testando conectividade com o servidor...');

        try {
            // Testa um endpoint que sabemos que existe
            const testResponse = await fetch(`${API_URL}/api/account/status`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            console.log(` Teste de conectividade: ${testResponse.status} ${testResponse.statusText}`);

            if (testResponse.ok) {
                console.log('â"— Servidor estf¡ funcionando');
                return {
                    server: true,
                    status: testResponse.status,
                    message: 'Servidor funcionando normalmente'
                };
            } else {
                console.log('âš ï¸ Servidor com problemas');
                return {
                    server: false,
                    status: testResponse.status,
                    message: 'Servidor com problemas, usando modo offline'
                };
            }

        } catch (error) {
            console.error('Servidor nf£o acessf­vel:', error);
            return {
                server: false,
                error: error.message,
                message: 'Servidor nf£o acessf­vel, usando modo offline'
            };
        }
    }

    // Disponibiliza a funf§f£o de teste globalmente
    window.testPDFEndpoint = testPDFEndpoint;

    // --- FUNf—f—ES PARA QR CODE PIX VfLIDO ---

    // Funf§f£o para calcular CRC16 (necessário para PIX)
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

    // Funf§f£o para formatar chave PIX
    function formatPixKey(pixKey) {
        const cleanKey = pixKey.trim().replace(/\D/g, ''); // Remove tudo que nf£o f© nfºmero

        // Se for celular (11 df­gitos), adiciona +55
        if (cleanKey.length === 11) {
            return '+55' + cleanKey;
        }

        // Se for celular com DDD (13 df­gitos), adiciona +
        if (cleanKey.length === 13 && cleanKey.startsWith('55')) {
            return '+' + cleanKey;
        }

        // Se jf¡ tem +, mantf©m como estf¡
        if (pixKey.startsWith('+')) {
            return pixKey;
        }

        // Para outros tipos (CPF, email, chave aleatf³ria), mantf©m como estf¡
        return pixKey;
    }

    // Funf§f£o para gerar cf³digo PIX EMV vf¡lido
    function generatePixEMVCode(pixKey, recipientName, amount = null, description = '') {
        if (!pixKey || !recipientName) {
            throw new Error('Chave PIX e nome do recebedor sf£o obrigatf³rios');
        }

        // Limpar e validar dados
        const cleanPixKey = formatPixKey(pixKey);
        const cleanName = recipientName.trim().substring(0, 25);
        const cleanDescription = description.trim().substring(0, 25);
        const cleanAmount = amount ? parseFloat(amount).toFixed(2) : '0.00';

        console.log(' Gerando cf³digo PIX com dados:', {
            pixKeyOriginal: pixKey,
            pixKeyFormatted: cleanPixKey,
            name: cleanName,
            amount: cleanAmount,
            description: cleanDescription
        });

        // Construir cf³digo EMV manualmente para garantir formato correto
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

        // Additional Data Field Template (se houver descrif§f£o)
        if (cleanDescription) {
            const additionalData = '05' + cleanDescription.length.toString().padStart(2, '0') + cleanDescription;
            emvString += '62' + additionalData.length.toString().padStart(2, '0') + additionalData;
        }

        // CRC16
        const crc = calculateCRC16(emvString + '6304');
        emvString += '6304' + crc;

        console.log('?o Cf³digo EMV final:', emvString);
        console.log('?o Tamanho:', emvString.length);

        return emvString;
    }

    // Funf§f£o para criar QR Code PIX visual
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

            // Adicionar informaf§fµes abaixo do QR Code
            const info = document.createElement('div');
            info.style.marginTop = '10px';
            info.style.fontSize = '14px';
            info.style.color = '#666';
            info.innerHTML = `
                <div><strong>${recipientName}</strong></div>
                <div>Chave: ${pixKey}</div>
                ${amount ? `<div>Valor: R$ ${parseFloat(amount).toFixed(2)}</div>` : ''}
                ${description ? `<div>Descrif§f£o: ${description}</div>` : ''}
            `;

            container.appendChild(info);

            return container;

        } catch (error) {
            console.error('Erro ao gerar QR Code PIX:', error);
            return null;
        }
    }

    // Funf§f£o para abrir modal com QR Code PIX
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

    // Disponibiliza as funf§fµes globalmente
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

    function serializeBannerDestination(primaryUrl, instagramRaw, whatsappRaw) {
        // Atalhos IG/WA abaixo do banner foram removidos: grava só a URL principal
        // (ignora instagram/whatsapp legados para não recriar o overlay no cartão).
        void instagramRaw;
        void whatsappRaw;
        return String(primaryUrl || '').trim();
    }

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

    function bannerDestDisplayLabel(raw) {
        const p = parseBannerDestination(raw);
        if (!p.primary_url) return 'Sem destino';
        return p.primary_url.length > 48 ? p.primary_url.slice(0, 48) + '...': p.primary_url;
    }

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
        console.log(' Testando cf³digo PIX...');
        console.log('?o— Dados de entrada:');
        console.log('- Chave PIX:', pixKey);
        console.log('- Nome:', recipientName);
        console.log('- Valor:', amount);
        console.log('- Descrif§f£o:', description);

        try {
            const pixCode = generatePixEMVCode(pixKey, recipientName, amount, description);
            console.log('â"— Cf³digo EMV gerado:', pixCode);
            console.log('?o Tamanho do cf³digo:', pixCode.length);

            // Verificar se comef§a com 000201
            if (pixCode.startsWith('000201')) {
                console.log('â"— Cf³digo comef§a corretamente com 000201');
            } else {
                console.log('ERRO: Cf³digo nf£o comef§a com 000201');
            }

            // Verificar se termina com CRC vf¡lido
            const crc = pixCode.slice(-4);
            console.log(' CRC calculado:', crc);

            // Verificar estrutura bf¡sica
            if (pixCode.includes('BR.GOV.BCB.PIX')) {
                console.log('â"— Contf©m identificador BR.GOV.BCB.PIX');
            } else {
                console.log('ERRO: Nf£o contf©m BR.GOV.BCB.PIX');
            }

            if (pixCode.includes(pixKey)) {
                console.log('â"— Contf©m chave PIX');
            } else {
                console.log('ERRO: Nf£o contf©m chave PIX');
            }

            return pixCode;

        } catch (error) {
            console.error('Erro ao gerar cf³digo PIX:', error);
            return null;
        }
    }

    // Funf§f£o para testar com dados reais do cliente
    function testClientPix() {
        console.log(' Testando com dados reais do cliente...');
        return testPixCode(
            '1119478723275204000053039865802BR',
            'ASSEMBLEIA DE DEUS CHAMA',
            null,
            'Doaf§f£o'
        );
    }

    // Funf§f£o para testar celular
    function testCelularPix(celular) {
        console.log('?o± Testando PIX com celular:', celular);
        return testPixCode(
            celular,
            'TESTE CELULAR',
            null,
            'Teste'
        );
    }

    // Disponibiliza funf§fµes de teste
    window.testPixCode = testPixCode;
    window.testClientPix = testClientPix;
    window.testCelularPix = testCelularPix;
    window.formatPixKey = formatPixKey;

    let activeItemIdForIconPicker = null;
    let qrCodeInstance = null;
    let cropper = null;
    let imageToUpload = {
        blob: null,
        trigger: null,
        element: null,
        originalFile: null  // Armazenar arquivo original para preservar tipo
    };

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
                console.log('⏳ Cooldown ativo para status. Usando dados locais.');
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

            console.log('[fetchAndUpdateUserStatus] Status do usuário atualizado:', {
                email: freshUser.email,
                hasFinance: freshUser.hasFinance,
                hasContract: freshUser.hasContract,
                hasAgenda: freshUser.hasAgenda,
                plan_code: freshUser.plan_code
            });

            // Aplicar visibilidade dos módulos imediatamente
            if (typeof window.applyModulesVisibility === 'function') {
                console.log('[fetchAndUpdateUserStatus] Aplicando visibilidade dos módulos...');
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

    function hexToRgba(hex, alpha = 1) {
        if (!hex) return `rgba(20, 20, 23, ${alpha})`; // Cor padrf£o escura
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return `rgba(20, 20, 23, ${alpha})`;
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function sanitizeForVcard(value) {
        if (!value) return '';
        return value
            .replace(/\r\n|\r|\n/g, '\\n')
            .replace(/,/g, '\\,')
            .replace(/;/g, '\\;')
            .trim();
    }

    function normalizePhoneNumber(value) {
        if (!value) return '';
        const trimmed = value.trim();
        if (!trimmed) return '';
        const digits = trimmed.replace(/[^0-9+]/g, '');
        if (!digits) return '';
        if (digits.startsWith('+')) return digits;
        if (digits.startsWith('00') && digits.length > 2) return `+${digits.slice(2)}`;
        if (digits.length >= 11) return `+${digits}`;
        return digits;
    }

    function splitFullName(fullName) {
        if (!fullName) {
            return { firstName: '', lastName: '' };
        }
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) {
            return { firstName: parts[0], lastName: '' };
        }
        return {
            firstName: parts.slice(0, -1).join(' '),
            lastName: parts.slice(-1).join('')
        };
    }

    const SOCIAL_PROFILE_TYPES = {
        instagram: 'instagram',
        instagram_embed: 'instagram',
        facebook: 'facebook',
        twitter: 'twitter',
        tiktok: 'tiktok',
        tiktok_embed: 'tiktok',
        youtube: 'youtube',
        youtube_embed: 'youtube',
        linkedin: 'linkedin',
        linkedin_embed: 'linkedin',
        pinterest: 'pinterest',
        pinterest_embed: 'pinterest',
        spotify: 'spotify',
        spotify_embed: 'spotify',
        telegram: 'telegram',
        whatsapp: 'whatsapp',
        reddit: 'reddit',
        twitch: 'twitch'
    };

    const SOCIAL_USERNAME_DOMAINS = {
        instagram: 'https://www.instagram.com/',
        instagram_embed: 'https://www.instagram.com/',
        twitter: 'https://twitter.com/',
        tiktok: 'https://www.tiktok.com/@',
        tiktok_embed: 'https://www.tiktok.com/@',
        youtube: 'https://www.youtube.com/@',
        youtube_embed: 'https://www.youtube.com/@',
        linkedin: 'https://www.linkedin.com/in/',
        linkedin_embed: 'https://www.linkedin.com/in/',
        pinterest: 'https://www.pinterest.com/',
        pinterest_embed: 'https://www.pinterest.com/',
        spotify: 'https://open.spotify.com/',
        spotify_embed: 'https://open.spotify.com/',
        telegram: 'https://t.me/',
        whatsapp: 'https://wa.me/',
        reddit: 'https://www.reddit.com/user/',
        twitch: 'https://www.twitch.tv/'
    };

    const ITEM_TYPE_LABELS_FOR_VCARD = {
        link: 'Link Personalizado',
        whatsapp: 'WhatsApp',
        telegram: 'Telegram',
        email: 'Email',
        facebook: 'Facebook',
        instagram: 'Instagram',
        pinterest: 'Pinterest',
        reddit: 'Reddit',
        tiktok: 'TikTok',
        twitch: 'Twitch',
        twitter: 'X (Twitter)',
        youtube: 'YouTube',
        linkedin: 'LinkedIn',
        portfolio: 'Portfólio',
        spotify: 'Spotify',
        instagram_embed: 'Instagram',
        youtube_embed: 'YouTube',
        tiktok_embed: 'TikTok',
        spotify_embed: 'Spotify',
        linkedin_embed: 'LinkedIn',
        pinterest_embed: 'Pinterest',
        banner: 'Banner',
        texto_com_botao: 'Texto com Botão',
        carousel: 'Carrossel',
        pdf: 'PDF',
        pdf_embed: 'PDF',
        finance: 'Gestão Financeira',
        guest_list: 'Lista de Convidados',
        pix: 'PIX',
        pix_qrcode: 'PIX QR Code',
        wifi: 'Wi-Fi',
        sales_page: 'Página de Vendas',
        product_catalog: 'Catálogo de Produtos',
        banner_carousel: 'Carrossel de Banners',
        digital_form: 'King Forms',
        modo_empresa: 'Modo Empresa',
        branding: 'Personalização da Marca',
        convite: 'Convite Digital',
        bible: 'Bíblia',
        location: 'Localização',
        recibos_orcamentos: 'Recibos e Orçamentos'
    };

    const URL_TYPE_TAGS = {
        link: 'OTHER',
        whatsapp: 'WHATSAPP',
        telegram: 'TELEGRAM',
        email: 'EMAIL',
        facebook: 'FACEBOOK',
        instagram: 'INSTAGRAM',
        pinterest: 'PINTEREST',
        reddit: 'REDDIT',
        tiktok: 'TIKTOK',
        twitch: 'TWITCH',
        twitter: 'TWITTER',
        youtube: 'YOUTUBE',
        linkedin: 'LINKEDIN',
        portfolio: 'PORTFOLIO',
        spotify: 'SPOTIFY',
        instagram_embed: 'INSTAGRAM',
        youtube_embed: 'YOUTUBE',
        tiktok_embed: 'TIKTOK',
        spotify_embed: 'SPOTIFY',
        linkedin_embed: 'LINKEDIN',
        pinterest_embed: 'PINTEREST',
        banner: 'BANNER',
        pdf: 'PDF',
        pdf_embed: 'PDF'
    };

    function extractEmailAddress(rawValue) {
        if (!rawValue) return '';
        let value = rawValue.trim();
        if (!value) return '';
        if (value.toLowerCase().startsWith('mailto:')) {
            value = value.slice(7);
        }
        if (!value.includes('@')) return '';
        return value.toLowerCase();
    }

    // Funf§f£o para extrair o ID do vf­deo do YouTube de diferentes formatos de URL
    function extractYouTubeVideoId(url) {
        if (!url) return null;

        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
            /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
            /youtu\.be\/([^?\n#]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }

    // Funf§f£o para converter URL do YouTube para formato de embed
    function convertYouTubeUrlToEmbed(url) {
        if (!url) return '';

        const videoId = extractYouTubeVideoId(url);
        if (!videoId) return url; // Retorna a URL original se nf£o conseguir extrair o ID

        // Remove parf¢metros de timestamp e outros da URL
        const cleanVideoId = videoId.split('&')[0].split('?')[0];

        return `https://www.youtube.com/embed/${cleanVideoId}`;
    }

    function normalizeUrlForVcard(itemType, rawValue) {
        if (!rawValue) return '';
        let value = rawValue.trim();
        if (!value || value === '#') return '';
        if (value.toLowerCase().startsWith('javascript:')) return '';
        if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value) || /^tel:/i.test(value)) {
            return value;
        }

        if (itemType === 'email') {
            const email = extractEmailAddress(value);
            return email ? `mailto:${email}` : '';
        }

        if (itemType === 'whatsapp') {
            const digits = value.replace(/\D/g, '');
            if (!digits) return '';
            // Usuário deve incluir código do país - não adicionar automaticamente
            return `https://wa.me/${digits}`;
        }

        if (itemType === 'telegram') {
            if (value.startsWith('@')) {
                value = value.slice(1);
            }
            if (!value) return '';
            return `https://t.me/${value}`;
        }

        if (itemType === 'pix' || itemType === 'pix_qrcode') {
            return '';
        }

        if (value.startsWith('@')) {
            const username = value.slice(1);
            if (!username) return '';
            const domain = SOCIAL_USERNAME_DOMAINS[itemType];
            return domain ? `${domain}${username}` : '';
        }

        if (value.startsWith('www.')) {
            return `https://${value}`;
        }

        if (/^[\d()+\s-]+$/.test(value)) {
            const phone = normalizePhoneNumber(value);
            return phone ? `tel:${phone}` : '';
        }

        if (/^[a-z0-9]+:[/]{2}/i.test(value)) {
            return value;
        }

        if (/^[a-z0-9.-]+\.[a-z]{2,}([/?#].*)?$/i.test(value)) {
            return `https://${value}`;
        }

        if (value.includes(' ')) {
            return '';
        }

        return `https://${value}`;
    }

    function updateVcardPreviewButton(buttonEl) {
        if (!buttonEl) return;

        const rawName = (SELECTORS.displayNameInput.value || '').trim();
        const slugCandidate = (SELECTORS.profileSlugInput.value || '').trim();

        const sanitizedName = sanitizeForVcard(rawName);
        const { firstName, lastName } = splitFullName(rawName);
        const sanitizedFirstName = sanitizeForVcard(firstName);
        const sanitizedLastName = sanitizeForVcard(lastName);

        // Buscar email e telefone dos itens do perfil (primeiros encontrados)
        let rawEmail = '';
        let rawPhone = '';

        const vcardLines = ['BEGIN:VCARD', 'VERSION:3.0'];

        const noteEntries = [];
        const seenEmails = new Set();
        const seenPhones = new Set();
        const seenUrls = new Set();
        const seenSocialProfiles = new Set();
        const seenPixKeys = new Set();
        let urlIndex = 1;

        const addNoteEntry = (text) => {
            if (!text) return;
            noteEntries.push(text);
        };

        const addUrlEntry = (url, label = '', typeTag = '') => {
            if (!url) return;
            const trimmedUrl = url.trim();
            if (!trimmedUrl) return;
            const lowerUrl = trimmedUrl.toLowerCase();
            if (seenUrls.has(lowerUrl)) return;
            const sanitizedUrl = sanitizeForVcard(trimmedUrl);
            vcardLines.push(`item${urlIndex}.URL:${sanitizedUrl}`);
            if (label) {
                vcardLines.push(`item${urlIndex}.X-ABLabel:${sanitizeForVcard(label)}`);
            }
            if (typeTag) {
                vcardLines.push(`URL;TYPE=${typeTag}:${sanitizedUrl}`);
            } else {
                vcardLines.push(`URL:${sanitizedUrl}`);
            }
            seenUrls.add(lowerUrl);
            urlIndex += 1;
        };

        const addSocialProfile = (url, socialType) => {
            if (!url || !socialType) return;
            const trimmedUrl = url.trim();
            if (!trimmedUrl) return;
            const key = `${socialType}|${trimmedUrl.toLowerCase()}`;
            if (seenSocialProfiles.has(key)) return;
            vcardLines.push(`X-SOCIALPROFILE;TYPE=${socialType}:${sanitizeForVcard(trimmedUrl)}`);
            seenSocialProfiles.add(key);
        };

        if (sanitizedName) {
            vcardLines.push(`FN:${sanitizedName}`);
            vcardLines.push(`N:${sanitizedLastName || ''};${sanitizedFirstName || ''};;;`);
        } else {
            vcardLines.push('N:;;;;');
        }

        addNoteEntry('Contato salvo via Conecta King.');

        if (SELECTORS.bioInput && SELECTORS.bioInput.value) {
            addNoteEntry(`Bio: ${SELECTORS.bioInput.value}`);
        }

        const publicLinkUrl = normalizeUrlForVcard('generic', SELECTORS.publicLink?.href || '');
        if (publicLinkUrl) {
            addUrlEntry(publicLinkUrl, 'Cartf£o Digital', 'WORK');
        }

        if (slugCandidate) {
            const slugUrl = normalizeUrlForVcard('generic', `https://tag.conectaking.com.br/${slugCandidate.replace(/^\/+/, '')}`);
            if (slugUrl) {
                addUrlEntry(slugUrl, 'Cartf£o Digital', 'PROFILE');
            }
        }

        const itemElements = document.querySelectorAll('#items-container .item, #items-container .module-item');

        // Primeiro: buscar email e telefone principais
        itemElements.forEach(itemEl => {
            const itemType = itemEl.dataset.itemType;
            if (!itemType) return;
            const destinationInput = itemEl.querySelector('.item-destination-url-input');
            if (destinationInput && destinationInput.value) {
                if (itemType === 'email' && !rawEmail) {
                    rawEmail = extractEmailAddress(destinationInput.value) || destinationInput.value;
                } else if (itemType === 'whatsapp' && !rawPhone) {
                    rawPhone = destinationInput.value.replace(/\D/g, '');
                } else if (itemType === 'telegram' && !rawPhone) {
                    rawPhone = destinationInput.value.replace(/\D/g, '');
                }
            }
        });

        // Adicionar email e telefone principais ao vCard
        if (rawPhone) {
            const sanitizedPrimaryPhone = normalizePhoneNumber(rawPhone);
            if (sanitizedPrimaryPhone) {
                vcardLines.push(`TEL;TYPE=CELL,VOICE:${sanitizedPrimaryPhone}`);
                seenPhones.add(sanitizedPrimaryPhone);
            }
        }
        if (rawEmail) {
            const sanitizedPrimaryEmail = sanitizeForVcard(rawEmail.toLowerCase());
            if (sanitizedPrimaryEmail) {
                vcardLines.push(`EMAIL;TYPE=INTERNET:${sanitizedPrimaryEmail}`);
                seenEmails.add(sanitizedPrimaryEmail);
            }
        }

        // Segundo: processar todos os itens
        itemElements.forEach(itemEl => {
            const itemType = itemEl.dataset.itemType;
            if (!itemType) return;

            const rawTitle = (itemEl.querySelector('.item-title-input')?.value || '').trim();
            const itemLabel = rawTitle || ITEM_TYPE_LABELS_FOR_VCARD[itemType] || 'Link';

            if (itemType === 'pix' || itemType === 'pix_qrcode') {
                const pixKeyRaw = (itemEl.querySelector('.item-pix-key-input')?.value || '').trim();
                const pixRecipientRaw = (itemEl.querySelector('.item-recipient-name-input')?.value || '').trim();
                const pixAmountRaw = (itemEl.querySelector('.item-pix-amount-input')?.value || '').trim();
                const pixDescriptionRaw = (itemEl.querySelector('.item-pix-description-input')?.value || '').trim();

                const pixDetails = [itemLabel];
                if (pixRecipientRaw) pixDetails.push(`Recebedor: ${pixRecipientRaw}`);
                if (pixKeyRaw) {
                    pixDetails.push(`Chave: ${pixKeyRaw}`);
                    const sanitizedPixKey = sanitizeForVcard(pixKeyRaw);
                    if (sanitizedPixKey && !seenPixKeys.has(sanitizedPixKey)) {
                        vcardLines.push(`X-PIX-KEY:${sanitizedPixKey}`);
                        seenPixKeys.add(sanitizedPixKey);
                    }
                }
                if (pixAmountRaw) pixDetails.push(`Valor: ${pixAmountRaw}`);
                if (pixDescriptionRaw) pixDetails.push(pixDescriptionRaw);
                addNoteEntry(pixDetails.join(' - '));
                return;
            }

            let rawUrl = '';
            const destinationInput = itemEl.querySelector('.item-destination-url-input');
            if (destinationInput && destinationInput.value) {
                rawUrl = destinationInput.value;
            } else if (itemType === 'pdf' || itemType === 'pdf_embed') {
                rawUrl = itemEl.querySelector('.item-pdf-url-input')?.value || '';
            }

            if (itemType === 'email') {
                const emailFromItem = extractEmailAddress(rawUrl);
                if (emailFromItem) {
                    const sanitizedItemEmail = sanitizeForVcard(emailFromItem);
                    if (!seenEmails.has(sanitizedItemEmail)) {
                        vcardLines.push(`EMAIL;TYPE=INTERNET:${sanitizedItemEmail}`);
                        seenEmails.add(sanitizedItemEmail);
                    }
                }
            }

            if (itemType === 'whatsapp') {
                const whatsappPhone = normalizePhoneNumber(rawUrl);
                if (whatsappPhone && !seenPhones.has(whatsappPhone)) {
                    vcardLines.push(`TEL;TYPE=CELL:${whatsappPhone}`);
                    seenPhones.add(whatsappPhone);
                }
            }

            const normalizedUrl = normalizeUrlForVcard(itemType, rawUrl);
            const socialType = SOCIAL_PROFILE_TYPES[itemType] || null;

            if (normalizedUrl) {
                if (/^mailto:/i.test(normalizedUrl)) {
                    const emailAddress = extractEmailAddress(normalizedUrl);
                    if (emailAddress) {
                        const sanitizedMailUrl = sanitizeForVcard(emailAddress);
                        if (!seenEmails.has(sanitizedMailUrl)) {
                            vcardLines.push(`EMAIL;TYPE=INTERNET:${sanitizedMailUrl}`);
                            seenEmails.add(sanitizedMailUrl);
                        }
                    }
                } else if (/^tel:/i.test(normalizedUrl)) {
                    const telValue = normalizedUrl.replace(/^tel:/i, '');
                    if (telValue && !seenPhones.has(telValue)) {
                        vcardLines.push(`TEL;TYPE=CELL:${telValue}`);
                        seenPhones.add(telValue);
                    }
                } else {
                    const typeTag = URL_TYPE_TAGS[itemType] || 'OTHER';
                    addUrlEntry(normalizedUrl, itemLabel, typeTag);
                }
                addSocialProfile(normalizedUrl, socialType);
            } else if (destinationInput && destinationInput.value.trim()) {
                addNoteEntry(`${itemLabel}: ${destinationInput.value.trim()}`);
            }

            const summaryParts = [itemLabel];
            if (normalizedUrl) {
                summaryParts.push(normalizedUrl);
            } else if (destinationInput && destinationInput.value.trim()) {
                summaryParts.push(destinationInput.value.trim());
            }
            if (itemType === 'pix' || itemType === 'pix_qrcode') {
                const pixKeyRaw = (itemEl.querySelector('.item-pix-key-input')?.value || '').trim();
                if (pixKeyRaw) summaryParts.push(`Chave: ${pixKeyRaw}`);
            }
            addNoteEntry(summaryParts.join(' - '));
        });

        if (noteEntries.length > 0) {
            const noteText = sanitizeForVcard(noteEntries.join('\n'));
            vcardLines.push(`NOTE:${noteText}`);
        }

        vcardLines.push('END:VCARD');

        const vcardContent = vcardLines.join('\r\n');

        buttonEl.href = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcardContent)}`;

        const fallbackName = rawName || slugCandidate || 'contato';
        const normalizedBase = typeof fallbackName.normalize === 'function'
            ? fallbackName.normalize('NFD')
            : fallbackName;

        const fileName = normalizedBase
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '_')
            .replace(/_{2,}/g, '_')
            .replace(/^_+|_+$/g, '') || 'contato';

        buttonEl.setAttribute('download', `${fileName}.vcf`);

        if (!sanitizedName) {
            buttonEl.setAttribute('aria-disabled', 'true');
            buttonEl.classList.add('is-disabled');
        } else {
            buttonEl.removeAttribute('aria-disabled');
            buttonEl.classList.remove('is-disabled');
        }
    }


    // Relatórios: js/dashboard-relatorios.js (window.loadReportsData / DashboardRelatorios)

    function updateLivePreviewFromForm() {
        if (!window.currentProfileData || !window.currentProfileData.details) return;
        const { details } = window.currentProfileData;

        SELECTORS.previewName.textContent = SELECTORS.displayNameInput.value || 'Seu Nome';
        SELECTORS.previewBio.textContent = SELECTORS.bioInput.value || 'Sua biografia...';
        SELECTORS.previewScreen.style.fontFamily = `'${SELECTORS.fontFamilySelect.value}', sans-serif`;
        SELECTORS.previewName.style.color = SELECTORS.textColorPicker.value;
        SELECTORS.previewBio.style.color = SELECTORS.textColorPicker.value;
        const avatarUrl = details.profile_image_url || DEFAULT_AVATAR_PLACEHOLDER;
        setAvatarSrc(SELECTORS.dashboardPhotoPreview, avatarUrl);
        SELECTORS.previewAvatar.style.borderColor = SELECTORS.backgroundColorPicker.value;
        setAvatarSrc(SELECTORS.previewAvatar, avatarUrl);

        // Aplicar formato do avatar no preview
        const avatarFormat = details.avatar_format || 'circular';
        applyAvatarFormatToPreview(SELECTORS.previewAvatar, avatarFormat);

        const vcardToggleChecked = document.querySelector('input[name="vcard-toggle"]:checked');
        const showVcard = vcardToggleChecked ? vcardToggleChecked.value === 'true' : true;
        let vcardBtn = document.getElementById('preview-save-contact-btn');
        if (!vcardBtn) {
            vcardBtn = document.createElement('a');
            vcardBtn.id = 'preview-save-contact-btn';
            vcardBtn.className = 'preview-link-button';
            vcardBtn.innerHTML = `<i class="fas fa-address-card"></i><span>Salvar Contato</span>`;

            const spacer = document.createElement('div');
            spacer.id = 'preview-vcard-spacer';
            spacer.style.height = '16px'; // O mesmo valor do 'gap' dos outros links

            const parentNode = SELECTORS.previewBio.parentNode;
            if (parentNode) {
                parentNode.insertBefore(vcardBtn, SELECTORS.previewItemsContainer);
                parentNode.insertBefore(spacer, SELECTORS.previewItemsContainer);
            }
        }

        // Sempre mostrar o botão; quando oculto, exibir como desativado (não sumir)
        const spacer = document.getElementById('preview-vcard-spacer');
        vcardBtn.style.display = 'flex';
        if (spacer) spacer.style.display = 'block';
        vcardBtn.innerHTML = `<i class="fas fa-address-card"></i><span>Salvar Contato${!showVcard ? ' (Desativado)' : ''}</span>`;
        if (showVcard) {
            vcardBtn.removeAttribute('disabled');
            vcardBtn.style.opacity = '';
            vcardBtn.style.cursor = '';
            vcardBtn.style.pointerEvents = '';
            vcardBtn.classList.remove('preview-link-disabled');
        } else {
            vcardBtn.classList.add('preview-link-disabled');
            vcardBtn.style.opacity = '0.65';
            vcardBtn.style.cursor = 'default';
            vcardBtn.style.pointerEvents = 'none';
            vcardBtn.removeAttribute('href'); vcardBtn.removeAttribute('role');
        }
        if (showVcard) updateVcardPreviewButton(vcardBtn);


        const allPreviewButtons = document.querySelectorAll('.preview-link-button');

        const buttonStyles = {
            backgroundColor: hexToRgba(SELECTORS.buttonColorPicker.value, SELECTORS.buttonOpacityPicker.value),
            color: SELECTORS.buttonTextColorPicker.value,
            borderRadius: `${SELECTORS.radiusTL?.value || 12}px ${SELECTORS.radiusTR?.value || 12}px ${SELECTORS.radiusBR?.value || 12}px ${SELECTORS.radiusBL?.value || 12}px`,
            fontSize: `${SELECTORS.buttonFontSizePicker.value}px`,
            justifyContent: { left: 'flex-start', center: 'center', right: 'flex-end' }[document.querySelector('input[name="button-align"]:checked').value]
        };

        allPreviewButtons.forEach(btn => {
            Object.assign(btn.style, buttonStyles);
        });

        const bgType = document.querySelector('input[name="bg-type"]:checked').value;
        if (bgType === 'image') {
            const imageUrl = SELECTORS.backgroundImageUrlInput.value;
            SELECTORS.previewScreen.style.backgroundImage = `url('${imageUrl}')`;
            SELECTORS.previewScreen.style.backgroundSize = 'cover';
            SELECTORS.previewScreen.style.backgroundPosition = 'center';
            SELECTORS.previewScreen.style.backgroundColor = '#000';
        } else {
            SELECTORS.previewScreen.style.backgroundImage = 'none';
            SELECTORS.previewScreen.style.backgroundColor = SELECTORS.backgroundColorPicker.value;
        }

        let bgLayer = document.getElementById('preview-background-layer');
        if (!bgLayer) {
            bgLayer = document.createElement('div');
            bgLayer.id = 'preview-background-layer';
            bgLayer.style.position = 'absolute';
            bgLayer.style.top = 0;
            bgLayer.style.left = 0;
            bgLayer.style.width = '100%';
            bgLayer.style.height = '100%';
            bgLayer.style.zIndex = '-1';
            bgLayer.style.borderRadius = 'inherit';
            bgLayer.style.backgroundSize = 'cover';
            bgLayer.style.backgroundPosition = 'center';
            bgLayer.style.transition = 'opacity 0.3s ease';
            SELECTORS.previewScreen.style.position = 'relative';
            SELECTORS.previewScreen.prepend(bgLayer);
        }

        if (bgType === 'image') {
            const imageUrl = SELECTORS.backgroundImageUrlInput.value;
            const imageOpacity = SELECTORS.backgroundImageOpacityPicker.value;

            SELECTORS.previewScreen.style.backgroundColor = SELECTORS.backgroundColorPicker.value;

            bgLayer.style.backgroundImage = `url('${imageUrl}')`;
            bgLayer.style.opacity = imageOpacity;
            SELECTORS.backgroundImageOpacityValue.textContent = `${Math.round(imageOpacity * 100)}%`;

        } else {
            bgLayer.style.backgroundImage = 'none';
            bgLayer.style.opacity = '1';
            SELECTORS.previewScreen.style.backgroundColor = SELECTORS.backgroundColorPicker.value;
        }

        const cardColor = SELECTORS.cardBackgroundColorPicker.value;
        const cardOpacity = SELECTORS.cardOpacityPicker.value;
        SELECTORS.previewCard.style.backgroundColor = hexToRgba(cardColor, cardOpacity);
        SELECTORS.cardOpacityValue.textContent = `${Math.round(cardOpacity * 100)}%`;

        const buttonOpacity = SELECTORS.buttonOpacityPicker.value;
        const tl = parseInt(SELECTORS.radiusTL?.value || 12, 10);
        const tr = parseInt(SELECTORS.radiusTR?.value || 12, 10);
        const br = parseInt(SELECTORS.radiusBR?.value || 12, 10);
        const bl = parseInt(SELECTORS.radiusBL?.value || 12, 10);
        SELECTORS.buttonBorderRadiusValue.textContent = `${tl}px ${tr}px ${br}px ${bl}px`;
        const borderRadius = `${tl}px ${tr}px ${br}px ${bl}px`;
        const selectedAlign = document.querySelector('input[name="button-align"]:checked').value;
        const fontSize = `${SELECTORS.buttonFontSizePicker.value}px`;
        const justifyContentMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
        const buttonJustifyContent = justifyContentMap[selectedAlign];

        const itemsContainer = SELECTORS.previewItemsContainer;
        SELECTORS.previewItemsContainer.innerHTML = '';

        // Bíblia: não está no items-container (é especial), adicionar ao preview sempre (ativo ou desativado)
        const bibleItem = (window.currentProfileData?.items || []).find(function (it) { return it.item_type === 'bible'; });
        if (bibleItem) {
            const bibleToggleChecked = document.querySelector('input[name="bible-toggle"]:checked');
            const showBible = bibleToggleChecked ? bibleToggleChecked.value === 'true' : true;
            const bibleDisabled = !showBible;
            const bibleEl = document.createElement(bibleDisabled ? 'div' : 'a');
            bibleEl.className = 'preview-link-button' + (bibleDisabled ? ' preview-link-disabled' : '');
            if (!bibleDisabled) bibleEl.href = '#';
            bibleEl.innerHTML = `<i class="fas fa-bible"></i> <span>Bíblia${bibleDisabled ? ' (Desativado)' : ''}</span>`;
            bibleEl.style.backgroundColor = hexToRgba(SELECTORS.buttonColorPicker.value, bibleDisabled ? Math.max(0.3, buttonOpacity * 0.5) : buttonOpacity);
            bibleEl.style.color = SELECTORS.buttonTextColorPicker.value;
            bibleEl.style.borderRadius = borderRadius;
            bibleEl.style.justifyContent = buttonJustifyContent;
            bibleEl.style.fontSize = fontSize;
            if (bibleDisabled) { bibleEl.style.opacity = '0.65'; bibleEl.style.cursor = 'default'; bibleEl.style.pointerEvents = 'none'; }
            itemsContainer.appendChild(bibleEl);
        }

        // IMPORTANTE: Forçar leitura dos elementos atualizados do DOM
        // Usar querySelectorAll novamente para garantir que pegamos os elementos mais recentes
        const allItems = document.querySelectorAll('#items-container .item, #items-container .module-item');
        console.log(`Y"" Atualizando preview com ${allItems.length} itens do DOM`);

        allItems.forEach(itemEl => {
            const itemType = itemEl.dataset.itemType;

            // Verificar se o módulo está ativo (toggle) - funciona tanto para .module-item quanto .item
            const toggleInput = itemEl.querySelector('.module-toggle-input');
            let isActive = true; // padrão: ativo
            if (toggleInput) {
                isActive = toggleInput.checked;
            } else {
                // Se não tiver toggle, verificar dataset ou assumir ativo
                isActive = itemEl.dataset.isActive !== 'false';
            }

            // Bíblia: verificar se está visível (Oculto = desativado, mas ainda mostramos o botão)
            let isBibleVisible = true;
            if (itemType === 'bible') {
                const bibleToggleChecked = document.querySelector('input[name="bible-toggle"]:checked');
                isBibleVisible = bibleToggleChecked ? bibleToggleChecked.value === 'true' : true;
            }

            const isDisabled = !isActive || (itemType === 'bible' && !isBibleVisible);

            // Para módulos, pegar o título do .module-name, senão pegar do input
            const title = itemEl.querySelector('.module-name')?.textContent?.trim() || itemEl.querySelector('.item-title-input')?.value || '';
            let previewEl;

            if (itemType === 'wifi') {
                const wifiFmt = itemEl.querySelector('.wifi-display-format-input:checked')?.value || 'button';
                const wifiSsid = (itemEl.querySelector('.wifi-ssid-input')?.value || '').trim();
                const wifiPassword = itemEl.querySelector('.wifi-password-input')?.value ?? '';
                const wifiSecurity = itemEl.querySelector('.wifi-security-input')?.value || 'WPA';
                const wifiHidden = !!itemEl.querySelector('.wifi-hidden-input')?.checked;
                const wifiBannerUrl = (itemEl.querySelector('.wifi-banner-url-input')?.value || '').trim();
                const wifiLogoUrl = (itemEl.querySelector('.wifi-logo-url-input')?.value || '').trim();
                const wifiLogoSize = Math.min(600, Math.max(20, parseInt(itemEl.querySelector('.wifi-logo-size-input')?.value || itemEl.dataset.logoSize || '48', 10) || 48));
                const wifiSafeTitle = (title || 'Wi-Fi').trim();
                const wifiCfgEnc = encodeURIComponent(JSON.stringify({
                    ssid: wifiSsid,
                    password: wifiPassword,
                    security: wifiSecurity,
                    hidden: wifiHidden,
                    display_format: wifiFmt
                }));

                if (wifiFmt === 'banner' && wifiBannerUrl && !wifiBannerUrl.includes('placeholder')) {
                    previewEl = document.createElement('div');
                    previewEl.className = 'preview-wifi-banner-root';
                    const wifiBanBtn = document.createElement('button');
                    wifiBanBtn.type = 'button';
                    wifiBanBtn.className = 'wifi-banner-btn';
                    wifiBanBtn.setAttribute('data-wifi-config', wifiCfgEnc);
                    wifiBanBtn.setAttribute('aria-label', wifiSsid ? `Wi-Fi: rede ${wifiSsid}` : 'Abrir QR Wi-Fi');
                    wifiBanBtn.innerHTML = `<img src="${wifiBannerUrl}" alt="${wifiSsid ? 'Rede: ' + wifiSsid : wifiSafeTitle}" style="width:100%;height:auto;display:block;border-radius:12px;" loading="lazy">`;
                    previewEl.appendChild(wifiBanBtn);
                } else {
                    previewEl = document.createElement('button');
                    previewEl.type = 'button';
                    previewEl.className = 'preview-link-button wifi-profile-button' + (isDisabled ? ' preview-link-disabled' : '');
                    previewEl.setAttribute('data-wifi-config', wifiCfgEnc);
                    let wifiIconClass = 'fas fa-wifi';
                    const wifiIconEl = itemEl.querySelector('.wifi-logo-section .item-icon-picker i, .item-icon-picker i');
                    if (wifiIconEl) wifiIconClass = wifiIconEl.className.trim();
                    const wifiLabels = wifiSsid
                        ? `<span class="wifi-btn-ssid">${wifiSsid}</span>${wifiSafeTitle && wifiSafeTitle !== wifiSsid ? `<span class="wifi-btn-card-title">${wifiSafeTitle}</span>` : ''}`
                        : `<span class="wifi-btn-fallback">${wifiSafeTitle}${isDisabled ? ' (Desativado)' : ''}</span>`;
                    if (wifiLogoUrl && !wifiLogoUrl.includes('placeholder')) {
                        previewEl.innerHTML = `<img src="${wifiLogoUrl}" alt="" class="wifi-logo-img" style="width:${wifiLogoSize}px;height:${wifiLogoSize}px;object-fit:contain;border-radius:8px;flex-shrink:0;margin-right:8px;"><i class="${wifiIconClass}" style="display:none;"></i><span class="wifi-button-labels">${wifiLabels}</span>`;
                    } else {
                        previewEl.innerHTML = `<i class="${wifiIconClass}"></i><span class="wifi-button-labels">${wifiLabels}</span>`;
                    }
                }

                previewEl.style.backgroundColor = hexToRgba(SELECTORS.buttonColorPicker.value, isDisabled ? Math.max(0.3, buttonOpacity * 0.5) : buttonOpacity);
                previewEl.style.color = SELECTORS.buttonTextColorPicker.value;
                previewEl.style.borderRadius = borderRadius;
                previewEl.style.justifyContent = buttonJustifyContent;
                previewEl.style.fontSize = fontSize;
                if (isDisabled) {
                    previewEl.style.opacity = '0.65';
                    previewEl.style.cursor = 'default';
                    previewEl.style.pointerEvents = 'none';
                } else {
                    previewEl.style.cursor = 'pointer';
                    previewEl.style.pointerEvents = 'auto';
                }
            } else if (['link', 'pix', 'pix_qrcode', 'pdf', 'whatsapp', 'telegram', 'email', 'facebook', 'instagram', 'pinterest', 'linkedin', 'portfolio', 'reddit', 'tiktok', 'twitch', 'twitter', 'youtube', 'spotify', 'convite', 'bible', 'digital_form', 'sales_page', 'location'].includes(itemType)) {
                previewEl = document.createElement(isDisabled ? 'div' : 'a');
                previewEl.className = 'preview-link-button' + (isDisabled ? ' preview-link-disabled' : '');

                previewEl.style.backgroundColor = hexToRgba(SELECTORS.buttonColorPicker.value, isDisabled ? Math.max(0.3, buttonOpacity * 0.5) : buttonOpacity);
                previewEl.style.color = SELECTORS.buttonTextColorPicker.value;
                if (isDisabled) {
                    previewEl.style.opacity = '0.65';
                    previewEl.style.cursor = 'default';
                    previewEl.style.pointerEvents = 'none';
                }
                previewEl.style.borderRadius = borderRadius;
                previewEl.style.justifyContent = buttonJustifyContent;
                previewEl.style.fontSize = fontSize;

                // Para link personalizado, verificar se tem logo (image_url)
                // Tentar múltiplas fontes para garantir que pegamos o valor correto
                const imageUrlInput = itemEl.querySelector('.item-image-url-input');
                let imageUrl = imageUrlInput?.value || '';

                // Se não encontrou no input, tentar no dataset ou no elemento de preview
                if (!imageUrl || imageUrl.includes('placeholder')) {
                    imageUrl = itemEl.dataset.imageUrl || '';
                }
                if (!imageUrl || imageUrl.includes('placeholder')) {
                    const logoPreview = itemEl.querySelector('.item-logo-preview');
                    if (logoPreview && logoPreview.src) {
                        imageUrl = logoPreview.src;
                    }
                }

                const hasLogo = imageUrl && imageUrl.trim() && !imageUrl.includes('placeholder');
                // No preview ao vivo, usar o tamanho configurado (ou 24px padrão)
                // Mas limitar para não ficar muito grande no preview
                const logoSizeInput = itemEl.querySelector('.item-logo-size-input');
                const logoSizeConfig = logoSizeInput ? parseInt(logoSizeInput.value) || 24 : (itemEl.dataset.logoSize ? parseInt(itemEl.dataset.logoSize) : 24);
                const logoSizePreview = Math.min(logoSizeConfig, 48); // Limitar preview a 48px máximo

                // Detectar tipo de imagem para aplicar estilo correto (inicializar sempre)
                // Padrão: circular (JPEG/foto) se não conseguir detectar
                let borderRadiusPreview = '50%';
                let objectFitPreview = 'contain'; // Padrão: completo, sem corte
                if (hasLogo) {
                    const imageUrlLower = imageUrl.toLowerCase();

                    // Verificar logo_fit_mode do item se disponível
                    const logoFitModeInput = itemEl.querySelector('.item-logo-fit-mode-input');
                    const logoFitMode = logoFitModeInput?.value || itemEl.dataset.logoFitMode || 'contain';

                    if (imageUrlLower.includes('.png')) {
                        // PNG: sem border-radius (logo)
                        borderRadiusPreview = '0';
                        // Usar logo_fit_mode se disponível, senão 'contain' (completo, sem corte)
                        objectFitPreview = (logoFitMode && ['contain', 'cover'].includes(logoFitMode)) ? logoFitMode : 'contain';
                    } else if (imageUrlLower.includes('.jpg') || imageUrlLower.includes('.jpeg')) {
                        // JPEG: círculo (foto)
                        borderRadiusPreview = '50%';
                        // Usar logo_fit_mode se disponível, senão 'cover' (preenche espaço)
                        objectFitPreview = (logoFitMode && ['contain', 'cover'].includes(logoFitMode)) ? logoFitMode : 'cover';
                    } else {
                        // URL sem extensão (Cloudflare R2) - verificar logo_fit_mode
                        // Se não tiver extensão, assumir PNG (logo) por padrão
                        borderRadiusPreview = '0';
                        objectFitPreview = (logoFitMode && ['contain', 'cover'].includes(logoFitMode)) ? logoFitMode : 'contain';
                    }
                }

                let iconClass = null;
                const iconPicker = itemEl.querySelector('.item-icon-picker');
                if (iconPicker) {
                    const iconElement = iconPicker.querySelector('i');
                    iconClass = iconElement ? iconElement.className.trim() : null;
                }

                const defaultIconsMap = { link: 'fas fa-link', convite: 'fas fa-envelope-open-text', bible: 'fas fa-bible', pix: 'fa-solid fa-qrcode', pix_qrcode: 'fas fa-qrcode', wifi: 'fas fa-wifi', digital_form: 'fas fa-file-signature', sales_page: 'fas fa-store' };
                const defaultTitlesMap = { link: 'Link Personalizado', convite: 'Convite Digital', bible: 'Bíblia', pix: 'PIX', pix_qrcode: 'PIX QR Code', wifi: 'Wi-Fi', digital_form: 'Formulário King', sales_page: 'Página de Vendas' };
                const displayTitle = (title || defaultTitlesMap[itemType] || 'Novo Item') + (isDisabled ? ' (Desativado)' : '');
                if (hasLogo && itemType === 'link') {
                    const defaultIconFallback = 'fas fa-link';
                    previewEl.innerHTML = `<img src="${imageUrl}" alt="${displayTitle}" style="width: ${logoSizePreview}px; height: ${logoSizePreview}px; object-fit: ${objectFitPreview}; border-radius: ${borderRadiusPreview}; margin-right: 8px; flex-shrink: 0;" onerror="this.style.display='none'; const nextIcon = this.nextElementSibling; if (nextIcon && nextIcon.tagName === 'I') nextIcon.style.display='inline-block';"><i class="${iconClass || defaultIconFallback}" style="display: none;"></i> <span>${displayTitle}</span>`;
                } else {
                    const defaultIcon = defaultIconsMap[itemType] || 'fas fa-link';
                    previewEl.innerHTML = `<i class="${iconClass || defaultIcon}"></i> <span>${displayTitle}</span>`;
                }

            } else if (itemType === 'banner') {
                const bannerDestParsed = parseBannerDestination(itemEl.querySelector('.item-destination-url-input')?.value || '');
                const bannerPrimary = bannerDestParsed.primary_url || '#';
                previewEl = document.createElement('div');
                previewEl.className = 'preview-banner-wrap';
                // Funf§f£o para sanitizar URL de imagem do banner
                function sanitizeBannerImageUrl(url) {
                    const defaultBannerPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDYwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjMwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiPkJhbm5lcjwvdGV4dD4KPC9zdmc+Cg==';
                    if (!url || typeof url !== 'string') {
                        return defaultBannerPlaceholder;
                    }
                    const trimmedUrl = url.trim();
                    // Rejeitar URLs de placeholder externos que podem falhar
                    if (trimmedUrl.includes('placeholder.com') || trimmedUrl.includes('via.placeholder')) {
                        return defaultBannerPlaceholder;
                    }
                    // Aceitar apenas URLs vf¡lidas: data URIs ou http/https
                    if (trimmedUrl.startsWith('data:image/') ||
                        trimmedUrl.startsWith('http://') ||
                        trimmedUrl.startsWith('https://')) {
                        return trimmedUrl;
                    }
                    return defaultBannerPlaceholder;
                }
                const imageUrlInput = itemEl.querySelector('.item-image-url-input');
                let imageUrl = imageUrlInput ? imageUrlInput.value : '';
                imageUrl = sanitizeBannerImageUrl(imageUrl);
                if (bannerPrimary && bannerPrimary !== '#') {
                    const banLink = document.createElement('a');
                    banLink.className = 'preview-banner-item';
                    banLink.href = bannerPrimary;
                    banLink.target = '_blank';
                    banLink.rel = 'noopener noreferrer';
                    banLink.innerHTML = `<img src="${imageUrl}" alt="Banner Preview" style="width:100%;height:auto;display:block;border-radius:12px;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDYwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjMwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiPkJhbm5lcjwvdGV4dD4KPC9zdmc+Cg=='" loading="lazy">`;
                    previewEl.appendChild(banLink);
                } else {
                    const banImg = document.createElement('img');
                    banImg.src = imageUrl;
                    banImg.alt = 'Banner Preview';
                    banImg.style.cssText = 'width:100%;height:auto;display:block;border-radius:12px;';
                    previewEl.appendChild(banImg);
                }
            } else if (itemType === 'carousel' || itemType === 'banner_carousel') {
                // ===== CARROSSEL / BANNER_CAROUSEL - Preview =====
                previewEl = document.createElement('div');
                previewEl.className = 'preview-carousel-item';
                previewEl.style.cssText = 'width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.2); position: relative;';

                const jsonInput = itemEl.querySelector('.carousel-images-json-new');
                let carouselImages = [];
                if (jsonInput && jsonInput.value) {
                    try {
                        carouselImages = JSON.parse(jsonInput.value);
                    } catch (e) {
                        carouselImages = [];
                    }
                }

                // Filtrar placeholders
                const realImages = carouselImages.filter(img => {
                    const url = typeof img === 'string' ? img : (img.image_url || img);
                    return url && !url.includes('placeholder') && !url.startsWith('data:image/svg');
                });

                const firstImage = realImages.length > 0 ? realImages[0] : '';
                // ===== EXATAMENTE IGUAL AO BANNER: apenas width: 100%; height: auto; sem object-fit =====
                previewEl.innerHTML = `
                <img src="${firstImage}" alt="Carrossel Preview" style="width: 100%; height: auto; display: block;" loading="lazy" onerror="this.style.display='none'">
                ${realImages.length > 1 ? `<div style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 4px; font-size: 0.85rem;"><i class="fas fa-images"></i> ${realImages.length} imagens</div>` : ''}
            `;
            } else if (itemType === 'youtube_embed') {
                // Renderizar iframe do YouTube com URL convertida
                const destInput = itemEl.querySelector('.item-destination-url-input');
                const youtubeUrl = destInput ? destInput.value : '';
                const embedUrl = convertYouTubeUrlToEmbed(youtubeUrl);

                if (embedUrl && embedUrl !== youtubeUrl) {
                    // URL vf¡lida convertida para embed
                    previewEl = document.createElement('div');
                    previewEl.className = 'preview-embed-container';
                    previewEl.innerHTML = `
                    <iframe 
                        src="${embedUrl}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen
                        style="width: 100%; aspect-ratio: 16/9; border-radius: 12px;"
                    ></iframe>
                `;
                } else {
                    // Placeholder se nf£o houver URL vf¡lida
                    previewEl = document.createElement('div');
                    previewEl.className = 'preview-embed-placeholder';
                    const iconClass = itemEl.querySelector('.item-icon-picker')?.className.replace(' item-icon-picker', '').trim();
                    previewEl.innerHTML = `<i class="${iconClass}"></i><span>${title || 'YouTube Incorporado'}</span>`;
                }
            } else if (itemType === 'instagram_embed' || itemType === 'tiktok_embed' || itemType === 'spotify_embed' || itemType === 'linkedin_embed' || itemType === 'pinterest_embed' || itemType === 'pdf_embed') {
                previewEl = document.createElement('div');
                previewEl.className = 'preview-embed-placeholder';
                const iconClass = itemEl.querySelector('.item-icon-picker')?.className.replace(' item-icon-picker', '').trim();
                previewEl.innerHTML = `<i class="${iconClass}"></i><span>${title || 'Conteúdo Incorporado'}</span>`;
            }

            if (previewEl) itemsContainer.appendChild(previewEl);
        });

        if (SELECTORS.buttonOpacityValue) {
            SELECTORS.buttonOpacityValue.textContent = `${Math.round(buttonOpacity * 100)}%`;
        }
        SELECTORS.buttonFontSizeValue.textContent = fontSize;
    }

    // Funf§f£o para preservar o estado local dos itens antes de recarregar
    function preserveLocalItemStates() {
        const preservedStates = {};
        const itemElements = document.querySelectorAll('#items-container .item, #items-container .module-item');

        itemElements.forEach(itemEl => {
            const itemId = itemEl.dataset.id;
            const itemType = itemEl.dataset.itemType;

            preservedStates[itemId] = {
                itemType: itemType,
                aspectRatio: itemEl.dataset.aspectRatio || null
            };

            // Preservar campos específicos por tipo de item
            switch (itemType) {
                case 'banner':
                    const bannerImageInput = itemEl.querySelector('.item-image-url-input');
                    const bannerDestInput = itemEl.querySelector('.item-destination-url-input');
                    const bannerPreview = itemEl.querySelector('.banner-preview-thumb');
                    if (bannerImageInput) preservedStates[itemId].image_url = bannerImageInput.value;
                    if (bannerDestInput) preservedStates[itemId].destination_url = bannerDestInput.value;
                    if (bannerPreview) preservedStates[itemId].preview_src = bannerPreview.src;
                    // Verificar se f© carrossel
                    if (itemEl.classList.contains('banner-carousel')) {
                        preservedStates[itemId].isCarousel = true;
                    }
                    break;
                case 'link':
                    // Link personalizado - preservar title, destination_url, image_url e icon_class
                    const linkTitleInput = itemEl.querySelector('.item-title-input');
                    const linkDestInput = itemEl.querySelector('.item-destination-url-input');
                    const linkImageUrlInput = itemEl.querySelector('.item-image-url-input');
                    const linkIconPicker = itemEl.querySelector('.item-icon-picker');
                    if (linkTitleInput) preservedStates[itemId].title = linkTitleInput.value;
                    if (linkDestInput) preservedStates[itemId].destination_url = linkDestInput.value;
                    if (linkImageUrlInput) preservedStates[itemId].image_url = linkImageUrlInput.value || null;
                    if (linkIconPicker) {
                        const iconElement = linkIconPicker.querySelector('i');
                        preservedStates[itemId].icon_class = iconElement ? iconElement.className.trim() : null;
                    }
                    // Preservar tamanho da logo
                    const linkLogoSizeInput = itemEl.querySelector('.item-logo-size-input');
                    if (linkLogoSizeInput) {
                        preservedStates[itemId].logo_size = parseInt(linkLogoSizeInput.value) || 24;
                    } else if (itemEl.dataset.logoSize) {
                        preservedStates[itemId].logo_size = parseInt(itemEl.dataset.logoSize);
                    }
                    break;
                case 'whatsapp':
                case 'telegram':
                case 'email':
                case 'facebook':
                case 'instagram':
                case 'pinterest':
                case 'reddit':
                case 'tiktok':
                case 'twitch':
                case 'twitter':
                case 'youtube':
                case 'linkedin':
                case 'portfolio':
                case 'spotify':
                case 'instagram_embed':
                case 'youtube_embed':
                case 'tiktok_embed':
                case 'spotify_embed':
                case 'linkedin_embed':
                case 'pinterest_embed':
                    const titleInput = itemEl.querySelector('.item-title-input');
                    const destInput = itemEl.querySelector('.item-destination-url-input');
                    const iconPicker = itemEl.querySelector('.item-icon-picker');
                    if (titleInput) preservedStates[itemId].title = titleInput.value;
                    if (destInput) preservedStates[itemId].destination_url = destInput.value;
                    if (iconPicker) preservedStates[itemId].icon_class = iconPicker.className.replace(' item-icon-picker', '').trim();
                    break;
                case 'pix':
                case 'pix_qrcode':
                    preservedStates[itemId].title = itemEl.querySelector('.item-title-input')?.value || '';
                    preservedStates[itemId].pix_key = itemEl.querySelector('.item-pix-key-input')?.value || '';
                    preservedStates[itemId].recipient_name = itemEl.querySelector('.item-recipient-name-input')?.value || '';
                    preservedStates[itemId].pix_amount = itemEl.querySelector('.item-pix-amount-input')?.value || '';
                    preservedStates[itemId].pix_description = itemEl.querySelector('.item-pix-description-input')?.value || '';
                    preservedStates[itemId].icon_class = itemEl.querySelector('.item-icon-picker')?.className.replace(' item-icon-picker', '').trim() || '';
                    break;
                case 'pdf':
                    preservedStates[itemId].title = itemEl.querySelector('.item-title-input')?.value || '';
                    preservedStates[itemId].pdf_url = itemEl.querySelector('.item-pdf-url-input')?.value || '';
                    break;
                case 'wifi':
                    preservedStates[itemId].title = itemEl.querySelector('.item-title-input')?.value || '';
                    preservedStates[itemId].wifi_display_format = itemEl.querySelector('.wifi-display-format-input:checked')?.value || 'button';
                    preservedStates[itemId].wifi_ssid = itemEl.querySelector('.wifi-ssid-input')?.value || '';
                    preservedStates[itemId].wifi_password = itemEl.querySelector('.wifi-password-input')?.value || '';
                    preservedStates[itemId].wifi_security = itemEl.querySelector('.wifi-security-input')?.value || 'WPA';
                    preservedStates[itemId].wifi_hidden = !!(itemEl.querySelector('.wifi-hidden-input')?.checked);
                    preservedStates[itemId].wifi_banner_url = itemEl.querySelector('.wifi-banner-url-input')?.value || '';
                    preservedStates[itemId].wifi_logo_url = itemEl.querySelector('.wifi-logo-url-input')?.value || '';
                    preservedStates[itemId].wifi_logo_size = itemEl.querySelector('.wifi-logo-size-input')?.value || '';
                    preservedStates[itemId].icon_class = itemEl.querySelector('.item-icon-picker')?.className.replace(' item-icon-picker', '').trim() || '';
                    break;
            }
        });

        return preservedStates;
    }

    // Funf§f£o para restaurar o estado local dos itens apf³s recarregar
    function restoreLocalItemStates(preservedStates) {
        if (!preservedStates || Object.keys(preservedStates).length === 0) return;

        Object.keys(preservedStates).forEach(itemId => {
            const itemEl = document.querySelector(`.item[data-id='${itemId}']`);
            if (!itemEl) return;

            const state = preservedStates[itemId];
            if (!state) return;

            // Restaurar aspect ratio se existir
            if (state.aspectRatio) {
                itemEl.dataset.aspectRatio = state.aspectRatio;
            }

            // Restaurar campos específicos por tipo
            switch (state.itemType) {
                case 'banner':
                    const bannerImageInput = itemEl.querySelector('.item-image-url-input');
                    const bannerDestInput = itemEl.querySelector('.item-destination-url-input');
                    const bannerPreview = itemEl.querySelector('.banner-preview-thumb');
                    if (bannerImageInput && state.image_url) {
                        bannerImageInput.value = state.image_url;
                    }
                    if (bannerDestInput && state.destination_url !== undefined) {
                        bannerDestInput.value = state.destination_url;
                    }
                    if (bannerPreview && state.preview_src) {
                        bannerPreview.src = state.preview_src;
                    }
                    break;
                case 'carousel':
                    // ===== NOVO CARROSSEL - Restaurar =====
                    const carouselJsonInputRestore = itemEl.querySelector('.carousel-images-json-new');
                    const carouselImageInputRestore = itemEl.querySelector('.item-image-url-input');
                    if (state.destination_url && carouselJsonInputRestore) {
                        carouselJsonInputRestore.value = state.destination_url;
                        try {
                            const images = JSON.parse(state.destination_url);
                            const itemId = itemEl.dataset.id;
                            if (itemId && images.length > 0) {
                                renderCarouselImagesNew(itemId, images);
                                if (carouselImageInputRestore) {
                                    const firstImg = typeof images[0] === 'string' ? images[0] : (images[0].image_url || images[0]);
                                    carouselImageInputRestore.value = firstImg;
                                }
                            }
                        } catch (e) {
                            console.error('Erro ao restaurar:', e);
                        }
                    }
                    break;
                case 'link':
                    // Link personalizado - restaurar title, destination_url, image_url e icon_class
                    const linkTitleInput = itemEl.querySelector('.item-title-input');
                    const linkDestInput = itemEl.querySelector('.item-destination-url-input');
                    const linkImageUrlInput = itemEl.querySelector('.item-image-url-input');
                    const linkIconPicker = itemEl.querySelector('.item-icon-picker');
                    if (linkTitleInput && state.title !== undefined) linkTitleInput.value = state.title;
                    if (linkDestInput && state.destination_url !== undefined) linkDestInput.value = state.destination_url;
                    if (linkImageUrlInput && state.image_url !== undefined) linkImageUrlInput.value = state.image_url || '';
                    if (linkIconPicker && state.icon_class) {
                        const iconElement = linkIconPicker.querySelector('i');
                        if (iconElement) {
                            iconElement.className = state.icon_class;
                        } else {
                            linkIconPicker.innerHTML = `<i class="${state.icon_class}"></i>`;
                        }
                    }
                    // Atualizar preview do logo se houver image_url
                    if (state.image_url && state.image_url.trim() && !state.image_url.includes('placeholder')) {
                        const logoPreview = itemEl.querySelector('.item-logo-preview');
                        if (logoPreview) {
                            logoPreview.src = state.image_url;
                            logoPreview.style.display = 'block';
                        }
                        if (linkIconPicker) linkIconPicker.style.display = 'none';
                    } else {
                        const logoPreview = itemEl.querySelector('.item-logo-preview');
                        if (logoPreview) logoPreview.style.display = 'none';
                        if (linkIconPicker) linkIconPicker.style.display = 'inline-block';
                    }
                    break;
                case 'whatsapp':
                case 'telegram':
                case 'email':
                case 'facebook':
                case 'instagram':
                case 'pinterest':
                case 'reddit':
                case 'tiktok':
                case 'twitch':
                case 'twitter':
                case 'youtube':
                case 'linkedin':
                case 'portfolio':
                case 'spotify':
                case 'instagram_embed':
                case 'youtube_embed':
                case 'tiktok_embed':
                case 'spotify_embed':
                case 'linkedin_embed':
                case 'pinterest_embed':
                    const titleInput = itemEl.querySelector('.item-title-input');
                    const destInput = itemEl.querySelector('.item-destination-url-input');
                    const iconPicker = itemEl.querySelector('.item-icon-picker');
                    if (titleInput && state.title !== undefined) titleInput.value = state.title;
                    if (destInput && state.destination_url !== undefined) destInput.value = state.destination_url;
                    if (iconPicker && state.icon_class) iconPicker.className = `${state.icon_class} item-icon-picker`;
                    break;
                case 'pix':
                case 'pix_qrcode':
                    if (itemEl.querySelector('.item-title-input') && state.title !== undefined)
                        itemEl.querySelector('.item-title-input').value = state.title;
                    if (itemEl.querySelector('.item-pix-key-input') && state.pix_key !== undefined)
                        itemEl.querySelector('.item-pix-key-input').value = state.pix_key;
                    if (itemEl.querySelector('.item-recipient-name-input') && state.recipient_name !== undefined)
                        itemEl.querySelector('.item-recipient-name-input').value = state.recipient_name;
                    if (itemEl.querySelector('.item-pix-amount-input') && state.pix_amount !== undefined)
                        itemEl.querySelector('.item-pix-amount-input').value = state.pix_amount;
                    if (itemEl.querySelector('.item-pix-description-input') && state.pix_description !== undefined)
                        itemEl.querySelector('.item-pix-description-input').value = state.pix_description;
                    if (itemEl.querySelector('.item-icon-picker') && state.icon_class)
                        itemEl.querySelector('.item-icon-picker').className = `${state.icon_class} item-icon-picker`;
                    break;
                case 'pdf':
                    if (itemEl.querySelector('.item-title-input') && state.title !== undefined)
                        itemEl.querySelector('.item-title-input').value = state.title;
                    if (itemEl.querySelector('.item-pdf-url-input') && state.pdf_url !== undefined)
                        itemEl.querySelector('.item-pdf-url-input').value = state.pdf_url;
                    break;
                case 'wifi':
                    if (itemEl.querySelector('.item-title-input') && state.title !== undefined)
                        itemEl.querySelector('.item-title-input').value = state.title;
                    if (state.wifi_display_format) {
                        const df = itemEl.querySelectorAll('.wifi-display-format-input');
                        df.forEach(r => { r.checked = r.value === state.wifi_display_format; });
                        const logoSec = itemEl.querySelector('.wifi-logo-section');
                        const banSec = itemEl.querySelector('.wifi-banner-section');
                        const isBan = state.wifi_display_format === 'banner';
                        if (logoSec) logoSec.style.display = isBan ? 'none' : 'block';
                        if (banSec) banSec.style.display = isBan ? 'block' : 'none';
                    }
                    if (itemEl.querySelector('.wifi-ssid-input') && state.wifi_ssid !== undefined)
                        itemEl.querySelector('.wifi-ssid-input').value = state.wifi_ssid;
                    if (itemEl.querySelector('.wifi-password-input') && state.wifi_password !== undefined)
                        itemEl.querySelector('.wifi-password-input').value = state.wifi_password;
                    if (itemEl.querySelector('.wifi-security-input') && state.wifi_security !== undefined)
                        itemEl.querySelector('.wifi-security-input').value = state.wifi_security;
                    if (itemEl.querySelector('.wifi-hidden-input') && state.wifi_hidden !== undefined)
                        itemEl.querySelector('.wifi-hidden-input').checked = !!state.wifi_hidden;
                    if (itemEl.querySelector('.wifi-banner-url-input') && state.wifi_banner_url !== undefined)
                        itemEl.querySelector('.wifi-banner-url-input').value = state.wifi_banner_url;
                    if (itemEl.querySelector('.wifi-logo-url-input') && state.wifi_logo_url !== undefined)
                        itemEl.querySelector('.wifi-logo-url-input').value = state.wifi_logo_url;
                    if (itemEl.querySelector('.wifi-logo-size-input') && state.wifi_logo_size !== undefined)
                        itemEl.querySelector('.wifi-logo-size-input').value = state.wifi_logo_size;
                    if (itemEl.querySelector('.item-icon-picker') && state.icon_class) {
                        const ic = itemEl.querySelector('.item-icon-picker');
                        ic.className = `${state.icon_class} item-icon-picker`;
                    }
                    break;
            }
        });
    }

    function getModuleListItemsFromProfile(profileData) {
        return (profileData?.items || []).filter(function (it) {
            return it.item_type !== 'king_selection' && it.item_type !== 'bible';
        });
    }

    function normalizeProfileItemType(item) {
        if (!item) return item;
        let t = String(item.item_type || 'link').trim().toLowerCase();
        if (t === 'wi-fi' || t === 'wi_fi' || t === 'wifi_qrcode') t = 'wifi';
        item.item_type = t;
        return item;
    }

    function appendMinimalModuleListItem(item) {
        const REMOVED_UI_MODULES = { agenda: 1, contract: 1, photographer_site: 1, kingbrief: 1, king_bolao: 1 };
        if (item && REMOVED_UI_MODULES[item.item_type]) return false;
        const container = SELECTORS.itemsContainer || document.getElementById('items-container');
        if (!container || !item || item.id == null) return false;
        const idStr = String(item.id);
        if (container.querySelector('[data-id="' + idStr + '"]')) return false;
        const itemEl = document.createElement('div');
        itemEl.className = 'module-item module-item-fallback';
        itemEl.dataset.id = idStr;
        itemEl.dataset.itemType = item.item_type || 'link';
        const isActive = item.is_active !== false;
        const title = moduleListDisplayTitle(item);
        itemEl.innerHTML = `
                <div class="module-name module-name-row">${title}</div>
                <div class="module-content-wrapper">
                    <div class="module-drag-controls">
                        <button class="module-move-btn move-up" title="Mover para cima" data-item-id="${idStr}" data-direction="up"><i class="fas fa-chevron-up"></i></button>
                        <div class="module-drag-handle" title="Arrastar"><i class="fas fa-grip-vertical"></i></div>
                        <button class="module-move-btn move-down" title="Mover para baixo" data-item-id="${idStr}" data-direction="down"><i class="fas fa-chevron-down"></i></button>
                    </div>
                    <div class="module-icon"><i class="${getDefaultIcon(item.item_type)}"></i></div>
                    <div class="module-actions-inline">
                        <label class="module-toggle" title="Desativar">
                            <input type="checkbox" class="module-toggle-input" ${isActive ? 'checked' : ''} data-item-id="${idStr}">
                            <span class="module-toggle-slider"></span>
                        </label>
                        <button class="module-action-btn edit edit-item-btn" title="Editar Módulo" data-item-id="${idStr}"><i class="fas fa-pencil-alt"></i></button>
                        <button class="module-action-btn duplicate duplicate-item-btn" title="Duplicar" data-item-id="${idStr}"><i class="fas fa-copy"></i></button>
                        <button class="module-action-btn delete delete-item-btn" title="Excluir" data-item-id="${idStr}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="item-content" style="display: none;"><p style="padding:0.75rem;color:#f39c12;font-size:0.85rem;">Carregado em modo simplificado. Use o lápis para editar.</p></div>`;
        container.appendChild(itemEl);
        console.log(`Módulo ${idStr} (${item.item_type}) adicionado em modo simplificado`);
        return true;
    }

    function reconcileModulesListWithProfileData(profileData) {
        const container = SELECTORS.itemsContainer || document.getElementById('items-container');
        if (!container || !profileData?.items) return false;
        const expected = getModuleListItemsFromProfile(profileData).map(function (it) {
            return normalizeProfileItemType(Object.assign({}, it));
        });
        const missing = expected.filter(function (it) {
            return !container.querySelector('[data-id="' + it.id + '"]');
        });
        if (!missing.length) return false;
        console.warn('Módulos em falta na lista:', missing.map(function (m) {
            return (m.item_type || '?') + '#' + m.id;
        }).join(', '));
        missing.forEach(function (it) { appendMinimalModuleListItem(it); });
        const stillMissing = expected.filter(function (it) {
            return !container.querySelector('[data-id="' + it.id + '"]');
        });
        if (stillMissing.length) {
            console.warn('Re-render completo - ainda faltam:', stillMissing.map(function (m) {
                return (m.item_type || '?') + '#' + m.id;
            }).join(', '));
            renderEditor(profileData);
        }
        if (typeof updateLivePreviewFromForm === 'function') updateLivePreviewFromForm();
        return true;
    }
    window.reconcileModulesListWithProfileData = reconcileModulesListWithProfileData;

    function renderEditor(profileData) {
        try {
            // Fallback: quando renderEditor() é chamado sem parâmetro
            const resolvedProfileData = profileData || window.currentProfileData || window.lastProfileData;
            // Salvar dados do perfil globalmente para uso em outras funções
            window.lastProfileData = resolvedProfileData;

            if (!resolvedProfileData || !resolvedProfileData.details) {
                // Não quebrar o dashboard: isso acontece quando a API falha/retorna vazio/usuário deslogado
                console.warn('renderEditor: profileData ou details está vazio', {
                    hasProfileData: !!resolvedProfileData,
                    hasDetails: !!resolvedProfileData?.details
                });
                return;
            }

            console.log('YZ Iniciando renderização do editor com dados:', {
                hasDetails: !!profileData.details,
                hasItems: !!profileData.items,
                itemsCount: profileData.items?.length || 0
            });

            const { details, items } = resolvedProfileData;
            const imageUrl = details.profile_image_url || DEFAULT_AVATAR_PLACEHOLDER;

            setAvatarSrc(SELECTORS.dashboardPhotoPreview, imageUrl);
            setAvatarSrc(SELECTORS.previewAvatar, imageUrl);

            // Atualizar card de perfil na sidebar
            const sidebarAvatar = document.getElementById('sidebar-profile-avatar');
            const sidebarName = document.getElementById('sidebar-profile-name');
            const sidebarHandle = document.getElementById('sidebar-profile-handle');
            if (sidebarAvatar) setAvatarSrc(sidebarAvatar, imageUrl);
            if (sidebarName) sidebarName.textContent = details.display_name || 'Seu Nome';
            if (sidebarHandle) sidebarHandle.textContent = `@${details.profile_slug || 'seu-usuario'}`;

            if (SELECTORS.displayNameInput) SELECTORS.displayNameInput.value = details.display_name || '';
            console.log('[FETCH] Preenchendo campo WhatsApp com:', details.whatsapp);
            if (SELECTORS.whatsappNumberInput) {
                SELECTORS.whatsappNumberInput.value = details.whatsapp || '';
                console.log('[FETCH] Campo WhatsApp preenchido com:', SELECTORS.whatsappNumberInput.value);
            } else {
                console.warn('[FETCH] Campo WhatsApp não encontrado no DOM');
            }
            if (SELECTORS.bioInput) SELECTORS.bioInput.value = details.bio || '';
            if (SELECTORS.profileSlugInput) SELECTORS.profileSlugInput.value = details.profile_slug || '';

            // Configurar formato do avatar
            const avatarFormat = details.avatar_format || 'circular';
            updateAvatarFormatSelector(avatarFormat);
            applyAvatarFormatToPreview(SELECTORS.previewAvatar, avatarFormat);
            if (typeof window.applyVitrineDetails === 'function') {
                window.applyVitrineDetails(details);
            }
            if (SELECTORS.fontFamilySelect) SELECTORS.fontFamilySelect.value = details.font_family || 'Inter';
            if (SELECTORS.textColorPicker) SELECTORS.textColorPicker.value = details.text_color || '#ECECEC';
            if (SELECTORS.buttonColorPicker) SELECTORS.buttonColorPicker.value = details.button_color || '#1C1C21';
            if (SELECTORS.backgroundImageOpacityPicker) SELECTORS.backgroundImageOpacityPicker.value = details.background_image_opacity !== undefined ? details.background_image_opacity : 1.0;
            if (SELECTORS.buttonTextColorPicker) SELECTORS.buttonTextColorPicker.value = details.button_text_color || '#FFFFFF';
            if (SELECTORS.backgroundImagePreview) SELECTORS.backgroundImagePreview.src = details.background_image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9Ijc1IiB5PSI3NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIj5JbWFnZW08L3RleHQ+Cjwvc3ZnPgo=';

            if (SELECTORS.buttonOpacityPicker) SELECTORS.buttonOpacityPicker.value = details.button_opacity !== undefined ? details.button_opacity : 1;

            const borderRadiusPx = details.button_border_radius || '12px';
            const parts = (borderRadiusPx + '').split(' ');
            const [dtl, dtr, dbr, dbl] = parts.length === 4 ? parts : [borderRadiusPx, borderRadiusPx, borderRadiusPx, borderRadiusPx];
            if (SELECTORS.radiusTL) SELECTORS.radiusTL.value = parseInt(dtl, 10);
            if (SELECTORS.radiusTR) SELECTORS.radiusTR.value = parseInt(dtr, 10);
            if (SELECTORS.radiusBR) SELECTORS.radiusBR.value = parseInt(dbr, 10);
            if (SELECTORS.radiusBL) SELECTORS.radiusBL.value = parseInt(dbl, 10);
            if (SELECTORS.buttonBorderRadiusValue) SELECTORS.buttonBorderRadiusValue.textContent = `${parseInt(dtl, 10)}px ${parseInt(dtr, 10)}px ${parseInt(dbr, 10)}px ${parseInt(dbl, 10)}px`;

            const bgType = details.background_type || 'color';
            const bgTypeInput = document.querySelector(`input[name="bg-type"][value="${bgType}"]`);
            if (bgTypeInput) bgTypeInput.checked = true;

            const showVcard = details.show_vcard_button === false ? 'false' : 'true';
            const vcardToggle = document.querySelector(`input[name="vcard-toggle"][value="${showVcard}"]`);
            if (vcardToggle) vcardToggle.checked = true;

            function updateBibleVisibilitySetting(itemsList) {
                const bibleItem = (itemsList || window.currentProfileData?.items || []).find(function (it) { return it.item_type === 'bible'; });
                const bibleSetting = document.getElementById('bible-visibility-setting');
                const biblePosSetting = document.getElementById('bible-verse-position-setting');
                const bibleSizeSetting = document.getElementById('bible-verse-size-setting');
                if (bibleSetting) {
                    if (bibleItem) {
                        bibleSetting.style.display = 'flex';
                        if (biblePosSetting) biblePosSetting.style.display = 'flex';
                        if (bibleSizeSetting) bibleSizeSetting.style.display = 'flex';
                        const bibleVisible = bibleItem.bible_data && bibleItem.bible_data.is_visible !== false;
                        const bibleToggle = document.querySelector(`input[name="bible-toggle"][value="${bibleVisible ? 'true' : 'false'}"]`);
                        if (bibleToggle) bibleToggle.checked = true;
                        const versePos = (bibleItem.bible_data && bibleItem.bible_data.verse_position === 'bottom') ? 'bottom' : 'top';
                        const versePosRadio = document.querySelector(`input[name="bible-verse-position"][value="${versePos}"]`);
                        if (versePosRadio) versePosRadio.checked = true;
                        const rawSize = (bibleItem.bible_data && bibleItem.bible_data.verse_size) || 'normal';
                        const verseSize = ['small', 'xsmall'].includes(rawSize) ? rawSize : 'normal';
                        const verseSizeRadio = document.querySelector(`input[name="bible-verse-size"][value="${verseSize}"]`);
                        if (verseSizeRadio) verseSizeRadio.checked = true;
                    } else {
                        bibleSetting.style.display = 'none';
                        if (biblePosSetting) biblePosSetting.style.display = 'none';
                        if (bibleSizeSetting) bibleSizeSetting.style.display = 'none';
                    }
                }
            }
            window.refreshBibleVisibilitySetting = function () {
                const items = window.currentProfileData?.items || [];
                updateBibleVisibilitySetting(items);
            };
            updateBibleVisibilitySetting(items);

            if (SELECTORS.backgroundColorPicker) SELECTORS.backgroundColorPicker.value = details.background_color || '#0D0D0F';
            if (SELECTORS.backgroundImageUrlInput) SELECTORS.backgroundImageUrlInput.value = details.background_image_url || '';

            if (SELECTORS.cardBackgroundColorPicker) SELECTORS.cardBackgroundColorPicker.value = details.card_background_color || '#141417';
            if (SELECTORS.cardOpacityPicker) SELECTORS.cardOpacityPicker.value = details.card_opacity !== undefined ? details.card_opacity : 1.0;

            if (bgType === 'image') {
                if (SELECTORS.backgroundColorContainer) SELECTORS.backgroundColorContainer.style.display = 'none';
                if (SELECTORS.backgroundImageContainer) SELECTORS.backgroundImageContainer.style.display = 'block';
            } else {
                if (SELECTORS.backgroundColorContainer) SELECTORS.backgroundColorContainer.style.display = 'block';
                if (SELECTORS.backgroundImageContainer) SELECTORS.backgroundImageContainer.style.display = 'none';
            }

            const alignValue = details.button_content_align || 'center';
            const alignInput = document.querySelector(`input[name="button-align"][value="${alignValue}"]`);
            if (alignInput) {
                alignInput.checked = true;
            }

            const fontSize = details.button_font_size ? parseInt(details.button_font_size, 10) : 16;
            if (SELECTORS.buttonFontSizePicker) SELECTORS.buttonFontSizePicker.value = fontSize;
            if (SELECTORS.buttonFontSizeValue) SELECTORS.buttonFontSizeValue.textContent = `${fontSize}px`;

            // Logo align - usar logo_spacing para armazenar alinhamento (left/center/right)
            // Se logo_spacing for um número, converter para alinhamento baseado no valor
            // Se for string, usar diretamente
            let logoAlign = 'center'; // padrão
            if (details.logo_spacing !== undefined && details.logo_spacing !== null) {
                if (typeof details.logo_spacing === 'string' && ['left', 'center', 'right'].includes(details.logo_spacing)) {
                    logoAlign = details.logo_spacing;
                } else if (typeof details.logo_spacing === 'number') {
                    // Converter número para alinhamento (compatibilidade com versão antiga)
                    if (details.logo_spacing <= 5) logoAlign = 'left';
                    else if (details.logo_spacing >= 20) logoAlign = 'right';
                    else logoAlign = 'center';
                }
            }
            if (SELECTORS.logoAlignLeft) SELECTORS.logoAlignLeft.checked = (logoAlign === 'left');
            if (SELECTORS.logoAlignCenter) SELECTORS.logoAlignCenter.checked = (logoAlign === 'center');
            if (SELECTORS.logoAlignRight) SELECTORS.logoAlignRight.checked = (logoAlign === 'right');

            // Preservar estado local antes de limpar o container
            const preservedStates = preserveLocalItemStates();

            // Verificar duplicações antes de renderizar
            // King Selection e Bíblia não aparecem como módulos (só no menu lateral); não listar na aba Módulos
            const seenIds = new Set();
            const uniqueItems = (items || []).map(function (item) {
                return normalizeProfileItemType(Object.assign({}, item));
            }).filter(item => {
                if (item.item_type === 'king_selection') return false;
                if (item.item_type === 'bible') return false;
                if (seenIds.has(item.id)) {
                    console.warn(`Item duplicado detectado e removido: ID ${item.id}, Tipo: ${item.item_type}`);
                    return false;
                }
                seenIds.add(item.id);
                return true;
            }).sort((a, b) => {
                // Ordenar por display_order (menor primeiro, null/undefined por último)
                const orderA = a.display_order !== undefined && a.display_order !== null ? a.display_order : 9999;
                const orderB = b.display_order !== undefined && b.display_order !== null ? b.display_order : 9999;
                return orderA - orderB;
            });

            // Limpar container ANTES de renderizar novos itens
            // IMPORTANTE: Limpar de forma síncrona para garantir que os itens sejam adicionados corretamente
            // Re-buscar o container para garantir que está acessível (pode ter sido removido/recriado)
            let itemsContainer = SELECTORS.itemsContainer || document.getElementById('items-container');

            if (!itemsContainer) {
                console.error('O Container items-container não encontrado! Tentando criar...');
                // Tentar encontrar o editor pane e criar o container se não existir
                const itemsEditorPane = document.getElementById('items-editor');
                if (itemsEditorPane) {
                    const newContainer = document.createElement('div');
                    newContainer.id = 'items-container';
                    newContainer.className = 'modules-list links-editor-list';
                    const modulesActions = itemsEditorPane.querySelector('.modules-actions');
                    itemsEditorPane.insertBefore(newContainer, modulesActions ? modulesActions.nextElementSibling : null);
                    itemsContainer = newContainer;
                    SELECTORS.itemsContainer = newContainer; // Atualizar o seletor
                    console.log('Container criado dinamicamente');
                } else {
                    console.error('O items-editor pane também não encontrado!');
                    return; // Não pode continuar sem o container
                }
            }

            // Preservar itens temporários que ainda não foram retornados pelo servidor
            // IMPORTANTE: Fazer isso ANTES de limpar o container
            const temporaryItems = [];
            const serverItemIds = new Set(uniqueItems.map(item => String(item.id)));
            const tempElements = itemsContainer.querySelectorAll('[data-is-temporary="true"]');
            tempElements.forEach(tempEl => {
                const tempId = tempEl.dataset.id;
                if (tempId && !serverItemIds.has(String(tempId))) {
                    console.log(`Y"O Preservando item temporário ${tempId} que ainda não foi retornado pelo servidor`);
                    // Clonar o elemento para preservá-lo após limpar o container
                    temporaryItems.push({
                        element: tempEl.cloneNode(true),
                        id: tempId
                    });
                }
            });

            console.log(`Y Limpando container antes de renderizar ${uniqueItems.length} itens (${temporaryItems.length} temporários serão preservados)`);
            itemsContainer.innerHTML = '';

            // Re-adicionar itens temporários preservados ANTES de renderizar os itens do servidor
            // Isso garante que apareçam primeiro na lista
            temporaryItems.forEach(temp => {
                itemsContainer.appendChild(temp.element);
                console.log(`Item temporário ${temp.id} re-adicionado ao container`);
            });

            // Verificar se temos itens para renderizar
            if (uniqueItems.length === 0) {
                console.warn('Nenhum item único para renderizar');
                return; // Retornar cedo se não houver itens
            }

            console.log(`YZ Renderizando ${uniqueItems.length} itens...`);
            uniqueItems.forEach((item, itemIndex) => {
                try {
                // Se houver um item temporário com este ID, removê-lo primeiro
                const tempItem = itemsContainer.querySelector(`[data-id="${item.id}"][data-is-temporary="true"]`);
                if (tempItem) {
                    console.log(`Y"" Substituindo item temporário ${item.id} pelo item real do servidor`);
                    tempItem.remove();
                }

                const itemEl = document.createElement('div');
                // Definir data-id e data-item-type ANTES de qualquer coisa
                // Se o ID for temporário (string começando com "temp_"), manter como está
                itemEl.dataset.id = item.id;
                itemEl.dataset.itemType = item.item_type;
                // IMPORTANTE: Definir data-display-order baseado no display_order do item ou na posição no array
                // Isso garante que a ordem seja preservada mesmo após recarregar
                const displayOrder = item.display_order !== undefined && item.display_order !== null
                    ? item.display_order
                    : (itemIndex + 1);
                itemEl.dataset.displayOrder = displayOrder;
                itemEl.setAttribute('data-display-order', displayOrder);
                itemEl.className = 'item';

                // Se for item temporário (não salvo ainda), marcar como temporário
                if (String(item.id).startsWith('temp_')) {
                    itemEl.dataset.isTemporary = 'true';
                    itemEl.dataset.isUnsaved = 'true'; // Manter ambos para compatibilidade
                    console.log(`Item temporário ${item.id} será renderizado como não salvo`);
                }
                // Armazenar dados originais do item para usar no modal
                // Sanitizar destination_url e armazenar dados originais para o modal
                const sanitizeBannerDestLocal = (raw) => {
                    if (!raw || typeof raw !== 'string') return '';
                    if (raw.startsWith('[')) return '';
                    const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
                    const filtered = parts.filter(p => !p.includes('imagedelivery.net'));
                    return (filtered[0] || parts[0] || '').trim();
                };
                itemEl.dataset.originalData = JSON.stringify({
                    destination_url: sanitizeBannerDestLocal(item.destination_url || ''),
                    image_url: item.image_url || '',
                    aspect_ratio: item.aspect_ratio || 'tarja'
                });

                let displayHTML = '';
                let editHTML = '';
                let iconOrThumbHTML = '';

                switch (item.item_type) {
                    case 'link':
                        itemEl.classList.add('link-item');
                        // Se tiver image_url (logo), mostrar logo, senão mostrar ícone
                        // NA LISTA DE CONTEDO: sempre usar tamanho fixo (40px), NÃO usar logo_size
                        const logoSizeListFixed = 40; // Tamanho FIXO na lista de conteúdo (não deve mudar)
                        if (item.image_url && item.image_url.trim() && !item.image_url.includes('placeholder')) {
                            // Detectar se é PNG (logo) ou JPEG (foto)
                            const imageUrl = item.image_url.toLowerCase();
                            let borderRadius = '50%'; // Padrão: circular (JPEG)
                            let objectFit = 'cover';
                            let logoClass = 'logo-circular';

                            // Verificar logo_fit_mode do item se disponível
                            const logoFitMode = item.logo_fit_mode || 'contain';

                            if (imageUrl.includes('.png')) {
                                // PNG: sem border-radius (logo)
                                borderRadius = '0';
                                // Usar logo_fit_mode se disponível, senão 'contain' (completo, sem corte)
                                objectFit = (logoFitMode && ['contain', 'cover'].includes(logoFitMode)) ? logoFitMode : 'contain';
                                logoClass = 'logo-png';
                            } else if (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')) {
                                // JPEG: círculo (foto)
                                borderRadius = '50%';
                                // Usar logo_fit_mode se disponível, senão 'cover' (preenche espaço)
                                objectFit = (logoFitMode && ['contain', 'cover'].includes(logoFitMode)) ? logoFitMode : 'cover';
                                logoClass = 'logo-circular';
                            } else {
                                // URL sem extensão (Cloudflare R2) - verificar logo_fit_mode
                                // Se não tiver extensão, assumir PNG (logo) por padrão
                                borderRadius = '0';
                                objectFit = (logoFitMode && ['contain', 'cover'].includes(logoFitMode)) ? logoFitMode : 'contain';
                                logoClass = 'logo-png';
                            }

                            iconOrThumbHTML = `<img src="${item.image_url}" class="item-logo-preview ${logoClass}" style="width: ${logoSizeListFixed}px; height: ${logoSizeListFixed}px; object-fit: ${objectFit}; border-radius: ${borderRadius}; flex-shrink: 0;" alt="Logo" onerror="this.style.display='none'; const nextIcon = this.nextElementSibling; if (nextIcon && nextIcon.classList.contains('item-icon-picker')) nextIcon.style.display='inline-block';"><i class="${item.icon_class || 'fas fa-link'} item-icon-picker" title="Alterar Ícone" style="display: none;"></i>`;
                        } else {
                            iconOrThumbHTML = `<i class="${item.icon_class || 'fas fa-link'} item-icon-picker" title="Alterar Ícone"></i>`;
                        }
                        // Usar o título do item, ou 'Link Personalizado' como padrão apenas se não houver título
                        displayHTML = `<div class="item-display-title">${item.title || 'Link Personalizado'}</div><div class="item-display-dest">${item.destination_url || '#'}</div>`;
                        // Adicionar campo de upload de logo no modal de edição
                        const logoPreviewStyle = (item.image_url && item.image_url.trim() && !item.image_url.includes('placeholder')) ? 'display: block;' : 'display: none;';
                        const logoSize = item.logo_size || 24; // Tamanho padrão: 24px
                        const logoPreviewSize = Math.min(logoSize, 100); // Preview máximo 100px
                        editHTML = `
            <label>Logo (PNG ou JPG)</label>
            <div class="logo-upload-area" style="margin-bottom: 15px; position: relative; border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: var(--card-background-color, #1C1C21);">
                <input type="file" class="item-logo-file-input" accept="image/png,image/jpeg,image/jpg" style="display: none;">
                <img src="${item.image_url || ''}" class="item-logo-upload-preview" style="max-width: ${logoPreviewSize}px; max-height: ${logoPreviewSize}px; width: ${logoPreviewSize}px; height: ${logoPreviewSize}px; object-fit: contain; margin-bottom: 10px; border-radius: 8px; ${logoPreviewStyle}">
                <div class="logo-upload-text" style="${!item.image_url || item.image_url.includes('placeholder') ? '' : 'display: none;'}">
                    <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--dourado-principal, #FFC700); margin-bottom: 10px;"></i>
                    <p style="margin: 5px 0; color: var(--text, #ECECEC);">Clique para fazer upload</p>
                    <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">PNG ou JPG (máx. 5MB)</span>
                </div>
                <button type="button" class="remove-logo-btn" style="display: ${item.image_url && !item.image_url.includes('placeholder') ? 'block' : 'none'}; margin-top: 10px; padding: 5px 15px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-trash"></i> Remover Logo
                </button>
                <div class="upload-loader" style="display: none;"></div>
            </div>
            <input type="hidden" class="item-image-url-input" value="${item.image_url || ''}">
            ${item.image_url && !item.image_url.includes('placeholder') ? `
            <label>Tamanho da Logo (em pixels)</label>
            <div class="input-group range-slider" style="margin-bottom: 15px;">
                <div class="range-slider-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <label style="margin: 0; color: var(--text, #ECECEC);">Tamanho: <span id="logo-size-value-${item.id || 'temp'}">${logoSize}</span>px</label>
                    <input type="number" class="item-logo-size-input" value="${logoSize}" min="20" max="600" step="1" style="width: 80px; padding: 5px 10px; border-radius: 4px; border: 1px solid var(--border-color, #2C2C2F); background: var(--card-background-color, #1C1C21); color: var(--text, #ECECEC); text-align: center;">
                </div>
                <input type="range" class="item-logo-size-slider" value="${logoSize}" min="20" max="600" step="5" style="width: 100%;" data-item-id="${item.id || 'temp'}">
                <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.75rem; color: var(--text-dark, #A1A1A1);">
                    <span>20px</span>
                    <span>600px</span>
                </div>
            </div>
            <label>Ajuste da Logo</label>
            <div class="input-group" style="margin-bottom: 15px;">
                <div class="segmented-control" style="display: flex; gap: 8px; background: var(--card-background-color, #1C1C21); padding: 4px; border-radius: 8px; border: 1px solid var(--border-color, #2C2C2F);">
                    <input type="radio" id="logo-fit-contain-${item.id || 'temp'}" name="logo-fit-mode-${item.id || 'temp'}" value="contain" ${(!item.logo_fit_mode || item.logo_fit_mode === 'contain') ? 'checked' : ''} style="display: none;">
                    <label for="logo-fit-contain-${item.id || 'temp'}" style="flex: 1; padding: 8px 12px; text-align: center; border-radius: 6px; cursor: pointer; background: ${(!item.logo_fit_mode || item.logo_fit_mode === 'contain') ? 'var(--dourado-principal, #FFC700)' : 'transparent'}; color: ${(!item.logo_fit_mode || item.logo_fit_mode === 'contain') ? '#000' : 'var(--text, #ECECEC)'}; font-size: 0.85rem; font-weight: 600; transition: all 0.2s;">
                        <i class="fas fa-expand" style="margin-right: 5px;"></i> Automático
                    </label>
                    <input type="radio" id="logo-fit-cover-${item.id || 'temp'}" name="logo-fit-mode-${item.id || 'temp'}" value="cover" ${(item.logo_fit_mode === 'cover') ? 'checked' : ''} style="display: none;">
                    <label for="logo-fit-cover-${item.id || 'temp'}" style="flex: 1; padding: 8px 12px; text-align: center; border-radius: 6px; cursor: pointer; background: ${(item.logo_fit_mode === 'cover') ? 'var(--dourado-principal, #FFC700)' : 'transparent'}; color: ${(item.logo_fit_mode === 'cover') ? '#000' : 'var(--text, #ECECEC)'}; font-size: 0.85rem; font-weight: 600; transition: all 0.2s;">
                        <i class="fas fa-crop" style="margin-right: 5px;"></i> Com Corte
                    </label>
                </div>
                <input type="hidden" class="item-logo-fit-mode-input" value="${item.logo_fit_mode || 'contain'}">
            </div>
            ` : ''}
            <label>Título</label>
            <input type="text" class="item-title-input" value="${item.title || ''}" placeholder="Título do Link Personalizado">
            <label>URL de Destino</label>
            <input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="https://exemplo.com">
            <label style="margin-top: 15px;">Ícone (opcional - usado se não houver logo)</label>
            <div class="item-icon-picker" style="font-size: 2rem; cursor: pointer; color: var(--dourado-principal, #FFC700); width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border: 2px solid var(--border-color, #2C2C2F); border-radius: 8px; margin: 10px 0;" title="Clique para alterar ícone">
                <i class="${item.icon_class || 'fas fa-link'}"></i>
            </div>
        `;
                        break;
                    case 'banner':
                        // Banner simples - uma imagem e URL de destino opcional
                        const sanitizeBannerDestLocal = (raw) => {
                            if (!raw || typeof raw !== 'string') return '';
                            if (raw.startsWith('[')) return '';
                            const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
                            const filtered = parts.filter(p => !p.includes('imagedelivery.net'));
                            return (filtered[0] || parts[0] || '').trim();
                        };

                        itemEl.classList.add('banner-item');
                        itemEl.dataset.aspectRatio = item.aspect_ratio || 'tarja';
                        // Função para validar e sanitizar URL da imagem do banner
                        function sanitizeImageUrl(url) {
                            const defaultPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9Ijc1IiB5PSI3NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIj5JbWFnZW08L3RleHQ+Cjwvc3ZnPgo=';
                            if (!url || typeof url !== 'string') {
                                return defaultPlaceholder;
                            }
                            const trimmedUrl = url.trim();
                            // Rejeitar URLs de placeholder externos que podem falhar
                            if (trimmedUrl.includes('placeholder.com') || trimmedUrl.includes('via.placeholder')) {
                                return defaultPlaceholder;
                            }
                            // Aceitar apenas URLs válidas: data URIs ou http/https
                            if (trimmedUrl.startsWith('data:image/') ||
                                trimmedUrl.startsWith('http://') ||
                                trimmedUrl.startsWith('https://')) {
                                return trimmedUrl;
                            }
                            return defaultPlaceholder;
                        }
                        // Normalizar banners que ainda têm destino em JSON (legado de carrossel) e limpar URLs de imagem
                        let rawBannerDest = item.destination_url || '';
                        if (rawBannerDest.trim().startsWith('[')) {
                            try {
                                const parsed = JSON.parse(rawBannerDest);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    const firstImg = typeof parsed[0] === 'string' ? parsed[0] : (parsed[0]?.image_url || '');
                                    if (firstImg) {
                                        item.image_url = firstImg;
                                    }
                                }
                            } catch (e) {
                                console.warn('Banner: destino JSON ignorado', e);
                            }
                            rawBannerDest = '';
                        }
                        const bannerDestParts = parseBannerDestination(rawBannerDest);
                        const bannerPrimaryDest = rawBannerDest.trim().startsWith('{')
                            ? bannerDestParts.primary_url
                            : sanitizeBannerDestLocal(rawBannerDest);

                        let bannerImageUrl = sanitizeImageUrl(item.image_url);
                        const bannerName = (item.title && item.title.trim()) || 'Banner';
                        const bannerDisplayDest = bannerDestDisplayLabel(rawBannerDest);
                        iconOrThumbHTML = `<img src="${bannerImageUrl}" class="banner-preview-thumb" alt="Preview" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9Ijc1IiB5PSI3NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIj5JbWFnZW08L3RleHQ+Cjwvc3ZnPgo='" loading="lazy"/>`;
                        displayHTML = `<div class="item-display-title"><input type="text" class="item-banner-name-input" value="${bannerName}" placeholder="Nome do Banner" style="background: transparent; border: 1px solid transparent; color: inherit; font-size: inherit; font-weight: inherit; padding: 2px 4px; border-radius: 4px; width: 100%; max-width: 220px;" onfocus="this.style.borderColor='#FFC700'; this.style.background='rgba(255,199,0,0.1)';" onblur="this.style.borderColor='transparent'; this.style.background='transparent';"></div><div class="item-display-dest">${bannerDisplayDest || 'Sem destino'}</div><input type="hidden" class="item-title-input-hidden" value="${item.whatsapp_message || ''}">`;
                        editHTML = `
            <div class="image-upload-area">
                <input type="file" class="item-file-input" accept="image/*">
                <div class="image-upload-text">
                    <p><i class="fas fa-cloud-upload-alt"></i> Clique para fazer upload</p>
                    <span>ou arraste uma imagem aqui</span>
                </div>
                <img class="banner-preview" src="${bannerImageUrl}" style="max-width: 100%; max-height: 200px; margin-top: 10px; display: ${bannerImageUrl && !bannerImageUrl.includes('placeholder') ? 'block' : 'none'};">
                <div class="upload-loader"></div>
            </div>
            <label>URL de Destino ao clicar na imagem (opcional)</label>
            <input type="text" class="item-destination-url-input" value="${bannerPrimaryDest.replace(/"/g, '&quot;')}" placeholder="https://link.do.banner">
            <input type="hidden" class="item-image-url-input" value="${bannerImageUrl}">
            ${bannerUrlModelsHtml()}
        `;
                        // Atualizar originalData com destino sanitizado (usar bannerDisplayDest que já está sanitizado)
                        try {
                            const originalData = itemEl.dataset.originalData ? JSON.parse(itemEl.dataset.originalData) : {};
                            originalData.destination_url = serializeBannerDestination(bannerPrimaryDest, '', '');
                            originalData.image_url = bannerImageUrl;
                            originalData.aspect_ratio = item.aspect_ratio || 'tarja';
                            originalData.title = bannerName;
                            originalData.whatsapp_message = item.whatsapp_message || '';
                            itemEl.dataset.originalData = JSON.stringify(originalData);
                        } catch (e) {
                            // ignore
                        }
                        break;
                    case 'banner_carousel':
                    case 'carousel':
                        // ===== NOVO CARROSSEL - IMPLEMENTA—fO LIMPA =====
                        itemEl.classList.add('carousel-item');
                        itemEl.dataset.aspectRatio = item.aspect_ratio || 'auto';

                        // Parsear imagens do destination_url (JSON)
                        let carouselImages = [];
                        let carouselPreviewImage = '';

                        if (item.destination_url) {
                            try {
                                const parsed = JSON.parse(item.destination_url);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    // Filtrar placeholders
                                    carouselImages = parsed.filter(img => {
                                        const url = typeof img === 'string' ? img : (img.image_url || img);
                                        return url && !url.includes('placeholder') && !url.startsWith('data:image/svg');
                                    });
                                    if (carouselImages.length > 0) {
                                        carouselPreviewImage = typeof carouselImages[0] === 'string' ? carouselImages[0] : (carouselImages[0].image_url || carouselImages[0]);
                                    }
                                }
                            } catch (e) {
                                if (item.image_url && !item.image_url.includes('placeholder')) {
                                    carouselImages = [item.image_url];
                                    carouselPreviewImage = item.image_url;
                                }
                            }
                        } else if (item.image_url && !item.image_url.includes('placeholder')) {
                            carouselImages = [item.image_url];
                            carouselPreviewImage = item.image_url;
                        }

                        iconOrThumbHTML = `<i class="fas fa-images" style="font-size: 1.5rem; color: var(--dourado-principal, #FFC700);"></i>`;
                        const carouselListTitle = item.title || (item.item_type === 'banner_carousel' ? 'Carrossel de Banners' : 'Carrossel');
                        displayHTML = `<div class="item-display-title">${carouselListTitle}</div><div class="item-display-dest">${carouselImages.length} imagem${carouselImages.length !== 1 ? 'ns' : ''}</div>`;

                        // HTML do editor - SIMPLES E LIMPO
                        editHTML = `
            <div class="input-group">
                <label>Título do Carrossel</label>
                <input type="text" class="item-title-input" value="${item.title || 'Carrossel'}" placeholder="Ex: Carrossel">
            </div>
            <div class="input-group">
                <label>Proporção de Aspecto</label>
                <div class="aspect-ratio-selector" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px;">
                    <input type="radio" name="aspect-ratio-selector" id="ratio-auto-${item.id}" value="auto" ${(item.aspect_ratio || 'auto') === 'auto' ? 'checked' : ''}>
                    <label for="ratio-auto-${item.id}">Automática</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-tarja-${item.id}" value="tarja" ${item.aspect_ratio === 'tarja' ? 'checked' : ''}>
                    <label for="ratio-tarja-${item.id}">Tarja</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-2-1-${item.id}" value="2:1" ${item.aspect_ratio === '2:1' ? 'checked' : ''}>
                    <label for="ratio-2-1-${item.id}">2:1</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-4-3-${item.id}" value="4:3" ${item.aspect_ratio === '4:3' ? 'checked' : ''}>
                    <label for="ratio-4-3-${item.id}">4:3</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-1-1-${item.id}" value="1:1" ${item.aspect_ratio === '1:1' ? 'checked' : ''}>
                    <label for="ratio-1-1-${item.id}">1:1</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-3-4-${item.id}" value="3:4" ${item.aspect_ratio === '3:4' ? 'checked' : ''}>
                    <label for="ratio-3-4-${item.id}">3:4</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-10-16-${item.id}" value="10:16" ${item.aspect_ratio === '10:16' ? 'checked' : ''}>
                    <label for="ratio-10-16-${item.id}">10:16</label>
                    <input type="radio" name="aspect-ratio-selector" id="ratio-16-9-${item.id}" value="16:9" ${item.aspect_ratio === '16:9' ? 'checked' : ''}>
                    <label for="ratio-16-9-${item.id}">16:9</label>
                </div>
            </div>
            <div class="input-group">
                <label>Imagens do Carrossel</label>
                <div id="carousel-images-list-${item.id}" class="carousel-images-list-new" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-bottom: 15px; min-height: 50px;">
                    ${carouselImages.length === 0 ? '<p style="color: #999; text-align: center; padding: 20px; font-size: 0.9rem; grid-column: 1/-1;">Nenhuma imagem adicionada ainda.</p>' : ''}
                </div>
                <label class="carousel-upload-label-new" for="carousel-file-new-${item.id}" style="position: relative; border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: var(--card-background-color, #1C1C21); display: block; margin-top: 10px;">
                    <input type="file" id="carousel-file-new-${item.id}" class="carousel-file-input-new" accept="image/png,image/jpeg,image/jpg" data-item-id="${item.id}" multiple style="position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; clip: rect(0,0,0,0); pointer-events: none;">
                    <div style="pointer-events: none;">
                        <i class="fas fa-plus-circle" style="font-size: 2rem; color: var(--dourado-principal, #FFC700); margin-bottom: 10px;"></i>
                        <p style="margin: 5px 0; color: var(--text, #ECECEC);">Clique para adicionar imagens</p>
                        <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">PNG, JPG ou JPEG (máx. 5MB por imagem)</span>
                    </div>
                    <div class="carousel-upload-loader-new" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 2000; width: 40px; height: 40px; border: 5px solid rgba(255,255,255,0.3); border-top-color: var(--dourado-principal, #FFC700); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </label>
                <input type="hidden" class="carousel-images-json-new" data-item-id="${item.id}" value='${JSON.stringify(carouselImages)}'>
                <input type="hidden" class="item-image-url-input" value="${carouselPreviewImage}">
                <small style="color: #999; display: block; margin-top: 10px;"><i class="fas fa-info-circle"></i> As imagens passam automaticamente a cada 3 segundos</small>
            </div>
        `;
                        break;
                    case 'pix':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fa-solid fa-qrcode'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'PIX'}</div><div class="item-display-dest">${item.pix_key || 'Chave PIX'}</div>`;
                        editHTML = `
            <label>Título</label>
            <input type="text" class="item-title-input" value="${item.title || ''}" placeholder="Título (ex: PIX Celular)">
            <label>Nome do Recebedor</label>
            <input type="text" class="item-recipient-name-input" value="${item.recipient_name || ''}" placeholder="Seu nome completo">
            <label>Chave PIX (Aleatf³ria, CPF/CNPJ, E-mail ou Telefone)</label>
            <div class="pix-key-examples">
                <small><strong>?ož Celular:</strong> Apenas nfºmeros (ex: 11999999999)</small>
                <small><strong>?o§ Email:</strong> seuemail@exemplo.com</small>
                <small><strong> CPF:</strong> Apenas nfºmeros (ex: 12345678901)</small>
                <small><strong>?~ Chave Aleatf³ria:</strong> Copie e cole (ex: 12345678-1234-...)</small>
            </div>
            <input type="text" class="item-pix-key-input" value="${item.pix_key || ''}" placeholder="Ex: +5511999999999 (celular) ou seuemail@exemplo.com">
            <label>Valor (opcional)</label>
            <input type="number" class="item-pix-amount-input" value="${item.pix_amount || ''}" placeholder="Valor em reais" step="0.01">
            <label>Descrif§f£o (opcional)</label>
            <input type="text" class="item-pix-description-input" value="${item.pix_description || ''}" placeholder="Descrif§f£o do pagamento">
        `;
                        break;
                    case 'pix_qrcode':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fas fa-qrcode'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'PIX QR Code'}</div><div class="item-display-dest">${item.pix_key || 'Nenhuma chave configurada'}</div>`;
                        editHTML = `
            <label>Título</label>
            <input type="text" class="item-title-input" value="${item.title || ''}" placeholder="Título (ex: Faça um PIX)">
            <label>Nome do Recebedor</label>
            <input type="text" class="item-recipient-name-input" value="${item.recipient_name || ''}" placeholder="Seu nome completo">
            <label>Chave PIX (Aleatf³ria, CPF/CNPJ, E-mail ou Telefone)</label>
            <div class="pix-key-examples">
                <small><strong>?ož Celular:</strong> Apenas nfºmeros (ex: 11999999999)</small>
                <small><strong>?o§ Email:</strong> seuemail@exemplo.com</small>
                <small><strong> CPF:</strong> Apenas nfºmeros (ex: 12345678901)</small>
                <small><strong>?~ Chave Aleatf³ria:</strong> Copie e cole (ex: 12345678-1234-...)</small>
            </div>
            <input type="text" class="item-pix-key-input" value="${item.pix_key || ''}" placeholder="Ex: +5511999999999 (celular) ou seuemail@exemplo.com">
            <label>Valor (opcional)</label>
            <input type="number" class="item-pix-amount-input" value="${item.pix_amount || ''}" placeholder="Valor em reais" step="0.01">
            <label>Descrif§f£o (opcional)</label>
            <input type="text" class="item-pix-description-input" value="${item.pix_description || ''}" placeholder="Descrif§f£o do pagamento">
        `;
                        break;
                    case 'wifi': {
                        itemEl.classList.add('link-item', 'wifi-dashboard-item');
                        let wifiCfg = {};
                        try {
                            if (item.destination_url && String(item.destination_url).trim().startsWith('{')) {
                                wifiCfg = JSON.parse(item.destination_url);
                            }
                        } catch (e) {
                            wifiCfg = {};
                        }
                        const wifiDisplay = (wifiCfg.display_format === 'banner') ? 'banner' : 'button';
                        const wifiSsid = (wifiCfg.ssid || '').trim();
                        const wifiPass = wifiCfg.password != null ? String(wifiCfg.password) : '';
                        const wifiSecurity = (wifiCfg.security || 'WPA').toString();
                        const wifiHidden = !!wifiCfg.hidden;
                        const wifiBannerUrl = (wifiCfg.banner_image_url || '').trim();
                        const wifiLogoUrl = (wifiCfg.logo_url || '').trim();
                        const wifiLogoSize = Math.min(600, Math.max(20, parseInt(wifiCfg.logo_size || item.logo_size || 48, 10) || 48));
                        if (wifiDisplay === 'banner' && wifiBannerUrl && !wifiBannerUrl.includes('placeholder')) {
                            iconOrThumbHTML = `<img src="${wifiBannerUrl}" class="banner-preview-thumb" alt="Wi-Fi" style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><i class="fas fa-wifi" style="display: none;"></i>`;
                        } else if (wifiLogoUrl && !wifiLogoUrl.includes('placeholder')) {
                            iconOrThumbHTML = `<img src="${wifiLogoUrl}" class="item-logo-preview" style="width: 40px; height: 40px; object-fit: contain; border-radius: 8px;" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';"><i class="${item.icon_class || 'fas fa-wifi'} item-icon-picker" title="Alterar Ícone" style="display:none;"></i>`;
                        } else {
                            iconOrThumbHTML = `<i class="${item.icon_class || 'fas fa-wifi'} item-icon-picker" title="Alterar Ícone"></i>`;
                        }

                        const rawWifiTitle = (item.title && String(item.title).trim()) ? String(item.title).trim() : '';
                        const moduleTitle = (rawWifiTitle && rawWifiTitle !== 'Item') ? rawWifiTitle : 'Wi-Fi (QR Code)';
                        const destLabel = wifiSsid
                            ? `${wifiDisplay === 'banner' ? 'Banner' : 'Botão'} · Rede: ${wifiSsid}`
                            : 'Informe o nome da rede (SSID)';
                        displayHTML = `<div class="item-display-title">${moduleTitle}</div><div class="item-display-dest">${destLabel}</div>`;

                        editHTML = `
            <label>Título no cartão</label>
            <input type="text" class="item-title-input" value="${moduleTitle.replace(/"/g, '&quot;')}" placeholder="Ex: Wi-Fi da loja (texto do botão no cartão)">
            <div class="input-group">
                <label>Formato</label>
                <div style="display: flex; gap: 15px; margin-top: 10px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="radio" class="wifi-display-format-input" name="wifi-display-format-${item.id || 'temp'}" value="button" ${wifiDisplay === 'button' ? 'checked' : ''}>
                        <span>Botão</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="radio" class="wifi-display-format-input" name="wifi-display-format-${item.id || 'temp'}" value="banner" ${wifiDisplay === 'banner' ? 'checked' : ''}>
                        <span>Banner</span>
                    </label>
                </div>
            </div>
            <label>Nome da rede Wi-Fi (SSID)</label>
            <small style="display:block;color:#a1a1a1;font-size:0.8rem;margin:4px 0 8px;line-height:1.35;">? o nome que aparece na lista de redes do celular - obrigatório para gerar o QR Code.</small>
            <input type="text" class="wifi-ssid-input" value="${wifiSsid.replace(/"/g, '&quot;')}" placeholder="Ex: MinhaLoja_WiFi ou Visitantes_5G" maxlength="32">
            <label>Seguranf§a</label>
            <select class="wifi-security-input" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color,#2C2C2F);background:var(--card-background-color,#1C1C21);color:var(--text,#ECECEC);">
                <option value="WPA" ${wifiSecurity === 'WPA' || wifiSecurity === 'WPA2' || wifiSecurity === 'WPA3' ? 'selected' : ''}>WPA/WPA2/WPA3</option>
                <option value="WEP" ${wifiSecurity === 'WEP' ? 'selected' : ''}>WEP</option>
                <option value="nopass" ${wifiSecurity === 'nopass' || wifiSecurity === 'NONE' ? 'selected' : ''}>Rede aberta (sem senha)</option>
            </select>
            <label>Senha (opcional)</label>
            <input type="text" class="wifi-password-input" value="${wifiPass.replace(/"/g, '&quot;')}" placeholder="Deixe vazio se for rede aberta" autocomplete="off">
            <label style="display:flex;align-items:center;gap:10px;margin-top:10px;">
                <input type="checkbox" class="wifi-hidden-input" ${wifiHidden ? 'checked' : ''}>
                Rede oculta (SSID não transmitido)
            </label>

            <div class="wifi-logo-section" style="display: ${wifiDisplay === 'button' ? 'block' : 'none'};">
                <label>Logo / ícone no botão (opcional)</label>
                <div class="logo-upload-area" style="margin-bottom: 15px; position: relative; border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: var(--card-background-color, #1C1C21);">
                    <input type="file" class="item-logo-file-input" accept="image/png,image/jpeg,image/jpg" style="display: none;">
                    <img src="${wifiLogoUrl || ''}" class="item-logo-upload-preview wifi-logo-preview" style="max-width: 96px; max-height: 96px; width: 96px; height: 96px; object-fit: contain; margin-bottom: 10px; border-radius: 8px; ${wifiLogoUrl ? 'display:block;' : 'display:none;'}">
                    <div class="logo-upload-text" style="${wifiLogoUrl ? 'display: none;' : ''}">
                        <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--dourado-principal, #FFC700); margin-bottom: 10px;"></i>
                        <p style="margin: 5px 0; color: var(--text, #ECECEC);">Clique para enviar logo (PNG/JPG)</p>
                        <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">Se não enviar, usa o ícone escolhido</span>
                    </div>
                    <button type="button" class="remove-logo-btn" style="display: ${wifiLogoUrl ? 'block' : 'none'}; margin-top: 10px; padding: 5px 15px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-trash"></i> Remover Logo
                    </button>
                    <div class="upload-loader" style="display: none;"></div>
                </div>
                <input type="hidden" class="item-image-url-input wifi-logo-url-input" value="${wifiLogoUrl.replace(/"/g, '&quot;')}">
                <div class="input-group" style="margin-top: 10px;">
                    <label>Tamanho da logo (px)</label>
                    <input type="number" class="item-logo-size-input wifi-logo-size-input" value="${wifiLogoSize}" min="20" max="600" step="1" style="width: 120px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-color, #2C2C2F); background: var(--card-background-color, #1C1C21); color: var(--text, #ECECEC);">
                </div>
                <label style="margin-top: 15px;">Ícone (se não houver logo)</label>
                <div class="item-icon-picker" style="font-size: 2rem; cursor: pointer; color: var(--dourado-principal, #FFC700); width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border: 2px solid var(--border-color, #2C2C2F); border-radius: 8px; margin: 10px 0;" title="Clique para alterar ícone">
                    <i class="${item.icon_class || 'fas fa-wifi'}"></i>
                </div>
            </div>

            <div class="wifi-banner-section" style="display: ${wifiDisplay === 'banner' ? 'block' : 'none'};">
                <label>Imagem do banner</label>
                <div class="image-upload-area wifi-banner-upload-area banner-item" data-item-type="wifi-banner" data-item-id="${item.id || ''}">
                    <input type="file" class="item-file-input" accept="image/*" data-item-type="wifi-banner" data-item-id="${item.id || ''}">
                    <div class="image-upload-text">
                        <p><i class="fas fa-cloud-upload-alt"></i> Clique para fazer upload</p>
                        <span>ou arraste uma imagem aqui</span>
                    </div>
                    <img class="banner-preview wifi-banner-preview" src="${wifiBannerUrl || ''}" style="max-width: 100%; max-height: 200px; margin-top: 10px; display: ${wifiBannerUrl ? 'block' : 'none'};">
                    <div class="upload-loader"></div>
                </div>
                <input type="hidden" class="wifi-banner-url-input" value="${wifiBannerUrl.replace(/"/g, '&quot;')}">
            </div>
        `;
                        break;
                    }
                    case 'texto_com_botao': {
                        itemEl.classList.add('link-item', 'tcb-dashboard-item');
                        let tcb = {};
                        try {
                            if (item.destination_url && String(item.destination_url).trim().startsWith('{')) {
                                tcb = JSON.parse(item.destination_url);
                            }
                        } catch (e) { tcb = {}; }
                        const tcbEsc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
                        const lines = Array.isArray(tcb.lines) ? tcb.lines : [];
                        const l1 = lines[0] || {};
                        const l2 = lines[1] || {};
                        const l3 = lines[2] || {};
                        const tpl = tcb.template || 'evento';
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fas fa-font'} item-icon-picker" title="Texto com Botão"></i>`;
                        displayHTML = `<div class="item-display-title">${tcbEsc(item.title || 'Texto com Botão')}</div><div class="item-display-dest">${tcbEsc(tcb.button_label || 'Inscrever-se')} · ${tcbEsc(tcb.url || 'sem link')}</div>`;
                        editHTML = `
            <input type="hidden" class="tcb-template-input" value="${tcbEsc(tpl)}">
            <div class="input-group">
                <label>Modelo rápido</label>
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
                    <button type="button" class="btn btn-secondary tcb-apply-template" data-template="evento" style="font-size:0.8rem;">Evento</button>
                    <button type="button" class="btn btn-secondary tcb-apply-template" data-template="curso" style="font-size:0.8rem;">Curso</button>
                    <button type="button" class="btn btn-secondary tcb-apply-template" data-template="cta" style="font-size:0.8rem;">CTA simples</button>
                </div>
            </div>
            <label>Selo / linha de cima (opcional)</label>
            <input type="text" class="tcb-eyebrow-input" value="${tcbEsc(tcb.eyebrow || '')}" placeholder="Ex: YOZ Mentoria Impactus CLUB">
            <label>Título</label>
            <input type="text" class="tcb-title-input item-title-input" value="${tcbEsc(item.title || '')}" placeholder="Ex: Encontro Presencial Agosto 2026">
            <label>Linha 1 (data)</label>
            <div style="display:flex;gap:8px;"><input type="text" class="tcb-icon1-input" value="${tcbEsc(l1.icon || '')}" style="width:56px;"><input type="text" class="tcb-line1-input" value="${tcbEsc(l1.text || '')}" placeholder="21/08/2026 — 22/08/2026" style="flex:1;"></div>
            <label>Linha 2 (horário)</label>
            <div style="display:flex;gap:8px;"><input type="text" class="tcb-icon2-input" value="${tcbEsc(l2.icon || '')}" style="width:56px;"><input type="text" class="tcb-line2-input" value="${tcbEsc(l2.text || '')}" placeholder="09:00 - 18:00" style="flex:1;"></div>
            <label>Linha 3 (local)</label>
            <div style="display:flex;gap:8px;"><input type="text" class="tcb-icon3-input" value="${tcbEsc(l3.icon || '')}" style="width:56px;"><input type="text" class="tcb-line3-input" value="${tcbEsc(l3.text || '')}" placeholder="Cidade / local" style="flex:1;"></div>
            <label>Texto do botão</label>
            <input type="text" class="tcb-button-label-input" value="${tcbEsc(tcb.button_label || 'Inscrever-se')}" placeholder="Inscrever-se">
            <label>Link do botão</label>
            <input type="url" class="tcb-url-input item-destination-url-input" value="${tcbEsc(tcb.url || '')}" placeholder="https://...">
        `;
                        break;
                    }
                    case 'pdf':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fa-solid fa-file-pdf'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'PDF'}</div><div class="item-display-dest">${item.pdf_url || 'URL do PDF'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}" placeholder="Título (ex: Baixar Catálogo)"><label>URL do PDF</label><input type="text" class="item-pdf-url-input" value="${item.pdf_url || ''}" placeholder="URL do seu arquivo PDF">`;
                        break;
                    case 'whatsapp':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fab fa-whatsapp'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'WhatsApp'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}" placeholder="Ex: Chamar no WhatsApp"><label>Telefone (com código do país)</label><input type="tel" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="5511999999999 (Brasil) ou 12125551234 (EUA)">`;
                        break;
                    case 'telegram':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fab fa-telegram'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'Telegram'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}" placeholder="Título do Link"><label>URL ou Nome de Usuário</label><input type="text" class="item-destination-url-input" value="${item.destination_url || 'https://t.me/'}" placeholder="https://t.me/seu_usuario">`;
                        break;
                    case 'email':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fas fa-envelope'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'Email'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}" placeholder="Ex: Enviar Email"><label>Endereço de Email</label><input type="email" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="contato@exemplo.com">`;
                        break;
                    case 'facebook':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fab fa-facebook'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'Facebook'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Perfil</label><input type="text" class="item-destination-url-input" value="${item.destination_url || 'https://facebook.com/'}" placeholder="Cole a URL completa do seu perfil">`;
                        break;
                    case 'instagram':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fab fa-instagram'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'Instagram'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Perfil</label><input type="text" class="item-destination-url-input" value="${item.destination_url || 'https://instagram.com/'}" placeholder="Cole a URL completa do seu perfil">`;
                        break;
                    case 'pinterest':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fab fa-pinterest'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'Pinterest'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Perfil</label><input type="text" class="item-destination-url-input" value="${item.destination_url || 'https://pinterest.com/'}" placeholder="Cole a URL completa do seu perfil">`;
                        break;
                    case 'reddit':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fab fa-reddit'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'Reddit'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Perfil</label><input type="text" class="item-destination-url-input" value="${item.destination_url || 'https://reddit.com/u/'}" placeholder="Cole a URL completa do seu perfil">`;
                        break;
                    case 'tiktok':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fab fa-tiktok'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'TikTok'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Perfil</label><input type="text" class="item-destination-url-input" value="${item.destination_url || 'https://tiktok.com/@'}" placeholder="Cole a URL completa do seu perfil">`;
                        break;
                    case 'twitch':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fab fa-twitch'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'Twitch'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Canal</label><input type="text" class="item-destination-url-input" value="${item.destination_url || 'https://twitch.tv/'}" placeholder="Cole a URL completa do seu canal">`;
                        break;
                    case 'twitter':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fab fa-twitter'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'X / Twitter'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Perfil</label><input type="text" class="item-destination-url-input" value="${item.destination_url || 'https://x.com/'}" placeholder="Cole a URL completa do seu perfil">`;
                        break;
                    case 'youtube':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fab fa-youtube'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'YouTube'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Canal</label><input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="Cole a URL completa do seu canal">`;
                        break;
                    case 'spotify':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fab fa-spotify'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'Spotify'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}" placeholder="Ex: Ouça meu Podcast"><label>Link do seu Perfil, Música ou Playlist</label><input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="Cole a URL do Spotify aqui">`;
                        break;
                    case 'linkedin':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fab fa-linkedin'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'LinkedIn'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Perfil</label><input type="text" class="item-destination-url-input" value="${item.destination_url || 'https://linkedin.com/in/'}" placeholder="Cole a URL completa do seu perfil">`;
                        break;
                    case 'portfolio':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fas fa-briefcase'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'Meu Portfólio'}</div><div class="item-display-dest">${item.destination_url || 'Clique para configurar'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>Link do seu Portfólio</label><input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="Cole a URL do seu site ou portff³lio">`;
                        break;
                    case 'product_catalog':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fas fa-store'} item-icon-picker" title="Catálogo"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'Catálogo de Produtos'}</div><div class="item-display-dest">Produtos no cartão</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || 'Catálogo de Produtos'}" placeholder="Título do catálogo">`;
                        break;
                    case 'king_selection':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fas fa-check-double'} item-icon-picker" title="KingSelection"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'KingSelection'}</div><div class="item-display-dest">Galerias de seleção (estilo Alboom)</div>`;
                        editHTML = `
            <div style="padding: 1rem; text-align: center; color: var(--text, #ECECEC);">
                <i class="fas fa-check-double" style="font-size: 3rem; color: var(--dourado-principal, #FFC700); margin-bottom: 1rem;"></i>
                <p>Crie galerias, envie link para o cliente e receba a seleção final com exportação.</p>
                <p style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-dark, #A1A1A1);">Clique em ?oAbrir Painel— para gerenciar.</p>
                <button type="button" class="btn btn-primary" style="margin-top: 1rem;" onclick="window.openKingSelectionAdmin('${item.id}')">
                    <i class="fas fa-external-link-alt"></i> Abrir Painel
                </button>
            </div>
            <input type="hidden" class="item-title-input" value="${item.title || 'KingSelection'}">
        `;
                        break;
                    case 'instagram_embed':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fab fa-instagram'} item-icon-picker" title="Alterar Ícone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'Instagram Incorporado'}</div><div class="item-display-dest">${item.destination_url || 'Cole o link do perfil'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>URL do Perfil do Instagram</label><input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="https://www.instagram.com/p/...">`;
                        break;
                    case 'youtube_embed':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fab fa-youtube'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'YouTube Embed'}</div><div class="item-display-dest">${item.destination_url || 'Cole o link do vf­deo'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>URL do Vídeo do YouTube</label><input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="https://www.youtube.com/watch?v=...">`;
                        break;
                    case 'tiktok_embed':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fab fa-tiktok'} item-icon-picker" title="Alterar Ícone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'TikTok Embed'}</div><div class="item-display-dest">${item.destination_url || 'Cole o link do perfil'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>URL do Perfil do TikTok</label><input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="https://www.tiktok.com/@seu_usuario">`;
                        break;
                    case 'spotify_embed':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fab fa-spotify'} item-icon-picker" title="Alterar Ícone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'Spotify Embed'}</div><div class="item-display-dest">${item.destination_url || 'Cole o link do perfil'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>URL do Perfil do Spotify</label><input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="https://open.spotify.com/user/seu_usuario ou https://open.spotify.com/artist/seu_artista">`;
                        break;
                    case 'linkedin_embed':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fab fa-linkedin'} item-icon-picker" title="Alterar Ícone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'LinkedIn Embed'}</div><div class="item-display-dest">${item.destination_url || 'Cole o link do perfil'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>URL do Perfil do LinkedIn</label><input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="https://www.linkedin.com/in/seu_perfil">`;
                        break;
                    case 'pinterest_embed':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fab fa-pinterest'} item-icon-picker" title="Alterar Ícone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'Pinterest Embed'}</div><div class="item-display-dest">${item.destination_url || 'Cole o link do perfil'}</div>`;
                        editHTML = `<label>Título</label><input type="text" class="item-title-input" value="${item.title || ''}"><label>URL do Perfil do Pinterest</label><input type="text" class="item-destination-url-input" value="${item.destination_url || ''}" placeholder="https://www.pinterest.com/seu_usuario ou https://br.pinterest.com/seu_usuario">`;
                        break;
                    case 'pdf_embed':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fas fa-file-import'} item-icon-picker" title="Alterar fcone"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'PDF Embed'}</div><div class="item-display-dest">${item.pdf_url && item.pdf_url !== '#' ? 'Arquivo carregado' : 'Nenhum arquivo'}</div>`;
                        editHTML = `
            <input type="hidden" class="item-title-input" value="${item.title || ''}">
            <div class="image-upload-area pdf-upload-area">
                <input type="file" class="item-file-input" accept=".pdf">
                <div class="image-upload-text">
                    <p>${item.pdf_url && item.pdf_url !== '#' ? 'Trocar Arquivo' : 'Selecionar Arquivo PDF'}</p>
                    <span>Clique para enviar (max 10MB)</span>
                </div>
                <div class="upload-loader"></div>
            </div>
            <input type="hidden" class="item-pdf-url-input" value="${item.pdf_url || '#'}">
        `;
                        break;
                    case 'sales_page':
                        // Página de Vendas - renderizar como módulo simples (edição é na página dedicada)
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fas fa-store'} item-icon-picker" title="Página de Vendas"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'Página de Vendas'}</div><div class="item-display-dest">Gerencie produtos e vendas</div>`;
                        // HTML de edição simplificado (o botão editar redireciona para página dedicada)
                        editHTML = `
            <div style="padding: 1rem; text-align: center; color: var(--text, #ECECEC);">
                <i class="fas fa-store" style="font-size: 3rem; color: var(--dourado-principal, #FFC700); margin-bottom: 1rem;"></i>
                <p>A edição completa da Página de Vendas é feita em uma página dedicada.</p>
                <p style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-dark, #A1A1A1);">Clique em "Salvar" e depois em "Editar" para acessar a página de edição completa.</p>
            </div>
            <input type="hidden" class="item-title-input" value="${item.title || 'Página de Vendas'}">
        `;
                        break;
                    case 'digital_form':
                        // Formulário King - renderizar como módulo
                        itemEl.classList.add('link-item');
                        const digitalFormData = item.digital_form_data || {};
                        const formDisplayFormat = digitalFormData.display_format || 'button';
                        const formImageUrl = formDisplayFormat === 'banner' ? (digitalFormData.banner_image_url || item.image_url) : null;

                        if (formDisplayFormat === 'banner' && formImageUrl) {
                            iconOrThumbHTML = `<img src="${formImageUrl}" class="banner-preview-thumb" alt="Preview" style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><i class="fas fa-file-signature" style="display: none;"></i>`;
                        } else {
                            iconOrThumbHTML = `<i class="${item.icon_class || 'fas fa-file-signature'} item-icon-picker" title="Formulário King"></i>`;
                        }

                        displayHTML = `<div class="item-display-title">${item.title || 'Formulário King'}</div><div class="item-display-dest">${formDisplayFormat === 'banner' ? 'Formato: Banner' : 'Formato: Botão'}</div>`;

                        // HTML de edição - será carregado dinamicamente
                        editHTML = `
            <div style="padding: 1rem; text-align: center; color: var(--text, #ECECEC);">
                <i class="fas fa-file-alt" style="font-size: 3rem; color: var(--dourado-principal, #FFC700); margin-bottom: 1rem;"></i>
                <p>Clique em "Salvar" e depois em "Editar" para configurar o formulário.</p>
            </div>
            <input type="hidden" class="item-title-input" value="${item.title || 'Formulário King'}">
        `;
                        break;
                    case 'guest_list':
                        // Lista de Convidados - renderizar como módulo
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fas fa-users'} item-icon-picker" title="Lista de Convidados"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'Lista de Convidados'}</div><div class="item-display-dest">Gerencie convidados e confirmações</div>`;

                        // HTML de edição - será carregado dinamicamente
                        editHTML = `
            <div style="padding: 1rem; text-align: center; color: var(--text, #ECECEC);">
                <i class="fas fa-users" style="font-size: 3rem; color: var(--dourado-principal, #FFC700); margin-bottom: 1rem;"></i>
                <p>Clique em "Salvar" e depois em "Editar" para gerenciar a lista de convidados.</p>
            </div>
            <input type="hidden" class="item-title-input" value="${item.title || 'Lista de Convidados'}">
        `;
                        break;
                    case 'agenda':
                    case 'contract':
                    case 'photographer_site':
                        // módulos removidos - não renderizar no editor
                        break;
                    case 'convite':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fas fa-envelope-open-text'} item-icon-picker" title="Convite Digital"></i>`;
                        const conviteData = item.convite_data || {};
                        displayHTML = `<div class="item-display-title">${item.title || conviteData.subtitulo || 'Convite Digital'}</div><div class="item-display-dest">Edite o convite</div>`;
                        editHTML = `
            <div style="padding: 1rem; text-align: center; color: var(--text, #ECECEC);">
                <i class="fas fa-envelope-open-text" style="font-size: 3rem; color: var(--dourado-principal, #FFC700); margin-bottom: 1rem;"></i>
                <p>Clique em "Salvar" e depois em "Editar" para personalizar o convite.</p>
                <a href="conviteEdit.html?itemId=${item.id}" target="_blank" rel="noopener" style="display:inline-block;margin-top:0.75rem;padding:10px 20px;background:var(--dourado-principal,#FFC700);color:#000;border-radius:8px;font-weight:600;text-decoration:none;">Abrir editor de convite</a>
            </div>
            <input type="hidden" class="item-title-input" value="${item.title || conviteData.subtitulo || 'Convite'}">
        `;
                        break;
                    case 'bible':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fas fa-bible'} item-icon-picker" title="Bíblia"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || 'Bíblia'}</div><div class="item-display-dest">Versículo do dia</div>`;
                        editHTML = `
            <div style="padding: 1rem; text-align: center; color: var(--text, #ECECEC);">
                <i class="fas fa-bible" style="font-size: 3rem; color: var(--dourado-principal, #FFC700); margin-bottom: 1rem;"></i>
                <p>Clique em "Salvar" e depois em "Editar" para configurar tradução e preferências.</p>
                <a href="bibliaking.html" target="_blank" rel="noopener" onclick="try { sessionStorage.setItem('bible_item_id', '${item.id}'); sessionStorage.setItem('bible_panel_item_id', '${item.id}'); } catch(e) {}" style="display:inline-block;margin-top:0.75rem;padding:10px 20px;background:var(--dourado-principal,#FFC700);color:#000;border-radius:8px;font-weight:600;text-decoration:none;">Abrir configurações da Bíblia</a>
            </div>
            <input type="hidden" class="item-title-input" value="${item.title || 'Bíblia'}">
        `;
                        break;
                    case 'location':
                        itemEl.classList.add('link-item');
                        iconOrThumbHTML = `<i class="${item.icon_class || 'fas fa-map-marker-alt'} item-icon-picker" title="Localização"></i>`;
                        var locData = item.location_data || {};
                        var locAddr = (locData.address_formatted || locData.address || '').replace(/</g, '&lt;').replace(/"/g, '&quot;');
                        var locLat = locData.latitude != null ? String(locData.latitude) : '';
                        var locLng = locData.longitude != null ? String(locData.longitude) : '';
                        displayHTML = `<div class="item-display-title">${(item.title || 'Localização').replace(/</g, '&lt;')}</div><div class="item-display-dest">${(locAddr || 'Endereço não definido').slice(0, 40)}</div>`;
                        editHTML = `
            <div class="location-edit-panel" data-item-id="${item.id}" style="padding: 1rem; color: var(--text, #ECECEC);">
                <label style="display:block;margin-bottom:6px;font-weight:600;">Título do botão</label>
                <input type="text" class="item-title-input location-title-input" value="${(item.title || 'Localização').replace(/"/g, '&quot;')}" placeholder="Ex: Onde me encontrar" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:inherit;margin-bottom:1rem;">
                <label style="display:block;margin-bottom:6px;font-weight:600;">Endereço</label>
                <div style="display:flex;gap:8px;margin-bottom:8px;">
                    <input type="text" class="location-address-input" value="${locAddr}" placeholder="Digite o endereço ou pesquise..." style="flex:1;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:inherit;">
                    <button type="button" class="location-search-btn" style="padding:10px 16px;border-radius:8px;background:var(--dourado-principal,#FFC700);color:#000;border:none;font-weight:600;cursor:pointer;white-space:nowrap;"><i class="fas fa-search"></i> Pesquisar</button>
                </div>
                <p class="location-formatted-display" style="font-size:0.9em;opacity:0.9;margin:0 0 12px 0;min-height:1.4em;">${(locData.address_formatted || '').replace(/</g, '&lt;')}</p>
                <input type="hidden" class="location-lat-input" value="${locLat}">
                <input type="hidden" class="location-lng-input" value="${locLng}">
                <div class="location-map-preview-edit" style="height:180px;border-radius:12px;overflow:hidden;background:rgba(0,0,0,0.3);margin-top:12px;position:relative;">
                    <iframe id="location-map-iframe-${item.id}" style="width:100%;height:100%;border:none;" title="Mapa"></iframe>
                    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);color:rgba(255,255,255,0.7);" class="location-map-placeholder"><i class="fas fa-map-marker-alt" style="font-size:2rem;"></i><span style="margin-left:8px;">Defina o endereço e pesquise para ver o mapa</span></div>
                </div>
                <p style="font-size:0.75rem;opacity:0.7;margin-top:8px;">No cartão, o visitante poderá abrir no Google Maps ou no Waze.</p>
            </div>
        `;
                        break;
                    default:
                        iconOrThumbHTML = `<i class="fas fa-puzzle-piece item-icon-picker" title="Módulo"></i>`;
                        displayHTML = `<div class="item-display-title">${item.title || item.item_type || 'Módulo'}</div><div class="item-display-dest" style="color:#E74C3C;font-size:0.85rem;">Tipo ainda sem editor completo: ${item.item_type}</div>`;
                        editHTML = `<p style="padding:1rem;color:#E74C3C;">Este tipo (${item.item_type}) aparece no cartão, mas o editor ainda não tem formulário dedicado. Atualize a página (Ctrl+F5) se acabou de adicionar um módulo novo.</p>`;
                        break;
                }

                // Salvar logo_size no dataset para uso posterior
                if (item.item_type === 'link' && item.logo_size) {
                    itemEl.dataset.logoSize = item.logo_size;
                }

                // Nova estrutura de módulos
                itemEl.className = 'module-item';
                const isActive = item.is_active !== false; // Padrão: ativo se não especificado

                // Extrair ícone ou imagem do iconOrThumbHTML corretamente
                let moduleIconHTML = '';
                // Criar um div temporário para parsear o HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = iconOrThumbHTML;

                // Procurar por imagem primeiro
                const imgEl = tempDiv.querySelector('img');
                if (imgEl) {
                    // Se for imagem, criar uma nova tag img limpa
                    const imgSrc = imgEl.getAttribute('src') || '';
                    moduleIconHTML = `<img src="${imgSrc}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><i class="${getDefaultIcon(item.item_type)}" style="display: none;"></i>`;
                } else {
                    // Se for ícone, extrair a classe do ícone
                    const iconEl = tempDiv.querySelector('i');
                    if (iconEl) {
                        const iconClass = iconEl.getAttribute('class') || getDefaultIcon(item.item_type);
                        moduleIconHTML = `<i class="${iconClass}"></i>`;
                    } else {
                        // Fallback: usar ícone padrão
                        moduleIconHTML = `<i class="${getDefaultIcon(item.item_type)}"></i>`;
                    }
                }

                /* Layout: nome em cima | linha com setas + ícone + desativar + (editar + duplicar + deletar OU para digital_form só "Configurar no King Forms") */
                const isKingForms = item.item_type === 'digital_form';
                const actionsHTML = isKingForms
                    ? `<label class="module-toggle" title="Mostrar no cartão">
                            <input type="checkbox" class="module-toggle-input" ${isActive ? 'checked' : ''} data-item-id="${item.id}">
                            <span class="module-toggle-slider"></span>
                        </label>
                        <a href="kingForms.html?edit=${encodeURIComponent(item.id)}" target="_blank" class="module-action-btn king-forms-config-btn" title="Editar King Forms" data-item-id="${item.id}" aria-label="Editar King Forms"><i class="fas fa-pen"></i></a>`
                    : `<label class="module-toggle" title="Desativar">
                            <input type="checkbox" class="module-toggle-input" ${isActive ? 'checked' : ''} data-item-id="${item.id}">
                            <span class="module-toggle-slider"></span>
                        </label>
                        <button class="module-action-btn edit edit-item-btn" title="Editar Módulo" data-item-id="${item.id}">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="module-action-btn duplicate duplicate-item-btn" title="Duplicar Módulo" data-item-id="${item.id}">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="module-action-btn delete delete-item-btn" title="Excluir Módulo" data-item-id="${item.id}">
                            <i class="fas fa-trash"></i>
                        </button>`;
                itemEl.innerHTML = `
                <div class="module-name module-name-row">${moduleListDisplayTitle(item)}</div>
                <div class="module-content-wrapper">
                    <div class="module-drag-controls">
                        <button class="module-move-btn move-up" title="Mover para cima" data-item-id="${item.id}" data-direction="up">
                            <i class="fas fa-chevron-up"></i>
                        </button>
                        <div class="module-drag-handle" title="Arrastar para reordenar">
                            <i class="fas fa-grip-vertical"></i>
                        </div>
                        <button class="module-move-btn move-down" title="Mover para baixo" data-item-id="${item.id}" data-direction="down">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                    <div class="module-icon">${moduleIconHTML}</div>
                    <div class="module-actions-inline">
                        ${actionsHTML}
                    </div>
                </div>
                <div class="item-content" style="display: none;">
                    <div class="item-details-display">${displayHTML}</div>
                    <div class="item-inputs-edit">${editHTML}</div>
                </div>
            `;

                // Garantir que data-id e data-item-type estão definidos após innerHTML
                if (!itemEl.dataset.id) itemEl.dataset.id = item.id;
                if (!itemEl.dataset.itemType) itemEl.dataset.itemType = item.item_type;

                // Adicionar event listeners para o slider de tamanho da logo (se for link)
                if (item.item_type === 'link') {
                    const logoSizeSlider = itemEl.querySelector('.item-logo-size-slider');
                    const logoSizeInput = itemEl.querySelector('.item-logo-size-input');
                    const logoSizeValueSpan = itemEl.querySelector('#logo-size-value-' + (item.id || 'temp'));
                    const logoPreview = itemEl.querySelector('.item-logo-upload-preview');
                    const logoPreviewInList = itemEl.querySelector('.item-logo-preview');

                    if (logoSizeSlider && logoSizeInput) {
                        // Sincronizar slider com input numérico
                        logoSizeSlider.addEventListener('input', (e) => {
                            const value = parseInt(e.target.value);
                            if (logoSizeInput) logoSizeInput.value = value;
                            if (logoSizeValueSpan) logoSizeValueSpan.textContent = value;
                            if (logoPreview) {
                                const previewSize = Math.min(value, 100);
                                logoPreview.style.width = previewSize + 'px';
                                logoPreview.style.height = previewSize + 'px';
                                logoPreview.style.maxWidth = previewSize + 'px';
                                logoPreview.style.maxHeight = previewSize + 'px';
                            }
                            // Atualizar preview ao vivo
                            updateLivePreviewFromForm();
                        });

                        logoSizeInput.addEventListener('input', (e) => {
                            let value = parseInt(e.target.value);
                            if (isNaN(value)) value = 24;
                            if (value < 20) value = 20;
                            if (value > 600) value = 600;
                            logoSizeInput.value = value;
                            if (logoSizeSlider) logoSizeSlider.value = value;
                            if (logoSizeValueSpan) logoSizeValueSpan.textContent = value;
                            if (logoPreview) {
                                const previewSize = Math.min(value, 100);
                                logoPreview.style.width = previewSize + 'px';
                                logoPreview.style.height = previewSize + 'px';
                                logoPreview.style.maxWidth = previewSize + 'px';
                                logoPreview.style.maxHeight = previewSize + 'px';
                            }
                            // NÃO atualizar logo na lista - ela deve permanecer fixa (40px)
                            // O tamanho só aplica no cartão público (profile.ejs)
                            itemEl.dataset.logoSize = value;
                            // Atualizar preview ao vivo
                            updateLivePreviewFromForm();
                        });
                    }

                    // Adicionar event listeners para os radio buttons de ajuste da logo
                    const logoFitModeRadios = itemEl.querySelectorAll('input[name*="logo-fit-mode"]');
                    const logoFitModeInput = itemEl.querySelector('.item-logo-fit-mode-input');
                    if (logoFitModeRadios.length > 0 && logoFitModeInput) {
                        logoFitModeRadios.forEach(radio => {
                            radio.addEventListener('change', (e) => {
                                if (e.target.checked) {
                                    logoFitModeInput.value = e.target.value;
                                    // Atualizar estilos dos labels
                                    logoFitModeRadios.forEach(r => {
                                        const label = itemEl.querySelector(`label[for="${r.id}"]`);
                                        if (label) {
                                            if (r.checked) {
                                                label.style.background = 'var(--dourado-principal, #FFC700)';
                                                label.style.color = '#000';
                                            } else {
                                                label.style.background = 'transparent';
                                                label.style.color = 'var(--text, #ECECEC)';
                                            }
                                        }
                                    });
                                    // Atualizar preview ao vivo
                                    updateLivePreviewFromForm();
                                }
                            });
                        });
                    }
                }

                if (item.item_type === 'wifi') {
                    const formatRadios = itemEl.querySelectorAll('.wifi-display-format-input');
                    const logoSec = itemEl.querySelector('.wifi-logo-section');
                    const banSec = itemEl.querySelector('.wifi-banner-section');
                    const modIcon = itemEl.querySelector('.module-icon');
                    if (modIcon) modIcon.setAttribute('title', 'Clique para ver QR Code, rede e senha');
                    const syncWifiPanels = () => {
                        const sel = itemEl.querySelector('.wifi-display-format-input:checked');
                        const mode = sel ? sel.value : 'button';
                        if (logoSec) logoSec.style.display = mode === 'banner' ? 'none' : 'block';
                        if (banSec) banSec.style.display = mode === 'banner' ? 'block' : 'none';
                        updateLivePreviewFromForm();
                    };
                    formatRadios.forEach(r => r.addEventListener('change', syncWifiPanels));

                    const ssidInput = itemEl.querySelector('.wifi-ssid-input');
                    const displayDest = itemEl.querySelector('.item-display-dest');
                    const syncSsidLabel = () => {
                        const ssid = (ssidInput?.value || '').trim();
                        const sel = itemEl.querySelector('.wifi-display-format-input:checked');
                        const mode = sel ? sel.value : 'button';
                        if (displayDest) {
                            displayDest.textContent = ssid
                                ? `${mode === 'banner' ? 'Banner' : 'Botão'} · Rede: ${ssid}`
                                : 'Informe o nome da rede (SSID)';
                        }
                        updateLivePreviewFromForm();
                    };
                    if (ssidInput) ssidInput.addEventListener('input', syncSsidLabel);

                    const wifiPassInput = itemEl.querySelector('.wifi-password-input');
                    const wifiSecInput = itemEl.querySelector('.wifi-security-input');
                    const wifiHiddenInput = itemEl.querySelector('.wifi-hidden-input');
                    [wifiPassInput, wifiSecInput].forEach(inp => {
                        if (inp) inp.addEventListener('input', updateLivePreviewFromForm);
                    });
                    if (wifiHiddenInput) wifiHiddenInput.addEventListener('change', updateLivePreviewFromForm);

                    const logoSizeInputW = itemEl.querySelector('.wifi-logo-size-input');
                    if (logoSizeInputW) {
                        logoSizeInputW.addEventListener('input', () => {
                            itemEl.dataset.logoSize = logoSizeInputW.value;
                            updateLivePreviewFromForm();
                        });
                    }
                }

                try {
                    // Re-buscar o container a cada iteração para garantir que está acessível
                    const currentContainer = SELECTORS.itemsContainer || document.getElementById('items-container');
                    if (!currentContainer) {
                        console.error(`O Container não existe ao tentar adicionar item ${item.id}`);
                        return;
                    }
                    currentContainer.appendChild(itemEl);
                    if (itemIndex < 3) { // Log apenas os 3 primeiros para não poluir o console
                        console.log(`Item ${item.id} (${item.item_type}) adicionado ao container`);
                    }
                } catch (appendError) {
                    console.error(`O Erro ao adicionar item ${item.id} ao container:`, appendError);
                    console.error('Stack trace:', appendError.stack);
                }
                } catch (itemRenderError) {
                    console.error(`O Falha ao renderizar módulo ${item.id} (${item.item_type}):`, itemRenderError);
                    appendMinimalModuleListItem(item);
                }
            });

            // Verificar quantos itens foram realmente adicionados
            const finalContainer = SELECTORS.itemsContainer || document.getElementById('items-container');
            const itemsAdded = finalContainer?.querySelectorAll('.item, .module-item').length || 0;
            console.log(`Renderização concluída: ${itemsAdded} de ${uniqueItems.length} itens adicionados ao container`);
            if (itemsAdded < uniqueItems.length) {
                const containerCheck = SELECTORS.itemsContainer || document.getElementById('items-container');
                const notInDom = uniqueItems.filter(function (it) {
                    return containerCheck && !containerCheck.querySelector('[data-id="' + it.id + '"]');
                });
                if (notInDom.length) {
                    console.warn(`Discrepância: esperado ${uniqueItems.length} na aba Módulos, ${itemsAdded} no DOM. Em falta:`, notInDom.map(function (m) {
                        return (m.item_type || '?') + '#' + m.id;
                    }).join(', '));
                    notInDom.forEach(function (it) { appendMinimalModuleListItem(it); });
                }
            }

            if (itemsAdded === 0 && uniqueItems.length > 0) {
                console.error('O ERRO CRÍTICO: Itens não foram adicionados ao container!');
                const debugContainer = SELECTORS.itemsContainer || document.getElementById('items-container');
                console.error('Container existe?', !!debugContainer);
                if (debugContainer) {
                    console.error('Container ID:', debugContainer.id);
                    console.error('Container classes:', debugContainer.className);
                    console.error('Container parent:', debugContainer.parentElement?.tagName);
                    console.error('Container display:', window.getComputedStyle(debugContainer).display);
                    console.error('Container visibility:', window.getComputedStyle(debugContainer).visibility);
                } else {
                    console.error('O Container não existe no DOM!');
                }
            }

            // Restaurar estado local dos itens preservados
            restoreLocalItemStates(preservedStates);

            updateLivePreviewFromForm();
            initSortable();
            // setupMoveButtons() já é chamado dentro de initSortable(), não precisa chamar novamente

            // Configurar upload de foto após renderizar editor (elementos podem ter sido recriados)
            if (typeof window.setupPhotoUpload === 'function') {
                setTimeout(() => {
                    // Remover flag para permitir reconfiguração
                    const uploadArea = document.getElementById('dashboard-photo-upload-area');
                    if (uploadArea) {
                        uploadArea.dataset.listenersAdded = 'false';
                    }
                    window.setupPhotoUpload();
                }, 100);
            }
        } catch (error) {
            console.error('O Erro em renderEditor:', error);
            console.error('profileData recebido:', profileData);
            console.error('Stack trace:', error.stack);

            // Tentar renderizar pelo menos os campos básicos mesmo com erro
            try {
                if (SELECTORS.displayNameInput && profileData?.details?.display_name) {
                    SELECTORS.displayNameInput.value = profileData.details.display_name;
                }
                if (SELECTORS.whatsappNumberInput && profileData?.details?.whatsapp) {
                    SELECTORS.whatsappNumberInput.value = profileData.details.whatsapp;
                }
                if (SELECTORS.bioInput && profileData?.details?.bio) {
                    SELECTORS.bioInput.value = profileData.details.bio;
                }
                if (SELECTORS.profileSlugInput && profileData?.details?.profile_slug) {
                    SELECTORS.profileSlugInput.value = profileData.details.profile_slug;
                }
            } catch (fallbackError) {
                console.error('O Erro também no fallback de renderização:', fallbackError);
            }

            // Propagar o erro para que fetchProfileData possa tratá-lo
            throw error;
        }
    }
    window.renderEditor = renderEditor;

    async function handleDashboardPhotoUpload(imageFile) {
        if (!SELECTORS.dashboardPhotoUploadArea) return;

        SELECTORS.dashboardPhotoUploadArea.classList.add('is-uploading');
        try {
            const authResponse = await safeFetch(`${API_URL}/api/upload/auth`, {
                method: 'POST',
                headers: HEADERS_AUTH
            });
            if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');
            const { uploadURL } = await authResponse.json();

            const formData = new FormData();

            // Preservar PNG para manter transparência
            const isPNG = imageFile.type === 'image/png' || (imageFile.name && imageFile.name.toLowerCase().endsWith('.png'));
            const fileName = isPNG ? 'profile-picture.png' : 'profile-picture.jpg';
            formData.append('file', imageFile, fileName);

            const uploadResponse = await fetch(uploadURL, { method: 'POST', headers: getAuthHeaders(), body: formData });
            if (!uploadResponse.ok) throw new Error('Falha no upload para o Cloudflare.');
            const uploadData = await uploadResponse.json();

            const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";
            const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : '');
            if (!finalUrl) throw new Error('Resposta do servidor de upload inválida. Tente novamente.');

            setAvatarSrc(SELECTORS.dashboardPhotoPreview, finalUrl);
            setAvatarSrc(SELECTORS.previewAvatar, finalUrl);

            // Atualizar profile_image_url imediatamente para salvar depois
            if (window.currentProfileData && window.currentProfileData.details) {
                window.currentProfileData.details.profile_image_url = finalUrl;
            }
            if (window.lastProfileData && window.lastProfileData.details) {
                window.lastProfileData.details.profile_image_url = finalUrl;
            }

            console.log('Foto de perfil atualizada com sucesso:', finalUrl);

        } catch (error) {
            console.error('Erro no upload da foto de perfil:', error);
            alert(`Erro: ${error.message}`);
        } finally {
            SELECTORS.dashboardPhotoUploadArea.classList.remove('is-uploading');
        }
    }

    async function handleDashboardAvatarUpload(imageFile) {
        if (!SELECTORS.dashboardAvatarUploadArea) return;

        SELECTORS.dashboardAvatarUploadArea.classList.add('is-uploading');
        try {
            const authResponse = await safeFetch(`${API_URL}/api/upload/auth`, {
                method: 'POST',
                headers: HEADERS_AUTH
            });
            if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');
            const { uploadURL } = await authResponse.json();

            const formData = new FormData();
            formData.append('file', imageFile, 'avatar.jpg');

            const uploadResponse = await fetch(uploadURL, { method: 'POST', headers: getAuthHeaders(), body: formData });
            if (!uploadResponse.ok) throw new Error('Falha no upload para o Cloudflare.');
            const uploadData = await uploadResponse.json();

            const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";
            const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : '');
            if (!finalUrl) throw new Error('Resposta do servidor de upload inválida. Tente novamente.');

            setAvatarSrc(SELECTORS.dashboardAvatarPreview, finalUrl);

            alert('Avatar atualizado com sucesso!');

        } catch (error) {
            console.error('Erro no upload do avatar:', error);
            alert(`Erro: ${error.message}`);
        } finally {
            SELECTORS.dashboardAvatarUploadArea.classList.remove('is-uploading');
        }
    }

    // Função para atualizar o seletor de formato do avatar
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

    // Função para salvar o formato do avatar
    async function saveAvatarFormat(format) {
        try {
            console.log('Salvando formato do avatar:', format);
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

            console.log('Formato do avatar salvo com sucesso:', format);

        } catch (error) {
            console.error('Erro ao salvar formato do avatar:', error);
            alert(`Erro: ${error.message}`);
        }
    }

    async function handleImageUpload(imageFile, itemElement) {
        // Wi-Fi: upload da imagem do banner (não usar rota de banner nem salvar como item "banner")
        const isDomElStart = itemElement && typeof itemElement.querySelector === 'function';
        const isWifiItem = isDomElStart && itemElement.dataset && itemElement.dataset.itemType === 'wifi';
        if (isWifiItem) {
            const urlInput = itemElement.querySelector('.wifi-banner-url-input');
            const imgPreview = itemElement.querySelector('.wifi-banner-preview');
            if (itemElement.classList) itemElement.classList.add('is-uploading');
            try {
                const authResponse = await fetch(`${API_URL}/api/upload/auth`, { method: 'POST', headers: HEADERS });
                if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');
                const { uploadURL } = await authResponse.json();
                const formData = new FormData();
                const originalName = imageFile.name || 'wifi-banner.png';
                const isPNG = originalName.toLowerCase().endsWith('.png') || imageFile.type === 'image/png';
                const fileExtension = isPNG ? 'png' : (originalName.split('.').pop() || 'jpg');
                const fileName = originalName.includes('.') ? originalName : `${originalName.split('.')[0] || 'wifi-banner'}.${fileExtension}`;
                formData.append('file', imageFile, fileName);
                const uploadResponse = await fetch(uploadURL, { method: 'POST', headers: getAuthHeaders(), body: formData });
                if (!uploadResponse.ok) throw new Error('Falha no upload para o Cloudflare.');
                const uploadData = await uploadResponse.json();
                const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/MBdqwyqeFtFBvKiQjgzjtQ/${uploadData.result.id}/public` : '');
                if (!finalUrl) throw new Error('URL da imagem não retornada.');
                if (urlInput) urlInput.value = finalUrl;
                if (imgPreview) {
                    imgPreview.src = finalUrl;
                    imgPreview.style.display = 'block';
                }
                const thumbList = itemElement.querySelector('.banner-preview-thumb');
                if (thumbList) {
                    thumbList.src = finalUrl;
                    thumbList.style.display = 'block';
                }
                const editId = SELECTORS.editItemModal?.dataset?.editingId;
                const itemDomId = itemElement.dataset?.id;
                if (editId && itemDomId && String(itemDomId) === String(editId)) {
                    const modalBan = document.getElementById('edit-wifi-banner-url');
                    const modalPrev = document.getElementById('edit-wifi-banner-preview');
                    if (modalBan) modalBan.value = finalUrl;
                    if (modalPrev) {
                        modalPrev.src = finalUrl;
                        modalPrev.style.display = 'block';
                    }
                    const modalUploadText = SELECTORS.editItemModal?.querySelector('.wifi-banner-upload-area .image-upload-text p');
                    if (modalUploadText) modalUploadText.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Trocar Imagem';
                }
                updateLivePreviewFromForm();
            } catch (error) {
                console.error('Erro no upload Wi-Fi banner:', error);
                alert(`Erro: ${error.message}`);
            } finally {
                if (itemElement.classList) itemElement.classList.remove('is-uploading');
            }
            return;
        }

        // Verificar se f© carrossel ou banner (banner pode virar carrossel)
        const isBanner = itemElement && itemElement.dataset.itemType === 'banner';
        const isCarousel = itemElement && (itemElement.classList.contains('banner-carousel') || window.currentCarouselItemId);
        const itemId = (isCarousel || isBanner) ? (window.currentCarouselItemId || itemElement?.dataset?.id) : null;

        // IMPORTANTE: Se for banner (não carrossel), pular a lógica de carrossel
        // Banners devem ir direto para a lógica de banner normal (mais abaixo)
        if (isCarousel && itemId && !isBanner) {
            // Upload para carrossel (NÃO banner)
            try {
                const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                    method: 'POST',
                    headers: HEADERS
                });
                if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');

                const { uploadURL } = await authResponse.json();

                const formData = new FormData();
                // Preservar o nome original do arquivo e extensão para manter PNG
                const originalName = imageFile.name || 'banner-image';
                const fileExtension = originalName.split('.').pop() || (imageFile.type.includes('png') ? 'png' : 'jpg');
                const fileName = originalName.includes('.') ? originalName : `${originalName}.${fileExtension}`;
                formData.append('file', imageFile, fileName);

                const uploadResponse = await fetch(uploadURL, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: formData
                });
                if (!uploadResponse.ok) throw new Error('Falha no upload para o Cloudflare.');

                const uploadData = await uploadResponse.json();
                const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/MBdqwyqeFtFBvKiQjgzjtQ/${uploadData.result.id}/public` : '');

                // Adicionar imagem ao carrossel ou banner
                const carouselListEl = document.querySelector('#carousel-images-list-' + itemId);
                const inputGroup = carouselListEl?.closest('.input-group');
                const hiddenInputInGroup = inputGroup?.querySelector('input[type="hidden"]#edit-dest-url-hidden');
                const editModalInputHidden = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url-hidden`);
                const editModalInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url`);
                const itemDestInput = document.querySelector('.item[data-id="' + itemId + '"] .item-destination-url-input');
                const hiddenInput = hiddenInputInGroup || editModalInputHidden || editModalInput || itemDestInput;

                console.log('Procurando input hidden para itemId:', itemId);
                console.log('Inputs encontrados:', {
                    hiddenInputInGroup: !!hiddenInputInGroup,
                    editModalInputHidden: !!editModalInputHidden,
                    editModalInput: !!editModalInput,
                    itemDestInput: !!itemDestInput,
                    hiddenInput: !!hiddenInput
                });

                if (hiddenInput) {
                    try {
                        let images = [];
                        const currentValue = hiddenInput.value || '[]';
                        if (currentValue.trim() && currentValue !== '#') {
                            try {
                                images = JSON.parse(currentValue);
                            } catch (e) {
                                // Se não é JSON, pode ser uma URL única - converter para array
                                if (currentValue && !currentValue.startsWith('[')) {
                                    images = [currentValue];
                                }
                            }
                        }

                        if (!Array.isArray(images)) {
                            images = [];
                        }

                        images.push(finalUrl);
                        hiddenInput.value = JSON.stringify(images);

                        // Atualizar também o input de image_url se existir
                        const imageUrlInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-image-url`);
                        if (imageUrlInput) {
                            imageUrlInput.value = images[0] || '';
                        }

                        // Atualizar também o input hidden do carrossel se existir
                        const destUrlHiddenInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url-hidden`);
                        if (destUrlHiddenInput) {
                            destUrlHiddenInput.value = JSON.stringify(images);
                        }

                        console.log(`Banner agora tem ${images.length} imagem${images.length !== 1 ? 'ns' : ''}`);
                        console.log('Imagens:', images);

                        // Renderizar imagens - tentar no modal primeiro, depois no item
                        setTimeout(() => {
                            renderCarouselImagesNew(itemId, images);
                        }, 100);

                        // Atualizar contador no display
                        const itemEl = document.querySelector(`.item[data-id="${itemId}"]`);
                        if (itemEl) {
                            const displayDest = itemEl.querySelector('.item-display-dest');
                            if (displayDest) {
                                if (images.length > 1) {
                                    displayDest.textContent = `${images.length} fotos (Carrossel)`;
                                } else {
                                    displayDest.textContent = '1 foto';
                                }
                            }
                        }

                        // Atualizar preview ao vivo
                        if (typeof updateLivePreviewFromForm === 'function') {
                            updateLivePreviewFromForm();
                        }
                    } catch (e) {
                        console.error('Erro ao adicionar imagem ao banner:', e);
                        alert('Erro ao processar a imagem. Tente novamente.');
                    }
                } else {
                    console.error(`Input hidden não encontrado para itemId: ${itemId}`);
                    alert('Erro: não foi possível encontrar o campo do banner. Recarregue a página e tente novamente.');
                }
            } catch (error) {
                console.error('Erro no upload da imagem do carrossel:', error);
                alert('Erro ao fazer upload da imagem. Tente novamente.');
            }
            return;
        }

        // Upload para banner normal - não usar carrossel
        const bannerItemId = itemElement?.dataset.id;
        const carouselListEl = document.querySelector(`#carousel-images-list-${bannerItemId}`);
        const hiddenInput = document.querySelector(`#edit-item-modal[data-editing-id="${bannerItemId}"] #edit-dest-url-hidden`);

        // Se for carrossel de verdade, trata acima; para banner, ignorar listas/hidden antigos
        if (!isBanner && (carouselListEl || hiddenInput)) {
            try {
                let images = [];
                if (hiddenInput && hiddenInput.value) {
                    try {
                        images = JSON.parse(hiddenInput.value);
                    } catch (e) {
                        // Se não é JSON, pode ser uma URL única
                        if (hiddenInput.value && !hiddenInput.value.startsWith('[')) {
                            images = [hiddenInput.value];
                        }
                    }
                }

                if (!Array.isArray(images)) {
                    images = [];
                }

                // Fazer upload da imagem
                const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                    method: 'POST',
                    headers: HEADERS
                });
                if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');

                const { uploadURL } = await authResponse.json();
                const formData = new FormData();
                // Preservar o nome original do arquivo e extensão para manter PNG
                const originalName = imageFile.name || 'banner-image';
                // Detectar tipo pelo nome ou pelo tipo MIME do blob
                const isPNG = originalName.toLowerCase().endsWith('.png') || imageFile.type === 'image/png';
                const fileExtension = isPNG ? 'png' : (originalName.split('.').pop() || 'jpg');
                const fileName = originalName.includes('.') ? originalName : `${originalName.split('.')[0] || 'banner-image'}.${fileExtension}`;
                formData.append('file', imageFile, fileName);

                const uploadResponse = await fetch(uploadURL, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: formData
                });
                if (!uploadResponse.ok) throw new Error('Falha no upload para o Cloudflare.');

                const uploadData = await uploadResponse.json();
                const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/MBdqwyqeFtFBvKiQjgzjtQ/${uploadData.result.id}/public` : '');

                // Adicionar ao array
                images.push(finalUrl);

                // Atualizar inputs
                if (hiddenInput) {
                    hiddenInput.value = JSON.stringify(images);
                }

                const editImageUrlInput = document.querySelector(`#edit-item-modal[data-editing-id="${bannerItemId}"] #edit-image-url`);
                if (editImageUrlInput) {
                    editImageUrlInput.value = images[0] || '';
                }

                // Atualizar preview
                const bannerPreview = document.getElementById('edit-banner-preview');
                if (bannerPreview) {
                    bannerPreview.src = finalUrl;
                    bannerPreview.style.display = 'block';
                }

                // Banner não usa carrossel; apenas manter preview único

                updateLivePreviewFromForm();
                return;
            } catch (error) {
                console.error('Erro no upload do carrossel:', error);
                alert(`Erro: ${error.message}`);
                return;
            }
        }

        // Upload para banner normal (sem carrossel)
        // Garantir que currentCarouselItemId não interfira com banners
        if (isBanner) {
            window.currentCarouselItemId = null;
        }

        // itemElement pode ser um objeto fake (ex.: quando o item não está na lista ainda); só usar DOM se for elemento real
        const isDomElement = itemElement && typeof itemElement.querySelector === 'function';
        const urlInput = isDomElement ? itemElement.querySelector('.item-image-url-input') : null;
        const thumbPreview = isDomElement ? itemElement.querySelector('.banner-preview-thumb') : null;
        if (isDomElement && itemElement.classList) {
            itemElement.classList.add('is-uploading');
        }

        try {
            const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                method: 'POST',
                headers: HEADERS
            });
            if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');

            const { uploadURL } = await authResponse.json();

            const formData = new FormData();
            // Preservar o nome original do arquivo e extensão para manter PNG
            const originalName = imageFile.name || 'banner-image';
            // Detectar tipo pelo nome ou pelo tipo MIME do blob
            const isPNG = originalName.toLowerCase().endsWith('.png') || imageFile.type === 'image/png';
            const fileExtension = isPNG ? 'png' : (originalName.split('.').pop() || 'jpg');
            const fileName = originalName.includes('.') ? originalName : `${originalName.split('.')[0] || 'banner-image'}.${fileExtension}`;
            formData.append('file', imageFile, fileName);

            const uploadResponse = await fetch(uploadURL, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: formData
            });
            if (!uploadResponse.ok) throw new Error('Falha no upload para o Cloudflare.');

            const uploadData = await uploadResponse.json();
            const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/MBdqwyqeFtFBvKiQjgzjtQ/${uploadData.result.id}/public` : '');

            // Atualiza a interface
            if (urlInput) {
                urlInput.value = finalUrl;
            }

            // Atualizar thumb na lista (preview em tempo real)
            if (thumbPreview) {
                thumbPreview.src = finalUrl;
                thumbPreview.style.display = 'block';
            }

            // Atualizar preview da lista (caso tenha outro seletor)
            const listItem = document.querySelector(`.item[data-id="${bannerItemId}"]`);
            const listThumb = listItem?.querySelector('.banner-preview-thumb');
            if (listThumb) {
                listThumb.src = finalUrl;
                listThumb.style.display = 'block';
            }

            // Atualizar originalData para refletir a nova imagem
            if (listItem && listItem.dataset.originalData) {
                try {
                    const originalData = JSON.parse(listItem.dataset.originalData);
                    originalData.image_url = finalUrl;
                    listItem.dataset.originalData = JSON.stringify(originalData);
                } catch (e) {
                    console.warn('Banner: não foi possível atualizar originalData da imagem', e);
                }
            }

            // Atualizar preview no modal de edição
            const bannerPreview = document.getElementById('edit-banner-preview');
            if (bannerPreview) {
                bannerPreview.src = finalUrl;
                bannerPreview.style.display = 'block';
                const placeholder = bannerPreview.closest('.image-upload-area')?.querySelector('.preview-placeholder');
                if (placeholder) placeholder.style.display = 'none';
                console.log(`[BANNER] Preview atualizado no modal:`, finalUrl);
            } else {
                console.warn(`[BANNER] Preview #edit-banner-preview não encontrado`);
            }

            // Atualizar também o input hidden no modal (tentar múltiplas formas de encontrar)
            if (bannerItemId) {
                // Tentar encontrar o campo de várias formas
                let editImageUrlInput = document.getElementById('edit-image-url');
                if (!editImageUrlInput) {
                    editImageUrlInput = document.querySelector(`#edit-item-modal[data-editing-id="${bannerItemId}"] #edit-image-url`);
                }
                if (!editImageUrlInput) {
                    editImageUrlInput = SELECTORS.editModalBody?.querySelector('#edit-image-url');
                }
                if (!editImageUrlInput) {
                    editImageUrlInput = document.querySelector('#edit-item-modal #edit-image-url');
                }
                // Tentar também pelo modal atual
                if (!editImageUrlInput && SELECTORS.editItemModal) {
                    editImageUrlInput = SELECTORS.editItemModal.querySelector('#edit-image-url');
                }

                if (editImageUrlInput) {
                    editImageUrlInput.value = finalUrl;
                    // Disparar evento change para garantir que outros listeners sejam notificados
                    editImageUrlInput.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log(`[BANNER] Campo #edit-image-url atualizado no modal para item ${bannerItemId}:`, finalUrl);
                    console.log(`[BANNER] Valor do campo após atualização:`, editImageUrlInput.value);
                } else {
                    console.error(`[BANNER] Campo #edit-image-url NÃO encontrado no modal para item ${bannerItemId}`);
                    console.error(`[BANNER] Tentativas de busca:`, {
                        porId: !!document.getElementById('edit-image-url'),
                        porDataEditingId: !!document.querySelector(`#edit-item-modal[data-editing-id="${bannerItemId}"] #edit-image-url`),
                        porEditModalBody: !!SELECTORS.editModalBody?.querySelector('#edit-image-url'),
                        porEditItemModal: !!document.querySelector('#edit-item-modal #edit-image-url'),
                        porSelectorsEditItemModal: !!SELECTORS.editItemModal?.querySelector('#edit-image-url'),
                        modalAtivo: SELECTORS.editItemModal?.classList.contains('active')
                    });
                }

                // Também atualizar o campo na lista para garantir sincronização
                const listItem = document.querySelector(`.item[data-id="${bannerItemId}"], .module-item[data-id="${bannerItemId}"]`);
                const listImageInput = listItem?.querySelector('.item-image-url-input');
                if (listImageInput) {
                    listImageInput.value = finalUrl;
                    console.log(`[BANNER] Campo .item-image-url-input atualizado na lista para item ${bannerItemId}:`, finalUrl);
                } else {
                    console.warn(`[BANNER] Campo .item-image-url-input não encontrado na lista para item ${bannerItemId}`);
                }

                // Atualizar originalData também
                if (listItem && listItem.dataset.originalData) {
                    try {
                        const originalData = JSON.parse(listItem.dataset.originalData);
                        originalData.image_url = finalUrl;
                        listItem.dataset.originalData = JSON.stringify(originalData);
                        console.log(`[BANNER] originalData atualizado para item ${bannerItemId}`);
                    } catch (e) {
                        console.warn('Erro ao atualizar originalData:', e);
                    }
                }
            }

            console.log('[BANNER] Imagem do banner atualizada:', finalUrl);

            // Salvar automaticamente após upload bem-sucedido
            if (bannerItemId) {
                console.log(`Y' [BANNER] Salvando banner ${bannerItemId} automaticamente após upload...`);
                try {
                    // Pequeno delay para garantir que todos os campos foram atualizados
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await saveBannerItem(bannerItemId);
                    console.log(`[BANNER] Banner ${bannerItemId} salvo automaticamente após upload`);
                } catch (saveError) {
                    console.error(`[BANNER] Erro ao salvar banner automaticamente:`, saveError);
                    // Não mostrar alerta aqui para não interromper o fluxo
                }
            }

            updateLivePreviewFromForm();
        } catch (error) {
            console.error('Erro no processo de upload:', error);
            alert(`Erro: ${error.message}`);
        } finally {
            if (itemElement && itemElement.classList) {
                itemElement.classList.remove('is-uploading');
            }
        }
    }


    // Função para duplicar item (exposta globalmente para evitar problemas de escopo)
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
        console.log('Y"" Duplicando módulo:', itemId, '', url);
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
            if (newItem?.id != null) console.log('Módulo duplicado com id:', newItem.id);
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
            console.log(`'️ Removendo item temporário ${itemId} (não salvo no servidor)...`);

            if (itemEl) {
                itemEl.remove();
                console.log(`Item temporário ${itemId} removido do DOM`);
            }

            // Remover dos dados locais também
            if (window.currentProfileData && window.currentProfileData.items) {
                window.currentProfileData.items = window.currentProfileData.items.filter(item => String(item.id) !== String(itemId));
            }

            console.log(`Item temporário ${itemId} removido completamente (não era necessário salvar no servidor)`);
            return; // Não fazer requisição ao servidor
        }

        try {
            console.log(`'️ Tentando deletar item ${itemId} do servidor...`);
            console.log(`Y"< URL da requisição: ${API_URL}/api/profile/items/${itemId}`);

            // Atualizar headers antes de fazer a requisição
            const currentHeaders = getHeaders();
            console.log(`Headers da requisição:`, Object.keys(currentHeaders));

            const response = await fetch(`${API_URL}/api/profile/items/${itemId}`, {
                method: 'DELETE',
                headers: currentHeaders
            });

            console.log(`Resposta do servidor:`, {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            // Se receber 401, tentar renovar token e tentar novamente
            if (response.status === 401) {
                console.log('Token expirado ao deletar, tentando renovar...');
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
                    console.log(`Resposta do servidor:`, result);

                    // Remover visualmente o item IMEDIATAMENTE
                    let itemEl = document.querySelector(`.module-item[data-id="${itemId}"]`);
                    if (!itemEl) {
                        itemEl = document.querySelector(`.item[data-id="${itemId}"]`);
                    }
                    if (!itemEl) {
                        itemEl = document.querySelector(`[data-id="${itemId}"]`);
                    }

                    if (itemEl) {
                        console.log(`'️ Removendo item ${itemId} do DOM...`);
                        itemEl.remove();
                        console.log(`Item ${itemId} removido do DOM imediatamente`);
                    } else {
                        console.warn(`Item ${itemId} não encontrado no DOM`);
                    }

                    // IMPORTANTE: Remover também dos dados locais para evitar que volte ao recarregar
                    if (window.currentProfileData && window.currentProfileData.items) {
                        const initialLength = window.currentProfileData.items.length;
                        window.currentProfileData.items = window.currentProfileData.items.filter(item => String(item.id) !== String(itemId));
                        const removed = initialLength > window.currentProfileData.items.length;
                        if (removed) {
                            console.log(`Item ${itemId} removido dos dados locais (currentProfileData)`);
                        } else {
                            console.warn(`Item ${itemId} não encontrado nos dados locais`);
                        }
                    }

                    // IMPORTANTE: NÃO recarregar dados após deletar!
                    // O item foi removido do servidor e do DOM. Não fazer fetchProfileData aqui.
                    console.log(`Módulo ${itemId} deletado com sucesso do servidor, removido do DOM e dos dados locais`);
                    console.log(`Y' Nota: Clique em "Publicar alterações" para sincronizar todas as mudanças`);
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
            console.log(`Resposta do servidor:`, result);

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
                console.log(`'️ Removendo item ${itemId} do DOM imediatamente...`);
                // Remover imediatamente sem animação
                itemEl.remove();
                console.log(`Item ${itemId} removido do DOM`);
            } else {
                console.warn(`Item ${itemId} não encontrado no DOM`);
            }

            // IMPORTANTE: Remover também dos dados locais para evitar que volte ao recarregar
            if (window.currentProfileData && window.currentProfileData.items) {
                const initialLength = window.currentProfileData.items.length;
                window.currentProfileData.items = window.currentProfileData.items.filter(item => String(item.id) !== String(itemId));
                const removed = initialLength > window.currentProfileData.items.length;
                if (removed) {
                    console.log(`Item ${itemId} removido dos dados locais (currentProfileData)`);
                } else {
                    console.warn(`Item ${itemId} não encontrado nos dados locais`);
                }
            }

            // IMPORTANTE: NÃO recarregar dados após deletar!
            // O item foi removido do servidor e do DOM. Não fazer fetchProfileData aqui
            // porque isso pode trazer o item de volta se houver algum problema de sincronização.
            // O usuário pode clicar em "Publicar alterações" depois se quiser sincronizar.
            console.log(`Módulo ${itemId} deletado com sucesso do servidor, removido do DOM e dos dados locais`);
            console.log(`Y' Nota: Clique em "Publicar alterações" para sincronizar todas as mudanças`);
        } catch (error) {
            console.error('O Erro ao deletar item:', error);
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
                console.log(`Y"" [TOGGLE] Sales_page ${itemId} - salvando diretamente no servidor: ${isActive ? 'ativado' : 'desativado'}`);

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

                console.log(`Sales_page ${itemId} salvo no servidor: ${isActive ? 'ativado' : 'desativado'}`);
                return;
            }

            // Para outros módulos: salvar APENAS localmente (frontend)
            // O botão "Publicar alterações" é que salva no servidor
            console.log(`Y"" [TOGGLE] Atualizando status do módulo ${itemId} apenas localmente: ${isActive ? 'ativado' : 'desativado'}`);
            console.log(`Y' Nota: Clique em "Publicar alterações" para salvar esta mudança no servidor`);

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
                    console.log(`Status do módulo ${itemId} atualizado localmente nos dados do perfil`);
                }
            }

            // Atualizar preview local
            updateLivePreviewFromForm();

            console.log(`Status do módulo ${itemId} atualizado localmente. Clique em "Publicar alterações" para salvar no servidor.`);

            // NÃO fazer requisição ao servidor aqui - isso será feito quando o usuário clicar em "Publicar alterações"
            return;
        } catch (error) {
            console.error('O Erro ao atualizar status do item localmente:', error);
            alert(`Erro ao atualizar status do módulo: ${error.message}`);
        }
    }

    // Função para atualizar item na lista usando dados retornados pela API após salvar
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

        console.log(`Y"" Atualizando item ${itemId} (${itemType}) na interface usando dados da API...`);

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

        // ATUALIZAR CAMPOS ESPECÍFICOS POR TIPO DE M"DULO
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
                console.log(`Dados do item ${itemId} atualizados em currentProfileData`);
            }
        }

        console.log(`Item ${itemId} atualizado na interface em tempo real (todos os campos visíveis)`);
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

        console.log(`Y"" Sincronizando dados do modal para item ${itemId} (${itemType}) antes de salvar`);

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

            console.log(`Y"" [BANNER] Sincronizando imagem do modal para item ${itemId}:`, newImg);

            if (nameInputList) nameInputList.value = newName;
            if (destInputList) destInputList.value = newDest;
            if (msgHiddenList) msgHiddenList.value = newMsg;
            if (imageInputList) {
                imageInputList.value = newImg;
                console.log(`[BANNER] Campo .item-image-url-input atualizado na lista:`, newImg);
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

        console.log(`Dados sincronizados do modal para item ${itemId}`);
    }

    // ============================================
    // FUN—.ES ESPECÍFICAS PARA CADA TIPO DE M"DULO
    // ============================================

    // Salvar banner usando rota específica
    async function saveBannerItem(itemId) {
        console.log(`Salvando banner ${itemId} via rota específica...`);
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

            console.log(`[BANNER] Item temporário ${currentId} criado no servidor com ID ${newId}`);
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
                console.log(`[BANNER] Image URL capturado do campo #edit-image-url do modal:`, imageUrl);
            }
        }

        // 2. Se não encontrou no campo, tentar pegar do preview do modal
        if (!imageUrl) {
            const bannerPreview = document.getElementById('edit-banner-preview');
            if (bannerPreview && bannerPreview.src && !bannerPreview.src.includes('placeholder') && !bannerPreview.src.startsWith('data:image/svg')) {
                imageUrl = bannerPreview.src;
                console.log(`[BANNER] Image URL capturado do preview #edit-banner-preview:`, imageUrl);
            }
        }

        // 3. Se ainda não encontrou, tentar pegar do campo da lista
        if (!imageUrl) {
            const listImageInput = itemEl.querySelector('.item-image-url-input');
            if (listImageInput && listImageInput.value && listImageInput.value.trim()) {
                const listValue = listImageInput.value.trim();
                if (listValue && !listValue.includes('placeholder') && !listValue.startsWith('data:image/svg')) {
                    imageUrl = listValue;
                    console.log(`[BANNER] Image URL capturado do campo .item-image-url-input da lista:`, imageUrl);
                }
            }
        }

        // 4. Se ainda não encontrou, tentar pegar do preview da lista
        if (!imageUrl) {
            const thumbPreview = itemEl.querySelector('.banner-preview-thumb');
            if (thumbPreview && thumbPreview.src && !thumbPreview.src.includes('placeholder') && !thumbPreview.src.startsWith('data:image/svg')) {
                imageUrl = thumbPreview.src;
                console.log(`[BANNER] Image URL capturado do preview .banner-preview-thumb da lista:`, imageUrl);
            }
        }

        // 5. Se ainda não encontrou, tentar pegar do originalData
        if (!imageUrl && itemEl.dataset.originalData) {
            try {
                const originalData = JSON.parse(itemEl.dataset.originalData);
                if (originalData.image_url && !originalData.image_url.includes('placeholder') && !originalData.image_url.startsWith('data:image/svg')) {
                    imageUrl = originalData.image_url.trim();
                    console.log(`[BANNER] Image URL capturado do originalData:`, imageUrl);
                }
            } catch (e) {
                console.warn('Erro ao parsear originalData:', e);
            }
        }

        // Log detalhado de todas as tentativas
        console.log(`[BANNER] Resumo da captura de image_url para item ${realItemId}:`, {
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

        console.log(`[BANNER] image_url FINAL que será enviado:`, finalUpdateData.image_url || 'null');
        console.log(`[BANNER] Dados completos para rota específica:`, finalUpdateData);

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
            console.log(`Banner ${realItemId} salvo com sucesso via rota específica.`);
            console.log(`[BANNER] image_url salvo no banco:`, result.image_url ? result.image_url.substring(0, 50) + '...' : 'null');

            // Atualizar item na lista usando dados retornados pela API (em tempo real)
            await updateItemFromApiResponse(realItemId, result, 'banner');

            console.log(`Banner ${realItemId} salvo e interface atualizada em tempo real`);
        } catch (error) {
            console.error(`O Erro ao salvar banner ${realItemId} via rota específica:`, error);
            throw error;
        }
    }

    // Salvar link personalizado usando rota específica
    async function saveLinkItem(itemId) {
        console.log(`Salvando link ${itemId} via rota específica...`);
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

        console.log(`Dados para rota específica do link:`, updateData);

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
            console.log(`Link ${itemId} salvo com sucesso via rota específica.`);

            // Atualizar item na lista usando dados retornados pela API (em tempo real)
            await updateItemFromApiResponse(itemId, result, 'link');

            console.log(`Link ${itemId} salvo e interface atualizada em tempo real`);
        } catch (error) {
            console.error(`O Erro ao salvar link ${itemId} via rota específica:`, error);
            throw error;
        }
    }

    // Salvar carousel usando rota específica
    async function saveCarouselItem(itemId) {
        console.log(`Salvando carousel ${itemId} via rota específica...`);
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

        console.log(`Dados para rota específica do carousel:`, updateData);

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
            console.log(`Carousel ${itemId} salvo com sucesso via rota específica.`);

            // Atualizar item na lista usando dados retornados pela API (em tempo real)
            await updateItemFromApiResponse(itemId, result, 'carousel');

            console.log(`Carousel ${itemId} salvo e interface atualizada em tempo real`);
        } catch (error) {
            console.error(`O Erro ao salvar carousel ${itemId} via rota específica:`, error);
            throw error;
        }
    }

    // Salvar PIX usando rota específica
    async function savePixItem(itemId) {
        console.log(`Salvando PIX ${itemId} via rota específica...`);
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

        console.log(`Dados para rota específica do PIX:`, updateData);

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
            console.log(`PIX ${itemId} salvo com sucesso via rota específica.`);

            // Atualizar item na lista usando dados retornados pela API (em tempo real)
            await updateItemFromApiResponse(itemId, result, 'pix');

            console.log(`PIX ${itemId} salvo e interface atualizada em tempo real`);
        } catch (error) {
            console.error(`O Erro ao salvar PIX ${itemId} via rota específica:`, error);
            throw error;
        }
    }

    // Salvar PDF usando rota específica
    async function savePdfItem(itemId) {
        console.log(`Salvando PDF ${itemId} via rota específica...`);
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

        console.log(`Dados para rota específica do PDF:`, updateData);

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
            console.log(`PDF ${itemId} salvo com sucesso via rota específica.`);

            // Atualizar item na lista usando dados retornados pela API (em tempo real)
            await updateItemFromApiResponse(itemId, result, 'pdf');

            console.log(`PDF ${itemId} salvo e interface atualizada em tempo real`);
        } catch (error) {
            console.error(`O Erro ao salvar PDF ${itemId} via rota específica:`, error);
            throw error;
        }
    }

    // Salvar Formulário King usando rota específica
    async function saveDigitalFormItem(itemId) {
        console.log(`Salvando Formulário King ${itemId} via rota específica...`);
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

        console.log(`Dados para rota específica do Formulário King:`, updateData);

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
            console.log(`Formulário King ${itemId} salvo com sucesso via rota específica.`);

            // Atualizar item na lista usando dados retornados pela API (em tempo real)
            await updateItemFromApiResponse(itemId, result, 'digital_form');

            console.log(`Formulário King ${itemId} salvo e interface atualizada em tempo real`);
        } catch (error) {
            console.error(`O Erro ao salvar Formulário King ${itemId} via rota específica:`, error);
            throw error;
        }
    }

    async function saveAllChanges(event) {
        // Sincronizar dados do modal para o item da lista ANTES de capturar os dados
        syncModalDataToItem();

        const wifiMissingSsid = Array.from(document.querySelectorAll('#items-container .item, #items-container .module-item')).some(el => {
            if (el.dataset.itemType !== 'wifi') return false;
            return !(el.querySelector('.wifi-ssid-input')?.value || '').trim();
        });
        if (wifiMissingSsid) {
            alert('Preencha o nome da rede (SSID) em todos os módulos Wi-Fi antes de publicar.');
            return;
        }

        // Encontrar o botão que foi clicado ou usar o header-save-btn
        const clickedBtn = (event && event.target) || (event && event.currentTarget) || document.getElementById('header-save-btn') || document.getElementById('mobile-save-all-btn');
        const originalHTML = clickedBtn ? clickedBtn.innerHTML : '';

        if (clickedBtn) {
            clickedBtn.disabled = true;
            clickedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';
        }

        try {
            const saveData = {};

            const displayNameValue = SELECTORS.displayNameInput.value;
            const vcardToggleChecked = document.querySelector('input[name="vcard-toggle"]:checked');
            const showVcardValue = vcardToggleChecked ? vcardToggleChecked.value === 'true' : true;

            // Capturar formato do avatar atual
            const activeAvatarFormatBtn = document.querySelector('.avatar-format-btn.active');
            const currentAvatarFormat = activeAvatarFormatBtn ? activeAvatarFormatBtn.dataset.format :
                (window.currentProfileData?.details?.avatar_format || 'circular');

            // Capturar WhatsApp (apenas números) - usuário deve incluir código do país
            const whatsappValue = (SELECTORS.whatsappNumberInput?.value || '').trim().replace(/\D/g, '');
            console.log('[SAVE-ALL] WhatsApp capturado:', whatsappValue);
            console.log('[SAVE-ALL] Campo WhatsApp existe?', !!SELECTORS.whatsappNumberInput);
            console.log('[SAVE-ALL] Valor original do campo:', SELECTORS.whatsappNumberInput?.value);

            const cardOpacityVal = SELECTORS.cardOpacityPicker ? parseFloat(SELECTORS.cardOpacityPicker.value) : 1;
            const bgImageOpacityVal = SELECTORS.backgroundImageOpacityPicker ? parseFloat(SELECTORS.backgroundImageOpacityPicker.value) : 1;
            saveData.details = {
                displayName: displayNameValue,
                display_name: displayNameValue,
                whatsapp: whatsappValue,
                bio: SELECTORS.bioInput.value,
                profile_slug: SELECTORS.profileSlugInput.value,
                fontFamily: SELECTORS.fontFamilySelect?.value || 'Inter',
                backgroundColor: SELECTORS.backgroundColorPicker?.value || '#0D0D0F',
                textColor: SELECTORS.textColorPicker?.value || '#ECECEC',
                buttonColor: SELECTORS.buttonColorPicker?.value || '#1C1C21',
                buttonTextColor: SELECTORS.buttonTextColorPicker?.value || '#FFFFFF',
                buttonOpacity: SELECTORS.buttonOpacityPicker ? parseFloat(SELECTORS.buttonOpacityPicker.value) : 1,
                buttonBorderRadius: `${SELECTORS.radiusTL?.value || 12}px ${SELECTORS.radiusTR?.value || 12}px ${SELECTORS.radiusBR?.value || 12}px ${SELECTORS.radiusBL?.value || 12}px`,
                buttonContentAlign: (document.querySelector('input[name="button-align"]:checked') || {}).value || 'center',
                backgroundType: (document.querySelector('input[name="bg-type"]:checked') || {}).value || 'color',
                backgroundImageUrl: SELECTORS.backgroundImageUrlInput?.value ?? '',
                cardBackgroundColor: SELECTORS.cardBackgroundColorPicker?.value || '#141417',
                profileImageUrl: (SELECTORS.dashboardPhotoPreview && SELECTORS.dashboardPhotoPreview.src && !SELECTORS.dashboardPhotoPreview.src.startsWith('data:'))
                    ? SELECTORS.dashboardPhotoPreview.src
                    : (window.currentProfileData?.details?.profile_image_url || window.lastProfileData?.details?.profile_image_url || null),
                profile_image_url: (SELECTORS.dashboardPhotoPreview && SELECTORS.dashboardPhotoPreview.src && !SELECTORS.dashboardPhotoPreview.src.startsWith('data:'))
                    ? SELECTORS.dashboardPhotoPreview.src
                    : (window.currentProfileData?.details?.profile_image_url || window.lastProfileData?.details?.profile_image_url || null),
                cardOpacity: cardOpacityVal,
                card_opacity: cardOpacityVal,
                buttonFontSize: `${(SELECTORS.buttonFontSizePicker && SELECTORS.buttonFontSizePicker.value) || 16}px`,
                backgroundImageOpacity: bgImageOpacityVal,
                background_image_opacity: bgImageOpacityVal,
                showVcardButton: showVcardValue,
                show_vcard_button: showVcardValue,
                avatar_format: currentAvatarFormat,
                avatarFormat: currentAvatarFormat,
                logo_spacing: SELECTORS.logoAlignLeft?.checked ? 'left' : (SELECTORS.logoAlignRight?.checked ? 'right' : 'center'),
                logoSpacing: SELECTORS.logoAlignLeft?.checked ? 'left' : (SELECTORS.logoAlignRight?.checked ? 'right' : 'center'),
                share_image_url: window.currentProfileData?.details?.share_image_url || null,
                background_type: (document.querySelector('input[name="bg-type"]:checked') || {}).value || 'color',
                background_color: SELECTORS.backgroundColorPicker?.value || '#0D0D0F',
                background_image_url: SELECTORS.backgroundImageUrlInput?.value ?? '',
                card_background_color: SELECTORS.cardBackgroundColorPicker?.value || '#141417'
            };

            if (typeof window.getVitrineDetailsForSave === 'function') {
                Object.assign(saveData.details, window.getVitrineDetailsForSave());
            }

            console.log('YZ [SAVE-ALL] Dados de personalização capturados:', {
                fontFamily: saveData.details.fontFamily,
                backgroundColor: saveData.details.backgroundColor,
                textColor: saveData.details.textColor,
                buttonColor: saveData.details.buttonColor,
                backgroundType: saveData.details.backgroundType,
                backgroundImageUrl: saveData.details.backgroundImageUrl,
                backgroundImageOpacity: saveData.details.backgroundImageOpacity,
                cardBackgroundColor: saveData.details.cardBackgroundColor,
                cardOpacity: saveData.details.cardOpacity,
                share_image_url: saveData.details.share_image_url
            });

            // Capturar todos os itens do container
            const allItemElements = document.querySelectorAll('#items-container .item, #items-container .module-item');
            console.log(`Itens encontrados no DOM: ${allItemElements.length}`);

            if (allItemElements.length === 0) {
                console.warn('Nenhum item encontrado no container #items-container');
                console.log('Verificando se o container existe:', !!document.getElementById('items-container'));
                const container = document.getElementById('items-container');
                if (container) {
                    console.log('Y"< Conteúdo do container:', container.innerHTML.substring(0, 200));
                }
            }

            // Separar itens temporários (não salvos) dos itens existentes
            const tempItems = [];
            const existingItems = [];

            Array.from(allItemElements).forEach((itemEl, index) => {
                const itemType = itemEl.dataset.itemType;
                const itemIdRaw = itemEl.dataset.id;

                // Verificar se é um item temporário (não salvo ainda)
                // IMPORTANTE: Mesmo itens 'sales_page' temporários precisam ser criados no servidor
                if (itemIdRaw && (itemIdRaw.toString().startsWith('temp_') || itemEl.dataset.isUnsaved === 'true')) {
                    console.log(`Item temporário encontrado: ${itemIdRaw} (${itemType}) - será criado no servidor ao salvar`);
                    tempItems.push({ element: itemEl, index });
                } else {
                    const itemId = parseInt(itemIdRaw, 10);
                    // Validar ID do item existente
                    if (!itemIdRaw || isNaN(itemId) || itemId <= 0) {
                        console.error(`O Item inválido encontrado:`, {
                            itemIdRaw,
                            itemId,
                            itemType,
                            element: itemEl
                        });
                        // Pular itens inválidos
                        return;
                    }

                    // IMPORTANTE: sales_page é DESVINCULADO do save-all
                    // Não incluir no save-all - ele salva diretamente quando você salva na página de vendas
                    if (itemType === 'sales_page') {
                        console.log(`Sales_page ${itemId} DESVINCULADO do save-all - não será incluído`);
                        return; // Pular este item
                    }

                    existingItems.push({ element: itemEl, index, itemId });
                }
            });

            // IMPORTANTE: Separar sales_page dos outros itens temporários
            // sales_page NÃO deve ser criado aqui - ele já é criado quando você adiciona
            const tempItemsNonSalesPage = tempItems.filter(tempItem => tempItem.element.dataset.itemType !== 'sales_page');
            const tempItemsSalesPage = tempItems.filter(tempItem => tempItem.element.dataset.itemType === 'sales_page');

            if (tempItemsSalesPage.length > 0) {
                console.log(`${tempItemsSalesPage.length} sales_page(s) temporário(s) encontrado(s) - NÃO serão processados aqui (já foram criados quando adicionados)`);
            }

            // Criar itens temporários no servidor ANTES de salvar (exceto sales_page)
            if (tempItemsNonSalesPage.length > 0) {
                console.log(`Y?. Criando ${tempItemsNonSalesPage.length} item(ns) temporário(s) no servidor...`);
                for (const tempItem of tempItemsNonSalesPage) {
                    const itemEl = tempItem.element;
                    const itemType = itemEl.dataset.itemType;
                    const tempId = itemEl.dataset.id;

                    try {
                        // Capturar dados do item temporário
                        let destinationUrl = itemEl.querySelector('.item-destination-url-input')?.value || (itemType === 'whatsapp' ? '' : '#');

                        // Se for WhatsApp, apenas remover caracteres não numéricos (usuário deve incluir código do país)
                        if (itemType === 'whatsapp' && destinationUrl) {
                            destinationUrl = destinationUrl.replace(/\D/g, '');
                        }

                        if (itemType === 'wifi') {
                            const fmt = itemEl.querySelector('.wifi-display-format-input:checked')?.value || 'button';
                            const ssid = itemEl.querySelector('.wifi-ssid-input')?.value?.trim() || '';
                            const password = itemEl.querySelector('.wifi-password-input')?.value ?? '';
                            const security = itemEl.querySelector('.wifi-security-input')?.value || 'WPA';
                            const hidden = !!itemEl.querySelector('.wifi-hidden-input')?.checked;
                            const banner_image_url = itemEl.querySelector('.wifi-banner-url-input')?.value?.trim() || '';
                            const logo_url = itemEl.querySelector('.wifi-logo-url-input')?.value?.trim() || '';
                            let logo_size = parseInt(itemEl.querySelector('.wifi-logo-size-input')?.value, 10);
                            if (isNaN(logo_size) || logo_size < 20) logo_size = parseInt(itemEl.dataset.logoSize, 10) || 48;
                            logo_size = Math.min(600, Math.max(20, logo_size));
                            destinationUrl = JSON.stringify({
                                ssid, password, security, hidden, display_format: fmt,
                                banner_image_url, logo_url, logo_size
                            });
                        }

                        const tempItemData = {
                            item_type: itemType,
                            title: itemEl.querySelector('.item-title-input')?.value || getItemTypeName(itemType),
                            destination_url: destinationUrl,
                            pix_key: itemEl.querySelector('.item-pix-key-input')?.value || '',
                            recipient_name: itemEl.querySelector('.item-recipient-name-input')?.value || '',
                            pix_amount: itemEl.querySelector('.item-pix-amount-input')?.value || '',
                            pix_description: itemEl.querySelector('.item-pix-description-input')?.value || '',
                            pdf_url: itemEl.querySelector('.item-pdf-url-input')?.value || '',
                            aspect_ratio: itemEl.dataset.aspectRatio || (itemType === 'banner' ? 'tarja' : 'auto'),
                            icon_class: itemEl.querySelector('.item-icon-picker i')?.className || getDefaultIcon(itemType),
                            is_active: itemEl.querySelector('.module-toggle-input')?.checked !== false,
                            display_order: tempItem.index + 1
                        };

                        if (itemType === 'wifi') {
                            const fmt = itemEl.querySelector('.wifi-display-format-input:checked')?.value || 'button';
                            const bannerUrl = itemEl.querySelector('.wifi-banner-url-input')?.value?.trim() || '';
                            const logoUrl = itemEl.querySelector('.wifi-logo-url-input')?.value?.trim() || '';
                            let logo_size = parseInt(itemEl.querySelector('.wifi-logo-size-input')?.value, 10);
                            if (isNaN(logo_size) || logo_size < 20) logo_size = parseInt(itemEl.dataset.logoSize, 10) || 48;
                            logo_size = Math.min(600, Math.max(20, logo_size));
                            tempItemData.image_url = fmt === 'banner' && bannerUrl ? bannerUrl : (logoUrl || null);
                            tempItemData.logo_size = logo_size;
                        }

                        console.log(`Criando item temporário ${tempId} no servidor...`);
                        const createResponse = await fetch(`${API_URL}/api/profile/items`, {
                            method: 'POST',
                            headers: HEADERS,
                            body: JSON.stringify(tempItemData)
                        });

                        if (!createResponse.ok) {
                            const errorData = await createResponse.json().catch(() => ({}));
                            throw new Error(errorData.message || `Erro ${createResponse.status} ao criar item`);
                        }

                        const createdItem = await createResponse.json();
                        console.log(`Item temporário ${tempId} criado no servidor com ID ${createdItem.id}`);

                        // Atualizar o ID temporário pelo ID real no DOM
                        const oldId = itemEl.dataset.id;
                        itemEl.dataset.id = String(createdItem.id);
                        itemEl.setAttribute('data-id', String(createdItem.id)); // Garantir que o atributo seja atualizado
                        delete itemEl.dataset.isUnsaved;
                        // Remover atributo data-is-temporary se existir
                        if (itemEl.hasAttribute('data-is-temporary')) {
                            itemEl.removeAttribute('data-is-temporary');
                        }
                        if (itemEl.dataset.isTemporary) {
                            delete itemEl.dataset.isTemporary;
                        }
                        console.log(`Y"" ID atualizado de ${oldId} para ${itemEl.dataset.id} no elemento DOM`);

                        // Atualizar também no currentProfileData
                        if (window.currentProfileData && window.currentProfileData.items) {
                            const tempItemIndex = window.currentProfileData.items.findIndex(item => String(item.id) === String(tempId));
                            if (tempItemIndex !== -1) {
                                window.currentProfileData.items[tempItemIndex] = createdItem;
                            }
                        }
                    } catch (createError) {
                        console.error(`O Erro ao criar item temporário ${tempId}:`, createError);
                        throw new Error(`Erro ao criar módulo "${getItemTypeName(itemType)}": ${createError.message}`);
                    }
                }
                console.log(`Todos os ${tempItems.length} item(ns) temporário(s) foram criados no servidor`);
            }

            // Agora processar todos os itens (incluindo os recém-criados) para salvar
            saveData.items = Array.from(allItemElements)
                .map((itemEl, index) => {
                    const itemType = itemEl.dataset.itemType;
                    const itemIdRaw = itemEl.dataset.id;
                    const itemId = parseInt(itemIdRaw, 10);

                    // IMPORTANTE: sales_page é COMPLETAMENTE DESVINCULADO do "Publicar alterações"
                    // Não incluir no save-all - ele salva diretamente quando você salva na página de vendas
                    // O toggle de ativar/desativar funciona independentemente
                    if (itemType === 'sales_page') {
                        console.log(`Sales_page ${itemId} DESVINCULADO do save-all - não será incluído`);
                        return null; // Não incluir no save-all
                    }

                    // Validar ID do item (agora todos devem ter IDs válidos após criar temporários)
                    if (!itemIdRaw || isNaN(itemId) || itemId <= 0) {
                        console.error(`O Item inválido encontrado após criar temporários:`, {
                            itemIdRaw,
                            itemId,
                            itemType,
                            element: itemEl
                        });
                        // Pular itens sem ID válido
                        return null;
                    }

                    // Capturar is_active do toggle (priorizar o estado atual do checkbox)
                    const toggleInput = itemEl.querySelector('.module-toggle-input');
                    let isActive = true; // padrão: ativo
                    if (toggleInput) {
                        isActive = toggleInput.checked;
                    } else {
                        // Se não tiver toggle, verificar dataset ou assumir ativo
                        isActive = itemEl.dataset.isActive !== 'false';
                    }

                    console.log(`Item ${itemId} (${itemType}): is_active = ${isActive}`, {
                        hasToggle: !!toggleInput,
                        toggleChecked: toggleInput?.checked,
                        datasetIsActive: itemEl.dataset.isActive
                    });

                    // IMPORTANTE: Usar a ordem real no DOM (baseada na posição visual)
                    // Não usar apenas 'index' do array, mas sim a posição real do elemento no container
                    // Isso garante que a ordem salva seja a mesma que o usuário vê
                    const allItemsInOrder = Array.from(SELECTORS.itemsContainer.children);
                    const actualIndex = allItemsInOrder.indexOf(itemEl);

                    // A ordem deve ser baseada na posição real no DOM (1-indexed)
                    // Se o item não estiver no container, usar o index do array como fallback
                    const finalDisplayOrder = actualIndex >= 0 ? (actualIndex + 1) : (index + 1);

                    // Atualizar data-display-order no DOM para manter sincronizado
                    itemEl.dataset.displayOrder = finalDisplayOrder;
                    itemEl.setAttribute('data-display-order', finalDisplayOrder);

                    console.log(`Y"S Item ${itemId} (${itemType}): display_order = ${finalDisplayOrder} (posição ${actualIndex >= 0 ? actualIndex : 'não encontrado'})`);

                    let itemData = {
                        id: itemId,
                        display_order: finalDisplayOrder,
                        item_type: itemType, // Garantir que item_type seja enviado
                        is_active: isActive // Capturar status ativo/inativo do toggle
                    };

                    switch (itemType) {
                        case 'link':
                            // Link personalizado - pode ter logo (image_url) ou ícone
                            // Capturar título (priorizar modal se estiver aberto para este item, depois lista, depois module-name)
                            const linkTitleModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`)?.value;
                            const linkTitleInput = itemEl.querySelector('.item-title-input');
                            const linkModuleName = itemEl.querySelector('.module-name');
                            itemData.title = linkTitleModal || linkTitleInput?.value || linkModuleName?.textContent?.trim() || 'Link Personalizado';

                            // Capturar destination_url (priorizar modal se estiver aberto para este item, depois lista)
                            const linkDestModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url`)?.value;
                            const linkDestInput = itemEl.querySelector('.item-destination-url-input');
                            itemData.destination_url = linkDestModal || linkDestInput?.value || '';

                            // Capturar image_url (priorizar modal, depois lista)
                            const linkImageUrlInputModal = document.getElementById('edit-link-image-url') ||
                                document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .item-image-url-input`);
                            const linkImageUrlInputItem = itemEl.querySelector('.item-image-url-input');
                            const linkImageUrlValue = (linkImageUrlInputModal?.value && linkImageUrlInputModal.value.trim()) ||
                                (linkImageUrlInputItem?.value && linkImageUrlInputItem.value.trim()) || null;
                            itemData.image_url = linkImageUrlValue;

                            // Salvar tamanho da logo (priorizar modal se estiver aberto, depois lista, depois dataset)
                            let logoSizeValue = 24;
                            let linkLogoSizeInputItem = null; // Declarar fora do bloco para usar no console.log

                            // Primeiro tentar pegar do modal se estiver aberto para este item
                            const modalOpenForThisItem = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"]`);
                            if (modalOpenForThisItem) {
                                const linkLogoSizeInputModal = document.getElementById(`edit-logo-size-input-${itemId}`) ||
                                    modalOpenForThisItem.querySelector('.item-logo-size-input');
                                if (linkLogoSizeInputModal && linkLogoSizeInputModal.value !== undefined && linkLogoSizeInputModal.value !== '') {
                                    logoSizeValue = parseInt(linkLogoSizeInputModal.value) || 24;
                                }
                            }

                            // Se não encontrou no modal, tentar na lista
                            if (logoSizeValue === 24) {
                                linkLogoSizeInputItem = itemEl.querySelector('.item-logo-size-input');
                                if (linkLogoSizeInputItem && linkLogoSizeInputItem.value !== undefined && linkLogoSizeInputItem.value !== '') {
                                    logoSizeValue = parseInt(linkLogoSizeInputItem.value) || 24;
                                }
                            }

                            // Se ainda não encontrou, tentar dataset
                            if (logoSizeValue === 24 && itemEl.dataset.logoSize) {
                                logoSizeValue = parseInt(itemEl.dataset.logoSize) || 24;
                            }

                            // Se ainda não encontrou, tentar do item original (se carregado do servidor)
                            if (logoSizeValue === 24 && window.currentProfileData && window.currentProfileData.items) {
                                const originalItem = window.currentProfileData.items.find(i => i.id === itemId);
                                if (originalItem && originalItem.logo_size) {
                                    const originalSize = parseInt(originalItem.logo_size, 10);
                                    if (!isNaN(originalSize) && originalSize > 0) {
                                        logoSizeValue = originalSize;
                                    }
                                }
                            }

                            // Se ainda não encontrou, tentar do preservedStates (se existir)
                            if (logoSizeValue === 24 && window.preservedItemStates && window.preservedItemStates[itemId] && window.preservedItemStates[itemId].logo_size) {
                                const preservedSize = parseInt(window.preservedItemStates[itemId].logo_size, 10);
                                if (!isNaN(preservedSize) && preservedSize > 0) {
                                    logoSizeValue = preservedSize;
                                }
                            }

                            // Garantir que sempre tenha um valor válido (não salvar null, sempre salvar o valor)
                            itemData.logo_size = logoSizeValue;

                            // Capturar logo_fit_mode (modo de ajuste da logo)
                            let linkLogoFitMode = 'contain'; // Padrão: completo, sem corte
                            if (modalOpenForThisItem) {
                                const linkLogoFitModeInput = document.getElementById(`edit-logo-fit-mode-input-${itemId}`) ||
                                    modalOpenForThisItem.querySelector('.item-logo-fit-mode-input');
                                if (linkLogoFitModeInput && linkLogoFitModeInput.value) {
                                    linkLogoFitMode = linkLogoFitModeInput.value;
                                } else {
                                    // Tentar pegar do radio button selecionado
                                    const linkLogoFitRadio = modalOpenForThisItem.querySelector(`input[name="edit-logo-fit-mode-${itemId}"]:checked`);
                                    if (linkLogoFitRadio) {
                                        linkLogoFitMode = linkLogoFitRadio.value;
                                    }
                                }
                            }
                            if (linkLogoFitMode === 'contain') {
                                const linkLogoFitModeInputItem = itemEl.querySelector('.item-logo-fit-mode-input');
                                if (linkLogoFitModeInputItem && linkLogoFitModeInputItem.value) {
                                    linkLogoFitMode = linkLogoFitModeInputItem.value;
                                } else {
                                    // Tentar pegar do radio button selecionado na lista
                                    const linkLogoFitRadioItem = itemEl.querySelector('input[name*="logo-fit-mode"]:checked');
                                    if (linkLogoFitRadioItem) {
                                        linkLogoFitMode = linkLogoFitRadioItem.value;
                                    }
                                }
                            }
                            // Se ainda não encontrou, tentar do item original
                            if (linkLogoFitMode === 'contain' && window.currentProfileData && window.currentProfileData.items) {
                                const originalItem = window.currentProfileData.items.find(i => i.id === itemId);
                                if (originalItem && originalItem.logo_fit_mode) {
                                    linkLogoFitMode = originalItem.logo_fit_mode;
                                }
                            }
                            itemData.logo_fit_mode = linkLogoFitMode;

                            const originalItem = window.currentProfileData && window.currentProfileData.items ? window.currentProfileData.items.find(i => i.id === itemId) : null;
                            console.log(`Logo size para item ${itemId}: ${logoSizeValue}px, fit_mode: ${linkLogoFitMode} (origem: modal=${!!modalOpenForThisItem}, lista=${!!linkLogoSizeInputItem}, dataset=${!!itemEl.dataset.logoSize}, original=${!!(originalItem && originalItem.logo_size)})`);

                            // Se tiver logo, icon_class pode ser null, senão usar o ícone selecionado
                            const linkIconPicker = itemEl.querySelector('.item-icon-picker');
                            if (linkIconPicker) {
                                const iconElement = linkIconPicker.querySelector('i');
                                itemData.icon_class = iconElement ? iconElement.className.trim() : null;
                            } else {
                                itemData.icon_class = null;
                            }
                            break;
                        case 'whatsapp': case 'telegram': case 'email': case 'facebook': case 'instagram': case 'pinterest': case 'reddit': case 'tiktok': case 'twitch': case 'twitter': case 'youtube': case 'linkedin': case 'portfolio': case 'spotify': case 'instagram_embed': case 'youtube_embed': case 'tiktok_embed': case 'spotify_embed': case 'linkedin_embed': case 'pinterest_embed':
                            // Capturar título (priorizar modal se estiver aberto para este item, depois lista, depois module-name)
                            const socialTitleModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`)?.value;
                            const socialTitleInput = itemEl.querySelector('.item-title-input');
                            const socialModuleName = itemEl.querySelector('.module-name');
                            itemData.title = socialTitleModal || socialTitleInput?.value || socialModuleName?.textContent?.trim() || '';

                            // Capturar destination_url (priorizar modal se estiver aberto para este item, depois lista)
                            let socialDestValue = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url`)?.value ||
                                itemEl.querySelector('.item-destination-url-input')?.value || '';

                            // Se for WhatsApp, apenas remover caracteres não numéricos (usuário deve incluir código do país)
                            if (itemType === 'whatsapp' && socialDestValue) {
                                socialDestValue = socialDestValue.replace(/\D/g, '');
                            }

                            itemData.destination_url = socialDestValue || '';

                            // Capturar icon_class
                            const socialIconPicker = itemEl.querySelector('.item-icon-picker');
                            if (socialIconPicker) {
                                itemData.icon_class = socialIconPicker.className.replace(' item-icon-picker', '').trim();
                            } else {
                                itemData.icon_class = null;
                            }

                            // Capturar logo_size (mesma lógica do link personalizado)
                            let socialLogoSizeValue = 24;
                            const modalOpenForSocial = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"]`);
                            if (modalOpenForSocial) {
                                const socialLogoSizeInputModal = document.getElementById(`edit-logo-size-input-${itemId}`) ||
                                    modalOpenForSocial.querySelector('.item-logo-size-input');
                                if (socialLogoSizeInputModal && socialLogoSizeInputModal.value !== undefined && socialLogoSizeInputModal.value !== '') {
                                    socialLogoSizeValue = parseInt(socialLogoSizeInputModal.value) || 24;
                                }
                            }
                            if (socialLogoSizeValue === 24) {
                                const socialLogoSizeInputItem = itemEl.querySelector('.item-logo-size-input');
                                if (socialLogoSizeInputItem && socialLogoSizeInputItem.value !== undefined && socialLogoSizeInputItem.value !== '') {
                                    socialLogoSizeValue = parseInt(socialLogoSizeInputItem.value) || 24;
                                }
                            }
                            if (socialLogoSizeValue === 24 && itemEl.dataset.logoSize) {
                                socialLogoSizeValue = parseInt(itemEl.dataset.logoSize) || 24;
                            }
                            // Se ainda não encontrou, tentar do item original (se carregado do servidor)
                            if (socialLogoSizeValue === 24 && window.currentProfileData && window.currentProfileData.items) {
                                const originalItem = window.currentProfileData.items.find(i => i.id === itemId);
                                if (originalItem && originalItem.logo_size) {
                                    const originalSize = parseInt(originalItem.logo_size, 10);
                                    if (!isNaN(originalSize) && originalSize > 0) {
                                        socialLogoSizeValue = originalSize;
                                    }
                                }
                            }
                            itemData.logo_size = socialLogoSizeValue;
                            break;
                        case 'sales_page':
                            // Sales Page - pode ter logo (image_url) ou ícone
                            // Capturar título
                            const salesPageTitleModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`)?.value;
                            const salesPageTitleInput = itemEl.querySelector('.item-title-input');
                            const salesPageModuleName = itemEl.querySelector('.module-name');
                            itemData.title = salesPageTitleModal || salesPageTitleInput?.value || salesPageModuleName?.textContent?.trim() || 'Página de Vendas';

                            // Capturar image_url (priorizar modal, depois lista)
                            const salesPageImageUrlInputModal = document.getElementById('edit-sales-page-logo-url') ||
                                document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .item-image-url-input`);
                            const salesPageImageUrlInputItem = itemEl.querySelector('.item-image-url-input');
                            const salesPageImageUrlValue = (salesPageImageUrlInputModal?.value && salesPageImageUrlInputModal.value.trim()) ||
                                (salesPageImageUrlInputItem?.value && salesPageImageUrlInputItem.value.trim()) || null;
                            itemData.image_url = salesPageImageUrlValue;

                            // Capturar logo_size (mesma lógica do link personalizado)
                            let salesPageLogoSizeValue = 24;
                            const modalOpenForSalesPage = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"]`);
                            if (modalOpenForSalesPage) {
                                const salesPageLogoSizeInputModal = document.getElementById(`edit-logo-size-input-${itemId}`) ||
                                    modalOpenForSalesPage.querySelector('.item-logo-size-input');
                                if (salesPageLogoSizeInputModal && salesPageLogoSizeInputModal.value !== undefined && salesPageLogoSizeInputModal.value !== '') {
                                    salesPageLogoSizeValue = parseInt(salesPageLogoSizeInputModal.value) || 24;
                                }
                            }
                            if (salesPageLogoSizeValue === 24) {
                                const salesPageLogoSizeInputItem = itemEl.querySelector('.item-logo-size-input');
                                if (salesPageLogoSizeInputItem && salesPageLogoSizeInputItem.value !== undefined && salesPageLogoSizeInputItem.value !== '') {
                                    salesPageLogoSizeValue = parseInt(salesPageLogoSizeInputItem.value) || 24;
                                }
                            }
                            if (salesPageLogoSizeValue === 24 && itemEl.dataset.logoSize) {
                                salesPageLogoSizeValue = parseInt(itemEl.dataset.logoSize) || 24;
                            }
                            // Se ainda não encontrou, tentar do item original (se carregado do servidor)
                            if (salesPageLogoSizeValue === 24 && window.currentProfileData && window.currentProfileData.items) {
                                const originalItem = window.currentProfileData.items.find(i => i.id === itemId);
                                if (originalItem && originalItem.logo_size) {
                                    const originalSize = parseInt(originalItem.logo_size, 10);
                                    if (!isNaN(originalSize) && originalSize > 0) {
                                        salesPageLogoSizeValue = originalSize;
                                    }
                                }
                            }
                            itemData.logo_size = salesPageLogoSizeValue;

                            // Capturar logo_fit_mode (modo de ajuste da logo)
                            let salesPageLogoFitMode = 'contain'; // Padrão: completo, sem corte
                            if (modalOpenForSalesPage) {
                                const salesPageLogoFitModeInput = document.getElementById(`edit-logo-fit-mode-input-${itemId}`) ||
                                    modalOpenForSalesPage.querySelector('.item-logo-fit-mode-input');
                                if (salesPageLogoFitModeInput && salesPageLogoFitModeInput.value) {
                                    salesPageLogoFitMode = salesPageLogoFitModeInput.value;
                                } else {
                                    // Tentar pegar do radio button selecionado
                                    const salesPageLogoFitRadio = modalOpenForSalesPage.querySelector(`input[name="edit-logo-fit-mode-${itemId}"]:checked`);
                                    if (salesPageLogoFitRadio) {
                                        salesPageLogoFitMode = salesPageLogoFitRadio.value;
                                    }
                                }
                            }
                            if (salesPageLogoFitMode === 'contain') {
                                const salesPageLogoFitModeInputItem = itemEl.querySelector('.item-logo-fit-mode-input');
                                if (salesPageLogoFitModeInputItem && salesPageLogoFitModeInputItem.value) {
                                    salesPageLogoFitMode = salesPageLogoFitModeInputItem.value;
                                } else {
                                    // Tentar pegar do radio button selecionado na lista
                                    const salesPageLogoFitRadioItem = itemEl.querySelector('input[name*="logo-fit-mode"]:checked');
                                    if (salesPageLogoFitRadioItem) {
                                        salesPageLogoFitMode = salesPageLogoFitRadioItem.value;
                                    }
                                }
                            }
                            // Se ainda não encontrou, tentar do item original
                            if (salesPageLogoFitMode === 'contain' && window.currentProfileData && window.currentProfileData.items) {
                                const originalItem = window.currentProfileData.items.find(i => i.id === itemId);
                                if (originalItem && originalItem.logo_fit_mode) {
                                    salesPageLogoFitMode = originalItem.logo_fit_mode;
                                }
                            }
                            itemData.logo_fit_mode = salesPageLogoFitMode;
                            console.log(`Logo size para sales_page ${itemId}: ${salesPageLogoSizeValue}px, fit_mode: ${salesPageLogoFitMode}`);
                            break;
                        case 'banner':
                            itemData.icon_class = null;
                            itemData.pix_key = null;
                            itemData.pdf_url = null;

                            // Capturar campos do banner (fonte de verdade: modal se aberto, senão lista)
                            const destInputItem = itemEl.querySelector('.item-destination-url-input');
                            const nameInputItem = itemEl.querySelector('.item-banner-name-input');
                            const whatsappHiddenItem = itemEl.querySelector('.item-title-input-hidden');
                            const imageInputItem = itemEl.querySelector('.item-image-url-input');

                            const destInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url`);
                            const nameInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-banner-name`);
                            const whatsappInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-banner-title`);

                            // Tentar encontrar o campo de imagem de várias formas
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

                            console.log(`[BANNER] Capturando image_url para item ${itemId}:`);
                            console.log(`  - Modal aberto?`, !!document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"]`));
                            console.log(`  - imageInputModal encontrado?`, !!imageInputModal);
                            console.log(`  - imageInputModal.value:`, imageInputModal?.value);
                            console.log(`  - imageInputItem encontrado?`, !!imageInputItem);
                            console.log(`  - imageInputItem.value:`, imageInputItem?.value);

                            // image_url (priorizar modal se aberto, depois lista, depois dataset)
                            let imageValue = '';

                            // Primeiro tentar pegar do modal se estiver aberto para este item
                            const modalOpenForBanner = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"]`);
                            if (modalOpenForBanner) {
                                // Se o modal está aberto, tentar pegar do campo do modal
                                if (imageInputModal && imageInputModal.value) {
                                    const modalValue = imageInputModal.value.trim();
                                    if (modalValue && !modalValue.includes('placeholder') && !modalValue.startsWith('data:image/svg')) {
                                        imageValue = modalValue;
                                        console.log(`[BANNER] Image URL do modal para item ${itemId}:`, imageValue);
                                    }
                                }

                                // Se não encontrou no campo do modal, tentar pegar do preview do banner no modal
                                if (!imageValue) {
                                    const bannerPreview = document.getElementById('edit-banner-preview');
                                    if (bannerPreview && bannerPreview.src && !bannerPreview.src.includes('placeholder') && !bannerPreview.src.startsWith('data:image/svg')) {
                                        imageValue = bannerPreview.src;
                                        console.log(`[BANNER] Image URL do preview do modal para item ${itemId}:`, imageValue);
                                    }
                                }
                            }

                            // Se não encontrou no modal, tentar na lista
                            if (!imageValue && imageInputItem && imageInputItem.value) {
                                const itemValue = imageInputItem.value.trim();
                                if (itemValue && !itemValue.includes('placeholder') && !itemValue.startsWith('data:image/svg')) {
                                    imageValue = itemValue;
                                    console.log(`[BANNER] Image URL da lista para item ${itemId}:`, imageValue);
                                }
                            }

                            // Se ainda não encontrou, tentar do preview na lista
                            if (!imageValue) {
                                const thumbPreview = itemEl.querySelector('.banner-preview-thumb');
                                if (thumbPreview && thumbPreview.src && !thumbPreview.src.includes('placeholder') && !thumbPreview.src.startsWith('data:image/svg')) {
                                    imageValue = thumbPreview.src;
                                    console.log(`[BANNER] Image URL do preview da lista para item ${itemId}:`, imageValue);
                                }
                            }

                            // Se ainda não encontrou, tentar do originalData como fallback
                            if (!imageValue && itemEl.dataset.originalData) {
                                try {
                                    const originalData = JSON.parse(itemEl.dataset.originalData);
                                    if (originalData.image_url && !originalData.image_url.includes('placeholder') && !originalData.image_url.startsWith('data:image/svg')) {
                                        imageValue = originalData.image_url.trim();
                                        console.log(`[BANNER] Image URL do originalData para item ${itemId}:`, imageValue);
                                    }
                                } catch (e) {
                                    console.warn('Erro ao parsear originalData:', e);
                                }
                            }

                            // Garantir que sempre tenha um valor válido (não vazio e não placeholder)
                            if (imageValue && !imageValue.includes('placeholder') && !imageValue.startsWith('data:image/svg')) {
                                itemData.image_url = imageValue;
                            } else {
                                itemData.image_url = null;
                            }

                            console.log(`[BANNER] Image URL FINAL capturado para item ${itemId}:`, itemData.image_url);
                            console.log(`[BANNER] itemData completo para banner:`, {
                                id: itemData.id,
                                item_type: itemData.item_type,
                                image_url: itemData.image_url,
                                title: itemData.title,
                                destination_url: itemData.destination_url
                            });

                            // destination_url (NÃO copiar a URL da imagem; só o que o usuário digitou)
                            // Helper para limpar destinos que contêm URLs de imagem ou listas
                            const sanitizeBannerDest = (raw) => {
                                if (!raw || typeof raw !== 'string') return '';
                                if (raw.startsWith('[')) return '';
                                // separar por vírgula e limpar entradas que sejam de imagem (imagedelivery)
                                const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
                                const filtered = parts.filter(p => !p.includes('imagedelivery.net'));
                                return (filtered[0] || parts[0] || '').trim();
                            };

                            let destValue = '';
                            if (destInputModal && destInputModal.value) {
                                destValue = destInputModal.value.trim();
                            } else if (destInputItem && destInputItem.value) {
                                destValue = destInputItem.value.trim();
                            }
                            destValue = sanitizeBannerDest(destValue);
                            itemData.destination_url = serializeBannerDestination(destValue, '', '') || undefined;

                            // title (nome do banner) - priorizar modal
                            let bannerNameValue = '';
                            if (nameInputModal && nameInputModal.value) {
                                bannerNameValue = nameInputModal.value.trim();
                            } else if (nameInputItem && nameInputItem.value) {
                                bannerNameValue = nameInputItem.value.trim();
                            }
                            if (nameInputItem) nameInputItem.value = bannerNameValue;
                            itemData.title = bannerNameValue ? bannerNameValue.trim() : null;

                            // whatsapp_message
                            let whatsappValue = '';
                            if (whatsappInputModal && whatsappInputModal.value) {
                                whatsappValue = whatsappInputModal.value.trim();
                            } else if (whatsappHiddenItem && whatsappHiddenItem.value) {
                                whatsappValue = whatsappHiddenItem.value.trim();
                            }
                            if (whatsappHiddenItem) whatsappHiddenItem.value = whatsappValue;
                            itemData.whatsapp_message = whatsappValue ? whatsappValue.trim() : null;

                            itemData.aspect_ratio = itemEl.dataset.aspectRatio || 'tarja';
                            break;
                        case 'carousel':
                            // ===== NOVO CARROSSEL - Salvar =====
                            // Capturar título (priorizar modal se aberto, senão lista)
                            const carouselTitleModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`)?.value;
                            const carouselTitleInput = itemEl.querySelector('.item-title-input');
                            const carouselModuleName = itemEl.querySelector('.module-name');
                            itemData.title = carouselTitleModal || carouselTitleInput?.value?.trim() || carouselModuleName?.textContent?.trim() || 'Carrossel';
                            itemData.icon_class = null;
                            itemData.pix_key = null;
                            itemData.pdf_url = null;

                            // Capturar JSON de imagens - PRIORIDADE: modal primeiro, depois item
                            // Tentar múltiplos seletores para encontrar o input no modal
                            const carouselJsonInputModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .carousel-images-json-new[data-item-id="${itemId}"]`) ||
                                document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .carousel-images-json-new`) ||
                                document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url.carousel-images-json-new`) ||
                                document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url`);
                            const carouselJsonInputItem = itemEl.querySelector('.carousel-images-json-new');
                            const carouselImageInput = itemEl.querySelector('.item-image-url-input');

                            // Usar o valor do modal se existir e tiver conteúdo, senão usar o do item
                            let carouselJsonInput = null;
                            if (carouselJsonInputModal && carouselJsonInputModal.value && carouselJsonInputModal.value.trim()) {
                                carouselJsonInput = carouselJsonInputModal;
                            } else if (carouselJsonInputItem && carouselJsonInputItem.value && carouselJsonInputItem.value.trim()) {
                                carouselJsonInput = carouselJsonInputItem;
                            }

                            console.log(`[CARROSSEL] Salvando item ${itemId}:`, {
                                modalValue: carouselJsonInputModal?.value?.substring(0, 50) || 'vazio',
                                itemValue: carouselJsonInputItem?.value?.substring(0, 50) || 'vazio',
                                usando: carouselJsonInput === carouselJsonInputModal ? 'modal' : (carouselJsonInput === carouselJsonInputItem ? 'item' : 'nenhum')
                            });

                            // ===== NOVO CARROSSEL - Salvar imagens =====
                            if (carouselJsonInput && carouselJsonInput.value && carouselJsonInput.value.trim()) {
                                try {
                                    const images = JSON.parse(carouselJsonInput.value);
                                    if (Array.isArray(images) && images.length > 0) {
                                        // Filtrar placeholders antes de salvar
                                        const realImages = images.filter(img => {
                                            const url = typeof img === 'string' ? img : (img.image_url || img);
                                            return url && !url.includes('placeholder') && !url.startsWith('data:image/svg');
                                        });
                                        if (realImages.length > 0) {
                                            itemData.destination_url = JSON.stringify(realImages);
                                            const firstImg = typeof realImages[0] === 'string' ? realImages[0] : (realImages[0].image_url || realImages[0]);
                                            itemData.image_url = firstImg;
                                            console.log(`[CARROSSEL] Salvando ${realImages.length} imagem(ns) para item ${itemId}`);
                                        } else {
                                            itemData.destination_url = JSON.stringify([]);
                                            itemData.image_url = '';
                                            console.log(`[CARROSSEL] Nenhuma imagem válida encontrada para item ${itemId}`);
                                        }
                                    } else {
                                        itemData.destination_url = JSON.stringify([]);
                                        itemData.image_url = '';
                                        console.log(`[CARROSSEL] Array vazio ou inválido para item ${itemId}`);
                                    }
                                } catch (e) {
                                    console.error(`[CARROSSEL] Erro ao parsear imagens do item ${itemId}:`, e);
                                    console.error(`   Valor:`, carouselJsonInput.value?.substring(0, 100));
                                    itemData.destination_url = JSON.stringify([]);
                                    itemData.image_url = '';
                                }
                            } else if (carouselImageInput && carouselImageInput.value && !carouselImageInput.value.includes('placeholder')) {
                                itemData.destination_url = JSON.stringify([carouselImageInput.value]);
                                itemData.image_url = carouselImageInput.value;
                                console.log(`[CARROSSEL] Usando image_url como fallback para item ${itemId}`);
                            } else {
                                itemData.destination_url = JSON.stringify([]);
                                itemData.image_url = '';
                                console.log(`[CARROSSEL] Nenhum dado encontrado para item ${itemId}`);
                            }
                            itemData.aspect_ratio = itemEl.dataset.aspectRatio || 'auto';
                            break;
                        case 'pix': case 'pix_qrcode':
                            itemData.title = itemEl.querySelector('.item-title-input')?.value;
                            itemData.pix_key = itemEl.querySelector('.item-pix-key-input')?.value;
                            itemData.recipient_name = itemEl.querySelector('.item-recipient-name-input')?.value;
                            itemData.pix_amount = itemEl.querySelector('.item-pix-amount-input')?.value;
                            itemData.pix_description = itemEl.querySelector('.item-pix-description-input')?.value;
                            itemData.icon_class = itemEl.querySelector('.item-icon-picker')?.className.replace(' item-icon-picker', '').trim();
                            break;
                        case 'wifi': {
                            const titleWifiModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-title`)?.value;
                            itemData.title = (titleWifiModal !== undefined ? titleWifiModal : itemEl.querySelector('.item-title-input')?.value)?.trim() || 'Wi-Fi';
                            const fmt = itemEl.querySelector('.wifi-display-format-input:checked')?.value || 'button';
                            const ssid = itemEl.querySelector('.wifi-ssid-input')?.value?.trim() || '';
                            const password = itemEl.querySelector('.wifi-password-input')?.value ?? '';
                            const security = itemEl.querySelector('.wifi-security-input')?.value || 'WPA';
                            const hidden = !!itemEl.querySelector('.wifi-hidden-input')?.checked;
                            const bannerUrl = itemEl.querySelector('.wifi-banner-url-input')?.value?.trim() || '';
                            const logoUrl = itemEl.querySelector('.wifi-logo-url-input')?.value?.trim() || '';
                            let logoSizeVal = parseInt(itemEl.querySelector('.wifi-logo-size-input')?.value, 10);
                            if (isNaN(logoSizeVal) || logoSizeVal < 20) {
                                logoSizeVal = parseInt(itemEl.dataset.logoSize, 10);
                            }
                            if (isNaN(logoSizeVal) || logoSizeVal < 20) logoSizeVal = 48;
                            logoSizeVal = Math.min(600, Math.max(20, logoSizeVal));
                            const wifiPayload = {
                                ssid,
                                password,
                                security,
                                hidden,
                                display_format: fmt,
                                banner_image_url: bannerUrl,
                                logo_url: logoUrl,
                                logo_size: logoSizeVal
                            };
                            itemData.destination_url = JSON.stringify(wifiPayload);
                            itemData.pix_key = null;
                            itemData.pdf_url = null;
                            itemData.image_url = fmt === 'banner' && bannerUrl ? bannerUrl : (logoUrl || null);
                            itemData.logo_size = logoSizeVal;
                            const wifiIconEl = itemEl.querySelector('.item-icon-picker i');
                            itemData.icon_class = wifiIconEl ? wifiIconEl.className.trim() : getDefaultIcon('wifi');
                            break;
                        }
                        case 'texto_com_botao': {
                            const escTitle = itemEl.querySelector('.tcb-title-input')?.value?.trim()
                                || itemEl.querySelector('.item-title-input')?.value?.trim()
                                || 'Título';
                            const buttonLabel = itemEl.querySelector('.tcb-button-label-input')?.value?.trim() || 'Inscrever-se';
                            const eyebrow = itemEl.querySelector('.tcb-eyebrow-input')?.value?.trim() || '';
                            const url = itemEl.querySelector('.tcb-url-input')?.value?.trim()
                                || itemEl.querySelector('.item-destination-url-input')?.value?.trim()
                                || '';
                            const line1 = itemEl.querySelector('.tcb-line1-input')?.value?.trim() || '';
                            const line2 = itemEl.querySelector('.tcb-line2-input')?.value?.trim() || '';
                            const line3 = itemEl.querySelector('.tcb-line3-input')?.value?.trim() || '';
                            const icon1 = itemEl.querySelector('.tcb-icon1-input')?.value?.trim() || '';
                            const icon2 = itemEl.querySelector('.tcb-icon2-input')?.value?.trim() || '';
                            const icon3 = itemEl.querySelector('.tcb-icon3-input')?.value?.trim() || '';
                            const template = itemEl.querySelector('.tcb-template-input')?.value || 'evento';
                            const lines = [];
                            if (line1) lines.push({ icon: icon1, text: line1 });
                            if (line2) lines.push({ icon: icon2, text: line2 });
                            if (line3) lines.push({ icon: icon3, text: line3 });
                            itemData.title = escTitle;
                            itemData.destination_url = JSON.stringify({
                                url: url,
                                button_label: buttonLabel,
                                eyebrow: eyebrow,
                                lines: lines,
                                template: template
                            });
                            itemData.icon_class = getDefaultIcon('texto_com_botao');
                            break;
                        }
                        case 'pdf': case 'pdf_embed':
                            const pdfUrl = itemEl.querySelector('.item-pdf-url-input')?.value;
                            itemData.title = itemEl.querySelector('.item-title-input')?.value;
                            itemData.pdf_url = pdfUrl;
                            itemData.destination_url = pdfUrl;
                            break;
                    }
                    return itemData;
                })
                .filter(item => item !== null); // Remover itens inválidos

            // Validar que temos dados para salvar (itens OU configurações do perfil)
            // Permitir salvar mesmo sem itens, pois o usuário pode estar salvando apenas configurações do perfil
            if (saveData.items.length === 0) {
                console.warn('Nenhum módulo encontrado na lista. Salvando apenas configurações do perfil.');
                // Não bloquear o salvamento - apenas avisar no console
                // O usuário pode estar salvando apenas configurações do perfil (cores, nome, bio, etc)
            }

            // Garantir que items seja sempre um array (mesmo que vazio)
            if (!saveData.items || !Array.isArray(saveData.items)) {
                saveData.items = [];
            }

            // Incluir itens que estão no perfil (servidor) mas não apareceram no DOM, para não serem deletados no save-all
            const serverItems = (window.currentProfileData && window.currentProfileData.items) || [];
            const excludedFromList = ['sales_page', 'king_selection', 'bible'];
            const savedIds = new Set(saveData.items.map(i => i && i.id).filter(Boolean));
            let addedFromServer = 0;
            window.__mergedServerItemIdsForSave = new Set();
            serverItems.forEach(serverItem => {
                if (excludedFromList.indexOf(serverItem.item_type) !== -1) return;
                if (savedIds.has(serverItem.id)) return;
                saveData.items.push({
                    id: serverItem.id,
                    item_type: serverItem.item_type,
                    title: serverItem.title || '',
                    display_order: serverItem.display_order !== undefined ? serverItem.display_order : 999,
                    is_active: serverItem.is_active !== false
                });
                savedIds.add(serverItem.id);
                window.__mergedServerItemIdsForSave.add(serverItem.id);
                addedFromServer++;
            });
            if (addedFromServer > 0) {
                console.log(addedFromServer + ' item(ns) do servidor que não estavam no DOM foram incluídos no save para não sumir do cartão público.');
            }

            // IMPORTANTE: Verificar se há sales_page no array antes de enviar
            console.log('=== DADOS ENVIADOS PARA SALVAR ===');
            console.log(`Total de itens: ${saveData.items.length}`);
            console.log('Items completos:', JSON.stringify(saveData.items, null, 2));
            saveData.items.forEach((item, idx) => {
                console.log(`Item ${idx} (${item.item_type}):`, {
                    id: item.id,
                    title: item.title,
                    is_active: item.is_active,
                    display_order: item.display_order,
                    destination_url: item.destination_url,
                    image_url: item.image_url,
                    logo_size: item.logo_size
                });
            });

            // IMPORTANTE: Verificar ordem visual atual no DOM antes de enviar
            const currentVisualOrder = Array.from(SELECTORS.itemsContainer.children).map((el, idx) => ({
                index: idx,
                id: el.dataset.id,
                type: el.dataset.itemType,
                displayOrder: el.dataset.displayOrder || (idx + 1)
            }));
            console.log('=== ORDEM VISUAL ATUAL NO DOM ===');
            console.log(JSON.stringify(currentVisualOrder, null, 2));

            // SIMPLIFICADO: Sales_page agora salva diretamente quando você clica em "Salvar" na página de vendas
            // Não precisa mais aplicar alterações pendentes aqui - os dados já estão salvos no servidor
            // O botão "Publicar alterações" apenas atualiza o status se necessário

            console.log('Enviando requisição para:', `${API_URL}/api/profile/save-all`);
            console.log('Dados sendo enviados:', {
                itemsCount: saveData.items?.length || 0,
                hasDetails: !!saveData.details,
                items: saveData.items?.map(item => ({
                    id: item.id,
                    type: item.item_type,
                    title: item.title,
                    is_active: item.is_active
                }))
            });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos de timeout

            let response;
            try {
                response = await fetch(`${API_URL}/api/profile/save-all`, {
                    method: 'PUT',
                    headers: HEADERS,
                    body: JSON.stringify(saveData),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('A requisição demorou muito tempo. Verifique sua conexão e tente novamente.');
                }
                throw new Error(`Erro de rede: ${fetchError.message}`);
            }

            console.log('Resposta recebida:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });

            let result;
            try {
                const responseText = await response.text();
                if (!responseText) {
                    throw new Error('Resposta vazia do servidor');
                }
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('O Erro ao parsear resposta:', parseError);
                console.error('O Response status:', response.status);
                console.error('O Response headers:', Object.fromEntries(response.headers.entries()));
                throw new Error('Erro ao processar resposta do servidor. Tente novamente.');
            }

            if (!response.ok) {
                console.error('O Erro ao salvar:', {
                    status: response.status,
                    statusText: response.statusText,
                    result: result
                });
                const errorMessage = result?.message ||
                    (response.status === 400 ? 'Dados inválidos. Verifique os campos preenchidos.' :
                        response.status === 401 ? 'Sessão expirada. Faça login novamente.' :
                            response.status === 403 ? 'Você não tem permissão para realizar esta ação.' :
                                response.status === 500 ? 'Erro interno do servidor. Tente novamente mais tarde.' :
                                    `Erro ${response.status}: ${response.statusText}`);
                throw new Error(errorMessage);
            }

            console.log('Dados salvos com sucesso:', result);
            console.log('Resposta completa:', JSON.stringify(result, null, 2));

            try {
                if (window.DashboardPersonalizar && typeof window.DashboardPersonalizar.reloadPreview === 'function') {
                    window.DashboardPersonalizar.reloadPreview(result.timestamp || Date.now());
                }
            } catch (ePrev) { /* preview opcional */ }

            // Salvar toggle Bíblia (visível/oculto) + posição/tamanho da Palavra do Dia
            // IMPORTANTE: Sempre salvar quando bibleItem existe - não depender de display (usuário pode estar em outra aba)
            const bibleItem = (window.currentProfileData?.items || saveData.items || []).find(function (it) { return it.item_type === 'bible'; });
            const bibleSetting = document.getElementById('bible-visibility-setting');
            if (bibleItem && bibleSetting) {
                const bibleToggleChecked = document.querySelector('input[name="bible-toggle"]:checked');
                const isVisible = bibleToggleChecked ? bibleToggleChecked.value === 'true' : true;
                const posChecked = document.querySelector('input[name="bible-verse-position"]:checked');
                const verse_position = posChecked && posChecked.value === 'bottom' ? 'bottom' : 'top';
                const sizeChecked = document.querySelector('input[name="bible-verse-size"]:checked');
                const sizeVal = sizeChecked ? sizeChecked.value : 'normal';
                const verse_size = ['small', 'xsmall'].includes(sizeVal) ? sizeVal : 'normal';
                try {
                    const bibleRes = await fetch(`${API_URL}/api/bible/config/${bibleItem.id}`, {
                        method: 'PUT',
                        headers: HEADERS,
                        body: JSON.stringify({ is_visible: isVisible, verse_position, verse_size })
                    });
                    if (bibleRes.ok) {
                        if (window.currentProfileData && window.currentProfileData.items) {
                            const bi = window.currentProfileData.items.find(function (it) { return it.item_type === 'bible'; });
                            if (bi) {
                                if (!bi.bible_data) bi.bible_data = {};
                                bi.bible_data.is_visible = isVisible;
                                bi.bible_data.verse_position = verse_position;
                                bi.bible_data.verse_size = verse_size;
                            }
                        }
                        console.log('Config Bíblia salva:', { isVisible, verse_position, verse_size });
                    }
                } catch (bibleErr) {
                    console.warn('Erro ao salvar config Bíblia:', bibleErr);
                }
            }

            // Atualizar os itens na lista usando os dados retornados pela API (em tempo real)
            if (result.items && Array.isArray(result.items)) {
                console.log(`Y"" Atualizando ${result.items.length} itens na interface usando dados da API...`);
                for (const itemData of result.items) {
                    // Pular sales_page - eles são atualizados separadamente
                    if (itemData.item_type === 'sales_page') {
                        continue;
                    }

                    // Usar a função centralizada para atualizar cada item
                    await updateItemFromApiResponse(itemData.id, itemData, itemData.item_type);
                }
                console.log(`Todos os itens atualizados em tempo real`);
            } else {
                console.warn('Resposta da API não contém items. Usando dados locais como fallback.');
                // Fallback: atualizar usando saveData.items (dados enviados)
                saveData.items.forEach(itemData => {
                    const itemEl = document.querySelector(`.item[data-id="${itemData.id}"], .module-item[data-id="${itemData.id}"]`);
                    if (!itemEl) {
                        console.warn(`Item ${itemData.id} não encontrado no DOM após salvar`);
                        return;
                    }

                    // Se for banner, atualizar as imagens (código antigo como fallback)
                    if (itemData.item_type === 'banner') {
                        const imageUrlInput = itemEl.querySelector('.item-image-url-input');
                        const destUrlInput = itemEl.querySelector('.item-destination-url-input');
                        const previewThumb = itemEl.querySelector('.banner-preview-thumb');
                        const nameInput = itemEl.querySelector('.item-banner-name-input');
                        const whatsappHidden = itemEl.querySelector('.item-title-input-hidden');
                        const originalDataRaw = itemEl.dataset.originalData ? itemEl.dataset.originalData : null;

                        // Extrair image_url corretamente (pode ser string ou objeto)
                        let imageUrl = itemData.image_url || '';
                        if (imageUrl && typeof imageUrl === 'object') {
                            imageUrl = imageUrl.image_url || imageUrl || '';
                        }
                        if (typeof imageUrl !== 'string') {
                            imageUrl = '';
                        }

                        if (imageUrlInput) {
                            imageUrlInput.value = imageUrl;
                        }

                        // Sanitizar destination_url que vem do servidor (pode vir como JSON ou com URLs de imagem)
                        const sanitizeBannerDestFromServer = (raw) => {
                            if (!raw || typeof raw !== 'string') return '';
                            if (raw.startsWith('[')) return '';
                            const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
                            const filtered = parts.filter(p => !p.includes('imagedelivery.net'));
                            return (filtered[0] || parts[0] || '').trim();
                        };
                        const sanitizedDest = sanitizeBannerDestFromServer(itemData.destination_url || '');

                        if (destUrlInput) {
                            destUrlInput.value = sanitizedDest;
                        }

                        // Atualizar preview
                        if (previewThumb && imageUrl) {
                            previewThumb.src = imageUrl;
                            previewThumb.style.display = 'block';
                        } else if (previewThumb && !imageUrl) {
                            previewThumb.style.display = 'none';
                        }

                        // Atualizar display do destino (usar valor sanitizado)
                        const displayDest = itemEl.querySelector('.item-display-dest');
                        if (displayDest) {
                            displayDest.textContent = sanitizedDest ? sanitizedDest : 'Sem destino';
                        }

                        // Atualizar nome e mensagem
                        if (nameInput) {
                            nameInput.value = itemData.title || 'Banner';
                        }
                        if (whatsappHidden) {
                            whatsappHidden.value = itemData.whatsapp_message || '';
                        }

                        // Atualizar originalData para refletir o salvo (usar destino já sanitizado)
                        if (originalDataRaw) {
                            try {
                                const original = JSON.parse(originalDataRaw);
                                original.title = itemData.title || '';
                                original.destination_url = sanitizedDest; // Já sanitizado acima
                                original.image_url = imageUrl;
                                original.whatsapp_message = itemData.whatsapp_message || '';
                                itemEl.dataset.originalData = JSON.stringify(original);
                            } catch (e) {
                                console.warn('Banner: não foi possível atualizar originalData', e);
                            }
                        }
                    }
                });
            }

            alert('Alterações publicadas com sucesso!');

            // Fechar modal de edição se estiver aberto
            if (SELECTORS.editItemModal) {
                SELECTORS.editItemModal.classList.remove('active');
            }

            // IMPORTANTE: Capturar ordem visual atual ANTES de qualquer processamento
            // Isso permite preservar a ordem que o usuário configurou, independente do caminho de código
            let visualOrderMap = new Map();
            const allCurrentItemsBeforeProcessing = document.querySelectorAll('#items-container .item[data-id], #items-container .module-item[data-id]');
            allCurrentItemsBeforeProcessing.forEach((itemEl, visualIndex) => {
                const itemId = itemEl.dataset.id;
                if (itemId && !itemId.toString().startsWith('temp_')) {
                    // Mapear ID do item para sua posição visual atual (1-indexed)
                    visualOrderMap.set(String(itemId), visualIndex + 1);
                }
            });
            console.log(`Y"< Ordem visual capturada ANTES de processar: ${visualOrderMap.size} itens`, Array.from(visualOrderMap.entries()));

            // IMPORTANTE: Verificar se há itens sales_page na lista
            // Se houver, buscar dados atualizados APENAS do sales_page e atualizar localmente
            // NÃO recarregar todos os dados para evitar sobrescrever alterações salvas na página de vendas
            const salesPageElements = document.querySelectorAll('#items-container .item[data-item-type="sales_page"], #items-container .module-item[data-item-type="sales_page"]');
            const hasSalesPageItems = salesPageElements.length > 0;

            if (hasSalesPageItems) {
                console.log(`Detectado ${salesPageElements.length} item(ns) sales_page na lista.`);
                console.log('Buscando dados atualizados APENAS do sales_page para preservar alterações salvas.');

                // Buscar dados atualizados de cada sales_page diretamente do servidor
                for (const itemEl of salesPageElements) {
                    const itemId = itemEl.dataset.id;
                    if (itemId && !itemId.toString().startsWith('temp_')) {
                        try {
                            console.log(`Buscando dados atualizados do sales_page ${itemId}...`);
                            const itemResponse = await fetch(`${API_URL}/api/profile/items/${itemId}`, {
                                method: 'GET',
                                headers: HEADERS
                            });

                            if (itemResponse.ok) {
                                const itemData = await itemResponse.json();
                                const salesPageData = itemData.data || itemData;

                                // Atualizar dados no window.currentProfileData
                                if (!window.currentProfileData) {
                                    window.currentProfileData = { details: {}, items: [] };
                                }
                                if (!window.currentProfileData.items) {
                                    window.currentProfileData.items = [];
                                }

                                const updatedSalesPageItem = {
                                    id: parseInt(itemId, 10),
                                    item_type: 'sales_page',
                                    title: salesPageData.title || 'Página de Vendas',
                                    image_url: salesPageData.image_url || null,
                                    logo_size: salesPageData.logo_size || 24,
                                    is_active: salesPageData.is_active !== false,
                                    display_order: salesPageData.display_order || 999,
                                    destination_url: salesPageData.destination_url || null,
                                    icon_class: salesPageData.icon_class || 'fas fa-store'
                                };

                                const itemIndex = window.currentProfileData.items.findIndex(item =>
                                    String(item.id) === String(itemId) && item.item_type === 'sales_page'
                                );

                                if (itemIndex !== -1) {
                                    // Atualizar item existente com dados do servidor
                                    window.currentProfileData.items[itemIndex] = updatedSalesPageItem;
                                    console.log(`Dados do sales_page ${itemId} atualizados em currentProfileData:`, {
                                        title: salesPageData.title,
                                        image_url: salesPageData.image_url?.substring(0, 50) || 'null',
                                        logo_size: salesPageData.logo_size || 24
                                    });
                                } else {
                                    // Adicionar item se não existir
                                    window.currentProfileData.items.push(updatedSalesPageItem);
                                    console.log(`Dados do sales_page ${itemId} adicionados em currentProfileData:`, {
                                        title: salesPageData.title,
                                        image_url: salesPageData.image_url?.substring(0, 50) || 'null',
                                        logo_size: salesPageData.logo_size || 24
                                    });
                                }
                            } else {
                                console.warn(`Não foi possível buscar dados atualizados do sales_page ${itemId}`);
                            }
                        } catch (error) {
                            console.error(`O Erro ao buscar dados atualizados do sales_page ${itemId}:`, error);
                        }
                    }
                }

                // IMPORTANTE: Aplicar ordem visual preservada aos dados ANTES de renderizar
                // Mas apenas se houver dados e ordem visual capturada
                if (window.currentProfileData && window.currentProfileData.items) {
                    if (visualOrderMap.size > 0) {
                        console.log('Y"" Aplicando ordem visual preservada aos dados antes de renderizar...');
                        window.currentProfileData.items.forEach(item => {
                            const itemId = String(item.id);
                            const visualOrder = visualOrderMap.get(itemId);
                            if (visualOrder !== undefined) {
                                const oldOrder = item.display_order;
                                item.display_order = visualOrder;
                                if (oldOrder !== visualOrder) {
                                    console.log(`Y"" Item ${itemId}: display_order ${oldOrder} -> ${visualOrder}`);
                                }
                            }
                        });

                        // Re-ordenar itens baseado na ordem visual preservada
                        window.currentProfileData.items.sort((a, b) => {
                            const orderA = visualOrderMap.get(String(a.id)) || a.display_order || 9999;
                            const orderB = visualOrderMap.get(String(b.id)) || b.display_order || 9999;
                            return orderA - orderB;
                        });
                        console.log('Ordem visual aplicada aos dados');
                    } else {
                        console.log('Ordem visual não capturada, usando ordem do servidor');
                    }
                } else {
                    console.error('O window.currentProfileData ou items não existe!');
                }

                console.log('NÃO recarregando todos os dados para preservar alterações salvas na página de vendas.');
                console.log('Os dados da página de vendas foram atualizados diretamente do servidor.');
                console.log('O botão "Publicar alterações" apenas publica os outros módulos, não afeta a página de vendas.');

                // Re-renderizar para garantir que os dados atualizados do sales_page sejam exibidos
                if (window.currentProfileData) {
                    renderEditor(window.currentProfileData);
                }

                // IMPORTANTE: Após renderizar, garantir que a ordem visual seja mantida no DOM
                requestAnimationFrame(() => {
                    const container = SELECTORS.itemsContainer || document.getElementById('items-container');
                    if (container && visualOrderMap.size > 0) {
                        const itemsInDOM = Array.from(container.children);

                        // Verificar se precisa reordenar
                        let needsReorder = false;
                        itemsInDOM.forEach((item, index) => {
                            const itemId = String(item.dataset.id);
                            const expectedOrder = visualOrderMap.get(itemId);
                            if (expectedOrder !== undefined && expectedOrder !== (index + 1)) {
                                needsReorder = true;
                            }
                        });

                        if (needsReorder) {
                            console.log('Y"" Reordenando elementos no DOM para manter ordem visual (caminho sales_page)...');

                            // Criar array ordenado baseado na ordem visual
                            const sortedItems = itemsInDOM.slice().sort((a, b) => {
                                const idA = String(a.dataset.id);
                                const idB = String(b.dataset.id);
                                const orderA = visualOrderMap.get(idA) || parseInt(a.dataset.displayOrder || '9999', 10);
                                const orderB = visualOrderMap.get(idB) || parseInt(b.dataset.displayOrder || '9999', 10);
                                return orderA - orderB;
                            });

                            // Reordenar no DOM
                            sortedItems.forEach(item => {
                                container.appendChild(item);
                                // Atualizar data-display-order no elemento
                                const itemId = String(item.dataset.id);
                                const visualOrder = visualOrderMap.get(itemId);
                                if (visualOrder !== undefined) {
                                    item.dataset.displayOrder = visualOrder;
                                    item.setAttribute('data-display-order', visualOrder);
                                }
                            });

                            console.log('Elementos reordenados no DOM (caminho sales_page)');

                            // Re-inicializar Sortable após reordenar
                            if (typeof initSortable === 'function') {
                                setTimeout(() => {
                                    initSortable();
                                    console.log('Sortable reinicializado após reordenar (caminho sales_page)');
                                }, 50);
                            }
                        } else {
                            console.log('Elementos já estão na ordem correta no DOM (caminho sales_page)');
                        }
                    }
                });

                // Atualizar preview local
                updateLivePreviewFromForm();
                console.log('Alterações publicadas sem recarregar todos os dados (preservando alterações da página de vendas)');
                return; // Retornar cedo para não recarregar todos os dados
            }

            // IMPORTANTE: Se não há sales_page, usar a ordem visual já capturada acima
            // Se visualOrderMap estiver vazio (não foi capturado), capturar agora
            if (visualOrderMap.size === 0) {
                const allCurrentItems = document.querySelectorAll('#items-container .item[data-id], #items-container .module-item[data-id]');
                allCurrentItems.forEach((itemEl, visualIndex) => {
                    const itemId = itemEl.dataset.id;
                    if (itemId && !itemId.toString().startsWith('temp_')) {
                        // Mapear ID do item para sua posição visual atual (1-indexed)
                        visualOrderMap.set(String(itemId), visualIndex + 1);
                    }
                });
            }

            const itemsInDOM = new Set();
            visualOrderMap.forEach((order, itemId) => {
                itemsInDOM.add(itemId);
            });

            console.log(`Y"< Ordem visual capturada: ${visualOrderMap.size} itens`, Array.from(visualOrderMap.entries()));
            console.log(`Y"< Itens no DOM antes de recarregar: ${itemsInDOM.size}`, Array.from(itemsInDOM));

            // Aguardar um pouco antes de recarregar para garantir que o servidor processou tudo
            // Isso evita que elementos sumam e voltem rapidamente
            console.log('⏳ Aguardando processamento do servidor...');
            await new Promise(resolve => setTimeout(resolve, 1500)); // Aumentar delay para 1.5s para garantir que DELETE foi processado

            // Preservar valor do WhatsApp antes de recarregar (caso a coluna não exista no banco)
            const preservedWhatsapp = SELECTORS.whatsappNumberInput?.value || '';
            console.log('[SAVE-ALL] Preservando valor do WhatsApp antes de recarregar:', preservedWhatsapp);

            // Preservar fundo do cartão e fundo de tela antes de recarregar (evita "salva mas some")
            const preservedFundo = {
                background_type: (document.querySelector('input[name="bg-type"]:checked') || {}).value || 'color',
                background_color: SELECTORS.backgroundColorPicker?.value || '#0D0D0F',
                background_image_url: SELECTORS.backgroundImageUrlInput?.value ?? '',
                background_image_opacity: SELECTORS.backgroundImageOpacityPicker ? parseFloat(SELECTORS.backgroundImageOpacityPicker.value) : 1,
                card_background_color: SELECTORS.cardBackgroundColorPicker?.value || '#141417',
                card_opacity: SELECTORS.cardOpacityPicker ? parseFloat(SELECTORS.cardOpacityPicker.value) : 1
            };
            console.log('YZ [SAVE-ALL] Preservando fundo antes de recarregar:', preservedFundo);

            // Recarregar dados do servidor para garantir sincronização
            // Isso é necessário para garantir que novos módulos apareçam no cartão público
            console.log('Y"" Recarregando dados do servidor após salvar...');
            try {
                await fetchProfileData(true); // Forçar atualização imediata

                // Se o WhatsApp não veio do servidor mas tinha valor antes, restaurar
                if (preservedWhatsapp && (!window.currentProfileData?.details?.whatsapp || window.currentProfileData.details.whatsapp === '')) {
                    console.log('[SAVE-ALL] Restaurando valor do WhatsApp preservado:', preservedWhatsapp);
                    if (SELECTORS.whatsappNumberInput) {
                        SELECTORS.whatsappNumberInput.value = preservedWhatsapp;
                    }
                    if (window.currentProfileData && window.currentProfileData.details) {
                        window.currentProfileData.details.whatsapp = preservedWhatsapp;
                    }
                }

                // Restaurar fundo do cartão se a API retornou vazio/default (evita "salva mas some")
                const d = window.currentProfileData?.details;
                const cardColorOk = (d?.card_background_color ?? d?.cardBackgroundColor ?? '').toString().length > 0;
                const cardOpacityOk = (d?.card_opacity ?? d?.cardOpacity) != null;
                const needRestoreFundo = !d || !cardColorOk || !cardOpacityOk;
                if (needRestoreFundo && preservedFundo) {
                    console.log('YZ [SAVE-ALL] Restaurando fundo preservado (API retornou vazio/default)');
                    if (SELECTORS.cardBackgroundColorPicker) SELECTORS.cardBackgroundColorPicker.value = preservedFundo.card_background_color;
                    if (SELECTORS.cardOpacityPicker) SELECTORS.cardOpacityPicker.value = String(preservedFundo.card_opacity);
                    if (SELECTORS.backgroundColorPicker) SELECTORS.backgroundColorPicker.value = preservedFundo.background_color;
                    if (SELECTORS.backgroundImageUrlInput) SELECTORS.backgroundImageUrlInput.value = preservedFundo.background_image_url || '';
                    if (SELECTORS.backgroundImageOpacityPicker) SELECTORS.backgroundImageOpacityPicker.value = String(preservedFundo.background_image_opacity);
                    if (SELECTORS.backgroundImagePreview && preservedFundo.background_image_url) {
                        SELECTORS.backgroundImagePreview.src = preservedFundo.background_image_url;
                    }
                    const bgRadio = document.querySelector(`input[name="bg-type"][value="${preservedFundo.background_type}"]`);
                    if (bgRadio) bgRadio.checked = true;
                    if (preservedFundo.background_type === 'image') {
                        if (SELECTORS.backgroundColorContainer) SELECTORS.backgroundColorContainer.style.display = 'none';
                        if (SELECTORS.backgroundImageContainer) SELECTORS.backgroundImageContainer.style.display = 'block';
                    } else {
                        if (SELECTORS.backgroundColorContainer) SELECTORS.backgroundColorContainer.style.display = 'block';
                        if (SELECTORS.backgroundImageContainer) SELECTORS.backgroundImageContainer.style.display = 'none';
                    }
                    if (d) {
                        d.card_background_color = preservedFundo.card_background_color;
                        d.card_opacity = preservedFundo.card_opacity;
                        d.background_type = preservedFundo.background_type;
                        d.background_color = preservedFundo.background_color;
                        d.background_image_url = preservedFundo.background_image_url;
                        d.background_image_opacity = preservedFundo.background_image_opacity;
                    }
                    if (typeof updateLivePreviewFromForm === 'function') updateLivePreviewFromForm();
                }

                // Após recarregar do servidor: confiar na API (não remover módulos só porque faltavam no DOM)
                if (window.currentProfileData && window.currentProfileData.items) {
                    try { delete window.__mergedServerItemIdsForSave; } catch (e) {}

                    // Aplicar ordem visual que estava antes de recarregar
                    // Isso garante que a ordem configurada pelo usuário seja preservada
                    let orderUpdated = false;
                    window.currentProfileData.items.forEach(item => {
                        const itemId = String(item.id);
                        const visualOrder = visualOrderMap.get(itemId);
                        if (visualOrder !== undefined) {
                            const oldOrder = item.display_order;
                            item.display_order = visualOrder;
                            if (oldOrder !== visualOrder) {
                                console.log(`Y"" Aplicando ordem visual ao item ${itemId}: ${oldOrder} -> ${visualOrder}`);
                                orderUpdated = true;
                            }
                        }
                    });

                    // Re-ordenar itens baseado na ordem visual preservada ANTES de renderizar
                    // Isso garante que renderEditor receba os itens já na ordem correta
                    window.currentProfileData.items.sort((a, b) => {
                        const orderA = visualOrderMap.get(String(a.id)) || a.display_order || 9999;
                        const orderB = visualOrderMap.get(String(b.id)) || b.display_order || 9999;
                        return orderA - orderB;
                    });

                    if (orderUpdated || visualOrderMap.size > 0) {
                        console.log('Ordem visual preservada e aplicada aos dados recarregados');
                        console.log('Y"S Ordem final dos itens:', window.currentProfileData.items.map(item => ({
                            id: item.id,
                            type: item.item_type,
                            display_order: item.display_order,
                            visualOrder: visualOrderMap.get(String(item.id))
                        })));
                    }

                    // Re-renderizar lista de módulos (Wi-Fi e outros que estavam no servidor mas não no DOM)
                    console.log('Y"" Renderizando lista de módulos após publicar...');
                    if (window.currentProfileData) {
                        renderEditor(window.currentProfileData);
                        reconcileModulesListWithProfileData(window.currentProfileData);
                    }

                    // Atualizar preview após renderEditor
                    // Usar múltiplos requestAnimationFrame para garantir que o DOM foi completamente atualizado
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            setTimeout(() => {
                                console.log('Y"" Forçando atualização do preview após renderEditor...');
                                updateLivePreviewFromForm();
                                console.log('Preview atualizado após recarregar dados');
                            }, 500);
                        });
                    });

                    // IMPORTANTE: Após renderizar, garantir que a ordem visual seja mantida no DOM
                    // Reordenar os elementos no DOM baseado na ordem visual preservada
                    // Usar requestAnimationFrame para garantir que o DOM foi atualizado
                    requestAnimationFrame(() => {
                        const container = SELECTORS.itemsContainer || document.getElementById('items-container');
                        if (container && visualOrderMap.size > 0) {
                            const itemsInDOM = Array.from(container.children);

                            // Verificar se precisa reordenar
                            let needsReorder = false;
                            itemsInDOM.forEach((item, index) => {
                                const itemId = String(item.dataset.id);
                                const expectedOrder = visualOrderMap.get(itemId);
                                if (expectedOrder !== undefined && expectedOrder !== (index + 1)) {
                                    needsReorder = true;
                                }
                            });

                            if (needsReorder) {
                                console.log('Y"" Reordenando elementos no DOM para manter ordem visual...');

                                // Criar array ordenado baseado na ordem visual
                                const sortedItems = itemsInDOM.slice().sort((a, b) => {
                                    const idA = String(a.dataset.id);
                                    const idB = String(b.dataset.id);
                                    const orderA = visualOrderMap.get(idA) || parseInt(a.dataset.displayOrder || '9999', 10);
                                    const orderB = visualOrderMap.get(idB) || parseInt(b.dataset.displayOrder || '9999', 10);
                                    return orderA - orderB;
                                });

                                // Reordenar no DOM
                                sortedItems.forEach(item => {
                                    container.appendChild(item);
                                    // Atualizar data-display-order no elemento
                                    const itemId = String(item.dataset.id);
                                    const visualOrder = visualOrderMap.get(itemId);
                                    if (visualOrder !== undefined) {
                                        item.dataset.displayOrder = visualOrder;
                                        item.setAttribute('data-display-order', visualOrder);
                                    }
                                });

                                console.log('Elementos reordenados no DOM');

                                // Re-inicializar Sortable após reordenar
                                if (typeof initSortable === 'function') {
                                    setTimeout(() => {
                                        initSortable();
                                        console.log('Sortable reinicializado após reordenar');
                                    }, 50);
                                }
                            } else {
                                console.log('Elementos já estão na ordem correta no DOM');
                            }

                            // IMPORTANTE: Atualizar preview ao vivo após reordenar DOM
                            // Isso garante que o preview mostre as alterações imediatamente
                            requestAnimationFrame(() => {
                                setTimeout(() => {
                                    updateLivePreviewFromForm();
                                    console.log('Preview atualizado após reordenar DOM');
                                }, 100);
                            });
                        }
                    });
                } else {
                    // Se não precisou reordenar, atualizar preview imediatamente
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            setTimeout(() => {
                                console.log('Y"" Forçando atualização do preview após recarregar (sem reordenar)...');
                                updateLivePreviewFromForm();
                                console.log('Preview atualizado após recarregar (sem reordenar)');
                            }, 500);
                        });
                    });
                }

                console.log('Dados recarregados com ordem visual preservada');

            } catch (fetchError) {
                console.error('Erro ao recarregar dados após salvar:', fetchError);
                // Não mostrar erro para o usuário, pois os dados já foram salvos
                // Apenas logar para debug
                // Mesmo com erro, atualizar preview com os dados atuais
                updateLivePreviewFromForm();
            }

        } catch (error) {
            console.error("O Erro em saveAllChanges:", error);
            console.error("O Stack trace:", error.stack);
            console.error("O Error details:", {
                name: error.name,
                message: error.message,
                cause: error.cause
            });

            // Mostrar mensagem de erro mais detalhada
            let errorMessage = error.message || 'Erro desconhecido ao salvar';
            if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
            } else if (error.message.includes('timeout') || error.message.includes('demorou muito')) {
                errorMessage = 'A requisição demorou muito tempo. Tente novamente.';
            } else if (error.message.includes('parsear') || error.message.includes('processar resposta')) {
                errorMessage = 'Erro ao processar resposta do servidor. Tente novamente.';
            }

            alert(`ERRO ao salvar: ${errorMessage}`);
        } finally {
            // Restaurar botão que foi clicado
            const clickedBtn = (event && event.target) || (event && event.currentTarget) || document.getElementById('header-save-btn') || document.getElementById('mobile-save-all-btn');
            if (clickedBtn) {
                clickedBtn.disabled = false;
                clickedBtn.innerHTML = '<i class="fas fa-check"></i> Publicar alterações';
            }
        }
    }

    async function saveItemOrder(itemsOrder) {
        try {
            // Atualizar a ordem de cada item no servidor
            const updatePromises = itemsOrder.map(item => {
                return fetch(`${API_URL}/api/profile/items/${item.id}`, {
                    method: 'PUT',
                    headers: HEADERS,
                    body: JSON.stringify({ display_order: item.display_order })
                });
            });

            await Promise.all(updatePromises);
            console.log('Ordem dos módulos atualizada com sucesso');
        } catch (error) {
            console.error('O Erro ao salvar ordem dos módulos:', error);
        }
    }

    function initSortable() {
        if (!SELECTORS.itemsContainer) {
            console.warn('initSortable: itemsContainer não encontrado');
            return;
        }

        // Verificar se há itens no container
        const items = SELECTORS.itemsContainer.querySelectorAll('.module-item');
        if (items.length === 0) {
            console.warn('initSortable: Nenhum item encontrado no container');
            return;
        }

        // Verificar se há handles de arraste
        const handles = SELECTORS.itemsContainer.querySelectorAll('.module-drag-handle');
        if (handles.length === 0) {
            console.warn('initSortable: Nenhum handle de arraste encontrado. Aguardando renderização...');
            // Tentar novamente após um pequeno delay
            setTimeout(() => {
                if (SELECTORS.itemsContainer.querySelectorAll('.module-drag-handle').length > 0) {
                    initSortable();
                }
            }, 100);
            return;
        }

        console.log(`Y"" Inicializando Sortable (mobile: ${window.innerWidth <= 768}, ${items.length} itens, ${handles.length} handles)`);

        // Destruir instância anterior se existir
        if (SELECTORS.itemsContainer.sortable) {
            SELECTORS.itemsContainer.sortable.destroy();
            SELECTORS.itemsContainer.sortable = null;
        }

        // Detectar se é mobile - detecção universal para TODOS os mobiles
        const isMobile = window.innerWidth <= 768 ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent) ||
            ('ontouchstart' in window) ||
            (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);

        console.log(`Detecção mobile: ${isMobile} (width: ${window.innerWidth}, touch: ${'ontouchstart' in window}, maxTouchPoints: ${navigator.maxTouchPoints})`);

        SELECTORS.itemsContainer.sortable = new Sortable(SELECTORS.itemsContainer, {
            animation: 150,
            // SEMPRE usar handle (três pontinhos) - tanto no mobile quanto desktop
            handle: '.module-drag-handle',
            // Configuração para mobile - SEM delay para resposta imediata
            delay: 0, // SEM delay - resposta imediata
            delayOnTouchStart: false, // SEM delay no touch
            touchStartThreshold: 0, // Zero - detecta movimento imediatamente
            // Fallback no mobile - NÃO usar fallbackOnBody para manter eventos no container
            forceFallback: isMobile,
            fallbackOnBody: false, // false = drag fica no container = touch contínuo no mobile
            fallbackTolerance: 0,
            fallbackOffset: { x: 0, y: -8 },
            fallbackClass: 'sortable-fallback',
            // Scroll durante drag - usar padrão do Sortable (não customizar)
            scroll: true,
            scrollSensitivity: 20,
            scrollSpeed: 15,
            bubbleScroll: true,
            // MOVIMENTO LIVRE: invertSwap FALSE = troca "no lugar" do item = desliza contínuo
            // invertSwap true = "entre" = pode travar um por vez no mobile
            swapThreshold: 1, // 1 = item todo é zona de troca
            invertSwap: false, // false = arrasta sobre o item e ocupa o lugar = contínuo
            direction: 'vertical',
            emptyInsertThreshold: 5,
            disabled: false,
            draggable: '.module-item',
            // Melhorar feedback visual
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            // Filtrar botões para não arrastar quando clicar neles
            filter: '.module-move-btn, .module-action-btn, .module-toggle, .module-toggle-input, .module-toggle-slider, button, a',
            preventOnFilter: true,
            // Callback para quando começar a arrastar
            onStart: function (evt) {
                try {
                    console.log('YY Drag iniciado', { item: evt.item, index: evt.oldIndex, isMobile: isMobile });

                    // Prevenir seleção de texto
                    document.body.style.userSelect = 'none';
                    document.body.style.webkitUserSelect = 'none';

                    // CRÍTICO: Fazer módulo "LEVANTAR" imediatamente
                    if (evt.item && evt.item.style) {
                        // Módulo LEVANTA visualmente
                        evt.item.style.touchAction = 'none';
                        evt.item.style.webkitTouchCallout = 'none';
                        evt.item.style.pointerEvents = 'auto';
                        evt.item.style.position = 'relative';
                        evt.item.style.zIndex = '10000';
                        evt.item.style.transform = 'translateY(-10px) scale(1.05)';
                        evt.item.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.5)';
                        evt.item.style.opacity = '0.95';
                    }

                    // Adicionar classes para feedback visual (módulo "LEVANTA")
                    if (evt.item) {
                        evt.item.classList.add('sortable-dragging');

                        if (isMobile) {
                            evt.item.classList.add('sortable-dragging-mobile');

                            // Vibrar se disponível (todos os mobiles)
                            if (navigator.vibrate) {
                                navigator.vibrate(30);
                            }

                            // Garantir que o item arrastado não cause scroll da página
                            // Mas NÃO bloquear o body para não cortar touchmove do Sortable
                            evt.item.style.touchAction = 'none';
                        }
                    }
                } catch (error) {
                    console.error('O Erro no onStart do Sortable:', error);
                }
            },
            // Callback durante o drag - permitir movimento livre
            onMove: function (evt) {
                try {
                    // Permitir movimento livre sem interferências
                    return true; // Sempre permitir movimento
                } catch (error) {
                    console.error('O Erro no onMove do Sortable:', error);
                    return true; // Permitir movimento mesmo com erro
                }
            },
            // Callback para quando terminar de arrastar
            onEnd: function (evt) {
                try {
                    console.log('Drag finalizado', { oldIndex: evt.oldIndex, newIndex: evt.newIndex });

                    // Restaurar scroll da página
                    if (isMobile) {
                        document.body.style.overflow = '';
                        document.body.style.touchAction = '';
                        document.documentElement.style.overflow = '';
                        document.documentElement.style.touchAction = '';
                    }

                    // Restaurar seleção
                    document.body.style.userSelect = '';
                    document.body.style.webkitUserSelect = '';

                    // Restaurar touch-action e estilos do item (módulo volta ao normal)
                    if (evt.item && evt.item.style) {
                        evt.item.style.touchAction = '';
                        evt.item.style.webkitTouchCallout = '';
                        evt.item.style.pointerEvents = '';
                        evt.item.style.transform = ''; // Remove o "levante"
                        evt.item.style.boxShadow = ''; // Remove sombra
                        evt.item.style.opacity = '';
                        evt.item.style.position = '';
                        evt.item.style.zIndex = '';
                    }

                    // Remover classes de drag
                    if (evt.item) {
                        evt.item.classList.remove('sortable-dragging', 'sortable-dragging-mobile', 'sortable-ghost', 'sortable-chosen', 'sortable-drag');
                    }

                    // Atualizar a ordem dos itens no servidor E no DOM
                    const items = Array.from(SELECTORS.itemsContainer.children);
                    const newOrder = items.map((item, index) => {
                        const itemId = item.dataset.id || item.querySelector('[data-item-id]')?.dataset.itemId;
                        const displayOrder = index + 1;

                        // Atualizar data-display-order no DOM para manter sincronizado
                        if (itemId) {
                            item.dataset.displayOrder = displayOrder;
                            item.setAttribute('data-display-order', displayOrder);
                        }

                        return { id: itemId, display_order: displayOrder };
                    }).filter(item => item.id);

                    // Salvar a nova ordem apenas se realmente mudou
                    if (newOrder.length > 0 && evt.oldIndex !== evt.newIndex) {
                        console.log(`Y' Salvando nova ordem (${newOrder.length} itens)`);
                        saveItemOrder(newOrder).catch(err => {
                            console.error('O Erro ao salvar ordem:', err);
                        });
                    }

                    updateLivePreviewFromForm();

                    // CRÍTICO: Garantir que o Sortable continue habilitado e funcionando
                    if (SELECTORS.itemsContainer && SELECTORS.itemsContainer.sortable) {
                        // Garantir que não está desabilitado
                        SELECTORS.itemsContainer.sortable.option('disabled', false);
                        console.log('Sortable ainda ativo e habilitado após drag - pode arrastar novamente');
                    } else {
                        console.warn('Sortable não encontrado após drag - reinicializando...');
                        setTimeout(() => {
                            initSortable();
                        }, 100);
                    }

                } catch (error) {
                    console.error('O Erro no onEnd do Sortable:', error);
                    // Tentar restaurar estado mesmo com erro
                    if (evt.item) {
                        evt.item.classList.remove('sortable-dragging', 'sortable-dragging-mobile');
                        if (evt.item.style) {
                            evt.item.style.touchAction = '';
                            evt.item.style.transform = '';
                        }
                    }
                    document.body.style.userSelect = '';
                    document.body.style.webkitUserSelect = '';
                }
            }
        });

        console.log('Sortable inicializado - movimento livre habilitado para TODOS os mobiles');

        // Adicionar event listeners para botões de seta
        setupMoveButtons();

        // Garantir que o Sortable permaneça habilitado
        if (SELECTORS.itemsContainer.sortable) {
            SELECTORS.itemsContainer.sortable.option('disabled', false);
            SELECTORS.itemsContainer.sortable.option('swapThreshold', 1);
            SELECTORS.itemsContainer.sortable.option('invertSwap', false); // false = desliza contínuo
            SELECTORS.itemsContainer.sortable.option('scroll', true);
            SELECTORS.itemsContainer.sortable.option('fallbackOnBody', false); // mantém no container no mobile
            console.log('Sortable movimento livre (invertSwap:false fallbackOnBody:false) para mobile');
        }
    }

    // Função para configurar botões de mover para cima/baixo
    // Usa event delegation única para evitar múltiplos listeners
    let moveButtonsHandler = null;

    function setupMoveButtons() {
        // Remover handler anterior se existir
        if (moveButtonsHandler) {
            document.removeEventListener('click', moveButtonsHandler);
            moveButtonsHandler = null;
        }

        // Criar novo handler único
        moveButtonsHandler = function (e) {
            const btn = e.target.closest('.module-move-btn');
            if (!btn) return;

            // Só prevenir default se realmente for um botão de mover
            if (btn.classList.contains('module-move-btn')) {
                e.preventDefault();
                e.stopPropagation();
            } else {
                return; // Não é um botão de mover, deixar o evento seguir normalmente
            }

            const itemId = btn.dataset.itemId;
            const direction = btn.dataset.direction;

            if (!itemId || !direction || !SELECTORS.itemsContainer) {
                console.warn('Dados incompletos para mover módulo:', { itemId, direction, hasContainer: !!SELECTORS.itemsContainer });
                return;
            }

            const itemEl = document.querySelector(`.module-item[data-id="${itemId}"]`);
            if (!itemEl) return;

            const items = Array.from(SELECTORS.itemsContainer.children);
            const currentIndex = items.indexOf(itemEl);

            if (currentIndex === -1) return;

            let newIndex;
            if (direction === 'up' && currentIndex > 0) {
                newIndex = currentIndex - 1;
            } else if (direction === 'down' && currentIndex < items.length - 1) {
                newIndex = currentIndex + 1;
            } else {
                return; // Já está no topo ou no final
            }

            // Mover o elemento
            const nextItem = items[newIndex];
            if (direction === 'up') {
                SELECTORS.itemsContainer.insertBefore(itemEl, nextItem);
            } else {
                SELECTORS.itemsContainer.insertBefore(itemEl, nextItem.nextSibling);
            }

            // Atualizar ordem no servidor E no DOM
            const newOrder = Array.from(SELECTORS.itemsContainer.children).map((item, index) => {
                const id = item.dataset.id || item.querySelector('[data-item-id]')?.dataset.itemId;
                const displayOrder = index + 1;

                // Atualizar data-display-order no DOM para manter sincronizado
                if (id) {
                    item.dataset.displayOrder = displayOrder;
                    item.setAttribute('data-display-order', displayOrder);
                }

                return { id, display_order: displayOrder };
            }).filter(item => item.id);

            if (newOrder.length > 0) {
                saveItemOrder(newOrder);
            }

            updateLivePreviewFromForm();
        };

        // Adicionar listener único usando event delegation
        document.addEventListener('click', moveButtonsHandler);
    }

    async function openEditModal(itemEl) {
        const itemId = itemEl.dataset.id;
        const itemType = itemEl.dataset.itemType;

        // Redirecionar para página de edição dedicada (digital_form abre modal no dashboard)
        if (itemType === 'sales_page' || itemType === 'guest_list' || itemType === 'contract' || itemType === 'king_selection' || itemType === 'convite' || itemType === 'bible') {
            // IMPORTANTE: Verificar se o item é temporário (não salvo ainda)
            // Verificar tanto pelo ID quanto pelo atributo data-is-temporary
            const isTemporary = (itemId && itemId.toString().startsWith('temp_')) ||
                itemEl.dataset.isTemporary === 'true' ||
                itemEl.hasAttribute('data-is-temporary');

            console.log(`Verificando se sales_page é temporário:`, {
                itemId,
                isTemporary,
                hasDataIsTemporary: itemEl.hasAttribute('data-is-temporary'),
                datasetIsTemporary: itemEl.dataset.isTemporary
            });

            if (isTemporary) {
                alert('Este módulo ainda não foi salvo. Por favor, clique em "Publicar alterações" primeiro para salvar o módulo antes de editá-lo.');
                return; // Não redirecionar
            }

            // IMPORTANTE: Verificar se o item existe no servidor antes de redirecionar
            try {
                updateHeaders();
                const checkResponse = await fetch(`${API_URL}/api/profile/items/${itemId}`, {
                    method: 'GET',
                    headers: HEADERS
                });

                if (!checkResponse.ok) {
                    if (checkResponse.status === 404) {
                        alert('Este módulo não existe mais no servidor. Ele pode ter sido deletado. Removendo do dashboard...');
                        // Remover do DOM
                        itemEl.remove();
                        // Remover do currentProfileData se existir
                        if (window.currentProfileData && window.currentProfileData.items) {
                            window.currentProfileData.items = window.currentProfileData.items.filter(item => String(item.id) !== String(itemId));
                        }
                        return; // Não redirecionar
                    }
                    throw new Error(`Erro ${checkResponse.status} ao verificar item`);
                }
            } catch (error) {
                console.error('Erro ao verificar se item existe:', error);
                alert('Erro ao verificar se o módulo existe. Tente novamente.');
                return; // Não redirecionar em caso de erro
            }

            if (itemType === 'sales_page') {
                window.location.href = `salesPageEdit.html?itemId=${itemId}`;
            } else if (itemType === 'guest_list') {
                window.location.href = `guestListEdit.html?itemId=${itemId}`;
            } else if (itemType === 'contract' || itemType === 'agenda' || itemType === 'kingbrief' || itemType === 'king_bolao') {
                alert('Este módulo foi descontinuado e já não está disponível.');
                return;
            } else if (itemType === 'king_selection') {
                window.location.href = kingSelectionAdminUrl();
            } else if (itemType === 'convite') {
                window.location.href = `conviteEdit.html?itemId=${itemId}`;
            } else if (itemType === 'bible') {
                try {
                    sessionStorage.setItem('bible_item_id', String(itemId));
                    sessionStorage.setItem('bible_panel_item_id', String(itemId));
                } catch (e) {}
                window.location.href = 'bibliaking.html';
            }
            return;
        }

        let formHTML = '';

        // Funf§f£o auxiliar para sanitizar URLs de imagem
        function sanitizeImageUrl(url) {
            const defaultPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9Ijc1IiB5PSI3NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIj5JbWFnZW08L3RleHQ+Cjwvc3ZnPgo=';
            if (!url || typeof url !== 'string') {
                return defaultPlaceholder;
            }
            const trimmedUrl = url.trim();
            // Rejeitar URLs de placeholder externos que podem falhar
            if (trimmedUrl.includes('placeholder.com') || trimmedUrl.includes('via.placeholder')) {
                return defaultPlaceholder;
            }
            // Aceitar apenas URLs vf¡lidas: data URIs ou http/https
            if (trimmedUrl.startsWith('data:image/') ||
                trimmedUrl.startsWith('http://') ||
                trimmedUrl.startsWith('https://')) {
                return trimmedUrl;
            }
            return defaultPlaceholder;
        }

        const currentTitle = itemEl.querySelector('.item-title-input')?.value || '';
        // Para banner, pegar destination_url do input hidden que pode ter JSON
        let currentDestUrl = itemEl.querySelector('.item-destination-url-input')?.value || '';
        const currentPixKey = itemEl.querySelector('.item-pix-key-input')?.value || '';
        const currentPdfUrl = itemEl.querySelector('.item-pdf-url-input')?.value || '';
        const currentAspectRatio = itemEl.dataset.aspectRatio || 'tarja';

        // Para banner, verificar se tem dados originais do item (do servidor)
        let itemOriginalData = null;
        if (itemType === 'banner' && itemEl.dataset.originalData) {
            try {
                itemOriginalData = JSON.parse(itemEl.dataset.originalData);
            } catch (e) {
                console.log('Erro ao parsear originalData:', e);
            }
        }

        // Se tem dados originais e destination_url está vazio ou é placeholder, usar dados originais
        if (itemOriginalData && itemType === 'banner') {
            if (!currentDestUrl || currentDestUrl === '#' || currentDestUrl.includes('placeholder')) {
                currentDestUrl = itemOriginalData.destination_url || '';
            }
        }
        // Se destination_url for JSON ou contiver imagem, limpar para não poluir o input
        if (itemType === 'banner') {
            window.currentCarouselItemId = null;
            const rawOpenDest = currentDestUrl;
            if (rawOpenDest.trim().startsWith('[')) {
                currentDestUrl = '';
            } else {
                const openParts = parseBannerDestination(rawOpenDest);
                currentDestUrl = rawOpenDest.trim().startsWith('{')
                    ? openParts.primary_url
                    : (() => {
                        const parts = String(rawOpenDest).split(',').map(p => p.trim()).filter(Boolean);
                        const filtered = parts.filter(p => !p.includes('imagedelivery.net'));
                        return (filtered[0] || parts[0] || '').trim();
                    })();
            }
        }

        // Verificar se f© carrossel pela classe ou pelo destination_url
        const isCarouselItem = itemEl.classList.contains('banner-carousel') ||
            (itemType === 'banner' && currentDestUrl && (currentDestUrl.startsWith('[') || currentDestUrl === '[]'));
        const rawImageUrl = itemEl.querySelector('.item-image-url-input')?.value || '';
        let currentImageUrl = sanitizeImageUrl(rawImageUrl);

        // Se não tem image_url e tem dados originais, usar dados originais
        if (itemOriginalData && itemType === 'banner' && (!currentImageUrl || currentImageUrl.includes('placeholder'))) {
            currentImageUrl = sanitizeImageUrl(itemOriginalData.image_url || '');
        }

        console.log('Abrindo modal para item:', {
            itemId: itemEl.dataset.id,
            itemType: itemType,
            currentDestUrl: currentDestUrl,
            currentImageUrl: currentImageUrl,
            isCarouselItem: isCarouselItem,
            itemOriginalData: itemOriginalData
        });

        switch (itemType) {
            case 'link':
                // Link personalizado - com upload de logo
                const currentLinkImageUrl = itemEl.querySelector('.item-image-url-input')?.value || '';
                const currentLinkIconClass = itemEl.querySelector('.item-icon-picker i')?.className || 'fas fa-link';
                const logoPreviewStyleModal = (currentLinkImageUrl && currentLinkImageUrl.trim() && !currentLinkImageUrl.includes('placeholder')) ? 'display: block;' : 'display: none;';
                const currentLogoSize = itemEl.dataset.logoSize ? parseInt(itemEl.dataset.logoSize) : (itemEl.querySelector('.item-logo-size-input')?.value || 24);
                const logoPreviewSizeModal = Math.min(currentLogoSize, 100);

                // Buscar logo_fit_mode do item original ou do dataset
                let currentLogoFitMode = 'contain'; // Padrão: completo, sem corte
                if (window.currentProfileData && window.currentProfileData.items) {
                    const originalItem = window.currentProfileData.items.find(i => String(i.id) === String(itemId));
                    if (originalItem && originalItem.logo_fit_mode) {
                        currentLogoFitMode = originalItem.logo_fit_mode;
                    }
                }
                // Tentar pegar do dataset ou input hidden
                const logoFitModeInput = itemEl.querySelector('.item-logo-fit-mode-input');
                if (logoFitModeInput && logoFitModeInput.value) {
                    currentLogoFitMode = logoFitModeInput.value;
                }

                formHTML = `
                <div class="input-group">
                    <label>Logo (PNG ou JPG)</label>
                    <div class="logo-upload-area" style="margin-bottom: 15px; position: relative; border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: var(--card-background-color, #1C1C21);">
                        <input type="file" class="item-logo-file-input" accept="image/png,image/jpeg,image/jpg" style="display: none;">
                        <img src="${currentLinkImageUrl || ''}" class="item-logo-upload-preview" style="max-width: ${logoPreviewSizeModal}px; max-height: ${logoPreviewSizeModal}px; width: ${logoPreviewSizeModal}px; height: ${logoPreviewSizeModal}px; object-fit: contain; margin-bottom: 10px; border-radius: 8px; ${logoPreviewStyleModal}">
                        <div class="logo-upload-text" style="${!currentLinkImageUrl || currentLinkImageUrl.includes('placeholder') ? '' : 'display: none;'}">
                            <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--dourado-principal, #FFC700); margin-bottom: 10px;"></i>
                            <p style="margin: 5px 0; color: var(--text, #ECECEC);">Clique para fazer upload</p>
                            <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">PNG ou JPG (máx. 5MB)</span>
                        </div>
                        <button type="button" class="remove-logo-btn" style="display: ${currentLinkImageUrl && !currentLinkImageUrl.includes('placeholder') ? 'block' : 'none'}; margin-top: 10px; padding: 5px 15px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-trash"></i> Remover Logo
                        </button>
                        <div class="upload-loader" style="display: none;"></div>
                    </div>
                    <input type="hidden" class="item-image-url-input" id="edit-link-image-url" value="${currentLinkImageUrl || ''}">
                </div>
                ${currentLinkImageUrl && !currentLinkImageUrl.includes('placeholder') ? `
                <div class="input-group">
                    <label>Tamanho da Logo (em pixels)</label>
                    <div class="range-slider" style="margin-bottom: 15px;">
                        <div class="range-slider-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <label style="margin: 0; color: var(--text, #ECECEC);">Tamanho: <span id="edit-logo-size-value-${itemId}">${currentLogoSize}</span>px</label>
                            <input type="number" class="item-logo-size-input" id="edit-logo-size-input-${itemId}" value="${currentLogoSize}" min="20" max="600" step="1" style="width: 80px; padding: 5px 10px; border-radius: 4px; border: 1px solid var(--border-color, #2C2C2F); background: var(--card-background-color, #1C1C21); color: var(--text, #ECECEC); text-align: center;">
                        </div>
                        <input type="range" class="item-logo-size-slider" id="edit-logo-size-slider-${itemId}" value="${currentLogoSize}" min="20" max="600" step="5" style="width: 100%;">
                        <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.75rem; color: var(--text-dark, #A1A1A1);">
                            <span>20px</span>
                            <span>600px</span>
                        </div>
                    </div>
                </div>
                <div class="input-group">
                    <label>Ajuste da Logo</label>
                    <div class="segmented-control" style="display: flex; gap: 8px; background: var(--card-background-color, #1C1C21); padding: 4px; border-radius: 8px; border: 1px solid var(--border-color, #2C2C2F);">
                        <input type="radio" id="edit-logo-fit-contain-${itemId}" name="edit-logo-fit-mode-${itemId}" value="contain" ${(!currentLogoFitMode || currentLogoFitMode === 'contain') ? 'checked' : ''} style="display: none;">
                        <label for="edit-logo-fit-contain-${itemId}" style="flex: 1; padding: 8px 12px; text-align: center; border-radius: 6px; cursor: pointer; background: ${(!currentLogoFitMode || currentLogoFitMode === 'contain') ? 'var(--dourado-principal, #FFC700)' : 'transparent'}; color: ${(!currentLogoFitMode || currentLogoFitMode === 'contain') ? '#000' : 'var(--text, #ECECEC)'}; font-size: 0.85rem; font-weight: 600; transition: all 0.2s;">
                            <i class="fas fa-expand" style="margin-right: 5px;"></i> Automático
                        </label>
                        <input type="radio" id="edit-logo-fit-cover-${itemId}" name="edit-logo-fit-mode-${itemId}" value="cover" ${(currentLogoFitMode === 'cover') ? 'checked' : ''} style="display: none;">
                        <label for="edit-logo-fit-cover-${itemId}" style="flex: 1; padding: 8px 12px; text-align: center; border-radius: 6px; cursor: pointer; background: ${(currentLogoFitMode === 'cover') ? 'var(--dourado-principal, #FFC700)' : 'transparent'}; color: ${(currentLogoFitMode === 'cover') ? '#000' : 'var(--text, #ECECEC)'}; font-size: 0.85rem; font-weight: 600; transition: all 0.2s;">
                            <i class="fas fa-crop" style="margin-right: 5px;"></i> Com Corte
                        </label>
                    </div>
                    <input type="hidden" class="item-logo-fit-mode-input" id="edit-logo-fit-mode-input-${itemId}" value="${currentLogoFitMode || 'contain'}">
                </div>
                ` : ''}
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título do Link Personalizado">
                </div>
                <div class="input-group">
                    <label>URL de Destino</label>
                    <input type="text" id="edit-dest-url" value="${currentDestUrl}" placeholder="https://exemplo.com">
                </div>
                <div class="input-group">
                    <label>Ícone (opcional - usado se não houver logo)</label>
                    <div class="item-icon-picker" style="font-size: 2rem; cursor: pointer; color: var(--dourado-principal, #FFC700); width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border: 2px solid var(--border-color, #2C2C2F); border-radius: 8px; margin: 10px 0;" title="Clique para alterar ícone">
                        <i class="${currentLinkIconClass}"></i>
                    </div>
                </div>
            `;
                break;
            case 'telegram':
            case 'facebook':
            case 'instagram':
            case 'pinterest':
            case 'reddit':
            case 'tiktok':
            case 'twitch':
            case 'twitter':
            case 'spotify':
            case 'linkedin':
            case 'portfolio':
            case 'youtube':
                formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título do Link">
                </div>
                <div class="input-group">
                    <label>URL de Destino</label>
                    <input type="text" id="edit-dest-url" value="${currentDestUrl}" placeholder="https://exemplo.com">
                </div>
            `;
                break;
            case 'banner':
                // Capturar nome e mensagem atuais do banner
                const listBannerNameInput = itemEl.querySelector('.item-banner-name-input');
                const listWhatsappHidden = itemEl.querySelector('.item-title-input-hidden');
                const currentBannerName = listBannerNameInput?.value || currentTitle || '';
                const currentWhatsappMsg = listWhatsappHidden?.value || '';

                formHTML = `
                <div class="input-group">
                    <label>Nome do Banner</label>
                    <input type="text" id="edit-banner-name" value="${currentBannerName}" placeholder="Ex: Banner WhatsApp, Banner Instagram">
                </div>
                <div class="input-group">
                    <label>Proporção do Banner</label>
                    <div class="aspect-ratio-control">
                        <input type="radio" name="aspect-ratio-selector" id="ratio-auto" value="auto" ${currentAspectRatio === 'auto' ? 'checked' : ''}>
                        <label for="ratio-auto">Automática</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-tarja" value="tarja" ${currentAspectRatio === 'tarja' ? 'checked' : ''}>
                        <label for="ratio-tarja">Tarja</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-2-1" value="2:1" ${currentAspectRatio === '2:1' ? 'checked' : ''}>
                        <label for="ratio-2-1">2:1</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-4-3" value="4:3" ${currentAspectRatio === '4:3' ? 'checked' : ''}>
                        <label for="ratio-4-3">4:3</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-1-1" value="1:1" ${currentAspectRatio === '1:1' ? 'checked' : ''}>
                        <label for="ratio-1-1">1:1</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-3-4" value="3:4" ${currentAspectRatio === '3:4' ? 'checked' : ''}>
                        <label for="ratio-3-4">3:4</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-10-16" value="10:16" ${currentAspectRatio === '10:16' ? 'checked' : ''}>
                        <label for="ratio-10-16">10:16</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-16-9" value="16:9" ${currentAspectRatio === '16:9' ? 'checked' : ''}>
                        <label for="ratio-16-9">16:9</label>
                    </div>
                </div>
                <div class="input-group">
                    <label>Imagem do Banner</label>
                    <div class="image-upload-area" data-item-type="banner" data-item-id="${itemId}">
                        <input type="file" class="item-file-input" accept="image/*" data-item-type="banner" data-item-id="${itemId}">
                        <div class="image-upload-text">
                            <p><i class="fas fa-cloud-upload-alt"></i> Trocar Imagem</p>
                            <span>Clique para fazer upload ou arraste uma imagem aqui</span>
                        </div>
                        <img id="edit-banner-preview" class="banner-preview" src="${currentImageUrl || ''}" style="max-width: 100%; max-height: 200px; margin-top: 10px; display: ${currentImageUrl && !currentImageUrl.includes('placeholder') ? 'block' : 'none'}; border-radius: 8px;">
                        <div class="upload-loader"></div>
                    </div>
                </div>
                <div class="input-group">
                    <label>URL ao clicar na imagem (opcional)</label>
                    <input type="text" id="edit-dest-url" value="${(currentDestUrl && !currentDestUrl.startsWith('[') ? currentDestUrl : '').replace(/"/g, '&quot;')}" placeholder="https://link.do.banner">
                </div>
                <div class="input-group">
                    <label>Mensagem WhatsApp (opcional)</label>
                    <small style="display:block;color:#a1a1a1;font-size:0.8rem;margin:0 0 8px;">Se a URL acima for WhatsApp (wa.me), esta mensagem vai pré-preenchida no chat.</small>
                    <input type="text" id="edit-banner-title" value="${(currentWhatsappMsg || '').replace(/"/g, '&quot;')}" placeholder="Ex: Olá! Gostaria de saber mais sobre seus produtos.">
                </div>
                ${bannerUrlModelsHtml()}
                <input type="hidden" id="edit-image-url" value="${currentImageUrl || ''}">
            `;
                break;
            case 'carousel':
                // ===== NOVO CARROSSEL - MODAL LIMPO =====
                let carouselImages = [];

                // Obter imagens do input hidden do item
                const itemCarouselJsonInput = itemEl.querySelector('.carousel-images-json-new');
                if (itemCarouselJsonInput && itemCarouselJsonInput.value && itemCarouselJsonInput.value.trim()) {
                    try {
                        const parsed = JSON.parse(itemCarouselJsonInput.value);
                        if (Array.isArray(parsed)) {
                            carouselImages = parsed.filter(img => {
                                const url = typeof img === 'string' ? img : (img.image_url || img);
                                return url && !url.includes('placeholder') && !url.startsWith('data:image/svg');
                            });
                        }
                    } catch (e) {
                        console.warn('Erro ao parsear imagens:', e);
                    }
                } else if (currentDestUrl && currentDestUrl.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(currentDestUrl);
                        if (Array.isArray(parsed)) {
                            carouselImages = parsed.filter(img => {
                                const url = typeof img === 'string' ? img : (img.image_url || img);
                                return url && !url.includes('placeholder') && !url.startsWith('data:image/svg');
                            });
                        }
                    } catch (e) { }
                }

                const carouselAspectRatio = itemEl.dataset.aspectRatio || 'auto';
                const firstImage = carouselImages.length > 0 ? (typeof carouselImages[0] === 'string' ? carouselImages[0] : carouselImages[0].image_url || carouselImages[0]) : '';

                formHTML = `
                <div class="input-group">
                    <label>Proporção de Aspecto</label>
                    <div class="aspect-ratio-selector" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px;">
                        <input type="radio" name="aspect-ratio-selector" id="ratio-auto-carousel-${itemId}" value="auto" ${carouselAspectRatio === 'auto' ? 'checked' : ''}>
                        <label for="ratio-auto-carousel-${itemId}">Automática</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-tarja-carousel-${itemId}" value="tarja" ${carouselAspectRatio === 'tarja' ? 'checked' : ''}>
                        <label for="ratio-tarja-carousel-${itemId}">Tarja</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-2-1-carousel-${itemId}" value="2:1" ${carouselAspectRatio === '2:1' ? 'checked' : ''}>
                        <label for="ratio-2-1-carousel-${itemId}">2:1</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-4-3-carousel-${itemId}" value="4:3" ${carouselAspectRatio === '4:3' ? 'checked' : ''}>
                        <label for="ratio-4-3-carousel-${itemId}">4:3</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-1-1-carousel-${itemId}" value="1:1" ${carouselAspectRatio === '1:1' ? 'checked' : ''}>
                        <label for="ratio-1-1-carousel-${itemId}">1:1</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-3-4-carousel-${itemId}" value="3:4" ${carouselAspectRatio === '3:4' ? 'checked' : ''}>
                        <label for="ratio-3-4-carousel-${itemId}">3:4</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-10-16-carousel-${itemId}" value="10:16" ${carouselAspectRatio === '10:16' ? 'checked' : ''}>
                        <label for="ratio-10-16-carousel-${itemId}">10:16</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-16-9-carousel-${itemId}" value="16:9" ${carouselAspectRatio === '16:9' ? 'checked' : ''}>
                        <label for="ratio-16-9-carousel-${itemId}">16:9</label>
                    </div>
                </div>
                <div class="input-group">
                    <label>Imagens do Carrossel</label>
                    <div id="carousel-images-list-new-${itemId}" class="carousel-images-list-new" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-bottom: 15px; min-height: 50px;">
                        ${carouselImages.length === 0 ? '<p style="color: #999; text-align: center; padding: 20px; font-size: 0.9rem; grid-column: 1/-1;">Nenhuma imagem adicionada ainda.</p>' : ''}
                    </div>
                    <label class="carousel-upload-label-new" for="carousel-file-new-${itemId}" style="position: relative; border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: var(--card-background-color, #1C1C21); display: block; margin-top: 10px;">
                        <input type="file" id="carousel-file-new-${itemId}" class="carousel-file-input-new" accept="image/png,image/jpeg,image/jpg" data-item-id="${itemId}" multiple style="position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; clip: rect(0,0,0,0); pointer-events: none;">
                        <div style="pointer-events: none;">
                            <i class="fas fa-plus-circle" style="font-size: 2rem; color: var(--dourado-principal, #FFC700); margin-bottom: 10px;"></i>
                            <p style="margin: 5px 0; color: var(--text, #ECECEC);">Clique para adicionar imagens</p>
                            <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">PNG, JPG ou JPEG (máx. 5MB por imagem)</span>
                        </div>
                        <div class="carousel-upload-loader-new" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 2000; width: 40px; height: 40px; border: 5px solid rgba(255,255,255,0.3); border-top-color: var(--dourado-principal, #FFC700); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    </label>
                    <input type="hidden" class="carousel-images-json-new" data-item-id="${itemId}" value='${JSON.stringify(carouselImages)}'>
                    <input type="hidden" id="edit-image-url" value="${firstImage}">
                    <small style="color: #999; display: block; margin-top: 10px;"><i class="fas fa-info-circle"></i> As imagens passam automaticamente a cada 3 segundos</small>
                </div>
            `;
                break;
            case 'whatsapp':
                formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${currentTitle}" placeholder="Ex: Chamar no WhatsApp">
                </div>
                <div class="input-group">
                    <label>Telefone (com código do país)</label>
                    <input type="tel" id="edit-dest-url" value="${currentDestUrl}" placeholder="5521999999999">
                </div>
            `;
                break;
            case 'email':
                formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${currentTitle}" placeholder="Ex: Enviar Email">
                </div>
                <div class="input-group">
                    <label>Endereço de Email</label>
                    <input type="email" id="edit-dest-url" value="${currentDestUrl}" placeholder="contato@exemplo.com">
                </div>
            `;
                break;
            case 'pix':
                formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título (ex: PIX Celular)">
                </div>
                <div class="input-group">
                    <label>Nome do Recebedor</label>
                    <input type="text" id="edit-recipient-name" value="${itemEl.querySelector('.item-recipient-name-input')?.value || ''}" placeholder="Seu nome completo">
                </div>
                <div class="input-group">
                    <label>Chave PIX (Aleatf³ria, CPF/CNPJ, E-mail ou Telefone)</label>
                    <div class="pix-key-examples">
                        <small><strong>?ož Celular:</strong> Apenas nfºmeros (ex: +5511999999999)</small>
                        <small><strong>?o§ Email:</strong> seuemail@exemplo.com</small>
                        <small><strong> CPF:</strong> Apenas nfºmeros (ex: 12345678901)</small>
                        <small><strong>?~ Chave Aleatf³ria:</strong> Copie e cole (ex: 12345678-1234-...)</small>
                    </div>
                    <input type="text" id="edit-pix-key" value="${currentPixKey}" placeholder="Ex: +5511999999999 (celular) ou seuemail@exemplo.com">
                </div>
                <div class="input-group">
                    <label>Valor (opcional)</label>
                    <input type="number" id="edit-pix-amount" value="${itemEl.querySelector('.item-pix-amount-input')?.value || ''}" placeholder="Valor em reais" step="0.01">
                </div>
                <div class="input-group">
                    <label>Descrif§f£o (opcional)</label>
                    <input type="text" id="edit-pix-description" value="${itemEl.querySelector('.item-pix-description-input')?.value || ''}" placeholder="Descrif§f£o do pagamento">
                </div>
            `;
                break;
            case 'pix_qrcode':
                formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título (ex: Faça um PIX)">
                </div>
                <div class="input-group">
                    <label>Nome do Recebedor</label>
                    <input type="text" id="edit-recipient-name" value="${itemEl.querySelector('.item-recipient-name-input')?.value || ''}" placeholder="Seu nome completo">
                </div>
                <div class="input-group">
                    <label>Chave PIX (Aleatf³ria, CPF/CNPJ, E-mail ou Telefone)</label>
                    <div class="pix-key-examples">
                        <small><strong>?ož Celular:</strong> Apenas nfºmeros (ex: +5511999999999)</small>
                        <small><strong>?o§ Email:</strong> seuemail@exemplo.com</small>
                        <small><strong> CPF:</strong> Apenas nfºmeros (ex: 12345678901)</small>
                        <small><strong>?~ Chave Aleatf³ria:</strong> Copie e cole (ex: 12345678-1234-...)</small>
                    </div>
                    <input type="text" id="edit-pix-key" value="${currentPixKey}" placeholder="Ex: +5511999999999 (celular) ou seuemail@exemplo.com">
                </div>
                <div class="input-group">
                    <label>Valor (opcional)</label>
                    <input type="number" id="edit-pix-amount" value="${itemEl.querySelector('.item-pix-amount-input')?.value || ''}" placeholder="Valor em reais" step="0.01">
                </div>
                <div class="input-group">
                    <label>Descrif§f£o (opcional)</label>
                    <input type="text" id="edit-pix-description" value="${itemEl.querySelector('.item-pix-description-input')?.value || ''}" placeholder="Descrif§f£o do pagamento">
                </div>
            `;
                break;
            case 'wifi': {
                const escWifiModal = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
                const wFmt = itemEl.querySelector('.wifi-display-format-input:checked')?.value || 'button';
                const wSsid = itemEl.querySelector('.wifi-ssid-input')?.value || '';
                const wPass = itemEl.querySelector('.wifi-password-input')?.value || '';
                const wSec = itemEl.querySelector('.wifi-security-input')?.value || 'WPA';
                const wHidden = !!itemEl.querySelector('.wifi-hidden-input')?.checked;
                const wBanner = itemEl.querySelector('.wifi-banner-url-input')?.value || '';
                const wLogo = itemEl.querySelector('.wifi-logo-url-input')?.value || '';
                const wLogoSize = itemEl.querySelector('.wifi-logo-size-input')?.value || '48';
                let wifiCfgEdit = {};
                const profileWifiItem = (window.currentProfileData?.items || []).find(function (it) {
                    return String(it.id) === String(itemId);
                });
                if (profileWifiItem?.destination_url && String(profileWifiItem.destination_url).trim().startsWith('{')) {
                    try { wifiCfgEdit = JSON.parse(profileWifiItem.destination_url); } catch (e) { wifiCfgEdit = {}; }
                }
                formHTML = `
                <div class="input-group">
                    <label>Título no cartão</label>
                    <input type="text" id="edit-title" value="${escWifiModal(currentTitle)}" placeholder="Texto do botão (ex: Conectar ao Wi-Fi)">
                </div>
                <div class="input-group">
                    <label>Formato</label>
                    <div style="display: flex; gap: 15px; margin-top: 10px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="radio" class="wifi-display-format-input" name="wifi-modal-df-${itemId}" value="button" ${wFmt === 'button' ? 'checked' : ''}>
                            <span>Botão</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="radio" class="wifi-display-format-input" name="wifi-modal-df-${itemId}" value="banner" ${wFmt === 'banner' ? 'checked' : ''}>
                            <span>Banner</span>
                        </label>
                    </div>
                </div>
                <div class="input-group">
                    <label>Nome da rede Wi-Fi (SSID)</label>
                    <small style="display:block;color:#a1a1a1;font-size:0.8rem;margin:4px 0 8px;line-height:1.35;">Obrigatório. ? o nome exato que aparece na lista de redes do celular (usado no QR Code).</small>
                    <input type="text" id="edit-wifi-ssid" value="${escWifiModal(wSsid)}" placeholder="Ex: MinhaLoja_WiFi ou Visitantes_5G" maxlength="32">
                </div>
                <div class="input-group">
                    <label>Segurança</label>
                    <select id="edit-wifi-security" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color,#2C2C2F);background:var(--card-background-color,#1C1C21);color:var(--text,#ECECEC);">
                        <option value="WPA" ${wSec === 'WPA' || wSec === 'WPA2' || wSec === 'WPA3' ? 'selected' : ''}>WPA/WPA2/WPA3</option>
                        <option value="WEP" ${wSec === 'WEP' ? 'selected' : ''}>WEP</option>
                        <option value="nopass" ${wSec === 'nopass' || wSec === 'NONE' ? 'selected' : ''}>Rede aberta (sem senha)</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Senha (opcional)</label>
                    <input type="text" id="edit-wifi-password" value="${escWifiModal(wPass)}" placeholder="Deixe vazio se for rede aberta" autocomplete="off">
                </div>
                <div class="input-group">
                    <label style="display:flex;align-items:center;gap:10px;">
                        <input type="checkbox" id="edit-wifi-hidden" ${wHidden ? 'checked' : ''}>
                        Rede oculta (SSID não transmitido)
                    </label>
                </div>
                <div class="wifi-modal-logo-section" style="display: ${wFmt === 'banner' ? 'none' : 'block'};">
                    <div class="input-group">
                        <label>Tamanho da logo (px)</label>
                        <input type="number" id="edit-wifi-logo-size" value="${escWifiModal(wLogoSize)}" min="20" max="600" step="1" style="width: 120px;">
                    </div>
                    <input type="hidden" id="edit-wifi-logo-url" value="${escWifiModal(wLogo)}">
                    <p style="color:#888;font-size:0.85rem;">Upload de logo/imagem: use a área na lista do módulo ao lado.</p>
                </div>
                <div class="wifi-modal-banner-section" style="display: ${wFmt === 'banner' ? 'block' : 'none'};">
                    ${wifiBannerUploadBlockHtml(itemId, wBanner)}
                </div>
            `;
                break;
            }
            case 'pdf':
                formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título (ex: Baixar Catálogo)">
                </div>
                <div class="input-group">
                    <label>Arquivo PDF</label>
                    <div class="image-upload-area pdf-upload-area">
                        <input type="file" class="item-file-input" accept=".pdf">
                        <div class="image-upload-text">
                            <p>${currentPdfUrl && currentPdfUrl !== '#' ? 'Trocar Arquivo' : 'Selecionar Arquivo PDF'}</p>
                            <span>Clique para enviar (max 10MB)</span>
                        </div>
                        <div class="upload-loader"></div>
                    </div>
                </div>
                <input type="hidden" id="edit-pdf-url" value="${currentPdfUrl}">
            `;
                break;
            case 'instagram_embed':
                formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título do Conteúdo">
                </div>
                <div class="input-group">
                    <label>URL do Perfil do Instagram</label>
                    <input type="text" id="edit-dest-url" value="${currentDestUrl}" placeholder="https://www.instagram.com/p/... ou https://www.instagram.com/seu_usuario/">
                </div>
            `;
                break;
            case 'youtube_embed':
                formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título do Conteúdo">
                </div>
                <div class="input-group">
                    <label>URL do Vídeo do YouTube</label>
                    <input type="text" id="edit-dest-url" value="${currentDestUrl}" placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/...">
                </div>
            `;
                break;
            case 'tiktok_embed':
                formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título do Perfil">
                </div>
                <div class="input-group">
                    <label>URL do Perfil do TikTok</label>
                    <input type="text" id="edit-dest-url" value="${currentDestUrl}" placeholder="https://www.tiktok.com/@seu_usuario">
                </div>
            `;
                break;
            case 'spotify_embed':
                formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título do Perfil">
                </div>
                <div class="input-group">
                    <label>URL do Perfil do Spotify</label>
                    <input type="text" id="edit-dest-url" value="${currentDestUrl}" placeholder="https://open.spotify.com/user/seu_usuario ou https://open.spotify.com/artist/seu_artista">
                </div>
            `;
                break;
            case 'linkedin_embed':
                formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título do Perfil">
                </div>
                <div class="input-group">
                    <label>URL do Perfil do LinkedIn</label>
                    <input type="text" id="edit-dest-url" value="${currentDestUrl}" placeholder="https://www.linkedin.com/in/seu_perfil">
                </div>
            `;
                break;
            case 'pinterest_embed':
                formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título do Perfil">
                </div>
                <div class="input-group">
                    <label>URL do Perfil do Pinterest</label>
                    <input type="text" id="edit-dest-url" value="${currentDestUrl}" placeholder="https://www.pinterest.com/seu_usuario ou https://br.pinterest.com/seu_usuario">
                </div>
            `;
                break;
            case 'banner':
                // Banner simples (SEM carrossel) - uma imagem, nome e mensagem opcional
                formHTML = `
                <div class="input-group">
                    <label>Nome do Banner</label>
                    <input type="text" id="edit-banner-name" value="${currentBannerName || ''}" placeholder="Ex: Banner WhatsApp, Banner Instagram">
                    <small style="color: #999; display: block; margin-top: 5px;">Este nome aparece na lista.</small>
                </div>
                <div class="input-group">
                    <label>Proporção do Banner</label>
                    <div class="aspect-ratio-control">
                        <input type="radio" name="aspect-ratio-selector" id="ratio-auto" value="auto" ${currentAspectRatio === 'auto' ? 'checked' : ''}>
                        <label for="ratio-auto">Automática</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-tarja" value="tarja" ${currentAspectRatio === 'tarja' ? 'checked' : ''}>
                        <label for="ratio-tarja">Tarja</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-2-1" value="2:1" ${currentAspectRatio === '2:1' ? 'checked' : ''}>
                        <label for="ratio-2-1">2:1</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-4-3" value="4:3" ${currentAspectRatio === '4:3' ? 'checked' : ''}>
                        <label for="ratio-4-3">4:3</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-1-1" value="1:1" ${currentAspectRatio === '1:1' ? 'checked' : ''}>
                        <label for="ratio-1-1">1:1</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-3-4" value="3:4" ${currentAspectRatio === '3:4' ? 'checked' : ''}>
                        <label for="ratio-3-4">3:4</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-10-16" value="10:16" ${currentAspectRatio === '10:16' ? 'checked' : ''}>
                        <label for="ratio-10-16">10:16</label>
                        <input type="radio" name="aspect-ratio-selector" id="ratio-16-9" value="16:9" ${currentAspectRatio === '16:9' ? 'checked' : ''}>
                        <label for="ratio-16-9">16:9</label>
                    </div>
                </div>
                <div class="input-group">
                    <label>Imagem do Banner</label>
                    <div class="image-upload-area" data-item-type="banner" data-item-id="${itemId}">
                        <input type="file" class="item-file-input" accept="image/*" data-item-type="banner" data-item-id="${itemId}">
                        <div class="image-upload-text">
                            <p><i class="fas fa-cloud-upload-alt"></i> Clique para fazer upload</p>
                            <span>ou arraste uma imagem aqui</span>
                        </div>
                        <img id="edit-banner-preview" class="banner-preview" src="${currentImageUrl || ''}" style="max-width: 100%; max-height: 200px; margin-top: 10px; display: ${currentImageUrl && !currentImageUrl.includes('placeholder') ? 'block' : 'none'};">
                        <div class="upload-loader"></div>
                    </div>
                </div>
                <div class="input-group">
                    <label>URL de Destino (opcional)</label>
                    <input type="text" id="edit-dest-url" value="${currentDestUrl && !currentDestUrl.startsWith('[') ? currentDestUrl : ''}" placeholder="https://link.do.banner">
                    <small style="color: #999; display: block; margin-top: 5px;">Para onde o banner leva quando clicado</small>
                </div>
                <div class="input-group">
                    <label>Mensagem WhatsApp (opcional)</label>
                    <input type="text" id="edit-banner-title" value="${currentBannerTitle || ''}" placeholder="Ex: Olá! Gostaria de saber mais sobre seus produtos.">
                    <small style="color: #999; display: block; margin-top: 5px;">Usada apenas quando a URL acima for WhatsApp.</small>
                </div>
                ${bannerUrlModelsHtml()}
                <input type="hidden" id="edit-image-url" value="${currentImageUrl || ''}">
                <input type="hidden" id="edit-dest-url-hidden" value="">
            `;
                break;
            case 'pdf_embed':
                formHTML = `
                <div class="input-group">
                    <label>Título</label>
                    <input type="text" id="edit-title" value="${currentTitle}" placeholder="Título do Documento">
                </div>
                <div class="input-group">
                    <label>Arquivo PDF</label>
                    <div class="image-upload-area pdf-upload-area">
                        <input type="file" class="item-file-input" accept=".pdf">
                        <div class="image-upload-text">
                            <p>${currentPdfUrl && currentPdfUrl !== '#' ? 'Trocar Arquivo' : 'Selecionar Arquivo PDF'}</p>
                            <span>Clique para enviar (max 10MB)</span>
                        </div>
                        <div class="upload-loader"></div>
                    </div>
                </div>
                <input type="hidden" id="edit-pdf-url" value="${currentPdfUrl}">
            `;
                break;
            case 'location':
                (function () {
                    var locItem = (window.currentProfileData && window.currentProfileData.items) ? window.currentProfileData.items.find(function (i) { return String(i.id) === String(itemId); }) : null;
                    var locData = (locItem && locItem.location_data) || {};
                    var locAddr = (locData.address_formatted || locData.address || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                    var locLat = locData.latitude != null ? String(locData.latitude) : '';
                    var locLng = locData.longitude != null ? String(locData.longitude) : '';
                    var locTitle = (currentTitle || 'Localização').replace(/"/g, '&quot;');
                    formHTML = `
                <div class="input-group location-edit-panel" data-item-id="${itemId}">
                    <label>Título do botão</label>
                    <input type="text" id="edit-title" class="location-title-input" value="${locTitle}" placeholder="Ex: Onde me encontrar">
                </div>
                <div class="input-group">
                    <label>Endereço</label>
                    <div style="display:flex;gap:8px;margin-bottom:8px;">
                        <input type="text" id="location-address-input" class="location-address-input" value="${locAddr}" placeholder="Digite o endereço ou pesquise..." style="flex:1;">
                        <button type="button" class="location-search-btn" style="padding:10px 16px;border-radius:8px;background:var(--dourado-principal,#FFC700);color:#000;border:none;font-weight:600;cursor:pointer;white-space:nowrap;"><i class="fas fa-search"></i> Pesquisar</button>
                    </div>
                    <p class="location-formatted-display" style="font-size:0.9em;opacity:0.9;margin:0 0 8px 0;min-height:1.4em;"></p>
                    <input type="hidden" id="location-lat-input" class="location-lat-input" value="${locLat}">
                    <input type="hidden" id="location-lng-input" class="location-lng-input" value="${locLng}">
                </div>
                <div class="input-group">
                    <label>Mapa</label>
                    <div class="location-map-preview-edit" style="height:220px;border-radius:12px;overflow:hidden;background:rgba(0,0,0,0.3);position:relative;">
                        <div id="location-map-container-${itemId}" class="location-map-container" style="width:100%;height:100%;min-height:220px;"></div>
                    </div>
                    <p class="location-map-hint" style="font-size:0.75rem;opacity:0.85;margin-top:6px;"><i class="fas fa-hand-paper"></i> Arraste o marcador ou clique no mapa para ajustar o ponto exato.</p>
                    <p style="font-size:0.75rem;opacity:0.7;margin-top:4px;">No cartão, o visitante poderá abrir no Google Maps ou no Waze.</p>
                </div>
            `;
                })();
                break;
            case 'digital_form':
                // Buscar dados do formulário se existirem
                let formData = {};
                if (window.currentProfileData && window.currentProfileData.items) {
                    const itemData = window.currentProfileData.items.find(i => String(i.id) === String(itemId));
                    if (itemData && itemData.digital_form_data) {
                        formData = itemData.digital_form_data;
                    } else if (itemData && itemData.form_data) {
                        formData = itemData.form_data;
                    }
                }

                const currentFormTitle = formData.form_title || currentTitle || 'Formulário King';
                const currentFormLogo = formData.form_logo_url || '';
                const currentFormDescription = formData.form_description || '';
                const currentFormWhatsapp = formData.whatsapp_number || '';
                const currentDisplayFormat = formData.display_format || 'button';
                const currentBannerImage = formData.banner_image_url || itemEl.querySelector('.item-image-url-input')?.value || '';
                const currentHeaderImage = formData.header_image_url || '';
                const currentBackgroundImage = formData.background_image_url || '';
                const currentBackgroundOpacity = formData.background_opacity !== undefined ? formData.background_opacity : 1.0;
                const currentTheme = formData.theme || 'light';
                const currentPrimaryColor = formData.primary_color || '#4A90E2';
                const currentTextColor = formData.text_color || '#333333';
                const currentFormFields = formData.form_fields || [];

                formHTML = `
                <!-- Sistema de Abas -->
                <div class="form-tabs-container" style="margin-bottom: 20px; border-bottom: 2px solid var(--border-color, #2C2C2F);">
                    <div class="form-tabs" style="display: flex; gap: 0;">
                        <button type="button" class="form-tab-btn active" data-tab="config" style="flex: 1; padding: 12px 20px; background: transparent; border: none; border-bottom: 3px solid var(--dourado-principal, #FFC700); color: var(--dourado-principal, #FFC700); cursor: pointer; font-weight: 600; transition: all 0.3s;">
                            <i class="fas fa-cog"></i> Configurações
                        </button>
                        <button type="button" class="form-tab-btn" data-tab="questions" style="flex: 1; padding: 12px 20px; background: transparent; border: none; border-bottom: 3px solid transparent; color: var(--text-dark, #A1A1A1); cursor: pointer; font-weight: 600; transition: all 0.3s;">
                            <i class="fas fa-question-circle"></i> Perguntas
                        </button>
                        <button type="button" class="form-tab-btn" data-tab="responses" style="flex: 1; padding: 12px 20px; background: transparent; border: none; border-bottom: 3px solid transparent; color: var(--text-dark, #A1A1A1); cursor: pointer; font-weight: 600; transition: all 0.3s;">
                            <i class="fas fa-chart-bar"></i> Respostas
                        </button>
                    </div>
                </div>
                
                <!-- Aba: Configurações -->
                <div class="form-tab-content" data-tab-content="config" style="display: block;">
                <div class="input-group">
                    <label>Título do Módulo</label>
                    <input type="text" id="edit-digital-form-title" value="${currentTitle || 'Formulário King'}" placeholder="Formulário King">
                </div>
                <div class="input-group">
                    <label>Formato de Exibição</label>
                    <div style="display: flex; gap: 15px; margin-top: 10px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="radio" name="digital-form-display-format" value="button" ${currentDisplayFormat === 'button' ? 'checked' : ''}>
                            <span>Botão</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="radio" name="digital-form-display-format" value="banner" ${currentDisplayFormat === 'banner' ? 'checked' : ''}>
                            <span>Banner</span>
                        </label>
                    </div>
                </div>
                <div id="digital-form-banner-image-container" style="display: ${currentDisplayFormat === 'banner' ? 'block' : 'none'};">
                    <div class="input-group">
                        <label>Imagem do Banner</label>
                        <div class="image-upload-area form-banner-upload-area" style="margin-bottom: 15px; position: relative; border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: var(--card-background-color, #1C1C21);">
                            <input type="file" class="item-file-input form-banner-file-input" accept="image/*" style="display: none;">
                            <img src="${currentBannerImage || ''}" id="digital-form-banner-preview" class="banner-preview form-banner-preview" style="max-width: 100%; max-height: 200px; margin-bottom: 10px; ${currentBannerImage ? 'display: block;' : 'display: none;'}">
                            <div class="image-upload-text" style="${currentBannerImage ? 'display: none;' : ''}">
                                <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--dourado-principal, #FFC700); margin-bottom: 10px;"></i>
                                <p style="margin: 5px 0; color: var(--text, #ECECEC);">Clique para fazer upload do Banner</p>
                                <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">JPG, PNG (máx. 5MB)</span>
                            </div>
                            <button type="button" class="remove-banner-btn" style="display: ${currentBannerImage ? 'block' : 'none'}; margin-top: 10px; padding: 5px 15px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                <i class="fas fa-trash"></i> Remover Banner
                            </button>
                            <div class="upload-loader"></div>
                        </div>
                    </div>
                </div>
                <input type="hidden" id="edit-digital-form-banner-image" class="item-banner-image-url-input" value="${currentBannerImage}">
                <div class="input-group">
                    <label>Título do Formulário</label>
                    <input type="text" id="edit-form-title" value="${currentFormTitle}" placeholder="Ex: Formulário de Contato">
                </div>
                <div class="input-group">
                    <label>Logo do Formulário</label>
                    <div class="logo-upload-area form-logo-upload-area" style="margin-bottom: 15px; position: relative; border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: var(--card-background-color, #1C1C21);">
                        <input type="file" class="item-logo-file-input form-logo-file-input" accept="image/png,image/jpeg,image/jpg" style="display: none;">
                        <img src="${currentFormLogo || ''}" id="digital-form-logo-preview" class="item-logo-upload-preview form-logo-upload-preview" style="max-width: 150px; max-height: 150px; width: 150px; height: 150px; object-fit: contain; margin-bottom: 10px; border-radius: 8px; ${currentFormLogo ? 'display: block;' : 'display: none;'}">
                        <div class="logo-upload-text" style="${currentFormLogo ? 'display: none;' : ''}">
                            <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--dourado-principal, #FFC700); margin-bottom: 10px;"></i>
                            <p style="margin: 5px 0; color: var(--text, #ECECEC);">Clique para fazer upload</p>
                            <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">PNG ou JPG (máx. 5MB)</span>
                        </div>
                        <button type="button" class="remove-logo-btn" style="display: ${currentFormLogo ? 'block' : 'none'}; margin-top: 10px; padding: 5px 15px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-trash"></i> Remover Logo
                        </button>
                        <div class="upload-loader"></div>
                    </div>
                    <input type="hidden" id="edit-form-logo-url" class="item-form-logo-url-input" value="${currentFormLogo}">
                    <div class="input-group">
                        <label>Descrição do Formulário</label>
                        <textarea id="edit-form-description" rows="3" placeholder="Descreva o propósito do formulário...">${currentFormDescription}</textarea>
                    </div>
                    
                    <div class="input-group">
                        <label>Número do WhatsApp para Receber Respostas</label>
                        <input type="text" id="edit-digital-form-whatsapp" value="${currentFormWhatsapp}" placeholder="5511999999999 (com DDD e código do país)">
                        <small style="color: #999; display: block; margin-top: 5px;">As respostas do formulário serão enviadas para este WhatsApp</small>
                    </div>
                </div>
                
                <!-- Aba: Perguntas -->
                <div class="form-tab-content" data-tab-content="questions" style="display: none;">
                    <div style="margin-bottom: 20px;">
                        <button type="button" class="btn btn-primary add-question-btn" data-item-id="${itemId}" style="width: 100%; padding: 12px; background: var(--dourado-principal, #FFC700); color: #000; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            <i class="fas fa-plus"></i> Adicionar Pergunta
                        </button>
                    </div>
                    <div id="form-questions-container-${itemId}" class="form-questions-container" data-item-id="${itemId}">
                        <!-- Perguntas serão renderizadas aqui -->
                    </div>
                    <input type="hidden" id="edit-digital-form-fields" value='${JSON.stringify(currentFormFields)}'>
                </div>
                
                <!-- Aba: Respostas -->
                <div class="form-tab-content" data-tab-content="responses" style="display: none;">
                    <div id="form-responses-dashboard-${itemId}" class="form-responses-dashboard" data-item-id="${itemId}">
                        <div style="text-align: center; padding: 40px; color: var(--text-dark, #A1A1A1);">
                            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 15px;"></i>
                            <p>Carregando respostas...</p>
                        </div>
                    </div>
                </div>
                
                <!-- Botão para abrir página de edição completa -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--border-color, #2C2C2F);">
                    <button type="button" class="btn-edit-form-page" data-item-id="${itemId}" style="width: 100%; padding: 14px; background: var(--dourado-principal, #FFC700); color: #000; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <i class="fas fa-external-link-alt"></i>
                        <span>Abrir Página de Edição Completa</span>
                    </button>
                    <p style="text-align: center; color: var(--text-dark, #A1A1A1); font-size: 0.85rem; margin-top: 10px;">Para editar perguntas e visualizar respostas, abra a página de edição completa</p>
                </div>
            `;

                // Configurar sistema de abas e listeners
                setTimeout(() => {
                    const modalSelector = `#edit-item-modal[data-editing-id="${itemId}"]`;

                    // Sistema de abas
                    const tabButtons = document.querySelectorAll(`${modalSelector} .form-tab-btn`);
                    const tabContents = document.querySelectorAll(`${modalSelector} .form-tab-content`);

                    tabButtons.forEach(btn => {
                        btn.addEventListener('click', () => {
                            const targetTab = btn.dataset.tab;

                            // Remover active de todos os botões
                            tabButtons.forEach(b => {
                                b.classList.remove('active');
                                b.style.borderBottomColor = 'transparent';
                                b.style.color = 'var(--text-dark, #A1A1A1)';
                            });

                            // Adicionar active ao botão clicado
                            btn.classList.add('active');
                            btn.style.borderBottomColor = 'var(--dourado-principal, #FFC700)';
                            btn.style.color = 'var(--dourado-principal, #FFC700)';

                            // Esconder todos os conteúdos
                            tabContents.forEach(content => {
                                content.style.display = 'none';
                            });

                            // Mostrar conteúdo da aba selecionada
                            const targetContent = document.querySelector(`${modalSelector} .form-tab-content[data-tab-content="${targetTab}"]`);
                            if (targetContent) {
                                targetContent.style.display = 'block';

                                // Se for a aba de Respostas, carregar dados
                                if (targetTab === 'responses' && typeof window.loadFormResponses === 'function') {
                                    setTimeout(() => window.loadFormResponses(itemId), 100);
                                }

                                // Se for a aba de Perguntas, renderizar perguntas
                                if (targetTab === 'questions' && typeof window.renderFormQuestions === 'function') {
                                    setTimeout(() => {
                                        const fieldsInput = document.querySelector(`${modalSelector} #edit-digital-form-fields`);
                                        let fields = [];
                                        if (fieldsInput && fieldsInput.value) {
                                            try {
                                                fields = JSON.parse(fieldsInput.value);
                                            } catch (e) {
                                                fields = [];
                                            }
                                        }
                                        window.renderFormQuestions(itemId, fields);
                                    }, 100);
                                }
                            }
                        });
                    });

                    // Listener para formato de exibição
                    const formatRadios = document.querySelectorAll(`${modalSelector} input[name="digital-form-display-format"]`);
                    const bannerContainer = document.getElementById('digital-form-banner-image-container');
                    formatRadios.forEach(radio => {
                        radio.addEventListener('change', () => {
                            if (bannerContainer) {
                                bannerContainer.style.display = radio.value === 'banner' ? 'block' : 'none';
                            }
                        });
                    });

                    // Configurar upload de logo do formulário digital (usar seletor específico do modal)
                    const logoUploadArea = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .form-logo-upload-area`);
                    const logoFileInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .form-logo-file-input`);
                    if (logoUploadArea && logoFileInput) {
                        // Remover listeners anteriores clonando o elemento
                        const newLogoUploadArea = logoUploadArea.cloneNode(true);
                        logoUploadArea.parentNode.replaceChild(newLogoUploadArea, logoUploadArea);
                        const newLogoFileInput = newLogoUploadArea.querySelector('.form-logo-file-input');

                        newLogoUploadArea.addEventListener('click', (e) => {
                            e.stopPropagation();
                            newLogoFileInput.click();
                        });
                        newLogoFileInput.addEventListener('change', async (e) => {
                            e.stopPropagation();
                            const file = e.target.files[0];
                            if (!file) return;

                            if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
                                alert('Apenas imagens PNG ou JPG são permitidas.');
                                return;
                            }
                            if (file.size > 5 * 1024 * 1024) {
                                alert('A imagem deve ter no máximo 5MB.');
                                return;
                            }

                            const preview = document.getElementById('digital-form-logo-preview');
                            const hiddenInput = document.getElementById('edit-form-logo-url');
                            const uploadText = newLogoUploadArea.querySelector('.logo-upload-text');
                            const removeBtn = newLogoUploadArea.querySelector('.remove-logo-btn');
                            const loader = newLogoUploadArea.querySelector('.upload-loader');

                            // Mostrar loader
                            if (loader) loader.style.display = 'block';
                            if (uploadText) uploadText.style.opacity = '0.5';

                            try {
                                // Obter URL de upload
                                const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                                    method: 'POST',
                                    headers: HEADERS
                                });
                                if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');
                                const { uploadURL } = await authResponse.json();

                                // Fazer upload
                                const formData = new FormData();
                                formData.append('file', file);
                                const uploadResponse = await fetch(uploadURL, {
                                    method: 'POST',
                                    headers: getAuthHeaders(),
                                    body: formData
                                });
                                if (!uploadResponse.ok) throw new Error('Falha no upload da imagem.');

                                const uploadData = await uploadResponse.json();
                                const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/MBdqwyqeFtFBvKiQjgzjtQ/${uploadData.result.id}/public` : '');

                                // Atualizar interface
                                if (preview) {
                                    preview.src = finalUrl;
                                    preview.style.display = 'block';
                                }
                                if (hiddenInput) hiddenInput.value = finalUrl;
                                if (uploadText) uploadText.style.display = 'none';
                                if (removeBtn) removeBtn.style.display = 'block';

                                console.log('Logo do formulário digital enviado:', finalUrl);
                            } catch (error) {
                                console.error('O Erro ao fazer upload do logo:', error);
                                alert(`Erro ao fazer upload: ${error.message}`);
                            } finally {
                                if (loader) loader.style.display = 'none';
                                if (uploadText) uploadText.style.opacity = '1';
                            }
                        });

                        // Botão remover logo
                        const removeLogoBtn = newLogoUploadArea.querySelector('.remove-logo-btn');
                        if (removeLogoBtn) {
                            removeLogoBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                const preview = document.getElementById('digital-form-logo-preview');
                                const hiddenInput = document.getElementById('edit-form-logo-url');
                                const uploadText = newLogoUploadArea.querySelector('.logo-upload-text');
                                if (preview) preview.style.display = 'none';
                                if (hiddenInput) hiddenInput.value = '';
                                if (uploadText) uploadText.style.display = 'block';
                                removeLogoBtn.style.display = 'none';
                            });
                        }
                    }

                    // Configurar upload de banner do formulário digital
                    const bannerUploadArea = document.querySelector('.form-banner-upload-area');
                    const bannerFileInput = document.querySelector('.form-banner-file-input');
                    if (bannerUploadArea && bannerFileInput) {
                        bannerUploadArea.addEventListener('click', () => bannerFileInput.click());
                        bannerFileInput.addEventListener('change', async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;

                            if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
                                alert('Apenas imagens PNG ou JPG são permitidas.');
                                return;
                            }
                            if (file.size > 5 * 1024 * 1024) {
                                alert('A imagem deve ter no máximo 5MB.');
                                return;
                            }

                            const preview = document.getElementById('digital-form-banner-preview');
                            const hiddenInput = document.getElementById('edit-digital-form-banner-image');
                            const uploadText = bannerUploadArea.querySelector('.image-upload-text');
                            const removeBtn = bannerUploadArea.querySelector('.remove-banner-btn');
                            const loader = bannerUploadArea.querySelector('.upload-loader');

                            // Mostrar loader
                            if (loader) loader.style.display = 'block';
                            if (uploadText) uploadText.style.opacity = '0.5';

                            try {
                                // Obter URL de upload
                                const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                                    method: 'POST',
                                    headers: HEADERS
                                });
                                if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');
                                const { uploadURL } = await authResponse.json();

                                // Fazer upload
                                const formData = new FormData();
                                formData.append('file', file);
                                const uploadResponse = await fetch(uploadURL, {
                                    method: 'POST',
                                    headers: getAuthHeaders(),
                                    body: formData
                                });
                                if (!uploadResponse.ok) throw new Error('Falha no upload da imagem.');

                                const uploadData = await uploadResponse.json();
                                const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/MBdqwyqeFtFBvKiQjgzjtQ/${uploadData.result.id}/public` : '');

                                // Atualizar interface
                                if (preview) {
                                    preview.src = finalUrl;
                                    preview.style.display = 'block';
                                }
                                if (hiddenInput) hiddenInput.value = finalUrl;
                                if (uploadText) uploadText.style.display = 'none';
                                if (removeBtn) removeBtn.style.display = 'block';

                                console.log('Banner do formulário digital enviado:', finalUrl);
                            } catch (error) {
                                console.error('O Erro ao fazer upload do banner:', error);
                                alert(`Erro ao fazer upload: ${error.message}`);
                            } finally {
                                if (loader) loader.style.display = 'none';
                                if (uploadText) uploadText.style.opacity = '1';
                            }
                        });

                        // Botão remover banner
                        const removeBannerBtn = bannerUploadArea.querySelector('.remove-banner-btn');
                        if (removeBannerBtn) {
                            removeBannerBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                const preview = document.getElementById('digital-form-banner-preview');
                                const hiddenInput = document.getElementById('edit-digital-form-banner-image');
                                const uploadText = bannerUploadArea.querySelector('.image-upload-text');
                                if (preview) preview.style.display = 'none';
                                if (hiddenInput) hiddenInput.value = '';
                                if (uploadText) uploadText.style.display = 'block';
                                removeBannerBtn.style.display = 'none';
                            });
                        }
                    }
                }, 100);
                break;
        }

        const modalTitleMap = {
            'link': 'Editar Link Personalizado',
            'carousel': 'Editar Carrossel',
            'digital_form': 'Editar Formulário King',
            'location': 'Editar Localização',
            'wifi': 'Editar Wi-Fi (QR Code)',
        };
        SELECTORS.editModalTitle.textContent = modalTitleMap[itemType] || (itemType === 'banner' ? 'Editar Banner' : `Editar ${itemType.replace('_', ' ').charAt(0).toUpperCase() + itemType.replace('_', ' ').slice(1)}`);
        SELECTORS.editModalBody.innerHTML = formHTML;

        // GARANTIR que itemType e editingId estão sempre definidos no modal
        SELECTORS.editItemModal.dataset.editingId = itemId;
        SELECTORS.editItemModal.dataset.itemType = itemType;
        SELECTORS.editItemModal.dataset.isNewItem = 'false';

        console.log(`[MODAL] Modal configurado:`, {
            editingId: SELECTORS.editItemModal.dataset.editingId,
            itemType: SELECTORS.editItemModal.dataset.itemType,
            isNewItem: SELECTORS.editItemModal.dataset.isNewItem
        });

        SELECTORS.editItemModal.classList.add('active');


        // Adicionar event listener para upload de imagens do carrossel
        // ===== NOVO CARROSSEL - Configurar após abrir modal =====
        if (itemType === 'carousel') {
            setTimeout(() => {
                // Renderizar imagens existentes
                const jsonInput = SELECTORS.editModalBody.querySelector(`.carousel-images-json-new[data-item-id="${itemId}"]`);
                if (jsonInput && jsonInput.value) {
                    try {
                        const images = JSON.parse(jsonInput.value);
                        renderCarouselImagesNew(itemId, images);
                    } catch (e) {
                        console.error('Erro ao renderizar imagens:', e);
                    }
                }

                // Garantir que o input tenha listener direto também
                const fileInput = SELECTORS.editModalBody.querySelector(`#carousel-file-new-${itemId}`);
                if (fileInput) {
                    console.log('[CARROSSEL] Input encontrado no modal:', fileInput.id);
                    // Remover listener antigo se existir
                    const newInput = fileInput.cloneNode(true);
                    fileInput.parentNode.replaceChild(newInput, fileInput);
                    console.log('[CARROSSEL] Input clonado e substituído para garantir listener');
                } else {
                    console.error('[CARROSSEL] Input não encontrado no modal!');
                }
            }, 150);
        }

        if (itemType === 'location') {
            (function setupLocationModal() {
                var locItem = (window.currentProfileData && window.currentProfileData.items) ? window.currentProfileData.items.find(function (i) { return String(i.id) === String(itemId); }) : null;
                var locData = (locItem && locItem.location_data) || {};
                var latIn = SELECTORS.editModalBody.querySelector('.location-lat-input');
                var lngIn = SELECTORS.editModalBody.querySelector('.location-lng-input');
                var container = SELECTORS.editModalBody.querySelector('#location-map-container-' + itemId);
                var searchBtn = SELECTORS.editModalBody.querySelector('.location-search-btn');
                var addrIn = SELECTORS.editModalBody.querySelector('#location-address-input');
                var formattedP = SELECTORS.editModalBody.querySelector('.location-formatted-display');

                if (formattedP && locData && locData.address_formatted) {
                    formattedP.textContent = locData.address_formatted;
                }

                var leafletMap = null;
                var marker = null;
                var defaultCenter = [-23.5505, -46.6333];
                var defaultZoom = 13;

                function updateInputsFromLatLng(lat, lng, skipReverseGeocode) {
                    if (latIn) latIn.value = lat;
                    if (lngIn) lngIn.value = lng;
                    if (skipReverseGeocode) return;
                    fetch('https://nominatim.openstreetmap.org/reverse?lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lng) + '&format=json', { headers: { 'Accept': 'application/json' } })
                        .then(function (r) { return r.json(); })
                        .then(function (data) {
                            var displayName = (data && data.display_name) ? data.display_name : '';
                            if (addrIn) addrIn.value = displayName;
                            if (formattedP) formattedP.textContent = displayName;
                        })
                        .catch(function () { if (formattedP) formattedP.textContent = 'Endereço não encontrado para este ponto.'; });
                }

                function setMarkerPosition(latLng) {
                    var lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
                    var lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;
                    if (marker) {
                        marker.setLatLng(latLng);
                    } else if (window.L && leafletMap) {
                        marker = window.L.marker(latLng, { draggable: true }).addTo(leafletMap);
                        marker.on('dragend', function () {
                            var pos = marker.getLatLng();
                            updateInputsFromLatLng(pos.lat, pos.lng, false);
                        });
                    }
                    if (latIn) latIn.value = lat;
                    if (lngIn) lngIn.value = lng;
                    if (leafletMap) leafletMap.setView([lat, lng], leafletMap.getZoom() < 16 ? 17 : leafletMap.getZoom());
                }

                if (window.L && container) {
                    if (window._lastLocationLeafletMap) {
                        try { window._lastLocationLeafletMap.remove(); } catch (e) {}
                        window._lastLocationLeafletMap = null;
                    }
                    setTimeout(function () {
                        var hasInitial = latIn && lngIn && latIn.value && lngIn.value;
                        var center = hasInitial ? [parseFloat(latIn.value), parseFloat(lngIn.value)] : defaultCenter;
                        var zoom = hasInitial ? 17 : 11;
                        leafletMap = window.L.map(container, { center: center, zoom: zoom });
                        leafletMap.invalidateSize();
                        window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
                            subdomains: 'abcd',
                            maxZoom: 20
                        }).addTo(leafletMap);

                        if (hasInitial) {
                            var initialLatLng = window.L.latLng(parseFloat(latIn.value), parseFloat(lngIn.value));
                            marker = window.L.marker(initialLatLng, { draggable: true }).addTo(leafletMap);
                            marker.on('dragend', function () {
                                var pos = marker.getLatLng();
                                updateInputsFromLatLng(pos.lat, pos.lng, false);
                            });
                        }

                        leafletMap.on('click', function (e) {
                            setMarkerPosition(e.latlng);
                            updateInputsFromLatLng(e.latlng.lat, e.latlng.lng, false);
                        });

                        container._leafletMap = leafletMap;
                        window._lastLocationLeafletMap = leafletMap;
                    }, 200);
                }

                function updateMapFromCoords(lat, lng) {
                    var latNum = parseFloat(lat);
                    var lngNum = parseFloat(lng);
                    if (isNaN(latNum) || isNaN(lngNum)) return;
                    if (leafletMap) {
                        var latLng = window.L && window.L.latLng(latNum, lngNum);
                        leafletMap.setView(latLng, 17);
                        setMarkerPosition(latLng);
                    }
                }

                if (searchBtn && addrIn) {
                    searchBtn.addEventListener('click', function () {
                        var q = (addrIn.value || '').trim();
                        if (!q) return;
                        searchBtn.disabled = true;
                        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Pesquisando...';
                        fetch('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) + '&format=json&limit=1', { headers: { 'Accept': 'application/json' } })
                            .then(function (r) { return r.json(); })
                            .then(function (arr) {
                                if (arr && arr[0]) {
                                    var lat = arr[0].lat;
                                    var lon = arr[0].lon;
                                    var displayName = arr[0].display_name || '';
                                    if (latIn) latIn.value = lat;
                                    if (lngIn) lngIn.value = lon;
                                    if (addrIn) addrIn.value = displayName;
                                    if (formattedP) formattedP.textContent = displayName;
                                    updateMapFromCoords(lat, lon);
                                } else {
                                    if (formattedP) formattedP.textContent = 'Endereço não encontrado. Tente outro termo.';
                                }
                            })
                            .catch(function () {
                                if (formattedP) formattedP.textContent = 'Erro ao pesquisar. Tente novamente.';
                            })
                            .finally(function () {
                                searchBtn.disabled = false;
                                searchBtn.innerHTML = '<i class="fas fa-search"></i> Pesquisar';
                            });
                    });
                }
            })();
        }

        // Adicionar event listeners para slider de tamanho da logo (se for link ou product_catalog)
        if (itemType === 'link') {
            const logoSizeSlider = document.getElementById(`edit-logo-size-slider-${itemId}`);
            const logoSizeInput = document.getElementById(`edit-logo-size-input-${itemId}`);
            const logoSizeValueSpan = document.getElementById(`edit-logo-size-value-${itemId}`);
            const logoPreview = SELECTORS.editModalBody.querySelector('.item-logo-upload-preview');

            if (logoSizeSlider && logoSizeInput && logoSizeValueSpan) {
                // Sincronizar slider com input numérico
                logoSizeSlider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    logoSizeInput.value = value;
                    logoSizeValueSpan.textContent = value;
                    if (logoPreview) {
                        const previewSize = Math.min(value, 100);
                        logoPreview.style.width = previewSize + 'px';
                        logoPreview.style.height = previewSize + 'px';
                        logoPreview.style.maxWidth = previewSize + 'px';
                        logoPreview.style.maxHeight = previewSize + 'px';
                    }
                    // Atualizar dataset do item na lista imediatamente
                    const itemEl = document.querySelector(`[data-item-id="${itemId}"]`);
                    if (itemEl) {
                        itemEl.dataset.logoSize = value;
                        // Também atualizar o input na lista se existir
                        const itemLogoSizeInput = itemEl.querySelector('.item-logo-size-input');
                        if (itemLogoSizeInput) {
                            itemLogoSizeInput.value = value;
                        }
                    }
                    updateLivePreviewFromForm();
                });

                logoSizeInput.addEventListener('input', (e) => {
                    let value = parseInt(e.target.value);
                    if (isNaN(value)) value = 24;
                    if (value < 20) value = 20;
                    if (value > 600) value = 600;
                    logoSizeInput.value = value;
                    logoSizeSlider.value = value;
                    logoSizeValueSpan.textContent = value;
                    if (logoPreview) {
                        const previewSize = Math.min(value, 100);
                        logoPreview.style.width = previewSize + 'px';
                        logoPreview.style.height = previewSize + 'px';
                        logoPreview.style.maxWidth = previewSize + 'px';
                        logoPreview.style.maxHeight = previewSize + 'px';
                    }
                    // Atualizar dataset do item na lista imediatamente
                    const itemEl = document.querySelector(`[data-item-id="${itemId}"]`);
                    if (itemEl) {
                        itemEl.dataset.logoSize = value;
                        // Também atualizar o input na lista se existir
                        const itemLogoSizeInput = itemEl.querySelector('.item-logo-size-input');
                        if (itemLogoSizeInput) {
                            itemLogoSizeInput.value = value;
                        }
                    }
                    updateLivePreviewFromForm();
                });
            }

            // Adicionar event listeners para os radio buttons de ajuste da logo no modal
            const logoFitModeRadiosModal = document.querySelectorAll(`input[name="edit-logo-fit-mode-${itemId}"]`);
            const logoFitModeInputModal = document.getElementById(`edit-logo-fit-mode-input-${itemId}`);
            if (logoFitModeRadiosModal.length > 0 && logoFitModeInputModal) {
                logoFitModeRadiosModal.forEach(radio => {
                    radio.addEventListener('change', (e) => {
                        if (e.target.checked) {
                            logoFitModeInputModal.value = e.target.value;
                            // Atualizar estilos dos labels
                            logoFitModeRadiosModal.forEach(r => {
                                const label = document.querySelector(`label[for="${r.id}"]`);
                                if (label) {
                                    if (r.checked) {
                                        label.style.background = 'var(--dourado-principal, #FFC700)';
                                        label.style.color = '#000';
                                    } else {
                                        label.style.background = 'transparent';
                                        label.style.color = 'var(--text, #ECECEC)';
                                    }
                                }
                            });
                            // Atualizar dataset do item na lista
                            const itemEl = document.querySelector(`[data-item-id="${itemId}"]`);
                            if (itemEl) {
                                const itemLogoFitModeInput = itemEl.querySelector('.item-logo-fit-mode-input');
                                if (itemLogoFitModeInput) {
                                    itemLogoFitModeInput.value = e.target.value;
                                }
                            }
                            // Atualizar preview ao vivo
                            updateLivePreviewFromForm();
                        }
                    });
                });
            }
        }
    }

    const QR_ART_THEMES = {
        rei: { name: 'Rei', swatch: 'linear-gradient(135deg,#FFC700,#1a1408)', bg: ['#070709', '#1c1506'], card: '#12100c', accent: '#FFC700', qrDark: '#FFC700', qrLight: '#16130c', text: '#F8E7B0', muted: '#C4B07A' },
        classico: { name: 'Clássico', swatch: 'linear-gradient(135deg,#fff,#C9A227)', bg: ['#f4efe2', '#ddd2b4'], card: '#ffffff', accent: '#C9A227', qrDark: '#111111', qrLight: '#ffffff', text: '#1a1a1a', muted: '#6d6248' },
        noite: { name: 'Noite', swatch: 'linear-gradient(135deg,#0ea5e9,#0b1220)', bg: ['#07111d', '#0e1f33'], card: '#0b1726', accent: '#38bdf8', qrDark: '#e0f2fe', qrLight: '#0b1726', text: '#e0f2fe', muted: '#7dd3fc' },
        ouro: { name: 'Ouro', swatch: 'linear-gradient(135deg,#fde68a,#92400e)', bg: ['#3b2508', '#111111'], card: '#1a1208', accent: '#fbbf24', qrDark: '#111111', qrLight: '#fde68a', text: '#fff7d6', muted: '#fcd34d' },
        vinho: { name: 'Vinho', swatch: 'linear-gradient(135deg,#7f1d1d,#f59e0b)', bg: ['#1c0a0d', '#3b0d16'], card: '#2a1016', accent: '#fbbf24', qrDark: '#fde68a', qrLight: '#2a1016', text: '#fde68a', muted: '#e8b86d' },
        minimal: { name: 'Minimal', swatch: 'linear-gradient(135deg,#111,#888)', bg: ['#f3f4f6', '#e5e7eb'], card: '#ffffff', accent: '#111111', qrDark: '#111111', qrLight: '#ffffff', text: '#111111', muted: '#6b7280' }
    };

    function getShareQrMeta() {
        const details = (window.currentProfileData && window.currentProfileData.details)
            || (window.lastProfileData && window.lastProfileData.details)
            || {};
        let userUrl = '';
        if (SELECTORS.publicLink && SELECTORS.publicLink.href) userUrl = SELECTORS.publicLink.href;
        else if (SELECTORS.profileSlugInput && SELECTORS.profileSlugInput.value) {
            userUrl = 'https://tag.conectaking.com.br/' + SELECTORS.profileSlugInput.value.trim();
        } else if (details.profile_slug) {
            userUrl = 'https://tag.conectaking.com.br/' + details.profile_slug;
        }
        const slug = details.profile_slug || '';
        const name = details.display_name || slug || 'Conecta King';
        let logoUrl = details.profile_image_url || '';
        if (logoUrl && logoUrl.indexOf('avatar.iran.liara.run') !== -1) logoUrl = '';
        return { userUrl, slug, name, logoUrl };
    }

    function getSelectedQrThemeId() {
        try { return localStorage.getItem('conecta_qr_theme') || 'rei'; } catch (e) { return 'rei'; }
    }

    function qrIncludeLogo() {
        const el = document.getElementById('qr-include-logo');
        if (el) return !!el.checked;
        try { return localStorage.getItem('conecta_qr_logo') !== '0'; } catch (e) { return true; }
    }

    function fillQrThemePicker() {
        const picker = document.getElementById('qr-theme-picker');
        if (!picker) return;
        if (!picker.querySelector('[data-qr-theme]')) {
            const current = getSelectedQrThemeId();
            picker.innerHTML = Object.keys(QR_ART_THEMES).map(function (id) {
                const t = QR_ART_THEMES[id];
                return '<button type="button" class="qr-theme-chip' + (id === current ? ' active' : '') + '" data-qr-theme="' + id + '" role="option">' +
                    '<span class="qr-theme-swatch" style="background:' + t.swatch + '"></span>' + t.name + '</button>';
            }).join('');
        }
        if (picker.dataset.ready === '1') return;
        picker.dataset.ready = '1';
        picker.addEventListener('click', function (e) {
            const btn = e.target.closest('[data-qr-theme]');
            if (!btn) return;
            const id = btn.getAttribute('data-qr-theme');
            try { localStorage.setItem('conecta_qr_theme', id); } catch (err) {}
            picker.querySelectorAll('.qr-theme-chip').forEach(function (c) { c.classList.toggle('active', c === btn); });
            composeShareQrArt();
        });
        const logoToggle = document.getElementById('qr-include-logo');
        if (logoToggle && !logoToggle.dataset.bound) {
            try { logoToggle.checked = localStorage.getItem('conecta_qr_logo') !== '0'; } catch (e) {}
            logoToggle.dataset.bound = '1';
            logoToggle.addEventListener('change', function () {
                try { localStorage.setItem('conecta_qr_logo', logoToggle.checked ? '1' : '0'); } catch (e) {}
                composeShareQrArt();
            });
        }
    }

    function loadQrImage(url) {
        return new Promise(function (resolve) {
            if (!url) return resolve(null);
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () { resolve(img); };
            img.onerror = function () { resolve(null); };
            img.src = url;
        });
    }

    function getRawQrCanvas() {
        const qrContainer = document.getElementById('qr-code-container');
        if (!qrContainer) return null;
        const canvas = qrContainer.querySelector('canvas');
        if (canvas) return canvas;
        const img = qrContainer.querySelector('img');
        if (!img) return null;
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || img.width || 256;
        c.height = img.naturalHeight || img.height || 256;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        return c;
    }

    function recolorQr(srcCanvas, dark, light) {
        const w = srcCanvas.width;
        const h = srcCanvas.height;
        const out = document.createElement('canvas');
        out.width = w;
        out.height = h;
        const ctx = out.getContext('2d');
        ctx.drawImage(srcCanvas, 0, 0);
        const data = ctx.getImageData(0, 0, w, h);
        const px = data.data;
        const parse = function (hex) {
            const h2 = hex.replace('#', '');
            return [parseInt(h2.slice(0, 2), 16), parseInt(h2.slice(2, 4), 16), parseInt(h2.slice(4, 6), 16)];
        };
        const d = parse(dark);
        const l = parse(light);
        for (let i = 0; i < px.length; i += 4) {
            const isDark = (px[i] + px[i + 1] + px[i + 2]) / 3 < 140;
            const c = isDark ? d : l;
            px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
        }
        ctx.putImageData(data, 0, 0);
        return out;
    }

    function roundRectPath(ctx, x, y, w, h, r) {
        const rr = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
    }

    async function composeShareQrArt() {
        const canvas = document.getElementById('qr-art-canvas');
        const raw = getRawQrCanvas();
        if (!canvas || !raw) return;
        const theme = QR_ART_THEMES[getSelectedQrThemeId()] || QR_ART_THEMES.rei;
        const meta = getShareQrMeta();
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, theme.bg[0]);
        g.addColorStop(1, theme.bg[1]);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        roundRectPath(ctx, 36, 36, W - 72, H - 72, 36);
        ctx.fillStyle = theme.card;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = theme.accent;
        ctx.stroke();

        ctx.fillStyle = theme.accent;
        ctx.font = '700 22px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CONECTA KING', W / 2, 92);

        ctx.fillStyle = theme.text;
        ctx.font = '800 34px Inter, system-ui, sans-serif';
        const title = String(meta.name || 'Sua Tag').slice(0, 28);
        ctx.fillText(title, W / 2, 138);

        ctx.fillStyle = theme.muted;
        ctx.font = '500 18px Inter, system-ui, sans-serif';
        ctx.fillText(meta.slug ? '@' + meta.slug : 'Escaneie para abrir o cartão', W / 2, 168);

        const colored = recolorQr(raw, theme.qrDark, theme.qrLight);
        const qrSize = 460;
        const qrX = (W - qrSize) / 2;
        const qrY = 198;
        roundRectPath(ctx, qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 28);
        ctx.fillStyle = theme.qrLight;
        ctx.fill();
        ctx.drawImage(colored, qrX, qrY, qrSize, qrSize);

        if (qrIncludeLogo() && meta.logoUrl) {
            const logo = await loadQrImage(meta.logoUrl);
            if (logo) {
                const s = 92;
                const cx = W / 2;
                const cy = qrY + qrSize / 2;
                ctx.beginPath();
                ctx.arc(cx, cy, s / 2 + 10, 0, Math.PI * 2);
                ctx.fillStyle = theme.qrLight;
                ctx.fill();
                ctx.lineWidth = 4;
                ctx.strokeStyle = theme.accent;
                ctx.stroke();
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, s / 2, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(logo, cx - s / 2, cy - s / 2, s, s);
                ctx.restore();
            }
        }

        ctx.fillStyle = theme.muted;
        ctx.font = '500 16px Inter, system-ui, sans-serif';
        ctx.fillText('Escaneie para ver o cartão', W / 2, 710);
        ctx.fillStyle = theme.accent;
        ctx.font = '700 18px Inter, system-ui, sans-serif';
        const urlText = (meta.userUrl || '').replace(/^https?:\/\//, '');
        ctx.fillText(urlText.slice(0, 42), W / 2, 742);
        ctx.fillStyle = theme.muted;
        ctx.font = '500 14px Inter, system-ui, sans-serif';
        ctx.fillText('Arte gerada no Conecta King', W / 2, 860);
    }

    function generateQRCode() {
        const qrContainer = document.getElementById('qr-code-container');
        if (!qrContainer) {
            console.error('Container do QR Code não encontrado');
            return;
        }

        fillQrThemePicker();
        const meta = getShareQrMeta();
        const userUrl = meta.userUrl;

        if (!userUrl) {
            console.error('Não foi possível obter a URL do perfil para gerar o QR Code');
            qrContainer.innerHTML = '<p style="color: var(--text-secondary); padding: 20px;">Carregando URL do perfil...</p>';
            setTimeout(function () { generateQRCode(); }, 500);
            return;
        }

        qrContainer.innerHTML = '';

        if (typeof QRCode === 'undefined') {
            console.error('Biblioteca QRCode não está carregada');
            return;
        }

        try {
            if (qrCodeInstance) {
                try { qrCodeInstance.clear(); } catch (e) {}
                qrCodeInstance = null;
            }

            qrCodeInstance = new QRCode(qrContainer, {
                text: userUrl,
                width: 280,
                height: 280,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
            window.generateQRCode = generateQRCode;
            setTimeout(function () { composeShareQrArt(); }, 80);
            console.log('QR Code gerado com sucesso para:', userUrl);
        } catch (error) {
            console.error('Erro ao gerar QR Code:', error);
        }
    }
    window.generateQRCode = generateQRCode;

    function openCropper(file, triggerType, itemElement = null, customRatio = null) {
        const cropperModal = document.getElementById('cropper-modal');
        const image = document.getElementById('image-to-crop');
        const reader = new FileReader();

        reader.onload = function (e) {
            image.src = e.target.result;
            cropperModal.classList.add('active');

            if (cropper) {
                cropper.destroy();
            }

            let aspectRatio = NaN;
            if (triggerType === 'profile') {
                aspectRatio = 1 / 1;
            } else if (triggerType === 'background' || triggerType === 'vitrine-hero') {
                aspectRatio = 16 / 9;
            } else if (triggerType === 'share-image') {
                // Usar proporção customizada se fornecida
                if (customRatio) {
                    const ratioMap = {
                        'auto': NaN,
                        '16:9': 16 / 9,
                        '4:3': 4 / 3,
                        '1:1': 1 / 1
                    };
                    aspectRatio = ratioMap[customRatio] || NaN;
                } else {
                    // Tentar pegar do seletor se não foi fornecido
                    const selectedRatioEl = document.querySelector('input[name="share-aspect-ratio-selector"]:checked');
                    if (selectedRatioEl) {
                        const selectedRatio = selectedRatioEl.value;
                        const ratioMap = {
                            'auto': NaN,
                            '16:9': 16 / 9,
                            '4:3': 4 / 3,
                            '1:1': 1 / 1
                        };
                        aspectRatio = ratioMap[selectedRatio] || NaN;
                    }
                }
            } else if (triggerType === 'banner' || triggerType === 'carousel' || triggerType === 'wifi-banner') {
                const selectedRatioEl = document.querySelector('input[name="aspect-ratio-selector"]:checked');
                if (selectedRatioEl) {
                    const selectedRatio = selectedRatioEl.value;
                    const ratioMap = {
                        'auto': NaN,
                        'tarja': 4 / 1,
                        '2:1': 2 / 1,
                        '4:3': 4 / 3,
                        '1:1': 1 / 1,
                        '3:4': 3 / 4,
                        '10:16': 10 / 16,
                        '16:9': 16 / 9
                    };
                    aspectRatio = ratioMap[selectedRatio] || NaN;
                }
            }

            cropper = new Cropper(image, {
                aspectRatio: aspectRatio,
                viewMode: 1,
                background: false,
                autoCropArea: 0.9,
                responsive: true,
                restore: false,
                checkOrientation: true,
                // Mostra a foto o máximo possível na área; pan/zoom no cropper (sem scroll do modal)
                dragMode: 'move',
                ready() {
                    try {
                        const modal = document.getElementById('cropper-modal');
                        const box = modal && modal.querySelector('.cropper-container');
                        if (box && this.cropper) {
                            this.cropper.resize();
                        }
                    } catch (_) { /* ignore */ }
                }
            });

            imageToUpload.trigger = triggerType;
            imageToUpload.element = itemElement;
            imageToUpload.originalFile = file;  // Armazenar arquivo original para preservar tipo

            // Dica no modal para arte Vitrine
            const tipEl = document.querySelector('#cropper-modal .cropper-tip');
            if (tipEl) {
                if (triggerType === 'vitrine-hero') {
                    tipEl.innerHTML = 'Arte do <strong>Modelo Vitrine</strong>: corte em <strong>16:9</strong> (ex.: 19201080). Arraste e ajuste o enquadramento antes de enviar.';
                } else if (triggerType === 'background') {
                    tipEl.innerHTML = 'Sugestão para fundo do cartão: <strong>19201080</strong> (16:9) ou <strong>1600900</strong>. Prepare a foto nesse tamanho ou aproxime ao cortar. No telemóvel o fundo cobre o ecrã todo (centrado); detalhes nas bordas laterais podem sair fora.';
                }
            }
        };

        reader.readAsDataURL(file);
    }
    window.openCropper = openCropper;

    function closeCropper() {
        document.getElementById('cropper-modal').classList.remove('active');
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    }

    // Funf§f£o para obter f­cone padrf£o baseado no tipo de item
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

    // Funf§f£o para obter nome amigf¡vel do tipo de item
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

    // Funf§f£o para abrir modal de edif§f£o para novo item
    function openEditModalForNewItem(tempItem) {
        const itemType = tempItem.item_type;
        let formHTML = '';

        // Usar a mesma lf³gica do openEditModal mas para item novo
        switch (itemType) {
            case 'whatsapp':
            case 'telegram':
            case 'email':
            case 'facebook':
            case 'instagram':
            case 'pinterest':
            case 'reddit':
            case 'tiktok':
            case 'twitch':
            case 'twitter':
            case 'youtube':
            case 'linkedin':
            case 'portfolio':
                formHTML = `
                    <div class="input-group">
                        <label>Título</label>
                        <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título (ex: Meu WhatsApp)">
                    </div>
                    <div class="input-group">
                        <label>URL de Destino</label>
                        <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="https://wa.me/5511999999999">
                    </div>
                `;
                break;
            case 'instagram_embed':
            case 'youtube_embed':
            case 'tiktok_embed':
            case 'spotify_embed':
            case 'linkedin_embed':
            case 'pinterest_embed':
                formHTML = `
                    <div class="input-group">
                        <label>Título</label>
                        <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título do Conteúdo">
                    </div>
                    <div class="input-group">
                        <label>URL do Conteúdo</label>
                        <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="Cole a URL do post ou vídeo">
                    </div>
                `;
                break;
            case 'pix':
                formHTML = `
                    <div class="input-group">
                        <label>Título</label>
                        <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título (ex: PIX Celular)">
                    </div>
                    <div class="input-group">
                        <label>Nome do Recebedor</label>
                        <input type="text" id="edit-recipient-name" value="${tempItem.recipient_name || ''}" placeholder="Seu nome completo">
                    </div>
                    <div class="input-group">
                        <label>Chave PIX (Aleatf³ria, CPF/CNPJ, E-mail ou Telefone)</label>
                        <div class="pix-key-examples">
                            <small><strong>?ož Celular:</strong> Apenas nfºmeros (ex: +5511999999999)</small>
                            <small><strong>?o§ Email:</strong> seuemail@exemplo.com</small>
                            <small><strong> CPF:</strong> Apenas nfºmeros (ex: 12345678901)</small>
                            <small><strong>?~ Chave Aleatf³ria:</strong> Copie e cole (ex: 12345678-1234-...)</small>
                        </div>
                        <input type="text" id="edit-pix-key" value="${tempItem.pix_key || ''}" placeholder="Ex: +5511999999999 (celular) ou seuemail@exemplo.com">
                    </div>
                    <div class="input-group">
                        <label>Valor (opcional)</label>
                        <input type="number" id="edit-pix-amount" value="${tempItem.pix_amount || ''}" placeholder="Valor em reais" step="0.01">
                    </div>
                    <div class="input-group">
                        <label>Descrif§f£o (opcional)</label>
                        <input type="text" id="edit-pix-description" value="${tempItem.pix_description || ''}" placeholder="Descrif§f£o do pagamento">
                    </div>
                `;
                break;
            case 'pix_qrcode':
                formHTML = `
                    <div class="input-group">
                        <label>Título</label>
                        <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título (ex: Faça um PIX)">
                    </div>
                    <div class="input-group">
                        <label>Nome do Recebedor</label>
                        <input type="text" id="edit-recipient-name" value="${tempItem.recipient_name || ''}" placeholder="Seu nome completo">
                    </div>
                    <div class="input-group">
                        <label>Chave PIX (Aleatf³ria, CPF/CNPJ, E-mail ou Telefone)</label>
                        <div class="pix-key-examples">
                            <small><strong>?ož Celular:</strong> Apenas nfºmeros (ex: +5511999999999)</small>
                            <small><strong>?o§ Email:</strong> seuemail@exemplo.com</small>
                            <small><strong> CPF:</strong> Apenas nfºmeros (ex: 12345678901)</small>
                            <small><strong>?~ Chave Aleatf³ria:</strong> Copie e cole (ex: 12345678-1234-...)</small>
                        </div>
                        <input type="text" id="edit-pix-key" value="${tempItem.pix_key || ''}" placeholder="Ex: +5511999999999 (celular) ou seuemail@exemplo.com">
                    </div>
                    <div class="input-group">
                        <label>Valor (opcional)</label>
                        <input type="number" id="edit-pix-amount" value="${tempItem.pix_amount || ''}" placeholder="Valor em reais" step="0.01">
                    </div>
                    <div class="input-group">
                        <label>Descrif§f£o (opcional)</label>
                        <input type="text" id="edit-pix-description" value="${tempItem.pix_description || ''}" placeholder="Descrif§f£o do pagamento">
                    </div>
                `;
                break;
            case 'wifi': {
                let wifiCfgNew = {};
                try {
                    if (tempItem.destination_url && String(tempItem.destination_url).trim().startsWith('{')) {
                        wifiCfgNew = JSON.parse(tempItem.destination_url);
                    }
                } catch (e) {
                    wifiCfgNew = {};
                }
                const escN = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
                const wf = (wifiCfgNew.display_format === 'banner') ? 'banner' : 'button';
                const ws = (wifiCfgNew.ssid || '').trim();
                const wp = wifiCfgNew.password != null ? String(wifiCfgNew.password) : '';
                const wsec = (wifiCfgNew.security || 'WPA').toString();
                const wh = !!wifiCfgNew.hidden;
                const wb = (wifiCfgNew.banner_image_url || '').trim();
                const wl = (wifiCfgNew.logo_url || '').trim();
                const wls = String(wifiCfgNew.logo_size || 48);
                formHTML = `
                    <div class="input-group">
                        <label>Título no cartão</label>
                        <input type="text" id="edit-title" value="${escN(tempItem.title || 'Wi-Fi')}" placeholder="Texto do botão (ex: Wi-Fi da loja)">
                    </div>
                    <div class="input-group">
                        <label>Formato</label>
                        <div style="display: flex; gap: 15px; margin-top: 10px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="radio" class="wifi-display-format-input" name="wifi-modal-df-new" value="button" ${wf === 'button' ? 'checked' : ''}>
                                <span>Botão</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="radio" class="wifi-display-format-input" name="wifi-modal-df-new" value="banner" ${wf === 'banner' ? 'checked' : ''}>
                                <span>Banner</span>
                            </label>
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Nome da rede Wi-Fi (SSID)</label>
                        <small style="display:block;color:#a1a1a1;font-size:0.8rem;margin:4px 0 8px;line-height:1.35;">Obrigatório. Nome que aparece na lista de redes do celular.</small>
                        <input type="text" id="edit-wifi-ssid" value="${escN(ws)}" placeholder="Ex: MinhaLoja_WiFi ou Visitantes_5G" maxlength="32">
                    </div>
                    <div class="input-group">
                        <label>Segurança</label>
                        <select id="edit-wifi-security" style="width:100%;padding:10px;border-radius:8px;">
                            <option value="WPA" ${wsec === 'WPA' || wsec === 'WPA2' || wsec === 'WPA3' ? 'selected' : ''}>WPA/WPA2/WPA3</option>
                            <option value="WEP" ${wsec === 'WEP' ? 'selected' : ''}>WEP</option>
                            <option value="nopass" ${wsec === 'nopass' || wsec === 'NONE' ? 'selected' : ''}>Rede aberta (sem senha)</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Senha (opcional)</label>
                        <input type="text" id="edit-wifi-password" value="${escN(wp)}" placeholder="Deixe vazio se for rede aberta" autocomplete="off">
                    </div>
                    <div class="input-group">
                        <label style="display:flex;align-items:center;gap:10px;">
                            <input type="checkbox" id="edit-wifi-hidden" ${wh ? 'checked' : ''}>
                            Rede oculta (SSID não transmitido)
                        </label>
                    </div>
                    <div class="wifi-modal-logo-section" style="display: ${wf === 'banner' ? 'none' : 'block'};">
                        <div class="input-group">
                            <label>Tamanho da logo (px)</label>
                            <input type="number" id="edit-wifi-logo-size" value="${escN(wls)}" min="20" max="600" step="1" style="width: 120px;">
                        </div>
                        <input type="hidden" id="edit-wifi-logo-url" value="${escN(wl)}">
                    </div>
                    <div class="wifi-modal-banner-section" style="display: ${wf === 'banner' ? 'block' : 'none'};">
                        ${wifiBannerUploadBlockHtml(tempItem.id, wb)}
                    </div>
                `;
                break;
            }
            case 'banner':
                formHTML = `
                    <div class="input-group">
                        <label>Proporção do Banner</label>
                        <div class="aspect-ratio-selector">
                            <input type="radio" id="aspect-auto" name="aspect-ratio-selector" value="auto" checked>
                            <label for="aspect-auto">Automática</label>
                            <input type="radio" id="aspect-tarja" name="aspect-ratio-selector" value="tarja">
                            <label for="aspect-tarja">Tarja</label>
                            <input type="radio" id="aspect-2-1" name="aspect-ratio-selector" value="2:1">
                            <label for="aspect-2-1">2:1</label>
                            <input type="radio" id="aspect-4-3" name="aspect-ratio-selector" value="4:3">
                            <label for="aspect-4-3">4:3</label>
                            <input type="radio" id="aspect-1-1" name="aspect-ratio-selector" value="1:1">
                            <label for="aspect-1-1">1:1</label>
                            <input type="radio" id="aspect-3-4" name="aspect-ratio-selector" value="3:4">
                            <label for="aspect-3-4">3:4</label>
                            <input type="radio" id="aspect-10-16" name="aspect-ratio-selector" value="10:16">
                            <label for="aspect-10-16">10:16</label>
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Imagem do Banner (Clique para enquadrar)</label>
                        <div class="image-upload-area banner-item" data-item-type="banner" data-item-id="${tempItem.id}">
                            <div class="image-preview">
                                <div class="preview-placeholder" style="display: block;">
                                    <i class="fas fa-image"></i>
                                    <span>Preview</span>
                                </div>
                                <img id="edit-banner-preview" class="banner-preview" src="" style="max-width: 100%; max-height: 200px; margin-top: 10px; display: none; border-radius: 8px;">
                            </div>
                            <div class="upload-info">
                                <span class="upload-text">Alterar Imagem</span>
                                <small>Enquadre na proporção escolhida</small>
                            </div>
                            <input type="file" class="item-file-input" accept="image/*" data-item-type="banner" data-item-id="${tempItem.id}" style="display: none;">
                        </div>
                    </div>
                    <input type="hidden" id="edit-image-url" value="">
                    <div class="input-group">
                        <label>URL de Destino (para onde o banner leva)</label>
                        <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="https://exemplo.com">
                    </div>
                `;
                break;
            case 'pdf':
                formHTML = `
                    <div class="input-group">
                        <label>Título</label>
                        <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título (ex: Manual do Produto)">
                    </div>
                    <div class="input-group">
                        <label>URL do PDF</label>
                        <input type="text" id="edit-pdf-url" value="${tempItem.pdf_url || ''}" placeholder="https://exemplo.com/arquivo.pdf">
                    </div>
                `;
                break;
            case 'banner_carousel':
                // Banner Carrossel - criar como banner mas com JSON vazio
                let newCarouselImages = [];
                try {
                    if (tempItem.destination_url) {
                        newCarouselImages = JSON.parse(tempItem.destination_url);
                    }
                } catch (e) {
                    newCarouselImages = [];
                }
                formHTML = `
                    <div class="input-group">
                        <label>Proporção do Carrossel</label>
                        <div class="aspect-ratio-control">
                            <input type="radio" name="aspect-ratio-selector" id="ratio-16-9-temp" value="16:9" checked>
                            <label for="ratio-16-9-temp">16:9</label>
                            <input type="radio" name="aspect-ratio-selector" id="ratio-4-3-temp" value="4:3">
                            <label for="ratio-4-3-temp">4:3</label>
                            <input type="radio" name="aspect-ratio-selector" id="ratio-1-1-temp" value="1:1">
                            <label for="ratio-1-1-temp">1:1</label>
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Fotos do Carrossel <small style="color: #999; font-weight: normal;">(Adicione quantas quiser. As imagens passam automaticamente a cada 3 segundos)</small></label>
                        <div id="carousel-images-list-new-${tempItem.id}" class="carousel-images-list-new" style="min-height: 50px; margin-bottom: 10px; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;"></div>
                        <div class="image-upload-area banner-upload-modal" style="margin-top: 10px; position: relative; cursor: pointer;" onclick="document.querySelector('#carousel-input-${tempItem.id}').click();">
                            <input type="file" id="carousel-input-${tempItem.id}" class="item-file-input add-carousel-image-input" data-item-id="${tempItem.id}" accept="image/*" style="position: absolute; width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 10; top: 0; left: 0;">
                            <div class="image-upload-text">
                                <p><i class="fas fa-plus"></i> Adicionar Foto</p>
                                <span>Clique para adicionar mais fotos ao carrossel</span>
                            </div>
                            <div class="upload-loader"></div>
                        </div>
                    </div>
                    <input type="hidden" id="edit-dest-url" class="carousel-images-json-new" data-item-id="${tempItem.id}" value='${JSON.stringify(newCarouselImages)}'>
                    <input type="hidden" class="carousel-images-json-new" data-item-id="${tempItem.id}" value='${JSON.stringify(newCarouselImages)}'>
                `;
                setTimeout(() => renderCarouselImagesNew(tempItem.id, newCarouselImages), 100);
                break;
            case 'digital_form':
                // Para digital_form, usar o openEditModal normal (já que ele precisa de itemId real)
                // Este case não será usado, mas mantemos para compatibilidade
                formHTML = `
                    <div class="input-group">
                        <label>Título do Módulo</label>
                        <input type="text" id="edit-digital-form-title" value="${tempItem.title || 'Formulário King'}" placeholder="Formulário King">
                    </div>
                    <p style="color: #999; font-size: 0.9rem; margin-top: 10px;">
                        <i class="fas fa-info-circle"></i> Configure os campos do formulário após salvar.
                    </p>
                `;
                break;
            case 'guest_list':
                // Para guest_list, criar formulário básico
                formHTML = `
                    <div class="input-group">
                        <label>Título da Lista</label>
                        <input type="text" id="edit-guest-list-title" value="${tempItem.title || 'Lista de Convidados'}" placeholder="Lista de Convidados">
                    </div>
                    <div class="input-group">
                        <label>Nome do Evento</label>
                        <input type="text" id="edit-event-title" value="${tempItem.event_title || 'Evento'}" placeholder="Nome do Evento">
                    </div>
                    <div class="input-group">
                        <label>Descrição do Evento</label>
                        <textarea id="edit-event-description" rows="3" placeholder="Descrição opcional do evento"></textarea>
                    </div>
                    <p style="color: #999; font-size: 0.9rem; margin-top: 10px;">
                        <i class="fas fa-info-circle"></i> Configure os detalhes completos após salvar.
                    </p>
                `;
                break;
            case 'agenda':
            case 'contract':
            case 'kingbrief':
            case 'king_bolao':
            case 'photographer_site':
                formHTML = `
                    <div class="input-group">
                        <p style="color:#f87171;font-size:0.95rem;margin:0;">
                            <i class="fas fa-ban"></i> Este módulo foi descontinuado e já não está disponível no Conecta King.
                        </p>
                    </div>
                `;
                break;
            case 'convite':
                formHTML = `
                    <div class="input-group">
                        <label>Título do Módulo</label>
                        <input type="text" id="edit-convite-title" value="${tempItem.title || 'Convite'}" placeholder="Convite">
                    </div>
                    <p style="color: #999; font-size: 0.9rem; margin-top: 10px;">
                        <i class="fas fa-info-circle"></i> Personalize o convite (texto, data, local, fotos) após salvar.
                    </p>
                `;
                break;
            case 'instagram_embed':
                formHTML = `
                    <div class="input-group">
                        <label>Título</label>
                        <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título do Conteúdo">
                    </div>
                    <div class="input-group">
                        <label>URL do Perfil do Instagram</label>
                        <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="https://www.instagram.com/p/... ou https://www.instagram.com/seu_usuario/">
                    </div>
                `;
                break;
            case 'youtube_embed':
                formHTML = `
                    <div class="input-group">
                        <label>Título</label>
                        <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título do Conteúdo">
                    </div>
                    <div class="input-group">
                        <label>URL do Vídeo do YouTube</label>
                        <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/...">
                    </div>
                `;
                break;
            case 'tiktok_embed':
                formHTML = `
                    <div class="input-group">
                        <label>Título</label>
                        <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título do Perfil">
                    </div>
                    <div class="input-group">
                        <label>URL do Perfil do TikTok</label>
                        <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="https://www.tiktok.com/@seu_usuario">
                    </div>
                `;
                break;
            case 'spotify_embed':
                formHTML = `
                    <div class="input-group">
                        <label>Título</label>
                        <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título do Perfil">
                    </div>
                    <div class="input-group">
                        <label>URL do Perfil do Spotify</label>
                        <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="https://open.spotify.com/user/seu_usuario ou https://open.spotify.com/artist/seu_artista">
                    </div>
                `;
                break;
            case 'linkedin_embed':
                formHTML = `
                    <div class="input-group">
                        <label>Título</label>
                        <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título do Perfil">
                    </div>
                    <div class="input-group">
                        <label>URL do Perfil do LinkedIn</label>
                        <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="https://www.linkedin.com/in/seu_perfil">
                    </div>
                `;
                break;
            case 'pinterest_embed':
                formHTML = `
                    <div class="input-group">
                        <label>Título</label>
                        <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título do Perfil">
                    </div>
                    <div class="input-group">
                        <label>URL do Perfil do Pinterest</label>
                        <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="https://www.pinterest.com/seu_usuario ou https://br.pinterest.com/seu_usuario">
                    </div>
                `;
                break;
            default:
                formHTML = `
                    <div class="input-group">
                        <label>Título</label>
                        <input type="text" id="edit-title" value="${tempItem.title || ''}" placeholder="Título">
                    </div>
                    <div class="input-group">
                        <label>URL de Destino</label>
                        <input type="text" id="edit-dest-url" value="${tempItem.destination_url || ''}" placeholder="https://exemplo.com">
                    </div>
                `;
        }

        // Configurar modal
        SELECTORS.editItemModal.dataset.editingId = tempItem.id;
        SELECTORS.editItemModal.dataset.isNewItem = 'true';
        SELECTORS.editItemModal.dataset.itemType = itemType;

        // Atualizar contefºdo do modal
        const modalTitle = SELECTORS.editItemModal.querySelector('.modal-header h4');
        modalTitle.textContent = `Configurar ${getItemTypeName(itemType)}`;

        SELECTORS.editModalBody.innerHTML = formHTML;

        // Mostrar modal
        SELECTORS.editItemModal.classList.add('active');
    }

    function setupEventListeners() {
        // Botão de salvar no header (desktop)
        const headerSaveBtn = document.getElementById('header-save-btn');
        if (headerSaveBtn && typeof headerSaveBtn.addEventListener === 'function') {
            headerSaveBtn.addEventListener('click', (e) => {
                saveAllChanges(e);
            });
        }

        // Botão de salvar mobile
        const mobileSaveBtn = document.getElementById('mobile-save-all-btn');
        if (mobileSaveBtn && typeof mobileSaveBtn.addEventListener === 'function') {
            mobileSaveBtn.addEventListener('click', (e) => {
                saveAllChanges(e);
            });
        }

        // Redirecionar ao clicar no título "Cartão virtual Conecta King" no mobile
        const contentHeader = document.querySelector('.content-header');
        if (contentHeader && typeof contentHeader.addEventListener === 'function') {
            contentHeader.addEventListener('click', (e) => {
                // Verificar se está no mobile
                const isMobile = window.innerWidth <= 768;

                if (isMobile) {
                    // Verificar se não clicou em botões ou outros elementos interativos
                    const target = e.target;
                    const clickedButton = target.closest('button');
                    const clickedLink = target.closest('a');

                    // Se clicou diretamente no header ou em área vazia (não em botões/links)
                    if (!clickedButton && !clickedLink && (target === contentHeader || target.classList.contains('content-header'))) {
                        window.location.href = 'index.html';
                    }
                }
            });
        }
        SELECTORS.addItemBtn.addEventListener('click', async () => {
            SELECTORS.addItemModal.classList.add('active');
            // Sempre recarregar módulos ao abrir (reflete Separação de Pacotes atual)
            userAvailableModules = null;
            await filterModulesByPlan();
        });
        SELECTORS.closeAddModalBtn.addEventListener('click', () => SELECTORS.addItemModal.classList.remove('active'));
        SELECTORS.addItemModal.addEventListener('click', e => { if (e.target === SELECTORS.addItemModal) SELECTORS.addItemModal.classList.remove('active'); });
        SELECTORS.buttonAlignOptions.forEach(radio => {
            radio.addEventListener('change', updateLivePreviewFromForm);
        });
        SELECTORS.addItemModal.addEventListener('click', async e => {
            if (e.target === SELECTORS.addItemModal) {
                SELECTORS.addItemModal.classList.remove('active');
                return;
            }

            const choiceBtn = e.target.closest('.module-choice-card');
            if (choiceBtn) {
                const itemType = choiceBtn.dataset.itemType;

                // Verificar limite de links antes de adicionar (módulo isolado)
                try {
                    const checkResponse = await safeFetch(`${API_URL}/api/link-limits/check/${itemType}`, {
                        headers: HEADERS_AUTH
                    });

                    if (checkResponse.ok) {
                        const checkData = await checkResponse.json();
                        if (checkData.success && checkData.data && !checkData.data.allowed) {
                            // Limite atingido - mostrar mensagem de upgrade
                            const limitInfo = checkData.data;
                            const moduleName = ITEM_TYPE_LABELS_FOR_VCARD[itemType] || itemType;

                            let upgradeMessage = `Você atingiu o limite de ${limitInfo.limit} links do tipo "${moduleName}" no seu plano atual.\n\n`;
                            upgradeMessage += `Links atuais: ${limitInfo.current} de ${limitInfo.limit}\n\n`;

                            // A sugestão de upgrade virá do backend quando tentar criar o item
                            upgradeMessage += 'Faça upgrade do seu plano para adicionar mais links.';

                            if (confirm(upgradeMessage + '\n\nDeseja ver os planos disponíveis?')) {
                                // Abrir aba de assinatura
                                const assinaturaLink = document.querySelector('[data-target="assinatura-pane"]');
                                if (assinaturaLink) {
                                    assinaturaLink.click();
                                }
                            }

                            return; // Não adicionar o módulo
                        }
                    }
                } catch (limitError) {
                    // Se houver erro na verificação, logar mas continuar (comportamento seguro)
                    console.warn('Erro ao verificar limite de links (continuando):', limitError.message);
                }

                // Perguntar quantos módulos adicionar (1 a 10)
                const qtyMsg = 'Quantos módulos deseja adicionar? (1 a 10)';
                const qtyStr = window.prompt(qtyMsg, '1');
                if (qtyStr == null || qtyStr.trim() === '') {
                    return;
                }
                let qty = parseInt(qtyStr, 10);
                if (isNaN(qty) || qty < 1) qty = 1;
                if (qty > 10) qty = 10;

                // Verificar limite novamente considerando a quantidade
                try {
                    const checkResponse = await safeFetch(`${API_URL}/api/link-limits/check/${itemType}`, {
                        headers: HEADERS_AUTH
                    });

                    if (checkResponse.ok) {
                        const checkData = await checkResponse.json();
                        if (checkData.success && checkData.data && checkData.data.limit !== null) {
                            const limitInfo = checkData.data;
                            const available = limitInfo.limit - limitInfo.current;

                            if (qty > available) {
                                const moduleName = ITEM_TYPE_LABELS_FOR_VCARD[itemType] || itemType;
                                alert(`Você só pode adicionar mais ${available} link(s) do tipo "${moduleName}". Limite do plano: ${limitInfo.limit} links.\n\nAjustando quantidade para ${available}.`);
                                qty = Math.max(1, available);

                                if (qty === 0) {
                                    return; // Não pode adicionar nenhum
                                }
                            }
                        }
                    }
                } catch (limitError) {
                    console.warn('Erro ao verificar limite antes de adicionar:', limitError.message);
                }

                // Fechar modal de adicionar
                SELECTORS.addItemModal.classList.remove('active');

                // IMPORTANTE: alguns módulos são criados DIRETAMENTE no servidor (não espera "Publicar alterações")
                // KingSelection precisa de itemId real para gerenciar galerias no painel dedicado
                if (itemType === 'sales_page' || itemType === 'digital_form' || itemType === 'agenda' || itemType === 'king_selection' || itemType === 'convite' || itemType === 'wifi') {
                    console.log(`z. Criando ${qty} ${itemType} DIRETAMENTE no servidor...`);
                    try {
                        for (let i = 0; i < qty; i++) {
                            const postBody = {
                                item_type: itemType,
                                is_active: true,
                                display_order: 999
                            };
                            if (itemType === 'wifi') {
                                postBody.title = 'Wi-Fi (QR Code)';
                                postBody.icon_class = 'fas fa-wifi';
                                postBody.destination_url = JSON.stringify({
                                    ssid: '',
                                    password: '',
                                    security: 'WPA',
                                    hidden: false,
                                    display_format: 'button',
                                    banner_image_url: '',
                                    logo_url: '',
                                    logo_size: 48
                                });
                                postBody.logo_size = 48;
                            }
                            const response = await fetch(`${API_URL}/api/profile/items`, {
                                method: 'POST',
                                headers: HEADERS,
                                body: JSON.stringify(postBody)
                            });
                            if (!response.ok) {
                                const errorData = await response.json().catch(() => ({ message: `Erro ao criar ${itemType}` }));

                                // Verificar se é erro de limite excedido
                                if (response.status === 403 && errorData.error === 'LIMIT_EXCEEDED') {
                                    let moduleName = 'módulo';
                                    if (itemType === 'sales_page') moduleName = 'página de vendas';
                                    else if (itemType === 'digital_form') moduleName = 'formulário digital';
                                    else if (itemType === 'agenda') moduleName = 'agenda inteligente';
                                    else if (itemType === 'convite') moduleName = 'convite digital';
                                    else if (itemType === 'wifi') moduleName = 'Wi-Fi (QR Code)';

                                    let errorMsg = `Limite atingido: ${errorData.message || `Você atingiu o limite de links do tipo ${moduleName}`}\n\n`;
                                    errorMsg += `Links atuais: ${errorData.current || 0} de ${errorData.limit || 0}\n\n`;

                                    if (errorData.upgrade_suggestion) {
                                        errorMsg += `Y' Sugestão: Faça upgrade para o plano "${errorData.upgrade_suggestion.plan_name}" para ter ${errorData.upgrade_suggestion.new_limit === null ? 'ilimitados' : errorData.upgrade_suggestion.new_limit} links disponíveis.\n\n`;
                                        errorMsg += `Deseja ver os planos disponíveis?`;

                                        if (confirm(errorMsg)) {
                                            const assinaturaLink = document.querySelector('[data-target="assinatura-pane"]');
                                            if (assinaturaLink) {
                                                assinaturaLink.click();
                                            }
                                        }
                                    } else {
                                        errorMsg += 'Faça upgrade do seu plano para adicionar mais links.';
                                        alert(errorMsg);
                                    }

                                    // Parar de criar mais itens
                                    break;
                                }

                                throw new Error(errorData.message || `Erro ao criar ${itemType}`);
                            }
                            const newItem = await response.json();
                            console.log(`${itemType} criado (${i + 1}/${qty}):`, newItem);
                            await new Promise(resolve => setTimeout(resolve, 200));
                        }
                        await fetchProfileData(true);
                        setTimeout(() => { renderEditor(window.currentProfileData); }, 100);
                        return;
                    } catch (error) {
                        console.error(`O Erro ao criar ${itemType}:`, error);
                        let moduleName = 'módulo';
                        if (itemType === 'sales_page') moduleName = 'página de vendas';
                        else if (itemType === 'digital_form') moduleName = 'formulário digital';
                        else if (itemType === 'agenda') moduleName = 'agenda inteligente';
                        else if (itemType === 'convite') moduleName = 'convite digital';
                        else if (itemType === 'wifi') moduleName = 'Wi-Fi (QR Code)';

                        // Não mostrar erro se já foi tratado acima (limite excedido)
                        if (error.message && !error.message.includes('Limite atingido')) {
                            alert(`Não foi possível criar o ${moduleName}: ${error.message}`);
                        }
                        return;
                    }
                }

                // Para outros módulos: criar localmente (qty vezes)
                console.log(`z. Adicionando ${qty} módulo(s) ${itemType} localmente...`);
                if (!window.currentProfileData) {
                    window.currentProfileData = { details: {}, items: [] };
                }
                if (!window.currentProfileData.items) {
                    window.currentProfileData.items = [];
                }
                let lastTempId = null;
                for (let i = 0; i < qty; i++) {
                    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    lastTempId = tempId;
                    const newItem = {
                        id: tempId,
                        item_type: itemType,
                        title: getItemTypeName(itemType),
                        destination_url: itemType === 'wifi'
                            ? JSON.stringify({ ssid: '', password: '', security: 'WPA', hidden: false, display_format: 'button', banner_image_url: '', logo_url: '', logo_size: 48 })
                            : itemType === 'texto_com_botao'
                            ? JSON.stringify({ url: '', button_label: 'Inscrever-se', eyebrow: '', lines: [], template: 'evento' })
                            : itemType === 'whatsapp' ? '' : (itemType === 'email' ? '' : '#'),
                        pix_key: '',
                        recipient_name: '',
                        pix_amount: '',
                        pix_description: '',
                        pdf_url: '',
                        aspect_ratio: itemType === 'banner' ? 'tarja' : 'auto',
                        icon_class: getDefaultIcon(itemType),
                        is_active: true,
                        display_order: 999,
                        image_url: null,
                        logo_size: itemType === 'wifi' ? 48 : 24
                    };
                    window.currentProfileData.items.push(newItem);
                }
                try {
                    const container = SELECTORS.itemsContainer || document.getElementById('items-container');
                    if (container) {
                        try {
                            renderEditor(window.currentProfileData);
                            if (lastTempId) {
                                setTimeout(() => {
                                    const newItemEl = document.querySelector(`[data-id="${lastTempId}"]`);
                                    if (newItemEl) newItemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }, 100);
                            }
                        } catch (renderError) {
                            console.error('O Erro ao renderizar:', renderError);
                            alert(`Erro ao adicionar módulo: ${renderError.message}`);
                        }
                    } else {
                        alert('Erro: Container de módulos não encontrado. Atualize a página.');
                    }
                } catch (error) {
                    console.error("Erro ao criar item(s) localmente:", error);
                    alert(`Erro ao adicionar módulo: ${error.message}`);
                }
            }
        });
        SELECTORS.backgroundTypeOptions.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const bgType = e.target.value;
                if (bgType === 'image') {
                    SELECTORS.backgroundColorContainer.style.display = 'none';
                    SELECTORS.backgroundImageContainer.style.display = 'block';
                } else {
                    SELECTORS.backgroundColorContainer.style.display = 'block';
                    SELECTORS.backgroundImageContainer.style.display = 'none';
                }
                updateLivePreviewFromForm();
            });
        });
        // Atualizar preview ao mudar Salvar Contato ou Bíblia (visível/oculto)
        document.addEventListener('change', (e) => {
            if (e.target && (e.target.name === 'vcard-toggle' || e.target.name === 'bible-toggle' || e.target.name === 'bible-verse-position' || e.target.name === 'bible-verse-size')) {
                if (typeof updateLivePreviewFromForm === 'function') updateLivePreviewFromForm();
            }
        });
        const openPreview = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (!SELECTORS.livePreview) return;
            SELECTORS.livePreview.classList.add('visible');
            document.body.classList.add('preview-is-open');
            document.body.style.overflow = 'hidden';

            // Scroll para o topo do preview
            SELECTORS.livePreview.scrollTop = 0;
        };

        const closePreview = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (!SELECTORS.livePreview) return;
            SELECTORS.livePreview.classList.remove('visible');
            document.body.classList.remove('preview-is-open');
            document.body.style.overflow = '';
        };

        if (SELECTORS.mobilePreviewBtn) {
            SELECTORS.mobilePreviewBtn.addEventListener('click', openPreview);
            SELECTORS.mobilePreviewBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                openPreview(e);
            }, { passive: false });
            SELECTORS.mobilePreviewBtn.style.touchAction = 'manipulation';
            SELECTORS.mobilePreviewBtn.style.webkitTapHighlightColor = 'transparent';
        }

        if (SELECTORS.previewCloseBtn) {
            SELECTORS.previewCloseBtn.addEventListener('click', closePreview);
            SELECTORS.previewCloseBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                closePreview(e);
            }, { passive: false });
            SELECTORS.previewCloseBtn.style.touchAction = 'manipulation';
        }

        if (SELECTORS.livePreview) {
            // Fechar ao clicar/tocar no overlay do preview
            SELECTORS.livePreview.addEventListener('click', (e) => {
                if (e.target === SELECTORS.livePreview || e.target.classList.contains('live-preview')) {
                    closePreview(e);
                }
            });

            SELECTORS.livePreview.addEventListener('touchend', (e) => {
                if (e.target === SELECTORS.livePreview || e.target.classList.contains('live-preview')) {
                    e.preventDefault();
                    closePreview(e);
                }
            }, { passive: false });

            // Prevenir scroll dentro do preview no mobile
            SELECTORS.livePreview.addEventListener('touchmove', (e) => {
                const previewContent = SELECTORS.livePreview.querySelector('.preview-card');
                if (previewContent && previewContent.contains(e.target)) {
                    // Permitir scroll apenas dentro do conteúdo do preview
                    return;
                }
                // Prevenir scroll no overlay
                if (e.target === SELECTORS.livePreview) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
        if (SELECTORS.backgroundImageOpacityPicker) {
            SELECTORS.backgroundImageOpacityPicker.addEventListener('input', updateLivePreviewFromForm);
        }
        SELECTORS.itemsContainer.addEventListener('click', e => {
            const editBtn = e.target.closest('.edit-item-btn, .module-action-btn.edit');
            const deleteBtn = e.target.closest('.delete-item-btn, .module-action-btn.delete');
            const duplicateBtn = e.target.closest('.duplicate-item-btn, .module-action-btn.duplicate');
            const iconPicker = e.target.closest('.item-icon-picker');
            const uploadArea = e.target.closest('.image-upload-area');
            const logoUploadArea = e.target.closest('.logo-upload-area');
            const removeLogoBtn = e.target.closest('.remove-logo-btn');

            if (editBtn) {
                const itemEl = editBtn.closest('.item, .module-item');
                const itemType = itemEl?.dataset?.itemType;
                const itemId = itemEl?.dataset?.id || editBtn?.dataset?.itemId;

                console.log('[DASHBOARD] Clique em editar:', {
                    itemType,
                    itemId,
                    itemEl: !!itemEl,
                    editBtn: !!editBtn
                });

                openEditModal(itemEl);
            }

            if (duplicateBtn) {
                e.preventDefault();
                e.stopPropagation();
                const itemEl = duplicateBtn.closest('.item, .module-item');
                const itemId = itemEl?.dataset?.id || duplicateBtn?.dataset?.itemId;
                if (!itemId || String(itemId).startsWith('temp_')) {
                    alert('Publique as alterações primeiro para poder duplicar este módulo.');
                    return;
                }
                duplicateItem(itemId);
                return;
            }

            if (deleteBtn) {
                const itemEl = deleteBtn.closest('.item, .module-item');
                if (!itemEl) {
                    console.error('O Elemento do item não encontrado ao tentar deletar');
                    return;
                }
                const itemId = itemEl.dataset?.id;
                if (!itemId) {
                    console.error('O ID do item não encontrado no dataset');
                    alert('Erro: Não foi possível identificar o módulo para deletar.');
                    return;
                }
                if (confirm('Tem certeza que deseja excluir este módulo?')) {
                    deleteItem(itemId);
                }
            }

            // Toggle de módulo
            const toggleInput = e.target.closest('.module-toggle-input');
            if (toggleInput && toggleInput.dataset) {
                const itemId = toggleInput.dataset.itemId;
                if (itemId) {
                    const isActive = toggleInput.checked;
                    // Atualizar status ativo do módulo
                    updateItemActiveStatus(itemId, isActive);
                }
            }

            if (uploadArea) {
                const itemEl = uploadArea.closest('.item, .module-item');
                const fileInput = uploadArea.querySelector('.item-file-input');
                if (fileInput) {
                    fileInput.click();
                }
            }

            if (logoUploadArea && !e.target.closest('.remove-logo-btn')) {
                const fileInput = logoUploadArea.querySelector('.item-logo-file-input');
                if (fileInput) {
                    // Prevenir múltiplos cliques simultâneos
                    if (fileInput.dataset.uploading === 'true') {
                        console.log('Upload de logo já em andamento, ignorando clique');
                        return;
                    }
                    fileInput.dataset.uploading = 'true';
                    fileInput.click();
                    // Resetar flag após um tempo
                    setTimeout(() => {
                        fileInput.dataset.uploading = 'false';
                    }, 1000);
                }
            }

            if (removeLogoBtn) {
                const logoUploadArea = removeLogoBtn.closest('.logo-upload-area');
                const itemEl = logoUploadArea?.closest('.item');
                const modal = logoUploadArea?.closest('#edit-item-modal, .edit-item-modal');

                if (confirm('Tem certeza que deseja remover a logo? O ícone será usado como fallback.')) {
                    const preview = logoUploadArea.querySelector('.item-logo-upload-preview');
                    const uploadText = logoUploadArea.querySelector('.logo-upload-text');
                    const imageUrlInput = logoUploadArea.closest('.item-inputs-edit, #edit-modal-body')?.querySelector('.item-image-url-input') ||
                        modal?.querySelector('.item-image-url-input');

                    if (preview) {
                        preview.src = '';
                        preview.style.display = 'none';
                    }
                    if (uploadText) uploadText.style.display = '';
                    if (removeLogoBtn) removeLogoBtn.style.display = 'none';
                    if (imageUrlInput) imageUrlInput.value = '';

                    // Atualizar preview do item na lista também
                    if (itemEl) {
                        const logoPreview = itemEl.querySelector('.item-logo-preview');
                        const iconPicker = itemEl.querySelector('.item-icon-picker');
                        if (logoPreview) logoPreview.style.display = 'none';
                        if (iconPicker) iconPicker.style.display = 'inline-block';
                    }

                    updateLivePreviewFromForm();
                }
            }

            if (iconPicker) {
                const itemEl = iconPicker.closest('.item');
                activeItemIdForIconPicker = itemEl.dataset.id;
                SELECTORS.iconModal.classList.add('active');
            }
        });
        SELECTORS.itemsContainer.addEventListener('change', async e => {
            const pdfUploadArea = e.target.closest('.pdf-upload-area');
            if (pdfUploadArea) {
                const fileInput = e.target;
                const file = fileInput.files[0];
                if (!file) return;

                const itemEl = fileInput.closest('.item');
                const urlInput = itemEl.querySelector('.item-pdf-url-input');
                const uploadText = pdfUploadArea.querySelector('p');

                itemEl.classList.add('is-uploading');

                try {
                    const result = await uploadPDF(file, (status) => {
                        uploadText.textContent = status;
                    });

                    // Sucesso!
                    urlInput.value = result.pdf_url;
                    itemEl.querySelector('.item-display-dest').textContent = 'Arquivo carregado';
                    updateLivePreviewFromForm();

                } catch (error) {
                    console.error('Erro no upload do PDF:', error);
                    alert(`Erro: ${error.message}`);
                } finally {
                    itemEl.classList.remove('is-uploading');
                }
            }
        });

        if (SELECTORS.backgroundUploadArea) {
            SELECTORS.backgroundUploadArea.addEventListener('click', () => {
                SELECTORS.backgroundFileInput.click();
            });
        }

        if (SELECTORS.backgroundFileInput) {
            SELECTORS.backgroundFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    openCropper(file, 'background');
                }
            });
        }

        SELECTORS.editModalBody.addEventListener('change', e => {
            if (e.target.name === 'aspect-ratio-selector') {
                const itemId = SELECTORS.editItemModal.dataset.editingId;
                const itemEl = document.querySelector(`.item[data-id='${itemId}']`);
                if (itemEl) {
                    itemEl.dataset.aspectRatio = e.target.value;
                    console.log(`[ASPECT RATIO] Aspect ratio atualizado para: ${e.target.value}`);
                    // Atualizar preview em tempo real
                    updateLivePreviewFromForm();
                }
            }

            if (e.target.classList.contains('wifi-display-format-input')) {
                const itemId = SELECTORS.editItemModal?.dataset?.editingId;
                const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
                if (!itemEl || itemEl.dataset.itemType !== 'wifi') return;
                const v = e.target.value;
                itemEl.querySelectorAll('.wifi-display-format-input').forEach(r => { r.checked = r.value === v; });
                const logoSec = itemEl.querySelector('.wifi-logo-section');
                const banSec = itemEl.querySelector('.wifi-banner-section');
                if (logoSec) logoSec.style.display = v === 'banner' ? 'none' : 'block';
                if (banSec) banSec.style.display = v === 'banner' ? 'block' : 'none';
                const mLogo = SELECTORS.editItemModal?.querySelector('.wifi-modal-logo-section');
                const mBan = SELECTORS.editItemModal?.querySelector('.wifi-modal-banner-section');
                if (mLogo) mLogo.style.display = v === 'banner' ? 'none' : 'block';
                if (mBan) mBan.style.display = v === 'banner' ? 'block' : 'none';
                const displayDest = itemEl.querySelector('.item-display-dest');
                const ssid = (itemEl.querySelector('.wifi-ssid-input')?.value || '').trim();
                if (displayDest) {
                    displayDest.textContent = ssid ? `${v === 'banner' ? 'Banner' : 'Botão'} · Rede: ${ssid}` : 'Informe o nome da rede (SSID)';
                }
                updateLivePreviewFromForm();
            }

            if (e.target.id === 'edit-wifi-hidden') {
                const itemId = SELECTORS.editItemModal?.dataset?.editingId;
                const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
                if (itemEl && itemEl.dataset.itemType === 'wifi') {
                    const h = itemEl.querySelector('.wifi-hidden-input');
                    if (h) h.checked = !!e.target.checked;
                }
            }

            if (e.target.id === 'edit-wifi-security') {
                const itemId = SELECTORS.editItemModal?.dataset?.editingId;
                const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
                if (itemEl && itemEl.dataset.itemType === 'wifi') {
                    const s = itemEl.querySelector('.wifi-security-input');
                    if (s) s.value = e.target.value;
                }
            }

            // Event listener para upload de imagem de banner no modal
            if (e.target.classList.contains('item-file-input')) {
                const file = e.target.files[0];
                if (!file) return;

                // PRIORIDADE 1: Pegar do próprio input (data attributes)
                let itemId = e.target.dataset.itemId;
                let itemType = e.target.dataset.itemType;

                // PRIORIDADE 2: Pegar do elemento pai (upload area)
                if (!itemId || !itemType) {
                    const uploadArea = e.target.closest('.image-upload-area');
                    if (uploadArea) {
                        itemId = uploadArea.dataset.itemId || itemId;
                        itemType = uploadArea.dataset.itemType || itemType;
                    }
                }

                // PRIORIDADE 3: Pegar do modal
                if (!itemId || !itemType) {
                    itemId = SELECTORS.editItemModal?.dataset?.editingId || itemId;
                    itemType = SELECTORS.editItemModal?.dataset?.itemType || itemType;
                }

                // PRIORIDADE 4: Pegar do item na lista
                if (!itemId || !itemType) {
                    const itemEl = e.target.closest('.item, .module-item');
                    if (itemEl) {
                        itemId = itemEl.dataset.id || itemId;
                        itemType = itemEl.dataset.itemType || itemType;
                    }
                }

                console.log(`[UPLOAD] Arquivo selecionado:`, {
                    itemId,
                    itemType,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    fonteItemId: e.target.dataset.itemId ? 'input' : (e.target.closest('.image-upload-area')?.dataset.itemId ? 'uploadArea' : (SELECTORS.editItemModal?.dataset.editingId ? 'modal' : 'lista')),
                    fonteItemType: e.target.dataset.itemType ? 'input' : (e.target.closest('.image-upload-area')?.dataset.itemType ? 'uploadArea' : (SELECTORS.editItemModal?.dataset.itemType ? 'modal' : 'lista'))
                });

                // Banner normal ou banner Wi-Fi
                if (file && (itemType === 'banner' || itemType === 'wifi-banner')) {
                    const cropTrigger = itemType === 'wifi-banner' ? 'wifi-banner' : 'banner';
                    const modalItemType = SELECTORS.editItemModal?.dataset?.itemType;
                    console.log(`[BANNER] Upload no modal (${cropTrigger}) item ${itemId}:`, file.name);
                    let itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);

                    if (!itemEl && itemId && cropTrigger === 'wifi-banner') {
                        itemEl = { dataset: { id: itemId, itemType: 'wifi' } };
                        console.log(`[WIFI-BANNER] Item não encontrado na lista, usando referência temporária`);
                    } else if (!itemEl && itemId) {
                        itemEl = { dataset: { id: itemId, itemType: 'banner' } };
                        console.log(`[BANNER] Item não encontrado na lista, usando referência temporária`);
                    }

                    if (itemEl) {
                        if (cropTrigger === 'wifi-banner' && modalItemType === 'wifi' && typeof itemEl.querySelector !== 'function') {
                            itemEl = document.querySelector(`.module-item[data-id='${itemId}']`) || itemEl;
                        }
                        console.log(`[BANNER] Abrindo cropper (${cropTrigger}) ${itemId}`);
                        openCropper(file, cropTrigger, itemEl);
                    } else {
                        console.error(`[BANNER] Item ${itemId} não encontrado para upload`);
                        alert('Erro: Não foi possível encontrar o módulo. Tente fechar e abrir o modal novamente.');
                    }
                } else if (file && !itemType) {
                    console.error(`[UPLOAD] itemType não encontrado em nenhuma fonte!`);
                    console.error(`[UPLOAD] Debug:`, {
                        inputDataset: e.target.dataset,
                        uploadAreaDataset: e.target.closest('.image-upload-area')?.dataset,
                        modalDataset: SELECTORS.editItemModal?.dataset,
                        modalAtivo: SELECTORS.editItemModal?.classList.contains('active')
                    });
                    alert('Erro: Não foi possível detectar o tipo do módulo. Tente fechar e abrir o modal novamente.');
                }
            }
        });

        SELECTORS.itemsContainer.addEventListener('input', e => {
            if (e.target.classList.contains('item-image-url-input')) {
                const bannerItem = e.target.closest('.item');
                bannerItem.querySelector('.banner-preview-thumb').src = e.target.value;
            }
        });
        document.querySelector('.editor-area').addEventListener('input', updateLivePreviewFromForm);

        document.addEventListener('click', async function (e) {
            const actionBtn = e.target.closest('.banner-copy-model-btn, .banner-use-model-btn');
            if (!actionBtn) return;
            const model = String(actionBtn.dataset.model || '').trim();
            if (!model) return;
            e.preventDefault();
            if (actionBtn.classList.contains('banner-copy-model-btn')) {
                try {
                    await navigator.clipboard.writeText(model);
                    const prev = actionBtn.textContent;
                    actionBtn.textContent = 'Copiado!';
                    setTimeout(() => { actionBtn.textContent = prev; }, 1200);
                } catch (err) {
                    window.prompt('Copie o modelo:', model);
                }
                return;
            }
            const itemId = SELECTORS.editItemModal?.dataset?.editingId
                || actionBtn.closest('.module-item, .item')?.dataset?.id;
            const modal = itemId ? document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"]`) : SELECTORS.editItemModal;
            const destModal = modal?.querySelector('#edit-dest-url');
            const itemEl = itemId ? document.querySelector(`.module-item[data-id="${itemId}"], .item[data-id="${itemId}"]`) : actionBtn.closest('.module-item, .item');
            const destItem = itemEl?.querySelector('.item-destination-url-input');
            if (destModal) destModal.value = model;
            if (destItem) destItem.value = model;
            const prev = actionBtn.textContent;
            actionBtn.textContent = 'Colado na URL';
            setTimeout(() => { actionBtn.textContent = prev; }, 1200);
            if (typeof updateLivePreviewFromForm === 'function') updateLivePreviewFromForm();
        });

        // Event listener para atualizar preview e item da lista em tempo real quando campos do modal mudarem
        SELECTORS.editModalBody.addEventListener('input', e => {
            const itemId = SELECTORS.editItemModal?.dataset.editingId;
            if (!itemId || !SELECTORS.editItemModal.classList.contains('active')) return;

            const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
            if (!itemEl) return;

            const itemType = itemEl.dataset.itemType;
            const targetId = e.target.id;

            // Atualizar campos do PIX/PIX QR Code em tempo real
            if (itemType === 'pix' || itemType === 'pix_qrcode') {
                if (targetId === 'edit-title') {
                    const titleInput = itemEl.querySelector('.item-title-input');
                    const displayTitle = itemEl.querySelector('.item-display-title');
                    const moduleName = itemEl.querySelector('.module-name');
                    if (titleInput) titleInput.value = e.target.value;
                    if (displayTitle) displayTitle.textContent = e.target.value || 'PIX QR Code';
                    if (moduleName) moduleName.textContent = e.target.value || 'PIX QR Code';
                } else if (targetId === 'edit-recipient-name') {
                    const recipientInput = itemEl.querySelector('.item-recipient-name-input');
                    if (recipientInput) recipientInput.value = e.target.value;
                } else if (targetId === 'edit-pix-key') {
                    const pixKeyInput = itemEl.querySelector('.item-pix-key-input');
                    const displayDest = itemEl.querySelector('.item-display-dest');
                    if (pixKeyInput) pixKeyInput.value = e.target.value;
                    if (displayDest) displayDest.textContent = e.target.value || 'Nenhuma chave configurada';
                } else if (targetId === 'edit-pix-amount') {
                    const pixAmountInput = itemEl.querySelector('.item-pix-amount-input');
                    if (pixAmountInput) pixAmountInput.value = e.target.value;
                } else if (targetId === 'edit-pix-description') {
                    const pixDescriptionInput = itemEl.querySelector('.item-pix-description-input');
                    if (pixDescriptionInput) pixDescriptionInput.value = e.target.value;
                }

                // Atualizar preview em tempo real
                updateLivePreviewFromForm();
            } else if (itemType === 'wifi') {
                const modal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"]`);
                const listTitle = itemEl.querySelector('.item-title-input');
                const listSsid = itemEl.querySelector('.wifi-ssid-input');
                const listPass = itemEl.querySelector('.wifi-password-input');
                const listSec = itemEl.querySelector('.wifi-security-input');
                const listHidden = itemEl.querySelector('.wifi-hidden-input');
                const listBanner = itemEl.querySelector('.wifi-banner-url-input');
                const listLogo = itemEl.querySelector('.wifi-logo-url-input');
                const listLogoSize = itemEl.querySelector('.wifi-logo-size-input');
                if (targetId === 'edit-title' && modal) {
                    const v = modal.querySelector('#edit-title')?.value;
                    if (listTitle && v !== undefined) listTitle.value = v;
                    const displayTitle = itemEl.querySelector('.item-display-title');
                    const moduleName = itemEl.querySelector('.module-name');
                    if (displayTitle) displayTitle.textContent = v;
                    if (moduleName) moduleName.textContent = v;
                }
                if (targetId === 'edit-wifi-ssid' && modal) {
                    const v = modal.querySelector('#edit-wifi-ssid')?.value;
                    if (listSsid && v !== undefined) listSsid.value = v;
                    const displayDest = itemEl.querySelector('.item-display-dest');
                    const fmt = modal.querySelector('.wifi-display-format-input:checked')?.value || 'button';
                    const ssid = (v || '').trim();
                    if (displayDest) {
                        displayDest.textContent = ssid ? `${fmt === 'banner' ? 'Banner' : 'Botão'} · Rede: ${ssid}` : 'Informe o nome da rede (SSID)';
                    }
                }
                if (targetId === 'edit-wifi-password' && modal && listPass) {
                    listPass.value = modal.querySelector('#edit-wifi-password')?.value || '';
                }
                if (e.target.id === 'edit-wifi-security' && modal && listSec) {
                    listSec.value = modal.querySelector('#edit-wifi-security')?.value || 'WPA';
                }
                if (targetId === 'edit-wifi-hidden' && modal && listHidden) {
                    listHidden.checked = !!modal.querySelector('#edit-wifi-hidden')?.checked;
                }
                if (targetId === 'edit-wifi-banner-url' && modal && listBanner) {
                    listBanner.value = modal.querySelector('#edit-wifi-banner-url')?.value || '';
                }
                if (targetId === 'edit-wifi-logo-url' && modal && listLogo) {
                    listLogo.value = modal.querySelector('#edit-wifi-logo-url')?.value || '';
                }
                if (targetId === 'edit-wifi-logo-size' && modal && listLogoSize) {
                    listLogoSize.value = modal.querySelector('#edit-wifi-logo-size')?.value || '';
                    itemEl.dataset.logoSize = listLogoSize.value;
                }
                updateLivePreviewFromForm();
            }
            // Atualizar outros tipos de módulos também
            else if (targetId === 'edit-title') {
                const titleInput = itemEl.querySelector('.item-title-input');
                const displayTitle = itemEl.querySelector('.item-display-title');
                const moduleName = itemEl.querySelector('.module-name');
                if (titleInput) titleInput.value = e.target.value;
                if (displayTitle) displayTitle.textContent = e.target.value;
                if (moduleName) moduleName.textContent = e.target.value;
                updateLivePreviewFromForm();
            } else if (targetId === 'edit-dest-url') {
                const destInput = itemEl.querySelector('.item-destination-url-input');
                const displayDest = itemEl.querySelector('.item-display-dest');
                if (destInput) destInput.value = e.target.value;
                if (displayDest) displayDest.textContent = e.target.value || '#';
                updateLivePreviewFromForm();
            }
        });
        SELECTORS.sidebarNavLinks.forEach(link => {
            if (link.id !== 'logout-btn' && link.id !== 'adm-link' && link.id !== 'personalizacao-logo-link' && !link.href.includes('conta.html') && !link.href.includes('admin') && !link.href.includes('business')) {
                if (link.id === 'king-forms-sidebar-link') {
                    return;
                }
                if (link.id === 'king-selection-sidebar-link') {
                    // Garante destino canônico mesmo sem JS (fallback do href no HTML)
                    link.href = kingSelectionAdminUrl();
                    link.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await window.navigateToKingSelectionAdmin();
                    }, false);
                    return;
                }
                if (link.id === 'recibos-orcamentos-sidebar-link') {
                    return;
                }

                if (link.id === 'bible-sidebar-link') {
                    link.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                            const details = (window.currentProfileData && window.currentProfileData.details) || {};
                            const slug = String(details.profile_slug || details.slug || '').trim();
                            let itemId = (window.currentProfileData && window.currentProfileData.items)
                                ? (window.currentProfileData.items.find(function (it) { return it.item_type === 'bible'; }) || {}).id
                                : null;
                            if (!itemId) {
                                try {
                                    itemId = sessionStorage.getItem('bible_item_id') || sessionStorage.getItem('bible_panel_item_id');
                                } catch (e0) {}
                            }
                            if (!itemId) {
                                const res = await fetch(`${API_URL}/api/profile`, { headers: HEADERS });
                                const data = await res.json().catch(function () { return {}; });
                                if (res.ok && data.items && Array.isArray(data.items)) {
                                    const bib = data.items.find(function (it) { return it.item_type === 'bible'; });
                                    if (bib) itemId = bib.id;
                                }
                            }
                            if (!itemId) {
                                const createRes = await fetch(`${API_URL}/api/profile/items`, {
                                    method: 'POST',
                                    headers: HEADERS,
                                    body: JSON.stringify({ item_type: 'bible', title: 'Bíblia', is_active: true, display_order: 999 })
                                });
                                const createData = await createRes.json().catch(function () { return {}; });
                                if (!createRes.ok) throw new Error(createData.message || 'Erro ao criar Bíblia');
                                itemId = createData.id;
                            }
                            try {
                                sessionStorage.setItem('bible_item_id', String(itemId));
                                sessionStorage.setItem('bible_panel_item_id', String(itemId));
                            } catch (e) {}
                            if (slug) {
                                window.location.href = `${API_URL}/${encodeURIComponent(slug)}/biblia`;
                            } else {
                                window.location.href = 'bibliaking.html';
                            }
                        } catch (err) {
                            alert(err.message || 'Erro ao abrir Bíblia.');
                        }
                    }, false);
                    return;
                }
                link.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Navegar para o painel correto
                    SELECTORS.sidebarNavLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    const targetId = link.dataset.target;

                    if (targetId) {
                        // Esconder todos os painéis
                        document.querySelectorAll('.main-content').forEach(pane => {
                            pane.classList.remove('active');
                            pane.style.display = 'none';
                        });

                        // King Forms: ocultar Pré-visualização para o conteúdo ocupar toda a área
                        var livePreview = document.querySelector('.live-preview');
                        if (livePreview) {
                            livePreview.style.display = targetId === 'king-forms-pane' ? 'none' : '';
                        }

                        // Mostrar o painel correto
                        const targetPane = document.getElementById(targetId);
                        if (targetPane) {
                            targetPane.classList.add('active');
                            targetPane.style.display = 'flex';
                            if (targetId === 'king-forms-pane') {
                                var kfIframe = document.getElementById('king-forms-iframe');
                                if (kfIframe && (!kfIframe.src || kfIframe.src === 'about:blank' || kfIframe.src.endsWith('about:blank'))) kfIframe.src = 'kingForms.html';
                            }
                            // contratos/agenda/meu-site descontinuados — ignorar
                        }
                        // Atualizar URL com o hash do painel para que, ao atualizar a página, permaneça na mesma seção
                        const basePath = window.location.pathname || 'dashboard.html';
                        let newHash = targetId;
                        if (targetId === 'finance-pane') {
                            const curHash = (window.location.hash || '').replace(/^#/, '');
                            const m = curHash.match(/^finance-pane-tab-(.+)$/);
                            let tab = m && ['resumo', 'fluxo', 'trabalhos', 'bens', 'cartoes', 'meta', 'terceiros', 'serasa'].includes(m[1]) ? m[1] : localStorage.getItem('finance_active_tab');
                            if (tab && ['resumo', 'fluxo', 'trabalhos', 'bens', 'cartoes', 'meta', 'terceiros', 'serasa'].includes(tab)) {
                                newHash = 'finance-pane-tab-' + tab;
                            }
                        }
                        window.history.replaceState(null, '', basePath + '#' + newHash);
                        try { localStorage.setItem('dashboard_last_pane', newHash); } catch (e) { }
                    }

                    // Fechar menu mobile após navegação
                    if (window.innerWidth <= 768) {
                        const sidebar = document.getElementById('sidebar');
                        if (sidebar && sidebar.classList.contains('mobile-open')) {
                            setTimeout(() => {
                                sidebar.classList.remove('mobile-open');
                                document.body.classList.remove('mobile-menu-open');
                                document.body.style.overflow = '';
                                const overlay = document.getElementById('sidebar-overlay');
                                if (overlay) overlay.classList.remove('active');
                            }, 200);
                        }
                    }
                }, false); // Usar bubble phase para não interferir com outros listeners
            }
        });

        // Sidebar tabs (Perfis/Empresa) - melhorado para mobile
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const tabType = tab.dataset.tab;

                if (tabType === 'times') {
                    // Navegar para o painel empresarial
                    window.location.href = 'business/index.html';
                } else {
                    // Mostrar perfil pessoal
                    showPersonalProfile();
                }

                // Não fechar o menu ao trocar de aba (comportamento esperado)
            });
        });

        // Função para carregar clientes da empresa
        async function loadEmpresaClients() {
            try {
                const response = await fetch(`${API_URL}/api/business/team`, {
                    method: 'GET',
                    headers: HEADERS
                });

                if (response.ok) {
                    const clients = await response.json();
                    console.log('Clientes da empresa:', clients);
                    // TODO: Renderizar lista de clientes na interface quando necessário
                } else if (response.status === 403) {
                    console.log('Usuário não tem conta empresarial');
                    alert('Você precisa de uma conta empresarial para acessar esta funcionalidade.');
                }
            } catch (error) {
                console.error('Erro ao carregar clientes:', error);
            }
        }

        // Função para mostrar perfil pessoal
        function showPersonalProfile() {
            // Garantir que o handle continue mostrando o @ quando voltar para Perfis
            const sidebarHandle = document.getElementById('sidebar-profile-handle');
            if (sidebarHandle && SELECTORS.profileSlugInput?.value) {
                sidebarHandle.textContent = `@${SELECTORS.profileSlugInput.value}`;
            } else if (sidebarHandle) {
                // Se não tiver slug no input, buscar dos dados do perfil
                const profileData = window.lastProfileData;
                if (profileData?.details?.profile_slug) {
                    sidebarHandle.textContent = `@${profileData.details.profile_slug}`;
                }
            }
        }

        // Botões de informações
        // Event listeners para os botões de formato de avatar
        document.querySelectorAll('.avatar-format-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const format = btn.dataset.format;
                if (format) {
                    updateAvatarFormatSelector(format);
                    await saveAvatarFormat(format);
                }
            });
        });

        // Botão de copiar link do Instagram
        document.getElementById('btn-copy-slug')?.addEventListener('click', async () => {
            const slugInput = document.getElementById('profileSlug');
            if (!slugInput || !slugInput.value) {
                alert('Por favor, preencha o @ do perfil primeiro.');
                return;
            }

            // URL curta: cnking.bio/{slug} (formato curto para Instagram)
            const shortUrl = `https://cnking.bio/${slugInput.value}`;

            try {
                await navigator.clipboard.writeText(shortUrl);
                const btn = document.getElementById('btn-copy-slug');
                if (btn) {
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-check"></i> <span>Copiado!</span>';
                    btn.style.background = 'var(--dourado-principal)';
                    btn.style.color = 'var(--preto-fundo)';

                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.style.background = '';
                        btn.style.color = '';
                    }, 2000);
                }
            } catch (error) {
                console.error('Erro ao copiar:', error);
                // Fallback para navegadores antigos
                const textArea = document.createElement('textarea');
                textArea.value = shortUrl;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    alert('Link copiado! Cole no seu perfil do Instagram.');
                } catch (err) {
                    alert('Erro ao copiar. O link é: ' + shortUrl);
                }
                document.body.removeChild(textArea);
            }
        });


        // Função para mostrar/esconder seções de configuração
        function showConfigSection(sectionName) {
            const expandedContent = SELECTORS.configExpandedContent;
            if (!expandedContent) return;

            // Mostrar o conteúdo expandido
            expandedContent.style.display = 'block';

            // Esconder todas as seções primeiro
            const allSections = expandedContent.querySelectorAll('[data-section]');
            allSections.forEach(section => {
                section.style.display = 'none';
            });

            // Mostrar a seção solicitada
            const targetSection = expandedContent.querySelector(`[data-section="${sectionName}"]`);
            if (targetSection) {
                targetSection.style.display = 'block';

                // Scroll suave para a seção
                setTimeout(() => {
                    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }

            // Remover destaque de todos os botões
            const allConfigButtons = document.querySelectorAll('.config-option-btn');
            allConfigButtons.forEach(btn => {
                btn.classList.remove('active');
            });

            // Destacar o botão clicado
            const clickedButton = document.getElementById(`btn-config-${sectionName}`);
            if (clickedButton) {
                clickedButton.classList.add('active');
            }
        }

        // Event listeners para botões de configuração
        SELECTORS.btnConfigCores?.addEventListener('click', (e) => {
            e.preventDefault();
            showConfigSection('cores');
        });

        SELECTORS.btnConfigFundo?.addEventListener('click', (e) => {
            e.preventDefault();
            showConfigSection('fundo');
        });

        SELECTORS.btnConfigLogoSpacing?.addEventListener('click', (e) => {
            e.preventDefault();
            showConfigSection('logo-spacing');
        });

        SELECTORS.btnConfigCabecalho?.addEventListener('click', (e) => {
            e.preventDefault();
            // Por enquanto, mostrar mensagem ou criar seção de cabeçalho
            // Como não há seção de cabeçalho ainda, vamos criar uma básica
            const expandedContent = SELECTORS.configExpandedContent;
            if (expandedContent) {
                expandedContent.style.display = 'block';
                // Verificar se já existe seção de cabeçalho
                let cabecalhoSection = expandedContent.querySelector('[data-section="cabecalho"]');
                if (!cabecalhoSection) {
                    // Criar seção básica de cabeçalho
                    cabecalhoSection = document.createElement('div');
                    cabecalhoSection.setAttribute('data-section', 'cabecalho');
                    const currentShareImage = window.currentProfileData?.details?.share_image_url || '';
                    cabecalhoSection.innerHTML = `
                        <h4><i class="fas fa-share-alt"></i> Imagem de compartilhamento</h4>
                        <p style="color: var(--text-dark, #999); font-size: 0.9rem; margin-bottom: 15px;">
                            Esta imagem aparecerá quando você compartilhar o link do seu cartão nas redes sociais.
                        </p>
                        <div class="input-group" style="margin-top: 20px;">
                            <label>Proporção da Imagem</label>
                            <div class="aspect-ratio-selector">
                                <input type="radio" id="share-aspect-auto" name="share-aspect-ratio-selector" value="auto" checked>
                                <label for="share-aspect-auto">Automática</label>
                                <input type="radio" id="share-aspect-16-9" name="share-aspect-ratio-selector" value="16:9">
                                <label for="share-aspect-16-9">16:9</label>
                                <input type="radio" id="share-aspect-4-3" name="share-aspect-ratio-selector" value="4:3">
                                <label for="share-aspect-4-3">4:3</label>
                                <input type="radio" id="share-aspect-1-1" name="share-aspect-ratio-selector" value="1:1">
                                <label for="share-aspect-1-1">1:1</label>
                            </div>
                        </div>
                        <div class="input-group" style="margin-top: 20px;">
                            <label>Imagem de Compartilhamento (Clique para enquadrar)</label>
                            <div class="image-upload-area share-image-upload" style="position: relative; border: 2px dashed var(--border-color, #2C2C2F); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: var(--card-background-color, #1C1C21);">
                                <div class="image-preview">
                                    ${currentShareImage ? `<img src="${currentShareImage}" style="max-width: 100%; max-height: 200px; border-radius: 8px;">` : `
                                    <div class="preview-placeholder">
                                        <i class="fas fa-image"></i>
                                        <span>Preview</span>
                                    </div>
                                    `}
                                </div>
                                <div class="upload-info" style="margin-top: 10px;">
                                    <span class="upload-text">${currentShareImage ? 'Alterar Imagem' : 'Adicionar Imagem'}</span>
                                    <small>Enquadre na proporção escolhida</small>
                                </div>
                                <input type="file" class="share-image-file-input" accept="image/*" style="display: none;">
                                <div class="upload-loader" style="display: none;"></div>
                            </div>
                        </div>
                        ${currentShareImage ? `
                        <div class="input-group" style="margin-top: 15px;">
                            <button type="button" class="btn btn-danger" id="remove-share-image-btn" style="width: 100%;">
                                <i class="fas fa-trash"></i> Remover Imagem
                            </button>
                        </div>
                        ` : ''}
                    `;
                    expandedContent.appendChild(cabecalhoSection);

                    // Event listeners para upload de imagem de compartilhamento
                    const shareImageUpload = cabecalhoSection.querySelector('.share-image-upload');
                    const shareImageInput = cabecalhoSection.querySelector('.share-image-file-input');

                    if (shareImageUpload && shareImageInput) {
                        shareImageUpload.addEventListener('click', () => {
                            shareImageInput.click();
                        });

                        shareImageInput.addEventListener('change', async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;

                            // Obter proporção selecionada
                            const selectedRatio = cabecalhoSection.querySelector('input[name="share-aspect-ratio-selector"]:checked')?.value || 'auto';

                            // Abrir cropper
                            openCropper(file, 'share-image', null, selectedRatio);
                        });
                    }

                    // Event listener para remover imagem
                    const removeShareImageBtn = cabecalhoSection.querySelector('#remove-share-image-btn');
                    if (removeShareImageBtn) {
                        removeShareImageBtn.addEventListener('click', async () => {
                            if (confirm('Tem certeza que deseja remover a imagem de compartilhamento?')) {
                                try {
                                    const response = await fetch(`${API_URL}/api/profile/share-image`, {
                                        method: 'PUT',
                                        headers: HEADERS,
                                        body: JSON.stringify({ share_image_url: null })
                                    });

                                    if (response.ok) {
                                        alert('Imagem removida com sucesso!');
                                        // Recarregar dados
                                        await fetchProfileData(true);
                                        // Reabrir seção
                                        SELECTORS.btnConfigCabecalho?.click();
                                    } else {
                                        throw new Error('Erro ao remover imagem');
                                    }
                                } catch (error) {
                                    console.error('Erro ao remover imagem:', error);
                                    alert('Erro ao remover imagem. Tente novamente.');
                                }
                            }
                        });
                    }
                }
                // Esconder outras seções
                const allSections = expandedContent.querySelectorAll('[data-section]');
                allSections.forEach(section => {
                    section.style.display = 'none';
                });
                cabecalhoSection.style.display = 'block';

                // Scroll suave
                setTimeout(() => {
                    cabecalhoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);

                // Remover destaque de todos os botões
                const allConfigButtons = document.querySelectorAll('.config-option-btn');
                allConfigButtons.forEach(btn => {
                    btn.classList.remove('active');
                });

                // Destacar o botão clicado
                SELECTORS.btnConfigCabecalho?.classList.add('active');
            }
        });

        // Temas removidos - usando apenas tema oficial padrão

        // Botão Ver Cartão - abre página pública
        document.getElementById('btn-ver-monocard')?.addEventListener('click', () => {
            const profileSlug = SELECTORS.profileSlugInput?.value || '';
            if (profileSlug) {
                // Construir URL pública correta: tag.conectaking.com.br/{slug}
                const publicUrl = `https://tag.conectaking.com.br/${profileSlug}`;
                window.open(publicUrl, '_blank');
            } else {
                alert('Configure seu @ primeiro para visualizar o cartão público.');
            }
        });

        // Botão desfazer alterações foi removido
        SELECTORS.closeEditModalBtn.addEventListener('click', () => {
            SELECTORS.editItemModal.classList.remove('active');
        });

        SELECTORS.editItemModal.addEventListener('click', e => {
            if (e.target === SELECTORS.editItemModal) {
                SELECTORS.editItemModal.classList.remove('active');
            }

            // NOTA: Handlers para logo-upload-area e remove-logo-btn foram movidos para editModalBody
            // (linha ~8081) para evitar duplicação de eventos, já que editModalBody está dentro de editItemModal.
            // Isso corrige o problema onde o diálogo de seleção de arquivo abria duas vezes.
        });

        SELECTORS.saveEditModalBtn.addEventListener('click', async () => {
            const itemId = SELECTORS.editItemModal.dataset.editingId;
            const isNewItem = SELECTORS.editItemModal.dataset.isNewItem === 'true';
            const itemType = SELECTORS.editItemModal.dataset.itemType;

            if (!itemId) return;

            // NÃO deve mais haver itens novos sendo salvos aqui, mas mantemos para compatibilidade
            if (isNewItem) {
                console.warn('Tentativa de salvar item novo via modal - isso não deveria acontecer');
                SELECTORS.editItemModal.classList.remove('active');
                return;
            }

            // Para item existente, sincronizar dados do modal para o item LOCALMENTE (não salvar no servidor ainda)
            const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
            if (!itemEl) {
                SELECTORS.editItemModal.classList.remove('active');
                return;
            }

            // IMPORTANTE: Botão "OK" salva APENAS localmente (frontend)
            // O botão "Publicar alterações" é que salva no servidor
            console.log(`Y' [OK] Salvando alterações do item ${itemId} apenas localmente (não no servidor ainda)...`);

            // Sincronizar dados do modal para o item no DOM
            syncModalDataToItem();

            // Atualizar preview local
            updateLivePreviewFromForm();

            // Fechar modal
            SELECTORS.editItemModal.classList.remove('active');

            console.log(`Alterações do item ${itemId} salvas localmente. Clique em "Publicar alterações" para salvar no servidor.`);

            return; // Retornar cedo para não executar o código antigo abaixo

            const itemTypeExisting = itemEl.dataset.itemType;

            const newTitle = document.getElementById('edit-title')?.value;

            if (newTitle !== undefined && itemEl.querySelector('.item-title-input')) {
                itemEl.querySelector('.item-title-input').value = newTitle;
                const disp = itemEl.querySelector('.item-display-title');
                if (disp) disp.textContent = newTitle;
            }

            // Banner: aplicar mudanças locais (nome, link, imagem, mensagem) antes do save-all
            if (itemTypeExisting === 'banner') {
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

                if (nameInputList) nameInputList.value = newName;
                if (destInputList) destInputList.value = newDest;
                if (msgHiddenList) msgHiddenList.value = newMsg;
                if (imageInputList) imageInputList.value = newImg;
                if (thumbList && newImg) {
                    thumbList.src = newImg;
                    thumbList.style.display = 'block';
                }
                if (displayDest) {
                    displayDest.textContent = newDest || 'Sem destino';
                }
            }

            if ([
                'link', 'whatsapp', 'telegram', 'email', 'facebook', 'instagram',
                'pinterest', 'reddit', 'tiktok', 'twitch', 'twitter', 'youtube', 'linkedin', 'portfolio',
                'instagram_embed', 'youtube_embed', 'tiktok_embed', 'spotify_embed', 'linkedin_embed', 'pinterest_embed', 'spotify'
            ].includes(itemTypeExisting)) {
                const newDestUrl = document.getElementById('edit-dest-url')?.value || '';
                const destInput = itemEl.querySelector('.item-destination-url-input');
                const destDisplay = itemEl.querySelector('.item-display-dest');
                if (destInput) destInput.value = newDestUrl;
                if (destDisplay) destDisplay.textContent = newDestUrl || '#';

                // Para carrossel, atualizar array de imagens
                if (itemTypeExisting === 'carousel') {
                    const jsonInput = SELECTORS.editModalBody.querySelector('.carousel-images-json-input');
                    const imageInput = itemEl.querySelector('.item-image-url-input');
                    const jsonInputInModal = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .carousel-images-json-input`);
                    const jsonInputToUse = jsonInputInModal || jsonInput;

                    if (jsonInputToUse && jsonInputToUse.value) {
                        try {
                            const images = JSON.parse(jsonInputToUse.value);
                            if (Array.isArray(images) && images.length > 0) {
                                const jsonInputInItem = itemEl.querySelector('.carousel-images-json-input');
                                if (jsonInputInItem) {
                                    jsonInputInItem.value = JSON.stringify(images);
                                }

                                // Atualizar image_url (primeira imagem)
                                const firstImg = typeof images[0] === 'string' ? images[0] : (images[0].image_url || images[0]);
                                if (imageInput) {
                                    imageInput.value = firstImg;
                                }

                                // Atualizar contador no display
                                const displayDest = itemEl.querySelector('.item-display-dest');
                                if (displayDest) {
                                    displayDest.textContent = `${images.length} imagem${images.length !== 1 ? 'ns' : ''}`;
                                }

                                // Renderizar lista atualizada
                                renderCarouselImagesNew(itemId, images);
                            }
                        } catch (e) {
                            console.error('Erro ao atualizar carrossel:', e);
                        }
                    }
                }

                // Para link personalizado, também atualizar image_url, logo_size e icon_class se houver
                if (itemTypeExisting === 'link') {
                    const modalImageUrlInput = document.getElementById('edit-link-image-url') ||
                        SELECTORS.editModalBody.querySelector('.item-image-url-input') ||
                        document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] .item-image-url-input`);
                    const itemImageUrlInput = itemEl.querySelector('.item-image-url-input');
                    const modalLogoSizeInput = document.getElementById(`edit-logo-size-input-${itemId}`) ||
                        SELECTORS.editModalBody.querySelector('.item-logo-size-input');
                    const itemLogoSizeInput = itemEl.querySelector('.item-logo-size-input');

                    if (modalImageUrlInput) {
                        const imageUrlValue = modalImageUrlInput.value || '';
                        if (itemImageUrlInput) itemImageUrlInput.value = imageUrlValue;

                        // Atualizar preview do logo no item
                        const logoPreview = itemEl.querySelector('.item-logo-preview');
                        const iconPicker = itemEl.querySelector('.item-icon-picker');
                        if (imageUrlValue && imageUrlValue.trim() && !imageUrlValue.includes('placeholder')) {
                            if (logoPreview) {
                                logoPreview.src = imageUrlValue;
                                logoPreview.style.display = 'block';
                            }
                            if (iconPicker) iconPicker.style.display = 'none';
                        } else {
                            if (logoPreview) logoPreview.style.display = 'none';
                            if (iconPicker) iconPicker.style.display = 'inline-block';
                        }
                    }

                    // Atualizar tamanho da logo (salvar no dataset, mas NÃO aplicar na lista)
                    if (modalLogoSizeInput) {
                        const logoSizeValue = parseInt(modalLogoSizeInput.value) || 24;
                        if (itemLogoSizeInput) {
                            itemLogoSizeInput.value = logoSizeValue;
                        }
                        // NÃO atualizar logo na lista - ela deve permanecer fixa (40px)
                        // O tamanho só aplica no cartão público (profile.ejs)
                        itemEl.dataset.logoSize = logoSizeValue;
                    }

                    // Atualizar icon_class do modal também se houver
                    const modalIconPicker = SELECTORS.editModalBody.querySelector('.item-icon-picker');
                    if (modalIconPicker) {
                        const iconElement = modalIconPicker.querySelector('i');
                        const itemIconPicker = itemEl.querySelector('.item-icon-picker');
                        if (itemIconPicker && iconElement) {
                            itemIconPicker.innerHTML = `<i class="${iconElement.className}"></i>`;
                        }
                    }
                }

            }
            else if (itemTypeExisting === 'pix' || itemTypeExisting === 'pix_qrcode') {
                const newPixKey = document.getElementById('edit-pix-key').value;
                const newRecipientName = document.getElementById('edit-recipient-name')?.value;
                const newPixAmount = document.getElementById('edit-pix-amount')?.value;
                const newPixDescription = document.getElementById('edit-pix-description')?.value;

                itemEl.querySelector('.item-pix-key-input').value = newPixKey;
                itemEl.querySelector('.item-display-dest').textContent = newPixKey;

                if (newRecipientName) {
                    itemEl.querySelector('.item-recipient-name-input').value = newRecipientName;
                }
                if (newPixAmount) {
                    itemEl.querySelector('.item-pix-amount-input').value = newPixAmount;
                }
                if (newPixDescription) {
                    itemEl.querySelector('.item-pix-description-input').value = newPixDescription;
                }
            } else if (itemTypeExisting === 'carousel') {
                // Salvar carrossel - atualizar JSON de imagens
                const jsonInput = SELECTORS.editModalBody.querySelector('.carousel-images-json-input');
                const imageInput = SELECTORS.editModalBody.querySelector('#edit-image-url');

                if (jsonInput && jsonInput.value) {
                    try {
                        const images = JSON.parse(jsonInput.value);
                        const itemJsonInput = itemEl.querySelector('.carousel-images-json-input');
                        const itemImageInput = itemEl.querySelector('.item-image-url-input');
                        const displayDest = itemEl.querySelector('.item-display-dest');

                        if (itemJsonInput) itemJsonInput.value = jsonInput.value;
                        if (itemImageInput && images.length > 0) {
                            const firstImg = typeof images[0] === 'string' ? images[0] : (images[0].image_url || images[0]);
                            itemImageInput.value = firstImg;
                        }
                        if (displayDest) {
                            displayDest.textContent = `${images.length} imagem${images.length !== 1 ? 'ns' : ''}`;
                        }
                    } catch (e) {
                        console.error('Erro ao salvar carrossel:', e);
                    }
                }
            } else if (itemTypeExisting === 'pdf' || itemTypeExisting === 'pdf_embed') {
                const newPdfUrl = document.getElementById('edit-pdf-url').value;
                itemEl.querySelector('.item-pdf-url-input').value = newPdfUrl;
                itemEl.querySelector('.item-display-dest').textContent = newPdfUrl;
                if (logoSizeInput) logoSizeInput.value = newLogoSize;
                if (displayTitle) displayTitle.textContent = newTitle;

                // Atualizar preview do logo se houver
                if (newImageUrl && newImageUrl.trim() && !newImageUrl.includes('placeholder')) {
                    if (logoPreview) {
                        logoPreview.src = newImageUrl;
                        logoPreview.style.display = 'block';
                        const logoSizeFixed = Math.min(newLogoSize, 40);
                        const isPng = newImageUrl.includes('.png');
                        logoPreview.style.width = `${logoSizeFixed}px`;
                        logoPreview.style.height = `${logoSizeFixed}px`;
                        logoPreview.style.objectFit = isPng ? 'contain' : 'cover';
                        logoPreview.style.borderRadius = isPng ? '0' : '50%';
                        if (iconPicker) iconPicker.style.display = 'none';
                    }
                } else {
                    if (logoPreview) logoPreview.style.display = 'none';
                    if (iconPicker) iconPicker.style.display = 'inline-block';
                }
            } else if (itemTypeExisting === 'banner') {
                // Verificar se é carrossel (tem input hidden com JSON)
                const hiddenInput = document.getElementById('edit-dest-url-hidden');
                const destUrlInput = document.getElementById('edit-dest-url');
                const imageUrlInput = document.getElementById('edit-image-url');

                if (hiddenInput && hiddenInput.value && hiddenInput.value.trim() !== '' && hiddenInput.value.startsWith('[')) {
                    // ? carrossel - usar o input hidden
                    try {
                        const images = JSON.parse(hiddenInput.value);
                        if (Array.isArray(images) && images.length > 0) {
                            const destInputEl = itemEl.querySelector('.item-destination-url-input');
                            const imageInputEl = itemEl.querySelector('.item-image-url-input');

                            if (destInputEl) destInputEl.value = hiddenInput.value;

                            // Extrair image_url do primeiro objeto ou string
                            const firstImg = images[0];
                            const imageUrl = typeof firstImg === 'object' ? (firstImg.image_url || firstImg) : firstImg;

                            if (imageInputEl) imageInputEl.value = imageUrl;

                            const previewThumb = itemEl.querySelector('.banner-preview-thumb');
                            if (previewThumb) {
                                previewThumb.src = imageUrl;
                                previewThumb.style.display = 'block';
                            }

                            const displayDest = itemEl.querySelector('.item-display-dest');
                            if (displayDest) {
                                displayDest.textContent = `Carrossel (${images.length} fotos)`;
                            }

                            itemEl.classList.add('banner-carousel');
                        }
                    } catch (e) {
                        console.log('Erro ao processar carrossel:', e);
                    }
                } else if (destUrlInput) {
                    // Banner normal - usar o input de destino
                    const newDestUrl = destUrlInput.value.trim() || '#';
                    const destInputEl = itemEl.querySelector('.item-destination-url-input');

                    console.log('Modal Banner - Salvando destination_url:', {
                        itemId,
                        newDestUrl,
                        hasDestInputEl: !!destInputEl,
                        destInputElCurrentValue: destInputEl?.value
                    });

                    if (destInputEl) {
                        destInputEl.value = newDestUrl;
                        console.log('Modal Banner - destination_url atualizado no item:', destInputEl.value);
                    }

                    // Atualizar imagem se houver
                    if (imageUrlInput && imageUrlInput.value) {
                        const imageInputEl = itemEl.querySelector('.item-image-url-input');
                        if (imageInputEl) {
                            imageInputEl.value = imageUrlInput.value;
                        }
                        const previewThumb = itemEl.querySelector('.banner-preview-thumb');
                        if (previewThumb) {
                            previewThumb.src = imageUrlInput.value;
                            previewThumb.style.display = 'block';
                        }
                    }

                    // Atualizar display
                    const displayDest = itemEl.querySelector('.item-display-dest');
                    if (displayDest) {
                        displayDest.textContent = newDestUrl && newDestUrl !== '#' ? newDestUrl : 'Sem destino';
                        console.log('Modal Banner - Display atualizado:', displayDest.textContent);
                    }

                    itemEl.classList.remove('banner-carousel');
                }

                const selectedRatioInput = document.querySelector('input[name="aspect-ratio-selector"]:checked');
                if (selectedRatioInput) {
                    const newAspectRatio = selectedRatioInput.value;
                    itemEl.dataset.aspectRatio = newAspectRatio;
                }
            }

            // Sincronizar dados do modal para o item antes de salvar
            syncModalDataToItem();

            // Salvar automaticamente quando clicar em "Salvar Alterações" do modal
            try {
                await saveAllChanges();
                SELECTORS.editItemModal.classList.remove('active');
                updateLivePreviewFromForm();
                console.log('Alterações salvas com sucesso via modal');
            } catch (error) {
                console.error('O Erro ao salvar via modal:', error);
                alert(`Erro ao salvar: ${error.message}`);
                // Não fechar o modal se houver erro
            }
        });

        SELECTORS.editModalBody.addEventListener('click', e => {
            const uploadArea = e.target.closest('.image-upload-area');
            const logoUploadArea = e.target.closest('.logo-upload-area');
            const removeLogoBtn = e.target.closest('.remove-logo-btn');

            if (uploadArea) {
                const fileInput = uploadArea.querySelector('.item-file-input');
                if (fileInput) {
                    fileInput.click();
                }
            }

            if (logoUploadArea && !removeLogoBtn) {
                const fileInput = logoUploadArea.querySelector('.item-logo-file-input');
                if (fileInput) {
                    fileInput.click();
                }
            }

            if (removeLogoBtn) {
                const logoUploadArea = removeLogoBtn.closest('.logo-upload-area');
                const preview = logoUploadArea.querySelector('.item-logo-upload-preview');
                const uploadText = logoUploadArea.querySelector('.logo-upload-text');
                const imageUrlInput = document.getElementById('edit-link-image-url') ||
                    document.getElementById('edit-catalog-image-url') ||
                    logoUploadArea.closest('.input-group')?.querySelector('.item-image-url-input') ||
                    SELECTORS.editModalBody.querySelector('.item-image-url-input');

                if (confirm('Tem certeza que deseja remover a logo? O ícone será usado como fallback.')) {
                    if (preview) {
                        preview.src = '';
                        preview.style.display = 'none';
                    }
                    if (uploadText) uploadText.style.display = '';
                    if (removeLogoBtn) removeLogoBtn.style.display = 'none';
                    if (imageUrlInput) imageUrlInput.value = '';

                    // Esconder campo de tamanho da logo ao remover
                    const logoSizeGroup = logoUploadArea.closest('.input-group')?.nextElementSibling;
                    if (logoSizeGroup && logoSizeGroup.querySelector('.item-logo-size-input')) {
                        logoSizeGroup.style.display = 'none';
                    }
                }
            }
        });

        // Event listener único para upload de logo (evitar duplicação)
        try {
            if (SELECTORS.editModalBody && !SELECTORS.editModalBody.dataset.logoUploadListenerAdded) {
                SELECTORS.editModalBody.dataset.logoUploadListenerAdded = 'true';

                SELECTORS.editModalBody.addEventListener('change', async function (e) {
                    if (!e.target.classList.contains('item-logo-file-input')) return;

                    const fileInput = e.target;
                    const file = fileInput.files[0];
                    if (!file) {
                        fileInput.dataset.uploading = 'false';
                        return;
                    }

                    // Prevenir processamento duplicado
                    if (fileInput.dataset.processing === 'true') {
                        console.log('Logo já está sendo processado, ignorando');
                        return;
                    }
                    fileInput.dataset.processing = 'true';

                    // Validar tipo e tamanho
                    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
                        alert('Apenas PNG ou JPG são permitidas.');
                        fileInput.value = '';
                        fileInput.dataset.uploading = 'false';
                        fileInput.dataset.processing = 'false';
                        return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                        alert('Máximo 5MB.');
                        fileInput.value = '';
                        fileInput.dataset.uploading = 'false';
                        fileInput.dataset.processing = 'false';
                        return;
                    }

                    const logoUploadArea = fileInput.closest('.logo-upload-area');
                    const preview = logoUploadArea?.querySelector('.item-logo-upload-preview');
                    const uploadText = logoUploadArea?.querySelector('.logo-upload-text');
                    const removeBtn = logoUploadArea?.querySelector('.remove-logo-btn');
                    const loader = logoUploadArea?.querySelector('.upload-loader');

                    if (!logoUploadArea) return;

                    if (loader) loader.style.display = 'block';

                    try {
                        // Obter autorização de upload
                        const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                            method: 'POST',
                            headers: HEADERS
                        });
                        if (!authResponse.ok) throw new Error('Falha na autorização');
                        const { uploadURL } = await authResponse.json();

                        // Fazer upload
                        const formData = new FormData();
                        formData.append('file', file);
                        const uploadResponse = await fetch(uploadURL, { method: 'POST', headers: getAuthHeaders(), body: formData });
                        if (!uploadResponse.ok) throw new Error('Falha no upload');

                        const uploadData = await uploadResponse.json();
                        const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";
                        const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : '');
                        if (!finalUrl) throw new Error('Resposta do servidor de upload inválida. Tente novamente.');

                        // Atualizar campo hidden de image_url
                        const imageUrlInput = document.getElementById('edit-link-image-url') ||
                            document.getElementById('edit-catalog-image-url') ||
                            logoUploadArea.closest('.input-group')?.querySelector('.item-image-url-input') ||
                            SELECTORS.editModalBody.querySelector('.item-image-url-input');
                        if (imageUrlInput) {
                            imageUrlInput.value = finalUrl;
                        }

                        // Atualizar preview
                        if (preview) {
                            preview.src = finalUrl;
                            preview.style.display = 'block';
                            const logoSize = 100; // Preview máximo
                            preview.style.maxWidth = `${logoSize}px`;
                            preview.style.maxHeight = `${logoSize}px`;
                            preview.style.width = `${logoSize}px`;
                            preview.style.height = `${logoSize}px`;
                        }
                        if (uploadText) uploadText.style.display = 'none';
                        if (removeBtn) removeBtn.style.display = 'block';

                        // Atualizar item na lista (preview do item)
                        const itemId = SELECTORS.editItemModal?.dataset?.editingId;
                        if (itemId) {
                            const itemEl = document.querySelector(`[data-item-id="${itemId}"], [data-id="${itemId}"]`);
                            if (itemEl) {
                                const logoPreviewInList = itemEl.querySelector('.item-logo-preview');
                                const iconPickerInList = itemEl.querySelector('.item-icon-picker');
                                if (logoPreviewInList) {
                                    logoPreviewInList.src = finalUrl;
                                    logoPreviewInList.style.display = 'block';
                                }
                                if (iconPickerInList) {
                                    iconPickerInList.style.display = 'none';
                                }
                                // Atualizar dataset do item
                                itemEl.dataset.imageUrl = finalUrl;
                                // Atualizar input hidden do item na lista se existir
                                const imageUrlInputInList = itemEl.querySelector('.item-image-url-input');
                                if (imageUrlInputInList) {
                                    imageUrlInputInList.value = finalUrl;
                                }
                            }
                        }

                        // Atualizar preview ao vivo imediatamente
                        updateLivePreviewFromForm();

                        // Mostrar campo de tamanho da logo se ainda não estiver visível
                        const logoSizeGroup = logoUploadArea.closest('.input-group')?.nextElementSibling;
                        if (logoSizeGroup && logoSizeGroup.querySelector('.item-logo-size-input')) {
                            logoSizeGroup.style.display = 'block';
                        } else {
                            // Criar campo de tamanho dinamicamente se não existir
                            const itemId = SELECTORS.editItemModal.dataset.editingId;
                            const itemType = SELECTORS.editItemModal.dataset.itemType;
                            const currentLogoSize = 24;

                            // Não criar slider para catálogo - logo size foi removido
                            if (itemType === 'link') {
                                // Apenas para link personalizado
                                const sliderId = `edit-logo-size-slider-${itemId}`;
                                const inputId = `edit-logo-size-input-${itemId}`;
                                const valueSpanId = `edit-logo-size-value-${itemId}`;

                                const logoSizeHTML = `
                    <div class="input-group" style="display: block;">
                        <label>Tamanho da Logo (em pixels)</label>
                        <div class="range-slider" style="margin-bottom: 15px;">
                            <div class="range-slider-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <label style="margin: 0; color: var(--text, #ECECEC);">Tamanho: <span id="${valueSpanId}">${currentLogoSize}</span>px</label>
                                <input type="number" class="item-logo-size-input" id="${inputId}" value="${currentLogoSize}" min="20" max="600" step="1" style="width: 80px; padding: 5px 10px; border-radius: 4px; border: 1px solid var(--border-color, #2C2C2F); background: var(--card-background-color, #1C1C21); color: var(--text, #ECECEC); text-align: center;">
                            </div>
                            <input type="range" class="item-logo-size-slider" id="${sliderId}" value="${currentLogoSize}" min="20" max="600" step="5" style="width: 100%;">
                            <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.75rem; color: var(--text-dark, #A1A1A1);">
                                <span>20px</span>
                                <span>600px</span>
                            </div>
                        </div>
                    </div>
                `;
                                logoUploadArea.closest('.input-group')?.insertAdjacentHTML('afterend', logoSizeHTML);

                                // Adicionar event listener ao slider
                                const slider = document.getElementById(sliderId);
                                const numberInput = document.getElementById(inputId);
                                const valueSpan = document.getElementById(valueSpanId);
                                if (slider && numberInput && valueSpan) {
                                    slider.addEventListener('input', () => {
                                        const value = slider.value;
                                        numberInput.value = value;
                                        valueSpan.textContent = value;
                                    });
                                    numberInput.addEventListener('input', () => {
                                        const value = numberInput.value;
                                        slider.value = value;
                                        valueSpan.textContent = value;
                                        // Atualizar preview ao vivo quando o tamanho mudar
                                        updateLivePreviewFromForm();
                                    });
                                    slider.addEventListener('input', () => {
                                        const value = slider.value;
                                        numberInput.value = value;
                                        valueSpan.textContent = value;
                                        // Atualizar preview ao vivo quando o tamanho mudar
                                        updateLivePreviewFromForm();
                                    });
                                }
                            }
                        }

                    } catch (error) {
                        console.error('Erro no upload da logo:', error);
                        alert('Erro ao fazer upload da logo. Tente novamente.');
                    } finally {
                        if (loader) loader.style.display = 'none';
                        fileInput.value = ''; // Resetar input para permitir selecionar o mesmo arquivo novamente
                        fileInput.dataset.uploading = 'false';
                        fileInput.dataset.processing = 'false';
                    }
                }); // Fechar addEventListener
            } // Fechar if do logoUploadListenerAdded
        } catch (error) {
            console.error('Erro ao configurar listener de logo:', error);
            // Não impedir o carregamento se houver erro aqui
        }


        // Event listener para remover imagens do carrossel
        SELECTORS.editModalBody.addEventListener('click', e => {
            // Com label, não precisamos mais do fallback de clique
            // Mas vamos manter para debug caso o label não funcione
            // ===== NOVO CARROSSEL - Remover imagem =====
            if (e.target.closest('.remove-carousel-new')) {
                const btn = e.target.closest('.remove-carousel-new');
                const itemId = btn.dataset.itemId;
                const imageIndex = parseInt(btn.dataset.imageIndex);
                removeCarouselImageNew(itemId, imageIndex);
            }
        });

        // ===== NOVO CARROSSEL - UPLOAD DE IMAGENS (Event Delegation Global) =====
        document.addEventListener('change', async function carouselUploadHandler(e) {
            if (!e.target.classList.contains('carousel-file-input-new')) return;

            console.log('Y"" [CARROSSEL] Upload iniciado');
            const fileInput = e.target;
            const itemId = fileInput.dataset.itemId || fileInput.getAttribute('data-item-id') || fileInput.id.replace('carousel-file-new-', '');

            if (!itemId) {
                console.error('[CARROSSEL] itemId não encontrado. Input:', fileInput);
                console.error('[CARROSSEL] Dataset:', fileInput.dataset);
                console.error('[CARROSSEL] ID:', fileInput.id);
                return;
            }

            const files = Array.from(fileInput.files || []);
            if (files.length === 0) {
                console.log('[CARROSSEL] Nenhum arquivo selecionado');
                return;
            }

            console.log(`[CARROSSEL] Processando ${files.length} arquivo(s) para itemId: ${itemId}`);

            // Buscar itemEl ANTES de qualquer operação assíncrona - com try/catch para segurança extra
            let itemEl = null;
            try {
                itemEl = document.querySelector(`.item[data-id="${itemId}"], .module-item[data-id="${itemId}"]`);
            } catch (err) {
                console.error('[CARROSSEL] Erro ao buscar itemEl:', err);
                alert('Erro ao localizar o item do carrossel. Recarregue a página e tente novamente.');
                return;
            }

            if (!itemEl) {
                console.error(`[CARROSSEL] Item não encontrado para id: ${itemId}`);
                alert('Erro: Item do carrossel não encontrado. Recarregue a página e tente novamente.');
                return;
            }

            const uploadLabel = fileInput.closest('.carousel-upload-label-new');
            const loader = uploadLabel?.querySelector('.carousel-upload-loader-new');
            if (loader) loader.style.display = 'block';
            if (uploadLabel) uploadLabel.style.opacity = '0.6';

            try {
                console.log('[CARROSSEL] Solicitando autorização...');
                const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                    method: 'POST',
                    headers: HEADERS
                });
                if (!authResponse.ok) throw new Error('Falha na autorização');
                const { uploadURL } = await authResponse.json();
                console.log('[CARROSSEL] Autorização obtida');

                const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";
                const uploadedImages = [];

                for (const file of files) {
                    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
                        alert(`${file.name}: Apenas PNG ou JPG são permitidas.`);
                        continue;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                        alert(`${file.name}: Máximo 5MB.`);
                        continue;
                    }

                    console.log(`[CARROSSEL] Enviando ${file.name}...`);
                    const formData = new FormData();
                    formData.append('file', file);
                    // uploadURL pode ser /api/upload/receive-one (R2) e exige Authorization
                    const uploadHeaders = getAuthHeaders();
                    const uploadResponse = await fetch(uploadURL, { method: 'POST', headers: uploadHeaders, body: formData });
                    if (!uploadResponse.ok) {
                        const errorText = await uploadResponse.text();
                        throw new Error(`Falha no upload de ${file.name}: ${uploadResponse.status}`);
                    }

                    const uploadData = await uploadResponse.json();
                    // R2 devolve { success: true, url, imageUrl }; Cloudflare devolve { result: { id } }
                    const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && accountHash ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : '');
                    if (finalUrl) {
                        uploadedImages.push(finalUrl);
                        console.log(`[CARROSSEL] ${file.name} enviado: ${finalUrl.substring(0, 50)}...`);
                    } else {
                        console.warn('[CARROSSEL] Resposta sem URL:', uploadData);
                    }
                }

                if (uploadedImages.length > 0) {
                    console.log(`[CARROSSEL] ${uploadedImages.length} imagem(ns) enviada(s), atualizando interface...`);

                    // Verificar novamente se itemEl ainda existe (pode ter sido removido do DOM)
                    const currentItemEl = document.querySelector(`.item[data-id="${itemId}"]`);
                    if (!currentItemEl) {
                        console.warn('[CARROSSEL] Item não encontrado após upload. Tentando continuar...');
                    }

                    // Buscar inputs do modal PRIMEIRO (prioridade)
                    const jsonInputModal = SELECTORS.editModalBody?.querySelector(`.carousel-images-json-new[data-item-id="${itemId}"]`);
                    const jsonInputItem = currentItemEl ? currentItemEl.querySelector(`.carousel-images-json-new[data-item-id="${itemId}"]`) : null;

                    // Usar o input do modal se existir, senão usar o do item
                    const jsonInput = jsonInputModal || jsonInputItem;

                    let existingImages = [];
                    if (jsonInput && jsonInput.value) {
                        try {
                            const parsed = JSON.parse(jsonInput.value);
                            existingImages = Array.isArray(parsed) ? parsed : [];
                        } catch (e) {
                            console.warn('[CARROSSEL] Erro ao parsear imagens existentes:', e);
                        }
                    }

                    const allImages = [...existingImages, ...uploadedImages];
                    const jsonValue = JSON.stringify(allImages);

                    // Atualizar AMBOS os inputs (modal e item) para garantir sincronização
                    if (jsonInputModal) {
                        jsonInputModal.value = jsonValue;
                        console.log('[CARROSSEL] Input JSON do modal atualizado');
                    }
                    if (jsonInputItem) {
                        jsonInputItem.value = jsonValue;
                        console.log('[CARROSSEL] Input JSON do item atualizado');
                    }

                    if (!jsonInputModal && !jsonInputItem) {
                        console.error('[CARROSSEL] Input JSON não encontrado! Procurando...');
                        console.error('Modal body:', SELECTORS.editModalBody);
                        console.error('Item el:', currentItemEl);
                    }

                    // Atualizar image_url - GARANTIR que currentItemEl existe antes de usar
                    const firstImg = allImages[0] || '';
                    const imageInputModal = SELECTORS.editModalBody?.querySelector(`#edit-image-url`);
                    if (imageInputModal) imageInputModal.value = firstImg;

                    if (currentItemEl) {
                        const imageInputItem = currentItemEl.querySelector('.item-image-url-input');
                        if (imageInputItem) imageInputItem.value = firstImg;

                        // Atualizar display
                        const displayDest = currentItemEl.querySelector('.item-display-dest');
                        if (displayDest) displayDest.textContent = `${allImages.length} imagem${allImages.length !== 1 ? 'ns' : ''}`;
                    }

                    // Renderizar IMEDIATAMENTE
                    console.log('YZ [CARROSSEL] Renderizando imagens...');
                    renderCarouselImagesNew(itemId, allImages);

                    // NÃO chamar syncModalDataToItem() aqui porque já atualizamos ambos os inputs manualmente
                    // syncModalDataToItem() pode sobrescrever os valores que acabamos de atualizar

                    updateLivePreviewFromForm();
                    console.log('[CARROSSEL] Upload concluído com sucesso!');
                } else {
                    console.warn('[CARROSSEL] Nenhuma imagem foi enviada');
                }
            } catch (error) {
                console.error('OO[CARROSSEL] Erro no upload:', error);
                const errorMessage = error && error.message ? error.message : 'Erro desconhecido ao fazer upload';
                alert(`Erro ao fazer upload: ${errorMessage}`);
            } finally {
                if (loader) loader.style.display = 'none';
                if (uploadLabel) uploadLabel.style.opacity = '1';
                fileInput.value = '';
            }
        });

        SELECTORS.deleteModalBtn.addEventListener('click', () => {
            const itemId = SELECTORS.editItemModal.dataset.editingId;
            if (!itemId) return;

            const itemEl = document.querySelector(`.item[data-id='${itemId}'], .module-item[data-id='${itemId}']`);
            if (!itemEl) {
                console.error(`Item ${itemId} não encontrado para deletar`);
                SELECTORS.editItemModal.classList.remove('active');
                return;
            }

            // Fechar o modal primeiro
            SELECTORS.editItemModal.classList.remove('active');

            // Chamar deleteItem diretamente (já tem confirmação dentro)
            if (confirm('Tem certeza que deseja excluir este módulo?')) {
                deleteItem(itemId);
            }
        });
        SELECTORS.itemsContainer.addEventListener('change', async e => {
            // Handler para upload de imagens do novo módulo Carrossel
            if (e.target.classList.contains('carousel-image-file-input')) {
                const fileInput = e.target;
                const itemId = fileInput.dataset.itemId || fileInput.getAttribute('data-item-id');

                if (!itemId) {
                    console.error('O itemId não encontrado no input de arquivo do carrossel (itemsContainer)');
                    return;
                }

                const files = Array.from(fileInput.files || []);

                if (files.length === 0) {
                    console.log('Nenhum arquivo selecionado (itemsContainer)');
                    return;
                }

                console.log(`Iniciando upload de ${files.length} imagem(ns) para carrossel (itemsContainer), itemId: ${itemId}`);

                const itemEl = document.querySelector(`.item[data-id="${itemId}"]`);
                if (!itemEl) {
                    console.error('O Item não encontrado para upload do carrossel (itemsContainer)');
                    return;
                }

                const uploadArea = fileInput.closest('.carousel-add-image-area');
                if (!uploadArea) {
                    console.error('O Área de upload não encontrada (itemsContainer)');
                    return;
                }

                const loader = uploadArea.querySelector('.upload-loader');
                if (loader) {
                    loader.style.display = 'block';
                    loader.style.position = 'absolute';
                    loader.style.top = '50%';
                    loader.style.left = '50%';
                    loader.style.transform = 'translate(-50%, -50%)';
                    loader.style.zIndex = '1000';
                }
                uploadArea.classList.add('is-uploading');

                try {
                    const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                        method: 'POST',
                        headers: HEADERS
                    });
                    if (!authResponse.ok) throw new Error('Falha ao obter autorização para upload.');
                    const { uploadURL } = await authResponse.json();

                    const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";
                    const uploadedImages = [];

                    // Upload de múltiplas imagens
                    for (const file of files) {
                        if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
                            alert(`${file.name}: Apenas imagens PNG ou JPG são permitidas.`);
                            continue;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                            alert(`${file.name}: A imagem deve ter no máximo 5MB.`);
                            continue;
                        }

                        const formData = new FormData();
                        const originalName = file.name || 'carousel-image.jpg';
                        const fileExtension = originalName.split('.').pop() || (file.type.includes('png') ? 'png' : 'jpg');
                        const fileName = originalName.includes('.') ? originalName : `carousel-image.${fileExtension}`;
                        formData.append('file', file, fileName);

                        const uploadResponse = await fetch(uploadURL, {
                            method: 'POST',
                            headers: getAuthHeaders(),
                            body: formData
                        });
                        if (!uploadResponse.ok) throw new Error(`Falha no upload de ${file.name}`);

                        const uploadData = await uploadResponse.json();
                        const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && accountHash ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : '');
                        if (finalUrl) uploadedImages.push(finalUrl);
                    }

                    if (uploadedImages.length > 0) {
                        console.log(`${uploadedImages.length} imagem(ns) enviada(s) com sucesso, processando...`);

                        // Obter imagens existentes - procurar tanto no modal quanto no item
                        const jsonInputModal = SELECTORS.editModalBody?.querySelector(`.carousel-images-json-input[data-item-id="${itemId}"]`);
                        const jsonInputItem = itemEl.querySelector(`.carousel-images-json-input[data-item-id="${itemId}"]`);
                        const jsonInput = jsonInputModal || jsonInputItem;

                        console.log('Inputs encontrados:', {
                            jsonInputModal: !!jsonInputModal,
                            jsonInputItem: !!jsonInputItem,
                            jsonInput: !!jsonInput
                        });

                        let existingImages = [];
                        if (jsonInput && jsonInput.value && jsonInput.value.trim()) {
                            try {
                                const parsed = JSON.parse(jsonInput.value);
                                // Remover placeholders se houver imagens reais
                                existingImages = Array.isArray(parsed) ? parsed.filter(img => {
                                    const url = typeof img === 'string' ? img : (img.image_url || img);
                                    return url &&
                                        !url.includes('placeholder.com') &&
                                        !url.includes('via.placeholder') &&
                                        !url.startsWith('data:image/svg+xml');
                                }) : [];
                                console.log(`Y"< [ITEMS CONTAINER] ${existingImages.length} imagem(ns) existente(s) encontrada(s) (filtrados placeholders)`);
                            } catch (e) {
                                console.warn('Erro ao parsear imagens existentes, iniciando array vazio:', e);
                                existingImages = [];
                            }
                        } else {
                            console.log('Nenhuma imagem existente encontrada, iniciando array vazio');
                        }

                        // Adicionar novas imagens
                        const allImages = [...existingImages, ...uploadedImages];
                        console.log(`Y"S Total de imagens após adicionar: ${allImages.length}`);

                        // Atualizar TODOS os inputs hidden (modal e item)
                        const jsonValue = JSON.stringify(allImages);
                        if (jsonInputModal) {
                            jsonInputModal.value = jsonValue;
                            console.log('Input JSON do modal atualizado');
                        } else {
                            console.warn('Input JSON do modal não encontrado!');
                        }

                        if (jsonInputItem) {
                            jsonInputItem.value = jsonValue;
                            console.log('Input JSON do item atualizado');
                        } else {
                            console.warn('Input JSON do item não encontrado!');
                        }

                        // Atualizar image_url (primeira imagem REAL, não placeholder) - tanto no modal quanto no item
                        const realImages = allImages.filter(img => {
                            const url = typeof img === 'string' ? img : (img.image_url || img);
                            return url &&
                                !url.includes('placeholder.com') &&
                                !url.includes('via.placeholder') &&
                                !url.startsWith('data:image/svg+xml');
                        });

                        const firstImg = realImages.length > 0
                            ? (typeof realImages[0] === 'string' ? realImages[0] : (realImages[0].image_url || realImages[0]))
                            : (allImages.length > 0 ? (typeof allImages[0] === 'string' ? allImages[0] : (allImages[0].image_url || allImages[0])) : '');

                        console.log('[ITEMS CONTAINER] Primeira imagem real selecionada:', firstImg.substring(0, 80) + '...');

                        const imageInputModal = SELECTORS.editModalBody?.querySelector(`#edit-image-url`);
                        const imageInputItem = itemEl.querySelector('.item-image-url-input');
                        if (imageInputModal) {
                            imageInputModal.value = firstImg;
                            console.log('Input image_url do modal atualizado com imagem real');
                        }
                        if (imageInputItem) {
                            imageInputItem.value = firstImg;
                            console.log('Input image_url do item atualizado com imagem real');
                        }

                        // Atualizar display no item da lista
                        const displayDest = itemEl.querySelector('.item-display-dest');
                        if (displayDest) {
                            displayDest.textContent = `${allImages.length} imagem${allImages.length !== 1 ? 'ns' : ''}`;
                            console.log('Display do item atualizado:', displayDest.textContent);
                        }

                        // Renderizar lista atualizada no modal IMEDIATAMENTE
                        console.log('YZ [ITEMS CONTAINER] Renderizando lista de imagens IMEDIATAMENTE...');
                        // Usar requestAnimationFrame para garantir que o DOM está pronto
                        requestAnimationFrame(() => {
                            renderCarouselImagesNew(itemId, allImages);
                            setTimeout(() => {
                                updateLivePreviewFromForm();
                            }, 100);
                        });

                        console.log(`[ITEMS CONTAINER] ${uploadedImages.length} imagem(ns) adicionada(s) com sucesso! Total: ${allImages.length}`);
                    } else {
                        console.warn('Nenhuma imagem foi enviada com sucesso');
                    }
                } catch (error) {
                    console.error('O Erro no upload do carrossel:', error);
                    alert(`Erro ao fazer upload: ${error.message}`);
                } finally {
                    if (loader) loader.style.display = 'none';
                    if (uploadArea) uploadArea.classList.remove('is-uploading');
                    // Resetar input para permitir selecionar os mesmos arquivos novamente
                    fileInput.value = '';
                }
                return;
            }
        }, true); // Use capture para garantir que o evento seja capturado

        SELECTORS.itemsContainer.addEventListener('change', async e => {
            if (e.target.classList.contains('item-file-input') && e.target.closest('.banner-item, .wifi-banner-upload-area')) {
                const file = e.target.files[0];
                if (file) {
                    const itemEl = e.target.closest('.item, .module-item');
                    if (!itemEl) return;
                    const uploadType = e.target.dataset.itemType || e.target.closest('.image-upload-area')?.dataset?.itemType;
                    const modType = itemEl.dataset?.itemType;
                    const trigger = (uploadType === 'wifi-banner' || modType === 'wifi') ? 'wifi-banner' : 'banner';
                    openCropper(file, trigger, itemEl);
                    e.target.value = '';
                }
            }
            else if (e.target.closest('.pdf-upload-area')) {
                const fileInput = e.target;
                const file = fileInput.files[0];
                if (!file) return;

                const itemEl = fileInput.closest('.item');
                const urlInput = itemEl.querySelector('.item-pdf-url-input');
                const uploadArea = itemEl.querySelector('.pdf-upload-area');
                const uploadText = uploadArea.querySelector('p');

                itemEl.classList.add('is-uploading');

                try {
                    const result = await uploadPDF(file, (status) => {
                        uploadText.textContent = status;
                    });

                    urlInput.value = result.pdf_url;
                    updateLivePreviewFromForm();

                } catch (error) {
                    console.error('Erro no upload do PDF:', error);
                    alert(`Erro: ${error.message}`);
                } finally {
                    itemEl.classList.remove('is-uploading');
                }
            }
        });
        SELECTORS.editorNavLinks.forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                SELECTORS.editorNavLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                const targetId = link.dataset.editorTarget;
                SELECTORS.editorPanes.forEach(pane => pane.classList.toggle('active', pane.id === targetId));

                // Ao abrir Personalizar: atualizar visibilidade do botão Bíblia (evita sumir após excluir outro módulo)
                if (targetId === 'personalizar-editor') {
                    refreshBibleVisibilitySetting();
                }

                // Atualizar hash e localStorage para manter a aba ao atualizar (mobile perde hash no refresh)
                window.history.replaceState(null, '', window.location.pathname + '#' + targetId);
                try { localStorage.setItem('dashboard_last_pane', '#' + targetId); } catch (e) { }

                // Scroll suave para o topo no mobile
                if (window.innerWidth <= 768) {
                    const editorArea = document.querySelector('.editor-area');
                    if (editorArea) {
                        editorArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });
        });

        // Mapeamento de atalhos de hash para id do painel (ex: #finance -> finance-pane)
        const hashToPaneId = {
            'finance': 'finance-pane',
            'relatorios': 'relatorios-pane',
            'editar': 'editar-pane',
            'compartilhar': 'compartilhar-pane',

            'branding': 'branding-pane',
            'separacao-pacotes': 'separacao-pacotes-pane',
            'assinatura': 'assinatura-pane',
            'personalizar-link': 'personalizar-link-pane',
            'meu-site': 'meu-site-pane'
        };
        // Processar hash da URL ao carregar a página: restaurar painel principal (e aba do editor se for o caso)
        const processHashOnLoad = () => {
            let hash = (window.location.hash || '').trim();
            // Mobile: se hash vazio, restaurar do localStorage (refresh no mobile às vezes perde o hash)
            if (!hash || hash === '#') {
                try {
                    const saved = localStorage.getItem('dashboard_last_pane');
                    if (saved && saved.charAt(0) === '#') hash = saved;
                    else if (saved) hash = '#' + saved;
                } catch (e) { }
                if (hash && hash !== '#') {
                    try { window.history.replaceState(null, '', (window.location.pathname || 'dashboard.html') + hash); } catch (e) { }
                }
            }
            if (!hash || hash === '#') return;
            let targetId = hash.substring(1).trim();
            if (!targetId) return;
            const fullHash = targetId; // guardar para finance-pane-tab-X
            // finance-pane-tab-cartoes -> finance-pane (preservar hash para initFinancePane ler a aba)
            if (targetId.startsWith('finance-pane-tab-')) targetId = 'finance-pane';
            if (hashToPaneId[targetId]) targetId = hashToPaneId[targetId];

            // 1) Hash é um painel principal (ex: finance-pane, relatorios-pane, editar-pane)?
            const mainNavLink = document.querySelector(`.sidebar .nav-link[data-target="${targetId}"]`);
            if (mainNavLink) {
                // No mobile: aplicar a troca de painel diretamente (click pode falhar com sidebar oculto)
                const isMobile = window.innerWidth <= 768;
                if (isMobile) {
                    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
                    mainNavLink.classList.add('active');
                    document.querySelectorAll('.main-content').forEach(pane => {
                        pane.classList.remove('active');
                        pane.style.display = 'none';
                    });
                    var livePreview = document.querySelector('.live-preview');
                    if (livePreview) livePreview.style.display = targetId === 'king-forms-pane' ? 'none' : '';
                    const targetPane = document.getElementById(targetId);
                    if (targetPane) {
                        targetPane.classList.add('active');
                        targetPane.style.display = 'flex';
                    }
                    if (targetId === 'finance-pane' && window.initFinancePane) window.initFinancePane();
                    else if (targetId === 'relatorios-pane' && typeof window.loadReportsData === 'function') window.loadReportsData();
                    else if (targetId === 'compartilhar-pane' && typeof window.generateQRCode === 'function') window.generateQRCode();

                    else if (targetId === 'king-forms-pane') {
                        var kfIframe = document.getElementById('king-forms-iframe');
                        if (kfIframe && (!kfIframe.src || kfIframe.src === 'about:blank' || kfIframe.src.endsWith('about:blank'))) kfIframe.src = 'kingForms.html';
                    }
                } else {
                    mainNavLink.click();
                }
                return;
            }

            // 2) Hash é uma aba do editor (ex: info-editor, items-editor, personalizar-editor)?
            const editorNavLink = document.querySelector(`[data-editor-target="${targetId}"]`);
            if (editorNavLink) {
                const editarLink = document.querySelector(`.sidebar .nav-link[data-target="editar-pane"]`);
                if (editarLink) {
                    if (window.innerWidth <= 768) {
                        document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
                        editarLink.classList.add('active');
                        document.querySelectorAll('.main-content').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
                        const ep = document.getElementById('editar-pane');
                        if (ep) { ep.classList.add('active'); ep.style.display = 'flex'; }
                        setTimeout(() => editorNavLink.click(), 50);
                    } else {
                        editarLink.click();
                        setTimeout(() => editorNavLink.click(), 50);
                    }
                }
            }
        };

        // Processar hash IMEDIATAMENTE para evitar flash do painel errado (especialmente mobile)
        processHashOnLoad(); // execução imediata
        requestAnimationFrame(() => processHashOnLoad()); // após primeiro frame
        const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
        if (isMobile) setTimeout(processHashOnLoad, 150); // backup no mobile
        window.addEventListener('hashchange', processHashOnLoad);
        const iconList = ['fab fa-instagram', 'fab fa-whatsapp', 'fab fa-tiktok', 'fab fa-youtube', 'fab fa-linkedin', 'fas fa-briefcase', 'fab fa-github', 'fas fa-globe', 'fas fa-envelope', 'fas fa-phone', 'fas fa-file-pdf', 'fas fa-map-marker-alt', 'fab fa-telegram', 'fab fa-spotify', 'fab fa-discord', 'fas fa-link', 'fas fa-dollar-sign', 'fab fa-facebook', 'fab fa-twitter', 'fab fa-pinterest', 'fab fa-behance', 'fab fa-dribbble', 'fab fa-spotify'];
        const renderIcons = (filter = '') => {
            SELECTORS.iconGrid.innerHTML = '';
            iconList.filter(icon => icon.includes(filter.toLowerCase())).forEach(iconClass => {
                const iconItem = document.createElement('div');
                iconItem.className = 'icon-grid-item';
                iconItem.dataset.icon = iconClass;
                iconItem.innerHTML = `<i class="${iconClass}"></i>`;
                SELECTORS.iconGrid.appendChild(iconItem);
            });
        };
        SELECTORS.iconSearchInput.addEventListener('input', e => renderIcons(e.target.value));
        SELECTORS.iconGrid.addEventListener('click', e => {
            const iconItem = e.target.closest('.icon-grid-item');
            if (iconItem) {
                const iconClass = iconItem.dataset.icon;
                const linkToUpdate = document.querySelector(`.item[data-id='${activeItemIdForIconPicker}'] .item-icon-picker`);
                if (linkToUpdate) {
                    linkToUpdate.className = `${iconClass} item-icon-picker`;
                }
                SELECTORS.iconModal.classList.remove('active');
                updateLivePreviewFromForm();
            }
        });
        SELECTORS.closeModalBtn.addEventListener('click', () => SELECTORS.iconModal.classList.remove('active'));
        if (SELECTORS.previewToggleBtn) {
            SELECTORS.previewToggleBtn.addEventListener('click', () => {
                SELECTORS.livePreview.classList.toggle('visible');
            });
        }

        if (SELECTORS.livePreview) {
            SELECTORS.livePreview.addEventListener('click', (e) => {
                if (e.target === SELECTORS.livePreview) {
                    SELECTORS.livePreview.classList.remove('visible');
                }
            });
        }

        const copyUrlBtn = document.getElementById('copy-url-btn');
        if (copyUrlBtn) {
            copyUrlBtn.addEventListener('click', () => {
                // Obter URL do perfil de diferentes formas
                let userUrl = '';

                if (SELECTORS.publicLink && SELECTORS.publicLink.href) {
                    userUrl = SELECTORS.publicLink.href;
                } else if (SELECTORS.profileSlugInput && SELECTORS.profileSlugInput.value) {
                    const slug = SELECTORS.profileSlugInput.value.trim();
                    if (slug) {
                        userUrl = `https://tag.conectaking.com.br/${slug}`;
                    }
                } else if (window.lastProfileData && window.lastProfileData.details && window.lastProfileData.details.profile_slug) {
                    userUrl = `https://tag.conectaking.com.br/${window.lastProfileData.details.profile_slug}`;
                } else {
                    const user = JSON.parse(localStorage.getItem('conectaKingUser') || '{}');
                    if (user.id) {
                        userUrl = `https://tag.conectaking.com.br/${user.id}`;
                    }
                }

                if (userUrl) {
                    navigator.clipboard.writeText(userUrl).then(() => {
                        copyUrlBtn.textContent = 'Copiado!';
                        setTimeout(() => { copyUrlBtn.textContent = 'Copiar'; }, 2000);
                    }).catch(err => {
                        console.error('Erro ao copiar URL:', err);
                        // Fallback para navegadores mais antigos
                        const textArea = document.createElement('textarea');
                        textArea.value = userUrl;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        copyUrlBtn.textContent = 'Copiado!';
                        setTimeout(() => { copyUrlBtn.textContent = 'Copiar'; }, 2000);
                    });
                } else {
                    alert('Não foi possível obter a URL do perfil. Verifique se o perfil está configurado.');
                }
            });
        }

        const downloadQrBtn = document.getElementById('download-qr-btn');
        const downloadQrBtnAlt = document.getElementById('download-qr-btn-alt');
        const downloadFunction = async () => {
            await composeShareQrArt();
            const art = document.getElementById('qr-art-canvas');
            if (!art) {
                alert('Não foi possível gerar a arte do QR Code. Abra a aba Compartilhar e tente de novo.');
                return;
            }
            try {
                const meta = getShareQrMeta();
                const slug = (meta.slug || 'tag').replace(/[^\w\-]+/g, '');
                const imageUrl = art.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = imageUrl;
                link.download = 'QRCode-' + slug + '.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (err) {
                console.error('Erro ao baixar arte do QR:', err);
                alert('Não foi possível baixar a arte (a logomarca pode bloquear o download). Desmarque ?oIncluir logomarca— e tente de novo.');
            }
        };

        if (downloadQrBtn) downloadQrBtn.addEventListener('click', downloadFunction);
        if (downloadQrBtnAlt) downloadQrBtnAlt.addEventListener('click', downloadFunction);

        // --- Nova Lf³gica de UI para Adicionar Item ---
        if (SELECTORS.addItemBtn) {
            SELECTORS.addItemBtn.addEventListener('click', () => {
                if (SELECTORS.addItemModal) SELECTORS.addItemModal.classList.add('active');
            });
        }
        if (SELECTORS.closeAddModalBtn) {
            SELECTORS.closeAddModalBtn.addEventListener('click', () => {
                if (SELECTORS.addItemModal) SELECTORS.addItemModal.classList.remove('active');
            });
        }
        if (SELECTORS.buttonFontSizePicker) {
            SELECTORS.buttonFontSizePicker.addEventListener('input', updateLivePreviewFromForm);
        }
        // Event listeners para alinhamento da logo já foram adicionados acima
        if (SELECTORS.sidebarNavLinks) {
            SELECTORS.sidebarNavLinks.forEach(link => {
                const targetId = link.dataset.target;
                if (targetId) {
                    link.addEventListener('click', e => {
                        e.preventDefault();

                        if (targetId === 'relatorios-pane') {
                            if (typeof window.loadReportsData === 'function') window.loadReportsData();
                        }
                        if (targetId === 'compartilhar-pane') {
                            generateQRCode();
                        }
                        if (targetId === 'finance-pane') {
                            if (window.initFinancePane) {
                                window.initFinancePane();
                            }
                        }
                        if (targetId === 'contratos-pane') { return; }
                        if (targetId === 'agenda-pane') { return; }
                        if (targetId === 'branding-pane') {
                            if (window.DashboardEmpresa && typeof window.DashboardEmpresa.loadBrandingData === 'function') {
                                window.DashboardEmpresa.loadBrandingData();
                            } else if (typeof window.loadBrandingData === 'function') {
                                window.loadBrandingData();
                            }
                        }
                    });
                }
            });
        }
        if (SELECTORS.periodSelector) {
            SELECTORS.periodSelector.addEventListener('change', function () {
                if (typeof window.loadReportsData === 'function') window.loadReportsData();
            });
        }
        if (SELECTORS.cardBackgroundColorPicker) SELECTORS.cardBackgroundColorPicker.addEventListener('input', updateLivePreviewFromForm);
        if (SELECTORS.cardOpacityPicker) SELECTORS.cardOpacityPicker.addEventListener('input', updateLivePreviewFromForm);
        // Presets de curvatura da borda
        const radiusPresetRadios = document.querySelectorAll('input[name="radius-preset"]');
        if (radiusPresetRadios && radiusPresetRadios.length) {
            radiusPresetRadios.forEach(r => {
                r.addEventListener('change', () => {
                    const val = r.value;
                    // Valores padrf£o
                    let tl = 12, tr = 12, br = 12, bl = 12;
                    switch (val) {
                        case 'all':
                            // Para "Uniforme", usa o valor atual do primeiro input ou 12 como padrf£o
                            const currentValue = parseInt(SELECTORS.radiusTL?.value || 12, 10);
                            tl = tr = br = bl = currentValue;
                            break;
                        case 'alt':
                            tl = bl = 20; tr = br = 8; break;
                        case 'square':
                            tl = tr = br = bl = 0; break;
                        case 'soft':
                            tl = tr = br = bl = 8; break;
                        case 'pill':
                            tl = tr = br = bl = 999; break;
                        case 'top':
                            tl = tr = 20; br = bl = 0; break;
                        case 'bottom':
                            tl = tr = 0; br = bl = 20; break;
                        case 'diagonal':
                            tl = br = 20; tr = bl = 0; break;
                        case 'invert':
                            tl = br = 0; tr = bl = 20; break;
                    }
                    if (SELECTORS.radiusTL) SELECTORS.radiusTL.value = tl;
                    if (SELECTORS.radiusTR) SELECTORS.radiusTR.value = tr;
                    if (SELECTORS.radiusBR) SELECTORS.radiusBR.value = br;
                    if (SELECTORS.radiusBL) SELECTORS.radiusBL.value = bl;
                    updateLivePreviewFromForm();
                });
            });
        }

        // Funf§f£o para detectar qual preset estf¡ ativo baseado nos valores atuais
        function detectActivePreset() {
            const tl = parseInt(SELECTORS.radiusTL?.value || 12, 10);
            const tr = parseInt(SELECTORS.radiusTR?.value || 12, 10);
            const br = parseInt(SELECTORS.radiusBR?.value || 12, 10);
            const bl = parseInt(SELECTORS.radiusBL?.value || 12, 10);

            // Verifica se corresponde a algum preset
            if (tl === tr && tr === br && br === bl) {
                if (tl === 0) return 'square';
                if (tl === 8) return 'soft';
                if (tl >= 999) return 'pill';
                return 'all';
            }
            if (tl === bl && tr === br && tl === 20 && tr === 8) return 'alt';
            if (tl === tr && br === bl && tl === 20 && br === 0) return 'top';
            if (tl === tr && br === bl && tl === 0 && br === 20) return 'bottom';
            if (tl === br && tr === bl && tl === 20 && tr === 0) return 'diagonal';
            if (tl === br && tr === bl && tl === 0 && tr === 20) return 'invert';

            return null; // Valores customizados
        }

        // Funf§f£o para atualizar o preset selecionado
        function updatePresetSelection() {
            const activePreset = detectActivePreset();
            const presetRadios = document.querySelectorAll('input[name="radius-preset"]');

            presetRadios.forEach(radio => {
                radio.checked = radio.value === activePreset;
            });
        }

        // Inputs individuais de raio com sincronizaf§f£o
        if (SELECTORS.radiusTL) {
            SELECTORS.radiusTL.addEventListener('input', () => {
                updateLivePreviewFromForm();
                updatePresetSelection();
            });
        }
        if (SELECTORS.radiusTR) {
            SELECTORS.radiusTR.addEventListener('input', () => {
                updateLivePreviewFromForm();
                updatePresetSelection();
            });
        }
        if (SELECTORS.radiusBR) {
            SELECTORS.radiusBR.addEventListener('input', () => {
                updateLivePreviewFromForm();
                updatePresetSelection();
            });
        }
        if (SELECTORS.radiusBL) {
            SELECTORS.radiusBL.addEventListener('input', () => {
                updateLivePreviewFromForm();
                updatePresetSelection();
            });
        }

        // Botf£o "Aplicar como padrf£o"
        const saveRadiusDefaultBtn = document.getElementById('save-radius-default-btn');
        if (saveRadiusDefaultBtn) {
            saveRadiusDefaultBtn.addEventListener('click', () => {
                const tl = parseInt(SELECTORS.radiusTL?.value || 12, 10);
                const tr = parseInt(SELECTORS.radiusTR?.value || 12, 10);
                const br = parseInt(SELECTORS.radiusBR?.value || 12, 10);
                const bl = parseInt(SELECTORS.radiusBL?.value || 12, 10);

                // Salva os valores no localStorage para usar como padrf£o
                localStorage.setItem('defaultBorderRadius', JSON.stringify({ tl, tr, br, bl }));

                // Feedback visual
                const originalText = saveRadiusDefaultBtn.textContent;
                saveRadiusDefaultBtn.textContent = 'Salvo!';
                saveRadiusDefaultBtn.style.backgroundColor = 'var(--dourado-principal)';
                saveRadiusDefaultBtn.style.color = '#000';

                setTimeout(() => {
                    saveRadiusDefaultBtn.textContent = originalText;
                    saveRadiusDefaultBtn.style.backgroundColor = '';
                    saveRadiusDefaultBtn.style.color = '';
                }, 2000);
            });
        }
        if (SELECTORS.addItemModal) {
            SELECTORS.addItemModal.addEventListener('click', async e => {
                if (e.target === SELECTORS.addItemModal) {
                    SELECTORS.addItemModal.classList.remove('active');
                    return;
                }
                const choiceBtn = e.target.closest('.add-choice-btn');
                if (choiceBtn) {
                    const itemType = choiceBtn.dataset.itemType;

                    // IMPORTANTE: sales_page e digital_form são criados DIRETAMENTE no servidor
                    if (itemType === 'sales_page' || itemType === 'digital_form') {
                        console.log(`z. Criando ${itemType} DIRETAMENTE no servidor...`);

                        try {
                            const response = await fetch(`${API_URL}/api/profile/items`, {
                                method: 'POST',
                                headers: HEADERS,
                                body: JSON.stringify({
                                    item_type: itemType,
                                    is_active: true,
                                    display_order: 999
                                })
                            });

                            if (!response.ok) {
                                const errorData = await response.json().catch(() => ({ message: `Erro ao criar ${itemType}` }));
                                throw new Error(errorData.message || `Erro ao criar ${itemType}`);
                            }

                            const newItem = await response.json();
                            console.log(`${itemType} criado diretamente no servidor:`, newItem);

                            SELECTORS.addItemModal.classList.remove('active');

                            // Pequeno delay para garantir que o backend processou
                            await new Promise(resolve => setTimeout(resolve, 300));

                            // Forçar atualização imediata ignorando cooldown
                            await fetchProfileData(true);

                            // Garantir que o editor seja renderizado após atualizar dados
                            setTimeout(() => {
                                renderEditor(window.currentProfileData);
                            }, 100);
                        } catch (error) {
                            console.error(`O Erro ao criar ${itemType}:`, error);
                            const moduleName = itemType === 'sales_page' ? 'página de vendas' : 'formulário digital';
                            alert(`Não foi possível criar o ${moduleName}: ${error.message}`);
                        }
                        return;
                    }

                    // Para outros módulos, usar o fluxo padrão
                    try {
                        const response = await safeFetch(`${API_URL}/api/profile/items`, { method: 'POST', body: JSON.stringify({ item_type: itemType }) });

                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({ message: 'Erro ao criar item' }));
                            throw new Error(errorData.message || 'Erro ao criar item');
                        }

                        const newItem = await response.json();
                        console.log('Item criado com sucesso:', newItem);

                        SELECTORS.addItemModal.classList.remove('active');

                        // Pequeno delay para garantir que o backend processou
                        await new Promise(resolve => setTimeout(resolve, 300));

                        // Forçar atualização imediata ignorando cooldown
                        await fetchProfileData(true);

                        // Garantir que o editor seja renderizado após atualizar dados
                        setTimeout(() => {
                            renderEditor(window.currentProfileData);
                        }, 100);
                    } catch (error) {
                        console.error("O Erro ao criar item:", error);
                        alert(`Não foi possível criar o item: ${error.message}`);
                    }
                }
            });
        }

        // Função para configurar upload de foto de perfil (acessível globalmente)
        window.setupPhotoUpload = function () {
            // Buscar elementos novamente (podem ter sido criados dinamicamente)
            const uploadArea = document.getElementById('dashboard-photo-upload-area');
            const fileInput = document.getElementById('dashboard-photo-file-input');

            if (!uploadArea || !fileInput) {
                console.warn('Elementos de upload de foto não encontrados ainda:', {
                    uploadArea: !!uploadArea,
                    fileInput: !!fileInput
                });
                return false;
            }

            // Verificar se já tem listeners (evitar duplicação)
            if (uploadArea.dataset.listenersAdded === 'true') {
                console.log('Listeners já adicionados, pulando...');
                return true;
            }

            // Garantir que o input cubra toda a área e seja clicável
            fileInput.style.position = 'absolute';
            fileInput.style.top = '0';
            fileInput.style.left = '0';
            fileInput.style.width = '100%';
            fileInput.style.height = '100%';
            fileInput.style.opacity = '0';
            fileInput.style.cursor = 'pointer';
            fileInput.style.zIndex = '10';

            // Não adicionar listener na área, deixar o input fazer o trabalho diretamente
            // O input já cobre toda a área, então qualquer clique vai nele

            // Event listener para quando arquivo é selecionado
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                console.log('Arquivo selecionado:', file ? file.name : 'nenhum');
                if (file) {
                    openCropper(file, 'profile');
                    // Resetar input para permitir selecionar o mesmo arquivo novamente
                    setTimeout(() => {
                        e.target.value = '';
                    }, 100);
                }
            });

            // Marcar que listeners foram adicionados
            uploadArea.dataset.listenersAdded = 'true';

            console.log('Upload de foto configurado com sucesso');
            return true;
        };

        // Tentar configurar imediatamente
        window.setupPhotoUpload();

        // Também configurar após delays (caso os elementos sejam criados dinamicamente)
        setTimeout(() => {
            window.setupPhotoUpload();
        }, 500);

        setTimeout(() => {
            window.setupPhotoUpload();
        }, 1500);
        document.getElementById('cancel-crop-btn').addEventListener('click', closeCropper);
        document.getElementById('crop-and-upload-btn').addEventListener('click', () => {
            if (!cropper) return;

            // Detectar tipo original do arquivo para preservar PNG
            const originalFile = imageToUpload.originalFile;
            const isPNG = originalFile && (originalFile.type === 'image/png' || originalFile.name.toLowerCase().endsWith('.png'));
            const mimeType = isPNG ? 'image/png' : 'image/jpeg';
            const quality = isPNG ? 1.0 : 0.9;  // PNG usa qualidade máxima (sem perda)

            cropper.getCroppedCanvas({
                width: imageToUpload.trigger === 'vitrine-hero' ? 1920 : 1920,
                height: imageToUpload.trigger === 'vitrine-hero' ? 1080 : undefined,
                imageSmoothingQuality: 'high',
            }).toBlob(blob => {
                // Preservar PNG com nome correto para manter transparência
                if (isPNG) {
                    // Criar um novo File com nome .png para garantir que seja tratado como PNG
                    const fileName = originalFile && originalFile.name ? originalFile.name : 'profile-picture.png';
                    const pngFile = new File([blob], fileName, { type: 'image/png' });
                    if (imageToUpload.trigger === 'profile') {
                        handleDashboardPhotoUpload(pngFile);
                    } else if (imageToUpload.trigger === 'banner') {
                        handleImageUpload(pngFile, imageToUpload.element);
                    } else if (imageToUpload.trigger === 'wifi-banner') {
                        handleImageUpload(pngFile, imageToUpload.element);
                    } else if (imageToUpload.trigger === 'background') {
                        handleBackgroundUpload(pngFile);
                    } else if (imageToUpload.trigger === 'carousel') {
                        handleImageUpload(pngFile, imageToUpload.element);
                    } else if (imageToUpload.trigger === 'share-image') {
                        handleShareImageUpload(pngFile);
                    } else if (imageToUpload.trigger === 'vitrine-hero') {
                        handleVitrineHeroUpload(pngFile);
                    }
                } else {
                    // JPEG normal
                    if (imageToUpload.trigger === 'profile') {
                        handleDashboardPhotoUpload(blob);
                    } else if (imageToUpload.trigger === 'banner') {
                        handleImageUpload(blob, imageToUpload.element);
                    } else if (imageToUpload.trigger === 'wifi-banner') {
                        handleImageUpload(blob, imageToUpload.element);
                    } else if (imageToUpload.trigger === 'background') {
                        handleBackgroundUpload(blob);
                    } else if (imageToUpload.trigger === 'carousel') {
                        handleImageUpload(blob, imageToUpload.element);
                    } else if (imageToUpload.trigger === 'share-image') {
                        handleShareImageUpload(blob);
                    } else if (imageToUpload.trigger === 'vitrine-hero') {
                        handleVitrineHeroUpload(blob);
                    }
                }

                closeCropper();
            }, mimeType, quality);
        });

        renderIcons();

        // Event listeners para carrossel - usar delegaf§f£o de eventos
        document.addEventListener('click', async (e) => {
            // Botão de adicionar foto
            if (e.target.closest('.add-carousel-image-btn')) {
                const btn = e.target.closest('.add-carousel-image-btn');
                const itemId = btn.dataset.itemId;
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        openCropper(file, 'carousel', document.querySelector(`.item[data-id="${itemId}"]`));
                        window.currentCarouselItemId = itemId;
                    }
                };
                input.click();
            }
            // Remoção de imagem é tratada no listener específico do modal (SELECTORS.editModalBody)
        });

        // Event listener para input file do carrossel/banner (delegação de eventos)
        document.addEventListener('change', async (e) => {
            if (e.target.classList.contains('add-carousel-image-input')) {
                const input = e.target;
                const itemId = input.dataset.itemId;
                const file = input.files[0];
                if (file) {
                    console.log('Arquivo selecionado para item:', itemId);
                    const itemEl = document.querySelector(`.item[data-id="${itemId}"]`);
                    window.currentCarouselItemId = itemId;
                    openCropper(file, 'carousel', itemEl);
                }
                // Resetar input para permitir selecionar o mesmo arquivo novamente
                input.value = '';
            }
        });

        // Event listener adicional para cliques no container (fallback)
        document.addEventListener('click', (e) => {
            // Handler para remover imagem do carrossel (fallback global)
            if (e.target.closest('.remove-carousel-image-btn')) {
                const btn = e.target.closest('.remove-carousel-image-btn');
                const itemId = btn.dataset.itemId;
                const imageIndex = parseInt(btn.dataset.imageIndex);
                const itemEl = document.querySelector(`.item[data-id="${itemId}"]`);
                const itemType = itemEl?.dataset?.itemType;

                if (itemType === 'carousel') {
                    // ===== NOVO CARROSSEL - Remover =====
                    removeCarouselImageNew(itemId, imageIndex);
                } else if (itemType === 'banner') {
                    // Banner não suporta carrossel: remover limpa tudo
                    const modalHidden = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-dest-url-hidden`);
                    const modalImageUrl = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-image-url`);
                    const modalPreview = document.getElementById('edit-banner-preview');
                    const itemImageInput = document.querySelector(`.item[data-id="${itemId}"] .item-image-url-input`);
                    const itemDestInput = document.querySelector(`.item[data-id="${itemId}"] .item-destination-url-input`);
                    const displayDest = document.querySelector(`.item[data-id="${itemId}"] .item-display-dest`);

                    if (modalHidden) modalHidden.value = '';
                    if (modalImageUrl) modalImageUrl.value = '';
                    if (itemImageInput) itemImageInput.value = '';
                    if (itemDestInput && itemDestInput.value && itemDestInput.value.startsWith('[')) {
                        // se estava JSON, limpar
                        itemDestInput.value = '';
                    }
                    if (modalPreview) {
                        modalPreview.src = '';
                        modalPreview.style.display = 'none';
                    }
                    if (displayDest) displayDest.textContent = 'Sem destino';
                    // remover visualmente o bloco da imagem atual (se existir no modal)
                    const imageContainer = btn.closest('.carousel-image-item');
                    if (imageContainer) imageContainer.remove();
                    const imageContainerNew = btn.closest('.carousel-image-item-new');
                    if (imageContainerNew) imageContainerNew.remove();
                    console.log('Banner: imagem removida e campos limpos');
                }
                return;
            }

            const uploadArea = e.target.closest('.carousel-upload-trigger');
            if (uploadArea && !e.target.closest('input')) {
                const itemId = uploadArea.dataset.itemId;
                const input = document.querySelector(`#carousel-input-${itemId}`);
                if (input) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Clicou no container, abrindo input para item:', itemId);
                    input.click();
                }
            }
        });
    }

    // Funf§f£o para renderizar lista de imagens do carrossel
    // Função específica para o novo módulo Carrossel (não banner)
    // ===== NOVO CARROSSEL - FUN—.ES LIMPAS =====

    // Função para renderizar imagens do carrossel
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
            console.log(`[CARROSSEL] JSON do modal atualizado: ${realImages.length} imagem(ns)`);
        }
        if (jsonInputItem) {
            jsonInputItem.value = jsonValue;
            console.log(`[CARROSSEL] JSON do item atualizado: ${realImages.length} imagem(ns)`);
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

    async function handleShareImageUpload(imageBlob) {
        try {
            console.log('Iniciando upload da imagem de compartilhamento...');

            // Obter autorização para upload
            const authResponse = await safeFetch(`${API_URL}/api/upload/auth`, {
                method: 'POST',
                headers: HEADERS_AUTH
            });

            if (!authResponse.ok) {
                const errorText = await authResponse.text();
                console.error('O Erro na autorização:', errorText);
                throw new Error('Falha na autorização para upload.');
            }

            const authData = await authResponse.json();
            const uploadURL = authData.uploadURL;

            if (!uploadURL) {
                throw new Error('URL de upload não recebida');
            }

            console.log('Autorização obtida, fazendo upload...');

            // Fazer upload para Cloudflare
            const formData = new FormData();
            const isPNG = imageBlob.type === 'image/png';
            const fileName = isPNG ? 'share-image.png' : 'share-image.jpg';
            formData.append('file', imageBlob, fileName);

            const uploadResponse = await fetch(uploadURL, { method: 'POST', headers: getAuthHeaders(), body: formData });

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error('O Erro no upload para Cloudflare:', errorText);
                throw new Error('Falha no upload para o Cloudflare.');
            }

            const uploadData = await uploadResponse.json();
            console.log('Upload para Cloudflare concluído:', uploadData);

            const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";
            const finalUrl = (uploadData.url || uploadData.imageUrl) || (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : '');
            if (!finalUrl) {
                throw new Error('Resposta do servidor de upload inválida. Tente novamente.');
            }
            console.log('URL final gerada:', finalUrl);

            // Salvar no servidor
            console.log('Salvando URL no servidor...');
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
                console.error('O Erro ao salvar no servidor:', errorData);

                // Verificar se é erro de migration
                if (errorData.error === 'MIGRATION_REQUIRED') {
                    alert('? necessário executar a migration 019 primeiro. A coluna share_image_url ainda não existe no banco de dados.');
                } else {
                    throw new Error(errorData.message || 'Erro ao salvar imagem de compartilhamento');
                }
                return;
            }

            const saveData = await saveResponse.json();
            console.log('Imagem salva com sucesso:', saveData);

            alert('Imagem de compartilhamento salva com sucesso!');

            // Recarregar dados
            await fetchProfileData(true);

            // Reabrir seção se estiver aberta
            if (SELECTORS.btnConfigCabecalho?.classList.contains('active')) {
                SELECTORS.btnConfigCabecalho.click();
            }

        } catch (error) {
            console.error('O Erro completo no upload da imagem de compartilhamento:', error);
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

    async function fetchProfileData(forceRefresh = false) {
        window.fetchProfileData = fetchProfileData; // permite que duplicateItem chame após duplicar
        try {
            // Se forceRefresh for true, SEMPRE forçar atualização imediata
            if (forceRefresh) {
                console.log('Y"" FOR?ANDO atualização imediata (ignorando cooldown e requisições em andamento)...');
                // Limpar promise anterior se existir para forçar nova requisição
                profileFetchPromise = null;
                lastProfileFetch = 0; // Resetar cooldown completamente
            } else {
                // Implementar cooldown apenas se não for forçado
                const now = Date.now();

                // Verificar se há requisição em andamento apenas se não for forçado
                if (profileFetchPromise) {
                    console.log('⏳ Aguardando requisição em andamento...');
                    return await profileFetchPromise;
                }

                // Verificar cooldown apenas se não for forçado
                if ((now - lastProfileFetch) < PROFILE_FETCH_COOLDOWN) {
                    const waitSeconds = Math.ceil((PROFILE_FETCH_COOLDOWN - (now - lastProfileFetch)) / 1000);
                    console.log(`⏳ Cooldown ativo. Aguarde ${waitSeconds} segundos.`);
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
                                console.log('Token expirado, tentando renovar...');
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
            console.log('Dados recebidos da API:', data);
            console.log('Estrutura dos dados:', {
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

            console.log('Dados validados com sucesso. Renderizando editor...');
            console.log(`Y"S Total de itens para renderizar: ${profileData.items?.length || 0}`);
            if (profileData.items && profileData.items.length > 0) {
                console.log(`Y"< IDs dos itens:`, profileData.items.map(item => `${item.id} (${item.item_type})`).join(', '));
            }

            // IMPORTANTE: Atualizar window.currentProfileData para garantir que está sincronizado
            window.currentProfileData = profileData;
            currentProfileData = profileData;

            console.log('window.currentProfileData atualizado com', profileData.items?.length || 0, 'itens');
            if (profileData.items && profileData.items.length > 0) {
                console.log('Y"< Itens atualizados:', profileData.items.map(item => ({
                    id: item.id,
                    type: item.item_type,
                    hasImage: !!item.image_url,
                    imageUrl: item.image_url ? item.image_url.substring(0, 50) + '...' : 'sem logo'
                })));
            }

            // Renderizar editor com dados validados
            try {
                console.log('YZ Chamando renderEditor...');
                renderEditor(profileData);
                console.log('renderEditor concluído com sucesso');

                reconcileModulesListWithProfileData(profileData);
            } catch (renderError) {
                console.error('O Erro ao renderizar editor:', renderError);
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
            console.error('O Erro ao carregar perfil:', error);
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

    // ========== FUN—.ES PARA GERENCIAR PRODUTOS DO CATÁLOGO ==========
    // REMOVIDO COMPLETAMENTE
    /*
    async function loadProductsForCatalog(itemId) {
        // Tentar primeiro dentro do modal aberto; se não achar, usa o documento inteiro
        const productsListEl = SELECTORS.editModalBody?.querySelector(`#products-list-${itemId}`) 
            || document.getElementById(`products-list-${itemId}`);
        if (!productsListEl) {
            console.error('Elemento products-list não encontrado para itemId:', itemId);
            return;
        }
        
        console.log('Carregando produtos para itemId:', itemId);
        
        try {
            const response = await safeFetch(`${API_URL}/api/profile/items/${itemId}/products`, { headers: HEADERS });
            console.log('Resposta da API:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Erro na resposta da API:', errorText);
                throw new Error(`Erro ao carregar produtos: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Dados recebidos da API:', data);
            const products = data.products || [];
            console.log('Produtos processados:', products.length);
            
            // Atualizar contador no display do item
            const itemEl = document.querySelector(`[data-id="${itemId}"]`);
            if (itemEl) {
                const displayEl = itemEl.querySelector('.item-display-dest');
                if (displayEl) {
                    displayEl.textContent = `${products.length} produto${products.length !== 1 ? 's' : ''}`;
                }
            }
            
            console.log('Elemento productsListEl encontrado:', productsListEl);
            console.log('Tentando renderizar produtos. Quantidade:', products.length);
            
            if (products.length === 0) {
                console.log('Nenhum produto encontrado, exibindo mensagem vazia');
                productsListEl.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Nenhum produto cadastrado ainda.</p>';
            } else {
                console.log('Renderizando produtos no HTML...');
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
                console.log('HTML gerado, definindo innerHTML...');
                productsListEl.innerHTML = productsHTML;
                console.log('innerHTML definido com sucesso');
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
                
                console.log(`Y' Salvando produto:`, { itemId, productId, requestBody, method, url });
                console.log(`Headers:`, HEADERS);
                
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
                    console.error('O Erro ao salvar produto:', errorMessage);
                    throw new Error(errorMessage);
                }
                
                const result = await response.json();
                console.log('Produto salvo com sucesso:', result);
                
                // Verificar se o produto foi realmente salvo
                if (!result.product && !result.message) {
                    console.warn('Resposta da API não contém produto ou mensagem:', result);
                }
                
                // Fechar modal do produto
                modal.remove();
                
                // Aguardar um pouco antes de recarregar para garantir que o backend processou
                setTimeout(async () => {
                    try {
                        console.log(`Y"" Recarregando produtos após salvar produto para catálogo ${itemId}...`);
                        await loadProductsForCatalog(itemId);
                        console.log('Produtos recarregados com sucesso');
                    } catch (err) {
                        console.error('O Erro ao recarregar produtos após salvar:', err);
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
                console.error('O Erro ao salvar produto:', error);
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

    async function main() {
        console.log('Ys? Iniciando função main()...');
        setupEventListeners();

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
                console.log(showEmpresa ? 'Aba "Empresa" visível (ADM, modo empresa ou plano com Modo Empresa)' : 'Aba "Empresa" oculta');
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
            console.log('fetchProfileData() concluído com sucesso');
        }).catch(function (error) {
            console.error('O Erro ao carregar dados do perfil:', error);
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
                window.location.href = 'index.html#planos';
                return;
            }

            applyEmpresaTabAndControls(updatedUser);

            // Aplicar visibilidade dos módulos (Gestão Financeira, Contratos, Agenda)
            console.log('[Dashboard] Aplicando visibilidade dos módulos para:', {
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
            console.log('Abrindo menu mobile');
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
            console.log('Fechando menu mobile');
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

        console.log('Menu mobile inicializado com sucesso!');
    }

    // Inicializar menu mobile
    initMobileMenu();

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

    // Event listener para upload de foto de perfil já foi configurado anteriormente
    // Não duplicar aqui para evitar conflitos

    // ============================================
    // FUNCIONALIDADE DE ASSINATURA
    // ============================================

    let subscriptionData = null;
    let isAdmin = false;

    // Carregar informações de assinatura
    async function loadSubscriptionInfo() {
        try {
            const response = await safeFetch(`${API_URL}/api/subscription/info`, {
                method: 'GET',
                headers: HEADERS_AUTH
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar informações de assinatura');
            }

            subscriptionData = await response.json();
            isAdmin = subscriptionData.user?.isAdmin || false;

            renderSubscriptionInfo();
            await renderSubscriptionPlans();

            // Se for admin, mostrar seção de edição
            // Mostrar link de personalizar link apenas para ADM
            const personalizarLinkLink = document.getElementById('personalizar-link-link');
            if (personalizarLinkLink && isAdmin) {
                personalizarLinkLink.style.display = 'block';
            }

            if (isAdmin) {
                document.getElementById('subscription-admin-section').style.display = 'block';
                loadPlansForEdit();
            }
        } catch (error) {
            console.error('Erro ao carregar informações de assinatura:', error);
            document.getElementById('subscription-info').innerHTML = `
                <p style="color: #ff4444;">Erro ao carregar informações. Tente novamente.</p>
            `;
        }
    }

    // Renderizar informações da assinatura atual
    function renderSubscriptionInfo() {
        const infoContainer = document.getElementById('subscription-info');
        const user = subscriptionData.user;
        const currentPlan = subscriptionData.currentPlan;

        if (!user) {
            infoContainer.innerHTML = '<p>Nenhuma informação disponível.</p>';
            return;
        }

        const statusColors = {
            'active': '#4CAF50',
            'expired': '#ff4444',
            'expired_trial': '#ff9800',
            'pre_sale_trial': '#2196F3'
        };

        const statusText = {
            'active': 'Ativo',
            'active_onetime': 'Ativo',
            'expired': 'Expirado',
            'expired_trial': 'Expirado',
            'pre_sale_trial': 'Ativo'
        };

        const statusColor = statusColors[user.subscriptionStatus] || '#999';
        const statusLabel = statusText[user.subscriptionStatus] || user.subscriptionStatus;

        const expiresAt = user.subscriptionExpiresAt
            ? new Date(user.subscriptionExpiresAt).toLocaleDateString('pt-BR')
            : 'Não definido';

        const createdAt = user.createdAt
            ? new Date(user.createdAt).toLocaleDateString('pt-BR')
            : 'Não definido';

        infoContainer.innerHTML = `
            <div class="subscription-info-item">
                <label>Status:</label>
                <span style="color: ${statusColor}; font-weight: 600;">${statusLabel}</span>
            </div>
            <div class="subscription-info-item">
                <label>Plano Atual:</label>
                <span style="font-weight: 600; color: var(--dourado-principal, #FFC700);">
                    ${currentPlan ? currentPlan.plan_name : 'Nenhum plano ativo'}
                </span>
            </div>
            ${currentPlan ? `
            <div class="subscription-info-item">
                <label>Preço Mensal:</label>
                <span style="font-size: 1.1rem; font-weight: 600; color: var(--dourado-principal, #FFC700);">
                    R$ ${currentPlan.monthly_price ? parseFloat(currentPlan.monthly_price).toFixed(2).replace('.', ',') : parseFloat(currentPlan.price / 12).toFixed(2).replace('.', ',')}/mês
                </span>
            </div>
            <div class="subscription-info-item">
                <label>Preço Anual:</label>
                <span style="font-size: 1.1rem; font-weight: 600; color: var(--dourado-principal, #FFC700);">
                    R$ ${currentPlan.annual_price ? parseFloat(currentPlan.annual_price).toFixed(2).replace('.', ',') : parseFloat(currentPlan.price).toFixed(2).replace('.', ',')}/ano
                </span>
            </div>
            ` : ''}
            <div class="subscription-info-item">
                <label>Data de Assinatura:</label>
                <span>${createdAt}</span>
            </div>
            <div class="subscription-info-item">
                <label>Data de Expiração:</label>
                <span>${expiresAt}</span>
            </div>
        `;
    }

    // Mapear plan_code para account_type (para buscar módulos)
    const planCodeToAccountType = {
        'basic': 'individual',
        'premium': 'individual_com_logo',
        'enterprise': 'business_owner'
    };

    // Buscar módulos disponíveis por plano
    let planModulesCache = {};

    async function loadPlanModules(planCode) {
        // Se já está no cache, retornar
        if (planModulesCache[planCode]) {
            return planModulesCache[planCode];
        }

        try {
            const accountType = planCodeToAccountType[planCode];
            if (!accountType) {
                return { available: [], unavailable: [] };
            }

            const response = await safeFetch(`${API_URL}/api/modules/available?plan_code=${accountType}`, {
                method: 'GET',
                headers: HEADERS_AUTH
            });

            if (!response.ok) {
                // Se não houver rota específica, buscar da tabela module_plan_availability
                return await loadPlanModulesFromAvailability(accountType);
            }

            const data = await response.json();
            const availableModules = data.available_modules || [];

            // Lista completa de módulos do sistema (baseado nos módulos disponíveis na tabela)
            const allModules = [
                'whatsapp', 'telegram', 'email', 'pix', 'pix_qrcode', 'wifi',
                'facebook', 'instagram', 'tiktok', 'twitter', 'youtube',
                'spotify', 'linkedin', 'pinterest',
                'link', 'portfolio', 'banner', 'carousel',
                'youtube_embed', 'sales_page', 'digital_form'
            ];

            const unavailableModules = allModules.filter(m => !availableModules.includes(m));

            planModulesCache[planCode] = {
                available: availableModules,
                unavailable: unavailableModules
            };

            return planModulesCache[planCode];
        } catch (error) {
            console.error('Erro ao carregar módulos do plano:', error);
            return await loadPlanModulesFromAvailability(planCodeToAccountType[planCode] || planCode);
        }
    }

    // Buscar módulos da tabela module_plan_availability (fallback)
    async function loadPlanModulesFromAvailability(accountType) {
        try {
            // Buscar todos os módulos disponíveis para este account_type
            const response = await safeFetch(`${API_URL}/api/modules/plan-availability`, {
                method: 'GET',
                headers: HEADERS_AUTH
            });

            if (!response.ok) {
                return { available: [], unavailable: [] };
            }

            const data = await response.json();
            const modules = data.modules || [];

            const availableModules = [];
            const allModules = [];

            modules.forEach(module => {
                allModules.push(module.module_type);
                // Verificar se o módulo está disponível para este account_type
                if (module.plans && module.plans[accountType]?.is_available !== false) {
                    availableModules.push(module.module_type);
                }
            });

            const unavailableModules = allModules.filter(m => !availableModules.includes(m));

            return {
                available: availableModules,
                unavailable: unavailableModules
            };
        } catch (error) {
            console.error('Erro ao carregar módulos da disponibilidade:', error);
            return { available: [], unavailable: [] };
        }
    }

    // Renderizar planos disponíveis - Usa função compartilhada
    async function renderSubscriptionPlans() {
        const plans = subscriptionData.availablePlans || [];

        // Filtrar planos: excluir King Essential (king_base)
        const filteredPlans = plans.filter(plan => plan.plan_code !== 'king_base');
        console.log(`Y"< Planos filtrados na assinatura: ${filteredPlans.length} planos (excluído: King Essential)`);

        // Usar função compartilhada se disponível, senão usar lógica antiga
        if (typeof window.renderPlansShared === 'function') {
            await window.renderPlansShared(filteredPlans, 'subscription-plans-list', true);
            return;
        }

        // Fallback para lógica antiga se função compartilhada não estiver disponível
        const plansContainer = document.getElementById('subscription-plans-list');
        if (filteredPlans.length === 0) {
            plansContainer.innerHTML = '<p>Nenhum plano disponível no momento.</p>';
            return;
        }

        // Carregar módulos para todos os planos filtrados
        const plansWithModules = await Promise.all(filteredPlans.map(async (plan) => {
            const modules = await loadPlanModules(plan.plan_code);
            return { ...plan, modules };
        }));

        plansContainer.innerHTML = plansWithModules.map(plan => {
            const features = plan.features || {};
            const whatsapp = plan.whatsapp_number || '';
            const pix = plan.pix_key || '';
            const modules = plan.modules || { available: [], unavailable: [] };

            // Módulos importantes para destacar (o que o usuário mencionou)
            const importantModules = {
                'carousel': 'Carrossel',
                'sales_page': 'Loja Virtual',
                'digital_form': 'King Forms',
                'portfolio': 'Portfólio',
                'banner': 'Banner'
            };

            // Separar módulos importantes disponíveis e indisponíveis
            const importantAvailable = [];
            const importantUnavailable = [];

            Object.keys(importantModules).forEach(moduleType => {
                if (modules.available.includes(moduleType)) {
                    importantAvailable.push(importantModules[moduleType]);
                } else if (modules.unavailable.includes(moduleType)) {
                    importantUnavailable.push(importantModules[moduleType]);
                }
            });

            // Contar módulos totais
            const totalModules = modules.available.length + modules.unavailable.length;
            const availableCount = modules.available.length;

            // Determinar número de perfis
            const financeProfiles = features.max_finance_profiles || 0;
            const regularProfiles = features.max_profiles || 1;

            return `
                <div class="subscription-plan-card ${isCorporate ? 'plan-highlighted' : ''}">
                    <h3>${plan.plan_name}</h3>
                    <div class="plan-price">
                        <span class="plan-currency">R$</span>
                        <span class="plan-amount">${parseFloat(plan.price).toFixed(2).replace('.', ',')}</span>
                        <span class="plan-period" style="font-size: 0.9rem; color: var(--text-secondary, #888888);">pagamento único</span>
                    </div>
                    <p class="plan-description">${plan.description || ''}</p>
                    <ul class="plan-features">
                        ${isStart ? `
                        <!-- King Start: 1 perfil + Acesso a todos módulos exceto -->
                        <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil</li>
                        <li><i class="fas fa-check" style="color: #4CAF50;"></i> Acesso a todos os módulos, exceto:</li>
                        <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                            <strong style="color: var(--text-secondary, #888888); font-size: 0.95rem;">o- Não Incluído:</strong>
                        </li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Logomarca editável</li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Carrossel</li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Loja Virtual</li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> King Forms</li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Gestão Financeira</li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Contratos</li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Agenda Inteligente</li>
                        ` : ''}
                        
                        ${isPrime ? `
                        <!-- King Prime: 1 perfil + Módulos incluídos (Carrossel, Portfólio, Banner, Loja Virtual) + Não incluído: Gestão Financeira, Contratos, Agenda (King Forms não faz parte deste pacote) -->
                        ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>' : ''}
                        <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil</li>
                        <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                            <strong style="color: var(--text-primary, #FFFFFF); font-size: 0.95rem;">o" Módulos Incluídos:</strong>
                        </li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Carrossel</li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Portfólio</li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Banner</li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Loja Virtual</li>
                        <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                            <strong style="color: var(--text-secondary, #888888); font-size: 0.95rem;">o- Não Incluído:</strong>
                        </li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Gestão Financeira</li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Contratos</li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Agenda Inteligente</li>
                        ` : ''}
                        
                        ${isBase ? `
                        <!-- King Essential (antigo King Base): 1 perfil + Módulos incluídos + Não incluído -->
                        ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>' : ''}
                        <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil</li>
                        <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                            <strong style="color: var(--text-primary, #FFFFFF); font-size: 0.95rem;">o" Módulos Incluídos:</strong>
                        </li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Carrossel</li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Loja Virtual</li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Portfólio</li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Banner</li>
                        <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                            <strong style="color: var(--text-secondary, #888888); font-size: 0.95rem;">o- Não Incluído:</strong>
                        </li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> King Forms</li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Contratos</li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Agenda Inteligente</li>
                        ` : ''}
                        
                        ${isFinance ? `
                        <!-- King Finance: 1 perfil + Módulos incluídos (SEM King Forms) + Não incluído: King Forms, Agenda -->
                        ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>' : ''}
                        <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil</li>
                        <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                            <strong style="color: var(--text-primary, #FFFFFF); font-size: 0.95rem;">o" Módulos Incluídos:</strong>
                        </li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Carrossel</li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Loja Virtual</li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Portfólio</li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Banner</li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Gestão Financeira</li>
                        <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                            <strong style="color: var(--text-secondary, #888888); font-size: 0.95rem;">o- Não Incluído:</strong>
                        </li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> King Forms</li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Agenda Inteligente</li>
                        ` : ''}
                        
                        ${isFinancePlus ? `
                        <!-- King Finance Plus: 2 perfis gestão financeira + Módulos incluídos (SEM King Forms) + Não incluído: King Forms, Agenda -->
                        ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>' : ''}
                        <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil de cartão virtual</li>
                        <li><i class="fas fa-check" style="color: #4CAF50;"></i> 2 perfis de Gestão Financeira</li>
                        <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                            <strong style="color: var(--text-primary, #FFFFFF); font-size: 0.95rem;">o" Módulos Incluídos:</strong>
                        </li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Carrossel</li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Loja Virtual</li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Contratos</li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Gestão Financeira</li>
                        <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                            <strong style="color: var(--text-secondary, #888888); font-size: 0.95rem;">o- Não Incluído:</strong>
                        </li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> King Forms</li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Agenda Inteligente</li>
                        ` : ''}
                        
                        ${isPremiumPlus ? `
                        <!-- King Premium Plus: Tudo incluído (incluindo Agenda Inteligente e King Forms a partir de R$ 2.200) -->
                        ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>' : ''}
                        <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil</li>
                        <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                            <strong style="color: var(--text-primary, #FFFFFF); font-size: 0.95rem;">o" Módulos Incluídos:</strong>
                        </li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Gestão Financeira</li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Contratos</li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Agenda Inteligente</li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Carrossel</li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Loja Virtual</li>
                        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> King Forms</li>
                        ` : ''}
                        
                        ${isCorporate ? `
                        <!-- King Corporate: Logomarca editável + Modo empresarial + 3 perfis + Não inclui -->
                        <li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>
                        <li><i class="fas fa-check" style="color: #4CAF50;"></i> Modo Empresarial</li>
                        <li><i class="fas fa-check" style="color: #4CAF50;"></i> 3 perfis</li>
                        <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                            <strong style="color: var(--text-secondary, #888888); font-size: 0.95rem;">o- Não Incluído:</strong>
                        </li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Gestão Financeira</li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Loja Virtual</li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Agenda Inteligente</li>
                        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Contratos</li>
                        ` : ''}
                        
                        ${!isStart && !isPrime && !isBase && !isFinance && !isFinancePlus && !isPremiumPlus && !isCorporate ? `
                        <!-- Planos genéricos -->
                        ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>' : ''}
                        ${regularProfiles > 0 ? `<li><i class="fas fa-check" style="color: #4CAF50;"></i> ${regularProfiles} perfil${regularProfiles > 1 ? 's' : ''}</li>` : ''}
                        ${financeProfiles > 0 ? `<li><i class="fas fa-check" style="color: #4CAF50;"></i> ${financeProfiles} perfil${financeProfiles > 1 ? 's' : ''} de Gestão Financeira</li>` : ''}
                        ${features.is_enterprise ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Modo Empresarial</li>' : ''}
                        ` : ''}
                    </ul>
                    <div class="plan-actions">
                        <a href="https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(finalWhatsappMessage)}" target="_blank" class="btn btn-primary" style="width: 100%; margin-bottom: 10px;">
                            <i class="fab fa-whatsapp"></i> Assinar agora
                        </a>
                        <button class="btn btn-secondary" style="width: 100%;" onclick="copyPixKey('${pix || ''}')">
                            <i class="fas fa-copy"></i> Copiar Chave PIX
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Função para copiar chave PIX
    window.copyPixKey = function (pixKey) {
        if (!pixKey || pixKey.trim() === '') {
            alert('Chave PIX não configurada para este plano. Entre em contato conosco via WhatsApp.');
            return;
        }
        navigator.clipboard.writeText(pixKey).then(() => {
            alert('Chave PIX copiada!');
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = pixKey;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Chave PIX copiada!');
        });
    };

    // Carregar planos para edição (ADM)
    async function loadPlansForEdit() {
        try {
            console.log('Y"" Carregando planos para edição...');

            // Adicionar timestamp para evitar cache
            const response = await safeFetch(`${API_URL}/api/subscription/plans?t=${Date.now()}`, {
                method: 'GET',
                headers: {
                    ...HEADERS_AUTH,
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('O Erro ao carregar planos:', response.status, errorText);
                throw new Error(`Erro ao carregar planos para edição: ${response.status}`);
            }

            const data = await response.json();
            console.log(`${data.plans?.length || 0} planos carregados`);

            if (!data.plans || data.plans.length === 0) {
                console.warn('Nenhum plano encontrado!');
                document.getElementById('plans-edit-form').innerHTML = '<p style="color: #ff4444;">Nenhum plano encontrado.</p>';
                return;
            }

            await renderPlansEditForm(data.plans);
            console.log('Formulário de edição renderizado');
        } catch (error) {
            console.error('O Erro ao carregar planos para edição:', error);
            const formContainer = document.getElementById('plans-edit-form');
            if (formContainer) {
                formContainer.innerHTML = `<p style="color: #ff4444;">Erro ao carregar planos: ${error.message}</p>`;
            }
        }
    }

    // Renderizar formulário de edição de planos
    async function renderPlansEditForm(plans) {
        const formContainer = document.getElementById('plans-edit-form');
        if (!formContainer) {
            console.error('O Container plans-edit-form não encontrado!');
            return;
        }

        console.log(`Y"" Renderizando formulário para ${plans.length} planos...`);

        // Buscar disponibilidade de módulos (com cache busting agressivo)
        let moduleAvailability = [];
        try {
            const cacheBuster = `t=${Date.now()}&_=${Math.random()}`;
            console.log('Y"" Buscando disponibilidade de módulos (sem cache)...');
            const moduleResponse = await safeFetch(`${API_URL}/api/modules/plan-availability?${cacheBuster}`, {
                method: 'GET',
                headers: {
                    ...HEADERS_AUTH,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            if (moduleResponse.ok) {
                const moduleData = await moduleResponse.json();
                moduleAvailability = moduleData.modules || [];
                console.log(`${moduleAvailability.length} módulos carregados`);

                // Log detalhado dos módulos carregados para debug
                if (moduleAvailability.length > 0) {
                    console.log('Y"S Módulos carregados da API:');
                    moduleAvailability.forEach(module => {
                        const planCodes = Object.keys(module.plans || {});
                        planCodes.forEach(planCode => {
                            const planData = module.plans[planCode];
                            console.log(`   ${module.module_type} para ${planCode}: is_available = ${planData.is_available} (${typeof planData.is_available})`);
                        });
                    });
                } else {
                    console.warn('Nenhum módulo retornado pela API!');
                }
            } else {
                const errorText = await moduleResponse.text();
                console.warn('Erro ao carregar módulos:', moduleResponse.status, errorText);
            }
        } catch (error) {
            console.error('O Erro ao carregar disponibilidade de módulos:', error);
            console.error('Stack:', error.stack);
        }

        // Módulos ativos na Separação de Pacotes (Agenda/Contratos/Bolão/Briefing removidos; Recibos fica)
        const moduleLabels = {
            'carousel': 'Carrossel',
            'sales_page': 'Loja Virtual',
            'digital_form': 'King Forms',
            'portfolio': 'Portfólio',
            'banner': 'Banner',
            'finance': 'Gestão Financeira',
            'modo_empresa': 'Modo Empresa',
            'branding': 'Personalização da Marca',
            'location': 'Localização',
            'king_selection': 'King Selection',
            'king_docs': 'King Docs',
            'recibos_orcamentos': 'Recibos e Orçamentos'
        };

        formContainer.innerHTML = plans.map(plan => {
            const features = plan.features || {};
            const canEditLogo = features.can_edit_logo || false;

            // Buscar módulos incluídos e não incluídos para este plano
            const includedModules = [];
            const excludedModules = [];

            // IMPORTANTE: Garantir que TODOS os módulos sejam sempre considerados
            Object.keys(moduleLabels).forEach(moduleCode => {
                const module = moduleAvailability.find(m => m.module_type === moduleCode);
                const moduleName = moduleLabels[moduleCode];

                if (module && module.plans && module.plans[plan.plan_code]) {
                    // Verificar explicitamente se is_available é true
                    const isAvailable = module.plans[plan.plan_code].is_available === true;
                    const isAvailableValue = module.plans[plan.plan_code].is_available;
                    console.log(`  ${moduleName} (${moduleCode}) para ${plan.plan_code}: is_available = ${isAvailableValue} (${typeof isAvailableValue})`);

                    if (isAvailable) {
                        includedModules.push(moduleName);
                    } else {
                        // Se is_available é false, null, undefined, ou não existe, considerar como não incluído
                        excludedModules.push(moduleName);
                    }
                } else {
                    // Se módulo não encontrado na API, considerar como não incluído
                    console.log(`  Módulo ${moduleName} (${moduleCode}) não encontrado na API para ${plan.plan_code} - adicionando aos não incluídos`);
                    excludedModules.push(moduleName);
                }
            });

            // Remover duplicatas (caso algum módulo tenha sido adicionado duas vezes)
            const uniqueIncluded = [...new Set(includedModules)];
            const uniqueExcluded = [...new Set(excludedModules)];

            // Garantir que um módulo não esteja nas duas listas
            const finalIncluded = uniqueIncluded.filter(m => !uniqueExcluded.includes(m));
            const finalExcluded = uniqueExcluded.filter(m => !finalIncluded.includes(m));

            // GARANTIR que todos os módulos estejam em uma das listas (não pode faltar nenhum)
            const allModuleNames = Object.values(moduleLabels);
            const allInForm = [...finalIncluded, ...finalExcluded];
            const missingModules = allModuleNames.filter(name => !allInForm.includes(name));

            if (missingModules.length > 0) {
                console.warn(`  Módulos faltando no formulário para ${plan.plan_code}: ${missingModules.join(', ')} - adicionando aos não incluídos`);
                finalExcluded.push(...missingModules);
            }

            console.log(`Y"< Plano ${plan.plan_name} (${plan.plan_code}): ${finalIncluded.length} incluídos, ${finalExcluded.length} não incluídos`);
            console.log(`   Incluídos: ${finalIncluded.join(', ') || '(nenhum)'}`);
            console.log(`   Não incluídos: ${finalExcluded.join(', ') || '(nenhum)'}`);

            // Usar valores finais calculados
            const preservedIncluded = finalIncluded.join(', ');
            const preservedExcluded = finalExcluded.join(', ');

            // Verificar especificamente se "Contratos" está na lista correta
            if (plan.plan_code === 'king_finance') {
                const contratosInIncluded = preservedIncluded.includes('Contratos');
                const contratosInExcluded = preservedExcluded.includes('Contratos');
                console.log(`   [DEBUG King Finance] Contratos - Incluídos: ${contratosInIncluded}, Não Incluídos: ${contratosInExcluded}`);
                if (!contratosInIncluded && !contratosInExcluded) {
                    console.error(`   [ERRO] Contratos não está em nenhuma lista! Adicionando aos não incluídos.`);
                    finalExcluded.push('Contratos');
                }
            }

            return `
                <div class="plan-edit-card" style="border: 1px solid var(--border-color, #2C2C2F); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h3>${plan.plan_name} (${plan.plan_code})</h3>
                    <div class="form-group">
                        <label>Nome do Plano:</label>
                        <input type="text" class="form-input" id="plan-name-${plan.id}" value="${plan.plan_name || ''}">
                    </div>
                    <div class="form-group">
                        <label>Preço (R$):</label>
                        <input type="text" class="form-input" id="plan-price-${plan.id}" value="${plan.price ? parseFloat(plan.price).toFixed(2).replace('.', ',') : '0,00'}" placeholder="700,00">
                    </div>
                    <div class="form-group">
                        <label>Descrição:</label>
                        <textarea class="form-input" id="plan-description-${plan.id}" rows="3">${plan.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="plan-can-edit-logo-${plan.id}" ${canEditLogo ? 'checked' : ''}>
                            <span>Logomarca editável (em Módulos Incluídos)</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label>Módulos Incluídos (separados por vírgula):</label>
                        <textarea class="form-input" id="plan-included-modules-${plan.id}" rows="4" placeholder="Ex: Carrossel, Portfólio, Banner, Loja Virtual">${preservedIncluded}</textarea>
                        <small style="color: var(--text-secondary, #888888); display: block; margin-top: 5px;">
                            Módulos disponíveis: Carrossel, Loja Virtual, King Forms, Portfólio, Banner, Gestão Financeira
                        </small>
                    </div>
                    <div class="form-group">
                        <label>Módulos Não Incluídos (separados por vírgula):</label>
                        <textarea class="form-input" id="plan-excluded-modules-${plan.id}" rows="4" placeholder="Ex: King Forms, Gestão Financeira">${preservedExcluded}</textarea>
                        <small style="color: var(--text-secondary, #888888); display: block; margin-top: 5px;">
                            Lista os módulos que NÃO estão incluídos neste plano
                        </small>
                    </div>
                    <div class="form-group">
                        <label>WhatsApp (apenas números):</label>
                        <input type="text" class="form-input" id="plan-whatsapp-${plan.id}" value="${plan.whatsapp_number || ''}" placeholder="5511999999999">
                    </div>
                    <div class="form-group">
                        <label>Mensagem Personalizada do WhatsApp:</label>
                        <textarea class="form-input" id="plan-whatsapp-message-${plan.id}" rows="3" placeholder="Mensagem que será enviada automaticamente ao clicar em 'Assinar agora'">${plan.whatsapp_message || ''}</textarea>
                        <small style="color: var(--text-secondary, #888888); display: block; margin-top: 5px;">
                            Esta mensagem será enviada automaticamente quando o usuário clicar em "Assinar agora"
                        </small>
                    </div>
                    <div class="form-group">
                        <label>Chave PIX:</label>
                        <input type="text" class="form-input" id="plan-pix-${plan.id}" value="${plan.pix_key || ''}" placeholder="Chave PIX para pagamento">
                    </div>
                    <button class="btn btn-primary" onclick="savePlan(${plan.id})">
                        <i class="fas fa-save"></i> Salvar Alterações
                    </button>
                </div>
            `;
        }).join('');
    }

    // Salvar plano (ADM)
    window.savePlan = async function (planId) {
        try {
            console.log(`Y"" Iniciando salvamento do plano ID: ${planId}`);

            const planName = document.getElementById(`plan-name-${planId}`).value.trim();
            const priceInput = document.getElementById(`plan-price-${planId}`).value.trim();
            // Converter formato brasileiro (700,00) para formato JavaScript (700.00) apenas para parseFloat
            // Remove pontos (separadores de milhar, se houver) e substitui vírgula por ponto
            // Exemplo: "700,00" — "700.00" — 700.00 (número)
            // Exemplo: "1.700,50" — "1700.50" — 1700.50 (número)
            const priceInputNormalized = priceInput.replace(/\./g, '').replace(',', '.');
            const price = parseFloat(priceInputNormalized);
            const description = document.getElementById(`plan-description-${planId}`).value.trim();
            const canEditLogo = document.getElementById(`plan-can-edit-logo-${planId}`).checked;
            const includedModulesText = document.getElementById(`plan-included-modules-${planId}`).value.trim();
            const excludedModulesText = document.getElementById(`plan-excluded-modules-${planId}`).value.trim();
            const whatsapp = document.getElementById(`plan-whatsapp-${planId}`).value.trim();
            const whatsappMessage = document.getElementById(`plan-whatsapp-message-${planId}`).value.trim();
            const pix = document.getElementById(`plan-pix-${planId}`).value.trim();

            // Validações básicas
            if (!planName) {
                alert('Nome do plano é obrigatório!');
                return;
            }
            if (isNaN(price) || price <= 0) {
                alert('Preço inválido! Use formato brasileiro: 700,00 (vírgula para decimais)');
                return;
            }

            console.log('Y"< Dados coletados:', {
                planName,
                price,
                description: description.substring(0, 50) + '...',
                canEditLogo,
                includedModules: includedModulesText.substring(0, 50) + '...',
                excludedModules: excludedModulesText.substring(0, 50) + '...',
                whatsapp,
                whatsappMessage: whatsappMessage.substring(0, 50) + '...',
                pix: pix ? '***' : null
            });

            // Mapear nomes de módulos para códigos
            const moduleNameToCode = {
                'Carrossel': 'carousel',
                'Loja Virtual': 'sales_page',
                'King Forms': 'digital_form',
                'Portfólio': 'portfolio',
                'Banner': 'banner',
                'Gestão Financeira': 'finance',
                'King Selection': 'king_selection',
                'King Docs': 'king_docs',
                'Recibos e Orçamentos': 'recibos_orcamentos',
                'Personalização da Marca': 'branding',
                'Modo Empresa': 'modo_empresa',
                'Localização': 'location'
            };

            // Buscar plan_code do plano atual (com cache busting)
            const currentPlanResponse = await safeFetch(`${API_URL}/api/subscription/plans?t=${Date.now()}`, {
                method: 'GET',
                headers: {
                    ...HEADERS_AUTH,
                    'Cache-Control': 'no-cache'
                }
            });

            if (!currentPlanResponse.ok) {
                throw new Error('Erro ao buscar dados do plano atual');
            }

            const currentPlansData = await currentPlanResponse.json();
            const currentPlan = currentPlansData.plans.find(p => p.id === planId);

            if (!currentPlan) {
                throw new Error(`Plano com ID ${planId} não encontrado!`);
            }

            const currentFeatures = currentPlan.features || {};
            const planCode = currentPlan.plan_code;

            console.log(`Y"< Plano encontrado: ${currentPlan.plan_name} (${planCode})`);

            // Atualizar features com can_edit_logo
            const updatedFeatures = {
                ...currentFeatures,
                can_edit_logo: canEditLogo
            };

            // Preparar dados para envio (incluindo módulos)
            const planData = {
                plan_name: planName,
                price: price,
                description: description,
                features: updatedFeatures,
                whatsapp_number: whatsapp || null,
                whatsapp_message: whatsappMessage || null,
                pix_key: pix || null,
                included_modules: includedModulesText || '',  // Enviar módulos incluídos (string vazia se vazio)
                excluded_modules: excludedModulesText || ''   // Enviar módulos não incluídos (string vazia se vazio)
            };

            console.log('Enviando dados do plano (com módulos):', {
                plan_name: planData.plan_name,
                price: planData.price,
                description: planData.description?.substring(0, 50) + '...',
                included_modules: planData.included_modules || '(vazio)',
                excluded_modules: planData.excluded_modules || '(vazio)',
                included_modules_length: planData.included_modules?.length || 0,
                excluded_modules_length: planData.excluded_modules?.length || 0
            });

            // Log completo dos módulos para debug
            console.log('Y"< Módulos incluídos (completo):', includedModulesText);
            console.log('Y"< Módulos não incluídos (completo):', excludedModulesText);

            // Salvar plano (agora inclui módulos na mesma requisição)
            const response = await safeFetch(`${API_URL}/api/subscription/plans/${planId}`, {
                method: 'PUT',
                headers: {
                    ...HEADERS_AUTH,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(planData)
            });

            console.log('Resposta recebida:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('O Erro na resposta:', errorText);
                throw new Error(`Erro ao salvar plano: ${response.status} - ${errorText}`);
            }

            const responseData = await response.json();
            console.log('Plano salvo com sucesso:', responseData);

            // Verificar se os módulos foram atualizados
            if (responseData.modulesUpdated) {
                console.log('Módulos incluídos e não incluídos foram salvos junto com o plano!');
            } else if (includedModulesText || excludedModulesText) {
                console.log('Módulos foram enviados, mas não foram processados. Verificando se precisa de atualização separada...');
                // Se por algum motivo os módulos não foram processados, tentar atualizar separadamente (fallback)
                // Mas não bloquear o salvamento do plano
                if (planCode) {
                    try {
                        const includedModules = includedModulesText.split(',').map(m => m.trim()).filter(m => m);
                        const excludedModules = excludedModulesText.split(',').map(m => m.trim()).filter(m => m);
                        const includedSet = new Set(includedModules);
                        const excludedSet = new Set(excludedModules);
                        const moduleUpdates = [];
                        const allModuleNames = Object.keys(moduleNameToCode);

                        allModuleNames.forEach(moduleName => {
                            const moduleCode = moduleNameToCode[moduleName];
                            if (moduleCode) {
                                if (includedSet.has(moduleName)) {
                                    moduleUpdates.push({
                                        module_type: moduleCode,
                                        plan_code: planCode,
                                        is_available: true
                                    });
                                } else if (excludedSet.has(moduleName)) {
                                    moduleUpdates.push({
                                        module_type: moduleCode,
                                        plan_code: planCode,
                                        is_available: false
                                    });
                                }
                            }
                        });

                        if (moduleUpdates.length > 0) {
                            console.log('Y"" Tentando atualizar módulos via endpoint separado (fallback)...');
                            const moduleResponse = await safeFetch(`${API_URL}/api/modules/plan-availability`, {
                                method: 'PUT',
                                headers: {
                                    ...HEADERS_AUTH,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ updates: moduleUpdates })
                            });

                            if (moduleResponse.ok) {
                                console.log('Módulos atualizados via fallback');
                            } else {
                                console.warn('Fallback de módulos falhou, mas plano foi salvo');
                            }
                        }
                    } catch (fallbackError) {
                        console.warn('Erro no fallback de módulos (não crítico):', fallbackError);
                    }
                }
            }

            // Aguardar mais tempo para garantir que o banco processou e commitou
            console.log('⏳ Aguardando processamento do banco (3 segundos)...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('Aguardamento concluído. Dados devem estar disponíveis no banco.');

            alert('Plano atualizado com sucesso!');

            console.log('Y"" Recarregando formulário de edição...');
            // IMPORTANTE: Preservar valores dos campos de módulos antes de recarregar
            const includedFieldBefore = document.getElementById(`plan-included-modules-${planId}`);
            const excludedFieldBefore = document.getElementById(`plan-excluded-modules-${planId}`);
            const preservedIncludedValue = includedFieldBefore ? includedFieldBefore.value.trim() : '';
            const preservedExcludedValue = excludedFieldBefore ? excludedFieldBefore.value.trim() : '';

            console.log('Valores preservados antes de recarregar:');
            console.log(`   Incluídos: "${preservedIncludedValue}"`);
            console.log(`   Não incluídos: "${preservedExcludedValue}"`);

            // Recarregar formulário de edição PRIMEIRO para mostrar mudanças imediatamente
            try {
                // Limpar qualquer cache e forçar busca fresca
                // Adicionar timestamp único e parâmetros de cache busting
                const timestamp = Date.now();
                console.log(`Y"" Forçando recarregamento sem cache (timestamp: ${timestamp})...`);

                // Limpar cache do módulo de disponibilidade também
                if (window.moduleAvailabilityCache) {
                    delete window.moduleAvailabilityCache;
                }

                // Recarregar formulário com cache busting agressivo
                await loadPlansForEdit();

                // Aguardar um pouco mais para garantir que o DOM foi atualizado
                await new Promise(resolve => setTimeout(resolve, 500));

                // Restaurar valores preservados nos campos de módulos
                const includedFieldAfter = document.getElementById(`plan-included-modules-${planId}`);
                const excludedFieldAfter = document.getElementById(`plan-excluded-modules-${planId}`);

                if (includedFieldAfter && preservedIncludedValue) {
                    // Restaurar valor preservado, mas adicionar módulos mapeados que não estão no valor
                    const currentValue = includedFieldAfter.value.trim();
                    const preservedModules = preservedIncludedValue.split(',').map(m => m.trim()).filter(m => m);
                    const currentModules = currentValue.split(',').map(m => m.trim()).filter(m => m);

                    // Combinar: manter módulos preservados e adicionar módulos mapeados que não estão lá
                    const combinedModules = [...new Set([...preservedModules, ...currentModules])];
                    includedFieldAfter.value = combinedModules.join(', ');
                    console.log(`Valor restaurado em módulos incluídos: "${includedFieldAfter.value}"`);
                }

                if (excludedFieldAfter && preservedExcludedValue) {
                    // Restaurar valor preservado, mas adicionar módulos mapeados que não estão no valor
                    const currentValue = excludedFieldAfter.value.trim();
                    const preservedModules = preservedExcludedValue.split(',').map(m => m.trim()).filter(m => m);
                    const currentModules = currentValue.split(',').map(m => m.trim()).filter(m => m);

                    // Combinar: manter módulos preservados e adicionar módulos mapeados que não estão lá
                    const combinedModules = [...new Set([...preservedModules, ...currentModules])];
                    excludedFieldAfter.value = combinedModules.join(', ');
                    console.log(`Valor restaurado em módulos não incluídos: "${excludedFieldAfter.value}"`);
                }

                // Verificar se os dados foram carregados corretamente
                console.log('Formulário recarregado. Verifique os campos acima.');

                // Log adicional para debug
                if (includedFieldAfter && excludedFieldAfter) {
                    console.log('Y"< Valores finais nos campos:');
                    console.log(`   Incluídos: "${includedFieldAfter.value}"`);
                    console.log(`   Não incluídos: "${excludedFieldAfter.value}"`);
                } else {
                    console.warn('Campos de módulos não encontrados após recarregar!');
                }
            } catch (reloadError) {
                console.error('O Erro ao recarregar formulário:', reloadError);
                console.error('Stack:', reloadError.stack);
                alert('Plano salvo, mas houve erro ao recarregar. Atualize a página manualmente (F5).');
            }

            console.log('Y"" Recarregando informações de assinatura...');
            // Depois recarregar informações de assinatura (pode falhar silenciosamente se planRenderer der erro)
            try {
                await loadSubscriptionInfo();
            } catch (subscriptionError) {
                console.warn('Erro ao recarregar informações de assinatura (não crítico):', subscriptionError);
            }

            console.log('Processo de salvamento concluído!');
        } catch (error) {
            console.error('O Erro completo ao salvar plano:', error);
            console.error('Stack:', error.stack);
            alert(`Erro ao salvar plano: ${error.message}\n\nVerifique o console para mais detalhes.`);
        }
    };

    // Event listener para botão de editar planos
    const editPlansBtn = document.getElementById('edit-plans-btn');
    if (editPlansBtn) {
        editPlansBtn.addEventListener('click', () => {
            const formContainer = document.getElementById('plans-edit-form');
            if (formContainer.style.display === 'none') {
                formContainer.style.display = 'block';
                loadPlansForEdit();
            } else {
                formContainer.style.display = 'none';
            }
        });
    }

    // Carregar informações quando a página de assinatura for aberta
    const assinaturaLink = document.getElementById('assinatura-link');
    if (assinaturaLink) {
        assinaturaLink.addEventListener('click', () => {
            setTimeout(() => {
                loadSubscriptionInfo();
            }, 100);
        });
    }

    // ============================================
    // FUNCIONALIDADE DE SEPARA—fO DE PACOTES (ADM)
    // ============================================

    let moduleAvailabilityData = null;
    let moduleAvailabilityChanges = {};

    // Verificar se é admin e mostrar link
    async function checkAdminAndShowLink() {
        try {
            const response = await safeFetch(`${API_URL}/api/account/status`, {
                method: 'GET',
                headers: HEADERS_AUTH
            });

            if (response.ok) {
                const data = await response.json();
                if (data.isAdmin) {
                    const separacaoLink = document.getElementById('separacao-pacotes-link');
                    if (separacaoLink) {
                        separacaoLink.style.display = 'block';
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao verificar admin:', error);
        }
    }

    // Carregar disponibilidade de módulos
    async function loadModuleAvailability() {
        try {
            const response = await safeFetch(`${API_URL}/api/modules/plan-availability`, {
                method: 'GET',
                headers: HEADERS_AUTH
            });

            if (!response.ok) {
                if (response.status === 403) {
                    document.getElementById('module-availability-list').innerHTML = `
                        <p style="color: #ff4444;">Acesso negado. Apenas administradores podem acessar esta página.</p>
                    `;
                    return;
                }
                throw new Error('Erro ao carregar disponibilidade de módulos');
            }

            const data = await response.json();
            moduleAvailabilityData = data.modules;
            window.activePlans = data.plans || []; // Armazenar planos ativos globalmente
            renderModuleAvailability();
            // Filtro: ao digitar, re-renderizar (só registra uma vez)
            const filterInput = document.getElementById('module-filter-input');
            if (filterInput && !filterInput.dataset.filterBound) {
                filterInput.dataset.filterBound = '1';
                filterInput.addEventListener('input', () => renderModuleAvailability());
                filterInput.addEventListener('change', () => renderModuleAvailability());
            }
        } catch (error) {
            console.error('Erro ao carregar disponibilidade de módulos:', error);
            document.getElementById('module-availability-list').innerHTML = `
                <p style="color: #ff4444;">Erro ao carregar dados. Tente novamente.</p>
            `;
        }
    }

    // Renderizar interface de disponibilidade (com filtro por nome do módulo)
    function renderModuleAvailability() {
        const container = document.getElementById('module-availability-list');
        const saveBtn = document.getElementById('save-module-availability-btn');
        const filterInput = document.getElementById('module-filter-input');
        const filterValue = (filterInput && filterInput.value.trim()) ? filterInput.value.trim().toLowerCase() : '';

        if (!moduleAvailabilityData || moduleAvailabilityData.length === 0) {
            container.innerHTML = '<p>Nenhum módulo encontrado.</p>';
            return;
        }

        // Buscar planos ativos (vindos da API ou usar fallback)
        const activePlans = window.activePlans || [];

        // Se não houver planos da API, não renderizar
        if (activePlans.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary, #888888);">Carregando planos...</p>';
            return;
        }

        // Filtrar módulos removidos do produto + texto de busca
        // Recibos e Orçamentos permanece no produto — não filtrar aqui
        const REMOVED_SEP_MODULES = { agenda: 1, contract: 1, photographer_site: 1, kingbrief: 1, king_bolao: 1 };
        const modulesToShow = (filterValue
            ? moduleAvailabilityData.filter(m => {
                const label = (ITEM_TYPE_LABELS_FOR_VCARD[m.module_type] || m.module_type || '').toLowerCase();
                const code = (m.module_type || '').toLowerCase();
                return label.indexOf(filterValue) !== -1 || code.indexOf(filterValue) !== -1;
            })
            : moduleAvailabilityData
        ).filter(m => !REMOVED_SEP_MODULES[m.module_type]);

        if (modulesToShow.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary, #888888);">Nenhum módulo encontrado para &quot;' + (filterInput ? filterInput.value.trim() : '') + '&quot;.</p>';
            if (saveBtn) saveBtn.style.display = 'block';
            return;
        }

        // Criar mapa de planos para acesso rápido
        const planMap = {};
        activePlans.forEach(plan => {
            planMap[plan.plan_code] = plan.plan_name;
        });

        // Ordenar planos por preço (já vem ordenado da API)
        const planOrder = activePlans.map(p => p.plan_code);

        container.innerHTML = modulesToShow.map(module => {
            const moduleName = ITEM_TYPE_LABELS_FOR_VCARD[module.module_type] || module.module_type;
            const plans = module.plans || {}; // Garantir que plans exista (ex: photographer_site)

            const planCheckboxes = planOrder.map(planCode => {
                const isAvailable = plans[planCode]?.is_available === true; // Default false
                const planName = planMap[planCode] || planCode;

                return `
                    <div class="plan-checkbox-item">
                        <label class="checkbox-label">
                            <input 
                                type="checkbox" 
                                class="module-plan-checkbox" 
                                data-module="${module.module_type}" 
                                data-plan="${planCode}"
                                ${isAvailable ? 'checked' : ''}
                                onchange="handleModuleAvailabilityChange('${module.module_type}', '${planCode}', this.checked)"
                            >
                            <span>${planName}</span>
                        </label>
                    </div>
                `;
            }).join('');

            return `
                <div class="module-availability-card">
                    <div class="module-availability-header-card">
                        <h3>${moduleName}</h3>
                        <span class="module-type-badge">${module.module_type}</span>
                    </div>
                    <div class="module-plans-grid">
                        ${planCheckboxes}
                    </div>
                </div>
            `;
        }).join('');

        if (saveBtn) {
            saveBtn.style.display = 'block';
        }
    }

    // Handler para mudanças - Salva automaticamente
    window.handleModuleAvailabilityChange = async function (moduleType, planCode, isAvailable) {
        const key = `${moduleType}_${planCode}`;
        moduleAvailabilityChanges[key] = {
            module_type: moduleType,
            plan_code: planCode,
            is_available: isAvailable
        };

        // Salvar automaticamente
        try {
            const updates = [{
                module_type: moduleType,
                plan_code: planCode,
                is_available: isAvailable
            }];

            const response = await safeFetch(`${API_URL}/api/modules/plan-availability`, {
                method: 'PUT',
                headers: {
                    ...HEADERS_AUTH,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ updates })
            });

            if (!response.ok) {
                throw new Error('Erro ao salvar alteração');
            }

            // Remover da lista de mudanças pendentes já que foi salvo
            delete moduleAvailabilityChanges[key];

            // Atualizar visualmente - esconder botão se não houver mais mudanças
            const saveBtn = document.getElementById('save-module-availability-btn');
            if (saveBtn) {
                if (Object.keys(moduleAvailabilityChanges).length === 0) {
                    saveBtn.style.display = 'none';
                    saveBtn.classList.remove('btn-warning');
                }
            }

            // Feedback visual opcional (pode remover se não quiser)
            console.log(`Módulo ${moduleType} para plano ${planCode} salvo automaticamente`);
            // Atualizar visibilidade dos botões do menu (Gestão Financeira, Contratos, Agenda) sem recarregar a página
            try {
                const statusRes = await safeFetch(`${API_URL}/api/account/status`, { headers: HEADERS_AUTH });
                if (statusRes && statusRes.ok) {
                    const user = await statusRes.json();
                    if (typeof window.applyModulesVisibility === 'function') window.applyModulesVisibility(user);
                }
            } catch (e) { console.warn('Atualizar visibilidade do menu:', e); }
        } catch (error) {
            console.error('Erro ao salvar automaticamente:', error);
            // Manter o botão de salvar visível em caso de erro
            const saveBtn = document.getElementById('save-module-availability-btn');
            if (saveBtn) {
                saveBtn.style.display = 'block';
                saveBtn.classList.add('btn-warning');
            }
            alert('Erro ao salvar automaticamente. Use o botão "Salvar Alterações" para tentar novamente.');
        }
    };

    // Salvar alterações
    const saveModuleAvailabilityBtn = document.getElementById('save-module-availability-btn');
    if (saveModuleAvailabilityBtn) {
        saveModuleAvailabilityBtn.addEventListener('click', async () => {
            try {
                const updates = Object.values(moduleAvailabilityChanges);

                if (updates.length === 0) {
                    alert('Nenhuma alteração para salvar.');
                    return;
                }

                saveModuleAvailabilityBtn.disabled = true;
                saveModuleAvailabilityBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

                const response = await safeFetch(`${API_URL}/api/modules/plan-availability`, {
                    method: 'PUT',
                    headers: {
                        ...HEADERS_AUTH,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ updates })
                });

                if (!response.ok) {
                    throw new Error('Erro ao salvar alterações');
                }

                alert('Alterações salvas com sucesso!');
                moduleAvailabilityChanges = {};
                saveModuleAvailabilityBtn.style.display = 'none';
                saveModuleAvailabilityBtn.classList.remove('btn-warning');
                await loadModuleAvailability(); // Recarregar
                // Atualizar visibilidade dos botões do menu (Gestão Financeira, Contratos, Agenda) sem recarregar a página
                try {
                    const statusRes = await safeFetch(`${API_URL}/api/account/status`, { headers: HEADERS_AUTH });
                    if (statusRes && statusRes.ok) {
                        const user = await statusRes.json();
                        if (typeof window.applyModulesVisibility === 'function') window.applyModulesVisibility(user);
                    }
                } catch (e) { console.warn('Atualizar visibilidade do menu:', e); }
            } catch (error) {
                console.error('Erro ao salvar:', error);
                alert('Erro ao salvar alterações. Tente novamente.');
            } finally {
                saveModuleAvailabilityBtn.disabled = false;
                saveModuleAvailabilityBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
            }
        });
    }

    // Função para alternar entre abas na seção Separação de Pacotes
    window.switchSeparationTab = function (tab) {
        // Atualizar botões das abas
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
            btn.style.borderBottomColor = 'transparent';
            btn.style.color = 'var(--text-secondary, #888888)';
        });

        const activeBtn = document.getElementById(`tab-${tab}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.style.borderBottomColor = 'var(--dourado-principal, #FFD700)';
            activeBtn.style.color = 'var(--dourado-principal, #FFD700)';
        }

        // Mostrar/ocultar conteúdo das abas
        document.querySelectorAll('.tab-content-separation').forEach(content => {
            content.style.display = 'none';
        });

        const activeContent = document.getElementById(`tab-content-${tab}`);
        if (activeContent) {
            activeContent.style.display = 'block';
        }

        // Carregar dados da aba ativa
        if (tab === 'modules') {
            loadModuleAvailability();
        } else if (tab === 'individual') {
            loadIndividualPlans();
        } else if (tab === 'link-limits') {
            if (window.moduleLinkLimits) {
                // Carregar dados e renderizar grid
                window.moduleLinkLimits.loadData().then(() => {
                    window.moduleLinkLimits.renderGrid();
                });
            }
        }
    };

    // Carregar planos individuais
    async function loadIndividualPlans() {
        try {
            const response = await safeFetch(`${API_URL}/api/modules/individual-plans`, {
                method: 'GET',
                headers: HEADERS_AUTH
            });

            if (!response.ok) {
                if (response.status === 403) {
                    document.getElementById('individual-plans-list').innerHTML = `
                        <p style="color: #ff4444;">Acesso negado. Apenas administradores podem acessar esta página.</p>
                    `;
                    return;
                }
                throw new Error('Erro ao carregar planos individuais');
            }

            const data = await response.json();
            renderIndividualPlans(data.plans || []);
        } catch (error) {
            console.error('Erro ao carregar planos individuais:', error);
            document.getElementById('individual-plans-list').innerHTML = `
                <p style="color: #ff4444;">Erro ao carregar dados. Tente novamente.</p>
            `;
        }
    }

    // Renderizar lista de planos individuais
    function renderIndividualPlans(plans) {
        const container = document.getElementById('individual-plans-list');

        // Agrupar por usuário
        const plansByUser = {};
        plans.forEach(plan => {
            if (!plansByUser[plan.user_id]) {
                plansByUser[plan.user_id] = {
                    user_id: plan.user_id,
                    user_name: plan.user_name || plan.user_email || 'Usuário #' + plan.user_id,
                    user_email: plan.user_email,
                    modules: []
                };
            }
            plansByUser[plan.user_id].modules.push(plan);
        });

        if (Object.keys(plansByUser).length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary, #888888);">Nenhum plano individual configurado ainda.</p>';
            return;
        }

        container.innerHTML = Object.values(plansByUser).map(userPlan => `
            <div class="individual-plan-card" style="background: var(--card-bg, #1F1F1F); border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid var(--border-color, #333);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div style="flex: 1;">
                        <h3 style="color: var(--text-primary, #F5F5F5); margin-bottom: 4px;">${userPlan.user_name}</h3>
                        <p style="color: var(--text-secondary, #888888); font-size: 0.875rem;">${userPlan.user_email}</p>
                        <p style="color: var(--text-secondary, #888888); font-size: 0.875rem; margin-top: 8px;">
                            Módulos extras: ${userPlan.modules.map(m => ITEM_TYPE_LABELS_FOR_VCARD[m.module_type] || m.module_type).join(', ') || 'Nenhum'}
                        </p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="editIndividualPlan('${userPlan.user_id}')" style="padding: 6px 12px; background: var(--dourado-principal, #FFD700); color: #000; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 600;">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button onclick="deleteAllIndividualPlans('${userPlan.user_id}')" style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">
                            <i class="fas fa-trash"></i> Remover
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Mostrar modal para adicionar plano individual
    window.showAddIndividualPlanModal = async function () {
        try {
            // Buscar lista de usuários
            const usersResponse = await safeFetch(`${API_URL}/api/modules/users-list`, {
                headers: HEADERS_AUTH
            });

            if (!usersResponse.ok) {
                throw new Error('Erro ao carregar lista de usuários');
            }

            const usersData = await usersResponse.json();
            const users = usersData.users || [];

            const modal = document.createElement('div');
            modal.id = 'add-individual-plan-modal';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 10007; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(8px); overflow-y: auto;';

            modal.innerHTML = `
                <div style="background: var(--card-bg, #1F1F1F); border-radius: 24px; padding: 40px; max-width: 800px; width: 100%; border: 1px solid var(--border-color, #333); max-height: 90vh; overflow-y: auto;">
                    <h2 style="color: var(--text-primary, #F5F5F5); font-size: 1.5rem; font-weight: 700; margin-bottom: 24px;">
                        Selecionar Usuário
                    </h2>
                    
                    <div style="margin-bottom: 20px;">
                        <input type="text" id="user-search-input" 
                               placeholder="Buscar usuário por nome ou email..."
                               onkeyup="filterUserList()"
                               style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color, #333); background: rgba(0,0,0,0.3); color: var(--text-primary, #F5F5F5); font-size: 0.95rem;">
                    </div>
                    
                    <div id="users-list-container" style="max-height: 400px; overflow-y: auto;">
                        ${users.map(user => {
                const isActive = user.is_active !== false;
                const isExpired = user.subscription_expires_at && new Date(user.subscription_expires_at) < new Date();
                const statusColor = isActive && !isExpired ? '#22c55e' : '#ef4444';
                const statusText = isActive && !isExpired ? 'Ativo' : 'Vencido';
                const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A';
                const expiresDate = user.subscription_expires_at ? new Date(user.subscription_expires_at).toLocaleDateString('pt-BR') : 'N/A';

                return `
                            <div class="user-item" data-user-id="${user.id}" data-user-name="${(user.name || user.email).toLowerCase()}" data-user-email="${user.email.toLowerCase()}"
                                 onclick="selectUserForIndividualPlan('${user.id}', '${(user.name || user.email).replace(/'/g, "\\'")}', '${user.email.replace(/'/g, "\\'")}')"
                                 style="padding: 16px; border-radius: 8px; border: 2px solid ${statusColor}; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; background: ${isActive && !isExpired ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'};"
                                 onmouseover="this.style.background='${isActive && !isExpired ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}'; this.style.borderColor='${statusColor}'; this.style.transform='translateX(4px)'"
                                 onmouseout="this.style.background='${isActive && !isExpired ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}'; this.style.borderColor='${statusColor}'; this.style.transform='translateX(0)'">
                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                    <div style="flex: 1;">
                                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                            <h3 style="color: var(--text-primary, #F5F5F5); margin: 0; font-size: 1rem; font-weight: 600;">${user.name || user.email}</h3>
                                            <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;">
                                                ${statusText}
                                            </span>
                                        </div>
                                        <p style="color: var(--text-secondary, #888888); margin: 0 0 4px 0; font-size: 0.875rem;">${user.email}</p>
                                        <p style="color: var(--text-secondary, #888888); margin: 0 0 4px 0; font-size: 0.75rem;">Plano: ${user.account_type || 'free'}</p>
                                        <div style="display: flex; flex-direction: column; gap: 2px; margin-top: 8px;">
                                            <p style="color: var(--text-secondary, #888888); margin: 0; font-size: 0.7rem;">
                                                <i class="fas fa-calendar-plus" style="margin-right: 4px;"></i>
                                                Criado em: ${createdDate}
                                            </p>
                                            ${user.subscription_expires_at ? `
                                            <p style="color: ${isExpired ? '#ef4444' : 'var(--text-secondary, #888888)'}; margin: 0; font-size: 0.7rem;">
                                                <i class="fas fa-calendar-check" style="margin-right: 4px;"></i>
                                                Renovação: ${expiresDate}
                                            </p>
                                            ` : `
                                            <p style="color: var(--text-secondary, #888888); margin: 0; font-size: 0.7rem;">
                                                <i class="fas fa-calendar-check" style="margin-right: 4px;"></i>
                                                Renovação: Não definida
                                            </p>
                                            `}
                                        </div>
                                    </div>
                                    <i class="fas fa-chevron-right" style="color: var(--text-secondary, #888888); margin-left: 12px;"></i>
                                </div>
                            </div>
                        `;
            }).join('')}
                    </div>
                    
                    <div style="display: flex; gap: 12px; margin-top: 24px;">
                        <button type="button" onclick="document.getElementById('add-individual-plan-modal').remove()" 
                                style="flex: 1; padding: 14px; border-radius: 8px; border: 1px solid var(--border-color, #333); background: transparent; color: var(--text-secondary, #888888); cursor: pointer; font-weight: 600;">
                            Cancelar
                        </button>
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

        } catch (error) {
            console.error('Erro ao carregar lista de usuários:', error);
            alert('Erro ao carregar lista de usuários: ' + error.message);
        }
    };

    // Filtrar lista de usuários
    window.filterUserList = function () {
        const searchTerm = document.getElementById('user-search-input').value.toLowerCase();
        const userItems = document.querySelectorAll('.user-item');

        userItems.forEach(item => {
            const userName = item.dataset.userName;
            const userEmail = item.dataset.userEmail;

            if (userName.includes(searchTerm) || userEmail.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    };

    // Selecionar usuário e mostrar interface de módulos
    window.selectUserForIndividualPlan = async function (userId, userName, userEmail) {
        try {
            // Fechar modal de seleção
            const selectModal = document.getElementById('add-individual-plan-modal');
            if (selectModal) selectModal.remove();

            // Buscar módulos do usuário
            const response = await safeFetch(`${API_URL}/api/modules/individual-plans/${userId}`, {
                headers: HEADERS_AUTH
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar módulos do usuário');
            }

            const data = await response.json();

            // Mostrar modal de configuração de módulos (com quantidade de perfis GF se existir)
            showUserModulesModal(data.user, data.modules, data.max_finance_profiles);

        } catch (error) {
            console.error('Erro ao carregar módulos do usuário:', error);
            alert('Erro ao carregar módulos: ' + error.message);
        }
    };

    // Mostrar modal de configuração de módulos para um usuário
    function showUserModulesModal(user, modules, maxFinanceProfiles) {
        const modal = document.createElement('div');
        modal.id = 'user-modules-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 10008; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(8px); overflow-y: auto;';

        const currentMaxProfiles = (typeof maxFinanceProfiles === 'number' && maxFinanceProfiles >= 1 && maxFinanceProfiles <= 20)
            ? maxFinanceProfiles
            : (parseInt(maxFinanceProfiles, 10) || 1);

        // Buscar planos ativos (vindos da API ou usar fallback)
        const activePlans = window.activePlans || [];
        const planLabels = {};
        activePlans.forEach(plan => {
            planLabels[plan.plan_code] = plan.plan_name;
        });

        modal.innerHTML = `
            <div style="background: var(--card-bg, #1F1F1F); border-radius: 24px; padding: 40px; max-width: 900px; width: 100%; border: 1px solid var(--border-color, #333); max-height: 90vh; overflow-y: auto;">
                <h2 style="color: var(--text-primary, #F5F5F5); font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">
                    Configurar Módulos para ${user.name || user.email}
                </h2>
                <p style="color: var(--text-secondary, #888888); margin-bottom: 24px; font-size: 0.875rem;">
                    Plano base: ${planLabels[user.account_type] || user.account_type || 'Não definido'}
                </p>
                <p style="color: var(--text-secondary, #888888); margin-bottom: 24px; font-size: 0.875rem;">
                    Marque os módulos que este usuário deve ter. Desmarque para <strong>tirar do plano</strong> (incluindo os que já estão no plano base). Para <strong>Gestão Financeira</strong>, defina quantos perfis o usuário pode ter (1 a 20).
                </p>
                
                <div id="user-modules-list" style="margin-bottom: 24px;">
                    ${modules.map(module => {
            const moduleName = ITEM_TYPE_LABELS_FOR_VCARD[module.module_type] || module.module_type;
            const isInBasePlan = module.in_base_plan;
            const isActive = module.is_active; // Usar is_active ao invés de is_individual
            const isFinance = module.module_type === 'finance';
            const profileCounts = Array.from({ length: 20 }, (_, i) => i + 1);
            const profileOptions = profileCounts.map(n => `<option value="${n}" ${n === currentMaxProfiles ? 'selected' : ''}>${n} perfil${n > 1 ? 'eis' : ''}</option>`).join('');
            return `
                            <div class="module-availability-card" style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid var(--border-color, #333);">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <h3 style="color: var(--text-primary, #F5F5F5); font-size: 1rem; font-weight: 600; margin-bottom: 4px;">${moduleName}</h3>
                                        <span class="module-type-badge" style="background: rgba(255,215,0,0.2); color: var(--dourado-principal, #FFD700); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">${module.module_type}</span>
                                        ${isInBasePlan ? '<p style="color: #4ade80; font-size: 0.75rem; margin-top: 8px;">o" Já no plano (pode desmarcar para tirar)</p>' : '<p style="color: #60a5fa; font-size: 0.75rem; margin-top: 8px;">+ Adicionar</p>'}
                                        ${isFinance ? `
                                        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06);">
                                            <label style="color: var(--text-secondary, #888888); font-size: 0.8rem;">Quantidade de perfis:</label>
                                            <select id="user-modules-finance-profiles" style="margin-left: 8px; padding: 6px 10px; border-radius: 8px; background: var(--card-bg, #1F1F1F); border: 1px solid var(--border-color, #333); color: var(--text-primary, #F5F5F5); font-size: 0.875rem; cursor: pointer;">
                                                ${profileOptions}
                                            </select>
                                        </div>
                                        ` : ''}
                                    </div>
                                    <label class="checkbox-label" style="display: flex; align-items: center; cursor: pointer;">
                                        <input 
                                            type="checkbox" 
                                            class="user-module-checkbox" 
                                            data-module="${module.module_type}"
                                            data-in-base-plan="${isInBasePlan}"
                                            ${isActive ? 'checked' : ''}
                                            style="width: 20px; height: 20px; cursor: pointer;"
                                        >
                                        <span style="margin-left: 8px; color: var(--text-primary, #F5F5F5);">Ativo</span>
                                    </label>
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
                
                <div style="display: flex; gap: 12px; margin-top: 32px;">
                    <button type="button" onclick="document.getElementById('user-modules-modal').remove()" 
                            style="flex: 1; padding: 14px; border-radius: 8px; border: 1px solid var(--border-color, #333); background: transparent; color: var(--text-secondary, #888888); cursor: pointer; font-weight: 600;">
                        Cancelar
                    </button>
                    <button type="button" onclick="saveUserIndividualModules('${user.id}')" 
                            style="flex: 2; padding: 14px; border-radius: 8px; border: none; background: var(--dourado-principal, #FFD700); color: #000; cursor: pointer; font-weight: 700;">
                        <i class="fas fa-save"></i> Salvar Módulos
                    </button>
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
    }

    // Salvar módulos individuais do usuário
    window.saveUserIndividualModules = async function (userId) {
        try {
            // Buscar TODOS os checkboxes (incluindo os que estão no plano base)
            const checkboxes = document.querySelectorAll('#user-modules-modal .user-module-checkbox');
            const selectedModules = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.dataset.module);

            console.log('[saveUserIndividualModules] Módulos selecionados:', selectedModules);
            console.log('[saveUserIndividualModules] Total de checkboxes:', checkboxes.length);

            let maxFinanceProfiles = 1;
            const financeProfilesEl = document.getElementById('user-modules-finance-profiles');
            if (financeProfilesEl) {
                const v = parseInt(financeProfilesEl.value, 10);
                if (v >= 1 && v <= 20) maxFinanceProfiles = v;
            }

            const response = await safeFetch(`${API_URL}/api/modules/individual-plans/${userId}`, {
                method: 'PUT',
                headers: {
                    ...HEADERS_AUTH,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    modules: selectedModules,
                    max_finance_profiles: maxFinanceProfiles
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Erro ao salvar módulos' }));
                throw new Error(errorData.message || 'Erro ao salvar módulos');
            }

            const result = await response.json();
            alert(result.message || 'Módulos atualizados com sucesso! Alterações em "Já no plano", "Adicionar" e quantidade de perfis de Gestão Financeira foram salvas.');

            // Fechar modal e recarregar lista
            document.getElementById('user-modules-modal').remove();
            await loadIndividualPlans();

        } catch (error) {
            console.error('Erro ao salvar módulos:', error);
            alert('Erro ao salvar módulos: ' + error.message);
        }
    };

    // Editar plano individual de um usuário
    window.editIndividualPlan = async function (userId) {
        await selectUserForIndividualPlan(userId, '', '');
    };

    // Deletar todos os planos individuais de um usuário
    window.deleteAllIndividualPlans = async function (userId) {
        if (!confirm('Tem certeza que deseja remover todos os módulos extras deste usuário?')) {
            return;
        }

        try {
            const response = await safeFetch(`${API_URL}/api/modules/individual-plans/${userId}`, {
                method: 'PUT',
                headers: {
                    ...HEADERS_AUTH,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    modules: []
                })
            });

            if (!response.ok) {
                throw new Error('Erro ao remover módulos');
            }

            alert('Módulos removidos com sucesso!');
            await loadIndividualPlans();

        } catch (error) {
            console.error('Erro ao remover módulos:', error);
            alert('Erro ao remover módulos: ' + error.message);
        }
    };


    // Carregar quando a página de separação de pacotes for aberta
    const separacaoLink = document.getElementById('separacao-pacotes-link');
    if (separacaoLink) {
        separacaoLink.addEventListener('click', () => {
            setTimeout(() => {
                loadModuleAvailability();
            }, 100);
        });
    }

    // Verificar admin ao carregar página (já aplicado em applyEmpresaTabAndControls via /api/account/status)

    // ============================================
    // FILTRO DE M"DULOS POR PLANO
    // ============================================

    let userAvailableModules = null;

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

    // Carregar módulos disponíveis ao carregar página
    loadUserAvailableModules();

    // ============================================
    // FUN—.ES DO FORMULÁRIO KING - EDITOR DE PERGUNTAS
    // ============================================

    // Renderizar perguntas do formulário (tornar acessível globalmente)
    window.renderFormQuestions = function renderFormQuestions(itemId, formFields) {
        const container = document.getElementById(`form-questions-container-${itemId}`);
        if (!container) return;

        if (!formFields || formFields.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-dark, #A1A1A1);">
                    <i class="fas fa-question-circle" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                    <p>Nenhuma pergunta adicionada ainda.</p>
                    <p style="font-size: 0.9rem; margin-top: 10px;">Clique em "Adicionar Pergunta" para começar.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = formFields.map((field, index) => {
            const fieldTypes = {
                'short_text': 'Resposta Curta',
                'paragraph': 'Parágrafo',
                'multiple_choice': 'Escolha Múltipla',
                'checkbox': 'Caixa de Verificação',
                'dropdown': 'Lista Suspensa',
                'file_upload': 'Carregar Ficheiro',
                'linear_scale': 'Escala Linear',
                'rating': 'Classificação',
                'multiple_choice_grid': 'Grelha de Escolhas Múltiplas',
                'checkbox_grid': 'Grelha de Caixa de Verificação',
                'date': 'Data',
                'time': 'Hora',
                'datetime': 'Data e Hora',
                'yes_no': 'Sim/Não'
            };

            return `
                <div class="form-question-item" data-question-index="${index}" style="margin-bottom: 20px; padding: 20px; background: var(--card-background-color, #1C1C21); border-radius: 8px; border: 1px solid var(--border-color, #2C2C2F);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div>
                            <strong style="color: var(--text, #ECECEC);">${field.label || 'Pergunta sem título'}</strong>
                            <span style="margin-left: 10px; font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">(${fieldTypes[field.type] || field.type})</span>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" class="edit-question-btn" data-index="${index}" style="padding: 5px 10px; background: var(--dourado-principal, #FFC700); color: #000; border: none; border-radius: 4px; cursor: pointer;">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="delete-question-btn" data-index="${index}" style="padding: 5px 10px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    ${field.required ? '<span style="color: #ff4444; font-size: 0.85rem;">* Obrigatório</span>' : ''}
                </div>
            `;
        }).join('');

        // Adicionar event listeners
        container.querySelectorAll('.edit-question-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                editQuestion(itemId, index, formFields[index]);
            });
        });

        container.querySelectorAll('.delete-question-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                deleteQuestion(itemId, index);
            });
        });
    }

    // Adicionar nova pergunta
    function addQuestion(itemId) {
        const fieldTypes = [
            { value: 'short_text', label: 'Resposta Curta' },
            { value: 'paragraph', label: 'Parágrafo' },
            { value: 'multiple_choice', label: 'Escolha Múltipla' },
            { value: 'checkbox', label: 'Caixa de Verificação' },
            { value: 'dropdown', label: 'Lista Suspensa' },
            { value: 'file_upload', label: 'Carregar Ficheiro' },
            { value: 'linear_scale', label: 'Escala Linear' },
            { value: 'rating', label: 'Classificação' },
            { value: 'multiple_choice_grid', label: 'Grelha de Escolhas Múltiplas' },
            { value: 'checkbox_grid', label: 'Grelha de Caixa de Verificação' },
            { value: 'date', label: 'Data' },
            { value: 'time', label: 'Hora' },
            { value: 'datetime', label: 'Data e Hora' },
            { value: 'yes_no', label: 'Sim/Não' }
        ];

        const modal = document.createElement('div');
        modal.className = 'question-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center;';
        modal.innerHTML = `
            <div style="background: var(--card-background-color, #1C1C21); padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <h3 style="margin-bottom: 20px; color: var(--text, #ECECEC);">Adicionar Pergunta</h3>
                <div class="input-group" style="margin-bottom: 15px;">
                    <label>Tipo de Campo</label>
                    <select id="new-question-type" style="width: 100%; padding: 10px; border-radius: 8px; background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC);">
                        ${fieldTypes.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
                    </select>
                </div>
                <div class="input-group" style="margin-bottom: 15px;">
                    <label>Pergunta/Label</label>
                    <input type="text" id="new-question-label" placeholder="Digite a pergunta..." style="width: 100%; padding: 10px; border-radius: 8px; background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC);">
                </div>
                <div class="input-group" style="margin-bottom: 15px;">
                    <label>
                        <input type="checkbox" id="new-question-required"> Obrigatório
                    </label>
                </div>
                <div id="new-question-options-container" style="display: none; margin-bottom: 15px;">
                    <label>Opções (uma por linha)</label>
                    <textarea id="new-question-options" rows="5" placeholder="Opção 1&#10;Opção 2&#10;Opção 3" style="width: 100%; padding: 10px; border-radius: 8px; background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC);"></textarea>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="cancel-question-btn" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 8px; cursor: pointer;">Cancelar</button>
                    <button type="button" class="save-question-btn" style="padding: 10px 20px; background: var(--dourado-principal, #FFC700); color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Salvar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Mostrar/esconder opções baseado no tipo
        const typeSelect = modal.querySelector('#new-question-type');
        const optionsContainer = modal.querySelector('#new-question-options-container');
        const needsOptions = ['multiple_choice', 'checkbox', 'dropdown', 'multiple_choice_grid', 'checkbox_grid'];

        typeSelect.addEventListener('change', () => {
            optionsContainer.style.display = needsOptions.includes(typeSelect.value) ? 'block' : 'none';
        });

        // Salvar pergunta
        modal.querySelector('.save-question-btn').addEventListener('click', () => {
            const type = typeSelect.value;
            const label = modal.querySelector('#new-question-label').value.trim();
            const required = modal.querySelector('#new-question-required').checked;
            const optionsText = modal.querySelector('#new-question-options').value.trim();

            if (!label) {
                alert('Por favor, digite a pergunta.');
                return;
            }

            const newField = {
                type: type,
                label: label,
                required: required,
                id: 'field_' + Date.now()
            };

            if (needsOptions.includes(type) && optionsText) {
                newField.options = optionsText.split('\n').filter(o => o.trim()).map(o => o.trim());
            }

            // Adicionar ao array de campos
            const fieldsInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-digital-form-fields`);
            let fields = [];
            if (fieldsInput && fieldsInput.value) {
                try {
                    fields = JSON.parse(fieldsInput.value);
                } catch (e) {
                    fields = [];
                }
            }
            fields.push(newField);
            fieldsInput.value = JSON.stringify(fields);

            // Re-renderizar
            renderFormQuestions(itemId, fields);

            // Fechar modal
            document.body.removeChild(modal);
        });

        // Cancelar
        modal.querySelector('.cancel-question-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // Editar pergunta
    function editQuestion(itemId, index, field) {
        // Similar ao addQuestion, mas preenchendo os campos
        console.log('Editar pergunta:', index, field);
        // Implementação similar ao addQuestion, mas com dados pré-preenchidos
    }

    // Deletar pergunta
    function deleteQuestion(itemId, index) {
        if (!confirm('Tem certeza que deseja remover esta pergunta?')) return;

        const fieldsInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-digital-form-fields`);
        let fields = [];
        if (fieldsInput && fieldsInput.value) {
            try {
                fields = JSON.parse(fieldsInput.value);
            } catch (e) {
                fields = [];
            }
        }

        fields.splice(index, 1);
        fieldsInput.value = JSON.stringify(fields);
        renderFormQuestions(itemId, fields);
    }

    // Carregar respostas do formulário (tornar acessível globalmente)
    window.loadFormResponses = async function loadFormResponses(itemId) {
        const dashboard = document.getElementById(`form-responses-dashboard-${itemId}`);
        if (!dashboard) return;

        try {
            HEADERS = getHeaders();
            const response = await fetch(`${API_URL}/api/profile/digital-forms/${itemId}/responses`, {
                headers: HEADERS
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar respostas');
            }

            const data = await response.json();

            if (!data.success || !data.responses || data.responses.length === 0) {
                dashboard.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--text-dark, #A1A1A1);">
                        <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                        <p>Nenhuma resposta ainda.</p>
                    </div>
                `;
                return;
            }

            const stats = data.statistics || {};
            dashboard.innerHTML = `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: var(--text, #ECECEC); margin-bottom: 20px;">Estatísticas</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">
                        <div style="padding: 20px; background: var(--card-background-color, #1C1C21); border-radius: 8px; border: 1px solid var(--border-color, #2C2C2F);">
                            <div style="font-size: 2rem; font-weight: 600; color: var(--dourado-principal, #FFC700);">${stats.total_responses || 0}</div>
                            <div style="color: var(--text-dark, #A1A1A1); margin-top: 5px;">Total de Respostas</div>
                        </div>
                        <div style="padding: 20px; background: var(--card-background-color, #1C1C21); border-radius: 8px; border: 1px solid var(--border-color, #2C2C2F);">
                            <div style="font-size: 2rem; font-weight: 600; color: var(--dourado-principal, #FFC700);">${stats.unique_responders || 0}</div>
                            <div style="color: var(--text-dark, #A1A1A1); margin-top: 5px;">Respondentes nicos</div>
                        </div>
                    </div>
                </div>
                <div>
                    <h3 style="color: var(--text, #ECECEC); margin-bottom: 20px;">Respostas Recebidas</h3>
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        ${data.responses.map((resp, idx) => {
                const responseData = typeof resp.response_data === 'string' ? JSON.parse(resp.response_data) : resp.response_data;
                return `
                                <div style="padding: 20px; background: var(--card-background-color, #1C1C21); border-radius: 8px; border: 1px solid var(--border-color, #2C2C2F);">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                        <strong style="color: var(--text, #ECECEC);">Resposta #${idx + 1}</strong>
                                        <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">${new Date(resp.submitted_at).toLocaleString('pt-BR')}</span>
                                    </div>
                                    ${resp.responder_name ? `<div style="margin-bottom: 5px;"><strong>Nome:</strong> ${resp.responder_name}</div>` : ''}
                                    ${resp.responder_phone ? `<div style="margin-bottom: 5px;"><strong>Telefone:</strong> ${resp.responder_phone}</div>` : ''}
                                    ${resp.responder_email ? `<div style="margin-bottom: 5px;"><strong>Email:</strong> ${resp.responder_email}</div>` : ''}
                                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color, #2C2C2F);">
                                        <strong style="color: var(--text, #ECECEC); display: block; margin-bottom: 10px;">Respostas:</strong>
                                        ${Object.entries(responseData).map(([key, value]) => `
                                            <div style="margin-bottom: 8px;">
                                                <strong style="color: var(--text-dark, #A1A1A1);">${key}:</strong>
                                                <span style="color: var(--text, #ECECEC); margin-left: 10px;">${Array.isArray(value) ? value.join(', ') : value}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Erro ao carregar respostas:', error);
            dashboard.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ff4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 15px;"></i>
                    <p>Erro ao carregar respostas: ${error.message}</p>
                </div>
            `;
        }
    }

    // Event listener para botão "Adicionar Pergunta"
    document.addEventListener('click', (e) => {
        if (e.target.closest('.add-question-btn')) {
            const btn = e.target.closest('.add-question-btn');
            const itemId = btn.dataset.itemId;
            if (itemId) {
                addQuestion(parseInt(itemId));
            }
        }

        // Event listener para botão "Abrir Página de Edição" do Formulário King
        if (e.target.closest('.btn-edit-form-page')) {
            const btn = e.target.closest('.btn-edit-form-page');
            const itemId = btn.dataset.itemId || btn.dataset.id;

            console.log('[DASHBOARD] Botão "Abrir Página de Edição Completa" clicado:', {
                itemId,
                dataset: btn.dataset
            });

            if (itemId) {
                console.log('[DASHBOARD] Redirecionando para formPageEdit.html com itemId:', itemId);
                window.location.href = `formPageEdit.html?itemId=${itemId}`;
            } else {
                console.error('[DASHBOARD] itemId não encontrado no botão btn-edit-form-page');
                alert('Erro: ID do formulário não encontrado. Por favor, recarregue a página e tente novamente.');
            }
        }
    });

    // === FUN—.ES PARA LISTA DE CONVIDADOS ===

    // Carregar todas as listas de convidados
    async function loadGuestLists() {
        const container = document.getElementById('guest-lists-container');
        const statsContainer = document.getElementById('guest-list-stats');

        if (!container) return;

        try {
            const response = await safeFetch(`${API_URL}/api/guest-lists`, {
                method: 'GET',
                headers: HEADERS_AUTH
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar listas de convidados');
            }

            const lists = await response.json();

            // Mapear os dados da API para o formato esperado
            const listsWithStats = lists.map(list => {
                // A API já retorna registered_count, confirmed_count, checked_in_count
                // pi.* retorna o id da profile_items como 'id'
                // gli.* retorna o id da guest_list_items e profile_item_id
                const total = parseInt(list.registered_count || 0) + parseInt(list.confirmed_count || 0) + parseInt(list.checked_in_count || 0);
                list.stats = {
                    total: total,
                    registered: parseInt(list.registered_count || 0),
                    confirmed: parseInt(list.confirmed_count || 0),
                    checked_in: parseInt(list.checked_in_count || 0)
                };
                // O 'id' de pi.* é o profile_item_id que precisamos para editar
                // profile_item_id é da tabela guest_list_items (referência para profile_items)
                list.profile_item_id = list.id; // pi.id é o profile_item_id
                return list;
            });

            // Calcular estatísticas gerais
            const generalStats = listsWithStats.reduce((acc, list) => {
                const stats = list.stats || { total: 0, registered: 0, confirmed: 0, checked_in: 0 };
                acc.total += stats.total || 0;
                acc.registered += stats.registered || 0;
                acc.confirmed += stats.confirmed || 0;
                acc.checked_in += stats.checked_in || 0;
                return acc;
            }, { total: 0, registered: 0, confirmed: 0, checked_in: 0 });

            // Renderizar estatísticas gerais
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="stat-card" style="background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; padding: 20px; text-align: center;">
                        <div class="stat-value" style="font-size: 32px; font-weight: 800; color: var(--dourado-principal, #FFC700); margin: 8px 0;">${lists.length}</div>
                        <div class="stat-label" style="color: var(--text-dark, #A1A1A1); font-size: 14px;">Listas Criadas</div>
                    </div>
                    <div class="stat-card" style="background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; padding: 20px; text-align: center;">
                        <div class="stat-value" style="font-size: 32px; font-weight: 800; color: var(--dourado-principal, #FFC700); margin: 8px 0;">${generalStats.total}</div>
                        <div class="stat-label" style="color: var(--text-dark, #A1A1A1); font-size: 14px;">Total de Convidados</div>
                    </div>
                    <div class="stat-card" style="background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; padding: 20px; text-align: center;">
                        <div class="stat-value" style="font-size: 32px; font-weight: 800; color: #4CAF50; margin: 8px 0;">${generalStats.confirmed}</div>
                        <div class="stat-label" style="color: var(--text-dark, #A1A1A1); font-size: 14px;">Confirmados</div>
                    </div>
                    <div class="stat-card" style="background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; padding: 20px; text-align: center;">
                        <div class="stat-value" style="font-size: 32px; font-weight: 800; color: #2196F3; margin: 8px 0;">${generalStats.checked_in}</div>
                        <div class="stat-label" style="color: var(--text-dark, #A1A1A1); font-size: 14px;">Conferidos</div>
                    </div>
                `;
            }

            // Renderizar listas
            if (listsWithStats.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--text-dark, #A1A1A1);">
                        <i class="fas fa-users" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                        <p style="font-size: 16px; margin-bottom: 8px;">Nenhuma lista de convidados criada ainda</p>
                        <p style="font-size: 14px; opacity: 0.7;">Clique em "Nova Lista" para começar</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = listsWithStats.map(list => {
                const stats = list.stats || { total: 0, registered: 0, confirmed: 0, checked_in: 0 };
                const eventDate = list.event_date ? new Date(list.event_date).toLocaleDateString('pt-BR') : 'Não definido';

                return `
                    <div class="module-item" data-id="${list.profile_item_id || list.id}" data-item-type="guest_list" style="background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                            <div style="flex: 1;">
                                <h4 style="color: var(--text, #ECECEC); margin: 0 0 8px 0; font-size: 18px;">
                                    <i class="fas fa-users" style="color: var(--dourado-principal, #FFC700); margin-right: 8px;"></i>
                                    ${list.event_title || list.title || 'Lista de Convidados'}
                                </h4>
                                <p style="color: var(--text-dark, #A1A1A1); margin: 0; font-size: 14px;">
                                    <i class="fas fa-calendar" style="margin-right: 6px;"></i>
                                    ${eventDate}
                                </p>
                                ${list.event_location ? `
                                    <p style="color: var(--text-dark, #A1A1A1); margin: 4px 0 0 0; font-size: 14px;">
                                        <i class="fas fa-map-marker-alt" style="margin-right: 6px;"></i>
                                        ${list.event_location}
                                    </p>
                                ` : ''}
                            </div>
                            <button class="btn-icon" onclick="openGuestListEditor(${list.profile_item_id || list.id})" style="background: var(--dourado-principal, #FFC700); color: #000; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                <i class="fas fa-edit"></i> Gerenciar
                            </button>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color, #2C2C2F);">
                            <div style="text-align: center;">
                                <div style="font-size: 24px; font-weight: 800; color: var(--dourado-principal, #FFC700);">${stats.total}</div>
                                <div style="font-size: 12px; color: var(--text-dark, #A1A1A1);">Total</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 24px; font-weight: 800; color: #4CAF50;">${stats.confirmed}</div>
                                <div style="font-size: 12px; color: var(--text-dark, #A1A1A1);">Confirmados</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 24px; font-weight: 800; color: #2196F3;">${stats.checked_in}</div>
                                <div style="font-size: 12px; color: var(--text-dark, #A1A1A1);">Conferidos</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 24px; font-weight: 800; color: #FF9800;">${stats.registered - stats.confirmed}</div>
                                <div style="font-size: 12px; color: var(--text-dark, #A1A1A1);">Pendentes</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Erro ao carregar listas de convidados:', error);
            if (container) {
                container.innerHTML = `
                    <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--text-dark, #A1A1A1);">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; color: #FF9800;"></i>
                        <p style="font-size: 16px; margin-bottom: 8px;">Erro ao carregar listas de convidados</p>
                        <p style="font-size: 14px; opacity: 0.7;">Tente recarregar a página</p>
                    </div>
                `;
            }
        }
    }

    // Abrir editor de lista de convidados
    function openGuestListEditor(profileItemId) {
        // O profileItemId é o ID da profile_items, que é o que precisamos para a página de edição
        window.location.href = `guestListEdit.html?itemId=${profileItemId}`;
    }

    // Listener para botão "Nova Lista"
    const addGuestListBtn = document.getElementById('add-guest-list-btn');
    if (addGuestListBtn) {
        addGuestListBtn.addEventListener('click', async () => {
            // Abrir modal de adicionar item e selecionar "Lista de Convidados"
            SELECTORS.addItemModal.classList.add('active');
            await filterModulesByPlan();

            // Scroll para o card de Lista de Convidados
            setTimeout(() => {
                const guestListCard = document.querySelector('[data-item-type="guest_list"]');
                if (guestListCard) {
                    guestListCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    guestListCard.style.border = '2px solid var(--dourado-principal, #FFC700)';
                    setTimeout(() => {
                        guestListCard.style.border = '';
                    }, 2000);
                }
            }, 300);
        });
    }

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
                            alert('O Erro ao salvar configuração. Tente novamente.');
                        }
                    } else {
                        const error = await response.json();
                        alert(`O Erro: ${error.message || 'Erro ao salvar configuração'}`);
                    }
                } catch (error) {
                    console.error('Erro ao salvar configuração:', error);
                    alert('O Erro ao salvar configuração. Verifique sua conexão e tente novamente.');
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
