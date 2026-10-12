const fs = require('fs');
const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";
const WORKFLOW_ID = "mkK244lveO0N1qPR"; // CK Agent Telegram IA Boot

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
  console.log("1. Buscando workflow atual do n8n...");
  const getRes = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  if (getRes.status !== 200) {
    throw new Error("Erro ao buscar workflow: " + JSON.stringify(getRes.body));
  }
  const wf = getRes.body;
  fs.writeFileSync("backup_wf_before_length_fix.json", JSON.stringify(wf, null, 2));
  console.log("   Backup salvo em backup_wf_before_length_fix.json");

  // 1. Atualizar Executar Admin para agregar lembretes múltiplos
  const execNode = wf.nodes.find(n => n.name === 'Executar Admin');
  if (!execNode) throw new Error("Nó 'Executar Admin' não encontrado!");

  let code = execNode.parameters.jsCode;

  // A) Inicializar allCreatedAgendaItems
  if (!code.includes('const allCreatedAgendaItems = [];')) {
    code = code.replace(
      'const allCreatedTransactions = [];',
      'const allCreatedTransactions = [];\n      const allCreatedAgendaItems = [];'
    );
    console.log("   + const allCreatedAgendaItems = [] adicionado");
  }

  // B) Salvar itens de agenda em allCreatedAgendaItems ao invés de concatenar stepMsg repetitivo
  const sIdx = code.indexOf('const icone = isLembrete ?');
  const eIdx = code.indexOf('// ── LISTAR AGENDA & LEMBRETES', sIdx);

  if (sIdx !== -1 && eIdx !== -1) {
    const replacement = `const icone = isLembrete ? '⏰' : (args.tipo === 'ensaio' ? '📸' : (isMentoria ? '🎓' : '📅'));
          const header = isLembrete ? 'Novo Lembrete Registrado!' : 'Compromisso Agendado com Sucesso!';

          allCreatedAgendaItems.push({
            icone,
            header,
            isLembrete,
            isMentoria,
            titulo,
            data,
            dataFormatada,
            horaInicio,
            horaFim,
            local,
            descricao,
            gCalUrl
          });\n\n        `;
    code = code.slice(0, sIdx) + replacement + code.slice(eIdx);
    console.log("   + Salvo de agenda substituído por allCreatedAgendaItems.push!");
  } else {
    console.log("   (Aviso: trecho de criação de agenda não encontrado por índice)");
  }

  // C) Adicionar agregação de allCreatedAgendaItems após o loop de tool_calls
  const agendaAggregationCode = `
    if (allCreatedAgendaItems.length > 0) {
      if (allCreatedAgendaItems.length === 1) {
        const it = allCreatedAgendaItems[0];
        const singleMsg = \`\${it.icone} *\${it.header} — Agente King*\\n\\n\` +
          \`📌 *\${it.isLembrete ? 'Lembrete' : (it.isMentoria ? 'Mentoria' : 'Compromisso')}:* \${it.titulo}\\n\` +
          \`🗓️ *Data:* \${it.dataFormatada}\\n\` +
          \`⏰ *Horário:* \${it.horaInicio}\${it.horaFim ? ' às ' + it.horaFim : ''}\\n\` +
          (it.local ? \`📍 *Local:* \${it.local}\\n\` : '') +
          (it.descricao ? \`📝 *Observações:* \${it.descricao}\\n\` : '') +
          \`\\n📲 [Toque aqui para Adicionar ao seu Google Agenda](\${it.gCalUrl})\\n\` +
          \`_(Ao tocar, abre no app Google Agenda do seu celular com alarme e notificação prontos!)_\\n\\n\` +
          \`🔔 *Lembretes Ativos Configurados:*\\n\` +
          \`• ☀️ *Começo do dia:* Aviso às 08h–09h da manhã no Telegram\\n\` +
          \`• 🌤️ *Meio do dia:* Aviso às 12h–13h no Telegram\\n\` +
          \`• ⏰ *30 minutos antes:* Alarme no Google Agenda e aviso no Telegram\\n\` +
          \`• ⚡ *15 minutos antes e na hora exata:* Alarme e aviso no Telegram\`;
        toolResponses.push(singleMsg);
      } else {
        const count = allCreatedAgendaItems.length;
        const lines = [\`⏰ *\${count} Novos Lembretes Registrados com Sucesso! — Agente King*\\n\`];
        allCreatedAgendaItems.forEach((it, idx) => {
          lines.push(\`\${idx + 1}. \${it.icone} *\${it.titulo}*\\n   🗓️ *Data:* \${it.dataFormatada} às \${it.horaInicio}\\n   📲 [Google Agenda](\${it.gCalUrl})\`);
        });
        lines.push(\`\\n🔔 *Lembretes Ativos Configurados para todas as \${count} datas:*\\n• Notificações no Telegram de manhã (8h), meio-dia (12h), 30min e 15min antes!\`);
        toolResponses.push(lines.join('\\n'));
      }
    }
`;

  if (!code.includes('allCreatedAgendaItems.length > 0')) {
    code = code.replace(
      'if (allCreatedTransactions.length > 0) {',
      agendaAggregationCode + '\n    if (allCreatedTransactions.length > 0) {'
    );
    console.log("   + Agregação de agenda injetada com sucesso!");
  }

  execNode.parameters.jsCode = code;

  // 2. Criar ou Atualizar o nó 'Dividir Mensagem TG'
  const splitterJsCode = `function fixTelegramMarkdown(text) {
  if (!text) return '';
  let t = String(text);
  const underscores = (t.match(/_/g) || []).length;
  if (underscores % 2 !== 0) {
    let count = 0;
    t = t.replace(/_/g, m => (++count === underscores ? '' : m));
  }
  const stars = (t.match(/\\*/g) || []).length;
  if (stars % 2 !== 0) {
    let count = 0;
    t = t.replace(/\\*/g, m => (++count === stars ? '' : m));
  }
  return t;
}

function splitTelegramMessage(text, maxLen = 3800) {
  if (!text) return [''];
  if (text.length <= maxLen) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > maxLen) {
    let splitIdx = remaining.lastIndexOf('\\n\\n', maxLen);
    if (splitIdx === -1 || splitIdx < maxLen * 0.3) {
      splitIdx = remaining.lastIndexOf('\\n', maxLen);
    }
    if (splitIdx === -1 || splitIdx < maxLen * 0.3) {
      splitIdx = remaining.lastIndexOf('. ', maxLen);
      if (splitIdx !== -1) splitIdx += 1;
    }
    if (splitIdx === -1 || splitIdx < maxLen * 0.3) {
      splitIdx = remaining.lastIndexOf(' ', maxLen);
    }
    if (splitIdx === -1 || splitIdx < maxLen * 0.3) {
      splitIdx = maxLen;
    }

    const chunk = remaining.slice(0, splitIdx).trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.slice(splitIdx).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }
  return chunks;
}

const outItems = [];

for (const item of $input.all()) {
  const rawMsg = item.json.outMessage || item.json.output || item.json.message || '';
  if (!rawMsg) {
    outItems.push(item);
    continue;
  }

  const parts = splitTelegramMessage(rawMsg, 3800);
  for (const part of parts) {
    const fixedPart = fixTelegramMarkdown(part);
    outItems.push({
      json: {
        ...item.json,
        outMessage: fixedPart
      }
    });
  }
}

return outItems;`;

  let splitterNode = wf.nodes.find(n => n.name === 'Dividir Mensagem TG');
  if (!splitterNode) {
    splitterNode = {
      parameters: {
        jsCode: splitterJsCode
      },
      id: "splitTg01",
      name: "Dividir Mensagem TG",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [ 256, 380 ]
    };
    wf.nodes.push(splitterNode);
    console.log("   + Nó 'Dividir Mensagem TG' adicionado!");
  } else {
    splitterNode.parameters.jsCode = splitterJsCode;
    console.log("   + Nó 'Dividir Mensagem TG' atualizado!");
  }

  // 3. Atualizar conexões:
  // Redirecionar todas as conexões que iam para 'Enviar Telegram' para 'Dividir Mensagem TG'
  // E conectar 'Dividir Mensagem TG' a 'Enviar Telegram'
  for (const [sourceNode, conns] of Object.entries(wf.connections)) {
    if (sourceNode === 'Dividir Mensagem TG') continue;
    if (conns.main) {
      conns.main.forEach(branch => {
        branch.forEach(target => {
          if (target.node === 'Enviar Telegram') {
            target.node = 'Dividir Mensagem TG';
          }
        });
      });
    }
  }

  // Conectar 'Dividir Mensagem TG' -> 'Enviar Telegram'
  wf.connections['Dividir Mensagem TG'] = {
    main: [
      [
        {
          node: "Enviar Telegram",
          type: "main",
          index: 0
        }
      ]
    ]
  };

  console.log("2. Enviando workflow atualizado para o n8n...");
  const putPayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };

  const putRes = await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, putPayload);
  console.log("   PUT status:", putRes.status);
  if (putRes.status !== 200) {
    throw new Error("Erro ao salvar workflow: " + JSON.stringify(putRes.body));
  }

  console.log("3. Reativando workflow...");
  const actRes = await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
  console.log("   Activate status:", actRes.status);

  console.log("\n✅ FIX DE LIMITE DE MENSAGENS E TELEGRAM IMPLANTADO COM SUCESSO!");
}

main().catch(console.error);
