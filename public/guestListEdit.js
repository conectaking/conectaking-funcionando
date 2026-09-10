// guestListEdit.js - Gerenciamento de Lista de Convidados

const API_URL = String(window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');
let currentGuestListId = null;
let currentGuestList = null;
let guests = [];

// Obter token
function getToken() {
    return localStorage.getItem('conectaKingToken') || localStorage.getItem('token');
}

// Voltar para página anterior ou KingForms
function goBack() {
    // Se estiver vendo uma lista específica, voltar para a listagem
    const itemId = getItemIdFromUrl();
    const urlParams = new URLSearchParams(window.location.search);
    const formItemId = urlParams.get('formItemId');
    
    if (itemId) {
        // Se estiver na visualização de uma lista, voltar para a listagem
        window.location.href = '/guestListEdit' + (formItemId ? `?formItemId=${formItemId}` : '');
    } else if (formItemId) {
        // Se estiver na listagem e vier do formPageEdit, voltar para lá
        window.location.href = `/formPageEdit?itemId=${formItemId}`;
    } else {
        // Caso contrário, tentar usar history.back() ou ir para dashboard
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/dashboard';
        }
    }
}

// Alias para compatibilidade
function goBackToDashboard() {
    goBack();
}

// Obter itemId da URL
function getItemIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('itemId') || urlParams.get('id');
}

// Obter formItemId da URL (ID do formulário KingForms relacionado)
function getFormItemIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('formItemId');
}

// Função de inicialização principal
function initializeGuestList() {
    console.log('Y"" Inicializando página de lista de convidados...');
    const itemId = getItemIdFromUrl();
    console.log('Y"< ItemId da URL:', itemId);
    
    if (itemId) {
        console.log('Carregando lista específica:', itemId);
        loadGuestList().catch(error => {
            console.error('O Erro ao inicializar lista:', error);
        });
    } else {
        console.log('Y"< Carregando todas as listas');
        loadAllGuestLists().catch(error => {
            console.error('O Erro ao inicializar listas:', error);
        });
    }
}

// Inicializar quando o DOM estiver pronto ou se já estiver carregado
function initGuestList() {
    // Inicializar página (ocultar modais, etc)
    initGuestListPage();
    // Carregar dados
    initializeGuestList();
}

// Listener DOMContentLoaded consolidado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGuestList);
} else {
    // DOM já carregado, inicializar após um pequeno delay
    setTimeout(initGuestList, 100);
}

