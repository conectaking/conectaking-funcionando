const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";

function getExec(id) {
  return new Promise(resolve => {
    https.get({
      hostname: "n8n.conectaking.com.br", port: 443,
      path: "/api/v1/executions/" + id + "?includeData=true",
      headers: { "X-N8N-API-KEY": API_KEY }
    }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch(e) { resolve(null); }
      });
    });
  });
}

async function main() {
  const ids = ['10544', '10543', '10518', '10515', '10514', '10495', '10494', '10350', '10348', '10347', '10346', '10328', '10327', '10326', '10325', '10324', '10323', '10322', '10321', '10319', '10318', '10317'];
  for (const id of ids) {
    const ex = await getExec(id);
    if (!ex) continue;
    const runData = ex.data?.resultData?.runData;
    const prep = runData?.['Preparar (texto/voz)']?.[0]?.data?.main?.[0]?.[0]?.json;
    const admin = runData?.['Executar Admin']?.[0]?.data?.main?.[0]?.[0]?.json;
    console.log(`\n=== EXEC ${id} [${ex.startedAt}] ===`);
    console.log("TEXTO USUÁRIO:", prep?.textoFinal || prep?.text || prep?.transcricao || prep?.rawMessage?.text);
    console.log("RESPOSTA BOT:", admin?.outMessage?.slice(0, 200));
    if (admin?.kingDbBackup || admin?.kingDb) {
      console.log("KING DB AT EXEC:", JSON.stringify(admin.kingDbBackup || admin.kingDb).slice(0, 300));
    }
    // Also check if admin node logged any finance state
    const adminStr = JSON.stringify(admin || {});
    if (adminStr.includes('500') || adminStr.includes('trabalho') || adminStr.includes('deve')) {
      console.log("FOUND 500/trabalho in admin node!");
      const pos = adminStr.indexOf('500');
      if (pos !== -1) console.log("  snippet:", adminStr.slice(Math.max(0, pos - 80), pos + 120));
    }
  }
}

main().catch(console.error);
