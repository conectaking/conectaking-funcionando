const fs = require('fs');
const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";
const SCHEDULER_ID = "7aCD8LiQyFAXi9yp";

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
  console.log("1. Buscando workflow do Scheduler (" + SCHEDULER_ID + ")...");
  const getRes = await req("GET", `/api/v1/workflows/${SCHEDULER_ID}`);
  const wf = getRes.body;

  // 1. Atualizar Preparar Prosperidade Noturna com gravação e persistência do file_id no king-data
  const noturnaNode = wf.nodes.find(n => n.name === "Preparar Prosperidade Noturna");
  let notCode = noturnaNode.parameters.jsCode;

  // Substituir bloco de áudio noturno por versão que extrai e salva file_id
  const audioCodeReplacement = `
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
      form.append("caption", "🎧 *Ativação Noturna em Áudio* — Provérbios " + capProverbios + "\\n_Ouça a ativação profética antes de dormir._");
      form.append("parse_mode", "Markdown");

      const tgSendRes = await fetch(\`https://api.telegram.org/bot\${tgToken}/sendVoice\`, {
        method: "POST",
        body: form
      });
      const tgJson = await tgSendRes.json().catch(() => ({}));
      const fileId = tgJson?.result?.voice?.file_id;

      if (fileId) {
        try {
          const kRes = await ck.call(this, "GET", "/api/finance/king-data?profile_id=1");
          let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
          if (!kingDb.audios_diarios) kingDb.audios_diarios = {};
          const todayIso = new Date().toISOString().slice(0, 10);
          if (kingDb.audios_diarios.prosperidade_hoje && kingDb.audios_diarios.prosperidade_hoje.data !== todayIso) {
            kingDb.audios_diarios.prosperidade_ontem = kingDb.audios_diarios.prosperidade_hoje;
          }
          kingDb.audios_diarios.prosperidade_hoje = {
            data: todayIso,
            capitulo: capProverbios,
            titulo: "Ativação Noturna #" + capProverbios + " · Provérbios " + capProverbios,
            file_id: fileId
          };
          await ck.call(this, "PUT", "/api/finance/king-data?profile_id=1", {
            profile_id: 1,
            data: kingDb
          });
        } catch (_) {}
      }
    }
  } catch (errAudio) {
    // Se o áudio oscilar, o texto em partes continua normalmente
  }
}
`;

  // Substituir bloco antigo
  notCode = notCode.replace(
    /\/\/\s*──\s*GERAÇÃO E ENVIO DE ÁUDIO NOTURNO[\s\S]*?\}\s*\}\s*\}/,
    audioCodeReplacement.trim()
  );
  noturnaNode.parameters.jsCode = notCode;

  // 2. Atualizar Preparar Devocional Matinal para salvar file_id de devocional matinal
  const matinalNode = wf.nodes.find(n => n.name === "Preparar Devocional Matinal");
  let matCode = matinalNode.parameters.jsCode;

  const matinalAudioReplacement = `
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

      const tgSendRes = await fetch(\`https://api.telegram.org/bot\${tgToken}/sendVoice\`, {
        method: "POST",
        body: form
      });
      const tgJson = await tgSendRes.json().catch(() => ({}));
      const fileId = tgJson?.result?.voice?.file_id;

      if (fileId) {
        try {
          const kRes = await ck.call(this, "GET", "/api/finance/king-data?profile_id=1");
          let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
          if (!kingDb.audios_diarios) kingDb.audios_diarios = {};
          const todayIso = new Date().toISOString().slice(0, 10);
          if (kingDb.audios_diarios.devocional_hoje && kingDb.audios_diarios.devocional_hoje.data !== todayIso) {
            kingDb.audios_diarios.devocional_ontem = kingDb.audios_diarios.devocional_hoje;
          }
          kingDb.audios_diarios.devocional_hoje = {
            data: todayIso,
            titulo: "Devocional Matinal",
            file_id: fileId
          };
          await ck.call(this, "PUT", "/api/finance/king-data?profile_id=1", {
            profile_id: 1,
            data: kingDb
          });
        } catch (_) {}
      }
    }
  } catch (errAudio) {
    // Se o áudio oscilar, o envio do texto em chunks prossegue sem travar
  }
}
`;

  matCode = matCode.replace(
    /\/\/\s*──\s*GERAÇÃO E ENVIO DE ÁUDIO NARRADO[\s\S]*?\}\s*\}\s*\}/,
    matinalAudioReplacement.trim()
  );
  matinalNode.parameters.jsCode = matCode;

  // 3. Adicionar Webhook temporário para disparar a ativação de hoje imediatamente
  let webhookNode = wf.nodes.find(n => n.name === "Webhook Disparar Agora");
  if (!webhookNode) {
    webhookNode = {
      id: "webhookDispararAgora",
      name: "Webhook Disparar Agora",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [-800, 700],
      parameters: {
        httpMethod: "GET",
        path: "disparar-ativacao-hoje",
        responseMode: "onReceived",
        options: {}
      }
    };
    wf.nodes.push(webhookNode);
    wf.connections["Webhook Disparar Agora"] = {
      main: [
        [
          {
            node: "Preparar Prosperidade Noturna",
            type: "main",
            index: 0
          }
        ]
      ]
    };
    console.log("   ✓ Nó Webhook Disparar Agora conectado com sucesso!");
  }

  // Salvar workflow
  console.log("2. Enviando workflow atualizado para o n8n...");
  const putRes = await req("PUT", `/api/v1/workflows/${SCHEDULER_ID}`, {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  });

  if (putRes.status !== 200) {
    throw new Error("Erro ao salvar: " + JSON.stringify(putRes.body));
  }
  await req("POST", `/api/v1/workflows/${SCHEDULER_ID}/activate`);
  console.log("✓ Scheduler atualizado com persistência de file_id e webhook de disparo!");
}

main().catch(console.error);
