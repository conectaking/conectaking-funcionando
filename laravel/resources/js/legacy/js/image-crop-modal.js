/**
 * Modal de enquadramento (crop) para imagens - KingForms (banner/logo), portaria, etc.
 * Uso:
 *   1. Inclua Cropper.js (CSS + JS).
 *   2. Inclua este script: <script src="/js/image-crop-modal.js"></script>
 *   3. ImageCropModal.open(file, { aspectRatio: 16/9 }, callback(url, errMsg));
 *
 * Mostra medidas do corte (px), proporção aproximada e faixa central (referência telemóvel).
 * Suporta remoção automática de fundo (transparência PNG) para logomarcas.
 */
(function (global) {
    'use strict';

    var Cropper = global.Cropper;
    var modalEl = null;
    var cropperInstance = null;
    var currentFile = null;
    var currentCallback = null;
    var currentOptions = {};
    var currentBlobUrl = null;

    /**
     * Utilitário inteligente de remoção automática de fundo em Canvas
     */
    var AutoBackgroundRemover = {
        /**
         * Remove o fundo de uma imagem ou canvas com detecção de bordas e flood-fill inteligente
         * @param {HTMLCanvasElement|HTMLImageElement|Blob|File|string} source
         * @param {Object} [options]
         * @returns {Promise<{blob: Blob, dataUrl: string, canvas: HTMLCanvasElement}>}
         */
        removeBackground: function (source, options) {
            options = options || {};
            var tolerance = options.tolerance !== undefined ? options.tolerance : 36;

            return new Promise(function (resolve, reject) {
                function processCanvas(canvas) {
                    try {
                        var w = canvas.width;
                        var h = canvas.height;
                        if (!w || !h) {
                            canvas.toBlob(function (b) { resolve({ blob: b, dataUrl: canvas.toDataURL('image/png'), canvas: canvas }); }, 'image/png');
                            return;
                        }
                        var ctx = canvas.getContext('2d', { willReadFrequently: true });
                        var imgData = ctx.getImageData(0, 0, w, h);
                        var data = imgData.data;

                        // 1. Amostrar cores dos cantos e bordas exteriores
                        var samples = [];
                        var stepX = Math.max(1, Math.floor(w / 12));
                        var stepY = Math.max(1, Math.floor(h / 12));
                        var x, y, idx;

                        for (x = 0; x < w; x += stepX) {
                            samples.push([x, 0]);
                            samples.push([x, h - 1]);
                        }
                        for (y = 0; y < h; y += stepY) {
                            samples.push([0, y]);
                            samples.push([w - 1, y]);
                        }
                        samples.push([0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]);

                        var bgR = 0, bgG = 0, bgB = 0, count = 0;
                        for (var i = 0; i < samples.length; i++) {
                            var sx = Math.min(w - 1, Math.max(0, samples[i][0]));
                            var sy = Math.min(h - 1, Math.max(0, samples[i][1]));
                            idx = (sy * w + sx) * 4;
                            if (data[idx + 3] > 40) {
                                bgR += data[idx];
                                bgG += data[idx + 1];
                                bgB += data[idx + 2];
                                count++;
                            }
                        }

                        if (count > 0) {
                            bgR = Math.round(bgR / count);
                            bgG = Math.round(bgG / count);
                            bgB = Math.round(bgB / count);
                        } else {
                            bgR = 255; bgG = 255; bgB = 255;
                        }

                        function colorDist(r, g, b) {
                            var dr = r - bgR;
                            var dg = g - bgG;
                            var db = b - bgB;
                            return Math.sqrt(dr * dr + dg * dg + db * db);
                        }

                        // 2. BFS Flood Fill a partir das 4 bordas externas
                        var totalPixels = w * h;
                        var visited = new Uint8Array(totalPixels);
                        var queue = new Int32Array(totalPixels);
                        var head = 0;
                        var tail = 0;

                        function tryEnqueue(px, py) {
                            if (px < 0 || px >= w || py < 0 || py >= h) return;
                            var pos = py * w + px;
                            if (visited[pos]) return;
                            var pidx = pos * 4;
                            var a = data[pidx + 3];
                            if (a < 25) {
                                visited[pos] = 1;
                                queue[tail++] = pos;
                                return;
                            }
                            var dist = colorDist(data[pidx], data[pidx + 1], data[pidx + 2]);
                            if (dist <= tolerance) {
                                visited[pos] = 1;
                                queue[tail++] = pos;
                            }
                        }

                        for (x = 0; x < w; x++) {
                            tryEnqueue(x, 0);
                            tryEnqueue(x, h - 1);
                        }
                        for (y = 0; y < h; y++) {
                            tryEnqueue(0, y);
                            tryEnqueue(w - 1, y);
                        }

                        while (head < tail) {
                            var cur = queue[head++];
                            var cx = cur % w;
                            var cy = Math.floor(cur / w);

                            if (cx > 0) tryEnqueue(cx - 1, cy);
                            if (cx < w - 1) tryEnqueue(cx + 1, cy);
                            if (cy > 0) tryEnqueue(cx, cy - 1);
                            if (cy < h - 1) tryEnqueue(cx, cy + 1);
                        }

                        // 3. Tornar pixels visitados transparentes e suavizar transições (feathering)
                        var featherRange = 22;
                        var tolPlusFeather = tolerance + featherRange;

                        for (var p = 0; p < totalPixels; p++) {
                            idx = p * 4;
                            if (visited[p]) {
                                data[idx + 3] = 0;
                            } else {
                                var pxCoord = p % w;
                                var pyCoord = Math.floor(p / w);
                                var hasNeighbor = (
                                    (pxCoord > 0 && visited[p - 1]) ||
                                    (pxCoord < w - 1 && visited[p + 1]) ||
                                    (pyCoord > 0 && visited[p - w]) ||
                                    (pyCoord < h - 1 && visited[p + w])
                                );
                                if (hasNeighbor) {
                                    var d = colorDist(data[idx], data[idx + 1], data[idx + 2]);
                                    if (d < tolPlusFeather) {
                                        var ratio = Math.max(0, Math.min(1, (d - tolerance) / featherRange));
                                        data[idx + 3] = Math.round(data[idx + 3] * ratio);
                                    }
                                }
                            }
                        }

                        ctx.putImageData(imgData, 0, 0);
                        canvas.toBlob(function (blob) {
                            var dataUrl = canvas.toDataURL('image/png');
                            resolve({ blob: blob, dataUrl: dataUrl, canvas: canvas });
                        }, 'image/png');
                    } catch (err) {
                        reject(err);
                    }
                }

                if (source instanceof HTMLCanvasElement) {
                    processCanvas(source);
                } else if (source instanceof HTMLImageElement && source.complete && source.naturalWidth) {
                    var c = document.createElement('canvas');
                    c.width = source.naturalWidth || source.width;
                    c.height = source.naturalHeight || source.height;
                    var ctx2 = c.getContext('2d');
                    ctx2.drawImage(source, 0, 0);
                    processCanvas(c);
                } else {
                    var img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = function () {
                        var c = document.createElement('canvas');
                        c.width = img.naturalWidth || img.width;
                        c.height = img.naturalHeight || img.height;
                        var ctx3 = c.getContext('2d');
                        ctx3.drawImage(img, 0, 0);
                        processCanvas(c);
                    };
                    img.onerror = function () {
                        reject(new Error('Falha ao processar imagem para remoção de fundo.'));
                    };
                    if (typeof source === 'string') {
                        img.src = source;
                    } else if (source instanceof Blob || source instanceof File) {
                        img.src = URL.createObjectURL(source);
                    } else {
                        reject(new Error('Fonte de imagem inválida.'));
                    }
                }
            });
        }
    };

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
            '.ick-crop-mobile-strip{position:absolute;left:50%;top:0;bottom:0;transform:translateX(-50%);width:38%;max-width:100%;border:2px dashed rgba(255,255,255,0.85);box-sizing:border-box;pointer-events:none;z-index:5;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.35);display:none;}' +
            '.image-crop-checkered{background-image:linear-gradient(45deg,#252528 25%,transparent 25%),linear-gradient(-45deg,#252528 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#252528 75%),linear-gradient(-45deg,transparent 75%,#252528 75%);background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0px;background-color:#161619;}';
        document.head.appendChild(st);
    }

    function fmtRatio(w, h) {
        if (!w || !h) return '-';
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
            return 'Sugestão <strong>1:1</strong> (ex.: <strong>400×400</strong> ou <strong>800×800</strong> px). Ideal para logotipo do botão ou ícone.';
        }
        return 'A imagem final corresponde ao recorte em <strong>pixels</strong> indicado acima. Em ecrãs estreitos, imagens largas mostram sobretudo o centro.';
    }

    function apiBaseForUpload() {
        try {
            if (currentOptions && currentOptions.apiBase) return String(currentOptions.apiBase).replace(/\/$/, '');
            if (global.API_BASE) return String(global.API_BASE).replace(/\/$/, '');
            if (global.API_URL) return String(global.API_URL).replace(/\/$/, '');
        } catch (e) {}
        return (global.location && global.location.origin) ? global.location.origin.replace(/\/$/, '') : '';
    }

    function getModal() {
        if (modalEl && modalEl.parentNode) return modalEl;
        injectStyles();
        var wrap = document.createElement('div');
        wrap.id = 'image-crop-modal-wrap';
        wrap.innerHTML =
            '<div id="image-crop-modal" style="display:none; position:fixed; inset:0; z-index:999999; background:rgba(0,0,0,0.85); align-items:center; justify-content:center;">' +
            '  <div style="background:#1C1C21; border-radius:16px; padding:20px; max-width:95vw; max-height:95vh; box-shadow:0 20px 60px rgba(0,0,0,0.5); overflow-y:auto; z-index:1000000; position:relative;">' +
            '    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">' +
            '      <h3 style="color:#FFC700; margin:0; font-size:1.25rem;">Ajuste sua Imagem</h3>' +
            '      <button type="button" id="image-crop-modal-close" style="background:transparent; border:none; color:#888; font-size:1.5rem; cursor:pointer; padding:0 8px;">&times;</button>' +
            '    </div>' +
            '    <p style="color:#A1A1A1; font-size:0.9rem; margin:0 0 10px;">Ajuste a área e clique em Cortar e Enviar.</p>' +
            '    <div class="image-crop-meta" id="image-crop-meta-bar">' +
            '      <div><strong>Medidas do corte (imagem final):</strong> <span id="image-crop-size-readout">-</span> | <strong>Proporção:</strong> <span id="image-crop-aspect-readout">-</span></div>' +
            '      <p class="image-crop-tip" id="image-crop-tip"></p>' +
            '      <div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">' +
            '        <label><input type="checkbox" id="image-crop-mobile-preview-toggle" checked> Mostrar faixa central (referência telemóvel)</label>' +
            '        <label id="image-crop-remove-bg-label" style="display:none; color:#FFC700; font-weight:600;"><input type="checkbox" id="image-crop-remove-bg-toggle"> ✨ Remover fundo da logo (salvar sem fundo / transparente)</label>' +
            '      </div>' +
            '    </div>' +
            '    <div class="image-crop-checkered" style="max-height:55vh; max-width:90vw; min-height:200px; position:relative; border-radius:8px; overflow:hidden;">' +
            '      <img id="image-crop-source" style="max-width:100%; max-height:55vh; display:block;">' +
            '    </div>' +
            '    <div style="margin-top:16px; display:flex; gap:12px; justify-content:flex-end;">' +
            '      <button type="button" id="image-crop-cancel" style="padding:10px 20px; background:rgba(255,255,255,0.1); color:#ECECEC; border:1px solid rgba(255,255,255,0.2); border-radius:8px; cursor:pointer;">Cancelar</button>' +
            '      <button type="button" id="image-crop-apply" style="padding:10px 24px; background:linear-gradient(135deg,#FFC700,#F59E0B); color:#000; border:none; border-radius:8px; font-weight:600; cursor:pointer;">Cortar e Enviar</button>' +
            '    </div>' +
            '  </div>' +
            '</div>';
        wrap.style.cssText = 'position:fixed; inset:0; z-index:999999 !important; display:flex; align-items:center; justify-content:center;';
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
        if (currentBlobUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
            try { URL.revokeObjectURL(currentBlobUrl); } catch (e) {}
            currentBlobUrl = null;
        }
        currentFile = null;
        currentCallback = null;
        currentOptions = {};
        var m = document.getElementById('image-crop-modal');
        if (m) m.style.display = 'none';
        var wrap = document.getElementById('image-crop-modal-wrap');
        if (wrap) wrap.style.display = 'none';
        var img = document.getElementById('image-crop-source');
        if (img) { img.src = ''; img.removeAttribute('src'); }
    }

    function applyCrop() {
        if (!cropperInstance || !currentFile || !currentCallback) { close(); return; }
        var cb = currentCallback; // Preserva o callback antes de fechar e limpar o estado
        var applyBtn = document.getElementById('image-crop-apply');
        if (applyBtn) { applyBtn.disabled = true; applyBtn.textContent = 'Enviando...'; }

        var base = apiBaseForUpload();
        var token = (typeof global.localStorage !== 'undefined')
            ? (global.localStorage.getItem('conectaKingToken') || global.localStorage.getItem('token'))
            : '';
        var headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;

        var removeBgToggle = document.getElementById('image-crop-remove-bg-toggle');
        var shouldRemoveBg = removeBgToggle ? removeBgToggle.checked : (currentOptions.removeBg === true);

        if (shouldRemoveBg) {
            // Recorte direto no canvas e remoção de fundo transparente
            try {
                var croppedCanvas = cropperInstance.getCroppedCanvas();
                if (!croppedCanvas) throw new Error('Não foi possível obter a imagem recortada.');

                AutoBackgroundRemover.removeBackground(croppedCanvas)
                    .then(function (res) {
                        var fd = new FormData();
                        var fileName = (currentFile.name || 'logo').replace(/\.[^.]+$/, '') + '-sem-fundo.png';
                        fd.append('file', res.blob, fileName);
                        fd.append('image', res.blob, fileName);

                        return fetch(base + '/api/upload/image', {
                            method: 'POST',
                            body: fd,
                            credentials: 'include',
                            headers: headers
                        });
                    })
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        close();
                        if (applyBtn) { applyBtn.disabled = false; applyBtn.textContent = 'Cortar e Enviar'; }
                        if (data && data.success && (data.url || data.imageUrl)) {
                            if (typeof cb === 'function') cb(data.url || data.imageUrl, null, { removeBg: true });
                        } else {
                            if (typeof cb === 'function') cb(null, data && data.message ? data.message : 'Falha no upload.');
                        }
                    })
                    .catch(function (err) {
                        close();
                        if (applyBtn) { applyBtn.disabled = false; applyBtn.textContent = 'Cortar e Enviar'; }
                        if (typeof cb === 'function') cb(null, err && err.message ? err.message : 'Erro ao processar remoção de fundo.');
                    });
                return;
            } catch (cropErr) {
                // Fallback para envio padrão
                console.warn('Erro ao processar canvas crop:', cropErr);
            }
        }

        // Envio padrão via /api/upload/crop
        var data = cropperInstance.getData();
        if (!data || data.width < 1 || data.height < 1) { close(); return; }
        var fd = new FormData();
        fd.append('image', currentFile);
        fd.append('cropX', String(data.x));
        fd.append('cropY', String(data.y));
        fd.append('cropWidth', String(data.width));
        fd.append('cropHeight', String(data.height));
        if (currentFile.type === 'image/png' || currentOptions.preserveAlpha) {
            fd.append('preserveAlpha', '1');
            fd.append('format', 'png');
        }

        fetch(base + '/api/upload/crop', { method: 'POST', body: fd, credentials: 'include', headers: headers })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                close();
                if (applyBtn) { applyBtn.disabled = false; applyBtn.textContent = 'Cortar e Enviar'; }
                if (data && data.success && (data.url || data.imageUrl)) {
                    if (typeof cb === 'function') cb(data.url || data.imageUrl, null, { removeBg: false });
                } else {
                    if (typeof cb === 'function') cb(null, data && data.message ? data.message : 'Falha no upload.');
                }
            })
            .catch(function (err) {
                close();
                if (applyBtn) { applyBtn.disabled = false; applyBtn.textContent = 'Cortar e Enviar'; }
                if (typeof cb === 'function') cb(null, err && err.message ? err.message : 'Erro de conexão.');
            });
    }

    function buildCropperOptions(aspectRatio) {
        return {
            aspectRatio: aspectRatio,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.85,
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
        var wrap = modal ? modal.parentNode : document.getElementById('image-crop-modal-wrap');
        if (wrap) {
            wrap.style.cssText = 'position:fixed; inset:0; z-index:999999 !important; display:flex; align-items:center; justify-content:center;';
            if (wrap.parentNode === document.body) {
                document.body.appendChild(wrap);
            }
            wrap.style.display = 'flex';
        }
        if (modal) {
            modal.style.zIndex = '999999';
        }

        var tipEl = document.getElementById('image-crop-tip');
        if (tipEl) tipEl.innerHTML = tipHtml(currentOptions);

        // Configurar opção de remover fundo (relevante para logos)
        var removeBgLabel = document.getElementById('image-crop-remove-bg-label');
        var removeBgToggle = document.getElementById('image-crop-remove-bg-toggle');
        if (removeBgLabel && removeBgToggle) {
            var showBgOption = currentOptions.isButtonLogo || currentOptions.showRemoveBg;
            removeBgLabel.style.display = showBgOption ? 'inline-flex' : 'none';
            if (showBgOption) {
                removeBgToggle.checked = currentOptions.removeBg === true;
            }
        }

        var img = document.getElementById('image-crop-source');
        if (!img) return;
        if (cropperInstance) { try { cropperInstance.destroy(); } catch (e) {} cropperInstance = null; }

        if (currentBlobUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
            try { URL.revokeObjectURL(currentBlobUrl); } catch (e) {}
            currentBlobUrl = null;
        }

        currentBlobUrl = (typeof URL !== 'undefined' && URL.createObjectURL) ? URL.createObjectURL(file) : '';
        img.src = currentBlobUrl;
        modal.style.display = 'flex';
        img.onload = function () {
            // IMPORTANTE: NÃO revogar o blob URL aqui! O Cropper.js precisa do blob ativo durante a edição.
            var aspectRatio = currentOptions.aspectRatio;
            if (aspectRatio === undefined) aspectRatio = NaN;
            cropperInstance = new Cropper(img, buildCropperOptions(aspectRatio));
        };
    }

    var ImageCropModal = {
        open: open,
        close: close,
        AutoBackgroundRemover: AutoBackgroundRemover
    };

    if (typeof global !== 'undefined') {
        global.ImageCropModal = ImageCropModal;
        global.AutoBackgroundRemover = AutoBackgroundRemover;
    }
})(typeof window !== 'undefined' ? window : this);
