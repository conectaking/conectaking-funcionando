const fs = require('fs');
const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";

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

async function main() {
  const financeCode = fs.readFileSync('scripts/code_agente_king_financas.js', 'utf8');
  const templateNodes = JSON.parse(fs.readFileSync('scripts/template_nodes.json', 'utf8'));

  const prepNode = templateNodes.find(n => n.name === 'Preparar (texto/voz)');
  const tgGetFileNode = templateNodes.find(n => n.name === 'TG getFile');
  const baixarAudioNode = templateNodes.find(n => n.name === 'Baixar áudio');
  const whisperNode = templateNodes.find(n => n.name === 'Whisper');
  const unirVozNode = templateNodes.find(n => n.name === 'Unir voz');
  const dividirTgNode = templateNodes.find(n => n.name === 'Dividir Mensagem TG');
  const enviarTgNode = templateNodes.find(n => n.name === 'Enviar Telegram');

  // Trigger Node
  const triggerNode = {
    id: "tg-trigger-financas",
    name: "Telegram Trigger",
    webhookId: "ck-financas-telegram",
    type: "n8n-nodes-base.telegramTrigger",
    typeVersion: 1.1,
    position: [-1100, 300],
    parameters: {
      updates: ["message", "edited_message"],
      additionalFields: {}
    },
    credentials: {
      telegramApi: {
        id: "MFt7IUN9HkKveUW8", // Will be replaced by dedicated credential when token provided
        name: "Telegram account"
      }
    }
  };

  // If node for voice
  const ifVozNode = {
    id: "if-voz-financas",
    name: "É Voz?",
    type: "n8n-nodes-base.if",
    typeVersion: 2,
    position: [-700, 300],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 1 },
        conditions: [
          {
            id: "cond-voz",
            leftValue: "={{ $json.hadVoice }}",
            rightValue: true,
            operator: { type: "boolean", operation: "equals" }
          }
        ],
        combinator: "and"
      },
      options: {}
    }
  };

  // Node Executar King Finanças
  const execFinancasNode = {
    id: "exec-king-financas",
    name: "Executar King Finanças",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [0, 300],
    parameters: {
      jsCode: financeCode
    }
  };

  // Update positions for clean layout
  prepNode.position = [-900, 300];
  tgGetFileNode.position = [-500, 150];
  baixarAudioNode.position = [-300, 150];
  whisperNode.position = [-100, 150];
  unirVozNode.position = [100, 150];
  dividirTgNode.position = [250, 300];
  enviarTgNode.position = [500, 300];

  const nodes = [
    triggerNode,
    prepNode,
    ifVozNode,
    tgGetFileNode,
    baixarAudioNode,
    whisperNode,
    unirVozNode,
    execFinancasNode,
    dividirTgNode,
    enviarTgNode
  ];

  const connections = {
    "Telegram Trigger": {
      main: [
        [{ node: "Preparar (texto/voz)", type: "main", index: 0 }]
      ]
    },
    "Preparar (texto/voz)": {
      main: [
        [{ node: "É Voz?", type: "main", index: 0 }]
      ]
    },
    "É Voz?": {
      main: [
        // True (É voz)
        [{ node: "TG getFile", type: "main", index: 0 }],
        // False (É texto)
        [{ node: "Executar King Finanças", type: "main", index: 0 }]
      ]
    },
    "TG getFile": {
      main: [
        [{ node: "Baixar áudio", type: "main", index: 0 }]
      ]
    },
    "Baixar áudio": {
      main: [
        [{ node: "Whisper", type: "main", index: 0 }]
      ]
    },
    "Whisper": {
      main: [
        [{ node: "Unir voz", type: "main", index: 0 }]
      ]
    },
    "Unir voz": {
      main: [
        [{ node: "Executar King Finanças", type: "main", index: 0 }]
      ]
    },
    "Executar King Finanças": {
      main: [
        [{ node: "Dividir Mensagem TG", type: "main", index: 0 }]
      ]
    },
    "Dividir Mensagem TG": {
      main: [
        [{ node: "Enviar Telegram", type: "main", index: 0 }]
      ]
    }
  };

  const payload = {
    name: "CK Agente King — Finanças",
    nodes: nodes,
    connections: connections,
    settings: {
      executionOrder: "v1"
    }
  };

  console.log("Criando workflow 'CK Agente King — Finanças' no n8n...");
  const createRes = await req("POST", "/api/v1/workflows", payload);
  console.log("Create status:", createRes.status);
  console.log("Workflow ID:", createRes.body && createRes.body.id);
  fs.writeFileSync('scripts/created_financas_wf.json', JSON.stringify(createRes.body, null, 2));
}

main().catch(console.error);
