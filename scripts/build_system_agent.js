const fs = require('fs');

const originalLines = fs.readFileSync('scripts/exec_admin_code.js', 'utf8').split('\n');

// 1. Add redirect check at line where Sarah music check starts
let sarahLine = originalLines.findIndex(l => l.includes('if (prev.isAudioMusic && prev.audioMusicFileId) {'));

const redirectBlock = [
  '// Interceptador de Finanças -> Redirecionar para o Agente King Finanças',
  "const isFinanceQuery = /(?:minhas?\\s+finan[cç]as?|saldo|despesa|gasto|receita|faturamento|quanto\\s+tenho|quanto\\s+entrou|quanto\\s+saiu|quem\\s+eu\\s+devo|quanto\\s+devo|contas?\\s+a\\s+pagar|contas?\\s+a\\s+receber|trabalhos?\\s+a\\s+receber|lan[cç]ar\\s+gasto|lan[cç]ar\\s+receita|paguei\\s+r\\$|recebi\\s+r\\$|comprei\\s+em|minha\\s+d[ií]vida)/i.test(text);",
  'if (isFinanceQuery) {',
  '  const redirectMsg = `👑 *Agente King — Sistema Conecta King*\\n\\n' +
    'Adriano, o gerenciamento financeiro foi 100% separado e agora é atendido com exclusividade pelo novo *Agente King Finanças*! 💼📊\\n\\n' +
    'Eu cuido exclusivamente da plataforma *Conecta King*:\\n' +
    '• 👤 *Criar login e cadastrar clientes*\\n' +
    '• 🔑 *Gerar códigos de convite VIP (KING-XXXXX)*\\n' +
    '• 🩺 *Testar rotas e saúde do site (diagnóstico)*\\n' +
    '• ⚠️ *Verificar e limpar erros do sistema (Sentry)*\\n' +
    '• 📋 *Orçamentos e planos da plataforma*\\n' +
    '• 📅 *Agenda de compromissos operacionais*\\n\\n' +
    '👉 *Por favor, envie sua mensagem sobre finanças diretamente no Agente King Finanças!*\\n' +
    'Lá ele tem seu saldo em tempo real, fluxo de caixa, trabalhos e dívidas com máxima precisão.`;',
  '  return [{',
  '    json: {',
  '      ...prev,',
  '      outMessage: redirectMsg,',
  '      needGoogleCalendar: false',
  '    }',
  '  }];',
  '}'
];

let lines = [
  ...originalLines.slice(0, sarahLine),
  ...redirectBlock,
  ...originalLines.slice(sarahLine)
];

// 2. Remove finance sections in prompt (from REGRAS SUPREMAS DE TRABALHOS A RECEBER to PODERES DO SUPER AGENTE KING)
let promptStart = lines.findIndex(l => l.includes('REGRAS SUPREMAS DE TRABALHOS A RECEBER'));
let promptEnd = lines.findIndex(l => l.includes('PODERES DO SUPER AGENTE KING'));

const newPrompt = [
  '═══ REGRA DE OURO SOBRE FINANÇAS (MIGRADAS PARA O AGENTE KING FINANÇAS) ═══',
  'Você é o Agente King focado EXCLUSIVAMENTE nas operações, gestão técnica e suporte da plataforma Conecta King (criar logins de clientes, gerar convites VIP KING-XXXXX, monitorar estabilidade do site, testar rotas, verificar logs de erro, planos da plataforma, orçamentos e agenda operacional).',
  'Você NÃO gerencia finanças pessoais ou empresariais.',
  'Se o usuário perguntar sobre finanças, saldo, receitas, despesas, fluxo de caixa, pagamentos ou dívidas, informe com máxima clareza e cordialidade que agora existe o Agente King Finanças, dedicado exclusivamente a isso, e oriente-o a usar o bot de Finanças!'
];

lines = [
  ...lines.slice(0, promptStart),
  ...newPrompt,
  ...lines.slice(promptEnd)
];

// 3. Remove manage_finance from tools
let toolStart = lines.findIndex(l => l.includes("name: 'manage_finance'"));
while (toolStart > 0 && !lines[toolStart].includes("{ type: 'function'")) toolStart--;

let nextTool = lines.findIndex(l => l.includes("name: 'send_daily_audio'"));
while (nextTool > 0 && !lines[nextTool].includes("{ type: 'function'")) nextTool--;

lines = [
  ...lines.slice(0, toolStart),
  ...lines.slice(nextTool)
];

// 4. Remove manage_finance dispatch
let dispStart = lines.findIndex(l => l.includes("fnName === 'manage_finance'"));
while (dispStart > 0 && !lines[dispStart].includes("} else if")) dispStart--;

let dispEnd = lines.findIndex(l => l.includes("fnName === 'send_daily_audio'"));
while (dispEnd > 0 && !lines[dispEnd].includes("} else if")) dispEnd--;

lines = [
  ...lines.slice(0, dispStart),
  ...lines.slice(dispEnd)
];

const outputCode = lines.join('\n');
fs.writeFileSync('scripts/code_agente_king_sistema.js', outputCode);
console.log('Saved scripts/code_agente_king_sistema.js, total lines:', lines.length);

try {
  new Function('async () => { ' + outputCode + ' \n}');
  console.log('SYNTAX CHECK: SUCCESSFUL!');
} catch (e) {
  console.error('SYNTAX CHECK FAILED:', e.message);
}
