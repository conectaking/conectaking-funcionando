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
  fs.writeFileSync("backup_wf_before_finance_rules_fix.json", JSON.stringify(wf, null, 2));

  const execNode = wf.nodes.find(n => n.name === 'Executar Admin');
  if (!execNode) throw new Error("Nó 'Executar Admin' não encontrado!");

  let code = execNode.parameters.jsCode;

  // 1. INJETAR REGRAS BLINDADAS DE PARCELAS / DÉBITOS / CORREÇÕES NO PROMPT
  const bulletproofFinancePrompt = `
═══ REGRAS SUPREMAS DE PARCELAS, DÉBITOS E CORREÇÕES FINANCEIRAS (BLINDADAS) ═══
1. PARCELAS A PAGAR / PRESTAÇÕES / BOLETOS FUTUROS (REGRA ABSOLUTA):
   - Se o Adriano disser "prestações que falta eu pagar", "parcelas que tenho que pagar", "comprei parcelado em 10x de 38", "falta 10 meses ainda eu pagar 38 por mês", "coloca no meu financeiro e me lembra todo dia 4":
     -> É OBRIGATORIAMENTE DESPESA PENDENTE: type: "EXPENSE", status: "PENDING"!
     -> ⚠️ NUNCA, JAMAIS coloque como type: "INCOME" (Receita)! O Adriano está PAGANDO, é SAÍDA FUTURA!
     -> ⚠️ NUNCA, JAMAIS coloque como status: "PAID" (Pago)! Isso subtrairia do caixa de hoje e deixaria o saldo negativo!
     -> Lance cada parcela com data futura correspondente (ex: dia 04 do mês que vem em diante) e status "PENDING".
     -> E crie os lembretes na agenda com 'manage_agenda' para cada data às 08:00!

2. CORREÇÃO / REMOVER LANÇAMENTO / "PODE TIRAR" / "ERROU":
   - Se o Adriano disser: "esses 38 não é receita é despesa", "pode tirar", "retire esses 38", "ficou negativo corrija", "tira o último", "apaga isso", "errei o valor":
     -> ⚠️ NUNCA chame 'clear_system_errors'! Isso é para erros de servidor/técnicos, não finanças!
     -> ⚠️ NUNCA crie novos lançamentos com os números que o Adriano citou na reclamação! Se ele disser "você colocou 32 de despesa retire", NÃO crie outra despesa de 32!
     -> CHAME 'manage_finance' com action: "delete_by_criteria" (passando amount: 38 ou amount: 32) OU action: "cancel_last" para remover as transações erradas!

3. DISTINÇÃO ENTRE ENTRADA E SAÍDA:
   - "RECEITA" (INCOME): Dinheiro que ENTRA (venda, trabalho, cliente pagou, pix recebido).
   - "DESPESA" (EXPENSE): Dinheiro que SAI (compras, contas, almoço, Shopee, compras na farmácia).
   - "PAID": Já saiu ou já entrou do bolso/conta hoje.
   - "PENDING": Vai sair ou vai entrar no futuro (parcelas, contas a vencer).
`;

  if (!code.includes('REGRAS SUPREMAS DE PARCELAS, DÉBITOS E CORREÇÕES')) {
    code = code.replace(
      '═══ PODERES DO SUPER AGENTE KING',
      bulletproofFinancePrompt + '\n═══ PODERES DO SUPER AGENTE KING'
    );
    console.log("   + Regras blindadas de finanças injetadas no SYSTEM_PROMPT!");
  }

  // 2. MELHORAR O HANDLER DE delete_by_criteria PARA SER MAIS INTELIGENTE E TOLERANTE
  const oldDeleteByCriteria = `        } else if (args.action === 'delete_by_criteria') {
          const crit = args.criteria || {};
          const recent = await fetchRecentTransactions.call(this, 20);
          let targets = recent.filter(t => {
            const amountMatch = crit.amount ? Math.abs(Number(t.amount) - crit.amount) < 0.02 : true;
            const descMatch = crit.description_contains
              ? String(t.description || '').toLowerCase().includes(String(crit.description_contains).toLowerCase())
              : true;
            const typeMatch = (crit.type && crit.type !== 'any') ? t.type === crit.type : true;
            return amountMatch && descMatch && typeMatch;
          });
          if (targets.length === 0) {
            const listLines = recent.slice(0, 8).map((t, i) => \`\${i + 1}. \${t.type === 'INCOME' ? '💵' : '💸'} \${fmt(t.amount)} — _\${t.description}_ (\${t.status}) [ID: \${t.id}]\`);
            stepMsg = '⚠️ Não encontrei transação com esse critério. Seus últimos lançamentos:\\n\\n' + listLines.join('\\n') + '\\n\\nMe fala qual quer tirar.';
          } else {
            const deleted = [];
            for (const t of targets.slice(0, 3)) {
              const dr = await ck.call(this, 'DELETE', \`/api/finance/transactions/\${t.id}\`);
              if (dr.statusCode >= 200 && dr.statusCode < 300) deleted.push(t);
            }
            session.lastCreatedTransactions = [];
            const summary = await fetchRealSummary.call(this, profileId);
            const lines = deleted.map(t => \`• \${fmt(t.amount)} — \${t.description}\`);
            stepMsg = \`🗑️ *Lançamento(s) Removido(s):*\\n\${lines.join('\\n')}\\n\\n\` + buildSummaryMessage(summary, fmt);
          }`;

  const smartDeleteByCriteria = `        } else if (args.action === 'delete_by_criteria') {
          const crit = args.criteria || {};
          const recent = await fetchRecentTransactions.call(this, 30);
          let targets = recent.filter(t => {
            const amountMatch = crit.amount ? Math.abs(Number(t.amount) - crit.amount) < 1.0 : true;
            let descMatch = true;
            if (crit.description_contains) {
              const needle = String(crit.description_contains).toLowerCase().trim();
              const haystack = String(t.description || '').toLowerCase();
              descMatch = haystack.includes(needle) || (needle.includes('shopee') && haystack.includes('shobi')) || (needle.includes('shobi') && haystack.includes('shopee'));
            }
            const typeMatch = (crit.type && crit.type !== 'any') ? t.type === crit.type : true;
            return amountMatch && (crit.amount ? true : descMatch) && typeMatch;
          });
          
          // Se mesmo assim não achou por descrição mas tem valor aproximado:
          if (targets.length === 0 && crit.amount) {
            targets = recent.filter(t => Math.abs(Number(t.amount) - crit.amount) < 1.0);
          }

          if (targets.length === 0) {
            const listLines = recent.slice(0, 8).map((t, i) => \`\${i + 1}. \${t.type === 'INCOME' ? '💵' : '💸'} \${fmt(t.amount)} — _\${t.description}_ (\${t.status}) [ID: \${t.id}]\`);
            stepMsg = '⚠️ Nenhuma transação encontrada com esse critério. Seus lançamentos mais recentes:\\n\\n' + listLines.join('\\n') + '\\n\\nMe fala qual o ID ou valor que quer remover.';
          } else {
            const deleted = [];
            for (const t of targets.slice(0, 5)) {
              const dr = await ck.call(this, 'DELETE', \`/api/finance/transactions/\${t.id}\`);
              if (dr.statusCode >= 200 && dr.statusCode < 300) deleted.push(t);
            }
            session.lastCreatedTransactions = [];
            const summary = await fetchRealSummary.call(this, profileId);
            const lines = deleted.map(t => \`• \${fmt(t.amount)} — \${t.description} (\${t.status})\`);
            stepMsg = \`🗑️ *Lançamento(s) Removido(s) com Sucesso!*\\n\${lines.join('\\n')}\\n\\n\` + buildSummaryMessage(summary, fmt);
          }`;

  if (code.includes('args.action === \'delete_by_criteria\'')) {
    code = code.replace(oldDeleteByCriteria, smartDeleteByCriteria);
    console.log("   + delete_by_criteria atualizado para busca inteligente e tolerante!");
  }

  execNode.parameters.jsCode = code;

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

  console.log("\n✅ REGRAS DE PARCELAS E CORREÇÃO IMPLANTADAS COM SUCESSO!");
}

main().catch(console.error);
