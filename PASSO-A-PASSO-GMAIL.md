# 🚀 Passo a Passo Rápido - Configurar Gmail

## ✅ Pré-requisito Concluído

O arquivo `.env` já foi criado em `backend-conecta-king/.env` com todas as variáveis necessárias!

---

## 📋 Agora você precisa seguir estes 3 passos:

### **PASSO 1: Ativar Verificação em Duas Etapas**

1. Acesse: **https://myaccount.google.com/security**
2. Procure por **"Verificação em duas etapas"**
3. Clique em **"Ativar"**
4. Siga as instruções (vai pedir seu telefone)

⏱️ **Tempo:** 2 minutos

---

### **PASSO 2: Gerar Senha de App do Gmail**

1. Acesse: **https://myaccount.google.com/apppasswords**
2. Selecione:
   - **App**: Email
   - **Dispositivo**: "Outro (nome personalizado)" → Digite: "Conecta King"
3. Clique em **"Gerar"**
4. **COPIE A SENHA DE 16 CARACTERES** que aparecer (ex: `abcd efgh ijkl mnop`)
   - ⚠️ Você só verá ela uma vez!

⏱️ **Tempo:** 1 minuto

---

### **PASSO 3: Preencher o arquivo .env**

1. Abra o arquivo: `backend-conecta-king/.env`

2. Preencha estas linhas:

```env
# Seu email Gmail completo
SMTP_USER=seuemail@gmail.com

# A senha de app que você copiou no Passo 2
SMTP_PASS=abcd efgh ijkl mnop
```

3. **Também preencha** (se ainda não tiver):
   - `DB_USER`, `DB_HOST`, `DB_DATABASE`, `DB_PASSWORD` (configurações do banco)
   - `JWT_SECRET` (um texto aleatório longo e seguro)

4. Salve o arquivo

5. **Reinicie o servidor:**
   ```bash
   # Pare o servidor (Ctrl+C) e inicie novamente:
   npm start
   ```

⏱️ **Tempo:** 2 minutos

---

## ✅ Testar

1. Acesse: `http://localhost:5500/recuperar-senha.html`
2. Digite um email válido
3. Clique em "Enviar Instruções"
4. Verifique se o email chegou (pode ir para spam no início)

---

## 📚 Documentação Completa

Para mais detalhes, consulte: `GUIA-CONFIGURACAO-GMAIL.md`

---

## 🎯 Resumo dos Links

- Ativar verificação: https://myaccount.google.com/security
- Gerar senha de app: https://myaccount.google.com/apppasswords

**Tempo total: 5 minutos** ⏱️

