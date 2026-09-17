const https = require('https');
const fs = require('fs');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNmE5ZmM0ZTEtYzM1MS00OWU1LWIyNDEtYTBlODhhMmJjNGNjIiwiaWF0IjoxNzg5NjY3MTQyfQ.LZKgnE2yqzgG1mQodu_HIlqywoxcGZ5rzyV7lOkd_ZQ';
const BASE_HOST = 'n8n.conectaking.com.br';

function req(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: BASE_HOST,
      port: 443,
      path: '/api/v1' + path,
      method: method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };

    const request = https.request(options, (res) => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const resBody = Buffer.concat(chunks).toString('utf-8');
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resBody) });
        } catch (e) {
          resolve({ status: res.statusCode, text: resBody });
        }
      });
    });

    request.on('error', reject);
    if (data) request.write(data);
    request.end();
  });
}

async function inspectWorkflows() {
  const clienteRes = await req('/workflows/B7oTCGI5CMcp1K9T');
  fs.writeFileSync('scratch/wf_cliente_live.json', JSON.stringify(clienteRes.data, null, 2), 'utf-8');
  console.log("Salvo scratch/wf_cliente_live.json");
  console.log("Cliente Nodes:");
  clienteRes.data.nodes.forEach(n => console.log(` - [${n.id}] ${n.name} (${n.type})`));

  const botRes = await req('/workflows/mkK244lveO0N1qPR');
  fs.writeFileSync('scratch/wf_bot_live.json', JSON.stringify(botRes.data, null, 2), 'utf-8');
  console.log("\nSalvo scratch/wf_bot_live.json");
  console.log("Bot Nodes:");
  botRes.data.nodes.forEach(n => console.log(` - [${n.id}] ${n.name} (${n.type})`));
}

inspectWorkflows().catch(console.error);
