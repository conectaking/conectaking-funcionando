const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA';

function req(path) {
  return new Promise((res, rej) => {
    https.get({
      hostname: 'n8n.conectaking.com.br',
      path: path,
      headers: { 'X-N8N-API-KEY': API_KEY }
    }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
}

(async () => {
  const execs = await req('/api/v1/executions?workflowId=jirdnTeuiXwGUYVj&limit=1');
  const ex = execs.data?.[0];
  console.log('Execution ID:', ex?.id, 'Status:', ex?.status);
  if (ex) {
    const full = await req('/api/v1/executions/' + ex.id + '?includeData=true');
    const tgRes = full.data?.resultData?.runData?.['Enviar Telegram Audio'];
    console.log('Telegram Result:', JSON.stringify(tgRes, null, 2));
    const ttsRes = full.data?.resultData?.runData?.['Gerar Audio TTS'];
    if (!tgRes) {
      console.log('TTS Result or Error:', JSON.stringify(ttsRes, null, 2));
    }
  }
})();
