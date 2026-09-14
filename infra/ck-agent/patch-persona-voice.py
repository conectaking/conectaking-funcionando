#!/usr/bin/env python3
"""Patch voice whisper + persona knowledge. Run with n8n STOPPED."""
import json, os, sqlite3, time, uuid

DB = '/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'
MAIN_WF = 'mkK244lveO0N1qPR'

PREP_JS = r'''const raw = $input.first().json;
const msg = raw.message || {};
const adminId = String($env.ADMIN_TELEGRAM_ID || '0');
const senderId = String(msg.from?.id || '');
const chatId = String(msg.chat?.id || '');
const firstName = msg.from?.first_name || 'cliente';
let text = String(msg.text || msg.caption || '').trim();
let hadVoice = false;
let voiceError = '';

const fileId = msg.voice?.file_id || msg.audio?.file_id || msg.video_note?.file_id || null;
const tgToken = String($env.TELEGRAM_BOT_TOKEN || '').trim();
const openaiKey = String($env.OPENAI_API_KEY || '').trim();

function toBuffer(rawBody) {
  if (Buffer.isBuffer(rawBody)) return rawBody;
  if (rawBody instanceof ArrayBuffer) return Buffer.from(rawBody);
  if (ArrayBuffer.isView(rawBody)) return Buffer.from(rawBody.buffer);
  if (typeof rawBody === 'string') {
    // n8n sometimes returns binary as binary-string or base64
    try { return Buffer.from(rawBody, 'binary'); } catch (_) {}
    try { return Buffer.from(rawBody, 'base64'); } catch (_) {}
  }
  if (rawBody && rawBody.type === 'Buffer' && Array.isArray(rawBody.data)) {
    return Buffer.from(rawBody.data);
  }
  return Buffer.from(rawBody || []);
}

async function transcribe(buf, filename) {
  // 1) tenta formData nativo do helper (melhor no n8n)
  try {
    const tr = await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://api.openai.com/v1/audio/transcriptions',
      headers: { Authorization: 'Bearer ' + openaiKey },
      formData: {
        model: 'whisper-1',
        language: 'pt',
        file: {
          value: buf,
          options: { filename: filename, contentType: 'audio/ogg' },
        },
      },
      json: true,
    });
    const t = String(tr?.text || '').trim();
    if (t) return t;
  } catch (e1) {
    // segue para multipart manual
  }

  const boundary = '----ckVoice' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const crlf = '\r\n';
  const parts = [];
  function pushField(name, value) {
    parts.push(Buffer.from(
      '--' + boundary + crlf +
      'Content-Disposition: form-data; name="' + name + '"' + crlf + crlf +
      value + crlf,
      'utf8'
    ));
  }
  pushField('model', 'whisper-1');
  pushField('language', 'pt');
  parts.push(Buffer.from(
    '--' + boundary + crlf +
    'Content-Disposition: form-data; name="file"; filename="' + filename + '"' + crlf +
    'Content-Type: application/octet-stream' + crlf + crlf,
    'utf8'
  ));
  parts.push(buf);
  parts.push(Buffer.from(crlf + '--' + boundary + '--' + crlf, 'utf8'));
  const body = Buffer.concat(parts);

  try {
    const tr = await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://api.openai.com/v1/audio/transcriptions',
      headers: {
        Authorization: 'Bearer ' + openaiKey,
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': String(body.length),
      },
      body,
      json: true,
    });
    return String(tr?.text || '').trim();
  } catch (e) {
    const detail = e.response?.body || e.response?.data || e.error || e.message || e;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 280));
  }
}

if (!text && fileId) {
  hadVoice = true;
  if (!tgToken || !openaiKey) {
    voiceError = 'TELEGRAM_BOT_TOKEN ou OPENAI_API_KEY ausente no n8n';
    text = '[áudio recebido, mas faltam credenciais para transcrever]';
  } else {
    try {
      const meta = await this.helpers.httpRequest({
        method: 'GET',
        url: 'https://api.telegram.org/bot' + tgToken + '/getFile',
        qs: { file_id: fileId },
        json: true,
      });
      const filePath = meta?.result?.file_path;
      if (!filePath) throw new Error('file_path vazio');
      const audio = await this.helpers.httpRequest({
        method: 'GET',
        url: 'https://api.telegram.org/file/bot' + tgToken + '/' + filePath,
        encoding: 'arraybuffer',
        returnFullResponse: true,
        json: false,
      });
      const rawBody = audio.body !== undefined ? audio.body : audio;
      const buf = toBuffer(rawBody);
      if (!buf.length) throw new Error('áudio vazio (0 bytes)');
      const ext = (filePath.split('.').pop() || 'ogg').toLowerCase();
      const filename = 'voice.' + (ext === 'oga' || ext === 'ogg' || ext === 'mp3' || ext === 'm4a' || ext === 'wav' || ext === 'webm' ? ext : 'ogg');
      text = await transcribe.call(this, buf, filename);
      if (!text) throw new Error('Whisper retornou texto vazio');
    } catch (e) {
      voiceError = String(e.message || e).slice(0, 280);
      text = '[áudio recebido, mas não consegui transcrever: ' + voiceError + ']';
    }
  }
}

if (!text && hadVoice) text = '[áudio recebido, mas não consegui transcrever]';
if (!text) text = '[mensagem sem texto]';

return [{ json: { adminId, senderId, chatId, firstName, text, hadVoice, voiceError, message: msg } }];
'''

