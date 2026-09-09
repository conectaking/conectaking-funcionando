/**
 * Proxy Node → Laravel (cartão virtual).
 *
 * - /l/* sempre (se LARAVEL_CARD_ENABLED)
 * - /:slug só com flag LARAVEL_CARD_PUBLIC ou ?laravel=1
 * - Canário: LARAVEL_CARD_SLUGS=slug1,slug2
 * - APIs cartão / profile / upload / satélites (flags)
 */
const http = require('http');

const LARAVEL_ENABLED = String(process.env.LARAVEL_CARD_ENABLED || 'true').toLowerCase() !== 'false';
const LARAVEL_HOST = process.env.LARAVEL_HOST || '127.0.0.1';
const LARAVEL_PORT = Number(process.env.LARAVEL_PORT || 8080);
const LARAVEL_CARD_PUBLIC = String(process.env.LARAVEL_CARD_PUBLIC || 'false').toLowerCase() === 'true';
const LARAVEL_CARD_APIS = String(process.env.LARAVEL_CARD_APIS || 'true').toLowerCase() !== 'false';
const LARAVEL_PROFILE_API = String(process.env.LARAVEL_PROFILE_API || 'false').toLowerCase() === 'true';
const LARAVEL_UPLOAD_API = String(process.env.LARAVEL_UPLOAD_API || 'false').toLowerCase() === 'true';
const LARAVEL_SATELLITES = String(process.env.LARAVEL_SATELLITES || 'false').toLowerCase() === 'true';
const LARAVEL_KS = String(process.env.LARAVEL_KS || 'false').toLowerCase() === 'true';
const LARAVEL_DASHBOARD = String(process.env.LARAVEL_DASHBOARD || 'false').toLowerCase() === 'true';
const LARAVEL_ADMIN_BIBLE = String(process.env.LARAVEL_ADMIN_BIBLE || process.env.LARAVEL_SATELLITES || 'false').toLowerCase() === 'true';
const LARAVEL_CARD_SLUGS = new Set(
    String(process.env.LARAVEL_CARD_SLUGS || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
);
const LARAVEL_KS_SLUGS = new Set(
    String(process.env.LARAVEL_KS_SLUGS || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
);

const RESERVED_STORE_SEGMENTS = new Set([
    'form', 'forms', 'biblia', 'bible', 'produto', 'product', 'king-selection', 'kingselection',
    'api', 'l', 'dashboard', 'login', 'admin', 'upload', 'uploads', 'vcard', 'log', 'card',
    'download', 'health', 'static', 'js', 'css', 'img', 'assets', 'public', 'loja'
]);

function shouldServePublicCardWithLaravel(req, slug) {
    if (!LARAVEL_ENABLED) return false;
    const q = req.query || {};
    const force = String(q.laravel || q.engine || '').toLowerCase();
    if (force === '1' || force === 'true' || force === 'laravel') return true;
    if (!LARAVEL_CARD_PUBLIC) return false;
    const s = String(slug || '').toLowerCase();
    if (!s) return false;
    if (LARAVEL_CARD_SLUGS.size === 0) return true;
    return LARAVEL_CARD_SLUGS.has(s);
}

function slugAllowedForSatellite(slug) {
    const s = String(slug || '').toLowerCase();
    if (!s) return false;
    if (LARAVEL_CARD_SLUGS.size === 0) return true;
    return LARAVEL_CARD_SLUGS.has(s);
}

function slugAllowedForKs(gallerySlug) {
    const s = String(gallerySlug || '').toLowerCase();
    if (!s) return false;
    if (LARAVEL_KS_SLUGS.size === 0) return true;
    return LARAVEL_KS_SLUGS.has(s);
}

function wantsNodeEngine(urlPath) {
    return /[?&](laravel|engine)=node(?:&|$)/i.test(String(urlPath || ''));
}

function wantsLaravelEngine(urlPath) {
    return /[?&](laravel|engine)=(1|true|laravel)(?:&|$)/i.test(String(urlPath || ''));
}

function isLaravelCardApiPath(urlPath) {
    if (!urlPath) return false;
    const pathOnly = urlPath.split('?')[0];
    const patterns = [
        /^\/api\/pix\/qrcode\/\d+$/i,
        /^\/api\/bible\/verse-of-day$/i,
        /^\/api\/bible\/books$/i,
        /^\/api\/bible\/book\/[^/]+\/\d+$/i,
        /^\/api\/bible\/study\/books$/i,
        /^\/api\/bible\/study\/book\/[^/]+$/i,
        /^\/api\/bible\/devocional-do-dia$/i,
        /^\/api\/bible\/salmo-do-dia$/i,
        /^\/api\/bible\/devocional-biblia-inteira$/i,
        /^\/api\/bible\/reading-plan\/day\/\d+$/i,
        /^\/api\/bible\/prosperidade\/ativacao\/\d+$/i,
        /^\/api\/bible\/prosperidade\/hoje$/i,
        /^\/api\/bible\/prosperidade\/list$/i,
        /^\/api\/bible\/prosperidade\/nearest-published\/\d+$/i,
        /^\/api\/bible\/prosperidade\/mark-read$/i,
        /^\/api\/bible\/prosperidade\/read-status$/i,
        /^\/api\/bible\/devotional\/mark-read$/i,
        /^\/api\/bible\/devotional\/read-status$/i,
        /^\/l\/api\/pix\/qrcode\/\d+$/i,
        /^\/l\/api\/bible\/verse-of-day$/i,
        /^\/l\/api\/bible\/books$/i,
        /^\/l\/api\/bible\/book\/[^/]+\/\d+$/i,
        /^\/l\/api\/bible\/study\/books$/i,
        /^\/l\/api\/bible\/study\/book\/[^/]+$/i,
        /^\/l\/api\/bible\/devocional-do-dia$/i,
        /^\/l\/api\/bible\/salmo-do-dia$/i,
        /^\/l\/api\/bible\/devocional-biblia-inteira$/i,
        /^\/l\/api\/bible\/devotionals-365\/\d+$/i,
        /^\/l\/api\/bible\/reading-plan\/day\/\d+$/i,
        /^\/l\/api\/bible\/prosperidade\/ativacao\/\d+$/i,
        /^\/l\/api\/bible\/prosperidade\/hoje$/i,
        /^\/l\/api\/bible\/prosperidade\/list$/i,
        /^\/l\/api\/bible\/prosperidade\/nearest-published\/\d+$/i,
        /^\/l\/api\/bible\/prosperidade\/mark-read$/i,
        /^\/l\/api\/bible\/prosperidade\/read-status$/i,
        /^\/l\/api\/bible\/devotional\/mark-read$/i,
        /^\/l\/api\/bible\/devotional\/read-status$/i,
        /^\/log\/view\/[^/]+$/i,
        /^\/log\/click\/item\/\d+$/i,
        /^\/log\/vcard\/[^/]+$/i,
        /^\/l\/log\/view\/[^/]+$/i,
        /^\/l\/log\/click\/item\/\d+$/i,
        /^\/l\/log\/vcard\/[^/]+$/i,
        /^\/vcard\/[^/]+$/i,
        /^\/l\/vcard\/[^/]+$/i,
        /^\/download\/pdf\/\d+$/i,
        /^\/l\/download\/pdf\/\d+$/i,
    ];
    if (patterns.some((re) => re.test(pathOnly))) return true;
    // Devocional 365 completo no Laravel (plain + temas; IA se chave OpenAI / ai!=0)
    if (/^\/(?:l\/)?api\/bible\/devotionals-365\/\d+$/i.test(pathOnly)) return true;
    return false;
}

function isLaravelProfileApiPath(reqMethod, urlPath) {
    if (!urlPath) return false;
    const pathOnly = urlPath.split('?')[0];
    const method = String(reqMethod || 'GET').toUpperCase();
    if (method === 'GET' && (pathOnly === '/api/profile' || pathOnly === '/l/api/profile')) return true;
    if (method === 'PUT' && (pathOnly === '/api/profile/save-all' || pathOnly === '/l/api/profile/save-all')) return true;
    if (method === 'PUT' && /^\/(?:l\/)?api\/profile\/(?:avatar-format|share-image)$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/profile\/import-form-info$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/profile\/import-form$/i.test(pathOnly)) return true;

    const itemsRoot = /^\/(?:l\/)?api\/profile\/items$/i;
    const itemsId = /^\/(?:l\/)?api\/profile\/items\/\d+$/i;
    if (itemsRoot.test(pathOnly) && (method === 'GET' || method === 'POST')) return true;
    if (itemsId.test(pathOnly) && (method === 'GET' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) return true;

    const typed = /^\/(?:l\/)?api\/profile\/items\/(banner|link|carousel|pix|pdf|digital_form)\/\d+$/i;
    if (method === 'PUT' && typed.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/profile\/items\/\d+\/duplicate$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/profile\/items\/repair-sales-pages$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/profile\/items\/digital_form\/\d+\/(responses|dashboard)$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/profile\/items\/digital_form\/\d+\/responses\/delete-bulk$/i.test(pathOnly)) return true;
    if (method === 'DELETE' && /^\/(?:l\/)?api\/profile\/items\/digital_form\/\d+\/responses\/\d+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/profile\/items\/digital_form\/\d+\/create-import-link$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/bible\/my-progress$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/bible\/mark-read$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/bible\/reset-progress$/i.test(pathOnly)) return true;
    return false;
}

function isLaravelUploadPath(reqMethod, urlPath) {
    if (!urlPath) return false;
    const pathOnly = urlPath.split('?')[0];
    const method = String(reqMethod || 'GET').toUpperCase();
    if (method === 'POST' && /^\/(?:l\/)?api\/upload\/(auth|receive-one|image|images|crop|pdf)$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/upload\/get-url\/[^/]+$/i.test(pathOnly)) return true;
    return false;
}

function isLaravelSatellitePath(reqMethod, urlPath) {
    if (!urlPath || wantsNodeEngine(urlPath)) return false;
    const pathOnly = urlPath.split('?')[0];
    const method = String(reqMethod || 'GET').toUpperCase();
    const q = urlPath.includes('?') ? urlPath.slice(urlPath.indexOf('?')) : '';
    const force = /[?&](laravel|engine)=(1|true|laravel)/i.test(q);

    if (method === 'GET' && /^\/(?:l\/)?form\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/l\/loja\/[^/]+\/[^/]+$/i.test(pathOnly)) return true;

    const formItem = pathOnly.match(/^\/([^/]+)\/form\/(\d+)(?:\/(submit|success|checkout))?$/i);
    if (formItem) {
        if (!force && !LARAVEL_SATELLITES) return false;
        if (!force && !slugAllowedForSatellite(formItem[1])) return false;
        const action = (formItem[3] || '').toLowerCase();
        if (action === 'submit') return method === 'POST';
        if (action === 'success' || action === 'checkout') return method === 'GET';
        return method === 'GET';
    }

    const bible = pathOnly.match(/^\/([^/]+)\/biblia\/?$/i);
    if (bible && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(bible[1]);
    }

    const bibleStudy = pathOnly.match(/^\/(?:l\/)?([^/]+)\/biblia\/estudos-livro(?:\/([^/]+))?\/?$/i);
    if (bibleStudy && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(bibleStudy[1]);
    }

    const bibleDev = pathOnly.match(/^\/(?:l\/)?([^/]+)\/biblia\/devocional(?:\/(\d+))?\/?$/i);
    if (bibleDev && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(bibleDev[1]);
    }

    const bibleSalmo = pathOnly.match(/^\/(?:l\/)?([^/]+)\/biblia\/salmo\/?$/i);
    if (bibleSalmo && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(bibleSalmo[1]);
    }

    const biblePlan = pathOnly.match(/^\/(?:l\/)?([^/]+)\/biblia\/plano(?:\/(\d+))?\/?$/i);
    if (biblePlan && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(biblePlan[1]);
    }

    const bibleWhole = pathOnly.match(/^\/(?:l\/)?([^/]+)\/biblia\/biblia-inteira(?:\/(\d+))?\/?$/i);
    if (bibleWhole && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(bibleWhole[1]);
    }

    const biblePros = pathOnly.match(/^\/(?:l\/)?([^/]+)\/biblia\/prosperidade(?:\/(\d+))?\/?$/i);
    if (biblePros && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(biblePros[1]);
    }

    const bibleStudyLegacy = pathOnly.match(/^\/([^/]+)\/bible\/estudo-livro\/([^/]+)\/?$/i);
    if (bibleStudyLegacy && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(bibleStudyLegacy[1]);
    }

    const bibleEn = pathOnly.match(/^\/(?:l\/)?([^/]+)\/bible\/?$/i);
    if (bibleEn && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(bibleEn[1]);
    }

    const bibleReader = pathOnly.match(/^\/(?:l\/)?([^/]+)\/bible\/([^/]+)\/(\d+)\/?$/i);
    if (bibleReader && method === 'GET') {
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(bibleReader[1]);
    }

    const store = pathOnly.match(/^\/([^/]+)\/([^/]+)\/?$/i);
    if (store && method === 'GET') {
        const profileSlug = store[1];
        const storeSlug = store[2];
        // /js/foo.js e /css/bar.css NÃO são loja — o 1º segmento também é reservado
        if (RESERVED_STORE_SEGMENTS.has(String(profileSlug).toLowerCase())) return false;
        if (RESERVED_STORE_SEGMENTS.has(String(storeSlug).toLowerCase())) return false;
        // ficheiros estáticos (extensão) nunca são sales store
        if (/\.[a-z0-9]{1,8}$/i.test(storeSlug)) return false;
        if (!force && !LARAVEL_SATELLITES) return false;
        return force || slugAllowedForSatellite(profileSlug);
    }
    return false;
}

function isLaravelKsPath(reqMethod, urlPath) {
    if (!urlPath || wantsNodeEngine(urlPath)) return false;
    const pathOnly = urlPath.split('?')[0];
    const method = String(reqMethod || 'GET').toUpperCase();
    const force = wantsLaravelEngine(urlPath);

    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/public\/gallery$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/public\/gallery-content$/i.test(pathOnly)) {
        if (!force && !LARAVEL_KS) return false;
        const q = urlPath.includes('?') ? urlPath.slice(urlPath.indexOf('?')) : '';
        const m = /[?&]slug=([^&]+)/i.exec(q);
        const slug = m ? decodeURIComponent(m[1]) : '';
        if (!slug) return force || LARAVEL_KS;
        return force || slugAllowedForKs(slug);
    }
    const share = pathOnly.match(/^\/(?:l\/)?api\/king-selection\/public\/gallery-share-meta\/([^/]+)\/?$/i);
    if (share && method === 'GET') {
        if (!force && !LARAVEL_KS) return false;
        return force || slugAllowedForKs(share[1]);
    }
    const page = pathOnly.match(/^\/(?:l\/)?kingSelection\/([^/]+)\/?$/i);
    if (page && method === 'GET') {
        if (!force && !LARAVEL_KS) return false;
        return force || slugAllowedForKs(page[1]);
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/public\/(cover|og-image|entry-splash)$/i.test(pathOnly)) {
        // cover/og/splash usam ?slug= — canário via query
        if (!force && !LARAVEL_KS) return false;
        const q = urlPath.includes('?') ? urlPath.slice(urlPath.indexOf('?')) : '';
        const m = /[?&]slug=([^&]+)/i.exec(q);
        const slug = m ? decodeURIComponent(m[1]) : '';
        if (!slug) return force || LARAVEL_KS;
        return force || slugAllowedForKs(slug);
    }
    const preview = pathOnly.match(/^\/(?:l\/)?api\/king-selection\/public\/photos\/(\d+)\/preview$/i);
    if (preview && method === 'GET') {
        if (!force && !LARAVEL_KS) return false;
        const q = urlPath.includes('?') ? urlPath.slice(urlPath.indexOf('?')) : '';
        const m = /[?&]slug=([^&]+)/i.exec(q);
        const slug = m ? decodeURIComponent(m[1]) : '';
        if (!slug) return force || LARAVEL_KS;
        return force || slugAllowedForKs(slug);
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/client\/login$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/client\/(login-by-details|register|public-enter|signup-enter)$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/client\/(select|select-bulk|finalize)$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/client\/(export|edit-requests)$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/client\/edit-request$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/client\/edit-request\/\d+\/cancel$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/client\/gallery$/i.test(pathOnly)) {
        if (!force && !LARAVEL_KS) return false;
        const q = urlPath.includes('?') ? urlPath.slice(urlPath.indexOf('?')) : '';
        const m = /[?&]slug=([^&]+)/i.exec(q);
        const slug = m ? decodeURIComponent(m[1]) : '';
        if (!slug) return force || LARAVEL_KS;
        return force || slugAllowedForKs(slug);
    }
    const clientPreview = pathOnly.match(/^\/(?:l\/)?api\/king-selection\/client\/photos\/(\d+)\/preview$/i);
    if (clientPreview && method === 'GET') {
        if (!force && !LARAVEL_KS) return false;
        const q = urlPath.includes('?') ? urlPath.slice(urlPath.indexOf('?')) : '';
        const m = /[?&]slug=([^&]+)/i.exec(q);
        const slug = m ? decodeURIComponent(m[1]) : '';
        if (!slug) return force || LARAVEL_KS;
        return force || slugAllowedForKs(slug);
    }
    // Fatia 4b — painel fotógrafo (JWT user)
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/status$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'DELETE' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/photos$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/photos\/batch$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/photos\/worker-commit$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/uploads\/proxy$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/uploads\/presign-batch$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/watermark-file$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'PUT' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/folders$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/folders$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'DELETE' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/folders\/\d+$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/folders\/generate$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/folders\/reorder$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/photos\/assign-folder$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/watermark$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/thank-you-image$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/open-selection-round$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/ai\/share-text$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/ai\/sales-whatsapp-template$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/ai\/support-default-message$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/edit-requests$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'PATCH' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/edit-requests\/\d+$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'DELETE' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/edit-requests\/\d+$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/clients\/\d+\/delete-selection-batch$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/clients\/\d+\/reactivate-selection-batch$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/clients\/\d+\/clear-review$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/photos\/delete-batch$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/clients$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/clients$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'PUT' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/clients\/\d+$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'DELETE' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/clients\/\d+$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/clients\/\d+\/reset-password$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/clients\/\d+\/access-link$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/sales-config$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'PUT' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/sales-config$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/sales\/clients$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/sales\/clients\/\d+\/round\/\d+$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/sales\/clients\/\d+\/round\/\d+\/payment-terms$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/sales\/clients\/\d+\/round\/\d+\/payment-review$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/sales\/clients\/\d+\/round\/\d+\/approve-photo$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/sales\/clients\/\d+\/round\/\d+\/approve-all$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/sales\/payment-proof\/\d+$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/uploads\/worker-token$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/reset-password$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/enrolled-faces$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/clients\/\d+\/enroll-face$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/face-process-status$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/face-results$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/photos\/\d+\/face-detail$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/folders\/auto-separate-jobs?$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/folders\/auto-separate-by-face$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/folders\/auto-separate-job\/start$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/folders\/auto-separate-job\/\d+\/cancel$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/photos\/\d+\/process-faces$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/process-all-faces$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/clients\/\d+\/password$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/export$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/link-cover-upload$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/link-cover-preview$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/photos\/\d+\/edited-upload$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'PATCH' && /^\/(?:l\/)?api\/king-selection\/photos\/\d+$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'DELETE' && /^\/(?:l\/)?api\/king-selection\/photos\/\d+$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/photos\/\d+\/(replace-r2|replace|replace-proxy)$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/photos\/\d+\/(preview|download)$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/watermark-suggest-scales$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'PATCH' && /^\/(?:l\/)?api\/king-selection\/galleries\/\d+\/folders\/\d+$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/client\/payment-proof$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/client\/promo-verify$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/client\/enroll-face-image$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/client\/face-results$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/client\/(face-enroll-cache|reset-face-session)$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/client\/search-face-by-photo$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/public\/enroll-face-anonymous$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/public\/aws-ping$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/aws-check$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/facial\/(status|clients|jobs|matches|progress|diagnose)$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/facial\/process$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'DELETE' && /^\/(?:l\/)?api\/king-selection\/facial\/clients\/\d+\/faces$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/config-finalizacao\/\d+$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/king-selection\/public\/galleries\/[^/]+\/my-photos$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/client\/download-zip-plan$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/king-selection\/client\/download-zip$/i.test(pathOnly)) {
        return force || LARAVEL_KS;
    }
    return false;
}

function isLaravelAccountPath(reqMethod, urlPath) {
    if (!urlPath || wantsNodeEngine(urlPath)) return false;
    const pathOnly = urlPath.split('?')[0];
    const method = String(reqMethod || 'GET').toUpperCase();
    if (method === 'GET' && /^\/(?:l\/)?api\/account\/(status|details)$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/account\/debug-plan\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'PUT' && /^\/(?:l\/)?api\/account\/(details|password)$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/account\/upgrade$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/subscription\/(info|plans|plans-public)$/i.test(pathOnly)) return true;
    if (method === 'PUT' && /^\/(?:l\/)?api\/subscription\/plans\/\d+$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/link-limits(?:\/(user|stats|check\/[^/]+))?$/i.test(pathOnly)) return true;
    if (method === 'PUT' && /^\/(?:l\/)?api\/link-limits$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/link-limits\/(bulk-update|reset-plan|copy-plan)$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/auth\/register$/i.test(pathOnly)) return true;
    return false;
}

function isLaravelDashboardPath(reqMethod, urlPath) {
    if (!urlPath || wantsNodeEngine(urlPath)) return false;
    const pathOnly = urlPath.split('?')[0];
    const method = String(reqMethod || 'GET').toUpperCase();
    const force = wantsLaravelEngine(urlPath);
    if (!force && !LARAVEL_DASHBOARD) return false;

    if (method === 'POST' && /^\/(?:l\/)?api\/auth\/(login|refresh|logout)$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/password\/(forgot|reset)$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'GET' && /^\/(?:l\/)?(health|api\/health)$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/modules\/(available|plan-availability)$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/analytics\/(kpis|performance|top-items|details)$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'PUT' && /^\/(?:l\/)?api\/business\/branding$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/business\/team$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/finance\/(profiles(?:\/(primary|limit|\d+))?|dashboard|income-breakdown|cards|transactions(?:\/\d+)?|king-data|categories|accounts|goals|upgrade-plans|whatsapp-config|zerar-senha-status|admin\/clientes-senhas|budgets|reports\/(summary|categories))$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'PUT' && /^\/(?:l\/)?api\/finance\/(king-data|whatsapp-config|zerar-senha)$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/finance\/(transactions|cards|categories|accounts|goals|profiles|budgets|transfer|upload|zerar-senha\/verify|zerar-mes|serasa\/import-preview|serasa\/import-image-preview)$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'PUT' && /^\/(?:l\/)?api\/finance\/(transactions|profiles)\/\d+$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'PATCH' && /^\/(?:l\/)?api\/finance\/cards\/\d+$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'DELETE' && /^\/(?:l\/)?api\/finance\/(transactions|cards|goals|profiles)\/\d+$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'GET' && /^\/(?:l\/)?(login|login\.html|dashboard|dashboard\.html)\/?$/i.test(pathOnly)) {
        return true;
    }
    // Páginas HTML/JS legadas (edge Laravel)
    if (method === 'GET' && /^\/(?:l\/)?(kingSelection(?:Edit|Project|Cliente|Gallery|Review|Success)?|registro|recuperar-senha|resetar-senha|conta|formPageEdit|salesPageEdit|guestListEdit(?:Manage)?|kingDocs(?:Share)?|kingForms|bible|bibliaking|documentos-(?:preview|ver)|orcamentos|recibos-orcamentos|checkoutConfig|termos|privacidade|admin-planos|admin-devocionais-365|admin-prosperidade-31|responsesList|conviteEdit|zerar-mes|arquetipo-resultados|config\.js)(?:\.html)?\/?$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'GET' && /\.(js|css|map|png|jpe?g|webp|svg|woff2?|ttf|ico|json)$/i.test(pathOnly)) {
        return true;
    }
    return false;
}

function isLaravelGuestListPath(reqMethod, urlPath) {
    if (!urlPath) return false;
    const pathOnly = urlPath.split('?')[0];
    const method = String(reqMethod || 'GET').toUpperCase();
    const force = wantsLaravelEngine(urlPath);

    // Personalização (auth JWT) — satélites ou profile API
    if (/^\/(?:l\/)?api\/guest-lists\/\d+\/customize-(portaria|confirmacao|inscricao)$/i.test(pathOnly)
        && (method === 'GET' || method === 'PUT')) {
        return force || LARAVEL_SATELLITES || LARAVEL_PROFILE_API;
    }
    // Admin guest-lists (read + write + export/pdf JSON)
    if (/^\/(?:l\/)?api\/guest-lists\/\d+\/export\/pdf$/i.test(pathOnly) && method === 'GET') {
        return force || LARAVEL_SATELLITES || LARAVEL_PROFILE_API;
    }
    if (/^\/(?:l\/)?api\/guest-lists(?:\/\d+(?:\/(guests(?:\/\d+(?:\/generate-qr)?)?|stats|generate-all-qr-codes|reset-tokens))?)?$/i.test(pathOnly)) {
        if (method === 'GET' || method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
            return force || LARAVEL_SATELLITES || LARAVEL_PROFILE_API;
        }
    }

    if (!force && !LARAVEL_SATELLITES) return false;
    if (method === 'GET' && /^\/(?:l\/)?guest-list\/register\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/guest-lists\/public\/register\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?guest-list\/confirm\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/guest-lists\/public\/confirm\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?portaria\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?portaria\/[^/]+\/checkin\/\d+$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?guest-list\/view-full\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/guest-list\/view-full\/[^/]+\/checkin\/\d+$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?guest-list\/verify\/qr\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?guest-list\/confirm\/qr\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?guest-list\/confirm\/cpf$/i.test(pathOnly)) return true;
    return false;
}

function isLaravelAdminExtrasPath(reqMethod, urlPath) {
    if (!urlPath || wantsNodeEngine(urlPath)) return false;
    const pathOnly = urlPath.split('?')[0];
    const method = String(reqMethod || 'GET').toUpperCase();
    const force = wantsLaravelEngine(urlPath);
    if (!force && !(LARAVEL_DASHBOARD || LARAVEL_SATELLITES || LARAVEL_ADMIN_BIBLE)) return false;

    if ((method === 'GET' || method === 'POST') && /^\/(?:l\/)?api\/admin\/link-preview-config$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'GET' && /^\/(?:l\/)?og-image\.jpg$/i.test(pathOnly)) {
        return true;
    }
    // Painel admin (routes/admin.js): overview, users e codes já são todos Laravel.
    if ((method === 'GET' || method === 'PUT') && /^\/(?:l\/)?api\/admin\/default-branding$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/(stats|advanced-stats|plans|users|codes)$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/analytics\/users$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/analytics\/user\/[^/]+\/details$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'PATCH' && /^\/(?:l\/)?api\/admin\/plans\/\d+$/i.test(pathOnly)) {
        return true;
    }
    if (/^\/(?:l\/)?api\/admin\/(users|codes)\/(auto-delete-config|execute-auto-delete)$/i.test(pathOnly)) {
        return method === 'GET' || method === 'POST';
    }
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/users\/[^/]+\/dashboard$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'PUT' && /^\/(?:l\/)?api\/admin\/users\/[^/]+(\/(manage|update-role))?$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'DELETE' && /^\/(?:l\/)?api\/admin\/users\/[^/]+$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/codes\/generate-(manual|batch)$/i.test(pathOnly)) {
        return true;
    }
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/generate-code$/i.test(pathOnly)) {
        return true;
    }
    if ((method === 'PUT' || method === 'DELETE') && /^\/(?:l\/)?api\/admin\/codes\/[^/]+$/i.test(pathOnly)) {
        return true;
    }
    return false;
}

