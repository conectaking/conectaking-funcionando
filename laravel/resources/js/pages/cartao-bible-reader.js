import '../../css/fonts.css';
import '@css/pages/cartao-bible-reader.css';
import '../vendor-globals.js';

(function () {
    var boot     = window.__CK_BOOT_BIBLE_READER || {};
    var bookId   = boot.bookId  || '';
    var chapter  = Number(boot.chapter || 0);
    var markApi  = boot.markApi || '/api/bible/mark-read';
    var lsKey    = 'ck_bible_read_' + bookId + '_' + chapter;
    var lsTheme  = 'ck_bible_theme';
    var lsFont   = 'ck_bible_font_size';

    // --------------- Tema ---------------
    var THEMES       = ['dark', 'light', 'sepia'];
    var DEFAULT_THEME = 'dark';

    function applyTheme(theme) {
        if (!THEMES.includes(theme)) theme = DEFAULT_THEME;
        THEMES.forEach(function (t) { document.body.classList.remove('theme-' + t); });
        if (theme !== 'dark') {
            document.body.classList.add('theme-' + theme);
        }
        THEMES.forEach(function (t) {
            var btn = document.getElementById('btn-theme-' + t);
            if (btn) btn.classList.toggle('active', t === theme);
        });
        try { localStorage.setItem(lsTheme, theme); } catch (e) {}
    }

    // Inicializa tema salvo
    var savedTheme = DEFAULT_THEME;
    try { savedTheme = localStorage.getItem(lsTheme) || DEFAULT_THEME; } catch (e) {}
    applyTheme(savedTheme);

    // Listeners dos botões de tema
    THEMES.forEach(function (t) {
        var btn = document.getElementById('btn-theme-' + t);
        if (btn) btn.addEventListener('click', function () { applyTheme(t); });
    });

    // --------------- Tamanho da fonte ---------------
    var FONT_SIZES   = [0.9, 1.0, 1.12, 1.25, 1.42, 1.6];
    var DEFAULT_IDX  = 2; // 1.12rem
    var currentIdx   = DEFAULT_IDX;

    function applyFontSize(idx) {
        if (idx < 0) idx = 0;
        if (idx >= FONT_SIZES.length) idx = FONT_SIZES.length - 1;
        currentIdx = idx;
        document.documentElement.style.setProperty('--bible-verse-size', FONT_SIZES[idx] + 'rem');
        try { localStorage.setItem(lsFont, String(idx)); } catch (e) {}
    }

    // Inicializa tamanho salvo
    try {
        var saved = parseInt(localStorage.getItem(lsFont), 10);
        if (!isNaN(saved)) currentIdx = saved;
    } catch (e) {}
    applyFontSize(currentIdx);

    var btnFontSm = document.getElementById('btn-font-sm');
    var btnFontLg = document.getElementById('btn-font-lg');
    if (btnFontSm) btnFontSm.addEventListener('click', function () { applyFontSize(currentIdx - 1); });
    if (btnFontLg) btnFontLg.addEventListener('click', function () { applyFontSize(currentIdx + 1); });

    // --------------- Marcar como lido ---------------
    var btn = document.getElementById('btn-mark-read');
    var st  = document.getElementById('mark-status');

    function setMarked(msg) {
        if (st)  st.textContent  = msg || 'Marcado como lido.';
        if (btn) btn.disabled    = true;
    }

    try {
        if (localStorage.getItem(lsKey) === '1') setMarked('✓ Marcado localmente.');
    } catch (e) {}

    if (btn) {
        btn.addEventListener('click', function () {
            btn.disabled = true;
            if (st) st.textContent = 'Salvando...';
            fetch(markApi, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ book: bookId, chapter: chapter, mode: 'read' })
            }).then(function (r) {
                if (r.status === 401) throw new Error('auth');
                return r.json();
            }).then(function (o) {
                if (o && o.success) {
                    setMarked('✓ Registrado no seu progresso!');
                    try { localStorage.setItem(lsKey, '1'); } catch (e) {}
                } else {
                    throw new Error((o && o.message) || 'Erro');
                }
            }).catch(function (err) {
                try { localStorage.setItem(lsKey, '1'); } catch (e) {}
                if (err && err.message === 'auth') {
                    setMarked('✓ Marcado (entre para sincronizar).');
                } else {
                    setMarked('✓ Marcado localmente.');
                }
                btn.disabled = true;
            });
        });
    }
})();
