# 🧪 Como Testar se Tavily está Sendo Usado

## ✅ Verificação Rápida

### 1. Verificar Configuração no Banco de Dados

Execute esta query no dBeaver:

```sql
SELECT 
    id,
    is_enabled,
    api_provider,
    CASE 
        WHEN api_key IS NULL THEN '❌ Não configurado'
        WHEN LENGTH(api_key) > 0 THEN '✅ Configurado (' || LEFT(api_key, 15) || '...)'
        ELSE '❌ Vazio'
    END as api_key_status,
    max_results
FROM ia_web_search_config
ORDER BY id DESC
LIMIT 1;
```

**Resultado esperado:**
- `is_enabled`: `true` ✅
- `api_provider`: `tavily` ✅
- `api_key_status`: `✅ Configurado` ✅

---

## 🔍 Teste Prático

### Teste 1: Fazer uma pergunta que NÃO está na base de conhecimento

1. Acesse a IA King no dashboard
2. Faça uma pergunta sobre algo que **não está** na base de conhecimento, por exemplo:
   - "Qual é a capital do Butão?"
   - "Quem ganhou o Oscar de melhor filme em 2024?"
   - "Qual é a temperatura atual em São Paulo?"

3. **Verifique os logs do servidor** (no Render ou localmente):
   - Você deve ver: `🔍 [Tavily] Buscando na web usando Tavily API:`
   - Você deve ver: `🌐 [Tavily] Fazendo requisição para Tavily API...`
   - Você deve ver: `📥 [Tavily] Resposta recebida:`
   - Você deve ver: `✅ [Tavily] Resultados encontrados: X resultados`

### Teste 2: Verificar resposta da IA

Se Tavily estiver funcionando, a resposta deve:
- Incluir informações atualizadas da internet
- Ter a fonte indicada como `*Fonte: tavily*`
- Ser mais completa e precisa

---

## 🐛 Se NÃO estiver usando Tavily

### Verifique:

1. **Configuração está salva?**
   ```sql
   SELECT * FROM ia_web_search_config;
   ```

2. **A busca na web está habilitada?**
   - `is_enabled` deve ser `true`

3. **O provider está correto?**
   - `api_provider` deve ser `tavily` (não `scraping` ou `duckduckgo`)

4. **A API Key está configurada?**
   - `api_key` não deve ser NULL ou vazio

5. **A IA encontrou resposta na base de conhecimento?**
   - Tavily só é usado se `bestScore < 30`
   - Se a IA encontrar resposta na base, não busca na web

---

## 📊 Logs Esperados

Quando Tavily é usado, você verá nos logs:

```
🔍 [IA] Buscando na web porque: { hasAnswer: false, score: 15, webSearchEnabled: true, provider: 'tavily' }
🔍 [Tavily] Buscando na web usando Tavily API: Qual é a capital do Butão?
🌐 [Tavily] Fazendo requisição para Tavily API...
📥 [Tavily] Resposta recebida: { hasAnswer: true, resultsCount: 5 }
✅ [Tavily] Resultados encontrados: 5 resultados
```

---

## ⚠️ Problemas Comuns

### Problema 1: "Não está usando Tavily"
**Solução:** Verifique se:
- A configuração está salva no banco
- `is_enabled = true`
- `api_provider = 'tavily'`
- A API Key está correta

### Problema 2: "Erro 401 ou 403"
**Solução:** 
- Verifique se a API Key está correta
- Teste a API Key diretamente no Tavily

### Problema 3: "Não busca na web mesmo com configuração"
**Solução:**
- A IA só busca na web se não encontrar resposta na base (score < 30)
- Faça uma pergunta que **definitivamente** não está na base de conhecimento

---

## 🎯 Teste Direto da API Tavily

Para testar se sua API Key funciona, execute no terminal:

```bash
curl -X POST https://api.tavily.com/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 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" \
  -d '{"query": "Qual é a capital do Butão?", "max_results": 3}'
```

Se funcionar, você verá uma resposta JSON com resultados.

