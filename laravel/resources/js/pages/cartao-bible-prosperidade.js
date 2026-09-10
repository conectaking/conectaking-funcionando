import '../../css/fonts.css';
import '../vendor-globals.js';

(function () {
    var KEY = 'ck_prosperidade_vid';
    var vid = localStorage.getItem(KEY);
    if (!vid) {
        vid = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(KEY, vid);
    }
    var btn = document.getElementById('btn-mark-read');
    var st = document.getElementById('mark-status');
    if (!btn) return;
    btn.addEventListener('click', function () {
        btn.disabled = true;
        fetch(window.__CK_BOOT_BIBLE_PROSPERIDADE.j0, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                visitor_id: vid,
                activation_number: Number(window.__CK_BOOT_BIBLE_PROSPERIDADE.n2),
                slug: window.__CK_BOOT_BIBLE_PROSPERIDADE.j1
            })
        }).then(function (r) { return r.json(); }).then(function (o) {
            st.textContent = (o && o.success) ? 'Marcada como lida.' : (o && o.message) || 'Erro';
            btn.disabled = false;
        }).catch(function () {
            st.textContent = 'Erro de rede';
            btn.disabled = false;
        });
    });
})();
