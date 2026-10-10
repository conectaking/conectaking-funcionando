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

  // 1. Código Gerar Áudio Devocional
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
  .replace(/\\n{2,}/g, '. ')
  .trim()
  .slice(0, 4000);

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
    input: cleanText
  },
  encoding: "arraybuffer",
  returnFullResponse: true
});

const rawBody = ttsRes.body !== undefined ? ttsRes.body : ttsRes;
const buffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);

return [{
  json: {
    chatId: targetChatId,
    caption: \`🎧 *Devocional em Áudio* — \${title}\\n_Ouça a reflexão da manhã com a ministração oficial._\`,
    title,
    dateIso
  },
  binary: {
    data: {
      data: buffer.toString("base64"),
      mimeType: "audio/ogg",
      fileName: "devocional.ogg"
    }
  }
}];`;

  // 2. Código Salvar FileId Devocional
  const codeSaveDevocional = `const base = String($env.CK_BASE_URL || "https://www.conectaking.com.br").replace(/\\/$/, "");
const token = String($env.CK_AGENT_JWT || "").trim();
const tgRes = $input.first().json || {};
const fileId = tgRes.result?.voice?.file_id || tgRes.result?.audio?.file_id || "";
const title = tgRes.title || $('Gerar Áudio Devocional').first().json.title || "Devocional Diário";
const dateIso = tgRes.dateIso || $('Gerar Áudio Devocional').first().json.dateIso || new Date().toISOString().slice(0, 10);

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

if (currentData.audios_diarios.devocional_hoje) {
  currentData.audios_diarios.devocional_ontem = currentData.audios_diarios.devocional_hoje;
}
currentData.audios_diarios.devocional_hoje = {
  data: dateIso,
  titulo: title,
  file_id: fileId,
  timestamp: Date.now()
};

await ck.call(this, "PUT", "/api/finance/king-data", {
  profile_id: 1,
  data: currentData
});

return [{ json: { saved: true, fileId, title } }];`;

  // 3. Código Gerar Áudio Prosperidade
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
  .replace(/\\n{2,}/g, '. ')
  .trim()
  .slice(0, 4000);

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
    input: cleanText
  },
  encoding: "arraybuffer",
  returnFullResponse: true
});

const rawBody = ttsRes.body !== undefined ? ttsRes.body : ttsRes;
const buffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);

