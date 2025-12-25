# 🚀 Push do Backend para Bitbucket - Guia Rápido

## ✅ Sempre fazer push do BACKEND apenas

Este guia é para fazer push **SOMENTE** do backend (`conecta-king-backend`) para o Bitbucket.

---

## 🎯 Método Mais Rápido: Script Automático

### **Opção 1: Usando npm (Recomendado)**

No terminal do Cursor, execute:

```bash
cd "C:\Users\playa\Desktop\CONECTA KING MVP DEZEMBRO\conecta-king-backend"
npm run push
```

Isso faz tudo automaticamente:
- ✅ Adiciona alterações
- ✅ Faz commit
- ✅ Envia para Bitbucket

---

### **Opção 2: Executar Script Diretamente**

```powershell
cd "C:\Users\playa\Desktop\CONECTA KING MVP DEZEMBRO\conecta-king-backend"
.\push-auto.ps1
```

---

## 📋 Método Manual (Se Preferir)

```powershell
# 1. Ir para a pasta do BACKEND
cd "C:\Users\playa\Desktop\CONECTA KING MVP DEZEMBRO\conecta-king-backend"

# 2. Ver o que mudou
git status

# 3. Adicionar tudo
git add .

# 4. Fazer commit
git commit -m "Atualização do backend"

# 5. Enviar para Bitbucket
git push origin main
```

---

## 🔐 Autenticação

O token já está configurado. Se pedir credenciais:

- **Usuário:** `conectaking`
- **Senha:** Token já configurado (não precisa digitar)

---

## ⚠️ IMPORTANTE

- ✅ **SEMPRE** fazer push da pasta: `conecta-king-backend`
- ❌ **NÃO** fazer push da pasta: `public_html` (frontend)
- ✅ O backend vai para: `conecta-king-backend/conecta-king-backend` (Bitbucket)

---

## 📍 Localização

- **Pasta do Backend:** `C:\Users\playa\Desktop\CONECTA KING MVP DEZEMBRO\conecta-king-backend`
- **Repositório Bitbucket:** `conecta-king-backend/conecta-king-backend`
- **Branch:** `main`

---

## ✅ Verificar se Funcionou

Após o push:

1. **Bitbucket:** https://bitbucket.org/conecta-king-backend/conecta-king-backend
2. **Render Dashboard:** https://dashboard.render.com
3. **API Health:** https://conectaking-api.onrender.com/api/health

---

## 🎉 Comando Rápido (Copiar e Colar)

```powershell
cd "C:\Users\playa\Desktop\CONECTA KING MVP DEZEMBRO\conecta-king-backend" && npm run push
```

---

**Sempre use este guia para fazer push do BACKEND!** 🚀
