const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";
const WF_ID = "mkK244lveO0N1qPR";

function req(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "n8n.conectaking.com.br",
      port: 443,
      path: path,
      method: method,
      headers: {
        "X-N8N-API-KEY": API_KEY,
        "Content-Type": "application/json"
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
    r.end();
  });
}

async function main() {
  const list = await req("GET", `/api/v1/executions?workflowId=${WF_ID}&limit=100`);
  const execs = list.body?.data || [];
  for (const e of execs) {
    const id = e.id;
    const res = await req("GET", `/api/v1/executions/${id}?includeData=true`);
    const str = JSON.stringify(res.body);
    if (str.includes("Katiane") || str.includes("empresa") || str.includes("500") || str.includes("trabalhos")) {
      console.log(`\n=== FOUND IN EXEC ${id} (${e.startedAt}) ===`);
      const runData = res.body?.data?.resultData?.runData;
      const adminNode = runData?.['Executar Admin']?.[0]?.data?.main?.[0]?.[0]?.json;
      if (adminNode) {
        console.log("outMessage:", adminNode.outMessage);
      }
      // Check if any HTTP request or node has the full json
      const matches = str.match(/\{[^{}]*"cliente"[^{}]*\}/g);
      if (matches) console.log("Trabalho matches:", matches);
      const matchesTerc = str.match(/\{[^{}]*"contas"[^{}]*\}/g);
      if (matchesTerc) console.log("Terceiro matches:", matchesTerc);
    }
  }
}

main().catch(console.error);
