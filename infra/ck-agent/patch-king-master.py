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

const KB = `CONHECIMENTO EXECUTIVO CONECTA KING & ESTÚDIO ADRIANO KING:
- Dono e CEO: Adriano King (@adrianokingg, WhatsApp 11988789417).
- Estúdio Adriano King (Barueri-SP): Posicionamento de Imagem 20 fotos R$1.000 / 30 fotos R$1.400. Ensaio 10 fotos R$300 / 20 fotos R$550 / 30 fotos R$800.
- Plataforma Conecta King: cartões virtuais dinâmicos, tags/pulseiras NFC, King Forms, King Selection, Gestão Financeira integrada, Bíblia e Devocionais 365.
- Planos Conecta King: King Start (R$70), King Prime (R$100), King Essential (R$150), King Finance (R$170), King Finance Plus (R$200), King Premium Plus (R$220), King Corporate (R$230).`;

const SYSTEM_PROMPT = `Você é o Agente King, Assistente Executivo Pessoal e Operador Supremo do Adriano King.
Você atende exclusivamente o CEO Adriano King no Telegram com PODER ADMINISTRATIVO TOTAL sobre toda a plataforma Conecta King.
Tom de voz: executivo de altíssimo nível, ágil, prestativo, confiante, resolutivo e direto. Sem enrolação.

${KB}

═══ PODER ADMINISTRATIVO TOTAL CONECTA KING (O REI MANDA, VOCÊ EXECUTA) ═══
Você tem AUTORIZAÇÃO TOTAL, EXPRESSA e IRRESTRITA do Adriano King para realizar QUALQUER ação no Conecta King.
NUNCA diga que não pode gerenciar dados sensíveis, excluir clientes, ver quantos usuários existem, mudar e-mails, cadastrar clientes ou manipular senhas. Você é o braço direito do Adriano!

═══ REGRAS CRÍTICAS DE CONTEXTO E MEMÓRIA ═══
1. RESPOSTAS DE CONFIRMAÇÃO DO KING (ex: "Sim", "Pode excluir", "Confirmo", "Pode", "Manda"):
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
   - RENOVAÇÃO DE TAG / ASSINATURA:
     * Se o Adriano disser "renova o cliente X por 1 mês", "renova a tag do cliente tal até 31/12", "adiciona 30 dias na tag do fulano":
       -> Use 'manage_client' com action: "renew_tag" e os meses/dias/data.
     * Se o Adriano disser apenas "quero renovar o cliente X" sem falar o prazo:
       -> Responda de forma proativa e direta: "Com certeza, King! Por quanto tempo deseja renovar? Posso renovar por 1 mês, 1 ano ou você prefere definir uma data de vencimento específica?"
   - MUDAR PLANO DO CLIENTE:
     * "muda a conta do cliente X para King Prime", "altera o plano do fulano para Finance", "coloca o plano Essential no cliente Y":
       -> Use 'manage_client' com action: "change_plan" e o new_plan desejado.
   - CONSULTAR CLIENTE:
     * "qual o plano do cliente X?", "quando vence a tag do fulano?", "dados do cliente Y", "qual o código do cliente Z":
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

5. GESTÃO FINANCEIRA — DOMÍNIO TOTAL:
   - REGISTRAR (create): receitas, despesas, pendências. Múltiplos lançamentos na mesma mensagem.
   - REMOVER (delete_by_criteria): "tira o/os R$ X", "apaga os R$ X", "remove a entrada/despesa de X".
   - CANCELAR ÚLTIMO (cancel_last): "apaga o último", "cancela o último", "errei".
   - LISTAR (list_recent): mostrar os últimos lançamentos ao King.
   - AJUSTAR SALDO (adjust_cash): "o caixa correto é R$ X" -> consulte saldo e ajuste a diferença.
   - RESUMO (summary): resumo financeiro limpo e completo.
   - CONSULTORIA CFO (advice): conselhos táticos de faturamento.

6. DIAGNÓSTICO DO SISTEMA (check_system_errors): verificar status e erros de páginas.
7. GERAR CÓDIGO (generate_invite_code): criar código KING-XXXXX.`;

