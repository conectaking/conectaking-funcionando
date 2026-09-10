(function() {
            const urlParams = new URLSearchParams(window.location.search);
            const itemId = urlParams.get('itemId') || urlParams.get('id');
            const mode = urlParams.get('mode');
            
            // Se h itemId e não estamos em modo de gerenciamento, redirecionar para o editor
            if (itemId && mode !== 'manage') {
                // Em vez de redirecionar, vamos carregar a estrutura do editor dinamicamente
                // ou usar a mesma página mas com elementos do editor
                console.log('?? Modo de edição ativado para guest list:', itemId);
            }
        })();
