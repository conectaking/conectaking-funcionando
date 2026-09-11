/**
 * Dashboard QR / Compartilhar — módulo isolado (Conecta King).
 * Gerado por scripts/extract-dashboard-qr-assinatura.js
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

    var SELECTORS = new Proxy({}, {
        get: function (_t, prop) {
            var c = core();
            var s = typeof c.getSelectors === 'function' ? c.getSelectors() : null;
            return s ? s[prop] : null;
        }
    });

    var qrCodeInstance = null;

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

    const finishQr = function () {
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
    };

    if (typeof window.ckEnsureQRCode === 'function') {
        window.ckEnsureQRCode().then(finishQr).catch(finishQr);
    } else {
        finishQr();
    }
}



    var DashboardQR = {
        generateQRCode: generateQRCode,
        getShareQrMeta: getShareQrMeta,
        fillQrThemePicker: fillQrThemePicker,
        composeShareQrArt: composeShareQrArt
    };
    global.DashboardQR = DashboardQR;
    global.generateQRCode = generateQRCode;
    global.QR_ART_THEMES = QR_ART_THEMES;

})(typeof window !== 'undefined' ? window : this);
