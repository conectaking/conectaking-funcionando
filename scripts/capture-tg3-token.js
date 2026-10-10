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
  // Cria workflow para capturar como telegramApi envia as credenciais
  const testWf = {
    name: 'Capture Telegram 3 Token',
    nodes: [
      {
        id: 'whIn',
        name: 'Webhook In',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [0, 0],
        parameters: {
          httpMethod: 'GET',
          path: 'trigger-capture-token',
          responseMode: 'lastNode'
        }
      },
      {
        id: 'httpCall',
        name: 'HTTP With Credential',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [200, 0],
        parameters: {
          method: 'GET',
          url: 'https://n8n.conectaking.com.br/webhook/sink-capture-token',
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'telegramApi'
        },
        credentials: {
          telegramApi: {
            id: 'g9e8goMSML0vE2JS',
            name: 'Telegram account 3'
          }
        }
      },
      {
        id: 'whSink',
        name: 'Webhook Sink',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [0, 200],
        parameters: {
          httpMethod: 'GET',
          path: 'sink-capture-token',
          responseMode: 'onReceived'
        }
      }
    ],
    connections: {
      'Webhook In': { main: [[{ node: 'HTTP With Credential', type: 'main', index: 0 }]] }
    },
    settings: { executionOrder: 'v1' }
  };

  const createRes = await req('POST', '/api/v1/workflows', testWf);
  const wfId = createRes.body?.id;
  console.log('Created wf:', wfId);
  if (!wfId) {
    console.log('Error creating:', JSON.stringify(createRes));
    return;
  }

  await req('POST', `/api/v1/workflows/${wfId}/activate`);
  console.log('Activated.');

  https.get('https://n8n.conectaking.com.br/webhook/trigger-capture-token', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', async () => {
      console.log('Trigger response:', d);
      // Busca a última execução
      const execs = await req('GET', '/api/v1/executions?limit=2');
      console.log('Executions:', JSON.stringify(execs.body?.data?.[0]));
      const fullExec = await req('GET', `/api/v1/executions/${execs.body?.data?.[0]?.id}?includeData=true`);
      console.log('Full exec sink data:', JSON.stringify(fullExec.body?.data?.resultData?.runData?.['Webhook Sink']));
      await req('DELETE', `/api/v1/workflows/${wfId}`);
      console.log('Cleaned up.');
    });
  });
})();
