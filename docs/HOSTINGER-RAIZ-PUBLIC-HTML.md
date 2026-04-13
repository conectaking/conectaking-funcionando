# Hostinger: fazer o domínio “ler” só a pasta `public_html`

O teu fluxo (meter **tudo** dentro de **uma pasta** `public_html` e atualizar de uma vez) é o correcto. O que falha quando aparece **403** ou página em branco na raiz (`/`) quase nunca é o código do back-end: é o **servidor a usar outra pasta como raiz do site** do que aquela onde estão o `index.html` e o resto.

## O que tem de acontecer

O domínio `conectaking.com.br` (e `www`) tem de ter como **raiz do documento** (document root) **exactamente a pasta** onde estão:

- `index.html`
- `login.html`
- `.htaccess`
- etc.

No teu PC isso chama-se `public_html`. **No servidor**, o caminho pode aparecer como `public_html` ou `domains/conectaking.com.br/public_html`, mas o princípio é: **o URL `https://www.conectaking.com.br/` tem de apontar para essa pasta**, não para a pasta “pai” onde só vês uma subpasta `public_html` e mais nada.

## Se no File Manager vês só `public_html` na raiz

Cenário típico:

- Na raiz da conta há **só** a pasta `public_html`.
- O teu `index.html` está **dentro** de `public_html`.
- Se o domínio estiver com raiz na **pasta de cima** (a raiz da conta), o Apache **não vê** o `index.html` → **403 Forbidden** (sem listagem de pastas e sem ficheiro inicial).

**Correcção:** no painel da Hostinger, define a **raiz do website / document root** para a pasta **`public_html`** (a que contém o site), não para o directório pai.

## Onde mudar na Hostinger (hPanel)

Os nomes dos menus podem variar ligeiramente:

1. Entra no **hPanel**.
2. **Websites** (ou **Alojamento**) → escolhe o site / domínio **conectaking.com.br**.
3. Procura **Domínios**, **Definições avançadas**, **Raiz do documento**, **Document root** ou **Ficheiros do site**.
4. O caminho correcto deve ser o que **termina em** `public_html` **onde estão os teus ficheiros** (por vezes: `domains/conectaking.com.br/public_html`).
5. Guarda e espera alguns minutos; testa em janela anónima: `https://www.conectaking.com.br/`

Se não encontrares a opção, abre o **chat da Hostinger** e pede: *“Quero que o document root do domínio conectaking.com.br seja a pasta public_html onde está o index.html.”*

## Estrutura certa (um zip = uma pasta)

- **Correcto:** dentro de `public_html` vês directamente `index.html`, `login.html`, `js/`, etc.
- **Errado:** `public_html/public_html/index.html` (pasta duplicada).
- **Permissões:** pastas **755**, ficheiros **644** (no File Manager → Permissões).

## Isto não resolve no código do Render

A API no **Render** não define a raiz do site na Hostinger. Só o **painel da Hostinger** (ou o suporte) alinha a pasta do domínio com a tua `public_html`.

## Ficheiros no repositório que ajudam

- `public_html/.htaccess` — mínimo (`DirectoryIndex`, UTF-8).
- `public_html/index.php` — ajuda só em casos em que o servidor procura `index.php`; se existir `index.html`, o Apache usa primeiro o que estiver em `DirectoryIndex`.

Depois de a raiz do domínio estar correcta, o teu hábito de **atualizar só o conteúdo de `public_html`** continua a ser o ideal.
