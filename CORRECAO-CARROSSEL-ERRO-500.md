# Correção do Erro 500 - Carrossel

## Problema
O erro 500 (Internal Server Error) está ocorrendo ao tentar visualizar o perfil público devido a problemas com itens do tipo `banner_carousel` (carrossel).

## Solução: Remover Carrossel do Backend

### 1. Arquivo: `routes/publicProfile.js`

Adicione um filtro para **ignorar** itens do tipo `banner_carousel` ao buscar os itens do perfil:

```javascript
// Após buscar os itens do banco de dados, adicione este filtro:
const items = itemsRes.rows || [];

// FILTRO: Remover carrosséis para evitar erro 500
const filteredItems = items.filter(item => item.item_type !== 'banner_carousel');

// Use filteredItems em vez de items ao renderizar:
res.render('profile', {
    profile: details,
    items: filteredItems, // Use filteredItems aqui
    // ... outros dados
});
```

### 2. Arquivo: `views/profile.ejs`

Adicione uma verificação para **ignorar** carrosséis caso algum ainda apareça:

```javascript
<% items.forEach((item) => { %>
    <% if (item.item_type === 'banner_carousel') { %>
        <% return; // Pula carrosséis %>
    <% } %>
    
    <% if (item.item_type === 'banner') { %>
        <% 
        // Verificar se é carrossel (destination_url é JSON array)
        let isCarousel = false;
        try {
            if (item.destination_url && (item.destination_url.startsWith('[') || item.destination_url === '[]')) {
                isCarousel = true;
            }
        } catch(e) {}
        
        // Se for carrossel, pular
        if (isCarousel) {
            return;
        }
        %>
        <!-- Renderizar banner normal -->
    <% } %>
    
    <!-- Resto do código de renderização -->
<% }); %>
```

### 3. Alternativa: Remover Carrosséis do Banco de Dados

Se preferir remover completamente os carrosséis do banco de dados, execute esta query SQL:

```sql
-- ATENÇÃO: Isso vai DELETAR todos os carrosséis permanentemente!
DELETE FROM profile_items WHERE item_type = 'banner_carousel';
```

## Instruções de Deploy

1. **Faça as alterações** nos arquivos do backend
2. **Faça commit e push** para o Bitbucket:
   ```bash
   git add .
   git commit -m "Fix: Remover carrossel para corrigir erro 500"
   git push
   ```
3. **Aguarde o deploy automático** ou faça deploy manual no Bitbucket Pipelines
4. **Teste** acessando o perfil público novamente

## Status

- ✅ **Frontend**: Opção de carrossel removida do dashboard
- ⏳ **Backend**: Aguardando correção conforme instruções acima

