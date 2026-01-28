# Personalização "Já no plano" – Tirar do plano

## O que foi feito

A opção **"Já no plano"** agora é **editável**. O admin pode desmarcar módulos que estão no plano base para um usuário (ex.: tirar Banner ou Carrossel de um usuário King Prime).

### Página pronta no backend (todos os checkboxes clicáveis)

Se a tela "Configurar Módulos" do seu dashboard ainda desabilita "Já no plano", use esta URL (logado como admin):

**`/api/modules/configure-modules-page/:userId`**

Exemplo: `https://seusite.com/api/modules/configure-modules-page/abc-123` (substitua `abc-123` pelo ID do usuário).

Nessa página, **todos** os módulos têm checkbox **ativo**; marcar = usuário tem o módulo, desmarcar = tirar (incluindo os que estão "Já no plano"). Ao salvar, as alterações são gravadas (exclusões e extras).

---

## Backend (API)

### GET `/api/modules/individual-plans/:userId`

**Resposta** – cada módulo inclui:

- `module_type` – código do módulo (ex.: `banner`, `carousel`, `contract`)
- `in_base_plan` – se está no plano base
- `is_individual` – se foi adicionado como extra
- `is_excluded` – se foi **tirar do plano** (estava no base e foi removido para este usuário)
- `is_active` – **efetivo**: `true` = usuário tem acesso (use para marcar o checkbox)
- `can_edit_base_modules` – `true` (indica que o front pode habilitar checkbox em "Já no plano")

### PUT `/api/modules/individual-plans/:userId`

**Body:** `{ "modules": ["banner", "carousel", "contract", ...] }`

- `modules` = **lista completa** de `module_type` que devem ficar **ativos** para o usuário.
- Inclua todos os módulos que devem permanecer ativos (tanto "Já no plano" quanto "Adicionar").
- Se um módulo do plano base **não** estiver em `modules`, ele será **removido** para esse usuário (tirar do plano).

---

## Frontend – o que ajustar

1. **Não desabilitar** os checkboxes de "Já no plano". Deixe todos os módulos com checkbox **habilitado**.
2. **Valor do checkbox:** use `is_active` da resposta do GET para marcar/desmarcar (não use só `in_base_plan`).
3. **Ao salvar:** monte o array `modules` com **todos** os `module_type` cujo checkbox está **marcado** e envie no PUT.

Exemplo (pseudo-código):

```js
// GET retorna { modules: [{ module_type: 'banner', is_active: true }, ...] }
// Checkbox marcado = is_active

// Ao salvar:
const selectedModules = modules.filter(m => checkboxChecked(m.module_type)).map(m => m.module_type);
await fetch(`/api/modules/individual-plans/${userId}`, {
  method: 'PUT',
  body: JSON.stringify({ modules: selectedModules })
});
```

---

## Migration

Executar a migration que cria a tabela de exclusões:

```bash
# Via psql ou cliente SQL
\i migrations/122_individual_user_plan_exclusions.sql
```

Ou executar o SQL em `migrations/122_individual_user_plan_exclusions.sql` no seu banco.
