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
  const codeStr = [
    'try {',
    '  const tg = String($env.TELEGRAM_BOT_TOKEN || "");',
    '  const me = await this.helpers.httpRequest({',
    '    method: "GET",',
    '    url: "https://api.telegram.org/bot" + tg + "/getMe",',
    '    json: true',
    '  });',
    '  return [{ json: { ok: true, me, tgToken: tg } }];',
    '} catch(e) {',
    '  return [{ json: { ok: false, err: String(e.message || e) } }];',
    '}'
  ].join('\n');

  const testWf = {
    name: 'Diag TG Bot Info 2',
    nodes: [
      {
        id: 'wh1',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [0, 0],
        parameters: {
          httpMethod: 'GET',
          path: 'diag-get-me-2',
          responseMode: 'lastNode'
        }
      },
      {
        id: 'code1',
        name: 'GetMe Code',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [200, 0],
        parameters: {
          language: 'javaScript',
          jsCode: codeStr
        }
      }
    ],
    connections: {
      Webhook: { main: [[{ node: 'GetMe Code', type: 'main', index: 0 }]] }
    },
    settings: { executionOrder: 'v1' }
  };

  const createRes = await req('POST', '/api/v1/workflows', testWf);
  const wfId = createRes.body?.id;
  if (!wfId) {
    console.log('Error creating:', createRes);
    return;
  }

  await req('POST', `/api/v1/workflows/${wfId}/activate`);

  https.get('https://n8n.conectaking.com.br/webhook/diag-get-me-2', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', async () => {
      console.log('Webhook response:', d);
      await req('DELETE', `/api/v1/workflows/${wfId}`);
      console.log('Cleaned up.');
    });
  });
})();
