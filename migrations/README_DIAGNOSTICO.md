# Scripts de Diagnóstico - Contas sem Módulos

Estes scripts SQL ajudam a identificar e corrigir contas que não estão recebendo módulos corretamente.

## Arquivos

1. **`126_diagnosticar_contas_sem_modulos.sql`** - Relatório completo de todas as contas com problemas
2. **`127_consultar_conta_especifica.sql`** - Consulta detalhada para uma conta específica (ex: playadrian@gmail.com)

---

## Como Usar

### 1. Diagnosticar TODAS as contas com problemas

Execute o script `126_diagnosticar_contas_sem_modulos.sql` no seu banco de dados PostgreSQL.

**O script retorna 6 relatórios:**

1. **Contas com subscription_id INATIVO** - Contas que têm `subscription_id` apontando para um plano com `is_active = false`
2. **Contas com subscription_id INEXISTENTE** - Contas que têm `subscription_id` apontando para um plano que não existe mais
3. **Contas SEM MÓDULOS** - Contas cujo `plan_code` resolvido não retorna nenhum módulo da tabela `module_plan_availability`
4. **Contas SEM PLANO DEFINIDO** - Contas sem `subscription_id` e sem `account_type` válido
5. **Relatório Completo** - Todos os problemas em uma única tabela com sugestões de solução
6. **Contagem por Tipo** - Quantas contas têm cada tipo de problema

**Exemplo de uso:**
```bash
psql -U seu_usuario -d seu_banco -f migrations/126_diagnosticar_contas_sem_modulos.sql
```

Ou no pgAdmin / DBeaver, abra o arquivo e execute.

---

### 2. Consultar uma conta específica (ex: playadrian@gmail.com)

Execute o script `127_consultar_conta_especifica.sql`.

**IMPORTANTE:** Antes de executar, edite a linha:
```sql
\set email 'playadrian@gmail.com'
```
E substitua `playadrian@gmail.com` pelo email da conta que você quer verificar.

**O script retorna:**

- Dados do usuário (id, email, account_type, subscription_id)
- Informações do plano da assinatura (se existir)
- Como o `plan_code` foi resolvido e de onde veio
- Lista de módulos disponíveis e indisponíveis do plano
- Módulos individuais adicionados/excluídos
- Flags finais (hasFinance, hasContract, hasAgenda, hasModoEmpresa)

**Exemplo de uso:**
```bash
psql -U seu_usuario -d seu_banco -f migrations/127_consultar_conta_especifica.sql
```

---

## Problemas Identificados e Soluções

### Problema 1: subscription_id INATIVO

**Causa:** A conta tem `subscription_id` apontando para um plano que foi desativado (`is_active = false`).

**Solução:**
```sql
-- Opção 1: Atualizar subscription_id para um plano ativo
UPDATE users 
SET subscription_id = (SELECT id FROM subscription_plans WHERE plan_code = 'basic' AND is_active = true LIMIT 1)
WHERE email = 'playadrian@gmail.com';

-- Opção 2: Limpar subscription_id e usar account_type
UPDATE users 
SET subscription_id = NULL, account_type = 'basic'
WHERE email = 'playadrian@gmail.com';
```

---

### Problema 2: subscription_id INEXISTENTE

**Causa:** A conta tem `subscription_id` apontando para um plano que não existe mais na tabela `subscription_plans`.

**Solução:**
```sql
-- Limpar subscription_id inválido
UPDATE users 
SET subscription_id = NULL
WHERE subscription_id NOT IN (SELECT id FROM subscription_plans);

-- Ou atualizar account_type para garantir que tenha módulos
UPDATE users 
SET account_type = 'basic'
WHERE subscription_id NOT IN (SELECT id FROM subscription_plans);
```

---

### Problema 3: SEM MÓDULOS

**Causa:** O `plan_code` resolvido não existe na tabela `module_plan_availability` ou não tem módulos com `is_available = true`.

**Solução:**

1. **Verificar se o plan_code existe:**
```sql
SELECT DISTINCT plan_code FROM module_plan_availability;
```

2. **Verificar se o plano tem módulos:**
```sql
SELECT plan_code, COUNT(*) 
FROM module_plan_availability 
WHERE plan_code = 'basic' AND is_available = true
GROUP BY plan_code;
```

3. **Se o plan_code não existe ou não tem módulos, criar/atualizar:**
```sql
-- Exemplo: garantir que 'basic' tenha módulos básicos
INSERT INTO module_plan_availability (module_type, plan_code, is_available)
VALUES 
    ('whatsapp', 'basic', true),
    ('email', 'basic', true),
    ('banner', 'basic', true),
    ('link', 'basic', true)
ON CONFLICT (module_type, plan_code) DO UPDATE SET is_available = true;
```

---

### Problema 4: SEM PLANO DEFINIDO

**Causa:** A conta não tem `subscription_id` e o `account_type` é NULL, vazio ou inválido.

**Solução:**
```sql
-- Definir account_type válido
UPDATE users 
SET account_type = 'basic'
WHERE subscription_id IS NULL 
  AND (account_type IS NULL OR account_type = '' OR account_type NOT IN (
      'individual', 'individual_com_logo', 'basic', 'premium',
      'king_start', 'king_prime', 'king_base', 'king_essential',
      'king_finance', 'king_finance_plus', 'king_premium_plus',
      'king_corporate', 'business_owner', 'enterprise',
      'free', 'adm_principal', 'abm'
  ));
```

---

## Exemplo: Corrigir playadrian@gmail.com

1. **Primeiro, diagnosticar:**
```sql
-- Editar 127_consultar_conta_especifica.sql e mudar o email
\set email 'playadrian@gmail.com'
-- Executar o script
```

2. **Ver o problema identificado** (ex: subscription_id inativo)

3. **Aplicar a correção:**
```sql
-- Exemplo: se subscription_id está inativo, atualizar para basic
UPDATE users 
SET subscription_id = (SELECT id FROM subscription_plans WHERE plan_code = 'basic' AND is_active = true LIMIT 1)
WHERE email = 'playadrian@gmail.com';
```

4. **Verificar novamente:**
```sql
-- Executar 127_consultar_conta_especifica.sql novamente
-- Deve mostrar módulos disponíveis agora
```

---

## Verificação Rápida via API

Após corrigir no banco, você também pode verificar via API:

```bash
# Como admin, chamar a rota de diagnóstico
curl -H "Authorization: Bearer SEU_TOKEN_ADM" \
  https://conectaking-api.onrender.com/api/account/debug-plan/playadrian@gmail.com
```

A resposta mostrará:
- Como o `plan_code` foi resolvido
- Quantos módulos foram encontrados
- Flags finais (hasFinance, hasContract, hasAgenda)

---

## Notas Importantes

- **Sempre faça backup** antes de executar UPDATEs no banco
- **Teste em ambiente de desenvolvimento** primeiro
- Os scripts são **somente leitura** (SELECT) - não modificam dados
- Para corrigir, você precisa executar os UPDATEs manualmente conforme as sugestões

---

## Suporte

Se encontrar problemas ao executar os scripts ou precisar de ajuda para interpretar os resultados, verifique:

1. Os logs do backend (console.log) quando a conta faz login
2. A resposta da API `/api/account/status` para essa conta
3. A resposta da API `/api/modules/available` para essa conta
