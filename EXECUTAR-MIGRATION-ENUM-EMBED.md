# 🚀 Executar Migration: Adicionar Tipos de Embed ao ENUM

## ⚠️ IMPORTANTE

Este script adiciona os novos tipos de embed (`tiktok_embed`, `spotify_embed`, `linkedin_embed`, `pinterest_embed`) ao ENUM `item_type_enum` no banco de dados.

**O erro atual:** `invalid input value for enum item_type_enum: "tiktok_embed"`

## 📋 Como Executar

### Opção 1: Via npm script (Recomendado)

```bash
cd "C:\Users\playa\Desktop\CONECTA KING MVP DEZEMBRO\conecta-king-backend"
npm run migrate-enum
```

### Opção 2: Executar script diretamente

```bash
cd "C:\Users\playa\Desktop\CONECTA KING MVP DEZEMBRO\conecta-king-backend"
node scripts/add-embed-types-to-enum.js
```

## 🔧 Adicionar ao package.json

Adicione este script ao `package.json`:

```json
"scripts": {
  "migrate-enum": "node scripts/add-embed-types-to-enum.js"
}
```

## ✅ O que o script faz

1. Conecta ao banco de dados (usa variáveis de ambiente do `.env`)
2. Adiciona cada tipo ao ENUM:
   - `tiktok_embed`
   - `spotify_embed`
   - `linkedin_embed`
   - `pinterest_embed`
3. Ignora se o valor já existir
4. Mostra todos os valores atuais do ENUM

## 📝 Notas

- **Não pode ser executado em transação:** O PostgreSQL não permite `ALTER TYPE ADD VALUE` dentro de uma transação
- **Seguro para executar múltiplas vezes:** Usa `IF NOT EXISTS` para evitar erros
- **Funciona em produção:** O script detecta automaticamente se deve usar SSL baseado no host

## 🧪 Verificar se funcionou

Após executar, teste criando um item do tipo `spotify_embed` ou `tiktok_embed` no dashboard.

