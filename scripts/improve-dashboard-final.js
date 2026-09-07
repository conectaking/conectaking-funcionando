/**
 * Melhorias finais: extrai Separação + Forms editor; declara vars em falta;
 * limpa mojibake comum; bump HTML.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DASH = path.join(ROOT, 'public', 'dashboard.js');
const HTML = path.join(ROOT, 'public', 'dashboard.html');
const SEP_OUT = path.join(ROOT, 'public', 'js', 'dashboard-separacao.js');
const FORMS_OUT = path.join(ROOT, 'public', 'js', 'dashboard-forms-editor.js');

function dedent(arr) {
    return arr.map((l) => (l.startsWith('    ') ? l.slice(4) : l)).join('\n');
}
function findFn(lines, name) {
    return lines.findIndex((l) => new RegExp('(async\\s+)?function\\s+' + name + '\\b').test(l));
}

function wrap(title, body, exportsBlock) {
    return `/**
 * ${title} — módulo isolado (Conecta King).
 * Gerado por scripts/improve-dashboard-final.js
 */
(function (global) {
    'use strict';

    function core() { return global.DashboardCore || {}; }

    var env = {
        get API_URL() {
            var c = core();
            if (typeof c.getApiUrl === 'function') return c.getApiUrl() || '';
            return global.API_URL || global.API_BASE || '';
        },
        get HEADERS() {
            var c = core();
            if (typeof c.getHeaders === 'function') return c.getHeaders() || {};
            return { 'Content-Type': 'application/json' };
        },
        get HEADERS_AUTH() {
            var c = core();
            if (typeof c.getHeadersAuth === 'function') return c.getHeadersAuth() || {};
            return {};
        },
        safeFetch: function (url, options) {
            var c = core();
            if (typeof c.safeFetch === 'function') return c.safeFetch(url, options);
            return fetch(url, options);
        }
    };

${body}

${exportsBlock}
})(typeof window !== 'undefined' ? window : this);
`;
}

function rewrite(body) {
    return body
        .replace(/window\.API_URL/g, '__WAPI__')
        .replace(/\bAPI_URL\b/g, 'env.API_URL')
        .replace(/__WAPI__/g, 'window.API_URL')
        .replace(/\bHEADERS_AUTH\b/g, 'env.HEADERS_AUTH')
        .replace(/\bHEADERS\b/g, 'env.HEADERS')
        .replace(/\bsafeFetch\s*\(/g, 'env.safeFetch(');
}

function fixMojibake(text) {
    const map = [
        [/FUNCIONALIDADE DE ASSINATURA/g, 'SEPARAÇÃO DE PACOTES (ADM)'],
        [/FUN—.ES DO FORMUL/g, 'FUNÇÕES DO FORMUL'],
        [/FUN—.ES PARA LISTA/g, 'FUNÇÕES PARA LISTA'],
        [/FILTRO DE M"DULOS/g, 'FILTRO DE MÓDULOS'],
        [/Ys\?/g, ''],
        [/Y""/g, ''],
        [/Y'< /g, ''],
        [/O Erro/g, 'Erro'],
        [/Visualizaf§fµes/g, 'Visualizações'],
        [/perf­odo/g, 'período'],
        [/Seguranf§a/g, 'Segurança'],
        [/padrf£o/g, 'padrão'],
        [/Funf§f£o/g, 'Função'],
        [/f­cone/g, 'ícone'],
        [/edif§f£o/g, 'edição'],
        [/Lf³gica/g, 'Lógica'],
        [/delegaf§f£o/g, 'delegação'],
        [/Doaf§f£o/g, 'Doação'],
        [/PERSONALIZA—fO/g, 'PERSONALIZAÇÃO'],
        [/\?oIncluir logomarca—/g, '"Incluir logomarca"'],
        [/parf¢metros/g, 'parâmetros']
    ];
    for (const [re, to] of map) text = text.replace(re, to);
    return text;
}

function main() {
    let lines = fs.readFileSync(DASH, 'utf8').split(/\n/);

    const sepComment = lines.findIndex((l) => l.includes('FUNCIONALIDADE DE ASSINATURA') || (l.includes('checkAdminAndShowLink') && l.includes('function')));
    const sepStart = lines.findIndex((l, i) => i >= 4360 && /async function checkAdminAndShowLink/.test(l));
    const filtroStart = lines.findIndex((l) => l.includes('FILTRO DE M') && l.includes('DULOS'));
    const formsStart = lines.findIndex((l) => l.includes('FORMUL') && l.includes('PERGUNTAS'));
    const personalizarStart = lines.findIndex((l) => l.includes('PERSONALIZAR LINK DO SITE'));

    if (sepStart < 0 || filtroStart < 0 || formsStart < 0 || personalizarStart < 0) {
        throw new Error('markers: ' + JSON.stringify({ sepStart, filtroStart, formsStart, personalizarStart }));
    }

    // Separacao: from comment block before checkAdmin through before FILTRO
    let sepFrom = sepStart;
    while (sepFrom > 0 && (lines[sepFrom - 1].includes('====') || lines[sepFrom - 1].trim().startsWith('//') || lines[sepFrom - 1].trim() === '')) {
        sepFrom--;
    }
    const sepTo = filtroStart; // exclusive - keep filtro in core

    console.log('SEP', sepFrom + 1, '-', sepTo);
    console.log('FORMS', formsStart + 1, '-', personalizarStart);

    let sepBody = rewrite(dedent(lines.slice(sepFrom, sepTo)));
    sepBody = sepBody
        .replace(/env\.loadModuleAvailability\(/g, 'loadModuleAvailability(')
        .replace(/env\.renderModuleAvailability\(/g, 'renderModuleAvailability(')
        .replace(/env\.checkAdminAndShowLink\(/g, 'checkAdminAndShowLink(')
        .replace(/env\.loadIndividualPlans\(/g, 'loadIndividualPlans(')
        .replace(/env\.renderIndividualPlans\(/g, 'renderIndividualPlans(')
        .replace(/env\.showUserModulesModal\(/g, 'showUserModulesModal(');

    // Ensure state vars
    if (!/let moduleAvailabilityData|var moduleAvailabilityData/.test(sepBody)) {
        sepBody =
            'var moduleAvailabilityData = null;\nvar moduleAvailabilityChanges = {};\n\n' + sepBody;
    }

    const sepExports = `
    var DashboardSeparacao = {
        checkAdminAndShowLink: checkAdminAndShowLink,
        loadModuleAvailability: loadModuleAvailability,
        renderModuleAvailability: renderModuleAvailability
    };
    global.DashboardSeparacao = DashboardSeparacao;
    if (typeof checkAdminAndShowLink === 'function') {
        checkAdminAndShowLink();
    }
