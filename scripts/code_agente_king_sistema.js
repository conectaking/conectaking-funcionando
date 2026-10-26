const prev = $input.first().json;
const base = String($env.CK_BASE_URL || 'https://www.conectaking.com.br').replace(/\/$/, '');
const token = String($env.CK_AGENT_JWT || '').trim();
const openaiKey = String($env.OPENAI_API_KEY || '').trim();
const model = String($env.OPENAI_MODEL || 'gpt-4o-mini').trim();
const text = String(prev.text || '').trim();
const chatId = String(prev.chatId || '');
const hadVoice = !!prev.hadVoice;

// Interceptador de Música para Sarah
// Interceptador de Finanças -> Redirecionar para o Agente King Finanças
const isFinanceQuery = /(?:minhas?\s+finan[cç]as?|saldo|despesa|gasto|receita|faturamento|quanto\s+tenho|quanto\s+entrou|quanto\s+saiu|quem\s+eu\s+devo|quanto\s+devo|contas?\s+a\s+pagar|contas?\s+a\s+receber|trabalhos?\s+a\s+receber|lan[cç]ar\s+gasto|lan[cç]ar\s+receita|paguei\s+r\$|recebi\s+r\$|comprei\s+em|minha\s+d[ií]vida)/i.test(text);
if (isFinanceQuery) {
  const redirectMsg = `👑 *Agente King — Sistema Conecta King*\n\nAdriano, o gerenciamento financeiro foi 100% separado e agora é atendido com exclusividade pelo novo *Agente King Finanças*! 💼📊\n\nEu cuido exclusivamente da plataforma *Conecta King*:\n• 👤 *Criar login e cadastrar clientes*\n• 🔑 *Gerar códigos de convite VIP (KING-XXXXX)*\n• 🩺 *Testar rotas e saúde do site (diagnóstico)*\n• ⚠️ *Verificar e limpar erros do sistema (Sentry)*\n• 📋 *Orçamentos e planos da plataforma*\n• 📅 *Agenda de compromissos operacionais*\n\n👉 *Por favor, envie sua mensagem sobre finanças diretamente no Agente King Finanças!*\nLá ele tem seu saldo em tempo real, fluxo de caixa, trabalhos e dívidas com máxima precisão.`;
  return [{
    json: {
      ...prev,
      outMessage: redirectMsg,
      needGoogleCalendar: false
    }
  }];
}
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





═══ REGRA DE OURO SOBRE FINANÇAS (MIGRADAS PARA O AGENTE KING FINANÇAS) ═══
Você é o Agente King focado EXCLUSIVAMENTE nas operações, gestão técnica e suporte da plataforma Conecta King (criar logins de clientes, gerar convites VIP KING-XXXXX, monitorar estabilidade do site, testar rotas, verificar logs de erro, planos da plataforma, orçamentos e agenda operacional).
Você NÃO gerencia finanças pessoais ou empresariais.
Se o usuário perguntar sobre finanças, saldo, receitas, despesas, fluxo de caixa, pagamentos ou dívidas, informe com máxima clareza e cordialidade que agora existe o Agente King Finanças, dedicado exclusivamente a isso, e oriente-o a usar o bot de Finanças!
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