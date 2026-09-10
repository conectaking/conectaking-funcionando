import '../../css/fonts.css';
import '../vendor-globals.js';

(function () {
    var KEY = 'ck_devotional_vid';
    var vid = localStorage.getItem(KEY);
    if (!vid) {
        vid = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(KEY, vid);
    }
    var statusApi = window.__CK_BOOT_BIBLE_DEVOTIONAL.j0;
    var markApi = window.__CK_BOOT_BIBLE_DEVOTIONAL.j1;
    var day = Number(window.__CK_BOOT_BIBLE_DEVOTIONAL.n3);
    var btn = document.getElementById('btn-mark-read');
    var st = document.getElementById('mark-status');
    if (!btn) return;
    fetch(statusApi + '?visitor_id=' + encodeURIComponent(vid) + '&days=' + day)
        .then(function (r) { return r.json(); })
        .then(function (o) {
            var list = (o && o.data && o.data.read) || [];
            if (list.some(function (x) { return Number(x.day_of_year) === day; })) {
                st.textContent = 'Já marcado como lido.';
                btn.disabled = true;
            }
        }).catch(function () {});
    btn.addEventListener('click', function () {
        btn.disabled = true;
        fetch(markApi, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ visitor_id: vid, day_of_year: day, slug: window.__CK_BOOT_BIBLE_DEVOTIONAL.j2 })
        }).then(function (r) { return r.json(); }).then(function (o) {
            st.textContent = (o && o.success) ? 'Marcado como lido.' : ((o && o.message) || 'Erro');
            if (!(o && o.success)) btn.disabled = false;
        }).catch(function () {
            st.textContent = 'Erro de rede';
            btn.disabled = false;
        });
    });
})();