function isLaravelAdminBiblePath(reqMethod, urlPath) {
    if (!urlPath) return false;
    const pathOnly = urlPath.split('?')[0];
    const method = String(reqMethod || 'GET').toUpperCase();
    const force = wantsLaravelEngine(urlPath);
    if (!force && !LARAVEL_ADMIN_BIBLE) return false;

    // (nenhum block especial — async Dev365 e prosperidade jobs no Laravel)

    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/export$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/import$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/storytelling-map$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/generate-range-ai$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/generation-job\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/generation-job\/[^/]+\/cancel$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/\d+$/i.test(pathOnly)) return true;
    if (method === 'PUT' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/\d+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/\d+\/save-activation$/i.test(pathOnly)) return true;
    if (method === 'PATCH' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/\d+\/publish$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/\d+\/generate-ai$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/prosperidade\/\d+\/parse-paste$/i.test(pathOnly)) return true;

    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/days$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/admin-full$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/day\/\d+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/day\/\d+\/generate-ai$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/generate-range-ai$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/generate-month-ai\/\d+\/\d+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/generate-calendar-months-async$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/generation-job\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/generation-job\/[^/]+\/cancel$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/month-themes\/\d+$/i.test(pathOnly)) return true;
    if (method === 'PUT' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/month-themes\/\d+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/month-themes\/\d+\/generate\/\d+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/month-themes\/\d+\/generate-all$/i.test(pathOnly)) return true;
    if (method === 'PUT' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/\d+$/i.test(pathOnly)) return true;
    if (method === 'DELETE' && /^\/(?:l\/)?api\/admin\/bible\/devotionals-365\/\d+$/i.test(pathOnly)) return true;

    // Estudos por livro (admin) — residual de routes/adminBibleStudy.js
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/study\/books$/i.test(pathOnly)) return true;
    if (method === 'DELETE' && /^\/(?:l\/)?api\/admin\/bible\/study\/book\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/study\/book\/[^/]+\/upload$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/study\/book\/[^/]+\/generate-ai$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/study\/generate-ai-async$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/admin\/bible\/study\/generation-job\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/admin\/bible\/study\/generation-job\/[^/]+\/cancel$/i.test(pathOnly)) return true;
    return false;
}