// Carregar todas as listas (quando não há itemId específico)
async function loadAllGuestLists() {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/guest-lists`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Erro ${response.status}: ${response.statusText}` }));
            throw new Error(errorData.message || `Erro ${response.status} ao carregar listas`);
        }
        
        const lists = await response.json();
        console.log('Listas carregadas:', lists.length, 'listas');
        renderAllLists(lists);
        
    } catch (error) {
        console.error('O Erro ao carregar listas:', error);
        console.error('Detalhes:', {
            message: error.message,
            stack: error.stack
        });
        const container = document.getElementById('main-container') || document.querySelector('.main-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: var(--text-dark, #A1A1A1);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; color: #FF9800;"></i>
                    <h4 style="color: var(--text, #ECECEC); margin-bottom: 12px;">Erro ao carregar listas</h4>
                    <p style="margin-bottom: 20px;">${error.message || 'Erro desconhecido'}</p>
                    <button onclick="window.location.reload()" style="padding: 12px 24px; background: #FFC700; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Tentar novamente
                    </button>
                </div>
            `;
        }
    }
}

// Renderizar todas as listas
function renderAllLists(lists) {
    const container = document.getElementById('main-container') || document.querySelector('.main-container');
    if (!container) return;
    
    const formItemId = getFormItemIdFromUrl();
    const shortDomain = window.location.hostname.includes('localhost') 
        ? window.location.origin 
        : 'https://tag.conectaking.com.br';
    
    // Calcular estatísticas gerais
    const generalStats = lists.reduce((acc, list) => {
        const registered = parseInt(list.registered_count || 0);
        const confirmed = parseInt(list.confirmed_count || 0);
        const checkedIn = parseInt(list.checked_in_count || 0);
        acc.total += registered + confirmed + checkedIn;
        acc.registered += registered;
        acc.confirmed += confirmed;
        acc.checked_in += checkedIn;
        return acc;
    }, { total: 0, registered: 0, confirmed: 0, checked_in: 0 });
    
    // Ocultar abas e conteúdo específico de lista
    const tabsContainer = document.querySelector('.tabs-container');
    const tabContents = document.querySelectorAll('.tab-content');
    if (tabsContainer) tabsContainer.style.display = 'none';
    tabContents.forEach(tab => tab.style.display = 'none');
    
    let html = `
        <div style="margin-bottom: 32px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="margin: 0; color: var(--text, #ECECEC); font-size: 28px;">
                    <i class="fas fa-users" style="color: var(--dourado-principal, #FFC700); margin-right: 12px;"></i>
                    Listas de Convidados
                </h2>
                <button id="btn-new-guest-list" class="btn btn-primary" onclick="createNewGuestList()">
                    <i class="fas fa-plus"></i> Nova Lista
                </button>
            </div>
            
            <!-- Estatísticas Gerais -->
            <div class="stats-cards">
                <div class="stat-card">
                    <div class="stat-label">Listas Criadas</div>
                    <div class="stat-value">${lists.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total de Convidados</div>
                    <div class="stat-value">${generalStats.total}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Confirmados</div>
                    <div class="stat-value" style="color: #4CAF50;">${generalStats.confirmed}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Conferidos</div>
                    <div class="stat-value" style="color: #2196F3;">${generalStats.checked_in}</div>
                </div>
            </div>
        </div>
    `;
    
    if (lists.length === 0) {
        html += `
            <div style="text-align: center; padding: 60px 20px; background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px;">
                <i class="fas fa-users" style="font-size: 64px; margin-bottom: 20px; opacity: 0.3; color: var(--dourado-principal, #FFC700);"></i>
                <h4 style="color: var(--text, #ECECEC); margin-bottom: 12px;">Nenhuma lista criada ainda</h4>
                <p style="color: var(--text-dark, #A1A1A1); margin-bottom: 24px;">Crie sua primeira lista de convidados para começar a gerenciar convidados, confirmações e presenças.</p>
                <button onclick="createNewGuestList()" class="btn btn-primary" style="display: inline-flex;">
                    <i class="fas fa-plus"></i> Criar Primeira Lista
                </button>
            </div>
        `;
    } else {
        // Adicionar busca na listagem
        html += `
            <div style="margin-bottom: 24px;">
                <div style="position: relative;">
                    <i class="fas fa-search" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-dark, #A1A1A1);"></i>
                    <input type="text" id="search-lists-input" placeholder="Buscar lista por nome, evento, localização..." 
                           style="width: 100%; padding: 12px 16px 12px 48px; background: var(--card-background-color, #1C1C21); border: 2px solid var(--border-color, #2C2C2F); border-radius: 12px; color: var(--text, #ECECEC); font-size: 14px; transition: all 0.3s;"
                           onfocus="this.style.borderColor='var(--dourado-principal, #FFC700)'; this.style.background='rgba(255,199,0,0.05)';"
                           onblur="this.style.borderColor='var(--border-color, #2C2C2F)'; this.style.background='var(--card-background-color, #1C1C21)';">
                </div>
            </div>
        `;
        
        html += '<div id="lists-grid" style="display: grid; gap: 20px;">';
        lists.forEach(list => {
            const registered = parseInt(list.registered_count || 0);
            const confirmed = parseInt(list.confirmed_count || 0);
            const checkedIn = parseInt(list.checked_in_count || 0);
            const total = registered + confirmed + checkedIn;
            const missing = Math.max(0, confirmed - checkedIn);
            const eventDate = list.event_date ? new Date(list.event_date).toLocaleDateString('pt-BR') : 'Não definido';
            
            html += `
                <div class="list-card" data-list-name="${(list.event_title || list.title || '').toLowerCase()}" data-list-location="${(list.event_location || '').toLowerCase()}" style="background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; padding: 24px; transition: all 0.3s;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 8px 0; color: var(--text, #ECECEC); font-size: 20px; display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-users" style="color: var(--dourado-principal, #FFC700);"></i>
                                ${list.event_title || list.title || 'Lista de Convidados'}
                            </h3>
                            <p style="color: var(--text-dark, #A1A1A1); margin: 4px 0; font-size: 14px;">
                                <i class="fas fa-calendar" style="margin-right: 6px;"></i> ${eventDate}
                            </p>
                            ${list.event_location ? `
                                <p style="color: var(--text-dark, #A1A1A1); margin: 4px 0; font-size: 14px;">
                                    <i class="fas fa-map-marker-alt" style="margin-right: 6px;"></i> ${list.event_location}
                                </p>
                            ` : ''}
                        </div>
                        <button onclick="window.location.href='/guestListEdit?itemId=${list.profile_item_id || list.id}${formItemId ? '&formItemId=' + formItemId : ''}'" class="btn btn-primary" style="padding: 10px 20px;">
                            <i class="fas fa-edit"></i> Gerenciar
                        </button>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 20px; padding: 16px; background: rgba(255,255,255,0.02); border-radius: 8px;">
                        <div style="text-align: center; padding: 12px; background: rgba(255,199,0,0.1); border-radius: 8px; border: 1px solid rgba(255,199,0,0.2);">
                            <div style="font-size: 24px; font-weight: 800; color: var(--dourado-principal, #FFC700);">${registered}</div>
                            <div style="font-size: 11px; color: var(--text-dark, #A1A1A1); margin-top: 4px; font-weight: 600;">Cadastrados</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: rgba(76,175,80,0.1); border-radius: 8px; border: 1px solid rgba(76,175,80,0.2);">
                            <div style="font-size: 24px; font-weight: 800; color: #4CAF50;">${confirmed}</div>
                            <div style="font-size: 11px; color: var(--text-dark, #A1A1A1); margin-top: 4px; font-weight: 600;">Confirmados</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: rgba(33,150,243,0.1); border-radius: 8px; border: 1px solid rgba(33,150,243,0.2);">
                            <div style="font-size: 24px; font-weight: 800; color: #2196F3;">${checkedIn}</div>
                            <div style="font-size: 11px; color: var(--text-dark, #A1A1A1); margin-top: 4px; font-weight: 600;">Conferidos</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: rgba(244,67,54,0.1); border-radius: 8px; border: 1px solid rgba(244,67,54,0.2);">
                            <div style="font-size: 24px; font-weight: 800; color: #F44336;">${missing}</div>
                            <div style="font-size: 11px; color: var(--text-dark, #A1A1A1); margin-top: 4px; font-weight: 600;">Faltam</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                            <div style="font-size: 24px; font-weight: 800; color: var(--dourado-principal, #FFC700);">${total}</div>
                            <div style="font-size: 11px; color: var(--text-dark, #A1A1A1); margin-top: 4px; font-weight: 600;">Total</div>
                        </div>
                    </div>
                    
                    <!-- Links Rápidos -->
                    <div style="margin-top: 16px; padding: 16px; background: rgba(74,144,226,0.1); border-radius: 8px; border: 1px solid rgba(74,144,226,0.2);">
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <button onclick="copyLinkToClipboard('${shortDomain}/guest-list/register/${list.registration_token}', event)" 
                                    class="btn btn-secondary" 
                                    style="flex: 1; min-width: 140px; padding: 10px 16px; font-size: 13px; background: rgba(74,144,226,0.2); border-color: #4A90E2; color: #4A90E2;">
                                <i class="fas fa-link"></i> Copiar Link Inscrição
                            </button>
                            <button onclick="copyLinkToClipboard('${shortDomain}/guest-list/view-full/${list.public_view_token}', event)" 
                                    class="btn btn-secondary" 
                                    style="flex: 1; min-width: 140px; padding: 10px 16px; font-size: 13px; background: rgba(255,199,0,0.2); border-color: #FFC700; color: #FFC700;">
                                <i class="fas fa-eye"></i> Copiar Link Portaria
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }
    
    container.innerHTML = html;
    
    // Adicionar busca de listas
    const searchInput = container.querySelector('#search-lists-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            const cards = container.querySelectorAll('.list-card');
            
            cards.forEach(card => {
                const name = card.dataset.listName || '';
                const location = card.dataset.listLocation || '';
                
                if (term === '' || name.includes(term) || location.includes(term)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
}

// Função auxiliar para copiar link
function copyLinkToClipboard(url, event) {
    if (event) event.stopPropagation();
    
    navigator.clipboard.writeText(url).then(() => {
        showSuccessMessage('Link copiado para a área de transferência!');
    }).catch(() => {
        // Fallback para navegadores mais antigos
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showSuccessMessage('Link copiado para a área de transferência!');
        } catch (err) {
            alert('Erro ao copiar link. Por favor, copie manualmente.');
        }
        document.body.removeChild(textarea);
    });
}

// Função para mostrar mensagem de sucesso melhorada
function showSuccessMessage(message) {
    // Remover mensagem anterior se existir
    const existingMsg = document.getElementById('success-toast');
    if (existingMsg) {
        existingMsg.remove();
    }
    
    const toast = document.createElement('div');
    toast.id = 'success-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(76, 175, 80, 0.4);
        z-index: 10001;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideInRight 0.3s ease;
        font-weight: 600;
        font-size: 14px;
        max-width: 400px;
    `;
    toast.innerHTML = `
        <i class="fas fa-check-circle" style="font-size: 20px;"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
    
    // Adicionar animações CSS se não existirem
    if (!document.getElementById('toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Criar nova lista de convidados diretamente
async function createNewGuestList() {
    try {
        const token = getToken();
        
        // Usar a rota específica de guest-lists que cria tudo automaticamente
        const response = await fetch(`${API_URL}/api/guest-lists`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: prompt('Digite o nome da lista de convidados:') || 'Nova Lista de Convidados',
                event_title: prompt('Digite o nome do evento:') || 'Evento'
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Erro ao criar lista' }));
            throw new Error(errorData.message || 'Erro ao criar lista');
        }
        
        const newItem = await response.json();
        const formItemId = getFormItemIdFromUrl();
        
        // O ID retornado é o profile_item_id
        const itemId = newItem.id;
        
        // Redirecionar para editar a lista
        window.location.href = `/guestListEdit?itemId=${itemId}${formItemId ? '&formItemId=' + formItemId : ''}`;
        
    } catch (error) {
        console.error('Erro ao criar lista:', error);
        alert('Erro ao criar lista de convidados: ' + error.message);
    }
}

// Carregar dados da lista
async function loadGuestList() {
    const itemId = getItemIdFromUrl();
    if (!itemId) {
        // Não há itemId - mostrar todas as listas
        await loadAllGuestLists();
        return;
    }
    
    currentGuestListId = itemId;
    
    // Mostrar abas e conteúdo específico de lista
    const tabsContainer = document.querySelector('.tabs-container');
    const tabContents = document.querySelectorAll('.tab-content');
    if (tabsContainer) tabsContainer.style.display = 'flex';
    
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/guest-lists/${itemId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Erro ao carregar lista' }));
            throw new Error(errorData.message || `Erro ${response.status}: Não foi possível carregar a lista`);
        }
        
        const data = await response.json();
        
        if (!data || !data.id) {
            throw new Error('Dados da lista inválidos');
        }
        
        currentGuestList = data;
        // Garantir que currentGuestListId seja o profile_item_id
        currentGuestListId = data.id || data.profile_item_id || itemId;
        
        // Atualizar título
        const titleEl = document.getElementById('event-title');
        if (titleEl) {
            titleEl.textContent = data.event_title || 'Lista de Convidados';
        }
        
        // Carregar configuração de campos customizados
        const customCheckbox = document.getElementById('use-custom-form');
        if (customCheckbox) {
            customCheckbox.checked = data.use_custom_form === true;
        }
        
        const customBuilder = document.getElementById('custom-form-builder');
        if (customBuilder) {
            customBuilder.style.display = (data.use_custom_form === true) ? 'block' : 'none';
        }
        
        // Parsear custom_form_fields se for string
        if (data.custom_form_fields && typeof data.custom_form_fields === 'string') {
            try {
                data.custom_form_fields = JSON.parse(data.custom_form_fields);
            } catch (e) {
                data.custom_form_fields = [];
            }
        }
        
        if (!data.custom_form_fields) {
            data.custom_form_fields = [];
        }
        
        // Atualizar links primeiro
        updateLinks();
        
        // Atualizar preview de campos customizados (após garantir que currentGuestList está definido)
        if (currentGuestList) {
            updateCustomFieldsPreview();
        }
        
        // Carregar convidados
        await loadGuests();
        
        // Carregar estatísticas
        await loadStats();
        
        // Se estivermos na aba Links, carregar links personalizados
        // Aguardar um pouco para garantir que o DOM está pronto
        setTimeout(() => {
            const linksTab = document.getElementById('tab-links');
            const urlParams = new URLSearchParams(window.location.search);
            const tabParam = urlParams.get('tab');
            
            if ((linksTab && linksTab.classList.contains('active')) || tabParam === 'links') {
                console.log('Y"< Aba Links está ativa, carregando links personalizados...');
                if (currentGuestListId) {
                    loadPersonalizedLinks();
                    updatePortariaLink();
                } else {
                    // Tentar novamente após um delay maior
                    setTimeout(() => {
                        if (currentGuestListId) {
                            loadPersonalizedLinks();
                            updatePortariaLink();
                        }
                    }, 1000);
                }
            }
        }, 500);
        
    } catch (error) {
        console.error('O Erro ao carregar lista:', error);
        const errorMsg = error.message || 'Erro desconhecido ao carregar lista de convidados';
        console.error('Detalhes do erro:', {
            message: error.message,
            stack: error.stack,
            itemId: itemId,
            currentGuestListId: currentGuestListId
        });
        
        // Verificar se é erro 404 (lista não encontrada)
        let is404Error = false;
        if (errorMsg.includes('404') || errorMsg.includes('não encontrada') || errorMsg.includes('não encontrado')) {
            is404Error = true;
        }
        
        // Mostrar erro mais detalhado
        const container = document.getElementById('main-container') || document.querySelector('.main-container');
        if (container) {
            let errorMessage = errorMsg;
            let suggestion = '';
            
            if (is404Error) {
                errorMessage = 'Lista de convidados não encontrada';
                suggestion = `
                    <p style="margin-top: 16px; color: var(--text-dark, #A1A1A1); font-size: 14px;">
                        Esta lista pode não ter sido criada ainda. O sistema tentará criá-la automaticamente.
                    </p>
                    <p style="margin-top: 8px; color: var(--text-dark, #A1A1A1); font-size: 14px;">
                        Aguarde alguns segundos e clique em "Tentar novamente".
                    </p>
                `;
            }
            
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: var(--text-dark, #A1A1A1);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; color: #FF9800;"></i>
                    <h4 style="color: var(--text, #ECECEC); margin-bottom: 12px;">Erro ao carregar lista</h4>
                    <p style="margin-bottom: 20px; font-size: 16px;">${errorMessage}</p>
                    ${suggestion}
                    <div style="margin-top: 24px; display: flex; gap: 12px; justify-content: center;">
                        <button onclick="window.location.reload()" style="padding: 12px 24px; background: #FFC700; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-redo"></i> Tentar novamente
                        </button>
                        <button onclick="goBack()" style="padding: 12px 24px; background: rgba(255,255,255,0.1); color: var(--text, #ECECEC); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-arrow-left"></i> Voltar
                        </button>
                    </div>
                </div>
            `;
        } else {
            alert(`Erro ao carregar lista de convidados: ${errorMsg}`);
        }
    }
}

// Carregar convidados (paginado: default 100, max 500; load-more se hasMore)
let guestsListMeta = { total: 0, limit: 100, offset: 0, hasMore: false };

function normalizeGuestsPayload(payload) {
    if (Array.isArray(payload)) {
        return { guests: payload, total: payload.length, limit: payload.length, offset: 0, hasMore: false };
    }
    if (payload && typeof payload === 'object') {
        const list = Array.isArray(payload.guests)
            ? payload.guests
            : (Array.isArray(payload.data) ? payload.data : []);
        return {
            guests: list,
            total: typeof payload.total === 'number' ? payload.total : list.length,
            limit: typeof payload.limit === 'number' ? payload.limit : 100,
            offset: typeof payload.offset === 'number' ? payload.offset : 0,
            hasMore: !!payload.hasMore,
        };
    }
    return { guests: [], total: 0, limit: 100, offset: 0, hasMore: false };
}

async function loadGuests(append) {
    try {
        const token = getToken();
        const offset = append ? ((guestsListMeta.offset || 0) + (guestsListMeta.limit || 100)) : 0;
        const response = await fetch(
            `${API_URL}/api/guest-lists/${currentGuestListId}/guests?limit=100&offset=${offset}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Erro ao carregar convidados');
        }
        
        const page = normalizeGuestsPayload(await response.json());
        guestsListMeta = {
            total: page.total,
            limit: page.limit,
            offset: page.offset,
            hasMore: page.hasMore,
        };
        if (append) {
            guests = (guests || []).concat(page.guests);
            allGuests = [...guests];
        } else {
            guests = page.guests;
            allGuests = [...guests];
        }
        
        // Renderizar convidados na aba ativa
        renderGuests();
        
    } catch (error) {
        console.error('Erro ao carregar convidados:', error);
    }
}

// Carregar estatísticas
async function loadStats() {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/guest-lists/${currentGuestListId}/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar estatísticas');
        }
        
        const stats = await response.json();
        renderStats(stats);
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// Renderizar estatísticas
function renderStats(stats) {
    const registeredStatsHTML = `
        <div class="stat-card">
            <div class="stat-label">Total Cadastrados</div>
            <div class="stat-value">${stats.registered_count || 0}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total Geral</div>
            <div class="stat-value">${stats.total_count || 0}</div>
        </div>
    `;
    
    const confirmationStatsHTML = `
        <div class="stat-card">
            <div class="stat-label">Aguardando Confirmação</div>
            <div class="stat-value">${stats.registered_count || 0}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total Confirmados</div>
            <div class="stat-value">${stats.confirmed_count || 0}</div>
        </div>
    `;
    
    const confirmedStatsHTML = `
        <div class="stat-card">
            <div class="stat-label">Confirmados</div>
            <div class="stat-value">${stats.confirmed_count || 0}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Conferidos</div>
            <div class="stat-value">${stats.checked_in_count || 0}</div>
        </div>
    `;
    
    const registeredStatsEl = document.getElementById('registered-stats');
    const confirmationStatsEl = document.getElementById('confirmation-stats');
    const confirmedStatsEl = document.getElementById('confirmed-stats');
    
    if (registeredStatsEl) registeredStatsEl.innerHTML = registeredStatsHTML;
    if (confirmationStatsEl) confirmationStatsEl.innerHTML = confirmationStatsHTML;
    if (confirmedStatsEl) confirmedStatsEl.innerHTML = confirmedStatsHTML;
}

// Renderizar convidados
function renderGuests() {
    const activeTab = document.querySelector('.tab-button.active')?.dataset.tab || 'registered';
    
    let filteredGuests = [];
    
    // Filtrar por status baseado na aba
    if (activeTab === 'registered') {
        // Mostrar apenas cadastrados (inscritos)
        filteredGuests = guests.filter(g => g.status === 'registered');
        renderRegisteredGuests(filteredGuests);
    } else if (activeTab === 'confirmation') {
        // Mostrar apenas registrados (aguardando confirmação)
        filteredGuests = guests.filter(g => g.status === 'registered');
        renderConfirmationGuests(filteredGuests);
    } else if (activeTab === 'confirmed') {
        // Mostrar apenas confirmados
        filteredGuests = guests.filter(g => g.status === 'confirmed' || g.status === 'checked_in');
        renderConfirmedGuests(filteredGuests);
    }

    let moreBtn = document.getElementById('guests-load-more-btn');
    if (!moreBtn) {
        moreBtn = document.createElement('button');
        moreBtn.id = 'guests-load-more-btn';
        moreBtn.type = 'button';
        moreBtn.className = 'btn-secondary';
        moreBtn.style.cssText = 'display:none;margin:12px auto;';
        moreBtn.textContent = 'Carregar mais';
        moreBtn.onclick = function () { loadGuests(true); };
        const host = document.querySelector('.tabs-content') || document.querySelector('.guest-list-container') || document.body;
        host.appendChild(moreBtn);
    }
    if (guestsListMeta && guestsListMeta.hasMore) {
        moreBtn.style.display = 'block';
        moreBtn.textContent = 'Carregar mais (' + guests.length + ' / ' + guestsListMeta.total + ')';
    } else {
        moreBtn.style.display = 'none';
    }
}

// Renderizar convidados na aba de cadastrados
function renderRegisteredGuests(guestsList) {
    const container = document.getElementById('registered-guests-list');
    
    if (!container) return;
    
    if (guestsList.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-user-plus"></i><p>Nenhum convidado cadastrado ainda</p><p style="font-size: 14px; margin-top: 8px; opacity: 0.7;">Compartilhe o link de inscrição acima para receber inscrições</p></div>';
        return;
    }
    
    container.innerHTML = guestsList.map(guest => {
        const registeredAt = guest.created_at 
            ? new Date(guest.created_at).toLocaleString('pt-BR')
            : '-';
        
        return `
            <div class="table-row">
                <div style="font-weight: 600;">${guest.name || '-'}</div>
                <div>${guest.email || '-'}</div>
                <div>${guest.phone || '-'}</div>
                <div><span class="status-badge status-${guest.status}">${getStatusLabel(guest.status)}</span></div>
                <div>${registeredAt}</div>
                <div>
                    <button class="btn-icon" onclick="viewGuestDetails(${guest.id})" title="Ver detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="deleteGuest(${guest.id})" title="Remover">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Renderizar convidados na aba de confirmação
function renderConfirmationGuests(guestsList) {
    const container = document.getElementById('confirmation-guests-list');
    
    if (!container) return;
    
    if (guestsList.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-user-check"></i><p>Nenhum convidado aguardando confirmação</p><p style="font-size: 14px; margin-top: 8px; opacity: 0.7;">Os convidados cadastrados aparecerão aqui para confirmação</p></div>';
        return;
    }
    
    container.innerHTML = guestsList.map(guest => {
        const registeredAt = guest.created_at 
            ? new Date(guest.created_at).toLocaleString('pt-BR')
            : '-';
        
        return `
            <div class="table-row">
                <div style="font-weight: 600;">${guest.name || '-'}</div>
                <div>${guest.email || '-'}</div>
                <div>${guest.phone || '-'}</div>
                <div><span class="status-badge status-${guest.status}">${getStatusLabel(guest.status)}</span></div>
                <div>${registeredAt}</div>
                <div>
                    <button class="btn-icon" onclick="viewGuestDetails(${guest.id})" title="Ver detalhes" style="margin-right: 8px;">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="confirmGuest(${guest.id})" title="Confirmar Presença" style="background: #4CAF50; color: white; margin-right: 8px;">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-icon" onclick="deleteGuest(${guest.id})" title="Remover">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Renderizar convidados na aba de confirmados
function renderConfirmedGuests(guestsList) {
    const container = document.getElementById('confirmed-guests-list');
    
    if (!container) return;
    
    if (guestsList.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><p>Nenhum convidado confirmado ainda</p><p style="font-size: 14px; margin-top: 8px; opacity: 0.7;">Confirme os convidados na aba "Convidados para Confirmação"</p></div>';
        return;
    }
    
    container.innerHTML = guestsList.map(guest => {
        const confirmedAt = guest.confirmed_at 
            ? new Date(guest.confirmed_at).toLocaleString('pt-BR')
            : '-';
        
        return `
            <div class="table-row">
                <div style="font-weight: 600;">${guest.name || '-'}</div>
                <div>${guest.email || '-'}</div>
                <div>${guest.phone || '-'}</div>
                <div><span class="status-badge status-${guest.status}">${getStatusLabel(guest.status)}</span></div>
                <div>${confirmedAt}</div>
                <div>
                    <button class="btn-icon" onclick="viewGuestDetails(${guest.id})" title="Ver detalhes" style="margin-right: 8px;">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${guest.status === 'confirmed' ? `
                        <button class="btn-icon" onclick="checkInGuest(${guest.id})" title="Conferir Presença" style="background: #2196F3; color: white; margin-right: 8px;">
                            <i class="fas fa-check-circle"></i>
                        </button>
                    ` : '<span style="color: var(--dourado-principal, #FFC700);"><i class="fas fa-check-circle"></i> Conferido</span>'}
                    <button class="btn-icon" onclick="deleteGuest(${guest.id})" title="Remover">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Obter label do status
function getStatusLabel(status) {
    const labels = {
        'registered': 'Inscrito',
        'confirmed': 'Confirmado',
        'checked_in': 'Conferido',
        'cancelled': 'Cancelado'
    };
    return labels[status] || status;
}

// Alternar entre abas
function switchTab(tabName) {
    // Atualizar botões
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Atualizar conteúdo
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const tabContent = document.getElementById(`tab-${tabName}`);
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    // Renderizar convidados da aba ativa (apenas se não for a aba de links)
    if (tabName !== 'links') {
        renderGuests();
    } else {
        // Se for a aba de links, carregar links personalizados
        loadPersonalizedLinks();
        updatePortariaLink();
    }
}

// Atualizar links
function updateLinks() {
    if (!currentGuestList) return;
    
    const baseUrl = window.location.hostname.includes('localhost') 
        ? window.location.origin 
        : 'https://tag.conectaking.com.br';
    
    const registrationToken = currentGuestList.registration_token;
    const confirmationToken = currentGuestList.confirmation_token;
    const itemId = currentGuestListId;
    
    // Link de inscrição
    if (registrationToken) {
        const regLinkEl = document.getElementById('registration-link');
        if (regLinkEl) {
            regLinkEl.value = `${baseUrl}/guest-list/register/${registrationToken}`;
        }
    }
    
    // Link de confirmação (para acessar aba de confirmação)
    if (confirmationToken || itemId) {
        const confLinkEl = document.getElementById('confirmation-link');
        if (confLinkEl) {
            // Link para acessar diretamente a aba de confirmação via URL
            confLinkEl.value = `${baseUrl}/guest-list/confirm/${confirmationToken || itemId}?tab=confirmation`;
        }
    }
    
    // Link para ver confirmados (para acessar aba de confirmados)
    if (itemId) {
        const confirmedLinkEl = document.getElementById('confirmed-link');
        if (confirmedLinkEl) {
            confirmedLinkEl.value = `${baseUrl}/guest-list/view/${itemId}?tab=confirmed`;
        }
    }
    
    // Link de visualização completa (portaria)
    const publicViewToken = currentGuestList.public_view_token || currentGuestList.confirmation_token;
    if (publicViewToken) {
        const publicViewLinkEl = document.getElementById('public-view-link');
        if (publicViewLinkEl) {
            publicViewLinkEl.value = `${baseUrl}/guest-list/view-full/${publicViewToken}`;
        }
    }
    
    // Atualizar também o link da portaria na aba Links
    updatePortariaLink();
}

// Atualizar link da portaria
function updatePortariaLink() {
    if (!currentGuestList) return;
    
    const baseUrl = window.location.hostname.includes('localhost') 
        ? window.location.origin 
        : 'https://tag.conectaking.com.br';
    
    const portariaSlug = currentGuestList.portaria_slug || 'portaria';
    const portariaLinkEl = document.getElementById('portaria-link');
    const portariaSlugInput = document.getElementById('portaria-slug-input');
    
    if (portariaLinkEl) {
        portariaLinkEl.value = `${baseUrl}/guest-list/view-full/${currentGuestList.public_view_token || currentGuestList.confirmation_token}`;
    }
    
    if (portariaSlugInput) {
        portariaSlugInput.value = portariaSlug;
    }
}

// Carregar links personalizados
async function loadPersonalizedLinks() {
    const listEl = document.getElementById('personalized-links-list');
    if (!listEl) {
        console.error('O Elemento personalized-links-list não encontrado');
        return;
    }
    
    if (!currentGuestListId) {
        console.warn('currentGuestListId não definido');
        listEl.innerHTML = '<p style="color: var(--text-dark, #A1A1A1); font-size: 14px; padding: 16px; text-align: center;">Carregando lista...</p>';
        return;
    }
    
    // Mostrar loading
    listEl.innerHTML = '<p style="color: var(--text-dark, #A1A1A1); font-size: 14px; padding: 16px; text-align: center;"><i class="fas fa-spinner fa-spin"></i> Carregando links personalizados...</p>';
    
    try {
        const token = getToken();
        if (!token) {
            throw new Error('Token não encontrado');
        }
        
        console.log('Carregando links personalizados para lista:', currentGuestListId);
        const response = await fetch(`${API_URL}/api/guest-lists/${currentGuestListId}/cadastro-links`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
            throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const links = data.data || [];
        
        console.log('Links personalizados carregados:', links.length, 'links');
        console.log('Y"< Dados dos links:', links);
        
        if (links.length === 0) {
            renderPersonalizedLinks([]);
        } else {
            renderPersonalizedLinks(links);
        }
    } catch (error) {
        console.error('O Erro ao carregar links personalizados:', error);
        if (listEl) {
            listEl.innerHTML = `
                <div style="padding: 20px; text-align: center; background: rgba(255,68,68,0.1); border: 1px solid rgba(255,68,68,0.3); border-radius: 8px;">
                    <i class="fas fa-exclamation-triangle" style="color: #ff4444; font-size: 24px; margin-bottom: 8px;"></i>
                    <p style="color: #ff4444; margin: 0 0 8px 0; font-weight: 600;">Erro ao carregar links personalizados</p>
                    <p style="color: var(--text-dark, #A1A1A1); font-size: 13px; margin: 0;">${error.message || 'Erro desconhecido'}</p>
                </div>
            `;
        }
    }
}

// Renderizar links personalizados
function renderPersonalizedLinks(links) {
    const listEl = document.getElementById('personalized-links-list');
    if (!listEl) {
        console.error('O Elemento personalized-links-list não encontrado para renderizar');
        return;
    }
    
        console.log('YZ Renderizando links personalizados:', links.length, 'links');
    
    // Garantir que o elemento está visível e não tem overflow hidden
    if (listEl) {
        listEl.style.overflow = 'visible';
        listEl.style.width = '100%';
        listEl.style.boxSizing = 'border-box';
    }
    
    if (links.length === 0) {
        listEl.innerHTML = '<p style="color: var(--text-dark, #A1A1A1); font-size: 14px; padding: 16px; text-align: center;">Nenhum link personalizado criado ainda.</p>';
        return;
    }
    
    const baseUrl = window.location.hostname.includes('localhost') 
        ? window.location.origin 
        : 'https://tag.conectaking.com.br';
    
    listEl.innerHTML = links.map((link, index) => {
        // Validar dados do link
        if (!link || !link.slug) {
            console.warn('Link inválido encontrado:', link);
            return '';
        }
        
        const isExpired = link.isExpired === true;
        const isUsed = link.isUsed === true;
        const statusClass = isExpired ? 'status-cancelled' : (isUsed ? 'status-registered' : 'status-checked_in');
        const statusText = isExpired ? 'Expirado' : (isUsed ? 'Usado' : 'Disponível');
        const statusBg = isExpired ? 'rgba(255,68,68,0.2)' : (isUsed ? 'rgba(74,144,226,0.2)' : 'rgba(37,211,102,0.2)');
        const statusColor = isExpired ? '#ff4444' : (isUsed ? '#4A90E2' : '#25D366');
        const linkUrl = `${baseUrl}/usuario/form/share/${link.slug}`;
        const linkName = (link.description && link.description.trim()) || link.slug || `Link ${index + 1}`;
        const expiresText = link.expires_at ? new Date(link.expires_at).toLocaleDateString('pt-BR') : 'Sem expiração';
        const expiresIcon = link.expires_at ? 'fa-calendar-times' : 'fa-infinity';
        const usesText = (link.max_uses === 999999 || link.max_uses === null) ? 'Ilimitado' : link.max_uses;
        const currentUses = link.current_uses || 0;
        
        // Escapar URLs e textos para evitar problemas com template strings
        const escapedLinkUrl = linkUrl.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const escapedLinkName = linkName.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        
        return `
            <div class="personalized-link-item mobile-link-item" style="background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; padding: 16px; margin-bottom: 12px; overflow: visible; word-wrap: break-word; overflow-wrap: break-word; display: block; visibility: visible; opacity: 1; width: 100%; box-sizing: border-box;">
                <!-- Header: Status e Nome -->
                <div class="link-header-mobile link-header-content" style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; width: 100%; visibility: visible; opacity: 1;">
                    <span class="status-badge ${statusClass}" style="font-size: 11px; padding: 4px 10px; border-radius: 6px; font-weight: 600; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor}; white-space: nowrap; display: inline-block; visibility: visible; opacity: 1;">
                        ${statusText}
                    </span>
                    <strong class="link-name-mobile link-name-content" style="color: var(--text, #ECECEC); font-size: 14px; font-weight: 700; flex: 1; min-width: 0; word-break: break-word; overflow-wrap: break-word; line-height: 1.4; display: block; visibility: visible; opacity: 1; width: 100%;">
                        ${escapedLinkName}
                    </strong>
                </div>
                
                <!-- URL do Link -->
                <div class="link-box link-box-mobile link-box-content" style="display: flex; gap: 10px; align-items: stretch; margin-bottom: 12px; flex-wrap: wrap; width: 100%; visibility: visible; opacity: 1;">
                    <input type="text" class="link-input link-input-mobile link-input-content" value="${escapedLinkUrl}" readonly style="flex: 1; min-width: 0; width: 100%; max-width: 100%; padding: 10px 12px; background: var(--background-color, #0D0D0F); border: 2px solid var(--border-color, #2C2C2F); border-radius: 10px; color: var(--text, #ECECEC); font-size: 12px; font-family: monospace; word-break: break-all; overflow-wrap: break-word; box-sizing: border-box; display: block; visibility: visible; opacity: 1;">
                    <button onclick="copyToClipboardPersonalized('${escapedLinkUrl}', this)" class="btn-copy btn-copy-mobile btn-copy-content" style="padding: 10px 16px; background: #000; color: #fff; border: none; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 6px; flex-shrink: 0; visibility: visible; opacity: 1; justify-content: center;">
                        <i class="fas fa-copy" style="display: inline-block; visibility: visible;"></i> <span class="btn-text" style="display: inline-block; visibility: visible; opacity: 1; font-size: 13px; font-weight: 700;">Copiar</span>
                    </button>
                </div>
                
                <!-- Detalhes: Expiração, Slug, Uso -->
                <div class="link-details-mobile link-details-content" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; font-size: 13px; color: var(--text-dark, #A1A1A1); width: 100%; box-sizing: border-box; visibility: visible; opacity: 1;">
                    <span class="detail-item-mobile detail-item-content" style="display: flex; align-items: center; gap: 6px; white-space: nowrap; visibility: visible; opacity: 1;">
                        <i class="fas ${expiresIcon}" style="color: var(--dourado-principal, #FFC700); flex-shrink: 0; display: inline-block; visibility: visible;"></i>
                        <span style="display: inline; visibility: visible; white-space: normal;"><strong style="color: var(--text, #ECECEC);">${expiresText}</strong></span>
                    </span>
                    <span class="detail-item-mobile detail-item-content" style="display: flex; align-items: center; gap: 6px; white-space: nowrap; visibility: visible; opacity: 1;">
                        <i class="fas fa-hashtag" style="color: var(--dourado-principal, #FFC700); flex-shrink: 0; display: inline-block; visibility: visible;"></i>
                        <span style="display: inline; visibility: visible; white-space: normal;">#Slug: <strong style="color: var(--text, #ECECEC);">${link.slug}</strong></span>
                    </span>
                    <span class="detail-item-mobile detail-item-content" style="display: flex; align-items: center; gap: 6px; white-space: nowrap; visibility: visible; opacity: 1;">
                        <i class="fas fa-users" style="color: var(--dourado-principal, #FFC700); flex-shrink: 0; display: inline-block; visibility: visible;"></i>
                        <span style="display: inline; visibility: visible; white-space: normal;">Uso: <strong style="color: var(--text, #ECECEC);">${currentUses}/${usesText}</strong></span>
                    </span>
                </div>
                
                <!-- Botões de Ação -->
                <div class="link-actions-mobile link-actions-content" style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; width: 100%; visibility: visible; opacity: 1;">
                    ${!isExpired ? `
                        <button onclick="toggleLinkStatus(${link.id}, ${link.isActiveForProfile || false})" class="btn-action-toggle btn-action-content" style="padding: 10px 16px; background: ${link.isActiveForProfile ? 'linear-gradient(135deg, #25D366, #1DB954)' : 'rgba(255,68,68,0.2)'}; color: ${link.isActiveForProfile ? '#fff' : '#ff4444'}; border: 2px solid ${link.isActiveForProfile ? '#25D366' : '#ff4444'}; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; transition: all 0.3s; white-space: nowrap; visibility: visible; opacity: 1; justify-content: center;">
                            <i class="fas fa-${link.isActiveForProfile ? 'check-circle' : 'times-circle'}" style="display: inline-block; visibility: visible;"></i>
                            <span style="display: inline-block; visibility: visible; opacity: 1; font-size: 13px; font-weight: 700;">${link.isActiveForProfile ? 'Ativo' : 'Ativar'}</span>
                        </button>
                    ` : `
                        <button onclick="renewLink(${link.id})" class="btn-action-renew btn-action-content" style="padding: 10px 16px; background: linear-gradient(135deg, #4A90E2, #357ABD); color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; visibility: visible; opacity: 1; justify-content: center;">
                            <i class="fas fa-redo" style="display: inline-block; visibility: visible;"></i>
                            <span style="display: inline-block; visibility: visible; opacity: 1; font-size: 13px; font-weight: 700;">Renovar</span>
                        </button>
                    `}
                    <button onclick="editPersonalizedLink(${link.id})" class="btn-action-edit btn-action-content" style="padding: 10px 16px; background: rgba(74,144,226,0.2); color: #4A90E2; border: 2px solid #4A90E2; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; visibility: visible; opacity: 1; justify-content: center;">
                        <i class="fas fa-edit" style="display: inline-block; visibility: visible;"></i>
                        <span style="display: inline-block; visibility: visible; opacity: 1; font-size: 13px; font-weight: 700;">Editar</span>
                    </button>
                    <button onclick="deletePersonalizedLink(${link.id})" class="btn-action-delete btn-action-content" style="padding: 10px 16px; background: rgba(255,68,68,0.2); color: #ff4444; border: 2px solid #ff4444; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; visibility: visible; opacity: 1; justify-content: center;">
                        <i class="fas fa-trash" style="display: inline-block; visibility: visible;"></i>
                        <span style="display: inline-block; visibility: visible; opacity: 1; font-size: 13px; font-weight: 700;">Excluir</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Forçar reflow e aplicar estilos mobile se necessário
    if (listEl) {
        listEl.offsetHeight; // Trigger reflow
        
        // Detectar se é mobile
        const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Garantir que todos os elementos personalizados estão visíveis
        const items = listEl.querySelectorAll('.personalized-link-item');
        items.forEach(item => {
            if (item) {
                item.style.overflow = 'visible';
                item.style.width = '100%';
                item.style.boxSizing = 'border-box';
                item.style.display = 'block';
                item.style.visibility = 'visible';
                item.style.opacity = '1';
                
                // Se for mobile, forçar estilos de coluna
                if (isMobile) {
                    // Header
                    const header = item.querySelector('.link-header-content, .link-header-mobile');
                    if (header) {
                        header.style.flexDirection = 'column';
                        header.style.alignItems = 'flex-start';
                    }
                    
                    // Nome do link
                    const linkName = item.querySelector('.link-name-content, .link-name-mobile');
                    if (linkName) {
                        linkName.style.display = 'block';
                        linkName.style.width = '100%';
                        linkName.style.fontSize = '15px';
                        linkName.style.fontWeight = '700';
                        linkName.style.color = 'var(--text, #ECECEC)';
                        linkName.style.marginTop = '8px';
                    }
                    
                    // Link box
                    const linkBox = item.querySelector('.link-box-content, .link-box-mobile');
                    if (linkBox) {
                        linkBox.style.flexDirection = 'column';
                        linkBox.style.width = '100%';
                    }
                    
                    // Input
                    const inputs = item.querySelectorAll('.link-input-content, .link-input-mobile, .link-input');
                    inputs.forEach(input => {
                        if (input) {
                            input.style.width = '100%';
                            input.style.maxWidth = '100%';
                            input.style.minWidth = '0';
                            input.style.flex = 'none';
                            input.style.boxSizing = 'border-box';
                            input.style.overflow = 'visible';
                            input.style.wordBreak = 'break-all';
                            input.style.overflowWrap = 'break-word';
                            input.style.display = 'block';
                            input.style.visibility = 'visible';
                        }
                    });
                    
                    // Botão copiar
                    const btnCopy = item.querySelector('.btn-copy-content, .btn-copy-mobile, .btn-copy');
                    if (btnCopy) {
                        btnCopy.style.width = '100%';
                        btnCopy.style.justifyContent = 'center';
                        btnCopy.style.display = 'flex';
                        const btnText = btnCopy.querySelector('.btn-text');
                        if (btnText) {
                            btnText.style.display = 'inline-block';
                            btnText.style.visibility = 'visible';
                            btnText.style.fontSize = '13px';
                            btnText.style.fontWeight = '700';
                        }
                    }
                    
                    // Detalhes
                    const details = item.querySelector('.link-details-content, .link-details-mobile');
                    if (details) {
                        details.style.flexDirection = 'column';
                        details.style.width = '100%';
                        const detailItems = details.querySelectorAll('.detail-item-content, .detail-item-mobile');
                        detailItems.forEach(detail => {
                            detail.style.width = '100%';
                            detail.style.flexWrap = 'wrap';
                            const spans = detail.querySelectorAll('span');
                            spans.forEach(span => {
                                span.style.display = 'inline';
                                span.style.visibility = 'visible';
                            });
                            const strongs = detail.querySelectorAll('strong');
                            strongs.forEach(strong => {
                                strong.style.display = 'inline';
                                strong.style.visibility = 'visible';
                            });
                        });
                    }
                    
                    // Botões de ação
                    const actions = item.querySelector('.link-actions-content, .link-actions-mobile');
                    if (actions) {
                        actions.style.flexDirection = 'column';
                        actions.style.width = '100%';
                        const buttons = actions.querySelectorAll('button');
                        buttons.forEach(btn => {
                            btn.style.width = '100%';
                            btn.style.justifyContent = 'center';
                            btn.style.flexDirection = 'row';
                            const btnSpans = btn.querySelectorAll('span');
                            btnSpans.forEach(span => {
                                span.style.display = 'inline-block';
                                span.style.visibility = 'visible';
                                span.style.fontSize = '13px';
                                span.style.fontWeight = '700';
                            });
                            const btnIcons = btn.querySelectorAll('i');
                            btnIcons.forEach(icon => {
                                icon.style.display = 'inline-block';
                                icon.style.visibility = 'visible';
                            });
                        });
                    }
                }
            }
        });
    }
    
    console.log('Links personalizados renderizados com sucesso');
    
    // Aplicar estilos mobile após um pequeno delay para garantir que o DOM está pronto
    setTimeout(() => {
        applyMobileStylesToLinks();
    }, 100);
}

// Função para aplicar estilos mobile nos links personalizados
function applyMobileStylesToLinks() {
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const listEl = document.getElementById('personalized-links-list');
    
    if (!listEl) return;
    
    const items = listEl.querySelectorAll('.personalized-link-item');
    items.forEach(item => {
        if (!item) return;
        
        // FOR?AR VISIBILIDADE DO CARD INTEIRO
        item.style.display = 'block';
        item.style.visibility = 'visible';
        item.style.opacity = '1';
        item.style.width = '100%';
        
        // Header - manter em linha
        const header = item.querySelector('.link-header-content, .link-header-mobile');
        if (header) {
            header.style.display = 'flex';
            header.style.flexDirection = 'row';
            header.style.alignItems = 'center';
            header.style.visibility = 'visible';
            header.style.opacity = '1';
        }
        
        // Status badge
        const statusBadge = item.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.style.display = 'inline-block';
            statusBadge.style.visibility = 'visible';
            statusBadge.style.opacity = '1';
        }
        
        // Nome do link
        const linkName = item.querySelector('.link-name-content, .link-name-mobile, strong');
        if (linkName) {
            linkName.style.display = 'inline-block';
            linkName.style.flex = '1';
            linkName.style.fontSize = '14px';
            linkName.style.fontWeight = '700';
            linkName.style.color = 'var(--text, #ECECEC)';
            linkName.style.visibility = 'visible';
            linkName.style.opacity = '1';
        }
        
        // Link box - manter em linha
        const linkBox = item.querySelector('.link-box-content, .link-box-mobile, .link-box');
        if (linkBox) {
            linkBox.style.display = 'flex';
            linkBox.style.flexDirection = 'row';
            linkBox.style.width = '100%';
            linkBox.style.visibility = 'visible';
            linkBox.style.opacity = '1';
        }
        
        // Input - visível e flexível
        const inputs = item.querySelectorAll('.link-input-content, .link-input-mobile, .link-input');
        inputs.forEach(input => {
            if (input) {
                input.style.display = 'block';
                input.style.flex = '1';
                input.style.minWidth = '200px';
                input.style.visibility = 'visible';
                input.style.opacity = '1';
            }
        });
        
        // Botão copiar - visível ao lado do input
        const btnCopy = item.querySelector('.btn-copy-content, .btn-copy-mobile, .btn-copy');
        if (btnCopy) {
            btnCopy.style.display = 'flex';
            btnCopy.style.flexShrink = '0';
            btnCopy.style.visibility = 'visible';
            btnCopy.style.opacity = '1';
            const btnText = btnCopy.querySelector('.btn-text');
            if (btnText) {
                btnText.style.display = 'inline-block';
                btnText.style.visibility = 'visible';
                btnText.style.opacity = '1';
            }
        }
        
        // Detalhes - manter em linha
        const details = item.querySelector('.link-details-content, .link-details-mobile');
        if (details) {
            details.style.display = 'flex';
            details.style.flexDirection = 'row';
            details.style.flexWrap = 'wrap';
            details.style.width = '100%';
            details.style.visibility = 'visible';
            details.style.opacity = '1';
            const detailItems = details.querySelectorAll('.detail-item-content, .detail-item-mobile, span');
            detailItems.forEach(detail => {
                detail.style.display = 'flex';
                detail.style.alignItems = 'center';
                detail.style.visibility = 'visible';
                detail.style.opacity = '1';
                const spans = detail.querySelectorAll('span');
                spans.forEach(span => {
                    span.style.display = 'inline';
                    span.style.visibility = 'visible';
                    span.style.opacity = '1';
                });
                const strongs = detail.querySelectorAll('strong');
                strongs.forEach(strong => {
                    strong.style.display = 'inline';
                    strong.style.visibility = 'visible';
                    strong.style.opacity = '1';
                });
            });
        }
        
        // Botões de ação - manter em linha
        const actions = item.querySelector('.link-actions-content, .link-actions-mobile');
        if (actions) {
            actions.style.display = 'flex';
            actions.style.flexDirection = 'row';
            actions.style.flexWrap = 'wrap';
            actions.style.width = '100%';
            actions.style.justifyContent = 'flex-end';
            actions.style.visibility = 'visible';
            actions.style.opacity = '1';
            const buttons = actions.querySelectorAll('button');
            buttons.forEach(btn => {
                btn.style.display = 'inline-flex';
                btn.style.width = 'auto';
                btn.style.flexShrink = '0';
                btn.style.justifyContent = 'center';
                btn.style.visibility = 'visible';
                btn.style.opacity = '1';
                const btnSpans = btn.querySelectorAll('span');
                btnSpans.forEach(span => {
                    span.style.display = 'inline-block';
                    span.style.visibility = 'visible';
                    span.style.opacity = '1';
                });
                const btnIcons = btn.querySelectorAll('i');
                btnIcons.forEach(icon => {
                    icon.style.display = 'inline-block';
                    icon.style.visibility = 'visible';
                    icon.style.opacity = '1';
                });
            });
        }
    });
}

// Adicionar listener de resize para reaplicar estilos quando necessário
window.addEventListener('resize', () => {
    setTimeout(() => {
        applyMobileStylesToLinks();
    }, 200);
});

// Função para editar link (placeholder)
function editPersonalizedLink(linkId) {
    console.log('Edit link:', linkId);
    // Implementar
}

// Funções auxiliares (placeholder - implementar conforme necessário)
function openCreateLinkModal() {
    alert('Funcionalidade de criar link personalizado será implementada.');
}

function savePortariaSlug() {
    alert('Funcionalidade de salvar slug da portaria será implementada.');
}

function copyToClipboardPersonalized(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
        btn.style.background = '#25D366';
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        alert('Erro ao copiar link.');
    });
}

function toggleLinkStatus(linkId, currentStatus) {
    console.log('Toggle link status:', linkId, currentStatus);
    // Implementar
}

function renewLink(linkId) {
    console.log('Renew link:', linkId);
    // Implementar
}

function deletePersonalizedLink(linkId) {
    if (!confirm('Tem certeza que deseja excluir este link?')) return;
    console.log('Delete link:', linkId);
    // Implementar
}

// Copiar link para clipboard
function copyToClipboard(inputId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const input = document.getElementById(inputId);
    if (!input) {
        console.error('Input não encontrado:', inputId);
        return;
    }
    
    input.select();
    input.setSelectionRange(0, 99999); // Para mobile
    
    try {
        document.execCommand('copy');
        
        // Feedback visual
        const btn = event ? event.target.closest('.btn-copy') : document.querySelector(`[onclick*="${inputId}"]`);
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
            btn.style.background = '#25D366';
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
            }, 2000);
        }
    } catch (err) {
        console.error('Erro ao copiar:', err);
        alert('Erro ao copiar link. Por favor, copie manualmente.');
    }
}

// Conferir convidado (check-in)
async function checkInGuest(guestId) {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/guest-lists/${currentGuestListId}/guests/${guestId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'checked_in'
            })
        });
        
        if (!response.ok) {
            throw new Error('Erro ao conferir convidado');
        }
        
        // Recarregar lista
        await loadGuests();
        await loadStats();
        
    } catch (error) {
        console.error('Erro ao conferir convidado:', error);
        alert('Erro ao conferir convidado');
    }
}

// Confirmar convidado
async function confirmGuest(guestId) {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/guest-lists/${currentGuestListId}/guests/${guestId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'confirmed'
            })
        });
        
        if (!response.ok) {
            throw new Error('Erro ao confirmar convidado');
        }
        
        // Recarregar lista
        await loadGuests();
        await loadStats();
        
    } catch (error) {
        console.error('Erro ao confirmar convidado:', error);
        alert('Erro ao confirmar convidado');
    }
}

