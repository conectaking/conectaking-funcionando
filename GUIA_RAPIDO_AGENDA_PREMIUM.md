# 🚀 Guia Rápido - Agenda Inteligente Premium

## ✅ Migration Executada!

A migration 106 foi executada com sucesso! Todos os novos campos foram adicionados ao banco de dados.

---

## 🎯 Próximos Passos para Ativar

### 1. Ativar Agenda no Cartão Virtual

Use a API para ativar a agenda no seu cartão:

```bash
PUT /api/agenda/card-settings
Authorization: Bearer SEU_TOKEN

{
  "is_active_in_card": true,
  "card_button_text": "Agendar Reunião",
  "card_button_icon": "fa-calendar"
}
```

**Ou via JavaScript no frontend:**
```javascript
const response = await fetch('/api/agenda/card-settings', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    is_active_in_card: true,
    card_button_text: 'Agendar Reunião',
    card_button_icon: 'fa-calendar'
  })
});
```

### 2. Verificar Profile Item da Agenda

Certifique-se de ter um `profile_item` com:
- `item_type = 'agenda'`
- `is_active = true`
- `slug` único (ex: 'minha-agenda')

### 3. Conectar Google Calendar

O dono precisa conectar o Google Calendar:

```bash
GET /api/oauth/agenda/google/owner/connect
Authorization: Bearer SEU_TOKEN
```

Isso redirecionará para o Google OAuth e depois voltará para o dashboard.

### 4. Criar Slots de Disponibilidade

Crie horários disponíveis:

```bash
POST /api/agenda/slots
Authorization: Bearer SEU_TOKEN

{
  "type": "RECURRING",
  "day_of_week": 1,  // 0=domingo, 1=segunda, etc.
  "start_time": "09:00",
  "end_time": "17:00",
  "default_event_type": "REUNIAO"
}
```

---

## 🎨 Personalização do Botão

### Textos Sugeridos:
- "Agendar Reunião"
- "Agende comigo"
- "Reservar Horário"
- "Agendar Consulta"

### Ícones Sugeridos (Font Awesome):
- `fa-calendar` (padrão)
- `fa-calendar-check`
- `fa-clock`
- `fa-calendar-alt`
- `fa-calendar-day`

---

## 📱 Como Funciona para o Cliente

1. Cliente acessa seu cartão virtual
2. Vê o botão "Agendar Reunião" (se ativado)
3. Clica e é redirecionado para `/:slug/agenda`
4. Seleciona data e horário
5. Escolhe tipo: **Reunião** ou **Trabalho**
6. Se for Reunião, pode adicionar:
   - Endereço físico
   - Link do Google Maps
7. Preenche informações (nome, email, etc.)
8. Autentica com Google OAuth
9. **Automaticamente**:
   - ✅ Cria evento no seu calendário
   - ✅ Cria evento no calendário do cliente
   - ✅ Cria Google Meet (se for Reunião)
   - ✅ Inclui link do Maps (se fornecido)

---

## 🔍 Verificar se Está Funcionando

### 1. Verificar Botão no Cartão
Acesse seu cartão virtual público:
```
https://seu-dominio.com/SEU_SLUG
```

O botão da agenda deve aparecer se:
- ✅ `is_active_in_card = true`
- ✅ Existe `profile_item` com `item_type = 'agenda'`
- ✅ `profile_item.is_active = true`

### 2. Testar Agendamento
1. Acesse `/:slug/agenda` como cliente
2. Selecione uma data
3. Escolha um horário disponível
4. Preencha o formulário
5. Autentique com Google
6. Verifique se os eventos foram criados nos calendários

### 3. Verificar Eventos no Google Calendar
- Abra seu Google Calendar
- Verifique se o evento foi criado
- Se for Reunião, deve ter link do Google Meet
- Se tiver localização, deve aparecer o endereço

---

## 🐛 Problemas Comuns

### Botão não aparece
**Solução:**
1. Verificar se `is_active_in_card = true`:
```sql
SELECT is_active_in_card FROM agenda_settings WHERE owner_user_id = 'SEU_USER_ID';
```

2. Verificar se existe profile_item:
```sql
SELECT * FROM profile_items WHERE user_id = 'SEU_USER_ID' AND item_type = 'agenda';
```

### Eventos não são criados
**Solução:**
1. Verificar se Google Calendar está conectado:
```sql
SELECT * FROM oauth_accounts WHERE user_id = 'SEU_USER_ID' AND provider = 'google';
```

2. Verificar logs do servidor para erros

### Google Meet não é criado
**Solução:**
- Verificar se o tipo de evento é "REUNIAO" (não "TRABALHO")
- Verificar permissões OAuth (deve ter `calendar.events`)

---

## 📊 Exemplo Completo de Uso

### 1. Ativar no Cartão
```javascript
PUT /api/agenda/card-settings
{
  "is_active_in_card": true,
  "card_button_text": "Agendar Reunião",
  "card_button_icon": "fa-calendar-check"
}
```

### 2. Criar Slot Recorrente (Segunda a Sexta, 9h-17h)
```javascript
POST /api/agenda/slots
{
  "type": "RECURRING",
  "day_of_week": 1,  // Segunda
  "start_time": "09:00",
  "end_time": "17:00",
  "default_event_type": "REUNIAO"
}
// Repetir para terça (2), quarta (3), quinta (4), sexta (5)
```

### 3. Configurar Localização Padrão (Opcional)
```javascript
PUT /api/agenda/settings
{
  "default_location_address": "Rua Exemplo, 123 - São Paulo, SP",
  "default_location_maps_url": "https://maps.google.com/..."
}
```

---

## ✅ Checklist Final

- [x] Migration 106 executada
- [ ] Profile item da agenda criado
- [ ] Agenda ativada no cartão virtual
- [ ] Google Calendar conectado
- [ ] Slots de disponibilidade criados
- [ ] Testado agendamento como cliente
- [ ] Verificado criação de eventos
- [ ] Testado tipo "Reunião" (com Meet)
- [ ] Testado tipo "Trabalho" (sem Meet)
- [ ] Testado com localização (com Maps)

---

## 🎉 Pronto!

Sua Agenda Inteligente Premium está configurada e pronta para uso!

Para mais detalhes, consulte: `AGENDA_PREMIUM_MELHORIAS.md`
