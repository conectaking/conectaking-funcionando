# Como colocar a logo do Conecta King no Painel e na Landing

A logo já aparece **no cartão** (perfil público). Para aparecer também na **aba do navegador** em:

- **Meu Painel** (dashboard)
- **ConectaKing - Sua Pr...** (página inicial / landing)

é preciso adicionar o favicon nos arquivos HTML do **frontend** (pasta `public_html/`).

---

## O que colocar no `<head>` de cada página

Em **cada** arquivo HTML do painel e da landing (por exemplo `dashboard.html`, `index.html`, etc.), dentro da tag **`<head>`**, cole **logo após** a tag `<title>` estas duas linhas:

```html
<link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
<link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
```

### Exemplo

**Antes:**
```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meu Painel - Conecta King</title>
    <link rel="stylesheet" href="...">
```

**Depois:**
```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meu Painel - Conecta King</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="stylesheet" href="...">
```

---

## Arquivos que costumam precisar

Na pasta **`public_html/`** (no seu projeto de frontend, fora deste repositório), abra e edite:

1. **`index.html`** – página inicial (“ConectaKing - Sua Pr...”)
2. **`dashboard.html`** – Meu Painel
3. Qualquer outro **`.html`** que seja uma página principal (ex.: login, criar acesso, etc.).

Em todos, adicione as duas linhas do `<link>` dentro do `<head>`, como no exemplo acima.

---

## Usar a logo da API em vez do link externo

Se preferir usar a logo servida pela sua API (por exemplo em `https://sua-api.onrender.com/logo.png`), use:

```html
<link rel="icon" type="image/png" href="https://SUA-API-ONRENDER.com/logo.png">
<link rel="apple-touch-icon" href="https://SUA-API-ONRENDER.com/logo.png">
```

Substitua `SUA-API-ONRENDER.com` pela URL real da sua API. A rota `/logo.png` já está configurada neste backend.

---

## Resumo

| Onde                          | Status da logo na aba      |
|------------------------------|----------------------------|
| Cartão (ex.: ADRIANO KING FOTO) | Já aparece                 |
| Meu Painel / Landing         | Só aparece após colar as 2 linhas no `<head>` de cada HTML |

Depois de salvar e publicar de novo o `public_html/`, a mesma logo deve aparecer em todas as abas do sistema.
