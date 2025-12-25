# 🔧 Solução para Erro "Invalid table reference" no DBeaver

## ⚠️ Este é apenas um aviso do editor, não um erro real!

O DBeaver está tentando validar o SQL antes de executar e não reconhece a sintaxe `ALTER TYPE` como válida no contexto de validação. **Isso não significa que o comando não vai funcionar!**

## ✅ Soluções

### **Opção 1: Executar mesmo assim (RECOMENDADO)**

1. **Ignore o sublinhado vermelho** - é só um aviso do editor
2. **Selecione o comando SQL**
3. **Execute de uma das formas:**
   - Pressione `Ctrl+Enter` (Windows/Linux) ou `Cmd+Enter` (Mac)
   - Ou clique no botão "Execute SQL Script" (ícone de play ▶️)
   - Ou clique com botão direito → `Execute` → `Execute SQL Statement`

4. O comando **deve executar com sucesso** mesmo com o aviso vermelho!

---

### **Opção 2: Executar sem validação**

Se a Opção 1 não funcionar:

1. **Desative a validação temporariamente:**
   - Vá em: `Window` → `Preferences` → `SQL Editor` → `Validation`
   - Desmarque "Validate SQL queries before execution"
   - Clique OK

2. Execute o comando novamente

3. **Reative a validação depois** (é útil para outros comandos)

---

### **Opção 3: Executar via Console SQL**

1. Clique com botão direito no banco `conecta_king_db`
2. Selecione `SQL Editor` → `Open SQL Console`
3. Cole o comando:
   ```sql
   ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'tiktok_embed';
   ```
4. Execute com `Ctrl+Enter`

---

### **Opção 4: Executar um por vez no Console**

Se ainda der problema, execute cada comando separadamente:

```sql
-- Comando 1
ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'tiktok_embed';
```

Execute, depois execute o próximo:

```sql
-- Comando 2
ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'spotify_embed';
```

E assim por diante...

---

## 🧪 Como saber se funcionou?

Após executar, rode esta query para verificar:

```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'item_type_enum'
)
ORDER BY enumsortorder;
```

Você deve ver os novos valores na lista!

---

## 💡 Dica

O DBeaver tem validação SQL que às vezes não reconhece comandos específicos do PostgreSQL como `ALTER TYPE`. Isso é normal e não impede a execução do comando!

