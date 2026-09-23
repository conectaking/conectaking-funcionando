#!/usr/bin/env python3
"""
patch-finance-realtime.py
==========================
Correções do Bot IA (Admin Telegram @conectaking_bot):
1. Distinção correta: Trabalhos (aba Trabalhos via /api/finance/king-data) vs Fluxo (receitas/despesas avulsas).
2. Tratamento de entrada/sinal: Trabalhos com valor total e entrada (AV) armazenam entrada em pagamentos e restante em falta receber.
3. Resumo financeiro em tempo real: calcula os valores exatos da Gestão Financeira (Fluxo + Trabalhos + Terceiros).
4. Fallback de rede interna: usa http://conectaking-laravel:8080 dentro da rede Docker (conectaking_cknet) para evitar bloqueio 403 do Cloudflare WAF.
5. Remoção/cancelamento e ajuste de saldo funcionam em tempo real.

Aplica SOMENTE no nó "Executar Admin" do workflow n8n.
"""
import json, os, sqlite3, time, uuid

DB   = '/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'
MAIN = 'mkK244lveO0N1qPR'

EXEC_ADMIN_JS = r'''const prev = $input.first().json;
let base = String($env.CK_INTERNAL_URL || $env.CK_BASE_URL || 'http://conectaking-laravel:8080').replace(/\/$/, '');
if (base.includes('conectaking.com.br')) {
  base = 'http://conectaking-laravel:8080';
}
const token = String($env.CK_AGENT_JWT || '').trim();
const openaiKey = String($env.OPENAI_API_KEY || '').trim();
const model = String($env.OPENAI_MODEL || 'gpt-4o-mini').trim();
const text = String(prev.text || '').trim();
const chatId = String(prev.chatId || '');
const hadVoice = !!prev.hadVoice;

async function ck(method, path, body) {
  const opts = {
    method, url: base + path,
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
    json: true, returnFullResponse: true, ignoreHttpStatusErrors: true
  };
  if (body !== undefined) opts.body = body;
  return this.helpers.httpRequest.call(this, opts);
}

async function openaiCall(payload) {
  return this.helpers.httpRequest.call(this, {
    method: 'POST', url: 'https://api.openai.com/v1/chat/completions',
    headers: { 'Authorization': 'Bearer ' + openaiKey, 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: payload, json: true, returnFullResponse: true, ignoreHttpStatusErrors: true
  });
}

const store = $getWorkflowStaticData('global');
if (!store.chats) store.chats = {};
if (!store.chats[chatId]) store.chats[chatId] = { history: [], lastCreatedTransactions: [] };
const session = store.chats[chatId];
if (!session.history) session.history = [];
if (!session.lastCreatedTransactions) session.lastCreatedTransactions = [];

// ─── Resolve o profile ID primário ─────────────────────────────────────────
async function resolveProfileId() {
  try {
    const r = await ck.call(this, 'GET', '/api/finance/profiles');
    const list = (r.body && (r.body.data || r.body.profiles || r.body)) || [];
    const arr = Array.isArray(list) ? list : (Array.isArray(list.data) ? list.data : []);
    const primary = arr.find(p => p && (p.is_primary === true || p.isPrimary === true));
    const active  = arr.find(p => p && (p.is_active !== false && p.isActive !== false));
    const pick = primary || active || arr[0];
    return pick ? Number(pick.id) : 1;
  } catch (_) { return 1; }
}

// ─── Busca transações recentes — trata response paginado E array simples ────
async function fetchRecentTransactions(limitN) {
  const r = await ck.call(this, 'GET', `/api/finance/transactions?limit=${limitN}&orderDir=DESC&orderBy=created_at&per_page=${limitN}`);
  const raw = r.body;
  if (!raw) return [];
  const inner = raw.data != null ? raw.data : raw;
  if (Array.isArray(inner)) return inner;
  if (inner && Array.isArray(inner.data)) return inner.data;
  return [];
}

// ─── Busca resumo financeiro unificado (Fluxo + Trabalhos + Terceiros) ──────
async function fetchRealSummary(profileId) {
  const pid = profileId || 1;
  const [dashR, kingR] = await Promise.all([
    ck.call(this, 'GET', `/api/finance/dashboard?profile_id=${pid}`),
    ck.call(this, 'GET', `/api/finance/king-data?profile_id=${pid}`)
  ]);

  const dash = (dashR.body && dashR.body.data) ? dashR.body.data : (dashR.body || {});
  const kingDb = (kingR.body && kingR.body.data) ? kingR.body.data : (kingR.body || {});

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const mesRef = currentYear + '-' + String(currentMonth + 1).padStart(2, '0');

  const trabalhos = Array.isArray(kingDb.trabalhos) ? kingDb.trabalhos : [];
  let totalRecebidoTrabalhosNoMes = 0;
  let totalFaltaReceberTrabalhos = 0;

  for (const t of trabalhos) {
    const val = Number(t.valor) || 0;
    const pagamentos = Array.isArray(t.pagamentos) ? t.pagamentos : [];
    let recebidoT = 0;
    for (const p of pagamentos) {
      const v = Number(p.valor) || 0;
      recebidoT += v;
      const dt = String(p.data || t.data || '').trim().slice(0, 7);
      if (dt === mesRef) {
        totalRecebidoTrabalhosNoMes += v;
      }
    }
    const falta = Math.max(0, val - recebidoT);
    totalFaltaReceberTrabalhos += falta;
  }

  const terceiros = Array.isArray(kingDb.terceiros) ? kingDb.terceiros : [];
  let totalFaltaPagarTerceirosNoMes = 0;
  for (const p of terceiros) {
    for (const c of (p.contas || [])) {
      const dtVenc = String(c.dataVencimento || '').trim().slice(0, 7);
      if (dtVenc === mesRef) {
        const valC = Number(c.valor) || 0;
        const pagoC = (c.pagamentos || []).reduce((s, x) => s + (Number(x.valor) || 0), 0);
        totalFaltaPagarTerceirosNoMes += Math.max(0, valC - pagoC);
      }
    }
  }

  // dash da API Conecta King já consolida transações + trabalhos + terceiros
  const saldoDisponivel = Number(dash.saldoDisponivel !== undefined ? dash.saldoDisponivel : dash.accountBalance) || 0;
  const totalRecebidoGeral = Number(dash.totalRecebido !== undefined ? dash.totalRecebido : dash.totalIncomePaid) || 0;
  const totalDespesasPagas = Number(dash.totalPago !== undefined ? dash.totalPago : dash.totalExpensePaid) || 0;
  const faltaReceberGeral = Number(dash.pendenciasReceber !== undefined ? dash.pendenciasReceber : dash.pendingIncome) || 0;
  const faltaPagarGeral = Number(dash.pendenciasPagar !== undefined ? dash.pendenciasPagar : dash.pendingExpense) || 0;
  const balancoMensal = totalRecebidoGeral - totalDespesasPagas;

  return {
    saldoDisponivel,
    totalRecebido: totalRecebidoGeral,
    totalPago: totalDespesasPagas,
    balancoMensal,
    pendenciasReceber: faltaReceberGeral,
    pendenciasPagar: faltaPagarGeral,
    trabalhosCount: trabalhos.length,
    totalRecebidoTrabalhosNoMes,
    totalFaltaReceberTrabalhos,
    kingDb
  };
}

function buildSummaryMessage(summary, fmt) {
  return `📊 *Resumo Geral das Suas Finanças*\n_(atualizado em tempo real)_\n\n` +
    `💰 *Dinheiro em Caixa (Disponível):* ${fmt(summary.saldoDisponivel)}\n` +
    `📈 *Receitas Recebidas (Mês):* ${fmt(summary.totalRecebido)}\n` +
    `📉 *Despesas Pagas (Mês):* ${fmt(summary.totalPago)}\n` +
    `⚖️ *Balanço Líquido do Mês:* ${fmt(summary.balancoMensal)}\n` +
    `⏳ *Valores a Receber (Falta Receber):* ${fmt(summary.pendenciasReceber)}\n` +
    `📑 *Contas a Pagar (Falta Pagar):* ${fmt(summary.pendenciasPagar)}\n` +
    `💼 *Total de Trabalhos Ativos:* ${summary.trabalhosCount}`;
}

const KB = `CONHECIMENTO EXECUTIVO CONECTA KING & ESTÚDIO ADRIANO KING:
- Dono e CEO: Adriano King (@adrianokingg, WhatsApp 11988789417).
- Estúdio Adriano King (Barueri-SP): Posicionamento de Imagem 20 fotos R$1.000 / 30 fotos R$1.400. Ensaio 10 fotos R$300 / 20 fotos R$550 / 30 fotos R$800.
- Plataforma Conecta King: cartões virtuais dinâmicos, tags/pulseiras NFC, King Forms, King Selection, Gestão Financeira integrada.
- Planos Conecta King: Start R$70, Prime R$100, Essential R$150, Finance R$170, Finance Plus R$200, Premium Plus R$220, Corporate R$230.`;

const SYSTEM_PROMPT = `Você é o Assistente Executivo e CFO de Elite pessoal do Adriano King.
Atende exclusivamente o King no Telegram. Tom: direto, ágil, executivo, resolutivo. Sem enrolação.

${KB}

═══ REGRAS FUNDAMENTAIS DE GESTÃO FINANCEIRA ═══

1. TRABALHO (cliente, ensaio, foto, fotografia, evento, corporativo, posicionamento de imagem, job):
   - DEVE SER REGISTRADO NA ABA TRABALHOS usando a action "create_trabalho".
   - NUNCA crie transações duplicadas no Fluxo quando for um trabalho!
   - Se o King disser: "Peguei um trabalho de 1000 e o cliente deu 200 de entrada":
     -> action: "create_trabalho", valor_total: 1000, entrada: 200.
     -> O sistema armazena o Trabalho com valor R$ 1.000, credita R$ 200 como recebido/entrada (vai para o caixa), e os R$ 800 restantes ficam como Falta Receber.
   - Se o trabalho não teve entrada ainda: entrada: 0 (fica 100% pendente a receber).

2. FLUXO (receita avulsa ou despesa avulsa):
   - Se o King falar: "vendi uma tag por 50", "recebi 100", "lança receita de 300", "gastei 45 no almoço", "comprei equipamento por 800":
     -> Use a action "create" (INCOME ou EXPENSE, status PAID ou PENDING).

3. RESUMO COMPLETO EM TEMPO REAL:
   - Sempre que o King pedir "resumo", "como estão minhas finanças", "quanto tenho", "balanço":
     -> USE a action "summary". O sistema busca em TEMPO REAL os dados da API (Fluxo + Trabalhos + Terceiros).
     -> NUNCA invente números da memória nem repita valores antigos!

4. REMOVER / CANCELAR LANÇAMENTO:
   - "tira o de R$ X", "apaga os R$ X", "coloquei errado", "remove":
     -> Use action "delete_by_criteria" ou "cancel_last".

5. AJUSTAR SALDO:
   - "o caixa correto é R$ X" -> use action "adjust_cash".`;

const TOOLS = [
  { type: 'function', function: { name: 'manage_finance', description: 'Gerencia finanças do King: trabalhos, lançamentos de fluxo, resumo real, remoção, ajuste de saldo e consultoria.', parameters: { type: 'object', properties: {
    action: { type: 'string', enum: ['create', 'create_trabalho', 'cancel_last', 'delete_by_criteria', 'list_recent', 'adjust_cash', 'summary', 'advice'] },
    // Para Trabalhos:
    cliente: { type: 'string', description: 'Nome do cliente do trabalho' },
    servico: { type: 'string', description: 'Tipo de serviço (ex: Posicionamento de Imagem, Ensaio, Cobertura)' },
    valor_total: { type: 'number', description: 'Valor total cobrado pelo trabalho' },
    entrada: { type: 'number', description: 'Valor de entrada recebido agora (AV/sinal). 0 se não recebeu nada agora.' },
    data_prevista: { type: 'string', description: 'Data prevista para quitação (YYYY-MM-DD)' },
    // Para Fluxo:
    transactions: { type: 'array', items: { type: 'object', properties: {
      type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
      amount: { type: 'number' }, status: { type: 'string', enum: ['PAID', 'PENDING'] },
      description: { type: 'string' }
    }, required: ['type', 'amount', 'status', 'description'] } },
    criteria: { type: 'object', properties: {
      amount: { type: 'number', description: 'Valor exato a procurar e deletar' },
      description_contains: { type: 'string', description: 'Texto parcial da descrição' },
      type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'any'] }
    } },
    target_cash: { type: 'number', description: 'Saldo desejado em caixa para adjust_cash' },
  }, required: ['action'] } } },
  { type: 'function', function: { name: 'check_system_errors', description: 'Verifica erros de páginas e health do sistema.', parameters: { type: 'object', properties: { detail: { type: 'boolean' } } } } },
  { type: 'function', function: { name: 'generate_invite_code', description: 'Gera código de registro KING-XXXXX.', parameters: { type: 'object', properties: { custom_code: { type: 'string' } }, required: ['custom_code'] } } }
];

let outMessage = '';
let summaryMessageToSend = null;

try {
  if (!openaiKey) {
    outMessage = '⚠️ OPENAI_API_KEY não configurada no servidor.';
  } else {
    const inputForAi = (hadVoice ? '[áudio transcrito] ' : '') + text;
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...session.history.slice(-8),
      { role: 'user', content: inputForAi }
    ];

    const completionRes = await openaiCall.call(this, { model, temperature: 0.1, messages, tools: TOOLS, tool_choice: 'auto' });
    const choice = completionRes.body?.choices?.[0]?.message;

    if (choice?.tool_calls && choice.tool_calls.length > 0) {
      const toolCall = choice.tool_calls[0];
      const fnName = toolCall.function.name;
      let args = {};
      try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch (_) {}

      if (fnName === 'manage_finance') {
        const profileId = await resolveProfileId.call(this);
        const today = new Date().toISOString().slice(0, 10);
        const fmt = v => `R$ ${Number(v ?? 0).toFixed(2).replace('.', ',')}`;

        // ── CREATE TRABALHO (Aba Trabalhos do King-Data) ────────────
        if (args.action === 'create_trabalho') {
          const valorTotal = Number(args.valor_total || args.amount || 0);
          const entrada = Number(args.entrada || 0);
          const cliente = String(args.cliente || 'Cliente').trim();
          const servico = String(args.servico || 'Trabalho fotográfico').trim();
          const dataPrevista = args.data_prevista || '';

          if (valorTotal <= 0) {
            outMessage = '⚠️ Informe o valor total do trabalho.';
          } else {
            // 1. Obter king-data atual
            const kRes = await ck.call(this, 'GET', `/api/finance/king-data?profile_id=${profileId}`);
            let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
            if (!kingDb || typeof kingDb !== 'object') kingDb = {};
            if (!Array.isArray(kingDb.trabalhos)) kingDb.trabalhos = [];

            const now = new Date();
            const hora = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
            const pagamentos = entrada > 0 ? [{ valor: entrada, data: today, hora }] : [];

            const novoTrab = {
              id: 'trab_' + Date.now(),
              cliente,
              servico,
              valor: valorTotal,
              pagamentos,
              data: today,
              dataPrevista,
              status: entrada >= valorTotal ? 'concluido' : (entrada > 0 ? 'parcial' : 'pendente')
            };

            kingDb.trabalhos.unshift(novoTrab);

            // 2. Salvar king-data atualizado
            await ck.call(this, 'PUT', `/api/finance/king-data?profile_id=${profileId}`, {
              profile_id: profileId,
              data: kingDb
            });

            // 3. Buscar resumo atualizado em tempo real
            const summary = await fetchRealSummary.call(this, profileId);
            const falta = Math.max(0, valorTotal - entrada);

            outMessage = `👑 *Novo Trabalho Registrado com Sucesso!*\n\n` +
              `👤 *Cliente:* ${cliente}\n` +
              `📸 *Serviço:* ${servico}\n` +
              `💰 *Valor Total:* ${fmt(valorTotal)}\n` +
              `✅ *Entrada Recebida (AV):* ${fmt(entrada)} ${entrada > 0 ? '_(em caixa)_' : '_(sem entrada imediata)_'}\n` +
              `⏳ *Falta Receber deste Trabalho:* ${fmt(falta)}`;
            summaryMessageToSend = buildSummaryMessage(summary, fmt);
          }

        // ── CREATE FLUXO (Receitas/Despesas Avulsas) ─────────────────
        } else if (args.action === 'create' && Array.isArray(args.transactions) && args.transactions.length > 0) {
          const createdItems = [];
          for (const item of args.transactions) {
            if (!item.amount || item.amount <= 0) continue;
            const payload = { profile_id: profileId, type: item.type || 'INCOME', amount: Number(item.amount), status: item.status || 'PAID', description: item.description || 'Lançamento via bot', transaction_date: today };
            const cr = await ck.call(this, 'POST', '/api/finance/transactions', payload);
            if (cr.statusCode >= 200 && cr.statusCode < 300) {
              const data = (cr.body && cr.body.data) || {};
              createdItems.push({ id: data.id, type: payload.type, amount: payload.amount, status: payload.status, description: payload.description });
            }
          }
          if (createdItems.length > 0) {
            session.lastCreatedTransactions = createdItems;
            const summary = await fetchRealSummary.call(this, profileId);
            const lines = ['👑 *Lançamento Financeiro Concluído!*\n'];
            for (const it of createdItems) {
              const icon = it.type === 'INCOME' ? '💵' : '💸';
              const lbl = it.status === 'PAID' ? (it.type === 'INCOME' ? 'Recebido em caixa' : 'Pago') : 'Pendente (A receber)';
              lines.push(`${icon} *${it.type === 'INCOME' ? 'Receita' : 'Despesa'}:* ${fmt(it.amount)} (${lbl})\n   📝 _${it.description}_`);
            }
            outMessage = lines.join('\n');
            summaryMessageToSend = buildSummaryMessage(summary, fmt);
          } else {
            outMessage = '⚠️ Não consegui registrar os valores. Tente novamente.';
          }

        // ── CANCEL LAST ─────────────────────────────────────────────
        } else if (args.action === 'cancel_last') {
          let targetIds = (session.lastCreatedTransactions || []).map(t => t.id).filter(Boolean);
          if (targetIds.length === 0) {
            const recent = await fetchRecentTransactions.call(this, 3);
            if (recent.length > 0) targetIds = [recent[0].id];
          }
          if (targetIds.length === 0) {
            const recent2 = await fetchRecentTransactions.call(this, 5);
            if (recent2.length > 0) {
              const lines = recent2.map((t, i) => `${i + 1}. ${t.type === 'INCOME' ? '💵' : '💸'} ${fmt(t.amount)} — _${t.description}_ (${t.status})`);
              outMessage = '⚠️ Não encontrei o último lançamento em memória. Seus 5 mais recentes:\n\n' + lines.join('\n') + '\n\nMe fala qual quer cancelar (valor ou número).';
            } else {
              outMessage = '⚠️ Nenhuma transação encontrada na API. Tente novamente.';
            }
          } else {
            for (const id of targetIds) await ck.call(this, 'DELETE', `/api/finance/transactions/${id}`);
            session.lastCreatedTransactions = [];
            const summary = await fetchRealSummary.call(this, profileId);
            outMessage = `🗑️ *Lançamento Cancelado com Sucesso!*\nRemovi o lançamento anterior.`;
            summaryMessageToSend = buildSummaryMessage(summary, fmt);
          }

        // ── DELETE BY CRITERIA (valor ou descrição) ──────────────────
        } else if (args.action === 'delete_by_criteria') {
          const crit = args.criteria || {};
          const recent = await fetchRecentTransactions.call(this, 30);
          let targets = recent.filter(t => {
            const amountMatch = crit.amount ? Math.abs(Number(t.amount) - crit.amount) < 0.02 : true;
            const descMatch = crit.description_contains
              ? String(t.description || '').toLowerCase().includes(String(crit.description_contains).toLowerCase())
              : true;
            const typeMatch = (crit.type && crit.type !== 'any') ? t.type === crit.type : true;
            return amountMatch && descMatch && typeMatch;
          });

          if (targets.length === 0) {
            const listLines = recent.slice(0, 8).map((t, i) =>
              `${i + 1}. ${t.type === 'INCOME' ? '💵' : '💸'} ${fmt(t.amount)} — _${t.description}_ (${t.status}) [ID ${t.id}]`
            );
            outMessage = `⚠️ Não encontrei ${fmt(crit.amount)} nos lançamentos recentes do Fluxo.\n\n📋 *Lançamentos recentes:*\n${listLines.join('\n')}`;
          } else {
            const deleted = [];
            for (const t of targets.slice(0, 3)) {
              const dr = await ck.call(this, 'DELETE', `/api/finance/transactions/${t.id}`);
              if (dr.statusCode >= 200 && dr.statusCode < 300) deleted.push(t);
            }
            session.lastCreatedTransactions = [];
            const summary = await fetchRealSummary.call(this, profileId);
            const lines = deleted.map(t => `• ${fmt(t.amount)} — ${t.description}`);
            outMessage = `🗑️ *Lançamento(s) Removido(s):*\n${lines.join('\n')}`;
            summaryMessageToSend = buildSummaryMessage(summary, fmt);
          }

        // ── LIST RECENT ──────────────────────────────────────────────
        } else if (args.action === 'list_recent') {
          const recent = await fetchRecentTransactions.call(this, 10);
          if (recent.length === 0) {
            outMessage = '📋 Nenhum lançamento encontrado ainda no fluxo.';
          } else {
            const lines = recent.map((t, i) => {
              const icon = t.type === 'INCOME' ? '💵' : '💸';
              const val = fmt(t.amount);
              const lbl = t.status === 'PAID' ? 'Pago/Recebido' : 'Pendente';
              return `${i + 1}. ${icon} ${val} — _${t.description}_ (${lbl})`;
            });
            outMessage = `📋 *Últimos Lançamentos Reais:*\n\n${lines.join('\n')}`;
          }

        // ── ADJUST CASH ──────────────────────────────────────────────
        } else if (args.action === 'adjust_cash') {
          const targetCash = Number(args.target_cash || 0);
          const summary = await fetchRealSummary.call(this, profileId);
          const currentCash = Number(summary.saldoDisponivel ?? 0);
          const diff = targetCash - currentCash;
          if (Math.abs(diff) < 0.01) {
            outMessage = `✅ Saldo em caixa já está em ${fmt(targetCash)}. Nenhum ajuste necessário.`;
          } else {
            const adjType = diff > 0 ? 'INCOME' : 'EXPENSE';
            const adjDesc = 'Ajuste de saldo (correção)';
            const cr = await ck.call(this, 'POST', '/api/finance/transactions', { profile_id: profileId, type: adjType, amount: Math.abs(diff), status: 'PAID', description: adjDesc, transaction_date: today });
            const row = (cr.body && cr.body.data) || {};
            if (row.id) session.lastCreatedTransactions = [{ id: row.id, type: adjType, amount: Math.abs(diff), status: 'PAID', description: adjDesc }];
            const summary2 = await fetchRealSummary.call(this, profileId);
            outMessage = `🔄 *Saldo Ajustado com Sucesso!*\n\nAntes: ${fmt(currentCash)}\nAgora: ${fmt(summary2.saldoDisponivel)}\n\n📝 _Ajuste de ${diff > 0 ? '+' : ''}${fmt(diff)} aplicado._`;
            summaryMessageToSend = buildSummaryMessage(summary2, fmt);
          }

        // ── SUMMARY (EM TEMPO REAL) ──────────────────────────────────
        } else if (args.action === 'summary') {
          const summary = await fetchRealSummary.call(this, profileId);
          outMessage = buildSummaryMessage(summary, fmt);

        // ── ADVICE (Consultoria) ──────────────────────────────────────
        } else if (args.action === 'advice') {
          const summary = await fetchRealSummary.call(this, profileId);
          const finCtx = `Dados financeiros reais do King:
- Caixa disponível: R$ ${summary.saldoDisponivel.toFixed(2)}
- Receitas recebidas no mês: R$ ${summary.totalRecebido.toFixed(2)}
- Despesas pagas no mês: R$ ${summary.totalPago.toFixed(2)}
- Falta receber: R$ ${summary.pendenciasReceber.toFixed(2)}
- Contas a pagar: R$ ${summary.pendenciasPagar.toFixed(2)}
- Trabalhos ativos: ${summary.trabalhosCount}
- Ticket médio Posicionamento de Imagem: R$ 1.200 (entre 1.000 e 1.400)
- Ticket médio Ensaio Fotográfico: R$ 550

Dê um conselho CFO de elite, tático e prático. Seja direto. Fale em PT-BR, sem enrolação.`;
          const advRes = await openaiCall.call(this, {
            model, temperature: 0.5, max_tokens: 600,
            messages: [{ role: 'system', content: 'Você é um CFO de elite e consultor de faturamento para empreendedores criativos e CEOs. Seja direto, analítico e dê conselhos práticos.' }, { role: 'user', content: finCtx }]
          });
          const advice = String(advRes.body?.choices?.[0]?.message?.content || '').trim();
          outMessage = `👑 *Consultoria de Faturamento — King Assistente*\n\n${advice}`;
        }

      // ── DIAGNÓSTICO DO SISTEMA ────────────────────────────────────────────
      } else if (fnName === 'check_system_errors') {
        const h = await ck.call(this, 'GET', '/health');
        const ok = h.statusCode === 200 && h.body?.status === 'ok';
        let errorsMsg = '';
        try {
          const errR = await ck.call(this, 'GET', '/api/admin/system/recent-errors?limit=10');
          const summary = errR.body?.summary;
          const errors = errR.body?.errors || [];
          if (summary && summary.total_errors_24h > 0) {
            errorsMsg = `\n\n⚠️ *Erros de Páginas (24h):* ${summary.total_errors_24h}\n`;
            const byPage = summary.pages_breakdown || {};
            for (const [page, count] of Object.entries(byPage).slice(0, 5)) {
              errorsMsg += `• \`${page}\` — ${count} vez(es)\n`;
            }
            if (errors.length > 0) {
              const last = errors[0];
              errorsMsg += `\nÚltimo: _${last.message}_ em \`${last.path}\` (${last.timestamp})`;
            }
          } else {
            errorsMsg = '\n\n✅ *Nenhum erro de página nas últimas 24h.*';
          }
        } catch (_) {
          errorsMsg = '\n\n_Diagnóstico de páginas indisponível._';
        }
        outMessage = `🟢 *Diagnóstico do Sistema:*\n• *Status:* ${ok ? '100% Operacional ✅' : 'Atenção ⚠️'}\n• *HTTP:* ${h.statusCode}\n• *Laravel:* ${ok ? 'Ativo' : 'Com problemas'}` + errorsMsg;

      // ── GERAR CÓDIGO ─────────────────────────────────────────────────────
      } else if (fnName === 'generate_invite_code') {
        const code = String(args.custom_code || '').toUpperCase().trim();
        const r = await ck.call(this, 'POST', '/api/admin/codes/generate-manual', { customCode: code, expiresAt: null });
        if (r.statusCode >= 200 && r.statusCode < 300) {
          outMessage = `🎟️ *Código Gerado:* \`${code}\`\n_Disponível em /registro._`;
        } else {
          outMessage = `⚠️ Falha: ${JSON.stringify(r.body).slice(0, 200)}`;
        }
      }

    } else {
      outMessage = choice?.content || 'Olá King! Como posso ajudar?';
    }

    session.history.push({ role: 'user', content: inputForAi });
    session.history.push({ role: 'assistant', content: outMessage + (summaryMessageToSend ? '\n\n' + summaryMessageToSend : '') });
    if (session.history.length > 12) session.history.splice(0, 2);
  }
} catch (e) {
  outMessage = '⚠️ Erro: ' + String(e.message || e).slice(0, 300);
}

if (summaryMessageToSend) {
  return [
    { json: { ...prev, outMessage } },
    { json: { ...prev, outMessage: summaryMessageToSend } }
  ];
}

return [{ json: { ...prev, outMessage } }];'''

