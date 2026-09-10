/**
 * Dashboard Sales Page - Gerenciamento de Páginas de Vendas
 * Funcionalidades: Preview, URLs públicas, status, etc.
 */

(function() {
    'use strict';

    const DashboardSalesPage = {
        /**
         * Atualizar preview da página
         */
        async updatePreview() {
            const iframe = document.getElementById('preview-iframe');
            const salesPageId = window.SALES_PAGE_EDIT_DATA?.salesPageId;
            const itemId = window.SALES_PAGE_EDIT_DATA?.itemId;

            if (!iframe || !salesPageId || !itemId) {
                console.warn('Preview: dados não disponíveis');
                return;
            }

            try {
                // Buscar dados atuais da página
                const salesPage = await this.getSalesPageData(salesPageId);
                if (!salesPage) {
                    iframe.src = 'about:blank';
                    return;
                }

                // Buscar profile_slug do usuário
                // IMPORTANTE: O primeiro slug deve ser o profile_slug do usuário, NÃO o slug da sales_page
                // A rota é: /:profile_slug/loja/:itemId
                let userProfileSlug = window.SALES_PAGE_EDIT_DATA?.profileSlug;
                
                if (!userProfileSlug) {
                    try {
                        const API_URL = String(window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');
                        const token = localStorage.getItem('conectaKingToken') || localStorage.getItem('token');
                        const profileRes = await fetch(`${API_URL}/api/profile`, {
                            credentials: 'include',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        if (profileRes.ok) {
                            const profileData = await profileRes.json();
                            userProfileSlug = profileData.details?.profile_slug || profileData.profile_slug;
                            // Armazenar para uso futuro
                            if (userProfileSlug) {
                                window.SALES_PAGE_EDIT_DATA.profileSlug = userProfileSlug;
                            }
                        }
                    } catch (e) {
                        console.error('Erro ao buscar profile_slug:', e);
                    }
                }
                
                if (!userProfileSlug) {
                    console.error('Profile slug não encontrado. Não é possível gerar preview.');
                    iframe.src = 'about:blank';
                    return;
                }
                
                // Usar URL completa do servidor de produção
                // A rota pública está no mesmo servidor da API
                const baseUrl = String(window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');
                
                // Se estiver em DRAFT, usar token de preview
                // Rota: /:profile_slug/loja/:itemId
                let previewUrl = `${baseUrl}/${userProfileSlug}/loja/${itemId}`;
                if (salesPage.status === 'DRAFT' && salesPage.preview_token) {
                    previewUrl += `?token=${salesPage.preview_token}`;
                }

                // Atualizar iframe
                iframe.src = previewUrl;

                // Atualizar link de abrir em nova aba
                const btnOpenPreview = document.getElementById('btn-open-preview');
                if (btnOpenPreview) {
                    btnOpenPreview.href = previewUrl;
                    btnOpenPreview.target = '_blank';
                }
            } catch (error) {
                console.error('Erro ao atualizar preview:', error);
            }
        },

        /**
         * Buscar dados da página de vendas
         */
        async getSalesPageData(salesPageId) {
            try {
                const API_URL = String(window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');
                const token = localStorage.getItem('conectaKingToken') || localStorage.getItem('token');
                const response = await fetch(`${API_URL}/api/v1/sales-pages/${salesPageId}`, {
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Erro ao buscar dados da página');
                }

                const data = await response.json();
                return data.data;
            } catch (error) {
                console.error('Erro ao buscar dados da página:', error);
                return null;
            }
        },

        /**
         * Obter URL pública da página
         */
        getPublicUrl(salesPage) {
            if (!salesPage || salesPage.status !== 'PUBLISHED') {
                return null;
            }

            const itemId = window.SALES_PAGE_EDIT_DATA?.itemId;
            const slug = salesPage.slug || 'loja';
            return `/${slug}/loja/${itemId}`;
        },

        /**
         * Copiar URL pública para clipboard
         */
        async copyPublicUrl() {
            const salesPage = window.SalesPageEdit?.getCurrentSalesPage();
            if (!salesPage) {
                alert('Página não carregada');
                return;
            }

            const url = this.getPublicUrl(salesPage);
            if (!url) {
                alert('Página precisa estar publicada para gerar URL pública');
                return;
            }

            const fullUrl = `${window.location.origin}${url}`;
            
            try {
                await navigator.clipboard.writeText(fullUrl);
                alert('URL copiada para a área de transferência!');
            } catch (error) {
                // Fallback para navegadores antigos
                const textArea = document.createElement('textarea');
                textArea.value = fullUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('URL copiada para a área de transferência!');
            }
        },

        /**
         * Obter preview token para página em DRAFT
         */
        async getPreviewToken(salesPageId) {
            try {
                const salesPage = await this.getSalesPageData(salesPageId);
                return salesPage?.preview_token || null;
            } catch (error) {
                console.error('Erro ao obter preview token:', error);
                return null;
            }
        },

        /**
         * Verificar se página está publicada
         */
        isPublished(salesPage) {
            return salesPage && salesPage.status === 'PUBLISHED';
        },

        /**
         * Verificar se página está em rascunho
         */
        isDraft(salesPage) {
            return salesPage && salesPage.status === 'DRAFT';
        },

        /**
         * Verificar se página está pausada
         */
        isPaused(salesPage) {
            return salesPage && salesPage.status === 'PAUSED';
        },

        /**
         * Verificar se página está arquivada
         */
        isArchived(salesPage) {
            return salesPage && salesPage.status === 'ARCHIVED';
        },

        /**
         * Obter status badge class
         */
        getStatusBadgeClass(status) {
            const classes = {
                'PUBLISHED': 'status-badge-published',
                'DRAFT': 'status-badge-draft',
                'PAUSED': 'status-badge-paused',
                'ARCHIVED': 'status-badge-archived'
            };
            return classes[status] || 'status-badge-default';
        },

        /**
         * Obter status label em português
         */
        getStatusLabel(status) {
            const labels = {
                'PUBLISHED': 'Publicado',
                'DRAFT': 'Rascunho',
                'PAUSED': 'Pausado',
                'ARCHIVED': 'Arquivado'
            };
            return labels[status] || status;
        }
    };

    // Exportar para escopo global
    window.DashboardSalesPage = DashboardSalesPage;

})();

