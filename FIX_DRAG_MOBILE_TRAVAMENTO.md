# Correção: Arraste de Módulos Travando no Mobile

Quando o arraste (drag) dos módulos ativos **trava** no meio do gesto no celular (Android, Xiaomi, iPhone), use os ajustes abaixo no **projeto do dashboard** (onde está o `dashboard.js` e o Sortable).

---

## 1. CSS já incluído em `dashboard-modulos-mobile-fix.css`

O arquivo `dashboard-modulos-mobile-fix.css` foi atualizado com:

- **Handle de arraste** (`.module-drag-handle`): `touch-action: none`, área de toque ≥ 44px
- **Containers da lista** (`#items-container`, `.modules-list`, etc.): `overflow-y: auto`, `-webkit-overflow-scrolling: touch`, `touch-action: pan-y`
- **Item em drag** (`.sortable-dragging`): `touch-action: none` apenas no item arrastado

Garanta que esse CSS esteja carregado na página "Módulos Ativos".

---

## 2. Ajustes no Sortable (dashboard.js – função `initSortable`)

No arquivo onde o Sortable é criado (ex.: `initSortable()`), use **no mobile** as opções abaixo. O objetivo é evitar conflito com scroll e deixar o arraste contínuo.

### 2.1 Detectar mobile

```javascript
var isMobile = window.innerWidth <= 768
    || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent)
    || ('ontouchstart' in window)
    || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
```

### 2.2 Opções recomendadas para mobile (reduzir travamento)

Inclua estas opções ao criar o Sortable **quando `isMobile` for true**:

```javascript
var sortableOpts = {
    handle: '.module-drag-handle',
    draggable: '.module-item',
    direction: 'vertical',
    animation: isMobile ? 0 : 150,           // no mobile: sem animação = menos travamento
    forceFallback: isMobile,
    fallbackOnBody: false,
    swapThreshold: 1,
    invertSwap: false,
    delay: isMobile ? 80 : 0,               // 80ms no mobile evita confusão com scroll
    delayOnTouchStart: true,
    touchStartThreshold: isMobile ? 8 : 0,   // 8px no mobile: distingue arraste de toque
    scroll: true,
    scrollSensitivity: 30,
    scrollSpeed: 12,
    bubbleScroll: true,
    onStart: function(evt) {
        if (isMobile) {
            document.body.classList.add('sortable-dragging-active');
            evt.item.style.touchAction = 'none';
        }
        // … resto do onStart (ex.: estilo “levantar”)
    },
    onEnd: function(evt) {
        if (isMobile) {
            document.body.classList.remove('sortable-dragging-active');
            evt.item.style.touchAction = '';
        }
        // … salvar ordem, etc.
    }
};
```

### 2.3 Se ainda travar: testar `fallbackOnBody: true`

Em alguns aparelhos, o Sortable se comporta melhor com o clone no `body`:

```javascript
fallbackOnBody: isMobile ? true : false,
```

Quando `fallbackOnBody: true`, **não** use `overflow: hidden` nem `touch-action: none` no `body` durante o drag. O CSS em `dashboard-modulos-mobile-fix.css` já deixa o body sem travar; mantenha só a classe `sortable-dragging-active` para estilizar se precisar.

### 2.4 Se ainda travar: desligar o scroll do Sortable no mobile

Para testar se o travamento vem do auto-scroll do Sortable:

```javascript
scroll: !isMobile,
scrollSensitivity: isMobile ? 0 : 30,
scrollSpeed: isMobile ? 0 : 12,
```

Se o arraste melhorar, o problema era o scroll. Aí dá para subir de novo `scrollSensitivity`/`scrollSpeed` aos poucos (ex.: 15 e 8).

---

## 3. Resumo do que evita travamento

| Onde | O que fazer |
|------|--------------|
| **CSS** | Handle e item em drag com `touch-action: none`; containers com `overflow-y: auto` e `touch-action: pan-y` |
| **Sortable** | No mobile: `animation: 0`, `delay: 80`, `touchStartThreshold: 8` |
| **Sortable** | Manter `fallbackOnBody: false`; se precisar, testar `true` sem bloquear touch no body |
| **Sortable** | Se travar perto das bordas, testar `scroll: false` (ou valores menores de scrollSensitivity/scrollSpeed) no mobile |

---

## 4. Onde aplicar

- **CSS:** Cole o bloco “DRAG NO MOBILE – REDUZIR TRAVAMENTO” no final do seu `dashboard-modulos-mobile-fix.css` (ou no CSS principal do dashboard) se ainda não estiver lá.
- **JS:** Ajustes na função que cria o Sortable (ex.: `initSortable()` em `dashboard.js`), usando as opções acima quando `isMobile` for true.

Depois de aplicar, testar em dispositivo real (Xiaomi/Android e iPhone) arrastando do primeiro ao último módulo em um único gesto.
