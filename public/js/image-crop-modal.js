/**
 * Modal de enquadramento (crop) para imagens – KingForms (banner/logo), perfil, etc.
 * Uso:
 *   1. Inclua Cropper.js: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css">
 *      <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js"></script>
 *   2. Inclua este script: <script src="/js/image-crop-modal.js"></script>
 *   3. Ao selecionar imagem (ex.: input file onchange):
 *      ImageCropModal.open(file, { aspectRatio: 16/9 }, function(url) { ... });  // banner
 *      ImageCropModal.open(file, { aspectRatio: 1 }, function(url) { ... });    // logo
 *
 * Medidas recomendadas: Banner 16:9 (ex. 1200×400 px); Logo 1:1 (ex. 400×400 px).
 */
(function (global) {
    'use strict';

    var Cropper = global.Cropper;
    var modalEl = null;
    var cropperInstance = null;
    var currentFile = null;
    var currentCallback = null;
    var currentOptions = {};

    function getModal() {
        if (modalEl && modalEl.parentNode) return modalEl;
        var wrap = document.createElement('div');
        wrap.id = 'image-crop-modal-wrap';
        wrap.innerHTML =
            '<div id="image-crop-modal" style="display:none; position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,0.85); align-items:center; justify-content:center;">' +
            '  <div style="background:#1C1C21; border-radius:16px; padding:20px; max-width:95vw; max-height:95vh; box-shadow:0 20px 60px rgba(0,0,0,0.5);">' +
            '    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">' +
            '      <h3 style="color:#FFC700; margin:0; font-size:1.25rem;">Ajuste sua Imagem</h3>' +
            '      <button type="button" id="image-crop-modal-close" style="background:transparent; border:none; color:#888; font-size:1.5rem; cursor:pointer; padding:0 8px;">&times;</button>' +
            '    </div>' +
            '    <p style="color:#A1A1A1; font-size:0.9rem; margin:0 0 12px;">Ajuste a área e clique em Cortar e Enviar.</p>' +
            '    <div style="max-height:60vh; max-width:90vw; min-height:200px; background:#0D0D0F;">' +
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
        var apiBase = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
        var token = (typeof window !== 'undefined' && window.localStorage) ? (window.localStorage.getItem('conectaKingToken') || window.localStorage.getItem('token')) : '';
        var headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;
        fetch(apiBase + '/api/upload/crop', { method: 'POST', body: fd, credentials: 'include', headers: headers })
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
            cropperInstance = new Cropper(img, {
                aspectRatio: aspectRatio,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.8,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true
            });
        };
    }

    var ImageCropModal = { open: open, close: close };
    if (typeof global !== 'undefined') global.ImageCropModal = ImageCropModal;
})(typeof window !== 'undefined' ? window : this);
