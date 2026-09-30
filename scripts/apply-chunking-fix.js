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

const CHUNK_FUNCTION = `
function splitTelegramMessage(text, maxLen = 3900) {
  if (!text || typeof text !== 'string') return [text || ''];
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let splitIdx = remaining.lastIndexOf('\\n\\n', maxLen);
    if (splitIdx < maxLen * 0.4) {
      splitIdx = remaining.lastIndexOf('\\n', maxLen);
    }
    if (splitIdx < maxLen * 0.4) {
      splitIdx = remaining.lastIndexOf('. ', maxLen);
      if (splitIdx !== -1) splitIdx += 1;
    }
    if (splitIdx < maxLen * 0.3) {
      splitIdx = remaining.lastIndexOf(' ', maxLen);
    }
    if (splitIdx <= 0) {
      splitIdx = maxLen;
    }
    const chunk = remaining.substring(0, splitIdx).trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.substring(splitIdx).trim();
  }
  return chunks.length ? chunks : [text];
}
`;

async function updateBibliaAgent() {
  const WORKFLOW_ID = "FnkVNknOa2gV0Tfn";
  console.log("=== Updating CK Agent Telegram IA biblia (" + WORKFLOW_ID + ") ===");
  const getRes = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  if (getRes.status !== 200) throw new Error("Failed to fetch workflow: " + JSON.stringify(getRes.body));

  const wf = getRes.body;
  const execNode = wf.nodes.find(n => n.name === "Executar Bíblia IA");
  if (!execNode) throw new Error("Executar Bíblia IA node not found");

  let code = execNode.parameters.jsCode;

  // Replace the final return statement with chunked return
  const oldReturn = `return [{ json: { ...prev, outMessage } }];`;
  const newReturn = `${CHUNK_FUNCTION}
const chunks = splitTelegramMessage(outMessage, 3900);
return chunks.map(chunk => ({ json: { ...prev, outMessage: chunk } }));`;

  if (code.includes(oldReturn)) {
    code = code.replace(oldReturn, newReturn);
    console.log("Replaced old return with chunked return in Executar Bíblia IA!");
  } else if (!code.includes("splitTelegramMessage")) {
    console.warn("Could not find exact oldReturn, checking last lines...");
    code = code.replace(/return\s*\[\s*\{\s*json\s*:\s*\{\s*\.\.\.prev,\s*outMessage\s*\}\s*\}\s*\];?/, newReturn);
  } else {
    console.log("splitTelegramMessage already present in Executar Bíblia IA.");
  }

  execNode.parameters.jsCode = code;

  // Save workflow
  const putPayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };
  const putRes = await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, putPayload);
  console.log("PUT status:", putRes.status);
  if (putRes.status !== 200) {
    throw new Error("PUT failed: " + JSON.stringify(putRes.body));
  }

  const actRes = await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
  console.log("Activate status:", actRes.status);
  console.log("CK Agent Telegram IA biblia updated and active!");

  // Save to local file as well
  fs.writeFileSync("CK_Agent_Telegram_IA_biblia.json", JSON.stringify(wf, null, 2));
  console.log("Saved updated workflow to CK_Agent_Telegram_IA_biblia.json");
}

async function updateScheduler() {
  const WORKFLOW_ID = "7aCD8LiQyFAXi9yp";
  console.log("\\n=== Updating CK Scheduler Biblia Diario (" + WORKFLOW_ID + ") ===");
  const getRes = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  if (getRes.status !== 200) throw new Error("Failed to fetch scheduler: " + JSON.stringify(getRes.body));

  const wf = getRes.body;

  // 1. Preparar Devocional Matinal
  const matinalNode = wf.nodes.find(n => n.name === "Preparar Devocional Matinal");
  if (matinalNode) {
    let code = matinalNode.parameters.jsCode;
    const oldReturn = `return [{
  json: {
    chatId: targetChatId,
    text: texto
  }
}];`;
    const newReturn = `${CHUNK_FUNCTION}
const chunks = splitTelegramMessage(texto, 3900);
return chunks.map(c => ({
  json: {
    chatId: targetChatId,
    text: c
  }
}));`;
    if (code.includes(oldReturn)) {
      code = code.replace(oldReturn, newReturn);
      matinalNode.parameters.jsCode = code;
      console.log("Added chunking to Preparar Devocional Matinal!");
    }
  }

  // 2. Preparar Prosperidade Noturna
  const noturnaNode = wf.nodes.find(n => n.name === "Preparar Prosperidade Noturna");
  if (noturnaNode) {
    let code = noturnaNode.parameters.jsCode;
    const oldReturn = `return [{
  json: {
    chatId: targetChatId,
    text: texto
  }
}];`;
    const newReturn = `${CHUNK_FUNCTION}
const chunks = splitTelegramMessage(texto, 3900);
return chunks.map(c => ({
  json: {
    chatId: targetChatId,
    text: c
  }
}));`;
    if (code.includes(oldReturn)) {
      code = code.replace(oldReturn, newReturn);
      noturnaNode.parameters.jsCode = code;
      console.log("Added chunking to Preparar Prosperidade Noturna!");
    }
  }

  // Save workflow
  const putPayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };
  const putRes = await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, putPayload);
  console.log("Scheduler PUT status:", putRes.status);
  if (putRes.status !== 200) {
    throw new Error("Scheduler PUT failed: " + JSON.stringify(putRes.body));
  }

  const actRes = await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
  console.log("Scheduler Activate status:", actRes.status);
  console.log("CK Scheduler Biblia Diario updated and active!");
}

async function main() {
  await updateBibliaAgent();
  await updateScheduler();
  console.log("\\nALL UPDATES COMPLETED SUCCESSFULLY!");
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
