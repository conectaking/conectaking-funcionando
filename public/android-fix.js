/**
 * Ajustes leves para Android - sem substituir fetch/setTimeout globalmente.
 * A versão anterior injetava headers proibidos (Sec-Fetch-*, Connection, User-Agent),
 * forava credentials: 'omit' e alterava qualquer setTimeout < 5s para no mínimo 10s,
 * o que quebrava AbortController, backoffs e comportamento s no mobile.
 */
(function () {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isAndroid = /Android/i.test(ua);
    const isXiaomi = /Xiaomi|Redmi|POCO/i.test(ua);

    if (!isAndroid) return;

    console.log('?? Android: carregando android-fix.js (modo seguro, sem monkey-patch de fetch/setTimeout)');

    if ('connection' in navigator && navigator.connection && typeof navigator.connection.addEventListener === 'function') {
        navigator.connection.addEventListener('change', function () {
            var c = navigator.connection;
            if (!c) return;
            if (c.effectiveType === 'slow-2g' || c.effectiveType === '2g') {
                window.ANDROID_SLOW_CONNECTION = true;
            } else {
                window.ANDROID_SLOW_CONNECTION = false;
            }
        });
    }

    if (isXiaomi && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
            registrations.forEach(function (registration) {
                registration.unregister();
            });
        }).catch(function () { /* ignore */ });
    }
})();
