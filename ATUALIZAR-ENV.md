# Como Atualizar o Arquivo .env

## Localização
O arquivo `.env` está localizado em:
```
C:\Users\playa\Desktop\CONECTA KING MVP DEZEMBRO\conecta-king-backend\.env
```

## Variáveis Obrigatórias

O arquivo `.env` precisa ter pelo menos estas variáveis:

```env
# Banco de Dados
DB_USER=seu_usuario
DB_HOST=localhost
DB_DATABASE=nome_do_banco
DB_PASSWORD=sua_senha
DB_PORT=5432

# Segurança
JWT_SECRET=seu_jwt_secret_aqui
```

## Variáveis Opcionais (mas recomendadas)

```env
# Servidor
NODE_ENV=development
PORT=5000

# JWT
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# URLs
API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
PUBLIC_PROFILE_URL=http://localhost:5000

# CORS
CORS_ORIGIN=*
```

## Como Atualizar

1. Abra o arquivo `.env` no editor de texto
2. Verifique se todas as variáveis obrigatórias estão presentes
3. Atualize os valores conforme necessário
4. Salve o arquivo

## Verificar se está correto

Execute este comando para verificar se o .env está configurado:

```powershell
cd "C:\Users\playa\Desktop\CONECTA KING MVP DEZEMBRO\conecta-king-backend"
node -e "require('dotenv').config(); console.log('DB_HOST:', process.env.DB_HOST); console.log('DB_DATABASE:', process.env.DB_DATABASE);"
```

Se mostrar os valores corretos, está tudo certo!

## Template Completo

Veja o arquivo `.env.template` para um exemplo completo de todas as variáveis disponíveis.
