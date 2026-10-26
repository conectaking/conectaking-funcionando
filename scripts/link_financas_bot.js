const https = require('https');
const fs = require('fs');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";
const WORKFLOW_ID = "J0xNWmOgaJqMsCEa";

const botToken = process.argv[2] ? process.argv[2].trim() : null;

if (!botToken) {
  console.log("Uso: node scripts/link_financas_bot.js <BOT_TOKEN>");
  process.exit(1);
}

function req(method, path, body) {
  return new Promise((resolve) => {
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
    r.on("error", (e) => resolve({ status: 500, body: e.message }));
    if (payload) r.write(payload);
    r.end();
  });
}

function httpsGet(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    }).on("error", (e) => resolve({ ok: false, error: e.message }));
  });
}

async function main() {
  console.log("1. Validando token no Telegram...");
  const me = await httpsGet(`https://api.telegram.org/bot${botToken}/getMe`);
  if (!me || !me.ok) {
    console.error("Token inválido no Telegram:", me);
    process.exit(1);
  }
  console.log(`Bot autenticado com sucesso: @${me.result.username} (${me.result.first_name})`);

  console.log("2. Criando credencial no n8n...");
  const credPayload = {
    name: `Agente King Finanças (@${me.result.username})`,
    type: "telegramApi",
    data: {
      accessToken: botToken
    }
  };

  const credRes = await req("POST", "/api/v1/credentials", credPayload);
  let credId = credRes.body && credRes.body.id;
  if (!credId) {
    console.error("Erro ao criar credencial:", credRes.body);
    process.exit(1);
  }
  console.log("Credencial criada no n8n:", credId);

  console.log("3. Vinculando credencial ao workflow do Agente King Finanças...");
  const getWf = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  const wf = getWf.body;

  const trigger = wf.nodes.find(n => n.name === 'Telegram Trigger');
  if (trigger) {
    trigger.credentials = {
      telegramApi: { id: credId, name: credPayload.name }
    };
  }

  const send = wf.nodes.find(n => n.name === 'Enviar Telegram');
  if (send) {
    send.credentials = {
      telegramApi: { id: credId, name: credPayload.name }
    };
  }

  const putRes = await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  });
  console.log("Workflow atualizado status:", putRes.status);

  console.log("4. Ativando workflow...");
  const actRes = await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
  console.log("Ativação status:", actRes.status);

  console.log("5. Configurando webhook no Telegram...");
  const webhookUrl = "https://n8n.conectaking.com.br/webhook/ck-financas-telegram/webhook";
  const setHook = await httpsGet(`https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
  console.log("Resultado setWebhook:", setHook);

  console.log("\n=======================================================");
  console.log(`🎉 AGENTE KING FINANÇAS CONECTADO COM SUCESSO!`);
  console.log(`Bot Telegram: @${me.result.username}`);
  console.log(`Workflow n8n ID: ${WORKFLOW_ID}`);
  console.log(`Status: Ativo e pronto para responder no Telegram!`);
  console.log("=======================================================");
}

main().catch(console.error);
