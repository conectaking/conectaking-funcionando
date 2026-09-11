import fs from 'node:fs';
import path from 'node:path';

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.blade.php') || e.name.endsWith('.js') || e.name.endsWith('.css') || e.name.endsWith('.mjs')) acc.push(p);
  }
  return acc;
}

const roots = ['resources', 'app', 'routes'].filter((r) => fs.existsSync(r));
const re = /\/vendor\/(chartjs|leaflet|cropperjs|sortablejs|jspdf|html2pdf|html5-qrcode|qrcodejs|qrcode|pdf-lib|fontawesome)\b/g;
const hits = [];
for (const root of roots) {
  for (const f of walk(root)) {
    const s = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(s))) hits.push(`${f}:${s.slice(0, m.index).split(/\n/).length} ${m[0]}`);
  }
}
console.log(hits.length ? hits.join('\n') : 'NO_VENDOR_REFS_IN_SOURCE');
