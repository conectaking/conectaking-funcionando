const https = require('https');
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJzZWVkLWFkbWluLUZOcEdTRm1WMmJIbSIsImVtYWlsIjoiY29uZWN0YWtpbmdAZ21haWwuY29tIiwiaXNBZG1pbiI6dHJ1ZSwiYWNjb3VudFR5cGUiOiJhZG1fcHJpbmNpcGFsIiwiaWF0IjoxNzg5MzQyMjc5LCJleHAiOjE3OTcxMTgyNzksImp0aSI6ImVhYzJlY2I0Mjk4ZjQ2OGM4ODBiZDhmNGVjMGU2ZGVlIn0.5qR5aboHHSe6DkS_WSQFVH1D2ldxIvY0_mOTcZwHF0k';

function req(method, path, body) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: 'www.conectaking.com.br',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', e => resolve({ status: 500, error: e.message }));
    if (payload) r.write(payload);
    r.end();
  });
}

async function addZenilda() {
  const getRes = await req('GET', '/api/finance/king-data?profile_id=1');
  const kd = (getRes.body && (getRes.body.data || getRes.body)) || {};
  if (!Array.isArray(kd.terceiros)) kd.terceiros = [];

  let terc = kd.terceiros.find(t => String(t.nome || '').toLowerCase().includes('zenilda'));
  if (!terc) {
    terc = { id: 'terc_' + Date.now(), nome: 'Zenilda', contas: [] };
    kd.terceiros.push(terc);
  }
  if (!Array.isArray(terc.contas)) terc.contas = [];

  const valParcela = 625.51;
  const numParcelas = 22;
  const startYear = 2026;
  const startMonth = 10; // Outubro de 2026
  const startDay = 27;

  terc.contas = [];

  for (let i = 0; i < numParcelas; i++) {
    let m = startMonth + i;
    let y = startYear;
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    const dueStr = `${y}-${String(m).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
    const pagamentos = (i === 0) ? [{ valor: valParcela, data: '2026-10-27', hora: '12:00', forma: 'PIX/Transferência' }] : [];
    
    terc.contas.push({
      id: `c_zenilda_${Date.now()}_${i + 1}`,
      tipo: 'recorrente',
      valor: valParcela,
      descricao: 'Dívida com Zenilda',
      nomeConta: `Parcela Zenilda (${i + 1}/${numParcelas})`,
      pagamentos: pagamentos,
      dataVencimento: dueStr
    });
  }

  const putRes = await req('PUT', '/api/finance/king-data', {
    profile_id: 1,
    data: {
      dividas: kd.dividas || [],
      terceiros: kd.terceiros,
      trabalhos: kd.trabalhos || [],
      bens: kd.bens || []
    }
  });

  console.log('PUT Zenilda status:', putRes.status);
  console.log('Zenilda contas criadas:', terc.contas.length);
  console.log('Parcela 1 (PAGA hoje):', terc.contas[0]);
  console.log('Parcela 2 (Próxima):', terc.contas[1]);
}

addZenilda();
