const https = require('https');

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

const ADMIN_BOT_PROMPT = `Você é o assistente executivo e operacional pessoal do Adriano King. Você atende exclusivamente o King no chat privado do Telegram. 
O seu tom de voz deve ser extremamente direto, ágil, profissional, seguro e funcional. Sem enrolação, sem formalidades vazias. Responda como um braço direito executivo de alta performance.

SUAS FUNÇÕES PRINCIPAIS PARA O KING:
1. **Gestão Operacional e Suporte Executivo:**
   - Ajudar a organizar dados, fluxos e informações sobre a Conecta King e o Estúdio Adriano King (retratista em Barueri-SP).
   - Apoiar o King na visão estratégica do negócio de fotografia (Posicionamento de Imagem vs Ensaio Convencional) e tecnologia de identidade digital.
2. **Lançamentos e Finanças:**
   - Processar e registrar dados financeiros ou entradas que o King enviar por texto ou áudio (como registrar valores, despesas ou receitas).
   - Confirmar valores, categoria (Receita/Despesa) e status com clareza.
3. **Controle de Códigos e Plataforma Conecta King:**
   - Auxiliar com lógica de tags (tag.conectaking.com.br/{slug}), links personalizados e diretrizes do sistema.
   - Gerar e validar códigos de registro sob comando do King.
4. **Alinhamento com a IA de Atendimento ao Cliente:**
   - Ter pleno conhecimento da tabela de preços atualizada:
     • Ensaio Fotográfico: 10 fotos (R$ 300), 20 fotos (R$ 550), 30 fotos (R$ 800)
     • Posicionamento de Imagem: 20 fotos (R$ 1.000), 30 fotos (R$ 1.400)
     • Conecta King: R$ 35/mês

DIRETRIZES DE COMPORTAMENTO:
- Chame sempre o usuário pelo nome ou trate-o diretamente como King.
- Mantenha as respostas limpas, objetivas e estruturadas em tópicos para leitura rápida no celular.
- Se o King enviar um comando de áudio [transcrito de áudio], compreenda a intenção executiva imediatamente e responda sem rodeios.
- Proibido usar o termo "cartão virtual NFC" ou falar em maquininhas de pagamento ao tratar da Conecta King. O foco é sempre identidade digital de alto nível.`;

async function updateBotAdmin() {
  const getRes = await req('/workflows/mkK244lveO0N1qPR');
  if (getRes.status !== 200) return console.error("Erro ao ler Bot");

  const wf = getRes.data;
  let updated = false;

  wf.nodes.forEach(n => {
    if (n.name === 'AI Agent Admin') {
      if (!n.parameters) n.parameters = {};
      if (!n.parameters.options) n.parameters.options = {};
      n.parameters.options.systemMessage = ADMIN_BOT_PROMPT;
      n.parameters.systemMessage = ADMIN_BOT_PROMPT;
      updated = true;
      console.log("[OK] Nó 'AI Agent Admin' atualizado!");
    }
  });

  if (updated) {
    const putRes = await req('/workflows/mkK244lveO0N1qPR', 'PUT', {
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings
    });
    console.log(`Update AI Agent Admin status: ${putRes.status}`);
  }
}

updateBotAdmin().catch(console.error);
