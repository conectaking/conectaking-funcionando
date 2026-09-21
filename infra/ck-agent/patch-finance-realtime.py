#!/usr/bin/env python3
"""
patch-finance-realtime.py
==========================
Correção EMERGENCIAL dos 3 bugs identificados nas fotos:
1. Summary busca dados reais da API (não memória/sessão antiga)
2. fetchRecentTransactions com tratamento correto do body paginado
3. delete_by_criteria funciona mesmo quando a API retorna body.data.data
4. adjust_cash usa saldo REAL da API antes de calcular diferença

Aplica SOMENTE no nó "Executar Admin" do workflow.
"""
import json, os, sqlite3, time, uuid

DB   = '/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'
MAIN = 'mkK244lveO0N1qPR'

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

// ─── Resolve o profile ID primário ─────────────────────────────────────────
async function resolveProfileId() {
  try {
    const r = await ck.call(this, 'GET', '/api/finance/profiles');
    const list = (r.body && (r.body.data || r.body.profiles || r.body)) || [];
    const arr = Array.isArray(list) ? list : (Array.isArray(list.data) ? list.data : []);
    const primary = arr.find(p => p && (p.is_primary === true || p.isPrimary === true));
    const active  = arr.find(p => p && (p.is_active !== false && p.isActive !== false));
    const pick = primary || active || arr[0];
    return pick ? Number(pick.id) : null;
  } catch (_) { return null; }
}

// ─── Busca transações recentes — trata response paginado E array simples ────
async function fetchRecentTransactions(limitN) {
  const r = await ck.call(this, 'GET', `/api/finance/transactions?limit=${limitN}&orderDir=DESC&orderBy=created_at&per_page=${limitN}`);
  const raw = r.body;
  if (!raw) return [];
  // Possíveis formatos: { data: { data: [...] } } | { data: [...] } | [...]
  const inner = raw.data != null ? raw.data : raw;
  if (Array.isArray(inner)) return inner;
  if (inner && Array.isArray(inner.data)) return inner.data;
  return [];
}

