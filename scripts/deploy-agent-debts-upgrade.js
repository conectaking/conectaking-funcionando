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
  fs.writeFileSync("backup_wf_before_human_debts_fix.json", JSON.stringify(wf, null, 2));

  const execNode = wf.nodes.find(n => n.name === 'Executar Admin');
  if (!execNode) throw new Error("Nó 'Executar Admin' não encontrado!");

  let code = execNode.parameters.jsCode;

  // ── 1. NOVO BLOCO list_debts (HUMANIZADO, DIRETO E PRECISO) ─────────────
  const oldListDebtsStart = code.indexOf("// ── LISTAR QUEM EU DEVO / DÍVIDAS / PESSOAS QUE ESTOU DEVENDO ───");
  const oldAddDebtStart = code.indexOf("// ── ADICIONAR DÍVIDA / PARCELAS / CONTA PARA MÊS QUE VEM ─────────");

  if (oldListDebtsStart === -1 || oldAddDebtStart === -1) {
    throw new Error("Marcadores de list_debts ou add_debt não encontrados no código!");
  }

  const newListDebtsCode = `// ── LISTAR QUEM EU DEVO / DÍVIDAS / PESSOAS QUE ESTOU DEVENDO ───
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
            
            const rawNome = pFound ? pFound.nome : (args.pessoa || filtroPessoa);
            const nomeCapitalizado = rawNome ? (rawNome.charAt(0).toUpperCase() + rawNome.slice(1)) : 'Essa pessoa';

            if (!pFound && fluxoMatch.length === 0) {
              stepMsg = \`✅ *Não, Adriano! Você não deve nada para \${nomeCapitalizado}.*\\n\\n\` +
                \`Não consta nenhuma conta ou pendência registrada para ela na sua gestão financeira (Total pendente: *R$ 0,00*).\\n\\n\` +
                \`💡 _Se você combinou alguma nova conta com ela, é só me dizer o valor e a data de vencimento (ex: "adicionar conta de R$ 110 para \${nomeCapitalizado} dia 10 do mês que vem") que eu registro na hora!_\`;
            } else {
              let totalFaltaPessoa = 0;
              let totalPagoPessoa = 0;
              const contasPendentes = [];
              const contasQuitadas = [];
              
              if (pFound && Array.isArray(pFound.contas) && pFound.contas.length > 0) {
                pFound.contas.forEach((c, idx) => {
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
                  
                  if (falta > 0.01) {
                    contasPendentes.push(\`• *Conta \${idx + 1} (\${c.nomeConta || 'Parcela'}):* \${fmt(valTotal)}\\n   📅 Vencimento: *\${dtVencFormat}* ⏳ | 🔴 *Falta pagar: \${fmt(falta)}* (Já pago: \${fmt(pago)})\`);
                  } else {
                    contasQuitadas.push(\`• *Conta \${idx + 1} (\${c.nomeConta || 'Parcela'}):* \${fmt(valTotal)} (✅ Quitado) [Venc: \${dtVencFormat}]\`);
                  }
                });
              }
              
              if (fluxoMatch.length > 0) {
                fluxoMatch.forEach(t => {
                  const dtStr = String(t.transaction_date || t.created_at || '').slice(0, 10);
                  let dtFormat = dtStr;
                  const pts = dtStr.split('-');
                  if (pts.length === 3) dtFormat = \`\${pts[2]}/\${pts[1]}/\${pts[0]}\`;
                  
                  if (t.status === 'PENDING') {
                    totalFaltaPessoa += Number(t.amount || 0);
                    contasPendentes.push(\`• *\${fmt(t.amount)}* — _\${t.description}_ (⏳ Pendente no Fluxo) [Data: \${dtFormat}]\`);
                  } else {
                    totalPagoPessoa += Number(t.amount || 0);
                    contasQuitadas.push(\`• *\${fmt(t.amount)}* — _\${t.description}_ (✅ Pago em \${dtFormat})\`);
                  }
                });
              }

              if (totalFaltaPessoa <= 0.01) {
                const lines = [
                  \`✅ *Não, Adriano! Você não deve nada para \${nomeCapitalizado}.*\`,
                  '',
                  \`Todas as contas anteriores já constam como *100% QUITADAS e pagas* na sua gestão financeira!\`,
                  \`💰 *Total restante a pagar: R$ 0,00*\`
                ];

                if (contasQuitadas.length > 0) {
                  lines.push('');
                  lines.push('📜 *Histórico de pagamentos/contas já quitados:*');
                  lines.push(...contasQuitadas);
                  if (totalPagoPessoa > 0) {
                    lines.push(\`💵 *Total já liquidado:* *\${fmt(totalPagoPessoa)}*\`);
                  }
                }

                lines.push('');
                lines.push(\`💡 *Dica:* Se você combinou alguma nova conta com ela (por exemplo, para o mês que vem ou parcelada), é só me dizer:\`);
                lines.push(\`_Exemplo: "adicionar conta de R$ 110 para \${nomeCapitalizado} para pagar mês que vem dia 10"_ que eu registro na hora!\`);

                stepMsg = lines.join('\\n');
              } else {
                const lines = [
                  \`⚠️ *Sim, Adriano! Você tem contas pendentes para \${nomeCapitalizado}:*\`,
                  '',
                  \`🔴 *Total que falta pagar: \${fmt(totalFaltaPessoa)}*\`,
                  '',
                  '📋 *Contas pendentes:*',
                  ...contasPendentes
                ];

                if (contasQuitadas.length > 0) {
                  lines.push('');
                  lines.push('📜 *Contas já quitadas anteriormente:*');
                  lines.push(...contasQuitadas.slice(0, 5));
                  if (totalPagoPessoa > 0) {
                    lines.push(\`💵 *Total já pago:* \${fmt(totalPagoPessoa)}\`);
                  }
                }

                lines.push('');
                lines.push(\`_Para registrar pagamento ou dar baixa, diga: "paguei a conta da \${nomeCapitalizado}" ou "já paguei"._\`);

                stepMsg = lines.join('\\n');
              }
            }
          } else {
            let totalFaltaGeral = 0;
            const pessoasComDivida = [];
            
            terceiros.forEach(p => {
              let totalPessoaFalta = 0;
              let totalPessoaContasPendentes = 0;
              let proximosVenc = [];
              
              (p.contas || []).forEach(c => {
                const valTotal = Number(c.valor) || 0;
                const pago = (c.pagamentos || []).reduce((s, x) => s + (Number(x.valor) || 0), 0);
                const falta = Math.max(0, valTotal - pago);
                if (falta > 0.01) {
                  totalPessoaFalta += falta;
                  totalPessoaContasPendentes++;
                  if (c.dataVencimento) {
                    proximosVenc.push(c.dataVencimento);
                  }
                }
              });
              
              if (totalPessoaFalta > 0.01) {
                totalFaltaGeral += totalPessoaFalta;
                proximosVenc.sort();
                let proxVencStr = 'Não informado';
                if (proximosVenc.length > 0) {
                  const pts = proximosVenc[0].split('-');
                  proxVencStr = pts.length === 3 ? \`\${pts[2]}/\${pts[1]}/\${pts[0]}\` : proximosVenc[0];
                }
                pessoasComDivida.push({
                  nome: p.nome,
                  falta: totalPessoaFalta,
                  contas: totalPessoaContasPendentes,
                  vencimento: proxVencStr
                });
              }
            });
            
            const despesasPendentes = despesasPendentesFluxo.map(t => {
              totalFaltaGeral += Number(t.amount || 0);
              const dt = String(t.transaction_date || t.created_at || '').slice(0, 10);
              let dtFmt = dt;
              const pts = dt.split('-');
              if (pts.length === 3) dtFmt = \`\${pts[2]}/\${pts[1]}/\${pts[0]}\`;
              return \`• 💸 *\${fmt(t.amount)}* — _\${t.description}_ (Venc: \${dtFmt})\`;
            });
            
            if (pessoasComDivida.length === 0 && despesasPendentes.length === 0) {
              stepMsg = \`🎉 *Excelente notícia, Adriano! Você não está devendo para ninguém no momento!*\\n\\n\` +
                \`Todas as contas e pessoas na sua gestão financeira estão *100% quitadas e em dia*!\\n\` +
                \`💰 *Total geral pendente: R$ 0,00*\\n\\n\` +
                \`💡 _Se você combinou alguma nova conta com alguém para os próximos meses, é só me falar (ex: "conta de fulano de tal para pagar mês que vem dia 10") que eu programo na hora!_\`;
            } else {
              const lines = ['👑 *Pessoas e Contas que Você Deve (Quem Eu Devo):*\\n'];
              pessoasComDivida.forEach((p, idx) => {
                lines.push(\`\${idx + 1}. 👤 *\${p.nome}*\\n   💰 *Falta pagar: \${fmt(p.falta)}* (\${p.contas} conta\${p.contas > 1 ? 's' : ''} pendente\${p.contas > 1 ? 's' : ''})\\n   🗓️ Próximo vencimento: *\${p.vencimento}*\`);
              });
              
              if (despesasPendentes.length > 0) {
                lines.push('\\n📑 *Despesas Avulsas Pendentes no Fluxo:*');
                lines.push(...despesasPendentes);
              }
              
              lines.push(\`\\n🔴 *Total Geral Pendente a Pagar:* *\${fmt(totalFaltaGeral)}*\`);
              lines.push('\\n_Para ver detalhes de alguém, diga: "quanto devo para [nome]" ou "contas da [nome]"._');
              stepMsg = lines.join('\\n');
            }
          }
        
        `;

  // Substituir o bloco list_debts antigo pelo novo
  code = code.slice(0, oldListDebtsStart) + newListDebtsCode + code.slice(oldAddDebtStart);
  console.log("   + Bloco list_debts humanizado e blindado inserido com sucesso!");

  // ── 2. BLINDAR add_debt PARA GARANTIR CÁLCULO DE MÊS QUE VEM ───────────
  const oldAddDebtCalc = `            let startYear = nowSp.getFullYear();
            let startMonth = nowSp.getMonth() + 1;
            let startDay = 10;`;

  const newAddDebtCalc = `            const textLower = String(text || '').toLowerCase();
            const wantsNextMonth = textLower.includes('mês que vem') ||
              textLower.includes('mes que vem') ||
              textLower.includes('próximo mês') ||
              textLower.includes('proximo mes') ||
              textLower.includes('proximo mês') ||
              textLower.includes('partir do mes que vem') ||
              textLower.includes('partir do mês que vem');

            let curDate = new Date(nowSp.getTime());
            let nextMonthDate = new Date(curDate.getFullYear(), curDate.getMonth() + 1, 1);
            let defaultNextMonth = nextMonthDate.getMonth() + 1;
            let defaultNextYear = nextMonthDate.getFullYear();

            let startYear = wantsNextMonth ? defaultNextYear : nowSp.getFullYear();
            let startMonth = wantsNextMonth ? defaultNextMonth : (nowSp.getMonth() + 1);
            let startDay = 10;`;

  if (code.includes(oldAddDebtCalc)) {
    code = code.replace(oldAddDebtCalc, newAddDebtCalc);
    console.log("   + Cálculo de mês que vem blindado em add_debt!");
  }

  // Se o usuário falou mês que vem mas a IA passou data deste mês, corrigir:
  const oldDateMatchEnd = `if (isoMatch) {
                startYear = parseInt(isoMatch[1], 10);
                startMonth = parseInt(isoMatch[2], 10);
                startDay = parseInt(isoMatch[3], 10);
              } else if (brMatch) {
                startDay = parseInt(brMatch[1], 10);
                startMonth = parseInt(brMatch[2], 10);
                startYear = parseInt(brMatch[3], 10);
              }`;

  const newDateMatchEnd = `if (isoMatch) {
                startYear = parseInt(isoMatch[1], 10);
                startMonth = parseInt(isoMatch[2], 10);
                startDay = parseInt(isoMatch[3], 10);
              } else if (brMatch) {
                startDay = parseInt(brMatch[1], 10);
                startMonth = parseInt(brMatch[2], 10);
                startYear = parseInt(brMatch[3], 10);
              }
              if (wantsNextMonth && startMonth === (nowSp.getMonth() + 1) && startYear === nowSp.getFullYear()) {
                startMonth = defaultNextMonth;
                startYear = defaultNextYear;
              }`;

  if (code.includes(oldDateMatchEnd)) {
    code = code.replace(oldDateMatchEnd, newDateMatchEnd);
    console.log("   + Correção de override mês que vem inserida em add_debt!");
  }

  // ── 3. BLINDAR collect_clients PARA REDIRECIONAR SE O ADRIANO FALAR DE DÍVIDAS DELE ─
  const oldCollectClientsStart = `      // ─── 4. COBRANÇA E RECUPERAÇÃO DE CLIENTES ──────────────────────
      } else if (fnName === 'collect_clients') {
        const cRes = await ck.call(this, 'GET', '/api/admin/users?limit=100');`;

  const newCollectClientsStart = `      // ─── 4. COBRANÇA E RECUPERAÇÃO DE CLIENTES ──────────────────────
      } else if (fnName === 'collect_clients') {
        const lowerMsg = String(text || '').toLowerCase();
        const isAskingAboutMyDebts = lowerMsg.includes('estou devendo') ||
          lowerMsg.includes('eu devo') ||
          lowerMsg.includes('quem eu devo') ||
          lowerMsg.includes('pessoas que eu devo') ||
          lowerMsg.includes('nome de pessoas que') ||
          lowerMsg.includes('minhas dividas') ||
          lowerMsg.includes('minhas dívidas') ||
          lowerMsg.includes('socorrinha');

        if (isAskingAboutMyDebts) {
          // Redirecionamento automático blindado para list_debts da Gestão Financeira!
          const kRes = await ck.call(this, 'GET', \`/api/finance/king-data?profile_id=\${profileId}\`);
          let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
          const terceiros = Array.isArray(kingDb.terceiros) ? kingDb.terceiros : [];
          const txRes = await ck.call(this, 'GET', \`/api/finance/transactions?limit=100&orderBy=created_at&orderDir=DESC\`);
          const txList = Array.isArray(txRes.body?.data) ? txRes.body.data : (Array.isArray(txRes.body?.data?.data) ? txRes.body.data.data : []);
          const despesasPendentesFluxo = txList.filter(t => t.type === 'EXPENSE' && t.status === 'PENDING');
          
          let totalFaltaGeral = 0;
          const pessoasComDivida = [];
          terceiros.forEach(p => {
            let totalPessoaFalta = 0;
            let totalPessoaContasPendentes = 0;
            let proximosVenc = [];
            (p.contas || []).forEach(c => {
              const valTotal = Number(c.valor) || 0;
              const pago = (c.pagamentos || []).reduce((s, x) => s + (Number(x.valor) || 0), 0);
              const falta = Math.max(0, valTotal - pago);
              if (falta > 0.01) {
                totalPessoaFalta += falta;
                totalPessoaContasPendentes++;
                if (c.dataVencimento) proximosVenc.push(c.dataVencimento);
              }
            });
            if (totalPessoaFalta > 0.01) {
              totalFaltaGeral += totalPessoaFalta;
              proximosVenc.sort();
              let proxVencStr = 'Não informado';
              if (proximosVenc.length > 0) {
                const pts = proximosVenc[0].split('-');
                proxVencStr = pts.length === 3 ? \`\${pts[2]}/\${pts[1]}/\${pts[0]}\` : proximosVenc[0];
              }
              pessoasComDivida.push({ nome: p.nome, falta: totalPessoaFalta, contas: totalPessoaContasPendentes, vencimento: proxVencStr });
            }
          });

          if (pessoasComDivida.length === 0 && despesasPendentesFluxo.length === 0) {
            stepMsg = \`🎉 *Excelente notícia, Adriano! Você não está devendo para ninguém no momento!*\\n\\nTodas as contas e pessoas na sua gestão financeira estão *100% quitadas e em dia*!\\n💰 *Total geral a pagar: R$ 0,00*\\n\\n💡 _Se você combinou alguma nova conta com alguém para os próximos meses, é só me falar (ex: "conta de fulano para pagar mês que vem dia 10") que eu programo na hora!_\`;
          } else {
            const lines = ['👑 *Pessoas e Contas que Você Deve (Quem Eu Devo):*\\n'];
            pessoasComDivida.forEach((p, idx) => {
              lines.push(\`\${idx + 1}. 👤 *\${p.nome}*\\n   💰 *Falta pagar: \${fmt(p.falta)}* (\${p.contas} conta\${p.contas > 1 ? 's' : ''} pendente\${p.contas > 1 ? 's' : ''})\\n   🗓️ Próximo vencimento: *\${p.vencimento}*\`);
            });
            if (despesasPendentesFluxo.length > 0) {
              lines.push('\\n📑 *Despesas Avulsas Pendentes no Fluxo:*');
              despesasPendentesFluxo.forEach(t => {
                totalFaltaGeral += Number(t.amount || 0);
                lines.push(\`• 💸 *\${fmt(t.amount)}* — _\${t.description}_ (\${t.transaction_date || 'Sem data'})\`);
              });
            }
            lines.push(\`\\n🔴 *Total Geral Pendente a Pagar:* *\${fmt(totalFaltaGeral)}*\`);
            lines.push('\\n_Para ver detalhes de alguém, diga: "quanto devo para [nome]" ou "contas da [nome]"._');
            stepMsg = lines.join('\\n');
          }
        } else {
        const cRes = await ck.call(this, 'GET', '/api/admin/users?limit=100');`;

  if (code.includes(oldCollectClientsStart)) {
    code = code.replace(oldCollectClientsStart, newCollectClientsStart);
    // Fechar o else correspondente
    const oldCollectClientsEnd = `        }
      }

      // ─── 5. DIAGNÓSTICO DO SISTEMA (OPS & STATUS)`;
    const newCollectClientsEnd = `        }
        }
      }

      // ─── 5. DIAGNÓSTICO DO SISTEMA (OPS & STATUS)`;
    if (code.includes(oldCollectClientsEnd)) {
      code = code.replace(oldCollectClientsEnd, newCollectClientsEnd);
    }
    console.log("   + Redirecionamento blindado inserido em collect_clients!");
  }

  // ── 4. ATUALIZAR DESCRIÇÃO DE collect_clients NO TOOLS ARRAY ───────────
  code = code.replace(
    "description: '⚠️ NUNCA use se o Adriano estiver falando de dívidas que ele próprio deve!",
    "description: '⚠️ NUNCA, NUNCA use se o Adriano perguntar quem ele deve, pessoas que está devendo ou dívidas pessoais! Esta ferramenta é EXCLUSIVAMENTE para cobrar assinaturas dos clientes do Conecta King. Para saber pessoas que ele deve, chame manage_finance com action: list_debts."
  );

  execNode.parameters.jsCode = code;
  fs.writeFileSync("executar_admin_live.js", code);

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

  console.log("\n✅ ATUALIZAÇÃO COMPLETA: BOT HUMANIZADO, RESPOSTAS CLARAS E DIRETAS IMPLANTADAS NO AGENTE KING!");
}

main().catch(console.error);
