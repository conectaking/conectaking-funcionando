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
  const wf = await req('GET', '/api/v1/workflows/jirdnTeuiXwGUYVj');
  const tgNode = wf.body.nodes.find(n => n.name === 'Enviar Telegram Audio');
  tgNode.parameters = {
    resource: 'message',
    operation: 'sendAudio',
    chatId: '={{ $json.chatId }}',
    binaryData: true,
    binaryPropertyName: 'data',
    caption: '={{ $json.caption }}',
    additionalFields: {
      appendAttribution: false,
      parse_mode: 'Markdown'
    }
  };

  await req('PUT', '/api/v1/workflows/jirdnTeuiXwGUYVj', {
    name: wf.body.name,
    nodes: wf.body.nodes,
    connections: wf.body.connections,
    settings: wf.body.settings
  });

  await req('POST', '/api/v1/workflows/jirdnTeuiXwGUYVj/activate');
  console.log('Workflow atualizado com binaryData: true. Disparando webhook...');

  https.get('https://n8n.conectaking.com.br/webhook/disparar-audio-hoje-manual', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => console.log('Webhook disparado:', d));
  });
})();
