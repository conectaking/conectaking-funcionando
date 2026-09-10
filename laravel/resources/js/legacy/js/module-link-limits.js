/**
 * Módulo Isolado: Controle de Quantidade de Links por Plano
 * Sistema completamente separado para gerenciar limites de links
 */

(function() {
    'use strict';

    // Namespace isolado (usa window.API_URL atual)
    const LinkLimitsModule = {
        get API_URL() { return window.API_URL || ''; },
        limitsData: null,
        plans: [],
        modules: [],
        changedLimits: new Map(),

        /**
         * Inicializar módulo
         */
        async init() {
            console.log('[LinkLimitsModule] Inicializando módulo isolado...');
            await this.loadData();
            this.setupEventListeners();
        },

        /**
         * Carregar e renderizar limites (chamado ao abrir a aba)
         */
        async loadLinkLimits() {
            await this.loadData();
            this.renderGrid();
        },

        /**
         * Carregar dados (planos e limites)
         */
        async loadData() {
            try {
                // Garantir que arrays não sejam null
                this.plans = this.plans || [];
                this.limitsData = this.limitsData || [];
                this.modules = this.modules || [];

                // Buscar planos ativos
                const plansResponse = await this.safeFetch(`${this.API_URL}/api/modules/plan-availability`, {
                    headers: this.getAuthHeaders()
                });

                if (plansResponse.ok) {
                    const plansData = await plansResponse.json();
                    this.plans = Array.isArray(plansData.plans) ? plansData.plans : [];
                }

                // Buscar todos os limites (admin) - se 403, manter array vazio
                const limitsResponse = await this.safeFetch(`${this.API_URL}/api/link-limits`, {
                    headers: this.getAuthHeaders()
                });

                if (limitsResponse.ok) {
                    const limitsData = await limitsResponse.json();
                    this.limitsData = Array.isArray(limitsData.data) ? limitsData.data : [];
                } else {
                    this.limitsData = [];
                }

                // Extrair módulos nicos dos limites (sempre usar array)
                const moduleSet = new Set();
                (this.limitsData || []).forEach(limit => {
                    if (limit && limit.module_type) moduleSet.add(limit.module_type);
                });
                this.modules = Array.from(moduleSet).sort();

                this.loadError = null;
                console.log('[LinkLimitsModule] Dados carregados:', {
                    plans: this.plans.length,
                    modules: this.modules.length,
                    limits: this.limitsData.length
                });
            } catch (error) {
                this.loadError = error;
                console.error('[LinkLimitsModule] Erro ao carregar dados:', error);
            }
        },

        /**
         * Renderizar grid de limites
         */
        renderGrid() {
            const gridContainer = document.getElementById('link-limits-grid');
            if (!gridContainer) return;

            if (!this.plans.length) {
                var isNetworkError = this.loadError && (this.loadError.message || '').toLowerCase().indexOf('fetch') !== -1;
                var msg = isNetworkError
                    ? 'Não foi possível conectar à API. Em desenvolvimento: suba o stack local (<code>docker compose up</code> / porta <code>8080</code>). Em produção, confira a sessão e a origem da API.'
                    : 'Sem permissão para ver os planos ou nenhum plano ativo. Apenas administradores podem configurar limites de links.';
                gridContainer.innerHTML = '<p style="color: var(--text-secondary, #888888); text-align: center; padding: 40px;">' + msg + '</p>';
                return;
            }

            if (!this.modules.length) {
                gridContainer.innerHTML = '<p style="color: var(--text-secondary, #888888); text-align: center; padding: 40px;">Nenhum limite configurado ainda. Os limites seráo exibidos apa primeira configuração ou execute a migration 134_create_module_link_limits.sql no banco.</p>';
                return;
            }

            // Criar tabela
            let html = '<table style="width: 100%; border-collapse: collapse; min-width: 800px;">';
            
            // Cabealho
            html += '<thead><tr>';
            html += '<th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border-color, #333); color: var(--text-primary, #F5F5F5); font-weight: 600;">Módulo</th>';
            this.plans.forEach(plan => {
                html += `<th style="padding: 12px; text-align: center; border-bottom: 2px solid var(--border-color, #333); color: var(--text-primary, #F5F5F5); font-weight: 600; min-width: 120px;">${plan.plan_name}</th>`;
            });
            html += '</tr></thead>';

            // Corpo
            html += '<tbody>';
            this.modules.forEach(moduleType => {
                const moduleLabel = this.getModuleLabel(moduleType);
                html += '<tr>';
                html += `<td style="padding: 12px; border-bottom: 1px solid var(--border-color, #333); color: var(--text-primary, #F5F5F5);">${moduleLabel}</td>`;
                
                this.plans.forEach(plan => {
                    const limit = this.getLimit(moduleType, plan.plan_code);
                    const limitValue = limit ? limit.max_links : null;
                    const inputId = `limit_${moduleType}_${plan.plan_code}`;
                    
                    html += `<td style="padding: 12px; border-bottom: 1px solid var(--border-color, #333); text-align: center;">`;
                    html += `<input type="number" 
                                    id="${inputId}"
                                    data-module="${moduleType}"
                                    data-plan="${plan.plan_code}"
                                    value="${limitValue !== null ? limitValue : ''}"
                                    placeholder="Ilimitado"
                                    min="0"
                                    max="10000"
                                    style="width: 100%; max-width: 100px; padding: 8px; border-radius: 6px; border: 1px solid var(--border-color, #333); background: var(--input-bg, #0B0B0B); color: var(--text-primary, #F5F5F5); text-align: center;"
                                    onchange="window.moduleLinkLimits.onLimitChange('${moduleType}', '${plan.plan_code}', this.value)">`;
                    html += '</td>';
                });
                
                html += '</tr>';
            });
            html += '</tbody></table>';

            gridContainer.innerHTML = html;
        },

        /**
         * Obter limite específico
         */
        getLimit(moduleType, planCode) {
            return this.limitsData.find(l => l.module_type === moduleType && l.plan_code === planCode);
        },

        /**
         * Obter label do módulo
         */
        getModuleLabel(moduleType) {
            const labels = {
                'banner': 'Banner',
                'whatsapp': 'WhatsApp',
                'instagram': 'Instagram',
                'telegram': 'Telegram',
                'email': 'Email',
                'facebook': 'Facebook',
                'youtube': 'YouTube',
                'tiktok': 'TikTok',
                'twitter': 'Twitter',
                'spotify': 'Spotify',
                'linkedin': 'LinkedIn',
                'pinterest': 'Pinterest',
                'link': 'Link Personalizado',
                'portfolio': 'Portflio',
                'carousel': 'Carrossel',
                'youtube_embed': 'YouTube Incorporado',
                'instagram_embed': 'Instagram Incorporado',
                'sales_page': 'Loja Virtual',
                'digital_form': 'King Forms',
                'pix': 'PIX',
                'pix_qrcode': 'PIX QR Code'
            };
            return labels[moduleType] || moduleType;
        },

        /**
         * Handler de mudana de limite
         */
        onLimitChange(moduleType, planCode, value) {
            const key = `${moduleType}_${planCode}`;
            const numValue = value === '' ? null : parseInt(value, 10);
            
            if (isNaN(numValue) && value !== '') {
                alert('Por favor, insira um número válido ou deixe em branco para ilimitado.');
                return;
            }

            if (numValue !== null && numValue < 0) {
                alert('O valor não pode ser negativo.');
                return;
            }

            // Armazenar mudana
            this.changedLimits.set(key, {
                module_type: moduleType,
                plan_code: planCode,
                max_links: numValue
            });

            // Mostrar botão de salvar
            const saveBtn = document.getElementById('save-link-limits-btn');
            if (saveBtn) {
                saveBtn.style.display = 'inline-block';
            }
        },

        /**
         * Salvar limites alterados
         */
        async saveLimits() {
            if (this.changedLimits.size === 0) {
                alert('Nenhuma alterao para salvar.');
                return;
            }

            try {
                const limits = Array.from(this.changedLimits.values());
                
                const response = await this.safeFetch(`${this.API_URL}/api/link-limits/bulk-update`, {
                    method: 'POST',
                    headers: {
                        ...this.getAuthHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ limits })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: { message: 'Erro ao salvar' } }));
                    throw new Error(errorData.error?.message || 'Erro ao salvar limites');
                }

                const result = await response.json();
                
                // Atualizar dados locais
                limits.forEach(limit => {
                    const existingIndex = this.limitsData.findIndex(
                        l => l.module_type === limit.module_type && l.plan_code === limit.plan_code
                    );
                    
                    if (existingIndex >= 0) {
                        this.limitsData[existingIndex].max_links = limit.max_links;
                    } else {
                        this.limitsData.push(limit);
                    }
                });

                // Limpar mudanas
                this.changedLimits.clear();

                // Esconder botão de salvar
                const saveBtn = document.getElementById('save-link-limits-btn');
                if (saveBtn) {
                    saveBtn.style.display = 'none';
                }

                alert('Limites salvos com sucesso!');
                
                // Recarregar grid
                this.renderGrid();
            } catch (error) {
                console.error('[LinkLimitsModule] Erro ao salvar limites:', error);
                alert('Erro ao salvar limites: ' + error.message);
            }
        },

        /**
         * Configurar event listeners
         */
        setupEventListeners() {
            // Botão salvar
            const saveBtn = document.getElementById('save-link-limits-btn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => this.saveLimits());
            }

            // Filtros
            const filterModule = document.getElementById('link-limits-filter-module');
            const filterPlan = document.getElementById('link-limits-filter-plan');

            if (filterModule) {
                filterModule.addEventListener('input', () => this.applyFilters());
            }

            if (filterPlan) {
                filterPlan.addEventListener('input', () => this.applyFilters());
            }
        },

        /**
         * Aplicar filtros
         */
        applyFilters() {
            // Implementar filtros se necessrio
            this.renderGrid();
        },

        /**
         * Helper: Safe fetch
         */
        async safeFetch(url, options = {}) {
            try {
                return await fetch(url, options);
            } catch (error) {
                console.error('[LinkLimitsModule] Erro na requisio:', error);
                throw error;
            }
        },

        /**
         * Resetar limites de um plano (admin)
         */
        async resetPlanLimits(planCode) {
            if (!planCode) {
                alert('Por favor, selecione um plano para resetar.');
                return;
            }

            if (!confirm(`Tem certeza que deseja resetar todos os limites do plano "${planCode}" para ilimitado?`)) {
                return;
            }

            try {
                const response = await this.safeFetch(`${this.API_URL}/api/link-limits/reset-plan`, {
                    method: 'POST',
                    headers: {
                        ...this.getAuthHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ plan_code: planCode })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: { message: 'Erro ao resetar limites' } }));
                    throw new Error(errorData.error?.message || 'Erro ao resetar limites');
                }

                alert('Limites resetados com sucesso!');
                
                // Recarregar dados e renderizar
                await this.loadData();
                this.renderGrid();
            } catch (error) {
                console.error('[LinkLimitsModule] Erro ao resetar limites:', error);
                alert('Erro ao resetar limites: ' + error.message);
            }
        },

        /**
         * Helper: Obter headers de autenticao
         */
        getAuthHeaders() {
            const token = localStorage.getItem('token') || localStorage.getItem('conectaKingToken') || sessionStorage.getItem('token') || sessionStorage.getItem('conectaKingToken');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = 'Bearer ' + token;
            return headers;
        }
    };

    // Função global para reset (chamada do HTML)
    window.resetLinkLimits = function() {
        const planCode = prompt('Digite o código do plano para resetar (ex: basic, premium):');
        if (planCode) {
            LinkLimitsModule.resetPlanLimits(planCode.trim());
        }
    };

    // Exportar para window
    window.moduleLinkLimits = LinkLimitsModule;

    // Auto-inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Aguardar um pouco para garantir que outros módulos carregaram
            setTimeout(() => LinkLimitsModule.init(), 500);
        });
    } else {
        setTimeout(() => LinkLimitsModule.init(), 500);
    }
})();
