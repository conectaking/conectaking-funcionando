/**
 * Dashboard — Modelo Vitrine (isolado do restante do editor).
 * Expõe: window.applyVitrineDetails, window.getVitrineDetailsForSave
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

    function $(id) { return document.getElementById(id); }

    function getApiUrl() {
        return (typeof API_URL !== 'undefined' && API_URL) ? API_URL : (window.API_URL || '');
    }

    function getHeaders() {
        if (typeof HEADERS !== 'undefined' && HEADERS) return HEADERS;
        if (typeof window.getHeaders === 'function') return window.getHeaders();
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        return token ? { Authorization: 'Bearer ' + token } : {};
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
                renderLogoChips();
                updateMiniPreview();
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
            html += '<span>' + (state.marqueeText || 'Faixa rolante (digite o texto acima)') + '</span>';
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
        if (c1) c1.value = state.marqueeColor1;
        if (c2) c2.value = state.marqueeColor2;
        if (tc) tc.value = state.marqueeTextColor;
        const footerCb = $('vitrine-show-footer');
        if (footerCb) footerCb.checked = state.showFooter;

        renderLogoChips();
        setLayoutUI(state.cardLayout);
        updateMiniPreview();
    }

    function getVitrineDetailsForSave() {
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
                setLayoutUI(btn.dataset.layout);
                if (window.currentProfileData && window.currentProfileData.details) {
                    window.currentProfileData.details.card_layout = state.cardLayout;
                }
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
                updateMiniPreview();
            });
        }

        document.querySelectorAll('input[name="vitrine-marquee-speed"]').forEach(function (r) {
            r.addEventListener('change', function () {
                if (r.checked) state.marqueeSpeed = r.value;
            });
        });

        document.querySelectorAll('input[name="vitrine-marquee-bg-type"]').forEach(function (r) {
            r.addEventListener('change', function () {
                if (!r.checked) return;
                state.marqueeBgType = r.value === 'gradient' ? 'gradient' : 'solid';
                syncBgTypeUI();
                updateMiniPreview();
            });
        });

        const c1 = $('vitrine-marquee-color1');
        const c2 = $('vitrine-marquee-color2');
        const tc = $('vitrine-marquee-text-color');
        if (c1) c1.addEventListener('input', function () { state.marqueeColor1 = c1.value; updateMiniPreview(); });
        if (c2) c2.addEventListener('input', function () { state.marqueeColor2 = c2.value; updateMiniPreview(); });
        if (tc) tc.addEventListener('input', function () { state.marqueeTextColor = tc.value; updateMiniPreview(); });

        const footerCb = $('vitrine-show-footer');
        if (footerCb) {
            footerCb.addEventListener('change', function () {
                state.showFooter = !!footerCb.checked;
            });
        }

        const heroInput = $('vitrine-hero-file-input');
        if (heroInput) {
            heroInput.addEventListener('change', async function () {
                const file = heroInput.files && heroInput.files[0];
                if (!file) return;
                try {
                    const url = await uploadImageFile(file);
                    if (!url) throw new Error('URL vazia');
                    state.heroUrl = url;
                    updateMiniPreview();
                    if (window.currentProfileData && window.currentProfileData.details) {
                        window.currentProfileData.details.vitrine_hero_url = url;
                    }
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
                updateMiniPreview();
            });
        }

        const logoAdd = $('vitrine-marquee-logo-add');
        const logoInput = $('vitrine-marquee-logo-input');
        if (logoAdd && logoInput) {
            logoAdd.addEventListener('click', function () {
                if (state.marqueeLogos.length >= 3) {
                    alert('Máximo de 3 logomarcas na faixa.');
                    return;
                }
                logoInput.click();
            });
            logoInput.addEventListener('change', async function () {
                const file = logoInput.files && logoInput.files[0];
                if (!file) return;
                try {
                    const url = await uploadImageFile(file);
                    if (url) {
                        state.marqueeLogos.push(url);
                        renderLogoChips();
                        updateMiniPreview();
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
