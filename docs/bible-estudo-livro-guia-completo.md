# Estudo por Livro da Bíblia — Guia Completo (Especificação Oficial)

Este documento é a **especificação obrigatória** para a criação e expansão dos estudos profundos de cada livro bíblico no módulo Bíblia (Estudo por livro). Todo conteúdo gerado para `bible_book_studies` deve seguir este padrão.

---

## Papel do redator

Você é: **pesquisador bíblico + professor + redator devocional + analista literário.**

Crie um **ESTUDO PROFUNDO** do livro bíblico solicitado, com rigor e profundidade, no formato **"Guia Completo"** para quem não tem tempo de ler tudo, mas quer entender o livro com clareza, contexto, propósito de Deus e aplicações práticas para hoje.

---

## OBJETIVO DO RESULTADO

Entregar um estudo **completo e prático** contendo:

- **Mapa mental** (3 formatos: Texto, Mermaid, JSON)
- **Palavra-chave e índice do livro**
- **Contexto e propósito do livro** (por que foi escrito)
- **Estrutura detalhada** (blocos, capítulos, seções)
- **Narrativa por "cenas"** (o que aconteceu) com referência de capítulos e versículos
- **"Por quê" de cada cena** (sentido teológico e humano)
- **Propósito de Deus** nos personagens e nos acontecimentos
- **Temas teológicos principais** (com provas no texto)
- **Perguntas difíceis** (violência, sofrimento, moralidade antiga) com respostas equilibradas
- **Aplicações modernas** (família, trabalho, ansiedade, caráter, perdão, identidade, disciplina, finanças, relações, liderança, sexualidade, fé)
- **Plano de leitura** (7 dias e 30 dias)
- **Perguntas de reflexão** (devocional) + exercícios práticos
- **Resumos em 3 níveis** (60s, 5 min, 30 min)
- **Referências externas** com links confiáveis

---

## REGRAS DE RIGOR (OBRIGATÓRIAS)

1. **NÃO invente:** citações, datas, autores, "fatos históricos", descobertas arqueológicas ou referências.
2. Se algo for **debatido** (autoria, data, composição), apresente pelo menos 2 perspectivas:
   - Perspectiva **tradicional** (tradição judaico-cristã)
   - Perspectiva **acadêmica/crítica** (hipóteses reconhecidas)  
   Explique com neutralidade: "há mais de uma leitura".
3. **SEMPRE** incluir **capítulos e versículos** ao narrar histórias ou afirmar pontos importantes.
4. Separar claramente:
   - **"O texto diz"** (conteúdo do livro)
   - **"Interpretações"** (leituras possíveis e tradições)
5. **Linguagem:** clara, profunda, respeitosa, sem jargão desnecessário.
6. **Tamanho:** LONGO e COMPLETO. Se ficar grande, use seções bem organizadas e sumário.

---

## FONTES EXTERNAS (OBRIGATÓRIAS) COM LINKS

Usar no mínimo **8 fontes confiáveis e diversificadas**. Priorizar:

- **BibleProject** (visão literária/temática)
- **Encyclopaedia Britannica** (contexto geral)
- **Jewish Encyclopedia** ou fontes judaicas relevantes (para AT)
- Um **dicionário bíblico** reconhecido (ex.: ISBE, Anchor Bible Dictionary, BDAG/BDB quando necessário)
- Um **comentário clássico ou reconhecido** (ex.: Keil & Delitzsch, Matthew Henry, NICOT/NICNT, IVP, etc.)
- Uma **fonte acadêmica/universitária** (Oxford/Cambridge/Brill ou artigo/enciclopédia acadêmica)
- **Texto bíblico base** em 2 traduções (ex.: ARA + NVI / ACF + NVI / ou PT + EN)
- Opcional: manuscritos/cânon/história textual (se pertinente)

Se não achar fonte confiável para algum ponto, declarar:

> "Não encontrei fonte confiável suficiente para confirmar X."

---

## FORMATO FINAL DO ESTUDO (OBRIGATÓRIO)

### 0) FICHA RÁPIDA (1 página)

- Nome do livro (hebraico / grego / português)
- Onde fica na Bíblia (cânon)
- Gênero literário
- Tema central em 1 frase
- Palavra-chave do livro (5 a 12)
- Versículo(s)-chave (2 a 6 referências)
- Personagens principais
- Uma linha do tempo (se aplicável)
- "Por que esse livro importa hoje?" (5 bullets fortes)

---

### 1) MAPA MENTAL DO LIVRO (3 FORMATOS)

**1.1) Mapa mental em TEXTO** (bem legível)

- Padrão exemplo:
  ```
  TEMA CENTRAL
   ├─ Bloco 1 (capítulos)
   │   ├─ Cena/Evento
   │   ├─ Significado
   │   └─ Aplicação hoje
   ├─ Bloco 2...
   └─ Temas recorrentes...
  ```

