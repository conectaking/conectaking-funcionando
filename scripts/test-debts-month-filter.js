const terceiros = [
  {
    nome: "Socorrinha",
    contas: [
      { nomeConta: "Passagens no Cartão (Parcela 1/3)", valor: 110, dataVencimento: "2026-11-10", descricao: "Passagens no cartão da Socorrinha", pagamentos: [] },
      { nomeConta: "Passagens no Cartão (Parcela 2/3)", valor: 110, dataVencimento: "2026-12-10", descricao: "Passagens no cartão da Socorrinha", pagamentos: [] },
      { nomeConta: "Passagens no Cartão (Parcela 3/3)", valor: 110, dataVencimento: "2027-01-10", descricao: "Passagens no cartão da Socorrinha", pagamentos: [] },
      { nomeConta: "Leite para Sara (Cartão)", valor: 42, dataVencimento: "2026-11-10", descricao: "Uso do cartão para comprar leite para Sara", pagamentos: [] },
      { nomeConta: "Merecer (Parcela 1/2)", valor: 40, dataVencimento: "2026-11-10", descricao: "Referente ao merecer", pagamentos: [] },
      { nomeConta: "Merecer (Parcela 2/2)", valor: 40, dataVencimento: "2026-12-10", descricao: "Referente ao merecer", pagamentos: [] },
      { nomeConta: "Cartão da Socorrinha 1/4", valor: 43, dataVencimento: "2026-11-10", descricao: "Despesa do cartão da Socorrinha", pagamentos: [] },
      { nomeConta: "Cartão da Socorrinha 2/4", valor: 43, dataVencimento: "2026-12-10", descricao: "Despesa do cartão da Socorrinha", pagamentos: [] },
      { nomeConta: "Cartão da Socorrinha 3/4", valor: 43, dataVencimento: "2027-01-10", descricao: "Despesa do cartão da Socorrinha", pagamentos: [] },
      { nomeConta: "Cartão da Socorrinha 4/4", valor: 43, dataVencimento: "2027-02-10", descricao: "Despesa do cartão da Socorrinha", pagamentos: [] }
    ]
  }
];

const txList = [
  { amount: 110, description: "Pagamento para Socorrinha", status: "PAID", created_at: "2026-10-11" },
  { amount: 42, description: "Pagamento para Socorrinha", status: "PAID", created_at: "2026-10-11" }
];

const fmt = v => `R$ ${Number(v ?? 0).toFixed(2).replace('.', ',')}`;

