/**
 * Corrige mojibake UTF-8 típico nos JS do dashboard.
 * Ordem: sequências longas primeiro. Sem substituições ambíguas.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

const REPLACEMENTS = [
    [/Validaf§f£o/g, 'Validação'],
    [/descrif§f£o/g, 'descrição'],
    [/Descrif§f£o/g, 'Descrição'],
    [/informaf§fµes/g, 'informações'],
    [/corref§fµes/g, 'correções'],
    [/sincronizaf§f£o/g, 'sincronização'],
    [/necessf¡rias/g, 'necessárias'],
    [/especf­ficas/g, 'específicas'],
    [/obrigatf³rios/g, 'obrigatórios'],
    [/acessf­vel/g, 'acessível'],
    [/possf­vel/g, 'possível'],
    [/invf¡lido/g, 'inválido'],
    [/invf¡lida/g, 'inválida'],
    [/invf¡lidos/g, 'inválidos'],
    [/vf¡lida/g, 'válida'],
    [/estf¡/g, 'está'],
    [/comef§a/g, 'começa'],
    [/Re-lanf§a/g, 'Re-lança'],
    [/lanf§a/g, 'lança'],
    [/Faf§a/g, 'Faça'],
    [/Botf£o/g, 'Botão'],
    [/Cartf£o/g, 'Cartão'],
    [/Cf³digo/g, 'Código'],
    [/contf©m/g, 'contém'],
    [/nfºmero/g, 'número'],
    [/PADRfO/g, 'PADRÃO'],
    [/FUN—\.ES/g, 'FUNÇÕES'],
    [/FUN—fO/g, 'FUNÇÃO'],
    [/M"DULO/g, 'MÓDULO'],
    [/M"dulo/g, 'Módulo'],
    [/m"dulo/g, 'módulo'],
    [/FINAN\?AS/g, 'FINANÇAS'],
    [/nf£o/g, 'não'],
    [/Nf£o/g, 'Não'],
    [/sf£o/g, 'são'],
    [/Sf£o/g, 'São'],
    // genéricos (depois dos compostos)
    [/f§f£o/g, 'ção'],
    [/f§f£/g, 'çã'],
    [/f§fµes/g, 'ções'],
    [/f§fµo/g, 'ção'],
    [/f§fµ/g, 'ço'],
    [/f§a/g, 'ça'],
    [/f£o/g, 'ão'],
    [/f£/g, 'ã'],
    [/f©/g, 'é'],
    [/F©/g, 'É'],
    [/f¡/g, 'á'],
    [/f­/g, 'í'],
    [/f³/g, 'ó'],
    [/fµ/g, 'õ'],
    [/fº/g, 'ú'],
    [/f§/g, 'ç'],
    [/â"—/g, '✓']
];

function fixText(t) {
    let out = t;
    for (const [re, to] of REPLACEMENTS) out = out.replace(re, to);
    return out;
}

function collectFiles() {
    const list = [path.join(ROOT, 'public', 'dashboard.js')];
    const jsDir = path.join(ROOT, 'public', 'js');
    for (const f of fs.readdirSync(jsDir)) {
        if (f.startsWith('dashboard-') && f.endsWith('.js')) {
            list.push(path.join(jsDir, f));
        }
    }
    return list;
}

function syncToPublicHtml(relFromPublic) {
    const src = path.join(ROOT, 'public', relFromPublic);
    const dest = path.join(ROOT, 'public_html', relFromPublic);
    if (!fs.existsSync(src)) return false;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return true;
}

function main() {
    const files = collectFiles();
    let changed = 0;
    for (const f of files) {
        const before = fs.readFileSync(f, 'utf8');
        const after = fixText(before);
        if (after !== before) {
            fs.writeFileSync(f, after, 'utf8');
            changed++;
            console.log('fixed', path.relative(ROOT, f));
        }
        execSync('node --check "' + f + '"', { stdio: 'pipe' });
    }
    console.log('encoding fixed files:', changed, '/', files.length);

    const htmlPath = path.join(ROOT, 'public', 'dashboard.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace(/\?v=2026-09-07-mods\d+/g, '?v=2026-09-07-mods10');
    html = html.replace(/dashboard-vitrine\.js\?v=[^"]+/g, 'dashboard-vitrine.js?v=2026-09-07-mods10');
    html = html.replace(/dashboard-ocultar-modulos-por-plano\.js\?v=[^"]+/g, 'dashboard-ocultar-modulos-por-plano.js?v=2026-09-07-mods10');
    html = html.replace(/dashboard-cropper-enhance\.js\?v=[^"]+/g, 'dashboard-cropper-enhance.js?v=2026-09-07-mods10');
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log('HTML cache -> mods10');

    const syncList = [
        'dashboard.js',
        'dashboard.html',
        ...fs.readdirSync(path.join(ROOT, 'public', 'js'))
            .filter((f) => f.startsWith('dashboard-'))
            .map((f) => path.join('js', f))
    ];
    for (const extra of ['js/salesPage.js', 'css/salesPage.css', 'admin-prosperidade-31.html', 'cors-fix-dashboard.html']) {
        if (fs.existsSync(path.join(ROOT, 'public', extra))) syncList.push(extra);
    }

    let synced = 0;
    for (const rel of syncList) {
        if (syncToPublicHtml(rel)) synced++;
    }
    console.log('synced to public_html:', synced);

    const pat = /f§|f£|fµ|Descrif|nf£o|M"DULO|FUN—|Cartf£o|Botf£o/;
    let residual = 0;
    for (const f of files) {
        const t = fs.readFileSync(f, 'utf8');
        const m = t.match(pat);
        if (m) {
            residual++;
            console.log('residual', path.relative(ROOT, f), m[0]);
        }
    }
    console.log('residual files:', residual);
    console.log('done');
}

main();