SYSTEM_CLIENTE = r'''Você é o consultor comercial de elite do Adriano King (também chamado King) e da Conecta King.
Fale em português do Brasil, humano, caloroso e persuasivo — sem parecer robô.

## QUEM É O ADRIANO KING (RETRATISTA)
- Não é “só fotógrafo”: é retratista e artista da imagem.
- Trabalho: extrair a essência das pessoas e colocar no retrato — o que está dentro vem para fora.
- Método: diálogo e conversa profunda. Pergunta quem a pessoa quer ser na foto, o que quer transmitir, como está a autoestima, o que quer entregar ao público.
- Propósito: ajudar a pessoa a se libertar de bloqueios/amarrações emocionais e se ver com verdade e potência.
- Resultado: não é uma foto simples; é imagem que eterniza, conecta com o público do cliente e carrega presença.
- Posicionamento de venda: contraste com estúdios genéricos (ex.: Retrato Barueri e similares) — aqui o diferencial é essência + processo humano, não “pacote de poses”.

## O QUE É A CONECTA KING (FOCO DE VENDA AGORA = CARTÃO VIRTUAL)
Adriano é CEO da Conecta King.
Produto principal a vender agora: cartão virtual / perfil digital + NFC (pulseira/tag) + QR Code + link na bio.
- NÃO é tag de pagamento / maquininha.
- É um sistema que une redes, WhatsApp, site, mentoria, livros, loja, plataformas etc. em UM só lugar (estilo “link na bio”, mas organizado, com banners, profissional).
- Em menos de ~3 segundos, ao encostar no iPhone ou Android (NFC), passa as informações.
- Compatível com Android e iPhone.
- Alternativas de compartilhar: NFC, QR Code, link na bio do Instagram.
- Site: https://www.conectaking.com.br | Tag pública: https://tag.conectaking.com.br/{slug}
- Entrada/planos: destaque comercial de entrada em torno de R$ 35/mês (confirme no site se o cliente perguntar detalhes de planos maiores).
- Por enquanto NÃO force venda da Gestão Financeira nem features avançadas — foque no cartão virtual / presença digital unificada.

## COMO VENDER
1) Entenda a dor (sumiço de leads, muitos links, falta de presença, retrato sem alma).
2) Espelhe a dor com empatia.
3) Apresente a solução certa (Retrato King OU Cartão Conecta King — ou os dois se fizer sentido).
4) CTA claro: agendar conversa / conhecer o cartão / ver planos / pedir código de acesso (só o King libera código).
5) Se pedirem humano/King: ESCALATE:YES no final da resposta. Caso contrário ESCALATE:NO.

## REGRAS
- Não invente preços fora do que está aqui/site.
- Não inventa dados financeiros do cliente.
- Se a mensagem começar com [áudio recebido...], peça desculpas e peça texto ou novo áudio.
- Respostas curtas a médias, com CTA.
- Sempre termine com ESCALATE:YES ou ESCALATE:NO na última linha.
'''


