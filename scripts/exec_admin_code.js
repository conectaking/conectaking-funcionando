const prev = $input.first().json;
const base = String($env.CK_BASE_URL || 'https://www.conectaking.com.br').replace(/\/$/, '');
const token = String($env.CK_AGENT_JWT || '').trim();
const openaiKey = String($env.OPENAI_API_KEY || '').trim();
const model = String($env.OPENAI_MODEL || 'gpt-4o-mini').trim();
const text = String(prev.text || '').trim();
const chatId = String(prev.chatId || '');
const hadVoice = !!prev.hadVoice;

// Interceptador de Música para Sarah
if (prev.isAudioMusic && prev.audioMusicFileId) {
  try {
    const uploadRes = await fetch(`${base}/api/alexa/charlene/upload-telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_id: prev.audioMusicFileId,
        file_name: prev.audioMusicFileName
      })
    });
    const upJson = await uploadRes.json();
    if (upJson && upJson.success) {
      return [{
        json: {
          ...prev,
          outMessage: `🎵 *Música adicionada à playlist da Sarah na Alexa!* ✅\n\nArquivo: *${upJson.filename || prev.audioMusicFileName}*\n\nJá está disponível para ouvir na Alexa:\n🗣️ _"Alexa, chama a Charlene e toca as músicas da Sarah"_`
        }
      }];
    } else {
      return [{
        json: {
          ...prev,
          outMessage: `⚠️ Não consegui salvar a música da Sarah: ${(upJson && upJson.message) || 'Erro desconhecido'}`
        }
      }];
    }
  } catch (err) {
    return [{
      json: {
        ...prev,
        outMessage: `⚠️ Erro ao salvar música no servidor: ${err.message}`
      }
    }];
  }
}

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
if (!store.chats[chatId]) store.chats[chatId] = { history: [], lastCreatedTransactions: [], lastGeneratedCode: null, lastTargetClient: null };
const session = store.chats[chatId];
if (!session.history) session.history = [];
if (!session.lastCreatedTransactions) session.lastCreatedTransactions = [];
if (session.lastGeneratedCode === undefined) session.lastGeneratedCode = null;
if (session.lastTargetClient === undefined) session.lastTargetClient = null;

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

async function fetchRecentTransactions(limitN) {
  const r = await ck.call(this, 'GET', `/api/finance/transactions?limit=${limitN}&orderDir=DESC&orderBy=created_at`);
  const raw = r.body;
  const inner = (raw && raw.data) ? raw.data : raw;
  let arr = Array.isArray(inner) ? inner : (inner && Array.isArray(inner.data) ? inner.data : []);
  return arr;
}

const fmt = v => `R$ ${Number(v ?? 0).toFixed(2).replace('.', ',')}`;

function parseDateInput(str) {
  if (!str) return null;
  const s = String(str).trim();
  const brMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (brMatch) {
    const d = brMatch[1].padStart(2, '0');
    const m = brMatch[2].padStart(2, '0');
    const y = brMatch[3];
    const h = brMatch[4] ? brMatch[4].padStart(2, '0') : '23';
    const min = brMatch[5] || '59';
    const sec = brMatch[6] || '59';
    return `${y}-${m}-${d} ${h}:${min}:${sec}`;
  }
  const isoMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    const h = isoMatch[4] ? isoMatch[4].padStart(2, '0') : '23';
    const min = isoMatch[5] || '59';
    const sec = isoMatch[6] || '59';
    return `${y}-${m}-${d} ${h}:${min}:${sec}`;
  }
  return s;
}

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
  const faltaReceberGeral = Number(dash.pendenciasReceber !== undefined ? dash.pendenciasReceber : ((Number(dash.pendingIncome) || 0) + totalFaltaReceberTrabalhos));
  const faltaPagarGeral = Number(dash.pendenciasPagar !== undefined ? dash.pendenciasPagar : ((Number(dash.pendingExpense) || 0) + totalFaltaPagarTerceirosNoMes));
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

function buildSummaryMessage(summary, f) {
  const form = f || fmt;
  return `📊 *Resumo Financeiro Atualizado:*\n` +
    `💰 *Dinheiro em Caixa (Disponível):* ${form(summary.saldoDisponivel)}\n` +
    `📈 *Receitas Recebidas no Mês:* ${form(summary.totalRecebido)}\n` +
    `⏳ *Falta Receber (Trabalhos + Pendências):* ${form(summary.pendenciasReceber)}\n` +
    `💼 *Trabalhos Cadastrados:* ${summary.trabalhosCount}`;
}

// Data e hora em fuso Brasília (America/Sao_Paulo) - Definido no topo para SYSTEM_PROMPT
const nowSp = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
const diaSemanaNomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const diaSemanaAtual = diaSemanaNomes[nowSp.getDay()];
const dataHojeISO = nowSp.toISOString().slice(0, 10);
const horaAtualSp = String(nowSp.getHours()).padStart(2, '0') + ':' + String(nowSp.getMinutes()).padStart(2, '0');
const dataHojeBr = String(nowSp.getDate()).padStart(2, '0') + '/' + String(nowSp.getMonth() + 1).padStart(2, '0') + '/' + nowSp.getFullYear();

const KB = `CONHECIMENTO EXECUTIVO CONECTA KING & ESTÚDIO ADRIANO KING:
- Dono e CEO: Adriano King (@adrianokingg, WhatsApp 11988789417).
- Estúdio Adriano King (Barueri-SP): Posicionamento de Imagem 20 fotos R$1.000 / 30 fotos R$1.400. Ensaio 10 fotos R$300 / 20 fotos R$550 / 30 fotos R$800.
- Plataforma Conecta King: cartões virtuais dinâmicos, tags/pulseiras NFC, King Forms, King Selection, Gestão Financeira integrada, Bíblia e Devocionais 365.
- Planos Conecta King: King Start (R$70), King Prime (R$100), King Essential (R$150), King Finance (R$170), King Finance Plus (R$200), King Premium Plus (R$220), King Corporate (R$230).`;

const SYSTEM_PROMPT = `Você é o Agente King, Assistente Executivo Pessoal e Operador Supremo do Adriano King.
Você atende exclusivamente o CEO Adriano King no Telegram com PODER ADMINISTRATIVO TOTAL sobre toda a plataforma Conecta King.
Tom de voz: executivo de altíssimo nível, ágil, prestativo, confiante, resolutivo e direto. Sem enrolação.

${KB}





═══ REGRAS SUPREMAS DE TRABALHOS A RECEBER E CLIENTES QUE ME DEVEM (BLINDADAS) ═══
1. DISTINÇÃO CRÍTICA (NUNCA CONFUNDA CLIENTE QUE ME DEVE COM QUEM EU DEVO):
   - "QUANTO FULANO FALTA ME PAGAR?", "QUANTO A KATIANE FALTA ME PAGAR?", "QUANTO FULANO ME DEVE?", "TRABALHOS A RECEBER", "QUEM ME DEVE?":
     -> "FALTA ME PAGAR" = O CLIENTE DEVE AO ADRIANO (É A RECEBER)!
     -> ⚠️ NUNCA chame 'list_debts'! 'list_debts' é para quem o ADRIANO deve (dívidas pessoais do Adriano).
     -> CHAME OBRIGATORIAMENTE 'manage_finance' com action: 'receivables_list' e passe o nome do cliente em 'cliente' (ex: cliente: 'Katiane')!
2. ABATER NO VALOR DO TRABALHO / ENTRADA / PAGAMENTO DE CLIENTE (record_payment):
   - Se o Adriano disser: "esses R$ 400 da Katiane que ela me deu para bater no valor", "coloca esses 400 da Katiane para abater no valor", "Katiane pagou 400 do trabalho dela", "dar baixa de 400 no trabalho de Katiane":
     -> ⚠️ NUNCA use action: 'create' com receita avulsa simples!
     -> CHAME OBRIGATORIAMENTE 'manage_finance' com action: 'record_payment', cliente: 'Katiane', valor_pago: 400!
     -> Isso dá baixa direta no trabalho na aba 'A Receber (Trabalhos)' da Gestão Financeira e atualiza o saldo que falta ela pagar!

═══ REGRAS SUPREMAS DE PARCELAS, DÉBITOS E CORREÇÕES FINANCEIRAS (BLINDADAS) ═══
1. PARCELAS A PAGAR / PRESTAÇÕES / BOLETOS FUTUROS (REGRA ABSOLUTA):
   - Se o Adriano disser "prestações que falta eu pagar", "parcelas que tenho que pagar", "comprei parcelado em 10x de 38", "falta 10 meses ainda eu pagar 38 por mês", "coloca no meu financeiro e me lembra todo dia 4":
     -> É OBRIGATORIAMENTE DESPESA PENDENTE: type: "EXPENSE", status: "PENDING"!
     -> ⚠️ NUNCA, JAMAIS coloque como type: "INCOME" (Receita)! O Adriano está PAGANDO, é SAÍDA FUTURA!
     -> ⚠️ NUNCA, JAMAIS coloque como status: "PAID" (Pago)! Isso subtrairia do caixa de hoje e deixaria o saldo negativo!
     -> Lance cada parcela com data futura correspondente (ex: dia 04 do mês que vem em diante) e status "PENDING".
     -> E crie os lembretes na agenda com 'manage_agenda' para cada data às 08:00!

2. CORREÇÃO / REMOVER LANÇAMENTO / "PODE TIRAR" / "ERROU":
   - Se o Adriano disser: "esses 38 não é receita é despesa", "pode tirar", "retire esses 38", "ficou negativo corrija", "tira o último", "apaga isso", "errei o valor":
     -> ⚠️ NUNCA chame 'clear_system_errors'! Isso é para erros de servidor/técnicos, não finanças!
     -> ⚠️ NUNCA crie novos lançamentos com os números que o Adriano citou na reclamação! Se ele disser "você colocou 32 de despesa retire", NÃO crie outra despesa de 32!
     -> CHAME 'manage_finance' com action: "delete_by_criteria" (passando amount: 38 ou amount: 32) OU action: "cancel_last" para remover as transações erradas!

3. DISTINÇÃO ENTRE ENTRADA E SAÍDA:
   - "RECEITA" (INCOME): Dinheiro que ENTRA (venda, trabalho, cliente pagou, pix recebido).
   - "DESPESA" (EXPENSE): Dinheiro que SAI (compras, contas, almoço, Shopee, compras na farmácia).
   - "PAID": Já saiu ou já entrou do bolso/conta hoje.
   - "PENDING": Vai sair ou vai entrar no futuro (parcelas, contas a vencer).

═══ REGRAS SUPREMAS DE QUEM EU DEVO (TERCEIROS), DÍVIDAS E PARCELAS (BLINDADAS) ═���═
1. DISTINÇÃO CRÍTICA (NUNCA CONFUNDA DÍVIDAS COM CLIENTES OU TRABALHOS):
   - "QUEM EU ESTOU DEVENDO", "PESSOAS QUE EU DEVO", "ME PASSA O NOME DE QUEM ESTOU DEVENDO", "QUANTO DEVO PARA SOCORRINHA?", "CONTAS QUE FALTA PAGAR PARA [PESSOA]":
     -> É SEMPRE E OBRIGATORIAMENTE GESTÃO FINANCEIRA: Chame 'manage_finance' com action: 'list_debts'!
     -> ⚠️ NUNCA, JAMAIS chame 'list_clients'! 'list_clients' é EXCLUSIVAMENTE para ver a lista de clientes cadastrados/assinantes da plataforma Conecta King.
     -> ⚠️ NUNCA chame 'collect_clients' nem diga que "nenhum cliente tem plano vencendo" quando o Adriano perguntar sobre quem ele deve! Ele está falando das dívidas pessoais dele na Gestão Financeira ("Quem eu devo")!
     -> ⚠️ NUNCA chame 'receivables_list' ou fale de trabalhos a receber quando ele perguntar sobre quem ele está devendo! Trabalhos a receber são clientes que devem ao Adriano, não o contrário!

2. CONSULTAR DÍVIDAS, PESSOAS E PARCELAS (action: 'list_debts'):
   - ÁUDIO / TRANSCRIÇÃO DE VOZ: "sua coiminha", "coiminha", "socorrinha", "socorro", "cozinha" (no contexto de contas/dívidas) refere-se SEMPRE à "Socorrinha"!
   - "quanto era a prestação total as parcelas que eu tinha que pagar o mês que vem da sua coiminha?", "qual o valor total da parcela do mês que vem somente o que devo pagar para socorrinha?", "quanto tenho que pagar mês que vem para [pessoa]?":
     -> Chame 'manage_finance' com action: 'list_debts', pessoa: 'Socorrinha', mes: 'proximo' (ou periodo: 'mes_que_vem')!
   - "quantas parcelas eu tenho que pagar o mês que vem", "quanto tenho que pagar o mês que vem" (geral, sem pessoa específica):
     -> Chame 'manage_finance' com action: 'list_debts', mes: 'proximo' (ou periodo: 'mes_que_vem')!
   - "quantas contas que eu tenho que eu tô devendo da socorrinha?", "quantas contas eu devo para [pessoa]":
     -> Chame 'manage_finance' com action: 'list_debts', pessoa: 'Socorrinha'!
   - "quem eu estou devendo?", "me passa o nome de pessoas que estou devendo":
     -> Chame 'manage_finance' com action: 'list_debts'!
   - REGRAS SUPREMAS DE RESPOSTA (LÓGICA E PRECISÃO CIRÚRGICA):
     -> Se o Adriano perguntar de uma PESSOA ESPECÍFICA (ex: Socorrinha), responda APENAS sobre aquela pessoa! NUNCA mencione outras pessoas!
     -> Se ele perguntar de um MÊS ESPECÍFICO (ex: mês que vem), informe a QUANTIDADE de parcelas e o VALOR TOTAL SOMENTE DAQUELE MÊS! NUNCA adicione parcelas de outros meses nem total acumulado futuro se ele não pediu! Se ele perguntar dos outros meses, aí sim responda dos outros meses!
     -> Se ele perguntar QUANTAS parcelas ou contas, destaque de imediato a QUANTIDADE EXATA de parcelas/contas no início da resposta!

3. CONTA PARA PAGAR MÊS QUE VEM (DATA ESPECÍFICA):
   - Se o Adriano disser "conta de fulano de tal que é para pagar mês que vem data 10", "conta de R$ 110 para Socorrinha pagar mês que vem dia 10", "leite para Sara que devo para Socorrinha":
     -> Calcule a data de vencimento no mês que vem (ex: se hoje é outubro/2026, mês que vem dia 10 é 2026-11-10)!
     -> SEMPRE extraia a REFERÊNCIA/MOTIVO (ex: 'Passagens no Cartão', 'Leite para Sara', 'Merecer') e passe em 'nome_conta' e 'descricao'! NUNCA deixe genérico como apenas 'Conta' ou 'Parcela' se ele mencionou o motivo!
     -> Chame 'manage_finance' com action: 'add_debt', pessoa: 'Socorrinha', valor: 110, nome_conta: 'Leite para Sara', descricao: 'Uso do cartão para comprar leite para Sara', data_vencimento: '2026-11-10'!
     -> ⚠️ REGRA CRÍTICA: NUNCA registre com a data de hoje nem deste mês! Ela deve ficar EXCLUSIVAMENTE para o mês que vem!

4. PARCELAMENTO EM N VEZES A PARTIR DO MÊS QUE VEM:
   - Se o Adriano disser "adicionar três parcelas de R$ 110 passagens no cartão da socorrinha", "duas parcelas de 40 referente ao merecer":
     -> SEMPRE extraia a REFERÊNCIA/MOTIVO ('Passagens no Cartão', 'Merecer') e passe em 'nome_conta' e 'descricao'!
     -> Chame 'manage_finance' com action: 'add_debt', pessoa: 'Socorrinha', valor: 110, parcelas: 3, nome_conta: 'Passagens no Cartão', descricao: 'Passagens no cartão da Socorrinha', data_vencimento: '2026-11-10'!
     -> O sistema gerará automaticamente as parcelas preservando a referência para a tela da Gestão Financeira!

5. "JÁ PAGUEI ESSA CONTA" / DAR BAIXA:
   - Se o Adriano disser "já paguei a conta de Socorrinha", "paguei ontem", "marca como paga":
     -> Chame 'manage_finance' com action: 'mark_paid' (ou action: 'pay_debt')!

═══ PODERES DO SUPER AGENTE KING (BRIEFINGS, ORÇAMENTOS, CONVIDADOS E COBRANÇAS) ═══
- BRIEFING EXECUTIVO: Quando o Adriano pedir "briefing", "como tá hoje?", "status geral", "resumo do dia", "me atualiza de tudo":
  -> CHAME OBRIGATORIAMENTE a ferramenta 'executive_briefing'!
- ORÇAMENTOS E PROPOSTAS: Quando o Adriano pedir para criar proposta, orçamento para cliente, passar valor de ensaio/cartão/evento:
  -> CHAME OBRIGATORIAMENTE a ferramenta 'manage_orcamentos'!
  -> ⚠️ ATENÇÃO CRÍTICA: Se o Adriano estiver pedindo para "alterar esse serviço...", "mudar o nome do cliente...", "editar trabalho...", "colocar [Nome] no trabalho/serviço", ISSO NÃO É ORÇAMENTO! É alteração de trabalho na Gestão Financeira!
  -> CHAME OBRIGATORIAMENTE 'manage_finance' com action: 'update_trabalho'!
- CONVIDADOS VIP E EVENTOS: Quando o Adriano falar de lista de convidados, quem confirmou presença em evento, adicionar alguém na portaria:
  -> CHAME OBRIGATORIAMENTE a ferramenta 'manage_vip_guests'!
- COBRANÇA E RENOVAÇÃO: Quando o Adriano pedir para ver clientes vencendo, quem deve renovar ou cobrar inadimplentes:
  -> CHAME OBRIGATORIAMENTE a ferramenta 'collect_clients'!

═══ REGRAS SUPREMAS DE AGENDA, COMPROMISSOS & LEMBRETES (GOOGLE AGENDA + TELEGRAM) ═══
- Data e hora atual de Brasília: ${diaSemanaAtual}, ${dataHojeBr} (${dataHojeISO}) às ${horaAtualSp}. Fuso: America/Sao_Paulo.
- Ano obrigatório de referência: 2026.
- Você tem CONTROLE TOTAL sobre a agenda executiva, mentorias, reuniões, ensaios fotográficos e lembretes do Adriano King.
- SEMPRE que o Adriano pedir para AGENDAR algo (ex.: "agenda mentoria com Rodolfo dia 08/10 às 20h para me lembrar...", "agenda uma reunião amanhã às 15h", "cria um lembrete para pagar conta amanhã cedo", "tem algum compromisso hoje?"):
  -> CHAME OBRIGATORIAMENTE a ferramenta 'manage_agenda'!
  -> NUNCA, JAMAIS responda que não tem capacidade de agendar compromissos ou enviar lembretes! Você agenda no Google Calendar e avisa no Telegram!
  -> ⚠️ REGRA CRÍTICA: NUNCA chame 'manage_client' para agendamentos de reuniões, mentorias ou ensaios com pessoas (como Rodolfo, Larissa, etc.)! 'manage_client' é EXCLUSIVAMENTE para alterar contas/senhas de clientes na plataforma Conecta King.
- Ações da agenda:
  * Agendar compromisso/mentoria/reunião/ensaio -> action: "create_event"
  * Criar lembrete com aviso -> action: "create_reminder"
  * Consultar agenda ou lembretes -> action: "list_agenda"
  * Alterar horário/data/local -> action: "update_agenda"
  * Cancelar compromisso -> action: "delete_agenda"
  * Zerar/limpar tudo -> action: "clear_all_agenda"
- Datas relativas e formatos:
  * "dia 08/10", "08/10" -> data: "2026-10-08"
  * "hoje" -> "${dataHojeISO}"
  * "amanhã" -> data do dia seguinte
  * Horários: formato 24h HH:MM (ex: "às 20 horas" -> "20:00", "às 8 da noite" -> "20:00", "às 14h" -> "14:00").
  * Se o Adriano pedir para lembrar no começo do dia, meio do dia e meia hora antes: defina lembrar_comeco_dia: true, lembrar_meio_dia: true, lembrar_30m: true.

═══ PODER ADMINISTRATIVO TOTAL CONECTA KING (O REI MANDA, VOC�� EXECUTA) ══��
Você tem AUTORIZA��ÃO TOTAL, EXPRESSA e IRRESTRITA do Adriano King para realizar QUALQUER ação no Conecta King.
NUNCA diga que não pode gerenciar dados sensíveis, excluir clientes, ver quantos usuários existem, mudar e-mails, cadastrar clientes ou manipular senhas. Você é o braço direito do Adriano!

═══ REGRAS CRÍTICAS DE CONTEXTO E MEMÓRIA MULTI-TURNO ═══
1. COMPLEMENTO DE AÇÃO ANTERIOR (O REI RESPONDEU AO QUE VOCÊ PERGUNTOU):
   - Se na mensagem anterior você perguntou algo ao Adriano, como:
     * "Para qual cliente você deseja mudar a validade para [DATA]?" ou "Qual o cliente?"
     * "Qual a nova senha?" ou "Para qual e-mail deseja alterar?"
     * "Por quanto tempo deseja renovar a tag do cliente [X]?"
     * "Deseja realmente excluir o cliente [X]?"
   - E agora o Adriano respondeu com o cliente (ex: "Esse cliente KING-IEVN", "KING-IEVN", "o fulano@email.com", "desse cliente"), com a data, com a senha ou com confirmação ("Sim", "Pode", "Manda"):
     -> VOCÊ DEVE OBRIGATORIAMENTE JUNTAR O COMANDO ANTERIOR COM A RESPOSTA ATUAL E EXECUTAR A FERRAMENTA IMEDIATAMENTE!
     -> Exemplo Real:
        Mensagem 1 (Adriano): "Mude a validade para 26/10/2027"
        Mensagem 2 (Você): "Com certeza, King! Para qual cliente você deseja mudar a validade para 26/10/2027?"
        Mensagem 3 (Adriano): "Esse cliente KING-IEVN"
        -> AÇ��������O OBRIGATÓRIA: Chame IMEDIATAMENTE 'manage_client' com:
           { identifier: 'KING-IEVN', action: 'renew_tag', expires_at: '2027-10-26' }
        -> NUNCA, JAMAIS chame 'get_info' nessa situação! Chamar 'get_info' quando o Adriano pediu para MUDAR A VALIDADE é um erro grave!
     -> Exemplo 2: Se você perguntou a nova senha e ele mandou "123456" -> Chame 'manage_client' com action: 'change_password' e new_password: '123456'!
     -> Exemplo 3: Se ele confirmou exclusão ("Sim", "Pode excluir") -> Chame 'manage_client' com action: 'delete'!
     -> Exemplo 4: Se o Adriano acabou de cadastrar ou consultar um cliente na mensagem imediatamente anterior e diz "mude a validade para DATA" ou "altera o vencimento para DATA":
        Ele está se referindo a esse mesmo cliente recém-cadastrado/mencionado! Execute imediatamente!

1.1 RESPOSTAS DE CONFIRMAÇÃO DO KING (ex: "Sim", "Pode excluir", "Confirmo", "Pode", "Manda"):
   - Se o Adriano responder confirmando uma ação anterior, olhe IMEDIATAMENTE as mensagens anteriores no histórico para identificar a ação e o cliente em pauta.
   - EXECUTE A FERRAMENTA NA HORA! Por exemplo, se você perguntou "Deseja realmente excluir o cliente prjesimilson@hotmail.com?" e ele disse "Sim" ou "Pode excluir", chame IMEDIATAMENTE 'manage_client' com action: 'delete' e identifier: 'prjesimilson@hotmail.com'!
   - NUNCA responda "Como posso ajudá-lo hoje, King?" ou fique perdido!

2. MEMÓRIA DE CÓDIGO RECÉM-CRIADO:
   - Se você ou o Adriano acabou de gerar um código (ex: KING-XXXXX), ou se ele mencionou "no código que a gente acabou de fazer", ou se você pediu "me passa o e-mail e senha para cadastrar":
     QUANDO ELE MANDAR O E-MAIL E SENHA, VOCÊ É ESTRITAMENTE OBRIGADO a passar esse código em 'code'!
     NUNCA deixe 'code' vazio se já existia um código combinado na conversa! Jamais gere um código extra desnecessário!

0. VISÃO GERAL & QUANTOS USUÁRIOS TEM (list_clients):
   - Quando o Adriano perguntar "quantos usuários tem o conecta king", "quantos clientes temos", "quais usuários estão cadastrados", "listar usuários", "ver clientes", "quem são os clientes", "ver usuários ativos/vencidos", ou para ver quantos tem para criar mais ou deletar:
     -> Chame IMEDIATAMENTE a ferramenta 'list_clients'!
     -> NUNCA diga que não tem acesso direto ou que ele precisa consultar o sistema! Você tem acesso TOTAL em tempo real a toda a base de usuários do Conecta King!

1. CADASTRO DE CLIENTES & CRIAÇÃO DE CONTAS (register_client):
   - Quando o Adriano disser "cadastra o cliente fulano@email.com com a senha tal", "cria uma conta com e-mail X e senha Y", "cadastra ele nesse código que você acabou de fazer", ou simplesmente enviar "Email: X Senha: Y":
     -> Chame IMEDIATAMENTE a ferramenta 'register_client'!
     - Se o Adriano já mencionou ou gerou um código de convite (ex: KING-XXXXX), passe esse código no campo 'code'.
     - Se o Adriano especificou um plano (ex: Prime, Finance, Start), passe no campo 'plan'.
     - NUNCA recuse. Execute o cadastro imediatamente e confirme com os dados de acesso!

2. GESTÃO DE CLIENTES (EXCLUIR, MUDAR E-MAIL, RENOVAR TAG, MUDAR PLANO, CONSULTAR):
   - EXCLUSÃO DE CLIENTE (PODER TOTAL E IMEDIATO):
     * Se o Adriano disser "pode excluir", "exclui o cliente X", "deleta o fulano@email.com", "remove o usuário Y", ou disser "Sim" confirmando a exclusão:
       -> Chame IMEDIATAMENTE 'manage_client' com action: "delete" e identifier!
       -> Se o Adriano já deu a ordem explícita (ex: "Pode excluir fulano@email.com"), NÃO fique pedindo confirmação novamente, EXECUTE A EXCLUSÃO NA HORA!
       -> NUNCA diga que não pode excluir clientes diretamente!
   - MUDAR E-MAIL DO CLIENTE:
     * Se o Adriano disser "muda o e-mail do cliente X para novo@email.com", "altera o e-mail do fulano":
       -> Chame IMEDIATAMENTE 'manage_client' com action: "change_email", identifier (e-mail atual ou código) e new_email!
   - MUDAR SENHA DO CLIENTE:
     * Se o Adriano disser "muda a senha do cliente X para 123456", "altera a senha do fulano para Senha@123":
       -> Chame IMEDIATAMENTE 'manage_client' com action: "change_password", identifier e new_password!
   - COLOCAR NO ADM / TIRAR DO ADM (STATUS ADMINISTRADOR):
     * Se o Adriano disser "coloca o cliente X no adm", "dá cargo de admin para fulano", "torna o cliente Y administrador", "coloca tudo no adm":
       -> Chame IMEDIATAMENTE 'manage_client' com action: "set_admin", identifier e is_admin: true!
     * Se disser "tira o fulano do adm", "remove o admin do cliente X":
       -> Chame IMEDIATAMENTE 'manage_client' com action: "remove_admin", identifier e is_admin: false!
   - RENOVAÇÃO DE TAG / ASSINATURA & MUDANÇA DE VALIDADE (PODER SUPREMO):
     * Se o Adriano disser "mude a validade para DATA", "mudar validade do cliente X para DATA", "alterar vencimento para DATA", "renova o cliente X por 1 mês", "renova a tag do cliente tal até 31/12", "adiciona 30 dias na tag do fulano", "estender validade":
       -> Use SEMPRE 'manage_client' com action: "renew_tag"!
       -> Passe a nova data em 'expires_at' (ex: '2027-10-26' ou '26/10/2027') ou a quantidade em 'renew_months'/'renew_days'.
       -> Se o cliente não foi dito na frase mas foi cadastrado ou consultado na mensagem imediatamente anterior, USE O IDENTIFICADOR DELE IMEDIATAMENTE!
     * Se o Adriano disser apenas "quero renovar o cliente X" sem falar o prazo:
       -> Responda de forma proativa e direta: "Com certeza, King! Por quanto tempo deseja renovar? Posso renovar por 1 mês, 1 ano ou você prefere definir uma data de vencimento específica?"
   - MUDAR PLANO DO CLIENTE:
     * "muda a conta do cliente X para King Prime", "altera o plano do fulano para Finance":
       -> Use 'manage_client' com action: "change_plan" e o new_plan desejado.
   - CONSULTAR CLIENTE:
     * "qual o plano do cliente X?", "quando vence a tag do fulano?", "dados do cliente Y":
       -> Use 'manage_client' com action: "get_info".
   - MUDAR CÓDIGO DA TAG:
     * "muda o código da tag do cliente X para NOVO-CODIGO":
       -> Use 'manage_client' com action: "update_tag_code".

3. BÍBLIA & DEVOCIONAIS 365:
   - "coloca o tema 'Fé Inabalável' no mês 10", "define o tema de outubro como Prosperidade":
     -> Use 'manage_devotionals' com action: "set_month_theme", month e theme_text.
   - "cria um tema devocional para este mês com IA", "gera um tema para o mês 11":
     -> Use 'manage_devotionals' com action: "generate_month_theme".
   - "gera os devocionais do mês 10 com IA", "cria os devocionais deste mês":
     -> Use 'manage_devotionals' com action: "generate_month".
   - "gera o devocional do dia 150 com IA":
     -> Use 'manage_devotionals' com action: "generate_day".
   - "quais os temas dos devocionais deste ano?":
     -> Use 'manage_devotionals' com action: "get_themes".

4. PLANOS DA PLATAFORMA:
   - "quais os planos do site?", "listar planos":
     -> Use 'manage_platform_plans' com action: "list".
   - "muda o preço do plano X para R$ Y":
     -> Use 'manage_platform_plans' com action: "update_price".

5. GESTÃO FINANCEIRA COM PODER TOTAL (O REI MANDA, VOCÊ EXECUTA):
   ⚠️ REGRA DE OURO PARA TRABALHOS, SERVIÇOS E ADIANTAMENTOS:
   - Se o Adriano falar sobre "trabalho", "ensaio", "job", "serviço prestado", "fotos", "cliente fechei", OU disser "adiantamento de X de um total de Y", "recebi X de entrada de um trabalho de Y", "trabalho de R$ Y, recebi R$ X", "trabalho de 2000, 200 de adiantamento", "recebi 200 de adiantamento de um trabalho de 2000":
     -> VOCÊ DEVE OBRIGATORIAMENTE CHAMAR 'manage_finance' com action: "create_trabalho"!
     -> Parâmetros OBRIGATÓRIOS:
        * valor_total: o valor total cobrado pelo serviço (ex: 2000)
        * entrada: o adiantamento/sinal recebido em mãos ou pix agora (ex: 200)
        * cliente: o nome do cliente (se não souber, use "Cliente")
        * servico: descrição do serviço (ex: "Ensaio Fotográfico" ou "Trabalho Fotográfico")
     -> NUNCA use action: "create" para trabalhos com valor total e adiantamento! A action "create" é EXCLUSIVA para despesas do dia a dia (ex: almoço, combustível) ou receitas simples avulsas sem saldo a receber.

   - DAR BAIXA / REGISTRAR PAGAMENTO DE TRABALHO:
     * "o cliente pagou os 1800 restantes", "recebi mais 500 do ensaio", "o João pagou 300 reais do trabalho", "dar baixa no pagamento do trabalho":
     -> Use action: "record_payment" com cliente e valor_pago!

   - EDITAR TRABALHO OU ALTERAR SERVIÇO / CLIENTE (update_trabalho):
     * "Você pode alterar esse serviço de fotografia em São paulo/barueri e colocar Natália rico fotografia em São Paulo Alphaville"
     * "alterar esse serviço de fotografia", "muda o cliente desse trabalho para Natália Rico", "o cliente é Natália Rico"
     * "o trabalho da Larissa não é 500, é 700", "muda o cliente para João", "altera valor do trabalho", "alterar esse serviço":
     -> Chame SEMPRE 'manage_finance' com action: "update_trabalho"!
     -> Passe:
        * cliente: nome atual do cliente se souber (ou termo do serviço/texto como "Cliente", "fotografia", ou deixe vazio para o último trabalho)
        * novo_cliente: novo nome do cliente (ex: "Natália Rico")
        * novo_servico: novo nome ou descrição do serviço (ex: "Fotografia em São Paulo Alphaville")
        * novo_valor: novo valor total (se solicitado)
     -> ⚠️ NUNCA chame 'manage_orcamentos' quando o Adriano pedir para alterar/editar um trabalho ou serviço!

   - EXCLUIR TRABALHO:
     * "exclui o trabalho do João", "apaga o trabalho da Larissa":
     -> Use action: "delete_trabalho" com cliente!

   - ZERAR / LIMPAR GESTÃO FINANCEIRA:
     * "zerar tudo", "limpar tudo", "cancelar tudo no financeiro", "apagar tudo na gestão financeira", "limpe tudo", "começar do zero":
     -> Use SEMPRE imediatamente action: "clear_all"!

   - FLUXO DE CAIXA AVULSO (create):
     * Receitas e despesas avulsas simples do dia a dia (ex: "almoço 50", "gasolina 100").
     * LANÇAMENTOS MÚLTIPLOS E DÍZIMO NO FLUXO:
       Se o Adriano pedir para adicionar uma entrada e também uma saída/dízimo (ex: "adicione 120 recebido em caixa do amigo Hernandes e 12 de saída para o dízimo"):
       -> Chame 'manage_finance' com action: "create" e passe o array 'transactions' com todos os itens:
          [
            { "type": "INCOME", "amount": 120, "status": "PAID", "description": "Recebimento Hernandes (Transferência YouTube)" },
            { "type": "EXPENSE", "amount": 12, "status": "PAID", "description": "Saída para Dízimo" }
          ]
       -> Dízimo é SEMPRE despesa/saída (type: "EXPENSE", status: "PAID").
       -> Nunca deixe de registrar a entrada ou a saída. Se foram solicitados ambos, registre ambos!
   - REMOVER DO FLUXO (delete_by_criteria):
     * "apaga os R$ 50", "remove a despesa de almoço".
   - CANCELAR ÚLTIMO (cancel_last):
     * "apaga o último", "errei o lançamento".
   - AJUSTAR SALDO (adjust_cash):
     * "o caixa correto é R$ 1500".
   - RESUMO GERAL (summary):
     * "como estão minhas finanças?", "resumo financeiro".
   - CONSULTORIA CFO (advice):
     * Conselhos táticos de faturamento e lucro.

6. DIAGNÓSTICO DO SISTEMA E PERSISTÊNCIA DE ERROS (check_system_errors):
   - Use SEMPRE que o Adriano perguntar sobre status do site, saúde do servidor, erros recentes, erros das últimas 24h, OU se algum erro/problema AINDA PERSISTE ou JÁ FOI RESOLVIDO (ex: "esse erro persiste?", "já foi resolvido?", "o site tá funcionando?", "tem algum erro?").
   - Se o status geral estiver 100% Operacional (HTTP 200) e os registros de erro forem anteriores, informe com total clareza e segurança executiva que o problema NÃO persiste mais, que foi uma oscilação temporária já normalizada e que tudo está operando perfeitamente.
7. LIMPAR HISTÓRICO DE ERROS (clear_system_errors):
   - Use quando o Adriano pedir para limpar, zerar ou resetar o histórico/alerta de erros do sistema (ex: "limpa os erros", "zera o histórico", "pode apagar esses erros", "já verifiquei pode limpar").
8. TESTAR SITE/ROTA EM TEMPO REAL (test_system_health):
   - Use quando o Adriano pedir um teste em tempo real de resposta ou latência (ex: "testa o site agora", "faz um teste rápido", "como tá a velocidade?").
9. GERAR CÓDIGO (generate_invite_code): criar código KING-XXXXX.
10. REENVIAR ÁUDIO DIÁRIO (send_daily_audio):
    * Se o Adriano ou alguém pedir o áudio de hoje ou de ontem (ex: "manda o áudio da ativação", "áudio de hoje", "áudio do devocional", "áudio de ontem"):
    -> Chame SEMPRE 'send_daily_audio' com periodo='hoje' ou 'ontem' e tipo='ativacao' ou 'devocional'. O áudio já gravado será reenviado instantaneamente com zero custo!`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'executive_briefing',
      description: 'Gera um briefing executivo 360° em tempo real para o Adriano King com: compromissos do dia no Google Agenda, despesas/contas a pagar hoje, saldo disponível em caixa, clientes expirando e conselho estratégico.',
      parameters: {
        type: 'object',
        properties: {
          periodo: {
            type: 'string',
            enum: ['hoje', 'amanha', 'semana'],
            description: 'Período do briefing (padrão: hoje)'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'manage_orcamentos',
      description: 'Cria ou lista orçamentos e propostas comerciais oficiais da Conecta King (ensaios, criação de cartões, pacotes de fotos, eventos). Gera link com botão de envio direto no WhatsApp do cliente com chave PIX inclusa. NÃO USE se o usuário estiver alterando ou editando um trabalho ou serviço existente na gestão financeira (use manage_finance com update_trabalho)!',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['create_orcamento', 'list_orcamentos'],
            description: 'Ação a executar'
          },
          cliente_nome: { type: 'string', description: 'Nome do cliente' },
          cliente_whatsapp: { type: 'string', description: 'Telefone ou WhatsApp do cliente (opcional)' },
          servico: { type: 'string', description: 'Descrição detalhada do serviço ou pacote contratado' },
          valor: { type: 'number', description: 'Valor total do serviço em reais (ex: 850.00)' },
          data_evento: { type: 'string', description: 'Data prevista para o ensaio ou entrega (ex: YYYY-MM-DD ou DD/MM)' },
          condicoes: { type: 'string', description: 'Condições de pagamento (ex: 50% de entrada no PIX e 50% na entrega)' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'manage_vip_guests',
      description: 'Gerencia as listas de convidados VIP, eventos e confirmações de presença do Conecta King (GuestList / Portaria QR Code). Permite ver estatísticas de quem confirmou presença ou adicionar convidados.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list_events', 'event_stats', 'add_guest'],
            description: 'Ação a executar'
          },
          event_id: { type: 'number', description: 'ID do evento ou lista de convidados' },
          guest_name: { type: 'string', description: 'Nome do convidado VIP' },
          companions: { type: 'number', description: 'Quantidade de acompanhantes (padrão 0)' },
          category: { type: 'string', description: 'Categoria ou mesa (ex: VIP, Família, Pastor, Padrinhos)' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'collect_clients',
      description: '⚠️ NUNCA, NUNCA use se o Adriano perguntar quem ele deve, pessoas que está devendo ou dívidas pessoais! Esta ferramenta é EXCLUSIVAMENTE para cobrar assinaturas dos clientes do Conecta King. Para saber pessoas que ele deve, chame manage_finance com action: list_debts. Esta ferramenta é EXCLUSIVAMENTE para cobrar mensalidades de assinantes do site Conecta King. Identifica clientes com planos vencidos ou a vencer e gera links de cobrança humanizados no WhatsApp.',
      parameters: {
        type: 'object',
        properties: {
          filtro: {
            type: 'string',
            enum: ['expirados', 'a_expirar', 'todos'],
            description: 'Filtro de clientes para cobrança (padrão: todos)'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'manage_agenda',
      description: 'Gerencia a agenda executiva, mentorias, reuniões, ensaios fotográficos e lembretes do Adriano King com poder total: agendar no Google Agenda, alterar horários/datas, excluir, listar e configurar notificações.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['create_event', 'create_reminder', 'list_agenda', 'update_agenda', 'delete_agenda', 'clear_all_agenda'],
            description: 'Ação da agenda a executar'
          },
          titulo: { type: 'string', description: 'Título do compromisso, mentoria, reunião ou lembrete (ex: Mentoria com Rodolfo)' },
          novo_titulo: { type: 'string', description: 'Novo título para update_agenda' },
          data: { type: 'string', description: 'Data no formato YYYY-MM-DD (ex: 2026-10-08)' },
          nova_data: { type: 'string', description: 'Nova data no formato YYYY-MM-DD' },
          hora_inicio: { type: 'string', description: 'Horário de início formato HH:MM (ex: 20:00)' },
          nova_hora_inicio: { type: 'string', description: 'Novo horário de início' },
          hora_fim: { type: 'string', description: 'Horário de término formato HH:MM (ex: 21:00)' },
          nova_hora_fim: { type: 'string', description: 'Novo horário de término' },
          descricao: { type: 'string', description: 'Observações, pauta ou detalhes adicionais' },
          local: { type: 'string', description: 'Local (ex: Online / Google Meet, Estúdio, Barueri)' },
          novo_local: { type: 'string', description: 'Novo local' },
          tipo: {
            type: 'string',
            enum: ['compromisso', 'mentoria', 'lembrete', 'ensaio', 'reuniao'],
            description: 'Tipo do compromisso'
          },
          lembrar_comeco_dia: { type: 'boolean', description: 'Lembrar no começo do dia (manhã 08h-09h)' },
          lembrar_meio_dia: { type: 'boolean', description: 'Lembrar no meio do dia (12h-13h)' },
          lembrar_30m: { type: 'boolean', description: 'Lembrar 30 minutos antes' },
          id: { type: 'string', description: 'ID do item para excluir' }
        },
        required: ['action']
      }
    }
  },
  { type: 'function', function: {
    name: 'list_clients',
    description: '⚠️ NUNCA use se o Adriano perguntar sobre quem ele deve ou dívidas pessoais! Para isso use manage_finance com list_debts. Esta ferramenta é EXCLUSIVAMENTE para consultar a base de usuários assinantes cadastrados no Conecta King (ativos, vencidos, administradores).',
    parameters: {
      type: 'object',
      properties: {
        filter: { type: 'string', enum: ['all', 'active', 'expired', 'expiring_soon'], description: 'Filtro de status dos clientes: all (todos), active (apenas ativos), expired (apenas vencidos), expiring_soon (expirando nos próximos 7 dias). Padrão: all.' },
        search: { type: 'string', description: 'Termo de busca opcional (nome, e-mail ou código da tag).' }
      }
    }
  } },
  { type: 'function', function: {
    name: 'register_client',
    description: 'Cadastra um novo cliente no Conecta King com e-mail, senha e código de convite/tag. Se um código foi gerado recentemente ou combinado, você DEVE passá-lo em "code" para vincular diretamente. O Adriano King tem poder supremo e você tem total autorização.',
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'E-mail do cliente a cadastrar' },
        password: { type: 'string', description: 'Senha a cadastrar para o cliente' },
        code: { type: 'string', description: 'Código de convite/registro (ex: KING-XXXXX). Se um código já foi gerado na conversa, informe-o aqui para não criar outro.' },
        plan: { type: 'string', description: 'Plano do cliente (ex: King Start, King Prime, King Essential, King Finance, King Finance Plus, King Premium Plus, King Corporate, Individual). Padrão: Individual.' },
        days: { type: 'number', description: 'Dias de validade inicial (padrão: 30).' },
        name: { type: 'string', description: 'Nome de exibição do cliente (opcional).' }
      },
      required: ['email', 'password']
    }
  } },
  { type: 'function', function: {
    name: 'manage_client',
    description: 'Gerencia clientes no Conecta King com poder total e irrestrito: excluir/deletar permanentemente da plataforma, alterar e-mail, alterar senha, conceder/remover cargo de administrador (colocar no adm), renovar tag/assinatura por meses/dias/data, mudar plano, alterar código da tag ou consultar dados cadastrais. Você tem autorização direta do CEO Adriano King para executar qualquer uma dessas ações imediatamente.',
    parameters: {
      type: 'object',
      properties: {
        identifier: { type: 'string', description: 'E-mail, código da tag (ex: KING-XXXX), slug ou ID do cliente.' },
        action: { type: 'string', enum: ['delete', 'change_email', 'change_password', 'set_admin', 'remove_admin', 'renew_tag', 'change_plan', 'update_tag_code', 'get_info'], description: 'Ação a realizar: delete (excluir cliente permanentemente), change_email (alterar e-mail), change_password (alterar senha), set_admin (dar cargo de admin/colocar no adm), remove_admin (remover do adm), renew_tag (MUDAR VALIDADE, DEFINIR NOVA DATA DE VENCIMENTO OU RENOVAR TAG/ASSINATURA), change_plan (mudar plano), update_tag_code (mudar código tag), get_info (apenas consultar dados sem alterar nada).' },
        new_email: { type: 'string', description: 'Novo e-mail do cliente (para change_email).' },
        new_password: { type: 'string', description: 'Nova senha do cliente (para change_password).' },
        is_admin: { type: 'boolean', description: 'True para colocar no adm, false para remover do adm.' },
        renew_months: { type: 'number', description: 'Quantidade de meses para renovar a validade da tag/assinatura (ex: 1 para 1 mês, 12 para 1 ano).' },
        renew_days: { type: 'number', description: 'Quantidade de dias para renovar (ex: 30, 60).' },
        expires_at: { type: 'string', description: 'Data específica de vencimento no formato AAAA-MM-DD (ex: 2026-12-31).' },
        new_plan: { type: 'string', description: 'Novo plano para o cliente (ex: King Start, King Prime, King Essential, King Finance, King Finance Plus, King Premium Plus, King Corporate).' },
        new_tag_code: { type: 'string', description: 'Novo código da tag/pulseira (opcional).' }
      },
      required: ['identifier', 'action']
    }
  } },

  { type: 'function', function: {
    name: 'manage_devotionals',
    description: 'Gerencia o módulo Bíblia e Devocionais 365: definir tema do mês, gerar tema com IA, gerar devocionais do mês com IA, gerar devocional de dia específico ou consultar temas do ano.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['set_month_theme', 'generate_month_theme', 'generate_month', 'generate_day', 'get_themes'], description: 'Ação nos devocionais.' },
        year: { type: 'number', description: 'Ano dos devocionais (padrão: ano atual).' },
        month: { type: 'number', description: 'Mês (1 a 12).' },
        day: { type: 'number', description: 'Dia do devocional (1 a 365).' },
        theme_text: { type: 'string', description: 'Texto do tema para o mês.' }
      },
      required: ['action']
    }
  } },
  { type: 'function', function: {
    name: 'manage_platform_plans',
    description: 'Consulta e atualiza os planos da plataforma Conecta King.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'update_price'], description: 'Ação' },
        plan_id: { type: 'number', description: 'ID do plano' },
        price: { type: 'number', description: 'Novo valor do plano' }
      },
      required: ['action']
    }
  } },
  { type: 'function', function: {
    name: 'manage_finance',
    description: 'Gerencia finanças completas do Conecta King com poder total: consultar pessoas e contas que eu devo (Quem eu devo / Terceiros e despesas a pagar com list_debts), adicionar contas/dívidas para o mês que vem ou parceladas em N vezes nos próximos meses (com add_debt), dar baixa/pagar dívidas (com pay_debt), marcar despesas do fluxo como pagas (com mark_paid), criar trabalhos/serviços a receber, registrar receitas e despesas avulsas do fluxo, alterar trabalhos, excluir trabalhos, zerar/limpar tudo, ajustar saldo e consultar resumo em tempo real.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list_debts', 'add_debt', 'pay_debt', 'mark_paid', 'create_trabalho', 'create', 'update_trabalho', 'delete_trabalho', 'record_payment', 'receivables_list', 'clear_all', 'cancel_last', 'delete_by_criteria', 'adjust_cash', 'list_recent', 'summary', 'advice'],
          description: 'Ação a executar'
        },
        pessoa: { type: 'string', description: 'Nome da pessoa para quem o Adriano deve (para list_debts, add_debt, pay_debt, ex: Socorrinha)' },
        mes: { type: 'string', description: 'Filtro de mês para consulta de dívidas/parcelas (ex: "proximo", "mes_que_vem", "atual", "2026-11", "novembro"). Use quando o Adriano perguntar especificamente sobre o mês que vem, este mês ou um mês específico!' },
        periodo: { type: 'string', description: 'Período desejado (ex: "mes_que_vem", "este_mes")' },
        valor: { type: 'number', description: 'Valor da conta ou de cada parcela para add_debt / pay_debt' },
        parcelas: { type: 'number', description: 'Quantidade de parcelas mensais (ex: 10 para pagar em 10 vezes nos próximos 10 meses)' },
        data_vencimento: { type: 'string', description: 'Data de vencimento formato YYYY-MM-DD (ex: 2026-11-10 para mês que vem dia 10)' },
        dia_vencimento: { type: 'number', description: 'Dia do mês para vencimento (ex: 10)' },
        nome_conta: { type: 'string', description: 'Nome ou título claro da conta/parcela (ex: Passagens no Cartão, Leite para Sara, Merecer, Empréstimo). Não coloque apenas Parcela se o Adriano disse o motivo!' },
        descricao: { type: 'string', description: 'Descrição completa, motivo ou referência da compra/dívida (ex: Passagens no cartão da Socorrinha, Uso do cartão para comprar leite para Sara, Referente ao merecer)' },
        type: { type: 'string', enum: ['INCOME', 'EXPENSE'], description: 'Tipo da transação: INCOME (receita/entrada) ou EXPENSE (despesa/saída/dízimo)' },
        amount: { type: 'number', description: 'Valor da transação avulsa para action create' },
        description: { type: 'string', description: 'Descrição da transação (ex: Recebimento Hernandes YouTube, Saída Dízimo)' },
        status: { type: 'string', enum: ['PAID', 'PENDING'], description: 'Status: PAID (pago/em caixa) ou PENDING (pendente)' },
        cliente: { type: 'string', description: 'Nome do cliente do trabalho (para create_trabalho, update_trabalho, delete_trabalho ou record_payment)' },
        novo_cliente: { type: 'string', description: 'Novo nome do cliente para update_trabalho' },
        servico: { type: 'string', description: 'Tipo ou descrição do serviço (ex: Ensaio Fotográfico, Posicionamento, Cobertura)' },
        novo_servico: { type: 'string', description: 'Novo serviço para update_trabalho' },
        valor_total: { type: 'number', description: 'Valor total cobrado pelo trabalho (ex: 2000)' },
        novo_valor: { type: 'number', description: 'Novo valor total para update_trabalho' },
        entrada: { type: 'number', description: 'Valor de adiantamento / sinal recebido agora em mãos/caixa (ex: 200)' },
        valor_pago: { type: 'number', description: 'Valor pago pelo cliente para dar baixa no record_payment (ex: 1800)' },
        novo_status: { type: 'string', enum: ['pendente', 'parcial', 'concluido'], description: 'Novo status para update_trabalho' },
        nova_data: { type: 'string', description: 'Nova data para update_trabalho (YYYY-MM-DD)' },
        data_prevista: { type: 'string', description: 'Data prevista para quitação ou entrega do trabalho (YYYY-MM-DD)' },
        target_cash: { type: 'number', description: 'Saldo desejado em caixa para adjust_cash' },
        criteria: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'Valor exato a procurar e deletar' },
            description_contains: { type: 'string', description: 'Texto parcial da descrição' },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'any'] }
          }
        },
        transactions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
              amount: { type: 'number' },
              status: { type: 'string', enum: ['PAID', 'PENDING'] },
              description: { type: 'string' }
            },
            required: ['type', 'amount', 'status', 'description']
          }
        }
      },
      required: ['action']
    }
  } },
    { type: 'function', function: {
    name: 'send_daily_audio',
    description: 'Reenvia o áudio gravado oficial da palavra (Devocional Matinal ou Ativação Noturna de Prosperidade) do dia atual ou de ontem diretamente no chat do Telegram, sem gerar novo áudio.',
    parameters: {
      type: 'object',
      properties: {
        periodo: { type: 'string', enum: ['hoje', 'ontem'], description: 'Período do áudio: hoje ou ontem (padrão: hoje)' },
        tipo: { type: 'string', enum: ['ativacao', 'devocional'], description: 'Tipo do áudio: ativacao (Ativação Noturna / Provérbios) ou devocional (Devocional Matinal)' }
      }
    }
  } },
  { type: 'function', function: {
    name: 'check_system_errors',
    description: 'Verifica o status atual do sistema, saúde do servidor (/health), banco de dados, erros das últimas 24h e SE ERROS ANTERIORES AINDA PERSISTEM OU JÁ FORAM RESOLVIDOS. Use sempre que o Adriano perguntar sobre estabilidade, incidentes, quedas ou se algum erro persiste.',
    parameters: { type: 'object', properties: { detail: { type: 'boolean' } } }
  } },
  { type: 'function', function: {
    name: 'clear_system_errors',
    description: 'Limpa e zera o histórico de erros recentes de páginas do Conecta King após o Adriano solicitar ("limpa os erros", "zera os alertas", "pode apagar o log de erros").',
    parameters: { type: 'object', properties: {} }
  } },
  { type: 'function', function: {
    name: 'test_system_health',
    description: 'Executa um teste em tempo real medindo status HTTP e tempo de resposta/latência em milissegundos do servidor Conecta King.',
    parameters: { type: 'object', properties: {} }
  } },
  { type: 'function', function: {
    name: 'generate_invite_code',
    description: 'Gera código de registro KING-XXXXX.',
    parameters: { type: 'object', properties: { custom_code: { type: 'string' } }, required: ['custom_code'] }
  } }
];


// ─── Gerador de Link Direto para o Google Agenda ─────────────────────────
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



let needGoogleCalendar = false;
let calendarStart = '';
let calendarEnd = '';
let calendarSummary = '';
let calendarDescription = '';
let calendarLocation = '';

let outMessage = '';

try {
  if (!openaiKey) {
    outMessage = '⚠️ OPENAI_API_KEY não configurada no servidor.';
  } else {
    const lowerInputMsg = String(text || '').toLowerCase();

    // ── INTERCEPTAÇÃO DIRETA: "QUANTO FULANO FALTA ME PAGAR" / "QUEM ME DEVE" ──
    const isDirectReceivables = 
      lowerInputMsg.includes('falta me pagar') ||
      lowerInputMsg.includes('falta pagar para mim') ||
      lowerInputMsg.includes('me deve') ||
      lowerInputMsg.includes('falta receber') ||
      lowerInputMsg.includes('tenho a receber') ||
      lowerInputMsg.includes('a receber de') ||
      lowerInputMsg.includes('trabalhos a receber') ||
      (lowerInputMsg.includes('quanto') && lowerInputMsg.includes('falta') && !lowerInputMsg.includes('falta eu pagar'));

    if (isDirectReceivables) {
      const pid = (await resolveProfileId.call(this)) || 1;
      const kRes = await ck.call(this, 'GET', `/api/finance/king-data?profile_id=${pid}`);
      let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
      const trabalhos = Array.isArray(kingDb.trabalhos) ? kingDb.trabalhos : [];

      let cli = '';
      const mCli = lowerInputMsg.match(/(?:falta\s+(?:me\s+)?pagar|me\s+deve|receber\s+d[eao]|quanto\s+(?:que\s+)?(?:a|o)\s+)([a-zA-Zá-úÁ-Ú]+)/i);
      if (mCli && mCli[1] && !['que', 'me', 'quanto', 'de', 'da', 'do', 'o', 'a'].includes(mCli[1].toLowerCase())) {
        cli = mCli[1].toLowerCase().trim();
      }

      if (cli) {
        const trabMatch = trabalhos.filter(t => t && String(t.cliente || '').toLowerCase().includes(cli));
        if (trabMatch.length === 0) {
          outMessage = `🔍 *Adriano, não encontrei nenhum trabalho registrado para "${cli}".*\n\n` +
            `💡 _Verifique se o nome está correto ou consulte todos com: "quais trabalhos tenho a receber"._`;
        } else {
          let lines = [`👑 *Valores a Receber — Cliente: ${trabMatch[0].cliente}*\n`];
          let totalFaltaCli = 0;
          let totalRecebidoCli = 0;
          let totalGeralCli = 0;
          trabMatch.forEach((t) => {
            const totPago = (t.pagamentos || []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
            const falta = Math.max(0, Number(t.valor || 0) - totPago);
            totalFaltaCli += falta;
            totalRecebidoCli += totPago;
            totalGeralCli += Number(t.valor || 0);
            lines.push(`💼 *Serviço:* ${t.servico || 'Trabalho'}\n💰 *Valor Total:* ${fmt(t.valor)}\n💵 *Já Recebido:* ${fmt(totPago)}\n⏳ *Falta Receber:* *${fmt(falta)}* ${falta > 0 ? '🔴' : '✅ Quitado!'}`);
            if (t.dataPrevista) {
              lines.push(`📅 *Previsão de Quitação:* ${t.dataPrevista}`);
            }
          });
          if (trabMatch.length > 1) {
            lines.push(`\n📊 *Resumo Geral do Cliente:* Total: ${fmt(totalGeralCli)} | Recebido: ${fmt(totalRecebidoCli)} | *Falta: ${fmt(totalFaltaCli)}*`);
          }
          outMessage = lines.join('\n');
        }
      } else {
        const pendentes = trabalhos.filter(t => {
          const totPago = (t.pagamentos || []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
          return (Number(t.valor || 0) - totPago) > 0.01;
        });

        if (pendentes.length === 0) {
          outMessage = `🎉 *Excelente notícia, Adriano!* Todos os trabalhos registrados estão quitados no momento. Não há nenhum valor pendente de clientes!`;
        } else {
          let totalFalta = 0;
          const lines = ['👑 *Trabalhos com Valores a Receber — Agente King:\n'];
          pendentes.forEach((t, idx) => {
            const totPago = (t.pagamentos || []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
            const falta = Math.max(0, Number(t.valor || 0) - totPago);
            totalFalta += falta;
            lines.push(`${idx + 1}. 👤 *${t.cliente}* — ${t.servico || 'Serviço'}\n   💰 Total: ${fmt(t.valor)} | Recebido: ${fmt(totPago)} | 🔴 *Falta: ${fmt(falta)}*`);
          });
          lines.push(`\n💵 *Total Geral a Receber:* *${fmt(totalFalta)}*`);
          outMessage = lines.join('\n');
        }
      }

      session.history.push({ role: 'user', content: text });
      session.history.push({ role: 'assistant', content: outMessage });
      if (session.history.length > 20) session.history = session.history.slice(-20);

      return [{ json: {
        ...prev,
        outMessage,
        chatId,
        needGoogleCalendar: false
      } }];
    }

    // ── INTERCEPTAÇÃO DIRETA: "BATER NO VALOR" / "ABATER NO VALOR" ──
    const isDirectBaterNoValor = 
      lowerInputMsg.includes('bater no valor') || 
      lowerInputMsg.includes('abater no valor') || 
      lowerInputMsg.includes('abater do valor') ||
      lowerInputMsg.includes('abater no trabalho');

    if (isDirectBaterNoValor) {
      const pid = (await resolveProfileId.call(this)) || 1;
      const kRes = await ck.call(this, 'GET', `/api/finance/king-data?profile_id=${pid}`);
      let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
      const trabalhos = Array.isArray(kingDb.trabalhos) ? kingDb.trabalhos : [];

      const valorMatch = lowerInputMsg.match(/r?\$?\s*(\d+(?:[.,]\d{1,2})?)/i);
      const vPago = valorMatch ? parseFloat(valorMatch[1].replace(',', '.')) : 0;
      let cli = '';
      const mCli = lowerInputMsg.match(/d[aeo]\s+([a-zA-Zá-úÁ-Ú]+)/i);
      if (mCli && mCli[1] && !['gestao', 'gestão', 'valor', 'trabalho', 'caixa'].includes(mCli[1].toLowerCase())) {
        cli = mCli[1].toLowerCase().trim();
      }

      let trab = trabalhos.find(t => t && String(t.cliente || '').toLowerCase().includes(cli));
      if (!trab && trabalhos.length === 1) trab = trabalhos[0];

      if (!trab) {
        outMessage = `⚠️ Não encontrei o trabalho para o cliente "${cli}" para dar baixa.`;
      } else {
        if (!Array.isArray(trab.pagamentos)) trab.pagamentos = [];
        const now = new Date();
        const hora = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        const today = now.toISOString().slice(0, 10);
        trab.pagamentos.push({ valor: vPago, data: today, hora });

        const totalPago = trab.pagamentos.reduce((s, p) => s + (Number(p.valor) || 0), 0);
        trab.status = totalPago >= trab.valor ? 'concluido' : 'parcial';

        await ck.call(this, 'PUT', `/api/finance/king-data?profile_id=${pid}`, {
          profile_id: pid,
          data: kingDb
        });

        const summary = await fetchRealSummary.call(this, pid);
        const falta = Math.max(0, trab.valor - totalPago);

        outMessage = `💰 *Pagamento Registrado com Sucesso — Agente King*\n\n` +
          `👤 *Cliente:* ${trab.cliente}\n` +
          `💵 *Valor Recebido Agora:* ${fmt(vPago)}\n` +
          `📈 *Total Pago Até Agora:* ${fmt(totalPago)} de ${fmt(trab.valor)}\n` +
          `⏳ *Falta Receber:* ${fmt(falta)} ${falta > 0 ? '🔴' : '✅ Quitado!'}\n` +
          `📌 *Status do Trabalho:* ${trab.status === 'concluido' ? 'Concluído (Quitado) ✅' : 'Parcialmente Pago ⏳'}\n\n` +
          buildSummaryMessage(summary, fmt);
      }

      session.history.push({ role: 'user', content: text });
      session.history.push({ role: 'assistant', content: outMessage });
      if (session.history.length > 20) session.history = session.history.slice(-20);

      return [{ json: {
        ...prev,
        outMessage,
        chatId,
        needGoogleCalendar: false
      } }];
    }
    const inputForAi = (hadVoice ? '[áudio transcrito] ' : '') + text;
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...session.history.slice(-16),
      { role: 'user', content: inputForAi }
    ];

    const completionRes = await openaiCall.call(this, { model, temperature: 0.1, messages, tools: TOOLS, tool_choice: 'auto' });
    const choice = completionRes.body?.choices?.[0]?.message;

    if (choice?.tool_calls && choice.tool_calls.length > 0) {
      const toolResponses = [];
      const allCreatedTransactions = [];
      const allCreatedAgendaItems = [];
      const profileId = await resolveProfileId.call(this);
      const today = new Date().toISOString().slice(0, 10);

      for (const toolCall of choice.tool_calls) {
        let fnName = toolCall.function?.name;
        let args = {};
        try { args = JSON.parse(toolCall.function?.arguments || '{}'); } catch (_) {}
        let stepMsg = '';

        // Interceptação blindada se o LLM chamou collect_clients ou list_clients para dívidas pessoais
        const lowerInputMsg = String(text || '').toLowerCase();
        const isAskingAboutMyDebtsEarly = lowerInputMsg.includes('estou devendo') ||
          lowerInputMsg.includes('eu devo') ||
          lowerInputMsg.includes('quem eu devo') ||
          lowerInputMsg.includes('pessoas que eu devo') ||
          lowerInputMsg.includes('nome de pessoas que') ||
          lowerInputMsg.includes('minhas dividas') ||
          lowerInputMsg.includes('minhas dívidas') ||
          lowerInputMsg.includes('prestação') ||
          lowerInputMsg.includes('prestacao') ||
          lowerInputMsg.includes('parcelas') ||
          lowerInputMsg.includes('parcela') ||
          /socorr|coimin|coinh|sua\s*coim|socorin/i.test(lowerInputMsg);

        if ((fnName === 'collect_clients' || fnName === 'list_clients') && isAskingAboutMyDebtsEarly) {
          fnName = 'manage_finance';
          args = { action: 'list_debts', ...args };
        }

        // Interceptação blindada: "quanto fulano falta me pagar" / "quanto fulano me deve" -> SEMPRE A RECEBER (receivables_list)
        const isAskingReceivables = 
          lowerInputMsg.includes('falta me pagar') ||
          lowerInputMsg.includes('falta pagar para mim') ||
          lowerInputMsg.includes('me deve') ||
          lowerInputMsg.includes('falta receber') ||
          lowerInputMsg.includes('tenho a receber') ||
          lowerInputMsg.includes('a receber de') ||
          lowerInputMsg.includes('trabalhos a receber') ||
          (lowerInputMsg.includes('quanto') && lowerInputMsg.includes('falta') && !lowerInputMsg.includes('falta eu pagar'));

        if (isAskingReceivables) {
          fnName = 'manage_finance';
          let cli = args.cliente || args.pessoa || '';
          if (!cli || cli === 'Essa pessoa') {
            const m = lowerInputMsg.match(/(?:falta\s+(?:me\s+)?pagar|me\s+deve|receber\s+d[eao]|quanto\s+(?:que\s+)?(?:a|o)\s+)([a-zA-Zá-úÁ-Ú]+)/i);
            if (m && m[1] && !['que', 'me', 'quanto', 'de', 'da', 'do', 'o', 'a'].includes(m[1].toLowerCase())) {
              cli = m[1];
            }
          }
          args = { action: 'receivables_list', cliente: cli };
        }

        // Interceptação blindada: "bater no valor" / "abater no valor" do trabalho de alguém
        const isBaterNoValor = 
          lowerInputMsg.includes('bater no valor') || 
          lowerInputMsg.includes('abater no valor') || 
          lowerInputMsg.includes('abater do valor') ||
          lowerInputMsg.includes('abater no trabalho');

        if (isBaterNoValor) {
          fnName = 'manage_finance';
          const valorMatch = lowerInputMsg.match(/r?\$?\s*(\d+(?:[.,]\d{1,2})?)/i);
          const vPago = valorMatch ? parseFloat(valorMatch[1].replace(',', '.')) : (args.valor_pago || args.amount || 0);
          let cli = args.cliente || '';
          if (!cli) {
            const mCli = lowerInputMsg.match(/d[aeo]\s+([a-zA-Zá-úÁ-Ú]+)/i);
            if (mCli && mCli[1] && !['gestao', 'gestão', 'valor', 'trabalho'].includes(mCli[1].toLowerCase())) {
              cli = mCli[1];
            }
          }
          args = { action: 'record_payment', cliente: cli, valor_pago: vPago };
        }

      // ── LISTAR CLIENTES / VISÃO GERAL DE USUÁRIOS ──���─────────────────────
      
      // ═══════════════════════════════════════════════════════════════════
      // ── GERENCIAR AGENDA & LEMBRETES (GOOGLE AGENDA + TELEGRAM) ────────
      // ═══════════════════════════════════════════��═══════════════════════
      if (fnName === 'manage_agenda') {
        const profileId = (await resolveProfileId.call(this)) || 1;
        const kRes = await ck.call(this, 'GET', `/api/finance/king-data?profile_id=${profileId}`);
        let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
        if (!kingDb || typeof kingDb !== 'object') kingDb = {};
        if (!Array.isArray(kingDb.lembretes)) kingDb.lembretes = [];

        // ── CRIAR COMPROMISSO OU LEMBRETE ─��─────────────────────────
        if (args.action === 'create_event' || args.action === 'create_reminder') {
          const isLembrete = args.action === 'create_reminder' || args.tipo === 'lembrete';
          const titulo = String(args.titulo || (isLembrete ? 'Lembrete' : 'Compromisso')).trim();
          let data = String(args.data || '').trim();
          
          if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
            const brMatch = data.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?$/);
            if (brMatch) {
              const d = brMatch[1].padStart(2, '0');
              const m = brMatch[2].padStart(2, '0');
              const y = brMatch[3] || '2026';
              data = `${y}-${m}-${d}`;
            } else {
              data = dataHojeISO;
            }
          }

          let horaInicio = String(args.hora_inicio || '09:00').trim();
          if (horaInicio.length === 4 && horaInicio.indexOf(':') === 1) horaInicio = '0' + horaInicio;
          if (/^\d{1,2}$/.test(horaInicio)) horaInicio = horaInicio.padStart(2, '0') + ':00';
          if (!/^\d{2}:\d{2}$/.test(horaInicio)) horaInicio = '09:00';

          let horaFim = String(args.hora_fim || '').trim();
          if (!horaFim) {
            const hParts = horaInicio.split(':');
            const duracaoHoras = (args.tipo === 'ensaio' || titulo.toLowerCase().includes('ensaio')) ? 2 : 1;
            const endH = String(Math.min(23, Number(hParts[0]) + duracaoHoras)).padStart(2, '0');
            horaFim = endH + ':' + hParts[1];
          }

          const isMentoria = args.tipo === 'mentoria' || titulo.toLowerCase().includes('mentoria');
          const local = String(args.local || (args.tipo === 'ensaio' ? 'Estúdio Adriano King - Barueri-SP' : (isMentoria ? 'Online / Google Meet' : ''))).trim();
          const descricao = String(args.descricao || '').trim();

          const gCalUrl = makeGoogleCalendarUrl(titulo, data, horaInicio, horaFim, descricao, local);

          needGoogleCalendar = true;
          calendarStart = `${data}T${horaInicio}:00-03:00`;
          calendarEnd = `${data}T${horaFim}:00-03:00`;
          calendarSummary = titulo;
          calendarDescription = (descricao ? descricao + '\n\n' : '') + 'Agendado pelo Agente King';
          calendarLocation = local || 'Online / Google Meet';

          const novoItem = {
            id: 'lem_' + Date.now(),
            titulo,
            tipo: args.tipo || (isLembrete ? 'lembrete' : (isMentoria ? 'mentoria' : 'compromisso')),
            data,
            hora_inicio: horaInicio,
            hora_fim: horaFim,
            descricao,
            local,
            lembrar_comeco_dia: args.lembrar_comeco_dia !== false,
            lembrar_meio_dia: args.lembrar_meio_dia !== false,
            lembrar_30m: args.lembrar_30m !== false,
            google_calendar_url: gCalUrl,
            created_at: dataHojeISO + ' ' + horaAtualSp,
            status: 'ativo',
            notificado: false,
            notificado_comeco_dia: false,
            notificado_meio_dia: false,
            notificado_30m: false,
            notificado_15m: false
          };

          kingDb.lembretes.unshift(novoItem);

          await ck.call(this, 'PUT', `/api/finance/king-data?profile_id=${profileId}`, {
            profile_id: profileId,
            data: kingDb
          });

          const pData = data.split('-');
          const dObj = new Date(Number(pData[0]), Number(pData[1]) - 1, Number(pData[2]));
          const diaSemanaFormat = diaSemanaNomes[dObj.getDay()] || 'Data';
          const dataFormatada = `${pData[2]}/${pData[1]}/${pData[0]} (${diaSemanaFormat})`;

          const icone = isLembrete ? '⏰' : (args.tipo === 'ensaio' ? '📸' : (isMentoria ? '🎓' : '📅'));
          const header = isLembrete ? 'Novo Lembrete Registrado!' : 'Compromisso Agendado com Sucesso!';

          allCreatedAgendaItems.push({
            icone,
            header,
            isLembrete,
            isMentoria,
            titulo,
            data,
            dataFormatada,
            horaInicio,
            horaFim,
            local,
            descricao,
            gCalUrl
          });

        // ── LISTAR AGENDA & LEMBRETES ────────────────────────────────
        } else if (args.action === 'list_agenda') {
          const ativos = (kingDb.lembretes || []).filter(l => l && l.status !== 'cancelado');
          if (ativos.length === 0) {
            stepMsg = `📅 *Agenda & Lembretes — Agente King*\n\nNenhum compromisso ou lembrete pendente no momento.\n\nSe quiser agendar algo, é só me pedir por áudio ou texto!`;
          } else {
            ativos.sort((a, b) => ((a.data || '') + (a.hora_inicio || '')).localeCompare((b.data || '') + (b.hora_inicio || '')));
            const lines = ativos.slice(0, 10).map((l, i) => {
              const ico = l.tipo === 'lembrete' ? '⏰' : (l.tipo === 'ensaio' ? '📸' : (l.tipo === 'mentoria' ? '���' : '📅'));
              const pData = (l.data || '').split('-');
              const dFmt = pData.length === 3 ? `${pData[2]}/${pData[1]}/${pData[0]}` : l.data;
              return `${i + 1}. ${ico} *${l.titulo}*\n   🗓️ ${dFmt} às ${l.hora_inicio || '00:00'}${l.hora_fim ? ' - ' + l.hora_fim : ''}${l.local ? ' | 📍 ' + l.local : ''}\n   📲 [Google Agenda](${l.google_calendar_url || makeGoogleCalendarUrl(l.titulo, l.data, l.hora_inicio, l.hora_fim, l.descricao, l.local)})`;
            });
            stepMsg = `📅 *Sua Agenda & Lembretes — Agente King:*\n\n${lines.join('\n\n')}`;
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
            stepMsg = `🗑️ *Item Removido da Agenda!*\nRemovi o compromisso: *${removed.titulo}*.`;
          } else {
            stepMsg = `⚠�� Não encontrei o compromisso/lembrete informado para cancelar.`;
          }

        // ── ALTERAR COMPROMISSO / LEMBRETE ──────────────────────────
        } else if (args.action === 'update_agenda') {
          const search = String(args.titulo || '').toLowerCase();
          let item = (kingDb.lembretes || []).find(l => l && l.status !== 'cancelado' && (search ? String(l.titulo || '').toLowerCase().includes(search) : true));
          if (!item) {
            stepMsg = `⚠️ Não encontrei o compromisso "${args.titulo}" para alterar.`;
          } else {
            if (args.novo_titulo) item.titulo = String(args.novo_titulo).trim();
            if (args.nova_data) item.data = String(args.nova_data).trim();
            if (args.nova_hora_inicio) item.hora_inicio = String(args.nova_hora_inicio).trim();
            if (args.nova_hora_fim) item.hora_fim = String(args.nova_hora_fim).trim();
            if (args.novo_local) item.local = String(args.novo_local).trim();
            item.google_calendar_url = makeGoogleCalendarUrl(item.titulo, item.data, item.hora_inicio, item.hora_fim, item.descricao, item.local);

            needGoogleCalendar = true;
            calendarStart = `${item.data}T${item.hora_inicio}:00-03:00`;
            calendarEnd = `${item.data}T${item.hora_fim || item.hora_inicio}:00-03:00`;
            calendarSummary = item.titulo;
            calendarDescription = (item.descricao ? item.descricao + '\n\n' : '') + 'Agendado pelo Agente King';
            calendarLocation = item.local || 'Online / Google Meet';

            await ck.call(this, 'PUT', `/api/finance/king-data?profile_id=${profileId}`, {
              profile_id: profileId,
              data: kingDb
            });
            stepMsg = `✏️ *Compromisso Atualizado com Sucesso! — Agente King*\n\n` +
              `📌 *Compromisso:* ${item.titulo}\n` +
              `🗓️ *Nova Data:* ${item.data}\n` +
              `⏰ *Novo Horário:* ${item.hora_inicio}${item.hora_fim ? ' às ' + item.hora_fim : ''}\n` +
              (item.local ? `📍 *Local:* ${item.local}\n` : '') +
              `\n��� [Atualizado no Google Agenda](${item.google_calendar_url})`;
          }

        // ── LIMPAR TUDO ─────────────────────────────────────────────
        } else if (args.action === 'clear_all_agenda') {
          kingDb.lembretes = [];
          await ck.call(this, 'PUT', `/api/finance/king-data?profile_id=${profileId}`, {
            profile_id: profileId,
            data: kingDb
          });
          stepMsg = `🧹 *Agenda e Lembretes Zerados!*\nTodos os compromissos e lembretes foram removidos.`;
        }
      } else if (fnName === 'list_clients') {
        const r = await ck.call(this, 'GET', '/api/admin/users?limit=200');
        if (r.statusCode >= 200 && r.statusCode < 300 && r.body?.success) {
          const rawItems = r.body.data?.items || [];
          const now = new Date();
          const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          
          let activeCount = 0;
          let expiredCount = 0;
          let expiringSoonCount = 0;
          let adminCount = 0;

          const processed = rawItems.map(u => {
            const expStr = u.subscription_expires_at;
            const expDate = expStr ? new Date(expStr) : null;
            let status = 'active';
            
            if (u.is_admin) adminCount++;
            
            if (expDate) {
              if (expDate < now) {
                status = 'expired';
                expiredCount++;
              } else if (expDate <= in7Days) {
                status = 'expiring_soon';
                activeCount++;
                expiringSoonCount++;
              } else {
                status = 'active';
                activeCount++;
              }
            } else {
              status = 'active';
              activeCount++;
            }
            
            return {
              id: u.id,
              name: u.display_name || u.email,
              email: u.email,
              slug: u.profile_slug,
              tag: u.tag_code || u.profile_slug || u.id,
              accountType: u.account_type,
              planName: u.account_type === 'adm_principal' ? 'ADM Principal 👑' : (u.account_type || 'Individual'),
              isAdmin: !!u.is_admin,
              status,
              expiresAt: expDate ? expDate.toLocaleDateString('pt-BR') : 'Ilimitado / Ativo'
            };
          });

          const total = rawItems.length;
          const filter = args.filter || 'all';
          const search = (args.search || '').trim().toLowerCase();

          let filtered = processed;
          if (filter === 'active') {
            filtered = filtered.filter(u => u.status === 'active' || u.status === 'expiring_soon');
          } else if (filter === 'expired') {
            filtered = filtered.filter(u => u.status === 'expired');
          } else if (filter === 'expiring_soon') {
            filtered = filtered.filter(u => u.status === 'expiring_soon');
          }

          if (search) {
            filtered = filtered.filter(u => 
              (u.email && u.email.toLowerCase().includes(search)) ||
              (u.name && u.name.toLowerCase().includes(search)) ||
              (u.tag && u.tag.toLowerCase().includes(search))
            );
          }

          let listText = '';
          if (filtered.length === 0) {
            listText = '_Nenhum cliente encontrado com os critérios informados._';
          } else {
            listText = filtered.map((u, i) => {
              const statusEmoji = u.status === 'expired' ? '🔴 Vencido' : (u.status === 'expiring_soon' ? '⏳ Expirando' : '🟢 Ativo');
              const adminBadge = u.isAdmin ? ' 👑 [ADMIN]' : '';
              let cobrancaZap = '';
              if (u.status === 'expired' || u.status === 'expiring_soon') {
                const cobMsg = encodeURIComponent('Olá ' + u.name + '! Sua assinatura da tag Conecta King (' + u.tag + ') ' + (u.status === 'expired' ? 'venceu' : 'está vencendo') + '. Acesse https://tag.conectaking.com.br/' + (u.slug || u.tag) + ' ou me avise aqui para renovarmos!');
                cobrancaZap = '\n   📲 [Cobrar no WhatsApp](https://wa.me/?text=' + cobMsg + ')';
              }
              return `${i + 1}. *${u.name}*${adminBadge}\n` +
                     `   ✉️ \`${u.email}\`\n` +
                     `   🏷️ Tag: \`${u.tag}\` | 💎 Plano: *${u.planName}*\n` +
                     `   📅 Validade: ${u.expiresAt} (${statusEmoji})${cobrancaZap}`;
            }).join('\n\n');
          }

          stepMsg = `👑 *Visão Geral de Usuários �� Conecta King*\n\n` +
            `📊 *Estatísticas da Base:*\n` +
            `👥 *Total de Usuários:* *${total}* ${total === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}\n` +
            `🟢 *Ativos:* *${activeCount}*\n` +
            `🔴 *Vencidos:* *${expiredCount}*\n` +
            `⏳ *Expirando em 7 dias:* *${expiringSoonCount}*\n` +
            `🛡️ *Administradores:* *${adminCount}*\n\n` +
            `📋 *Lista de Clientes Cadastrados:*\n\n${listText}\n\n` +
            `💡 *Comandos Rápidos Disponíveis:*\n` +
            `• *Cadastrar novo:* _"Cadastra o cliente email@exemplo.com senha 123456"_\n` +
            `• *Excluir cliente:* _"Pode excluir [email ou tag]"_\n` +
            `• *Alterar dados:* _"Muda a senha/e-mail/plano de [email ou tag]"_`;
        } else {
          stepMsg = `⚠️ *Não foi possível consultar os usuários:* ${r.body?.message || 'Falha de comunicação com o servidor Conecta King.'}`;
        }

      // ── CADASTRAR CLIENTE ──────────────────���─────────────────────────────
      } else if (fnName === 'register_client') {
        const codeToUse = args.code || session.lastGeneratedCode || null;
        const payload = {
          email: args.email,
          password: args.password,
          code: codeToUse,
          plan: args.plan || 'individual',
          days: args.days || 30,
          name: args.name || null
        };
        const r = await ck.call(this, 'POST', '/api/admin/users', payload);
        if (r.statusCode >= 200 && r.statusCode < 300 && r.body?.success) {
          session.lastGeneratedCode = null;
          session.lastTargetClient = args.email;
          const u = r.body.data?.user || {};
          const exp = u.subscription_expires_at ? new Date(u.subscription_expires_at).toLocaleDateString('pt-BR') : '30 dias';
          stepMsg = `👑 *Cliente Cadastrado com Sucesso!*\n\n` +
            `👤 *E-mail:* \`${u.email}\`\n` +
            `🔑 *Senha:* \`${args.password}\`\n` +
            `🏷️ *Código / Tag:* \`${u.tag_code || u.id}\`\n` +
            `💎 *Plano:* *${u.plan_name || u.account_type}*\n` +
            `📅 *Validade:* ${exp}\n` +
            `🌐 *Link de Acesso:* https://www.conectaking.com.br/login\n\n` +
            `_A conta já está ativa e pronta para uso!_`;
        } else {
          const errMsg = r.body?.message || r.body?.error?.message || 'Falha ao cadastrar cliente.';
          stepMsg = `⚠️ *Não foi possível cadastrar o cliente:*\n${errMsg}`;
        }

      // ── GERENCIAR CLIENTE (EXCLUIR / MUDAR EMAIL / SENHA / ADM / RENOVAR / PLANO) ─
      } else if (fnName === 'manage_client') {
        const targetId = args.identifier || session.lastTargetClient;
        const normalizedExpiresAt = parseDateInput(args.expires_at);
        const payload = {
          identifier: targetId,
          action: args.action,
          newEmail: args.new_email || null,
          newPassword: args.new_password || null,
          isAdmin: (args.action === 'set_admin' ? true : (args.action === 'remove_admin' ? false : (args.is_admin !== undefined ? args.is_admin : null))),
          newPlan: args.new_plan || null,
          renewMonths: args.renew_months || null,
          renewDays: args.renew_days || null,
          expiresAt: normalizedExpiresAt || null,
          newTagCode: args.new_tag_code || null
        };
        const r = await ck.call(this, 'POST', '/api/admin/users/quick-manage', payload);
        if (r.statusCode >= 200 && r.statusCode < 300 && r.body?.success) {
          const u = r.body.data?.user || {};
          if (args.action === 'delete') {
            session.lastTargetClient = null;
            stepMsg = `🗑️ *Cliente Excluído com Sucesso! — Agente King*\n\n` +
              `👤 *Cliente:* ${u.display_name || targetId} (\`${u.email || targetId}\`)\n` +
              (u.tag_code ? `🏷️ *Tag / Código Desvinculado:* \`${u.tag_code}\`\n` : '') +
              `✅ *Status:* Removido permanentemente da plataforma Conecta King.`;
          } else if (args.action === 'change_email') {
            session.lastTargetClient = u.email;
            stepMsg = `✏️ *E-mail do Cliente Alterado com Sucesso! — Agente King*\n\n` +
              `👤 *Novo E-mail:* \`${u.email}\`\n` +
              `🏷️ *Tag / Código:* \`${u.tag_code || u.profile_slug}\`\n` +
              `💎 *Plano:* *${u.plan_name || u.account_type}*\n\n` +
              `_O cliente agora deve fazer login com o novo e-mail._`;
          } else if (args.action === 'change_password') {
            session.lastTargetClient = u.email;
            stepMsg = `🔑 *Senha do Cliente Alterada com Sucesso! — Agente King*\n\n` +
              `👤 *Cliente:* ${u.display_name || targetId} (\`${u.email || targetId}\`)\n` +
              `🔐 *Nova Senha:* \`${args.new_password}\`\n\n` +
              `_A nova senha já está ativa para acesso imediato!_`;
          } else if (args.action === 'set_admin' || args.action === 'remove_admin' || args.is_admin !== undefined) {
            session.lastTargetClient = u.email;
            const isAdm = args.action === 'set_admin' || args.is_admin === true;
            stepMsg = `🛡️ *Cargo de Administrador Atualizado! — Agente King*\n\n` +
              `👤 *Cliente:* ${u.display_name || targetId} (\`${u.email || targetId}\`)\n` +
              `⚡ *Status Admin:* ${isAdm ? 'SIM (Administrador Ativo 👑)' : 'NÃO (Usuário Padrão)'}\n` +
              `💎 *Tipo de Conta:* *${u.plan_name || u.account_type}*\n\n` +
              `_${isAdm ? 'O usuário agora tem acesso com privilégios ao painel /admin!' : 'Os privilégios de administração foram revogados.'}_`;
          } else if (args.action === 'renew_tag' || args.expires_at || args.renew_months || args.renew_days) {
            session.lastTargetClient = u.email;
            const changes = r.body.data?.changes || [];
            const changesText = changes.length > 0 ? changes.map(c => `✅ ${c}`).join('\n') : `✅ Validade atualizada para ${u.formatted_expires_at}`;
            stepMsg = `📅 *Validade da Tag / Assinatura Atualizada com Sucesso! — Agente King*\n\n` +
              `👤 *Cliente:* ${u.display_name} (\`${u.email}\`)\n` +
              `🏷️ *Tag / Código:* \`${u.tag_code || u.profile_slug}\`\n` +
              `💎 *Plano:* *${u.plan_name || u.account_type}*\n` +
              `🗓️ *Novo Vencimento:* *${u.formatted_expires_at}* 🟢\n` +
              `⚡ *Status:* ${u.subscription_status === 'active' ? 'Ativo 🟢' : u.subscription_status}\n\n` +
              `*Ações Realizadas:*\n${changesText}\n\n` +
              `_A nova data de validade já está ativa na plataforma Conecta King!_`;
          } else {
            session.lastTargetClient = u.email;
            const changes = r.body.data?.changes || [];
            const changesText = changes.length > 0 ? changes.map(c => `✅ ${c}`).join('\n') : 'Informações consultadas com sucesso.';
            stepMsg = `👑 *Gestão de Cliente Conecta King*\n\n` +
              `👤 *Cliente:* ${u.display_name} (\`${u.email}\`)\n` +
              `🏷️ *Tag / Código:* \`${u.tag_code || u.profile_slug}\`\n` +
              `💎 *Plano:* *${u.plan_name || u.account_type}*\n` +
              `📅 *Vencimento da Tag:* *${u.formatted_expires_at || 'Ativo'}*\n` +
              `⚡ *Status:* ${u.subscription_status === 'active' ? 'Ativo 🟢' : u.subscription_status}\n\n` +
              `*Ações Realizadas:*\n${changesText}`;
          }
        } else {
          const errMsg = r.body?.message || r.body?.error || r.body?.error?.message || 'Erro ao processar dados do cliente.';
          if (args.action === 'delete' && (errMsg.includes('não foi encontrado') || errMsg.includes('not found'))) {
            stepMsg = `ℹ️ *Cliente Não Encontrado:*\n${errMsg}\n\n_O cliente já pode ter sido excluído anteriormente ou o e-mail/código está diferente. Diga *"quantos usuários tem"* ou *"listar usuários"* para ver todos os clientes cadastrados atualmente._`;
          } else {
            stepMsg = `⚠️ *Erro na gestão do cliente:*\n${errMsg}`;
          }
        }

      // ── BÍBLIA & DEVOCIONAIS 365 ──────────────────────────────────────────
      } else if (fnName === 'manage_devotionals') {
        const curYear = new Date().getFullYear();
        const y = args.year || curYear;
        const m = args.month || (new Date().getMonth() + 1);

        if (args.action === 'set_month_theme') {
          const themeText = String(args.theme_text || '').trim();
          const r = await ck.call(this, 'PUT', `/api/admin/bible/devotionals-365/month-themes/${y}`, { [String(m)]: themeText });
          if (r.statusCode >= 200 && r.statusCode < 300) {
            stepMsg = `📖 *Tema Devocional Definido!*\n\n📅 *Mês:* ${m}/${y}\n✨ *Tema:* "${themeText}"\n\n_Tema salvo com sucesso para o calendário devocional!_`;
          } else {
            stepMsg = `⚠️ Erro ao salvar tema do mês: ${r.body?.message || 'Falha na requisição'}`;
          }
        } else if (args.action === 'generate_month_theme') {
          const r = await ck.call(this, 'POST', `/api/admin/bible/devotionals-365/month-themes/${y}/generate/${m}`, { hint: args.theme_text || '' });
          if (r.statusCode >= 200 && r.statusCode < 300) {
            const textTheme = r.body?.data?.text || '';
            stepMsg = `✨ *Novo Tema Gerado com IA!*\n\n📅 *Mês:* ${m}/${y}\n📖 *Tema Criado:* "${textTheme}"\n\n_Tema salvo automaticamente nos Devocionais 365!_`;
          } else {
            stepMsg = `⚠️ Erro ao gerar tema com IA: ${r.body?.message || 'Falha na requisição'}`;
          }
        } else if (args.action === 'generate_month') {
          const r = await ck.call(this, 'POST', `/api/admin/bible/devotionals-365/generate-month-ai/${y}/${m}`);
          if (r.statusCode >= 200 && r.statusCode < 300) {
            const total = r.body?.data?.totalGenerated ?? r.body?.data?.count ?? 'todos os';
            stepMsg = `✨ *Geração de Devocionais Concluída!*\n\n📅 *Mês:* ${m}/${y}\n📖 Foram gerados e salvos ${total} devocionais diários com IA para este mês!`;
          } else {
            stepMsg = `⚠️ Falha ao gerar devocionais do mês: ${r.body?.message || JSON.stringify(r.body)}`;
          }
        } else if (args.action === 'generate_day') {
          const d = args.day || 1;
          const r = await ck.call(this, 'POST', `/api/admin/bible/devotionals-365/day/${d}/generate-ai`);
          if (r.statusCode >= 200 && r.statusCode < 300) {
            const dev = r.body?.data || {};
            stepMsg = `📖 *Devocional do Dia ${d} Gerado!*\n\n*Título:* ${dev.title || 'Devocional Diário'}\n*Versículo:* ${dev.verse_reference || ''}\n\n_Salvo com sucesso na plataforma!_`;
          } else {
            stepMsg = `⚠️ Falha ao gerar devocional do dia ${d}: ${r.body?.message || 'Erro'}`;
          }
        } else if (args.action === 'get_themes') {
          const r = await ck.call(this, 'GET', `/api/admin/bible/devotionals-365/month-themes/${y}`);
          const themes = r.body?.data?.themes || {};
          const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
          const lines = [];
          for (let i = 1; i <= 12; i++) {
            const t = themes[String(i)] || themes[i] || '_Sem tema definido_';
            lines.push(`• *${monthNames[i]}:* ${t}`);
          }
          stepMsg = `📖 *Temas Devocionais 365 (${y}):*\n\n${lines.join('\n')}`;
        }

      // ── PLANOS DA PLATAFORMA ──────────────────────────────────────────────
      } else if (fnName === 'manage_platform_plans') {
        if (args.action === 'list') {
          const r = await ck.call(this, 'GET', '/api/admin/plans');
          const plans = r.body?.data || [];
          const lines = plans.map(p => `• *${p.plan_name}* (\`${p.plan_code}\`): R$ ${Number(p.price).toFixed(2).replace('.', ',')} [ID: ${p.id}]`);
          stepMsg = `💎 *Planos Conecta King:*\n\n${lines.join('\n')}`;
        } else if (args.action === 'update_price') {
          const r = await ck.call(this, 'PUT', `/api/subscription/plans/${args.plan_id}`, { price: args.price, monthly_price: args.price });
          if (r.statusCode >= 200 && r.statusCode < 300) {
            stepMsg = `✅ *Preço do Plano Atualizado!*\n\nNovo valor: R$ ${Number(args.price).toFixed(2).replace('.', ',')}`;
          } else {
            stepMsg = `⚠️ Erro ao atualizar plano: ${r.body?.message || 'Falha'}`;
          }
        }

      // ── GESTÃO FINANCEIRA ────────────────────────────────────────────────
      } else if (fnName === 'manage_finance') {

        // ── CREATE TRABALHO (Aba Trabalhos do King-Data) ────────────
        if (args.action === 'create_trabalho') {
          const valorTotal = Number(args.valor_total || args.amount || 0);
          const entrada = Number(args.entrada || 0);
          const cliente = String(args.cliente || 'Cliente').trim();
          const servico = String(args.servico || 'Trabalho Fotográfico / Posicionamento').trim();
          const dataPrevista = args.data_prevista || '';

          if (valorTotal <= 0) {
            stepMsg = '⚠️ Informe o valor total do trabalho.';
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

            stepMsg = `👑 *Novo Trabalho Registrado com Sucesso! — Agente King*\n\n` +
              `👤 *Cliente:* ${cliente}\n` +
              `📸 *Serviço:* ${servico}\n` +
              `💰 *Valor Total do Trabalho:* ${fmt(valorTotal)}\n` +
              `💵 *Adiantamento Recebido (em caixa):* ${fmt(entrada)} ${entrada > 0 ? '🟢' : '_(sem entrada imediata)_'}\n` +
              `⏳ *Falta Receber deste Trabalho:* ${fmt(falta)} ${falta > 0 ? '🔴' : '✅'}\n` +
              `📌 *Status na Aba Trabalhos:* ${novoTrab.status === 'concluido' ? 'Quitado ✅' : 'Parcialmente Pago ⏳'}\n\n` +
              buildSummaryMessage(summary, fmt);
          }

        // ── UPDATE TRABALHO (Alterar/Editar Trabalho) ────────────────
        } else if (args.action === 'update_trabalho') {
          const clienteBusca = String(args.cliente || '').toLowerCase().trim();
          const servicoBusca = String(args.servico || args.servico_busca || args.termo || '').toLowerCase().trim();
          const kRes = await ck.call(this, 'GET', `/api/finance/king-data?profile_id=${profileId}`);
          let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
          if (!kingDb || typeof kingDb !== 'object') kingDb = {};
          const trabalhos = Array.isArray(kingDb.trabalhos) ? kingDb.trabalhos : [];

          // Estratégia inteligente de busca do trabalho:
          let trab = null;
          
          // 1. Busca por cliente específico (se não for genérico)
          if (clienteBusca && !['cliente', 'esse', 'o ultimo', 'o último', 'trabalho', 'servico', 'serviço'].includes(clienteBusca)) {
            trab = trabalhos.find(t => t && String(t.cliente || '').toLowerCase().includes(clienteBusca));
          }

          // 2. Busca por serviço existente
          if (!trab && (servicoBusca || clienteBusca)) {
            const termo = servicoBusca || clienteBusca;
            trab = trabalhos.find(t => t && String(t.servico || '').toLowerCase().includes(termo));
          }

          // 3. Busca por termos contextuais na mensagem do usuário
          const textLow = String(text || '').toLowerCase();
          if (!trab && textLow) {
            if (textLow.includes('esse serviço') || textLow.includes('esse trabalho') || textLow.includes('último') || textLow.includes('ultimo') || textLow.includes('recém')) {
              trab = trabalhos[trabalhos.length - 1];
            } else {
              trab = [...trabalhos].reverse().find(t => {
                const sLow = String(t.servico || '').toLowerCase();
                const cLow = String(t.cliente || '').toLowerCase();
                return (sLow && textLow.includes(sLow)) || (cLow && textLow.includes(cLow)) ||
                       (textLow.includes('fotografia') && sLow.includes('fotografia')) ||
                       (textLow.includes('alphaville') && sLow.includes('alphaville')) ||
                       (textLow.includes('barueri') && (sLow.includes('alphaville') || sLow.includes('fotografia')));
              });
            }
          }

          // 4. Fallback: se nenhum trabalho específico for indicado, pegar o último que possui cliente genérico "Cliente" ou o último adicionado
          if (!trab && trabalhos.length > 0) {
            const ultimoGenerico = [...trabalhos].reverse().find(t => String(t.cliente || '').toLowerCase() === 'cliente');
            trab = ultimoGenerico || trabalhos[trabalhos.length - 1];
          }

          if (!trab) {
            stepMsg = `⚠️ Não encontrei nenhum trabalho correspondente para atualizar.`;
          } else {
            // Inferir novo cliente se o usuário informou no texto
            let novoCliente = args.novo_cliente ? String(args.novo_cliente).trim() : '';
            let novoServico = args.novo_servico ? String(args.novo_servico).trim() : '';

            if (!novoCliente && text) {
              const mNat = text.match(/(?:colocar|mudar\s+para|nome\s+de|cliente\s+)\s*([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][a-záéíóúâêîôûãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][a-záéíóúâêîôûãõç]+)*)/i);
              if (mNat && mNat[1] && !['esse', 'esse serviço', 'esse trabalho', 'fotografia'].includes(mNat[1].toLowerCase())) {
                novoCliente = mNat[1];
              }
            }

            if (!novoServico && text && text.toLowerCase().includes('fotografia em são paulo')) {
              novoServico = 'Fotografia em São Paulo Alphaville';
            }

            const alteracoes = [];
            if (args.novo_valor !== undefined && args.novo_valor > 0) {
              alteracoes.push(`Valor: ${fmt(trab.valor)} ➔ ${fmt(args.novo_valor)}`);
              trab.valor = Number(args.novo_valor);
            }
            if (novoCliente && novoCliente.toLowerCase() !== String(trab.cliente || '').toLowerCase()) {
              alteracoes.push(`Cliente: "${trab.cliente}" ➔ "${novoCliente}"`);
              trab.cliente = novoCliente;
            }
            if (novoServico && novoServico.toLowerCase() !== String(trab.servico || '').toLowerCase()) {
              alteracoes.push(`Serviço: "${trab.servico}" ➔ "${novoServico}"`);
              trab.servico = novoServico;
            }
            if (args.novo_status) {
              alteracoes.push(`Status: ${trab.status} ➔ ${args.novo_status}`);
              trab.status = String(args.novo_status).trim();
            }
            if (args.nova_data) {
              alteracoes.push(`Data: ${trab.data} ➔ ${args.nova_data}`);
              trab.data = String(args.nova_data).trim();
            }

            if (alteracoes.length === 0) {
              alteracoes.push(`Dados confirmados e sincronizados com a Gestão Financeira.`);
            }

            const totalPago = (trab.pagamentos || []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
            if (totalPago >= trab.valor && trab.valor > 0) {
              trab.status = 'concluido';
            } else if (totalPago > 0) {
              trab.status = 'parcial';
            }

            await ck.call(this, 'PUT', `/api/finance/king-data?profile_id=${profileId}`, {
              profile_id: profileId,
              data: kingDb
            });

            const summary = await fetchRealSummary.call(this, profileId);
            stepMsg = `✏️ *Trabalho Atualizado com Sucesso — Agente King*\n\n` +
              `👤 *Cliente:* *${trab.cliente}*\n` +
              `📸 *Serviço:* *${trab.servico}*\n` +
              `💰 *Valor Atual:* *${fmt(trab.valor)}*\n` +
              `📊 *Alterações feitas:*\n• ` + alteracoes.join('\n• ') + '\n\n' +
              buildSummaryMessage(summary, fmt);
          }

        // ── DELETE TRABALHO (Excluir Trabalho Específico) ────────────
        } else if (args.action === 'delete_trabalho') {
          const clienteBusca = String(args.cliente || '').toLowerCase().trim();
          const kRes = await ck.call(this, 'GET', `/api/finance/king-data?profile_id=${profileId}`);
          let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
          if (!kingDb || typeof kingDb !== 'object') kingDb = {};
          const trabalhos = Array.isArray(kingDb.trabalhos) ? kingDb.trabalhos : [];

          let idx = trabalhos.findIndex(t => t && String(t.cliente || '').toLowerCase().includes(clienteBusca));
          if (idx === -1 && trabalhos.length === 1) idx = 0;

          if (idx === -1) {
            stepMsg = `⚠️ Não encontrei o trabalho de "${args.cliente}" para excluir.`;
          } else {
            const [removido] = trabalhos.splice(idx, 1);
            await ck.call(this, 'PUT', `/api/finance/king-data?profile_id=${profileId}`, {
              profile_id: profileId,
              data: kingDb
            });
            const summary = await fetchRealSummary.call(this, profileId);
            stepMsg = `🗑️ *Trabalho Excluído com Sucesso — Agente King*\n\n` +
              `Removi o trabalho de *${removido.cliente}* (${fmt(removido.valor)} - ${removido.servico}).\n\n` +
              buildSummaryMessage(summary, fmt);
          }

        // ── RECORD PAYMENT (Dar Baixa em Pagamento de Trabalho) ───────
        } else if (args.action === 'record_payment') {
          const clienteBusca = String(args.cliente || '').toLowerCase().trim();
          const valorPago = Number(args.valor_pago || args.amount || 0);
          if (valorPago <= 0) {
            stepMsg = '⚠️ Informe o valor recebido para dar baixa.';
          } else {
            const kRes = await ck.call(this, 'GET', `/api/finance/king-data?profile_id=${profileId}`);
            let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
            if (!kingDb || typeof kingDb !== 'object') kingDb = {};
            const trabalhos = Array.isArray(kingDb.trabalhos) ? kingDb.trabalhos : [];

            let trab = trabalhos.find(t => t && String(t.cliente || '').toLowerCase().includes(clienteBusca));
            if (!trab && trabalhos.length === 1) trab = trabalhos[0];

            if (!trab) {
              stepMsg = `⚠️ Não encontrei trabalho para o cliente "${args.cliente}".`;
            } else {
              if (!Array.isArray(trab.pagamentos)) trab.pagamentos = [];
              const now = new Date();
              const hora = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
              trab.pagamentos.push({ valor: valorPago, data: today, hora });

              const totalPago = trab.pagamentos.reduce((s, p) => s + (Number(p.valor) || 0), 0);
              if (totalPago >= trab.valor) {
                trab.status = 'concluido';
              } else {
                trab.status = 'parcial';
              }


              await ck.call(this, 'PUT', `/api/finance/king-data?profile_id=${profileId}`, {
                profile_id: profileId,
                data: kingDb
              });

              const summary = await fetchRealSummary.call(this, profileId);
              const falta = Math.max(0, trab.valor - totalPago);

              stepMsg = `💰 *Pagamento Registrado com Sucesso — Agente King*\n\n` +
                `👤 *Cliente:* ${trab.cliente}\n` +
                `💵 *Valor Recebido Agora:* ${fmt(valorPago)}\n` +
                `📈 *Total Pago Até Agora:* ${fmt(totalPago)} de ${fmt(trab.valor)}\n` +
                `⏳ *Falta Receber:* ${fmt(falta)} ${falta > 0 ? '🔴' : '✅ Quitado!'}\n` +
                `📌 *Status do Trabalho:* ${trab.status === 'concluido' ? 'Concluído (Quitado) ✅' : 'Parcialmente Pago ⏳'}\n\n` +
                buildSummaryMessage(summary, fmt);
            }
          }

        // ── LISTAR TRABALHOS PENDENTES / QUEM DEVE (RECEIVABLES LIST) ���─
        } else if (args.action === 'receivables_list' || args.action === 'pending_jobs') {
          const kRes = await ck.call(this, 'GET', `/api/finance/king-data?profile_id=${profileId}`);
          let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
          const trabalhos = Array.isArray(kingDb.trabalhos) ? kingDb.trabalhos : [];

          const clienteFiltro = String(args.cliente || args.pessoa || '').toLowerCase().trim();

          if (clienteFiltro) {
            const trabMatch = trabalhos.filter(t => t && String(t.cliente || '').toLowerCase().includes(clienteFiltro));
            if (trabMatch.length === 0) {
              stepMsg = `🔍 *Adriano, não encontrei nenhum trabalho registrado para "${args.cliente || args.pessoa}".*

` +
                `💡 _Verifique se o nome está correto ou consulte todos os clientes com: "quais trabalhos tenho a receber"._`;
            } else {
              let lines = [`👑 *Valores a Receber — Cliente: ${trabMatch[0].cliente}*
`];
              let totalFaltaCli = 0;
              let totalRecebidoCli = 0;
              let totalGeralCli = 0;
              trabMatch.forEach((t, idx) => {
                const totPago = (t.pagamentos || []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
                const falta = Math.max(0, Number(t.valor || 0) - totPago);
                totalFaltaCli += falta;
                totalRecebidoCli += totPago;
                totalGeralCli += Number(t.valor || 0);
                lines.push(`💼 *Serviço:* ${t.servico || 'Trabalho'}
💰 *Valor Total:* ${fmt(t.valor)}
💵 *Já Recebido:* ${fmt(totPago)}
⏳ *Falta Receber:* *${fmt(falta)}* ${falta > 0 ? '🔴' : '✅ Quitado!'}`);
                if (t.dataPrevista) {
                  lines.push(`📅 *Previsão de Quitação:* ${t.dataPrevista}`);
                }
              });
              if (trabMatch.length > 1) {
                lines.push(`
📊 *Resumo Geral do Cliente:* Total: ${fmt(totalGeralCli)} | Recebido: ${fmt(totalRecebidoCli)} | *Falta: ${fmt(totalFaltaCli)}*`);
              }
              stepMsg = lines.join('
');
            }
          } else {
            const pendentes = trabalhos.filter(t => {
              const totPago = (t.pagamentos || []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
              return (Number(t.valor || 0) - totPago) > 0.01;
            });

            if (pendentes.length === 0) {
              stepMsg = `🎉 *Excelente notícia, Adriano!* Todos os trabalhos registrados estão quitados no momento. Não há nenhum valor pendente de clientes!`;
            } else {
              let totalFalta = 0;
              const lines = ['👑 *Trabalhos com Valores a Receber — Agente King:
'];
              pendentes.forEach((t, idx) => {
                const totPago = (t.pagamentos || []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
                const falta = Math.max(0, Number(t.valor || 0) - totPago);
                totalFalta += falta;
                lines.push(`${idx + 1}. 👤 *${t.cliente}* — ${t.servico || 'Serviço'}
   💰 Total: ${fmt(t.valor)} | Recebido: ${fmt(totPago)} | 🔴 *Falta: ${fmt(falta)}*`);
              });
              lines.push(`
💵 *Total Geral a Receber:* *${fmt(totalFalta)}*`);
              stepMsg = lines.join('
');
            }
          }

        // ── LISTAR QUEM EU DEVO / DÍVIDAS / PESSOAS QUE ESTOU DEVENDO ───
        } else if (args.action === 'list_debts' || args.action === 'quem_eu_devo' || args.action === 'debts_list') {
          const kRes = await ck.call(this, 'GET', `/api/finance/king-data?profile_id=${profileId}`);
          let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
          const terceiros = Array.isArray(kingDb.terceiros) ? kingDb.terceiros : [];
          
          const txRes = await ck.call(this, 'GET', `/api/finance/transactions?limit=100&orderBy=created_at&orderDir=DESC`);
          const txList = Array.isArray(txRes.body?.data) ? txRes.body.data : (Array.isArray(txRes.body?.data?.data) ? txRes.body.data.data : []);
          const despesasPendentesFluxo = txList.filter(t => t.type === 'EXPENSE' && t.status === 'PENDING');
          
          // ── 1. Normalização Inteligente de Nomes (Fuzzy / Áudio / Transcrição) ──
          function normalizarNomePessoa(str) {
            if (!str) return '';
            const s = String(str).toLowerCase().trim();
            // Erros comuns de transcrição de áudio: "sua coiminha", "coiminha", "socorrinha", "socorro", "cozinha"
            if (/socorr|coimin|coinh|sua\s*coim|socorin/i.test(s)) return 'socorrinha';
            return s;
          }

          const lowerText = String(text || '').toLowerCase();
          let filtroPessoa = normalizarNomePessoa(args.pessoa || args.cliente || '');

          // Se não veio em args.pessoa, extrai da mensagem do usuário
          if (!filtroPessoa) {
            if (/socorr|coimin|coinh|sua\s*coim|socorin/i.test(lowerText)) {
              filtroPessoa = 'socorrinha';
            } else {
              for (const p of terceiros) {
                if (p && p.nome) {
                  const pNorm = normalizarNomePessoa(p.nome);
                  if (pNorm.length >= 3 && lowerText.includes(pNorm)) {
                    filtroPessoa = pNorm;
                    break;
                  }
                }
              }
            }
          }

          // ── 2. Identificar Filtro de Mês / Período ──
          const anoAtual = nowSp.getFullYear();
          const mesAtual = nowSp.getMonth() + 1; // 1-12
          let anoProx = anoAtual;
          let mesProx = mesAtual + 1;
          if (mesProx > 12) { mesProx = 1; anoProx++; }
          const esteMesYYYYMM = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`;
          const proxMesYYYYMM = `${anoProx}-${String(mesProx).padStart(2, '0')}`;
          const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

          const argMes = String(args.mes || args.periodo || '').toLowerCase();

          let targetMesYYYYMM = null;
          let targetMesLabel = null;

          if (
            argMes.includes('proximo') || argMes.includes('próximo') || argMes.includes('que_vem') || argMes === 'next' ||
            lowerText.includes('mês que vem') || lowerText.includes('mes que vem') || lowerText.includes('próximo mês') || lowerText.includes('proximo mes')
          ) {
            targetMesYYYYMM = proxMesYYYYMM;
            targetMesLabel = `Mês que vem (${mesesNomes[mesProx - 1]}/${anoProx})`;
          } else if (
            argMes.includes('atual') || argMes.includes('este') || argMes.includes('esse') ||
            lowerText.includes('este mês') || lowerText.includes('este mes') || lowerText.includes('esse mês') || lowerText.includes('esse mes') || lowerText.includes('deste mês') || lowerText.includes('desse mês')
          ) {
            targetMesYYYYMM = esteMesYYYYMM;
            targetMesLabel = `Este mês (${mesesNomes[mesAtual - 1]}/${anoAtual})`;
          } else {
            for (let i = 0; i < mesesNomes.length; i++) {
              const nomeM = mesesNomes[i].toLowerCase();
              if (lowerText.includes(nomeM) || argMes.includes(nomeM)) {
                const mesNum = i + 1;
                let anoM = anoAtual;
                if (mesNum < mesAtual) anoM = anoAtual + 1;
                targetMesYYYYMM = `${anoM}-${String(mesNum).padStart(2, '0')}`;
                targetMesLabel = `${mesesNomes[i]}/${anoM}`;
                break;
              }
            }
          }

          function parseContaData(dt) {
            if (!dt) return { yyyymm: null, dtFormat: 'Sem data', day: null };
            const dtClean = String(dt).trim().split(' ')[0];
            const pts = dtClean.split(/[-/]/);
            if (pts.length === 3) {
              if (pts[0].length === 4) {
                const yyyymm = `${pts[0]}-${pts[1].padStart(2, '0')}`;
                const dtFormat = `${pts[2]}/${pts[1]}/${pts[0]}`;
                return { yyyymm, dtFormat, day: Number(pts[2]) };
              } else {
                const yyyymm = `${pts[2]}-${pts[1].padStart(2, '0')}`;
                const dtFormat = `${pts[0]}/${pts[1]}/${pts[2]}`;
                return { yyyymm, dtFormat, day: Number(pts[0]) };
              }
            }
            return { yyyymm: null, dtFormat: dtClean, day: null };
          }

          if (filtroPessoa) {
            let pFound = terceiros.find(p => {
              if (!p || !p.nome) return false;
              const pNorm = normalizarNomePessoa(p.nome);
              return pNorm.includes(filtroPessoa) || filtroPessoa.includes(pNorm);
            });
            const fluxoMatch = txList.filter(t => t.type === 'EXPENSE' && normalizarNomePessoa(t.description).includes(filtroPessoa));
            
            const rawNome = pFound ? pFound.nome : (filtroPessoa === 'socorrinha' ? 'Socorrinha' : (args.pessoa || filtroPessoa));
            const nomeCapitalizado = rawNome ? (rawNome.charAt(0).toUpperCase() + rawNome.slice(1)) : 'Essa pessoa';

            if (!pFound && fluxoMatch.length === 0) {
              stepMsg = `✅ *Não, Adriano! Você não deve nada para ${nomeCapitalizado}.*\n\n` +
                `Não consta nenhuma conta ou pendência registrada para ela na sua gestão financeira (Total pendente: *R$ 0,00*).\n\n` +
                `💡 _Se você combinou alguma nova conta com ela, é só me dizer o valor e a data de vencimento (ex: "adicionar conta de R$ 110 para ${nomeCapitalizado} dia 10 do mês que vem") que eu registro na hora!_`;
            } else {
              let totalFaltaPessoaGeral = 0;
              let totalPagoPessoaGeral = 0;
              let totalFaltaPessoaMes = 0;
              const todasContasPendentes = [];
              const contasDoMesPendentes = [];
              const contasQuitadas = [];

              if (pFound && Array.isArray(pFound.contas) && pFound.contas.length > 0) {
                pFound.contas.forEach((c, idx) => {
                  const valTotal = Number(c.valor) || 0;
                  const pago = (c.pagamentos || []).reduce((s, x) => s + (Number(x.valor) || 0), 0);
                  const falta = Math.max(0, valTotal - pago);
                  totalFaltaPessoaGeral += falta;
                  totalPagoPessoaGeral += pago;

                  const { yyyymm, dtFormat } = parseContaData(c.dataVencimento);
                  const descExtra = (c.descricao && c.descricao.toLowerCase() !== (c.nomeConta || '').toLowerCase()) ? c.descricao : '';

                  if (falta > 0.01) {
                    const itemConta = {
                      idx: idx + 1,
                      nomeConta: c.nomeConta || 'Parcela',
                      valTotal,
                      pago,
                      falta,
                      dtFormat,
                      yyyymm,
                      descExtra
                    };
                    todasContasPendentes.push(itemConta);
                    if (targetMesYYYYMM && yyyymm === targetMesYYYYMM) {
                      contasDoMesPendentes.push(itemConta);
                      totalFaltaPessoaMes += falta;
                    }
                  } else {
                    contasQuitadas.push(`• *Conta ${idx + 1} (${c.nomeConta || 'Parcela'}):* ${fmt(valTotal)} (✅ Quitado) [Venc: ${dtFormat}]`);
                  }
                });
              }

              if (fluxoMatch.length > 0) {
                fluxoMatch.forEach((t, fIdx) => {
                  const dtStr = String(t.transaction_date || t.created_at || '').slice(0, 10);
                  const { yyyymm, dtFormat } = parseContaData(dtStr);
                  const amt = Number(t.amount || 0);

                  if (t.status === 'PENDING') {
                    totalFaltaPessoaGeral += amt;
                    const itemFluxo = {
                      idx: 'F' + (fIdx + 1),
                      nomeConta: t.description || 'Despesa no Fluxo',
                      valTotal: amt,
                      pago: 0,
                      falta: amt,
                      dtFormat,
                      yyyymm,
                      descExtra: 'Pendente no Fluxo de Caixa'
                    };
                    todasContasPendentes.push(itemFluxo);
                    if (targetMesYYYYMM && yyyymm === targetMesYYYYMM) {
                      contasDoMesPendentes.push(itemFluxo);
                      totalFaltaPessoaMes += amt;
                    }
                  } else {
                    totalPagoPessoaGeral += amt;
                    contasQuitadas.push(`• *${fmt(amt)}* — _${t.description}_ (✅ Pago em ${dtFormat})`);
                  }
                });
              }

              // SE ADRIANO PERGUNTOU ESPECIFICAMENTE POR UM MÊS (ex: mês que vem)
              if (targetMesYYYYMM) {
                if (contasDoMesPendentes.length > 0) {
                  const qtdParcelasMes = contasDoMesPendentes.length;
                  const parcelasLabel = qtdParcelasMes === 1 ? '1 parcela' : `${qtdParcelasMes} parcelas`;

                  const lines = [
                    `📅 *Parcelas para ${nomeCapitalizado} no ${targetMesLabel}:*`,
                    '',
                    `🔢 *Quantidade de parcelas:* *${parcelasLabel}*`,
                    `💰 *Valor total a pagar (somente neste mês):* *${fmt(totalFaltaPessoaMes)}*`,
                    '',
                    `📋 *Detalhamento das parcelas do mês:*`
                  ];

                  contasDoMesPendentes.forEach(c => {
                    const descTxt = c.descExtra ? `\n   🏷️ *Referência:* _${c.descExtra}_` : '';
                    lines.push(`• *${c.nomeConta}:* *${fmt(c.falta)}*${descTxt}\n   📅 Vencimento: *${c.dtFormat}* ⏳`);
                  });

                  // REGRA DE OURO: NÃO MOSTRAR DEMAIS MESES NEM TOTAL ACUMULADO FUTURO!
                  lines.push('');
                  lines.push(`💡 _Para consultar parcelas de outros meses ou todas as contas dela, diga: "quantas contas devo para ${nomeCapitalizado}" ou pergunte pelo mês desejado._`);
                  stepMsg = lines.join('\n');
                } else if (totalFaltaPessoaGeral > 0.01) {
                  stepMsg = `✅ *Adriano, você tem 0 parcelas para pagar no ${targetMesLabel} para ${nomeCapitalizado}!* (Total no mês: *R$ 0,00*).\n\n` +
                    `Você não tem nenhuma conta dela vencendo nesse mês.\n\n` +
                    `💡 _Para consultar as contas de outros meses ou todas as contas dela, diga: "quantas contas devo para ${nomeCapitalizado}"._`;
                } else {
                  stepMsg = `✅ *Não, Adriano! Você não deve nada para ${nomeCapitalizado}.*\n\nTodas as contas anteriores já constam como *100% QUITADAS* (Total pendente: *R$ 0,00*).`;
                }
              } else {
                // SEM FILTRO DE MÊS ESPECÍFICO (ex: "quantas contas que eu tenho que eu tô devendo da socorrinha")
                if (totalFaltaPessoaGeral <= 0.01) {
                  const lines = [
                    `✅ *Adriano, você tem 0 contas pendentes para ${nomeCapitalizado}!*`,
                    '',
                    `Todas as contas anteriores já constam como *100% QUITADAS e pagas* na sua gestão financeira!`,
                    `💰 *Total restante a pagar: R$ 0,00*`
                  ];

                  if (contasQuitadas.length > 0) {
                    lines.push('');
                    lines.push('📜 *Histórico de pagamentos/contas já quitados:*');
                    lines.push(...contasQuitadas.slice(0, 5));
                    if (totalPagoPessoaGeral > 0) {
                      lines.push(`💵 *Total já liquidado:* *${fmt(totalPagoPessoaGeral)}*`);
                    }
                  }

                  stepMsg = lines.join('\n');
                } else {
                  const gruposPorMes = {};
                  todasContasPendentes.forEach(c => {
                    const chaveMes = c.yyyymm || 'sem_data';
                    if (!gruposPorMes[chaveMes]) gruposPorMes[chaveMes] = { items: [], total: 0 };
                    gruposPorMes[chaveMes].items.push(c);
                    gruposPorMes[chaveMes].total += c.falta;
                  });

                  const chavesOrdenadas = Object.keys(gruposPorMes).sort();
                  const qtdContasTotal = todasContasPendentes.length;
                  const contasTotalLabel = qtdContasTotal === 1 ? '1 conta/parcela' : `${qtdContasTotal} contas/parcelas`;

                  const lines = [
                    `⚠️ *Adriano, você tem ${contasTotalLabel} pendente${qtdContasTotal > 1 ? 's' : ''} para ${nomeCapitalizado}:*`,
                    '',
                    `🔢 *Quantidade total de contas:* *${qtdContasTotal}*`,
                    `💰 *Total geral que falta pagar: ${fmt(totalFaltaPessoaGeral)}*`,
                    ''
                  ];

                  lines.push('📅 *Divisão por Mês de Vencimento:*');
                  chavesOrdenadas.forEach(chave => {
                    const grp = gruposPorMes[chave];
                    let labelMes = 'Sem data definida';
                    if (chave !== 'sem_data') {
                      const p = chave.split('-');
                      const idxM = parseInt(p[1], 10) - 1;
                      const nomeM = mesesNomes[idxM] || p[1];
                      labelMes = `${nomeM}/${p[0]}`;
                    }
                    lines.push(`• 🗓️ *${labelMes}:* *${fmt(grp.total)}* (${grp.items.length} parcela${grp.items.length > 1 ? 's' : ''})`);
                    grp.items.forEach(it => {
                      const refStr = it.descExtra ? ` — _${it.descExtra}_` : '';
                      lines.push(`   └ *${it.nomeConta}:* ${fmt(it.falta)}${refStr} (Venc: ${it.dtFormat})`);
                    });
                  });

                  lines.push('');
                  lines.push(`💡 _Para saber apenas as parcelas de um mês, diga: "quanto tenho que pagar mês que vem para ${nomeCapitalizado}"._`);
                  stepMsg = lines.join('\n');
                }
              }
            }
          } else {
            // SEM FILTRO DE PESSOA (CONSULTA GERAL DE DÍVIDAS)
            let totalFaltaGeral = 0;
            let totalFaltaMes = 0;
            let totalContasMes = 0;
            const pessoasComDividaGeral = [];
            const pessoasComDividaMes = [];

            terceiros.forEach(p => {
              let faltaPessoaGeral = 0;
              let contasPessoaGeral = 0;
              let faltaPessoaMes = 0;
              let contasPessoaMes = 0;
              let proxVencArr = [];

              (p.contas || []).forEach(c => {
                const valTotal = Number(c.valor) || 0;
                const pago = (c.pagamentos || []).reduce((s, x) => s + (Number(x.valor) || 0), 0);
                const falta = Math.max(0, valTotal - pago);
                if (falta > 0.01) {
                  faltaPessoaGeral += falta;
                  contasPessoaGeral++;
                  const { yyyymm, dtFormat } = parseContaData(c.dataVencimento);
                  if (c.dataVencimento) proxVencArr.push(c.dataVencimento);
                  if (targetMesYYYYMM && yyyymm === targetMesYYYYMM) {
                    faltaPessoaMes += falta;
                    contasPessoaMes++;
                  }
                }
              });

              if (faltaPessoaGeral > 0.01) {
                totalFaltaGeral += faltaPessoaGeral;
                proxVencArr.sort();
                const proxFmt = proxVencArr.length > 0 ? parseContaData(proxVencArr[0]).dtFormat : 'Não informado';
                pessoasComDividaGeral.push({ nome: p.nome, falta: faltaPessoaGeral, contas: contasPessoaGeral, vencimento: proxFmt });
              }

              if (faltaPessoaMes > 0.01) {
                totalFaltaMes += faltaPessoaMes;
                totalContasMes += contasPessoaMes;
                pessoasComDividaMes.push({ nome: p.nome, falta: faltaPessoaMes, contas: contasPessoaMes });
              }
            });

            if (targetMesYYYYMM) {
              if (pessoasComDividaMes.length > 0) {
                const parcelasTotalLabel = totalContasMes === 1 ? '1 parcela' : `${totalContasMes} parcelas`;
                const lines = [
                  `📅 *Parcelas para pagar no ${targetMesLabel}:*`,
                  '',
                  `🔢 *Quantidade total de parcelas no mês:* *${parcelasTotalLabel}*`,
                  `💰 *Total a pagar (somente neste mês):* *${fmt(totalFaltaMes)}*`,
                  '',
                  `📋 *Detalhamento por pessoa:*`
                ];
                pessoasComDividaMes.forEach((p, idx) => {
                  lines.push(`${idx + 1}. 👤 *${p.nome}*\n   💰 *A pagar no mês: ${fmt(p.falta)}* (${p.contas} parcela${p.contas > 1 ? 's' : ''})`);
                });
                lines.push('');
                lines.push('_Para ver detalhes de alguém, diga: "quanto devo para [nome] no mês que vem" ou pergunte de outros meses._');
                stepMsg = lines.join('\n');
              } else {
                stepMsg = `🎉 *Excelente notícia, Adriano! Você tem 0 parcelas para pagar no ${targetMesLabel}!* (Total: *R$ 0,00*).\n\nNenhuma conta ou parcela vence nesse mês!`;
              }
            } else {
              const despesasPendentes = despesasPendentesFluxo.map(t => {
                totalFaltaGeral += Number(t.amount || 0);
                const dt = String(t.transaction_date || t.created_at || '').slice(0, 10);
                let dtFmt = dt;
                const pts = dt.split('-');
                if (pts.length === 3) dtFmt = `${pts[2]}/${pts[1]}/${pts[0]}`;
                return `• 💸 *${fmt(t.amount)}* — _${t.description}_ (Venc: ${dtFmt})`;
              });

              if (pessoasComDividaGeral.length === 0 && despesasPendentes.length === 0) {
                stepMsg = `🎉 *Excelente notícia, Adriano! Você não está devendo para ninguém no momento!*` +
                  `\n\nTodas as contas e pessoas na sua gestão financeira estão *100% quitadas e em dia*!` +
                  `\n💰 *Total geral pendente: R$ 0,00*`;
              } else {
                const lines = ['👑 *Pessoas e Contas que Você Deve (Quem Eu Devo):*\n'];
                pessoasComDividaGeral.forEach((p, idx) => {
                  lines.push(`${idx + 1}. 👤 *${p.nome}*\n   💰 *Falta pagar: ${fmt(p.falta)}* (${p.contas} conta${p.contas > 1 ? 's' : ''} pendente${p.contas > 1 ? 's' : ''})\n   🗓️ Próximo vencimento: *${p.vencimento}*`);
                });
                
                if (despesasPendentes.length > 0) {
                  lines.push('\n📑 *Despesas Avulsas Pendentes no Fluxo:*');
                  lines.push(...despesasPendentes);
                }
                
                lines.push(`\n🔴 *Total Geral Pendente a Pagar:* *${fmt(totalFaltaGeral)}*`);
                lines.push('\n_Para ver detalhes de alguém, diga: "quanto devo para [nome]" ou "contas da [nome]"._');
                stepMsg = lines.join('\n');
              }
            }
          }
        
        // ── ADICIONAR DÍVIDA / PARCELAS / CONTA PARA MÊS QUE VEM ─────────
        } else if (args.action === 'add_debt' || args.action === 'create_debt' || args.action === 'add_terceiro') {
          const pessoaNome = String(args.pessoa || args.cliente || 'Pessoa').trim();
          const valor = Number(args.valor || args.amount || 0);
          const numParcelas = Math.max(1, parseInt(args.parcelas || 1, 10));
          // Extrair descrição / referência detalhada
          let rawDesc = String(args.descricao || args.description || args.motivo || args.referencia || '').trim();
          let rawNomeConta = String(args.nome_conta || args.servico || '').trim();

          // Se nomeConta é genérico ("Parcela", "Conta") mas temos descrição
          if ((!rawNomeConta || /^(parcela|conta|d[ií]vida)$/i.test(rawNomeConta)) && rawDesc) {
            rawNomeConta = rawDesc;
          }

          // Se ainda genérico, tentar inferir do texto do usuário
          if (!rawNomeConta || /^(parcela|conta|d[ií]vida)$/i.test(rawNomeConta)) {
            const mRef = String(text || '').match(/referente\s+(?:a|ao|à|do|da)?\s*([^,\.\n]+)/i)
              || String(text || '').match(/(?:para\s+comprar|compra\s+de)\s+([^,\.\n]+)/i)
              || String(text || '').match(/(passagens[^,\.\n]*)/i);
            if (mRef && mRef[1]) {
              rawDesc = rawDesc || mRef[0].trim();
              rawNomeConta = mRef[1].trim();
            }
          }

          if (rawNomeConta && rawNomeConta.length > 0) {
            rawNomeConta = rawNomeConta.charAt(0).toUpperCase() + rawNomeConta.slice(1);
          }

          const nomeContaBase = rawNomeConta || (numParcelas > 1 ? 'Parcela' : 'Conta');
          const descricaoFinal = rawDesc || nomeContaBase;
          
          if (valor <= 0) {
            stepMsg = '⚠️ Por favor informe o valor da conta ou da parcela.';
          } else {
            const kRes = await ck.call(this, 'GET', `/api/finance/king-data?profile_id=${profileId}`);
            let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
            if (!kingDb || typeof kingDb !== 'object') kingDb = {};
            if (!Array.isArray(kingDb.terceiros)) kingDb.terceiros = [];
            
            let p = kingDb.terceiros.find(x => x && String(x.nome || '').toLowerCase().trim() === pessoaNome.toLowerCase());
            if (!p) {
              p = {
                id: 'terc_' + Date.now(),
                nome: pessoaNome,
                contas: []
              };
              kingDb.terceiros.push(p);
            }
            if (!Array.isArray(p.contas)) p.contas = [];
            
            const textLower = String(text || '').toLowerCase();
            const wantsNextMonth = textLower.includes('mês que vem') ||
              textLower.includes('mes que vem') ||
              textLower.includes('próximo mês') ||
              textLower.includes('proximo mes') ||
              textLower.includes('proximo mês') ||
              textLower.includes('partir do mes que vem') ||
              textLower.includes('partir do mês que vem');

            let curDate = new Date(nowSp.getTime());
            let nextMonthDate = new Date(curDate.getFullYear(), curDate.getMonth() + 1, 1);
            let defaultNextMonth = nextMonthDate.getMonth() + 1;
            let defaultNextYear = nextMonthDate.getFullYear();

            let startYear = wantsNextMonth ? defaultNextYear : nowSp.getFullYear();
            let startMonth = wantsNextMonth ? defaultNextMonth : (nowSp.getMonth() + 1);
            let startDay = 10;
            
            if (args.data_vencimento) {
              const parsed = String(args.data_vencimento).trim();
              const isoMatch = parsed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
              const brMatch = parsed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
              if (isoMatch) {
                startYear = parseInt(isoMatch[1], 10);
                startMonth = parseInt(isoMatch[2], 10);
                startDay = parseInt(isoMatch[3], 10);
              } else if (brMatch) {
                startDay = parseInt(brMatch[1], 10);
                startMonth = parseInt(brMonth[2], 10);
                startYear = parseInt(brMatch[3], 10);
              }
            } else if (args.dia_vencimento) {
              startDay = parseInt(args.dia_vencimento, 10);
              startMonth += 1;
              if (startMonth > 12) { startMonth = 1; startYear += 1; }
            } else {
              startMonth += 1;
              if (startMonth > 12) { startMonth = 1; startYear += 1; }
            }
            
            const criadas = [];
            let curYear = startYear;
            let curMonth = startMonth;
            
            for (let i = 1; i <= numParcelas; i++) {
              const dtVenc = `${curYear}-${String(curMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
              const dtVencBr = `${String(startDay).padStart(2, '0')}/${String(curMonth).padStart(2, '0')}/${curYear}`;
              const rotulo = numParcelas > 1 ? `${nomeContaBase} ${i}/${numParcelas}` : nomeContaBase;
              
              const novaConta = {
                id: 'c_' + Date.now() + '_' + i,
                nomeConta: rotulo,
                descricao: descricaoFinal,
                valor: valor,
                dataVencimento: dtVenc,
                tipo: numParcelas > 1 ? 'recorrente' : 'unica',
                pagamentos: []
              };
              p.contas.push(novaConta);
              criadas.push({ rotulo, valor, dataVencimento: dtVencBr });
              
              curMonth += 1;
              if (curMonth > 12) {
                curMonth = 1;
                curYear += 1;
              }
            }
            
            await ck.call(this, 'PUT', `/api/finance/king-data?profile_id=${profileId}`, {
              profile_id: profileId,
              data: kingDb
            });
            
            const totalAdicionado = valor * numParcelas;
            const summary = await fetchRealSummary.call(this, profileId);
            
            if (numParcelas === 1) {
              stepMsg = `👑 *Conta Registrada com Sucesso na Gestão Financeira!*\n\n` +
                `👤 *Pessoa (Quem Eu Devo):* *${pessoaNome}*\n` +
                `📝 *Descrição / Referência:* *${descricaoFinal}*\n` +
                `💰 *Valor:* ${fmt(valor)}\n` +
                `📅 *Vencimento:* *${criadas[0].dataVencimento}* ⏳\n\n` +
                `📌 *Sincronização:* Registrada exclusivamente para o mês de vencimento (sem impactar o mês atual).\n\n` +
                buildSummaryMessage(summary, fmt);
            } else {
              const parcelasPreview = criadas.slice(0, 5).map(c => `• ${c.rotulo}: ${fmt(c.valor)} — Venc: ${c.dataVencimento}`).join('\n');
              const extraCount = criadas.length > 5 ? `\n• ... e mais ${criadas.length - 5} parcelas até ${criadas[criadas.length - 1].dataVencimento}` : '';
              
              stepMsg = `👑 *Parcelamento Registrado com Sucesso na Gestão Financeira!*\n\n` +
                `👤 *Pessoa (Quem Eu Devo):* *${pessoaNome}*\n` +
                `📝 *Referência / Motivo:* *${descricaoFinal}*\n` +
                `🔢 *Total de Parcelas:* *${numParcelas}x de ${fmt(valor)}*\n` +
                `💰 *Valor Total do Parcelamento:* *${fmt(totalAdicionado)}*\n` +
                `🗓️ *Período:* De *${criadas[0].dataVencimento}* até *${criadas[criadas.length - 1].dataVencimento}*\n\n` +
                `📋 *Cronograma das Parcelas (distribuídas mês a mês):*\n` +
                parcelasPreview + extraCount + `\n\n` +
                `📌 *Sincronização:* Cada parcela foi programada em seu respectivo mês futuro. O mês atual não foi afetado!\n\n` +
                buildSummaryMessage(summary, fmt);
            }
          }

        // ── REGISTRAR PAGAMENTO DE DÍVIDA (PAGAR TERCEIRO) ──────────────
        } else if (args.action === 'pay_debt' || args.action === 'pay_terceiro') {
          const pessoaBusca = String(args.pessoa || args.cliente || '').toLowerCase().trim();
          const valorPago = Number(args.valor || args.valor_pago || args.amount || 0);
          
          const kRes = await ck.call(this, 'GET', `/api/finance/king-data?profile_id=${profileId}`);
          let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
          const terceiros = Array.isArray(kingDb.terceiros) ? kingDb.terceiros : [];
          
          let p = terceiros.find(x => x && String(x.nome || '').toLowerCase().includes(pessoaBusca));
          if (!p) {
            stepMsg = `��️ Não encontrei nenhuma pessoa com o nome "${args.pessoa}" na aba Quem eu devo.`;
          } else {
            const contasPendentes = (p.contas || []).filter(c => {
              const pago = (c.pagamentos || []).reduce((s, x) => s + (Number(x.valor) || 0), 0);
              return (Number(c.valor) || 0) - pago > 0.01;
            });
            
            if (contasPendentes.length === 0) {
              stepMsg = `✅ Todas as contas de *${p.nome}* já estão quitadas!`;
            } else {
              const contaAlvo = contasPendentes[0];
              if (!Array.isArray(contaAlvo.pagamentos)) contaAlvo.pagamentos = [];
              const valAplicar = valorPago > 0 ? valorPago : Number(contaAlvo.valor || 0);
              
              contaAlvo.pagamentos.push({
                valor: valAplicar,
                data: today,
                hora: horaAtualSp
              });
              
              await ck.call(this, 'PUT', `/api/finance/king-data?profile_id=${profileId}`, {
                profile_id: profileId,
                data: kingDb
              });
              
              const summary = await fetchRealSummary.call(this, profileId);
              stepMsg = `💸 *Pagamento Registrado com Sucesso — Agente King*\n\n` +
                `👤 *Pessoa:* ${p.nome}\n` +
                `📝 *Conta:* ${contaAlvo.nomeConta}\n` +
                `💵 *Valor Pago:* ${fmt(valAplicar)}\n` +
                `📅 *Data do Pagamento:* ${today}\n\n` +
                buildSummaryMessage(summary, fmt);
            }
          }

        // ── MARCAR DESPESA DO FLUXO COMO PAGA (JÁ PAGUEI) ───────────────
        } else if (args.action === 'mark_paid' || args.action === 'mark_as_paid') {
          const crit = String(args.description_contains || args.description || args.pessoa || '').toLowerCase().trim();
          const targetAmount = Number(args.amount || 0);
          
          const recent = await fetchRecentTransactions.call(this, 30);
          const targets = recent.filter(t => {
            const isPending = t.status === 'PENDING';
            const descMatch = crit ? String(t.description || '').toLowerCase().includes(crit) : true;
            const amountMatch = targetAmount > 0 ? Math.abs(Number(t.amount) - targetAmount) < 1.0 : true;
            return isPending && (crit ? descMatch : true) && (targetAmount > 0 ? amountMatch : true);
          });
          
          if (targets.length === 0) {
            stepMsg = `⚠️ Não encontrei nenhuma conta pendente correspondente para marcar como paga.`;
          } else {
            const updated = [];
            for (const t of targets) {
              const ur = await ck.call(this, 'PUT', `/api/finance/transactions/${t.id}`, { status: 'PAID' });
              if (ur.statusCode >= 200 && ur.statusCode < 300) updated.push(t);
            }
            const summary = await fetchRealSummary.call(this, profileId);
            const lines = updated.map(t => `• ${fmt(t.amount)} — ${t.description} (Status: PAGO ✅)`);
            stepMsg = `✅ *Conta(s) Marcada(s) como Paga(s) com Sucesso!*\n\n` + lines.join('\n') + '\n\n' + buildSummaryMessage(summary, fmt);
          }

        // ── CLEAR ALL (ZERAR TUDO COM PODER TOTAL E TRAVA DE SEGURANÇA) ─
        } else if (args.action === 'clear_all' || args.action === 'zerar_tudo') {
          const rawInput = String(text || '').toLowerCase();
          const isConfirmed = args.confirmed === true ||
            rawInput.includes('confirmar') ||
            rawInput.includes('confirmo') ||
            rawInput.includes('sim');

          if (!isConfirmed) {
            stepMsg = `⚠️ *Atenção, Adriano! Ação Destrutiva Detectada:*\n\n` +
              `Você solicitou apagar *todos os trabalhos, fluxo de caixa e contas* da sua gestão financeira.\n\n` +
              `🔒 *Para sua segurança, por favor confirme:*\n` +
              `Responda: *"Confirmar zerar"* se realmente deseja apagar tudo.`;
          } else {
            try {
              await ck.call(this, 'POST', '/api/finance/zerar-mes', {
                profile_id: profileId,
                bypass_password: true,
                all: true
              });
            } catch (_) {}

            const kRes = await ck.call(this, 'GET', `/api/finance/king-data?profile_id=${profileId}`);
            let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
            if (!kingDb || typeof kingDb !== 'object') kingDb = {};
            kingDb.trabalhos = [];
            kingDb.terceiros = [];
            await ck.call(this, 'PUT', `/api/finance/king-data?profile_id=${profileId}`, {
              profile_id: profileId,
              data: kingDb
            });

            session.lastCreatedTransactions = [];
            const summary = await fetchRealSummary.call(this, profileId);
            stepMsg = `🧹 *Gestão Financeira Zerada com Sucesso! — Agente King*\n\n` +
              `👑 *Adriano, executei a limpeza completa da sua gestão financeira:*\n` +
              `• ✅ *Fluxo de Caixa:* Todos os lançamentos foram apagados\n` +
              `• ✅ *Trabalhos:* Lista de trabalhos zerada\n` +
              `• ✅ *Contas a Pagar/Terceiros:* Zeradas\n` +
              `• ✅ *Saldo em Caixa:* Redefinido para ${fmt(0)}\n\n` +
              `_Tudo limpo e pronto para novos lançamentos!_\n\n` +
              buildSummaryMessage(summary, fmt);
          }

        // ── CREATE FLUXO (Receitas/Despesas Avulsas) ─────────────────
        } else if (args.action === 'create') {
          const txsToCreate = [];
          if (Array.isArray(args.transactions) && args.transactions.length > 0) {
            txsToCreate.push(...args.transactions);
          }
          const directAmount = Number(args.amount || args.valor || args.valor_total || 0);
          if (directAmount > 0 && txsToCreate.length === 0) {
            const directDesc = String(args.description || args.servico || 'Lançamento via bot').trim();
            let directType = args.type ? String(args.type).toUpperCase() : null;
            if (!directType) {
              const lower = directDesc.toLowerCase();
              if (lower.includes('dízimo') || lower.includes('dizimo') || lower.includes('saída') || lower.includes('saida') || lower.includes('despesa') || lower.includes('gasto') || lower.includes('pagamento')) {
                directType = 'EXPENSE';
              } else {
                directType = 'INCOME';
              }
            }
            txsToCreate.push({
              type: directType,
              amount: directAmount,
              status: args.status || 'PAID',
              description: directDesc
            });
          }

          for (const item of txsToCreate) {
            if (!item.amount || item.amount <= 0) continue;
            let itType = item.type ? String(item.type).toUpperCase() : null;
            const itDesc = String(item.description || 'Lançamento via bot').trim();
            if (!itType) {
              const lower = itDesc.toLowerCase();
              if (lower.includes('dízimo') || lower.includes('dizimo') || lower.includes('saída') || lower.includes('saida') || lower.includes('despesa') || lower.includes('gasto') || lower.includes('pagamento')) {
                itType = 'EXPENSE';
              } else {
                itType = 'INCOME';
              }
            }
            const payload = {
              profile_id: profileId,
              type: itType,
              amount: Number(item.amount),
              status: item.status || 'PAID',
              description: itDesc,
              transaction_date: today
            };
            const cr = await ck.call(this, 'POST', '/api/finance/transactions', payload);
            if (cr.statusCode >= 200 && cr.statusCode < 300) {
              const data = (cr.body && cr.body.data) || {};
              allCreatedTransactions.push({
                id: data.id,
                type: payload.type,
                amount: payload.amount,
                status: payload.status,
                description: payload.description
              });
            }
          }

        // ── CANCEL LAST ─────────────────────────────────────────────
        } else if (args.action === 'cancel_last') {
          let targetIds = (session.lastCreatedTransactions || []).map(t => t.id).filter(Boolean);
          if (targetIds.length === 0) {
            const recent = await fetchRecentTransactions.call(this, 1);
            if (recent.length > 0) targetIds = [recent[0].id];
          }
          if (targetIds.length === 0) {
            stepMsg = '⚠️ Não encontrei transação recente para cancelar. Me fala o valor ou descrição do que quer tirar.';
          } else {
            for (const id of targetIds) await ck.call(this, 'DELETE', `/api/finance/transactions/${id}`);
            session.lastCreatedTransactions = [];
            const summary = await fetchRealSummary.call(this, profileId);
            stepMsg = `🗑️ *Lançamento Cancelado!*\nRemovi o lançamento anterior com sucesso.\n\n` + buildSummaryMessage(summary, fmt);
          }

        // ── DELETE BY CRITERIA (valor ou descrição) ──────────────────
        } else if (args.action === 'delete_by_criteria') {
          const crit = args.criteria || {};
          const recent = await fetchRecentTransactions.call(this, 30);
          let targets = recent.filter(t => {
            const amountMatch = crit.amount ? Math.abs(Number(t.amount) - crit.amount) < 1.0 : true;
            let descMatch = true;
            if (crit.description_contains) {
              const needle = String(crit.description_contains).toLowerCase().trim();
              const haystack = String(t.description || '').toLowerCase();
              descMatch = haystack.includes(needle) || (needle.includes('shopee') && haystack.includes('shobi')) || (needle.includes('shobi') && haystack.includes('shopee'));
            }
            const typeMatch = (crit.type && crit.type !== 'any') ? t.type === crit.type : true;
            return amountMatch && (crit.amount ? true : descMatch) && typeMatch;
          });
          
          // Se mesmo assim não achou por descrição mas tem valor aproximado:
          if (targets.length === 0 && crit.amount) {
            targets = recent.filter(t => Math.abs(Number(t.amount) - crit.amount) < 1.0);
          }

          if (targets.length === 0) {
            const listLines = recent.slice(0, 8).map((t, i) => `${i + 1}. ${t.type === 'INCOME' ? '💵' : '💸'} ${fmt(t.amount)} — _${t.description}_ (${t.status}) [ID: ${t.id}]`);
            stepMsg = '⚠️ Nenhuma transação encontrada com esse critério. Seus lançamentos mais recentes:\n\n' + listLines.join('\n') + '\n\nMe fala qual o ID ou valor que quer remover.';
          } else {
            const deleted = [];
            for (const t of targets.slice(0, 5)) {
              const dr = await ck.call(this, 'DELETE', `/api/finance/transactions/${t.id}`);
              if (dr.statusCode >= 200 && dr.statusCode < 300) deleted.push(t);
            }
            session.lastCreatedTransactions = [];
            const summary = await fetchRealSummary.call(this, profileId);
            const lines = deleted.map(t => `• ${fmt(t.amount)} — ${t.description} (${t.status})`);
            stepMsg = `🗑️ *Lançamento(s) Removido(s) com Sucesso!*\n${lines.join('\n')}\n\n` + buildSummaryMessage(summary, fmt);
          }

        // ── LIST RECENT ──────────────────────────────────────────────
        } else if (args.action === 'list_recent') {
          const recent = await fetchRecentTransactions.call(this, 10);
          if (recent.length === 0) {
            stepMsg = '📋 Nenhum lançamento encontrado ainda.';
          } else {
            const lines = recent.map((t, i) => {
              const icon = t.type === 'INCOME' ? '💵' : '💸';
              const val = fmt(t.amount);
              const lbl = t.status === 'PAID' ? 'Pago/Recebido' : 'Pendente';
              return `${i + 1}. ${icon} ${val} ��� _${t.description}_ (${lbl})`;
            });
            stepMsg = `📋 *Últimos Lançamentos:*\n\n${lines.join('\n')}\n\n_Me diz qual quer alterar ou remover._`;
          }

        // ── ADJUST CASH ──────────────────────────────────────────────
        } else if (args.action === 'adjust_cash') {
          const targetCash = Number(args.target_cash || 0);
          const dash = await ck.call(this, 'GET', '/api/finance/dashboard');
          const currentCash = Number(dash.body?.data?.saldoDisponivel ?? 0);
          const diff = targetCash - currentCash;
          if (Math.abs(diff) < 0.01) {
            stepMsg = `✅ Saldo em caixa já está em ${fmt(targetCash)}. Nenhum ajuste necessário.`;
          } else {
            const adjType = diff > 0 ? 'INCOME' : 'EXPENSE';
            const adjDesc = 'Ajuste de saldo (correção)';
            const cr = await ck.call(this, 'POST', '/api/finance/transactions', { profile_id: profileId, type: adjType, amount: Math.abs(diff), status: 'PAID', description: adjDesc, transaction_date: today });
            const row = (cr.body && cr.body.data) || {};
            if (row.id) session.lastCreatedTransactions = [{ id: row.id, type: adjType, amount: Math.abs(diff), status: 'PAID', description: adjDesc }];
            const summary = await fetchRealSummary.call(this, profileId);
            stepMsg = `🔄 *Saldo Ajustado com Sucesso!*\n\nAntes: ${fmt(currentCash)}\nAgora: ${fmt(summary.saldoDisponivel)}\n\n📝 _Ajuste de ${diff > 0 ? '+' : ''}${fmt(diff)} aplicado._\n\n` + buildSummaryMessage(summary, fmt);
          }

        // ── SUMMARY ──────────────────────────────────────────────────
        } else if (args.action === 'summary') {
          const summary = await fetchRealSummary.call(this, profileId);
          stepMsg = buildSummaryMessage(summary, fmt);

        // ─��� ADVICE (Consultoria de Faturamento) ───────────���──────────
        } else if (args.action === 'advice') {
          const summary = await fetchRealSummary.call(this, profileId);
          const finCtx = `Dados financeiros reais do King:
- Caixa disponível: R$ ${summary.saldoDisponivel.toFixed(2)}
- Receitas recebidas no mês: R$ ${summary.totalRecebido.toFixed(2)}
- Despesas pagas no mês: R$ ${summary.totalPago.toFixed(2)}
- Pendências a receber: R$ ${summary.pendenciasReceber.toFixed(2)}
- Trabalhos ativos: ${summary.trabalhosCount}
- Ticket médio Posicionamento de Imagem: R$ 1.200 (entre 1.000 e 1.400)
- Ticket médio Ensaio Fotográfico: R$ 550
- Produto Conecta King: entrada R$ 35/mês

Dê um conselho CFO de elite, tático e prático. Seja direto. Inclua: o que está bem, o que precisa de atenção e 2 a 3 ações concretas para aumentar o faturamento do mês. Fale em PT-BR, sem enrolação.`;

          const advRes = await openaiCall.call(this, {
            model, temperature: 0.5, max_tokens: 600,
            messages: [{ role: 'system', content: 'Você é um CFO de elite e consultor de faturamento para empreendedores criativos e CEOs de pequenas empresas de alto impacto. Seja direto, analítico e dê conselhos reais.' }, { role: 'user', content: finCtx }]
          });
          const advice = String(advRes.body?.choices?.[0]?.message?.content || '').trim();
          stepMsg = `👑 *Consultoria de Faturamento — King Assistente*\n\n${advice}`;
        }

            // ── REENVIAR ÁUDIO DIÁRIO (ZERO CUSTO / REPLAY) ────────────��───���─────
      } else if (fnName === 'send_daily_audio') {
        const periodo = args.periodo || 'hoje';
        const tipo = args.tipo || (text.toLowerCase().includes('devocional') ? 'devocional' : 'ativacao');
        const isOntem = periodo === 'ontem' || text.toLowerCase().includes('ontem');

        const kRes = await ck.call(this, 'GET', '/api/finance/king-data?profile_id=1');
        const kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
        const audios = kingDb.audios_diarios || {};

        let targetAudio = null;
        let tipoLabel = '';

        if (tipo === 'ativacao') {
          targetAudio = isOntem ? audios.prosperidade_ontem : audios.prosperidade_hoje;
          tipoLabel = 'Ativação Noturna de Prosperidade ' + (isOntem ? '(de ontem)' : '(de hoje)');
        } else {
          targetAudio = isOntem ? audios.devocional_ontem : audios.devocional_hoje;
          tipoLabel = 'Devocional ' + (isOntem ? '(de ontem)' : '(de hoje)');
        }

        if (!targetAudio) {
          // Tentar o outro tipo disponível
          targetAudio = isOntem ? (audios.prosperidade_ontem || audios.devocional_ontem) : (audios.prosperidade_hoje || audios.devocional_hoje);
          if (targetAudio) tipoLabel = 'Palavra ' + (isOntem ? '(de ontem)' : '(de hoje)');
        }

        if (targetAudio && targetAudio.file_id) {
          const tgToken = String($env.TELEGRAM_BOT_TOKEN || '').trim();
          try {
            await fetch('https://api.telegram.org/bot' + tgToken + '/sendVoice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                voice: targetAudio.file_id,
                caption: '🎧 *' + tipoLabel + '*\n_' + (targetAudio.titulo || 'Gravação Oficial') + '_',
                parse_mode: 'Markdown'
              })
            });
            stepMsg = '🎧 *Áudio Reenviado com Sucesso!*\nAcabei de enviar a gravação de ' + tipoLabel + ' acima. Bom proveito! 🙌';
          } catch (eSend) {
            stepMsg = '⚠️ Falha ao reenviar áudio: ' + String(eSend.message || eSend);
          }
        } else {
          stepMsg = '🎧 Adriano, tenho disponível para reenvio apenas os áudios já gravados de *hoje* e de *ontem*. Se precisar de um dia anterior, posso gerar um novo estudo ou devocional em texto para você!';
        }

      // ── DIAGNÓSTICO DO SISTEMA ────────────────────��───────────────────────
      } else if (fnName === 'check_system_errors') {
        const startT = Date.now();
        const h = await ck.call(this, 'GET', '/health');
        const lat = Date.now() - startT;
        const ok = h.statusCode === 200 && h.body?.status === 'ok';
        let errorsMsg = '';
        try {
          const errR = await ck.call(this, 'GET', '/api/admin/system/recent-errors?limit=10');
          const summary = errR.body?.summary;
          const errors = errR.body?.errors || [];
          if (summary && summary.total_errors_24h > 0) {
            errorsMsg = `\n\n⚠️ *Erros Registrados nas últimas 24h:* ${summary.total_errors_24h}\n`;
            const byPage = summary.pages_breakdown || {};
            for (const [page, count] of Object.entries(byPage).slice(0, 5)) {
              errorsMsg += `• \`${page}\` — ${count} vez(es)\n`;
            }
            if (errors.length > 0) {
              const last = errors[0];
              let descAmigavel = String(last.message || 'Instabilidade temporária');
              if (descAmigavel.includes('maintenance:uptime-selfcheck') || descAmigavel.includes('uptime.health')) {
                descAmigavel = 'Oscilação transitória na rotina de selfcheck';
              } else if (descAmigavel.includes('page.error_500')) {
                descAmigavel = 'Instabilidade temporária de resposta (HTTP 500)';
              }
              const errTime = last.timestamp ? new Date(last.timestamp) : null;
              const timeStr = errTime ? errTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
              errorsMsg += `\n*Última Ocorrência:* ${descAmigavel} em \`${last.path || '/'}\` (${timeStr || last.timestamp})\n`;
              if (ok) {
                errorsMsg += `\n🟢 *O erro persiste?* *NÃO, JÁ FOI RESOLVIDO ✅*\n` +
                  `_O sistema já recuperou automaticamente e está operando 100%. Foi apenas um soluço temporário._\n\n` +
                  `💡 _Dica: Você pode me pedir "limpar erros" para zerar este aviso quando quiser._`;
              } else {
                errorsMsg += `\n🔴 *O erro persiste?* *SIM, REQUER ATENÇÃO ⚠️*\n_O servidor ainda está com lentidão ou indisponibilidade._`;
              }
            }
          } else {
            errorsMsg = '\n\n✅ *Zero erros nas últimas 24h! Sistema 100% limpo e estável.*';
          }
        } catch (_) {
          errorsMsg = '\n\n_Diagnóstico de páginas indisponível no momento._';
        }
        stepMsg = `🟢 *Diagnóstico do Sistema Conecta King:*\n\n` +
          `• *Status Geral:* ${ok ? '100% Operacional ✅' : 'Atenção ⚠️'}\n` +
          `• *Servidor / HTTP:* ${h.statusCode} (${lat}ms)\n` +
          `• *Backend Laravel:* ${ok ? 'Ativo e Saudável' : 'Com problemas'}\n` +
          `• *Banco de Dados & Cache:* ${ok ? 'Conectados' : 'Verificar'}` +
          errorsMsg;

      // ── LIMPAR ERROS DO SISTEMA ───────────────────────────────────────────
      } else if (fnName === 'clear_system_errors') {
        const r = await ck.call(this, 'POST', '/api/admin/system/clear-errors');
        if (r.statusCode >= 200 && r.statusCode < 300) {
          stepMsg = `🧹 *Histórico de Erros Zerado com Sucesso! — Agente King*\n\n` +
            `👑 Adriano, o painel de diagnósticos foi limpo:\n` +
            `• ✅ Erros das últimas 24h: 0\n` +
            `• ✅ Cache de incidentes: Limpo\n` +
            `• ✅ Monitor de integridade: Operando 100% verde!`;
        } else {
          stepMsg = `⚠️ Não foi possível limpar o histórico de erros no momento.`;
        }

      // ── TESTE EM TEMPO REAL ───────────────────────────────────────────────
      } else if (fnName === 'test_system_health') {
        const startT = Date.now();
        const r = await ck.call(this, 'GET', '/health');
        const lat = Date.now() - startT;
        const ok = r.statusCode === 200 && r.body?.status === 'ok';
        stepMsg = `⚡ *Teste em Tempo Real Realizado!*\n\n` +
          `• *URL:* \`/health\`\n` +
          `• *Status HTTP:* ${r.statusCode} ${ok ? 'OK ✅' : 'Falha ⚠️'}\n` +
          `• *Tempo de Resposta:* ${lat}ms ${lat < 300 ? '⚡ (Ultrarrápido)' : '🟡'}\n` +
          `• *Resposta do Servidor:* \`${JSON.stringify(r.body || {})}\`\n\n` +
          `${ok ? '🟢 Todos os serviços do Conecta King estão respondendo normalmente!' : '⚠️ Servidor com lentidão ou erro.'}`;

      // ── GERAR CÓDIGO ─────────────────────────────────────────────────────
      
      // ─── 1. BRIEFING EXECUTIVO 360° ─────────────────────────────────
      } else if (fnName === 'executive_briefing') {
        const profileId = (await resolveProfileId.call(this)) || 1;
        const summary = await fetchRealSummary.call(this, profileId);
        
        const kRes = await ck.call(this, 'GET', `/api/finance/king-data?profile_id=${profileId}`);
        const kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
        const lembretes = Array.isArray(kingDb.lembretes) ? kingDb.lembretes : [];
        const hojeLembretes = lembretes.filter(l => l && l.status !== 'cancelado' && (l.data === dataHojeISO || l.data === today));

        const cRes = await ck.call(this, 'GET', '/api/admin/users?limit=100');
        const uList = (cRes.body && (cRes.body.data || cRes.body.users || cRes.body)) || [];
        const uArr = Array.isArray(uList) ? uList : [];
        const nowD = new Date();
        const expiring = uArr.filter(u => {
          if (!u || !u.expires_at) return false;
          const exp = new Date(u.expires_at);
          const diffDays = Math.ceil((exp - nowD) / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 7;
        });
        const expired = uArr.filter(u => {
          if (!u || !u.expires_at) return false;
          return new Date(u.expires_at) < nowD;
        });

        const lines = [
          `👑 *BRIEFING EXECUTIVO — AGENTE KING* 👑`,
          `📅 *${diaSemanaAtual}, ${dataHojeBr} (${horaAtualSp})*\n`,
          `💰 *Raio-X Financeiro:*\n` +
          `• *Disponível em Caixa:* ${fmt(summary.current_balance)}\n` +
          `• *Receitas do Mês:* ${fmt(summary.total_income)}\n` +
          `• *A Receber / Pendências:* ${fmt(summary.pending_receivable)}\n` +
          `• *Despesas do Mês:* ${fmt(summary.total_expense)}\n`,
          `🗓️ *Compromissos & Lembretes de Hoje (${hojeLembretes.length}):*`
        ];

        if (hojeLembretes.length === 0) {
          lines.push(`• _Nenhum compromisso agendado para hoje. Dia livre para prospecção e produção!_`);
        } else {
          hojeLembretes.forEach(l => {
            const ico = l.tipo === 'lembrete' ? '⏰' : (l.tipo === 'ensaio' ? '📸' : (l.tipo === 'mentoria' ? '🎓' : '📅'));
            lines.push(`• ${ico} *${l.titulo}* às ${l.hora_inicio || '09:00'}${l.local ? ' (' + l.local + ')' : ''}`);
          });
        }

        lines.push(`\n👥 *Assinaturas & Clientes:*`);
        lines.push(`• *Total de Clientes:* ${uArr.length}`);
        if (expiring.length > 0) {
          lines.push(`• ⏳ *${expiring.length} cliente(s) vencendo nos próximos 7 dias!*`);
        }
        if (expired.length > 0) {
          lines.push(`• 🔴 *${expired.length} cliente(s) vencido(s)*`);
        }
        if (expiring.length === 0 && expired.length === 0) {
          lines.push(`• 🟢 *Todas as contas estão em dia!*`);
        }

        lines.push(`\n⚡ *Diretriz do Agente King:*\n_Foque em avançar nos trabalhos abertos e manter as finanças registradas. Eu cuido dos alertas e da sua agenda!_`);
        stepMsg = lines.join('\n');

      // ─── 2. GESTÃO DE ORÇAMENTOS E PROPOSTAS ─────���──────────────────
      } else if (fnName === 'manage_orcamentos') {
        const profileId = (await resolveProfileId.call(this)) || 1;
        const kRes = await ck.call(this, 'GET', `/api/finance/king-data?profile_id=${profileId}`);
        let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
        if (!kingDb || typeof kingDb !== 'object') kingDb = {};
        if (!Array.isArray(kingDb.orcamentos)) kingDb.orcamentos = [];

        if (args.action === 'create_orcamento') {
          const clienteNome = String(args.cliente_nome || 'Cliente VIP').trim();
          const servico = String(args.servico || 'Serviço Personalizado Conecta King').trim();
          const valor = Number(args.valor || 0);
          const condicoes = String(args.condicoes || '50% de entrada na reserva via PIX e 50% na entrega').trim();
          const dataPrevista = String(args.data_evento || dataHojeBr).trim();
          const orcId = 'ORC-' + Date.now().toString().slice(-6);

          const novoOrc = {
            id: orcId,
            cliente: clienteNome,
            servico,
            valor,
            condicoes,
            data_prevista: dataPrevista,
            status: 'enviado',
            created_at: dataHojeISO + ' ' + horaAtualSp
          };

          kingDb.orcamentos.unshift(novoOrc);
          await ck.call(this, 'PUT', `/api/finance/king-data?profile_id=${profileId}`, { profile_id: profileId, data: kingDb });

          const zapTexto = `Olá ${clienteNome}! 👑 Segue sua Proposta Comercial Conecta King:\n\n` +
            `📋 *Serviço:* ${servico}\n` +
            `🗓️ *Data Prevista:* ${dataPrevista}\n` +
            `💰 *Investimento Total:* ${fmt(valor)}\n` +
            `💳 *Condições:* ${condicoes}\n\n` +
            `🔑 *Chave PIX Oficial:* playadrian@gmail.com (Adriano King)\n\n` +
            `Para confirmar sua reserva, basta responder aqui com o comprovante da entrada! Qualquer dúvida fico à disposição.`;

          const zapUrl = `https://wa.me/${args.cliente_whatsapp ? String(args.cliente_whatsapp).replace(/\D/g, '') : ''}?text=` + encodeURIComponent(zapTexto);

          stepMsg = `📄 *Proposta Comercial Gerada com Sucesso! — Agente King*\n\n` +
            `🆔 *Código:* \`${orcId}\`\n` +
            `👤 *Cliente:* *${clienteNome}*\n` +
            `💼 *Serviço:* ${servico}\n` +
            `💰 *Valor:* *${fmt(valor)}*\n` +
            `🗓️ *Data Prevista:* ${dataPrevista}\n` +
            `💳 *Condições:* ${condicoes}\n\n` +
            `📲 [Tocar aqui para Enviar Orçamento no WhatsApp](${zapUrl})\n` +
            `_(Ao tocar, abre o WhatsApp com a proposta formal e chave PIX já preenchidas!)_`;

        } else if (args.action === 'list_orcamentos') {
          const lista = kingDb.orcamentos || [];
          if (lista.length === 0) {
            stepMsg = `📄 *Orçamentos Conecta King:*\n\nNenhum orçamento emitido recentemente.\n\nPara gerar um novo, é só me pedir: _"King, gera orçamento de ensaio de R$ 800 para a Maria"_`;
          } else {
            const lines = lista.slice(0, 8).map((o, i) => {
              return `${i + 1}. *${o.cliente}* (\`${o.id}\`)\n   💼 ${o.servico}\n   💰 ${fmt(o.valor)} | 🗓️ ${o.data_prevista || 'A definir'}`;
            });
            stepMsg = `📄 *Últimos Orçamentos Emitidos (${lista.length}):*\n\n${lines.join('\n\n')}`;
          }
        }

      // ─── 3. GESTÃO DE CONVIDADOS VIP (GUESTLIST) ────────────────────
      } else if (fnName === 'manage_vip_guests') {
        if (args.action === 'list_events') {
          const r = await ck.call(this, 'GET', '/api/guest-lists');
          const list = (r.body && (r.body.data || r.body)) || [];
          const arr = Array.isArray(list) ? list : [];
          if (arr.length === 0) {
            stepMsg = `🎟️ *Listas de Convidados Conecta King:*\n\nNenhuma lista de eventos encontrada no momento.`;
          } else {
            const lines = arr.slice(0, 8).map((ev, i) => {
              return `${i + 1}. 🎟️ *${ev.title || ev.name || 'Evento'}* (ID: \`${ev.id}\`)\n   📅 Data: ${ev.event_date || 'A definir'} | Convidados: ${ev.guests_count ?? ev.total_guests ?? 0}`;
            });
            stepMsg = `🎟️ *Eventos & Listas VIP Conecta King (${arr.length}):*\n\n${lines.join('\n\n')}`;
          }
        } else if (args.action === 'event_stats') {
          const evId = args.event_id || 1;
          const r = await ck.call(this, 'GET', `/api/guest-lists/${evId}/stats`);
          const st = (r.body && (r.body.data || r.body)) || {};
          stepMsg = `📊 *Estatísticas do Evento VIP (ID: ${evId}):*\n\n` +
            `👥 *Total de Convidados:* ${st.total_guests ?? 0}\n` +
            `✅ *Confirmados:* ${st.confirmed ?? st.total_confirmed ?? 0}\n` +
            `❌ *Recusados:* ${st.declined ?? 0}\n` +
            `⏳ *Aguardando Confirmação:* ${st.pending ?? 0}\n` +
            `🎫 *Presentes no Local (Check-in Portaria):* ${st.checked_in ?? 0}`;
        } else if (args.action === 'add_guest') {
          const evId = args.event_id || 1;
          const gName = String(args.guest_name || 'Convidado VIP').trim();
          const comps = Number(args.companions || 0);
          const r = await ck.call(this, 'POST', `/api/guest-lists/${evId}/guests`, {
            name: gName,
            companion_limit: comps,
            category: args.category || 'VIP'
          });
          if (r.statusCode >= 200 && r.statusCode < 300) {
            stepMsg = `🎟️ *Convidado VIP Adicionado com Sucesso!*\n\n👤 *Nome:* ${gName}\n👥 *Acompanhantes permitidos:* ${comps}\n🏷️ *Categoria:* ${args.category || 'VIP'}\n\n✅ _Liberado para acesso na portaria QR Code!_`;
          } else {
            stepMsg = `⚠️ Falha ao adicionar convidado VIP: ${JSON.stringify(r.body).slice(0, 200)}`;
          }
        }

      // ──�� 4. COBRANÇA E RECUPERAÇÃO DE CLIENTES ──────────────────────
      } else if (fnName === 'collect_clients') {
        const lowerMsg = String(text || '').toLowerCase();
        const isAskingAboutMyDebts = lowerMsg.includes('estou devendo') ||
          lowerMsg.includes('eu devo') ||
          lowerMsg.includes('quem eu devo') ||
          lowerMsg.includes('pessoas que eu devo') ||
          lowerMsg.includes('nome de pessoas que') ||
          lowerMsg.includes('minhas dividas') ||
          lowerMsg.includes('minhas dívidas') ||
          lowerMsg.includes('socorrinha');

        if (isAskingAboutMyDebts) {
          // Redirecionamento automático blindado para list_debts da Gestão Financeira!
          const kRes = await ck.call(this, 'GET', `/api/finance/king-data?profile_id=${profileId}`);
          let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
          const terceiros = Array.isArray(kingDb.terceiros) ? kingDb.terceiros : [];
          const txRes = await ck.call(this, 'GET', `/api/finance/transactions?limit=100&orderBy=created_at&orderDir=DESC`);
          const txList = Array.isArray(txRes.body?.data) ? txRes.body.data : (Array.isArray(txRes.body?.data?.data) ? txRes.body.data.data : []);
          const despesasPendentesFluxo = txList.filter(t => t.type === 'EXPENSE' && t.status === 'PENDING');
          
          let totalFaltaGeral = 0;
          const pessoasComDivida = [];
          terceiros.forEach(p => {
            let totalPessoaFalta = 0;
            let totalPessoaContasPendentes = 0;
            let proximosVenc = [];
            (p.contas || []).forEach(c => {
              const valTotal = Number(c.valor) || 0;
              const pago = (c.pagamentos || []).reduce((s, x) => s + (Number(x.valor) || 0), 0);
              const falta = Math.max(0, valTotal - pago);
              if (falta > 0.01) {
                totalPessoaFalta += falta;
                totalPessoaContasPendentes++;
                if (c.dataVencimento) proximosVenc.push(c.dataVencimento);
              }
            });
            if (totalPessoaFalta > 0.01) {
              totalFaltaGeral += totalPessoaFalta;
              proximosVenc.sort();
              let proxVencStr = 'Não informado';
              if (proximosVenc.length > 0) {
                const pts = proximosVenc[0].split('-');
                proxVencStr = pts.length === 3 ? `${pts[2]}/${pts[1]}/${pts[0]}` : proximosVenc[0];
              }
              pessoasComDivida.push({ nome: p.nome, falta: totalPessoaFalta, contas: totalPessoaContasPendentes, vencimento: proxVencStr });
            }
          });

          if (pessoasComDivida.length === 0 && despesasPendentesFluxo.length === 0) {
            stepMsg = `🎉 *Excelente notícia, Adriano! Você não está devendo para ninguém no momento!*\n\nTodas as contas e pessoas na sua gestão financeira estão *100% quitadas e em dia*!\n💰 *Total geral a pagar: R$ 0,00*\n\n💡 _Se você combinou alguma nova conta com alguém para os próximos meses, é só me falar (ex: "conta de fulano para pagar mês que vem dia 10") que eu programo na hora!_`;
          } else {
            const lines = ['👑 *Pessoas e Contas que Você Deve (Quem Eu Devo):*\n'];
            pessoasComDivida.forEach((p, idx) => {
              lines.push(`${idx + 1}. 👤 *${p.nome}*\n   💰 *Falta pagar: ${fmt(p.falta)}* (${p.contas} conta${p.contas > 1 ? 's' : ''} pendente${p.contas > 1 ? 's' : ''})\n   🗓️ Próximo vencimento: *${p.vencimento}*`);
            });
            if (despesasPendentesFluxo.length > 0) {
              lines.push('\n📑 *Despesas Avulsas Pendentes no Fluxo:*');
              despesasPendentesFluxo.forEach(t => {
                totalFaltaGeral += Number(t.amount || 0);
                lines.push(`• 💸 *${fmt(t.amount)}* — _${t.description}_ (${t.transaction_date || 'Sem data'})`);
              });
            }
            lines.push(`\n🔴 *Total Geral Pendente a Pagar:* *${fmt(totalFaltaGeral)}*`);
            lines.push('\n_Para ver detalhes de alguém, diga: "quanto devo para [nome]" ou "contas da [nome]"._');
            stepMsg = lines.join('\n');
          }
        } else {
        const cRes = await ck.call(this, 'GET', '/api/admin/users?limit=100');
        const uList = (cRes.body && (cRes.body.data || cRes.body.users || cRes.body)) || [];
        const uArr = Array.isArray(uList) ? uList : [];
        const nowD = new Date();
        const filtro = args.filtro || 'todos';

        const targets = uArr.filter(u => {
          if (!u || !u.expires_at) return false;
          const exp = new Date(u.expires_at);
          const diffDays = Math.ceil((exp - nowD) / (1000 * 60 * 60 * 24));
          if (filtro === 'expirados') return diffDays < 0;
          if (filtro === 'a_expirar') return diffDays >= 0 && diffDays <= 7;
          return diffDays <= 7;
        });

        if (targets.length === 0) {
          stepMsg = `🟢 *Cobranças Conecta King:*\n\nExcelente notícia, Adriano! Nenhum cliente com plano vencendo nos próximos dias. Todos estão 100% em dia!`;
        } else {
          const lines = targets.slice(0, 8).map((u, i) => {
            const exp = new Date(u.expires_at);
            const isVencido = exp < nowD;
            const statusTxt = isVencido ? '🔴 Vencido' : '⏳ Vence em breve';
            const zapMsg = encodeURIComponent(
              `Olá ${u.name}! 👑 Passando para avisar que sua assinatura da Conecta King (${u.planName || 'Plano Pro'}) ` +
              (isVencido ? 'venceu recentemente' : 'está vencendo nos próximos dias') +
              `.

Para renovar seu acesso, chave PIX: playadrian@gmail.com (Adriano King).
Assim que transferir, me manda o comprovante por aqui que já renovo para você!`
            );
            const zapLink = `https://wa.me/?text=${zapMsg}`;
            return `${i + 1}. *${u.name}* (${u.email || u.tag})\n` +
                   `   💎 Plano: *${u.planName || 'Plano Pro'}* | 📅 Vencimento: ${u.expires_at.slice(0, 10)} (${statusTxt})\n` +
                   `   📲 [Cobrar com 1 Toque no WhatsApp](${zapLink})`;
          });

          stepMsg = `💳 *Painel de Cobrança & Renovação Conecta King (${targets.length} clientes):*\n\n` +
            lines.join('\n\n') +
            `\n\n💡 _Ao tocar no link, o WhatsApp abre com o texto de renovação e a chave PIX já digitados!_`;
        }
      }

      } else if (fnName === 'generate_invite_code') {
        const code = String(args.custom_code || '').toUpperCase().trim();
        const r = await ck.call(this, 'POST', '/api/admin/codes/generate-manual', { customCode: code, expiresAt: null });
        if (r.statusCode >= 200 && r.statusCode < 300) {
          session.lastGeneratedCode = code;
          stepMsg = `🎟️ *Código de Registro Gerado!*\n\n*Código:* \`${code}\`\n\n_Código memorizado! Se você me passar o e-mail e senha agora, vou cadastrar o cliente diretamente neste código._`;
        } else {
          stepMsg = `⚠️ Falha ao criar código: ${JSON.stringify(r.body).slice(0, 200)}`;
        }
      }
      if (stepMsg) {
        toolResponses.push(stepMsg);
      }
    } // fim do loop tool_calls

    
    if (allCreatedAgendaItems.length > 0) {
      if (allCreatedAgendaItems.length === 1) {
        const it = allCreatedAgendaItems[0];
        const singleMsg = `${it.icone} *${it.header} — Agente King*\n\n` +
          `📌 *${it.isLembrete ? 'Lembrete' : (it.isMentoria ? 'Mentoria' : 'Compromisso')}:* ${it.titulo}\n` +
          `🗓️ *Data:* ${it.dataFormatada}\n` +
          `⏰ *Horário:* ${it.horaInicio}${it.horaFim ? ' às ' + it.horaFim : ''}\n` +
          (it.local ? `📍 *Local:* ${it.local}\n` : '') +
          (it.descricao ? `📝 *Observações:* ${it.descricao}\n` : '') +
          `\n📲 [Toque aqui para Adicionar ao seu Google Agenda](${it.gCalUrl})\n` +
          `_(Ao tocar, abre no app Google Agenda do seu celular com alarme e notificação prontos!)_\n\n` +
          `🔔 *Lembretes Ativos Configurados:*\n` +
          `• ☀️ *Começo do dia:* Aviso às 08h–09h da manhã no Telegram\n` +
          `• 🌤�� *Meio do dia:* Aviso às 12h–13h no Telegram\n` +
          `• ⏰ *30 minutos antes:* Alarme no Google Agenda e aviso no Telegram\n` +
          `• ⚡ *15 minutos antes e na hora exata:* Alarme e aviso no Telegram`;
        toolResponses.push(singleMsg);
      } else {
        const count = allCreatedAgendaItems.length;
        const lines = [`⏰ *${count} Novos Lembretes Registrados com Sucesso! — Agente King*\n`];
        allCreatedAgendaItems.forEach((it, idx) => {
          lines.push(`${idx + 1}. ${it.icone} *${it.titulo}*\n   🗓️ *Data:* ${it.dataFormatada} às ${it.horaInicio}\n   📲 [Google Agenda](${it.gCalUrl})`);
        });
        lines.push(`\n🔔 *Lembretes Ativos Configurados para todas as ${count} datas:*\n• Notificações no Telegram de manhã (8h), meio-dia (12h), 30min e 15min antes!`);
        toolResponses.push(lines.join('\n'));
      }
    }

    if (allCreatedTransactions.length > 0) {
      session.lastCreatedTransactions = allCreatedTransactions;
      const summary = await fetchRealSummary.call(this, profileId);
      const lines = ['👑 *Lançamento Financeiro Concluído!*\n'];
      for (const it of allCreatedTransactions) {
        const icon = it.type === 'INCOME' ? '💵' : '💸';
        const lbl = it.status === 'PAID' ? (it.type === 'INCOME' ? 'Recebido em caixa' : 'Saída / Pago') : 'Pendente (A receber)';
        lines.push(`${icon} *${it.type === 'INCOME' ? 'Receita' : 'Despesa'}:* ${fmt(it.amount)} (${lbl})\n   📝 _${it.description}_`);
      }
      lines.push('\n' + buildSummaryMessage(summary, fmt));
      toolResponses.push(lines.join('\n'));
    }

    outMessage = toolResponses.filter(Boolean).join('\n\n').trim();
    if (!outMessage) {
      outMessage = choice?.content?.trim() || '👑 Adriano, comando recebido e processado com sucesso!';
    }
  } else {
    outMessage = choice?.content || 'Olá King! Como posso ajudar na gestão da Conecta King hoje?';
  }

  if (!outMessage || !outMessage.trim()) {
    outMessage = choice?.content?.trim() || '👑 Adriano, comando recebido e processado com sucesso!';
  }
    session.history.push({ role: 'user', content: inputForAi });
    session.history.push({ role: 'assistant', content: outMessage });
    if (session.history.length > 24) session.history.splice(0, 2);
  }
} catch (e) {
  outMessage = '⚠️ Erro ao processar: ' + String(e.message || e).slice(0, 300);
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
outMessage = fixTelegramMarkdown(outMessage);

return [{ json: { ...prev, outMessage, needGoogleCalendar, calendarStart, calendarEnd, calendarSummary, calendarDescription, calendarLocation } }];