// Remover convidado
async function deleteGuest(guestId) {
    if (!confirm('Tem certeza que deseja remover este convidado?')) {
        return;
    }
    
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/guest-lists/${currentGuestListId}/guests/${guestId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao remover convidado');
        }
        
        // Recarregar lista
        await loadGuests();
        await loadStats();
        
    } catch (error) {
        console.error('Erro ao remover convidado:', error);
        alert('Erro ao remover convidado');
    }
}

// Salvar lista (se necessário no futuro)
// Toggle campos customizados
function toggleCustomForm() {
    const checkbox = document.getElementById('use-custom-form');
    const builder = document.getElementById('custom-form-builder');
    
    if (checkbox && builder) {
        builder.style.display = checkbox.checked ? 'block' : 'none';
        if (!checkbox.checked) {
            // Se desativar, limpar campos customizados
            if (currentGuestList) {
                currentGuestList.use_custom_form = false;
            }
        } else {
            // Se ativar, garantir que existe estrutura
            if (currentGuestList && !currentGuestList.custom_form_fields) {
                currentGuestList.custom_form_fields = [];
            }
        }
        updateCustomFieldsPreview();
    }
}

// Abrir editor de campos customizados
function openCustomFieldsEditor() {
    if (!currentGuestList) {
        alert('Por favor, aguarde o carregamento da lista ou recarregue a página.');
        return;
    }
    
    const modal = document.getElementById('custom-fields-modal');
    if (!modal) {
        alert('Erro: Modal não encontrado. Por favor, recarregue a página.');
        return;
    }
    
    modal.classList.add('active');
    
    // Mostrar opções: Biblioteca de Templates ou Editor Manual
    showCustomFieldsEditorOptions();
    
    // Prevenir scroll do body quando modal está aberto
    document.body.style.overflow = 'hidden';
}

