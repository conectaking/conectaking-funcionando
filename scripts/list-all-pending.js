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
  const tempWf = {
    name: "Temp Check All Pending",
    nodes: [
      {
        id: "hook01",
        name: "Webhook",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [100, 200],
        webhookId: "temp-check-pending-hook",
        parameters: {
          path: "temp-check-pending",
          httpMethod: "POST",
          responseMode: "lastNode",
          responseData: "allEntries"
        }
      },
      {
        id: "code01",
        name: "Code",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [300, 200],
        parameters: {
          jsCode: `
const base = String($env.CK_BASE_URL || 'https://www.conectaking.com.br').replace(/\\/$/, '');
const token = String($env.CK_AGENT_JWT || '').trim();

async function ck(method, path, body) {
  const opts = {
    method,
    url: base + path,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    },
    json: true,
    returnFullResponse: true,
    ignoreHttpStatusErrors: true
  };
  if (body !== undefined) opts.body = body;
  return this.helpers.httpRequest.call(this, opts);
}

const txRes = await ck.call(this, 'GET', '/api/finance/transactions?limit=100&status=PENDING');
const raw = txRes.body?.data;
const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);

return [{
  json: {
    pendingTransactions: list
  }
}];
`
        }
      }
    ],
    connections: {
      Webhook: {
        main: [[{ node: "Code", type: "main", index: 0 }]]
      }
    },
    settings: { executionOrder: "v1" }
  };

  const createRes = await req("POST", "/api/v1/workflows", tempWf);
  const wfId = createRes.body.id;
  await req("POST", `/api/v1/workflows/${wfId}/activate`);
  await new Promise(r => setTimeout(r, 1000));
  const hookRes = await callWebhook("/webhook/temp-check-pending", {});
  await req("DELETE", `/api/v1/workflows/${wfId}`);

  console.log("=== PENDING TRANSACTIONS ===");
  console.log(JSON.stringify(hookRes.body, null, 2));
}

main().catch(console.error);
