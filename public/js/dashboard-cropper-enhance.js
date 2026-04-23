/**
 * Enriquece o Cropper do dashboard antes de dashboard.js carregar:
 * - Mostra medidas do corte (px) e proporção aproximada
 * - Faixa tracejada central (referência para telemóvel em fundo "cover")
 */
(function () {
    'use strict';
    var Native = typeof window !== 'undefined' ? window.Cropper : null;
    if (!Native || Native.__ckEnhanceWrap) return;

    function fmtRatio(w, h) {
        if (!w || !h) return '—';
        var r = w / h;
        if (Math.abs(r - 16 / 9) < 0.04) return '16 : 9';
        if (Math.abs(r - 9 / 16) < 0.04) return '9 : 16';
        if (Math.abs(r - 4 / 3) < 0.04) return '4 : 3';
        if (Math.abs(r - 1) < 0.02) return '1 : 1';
        return String(Math.round((r * 100)) / 100) + ' : 1';
    }

    function updateReadout(d) {
        var sz = document.getElementById('crop-size-readout');
        var ar = document.getElementById('crop-aspect-readout');
        if (!d || !sz || !ar) return;
        var w = Math.max(0, Math.round(Number(d.width) || 0));
        var h = Math.max(0, Math.round(Number(d.height) || 0));
        sz.textContent = w + ' × ' + h + ' px';
        ar.textContent = fmtRatio(w, h);
    }

    function stripVisible(show) {
        var el = document.querySelector('.cropper-crop-box .ck-crop-mobile-strip');
        if (!el) return;
        var chk = document.getElementById('cropper-mobile-preview-toggle');
        var on = show !== undefined ? show : chk ? chk.checked : true;
        el.style.display = on ? 'block' : 'none';
    }

    function ensureStripInCropBox() {
        var box = document.querySelector('.cropper-crop-box');
        if (!box || box.querySelector('.ck-crop-mobile-strip')) return;
        var strip = document.createElement('div');
        strip.className = 'ck-crop-mobile-strip';
        strip.setAttribute('title', 'Zona central aproximada em ecrã estreito (telefone)');
        box.appendChild(strip);
    }

    function wireToggleOnce() {
        var chk = document.getElementById('cropper-mobile-preview-toggle');
        if (!chk || chk.dataset.ckBound) return;
        chk.dataset.ckBound = '1';
        chk.addEventListener('change', function () {
            stripVisible(chk.checked);
        });
    }

    function enhanceOptions(options) {
        var o = Object.assign({}, options || {});
        var userCrop = o.crop;
        var userReady = o.ready;
        o.crop = function (e) {
            if (typeof userCrop === 'function') userCrop.apply(this, arguments);
            if (e && e.detail) updateReadout(e.detail);
            ensureStripInCropBox();
            wireToggleOnce();
            stripVisible();
        };
        o.ready = function () {
            if (typeof userReady === 'function') userReady.apply(this, arguments);
            var imgEl = this;
            function tryReadout() {
                var inst = null;
                try {
                    if (imgEl && imgEl.cropper && typeof imgEl.cropper.getData === 'function') inst = imgEl.cropper;
                } catch (e1) {}
                if (!inst) {
                    var im = document.getElementById('image-to-crop');
                    if (im && im.cropper && typeof im.cropper.getData === 'function') inst = im.cropper;
                }
                if (inst) updateReadout(inst.getData());
            }
            setTimeout(function () {
                tryReadout();
                ensureStripInCropBox();
                wireToggleOnce();
                stripVisible();
            }, 0);
            setTimeout(function () {
                tryReadout();
                ensureStripInCropBox();
                stripVisible();
            }, 120);
        };
        return o;
    }

    function Patched(element, options) {
        return new Native(element, enhanceOptions(options));
    }
    Patched.prototype = Native.prototype;
    Object.keys(Native).forEach(function (k) {
        Patched[k] = Native[k];
    });
    Patched.__ckEnhanceWrap = true;
    Patched.__NativeCropper = Native;
    window.Cropper = Patched;
})();
