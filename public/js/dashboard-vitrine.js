/**
 * Dashboard — Modelo Vitrine (isolado do restante do editor).
 * Expõe: window.applyVitrineDetails, window.getVitrineDetailsForSave
 *
 * Bugfix: não sobrescrever texto/cores/logos locais com dados antigos do servidor
 * enquanto o usuário está editando (dirty). Sempre ler o DOM no save.
 */
(function () {
    'use strict';

    const state = {
        cardLayout: 'classic',
        heroUrl: '',
        marqueeText: '',
        marqueeLogos: [],
        marqueeSpeed: 'slow',
        showFooter: false,
        marqueeBgType: 'solid',
        marqueeColor1: '#2A2A2E',
        marqueeColor2: '#FFC700',
        marqueeTextColor: '#FFC700'
    };

    let isDirty = false;

    function $(id) { return document.getElementById(id); }

    function markDirty() { isDirty = true; }

    function getApiUrl() {
        return (typeof API_URL !== 'undefined' && API_URL) ? API_URL : (window.API_URL || '');
    }

    function getHeaders() {
        if (typeof HEADERS !== 'undefined' && HEADERS) return HEADERS;
        if (typeof window.getHeaders === 'function') return window.getHeaders();
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        return token ? { Authorization: 'Bearer ' + token } : {};
    }

    function syncStateFromDom() {
        const textInput = $('vitrine-marquee-text');
        if (textInput) state.marqueeText = textInput.value || '';

        const speedChecked = document.querySelector('input[name="vitrine-marquee-speed"]:checked');
        if (speedChecked) state.marqueeSpeed = speedChecked.value;

        const bgChecked = document.querySelector('input[name="vitrine-marquee-bg-type"]:checked');
        if (bgChecked) state.marqueeBgType = bgChecked.value === 'gradient' ? 'gradient' : 'solid';

        const c1 = $('vitrine-marquee-color1');
        const c2 = $('vitrine-marquee-color2');
        const tc = $('vitrine-marquee-text-color');
        const tcHex = $('vitrine-marquee-text-color-hex');
        if (c1 && c1.value) state.marqueeColor1 = c1.value;
        if (c2 && c2.value) state.marqueeColor2 = c2.value;
        if (tc && tc.value) state.marqueeTextColor = tc.value;
        if (tcHex && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(tcHex.value.trim())) {
            state.marqueeTextColor = tcHex.value.trim();
            if (tc) tc.value = state.marqueeTextColor;
        }

        const footerCb = $('vitrine-show-footer');
        if (footerCb) state.showFooter = !!footerCb.checked;

        const activeLayout = document.querySelector('.card-layout-card.active');
        if (activeLayout && activeLayout.dataset.layout) {
            state.cardLayout = activeLayout.dataset.layout === 'vitrine' ? 'vitrine' : 'classic';
        }
    }

    function syncBgTypeUI() {
        const wrap = $('vitrine-marquee-color2-wrap');
        if (wrap) wrap.style.opacity = state.marqueeBgType === 'gradient' ? '1' : '0.4';
        if (wrap) wrap.style.pointerEvents = state.marqueeBgType === 'gradient' ? 'auto' : 'none';
    }

    function marqueeBackgroundCss() {
        if (state.marqueeBgType === 'gradient') {
            return 'linear-gradient(90deg, ' + state.marqueeColor1 + ' 0%, ' + state.marqueeColor2 + ' 100%)';
        }
        return state.marqueeColor1;
    }

    function pushToProfileCache() {
        if (!window.currentProfileData) window.currentProfileData = { details: {}, items: [] };
        if (!window.currentProfileData.details) window.currentProfileData.details = {};
        const d = window.currentProfileData.details;
        d.card_layout = state.cardLayout;
        d.vitrine_hero_url = state.heroUrl || null;
        d.vitrine_marquee_text = state.marqueeText || null;
        d.vitrine_marquee_logos = state.marqueeLogos.slice(0, 3);
        d.vitrine_marquee_speed = state.marqueeSpeed;
        d.vitrine_show_footer = !!state.showFooter;
        d.vitrine_marquee_bg_type = state.marqueeBgType;
        d.vitrine_marquee_color1 = state.marqueeColor1;
        d.vitrine_marquee_color2 = state.marqueeColor2;
        d.vitrine_marquee_text_color = state.marqueeTextColor;
    }

    function setLayoutUI(layout) {
        state.cardLayout = layout === 'vitrine' ? 'vitrine' : 'classic';
        document.querySelectorAll('.card-layout-card').forEach(function (btn) {
            const active = btn.dataset.layout === state.cardLayout;
            btn.classList.toggle('active', active);
            btn.style.borderColor = active ? 'var(--dourado-principal,#FFC700)' : 'rgba(255,255,255,0.12)';
        });
        const panel = $('vitrine-settings-panel');
        if (panel) panel.style.display = state.cardLayout === 'vitrine' ? 'block' : 'none';
        const avatarSel = $('avatar-format-selector');
        if (avatarSel) {
            avatarSel.style.opacity = state.cardLayout === 'vitrine' ? '0.45' : '1';
            avatarSel.title = state.cardLayout === 'vitrine'
                ? 'No Modelo Vitrine o topo é a arte. Formato do avatar vale no Clássico.'
                : '';
        }
        syncBgTypeUI();
        updateMiniPreview();
    }

    function renderLogoChips() {
        const list = $('vitrine-marquee-logos-list');
        if (!list) return;
        list.innerHTML = '';
        state.marqueeLogos.forEach(function (url, idx) {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'position:relative;width:56px;height:56px;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.15);';
            const badge = idx === 0
                ? '<span style="position:absolute;left:2px;bottom:2px;font-size:9px;background:rgba(0,0,0,0.75);color:#FFC700;padding:1px 4px;border-radius:3px;">frente</span>'
                : '';
            wrap.innerHTML = '<img src="' + url.replace(/"/g, '&quot;') + '" style="width:100%;height:100%;object-fit:contain;background:#111;" alt="">' +
                badge +
                '<button type="button" data-idx="' + idx + '" style="position:absolute;top:2px;right:2px;border:none;border-radius:4px;background:#c0392b;color:#fff;width:20px;height:20px;cursor:pointer;font-size:10px;">×</button>';
            wrap.querySelector('button').addEventListener('click', function () {
                state.marqueeLogos.splice(idx, 1);
                markDirty();
                renderLogoChips();
                updateMiniPreview();
                pushToProfileCache();
            });
            list.appendChild(wrap);
        });
    }

    function updateMiniPreview() {
        const hero = $('vitrine-mini-hero');
        const mq = $('vitrine-mini-marquee');
        if (hero) {
            if (state.heroUrl) {
                hero.innerHTML = '<img src="' + state.heroUrl.replace(/"/g, '&quot;') + '" style="width:100%;height:100%;object-fit:cover;" alt="">';
            } else {
                hero.textContent = 'Preview da arte';
            }
        }
        if (mq) {
            mq.style.background = marqueeBackgroundCss();
            mq.style.color = state.marqueeTextColor;
            let html = '';
            state.marqueeLogos.slice(0, 2).forEach(function (url) {
                html += '<img src="' + url.replace(/"/g, '&quot;') + '" alt="" style="height:18px;width:auto;object-fit:contain;">';
            });
            html += '<span style="color:' + state.marqueeTextColor + ';">' + (state.marqueeText || 'Faixa rolante (digite o texto acima)') + '</span>';
            mq.innerHTML = html;
        }
        const preview = document.getElementById('vitrine-hero-preview');
        const ph = document.getElementById('vitrine-hero-placeholder');
        const removeBtn = document.getElementById('vitrine-hero-remove-btn');
        if (preview) {
            if (state.heroUrl) {
                preview.src = state.heroUrl;
                preview.style.display = 'block';
                if (ph) ph.style.display = 'none';
                if (removeBtn) removeBtn.style.display = 'inline-flex';
            } else {
                preview.removeAttribute('src');
                preview.style.display = 'none';
                if (ph) ph.style.display = 'flex';
                if (removeBtn) removeBtn.style.display = 'none';
            }
        }
        const tcHex = $('vitrine-marquee-text-color-hex');
        if (tcHex && document.activeElement !== tcHex) tcHex.value = state.marqueeTextColor;
    }

    async function uploadImageFile(file) {
        const authResponse = await fetch(getApiUrl() + '/api/upload/auth', {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, getHeaders())
        });
        if (!authResponse.ok) throw new Error('Falha na autenticação de upload');
        const authData = await authResponse.json();
        const uploadURL = authData.uploadURL || authData.url;
        const formData = new FormData();
        formData.append('file', file, file.name || 'vitrine.jpg');
        const headers = {};
        const token = (getHeaders().Authorization || '').replace(/^Bearer\s+/i, '');
        if (token) headers.Authorization = 'Bearer ' + token;
        const up = await fetch(uploadURL, { method: 'POST', headers: headers, body: formData });
        if (!up.ok) throw new Error('Falha no upload');
        const data = await up.json();
        return data.url || data.fileUrl || data.secure_url || data.Location || '';
    }

    function applyVitrineDetails(details) {
        if (!details) return;

        // Preservar edições locais não publicadas (ex.: digitou o texto e depois enviou logo)
        syncStateFromDom();
        const preserved = isDirty ? {
            marqueeText: state.marqueeText,
            marqueeLogos: state.marqueeLogos.slice(),
            marqueeSpeed: state.marqueeSpeed,
            showFooter: state.showFooter,
            marqueeBgType: state.marqueeBgType,
            marqueeColor1: state.marqueeColor1,
            marqueeColor2: state.marqueeColor2,
            marqueeTextColor: state.marqueeTextColor,
            heroUrl: state.heroUrl,
            cardLayout: state.cardLayout
        } : null;

        state.cardLayout = (String(details.card_layout || 'classic').toLowerCase() === 'vitrine') ? 'vitrine' : 'classic';
        state.heroUrl = details.vitrine_hero_url || '';
        state.marqueeText = details.vitrine_marquee_text || '';
        let logos = details.vitrine_marquee_logos || [];
        if (typeof logos === 'string') {
            try { logos = JSON.parse(logos); } catch (e) { logos = []; }
        }
        state.marqueeLogos = Array.isArray(logos) ? logos.filter(Boolean).slice(0, 3) : [];
        state.marqueeSpeed = ['slow', 'normal', 'fast'].includes(String(details.vitrine_marquee_speed || '').toLowerCase())
            ? String(details.vitrine_marquee_speed).toLowerCase()
            : 'slow';
        state.showFooter = !!(details.vitrine_show_footer === true || details.vitrine_show_footer === 'true' || details.vitrine_show_footer === 1);
        state.marqueeBgType = String(details.vitrine_marquee_bg_type || 'solid').toLowerCase() === 'gradient' ? 'gradient' : 'solid';
        state.marqueeColor1 = details.vitrine_marquee_color1 || '#2A2A2E';
        state.marqueeColor2 = details.vitrine_marquee_color2 || '#FFC700';
        state.marqueeTextColor = details.vitrine_marquee_text_color || '#FFC700';

        if (preserved) {
            state.cardLayout = preserved.cardLayout || state.cardLayout;
            if (preserved.heroUrl) state.heroUrl = preserved.heroUrl;
            state.marqueeText = preserved.marqueeText;
            if (preserved.marqueeLogos && preserved.marqueeLogos.length) {
                state.marqueeLogos = preserved.marqueeLogos;
            }
            state.marqueeSpeed = preserved.marqueeSpeed;
            state.showFooter = preserved.showFooter;
            state.marqueeBgType = preserved.marqueeBgType;
            state.marqueeColor1 = preserved.marqueeColor1;
            state.marqueeColor2 = preserved.marqueeColor2;
            state.marqueeTextColor = preserved.marqueeTextColor;
        }

        const textInput = $('vitrine-marquee-text');
        if (textInput) textInput.value = state.marqueeText;
        document.querySelectorAll('input[name="vitrine-marquee-speed"]').forEach(function (r) {
            r.checked = r.value === state.marqueeSpeed;
        });
        document.querySelectorAll('input[name="vitrine-marquee-bg-type"]').forEach(function (r) {
            r.checked = r.value === state.marqueeBgType;
        });
        const c1 = $('vitrine-marquee-color1');
        const c2 = $('vitrine-marquee-color2');
        const tc = $('vitrine-marquee-text-color');
        const tcHex = $('vitrine-marquee-text-color-hex');
        if (c1) c1.value = state.marqueeColor1;
        if (c2) c2.value = state.marqueeColor2;
        if (tc) tc.value = state.marqueeTextColor;
        if (tcHex) tcHex.value = state.marqueeTextColor;
        const footerCb = $('vitrine-show-footer');
        if (footerCb) footerCb.checked = state.showFooter;

        renderLogoChips();
        setLayoutUI(state.cardLayout);
        updateMiniPreview();
        pushToProfileCache();
    }

    function getVitrineDetailsForSave() {
        syncStateFromDom();
        pushToProfileCache();
        isDirty = false;
        return {
            card_layout: state.cardLayout,
            cardLayout: state.cardLayout,
            vitrine_hero_url: state.heroUrl || null,
            vitrineHeroUrl: state.heroUrl || null,
            vitrine_marquee_text: state.marqueeText || null,
            vitrineMarqueeText: state.marqueeText || null,
            vitrine_marquee_logos: state.marqueeLogos.slice(0, 3),
            vitrineMarqueeLogos: state.marqueeLogos.slice(0, 3),
            vitrine_marquee_speed: state.marqueeSpeed,
            vitrineMarqueeSpeed: state.marqueeSpeed,
            vitrine_show_footer: !!state.showFooter,
            vitrineShowFooter: !!state.showFooter,
            vitrine_marquee_bg_type: state.marqueeBgType,
            vitrineMarqueeBgType: state.marqueeBgType,
            vitrine_marquee_color1: state.marqueeColor1,
            vitrineMarqueeColor1: state.marqueeColor1,
            vitrine_marquee_color2: state.marqueeColor2,
            vitrineMarqueeColor2: state.marqueeColor2,
            vitrine_marquee_text_color: state.marqueeTextColor,
            vitrineMarqueeTextColor: state.marqueeTextColor
        };
    }

    function bindEvents() {
        document.querySelectorAll('.card-layout-card').forEach(function (btn) {
            btn.addEventListener('click', function () {
                markDirty();
                setLayoutUI(btn.dataset.layout);
                pushToProfileCache();
            });
        });

        document.addEventListener('click', function (e) {
            const btn = e.target.closest && e.target.closest('.tcb-apply-template');
            if (!btn) return;
            e.preventDefault();
            const itemEl = btn.closest('.item, .module-item, .tcb-dashboard-item');
            if (!itemEl) return;
            const tpl = btn.dataset.template || 'evento';
            const titleEl = itemEl.querySelector('.tcb-title-input');
            const eyebrowEl = itemEl.querySelector('.tcb-eyebrow-input');
            const btnLabelEl = itemEl.querySelector('.tcb-button-label-input');
            const line1 = itemEl.querySelector('.tcb-line1-input');
            const line2 = itemEl.querySelector('.tcb-line2-input');
            const line3 = itemEl.querySelector('.tcb-line3-input');
            const tplHidden = itemEl.querySelector('.tcb-template-input');
            if (tplHidden) tplHidden.value = tpl;
            if (tpl === 'evento') {
                if (eyebrowEl) eyebrowEl.value = '🌎 Mentoria / Evento';
                if (titleEl) titleEl.value = 'Encontro Presencial';
                if (line1) line1.value = '21/08/2026 → 22/08/2026';
                if (line2) line2.value = '09:00 — 18:00';
                if (line3) line3.value = 'Cidade — Local';
                if (btnLabelEl) btnLabelEl.value = 'Inscrever-se';
            } else if (tpl === 'curso') {
                if (eyebrowEl) eyebrowEl.value = '🎓 Turma 2026';
                if (titleEl) titleEl.value = 'Master Turma — Módulo';
                if (line1) line1.value = '05/11/2026 → 08/11/2026';
                if (line2) line2.value = '09:00 — 18:00';
                if (line3) line3.value = '';
                if (btnLabelEl) btnLabelEl.value = 'Quero participar';
            } else {
                if (eyebrowEl) eyebrowEl.value = '';
                if (titleEl) titleEl.value = 'Título do destaque';
                if (line1) line1.value = '';
                if (line2) line2.value = '';
                if (line3) line3.value = '';
                if (btnLabelEl) btnLabelEl.value = 'Saiba mais';
            }
        });

        const textInput = $('vitrine-marquee-text');
        if (textInput) {
            textInput.addEventListener('input', function () {
                state.marqueeText = textInput.value;
                markDirty();
                updateMiniPreview();
                pushToProfileCache();
            });
        }

        document.querySelectorAll('input[name="vitrine-marquee-speed"]').forEach(function (r) {
            r.addEventListener('change', function () {
                if (r.checked) {
                    state.marqueeSpeed = r.value;
                    markDirty();
                    pushToProfileCache();
                }
            });
        });

        document.querySelectorAll('input[name="vitrine-marquee-bg-type"]').forEach(function (r) {
            r.addEventListener('change', function () {
                if (!r.checked) return;
                state.marqueeBgType = r.value === 'gradient' ? 'gradient' : 'solid';
                markDirty();
                syncBgTypeUI();
                updateMiniPreview();
                pushToProfileCache();
            });
        });

        const c1 = $('vitrine-marquee-color1');
        const c2 = $('vitrine-marquee-color2');
        const tc = $('vitrine-marquee-text-color');
        const tcHex = $('vitrine-marquee-text-color-hex');
        function onColorChange() {
            markDirty();
            syncStateFromDom();
            updateMiniPreview();
            pushToProfileCache();
        }
        if (c1) c1.addEventListener('input', onColorChange);
        if (c2) c2.addEventListener('input', onColorChange);
        if (tc) {
            tc.addEventListener('input', function () {
                if (tcHex) tcHex.value = tc.value;
                onColorChange();
            });
        }
        if (tcHex) {
            tcHex.addEventListener('input', function () {
                const v = tcHex.value.trim();
                if (/^#([0-9a-fA-F]{6})$/.test(v)) {
                    state.marqueeTextColor = v;
                    if (tc) tc.value = v;
                    onColorChange();
                }
            });
            tcHex.addEventListener('change', onColorChange);
        }

        const footerCb = $('vitrine-show-footer');
        if (footerCb) {
            footerCb.addEventListener('change', function () {
                state.showFooter = !!footerCb.checked;
                markDirty();
                pushToProfileCache();
            });
        }

        const heroInput = $('vitrine-hero-file-input');
        if (heroInput) {
            heroInput.addEventListener('change', async function () {
                const file = heroInput.files && heroInput.files[0];
                if (!file) return;
                syncStateFromDom();
                try {
                    const url = await uploadImageFile(file);
                    if (!url) throw new Error('URL vazia');
                    state.heroUrl = url;
                    markDirty();
                    updateMiniPreview();
                    pushToProfileCache();
                } catch (e) {
                    alert('Não foi possível enviar a arte. Tente novamente.');
                    console.error(e);
                }
                heroInput.value = '';
            });
        }

        const removeBtn = $('vitrine-hero-remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function () {
                state.heroUrl = '';
                markDirty();
                updateMiniPreview();
                pushToProfileCache();
            });
        }

        const logoAdd = $('vitrine-marquee-logo-add');
        const logoInput = $('vitrine-marquee-logo-input');
        if (logoAdd && logoInput) {
            logoAdd.addEventListener('click', function () {
                syncStateFromDom();
                if (state.marqueeLogos.length >= 3) {
                    alert('Máximo de 3 logomarcas na faixa.');
                    return;
                }
                logoInput.click();
            });
            logoInput.addEventListener('change', async function () {
                const file = logoInput.files && logoInput.files[0];
                if (!file) return;
                // Importante: não perder o texto digitado durante o upload
                syncStateFromDom();
                markDirty();
                try {
                    const url = await uploadImageFile(file);
                    if (url) {
                        syncStateFromDom();
                        state.marqueeLogos.push(url);
                        markDirty();
                        renderLogoChips();
                        updateMiniPreview();
                        pushToProfileCache();
                    }
                } catch (e) {
                    alert('Não foi possível enviar o logo.');
                }
                logoInput.value = '';
            });
        }
    }

    function init() {
        bindEvents();
        if (window.currentProfileData && window.currentProfileData.details) {
            applyVitrineDetails(window.currentProfileData.details);
        } else {
            setLayoutUI('classic');
        }
    }

    window.applyVitrineDetails = applyVitrineDetails;
    window.getVitrineDetailsForSave = getVitrineDetailsForSave;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
