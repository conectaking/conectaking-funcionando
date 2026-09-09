/**
 * Sales Page Edit - JavaScript Principal
 * Gerencia navegação de abas, carregamento de dados e coordenação entre módulos
 */

(function() {
    'use strict';

    // Configuração da API (consistente com dashboard.js)
    const API_URL = String(window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');

    // Cache de requisições para evitar rate limit
    const requestCache = new Map();
    const CACHE_DURATION = 30000; // 30 segundos de cache para GET requests
    const RATE_LIMIT_COOLDOWN = 60000; // 60 segundos de cooldown após rate limit

    // Variáveis globais para o cropper de logo
    let cropper = null;
    let imageToUpload = {
        blob: null,
        originalFile: null
    };

    /**
     * Função safeFetch com cache e tratamento de rate limit
     */
    async function safeFetch(url, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 30000,
            ...options
        };

        // Verificar cooldown de rate limit
        const cooldownKey = `rateLimit_${url}`;
        const cooldownTime = localStorage.getItem(cooldownKey);
        if (cooldownTime) {
            const timeSinceCooldown = Date.now() - parseInt(cooldownTime);
            if (timeSinceCooldown < RATE_LIMIT_COOLDOWN) {
                const waitSeconds = Math.ceil((RATE_LIMIT_COOLDOWN - timeSinceCooldown) / 1000);
                console.warn(`⏳ Rate limit cooldown ativo para ${url}. Aguarde ${waitSeconds} segundos.`);
                
                // Tentar usar cache se disponível
                if (defaultOptions.method === 'GET' || !defaultOptions.method) {
                    const cacheKey = `${url}_${JSON.stringify(defaultOptions.headers || {})}`;
                    const cached = requestCache.get(cacheKey);
                    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION * 2) {
                        console.log(`Usando cache durante cooldown para: ${url}`);
                        return cached.response.clone();
                    }
                }
                
                throw new Error(`Rate limit. Aguarde ${waitSeconds} segundos antes de tentar novamente.`);
            } else {
                // Cooldown expirado, remover
                localStorage.removeItem(cooldownKey);
            }
        }

        // Verificar cache para requisições GET
        if (defaultOptions.method === 'GET' || !defaultOptions.method) {
            const cacheKey = `${url}_${JSON.stringify(defaultOptions.headers || {})}`;
            const cached = requestCache.get(cacheKey);
            
            if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
                console.log(`Usando cache para: ${url}`);
                return cached.response.clone();
            }
        }

        // Adicionar token de autorização
        const token = localStorage.getItem('accessToken') || localStorage.getItem('conectaKingToken') || localStorage.getItem('token');
        if (token && !defaultOptions.headers.Authorization) {
            defaultOptions.headers.Authorization = `Bearer ${token}`;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), defaultOptions.timeout);
            
            const response = await fetch(url, {
                ...defaultOptions,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 429) {
                    console.warn(`Rate limit atingido para: ${url}`);
                    const retryAfter = response.headers.get('Retry-After') || '60';
                    localStorage.setItem(cooldownKey, Date.now().toString());
                    
                    // Tentar usar cache se disponível
                    if (defaultOptions.method === 'GET' || !defaultOptions.method) {
                        const cacheKey = `${url}_${JSON.stringify(defaultOptions.headers || {})}`;
                        const cached = requestCache.get(cacheKey);
                        if (cached) {
                            console.log(`Usando cache após rate limit para: ${url}`);
                            return cached.response.clone();
                        }
                    }
                    
                    const err = new Error(`Muitas requisições. Aguarde ${retryAfter} segundos antes de tentar novamente.`);
                    err.status = 429;
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

            return response;

        } catch (error) {
            console.error(`O Erro na requisição para ${url}:`, error);
            
            if (error.name === 'AbortError') {
                throw new Error('Timeout: A requisição demorou muito para responder');
            } else if (error.message.includes('Failed to fetch')) {
                throw new Error('Erro de conexão: Verifique sua internet e tente novamente');
            } else {
                throw error;
            }
        }
    }

    // Elementos DOM
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const btnBack = document.getElementById('btn-back-to-dashboard');
    const btnSave = document.getElementById('btn-save-all');
    const pageTitle = document.getElementById('page-title');

    // Dados da página
    let currentSalesPage = null;
    let currentItemId = null;

    // Garantir que SALES_PAGE_EDIT_DATA existe
    if (!window.SALES_PAGE_EDIT_DATA) {
        window.SALES_PAGE_EDIT_DATA = {
            itemId: null,
            salesPageId: null,
            profileId: null,
            profileSlug: null
        };
    }

    // Criar um Proxy para detectar quando salesPageId é definido
    const createSalesPageIdObserver = () => {
        const salesPageIdObserver = {
            set(target, property, value) {
                const oldValue = target[property];
                target[property] = value;
                if (property === 'salesPageId' && value && value !== oldValue) {
                    console.log('SalesPageId definido:', value, '- Carregando contagem de produtos...');
                    setTimeout(() => {
                        if (window.DashboardProducts && typeof window.DashboardProducts.loadProductsCount === 'function') {
                            window.DashboardProducts.loadProductsCount();
                        }
                    }, 200);
                }
                return true;
            }
        };
        return new Proxy(window.SALES_PAGE_EDIT_DATA, salesPageIdObserver);
    };

    // Substituir o objeto original pelo proxy para detectar mudanças
    window.SALES_PAGE_EDIT_DATA = createSalesPageIdObserver();

    /**
     * Inicialização
     */
    function init() {
        // Obter itemId da URL
        const urlParams = new URLSearchParams(window.location.search);
        currentItemId = urlParams.get('itemId');

        if (!currentItemId) {
            alert('Erro: ID do item não encontrado na URL.');
            window.location.href = '/dashboard';
            return;
        }
        
        // IMPORTANTE: Verificar se o itemId é temporário (não salvo ainda)
        if (currentItemId.toString().startsWith('temp_')) {
            alert('Este módulo ainda não foi salvo. Por favor, clique em "Publicar alterações" no dashboard primeiro para salvar o módulo antes de editá-lo.');
            window.location.href = '/dashboard';
            return;
        }

        // Configurar dados globais
        window.SALES_PAGE_EDIT_DATA.itemId = currentItemId;

        // Configurar event listeners
        setupEventListeners();

        // Carregar dados da página
        loadSalesPageData().then(() => {
            // Restaurar aba ativa do localStorage após carregar dados
            restoreActiveTab();
        }).catch(() => {
            // Mesmo se houver erro, tentar restaurar aba
            restoreActiveTab();
        });
    }

    /**
     * Restaurar aba ativa do localStorage
     */
    function restoreActiveTab() {
        const storageKey = `salesPageEdit_activeTab_${currentItemId}`;
        const savedTab = localStorage.getItem(storageKey);
        
        if (savedTab) {
            // Verificar se a aba existe
            const tabExists = document.querySelector(`[data-tab="${savedTab}"]`);
            if (tabExists) {
                // Aguardar um pouco para garantir que o DOM está pronto
                setTimeout(() => {
                    switchTab(savedTab);
                }, 100);
                return;
            }
        }
        
        // Se não houver aba salva ou a aba não existir, usar a primeira aba ativa ou 'config'
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            const tabName = activeTab.dataset.tab;
            if (tabName) {
                switchTab(tabName);
            }
        }
    }

    /**
     * Restaurar aba ativa do localStorage
     */
    function restoreActiveTab() {
        const storageKey = `salesPageEdit_activeTab_${currentItemId}`;
        const savedTab = localStorage.getItem(storageKey);
        
        if (savedTab) {
            // Verificar se a aba existe
            const tabExists = document.querySelector(`[data-tab="${savedTab}"]`);
            if (tabExists) {
                // Aguardar um pouco para garantir que o DOM está pronto
                setTimeout(() => {
                    switchTab(savedTab);
                }, 100);
                return;
            }
        }
        
        // Se não houver aba salva ou a aba não existir, usar a primeira aba ativa ou 'config'
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            const tabName = activeTab.dataset.tab;
            if (tabName) {
                switchTab(tabName);
            }
        }
    }

    /**
     * Configurar event listeners
     */
    function setupEventListeners() {
        // Navegação de abas (click + pointerup para mobile)
        tabButtons.forEach(btn => {
            const go = (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                const tabName = btn.dataset.tab;
                if (tabName) switchTab(tabName);
            };
            btn.addEventListener('click', go);
            btn.addEventListener('pointerup', (e) => {
                if (e.pointerType === 'touch' || e.pointerType === 'pen') go(e);
            });
        });

        // Botão voltar
        if (btnBack) {
            btnBack.addEventListener('click', () => {
                window.location.href = '/dashboard';
            });
        }

        // Botão salvar
        if (btnSave) {
            btnSave.addEventListener('click', saveAllChanges);
        }

        // Sincronizar color pickers
        setupColorPickers();
        
        // Configurar upload de logo
        setupLogoUpload();
        
        // Configurar upload de imagem de fundo
        setupBackgroundImageUpload();
        
        // Configurar upload de meta imagem
        setupMetaImageUpload();
        
        // Formato no cartão: mostrar/ocultar grupo do banner
        setupCardDisplayFormatListeners();
        
        // Configurar upload do banner do cartão
        setupCardBannerUpload();
        
        // Configurar sugestões de texto
        setupTextSuggestions();
    }

    /**
     * Trocar de aba
     */
    function switchTab(tabName) {
        // Salvar aba ativa no localStorage
        const storageKey = `salesPageEdit_activeTab_${currentItemId}`;
        localStorage.setItem(storageKey, tabName);

        // Remover active de todas as abas e esconder conteúdo completamente
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => {
            content.classList.remove('active');
            // Forçar esconder completamente no mobile
            content.style.display = 'none';
            content.style.visibility = 'hidden';
            content.style.opacity = '0';
            content.style.height = '0';
            content.style.overflow = 'hidden';
            content.style.position = 'absolute';
            content.style.left = '-9999px';
            content.style.width = '0';
        });

        // Ativar aba selecionada
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(`tab-${tabName}`);

        if (activeBtn) activeBtn.classList.add('active');
        if (activeContent) {
            activeContent.classList.add('active');
            // Forçar mostrar apenas a aba ativa com todos os estilos corretos
            activeContent.style.display = 'block';
            activeContent.style.visibility = 'visible';
            activeContent.style.opacity = '1';
            activeContent.style.height = 'auto';
            activeContent.style.overflow = 'visible';
            activeContent.style.position = 'relative';
            activeContent.style.left = '0';
            activeContent.style.width = '100%';
            
            // Scroll para o topo da aba
            setTimeout(() => {
                activeContent.scrollTop = 0;
                const contentContainer = document.querySelector('.sales-page-edit-content');
                if (contentContainer) {
                    contentContainer.scrollTop = 0;
                }
            }, 50);
        }

        // Carregar dados específicos da aba se necessário
        if (tabName === 'products') {
            console.log('Aba de produtos ativada, carregando produtos...');
            // Aguardar um pouco para garantir que a aba foi renderizada
            setTimeout(() => {
                if (window.DashboardProducts && typeof window.DashboardProducts.loadProducts === 'function') {
                    window.DashboardProducts.loadProducts();
                } else {
                    console.warn('DashboardProducts não disponível ainda, tentando novamente...');
                    setTimeout(() => {
                        if (window.DashboardProducts && typeof window.DashboardProducts.loadProducts === 'function') {
                            window.DashboardProducts.loadProducts();
                        }
                    }, 500);
                }
            }, 200);
        } else if (tabName === 'analytics' && window.DashboardAnalytics) {
            window.DashboardAnalytics.loadAnalytics();
        } else if (tabName === 'preview' && window.DashboardSalesPage) {
            window.DashboardSalesPage.updatePreview();
        }
    }

    /**
     * Configurar color pickers
     */
    function setupColorPickers() {
        const colorPickers = document.querySelectorAll('.color-picker');
        colorPickers.forEach(picker => {
            const textInput = picker.nextElementSibling;
            if (textInput && textInput.classList.contains('color-text')) {
                // Sincronizar picker -> text
                picker.addEventListener('input', () => {
                    textInput.value = picker.value;
                });

                // Sincronizar text -> picker
                textInput.addEventListener('input', () => {
                    if (/^#[0-9A-F]{6}$/i.test(textInput.value)) {
                        picker.value = textInput.value;
                    }
                });
            }
        });
    }

    /**
     * Configurar upload de logo
     */
    /**
     * Abrir cropper para logo (formato automático)
     */
    function openLogoCropper(file) {
        const cropperModal = document.getElementById('cropper-modal');
        const image = document.getElementById('image-to-crop');
        const reader = new FileReader();

        reader.onload = function (e) {
            image.src = e.target.result;
            cropperModal.classList.add('active');

            if (cropper) {
                cropper.destroy();
            }

            // Formato automático (NaN = sem proporção fixa)
            const aspectRatio = NaN;

            cropper = new Cropper(image, {
                aspectRatio: aspectRatio,
                viewMode: 1,
                background: false,
                autoCropArea: 0.9
            });

            imageToUpload.originalFile = file;
        };

        reader.readAsDataURL(file);
    }

    /**
     * Fechar cropper
     */
    function closeLogoCropper() {
        const cropperModal = document.getElementById('cropper-modal');
        if (cropperModal) {
            cropperModal.classList.remove('active');
        }
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    }

    const UPLOAD_MAX_MB = 15;
    const UPLOAD_MAX_BYTES = UPLOAD_MAX_MB * 1024 * 1024;

    /**
     * Processar upload da logo após crop
     */
    async function handleSalesPageLogoUpload(imageFile) {
        const uploadBtn = document.getElementById('btn-upload-logo');
        const logoUrlInput = document.getElementById('button-logo-url');
        const preview = document.getElementById('logo-preview');

        if (imageFile.size > UPLOAD_MAX_BYTES) {
            const sizeMB = (imageFile.size / 1024 / 1024).toFixed(1);
            alert('O tamanho máximo permitido é ' + UPLOAD_MAX_MB + ' MB. Sua imagem tem ' + sizeMB + ' MB. Redimensione ou escolha outra imagem.');
            return;
        }

        try {
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            }

            // Obter URL de upload do Cloudflare
            const token = localStorage.getItem('conectaKingToken') || localStorage.getItem('token');
            const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!authResponse.ok) {
                throw new Error('Erro ao obter URL de upload');
            }

            const { uploadURL } = await authResponse.json();

            // Fazer upload
            const formData = new FormData();
            const isPNG = imageFile.type === 'image/png' || (imageFile.name && imageFile.name.toLowerCase().endsWith('.png'));
            const fileName = isPNG ? 'logo.png' : 'logo.jpg';
            formData.append('file', imageFile, fileName);

            const uploadResponse = await fetch(uploadURL, {
                method: 'POST',
                body: formData,
                headers: token ? { 'Authorization': 'Bearer ' + token } : {}
            });

            if (!uploadResponse.ok) {
                const errBody = await uploadResponse.json().catch(() => ({}));
                const msg = errBody.message || 'Falha no upload';
                throw new Error(msg);
            }

            const uploadData = await uploadResponse.json();
            // API pode retornar R2 (url/imageUrl) ou Cloudflare (result.id)
            const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";
            const finalUrl = uploadData.url || uploadData.imageUrl ||
                (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : null);
            if (!finalUrl) {
                throw new Error('Resposta do upload sem URL da imagem.');
            }

            // Atualizar input e preview
            if (logoUrlInput) {
                logoUrlInput.value = finalUrl;
            }
            updateImagePreview('logo-preview', finalUrl);
            
            // Mostrar campo de tamanho da logo após upload
            const logoSizeGroup = document.getElementById('logo-size-group');
            if (logoSizeGroup) {
                logoSizeGroup.style.display = 'block';
            }

            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Fazer Upload da Logo';
            }

        } catch (error) {
            console.error('Erro no upload:', error);
            alert(error.message || 'Erro ao fazer upload da imagem. Tente novamente.');
            const uploadBtn = document.getElementById('btn-upload-logo');
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Fazer Upload da Logo';
            }
        }
    }

    function setupLogoUpload() {
        const uploadBtn = document.getElementById('btn-upload-logo');
        const logoUrlInput = document.getElementById('button-logo-url');
        const preview = document.getElementById('logo-preview');

        if (uploadBtn) {
            uploadBtn.addEventListener('click', async () => {
                // Criar input file temporário
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    // Abrir cropper para enquadrar a logo
                    openLogoCropper(file);
                };
                input.click();
            });
        }

        // Event listeners para o modal de crop
        const cancelCropBtn = document.getElementById('cancel-crop-btn');
        const cropAndUploadBtn = document.getElementById('crop-and-upload-btn');

        if (cancelCropBtn) {
            cancelCropBtn.addEventListener('click', () => {
                closeLogoCropper();
            });
        }

        if (cropAndUploadBtn) {
            cropAndUploadBtn.addEventListener('click', () => {
                if (!cropper) return;

                // Detectar tipo original do arquivo para preservar PNG
                const originalFile = imageToUpload.originalFile;
                const isPNG = originalFile && (originalFile.type === 'image/png' || originalFile.name.toLowerCase().endsWith('.png'));
                const mimeType = isPNG ? 'image/png' : 'image/jpeg';
                const quality = isPNG ? 1.0 : 0.9; // PNG usa qualidade máxima (sem perda)

                cropper.getCroppedCanvas({
                    width: 1920, // Largura maior para boa qualidade
                    imageSmoothingQuality: 'high',
                }).toBlob(async (blob) => {
                    // Preservar PNG com nome correto para manter transparência
                    let imageFile;
                    if (isPNG) {
                        const fileName = originalFile && originalFile.name ? originalFile.name : 'logo.png';
                        imageFile = new File([blob], fileName, { type: 'image/png' });
                    } else {
                        const fileName = originalFile && originalFile.name ? originalFile.name : 'logo.jpg';
                        imageFile = new File([blob], fileName, { type: 'image/jpeg' });
                    }

                    closeLogoCropper();
                    await handleSalesPageLogoUpload(imageFile);
                }, mimeType, quality);
            });
        }
        
        // Configurar slider de tamanho da logo
        const logoSizeSlider = document.getElementById('button-logo-size-slider');
        const logoSizeInput = document.getElementById('button-logo-size');
        const logoSizeValue = document.getElementById('logo-size-value');
        
        if (logoSizeSlider && logoSizeInput && logoSizeValue) {
            // Sincronizar slider -> input numérico -> valor exibido
            logoSizeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                logoSizeInput.value = value;
                logoSizeValue.textContent = value;
            });
            
            // Sincronizar input numérico -> slider -> valor exibido
            logoSizeInput.addEventListener('input', (e) => {
                let value = parseInt(e.target.value);
                if (isNaN(value)) value = 24;
                if (value < 20) value = 20;
                if (value > 600) value = 600;
                logoSizeInput.value = value;
                logoSizeSlider.value = value;
                logoSizeValue.textContent = value;
            });
        }
    }

    /**
     * Carregar dados da página de vendas
     */
    async function loadSalesPageData() {
        try {
            // Buscar dados do profile_item primeiro usando safeFetch
            // O safeFetch já adiciona o token de autorização automaticamente
            let itemResponse;
            try {
                itemResponse = await safeFetch(`${API_URL}/api/profile/items/${currentItemId}`, {
                    method: 'GET'
                });
            } catch (error) {
                // Se for rate limit, tentar usar dados do localStorage se disponível
                if (error.status === 429 || error.message.includes('Rate limit')) {
                    const cachedData = localStorage.getItem(`salesPageItem_${currentItemId}`);
                    if (cachedData) {
                        console.log('Usando dados em cache após rate limit');
                        const itemResponseData = JSON.parse(cachedData);
                        const itemData = itemResponseData.data || itemResponseData;
                        // Continuar com o fluxo usando dados em cache
                        await processItemData(itemData);
                        return;
                    }
                    throw error;
                }
                throw error;
            }

            if (!itemResponse.ok) {
                if (itemResponse.status === 404) {
                    // Tentar usar cache antes de redirecionar
                    const cachedData = localStorage.getItem(`salesPageItem_${currentItemId}`);
                    if (cachedData) {
                        console.log('Item não encontrado no servidor, usando dados em cache...');
                        try {
                            const itemResponseData = JSON.parse(cachedData);
                            const itemData = itemResponseData.data || itemResponseData;
                            if (itemData && itemData.item_type === 'sales_page') {
                                await processItemData(itemData);
                                return;
                            }
                        } catch (e) {
                            console.error('Erro ao processar cache:', e);
                        }
                    }
                    
                    // Limpar cache e localStorage relacionado quando o item não existe
                    console.log(`'️ Limpando cache e localStorage para item ${currentItemId} que não existe mais...`);
                    localStorage.removeItem(`salesPageItem_${currentItemId}`);
                    localStorage.removeItem(`salesPage_${currentItemId}`);
                    localStorage.removeItem(`salesPage_pendingChanges_${currentItemId}`);
                    
                    alert(`Erro: O item ${currentItemId} não foi encontrado no servidor. Ele pode ter sido deletado ou ainda não foi salvo. Redirecionando para o dashboard...`);
                    window.location.href = '/dashboard';
                    return;
                }
                const errorText = await itemResponse.text();
                let errorData = {};
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    console.warn('Erro ao parsear resposta de erro:', e);
                }
                throw new Error(errorData.error || errorData.message || `Erro ${itemResponse.status}: ${itemResponse.statusText}`);
            }

            const itemResponseData = await itemResponse.json();
            const itemData = itemResponseData.data || itemResponseData;
            
            // Salvar no cache
            localStorage.setItem(`salesPageItem_${currentItemId}`, JSON.stringify(itemResponseData));
            
            if (!itemData) {
                alert('Erro: Dados do item não encontrados. Redirecionando para o dashboard...');
                window.location.href = '/dashboard';
                return;
            }
            
            if (itemData.item_type !== 'sales_page') {
                alert('Este item não é uma página de vendas.');
                window.location.href = '/dashboard';
                return;
            }

            // Processar dados do item
            await processItemData(itemData);

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            
            // Tentar usar cache em caso de qualquer erro (404, rate limit, etc.)
            const cachedData = localStorage.getItem(`salesPageItem_${currentItemId}`);
            if (cachedData) {
                console.log('Erro ao carregar dados, tentando usar cache...');
                try {
                    const itemResponseData = JSON.parse(cachedData);
                    const itemData = itemResponseData.data || itemResponseData;
                    if (itemData && itemData.item_type === 'sales_page') {
                        console.log('Usando dados em cache para continuar...');
                        await processItemData(itemData);
                        return;
                    }
                } catch (e) {
                    console.error('Erro ao processar cache:', e);
                }
            }
            
            // Se for rate limit, mostrar mensagem específica
            if (error.status === 429 || error.message.includes('Rate limit')) {
                alert('Muitas requisições. Aguarde alguns segundos e recarregue a página.');
                return;
            }
            
            // Para outros erros, mostrar mensagem genérica mas não bloquear completamente
            console.error('O Erro ao carregar dados da página de vendas:', error.message);
            const errorMsg = error.message || 'Erro desconhecido';
            alert(`Erro ao carregar dados da página de vendas: ${errorMsg}\n\nTente recarregar a página ou voltar ao dashboard.`);
        }
    }

    /**
     * Processar dados do item e carregar sales page
     */
    async function processItemData(itemData) {
        // Buscar dados da sales_page por profile_item_id usando safeFetch
        // O safeFetch já adiciona o token de autorização automaticamente
        let salesPageResponse;
        try {
            salesPageResponse = await safeFetch(`${API_URL}/api/v1/sales-pages/item/${currentItemId}`, {
                method: 'GET'
            });
        } catch (error) {
            // Se for rate limit, tentar usar cache
            if (error.status === 429 || error.message.includes('Rate limit')) {
                const cachedSalesPage = localStorage.getItem(`salesPage_${currentItemId}`);
                if (cachedSalesPage) {
                    console.log('Usando sales page em cache após rate limit');
                    const salesPageData = JSON.parse(cachedSalesPage);
                    if (salesPageData.success && salesPageData.data) {
                        await processSalesPageData(salesPageData.data, itemData);
                        return;
                    }
                }
                throw error;
            }
            throw error;
        }

        if (!salesPageResponse.ok) {
            // Se for 404, tentar usar cache antes de criar nova página
            if (salesPageResponse.status === 404) {
                const cachedSalesPage = localStorage.getItem(`salesPage_${currentItemId}`);
                if (cachedSalesPage) {
                    console.log('Sales page não encontrada no servidor (404), usando dados em cache...');
                    try {
                        const salesPageData = JSON.parse(cachedSalesPage);
                        if (salesPageData.success && salesPageData.data) {
                            await processSalesPageData(salesPageData.data, itemData);
                            return;
                        }
                    } catch (e) {
                        console.error('Erro ao processar cache:', e);
                    }
                }
                console.log('Sales page não encontrada e sem cache, criando página inicial...');
                await createInitialSalesPage(itemData);
                return; // createInitialSalesPage já preenche o formulário
            }
            
            // Para outros erros, tentar usar cache
            const cachedSalesPage = localStorage.getItem(`salesPage_${currentItemId}`);
            if (cachedSalesPage) {
                console.log('Erro ao buscar sales page, usando dados em cache...');
                try {
                    const salesPageData = JSON.parse(cachedSalesPage);
                    if (salesPageData.success && salesPageData.data) {
                        await processSalesPageData(salesPageData.data, itemData);
                        return;
                    }
                } catch (e) {
                    console.error('Erro ao processar cache:', e);
                }
            }
            
            const errorText = await salesPageResponse.text();
            let errorData = {};
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                console.warn('Erro ao parsear resposta de erro:', e);
            }
            throw new Error(errorData.error || errorData.message || `Erro ${salesPageResponse.status}: ${salesPageResponse.statusText}`);
        }
        
        const salesPageData = await salesPageResponse.json();
        console.log('Sales page response:', salesPageData);
        
        // Salvar no cache
        if (salesPageData.success && salesPageData.data) {
            localStorage.setItem(`salesPage_${currentItemId}`, JSON.stringify(salesPageData));
        }
        
        // Se não encontrou dados válidos, criar uma página inicial
        if (!salesPageData.success || !salesPageData.data) {
            console.log('Sales page não encontrada ou dados inválidos, criando página inicial...');
            await createInitialSalesPage(itemData);
            return; // createInitialSalesPage já preenche o formulário
        }
        
        // Processar dados da sales page
        await processSalesPageData(salesPageData.data, itemData);
    }

    /**
     * Processar dados da sales page
     */
    async function processSalesPageData(salesPageData, itemData) {
        // A API retorna um objeto único quando busca por profile_item_id
        currentSalesPage = salesPageData;
        // Garantir que o status está sendo preservado corretamente
        console.log('"S Status recebido da API:', {
            status: currentSalesPage.status,
            id: currentSalesPage.id,
            store_title: currentSalesPage.store_title
        });
        
        if (currentSalesPage && currentSalesPage.id) {
            window.SALES_PAGE_EDIT_DATA.salesPageId = currentSalesPage.id;
            window.SALES_PAGE_EDIT_DATA.profileId = itemData.profile_id || itemData.user_id;
            
            // Notificar que o salesPageId está disponível para carregar contagem de produtos
            if (window.DashboardProducts && typeof window.DashboardProducts.loadProductsCount === 'function') {
                console.log('SalesPageId disponível, carregando contagem de produtos...');
                window.DashboardProducts.loadProductsCount();
            }
            
            // Buscar e armazenar profile_slug para o preview (com tratamento de rate limit)
            if (!window.SALES_PAGE_EDIT_DATA.profileSlug) {
                try {
                    const profileRes = await safeFetch(`${API_URL}/api/profile`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    if (profileRes.ok) {
                        const profileData = await profileRes.json();
                        window.SALES_PAGE_EDIT_DATA.profileSlug = profileData.details?.profile_slug || profileData.profile_slug;
                    }
                } catch (e) {
                    console.warn('Não foi possível buscar profile_slug:', e);
                    // Não bloquear o fluxo se falhar
                }
            }

            // Preencher formulário
            populateForm(currentSalesPage, itemData);

            // Atualizar título da página
            if (pageTitle) {
                pageTitle.textContent = `Editar: ${currentSalesPage.store_title || 'Página de Vendas'}`;
            }

            // Status sempre será PUBLISHED - não precisa mais atualizar dropdown
        } else {
            // Criar página inicial se não existir
            console.log('Sales page data inválida, criando página inicial...');
            await createInitialSalesPage(itemData);
        }
    }

    /**
     * Criar página inicial se não existir
     */
    async function createInitialSalesPage(itemData) {
        try {
            const response = await safeFetch(`${API_URL}/api/v1/sales-pages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    profile_item_id: currentItemId,
                    store_title: itemData.title || 'Minha Loja',
                    button_text: itemData.title || 'Página de Vendas',
                    button_logo_url: itemData.image_url || null,
                    whatsapp_number: '', // String vazia permitida na criação inicial
                    status: 'PUBLISHED' // Sempre publicar automaticamente
                })
            });

            if (response.ok) {
                const data = await response.json();
                currentSalesPage = data.data;
                window.SALES_PAGE_EDIT_DATA.salesPageId = currentSalesPage.id;
                
                // Notificar que o salesPageId está disponível para carregar contagem de produtos
                if (window.DashboardProducts && typeof window.DashboardProducts.loadProductsCount === 'function') {
                    console.log('SalesPageId disponível (criação), carregando contagem de produtos...');
                    window.DashboardProducts.loadProductsCount();
                }
                
                populateForm(currentSalesPage, itemData);
            }
        } catch (error) {
            console.error('Erro ao criar página inicial:', error);
        }
    }

    /**
     * Preencher formulário com dados
     */
    function populateForm(salesPage, itemData) {
        // Informações da loja
        setValue('store-title', salesPage.store_title);
        setValue('store-description', salesPage.store_description || '');

        // Personalização visual
        setValue('theme-select', salesPage.theme || 'dark');
        setValue('background-color', salesPage.background_color || '#0D0D0F');
        setValue('background-color-text', salesPage.background_color || '#0D0D0F');
        setValue('text-color', salesPage.text_color || '#ECECEC');
        setValue('text-color-text', salesPage.text_color || '#ECECEC');
        setValue('button-color', salesPage.button_color || '#FFC700');
        setValue('button-color-text', salesPage.button_color || '#FFC700');
        setValue('background-image-url', salesPage.background_image_url || '');
        if (salesPage.background_image_url) {
            updateImagePreview('background-image-preview', salesPage.background_image_url);
        }

        // Botão do módulo (usar title e image_url do profile_item)
        setValue('button-text', itemData.title || salesPage.button_text || '');
        setValue('button-logo-url', itemData.image_url || salesPage.button_logo_url || '');
        const logoSize = itemData.logo_size || 24;
        setValue('button-logo-size', logoSize);
        const logoSizeSlider = document.getElementById('button-logo-size-slider');
        const logoSizeValue = document.getElementById('logo-size-value');
        if (logoSizeSlider) logoSizeSlider.value = logoSize;
        if (logoSizeValue) logoSizeValue.textContent = logoSize;
        
        // Mostrar/ocultar campo de tamanho da logo
        const logoSizeGroup = document.getElementById('logo-size-group');
        if (logoSizeGroup) {
            if (itemData.image_url || salesPage.button_logo_url) {
                logoSizeGroup.style.display = 'block';
            } else {
                logoSizeGroup.style.display = 'none';
            }
        }
        
        if (itemData.image_url || salesPage.button_logo_url) {
            updateImagePreview('logo-preview', itemData.image_url || salesPage.button_logo_url);
        }

        // Formato no cartão (botão ou banner)
        const cardFormatButton = document.getElementById('card-format-button');
        const cardFormatBanner = document.getElementById('card-format-banner');
        const cardBannerGroup = document.getElementById('card-banner-image-group');
        const cardDisplayFormat = (salesPage.display_format || 'button').toString().toLowerCase();
        if (cardFormatButton && cardFormatBanner) {
            cardFormatButton.checked = (cardDisplayFormat !== 'banner');
            cardFormatBanner.checked = (cardDisplayFormat === 'banner');
        }
        setValue('card-banner-image-url', salesPage.card_banner_image_url || '');
        if (salesPage.card_banner_image_url) {
            updateImagePreview('card-banner-preview', salesPage.card_banner_image_url);
        }
        if (cardBannerGroup) {
            cardBannerGroup.style.display = (cardDisplayFormat === 'banner') ? 'block' : 'none';
        }

        // WhatsApp
        setValue('whatsapp-number', salesPage.whatsapp_number || '');

        // SEO
        setValue('meta-title', salesPage.meta_title || '');
        setValue('meta-description', salesPage.meta_description || '');
        setValue('meta-image-url', salesPage.meta_image_url || '');
        if (salesPage.meta_image_url) {
            updateImagePreview('meta-image-preview', salesPage.meta_image_url);
        }

        // Status sempre será PUBLISHED - não precisa mais do dropdown
    }

    /**
     * Definir valor de um campo
     */
    function setValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value || '';
        }
    }

    /**
     * Atualizar preview de imagem
     */
    function updateImagePreview(containerId, imageUrl) {
        const container = document.getElementById(containerId);
        if (container && imageUrl) {
            container.innerHTML = `<img src="${imageUrl}" alt="Preview" onerror="this.style.display='none'">`;
        }
    }

    // Funções de status removidas - sempre será PUBLISHED

    /**
     * Salvar todas as alterações
     */
    async function saveAllChanges() {
        if (!currentSalesPage) {
            alert('Erro: Dados da página não carregados.');
            return;
        }

        // Sempre publicar automaticamente - não precisa mais verificar status

        const btnSave = document.getElementById('btn-save-all');
        if (!btnSave) return;

        try {
            btnSave.disabled = true;
            btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

            // Coletar dados do formulário - CAPTURAR TODOS OS CAMPOS
            // Verificar se os elementos existem antes de capturar
            const storeTitleEl = document.getElementById('store-title');
            const storeDescriptionEl = document.getElementById('store-description');
            const themeSelectEl = document.getElementById('theme-select');
            const backgroundColorTextEl = document.getElementById('background-color-text');
            const textColorTextEl = document.getElementById('text-color-text');
            const buttonColorTextEl = document.getElementById('button-color-text');
            const backgroundImageUrlEl = document.getElementById('background-image-url');
            const whatsappNumberEl = document.getElementById('whatsapp-number');
            const metaTitleEl = document.getElementById('meta-title');
            const metaDescriptionEl = document.getElementById('meta-description');
            const metaImageUrlEl = document.getElementById('meta-image-url');
            
            console.log('Verificando elementos do formulário:', {
                storeTitleEl: !!storeTitleEl,
                storeDescriptionEl: !!storeDescriptionEl,
                themeSelectEl: !!themeSelectEl,
                backgroundColorTextEl: !!backgroundColorTextEl,
                textColorTextEl: !!textColorTextEl,
                buttonColorTextEl: !!buttonColorTextEl,
                backgroundImageUrlEl: !!backgroundImageUrlEl,
                whatsappNumberEl: !!whatsappNumberEl,
                metaTitleEl: !!metaTitleEl,
                metaDescriptionEl: !!metaDescriptionEl,
                metaImageUrlEl: !!metaImageUrlEl
            });
            
            const cardFormatRadio = document.querySelector('input[name="card-display-format"]:checked');
            const cardBannerUrlEl = document.getElementById('card-banner-image-url');
            const formData = {
                store_title: storeTitleEl?.value?.trim() || '',
                store_description: storeDescriptionEl?.value?.trim() || '',
                theme: themeSelectEl?.value || 'dark',
                background_color: backgroundColorTextEl?.value?.trim() || '',
                text_color: textColorTextEl?.value?.trim() || '',
                button_color: buttonColorTextEl?.value?.trim() || '',
                button_text_color: document.getElementById('button-text-color-text')?.value?.trim() || document.getElementById('button-text-color')?.value?.trim() || '',
                background_image_url: backgroundImageUrlEl?.value?.trim() || '',
                whatsapp_number: whatsappNumberEl?.value?.trim() || '',
                meta_title: metaTitleEl?.value?.trim() || '',
                meta_description: metaDescriptionEl?.value?.trim() || '',
                meta_image_url: metaImageUrlEl?.value?.trim() || '',
                display_format: (cardFormatRadio && cardFormatRadio.value === 'banner') ? 'banner' : 'button',
                card_banner_image_url: (cardBannerUrlEl && cardBannerUrlEl.value && cardFormatRadio && cardFormatRadio.value === 'banner') ? cardBannerUrlEl.value.trim() : null,
                // Sempre publicar automaticamente
                status: 'PUBLISHED'
            };
            
            console.log('"< Dados capturados do formulário (VALORES REAIS):', {
                store_title: formData.store_title,
                store_description: formData.store_description,
                theme: formData.theme,
                background_color: formData.background_color,
                text_color: formData.text_color,
                button_color: formData.button_color,
                button_text_color: formData.button_text_color,
                background_image_url: formData.background_image_url,
                whatsapp_number: formData.whatsapp_number,
                meta_title: formData.meta_title,
                meta_description: formData.meta_description,
                meta_image_url: formData.meta_image_url,
                status: formData.status
            });
            
            // Verificar valores brutos dos elementos
            console.log('Valores brutos dos elementos:', {
                'store-title': storeTitleEl?.value,
                'store-description': storeDescriptionEl?.value,
                'theme-select': themeSelectEl?.value,
                'background-color-text': backgroundColorTextEl?.value,
                'text-color-text': textColorTextEl?.value,
                'button-color-text': buttonColorTextEl?.value,
                'background-image-url': backgroundImageUrlEl?.value,
                'whatsapp-number': whatsappNumberEl?.value,
                'meta-title': metaTitleEl?.value,
                'meta-description': metaDescriptionEl?.value,
                'meta-image-url': metaImageUrlEl?.value
            });
            
            // Validar campos obrigatórios antes de enviar
            if (!formData.store_title || formData.store_title.trim().length < 2) {
                alert('O título da loja é obrigatório e deve ter pelo menos 2 caracteres.');
                btnSave.disabled = false;
                btnSave.innerHTML = '<i class="fas fa-save"></i> Salvar';
                return;
            }
            
            if (!formData.whatsapp_number || formData.whatsapp_number.trim() === '') {
                alert('O número do WhatsApp é obrigatório.');
                btnSave.disabled = false;
                btnSave.innerHTML = '<i class="fas fa-save"></i> Salvar';
                return;
            }

            // SIMPLIFICADO: Salvar diretamente no servidor (como os outros módulos)
            // O status será mantido como está (DRAFT, PUBLISHED, etc)
            console.log('Salvando alterações no servidor...');
            
            // Salvar dados do botão (profile_item)
            const logoSizeInput = document.getElementById('button-logo-size');
            const logoSize = logoSizeInput ? parseInt(logoSizeInput.value) || 24 : 24;
            
            const buttonData = {
                title: document.getElementById('button-text').value,
                image_url: document.getElementById('button-logo-url').value || null,
                logo_size: logoSize
            };

            // Salvar sales_page diretamente no servidor
            // O safeFetch já adiciona o token automaticamente
            console.log('Enviando dados para salvar:', formData);
            const salesPageResponse = await safeFetch(`${API_URL}/api/v1/sales-pages/${currentSalesPage.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!salesPageResponse.ok) {
                let errorMessage = `Erro ${salesPageResponse.status}: ${salesPageResponse.statusText}`;
                try {
                    const errorData = await salesPageResponse.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                    if (typeof errorMessage === 'object') {
                        errorMessage = JSON.stringify(errorMessage);
                    }
                } catch (e) {
                    // Se não conseguir parsear JSON, usar mensagem padrão
                }
                throw new Error(errorMessage);
            }

            // Salvar dados do botão (profile_item)
            // O safeFetch já adiciona o token automaticamente
            console.log('Enviando dados do botão para salvar:', buttonData);
            const itemResponse = await safeFetch(`${API_URL}/api/profile/items/${currentItemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(buttonData)
            });

            if (!itemResponse.ok) {
                let errorMessage = `Erro ${itemResponse.status}: ${itemResponse.statusText}`;
                try {
                    const errorData = await itemResponse.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                    if (typeof errorMessage === 'object') {
                        errorMessage = JSON.stringify(errorMessage);
                    }
                } catch (e) {
                    // Se não conseguir parsear JSON, usar mensagem padrão
                }
                throw new Error(errorMessage);
            }

            // Atualizar dados locais após salvar
            const updatedData = await salesPageResponse.json();
            if (updatedData.data) {
                currentSalesPage = updatedData.data;
            } else {
                Object.assign(currentSalesPage, formData);
            }
            
            console.log('Alterações salvas com sucesso no servidor!');

            // Mostrar sucesso
            btnSave.innerHTML = '<i class="fas fa-check"></i> Salvo!';
            
            setTimeout(() => {
                btnSave.innerHTML = '<i class="fas fa-save"></i> Salvar';
                btnSave.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Erro ao salvar:', error);
            const errorMsg = error.message || 'Erro desconhecido ao salvar alterações';
            alert(`Erro ao salvar alterações: ${errorMsg}`);
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="fas fa-save"></i> Salvar';
        }
    }

    /**
     * Lidar com mudança de status - REMOVIDO: sempre será PUBLISHED
     */
    async function handleStatusChange(event) {
        // Função removida - status sempre será PUBLISHED automaticamente
        return;
        // Prevenir múltiplas execuções simultâneas
        if (statusSelect.disabled) {
            console.log('Dropdown desabilitado, ignorando mudança...');
            return;
        }

        if (!currentSalesPage || !currentSalesPage.id) {
            alert('Erro: Dados da página não carregados. Aguarde o carregamento completo.');
            // Reverter seleção
            if (currentSalesPage) {
                statusSelect.value = currentSalesPage.status || 'DRAFT';
            }
            return;
        }

        // Ler o valor do dropdown - tentar múltiplas fontes para garantir que pegamos o valor correto
        let newStatus = '';
        
        // 1. Tentar do evento primeiro (mais confiável)
        if (event?.target?.value) {
            newStatus = event.target.value.toUpperCase();
        }
        // 2. Tentar do índice selecionado
        else if (statusSelect?.selectedIndex !== undefined && statusSelect?.options[statusSelect.selectedIndex]?.value) {
            newStatus = statusSelect.options[statusSelect.selectedIndex].value.toUpperCase();
        }
        // 3. Fallback para o valor do elemento
        else if (statusSelect?.value) {
            newStatus = statusSelect.value.toUpperCase();
        }
        
        // Validar que temos um status válido
        if (!newStatus || !['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED'].includes(newStatus)) {
            console.error('O Status inválido ou não encontrado:', { 
                newStatus, 
                eventValue: event?.target?.value,
                dropdownValue: statusSelect?.value,
                selectedIndex: statusSelect?.selectedIndex
            });
            statusSelect.value = currentSalesPage.status || 'DRAFT';
            return;
        }
        
        // Usar o status atual do objeto - IMPORTANTE: ler ANTES de qualquer modificação
        // O status do objeto é a fonte de verdade (vem do servidor)
        let oldStatus = (currentSalesPage.status || 'DRAFT').toUpperCase();
        
        // Verificar o valor atual do dropdown ANTES da mudança do usuário
        // Se o dropdown mostra ARCHIVED mas o objeto mostra DRAFT, há dessincronização
        // Neste caso, vamos confiar no dropdown (que reflete o que o usuário vê)
        const dropdownCurrentValue = statusSelect?.value?.toUpperCase() || '';
        
        console.log('Status antes da validação:', {
            oldStatusFromObject: oldStatus,
            dropdownCurrentValue: dropdownCurrentValue,
            newStatusSelected: newStatus,
            currentSalesPageStatus: currentSalesPage.status,
            currentSalesPageId: currentSalesPage.id
        });
        
        // CORREÇÃO?fO CRÍTICA: Se o dropdown mostra ARCHIVED mas o objeto mostra DRAFT,
        // significa que o objeto foi atualizado incorretamente. Vamos usar o dropdown.
        // Isso acontece quando o usuário está tentando mudar de ARCHIVED para DRAFT
        // mas o objeto já foi alterado para DRAFT incorretamente em algum lugar
        if (dropdownCurrentValue === 'ARCHIVED' && oldStatus === 'DRAFT' && newStatus === 'DRAFT') {
            console.log('CORREÇÃO?fO: Dropdown mostra ARCHIVED mas objeto mostra DRAFT. Corrigindo...');
            oldStatus = 'ARCHIVED';
            currentSalesPage.status = 'ARCHIVED';
            console.log('Status corrigido para ARCHIVED');
        }
        
        // IMPORTANTE: NÃO atualizar o status do objeto antes de fazer a requisição
        // O oldStatus deve refletir o estado REAL no servidor
        
        console.log('"" Tentando mudar status:', { 
            oldStatus, 
            newStatus, 
            currentSalesPageStatus: currentSalesPage.status,
            dropdownValue: statusSelect?.value,
            eventTargetValue: event?.target?.value,
            selectedIndex: statusSelect?.selectedIndex,
            selectedOptionText: statusSelect?.options[statusSelect?.selectedIndex]?.text
        });
        
        // Garantir que estamos usando o valor correto do dropdown
        // Se o evento não tem valor, usar o índice selecionado
        if (!newStatus || newStatus === oldStatus) {
            const selectedOption = statusSelect.options[statusSelect.selectedIndex];
            if (selectedOption && selectedOption.value) {
                const actualNewStatus = selectedOption.value.toUpperCase();
                if (actualNewStatus !== newStatus) {
                    console.log('Corrigindo valor do status:', { newStatus, actualNewStatus });
                    // Não fazer nada aqui, apenas logar - o newStatus já foi definido acima
                }
            }
        }
        
        // Se não mudou, não fazer nada
        if (newStatus === oldStatus) {
            console.log('Status não mudou, ignorando...');
            return;
        }

        // Validar transição permitida no frontend antes de fazer requisição
        const allowedTransitions = {
            'DRAFT': ['PUBLISHED', 'ARCHIVED'],
            'PUBLISHED': ['PAUSED', 'DRAFT', 'ARCHIVED'],
            'PAUSED': ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
            'ARCHIVED': ['DRAFT'] // Só pode desarquivar voltando para DRAFT
        };

        const transitions = allowedTransitions[oldStatus] || [];
        if (!transitions.includes(newStatus)) {
            let errorMessage = `Não é possível transicionar de ${getStatusLabel(oldStatus)} para ${getStatusLabel(newStatus)}.`;
            if (oldStatus === 'ARCHIVED' && newStatus === 'PUBLISHED') {
                errorMessage += '\n\nPara publicar uma página arquivada, primeiro altere o status para "Rascunho" e depois para "Publicado".';
            } else {
                errorMessage += `\n\nTransições permitidas: ${transitions.map(t => getStatusLabel(t)).join(', ')}`;
            }
            console.error('O Transição inválida:', { 
                oldStatus, 
                newStatus, 
                allowedTransitions: transitions,
                currentSalesPageStatus: currentSalesPage.status
            });
            alert(errorMessage);
            statusSelect.value = oldStatus; // Reverter seleção
            return;
        }
        
        console.log('Transição válida, prosseguindo...');

        const statusActions = {
            'PUBLISHED': 'publish',
            'PAUSED': 'pause',
            'ARCHIVED': 'archive'
        };

        // Para DRAFT, atualizar via PUT
        if (newStatus === 'DRAFT') {
            try {
                statusSelect.disabled = true;
                
                const response = await safeFetch(`${API_URL}/api/v1/sales-pages/${currentSalesPage.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        status: 'DRAFT'
                    })
                });

                if (!response.ok) {
                    let errorMessage = `Erro ${response.status}: ${response.statusText}`;
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorData.message || errorMessage;
                        if (typeof errorMessage === 'object') {
                            errorMessage = JSON.stringify(errorMessage);
                        }
                    } catch (e) {
                        // Se não conseguir parsear JSON, usar mensagem padrão
                    }
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                if (data.success && data.data) {
                    // Atualizar objeto completo primeiro para garantir sincronização
                    currentSalesPage = data.data;
                    // Garantir que o status está correto
                    currentSalesPage.status = data.data.status || 'DRAFT';
                    console.log('Status alterado para Rascunho');
                    console.log('"S Status atualizado no objeto:', currentSalesPage.status);
                    // Garantir que o dropdown está sincronizado com o status atual
                    if (statusSelect.value !== 'DRAFT') {
                        statusSelect.value = 'DRAFT';
                    }
                    // Atualizar opções do dropdown após desarquivar
                    updateStatusOptions('DRAFT');
                    updateSaveButtonState(); // Atualizar estado do botão salvar
                    // Não mostrar alerta aqui para não interromper o fluxo - o usuário pode querer publicar logo em seguida
                } else {
                    const errorMsg = data.error || data.message || 'Erro ao alterar status';
                    throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
                }
            } catch (error) {
                console.error('Erro ao alterar status:', error);
                const errorMsg = error.message || 'Erro desconhecido ao alterar status';
                alert(`Erro ao alterar status: ${errorMsg}`);
                statusSelect.value = oldStatus;
            } finally {
                statusSelect.disabled = false;
            }
        } else {
            // Para outros status, usar ações específicas
            const action = statusActions[newStatus];
            if (!action) {
                console.warn('Ação não encontrada para status:', newStatus);
                statusSelect.value = oldStatus;
                return;
            }

            try {
                statusSelect.disabled = true;
                
                const response = await safeFetch(`${API_URL}/api/v1/sales-pages/${currentSalesPage.id}/${action}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    let errorMessage = `Erro ${response.status}: ${response.statusText}`;
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorData.message || errorMessage;
                        if (typeof errorMessage === 'object') {
                            errorMessage = JSON.stringify(errorMessage);
                        }
                    } catch (e) {
                        // Se não conseguir parsear JSON, usar mensagem padrão
                    }
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                if (data.success && data.data) {
                    // Atualizar status local com dados completos do servidor
                    const updatedStatus = data.data.status || newStatus;
                    currentSalesPage.status = updatedStatus;
                    currentSalesPage = data.data; // Atualizar objeto completo para garantir sincronização
                    const statusText = statusSelect.options[statusSelect.selectedIndex].text;
                    console.log(`Status alterado para ${statusText}`);
                    // Atualizar opções do dropdown após mudança de status
                    updateStatusOptions(updatedStatus);
                    updateSaveButtonState(); // Atualizar estado do botão salvar
                    
                    // Mensagem de sucesso específica para publicação
                    if (updatedStatus === 'PUBLISHED') {
                        alert('Página publicada com sucesso! Ela agora está visível publicamente.');
                    }
                } else {
                    const errorMsg = data.error || data.message || 'Erro ao alterar status';
                    throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
                }
            } catch (error) {
                console.error('Erro ao alterar status:', error);
                const errorMsg = error.message || 'Erro desconhecido ao alterar status';
                alert(`Erro ao alterar status: ${errorMsg}`);
                statusSelect.value = oldStatus;
            } finally {
                statusSelect.disabled = false;
            }
        }
    }

    /**
     * Configurar upload de imagem de fundo
     */
    function setupBackgroundImageUpload() {
        const uploadBtn = document.getElementById('btn-upload-background-image');
        const imageUrlInput = document.getElementById('background-image-url');
        const preview = document.getElementById('background-image-preview');

        if (uploadBtn) {
            uploadBtn.addEventListener('click', async () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > UPLOAD_MAX_BYTES) {
                        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
                        alert('O tamanho máximo permitido é ' + UPLOAD_MAX_MB + ' MB. Sua imagem tem ' + sizeMB + ' MB. Redimensione ou escolha outra imagem.');
                        return;
                    }

                    try {
                        uploadBtn.disabled = true;
                        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

                        const token = localStorage.getItem('conectaKingToken') || localStorage.getItem('token');
                        const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (!authResponse.ok) {
                            throw new Error('Erro ao obter URL de upload');
                        }

                        const { uploadURL } = await authResponse.json();
                        const formData = new FormData();
                        const isPNG = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
                        const fileName = isPNG ? 'background.png' : 'background.jpg';
                        formData.append('file', file, fileName);

                        const uploadResponse = await fetch(uploadURL, {
                            method: 'POST',
                            body: formData,
                            headers: token ? { 'Authorization': 'Bearer ' + token } : {}
                        });

                        if (!uploadResponse.ok) {
                            const errBody = await uploadResponse.json().catch(() => ({}));
                            throw new Error(errBody.message || 'Falha no upload');
                        }

                        const uploadData = await uploadResponse.json();
                        const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";
                        const finalUrl = uploadData.url || uploadData.imageUrl ||
                            (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : null);
                        if (!finalUrl) throw new Error('Resposta do upload sem URL da imagem.');

                        if (imageUrlInput) {
                            imageUrlInput.value = finalUrl;
                        }
                        updateImagePreview('background-image-preview', finalUrl);

                        uploadBtn.disabled = false;
                        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Fazer Upload da Imagem';

                    } catch (error) {
                        console.error('Erro no upload:', error);
                        alert(error.message || 'Erro ao fazer upload da imagem. Tente novamente.');
                        uploadBtn.disabled = false;
                        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Fazer Upload da Imagem';
                    }
                };
                input.click();
            });
        }
    }

    /**
     * Configurar upload de meta imagem
     */
    function setupMetaImageUpload() {
        const uploadBtn = document.getElementById('btn-upload-meta-image');
        const imageUrlInput = document.getElementById('meta-image-url');
        const preview = document.getElementById('meta-image-preview');

        if (uploadBtn) {
            uploadBtn.addEventListener('click', async () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > UPLOAD_MAX_BYTES) {
                        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
                        alert('O tamanho máximo permitido é ' + UPLOAD_MAX_MB + ' MB. Sua imagem tem ' + sizeMB + ' MB. Redimensione ou escolha outra imagem.');
                        return;
                    }

                    try {
                        uploadBtn.disabled = true;
                        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

                        const token = localStorage.getItem('conectaKingToken') || localStorage.getItem('token');
                        const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (!authResponse.ok) {
                            throw new Error('Erro ao obter URL de upload');
                        }

                        const { uploadURL } = await authResponse.json();
                        const formData = new FormData();
                        const isPNG = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
                        const fileName = isPNG ? 'meta-image.png' : 'meta-image.jpg';
                        formData.append('file', file, fileName);

                        const uploadResponse = await fetch(uploadURL, {
                            method: 'POST',
                            body: formData,
                            headers: token ? { 'Authorization': 'Bearer ' + token } : {}
                        });

                        if (!uploadResponse.ok) {
                            const errBody = await uploadResponse.json().catch(() => ({}));
                            throw new Error(errBody.message || 'Falha no upload');
                        }

                        const uploadData = await uploadResponse.json();
                        const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";
                        const finalUrl = uploadData.url || uploadData.imageUrl ||
                            (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : null);
                        if (!finalUrl) throw new Error('Resposta do upload sem URL da imagem.');

                        if (imageUrlInput) {
                            imageUrlInput.value = finalUrl;
                        }
                        updateImagePreview('meta-image-preview', finalUrl);

                        uploadBtn.disabled = false;
                        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Fazer Upload da Imagem';

                    } catch (error) {
                        console.error('Erro no upload:', error);
                        alert(error.message || 'Erro ao fazer upload da imagem. Tente novamente.');
                        uploadBtn.disabled = false;
                        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Fazer Upload da Imagem';
                    }
                };
                input.click();
            });
        }
    }

    /**
     * Mostrar/ocultar grupo da imagem do banner conforme o formato no cartão
     */
    function setupCardDisplayFormatListeners() {
        const cardBannerGroup = document.getElementById('card-banner-image-group');
        const radios = document.querySelectorAll('input[name="card-display-format"]');
        if (!cardBannerGroup || !radios.length) return;
        function toggle() {
            const bannerChecked = document.querySelector('input[name="card-display-format"][value="banner"]')?.checked;
            cardBannerGroup.style.display = bannerChecked ? 'block' : 'none';
        }
        radios.forEach(r => r.addEventListener('change', toggle));
        toggle();
    }

    /**
     * Configurar upload da imagem do banner (formato no cartão)
     */
    function setupCardBannerUpload() {
        const uploadBtn = document.getElementById('btn-upload-card-banner');
        const imageUrlInput = document.getElementById('card-banner-image-url');
        const previewId = 'card-banner-preview';

        if (uploadBtn) {
            uploadBtn.addEventListener('click', async () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > UPLOAD_MAX_BYTES) {
                        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
                        alert('O tamanho máximo permitido é ' + UPLOAD_MAX_MB + ' MB. Sua imagem tem ' + sizeMB + ' MB. Redimensione ou escolha outra imagem.');
                        return;
                    }

                    try {
                        uploadBtn.disabled = true;
                        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

                        const token = localStorage.getItem('conectaKingToken') || localStorage.getItem('token');
                        const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (!authResponse.ok) {
                            throw new Error('Erro ao obter URL de upload');
                        }

                        const { uploadURL } = await authResponse.json();
                        const formData = new FormData();
                        const isPNG = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
                        const fileName = isPNG ? 'card-banner.png' : 'card-banner.jpg';
                        formData.append('file', file, fileName);

                        const uploadResponse = await fetch(uploadURL, {
                            method: 'POST',
                            body: formData,
                            headers: token ? { 'Authorization': 'Bearer ' + token } : {}
                        });

                        if (!uploadResponse.ok) {
                            const errBody = await uploadResponse.json().catch(() => ({}));
                            throw new Error(errBody.message || 'Falha no upload');
                        }

                        const uploadData = await uploadResponse.json();
                        const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";
                        const finalUrl = uploadData.url || uploadData.imageUrl ||
                            (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : null);
                        if (!finalUrl) throw new Error('Resposta do upload sem URL da imagem.');

                        if (imageUrlInput) {
                            imageUrlInput.value = finalUrl;
                        }
                        updateImagePreview(previewId, finalUrl);

                        uploadBtn.disabled = false;
                        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Fazer Upload da Imagem';

                    } catch (error) {
                        console.error('Erro no upload:', error);
                        alert(error.message || 'Erro ao fazer upload da imagem. Tente novamente.');
                        uploadBtn.disabled = false;
                        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Fazer Upload da Imagem';
                    }
                };
                input.click();
            });
        }
    }

    /**
     * Buscar sugestões do backend
     */
    async function fetchSuggestionsFromBackend(type, prompt, context = {}) {
        try {
            const response = await safeFetch(`${API_URL}/api/suggestions/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: type,
                    prompt: prompt,
                    context: context
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.suggestions && data.suggestions.length > 0) {
                    return data.suggestions;
                }
            } else if (response.status === 404) {
                // Endpoint não encontrado - servidor precisa ser reiniciado
                console.log('Endpoint de sugestões não encontrado. Usando sugestões locais. (Servidor precisa ser reiniciado)');
            }
        } catch (error) {
            // Erro de rede ou outro erro - usar sugestões locais silenciosamente
            console.log('Usando sugestões locais (backend não disponível)');
        }
        
        // Fallback: usar sugestões locais
        return null;
    }

    /**
     * Configurar sugestões de texto
     */
    function setupTextSuggestions() {
        // Sugestão para descrição da loja
        const btnStoreDescription = document.getElementById('btn-store-description-suggestions');
        const btnMoreStoreDescription = document.getElementById('btn-more-store-description');
        let storeDescriptionSuggestions = [];
        let storeDescriptionIndex = 0;
        
        if (btnStoreDescription) {
            btnStoreDescription.addEventListener('click', async () => {
                window.SuggestionModal.show({
                    title: 'Gerar Descrição da Loja',
                    message: 'Digite algumas palavras sobre sua loja para gerar uma descrição completa:',
                    placeholder: 'Ex: minha loja de roupas, loja de produtos eletrônicos',
                    onConfirm: async (prompt) => {
                        const storeTitle = document.getElementById('store-title')?.value || '';
                        // Tentar buscar do backend primeiro
                        const backendSuggestions = await fetchSuggestionsFromBackend('store_description', prompt, { storeTitle });
                        if (backendSuggestions) {
                            storeDescriptionSuggestions = backendSuggestions;
                        } else {
                            storeDescriptionSuggestions = [window.TextSuggestions.generateStoreDescription(prompt)];
                        }
                        storeDescriptionIndex = 0;
                        const textarea = document.getElementById('store-description');
                        if (textarea && storeDescriptionSuggestions.length > 0) {
                            textarea.value = storeDescriptionSuggestions[0];
                            if (storeDescriptionSuggestions.length > 1 && btnMoreStoreDescription) {
                                btnMoreStoreDescription.style.display = 'inline-flex';
                            }
                        }
                    }
                });
            });
        }
        
        if (btnMoreStoreDescription) {
            btnMoreStoreDescription.addEventListener('click', () => {
                if (storeDescriptionSuggestions.length > 0) {
                    storeDescriptionIndex = (storeDescriptionIndex + 1) % storeDescriptionSuggestions.length;
                    const textarea = document.getElementById('store-description');
                    if (textarea) {
                        textarea.value = storeDescriptionSuggestions[storeDescriptionIndex];
                    }
                }
            });
        }

        // Sugestão para meta título
        const btnMetaTitle = document.getElementById('btn-meta-title-suggestions');
        const btnMoreMetaTitle = document.getElementById('btn-more-meta-title');
        let metaTitleSuggestions = [];
        let metaTitleIndex = 0;
        
        if (btnMetaTitle) {
            btnMetaTitle.addEventListener('click', async () => {
                const storeTitle = document.getElementById('store-title')?.value || '';
                window.SuggestionModal.show({
                    title: 'Gerar Meta Título',
                    message: 'Digite algumas palavras para criar um título otimizado para compartilhamento:',
                    placeholder: 'Ex: loja de qualidade, melhores ofertas',
                    defaultValue: storeTitle,
                    onConfirm: async (prompt) => {
                        const backendSuggestions = await fetchSuggestionsFromBackend('meta_title', prompt, { storeTitle });
                        if (backendSuggestions) {
                            metaTitleSuggestions = backendSuggestions;
                        } else {
                            metaTitleSuggestions = [window.TextSuggestions.generateMetaTitle(prompt, storeTitle)];
                        }
                        metaTitleIndex = 0;
                        const input = document.getElementById('meta-title');
                        if (input && metaTitleSuggestions.length > 0) {
                            input.value = metaTitleSuggestions[0];
                            if (metaTitleSuggestions.length > 1 && btnMoreMetaTitle) {
                                btnMoreMetaTitle.style.display = 'inline-flex';
                            }
                        }
                    }
                });
            });
        }
        
        if (btnMoreMetaTitle) {
            btnMoreMetaTitle.addEventListener('click', () => {
                if (metaTitleSuggestions.length > 0) {
                    metaTitleIndex = (metaTitleIndex + 1) % metaTitleSuggestions.length;
                    const input = document.getElementById('meta-title');
                    if (input) {
                        input.value = metaTitleSuggestions[metaTitleIndex];
                    }
                }
            });
        }

        // Sugestão para meta descrição
        const btnMetaDescription = document.getElementById('btn-meta-description-suggestions');
        const btnMoreMetaDescription = document.getElementById('btn-more-meta-description');
        let metaDescriptionSuggestions = [];
        let metaDescriptionIndex = 0;
        
        if (btnMetaDescription) {
            btnMetaDescription.addEventListener('click', async () => {
                const storeTitle = document.getElementById('store-title')?.value || '';
                window.SuggestionModal.show({
                    title: 'Gerar Meta Descrição',
                    message: 'Digite algumas palavras para criar uma descrição para compartilhamento:',
                    placeholder: 'Ex: produtos de qualidade, melhores preços',
                    onConfirm: async (prompt) => {
                        const backendSuggestions = await fetchSuggestionsFromBackend('meta_description', prompt, { storeTitle });
                        if (backendSuggestions) {
                            metaDescriptionSuggestions = backendSuggestions;
                        } else {
                            metaDescriptionSuggestions = [window.TextSuggestions.generateMetaDescription(prompt, storeTitle)];
                        }
                        metaDescriptionIndex = 0;
                        const textarea = document.getElementById('meta-description');
                        if (textarea && metaDescriptionSuggestions.length > 0) {
                            textarea.value = metaDescriptionSuggestions[0];
                            if (metaDescriptionSuggestions.length > 1 && btnMoreMetaDescription) {
                                btnMoreMetaDescription.style.display = 'inline-flex';
                            }
                        }
                    }
                });
            });
        }
        
        if (btnMoreMetaDescription) {
            btnMoreMetaDescription.addEventListener('click', () => {
                if (metaDescriptionSuggestions.length > 0) {
                    metaDescriptionIndex = (metaDescriptionIndex + 1) % metaDescriptionSuggestions.length;
                    const textarea = document.getElementById('meta-description');
                    if (textarea) {
                        textarea.value = metaDescriptionSuggestions[metaDescriptionIndex];
                    }
                }
            });
        }
    }

    // Inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exportar funções globais
    window.SalesPageEdit = {
        switchTab,
        loadSalesPageData,
        getCurrentSalesPage: () => currentSalesPage,
        getCurrentItemId: () => currentItemId
    };

})();

