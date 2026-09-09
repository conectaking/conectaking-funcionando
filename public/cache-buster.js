/**
 * Cache Buster - Fora limpeza de cache automaticamente
 * Este arquivo deve ser includo em todas as páginas HTML
 * Ele gera timestamps nicos para forar reload dos arquivos CSS e JS
 */

(function() {
    'use strict';

    // Gerar timestamp nico baseado na data/hora atual
    const cacheBuster = '?v=' + new Date().getTime();
    
    // Função para adicionar cache buster a URLs
    function addCacheBuster(url) {
        if (!url) return url;
        const separator = url.includes('?') ? '&' : '?';
        return url + separator + 't=' + Date.now();
    }

    // Função para recarregar arquivos CSS com cache buster
    function reloadStylesheets() {
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
        stylesheets.forEach(function(link) {
            const href = link.getAttribute('href');
            if (href && !href.includes('fonts.googleapis.com') && !href.includes('cdnjs.cloudflare.com')) {
                // Adicionar timestamp nico
                const newHref = addCacheBuster(href);
                if (newHref !== href) {
                    link.setAttribute('href', newHref);
                }
            }
        });
    }

    // Função para recarregar scripts com cache buster
    function reloadScripts() {
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(function(script) {
            const src = script.getAttribute('src');
            if (src && !src.includes('cdn.jsdelivr.net') && !src.includes('googleapis.com')) {
                // Adicionar timestamp nico
                const newSrc = addCacheBuster(src);
                if (newSrc !== src) {
                    script.setAttribute('src', newSrc);
                }
            }
        });
    }

    // Executar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            reloadStylesheets();
            reloadScripts();
        });
    } else {
        reloadStylesheets();
        reloadScripts();
    }

    // Exportar função para uso manual se necessrio
    window.forceCacheReload = function() {
        reloadStylesheets();
        reloadScripts();
        location.reload(true); // Forar reload sem cache
    };

    console.log('?? Cache Buster ativado - versão:', cacheBuster);
})();

