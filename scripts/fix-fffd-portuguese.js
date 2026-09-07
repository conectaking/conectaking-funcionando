/**
 * Replace U+FFFD corruption in Portuguese UI strings.
 * Run: node scripts/fix-fffd-portuguese.js
 */
const fs = require('fs');
const path = require('path');

const MAP = {
  'Configura\uFFFD\uFFFDes': 'Configurações',
  'configura\uFFFD\uFFFDes': 'configurações',
  'Configura\uFFFD\uFFFDo': 'Configuração',
  'configura\uFFFD\uFFFDo': 'configuração',
  'Personaliza\uFFFD\uFFFDo': 'Personalização',
  'personaliza\uFFFD\uFFFDo': 'personalização',
  'Visualiza\uFFFD\uFFFDes': 'Visualizações',
  'visualiza\uFFFD\uFFFDo': 'visualização',
  'Informa\uFFFD\uFFFDes': 'Informações',
  'informa\uFFFD\uFFFDes': 'informações',
  'Descri\uFFFD\uFFFDo': 'Descrição',
  'descri\uFFFD\uFFFDo': 'descrição',
  'Navega\uFFFD\uFFFDo': 'Navegação',
  'Sugest\uFFFD\uFFFDes': 'Sugestões',
  'Sugest\uFFFDo': 'Sugestão',
  'Otimiza\uFFFD\uFFFDo': 'Otimização',
  'REORDENA\uFFFD\uFFFDO': 'REORDENAÇÃO',
  'finaliza\uFFFD\uFFFDo': 'finalização',
  'Finaliza\uFFFD\uFFFDo': 'Finalização',
  'Resolu\uFFFD\uFFFDo': 'Resolução',
  'resolu\uFFFD\uFFFDo': 'resolução',
  'edi\uFFFD\uFFFDo': 'edição',
  'Edi\uFFFD\uFFFDo': 'Edição',
  'sele\uFFFD\uFFFDo': 'seleção',
  'Sele\uFFFD\uFFFDo': 'Seleção',
  'sele\uFFFD\uFFFDes': 'seleções',
  'produ\uFFFD\uFFFDo': 'produção',
  'confirma\uFFFD\uFFFDo': 'confirmação',
  'Organiza\uFFFD\uFFFDo': 'Organização',
  'organiza\uFFFD\uFFFDo': 'organização',
  'libera\uFFFD\uFFFDes': 'liberações',
  'libera\uFFFD\uFFFDo': 'liberação',
  'coment\uFFFDrio': 'comentário',
  'Coment\uFFFDrios': 'Comentários',
  'invent\uFFFDrio': 'inventário',
  'compara\uFFFD\uFFFDo': 'comparação',
  'refer\uFFFDncia': 'referência',
  'Refer\uFFFDncia': 'Referência',
  'pend\uFFFDncias': 'pendências',
  'pend\uFFFDncia': 'pendência',
  'Instru\uFFFD\uFFFDes': 'Instruções',
  'instru\uFFFD\uFFFDo': 'instrução',
  'autom\uFFFDtica': 'automática',
  'autom\uFFFDtico': 'automático',
  'negocia\uFFFD\uFFFDo': 'negociação',
  'altera\uFFFD\uFFFDes': 'alterações',
  'dispon\uFFFDvel': 'disponível',
  'Dispon\uFFFDvel': 'Disponível',
  'tempor\uFFFDrio': 'temporário',
  'coer\uFFFDncia': 'coerência',
  'Cabe\uFFFDalho': 'Cabeçalho',
  'exclu\uFFFDdos': 'excluídos',
  'exclu\uFFFDdo': 'excluído',
  'Portugu\uFFFDs': 'Português',
  'aprova\uFFFD\uFFFDo': 'aprovação',
  'Permiss\uFFFDo': 'Permissão',
  'permiss\uFFFDo': 'permissão',
  'aleat\uFFFDria': 'aleatória',
  'Aben\uFFFDoado': 'Abençoado',
  'aben\uFFFDoados': 'abençoados',
  'edit\uFFFDveis': 'editáveis',
  'impress\uFFFDo': 'impressão',
  'ileg\uFFFDvel': 'ilegível',
  'leg\uFFFDveis': 'legíveis',
  'situa\uFFFD\uFFFDo': 'situação',
  'crit\uFFFDrio': 'critério',
  'unit\uFFFDrio': 'unitário',
  'c\uFFFDrculo': 'círculo',
  'Pr\uFFFDvias': 'Prévias',
  'pr\uFFFDvia': 'prévia',
  'vis\uFFFDvel': 'visível',
  'p\uFFFDblico': 'público',
  'P\uFFFDblico': 'Público',
  'revis\uFFFDo': 'revisão',
  'Fam\uFFFDlia': 'Família',
  'Im\uFFFDveis': 'Imóveis',
  'Espa\uFFFDol': 'Español',
  'n\uFFFDmeros': 'números',
  'per\uFFFDodo': 'período',
  'Sess\uFFFDes': 'Sessões',
  'c\uFFFDlculo': 'cálculo',
  'isen\uFFFD\uFFFDo': 'isenção',
  'c\uFFFDdigos': 'códigos',
  'c\uFFFDdigo': 'código',
  'padr\uFFFDes': 'padrões',
  'selecion\uFFFDveis': 'selecionáveis',
  'Transpar\uFFFDncia': 'Transparência',
  'precifica\uFFFD\uFFFDo': 'precificação',
  'intelig\uFFFDncia': 'inteligência',
  'exporta\uFFFD\uFFFDes': 'exportações',
  'P\uFFFDgina': 'Página',
  'p\uFFFDgina': 'página',
  'T\uFFFDtulo': 'Título',
  't\uFFFDtulo': 'título',
  'M\uFFFDdulo': 'Módulo',
  'm\uFFFDdulo': 'módulo',
  'cart\uFFFDo': 'cartão',
  'Cart\uFFFDo': 'Cartão',
  'N\uFFFDmero': 'Número',
  'Fun\uFFFD\uFFFDo': 'Função',
  'Bot\uFFFDo': 'Botão',
  'bot\uFFFDo': 'botão',
  'M\uFFFDdio': 'Médio',
  'Fa\uFFFDa': 'Faça',
  'pa\uFFFDs': 'país',
  'ser\uFFFD': 'será',
  'ap\uFFFDs': 'após',
  'n\uFFFDo': 'não',
  'N\uFFFDo': 'Não',
  's\uFFFDo': 'são',
  'tamb\uFFFDm': 'também',
  'For\uFFFDa': 'Força',
  'For\uFFFDar': 'Forçar',
  'FOR\uFFFDAR': 'FORÇAR',
  'for\uFFFDar': 'forçar',
  'Vers\uFFFDo': 'Versão',
  'M\uFFFDtricas': 'Métricas',
  'mudan\uFFFDas': 'mudanças',
  'CR\uFFFDTICO': 'CRÍTICO',
  'cr\uFFFDtico': 'crítico',
  '\uFFFDltimos': 'últimos',
  'm\uFFFDtodos': 'métodos',
  'aparecer\uFFFD': 'aparecerá',
  'est\uFFFDticos': 'estéticos',
  'Conte\uFFFDdo': 'Conteúdo',
  'espec\uFFFDficas': 'específicas',
  'Marca d\uFFFDgua': "Marca d'água",
  'marca d\uFFFDgua': "marca d'água",
  'd\uFFFDgua': 'água',
  'Pedidos de edi\uFFFD\uFFFDo': 'Pedidos de edição',
  'pediram edi\uFFFD\uFFFDo': 'pediram edição',
  'modo p\uFFFDblico': 'modo público',
  'Pgina de finalizao': 'Página de finalização',
  'P\uFFFDgina de finaliza\uFFFD\uFFFDo': 'Página de finalização',
  'Resolu\uFFFD\uFFFDo da foto': 'Resolução da foto',
  'N\uFFFDO': 'NÃO',
  'CORRE\uFFFD': 'CORREÇÃO'
};

function fix(s) {
  const keys = Object.keys(MAP).sort((a, b) => b.length - a.length);
  let out = s;
  for (const k of keys) out = out.split(k).join(MAP[k]);
  return out;
}

const root = path.join(__dirname, '..');
const files = [
  'public/kingSelectionProject.html',
  'public_html/kingSelectionProject.html',
  'public_html/salesPageEdit.html',
  'public_html/salesPageEdit.js',
  'public/kingSelectionProject.js',
  'public_html/kingSelectionProject.js'
];

for (const rel of files) {
  const f = path.join(root, rel);
  if (!fs.existsSync(f)) {
    console.log('skip', rel);
    continue;
  }
  const before = fs.readFileSync(f, 'utf8');
  const after = fix(before);
  const fffdBefore = (before.match(/\uFFFD/g) || []).length;
  const fffdAfter = (after.match(/\uFFFD/g) || []).length;
  fs.writeFileSync(f, after);
  console.log(
    rel,
    'fffd',
    fffdBefore,
    '->',
    fffdAfter,
    'Configurações?',
    after.includes('Configurações'),
    'Página?',
    after.includes('Página')
  );
}
