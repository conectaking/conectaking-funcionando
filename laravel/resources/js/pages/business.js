/** Modo Empresa — /business */
import '@css/pages/business.css';
import '@mod/js/ck-auth-gate.js';

(function () {
    'use strict';

    var API = (typeof window !== 'undefined' && (window.API_URL || window.location.origin)) || '';
    var onlyLogo = false;
    try {
        onlyLogo = new URLSearchParams(window.location.search || '').get('only') === 'logo';
    } catch (e) {}

    function token() {
        if (window.CkAuth && typeof window.CkAuth.lsToken === 'function') {
            return window.CkAuth.lsToken() || '';
        }
        return localStorage.getItem('conectaKingToken') || localStorage.getItem('token') || '';
    }

    function headers() {
        var t = token();
        var h = { Accept: 'application/json' };
        if (t) h.Authorization = 'Bearer ' + t;
        return h;
    }

    function jsonHeaders() {
        return Object.assign({ 'Content-Type': 'application/json' }, headers());
    }

    function showError(msg) {
        var el = document.getElementById('ck-biz-error');
        var load = document.getElementById('ck-biz-loading');
        if (load) load.classList.add('ck-hidden');
        if (el) {
            el.textContent = msg || 'Erro ao carregar Modo Empresa.';
            el.classList.remove('ck-hidden');
        }
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    async function loadTeam() {
        var box = document.getElementById('ck-biz-team-list');
        if (!box) return;
        var res = await fetch(API + '/api/business/team', { headers: headers(), credentials: 'include' });
        var data = await res.json().catch(function () { return {}; });
        if (res.status === 401) {
            window.location.href = '/login?redirect=' + encodeURIComponent('/business');
            return;
        }
        if (res.status === 403) {
            showError(data.message || 'Acesso negado ao Modo Empresa.');
            throw new Error('forbidden');
        }
        if (!res.ok) {
            box.innerHTML = '<p class="ck-biz-empty">Não foi possível carregar a equipe.</p>';
            return;
        }
        var rows = data.data || data || [];
        if (!Array.isArray(rows) || rows.length === 0) {
            box.innerHTML = '<p class="ck-biz-empty">Nenhum membro na equipe ainda.</p>';
            return;
        }
        box.innerHTML = rows.map(function (u) {
            return '<div class="ck-biz-row"><div><strong>' + esc(u.display_name || 'Sem nome') +
                '</strong><br><span>' + esc(u.email || '') + '</span></div></div>';
        }).join('');
    }

    async function loadCodes() {
        var box = document.getElementById('ck-biz-codes-list');
        if (!box) return;
        var res = await fetch(API + '/api/business/codes', { headers: headers(), credentials: 'include' });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) {
            box.innerHTML = '<p class="ck-biz-empty">' + esc(data.message || 'Erro ao listar códigos.') + '</p>';
            return;
        }
        var rows = data.data || [];
        if (!Array.isArray(rows) || rows.length === 0) {
            box.innerHTML = '<p class="ck-biz-empty">Nenhum código gerado.</p>';
            return;
        }
        box.innerHTML = rows.map(function (c) {
            var claimed = !!c.is_claimed;
            return '<div class="ck-biz-row"><strong>' + esc(c.code) + '</strong>' +
                (claimed
                    ? '<span class="ck-biz-badge used">Usado' + (c.claimed_by_email ? ' · ' + esc(c.claimed_by_email) : '') + '</span>'
                    : '<span class="ck-biz-badge ok">Disponível</span>') +
                '</div>';
        }).join('');
    }

    async function loadBranding() {
        var res = await fetch(API + '/api/account/status', { headers: headers(), credentials: 'include' });
        if (!res.ok) return;
        var user = await res.json().catch(function () { return {}; });
        var logoUrl = user.companyLogoUrl || user.company_logo_url || '';
        var logoSize = user.companyLogoSize || user.company_logo_size || 60;
        var logoLink = user.companyLogoLink || user.company_logo_link || '';
        var urlInput = document.getElementById('ck-biz-logo-url');
        var sizeInput = document.getElementById('ck-biz-logo-size');
        var linkInput = document.getElementById('ck-biz-logo-link');
        var img = document.getElementById('ck-biz-logo-img');
        var empty = document.getElementById('ck-biz-logo-empty');
        if (urlInput) urlInput.value = logoUrl;
        if (sizeInput) sizeInput.value = logoSize;
        if (linkInput) linkInput.value = logoLink;
        if (logoUrl && img && empty) {
            img.src = logoUrl;
            img.style.maxHeight = logoSize + 'px';
            img.classList.remove('ck-hidden');
            empty.classList.add('ck-hidden');
        }
    }

    async function uploadLogo(file) {
        var authResponse = await fetch(API + '/api/upload/auth', {
            method: 'POST',
            headers: headers(),
            credentials: 'include'
        });
        if (!authResponse.ok) {
            var errData = await authResponse.json().catch(function () { return {}; });
            throw new Error(errData.message || 'Falha na autorização do upload');
        }
        var authData = await authResponse.json();
        var uploadURL = authData.uploadURL;
        var accountHash = authData.accountHash || 'MBdqwyqeFtFBvKiQjgzjtQ';
        if (!uploadURL) throw new Error('URL de upload não retornada');

        var formData = new FormData();
        formData.append('file', file);
        var uploadResponse = await fetch(uploadURL, {
            method: 'POST',
            headers: headers(),
            body: formData,
            credentials: 'include'
        });
        if (!uploadResponse.ok) throw new Error('Falha no envio da imagem');
        var uploadData = await uploadResponse.json();
        var imageUrl = (uploadData.url || uploadData.imageUrl)
            || (uploadData.result && uploadData.result.variants && uploadData.result.variants[0])
            || (uploadData.result && uploadData.result.id
                ? ('https://imagedelivery.net/' + accountHash + '/' + uploadData.result.id + '/public')
                : '');
        if (!imageUrl) throw new Error('Resposta do upload inválida');
        return imageUrl;
    }

    async function saveLogo() {
        var url = (document.getElementById('ck-biz-logo-url') || {}).value || '';
        var size = parseInt((document.getElementById('ck-biz-logo-size') || {}).value || '60', 10) || 60;
        var link = (document.getElementById('ck-biz-logo-link') || {}).value || '';
        if (!url) {
            alert('Envie um logo antes de salvar.');
            return;
        }
        var res = await fetch(API + '/api/business/branding', {
            method: 'PUT',
            headers: jsonHeaders(),
            credentials: 'include',
            body: JSON.stringify({
                logoUrl: url,
                logoSize: size,
                logoLink: link,
                company_logo_url: url,
                company_logo_size: size,
                company_logo_link: link
            })
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) {
            alert(data.message || 'Erro ao salvar logo.');
            return;
        }
        alert('Logo salvo!');
        await loadBranding();
    }

    async function clearLogo() {
        var res = await fetch(API + '/api/business/branding', {
            method: 'PUT',
            headers: jsonHeaders(),
            credentials: 'include',
            body: JSON.stringify({
                logoUrl: '',
                logoSize: 60,
                logoLink: '',
                company_logo_url: '',
                company_logo_size: 60,
                company_logo_link: ''
            })
        });
        if (!res.ok) {
            var data = await res.json().catch(function () { return {}; });
            alert(data.message || 'Erro ao limpar logo.');
            return;
        }
        var urlInput = document.getElementById('ck-biz-logo-url');
        var img = document.getElementById('ck-biz-logo-img');
        var empty = document.getElementById('ck-biz-logo-empty');
        if (urlInput) urlInput.value = '';
        if (img) {
            img.src = '';
            img.classList.add('ck-hidden');
        }
        if (empty) empty.classList.remove('ck-hidden');
        alert('Logo removido.');
    }

    async function genCode(manual) {
        var url = API + (manual ? '/api/business/codes/generate-manual' : '/api/business/generate-code');
        var opts = { method: 'POST', headers: jsonHeaders(), credentials: 'include' };
        if (manual) {
            var custom = ((document.getElementById('ck-biz-custom-code') || {}).value || '').trim();
            if (!custom) {
                alert('Digite um código.');
                return;
            }
            opts.body = JSON.stringify({ customCode: custom });
        }
        var res = await fetch(url, opts);
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) {
            alert(data.message || (data.error && data.error.message) || 'Erro ao gerar código.');
            return;
        }
        var code = data.code || (data.data && data.data.code) || '';
        if (code) {
            try { await navigator.clipboard.writeText(code); } catch (e) {}
            alert('Código: ' + code + (code ? ' (copiado)' : ''));
        } else {
            alert(data.message || 'Código gerado.');
        }
        var input = document.getElementById('ck-biz-custom-code');
        if (input) input.value = '';
        await loadCodes();
    }

    async function boot() {
        if (window.CkAuth && !(await window.CkAuth.requireAuth('/login?redirect=' + encodeURIComponent('/business' + (onlyLogo ? '?only=logo' : ''))))) {
            return;
        }
        if (onlyLogo) {
            var team = document.getElementById('ck-biz-team-section');
            var codes = document.getElementById('ck-biz-codes-section');
            if (team) team.classList.add('ck-hidden');
            if (codes) codes.classList.add('ck-hidden');
        }
        try {
            if (!onlyLogo) {
                await loadTeam();
                await loadCodes();
            }
            await loadBranding();
            var load = document.getElementById('ck-biz-loading');
            if (load) load.classList.add('ck-hidden');
        } catch (e) {
            if (e && e.message === 'forbidden') return;
            showError(e.message || 'Erro de conexão.');
        }

        document.getElementById('ck-biz-gen-code')?.addEventListener('click', function () { genCode(false); });
        document.getElementById('ck-biz-gen-manual')?.addEventListener('click', function () { genCode(true); });
        document.getElementById('ck-biz-logo-save')?.addEventListener('click', saveLogo);
        document.getElementById('ck-biz-logo-clear')?.addEventListener('click', clearLogo);
        document.getElementById('ck-biz-logo-upload')?.addEventListener('change', async function (ev) {
            var file = ev.target.files && ev.target.files[0];
            if (!file) return;
            try {
                var url = await uploadLogo(file);
                if (!url) throw new Error('URL vazia');
                var urlInput = document.getElementById('ck-biz-logo-url');
                var img = document.getElementById('ck-biz-logo-img');
                var empty = document.getElementById('ck-biz-logo-empty');
                var size = parseInt((document.getElementById('ck-biz-logo-size') || {}).value || '60', 10) || 60;
                if (urlInput) urlInput.value = url;
                if (img) {
                    img.src = url;
                    img.style.maxHeight = size + 'px';
                    img.classList.remove('ck-hidden');
                }
                if (empty) empty.classList.add('ck-hidden');
            } catch (err) {
                alert(err.message || 'Falha no upload');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
