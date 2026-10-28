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
  const self = this;

  // Formatador de Moeda R$
  function fmt(val) {
    const num = Number(val || 0);
    return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

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
      const meRes = await ck('GET', '/api/finance/profiles');
      const list = (meRes.body && (meRes.body.data || meRes.body.profiles || meRes.body)) || [];
      const arr = Array.isArray(list) ? list : [];
      const primary = arr.find(p => p && (p.is_primary === true || p.isPrimary === true));
      const active = arr.find(p => p && (p.is_active !== false && p.isActive !== false));
      const pick = primary || active || arr[0];
      return pick ? Number(pick.id) : 1;
    } catch (e) {
      return 1;
    }
  }

  async function fetchRealSummary(profileId) {
    let sum = {
      cash_balance: 0,
      month_income: 0,
      month_expense: 0,
      net_month: 0,
      total_to_receive: 0,
      total_to_pay: 0
    };

    // 1. Dashboard oficial do Conecta King
    try {
      const dashRes = await ck('GET', `/api/finance/dashboard?profile_id=${profileId}`);
      if (dashRes.ok && dashRes.body) {
        const d = (dashRes.body && dashRes.body.data) || dashRes.body;
        sum.cash_balance = Number(d.accountBalance ?? d.saldoDisponivel ?? 0);
        sum.month_income = Number(d.totalIncomePaid ?? d.totalRecebido ?? 0);
        sum.month_expense = Number(d.totalExpensePaid ?? d.totalPago ?? 0);
        sum.net_month = Number(d.monthlyBalance ?? (sum.month_income - sum.month_expense));
        sum.total_to_receive = Number(d.pendenciasReceber ?? 0);
        sum.total_to_pay = Number(d.pendenciasPagar ?? 0);
      }
    } catch (_) {}

    // 2. King Data oficial (trabalhos e terceiros/dívidas)
    try {
      const kdRes = await ck('GET', `/api/finance/king-data?profile_id=${profileId}`);
      if (kdRes.ok && kdRes.body) {
        const kd = (kdRes.body && kdRes.body.data) || kdRes.body;

        // Trabalhos a receber
        if (Array.isArray(kd.trabalhos)) {
          let rec = 0;
          for (const t of kd.trabalhos) {
            const val = Number(t.valor || 0);
            const pagos = Array.isArray(t.pagamentos) ? t.pagamentos.reduce((acc, p) => acc + Number(p.valor || 0), 0) : 0;
            const rest = Math.max(0, val - pagos);
            rec += rest;
          }
          if (rec > 0) sum.total_to_receive = rec;
        }

        // Terceiros e Dívidas a pagar
        let dev = 0;
        if (Array.isArray(kd.terceiros)) {
          for (const terc of kd.terceiros) {
            if (Array.isArray(terc.contas)) {
              for (const c of terc.contas) {
                const cVal = Number(c.valor || 0);
                const cPagos = Array.isArray(c.pagamentos) ? c.pagamentos.reduce((acc, p) => acc + Number(p.valor || 0), 0) : 0;
                dev += Math.max(0, cVal - cPagos);
              }
            }
          }
        }
        if (Array.isArray(kd.dividas)) {
          for (const d of kd.dividas) {
            dev += Number(d.valor || d.amount || 0);
          }
        }
        if (dev > 0) {
          sum.total_to_pay = dev;
        }
      }
    } catch (_) {}

    return sum;
  }

  function buildSummaryMessage(summary, f) {
    return [
      '📊 *Resumo Financeiro em Tempo Real:*',
      `• *Patrimônio (Dinheiro em Caixa):* ${f(summary.cash_balance)}`,
      `• *Receitas do Mês:* ${f(summary.month_income)}`,
      `• *Despesas do Mês:* ${f(summary.month_expense)}`,
      `• *Balanço / Resultado Líquido:* ${f(summary.net_month)}`,
      `• *A Receber (Trabalhos/Clientes):* ${f(summary.total_to_receive)}`,
      `• *A Pagar (Dívidas/Terceiros):* ${f(summary.total_to_pay)}`
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
   - Atualizar trabalhos e registrar pagamento/abater no valor de trabalho ('record_payment', ex: Katiane pagou R$ 400).
   - Listar clientes que devem ('receivables_list').
3. DÍVIDAS, CARTÕES E TERCEIROS:
   - Consultar pessoas e contas que o Adriano deve ('list_debts', ex: Socorrinha, parcelas, cartões).
   - Suportar filtro por pessoa ou por período ('mes: proximo' / 'mes_que_vem' / 'atual').
   - Adicionar novas dívidas ou compras parceladas ('add_debt').
   - Dar baixa em dívidas ('pay_debt').
4. CONSULTA E RESUMOS:
   - Resumo em tempo real do caixa, faturamento do mês, saldo atual e projeção ('summary').
   - Cancelar último lançamento ('cancel_last').

════ REGRAS CRÍTICAS DE PRECISÃO ════
- Se o Adriano disser "quanto fulano falta me pagar" ou "quem me deve", isso é SEMPRE A RECEBER (receivables_list). NUNCA confunda com dívidas que o Adriano deve!
- Se o Adriano disser "quem eu estou devendo" ou "quanto devo para Socorrinha", isso é SEMPRE DÍVIDA DO ADRIANO (list_debts).
- Nunca crie transações com valores inventados. Confirme sempre o que foi registrado com bullet points e o novo saldo.`;

  const tools = [
    {
      type: 'function',
      function: {
        name: 'manage_finance',
        description: 'Gerencia finanças completas do Adriano King com poder total: consultar pessoas e contas que eu devo (list_debts), adicionar compras parceladas ou dívidas para o próximo mês (add_debt), dar baixa em dívidas (pay_debt), criar trabalhos/ensaios com entrada e saldo a receber (create_trabalho), abater pagamento em trabalho existente (record_payment), consultar trabalhos a receber (receivables_list), registrar receitas e despesas avulsas do fluxo de caixa (create), cancelar lançamentos errados (cancel_last) e ver o resumo financeiro atualizado (summary).',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['summary', 'create_trabalho', 'record_payment', 'receivables_list', 'list_debts', 'add_debt', 'pay_debt', 'create', 'cancel_last'],
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
            nome_conta: { type: 'string', description: 'Nome ou título da conta/dívida' },
            descricao: { type: 'string', description: 'Descrição da despesa/receita/trabalho' },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'], description: 'INCOME (entrada) ou EXPENSE (saída)' },
            status: { type: 'string', enum: ['PAID', 'PENDING'], description: 'PAID (já pago/recebido) ou PENDING (futuro)' },
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
                  due_date: { type: 'string' }
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
  const lowerMsg = text.toLowerCase().trim();
  let fnName = null;
  let args = {};

  if (/^\/(?:start|help|ajuda)/i.test(lowerMsg)) {
    const profileId = await resolveProfileId();
    const s = await fetchRealSummary(profileId);
    outMessage = `👑 *Olá, Adriano! Eu sou o seu Agente King Finanças.*\n\nEstou 100% conectado à sua Gestão Financeira com dados em tempo real!\n\n${buildSummaryMessage(s, fmt)}\n\n💡 *Comandos rápidos que você pode enviar (texto ou áudio):*\n• *Saldo* ou *Resumo* (ver fluxo atual)\n• *Quem me deve?* ou *Trabalhos a receber*\n• *Quem eu devo?* ou *Dívidas do mês que vem*\n• *Ensaio de [Cliente] R$ [Valor], deu [Entrada] de entrada*\n• *[Cliente] pagou R$ [Valor]* (para abater)\n• *Gastei R$ [Valor] com [Descrição]* (almoço, gasolina)\n• *Recebi R$ [Valor] de [Descrição]*`;
    fnName = 'greeting';
  } else if (/(?:como\s+t[aá]\s+minhas?\s+finan[cç]as?|minhas?\s+finan[cç]as?|resumo|saldo|fluxo\s+de\s+caixa|faturamento|patrim[oô]nio)/i.test(lowerMsg) && !/(?:devo|deve|pagar|receber|ensaio|trabalho|cliente|gastei|recebi)/i.test(lowerMsg)) {
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
      const kdRes = await ck('GET', `/api/finance/king-data?profile_id=${profileId}`);
      const kd = (kdRes.body && (kdRes.body.data || kdRes.body)) || {};
      const trabalhos = Array.isArray(kd.trabalhos) ? kd.trabalhos : [];

      let pending = [];
      for (const t of trabalhos) {
        const val = Number(t.valor || 0);
        const pagos = Array.isArray(t.pagamentos) ? t.pagamentos.reduce((acc, p) => acc + Number(p.valor || 0), 0) : 0;
        const rest = Math.max(0, val - pagos);
        if (rest > 0) {
          pending.push({
            id: t.id,
            cliente: t.cliente || 'Cliente',
            servico: t.servico || 'Trabalho Fotográfico',
            valorTotal: val,
            pago: pagos,
            restante: rest,
            data: t.data || t.dataPrevista || ''
          });
        }
      }

      if (args.cliente) {
        const cLower = String(args.cliente).toLowerCase();
        pending = pending.filter(it => it.cliente.toLowerCase().includes(cLower));
      }

      if (pending.length === 0) {
        outMessage = args.cliente
          ? `✅ *Trabalhos a Receber:* Não há valores pendentes para *"${args.cliente}"*!`
          : '✅ *Trabalhos a Receber:* Todos os trabalhos estão quitados! Nada pendente no momento.';
      } else {
        const lines = pending.map(it => `• *Cliente:* ${it.cliente} (${it.servico})\n  Total: ${fmt(it.valorTotal)} | Entrada/Pago: ${fmt(it.pago)} | *Falta Pagar: ${fmt(it.restante)}*`);
        const totalRem = pending.reduce((acc, it) => acc + it.restante, 0);
        outMessage = `📋 *Trabalhos a Receber:*\n\n${lines.join('\n\n')}\n\n💰 *Total a Receber: ${fmt(totalRem)}*`;
      }
    } else if (action === 'list_debts') {
      const kdRes = await ck('GET', `/api/finance/king-data?profile_id=${profileId}`);
      const kd = (kdRes.body && (kdRes.body.data || kdRes.body)) || {};
      const terceiros = Array.isArray(kd.terceiros) ? kd.terceiros : [];

      let debtsList = [];
      const mesFiltro = String(args.mes || '').toLowerCase();
      const isProximo = mesFiltro.includes('proximo') || mesFiltro.includes('que vem');

      for (const terc of terceiros) {
        const pessoaNome = terc.nome || 'Terceiro';
        if (Array.isArray(terc.contas)) {
          for (const c of terc.contas) {
            const val = Number(c.valor || 0);
            const pagos = Array.isArray(c.pagamentos) ? c.pagamentos.reduce((acc, p) => acc + Number(p.valor || 0), 0) : 0;
            const rest = Math.max(0, val - pagos);
            if (rest > 0) {
              debtsList.push({
                pessoa: pessoaNome,
                titulo: c.nomeConta || c.descricao || 'Conta/Parcela',
                valor: rest,
                vencimento: c.dataVencimento || ''
              });
            }
          }
        }
      }

      if (args.pessoa) {
        const pLower = String(args.pessoa).toLowerCase();
        debtsList = debtsList.filter(it => it.pessoa.toLowerCase().includes(pLower));
      }

      if (isProximo) {
        debtsList = debtsList.filter(it => it.vencimento.startsWith(proximoMesYYYYMM));
      }

      if (debtsList.length === 0) {
        outMessage = args.pessoa
          ? `✅ *Contas a Pagar:* Você não tem nenhuma dívida pendente com *"${args.pessoa}"*!`
          : (isProximo ? '✅ *Contas a Pagar:* Nenhuma conta com vencimento para o próximo mês!' : '✅ *Contas a Pagar:* Nenhuma conta ou dívida pendente registrada!');
      } else {
        const lines = debtsList.map(it => `• *${it.pessoa}:* ${it.titulo}\n  Valor: *${fmt(it.valor)}* | Vencimento: ${it.vencimento || 'A combinar'}`);
        const totalDeb = debtsList.reduce((acc, it) => acc + it.valor, 0);
        outMessage = `📋 *Contas e Dívidas a Pagar (${isProximo ? 'Próximo Mês' : 'Geral'}):*\n\n${lines.join('\n\n')}\n\n💸 *Total a Pagar: ${fmt(totalDeb)}*`;
      }
    } else if (action === 'create_trabalho') {
      const kdRes = await ck('GET', `/api/finance/king-data?profile_id=${profileId}`);
      const kd = (kdRes.body && (kdRes.body.data || kdRes.body)) || {};
      const trabalhos = Array.isArray(kd.trabalhos) ? kd.trabalhos : [];

      const valTotal = args.valor_total || args.valor || 0;
      const entrada = args.entrada || 0;
      const clienteNome = args.cliente || 'Cliente';
      const servicoNome = args.descricao || 'Fotografia / Ensaio';

      const newTrab = {
        id: 'trab_' + Date.now(),
        data: todayStr,
        valor: valTotal,
        status: entrada >= valTotal ? 'concluido' : (entrada > 0 ? 'parcial' : 'pendente'),
        cliente: clienteNome,
        servico: servicoNome,
        pagamentos: entrada > 0 ? [{ data: todayStr, hora: '12:00', valor: entrada }] : [],
        dataPrevista: args.data_vencimento || todayStr
      };
      trabalhos.push(newTrab);

      await ck('PUT', '/api/finance/king-data', {
        profile_id: profileId,
        data: {
          dividas: kd.dividas || [],
          terceiros: kd.terceiros || [],
          trabalhos: trabalhos,
          bens: kd.bens || []
        }
      });

      const s = await fetchRealSummary(profileId);
      const remaining = valTotal - entrada;
      outMessage = `📸 *Trabalho Registrado com Sucesso!*\n\n👤 *Cliente:* ${clienteNome}\n🎯 *Serviço:* ${servicoNome}\n💰 *Valor Total:* ${fmt(valTotal)}\n💵 *Entrada Paga:* ${fmt(entrada)}\n⏳ *Saldo a Receber:* ${fmt(remaining)}\n\n${buildSummaryMessage(s, fmt)}`;
    } else if (action === 'record_payment') {
      const kdRes = await ck('GET', `/api/finance/king-data?profile_id=${profileId}`);
      const kd = (kdRes.body && (kdRes.body.data || kdRes.body)) || {};
      const trabalhos = Array.isArray(kd.trabalhos) ? kd.trabalhos : [];

      const cli = String(args.cliente || '').toLowerCase();
      const trab = trabalhos.find(t => String(t.cliente || '').toLowerCase().includes(cli));

      if (!trab) {
        outMessage = `⚠️ Não encontrei nenhum trabalho registrado para o cliente *"${args.cliente}"*.`;
      } else {
        const valPago = Number(args.valor_pago || args.valor || 0);
        if (!Array.isArray(trab.pagamentos)) trab.pagamentos = [];
        trab.pagamentos.push({ data: todayStr, hora: '12:00', valor: valPago });

        const tot = Number(trab.valor || 0);
        const pagos = trab.pagamentos.reduce((acc, p) => acc + Number(p.valor || 0), 0);
        const rest = Math.max(0, tot - pagos);
        trab.status = rest === 0 ? 'concluido' : 'parcial';

        await ck('PUT', '/api/finance/king-data', {
          profile_id: profileId,
          data: {
            dividas: kd.dividas || [],
            terceiros: kd.terceiros || [],
            trabalhos: trabalhos,
            bens: kd.bens || []
          }
        });

        const s = await fetchRealSummary(profileId);
        outMessage = `✅ *Pagamento Abatido com Sucesso!*\n\n👤 *Cliente:* ${trab.cliente}\n💵 *Valor Abatido:* ${fmt(valPago)}\n📌 *Saldo Restante a Receber:* ${fmt(rest)}\n\n${buildSummaryMessage(s, fmt)}`;
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
          transaction_date: it.due_date || todayStr
        });
        if (r.ok) results.push(it);
      }

      const s = await fetchRealSummary(profileId);
      const lines = results.map(it => `${it.type === 'INCOME' ? '💵' : '💸'} *${it.type === 'INCOME' ? 'Receita' : 'Despesa'}:* ${fmt(it.amount)} (${it.status === 'PAID' ? 'Pago/Recebido' : 'Pendente'})\n   📝 _${it.description}_`);
      outMessage = `✅ *Lançamento(s) Realizado(s)!*\n\n${lines.join('\n')}\n\n${buildSummaryMessage(s, fmt)}`;
    } else if (action === 'add_debt') {
      const kdRes = await ck('GET', `/api/finance/king-data?profile_id=${profileId}`);
      const kd = (kdRes.body && (kdRes.body.data || kdRes.body)) || {};
      if (!Array.isArray(kd.terceiros)) kd.terceiros = [];

      const rawPessoa = String(args.pessoa || 'Terceiro').trim();
      const pLower = rawPessoa.toLowerCase();

      let terc = kd.terceiros.find(t => {
        const tLower = String(t.nome || '').toLowerCase();
        return tLower.includes(pLower) || pLower.includes(tLower) || (pLower.includes('socorr') && tLower.includes('socorr'));
      });

      if (!terc) {
        terc = {
          id: 'terc_' + Date.now(),
          nome: rawPessoa,
          contas: []
        };
        kd.terceiros.push(terc);
      }
      if (!Array.isArray(terc.contas)) terc.contas = [];

      const numParcelas = Number(args.parcelas) || 1;
      const valParcela = Number(args.valor || (args.valor_total ? args.valor_total / numParcelas : 0));
      const tituloBase = args.nome_conta || args.descricao || 'Parcela';

      let startYear = nowSp.getFullYear();
      let startMonth = nowSp.getMonth() + 1;
      let startDay = 10;

      if (args.data_vencimento) {
        const parts = String(args.data_vencimento).split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            startYear = parseInt(parts[0], 10);
            startMonth = parseInt(parts[1], 10);
            startDay = parseInt(parts[2], 10);
          } else {
            startDay = parseInt(parts[0], 10);
            startMonth = parseInt(parts[1], 10);
            startYear = parseInt(parts[2], 10);
            if (startYear < 100) startYear += 2000;
          }
        }
      }

      const novasContas = [];
      for (let i = 0; i < numParcelas; i++) {
        let m = startMonth + i;
        let y = startYear;
        while (m > 12) {
          m -= 12;
          y += 1;
        }
        const dueStr = `${y}-${String(m).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
        const cNome = numParcelas > 1 ? `${tituloBase} (Parcela ${i + 1}/${numParcelas})` : tituloBase;
        const newConta = {
          id: `c_${Date.now()}_${i + 1}`,
          tipo: numParcelas > 1 ? 'recorrente' : 'unica',
          valor: valParcela,
          descricao: `${tituloBase} (${terc.nome})`,
          nomeConta: cNome,
          pagamentos: [],
          dataVencimento: dueStr
        };
        terc.contas.push(newConta);
        novasContas.push(newConta);
      }

      await ck('PUT', '/api/finance/king-data', {
        profile_id: profileId,
        data: {
          dividas: kd.dividas || [],
          terceiros: kd.terceiros,
          trabalhos: kd.trabalhos || [],
          bens: kd.bens || []
        }
      });

      const s = await fetchRealSummary(profileId);
      const totalDivida = valParcela * numParcelas;
      const lines = novasContas.map((c, idx) => `  • Parcela ${idx + 1}/${numParcelas}: ${fmt(c.valor)} (Vence em ${c.dataVencimento})`);

      outMessage = `✅ *Dívida / Parcelas Registradas com Sucesso!*\n\n` +
        `👤 *Pessoa/Credor:* ${terc.nome}\n` +
        `📝 *Descrição:* ${tituloBase}\n` +
        `💵 *Valor:* ${numParcelas}x de ${fmt(valParcela)} (Total: *${fmt(totalDivida)}*)\n` +
        `📅 *Vencimento Inicial:* ${novasContas[0]?.dataVencimento}\n\n` +
        `📋 *Cronograma das Parcelas:*\n${lines.join('\n')}\n\n` +
        `${buildSummaryMessage(s, fmt)}`;
    } else if (action === 'pay_debt') {
      const kdRes = await ck('GET', `/api/finance/king-data?profile_id=${profileId}`);
      const kd = (kdRes.body && (kdRes.body.data || kdRes.body)) || {};
      const terceiros = Array.isArray(kd.terceiros) ? kd.terceiros : [];

      const rawPessoa = String(args.pessoa || '').toLowerCase();
      let terc = terceiros.find(t => String(t.nome || '').toLowerCase().includes(rawPessoa) || (rawPessoa.includes('socorr') && String(t.nome || '').toLowerCase().includes('socorr')));

      if (!terc || !Array.isArray(terc.contas) || terc.contas.length === 0) {
        outMessage = `⚠️ Nenhuma conta ou parcela pendente encontrada para *"${args.pessoa || 'esta pessoa'}"*.`;
      } else {
        const pendentes = terc.contas.filter(c => {
          const val = Number(c.valor || 0);
          const pagos = Array.isArray(c.pagamentos) ? c.pagamentos.reduce((acc, p) => acc + Number(p.valor || 0), 0) : 0;
          return (val - pagos) > 0;
        });

        if (pendentes.length === 0) {
          outMessage = `✅ Todas as contas de *"${terc.nome}"* já estão quitadas!`;
        } else {
          const targetConta = pendentes[0];
          const valPago = Number(args.valor_pago || args.valor || targetConta.valor);
          if (!Array.isArray(targetConta.pagamentos)) targetConta.pagamentos = [];
          targetConta.pagamentos.push({ data: todayStr, hora: '12:00', valor: valPago });

          await ck('POST', '/api/finance/transactions', {
            profile_id: profileId,
            type: 'EXPENSE',
            amount: valPago,
            description: `Pagamento: ${targetConta.nomeConta} (${terc.nome})`,
            status: 'PAID',
            transaction_date: todayStr
          });

          await ck('PUT', '/api/finance/king-data', {
            profile_id: profileId,
            data: {
              dividas: kd.dividas || [],
              terceiros: kd.terceiros,
              trabalhos: kd.trabalhos || [],
              bens: kd.bens || []
            }
          });

          const s = await fetchRealSummary(profileId);
          outMessage = `✅ *Baixa na Dívida Registrada com Sucesso!*\n\n` +
            `👤 *Credor:* ${terc.nome}\n` +
            `📝 *Conta:* ${targetConta.nomeConta}\n` +
            `💵 *Valor Pago:* ${fmt(valPago)}\n\n` +
            `${buildSummaryMessage(s, fmt)}`;
        }
      }
    } else if (action === 'cancel_last') {
      const recent = await ck('GET', '/api/finance/transactions?limit=1&orderDir=DESC&orderBy=created_at');
      const list = (recent.body && (recent.body.data || recent.body)) || [];
      const arr = Array.isArray(list) ? list : (list && Array.isArray(list.data) ? list.data : []);
      if (arr.length > 0) {
        await ck('DELETE', `/api/finance/transactions/${arr[0].id}`);
        const s = await fetchRealSummary(profileId);
        outMessage = `🗑️ *Último Lançamento Cancelado com Sucesso!*\n\n` +
          `Foi excluído: *${arr[0].description}* (${fmt(arr[0].amount)})\n\n` +
          `${buildSummaryMessage(s, fmt)}`;
      } else {
        outMessage = '⚠️ Nenhuma transação recente encontrada para cancelar.';
      }
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
