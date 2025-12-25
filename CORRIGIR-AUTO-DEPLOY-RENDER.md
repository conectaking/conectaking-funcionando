# Como Corrigir Auto-Deploy do Render

## Problema
Os commits estão indo para o Bitbucket, mas o Render não está detectando automaticamente.

## Solução 1: Verificar Auto-Deploy no Render

✅ **STATUS ATUAL:** Auto-Deploy está configurado como **"On Commit"** (ATIVADO)

Se o Auto-Deploy está ativado mas os commits não estão sendo detectados, o problema pode ser:
1. Webhook do Bitbucket não está funcionando
2. Conexão do repositório precisa ser reconfigurada
3. Problema temporário do Render

## Solução 2: Verificar Conexão com Bitbucket

1. No painel do Render, vá em **"Settings"**
2. Procure a seção **"Repository"** ou **"Git Repository"**
3. Verifique se o repositório está conectado corretamente:
   - Deve mostrar: `conecta-king-backend / conecta-king-backend`
   - Branch: `main`
4. Se não estiver conectado, clique em **"Connect Repository"** e reconecte

## Solução 3: Forçar Deploy Manual (Temporário)

Se o Auto-Deploy não funcionar imediatamente, você pode fazer deploy manual:

1. No painel do Render, vá para o serviço `conectaking-api`
2. Clique no botão **"Manual Deploy"** ou **"Deploy latest commit"**
3. Selecione o commit mais recente (`bb03c03` ou `ac4bbe1`)
4. Clique em **"Deploy"**

## Solução 4: Usar Deploy Hook (Alternativa Rápida)

O Render fornece um **Deploy Hook** que pode ser usado para forçar deploy:

1. No painel do Render, vá em **"Settings"** > **"Build & Deploy"**
2. Na seção **"Deploy Hook"**, clique no ícone de **olho** para revelar a URL
3. Copie a URL do Deploy Hook
4. Você pode chamar essa URL via:
   - Navegador: abra a URL no navegador
   - PowerShell: `Invoke-WebRequest -Uri "URL_DO_DEPLOY_HOOK"`
   - Ou adicionar como webhook no Bitbucket

## Solução 5: Reconfigurar Conexão do Repositório

Se o Auto-Deploy não funcionar, tente reconectar o repositório:

1. No painel do Render, vá em **"Settings"** > **"General"** ou procure **"Repository"**
2. Clique em **"Disconnect"** ou **"Change Repository"**
3. Reconecte o repositório `conecta-king-backend / conecta-king-backend`
4. Certifique-se de que a branch está como `main`
5. Isso recriará o webhook automaticamente

## Verificação Rápida

Para verificar se o Render está detectando commits:

1. Vá em **"Events"** no painel do Render
2. Os commits mais recentes devem aparecer automaticamente
3. Se não aparecerem, o Auto-Deploy está desativado ou há problema de conexão

## Commits Pendentes

Os seguintes commits estão no Bitbucket mas não foram deployados no Render:
- `d14a56b` - chore: forçar deploy no Render
- `bb03c03` - fix: adicionar validate.trustProxy nos rate limiters
- `ac4bbe1` - fix: configurar trust proxy para resolver erros
- `8bd54c0` - refactor: melhorar lógica do carrossel

## Solução Recomendada (Imediata)

Como o Auto-Deploy está ativado mas não está funcionando:

1. **Faça um Deploy Manual agora:**
   - No Render, vá para o serviço `conectaking-api`
   - Clique em **"Manual Deploy"** ou procure o botão de deploy
   - Selecione o commit mais recente (`d14a56b`)
   - Isso vai fazer deploy de todos os commits pendentes

2. **Depois, reconecte o repositório:**
   - Isso vai recriar o webhook e resolver o problema de Auto-Deploy