def upsert_active(cur, wf_id, nodes, connections, settings):
    now = time.strftime('%Y-%m-%d %H:%M:%S.000')
    version_id = str(uuid.uuid4())
    nodes_s = json.dumps(nodes, ensure_ascii=False)
    conn_s = json.dumps(connections, ensure_ascii=False)
    settings_s = json.dumps(settings, ensure_ascii=False)
    cur.execute(
        '''UPDATE workflow_entity SET nodes=?, connections=?, settings=?, versionId=?, activeVersionId=?,
           active=1, updatedAt=?, versionCounter=COALESCE(versionCounter,0)+1 WHERE id=?''',
        (nodes_s, conn_s, settings_s, version_id, version_id, now, wf_id),
    )
    cur.execute(
        '''INSERT OR REPLACE INTO workflow_history
           (versionId, workflowId, authors, createdAt, updatedAt, nodes, connections, name, autosaved, description, nodeGroups)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
        (version_id, wf_id, 'system', now, now, nodes_s, conn_s,
         cur.execute('select name from workflow_entity where id=?', (wf_id,)).fetchone()[0],
         0, None, '[]'),
    )
    print('new activeVersionId', version_id)


def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    row = cur.execute(
        'select nodes, connections, settings from workflow_entity where id=?', (MAIN_WF,)
    ).fetchone()
    nodes = json.loads(row[0])
    connections = json.loads(row[1])
    settings = json.loads(row[2] or '{}')

    for n in nodes:
        name = n.get('name')
        if name == 'Preparar (texto/voz)':
            n['parameters']['jsCode'] = PREP_JS
            print('patched voice')
        if name == 'AI Agent Cliente':
            p = n.setdefault('parameters', {})
            opts = p.setdefault('options', {})
            # n8n agent may store systemMessage in options or top-level
            if 'systemMessage' in opts or True:
                opts['systemMessage'] = SYSTEM_CLIENTE
            p['systemMessage'] = SYSTEM_CLIENTE
            # text/prompt field sometimes holds instructions
            if 'text' in p and isinstance(p['text'], str) and 'consultor' in p['text'].lower():
                p['text'] = SYSTEM_CLIENTE
            print('patched AI Agent Cliente systemMessage len', len(SYSTEM_CLIENTE))
        if name == 'AI Agent Admin':
            p = n.setdefault('parameters', {})
            opts = p.setdefault('options', {})
            sm = opts.get('systemMessage') or p.get('systemMessage') or ''
            tip = (
                '\n\nCONTEXTO DO KING: Adriano é retratista (essência humana no retrato, diálogo profundo) '
                'e CEO da Conecta King (cartão virtual + NFC/QR/link — não é tag de pagamento). '
                'Venda atual: focar cartão virtual.'
            )
            if 'CONTEXTO DO KING' not in sm and sm:
                opts['systemMessage'] = sm + tip
                p['systemMessage'] = opts['systemMessage']
                print('patched AI Agent Admin tip')

    upsert_active(cur, MAIN_WF, nodes, connections, settings)
    conn.commit()
    conn.close()
    try:
        os.chown(DB, 1000, 1000)
    except Exception:
        pass
    print('DONE')


if __name__ == '__main__':
    main()
