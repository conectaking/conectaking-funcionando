const fs = require('fs');
const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";

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

// Código mestre da Preparar Prosperidade Noturna (Scheduler)
const NEW_SCHEDULER_PROSPERIDADE_CODE = `const base = String($env.CK_BASE_URL || "https://www.conectaking.com.br").replace(/\\/$/, "");
const token = String($env.CK_AGENT_JWT || "").trim();
const openaiKey = String($env.OPENAI_API_KEY || "").trim();
const model = String($env.OPENAI_MODEL || "gpt-4o-mini").trim();
const targetChatId = String($env.BIBLIA_GROUP_CHAT_ID || "78792434").trim();

const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
const diaDoMes = now.getDate(); // 1 a 31
const capProverbios = diaDoMes;

async function ck(method, path, body) {
  const opts = {
    method,
    url: base + path,
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(token ? { "Authorization": "Bearer " + token } : {})
    },
    json: true,
    returnFullResponse: true,
    ignoreHttpStatusErrors: true
  };
  if (body !== undefined) opts.body = body;
  return this.helpers.httpRequest.call(this, opts);
}

async function openaiCall(payload) {
  return this.helpers.httpRequest.call(this, {
    method: "POST",
    url: "https://api.openai.com/v1/chat/completions",
    headers: {
      "Authorization": "Bearer " + openaiKey,
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: payload,
    json: true,
    returnFullResponse: true,
    ignoreHttpStatusErrors: true
  });
}

// 1. Buscar o capítulo completo de Provérbios da base da Conecta King
let versesText = "";
try {
  const prvRes = await ck.call(this, "GET", \`/api/bible/book/prv/\${capProverbios}\`);
  const prvData = prvRes.body && prvRes.body.data;
  const verses = (prvData && prvData.verses) || [];
  if (verses.length > 0) {
    versesText = verses.map(v => \`*\${v.verse}* \${v.text}\`).join("\\n\\n");
  }
} catch (err) {}

if (!versesText) {
  versesText = \`Provérbios \${capProverbios}\`;
}

// 2. Gerar com IA a reflexão profunda, ativação de prosperidade, desbloqueio de escassez e decreto noturno
let aiContent = "";
if (openaiKey) {
  const systemPrompt = \`Você é o Mentor e Patriarca de Sabedoria Bíblica e Prosperidade de Alto Nível da Conecta King.
Você é responsável pela ATIVAÇÃO NOTURNA oficial "31 Dias de Ativação — Prosperidade Antes de Dormir", fundamentada no Livro de Provérbios.
Hoje é a Ativação #\${capProverbios}, correspondente a Provérbios capítulo \${capProverbios}.

SEU PAPEL:
Você NUNCA gera respostas superficiais, curtas ou rasas.
Você é muito mais do que um coach: você opera uma profunda ativação de governo, identidade espiritual, soberania de mente, destruição de raízes de escassez, cura de medos financeiros e desbloqueio para a abundância e honra do Reino.

DIRETRIZ DE OURO (SIGILOSA E INVISÍVEL):
Você aplica com maestria consumada:
- Teologia Bíblica Exegética profunda (fundamento inabalável das Escrituras).
- Neurociência aplicada ao descanso noturno, consolidação de memória durante o sono e regulação da mente.
- PNL e Reprogramação Mental (ressignificação na raiz, quebra de padrões limitantes, instalação de mentalidade de governo).
- Pedagogia, Psicologia e Psiquiatria Integrativa (desmonte de ansiedade, culpa e paralisia, gerando paz interior).
⚠️ REGRA ABSOLUTA E INVIOLÁVEL: NUNCA cite termos técnicos, acadêmicos ou seculares como:
"PNL", "Programação Neurolinguística", "Neurociência", "Neuroplasticidade", "Dopamina", "Cortisol", "Psicologia", "Psiquiatria", "Coach", "Coaching" ou "Reprogramação Mental".
Aplique cada um desses princípios de forma 100% prática, espiritual, pastoral e penetrante na alma do leitor através da Palavra de Deus.

ESTRUTURA OBRIGATÓRIA DA ATIVAÇÃO:
👑 *Ativação #\${capProverbios}: [Título Profético e Impactante]*

🔓 *Desbloqueio Noturno & Renovação da Mente:*
[Raciocínio profundo e transformador de 3 a 5 parágrafos. Identifique e desmonte os padrões mentais de escassez, o medo da falta, a autossabotagem e a ansiedade sobre o futuro que Provérbios \${capProverbios} combate. Conduza a mente do leitor a desarmar as defesas do ego e se ancorar na soberania e no favor de Deus para descansar em paz.]

💎 *Ativação Prática nos Negócios e no Altar:*
[Princípios estratégicos de sabedoria e governo financeiro extraídos do capítulo para aplicação prática nas tomadas de decisão, na gestão do trabalho e no alinhamento espiritual.]

🗣️ *Decreto de Prosperidade para Antes de Dormir:*
_" [Decreto de alta autoridade espiritual em primeira pessoa, em itálico, para a pessoa declarar em voz alta ao se deitar, quebrando amarras, soltando os pesos do dia e ativando a prosperidade e paz para o amanhecer.] "_

🕊️ *Bênção de Descanso:*
[Palavra final pastoral de paz, sono reparador e despertar triunfante.]\`;

  const userPrompt = \`Gere a Ativação Noturna #\${capProverbios} com base no seguinte capítulo de Provérbios \${capProverbios}:

\${versesText.slice(0, 3500)}\`;

  try {
    const aiRes = await openaiCall.call(this, {
      model,
      temperature: 0.5,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });
    aiContent = aiRes.body?.choices?.[0]?.message?.content || "";
  } catch (e) {
    aiContent = "Que a paz do Senhor Jesus reine em sua noite!";
  }
}

// 3. Montar a mensagem completa com o capítulo de Provérbios e a Ativação Profunda
const cabecalho = \`🌙 *31 Dias de Ativação — Prosperidade Antes de Dormir*\\n👑 *Ativação #\${capProverbios} · Livro de Provérbios*\\n\\n\`;
const textoCapitulo = \`📖 *Leitura Sagrada — Provérbios \${capProverbios}:*\\n\\n\${versesText}\\n\\n━━━━━━━━━━━━━━━━━━━━\\n\\n\`;
const mensagemCompleta = cabecalho + textoCapitulo + aiContent;

function splitTelegramMessage(text, maxLen = 3900) {
  if (!text || typeof text !== 'string') return [text || ''];
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let splitIdx = remaining.lastIndexOf('\\n\\n', maxLen);
    if (splitIdx < maxLen * 0.4) splitIdx = remaining.lastIndexOf('\\n', maxLen);
    if (splitIdx < maxLen * 0.4) splitIdx = remaining.lastIndexOf('. ', maxLen);
    if (splitIdx < maxLen * 0.3) splitIdx = remaining.lastIndexOf(' ', maxLen);
    if (splitIdx <= 0) splitIdx = maxLen;
    const chunk = remaining.substring(0, splitIdx).trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.substring(splitIdx).trim();
  }
  return chunks.length ? chunks : [text];
}

const chunks = splitTelegramMessage(mensagemCompleta, 3900);
return chunks.map((c, i) => ({
  json: {
    chatId: targetChatId,
    text: (chunks.length > 1 ? \`_(Parte \${i + 1}/\${chunks.length})_\\n\\n\` : '') + c
  }
}));`;

