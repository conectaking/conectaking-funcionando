/**
 * Extrai cartão/preview/vcard helpers → public/js/dashboard-cartao.js
 * Uso: node scripts/extract-dashboard-cartao.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DASH = path.join(ROOT, 'public', 'dashboard.js');
const OUT = path.join(ROOT, 'public', 'js', 'dashboard-cartao.js');

function main() {
    const lines = fs.readFileSync(DASH, 'utf8').split(/\n/);

    const start = lines.findIndex((l) => /function\s+hexToRgba\b/.test(l));
    const reconcileExport = lines.findIndex((l) => l.includes('window.reconcileModulesListWithProfileData = reconcileModulesListWithProfileData'));
    const renderEditor = lines.findIndex((l) => /function\s+renderEditor\b/.test(l));

    if (start < 0) throw new Error('hexToRgba não encontrado (já extraído?)');
    if (reconcileExport < 0) throw new Error('reconcile export não encontrado');
    if (renderEditor < 0) throw new Error('renderEditor não encontrado');

    const end = reconcileExport; // inclusive
    console.log('Extract', start + 1, '-', end + 1, '(' + (end - start + 1) + ' lines)');

    let body = lines
        .slice(start, end + 1)
        .map((l) => (l.startsWith('    ') ? l.slice(4) : l))
        .join('\n');

    // Drop the window.reconcile line from body; re-export cleanly at end
    body = body.replace(/\nwindow\.reconcileModulesListWithProfileData = reconcileModulesListWithProfileData;?\n?/g, '\n');

    // Bridge deps from DashboardCore
    body = body
        .replace(/\bsetAvatarSrc\s*\(/g, 'env.setAvatarSrc(')
        .replace(/\bDEFAULT_AVATAR_PLACEHOLDER\b/g, 'env.DEFAULT_AVATAR_PLACEHOLDER')
        .replace(/\bapplyAvatarFormatToPreview\s*\(/g, 'env.applyAvatarFormatToPreview(')
        .replace(/\bparseBannerDestination\s*\(/g, 'env.parseBannerDestination(');

    // SELECTORS via Proxy — leave identifier SELECTORS as-is, define Proxy in wrapper

    const wrapped = `/**
 * Dashboard Cartão / Preview — módulo isolado (Conecta King).
 * Preview ao vivo, vCard, preservação de estado dos módulos.
 * Depende de window.DashboardCore (getSelectors, setAvatarSrc, …).
 * Gerado por scripts/extract-dashboard-cartao.js
 */
