/**
 * Compara JSON do cartão Node vs Laravel (paridade mínima).
 * Uso (no VPS ou local): node scripts/test-laravel-card-parity.js adrianokingg
 */
const http = require('http');

const slug = process.argv[2] || 'adrianokingg';
const host = process.env.TEST_HOST || '127.0.0.1';
const port = Number(process.env.TEST_PORT || 5000);

function get(path) {
    return new Promise((resolve, reject) => {
        const req = http.get({ host, port, path, timeout: 15000 }, (res) => {
            let body = '';
            res.on('data', (c) => { body += c; });
            res.on('end', () => {
                resolve({ status: res.statusCode, headers: res.headers, body });
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout ' + path)); });
    });
}

function pickProfile(j) {
    const p = j.profile || {};
    return {
        slug: p.profile_slug,
        name: p.display_name,
        items: Array.isArray(j.items) ? j.items.length : 0
    };
}

(async () => {
    const nodePath = '/api/' + encodeURIComponent(slug);
    const larPath = '/l/api/card/' + encodeURIComponent(slug);

    const [nodeRes, larRes, pageNode, pageLar] = await Promise.all([
        get(nodePath),
        get(larPath),
        get('/' + encodeURIComponent(slug)),
        get('/l/card/' + encodeURIComponent(slug))
    ]);

    console.log('Node API', nodeRes.status, nodePath);
    console.log('Laravel API', larRes.status, larPath, 'engine=', larRes.headers['x-conecta-engine'] || larRes.headers['x-conecta-proxy']);
    console.log('Node page', pageNode.status);
    console.log('Laravel page', pageLar.status, 'proxy=', pageLar.headers['x-conecta-proxy']);

    let ok = true;
    if (nodeRes.status !== 200 || larRes.status !== 200) {
        console.error('FAIL status API');
        ok = false;
    } else {
        const n = pickProfile(JSON.parse(nodeRes.body));
        const l = pickProfile(JSON.parse(larRes.body));
        console.log('Node profile', n);
        console.log('Laravel profile', l);
        if (n.slug !== l.slug || n.name !== l.name) {
            console.error('FAIL profile mismatch');
            ok = false;
        }
        if (pageNode.status !== 200 || pageLar.status !== 200) {
            console.error('FAIL page status');
            ok = false;
        }
        if (!String(pageLar.body || '').includes(n.name || '')) {
            console.warn('WARN: nome não encontrado no HTML Laravel (pode ser encoding)');
        }
    }

    if (!ok) process.exit(1);
    console.log('PASS parity básica OK — cartão Node intacto e Laravel respondendo em /l');
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
