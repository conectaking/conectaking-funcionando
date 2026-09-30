const fs = require('fs');
const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";
const WORKFLOW_ID = "FnkVNknOa2gV0Tfn";

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

async function run() {
  console.log("Fetching current workflow from n8n...");
  const getRes = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  if (getRes.status !== 200) {
    throw new Error("Failed to get workflow: " + JSON.stringify(getRes.body));
  }
  const wf = getRes.body;

  // 1. Atualizar Trigger para aceitar mensagens de canal e grupo também
  const triggerNode = wf.nodes.find(n => n.type.includes("telegramTrigger"));
  if (triggerNode) {
    triggerNode.parameters = {
      updates: ["message", "channel_post", "edited_message", "edited_channel_post", "my_chat_member"],
      additionalFields: {}
    };
  }

  // 2. Atualizar Preparar (texto/voz)
  const prepNode = wf.nodes.find(n => n.name.includes("Preparar"));
  if (prepNode) {
    prepNode.parameters.jsCode = `const raw = $input.first().json;
const msg = raw.message || raw.channel_post || raw.edited_message || raw.edited_channel_post || {};
const adminId = String($env.ADMIN_TELEGRAM_ID || '0');
const senderId = String(msg.from?.id || msg.sender_chat?.id || '');
const chatId = String(msg.chat?.id || raw.my_chat_member?.chat?.id || '');
const firstName = msg.from?.first_name || msg.chat?.title || 'Irmão(ã)';
const text = String(msg.text || msg.caption || '').trim();
const fileId = msg.voice?.file_id || msg.audio?.file_id || msg.video_note?.file_id || null;
const hadVoice = !text && !!fileId;
return [{ json: {
  adminId, senderId, chatId, firstName,
  text: text || (hadVoice ? '' : '[mensagem sem texto]'),
  hadVoice, fileId: fileId || '',
  voiceError: '',
  chatTitle: msg.chat?.title || ''
} }];`;
  }

  // 3. Atualizar Executar Bíblia IA
  const execNode = wf.nodes.find(n => n.name === "Executar Bíblia IA");
  if (execNode) {
    let code = execNode.parameters.jsCode;

    // Remover referência inválida de isComplainingAboutFormat
    code = code.replace(/\/\/ DIAGNÓSTICO:[\s\S]*?outMessage;?\s*\}/, '// Diagnóstico removido');
    code = code.replace(/if\s*\(\s*isComplainingAboutFormat[\s\S]*?\}/, '');

    // Corrigir SYSTEM_PROMPT para instruir NUNCA mencionar siglas técnicas
    const oldPromptSection = `1. MESTRE TEOLÓGICO, NEUROCIENTISTA & CONSELHEIRO DE ALTO NÍVEL:
   Você NUNCA gera respostas rasas, superficiais, curtas ou fracas.
   Você une com máxima autoridade e excelência a Teologia Bíblica Exegética profunda à Neurociência Comportamental (neuroplasticidade, regulação neuroquímica de cortisol, dopamina, GABA e serotonina), PNL e Reprogramação Mental (ressignificação de crenças limitantes e alinhamento à Mente de Cristo - Rm 12:2, 1 Co 2:16), Psicologia Clínica, Psiquiatria Integrativa e Desbloqueio Mental e Emocional (rompimento de travas de escassez, medo, culpa e procrastinação para a abundância e sabedoria divina).
   Seus devocionais e ensinamentos são ricos, transformadores e profundos.`;

    const newPromptSection = `1. MESTRE TEOLÓGICO & CONSELHEIRO DE ALTO NÍVEL:
   Você NUNCA gera respostas rasas, superficiais, curtas ou fracas.
   Você fundamenta seus devocionais e ensinamentos na Teologia Bíblica Exegética profunda, trazendo renovação da mente e alinhamento à Mente de Cristo (Romanos 12:2, 1 Coríntios 2:16), libertação de crenças de escassez e cura emocional sob a soberania divina.
   
   ⚠️ REGRA DE OURO (SIGILOSO / INVISÍVEL):
   NUNCA cite nomes de técnicas ou jargões como: "PNL", "Programação Neurolinguística", "Neurociência", "Neuroplasticidade", "Dopamina", "Cortisol", "Psicologia Clínica", "Psiquiatria Integrativa" ou "Reprogramação Mental" no texto da mensagem.
   Você aplica todos esses princípios de desbloqueio, ancoragem e ressignificação de forma 100% INVISÍVEL, prática e pastoral através das Escrituras Sagradas. O leitor experimenta a transformação na mente e no espírito sem deparar com termos técnicos de cursos ou teorias seculares.`;

    code = code.replace(oldPromptSection, newPromptSection);

    // Enriquecer get_devocional_do_dia para que sempre entregue completo e auto-gere com IA se estiver vazio
    const oldDevocionalBlock = `} else if (fnName === 'get_devocional_do_dia') {
        const query = args.date ? '?date=' + encodeURIComponent(args.date) : '';
        const r = await ck.call(this, 'GET', '/api/bible/devocional-do-dia' + query);
        const d = (r.body && r.body.data) || {};
        const titulo = d.titulo || d.title || 'Devocional Diário';
        const passagem = d.versiculo_ref || d.versiculo || d.passagem || d.reference || d.ref || 'Escrituras Sagradas';
        const vTexto = d.versiculo_texto ? '📜 *Versículo:* _"' + d.versiculo_texto + '"_\\n\\n' : '';
        const texto = d.reflexao || d.texto || d.content || d.meditacao || '';
        const oracao = d.oracao || d.prayer || '';
        const aplicacao = d.aplicacao || d.application || '';
        outMessage = \`✨ *Devocional do Dia:* \${titulo}\\n\\n📖 *Texto Base:* \${passagem}\\n\\n\${vTexto}\${texto}\\n\\n\${aplicacao ? '🎯 *Aplicação Prática & Reprogramação:*\\n' + aplicacao + '\\n\\n' : ''}\${oracao ? '🙏 *Oração Pastoral:*\\n_' + oracao + '_\\n\\n' : ''}Amém! Que Deus abençoe sua jornada.\`;`;

    const newDevocionalBlock = `} else if (fnName === 'get_devocional_do_dia') {
        const query = args.date ? '?date=' + encodeURIComponent(args.date) : '';
        const r = await ck.call(this, 'GET', '/api/bible/devocional-do-dia' + query);
        let d = (r.body && r.body.data) || {};
        const temTexto = !!(d.reflexao || d.texto || d.content);
        if (!temTexto) {
          // Se não houver devocional pronto, gera com IA no backend seguindo o tema do mês
          const genR = await ck.call(this, 'POST', \`/api/admin/bible/devotionals-365/day/\${todayInfo.doy}/generate-ai\`, {
            year: todayInfo.year,
            temaModo: 'mes_auto'
          });
          d = (genR.body && genR.body.data) || d;
        }
        const titulo = d.titulo || d.title || 'Palavra do Dia';
        const passagem = d.versiculo_ref || d.versiculo || d.passagem || d.reference || d.ref || 'Escrituras Sagradas';
        const vTexto = d.versiculo_texto ? \`"\${d.versiculo_texto}"\\n\\n\` : '';
        const texto = d.reflexao || d.texto || d.content || d.meditacao || '';
        const oracao = d.oracao || d.prayer || '';
        const aplicacao = d.aplicacao || d.application || '';
        outMessage = \`🌅 *Devocional do Dia:* \${titulo}\\n\\n📖 *Texto Base:* \${passagem}\\n\\n\${vTexto}\${texto}\\n\\n\${aplicacao ? '🎯 *Aplicação Prática:*\\n' + aplicacao + '\\n\\n' : ''}\${oracao ? '🙏 *Oração:*\\n_' + oracao + '_\\n\\n' : ''}Amém! Que Deus abençoe sua jornada. 🙌\`;`;

    if (code.includes("} else if (fnName === 'get_devocional_do_dia') {")) {
      code = code.replace(oldDevocionalBlock, newDevocionalBlock);
    }

    execNode.parameters.jsCode = code;
  }

  console.log("Saving updated workflow to n8n...");
  const putPayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };

  const putRes = await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, putPayload);
  console.log("PUT status:", putRes.status);
  if (putRes.status !== 200) {
    console.error("PUT error:", JSON.stringify(putRes.body));
    return;
  }

  console.log("Activating workflow...");
  const actRes = await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
  console.log("Activate status:", actRes.status);
  console.log("BIBLE AGENT WORKFLOW UPDATED AND ACTIVATED SUCCESSFULLY!");
}

run().catch(console.error);