return [{
  json: {
    chatId: targetChatId,
    caption: \`🎧 *Ativação Noturna em Áudio* — \${title}\\n_Ouça antes de dormir e declare a prosperidade sobre sua vida._\`,
    title,
    dateIso
  },
  binary: {
    data: {
      data: buffer.toString("base64"),
      mimeType: "audio/ogg",
      fileName: "prosperidade.ogg"
    }
  }
}];`;

  // 4. Código Salvar FileId Prosperidade
  const codeSaveProsperidade = `const base = String($env.CK_BASE_URL || "https://www.conectaking.com.br").replace(/\\/$/, "");
const token = String($env.CK_AGENT_JWT || "").trim();
const tgRes = $input.first().json || {};
const fileId = tgRes.result?.voice?.file_id || tgRes.result?.audio?.file_id || "";
const title = tgRes.title || $('Gerar Áudio Prosperidade').first().json.title || "Ativação Noturna";
const dateIso = tgRes.dateIso || $('Gerar Áudio Prosperidade').first().json.dateIso || new Date().toISOString().slice(0, 10);

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

if (currentData.audios_diarios.prosperidade_hoje) {
  currentData.audios_diarios.prosperidade_ontem = currentData.audios_diarios.prosperidade_hoje;
}
currentData.audios_diarios.prosperidade_hoje = {
  data: dateIso,
  titulo: title,
  file_id: fileId,
  timestamp: Date.now()
};

await ck.call(this, "PUT", "/api/finance/king-data", {
  profile_id: 1,
  data: currentData
});

return [{ json: { saved: true, fileId, title } }];`;

  // Remover nós antigos de áudio se já existirem
  wf.nodes = wf.nodes.filter(n => ![
    'Gerar Áudio Devocional', 'Enviar Telegram Áudio Devocional', 'Salvar FileId Devocional',
    'Gerar Áudio Prosperidade', 'Enviar Telegram Áudio Prosperidade', 'Salvar FileId Prosperidade'
  ].includes(n.name));

  // Adicionar nós de Devocional
  wf.nodes.push(
    {
      id: 'genAudioDevocional',
      name: 'Gerar Áudio Devocional',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      continueOnFail: true,
      position: [100, 200],
      parameters: { language: 'javaScript', jsCode: codeTtsDevocional }
    },
    {
      id: 'sendAudioDevocional',
      name: 'Enviar Telegram Áudio Devocional',
      type: 'n8n-nodes-base.telegram',
      typeVersion: 1.2,
      continueOnFail: true,
      position: [350, 200],
      parameters: {
        resource: 'message',
        operation: 'sendAudio',
        chatId: '={{ $json.chatId }}',
        binaryData: true,
        binaryPropertyName: 'data',
        caption: '={{ $json.caption }}',
        additionalFields: { appendAttribution: false, parse_mode: 'Markdown' }
      },
      credentials: { telegramApi: { id: 'g9e8goMSML0vE2JS', name: 'Telegram account 3' } }
    },
    {
      id: 'saveFileIdDevocional',
      name: 'Salvar FileId Devocional',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      continueOnFail: true,
      position: [600, 200],
      parameters: { language: 'javaScript', jsCode: codeSaveDevocional }
    }
  );

  // Adicionar nós de Prosperidade
  wf.nodes.push(
    {
      id: 'genAudioProsperidade',
      name: 'Gerar Áudio Prosperidade',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      continueOnFail: true,
      position: [100, 500],
      parameters: { language: 'javaScript', jsCode: codeTtsProsperidade }
    },
    {
      id: 'sendAudioProsperidade',
      name: 'Enviar Telegram Áudio Prosperidade',
      type: 'n8n-nodes-base.telegram',
      typeVersion: 1.2,
      continueOnFail: true,
      position: [350, 500],
      parameters: {
        resource: 'message',
        operation: 'sendAudio',
        chatId: '={{ $json.chatId }}',
        binaryData: true,
        binaryPropertyName: 'data',
        caption: '={{ $json.caption }}',
        additionalFields: { appendAttribution: false, parse_mode: 'Markdown' }
      },
      credentials: { telegramApi: { id: 'g9e8goMSML0vE2JS', name: 'Telegram account 3' } }
    },
    {
      id: 'saveFileIdProsperidade',
      name: 'Salvar FileId Prosperidade',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      continueOnFail: true,
      position: [600, 500],
      parameters: { language: 'javaScript', jsCode: codeSaveProsperidade }
    }
  );

  // Conexões
  // Enviar Telegram Devocional -> Gerar Áudio Devocional -> Enviar Telegram Áudio Devocional -> Salvar FileId Devocional
  wf.connections['Enviar Telegram Devocional'] = {
    main: [[{ node: 'Gerar Áudio Devocional', type: 'main', index: 0 }]]
  };
  wf.connections['Gerar Áudio Devocional'] = {
    main: [[{ node: 'Enviar Telegram Áudio Devocional', type: 'main', index: 0 }]]
  };
  wf.connections['Enviar Telegram Áudio Devocional'] = {
    main: [[{ node: 'Salvar FileId Devocional', type: 'main', index: 0 }]]
  };

  // Enviar Telegram Prosperidade -> Gerar Áudio Prosperidade -> Enviar Telegram Áudio Prosperidade -> Salvar FileId Prosperidade
  wf.connections['Enviar Telegram Prosperidade'] = {
    main: [[{ node: 'Gerar Áudio Prosperidade', type: 'main', index: 0 }]]
  };
  wf.connections['Gerar Áudio Prosperidade'] = {
    main: [[{ node: 'Enviar Telegram Áudio Prosperidade', type: 'main', index: 0 }]]
  };
  wf.connections['Enviar Telegram Áudio Prosperidade'] = {
    main: [[{ node: 'Salvar FileId Prosperidade', type: 'main', index: 0 }]]
  };

  console.log('Salvando workflow atualizado com pipeline de áudio nativo...');
  const putRes = await req('PUT', `/api/v1/workflows/${SCHEDULER_ID}`, {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  });

  if (putRes.status >= 200 && putRes.status < 300) {
    await req('POST', `/api/v1/workflows/${SCHEDULER_ID}/activate`);
    console.log('✓ Scheduler completo configurado com envio automático de texto + áudio + salvamento de file_id!');
  } else {
    console.error('Erro:', putRes);
  }
}

main().catch(console.error);
