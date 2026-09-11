import fs from 'node:fs';
import path from 'node:path';

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.blade.php')) acc.push(p);
  }
  return acc;
}

let styleTags = 0;
let styleAttr = 0;
let rootDyn = 0;
const tagFiles = [];
const rootFiles = [];

for (const f of walk('resources/views')) {
  const s = fs.readFileSync(f, 'utf8');
  const tags = (s.match(/<style\b/gi) || []).length;
  const attrs = (s.match(/\sstyle="/gi) || []).length;
  const roots = (s.match(/:root\s*\{/g) || []).length;
  styleTags += tags;
  styleAttr += attrs;
  rootDyn += roots;
  if (tags) tagFiles.push(`${tags} ${f}`);
  if (roots) rootFiles.push(`${roots} ${f}`);
}

console.log('STYLE_TAGS', styleTags);
console.log('STYLE_ATTR', styleAttr);
console.log('ROOT_BLOCKS', rootDyn);
console.log('---TAG FILES---');
tagFiles.sort((a, b) => Number(b.split(' ')[0]) - Number(a.split(' ')[0])).forEach((x) => console.log(x));
console.log('---ROOT FILES---');
rootFiles.forEach((x) => console.log(x));
