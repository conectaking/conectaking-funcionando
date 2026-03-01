# KingBrief – Melhorias no frontend (lista/detalhe)

## 1. Botão "Melhorar texto" (já disponível na API)

Na página de **detalhe da reunião** (onde se mostra a transcrição), adicionar:

- **Botão "Melhorar texto"**: chama `POST /api/kingbrief/:id/improve-text` com `Content-Type: application/json`.
  - Sem body ou `{}`: a API devolve `{ data: { improved_text, saved: false } }` (só visualização).
  - Com body `{ "apply": true }`: a API melhora o texto, **guarda** na reunião e devolve `{ data: { improved_text, saved: true } }`.
- Fluxo sugerido: ao clicar "Melhorar texto", mostrar loading; ao receber, exibir o texto melhorado num modal ou substituir a área da transcrição, com opção **"Aplicar"** que reenvia com `apply: true` e atualiza a UI.

O backend já corrige ortografia e fluência (estilo “Claude”/resumo de fala).

---

## 2. Mapa mental – zoom e pan

Se o zoom do mapa mental “não tira direito” ou fica estranho:

- **Zoom**: aplicar `transform: scale(x)` com `transform-origin: center` (ou 50% 50%) no container do mapa, para o zoom ser em relação ao centro.
- **Pan**: guardar offset (x, y) e aplicar `transform: translate(x, y) scale(s)`. Atualizar x,y no arrastar do rato/touch.
- **Bibliotecas**: usar algo como [panzoom](https://github.com/anvaka/panzoom) no container (DOM ou SVG) para pan e zoom consistentes; suporta wheel zoom e arrastar.

O backend passou a enviar **até 60k caracteres** da transcrição para o mapa mental (em vez de 12k), e o prompt pede **subtópicos e continuação** dos ramos. Se a página do mapa mental existir noutro repositório, garantir que usa `mindmap_json` da reunião e que o zoom/pan usam a mesma origem e limites (ex.: scale entre 0.2 e 2).

---

## 3. Tópicos

Os tópicos (`topics_json`) são gerados pelo mesmo GPT que usa agora até 60k caracteres da transcrição. Se antes ficavam incompletos, com a alteração no backend devem refletir melhor reuniões longas.
