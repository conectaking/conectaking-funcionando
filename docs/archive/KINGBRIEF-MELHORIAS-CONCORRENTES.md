# KingBrief – Melhorias inspiradas em Plaud, Otter e Fireflies

Documento de sugestões com base no que os principais concorrentes (Plaud AI, Otter.ai, Fireflies.ai) oferecem e que o KingBrief pode adoptar ou adaptar.

---

## O que a concorrência oferece

### Plaud AI
- **Transcrição** em tempo real, 112+ idiomas, vários falantes, edição na app.
- **Resumos** multi‑dimensional (decisões, números, citações), 3000+ templates por sector.
- **Mapa mental** a partir da gravação.
- **Organização** automática e integrações.
- **Planos** por minutos/mês (ex.: 300 min, 1200 min, ilimitado).
- Conformidade GDPR, HIPAA, SOC 2.

### Otter.ai
- **Transcrição em tempo real** em Zoom, Teams, Google Meet; OtterPilot junta‑se às reuniões agendadas.
- **Resumos** com action items e hiperlinks para as notas.
- **Slides e partilha de ecrã** capturados e ligados às notas.
- **Otter AI Chat**: perguntas sobre a reunião em tempo real ou depois.
- **Identificação de falantes**, vocabulário personalizado.
- **Export** TXT, DOCX, PDF, SRT.
- **Legendas ao vivo** em Zoom/Meet.
- **Integração** com calendário (Google, Outlook).

### Fireflies.ai
- **Notas em tempo real** com falantes e timestamps (Meet, Teams, Zoom).
- **Action items** automáticos e atribuição a participantes.
- **AskFred**: assistente que responde a perguntas sobre a reunião.
- **Soundbites**: clipes de áudio partilháveis de momentos importantes.
- **Pesquisa** em reuniões e analytics.
- **Partilha**: links públicos para convidados verem recaps sem login (planos Business/Enterprise).
- Integrações CRM, gestão de projetos; API; conformidade SOC 2, GDPR, HIPAA.

---

## O que o KingBrief já tem (alinhado à concorrência)

- Transcrição (Whisper) e resumo (GPT).
- Tópicos, ata executiva, mapa mental, tarefas (action items).
- Relatórios Negócio, Aula, Comunicação (com cache).
- Lista de reuniões, excluir reunião.
- Export Ata em PDF e Word.
- Gravação com pausar/retomar; upload de ficheiro.
- Persistência do mapa mental (PATCH mindmap_json).
- Limite de minutos KingBrief **por plano** (admin define em Planos); verificação no upload/confirm.
- Modo Aula no painel Resumo.

---

## Sugestões de melhoria (o que eles têm e o KingBrief pode acrescentar)

| Funcionalidade | Quem tem | Sugestão para KingBrief |
|----------------|----------|--------------------------|
| **Link partilhável público** | Fireflies, outros | Link só leitura para partilhar ata/resumo com quem não tem conta (token por reunião, página pública). |
| **Export em mais formatos** | Otter (TXT, DOCX, PDF, SRT) | Já tem PDF e Word para Ata; adicionar export da **transcrição** em TXT ou SRT (legendas). |
| **Identificação de falantes** | Otter, Fireflies | Opção “quem falou” por segmento (diarização); requer modelo ou API que suporte speaker labels. |
| **Perguntas sobre a reunião (chat)** | Otter AI Chat, AskFred | Bot “perguntar sobre esta reunião”: enviar transcrição + pergunta ao GPT e mostrar resposta (sem nova gravação). |
| **Clipes de áudio partilháveis** | Fireflies Soundbites | Permitir seleccionar um trecho da transcrição e gerar link/ficheiro de áudio desse segmento (requer cortar áudio por timestamps). |
| **Integração com calendário** | Otter, Fireflies | Ligar reuniões a eventos (Google/Outlook) ou abrir “Nova reunião” a partir de um evento. |
| **Integração com Zoom/Meet/Teams** | Otter, Fireflies | Bot ou integração que entra na chamada e grava/transcreve (complexo; pode ficar para uma fase futura). |
| **Templates de resumo por sector** | Plaud | Perfis de resumo (ex.: “Vendas”, “Aula”, “Stand-up”) com prompts diferentes; já existe modo Negócio/Aula/Comunicação – pode generalizar. |
| **Pesquisa global em reuniões** | Fireflies | Endpoint e UI: pesquisar texto em todas as transcrições do utilizador. |
| **Responsividade e menu mobile** | Todos | Abas em scroll horizontal, menu “Mais” no header em ecrãs pequenos (já proposto em KINGBRIEF-MELHORIAS-PROPOSTAS.md). |
| **Tarefas: editar e sync** | Todos | Editar texto/responsável/prazo e enviar `actions_json` no PATCH; marcar concluída já persistido (proposto, em implementação). |

---

## Priorização sugerida

1. **Curto prazo:** Link partilhável público, export transcrição (TXT/SRT), responsividade, tarefas editar/sync.
2. **Médio prazo:** “Perguntar sobre a reunião” (chat com GPT), pesquisa global.
3. **Longo prazo:** Diarização (falantes), clipes de áudio, integrações calendário/videoconferência.

---

*Documento criado com base em pesquisa sobre Plaud AI, Otter.ai e Fireflies.ai (2024).*
