# Migração: Eliminação de Links Únicos e Integração ao Link de Cadastro

## Resumo das Alterações

Este documento descreve as alterações realizadas para eliminar o sistema de Links Únicos e integrar suas funcionalidades ao Link de Cadastro.

## ✅ Alterações Implementadas

### 1. Migration 090 - Novos Campos no Link de Cadastro
**Arquivo:** `migrations/090_add_cadastro_link_features.sql`

Adicionados os seguintes campos à tabela `guest_list_items`:
- `cadastro_description` (VARCHAR(255)) - Descrição opcional para o link de cadastro
- `cadastro_expires_at` (TIMESTAMP NULL) - Data de expiração do link (NULL = sem expiração)
- `cadastro_max_uses` (INTEGER DEFAULT 999999) - Limite máximo de usos (999999 = ilimitado)
- `cadastro_current_uses` (INTEGER DEFAULT 0) - Contador de usos atuais

### 2. Rotas Atualizadas

#### `routes/guestList.routes.js`
- ✅ GET `/api/guest-lists` - Retorna os novos campos do link de cadastro
- ✅ GET `/api/guest-lists/:id` - Retorna os novos campos do link de cadastro
- ✅ PUT `/api/guest-lists/:id` - Aceita e salva os novos campos:
  - `cadastro_description` - Descrição opcional
  - `cadastro_expires_at` - Data de expiração (timestamp)
  - `cadastro_expires_in_hours` - Validade em horas
  - `cadastro_expires_in_minutes` - Validade em minutos
  - `cadastro_max_uses` - Limite de usos (null = ilimitado)

#### `routes/publicDigitalForm.routes.js`
- ✅ Validação de validade do link de cadastro ao acessar
- ✅ Validação de limite de usos ao acessar
- ✅ Incremento automático do contador de usos após cadastro bem-sucedido

### 3. Remoção de Links Únicos

#### `server.js`
- ✅ Rota `/api/unique-links` comentada (não será mais usada)

#### `routes/publicDigitalForm.routes.js`
- ✅ Removidas validações de links únicos
- ✅ Removidas buscas por `unique_form_links`
- ✅ Removidas referências a `custom_slug` de links únicos
- ✅ Mantido apenas sistema de `cadastro_slug` com validações

## ⚠️ Pendências

### Interface Frontend

A interface frontend que exibe os links precisa ser atualizada para:

1. **Remover a seção "Links Únicos"** completamente
2. **Adicionar ao "Link de Cadastro"** as seguintes opções:
   - Campo de descrição opcional
   - Campo de validade (horas/minutos ou data específica)
   - Campo de limite de usos (quantidade ou ilimitado)
   - Exibir informações de uso atual (ex: "Uso: 5/100")
   - Exibir status de expiração se houver

### Localização da Interface

A interface provavelmente está em:
- Um arquivo JavaScript frontend que faz chamadas à API
- Uma view EJS que renderiza a página de links
- Um componente React/Vue se houver framework frontend

**Buscar por:**
- "Links para Compartilhar"
- "Link de Cadastro"
- "Link da Portaria"
- "Links Únicos"
- Chamadas à API `/api/unique-links`
- Chamadas à API `/api/guest-lists/:id` com PUT

## 📋 Como Usar as Novas Funcionalidades

### Atualizar Link de Cadastro via API

```javascript
PUT /api/guest-lists/:id
{
  "cadastro_slug": "meu-link-personalizado",
  "cadastro_description": "Link para inscrição no evento 2026",
  "cadastro_expires_in_hours": 48,  // ou cadastro_expires_at: "2026-01-20T00:00:00Z"
  "cadastro_max_uses": 100  // ou null para ilimitado
}
```

### Resposta da API

```javascript
GET /api/guest-lists/:id
{
  "cadastro_slug": "meu-link-personalizado",
  "cadastro_description": "Link para inscrição no evento 2026",
  "cadastro_expires_at": "2026-01-20T00:00:00Z",
  "cadastro_max_uses": 100,
  "cadastro_current_uses": 5
}
```

## 🔄 Próximos Passos

1. Localizar e atualizar a interface frontend
2. Testar as funcionalidades de validade e limite de usos
3. Remover completamente o arquivo `routes/uniqueLinks.routes.js` (opcional, já está desabilitado)
4. Executar a migration 090 no banco de dados de produção

## 📝 Notas

- O sistema de Links Únicos foi desabilitado mas não removido completamente (arquivo ainda existe)
- Todas as funcionalidades foram migradas para o Link de Cadastro
- O Link de Cadastro agora suporta todas as funcionalidades que os Links Únicos tinham
- A validação e contagem de usos são automáticas no backend
