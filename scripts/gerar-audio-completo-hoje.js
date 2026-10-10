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
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

// Ler o texto integral postado hoje
const exec = JSON.parse(fs.readFileSync('exec_9751.json', 'utf8'));
const prep = exec.data.resultData.runData['Preparar Prosperidade Noturna'][0].data.main[0];
const fullText = prep[0].json.text.replace(/^_\(Parte 1\/2\)_\s*/, '') + '\n\n' + prep[1].json.text.replace(/^_\(Parte 2\/2\)_\s*/, '');

const cleanText = fullText
  .replace(/[*_#\`~]/g, '')
  .replace(/[🌙👑📖🔓💎🗣️🕊️]/g, '')
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
    let splitIdx = remaining.lastIndexOf('\n\n', maxChunk);
    if (splitIdx < maxChunk * 0.4) splitIdx = remaining.lastIndexOf('\n', maxChunk);
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
console.log('Texto dividido em', chunks.length, 'partes para TTS completo:');
chunks.forEach((c, i) => console.log(`Parte ${i+1}: ${c.length} caracteres`));

// Código do nó para gerar cada chunk e concatenar no buffer
const codeTtsFull = `const openaiKey = String($env.OPENAI_API_KEY || "").trim();
const chunks = ${JSON.stringify(chunks)};

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
    chatId: "@devocionalking",
    caption: "🎧 *Ativação Noturna Completa em Áudio* — Provérbios 9\\n_Áudio integral com Leitura Sagrada, Ativação de Sabedoria, Decreto e Bênção de Descanso._",
    title: "Ativação #9 · Provérbios 9 (Completo)"
  },
  binary: {
    data: {
      data: finalAudioBuffer.toString("base64"),
      mimeType: "audio/mpeg",
      fileName: "ativacao_proverbios_9_completo.mp3"
    }
  }
}];`;

// Código para salvar file_id no king-data
const codeSaveFull = `const base = String($env.CK_BASE_URL || "https://www.conectaking.com.br").replace(/\\/$/, "");
const token = String($env.CK_AGENT_JWT || "").trim();
const tgRes = $input.first().json || {};
const fileId = tgRes.result?.voice?.file_id || tgRes.result?.audio?.file_id || "";
const title = "Ativação #9 · Provérbios 9 (Completo)";

if (!fileId) return [{ json: { saved: false, reason: "No file_id" } }];

async function ck(method, path, body) {
  return this.helpers.httpRequest.call(this, {
    method,
    url: base + path,
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(token ? { "Authorization": "Bearer " + token } : {})
    },
    body,
    json: true,
    returnFullResponse: true,
    ignoreHttpStatusErrors: true
  });
}

const getRes = await ck.call(this, "GET", "/api/finance/king-data?profile_id=1");
const currentData = (getRes.body && (getRes.body.data || getRes.body)) || {};
if (!currentData.audios_diarios) currentData.audios_diarios = {};

currentData.audios_diarios.prosperidade_hoje = {
  data: "2026-10-09",
  titulo: title,
  file_id: fileId,
  isComplete: true,
  timestamp: Date.now()
};

await ck.call(this, "PUT", "/api/finance/king-data", {
  profile_id: 1,
  data: currentData
});

return [{ json: { saved: true, fileId, title } }];`;

async function run() {
  const testWf = {
    name: 'Disparar Audio Completo Hoje',
    nodes: [
      {
        id: 'whStart',
        name: 'Webhook Trigger',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [0, 0],
        parameters: {
          httpMethod: 'GET',
          path: 'disparar-audio-completo-hoje',
          responseMode: 'onReceived'
        }
      },
      {
        id: 'codeTTS',
        name: 'Gerar Audio Completo TTS',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [200, 0],
        parameters: {
          language: 'javaScript',
          jsCode: codeTtsFull
        }
      },
      {
        id: 'tgAudio',
        name: 'Enviar Telegram Audio Completo',
        type: 'n8n-nodes-base.telegram',
        typeVersion: 1.2,
        position: [450, 0],
        parameters: {
          resource: 'message',
          operation: 'sendAudio',
          chatId: '={{ $json.chatId }}',
          binaryData: true,
          binaryPropertyName: 'data',
          caption: '={{ $json.caption }}',
          additionalFields: {
            appendAttribution: false,
            parse_mode: 'Markdown'
          }
        },
        credentials: {
          telegramApi: {
            id: 'g9e8goMSML0vE2JS',
            name: 'Telegram account 3'
          }
        }
      },
      {
        id: 'saveCode',
        name: 'Salvar FileId Completo',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [700, 0],
        parameters: {
          language: 'javaScript',
          jsCode: codeSaveFull
        }
      }
    ],
    connections: {
      'Webhook Trigger': { main: [[{ node: 'Gerar Audio Completo TTS', type: 'main', index: 0 }]] },
      'Gerar Audio Completo TTS': { main: [[{ node: 'Enviar Telegram Audio Completo', type: 'main', index: 0 }]] },
      'Enviar Telegram Audio Completo': { main: [[{ node: 'Salvar FileId Completo', type: 'main', index: 0 }]] }
    },
    settings: { executionOrder: 'v1' }
  };

  const createRes = await req('POST', '/api/v1/workflows', testWf);
  const wfId = createRes.body?.id;
  console.log('Created wf:', wfId);
  if (!wfId) {
    console.error('Falha ao criar workflow:', createRes);
    return;
  }

  await req('POST', `/api/v1/workflows/${wfId}/activate`);
  console.log('Workflow ativado! Disparando geração do áudio completo...');

  https.get('https://n8n.conectaking.com.br/webhook/disparar-audio-completo-hoje', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Webhook iniciado com sucesso.');
      // Monitorar execução
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const execs = await req('GET', `/api/v1/executions?workflowId=${wfId}&limit=1`);
        const ex = execs.body?.data?.[0];
        console.log(`Verificando execução (tentativa ${attempts})... Status: ${ex?.status}`);
        if (ex && ex.status === 'success') {
          clearInterval(interval);
          const full = await req('GET', `/api/v1/executions/${ex.id}?includeData=true`);
          const tgResult = full.body?.data?.resultData?.runData?.['Enviar Telegram Audio Completo']?.[0]?.data?.main?.[0]?.[0]?.json;
          const saveResult = full.body?.data?.resultData?.runData?.['Salvar FileId Completo']?.[0]?.data?.main?.[0]?.[0]?.json;
          console.log('✓ Áudio Completo Enviado ao Telegram! Result:', JSON.stringify(tgResult?.result?.audio || tgResult?.result?.voice || tgResult?.result, null, 2));
          console.log('✓ Salvo no Banco Conecta King:', JSON.stringify(saveResult, null, 2));
          await req('DELETE', `/api/v1/workflows/${wfId}`);
          console.log('Workflow temporário limpo.');
        } else if (ex && ex.status === 'error') {
          clearInterval(interval);
          console.error('Erro na execução:', JSON.stringify(ex, null, 2));
        } else if (attempts > 30) {
          clearInterval(interval);
          console.log('Timeout aguardando execução.');
        }
      }, 4000);
    });
  });
}

run().catch(console.error);