# ──────────────────────────────────────────────────────────────────────────────

def upsert_active(cur, wf_id, nodes, connections, settings, name):
    now        = time.strftime('%Y-%m-%d %H:%M:%S.000')
    version_id = str(uuid.uuid4())
    nodes_s    = json.dumps(nodes,       ensure_ascii=False)
    conn_s     = json.dumps(connections, ensure_ascii=False)
    sett_s     = json.dumps(settings,    ensure_ascii=False)
    cur.execute(
        '''UPDATE workflow_entity
           SET nodes=?, connections=?, settings=?, versionId=?, activeVersionId=?,
               active=1, updatedAt=?, versionCounter=COALESCE(versionCounter,0)+1
           WHERE id=?''',
        (nodes_s, conn_s, sett_s, version_id, version_id, now, wf_id),
    )
    cur.execute(
        '''INSERT OR REPLACE INTO workflow_history
           (versionId, workflowId, authors, createdAt, updatedAt, nodes, connections, name, autosaved, description, nodeGroups)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
        (version_id, wf_id, 'system', now, now, nodes_s, conn_s, name, 0, None, '[]'),
    )
    print(f'[OK] Novo activeVersionId → {version_id}')


def main():
    conn = sqlite3.connect(DB)
    cur  = conn.cursor()
    row  = cur.execute(
        'SELECT nodes, connections, settings, name FROM workflow_entity WHERE id=?', (MAIN,)
    ).fetchone()
    if not row:
        print(f'[ERRO] Workflow {MAIN} não encontrado.')
        conn.close()
        return

    nodes       = json.loads(row[0])
    connections = json.loads(row[1])
    settings    = json.loads(row[2] or '{}')
    wf_name     = row[3]

    patched = False
    for n in nodes:
        if n.get('name') == 'Executar Admin':
            p = n.setdefault('parameters', {})
            p['jsCode'] = EXEC_ADMIN_JS
            patched = True
            print(f'[OK] Executar Admin → {len(EXEC_ADMIN_JS)} chars')
            print('     create_trabalho: OK')
            print('     fetchRealSummary: OK')
            print('     base url fallback interno: OK')
            break

    if not patched:
        print('[AVISO] Nó "Executar Admin" não encontrado.')
        return

    upsert_active(cur, MAIN, nodes, connections, settings, wf_name)
    conn.commit()
    conn.close()

    try:
        os.chown(DB, 1000, 1000)
    except Exception:
        pass

    print('\n✅ Patch de correção financeira com suporte a Trabalhos aplicado!')
    print('   Execute: docker compose up -d n8n')


if __name__ == '__main__':
    main()