**1.2) Mapa mental em MERMAID** (para colar em editor que renderiza)

- Formato:
  ```mermaid
  mindmap
    root((NOME DO LIVRO))
      Tema central
      Estrutura
      Personagens
      Eventos-chave
      Temas teológicos
      Aplicações
      Versículos-chave
  ```

**1.3) Mapa mental em JSON** (para sistema/app)

- Estrutura padrão:
  - `book`, `central_theme`, `keywords`
  - `nodes`: array com `id`, `label`, `type` (root, theme, block, event, meaning, application), `parent`, `refs` (cap/versículo quando houver)
- Regras: IDs únicos e curtos; sempre `refs` em eventos/temas quando houver base textual.

---

### 2) CONTEXTO E PROPÓSITO

- Por que esse livro foi escrito?
- Para quem (público e função na tradição)
- Autoria e data (tradicional x acadêmica)
- Ambiente histórico/cultural (quando aplicável)
- O que esse livro está tentando construir na mente do leitor? (missão teológica e moral)
- Citar fontes com links.

---

### 3) ESTRUTURA DETALHADA (MAPA DE CAPÍTULOS)

- Quebrar o livro em blocos e sub-blocos.
- Para cada bloco:
  - Título do bloco
  - Capítulos
  - 1 frase do que acontece
  - 1 frase do significado
  - 1 frase de aplicação

---

### 4) NARRATIVA "POR CENAS" (com refs)

- Contar as histórias principais com clareza.
- Para cada cena:
  - **A)** O que aconteceu (resumo narrativo)
  - **B)** Referência bíblica (capítulos/versículos)
  - **C)** Por que aconteceu / ponto central
  - **D)** O que Deus está revelando (caráter de Deus)
  - **E)** O que isso forma no personagem (transformação)
  - **F)** Aplicação prática hoje (vida real)

---

### 5) PERFIS DOS PERSONAGENS (propósito de Deus neles)

- Para **5 a 12 personagens** (ou os principais do livro):
  - Quem é
  - Crise principal
  - Escolhas e consequências
  - O que Deus fez/ensinou
  - Lições práticas hoje
  - Referências bíblicas

---

### 6) TEMAS TEOLÓGICOS PRINCIPAIS (8 a 15)

- Para cada tema:
  - Definição simples
  - Onde aparece no livro (refs)
  - Conexões internas (como se repete)
  - Impacto hoje (ética, emoções, decisões, hábitos)

---

### 7) PERGUNTAS DIFÍCEIS (respostas honestas e equilibradas)

- Pelo menos **8 perguntas**.
- Para cada uma:
  - Por que isso incomoda o leitor moderno
  - O que o texto realmente diz
  - Leituras diferentes (quando houver)
  - Aplicação madura (sem simplificar)

---

### 8) APLICAÇÕES MODERNAS + "Plano de mudança"

- **15 a 25 aplicações**, organizadas por área:
  - identidade e propósito
  - família e relacionamentos
  - trabalho e dinheiro
  - ansiedade e medo
  - caráter e integridade
  - perdão e cura emocional
  - liderança e responsabilidade
- Incluir um **"Plano 7 dias"** de prática (hábitos diários + oração/reflexão).

---

### 9) PLANO DE LEITURA

- **7 dias** (visão geral)
- **30 dias** (leitura com aprofundamento)
- Cada dia: capítulos + 1 objetivo + 1 pergunta guia

---

### 10) RESUMO EM 3 NÍVEIS

- **60 segundos** (5–7 linhas)
- **5 minutos** (10–18 linhas)
- **30 minutos** (tópicos por bloco)

---

### 11) REFERÊNCIAS E LINKS

- Lista completa, com breve descrição de cada fonte (por que é confiável).

---

## INPUT PADRÃO

- **Livro:** &lt;NOME DO LIVRO&gt;
- **Traduções base:** ARA + NVI (se o usuário não informar)
- **Profundidade:** ALTA
- **Tom:** didático, profundo, aplicável, respeitoso
- **Público:** leigo + intermediário

Perguntar ao usuário apenas se faltar informação essencial.

---

## SAÍDA EXTRA OPCIONAL (SE SOLICITADO)

- **Flashcards** (20 a 50): Q / A / Ref
- **Quiz** (10 a 20 questões) com gabarito e refs
- **"Resumo pregável"** (esboço para pregação) em 3 pontos
- **"Resumo para criança/adolescente"** (linguagem simples)

---

## Onde este padrão é usado no projeto

- Conteúdo da tabela **`bible_book_studies`** (campo `content` e, quando houver, campos adicionais para mapa JSON).
- Migrations e seeds que inserem/atualizam estudos de livros (ex.: `186_bible_book_studies_deep_seed.sql`, `187_bible_book_studies_deep_1samuel.sql`).
- Qualquer geração de texto para "Estudo por livro" (manual, script ou API) deve seguir este guia.
