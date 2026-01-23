# 🔌 Integração Frontend - Agenda Inteligente

## 📋 APIs Disponíveis

### 1. Verificar Status do Google Calendar
```javascript
GET /api/agenda/google-calendar/status
Authorization: Bearer TOKEN

Resposta:
{
  "success": true,
  "data": {
    "isConnected": true,
    "email": "usuario@gmail.com",
    "connectedAt": "2025-01-31T12:00:00Z"
  }
}
```

### 2. Obter Dashboard Completo
```javascript
GET /api/agenda/dashboard
Authorization: Bearer TOKEN

Resposta:
{
  "success": true,
  "data": {
    "settings": {
      "is_active_in_card": true,
      "card_button_text": "Agendar Reunião",
      "card_button_icon": "fa-calendar"
    },
    "googleCalendar": {
      "isConnected": true,
      "email": "usuario@gmail.com",
      "connectedAt": "2025-01-31T12:00:00Z"
    },
    "stats": {
      "upcomingCount": 5,
      "activeSlotsCount": 8
    }
  }
}
```

### 3. Conectar Google Calendar
```javascript
GET /api/oauth/agenda/google/owner/connect
Authorization: Bearer TOKEN

// Redireciona para Google OAuth, depois volta para:
// FRONTEND_URL/dashboard.html?agenda=connected
```

### 4. Obter Configurações
```javascript
GET /api/agenda/settings
Authorization: Bearer TOKEN
```

### 5. Atualizar Configurações
```javascript
PUT /api/agenda/settings
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "meeting_duration_minutes": 30,
  "buffer_minutes": 15,
  "timezone": "America/Sao_Paulo",
  "default_location_address": "Rua Exemplo, 123",
  "default_location_maps_url": "https://maps.google.com/..."
}
```

---

## 💻 Exemplo de Código JavaScript para o Dashboard

### Carregar Status da Agenda
```javascript
async function loadAgendaDashboard() {
    try {
        const token = localStorage.getItem('token'); // ou como você armazena o token
        
        const response = await fetch('/api/agenda/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const { settings, googleCalendar, stats } = result.data;
            
            // Atualizar UI
            updateGoogleCalendarStatus(googleCalendar);
            updateStats(stats);
            updateSettings(settings);
        }
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

function updateGoogleCalendarStatus(googleCalendar) {
    const statusElement = document.getElementById('google-calendar-status');
    const connectButton = document.getElementById('connect-google-calendar-btn');
    
    if (googleCalendar.isConnected) {
        statusElement.textContent = `Conectado (${googleCalendar.email})`;
        statusElement.className = 'status-connected'; // Classe CSS para verde
        connectButton.textContent = 'Desconectar Google Calendar';
        connectButton.onclick = disconnectGoogleCalendar;
    } else {
        statusElement.textContent = 'Desconectado';
        statusElement.className = 'status-disconnected'; // Classe CSS para vermelho
        connectButton.textContent = 'Conectar Google Calendar';
        connectButton.onclick = connectGoogleCalendar;
    }
}

function updateStats(stats) {
    document.getElementById('upcoming-count').textContent = stats.upcomingCount;
    document.getElementById('active-slots-count').textContent = stats.activeSlotsCount;
}
```

### Conectar Google Calendar
```javascript
function connectGoogleCalendar() {
    const token = localStorage.getItem('token');
    
    // Redirecionar para a rota de conexão
    window.location.href = `/api/oauth/agenda/google/owner/connect?token=${token}`;
    // OU usar fetch e redirecionar manualmente:
    
    // fetch('/api/oauth/agenda/google/owner/connect', {
    //     headers: {
    //         'Authorization': `Bearer ${token}`
    //     }
    // })
    // .then(response => {
    //     if (response.redirected) {
    //         window.location.href = response.url;
    //     }
    // });
}
```

### Abrir Modal de Configurações
```javascript
async function openSettingsModal() {
    try {
        const token = localStorage.getItem('token');
        
        // Buscar configurações atuais
        const response = await fetch('/api/agenda/settings', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const settings = result.data;
            
            // Preencher formulário do modal
            document.getElementById('meeting-duration').value = settings.meeting_duration_minutes || 30;
            document.getElementById('buffer-minutes').value = settings.buffer_minutes || 0;
            document.getElementById('timezone').value = settings.timezone || 'America/Sao_Paulo';
            document.getElementById('default-location').value = settings.default_location_address || '';
            document.getElementById('default-maps-url').value = settings.default_location_maps_url || '';
            document.getElementById('card-button-text').value = settings.card_button_text || 'Agendar Reunião';
            document.getElementById('card-button-icon').value = settings.card_button_icon || 'fa-calendar';
            document.getElementById('is-active-in-card').checked = settings.is_active_in_card || false;
            
            // Mostrar modal
            document.getElementById('settings-modal').style.display = 'block';
        }
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        alert('Erro ao carregar configurações');
    }
}

async function saveSettings() {
    try {
        const token = localStorage.getItem('token');
        
        const settings = {
            meeting_duration_minutes: parseInt(document.getElementById('meeting-duration').value),
            buffer_minutes: parseInt(document.getElementById('buffer-minutes').value),
            timezone: document.getElementById('timezone').value,
            default_location_address: document.getElementById('default-location').value,
            default_location_maps_url: document.getElementById('default-maps-url').value,
            card_button_text: document.getElementById('card-button-text').value,
            card_button_icon: document.getElementById('card-button-icon').value,
            is_active_in_card: document.getElementById('is-active-in-card').checked
        };
        
        const response = await fetch('/api/agenda/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(settings)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Configurações salvas com sucesso!');
            document.getElementById('settings-modal').style.display = 'none';
            loadAgendaDashboard(); // Recarregar dashboard
        } else {
            alert('Erro ao salvar: ' + result.error);
        }
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        alert('Erro ao salvar configurações');
    }
}
```

