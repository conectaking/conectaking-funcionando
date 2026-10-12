const fs = require('fs');
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
  console.log("1. Buscando workflow atual do n8n...");
  const getRes = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  if (getRes.status !== 200) {
    throw new Error("Erro ao buscar workflow: " + JSON.stringify(getRes.body));
  }
  const wf = getRes.body;
  fs.writeFileSync("backup_wf_before_finance_debts_upgrade.json", JSON.stringify(wf, null, 2));

  const execNode = wf.nodes.find(n => n.name === 'Executar Admin');
  if (!execNode) throw new Error("Nó 'Executar Admin' não encontrado!");

  let code = execNode.parameters.jsCode;

  // ── 1. REGRAS SUPREMAS DE QUEM EU DEVO NO SYSTEM_PROMPT ───────────────
  const debPrompt = `
═══ REGRAS SUPREMAS DE QUEM EU DEVO (TERCEIROS), DÍVIDAS E PARCELAS (BLINDADAS) ═══
1. DISTINÇÃO CRÍTICA (NUNCA CONFUNDA DÍVIDAS COM CLIENTES OU TRABALHOS):
   - "QUEM EU ESTOU DEVENDO", "PESSOAS QUE EU DEVO", "QUANTO DEVO PARA SOCORRINHA?", "CONTAS QUE FALTA PAGAR PARA [PESSOA]":
     -> É SEMPRE E OBRIGATORIAMENTE GESTÃO FINANCEIRA: Chame 'manage_finance' com action: 'list_debts'!
     -> ⚠️ NUNCA, JAMAIS chame 'list_clients'! 'list_clients' é EXCLUSIVAMENTE para ver a lista de clientes cadastrados/assinantes da plataforma Conecta King.
     -> ⚠️ NUNCA responda que nenhum cliente está com plano vencendo quando o Adriano perguntar sobre quem ele deve! Ele está falando das dívidas pessoais dele na Gestão Financeira ("Quem eu devo")!
     -> ⚠️ NUNCA chame 'receivables_list' ou fale de trabalhos a receber quando ele perguntar sobre quem ele está devendo! Trabalhos a receber são clientes que devem ao Adriano, não o contrário!

2. CONSULTAR DÍVIDAS, PESSOAS E PARCELAS (action: 'list_debts'):
   - "quem eu estou devendo?", "me passa o nome de pessoas que estou devendo":
     -> Chame 'manage_finance' com action: 'list_debts'!
   - "quanto eu devo para Socorrinha?", "quais contas devo para Socorrinha e quantas parcelas?":
     -> Chame 'manage_finance' com action: 'list_debts' e pessoa: 'Socorrinha'!

3. CONTA PARA PAGAR MÊS QUE VEM (DATA ESPECÍFICA):
   - Se o Adriano disser "conta de fulano de tal que é para pagar mês que vem data 10", "conta de R$ 110 para Socorrinha pagar mês que vem dia 10":
     -> Calcule a data de vencimento no mês que vem (ex: se hoje é outubro/2026, mês que vem dia 10 é 2026-11-10)!
     -> Chame 'manage_finance' com action: 'add_debt', pessoa: 'Socorrinha', valor: 110, data_vencimento: '2026-11-10'!
     -> ⚠️ REGRA CRÍTICA: NUNCA registre com a data de hoje nem deste mês! Ela deve ficar EXCLUSIVAMENTE para o mês que vem, para NÃO entrar no "Falta pagar deste mês"!

4. PARCELAMENTO EM N VEZES A PARTIR DO MÊS QUE VEM:
   - Se o Adriano disser "vou pagar essa pessoa 10 vezes a partir do mês que vem", "vou pagar Socorrinha 10 vezes de 110 a partir do mês que vem dia 10", "coloca 10 parcelas de 110 para fulano":
     -> Chame 'manage_finance' com action: 'add_debt', pessoa: 'Socorrinha', valor: 110, parcelas: 10, data_vencimento: '2026-11-10'!
     -> O sistema gerará automaticamente as 10 parcelas distribuídas mês a mês (10/11/2026, 10/12/2026, 10/01/2027 ... até 10/08/2027)!

5. "JÁ PAGUEI ESSA CONTA" / DAR BAIXA:
   - Se o Adriano disser "já paguei a conta de Socorrinha", "paguei ontem", "marca como paga":
     -> Chame 'manage_finance' com action: 'mark_paid' (ou action: 'pay_debt')!
`;

  if (!code.includes('REGRAS SUPREMAS DE QUEM EU DEVO (TERCEIROS)')) {
    code = code.replace(
      '═══ PODER ADMINISTRATIVO TOTAL CONECTA KING',
      debPrompt + '\n═══ PODER ADMINISTRATIVO TOTAL CONECTA KING'
    );
    console.log("   + Regras de Quem Eu Devo inseridas no SYSTEM_PROMPT!");
  }

  // ── 2. ATUALIZAR DESCRIÇÃO DE list_clients PARA NÃO CONFUNDIR COM DÍVIDAS ─
  code = code.replace(
    "name: 'list_clients',\n    description: 'Consulta a visão geral e lista os usuários/clientes cadastrados no Conecta King.",
    "name: 'list_clients',\n    description: '⚠️ NUNCA use para saber quem o Adriano está devendo! Consulta APENAS usuários e clientes assinantes do site Conecta King. Para saber pessoas que ele deve ou dívidas, use manage_finance com list_debts. Consulta a visão geral e lista os usuários/clientes cadastrados no Conecta King."
  );

  // ── 3. ATUALIZAR TOOLS COM NOVAS ACTIONS EM manage_finance ─────────────
  const oldManageFinanceEnum = "enum: ['create_trabalho', 'create', 'update_trabalho', 'delete_trabalho', 'record_payment', 'receivables_list', 'clear_all', 'cancel_last', 'delete_by_criteria', 'adjust_cash', 'list_recent', 'summary', 'advice']";
  const newManageFinanceEnum = "enum: ['create_trabalho', 'create', 'update_trabalho', 'delete_trabalho', 'record_payment', 'receivables_list', 'list_debts', 'add_debt', 'pay_debt', 'mark_paid', 'clear_all', 'cancel_last', 'delete_by_criteria', 'adjust_cash', 'list_recent', 'summary', 'advice']";

  if (code.includes(oldManageFinanceEnum)) {
    code = code.replace(oldManageFinanceEnum, newManageFinanceEnum);
    console.log("   + Enum de manage_finance atualizado com list_debts, add_debt, pay_debt, mark_paid!");
  }

  // Adicionar propriedades em manage_finance se não existirem
  const oldManageFinanceProps = "properties: {\n        action: {\n          type: 'string',";
  const newManageFinanceProps = `properties: {
        action: {
          type: 'string',`;

  const propsToAdd = `        pessoa: { type: 'string', description: 'Nome da pessoa para quem o Adriano deve (para list_debts, add_debt, pay_debt, ex: Socorrinha)' },
        valor: { type: 'number', description: 'Valor da conta ou de cada parcela para add_debt / pay_debt' },
        parcelas: { type: 'number', description: 'Quantidade de parcelas mensais (ex: 10 para pagar em 10 vezes nos próximos 10 meses)' },
        data_vencimento: { type: 'string', description: 'Data de vencimento formato YYYY-MM-DD (ex: 2026-11-10 para mês que vem dia 10)' },
        dia_vencimento: { type: 'number', description: 'Dia do mês para vencimento (ex: 10)' },
        nome_conta: { type: 'string', description: 'Nome ou descrição da conta/parcela (ex: Parcela, Empréstimo, Cartão)' },\n`;

  if (!code.includes("pessoa: { type: 'string'")) {
    code = code.replace(
      "novo_servico: { type: 'string', description: 'Novo serviço para update_trabalho' },",
      "novo_servico: { type: 'string', description: 'Novo serviço para update_trabalho' },\n" + propsToAdd
    );
    console.log("   + Propriedades pessoa, parcelas, data_vencimento adicionadas ao schema de manage_finance!");
  }

  // ── 4. INSERIR OS HANDLERS EM manage_finance ───────────────────────────
  const debtsHandlers = `
        // ── LISTAR QUEM EU DEVO / DÍVIDAS / PESSOAS QUE ESTOU DEVENDO ───
        } else if (args.action === 'list_debts' || args.action === 'quem_eu_devo' || args.action === 'debts_list') {
          const kRes = await ck.call(this, 'GET', \`/api/finance/king-data?profile_id=\${profileId}\`);
          let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
          const terceiros = Array.isArray(kingDb.terceiros) ? kingDb.terceiros : [];
          
          const txRes = await ck.call(this, 'GET', \`/api/finance/transactions?limit=100&orderBy=created_at&orderDir=DESC\`);
          const txList = Array.isArray(txRes.body?.data) ? txRes.body.data : (Array.isArray(txRes.body?.data?.data) ? txRes.body.data.data : []);
          const despesasPendentesFluxo = txList.filter(t => t.type === 'EXPENSE' && t.status === 'PENDING');
          
          const filtroPessoa = String(args.pessoa || args.cliente || '').trim().toLowerCase();
          
          if (filtroPessoa) {
            let pFound = terceiros.find(p => p && String(p.nome || '').toLowerCase().includes(filtroPessoa));
            const fluxoMatch = txList.filter(t => t.type === 'EXPENSE' && String(t.description || '').toLowerCase().includes(filtroPessoa));
            
            if (!pFound && fluxoMatch.length === 0) {
              stepMsg = \`🔍 *Nenhuma conta encontrada para "\${args.pessoa || filtroPessoa}"!*\\n\\nVocê não tem nenhuma dívida pendente registrada para essa pessoa na sua gestão financeira.\`;
            } else {
              const lines = [\`👤 *Contas e Dívidas — \${pFound ? pFound.nome : args.pessoa}:*\\n\`];
              let totalFaltaPessoa = 0;
              let totalPagoPessoa = 0;
              let countContas = 0;
              
              if (pFound && Array.isArray(pFound.contas) && pFound.contas.length > 0) {
                pFound.contas.forEach((c, idx) => {
                  countContas++;
                  const valTotal = Number(c.valor) || 0;
                  const pago = (c.pagamentos || []).reduce((s, x) => s + (Number(x.valor) || 0), 0);
                  const falta = Math.max(0, valTotal - pago);
                  totalFaltaPessoa += falta;
                  totalPagoPessoa += pago;
                  
                  let dtVencFormat = 'Sem data';
                  if (c.dataVencimento) {
                    const dtClean = String(c.dataVencimento).trim().split(' ')[0];
                    const pts = dtClean.split(/[-/]/);
                    if (pts.length === 3) {
                      dtVencFormat = pts[0].length === 4 ? \`\${pts[2]}/\${pts[1]}/\${pts[0]}\` : \`\${pts[0]}/\${pts[1]}/\${pts[2]}\`;
                    }
                  }
                  
                  const statusIcon = falta <= 0 ? '✅ Quitado' : '⏳ Pendente';
                  lines.push(\`• *Conta \${idx + 1} (\${c.nomeConta || 'Parcela'}):* \${fmt(valTotal)}\\n   📅 Vencimento: *\${dtVencFormat}* | \${statusIcon}\\n   💵 Pago: \${fmt(pago)} | 🔴 *Falta pagar: \${fmt(falta)}*\`);
                });
              }
              
              if (fluxoMatch.length > 0) {
                lines.push('\\n📝 *Lançamentos no Fluxo de Caixa:*');
                fluxoMatch.forEach(t => {
                  const statusLabel = t.status === 'PAID' ? '✅ Pago' : '⏳ Pendente (A pagar)';
                  const dtStr = String(t.transaction_date || t.created_at || '').slice(0, 10);
                  lines.push(`• \${fmt(t.amount)} — _\${t.description}_ (\${statusLabel}) [Data: \${dtStr}]`);
                  if (t.status === 'PENDING') totalFaltaPessoa += Number(t.amount || 0);
                });
              }
              
              lines.push(`\\n💰 *Total Restante a Pagar para \${pFound ? pFound.nome : args.pessoa}:* *\${fmt(totalFaltaPessoa)}*`);
              if (totalPagoPessoa > 0) lines.push(`✅ *Total Já Pago:* \${fmt(totalPagoPessoa)}`);
              stepMsg = lines.join('\\n');
            }
          } else {
            let totalFaltaGeral = 0;
            const lines = ['👑 *Pessoas que Você Deve (Quem Eu Devo) — Agente King:*\\n'];
            let countPessoas = 0;
            
            terceiros.forEach(p => {
              let totalPessoaFalta = 0;
              let totalPessoaContas = (p.contas || []).length;
              let proximosVenc = [];
              
              (p.contas || []).forEach(c => {
                const valTotal = Number(c.valor) || 0;
                const pago = (c.pagamentos || []).reduce((s, x) => s + (Number(x.valor) || 0), 0);
                const falta = Math.max(0, valTotal - pago);
                totalPessoaFalta += falta;
                if (falta > 0 && c.dataVencimento) {
                  proximosVenc.push(c.dataVencimento);
                }
              });
              
              if (totalPessoaFalta > 0 || totalPessoaContas > 0) {
                countPessoas++;
                totalFaltaGeral += totalPessoaFalta;
                proximosVenc.sort();
                let proxVencStr = 'Não informado';
                if (proximosVenc.length > 0) {
                  const pts = proximosVenc[0].split('-');
                  proxVencStr = pts.length === 3 ? `\${pts[2]}/\${pts[1]}/\${pts[0]}` : proximosVenc[0];
                }
                lines.push(`\${countPessoas}. 👤 *\${p.nome}*\\n   💰 *Falta pagar: \${fmt(totalPessoaFalta)}* (\${totalPessoaContas} conta\${totalPessoaContas > 1 ? 's' : ''})\\n   🗓️ Próximo vencimento: \${proxVencStr}`);
              }
            });
            
            if (despesasPendentesFluxo.length > 0) {
              lines.push('\\n📑 *Despesas Avulsas Pendentes no Fluxo:*');
              despesasPendentesFluxo.forEach(t => {
                totalFaltaGeral += Number(t.amount || 0);
                lines.push(`• 💸 \${fmt(t.amount)} — _\${t.description}_ (\${t.transaction_date || 'Sem data'})`);
              });
            }
            
            if (countPessoas === 0 && despesasPendentesFluxo.length === 0) {
              stepMsg = \`🎉 *Excelente notícia, Adriano!* Você não tem nenhuma dívida ou conta pendente para pagar no momento! Todas as contas e pessoas estão 100% em dia.\`;
            } else {
              lines.push(\`\\n🔴 *Total Geral Pendente a Pagar:* *\${fmt(totalFaltaGeral)}*\`);
              lines.push(\`\\n_Para ver detalhes de alguém, diga: "quanto devo para [nome]" ou "contas da [nome]"._\`);
              stepMsg = lines.join('\\n');
            }
          }

        // ── ADICIONAR DÍVIDA / PARCELAS / CONTA PARA MÊS QUE VEM ─────────
        } else if (args.action === 'add_debt' || args.action === 'create_debt' || args.action === 'add_terceiro') {
          const pessoaNome = String(args.pessoa || args.cliente || 'Pessoa').trim();
          const valor = Number(args.valor || args.amount || 0);
          const numParcelas = Math.max(1, parseInt(args.parcelas || 1, 10));
          const nomeContaBase = String(args.nome_conta || args.servico || (numParcelas > 1 ? 'Parcela' : 'Conta')).trim();
          
          if (valor <= 0) {
            stepMsg = '⚠️ Por favor informe o valor da conta ou da parcela.';
          } else {
            const kRes = await ck.call(this, 'GET', \`/api/finance/king-data?profile_id=\${profileId}\`);
            let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
            if (!kingDb || typeof kingDb !== 'object') kingDb = {};
            if (!Array.isArray(kingDb.terceiros)) kingDb.terceiros = [];
            
            let p = kingDb.terceiros.find(x => x && String(x.nome || '').toLowerCase().trim() === pessoaNome.toLowerCase());
            if (!p) {
              p = {
                id: 'terc_' + Date.now(),
                nome: pessoaNome,
                contas: []
              };
              kingDb.terceiros.push(p);
            }
            if (!Array.isArray(p.contas)) p.contas = [];
            
            let startYear = nowSp.getFullYear();
            let startMonth = nowSp.getMonth() + 1;
            let startDay = 10;
            
            if (args.data_vencimento) {
              const parsed = String(args.data_vencimento).trim();
              const isoMatch = parsed.match(/^(\\d{4})-(\\d{1,2})-(\\d{1,2})/);
              const brMatch = parsed.match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})/);
              if (isoMatch) {
                startYear = parseInt(isoMatch[1], 10);
                startMonth = parseInt(isoMatch[2], 10);
                startDay = parseInt(isoMatch[3], 10);
              } else if (brMatch) {
                startDay = parseInt(brMatch[1], 10);
                startMonth = parseInt(brMatch[2], 10);
                startYear = parseInt(brMatch[3], 10);
              }
            } else if (args.dia_vencimento) {
              startDay = parseInt(args.dia_vencimento, 10);
              startMonth += 1;
              if (startMonth > 12) { startMonth = 1; startYear += 1; }
            } else {
              startMonth += 1;
              if (startMonth > 12) { startMonth = 1; startYear += 1; }
            }
            
            const criadas = [];
            let curYear = startYear;
            let curMonth = startMonth;
            
            for (let i = 1; i <= numParcelas; i++) {
              const dtVenc = \`\${curYear}-\${String(curMonth).padStart(2, '0')}-\${String(startDay).padStart(2, '0')}\`;
              const dtVencBr = \`\${String(startDay).padStart(2, '0')}/\${String(curMonth).padStart(2, '0')}/\${curYear}\`;
              const rotulo = numParcelas > 1 ? \`\${nomeContaBase} \${i}/\${numParcelas}\` : nomeContaBase;
              
              const novaConta = {
                id: 'c_' + Date.now() + '_' + i,
                nomeConta: rotulo,
                valor: valor,
                dataVencimento: dtVenc,
                tipo: numParcelas > 1 ? 'recorrente' : 'unica',
                pagamentos: []
              };
              p.contas.push(novaConta);
              criadas.push({ rotulo, valor, dataVencimento: dtVencBr });
              
              curMonth += 1;
              if (curMonth > 12) {
                curMonth = 1;
                curYear += 1;
              }
            }
            
            await ck.call(this, 'PUT', \`/api/finance/king-data?profile_id=\${profileId}\`, {
              profile_id: profileId,
              data: kingDb
            });
            
            const totalAdicionado = valor * numParcelas;
            const summary = await fetchRealSummary.call(this, profileId);
            
            if (numParcelas === 1) {
              stepMsg = \`👑 *Conta Registrada com Sucesso na Gestão Financeira!*\\n\\n\` +
                \`👤 *Pessoa (Quem Eu Devo):* *\${pessoaNome}*\\n\` +
                \`📝 *Descrição:* \${nomeContaBase}\\n\` +
                \`💰 *Valor:* \${fmt(valor)}\\n\` +
                \`📅 *Vencimento:* *\${criadas[0].dataVencimento}* ⏳\\n\\n\` +
                \`📌 *Sincronização:* Registrada exclusivamente para o mês de vencimento (sem impactar o mês atual).\\n\\n\` +
                buildSummaryMessage(summary, fmt);
            } else {
              const parcelasPreview = criadas.slice(0, 5).map(c => \`• \${c.rotulo}: \${fmt(c.valor)} — Venc: \${c.dataVencimento}\`).join('\\n');
              const extraCount = criadas.length > 5 ? \`\\n• ... e mais \${criadas.length - 5} parcelas até \${criadas[criadas.length - 1].dataVencimento}\` : '';
              
              stepMsg = \`👑 *Parcelamento Registrado com Sucesso na Gestão Financeira!*\\n\\n\` +
                \`👤 *Pessoa (Quem Eu Devo):* *\${pessoaNome}*\\n\` +
                \`🔢 *Total de Parcelas:* *\${numParcelas}x de \${fmt(valor)}*\\n\` +
                \`💰 *Valor Total do Parcelamento:* *\${fmt(totalAdicionado)}*\\n\` +
                \`🗓️ *Período:* De *\${criadas[0].dataVencimento}* até *\${criadas[criadas.length - 1].dataVencimento}*\\n\\n\` +
                \`📋 *Cronograma das Parcelas (distribuídas mês a mês):*\\n\` +
                parcelasPreview + extraCount + \`\\n\\n\` +
                \`📌 *Sincronização:* Cada parcela foi programada em seu respectivo mês futuro. O mês atual não foi afetado!\\n\\n\` +
                buildSummaryMessage(summary, fmt);
            }
          }

        // ── REGISTRAR PAGAMENTO DE DÍVIDA (PAGAR TERCEIRO) ──────────────
        } else if (args.action === 'pay_debt' || args.action === 'pay_terceiro') {
          const pessoaBusca = String(args.pessoa || args.cliente || '').toLowerCase().trim();
          const valorPago = Number(args.valor || args.valor_pago || args.amount || 0);
          
          const kRes = await ck.call(this, 'GET', \`/api/finance/king-data?profile_id=\${profileId}\`);
          let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
          const terceiros = Array.isArray(kingDb.terceiros) ? kingDb.terceiros : [];
          
          let p = terceiros.find(x => x && String(x.nome || '').toLowerCase().includes(pessoaBusca));
          if (!p) {
            stepMsg = \`⚠️ Não encontrei nenhuma pessoa com o nome "\${args.pessoa}" na aba Quem eu devo.\`;
          } else {
            const contasPendentes = (p.contas || []).filter(c => {
              const pago = (c.pagamentos || []).reduce((s, x) => s + (Number(x.valor) || 0), 0);
              return (Number(c.valor) || 0) - pago > 0.01;
            });
            
            if (contasPendentes.length === 0) {
              stepMsg = \`✅ Todas as contas de *\${p.nome}* já estão quitadas!\`;
            } else {
              const contaAlvo = contasPendentes[0];
              if (!Array.isArray(contaAlvo.pagamentos)) contaAlvo.pagamentos = [];
              const valAplicar = valorPago > 0 ? valorPago : Number(contaAlvo.valor || 0);
              
              contaAlvo.pagamentos.push({
                valor: valAplicar,
                data: today,
                hora: horaAtualSp
              });
              
              await ck.call(this, 'PUT', \`/api/finance/king-data?profile_id=\${profileId}\`, {
                profile_id: profileId,
                data: kingDb
              });
              
              const summary = await fetchRealSummary.call(this, profileId);
              stepMsg = \`💸 *Pagamento Registrado com Sucesso — Agente King*\\n\\n\` +
                \`👤 *Pessoa:* \${p.nome}\\n\` +
                \`📝 *Conta:* \${contaAlvo.nomeConta}\\n\` +
                \`💵 *Valor Pago:* \${fmt(valAplicar)}\\n\` +
                \`📅 *Data do Pagamento:* \${today}\\n\\n\` +
                buildSummaryMessage(summary, fmt);
            }
          }

        // ── MARCAR DESPESA DO FLUXO COMO PAGA (JÁ PAGUEI) ───────────────
        } else if (args.action === 'mark_paid' || args.action === 'mark_as_paid') {
          const crit = String(args.description_contains || args.description || args.pessoa || '').toLowerCase().trim();
          const targetAmount = Number(args.amount || 0);
          
          const recent = await fetchRecentTransactions.call(this, 30);
          const targets = recent.filter(t => {
            const isPending = t.status === 'PENDING';
            const descMatch = crit ? String(t.description || '').toLowerCase().includes(crit) : true;
            const amountMatch = targetAmount > 0 ? Math.abs(Number(t.amount) - targetAmount) < 1.0 : true;
            return isPending && (crit ? descMatch : true) && (targetAmount > 0 ? amountMatch : true);
          });
          
          if (targets.length === 0) {
            stepMsg = \`⚠️ Não encontrei nenhuma conta pendente correspondente para marcar como paga.\`;
          } else {
            const updated = [];
            for (const t of targets) {
              const ur = await ck.call(this, 'PUT', \`/api/finance/transactions/\${t.id}\`, { status: 'PAID' });
              if (ur.statusCode >= 200 && ur.statusCode < 300) updated.push(t);
            }
            const summary = await fetchRealSummary.call(this, profileId);
            const lines = updated.map(t => \`• \${fmt(t.amount)} — \${t.description} (Status: PAGO ✅)\`);
            stepMsg = \`✅ *Conta(s) Marcada(s) como Paga(s) com Sucesso!*\\n\\n\` + lines.join('\\n') + '\\n\\n' + buildSummaryMessage(summary, fmt);
          }
`;

  if (!code.includes("args.action === 'list_debts'")) {
    code = code.replace(
      "// ── CLEAR ALL (ZERAR TUDO COM PODER TOTAL E TRAVA DE SEGURANÇA)",
      debtsHandlers + "\n        // ── CLEAR ALL (ZERAR TUDO COM PODER TOTAL E TRAVA DE SEGURANÇA)"
    );
    console.log("   + Handlers list_debts, add_debt, pay_debt, mark_paid injetados com sucesso!");
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

  console.log("\n✅ SISTEMA DE QUEM EU DEVO, DÍVIDAS E PARCELAS SINCRONIZADO E IMPLANTADO COM SUCESSO!");
}

main().catch(console.error);
