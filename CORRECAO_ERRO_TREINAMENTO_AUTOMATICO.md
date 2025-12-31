# ✅ Correção: Erro no Treinamento Automático

## 🐛 Erro Identificado

```
error: column "provider" does not exist
```

**Localização:**** `routes/iaKing.js:4940`

**Causa:** A query estava usando `WHERE provider = 'tavily'`, mas a tabela `ia_web_search_config` usa a coluna `api_provider`, não `provider`.

## ✅ Correção Aplicada

**Antes:**
```sql
SELECT api_key, is_enabled 
FROM ia_web_search_config 
WHERE provider = 'tavily'  -- ❌ COLUNA ERRADA
LIMIT 1
```

**Depois:**
```sql
SELECT api_key, is_enabled 
FROM ia_web_search_config 
WHERE api_provider = 'tavily'  -- ✅ COLUNA CORRETA
LIMIT 1
```

## 📋 Estrutura da Tabela

A tabela `ia_web_search_config` tem as seguintes colunas:
- `id` (SERIAL PRIMARY KEY)
- `is_enabled` (BOOLEAN)
- `api_provider` (VARCHAR(50)) ← **Esta é a coluna correta**
- `api_key` (TEXT)
- `max_results` (INTEGER)
- `search_domains` (TEXT[])
- `blocked_domains` (TEXT[])
- `use_cache` (BOOLEAN)
- `cache_duration_hours` (INTEGER)
- `updated_by` (VARCHAR(255))
- `updated_at` (TIMESTAMP)

## 🧪 Como Testar

1. **Acesse o painel IA KING**
2. **Vá na aba "Inteligência da IA"**
3. **Clique no botão "Treinar Mentalidade na Internet"**
4. **O erro não deve mais aparecer**

## ⚠️ Observação sobre Upload de PDF

O erro "Formato não suportado" no upload de PDF é um problema separado no frontend. O formulário diz que aceita PDF, mas o código JavaScript está bloqueando. Isso precisa ser corrigido no arquivo `ia-king-admin.js` na função `bookContent`.

## 📝 Status

✅ **Erro corrigido** - O treinamento automático deve funcionar agora, desde que:
- A API key do Tavily esteja configurada em "Busca na Web"
- A configuração esteja habilitada (`is_enabled = true`)

