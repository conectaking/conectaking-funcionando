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
    throw new Error("Erro ao buscar workflow: " + JSON.stringify(getRes.body));
  }
  const wf = getRes.body;
  fs.writeFileSync("backup_wf_before_super_upgrade.json", JSON.stringify(wf, null, 2));
  console.log("   Backup salvo em backup_wf_before_super_upgrade.json");

  const execNode = wf.nodes.find(n => n.name === 'Executar Admin');
  if (!execNode) throw new Error("Nó 'Executar Admin' não encontrado!");

  let code = execNode.parameters.jsCode;

  // 1. INJETAR NOVAS FERRAMENTAS NO ARRAY TOOLS
  const newToolsDefs = `  {
    type: 'function',
    function: {
      name: 'executive_briefing',
      description: 'Gera um briefing executivo 360° em tempo real para o Adriano King com: compromissos do dia no Google Agenda, despesas/contas a pagar hoje, saldo disponível em caixa, clientes expirando e conselho estratégico.',
      parameters: {
        type: 'object',
        properties: {
          periodo: {
            type: 'string',
            enum: ['hoje', 'amanha', 'semana'],
            description: 'Período do briefing (padrão: hoje)'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'manage_orcamentos',
      description: 'Cria ou lista orçamentos e propostas comerciais oficiais da Conecta King (ensaios, criação de cartões, pacotes de fotos, eventos). Gera link com botão de envio direto no WhatsApp do cliente com chave PIX inclusa.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['create_orcamento', 'list_orcamentos'],
            description: 'Ação a executar'
          },
          cliente_nome: { type: 'string', description: 'Nome do cliente' },
          cliente_whatsapp: { type: 'string', description: 'Telefone ou WhatsApp do cliente (opcional)' },
          servico: { type: 'string', description: 'Descrição detalhada do serviço ou pacote contratado' },
          valor: { type: 'number', description: 'Valor total do serviço em reais (ex: 850.00)' },
          data_evento: { type: 'string', description: 'Data prevista para o ensaio ou entrega (ex: YYYY-MM-DD ou DD/MM)' },
          condicoes: { type: 'string', description: 'Condições de pagamento (ex: 50% de entrada no PIX e 50% na entrega)' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'manage_vip_guests',
      description: 'Gerencia as listas de convidados VIP, eventos e confirmações de presença do Conecta King (GuestList / Portaria QR Code). Permite ver estatísticas de quem confirmou presença ou adicionar convidados.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list_events', 'event_stats', 'add_guest'],
            description: 'Ação a executar'
          },
          event_id: { type: 'number', description: 'ID do evento ou lista de convidados' },
          guest_name: { type: 'string', description: 'Nome do convidado VIP' },
          companions: { type: 'number', description: 'Quantidade de acompanhantes (padrão 0)' },
          category: { type: 'string', description: 'Categoria ou mesa (ex: VIP, Família, Pastor, Padrinhos)' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'collect_clients',
      description: 'Identifica clientes com planos vencidos ou a vencer e gera links de cobrança humanizados no WhatsApp com a chave PIX já incluída para fechamento rápido.',
      parameters: {
        type: 'object',
        properties: {
          filtro: {
            type: 'string',
            enum: ['expirados', 'a_expirar', 'todos'],
            description: 'Filtro de clientes para cobrança (padrão: todos)'
          }
        }
      }
    }
  },\n`;

  if (!code.includes("'executive_briefing'")) {
    code = code.replace("const TOOLS = [\n", "const TOOLS = [\n" + newToolsDefs);
    console.log("   + Novas ferramentas adicionadas à lista TOOLS!");
  }

  // 2. INJETAR DIRETRIZES NO SYSTEM PROMPT DO EXECUTAR ADMIN
  const promptSuperRules = `
═══ PODERES DO SUPER AGENTE KING (BRIEFINGS, ORÇAMENTOS, CONVIDADOS E COBRANÇAS) ═══
- BRIEFING EXECUTIVO: Quando o Adriano pedir "briefing", "como tá hoje?", "status geral", "resumo do dia", "me atualiza de tudo":
  -> CHAME OBRIGATORIAMENTE a ferramenta 'executive_briefing'!
- ORÇAMENTOS E PROPOSTAS: Quando o Adriano pedir para criar proposta, orçamento para cliente, passar valor de ensaio/cartão/evento:
  -> CHAME OBRIGATORIAMENTE a ferramenta 'manage_orcamentos'!
- CONVIDADOS VIP E EVENTOS: Quando o Adriano falar de lista de convidados, quem confirmou presença em evento, adicionar alguém na portaria:
  -> CHAME OBRIGATORIAMENTE a ferramenta 'manage_vip_guests'!
- COBRANÇA E RENOVAÇÃO: Quando o Adriano pedir para ver clientes vencendo, quem deve renovar ou cobrar inadimplentes:
  -> CHAME OBRIGATORIAMENTE a ferramenta 'collect_clients'!
`;

  if (!code.includes('PODERES DO SUPER AGENTE KING')) {
    code = code.replace(
      "═══ REGRAS SUPREMAS DE AGENDA",
      promptSuperRules + "\n═══ REGRAS SUPREMAS DE AGENDA"
    );
    console.log("   + Diretrizes do Super Agente injetadas no prompt!");
  }

  // 3. INJETAR HANDLERS DAS FERRAMENTAS NO LOOP DE TOOL_CALLS
  const handlersCode = `
      // ─── 1. BRIEFING EXECUTIVO 360° ─────────────────────────────────
      } else if (fnName === 'executive_briefing') {
        const profileId = (await resolveProfileId.call(this)) || 1;
        const summary = await fetchRealSummary.call(this, profileId);
        
        const kRes = await ck.call(this, 'GET', \`/api/finance/king-data?profile_id=\${profileId}\`);
        const kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
        const lembretes = Array.isArray(kingDb.lembretes) ? kingDb.lembretes : [];
        const hojeLembretes = lembretes.filter(l => l && l.status !== 'cancelado' && (l.data === dataHojeISO || l.data === today));

        const cRes = await ck.call(this, 'GET', '/api/admin/users?limit=100');
        const uList = (cRes.body && (cRes.body.data || cRes.body.users || cRes.body)) || [];
        const uArr = Array.isArray(uList) ? uList : [];
        const nowD = new Date();
        const expiring = uArr.filter(u => {
          if (!u || !u.expires_at) return false;
          const exp = new Date(u.expires_at);
          const diffDays = Math.ceil((exp - nowD) / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 7;
        });
        const expired = uArr.filter(u => {
          if (!u || !u.expires_at) return false;
          return new Date(u.expires_at) < nowD;
        });

        const lines = [
          \`👑 *BRIEFING EXECUTIVO — AGENTE KING* 👑\`,
          \`📅 *\${diaSemanaAtual}, \${dataHojeBr} (\${horaAtualSp})*\\n\`,
          \`💰 *Raio-X Financeiro:*\\n\` +
          \`• *Disponível em Caixa:* \${fmt(summary.current_balance)}\\n\` +
          \`• *Receitas do Mês:* \${fmt(summary.total_income)}\\n\` +
          \`• *A Receber / Pendências:* \${fmt(summary.pending_receivable)}\\n\` +
          \`• *Despesas do Mês:* \${fmt(summary.total_expense)}\\n\`,
          \`🗓️ *Compromissos & Lembretes de Hoje (\${hojeLembretes.length}):*\`
        ];

        if (hojeLembretes.length === 0) {
          lines.push(\`• _Nenhum compromisso agendado para hoje. Dia livre para prospecção e produção!_\`);
        } else {
          hojeLembretes.forEach(l => {
            const ico = l.tipo === 'lembrete' ? '⏰' : (l.tipo === 'ensaio' ? '📸' : (l.tipo === 'mentoria' ? '🎓' : '📅'));
            lines.push(\`• \${ico} *\${l.titulo}* às \${l.hora_inicio || '09:00'}\${l.local ? ' (' + l.local + ')' : ''}\`);
          });
        }

        lines.push(\`\\n👥 *Assinaturas & Clientes:*\`);
        lines.push(\`• *Total de Clientes:* \${uArr.length}\`);
        if (expiring.length > 0) {
          lines.push(\`• ⏳ *\${expiring.length} cliente(s) vencendo nos próximos 7 dias!*\`);
        }
        if (expired.length > 0) {
          lines.push(\`• 🔴 *\${expired.length} cliente(s) vencido(s)*\`);
        }
        if (expiring.length === 0 && expired.length === 0) {
          lines.push(\`• 🟢 *Todas as contas estão em dia!*\`);
        }

        lines.push(\`\\n⚡ *Diretriz do Agente King:*\\n_Foque em avançar nos trabalhos abertos e manter as finanças registradas. Eu cuido dos alertas e da sua agenda!_\`);
        stepMsg = lines.join('\\n');

      // ─── 2. GESTÃO DE ORÇAMENTOS E PROPOSTAS ────────────────────────
      } else if (fnName === 'manage_orcamentos') {
        const profileId = (await resolveProfileId.call(this)) || 1;
        const kRes = await ck.call(this, 'GET', \`/api/finance/king-data?profile_id=\${profileId}\`);
        let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
        if (!kingDb || typeof kingDb !== 'object') kingDb = {};
        if (!Array.isArray(kingDb.orcamentos)) kingDb.orcamentos = [];

        if (args.action === 'create_orcamento') {
          const clienteNome = String(args.cliente_nome || 'Cliente VIP').trim();
          const servico = String(args.servico || 'Serviço Personalizado Conecta King').trim();
          const valor = Number(args.valor || 0);
          const condicoes = String(args.condicoes || '50% de entrada na reserva via PIX e 50% na entrega').trim();
          const dataPrevista = String(args.data_evento || dataHojeBr).trim();
          const orcId = 'ORC-' + Date.now().toString().slice(-6);

          const novoOrc = {
            id: orcId,
            cliente: clienteNome,
            servico,
            valor,
            condicoes,
            data_prevista: dataPrevista,
            status: 'enviado',
            created_at: dataHojeISO + ' ' + horaAtualSp
          };

          kingDb.orcamentos.unshift(novoOrc);
          await ck.call(this, 'PUT', \`/api/finance/king-data?profile_id=\${profileId}\`, { profile_id: profileId, data: kingDb });

          const zapTexto = \`Olá \${clienteNome}! 👑 Segue sua Proposta Comercial Conecta King:\\n\\n\` +
            \`📋 *Serviço:* \${servico}\\n\` +
            \`🗓️ *Data Prevista:* \${dataPrevista}\\n\` +
            \`💰 *Investimento Total:* \${fmt(valor)}\\n\` +
            \`💳 *Condições:* \${condicoes}\\n\\n\` +
            \`🔑 *Chave PIX Oficial:* playadrian@gmail.com (Adriano King)\\n\\n\` +
            \`Para confirmar sua reserva, basta responder aqui com o comprovante da entrada! Qualquer dúvida fico à disposição.\`;

          const zapUrl = \`https://wa.me/\${args.cliente_whatsapp ? String(args.cliente_whatsapp).replace(/\\D/g, '') : ''}?text=\` + encodeURIComponent(zapTexto);

          stepMsg = \`📄 *Proposta Comercial Gerada com Sucesso! — Agente King*\\n\\n\` +
            \`🆔 *Código:* \\\`\${orcId}\\\`\\n\` +
            \`👤 *Cliente:* *\${clienteNome}*\\n\` +
            \`💼 *Serviço:* \${servico}\\n\` +
            \`💰 *Valor:* *\${fmt(valor)}*\\n\` +
            \`🗓️ *Data Prevista:* \${dataPrevista}\\n\` +
            \`💳 *Condições:* \${condicoes}\\n\\n\` +
            \`📲 [Tocar aqui para Enviar Orçamento no WhatsApp](\${zapUrl})\\n\` +
            \`_(Ao tocar, abre o WhatsApp com a proposta formal e chave PIX já preenchidas!)_\`;

        } else if (args.action === 'list_orcamentos') {
          const lista = kingDb.orcamentos || [];
          if (lista.length === 0) {
            stepMsg = \`📄 *Orçamentos Conecta King:*\\n\\nNenhum orçamento emitido recentemente.\\n\\nPara gerar um novo, é só me pedir: _"King, gera orçamento de ensaio de R$ 800 para a Maria"_\`;
          } else {
            const lines = lista.slice(0, 8).map((o, i) => {
              return \`\${i + 1}. *\${o.cliente}* (\\\`\${o.id}\\\`)\\n   💼 \${o.servico}\\n   💰 \${fmt(o.valor)} | 🗓️ \${o.data_prevista || 'A definir'}\`;
            });
            stepMsg = \`📄 *Últimos Orçamentos Emitidos (\${lista.length}):*\\n\\n\${lines.join('\\n\\n')}\`;
          }
        }

      // ─── 3. GESTÃO DE CONVIDADOS VIP (GUESTLIST) ────────────────────
      } else if (fnName === 'manage_vip_guests') {
        if (args.action === 'list_events') {
          const r = await ck.call(this, 'GET', '/api/guest-lists');
          const list = (r.body && (r.body.data || r.body)) || [];
          const arr = Array.isArray(list) ? list : [];
          if (arr.length === 0) {
            stepMsg = \`🎟️ *Listas de Convidados Conecta King:*\\n\\nNenhuma lista de eventos encontrada no momento.\`;
          } else {
            const lines = arr.slice(0, 8).map((ev, i) => {
              return \`\${i + 1}. 🎟️ *\${ev.title || ev.name || 'Evento'}* (ID: \\\`\${ev.id}\\\`)\\n   📅 Data: \${ev.event_date || 'A definir'} | Convidados: \${ev.guests_count ?? ev.total_guests ?? 0}\`;
            });
            stepMsg = \`🎟️ *Eventos & Listas VIP Conecta King (\${arr.length}):*\\n\\n\${lines.join('\\n\\n')}\`;
          }
        } else if (args.action === 'event_stats') {
          const evId = args.event_id || 1;
          const r = await ck.call(this, 'GET', \`/api/guest-lists/\${evId}/stats\`);
          const st = (r.body && (r.body.data || r.body)) || {};
          stepMsg = \`📊 *Estatísticas do Evento VIP (ID: \${evId}):*\\n\\n\` +
            \`👥 *Total de Convidados:* \${st.total_guests ?? 0}\\n\` +
            \`✅ *Confirmados:* \${st.confirmed ?? st.total_confirmed ?? 0}\\n\` +
            \`❌ *Recusados:* \${st.declined ?? 0}\\n\` +
            \`⏳ *Aguardando Confirmação:* \${st.pending ?? 0}\\n\` +
            \`🎫 *Presentes no Local (Check-in Portaria):* \${st.checked_in ?? 0}\`;
        } else if (args.action === 'add_guest') {
          const evId = args.event_id || 1;
          const gName = String(args.guest_name || 'Convidado VIP').trim();
          const comps = Number(args.companions || 0);
          const r = await ck.call(this, 'POST', \`/api/guest-lists/\${evId}/guests\`, {
            name: gName,
            companion_limit: comps,
            category: args.category || 'VIP'
          });
          if (r.statusCode >= 200 && r.statusCode < 300) {
            stepMsg = \`🎟️ *Convidado VIP Adicionado com Sucesso!*\\n\\n👤 *Nome:* \${gName}\\n👥 *Acompanhantes permitidos:* \${comps}\\n🏷️ *Categoria:* \${args.category || 'VIP'}\\n\\n✅ _Liberado para acesso na portaria QR Code!_\`;
          } else {
            stepMsg = \`⚠️ Falha ao adicionar convidado VIP: \${JSON.stringify(r.body).slice(0, 200)}\`;
          }
        }

      // ─── 4. COBRANÇA E RECUPERAÇÃO DE CLIENTES ──────────────────────
      } else if (fnName === 'collect_clients') {
        const cRes = await ck.call(this, 'GET', '/api/admin/users?limit=100');
        const uList = (cRes.body && (cRes.body.data || cRes.body.users || cRes.body)) || [];
        const uArr = Array.isArray(uList) ? uList : [];
        const nowD = new Date();
        const filtro = args.filtro || 'todos';

        const targets = uArr.filter(u => {
          if (!u || !u.expires_at) return false;
          const exp = new Date(u.expires_at);
          const diffDays = Math.ceil((exp - nowD) / (1000 * 60 * 60 * 24));
          if (filtro === 'expirados') return diffDays < 0;
          if (filtro === 'a_expirar') return diffDays >= 0 && diffDays <= 7;
          return diffDays <= 7;
        });

        if (targets.length === 0) {
          stepMsg = \`🟢 *Cobranças Conecta King:*\\n\\nExcelente notícia, Adriano! Nenhum cliente com plano vencendo nos próximos dias. Todos estão 100% em dia!\`;
        } else {
          const lines = targets.slice(0, 8).map((u, i) => {
            const exp = new Date(u.expires_at);
            const isVencido = exp < nowD;
            const statusTxt = isVencido ? '🔴 Vencido' : '⏳ Vence em breve';
            const zapMsg = encodeURIComponent(
              \`Olá \${u.name}! 👑 Passando para avisar que sua assinatura da Conecta King (\${u.planName || 'Plano Pro'}) \` +
              (isVencido ? 'venceu recentemente' : 'está vencendo nos próximos dias') +
              \`.\n\nPara renovar seu acesso, chave PIX: playadrian@gmail.com (Adriano King).\nAssim que transferir, me manda o comprovante por aqui que já renovo para você!\`
            );
            const zapLink = \`https://wa.me/?text=\${zapMsg}\`;
            return \`\${i + 1}. *\${u.name}* (\${u.email || u.tag})\\n\` +
                   \`   💎 Plano: *\${u.planName || 'Plano Pro'}* | 📅 Vencimento: \${u.expires_at.slice(0, 10)} (\${statusTxt})\\n\` +
                   \`   📲 [Cobrar com 1 Toque no WhatsApp](\${zapLink})\`;
          });

          stepMsg = \`💳 *Painel de Cobrança & Renovação Conecta King (\${targets.length} clientes):*\\n\\n\` +
            lines.join('\\n\\n') +
            \`\\n\\n💡 _Ao tocar no link, o WhatsApp abre com o texto de renovação e a chave PIX já digitados!_\`;
        }
`;

  if (!code.includes("fnName === 'executive_briefing'")) {
    code = code.replace(
      "} else if (fnName === 'generate_invite_code') {",
      handlersCode + "\n      } else if (fnName === 'generate_invite_code') {"
    );
    console.log("   + Handlers das novas ferramentas injetados no loop!");
  }

  execNode.parameters.jsCode = code;

  console.log("2. Enviando workflow atualizado para o n8n...");
  const putPayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };

  const putRes = await req("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, putPayload);
  console.log("   PUT status:", putRes.status);
  if (putRes.status !== 200) {
    throw new Error("Erro ao salvar workflow: " + JSON.stringify(putRes.body));
  }

  console.log("3. Reativando workflow...");
  const actRes = await req("POST", `/api/v1/workflows/${WORKFLOW_ID}/activate`);
  console.log("   Activate status:", actRes.status);

  console.log("\n✅ SUPER AGENTE KING 3.0 IMPLANTADO COM SUCESSO NO TELEGRAM!");
}

main().catch(console.error);
