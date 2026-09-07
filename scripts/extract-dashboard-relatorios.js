/**
 * Extrai Relatórios do dashboard.js → public/js/dashboard-relatorios.js
 * Uso: node scripts/extract-dashboard-relatorios.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DASH = path.join(ROOT, 'public', 'dashboard.js');
const OUT = path.join(ROOT, 'public', 'js', 'dashboard-relatorios.js');

function main() {
    const lines = fs.readFileSync(DASH, 'utf8').split(/\n/);

    const start = lines.findIndex((l) => l.includes('async function fetchAnalyticsData'));
    if (start < 0) throw new Error('fetchAnalyticsData não encontrado (já extraído?)');

    const end = lines.findIndex((l, i) => i > start && l.includes('function updateLivePreviewFromForm'));
    if (end < 0) throw new Error('fim do bloco (updateLivePreviewFromForm) não encontrado');

    // Include from fetchAnalyticsData through line before updateLivePreviewFromForm
    // Also drop the early `let performanceChartInstance = null;` if present alone
    const chunkLines = lines.slice(start, end);
    console.log('Extracting lines', start + 1, '-', end, '(' + chunkLines.length + ')');

    let body = chunkLines
        .map((l) => (l.startsWith('    ') ? l.slice(4) : l))
        .join('\n');

    // Remove window.loadReportsData assignment mid-file; we'll export at end
    body = body.replace(/\nwindow\.loadReportsData = loadReportsData;\n/, '\n');
    body = body.replace(/\n\/\/ Variáveis globais para gráficos do cliente\nlet clientPerformanceChart = null;\nlet clientLinksChart = null;\n/, '\n');

    // SELECTORS → DOM helpers
    body = body
        .replace(/SELECTORS\.periodSelector/g, 'els.periodSelector()')
        .replace(/SELECTORS\.kpiTotalViews/g, 'els.kpiTotalViews()')
        .replace(/SELECTORS\.kpiTotalClicks/g, 'els.kpiTotalClicks()')
        .replace(/SELECTORS\.kpiCtr/g, 'els.kpiCtr()')
        .replace(/SELECTORS\.kpiTotalSaves/g, 'els.kpiTotalSaves()')
        .replace(/SELECTORS\.performanceChartCanvas/g, 'els.performanceChartCanvas()')
        .replace(/SELECTORS\.topItemsList/g, 'els.topItemsList()');

    // API / headers via env
    body = body
        .replace(/window\.API_URL/g, '__WINDOW_API_URL__')
        .replace(/\bAPI_URL\b/g, 'env.API_URL')
        .replace(/__WINDOW_API_URL__/g, 'window.API_URL')
        .replace(/\bHEADERS_AUTH\b/g, 'env.HEADERS_AUTH')
        .replace(/\bHEADERS\b/g, 'env.HEADERS');

    // Guard null SELECTORS access patterns like els.kpiTotalViews().textContent
    // Add safe helpers that no-op if missing

    const wrapped = `/**
 * Dashboard Relatórios — módulo isolado (Conecta King).
 * Depende de window.DashboardCore e Chart.js no HTML.
 * Gerado por scripts/extract-dashboard-relatorios.js
 */
(function (global) {
    'use strict';

    function core() {
        return global.DashboardCore || {};
    }

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
        }
    };

    var els = {
        periodSelector: function () { return document.getElementById('period-selector'); },
        kpiTotalViews: function () { return document.getElementById('kpi-total-views'); },
        kpiTotalClicks: function () { return document.getElementById('kpi-total-clicks'); },
        kpiCtr: function () { return document.getElementById('kpi-ctr'); },
        kpiTotalSaves: function () { return document.getElementById('kpi-total-saves'); },
        performanceChartCanvas: function () { return document.getElementById('performance-chart'); },
        topItemsList: function () { return document.getElementById('top-items-list'); }
    };

    var performanceChartInstance = null;
    var clientPerformanceChart = null;
    var clientLinksChart = null;
    var reportsLoaded = false;

