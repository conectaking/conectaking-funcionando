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

// ─────────────────────────────────────────────────────────────────────────────
// 1. Atualizar Agente King (mkK244lveO0N1qPR)
// ─────────────────────────────────────────────────────────────────────────────
async function updateAgenteKing() {
  const WORKFLOW_ID = "mkK244lveO0N1qPR";
  console.log("1. Atualizando Agente King (" + WORKFLOW_ID + ")...");
  const getRes = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  const wf = getRes.body;
  const execNode = wf.nodes.find(n => n.name === 'Executar Admin');
  let code = execNode.parameters.jsCode;

  // Diretriz no prompt
  const toolPromptGuideline = `10. REENVIAR ÁUDIO DIÁRIO (send_daily_audio):
    * Se o Adriano ou alguém pedir o áudio de hoje ou de ontem (ex: "manda o áudio da ativação", "áudio de hoje", "áudio do devocional", "áudio de ontem"):
    -> Chame SEMPRE 'send_daily_audio' com periodo='hoje' ou 'ontem' e tipo='ativacao' ou 'devocional'. O áudio já gravado será reenviado instantaneamente com zero custo!`;

  if (!code.includes("send_daily_audio")) {
    code = code.replace(
      "9. GERAR CÓDIGO (generate_invite_code): criar código KING-XXXXX.",
      "9. GERAR CÓDIGO (generate_invite_code): criar código KING-XXXXX.\n" + toolPromptGuideline
    );

    // Adicionar Tool
    const newToolDef = `  { type: 'function', function: {
    name: 'send_daily_audio',
    description: 'Reenvia o áudio gravado oficial da palavra (Devocional Matinal ou Ativação Noturna de Prosperidade) do dia atual ou de ontem diretamente no chat do Telegram, sem gerar novo áudio.',
    parameters: {
      type: 'object',
      properties: {
        periodo: { type: 'string', enum: ['hoje', 'ontem'], description: 'Período do áudio: hoje ou ontem (padrão: hoje)' },
        tipo: { type: 'string', enum: ['ativacao', 'devocional'], description: 'Tipo do áudio: ativacao (Ativação Noturna / Provérbios) ou devocional (Devocional Matinal)' }
      }
    }
  } },\n  { type: 'function', function: {\n    name: 'check_system_errors'`;

    code = code.replace(
      /\{\s*type:\s*'function',\s*function:\s*\{\s*name:\s*'check_system_errors'/,
      newToolDef
    );

    // Adicionar Handler
    const handlerSnippet = `      // ── REENVIAR ÁUDIO DIÁRIO (ZERO CUSTO / REPLAY) ──────────────────────
      } else if (fnName === 'send_daily_audio') {
        const periodo = args.periodo || 'hoje';
        const tipo = args.tipo || (text.toLowerCase().includes('devocional') ? 'devocional' : 'ativacao');
        const isOntem = periodo === 'ontem' || text.toLowerCase().includes('ontem');

        const kRes = await ck.call(this, 'GET', '/api/finance/king-data?profile_id=1');
        const kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
        const audios = kingDb.audios_diarios || {};

        let targetAudio = null;
        let tipoLabel = '';

        if (tipo === 'ativacao') {
          targetAudio = isOntem ? audios.prosperidade_ontem : audios.prosperidade_hoje;
          tipoLabel = 'Ativação Noturna de Prosperidade ' + (isOntem ? '(de ontem)' : '(de hoje)');
        } else {
          targetAudio = isOntem ? audios.devocional_ontem : audios.devocional_hoje;
          tipoLabel = 'Devocional ' + (isOntem ? '(de ontem)' : '(de hoje)');
        }

        if (!targetAudio) {
          // Tentar o outro tipo disponível
          targetAudio = isOntem ? (audios.prosperidade_ontem || audios.devocional_ontem) : (audios.prosperidade_hoje || audios.devocional_hoje);
          if (targetAudio) tipoLabel = 'Palavra ' + (isOntem ? '(de ontem)' : '(de hoje)');
        }

        if (targetAudio && targetAudio.file_id) {
          const tgToken = String($env.TELEGRAM_BOT_TOKEN || '').trim();
          try {
            await fetch('https://api.telegram.org/bot' + tgToken + '/sendVoice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                voice: targetAudio.file_id,
                caption: '🎧 *' + tipoLabel + '*\\n_' + (targetAudio.titulo || 'Gravação Oficial') + '_',
                parse_mode: 'Markdown'
              })
            });
            stepMsg = '🎧 *Áudio Reenviado com Sucesso!*\\nAcabei de enviar a gravação de ' + tipoLabel + ' acima. Bom proveito! 🙌';
          } catch (eSend) {
            stepMsg = '⚠️ Falha ao reenviar áudio: ' + String(eSend.message || eSend);
          }
        } else {
          stepMsg = '🎧 Adriano, tenho disponível para reenvio apenas os áudios já gravados de *hoje* e de *ontem*. Se precisar de um dia anterior, posso gerar um novo estudo ou devocional em texto para você!';
        }\n\n      // ── DIAGNÓSTICO DO SISTEMA ────────────────────────────────────────────`;

    code = code.replace(
      /\/\/\s*──\s*DIAGNÓSTICO DO SISTEMA\s*─+/,
      handlerSnippet
    );

    execNode.parameters.jsCode = code;

    await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, {
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings
    });
    await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
    console.log("   ✓ Agente King atualizado com send_daily_audio!");
  } else {
    console.log("   Agente King já possui send_daily_audio.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Atualizar Agente Bíblia (FnkVNknOa2gV0Tfn)
// ─────────────────────────────────────────────────────────────────────────────
async function updateAgenteBiblia() {
  const WORKFLOW_ID = "FnkVNknOa2gV0Tfn";
  console.log("2. Atualizando Agente Bíblia (" + WORKFLOW_ID + ")...");
  const getRes = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  const wf = getRes.body;
  const execNode = wf.nodes.find(n => n.name === 'Executar Bíblia IA');
  let code = execNode.parameters.jsCode;

  if (!code.includes("send_daily_audio")) {
    const bibliaTool = `  {\n    type: 'function',\n    function: {\n      name: 'send_daily_audio',\n      description: 'Reenvia o áudio gravado oficial da Palavra (Devocional ou Ativação Noturna de Prosperidade) do dia atual ou de ontem para o usuário, sem custo de gerar novo áudio.',\n      parameters: {\n        type: 'object',\n        properties: {\n          periodo: { type: 'string', enum: ['hoje', 'ontem'], description: 'Período do áudio: hoje ou ontem (padrão: hoje)' },\n          tipo: { type: 'string', enum: ['ativacao', 'devocional'], description: 'Tipo do áudio: ativacao (Ativação Noturna / Provérbios) ou devocional (Devocional Matinal)' }\n        }\n      }\n    }\n  },\n  // --- TEMAS MENSAIS (ADMIN) ---`;

    code = code.replace(
      /\/\/\s*---\s*TEMAS MENSAIS \(ADMIN\)\s*---/,
      bibliaTool
    );

    const bibliaHandler = `      // REENVIAR ÁUDIO DIÁRIO (ZERO CUSTO / REPLAY)
      if (fnName === 'send_daily_audio') {
        const periodo = args.periodo || 'hoje';
        const tipo = args.tipo || (text.toLowerCase().includes('devocional') ? 'devocional' : 'ativacao');
        const isOntem = periodo === 'ontem' || text.toLowerCase().includes('ontem');

        const kRes = await ck.call(this, 'GET', '/api/finance/king-data?profile_id=1');
        const kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
        const audios = kingDb.audios_diarios || {};

        let targetAudio = null;
        let tipoLabel = '';

        if (tipo === 'ativacao') {
          targetAudio = isOntem ? audios.prosperidade_ontem : audios.prosperidade_hoje;
          tipoLabel = 'Ativação Noturna de Prosperidade ' + (isOntem ? '(de ontem)' : '(de hoje)');
        } else {
          targetAudio = isOntem ? audios.devocional_ontem : audios.devocional_hoje;
          tipoLabel = 'Devocional ' + (isOntem ? '(de ontem)' : '(de hoje)');
        }

        if (!targetAudio) {
          targetAudio = isOntem ? (audios.prosperidade_ontem || audios.devocional_ontem) : (audios.prosperidade_hoje || audios.devocional_hoje);
          if (targetAudio) tipoLabel = 'Palavra ' + (isOntem ? '(de ontem)' : '(de hoje)');
        }

        if (targetAudio && targetAudio.file_id) {
          const tgToken = String($env.TELEGRAM_BOT_TOKEN || '').trim();
          try {
            await fetch('https://api.telegram.org/bot' + tgToken + '/sendVoice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                voice: targetAudio.file_id,
                caption: '🎧 *' + tipoLabel + '*\\n_' + (targetAudio.titulo || 'Gravação Oficial') + '_',
                parse_mode: 'Markdown'
              })
            });
            outMessage = '🎧 *Aqui está o áudio que você pediu!* Acabei de enviar acima a gravação de ' + tipoLabel + '. Que essa palavra abençoe sua vida! 🙌';
          } catch (eSend) {
            outMessage = '⚠️ Falha ao reenviar áudio: ' + String(eSend.message || eSend);
          }
        } else {
          outMessage = '🎧 A paz do Senhor! No momento tenho disponível para reenvio apenas os áudios já gravados de *hoje* e de *ontem*. Se desejar, posso ministrar uma palavra em texto para você agora!';
        }

      // 1. TEMAS MENSAIS DOS DEVOCIONAIS (ADMIN)
      } else if (fnName === 'admin_set_month_themes') {`;

    code = code.replace(
      /\/\/\s*1\.\s*TEMAS MENSAIS DOS DEVOCIONAIS \(ADMIN\)[\s\S]*?if\s*\(fnName === 'admin_set_month_themes'\)\s*\{/,
      bibliaHandler
    );

    execNode.parameters.jsCode = code;

    await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, {
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings
    });
    await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
    console.log("   ✓ Agente Bíblia atualizado com send_daily_audio!");
  } else {
    console.log("   Agente Bíblia já possui send_daily_audio.");
  }
}

async function start() {
  await updateAgenteKing();
  await updateAgenteBiblia();
  console.log("🎉 Reenvio inteligente de áudio (hoje e ontem com zero custo) configurado em ambos os agentes!");
}

start().catch(console.error);
