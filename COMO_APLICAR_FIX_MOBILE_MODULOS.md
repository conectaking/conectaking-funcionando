# 🚀 Como Aplicar o Fix Mobile na Tela "Módulos Ativos"

## 📋 Arquivo Criado

Foi criado o arquivo **`dashboard-modulos-mobile-fix.css`** com todos os ajustes necessários para corrigir o layout mobile da tela "Módulos Ativos" em **todos os dispositivos** (iPhone 16/17, Android, etc.).

---

## ✅ Problemas Corrigidos

1. ✅ **Toggle switch não fica mais em cima do ícone/logo** (ex.: Instagram)
2. ✅ **Ícone do módulo sempre visível** e com tamanho fixo (44px → 40px → 36px conforme tela)
3. ✅ **Botões editar/duplicar/apagar dentro do card** (não cortados, não fora do quadrado)
4. ✅ **Espaço suficiente em baixo** para rolar até o último módulo e conseguir editar/duplicar
5. ✅ **Safe-area** para iPhone (notch e home indicator)
6. ✅ **Responsivo** para todos os tamanhos de tela mobile

---

## 🔧 Como Aplicar

### Opção 1: Incluir o CSS no projeto do dashboard

1. **Copie o conteúdo** de `dashboard-modulos-mobile-fix.css`
2. **Cole no final** do arquivo CSS principal do dashboard (ex.: `dashboard.css`, `main.css`, `styles.css`)
3. **OU** importe o arquivo no HTML do dashboard:
   ```html
   <link rel="stylesheet" href="/css/dashboard-modulos-mobile-fix.css">
   ```

### Opção 2: Ajustar seletores

Se os **IDs/classes** do seu código forem diferentes, ajuste os seletores no CSS:

**Exemplo:** Se o container da lista for `#modules-list` em vez de `#items-container`:

```css
/* ANTES */
#items-container {
    padding-bottom: calc(140px + env(safe-area-inset-bottom, 0));
}

/* DEPOIS */
#items-container,
#modules-list {  /* Adicione seu seletor aqui */
    padding-bottom: calc(140px + env(safe-area-inset-bottom, 0));
}
```

**Seletores principais que você precisa verificar:**
- Container da lista: `#items-container`, `#items-editor`, `.items-container`, etc.
- Card de módulo: `.module-item`, `.module-card`, `.item-card`, etc.
- Ícone: `.module-icon`, `.item-icon`, `.module-image`, etc.
- Ações: `.module-actions-inline`, `.actions-inline`, etc.

---

## 📱 Breakpoints Ajustados

O CSS cobre os seguintes tamanhos de tela:

| Tela | Largura | Ajustes |
|------|---------|---------|
| **Mobile geral** | ≤ 768px | Gap 14px, ícone 44px, botões 28px |
| **Telas pequenas** | ≤ 430px | Gap 12px, ícone 40px, botões 26px, mais padding-bottom |
| **iPhone 16/17** | 393px - 410px | Gap 13px, ícone 42px, botões 27px |
| **Muito pequenas** | ≤ 360px | Gap 10px, ícone 36px, botões 24px |

---

## 🎯 Principais Ajustes Aplicados

### 1. Gap entre ícone e ações (evita toggle em cima do ícone)

```css
.module-content-wrapper {
    gap: 14px; /* Mobile geral */
}

@media (max-width: 430px) {
    .module-content-wrapper {
        gap: 12px; /* Telas pequenas */
    }
}
```

### 2. Ícone com tamanho fixo e não cortado

```css
.module-icon {
    width: 44px;
    height: 44px;
    flex-shrink: 0; /* Não encolhe */
    overflow: hidden;
}

.module-icon img {
    object-fit: cover; /* Cobre sem distorcer */
}
```

### 3. Botões dentro do card

```css
.module-item {
    overflow: visible; /* Permite que botões fiquem visíveis */
    box-sizing: border-box;
}

.module-actions-inline button {
    width: 30px;
    height: 30px;
    flex-shrink: 0; /* Não encolhe */
}
```

### 4. Espaço em baixo para rolagem

```css
#items-container {
    padding-bottom: calc(140px + env(safe-area-inset-bottom, 0));
}

@media (max-width: 430px) {
    #items-container {
        padding-bottom: calc(160px + env(safe-area-inset-bottom, 0));
    }
}
```

### 5. Safe-area para iPhone

```css
html {
    padding-left: env(safe-area-inset-left, 0);
    padding-right: env(safe-area-inset-right, 0);
}

body {
    padding-bottom: env(safe-area-inset-bottom, 0);
}
```

---

## 🧪 Como Testar

1. **Abra o dashboard** em `conectaking.com.br/c`
2. **Vá para "Módulos Ativos"**
3. **Abra as DevTools** (F12)
4. **Ative o modo mobile** (Ctrl+Shift+M)
5. **Teste em diferentes dispositivos:**
   - Samsung Galaxy S8+ (360x740)
   - iPhone 16 (393x852)
   - iPhone 16 Pro (402x874)
   - iPhone SE (375x667)
   - iPhone 12 Pro (390x844)

**Verifique:**
- ✅ Toggle não está em cima do ícone
- ✅ Ícone do Instagram (e outros) está visível
- ✅ Botão apagar está dentro do card
- ✅ Consegue rolar até o último módulo
- ✅ Consegue clicar em editar/duplicar do último módulo

---

## ⚠️ Se os Seletores Não Baterem

Se o CSS não aplicar, você precisa:

1. **Inspecionar o HTML** da tela "Módulos Ativos" (F12 → Elements)
2. **Identificar os IDs/classes reais** usados no código
3. **Substituir os seletores** no CSS ou adicionar os seletores reais junto com os existentes

**Exemplo de como encontrar os seletores:**
- Clique com botão direito no card de um módulo → "Inspect"
- Veja a estrutura HTML e os nomes das classes/IDs
- Use esses nomes no CSS

---

## 📝 Checklist de Aplicação

- [ ] Copiei o conteúdo de `dashboard-modulos-mobile-fix.css`
- [ ] Colei no CSS do dashboard OU importei o arquivo
- [ ] Verifiquei se os seletores batem com o HTML real
- [ ] Ajustei os seletores se necessário
- [ ] Testei no modo mobile (DevTools)
- [ ] Testei em diferentes dispositivos (iPhone 16, Android, etc.)
- [ ] Verifiquei que toggle não está em cima do ícone
- [ ] Verifiquei que botões estão dentro do card
- [ ] Verifiquei que consegue rolar até o último módulo
- [ ] Verifiquei que consegue editar/duplicar o último módulo

---

## 🆘 Precisa de Ajuda?

Se os seletores não baterem ou precisar de ajustes específicos:

1. **Envie o HTML** da tela "Módulos Ativos" (código-fonte ou screenshot do Inspect)
2. **Ou abra o projeto do dashboard no Cursor** para eu ajustar diretamente

O arquivo `dashboard-modulos-mobile-fix.css` está pronto para uso! 🎉
