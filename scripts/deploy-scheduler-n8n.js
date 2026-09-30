const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";
const WORKFLOW_ID = "7aCD8LiQyFAXi9yp";

const devocionalCode = `const base = String($env.CK_BASE_URL || "https://www.conectaking.com.br").replace(/\\/$/, "");
const token = String($env.CK_AGENT_JWT || "").trim();
const targetChatId = String($env.BIBLIA_GROUP_CHAT_ID || "78792434").trim();

const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
const start = new Date(now.getFullYear(), 0, 0);
const diff = now - start + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
const doy = Math.min(365, Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24))));
const month = now.getMonth() + 1;
const year = now.getFullYear();
const iso = now.toISOString().slice(0, 10);

async function ck(method, path, body) {
  const opts = {
    method,
    url: base + path,
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(token ? { "Authorization": "Bearer " + token } : {})
    },
    json: true,
    returnFullResponse: true,
    ignoreHttpStatusErrors: true
  };
  if (body !== undefined) opts.body = body;
  return this.helpers.httpRequest.call(this, opts);
}

const temaRes = await ck.call(this, "GET", \`/api/admin/bible/devotionals-365/month-themes/\${year}\`);
const themes = (temaRes.body && (temaRes.body.data?.themes || temaRes.body.themes)) || {};
const temaDoMes = themes[String(month)] || "Passando pelo Deserto";

const devRes = await ck.call(this, "GET", \`/api/bible/devocional-do-dia?date=\${iso}\`);
const d = (devRes.body && devRes.body.data) || {};
const temConteudo = !!(d.reflexao || d.texto || d.content);

let texto = "";
if (temConteudo) {
  const titulo = d.titulo || d.title || "Palavra do Dia";
  const passagem = d.versiculo_ref || d.versiculo || d.passagem || d.ref || "Escrituras Sagradas";
  const vTexto = d.versiculo_texto ? \`"\${d.versiculo_texto}"\\n\\n\` : "";
  const corpo = d.reflexao || d.texto || d.content || "";
  const oracao = d.oracao || d.prayer || "";
  texto = \`🌅 *Devocional do Dia:* \${titulo}\\n\\n📖 *Texto Base:* \${passagem}\\n\\n\${vTexto}\${corpo}\\n\\n\${oracao ? \`🙏 *Oração:*\\n_\${oracao}_\\n\\n\` : ""}Amém! Que Deus abençoe sua jornada. 🙌\`;
} else {
  const genRes = await ck.call(this, "POST", \`/api/admin/bible/devotionals-365/day/\${doy}/generate-ai\`, {
    year,
    temaPersonalizado: temaDoMes,
    temaModo: "mes_auto"
  });
  const gd = (genRes.body && genRes.body.data) || {};
  texto = \`🌅 *Devocional do Dia:* \${gd.titulo || "Palavra do Dia"}\\n\\n📖 *Texto Base:* \${gd.versiculo_ref || gd.passagem || "Escrituras Sagradas"}\\n\\n\${gd.versiculo_texto ? \`"\${gd.versiculo_texto}"\\n\\n\` : ""}\${gd.reflexao || gd.texto || ""}\\n\\n\${gd.oracao ? \`🙏 *Oração:*\\n_\${gd.oracao}_\\n\\n\` : ""}Amém! Que Deus abençoe sua jornada. 🙌\`;
}

return [{
  json: {
    chatId: targetChatId,
    text: texto
  }
}];`;

