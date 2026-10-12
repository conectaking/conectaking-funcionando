const fs = require('fs');
const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";

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

function callWebhook(path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "n8n.conectaking.com.br",
      port: 443,
      path: path,
      method: "POST",
      headers: {
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
  const getRes = await req("GET", `/api/v1/workflows/mkK244lveO0N1qPR`);
  const wf = getRes.body;
  const execNode = wf.nodes.find(n => n.name === 'Executar Admin');
  const liveJsCode = execNode.parameters.jsCode;

  const testPhrases = [
    "quanto era a prestação total as parcelas que eu tinha que pagar o mês que vem da sua coiminha",
    "quantas parcelas eu tenho que pagar o mês que vem",
    "quantas contas que eu tenho que eu tô devendo da socorrinha"
  ];

  for (const phrase of testPhrases) {
    console.log(`\n==================================================`);
    console.log(`💬 TESTANDO FRASE: "${phrase}"`);
    console.log(`==================================================`);

    const tempWf = {
      name: "Temp Test Live Admin Phrase",
      nodes: [
        {
          id: "hook01",
          name: "Webhook",
          type: "n8n-nodes-base.webhook",
          typeVersion: 2,
          position: [100, 200],
          webhookId: "temp-test-admin-hook",
          parameters: {
            path: "temp-test-admin",
            httpMethod: "POST",
            responseMode: "lastNode",
            responseData: "allEntries"
          }
        },
        {
          id: "prep01",
          name: "Preparar",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [200, 200],
          parameters: {
            jsCode: "const b = $input.first().json.body || $input.first().json; return [{ json: { text: b.text, chatId: b.chatId, hadVoice: !!b.hadVoice } }];"
          }
        },
        {
          id: "code01",
          name: "Executar Admin",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [300, 200],
          parameters: {
            jsCode: liveJsCode
          }
        }
      ],
      connections: {
        Webhook: {
          main: [[{ node: "Preparar", type: "main", index: 0 }]]
        },
        Preparar: {
          main: [[{ node: "Executar Admin", type: "main", index: 0 }]]
        }
      },
      settings: { executionOrder: "v1" }
    };

    const cRes = await req("POST", "/api/v1/workflows", tempWf);
    const wfId = cRes.body.id;
    await req("POST", `/api/v1/workflows/${wfId}/activate`);
    await new Promise(r => setTimeout(r, 800));

    const hookRes = await callWebhook("/webhook/temp-test-admin", {
      text: phrase,
      chatId: "test_chat_simulation_" + Date.now(),
      hadVoice: false
    });

    if (hookRes.body?.message === "Error in workflow") {
      const execs = await req("GET", `/api/v1/executions?workflowId=${wfId}&limit=1`);
      if (execs.body?.data?.[0]?.id) {
        const execDet = await req("GET", `/api/v1/executions/${execs.body.data[0].id}?includeData=true`);
        console.log("EXEC ERROR DETAILS:", JSON.stringify(execDet.body?.data?.resultData?.error || execDet.body?.data?.resultData?.runData?.['Executar Admin']?.[0]?.error, null, 2));
      }
    }

    await req("DELETE", `/api/v1/workflows/${wfId}`);

    const resObj = Array.isArray(hookRes.body) ? hookRes.body[0] : hookRes.body;
    console.log("📢 RESPOSTA GERADA PELO AGENTE KING:\n");
    console.log(resObj?.outMessage || JSON.stringify(resObj, null, 2));
  }
}

main().catch(console.error);
