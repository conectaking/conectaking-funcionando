const fs = require('fs');
const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";
const WORKFLOW_ID = "mkK244lveO0N1qPR"; // CK Agent Telegram IA Boot

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "n8n.conectaking.com.br",
      port: 443,
      path: path,
      method: method,
      headers: {
        "X-N8N-API-KEY": API_KEY,
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {})
      }
    };
    const r = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function run() {
  console.log("1. Buscando workflow atual...");
  const res = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  if (res.status !== 200) {
    throw new Error("Erro ao buscar workflow: " + JSON.stringify(res.body));
  }
  const wf = res.body;

  const execNode = wf.nodes.find(n => n.name === 'Executar Admin');
  if (!execNode) throw new Error("Nó Executar Admin não encontrado!");

  let code = execNode.parameters.jsCode;

  // Bloco de definição de data e hora
  const dateDefs = `// Data e hora em fuso Brasília (America/Sao_Paulo) - Definido no topo para SYSTEM_PROMPT
const nowSp = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
const diaSemanaNomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const diaSemanaAtual = diaSemanaNomes[nowSp.getDay()];
const dataHojeISO = nowSp.toISOString().slice(0, 10);
const horaAtualSp = String(nowSp.getHours()).padStart(2, '0') + ':' + String(nowSp.getMinutes()).padStart(2, '0');
const dataHojeBr = String(nowSp.getDate()).padStart(2, '0') + '/' + String(nowSp.getMonth() + 1).padStart(2, '0') + '/' + nowSp.getFullYear();
`;

  // Remover a definição duplicada que estava mais abaixo
  code = code.replace(`// Data e hora em fuso Brasília (America/Sao_Paulo)
const nowSp = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
const diaSemanaNomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const diaSemanaAtual = diaSemanaNomes[nowSp.getDay()];
const dataHojeISO = nowSp.toISOString().slice(0, 10);
const horaAtualSp = String(nowSp.getHours()).padStart(2, '0') + ':' + String(nowSp.getMinutes()).padStart(2, '0');
const dataHojeBr = String(nowSp.getDate()).padStart(2, '0') + '/' + String(nowSp.getMonth() + 1).padStart(2, '0') + '/' + nowSp.getFullYear();`, '');

  // Inserir antes de const KB = `CONHECIMENTO EXECUTIVO
  if (!code.includes('Definido no topo para SYSTEM_PROMPT')) {
    code = code.replace('const KB = `CONHECIMENTO EXECUTIVO', dateDefs + '\nconst KB = `CONHECIMENTO EXECUTIVO');
  }

  // Validar se diaSemanaAtual agora é declarada ANTES de ser usada
  const firstUse = code.indexOf('${diaSemanaAtual}');
  const firstDecl = code.indexOf('const diaSemanaAtual =');
  console.log(`Declaração em: ${firstDecl}, Primeiro uso em: ${firstUse}`);
  if (firstDecl === -1 || firstDecl >= firstUse) {
    throw new Error(`Erro de ordenação: decl=${firstDecl}, use=${firstUse}`);
  }

  // Validar sintaxe criando Function
  try {
    new Function(code);
    console.log("✓ Sintaxe JS de Executar Admin 100% válida!");
  } catch (err) {
    // new Function pode chiar por imports ou helpers do n8n se houver await top-level
    console.log("Info sintaxe:", err.message);
  }

  execNode.parameters.jsCode = code;

  console.log("2. Enviando workflow corrigido para o n8n...");
  const putPayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };

  const putRes = await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, putPayload);
  if (putRes.status !== 200) {
    throw new Error("Erro ao atualizar workflow: " + JSON.stringify(putRes.body));
  }
  console.log("✓ Workflow mkK244lveO0N1qPR atualizado com sucesso!");
}

run().catch(console.error);
