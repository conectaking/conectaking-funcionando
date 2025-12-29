# 🔧 Correção: Login Muito Lento (2-4 minutos)

## 📋 Problema Identificado

As requisições de login estavam demorando **2-4 minutos** para responder, causando:
- Timeout no frontend (30 segundos)
- Experiência ruim para o usuário
- Múltiplas tentativas de login

## 🔍 Causas Prováveis

1. **Query do banco demorando muito** - Conexão lenta ou pool esgotado
2. **saveRefreshToken travando** - Múltiplas queries sem timeout
3. **logLogin travando** - Query de log de atividade bloqueando

## ✅ Correções Aplicadas

### 1. Timeout na Query Principal (10 segundos)
```javascript
const queryPromise = db.query('SELECT * FROM users WHERE email = $1', [email]);
const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout: Query do banco demorou mais de 10 segundos')), 10000)
);
const userResult = await Promise.race([queryPromise, timeoutPromise]);
```

### 2. Timeout no saveRefreshToken (5 segundos)
```javascript
const saveTokenPromise = saveRefreshToken(user.id, refreshToken);
const tokenTimeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout ao salvar refresh token')), 5000)
);
await Promise.race([saveTokenPromise, tokenTimeoutPromise]);
```

### 3. Timeout no logLogin (3 segundos)
```javascript
const logPromise = activityLogger.logLogin(user.id, req);
const logTimeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout ao registrar atividade')), 3000)
);
await Promise.race([logPromise, logTimeoutPromise]);
```

### 4. Logs de Duração
- Adicionado log do tempo total de cada login
- Facilita identificar onde está o gargalo

## 🚀 Resultado Esperado

- Login deve responder em **menos de 10 segundos** (timeout máximo)
- Se houver problema no banco, erro será retornado rapidamente
- Operações secundárias (refresh token, log) não bloqueiam o login

## 📊 Monitoramento

Verifique os logs para ver:
- `duration: XXXms` - Tempo total do login
- Erros de timeout específicos
- Quais operações estão demorando mais

## ⚠️ Próximos Passos (se ainda houver problemas)

1. **Verificar pool de conexões do banco:**
   - Ver se há conexões não sendo liberadas
   - Verificar configuração do pool (max/min connections)

2. **Verificar índices no banco:**
   - `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`
   - Garantir que a query `SELECT * FROM users WHERE email = $1` é rápida

3. **Verificar se há locks no banco:**
   - Queries bloqueadas
   - Transações não finalizadas

4. **Considerar cache:**
   - Cache de usuários frequentes
   - Redis para tokens