(function (global) {
    'use strict';

    function core() {
        return global.DashboardCore || {};
    }

    var env = {
        get DEFAULT_AVATAR_PLACEHOLDER() {
            var c = core();
            if (typeof c.getDefaultAvatarPlaceholder === 'function') return c.getDefaultAvatarPlaceholder();
            return '';
        },
        setAvatarSrc: function (el, src) {
            var c = core();
            if (typeof c.setAvatarSrc === 'function') return c.setAvatarSrc(el, src);
            if (el) el.src = src || '';
        },
        applyAvatarFormatToPreview: function (el, format) {
            var c = core();
            if (typeof c.applyAvatarFormatToPreview === 'function') return c.applyAvatarFormatToPreview(el, format);
        },
        parseBannerDestination: function (raw) {
            var c = core();
            if (typeof c.parseBannerDestination === 'function') return c.parseBannerDestination(raw);
            return { primary_url: String(raw || '').trim(), instagram_url: '', whatsapp_url: '' };
        }
    };

    var SELECTORS = new Proxy({}, {
        get: function (_t, prop) {
            var c = core();
            var s = typeof c.getSelectors === 'function' ? c.getSelectors() : null;
            if (!s) return null;
            return s[prop];
        }
    });

${body}

    var DashboardCartao = {
        updateLivePreviewFromForm: updateLivePreviewFromForm,
        updateVcardPreviewButton: updateVcardPreviewButton,
        preserveLocalItemStates: preserveLocalItemStates,
        restoreLocalItemStates: restoreLocalItemStates,
        appendMinimalModuleListItem: appendMinimalModuleListItem,
        reconcileModulesListWithProfileData: reconcileModulesListWithProfileData,
        normalizeProfileItemType: normalizeProfileItemType,
        getModuleListItemsFromProfile: getModuleListItemsFromProfile,
        hexToRgba: hexToRgba,
        convertYouTubeUrlToEmbed: convertYouTubeUrlToEmbed
    };

    global.DashboardCartao = DashboardCartao;
    global.updateLivePreviewFromForm = updateLivePreviewFromForm;
    global.reconcileModulesListWithProfileData = reconcileModulesListWithProfileData;
})(typeof window !== 'undefined' ? window : this);
`;

    fs.writeFileSync(OUT, wrapped, 'utf8');
    console.log('Wrote', OUT);

    const stubs = `
    // Cartão/preview: js/dashboard-cartao.js (DashboardCartao)
    function updateLivePreviewFromForm() {
        if (window.DashboardCartao && typeof window.DashboardCartao.updateLivePreviewFromForm === 'function') {
            return window.DashboardCartao.updateLivePreviewFromForm();
        }
    }
    function updateVcardPreviewButton(buttonEl) {
        if (window.DashboardCartao && typeof window.DashboardCartao.updateVcardPreviewButton === 'function') {
            return window.DashboardCartao.updateVcardPreviewButton(buttonEl);
        }
    }
    function preserveLocalItemStates() {
        if (window.DashboardCartao && typeof window.DashboardCartao.preserveLocalItemStates === 'function') {
            return window.DashboardCartao.preserveLocalItemStates();
        }
        return {};
    }
    function restoreLocalItemStates(preservedStates) {
        if (window.DashboardCartao && typeof window.DashboardCartao.restoreLocalItemStates === 'function') {
            return window.DashboardCartao.restoreLocalItemStates(preservedStates);
        }
    }
    function appendMinimalModuleListItem(item) {
        if (window.DashboardCartao && typeof window.DashboardCartao.appendMinimalModuleListItem === 'function') {
            return window.DashboardCartao.appendMinimalModuleListItem(item);
        }
        return false;
    }
    function reconcileModulesListWithProfileData(profileData) {
        if (window.DashboardCartao && typeof window.DashboardCartao.reconcileModulesListWithProfileData === 'function') {
            return window.DashboardCartao.reconcileModulesListWithProfileData(profileData);
        }
    }
    function normalizeProfileItemType(item) {
        if (window.DashboardCartao && typeof window.DashboardCartao.normalizeProfileItemType === 'function') {
            return window.DashboardCartao.normalizeProfileItemType(item);
        }
        return item;
    }
    function getModuleListItemsFromProfile(profileData) {
        if (window.DashboardCartao && typeof window.DashboardCartao.getModuleListItemsFromProfile === 'function') {
            return window.DashboardCartao.getModuleListItemsFromProfile(profileData);
        }
        return [];
    }
    window.reconcileModulesListWithProfileData = reconcileModulesListWithProfileData;

`;

    const before = lines.slice(0, start);
    const after = lines.slice(end + 1);
    let patched = before.join('\n') + '\n' + stubs + after.join('\n');

    // Augment DashboardCore after setAvatarSrc / DEFAULT_AVATAR
    if (!patched.includes('getSelectors')) {
        patched = patched.replace(
            /function setAvatarSrc\(element, src\) \{[\s\S]*?\n    \}\n/,
            (match) =>
                match +
                `
    if (window.DashboardCore) {
        window.DashboardCore.getSelectors = function () { return SELECTORS; };
        window.DashboardCore.setAvatarSrc = setAvatarSrc;
        window.DashboardCore.getDefaultAvatarPlaceholder = function () { return DEFAULT_AVATAR_PLACEHOLDER; };
    }
`
        );
    }

    if (!patched.includes('DashboardCore.parseBannerDestination')) {
        patched = patched.replace(
            /function parseBannerDestination\(raw\) \{[\s\S]*?\n    \}\n/,
            (match) =>
                match +
                `
    if (window.DashboardCore) {
        window.DashboardCore.parseBannerDestination = parseBannerDestination;
    }
`
        );
    }

    if (!patched.includes('DashboardCore.applyAvatarFormatToPreview')) {
        patched = patched.replace(
            /function applyAvatarFormatToPreview\(avatarElement, format\) \{[\s\S]*?\n    \}\n/,
            (match) =>
                match +
                `
    if (window.DashboardCore) {
        window.DashboardCore.applyAvatarFormatToPreview = applyAvatarFormatToPreview;
    }
`
        );
    }

    fs.writeFileSync(DASH, patched, 'utf8');
    console.log('Updated', DASH);

    execSync(`node --check "${OUT}"`, { stdio: 'inherit' });
    execSync(`node --check "${DASH}"`, { stdio: 'inherit' });
    console.log('OK syntax');
}

main();