${body}

    // Null-safe wrappers for KPI updates
    var _renderKPIs = renderKPIs;
    renderKPIs = function (data) {
        if (!els.kpiTotalViews()) return;
        return _renderKPIs(data);
    };
    var _renderTopItems = renderTopItems;
    renderTopItems = function (data) {
        if (!els.topItemsList()) return;
        return _renderTopItems(data);
    };
    var _renderPerformanceChart = renderPerformanceChart;
    renderPerformanceChart = function (data) {
        var canvas = els.performanceChartCanvas();
        if (!canvas || typeof Chart === 'undefined') return;
        return _renderPerformanceChart(data);
    };
    var _loadReportsData = loadReportsData;
    loadReportsData = async function () {
        if (!els.periodSelector()) {
            console.warn('[DashboardRelatorios] period-selector não encontrado');
            return;
        }
        return _loadReportsData();
    };

    global.loadReportsData = loadReportsData;
    global.DashboardRelatorios = {
        init: function () {
            var sel = els.periodSelector();
            if (sel && !sel.dataset.relatoriosBound) {
                sel.addEventListener('change', function () { loadReportsData(); });
                sel.dataset.relatoriosBound = '1';
            }
        },
        load: loadReportsData,
        fetchAnalyticsData: fetchAnalyticsData
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            if (global.DashboardRelatorios) global.DashboardRelatorios.init();
        });
    } else {
        global.DashboardRelatorios.init();
    }
})(typeof window !== 'undefined' ? window : this);
`;

    fs.writeFileSync(OUT, wrapped, 'utf8');
    console.log('Wrote', OUT);

    // Patch dashboard.js: remove chunk, remove performanceChartInstance if only for reports,
    // keep period listener via window.loadReportsData
    const before = lines.slice(0, start);
    const after = lines.slice(end);

    let patched = before.join('\n') + '\n\n    // Relatórios: js/dashboard-relatorios.js (window.loadReportsData / DashboardRelatorios)\n\n' + after.join('\n');

    // Remove orphan performanceChartInstance
    patched = patched.replace(/\n    let performanceChartInstance = null;\n/, '\n');

    // Fix local loadReportsData references in listeners
    patched = patched.replace(
        /if \(targetId === 'relatorios-pane'\) \{\s*\n\s*loadReportsData\(\);\s*\n\s*\}/g,
        `if (targetId === 'relatorios-pane') {
                            if (typeof window.loadReportsData === 'function') window.loadReportsData();
                        }`
    );
    patched = patched.replace(
        /if \(SELECTORS\.periodSelector\) \{\s*\n\s*SELECTORS\.periodSelector\.addEventListener\('change', loadReportsData\);\s*\n\s*\}/g,
        `if (SELECTORS.periodSelector) {
            SELECTORS.periodSelector.addEventListener('change', function () {
                if (typeof window.loadReportsData === 'function') window.loadReportsData();
            });
        }`
    );

    // Init hook
    if (!patched.includes('DashboardRelatorios')) {
        patched = patched.replace(
            /if \(window\.DashboardPersonalizar && typeof window\.DashboardPersonalizar\.init === 'function'\) window\.DashboardPersonalizar\.init\(\);/,
            `if (window.DashboardPersonalizar && typeof window.DashboardPersonalizar.init === 'function') window.DashboardPersonalizar.init();
        if (window.DashboardRelatorios && typeof window.DashboardRelatorios.init === 'function') window.DashboardRelatorios.init();`
        );
    }

    fs.writeFileSync(DASH, patched, 'utf8');
    console.log('Updated', DASH);

    const { execSync } = require('child_process');
    execSync(`node --check "${OUT}"`, { stdio: 'inherit' });
    execSync(`node --check "${DASH}"`, { stdio: 'inherit' });
    console.log('OK syntax');
}

main();
