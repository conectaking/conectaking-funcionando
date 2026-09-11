import '../../css/fonts.css';
import '@css/pages/cartao-public-extra.css';
import '@css/css/profile.css';
import '@css/css/profile-wifi.css';
import '../vendor-globals.js';

(function () {
    var pixModal = document.getElementById('pix-qrcode-modal');
    var pixCloseBtn = document.getElementById('pix-modal-close-btn');
    var pixQrContainer = document.getElementById('pix-qrcode-image');
    var pixQrLoader = document.getElementById('pix-qrcode-loader');
    var pixBrCodeText = document.getElementById('pix-brcode-text');
    var pixCopyBrCodeBtn = document.getElementById('pix-copy-brcode-btn');
    var qrInstance = null;

    function openPixModal(itemId) {
        if (!pixModal || !itemId) return;
        pixModal.classList.add('active');
        if (pixQrLoader) pixQrLoader.style.display = 'block';
        if (pixQrContainer) pixQrContainer.innerHTML = '';
        if (qrInstance && typeof qrInstance.clear === 'function') {
            try { qrInstance.clear(); } catch (e) {}
        }
        if (pixBrCodeText) pixBrCodeText.value = 'Gerando código...';

        fetch('/api/pix/qrcode/' + encodeURIComponent(itemId))
            .then(function (res) {
                return res.json().then(function (data) {
                    if (!res.ok) throw new Error((data && data.message) || 'Erro ao gerar PIX');
                    return data;
                });
            })
            .then(function (data) {
                if (pixBrCodeText) pixBrCodeText.value = data.brcode || '';
                if (pixQrContainer && typeof QRCode !== 'undefined' && data.brcode) {
                    qrInstance = new QRCode(pixQrContainer, {
                        text: data.brcode,
                        width: 200,
                        height: 200,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.H
                    });
                }
            })
            .catch(function (err) {
                if (pixBrCodeText) pixBrCodeText.value = 'Erro: ' + (err.message || 'falha');
            })
            .finally(function () {
                if (pixQrLoader) pixQrLoader.style.display = 'none';
            });
    }

    function closePixModal() {
        if (pixModal) pixModal.classList.remove('active');
    }

    document.querySelectorAll('.profile-button-pix-qrcode').forEach(function (button) {
        button.addEventListener('click', function () {
            var itemId = button.getAttribute('data-item-id');
            if (itemId) {
                try { navigator.sendBeacon('/log/click/item/' + itemId); } catch (e) {}
            }
            openPixModal(itemId);
        });
    });

    document.querySelectorAll('.profile-button-pix').forEach(function (button) {
        button.addEventListener('click', function () {
            var pixKey = button.getAttribute('data-pix-key') || '';
            var span = button.querySelector('span');
            if (!pixKey || pixKey === 'SuaChavePIXAqui') {
                alert('Nenhuma chave PIX configurada.');
                return;
            }
            navigator.clipboard.writeText(pixKey).then(function () {
                if (!span) return;
                var original = span.textContent;
                span.textContent = 'Copiado!';
                setTimeout(function () { span.textContent = original; }, 2000);
            }).catch(function () {
                alert('Não foi possível copiar a chave PIX.');
            });
        });
    });

    if (pixCloseBtn) pixCloseBtn.addEventListener('click', closePixModal);
    if (pixModal) {
        pixModal.addEventListener('click', function (e) {
            if (e.target === pixModal) closePixModal();
        });
    }
    if (pixCopyBrCodeBtn && pixBrCodeText) {
        pixCopyBrCodeBtn.addEventListener('click', function () {
            pixBrCodeText.select();
            try {
                document.execCommand('copy');
                navigator.clipboard.writeText(pixBrCodeText.value);
            } catch (e) {}
            var original = pixCopyBrCodeBtn.textContent;
            pixCopyBrCodeBtn.textContent = 'Copiado!';
            setTimeout(function () { pixCopyBrCodeBtn.textContent = original; }, 2000);
        });
    }

    var shareButton = document.getElementById('share-btn');
    if (shareButton) {
        shareButton.addEventListener('click', async function () {
            var shareData = {
                title: document.title,
                text: 'Confira meu cartão de visita digital Conecta King!',
                url: window.location.origin + '/{{ $profile_slug }}'
            };
            if (navigator.share) {
                try { await navigator.share(shareData); } catch (e) {}
            } else {
                try {
                    await navigator.clipboard.writeText(shareData.url);
                    alert('Link do perfil copiado!');
                } catch (e) {
                    alert('Não foi possível copiar o link.');
                }
            }
        });
    }

    // Wi‑Fi
    var wifiModal = document.getElementById('wifi-qrcode-modal');
    var wifiClose = document.getElementById('wifi-modal-close-btn');
    var wifiQr = document.getElementById('wifi-qrcode-image');
    var wifiSsidEl = document.getElementById('wifi-ssid-visible');
    var wifiPassEl = document.getElementById('wifi-password-visible');
    var wifiCopyBtn = document.getElementById('wifi-copy-password-btn');
    var wifiCss = document.getElementById('ck-wifi-css');
    var wifiQrInst = null;
    var lastWifiPass = '';

    function wifiEscape(s) {
        return String(s || '').replace(/([\\;,:"])/g, '\\$1');
    }
    function buildWifiQr(cfg) {
        var t = (cfg.security || 'WPA').toUpperCase();
        if (t === 'NONE' || t === 'NOPASS') t = 'nopass';
        var hidden = cfg.hidden ? 'H:true' : '';
        return 'WIFI:T:' + t + ';S:' + wifiEscape(cfg.ssid || '') + ';P:' + wifiEscape(cfg.password || '') + ';' + (hidden ? hidden + ';' : '') + ';';
    }
    function openWifiModal(cfg) {
        if (!wifiModal) return;
        if (wifiCss) wifiCss.disabled = false;
        wifiModal.style.display = 'block';
        wifiModal.setAttribute('aria-hidden', 'false');
        if (wifiSsidEl) wifiSsidEl.textContent = cfg.ssid || '';
        if (wifiPassEl) wifiPassEl.textContent = cfg.password || '(sem senha)';
        lastWifiPass = cfg.password || '';
        if (wifiQr) {
            wifiQr.innerHTML = '';
            if (typeof QRCode !== 'undefined') {
                wifiQrInst = new QRCode(wifiQr, {
                    text: buildWifiQr(cfg),
                    width: 180,
                    height: 180,
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        }
    }
    function closeWifiModal() {
        if (!wifiModal) return;
        wifiModal.style.display = 'none';
        wifiModal.setAttribute('aria-hidden', 'true');
    }
    document.querySelectorAll('.wifi-profile-button').forEach(function (btn) {
        btn.addEventListener('click', function () {
            try {
                var raw = decodeURIComponent(btn.getAttribute('data-wifi-config') || '{}');
                openWifiModal(JSON.parse(raw));
            } catch (e) {
                alert('Não foi possível abrir o Wi‑Fi.');
            }
        });
    });
    if (wifiClose) wifiClose.addEventListener('click', closeWifiModal);
    if (wifiModal) wifiModal.addEventListener('click', function (e) { if (e.target === wifiModal) closeWifiModal(); });
    if (wifiCopyBtn) {
        wifiCopyBtn.addEventListener('click', function () {
            if (!lastWifiPass) return alert('Sem senha configurada.');
            navigator.clipboard.writeText(lastWifiPass).then(function () {
                var o = wifiCopyBtn.textContent;
                wifiCopyBtn.textContent = 'Copiado!';
                setTimeout(function () { wifiCopyBtn.textContent = o; }, 1500);
            });
        });
    }

    // Analytics (APIs Node)
    var userId = (window.__CK_CARD_BOOT && window.__CK_CARD_BOOT.userId) || null;
    function logBeacon(path) {
        try { navigator.sendBeacon(path); } catch (e) {
            try { fetch(path, { method: 'POST', keepalive: true }); } catch (e2) {}
        }
    }
    if (userId) logBeacon('/log/view/' + userId);
    var saveContact = document.getElementById('save-contact-btn');
    if (saveContact && userId) {
        saveContact.addEventListener('click', function () { logBeacon('/log/vcard/' + userId); });
    }
    document.addEventListener('click', function (e) {
        var el = e.target.closest('[data-item-id]');
        if (!el) return;
        var id = el.getAttribute('data-item-id');
        if (id) logBeacon('/log/click/item/' + id);
    });

    // Carrossel simples
    document.querySelectorAll('.carousel-container-public').forEach(function (el) {
        var total = parseInt(el.getAttribute('data-slides') || '0', 10);
        if (total < 2) return;
        var wrapper = el.querySelector('.carousel-wrapper-public');
        var indicators = el.querySelectorAll('.carousel-indicator-public');
        var idx = 0;
        function go(i) {
            idx = (i + total) % total;
            wrapper.style.transform = 'translateX(-' + (idx * (100 / total)) + '%)';
            indicators.forEach(function (dot, di) {
                dot.classList.toggle('active', di === idx);
            });
        }
        indicators.forEach(function (dot) {
            dot.addEventListener('click', function () {
                go(parseInt(dot.getAttribute('data-index') || '0', 10));
            });
        });
        setInterval(function () { go(idx + 1); }, 4500);
    });

    // Catálogo de produtos (modal simplificado)
    var catalogOverlay = document.createElement('div');
    catalogOverlay.className = 'ck-catalog-overlay';
    catalogOverlay.innerHTML = '<div class="ck-catalog-panel"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h3 style="margin:0;color:#ececec;">Loja</h3><button type="button" class="ck-catalog-close" style="background:none;border:0;color:#fff;font-size:28px;cursor:pointer;">&times;</button></div><div class="ck-catalog-grid"></div></div>';
    document.body.appendChild(catalogOverlay);
    catalogOverlay.querySelector('.ck-catalog-close').addEventListener('click', function () {
        catalogOverlay.classList.remove('active');
    });
    catalogOverlay.addEventListener('click', function (e) {
        if (e.target === catalogOverlay) catalogOverlay.classList.remove('active');
    });
    function money(v) {
        var n = Number(v);
        if (!isFinite(n)) n = 0;
        return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    document.querySelectorAll('.product-catalog-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var products = [];
            try { products = JSON.parse(btn.getAttribute('data-products') || '[]'); } catch (e) {}
            var slug = btn.getAttribute('data-profile-slug') || '';
            var grid = catalogOverlay.querySelector('.ck-catalog-grid');
            if (!products.length) {
                grid.innerHTML = '<p style="color:#999;grid-column:1/-1;text-align:center;">Nenhum produto disponível.</p>';
            } else {
                grid.innerHTML = products.map(function (p) {
                    var href = '/' + slug + '/produto/' + (p.id || '');
                    var img = p.image_url
                        ? '<img src="' + String(p.image_url).replace(/"/g, '&quot;') + '" alt="">'
                        : '<div style="height:160px;display:flex;align-items:center;justify-content:center;color:#666;"><i class="fas fa-image"></i></div>';
                    return '<div class="ck-catalog-card">' + img +
                        '<div class="body"><strong style="color:#ececec;">' + String(p.name || 'Produto').replace(/</g, '&lt;') + '</strong>' +
                        (p.description ? '<span style="color:#999;font-size:.85rem;">' + String(p.description).replace(/</g, '&lt;').slice(0, 120) + '</span>' : '') +
                        '<span class="price">R$ ' + money(p.price) + '</span>' +
                        '<a href="' + href + '" target="_blank" rel="noopener" class="profile-link" style="margin:0;justify-content:center;">Ver detalhes</a></div></div>';
                }).join('');
            }
            catalogOverlay.classList.add('active');
        });
    });
})();
