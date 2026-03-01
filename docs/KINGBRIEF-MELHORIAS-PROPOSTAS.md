# KingBrief – Melhorias propostas (antes de instalar)

Lista de melhorias possíveis para o módulo KingBrief. **Nenhuma está instalada ainda.** Escolha o que faz sentido e peça para implementar.

---

## 1. Lista de reuniões (entrada no KingBrief)

**Situação atual:** Ao abrir `kingbrief.html` sem `?id=`, o sistema busca a última reunião da API ou usa mock. Não existe uma página que mostre **todas** as reuniões do utilizador.

**Proposta:**
- Criar vista **“Minhas reuniões”**: lista (título, data, duração) com link para cada reunião.
- Opção: botão “Nova reunião” nessa lista que leva a `kingbrief-nova.html`.
- Pode ser uma página nova (`kingbrief-lista.html`) ou um painel/modal na própria `kingbrief.html` quando não há `id` na URL.

**Impacto:** Frontend (nova página ou painel) + uso do `GET /api/kingbrief` (já existe).

---

## 2. Excluir reunião (botão do header)

**Situação atual:** O botão “Excluir reunião” (ícone de lixo) no header **não está ligado** a nenhuma ação.

**Proposta:**
- Ao clicar: confirmação (“Tem certeza que deseja excluir esta reunião?”).
- Se confirmar: `DELETE /api/kingbrief/:id` e redirecionar para a lista de reuniões (ou para o dashboard).
- Tratar erros (ex.: 404, 403) com mensagem na interface.

**Impacto:** Poucas linhas de JavaScript no `kingbrief.html`.

---

## 3. Exportar Ata em Word

**Situação atual:** Ata executiva pode ser exportada só em **PDF** (janela de impressão).

**Proposta:**
- Botão **“Exportar Word”** ao lado de “Exportar PDF” da Ata.
- Gerar um ficheiro `.docx` ou HTML para abrir no Word (ex.: blob com conteúdo em HTML e `Content-Disposition: .doc` ou usar uma lib leve no frontend para .docx).

**Impacto:** Frontend; opcionalmente uma pequena lib para .docx.

---

## 4. Gravação: pausar / retomar

**Situação atual:** Na Nova reunião é possível **Iniciar** e **Parar** gravação. Não há **Pausar** nem **Retomar**.

**Proposta:**
- Botão **“Pausar”** durante a gravação (e **“Retomar”** quando pausado).
- Usar `MediaRecorder.pause()` e `MediaRecorder.resume()` (suportado em vários browsers).
- Timer pausa quando está em pausa; ao retomar continua a contar.

**Impacto:** Apenas frontend em `kingbrief-nova.html`.

---

## 5. Persistir alterações do mapa mental (drag-and-drop)

**Situação atual:** Ao reordenar nós no mapa (arrastar e largar), a nova ordem vale só na sessão. Ao recarregar a página, volta ao que veio da API.

**Proposta:**
- Ao reordenar, guardar a nova árvore (ex.: `mindmap_json`) no backend.
- Endpoint **PATCH /api/kingbrief/:id** já aceita outros campos; estender para aceitar `mindmap_json` (ou criar campo específico) e gravar na BD.
- No frontend: após cada drop que altere a ordem, chamar PATCH com o `mindmap` atual.

**Impacto:** Backend (permitir `mindmap_json` no PATCH) + frontend (chamar PATCH após reordenar).

---

## 6. Tarefas: editar e sincronizar com o backend

**Situação atual:** As tarefas podem ser marcadas como “concluídas” e o estado é guardado em **localStorage**. Não há edição do texto da tarefa nem envio para o servidor.

**Proposta:**
- Permitir **editar** a descrição da tarefa (e, se existir, responsável e prazo) na própria lista.
- Enviar o estado (incluindo “concluída”) para o backend: **PATCH /api/kingbrief/:id** com `actions_json` atualizado.
- Opcional: campo “prioridade” (ex.: alta/média/baixa) no backend e na UI.

**Impacto:** Backend (garantir que `actions_json` no PATCH inclui estrutura completa) + frontend (formulário de edição + leitura do estado do servidor).

---

## 7. Link compartilhável (público)

**Situação atual:** “Copiar link” copia o URL atual (ex.: `kingbrief.html?id=xxx`). Quem abrir precisa estar autenticado no ConectaKing.

**Proposta:**
- Gerar um **link público** (token único) que permita ver a reunião (só leitura) sem login.
- Backend: nova tabela ou campo para “token de partilha” por reunião; endpoint `GET /api/kingbrief/shared/:token` (sem auth) que devolve dados da reunião (sem dados sensíveis).
- Frontend: página ou modo “só leitura” quando se entra por esse link; botão “Gerar link partilhável” / “Copiar link partilhável”.

**Impacto:** Backend (token, endpoint público, segurança) + frontend.

---

## 8. Modo “Resumo Aula” no painel Resumo

