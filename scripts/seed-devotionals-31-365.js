/**
 * Script para inserir devocionais 31-365 no banco
 * Baseado em devocionais.json (20 devocionais) - cicla através deles
 */
const fs = require('fs');
const path = require('path');

const devocionaisPath = path.join(__dirname, '..', 'data', 'bible', 'devocionais.json');
const devocionais = JSON.parse(fs.readFileSync(devocionaisPath, 'utf8'));

// Versículos bíblicos conhecidos para os 20 devocionais (ordem do JSON)
const versiculoTextos = [
  'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
  'Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.',
  'Porque eu bem sei os pensamentos que tenho a respeito de vós, diz o Senhor; pensamentos de paz e não de mal, para vos dar o fim que desejais.',
  'Mas os que esperam no Senhor renovam as suas forças; sobem com asas como águias; correm e não se cansam; caminham e não se fatigam.',
  'E sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus.',
  'O Senhor é o meu pastor; nada me faltará.',
  'Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.',
  'Se alguém está em Cristo, nova criatura é; as coisas velhas já passaram; eis que tudo se fez novo.',
  'Posso todas as coisas naquele que me fortalece.',
  'Não temas, porque eu sou contigo; não te assombres, porque eu sou teu Deus.',
  'Não to mandei eu? Esforça-te e tem bom ânimo; não pasmes nem te espantes, porque o Senhor teu Deus é contigo.',
  'Pela graça sois salvos, por meio da fé; e isto não vem de vós, é dom de Deus.',
  'Eu sou o caminho, e a verdade e a vida; ninguém vem ao Pai senão por mim.',
  'Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.',
  'O amor é paciente, o amor é bondoso. Não inveja, não se vangloria.',
  'Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.',
  'Buscai primeiro o reino de Deus, e a sua justiça, e todas estas coisas vos serão acrescentadas.',
  'Mas Deus prova o seu amor para conosco em que Cristo morreu por nós, sendo nós ainda pecadores.',
  'Aquele que não ama não conhece a Deus; porque Deus é amor.',
  'Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas diante de Deus as vossas petições.'
];

function escapeSql(str) {
  if (str == null) return 'NULL';
  return "'" + String(str).replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
}

const lines = [];
for (let day = 31; day <= 365; day++) {
  const idx = (day - 1) % 20;
  const d = devocionais[idx];
  const versiculoTexto = versiculoTextos[idx] || d.texto?.substring(0, 200) || '';
  const reflexao = d.texto || '';
  const aplicacao = 'Hoje, reflita sobre este tema e coloque em prática a mensagem do versículo.';
  const oracao = d.oracao || 'Senhor, ajuda-me a aplicar Tua Palavra em minha vida. Amém.';

  lines.push(`(${day}, ${escapeSql(d.titulo)}, ${escapeSql(d.versiculo)}, ${escapeSql(versiculoTexto)}, ${escapeSql(reflexao)}, ${escapeSql(aplicacao)}, ${escapeSql(oracao)})`);
}

const sql = `-- Migration 178: Devocionais 31-365
INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
${lines.join(',\n')}
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

SELECT 'Migration 178: ' || COUNT(*) || ' devocionais (dias 31-365) inseridos.' AS status FROM bible_devotionals_365 WHERE day_of_year >= 31 AND day_of_year <= 365;
`;

const outPath = path.join(__dirname, '..', 'migrations', '178_bible_devotionals_31_365.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log('Migration criada:', outPath);
