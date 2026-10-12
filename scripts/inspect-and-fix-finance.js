const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA";

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

function callWebhook(path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "n8n.conectaking.com.br",
      port: 443,
      path: path,
      method: "POST",
      headers: {
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

async function main() {
  console.log("1. Criando workflow temporário de inspeção e limpeza...");
  const tempWf = {
    name: "Temp Fix Finance Clean",
    nodes: [
      {
        id: "hook01",
        name: "Webhook",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [100, 200],
        webhookId: "temp-fix-finance-clean-hook",
        parameters: {
          path: "temp-fix-finance-clean",
          httpMethod: "POST",
          responseMode: "lastNode",
          responseData: "allEntries"
        }
      },
      {
        id: "code01",
        name: "Code",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [300, 200],
        parameters: {
          jsCode: `
const base = String($env.CK_BASE_URL || 'https://www.conectaking.com.br').replace(/\\/$/, '');
const token = String($env.CK_AGENT_JWT || '').trim();

async function ck(method, path, body) {
  const opts = {
    method,
    url: base + path,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    },
    json: true,
    returnFullResponse: true,
    ignoreHttpStatusErrors: true
  };
  if (body !== undefined) opts.body = body;
  return this.helpers.httpRequest.call(this, opts);
}

const action = $input.first().json.body?.action || 'inspect';

if (action === 'inspect') {
  const txRes = await ck.call(this, 'GET', '/api/finance/transactions?limit=40&orderDir=DESC&orderBy=created_at');
  const raw = txRes.body;
  const inner = (raw && raw.data) ? raw.data : raw;
  const list = Array.isArray(inner) ? inner : (inner && Array.isArray(inner.data) ? inner.data : []);
  
  const dashRes = await ck.call(this, 'GET', '/api/finance/dashboard');
  const kingRes = await ck.call(this, 'GET', '/api/finance/king-data?profile_id=1');

  return [{
    json: {
      transactions: list,
      dashboard: dashRes.body?.data || dashRes.body,
      lembretes: kingRes.body?.data?.lembretes || []
    }
  }];
}

if (action === 'clean_and_recreate') {
  const toDelete = $input.first().json.body?.delete_ids || [];
  const deleted = [];
  for (const id of toDelete) {
    const dr = await ck.call(this, 'DELETE', '/api/finance/transactions/' + id);
    deleted.push({ id, status: dr.statusCode });
  }

  // Criar as 10 parcelas pendentes da Shopee
  const profileId = 1;
  const parcelasCriadas = [];
  const parcelasDatas = [
    '2026-11-04',
    '2026-12-04',
    '2027-01-04',
    '2027-02-04',
    '2027-03-04',
    '2027-04-04',
    '2027-05-04',
    '2027-06-04',
    '2027-07-04',
    '2027-08-04'
  ];

  for (let i = 0; i < 10; i++) {
    const d = parcelasDatas[i];
    const postRes = await ck.call(this, 'POST', '/api/finance/transactions', {
      profile_id: profileId,
      type: 'EXPENSE',
      amount: 38.00,
      status: 'PENDING',
      description: 'Prestação Shopee ' + (i + 1) + '/10',
      transaction_date: d
    });
    parcelasCriadas.push({ num: i + 1, date: d, res: postRes.body });
  }

  // Atualizar lembretes no kingDb: remover lembretes shopee repetidos e criar 10 lembretes futuros corretos
  const kRes = await ck.call(this, 'GET', '/api/finance/king-data?profile_id=1');
  let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
  let lembretes = Array.isArray(kingDb.lembretes) ? kingDb.lembretes : [];
  
  // Limpar lembretes antigos da Shopee
  lembretes = lembretes.filter(l => !l || !String(l.titulo || '').toLowerCase().includes('shopee') && !String(l.titulo || '').toLowerCase().includes('shobi'));

  for (let i = 0; i < 10; i++) {
    const d = parcelasDatas[i];
    lembretes.push({
      id: 'lem_shopee_' + (i + 1) + '_' + Date.now(),
      titulo: 'Pagar Prestação Shopee (' + (i + 1) + '/10) - R$ 38,00',
      tipo: 'lembrete',
      data: d,
      hora_inicio: '08:00',
      hora_fim: '09:00',
      descricao: 'Prestação Shopee ' + (i + 1) + ' de 10 no valor de R$ 38,00.',
      lembrar_comeco_dia: true,
      lembrar_meio_dia: true,
      lembrar_30m: true,
      status: 'ativo',
      notificado: false,
      notificado_comeco_dia: false,
      notificado_meio_dia: false,
      notificado_30m: false,
      notificado_15m: false
    });
  }

  kingDb.lembretes = lembretes;
  await ck.call(this, 'PUT', '/api/finance/king-data?profile_id=1', {
    profile_id: 1,
    data: kingDb
  });

  const dashRes = await ck.call(this, 'GET', '/api/finance/dashboard');

  return [{
    json: {
      deleted,
      parcelasCriadasCount: parcelasCriadas.length,
      lembretesCount: lembretes.length,
      dashboard: dashRes.body?.data || dashRes.body
    }
  }];
}
`
        }
      }
    ],
    connections: {
      Webhook: {
        main: [[{ node: "Code", type: "main", index: 0 }]]
      }
    },
    settings: { executionOrder: "v1" }
  };

  const createRes = await req("POST", "/api/v1/workflows", tempWf);
  if (createRes.status !== 200) {
    console.error("Erro ao criar workflow:", createRes);
    return;
  }
  const wfId = createRes.body.id;
  console.log("   Workflow temporário criado com ID:", wfId);

  console.log("2. Ativando workflow temporário...");
  await req("POST", `/api/v1/workflows/${wfId}/activate`);

  console.log("3. Chamando webhook temporário (Inspect)...");
  const inspectRes = await callWebhook("/webhook/temp-fix-finance-clean", { action: "inspect" });
  
  const insp = inspectRes.body?.[0] || inspectRes.body;
  console.log("=== TRANSAÇÕES ATUAIS ===");
  const txList = insp.transactions || [];
  const deleteIds = [];

  txList.forEach(t => {
    console.log(`[ID ${t.id}] ${t.type} | R$ ${t.amount} (${t.status}) | Desc: "${t.description}" | Date: ${t.transaction_date}`);
    // Identificar as transações da Shopee criadas erradas e a despesa de R$ 32
    const desc = String(t.description || '').toLowerCase();
    if (desc.includes('shopee') || desc.includes('shobi') || desc.includes('parcelas do mês que vem') || (t.amount == 38 && desc === 'despesa') || (t.amount == 32 && t.type === 'EXPENSE')) {
      deleteIds.push(t.id);
    }
  });

  console.log("\nDashboard Atual:", insp.dashboard);
  console.log("\nIDs selecionados para remoção:", deleteIds);

  if (deleteIds.length > 0) {
    console.log("\n4. Executando limpeza e recriação correta das 10 parcelas...");
    const cleanRes = await callWebhook("/webhook/temp-fix-finance-clean", {
      action: "clean_and_recreate",
      delete_ids: deleteIds
    });
    console.log("Resultado da Limpeza e Recriação:", JSON.stringify(cleanRes.body, null, 2));
  }

  console.log("\n5. Deletando workflow temporário...");
  await req("DELETE", `/api/v1/workflows/${wfId}`);
  console.log("   Workflow temporário removido!");
}

main().catch(console.error);
