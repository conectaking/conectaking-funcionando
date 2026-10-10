const https = require('https');
const fs = require('fs');

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

// 1. Código de Preparar Prosperidade Noturna com versículos limpos para áudio
const codePrepararProsperidade = `const base = String($env.CK_BASE_URL || "https://www.conectaking.com.br").replace(/\\/$/, "");
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

// 1. Buscar o capítulo completo de Provérbios da base da Conecta King
let versesText = "";
let versesAudioText = "";
try {
  const prvRes = await ck.call(this, "GET", \`/api/bible/book/prv/\${capProverbios}\`);
  const prvData = prvRes.body && prvRes.body.data;
  const verses = (prvData && prvData.verses) || [];
  if (verses.length > 0) {
    versesText = verses.map(v => \`*\${v.verse}* \${v.text}\`).join("\\n\\n");
    // Para áudio: texto fluído dos versículos sem recitar os números 1, 2, 3...
    versesAudioText = verses.map(v => String(v.text || "").trim()).filter(Boolean).join("\\n\\n");
  }
} catch (err) {}

if (!versesText) versesText = \`Provérbios \${capProverbios}\`;
if (!versesAudioText) versesAudioText = \`Provérbios capítulo \${capProverbios}\`;

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

// 3. Montar a mensagem escrita para o Telegram (com versículos numerados para leitura na tela)
const cabecalho = \`🌙 *31 Dias de Ativação — Prosperidade Antes de Dormir*\\n👑 *Ativação #\${capProverbios} · Livro de Provérbios*\\n\\n\`;
const textoCapitulo = \`📖 *Leitura Sagrada — Provérbios \${capProverbios}:*\\n\\n\${versesText}\\n\\n━━━━━━━━━━━━━━━━━━━━\\n\\n\`;
const mensagemCompleta = cabecalho + textoCapitulo + aiContent;

// 4. Montar o texto específico para Áudio Narração (sem numeração repetitiva de versículos)
const cabecalhoAudio = \`31 Dias de Ativação — Prosperidade Antes de Dormir.\\nAtivação número \${capProverbios}, Livro de Provérbios.\\n\\n\`;
const textoCapituloAudio = \`Leitura Sagrada: Livro de Provérbios, capítulo \${capProverbios}.\\n\\n\${versesAudioText}\\n\\n\`;
const audioFullText = cabecalhoAudio + textoCapituloAudio + aiContent;

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
    fullTextForAudio: audioFullText,
    audioTitle: \`Ativação #\${capProverbios} · Provérbios \${capProverbios}\`,
    dateIso: iso,
    isFirstChunk: i === 0
  }
}));`;