function isLaravelDocumentosPath(reqMethod, urlPath) {
    if (!urlPath || wantsNodeEngine(urlPath)) return false;
    const pathOnly = urlPath.split('?')[0];
    const method = String(reqMethod || 'GET').toUpperCase();
    if (method === 'GET' && /^\/(?:l\/)?api\/documentos\/ver\/[^/]+(?:\/pdf)?$/i.test(pathOnly)) return true;
    if (method === 'PUT' && /^\/(?:l\/)?api\/documentos\/ver\/[^/]+$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/documentos\/(ocr-info|warm-ocr)$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/documentos(?:\/settings|\/\d+(?:\/pdf)?)?$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/documentos(?:\/upload-logo|\/\d+\/(duplicate|anexos|nota-fiscal|processar-comprovante))?$/i.test(pathOnly)) return true;
    if (method === 'PUT' && /^\/(?:l\/)?api\/documentos(?:\/settings|\/\d+)$/i.test(pathOnly)) return true;
    if (method === 'DELETE' && /^\/(?:l\/)?api\/documentos\/\d+(?:\/nota-fiscal)?$/i.test(pathOnly)) return true;
    return false;
}

function isLaravelKingDocsPath(reqMethod, urlPath) {
    if (!urlPath || wantsNodeEngine(urlPath)) return false;
    const pathOnly = urlPath.split('?')[0];
    const method = String(reqMethod || 'GET').toUpperCase();
    if (method === 'GET' && /^\/(?:l\/)?api\/king-docs\/public\/[^/]+\/(meta|data|file\/\d+)$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/king-docs\/public\/[^/]+\/unlock$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/king-docs\/(vault(?:\/export-pdf)?|files(?:\/\d+\/download)?|shares)$/i.test(pathOnly)) return true;
    if (method === 'PUT' && /^\/(?:l\/)?api\/king-docs\/vault$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/king-docs\/(vault\/import-profile|files|shares)$/i.test(pathOnly)) return true;
    if (method === 'DELETE' && /^\/(?:l\/)?api\/king-docs\/(files\/\d+|shares\/\d+(?:\/permanent)?)$/i.test(pathOnly)) return true;
    return false;
}

