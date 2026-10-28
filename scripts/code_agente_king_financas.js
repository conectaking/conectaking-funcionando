const prev = $input.first().json;
const base = String($env.CK_BASE_URL || 'https://www.conectaking.com.br').replace(/\/$/, '');
const token = String($env.CK_AGENT_JWT || '').trim();
const openaiKey = String($env.OPENAI_API_KEY || '').trim();
const model = String($env.OPENAI_MODEL || 'gpt-4o-mini').trim();
const text = String(prev.text || '').trim();
const chatId = String(prev.chatId || '');
const hadVoice = !!prev.hadVoice;

let outMessage = '';

try {
  // Formatador de Moeda R$
  function fmt(val) {
    const num = Number(val || 0);
    return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const self = this;

  // Helper HTTP para a API Laravel do Conecta King
  async function ck(method, path, body) {
    const opts = {
      method: method.toUpperCase(),
      url: `${base}${path}`,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      json: true,
      returnFullResponse: true,
      ignoreHttpStatusErrors: true
    };
    if (body !== undefined) {
      opts.body = body;
    }
    try {
      const res = await self.helpers.httpRequest.call(self, opts);
      const ok = res.statusCode >= 200 && res.statusCode < 300;
      return { ok, status: res.statusCode, body: res.body };
    } catch (e) {
      return { ok: false, status: 500, body: e.message };
    }
  }

  // Chamada direta à OpenAI com Function Calling
  async function openaiCall(payload) {
    const res = await self.helpers.httpRequest.call(self, {
      method: 'POST',
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: payload,
      json: true,
      returnFullResponse: true,
      ignoreHttpStatusErrors: true
    });
    if (res.statusCode < 200 || res.statusCode >= 300) {
      const errStr = typeof res.body === 'object' ? JSON.stringify(res.body) : String(res.body);
      throw new Error(`OpenAI API error ${res.statusCode}: ${errStr}`);
    }
    return res.body;
  }

  async function resolveProfileId() {
    try {
      const meRes = await ck('GET', '/api/finance/me');
      if (meRes.ok && meRes.body && meRes.body.profile && meRes.body.profile.id) {
        return meRes.body.profile.id;
      }
    } catch (e) {
      // fallback
    }
    return 1;
  }

  async function fetchRecentTransactions(limitN) {
    try {
      const r = await ck('GET', `/api/finance/transactions?limit=${limitN || 10}`);
      if (r.ok && r.body && r.body.data) return r.body.data;
    } catch {}
    return [];
  }

  function parseDateInput(str) {
    if (!str) return null;
    str = String(str).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const parts = str.split(/[\/\-]/);
    if (parts.length === 3) {
      let d = parseInt(parts[0], 10), m = parseInt(parts[1], 10), y = parseInt(parts[2], 10);
      if (parts[0].length === 4) { y = parseInt(parts[0], 10); m = parseInt(parts[1], 10); d = parseInt(parts[2], 10); }
      if (y < 100) y += 2000;
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    return null;
  }

  async function fetchRealSummary(profileId) {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    let sum = {
      cash_balance: 0,
      bank_balance: 0,
      total_balance: 0,
      month_income: 0,
      month_expense: 0,
      pending_income: 0,
      pending_expense: 0,
      net_month: 0,
      total_to_receive: 0,
      total_to_pay: 0
    };
    try {
      const r = await ck('GET', `/api/finance/summary?year=${curYear}&month=${curMonth}`);
      if (r.ok && r.body) {
        const d = r.body.data || r.body;
        sum.cash_balance = Number(d.cash_balance || 0);
        sum.bank_balance = Number(d.bank_balance || 0);
        sum.total_balance = Number(d.total_balance || (sum.cash_balance + sum.bank_balance));
        sum.month_income = Number(d.month_income || 0);
        sum.month_expense = Number(d.month_expense || 0);
        sum.pending_income = Number(d.pending_income || 0);
        sum.pending_expense = Number(d.pending_expense || 0);
        sum.net_month = Number(d.net_month || (sum.month_income - sum.month_expense));
      }
    } catch {}
    try {
      const rec = await ck('GET', '/api/finance/receivables');
      if (rec.ok && rec.body && rec.body.total_receivable !== undefined) {
        sum.total_to_receive = Number(rec.body.total_receivable);
      }
    } catch {}
    try {
      const deb = await ck('GET', '/api/finance/debts');
      if (deb.ok && deb.body && deb.body.total_debt !== undefined) {
        sum.total_to_pay = Number(deb.body.total_debt);
      }
    } catch {}
    return sum;
  }

  function buildSummaryMessage(summary, f) {
    return [
      '📊 *Resumo Financeiro em Tempo Real:*',
      `• *Saldo em Caixa / Banco:* ${f(summary.total_balance)}`,
      `• *Entradas do Mês:* ${f(summary.month_income)}`,
      `• *Saídas do Mês:* ${f(summary.month_expense)}`,
      `• *Resultado do Mês:* ${f(summary.net_month)}`,
      `• *A Receber (Trabalhos/Clientes):* ${f(summary.total_to_receive)}`,
      `• *A Pagar (Dívidas/Compromissos):* ${f(summary.total_to_pay)}`
    ].join('\n');
  }

  const nowSp = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const todayStr = nowSp.toISOString().slice(0, 10);
  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const diaSemanaHoje = diasSemana[nowSp.getDay()];
  const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mesAtualNome = mesesNomes[nowSp.getMonth()];
  const mesQueVemNome = mesesNomes[(nowSp.getMonth() + 1) % 12];
  const anoAtual = nowSp.getFullYear();
  const proximoMesData = new Date(anoAtual, nowSp.getMonth() + 1, 1);
  const anoProximoMes = proximoMesData.getFullYear();
  const proximoMesYYYYMM = `${anoProximoMes}-${String(proximoMesData.getMonth() + 1).padStart(2, '0')}`;

  const SYSTEM_PROMPT = `Você é o AGENTE KING FINANÇAS, Diretor Financeiro (CFO) Pessoal e Operador de Finanças do Adriano King.
Você atende exclusivamente o CEO Adriano King no Telegram com foco 100% DEDICADO às suas Finanças Pessoais e da Empresa.
Tom de voz: executivo de altíssimo nível, analítico, seguro, direto e organizado. Valores sempre formatados em R$ (ex: R$ 450,00).

════ DATA E CONTEXTO ATUAL (FUSO BRASÍLIA) ════
• Data de hoje: ${todayStr} (${diaSemanaHoje})
• Mês atual: ${mesAtualNome} de ${anoAtual}
• Próximo mês: ${mesQueVemNome} (${proximoMesYYYYMM})

════ SUAS ATRIBUIÇÕES SUPREMAS (FINANÇAS 100%) ════
1. FLUXO DE CAIXA:
   - Registrar receitas (entradas) e despesas (saídas).
   - Suportar lançamentos avulsos ou múltiplos em um só comando (com 'transactions' array).
   - Classificação precisa: PAID (já pago/recebido hoje) vs PENDING (a pagar/a receber no futuro).
2. TRABALHOS E FOTOGRAFIA:
   - Criar trabalhos fotográficos ou eventos ('create_trabalho') informando: cliente, valor total, entrada já recebida e saldo pendente.
   - Atualizar trabalhos ('update_trabalho') e excluir ('delete_trabalho').
   - Registrar pagamento/abater no valor de trabalho ('record_payment', ex: Katiane pagou R$ 400).
   - Listar clientes que devem ('receivables_list').
3. DÍVIDAS, CARTÕES E TERCEIROS:
   - Consultar pessoas e contas que o Adriano deve ('list_debts', ex: Socorrinha, parcelas, cartões).
   - Suportar filtro por pessoa ou por período ('mes: proximo' / 'mes_que_vem' / 'atual').
   - Adicionar novas dívidas ou compras parceladas ('add_debt' com parcelas e valor por parcela).
   - Dar baixa em dívidas ('pay_debt' ou 'mark_paid').
4. CONSULTA E RESUMOS:
   - Resumo em tempo real do caixa, faturamento do mês, saldo atual e projeção ('summary').
   - Ajustar saldo de caixa ('adjust_cash').
   - Cancelar último lançamento ou excluir por critérios ('cancel_last', 'delete_by_criteria').

════ REGRAS CRÍTICAS DE PRECISÃO ════
- Se o Adriano disser "quanto fulano falta me pagar" ou "quem me deve", isso é SEMPRE A RECEBER (receivables_list). NUNCA confunda com dívidas que o Adriano deve!
- Se o Adriano disser "quem eu estou devendo" ou "quanto devo para Socorrinha", isso é SEMPRE DÍVIDA DO ADRIANO (list_debts).
- Nunca crie transações com valores inventados. Confirme sempre o que foi registrado com bullet points e o novo saldo.`;

  const tools = [
    {
      type: 'function',
      function: {
        name: 'manage_finance',
        description: 'Gerencia finanças completas do Adriano King com poder total: consultar pessoas e contas que eu devo (list_debts), adicionar compras parceladas ou dívidas para o próximo mês (add_debt), dar baixa em dívidas (pay_debt), criar trabalhos/ensaios com entrada e saldo a receber (create_trabalho), abater pagamento em trabalho existente (record_payment), consultar trabalhos a receber (receivables_list), registrar receitas e despesas avulsas do fluxo de caixa (create), ajustar saldo em caixa (adjust_cash), cancelar lançamentos errados (cancel_last, delete_by_criteria) e ver o resumo financeiro atualizado (summary).',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['summary', 'create_trabalho', 'update_trabalho', 'delete_trabalho', 'record_payment', 'receivables_list', 'list_debts', 'add_debt', 'pay_debt', 'mark_paid', 'create', 'cancel_last', 'delete_by_criteria', 'adjust_cash', 'list_recent', 'clear_all', 'advice'],
              description: 'Ação financeira a executar'
            },
            cliente: { type: 'string', description: 'Nome do cliente para trabalhos ou a receber (ex: Katiane)' },
            pessoa: { type: 'string', description: 'Nome da pessoa para dívidas (ex: Socorrinha)' },
            valor_total: { type: 'number', description: 'Valor total do trabalho/serviço' },
            entrada: { type: 'number', description: 'Valor pago como entrada no trabalho' },
            valor_pago: { type: 'number', description: 'Valor a abater/dar baixa no trabalho ou dívida' },
            valor: { type: 'number', description: 'Valor da despesa/receita ou parcela' },
            parcelas: { type: 'number', description: 'Número de parcelas (para compras a prazo)' },
            data_vencimento: { type: 'string', description: 'Data de vencimento YYYY-MM-DD' },
            dia_vencimento: { type: 'number', description: 'Dia do mês do vencimento (ex: 10)' },
            nome_conta: { type: 'string', description: 'Nome ou título da conta/dívida' },
            descricao: { type: 'string', description: 'Descrição da despesa/receita/trabalho' },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'], description: 'INCOME (entrada) ou EXPENSE (saída)' },
            status: { type: 'string', enum: ['PAID', 'PENDING'], description: 'PAID (já pago/recebido) ou PENDING (futuro)' },
            categoria: { type: 'string', description: 'Categoria financeira (Alimentação, Fotografia, Transporte, etc.)' },
            forma_pagamento: { type: 'string', description: 'PIX, Cartão de Crédito, Dinheiro, etc.' },
            mes: { type: 'string', description: 'Filtro de mês: "proximo", "atual", "2026-11", etc.' },
            transactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
                  amount: { type: 'number' },
                  description: { type: 'string' },
                  status: { type: 'string', enum: ['PAID', 'PENDING'] },
                  due_date: { type: 'string' },
                  payment_method: { type: 'string' },
                  category: { type: 'string' }
                },
                required: ['type', 'amount', 'description']
              }
            }
          },
          required: ['action']
        }
      }
    }
  ];

  // Identificação rápida de comandos
  const lowerMsg = text.toLowerCase();
  let fnName = null;
  let args = {};

  if (/^\/(?:start|help|ajuda)/i.test(lowerMsg) || /^(?:oi|ol[aá]|bom dia|boa tarde|boa noite)\b/i.test(lowerMsg)) {
    const profileId = await resolveProfileId();
    const s = await fetchRealSummary(profileId);
    outMessage = `👑 *Olá, Adriano! Eu sou o seu Agente King Finanças.*\n\nEstou 100% pronto para gerenciar suas Finanças, Fluxo de Caixa, Trabalhos e Dívidas com máxima precisão!\n\n${buildSummaryMessage(s, fmt)}\n\n💡 *Comandos que você pode enviar por texto ou áudio:*\n• *Saldo* ou *Resumo* (ver fluxo atual)\n• *Quem me deve?* ou *Trabalhos a receber*\n• *Quem eu devo?* ou *Contas do mês que vem*\n• *Ensaio de [Cliente] R$ [Valor], deu [Entrada] de entrada*\n• *[Cliente] pagou R$ [Valor]* (para abater pagamento)\n• *Gastei R$ [Valor] com [Descrição]* (ex: almoço, combustível)\n• *Recebi R$ [Valor] de [Descrição]*`;
    fnName = 'greeting';
  } else if (/^(saldo|resumo|como\s+t[aá]\s+minhas?\s+finan[cç]as?|resumo\s+financeiro|fluxo\s+de\s+caixa|faturamento)/i.test(lowerMsg)) {
    fnName = 'manage_finance';
    args = { action: 'summary' };
  } else if (/quem\s+eu\s+devo|quanto\s+devo|minhas\s+d[ií]vidas|contas\s+a\s+pagar|d[ií]vidas/i.test(lowerMsg)) {
    fnName = 'manage_finance';
    const isProximo = /m[eê]s\s+que\s+vem|pr[oó]ximo/i.test(lowerMsg);
    let pMatch = lowerMsg.match(/(?:devo\s+para|devo\s+a|socorrinha|socorr)\s*([a-zA-Zá-úÁ-Ú]+)?/i);
    let pessoa = /socorr/i.test(lowerMsg) ? 'Socorrinha' : (pMatch && pMatch[1] ? pMatch[1] : undefined);
    args = { action: 'list_debts', mes: isProximo ? 'proximo' : 'atual', pessoa };
  } else if (/quanto\s+(?:falta\s+)?([a-zA-Zá-úÁ-Ú]+)\s+(?:falta\s+)?me\s+pagar|quem\s+me\s+deve|trabalhos?\s+a\s+receber/i.test(lowerMsg)) {
    fnName = 'manage_finance';
    const m = lowerMsg.match(/(?:falta|deve)\s+([a-zA-Zá-úÁ-Ú]+)/i);
    const cli = m && !['me', 'que', 'pagar', 'o', 'a'].includes(m[1].toLowerCase()) ? m[1] : undefined;
    args = { action: 'receivables_list', cliente: cli };
  }

  // Se não foi interceptado por atalho direto, consulta o modelo com function calling
  if (!fnName) {
    const aiRes = await openaiCall({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: (hadVoice ? '[Mensagem de voz transcrita]: ' : '') + text }
      ],
      tools,
      tool_choice: 'auto',
      temperature: 0.2
    });

    const choice = aiRes.choices && aiRes.choices[0] && aiRes.choices[0].message;
    if (choice && choice.tool_calls && choice.tool_calls.length > 0) {
      const tc = choice.tool_calls[0];
      fnName = tc.function.name;
      try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }
    } else {
      outMessage = (choice && choice.content) || '👑 Adriano, como posso ajudar nas suas finanças hoje?';
    }
  }

  // Execução do manage_finance se solicitado
  if (fnName === 'manage_finance') {
    const profileId = await resolveProfileId();
    const action = args.action || 'summary';

    if (action === 'summary') {
      const s = await fetchRealSummary(profileId);
      outMessage = `💼 *Agente King Finanças — Resumo Financeiro*\n\n${buildSummaryMessage(s, fmt)}`;
    } else if (action === 'receivables_list') {
      const r = await ck('GET', '/api/finance/receivables');
      let items = (r.body && r.body.data) || (Array.isArray(r.body) ? r.body : []);
      if (args.cliente) {
        const cLower = String(args.cliente).toLowerCase();
        items = items.filter(it => String(it.client_name || it.title || '').toLowerCase().includes(cLower));
      }
      if (!items || items.length === 0) {
        outMessage = args.cliente
          ? `✅ *Trabalhos a Receber:* Não há valores pendentes para *"${args.cliente}"*!`
          : '✅ *Trabalhos a Receber:* Todos os trabalhos estão quitados! Nada pendente no momento.';
      } else {
        const lines = items.map(it => `• *Cliente:* ${it.client_name || it.title}\n  Total: ${fmt(it.total_amount)} | Entrada: ${fmt(it.paid_amount)} | *Falta Pagar: ${fmt(it.remaining_amount)}*`);
        const totalRem = items.reduce((acc, it) => acc + Number(it.remaining_amount || 0), 0);
        outMessage = `📋 *Trabalhos e Contas a Receber:*\n\n${lines.join('\n\n')}\n\n💰 *Total a Receber: ${fmt(totalRem)}*`;
      }
    } else if (action === 'record_payment') {
      const payload = {
        client_name: args.cliente,
        amount: args.valor_pago || args.valor || 0
      };
      const r = await ck('POST', '/api/finance/receivables/payment', payload);
      if (r.ok) {
        const d = r.body.data || r.body;
        outMessage = `✅ *Pagamento Abatido com Sucesso!*\n\n👤 *Cliente:* ${args.cliente}\n💵 *Valor Abatido:* ${fmt(payload.amount)}\n📌 *Saldo Restante a Receber:* ${fmt(d.remaining_amount || 0)}`;
      } else {
        outMessage = `⚠️ Não foi possível abater o pagamento: ${(r.body && r.body.message) || 'Erro desconhecido'}`;
      }
    } else if (action === 'list_debts') {
      const q = args.mes ? `?month=${encodeURIComponent(args.mes)}` : '';
      const r = await ck('GET', '/api/finance/debts' + q);
      let items = (r.body && r.body.data) || (Array.isArray(r.body) ? r.body : []);
      if (args.pessoa) {
        const pLower = String(args.pessoa).toLowerCase();
        items = items.filter(it => String(it.person_name || it.title || it.creditor || '').toLowerCase().includes(pLower));
      }
      if (!items || items.length === 0) {
        outMessage = args.pessoa
          ? `✅ *Contas a Pagar:* Você não tem nenhuma dívida pendente com *"${args.pessoa}"*!`
          : '✅ *Contas a Pagar:* Nenhuma conta ou dívida pendente registrada!';
      } else {
        const lines = items.map(it => `• *Conta/Pessoa:* ${it.person_name || it.title || it.creditor}\n  Valor: *${fmt(it.amount)}* | Vencimento: ${it.due_date || 'A combinar'}`);
        const totalDeb = items.reduce((acc, it) => acc + Number(it.amount || 0), 0);
        outMessage = `📋 *Contas e Dívidas a Pagar (${args.mes === 'proximo' ? 'Próximo Mês' : 'Geral'}):*\n\n${lines.join('\n\n')}\n\n💸 *Total a Pagar: ${fmt(totalDeb)}*`;
      }
    } else if (action === 'add_debt') {
      const payload = {
        person_name: args.pessoa || 'Terceiro',
        title: args.nome_conta || args.descricao || 'Dívida/Parcela',
        amount: args.valor,
        installments: args.parcelas || 1,
        due_date: args.data_vencimento || todayStr
      };
      const r = await ck('POST', '/api/finance/debts', payload);
      if (r.ok) {
        outMessage = `✅ *Dívida / Parcela Registrada com Sucesso!*\n\n👤 *Credor:* ${payload.person_name}\n📝 *Título:* ${payload.title}\n💵 *Valor:* ${fmt(payload.amount)}\n🗓️ *Parcelas:* ${payload.installments}x\n📅 *Vencimento Inicial:* ${payload.due_date}`;
      } else {
        outMessage = `⚠️ Não foi possível registrar a dívida: ${(r.body && r.body.message) || 'Erro ao salvar'}`;
      }
    } else if (action === 'create_trabalho') {
      const payload = {
        client_name: args.cliente || 'Cliente Ensaio',
        total_amount: args.valor_total || args.valor || 0,
        paid_amount: args.entrada || 0,
        title: args.descricao || `Ensaio / Trabalho Fotográfico - ${args.cliente || ''}`,
        event_date: args.data_vencimento || todayStr
      };
      const r = await ck('POST', '/api/finance/receivables', payload);
      if (r.ok) {
        const remaining = payload.total_amount - payload.paid_amount;
        outMessage = `📸 *Trabalho Registrado com Sucesso!*\n\n👤 *Cliente:* ${payload.client_name}\n💰 *Valor Total:* ${fmt(payload.total_amount)}\n💵 *Entrada Paga:* ${fmt(payload.paid_amount)}\n⏳ *Saldo a Receber:* ${fmt(remaining)}\n📅 *Data:* ${payload.event_date}`;
      } else {
        outMessage = `⚠️ Erro ao registrar trabalho: ${(r.body && r.body.message) || 'Falha no servidor'}`;
      }
    } else if (action === 'create') {
      const items = (args.transactions && args.transactions.length > 0)
        ? args.transactions
        : [{
            type: args.type || 'EXPENSE',
            amount: args.valor || 0,
            description: args.descricao || 'Lançamento financeiro',
            status: args.status || 'PAID',
            due_date: args.data_vencimento || todayStr
          }];

      const results = [];
      for (const it of items) {
        const r = await ck('POST', '/api/finance/transactions', {
          profile_id: profileId,
          type: it.type || 'EXPENSE',
          amount: it.amount || 0,
          description: it.description || 'Lançamento via Agente King Finanças',
          status: it.status || 'PAID',
          date: it.due_date || todayStr
        });
        if (r.ok) results.push(it);
      }

      const s = await fetchRealSummary(profileId);
      const lines = results.map(it => `${it.type === 'INCOME' ? '💵' : '💸'} *${it.type === 'INCOME' ? 'Receita' : 'Despesa'}:* ${fmt(it.amount)} (${it.status === 'PAID' ? 'Pago/Recebido' : 'Pendente'})\n   📝 _${it.description}_`);
      outMessage = `✅ *Lançamento(s) Realizado(s)!*\n\n${lines.join('\n')}\n\n${buildSummaryMessage(s, fmt)}`;
    } else if (action === 'adjust_cash') {
      const r = await ck('POST', '/api/finance/adjust-balance', {
        new_balance: args.valor || 0
      });
      const s = await fetchRealSummary(profileId);
      outMessage = `⚖️ *Saldo em Caixa Ajustado!*\n\nNovo Saldo: *${fmt(args.valor)}*\n\n${buildSummaryMessage(s, fmt)}`;
    } else if (action === 'cancel_last') {
      const r = await ck('DELETE', '/api/finance/transactions/last');
      const s = await fetchRealSummary(profileId);
      outMessage = `🗑️ *Último Lançamento Cancelado com Sucesso!*\n\n${buildSummaryMessage(s, fmt)}`;
    }
  }

} catch (err) {
  outMessage = '⚠️ *Agente King Finanças:* Ocorreu um erro ao processar seu comando: ' + String(err.message || err).slice(0, 250);
}

function fixTelegramMarkdown(text) {
  if (!text) return '';
  let t = String(text);
  const underscores = (t.match(/_/g) || []).length;
  if (underscores % 2 !== 0) {
    let count = 0;
    t = t.replace(/_/g, m => (++count === underscores ? '' : m));
  }
  const stars = (t.match(/\*/g) || []).length;
  if (stars % 2 !== 0) {
    let count = 0;
    t = t.replace(/\*/g, m => (++count === stars ? '' : m));
  }
  return t;
}

outMessage = fixTelegramMarkdown(outMessage || '👑 Agente King Finanças pronto para operar.');
return [{ json: { ...prev, outMessage } }];
