/**
 * Enriquece o Cropper do dashboard:
 * - Medidas do corte (px) e proporção
 * - Faixa tracejada central (referência telemóvel)
 * - Ajusta altura da área ao ecrã (sem scroll interno no modal)
 */
(function () {
    'use strict';
    var Native = typeof window !== 'undefined' ? window.Cropper : null;
    if (!Native || Native.__ckEnhanceWrap) return;

    function fmtRatio(w, h) {
        if (!w || !h) return '-';
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

    function fitCropperContainer() {
        var modal = document.getElementById('cropper-modal');
        if (!modal || !modal.classList.contains('active')) return;
        var container = modal.querySelector('.cropper-container');
        if (!container) return;
        var header = modal.querySelector('.modal-header');
        var meta = modal.querySelector('.cropper-meta-bar');
        var footer = modal.querySelector('.modal-footer');
        var vh = window.innerHeight || document.documentElement.clientHeight || 600;
        var used =
            (header ? header.offsetHeight : 0) +
            (meta ? meta.offsetHeight : 0) +
            (footer ? footer.offsetHeight : 0) +
            24;
        var h = Math.max(240, vh - used);
        // No desktop, não ocupar ecrã inteiro desnecessariamente
        if (window.matchMedia && window.matchMedia('(min-width: 769px)').matches) {
            h = Math.min(h, Math.round(vh * 0.58), 560);
            h = Math.max(h, 300);
        }
        container.style.height = h + 'px';
        container.style.maxHeight = h + 'px';
        container.style.overflow = 'hidden';
        var body = modal.querySelector('.modal-body.cropper-body');
        if (body) {
            body.style.overflow = 'hidden';
        }
        return container;
    }

    function resizeActiveCropper() {
        fitCropperContainer();
        var im = document.getElementById('image-to-crop');
        if (im && im.cropper && typeof im.cropper.resize === 'function') {
            try { im.cropper.resize(); } catch (e) { /* ignore */ }
        }
    }

    if (!window.__ckCropperResizeBound) {
        window.__ckCropperResizeBound = true;
        window.addEventListener('resize', function () {
            if (document.getElementById('cropper-modal')?.classList.contains('active')) {
                resizeActiveCropper();
            }
        });
        window.addEventListener('orientationchange', function () {
            setTimeout(resizeActiveCropper, 180);
        });
    }

    function enhanceOptions(options) {
        var o = Object.assign({}, options || {});
        var userCrop = o.crop;
        var userReady = o.ready;
        o.responsive = o.responsive !== false;
        o.restore = false;
        o.crop = function (e) {
            if (typeof userCrop === 'function') userCrop.apply(this, arguments);
            if (e && e.detail) updateReadout(e.detail);
            ensureStripInCropBox();
            wireToggleOnce();
            stripVisible();
        };
        o.ready = function () {
            fitCropperContainer();
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
                if (inst) {
                    try { inst.resize(); } catch (e2) {}
                    updateReadout(inst.getData());
                }
            }
            setTimeout(function () {
                fitCropperContainer();
                tryReadout();
                ensureStripInCropBox();
                wireToggleOnce();
                stripVisible();
            }, 0);
            setTimeout(function () {
                fitCropperContainer();
                tryReadout();
                ensureStripInCropBox();
                stripVisible();
            }, 120);
        };
        return o;
    }

    function Patched(element, options) {
        fitCropperContainer();
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