/**
 * APIs residuais migradas nas fatias B7 / B9–B15 (image, location, suggestions,
 * checkin, inquiry, generator, payment, push, orçamentos, sales-pages, business codes).
 */
function isLaravelResidualApiPath(reqMethod, urlPath) {
    if (!urlPath || wantsNodeEngine(urlPath)) return false;
    const pathOnly = urlPath.split('?')[0];
    const method = String(reqMethod || 'GET').toUpperCase();
    const force = wantsLaravelEngine(urlPath);
    if (!force && !(LARAVEL_DASHBOARD || LARAVEL_SATELLITES)) return false;

    if (method === 'GET' && /^\/(?:l\/)?api\/image\/profile-image$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/inquiry\/submit$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/generator\/new-key$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/push\/vapid-public-key$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/push\/subscribe$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/payment\/(create-preference|webhook-notification)$/i.test(pathOnly)) return true;
    if ((method === 'GET' || method === 'PUT') && /^\/(?:l\/)?api\/location\/config\/\d+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/suggestions\/generate$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/checkin\/\d+$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/orcamentos$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/orcamentos\/\d+$/i.test(pathOnly)) return true;
    if (method === 'PATCH' && /^\/(?:l\/)?api\/orcamentos\/\d+\/status$/i.test(pathOnly)) return true;
    if (method === 'DELETE' && /^\/(?:l\/)?api\/orcamentos\/\d+$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/business\/codes$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/business\/generate-code$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/business\/codes\/generate-manual$/i.test(pathOnly)) return true;

    // Sales pages: CRUD da página + produtos + analytics + /track (público).
    if (method === 'POST' && /^\/(?:l\/)?api\/v1\/sales-pages$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/v1\/sales-pages\/item\/\d+$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/v1\/sales-pages\/\d+$/i.test(pathOnly)) return true;
    if (method === 'PUT' && /^\/(?:l\/)?api\/v1\/sales-pages\/\d+$/i.test(pathOnly)) return true;
    if (method === 'PATCH' && /^\/(?:l\/)?api\/v1\/sales-pages\/\d+\/(publish|pause|archive)$/i.test(pathOnly)) return true;
    if (method === 'DELETE' && /^\/(?:l\/)?api\/v1\/sales-pages\/\d+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/v1\/sales-pages\/track$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/v1\/sales-pages\/analytics\/products\/\d+$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/v1\/sales-pages\/analytics\/\d+(?:\/(funnel|ranking))?$/i.test(pathOnly)) return true;
    if (method === 'GET' && /^\/(?:l\/)?api\/v1\/sales-pages\/\d+\/products$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/v1\/sales-pages\/\d+\/products(?:\/reorder)?$/i.test(pathOnly)) return true;
    if ((method === 'GET' || method === 'PUT' || method === 'DELETE') && /^\/(?:l\/)?api\/v1\/sales-pages\/products\/\d+$/i.test(pathOnly)) return true;
    if (method === 'PATCH' && /^\/(?:l\/)?api\/v1\/sales-pages\/products\/\d+\/status$/i.test(pathOnly)) return true;

    // Checkout KingForms / PagBank (B20). O webhook é público (chamado pelo PagBank).
    if (method === 'GET' && /^\/(?:l\/)?api\/checkout\/(page|preview-link)$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/checkout\/(create|test-connection)$/i.test(pathOnly)) return true;
    if ((method === 'GET' || method === 'PUT') && /^\/(?:l\/)?api\/checkout\/config\/\d+$/i.test(pathOnly)) return true;
    if (method === 'POST' && /^\/(?:l\/)?api\/webhooks\/pagbank$/i.test(pathOnly)) return true;

    return false;
}

