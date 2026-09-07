/**
 * Dashboard King Forms (editor de perguntas / convidados) — módulo isolado (Conecta King).
 * Gerado por scripts/improve-dashboard-final.js
 */
(function (global) {
    'use strict';

    function core() { return global.DashboardCore || {}; }

    var env = {
        get API_URL() {
            var c = core();
            if (typeof c.getApiUrl === 'function') return c.getApiUrl() || '';
            return global.API_URL || global.API_BASE || '';
        },
        get HEADERS() {
            var c = core();
            if (typeof c.getHeaders === 'function') return c.getHeaders() || {};
            return { 'Content-Type': 'application/json' };
        },
        get HEADERS_AUTH() {
            var c = core();
            if (typeof c.getHeadersAuth === 'function') return c.getHeadersAuth() || {};
            return {};
        },
        safeFetch: function (url, options) {
            var c = core();
            if (typeof c.safeFetch === 'function') return c.safeFetch(url, options);
            return fetch(url, options);
        }
    };

// FUNÇÕES DO FORMULÁRIO KING - EDITOR DE PERGUNTAS
// ============================================

// Renderizar perguntas do formulário (tornar acessível globalmente)
window.renderFormQuestions = function renderFormQuestions(itemId, formFields) {
    const container = document.getElementById(`form-questions-container-${itemId}`);
    if (!container) return;

    if (!formFields || formFields.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-dark, #A1A1A1);">
                <i class="fas fa-question-circle" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                <p>Nenhuma pergunta adicionada ainda.</p>
                <p style="font-size: 0.9rem; margin-top: 10px;">Clique em "Adicionar Pergunta" para começar.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = formFields.map((field, index) => {
        const fieldTypes = {
            'short_text': 'Resposta Curta',
            'paragraph': 'Parágrafo',
            'multiple_choice': 'Escolha Múltipla',
            'checkbox': 'Caixa de Verificação',
            'dropdown': 'Lista Suspensa',
            'file_upload': 'Carregar Ficheiro',
            'linear_scale': 'Escala Linear',
            'rating': 'Classificação',
            'multiple_choice_grid': 'Grelha de Escolhas Múltiplas',
            'checkbox_grid': 'Grelha de Caixa de Verificação',
            'date': 'Data',
            'time': 'Hora',
            'datetime': 'Data e Hora',
            'yes_no': 'Sim/Não'
        };

        return `
            <div class="form-question-item" data-question-index="${index}" style="margin-bottom: 20px; padding: 20px; background: var(--card-background-color, #1C1C21); border-radius: 8px; border: 1px solid var(--border-color, #2C2C2F);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div>
                        <strong style="color: var(--text, #ECECEC);">${field.label || 'Pergunta sem título'}</strong>
                        <span style="margin-left: 10px; font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">(${fieldTypes[field.type] || field.type})</span>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button type="button" class="edit-question-btn" data-index="${index}" style="padding: 5px 10px; background: var(--dourado-principal, #FFC700); color: #000; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="delete-question-btn" data-index="${index}" style="padding: 5px 10px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${field.required ? '<span style="color: #ff4444; font-size: 0.85rem;">* Obrigatório</span>' : ''}
            </div>
        `;
    }).join('');

    // Adicionar event listeners
    container.querySelectorAll('.edit-question-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            editQuestion(itemId, index, formFields[index]);
        });
    });

    container.querySelectorAll('.delete-question-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            deleteQuestion(itemId, index);
        });
    });
}

