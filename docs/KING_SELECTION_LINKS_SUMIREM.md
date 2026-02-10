# KingSelection – Por que os links (galerias) podem sumir

## O que aconteceu

Você enviou o link do KingSelection para o cliente (ex.: Ricardo). Depois de alguns dias, quando o cliente foi acessar, **as fotos não estavam mais lá** e **sumiram os links** (galerias como “Ricardo” e outras). O sistema **não exclui automaticamente** por tempo: não existe cron nem expiração que apague galerias ou links sozinhos.

O que **pode** ter acontecido é o seguinte.

---

## Causa: exclusão do “módulo” KingSelection

Todas as galerias (e os links que você manda para o cliente) estão ligadas a **um único item do painel**: o card **“KingSelection”** na lista de módulos do dashboard.

- No banco, isso é um registro em **`profile_items`** com `item_type = 'king_selection'`.
- Cada galeria (Ricardo, etc.) é um registro em **`king_galleries`** com `profile_item_id` apontando para esse `profile_items`.

Na migration do KingSelection está definido:

```sql
profile_item_id INTEGER NOT NULL REFERENCES profile_items(id) ON DELETE CASCADE
```

Ou seja: **quando o `profile_item` do KingSelection é apagado, o banco apaga em cascata todas as `king_galleries`** (e fotos, seleções, etc.). Por isso “sumiram” os links e as galerias de uma vez.

---

## Como o módulo KingSelection pode ser apagado

Há **duas formas** de esse `profile_item` ser removido:

### 1) Exclusão manual

- Alguém clicou em **“Excluir este módulo”** no card do KingSelection no dashboard.
- Isso chama a API `DELETE /api/profile/items/:id` e remove o `profile_item`.
- O CASCADE remove todas as galerias (Ricardo e as outras).

### 2) “Publicar alterações” (save-all) sem o KingSelection no payload

- O botão **“Publicar alterações”** envia ao servidor a lista de módulos que **estão na tela** naquele momento.
- O backend **apaga qualquer `profile_item` que exista no banco mas não tenha vindo nessa lista**.
- Se o card do KingSelection **não estiver no DOM** quando o usuário clicar em “Publicar alterações”, ele **não entra na lista** e o servidor interpreta como “deletar esse item” → CASCADE → sumiço das galerias.

Isso pode ocorrer, por exemplo, quando:

- O módulo está **oculto por plano** (dashboard não mostra módulos que o plano não tem).
- **Erro ou timeout** ao carregar o perfil: a lista veio sem o KingSelection.
- Uso em **outro dispositivo ou aba** com lista desatualizada e depois “Publicar alterações”.

---

## O que foi feito no código (proteção – não excluir sozinho)

Foi configurado em `routes/profile.js` para **nunca excluir sozinho** o KingSelection (nem a Página de Vendas). Constante `PROTECTED_ITEM_TYPES_SAVE_ALL` e comentário "PROTEÇÃO CRÍTICA: NÃO REMOVER" no código. Detalhes:

- Antes de deletar itens que “não vieram no save-all”, o backend **não permite mais** apagar `profile_items` do tipo **`king_selection`** nem **`sales_page`**.
- Assim, mesmo que o front envie a lista sem o KingSelection (por plano, erro ou qualquer motivo), **o módulo KingSelection e todas as galerias (links) deixam de ser apagados** por causa do save-all.

A exclusão do KingSelection só acontece se alguém **explicitamente** clicar em “Excluir este módulo” no card do KingSelection.

---

## O que fazer daqui pra frente

1. **Evitar excluir o módulo KingSelection** no dashboard, a menos que seja realmente o que você quer (e aí todas as galerias daquele perfil serão apagadas).
2. **Se ainda tiver backup do banco** (por exemplo no Render ou no provedor), pode ser possível recuperar a tabela `profile_items` e `king_galleries` de um ponto anterior; isso depende do seu plano e do suporte.
3. **Novas galerias** que você criar a partir de agora já ficam protegidas contra o save-all; o que foi perdido antes não volta sozinho, só por restauração de backup.

---

## Resumo

| Pergunta | Resposta |
|----------|----------|
| O sistema exclui links/galerias automaticamente depois de X dias? | **Não.** Não há cron nem expiração que apague galerias. |
| O que faz os links “sumirem”? | A exclusão do **módulo** KingSelection (o card no painel), seja por “Excluir este módulo” ou (antes do fix) por “Publicar alterações” sem o KingSelection na lista. |
| Por que sumiu tudo de uma vez (Ricardo e outros)? | Porque todas as galerias dependem do mesmo `profile_item`; ao apagar esse item, o banco apaga todas as galerias em cascata. |
| Está corrigido? | Sim. O save-all **não pode mais** apagar o módulo KingSelection (nem sales_page); só a exclusão manual no card pode remover o módulo e as galerias. |