function runTest(text, args) {
  const nowSp = new Date('2026-10-12T18:15:00-03:00');
  
  // ── 1. Normalização Inteligente de Nomes (Fuzzy / Audio Transcription) ──
  function normalizarNomePessoa(str) {
    if (!str) return '';
    const s = String(str).toLowerCase().trim();
    if (/socorr|coimin|coinh|sua\s*coim|socorin/i.test(s)) return 'socorrinha';
    return s;
  }

  const lowerText = String(text || '').toLowerCase();
  let filtroPessoa = normalizarNomePessoa(args.pessoa || args.cliente || '');

  // Se não veio explicitamente em args.pessoa, extrai da mensagem do usuário
  if (!filtroPessoa) {
    if (/socorr|coimin|coinh|sua\s*coim|socorin/i.test(lowerText)) {
      filtroPessoa = 'socorrinha';
    } else {
      for (const p of terceiros) {
        if (p && p.nome) {
          const pNorm = normalizarNomePessoa(p.nome);
          if (pNorm.length >= 3 && lowerText.includes(pNorm)) {
            filtroPessoa = pNorm;
            break;
          }
        }
      }
    }
  }

  // ── 2. Identificação de Mês / Período ──
  const anoAtual = nowSp.getFullYear();
  const mesAtual = nowSp.getMonth() + 1; // 1-12
  let anoProx = anoAtual;
  let mesProx = mesAtual + 1;
  if (mesProx > 12) { mesProx = 1; anoProx++; }
  const esteMesYYYYMM = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`;
  const proxMesYYYYMM = `${anoProx}-${String(mesProx).padStart(2, '0')}`;
  const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const argMes = String(args.mes || args.periodo || '').toLowerCase();

  let targetMesYYYYMM = null;
  let targetMesLabel = null;

  if (
    argMes.includes('proximo') || argMes.includes('próximo') || argMes.includes('que_vem') || argMes === 'next' ||
    lowerText.includes('mês que vem') || lowerText.includes('mes que vem') || lowerText.includes('próximo mês') || lowerText.includes('proximo mes')
  ) {
    targetMesYYYYMM = proxMesYYYYMM;
    targetMesLabel = `Mês que vem (${mesesNomes[mesProx - 1]}/${anoProx})`;
  } else if (
    argMes.includes('atual') || argMes.includes('este') || argMes.includes('esse') ||
    lowerText.includes('este mês') || lowerText.includes('este mes') || lowerText.includes('esse mês') || lowerText.includes('esse mes') || lowerText.includes('deste mês') || lowerText.includes('desse mês')
  ) {
    targetMesYYYYMM = esteMesYYYYMM;
    targetMesLabel = `Este mês (${mesesNomes[mesAtual - 1]}/${anoAtual})`;
  } else {
    for (let i = 0; i < mesesNomes.length; i++) {
      const nomeM = mesesNomes[i].toLowerCase();
      if (lowerText.includes(nomeM) || argMes.includes(nomeM)) {
        const mesNum = i + 1;
        let anoM = anoAtual;
        if (mesNum < mesAtual) anoM = anoAtual + 1;
        targetMesYYYYMM = `${anoM}-${String(mesNum).padStart(2, '0')}`;
        targetMesLabel = `${mesesNomes[i]}/${anoM}`;
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
        const yyyymm = `${pts[0]}-${pts[1].padStart(2, '0')}`;
        const dtFormat = `${pts[2]}/${pts[1]}/${pts[0]}`;
        return { yyyymm, dtFormat, day: Number(pts[2]) };
      } else {
        const yyyymm = `${pts[2]}-${pts[1].padStart(2, '0')}`;
        const dtFormat = `${pts[0]}/${pts[1]}/${pts[2]}`;
        return { yyyymm, dtFormat, day: Number(pts[0]) };
      }
    }
    return { yyyymm: null, dtFormat: dtClean, day: null };
  }

  let stepMsg = '';

  if (filtroPessoa) {
    let pFound = terceiros.find(p => {
      if (!p || !p.nome) return false;
      const pNorm = normalizarNomePessoa(p.nome);
      return pNorm.includes(filtroPessoa) || filtroPessoa.includes(pNorm);
    });
    const fluxoMatch = txList.filter(t => t.type === 'EXPENSE' && normalizarNomePessoa(t.description).includes(filtroPessoa));
    
    const rawNome = pFound ? pFound.nome : (filtroPessoa === 'socorrinha' ? 'Socorrinha' : (args.pessoa || filtroPessoa));
    const nomeCapitalizado = rawNome ? (rawNome.charAt(0).toUpperCase() + rawNome.slice(1)) : 'Essa pessoa';

    if (!pFound && fluxoMatch.length === 0) {
      stepMsg = `✅ *Não, Adriano! Você não deve nada para ${nomeCapitalizado}.*\n\n` +
        `Não consta nenhuma conta ou pendência registrada para ela na sua gestão financeira (Total pendente: *R$ 0,00*).\n\n` +
        `💡 _Se você combinou alguma nova conta com ela, é só me dizer o valor e a data de vencimento (ex: "adicionar conta de R$ 110 para ${nomeCapitalizado} dia 10 do mês que vem") que eu registro na hora!_`;
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
            contasQuitadas.push(`• *Conta ${idx + 1} (${c.nomeConta || 'Parcela'}):* ${fmt(valTotal)} (✅ Quitado) [Venc: ${dtFormat}]`);
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
            contasQuitadas.push(`• *${fmt(amt)}* — _${t.description}_ (✅ Pago em ${dtFormat})`);
          }
        });
      }

      // SE ADRIANO PERGUNTOU ESPECIFICAMENTE POR UM MÊS (ex: mês que vem)
      if (targetMesYYYYMM) {
        if (contasDoMesPendentes.length > 0) {
          const qtdParcelasMes = contasDoMesPendentes.length;
          const parcelasLabel = qtdParcelasMes === 1 ? '1 parcela' : `${qtdParcelasMes} parcelas`;

          const lines = [
            `📅 *Parcelas para ${nomeCapitalizado} no ${targetMesLabel}:*`,
            '',
            `🔢 *Quantidade de parcelas:* *${parcelasLabel}*`,
            `💰 *Valor total a pagar (somente neste mês):* *${fmt(totalFaltaPessoaMes)}*`,
            '',
            `📋 *Detalhamento das parcelas do mês:*`
          ];

          contasDoMesPendentes.forEach(c => {
            const descTxt = c.descExtra ? `\n   🏷️ *Referência:* _${c.descExtra}_` : '';
            lines.push(`• *${c.nomeConta}:* *${fmt(c.falta)}*${descTxt}\n   📅 Vencimento: *${c.dtFormat}* ⏳`);
          });

          // NÃO MOSTRAR DEMAIS MESES NEM TOTAL ACUMULADO FUTURO!
          lines.push('');
          lines.push(`💡 _Para consultar parcelas de outros meses ou todas as contas dela, diga: "quantas contas devo para ${nomeCapitalizado}" ou pergunte pelo mês desejado._`);
          stepMsg = lines.join('\n');
        } else if (totalFaltaPessoaGeral > 0.01) {
          stepMsg = `✅ *Adriano, você tem 0 parcelas para pagar no ${targetMesLabel} para ${nomeCapitalizado}!* (Total no mês: *R$ 0,00*).\n\n` +
            `Você não tem nenhuma conta dela vencendo nesse mês.\n\n` +
            `💡 _Para consultar as contas de outros meses ou todas as contas dela, diga: "quantas contas devo para ${nomeCapitalizado}"._`;
        } else {
          stepMsg = `✅ *Não, Adriano! Você não deve nada para ${nomeCapitalizado}.*\n\nTodas as contas anteriores já constam como *100% QUITADAS* (Total pendente: *R$ 0,00*).`;
        }
      } else {
        // SEM FILTRO DE MÊS ESPECÍFICO (ex: "quantas contas que eu tenho que eu tô devendo da socorrinha")
        if (totalFaltaPessoaGeral <= 0.01) {
          const lines = [
            `✅ *Adriano, você tem 0 contas pendentes para ${nomeCapitalizado}!*`,
            '',
            `Todas as contas anteriores já constam como *100% QUITADAS e pagas* na sua gestão financeira!`,
            `💰 *Total restante a pagar: R$ 0,00*`
          ];

          if (contasQuitadas.length > 0) {
            lines.push('');
            lines.push('📜 *Histórico de pagamentos/contas já quitados:*');
            lines.push(...contasQuitadas.slice(0, 5));
            if (totalPagoPessoaGeral > 0) {
              lines.push(`💵 *Total já liquidado:* *${fmt(totalPagoPessoaGeral)}*`);
            }
          }

          stepMsg = lines.join('\n');
        } else {
          const gruposPorMes = {};
          todasContasPendentes.forEach(c => {
            const chaveMes = c.yyyymm || 'sem_data';
            if (!gruposPorMes[chaveMes]) gruposPorMes[chaveMes] = { items: [], total: 0 };
            gruposPorMes[chaveMes].items.push(c);
            gruposPorMes[chaveMes].total += c.falta;
          });

          const chavesOrdenadas = Object.keys(gruposPorMes).sort();
          const qtdContasTotal = todasContasPendentes.length;
          const contasTotalLabel = qtdContasTotal === 1 ? '1 conta/parcela' : `${qtdContasTotal} contas/parcelas`;

          const lines = [
            `⚠️ *Adriano, você tem ${contasTotalLabel} pendente${qtdContasTotal > 1 ? 's' : ''} para ${nomeCapitalizado}:*`,
            '',
            `🔢 *Quantidade total de contas:* *${qtdContasTotal}*`,
            `💰 *Total geral que falta pagar:* *${fmt(totalFaltaPessoaGeral)}*`,
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
              labelMes = `${nomeM}/${p[0]}`;
            }
            lines.push(`• 🗓️ *${labelMes}:* *${fmt(grp.total)}* (${grp.items.length} parcela${grp.items.length > 1 ? 's' : ''})`);
            grp.items.forEach(it => {
              const refStr = it.descExtra ? ` — _${it.descExtra}_` : '';
              lines.push(`   └ *${it.nomeConta}:* ${fmt(it.falta)}${refStr} (Venc: ${it.dtFormat})`);
            });
          });

          lines.push('');
          lines.push(`💡 _Para saber apenas as parcelas de um mês, diga: "quanto tenho que pagar mês que vem para ${nomeCapitalizado}"._`);
          stepMsg = lines.join('\n');
        }
      }
    }
  } else {
    // SEM FILTRO DE PESSOA (CONSULTA GERAL DE DÍVIDAS)
    let totalFaltaGeral = 0;
    let totalFaltaMes = 0;
    let totalContasMes = 0;
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
        totalContasMes += contasPessoaMes;
        pessoasComDividaMes.push({ nome: p.nome, falta: faltaPessoaMes, contas: contasPessoaMes });
      }
    });

    if (targetMesYYYYMM) {
      if (pessoasComDividaMes.length > 0) {
        const parcelasTotalLabel = totalContasMes === 1 ? '1 parcela' : `${totalContasMes} parcelas`;
        const lines = [
          `📅 *Parcelas para pagar no ${targetMesLabel}:*`,
          '',
          `🔢 *Quantidade total de parcelas no mês:* *${parcelasTotalLabel}*`,
          `💰 *Total a pagar (somente neste mês):* *${fmt(totalFaltaMes)}*`,
          '',
          `📋 *Detalhamento por pessoa:*`
        ];
        pessoasComDividaMes.forEach((p, idx) => {
          lines.push(`${idx + 1}. 👤 *${p.nome}*\n   💰 *A pagar no mês: ${fmt(p.falta)}* (${p.contas} parcela${p.contas > 1 ? 's' : ''})`);
        });
        lines.push('');
        lines.push('_Para ver detalhes de alguém, diga: "quanto devo para [nome] no mês que vem" ou pergunte de outros meses._');
        stepMsg = lines.join('\n');
      } else {
        stepMsg = `🎉 *Excelente notícia, Adriano! Você tem 0 parcelas para pagar no ${targetMesLabel}!* (Total: *R$ 0,00*).\n\nNenhuma conta ou parcela vence nesse mês!`;
      }
    } else {
      const despesasPendentes = despesasPendentesFluxo.map(t => {
        totalFaltaGeral += Number(t.amount || 0);
        const dt = String(t.transaction_date || t.created_at || '').slice(0, 10);
        let dtFmt = dt;
        const pts = dt.split('-');
        if (pts.length === 3) dtFmt = `${pts[2]}/${pts[1]}/${pts[0]}`;
        return `• 💸 *${fmt(t.amount)}* — _${t.description}_ (Venc: ${dtFmt})`;
      });

      if (pessoasComDividaGeral.length === 0 && despesasPendentes.length === 0) {
        stepMsg = `🎉 *Excelente notícia, Adriano! Você não está devendo para ninguém no momento!*\n\nTodas as contas e pessoas na sua gestão financeira estão *100% quitadas e em dia*!\n💰 *Total geral pendente: R$ 0,00*`;
      } else {
        const lines = ['👑 *Pessoas e Contas que Você Deve (Quem Eu Devo):*\n'];
        pessoasComDividaGeral.forEach((p, idx) => {
          lines.push(`${idx + 1}. 👤 *${p.nome}*\n   💰 *Falta pagar: ${fmt(p.falta)}* (${p.contas} conta${p.contas > 1 ? 's' : ''} pendente${p.contas > 1 ? 's' : ''})\n   🗓️ Próximo vencimento: *${p.vencimento}*`);
        });
        
        if (despesasPendentes.length > 0) {
          lines.push('\n📑 *Despesas Avulsas Pendentes no Fluxo:*');
          lines.push(...despesasPendentes);
        }
        
        lines.push(`\n🔴 *Total Geral Pendente a Pagar:* *${fmt(totalFaltaGeral)}*`);
        lines.push('\n_Para ver detalhes de alguém, diga: "quanto devo para [nome]" ou "contas da [nome]"._');
        stepMsg = lines.join('\n');
      }
    }
  }

  return stepMsg;
}

console.log('=== TESTE 1: Pergunta com erro de áudio ("sua coiminha") e mês que vem ===');
console.log(runTest('quanto era a prestação total as parcelas que eu tinha que pagar o mês que vem da sua coiminha', { action: 'list_debts', mes: 'proximo' }));

console.log('\n=== TESTE 2: Pergunta "quantas parcelas eu tenho que pagar o mês que vem" (geral) ===');
console.log(runTest('quantas parcelas eu tenho que pagar o mês que vem', { action: 'list_debts', mes: 'proximo' }));

console.log('\n=== TESTE 3: Pergunta "quantas contas que eu tenho que eu tô devendo da socorrinha" ===');
console.log(runTest('quantas contas que eu tenho que eu tô devendo da socorrinha', { action: 'list_debts', pessoa: 'Socorrinha' }));

console.log('\n=== TESTE 4: Pergunta de outro mês ("dezembro") ===');
console.log(runTest('quanto tenho que pagar em dezembro para socorrinha', { action: 'list_debts', pessoa: 'Socorrinha', mes: 'dezembro' }));
