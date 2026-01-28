/**
 * CORREÇÃO DO FRONTEND DO FINANCEIRO
 * 
 * Este arquivo mostra como o frontend deve tratar a criação de despesas
 * para evitar que o botão fique travado em "Salvando..."
 * 
 * PROBLEMA IDENTIFICADO:
 * - Botão fica em estado "Salvando..." e não finaliza
 * - Página não fecha após salvar
 * 
 * SOLUÇÃO:
 * - Adicionar tratamento de erro adequado
 * - Restaurar botão em caso de erro
 * - Fechar modal/página em caso de sucesso
 * - Adicionar timeout para evitar travamentos
 */

// Função para criar despesa (CORRIGIDA)
async function criarDespesa(formData) {
    const saveButton = document.querySelector('button[type="submit"]') || 
                       document.querySelector('.save-button') ||
                       document.querySelector('button:contains("Salvar")');
    
    if (!saveButton) {
        console.error('Botão de salvar não encontrado');
        return;
    }

    // Salvar HTML original do botão
    const originalHTML = saveButton.innerHTML;
    const originalDisabled = saveButton.disabled;

    try {
        // Desabilitar botão e mostrar estado de carregamento
        saveButton.disabled = true;
        saveButton.innerHTML = 'Salvando...';

        // Obter token de autenticação
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (!token) {
            throw new Error('Token de autenticação não encontrado. Faça login novamente.');
        }

        // Preparar dados da transação
        const transactionData = {
            type: 'EXPENSE',
            amount: parseFloat(formData.amount) || 0,
            description: formData.description || '',
            transaction_date: formData.transaction_date || new Date().toISOString().split('T')[0],
            category_id: formData.category_id ? parseInt(formData.category_id) : null,
            account_id: formData.account_id ? parseInt(formData.account_id) : null,
            card_id: formData.card_id ? parseInt(formData.card_id) : null,
            status: formData.status || 'PAID',
            notes: formData.notes || null,
            is_recurring: formData.is_recurring === true || formData.is_recurring === 'true',
            recurring_times: formData.recurring_times ? parseInt(formData.recurring_times) : null,
            attachment_url: formData.attachment_url || null
        };

        // Criar AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

        // Fazer requisição
        const response = await fetch('/api/finance/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(transactionData),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Verificar se a resposta é OK
        if (!response.ok) {
            let errorMessage = 'Erro ao salvar despesa';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error?.message || errorData.message || errorMessage;
            } catch (e) {
                const errorText = await response.text();
                errorMessage = errorText || `Erro ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        // Parsear resposta
        const result = await response.json();

        // Verificar se a resposta indica sucesso
        if (!result.success) {
            throw new Error(result.error?.message || 'Erro ao salvar despesa');
        }

        // SUCESSO - Atualizar botão e fechar modal
        saveButton.innerHTML = '<i class="fas fa-check"></i> Salvo!';
        saveButton.style.background = '#4caf50';
        
        // Aguardar um pouco para mostrar feedback visual
        await new Promise(resolve => setTimeout(resolve, 500));

        // Fechar modal ou redirecionar
        const modal = document.querySelector('.modal') || 
                     document.querySelector('[role="dialog"]') ||
                     document.querySelector('.expense-modal');
        
        if (modal) {
            // Fechar modal com animação
            modal.style.opacity = '0';
            modal.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                modal.remove();
                // Remover overlay se existir
                const overlay = document.querySelector('.modal-overlay');
                if (overlay) overlay.remove();
            }, 300);
        } else {
            // Se não houver modal, recarregar página ou redirecionar
            window.location.reload();
        }

        // Opcional: Mostrar notificação de sucesso
        mostrarNotificacao('Despesa salva com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao criar despesa:', error);

        // Restaurar botão original
        saveButton.innerHTML = originalHTML;
        saveButton.disabled = originalDisabled;

        // Mostrar mensagem de erro
        let errorMessage = 'Erro ao salvar despesa';
        
        if (error.name === 'AbortError') {
            errorMessage = 'Tempo de espera esgotado. Verifique sua conexão e tente novamente.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        mostrarNotificacao(errorMessage, 'error');
        
        // Scroll para o topo para mostrar erro
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Função auxiliar para mostrar notificações
function mostrarNotificacao(mensagem, tipo = 'info') {
    // Remover notificações anteriores
    const existing = document.querySelector('.finance-notification');
    if (existing) existing.remove();

    // Criar notificação
    const notification = document.createElement('div');
    notification.className = 'finance-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${tipo === 'success' ? '#4caf50' : tipo === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
    notification.textContent = mensagem;

    // Adicionar animação
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    if (!document.querySelector('#finance-notification-style')) {
        style.id = 'finance-notification-style';
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Remover após 5 segundos
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Exemplo de uso no formulário
document.addEventListener('DOMContentLoaded', function() {
    const expenseForm = document.querySelector('#expense-form') || 
                       document.querySelector('form[data-type="expense"]');
    
    if (expenseForm) {
        expenseForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Coletar dados do formulário
            const formData = new FormData(expenseForm);
            const data = {};
            for (const [key, value] of formData.entries()) {
                data[key] = value;
            }
            
            // Chamar função de criação
            await criarDespesa(data);
        });
    }

    // Adicionar listener ao botão de cancelar
    const cancelButton = document.querySelector('.cancel-button') ||
                         document.querySelector('button[type="button"]:contains("Cancelar")');
    
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            const modal = document.querySelector('.modal') || 
                         document.querySelector('[role="dialog"]') ||
                         document.querySelector('.expense-modal');
            
            if (modal) {
                modal.style.opacity = '0';
                modal.style.transition = 'opacity 0.3s';
                setTimeout(() => {
                    modal.remove();
                    const overlay = document.querySelector('.modal-overlay');
                    if (overlay) overlay.remove();
                }, 300);
            } else {
                window.history.back();
            }
        });
    }
});

// Exportar função para uso global
if (typeof window !== 'undefined') {
    window.criarDespesa = criarDespesa;
    window.mostrarNotificacao = mostrarNotificacao;
}
