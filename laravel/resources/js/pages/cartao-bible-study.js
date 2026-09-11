import '../../css/fonts.css';
import '@css/pages/cartao-bible-study.css';
import '../vendor-globals.js';

(function () {
    var key = 'bible_study_pos_' + window.__CK_BOOT_BIBLE_STUDY.j0;
    var btn = document.getElementById('btn-marcar');
    var badge = document.getElementById('badge');
    try {
        var y = localStorage.getItem(key);
        if (y) window.scrollTo(0, parseInt(y, 10) || 0);
    } catch (e) {}
    if (btn) btn.addEventListener('click', function () {
        try {
            localStorage.setItem(key, String(window.scrollY || 0));
            badge.classList.add('show');
            setTimeout(function () { badge.classList.remove('show'); }, 2500);
        } catch (e) {}
    });

    var nav = document.getElementById('sec-nav');
    if (nav) {
        nav.addEventListener('click', function (e) {
            var link = e.target.closest('a[href^="#sec-"]');
            if (!link) return;
            e.preventDefault();
            var id = link.getAttribute('href').slice(1);
            var el = document.getElementById(id);
            if (el && el.tagName === 'DETAILS') {
                el.open = true;
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            nav.querySelectorAll('a').forEach(function (a) { a.classList.remove('active'); });
            link.classList.add('active');
        });
    }
})();
