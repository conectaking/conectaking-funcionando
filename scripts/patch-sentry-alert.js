const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";
const WORKFLOW_ID = "ckSentryAlert01";

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
  console.log("Buscando workflow ckSentryAlert01...");
  const getRes = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  const wf = getRes.body;
  const fmtNode = wf.nodes.find(n => n.name === 'Formatar Alerta');
  let code = fmtNode.parameters.jsCode;

  const oldAdvice = "'_Reaja no admin ou peça detalhes ao King Assistente._'";
  const newAdvice = "'💡 _Diga \"esse erro persiste?\", \"testar site\" ou \"limpar erros\" ao King Assistente._'";

  if (code.includes(oldAdvice)) {
    code = code.replace(oldAdvice, newAdvice);
    fmtNode.parameters.jsCode = code;
    await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, {
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings
    });
    await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
    console.log("✓ Workflow ckSentryAlert01 atualizado com dica interativa!");
  } else {
    console.log("Aviso: oldAdvice não encontrado.");
  }
}

main().catch(console.error);
