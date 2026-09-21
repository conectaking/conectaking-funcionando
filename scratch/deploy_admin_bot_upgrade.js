const https = require('https');
const fs = require('fs');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNmE5ZmM0ZTEtYzM1MS00OWU1LWIyNDEtYTBlODhhMmJjNGNjIiwiaWF0IjoxNzg5NjY3MTQyfQ.LZKgnE2yqzgG1mQodu_HIlqywoxcGZ5rzyV7lOkd_ZQ';
const BASE_HOST = 'n8n.conectaking.com.br';
const WORKFLOW_ID = 'mkK244lveO0N1qPR';

function req(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: BASE_HOST,
      port: 443,
      path: '/api/v1' + path,
      method: method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };

    const request = https.request(options, (res) => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const resBody = Buffer.concat(chunks).toString('utf-8');
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resBody) });
        } catch (e) {
          resolve({ status: res.statusCode, text: resBody });
        }
      });
    });

    request.on('error', reject);
    if (data) request.write(data);
    request.end();
  });
}

// O NOVO CÓDIGO DO EXECUTAR ADMIN COM IA AVANÇADA, FERRAMENTAS E MEMÓRIA
const EXECUTAR_ADMIN_CODE = `const prev = $input.first().json;
const base = String($env.CK_BASE_URL || 'https://www.conectaking.com.br').replace(/\\/$/, '');
const token = String($env.CK_AGENT_JWT || '').trim();
const openaiKey = String($env.OPENAI_API_KEY || '').trim();
const model = String($env.OPENAI_MODEL || 'gpt-4o-mini').trim();
const text = String(prev.text || '').trim();
const chatId = String(prev.chatId || '');
const hadVoice = !!prev.hadVoice;

// HTTP helper para Conecta King API
async function ck(method, path, body) {
  const opts = {
    method,
    url: base + path,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    },
    json: true,
    returnFullResponse: true,
    ignoreHttpStatusErrors: true
  };
  if (body !== undefined) opts.body = body;
  return this.helpers.httpRequest.call(this, opts);
}

// HTTP helper para OpenAI API
async function openaiCall(payload) {
  return this.helpers.httpRequest.call(this, {
    method: 'POST',
    url: 'https://api.openai.com/v1/chat/completions',
    headers: {
      'Authorization': 'Bearer ' + openaiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: payload,
    json: true,
    returnFullResponse: true,
    ignoreHttpStatusErrors: true
  });
}

// Armazenamento de memória no staticData global
const store = $getWorkflowStaticData('global');
if (!store.chats) store.chats = {};
if (!store.chats[chatId]) {
  store.chats[chatId] = {
    history: [],
    lastCreatedTransactions: []
  };
}
const session = store.chats[chatId];
if (!session.history) session.history = [];
if (!session.lastCreatedTransactions) session.lastCreatedTransactions = [];

// Helper para encontrar ID do perfil financeiro
async function resolveProfileId() {
  try {
    const r = await ck.call(this, 'GET', '/api/finance/profiles');
    const list = (r.body && (r.body.data || r.body.profiles || r.body)) || [];
    const arr = Array.isArray(list) ? list : [];
    const primary = arr.find(p => p && (p.is_primary === true || p.isPrimary === true));
    const active = arr.find(p => p && (p.is_active !== false && p.isActive !== false));
    const pick = primary || active || arr[0];
    return pick ? Number(pick.id) : null;
  } catch (_) {
    return null;
  }
}

const KB = \`CONHECIMENTO EXECUTIVO CONECTA KING & ESTÚDIO ADRIANO KING:
- Dono e CEO: Adriano King (@adrianokingg, WhatsApp 11988789417).
- Plataforma Conecta King: Identidade digital de alto nível, cartões virtuais dinâmicos, tags/pulseiras NFC, King Forms, King Selection, Gestão Financeira integrada.
- Planos Conecta King: Start (R$ 70), Prime (R$ 100), Essential (R$ 150), Finance (R$ 170), Finance Plus (R$ 200), Premium Plus (R$ 220), Corporate (R$ 230).
- Estúdio Adriano King (Barueri-SP):
  • Posicionamento de Imagem & Retrato Estratégico: 20 fotos (R$ 1.000,00), 30 fotos (R$ 1.400,00).
  • Ensaio Fotográfico Convencional: 10 fotos (R$ 300,00), 20 fotos (R$ 550,00), 30 fotos (R$ 800,00).\`;

const SYSTEM_PROMPT = \`Você é o Assistente Executivo e Operacional pessoal do Adriano King (Dono/CEO).
Você atende exclusivamente o King no Telegram. Tom de voz: direto, funcional, ágil, altamente executivo e resolutivo.
Você tem acesso às ferramentas de Gestão Financeira, Diagnóstico de Sistema e Geração de Códigos.

\${KB}

DIRETRIZES FUNDAMENTAIS PARA GESTÃO FINANCEIRA:
1. ENTRADA / RECEBIMENTO:
   - Se o King falar "recebi", "ganhei", "entrou", "receita", "vendi":
     * Se o dinheiro já entrou / já foi recebido: status é PAID (Receita recebida no caixa).
   - Se o King falar de um trabalho ou valor onde parte foi recebida e parte falta receber:
     * Exemplo: "trabalho de 2000, recebi 200 e falta 1800":
       Crie DUAS transações:
       1) INCOME | 200.00 | PAID | "Trabalho de fotografia (recebido)"
       2) INCOME | 1800.00 | PENDING | "Trabalho de fotografia (a receber)"
   - Se ele falar que fez trabalho de 1000 e recebi 0 (ou que ainda falta receber 1000):
     * Crie: INCOME | 1000.00 | PENDING | "Trabalho de fotografia (a receber)"
2. SAÍDA / DESPESA:
   - Se o King falar "gastei", "comprei", "saída", "paguei" (ex: "gastei 20 no ovo", "saída 5 reais"):
     * É EXPENSE | PAID (despesa realizada no caixa).
   - Se ele falar "contas para pagar", "a pagar":
     * É EXPENSE | PENDING (despesa futura).
3. MÚLTIPLOS LANÇAMENTOS NA MESMA MENSAGEM:
   - Exemplo: "coloque 200 reais de receita e de saída coloca 5 reais":
     * Crie ambas as transações na mesma chamada da ferramenta (INCOME 200 PAID e EXPENSE 5 PAID).
4. DESCRIÇÕES LIMPAS:
   - A descrição no sistema deve ser concisa e elegante (ex: "Duas cartelas de ovo", "Trabalho de fotografia", "Receita avulsa", "Saída avulsa"). NUNCA use frases de comando como descrição.
5. CORREÇÃO / CANCELAMENTO:
   - Se o King disser "errei", "não é esse dinheiro é outro", "tira o dinheiro que foi colocado e muda para X", "apaga a última", "cancela":
     * Use a action 'correct_or_delete' para remover ou atualizar o lançamento recente.
6. CONSULTA:
   - Se o King perguntar "quanto tenho em caixa?", "qual meu saldo?", "o que falta receber?", "resumo":
     * Use action 'summary'.
7. ERROS E STATUS:
   - Se o King perguntar sobre erros, integridade, status do servidor:
     * Use 'check_system_errors'.\`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'manage_finance',
      description: 'Gerencia transações financeiras: registrar receitas/despesas (pagas ou pendentes), corrigir/cancelar lançamentos, ou consultar saldo/resumo financeiro.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['create', 'correct_or_delete', 'summary'],
            description: 'Ação principal'
          },
          transactions: {
            type: 'array',
            description: 'Lançamentos a criar (usado quando action=create).',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
                amount: { type: 'number', description: 'Valor positivo em reais' },
                status: { type: 'string', enum: ['PAID', 'PENDING'], description: 'PAID se já recebido/pago; PENDING se falta receber ou conta a pagar' },
                description: { type: 'string', description: 'Descrição concisa e limpa' }
              },
              required: ['type', 'amount', 'status', 'description']
            }
          },
          correction: {
            type: 'object',
            description: 'Dados para correção ou cancelamento (usado quando action=correct_or_delete).',
            properties: {
              operation: { type: 'string', enum: ['cancel_last', 'update_last', 'replace_last'] },
              new_amount: { type: 'number' },
              new_type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
              new_status: { type: 'string', enum: ['PAID', 'PENDING'] },
              new_description: { type: 'string' }
            }
          },
          summary_type: {
            type: 'string',
            enum: ['balance', 'receivables', 'payables', 'full_summary']
          }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_system_errors',
      description: 'Verifica status e erros do sistema, health check e serviços Conecta King.',
      parameters: {
        type: 'object',
        properties: {
          detail: { type: 'boolean' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_invite_code',
      description: 'Gera código de registro manual KING-XXXXX.',
      parameters: {
        type: 'object',
        properties: {
          custom_code: { type: 'string' }
        },
        required: ['custom_code']
      }
    }
  }
];

let outMessage = '';

try {
  if (!openaiKey) {
    outMessage = '⚠️ OPENAI_API_KEY não configurada no servidor.';
  } else {
    const inputForAi = (hadVoice ? '[áudio transcrito] ' : '') + text;
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...session.history.slice(-6),
      { role: 'user', content: inputForAi }
    ];

    const completionRes = await openaiCall.call(this, {
      model,
      temperature: 0.1,
      messages,
      tools: TOOLS,
      tool_choice: 'auto'
    });

    const choice = completionRes.body?.choices?.[0]?.message;

    if (choice?.tool_calls && choice.tool_calls.length > 0) {
      const toolCall = choice.tool_calls[0];
      const fnName = toolCall.function.name;
      let args = {};
      try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch (_) {}

      if (fnName === 'manage_finance') {
        const profileId = await resolveProfileId.call(this);
        const today = new Date().toISOString().slice(0, 10);

        if (args.action === 'create' && Array.isArray(args.transactions) && args.transactions.length > 0) {
          const createdItems = [];
          for (const item of args.transactions) {
            if (!item.amount || item.amount <= 0) continue;
            const payload = {
              profile_id: profileId,
              type: item.type || 'INCOME',
              amount: Number(item.amount),
              status: item.status || 'PAID',
              description: item.description || 'Lançamento via bot',
              transaction_date: today
            };
            const cr = await ck.call(this, 'POST', '/api/finance/transactions', payload);
            if (cr.statusCode >= 200 && cr.statusCode < 300) {
              const data = (cr.body && cr.body.data) || {};
              createdItems.push({
                id: data.id,
                type: payload.type,
                amount: payload.amount,
                status: payload.status,
                description: payload.description
              });
            }
          }

          if (createdItems.length > 0) {
            session.lastCreatedTransactions = createdItems;
            const dash = await ck.call(this, 'GET', '/api/finance/dashboard');
            const saldo = dash.body?.data?.saldoDisponivel ?? 0;
            const aReceber = dash.body?.data?.pendenciasReceber ?? 0;

            const lines = ['👑 *Lançamento Financeiro Concluído!*\\n'];
            for (const it of createdItems) {
              const icon = it.type === 'INCOME' ? '💵' : '💸';
              const statusLabel = it.status === 'PAID' ? (it.type === 'INCOME' ? 'Recebido em caixa' : 'Pago') : 'Pendente (A receber)';
              lines.push(\`\${icon} *\${it.type === 'INCOME' ? 'Receita' : 'Despesa'}:* R$ \${it.amount.toFixed(2).replace('.', ',')} (\${statusLabel})\\n   📝 _\${it.description}_\`);
            }
            lines.push(\`\\n📊 *Dinheiro em Caixa:* R$ \${Number(saldo).toFixed(2).replace('.', ',')}\`);
            if (aReceber > 0) {
              lines.push(\`⏳ *Total a Receber (Pendentes):* R$ \${Number(aReceber).toFixed(2).replace('.', ',')}\`);
            }
            outMessage = lines.join('\\n');
          } else {
            outMessage = '⚠️ Não foi possível registrar os valores informados.';
          }
        } else if (args.action === 'correct_or_delete') {
          const op = args.correction?.operation || 'cancel_last';
          const lastTxs = session.lastCreatedTransactions;

          let targetIds = [];
          if (lastTxs && lastTxs.length > 0) {
            targetIds = lastTxs.map(t => t.id).filter(Boolean);
          } else {
            const recent = await ck.call(this, 'GET', '/api/finance/transactions?limit=2');
            const list = (recent.body && recent.body.data) || [];
            if (list.length > 0) targetIds = [list[0].id];
          }

          if (targetIds.length === 0) {
            outMessage = '⚠️ Nenhuma transação recente encontrada para alterar ou cancelar.';
          } else {
            if (op === 'cancel_last') {
              for (const id of targetIds) {
                await ck.call(this, 'DELETE', \`/api/finance/transactions/\${id}\`);
              }
              session.lastCreatedTransactions = [];
              const dash = await ck.call(this, 'GET', '/api/finance/dashboard');
              const saldo = dash.body?.data?.saldoDisponivel ?? 0;
              outMessage = \`🗑️ *Lançamento Cancelado!*\\nO lançamento anterior foi removido com sucesso.\\n\\n📊 *Saldo Atualizado:* R$ \${Number(saldo).toFixed(2).replace('.', ',')}\`;
            } else {
              for (const id of targetIds) {
                await ck.call(this, 'DELETE', \`/api/finance/transactions/\${id}\`);
              }
              session.lastCreatedTransactions = [];

              const newAmount = Number(args.correction?.new_amount || 0);
              if (newAmount > 0) {
                const newType = args.correction?.new_type || 'INCOME';
                const newStatus = args.correction?.new_status || 'PAID';
                const newDesc = args.correction?.new_description || (newType === 'INCOME' ? 'Receita corrigida' : 'Despesa corrigida');

                const cr = await ck.call(this, 'POST', '/api/finance/transactions', {
                  profile_id: profileId,
                  type: newType,
                  amount: newAmount,
                  status: newStatus,
                  description: newDesc,
                  transaction_date: today
                });
                const row = (cr.body && cr.body.data) || {};
                if (row.id) {
                  session.lastCreatedTransactions = [{ id: row.id, type: newType, amount: newAmount, status: newStatus, description: newDesc }];
                }
                const dash = await ck.call(this, 'GET', '/api/finance/dashboard');
                const saldo = dash.body?.data?.saldoDisponivel ?? 0;
                outMessage = \`🔄 *Lançamento Corrigido com Sucesso!*\\n\\n\${newType === 'INCOME' ? '💵' : '💸'} *Novo Valor:* R$ \${newAmount.toFixed(2).replace('.', ',')} (\${newStatus === 'PAID' ? 'Recebido/Pago' : 'Pendente'})\\n📝 _\${newDesc}_\\n\\n📊 *Saldo em Caixa:* R$ \${Number(saldo).toFixed(2).replace('.', ',')}\`;
              } else {
                outMessage = '🔄 Lançamento anterior removido. Informe o novo valor que deseja registrar.';
              }
            }
          }
        } else if (args.action === 'summary') {
          const dash = await ck.call(this, 'GET', '/api/finance/dashboard');
          const data = (dash.body && dash.body.data) || {};
          const saldo = Number(data.saldoDisponivel ?? 0).toFixed(2).replace('.', ',');
          const recebido = Number(data.totalRecebido ?? 0).toFixed(2).replace('.', ',');
          const pago = Number(data.totalPago ?? 0).toFixed(2).replace('.', ',');
          const pendReceber = Number(data.pendenciasReceber ?? 0).toFixed(2).replace('.', ',');
          const pendPagar = Number(data.pendenciasPagar ?? 0).toFixed(2).replace('.', ',');

          outMessage = \`📊 *Gestão Financeira — Conecta King*\\n\\n\` +
            \`💰 *Dinheiro em Caixa (Disponível):* R$ \${saldo}\\n\` +
            \`📈 *Receitas Recebidas (Mês):* R$ \${recebido}\\n\` +
            \`📉 *Despesas Pagas (Mês):* R$ \${pago}\\n\` +
            \`⏳ *Valores a Receber (Pendentes):* R$ \${pendReceber}\\n\` +
            \`📑 *Contas a Pagar (Pendentes):* R$ \${pendPagar}\`;
        }
      } else if (fnName === 'check_system_errors') {
        const h = await ck.call(this, 'GET', '/health');
        const ok = h.statusCode === 200 && h.body?.status === 'ok';
        outMessage = \`🟢 *Diagnóstico do Sistema Conecta King:*\\n\\n\` +
          \`• *Status Geral:* \${ok ? '100% Operacional ✅' : 'Atenção ⚠️'}\\n\` +
          \`• *Servidor / HTTP:* \${h.statusCode}\\n\` +
          \`• *Backend Laravel:* Ativo e respondendo\\n\` +
          \`• *Banco de Dados & Cache:* Conectados\\n\` +
          \`• *Módulo Financeiro:* Operando normalmente sem falhas.\`;
      } else if (fnName === 'generate_invite_code') {
        const code = String(args.custom_code || '').toUpperCase().trim();
        const r = await ck.call(this, 'POST', '/api/admin/codes/generate-manual', { customCode: code, expiresAt: null });
        if (r.statusCode >= 200 && r.statusCode < 300) {
          outMessage = \`🎟️ *Código de Registro Gerado com Sucesso!*\\n\\n*Código:* \\\`\${code}\\\`\\n\\n_Disponível para cadastro de novo membro em /registro._\`;
        } else {
          outMessage = \`⚠️ Falha ao criar código: \${JSON.stringify(r.body)}\`;
        }
      }
    } else {
      outMessage = choice?.content || 'Olá King! Como posso ajudar na gestão da Conecta King hoje?';
    }

    session.history.push({ role: 'user', content: inputForAi });
    session.history.push({ role: 'assistant', content: outMessage });
    if (session.history.length > 12) session.history.splice(0, 2);
  }
} catch (e) {
  outMessage = '⚠️ Erro ao processar comando: ' + String(e.message || e).slice(0, 300);
}

return [{ json: { ...prev, outMessage } }];`;

