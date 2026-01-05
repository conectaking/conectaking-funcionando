# Plano de Melhorias - Formulário King

## Resumo das Melhorias Solicitadas

### 1. Estrutura de Abas
- **Aba "Perguntas"**: Editor de perguntas estilo Google Forms
- **Aba "Respostas"**: Dashboard com estatísticas e lista de respondentes

### 2. Tipos de Campos (Google Forms Style)
1. **Resposta Curta** - Campo de texto curto
2. **Parágrafo** - Campo de texto longo (textarea)
3. **Escolha múltipla** - Radio buttons (uma opção)
4. **Caixa de verificação** - Checkboxes (múltiplas opções)
5. **Menu suspenso** - Dropdown/Select
6. **Carregar ficheiro** - Upload de arquivo
7. **Escala linear** - Rating scale (1-5, 1-10, etc)
8. **Classificação** - Star rating
9. **Grelha de escolhas múltiplas** - Grid com radio buttons
10. **Grelha de caixa de verificação** - Grid com checkboxes
11. **Data** - Date picker
12. **Hora** - Time picker
13. **Data e hora** - Combined date/time picker

### 3. Personalização Visual
- Foto de abertura/evento (header image)
- Foto de fundo (background image)
- Melhorar visual geral (premium look)
- Opções de tema aprimoradas

### 4. Tudo Editável
- Remover campos fixos da igreja
- Todos os campos devem ser editáveis/removíveis
- Sistema 100% dinâmico

### 5. Dashboard de Respostas
- Quantidade total de respostas
- Lista de respondentes
- Números de telefone
- Dados das respostas
- Estatísticas por pergunta

## Estrutura de Dados

### Form Fields (JSONB)
```json
[
  {
    "id": "unique_id",
    "type": "short_text|paragraph|multiple_choice|checkbox|dropdown|file_upload|linear_scale|rating|multiple_choice_grid|checkbox_grid|date|time|datetime",
    "label": "Pergunta",
    "required": true/false,
    "order": 1,
    "options": ["Opção 1", "Opção 2"], // Para múltipla escolha, checkbox, dropdown
    "rows": ["Linha 1", "Linha 2"], // Para grids
    "columns": ["Coluna 1", "Coluna 2"], // Para grids
    "min": 1, // Para linear scale
    "max": 5, // Para linear scale
    "minLabel": "Ruim", // Para linear scale
    "maxLabel": "Ótimo", // Para linear scale
    "stars": 5, // Para rating
    "placeholder": "Texto de exemplo"
  }
]
```

### Responses (JSONB)
```json
{
  "form_fields": {
    "field_id_1": "Resposta do campo 1",
    "field_id_2": ["Opção A", "Opção B"],
    "field_id_3": "2026-01-05"
  },
  "responder_name": "Nome do Respondente",
  "responder_email": "email@example.com",
  "responder_phone": "5511999999999",
  "submitted_at": "2026-01-05T18:00:00Z"
}
```

## Implementação

### Fase 1: Estrutura Base ✅
- [x] Migration para tabela de respostas
- [ ] Adicionar campos de personalização (header_image, background_image)

### Fase 2: Editor de Perguntas
- [ ] Interface com abas (Perguntas/Respostas)
- [ ] Editor visual estilo Google Forms
- [ ] Suporte a todos os tipos de campo
- [ ] Drag and drop para reordenar perguntas

### Fase 3: Remover Campos Fixos
- [ ] Tornar todos os campos dinâmicos
- [ ] Remover campos específicos de igreja
- [ ] Sistema 100% editável

### Fase 4: Dashboard de Respostas
- [ ] Rota para buscar respostas
- [ ] Interface de dashboard
- [ ] Estatísticas e gráficos
- [ ] Lista de respondentes
- [ ] Exportação de dados

### Fase 5: Visual Premium
- [ ] Header image
- [ ] Background image
- [ ] Melhorias de design
- [ ] Temas aprimorados

### Fase 6: Formulário Público
- [ ] Atualizar template para novos tipos de campo
- [ ] Suporte a todos os tipos de campo
- [ ] Visual premium
- [ ] Responsividade

