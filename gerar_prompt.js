const fs = require('fs');
const path = require('path');

const ignoreList = [
  'node_modules',
  '.git',
  '.vscode',
  'package-lock.json',
  'dist',
  'build',
  '.env',
  'gerar_prompt.js'
];

const ignoreExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf'];

const listFiles = (dir) => {
  let output = '';
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relativePath = path.relative(process.cwd(), fullPath);

    if (ignoreList.includes(file) || ignoreExtensions.includes(path.extname(file))) {
      continue;
    }

    if (fs.statSync(fullPath).isDirectory()) {
      output += listFiles(fullPath);
    } else {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        output += `\n--- ${relativePath} ---\n`;
        output += content;
        output += `\n--- FIM DE ${relativePath} ---\n`;
      } catch (e) {
         output += `\n--- ${relativePath} (Não foi possível ler) ---\n`;
      }
    }
  }
  return output;
};

const projectRoot = process.cwd();
const finalOutput = `Estrutura do Projeto e Código:\n${listFiles(projectRoot)}`;

fs.writeFileSync('prompt_completo.txt', finalOutput);

console.log('\n✅ Prompt gerado com sucesso!');
console.log('Seu código completo foi salvo no arquivo: prompt_completo.txt');
console.log('Copie o conteúdo desse arquivo e cole para a IA.');