// 2. Código do Gerar Áudio Prosperidade com filtro inteligente de versículos
const codeGerarAudioProsperidade = `const openaiKey = String($env.OPENAI_API_KEY || "").trim();
const firstItem = $('Preparar Prosperidade Noturna').first().json || {};
const rawText = String(firstItem.fullTextForAudio || firstItem.text || "");
const title = String(firstItem.audioTitle || "Ativação Noturna de Prosperidade");
const dateIso = String(firstItem.dateIso || "");
const targetChatId = String(firstItem.chatId || "@devocionalking");

if (!openaiKey || !rawText) {
  return [];
}

function prepareTextForAudio(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text
    .replace(/━+/g, '')
    .replace(/Ativação\\s*#\\s*(\\d+)/gi, 'Ativação número $1')
    .replace(/(?:📖\\s*)?Leitura Sagrada\\s*[—–\\-:]*\\s*Provérbios\\s*(\\d+)\\s*:?/gi, 'Leitura Sagrada: Livro de Provérbios, capítulo $1.\\n')
    .replace(/(?:^|\\n)\\s*\\*(\\d+)\\*\\s*/g, '\\n')
    .replace(/[*_#\`~]/g, '')
    .replace(/[🌙👑📖🔓💎🗣️🕊️🌅🙏🙌✨❤️]/gu, '');

  const lines = cleaned.split('\\n');
  const filteredLines = [];

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // Preservar títulos sagrados e contadores:
    if (/^\\d+\\s+Dias\\s+de\\s+Ativação/i.test(line)) {
      filteredLines.push(line);
      continue;
    }
    if (/^Ativação\\s+número\\s+\\d+/i.test(line)) {
      filteredLines.push(line);
      continue;
    }
    // Preservar se começar com livro bíblico numerado (ex: 1 Coríntios, 2 Pedro, 1 João, etc.)
    if (/^[123]\\s+(?:Cor[íi]ntios|Samuel|Reis|Cr[ôo]nicas|Tessalonicenses|Tim[óo]teo|Pedro|Jo[ãa]o)/i.test(line)) {
      filteredLines.push(line);
      continue;
    }

    // Remover marcador/número de versículo no início da linha (ex: "1 ", "1. ", "1: ", "1 - ", "*1* ", "versículo 1: ")
    const withoutVerseNumber = line.replace(/^(?:vers[íi]culo\\s*\\d+[\\.\\:\\-\\s–—]*|v\\.\\s*\\d+[\\.\\:\\-\\s–—]*|\\[\\d+\\]\\s*|\\(\\d+\\)\\s*|\\d+[\\.\\:\\)\\s\\-–—]+)\\s*/i, '').trim();

    if (withoutVerseNumber) {
      filteredLines.push(withoutVerseNumber);
    }
  }

  return filteredLines.join('\\n\\n');
}

const cleanText = prepareTextForAudio(rawText);

function splitTextForTts(text, maxChunk = 3000) {
  if (text.length <= maxChunk) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxChunk) {
      chunks.push(remaining);
      break;
    }
    let splitIdx = remaining.lastIndexOf('\\n\\n', maxChunk);
    if (splitIdx < maxChunk * 0.4) splitIdx = remaining.lastIndexOf('\\n', maxChunk);
    if (splitIdx < maxChunk * 0.4) splitIdx = remaining.lastIndexOf('. ', maxChunk);
    if (splitIdx < maxChunk * 0.3) splitIdx = remaining.lastIndexOf(' ', maxChunk);
    if (splitIdx <= 0) splitIdx = maxChunk;
    const chunk = remaining.substring(0, splitIdx).trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.substring(splitIdx).trim();
  }
  return chunks;
}

const chunks = splitTextForTts(cleanText, 3000);
const audioBuffers = [];

for (let i = 0; i < chunks.length; i++) {
  const ttsRes = await this.helpers.httpRequest({
    method: "POST",
    url: "https://api.openai.com/v1/audio/speech",
    headers: {
      "Authorization": "Bearer " + openaiKey,
      "Content-Type": "application/json"
    },
    body: {
      model: "tts-1",
      voice: "onyx",
      input: chunks[i],
      response_format: "mp3"
    },
    encoding: "arraybuffer",
    returnFullResponse: true
  });

  const rawBody = ttsRes.body !== undefined ? ttsRes.body : ttsRes;
  const buf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
  audioBuffers.push(buf);
}

const finalAudioBuffer = Buffer.concat(audioBuffers);

return [{
  json: {
    chatId: targetChatId,
    caption: \`🎧 *Ativação Noturna em Áudio* — \${title}\\n_Áudio integral narrado com Leitura Sagrada, Sabedoria, Decreto e Bênção de Descanso._\`,
    title,
    dateIso
  },
  binary: {
    data: {
      data: finalAudioBuffer.toString("base64"),
      mimeType: "audio/mpeg",
      fileName: \`prosperidade_\${dateIso}.mp3\`
    }
  }
}];`;