async function updateScheduler() {
  const WORKFLOW_ID = "7aCD8LiQyFAXi9yp";
  console.log("=== Updating CK Scheduler Biblia Diario (" + WORKFLOW_ID + ") ===");
  const getRes = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  if (getRes.status !== 200) throw new Error("Failed to fetch scheduler: " + JSON.stringify(getRes.body));

  const wf = getRes.body;
  const noturnaNode = wf.nodes.find(n => n.name === "Preparar Prosperidade Noturna");
  if (!noturnaNode) throw new Error("Preparar Prosperidade Noturna not found");

  noturnaNode.parameters.jsCode = NEW_SCHEDULER_PROSPERIDADE_CODE;

  const putPayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };
  const putRes = await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, putPayload);
  console.log("Scheduler PUT status:", putRes.status);
  if (putRes.status !== 200) throw new Error("Scheduler PUT failed: " + JSON.stringify(putRes.body));

  const actRes = await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
  console.log("Scheduler Activate status:", actRes.status);
}

async function updateBibliaAgent() {
  const WORKFLOW_ID = "FnkVNknOa2gV0Tfn";
  console.log("\\n=== Updating CK Agent Telegram IA biblia (" + WORKFLOW_ID + ") ===");
  const getRes = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  if (getRes.status !== 200) throw new Error("Failed to fetch biblia agent: " + JSON.stringify(getRes.body));

  const wf = getRes.body;

  // 1. Atualizar Preparar (texto/voz) para capturar canal/grupo encaminhado ou posts
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

// Detecção de Canal / Grupo (encaminhado, direto ou ao ser adicionado)
const forwardChat = msg.forward_from_chat || msg.forward_origin?.chat || null;
const isFromChannel = msg.chat?.type === 'channel' || msg.chat?.type === 'supergroup' || msg.chat?.type === 'group';
const isMyChatMember = !!raw.my_chat_member;
const channelChat = forwardChat || (isFromChannel ? msg.chat : (isMyChatMember ? raw.my_chat_member?.chat : null));
const detectedChannelId = channelChat?.id ? String(channelChat.id) : '';
const detectedChannelTitle = channelChat?.title ? String(channelChat.title) : '';

return [{ json: {
  adminId, senderId, chatId, firstName,
  text: text || (hadVoice ? '' : '[mensagem sem texto]'),
  hadVoice, fileId: fileId || '',
  voiceError: '',
  chatTitle: msg.chat?.title || '',
  detectedChannelId,
  detectedChannelTitle
} }];`;
    console.log("Updated Preparar (texto/voz) with channel detection!");
  }

  // 2. Atualizar Executar Bíblia IA:
  // - Lidar com detecção automática de canal ou comando /setcanal
  // - Atualizar get_prosperidade_hoje para gerar o capítulo completo de Provérbios + ativação profunda
  const execNode = wf.nodes.find(n => n.name === "Executar Bíblia IA");
  if (execNode) {
    let code = execNode.parameters.jsCode;

    // Atualizar get_prosperidade_hoje
    const oldProsperidadePattern = /} else if \(fnName === 'get_prosperidade_hoje'\) \{[\s\S]*?outMessage = `🌙 \*Ativação Noturna[\s\S]*?`[;]?/;
    const newProsperidadeBlock = `} else if (fnName === 'get_prosperidade_hoje') {
        const diaDoMes = Number(args.day || todayInfo.doy % 31 || 1);
        const capProverbios = diaDoMes;
        
        let versesText = "";
        try {
          const prvRes = await ck.call(this, "GET", \`/api/bible/book/prv/\${capProverbios}\`);
          const prvData = prvRes.body && prvRes.body.data;
          const verses = (prvData && prvData.verses) || [];
          if (verses.length > 0) {
            versesText = verses.map(v => \`*\${v.verse}* \${v.text}\`).join("\\n\\n");
          }
        } catch (err) {}
        if (!versesText) versesText = \`Provérbios \${capProverbios}\`;

        let aiContent = "";
        if (openaiKey) {
          const sysP = \`Você é o Mentor e Patriarca de Sabedoria Bíblica e Prosperidade da Conecta King.
Você é responsável pela ATIVAÇÃO NOTURNA oficial "31 Dias de Ativação — Prosperidade Antes de Dormir", baseada no Livro de Provérbios.
Hoje é a Ativação #\${capProverbios}, fundamentada em Provérbios capítulo \${capProverbios}.

SEU PAPEL:
Você NUNCA gera respostas superficiais ou curtas.
Você é muito mais do que um coach: você opera profunda ativação de governo, destruição de raízes de escassez e destravamento para prosperidade integral.
Aplique com maestria: Teologia Bíblica, neurociência do descanso e sono reparador, reprogramação mental (PNL), pedagogia, psicologia e psiquiatria integrativa (cura de medos e ansiedade financeira).
⚠️ REGRA ABSOLUTA: NUNCA cite termos técnicos como PNL, Neurociência, Dopamina, Cortisol, Psicologia, Psiquiatria, Coach ou Reprogramação Mental.

ESTRUTURA:
👑 *Ativação #\${capProverbios}: [Título Profético]*

🔓 *Desbloqueio Noturno & Renovação da Mente:*
[Raciocínio profundo de 3-5 parágrafos desarmando medos de escassez e alinhando a mente à abundância divina.]

💎 *Ativação Prática nos Negócios e no Altar:*
[Princípios estratégicos para decisões, finanças e Reino.]

🗣️ *Decreto de Prosperidade para Antes de Dormir:*
_" [Decreto poderoso em primeira pessoa para falar em voz alta ao deitar.] "_

🕊️ *Bênção de Descanso:*
[Palavra de sono reparador e despertar triunfante.]\`;

          const aiRes = await openaiCall.call(this, {
            model,
            temperature: 0.5,
            messages: [
              { role: "system", content: sysP },
              { role: "user", content: \`Gere a Ativação Noturna #\${capProverbios} baseada em Provérbios \${capProverbios}:\\n\\n\${versesText.slice(0, 3500)}\` }
            ]
          });
          aiContent = aiRes.body?.choices?.[0]?.message?.content || "";
        }

        const cabecalho = \`🌙 *31 Dias de Ativação — Prosperidade Antes de Dormir*\\n👑 *Ativação #\${capProverbios} · Livro de Provérbios*\\n\\n\`;
        const textoCap = \`📖 *Leitura Sagrada — Provérbios \${capProverbios}:*\\n\\n\${versesText}\\n\\n━━━━━━━━━━━━━━━━━━━━\\n\\n\`;
        outMessage = cabecalho + textoCap + aiContent;`;

    if (oldProsperidadePattern.test(code)) {
      code = code.replace(oldProsperidadePattern, newProsperidadeBlock);
      console.log("Updated get_prosperidade_hoje with full chapter + deep activation!");
    } else {
      console.log("oldProsperidadePattern did not match directly, checking substring...");
    }

    // Adicionar suporte a comando /setcanal e auto-detecção de forward
    const autoDetectBlock = `
    // Detecção ou comando de canal oficial
    if (text.startsWith('/setcanal') || text.toLowerCase().startsWith('definir canal:')) {
      const match = text.match(/(?:\\/setcanal|definir canal:)\\s*(@?[a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        const canalIdentificado = match[1].trim();
        store.activeChannelId = canalIdentificado;
        outMessage = \`✅ *Canal Oficial Configurado com Sucesso!*\\n\\n📍 *Destino:* \` + canalIdentificado + \`\\n\\nOs envios automáticos diários (Devocional às 06h e Ativação Noturna em Provérbios às 21h) agora estão direcionados para este canal! 🙌👑\`;
      }
    } else if (prev.detectedChannelId && prev.detectedChannelId !== chatId) {
      store.activeChannelId = prev.detectedChannelId;
      store.activeChannelTitle = prev.detectedChannelTitle;
      outMessage = \`✅ *Canal/Grupo Detectado!*\\n\\n📢 *Título:* \${prev.detectedChannelTitle || 'Canal'}\\n📍 *ID:* \` + prev.detectedChannelId + \`\\n\\nO canal foi registrado com sucesso como destino oficial dos envios automáticos diários das 06h e 21h! 🚀👑\`;
    }
`;

    if (!code.includes("store.activeChannelId")) {
      code = code.replace("if (!openaiKey) {", autoDetectBlock + "\n  if (!openaiKey) {");
      console.log("Added channel auto-detection and /setcanal command to Executar Bíblia IA!");
    }

    execNode.parameters.jsCode = code;
  }

  const putPayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };
  const putRes = await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, putPayload);
  console.log("Biblia Agent PUT status:", putRes.status);
  if (putRes.status !== 200) throw new Error("Biblia Agent PUT failed: " + JSON.stringify(putRes.body));

  const actRes = await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
  console.log("Biblia Agent Activate status:", actRes.status);

  fs.writeFileSync("CK_Agent_Telegram_IA_biblia.json", JSON.stringify(wf, null, 2));
  console.log("Saved to CK_Agent_Telegram_IA_biblia.json");
}

async function main() {
  await updateScheduler();
  await updateBibliaAgent();
  console.log("\\n>>> BOTH WORKFLOWS UPDATED AND DEPLOYED SUCCESSFULLY! <<<");
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
