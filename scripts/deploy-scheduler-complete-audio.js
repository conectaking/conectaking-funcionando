const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA';
const SCHEDULER_ID = '7aCD8LiQyFAXi9yp';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'n8n.conectaking.com.br',
      port: 443,
      path: path,
      method: method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };
    const r = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function main() {
  console.log('1. Buscando workflow ' + SCHEDULER_ID + '...');
  const getRes = await req('GET', `/api/v1/workflows/${SCHEDULER_ID}`);
  const wf = getRes.body;

  // Atualizar nó Preparar Devocional Matinal para limpar bloco de fetch antigo e passar textoAudio
  const matinalNode = wf.nodes.find(n => n.name === 'Preparar Devocional Matinal');
  matinalNode.parameters.jsCode = `const base = String($env.CK_BASE_URL || "https://www.conectaking.com.br").replace(/\\/$/, "");
const token = String($env.CK_AGENT_JWT || "").trim();
const targetChatId = String($env.BIBLIA_GROUP_CHAT_ID || "@devocionalking").trim();

const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
const start = new Date(now.getFullYear(), 0, 0);
const diff = now - start + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
const doy = Math.min(365, Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24))));
const month = now.getMonth() + 1;
const year = now.getFullYear();
const iso = now.toISOString().slice(0, 10);

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

const temaRes = await ck.call(this, "GET", \`/api/admin/bible/devotionals-365/month-themes/\${year}\`);
const themes = (temaRes.body && (temaRes.body.data?.themes || temaRes.body.themes)) || {};
const temaDoMes = themes[String(month)] || "Passando pelo Deserto";

const devRes = await ck.call(this, "GET", \`/api/bible/devocional-do-dia?date=\${iso}\`);
const d = (devRes.body && devRes.body.data) || {};
const temConteudo = !!(d.reflexao || d.texto || d.content);

let texto = "";
let tituloDevocional = "";
if (temConteudo) {
  tituloDevocional = d.titulo || d.title || "Palavra do Dia";
  const passagem = d.versiculo_ref || d.versiculo || d.passagem || d.ref || "Escrituras Sagradas";
  const vTexto = d.versiculo_texto ? \`"\${d.versiculo_texto}"\\n\\n\` : "";
  const corpo = d.reflexao || d.texto || d.content || "";
  const oracao = d.oracao || d.prayer || "";
  texto = \`🌅 *Devocional do Dia:* \${tituloDevocional}\\n\\n📖 *Texto Base:* \${passagem}\\n\\n\${vTexto}\${corpo}\\n\\n\${oracao ? \`🙏 *Oração:*\\n_\${oracao}_\\n\\n\` : ""}Amém! Que Deus abençoe sua jornada. 🙌\`;
} else {
  const genRes = await ck.call(this, "POST", \`/api/admin/bible/devotionals-365/day/\${doy}/generate-ai\`, {
    year,
    temaPersonalizado: temaDoMes,
    temaModo: "mes_auto"
  });
  const gd = (genRes.body && genRes.body.data) || {};
  tituloDevocional = gd.titulo || "Palavra do Dia";
  texto = \`🌅 *Devocional do Dia:* \${tituloDevocional}\\n\\n📖 *Texto Base:* \${gd.versiculo_ref || gd.passagem || "Escrituras Sagradas"}\\n\\n\${gd.versiculo_texto ? \`"\${gd.versiculo_texto}"\\n\\n\` : ""}\${gd.reflexao || gd.texto || ""}\\n\\n\${gd.oracao ? \`🙏 *Oração:*\\n_\${gd.oracao}_\\n\\n\` : ""}Amém! Que Deus abençoe sua jornada. 🙌\`;
}

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

const chunks = splitTelegramMessage(texto, 3900);
return chunks.map((c, i) => ({
  json: {
    chatId: targetChatId,
    text: (chunks.length > 1 ? \`_(Parte \${i + 1}/\${chunks.length})_\\n\\n\` : '') + c,
    fullTextForAudio: texto,
    audioTitle: tituloDevocional,
    dateIso: iso,
    isFirstChunk: i === 0
  }
}));`;

  // Atualizar nó Preparar Prosperidade Noturna
  const noturnaNode = wf.nodes.find(n => n.name === 'Preparar Prosperidade Noturna');
  noturnaNode.parameters.jsCode = `const base = String($env.CK_BASE_URL || "https://www.conectaking.com.br").replace(/\\/$/, "");
const token = String($env.CK_AGENT_JWT || "").trim();
const openaiKey = String($env.OPENAI_API_KEY || "").trim();
const model = String($env.OPENAI_MODEL || "gpt-4o-mini").trim();
const targetChatId = String($env.BIBLIA_GROUP_CHAT_ID || "@devocionalking").trim();

const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
const diaDoMes = now.getDate();
const capProverbios = diaDoMes;
const iso = now.toISOString().slice(0, 10);

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
  const systemPrompt = \`Você é o Mentor e Patriarca de Sabedoria Bíblica e Prosperidade de Alto Nível da Conecta King.
Você é responsável pela ATIVAÇÃO NOTURNA oficial "31 Dias de Ativação — Prosperidade Antes de Dormir", fundamentada no Livro de Provérbios.
Hoje é a Ativação #\${capProverbios}, correspondente a Provérbios capítulo \${capProverbios}.

ESTRUTURA OBRIGATÓRIA DA ATIVAÇÃO:
👑 *Ativação #\${capProverbios}: [Título Profético e Impactante]*

🔓 *Desbloqueio Noturno & Renovação da Mente:*
[Raciocínio profundo e transformador de 3 a 5 parágrafos. Identifique e desmonte os padrões mentais de escassez e o medo da falta. Conduza a mente a se ancorar no favor de Deus para descansar em paz.]

💎 *Ativação Prática nos Negócios e no Altar:*
[Princípios estratégicos de sabedoria e governo financeiro extraídos do capítulo.]

🗣️ *Decreto de Prosperidade para Antes de Dormir:*
_" [Decreto de alta autoridade espiritual em primeira pessoa, em itálico, para a pessoa declarar em voz alta ao se deitar.] "_

🕊️ *Bênção de Descanso:*
[Palavra final pastoral de paz, sono reparador e despertar triunfante.]\`;

  const userPrompt = \`Gere a Ativação Noturna #\${capProverbios} com base no seguinte capítulo de Provérbios \${capProverbios}:\\n\\n\${versesText.slice(0, 3500)}\`;

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
    text: (chunks.length > 1 ? \`_(Parte \${i + 1}/\${chunks.length})_\\n\\n\` : '') + c,
    fullTextForAudio: aiContent || mensagemCompleta,
    audioTitle: \`Ativação #\${capProverbios} · Provérbios \${capProverbios}\`,
    dateIso: iso,
    isFirstChunk: i === 0
  }
}));`;

  console.log('2. Atualizando workflow no n8n...');
  const putRes = await req('PUT', `/api/v1/workflows/${SCHEDULER_ID}`, {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  });

  if (putRes.status >= 200 && putRes.status < 300) {
    await req('POST', `/api/v1/workflows/${SCHEDULER_ID}/activate`);
    console.log('✓ Workflow do Scheduler atualizado e ativo!');
  } else {
    console.error('Erro ao atualizar Scheduler:', putRes);
  }
}

main().catch(console.error);
