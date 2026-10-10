const https = require('https');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDAyMDhmNy1lMDkyLTQ3NWEtYTcxMC0zZGYwYTNjZDVjMmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYThhNDkwNjAtMjMwNy00NWJmLWE3MzEtYTNmZGQ5YjZhNmJhIiwiaWF0IjoxNzkwNzY4MDk5fQ.zolsEirfo_aaJ7q0Opcy4D8tMVD1kVAS-w2f0xYzKnA';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'n8n.conectaking.com.br',
      port: 443,
      path: path,
      method: method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };
    const r = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

(async () => {
  const WORKFLOW_ID = 'FnkVNknOa2gV0Tfn';
  console.log('1. Obtendo workflow ' + WORKFLOW_ID + '...');
  const getRes = await req('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
  const wf = getRes.body;

  const execNode = wf.nodes.find(n => n.name === 'Executar Bíblia IA');
  let jsCode = execNode.parameters.jsCode;

  // Substituir a lógica de send_daily_audio para retornar isAudioReplay = true e fileId
  // Procurar onde trata send_daily_audio
  const oldAudioLogicRegex = /\/\/ REENVIAR ÁUDIO DIÁRIO[\s\S]*?outMessage\s*=\s*'🎧 A paz do Senhor! No momento tenho disponível[\s\S]*?\}\s*\}/;

  const newAudioLogic = `// REENVIAR ÁUDIO DIÁRIO (ZERO CUSTO / REPLAY NATIVO)
      if (fnName === 'send_daily_audio') {
        const periodo = args.periodo || 'hoje';
        const tipo = args.tipo || (text.toLowerCase().includes('devocional') ? 'devocional' : 'ativacao');
        const isOntem = periodo === 'ontem' || text.toLowerCase().includes('ontem');

        const kRes = await ck.call(this, 'GET', '/api/finance/king-data?profile_id=1');
        const kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
        const audios = kingDb.audios_diarios || {};

        let targetAudio = null;
        let tipoLabel = '';

        if (tipo === 'ativacao') {
          targetAudio = isOntem ? audios.prosperidade_ontem : audios.prosperidade_hoje;
          tipoLabel = 'Ativação Noturna de Prosperidade ' + (isOntem ? '(de ontem)' : '(de hoje)');
        } else {
          targetAudio = isOntem ? audios.devocional_ontem : audios.devocional_hoje;
          tipoLabel = 'Devocional ' + (isOntem ? '(de ontem)' : '(de hoje)');
        }

        if (!targetAudio) {
          targetAudio = isOntem ? (audios.prosperidade_ontem || audios.devocional_ontem) : (audios.prosperidade_hoje || audios.devocional_hoje);
          if (targetAudio) tipoLabel = 'Palavra ' + (isOntem ? '(de ontem)' : '(de hoje)');
        }

        if (targetAudio && targetAudio.file_id) {
          audioFileIdToSend = targetAudio.file_id;
          audioCaptionToSend = '🎧 *' + tipoLabel + '*\\n_' + (targetAudio.titulo || 'Gravação Oficial') + '_';
          outMessage = ''; // Áudio nativo será enviado pelo nó de Telegram Áudio
        } else {
          outMessage = '🎧 A paz do Senhor! No momento tenho disponível para reenvio apenas os áudios já gravados de *hoje* e de *ontem*. Se desejar, posso ministrar uma palavra em texto para você agora!';
        }
      }`;

  if (oldAudioLogicRegex.test(jsCode)) {
    jsCode = jsCode.replace(oldAudioLogicRegex, newAudioLogic);
  } else {
    console.log('Regex não deu match direto, verificando replace alternativo...');
    const startIdx = jsCode.indexOf("// REENVIAR ÁUDIO DIÁRIO");
    if (startIdx !== -1) {
      const endMarker = "// 1. TEMAS MENSAIS DOS DEVOCIONAIS (ADMIN)";
      const endIdx = jsCode.indexOf(endMarker);
      if (endIdx !== -1) {
        jsCode = jsCode.slice(0, startIdx) + newAudioLogic + "\n\n      " + jsCode.slice(endIdx);
      }
    }
  }

  // Garantir que as variáveis audioFileIdToSend e audioCaptionToSend existam no topo do script
  if (!jsCode.includes('let audioFileIdToSend')) {
    jsCode = jsCode.replace(
      "let outMessage = '';",
      "let outMessage = '';\nlet audioFileIdToSend = '';\nlet audioCaptionToSend = '';"
    );
  }

  // Garantir que o retorno passe isAudioReplay e fileId
  const oldReturnRegex = /return chunks\.map\((chunk|c) => \(\{ json: \{ \.\.\.prev, outMessage: (chunk|c) \} \}\)\);/;
  const newReturn = `if (audioFileIdToSend) {
  return [{
    json: {
      ...prev,
      chatId: chatId,
      isAudioReplay: true,
      fileId: audioFileIdToSend,
      caption: audioCaptionToSend,
      outMessage: ''
    }
  }];
}

const chunks = splitTelegramMessage(outMessage, 3900);
return chunks.map(chunk => ({ json: { ...prev, isAudioReplay: false, outMessage: chunk } }));`;

  if (oldReturnRegex.test(jsCode)) {
    jsCode = jsCode.replace(oldReturnRegex, newReturn);
  } else {
    // Substitui a última ocorrência de chunks.map
    const lastChunksIdx = jsCode.lastIndexOf('return chunks.map');
    if (lastChunksIdx !== -1) {
      jsCode = jsCode.slice(0, lastChunksIdx) + newReturn;
    }
  }

  execNode.parameters.jsCode = jsCode;

  // Agora vamos adicionar o nó de IF "É Reenvio Áudio?" e o nó "Enviar Telegram Áudio" se ainda não existirem
  let ifNode = wf.nodes.find(n => n.name === 'É Reenvio Áudio?');
  if (!ifNode) {
    ifNode = {
      id: 'ifAudioReplay01',
      name: 'É Reenvio Áudio?',
      type: 'n8n-nodes-base.if',
      typeVersion: 2.2,
      position: [520, 480],
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
          conditions: [
            {
              id: 'c1',
              leftValue: '={{ $json.isAudioReplay }}',
              rightValue: true,
              operator: { type: 'boolean', operation: 'true', singleValue: true }
            }
          ],
          combinator: 'and'
        },
        options: {}
      }
    };
    wf.nodes.push(ifNode);
  }

  let sendAudioNode = wf.nodes.find(n => n.name === 'Enviar Telegram Áudio');
  if (!sendAudioNode) {
    sendAudioNode = {
      id: 'sendAudioNode01',
      name: 'Enviar Telegram Áudio',
      type: 'n8n-nodes-base.telegram',
      typeVersion: 1.2,
      position: [760, 380],
      parameters: {
        resource: 'message',
        operation: 'sendAudio',
        chatId: '={{ $json.chatId }}',
        binaryData: false,
        file: '={{ $json.fileId }}',
        caption: '={{ $json.caption }}',
        additionalFields: {
          appendAttribution: false,
          parse_mode: 'Markdown'
        }
      },
      credentials: {
        telegramApi: {
          id: 'g9e8goMSML0vE2JS',
          name: 'Telegram account 3'
        }
      }
    };
    wf.nodes.push(sendAudioNode);
  }

  // Ajustar posição do nó Enviar Telegram existente (Texto)
  const sendTextNode = wf.nodes.find(n => n.name === 'Enviar Telegram');
  if (sendTextNode) {
    sendTextNode.position = [760, 560];
  }

  // Ajustar conexões:
  // Executar Bíblia IA -> É Reenvio Áudio?
  // É Reenvio Áudio? [0 / true] -> Enviar Telegram Áudio
  // É Reenvio Áudio? [1 / false] -> Enviar Telegram
  wf.connections['Executar Bíblia IA'] = {
    main: [[{ node: 'É Reenvio Áudio?', type: 'main', index: 0 }]]
  };
  wf.connections['É Reenvio Áudio?'] = {
    main: [
      [{ node: 'Enviar Telegram Áudio', type: 'main', index: 0 }],
      [{ node: 'Enviar Telegram', type: 'main', index: 0 }]
    ]
  };

  console.log('2. Salvando workflow no n8n...');
  const putRes = await req('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  });

  if (putRes.status >= 200 && putRes.status < 300) {
    console.log('3. Ativando workflow...');
    await req('POST', `/api/v1/workflows/${WORKFLOW_ID}/activate`);
    console.log('✓ Workflow FnkVNknOa2gV0Tfn atualizado e ativo com sucesso!');
  } else {
    console.error('Erro ao salvar workflow:', putRes);
  }
})();
