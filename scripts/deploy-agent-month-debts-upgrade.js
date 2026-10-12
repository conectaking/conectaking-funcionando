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
  fs.writeFileSync("backup_wf_before_month_debts_fix.json", JSON.stringify(wf, null, 2));

  const execNode = wf.nodes.find(n => n.name === 'Executar Admin');
  if (!execNode) throw new Error("Nó 'Executar Admin' não encontrado!");

  let code = execNode.parameters.jsCode;

  // ── 1. NOVO BLOCO list_debts COM FILTRO DE MÊS INTELIGENTE E VISÃO AGRUPADA ──
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

          // ── Identificar Filtro de Mês/Período ──
          const anoAtual = nowSp.getFullYear();
          const mesAtual = nowSp.getMonth() + 1; // 1-12
          let anoProx = anoAtual;
          let mesProx = mesAtual + 1;
          if (mesProx > 12) { mesProx = 1; anoProx++; }
          const esteMesYYYYMM = \`\${anoAtual}-\${String(mesAtual).padStart(2, '0')}\`;
          const proxMesYYYYMM = \`\${anoProx}-\${String(mesProx).padStart(2, '0')}\`;
          const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

          const lowerText = String(text || '').toLowerCase();
          const argMes = String(args.mes || args.periodo || '').toLowerCase();

          let targetMesYYYYMM = null;
          let targetMesLabel = null;

          if (
            argMes.includes('proximo') || argMes.includes('próximo') || argMes.includes('que_vem') || argMes === 'next' ||
            lowerText.includes('mês que vem') || lowerText.includes('mes que vem') || lowerText.includes('próximo mês') || lowerText.includes('proximo mes')
          ) {
            targetMesYYYYMM = proxMesYYYYMM;
            targetMesLabel = \`Mês que vem (\${mesesNomes[mesProx - 1]}/\${anoProx})\`;
          } else if (
            argMes.includes('atual') || argMes.includes('este') || argMes.includes('esse') ||
            lowerText.includes('este mês') || lowerText.includes('este mes') || lowerText.includes('esse mês') || lowerText.includes('esse mes') || lowerText.includes('deste mês') || lowerText.includes('desse mês')
          ) {
            targetMesYYYYMM = esteMesYYYYMM;
            targetMesLabel = \`Este mês (\${mesesNomes[mesAtual - 1]}/\${anoAtual})\`;
          } else {
            for (let i = 0; i < mesesNomes.length; i++) {
              const nomeM = mesesNomes[i].toLowerCase();
              if (lowerText.includes(nomeM) || argMes.includes(nomeM)) {
                const mesNum = i + 1;
                let anoM = anoAtual;
                if (mesNum < mesAtual) anoM = anoAtual + 1;
                targetMesYYYYMM = \`\${anoM}-\${String(mesNum).padStart(2, '0')}\`;
                targetMesLabel = \`\${mesesNomes[i]}/\${anoM}\`;
                break;
              }
            }
          }

          function parseContaData(dt) {
            if (!dt) return { yyyymm: null, dtFormat: 'Sem data', day: null };
            const dtClean = String(dt).trim().split(' ')[0];
            const pts = dtClean.split(/[-/]/);
            if (pts.length === 3) {
              if (pts[0].length === 4) {
                const yyyymm = \`\${pts[0]}-\${pts[1].padStart(2, '0')}\`;
                const dtFormat = \`\${pts[2]}/\${pts[1]}/\${pts[0]}\`;
                return { yyyymm, dtFormat, day: Number(pts[2]) };
              } else {
                const yyyymm = \`\${pts[2]}-\${pts[1].padStart(2, '0')}\`;
                const dtFormat = \`\${pts[0]}/\${pts[1]}/\${pts[2]}\`;
                return { yyyymm, dtFormat, day: Number(pts[0]) };
              }
            }
            return { yyyymm: null, dtFormat: dtClean, day: null };
          }

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
              let totalFaltaPessoaGeral = 0;
              let totalPagoPessoaGeral = 0;
              let totalFaltaPessoaMes = 0;
              const todasContasPendentes = [];
              const contasDoMesPendentes = [];
              const contasQuitadas = [];

              if (pFound && Array.isArray(pFound.contas) && pFound.contas.length > 0) {
                pFound.contas.forEach((c, idx) => {
                  const valTotal = Number(c.valor) || 0;
                  const pago = (c.pagamentos || []).reduce((s, x) => s + (Number(x.valor) || 0), 0);
                  const falta = Math.max(0, valTotal - pago);
                  totalFaltaPessoaGeral += falta;
                  totalPagoPessoaGeral += pago;

                  const { yyyymm, dtFormat } = parseContaData(c.dataVencimento);
                  const descExtra = (c.descricao && c.descricao.toLowerCase() !== (c.nomeConta || '').toLowerCase()) ? c.descricao : '';

                  if (falta > 0.01) {
                    const itemConta = {
                      idx: idx + 1,
                      nomeConta: c.nomeConta || 'Parcela',
                      valTotal,
                      pago,
                      falta,
                      dtFormat,
                      yyyymm,
                      descExtra
                    };
                    todasContasPendentes.push(itemConta);
                    if (targetMesYYYYMM && yyyymm === targetMesYYYYMM) {
                      contasDoMesPendentes.push(itemConta);
                      totalFaltaPessoaMes += falta;
                    }
                  } else {
                    contasQuitadas.push(\`• *Conta \${idx + 1} (\${c.nomeConta || 'Parcela'}):* \${fmt(valTotal)} (✅ Quitado) [Venc: \${dtFormat}]\`);
                  }
                });
              }

              if (fluxoMatch.length > 0) {
                fluxoMatch.forEach((t, fIdx) => {
                  const dtStr = String(t.transaction_date || t.created_at || '').slice(0, 10);
                  const { yyyymm, dtFormat } = parseContaData(dtStr);
                  const amt = Number(t.amount || 0);

                  if (t.status === 'PENDING') {
                    totalFaltaPessoaGeral += amt;
                    const itemFluxo = {
                      idx: 'F' + (fIdx + 1),
                      nomeConta: t.description || 'Despesa no Fluxo',
                      valTotal: amt,
                      pago: 0,
                      falta: amt,
                      dtFormat,
                      yyyymm,
                      descExtra: 'Pendente no Fluxo de Caixa'
                    };
                    todasContasPendentes.push(itemFluxo);
                    if (targetMesYYYYMM && yyyymm === targetMesYYYYMM) {
                      contasDoMesPendentes.push(itemFluxo);
                      totalFaltaPessoaMes += amt;
                    }
                  } else {
                    totalPagoPessoaGeral += amt;
                    contasQuitadas.push(\`• *\${fmt(amt)}* — _\${t.description}_ (✅ Pago em \${dtFormat})\`);
                  }
                });
              }

              // SE ADRIANO PERGUNTOU ESPECIFICAMENTE POR UM MÊS (ex: mês que vem)
              if (targetMesYYYYMM) {
                if (contasDoMesPendentes.length > 0) {
                  const lines = [
                    \`📅 *Total da parcela para \${nomeCapitalizado} no \${targetMesLabel}:*\`,
                    '',
                    \`💰 *Valor total a pagar no mês:* *\${fmt(totalFaltaPessoaMes)}*\`,
                    '',
                    \`📋 *Parcelas com vencimento neste mês:*\`
                  ];

                  contasDoMesPendentes.forEach(c => {
                    const descTxt = c.descExtra ? \`\\n   🏷️ *Referência:* _\${c.descExtra}_\` : '';
                    lines.push(\`• *\${c.nomeConta}:* *\${fmt(c.falta)}*\${descTxt}\\n   📅 Vencimento: *\${c.dtFormat}* ⏳\`);
                  });

                  const outrasParcelas = todasContasPendentes.filter(c => c.yyyymm !== targetMesYYYYMM);
                  if (outrasParcelas.length > 0) {
                    lines.push('');
                    lines.push(\`ℹ️ *Demais parcelas em outros meses:*\`);
                    lines.push(\`• *Total acumulado geral (todas as parcelas futuras):* *\${fmt(totalFaltaPessoaGeral)}* (\${todasContasPendentes.length} parcelas no total)\`);
                    lines.push(\`• _As demais parcelas vencem nos meses posteriores._\`);
                  }

                  lines.push('');
                  lines.push(\`_Para dar baixa ou registrar pagamento, diga: "paguei a conta da \${nomeCapitalizado}" ou "já paguei"._\`);
                  stepMsg = lines.join('\\n');
                } else if (totalFaltaPessoaGeral > 0.01) {
                  stepMsg = \`✅ *Adriano, você não tem parcelas vencendo no \${targetMesLabel} para \${nomeCapitalizado}!* (Total no mês: *R$ 0,00*).\\n\\n\` +
                    \`Você possui *\${todasContasPendentes.length} parcela(s)* em outros meses que somam *\${fmt(totalFaltaPessoaGeral)}* no total geral.\\n\\n\` +
                    \`_Para ver todas as parcelas, diga: "todas as contas da \${nomeCapitalizado}"._\`;
                } else {
                  stepMsg = \`✅ *Não, Adriano! Você não deve nada para \${nomeCapitalizado}.*\\n\\nTodas as contas anteriores já constam como *100% QUITADAS* (Total pendente: *R$ 0,00*).\`;
                }
              } else {
                // SEM FILTRO DE MÊS ESPECÍFICO: MOSTRA TOTAL GERAL E AGRUPA POR MÊS
                if (totalFaltaPessoaGeral <= 0.01) {
                  const lines = [
                    \`✅ *Não, Adriano! Você não deve nada para \${nomeCapitalizado}.*\`,
                    '',
                    \`Todas as contas anteriores já constam como *100% QUITADAS e pagas* na sua gestão financeira!\`,
                    \`💰 *Total restante a pagar: R$ 0,00*\`
                  ];

                  if (contasQuitadas.length > 0) {
                    lines.push('');
                    lines.push('📜 *Histórico de pagamentos/contas já quitados:*');
                    lines.push(...contasQuitadas.slice(0, 5));
                    if (totalPagoPessoaGeral > 0) {
                      lines.push(\`💵 *Total já liquidado:* *\${fmt(totalPagoPessoaGeral)}*\`);
                    }
                  }

                  lines.push('');
                  lines.push(\`💡 *Dica:* Se você combinou alguma nova conta com ela, é só me dizer: "adicionar conta de R$ 110 para \${nomeCapitalizado} pagar mês que vem dia 10" que eu registro na hora!\`);
                  stepMsg = lines.join('\\n');
                } else {
                  const gruposPorMes = {};
                  todasContasPendentes.forEach(c => {
                    const chaveMes = c.yyyymm || 'sem_data';
                    if (!gruposPorMes[chaveMes]) gruposPorMes[chaveMes] = { items: [], total: 0 };
                    gruposPorMes[chaveMes].items.push(c);
                    gruposPorMes[chaveMes].total += c.falta;
                  });

                  const chavesOrdenadas = Object.keys(gruposPorMes).sort();

                  const lines = [
                    \`⚠️ *Sim, Adriano! Você tem contas pendentes para \${nomeCapitalizado}:*\`,
                    '',
                    \`🔴 *Total geral que falta pagar: \${fmt(totalFaltaPessoaGeral)}* (\${todasContasPendentes.length} parcelas ao todo)\`,
                    ''
                  ];

                  lines.push('📅 *Divisão por Mês de Vencimento:*');
                  chavesOrdenadas.forEach(chave => {
                    const grp = gruposPorMes[chave];
                    let labelMes = 'Sem data definida';
                    if (chave !== 'sem_data') {
                      const p = chave.split('-');
                      const idxM = parseInt(p[1], 10) - 1;
                      const nomeM = mesesNomes[idxM] || p[1];
                      labelMes = \`\${nomeM}/\${p[0]}\`;
                    }
                    lines.push(\`• 🗓️ *\${labelMes}:* *\${fmt(grp.total)}* (\${grp.items.length} parcela\${grp.items.length > 1 ? 's' : ''})\`);
                    grp.items.forEach(it => {
                      const refStr = it.descExtra ? \` — _\${it.descExtra}_\` : '';
                      lines.push(\`   └ *\${it.nomeConta}:* \${fmt(it.falta)}\${refStr} (Venc: \${it.dtFormat})\`);
                    });
                  });

                  if (contasQuitadas.length > 0) {
                    lines.push('');
                    lines.push('📜 *Contas já quitadas anteriormente:*');
                    lines.push(...contasQuitadas.slice(0, 3));
                    if (totalPagoPessoaGeral > 0) {
                      lines.push(\`💵 *Total já pago:* \${fmt(totalPagoPessoaGeral)}\`);
                    }
                  }

                  lines.push('');
                  lines.push(\`_Para registrar pagamento ou dar baixa, diga: "paguei a conta da \${nomeCapitalizado}" ou "já paguei"._\`);
                  stepMsg = lines.join('\\n');
                }
              }
            }
          } else {
            // SEM FILTRO DE PESSOA (CONSULTA GERAL DE DÍVIDAS)
            let totalFaltaGeral = 0;
            let totalFaltaMes = 0;
            const pessoasComDividaGeral = [];
            const pessoasComDividaMes = [];

            terceiros.forEach(p => {
              let faltaPessoaGeral = 0;
              let contasPessoaGeral = 0;
              let faltaPessoaMes = 0;
              let contasPessoaMes = 0;
              let proxVencArr = [];

              (p.contas || []).forEach(c => {
                const valTotal = Number(c.valor) || 0;
                const pago = (c.pagamentos || []).reduce((s, x) => s + (Number(x.valor) || 0), 0);
                const falta = Math.max(0, valTotal - pago);
                if (falta > 0.01) {
                  faltaPessoaGeral += falta;
                  contasPessoaGeral++;
                  const { yyyymm, dtFormat } = parseContaData(c.dataVencimento);
                  if (c.dataVencimento) proxVencArr.push(c.dataVencimento);
                  if (targetMesYYYYMM && yyyymm === targetMesYYYYMM) {
                    faltaPessoaMes += falta;
                    contasPessoaMes++;
                  }
                }
              });

              if (faltaPessoaGeral > 0.01) {
                totalFaltaGeral += faltaPessoaGeral;
                proxVencArr.sort();
                const proxFmt = proxVencArr.length > 0 ? parseContaData(proxVencArr[0]).dtFormat : 'Não informado';
                pessoasComDividaGeral.push({ nome: p.nome, falta: faltaPessoaGeral, contas: contasPessoaGeral, vencimento: proxFmt });
              }

              if (faltaPessoaMes > 0.01) {
                totalFaltaMes += faltaPessoaMes;
                pessoasComDividaMes.push({ nome: p.nome, falta: faltaPessoaMes, contas: contasPessoaMes });
              }
            });

            if (targetMesYYYYMM) {
              if (pessoasComDividaMes.length > 0) {
                const lines = [
                  \`📅 *Contas e Pessoas para Pagar no \${targetMesLabel}:*\`,
                  '',
                  \`💰 *Total a pagar no mês:* *\${fmt(totalFaltaMes)}*\`,
                  '',
                  \`📋 *Detalhamento por pessoa:*\`
                ];
                pessoasComDividaMes.forEach((p, idx) => {
                  lines.push(\`\${idx + 1}. 👤 *\${p.nome}*\\n   💰 *A pagar no mês: \${fmt(p.falta)}* (\${p.contas} parcela\${p.contas > 1 ? 's' : ''})\`);
                });
                if (totalFaltaGeral > totalFaltaMes) {
                  lines.push('');
                  lines.push(\`ℹ️ *Total geral acumulado com os demais meses:* *\${fmt(totalFaltaGeral)}*\`);
                }
                lines.push('');
                lines.push('_Para ver detalhes de alguém, diga: "quanto devo para [nome] no mês que vem"._');
                stepMsg = lines.join('\\n');
              } else {
                stepMsg = \`🎉 *Excelente notícia, Adriano! Nenhuma conta vencendo no \${targetMesLabel}!* (Total: *R$ 0,00*).\\n\\n\` +
                  (totalFaltaGeral > 0 ? \`Você tem parcelas em outros meses somando *\${fmt(totalFaltaGeral)}*.\` : 'Todas as contas estão 100% quitadas!');
              }
            } else {
              const despesasPendentes = despesasPendentesFluxo.map(t => {
                totalFaltaGeral += Number(t.amount || 0);
                const dt = String(t.transaction_date || t.created_at || '').slice(0, 10);
                let dtFmt = dt;
                const pts = dt.split('-');
                if (pts.length === 3) dtFmt = \`\${pts[2]}/\${pts[1]}/\${pts[0]}\`;
                return \`• 💸 *\${fmt(t.amount)}* — _\${t.description}_ (Venc: \${dtFmt})\`;
              });

              if (pessoasComDividaGeral.length === 0 && despesasPendentes.length === 0) {
                stepMsg = \`🎉 *Excelente notícia, Adriano! Você não está devendo para ninguém no momento!*\` +
                  \`\\n\\nTodas as contas e pessoas na sua gestão financeira estão *100% quitadas e em dia*!\` +
                  \`\\n💰 *Total geral pendente: R$ 0,00*\\n\\n\` +
                  \`💡 _Se você combinou alguma nova conta com alguém para os próximos meses, é só me falar (ex: "conta de fulano de tal para pagar mês que vem dia 10") que eu programo na hora!_\`;
              } else {
                const lines = ['👑 *Pessoas e Contas que Você Deve (Quem Eu Devo):*\\n'];
                pessoasComDividaGeral.forEach((p, idx) => {
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
          }
        
        `;

  // Substituição cirúrgica entre oldListDebtsStart e oldAddDebtStart
  code = code.slice(0, oldListDebtsStart) + newListDebtsCode + code.slice(oldAddDebtStart);
  console.log("   ✓ Bloco list_debts cirurgicamente atualizado com filtro de mês!");

  // ── 2. ATUALIZAR SYSTEM_PROMPT COM DIRETRIZ DE MÊS QUE VEM ─────────
  const targetPromptText = "-> Chame 'manage_finance' com action: 'list_debts' e pessoa: 'Socorrinha'!";
  if (code.includes(targetPromptText)) {
    const newPromptInstruction = `-> Chame 'manage_finance' com action: 'list_debts' e pessoa: 'Socorrinha'!
   - "qual o valor total da parcela do mês que vem somente o que devo pagar para socorrinha?", "quanto tenho que pagar mês que vem para [pessoa]?", "o que devo no mês que vem?":
     -> Chame 'manage_finance' com action: 'list_debts', pessoa: 'Socorrinha', mes: 'proximo' (ou periodo: 'mes_que_vem')!`;
    code = code.replace(targetPromptText, newPromptInstruction);
    console.log("   ✓ SYSTEM_PROMPT atualizado com diretrizes para parcelas do mês que vem!");
  }

  // ── 3. ATUALIZAR TOOLS COM PARÂMETROS mes E periodo ────────────────
  const targetToolProperty = "pessoa: { type: 'string', description: 'Nome da pessoa para quem o Adriano deve (para list_debts, add_debt, pay_debt, ex: Socorrinha)' },";
  if (code.includes(targetToolProperty)) {
    const newToolProperties = `pessoa: { type: 'string', description: 'Nome da pessoa para quem o Adriano deve (para list_debts, add_debt, pay_debt, ex: Socorrinha)' },
        mes: { type: 'string', description: 'Filtro de mês para consulta de dívidas/parcelas (ex: "proximo", "mes_que_vem", "atual", "2026-11", "novembro"). Use quando o Adriano perguntar especificamente sobre o mês que vem, este mês ou um mês específico!' },
        periodo: { type: 'string', description: 'Período desejado (ex: "mes_que_vem", "este_mes")' },`;
    code = code.replace(targetToolProperty, newToolProperties);
    console.log("   ✓ Ferramenta manage_finance atualizada no array TOOLS com mes e periodo!");
  }

  // ── 4. VALIDAR SINTAXE JAVASCRIPT DO CÓDIGO ────────────────────────
  console.log("2. Validando sintaxe JavaScript...");
  try {
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    new AsyncFunction(code);
    console.log("   ✓ Sintaxe JavaScript 100% VÁLIDA!");
  } catch (err) {
    throw new Error("Erro de sintaxe no código gerado: " + err.message);
  }

  execNode.parameters.jsCode = code;
  fs.writeFileSync("executar_admin_live.js", code);
  console.log("   ✓ Arquivo executar_admin_live.js salvo localmente com", code.length, "bytes");

  // ── 5. DEPLOY NO N8N ───────────────────────────────────────────────
  console.log("3. Enviando workflow atualizado para o n8n...");
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

  console.log("4. Reativando workflow...");
  const actRes = await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
  console.log("   Activate status:", actRes.status);

  console.log("\n🚀 SUCESSO ABSOLUTO: O AGENTE KING AGORA COMPREENDE E RESPONDE COM PRECISÃO CIRÚRGICA SOBRE PARCELAS DO MÊS QUE VEM!");
}

main().catch(console.error);
