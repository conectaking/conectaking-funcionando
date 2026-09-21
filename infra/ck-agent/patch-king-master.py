#!/usr/bin/env python3
"""
patch-king-master.py
====================
Patch MASTER que atualiza simultâneamente:
  1) AI Agent Cliente → Novo prompt com rapport, sem textão, qualificação antes de preço
  2) Executar Admin    → Domínio TOTAL da Gestão Financeira + Consultor de Faturamento

Rodar com n8n PARADO:
  docker stop ck-agent-n8n
  python3 /tmp/patch-king-master.py
  docker compose --env-file .env up -d n8n
"""
import json, os, sqlite3, time, uuid

DB   = '/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'
MAIN = 'mkK244lveO0N1qPR'

# ═══════════════════════════════════════════════════════════════════════════════
#  PROMPT AGENTE CLIENTE — Rapport Humanizado, Sem Textão
# ═══════════════════════════════════════════════════════════════════════════════
SYSTEM_CLIENTE = r"""Você é o próprio Adriano King atendendo pessoalmente no Telegram. Fale SEMPRE na primeira pessoa ("eu faço", "meu trabalho", "minha arte"). Sem robôs, sem clichês corporativos, sem enrolação.

════════════════════════════════
⚠️  REGRA NÚMERO 1 — PROIBIDO TEXTÃO
════════════════════════════════
MÁXIMO 3 frases por mensagem. Ponto. Sem exceção.
Nunca mande dois blocos de texto seguidos sem o cliente responder.
Pense: você está num chat de WhatsApp com uma pessoa real.

════════════════════════════════
🤝  REGRA NÚMERO 2 — RAPPORT PRIMEIRO, VENDA DEPOIS
════════════════════════════════
Se o cliente disser "oi", "olá", "queria saber sobre fotografia", "você faz fotos?" ou qualquer abertura inicial:
→ RESPONDA COM CALOR E UMA SÓ PERGUNTA LEVE. Exemplo:
  "Opa, que bom te ver por aqui! 😊 Essas fotos seriam para você mesmo — tipo trabalho, negócio — ou mais um momento especial, como aniversário, gestação?"
→ NUNCA lance preços, pacotes ou regras de pagamento na primeira mensagem. Jamais.

════════════════════════════════
🎯  REGRA NÚMERO 3 — QUALIFICAÇÃO ANTES DE TUDO
════════════════════════════════
Antes de apresentar qualquer serviço, descubra:
  a) O que a pessoa faz (profissão/área) ou qual o motivo das fotos.
  b) Se é para imagem profissional/negócios OU celebração/momento pessoal.

Com isso em mãos, apresente APENAS o serviço certo:
  → Médico, advogado, empresário, consultor, mentor, líder, coach, terapeuta = POSICIONAMENTO DE IMAGEM
  → Aniversário, gestação, casal, família, lifestyle, fotos pessoais = ENSAIO FOTOGRÁFICO

════════════════════════════════
👑  MEU TRABALHO — DOIS SERVIÇOS (use apenas o pertinente)
════════════════════════════════
A. POSICIONAMENTO DE IMAGEM & RETRATO ESTRATÉGICO (foco principal)
   Não é "tirar foto". É extrair a sua essência e colocar no retrato.
   Conversamos fundo sobre quem você é, o que quer transmitir, sua autoridade.
   A foto que sai comunica poder, credibilidade e sofisticação.
   Pacotes: 20 fotos R$ 1.000 | 30 fotos R$ 1.400
   (Se insistir por opção menor: 10 fotos R$ 600 — mas valorize sempre as maiores)

B. ENSAIO FOTOGRÁFICO CONVENCIONAL
   Para celebrar momentos, lifestyle, aniversários, gestação.
   Poses guiadas, iluminação linda, recordação para a vida toda.
   Pacotes: 10 fotos R$ 300 | 20 fotos R$ 550 | 30 fotos R$ 800

Estúdio em Barueri, São Paulo. Atendo Seg–Sex 08:00–12:00 e 14:00–18:00.

════════════════════════════════
💡  FLUXO DE CONVERSA (siga na ordem)
════════════════════════════════
PASSO 1 → Acolhimento + 1 pergunta leve para descobrir o perfil.
PASSO 2 → Entenda a resposta. Faça outra pergunta se precisar (uma de cada vez).
PASSO 3 → Só quando souber o perfil: apresente UMA modalidade, com entusiasmo e em 2-3 frases. NÃO mostre a outra.
PASSO 4 → Projeção mental (PNL): "Imagina você chegando numa reunião e as pessoas já te vendo como referência antes de você falar uma palavra — é isso que um retrato de posicionamento faz."
PASSO 5 → Pergunte a profissão, cidade (Barueri fica acessível?) e o que quer transmitir nas fotos.
PASSO 6 → Apresente o pacote certo. Fale do valor da transformação ANTES do preço.
PASSO 7 → Escassez ética: "Atendo de forma individual, cada sessão tem atenção total. Minha agenda tem poucas vagas por semana."
PASSO 8 → Feche com pergunta direta: "Você toparia marcar ainda essa semana? Me fala um horário que funciona pra você."

⚠️  Sinal de 50% de entrada: mencione SOMENTE quando o cliente decidir agendar. Nunca antes.

════════════════════════════════
💳  CONECTA KING (só se perguntado)
════════════════════════════════
Perfil digital inteligente + NFC + QR Code. Une todas as redes, WhatsApp, site e muito mais em um só lugar. Transmite em ~3 segundos (Android e iPhone). Entrada R$ 35/mês.
PROIBIDO: nunca diga "cartão virtual NFC" nem fale em maquininha/pagamento.

════════════════════════════════
📱  CONTATOS
════════════════════════════════
Instagram: @adrianokingg → https://www.instagram.com/adrianokingg
WhatsApp: +55 11 98878-9417
Site Conecta King: https://www.conectaking.com.br

Se o cliente pedir para falar com um humano, termine com: ESCALATE:YES
Em todas as outras situações termine com: ESCALATE:NO"""