// ─── Busca dashboard em tempo real ─────────────────────────────────────────
async function fetchDashboard() {
  const r = await ck.call(this, 'GET', '/api/finance/dashboard');
  return (r.body && r.body.data) ? r.body.data : (r.body || {});
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
   - NUNCA diga "não encontrei" sem antes listar as transações reais

3. LISTAR (list_recent): mostrar os últimos lançamentos ao King.

4. AJUSTAR SALDO (adjust_cash): se o King disser "o caixa correto é R$ X" → busca saldo REAL da API e ajusta.

5. RESUMO (summary): trazer o resumo financeiro REAL em tempo real da API. NUNCA use dados da memória.

6. CONSULTORIA (advice): quando pedir opinião/estratégia de faturamento.

7. DIAGNÓSTICO DO SISTEMA (check_errors): verificar status e erros de páginas.

8. GERAR CÓDIGO (generate_invite_code): criar código KING-XXXX.

REGRAS CRÍTICAS:
- RESUMO FINANCEIRO: SEMPRE chame a API. NUNCA responda com dados da memória ou sessão anterior.
- Se o King disser "tira o dinheiro de X", use delete_by_criteria.
- Se o King disser que o valor está errado, use adjust_cash — NUNCA diga que não pode corrigir.
- Descrições devem ser concisas: "Trabalho de fotografia", "Receita avulsa". NUNCA frases de comando.`;

const TOOLS = [
  { type: 'function', function: { name: 'manage_finance', description: 'Gerencia transações financeiras: registrar, remover por valor/descrição, ajustar saldo, listar recentes, resumo, consultoria.', parameters: { type: 'object', properties: {
    action: { type: 'string', enum: ['create', 'cancel_last', 'delete_by_criteria', 'list_recent', 'adjust_cash', 'summary', 'advice'] },
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
            // ⚠️ Sempre buscar dashboard REAL após criar
            const dash = await fetchDashboard.call(this);
            const saldo = dash.saldoDisponivel ?? 0;
            const aReceber = dash.pendenciasReceber ?? 0;
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
            const recent = await fetchRecentTransactions.call(this, 3);
            if (recent.length > 0) targetIds = [recent[0].id];
          }
          if (targetIds.length === 0) {
            // Mostra lista para o King escolher
            const recent2 = await fetchRecentTransactions.call(this, 5);
            if (recent2.length > 0) {
              const lines = recent2.map((t, i) => `${i + 1}. ${t.type === 'INCOME' ? '💵' : '💸'} R$ ${Number(t.amount).toFixed(2).replace('.', ',')} — _${t.description}_ (${t.status})`);
              outMessage = '⚠️ Não encontrei o último lançamento em memória. Seus 5 mais recentes:\n\n' + lines.join('\n') + '\n\nMe fala qual quer cancelar (valor ou número).';
            } else {
              outMessage = '⚠️ Nenhuma transação encontrada na API. Tente novamente.';
            }
          } else {
            for (const id of targetIds) await ck.call(this, 'DELETE', `/api/finance/transactions/${id}`);
            session.lastCreatedTransactions = [];
            const dash = await fetchDashboard.call(this);
            const saldo = dash.saldoDisponivel ?? 0;
            outMessage = `🗑️ *Lançamento Cancelado!*\nRemovi o lançamento com sucesso.\n\n📊 *Saldo Atualizado:* R$ ${Number(saldo).toFixed(2).replace('.', ',')}`;
          }

        // ── DELETE BY CRITERIA (valor ou descrição) ──────────────────
        } else if (args.action === 'delete_by_criteria') {
          const crit = args.criteria || {};
          // Busca mais para ter certeza de encontrar
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
            // Mostra a lista real para o King ver o que está lá de fato
            const listLines = recent.slice(0, 8).map((t, i) =>
              `${i + 1}. ${t.type === 'INCOME' ? '💵' : '💸'} R$ ${Number(t.amount).toFixed(2).replace('.', ',')} — _${t.description}_ (${t.status}) [ID ${t.id}]`
            );
            outMessage = `⚠️ Não encontrei R$ ${crit.amount || '?'} nos últimos 30 lançamentos.\n\n📋 *O que está no sistema:*\n${listLines.join('\n')}\n\n_Fala qual número quer remover._`;
          } else {
            // Deleta os encontrados (máximo 3 para evitar acidente)
            const deleted = [];
            for (const t of targets.slice(0, 3)) {
              const dr = await ck.call(this, 'DELETE', `/api/finance/transactions/${t.id}`);
              if (dr.statusCode >= 200 && dr.statusCode < 300) deleted.push(t);
            }
            session.lastCreatedTransactions = [];
            const dash = await fetchDashboard.call(this);
            const saldo = dash.saldoDisponivel ?? 0;
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
            outMessage = `📋 *Últimos Lançamentos Reais:*\n\n${lines.join('\n')}\n\n_Fala qual quer alterar ou remover pelo número._`;
          }

        // ── ADJUST CASH ──────────────────────────────────────────────
        } else if (args.action === 'adjust_cash') {
          const targetCash = Number(args.target_cash || 0);
          // SEMPRE buscar saldo REAL da API antes de calcular
          const dash = await fetchDashboard.call(this);
          const currentCash = Number(dash.saldoDisponivel ?? 0);
          const diff = targetCash - currentCash;
          if (Math.abs(diff) < 0.01) {
            outMessage = `✅ Saldo em caixa já está em R$ ${targetCash.toFixed(2).replace('.', ',')}. Nenhum ajuste necessário.`;
          } else {
            const adjType = diff > 0 ? 'INCOME' : 'EXPENSE';
            const adjDesc = 'Ajuste de saldo (correção)';
            const cr = await ck.call(this, 'POST', '/api/finance/transactions', { profile_id: profileId, type: adjType, amount: Math.abs(diff), status: 'PAID', description: adjDesc, transaction_date: today });
            const row = (cr.body && cr.body.data) || {};
            if (row.id) session.lastCreatedTransactions = [{ id: row.id, type: adjType, amount: Math.abs(diff), status: 'PAID', description: adjDesc }];
            // Busca saldo real após ajuste
            const dash2 = await fetchDashboard.call(this);
            const newSaldo = dash2.saldoDisponivel ?? 0;
            outMessage = `🔄 *Saldo Ajustado com Sucesso!*\n\nAntes: R$ ${currentCash.toFixed(2).replace('.', ',')}\nAgora: R$ ${Number(newSaldo).toFixed(2).replace('.', ',')}\n\n📝 _Ajuste de ${diff > 0 ? '+' : ''}${diff.toFixed(2).replace('.', ',')} aplicado._`;
          }

        // ── SUMMARY (SEMPRE TEMPO REAL) ──────────────────────────────
        } else if (args.action === 'summary') {
          // ⚠️ NUNCA usar memória — sempre busca da API
          const dash = await fetchDashboard.call(this);
          const fmt = v => `R$ ${Number(v ?? 0).toFixed(2).replace('.', ',')}`;
          outMessage = `📊 *Gestão Financeira — Conecta King*\n_(dados em tempo real)_\n\n` +
            `💰 *Dinheiro em Caixa:* ${fmt(dash.saldoDisponivel)}\n` +
            `📈 *Receitas Recebidas (Mês):* ${fmt(dash.totalRecebido)}\n` +
            `📉 *Despesas Pagas (Mês):* ${fmt(dash.totalPago)}\n` +
            `⏳ *Valores a Receber (Pendentes):* ${fmt(dash.pendenciasReceber)}\n` +
            `📑 *Contas a Pagar (Pendentes):* ${fmt(dash.pendenciasPagar)}`;

        // ── ADVICE (Consultoria) ──────────────────────────────────────
        } else if (args.action === 'advice') {
          // Busca dados reais para contextualizar o conselho
          const dash = await fetchDashboard.call(this);
          const saldo = Number(dash.saldoDisponivel ?? 0);
          const pendRec = Number(dash.pendenciasReceber ?? 0);
          const totalRec = Number(dash.totalRecebido ?? 0);
          const totalPago = Number(dash.totalPago ?? 0);
          const finCtx = `Dados financeiros reais do King:
- Caixa disponível: R$ ${saldo.toFixed(2)}
- Receitas recebidas no mês: R$ ${totalRec.toFixed(2)}
- Despesas pagas no mês: R$ ${totalPago.toFixed(2)}
- Pendências a receber: R$ ${pendRec.toFixed(2)}
- Ticket médio Posicionamento de Imagem: R$ 1.200 (entre 1.000 e 1.400)
- Ticket médio Ensaio Fotográfico: R$ 550

Dê um conselho CFO de elite, tático e prático. Seja direto. Inclua: o que está bem, o que precisa de atenção e 2-3 ações concretas para aumentar o faturamento. Fale em PT-BR, sem enrolação.`;
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
    session.history.push({ role: 'assistant', content: outMessage });
    if (session.history.length > 12) session.history.splice(0, 2);
  }
} catch (e) {
  outMessage = '⚠️ Erro: ' + String(e.message || e).slice(0, 300);
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
            print('     fetchRecentTransactions: OK')
            print('     summary tempo real: OK')
            print('     delete_by_criteria (30 itens): OK')
            print('     adjust_cash saldo real: OK')
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

    print('\n✅ Patch de correção financeira aplicado!')
    print('   Execute: docker compose up -d n8n')


if __name__ == '__main__':
    main()
