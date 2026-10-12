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
  console.log(`Checking ${execs.length} executions...`);
  for (const e of execs) {
    const id = e.id;
    const res = await req("GET", `/api/v1/executions/${id}?includeData=true`);
    const runData = res.body?.data?.resultData?.runData;
    if (runData?.['Telegram Trigger']) {
      const tg = runData['Telegram Trigger']?.[0]?.data?.main?.[0]?.[0]?.json;
      const whisper = runData['Whisper']?.[0]?.data?.main?.[0]?.[0]?.json;
      const text = tg?.message?.text || whisper?.text;
      const adminNode = runData?.['Executar Admin']?.[0]?.data?.main?.[0]?.[0]?.json;
      console.log(`[EXEC ${id}] (${e.startedAt})`);
      console.log(`  USER: ${text || '(voice without whisper)'}`);
      if (adminNode?.outMessage) {
        console.log(`  BOT: ${adminNode.outMessage.replace(/\n/g, ' ').slice(0, 160)}`);
      }
    }
  }
}

main().catch(console.error);
