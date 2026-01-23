/**
 * Restaurar botão "Modo Empresa" no menu do ADM
 * Posição: Abaixo de "Gerenciar códigos" e acima de "IA"
 * Baseado no front-end antigo
 * IMPORTANTE: Este script deve rodar APENAS no admin, não no dashboard
 */

(function() {
    'use strict';

    // VERIFICAR SE ESTAMOS NO ADMIN - Se não estiver, não fazer nada
    const isAdminPage = window.location.pathname.includes('/admin') || 
                        document.querySelector('.admin-layout') || 
                        document.querySelector('#users-table') ||
                        document.querySelector('[data-target="users-pane"]');
    
    if (!isAdminPage) {
        console.log('ℹ️ Script admin-menu-empresa-restore.js: Não é página admin, ignorando...');
        return; // Sair imediatamente se não for admin
    }

    console.log('🔧 Restaurando botão Modo Empresa no menu ADM...');

    /**
     * Adicionar botão "Modo Empresa" no menu
     */
    function addEmpresaButton() {
        // Procurar especificamente no menu lateral do admin
        const sidebarNav = document.querySelector('.sidebar-nav, nav.sidebar-nav, [class*="sidebar-nav"]');
        if (!sidebarNav) {
            console.warn('⚠️ Menu lateral do admin não encontrado');
            return;
        }

        // PRIMEIRO: Verificar se já existe no menu lateral (pode estar no HTML)
        const existingEmpresa = Array.from(sidebarNav.querySelectorAll('.nav-link, a')).find(el => {
            const text = (el.textContent || '').trim();
            const hasDataAttr = el.getAttribute('data-empresa-admin') === 'true';
            const hasTarget = el.getAttribute('data-target') === 'empresa-admin-pane';
            return hasDataAttr || hasTarget || text.includes('Modo Empresa');
        });

        if (existingEmpresa) {
            console.log('✅ Botão "Modo Empresa" já existe no menu admin (encontrado no HTML)');
            // Garantir que está visível e com as classes corretas
            existingEmpresa.style.display = '';
            existingEmpresa.style.visibility = 'visible';
            existingEmpresa.style.opacity = '1';
            if (!existingEmpresa.classList.contains('nav-link')) {
                existingEmpresa.classList.add('nav-link');
            }
            // Garantir que está na posição correta
            const codigosLink = Array.from(sidebarNav.querySelectorAll('.nav-link, a')).find(el => {
                const text = (el.textContent || '').trim();
                return text.includes('Gerenciar') && (text.includes('Código') || text.includes('código') || text.includes('Códigos'));
            });
            const iaLink = Array.from(sidebarNav.querySelectorAll('.nav-link, a')).find(el => {
                const text = (el.textContent || '').trim();
                return text === 'IA KING' || text.includes('IA KING') || el.href?.includes('ia-king');
            });
            if (codigosLink && iaLink && existingEmpresa.parentElement) {
                const codigosIndex = Array.from(existingEmpresa.parentElement.children).indexOf(codigosLink);
                const iaIndex = Array.from(existingEmpresa.parentElement.children).indexOf(iaLink);
                const empresaIndex = Array.from(existingEmpresa.parentElement.children).indexOf(existingEmpresa);
                // Se não está entre códigos e IA, reposicionar
                if (empresaIndex < codigosIndex || empresaIndex > iaIndex) {
                    if (iaIndex > codigosIndex) {
                        existingEmpresa.parentElement.insertBefore(existingEmpresa, iaLink);
                        console.log('✅ Botão "Modo Empresa" reposicionado entre "Gerenciar Códigos" e "IA KING"');
                    }
                }
            }
            return;
        }

        // Procurar por "Gerenciar Códigos" dentro do menu lateral
        const codigosLink = Array.from(sidebarNav.querySelectorAll('.nav-link, a')).find(el => {
            const text = (el.textContent || '').trim();
            return text.includes('Gerenciar') && (text.includes('Código') || text.includes('código') || text.includes('Códigos'));
        });

        // Procurar por "IA KING" dentro do menu lateral
        const iaLink = Array.from(sidebarNav.querySelectorAll('.nav-link, a')).find(el => {
            const text = (el.textContent || '').trim();
            return text === 'IA KING' || text.includes('IA KING') || el.href?.includes('ia-king');
        });

        // Se encontrou ambos, inserir entre eles
        if (codigosLink && iaLink) {

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
                setTimeout(addEmpresaButton, 1000);
            });
        } else {
            setTimeout(addEmpresaButton, 1000);
        }

        // Observar mudanças no DOM (apenas no menu lateral do admin)
        const sidebarNav = document.querySelector('.sidebar-nav, nav.sidebar-nav');
        if (sidebarNav) {
            const observer = new MutationObserver(() => {
                // Verificar novamente se ainda estamos no admin
                if (isAdminPage) {
                    setTimeout(addEmpresaButton, 500);
                }
            });

            observer.observe(sidebarNav, {
                childList: true,
                subtree: false // Apenas observar filhos diretos
            });
        }
    }

    init();

    console.log('✅ Script de menu ADM Modo Empresa carregado');

})();
