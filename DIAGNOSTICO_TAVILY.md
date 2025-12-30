# 🔍 Diagnóstico: Por que Tavily não está sendo usado?

## ✅ Checklist de Verificação

### 1. Configuração no Banco de Dados

Execute esta query para verificar:

```sql
SELECT 
    id,
    is_enabled,
    api_provider,
    CASE 
        WHEN api_key IS NULL THEN '❌ NULL'
        WHEN api_key = '' THEN '❌ VAZIO'
        WHEN LENGTH(api_key) > 0 THEN '✅ Configurado (' || LEFT(api_key, 20) || '...)'
        ELSE '❌ Desconhecido'
    END as api_key_status,
    max_results,
    updated_at
FROM ia_web_search_config
ORDER BY id DESC
LIMIT 1;
```

**Resultado esperado:**
- `is_enabled`: `true` ✅
- `api_provider`: `tavily` ✅
- `api_key_status`: `✅ Configurado` ✅

### 2. Verificar Logs do Servidor

Após fazer uma pergunta na IA, verifique os logs. Você deve ver:

#### Se Tavily está configurado corretamente:
```
🔍 [IA] Análise da pergunta: { pergunta: "...", isAboutSystem: false, ... }
📋 [IA] Configuração de busca na web: { is_enabled: true, api_provider: 'tavily', ... }
🤔 [IA] Decisão de buscar na web: { shouldSearchWeb: true, motivo: 'Pergunta externa' }
🚀 [IA] INICIANDO BUSCA NA WEB COM TAVILY!
🔍 [Tavily] Buscando na web usando Tavily API: ...
🌐 [Tavily] Fazendo requisição para Tavily API...
📡 [Tavily] Resposta HTTP recebida: { status: 200, ok: true }
📦 [Tavily] Dados recebidos: { hasAnswer: true, resultsCount: 5 }
✅ [Tavily] RESULTADOS ENCONTRADOS!
✅✅✅ [IA] USANDO RESPOSTA DIRETA DO TAVILY!
```

#### Se Tavily NÃO está configurado:
```
⚠️ [IA] Configuração de busca na web NÃO encontrada!
⏭️ [IA] PULANDO busca na web: { hasConfig: false, ... }
```

OU

```
⚠️ [Tavily] NÃO VAI USAR TAVILY. Verificando configuração...
📋 [Tavily] Config recebida: { is_enabled: false, api_provider: 'scraping', ... }
```

### 3. Problemas Comuns e Soluções

#### Problema 1: "Configuração não encontrada"
**Causa:** Tabela `ia_web_search_config` não tem registro ou `is_enabled = false`

**Solução:**
1. Acesse o painel admin
2. Vá em "Busca na Web"
3. Marque "Habilitar busca na internet"
4. Selecione "Tavily API"
5. Cole sua API Key
6. Clique em "Salvar Configurações"

#### Problema 2: "Provider errado"
**Causa:** `api_provider` não é `'tavily'`

**Solução:**
1. Verifique no banco: `SELECT api_provider FROM ia_web_search_config;`
2. Se não for `'tavily'`, atualize no painel admin

#### Problema 3: "Sem API key"
**Causa:** `api_key` está NULL ou vazio

**Solução:**
1. Verifique no banco: `SELECT api_key FROM ia_web_search_config;`
2. Se estiver NULL, configure no painel admin

#### Problema 4: "Score alto, não busca"
**Causa:** IA encontrou resposta na base com score >= 60

**Solução:** 
- Para perguntas externas, a IA agora SEMPRE busca, mesmo com resposta na base
- Para perguntas sobre sistema, só busca se score < 60

#### Problema 5: "Erro 401 ou 403"
**Causa:** API Key inválida ou expirada

**Solução:**
1. Verifique se a API Key está correta
2. Teste a API Key diretamente:
```bash
curl -X POST https://api.tavily.com/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA_API_KEY_AQUI" \
  -d '{"query": "teste"}'
```

### 4. Teste Direto da API Tavily

Para verificar se sua API Key funciona:

```bash
curl -X POST https://api.tavily.com/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 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" \
  -d '{"query": "Qual é a capital do Butão?", "max_results": 3}'
```

**Resposta esperada:**
```json
{
  "answer": "...",
  "results": [...]
}
```

### 5. Verificar se está Aprendendo

Após uma busca com Tavily, verifique:

```sql
SELECT 
    id,
    title,
    source_type,
    LEFT(content, 100) as content_preview,
    created_at
FROM ia_knowledge_base
WHERE source_type IN ('tavily_learned', 'tavily_training', 'tavily_book')
ORDER BY created_at DESC
LIMIT 10;
```

Se houver registros com `source_type = 'tavily_learned'`, significa que Tavily está funcionando e aprendendo!

---

## 🎯 Teste Rápido

1. **Configure Tavily** no painel admin
2. **Faça pergunta externa:** "Qual é a temperatura em São Paulo?"
3. **Verifique logs** do servidor
4. **Verifique resposta** - deve vir do Tavily
5. **Verifique aprendizado** - deve ter adicionado à base

---

## 📊 Logs de Debug Adicionados

Agora o sistema tem logs detalhados em cada etapa:
- ✅ Análise da pergunta
- ✅ Configuração do Tavily
- ✅ Decisão de buscar
- ✅ Requisição HTTP
- ✅ Resposta recebida
- ✅ Resultados processados
- ✅ Aprendizado automático

Verifique os logs para identificar exatamente onde está o problema!