# ═══════════════════════════════════════════════════════════════════════════════
#  CÓDIGO JS — Executar Admin (Domínio Total Financeiro + Consultor)
# ═══════════════════════════════════════════════════════════════════════════════
EXEC_ADMIN_JS = r'''const prev = $input.first().json;
const base = String($env.CK_BASE_URL || 'https://www.conectaking.com.br').replace(/\/$/, '');
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

async function resolveProfileId() {
  try {
    const r = await ck.call(this, 'GET', '/api/finance/profiles');
    const list = (r.body && (r.body.data || r.body.profiles || r.body)) || [];
    const arr = Array.isArray(list) ? list : [];
    const primary = arr.find(p => p && (p.is_primary === true || p.isPrimary === true));
    const active = arr.find(p => p && (p.is_active !== false && p.isActive !== false));
    const pick = primary || active || arr[0];
    return pick ? Number(pick.id) : null;
  } catch (_) { return null; }
}

// ─── Busca transações recentes com leitura correta da resposta paginada ───────
async function fetchRecentTransactions(limitN) {
  const r = await ck.call(this, 'GET', `/api/finance/transactions?limit=${limitN}&orderDir=DESC&orderBy=created_at`);
  // Laravel retorna: body.data.data (paginado) OU body.data (array simples)
  const raw = r.body;
  const inner = (raw && raw.data) ? raw.data : raw;
  let arr = Array.isArray(inner) ? inner : (inner && Array.isArray(inner.data) ? inner.data : []);
  return arr;
}

const KB = `CONHECIMENTO EXECUTIVO CONECTA KING & ESTÚDIO ADRIANO KING:
- Dono e CEO: Adriano King (@adrianokingg, WhatsApp 11988789417).
- Estúdio Adriano King (Barueri-SP): Posicionamento de Imagem 20 fotos R$1.000 / 30 fotos R$1.400. Ensaio 10 fotos R$300 / 20 fotos R$550 / 30 fotos R$800.
- Plataforma Conecta King: cartões virtuais dinâmicos, tags/pulseiras NFC, King Forms, King Selection, Gestão Financeira integrada.
- Planos Conecta King: Start R$70, Prime R$100, Essential R$150, Finance R$170, Finance Plus R$200, Premium Plus R$220, Corporate R$230.`;

const SYSTEM_PROMPT = `Você é o Assistente Executivo e CFO de Elite pessoal do Adriano King.
Atende exclusivamente o King no Telegram. Tom: direto, ágil, executivo, resolutivo. Sem enrolação.

${KB}

═══ GESTÃO FINANCEIRA — DOMÍNIO TOTAL ═══
Você tem CONTROLE TOTAL sobre as finanças. Nunca recuse uma ação financeira que o King pedir.
O que você pode (e deve) fazer:

1. REGISTRAR (create): receitas, despesas, pendências. Múltiplos lançamentos na mesma mensagem.
   - "recebi", "ganhei", "entrou", "vendi" + valor = INCOME PAID
   - "vou receber", "a receber", "trabalho de X" sem receber ainda = INCOME PENDING
   - "gastei", "comprei", "paguei", "saída" = EXPENSE PAID
   - "contas a pagar", "a pagar" = EXPENSE PENDING
   - Trabalho parcial ("fiz trabalho de 2000, recebi 200, falta 1800") → crie DUAS transações

2. REMOVER (delete_by_criteria): apagar lançamento por valor, descrição ou o último.
   - "tira o/os R$ X", "apaga os R$ X", "coloquei errado os R$ X", "remove a entrada de X" → delete_by_criteria com o valor
   - "apaga o último", "cancela o último", "errei" → cancel_last
   - NUNCA diga "não encontrei" sem antes chamar list_recent para checar os IDs reais

3. LISTAR (list_recent): mostrar os últimos lançamentos ao King para ele decidir o que mudar.
   - "me mostra o que tem lançado", "últimas transações", "o que está registrado"

4. AJUSTAR SALDO (adjust_cash): se o King disser "o caixa correto é R$ X", calcule a diferença e crie um lançamento corretivo limpo.
   - "o caixa tá errado, correto é R$ X" → consulte o saldo atual e ajuste a diferença

5. RESUMO (summary): trazer o resumo financeiro completo e limpo.

6. CONSULTORIA (advice): quando o King pedir opinião, conselhos ou estratégias de faturamento.
   - Analise os dados reais (caixa, pendentes, ticket médio).
   - Dê conselhos táticos e práticos: focar em Posicionamento (ticket R$1.400), reduzir pendências de recebimento, estratégias de upsell, previsibilidade de caixa.
   - Seja um CFO de elite: fale com dados, seja direto, dê ações concretas.

7. DIAGNÓSTICO DO SISTEMA (check_errors): verificar status e erros de páginas.

8. GERAR CÓDIGO (generate_invite_code): criar código KING-XXXX.

REGRAS CRÍTICAS:
- NUNCA responda "não encontrei transação" sem chamar list_recent primeiro.
- Se o King disser "tira o dinheiro de X" ou "coloquei errado", use delete_by_criteria com valor/descrição.
- Descrições devem ser concisas: "Trabalho de fotografia", "Receita avulsa", "Duas cartelas de ovo". NUNCA frases de comando.
- Sempre confirme com o saldo atualizado após qualquer operação.`;

const TOOLS = [
  { type: 'function', function: { name: 'manage_finance', description: 'Gerencia transações financeiras: registrar, remover por valor/descrição, ajustar saldo, listar recentes, resumo, consultoria.', parameters: { type: 'object', properties: {
    action: { type: 'string', enum: ['create', 'cancel_last', 'delete_by_criteria', 'list_recent', 'adjust_cash', 'summary', 'advice'] },
    transactions: { type: 'array', items: { type: 'object', properties: {
      type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
      amount: { type: 'number' }, status: { type: 'string', enum: ['PAID', 'PENDING'] },
      description: { type: 'string' }
    }, required: ['type', 'amount', 'status', 'description'] } },
    criteria: { type: 'object', properties: {
      amount: { type: 'number', description: 'Valor a procurar e deletar' },
      description_contains: { type: 'string', description: 'Texto parcial da descrição' },
      type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'any'] }
    } },
    target_cash: { type: 'number', description: 'Saldo desejado em caixa para adjust_cash' },
  }, required: ['action'] } } },
  { type: 'function', function: { name: 'check_system_errors', description: 'Verifica erros de páginas e health do sistema.', parameters: { type: 'object', properties: { detail: { type: 'boolean' } } } } },
  { type: 'function', function: { name: 'generate_invite_code', description: 'Gera código de registro KING-XXXXX.', parameters: { type: 'object', properties: { custom_code: { type: 'string' } }, required: ['custom_code'] } } }
];

let outMessage = '';

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

        // ── CREATE ──────────────────────────────────────────────────
        if (args.action === 'create' && Array.isArray(args.transactions) && args.transactions.length > 0) {
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
            const dash = await ck.call(this, 'GET', '/api/finance/dashboard');
            const saldo = dash.body?.data?.saldoDisponivel ?? 0;
            const aReceber = dash.body?.data?.pendenciasReceber ?? 0;
            const lines = ['👑 *Lançamento Financeiro Concluído!*\n'];
            for (const it of createdItems) {
              const icon = it.type === 'INCOME' ? '💵' : '💸';
              const lbl = it.status === 'PAID' ? (it.type === 'INCOME' ? 'Recebido em caixa' : 'Pago') : 'Pendente (A receber)';
              lines.push(`${icon} *${it.type === 'INCOME' ? 'Receita' : 'Despesa'}:* R$ ${it.amount.toFixed(2).replace('.', ',')} (${lbl})\n   📝 _${it.description}_`);
            }
            lines.push(`\n📊 *Dinheiro em Caixa:* R$ ${Number(saldo).toFixed(2).replace('.', ',')}`);
            if (aReceber > 0) lines.push(`⏳ *Total a Receber:* R$ ${Number(aReceber).toFixed(2).replace('.', ',')}`);
            outMessage = lines.join('\n');
          } else {
            outMessage = '⚠️ Não consegui registrar os valores. Tente novamente.';
          }

        // ── CANCEL LAST ─────────────────────────────────────────────
        } else if (args.action === 'cancel_last') {
          // Tenta memória de sessão primeiro, depois busca na API
          let targetIds = (session.lastCreatedTransactions || []).map(t => t.id).filter(Boolean);
          if (targetIds.length === 0) {
            const recent = await fetchRecentTransactions.call(this, 1);
            if (recent.length > 0) targetIds = [recent[0].id];
          }
          if (targetIds.length === 0) {
            outMessage = '⚠️ Não encontrei transação recente para cancelar. Me fala o valor ou descrição do que quer tirar.';
          } else {
            for (const id of targetIds) await ck.call(this, 'DELETE', `/api/finance/transactions/${id}`);
            session.lastCreatedTransactions = [];
            const dash = await ck.call(this, 'GET', '/api/finance/dashboard');
            const saldo = dash.body?.data?.saldoDisponivel ?? 0;
            outMessage = `🗑️ *Lançamento Cancelado!*\nRemovi o lançamento anterior com sucesso.\n\n📊 *Saldo Atualizado:* R$ ${Number(saldo).toFixed(2).replace('.', ',')}`;
          }

        // ── DELETE BY CRITERIA (valor ou descrição) ──────────────────
        } else if (args.action === 'delete_by_criteria') {
          const crit = args.criteria || {};
          const recent = await fetchRecentTransactions.call(this, 20);
          let targets = recent.filter(t => {
            const amountMatch = crit.amount ? Math.abs(Number(t.amount) - crit.amount) < 0.02 : true;
            const descMatch = crit.description_contains
              ? String(t.description || '').toLowerCase().includes(String(crit.description_contains).toLowerCase())
              : true;
            const typeMatch = (crit.type && crit.type !== 'any') ? t.type === crit.type : true;
            return amountMatch && descMatch && typeMatch;
          });
          if (targets.length === 0) {
            // Mostra lista para o King decidir
            const listLines = recent.slice(0, 8).map((t, i) => `${i + 1}. ${t.type === 'INCOME' ? '💵' : '💸'} R$ ${Number(t.amount).toFixed(2).replace('.', ',')} — _${t.description}_ (${t.status}) [ID: ${t.id}]`);
            outMessage = '⚠️ Não encontrei transação com esse critério. Seus últimos lançamentos:\n\n' + listLines.join('\n') + '\n\nMe fala qual quer tirar.';
          } else {
            const deleted = [];
            for (const t of targets.slice(0, 3)) {
              const dr = await ck.call(this, 'DELETE', `/api/finance/transactions/${t.id}`);
              if (dr.statusCode >= 200 && dr.statusCode < 300) deleted.push(t);
            }
            session.lastCreatedTransactions = [];
            const dash = await ck.call(this, 'GET', '/api/finance/dashboard');
            const saldo = dash.body?.data?.saldoDisponivel ?? 0;
            const lines = deleted.map(t => `• R$ ${Number(t.amount).toFixed(2).replace('.', ',')} — ${t.description}`);
            outMessage = `🗑️ *Lançamento(s) Removido(s):*\n${lines.join('\n')}\n\n📊 *Saldo em Caixa:* R$ ${Number(saldo).toFixed(2).replace('.', ',')}`;
          }

        // ── LIST RECENT ──────────────────────────────────────────────
        } else if (args.action === 'list_recent') {
          const recent = await fetchRecentTransactions.call(this, 10);
          if (recent.length === 0) {
            outMessage = '📋 Nenhum lançamento encontrado ainda.';
          } else {
            const lines = recent.map((t, i) => {
              const icon = t.type === 'INCOME' ? '💵' : '💸';
              const val = `R$ ${Number(t.amount).toFixed(2).replace('.', ',')}`;
              const lbl = t.status === 'PAID' ? 'Pago/Recebido' : 'Pendente';
              return `${i + 1}. ${icon} ${val} — _${t.description}_ (${lbl})`;
            });
            outMessage = `📋 *Últimos Lançamentos:*\n\n${lines.join('\n')}\n\n_Me diz qual quer alterar ou remover._`;
          }

        // ── ADJUST CASH ──────────────────────────────────────────────
        } else if (args.action === 'adjust_cash') {
          const targetCash = Number(args.target_cash || 0);
          const dash = await ck.call(this, 'GET', '/api/finance/dashboard');
          const currentCash = Number(dash.body?.data?.saldoDisponivel ?? 0);
          const diff = targetCash - currentCash;
          if (Math.abs(diff) < 0.01) {
            outMessage = `✅ Saldo em caixa já está em R$ ${targetCash.toFixed(2).replace('.', ',')}. Nenhum ajuste necessário.`;
          } else {
            const adjType = diff > 0 ? 'INCOME' : 'EXPENSE';
            const adjDesc = diff > 0 ? 'Ajuste de saldo (correção)' : 'Ajuste de saldo (correção)';
            const cr = await ck.call(this, 'POST', '/api/finance/transactions', { profile_id: profileId, type: adjType, amount: Math.abs(diff), status: 'PAID', description: adjDesc, transaction_date: today });
            const row = (cr.body && cr.body.data) || {};
            if (row.id) session.lastCreatedTransactions = [{ id: row.id, type: adjType, amount: Math.abs(diff), status: 'PAID', description: adjDesc }];
            const dash2 = await ck.call(this, 'GET', '/api/finance/dashboard');
            const newSaldo = dash2.body?.data?.saldoDisponivel ?? 0;
            outMessage = `🔄 *Saldo Ajustado com Sucesso!*\n\nAntes: R$ ${currentCash.toFixed(2).replace('.', ',')}\nAgora: R$ ${Number(newSaldo).toFixed(2).replace('.', ',')}\n\n📝 _Ajuste de ${diff > 0 ? '+' : ''}${diff.toFixed(2).replace('.', ',')} aplicado._`;
          }

        // ── SUMMARY ──────────────────────────────────────────────────
        } else if (args.action === 'summary') {
          const dash = await ck.call(this, 'GET', '/api/finance/dashboard');
          const d = (dash.body && dash.body.data) || {};
          const fmt = v => `R$ ${Number(v ?? 0).toFixed(2).replace('.', ',')}`;
          outMessage = `📊 *Gestão Financeira — Conecta King*\n\n` +
            `💰 *Dinheiro em Caixa:* ${fmt(d.saldoDisponivel)}\n` +
            `📈 *Receitas Recebidas (Mês):* ${fmt(d.totalRecebido)}\n` +
            `📉 *Despesas Pagas (Mês):* ${fmt(d.totalPago)}\n` +
            `⏳ *Valores a Receber (Pendentes):* ${fmt(d.pendenciasReceber)}\n` +
            `📑 *Contas a Pagar (Pendentes):* ${fmt(d.pendenciasPagar)}`;

        // ── ADVICE (Consultoria de Faturamento) ──────────────────────
        } else if (args.action === 'advice') {
          const dash = await ck.call(this, 'GET', '/api/finance/dashboard');
          const d = (dash.body && dash.body.data) || {};
          const saldo = Number(d.saldoDisponivel ?? 0);
          const pendRec = Number(d.pendenciasReceber ?? 0);
          const totalRec = Number(d.totalRecebido ?? 0);
          const totalPago = Number(d.totalPago ?? 0);
          // Monta contexto financeiro para a IA gerar conselho personalizado
          const finCtx = `Dados financeiros reais do King:
- Caixa disponível: R$ ${saldo.toFixed(2)}
- Receitas recebidas no mês: R$ ${totalRec.toFixed(2)}
- Despesas pagas no mês: R$ ${totalPago.toFixed(2)}
- Pendências a receber: R$ ${pendRec.toFixed(2)}
- Ticket médio Posicionamento de Imagem: R$ 1.200 (entre 1.000 e 1.400)
- Ticket médio Ensaio Fotográfico: R$ 550
- Produto Conecta King: entrada R$ 35/mês

Dê um conselho CFO de elite, tático e prático. Seja direto. Inclua: o que está bem, o que precisa de atenção e 2 a 3 ações concretas para aumentar o faturamento do mês. Fale em PT-BR, sem enrolação.`;

          const advRes = await openaiCall.call(this, {
            model, temperature: 0.5, max_tokens: 600,
            messages: [{ role: 'system', content: 'Você é um CFO de elite e consultor de faturamento para empreendedores criativos e CEOs de pequenas empresas de alto impacto. Seja direto, analítico e dê conselhos reais.' }, { role: 'user', content: finCtx }]
          });
          const advice = String(advRes.body?.choices?.[0]?.message?.content || '').trim();
          outMessage = `👑 *Consultoria de Faturamento — King Assistente*\n\n${advice}`;
        }

      // ── DIAGNÓSTICO DO SISTEMA ────────────────────────────────────────────
      } else if (fnName === 'check_system_errors') {
        const h = await ck.call(this, 'GET', '/health');
        const ok = h.statusCode === 200 && h.body?.status === 'ok';
        // Tenta buscar erros recentes de páginas
        let errorsMsg = '';
        try {
          const errR = await ck.call(this, 'GET', '/api/admin/system/recent-errors?limit=10');
          const summary = errR.body?.summary;
          const errors = errR.body?.errors || [];
          if (summary && summary.total_errors_24h > 0) {
            errorsMsg = `\n\n⚠️ *Erros de Páginas nas últimas 24h:* ${summary.total_errors_24h}\n`;
            const byPage = summary.pages_breakdown || {};
            for (const [page, count] of Object.entries(byPage).slice(0, 5)) {
              errorsMsg += `• \`${page}\` — ${count} vez(es)\n`;
            }
            if (errors.length > 0) {
              const last = errors[0];
              errorsMsg += `\nÚltimo erro: _${last.message}_ em \`${last.path}\` (${last.timestamp})`;
            }
          } else {
            errorsMsg = '\n\n✅ *Nenhum erro de página registrado nas últimas 24h.*';
          }
        } catch (_) {
          errorsMsg = '\n\n_Diagnóstico de páginas indisponível (endpoint não configurado)._';
        }
        outMessage = `🟢 *Diagnóstico do Sistema Conecta King:*\n\n` +
          `• *Status Geral:* ${ok ? '100% Operacional ✅' : 'Atenção ⚠️'}\n` +
          `• *Servidor / HTTP:* ${h.statusCode}\n` +
          `• *Backend Laravel:* ${ok ? 'Ativo' : 'Com problemas'}\n` +
          `• *Banco de Dados & Cache:* ${ok ? 'Conectados' : 'Verificar'}` +
          errorsMsg;

      // ── GERAR CÓDIGO ─────────────────────────────────────────────────────
      } else if (fnName === 'generate_invite_code') {
        const code = String(args.custom_code || '').toUpperCase().trim();
        const r = await ck.call(this, 'POST', '/api/admin/codes/generate-manual', { customCode: code, expiresAt: null });
        if (r.statusCode >= 200 && r.statusCode < 300) {
          outMessage = `🎟️ *Código de Registro Gerado!*\n\n*Código:* \`${code}\`\n\n_Disponível para cadastro em /registro._`;
        } else {
          outMessage = `⚠️ Falha ao criar código: ${JSON.stringify(r.body).slice(0, 200)}`;
        }
      }

    } else {
      // Resposta conversacional normal (sem tool call)
      outMessage = choice?.content || 'Olá King! Como posso ajudar na gestão da Conecta King hoje?';
    }

    session.history.push({ role: 'user', content: inputForAi });
    session.history.push({ role: 'assistant', content: outMessage });
    if (session.history.length > 12) session.history.splice(0, 2);
  }
} catch (e) {
  outMessage = '⚠️ Erro ao processar: ' + String(e.message || e).slice(0, 300);
}

return [{ json: { ...prev, outMessage } }];'''