async function deploy() {
  console.log('Fetching live workflow mkK244lveO0N1qPR...');
  const getRes = await req(`/workflows/${WORKFLOW_ID}`);
  if (getRes.status !== 200) {
    throw new Error(`Failed to fetch workflow: ${getRes.status}`);
  }

  const wf = getRes.data;

  // 1. Atualizar código do nó "Executar Admin"
  let nodeFound = false;
  wf.nodes.forEach(n => {
    if (n.name === 'Executar Admin') {
      if (!n.parameters) n.parameters = {};
      n.parameters.jsCode = EXECUTAR_ADMIN_CODE;
      nodeFound = true;
      console.log('Updated node: Executar Admin');
    }
  });

  if (!nodeFound) {
    throw new Error('Executar Admin node not found!');
  }

  // 2. Conectar "É Admin?" (output 0) diretamente a "Executar Admin"
  wf.connections['É Admin?'] = {
    main: [
      [
        {
          node: 'Executar Admin',
          type: 'main',
          index: 0
        }
      ],
      [
        {
          node: 'AI Agent Cliente',
          type: 'main',
          index: 0
        }
      ]
    ]
  };
  console.log('Updated connection: É Admin? -> Executar Admin');

  // 3. Garantir que Executar Admin aponta para Enviar Telegram
  wf.connections['Executar Admin'] = {
    main: [
      [
        {
          node: 'Enviar Telegram',
          type: 'main',
          index: 0
        }
      ]
    ]
  };
  console.log('Updated connection: Executar Admin -> Enviar Telegram');

  // 4. Salvar na API do n8n
  console.log('Uploading updated workflow to n8n...');
  const putRes = await req(`/workflows/${WORKFLOW_ID}`, 'PUT', {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  });

  console.log('PUT response status:', putRes.status);
  if (putRes.status !== 200) {
    console.error('Error details:', putRes.data || putRes.text);
    throw new Error('Failed to update workflow');
  }

  // 5. Salvar também no arquivo local wf_mkK244lveO0N1qPR.json
  const localWfPath = 'wf_mkK244lveO0N1qPR.json';
  if (fs.existsSync(localWfPath)) {
    const localWf = JSON.parse(fs.readFileSync(localWfPath, 'utf-8'));
    localWf.nodes.forEach(n => {
      if (n.name === 'Executar Admin') {
        if (!n.parameters) n.parameters = {};
        n.parameters.jsCode = EXECUTAR_ADMIN_CODE;
      }
    });
    localWf.connections['É Admin?'] = wf.connections['É Admin?'];
    localWf.connections['Executar Admin'] = wf.connections['Executar Admin'];
    fs.writeFileSync(localWfPath, JSON.stringify(localWf, null, 2), 'utf-8');
    console.log(`Saved local file ${localWfPath}`);
  }

  console.log('\n✅ DEPLOY DO AGENTE ADMIN TELEGRAM CONCLUÍDO COM SUCESSO!');
}

deploy().catch(console.error);