`;

    fs.writeFileSync(SEP_OUT, fixMojibake(wrap('Dashboard Separação de Pacotes (ADM)', sepBody, sepExports)), 'utf8');
    console.log('Wrote', SEP_OUT);

    // Forms: from FORMS comment through before PERSONALIZAR LINK
    let formsBody = rewrite(dedent(lines.slice(formsStart, personalizarStart)));
    formsBody = formsBody
        .replace(/env\.renderFormQuestions\(/g, 'renderFormQuestions(')
        .replace(/env\.addQuestion\(/g, 'addQuestion(')
        .replace(/env\.editQuestion\(/g, 'editQuestion(')
        .replace(/env\.deleteQuestion\(/g, 'deleteQuestion(')
        .replace(/env\.loadGuestLists\(/g, 'loadGuestLists(')
        .replace(/env\.openGuestListEditor\(/g, 'openGuestListEditor(');

    const formsExports = `
    var DashboardFormsEditor = {
        renderFormQuestions: typeof renderFormQuestions === 'function' ? renderFormQuestions : null,
        addQuestion: typeof addQuestion === 'function' ? addQuestion : null,
        loadGuestLists: typeof loadGuestLists === 'function' ? loadGuestLists : null,
        openGuestListEditor: typeof openGuestListEditor === 'function' ? openGuestListEditor : null
    };
    global.DashboardFormsEditor = DashboardFormsEditor;
    // already assigned window.renderFormQuestions / loadFormResponses in body
`;

    fs.writeFileSync(FORMS_OUT, fixMojibake(wrap('Dashboard King Forms (editor de perguntas / convidados)', formsBody, formsExports)), 'utf8');
    console.log('Wrote', FORMS_OUT);

    // Rebuild dashboard: remove sep and forms blocks
    const keep = [
        ...lines.slice(0, sepFrom),
        ...[
            '    // Separação de Pacotes: js/dashboard-separacao.js',
            '    // King Forms editor: js/dashboard-forms-editor.js',
            ''
        ],
        ...lines.slice(sepTo, formsStart),
        ...lines.slice(personalizarStart)
    ];

    let patched = keep.join('\n');
    patched = fixMojibake(patched);

    // Fix avatar upload still using handleDashboardAvatarUpload - stub exists earlier OK

    fs.writeFileSync(DASH, patched, 'utf8');
    console.log('Updated', DASH);

    // Fix mojibake on other modules (light)
    const modFiles = fs.readdirSync(path.join(ROOT, 'public', 'js'))
        .filter((f) => f.startsWith('dashboard-') && f.endsWith('.js'))
        .map((f) => path.join(ROOT, 'public', 'js', f));
    for (const f of modFiles) {
        const before = fs.readFileSync(f, 'utf8');
        const after = fixMojibake(before);
        if (after !== before) {
            fs.writeFileSync(f, after, 'utf8');
            console.log('encoding fix', path.basename(f));
        }
    }

    // HTML: add scripts + bump all to mods9
    let html = fs.readFileSync(HTML, 'utf8');
    const v = '2026-09-07-mods9';
    html = html.replace(/\?v=2026-09-07-mods\d*/g, '?v=' + v);
    html = html.replace(/\?v=2026-09-07-mods"/g, '?v=' + v + '"'); // safety

    if (!html.includes('dashboard-separacao.js')) {
        html = html.replace(
            /(<script src="js\/dashboard-listeners\.js[^>]*><\/script>)/,
            `$1\n    <script src="js/dashboard-separacao.js?v=${v}" defer></script>\n    <script src="js/dashboard-forms-editor.js?v=${v}" defer></script>`
        );
    }
    // also bump dashboard.js version if pattern missed
    html = html.replace(/dashboard\.js\?v=[^"]+/, 'dashboard.js?v=' + v);

    // Wire kingDocs-nav if missing
    if (!html.includes('dashboard-kingDocs-nav.js')) {
        html = html.replace(
            /(<script src="js\/dashboard-info\.js[^>]*><\/script>)/,
            `$1\n    <script src="js/dashboard-kingDocs-nav.js?v=${v}" defer></script>`
        );
    }

    fs.writeFileSync(HTML, html, 'utf8');
    console.log('Updated HTML');

    for (const f of [DASH, SEP_OUT, FORMS_OUT]) {
        execSync(`node --check "${f}"`, { stdio: 'inherit' });
        console.log('OK', path.basename(f));
    }
}

main();