// Mostrar opções de editor (Biblioteca de Templates ou Manual)
function showCustomFieldsEditorOptions() {
    const editor = document.getElementById('custom-fields-editor');
    if (!editor) return;
    
    editor.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
            <h3 style="color: var(--dourado-principal, #FFC700); margin-bottom: 24px; font-size: 24px;">
                <i class="fas fa-layer-group"></i> Como deseja criar seus campos?
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 32px;">
                <button onclick="openTemplateLibrary()" class="btn btn-primary" style="padding: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; color: white; border-radius: 16px; cursor: pointer; font-weight: 700; font-size: 16px; transition: all 0.3s; display: flex; flex-direction: column; align-items: center; gap: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                    <div style="font-size: 3rem;"><i class="fas fa-layer-group"></i></div>
                    <div>
                        <div style="font-weight: 700; font-size: 18px; margin-bottom: 8px;">Biblioteca de Templates</div>
                        <div style="font-size: 13px; opacity: 0.95;">Escolha um template premium pronto para usar</div>
                    </div>
                    <i class="fas fa-arrow-right" style="font-size: 1.2rem;"></i>
                </button>
                <button onclick="showSimpleCustomFieldsEditor()" class="btn btn-secondary" style="padding: 24px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border: none; color: white; border-radius: 16px; cursor: pointer; font-weight: 700; font-size: 16px; transition: all 0.3s; display: flex; flex-direction: column; align-items: center; gap: 16px; box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);">
                    <div style="font-size: 3rem;"><i class="fas fa-edit"></i></div>
                    <div>
                        <div style="font-weight: 700; font-size: 18px; margin-bottom: 8px;">Criar Manualmente</div>
                        <div style="font-size: 13px; opacity: 0.95;">Adicione campos um por um personalizados</div>
                    </div>
                    <i class="fas fa-arrow-right" style="font-size: 1.2rem;"></i>
                </button>
            </div>
        </div>
    `;
}

// Abrir biblioteca de templates
function openTemplateLibrary() {
    // Carregar templates do formPageEdit.js (similar aos módulos)
    // Por enquanto, criar uma versão simplificada aqui
    const editor = document.getElementById('custom-fields-editor');
    if (!editor) return;
    
    // Templates específicos para lista de convidados
    const guestListTemplates = {
        'guest_basic': {
            name: 'Básico',
            icon: 'fas fa-list',
            category: 'Básico',
            description: 'Campos essenciais para cadastro de convidados',
            fields: [
                { label: 'Empresa/Organização', type: 'short_text', required: false },
                { label: 'Cargo', type: 'short_text', required: false },
                { label: 'Observações', type: 'long_text', required: false }
            ],
            primary_color: '#4A90E2'
        },
        'guest_complete': {
            name: 'Completo',
            icon: 'fas fa-user-check',
            category: 'Completo',
            description: 'Formulário completo com todas as informações',
            fields: [
                { label: 'Data de Nascimento', type: 'date', required: false },
                { label: 'Empresa/Organização', type: 'short_text', required: false },
                { label: 'Cargo', type: 'short_text', required: false },
                { label: 'Tipo de Convidado', type: 'select', required: false, options: ['VIP', 'Convidado', 'Palestrante', 'Patrocinador'] },
                { label: 'Restrições Alimentares', type: 'long_text', required: false },
                { label: 'Necessita Transporte?', type: 'select', required: false, options: ['Sim', 'Não'] },
                { label: 'Observações', type: 'long_text', required: false }
            ],
            primary_color: '#FFC700'
        },
        'guest_wedding': {
            name: 'Casamento',
            icon: 'fas fa-heart',
            category: 'Eventos',
            description: 'Template especializado para eventos de casamento',
            fields: [
                { label: 'Lado da Família', type: 'select', required: false, options: ['Noivo', 'Noiva', 'Ambos'] },
                { label: 'Relação', type: 'short_text', required: false, placeholder: 'Ex: Padrinho, Madrinha, Amigo...' },
                { label: 'Número de Acompanhantes', type: 'number', required: false, min: 0 },
                { label: 'Restrições Alimentares', type: 'long_text', required: false },
                { label: 'Mensagem para os Noivos', type: 'long_text', required: false }
            ],
            primary_color: '#E91E63'
        },
        'guest_corporate': {
            name: 'Corporativo',
            icon: 'fas fa-briefcase',
            category: 'Eventos',
            description: 'Template para eventos corporativos e empresariais',
            fields: [
                { label: 'Empresa', type: 'short_text', required: true },
                { label: 'Cargo', type: 'short_text', required: true },
                { label: 'Departamento', type: 'short_text', required: false },
                { label: 'Tipo de Participação', type: 'select', required: false, options: ['Participante', 'Palestrante', 'Patrocinador', 'Organizador'] },
                { label: 'Deseja certificado?', type: 'select', required: false, options: ['Sim', 'Não'] },
                { label: 'Observações', type: 'long_text', required: false }
            ],
            primary_color: '#2C3E50'
        },
        'guest_church': {
            name: 'Igreja',
            icon: 'fas fa-church',
            category: 'Eventos',
            description: 'Template para eventos religiosos e da igreja',
            fields: [
                { label: '? membro da igreja?', type: 'select', required: false, options: ['Sim', 'Não', 'Visitante'] },
                { label: 'Ministério', type: 'select', required: false, options: ['Louvor', 'Intercessão', 'Ensino', 'Evangelismo', 'Acolhimento', 'Crianças', 'Jovens', 'Outro'] },
                { label: 'Necessita Transporte?', type: 'select', required: false, options: ['Sim', 'Não'] },
                { label: 'Restrições Alimentares', type: 'long_text', required: false },
                { label: 'Observações', type: 'long_text', required: false }
            ],
            primary_color: '#4A90E2'
        }
    };
    
    // Agrupar templates por categoria
    const groupedTemplates = Object.entries(guestListTemplates).reduce((acc, [key, template]) => {
        if (!acc[template.category]) acc[template.category] = [];
        acc[template.category].push([key, template]);
        return acc;
    }, {});
    
    // Renderizar templates
    let html = `
        <div style="margin-bottom: 24px;">
            <button onclick="showCustomFieldsEditorOptions()" class="btn btn-secondary" style="margin-bottom: 20px; padding: 10px 20px;">
                <i class="fas fa-arrow-left"></i> Voltar
            </button>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div>
                    <h3 style="color: var(--dourado-principal, #FFC700); margin: 0 0 8px 0; font-size: 24px;">
                        <i class="fas fa-layer-group"></i> Biblioteca de Templates
                    </h3>
                    <p style="color: var(--text-dark, #A1A1A1); margin: 0; font-size: 14px;">
                        Escolha um template premium para adicionar aos seus campos customizados. Os campos obrigatórios (Nome, WhatsApp, CPF) são sempre incluídos.
                    </p>
                </div>
            </div>
            <div style="margin-bottom: 24px;">
                <div style="position: relative;">
                    <i class="fas fa-search" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-dark, #A1A1A1);"></i>
                    <input type="text" id="template-search-input" placeholder="Buscar template por nome, descrição ou categoria..." 
                           style="width: 100%; padding: 12px 16px 12px 48px; background: var(--card-background-color, #1C1C21); border: 2px solid var(--border-color, #2C2C2F); border-radius: 12px; color: var(--text, #ECECEC); font-size: 14px; transition: all 0.3s;"
                           onfocus="this.style.borderColor='var(--dourado-principal, #FFC700)'; this.style.background='rgba(255,199,0,0.05)';"
                           onblur="this.style.borderColor='var(--border-color, #2C2C2F)'; this.style.background='var(--card-background-color, #1C1C21)';">
                </div>
            </div>
        </div>
    `;
    
    // Renderizar por categoria
    Object.entries(groupedTemplates).forEach(([category, categoryTemplates]) => {
        html += `
            <div class="template-category" data-category="${category}" style="margin-bottom: 32px;">
                <h4 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: var(--text, #ECECEC); display: flex; align-items: center; gap: 12px; padding-bottom: 12px; border-bottom: 2px solid rgba(255,199,0,0.2);">
                    <div style="background: linear-gradient(135deg, #FFC700 0%, #FFA500 100%); padding: 6px 12px; border-radius: 8px; box-shadow: 0 2px 8px rgba(255,199,0,0.3);">
                        <i class="fas fa-folder" style="color: #000; font-size: 14px;"></i>
                    </div>
                    <span>${category}</span>
                </h4>
                <div class="templates-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
        `;
    
        categoryTemplates.forEach(([key, template]) => {
            html += `
                <div class="template-card" data-template-key="${key}" data-category="${category}" data-name="${template.name.toLowerCase()}" data-description="${template.description.toLowerCase()}" style="padding: 24px; background: linear-gradient(135deg, #2C2C2F 0%, #1C1C21 100%); border-radius: 16px; cursor: pointer; transition: all 0.3s; border: 2px solid transparent; position: relative; min-height: 240px; display: flex; flex-direction: column; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, ${template.primary_color} 0%, ${template.primary_color}80 100%);"></div>
                    <div style="position: absolute; top: 16px; right: 16px; background: ${template.primary_color}; color: #000; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; z-index: 1; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                        ${template.fields.length} campo${template.fields.length !== 1 ? 's' : ''}
                    </div>
                    <div style="font-size: 3rem; margin-bottom: 16px; color: ${template.primary_color}; margin-top: 12px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));">
                        <i class="${template.icon}"></i>
                    </div>
                    <div style="font-weight: 700; font-size: 18px; margin-bottom: 10px; color: #ECECEC; line-height: 1.3; letter-spacing: -0.3px;">${template.name}</div>
                    <div style="font-size: 13px; color: #A1A1A1; margin-top: auto; line-height: 1.5; flex: 1; opacity: 0.9;">${template.description}</div>
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <button onclick="previewTemplateFields('${key}')" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: var(--text, #ECECEC); cursor: pointer; font-size: 12px; margin-bottom: 8px; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.1)';" onmouseout="this.style.background='rgba(255,255,255,0.05)';">
                            <i class="fas fa-eye"></i> Ver Campos
                        </button>
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: ${template.primary_color}; font-weight: 600; cursor: pointer;" onclick="applyTemplateToCustomFields(guestListTemplates['${key}'])">
                            <i class="fas fa-plus-circle"></i>
                            <span>Adicionar aos Campos</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    editor.innerHTML = html;
    
    // Adicionar event listeners
    editor.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            const key = this.dataset.templateKey;
            const template = guestListTemplates[key];
            this.style.borderColor = template.primary_color;
            this.style.background = `linear-gradient(135deg, ${template.primary_color}15 0%, #2C2C2F 100%)`;
            this.style.transform = 'translateY(-4px) scale(1.02)';
            this.style.boxShadow = `0 8px 24px ${template.primary_color}40`;
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.borderColor = 'transparent';
            this.style.background = 'linear-gradient(135deg, #2C2C2F 0%, #1C1C21 100%)';
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        });
        
        // Remover click no card inteiro, usar apenas no botão
    });
}

