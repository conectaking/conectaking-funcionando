const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";

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
  for (const id of ["10525", "10521", "10520", "10519"]) {
    const res = await req("GET", `/api/v1/executions/${id}?includeData=true`);
    const runData = res.body?.data?.resultData?.runData;
    const adminNode = runData?.['Executar Admin']?.[0]?.data?.main?.[0]?.[0]?.json;
    const tgIn = runData?.['Webhook Telegram']?.[0]?.data?.main?.[0]?.[0]?.json;
    console.log(`\n=== EXEC ${id} ===`);
    console.log("TG IN:", tgIn?.message?.text || tgIn?.body?.message?.text || JSON.stringify(tgIn?.body || tgIn)?.slice(0, 100));
    console.log("OUT:", adminNode?.outMessage?.slice(0, 150));
  }
}

main().catch(console.error);
