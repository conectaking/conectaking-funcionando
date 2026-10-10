const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'n8n.conectaking.com.br',
      port: 443,
      path: path,
      method: method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };
    const r = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

(async () => {
  // 1. Remover workflow temporário
  await req('DELETE', '/api/v1/workflows/jirdnTeuiXwGUYVj');
  console.log('Workflow temporário deletado com sucesso.');

  // 2. Gravar no king-data via workflow temporário ou direto no n8n
  const fileIdHoje = "AwACAgEAAyEGAATq2CI9AAMsasnmmWzXw-Ch8-UlQJe68DR8gWAAAvIJAAJ-vFFGodaIVld96PM9BA";
  
  const saveCode = [
    'const base = String($env.CK_BASE_URL || "https://www.conectaking.com.br").replace(/\\/$/, "");',
    'const token = String($env.CK_AGENT_JWT || "").trim();',
    '',
    'async function ck(method, path, body) {',
    '  const opts = {',
    '    method,',
    '    url: base + path,',
    '    headers: {',
    '      "Accept": "application/json",',
    '      "Content-Type": "application/json",',
    '      ...(token ? { "Authorization": "Bearer " + token } : {})',
    '    },',
    '    json: true,',
    '    returnFullResponse: true,',
    '    ignoreHttpStatusErrors: true',
    '  };',
    '  if (body !== undefined) opts.body = body;',
    '  return this.helpers.httpRequest.call(this, opts);',
    '}',
    '',
    '// Buscar dados atuais',
    'const getRes = await ck.call(this, "GET", "/api/finance/king-data?profile_id=1");',
    'const currentData = (getRes.body && (getRes.body.data || getRes.body)) || {};',
    '',
    'if (!currentData.audios_diarios) currentData.audios_diarios = {};',
    'currentData.audios_diarios.prosperidade_hoje = {',
    '  data: "2026-10-09",',
    '  titulo: "Ativação #9 · Provérbios 9",',
    '  file_id: "' + fileIdHoje + '",',
    '  message_id: 44,',
    '  timestamp: Date.now()',
    '};',
    '',
    'const putRes = await ck.call(this, "PUT", "/api/finance/king-data", {',
    '  profile_id: 1,',
    '  data: currentData',
    '});',
    '',
    'return [{ json: { success: putRes.statusCode < 300, res: putRes.body } }];'
  ].join('\n');

  const saveWf = {
    name: 'Save Audio FileId to KingData',
    nodes: [
      {
        id: 'w1',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [0, 0],
        parameters: { httpMethod: 'GET', path: 'save-audio-fileid', responseMode: 'lastNode' }
      },
      {
        id: 'c1',
        name: 'Save Code',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [200, 0],
        parameters: { language: 'javaScript', jsCode: saveCode }
      }
    ],
    connections: { Webhook: { main: [[{ node: 'Save Code', type: 'main', index: 0 }]] } },
    settings: { executionOrder: 'v1' }
  };

  const cr = await req('POST', '/api/v1/workflows', saveWf);
  const wId = cr.body?.id;
  await req('POST', `/api/v1/workflows/${wId}/activate`);

  https.get('https://n8n.conectaking.com.br/webhook/save-audio-fileid', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', async () => {
      console.log('Save response:', d);
      await req('DELETE', `/api/v1/workflows/${wId}`);
      console.log('Cleaned up save workflow.');
    });
  });
})();