// Preview dos campos do template antes de aplicar
function previewTemplateFields(templateKey) {
    const guestListTemplates = {
        'guest_basic': {
            name: 'Básico',
            fields: [
                { label: 'Empresa/Organização', type: 'short_text', required: false },
                { label: 'Cargo', type: 'short_text', required: false },
                { label: 'Observações', type: 'long_text', required: false }
            ]
        },
        'guest_complete': {
            name: 'Completo',
            fields: [
                { label: 'Data de Nascimento', type: 'date', required: false },
                { label: 'Empresa/Organização', type: 'short_text', required: false },
                { label: 'Cargo', type: 'short_text', required: false },
                { label: 'Tipo de Convidado', type: 'select', required: false, options: ['VIP', 'Convidado', 'Palestrante', 'Patrocinador'] },
                { label: 'Restrições Alimentares', type: 'long_text', required: false },
                { label: 'Necessita Transporte?', type: 'select', required: false, options: ['Sim', 'Não'] },
                { label: 'Observações', type: 'long_text', required: false }
            ]
        },
        'guest_wedding': {
            name: 'Casamento',
            fields: [
                { label: 'Lado da Família', type: 'select', required: false, options: ['Noivo', 'Noiva', 'Ambos'] },
                { label: 'Relação', type: 'short_text', required: false },
                { label: 'Número de Acompanhantes', type: 'number', required: false },
                { label: 'Restrições Alimentares', type: 'long_text', required: false },
                { label: 'Mensagem para os Noivos', type: 'long_text', required: false }
            ]
        },
        'guest_corporate': {
            name: 'Corporativo',
            fields: [
                { label: 'Empresa', type: 'short_text', required: true },
                { label: 'Cargo', type: 'short_text', required: true },
                { label: 'Departamento', type: 'short_text', required: false },
                { label: 'Tipo de Participação', type: 'select', required: false, options: ['Participante', 'Palestrante', 'Patrocinador', 'Organizador'] },
                { label: 'Deseja certificado?', type: 'select', required: false, options: ['Sim', 'Não'] },
                { label: 'Observações', type: 'long_text', required: false }
            ]
        },
        'guest_church': {
            name: 'Igreja',
            fields: [
                { label: '? membro da igreja?', type: 'select', required: false, options: ['Sim', 'Não', 'Visitante'] },
                { label: 'Ministério', type: 'select', required: false, options: ['Louvor', 'Intercessão', 'Ensino', 'Evangelismo', 'Acolhimento', 'Crianças', 'Jovens', 'Outro'] },
                { label: 'Necessita Transporte?', type: 'select', required: false, options: ['Sim', 'Não'] },
                { label: 'Restrições Alimentares', type: 'long_text', required: false },
                { label: 'Observações', type: 'long_text', required: false }
            ]
        }
    };
    
    const template = guestListTemplates[templateKey];
    if (!template) return;
    
    const types = {
        'short_text': 'Texto Curto',
        'long_text': 'Texto Longo',
        'email': 'Email',
        'phone': 'Telefone',
        'number': 'Número',
        'select': 'Seleção',
        'checkbox': 'Múltipla Escolha',
        'date': 'Data'
    };
    
    let fieldsHtml = template.fields.map((field, idx) => {
        let optionsHtml = '';
        if (field.options) {
            const opts = Array.isArray(field.options) ? field.options : field.options.split(',');
            optionsHtml = `<div style="font-size: 11px; color: var(--text-dark, #A1A1A1); margin-top: 4px;">Opções: ${opts.join(', ')}</div>`;
        }
        return `
            <div style="padding: 12px; background: rgba(255,255,255,0.03); border-left: 3px solid var(--dourado-principal, #FFC700); border-radius: 4px; margin-bottom: 8px;">
                <div style="font-weight: 600; color: var(--text, #ECECEC); font-size: 14px;">
                    ${idx + 1}. ${field.label || 'Campo sem nome'} ${field.required ? '<span style="color: #ff4444;">*</span>' : ''}
                </div>
                <div style="font-size: 12px; color: var(--text-dark, #A1A1A1); margin-top: 4px;">
                    Tipo: ${types[field.type] || field.type}
                </div>
                ${optionsHtml}
            </div>
        `;
    }).join('');
    
    const previewModal = document.createElement('div');
    previewModal.className = 'modal active';
    previewModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 10002; display: flex; align-items: center; justify-content: center; padding: 20px;';
    previewModal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto;">
            <div class="modal-header">
                <h2><i class="fas fa-eye"></i> Preview: ${template.name}</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-info">
                <p style="color: var(--text-dark, #A1A1A1); margin-bottom: 20px; font-size: 14px;">
                    Este template adicionará os seguintes campos ao formulário de inscrição:
                </p>
                <div style="max-height: 400px; overflow-y: auto;">
                    ${fieldsHtml}
                </div>
                <div style="margin-top: 24px; display: flex; gap: 12px;">
                    <button onclick="applyTemplateToCustomFields(guestListTemplates['${templateKey}']); this.closest('.modal').remove();" 
                            class="btn btn-primary" style="flex: 1; padding: 14px;">
                        <i class="fas fa-check"></i> Aplicar Template
                    </button>
                    <button onclick="this.closest('.modal').remove()" 
                            class="btn btn-secondary" style="padding: 14px 24px;">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(previewModal);
    
    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) {
            previewModal.remove();
        }
    });
}

