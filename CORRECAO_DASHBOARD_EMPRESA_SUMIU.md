# ✅ Correção: Modo Empresa e Botões Sumiram no Dashboard

## Problema Identificado

No dashboard:
1. ❌ **Modo Empresa não aparece** (aba/tab sumiu)
2. ❌ **Botões de "alterar logo" sumiram**
3. ❌ **Painel está vazio** quando há erro de conexão
4. ❌ Erros no console: "Failed to fetch", "Erro de conexão"

## Causa Raiz

O problema ocorre quando:
1. As requisições para `/api/profile`, `/api/account/status`, `/api/modules/available` falham
2. O dashboard não consegue carregar o `accountType` do usuário
3. Sem o `accountType`, o código não sabe se deve mostrar o "Modo Empresa"
4. Elementos são escondidos ou não renderizados quando há erro

## Solução Implementada

### Arquivo Criado

**`public/js/dashboard-error-handler.js`** - Handler que:
- ✅ Carrega `accountType` do cache (localStorage/sessionStorage)
- ✅ Garante que elementos do Modo Empresa apareçam mesmo com erro
- ✅ Intercepta erros de conexão
- ✅ Restaura elementos que foram escondidos por erro
- ✅ Observa mudanças no DOM para detectar elementos escondidos

### Funcionalidades

1. **Carregamento de Cache**
   - Tenta carregar `accountType` de múltiplas fontes:
     - `window.accountData.accountType`
     - `localStorage.getItem('accountType')`
     - `sessionStorage.getItem('accountType')`
     - `document.body.getAttribute('data-account-type')`

2. **Detecção de Elementos**
   - Procura por elementos relacionados a "Empresa":
     - Classes: `[class*="empresa"]`, `[class*="Empresa"]`
     - IDs: `[id*="empresa"]`, `[id*="Empresa"]`
     - Data attributes: `[data-empresa]`, `[data-account-type]`
   - Procura por botões de "alterar logo"
   - Procura por abas/tabs de empresa

3. **Restauração de Elementos**
   - Verifica se elementos estão escondidos (`display: none`, `visibility: hidden`)
   - Se o `accountType` é `business_owner`, `individual_com_logo`, `king_corporate` ou `premium`
   - Restaura a visibilidade dos elementos

4. **Interceptação de Erros**
   - Intercepta `console.error` para detectar erros de conexão
   - Quando detecta erro, tenta usar dados em cache
   - Restaura elementos automaticamente

5. **Observação do DOM**
   - Usa `MutationObserver` para detectar quando elementos são escondidos
   - Restaura automaticamente se deveriam estar visíveis

## Como Adicionar

Adicione na página do dashboard (antes de outros scripts):

```html
<!-- Antes do </body> -->
<script src="/js/dashboard-error-handler.js"></script>
```

## Como Funciona

### Fluxo Normal (Sem Erro)

1. Dashboard carrega dados da API
2. `accountType` é armazenado em `window.accountData` e cache
3. Elementos do Modo Empresa aparecem normalmente

### Fluxo com Erro de Conexão

1. Dashboard tenta carregar dados da API → **Falha**
2. Handler detecta erro de conexão
3. Handler carrega `accountType` do cache
4. Handler garante que elementos apareçam mesmo sem dados novos
5. Elementos do Modo Empresa são restaurados

## AccountTypes que Mostram Modo Empresa

- `business_owner` ✅
- `individual_com_logo` ✅
- `king_corporate` ✅
- `premium` ✅

## Funções Globais Expostas

```javascript
// Garantir que elementos apareçam
window.ensureEmpresaElementsVisible();

// Carregar accountType do cache
window.loadAccountTypeFromCache();
```

## Verificação Manual

Se os elementos ainda não aparecerem, execute no console:

```javascript
// Verificar accountType
console.log('AccountType:', window.accountData?.accountType || localStorage.getItem('accountType'));

// Forçar restauração
window.ensureEmpresaElementsVisible();

// Verificar elementos
document.querySelectorAll('[class*="empresa"], [id*="empresa"]').forEach(el => {
    console.log('Elemento:', el, 'Visível:', window.getComputedStyle(el).display !== 'none');
});
```

## Próximos Passos (Recomendado)

Para uma solução mais robusta, o dashboard deveria:

1. **Armazenar accountType no cache** quando carrega com sucesso:
   ```javascript
   // Quando API retorna sucesso
   localStorage.setItem('accountType', data.accountType);
   sessionStorage.setItem('accountType', data.accountType);
   window.accountData = { accountType: data.accountType };
   ```

2. **Usar dados em cache** quando API falha:
   ```javascript
   // Quando API falha
   const accountType = localStorage.getItem('accountType');
   if (accountType) {
       // Usar dados em cache para renderizar
   }
   ```

3. **Não esconder elementos** quando há erro, apenas mostrar mensagem:
   ```javascript
   // Em vez de esconder
   if (error) {
       showErrorMessage('Erro de conexão, usando dados em cache');
       // NÃO esconder elementos
   }
   ```

## Resultado Esperado

Agora o dashboard:
- ✅ **Mostra Modo Empresa** mesmo com erro de conexão (se accountType estiver em cache)
- ✅ **Mostra botões de alterar logo** mesmo com erro
- ✅ **Não fica completamente vazio** quando há erro
- ✅ **Funciona offline** (usando cache)
