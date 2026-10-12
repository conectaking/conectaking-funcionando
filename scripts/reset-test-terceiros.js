const https = require('https');
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: "n8n.conectaking.com.br", port: 443, path, method,
      headers: {
        "X-N8N-API-KEY": API_KEY,
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {})
      }
    }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch { resolve(d); }
      });
    });
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function main() {
  const tempWf = {
    name: "Temp Reset Terc",
    nodes: [
      {
        id: "h1", name: "Webhook", type: "n8n-nodes-base.webhook", typeVersion: 2, position: [100, 200],
        parameters: { path: "temp-reset-terc", httpMethod: "POST", responseMode: "lastNode", responseData: "allEntries" }
      },
      {
        id: "c1", name: "Code", type: "n8n-nodes-base.code", typeVersion: 2, position: [300, 200],
        parameters: {
          jsCode: `
            const base = String($env.CK_BASE_URL || 'https://www.conectaking.com.br').replace(/\\/$/, '');
            const token = String($env.CK_AGENT_JWT || '').trim();
            const r = await this.helpers.httpRequest.call(this, {
              method: 'GET', url: base + '/api/finance/king-data?profile_id=1',
              headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
              json: true
            });
            const kd = r.body?.data || r.body || {};
            kd.terceiros = [];
            await this.helpers.httpRequest.call(this, {
              method: 'PUT', url: base + '/api/finance/king-data?profile_id=1',
              headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
              body: { profile_id: 1, data: kd },
              json: true
            });
            return [{ json: { success: true } }];
          `
        }
      }
    ],
    connections: { Webhook: { main: [[{ node: "Code", type: "main", index: 0 }]] } },
    settings: { executionOrder: "v1" }
  };

  const cr = await req("POST", "/api/v1/workflows", tempWf);
  await req("POST", `/api/v1/workflows/${cr.id}/activate`);
  await new Promise(r => setTimeout(r, 800));

  await new Promise(resolve => {
    https.request({ hostname: "n8n.conectaking.com.br", port: 443, path: "/webhook/temp-reset-terc", method: "POST" }, res => resolve()).end();
  });

  await req("DELETE", `/api/v1/workflows/${cr.id}`);
  console.log("✅ Terceiros resetado para array vazio (estado limpo real antes do teste)!");
}

main().catch(console.error);
