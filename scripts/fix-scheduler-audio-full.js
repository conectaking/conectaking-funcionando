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
  const getRes = await req('GET', `/api/v1/workflows/${SCHEDULER_ID}`);
  const wf = getRes.body;

  // Código Gerar Áudio Devocional com Chunking Inteligente e Concatenação
  const codeTtsDevocional = `const openaiKey = String($env.OPENAI_API_KEY || "").trim();
const firstItem = $('Preparar Devocional Matinal').first().json || {};
const rawText = String(firstItem.fullTextForAudio || firstItem.text || "");
const title = String(firstItem.audioTitle || "Devocional Diário");
const dateIso = String(firstItem.dateIso || "");
const targetChatId = String(firstItem.chatId || "@devocionalking");

if (!openaiKey || !rawText) {
  return [];
}

const cleanText = rawText
  .replace(/[*_#\`~]/g, '')
  .replace(/[🌅📖🙏🙌🕊️👑🌙💎🗣️]/g, '')
  .replace(/━+/g, '')
  .trim();

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
      fileName: "devocional_\${dateIso}.mp3"
    }
  }
}];`;

  // Código Gerar Áudio Prosperidade com Chunking Inteligente e Concatenação
  const codeTtsProsperidade = `const openaiKey = String($env.OPENAI_API_KEY || "").trim();
const firstItem = $('Preparar Prosperidade Noturna').first().json || {};
const rawText = String(firstItem.fullTextForAudio || firstItem.text || "");
const title = String(firstItem.audioTitle || "Ativação Noturna de Prosperidade");
const dateIso = String(firstItem.dateIso || "");
const targetChatId = String(firstItem.chatId || "@devocionalking");

if (!openaiKey || !rawText) {
  return [];
}

const cleanText = rawText
  .replace(/[*_#\`~]/g, '')
  .replace(/[🌅📖🙏🙌🕊️👑🌙💎🗣️]/g, '')
  .replace(/━+/g, '')
  .trim();

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
    caption: \`🎧 *Ativação Noturna em Áudio* — \${title}\\n_Áudio integral com Leitura Sagrada, Sabedoria, Decreto e Bênção de Descanso._\`,
    title,
    dateIso
  },
  binary: {
    data: {
      data: finalAudioBuffer.toString("base64"),
      mimeType: "audio/mpeg",
      fileName: "prosperidade_\${dateIso}.mp3"
    }
  }
}];`;

  // Atualizar os nós existentes no workflow
  const devNode = wf.nodes.find(n => n.name === 'Gerar Áudio Devocional');
  if (devNode) devNode.parameters.jsCode = codeTtsDevocional;

  const prosNode = wf.nodes.find(n => n.name === 'Gerar Áudio Prosperidade');
  if (prosNode) prosNode.parameters.jsCode = codeTtsProsperidade;

  console.log('Atualizando scheduler no n8n com concatenação inteligente de áudio...');
  const putRes = await req('PUT', `/api/v1/workflows/${SCHEDULER_ID}`, {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  });

  if (putRes.status >= 200 && putRes.status < 300) {
    await req('POST', `/api/v1/workflows/${SCHEDULER_ID}/activate`);
    console.log('✓ Scheduler atualizado com sucesso: áudios 100% integrais sem cortes!');
  } else {
    console.error('Erro ao atualizar:', putRes);
  }
}

main().catch(console.error);
