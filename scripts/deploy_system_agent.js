const fs = require('fs');
const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";
const WORKFLOW_ID = "mkK244lveO0N1qPR";

function req(method, path, body) {
  return new Promise((resolve) => {
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
    r.on("error", (e) => resolve({ status: 500, body: e.message }));
    if (payload) r.write(payload);
    r.end();
  });
}

async function main() {
  console.log("1. Buscando workflow atual do Agente King...");
  const getRes = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  if (getRes.status !== 200) {
    throw new Error("Erro ao buscar workflow: " + JSON.stringify(getRes.body));
  }
  const wf = getRes.body;

  // Atualizar nome para refletir escopo exclusivo de sistema
  wf.name = "CK Agente King — Sistema Conecta King";

  // Atualizar código do nó Executar Admin
  const execNode = wf.nodes.find(n => n.name === 'Executar Admin');
  if (!execNode) throw new Error("Nó 'Executar Admin' não encontrado!");

  const updatedCode = fs.readFileSync('scripts/code_agente_king_sistema.js', 'utf8');
  execNode.parameters.jsCode = updatedCode;

  // Conectar Intent Admin diretamente para Executar Admin para garantir que todas as ferramentas do sistema estejam sempre acessíveis
  if (wf.connections['Intent Admin']) {
    wf.connections['Intent Admin'] = {
      main: [
        [
          {
            node: "Executar Admin",
            type: "main",
            index: 0
          }
        ]
      ]
    };
  }

  console.log("2. Enviando workflow atualizado para o n8n...");
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

  console.log("3. Ativando workflow...");
  const actRes = await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
  console.log("Activate status:", actRes.status);
  console.log("AGENTE KING (SISTEMA CONECTA KING) DEPLOYED AND ACTIVATED SUCCESSFULLY!");
}

main().catch(console.error);