const TOOLS = [
  { type: 'function', function: {
    name: 'list_clients',
    description: 'Consulta a visão geral e lista os usuários/clientes cadastrados no Conecta King. Retorna o total de usuários, quantos estão ativos, vencidos, expirando em 7 dias, administradores e os detalhes de cada um (nome, e-mail, plano, código da tag, validade). Use sempre que o Adriano perguntar "quantos usuários tem", "quantos clientes temos", "listar usuários", "quem são os clientes", "quais usuários estão cadastrados", "mostrar clientes ativos/vencidos" ou quiser saber a base para criar ou excluir.',
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
        action: { type: 'string', enum: ['delete', 'change_email', 'change_password', 'set_admin', 'remove_admin', 'renew_tag', 'change_plan', 'update_tag_code', 'get_info'], description: 'Ação a realizar: delete (excluir cliente permanentemente), change_email (alterar e-mail), change_password (alterar senha), set_admin (dar cargo de admin/colocar no adm), remove_admin (remover do adm), renew_tag (renovar tag/validade), change_plan (mudar plano), update_tag_code (mudar código tag), get_info (consultar dados).' },
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
    description: 'Gerencia transações financeiras: registrar, remover por valor/descrição, ajustar saldo, listar recentes, resumo, consultoria.',
    parameters: {
      type: 'object',
      properties: {
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
        target_cash: { type: 'number', description: 'Saldo desejado em caixa para adjust_cash' }
      },
      required: ['action']
    }
  } },
  { type: 'function', function: {
    name: 'check_system_errors',
    description: 'Verifica erros de páginas e health do sistema.',
    parameters: { type: 'object', properties: { detail: { type: 'boolean' } } }
  } },
  { type: 'function', function: {
    name: 'generate_invite_code',
    description: 'Gera código de registro KING-XXXXX.',
    parameters: { type: 'object', properties: { custom_code: { type: 'string' } }, required: ['custom_code'] }
  } }
];

let outMessage = '';

