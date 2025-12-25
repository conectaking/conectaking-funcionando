# 🔐 Autorizar Push do Backend para Bitbucket

## ✅ Configurar Autorização Automática

Execute este comando no terminal do Cursor para autorizar o push:

```powershell
cd "C:\Users\playa\Desktop\CONECTA KING MVP DEZEMBRO\conecta-king-backend"
npm run config-auth
```

Ou execute diretamente:

```powershell
.\configurar-autenticacao.ps1
```

---

## 📋 O que o Script Faz

1. ✅ Configura o token na URL do repositório
2. ✅ Verifica se a configuração funcionou
3. ✅ Testa a conexão com o Bitbucket
4. ✅ Autoriza push automático sem pedir senha

---

## 🎯 Depois de Configurar

Após executar o script, você poderá fazer push sem precisar digitar senha:

```powershell
npm run push
```

Ou:

```powershell
.\push-auto.ps1
```

---

## 🔍 Verificar se Está Configurado

Para verificar se a autorização está configurada:

```powershell
git remote -v
```

Deve mostrar a URL com o token configurado.

---

## ✅ Testar Push

Depois de configurar, teste o push:

```powershell
git push origin main
```

Se não pedir senha, está funcionando! ✅

---

## 🆘 Se Ainda Não Funcionar

1. Verifique se o token está correto
2. Execute o script de configuração novamente
3. Verifique sua conexão com a internet
4. Tente fazer push manualmente uma vez para salvar credenciais

---

**Execute `npm run config-auth` para autorizar o push!** 🚀
