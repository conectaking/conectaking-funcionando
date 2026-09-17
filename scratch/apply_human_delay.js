const https = require('https');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNmE5ZmM0ZTEtYzM1MS00OWU1LWIyNDEtYTBlODhhMmJjNGNjIiwiaWF0IjoxNzg5NjY3MTQyfQ.LZKgnE2yqzgG1mQodu_HIlqywoxcGZ5rzyV7lOkd_ZQ';
const BASE_HOST = 'n8n.conectaking.com.br';

function req(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: BASE_HOST,
      port: 443,
      path: '/api/v1' + path,
      method: method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };

    const request = https.request(options, (res) => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const resBody = Buffer.concat(chunks).toString('utf-8');
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resBody) });
        } catch (e) {
          resolve({ status: res.statusCode, text: resBody });
        }
      });
    });

    request.on('error', reject);
    if (data) request.write(data);
    request.end();
  });
}

// Código com delay humanizado e proteção anti-ban
// Calcula tempo de leitura/digitação natural proporcional ao tamanho do texto
// Ex: textos curtos esperam 3 a 5 seg; textos médios esperam 5 a 8 seg
const DELAY_CODE_BOT = `function from(name) {
  try { return $(name).first().json; } catch (e) { return null; }
}
const prep = from('Unir voz') || from('Preparar (texto/voz)') || {};
const prev = $input.first().json;
let out = String(prev.output || prev.text || '').trim();
const escalate = /ESCALATE:\\s*YES/i.test(out) || /humano|falar com o king/i.test(String(prep.text || ''));
out = out.replace(/\\n?ESCALATE:\\s*(YES|NO)\\s*$/i, '').trim();
const chatId = String(prep.chatId || prev.chatId || '');
if (!chatId) throw new Error('chatId vazio após formatar');

// --- SIMULAÇÃO DE DIGITAÇÃO / DELAY HUMANIZADO (ANTI-BAN) ---
// Calcula delay proporcional ao tamanho da resposta (entre 3.5s e 7.5s)
const baseDelay = 3500;
const charDelay = Math.min(Math.floor(out.length * 15), 4000);
const randomJitter = Math.floor(Math.random() * 1000);
const totalDelayMs = baseDelay + charDelay + randomJitter;

await new Promise(resolve => setTimeout(resolve, totalDelayMs));

return [{ json: {
  ...prep, ...prev,
  output: out,
  outMessage: out || 'Como posso ajudar?',
  chatId,
  senderId: String(prep.senderId || ''),
  firstName: prep.firstName || '',
  text: prep.text || '',
  hadVoice: !!prep.hadVoice,
  escalate,
  delayMs: totalDelayMs
} }];
`;

const DELAY_CODE_CLIENTE = `const prep = $('Preparar (texto/voz)').first().json;
const prev = $input.first().json;
let out = String(prev.output || prev.text || '').trim();
const escalate = /ESCALATE\\s*:\\s*YES/i.test(out);
out = out.replace(/\\s*ESCALATE\\s*:\\s*(YES|NO)\\s*/gi, '').trim();

// --- SIMULAÇÃO DE DIGITAÇÃO / DELAY HUMANIZADO (ANTI-BAN) ---
// Simula tempo de leitura e digitação humana (3.5s a 7s)
const baseDelay = 3500;
const charDelay = Math.min(Math.floor(out.length * 15), 3500);
const randomJitter = Math.floor(Math.random() * 800);
const totalDelayMs = baseDelay + charDelay + randomJitter;

await new Promise(resolve => setTimeout(resolve, totalDelayMs));

return [{ json: {
  chatId: String(prep.chatId || ''),
  senderId: String(prep.senderId || ''),
  outMessage: out || 'Sem resposta.',
  escalate,
  delayMs: totalDelayMs
} }];
`;

async function applyHumanDelay() {
  console.log("=== INSERINDO DELAY HUMANIZADO ANTI-BAN NOS NÓS ===");

  // 1. Atualizar Workflow Bot (mkK244lveO0N1qPR)
  const getBot = await req('/workflows/mkK244lveO0N1qPR');
  if (getBot.status === 200) {
    const wf = getBot.data;
    const node = wf.nodes.find(n => n.name === 'Formatar Cliente IA');
    if (node) {
      node.parameters.jsCode = DELAY_CODE_BOT;
      const putRes = await req('/workflows/mkK244lveO0N1qPR', 'PUT', {
        name: wf.name,
        nodes: wf.nodes,
        connections: wf.connections,
        settings: wf.settings
      });
      console.log(`[OK] Delay aplicado no Workflow Bot (mkK244lveO0N1qPR): Status ${putRes.status}`);
    }
  }

  // 2. Atualizar Workflow Cliente (B7oTCGI5CMcp1K9T)
  const getCli = await req('/workflows/B7oTCGI5CMcp1K9T');
  if (getCli.status === 200) {
    const wf = getCli.data;
    const node = wf.nodes.find(n => n.name === 'Formatar Cliente IA');
    if (node) {
      node.parameters.jsCode = DELAY_CODE_CLIENTE;
      const putRes = await req('/workflows/B7oTCGI5CMcp1K9T', 'PUT', {
        name: wf.name,
        nodes: wf.nodes,
        connections: wf.connections,
        settings: wf.settings
      });
      console.log(`[OK] Delay aplicado no Workflow Cliente (B7oTCGI5CMcp1K9T): Status ${putRes.status}`);
    }
  }

  console.log("=== DELAY HUMANIZADO CONFIGURADO COM SUCESSO ===");
}

applyHumanDelay().catch(console.error);
