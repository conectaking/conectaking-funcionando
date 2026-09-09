/**
 * Integração entre Lista de Convidados e KingForms Editor
 * Este arquivo faz a ponte entre o editor do KingForms e a funcionalidade de Lista de Convidados
 */

(function() {
    'use strict';
    
    console.log('Y"- Carregando integração KingForms - Lista de Convidados...');
    
    const API_URL = (window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin || 'https://www.conectaking.com.br').replace(/\/$/, '');
    
    // Obter token
    function getToken() {
        return localStorage.getItem('conectaKingToken') || localStorage.getItem('token');
    }
    
    function getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        };
    }
    
    // Obter itemId da URL
    function getItemIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('itemId') || urlParams.get('id');
    }
    
    // Aguardar formPageEdit.js carregar
    function waitForFormPageEdit(callback, maxAttempts = 50) {
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            
            // Verificar se formPageEdit.js carregou (verificar se funções essenciais existem)
            if (typeof window.loadFormData === 'function' || typeof window.currentItemId !== 'undefined') {
                clearInterval(interval);
                console.log('formPageEdit.js detectado!');
                callback();
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.warn('formPageEdit.js pode não ter carregado completamente');
                callback(); // Tentar mesmo assim
            }
        }, 100);
    }
    
    // Carregar dados da lista de convidados quando estiver editando um formulário em modo lista
    async function loadGuestListForm() {
        const itemId = getItemIdFromUrl();
        if (!itemId) {
            console.log('Nenhum itemId na URL - modo de listagem geral');
            return;
        }
        
        console.log('Carregando lista de convidados:', itemId);
        
        try {
            const response = await fetch(`${API_URL}/api/guest-lists/${itemId}`, {
                headers: getHeaders()
            });
            
            if (response.ok) {
                const guestListData = await response.json();
                console.log('Dados da lista de convidados carregados:', guestListData);
                
                // Ativar modo lista de convidados
                window.currentFormIsGuestList = true;
                
                // Criar input hidden se não existir
                let guestListInput = document.getElementById('is-guest-list-mode');
                if (!guestListInput) {
                    guestListInput = document.createElement('input');
                    guestListInput.type = 'hidden';
                    guestListInput.id = 'is-guest-list-mode';
                    guestListInput.value = 'true';
                    document.body.appendChild(guestListInput);
                } else {
                    guestListInput.value = 'true';
                }
                
                console.log('Modo Lista de Convidados ativado! ID:', itemId);
            } else if (response.status === 404) {
                console.log('Não há lista de convidados associada a este formulário');
                window.currentFormIsGuestList = false;
            } else {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('O Erro ao carregar lista de convidados:', error);
            // Não é crítico - continuar como formulário normal
        }
    }
    
    // Sobrescrever botão de salvar para detectar modo lista
    function overrideSaveButton() {
        let attempts = 0;
        const maxAttempts = 20;
        
        const interval = setInterval(() => {
            attempts++;
            const saveBtn = document.getElementById('save-form-btn');
            
            if (saveBtn) {
                clearInterval(interval);
                console.log('Botão de salvar encontrado!');
                
                // Verificar se já tem listener (para não adicionar múltiplos)
                if (!saveBtn.dataset.listenerAdded) {
                    saveBtn.dataset.listenerAdded = 'true';
                    // O listener já deve estar no formPageEdit.js
                    console.log('Botão de salvar configurado para modo lista de convidados');
                }
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.warn('Botão de salvar não encontrado após 20 tentativas');
            }
        }, 200);
    }
    
    // Inicializar quando o DOM estiver pronto
    function init() {
        console.log('Y"" Inicializando integração KingForms - Lista de Convidados...');
        
        // Aguardar formPageEdit.js carregar primeiro
        waitForFormPageEdit(() => {
            // Carregar dados da lista se aplicável
            loadGuestListForm().then(() => {
                // Configurar botão de salvar
                overrideSaveButton();
            });
        });
    }
    
    // Inicializar quando DOM estiver pronto ou imediatamente se já estiver
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM já carregado, aguardar um pouco para garantir que outros scripts carregaram
        setTimeout(init, 100);
    }
    
})();
