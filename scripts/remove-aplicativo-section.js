const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'public_html', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const start = html.indexOf('<!-- Baixe seu aplicativo -->');
const faq = html.indexOf('<!-- FAQ -->');
if (start === -1 || faq === -1 || faq <= start) {
  console.error('Could not locate aplicativo section');
  process.exit(1);
}
html = html.slice(0, start) + html.slice(faq);
fs.writeFileSync(indexPath, html);
console.log('Removed aplicativo section. Still has #aplicativo?', html.includes('id="aplicativo"'));

// Filter removed modules helper patch marker
console.log('done');
