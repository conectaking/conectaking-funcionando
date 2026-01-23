# ✅ Verificação Completa Antes da Remoção

## 🔍 Resultados da Verificação

### ❌ NÃO PODE REMOVER (Estão em uso):

1. **`routes/embeddings.js`** - ✅ **MANTER**
   - Usado em: `routes/iaKing.js` (linha 7)
   - Usado em: `routes/iaKingAdvancedUnderstanding.js` (linha 7)
   - **Motivo:** Sistema de embeddings vetoriais (RAG) usado pela IA

2. **`routes/iaKingAdvancedUnderstanding.js`** - ✅ **MANTER**
   - Usado em: `routes/iaKing.js` (linha 14)
   - **Motivo:** Sistema avançado de entendimento da IA

3. **`logo.png`** - ✅ **MANTER**
   - Usado em: `routes/ogImage.js` (linha 35) - `public_html/logo.png`
   - Usado em: `utils/pushNotificationService.js` (linhas 61-62) - `/logo.png`
   - **Motivo:** Logo usado para OG images e notificações push

4. **`routes/cloudinary.js`** - ⚠️ **VERIFICAR**
   - Não encontrado uso direto, mas exporta módulo cloudinary configurado
   - Pode ser usado indiretamente
   - **Ação:** Verificar se cloudinary é usado em uploads

5. **`routes/products.js`** - ⚠️ **VERIFICAR**
   - Não está no server.js
   - Mas pode ser usado para catálogos antigos
   - **Ação:** Verificar se há catálogos de produtos usando esta rota

6. **`routes/contracts.routes.js`** - ⚠️ **VERIFICAR**
   - Parece ser diferente de `modules/contracts/contract.routes.js`
   - Pode ser rota antiga
   - **Ação:** Verificar se é usado

---

### ✅ PODE REMOVER COM SEGURANÇA:

#### 1. Documentação de Correções Antigas (40 arquivos .md):
- Todas as correções já foram implementadas
- São apenas histórico

#### 2. Arquivos .txt de Instruções (9 arquivos):
- Instruções antigas não mais necessárias
- **EXCEÇÃO:** `SUAS_CREDENCIAIS_GOOGLE.txt` - ⚠️ Contém credenciais reais!

#### 3. Arquivos de Backup (1 arquivo):
- `routes/password.js.backup` - Não é usado

#### 4. Scripts de Teste (3 arquivos):
- `scripts/testar-api-analytics.js`
- `scripts/testar-registro-cliques.js`
- `scripts/verificar-analytics.js`

#### 5. Scripts de Migrations Antigas (8 arquivos):
- As migrations correspondentes existem em `migrations/`
- Scripts podem ser removidos se migrations já foram executadas

#### 6. Arquivos SQL de Verificação (2 arquivos):
- `verificar_account_types.sql` - Script de verificação
- `QUERY_VERIFICACAO_RAPIDA.sql` - Script de verificação

#### 7. Template de Exemplo (1 arquivo):
- `CODIGO-TEMPLATE-EJS-SEGURO.ejs` - Template de exemplo, não usado

---

### ⚠️ VERIFICAR ANTES DE REMOVER:

1. **`routes/cloudinary.js`** - Verificar se cloudinary é usado
2. **`routes/products.js`** - Verificar se há catálogos antigos
3. **`routes/contracts.routes.js`** - Verificar se é usado
4. **`SUAS_CREDENCIAIS_GOOGLE.txt`** - ⚠️ Contém credenciais! Remover por segurança
5. **Arquivos SQL soltos** - Verificar se já foram executados:
   - `adicionar_categoria_trabalho.sql`
   - `atualizar_planos_usuarios.sql`
   - `configurar_planos.sql`

---

## 📋 Plano de Remoção Segura

### Fase 1: Remover com Segurança (53 arquivos)
1. ~40 arquivos .md de correções antigas
2. 8 arquivos .txt (exceto SUAS_CREDENCIAIS_GOOGLE.txt)
3. 1 arquivo .backup
4. 3 scripts de teste
5. 2 arquivos SQL de verificação
6. 1 template de exemplo

### Fase 2: Verificar e Remover (após verificação)
1. `routes/cloudinary.js` - Verificar uso
2. `routes/products.js` - Verificar uso
3. `routes/contracts.routes.js` - Verificar uso
4. `SUAS_CREDENCIAIS_GOOGLE.txt` - Remover por segurança (contém credenciais)
5. Scripts de migrations antigas (8 arquivos)
6. Arquivos SQL soltos (3 arquivos)

### Fase 3: Manter
1. `routes/embeddings.js` - ✅ EM USO
2. `routes/iaKingAdvancedUnderstanding.js` - ✅ EM USO
3. `logo.png` - ✅ EM USO
4. Todas as migrations em `migrations/` - ✅ NECESSÁRIAS

---

**Próximo passo:** Executar Fase 1 (remoção segura) e depois verificar Fase 2.
