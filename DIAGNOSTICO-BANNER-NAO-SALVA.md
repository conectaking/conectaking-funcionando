# Diagnóstico: Banner não está salvando nome e mensagem

## Verificações Necessárias

### 1. Verificar se as colunas existem no banco de dados

Execute este SQL no DBeaver:

```sql
-- Verificar se a coluna title existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profile_items' 
AND column_name = 'title';

-- Verificar se a coluna whatsapp_message existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profile_items' 
AND column_name = 'whatsapp_message';
```

**Resultado esperado:**
- `title` deve existir (é uma coluna padrão)
- `whatsapp_message` deve existir (foi criada pela migration)

**Se `whatsapp_message` não existir:**
Execute a migration:
```sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profile_items' 
        AND column_name = 'whatsapp_message'
    ) THEN
        ALTER TABLE profile_items 
        ADD COLUMN whatsapp_message TEXT;
    END IF;
    
    COMMENT ON COLUMN profile_items.whatsapp_message IS 'Mensagem personalizada para links do WhatsApp (usado apenas para banners com destino WhatsApp)';
END $$;
```

### 2. Verificar logs no console do navegador

Quando você edita e salva um banner, verifique no console:

1. **Ao abrir o modal:**
   - Deve aparecer: `Modal Banner - Nome atual carregado:`
   - Verifique se `currentBannerName` tem um valor (não deve ser "Object")

2. **Ao fechar o modal (clicar em "Salvar Alterações" no modal):**
   - Deve aparecer: `✅ Modal Banner - Nome atualizado na lista:`
   - Deve aparecer: `✅ Modal Banner - Mensagem WhatsApp atualizada:`

3. **Ao salvar tudo (clicar em "Salvar Alterações" principal):**
   - Deve aparecer: `=== BANNER - DADOS PARA SALVAR ===`
   - Deve mostrar `title` e `whatsapp_message` com os valores corretos
   - Deve aparecer: `🔵 Banner X:` com os dados

4. **No backend (logs do servidor):**
   - Deve aparecer: `Backend - Salvando banner:`
   - Deve mostrar `title` e `whatsapp_message`
   - Deve aparecer: `✅ X itens atualizados. Banners: Y`

### 3. Verificar se os dados estão sendo salvos

Execute este SQL para verificar os dados salvos:

```sql
SELECT 
    id,
    item_type,
    title,
    whatsapp_message,
    destination_url,
    image_url
FROM profile_items 
WHERE item_type = 'banner'
ORDER BY display_order;
```

Verifique se os valores de `title` e `whatsapp_message` estão sendo salvos.

### 4. Problemas Comuns e Soluções

#### Problema: "Modal Banner - Nome atual carregado: Object"
**Causa:** O `itemOriginalData.title` está vindo como objeto em vez de string.
**Solução:** Já corrigido - o código agora converte para string.

#### Problema: Valor não aparece no modal
**Causa:** O valor não está sendo carregado dos dados originais.
**Solução:** Verifique se `item.title` está sendo retornado pelo backend.

#### Problema: Valor não é salvo
**Causa:** O valor não está sendo coletado corretamente ao salvar.
**Solução:** Verifique os logs no console para ver o que está sendo enviado.

### 5. Teste Completo

1. Abra o console do navegador (F12)
2. Edite um banner:
   - Mude o nome para "WhatsApp"
   - Adicione uma mensagem personalizada
3. Clique em "Salvar Alterações" no modal
4. Verifique os logs:
   - `✅ Modal Banner - Nome atualizado na lista: WhatsApp`
   - `✅ Modal Banner - Mensagem WhatsApp atualizada: [sua mensagem]`
5. Clique em "Salvar Alterações" no botão principal
6. Verifique os logs:
   - `=== BANNER - DADOS PARA SALVAR ===`
   - `title: "WhatsApp"`
   - `whatsapp_message: [sua mensagem]`
7. Recarregue a página
8. Verifique se os valores foram salvos

### 6. Se ainda não funcionar

Envie:
1. Os logs do console do navegador
2. Os logs do servidor (backend)
3. O resultado da query SQL de verificação das colunas
4. O resultado da query SQL dos dados salvos

Isso vai ajudar a identificar exatamente onde está o problema.
