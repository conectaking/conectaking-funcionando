/** bible — Vite entry (extracted inline) */
(function () {
            var DEFAULT_API = 'https://www.conectaking.com.br';
            var api = DEFAULT_API;
            try {
                var s = localStorage.getItem('conecta_api_origin');
                if (s) api = s.replace(/\/$/, '');
            } catch (e) {}
            var search = window.location.search || '';
            try {
                if (search.indexOf('itemId=') === -1 && search.indexOf('&itemId=') === -1 && search.indexOf('id=') === -1) {
                    /* dashboard.js grava bible_item_id; biblePanel.ejs grava bible_panel_item_id */
                    var sid = sessionStorage.getItem('bible_panel_item_id') || sessionStorage.getItem('bible_item_id');
                    if (sid) search = (search ? search + '&' : '?') + 'itemId=' + encodeURIComponent(sid);
                }
            } catch (e2) {}
            window.location.replace(api + '/bible' + search);
        })();
