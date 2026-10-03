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

async function run() {
  console.log("1. Buscando workflow atual...");
  const res = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  if (res.status !== 200) {
    throw new Error("Erro ao buscar workflow: " + JSON.stringify(res.body));
  }
  const wf = res.body;

  // 1. Atualizar Executar Admin
  const execNode = wf.nodes.find(n => n.name === 'Executar Admin');
  if (!execNode) throw new Error("Nó Executar Admin não encontrado!");

  let code = execNode.parameters.jsCode;

  // Corrigir fechamento de underscore na linha do Google Agenda
  code = code.replace(
    "`_(Ao tocar, abre no app Google Agenda do seu celular com alarme e notificação prontos!)\\n\\n`",
    "`_(Ao tocar, abre no app Google Agenda do seu celular com alarme e notificação prontos!)_\\n\\n`"
  );
  code = code.replace(
    "_(Ao tocar, abre no app Google Agenda do seu celular com alarme e notificação prontos!)\n\n",
    "_(Ao tocar, abre no app Google Agenda do seu celular com alarme e notificação prontos!)_\n\n"
  );

  // Adicionar sanitizador de markdown antes do retorno final
  if (!code.includes('function fixTelegramMarkdown')) {
    const sanitizeFunction = `function fixTelegramMarkdown(text) {
  if (!text) return '';
  let t = String(text);
  const underscores = (t.match(/_/g) || []).length;
  if (underscores % 2 !== 0) {
    let count = 0;
    t = t.replace(/_/g, m => (++count === underscores ? '' : m));
  }
  const stars = (t.match(/\\*/g) || []).length;
  if (stars % 2 !== 0) {
    let count = 0;
    t = t.replace(/\\*/g, m => (++count === stars ? '' : m));
  }
  return t;
}
outMessage = fixTelegramMarkdown(outMessage);
`;
    code = code.replace("return [{ json: { ...prev, outMessage", sanitizeFunction + "\nreturn [{ json: { ...prev, outMessage");
  }

  execNode.parameters.jsCode = code;

  // 2. Atualizar Confirmar Evento Google Calendar
  const confNode = wf.nodes.find(n => n.name === 'Confirmar Evento Google Calendar');
  if (confNode) {
    confNode.parameters.jsCode = `const prev = $('Executar Admin').first().json;
const gcal = $input.first().json;
let msg = prev.outMessage || '';

if (gcal && (gcal.id || gcal.htmlLink)) {
  const link = gcal.htmlLink || '';
  msg = msg.replace('📲 [Toque aqui para Adicionar ao seu Google Agenda]', '📅 *Agendado diretamente no seu Google Agenda!* ✅\\n📲 [Abrir no Google Agenda]');
  if (link) {
    msg = msg.replace(/https:\\/\\/calendar\\.google\\.com\\/calendar\\/render\\?[^\\)]+/g, link);
  }
  msg = msg.replace(/_?\\(Ao tocar, abre no app Google Agenda do seu celular com alarme e notificação prontos!\\)_?/g, '_(Já está gravado no seu Google Agenda com alertas de 30 min e 15 min antes no seu celular!)_');
}

function fixTelegramMarkdown(text) {
  if (!text) return '';
  let t = String(text);
  const underscores = (t.match(/_/g) || []).length;
  if (underscores % 2 !== 0) {
    let count = 0;
    t = t.replace(/_/g, m => (++count === underscores ? '' : m));
  }
  const stars = (t.match(/\\*/g) || []).length;
  if (stars % 2 !== 0) {
    let count = 0;
    t = t.replace(/\\*/g, m => (++count === stars ? '' : m));
  }
  return t;
}

msg = fixTelegramMarkdown(msg);

return [{
  json: {
    ...prev,
    outMessage: msg
  }
}];
`;
    console.log("✓ Nó 'Confirmar Evento Google Calendar' atualizado com sanitizador!");
  }

  console.log("2. Enviando workflow atualizado para o n8n...");
  const putPayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };

  const putRes = await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, putPayload);
  if (putRes.status !== 200) {
    throw new Error("Erro ao atualizar workflow: " + JSON.stringify(putRes.body));
  }
  console.log("✓ Workflow mkK244lveO0N1qPR atualizado e ativo no n8n!");
}

run().catch(console.error);
