# Botões Gestão Financeira, Contratos e Agenda no Dashboard

## Comportamento (igual Modo Empresa)

Os botões **Gestão Financeira**, **Contratos** e **Agenda Inteligente** devem **sumir** quando o usuário **não tiver** esse módulo no plano (Separação de Pacotes + planos individuais), da mesma forma que o botão **Modo Empresa** some quando a pessoa não tem Modo Empresa.

---

## API: GET `/api/account/status`

A resposta inclui:

- `hasModoEmpresa` – já existia; usar para mostrar/ocultar o botão Modo Empresa
- `hasFinance` – **novo**; usar para mostrar/ocultar o botão **Gestão Financeira**
- `hasContract` – **novo**; usar para mostrar/ocultar o botão **Contratos**
- `hasAgenda` – **novo**; usar para mostrar/ocultar o botão **Agenda Inteligente**

Cada um é `true` quando o usuário tem o módulo (plano base + extras individuais − exclusões).

---

## O que o frontend deve fazer

1. Chamar **GET `/api/account/status`** (com token) ao carregar o dashboard.
2. No menu/sidebar:
   - Mostrar **Modo Empresa** só se `user.hasModoEmpresa === true`.
   - Mostrar **Gestão Financeira** só se `user.hasFinance === true`.
   - Mostrar **Contratos** só se `user.hasContract === true`.
   - Mostrar **Agenda Inteligente** só se `user.hasAgenda === true`.

Exemplo (pseudo-código):

```js
// Após carregar user = await fetch('/api/account/status').then(r => r.json())

if (user.hasModoEmpresa) {
  // mostrar link/botão Modo Empresa
}
if (user.hasFinance) {
  // mostrar link/botão Gestão Financeira
}
if (user.hasContract) {
  // mostrar link/botão Contratos
}
if (user.hasAgenda) {
  // mostrar link/botão Agenda Inteligente
}
```

Assim, quem não tem o módulo no plano não vê o botão (e não acessa a rota, que já retorna 403 no backend).
