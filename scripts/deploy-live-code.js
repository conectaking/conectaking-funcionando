const fs = require('fs');
const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";
const WORKFLOW_ID = "mkK244lveO0N1qPR";

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

async function main() {
  console.log("1. Buscando workflow atual do n8n...");
  const getRes = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  if (getRes.status !== 200) {
    throw new Error("Erro ao buscar workflow: " + JSON.stringify(getRes.body));
  }
  const wf = getRes.body;

  const execNode = wf.nodes.find(n => n.name === 'Executar Admin');
  if (!execNode) throw new Error("Nó 'Executar Admin' não encontrado!");

  const updatedCode = fs.readFileSync('executar_admin_live.js', 'utf8');
  execNode.parameters.jsCode = updatedCode;

  console.log("2. Enviando workflow atualizado para o n8n...");
  const putPayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };

  const putRes = await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, putPayload);
  console.log("   PUT status:", putRes.status);
  if (putRes.status !== 200) {
    throw new Error("Erro ao salvar workflow: " + JSON.stringify(putRes.body));
  }

  console.log("3. Reativando workflow...");
  const actRes = await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
  console.log("   Activate status:", actRes.status);

  console.log("\n✅ WORKFLOW ATUALIZADO E REATIVADO COM SUCESSO!");
}

main().catch(console.error);