function buildForwardHeaders(req, { publicMode } = {}) {
    const fwdProto = (req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http')).toString().split(',')[0].trim();
    const fwdHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
    const headers = { ...req.headers };
    if (fwdHost) {
        headers['x-forwarded-host'] = fwdHost;
        headers.host = fwdHost;
    }
    headers['x-forwarded-proto'] = fwdProto;
    if (publicMode) headers['x-conecta-card-public'] = '1';
    delete headers['content-length'];
    return headers;
}

function proxyToLaravel(req, res, targetPath, { publicMode = false, timeoutMs = 20000 } = {}) {
    if (!LARAVEL_ENABLED) {
        if (!res.headersSent) {
            res.status(503).json({ error: 'Laravel desabilitado (LARAVEL_CARD_ENABLED=false)' });
        }
        return;
    }

    const headers = buildForwardHeaders(req, { publicMode });
    const opts = {
        hostname: LARAVEL_HOST,
        port: LARAVEL_PORT,
        path: targetPath,
        method: req.method,
        headers,
        timeout: timeoutMs
    };

    const proxyReq = http.request(opts, (proxyRes) => {
        const outHeaders = {
            ...proxyRes.headers,
            'x-conecta-proxy': 'laravel',
            'x-conecta-engine': 'laravel'
        };
        if (publicMode) outHeaders['x-conecta-card-public'] = '1';
        res.writeHead(proxyRes.statusCode || 502, outHeaders);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error('[laravel-proxy]', err.message);
        if (!res.headersSent) {
            const pathOnly = String(targetPath || '').split('?')[0];
            if (pathOnly.startsWith('/api/') || pathOnly.startsWith('/l/api/')) {
                res.status(502).json({
                    success: false,
                    message: 'Motor Laravel offline. Tente novamente.'
                });
            } else {
                res.status(502).send(
                    '<h1>Temporariamente indisponível</h1><p>Motor Laravel offline. Tente novamente.</p>'
                );
            }
        }
    });

    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        if (!res.headersSent) {
            const pathOnly = String(targetPath || '').split('?')[0];
            if (pathOnly.startsWith('/api/') || pathOnly.startsWith('/l/api/')) {
                res.status(504).json({ success: false, message: 'Laravel demorou demais.' });
            } else {
                res.status(504).send('<h1>Timeout</h1><p>Laravel demorou demais.</p>');
            }
        }
    });

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        req.pipe(proxyReq);
    } else {
        proxyReq.end();
    }
}