// Aplicar template aos campos customizados
function applyTemplateToCustomFields(template) {
    if (!currentGuestList) return;
    
    // Garantir que custom_form_fields seja um array
    let fields = currentGuestList.custom_form_fields || [];
    if (typeof fields === 'string') {
        try {
            fields = JSON.parse(fields);
        } catch (e) {
            fields = [];
        }
    }
    if (!Array.isArray(fields)) {
        fields = [];
    }
    
    // Adicionar campos do template aos existentes
    template.fields.forEach(field => {
        // Verificar se já existe campo com mesmo label
        const exists = fields.some(f => f.label === field.label);
        if (!exists) {
            fields.push({
                ...field,
                order: fields.length + 1
            });
        }
    });
    
    currentGuestList.custom_form_fields = fields;
    
    // Mostrar editor manual com os campos atualizados
    showSimpleCustomFieldsEditor();
    
    // Feedback visual
    alert(`Template "${template.name}" aplicado com sucesso! ${template.fields.length} campo(s) adicionado(s).`);
}

// Mostrar editor simples de campos customizados
function showSimpleCustomFieldsEditor() {
    const editor = document.getElementById('custom-fields-editor');
    if (!editor) return;
    
    if (!currentGuestList) {
        editor.innerHTML = '<p style="color: var(--text-dark, #A1A1A1); text-align: center; padding: 40px;">Carregando dados da lista...</p>';
        return;
    }
    
    let currentFields = currentGuestList.custom_form_fields || [];
    
    // Parsear se for string
    if (typeof currentFields === 'string') {
        try {
            currentFields = JSON.parse(currentFields);
        } catch (e) {
            currentFields = [];
        }
    }
    
    if (!Array.isArray(currentFields)) {
        currentFields = [];
    }
    
    let html = `
        <div style="margin-bottom: 24px;">
            <h3 style="color: var(--dourado-principal, #FFC700); margin-bottom: 16px;">
                <i class="fas fa-list"></i> Campos Customizados
            </h3>
            <p style="color: var(--text-dark, #A1A1A1); margin-bottom: 16px; font-size: 14px;">
                Adicione campos customizados ao formulário de inscrição. Os campos obrigatórios (Nome, WhatsApp, CPF) são sempre incluídos.
            </p>
            <button onclick="addCustomField()" class="btn btn-primary" style="margin-bottom: 20px;">
                <i class="fas fa-plus"></i> Adicionar Campo
            </button>
        </div>
        <div id="custom-fields-list">
    `;
    
    if (currentFields.length === 0) {
        html += '<p style="color: var(--text-dark, #A1A1A1); text-align: center; padding: 40px;">Nenhum campo customizado adicionado ainda.</p>';
    } else {
        currentFields.forEach((field, index) => {
            html += renderCustomFieldItem(field, index);
        });
    }
    
    html += '</div>';
    editor.innerHTML = html;
}

