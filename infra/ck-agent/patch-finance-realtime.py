#!/usr/bin/env python3
"""
patch-finance-realtime.py
==========================
Atualização do Bot IA (Admin Telegram @conectaking_bot - Agente King):
1. Nome do Bot: Agente King (em todas as mensagens, saudações e personas).
2. Agenda & Google Agenda DIRETO: inserção direta via Google Calendar API (n8n-nodes-base.googleCalendar).
3. Lembretes com Aviso: registro de lembretes que notificam no Telegram no horário exato e gravam no Google Agenda.
4. Finanças em Tempo Real: Trabalhos (king-data), Fluxo, Resumo completo, Ajuste de saldo e Cancelamento.
5. Rotina periódica: checagem de lembretes a cada 5 min com disparo de notificação no Telegram do King.
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
  return `📊 *Resumo Geral das Suas Finanças — Agente King*\n_(atualizado em tempo real)_\n\n` +
    `💰 *Dinheiro em Caixa (Disponível):* ${fmt(summary.saldoDisponivel)}\n` +
    `📈 *Receitas Recebidas (Mês):* ${fmt(summary.totalRecebido)}\n` +
    `📉 *Despesas Pagas (Mês):* ${fmt(summary.totalPago)}\n` +
    `⚖️ *Balanço Líquido do Mês:* ${fmt(summary.balancoMensal)}\n` +
    `⏳ *Valores a Receber (Falta Receber):* ${fmt(summary.pendenciasReceber)}\n` +
    `📑 *Contas a Pagar (Falta Pagar):* ${fmt(summary.pendenciasPagar)}\n` +
    `💼 *Total de Trabalhos Ativos:* ${summary.trabalhosCount}`;
}

// ─── Gerador de Link Direto para o Google Agenda (Fallback 1-toque) ─────────
function makeGoogleCalendarUrl(titulo, data, horaInicio, horaFim, descricao, local) {
  const dClean = String(data || '').replace(/-/g, '');
  const hInicioClean = String(horaInicio || '09:00').replace(/:/g, '').padEnd(4, '0') + '00';
  let hFimClean = String(horaFim || '').replace(/:/g, '');
  if (!hFimClean) {
    const parts = String(horaInicio || '09:00').split(':');
    const endH = String(Math.min(23, Number(parts[0]) + 1)).padStart(2, '0');
    hFimClean = endH + (parts[1] || '00') + '00';
  } else {
    hFimClean = hFimClean.padEnd(4, '0') + '00';
  }
  const dates = `${dClean}T${hInicioClean}/${dClean}T${hFimClean}`;
  const p = [];
  p.push('action=TEMPLATE');
  p.push('text=' + encodeURIComponent(titulo || 'Compromisso - Adriano King'));
  p.push('dates=' + dates);
  p.push('details=' + encodeURIComponent((descricao ? descricao + '\n\n' : '') + 'Agendado pelo Agente King'));
  if (local) p.push('location=' + encodeURIComponent(local));
  p.push('ctz=America/Sao_Paulo');
  return 'https://calendar.google.com/calendar/render?' + p.join('&');
}

const KB = `CONHECIMENTO EXECUTIVO CONECTA KING & ESTÚDIO ADRIANO KING:
- Dono e CEO: Adriano King (@adrianokingg, WhatsApp 11988789417).
- Estúdio Adriano King (Barueri-SP): Posicionamento de Imagem 20 fotos R$1.000 / 30 fotos R$1.400. Ensaio 10 fotos R$300 / 20 fotos R$550 / 30 fotos R$800.
- Plataforma Conecta King: cartões virtuais dinâmicos, tags/pulseiras NFC, King Forms, King Selection, Gestão Financeira integrada.
- Planos Conecta King: Start R$70, Prime R$100, Essential R$150, Finance R$170, Finance Plus R$200, Premium Plus R$220, Corporate R$230.`;

// Data e hora de Brasília
const nowSp = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
const diaSemanaNomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const diaSemanaAtual = diaSemanaNomes[nowSp.getDay()];
const dataHojeISO = nowSp.toISOString().slice(0, 10);
const horaAtualSp = String(nowSp.getHours()).padStart(2, '0') + ':' + String(nowSp.getMinutes()).padStart(2, '0');
const dataHojeBr = String(nowSp.getDate()).padStart(2, '0') + '/' + String(nowSp.getMonth() + 1).padStart(2, '0') + '/' + nowSp.getFullYear();

const SYSTEM_PROMPT = `Você é o Agente King, o Assistente Executivo Pessoal e CFO de Elite do Adriano King.
Você atende exclusivamente o Adriano King no Telegram.
SEU NOME É RIGOROSAMENTE AGENTE KING. Sempre se identifique e se refira como "Agente King".
Tom de voz: executivo de altíssimo nível, direto, dinâmico, solícito, confiante e resolutivo. Sem enrolação.

Data e hora atual de Brasília: ${diaSemanaAtual}, ${dataHojeBr} (${dataHojeISO}) às ${horaAtualSp}. Fuso: America/Sao_Paulo.
Ano de referência obrigatório: 2026. SEMPRE use o ano 2026 para agendamentos e compromissos. NUNCA use anos passados como 2023, 2024 ou 2025.

${KB}

═══ SUAS HABILIDADES & REGRAS PRINCIPAIS ═══

1. AGENDA, LEMBRETES & GOOGLE AGENDA:
   - Você gerencia e agenda diretamente na Google Agenda do Adriano.
   - O Adriano pode te pedir por áudio ou texto para AGENDAR compromissos, reuniões, ensaios fotográficos ou CRIAR LEMBRETES (ex: ir para a academia, pagar contas, ligar para alguém, enviar propostas, etc.).
   - Se o Adriano perguntar se você consegue agendar no Google Agenda ou mandar lembretes, responda afirmativamente e com entusiasmo:
     "Com certeza, Adriano! Eu sou o seu Agente King e cuido da sua agenda e dos seus lembretes.
     Você não precisa preencher nada, basta falar por áudio ou mandar por texto, por exemplo:
     • 'Agenda um ensaio com a Larissa amanhã às 14h'
     • 'Me lembra de ir para a academia hoje às 17h'
     • 'Agenda uma reunião na segunda às 15h'
     • 'Qual é a minha agenda de hoje?'
     
     Eu gravo diretamente na sua Google Agenda e também te aviso aqui no Telegram no horário marcado!"
   - Ao agendar compromissos ou lembretes, SEMPRE use a tool "manage_agenda":
     * Reuniões, ensaios, eventos, compromissos -> action: "create_event"
     * Lembretes com aviso no horário -> action: "create_reminder"
     * Consultar agenda ou lembretes -> action: "list_agenda"
     * Cancelar compromisso -> action: "delete_agenda"
   - Calcule datas relativas com precisão baseando-se na data atual (${diaSemanaAtual}, ${dataHojeBr}):
     * "hoje" = ${dataHojeISO}
     * "amanhã" = data do dia seguinte
     * "sexta-feira", "segunda-feira" = próximo dia correspondente.
     * Duração padrão de ensaio fotográfico: 2 horas. Academia / Reuniões / outros: 1 hora.

2. GESTÃO FINANCEIRA & TRABALHOS:
   - TRABALHOS (cliente, ensaio, foto, fotografia, evento, posicionamento de imagem, job):
     -> Use action "create_trabalho" no manage_finance.
   - FLUXO (receita avulsa ou despesa avulsa):
     -> Use action "create" no manage_finance.
   - RESUMO COMPLETO EM TEMPO REAL:
     -> Use action "summary" no manage_finance.
   - REMOVER / CANCELAR LANÇAMENTO:
     -> Use action "delete_by_criteria" ou "cancel_last".
   - AJUSTAR SALDO:
     -> Use action "adjust_cash".`;

const TOOLS = [
  { type: 'function', function: { name: 'manage_agenda', description: 'Gerencia a agenda, compromissos e lembretes executivos do Adriano King. Permite agendar no Google Agenda, registrar lembretes para notificação no Telegram, listar compromissos e remover.', parameters: { type: 'object', properties: {
    action: { type: 'string', enum: ['create_event', 'create_reminder', 'list_agenda', 'delete_agenda'], description: 'Ação a executar' },
    titulo: { type: 'string', description: 'Título do compromisso ou o que lembrar (ex: "Ir para a academia", "Ensaio Fotográfico com Lucas", "Reunião com Parceiro", "Pagar fornecedor")' },
    data: { type: 'string', description: 'Data no formato YYYY-MM-DD (ex: "2026-09-23")' },
    hora_inicio: { type: 'string', description: 'Horário de início ou do aviso (HH:MM 24h, ex: "17:00", "09:30")' },
    hora_fim: { type: 'string', description: 'Horário de término (HH:MM 24h, ex: "18:00", "16:00")' },
    descricao: { type: 'string', description: 'Observações, notas, contato ou detalhes do evento' },
    local: { type: 'string', description: 'Local do compromisso (ex: "Academia", "Estúdio Barueri", "Online", ou endereço)' },
    tipo: { type: 'string', enum: ['compromisso', 'lembrete', 'ensaio', 'reuniao'], description: 'Tipo do item' },
    id: { type: 'string', description: 'ID do lembrete ou evento para remover em delete_agenda' }
  }, required: ['action'] } } },
  { type: 'function', function: { name: 'manage_finance', description: 'Gerencia finanças do King: trabalhos, lançamentos de fluxo, resumo real, remoção, ajuste de saldo e consultoria.', parameters: { type: 'object', properties: {
    action: { type: 'string', enum: ['create', 'create_trabalho', 'cancel_last', 'delete_by_criteria', 'list_recent', 'adjust_cash', 'summary', 'advice'] },
    cliente: { type: 'string', description: 'Nome do cliente do trabalho' },
    servico: { type: 'string', description: 'Tipo de serviço (ex: Posicionamento de Imagem, Ensaio, Cobertura)' },
    valor_total: { type: 'number', description: 'Valor total cobrado pelo trabalho' },
    entrada: { type: 'number', description: 'Valor de entrada recebido agora (AV/sinal). 0 se não recebeu nada agora.' },
    data_prevista: { type: 'string', description: 'Data prevista para quitação (YYYY-MM-DD)' },
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
let needGoogleCalendar = false;
let calendarStart = '';
let calendarEnd = '';
let calendarSummary = '';
let calendarDescription = '';
let calendarLocation = '';

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

      // ═══════════════════════════════════════════════════════════════════
      // ── GERENCIAR AGENDA & LEMBRETES (GOOGLE AGENDA + TELEGRAM) ────────
      // ═══════════════════════════════════════════════════════════════════
      if (fnName === 'manage_agenda') {
        const profileId = await resolveProfileId.call(this);
        const kRes = await ck.call(this, 'GET', `/api/finance/king-data?profile_id=${profileId}`);
        let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
        if (!kingDb || typeof kingDb !== 'object') kingDb = {};
        if (!Array.isArray(kingDb.lembretes)) kingDb.lembretes = [];

        // ── CRIAR COMPROMISSO OU LEMBRETE ───────────────────────────
        if (args.action === 'create_event' || args.action === 'create_reminder') {
          const isLembrete = args.action === 'create_reminder' || args.tipo === 'lembrete';
          const titulo = String(args.titulo || (isLembrete ? 'Lembrete' : 'Compromisso')).trim();
          let data = String(args.data || '').trim();
          if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
            data = dataHojeISO;
          }
          let horaInicio = String(args.hora_inicio || '09:00').trim();
          if (horaInicio.length === 4 && horaInicio.indexOf(':') === 1) horaInicio = '0' + horaInicio;
          if (!/^\d{2}:\d{2}$/.test(horaInicio)) horaInicio = '09:00';

          let horaFim = String(args.hora_fim || '').trim();
          if (!horaFim) {
            const hParts = horaInicio.split(':');
            const duracaoHoras = (args.tipo === 'ensaio' || titulo.toLowerCase().includes('ensaio')) ? 2 : 1;
            const endH = String(Math.min(23, Number(hParts[0]) + duracaoHoras)).padStart(2, '0');
            horaFim = endH + ':' + hParts[1];
          }

          const local = String(args.local || (args.tipo === 'ensaio' ? 'Estúdio Adriano King - Barueri-SP' : '')).trim();
          const descricao = String(args.descricao || '').trim();

          const gCalUrl = makeGoogleCalendarUrl(titulo, data, horaInicio, horaFim, descricao, local);

          // Configuração para inserção direta no Google Calendar via API
          needGoogleCalendar = true;
          calendarStart = `${data}T${horaInicio}:00-03:00`;
          calendarEnd = `${data}T${horaFim}:00-03:00`;
          calendarSummary = titulo;
          calendarDescription = (descricao ? descricao + '\n\n' : '') + 'Agendado pelo Agente King';
          calendarLocation = local || 'Barueri-SP';

          const novoItem = {
            id: 'lem_' + Date.now(),
            titulo,
            tipo: args.tipo || (isLembrete ? 'lembrete' : 'compromisso'),
            data,
            hora_inicio: horaInicio,
            hora_fim: horaFim,
            descricao,
            local,
            google_calendar_url: gCalUrl,
            created_at: dataHojeISO + ' ' + horaAtualSp,
            status: 'ativo',
            notificado: false,
            notificado_30m: false,
            notificado_15m: false
          };

          kingDb.lembretes.unshift(novoItem);

          await ck.call(this, 'PUT', `/api/finance/king-data?profile_id=${profileId}`, {
            profile_id: profileId,
            data: kingDb
          });

          // Formatar data em português
          const pData = data.split('-');
          const dObj = new Date(Number(pData[0]), Number(pData[1]) - 1, Number(pData[2]));
          const diaSemanaFormat = diaSemanaNomes[dObj.getDay()] || 'Data';
          const dataFormatada = `${pData[2]}/${pData[1]}/${pData[0]} (${diaSemanaFormat})`;

          const icone = isLembrete ? '⏰' : (args.tipo === 'ensaio' ? '📸' : '📅');
          const header = isLembrete ? 'Novo Lembrete Registrado!' : 'Compromisso Agendado com Sucesso!';

          outMessage = `${icone} *${header} — Agente King*\n\n` +
            `📌 *${isLembrete ? 'Lembrete' : 'Compromisso'}:* ${titulo}\n` +
            `🗓️ *Data:* ${dataFormatada}\n` +
            `⏰ *Horário:* ${horaInicio}${horaFim ? ' às ' + horaFim : ''}\n` +
            (local ? `📍 *Local:* ${local}\n` : '') +
            (descricao ? `📝 *Observações:* ${descricao}\n` : '') +
            `\n📲 [Toque aqui para Adicionar ao seu Google Agenda](${gCalUrl})\n` +
            `_(Ao tocar, abre no app Google Agenda do seu celular com alarme e notificação prontos!)_\n\n` +
            `🔔 *Notificações Configuradas:*\n` +
            `• 📱 *Google Agenda:* Alarme/notificação no seu celular 30 min e 15 min antes!\n` +
            `• 💬 *Telegram:* O Agente King vai te mandar aviso 30 min antes, 15 min antes e na hora exata!`;

        // ── LISTAR AGENDA & LEMBRETES ────────────────────────────────
        } else if (args.action === 'list_agenda') {
          const ativos = (kingDb.lembretes || []).filter(l => l && l.status !== 'cancelado');
          if (ativos.length === 0) {
            outMessage = `📅 *Agenda & Lembretes — Agente King*\n\nNenhum compromisso ou lembrete pendente no momento.\n\nSe quiser agendar algo, é só me pedir por áudio ou texto!`;
          } else {
            ativos.sort((a, b) => ((a.data || '') + (a.hora_inicio || '')).localeCompare((b.data || '') + (b.hora_inicio || '')));
            const lines = ativos.slice(0, 10).map((l, i) => {
              const ico = l.tipo === 'lembrete' ? '⏰' : (l.tipo === 'ensaio' ? '📸' : '📅');
              const pData = (l.data || '').split('-');
              const dFmt = pData.length === 3 ? `${pData[2]}/${pData[1]}/${pData[0]}` : l.data;
              return `${i + 1}. ${ico} *${l.titulo}*\n   🗓️ ${dFmt} às ${l.hora_inicio || '00:00'}${l.hora_fim ? ' - ' + l.hora_fim : ''}${l.local ? ' | 📍 ' + l.local : ''}\n   📲 [Google Agenda](${l.google_calendar_url})`;
            });
            outMessage = `📅 *Sua Agenda & Lembretes — Agente King:*\n\n${lines.join('\n\n')}`;
          }

        // ── REMOVER / CANCELAR ──────────────────────────────────────
        } else if (args.action === 'delete_agenda') {
          const targetId = args.id;
          const search = String(args.titulo || '').toLowerCase();
          let removed = null;
          for (const l of (kingDb.lembretes || [])) {
            if ((targetId && l.id === targetId) || (search && String(l.titulo || '').toLowerCase().includes(search))) {
              l.status = 'cancelado';
              removed = l;
              break;
            }
          }
          if (removed) {
            await ck.call(this, 'PUT', `/api/finance/king-data?profile_id=${profileId}`, {
              profile_id: profileId,
              data: kingDb
            });
            outMessage = `🗑️ *Item Removido da Agenda!*\nRemovi o compromisso: *${removed.titulo}*.`;
          } else {
            outMessage = `⚠️ Não encontrei o compromisso/lembrete informado para cancelar.`;
          }
        }

      // ═══════════════════════════════════════════════════════════════════
      // ── GERENCIAR FINANÇAS ─────────────────────────────────────────────
      // ═══════════════════════════════════════════════════════════════════
      } else if (fnName === 'manage_finance') {
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

            await ck.call(this, 'PUT', `/api/finance/king-data?profile_id=${profileId}`, {
              profile_id: profileId,
              data: kingDb
            });

            const summary = await fetchRealSummary.call(this, profileId);
            const falta = Math.max(0, valorTotal - entrada);

            outMessage = `👑 *Novo Trabalho Registrado — Agente King*\n\n` +
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
            const lines = ['👑 *Lançamento Financeiro Concluído — Agente King*\n'];
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

        // ── DELETE BY CRITERIA ──────────────────────────────────────
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
            outMessage = `📋 *Últimos Lançamentos Reais — Agente King:*\n\n${lines.join('\n')}`;
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
          outMessage = `👑 *Consultoria de Faturamento — Agente King*\n\n${advice}`;
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
      outMessage = choice?.content || 'Olá King! Sou o seu Agente King. Como posso te ajudar hoje?';
    }

    session.history.push({ role: 'user', content: inputForAi });
    session.history.push({ role: 'assistant', content: outMessage + (summaryMessageToSend ? '\n\n' + summaryMessageToSend : '') });
    if (session.history.length > 12) session.history.splice(0, 2);
  }
} catch (e) {
  outMessage = '⚠️ Erro: ' + String(e.message || e).slice(0, 300);
}

const resItem = {
  ...prev,
  outMessage,
  needGoogleCalendar,
  calendarStart,
  calendarEnd,
  calendarSummary,
  calendarDescription,
  calendarLocation
};

if (summaryMessageToSend) {
  return [
    { json: resItem },
    { json: { ...prev, outMessage: summaryMessageToSend, needGoogleCalendar: false } }
  ];
}

return [{ json: resItem }];'''

# ──────────────────────────────────────────────────────────────────────────────
# CÓDIGO DO NÓ DE VERIFICAÇÃO PERIÓDICA DE LEMBRETES (a cada 5 min)
# ──────────────────────────────────────────────────────────────────────────────
CHECK_REMIDERS_JS = r'''const base = String($env.CK_INTERNAL_URL || $env.CK_BASE_URL || 'http://conectaking-laravel:8080').replace(/\/$/, '');
const token = String($env.CK_AGENT_JWT || '').trim();
const adminChatId = String($env.ADMIN_TELEGRAM_ID || '78792434');

let r;
try {
  r = await this.helpers.httpRequest({
    method: 'GET',
    url: base + '/api/finance/king-data?profile_id=1',
    headers: {
      'Accept': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    },
    json: true,
    ignoreHttpStatusErrors: true
  });
} catch (_) {
  return [];
}

const kingDb = (r && r.data) ? r.data : (r || {});
const lembretes = Array.isArray(kingDb.lembretes) ? kingDb.lembretes : [];

const now = new Date();
const spNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
const today = spNow.toISOString().slice(0, 10);
const curMinutes = spNow.getHours() * 60 + spNow.getMinutes();

const dueList = [];
let hasChanges = false;

for (const lem of lembretes) {
  if (!lem || lem.status === 'cancelado') continue;

  // Apenas compromissos de hoje ou datas anteriores
  if (lem.data > today) continue;

  const [h, m] = String(lem.hora_inicio || '00:00').split(':').map(Number);
  const eventMinutes = (h || 0) * 60 + (m || 0);

  // Se o dia já passou e não foi notificado na hora
  if (lem.data < today) {
    if (!lem.notificado) {
      dueList.push({
        lem,
        tipo: 'atrasado',
        msg: `⏰ *LEMBRETE DO AGENTE KING*\n\n👑 *Adriano, passando para te lembrar do compromisso registrado:*\n\n📌 *${lem.titulo}*\n📅 *Data:* ${lem.data}\n🕒 *Horário:* ${lem.hora_inicio || 'Horário marcado'}\n${lem.local ? '📍 *Local:* ' + lem.local + '\n' : ''}${lem.descricao ? '📝 *Notas:* ' + lem.descricao + '\n' : ''}${lem.google_calendar_url ? '📲 [Abrir no Google Agenda](' + lem.google_calendar_url + ')\n' : ''}`
      });
      lem.notificado = true;
      hasChanges = true;
    }
    continue;
  }

  // Se é hoje: calcular diferença em minutos
  const diff = eventMinutes - curMinutes; // minutos até o evento começar

  // 1. Alerta de 30 minutos antes (entre 16 e 35 min antes)
  if (diff <= 35 && diff > 15 && !lem.notificado_30m && !lem.notificado) {
    dueList.push({
      lem,
      tipo: '30m',
      msg: `⏰ *AVISO PRÉVIO — 30 MINUTOS!*\n\n👑 *Adriano, faltam aproximadamente 30 minutos para o seu compromisso!*\n\n📌 *${lem.titulo}*\n🕒 *Horário:* ${lem.hora_inicio}\n${lem.local ? '📍 *Local:* ' + lem.local + '\n' : ''}${lem.descricao ? '📝 *Notas:* ' + lem.descricao + '\n' : ''}\n🔔 _Fique atento! Vou te avisar novamente 15 minutos antes e na hora exata._`
    });
    lem.notificado_30m = true;
    hasChanges = true;
  }

  // 2. Alerta de 15 minutos antes (entre 1 e 15 min antes)
  if (diff <= 15 && diff > 0 && !lem.notificado_15m && !lem.notificado) {
    dueList.push({
      lem,
      tipo: '15m',
      msg: `⏰ *AVISO PRÉVIO — 15 MINUTOS!*\n\n👑 *Atenção Adriano, faltam apenas 15 minutos!*\n\n📌 *${lem.titulo}*\n🕒 *Horário:* ${lem.hora_inicio}\n${lem.local ? '📍 *Local:* ' + lem.local + '\n' : ''}${lem.descricao ? '📝 *Notas:* ' + lem.descricao + '\n' : ''}\n⚡ _Está quase na hora!_`
    });
    lem.notificado_15m = true;
    hasChanges = true;
  }

  // 3. Alerta na hora exata ou minutos depois (diff <= 0)
  if (diff <= 0 && !lem.notificado) {
    dueList.push({
      lem,
      tipo: 'hora',
      msg: `⏰ *É AGORA! — LEMBRETE DO AGENTE KING*\n\n👑 *Adriano, seu compromisso começou:*\n\n📌 *${lem.titulo}*\n🕒 *Horário:* ${lem.hora_inicio}\n${lem.local ? '📍 *Local:* ' + lem.local + '\n' : ''}${lem.descricao ? '📝 *Notas:* ' + lem.descricao + '\n' : ''}${lem.google_calendar_url ? '📲 [Abrir no Google Agenda](' + lem.google_calendar_url + ')\n' : ''}\n✅ _Compromisso ativo._`
    });
    lem.notificado = true;
    hasChanges = true;
  }
}

if (hasChanges) {
  try {
    await this.helpers.httpRequest({
      method: 'PUT',
      url: base + '/api/finance/king-data?profile_id=1',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
      },
      body: { profile_id: 1, data: kingDb },
      json: true,
      ignoreHttpStatusErrors: true
    });
  } catch (_) {}
}

if (dueList.length === 0) {
  return [];
}

return dueList.map(item => ({
  json: {
    chatId: adminChatId,
    outMessage: item.msg
  }
}));'''

# ──────────────────────────────────────────────────────────────────────────────
# CÓDIGO DO NÓ DE CONFIRMAÇÃO DO GOOGLE CALENDAR
# ──────────────────────────────────────────────────────────────────────────────
CONFIRM_GCAL_JS = r'''const prev = $('Executar Admin').first().json;
const gcal = $input.first().json;
let msg = prev.outMessage || '';

if (gcal && (gcal.id || gcal.htmlLink)) {
  const link = gcal.htmlLink || '';
  msg = msg.replace('📲 [Toque aqui para Adicionar ao seu Google Agenda]', '📅 *Agendado diretamente no seu Google Agenda!* ✅\n📲 [Abrir no Google Agenda]');
  if (link) {
    msg = msg.replace(/https:\/\/calendar\.google\.com\/calendar\/render\?[^\)]+/g, link);
  }
  msg = msg.replace('(Ao tocar, abre no app Google Agenda do seu celular com alarme e notificação prontos!)', '_(Já está gravado no seu Google Agenda com alertas de 30 min e 15 min antes no seu celular!)_');
}

return [{
  json: {
    ...prev,
    outMessage: msg
  }
}];'''

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

    # 1. Patch no Executar Admin
    patched = False
    for n in nodes:
        if n.get('name') == 'Executar Admin':
            p = n.setdefault('parameters', {})
            p['jsCode'] = EXEC_ADMIN_JS
            patched = True
            print(f'[OK] Executar Admin → {len(EXEC_ADMIN_JS)} chars')
            print('     Agente King: OK')
            print('     manage_agenda: OK (create_event, create_reminder, list_agenda, delete_agenda)')
            print('     Google Calendar API routing: OK')
            print('     fetchRealSummary: OK')
            break

    if not patched:
        print('[AVISO] Nó "Executar Admin" não encontrado.')
        conn.close()
        return

    # 2. Adicionar nó de verificação periódica de lembretes caso não exista
    check_node_name = 'Checar Lembretes Admin'
    notify_node_name = 'Notificar Lembrete TG'

    if not any(n.get('name') == check_node_name for n in nodes):
        check_node = {
            'parameters': {'jsCode': CHECK_REMIDERS_JS},
            'id': 'checkReminders01',
            'name': check_node_name,
            'type': 'n8n-nodes-base.code',
            'typeVersion': 2,
            'position': [-1056, 320]
        }
        nodes.append(check_node)
        print(f'[OK] Criado nó: {check_node_name}')
    else:
        for n in nodes:
            if n.get('name') == check_node_name:
                n.setdefault('parameters', {})['jsCode'] = CHECK_REMIDERS_JS
                print(f'[OK] Atualizado nó: {check_node_name}')

    if not any(n.get('name') == notify_node_name for n in nodes):
        notify_node = {
            'parameters': {
                'chatId': "={{ $json.chatId || $env.ADMIN_TELEGRAM_ID || '78792434' }}",
                'text': "={{ $json.outMessage }}",
                'additionalFields': {'appendAttribution': False}
            },
            'id': 'notifyReminderTG01',
            'name': notify_node_name,
            'type': 'n8n-nodes-base.telegram',
            'typeVersion': 1.2,
            'position': [-800, 320],
            'credentials': {
                'telegramApi': {
                    'id': 'MFt7IUN9HkKveUW8',
                    'name': 'Telegram account'
                }
            }
        }
        nodes.append(notify_node)
        print(f'[OK] Criado nó: {notify_node_name}')

    # Conectar: "A cada 5 min" -> "Checar Lembretes Admin" -> "Notificar Lembrete TG"
    sched_conn = connections.setdefault('A cada 5 min', {}).setdefault('main', [[]])
    if not any(target.get('node') == check_node_name for target in sched_conn[0]):
        sched_conn[0].append({'node': check_node_name, 'type': 'main', 'index': 0})
        print(f'[OK] Conectado: "A cada 5 min" -> "{check_node_name}"')

    check_conn = connections.setdefault(check_node_name, {}).setdefault('main', [[]])
    if not any(target.get('node') == notify_node_name for target in check_conn[0]):
        check_conn[0].append({'node': notify_node_name, 'type': 'main', 'index': 0})
        print(f'[OK] Conectado: "{check_node_name}" -> "{notify_node_name}"')

    # 3. Adicionar nós para gravação direta no Google Calendar:
    if_node_name = 'Precisa Google Calendar?'
    gcal_node_name = 'Criar no Google Calendar'
    confirm_node_name = 'Confirmar Evento Google Calendar'

    # Nó IF: Precisa Google Calendar?
    if not any(n.get('name') == if_node_name for n in nodes):
        if_node = {
            'parameters': {
                'conditions': {
                    'options': {'caseSensitive': True, 'leftValue': '', 'typeValidation': 'strict', 'version': 2},
                    'conditions': [{
                        'id': 'cond_gcal',
                        'leftValue': '={{ $json.needGoogleCalendar }}',
                        'rightValue': True,
                        'operator': {'type': 'boolean', 'operation': 'true', 'singleValue': True}
                    }],
                    'combinator': 'and'
                },
                'options': {}
            },
            'id': 'ifGcal01',
            'name': if_node_name,
            'type': 'n8n-nodes-base.if',
            'typeVersion': 2.2,
            'position': [160, 256]
        }
        nodes.append(if_node)
        print(f'[OK] Criado nó: {if_node_name}')

    # Nó Google Calendar
    gcal_params = {
        'calendar': {
            '__rl': True,
            'value': 'playadrian@gmail.com',
            'mode': 'list',
            'cachedResultName': 'playadrian@gmail.com'
        },
        'start': '={{ $json.calendarStart }}',
        'end': '={{ $json.calendarEnd }}',
        'useDefaultReminders': False,
        'remindersUi': {
            'remindersValues': [
                {'method': 'popup', 'minutes': 30},
                {'method': 'popup', 'minutes': 15}
            ]
        },
        'additionalFields': {
            'summary': '={{ $json.calendarSummary }}',
            'description': '={{ $json.calendarDescription }}',
            'location': '={{ $json.calendarLocation }}'
        }
    }

    if not any(n.get('name') == gcal_node_name for n in nodes):
        gcal_node = {
            'parameters': gcal_params,
            'id': 'gcalCreateEvent01',
            'name': gcal_node_name,
            'type': 'n8n-nodes-base.googleCalendar',
            'typeVersion': 1.3,
            'position': [320, 160],
            'credentials': {
                'googleCalendarOAuth2Api': {
                    'id': 'XgBBhtHN5iljoMqt',
                    'name': 'Google Calendar account'
                }
            },
            'continueOnFail': True,
            'onError': 'continueRegularOutput'
        }
        nodes.append(gcal_node)
        print(f'[OK] Criado nó: {gcal_node_name}')
    else:
        for n in nodes:
            if n.get('name') == gcal_node_name:
                n['parameters'] = gcal_params
                print(f'[OK] Atualizado nó: {gcal_node_name}')

    # Nó Confirmação Google Calendar
    if not any(n.get('name') == confirm_node_name for n in nodes):
        confirm_node = {
            'parameters': {'jsCode': CONFIRM_GCAL_JS},
            'id': 'confirmGcal01',
            'name': confirm_node_name,
            'type': 'n8n-nodes-base.code',
            'typeVersion': 2,
            'position': [480, 160]
        }
        nodes.append(confirm_node)
        print(f'[OK] Criado nó: {confirm_node_name}')
    else:
        for n in nodes:
            if n.get('name') == confirm_node_name:
                n.setdefault('parameters', {})['jsCode'] = CONFIRM_GCAL_JS
                print(f'[OK] Atualizado nó: {confirm_node_name}')

    # Reposicionar e reconectar nós:
    # Executar Admin -> Precisa Google Calendar?
    connections['Executar Admin'] = {'main': [[{'node': if_node_name, 'type': 'main', 'index': 0}]]}
    print(f'[OK] Conectado: "Executar Admin" -> "{if_node_name}"')

    # Precisa Google Calendar?
    # Output 0 (True) -> Criar no Google Calendar
    # Output 1 (False) -> Enviar Telegram
    connections[if_node_name] = {
        'main': [
            [{'node': gcal_node_name, 'type': 'main', 'index': 0}],
            [{'node': 'Enviar Telegram', 'type': 'main', 'index': 0}]
        ]
    }
    print(f'[OK] Conectado: "{if_node_name}" [True] -> "{gcal_node_name}"')
    print(f'[OK] Conectado: "{if_node_name}" [False] -> "Enviar Telegram"')

    # Criar no Google Calendar -> Confirmar Evento Google Calendar -> Enviar Telegram
    connections[gcal_node_name] = {'main': [[{'node': confirm_node_name, 'type': 'main', 'index': 0}]]}
    connections[confirm_node_name] = {'main': [[{'node': 'Enviar Telegram', 'type': 'main', 'index': 0}]]}
    print(f'[OK] Conectado: "{gcal_node_name}" -> "{confirm_node_name}" -> "Enviar Telegram"')

    upsert_active(cur, MAIN, nodes, connections, settings, wf_name)
    conn.commit()
    conn.close()

    try:
        os.chown(DB, 1000, 1000)
    except Exception:
        pass

    print('\n✅ Patch de Agente King e Google Calendar API aplicado com sucesso!')


if __name__ == '__main__':
    main()
