# 🔄 Como Reiniciar o Servidor no Terminal

## 🪟 Windows (PowerShell)

### Método 1: Parar e Iniciar Manualmente

1. **Parar o servidor:**
   - No terminal onde o servidor está rodando, pressione: `Ctrl + C`
   - Aguarde o servidor parar completamente

2. **Iniciar novamente:**
   ```powershell
   npm start
   ```
   ou
   ```powershell
   node server.js
   ```

### Método 2: Usando um Comando Único

Se o servidor estiver rodando em outro terminal, você pode:

1. **Encontrar o processo:**
   ```powershell
   Get-Process -Name node | Select-Object Id, ProcessName
   ```

2. **Parar o processo:**
   ```powershell
   Stop-Process -Name node -Force
   ```

3. **Iniciar novamente:**
   ```powershell
   npm start
   ```

### Método 3: Reiniciar Rapidamente (Recomendado)

1. **No terminal onde o servidor está rodando:**
   - Pressione `Ctrl + C` para parar
   - Pressione a seta para cima `↑` para repetir o último comando
   - Pressione `Enter` para iniciar novamente

---

## 🐧 Linux/Mac (Bash)

### Método 1: Parar e Iniciar Manualmente

1. **Parar o servidor:**
   - Pressione: `Ctrl + C`

2. **Iniciar novamente:**
   ```bash
   npm start
   ```
   ou
   ```bash
   node server.js
   ```

### Método 2: Usando um Comando Único

```bash
pkill -f "node server.js" && npm start
```

---

## 🔍 Verificar se o Servidor Está Rodando

### Windows (PowerShell):
```powershell
Get-Process -Name node -ErrorAction SilentlyContinue
```

### Linux/Mac:
```bash
ps aux | grep "node server.js"
```

---

## ⚡ Comandos Rápidos

### Windows:
```powershell
# Parar
Ctrl + C

# Iniciar
npm start
```

### Linux/Mac:
```bash
# Parar
Ctrl + C

# Iniciar
npm start
```

---

## 🎯 Passo a Passo Completo

1. **Abra o terminal/PowerShell**
2. **Navegue até a pasta do projeto:**
   ```powershell
   cd "d:\CONECTA 2026\conectaking-funcionando"
   ```

3. **Se o servidor estiver rodando:**
   - Pressione `Ctrl + C` para parar
   - Aguarde alguns segundos

4. **Inicie o servidor:**
   ```powershell
   npm start
   ```

5. **Aguarde a mensagem de sucesso:**
   ```
   Servidor rodando na porta 5000
   ```

---

## 🔧 Se o Servidor Não Parar

### Windows:
```powershell
# Forçar parada de todos os processos Node
Stop-Process -Name node -Force
```

### Linux/Mac:
```bash
# Forçar parada
pkill -9 node
```

---

## 📝 Dica: Usar Nodemon (Desenvolvimento)

Para reiniciar automaticamente quando houver mudanças no código:

1. **Instalar nodemon:**
   ```powershell
   npm install -g nodemon
   ```

2. **Iniciar com nodemon:**
   ```powershell
   nodemon server.js
   ```

   Agora o servidor reinicia automaticamente quando você salva arquivos!

---

## ✅ Checklist de Reinicialização

- [ ] Parei o servidor (Ctrl + C)
- [ ] Aguardei alguns segundos
- [ ] Executei `npm start` ou `node server.js`
- [ ] Verifiquei que o servidor iniciou corretamente
- [ ] Testei acessando a API

---

## 🆘 Problemas Comuns

### "Porta já em uso"
Se aparecer erro de porta em uso:

**Windows:**
```powershell
# Encontrar processo usando a porta 5000
netstat -ano | findstr :5000

# Parar o processo (substitua PID pelo número encontrado)
Stop-Process -Id PID -Force
```

**Linux/Mac:**
```bash
# Encontrar e parar processo na porta 5000
lsof -ti:5000 | xargs kill -9
```

---

## 🎯 Resumo Rápido

**Para reiniciar:**
1. `Ctrl + C` (parar)
2. `npm start` (iniciar)

**Pronto!** 🚀
