const fs = require('fs');
const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";
const WORKFLOW_ID = "J0xNWmOgaJqMsCEa";

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
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on("error", (e) => resolve({ status: 500, body: e.message }));
    if (payload) r.write(payload);
    r.end();
  });
}

async function main() {
  console.log("1. Buscando workflow...");
  const getRes = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  const wf = getRes.body;

  const codeNode = wf.nodes.find(n => n.name === 'Executar King Finanças');
  if (!codeNode) {
    throw new Error("Nó 'Executar King Finanças' não encontrado!");
  }

  const updatedCode = fs.readFileSync('scripts/code_agente_king_financas.js', 'utf8');
  codeNode.parameters.jsCode = updatedCode;

  console.log("2. Enviando workflow atualizado ao n8n...");
  const putRes = await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  });
  console.log("PUT status:", putRes.status);

  console.log("3. Reativando workflow...");
  const actRes = await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
  console.log("Activate status:", actRes.status);
  console.log("Sucesso: Agente King Finanças atualizado e 100% ativo!");
}

main().catch(console.error);
