import fs from 'node:fs';

const files = [
  'resources/views/pages/dashboard.blade.php',
  'resources/views/cartao/public.blade.php',
  'resources/views/cartao/bible-hub.blade.php',
];

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  const before = (s.match(/style="display:\s*none;?"/gi) || []).length;

  s = s.replace(/class="([^"]*)"([^>]*)\sstyle="display:\s*none;?"/gi, (m, cls, mid) => {
    if (cls.split(/\s+/).includes('ck-hidden')) {
      return `class="${cls}"${mid}`;
    }
    return `class="${cls} ck-hidden"${mid}`;
  });

  s = s.replace(/style="display:\s*none;?"([^>]*)\sclass="([^"]*)"/gi, (m, mid, cls) => {
    if (cls.split(/\s+/).includes('ck-hidden')) {
      return `${mid} class="${cls}"`;
    }
    return `${mid} class="${cls} ck-hidden"`;
  });

  s = s.replace(
    /<(input|div|a|main|section|span|button)([^>]*?)\sstyle="display:\s*none;?"([^>]*)>/gi,
    (m, tag, pre, post) => {
      if (/class=/.test(pre + post)) return m;
      return `<${tag}${pre} class="ck-hidden"${post}>`;
    }
  );

  const after = (s.match(/style="display:\s*none;?"/gi) || []).length;
  fs.writeFileSync(f, s);
  console.log(f, before, '->', after);
}
