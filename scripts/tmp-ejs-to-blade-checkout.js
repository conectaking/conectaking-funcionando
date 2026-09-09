/* Temporário: converte views/checkout.ejs para Blade preservando HTML/JS. */
const fs = require('fs');

const src = fs.readFileSync('views/checkout.ejs', 'utf8');
const stack = [];
let unknown = 0;

const out = src.replace(/<%[-=]?[\s\S]*?%>/g, (tag) => {
  const body = tag.replace(/^<%[-=]?/, '').replace(/%>$/, '').trim();

  if (tag.startsWith('<%=')) {
    if (body === "checkoutPageTitle ? checkoutPageTitle + ' - ' : ''") {
      return "{{ $checkoutPageTitle ? $checkoutPageTitle.' - ' : '' }}";
    }
    if (body === "checkoutPageTitle ? '' : ' | KingForms'") {
      return "{{ $checkoutPageTitle ? '' : ' | KingForms' }}";
    }
    if (/^checkoutPagePrimaryColor \|\| ['"]#1152d4['"]$/.test(body)) {
      return "{{ $checkoutPagePrimaryColor ?: '#1152d4' }}";
    }
    if (body === "(priceCents / 100).toFixed(2).replace('.', ',')") {
      return "{{ number_format($priceCents / 100, 2, ',', '') }}";
    }
    if (body === "formCoverImageUrl.replace(/'/g, '&#39;')") {
      return '{{ $formCoverImageUrl }}';
    }
    if (body === "checkoutPageFooter || 'KingForms by ConectaKing'") {
      return "{{ $checkoutPageFooter ?: 'KingForms by ConectaKing' }}";
    }
    if (/^[a-zA-Z_$][\w$]*$/.test(body)) {
      return '{{ $' + body + ' }}';
    }
    unknown++;
    console.error('NAO CONVERTIDO (saida): ' + tag);
    return tag;
  }

  const ifMatch = body.match(/^if\s*\((.+)\)\s*\{$/);
  if (ifMatch) {
    stack.push('if');
    return '@if(' + toPhpExpr(ifMatch[1].trim()) + ')';
  }
  const forMatch = body.match(/^for\s*\(\s*var\s+(\w+)\s*=\s*(.+?);\s*(.+?);\s*(.+?)\s*\)\s*\{$/);
  if (forMatch) {
    stack.push('for');
    const [, v, init, cond, step] = forMatch;
    return `@for($${v} = ${init}; ${cond.replace(new RegExp('\\b' + v + '\\b', 'g'), '$' + v)}; ${step.replace(new RegExp('\\b' + v + '\\b', 'g'), '$' + v)})`;
  }
  if (body === '} else {') return '@else';
  if (body === '}') {
    const open = stack.pop();
    return open === 'for' ? '@endfor' : '@endif';
  }

  unknown++;
  console.error('NAO CONVERTIDO (bloco): ' + tag);
  return tag;
});

function toPhpExpr(expr) {
  return expr
    .replace(/!([a-zA-Z_$][\w$]*)/g, '! $$$1')
    .replace(/(^|[\s(!])([a-zA-Z_$][\w$]*)(\s*(===|!==|==|!=|\)|$))/g, (m, pre, name, rest) => {
      if (pre.endsWith('$')) return m;
      return pre + '$' + name + rest;
    })
    .replace(/\$\$/g, '$');
}

if (stack.length) {
  console.error('AVISO: blocos abertos sem fecho: ' + stack.join(','));
}
fs.mkdirSync('laravel/resources/views/checkout', { recursive: true });
fs.writeFileSync('laravel/resources/views/checkout/kingforms.blade.php', out, 'utf8');
console.log('OK — tags nao convertidas: ' + unknown);
