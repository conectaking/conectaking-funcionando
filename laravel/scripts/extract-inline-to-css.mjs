/**
 * Extract static style="" from a Blade into a CSS file + class names.
 * Skips values with Blade/dynamic markers: {{ @ $php
 *
 * Usage: node scripts/extract-inline-to-css.mjs <blade> <cssOut> [prefix]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [, , bladeRel, cssRel, prefix = 'ck-x'] = process.argv;
if (!bladeRel || !cssRel) {
  console.error('Usage: node scripts/extract-inline-to-css.mjs <blade> <cssOut> [prefix]');
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, '..');
const bladePath = path.resolve(root, bladeRel);
const cssPath = path.resolve(root, cssRel);

let html = fs.readFileSync(bladePath, 'utf8');
const map = new Map(); // normStyle -> className

function isDynamic(style) {
  // Só Blade dinâmico — não confundir com cores hex (#A1A1A1)
  return /\{\{/.test(style);
}

/** Keep only pure display toggles inline (JS often sets el.style.display). */
function isJsToggleStyle(style) {
  const n = style.replace(/\s+/g, ' ').trim().replace(/;+$/, '');
  return /^display\s*:\s*[^;]+$/i.test(n);
}

function shortHash(s) {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 6);
}

function addClass(attrs, cls) {
  if (/class="/i.test(attrs)) {
    return attrs.replace(/class="([^"]*)"/i, (m, c) => {
      const set = new Set(c.split(/\s+/).filter(Boolean));
      set.add(cls);
      return `class="${[...set].join(' ')}"`;
    });
  }
  return ` class="${cls}"` + attrs;
}

let n = 0;
html = html.replace(/(\s)style="([^"]*)"/gi, (full, sp, styleVal) => {
  const raw = styleVal.trim();
  if (!raw || isDynamic(raw) || isJsToggleStyle(raw)) return full;
  const norm = raw.replace(/\s+/g, ' ').trim();
  let cls = map.get(norm);
  if (!cls) {
    cls = `${prefix}-${shortHash(norm)}`;
    map.set(norm, cls);
  }
  n++;
  return `${sp}data-ck-ex="${cls}"`;
});

html = html.replace(
  /<([a-zA-Z0-9]+)([^>]*?)\sdata-ck-ex="([^"]+)"([^>]*)>/g,
  (m, tag, pre, cls, post) => {
    let attrs = pre + post;
    attrs = addClass(attrs, cls);
    return `<${tag}${attrs}>`;
  },
);

const cssBlocks = [...map.entries()]
  .map(([style, cls]) => {
    const body = style.endsWith(';') ? style : `${style};`;
    return `.${cls} { ${body} }`;
  })
  .join('\n');

let existing = '';
if (fs.existsSync(cssPath)) existing = fs.readFileSync(cssPath, 'utf8');
const banner = `\n\n/* auto-extracted from ${path.relative(root, bladePath).replace(/\\/g, '/')} */\n`;
const marker = `/* auto-extracted from ${path.relative(root, bladePath).replace(/\\/g, '/')} */`;
if (existing.includes(marker)) {
  // replace previous auto block
  const re = new RegExp(
    `\\n\\n\\/\\* auto-extracted from ${path.relative(root, bladePath).replace(/\\/g, '/').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\*\\/[\\s\\S]*$`,
  );
  existing = existing.replace(re, '');
}

fs.mkdirSync(path.dirname(cssPath), { recursive: true });
fs.writeFileSync(cssPath, existing.trimEnd() + banner + cssBlocks + '\n');
fs.writeFileSync(bladePath, html);

console.log({
  blade: path.relative(root, bladePath),
  css: path.relative(root, cssPath),
  replacements: n,
  uniqueClasses: map.size,
});
