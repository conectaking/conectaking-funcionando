/**
 * Modal de enquadramento (crop) para imagens – KingForms (banner/logo), portaria, etc.
 * Uso:
 *   1. Inclua Cropper.js (CSS + JS).
 *   2. Inclua este script: <script src="/js/image-crop-modal.js"></script>
 *   3. ImageCropModal.open(file, { aspectRatio: 16/9 }, callback(url, errMsg));
 *
 * Mostra medidas do corte (px), proporção aproximada e faixa central (referência telemóvel).
 */
(function (global) {
    'use strict';

    var Cropper = global.Cropper;
    var modalEl = null;
    var cropperInstance = null;
    var currentFile = null;
    var currentCallback = null;
    var currentOptions = {};

    function injectStyles() {
        if (document.getElementById('image-crop-modal-styles')) return;
        var st = document.createElement('style');
        st.id = 'image-crop-modal-styles';
        st.textContent =
            '.image-crop-meta{padding:10px 12px;margin:0 0 12px;background:rgba(250,204,21,0.06);border:1px solid rgba(255,199,0,0.2);border-radius:10px;font-size:0.82rem;color:#ccc;line-height:1.45;}' +
            '.image-crop-meta strong{color:#facc15;}' +
            '.image-crop-tip{margin:8px 0 0;font-size:0.78rem;color:#9ca3af;}' +
            '.image-crop-meta label{display:inline-flex;align-items:center;gap:8px;margin-top:10px;cursor:pointer;color:#e5e5e5;font-size:0.8rem;user-select:none;}' +
            '.image-crop-meta label input{width:16px;height:16px;accent-color:#facc15;}' +
            '#image-crop-size-readout,#image-crop-aspect-readout{color:#fff;font-weight:600;}' +
            '.ick-crop-mobile-strip{position:absolute;left:50%;top:0;bottom:0;transform:translateX(-50%);width:38%;max-width:100%;border:2px dashed rgba(255,255,255,0.85);box-sizing:border-box;pointer-events:none;z-index:5;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.35);display:none;}';
        document.head.appendChild(st);
    }

    function fmtRatio(w, h) {
        if (!w || !h) return '—';
        var r = w / h;
        if (Math.abs(r - 16 / 9) < 0.04) return '16 : 9';
        if (Math.abs(r - 9 / 16) < 0.04) return '9 : 16';
        if (Math.abs(r - 4 / 3) < 0.04) return '4 : 3';
        if (Math.abs(r - 1) < 0.02) return '1 : 1';
        return String(Math.round(r * 100) / 100) + ' : 1';
    }

    function updateReadout(d) {
        var sz = document.getElementById('image-crop-size-readout');
        var ar = document.getElementById('image-crop-aspect-readout');
        if (!d || !sz || !ar) return;
        var w = Math.max(0, Math.round(Number(d.width) || 0));
        var h = Math.max(0, Math.round(Number(d.height) || 0));
        sz.textContent = w + ' × ' + h + ' px';
        ar.textContent = fmtRatio(w, h);
    }

    function stripVisible(show) {
        var el = document.querySelector('.cropper-crop-box .ick-crop-mobile-strip');
        if (!el) return;
        var chk = document.getElementById('image-crop-mobile-preview-toggle');
        var on = show !== undefined ? show : chk ? chk.checked : true;
        el.style.display = on ? 'block' : 'none';
    }

    function ensureStripInCropBox() {
        var box = document.querySelector('#image-crop-modal .cropper-crop-box');
        if (!box || box.querySelector('.ick-crop-mobile-strip')) return;
        var strip = document.createElement('div');
        strip.className = 'ick-crop-mobile-strip';
        strip.setAttribute('title', 'Zona central aproximada em ecrã estreito');
        box.appendChild(strip);
    }

    function tipHtml(opts) {
        var ar = opts && opts.aspectRatio;
        if (ar != null && !isNaN(ar) && Math.abs(ar - 16 / 9) < 0.06) {
            return 'Sugestão <strong>16:9</strong> (ex.: <strong>1920×1080</strong> ou <strong>1200×675</strong>). Em telemóvel o fundo cobre o ecrã (centrado); a faixa tracejada indica a zona central aproximada.';
        }
        if (ar != null && !isNaN(ar) && Math.abs(ar - 1) < 0.06) {
            return 'Sugestão <strong>1:1</strong> (ex.: <strong>400×400</strong> ou <strong>800×800</strong> px).';
        }
        return 'A imagem final corresponde ao recorte em <strong>pixéis</strong> indicado acima. Em ecrãs estreitos, imagens largas mostram sobretudo o centro.';
    }

    function getModal() {
        if (modalEl && modalEl.parentNode) return modalEl;
        injectStyles();
        var wrap = document.createElement('div');
        wrap.id = 'image-crop-modal-wrap';
        wrap.innerHTML =
            '<div id="image-crop-modal" style="display:none; position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,0.85); align-items:center; justify-content:center;">' +
            '  <div style="background:#1C1C21; border-radius:16px; padding:20px; max-width:95vw; max-height:95vh; box-shadow:0 20px 60px rgba(0,0,0,0.5);">' +
            '    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">' +
            '      <h3 style="color:#FFC700; margin:0; font-size:1.25rem;">Ajuste sua Imagem</h3>' +
            '      <button type="button" id="image-crop-modal-close" style="background:transparent; border:none; color:#888; font-size:1.5rem; cursor:pointer; padding:0 8px;">&times;</button>' +
            '    </div>' +
            '    <p style="color:#A1A1A1; font-size:0.9rem; margin:0 0 10px;">Ajuste a área e clique em Cortar e Enviar.</p>' +
            '    <div class="image-crop-meta" id="image-crop-meta-bar">' +
            '      <div><strong>Medidas do corte (imagem final):</strong> <span id="image-crop-size-readout">—</span> · <strong>Proporção:</strong> <span id="image-crop-aspect-readout">—</span></div>' +
            '      <p class="image-crop-tip" id="image-crop-tip"></p>' +
            '      <label><input type="checkbox" id="image-crop-mobile-preview-toggle" checked> Mostrar faixa central (referência telemóvel)</label>' +
            '    </div>' +
            '    <div style="max-height:60vh; max-width:90vw; min-height:200px; background:#0D0D0F; position:relative;">' +
            '      <img id="image-crop-source" style="max-width:100%; max-height:60vh; display:block;">' +
            '    </div>' +
            '    <div style="margin-top:16px; display:flex; gap:12px; justify-content:flex-end;">' +
            '      <button type="button" id="image-crop-cancel" style="padding:10px 20px; background:rgba(255,255,255,0.1); color:#ECECEC; border:1px solid rgba(255,255,255,0.2); border-radius:8px; cursor:pointer;">Cancelar</button>' +
            '      <button type="button" id="image-crop-apply" style="padding:10px 24px; background:linear-gradient(135deg,#FFC700,#F59E0B); color:#000; border:none; border-radius:8px; font-weight:600; cursor:pointer;">Cortar e Enviar</button>' +
            '    </div>' +
            '  </div>' +
            '</div>';
        wrap.style.cssText = 'position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center;';
        document.body.appendChild(wrap);
        modalEl = document.getElementById('image-crop-modal');
        var closeBtn = document.getElementById('image-crop-modal-close');
        var cancelBtn = document.getElementById('image-crop-cancel');
        var applyBtn = document.getElementById('image-crop-apply');
        if (closeBtn) closeBtn.addEventListener('click', close);
        if (cancelBtn) cancelBtn.addEventListener('click', close);
        if (applyBtn) applyBtn.addEventListener('click', applyCrop);
        modalEl.addEventListener('click', function (e) { if (e.target === modalEl) close(); });
        if (!wrap.dataset.ickDelegated) {
            wrap.dataset.ickDelegated = '1';
            wrap.addEventListener('change', function (e) {
                if (e.target && e.target.id === 'image-crop-mobile-preview-toggle') stripVisible();
            });
        }
        return modalEl;
    }

    function close() {
        if (cropperInstance) {
            try { cropperInstance.destroy(); } catch (e) {}
            cropperInstance = null;
        }
        currentFile = null;
        currentCallback = null;
        currentOptions = {};
        var m = document.getElementById('image-crop-modal');
        if (m) m.style.display = 'none';
        var img = document.getElementById('image-crop-source');
        if (img) { img.src = ''; img.removeAttribute('src'); }
    }

    function apiBaseForUpload() {
        try {
            if (global.API_BASE) return String(global.API_BASE).replace(/\/$/, '');
            if (global.API_URL) return String(global.API_URL).replace(/\/$/, '');
        } catch (e) {}
        return (global.location && global.location.origin) ? global.location.origin.replace(/\/$/, '') : '';
    }

    function applyCrop() {
        if (!cropperInstance || !currentFile || !currentCallback) { close(); return; }
        var data = cropperInstance.getData();
        if (!data || data.width < 1 || data.height < 1) { close(); return; }
        var fd = new FormData();
        fd.append('image', currentFile);
        fd.append('cropX', String(data.x));
        fd.append('cropY', String(data.y));
        fd.append('cropWidth', String(data.width));
        fd.append('cropHeight', String(data.height));
        var applyBtn = document.getElementById('image-crop-apply');
        if (applyBtn) { applyBtn.disabled = true; applyBtn.textContent = 'Enviando...'; }
        var base = apiBaseForUpload();
        var token = (typeof global.localStorage !== 'undefined')
            ? (global.localStorage.getItem('conectaKingToken') || global.localStorage.getItem('token'))
            : '';
        var headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;
        fetch(base + '/api/upload/crop', { method: 'POST', body: fd, credentials: 'include', headers: headers })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                close();
                if (applyBtn) { applyBtn.disabled = false; applyBtn.textContent = 'Cortar e Enviar'; }
                if (data && data.success && data.url) currentCallback(data.url); else currentCallback(null, data && data.message ? data.message : 'Falha no upload.');
            })
            .catch(function (err) {
                close();
                if (applyBtn) { applyBtn.disabled = false; applyBtn.textContent = 'Cortar e Enviar'; }
                currentCallback(null, err && err.message ? err.message : 'Erro de conexão.');
            });
    }

    function buildCropperOptions(aspectRatio) {
        return {
            aspectRatio: aspectRatio,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.8,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            crop: function (e) {
                if (e && e.detail) updateReadout(e.detail);
                ensureStripInCropBox();
                stripVisible();
            },
            ready: function () {
                var imgEl = this;
                function tick() {
                    var inst = null;
                    try {
                        if (imgEl && imgEl.cropper && typeof imgEl.cropper.getData === 'function') inst = imgEl.cropper;
                    } catch (e1) {}
                    if (!inst) {
                        var im = document.getElementById('image-crop-source');
                        if (im && im.cropper && typeof im.cropper.getData === 'function') inst = im.cropper;
                    }
                    if (inst) updateReadout(inst.getData());
                    ensureStripInCropBox();
                    stripVisible();
                }
                setTimeout(tick, 0);
                setTimeout(tick, 120);
            }
        };
    }

    function open(file, options, callback) {
        if (!file || !file.type || !file.type.startsWith('image/')) {
            if (callback) callback(null, 'Selecione uma imagem.');
            return;
        }
        if (typeof Cropper === 'undefined') {
            if (callback) callback(null, 'Biblioteca Cropper.js não carregada. Inclua o script e o CSS do Cropper.js.');
            return;
        }
        currentFile = file;
        currentCallback = typeof callback === 'function' ? callback : function () {};
        currentOptions = options || {};
        var modal = getModal();
        var tipEl = document.getElementById('image-crop-tip');
        if (tipEl) tipEl.innerHTML = tipHtml(currentOptions);
        var img = document.getElementById('image-crop-source');
        if (!img) return;
        if (cropperInstance) { try { cropperInstance.destroy(); } catch (e) {} cropperInstance = null; }
        var url = (typeof URL !== 'undefined' && URL.createObjectURL) ? URL.createObjectURL(file) : '';
        img.src = url;
        modal.style.display = 'flex';
        img.onload = function () {
            if (URL.revokeObjectURL) try { URL.revokeObjectURL(url); } catch (e) {}
            var aspectRatio = currentOptions.aspectRatio;
            if (aspectRatio === undefined) aspectRatio = NaN;
            cropperInstance = new Cropper(img, buildCropperOptions(aspectRatio));
        };
    }

    var ImageCropModal = { open: open, close: close };
    if (typeof global !== 'undefined') global.ImageCropModal = ImageCropModal;
})(typeof window !== 'undefined' ? window : this);