// Renderizar item de campo customizado
function renderCustomFieldItem(field, index) {
    const types = {
        'short_text': 'Texto Curto',
        'long_text': 'Texto Longo',
        'email': 'Email',
        'phone': 'Telefone',
        'number': 'Número',
        'select': 'Seleção',
        'radio': 'Múltipla Escolha',
        'checkbox': 'Caixas de Seleção',
        'date': 'Data'
    };
    
    return `
        <div style="background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 8px; padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--text, #ECECEC); margin-bottom: 4px;">${field.label || 'Campo sem nome'}</div>
                    <div style="font-size: 12px; color: var(--text-dark, #A1A1A1);">Tipo: ${types[field.type] || field.type} ${field.required ? '— Obrigatório' : '— Opcional'}</div>
                </div>
                <button onclick="removeCustomField(${index})" class="btn-icon" style="background: rgba(255, 68, 68, 0.2); color: #ff4444;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            ${field.options ? `<div style="font-size: 12px; color: var(--text-dark, #A1A1A1);">Opções: ${Array.isArray(field.options) ? field.options.join(', ') : field.options}</div>` : ''}
        </div>
    `;
}

// Adicionar campo customizado
function addCustomField() {
    if (!currentGuestList) {
        alert('Lista não carregada');
        return;
    }
    
    const fieldType = prompt('Tipo de campo:\n1. short_text\n2. long_text\n3. email\n4. phone\n5. number\n6. select\n7. radio\n8. checkbox\n9. date\n\nDigite o número:');
    
    const typeMap = {
        '1': 'short_text',
        '2': 'long_text',
        '3': 'email',
        '4': 'phone',
        '5': 'number',
        '6': 'select',
        '7': 'radio',
        '8': 'checkbox',
        '9': 'date'
    };
    
    const type = typeMap[fieldType];
    if (!type) {
        alert('Tipo inválido');
        return;
    }
    
    const label = prompt('Label do campo:');
    if (!label) return;
    
    const required = confirm('Campo obrigatório?');
    
    let options = null;
    if (['select', 'radio', 'checkbox'].includes(type)) {
        const optionsStr = prompt('Opções (separadas por vírgula):');
        if (optionsStr) {
            options = optionsStr.split(',').map(opt => opt.trim());
        }
    }
    
    // Garantir que custom_form_fields seja um array
    let fields = currentGuestList.custom_form_fields || [];
    if (typeof fields === 'string') {
        try {
            fields = JSON.parse(fields);
        } catch (e) {
            fields = [];
        }
    }
    if (!Array.isArray(fields)) {
        fields = [];
    }
    
    fields.push({
        type: type,
        label: label,
        required: required,
        options: options,
        order: fields.length + 1
    });
    
    currentGuestList.custom_form_fields = fields;
    
    showSimpleCustomFieldsEditor();
    updateCustomFieldsPreview();
}

