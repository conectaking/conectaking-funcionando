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

function callWebhook(path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "n8n.conectaking.com.br",
      port: 443,
      path: path,
      method: "POST",
      headers: {
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
  const fs = require('fs');
  const code = fs.readFileSync('executar_admin_live.js', 'utf8');

  // Extrair TOOLS do código
  const toolsStart = code.indexOf('const TOOLS = [');
  const toolsEnd = code.indexOf('];\n\n\n// ─── Gerador de Link Direto', toolsStart);
  const toolsSnippet = code.slice(toolsStart, (toolsEnd !== -1 ? toolsEnd + 2 : code.indexOf('];', toolsStart) + 2));

  // Extrair SYSTEM_PROMPT
  const spStart = code.indexOf('const SYSTEM_PROMPT = `');
  const spEnd = code.indexOf('`;\n\nconst TOOLS = [', spStart);
  const spSnippet = code.slice(spStart, spEnd + 2);

  const testPhrases = [
    "Na minha gestão financeira Eu tenho algumas contas que eu tô devendo para socorrinha eu quero saber qual são elas",
    "Não é isso veja o nome de pessoas que eu estou devendo me passa o nome de pessoas que eu estou devendo",
    "Eu quero saber quanto que eu devo para socorrinha e qual as datas do pagamento e quantas parcelas",
    "coloca a conta da socorrinha de 110 que é para pagar mês que vem data 10",
    "vou pagar a socorrinha 10 vezes de 110 a partir do mês que vem dia 10"
  ];

  const testJsCode = `
const openaiKey = String($env.OPENAI_API_KEY || '').trim();
const model = 'gpt-4o-mini';

const nowSp = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
const diaSemanaNomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const diaSemanaAtual = diaSemanaNomes[nowSp.getDay()];
const dataHojeISO = nowSp.toISOString().slice(0, 10);
const horaAtualSp = String(nowSp.getHours()).padStart(2, '0') + ':' + String(nowSp.getMinutes()).padStart(2, '0');
const dataHojeBr = String(nowSp.getDate()).padStart(2, '0') + '/' + String(nowSp.getMonth() + 1).padStart(2, '0') + '/' + nowSp.getFullYear();
const KB = 'Conecta King';

${spSnippet}
${toolsSnippet}

async function openaiCall(payload) {
  return this.helpers.httpRequest.call(this, {
    method: 'POST', url: 'https://api.openai.com/v1/chat/completions',
    headers: { 'Authorization': 'Bearer ' + openaiKey, 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: payload, json: true, returnFullResponse: true, ignoreHttpStatusErrors: true
  });
}

const phrases = ${JSON.stringify(testPhrases)};
const results = [];

for (const p of phrases) {
  const completionRes = await openaiCall.call(this, {
    model, temperature: 0.1,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: p }
    ],
    tools: TOOLS,
    tool_choice: 'auto'
  });
  const choice = completionRes.body?.choices?.[0]?.message;
  results.push({
    frase: p,
    tool_calls: (choice?.tool_calls || []).map(tc => ({
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments || '{}')
    })),
    content: choice?.content
  });
}

return [{ json: { results } }];
`;

  const tempWf = {
    name: "Temp Test AI Tool Choices",
    nodes: [
      {
        id: "hook01",
        name: "Webhook",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [100, 200],
        webhookId: "temp-test-ai-hook",
        parameters: {
          path: "temp-test-ai",
          httpMethod: "POST",
          responseMode: "lastNode",
          responseData: "allEntries"
        }
      },
      {
        id: "code01",
        name: "Code",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [300, 200],
        parameters: {
          jsCode: testJsCode
        }
      }
    ],
    connections: {
      Webhook: {
        main: [[{ node: "Code", type: "main", index: 0 }]]
      }
    },
    settings: { executionOrder: "v1" }
  };

  const createRes = await req("POST", "/api/v1/workflows", tempWf);
  const wfId = createRes.body.id;
  await req("POST", `/api/v1/workflows/${wfId}/activate`);
  await new Promise(r => setTimeout(r, 1000));
  const hookRes = await callWebhook("/webhook/temp-test-ai", {});
  await req("DELETE", `/api/v1/workflows/${wfId}`);

  console.log("=== RAW HOOK RES ===");
  console.log(JSON.stringify(hookRes.body, null, 2));

  const list = Array.isArray(hookRes.body) ? (hookRes.body[0]?.results || []) : (hookRes.body?.results || []);
  console.log("=== AI TOOL DISPATCH TEST RESULTS ===");
  for (const r of list) {
    console.log(`\n💬 Frase: "${r.frase}"`);
    if (r.tool_calls && r.tool_calls.length > 0) {
      for (const tc of r.tool_calls) {
        console.log(`   ⚡ Tool Chamada: ${tc.name}`);
        console.log(`   📦 Argumentos:`, JSON.stringify(tc.arguments));
      }
    } else {
      console.log(`   📝 Resposta Direta: ${r.content}`);
    }
  }
}

main().catch(console.error);
