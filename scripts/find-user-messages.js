const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";

function getExecList() {
  return new Promise(resolve => {
    https.get({
      hostname: "n8n.conectaking.com.br", port: 443,
      path: "/api/v1/executions?workflowId=mkK244lveO0N1qPR&limit=60",
      headers: { "X-N8N-API-KEY": API_KEY }
    }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve(JSON.parse(d).data || []); } catch(e) { resolve([]); }
      });
    });
  });
}

function getExec(id) {
  return new Promise(resolve => {
    https.get({
      hostname: "n8n.conectaking.com.br", port: 443,
      path: "/api/v1/executions/" + id + "?includeData=true",
      headers: { "X-N8N-API-KEY": API_KEY }
    }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch(e) { resolve(null); }
      });
    });
  });
}

async function main() {
  const list = await getExecList();
  console.log("Total executions:", list.length);
  for (const item of list) {
    const ex = await getExec(item.id);
    if (!ex) continue;
    const runData = ex.data?.resultData?.runData;
    if (!runData) continue;
    const tgIn = runData['Webhook Telegram']?.[0]?.data?.main?.[0]?.[0]?.json;
    const msg = tgIn?.message?.text || tgIn?.body?.message?.text;
    const whisperNode = runData['Whisper']?.[0]?.data?.main?.[0]?.[0]?.json;
    const audioText = whisperNode?.text;
    const text = msg || audioText;
    if (text) {
      console.log(`[EXEC ${item.id}] [${item.startedAt}] USER SAID: "${text}"`);
      const adminNode = runData['Executar Admin']?.[0]?.data?.main?.[0]?.[0]?.json;
      if (adminNode?.outMessage) {
        console.log(`   -> BOT REPLIED: "${adminNode.outMessage.slice(0, 120)}..."`);
      }
    }
  }
}

main().catch(console.error);
