# King Briefing 2.0 – Diagnóstico e Roadmap

Documento de referência: **PROMPT OFICIAL – KING BRIEFING 2.0 (ÁUDIO ONLY)**.

---

## O que já existe (manter e evoluir)

| Item | Estado atual | O que falta |
|------|--------------|-------------|
| **Gravação / upload** | Backend: POST `/api/kingbrief` (upload áudio), POST `/upload-url` + POST `/confirm` (R2). Filtro: só áudio. | Frontend: página "Nova reunião" com upload + gravação; timer grande; pausar/retomar; mostrar duração e tamanho antes do envio; **não** permitir vídeo. |
| **Transcrição** | Backend: Whisper; frontend: blocos, busca, copiar trecho. | Identificação de falantes (Speaker 1, 2…); destaque por tipo (decisões, perguntas, tarefas) no texto. |
| **Resumo** | Backend: um resumo (short, bullets, decisions, nextSteps) via GPT; frontend: um bloco. | Múltiplos modos: Rápido, Estratégico, Executivo, Aula; alternar sem reprocessar (backend pode gerar os 4 ou front adaptar exibição). |
| **Mapa mental** | Frontend: radial, zoom, expandir/recolher, busca, export PNG/JSON, tema escuro. | Drag-and-drop; reorganizar hierarquia; **export PDF**. |
| **Tarefas (ações)** | Backend: `actions_json` (task, owner, due) no GPT e na BD; PATCH atualiza. | Frontend: aba **Tarefas** com lista, marcar concluída, editar, exportar. |

---

## O que será implementado (novo)

| Item | Descrição |
|------|-----------|
| **Extração automática de tarefas** | Detetar frases de ação; lista com descrição, responsável, prioridade, status, prazo. Backend já extrai; evoluir prompt para prioridade/status e UI completa. |
| **Ata executiva** | Botão "Gerar Ata Executiva"; documento com objetivo, participantes, discussões, decisões, pendências, próximos passos, responsáveis; export **PDF e Word**. |
| **Modo negócio** | Análise: problema central, público-alvo, oportunidades, gargalos, riscos, potencial; relatório estratégico (novo endpoint ou extensão do GPT). |
| **Modo aula** | Resumo didático, perguntas de revisão, flashcards, mini simulado, palavras-chave (novo modo de resumo no backend + UI). |
| **Análise de comunicação** | Tempo de fala por pessoa, palavras mais repetidas, tom predominante, clareza; gráficos/indicadores (backend + UI). |
| **Exportação premium** | PDF executivo, Word, Markdown, JSON, **link compartilhável**; conteúdo: transcrição + resumo + mapa + tarefas. |
| **UX premium** | Tema dark + dourado; ícones minimalistas; animações suaves; layout: Áudio \| Transcrição \| Resumo \| Mapa \| Tarefas (e demais secções). |

---

## Regras técnicas

- **Áudio apenas**: não implementar upload de vídeo; aceitar apenas .mp3, .wav, .m4a (e webm de gravação).
- Backend desacoplado, API modular, processamento assíncrono, BD por sessões, cache para evitar reprocessamento.
- Interface responsiva; preparado para integração com KingAgenda e ConectaKing.

---

## Checklist de implementação (prioridade)

- [x] Documento diagnóstico (este ficheiro)
- [x] Aba **Tarefas** (lista, concluída, exportar)
- [x] **Ata executiva** (gerar + exportar PDF)
- [x] **Modos de resumo** (Rápido, Estratégico, Executivo) no painel Resumo
- [x] Página **Nova reunião** (upload áudio + gravação, timer, tamanho)
- [x] Transcrição: falantes e destaques por tipo (pergunta, tarefa, decisão)
- [x] Mapa mental: export PDF
- [ ] Mapa mental: drag-and-drop (reorganizar hierarquia)
- [ ] Modo Negócio (backend + UI)
- [ ] Modo Aula (backend + UI)
- [ ] Análise de comunicação (backend + UI)
- [x] Exportação Markdown, JSON, link compartilhável (copiar link)
