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

async function configureChannel() {
  const SCHEDULER_ID = "7aCD8LiQyFAXi9yp";
  console.log("Configuring channel @devocionalking in Scheduler (" + SCHEDULER_ID + ")...");
  
  const getRes = await req("GET", `/api/v1/workflows/${SCHEDULER_ID}`);
  if (getRes.status !== 200) throw new Error("Failed to fetch scheduler: " + JSON.stringify(getRes.body));
  
  const wf = getRes.body;
  
  // Atualizar Preparar Devocional Matinal
  const matinalNode = wf.nodes.find(n => n.name === "Preparar Devocional Matinal");
  if (matinalNode) {
    let code = matinalNode.parameters.jsCode;
    code = code.replace(
      /const targetChatId = String\(\$env\.BIBLIA_GROUP_CHAT_ID \|\| ["'][^"']*["']\)\.trim\(\);/,
      'const targetChatId = String($env.BIBLIA_GROUP_CHAT_ID || "@devocionalking").trim();'
    );
    matinalNode.parameters.jsCode = code;
    console.log("Updated Preparar Devocional Matinal targetChatId -> @devocionalking");
  }

  // Atualizar Preparar Prosperidade Noturna
  const noturnaNode = wf.nodes.find(n => n.name === "Preparar Prosperidade Noturna");
  if (noturnaNode) {
    let code = noturnaNode.parameters.jsCode;
    code = code.replace(
      /const targetChatId = String\(\$env\.BIBLIA_GROUP_CHAT_ID \|\| ["'][^"']*["']\)\.trim\(\);/,
      'const targetChatId = String($env.BIBLIA_GROUP_CHAT_ID || "@devocionalking").trim();'
    );
    noturnaNode.parameters.jsCode = code;
    console.log("Updated Preparar Prosperidade Noturna targetChatId -> @devocionalking");
  }

  // Salvar Scheduler
  const putPayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };
  const putRes = await req("PUT", `/api/v1/workflows/${SCHEDULER_ID}`, putPayload);
  console.log("Scheduler PUT status:", putRes.status);
  if (putRes.status !== 200) throw new Error("PUT failed: " + JSON.stringify(putRes.body));

  const actRes = await req("POST", `/api/v1/workflows/${SCHEDULER_ID}/activate`);
  console.log("Scheduler Activate status:", actRes.status);

  // Também atualizar staticData default em CK Agent Telegram IA biblia
  const BIBLIA_ID = "FnkVNknOa2gV0Tfn";
  console.log("\\nConfiguring default channel @devocionalking in Biblia Agent (" + BIBLIA_ID + ")...");
  const bibliaGet = await req("GET", `/api/v1/workflows/${BIBLIA_ID}`);
  if (bibliaGet.status === 200) {
    const bibliaWf = bibliaGet.body;
    const execNode = bibliaWf.nodes.find(n => n.name === "Executar Bíblia IA");
    if (execNode) {
      let code = execNode.parameters.jsCode;
      if (!code.includes("@devocionalking")) {
        code = code.replace("if (!store.chats) store.chats = {};", 'if (!store.chats) store.chats = {};\nstore.activeChannelId = store.activeChannelId || "@devocionalking";');
        execNode.parameters.jsCode = code;
        await req("PUT", `/api/v1/workflows/${BIBLIA_ID}`, {
          name: bibliaWf.name,
          nodes: bibliaWf.nodes,
          connections: bibliaWf.connections,
          settings: bibliaWf.settings
        });
        await req("POST", `/api/v1/workflows/${BIBLIA_ID}/activate`);
        console.log("Biblia Agent updated with default channel @devocionalking!");
      }
    }
  }

  console.log("\\n>>> CHANNEL @devocionalking CONFIGURED AND ACTIVATED IN BOTH WORKFLOWS! <<<");
}

configureChannel().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
