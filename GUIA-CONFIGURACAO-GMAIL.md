# 📧 Guia Completo: Configurar Gmail para Envio de Emails

## ✅ Pré-requisitos Configurados

O arquivo `.env` já foi criado com todas as variáveis necessárias. Agora você precisa preenchê-las seguindo este passo a passo.

---

## 📋 PASSO A PASSO - Configuração do Gmail

### **PASSO 1: Preencher Configurações Básicas no .env**

Abra o arquivo `.env` que está em `backend-conecta-king/.env` e preencha:

1. **Configurações do Banco de Dados** (obrigatório):
   ```env
   DB_USER=seu_usuario_postgres
   DB_HOST=seu_host_postgres
   DB_DATABASE=nome_do_banco
   DB_PASSWORD=sua_senha_postgres
   ```

2. **JWT Secret** (obrigatório):
   ```env
   JWT_SECRET=um_texto_longo_aleatorio_e_seguro_aqui
   ```
   **Dica**: Use um gerador online ou crie uma string aleatória longa.

---

### **PASSO 2: Ativar Verificação em Duas Etapas no Gmail**

**Por que isso é necessário?**  
O Gmail exige verificação em duas etapas para permitir o uso de "Senhas de App" (mais seguro que usar a senha normal).

1. Acesse: **https://myaccount.google.com/security**
2. Faça login com sua conta Gmail
3. Procure pela seção **"Verificação em duas etapas"**
4. Clique em **"Ativar"** ou **"Começar"**
5. Siga as instruções:
   - Pode pedir seu número de telefone
   - Enviará um código de verificação via SMS
   - Confirme o código
6. Complete a configuração

**⏱️ Tempo estimado:** 2-3 minutos

---

### **PASSO 3: Gerar Senha de App do Gmail**

**⚠️ IMPORTANTE:** Você não pode usar sua senha normal do Gmail! Precisa gerar uma "Senha de App" específica.

1. Acesse: **https://myaccount.google.com/apppasswords**
   - Se não aparecer, volte ao Passo 2 e certifique-se de que a verificação em duas etapas está realmente ativada

2. Faça login se necessário

3. Na página "Senhas de app":
   - **Selecione o app**: Escolha **"Email"**
   - **Selecione o dispositivo**: Escolha **"Outro (nome personalizado)"**
   - Digite um nome: **"Conecta King Backend"**
   - Clique em **"Gerar"**

4. O Gmail mostrará uma senha de 16 caracteres assim:
   ```
   xxxx xxxx xxxx xxxx
   ```

5. **⚠️ COPIE ESSA SENHA AGORA!** 
   - Você só verá ela uma vez
   - Copie completa, pode incluir os espaços ou remover (ambos funcionam)

---

### **PASSO 4: Configurar no arquivo .env**

1. Abra o arquivo `.env` em `backend-conecta-king/.env`

2. Preencha as variáveis de email:

   ```env
   # Email Gmail completo
   SMTP_USER=seuemail@gmail.com
   
   # Senha de App gerada no Passo 3
   SMTP_PASS=xxxx xxxx xxxx xxxx
   ```

   **Exemplo real:**
   ```env
   SMTP_USER=conectaking@gmail.com
   SMTP_PASS=abcd efgh ijkl mnop
   ```

3. **Opcionalmente**, ajuste o email remetente:
   ```env
   SMTP_FROM=noreply@conectaking.com.br
   ```
   (Pode deixar assim mesmo)

4. Salve o arquivo

---

### **PASSO 5: Reiniciar o Servidor**

Após configurar o `.env`, você precisa reiniciar o servidor para as mudanças terem efeito:

```bash
# Se o servidor estiver rodando, pare (Ctrl+C)
# Depois inicie novamente:
npm start
```

---

### **PASSO 6: Testar o Sistema**

1. **Acesse a página de recuperação de senha:**
   - Vá para: `http://localhost:5500/recuperar-senha.html` (ou seu domínio)

2. **Informe um email válido:**
   - Use um email que você tenha acesso

3. **Clique em "Enviar Instruções"**

4. **Verifique:**
   - ✅ O email chegou na caixa de entrada?
   - ✅ Ou foi para spam? (é comum no início)
   - ✅ Os logs do backend mostram sucesso?

5. **Verifique os logs do servidor:**
   - Se houver erro, aparecerá nos logs
   - Procure por mensagens como: "Email enviado" ou "Erro ao enviar email"

---

## 🔍 Resolução de Problemas

### ❌ Erro: "Invalid login" ou "Authentication failed"

**Causas possíveis:**
- Senha de App copiada incorretamente
- Verificação em duas etapas não está ativada
- Email digitado errado

**Solução:**
1. Verifique se copiou a senha de app corretamente (sem espaços extras)
2. Certifique-se de que a verificação em duas etapas está ativada
3. Gere uma nova senha de app se necessário

### ❌ Erro: "Connection timeout"

**Causas possíveis:**
- Firewall bloqueando
- Problema de rede
- Porta 587 bloqueada

**Solução:**
1. Verifique se a porta 587 está liberada
2. Tente desabilitar firewall/antivírus temporariamente para testar

### ❌ Emails indo para spam

**Isso é normal!** Especialmente no início. Para melhorar:
- Use SendGrid ou Mailgun no futuro (mais confiáveis)
- Configure SPF/DKIM no seu domínio (avançado)

---

## ✅ Checklist Final

Antes de considerar configurado, verifique:

- [ ] Banco de dados configurado no `.env`
- [ ] JWT_SECRET configurado
- [ ] Verificação em duas etapas do Gmail ativada
- [ ] Senha de App gerada e copiada
- [ ] `SMTP_USER` preenchido com email completo
- [ ] `SMTP_PASS` preenchido com senha de app
- [ ] Servidor reiniciado após alterações
- [ ] Teste de envio realizado com sucesso

---

## 📊 Limites do Gmail Gratuito

- **500 emails por dia**
- Reset diário às 00:00 PST
- Se exceder, emails param até o próximo dia

**Para recuperação de senha, 500/dia é mais que suficiente!**

---

## 📝 Exemplo Completo de .env Preenchido

```env
# Banco de Dados
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=conectaking
DB_PASSWORD=minhasenha123
DB_PORT=5432

# JWT
JWT_SECRET=meu_secret_super_seguro_aleatorio_123456789

# Email Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=meuemail@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
SMTP_FROM=noreply@conectaking.com.br

# URLs
FRONTEND_URL=https://conectaking.com.br
NODE_ENV=production
```

---

## 🎯 Resumo Rápido

1. ✅ Ativar verificação em duas etapas: https://myaccount.google.com/security
2. ✅ Gerar senha de app: https://myaccount.google.com/apppasswords
3. ✅ Preencher `SMTP_USER` e `SMTP_PASS` no `.env`
4. ✅ Reiniciar servidor
5. ✅ Testar

**Tempo total estimado: 5-10 minutos**

---

**Dúvidas?** Consulte os logs do servidor para mensagens de erro específicas.

