# Ajuste de layout – "Módulos Ativos" no iPhone 16/17 e Android

A tela **Módulos Ativos** (conectaking.com.br/c) precisa destes ajustes para iPhone e Android para evitar:
- Toggle (ativar/desativar) em cima do ícone/logo do módulo (ex.: Instagram)
- Ícone do Instagram ou de outros módulos cortado ou invisível no iPhone
- Botão **apagar** (e editar/duplicar) fora do quadrado do card
- Falta de espaço em baixo para rolar até o último módulo e conseguir editar/duplicar

O código dessa tela fica no **frontend do dashboard** (onde está o HTML/CSS/JS da tela "Módulos Ativos"). Use as regras abaixo nos arquivos corretos do dashboard.

---

## 1. Viewport e safe-area no HTML da tela

No `<head>` da página do dashboard (ou do app que renderiza "Módulos Ativos"):

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

Isso ativa o uso de `env(safe-area-inset-*)` no iOS (notch e home indicator).

---

## 2. Container da lista de módulos

O container onde ficam os cards (ex.: `#items-container`, `#items-editor`, `.modules-list` ou equivalente) deve ter **espaço em baixo** para permitir scroll até o último item e evitar que o botão "Publicar alterações" ou a barra do navegador escondam o último card.

```css
/* Mobile geral */
@media (max-width: 768px) {
    #items-container,
    #items-editor,
    .items-container,
    .modules-list {
        padding-bottom: calc(120px + env(safe-area-inset-bottom, 0));
    }
}
```

Ajuste o seletor para o ID/classe real do container da lista no seu código.

---

## 3. Card de cada módulo (evitar toggle em cima do ícone e botões fora)

Cada card de módulo deve:
- Ter **gap** entre ícone e a área do nome + toggle + ações, para o toggle não ficar em cima do ícone.
- Manter ícone com tamanho fixo e **flex-shrink: 0**.
- Manter as ações (editar, duplicar, apagar) e o toggle **dentro** do card, com `overflow: visible` e `box-sizing: border-box`.

Exemplo de estrutura sugerida:

```html
<!-- Estrutura de um card de módulo -->
<div class="module-item">
  <div class="module-drag-controls">...</div>
  <div class="module-content-wrapper">
    <div class="module-icon">...</div>
    <div class="module-info-section">
      <span class="module-name">Instagram</span>
      <div class="module-actions-inline">
        <label class="toggle">...</label>
        <button class="btn-edit">...</button>
        <button class="btn-duplicate">...</button>
        <button class="btn-delete">...</button>
      </div>
    </div>
  </div>
</div>
```

CSS sugerido para o card e conteúdo:

```css
@media (max-width: 768px) {
    .module-item {
        display: flex;
        align-items: stretch;
        padding: 12px;
        gap: 10px;
        overflow: visible;
        box-sizing: border-box;
    }

    .module-content-wrapper {
        display: flex;
        align-items: center;
        gap: 14px;  /* evita toggle em cima do ícone */
        flex: 1;
        min-width: 0;
    }

    .module-icon {
        width: 44px;
        height: 44px;
        flex-shrink: 0;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .module-icon img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .module-info-section {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
        justify-content: center;
    }

    .module-actions-inline {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: nowrap;
    }

    .module-actions-inline button,
    .module-actions-inline .btn-edit,
    .module-actions-inline .btn-duplicate,
    .module-actions-inline .btn-delete {
        width: 30px;
        height: 30px;
        flex-shrink: 0;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    /* Toggle não deve sobrepor o ícone */
    .module-actions-inline .toggle {
        flex-shrink: 0;
        margin: 0;
    }
}
```

Ajuste os nomes das classes (`.module-item`, `.module-icon`, etc.) para os que você usa no dashboard.

---

## 4. iPhone 16 / 17 (393px–430px)

Se ainda ficar apertado em 393–430px, use media queries específicas:

```css
/* iPhone 16 / 17 e telas estreitas */
@media (max-width: 430px) {
    #items-container,
    #items-editor {
        padding-bottom: calc(140px + env(safe-area-inset-bottom, 0));
        padding-left: 12px;
        padding-right: 12px;
    }

    .module-item {
        padding: 10px;
        gap: 12px;
    }

    .module-content-wrapper {
        gap: 12px;
    }

    .module-icon {
        width: 40px;
        height: 40px;
    }

    .module-actions-inline button {
        width: 28px;
        height: 28px;
    }
}
```

---

## 5. Resumo do que corrigir

| Problema | O que fazer |
|----------|--------------|
| Toggle em cima do ícone/logo (ex.: Instagram) | Aumentar `gap` entre `.module-icon` e `.module-info-section` (ex.: 14px). Garantir `flex-shrink: 0` no ícone. |
| Ícone do Instagram não aparece / cortado no iPhone | `.module-icon` com tamanho fixo (ex.: 44×44px), `overflow: hidden` e `object-fit: cover` na imagem. |
| Botão apagar (ou editar/duplicar) fora do quadrado | Card com `overflow: visible`, `box-sizing: border-box`, padding suficiente e ações com `flex-shrink: 0` e tamanho fixo. |
| Não dá para descer até o último módulo | `padding-bottom` no container da lista: `calc(120px + env(safe-area-inset-bottom, 0))` (ou maior, ex.: 140px em telas muito estreitas). |
| Área “alterar foto” ou outros blocos cortados | Usar os mesmos cuidados: safe-area no container, padding-bottom e evitar `overflow: hidden` em containers que precisam mostrar tudo. |

---

## 6. Onde fica o código da tela "Módulos Ativos"

A tela **Módulos Ativos** é a interface do **dashboard** em **conectaking.com.br/c**.  
Ela não está neste repositório (aqui estão o backend e a view pública do cartão).

Para aplicar estes ajustes:
1. Abra o projeto/frontend que serve conectaking.com.br/c (ex.: frontend React/Vue ou pasta `public_html`/`dashboard` em outro repositório).
2. Localize o componente/página “Módulos” ou “Módulos Ativos” e o CSS que estiliza os cards de módulos e o container da lista.
3. Use os seletores e valores deste guia adaptando aos nomes de classes/IDs que você realmente usa.

Se você colocar esse projeto do dashboard no Cursor (ou indicar o caminho dos arquivos), dá para aplicar essas regras diretamente nos arquivos certos.
