/**
 * Replace exact repeated style="..." with ck-* utility classes.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.blade.php')) acc.push(p);
  }
  return acc;
}

/** Exact style value (normalized spaces) → class name(s) */
const MAP = [
  ['display: none;', 'ck-hidden'],
  ['display:none', 'ck-hidden'],
  ['display: none', 'ck-hidden'],
  ['margin-bottom: 12px;', 'ck-mb-12'],
  ['margin-top:8px', 'ck-mt-8'],
  ['margin-top:10px', 'ck-mt-10'],
  ['margin-top:12px', 'ck-mt-12'],
  ['margin-top:16px', 'ck-mt-16'],
  ['margin-top: 40px;', 'ck-mt-40'],
  ['margin-bottom:10px', 'ck-mb-10'],
  ['margin-bottom: 16px;', 'ck-mb-16'],
  ['margin-bottom: 20px;', 'ck-mb-20'],
  ['margin-bottom: 25px;', 'ck-mb-25'],
  ['margin-top:12px;margin-bottom:0', 'ck-mt-12-mb-0'],
  ['margin: 0;', 'ck-m-0'],
  ['width:100px', 'ck-w-100'],
  ['width: 100%;', 'ck-w-full'],
  ['flex: 1;', 'ck-flex-1'],
  ['list-style: none;', 'ck-list-none'],
  ['padding: 6px 12px; font-size: 0.85rem;', 'ck-btn-sm'],
  ['padding: 8px 16px; font-size: 0.9rem;', 'ck-btn-md'],
  ['padding: 12px 24px;', 'ck-px-12-py-24'],
  [
    'color: rgba(245, 245, 245, 0.7); text-decoration: none; transition: color 0.3s;',
    'ck-link-muted',
  ],
  ['color: var(--text-dark); font-size: 0.9rem; font-weight: 600;', 'ck-label-dark'],
  ['color: var(--text-dark); font-size: 0.9rem;', 'ck-text-dark-09'],
  ['color: var(--text-light); font-weight: 600;', 'ck-text-light-bold'],
  ['color: var(--text-dark); text-align: center;', 'ck-text-dark-center'],
  ['margin-bottom: 20px; color: var(--text);', 'ck-mb-20-text'],
  ['color: var(--text-secondary, #888888); margin-bottom: 20px;', 'ck-text-muted-mb20'],
  [
    'display: block; margin-bottom: 8px; color: var(--text-dark); font-size: 0.9rem; font-weight: 600;',
    'ck-label-block',
  ],
  [
    'display: block; color: var(--text-primary, #F5F5F5); margin-bottom: 8px; font-weight: 600;',
    'ck-label-primary',
  ],
  [
    'display: block; margin-bottom: 6px; font-size: 0.9rem; color: var(--text-secondary, #888888);',
    'ck-label-muted',
  ],
  [
    'display:block;margin-top:6px;opacity:.75;font-size:0.8rem;',
    'ck-hint',
  ],
  [
    'display:block;font-size:0.8rem;color:var(--text-dark,#A1A1A1);margin-bottom:4px;',
    'ck-hint-dark',
  ],
  [
    'display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;',
    'ck-flex-between',
  ],
  [
    'display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;',
    'ck-flex-between-15',
  ],
  ['display: flex; gap: 10px; align-items: center;', 'ck-flex-gap-10'],
  ['display:flex;align-items:center;gap:6px;cursor:pointer;', 'ck-flex-gap-6'],
  ['display: flex; align-items: center; gap: 8px; cursor: pointer;', 'ck-flex-gap-8'],
  ['display: flex; align-items: flex-end; gap: 10px;', 'ck-flex-end-gap'],
  ['display: flex; align-items: center; gap: 12px; flex-wrap: wrap;', 'ck-flex-wrap-12'],
  ['display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;', 'ck-flex-wrap-mt'],
  [
    'display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; padding: 15px;',
    'ck-flex-center-pad',
  ],
  ['max-width: 1200px; margin: 0 auto; padding: 0 20px;', 'ck-container-1200'],
  [
    'max-width: 1200px; margin: 0 auto; padding: 0 20px; position: relative; z-index: 1;',
    'ck-container-1200-z',
  ],
  ['max-width: 900px; margin: 0 auto;', 'ck-container-900'],
  ['color: rgba(245, 245, 245, 0.8); line-height: 1.8;', 'ck-text-muted'],
  ['color: var(--text-secondary, #888888); font-size: 0.85rem;', 'ck-text-muted-sm'],
  ['color: var(--text-secondary, #888888); margin-top: 10px;', 'ck-text-muted-mt'],
  ['font-size: 0.9rem; color: var(--text-light);', 'ck-text-light-09'],
  [
    "color: var(--white); margin-bottom: 12px; font-family: 'Cinzel', serif; font-size: 1.3rem;",
    'ck-heading-cinzel',
  ],
  [
    "text-align: center; color: var(--white); margin-bottom: 12px; font-family: 'Cinzel', serif;",
    'ck-heading-cinzel-center',
  ],
  ['text-align: center; color: rgba(245, 245, 245, 0.8);', 'ck-text-muted-center'],
  [
    "font-family: 'Cinzel', serif; color: var(--yellow-primary); margin-bottom: 20px; font-size: 1.2rem;",
    'ck-heading-gold',
  ],
  [
    'position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden;',
    'ck-sr-only',
  ],
  // cards / inputs (admin + shared)
  [
    'background: var(--bg-card); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color);',
    'ck-card-pad',
  ],
  [
    'background: var(--bg-card); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color); cursor: pointer;',
    'ck-card-pad-click',
  ],
  [
    'background: var(--bg-card); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 20px;',
    'ck-card-pad-mb',
  ],
  [
    'width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-dark, #16161a); color: var(--text-primary, #F5F5F5);',
    'ck-input',
  ],
  [
    'width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-light); color: var(--text-light);',
    'ck-input-admin',
  ],
  [
    'width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--border-color, #333); background: var(--bg-dark, #16161a); color: var(--text-primary, #F5F5F5);',
    'ck-input-lg',
  ],
  [
    'width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--border-color, #333); background: var(--input-bg, #0B0B0B); color: var(--text-primary, #F5F5F5); font-size: 1rem;',
    'ck-input-dash',
  ],
  [
    'width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-color, #333); background: var(--graphite, #1F1F1F); color: var(--text-primary, #FFF); font-size: 0.95rem;',
    'ck-input-graphite',
  ],
  [
    'padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-light); color: var(--text-light);',
    'ck-input-sm',
  ],
  [
    'width: 60px; height: 60px; background: rgba(255, 199, 0, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center;',
    'ck-icon-box',
  ],
  [
    'width: 60px; height: 45px; border: 2px solid var(--border-color, #333); border-radius: 8px; cursor: pointer;',
    'ck-color-swatch',
  ],
  [
    'flex: 1; padding: 12px; border-radius: 8px; border: 2px solid var(--border-color, #333); background: var(--input-bg, #0B0B0B); color: var(--text-primary, #F5F5F5); font-size: 1rem; font-family: monospace;',
    'ck-input-hex',
  ],
  // index FAQ / sections
  [
    'background: var(--black-absolute); border: 1px solid rgba(255, 199, 0, 0.2); border-radius: 12px; margin-bottom: 16px; overflow: hidden;',
    'ck-faq-item',
  ],
  [
    'padding: 24px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: var(--white); font-weight: 600;',
    'ck-faq-q',
  ],
  ['color: var(--yellow-primary); transition: transform 0.3s;', 'ck-faq-chevron'],
  ['max-height: 0; overflow: hidden; transition: max-height 0.3s ease;', 'ck-faq-a'],
  [
    'padding: 0 24px 24px; color: rgba(245, 245, 245, 0.8); line-height: 1.8;',
    'ck-faq-body',
  ],
  [
    'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;',
    'ck-grid-stats',
  ],
  // advanced-filters: CSS em admin.css já define display/grid — só remove style
  [
    'display: none; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;',
    '',
  ],
  [
    'margin: 0; color: var(--text-light); font-size: 1.1rem; font-weight: 600;',
    'ck-card-title',
  ],
  [
    'background: var(--card-bg, #1F1F1F); border-radius: 12px; padding: 30px; margin-bottom: 30px; border: 2px solid var(--border-color, #333);',
    'ck-dash-card',
  ],
  [
    'background: var(--card-bg, #1F1F1F); border-radius: 12px; padding: 30px; border: 2px solid var(--border-color, #333);',
    'ck-dash-card-nb',
  ],
  [
    'color: var(--text-primary, #F5F5F5); margin-bottom: 20px; display: flex; align-items: center; gap: 10px;',
    'ck-dash-h',
  ],
  [
    'color: var(--text-primary, #F5F5F5); margin-bottom: 25px; display: flex; align-items: center; gap: 10px;',
    'ck-dash-h-25',
  ],
];

