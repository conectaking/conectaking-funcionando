const https = require('https');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNmE5ZmM0ZTEtYzM1MS00OWU1LWIyNDEtYTBlODhhMmJjNGNjIiwiaWF0IjoxNzg5NjY3MTQyfQ.LZKgnE2yqzgG1mQodu_HIlqywoxcGZ5rzyV7lOkd_ZQ';
const BASE_HOST = 'n8n.conectaking.com.br';

function req(path) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: BASE_HOST,
      port: 443,
      path: '/api/v1' + path,
      headers: { 'X-N8N-API-KEY': API_KEY }
    }, (res) => {
      let chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      });
    }).on('error', reject);
  });
}

async function verify() {
  const c = await req('/workflows/B7oTCGI5CMcp1K9T');
  const agentCliente1 = c.nodes.find(n => n.name === 'AI Agent Cliente');
  console.log('--- WORKFLOW CLIENTE (B7oTCGI5CMcp1K9T) ---');
  console.log('AI Agent Cliente length:', agentCliente1.parameters.options.systemMessage.length);
  console.log('Trecho inicial:', agentCliente1.parameters.options.systemMessage.slice(0, 150));
  console.log('Contém Neurovendas/Preços?', agentCliente1.parameters.options.systemMessage.includes('NEUROVENDAS') && agentCliente1.parameters.options.systemMessage.includes('R$ 300,00'));

  const b = await req('/workflows/mkK244lveO0N1qPR');
  const agentCliente2 = b.nodes.find(n => n.name === 'AI Agent Cliente');
  const agentAdmin = b.nodes.find(n => n.name === 'AI Agent Admin');
  console.log('\n--- WORKFLOW BOT (mkK244lveO0N1qPR) ---');
  console.log('AI Agent Cliente length:', agentCliente2.parameters.options.systemMessage.length);
  console.log('AI Agent Admin length:', agentAdmin.parameters.options.systemMessage.length);
  console.log('Admin atualizado?', agentAdmin.parameters.options.systemMessage.includes('Braço direito executivo') || agentAdmin.parameters.options.systemMessage.includes('Estúdio Adriano King'));
}

verify().catch(console.error);
