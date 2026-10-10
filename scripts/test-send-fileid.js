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
  const fileIdHoje = "AwACAgEAAyEGAATq2CI9AAMsasnmmWzXw-Ch8-UlQJe68DR8gWAAAvIJAAJ-vFFGodaIVld96PM9BA";

  const testWf = {
    name: 'Test SendVoice Via FileId',
    nodes: [
      {
        id: 'whTest',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [0, 0],
        parameters: { httpMethod: 'GET', path: 'test-send-fileid', responseMode: 'onReceived' }
      },
      {
        id: 'prep',
        name: 'Prep',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [200, 0],
        parameters: {
          language: 'javaScript',
          jsCode: 'return [{ json: { chatId: "@devocionalking", fileId: "' + fileIdHoje + '" } }];'
        }
      },
      {
        id: 'tgSend',
        name: 'Enviar Telegram Audio Replay',
        type: 'n8n-nodes-base.telegram',
        typeVersion: 1.2,
        position: [400, 0],
        parameters: {
          resource: 'message',
          operation: 'sendAudio',
          chatId: '={{ $json.chatId }}',
          binaryData: false,
          file: '={{ $json.fileId }}',
          caption: '🎧 *Reenvio de Áudio:* Ativação Noturna #9 (Provérbios 9)',
          additionalFields: {
            appendAttribution: false,
            parse_mode: 'Markdown'
          }
        },
        credentials: {
          telegramApi: {
            id: 'g9e8goMSML0vE2JS',
            name: 'Telegram account 3'
          }
        }
      }
    ],
    connections: {
      Webhook: { main: [[{ node: 'Prep', type: 'main', index: 0 }]] },
      Prep: { main: [[{ node: 'Enviar Telegram Audio Replay', type: 'main', index: 0 }]] }
    },
    settings: { executionOrder: 'v1' }
  };

  const cr = await req('POST', '/api/v1/workflows', testWf);
  const wId = cr.body?.id;
  await req('POST', `/api/v1/workflows/${wId}/activate`);
  console.log('Workflow criado:', wId);

  https.get('https://n8n.conectaking.com.br/webhook/test-send-fileid', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', async () => {
      console.log('Webhook disparado.');
      setTimeout(async () => {
        const execs = await req('GET', `/api/v1/executions?workflowId=${wId}&limit=1`);
        const ex = execs.body?.data?.[0];
        console.log('Execution status:', ex?.status);
        if (ex) {
          const full = await req('GET', `/api/v1/executions/${ex.id}?includeData=true`);
          console.log('TG result:', JSON.stringify(full.body?.data?.resultData?.runData?.['Enviar Telegram Audio Replay']));
        }
        await req('DELETE', `/api/v1/workflows/${wId}`);
        console.log('Limpo.');
      }, 3000);
    });
  });
})();
