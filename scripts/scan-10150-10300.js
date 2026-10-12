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
  for (let id = 10300; id >= 10150; id -= 5) {
    const ids = [];
    for (let j = 0; j < 5; j++) ids.push(id - j);
    await Promise.all(ids.map(async (eid) => {
      try {
        const res = await req("GET", `/api/v1/executions/${eid}?includeData=true`);
        const runData = res.body?.data?.resultData?.runData;
        if (!runData) return;
        const tg = runData['Telegram Trigger']?.[0]?.data?.main?.[0]?.[0]?.json;
        const whisper = runData['Whisper']?.[0]?.data?.main?.[0]?.[0]?.json;
        const text = tg?.message?.text || whisper?.text;
        const adminNode = runData?.['Executar Admin']?.[0]?.data?.main?.[0]?.[0]?.json;
        if (text || adminNode?.outMessage) {
          console.log(`\n=== EXEC ${eid} ===`);
          if (text) console.log("USER:", text);
          if (adminNode?.outMessage) console.log("BOT:", adminNode.outMessage.replace(/\n/g, ' ').slice(0, 200));
        }
      } catch (err) {}
    }));
  }
}

main().catch(console.error);
