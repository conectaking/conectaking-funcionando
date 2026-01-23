# Instruções: Correções Planos Individuais

## Problemas Corrigidos

1. ✅ **Modal de seleção de usuário** agora aparece no espaço abaixo do botão "Adicionar Plano Individual" (em vez de aparecer do lado direito)
2. ✅ **Funcionalidade de remover planos** individuais adicionada

## Arquivos Criados

1. **`public/js/individual-plans-fix.js`** - JavaScript com as correções
2. **`public/css/individual-plans-fix.css`** - Estilos para o modal na área de conteúdo
3. **Rotas de API adicionadas** em `routes/moduleAvailability.js`:
   - `DELETE /api/modules/individual-plans/:userId/:moduleType` - Remover módulo específico
   - `DELETE /api/modules/individual-plans/:userId` - Remover todos os módulos de um usuário

## Como Adicionar na Página

### 1. Adicionar CSS

No `<head>` da página de "Separação de Pacotes":

```html
<link rel="stylesheet" href="/css/individual-plans-fix.css">
```

### 2. Adicionar JavaScript

Antes do fechamento do `</body>`:

```html
<script src="/js/individual-plans-fix.js"></script>
```

## Funcionalidades

### 1. Modal Reposicionado

- O modal "Selecionar Usuário" agora aparece **grande no espaço abaixo** do botão "Adicionar Plano Individual"
- Não aparece mais do lado direito como sidebar
- Ocupa toda a largura disponível na área de conteúdo
- Estilizado para se integrar melhor com o design

### 2. Remover Planos Individuais

- Botão "Remover" aparece em cada plano individual configurado
- Permite remover módulos específicos ou todos os módulos de um usuário
- Confirmação antes de remover
- Feedback visual durante o processo
- Recarrega a lista automaticamente após remoção

## Estrutura Esperada

O script procura por:

- **Modal de seleção**: `.user-selector-modal`, `.select-user-modal`, ou elementos com classes contendo `user-select` ou `select-user`
- **Área de conteúdo**: `.individual-plans-content`, `.plans-content`, ou área de conteúdo principal
- **Lista de planos**: `.individual-plans-list`, `.plans-list`, ou elementos com classes contendo `plans-list`

## Uso da API

### Remover módulo específico:

```javascript
DELETE /api/modules/individual-plans/:userId/:moduleType
```

Exemplo:
```javascript
DELETE /api/modules/individual-plans/user123/carousel
```

### Remover todos os módulos de um usuário:

```javascript
DELETE /api/modules/individual-plans/:userId
```

Exemplo:
```javascript
DELETE /api/modules/individual-plans/user123
```

## Notas

- O script detecta automaticamente quando o modal é criado (mesmo que dinamicamente)
- Usa MutationObserver para detectar mudanças no DOM
- Funciona com conteúdo carregado dinamicamente
- Pode ser chamado manualmente: `window.fixIndividualPlansInterface()`

## Exemplo de Uso Manual

Se precisar forçar a atualização:

```javascript
// No console do navegador ou no código
window.fixIndividualPlansInterface();
```

## Resultado Esperado

1. ✅ Ao clicar em "Adicionar Plano Individual", o modal aparece **grande no espaço abaixo** do botão
2. ✅ Planos individuais configurados mostram botão "Remover" 
3. ✅ Ao clicar em "Remover", o plano é removido e a lista é atualizada
