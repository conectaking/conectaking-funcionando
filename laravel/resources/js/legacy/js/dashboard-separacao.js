/**
 * Dashboard Separação de Pacotes (ADM) — módulo isolado (Conecta King).
 * Gerado por scripts/improve-dashboard-final.js
 */
(function (global) {
    'use strict';

    function core() { return global.DashboardCore || {}; }

    var env = {
        get API_URL() {
            var c = core();
            if (typeof c.getApiUrl === 'function') return c.getApiUrl() || '';
            return global.API_URL || global.API_BASE || '';
        },
        get HEADERS() {
            var c = core();
            if (typeof c.getHeaders === 'function') return c.getHeaders() || {};
            return { 'Content-Type': 'application/json' };
        },
        get HEADERS_AUTH() {
            var c = core();
            if (typeof c.getHeadersAuth === 'function') return c.getHeadersAuth() || {};
            return {};
        },
        safeFetch: function (url, options) {
            var c = core();
            if (typeof c.safeFetch === 'function') return c.safeFetch(url, options);
            return fetch(url, options);
        }
    };

var moduleAvailabilityData = null;
var moduleAvailabilityChanges = {};


// Event listener para upload de foto de perfil já foi configurado anteriormente
// Não duplicar aqui para evitar conflitos

// ============================================
// SEPARAÇÃO DE PACOTES (ADM)
// ============================================

async function checkAdminAndShowLink() {
    try {
        const response = await env.safeFetch(`${env.API_URL}/api/account/status`, {
            method: 'GET',
            headers: env.HEADERS_AUTH
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
        const response = await env.safeFetch(`${env.API_URL}/api/modules/plan-availability`, {
            method: 'GET',
            headers: env.HEADERS_AUTH
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

        const response = await env.safeFetch(`${env.API_URL}/api/modules/plan-availability`, {
            method: 'PUT',
            headers: {
                ...env.HEADERS_AUTH,
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
        // Atualizar visibilidade dos botões do menu (Gestão Financeira, Contratos, Agenda) sem recarregar a página
        try {
            const statusRes = await env.safeFetch(`${env.API_URL}/api/account/status`, { headers: env.HEADERS_AUTH });
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

            const response = await env.safeFetch(`${env.API_URL}/api/modules/plan-availability`, {
                method: 'PUT',
                headers: {
                    ...env.HEADERS_AUTH,
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
                const statusRes = await env.safeFetch(`${env.API_URL}/api/account/status`, { headers: env.HEADERS_AUTH });
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
        const response = await env.safeFetch(`${env.API_URL}/api/modules/individual-plans`, {
            method: 'GET',
            headers: env.HEADERS_AUTH
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
        const usersResponse = await env.safeFetch(`${env.API_URL}/api/modules/users-list`, {
            headers: env.HEADERS_AUTH
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
        const response = await env.safeFetch(`${env.API_URL}/api/modules/individual-plans/${userId}`, {
            headers: env.HEADERS_AUTH
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


        let maxFinanceProfiles = 1;
        const financeProfilesEl = document.getElementById('user-modules-finance-profiles');
        if (financeProfilesEl) {
            const v = parseInt(financeProfilesEl.value, 10);
            if (v >= 1 && v <= 20) maxFinanceProfiles = v;
        }

        const response = await env.safeFetch(`${env.API_URL}/api/modules/individual-plans/${userId}`, {
            method: 'PUT',
            headers: {
                ...env.HEADERS_AUTH,
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
        const response = await env.safeFetch(`${env.API_URL}/api/modules/individual-plans/${userId}`, {
            method: 'PUT',
            headers: {
                ...env.HEADERS_AUTH,
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


    var DashboardSeparacao = {
        checkAdminAndShowLink: checkAdminAndShowLink,
        loadModuleAvailability: loadModuleAvailability,
        renderModuleAvailability: renderModuleAvailability
    };
    global.DashboardSeparacao = DashboardSeparacao;
    if (typeof checkAdminAndShowLink === 'function') {
        checkAdminAndShowLink();
    }

})(typeof window !== 'undefined' ? window : this);