**Situação atual:** Existem modos Rápido, Estratégico e Executivo. O conteúdo do **Modo Aula** (resumo didático, perguntas, flashcards) está numa **aba separada** (“Aula”), gerada por um pedido à API.

**Proposta:**
- No painel **Resumo**, adicionar o modo **“Aula”** ao selector (ao lado de Rápido, Estratégico, Executivo).
- Quando o utilizador escolher “Aula”: ou reutilizar os dados já carregados da aba Aula (se já tiver clicado em “Gerar modo aula”) ou fazer o pedido à API nesse momento e mostrar o resumo didático + perguntas (e opcionalmente flashcards) no próprio painel Resumo.

**Impacto:** Só frontend (novo modo + reutilizar dados da aba Aula ou chamar `GET /:id/lesson`).

---

## 9. Transcrição: falantes vindos do backend

**Situação atual:** Os “falantes” (Speaker 1, 2…) e os tipos (pergunta, tarefa, decisão) são inferidos no **frontend** (heurísticas e deteção por texto).

**Proposta:**
- No **backend**, após a transcrição (Whisper), enviar o texto para um passo opcional (ex.: GPT ou regras) que devolva segmentos com `speaker` e `type` (pergunta/decisão/tarefa).
- Guardar transcrição estruturada (ex.: `transcript_json` com array de `{ speaker, text, type, t }`) e devolver na API.
- Frontend continua a mostrar como hoje, mas usando os dados do backend em vez de heurísticas.

**Impacto:** Backend (novo passo no pipeline, possível novo campo na BD) + ajuste no frontend para usar `transcript_json` quando existir.

---

## 10. Limite de duração / tamanho antes do upload

**Situação atual:** Na Nova reunião mostra-se duração e tamanho do ficheiro/gravação. O backend tem limite de tamanho (ex.: 200 MB), mas não há aviso claro nem bloqueio no frontend.

**Proposta:**
- Definir um **limite máximo** (ex.: 60 min ou 100 MB) configurável ou fixo.
- No frontend: se o ficheiro ou gravação exceder o limite, **não permitir enviar** e mostrar mensagem (“Áudio demasiado longo. Máximo: X min” ou “Ficheiro demasiado grande. Máximo: Y MB”).
- Opcional: barra ou indicador de “dentro do limite” (ex.: verde) / “acima do limite” (vermelho).

**Impacto:** Só frontend (validação + mensagens); opcionalmente config no backend.

---

## 11. Cache / não reprocessar resumos

**Situação atual:** Cada vez que se pede relatório de Negócio, Aula ou Comunicação, a API chama o GPT de novo.

**Proposta:**
- Guardar na BD o resultado da primeira vez (ex.: `business_json`, `lesson_json`, `communication_json`).
- Se já existir, **devolver do cache**; opcionalmente botão “Regenerar” que força novo pedido ao GPT e atualiza a BD.
- Reduz custo e tempo de resposta em aberturas repetidas da mesma reunião.

**Impacto:** Backend (novos campos ou tabela de cache + lógica no serviço).

---

## 12. Responsividade e acessibilidade

**Situação atual:** O layout funciona em desktop; as abas e botões podem ficar apertados em telemóvel.

**Proposta:**
- Abas em **scroll horizontal** no mobile ou menu “hamburger” para escolher secção.
- Botões do header em **menu dropdown** em ecrãs pequenos (ex.: “Mais” com Exportar, Copiar link, Excluir).
- Revisar **contraste** e **labels** para leitores de ecrã (ARIA, roles).
- Garantir que os botões principais têm tamanho mínimo de toque (ex.: 44px).

**Impacto:** Apenas CSS e pequenos ajustes de HTML/JS.

---

## Resumo rápido

| # | Melhoria                         | Dificuldade | Onde atua   |
|---|----------------------------------|------------|-------------|
| 1 | Lista de reuniões                | Média      | Frontend    |
| 2 | Excluir reunião (ligar botão)    | Fácil      | Frontend    |
| 3 | Exportar Ata em Word             | Média      | Frontend    |
| 4 | Pausar / Retomar gravação        | Fácil      | Frontend    |
| 5 | Persistir mapa mental (PATCH)    | Média      | Backend + FE|
| 6 | Tarefas: editar + sync backend   | Média      | Backend + FE|
| 7 | Link partilhável público         | Alta       | Backend + FE|
| 8 | Modo Aula no painel Resumo       | Fácil      | Frontend    |
| 9 | Falantes/tipos no backend        | Média/Alta | Backend + FE|
| 10| Limite duração/tamanho upload    | Fácil      | Frontend    |
| 11| Cache relatórios (Negócio/Aula/Com.) | Média  | Backend     |
| 12| Responsividade e acessibilidade  | Média      | Frontend    |

---

**Próximo passo:** Diga quais números (ou temas) quer que eu implemente primeiro (ex.: “2, 4 e 10” ou “lista de reuniões e excluir”). Não instalo nada até você indicar.