# ═══════════════════════════════════════════════════════════════════════════════
#  Helpers de DB
# ═══════════════════════════════════════════════════════════════════════════════
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
    print(f'[OK] new activeVersionId → {version_id}')


def main():
    conn = sqlite3.connect(DB)
    cur  = conn.cursor()
    row  = cur.execute(
        'SELECT nodes, connections, settings, name FROM workflow_entity WHERE id=?', (MAIN,)
    ).fetchone()
    if not row:
        print(f'[ERRO] Workflow {MAIN} não encontrado no banco.')
        conn.close()
        return

    nodes       = json.loads(row[0])
    connections = json.loads(row[1])
    settings    = json.loads(row[2] or '{}')
    wf_name     = row[3]

    patched_cliente  = False
    patched_exec     = False

    for n in nodes:
        nm = n.get('name', '')

        # ── Agente do Cliente ──────────────────────────────────────────────
        if nm == 'AI Agent Cliente':
            p    = n.setdefault('parameters', {})
            opts = p.setdefault('options', {})
            opts['systemMessage'] = SYSTEM_CLIENTE
            p['systemMessage']    = SYSTEM_CLIENTE
            patched_cliente = True
            print(f'[OK] AI Agent Cliente → systemMessage atualizado ({len(SYSTEM_CLIENTE)} chars)')

        # ── Executar Admin (Gestão Financeira Domínio Total) ───────────────
        if nm == 'Executar Admin':
            p = n.setdefault('parameters', {})
            p['jsCode'] = EXEC_ADMIN_JS
            patched_exec = True
            print(f'[OK] Executar Admin → jsCode atualizado ({len(EXEC_ADMIN_JS)} chars)')

    if not patched_cliente:
        print('[AVISO] Nó "AI Agent Cliente" não encontrado. Verifique o nome no workflow.')
    if not patched_exec:
        print('[AVISO] Nó "Executar Admin" não encontrado. Verifique o nome no workflow.')

    upsert_active(cur, MAIN, nodes, connections, settings, wf_name)
    conn.commit()
    conn.close()

    try:
        os.chown(DB, 1000, 1000)
    except Exception:
        pass

    print('\n✅ PATCH MASTER concluído!')
    print('   → Agente Cliente: rapport humanizado, sem textão, qualificação antes de preço')
    print('   → Bot Admin: domínio total financeiro, delete por valor, ajuste de saldo, consultoria CFO')


if __name__ == '__main__':
    main()
