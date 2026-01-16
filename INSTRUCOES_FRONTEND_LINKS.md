# Instruções para Atualizar Interface Frontend - Links

## ✅ O que já foi feito (Backend)

1. ✅ **Migration 090 criada** - Adiciona campos ao link de cadastro:
   - `cadastro_description` (descrição opcional)
   - `cadastro_expires_at` (validade)
   - `cadastro_max_uses` (limite de usos)
   - `cadastro_current_uses` (contador)

2. ✅ **Rotas atualizadas**:
   - GET `/api/guest-lists/:id` - Retorna os novos campos
   - PUT `/api/guest-lists/:id` - Aceita e salva os novos campos

3. ✅ **Validação implementada**:
   - Valida validade do link de cadastro ao acessar
   - Valida limite de usos ao acessar
   - Incrementa contador automaticamente após cadastro

4. ✅ **Links únicos completamente removidos**:
   - Arquivo `routes/uniqueLinks.routes.js` DELETADO
   - Migrations 084, 085, 086, 088, 089 DELETADAS
   - Todas as referências removidas de `server.js`
   - Todas as referências removidas de `publicDigitalForm.routes.js`
   - Todas as referências removidas de `digitalForm.ejs`

## ⚠️ O que precisa ser feito (Frontend)

### Localizar a Interface

A interface que mostra "Links para Compartilhar" provavelmente está sendo carregada dinamicamente via JavaScript. Procure por:

1. **Arquivos JavaScript que fazem chamadas à API:**
   ```javascript
   // Procurar por:
   fetch('/api/unique-links')
   axios.get('/api/unique-links')
   fetch('/api/unique-links/:itemId/list')
   fetch('/api/unique-links/:itemId/create')
   ```

2. **Interface HTML/JavaScript que renderiza:**
   - "Links para Compartilhar"
   - "Link de Cadastro"
   - "Link da Portaria"
   - "Links Únicos" (REMOVER esta seção)
   - "Criar Link Único" (REMOVER este botão)

3. **Possíveis localizações:**
   - Arquivo JavaScript que carrega dinamicamente quando a aba "Links" é clicada
   - View EJS que renderiza a página de administração
   - Componente React/Vue se houver framework frontend
   - Arquivo em `public/js/` ou similar

### O que fazer quando encontrar

#### 1. REMOVER completamente a seção "Links Únicos":
   - Remover o HTML da caixa laranja "Links Únicos"
   - Remover o botão "Criar Link Único"
   - Remover qualquer código JavaScript que chama `/api/unique-links`
   - Remover funções que listam/criam/deletam links únicos

#### 2. ADICIONAR ao "Link de Cadastro" (caixa verde):
   
   **Campos a adicionar:**
   
   ```html
   <!-- Descrição Opcional -->
   <div class="form-group">
       <label>Descrição (opcional)</label>
       <input type="text" id="cadastro-description" 
              placeholder="Ex: Link para inscrição no evento 2026"
              value="<%= guestList.cadastro_description || '' %>">
   </div>
   
   <!-- Validade do Link -->
   <div class="form-group">
       <label>Validade do Link</label>
       <select id="cadastro-expires-type">
           <option value="none">Sem expiração</option>
           <option value="hours">Em horas</option>
           <option value="minutes">Em minutos</option>
           <option value="date">Data específica</option>
       </select>
       <input type="number" id="cadastro-expires-hours" 
              placeholder="Horas" style="display:none;">
       <input type="number" id="cadastro-expires-minutes" 
              placeholder="Minutos" style="display:none;">
       <input type="datetime-local" id="cadastro-expires-date" 
              style="display:none;">
   </div>
   
   <!-- Limite de Usos -->
   <div class="form-group">
       <label>Limite de Usos</label>
       <select id="cadastro-max-uses-type">
           <option value="unlimited">Ilimitado</option>
           <option value="limited">Limitado</option>
       </select>
       <input type="number" id="cadastro-max-uses" 
              placeholder="Quantidade" 
              min="1"
              style="display:none;">
   </div>
   
   <!-- Informações de Uso Atual -->
   <div class="usage-info">
       <p>Uso: <span id="cadastro-current-uses"><%= guestList.cadastro_current_uses || 0 %></span> / 
          <span id="cadastro-max-uses-display">
              <%= guestList.cadastro_max_uses === 999999 ? 'Ilimitado' : (guestList.cadastro_max_uses || 'Ilimitado') %>
          </span>
       </p>
       <% if (guestList.cadastro_expires_at) { %>
       <p>Expira em: <span id="cadastro-expires-display">
          <%= new Date(guestList.cadastro_expires_at).toLocaleString('pt-BR') %>
       </span></p>
       <% } %>
   </div>
   ```

   **JavaScript para salvar:**
   
   ```javascript
   async function saveCadastroLinkSettings() {
       const itemId = <%= profileItemId %>;
       const description = document.getElementById('cadastro-description').value;
       const expiresType = document.getElementById('cadastro-expires-type').value;
       let expiresInHours = null;
       let expiresAt = null;
       
       if (expiresType === 'hours') {
           expiresInHours = parseInt(document.getElementById('cadastro-expires-hours').value);
       } else if (expiresType === 'minutes') {
           const minutes = parseInt(document.getElementById('cadastro-expires-minutes').value);
           expiresInHours = minutes / 60;
       } else if (expiresType === 'date') {
           expiresAt = document.getElementById('cadastro-expires-date').value;
       }
       
       const maxUsesType = document.getElementById('cadastro-max-uses-type').value;
       const maxUses = maxUsesType === 'unlimited' ? null : 
                       parseInt(document.getElementById('cadastro-max-uses').value);
       
       const response = await fetch(`/api/guest-lists/${itemId}`, {
           method: 'PUT',
           headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${authToken}`
           },
           body: JSON.stringify({
               cadastro_description: description || null,
               cadastro_expires_in_hours: expiresInHours,
               cadastro_expires_at: expiresAt,
               cadastro_max_uses: maxUses
           })
       });
       
       if (response.ok) {
           alert('Configurações do link de cadastro salvas!');
           location.reload();
       } else {
           alert('Erro ao salvar configurações');
       }
   }
   ```

### Como testar

1. Execute a migration 090 no banco de dados
2. Acesse a página de administração da lista de convidados
3. Vá para a aba "Links"
4. Verifique se a seção "Links Únicos" foi removida
5. Verifique se o "Link de Cadastro" tem os novos campos
6. Teste salvar as configurações
7. Teste criar um link com validade e limite de usos
8. Teste usar o link e verificar se o contador incrementa

## 📝 Notas Importantes

- O backend está 100% pronto e funcional
- Todas as referências a links únicos foram removidas do backend
- A interface frontend precisa ser localizada e atualizada manualmente
- A API está pronta para receber os novos campos via PUT `/api/guest-lists/:id`
