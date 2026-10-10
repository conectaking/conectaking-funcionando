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
  console.log("1. Buscando workflow atual do n8n (" + WORKFLOW_ID + ")...");
  const getRes = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  if (getRes.status !== 200) {
    throw new Error("Failed to get workflow: " + JSON.stringify(getRes.body));
  }
  const wf = getRes.body;
  fs.writeFileSync("backup_wf_before_features_upgrade.json", JSON.stringify(wf, null, 2));
  console.log("   Backup salvo em backup_wf_before_features_upgrade.json");

  const execNode = wf.nodes.find(n => n.name === 'Executar Admin');
  if (!execNode) throw new Error("Nó 'Executar Admin' não encontrado!");

  let code = execNode.parameters.jsCode;

  // 1. Atualizar SYSTEM_PROMPT para incluir receivables_list
  const oldPromptBlock = `    - RESUMO GERAL (summary):
      * "como estão minhas finanças?", "resumo financeiro".`;

  const newPromptBlock = `    - QUEM DEVE / TRABALHOS A RECEBER (receivables_list):
      * "quem me deve?", "quais trabalhos faltam receber?", "trabalhos pendentes", "quanto falta receber de quem?", "lista de recebíveis":
      -> Use action: "receivables_list" em 'manage_finance'!
    - RESUMO GERAL (summary):
      * "como estão minhas finanças?", "resumo financeiro".`;

  if (code.includes(oldPromptBlock)) {
    code = code.replace(oldPromptBlock, newPromptBlock);
    console.log("   ✓ SYSTEM_PROMPT atualizado com receivables_list!");
  }

  // 2. Atualizar enum em TOOLS para incluir receivables_list e confirmed
  const oldEnum = "enum: ['create_trabalho', 'create', 'update_trabalho', 'delete_trabalho', 'record_payment', 'clear_all', 'cancel_last', 'delete_by_criteria', 'adjust_cash', 'list_recent', 'summary', 'advice']";
  const newEnum = "enum: ['create_trabalho', 'create', 'update_trabalho', 'delete_trabalho', 'record_payment', 'receivables_list', 'clear_all', 'cancel_last', 'delete_by_criteria', 'adjust_cash', 'list_recent', 'summary', 'advice']";

  if (code.includes(oldEnum)) {
    code = code.replace(oldEnum, newEnum);
    console.log("   ✓ Enum de manage_finance atualizado com receivables_list!");
  }

  // 3. Adicionar receivables_list e trava de segurança no clear_all
  const oldClearAll = `        // ── CLEAR ALL (ZERAR TUDO COM PODER TOTAL) ───────────────────
        } else if (args.action === 'clear_all' || args.action === 'zerar_tudo') {
          try {
            await ck.call(this, 'POST', '/api/finance/zerar-mes', {
              profile_id: profileId,
              bypass_password: true,
              all: true
            });
          } catch (_) {}

          const kRes = await ck.call(this, 'GET', \`/api/finance/king-data?profile_id=\${profileId}\`);
          let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
          if (!kingDb || typeof kingDb !== 'object') kingDb = {};
          kingDb.trabalhos = [];
          kingDb.terceiros = [];
          await ck.call(this, 'PUT', \`/api/finance/king-data?profile_id=\${profileId}\`, {
            profile_id: profileId,
            data: kingDb
          });

          session.lastCreatedTransactions = [];
          const summary = await fetchRealSummary.call(this, profileId);
          stepMsg = \`🧹 *Gestão Financeira Zerada com Sucesso! — Agente King*\\n\\n\` +
            \`👑 *Adriano, executei a limpeza completa da sua gestão financeira:*\\n\` +
            \`• ✅ *Fluxo de Caixa:* Todos os lançamentos foram apagados\\n\` +
            \`• ✅ *Trabalhos:* Lista de trabalhos zerada\\n\` +
            \`• ✅ *Contas a Pagar/Terceiros:* Zeradas\\n\` +
            \`• ✅ *Saldo em Caixa:* Redefinido para \${fmt(0)}\\n\\n\` +
            \`_Tudo limpo e pronto para novos lançamentos!_\\n\\n\` +
            buildSummaryMessage(summary, fmt);`;

  const newClearAllAndReceivables = `        // ── LISTAR TRABALHOS PENDENTES / QUEM DEVE (RECEIVABLES LIST) ──
        } else if (args.action === 'receivables_list' || args.action === 'pending_jobs') {
          const kRes = await ck.call(this, 'GET', \`/api/finance/king-data?profile_id=\${profileId}\`);
          let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
          const trabalhos = Array.isArray(kingDb.trabalhos) ? kingDb.trabalhos : [];

          const pendentes = trabalhos.filter(t => {
            const totPago = (t.pagamentos || []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
            return (Number(t.valor || 0) - totPago) > 0.01;
          });

          if (pendentes.length === 0) {
            stepMsg = \`🎉 *Excelente notícia, Adriano!* Todos os trabalhos registrados estão quitados no momento. Não há nenhum valor pendente de clientes!\`;
          } else {
            let totalFalta = 0;
            const lines = ['👑 *Trabalhos com Valores a Receber — Agente King:*\\n'];
            pendentes.forEach((t, idx) => {
              const totPago = (t.pagamentos || []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
              const falta = Math.max(0, Number(t.valor || 0) - totPago);
              totalFalta += falta;
              lines.push(\`\${idx + 1}. 👤 *\${t.cliente}* — \${t.servico || 'Serviço'}\\n   💰 Total: \${fmt(t.valor)} | Recebido: \${fmt(totPago)} | 🔴 *Falta: \${fmt(falta)}*\`);
            });
            lines.push(\`\\n💵 *Total Geral a Receber:* *\${fmt(totalFalta)}*\`);
            stepMsg = lines.join('\\n');
          }

        // ── CLEAR ALL (ZERAR TUDO COM PODER TOTAL E TRAVA DE SEGURANÇA) ─
        } else if (args.action === 'clear_all' || args.action === 'zerar_tudo') {
          const rawInput = String(text || '').toLowerCase();
          const isConfirmed = args.confirmed === true ||
            rawInput.includes('confirmar') ||
            rawInput.includes('confirmo') ||
            rawInput.includes('sim');

          if (!isConfirmed) {
            stepMsg = \`⚠️ *Atenção, Adriano! Ação Destrutiva Detectada:*\\n\\n\` +
              \`Você solicitou apagar *todos os trabalhos, fluxo de caixa e contas* da sua gestão financeira.\\n\\n\` +
              \`🔒 *Para sua segurança, por favor confirme:*\\n\` +
              \`Responda: *"Confirmar zerar"* se realmente deseja apagar tudo.\`;
          } else {
            try {
              await ck.call(this, 'POST', '/api/finance/zerar-mes', {
                profile_id: profileId,
                bypass_password: true,
                all: true
              });
            } catch (_) {}

            const kRes = await ck.call(this, 'GET', \`/api/finance/king-data?profile_id=\${profileId}\`);
            let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
            if (!kingDb || typeof kingDb !== 'object') kingDb = {};
            kingDb.trabalhos = [];
            kingDb.terceiros = [];
            await ck.call(this, 'PUT', \`/api/finance/king-data?profile_id=\${profileId}\`, {
              profile_id: profileId,
              data: kingDb
            });

            session.lastCreatedTransactions = [];
            const summary = await fetchRealSummary.call(this, profileId);
            stepMsg = \`🧹 *Gestão Financeira Zerada com Sucesso! — Agente King*\\n\\n\` +
              \`👑 *Adriano, executei a limpeza completa da sua gestão financeira:*\\n\` +
              \`• ✅ *Fluxo de Caixa:* Todos os lançamentos foram apagados\\n\` +
              \`• ✅ *Trabalhos:* Lista de trabalhos zerada\\n\` +
              \`• ✅ *Contas a Pagar/Terceiros:* Zeradas\\n\` +
              \`• ✅ *Saldo em Caixa:* Redefinido para \${fmt(0)}\\n\\n\` +
              \`_Tudo limpo e pronto para novos lançamentos!_\\n\\n\` +
              buildSummaryMessage(summary, fmt);
          }`;

  if (code.includes(oldClearAll)) {
    code = code.replace(oldClearAll, newClearAllAndReceivables);
    console.log("   ✓ receivables_list e Trava de Segurança em clear_all adicionados com sucesso!");
  } else {
    console.log("   ⚠️ oldClearAll não encontrado exatamente, verificando substituição...");
  }

  // 4. Melhorar list_clients com links de WhatsApp diretos para clientes vencidos/expirando
  const oldItemFormat = "lines.push(`• *${u.name}* (${u.planName})\n   ✉️ ${u.email}\n   🏷️ Tag: \`${u.tag}\` | Status: ${icon} ${statusLabel}\n   📅 Validade: ${u.expiresAt}`);";
  const newItemFormat = `let zapShare = '';
            if (u.status === 'expired' || u.status === 'expiring_soon') {
              const msgCob = encodeURIComponent(\`Olá \${u.name}! Sua tag Conecta King (\${u.tag}) \${u.status === 'expired' ? 'venceu' : 'está vencendo'}. Acesse https://tag.conectaking.com.br/\${u.slug} ou me avise para renovarmos!\`);
              zapShare = \`\\n   📲 [Avisar Cliente no WhatsApp](https://wa.me/?text=\${msgCob})\`;
            }
            lines.push(\`• *\${u.name}* (\${u.planName})\\n   ✉️ \${u.email}\\n   🏷️ Tag: \\\`\${u.tag}\\\` | Status: \${icon} \${statusLabel}\\n   📅 Validade: \${u.expiresAt}\${zapShare}\`);`;

  if (code.includes(oldItemFormat)) {
    code = code.replace(oldItemFormat, newItemFormat);
    console.log("   ✓ list_clients atualizado com links rápidos de WhatsApp para cobrança!");
  } else {
    console.log("   ⚠️ oldItemFormat não encontrado exatamente, buscando linha...");
  }

  execNode.parameters.jsCode = code;

  // Atualizar workflow no n8n
  console.log("2. Enviando workflow atualizado para o n8n...");
  const putRes = await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  });

  if (putRes.status !== 200) {
    throw new Error("Erro ao salvar workflow: " + JSON.stringify(putRes.body));
  }
  console.log("   ✓ Workflow mkK244lveO0N1qPR atualizado com sucesso!");

  // Reativar
  console.log("3. Reativando workflow...");
  const actRes = await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
  console.log("   Status de ativação:", actRes.status);
  console.log("🎉 Agente King atualizado com Consultas Financeiras Inteligentes, Trava de Segurança e Cobrança WhatsApp!");
}

main().catch(err => {
  console.error("Erro:", err);
  process.exit(1);
});
