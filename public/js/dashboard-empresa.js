/**
 * Dashboard Empresa / Branding — módulo isolado do dashboard (Conecta King).
 * Depende de window.DashboardCore (definido em dashboard.js).
 * Gerado/atualizado por scripts/extract-dashboard-modules.js
 */
(function (global) {
    'use strict';

    function core() {
        return global.DashboardCore || {};
    }

    var env = {
        get API_URL() {
            var c = core();
            if (typeof c.getApiUrl === 'function') return c.getApiUrl() || '';
            return global.API_URL || global.API_BASE || '';
        },
        get HEADERS_AUTH() {
            var c = core();
            if (typeof c.getHeadersAuth === 'function') return c.getHeadersAuth() || {};
            if (typeof c.getAuthHeaders === 'function') return c.getAuthHeaders();
            return {};
        },
        getAuthHeaders: function () {
            var c = core();
            if (typeof c.getAuthHeaders === 'function') return c.getAuthHeaders();
            return this.HEADERS_AUTH;
        },
        getHeaders: function () {
            var c = core();
            if (typeof c.getHeaders === 'function') return c.getHeaders();
            return this.getAuthHeaders();
        },
        safeFetch: function (url, options) {
            var c = core();
            if (typeof c.safeFetch === 'function') return c.safeFetch(url, options);
            return fetch(url, options);
        }
    };


// ============================================
// PERSONALIZAÇÃO DA MARCA
// ============================================

// Carregar dados de branding
async function loadBrandingData() {
    try {
        const response = await env.safeFetch(`${env.API_URL}/api/account/status`, {
            headers: env.HEADERS_AUTH
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar dados');
        }

        const user = await response.json();
        const logoUrl = user.companyLogoUrl || user.company_logo_url || '';
        const logoSize = user.companyLogoSize || user.company_logo_size || 60;
        const logoLink = user.companyLogoLink || user.company_logo_link || '';

        // Preencher formulário
        const logoUrlInput = document.getElementById('branding-logo-url');
        const logoSizeInput = document.getElementById('branding-logo-size');
        const logoLinkInput = document.getElementById('branding-logo-link');
        const logoPreview = document.getElementById('branding-logo-preview');
        const noLogoMsg = document.getElementById('branding-no-logo');

        if (logoUrlInput) logoUrlInput.value = logoUrl;
        if (logoSizeInput) logoSizeInput.value = logoSize;
        if (logoLinkInput) logoLinkInput.value = logoLink;

        // Atualizar preview
        if (logoUrl && logoPreview && noLogoMsg) {
            logoPreview.src = logoUrl;
            logoPreview.style.display = 'block';
            logoPreview.style.maxHeight = logoSize + 'px';
            noLogoMsg.style.display = 'none';
        } else if (logoPreview && noLogoMsg) {
            logoPreview.style.display = 'none';
            noLogoMsg.style.display = 'block';
        }
        // Atualizar logo na pré-visualização lateral (mockup do telemóvel)
        const previewBrandingLogo = document.getElementById('preview-branding-logo');
        if (previewBrandingLogo) {
            if (logoUrl) {
                previewBrandingLogo.src = logoUrl;
                previewBrandingLogo.style.display = 'block';
                previewBrandingLogo.style.maxHeight = Math.min(logoSize, 80) + 'px';
            } else {
                previewBrandingLogo.src = '';
                previewBrandingLogo.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Erro ao carregar dados de branding:', error);
    }
}

// Salvar dados de branding
async function saveBranding(event) {
    if (event) event.preventDefault();

    try {
        const logoUrl = document.getElementById('branding-logo-url').value.trim();
        const logoSize = parseInt(document.getElementById('branding-logo-size').value) || 60;
        const logoLink = document.getElementById('branding-logo-link').value.trim();

        if (!logoUrl) {
            alert('Por favor, faça upload de uma imagem do logo.');
            return;
        }

        const response = await env.safeFetch(`${env.API_URL}/api/business/branding`, {
            method: 'PUT',
            headers: {
                ...env.HEADERS_AUTH,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                logoUrl: logoUrl,
                logoSize: logoSize,
                logoLink: logoLink || null
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Erro ao salvar' }));
            throw new Error(errorData.message || 'Erro ao salvar personalização da marca');
        }

        const result = await response.json();
        alert(result.message || 'Personalização da marca salva com sucesso!');

        // Atualizar preview
        await loadBrandingData();

    } catch (error) {
        console.error('Erro ao salvar branding:', error);
        alert('Erro ao salvar: ' + error.message);
    }
}

// Limpar branding (remove logo no servidor e no formulário)
async function clearBranding() {
    if (!confirm('Tem certeza que deseja remover o logo da empresa?')) {
        return;
    }

    try {
        const response = await env.safeFetch(`${env.API_URL}/api/business/branding`, {
            method: 'PUT',
            headers: { ...env.HEADERS_AUTH, 'Content-Type': 'application/json' },
            body: JSON.stringify({ logoUrl: '', logoSize: 60, logoLink: null })
        });
        if (response.ok) {
            const result = await response.json();
            if (result.message) alert(result.message);
        }
    } catch (e) {
        console.error('Erro ao remover logo:', e);
        alert('Erro ao remover logo. Tente novamente.');
    }

    document.getElementById('branding-logo-url').value = '';
    document.getElementById('branding-logo-size').value = '60';
    document.getElementById('branding-logo-link').value = '';
    document.getElementById('branding-logo-upload').value = '';

    const logoPreview = document.getElementById('branding-logo-preview');
    const noLogoMsg = document.getElementById('branding-no-logo');
    if (logoPreview) { logoPreview.src = ''; logoPreview.style.display = 'none'; }
    if (noLogoMsg) noLogoMsg.style.display = 'block';
    const previewBrandingLogo = document.getElementById('preview-branding-logo');
    if (previewBrandingLogo) { previewBrandingLogo.src = ''; previewBrandingLogo.style.display = 'none'; }
}

// Event listeners para formulário de branding
const brandingForm = document.getElementById('branding-form');
if (brandingForm) {
    brandingForm.addEventListener('submit', saveBranding);
}

// Upload de imagem
const brandingUpload = document.getElementById('branding-logo-upload');
if (brandingUpload) {
    brandingUpload.addEventListener('change', async function (e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione um arquivo de imagem válido.');
            return;
        }

        try {
            // Usar o mesmo fluxo que funciona no resto do dashboard: auth + upload direto ao Cloudflare
            const authResponse = await env.safeFetch(`${env.API_URL}/api/upload/auth`, {
                method: 'POST',
                headers: env.HEADERS_AUTH
            });
            if (!authResponse.ok) {
                const errData = await authResponse.json().catch(() => ({}));
                throw new Error(errData.message || 'Falha na autorização do upload');
            }
            const authData = await authResponse.json();
            const uploadURL = authData.uploadURL;
            const accountHash = authData.accountHash || 'MBdqwyqeFtFBvKiQjgzjtQ';
            if (!uploadURL) throw new Error('URL de upload não retornada');

            const formData = new FormData();
            formData.append('file', file);
            const uploadResponse = await fetch(uploadURL, { method: 'POST', headers: env.getAuthHeaders(), body: formData });
            if (!uploadResponse.ok) throw new Error('Falha no envio da imagem');

            const uploadData = await uploadResponse.json();
            // R2 devolve url/imageUrl; Cloudflare Images devolve result.id
            const imageUrl = (uploadData.url || uploadData.imageUrl)
                || (uploadData.result && uploadData.result.variants && uploadData.result.variants[0])
                || (uploadData.result && uploadData.result.id
                    ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public`
                    : '');
            if (!imageUrl) throw new Error('Resposta do upload inválida');

            document.getElementById('branding-logo-url').value = imageUrl;

            const logoPreview = document.getElementById('branding-logo-preview');
            const noLogoMsg = document.getElementById('branding-no-logo');
            if (logoPreview) {
                logoPreview.src = imageUrl;
                logoPreview.style.display = 'block';
                if (noLogoMsg) noLogoMsg.style.display = 'none';
            }
            const previewBrandingLogo = document.getElementById('preview-branding-logo');
            if (previewBrandingLogo) {
                previewBrandingLogo.src = imageUrl;
                previewBrandingLogo.style.display = 'block';
                const sz = parseInt(document.getElementById('branding-logo-size')?.value, 10) || 60;
                previewBrandingLogo.style.maxHeight = Math.min(sz, 80) + 'px';
            }
        } catch (error) {
            console.error('Erro ao fazer upload:', error);
            alert('Erro ao fazer upload da imagem: ' + (error.message || 'Tente novamente.'));
        }
    });
}

// Tornar funções globais
window.clearBranding = clearBranding;

    var DashboardEmpresa = global.DashboardEmpresa || {};
    DashboardEmpresa.loadBrandingData = typeof loadBrandingData === 'function' ? loadBrandingData : DashboardEmpresa.loadBrandingData;
    DashboardEmpresa.saveBranding = typeof saveBranding === 'function' ? saveBranding : DashboardEmpresa.saveBranding;
    DashboardEmpresa.clearBranding = typeof clearBranding === 'function' ? clearBranding : DashboardEmpresa.clearBranding;
    DashboardEmpresa.init = function () {
        if (this._initialized) return;
        var form = document.getElementById('branding-form');
        // listeners já ligados no corpo acima
        this._bindHashForMobile && this._bindHashForMobile();
        this._initialized = true;
    };
    DashboardEmpresa._bindHashForMobile = function () {
        function checkHash() {
            if (global.location && global.location.hash === '#branding-pane' && typeof loadBrandingData === 'function') {
                loadBrandingData();
            }
        }
        if (global.addEventListener) {
            global.addEventListener('hashchange', checkHash);
            if (global.location && global.location.hash === '#branding-pane') setTimeout(checkHash, 200);
        }
    };
    global.DashboardEmpresa = DashboardEmpresa;
    if (typeof loadBrandingData === 'function') global.loadBrandingData = loadBrandingData;
    if (typeof saveBranding === 'function') global.saveBranding = saveBranding;

})(typeof window !== 'undefined' ? window : this);
