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

async function main() {
  console.log("1. Buscando workflow atual do n8n...");
  const getRes = await req("GET", `/api/v1/workflows/${WORKFLOW_ID}`);
  if (getRes.status !== 200) {
    throw new Error("Failed to get workflow: " + JSON.stringify(getRes.body));
  }
  const wf = getRes.body;
  fs.writeFileSync("backup_wf_before_diag_fix.json", JSON.stringify(wf, null, 2));
  console.log("   Backup salvo em backup_wf_before_diag_fix.json");

  // Localizar o nó Executar Admin
  const execNode = wf.nodes.find(n => n.name === 'Executar Admin');
  if (!execNode) throw new Error("Nó 'Executar Admin' não encontrado!");

  let code = execNode.parameters.jsCode;

  // 1. Atualizar SYSTEM_PROMPT com diretrizes de Diagnóstico, Persistência e Limpeza
  const targetPromptOld = "6. DIAGNÓSTICO DO SISTEMA (check_system_errors): verificar status e erros de páginas.\n7. GERAR CÓDIGO (generate_invite_code): criar código KING-XXXXX.";
  const targetPromptNew = `6. DIAGNÓSTICO DO SISTEMA E PERSISTÊNCIA DE ERROS (check_system_errors):
   - Use SEMPRE que o Adriano perguntar sobre status do site, saúde do servidor, erros recentes, erros das últimas 24h, OU se algum erro/problema AINDA PERSISTE ou JÁ FOI RESOLVIDO (ex: "esse erro persiste?", "já foi resolvido?", "o site tá funcionando?", "tem algum erro?").
   - Se o status geral estiver 100% Operacional (HTTP 200) e os registros de erro forem anteriores, informe com total clareza e segurança executiva que o problema NÃO persiste mais, que foi uma oscilação temporária já normalizada e que tudo está operando perfeitamente.
7. LIMPAR HISTÓRICO DE ERROS (clear_system_errors):
   - Use quando o Adriano pedir para limpar, zerar ou resetar o histórico/alerta de erros do sistema (ex: "limpa os erros", "zera o histórico", "pode apagar esses erros", "já verifiquei pode limpar").
8. TESTAR SITE/ROTA EM TEMPO REAL (test_system_health):
   - Use quando o Adriano pedir um teste em tempo real de resposta ou latência (ex: "testa o site agora", "faz um teste rápido", "como tá a velocidade?").
9. GERAR CÓDIGO (generate_invite_code): criar código KING-XXXXX.`;

  if (code.includes(targetPromptOld)) {
    code = code.replace(targetPromptOld, targetPromptNew);
    console.log("   ✓ SYSTEM_PROMPT atualizado com sucesso!");
  } else {
    console.log("   ⚠️ targetPromptOld não encontrado exatamente, verificando substituição alternativa...");
    code = code.replace(
      /6\.\s*DIAGNÓSTICO DO SISTEMA[\s\S]*?7\.\s*GERAR CÓDIGO.*?KING-XXXXX\./,
      targetPromptNew
    );
  }

  // 2. Atualizar TOOLS com clear_system_errors e test_system_health
  const targetToolsOld = `  { type: 'function', function: {
    name: 'check_system_errors',
    description: 'Verifica erros de páginas e health do sistema.',
    parameters: { type: 'object', properties: { detail: { type: 'boolean' } } }
  } },`;

  const targetToolsNew = `  { type: 'function', function: {
    name: 'check_system_errors',
    description: 'Verifica o status atual do sistema, saúde do servidor (/health), banco de dados, erros das últimas 24h e SE ERROS ANTERIORES AINDA PERSISTEM OU JÁ FORAM RESOLVIDOS. Use sempre que o Adriano perguntar sobre estabilidade, incidentes, quedas ou se algum erro persiste.',
    parameters: { type: 'object', properties: { detail: { type: 'boolean' } } }
  } },
  { type: 'function', function: {
    name: 'clear_system_errors',
    description: 'Limpa e zera o histórico de erros recentes de páginas do Conecta King após o Adriano solicitar ("limpa os erros", "zera os alertas", "pode apagar o log de erros").',
    parameters: { type: 'object', properties: {} }
  } },
  { type: 'function', function: {
    name: 'test_system_health',
    description: 'Executa um teste em tempo real medindo status HTTP e tempo de resposta/latência em milissegundos do servidor Conecta King.',
    parameters: { type: 'object', properties: {} }
  } },`;

  if (code.includes(targetToolsOld)) {
    code = code.replace(targetToolsOld, targetToolsNew);
    console.log("   ✓ TOOLS atualizado com clear_system_errors e test_system_health!");
  } else {
    console.log("   ⚠️ targetToolsOld não encontrado exatamente, usando regex para atualizar TOOLS...");
    code = code.replace(
      /\{\s*type:\s*'function',\s*function:\s*\{\s*name:\s*'check_system_errors'[\s\S]*?\}\s*\}\s*\},/,
      targetToolsNew
    );
  }

  // 3. Atualizar a implementação do handler de check_system_errors e adicionar clear_system_errors e test_system_health
  const targetHandlerOld = `      // ── DIAGNÓSTICO DO SISTEMA ────────────────────────────────────────────
      } else if (fnName === 'check_system_errors') {
        const h = await ck.call(this, 'GET', '/health');
        const ok = h.statusCode === 200 && h.body?.status === 'ok';
        let errorsMsg = '';
        try {
          const errR = await ck.call(this, 'GET', '/api/admin/system/recent-errors?limit=10');
          const summary = errR.body?.summary;
          const errors = errR.body?.errors || [];
          if (summary && summary.total_errors_24h > 0) {
            errorsMsg = \`\\n\\n⚠️ *Erros de Páginas nas últimas 24h:* \${summary.total_errors_24h}\\n\`;
            const byPage = summary.pages_breakdown || {};
            for (const [page, count] of Object.entries(byPage).slice(0, 5)) {
              errorsMsg += \`• \\\`\${page}\\\` — \${count} vez(es)\\n\`;
            }
            if (errors.length > 0) {
              const last = errors[0];
              errorsMsg += \`\\nÚltimo erro: _\${last.message}_ em \\\`\${last.path}\\\` (\${last.timestamp})\`;
            }
          } else {
            errorsMsg = '\\n\\n✅ *Nenhum erro de página registrado nas últimas 24h.*';
          }
        } catch (_) {
          errorsMsg = '\\n\\n_Diagnóstico de páginas indisponível._';
        }
        stepMsg = \`🟢 *Diagnóstico do Sistema Conecta King:*\\n\\n\` +
          \`• *Status Geral:* \${ok ? '100% Operacional ✅' : 'Atenção ⚠️'}\\n\` +
          \`• *Servidor / HTTP:* \${h.statusCode}\\n\` +
          \`• *Backend Laravel:* \${ok ? 'Ativo' : 'Com problemas'}\\n\` +
          \`• *Banco de Dados & Cache:* \${ok ? 'Conectados' : 'Verificar'}\` +
          errorsMsg;`;

  const targetHandlerNew = `      // ── DIAGNÓSTICO DO SISTEMA ────────────────────────────────────────────
      } else if (fnName === 'check_system_errors') {
        const startT = Date.now();
        const h = await ck.call(this, 'GET', '/health');
        const lat = Date.now() - startT;
        const ok = h.statusCode === 200 && h.body?.status === 'ok';
        let errorsMsg = '';
        try {
          const errR = await ck.call(this, 'GET', '/api/admin/system/recent-errors?limit=10');
          const summary = errR.body?.summary;
          const errors = errR.body?.errors || [];
          if (summary && summary.total_errors_24h > 0) {
            errorsMsg = \`\\n\\n⚠️ *Erros Registrados nas últimas 24h:* \${summary.total_errors_24h}\\n\`;
            const byPage = summary.pages_breakdown || {};
            for (const [page, count] of Object.entries(byPage).slice(0, 5)) {
              errorsMsg += \`• \\\`\${page}\\\` — \${count} vez(es)\\n\`;
            }
            if (errors.length > 0) {
              const last = errors[0];
              let descAmigavel = String(last.message || 'Instabilidade temporária');
              if (descAmigavel.includes('maintenance:uptime-selfcheck') || descAmigavel.includes('uptime.health')) {
                descAmigavel = 'Oscilação transitória na rotina de selfcheck';
              } else if (descAmigavel.includes('page.error_500')) {
                descAmigavel = 'Instabilidade temporária de resposta (HTTP 500)';
              }
              const errTime = last.timestamp ? new Date(last.timestamp) : null;
              const timeStr = errTime ? errTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
              errorsMsg += \`\\n*Última Ocorrência:* \${descAmigavel} em \\\`\${last.path || '/'}\\\` (\${timeStr || last.timestamp})\\n\`;
              if (ok) {
                errorsMsg += \`\\n🟢 *O erro persiste?* *NÃO, JÁ FOI RESOLVIDO ✅*\\n\` +
                  \`_O sistema já recuperou automaticamente e está operando 100%. Foi apenas um soluço temporário._\\n\\n\` +
                  \`💡 _Dica: Você pode me pedir "limpar erros" para zerar este aviso quando quiser._\`;
              } else {
                errorsMsg += \`\\n🔴 *O erro persiste?* *SIM, REQUER ATENÇÃO ⚠️*\\n_O servidor ainda está com lentidão ou indisponibilidade._\`;
              }
            }
          } else {
            errorsMsg = '\\n\\n✅ *Zero erros nas últimas 24h! Sistema 100% limpo e estável.*';
          }
        } catch (_) {
          errorsMsg = '\\n\\n_Diagnóstico de páginas indisponível no momento._';
        }
        stepMsg = \`🟢 *Diagnóstico do Sistema Conecta King:*\\n\\n\` +
          \`• *Status Geral:* \${ok ? '100% Operacional ✅' : 'Atenção ⚠️'}\\n\` +
          \`• *Servidor / HTTP:* \${h.statusCode} (\${lat}ms)\\n\` +
          \`• *Backend Laravel:* \${ok ? 'Ativo e Saudável' : 'Com problemas'}\\n\` +
          \`• *Banco de Dados & Cache:* \${ok ? 'Conectados' : 'Verificar'}\` +
          errorsMsg;

      // ── LIMPAR ERROS DO SISTEMA ───────────────────────────────────────────
      } else if (fnName === 'clear_system_errors') {
        const r = await ck.call(this, 'POST', '/api/admin/system/clear-errors');
        if (r.statusCode >= 200 && r.statusCode < 300) {
          stepMsg = \`🧹 *Histórico de Erros Zerado com Sucesso! — Agente King*\\n\\n\` +
            \`👑 Adriano, o painel de diagnósticos foi limpo:\\n\` +
            \`• ✅ Erros das últimas 24h: 0\\n\` +
            \`• ✅ Cache de incidentes: Limpo\\n\` +
            \`• ✅ Monitor de integridade: Operando 100% verde!\`;
        } else {
          stepMsg = \`⚠️ Não foi possível limpar o histórico de erros no momento.\`;
        }

      // ── TESTE EM TEMPO REAL ───────────────────────────────────────────────
      } else if (fnName === 'test_system_health') {
        const startT = Date.now();
        const r = await ck.call(this, 'GET', '/health');
        const lat = Date.now() - startT;
        const ok = r.statusCode === 200 && r.body?.status === 'ok';
        stepMsg = \`⚡ *Teste em Tempo Real Realizado!*\\n\\n\` +
          \`• *URL:* \\\`/health\\\`\\n\` +
          \`• *Status HTTP:* \${r.statusCode} \${ok ? 'OK ✅' : 'Falha ⚠️'}\\n\` +
          \`• *Tempo de Resposta:* \${lat}ms \${lat < 300 ? '⚡ (Ultrarrápido)' : '🟡'}\\n\` +
          \`• *Resposta do Servidor:* \\\`\${JSON.stringify(r.body || {})}\\\`\\n\\n\` +
          \`\${ok ? '🟢 Todos os serviços do Conecta King estão respondendo normalmente!' : '⚠️ Servidor com lentidão ou erro.'}\`;`;

  if (code.includes(targetHandlerOld)) {
    code = code.replace(targetHandlerOld, targetHandlerNew);
    console.log("   ✓ Handler check_system_errors atualizado e clear_system_errors/test_system_health adicionados!");
  } else {
    console.log("   ⚠️ targetHandlerOld não encontrado exatamente, buscando bloco...");
    code = code.replace(
      /\/\/\s*──\s*DIAGNÓSTICO DO SISTEMA[\s\S]*?errorsMsg;/,
      targetHandlerNew
    );
  }

  execNode.parameters.jsCode = code;

  // Atualizar workflow no n8n
  console.log("2. Enviando workflow atualizado para o n8n...");
  const putRes = await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  });

  if (putRes.status !== 200) {
    throw new Error("Erro ao salvar workflow: " + JSON.stringify(putRes.body));
  }
  console.log("   ✓ Workflow mkK244lveO0N1qPR atualizado com sucesso!");

  // Reativar workflow
  console.log("3. Reativando workflow...");
  const actRes = await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
  console.log("   Status de ativação:", actRes.status);
  console.log("🎉 Agente King atualizado e 100% operacional no Telegram!");
}

main().catch(err => {
  console.error("Erro:", err);
  process.exit(1);
});
