const https = require('https');
const fs = require('fs');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";

function getExec(id) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: "n8n.conectaking.com.br", port: 443,
      path: "/api/v1/executions/" + id + "?includeData=true",
      method: "GET",
      headers: { "X-N8N-API-KEY": API_KEY }
    }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch(e) { resolve(null); }
      });
    });
    r.on("error", reject);
    r.end();
  });
}

async function main() {
  const ids = ['10547', '10548', '10549', '10550', '10551', '10554', '10556', '10564'];
  for (const id of ids) {
    console.log('Checking execution', id);
    const ex = await getExec(id);
    if (!ex) continue;
    const str = JSON.stringify(ex);
    if (str.includes('trabalhos') || str.includes('terceiros') || str.includes('500')) {
      const idx = str.indexOf('trabalhos');
      if (idx !== -1) {
        console.log('Found trabalhos at', id, str.slice(idx, idx + 400));
      }
      const idx2 = str.indexOf('terceiros');
      if (idx2 !== -1) {
        console.log('Found terceiros at', id, str.slice(idx2, idx2 + 400));
      }
      if (str.includes('800')) {
        console.log('Found 800 in execution', id);
      }
    }
  }
}

main().catch(console.error);
