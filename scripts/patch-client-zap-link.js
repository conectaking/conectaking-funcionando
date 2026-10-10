const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";
const WORKFLOW_ID = "mkK244lveO0N1qPR";

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
  console.log("Buscando workflow...");
  const getRes = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  const wf = getRes.body;
  const execNode = wf.nodes.find(n => n.name === 'Executar Admin');
  let code = execNode.parameters.jsCode;

  const targetNew = `listText = filtered.map((u, i) => {
              const statusEmoji = u.status === 'expired' ? '🔴 Vencido' : (u.status === 'expiring_soon' ? '⏳ Expirando' : '🟢 Ativo');
              const adminBadge = u.isAdmin ? ' 👑 [ADMIN]' : '';
              let cobrancaZap = '';
              if (u.status === 'expired' || u.status === 'expiring_soon') {
                const cobMsg = encodeURIComponent('Olá ' + u.name + '! Sua assinatura da tag Conecta King (' + u.tag + ') ' + (u.status === 'expired' ? 'venceu' : 'está vencendo') + '. Acesse https://tag.conectaking.com.br/' + (u.slug || u.tag) + ' ou me avise aqui para renovarmos!');
                cobrancaZap = '\\n   📲 [Cobrar no WhatsApp](https://wa.me/?text=' + cobMsg + ')';
              }
              return \`\${i + 1}. *\${u.name}*\${adminBadge}\\n\` +
                     \`   ✉️ \\\`\${u.email}\\\`\\n\` +
                     \`   🏷️ Tag: \\\`\${u.tag}\\\` | 💎 Plano: *\${u.planName}*\\n\` +
                     \`   📅 Validade: \${u.expiresAt} (\${statusEmoji})\${cobrancaZap}\`;
            }).join('\\n\\n');`;

  const regex = /listText = filtered\.map\([\s\S]*?\}\)\.join\('\\n\\n'\);/;
  if (regex.test(code)) {
    code = code.replace(regex, targetNew);
    execNode.parameters.jsCode = code;
    console.log("Substituição com regex realizada!");
    await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, {
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings
    });
    await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
    console.log("✓ Workflow atualizado com link WhatsApp para cobrança direta!");
  } else {
    console.log("Regex não encontrou o bloco.");
  }
}

main().catch(console.error);
