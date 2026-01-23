/**
 * Restaurar botão "Modo Empresa" no menu do ADM
 * Posição: Abaixo de "Gerenciar códigos" e acima de "IA"
 * Baseado no front-end antigo
 */

(function() {
    'use strict';

    console.log('🔧 Restaurando botão Modo Empresa no menu ADM...');

    /**
     * Adicionar botão "Modo Empresa" no menu
     */
    function addEmpresaButton() {
        // Procurar por "Gerenciar Códigos" ou "Gerenciar Códigos"
        const codigosLink = Array.from(document.querySelectorAll('.nav-link, a, [class*="nav"]')).find(el => {
            const text = (el.textContent || '').trim();
            return text.includes('Gerenciar') && (text.includes('Código') || text.includes('código') || text.includes('Códigos'));
        });

        // Procurar por "IA KING" ou "IA"
        const iaLink = Array.from(document.querySelectorAll('.nav-link, a, [class*="nav"]')).find(el => {
            const text = (el.textContent || '').trim();
            return text === 'IA KING' || text.includes('IA KING') || text.includes('IA') || el.href?.includes('ia-king');
        });

        // Se encontrou ambos, inserir entre eles
        if (codigosLink && iaLink) {
            // Verificar se já existe
            const existingEmpresa = Array.from(document.querySelectorAll('.nav-link, a')).find(el => {
                const text = (el.textContent || '').trim();
                return text.includes('Modo Empresa') || text.includes('Empresa');
            });

            if (existingEmpresa) {
                console.log('✅ Botão "Modo Empresa" já existe');
                return;
            }

            // Criar botão Empresa baseado no link de códigos
            const empresaLink = codigosLink.cloneNode(true);
            empresaLink.innerHTML = '<i class="fas fa-building"></i> <span>Modo Empresa</span>';
            empresaLink.textContent = 'Modo Empresa';
            empresaLink.setAttribute('data-empresa-admin', 'true');
            empresaLink.setAttribute('data-target', 'empresa-admin-pane');
            empresaLink.setAttribute('href', '#');
            empresaLink.classList.remove('active');
            
            // Remover onclick antigo se existir
            empresaLink.removeAttribute('onclick');

            // Inserir entre "Gerenciar códigos" e "IA"
            const parent = codigosLink.parentElement;
            if (parent) {
                // Encontrar posição correta
                const codigosIndex = Array.from(parent.children).indexOf(codigosLink);
                const iaIndex = Array.from(parent.children).indexOf(iaLink);
                
                if (codigosIndex !== -1 && iaIndex !== -1 && iaIndex > codigosIndex) {
                    parent.insertBefore(empresaLink, iaLink);
                    console.log('✅ Botão "Modo Empresa" adicionado entre "Gerenciar Códigos" e "IA KING"');
                } else {
                    // Fallback: inserir após códigos
                    parent.insertBefore(empresaLink, codigosLink.nextSibling);
                    console.log('✅ Botão "Modo Empresa" adicionado após "Gerenciar Códigos"');
                }
            }
        } else {
            console.warn('⚠️ Não foi possível encontrar "Gerenciar Códigos" ou "IA KING" no menu');
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
