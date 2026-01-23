# 🔧 Corrigir Erro 403: access_denied

## 🔴 Erro Atual

Você está vendo o erro:
```
Erro 403: access_denied
O app conectaking-api.onrender.com não concluiu o processo de verificação do Google.
Ele está em fase de testes e só pode ser acessado por testadores aprovados pelo desenvolvedor.
```

## ✅ Solução: Adicionar Usuários de Teste

O app OAuth está em **modo de teste** e precisa ter usuários adicionados como testadores.

---

## 🔧 Passo a Passo para Corrigir

### 1. Acesse o Google Cloud Console

1. Vá para: https://console.cloud.google.com
2. Selecione o projeto **"Conecta King Agenda"**
3. No menu lateral: **"APIs e Serviços"** > **"Tela de consentimento OAuth"**

### 2. Adicione Usuários de Teste

1. Na tela de consentimento, role até a seção **"Usuários de teste"**
2. Clique em **"+ Adicionar usuários"** ou **"Add Users"**
3. Adicione o email que você está usando para testar:
   - Exemplo: `playadrian@gmail.com`
   - Você pode adicionar múltiplos emails (um por linha)
4. Clique em **"Adicionar"** ou **"Add"**

### 3. Salvar e Aguardar

1. Clique em **"Salvar"** ou **"Save"**
2. Aguarde alguns segundos para as alterações serem aplicadas

### 4. Testar Novamente

1. Volte ao dashboard
2. Tente conectar o Google Calendar novamente
3. Deve funcionar! ✅

---

## 📋 Emails para Adicionar

Adicione **todos os emails** que vão usar a agenda:

- `playadrian@gmail.com` (seu email atual)
- Qualquer outro email que você queira permitir

---

## ⚠️ Importante

### Limite de Usuários de Teste:
- **Máximo 100 usuários** podem ser adicionados como testadores
- Se precisar de mais, você precisará publicar o app (processo mais complexo)

### Para Produção (Futuro):
Se você quiser que **qualquer pessoa** possa usar sem adicionar como testador, você precisará:
1. Completar a verificação do app no Google
2. Publicar o app
3. Isso requer mais documentação e pode levar alguns dias

**Por enquanto, adicionar como testador é suficiente!**

---

## 🎯 Passo a Passo Visual

```
Google Cloud Console
  ↓
APIs e Serviços
  ↓
Tela de consentimento OAuth
  ↓
Usuários de teste
  ↓
+ Adicionar usuários
  ↓
Digite: playadrian@gmail.com
  ↓
Adicionar
  ↓
Salvar
  ↓
Testar novamente ✅
```

---

## ✅ Checklist

- [ ] Acessei o Google Cloud Console
- [ ] Selecionei o projeto "Conecta King Agenda"
- [ ] Fui em "APIs e Serviços" > "Tela de consentimento OAuth"
- [ ] Rolei até "Usuários de teste"
- [ ] Cliquei em "+ Adicionar usuários"
- [ ] Adicionei o email `playadrian@gmail.com`
- [ ] Cliquei em "Adicionar"
- [ ] Salvei as alterações
- [ ] Aguardei alguns segundos
- [ ] Testei a conexão novamente
- [ ] Funcionou! ✅

---

## 🆘 Se Ainda Não Funcionar

### Verificar se o email está correto:
- Certifique-se de que o email adicionado é **exatamente** o mesmo que você está usando para fazer login no Google

### Limpar cache do navegador:
- Tente em uma janela anônima/privada
- Ou limpe o cache e cookies do Google

### Aguardar mais tempo:
- Às vezes leva alguns minutos para as alterações serem aplicadas
- Aguarde 2-3 minutos e tente novamente

---

## 📝 Resumo Rápido

1. **Google Cloud Console** → **Tela de consentimento OAuth**
2. **Usuários de teste** → **+ Adicionar usuários**
3. Adicione: `playadrian@gmail.com`
4. **Salvar**
5. **Testar novamente**

---

## ✅ Pronto!

Após adicionar seu email como testador, o erro 403 deve desaparecer e a conexão com Google Calendar deve funcionar! 🎉
