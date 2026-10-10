const fs = require('fs');
const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";
const SCHEDULER_ID = "7aCD8LiQyFAXi9yp"; // CK Scheduler Biblia Diario

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

async function main() {
  console.log("1. Buscando workflow atual do Scheduler (" + SCHEDULER_ID + ")...");
  const getRes = await req("GET", `/api/v1/workflows/${SCHEDULER_ID}`);
  if (getRes.status !== 200) {
    throw new Error("Failed to get workflow: " + JSON.stringify(getRes.body));
  }
  const wf = getRes.body;
  fs.writeFileSync("backup_scheduler_before_audio.json", JSON.stringify(wf, null, 2));
  console.log("   Backup salvo em backup_scheduler_before_audio.json");

  // 1. Atualizar Preparar Devocional Matinal (06h)
  const matinalNode = wf.nodes.find(n => n.name === "Preparar Devocional Matinal");
  if (!matinalNode) throw new Error("Nó 'Preparar Devocional Matinal' não encontrado!");

  let matCode = matinalNode.parameters.jsCode;
  
  const audioMatinalSnippet = `
// ── GERAÇÃO E ENVIO DE ÁUDIO NARRADO (OpenAI TTS - Voz Onyx) ────────────
const openaiKey = String($env.OPENAI_API_KEY || "").trim();
const tgToken = String($env.TELEGRAM_BOT_TOKEN || "").trim();

if (openaiKey && tgToken && targetChatId) {
  try {
    const textoAudio = texto
      .replace(/[*_#\`~]/g, '')
      .replace(/[🌅📖🙏🙌🕊️👑🌙💎🗣️]/g, '')
      .replace(/\\n{2,}/g, '. ')
      .trim()
      .slice(0, 4000);

    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + openaiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: "onyx",
        input: textoAudio
      })
    });

    if (ttsRes.ok) {
      const audioBuf = await ttsRes.arrayBuffer();
      const form = new FormData();
      form.append("chat_id", targetChatId);
      form.append("voice", new Blob([audioBuf], { type: "audio/ogg" }), "devocional.ogg");
      form.append("caption", "🎧 *Devocional em Áudio* — Ouça a reflexão de hoje.");
      form.append("parse_mode", "Markdown");

      await fetch(\`https://api.telegram.org/bot\${tgToken}/sendVoice\`, {
        method: "POST",
        body: form
      });
    }
  } catch (errAudio) {
    // Se o áudio falhar, o envio do texto em chunks prossegue sem travar
  }
}
`;

  if (!matCode.includes("GERAÇÃO E ENVIO DE ÁUDIO NARRADO")) {
    // Inserir antes do return de chunks
    matCode = matCode.replace(
      "const chunks = splitTelegramMessage(texto, 3900);",
      audioMatinalSnippet + "\nconst chunks = splitTelegramMessage(texto, 3900);"
    );
    matinalNode.parameters.jsCode = matCode;
    console.log("   ✓ Áudio matinal configurado com sucesso!");
  }

  // 2. Atualizar Preparar Prosperidade Noturna (21h)
  const noturnaNode = wf.nodes.find(n => n.name === "Preparar Prosperidade Noturna");
  if (!noturnaNode) throw new Error("Nó 'Preparar Prosperidade Noturna' não encontrado!");

  let notCode = noturnaNode.parameters.jsCode;

  const audioNoturnaSnippet = `
// ── GERAÇÃO E ENVIO DE ÁUDIO NOTURNO (OpenAI TTS - Voz Onyx) ────────────
const tgToken = String($env.TELEGRAM_BOT_TOKEN || "").trim();

if (openaiKey && tgToken && targetChatId && aiContent) {
  try {
    const textoAudioNoturno = aiContent
      .replace(/[*_#\`~]/g, '')
      .replace(/[🌅📖🙏🙌🕊️👑🌙💎🗣️]/g, '')
      .replace(/\\n{2,}/g, '. ')
      .trim()
      .slice(0, 4000);

    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + openaiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: "onyx",
        input: textoAudioNoturno
      })
    });

    if (ttsRes.ok) {
      const audioBuf = await ttsRes.arrayBuffer();
      const form = new FormData();
      form.append("chat_id", targetChatId);
      form.append("voice", new Blob([audioBuf], { type: "audio/ogg" }), "prosperidade.ogg");
      form.append("caption", "🎧 *Ativação Noturna em Áudio* — Ouça antes de dormir.");
      form.append("parse_mode", "Markdown");

      await fetch(\`https://api.telegram.org/bot\${tgToken}/sendVoice\`, {
        method: "POST",
        body: form
      });
    }
  } catch (errAudio) {
    // Se áudio falhar, prossegue com texto
  }
}
`;

  if (!notCode.includes("GERAÇÃO E ENVIO DE ÁUDIO NOTURNO")) {
    notCode = notCode.replace(
      "const chunks = splitTelegramMessage(mensagemCompleta, 3900);",
      audioNoturnaSnippet + "\nconst chunks = splitTelegramMessage(mensagemCompleta, 3900);"
    );
    noturnaNode.parameters.jsCode = notCode;
    console.log("   ✓ Áudio noturno de Prosperidade configurado com sucesso!");
  }

  // 3. Salvar workflow atualizado no n8n
  console.log("2. Enviando workflow atualizado para o n8n...");
  const putRes = await req("PUT", `/api/v1/workflows/${SCHEDULER_ID}`, {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  });

  if (putRes.status !== 200) {
    throw new Error("Erro ao salvar workflow: " + JSON.stringify(putRes.body));
  }
  console.log("   ✓ Workflow 7aCD8LiQyFAXi9yp atualizado com sucesso!");

  // Reativar
  console.log("3. Reativando workflow...");
  const actRes = await req("POST", `/api/v1/workflows/${SCHEDULER_ID}/activate`);
  console.log("   Status de ativação:", actRes.status);
  console.log("🎉 Devocionais do Canal agora enviarão Texto + Áudio Narrado automaticamente!");
}

main().catch(err => {
  console.error("Erro:", err);
  process.exit(1);
});
