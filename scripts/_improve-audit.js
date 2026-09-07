const fs = require('fs');
const path = require('path');
const lines = fs.readFileSync('public/dashboard.js', 'utf8').split(/\n/);
console.log('lines', lines.length);

function findFn(n) {
  return lines.findIndex((l) => new RegExp('(async\\s+)?function\\s+' + n + '\\b').test(l));
}
function nextTop(start) {
  for (let i = start + 1; i < lines.length; i++) {
    if (/^    (async )?function [a-zA-Z]/.test(lines[i])) return i;
    if (/^    window\.[a-zA-Z].*=\s*(async )?function/.test(lines[i])) return i;
  }
  return lines.length;
}

const names = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^    (async )?function ([a-zA-Z0-9_]+)/);
  if (m) names.push({ name: m[2], line: i + 1, span: nextTop(i) - i });
}
names.sort((a, b) => b.span - a.span);
console.log('Top functions by size:');
names.slice(0, 25).forEach((n) => console.log(String(n.span).padStart(5), 'L' + n.line, n.name));

// Check HTML scripts
const html = fs.readFileSync('public/dashboard.html', 'utf8');
const scripts = [...html.matchAll(/src="(js\/dashboard-[^"]+|dashboard\.js[^"]*)"/g)].map((m) => m[1]);
console.log('\nHTML scripts:', scripts.length);
scripts.forEach((s) => console.log(' ', s));

// Missing files?
const jsDir = fs.readdirSync('public/js').filter((f) => f.startsWith('dashboard-'));
console.log('\npublic/js dashboard-*:', jsDir.length);
