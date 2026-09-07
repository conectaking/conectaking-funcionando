/**
 * Extrai QR + Assinatura do dashboard.js
 * Também recupera QR_ART_THEMES do edit-modal (ficou preso por engano).
 * Uso: node scripts/extract-dashboard-qr-assinatura.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DASH = path.join(ROOT, 'public', 'dashboard.js');
const EDIT = path.join(ROOT, 'public', 'js', 'dashboard-edit-modal.js');
const QR_OUT = path.join(ROOT, 'public', 'js', 'dashboard-qr.js');
const SUB_OUT = path.join(ROOT, 'public', 'js', 'dashboard-assinatura.js');

function dedent(arr) {
    return arr.map((l) => (l.startsWith('    ') ? l.slice(4) : l)).join('\n');
}
function findFn(lines, name) {
    return lines.findIndex((l) => new RegExp('(async\\s+)?function\\s+' + name + '\\b').test(l));
}

function wrap(title, body, exportsBlock, extraTop = '') {
    return `/**
 * ${title} — módulo isolado (Conecta King).
 * Gerado por scripts/extract-dashboard-qr-assinatura.js
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

    var SELECTORS = new Proxy({}, {
        get: function (_t, prop) {
            var c = core();
            var s = typeof c.getSelectors === 'function' ? c.getSelectors() : null;
            return s ? s[prop] : null;
        }
    });

${extraTop}
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

function main() {
    let lines = fs.readFileSync(DASH, 'utf8').split(/\n/);
    let editSrc = fs.readFileSync(EDIT, 'utf8');

    // Pull QR_ART_THEMES from edit-modal
    const themesMatch = editSrc.match(/const QR_ART_THEMES = \{[\s\S]*?\n\};/);
    if (!themesMatch) throw new Error('QR_ART_THEMES não encontrado em edit-modal');
    const themesBlock = themesMatch[0];
    editSrc = editSrc.replace(themesMatch[0] + '\n\n', '\n').replace(themesMatch[0] + '\n', '\n');
    fs.writeFileSync(EDIT, editSrc, 'utf8');
    console.log('Removed QR_ART_THEMES from edit-modal');

    const qrStart = findFn(lines, 'getShareQrMeta');
    const iconStart = findFn(lines, 'getDefaultIcon');
    // include through window.generateQRCode line before getDefaultIcon
    let qrEnd = iconStart;
    // skip blank lines before getDefaultIcon
    while (qrEnd > qrStart && lines[qrEnd - 1].trim() === '') qrEnd--;

    console.log('QR', qrStart + 1, '-', qrEnd);

    let qrBody = rewrite(dedent(lines.slice(qrStart, qrEnd)));
    qrBody = qrBody
        .replace(/\nwindow\.generateQRCode = generateQRCode;?\n?/g, '\n')
        .replace(/env\.generateQRCode\(/g, 'generateQRCode(')
        .replace(/env\.getShareQrMeta\(/g, 'getShareQrMeta(')
        .replace(/env\.fillQrThemePicker\(/g, 'fillQrThemePicker(')
        .replace(/env\.composeShareQrArt\(/g, 'composeShareQrArt(');

    const qrExports = `
    var DashboardQR = {
        generateQRCode: generateQRCode,
        getShareQrMeta: getShareQrMeta,
        fillQrThemePicker: fillQrThemePicker,
        composeShareQrArt: composeShareQrArt
    };
    global.DashboardQR = DashboardQR;
    global.generateQRCode = generateQRCode;
    global.QR_ART_THEMES = QR_ART_THEMES;
`;

    const qrExtra = `    var qrCodeInstance = null;\n\n${themesBlock}\n`;

    fs.writeFileSync(QR_OUT, wrap('Dashboard QR / Compartilhar', qrBody, qrExports, qrExtra), 'utf8');
    console.log('Wrote', QR_OUT);

    // Subscription
    const subVar = lines.findIndex((l) => l.includes('let subscriptionData = null'));
    const subStart = subVar >= 0 ? subVar : findFn(lines, 'loadSubscriptionInfo');
    const adminStart = findFn(lines, 'checkAdminAndShowLink');
    if (subStart < 0 || adminStart < 0) throw new Error('subscription markers missing');

    console.log('SUB', subStart + 1, '-', adminStart);

    let subBody = rewrite(dedent(lines.slice(subStart, adminStart)));
    subBody = subBody
        .replace(/env\.loadSubscriptionInfo\(/g, 'loadSubscriptionInfo(')
        .replace(/env\.renderSubscriptionInfo\(/g, 'renderSubscriptionInfo(')
        .replace(/env\.renderSubscriptionPlans\(/g, 'renderSubscriptionPlans(')
        .replace(/env\.loadPlansForEdit\(/g, 'loadPlansForEdit(')
        .replace(/env\.loadPlanModules\(/g, 'loadPlanModules(')
        .replace(/env\.loadPlanModulesFromAvailability\(/g, 'loadPlanModulesFromAvailability(');

    const subExports = `
    var DashboardAssinatura = {
        loadSubscriptionInfo: loadSubscriptionInfo,
        renderSubscriptionInfo: renderSubscriptionInfo,
        renderSubscriptionPlans: renderSubscriptionPlans,
        loadPlansForEdit: loadPlansForEdit
    };
    global.DashboardAssinatura = DashboardAssinatura;
    global.loadSubscriptionInfo = loadSubscriptionInfo;
`;

    fs.writeFileSync(SUB_OUT, wrap('Dashboard Assinatura / Planos', subBody, subExports), 'utf8');
    console.log('Wrote', SUB_OUT);

    // Patch dashboard — remove both blocks (from bottom to top)
    // First remove subscription, then QR
    const beforeSub = lines.slice(0, subStart);
    const afterSub = lines.slice(adminStart);
    let mid = beforeSub.concat(afterSub);

    const qrStart2 = mid.findIndex((l) => /function\s+getShareQrMeta\b/.test(l));
    const iconStart2 = mid.findIndex((l) => /function\s+getDefaultIcon\b/.test(l));
    if (qrStart2 < 0 || iconStart2 < 0) throw new Error('QR markers lost after sub removal');

    const stubs = `
    // QR: js/dashboard-qr.js
    function generateQRCode() {
        if (window.DashboardQR && typeof window.DashboardQR.generateQRCode === 'function') {
            return window.DashboardQR.generateQRCode();
        }
    }
    window.generateQRCode = generateQRCode;

    // Assinatura: js/dashboard-assinatura.js
    async function loadSubscriptionInfo() {
        if (window.DashboardAssinatura && typeof window.DashboardAssinatura.loadSubscriptionInfo === 'function') {
            return window.DashboardAssinatura.loadSubscriptionInfo();
        }
    }
    window.loadSubscriptionInfo = loadSubscriptionInfo;

`;

    const out = mid.slice(0, qrStart2).concat(stubs.split(/\n/).map((l) => (l.startsWith('    ') || l === '' ? l : '    ' + l))).concat(mid.slice(iconStart2));

    // Fix stub indentation - stubs already have 4 spaces for function lines
    let patched = mid.slice(0, qrStart2).join('\n') + '\n' + stubs + mid.slice(iconStart2).join('\n');

    // Remove orphan qrCodeInstance if still in dashboard
    patched = patched.replace(/\n    let qrCodeInstance = null;\n/, '\n    // qrCodeInstance → dashboard-qr.js\n');

    fs.writeFileSync(DASH, patched, 'utf8');
    console.log('Updated', DASH);

    execSync(`node --check "${QR_OUT}"`, { stdio: 'inherit' });
    execSync(`node --check "${SUB_OUT}"`, { stdio: 'inherit' });
    execSync(`node --check "${DASH}"`, { stdio: 'inherit' });
    execSync(`node --check "${EDIT}"`, { stdio: 'inherit' });
    console.log('OK syntax');
}

main();