function laravelProxyMiddleware(req, res, next) {
    if (!LARAVEL_ENABLED) return next();
    const url = req.originalUrl || req.url || '';

    if (LARAVEL_CARD_APIS && isLaravelCardApiPath(url)) {
        return proxyToLaravel(req, res, url, { publicMode: false });
    }

    if (LARAVEL_PROFILE_API && isLaravelProfileApiPath(req.method, url)) {
        return proxyToLaravel(req, res, url, { publicMode: false });
    }

    if ((LARAVEL_PROFILE_API || LARAVEL_DASHBOARD) && isLaravelAccountPath(req.method, url)) {
        return proxyToLaravel(req, res, url, { publicMode: false });
    }

    if ((LARAVEL_DASHBOARD || wantsLaravelEngine(url)) && isLaravelDashboardPath(req.method, url)) {
        return proxyToLaravel(req, res, url, { publicMode: false });
    }

    if (LARAVEL_UPLOAD_API && isLaravelUploadPath(req.method, url)) {
        return proxyToLaravel(req, res, url, { publicMode: false, timeoutMs: 120000 });
    }

    if ((LARAVEL_SATELLITES || wantsLaravelEngine(url)) && isLaravelSatellitePath(req.method, url)) {
        return proxyToLaravel(req, res, url, { publicMode: false });
    }

    if (isLaravelGuestListPath(req.method, url)) {
        return proxyToLaravel(req, res, url, { publicMode: false });
    }

    if (isLaravelAdminBiblePath(req.method, url)) {
        return proxyToLaravel(req, res, url, { publicMode: false, timeoutMs: 900000 });
    }

    if (isLaravelAdminExtrasPath(req.method, url)) {
        return proxyToLaravel(req, res, url, { publicMode: false });
    }

    if ((LARAVEL_KS || wantsLaravelEngine(url)) && isLaravelKsPath(req.method, url)) {
        return proxyToLaravel(req, res, url, { publicMode: false });
    }

    if ((LARAVEL_SATELLITES || LARAVEL_DASHBOARD || wantsLaravelEngine(url)) && isLaravelDocumentosPath(req.method, url)) {
        // OCR com IA (OpenAI Vision) pode passar dos 20s padrão
        const isOcr = /\/api\/documentos\/\d+\/processar-comprovante(?:\?|$)/i.test(url);
        return proxyToLaravel(req, res, url, { publicMode: false, timeoutMs: isOcr ? 180000 : 20000 });
    }

    if ((LARAVEL_SATELLITES || LARAVEL_DASHBOARD || wantsLaravelEngine(url)) && isLaravelKingDocsPath(req.method, url)) {
        return proxyToLaravel(req, res, url, { publicMode: false });
    }

    if (isLaravelResidualApiPath(req.method, url)) {
        // OG image baixa e reprocessa a foto remota — pode passar dos 20s padrão
        const isImage = /^\/(?:l\/)?api\/image\/profile-image(?:\?|$)/i.test(url);
        return proxyToLaravel(req, res, url, { publicMode: false, timeoutMs: isImage ? 45000 : 20000 });
    }

    if (!url.startsWith('/l/') && url !== '/l') return next();
    return proxyToLaravel(req, res, url, { publicMode: false });
}

function proxyPublicCardToLaravel(req, res, slug) {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const targetPath = `/l/card/${encodeURIComponent(slug)}${qs}`;
    return proxyToLaravel(req, res, targetPath, { publicMode: true });
}

module.exports = {
    laravelProxyMiddleware,
    proxyPublicCardToLaravel,
    shouldServePublicCardWithLaravel,
    isLaravelCardApiPath,
    isLaravelAdminExtrasPath,
    LARAVEL_ENABLED,
    LARAVEL_CARD_PUBLIC,
    LARAVEL_CARD_APIS,
    LARAVEL_PROFILE_API,
    LARAVEL_UPLOAD_API,
    LARAVEL_SATELLITES,
    LARAVEL_KS,
    LARAVEL_CARD_SLUGS,
    LARAVEL_KS_SLUGS,
    LARAVEL_HOST,
    LARAVEL_PORT
};
