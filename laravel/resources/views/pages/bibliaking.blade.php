<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bíblia — Conecta King</title>
    <script>
        (function () {
            var search = window.location.search || '';
            try {
                if (search.indexOf('itemId=') === -1 && search.indexOf('&itemId=') === -1 && search.indexOf('id=') === -1) {
                    var sid = sessionStorage.getItem('bible_panel_item_id') || sessionStorage.getItem('bible_item_id');
                    if (sid) search = (search ? search + '&' : '?') + 'itemId=' + encodeURIComponent(sid);
                }
            } catch (e0) {}
            var api = '';
            try {
                api = (localStorage.getItem('conecta_api_origin') || '').replace(/\/$/, '');
            } catch (e) {}
            if (!api) {
                var loc = window.location;
                var localHost = loc.hostname === '127.0.0.1' || loc.hostname === 'localhost';
                if (localHost && (loc.port === '5500' || loc.port === '5501' || loc.port === '3000')) {
                    api = loc.protocol + '//' + loc.hostname + ':8080';
                } else {
                    api = (loc.origin || '').replace(/\/$/, '');
                }
            }
            window.location.replace(api + '/bible' + search);
        })();
    </script>
</head>
<body>
    <p style="font-family: system-ui, sans-serif; padding: 1.5rem;">A abrir a Bíblia…</p>
</body>
</html>
