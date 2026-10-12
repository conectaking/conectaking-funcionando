const assert = require('assert');

// Simulação dos dados reais da Socorrinha
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
  const anoAtual = nowSp.getFullYear();
  const mesAtual = nowSp.getMonth() + 1; // 1-12
  let anoProx = anoAtual;
  let mesProx = mesAtual + 1;
  if (mesProx > 12) { mesProx = 1; anoProx++; }
  const esteMesYYYYMM = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`;
  const proxMesYYYYMM = `${anoProx}-${String(mesProx).padStart(2, '0')}`;
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

  const filtroPessoa = String(args.pessoa || args.cliente || '').trim().toLowerCase();
  let stepMsg = '';

  if (filtroPessoa) {
    let pFound = terceiros.find(p => p && String(p.nome || '').toLowerCase().includes(filtroPessoa));
    const fluxoMatch = txList.filter(t => t.type === 'EXPENSE' && String(t.description || '').toLowerCase().includes(filtroPessoa));
    
    const rawNome = pFound ? pFound.nome : (args.pessoa || filtroPessoa);
    const nomeCapitalizado = rawNome ? (rawNome.charAt(0).toUpperCase() + rawNome.slice(1)) : 'Essa pessoa';

    if (!pFound && fluxoMatch.length === 0) {
      stepMsg = `✅ *Não, Adriano! Você não deve nada para ${nomeCapitalizado}.*`;
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

      if (targetMesYYYYMM) {
        if (contasDoMesPendentes.length > 0) {
          const lines = [
            `📅 *Total da parcela para ${nomeCapitalizado} no ${targetMesLabel}:*`,
            '',
            `💰 *Valor total a pagar no mês:* *${fmt(totalFaltaPessoaMes)}*`,
            '',
            `📋 *Parcelas com vencimento no mês que vem (${mesesNomes[mesProx - 1]}/${anoProx}):*`
          ];

          contasDoMesPendentes.forEach(c => {
            const descTxt = c.descExtra ? `\n   🏷️ *Referência:* _${c.descExtra}_` : '';
            lines.push(`• *${c.nomeConta}:* *${fmt(c.falta)}*${descTxt}\n   📅 Vencimento: *${c.dtFormat}* ⏳`);
          });

          const outrasParcelas = todasContasPendentes.filter(c => c.yyyymm !== targetMesYYYYMM);
          if (outrasParcelas.length > 0) {
            lines.push('');
            lines.push(`ℹ️ *Demais parcelas em outros meses:*`);
            lines.push(`• *Total acumulado geral (todas as parcelas futuras):* *${fmt(totalFaltaPessoaGeral)}* (${todasContasPendentes.length} parcelas no total)`);
            lines.push(`• _As demais parcelas vencem nos meses posteriores._`);
          }

          lines.push('');
          lines.push(`_Para dar baixa ou registrar pagamento, diga: "paguei a conta da ${nomeCapitalizado}" ou "já paguei"._`);
          stepMsg = lines.join('\n');
        } else if (totalFaltaPessoaGeral > 0.01) {
          stepMsg = `✅ *Adriano, você não tem parcelas vencendo no ${targetMesLabel} para ${nomeCapitalizado}!* (Total no mês: *R$ 0,00*).\n\n` +
            `Você possui *${todasContasPendentes.length} parcela(s)* em outros meses que somam *${fmt(totalFaltaPessoaGeral)}* no total geral.`;
        } else {
          stepMsg = `✅ *Não, Adriano! Você não deve nada para ${nomeCapitalizado}.*`;
        }
      } else {
        // Sem filtro de mês específico: agrupa por mês
        const gruposPorMes = {};
        todasContasPendentes.forEach(c => {
          const chaveMes = c.yyyymm || 'sem_data';
          if (!gruposPorMes[chaveMes]) gruposPorMes[chaveMes] = { items: [], total: 0 };
          gruposPorMes[chaveMes].items.push(c);
          gruposPorMes[chaveMes].total += c.falta;
        });

        const chavesOrdenadas = Object.keys(gruposPorMes).sort();

        const lines = [
          `⚠️ *Sim, Adriano! Você tem contas pendentes para ${nomeCapitalizado}:*`,
          '',
          `🔴 *Total geral que falta pagar: ${fmt(totalFaltaPessoaGeral)}* (${todasContasPendentes.length} parcelas ao todo)`,
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

        stepMsg = lines.join('\n');
      }
    }
  }

  return stepMsg;
}

console.log('=== TESTE 1: Pergunta exata do Adriano ===');
const res1 = runTest('Qual o valor total da parcela do mês que vem somente o que devo pagar para socorrinha', { action: 'list_debts', pessoa: 'Socorrinha' });
console.log(res1);

console.log('\n=== TESTE 2: Consulta geral sem mês especificado ===');
const res2 = runTest('quanto devo para socorrinha', { action: 'list_debts', pessoa: 'Socorrinha' });
console.log(res2);
