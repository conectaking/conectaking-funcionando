# IMPORTANTE: Filtro de Itens Inativos no Backend

## Problema Identificado

A página pública (tag.conectaking.com.br/[slug]) está exibindo TODOS os itens, incluindo os que estão marcados como inativos (`is_active: false`).

## Solução Necessária no Backend

Ao renderizar a página pública da tag ou ao retornar os dados via API `/api/profile`, o backend DEVE filtrar os itens e retornar **apenas** os que têm `is_active = true`.

### Exemplo de Filtro

```sql
-- Exemplo SQL
SELECT * FROM items 
WHERE profile_id = ? AND is_active = TRUE
ORDER BY display_order;
```

```javascript
// Exemplo JavaScript/Node
const items = profileData.items.filter(item => item.is_active === true);
```

### Campo Enviado

O frontend está enviando `is_active` como boolean (`true` ou `false`) no campo `is_active` de cada item ao salvar via `/api/profile/save-all`.

### Verificação

- O campo `is_active` está sendo salvo corretamente no banco de dados
- A página pública deve usar apenas itens com `is_active = true`
- A API `/api/profile` deve retornar apenas itens ativos ao renderizar a página pública

