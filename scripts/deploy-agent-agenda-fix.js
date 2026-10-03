const fs = require('fs');
const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";
const WORKFLOW_ID = "mkK244lveO0N1qPR"; // CK Agent Telegram IA Boot

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "n8n.conectaking.com.br",
      port: 443,
      path: path,
      method: method,
      headers: {
        "X-N8N-API-KEY": API_KEY,
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {})
      }
    };
    const r = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function main() {
  console.log("1. Buscando workflow atual do n8n...");
  const getRes = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  if (getRes.status !== 200) {
    throw new Error("Failed to get workflow: " + JSON.stringify(getRes.body));
  }
  const wf = getRes.body;
  fs.writeFileSync("backup_wf_boot_before_agenda_fix.json", JSON.stringify(wf, null, 2));
  console.log("   Backup salvo em backup_wf_boot_before_agenda_fix.json");

  // 1. Atualizar Executar Admin
  const execNode = wf.nodes.find(n => n.name === 'Executar Admin');
  if (!execNode) throw new Error("Nó 'Executar Admin' não encontrado!");

  let code = execNode.parameters.jsCode;

  // Injetar helpers de data e google calendar se ausentes
  const helperCode = `
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
  const dates = \`\${dClean}T\${hInicioClean}/\${dClean}T\${hFimClean}\`;
  const p = [];
  p.push('action=TEMPLATE');
  p.push('text=' + encodeURIComponent(titulo || 'Compromisso - Adriano King'));
  p.push('dates=' + dates);
  p.push('details=' + encodeURIComponent((descricao ? descricao + '\\n\\n' : '') + 'Agendado pelo Agente King'));
  if (local) p.push('location=' + encodeURIComponent(local));
  p.push('ctz=America/Sao_Paulo');
  return 'https://calendar.google.com/calendar/render?' + p.join('&');
}

// Data e hora em fuso Brasília (America/Sao_Paulo)
const nowSp = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
const diaSemanaNomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const diaSemanaAtual = diaSemanaNomes[nowSp.getDay()];
const dataHojeISO = nowSp.toISOString().slice(0, 10);
const horaAtualSp = String(nowSp.getHours()).padStart(2, '0') + ':' + String(nowSp.getMinutes()).padStart(2, '0');
const dataHojeBr = String(nowSp.getDate()).padStart(2, '0') + '/' + String(nowSp.getMonth() + 1).padStart(2, '0') + '/' + nowSp.getFullYear();

let needGoogleCalendar = false;
let calendarStart = '';
let calendarEnd = '';
let calendarSummary = '';
let calendarDescription = '';
let calendarLocation = '';
`;

  if (!code.includes('makeGoogleCalendarUrl')) {
    code = code.replace("let outMessage = '';", helperCode + "\nlet outMessage = '';");
  }

  // Atualizar SYSTEM_PROMPT para incluir regras de Agenda e Google Calendar
  const agendaPromptInstructions = `
═══ REGRAS SUPREMAS DE AGENDA, COMPROMISSOS & LEMBRETES (GOOGLE AGENDA + TELEGRAM) ═══
- Data e hora atual de Brasília: \${diaSemanaAtual}, \${dataHojeBr} (\${dataHojeISO}) às \${horaAtualSp}. Fuso: America/Sao_Paulo.
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
  * "hoje" -> "\${dataHojeISO}"
  * "amanhã" -> data do dia seguinte
  * Horários: formato 24h HH:MM (ex: "às 20 horas" -> "20:00", "às 8 da noite" -> "20:00", "às 14h" -> "14:00").
  * Se o Adriano pedir para lembrar no começo do dia, meio do dia e meia hora antes: defina lembrar_comeco_dia: true, lembrar_meio_dia: true, lembrar_30m: true.
`;

  if (!code.includes('REGRAS SUPREMAS DE AGENDA')) {
    code = code.replace("═══ PODER ADMINISTRATIVO TOTAL CONECTA KING", agendaPromptInstructions + "\n═══ PODER ADMINISTRATIVO TOTAL CONECTA KING");
  }

  // Adicionar a ferramenta manage_agenda na lista TOOLS
  const manageAgendaToolDef = `  {
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
  },`;

  if (!code.includes("name: 'manage_agenda'")) {
    code = code.replace("const tools = [", "const tools = [\n" + manageAgendaToolDef);
    code = code.replace("const TOOLS = [", "const TOOLS = [\n" + manageAgendaToolDef);
  }

  // Adicionar o handler de execução de manage_agenda
  const manageAgendaHandler = `
      // ═══════════════════════════════════════════════════════════════════
      // ── GERENCIAR AGENDA & LEMBRETES (GOOGLE AGENDA + TELEGRAM) ────────
      // ═══════════════════════════════════════════════════════════════════
      if (fnName === 'manage_agenda') {
        const profileId = (await resolveProfileId.call(this)) || 1;
        const kRes = await ck.call(this, 'GET', \`/api/finance/king-data?profile_id=\${profileId}\`);
        let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
        if (!kingDb || typeof kingDb !== 'object') kingDb = {};
        if (!Array.isArray(kingDb.lembretes)) kingDb.lembretes = [];

        // ── CRIAR COMPROMISSO OU LEMBRETE ───────────────────────────
        if (args.action === 'create_event' || args.action === 'create_reminder') {
          const isLembrete = args.action === 'create_reminder' || args.tipo === 'lembrete';
          const titulo = String(args.titulo || (isLembrete ? 'Lembrete' : 'Compromisso')).trim();
          let data = String(args.data || '').trim();
          
          if (!data || !/^\\d{4}-\\d{2}-\\d{2}$/.test(data)) {
            const brMatch = data.match(/^(\\d{1,2})[\\/\\-](\\d{1,2})(?:[\\/\\-](\\d{4}))?$/);
            if (brMatch) {
              const d = brMatch[1].padStart(2, '0');
              const m = brMatch[2].padStart(2, '0');
              const y = brMatch[3] || '2026';
              data = \`\${y}-\${m}-\${d}\`;
            } else {
              data = dataHojeISO;
            }
          }

          let horaInicio = String(args.hora_inicio || '09:00').trim();
          if (horaInicio.length === 4 && horaInicio.indexOf(':') === 1) horaInicio = '0' + horaInicio;
          if (/^\\d{1,2}$/.test(horaInicio)) horaInicio = horaInicio.padStart(2, '0') + ':00';
          if (!/^\\d{2}:\\d{2}$/.test(horaInicio)) horaInicio = '09:00';

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
          calendarStart = \`\${data}T\${horaInicio}:00-03:00\`;
          calendarEnd = \`\${data}T\${horaFim}:00-03:00\`;
          calendarSummary = titulo;
          calendarDescription = (descricao ? descricao + '\\n\\n' : '') + 'Agendado pelo Agente King';
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

          await ck.call(this, 'PUT', \`/api/finance/king-data?profile_id=\${profileId}\`, {
            profile_id: profileId,
            data: kingDb
          });

          const pData = data.split('-');
          const dObj = new Date(Number(pData[0]), Number(pData[1]) - 1, Number(pData[2]));
          const diaSemanaFormat = diaSemanaNomes[dObj.getDay()] || 'Data';
          const dataFormatada = \`\${pData[2]}/\${pData[1]}/\${pData[0]} (\${diaSemanaFormat})\`;

          const icone = isLembrete ? '⏰' : (args.tipo === 'ensaio' ? '📸' : (isMentoria ? '🎓' : '📅'));
          const header = isLembrete ? 'Novo Lembrete Registrado!' : 'Compromisso Agendado com Sucesso!';

          stepMsg = \`\${icone} *\${header} — Agente King*\\n\\n\` +
            \`📌 *\${isLembrete ? 'Lembrete' : (isMentoria ? 'Mentoria' : 'Compromisso')}:* \${titulo}\\n\` +
            \`🗓️ *Data:* \${dataFormatada}\\n\` +
            \`⏰ *Horário:* \${horaInicio}\${horaFim ? ' às ' + horaFim : ''}\\n\` +
            (local ? \`📍 *Local:* \${local}\\n\` : '') +
            (descricao ? \`📝 *Observações:* \${descricao}\\n\` : '') +
            \`\\n📲 [Toque aqui para Adicionar ao seu Google Agenda](\${gCalUrl})\\n\` +
            \`_(Ao tocar, abre no app Google Agenda do seu celular com alarme e notificação prontos!)\\n\\n\` +
            \`🔔 *Lembretes Ativos Configurados:*\\n\` +
            \`• ☀️ *Começo do dia:* Aviso às 08h–09h da manhã no Telegram\\n\` +
            \`• 🌤️ *Meio do dia:* Aviso às 12h–13h no Telegram\\n\` +
            \`• ⏰ *30 minutos antes:* Alarme no Google Agenda e aviso no Telegram\\n\` +
            \`• ⚡ *15 minutos antes e na hora exata:* Alarme e aviso no Telegram\`;

        // ── LISTAR AGENDA & LEMBRETES ────────────────────────────────
        } else if (args.action === 'list_agenda') {
          const ativos = (kingDb.lembretes || []).filter(l => l && l.status !== 'cancelado');
          if (ativos.length === 0) {
            stepMsg = \`📅 *Agenda & Lembretes — Agente King*\\n\\nNenhum compromisso ou lembrete pendente no momento.\\n\\nSe quiser agendar algo, é só me pedir por áudio ou texto!\`;
          } else {
            ativos.sort((a, b) => ((a.data || '') + (a.hora_inicio || '')).localeCompare((b.data || '') + (b.hora_inicio || '')));
            const lines = ativos.slice(0, 10).map((l, i) => {
              const ico = l.tipo === 'lembrete' ? '⏰' : (l.tipo === 'ensaio' ? '📸' : (l.tipo === 'mentoria' ? '🎓' : '📅'));
              const pData = (l.data || '').split('-');
              const dFmt = pData.length === 3 ? \`\${pData[2]}/\${pData[1]}/\${pData[0]}\` : l.data;
              return \`\${i + 1}. \${ico} *\${l.titulo}*\\n   🗓️ \${dFmt} às \${l.hora_inicio || '00:00'}\${l.hora_fim ? ' - ' + l.hora_fim : ''}\${l.local ? ' | 📍 ' + l.local : ''}\\n   📲 [Google Agenda](\${l.google_calendar_url || makeGoogleCalendarUrl(l.titulo, l.data, l.hora_inicio, l.hora_fim, l.descricao, l.local)})\`;
            });
            stepMsg = \`📅 *Sua Agenda & Lembretes — Agente King:*\\n\\n\${lines.join('\\n\\n')}\`;
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
            await ck.call(this, 'PUT', \`/api/finance/king-data?profile_id=\${profileId}\`, {
              profile_id: profileId,
              data: kingDb
            });
            stepMsg = \`🗑️ *Item Removido da Agenda!*\\nRemovi o compromisso: *\${removed.titulo}*.\`;
          } else {
            stepMsg = \`⚠️ Não encontrei o compromisso/lembrete informado para cancelar.\`;
          }

        // ── ALTERAR COMPROMISSO / LEMBRETE ──────────────────────────
        } else if (args.action === 'update_agenda') {
          const search = String(args.titulo || '').toLowerCase();
          let item = (kingDb.lembretes || []).find(l => l && l.status !== 'cancelado' && (search ? String(l.titulo || '').toLowerCase().includes(search) : true));
          if (!item) {
            stepMsg = \`⚠️ Não encontrei o compromisso "\${args.titulo}" para alterar.\`;
          } else {
            if (args.novo_titulo) item.titulo = String(args.novo_titulo).trim();
            if (args.nova_data) item.data = String(args.nova_data).trim();
            if (args.nova_hora_inicio) item.hora_inicio = String(args.nova_hora_inicio).trim();
            if (args.nova_hora_fim) item.hora_fim = String(args.nova_hora_fim).trim();
            if (args.novo_local) item.local = String(args.novo_local).trim();
            item.google_calendar_url = makeGoogleCalendarUrl(item.titulo, item.data, item.hora_inicio, item.hora_fim, item.descricao, item.local);

            needGoogleCalendar = true;
            calendarStart = \`\${item.data}T\${item.hora_inicio}:00-03:00\`;
            calendarEnd = \`\${item.data}T\${item.hora_fim || item.hora_inicio}:00-03:00\`;
            calendarSummary = item.titulo;
            calendarDescription = (item.descricao ? item.descricao + '\\n\\n' : '') + 'Agendado pelo Agente King';
            calendarLocation = item.local || 'Online / Google Meet';

            await ck.call(this, 'PUT', \`/api/finance/king-data?profile_id=\${profileId}\`, {
              profile_id: profileId,
              data: kingDb
            });
            stepMsg = \`✏️ *Compromisso Atualizado com Sucesso! — Agente King*\\n\\n\` +
              \`📌 *Compromisso:* \${item.titulo}\\n\` +
              \`🗓️ *Nova Data:* \${item.data}\\n\` +
              \`⏰ *Novo Horário:* \${item.hora_inicio}\${item.hora_fim ? ' às ' + item.hora_fim : ''}\\n\` +
              (item.local ? \`📍 *Local:* \${item.local}\\n\` : '') +
              \`\\n📲 [Atualizado no Google Agenda](\${item.google_calendar_url})\`;
          }

        // ── LIMPAR TUDO ─────────────────────────────────────────────
        } else if (args.action === 'clear_all_agenda') {
          kingDb.lembretes = [];
          await ck.call(this, 'PUT', \`/api/finance/king-data?profile_id=\${profileId}\`, {
            profile_id: profileId,
            data: kingDb
          });
          stepMsg = \`🧹 *Agenda e Lembretes Zerados!*\\nTodos os compromissos e lembretes foram removidos.\`;
        }
      } else `;

  if (!code.includes("fnName === 'manage_agenda'")) {
    code = code.replace("if (fnName === 'list_clients')", manageAgendaHandler + "if (fnName === 'list_clients')");
  }

  // Atualizar return final para exportar needGoogleCalendar e variáveis do calendário
  const oldReturn = "return [{ json: { ...prev, outMessage } }];";
  const newReturn = "return [{ json: { ...prev, outMessage, needGoogleCalendar, calendarStart, calendarEnd, calendarSummary, calendarDescription, calendarLocation } }];";
  if (code.includes(oldReturn)) {
    code = code.replace(oldReturn, newReturn);
  }

  execNode.parameters.jsCode = code;
  console.log("   Executar Admin atualizado com sucesso!");

  // 2. Atualizar Checar Lembretes Admin com suporte a lembretes de manhã e meio-dia
  const checkNode = wf.nodes.find(n => n.name === 'Checar Lembretes Admin');
  if (checkNode) {
    checkNode.parameters.jsCode = `const base = String($env.CK_INTERNAL_URL || $env.CK_BASE_URL || 'http://conectaking-laravel:8080').replace(/\\/$/, '');
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
const curHours = spNow.getHours();
const curMinutes = curHours * 60 + spNow.getMinutes();

const dueList = [];
let hasChanges = false;

for (const lem of lembretes) {
  if (!lem || lem.status === 'cancelado') continue;

  if (lem.data > today) continue;

  const [h, m] = String(lem.hora_inicio || '00:00').split(':').map(Number);
  const eventMinutes = (h || 0) * 60 + (m || 0);

  // Se o dia já passou e não foi notificado na hora
  if (lem.data < today) {
    if (!lem.notificado) {
      dueList.push({
        lem,
        tipo: 'atrasado',
        msg: \`⏰ *LEMBRETE DO AGENTE KING*\\n\\n👑 *Adriano, passando para te lembrar do compromisso registrado:*\\n\\n📌 *\${lem.titulo}*\\n📅 *Data:* \${lem.data}\\n🕒 *Horário:* \${lem.hora_inicio || 'Horário marcado'}\\n\${lem.local ? '📍 *Local:* ' + lem.local + '\\n' : ''}\${lem.descricao ? '📝 *Notas:* ' + lem.descricao + '\\n' : ''}\${lem.google_calendar_url ? '📲 [Abrir no Google Agenda](' + lem.google_calendar_url + ')\\n' : ''}\`
      });
      lem.notificado = true;
      hasChanges = true;
    }
    continue;
  }

  // É HOJE:
  const diff = eventMinutes - curMinutes; // minutos até o evento começar

  // 1. Alerta de Começo do Dia (entre 08h e 11h da manhã)
  if (curHours >= 8 && curHours < 12 && !lem.notificado_comeco_dia && (lem.lembrar_comeco_dia !== false) && (diff > 40)) {
    dueList.push({
      lem,
      tipo: 'comeco_dia',
      msg: \`☀️ *BOM DIA, ADRIANO! — AGENDA DE HOJE*\\n\\n👑 *Passando no começo do dia para te lembrar do seu compromisso marcado para hoje:*\\n\\n📌 *\${lem.titulo}*\\n🕒 *Horário:* \${lem.hora_inicio}\${lem.hora_fim ? ' às ' + lem.hora_fim : ''}\\n\${lem.local ? '📍 *Local:* ' + lem.local + '\\n' : ''}\${lem.descricao ? '📝 *Notas:* ' + lem.descricao + '\\n' : ''}\${lem.google_calendar_url ? '📲 [Abrir no Google Agenda](' + lem.google_calendar_url + ')\\n' : ''}\\n🔔 _Vou te avisar novamente no meio do dia e 30 minutos antes!_\`
    });
    lem.notificado_comeco_dia = true;
    hasChanges = true;
  }

  // 2. Alerta do Meio do Dia (entre 12h e 14h)
  if (curHours >= 12 && curHours < 15 && !lem.notificado_meio_dia && (lem.lembrar_meio_dia !== false) && (diff > 40)) {
    dueList.push({
      lem,
      tipo: 'meio_dia',
      msg: \`🌤️ *LEMBRETE DO MEIO-DIA — AGENTE KING*\\n\\n👑 *Passando no meio do dia para te lembrar do seu compromisso de logo mais:*\\n\\n📌 *\${lem.titulo}*\\n🕒 *Horário:* \${lem.hora_inicio}\${lem.hora_fim ? ' às ' + lem.hora_fim : ''}\\n\${lem.local ? '📍 *Local:* ' + lem.local + '\\n' : ''}\${lem.descricao ? '📝 *Notas:* ' + lem.descricao + '\\n' : ''}\${lem.google_calendar_url ? '📲 [Abrir no Google Agenda](' + lem.google_calendar_url + ')\\n' : ''}\\n🔔 _Fique atento! Vou te avisar novamente 30 minutos antes e na hora exata._\`
    });
    lem.notificado_meio_dia = true;
    hasChanges = true;
  }

  // 3. Alerta de 30 minutos antes (entre 16 e 35 min antes)
  if (diff <= 35 && diff > 15 && !lem.notificado_30m && !lem.notificado) {
    dueList.push({
      lem,
      tipo: '30m',
      msg: \`⏰ *AVISO PRÉVIO — 30 MINUTOS!*\\n\\n👑 *Adriano, faltam aproximadamente 30 minutos para o seu compromisso!*\\n\\n📌 *\${lem.titulo}*\\n🕒 *Horário:* \${lem.hora_inicio}\\n\${lem.local ? '📍 *Local:* ' + lem.local + '\\n' : ''}\${lem.descricao ? '📝 *Notas:* ' + lem.descricao + '\\n' : ''}\\n🔔 _Fique atento! Vou te avisar novamente 15 minutos antes e na hora exata._\`
    });
    lem.notificado_30m = true;
    hasChanges = true;
  }

  // 4. Alerta de 15 minutos antes (entre 1 e 15 min antes)
  if (diff <= 15 && diff > 0 && !lem.notificado_15m && !lem.notificado) {
    dueList.push({
      lem,
      tipo: '15m',
      msg: \`⏰ *AVISO PRÉVIO — 15 MINUTOS!*\\n\\n👑 *Atenção Adriano, faltam apenas 15 minutos!*\\n\\n📌 *\${lem.titulo}*\\n🕒 *Horário:* \${lem.hora_inicio}\\n\${lem.local ? '📍 *Local:* ' + lem.local + '\\n' : ''}\${lem.descricao ? '📝 *Notas:* ' + lem.descricao + '\\n' : ''}\\n⚡ _Está quase na hora!_\`
    });
    lem.notificado_15m = true;
    hasChanges = true;
  }

  // 5. Alerta na hora exata ou minutos depois (diff <= 0)
  if (diff <= 0 && !lem.notificado) {
    dueList.push({
      lem,
      tipo: 'hora',
      msg: \`⏰ *É AGORA! — LEMBRETE DO AGENTE KING*\\n\\n👑 *Adriano, seu compromisso começou:*\\n\\n📌 *\${lem.titulo}*\\n🕒 *Horário:* \${lem.hora_inicio}\\n\${lem.local ? '📍 *Local:* ' + lem.local + '\\n' : ''}\${lem.descricao ? '📝 *Notas:* ' + lem.descricao + '\\n' : ''}\${lem.google_calendar_url ? '📲 [Abrir no Google Agenda](' + lem.google_calendar_url + ')\\n' : ''}\\n✅ _Compromisso ativo._\`
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
}));`;
    console.log("   Checar Lembretes Admin atualizado com suporte a início do dia e meio do dia!");
  }

  console.log("2. Enviando workflow atualizado para o n8n...");
  const putPayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };

  const putRes = await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, putPayload);
  console.log("   PUT status:", putRes.status);
  if (putRes.status !== 200) {
    console.error("PUT error:", JSON.stringify(putRes.body));
    return;
  }

  console.log("3. Reativando workflow...");
  const actRes = await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
  console.log("   Activate status:", actRes.status);

  console.log("\n✅ WORKFLOW DO AGENTE KING ATUALIZADO E ATIVADO COM SUCESSO!");
}

main().catch(console.error);
