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
  const ids = [];
  for (let i = 10321; i >= 10250; i--) ids.push(String(i));
  for (const id of ids) {
    const ex = await getExec(id);
    if (!ex) continue;
    const runData = ex.data?.resultData?.runData;
    const prep = runData?.['Preparar (texto/voz)']?.[0]?.data?.main?.[0]?.[0]?.json;
    const admin = runData?.['Executar Admin']?.[0]?.data?.main?.[0]?.[0]?.json;
    const text = prep?.textoFinal || prep?.text || prep?.transcricao || prep?.rawMessage?.text;
    if (text) {
      console.log(`[EXEC ${id}] USER: "${text}"`);
      console.log(`   BOT: "${admin?.outMessage?.slice(0, 150)}"`);
      const s = JSON.stringify(admin || {});
      if (s.includes('trabalho') || s.includes('terceiro') || s.includes('deve')) {
        console.log(`   -> DATA IN BOT:`, s.slice(0, 400));
      }
    }
  }
}

run().catch(console.error);
