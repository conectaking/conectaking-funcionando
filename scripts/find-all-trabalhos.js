const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";

function getExec(id) {
  return new Promise(resolve => {
    https.get({ hostname: 'n8n.conectaking.com.br', path: '/api/v1/executions/' + id + '?includeData=true', headers: { 'X-N8N-API-KEY': API_KEY } }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(null); } });
    });
  });
}

async function run() {
  for (let i = 10320; i >= 9800; i--) {
    const ex = await getExec(i);
    if (!ex) continue;
    const admin = ex.data?.resultData?.runData?.['Executar Admin']?.[0]?.data?.main?.[0]?.[0]?.json;
    const msg = admin?.outMessage || '';
    if (msg.includes('Trabalho Registrado') || msg.includes('Novo Trabalho') || msg.includes('800') || msg.includes('Falta Receber')) {
      const prep = ex.data?.resultData?.runData?.['Preparar (texto/voz)']?.[0]?.data?.main?.[0]?.[0]?.json;
      const text = prep?.textoFinal || prep?.text || prep?.transcricao || prep?.rawMessage?.text;
      console.log(`[EXEC ${i}] USER: "${text}"`);
      console.log(`   MSG:`, msg.replace(/\n/g, ' ').slice(0, 200));
    }
  }
}

run().catch(console.error);
