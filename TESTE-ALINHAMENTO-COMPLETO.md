# Teste Completo - Alinhamento do Conteúdo dos Botões

## Status Atual
✅ Coluna `button_content_align` existe no banco de dados  
✅ Não há valores NULL (todos os registros têm um valor)  
⚠️ O alinhamento não está sendo aplicado no cartão público

## Próximos Passos para Testar

### 1. Verificar Valores Atuais no Banco (DBeaver)

Execute este SQL para ver os valores atuais:

```sql
-- Ver TODOS os valores atuais nos perfis
SELECT 
    user_id,
    button_content_align,
    display_name
FROM user_profiles
ORDER BY user_id
LIMIT 10;
```

**Anote qual valor está salvo para o seu usuário**

### 2. Verificar se o Valor Está Sendo Salvo Corretamente

1. **No Dashboard:**
   - Abra o dashboard e vá na aba "Personalizar"
   - Mude o alinhamento para "center" (centralizado)
   - Clique em "Salvar Alterações"
   - Aguarde a mensagem de sucesso

2. **Verificar no Banco (DBeaver):**
   Execute novamente o SQL acima e verifique se o valor mudou para `center`

### 3. Verificar se o Valor Está Sendo Recuperado Corretamente

1. **No Dashboard (Console do Navegador):**
   - Abra o console (F12)
   - Recarregue a página do dashboard
   - Digite no console: `localStorage.getItem('profileData')` ou verifique no Network tab se a resposta da API contém `button_content_align`

2. **Verificar no Template:**
   - O valor deve estar sendo passado para o template `profile.ejs`
   - Verifique os logs do servidor quando acessa o cartão público

### 4. Testar o Cartão Público

1. **Limpar Cache:**
   - Abra o cartão público em uma nova aba anônima/privada (Ctrl+Shift+N)
   - Ou limpe o cache: Ctrl+Shift+Delete → Limpar dados de navegação

2. **Verificar o HTML Renderizado:**
   - Abra o DevTools (F12)
   - Vá na aba "Elements" ou "Inspetor"
   - Procure por elementos com classe `.profile-link`
   - Veja se o `style` contém `justify-content: center` (ou o valor que você definiu)

### 5. Debug no Template

Se o valor não estiver aparecendo, adicione temporariamente este código no arquivo `views/profile.ejs` antes da linha 61:

```ejs
<!-- DEBUG: Remover depois -->
<!-- button_content_align: <%= details.button_content_align %> -->
<!-- alignValue: <%= alignValue %> -->
```

Isso mostrará no HTML (via View Source) qual valor está chegando ao template.

## Possíveis Problemas e Soluções

### Problema 1: Valor não está sendo salvo
**Solução:** Verifique os logs do servidor quando clica em "Salvar Alterações". Deve mostrar o SQL UPDATE sendo executado.

### Problema 2: Valor está salvo mas não aparece no template
**Solução:** Verifique se a query `SELECT p.*` está retornando o campo `button_content_align`. Adicione um log na rota `publicProfile.js`:

```javascript
console.log('button_content_align:', details.button_content_align);
```

### Problema 3: CSS não está sendo aplicado
**Solução:** Verifique se o CSS inline no template está sendo gerado corretamente. No HTML renderizado, procure por:

```html
<style>
.profile-link, .profile-button-pix {
    justify-content: center !important;
}
</style>
```

### Problema 4: Cache do navegador
**Solução:** 
- Limpe completamente o cache
- Use modo anônimo/privado
- Adicione `?v=timestamp` ao CSS no template para forçar reload

## Comandos Úteis para Debug

### Ver logs do servidor
- Verifique os logs no Render ou onde o servidor está rodando
- Procure por mensagens de erro relacionadas a `button_content_align`

### Verificar diretamente no banco
```sql
-- Ver o valor atual do seu usuário (substitua USER_ID pelo seu ID)
SELECT user_id, button_content_align, display_name
FROM user_profiles
WHERE user_id = 'SEU_USER_ID';
```

## Checklist Final

- [ ] Valor está salvo corretamente no banco (verificado via SQL)
- [ ] Valor é carregado corretamente no dashboard (radio button selecionado)
- [ ] Valor é enviado corretamente ao salvar (verificar Network tab)
- [ ] Valor é recuperado na rota publicProfile (verificar logs)
- [ ] Template está recebendo o valor (verificar HTML renderizado)
- [ ] CSS está sendo aplicado (verificar estilo inline no HTML)
- [ ] Cache foi limpo (usar modo anônimo)

