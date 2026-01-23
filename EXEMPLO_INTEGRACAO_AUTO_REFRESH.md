# Exemplo de Integração: Auto-Refresh com Save-All

## Problema

Após chamar `save-all`, a interface não atualiza automaticamente. O usuário precisa recarregar a página.

## Solução

### Opção 1: Usar o Sistema Automático (Recomendado)

Apenas adicione os scripts na página:

```html
<script src="/js/refresh-helpers.js"></script>
<script src="/js/auto-refresh.js"></script>
```

O sistema detecta automaticamente quando `save-all` é chamado e atualiza a interface.

### Opção 2: Integração Manual (Se precisar de controle)

Se você já tem código que chama `save-all`, adicione uma função de atualização:

```javascript
// Código existente
async function saveAll(details, items) {
    const response = await fetch('/api/profile/save-all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details, items })
    });
    
    const result = await response.json();
    
    if (response.ok) {
        // ✅ Adicionar esta função
        updateProfileInterface(result.items);
    }
}

// ✅ Criar função de atualização
function updateProfileInterface(items) {
    // Opção A: Recarregar página (simples)
    window.location.reload();
    
    // Opção B: Atualizar DOM diretamente (melhor UX)
    const container = document.querySelector('.profile-items-container, .items-list');
    if (container) {
        // Renderizar novos itens
        container.innerHTML = items.map(item => renderItem(item)).join('');
        // Reanexar event listeners
        attachItemListeners();
    }
}
```

### Opção 3: Escutar Eventos

Se preferir usar eventos:

```javascript
// Escutar evento de save-all
document.addEventListener('saveAllCompleted', (event) => {
    const items = event.detail.items;
    console.log('Items atualizados:', items);
    
    // Atualizar interface
    updateProfileInterface(items);
});

// Escutar evento genérico
document.addEventListener('dataUpdated', (event) => {
    console.log('Dados atualizados:', event.detail);
    // Atualizar interface baseado no contexto
});
```

## Exemplo Completo: Dashboard de Perfil

```javascript
// Função para salvar tudo
async function saveProfile(details, items) {
    try {
        const response = await fetch('/api/profile/save-all', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ details, items })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // ✅ Atualizar interface automaticamente
            if (result.items) {
                renderItems(result.items);
            }
            
            alert('✅ Alterações salvas com sucesso!');
        } else {
            alert('❌ Erro: ' + (result.message || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro ao salvar. Tente novamente.');
    }
}

// Função para renderizar itens
function renderItems(items) {
    const container = document.querySelector('.items-container');
    if (!container) return;
    
    container.innerHTML = items.map(item => `
        <div class="item" data-item-id="${item.id}">
            <h3>${item.title || 'Sem título'}</h3>
            <p>Tipo: ${item.item_type}</p>
            <button onclick="editItem(${item.id})">Editar</button>
            <button onclick="deleteItem(${item.id})">Deletar</button>
        </div>
    `).join('');
    
    // Reanexar listeners
    attachItemListeners();
}

// Função para deletar item
async function deleteItem(itemId) {
    if (!confirm('Tem certeza?')) return;
    
    const response = await fetch(`/api/profile/items/${itemId}`, {
        method: 'DELETE'
    });
    
    if (response.ok) {
        // ✅ O sistema auto-refresh já vai atualizar automaticamente
        // Mas você pode forçar atualização imediata:
        loadItems();
    }
}

// Função para carregar itens
async function loadItems() {
    const response = await fetch('/api/profile/items');
    const items = await response.json();
    renderItems(items);
}
```

## Resultado

Com o sistema implementado:

1. ✅ **Adicionar item** → Aparece imediatamente
2. ✅ **Editar item** → Mudanças aparecem imediatamente  
3. ✅ **Deletar item** → Item desaparece imediatamente
4. ✅ **Save-all** → Todos os itens atualizam imediatamente
5. ✅ **Não precisa mais recarregar a página!**
