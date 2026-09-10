import '../../css/fonts.css';
import '../vendor-globals.js';

(function () {
    var boot = window.__CK_BOOT_BIBLE_READER || {};
    var bookId = boot.bookId || '';
    var chapter = Number(boot.chapter || 0);
    var lsKey = 'ck_bible_read_' + bookId + '_' + chapter;
    var markApi = boot.markApi || '/api/bible/mark-read';
    var btn = document.getElementById('btn-mark-read');
    var st = document.getElementById('mark-status');

    function setMarked(msg) {
        if (st) st.textContent = msg || 'Marcado como lido.';
        if (btn) btn.disabled = true;
    }

    try {
        if (localStorage.getItem(lsKey) === '1') setMarked('Marcado localmente.');
    } catch (e) {}

    if (!btn) return;

    btn.addEventListener('click', function () {
        btn.disabled = true;
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
                setMarked('Registado no seu progresso.');
            } else {
                throw new Error((o && o.message) || 'Erro');
            }
        }).catch(function (err) {
            try { localStorage.setItem(lsKey, '1'); } catch (e) {}
            if (err && err.message === 'auth') {
                setMarked('Marcado localmente (entre para sincronizar).');
            } else {
                setMarked('Marcado localmente.');
            }
        });
    });
})();
