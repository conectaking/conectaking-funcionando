# Auditoria: rotas que não seguem a lógica (rota → controller → service → repository)

Arquivos onde a **lógica está na rota** (acesso a banco, regras de negócio direto no handler). A correção será feita ao separar cada bloco em módulos (passos 3–10 do plano).

| Arquivo | Situação | Correção (no passo) |
|---------|----------|----------------------|
| `routes/admin.js` | 26 rotas com `db.pool.connect()`, `client.query()`, `res.json()` inline. Sem controller/service/repository. | Passo 3: `modules/admin/` (overview, users, codes, branding) |
| `routes/profile.js` | Muitas rotas com lógica e SQL direto no handler (CRUD de profile_items, save-all, itens por tipo). | Passos 5 e 8 feitos. Passo 9: partials em `views/profile/items/types/` iniciados (link, banner, whatsapp); backend dos 26 itens pode ser migrado para `modules/cartaoItens/` ou módulos por tipo depois. |
| `routes/subscription.js` | Lógica e queries inline. | Passo 6: `modules/assinatura/` |
| `routes/vcard.js` | Lógica de geração do vCard e queries na rota. | Passo 6: `modules/compartilhar/` |
| `routes/analytics.js` | Queries e formatação na rota. | Passo 7: `modules/relatorios/` |
| `routes/ogImage.js` | Lógica de imagem e banco na rota. | Passo 7: `modules/personalizarLink/` ou branding |
| `routes/moduleAvailability.js` | Queries e regras inline. | Pode virar `modules/moduleAvailability/` quando for tocado |

**Referência de módulo que já segue a lógica:** `modules/agenda/agenda.routes.js` — só chama `controller.getSettings`, `controller.updateSettings`, etc. Controller chama service, service chama repository.

**Padrão a aplicar:** rota → `controller.metodo` → service → repository; resposta via `responseFormatter` ou equivalente.
