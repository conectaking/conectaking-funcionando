# ✅ Correção - Integração Google Calendar

## 🔧 O que foi corrigido:

1. ✅ **APIs criadas** para verificar status e obter dashboard
2. ✅ **Rotas OAuth** já estavam configuradas corretamente
3. ✅ **Redirect URI** corrigido para usar URL do backend

## 📋 APIs Disponíveis para o Frontend:

### 1. Verificar Status do Google Calendar
```
GET /api/agenda/google-calendar/status
Authorization: Bearer TOKEN
```

### 2. Obter Dashboard Completo
```
GET /api/agenda/dashboard
Authorization: Bearer TOKEN
```

### 3. Conectar Google Calendar
```
GET /api/oauth/agenda/google/owner/connect
Authorization: Bearer TOKEN
```

### 4. Obter/Atualizar Configurações
```
GET /api/agenda/settings
PUT /api/agenda/settings
```

## 💻 Código JavaScript para Substituir no Frontend:

### Substituir função "Conectar Google Calendar":
```javascript
// ❌ ANTES (remover):
function connectGoogleCalendar() {
    alert('Integração com Google Calendar em desenvolvimento');
}

// ✅ DEPOIS (usar):
function connectGoogleCalendar() {
    const token = localStorage.getItem('token'); // ou como você armazena
    window.location.href = `/api/oauth/agenda/google/owner/connect?token=${token}`;
    // OU se usar fetch:
    // fetch('/api/oauth/agenda/google/owner/connect', {
    //     headers: { 'Authorization': `Bearer ${token}` }
    // }).then(response => {
    //     if (response.redirected) {
    //         window.location.href = response.url;
    //     }
    // });
}
```

### Substituir função "Configurações":
```javascript
// ❌ ANTES (remover):
function openSettingsModal() {
    alert('Modal de configurações em desenvolvimento');
}

// ✅ DEPOIS (usar):
async function openSettingsModal() {
    try {
        const token = localStorage.getItem('token');
        
        // Buscar configurações
        const response = await fetch('/api/agenda/settings', {
            headers: { 'Authorization': `Bearer ${token}` }
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
        console.error('Erro:', error);
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
            alert('Configurações salvas!');
            document.getElementById('settings-modal').style.display = 'none';
            loadAgendaDashboard(); // Recarregar
        } else {
            alert('Erro: ' + result.error);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao salvar');
    }
}
```

### Carregar Status ao Abrir a Página:
```javascript
async function loadAgendaDashboard() {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch('/api/agenda/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const { settings, googleCalendar, stats } = result.data;
            
            // Atualizar status do Google Calendar
            const statusEl = document.getElementById('google-calendar-status');
            if (googleCalendar.isConnected) {
                statusEl.textContent = `Conectado (${googleCalendar.email})`;
                statusEl.className = 'status-connected';
            } else {
                statusEl.textContent = 'Desconectado';
                statusEl.className = 'status-disconnected';
            }
            
            // Atualizar estatísticas
            document.getElementById('upcoming-count').textContent = stats.upcomingCount;
            document.getElementById('active-slots-count').textContent = stats.activeSlotsCount;
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

// Chamar ao carregar página
window.addEventListener('DOMContentLoaded', () => {
    loadAgendaDashboard();
    
    // Verificar se voltou da conexão OAuth
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('agenda') === 'connected') {
        alert('Google Calendar conectado com sucesso!');
        loadAgendaDashboard();
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});
```

## ⚙️ Variáveis de Ambiente Necessárias:

Certifique-se de ter configurado no `.env`:

```env
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_REDIRECT_URI_OWNER=https://conectaking-api.onrender.com/api/oauth/agenda/google/owner/callback
GOOGLE_REDIRECT_URI_CLIENT=https://conectaking-api.onrender.com/api/oauth/agenda/google/client/callback
FRONTEND_URL=https://conectaking.com.br
BACKEND_URL=https://conectaking-api.onrender.com
```

## 🔗 Configurar no Google Cloud Console:

1. Acesse: https://console.cloud.google.com
2. Vá em "APIs & Services" > "Credentials"
3. Adicione a URL de redirecionamento:
   - `https://conectaking-api.onrender.com/api/oauth/agenda/google/owner/callback`
   - `https://conectaking-api.onrender.com/api/oauth/agenda/google/client/callback`

## ✅ Pronto!

Agora o frontend pode:
- ✅ Verificar status do Google Calendar
- ✅ Conectar Google Calendar (redireciona para OAuth)
- ✅ Abrir modal de configurações
- ✅ Salvar configurações
- ✅ Ver estatísticas da agenda

**Basta substituir as funções no código JavaScript do frontend!**