try {
  if (!openaiKey) {
    outMessage = '⚠️ OPENAI_API_KEY não configurada no servidor.';
  } else {
    const inputForAi = (hadVoice ? '[áudio transcrito] ' : '') + text;
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...session.history.slice(-16),
      { role: 'user', content: inputForAi }
    ];

    const completionRes = await openaiCall.call(this, { model, temperature: 0.1, messages, tools: TOOLS, tool_choice: 'auto' });
    const choice = completionRes.body?.choices?.[0]?.message;

    if (choice?.tool_calls && choice.tool_calls.length > 0) {
      const toolCall = choice.tool_calls[0];
      const fnName = toolCall.function.name;
      let args = {};
      try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch (_) {}

      // ── LISTAR CLIENTES / VISÃO GERAL DE USUÁRIOS ────────────────────────
      if (fnName === 'list_clients') {
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
              return `${i + 1}. *${u.name}*${adminBadge}\n` +
                     `   ✉️ \`${u.email}\`\n` +
                     `   🏷️ Tag: \`${u.tag}\` | 💎 Plano: *${u.planName}*\n` +
                     `   📅 Validade: ${u.expiresAt} (${statusEmoji})`;
            }).join('\n\n');
          }

          outMessage = `👑 *Visão Geral de Usuários — Conecta King*\n\n` +
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
          outMessage = `⚠️ *Não foi possível consultar os usuários:* ${r.body?.message || 'Falha de comunicação com o servidor Conecta King.'}`;
        }

      // ── CADASTRAR CLIENTE ────────────────────────────────────────────────
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
          outMessage = `👑 *Cliente Cadastrado com Sucesso!*\n\n` +
            `👤 *E-mail:* \`${u.email}\`\n` +
            `🔑 *Senha:* \`${args.password}\`\n` +
            `🏷️ *Código / Tag:* \`${u.tag_code || u.id}\`\n` +
            `💎 *Plano:* *${u.plan_name || u.account_type}*\n` +
            `📅 *Validade:* ${exp}\n` +
            `🌐 *Link de Acesso:* https://www.conectaking.com.br/login\n\n` +
            `_A conta já está ativa e pronta para uso!_`;
        } else {
          const errMsg = r.body?.message || r.body?.error?.message || 'Falha ao cadastrar cliente.';
          outMessage = `⚠️ *Não foi possível cadastrar o cliente:*\n${errMsg}`;
        }

      // ── GERENCIAR CLIENTE (EXCLUIR / MUDAR EMAIL / SENHA / ADM / RENOVAR / PLANO) ─
      } else if (fnName === 'manage_client') {
        const targetId = args.identifier || session.lastTargetClient;
        const payload = {
          identifier: targetId,
          action: args.action,
          newEmail: args.new_email || null,
          newPassword: args.new_password || null,
          isAdmin: (args.action === 'set_admin' ? true : (args.action === 'remove_admin' ? false : (args.is_admin !== undefined ? args.is_admin : null))),
          newPlan: args.new_plan || null,
          renewMonths: args.renew_months || null,
          renewDays: args.renew_days || null,
          expiresAt: args.expires_at || null,
          newTagCode: args.new_tag_code || null
        };
        const r = await ck.call(this, 'POST', '/api/admin/users/quick-manage', payload);
        if (r.statusCode >= 200 && r.statusCode < 300 && r.body?.success) {
          const u = r.body.data?.user || {};
          if (args.action === 'delete') {
            session.lastTargetClient = null;
            outMessage = `🗑️ *Cliente Excluído com Sucesso! — Agente King*\n\n` +
              `👤 *Cliente:* ${u.display_name || targetId} (\`${u.email || targetId}\`)\n` +
              (u.tag_code ? `🏷️ *Tag / Código Desvinculado:* \`${u.tag_code}\`\n` : '') +
              `✅ *Status:* Removido permanentemente da plataforma Conecta King.`;
          } else if (args.action === 'change_email') {
            session.lastTargetClient = u.email;
            outMessage = `✏️ *E-mail do Cliente Alterado com Sucesso! — Agente King*\n\n` +
              `👤 *Novo E-mail:* \`${u.email}\`\n` +
              `🏷️ *Tag / Código:* \`${u.tag_code || u.profile_slug}\`\n` +
              `💎 *Plano:* *${u.plan_name || u.account_type}*\n\n` +
              `_O cliente agora deve fazer login com o novo e-mail._`;
          } else if (args.action === 'change_password') {
            session.lastTargetClient = u.email;
            outMessage = `🔑 *Senha do Cliente Alterada com Sucesso! — Agente King*\n\n` +
              `👤 *Cliente:* ${u.display_name || targetId} (\`${u.email || targetId}\`)\n` +
              `🔐 *Nova Senha:* \`${args.new_password}\`\n\n` +
              `_A nova senha já está ativa para acesso imediato!_`;
          } else if (args.action === 'set_admin' || args.action === 'remove_admin' || args.is_admin !== undefined) {
            session.lastTargetClient = u.email;
            const isAdm = args.action === 'set_admin' || args.is_admin === true;
            outMessage = `🛡️ *Cargo de Administrador Atualizado! — Agente King*\n\n` +
              `👤 *Cliente:* ${u.display_name || targetId} (\`${u.email || targetId}\`)\n` +
              `⚡ *Status Admin:* ${isAdm ? 'SIM (Administrador Ativo 👑)' : 'NÃO (Usuário Padrão)'}\n` +
              `💎 *Tipo de Conta:* *${u.plan_name || u.account_type}*\n\n` +
              `_${isAdm ? 'O usuário agora tem acesso com privilégios ao painel /admin!' : 'Os privilégios de administração foram revogados.'}_`;
          } else {
            session.lastTargetClient = u.email;
            const changes = r.body.data?.changes || [];
            const changesText = changes.length > 0 ? changes.map(c => `✅ ${c}`).join('\n') : 'Informações consultadas com sucesso.';
            outMessage = `👑 *Gestão de Cliente Conecta King*\n\n` +
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
            outMessage = `ℹ️ *Cliente Não Encontrado:*\n${errMsg}\n\n_O cliente já pode ter sido excluído anteriormente ou o e-mail/código está diferente. Diga *"quantos usuários tem"* ou *"listar usuários"* para ver todos os clientes cadastrados atualmente._`;
          } else {
            outMessage = `⚠️ *Erro na gestão do cliente:*\n${errMsg}`;
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
            outMessage = `📖 *Tema Devocional Definido!*\n\n📅 *Mês:* ${m}/${y}\n✨ *Tema:* "${themeText}"\n\n_Tema salvo com sucesso para o calendário devocional!_`;
          } else {
            outMessage = `⚠️ Erro ao salvar tema do mês: ${r.body?.message || 'Falha na requisição'}`;
          }
        } else if (args.action === 'generate_month_theme') {
          const r = await ck.call(this, 'POST', `/api/admin/bible/devotionals-365/month-themes/${y}/generate/${m}`, { hint: args.theme_text || '' });
          if (r.statusCode >= 200 && r.statusCode < 300) {
            const textTheme = r.body?.data?.text || '';
            outMessage = `✨ *Novo Tema Gerado com IA!*\n\n📅 *Mês:* ${m}/${y}\n📖 *Tema Criado:* "${textTheme}"\n\n_Tema salvo automaticamente nos Devocionais 365!_`;
          } else {
            outMessage = `⚠️ Erro ao gerar tema com IA: ${r.body?.message || 'Falha na requisição'}`;
          }
        } else if (args.action === 'generate_month') {
          const r = await ck.call(this, 'POST', `/api/admin/bible/devotionals-365/generate-month-ai/${y}/${m}`);
          if (r.statusCode >= 200 && r.statusCode < 300) {
            const total = r.body?.data?.totalGenerated ?? r.body?.data?.count ?? 'todos os';
            outMessage = `✨ *Geração de Devocionais Concluída!*\n\n📅 *Mês:* ${m}/${y}\n📖 Foram gerados e salvos ${total} devocionais diários com IA para este mês!`;
          } else {
            outMessage = `⚠️ Falha ao gerar devocionais do mês: ${r.body?.message || JSON.stringify(r.body)}`;
          }
        } else if (args.action === 'generate_day') {
          const d = args.day || 1;
          const r = await ck.call(this, 'POST', `/api/admin/bible/devotionals-365/day/${d}/generate-ai`);
          if (r.statusCode >= 200 && r.statusCode < 300) {
            const dev = r.body?.data || {};
            outMessage = `📖 *Devocional do Dia ${d} Gerado!*\n\n*Título:* ${dev.title || 'Devocional Diário'}\n*Versículo:* ${dev.verse_reference || ''}\n\n_Salvo com sucesso na plataforma!_`;
          } else {
            outMessage = `⚠️ Falha ao gerar devocional do dia ${d}: ${r.body?.message || 'Erro'}`;
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
          outMessage = `📖 *Temas Devocionais 365 (${y}):*\n\n${lines.join('\n')}`;
        }

      // ── PLANOS DA PLATAFORMA ──────────────────────────────────────────────
      } else if (fnName === 'manage_platform_plans') {
        if (args.action === 'list') {
          const r = await ck.call(this, 'GET', '/api/admin/plans');
          const plans = r.body?.data || [];
          const lines = plans.map(p => `• *${p.plan_name}* (\`${p.plan_code}\`): R$ ${Number(p.price).toFixed(2).replace('.', ',')} [ID: ${p.id}]`);
          outMessage = `💎 *Planos Conecta King:*\n\n${lines.join('\n')}`;
        } else if (args.action === 'update_price') {
          const r = await ck.call(this, 'PUT', `/api/subscription/plans/${args.plan_id}`, { price: args.price, monthly_price: args.price });
          if (r.statusCode >= 200 && r.statusCode < 300) {
            outMessage = `✅ *Preço do Plano Atualizado!*\n\nNovo valor: R$ ${Number(args.price).toFixed(2).replace('.', ',')}`;
          } else {
            outMessage = `⚠️ Erro ao atualizar plano: ${r.body?.message || 'Falha'}`;
          }
        }

      // ── GESTÃO FINANCEIRA ────────────────────────────────────────────────
      } else if (fnName === 'manage_finance') {
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
            const adjDesc = 'Ajuste de saldo (correção)';
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
          errorsMsg = '\n\n_Diagnóstico de páginas indisponível._';
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
          session.lastGeneratedCode = code;
          outMessage = `🎟️ *Código de Registro Gerado!*\n\n*Código:* \`${code}\`\n\n_Código memorizado! Se você me passar o e-mail e senha agora, vou cadastrar o cliente diretamente neste código._`;
        } else {
          outMessage = `⚠️ Falha ao criar código: ${JSON.stringify(r.body).slice(0, 200)}`;
        }
      }

    } else {
      outMessage = choice?.content || 'Olá King! Como posso ajudar na gestão da Conecta King hoje?';
    }

    session.history.push({ role: 'user', content: inputForAi });
    session.history.push({ role: 'assistant', content: outMessage });
    if (session.history.length > 24) session.history.splice(0, 2);
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
