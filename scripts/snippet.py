import subprocess

py = """import sqlite3
import json

conn = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
c = conn.cursor()
c.execute("SELECT nodes FROM workflow_entity WHERE id='mkK244lveO0N1qPR'")
row = c.fetchone()
nodes = json.loads(row[0])
node = [n for n in nodes if n.get('name') == 'Executar Admin'][0]
code = node['parameters']['jsCode']

target = \"\"\"  if (!openaiKey) {
    outMessage = '⚠️ OPENAI_API_KEY não configurada no servidor.';
  } else {\"\"\"

replacement = \"\"\"  if (!openaiKey) {
    outMessage = '⚠️ OPENAI_API_KEY não configurada no servidor.';
  } else {
    const lowerInputMsg = String(text || '').toLowerCase();

    // ── INTERCEPTAÇÃO DIRETA: "QUANTO FULANO FALTA ME PAGAR" / "QUEM ME DEVE" ──
    const isDirectReceivables = 
      lowerInputMsg.includes('falta me pagar') ||
      lowerInputMsg.includes('falta pagar para mim') ||
      lowerInputMsg.includes('me deve') ||
      lowerInputMsg.includes('falta receber') ||
      lowerInputMsg.includes('tenho a receber') ||
      lowerInputMsg.includes('a receber de') ||
      lowerInputMsg.includes('trabalhos a receber') ||
      (lowerInputMsg.includes('quanto') && lowerInputMsg.includes('falta') && !lowerInputMsg.includes('falta eu pagar'));

    if (isDirectReceivables) {
      const pid = (await resolveProfileId.call(this)) || 1;
      const kRes = await ck.call(this, 'GET', `/api/finance/king-data?profile_id=${pid}`);
      let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
      const trabalhos = Array.isArray(kingDb.trabalhos) ? kingDb.trabalhos : [];

      let cli = '';
      const mCli = lowerInputMsg.match(/(?:falta\\s+(?:me\\s+)?pagar|me\\s+deve|receber\\s+d[eao]|quanto\\s+(?:que\\s+)?(?:a|o)\\s+)([a-zA-Zá-úÁ-Ú]+)/i);
      if (mCli && mCli[1] && !['que', 'me', 'quanto', 'de', 'da', 'do', 'o', 'a'].includes(mCli[1].toLowerCase())) {
        cli = mCli[1].toLowerCase().trim();
      }

      if (cli) {
        const trabMatch = trabalhos.filter(t => t && String(t.cliente || '').toLowerCase().includes(cli));
        if (trabMatch.length === 0) {
          outMessage = `🔍 *Adriano, não encontrei nenhum trabalho registrado para "${cli}".*\\\\n\\\\n` +
            `💡 _Verifique se o nome está correto ou consulte todos com: "quais trabalhos tenho a receber"._`;
        } else {
          let lines = [`👑 *Valores a Receber — Cliente: ${trabMatch[0].cliente}*\\\\n`];
          let totalFaltaCli = 0;
          let totalRecebidoCli = 0;
          let totalGeralCli = 0;
          trabMatch.forEach((t) => {
            const totPago = (t.pagamentos || []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
            const falta = Math.max(0, Number(t.valor || 0) - totPago);
            totalFaltaCli += falta;
            totalRecebidoCli += totPago;
            totalGeralCli += Number(t.valor || 0);
            lines.push(`💼 *Serviço:* ${t.servico || 'Trabalho'}\\\\n💰 *Valor Total:* ${fmt(t.valor)}\\\\n💵 *Já Recebido:* ${fmt(totPago)}\\\\n⏳ *Falta Receber:* *${fmt(falta)}* ${falta > 0 ? '🔴' : '✅ Quitado!'}`);
            if (t.dataPrevista) {
              lines.push(`📅 *Previsão de Quitação:* ${t.dataPrevista}`);
            }
          });
          if (trabMatch.length > 1) {
            lines.push(`\\\\n📊 *Resumo Geral do Cliente:* Total: ${fmt(totalGeralCli)} | Recebido: ${fmt(totalRecebidoCli)} | *Falta: ${fmt(totalFaltaCli)}*`);
          }
          outMessage = lines.join('\\\\n');
        }
      } else {
        const pendentes = trabalhos.filter(t => {
          const totPago = (t.pagamentos || []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
          return (Number(t.valor || 0) - totPago) > 0.01;
        });

        if (pendentes.length === 0) {
          outMessage = `🎉 *Excelente notícia, Adriano!* Todos os trabalhos registrados estão quitados no momento. Não há nenhum valor pendente de clientes!`;
        } else {
          let totalFalta = 0;
          const lines = ['👑 *Trabalhos com Valores a Receber — Agente King:\\\\n'];
          pendentes.forEach((t, idx) => {
            const totPago = (t.pagamentos || []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
            const falta = Math.max(0, Number(t.valor || 0) - totPago);
            totalFalta += falta;
            lines.push(`${idx + 1}. 👤 *${t.cliente}* — ${t.servico || 'Serviço'}\\\\n   💰 Total: ${fmt(t.valor)} | Recebido: ${fmt(totPago)} | 🔴 *Falta: ${fmt(falta)}*`);
          });
          lines.push(`\\\\n💵 *Total Geral a Receber:* *${fmt(totalFalta)}*`);
          outMessage = lines.join('\\\\n');
        }
      }

      session.history.push({ role: 'user', content: text });
      session.history.push({ role: 'assistant', content: outMessage });
      if (session.history.length > 20) session.history = session.history.slice(-20);

      return [{ json: {
        ...prev,
        outMessage,
        chatId,
        needGoogleCalendar: false
      } }];
    }

    // ── INTERCEPTAÇÃO DIRETA: "BATER NO VALOR" / "ABATER NO VALOR" ──
    const isDirectBaterNoValor = 
      lowerInputMsg.includes('bater no valor') || 
      lowerInputMsg.includes('abater no valor') || 
      lowerInputMsg.includes('abater do valor') ||
      lowerInputMsg.includes('abater no trabalho');

    if (isDirectBaterNoValor) {
      const pid = (await resolveProfileId.call(this)) || 1;
      const kRes = await ck.call(this, 'GET', `/api/finance/king-data?profile_id=${pid}`);
      let kingDb = (kRes.body && kRes.body.data) ? kRes.body.data : (kRes.body || {});
      const trabalhos = Array.isArray(kingDb.trabalhos) ? kingDb.trabalhos : [];

      const valorMatch = lowerInputMsg.match(/r?\\$?\\s*(\\d+(?:[.,]\\d{1,2})?)/i);
      const vPago = valorMatch ? parseFloat(valorMatch[1].replace(',', '.')) : 0;
      let cli = '';
      const mCli = lowerInputMsg.match(/d[aeo]\\s+([a-zA-Zá-úÁ-Ú]+)/i);
      if (mCli && mCli[1] && !['gestao', 'gestão', 'valor', 'trabalho', 'caixa'].includes(mCli[1].toLowerCase())) {
        cli = mCli[1].toLowerCase().trim();
      }

      let trab = trabalhos.find(t => t && String(t.cliente || '').toLowerCase().includes(cli));
      if (!trab && trabalhos.length === 1) trab = trabalhos[0];

      if (!trab) {
        outMessage = `⚠️ Não encontrei o trabalho para o cliente "${cli}" para dar baixa.`;
      } else {
        if (!Array.isArray(trab.pagamentos)) trab.pagamentos = [];
        const now = new Date();
        const hora = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        const today = now.toISOString().slice(0, 10);
        trab.pagamentos.push({ valor: vPago, data: today, hora });

        const totalPago = trab.pagamentos.reduce((s, p) => s + (Number(p.valor) || 0), 0);
        trab.status = totalPago >= trab.valor ? 'concluido' : 'parcial';

        await ck.call(this, 'PUT', `/api/finance/king-data?profile_id=${pid}`, {
          profile_id: pid,
          data: kingDb
        });

        const summary = await fetchRealSummary.call(this, pid);
        const falta = Math.max(0, trab.valor - totalPago);

        outMessage = `💰 *Pagamento Registrado com Sucesso — Agente King*\\\\n\\\\n` +
          `👤 *Cliente:* ${trab.cliente}\\\\n` +
          `💵 *Valor Recebido Agora:* ${fmt(vPago)}\\\\n` +
          `📈 *Total Pago Até Agora:* ${fmt(totalPago)} de ${fmt(trab.valor)}\\\\n` +
          `⏳ *Falta Receber:* ${fmt(falta)} ${falta > 0 ? '🔴' : '✅ Quitado!'}\\\\n` +
          `📌 *Status do Trabalho:* ${trab.status === 'concluido' ? 'Concluído (Quitado) ✅' : 'Parcialmente Pago ⏳'}\\\\n\\\\n` +
          buildSummaryMessage(summary, fmt);
      }

      session.history.push({ role: 'user', content: text });
      session.history.push({ role: 'assistant', content: outMessage });
      if (session.history.length > 20) session.history = session.history.slice(-20);

      return [{ json: {
        ...prev,
        outMessage,
        chatId,
        needGoogleCalendar: false
      } }];
    }\"\"\"

if target in code:
    code = code.replace(target, replacement)
    print("Direct interceptor successfully inserted!")
else:
    print("Target not found!")

# Also clear old session.history in static data so no ghost memory remains
node['parameters']['jsCode'] = code
c.execute("UPDATE workflow_entity SET nodes=? WHERE id='mkK244lveO0N1qPR'", (json.dumps(nodes),))

# Clear workflow execution static data
c.execute("DELETE FROM workflow_history WHERE workflowId='mkK244lveO0N1qPR'")
c.execute("UPDATE workflow_entity SET staticData='{}' WHERE id='mkK244lveO0N1qPR'")

conn.commit()
conn.close()
print("Saved and cleared static data in DB!")
"""

p = subprocess.Popen(["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", "cat > /tmp/apply_direct_intercept.py && python3 /tmp/apply_direct_intercept.py"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8')
stdout, stderr = p.communicate(input=py)
safe_stdout = stdout.encode('ascii', 'backslashreplace').decode('ascii')
print(safe_stdout)
if stderr:
    print("ERR:", stderr)
