# Gerenciar usuário – E-mail editável

## O que foi ajustado no backend

Na modal **"Gerenciar"** do admin (ex.: *Gerenciar: usuario@email.com*):

1. **E-mail é opcional ao salvar**
   - Se o admin **não alterar** o e-mail, pode enviar o valor atual ou omitir o campo. O sistema mantém o e-mail atual.
   - Se o admin **alterar** o e-mail, o novo valor é validado e salvo (pontos preservados, ex.: `user.name@empresa.com`).

2. **Validação ao alterar e-mail**
   - Formato válido (ex.: `x@y.z`).
   - Não pode ser igual a um e-mail já usado por **outra** conta.

3. **Rota**
   - `PUT /api/admin/users/:id/manage`
   - Body (JSON): `email`, `accountType`, `isAdmin`, `subscriptionStatus`, `expiresAt`, `maxTeamInvites`.

## O que o frontend deve fazer

1. **Campo "E-mail do Usuário"**
   - Deve ser **editável** (input `type="email"` ou `type="text"`).
   - Ao abrir a modal, preencher com o e-mail atual do usuário.
   - Ao clicar em **"Salvar Alterações"**, enviar sempre o valor atual do campo (mesmo que não tenha sido alterado).

2. **Exemplo de payload**
   ```json
   {
     "email": "eliseu.marketing2019@gmail.com",
     "accountType": "king_premium_plus",
     "isAdmin": false,
     "subscriptionStatus": "active",
     "expiresAt": "2027-01-29",
     "maxTeamInvites": 3
   }
   ```

3. **Trocar o e-mail e voltar**
   - O admin pode alterar o e-mail, salvar, e depois alterar de novo (inclusive voltar ao anterior) e salvar. O backend aceita qualquer e-mail válido e não em uso por outra conta.

## Respostas da API

- **200**: `{ "message": "Usuário atualizado com sucesso!", "user": { ... } }`
- **400**: `{ "message": "E-mail inválido." }` ou `"Dados inválidos."`
- **409**: `{ "message": "O novo e-mail já está em uso por outra conta." }`

Se o painel admin estiver em outro repositório (ex.: `public_html/admin`), garanta que o formulário da modal "Gerenciar" use um input editável para o e-mail e envie esse campo no `PUT /api/admin/users/:id/manage`.
