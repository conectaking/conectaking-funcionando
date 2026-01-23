/**
 * Adicionar botão "Modo Empresa" no menu do ADM
 * Posição: Abaixo de "Gerenciar códigos" e acima de "IA"
 */

(function() {
    'use strict';

    console.log('🔧 Inicializando botão Modo Empresa no menu ADM...');

    /**
     * Adicionar botão "Modo Empresa" no menu
     */
    function addEmpresaButton() {
        // Procurar por "Gerenciar códigos" ou "Gerenciar Códigos"
        const codigosButton = Array.from(document.querySelectorAll('a, button, [class*="nav"], [class*="menu"]')).find(el => {
            const text = (el.textContent || '').trim();
            return text.includes('Gerenciar') && (text.includes('código') || text.includes('codigo') || text.includes('Código'));
        });

        // Procurar por "IA" ou "IA King"
        const iaButton = Array.from(document.querySelectorAll('a, button, [class*="nav"], [class*="menu"]')).find(el => {
            const text = (el.textContent || '').trim();
            return text === 'IA' || text.includes('IA King') || text.includes('ia-king') || text.includes('iaKing');
        });

        // Se encontrou ambos, inserir entre eles
        if (codigosButton && iaButton) {
            // Verificar se já existe
            const existingEmpresa = Array.from(document.querySelectorAll('a, button')).find(el => {
                const text = (el.textContent || '').trim();
                return text.includes('Modo Empresa') || text.includes('Empresa');
            });

            if (existingEmpresa) {
                console.log('✅ Botão "Modo Empresa" já existe');
                return;
            }

            // Criar botão Empresa
            const empresaButton = codigosButton.cloneNode(true);
            empresaButton.textContent = 'Modo Empresa';
            empresaButton.innerHTML = '<i class="fas fa-building"></i> <span>Modo Empresa</span>';
            empresaButton.setAttribute('data-empresa-admin', 'true');
            empresaButton.setAttribute('href', '#empresa-admin');
            empresaButton.setAttribute('onclick', 'showEmpresaAdmin(); return false;');

            // Inserir entre "Gerenciar códigos" e "IA"
            const parent = codigosButton.parentElement;
            if (parent) {
                // Encontrar posição correta
                const codigosIndex = Array.from(parent.children).indexOf(codigosButton);
                const iaIndex = Array.from(parent.children).indexOf(iaButton);
                
                if (codigosIndex !== -1 && iaIndex !== -1 && iaIndex > codigosIndex) {
                    parent.insertBefore(empresaButton, iaButton);
                    console.log('✅ Botão "Modo Empresa" adicionado no menu ADM');
                } else {
                    // Fallback: inserir após códigos
                    parent.insertBefore(empresaButton, codigosButton.nextSibling);
                    console.log('✅ Botão "Modo Empresa" adicionado após "Gerenciar códigos"');
                }
            }
        } else {
            console.warn('⚠️ Não foi possível encontrar "Gerenciar códigos" ou "IA" no menu');
        }
    }

    /**
     * Função para mostrar painel Modo Empresa
     */
    window.showEmpresaAdmin = function() {
        console.log('📋 Abrindo painel Modo Empresa...');
        // Implementar lógica para mostrar painel
        // Por enquanto, apenas log
    };

    /**
     * Inicializar
     */
    function init() {
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(addEmpresaButton, 500);
            });
        } else {
            setTimeout(addEmpresaButton, 500);
        }

        // Observar mudanças no DOM
        const observer = new MutationObserver(() => {
            setTimeout(addEmpresaButton, 300);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    init();

    console.log('✅ Script de menu ADM Modo Empresa carregado');

})();
