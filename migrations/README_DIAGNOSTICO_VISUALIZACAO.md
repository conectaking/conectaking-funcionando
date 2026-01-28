# 📊 Scripts de Diagnóstico e Visualização de Contas com Problemas

## 🎯 Como Usar

### 1. Visualizar TODAS as contas com problemas (Detalhado)

Execute o arquivo `129_visualizar_contas_com_problemas.sql` no DBeaver.

**Este script retorna:**
- Email de cada conta com problema
- Tipo de problema específico
- Detalhes do plano (subscription_id, account_type, plan_code_resolvido)
- Total de módulos disponíveis
- Solução sugerida para cada problema

**Colunas retornadas:**
- `problema`: Tipo do problema (subscription_id INATIVO, subscription_id INEXISTENTE, SEM MÓDULOS, SEM PLANO DEFINIDO)
- `user_id`: ID do usuário
- `email`: Email do usuário
- `account_type`: Tipo de conta atual
- `subscription_id`: ID da assinatura (pode ser NULL)
- `plan_code_subscription`: Código do plano da assinatura (se houver)
- `plan_name_subscription`: Nome do plano da assinatura (se houver)
- `subscription_is_active`: Se o plano está ativo (true/false)
- `plan_code_resolvido`: Código do plano resolvido pelo sistema
- `total_modulos`: Quantidade de módulos disponíveis para o plano
- `solucao_sugerida`: Sugestão de como corrigir o problema

### 2. Ver contagem de problemas por tipo

Execute o arquivo `130_contagem_problemas.sql` no DBeaver.

**Este script retorna:**
- Tipo de problema
- Quantidade de contas afetadas por cada tipo

**Útil para:**
- Entender a escala de cada tipo de problema
- Priorizar correções

## 🔍 Tipos de Problemas Identificados

### 1. `subscription_id INATIVO`
- **O que significa:** A conta tem um `subscription_id` que aponta para um plano que existe, mas está marcado como `is_active = false`
- **Solução:** Atualizar `subscription_id` para um plano ativo OU atualizar `account_type` para um valor válido

### 2. `subscription_id INEXISTENTE`
- **O que significa:** A conta tem um `subscription_id` que não existe na tabela `subscription_plans`
- **Solução:** Limpar `subscription_id` (SET subscription_id = NULL) OU atualizar para um plano válido

### 3. `SEM MÓDULOS`
- **O que significa:** O `plan_code` resolvido não tem nenhum módulo com `is_available = true` na tabela `module_plan_availability`
- **Solução:** Verificar se o `plan_code` existe em `module_plan_availability` e se tem módulos ativos

### 4. `SEM PLANO DEFINIDO`
- **O que significa:** A conta não tem `subscription_id` E o `account_type` é NULL ou inválido
- **Solução:** Atualizar `account_type` para um valor válido (ex: basic, premium) OU associar a um `subscription_id` válido

## 📝 Exemplo de Uso no DBeaver

1. Abra o DBeaver
2. Conecte-se ao banco de dados `conecta_king_db`
3. Abra um novo script SQL (Ctrl+Alt+X)
4. Cole o conteúdo de `129_visualizar_contas_com_problemas.sql`
5. Execute o script (Ctrl+Enter)
6. Veja os resultados na aba "Resultados"

## ⚠️ Nota Importante

- O script `126_diagnosticar_contas_sem_modulos.sql` é usado pelo sistema de migrations automático
- Os scripts `129_visualizar_contas_com_problemas.sql` e `130_contagem_problemas.sql` são para uso manual no DBeaver
- Execute os scripts 129 e 130 diretamente no DBeaver para visualizar os problemas
