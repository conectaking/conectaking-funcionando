import fs from 'node:fs';
const css = fs.readFileSync('resources/css/pub/pages/kingSelectionProject.css', 'utf8');
const lines = css.split('\n');
lines.forEach((l, i) => {
  if (l.match(/z-index:\s*(1200|2[0-9]{2})/)) {
    console.log(`Line ${i+1}: ${l.trim()} | Context: ${lines.slice(Math.max(0, i-4), i+1).map(x=>x.trim()).join(' ')}`);
  }
});