const prosperidadeCode = `const base = String($env.CK_BASE_URL || "https://www.conectaking.com.br").replace(/\\/$/, "");
const token = String($env.CK_AGENT_JWT || "").trim();
const targetChatId = String($env.BIBLIA_GROUP_CHAT_ID || "78792434").trim();

const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
const diaDoMes = now.getDate();

async function ck(method, path, body) {
  const opts = {
    method,
    url: base + path,
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(token ? { "Authorization": "Bearer " + token } : {})
    },
    json: true,
    returnFullResponse: true,
    ignoreHttpStatusErrors: true
  };
  if (body !== undefined) opts.body = body;
  return this.helpers.httpRequest.call(this, opts);
}

const r = await ck.call(this, "GET", \`/api/bible/prosperidade/ativacao/\${diaDoMes}\`);
const p = (r.body && r.body.data) || {};
const titulo = p.titulo || p.title || \`Sabedoria e Prosperidade\`;
const ref = p.proverbs_ref || p.versiculo_ref || \`Provérbios \${diaDoMes}\`;
const meditacao = p.fundamento_sagrado || p.reflexao || p.texto || "";
const declaracao = p.decreto_entrada || p.declaracao || p.sentenca_ativacao || "";

let texto = "";
if (meditacao && !p.not_published) {
  texto = \`🌙 *31 Dias de Ativação - Prosperidade Antes de Dormir*\\n\\n👑 *Ativação #\${diaDoMes}: \${titulo}*\\n\\n📖 *\${ref}*\\n\\n\${meditacao}\\n\\n💎 *Declare antes de dormir:*\\n_"\${declaracao}"_\\n\\n🕊️ Tenha uma noite abençoada sob a provisão e a sabedoria do Altíssimo!\`;
} else {
  texto = \`🌙 *31 Dias de Ativação - Prosperidade Antes de Dormir*\\n\\n👑 *Ativação #\${diaDoMes}: O Segredo da Sabedoria e da Honra*\\n\\n📖 *Provérbios \${diaDoMes}*\\n\\nAo se deitar nesta noite, entregue ao Senhor todos os seus projetos, seus anseios e seus negócios. A verdadeira prosperidade começa na mente alinhada aos princípios divinos — quando você busca a sabedoria do Alto como um tesouro, o favor e a recompensa o encontram no caminho.\\n\\nDescanse seu coração, liberte-se de toda ansiedade de escassez e permita que o Espírito Santo renove seus pensamentos enquanto você dorme.\\n\\n💎 *Declare antes de dormir:*\\n_"O Senhor é o meu pastor, nada me faltará. Minha mente está em paz, meus passos estão firmados na sabedoria divina e o meu amanhã será próspero e frutífero. Amém!"_\\n\\n🕊️ Tenha uma noite de sono reparador e despertar vitorioso!\`;
}

return [{
  json: {
    chatId: targetChatId,
    text: texto
  }
}];`;

const workflow = {
  name: "CK Scheduler Biblia Diario",
  nodes: [
    {
      id: "cronDevocional06h",
      name: "Cron Devocional 06h",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [-800, 200],
      parameters: {
        rule: {
          interval: [
            {
              field: "cronExpression",
              expression: "0 6 * * *"
            }
          ]
        }
      }
    },
    {
      id: "prepararDevocional",
      name: "Preparar Devocional Matinal",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [-500, 200],
      parameters: {
        jsCode: devocionalCode
      }
    },
    {
      id: "enviarTgDevocional",
      name: "Enviar Telegram Devocional",
      type: "n8n-nodes-base.telegram",
      typeVersion: 1.2,
      position: [-200, 200],
      parameters: {
        chatId: "={{ $json.chatId }}",
        text: "={{ $json.text }}",
        additionalFields: {
          appendAttribution: false,
          parse_mode: "Markdown"
        }
      },
      credentials: {
        telegramApi: {
          id: "g9e8goMSML0vE2JS",
          name: "Telegram account 3"
        }
      }
    },
    {
      id: "cronProsperidade21h",
      name: "Cron Prosperidade 21h",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [-800, 500],
      parameters: {
        rule: {
          interval: [
            {
              field: "cronExpression",
              expression: "0 21 * * *"
            }
          ]
        }
      }
    },
    {
      id: "prepararProsperidade",
      name: "Preparar Prosperidade Noturna",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [-500, 500],
      parameters: {
        jsCode: prosperidadeCode
      }
    },
    {
      id: "enviarTgProsperidade",
      name: "Enviar Telegram Prosperidade",
      type: "n8n-nodes-base.telegram",
      typeVersion: 1.2,
      position: [-200, 500],
      parameters: {
        chatId: "={{ $json.chatId }}",
        text: "={{ $json.text }}",
        additionalFields: {
          appendAttribution: false,
          parse_mode: "Markdown"
        }
      },
      credentials: {
        telegramApi: {
          id: "g9e8goMSML0vE2JS",
          name: "Telegram account 3"
        }
      }
    }
  ],
  connections: {
    "Cron Devocional 06h": {
      main: [
        [
          {
            node: "Preparar Devocional Matinal",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Preparar Devocional Matinal": {
      main: [
        [
          {
            node: "Enviar Telegram Devocional",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Cron Prosperidade 21h": {
      main: [
        [
          {
            node: "Preparar Prosperidade Noturna",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "Preparar Prosperidade Noturna": {
      main: [
        [
          {
            node: "Enviar Telegram Prosperidade",
            type: "main",
            index: 0
          }
        ]
      ]
    }
  },
  settings: {
    executionOrder: "v1",
    timezone: "America/Sao_Paulo"
  }
};

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

async function run() {
  console.log("Updating workflow...");
  const putRes = await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, workflow);
  console.log("PUT status:", putRes.status);
  if (putRes.status !== 200) {
    console.error("PUT error:", JSON.stringify(putRes.body));
    return;
  }
  console.log("Activating workflow...");
  const actRes = await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
  console.log("Activate status:", actRes.status);
  console.log("SUCCESS!");
}

run().catch(console.error);