// Adicionar nova pergunta
function addQuestion(itemId) {
    const fieldTypes = [
        { value: 'short_text', label: 'Resposta Curta' },
        { value: 'paragraph', label: 'Parágrafo' },
        { value: 'multiple_choice', label: 'Escolha Múltipla' },
        { value: 'checkbox', label: 'Caixa de Verificação' },
        { value: 'dropdown', label: 'Lista Suspensa' },
        { value: 'file_upload', label: 'Carregar Ficheiro' },
        { value: 'linear_scale', label: 'Escala Linear' },
        { value: 'rating', label: 'Classificação' },
        { value: 'multiple_choice_grid', label: 'Grelha de Escolhas Múltiplas' },
        { value: 'checkbox_grid', label: 'Grelha de Caixa de Verificação' },
        { value: 'date', label: 'Data' },
        { value: 'time', label: 'Hora' },
        { value: 'datetime', label: 'Data e Hora' },
        { value: 'yes_no', label: 'Sim/Não' }
    ];

    const modal = document.createElement('div');
    modal.className = 'question-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    modal.innerHTML = `
        <div style="background: var(--card-background-color, #1C1C21); padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;">
            <h3 style="margin-bottom: 20px; color: var(--text, #ECECEC);">Adicionar Pergunta</h3>
            <div class="input-group" style="margin-bottom: 15px;">
                <label>Tipo de Campo</label>
                <select id="new-question-type" style="width: 100%; padding: 10px; border-radius: 8px; background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC);">
                    ${fieldTypes.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
                </select>
            </div>
            <div class="input-group" style="margin-bottom: 15px;">
                <label>Pergunta/Label</label>
                <input type="text" id="new-question-label" placeholder="Digite a pergunta..." style="width: 100%; padding: 10px; border-radius: 8px; background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC);">
            </div>
            <div class="input-group" style="margin-bottom: 15px;">
                <label>
                    <input type="checkbox" id="new-question-required"> Obrigatório
                </label>
            </div>
            <div id="new-question-options-container" style="display: none; margin-bottom: 15px;">
                <label>Opções (uma por linha)</label>
                <textarea id="new-question-options" rows="5" placeholder="Opção 1&#10;Opção 2&#10;Opção 3" style="width: 100%; padding: 10px; border-radius: 8px; background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); color: var(--text, #ECECEC);"></textarea>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button type="button" class="cancel-question-btn" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 8px; cursor: pointer;">Cancelar</button>
                <button type="button" class="save-question-btn" style="padding: 10px 20px; background: var(--dourado-principal, #FFC700); color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Salvar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Mostrar/esconder opções baseado no tipo
    const typeSelect = modal.querySelector('#new-question-type');
    const optionsContainer = modal.querySelector('#new-question-options-container');
    const needsOptions = ['multiple_choice', 'checkbox', 'dropdown', 'multiple_choice_grid', 'checkbox_grid'];

    typeSelect.addEventListener('change', () => {
        optionsContainer.style.display = needsOptions.includes(typeSelect.value) ? 'block' : 'none';
    });

    // Salvar pergunta
    modal.querySelector('.save-question-btn').addEventListener('click', () => {
        const type = typeSelect.value;
        const label = modal.querySelector('#new-question-label').value.trim();
        const required = modal.querySelector('#new-question-required').checked;
        const optionsText = modal.querySelector('#new-question-options').value.trim();

        if (!label) {
            alert('Por favor, digite a pergunta.');
            return;
        }

        const newField = {
            type: type,
            label: label,
            required: required,
            id: 'field_' + Date.now()
        };

        if (needsOptions.includes(type) && optionsText) {
            newField.options = optionsText.split('\n').filter(o => o.trim()).map(o => o.trim());
        }

        // Adicionar ao array de campos
        const fieldsInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-digital-form-fields`);
        let fields = [];
        if (fieldsInput && fieldsInput.value) {
            try {
                fields = JSON.parse(fieldsInput.value);
            } catch (e) {
                fields = [];
            }
        }
        fields.push(newField);
        fieldsInput.value = JSON.stringify(fields);

        // Re-renderizar
        renderFormQuestions(itemId, fields);

        // Fechar modal
        document.body.removeChild(modal);
    });

    // Cancelar
    modal.querySelector('.cancel-question-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Editar pergunta
function editQuestion(itemId, index, field) {
    // Similar ao addQuestion, mas preenchendo os campos
    console.log('Editar pergunta:', index, field);
    // Implementação similar ao addQuestion, mas com dados pré-preenchidos
}

// Deletar pergunta
function deleteQuestion(itemId, index) {
    if (!confirm('Tem certeza que deseja remover esta pergunta?')) return;

    const fieldsInput = document.querySelector(`#edit-item-modal[data-editing-id="${itemId}"] #edit-digital-form-fields`);
    let fields = [];
    if (fieldsInput && fieldsInput.value) {
        try {
            fields = JSON.parse(fieldsInput.value);
        } catch (e) {
            fields = [];
        }
    }

    fields.splice(index, 1);
    fieldsInput.value = JSON.stringify(fields);
    renderFormQuestions(itemId, fields);
}

// Carregar respostas do formulário (tornar acessível globalmente)
window.loadFormResponses = async function loadFormResponses(itemId) {
    const dashboard = document.getElementById(`form-responses-dashboard-${itemId}`);
    if (!dashboard) return;

    try {
        env.HEADERS = getHeaders();
        const response = await fetch(`${env.API_URL}/api/profile/digital-forms/${itemId}/responses`, {
            headers: env.HEADERS
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar respostas');
        }

        const data = await response.json();

        if (!data.success || !data.responses || data.responses.length === 0) {
            dashboard.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-dark, #A1A1A1);">
                    <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                    <p>Nenhuma resposta ainda.</p>
                </div>
            `;
            return;
        }

        const stats = data.statistics || {};
        dashboard.innerHTML = `
            <div style="margin-bottom: 30px;">
                <h3 style="color: var(--text, #ECECEC); margin-bottom: 20px;">Estatísticas</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">
                    <div style="padding: 20px; background: var(--card-background-color, #1C1C21); border-radius: 8px; border: 1px solid var(--border-color, #2C2C2F);">
                        <div style="font-size: 2rem; font-weight: 600; color: var(--dourado-principal, #FFC700);">${stats.total_responses || 0}</div>
                        <div style="color: var(--text-dark, #A1A1A1); margin-top: 5px;">Total de Respostas</div>
                    </div>
                    <div style="padding: 20px; background: var(--card-background-color, #1C1C21); border-radius: 8px; border: 1px solid var(--border-color, #2C2C2F);">
                        <div style="font-size: 2rem; font-weight: 600; color: var(--dourado-principal, #FFC700);">${stats.unique_responders || 0}</div>
                        <div style="color: var(--text-dark, #A1A1A1); margin-top: 5px;">Respondentes nicos</div>
                    </div>
                </div>
            </div>
            <div>
                <h3 style="color: var(--text, #ECECEC); margin-bottom: 20px;">Respostas Recebidas</h3>
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    ${data.responses.map((resp, idx) => {
            const responseData = typeof resp.response_data === 'string' ? JSON.parse(resp.response_data) : resp.response_data;
            return `
                            <div style="padding: 20px; background: var(--card-background-color, #1C1C21); border-radius: 8px; border: 1px solid var(--border-color, #2C2C2F);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                    <strong style="color: var(--text, #ECECEC);">Resposta #${idx + 1}</strong>
                                    <span style="font-size: 0.85rem; color: var(--text-dark, #A1A1A1);">${new Date(resp.submitted_at).toLocaleString('pt-BR')}</span>
                                </div>
                                ${resp.responder_name ? `<div style="margin-bottom: 5px;"><strong>Nome:</strong> ${resp.responder_name}</div>` : ''}
                                ${resp.responder_phone ? `<div style="margin-bottom: 5px;"><strong>Telefone:</strong> ${resp.responder_phone}</div>` : ''}
                                ${resp.responder_email ? `<div style="margin-bottom: 5px;"><strong>Email:</strong> ${resp.responder_email}</div>` : ''}
                                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color, #2C2C2F);">
                                    <strong style="color: var(--text, #ECECEC); display: block; margin-bottom: 10px;">Respostas:</strong>
                                    ${Object.entries(responseData).map(([key, value]) => `
                                        <div style="margin-bottom: 8px;">
                                            <strong style="color: var(--text-dark, #A1A1A1);">${key}:</strong>
                                            <span style="color: var(--text, #ECECEC); margin-left: 10px;">${Array.isArray(value) ? value.join(', ') : value}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Erro ao carregar respostas:', error);
        dashboard.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ff4444;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 15px;"></i>
                <p>Erro ao carregar respostas: ${error.message}</p>
            </div>
        `;
    }
}

// Event listener para botão "Adicionar Pergunta"
document.addEventListener('click', (e) => {
    if (e.target.closest('.add-question-btn')) {
        const btn = e.target.closest('.add-question-btn');
        const itemId = btn.dataset.itemId;
        if (itemId) {
            addQuestion(parseInt(itemId));
        }
    }

    // Event listener para botão "Abrir Página de Edição" do Formulário King
    if (e.target.closest('.btn-edit-form-page')) {
        const btn = e.target.closest('.btn-edit-form-page');
        const itemId = btn.dataset.itemId || btn.dataset.id;

        console.log('[DASHBOARD] Botão "Abrir Página de Edição Completa" clicado:', {
            itemId,
            dataset: btn.dataset
        });

        if (itemId) {
            console.log('[DASHBOARD] Redirecionando para formPageEdit.html com itemId:', itemId);
            window.location.href = `formPageEdit.html?itemId=${itemId}`;
        } else {
            console.error('[DASHBOARD] itemId não encontrado no botão btn-edit-form-page');
            alert('Erro: ID do formulário não encontrado. Por favor, recarregue a página e tente novamente.');
        }
    }
});

// === FUNÇÕES PARA LISTA DE CONVIDADOS ===

// Carregar todas as listas de convidados
async function loadGuestLists() {
    const container = document.getElementById('guest-lists-container');
    const statsContainer = document.getElementById('guest-list-stats');

    if (!container) return;

    try {
        const response = await env.safeFetch(`${env.API_URL}/api/guest-lists`, {
            method: 'GET',
            headers: env.HEADERS_AUTH
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar listas de convidados');
        }

        const lists = await response.json();

        // Mapear os dados da API para o formato esperado
        const listsWithStats = lists.map(list => {
            // A API já retorna registered_count, confirmed_count, checked_in_count
            // pi.* retorna o id da profile_items como 'id'
            // gli.* retorna o id da guest_list_items e profile_item_id
            const total = parseInt(list.registered_count || 0) + parseInt(list.confirmed_count || 0) + parseInt(list.checked_in_count || 0);
            list.stats = {
                total: total,
                registered: parseInt(list.registered_count || 0),
                confirmed: parseInt(list.confirmed_count || 0),
                checked_in: parseInt(list.checked_in_count || 0)
            };
            // O 'id' de pi.* é o profile_item_id que precisamos para editar
            // profile_item_id é da tabela guest_list_items (referência para profile_items)
            list.profile_item_id = list.id; // pi.id é o profile_item_id
            return list;
        });

        // Calcular estatísticas gerais
        const generalStats = listsWithStats.reduce((acc, list) => {
            const stats = list.stats || { total: 0, registered: 0, confirmed: 0, checked_in: 0 };
            acc.total += stats.total || 0;
            acc.registered += stats.registered || 0;
            acc.confirmed += stats.confirmed || 0;
            acc.checked_in += stats.checked_in || 0;
            return acc;
        }, { total: 0, registered: 0, confirmed: 0, checked_in: 0 });

        // Renderizar estatísticas gerais
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-card" style="background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; padding: 20px; text-align: center;">
                    <div class="stat-value" style="font-size: 32px; font-weight: 800; color: var(--dourado-principal, #FFC700); margin: 8px 0;">${lists.length}</div>
                    <div class="stat-label" style="color: var(--text-dark, #A1A1A1); font-size: 14px;">Listas Criadas</div>
                </div>
                <div class="stat-card" style="background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; padding: 20px; text-align: center;">
                    <div class="stat-value" style="font-size: 32px; font-weight: 800; color: var(--dourado-principal, #FFC700); margin: 8px 0;">${generalStats.total}</div>
                    <div class="stat-label" style="color: var(--text-dark, #A1A1A1); font-size: 14px;">Total de Convidados</div>
                </div>
                <div class="stat-card" style="background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; padding: 20px; text-align: center;">
                    <div class="stat-value" style="font-size: 32px; font-weight: 800; color: #4CAF50; margin: 8px 0;">${generalStats.confirmed}</div>
                    <div class="stat-label" style="color: var(--text-dark, #A1A1A1); font-size: 14px;">Confirmados</div>
                </div>
                <div class="stat-card" style="background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; padding: 20px; text-align: center;">
                    <div class="stat-value" style="font-size: 32px; font-weight: 800; color: #2196F3; margin: 8px 0;">${generalStats.checked_in}</div>
                    <div class="stat-label" style="color: var(--text-dark, #A1A1A1); font-size: 14px;">Conferidos</div>
                </div>
            `;
        }

        // Renderizar listas
        if (listsWithStats.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--text-dark, #A1A1A1);">
                    <i class="fas fa-users" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 16px; margin-bottom: 8px;">Nenhuma lista de convidados criada ainda</p>
                    <p style="font-size: 14px; opacity: 0.7;">Clique em "Nova Lista" para começar</p>
                </div>
            `;
            return;
        }

        container.innerHTML = listsWithStats.map(list => {
            const stats = list.stats || { total: 0, registered: 0, confirmed: 0, checked_in: 0 };
            const eventDate = list.event_date ? new Date(list.event_date).toLocaleDateString('pt-BR') : 'Não definido';

            return `
                <div class="module-item" data-id="${list.profile_item_id || list.id}" data-item-type="guest_list" style="background: var(--card-background-color, #1C1C21); border: 1px solid var(--border-color, #2C2C2F); border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                        <div style="flex: 1;">
                            <h4 style="color: var(--text, #ECECEC); margin: 0 0 8px 0; font-size: 18px;">
                                <i class="fas fa-users" style="color: var(--dourado-principal, #FFC700); margin-right: 8px;"></i>
                                ${list.event_title || list.title || 'Lista de Convidados'}
                            </h4>
                            <p style="color: var(--text-dark, #A1A1A1); margin: 0; font-size: 14px;">
                                <i class="fas fa-calendar" style="margin-right: 6px;"></i>
                                ${eventDate}
                            </p>
                            ${list.event_location ? `
                                <p style="color: var(--text-dark, #A1A1A1); margin: 4px 0 0 0; font-size: 14px;">
                                    <i class="fas fa-map-marker-alt" style="margin-right: 6px;"></i>
                                    ${list.event_location}
                                </p>
                            ` : ''}
                        </div>
                        <button class="btn-icon" onclick="openGuestListEditor(${list.profile_item_id || list.id})" style="background: var(--dourado-principal, #FFC700); color: #000; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-edit"></i> Gerenciar
                        </button>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color, #2C2C2F);">
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: 800; color: var(--dourado-principal, #FFC700);">${stats.total}</div>
                            <div style="font-size: 12px; color: var(--text-dark, #A1A1A1);">Total</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: 800; color: #4CAF50;">${stats.confirmed}</div>
                            <div style="font-size: 12px; color: var(--text-dark, #A1A1A1);">Confirmados</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: 800; color: #2196F3;">${stats.checked_in}</div>
                            <div style="font-size: 12px; color: var(--text-dark, #A1A1A1);">Conferidos</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: 800; color: #FF9800;">${stats.registered - stats.confirmed}</div>
                            <div style="font-size: 12px; color: var(--text-dark, #A1A1A1);">Pendentes</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao carregar listas de convidados:', error);
        if (container) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--text-dark, #A1A1A1);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; color: #FF9800;"></i>
                    <p style="font-size: 16px; margin-bottom: 8px;">Erro ao carregar listas de convidados</p>
                    <p style="font-size: 14px; opacity: 0.7;">Tente recarregar a página</p>
                </div>
            `;
        }
    }
}

// Abrir editor de lista de convidados
function openGuestListEditor(profileItemId) {
    // O profileItemId é o ID da profile_items, que é o que precisamos para a página de edição
    window.location.href = `guestListEdit.html?itemId=${profileItemId}`;
}

// Listener para botão "Nova Lista"
const addGuestListBtn = document.getElementById('add-guest-list-btn');
if (addGuestListBtn) {
    addGuestListBtn.addEventListener('click', async () => {
        // Abrir modal de adicionar item e selecionar "Lista de Convidados"
        SELECTORS.addItemModal.classList.add('active');
        await filterModulesByPlan();

        // Scroll para o card de Lista de Convidados
        setTimeout(() => {
            const guestListCard = document.querySelector('[data-item-type="guest_list"]');
            if (guestListCard) {
                guestListCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                guestListCard.style.border = '2px solid var(--dourado-principal, #FFC700)';
                setTimeout(() => {
                    guestListCard.style.border = '';
                }, 2000);
            }
        }, 300);
    });
}

// ============================================


    var DashboardFormsEditor = {
        renderFormQuestions: typeof renderFormQuestions === 'function' ? renderFormQuestions : null,
        addQuestion: typeof addQuestion === 'function' ? addQuestion : null,
        loadGuestLists: typeof loadGuestLists === 'function' ? loadGuestLists : null,
        openGuestListEditor: typeof openGuestListEditor === 'function' ? openGuestListEditor : null
    };
    global.DashboardFormsEditor = DashboardFormsEditor;
    // already assigned window.renderFormQuestions / loadFormResponses in body

})(typeof window !== 'undefined' ? window : this);
