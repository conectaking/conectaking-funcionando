(function () {
    'use strict';

    function escapeWifiField(val) {
        return String(val ?? '')
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/"/g, '\\"');
    }

    function normalizeSecurity(secRaw, password) {
        const s = (secRaw || 'WPA').toString().trim().toUpperCase();
        const pwd = password != null ? String(password) : '';
        if (!pwd) return 'nopass';
        if (s === 'NOPASS' || s === 'NONE' || s === 'OPEN') return 'nopass';
        if (s === 'WEP') return 'WEP';
        return 'WPA';
    }

    function buildWifiQrPayload(cfg) {
        const ssid = (cfg && cfg.ssid != null) ? String(cfg.ssid).trim() : '';
        const password = cfg && cfg.password != null ? String(cfg.password) : '';
        const hidden = !!(cfg && cfg.hidden);
        const t = normalizeSecurity(cfg && cfg.security, password);
        let qr = 'WIFI:T:' + escapeWifiField(t) + ';S:' + escapeWifiField(ssid) + ';';
        if (t !== 'nopass') {
            qr += 'P:' + escapeWifiField(password) + ';';
        } else {
            qr += 'P:;';
        }
        if (hidden) qr += 'H:true;';
        qr += ';';
        return qr;
    }

    function parseWifiDataset(encoded) {
        if (!encoded) return {};
        try {
            const json = decodeURIComponent(encoded);
            const o = JSON.parse(json);
            return typeof o === 'object' && o ? o : {};
        } catch (e) {
            return {};
        }
    }

    function readCfgFromDashboardItem(itemEl) {
        if (!itemEl) return {};
        return {
            ssid: (itemEl.querySelector('.wifi-ssid-input')?.value || '').trim(),
            password: itemEl.querySelector('.wifi-password-input')?.value ?? '',
            security: itemEl.querySelector('.wifi-security-input')?.value || 'WPA',
            hidden: !!itemEl.querySelector('.wifi-hidden-input')?.checked
        };
    }

    function openWifiModal(cfg) {
        var modal = document.getElementById('wifi-qrcode-modal');
        var closeBtn = document.getElementById('wifi-modal-close-btn');
        var qrHost = document.getElementById('wifi-qrcode-image');
        var loader = document.getElementById('wifi-qrcode-loader');
        var passEl = document.getElementById('wifi-password-visible');
        var copyBtn = document.getElementById('wifi-copy-password-btn');
        var ssidEl = document.getElementById('wifi-ssid-visible');
        if (!modal || !qrHost) return;

        var ssid = (cfg && cfg.ssid != null) ? String(cfg.ssid).trim() : '';
        if (!ssid) {
            window.alert('Nome da rede (SSID) não configurado. Informe o nome da rede no módulo Wi‑Fi.');
            return;
        }

        if (ssidEl) {
            ssidEl.textContent = ssid;
        }

        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        if (loader) loader.style.display = 'block';
        qrHost.innerHTML = '';

        var qrText = buildWifiQrPayload(cfg);
        try {
            if (typeof QRCode === 'undefined') throw new Error('QRCode indisponível');
            // eslint-disable-next-line no-new
            new QRCode(qrHost, {
                text: qrText,
                width: 200,
                height: 200,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        } catch (err) {
            qrHost.textContent = err && err.message ? err.message : 'Erro ao gerar QR';
        } finally {
            if (loader) loader.style.display = 'none';
        }

        var pwd = cfg && cfg.password != null ? String(cfg.password) : '';
        if (passEl) {
            passEl.textContent = pwd ? pwd : '(rede aberta — sem senha)';
        }
        function copyHandler() {
            if (!copyBtn) return;
            if (!pwd) {
                window.alert('Esta rede está configurada como aberta (sem senha).');
                return;
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(pwd).then(function () {
                    var t = copyBtn.textContent;
                    copyBtn.textContent = 'Copiado!';
                    setTimeout(function () { copyBtn.textContent = t; }, 2000);
                }).catch(function () {
                    window.prompt('Copie a senha:', pwd);
                });
            } else {
                window.prompt('Copie a senha:', pwd);
            }
        }

        function close() {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            modal.removeEventListener('click', onBackdrop);
            if (closeBtn) closeBtn.removeEventListener('click', close);
            if (copyBtn) copyBtn.removeEventListener('click', copyHandler);
        }
        function onBackdrop(ev) {
            if (ev.target === modal) close();
        }
        modal.addEventListener('click', onBackdrop);
        if (closeBtn) closeBtn.addEventListener('click', close);
        if (copyBtn) copyBtn.addEventListener('click', copyHandler);
    }

    window.openWifiModal = openWifiModal;

    function isDashboardWifiControl(target) {
        return target.closest(
            '.module-action-btn, .edit-item-btn, .delete-item-btn, .duplicate-item-btn, ' +
            '.module-toggle, .module-toggle-input, .module-move-btn, .module-drag-handle, ' +
            '.module-drag-controls, .module-name, .item-icon-picker, .logo-upload-area, ' +
            'input, select, textarea, label'
        );
    }

    document.addEventListener('click', function (ev) {
        var wifiBtn = ev.target.closest('.wifi-profile-button, .wifi-banner-btn');
        if (wifiBtn) {
            ev.preventDefault();
            ev.stopPropagation();
            openWifiModal(parseWifiDataset(wifiBtn.getAttribute('data-wifi-config') || ''));
            return;
        }

        if (isDashboardWifiControl(ev.target)) return;

        var bannerPreview = ev.target.closest('.wifi-banner-preview, .banner-preview-thumb');
        if (bannerPreview) {
            var itemFromBanner = bannerPreview.closest('.module-item, .item');
            if (itemFromBanner && itemFromBanner.dataset.itemType === 'wifi') {
                ev.preventDefault();
                ev.stopPropagation();
                openWifiModal(readCfgFromDashboardItem(itemFromBanner));
                return;
            }
        }

        var modIcon = ev.target.closest('.module-item[data-item-type="wifi"] .module-icon');
        if (modIcon) {
            var modItem = modIcon.closest('.module-item');
            if (modItem) {
                ev.preventDefault();
                ev.stopPropagation();
                openWifiModal(readCfgFromDashboardItem(modItem));
            }
        }
    });

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('.wifi-profile-button, .wifi-banner-btn').forEach(function (btn) {
            if (btn.dataset.wifiBound === '1') return;
            btn.dataset.wifiBound = '1';
        });
    });
})();
