# 🔧 Correção de Erros do Módulo Carrossel

## 📋 Problemas Identificados

### 1. **Erro 500: `ReferenceError: insertedId is not defined`**
   - **Localização**: `routes/profile.js`, linha 395
   - **Causa**: A variável `insertedId` era definida dentro do bloco `try`, mas era usada fora dele. Se houvesse algum problema no escopo, a variável não estaria disponível.
   - **Solução**: Declarada `insertedId` fora do bloco `try` e adicionada verificação `&& insertedId` antes de usar.

### 2. **Dupla Codificação JSON no `destination_url`**
   - **Causa**: O `destination_url` do carrossel estava sendo codificado duas vezes como JSON, resultando em `"[\"https://...\"]"` em vez de `["https://..."]`.
   - **Solução**: Adicionada normalização do `destination_url` antes de salvar, garantindo que seja sempre um JSON válido de array.

## ✅ Correções Aplicadas

### Arquivo: `routes/profile.js`

1. **Correção do erro `insertedId is not defined`**:
   ```javascript
   // Declarar insertedId fora do try para que possa ser usada depois
   let insertedId = null;
   
   try {
       // ... código do INSERT ...
       insertedId = result.rows[0].id;
   } catch (insertError) {
       // ... tratamento de erro ...
   }
   
   // Verificação antes de usar
   if (item.item_type === 'sales_page' && insertedId) {
       // ... código que usa insertedId ...
   }
   ```

2. **Normalização do `destination_url` para carrossel**:
   ```javascript
   // Normalizar destination_url para carrossel (evitar dupla codificação JSON)
   let normalizedDestinationUrl = item.destination_url || null;
   if (item.item_type === 'carousel' && normalizedDestinationUrl) {
       try {
           // Se já for uma string JSON válida, tentar parsear e re-stringify para garantir formato correto
           const parsed = JSON.parse(normalizedDestinationUrl);
           if (Array.isArray(parsed)) {
               normalizedDestinationUrl = JSON.stringify(parsed);
           } else {
               // Se não for array, converter para array
               normalizedDestinationUrl = JSON.stringify([parsed]);
           }
       } catch (e) {
           // Se não for JSON válido, tentar tratar como string simples
           if (typeof normalizedDestinationUrl === 'string' && !normalizedDestinationUrl.startsWith('[')) {
               normalizedDestinationUrl = JSON.stringify([normalizedDestinationUrl]);
           }
       }
   }
   ```

## 🔍 Verificações Realizadas

### ✅ Constraint CHECK
- O tipo `'carousel'` já está incluído na constraint CHECK da tabela `profile_items`
- Não é necessária migration adicional para isso

### ✅ Estrutura do Banco de Dados
- A tabela `profile_items` já possui todas as colunas necessárias:
  - `destination_url` (TEXT) - para armazenar JSON de imagens
  - `image_url` (TEXT) - para primeira imagem do carrossel
  - `aspect_ratio` (VARCHAR) - para proporção de aspecto
  - `item_type` (VARCHAR/ENUM) - já inclui 'carousel'

## 📝 Como Testar

1. **Criar um novo carrossel**:
   - Adicionar módulo do tipo "Carrossel"
   - Adicionar imagens ao carrossel
   - Salvar alterações
   - ✅ Deve salvar sem erro 500

2. **Editar carrossel existente**:
   - Abrir modal de edição do carrossel
   - Adicionar/remover imagens
   - Alterar título ou proporção de aspecto
   - Salvar alterações
   - ✅ Deve salvar sem erro 500

3. **Verificar dados no banco**:
   - O `destination_url` deve conter um JSON válido de array: `["url1", "url2", ...]`
   - Não deve conter dupla codificação: `"[\"url1\"]"`

## 🎯 Resultado Esperado

- ✅ Carrossel salva sem erro 500
- ✅ `destination_url` armazenado corretamente como JSON de array
- ✅ Imagens do carrossel são carregadas corretamente ao editar
- ✅ Sem dupla codificação JSON

## 📌 Arquivos Modificados

- `routes/profile.js` - Correção do erro `insertedId` e normalização do `destination_url`

## 🔄 Próximos Passos (Opcional)

Se ainda houver problemas:
1. Verificar logs do servidor para erros específicos
2. Verificar se o frontend está enviando `destination_url` no formato correto
3. Verificar se há outros lugares onde o carrossel é processado que possam causar problemas
