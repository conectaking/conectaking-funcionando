/**
 * System-wide cleanup of U+FFFD and emoji-mojibake in frontend strings.
 * Run: node scripts/fix-system-fffd.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGET_DIRS = ['public', 'public_html', 'views'];
const EXT = /\.(js|html|css|ejs)$/i;

const WORD_MAP = {
  'Configura\uFFFD\uFFFDes': 'Configurações',
  'configura\uFFFD\uFFFDes': 'configurações',
  'Configura\uFFFD\uFFFDo': 'Configuração',
  'configura\uFFFD\uFFFDo': 'configuração',
  'Personaliza\uFFFD\uFFFDo': 'Personalização',
  'Informa\uFFFD\uFFFDes': 'Informações',
  'Descri\uFFFD\uFFFDo': 'Descrição',
  'descri\uFFFD\uFFFDo': 'descrição',
  'Navega\uFFFD\uFFFDo': 'Navegação',
  'Visualiza\uFFFD\uFFFDes': 'Visualizações',
  'visualiza\uFFFD\uFFFDo': 'visualização',
  'finaliza\uFFFD\uFFFDo': 'finalização',
  'Finaliza\uFFFD\uFFFDo': 'Finalização',
  'Resolu\uFFFD\uFFFDo': 'Resolução',
  'resolu\uFFFD\uFFFDo': 'resolução',
  'edi\uFFFD\uFFFDo': 'edição',
  'Edi\uFFFD\uFFFDo': 'Edição',
  'sele\uFFFD\uFFFDo': 'seleção',
  'Sele\uFFFD\uFFFDo': 'Seleção',
  'sele\uFFFD\uFFFDes': 'seleções',
  'Valida\uFFFD\uFFFDo': 'Validação',
  'valida\uFFFD\uFFFDo': 'validação',
  'Fun\uFFFD\uFFFDo': 'Função',
  'fun\uFFFD\uFFFDo': 'função',
  'Aten\uFFFD\uFFFDo': 'Atenção',
  'aten\uFFFD\uFFFDo': 'atenção',
  'P\uFFFDgina': 'Página',
  'p\uFFFDgina': 'página',
  'T\uFFFDtulo': 'Título',
  't\uFFFDtulo': 'título',
  'M\uFFFDdulo': 'Módulo',
  'm\uFFFDdulo': 'módulo',
  'usu\uFFFDrio': 'usuário',
  'Usu\uFFFDrio': 'Usuário',
  'usu\uFFFDrios': 'usuários',
  'Usu\uFFFDrios': 'Usuários',
  'c\uFFFDdigo': 'código',
  'C\uFFFDdigo': 'Código',
  'c\uFFFDdigos': 'códigos',
  'C\uFFFDdigos': 'Códigos',
  'padr\uFFFDo': 'padrão',
  'Padr\uFFFDo': 'Padrão',
  'n\uFFFDo': 'não',
  'N\uFFFDo': 'Não',
  'N\uFFFDfO': 'NÃO',
  's\uFFFDo': 'são',
  'tamb\uFFFDm': 'também',
  'dispon\uFFFDvel': 'disponível',
  'obrigat\uFFFDrio': 'obrigatório',
  'sucesso': 'sucesso',
  'v\uFFFDlido': 'válido',
  'inv\uFFFDlido': 'inválido',
  'm\uFFFDximo': 'máximo',
  'm\uFFFDnimo': 'mínimo',
  'hist\uFFFDrico': 'histórico',
  'Benef\uFFFDcios': 'Benefícios',
  'benef\uFFFDcios': 'benefícios',
  'se\uFFFD\uFFFDo': 'seção',
  'Se\uFFFD\uFFFDo': 'Seção',
  'conte\uFFFDdo': 'conteúdo',
  'Conte\uFFFDdo': 'conteúdo',
  'Bot\uFFFDo': 'Botão',
  'bot\uFFFDo': 'botão',
  'op\uFFFD\uFFFDo': 'opção',
  'Op\uFFFD\uFFFDo': 'Opção',
  'exibi\uFFFD\uFFFDo': 'exibição',
  'altera\uFFFD\uFFFDes': 'alterações',
  'Sugest\uFFFDo': 'Sugestão',
  'Sugest\uFFFD\uFFFDes': 'Sugestões',
  'Marca d\uFFFDgua': "Marca d'água",
  'd\uFFFDgua': 'água',
  'B\uFFFDblia': 'Bíblia',
  'Devocionais': 'Devocionais',
  'm\uFFFDs': 'mês',
  'M\uFFFDs': 'Mês',
  'n\uFFFDmero': 'número',
  'N\uFFFDmero': 'Número',
  'ap\uFFFDs': 'após',
  'ser\uFFFD': 'será',
  'voc\uFFFD': 'você',
  'Voc\uFFFD': 'Você',
  'espec\uFFFDfico': 'específico',
  'espec\uFFFDfica': 'específica',
  'COMPAT\uFFFDVEL': 'COMPATÍVEL',
  'compat\uFFFDvel': 'compatível',
  'ESPEC\uFFFDfica': 'Específica',
  'ESPEC\uFFFDFICA': 'ESPECÍFICA'
};

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === 'uploads') continue;
    // skip bulky backups
    if (/backup|old|premium-dynamic|index-new|index-old/i.test(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (EXT.test(ent.name)) acc.push(p);
  }
  return acc;
}

function stripEmojiRemnants(s) {
  let out = s;
  // ✅ → �o.  / ✔ variants
  out = out.replace(/\uFFFD+o\.\s*/g, '');
  out = out.replace(/\uFFFDo\.\s*/g, '');
  // ⚠️ → s�️ / �s�️ / Y-�️
  out = out.replace(/[Ys]?\uFFFD*s?\uFE0F?\uFFFD*️?\s*/g, (m) => {
    // only strip when it's clearly emoji leftover near warn markers — too broad?
    return m;
  });
  // Safer targeted emoji leftovers commonly seen
  out = out.replace(/\uFFFDs\uFFFD*️?\s*/g, '');
  out = out.replace(/Y\uFFFD*"\uFFFD+\s*/g, '');
  out = out.replace(/Y-\uFFFD*️?\s*/g, '');
  out = out.replace(/Y"\uFFFD+\s*/g, '');
  out = out.replace(/"\uFFFD*️\s*/g, '');
  out = out.replace(/\uFFFD-\uFFFD*️?\s*/g, '');
  out = out.replace(/\uFFFDO\s*\[/g, '['); // �O [GLOBAL
  out = out.replace(/\uFFFDsltima/g, 'Última');
  out = out.replace(/\uFFFDsltimo/g, 'Último');
  out = out.replace(/ESTE\s*\uFFFD\?\s*O\s+PRINCIPAL/g, 'ESTE É O PRINCIPAL');
  out = out.replace(/\uFFFD\?'/g, '—');
  out = out.replace(/\uFFFD\?\uFFFD/g, '—');
  out = out.replace(/\uFFFD\?"/g, '—');
  out = out.replace(/\uFFFD\?z/g, '');
  out = out.replace(/\uFFFD\?T/g, "'");
  out = out.replace(/\uFFFD\?o\uFFFD?\?z/g, '');
  // Classic "â�" broken checkmark leftovers in strings
  out = out.replace(/â�'?/g, '');
  out = out.replace(/ðŸ\uFFFD?¦?\uFFFD?\?z\s*/g, '');
  out = out.replace(/ðŸ[^\x00-\x7F'"]{0,6}/g, '');
  return out;
}

function applyWordMap(s) {
  const keys = Object.keys(WORD_MAP).sort((a, b) => b.length - a.length);
  let out = s;
  for (const k of keys) out = out.split(k).join(WORD_MAP[k]);
  return out;
}

function stripRemainingFffdInUiHints(s) {
  // Remove leftover FFFD next to punctuation/spaces in messages
  let out = s;
  out = out.replace(/\uFFFD{1,4}/g, '');
  return out;
}

function fixFile(filePath) {
  const before = fs.readFileSync(filePath, 'utf8');
  const countBefore = (before.match(/\uFFFD/g) || []).length;
  if (countBefore === 0 && !/â�|ðŸ/.test(before)) return null;

  let after = before;
  after = stripEmojiRemnants(after);
  after = applyWordMap(after);
  // Only strip remaining FFFD in JS/HTML frontend (not binary-ish)
  after = stripRemainingFffdInUiHints(after);

  const countAfter = (after.match(/\uFFFD/g) || []).length;
  if (after !== before) {
    fs.writeFileSync(filePath, after);
    return { file: path.relative(ROOT, filePath), before: countBefore, after: countAfter };
  }
  return null;
}

const files = [];
for (const d of TARGET_DIRS) walk(path.join(ROOT, d), files);

const results = [];
for (const f of files) {
  try {
    const r = fixFile(f);
    if (r) results.push(r);
  } catch (e) {
    console.error('fail', f, e.message);
  }
}

results.sort((a, b) => b.before - a.before);
console.log('Updated', results.length, 'files');
results.slice(0, 30).forEach((r) => {
  console.log(String(r.before).padStart(5), '->', String(r.after).padStart(4), r.file);
});

// syntax check critical JS
const { spawnSync } = require('child_process');
for (const rel of [
  'public_html/formPageEdit.js',
  'public/dashboard.js',
  'public_html/dashboard.js',
  'public/kingSelectionProject.js',
  'public_html/admin/admin.js'
]) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) continue;
  const c = spawnSync(process.execPath, ['--check', p], { encoding: 'utf8' });
  console.log('check', rel, c.status === 0 ? 'OK' : (c.stderr || '').split('\n')[0]);
}