// 3. Código do Gerar Áudio Devocional com filtro inteligente
const codeGerarAudioDevocional = `const openaiKey = String($env.OPENAI_API_KEY || "").trim();
const firstItem = $('Preparar Devocional Matinal').first().json || {};
const rawText = String(firstItem.fullTextForAudio || firstItem.text || "");
const title = String(firstItem.audioTitle || "Devocional Diário");
const dateIso = String(firstItem.dateIso || "");
const targetChatId = String(firstItem.chatId || "@devocionalking");

if (!openaiKey || !rawText) {
  return [];
}

function prepareTextForAudio(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text
    .replace(/━+/g, '')
    .replace(/(?:^|\\n)\\s*\\*(\\d+)\\*\\s*/g, '\\n')
    .replace(/[*_#\`~]/g, '')
    .replace(/[🌙👑📖🔓💎🗣️🕊️🌅🙏🙌✨❤️]/gu, '');

  const lines = cleaned.split('\\n');
  const filteredLines = [];

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    if (/^[123]\\s+(?:Cor[íi]ntios|Samuel|Reis|Cr[ôo]nicas|Tessalonicenses|Tim[óo]teo|Pedro|Jo[ãa]o)/i.test(line)) {
      filteredLines.push(line);
      continue;
    }

    const withoutVerseNumber = line.replace(/^(?:vers[íi]culo\\s*\\d+[\\.\\:\\-\\s–—]*|v\\.\\s*\\d+[\\.\\:\\-\\s–—]*|\\[\\d+\\]\\s*|\\(\\d+\\)\\s*|\\d+[\\.\\:\\)\\s\\-–—]+)\\s*/i, '').trim();

    if (withoutVerseNumber) {
      filteredLines.push(withoutVerseNumber);
    }
  }

  return filteredLines.join('\\n\\n');
}

const cleanText = prepareTextForAudio(rawText);

function splitTextForTts(text, maxChunk = 3000) {
  if (text.length <= maxChunk) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxChunk) {
      chunks.push(remaining);
      break;
    }
    let splitIdx = remaining.lastIndexOf('\\n\\n', maxChunk);
    if (splitIdx < maxChunk * 0.4) splitIdx = remaining.lastIndexOf('\\n', maxChunk);
    if (splitIdx < maxChunk * 0.4) splitIdx = remaining.lastIndexOf('. ', maxChunk);
    if (splitIdx < maxChunk * 0.3) splitIdx = remaining.lastIndexOf(' ', maxChunk);
    if (splitIdx <= 0) splitIdx = maxChunk;
    const chunk = remaining.substring(0, splitIdx).trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.substring(splitIdx).trim();
  }
  return chunks;
}

const chunks = splitTextForTts(cleanText, 3000);
const audioBuffers = [];

for (let i = 0; i < chunks.length; i++) {
  const ttsRes = await this.helpers.httpRequest({
    method: "POST",
    url: "https://api.openai.com/v1/audio/speech",
    headers: {
      "Authorization": "Bearer " + openaiKey,
      "Content-Type": "application/json"
    },
    body: {
      model: "tts-1",
      voice: "onyx",
      input: chunks[i],
      response_format: "mp3"
    },
    encoding: "arraybuffer",
    returnFullResponse: true
  });

  const rawBody = ttsRes.body !== undefined ? ttsRes.body : ttsRes;
  const buf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
  audioBuffers.push(buf);
}

const finalAudioBuffer = Buffer.concat(audioBuffers);

return [{
  json: {
    chatId: targetChatId,
    caption: \`🎧 *Devocional em Áudio* — \${title}\\n_Ministração completa narrada da Palavra de hoje._\`,
    title,
    dateIso
  },
  binary: {
    data: {
      data: finalAudioBuffer.toString("base64"),
      mimeType: "audio/mpeg",
      fileName: \`devocional_\${dateIso}.mp3\`
    }
  }
}];`;

async function main() {
  console.log('1. Obtendo workflow ' + SCHEDULER_ID + '...');
  const getRes = await req('GET', `/api/v1/workflows/${SCHEDULER_ID}`);
  const wf = getRes.body;

  const noturnaNode = wf.nodes.find(n => n.name === 'Preparar Prosperidade Noturna');
  if (noturnaNode) noturnaNode.parameters.jsCode = codePrepararProsperidade;

  const audioProsNode = wf.nodes.find(n => n.name === 'Gerar Áudio Prosperidade');
  if (audioProsNode) audioProsNode.parameters.jsCode = codeGerarAudioProsperidade;

  const audioDevNode = wf.nodes.find(n => n.name === 'Gerar Áudio Devocional');
  if (audioDevNode) audioDevNode.parameters.jsCode = codeGerarAudioDevocional;

  console.log('2. Atualizando workflow no n8n...');
  const putRes = await req('PUT', `/api/v1/workflows/${SCHEDULER_ID}`, {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  });

  if (putRes.status >= 200 && putRes.status < 300) {
    await req('POST', `/api/v1/workflows/${SCHEDULER_ID}/activate`);
    console.log('✓ Scheduler atualizado e reativado no n8n com sucesso!');

    // Salvar backup sincronizado do JSON no workspace
    fs.writeFileSync('CK_Scheduler_Biblia_Diario.json', JSON.stringify(wf, null, 2), 'utf8');
    console.log('✓ CK_Scheduler_Biblia_Diario.json local sincronizado com sucesso!');
  } else {
    console.error('Erro ao atualizar workflow:', putRes);
  }
}

main().catch(console.error);