// Remover campo customizado
function removeCustomField(index) {
    if (!currentGuestList) {
        alert('Lista não carregada');
        return;
    }
    
    if (confirm('Remover este campo?')) {
        // Garantir que seja array
        let fields = currentGuestList.custom_form_fields || [];
        if (typeof fields === 'string') {
            try {
                fields = JSON.parse(fields);
            } catch (e) {
                fields = [];
            }
        }
        if (!Array.isArray(fields)) {
            fields = [];
        }
        
        fields.splice(index, 1);
        currentGuestList.custom_form_fields = fields;
        
        showSimpleCustomFieldsEditor();
        updateCustomFieldsPreview();
    }
}

// Atualizar preview de campos customizados
function updateCustomFieldsPreview() {
    const preview = document.getElementById('custom-fields-preview');
    if (!preview) return;
    
    if (!currentGuestList) {
        preview.innerHTML = '<i class="fas fa-info-circle"></i> Nenhum campo customizado definido. Clique em "Editar Campos Customizados" para começar.';
        return;
    }
    
    const fields = currentGuestList.custom_form_fields || [];
    
    // Parsear se for string
    let parsedFields = fields;
    if (typeof fields === 'string') {
        try {
            parsedFields = JSON.parse(fields);
        } catch (e) {
            parsedFields = [];
        }
    }
    
    if (!Array.isArray(parsedFields)) {
        parsedFields = [];
    }
    
    if (parsedFields.length === 0) {
        preview.innerHTML = '<i class="fas fa-info-circle"></i> Nenhum campo customizado definido. Clique em "Editar Campos Customizados" para começar.';
    } else {
        preview.innerHTML = `<strong>${parsedFields.length} campo(s) customizado(s):</strong><br>` +
            parsedFields.map((f, i) => `${i + 1}. ${f.label || 'Campo sem nome'} (${f.type || 'text'})${f.required ? ' *' : ''}`).join('<br>');
    }
}

// Fechar modal de campos customizados
function closeCustomFieldsModal() {
    const modal = document.getElementById('custom-fields-modal');
    if (modal) {
        modal.classList.remove('active');
        // Restaurar scroll do body
        document.body.style.overflow = '';
        // Salvar campos customizados ao fechar
        if (currentGuestList) {
            saveGuestList();
        }
    }
}

// Salvar lista
async function saveGuestList() {
    if (!currentGuestListId || !currentGuestList) {
        alert('Nenhuma lista carregada');
        return;
    }
    
    try {
        const token = getToken();
        const checkbox = document.getElementById('use-custom-form');
        
        const updateData = {
            event_title: currentGuestList.event_title || document.getElementById('event-title')?.textContent || 'Lista de Convidados',
            custom_form_fields: currentGuestList.custom_form_fields || [],
            use_custom_form: checkbox ? checkbox.checked : false
        };
        
        const response = await fetch(`${API_URL}/api/guest-lists/${currentGuestListId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
            const updated = await response.json();
            currentGuestList = updated.guest_list_data || updated;
            
            // Feedback visual
            const saveBtn = document.querySelector('.btn-primary[onclick*="saveGuestList"]');
            if (saveBtn) {
                const originalText = saveBtn.innerHTML;
                saveBtn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
                setTimeout(() => {
                    saveBtn.innerHTML = originalText;
                }, 2000);
            }
        } else {
            throw new Error('Erro ao salvar');
        }
    } catch (error) {
        console.error('Erro ao salvar lista:', error);
        alert('Erro ao salvar lista: ' + error.message);
    }
}

// Função de inicialização da página (chamada pelo DOMContentLoaded)
function initGuestListPage() {
    // Garantir que modais estejam ocultos
    const guestModal = document.getElementById('guest-detail-modal');
    const customFieldsModal = document.getElementById('custom-fields-modal');
    if (guestModal) guestModal.classList.remove('active');
    if (customFieldsModal) customFieldsModal.classList.remove('active');
    
    // Verificar se há parâmetro de aba na URL
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    const itemId = getItemIdFromUrl();
    
    // Inicializar carregamento (já será feito pelo initializeGuestList)
    
    // Se houver parâmetro de aba E itemId, ativar essa aba
    if (itemId && tabParam) {
        if (['registered', 'confirmation', 'confirmed'].includes(tabParam)) {
            setTimeout(() => {
                if (typeof switchTab === 'function') {
                    switchTab(tabParam);
                }
            }, 1000);
        } else if (tabParam === 'links') {
            // Se for a aba Links, carregar links após a lista ser carregada
            setTimeout(() => {
                if (typeof switchTab === 'function') {
                    switchTab('links');
                }
            }, 1500);
        }
    } else {
        // Se não há tabParam mas a aba Links está ativa por padrão, carregar links
        const linksTab = document.getElementById('tab-links');
        if (linksTab && linksTab.classList.contains('active')) {
            setTimeout(() => {
                if (currentGuestListId) {
                    loadPersonalizedLinks();
                    updatePortariaLink();
                }
            }, 2000);
        }
    }
}

// Variável para armazenar todos os convidados (para busca)
let allGuests = [];

// Função de busca/filtro
async function filterGuests(tab, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        // Se não há busca, carregar todos novamente
        await loadGuests();
        return;
    }
    
    // Fazer busca no backend
    try {
        const token = getToken();
        const status = tab === 'registered' || tab === 'confirmation' ? 'registered' : 
                      tab === 'confirmed' ? 'confirmed' : null;
        
        let url = `${API_URL}/api/guest-lists/${currentGuestListId}/guests?search=${encodeURIComponent(searchTerm.trim())}&limit=100&offset=0`;
        if (status) {
            url += `&status=${status}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const page = normalizeGuestsPayload(await response.json());
            guests = page.guests;
            guestsListMeta = {
                total: page.total,
                limit: page.limit,
                offset: page.offset,
                hasMore: page.hasMore,
            };
            renderGuests();
        }
    } catch (error) {
        console.error('Erro ao buscar convidados:', error);
    }
}

// Visualizar detalhes completos do convidado
async function viewGuestDetails(guestId) {
    const guest = guests.find(g => g.id === guestId);
    if (!guest) {
        alert('Convidado não encontrado');
        return;
    }
    
    const modal = document.getElementById('guest-detail-modal');
    const content = document.getElementById('guest-detail-content');
    
    if (!modal || !content) return;
    
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('pt-BR');
    };
    
    content.innerHTML = `
        <div class="info-row">
            <div class="info-label">Nome Completo:</div>
            <div class="info-value">${guest.name || '-'}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Email:</div>
            <div class="info-value">${guest.email || '-'}</div>
        </div>
        <div class="info-row">
            <div class="info-label">WhatsApp:</div>
            <div class="info-value">${guest.whatsapp || '-'}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Telefone:</div>
            <div class="info-value">${guest.phone || '-'}</div>
        </div>
        <div class="info-row">
            <div class="info-label">CPF/CNPJ:</div>
            <div class="info-value">${guest.document || '-'}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Endereço:</div>
            <div class="info-value">${guest.address || '-'}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Bairro:</div>
            <div class="info-value">${guest.neighborhood || '-'}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Cidade:</div>
            <div class="info-value">${guest.city || '-'}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Estado:</div>
            <div class="info-value">${guest.state || '-'}</div>
        </div>
        <div class="info-row">
            <div class="info-label">CEP:</div>
            <div class="info-value">${guest.zipcode || '-'}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Instagram:</div>
            <div class="info-value">${guest.instagram ? '@' + guest.instagram.replace('@', '') : '-'}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Status:</div>
            <div class="info-value"><span class="status-badge status-${guest.status}">${getStatusLabel(guest.status)}</span></div>
        </div>
        <div class="info-row">
            <div class="info-label">Inscrito em:</div>
            <div class="info-value">${formatDate(guest.created_at)}</div>
        </div>
        ${guest.confirmed_at ? `
        <div class="info-row">
            <div class="info-label">Confirmado em:</div>
            <div class="info-value">${formatDate(guest.confirmed_at)}</div>
        </div>
        ` : ''}
        ${guest.checked_in_at ? `
        <div class="info-row">
            <div class="info-label">Conferido em:</div>
            <div class="info-value">${formatDate(guest.checked_in_at)}</div>
        </div>
        ` : ''}
        ${guest.notes ? `
        <div class="info-row">
            <div class="info-label">Observações:</div>
            <div class="info-value">${guest.notes}</div>
        </div>
        ` : ''}
    `;
    
    modal.classList.add('active');
}

// Fechar modal de detalhes
function closeGuestDetailModal() {
    const modal = document.getElementById('guest-detail-modal');
    if (modal) {
        modal.classList.remove('active');
        // Restaurar scroll do body
        document.body.style.overflow = '';
    }
}

// Deletar lista de convidados
async function deleteGuestList() {
    if (!currentGuestListId) {
        alert('Nenhuma lista selecionada');
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir esta lista? Esta ação não pode ser desfeita e todos os convidados serão removidos.')) {
        return;
    }
    
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/guest-lists/${currentGuestListId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            alert('Lista deletada com sucesso');
            // Voltar para a listagem de todas as listas
            window.location.href = '/guestListEdit';
        } else {
            const error = await response.json().catch(() => ({ message: 'Erro ao deletar lista' }));
            throw new Error(error.message);
        }
    } catch (error) {
        console.error('Erro ao deletar lista:', error);
        alert('Erro ao deletar lista: ' + error.message);
    }
}

// Exportar para PDF
async function exportToPDF(tab) {
    if (!currentGuestListId) {
        alert('Nenhuma lista selecionada');
        return;
    }
    
    try {
        const token = getToken();
        const status = tab === 'registered' || tab === 'confirmation' ? 'registered' : 
                      tab === 'confirmed' ? 'confirmed' : null;
        
        let url = `${API_URL}/api/guest-lists/${currentGuestListId}/export/pdf`;
        if (status) {
            url += `?status=${status}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const exported = data.exported != null ? data.exported : data.total;
            const trunc = data.truncated ? `\n(truncado: ${exported} de ${data.total}; use limit=10000 se necessário)` : '';
            // Por enquanto, apenas mostrar os dados (PDF será implementado depois)
            alert(`Exportação preparada: ${data.total} convidados encontrados.${trunc}\n\nEm breve: download direto do PDF.`);
            console.log('Dados para exportação:', data);
        } else {
            throw new Error('Erro ao exportar');
        }
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        alert('Erro ao exportar PDF: ' + error.message);
    }
}

// Fechar modal ao clicar fora
document.addEventListener('click', (e) => {
    const guestModal = document.getElementById('guest-detail-modal');
    const customFieldsModal = document.getElementById('custom-fields-modal');
    
    if (guestModal && e.target === guestModal) {
        closeGuestDetailModal();
    }
    
    if (customFieldsModal && e.target === customFieldsModal) {
        closeCustomFieldsModal();
    }
});

// Fechar modais com tecla ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const guestModal = document.getElementById('guest-detail-modal');
        const customFieldsModal = document.getElementById('custom-fields-modal');
        
        if (guestModal && guestModal.classList.contains('active')) {
            closeGuestDetailModal();
        }
        
        if (customFieldsModal && customFieldsModal.classList.contains('active')) {
            closeCustomFieldsModal();
        }
    }
});

