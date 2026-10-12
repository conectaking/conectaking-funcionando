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
  const res = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  console.log("Status:", res.status);
  // No n8n podemos consultar execuções recentes do workflow!
  const execs = await req("GET", `/api/v1/executions?workflowId=${WORKFLOW_ID}&limit=10`);
  console.log("Execs:", execs.body?.data?.length || 0);
  if (execs.body?.data?.length > 0) {
    for (const ex of execs.body.data.slice(0, 5)) {
      console.log(`- Exec ${ex.id} (${ex.createdAt}): status=${ex.status}`);
    }
  }
}

main().catch(console.error);
