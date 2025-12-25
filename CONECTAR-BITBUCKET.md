# 🔗 Como Conectar ao Bitbucket

## 📋 Passo a Passo

### **PASSO 1: Obter a URL do Repositório Bitbucket**

Você precisa da URL do seu repositório no Bitbucket. Ela tem um destes formatos:

- **HTTPS:** `https://bitbucket.org/seu-usuario/nome-do-repositorio.git`
- **SSH:** `git@bitbucket.org:seu-usuario/nome-do-repositorio.git`

**Como encontrar:**
1. Acesse seu repositório no Bitbucket
2. Clique em "Clone"
3. Copie a URL (prefira HTTPS se não tiver SSH configurado)

---

### **PASSO 2: Remover o Remote Atual (GitHub)**

```bash
cd "C:\Users\playa\Desktop\CONECTA KING MVP DEZEMBRO\backend-conecta-king"
git remote remove origin
```

---

### **PASSO 3: Adicionar o Remote do Bitbucket**

Substitua `SUA-URL-BITBUCKET` pela URL real:

```bash
git remote add origin SUA-URL-BITBUCKET
```

**Exemplo:**
```bash
git remote add origin https://bitbucket.org/seu-usuario/conecta-king-backend.git
```

---

### **PASSO 4: Verificar se Funcionou**

```bash
git remote -v
```

Deve mostrar a URL do Bitbucket agora.

---

### **PASSO 5: Fazer Push para o Bitbucket**

```bash
# Primeiro commit (se ainda não tiver feito)
git add .
git commit -m "Initial commit: Backend Conecta King"

# Ou se já tiver commits, fazer push
git push -u origin main
```

**Nota:** Se a branch for `master` ao invés de `main`:
```bash
git push -u origin master
```

---

## 🔐 **Autenticação no Bitbucket**

O Bitbucket pode pedir autenticação. Você tem duas opções:

### **Opção 1: App Password (Recomendado)**

1. No Bitbucket, vá em **Settings → Personal settings → App passwords**
2. Crie uma nova App Password
3. Use seu **usuário** e a **App Password** quando pedir senha

### **Opção 2: SSH Key**

Se preferir SSH, configure uma chave SSH primeiro.

---

## ⚠️ **Se Der Erro de Autenticação**

Se der erro ao fazer push, tente:

```bash
# Use sua App Password do Bitbucket quando pedir senha
git push -u origin main
```

Ou configure credenciais:

```bash
git config --global credential.helper wincred
```

---

## ✅ **Depois de Conectar**

Após conectar ao Bitbucket:

1. **Configure o Render para usar o Bitbucket:**
   - No painel do Render, vá em **Settings**
   - Em **Repository**, selecione seu repositório Bitbucket
   - O Render fará deploy automaticamente quando você fizer push

2. **Faça push das alterações:**
   ```bash
   git add .
   git commit -m "Fix: Correções recuperação de senha"
   git push origin main
   ```

---

## 🆘 **Precisa de Ajuda?**

Me informe:
- Qual é a URL do seu repositório no Bitbucket?
- Ou o nome do usuário e repositório?

E eu preparo os comandos exatos para você!