### Verificar se voltou da conexão OAuth
```javascript
// No carregamento da página
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('agenda') === 'connected') {
        // Mostrar mensagem de sucesso
        showSuccessMessage('Google Calendar conectado com sucesso!');
        
        // Recarregar dashboard
        loadAgendaDashboard();
        
        // Limpar parâmetro da URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});
```

---

## 🎨 Exemplo de HTML para o Dashboard

```html
<!-- Status do Google Calendar -->
<div class="card">
    <h3>Google Calendar</h3>
    <p id="google-calendar-status" class="status-disconnected">Desconectado</p>
    <button id="connect-google-calendar-btn" onclick="connectGoogleCalendar()">
        Conectar Google Calendar
    </button>
</div>

<!-- Estatísticas -->
<div class="stats-grid">
    <div class="stat-card">
        <h4>Próximos</h4>
        <p id="upcoming-count">0</p>
    </div>
    <div class="stat-card">
        <h4>Slots Ativos</h4>
        <p id="active-slots-count">0</p>
    </div>
</div>

<!-- Botões de Ação -->
<div class="action-buttons">
    <button onclick="openNewSlotModal()">+ Novo Slot</button>
    <button onclick="openSettingsModal()">⚙️ Configurações</button>
    <button id="connect-google-calendar-btn" onclick="connectGoogleCalendar()">
        G Conectar Google Calendar
    </button>
</div>

<!-- Modal de Configurações -->
<div id="settings-modal" class="modal" style="display: none;">
    <div class="modal-content">
        <span class="close" onclick="closeSettingsModal()">&times;</span>
        <h2>Configurações da Agenda</h2>
        
        <form id="settings-form" onsubmit="saveSettings(); return false;">
            <label>Duração da Reunião (minutos):</label>
            <input type="number" id="meeting-duration" min="15" max="480" value="30">
            
            <label>Tempo de Buffer (minutos):</label>
            <input type="number" id="buffer-minutes" min="0" max="60" value="0">
            
            <label>Fuso Horário:</label>
            <select id="timezone">
                <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                <!-- Outras opções -->
            </select>
            
            <label>Endereço Padrão:</label>
            <input type="text" id="default-location" placeholder="Rua Exemplo, 123">
            
            <label>Link do Google Maps Padrão:</label>
            <input type="url" id="default-maps-url" placeholder="https://maps.google.com/...">
            
            <label>Ativar no Cartão Virtual:</label>
            <input type="checkbox" id="is-active-in-card">
            
            <label>Texto do Botão:</label>
            <input type="text" id="card-button-text" value="Agendar Reunião">
            
            <label>Ícone do Botão:</label>
            <input type="text" id="card-button-icon" value="fa-calendar" placeholder="fa-calendar">
            
            <button type="submit">Salvar</button>
            <button type="button" onclick="closeSettingsModal()">Cancelar</button>
        </form>
    </div>
</div>
```

---

## 🔄 Substituir Mensagens "Em Desenvolvimento"

### Antes (❌):
```javascript
function connectGoogleCalendar() {
    alert('Integração com Google Calendar em desenvolvimento');
}

function openSettingsModal() {
    alert('Modal de configurações em desenvolvimento');
}
```

### Depois (✅):
```javascript
function connectGoogleCalendar() {
    const token = localStorage.getItem('token');
    window.location.href = `/api/oauth/agenda/google/owner/connect?token=${token}`;
}

async function openSettingsModal() {
    // Código acima no exemplo
    await loadSettings();
    document.getElementById('settings-modal').style.display = 'block';
}
```

---

## ✅ Checklist de Implementação

- [ ] Substituir `alert('Integração com Google Calendar em desenvolvimento')` por `connectGoogleCalendar()`
- [ ] Substituir `alert('Modal de configurações em desenvolvimento')` por `openSettingsModal()`
- [ ] Adicionar função `loadAgendaDashboard()` no carregamento da página
- [ ] Adicionar verificação de `?agenda=connected` na URL
- [ ] Criar modal de configurações com formulário
- [ ] Implementar função `saveSettings()`
- [ ] Atualizar UI quando status do Google Calendar mudar

---

## 🎯 URLs das APIs

Base URL: `https://conectaking-api.onrender.com` (ou sua URL de produção)

- `GET /api/agenda/dashboard` - Dashboard completo
- `GET /api/agenda/google-calendar/status` - Status da conexão
- `GET /api/oauth/agenda/google/owner/connect` - Conectar Google Calendar
- `GET /api/agenda/settings` - Obter configurações
- `PUT /api/agenda/settings` - Atualizar configurações
- `PUT /api/agenda/card-settings` - Atualizar apenas configurações do cartão