function norm(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function addClass(attrs, cls) {
  const classes = cls.split(/\s+/);
  if (/class="/i.test(attrs)) {
    return attrs.replace(/class="([^"]*)"/i, (m, c) => {
      const set = new Set(c.split(/\s+/).filter(Boolean));
      classes.forEach((x) => set.add(x));
      return `class="${[...set].join(' ')}"`;
    });
  }
  return ` class="${cls}"` + attrs;
}

let filesChanged = 0;
let replacements = 0;

for (const file of walk(path.join(root, 'resources/views'))) {
  let html = fs.readFileSync(file, 'utf8');
  const original = html;

  html = html.replace(/(\s)style="([^"]*)"/gi, (full, sp, styleVal) => {
    const n = norm(styleVal);
    const hit = MAP.find(([from]) => norm(from) === n);
    if (!hit) return full;
    replacements++;
    return `${sp}data-ck-replace="${hit[1]}"`;
  });

  html = html.replace(
    /<([a-zA-Z0-9]+)([^>]*?)\sdata-ck-replace="([^"]*)"([^>]*)>/g,
    (m, tag, pre, cls, post) => {
      let attrs = pre + post;
      if (cls) attrs = addClass(attrs, cls);
      return `<${tag}${attrs}>`;
    },
  );

  if (html !== original) {
    fs.writeFileSync(file, html);
    filesChanged++;
    console.log('OK', path.relative(root, file));
  }
}

console.log({ filesChanged, replacements });
