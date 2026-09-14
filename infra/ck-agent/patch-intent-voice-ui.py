#!/usr/bin/env python3
"""Fix: voice whisper, intent false-positive on 'recebido'/400, keep persona."""
import json, os, sqlite3, time, uuid

DB = '/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'
MAIN = 'mkK244lveO0N1qPR'

INTENT_JS = r'''const text = String($json.text || '').trim();
const hadVoice = !!$json.hadVoice;
const voiceError = String($json.voiceError || '').trim();
let intent = 'chat';

// Nunca tratar falha de áudio / placeholder como finança/código
const isVoiceFail = hadVoice && (!!voiceError || /^\[áudio recebido/i.test(text));
if (isVoiceFail) {
  return [{ json: { ...$json, intent: 'chat', amount: null, type: null, status: null, description: text, customCode: '', transactionDate: new Date().toISOString().slice(0, 10) } }];
}

const wantsFinance = (/lan[cç]ar|despesa|gasto|\bpaguei\b|\brecebi\b|\bcomprei\b|contas?\s+para\s+pagar|lan[cç]amento/i.test(text)
  && /(r\$\s*\d+|\d+[.,]\d{2})/i.test(text))
  || (/r\$\s*\d+/i.test(text) && /despesa|gasto|receita|pagar|lan[cç]ar/i.test(text));

const wantsCode = /(?:gerar|criar|gera|crie|faz(?:er)?)\s+(?:um\s+)?c[oó]digo/i.test(text)
  || /\bc[oó]digo\s+(?:de\s+)?(?:registro|convite|manual|ativa)/i.test(text)
  || /\bKING-[A-Z0-9]{2,30}\b/i.test(text);

const wantsDiag = /\b(diagn[oó]stico|health|status\s+do\s+site|site\s+caiu|\/status)\b/i.test(text)
  || /^(status|diagn[oó]stico)$/i.test(text);

if (wantsFinance) intent = 'finance';
else if (wantsCode) intent = 'code';
else if (wantsDiag) intent = 'diag';

let amount = null;
const am = text.match(/r\$\s*(\d+[.,]?\d*)/i) || text.match(/(\d+[.,]\d{2})/);
if (am) amount = parseFloat(String(am[1]).replace(',', '.'));

let type = /\breceita\b|\brecebi\b|\bentrou\b|\bganhei\b/i.test(text) ? 'INCOME' : 'EXPENSE';
let status = /\bpaguei\b|\bpago\b|j[aá]\s*paguei/i.test(text) ? 'PAID' : 'PENDING';
let description = text.replace(/r\$\s*\d+[.,]?\d*/ig, '').replace(/\s+/g, ' ').trim().slice(0, 180) || 'Lançamento via Telegram';

let customCode = '';
const cm = text.match(/\b(KING-[A-Z0-9]{2,30})\b/i)
  || text.match(/(?:gerar|criar|gera|crie)\s+c[oó]digo\s+([A-Z0-9][-_A-Z0-9]{2,30})/i);
if (cm) customCode = String(cm[1]).replace(/\s+/g, '').toUpperCase().slice(0, 32);

const today = new Date().toISOString().slice(0, 10);
return [{ json: { ...$json, intent, amount, type, status, description, customCode, transactionDate: today } }];
'''

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
  if (rawBody instanceof ArrayBuffer) return Buffer.from(new Uint8Array(rawBody));
  if (ArrayBuffer.isView(rawBody)) return Buffer.from(rawBody.buffer, rawBody.byteOffset, rawBody.byteLength);
  if (typeof rawBody === 'string') {
    // Prefer latin1/binary for telegram file bytes
    return Buffer.from(rawBody, 'latin1');
  }
  if (rawBody && rawBody.type === 'Buffer' && Array.isArray(rawBody.data)) return Buffer.from(rawBody.data);
  return Buffer.from([]);
}

async function downloadTelegramFile(path) {
  // Prefer binary download without JSON parsing
  const res = await this.helpers.httpRequest({
    method: 'GET',
    url: 'https://api.telegram.org/file/bot' + tgToken + '/' + path,
    encoding: 'arraybuffer',
    json: false,
    returnFullResponse: true,
  });
  return toBuffer(res.body !== undefined ? res.body : res);
}

async function whisperViaCurlStyle(buf, filename) {
  // Build multipart carefully (RFC 2046)
  const boundary = '------------------------' + Date.now().toString(16) + 'ck';
  const chunks = [];
  const push = (s) => chunks.push(Buffer.isBuffer(s) ? s : Buffer.from(s, 'utf8'));
  push('--' + boundary + '\r\n');
  push('Content-Disposition: form-data; name="model"\r\n\r\n');
  push('whisper-1\r\n');
  push('--' + boundary + '\r\n');
  push('Content-Disposition: form-data; name="language"\r\n\r\npt\r\n');
  push('--' + boundary + '\r\n');
  push('Content-Disposition: form-data; name="response_format"\r\n\r\njson\r\n');
  push('--' + boundary + '\r\n');
  push('Content-Disposition: form-data; name="file"; filename="' + filename + '"\r\n');
  push('Content-Type: audio/ogg\r\n\r\n');
  push(buf);
  push('\r\n--' + boundary + '--\r\n');
  const body = Buffer.concat(chunks);

  const tr = await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.openai.com/v1/audio/transcriptions',
    headers: {
      Authorization: 'Bearer ' + openaiKey,
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
    },
    body,
    encoding: 'utf8',
    json: false,
  });
  let parsed = tr;
  if (typeof tr === 'string') {
    try { parsed = JSON.parse(tr); } catch (_) { throw new Error('Whisper raw: ' + tr.slice(0, 180)); }
  }
  if (parsed?.error) throw new Error(JSON.stringify(parsed.error).slice(0, 220));
  return String(parsed?.text || '').trim();
}

if (!text && fileId) {
  hadVoice = true;
  if (!tgToken || !openaiKey) {
    voiceError = 'credenciais ausentes';
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
      const buf = await downloadTelegramFile.call(this, filePath);
      if (!buf.length) throw new Error('áudio vazio');
      const ext = (filePath.split('.').pop() || 'ogg').toLowerCase();
      const filename = 'voice.' + (['ogg','oga','mp3','m4a','wav','webm','mp4'].includes(ext) ? ext : 'ogg');
      text = await whisperViaCurlStyle.call(this, buf, filename);
      if (!text) throw new Error('Whisper vazio');
    } catch (e) {
      voiceError = String(e.message || e).slice(0, 280);
      text = '[áudio recebido, mas não consegui transcrever]';
    }
  }
}

if (!text && hadVoice) text = '[áudio recebido, mas não consegui transcrever]';
if (!text) text = '[mensagem sem texto]';

return [{ json: { adminId, senderId, chatId, firstName, text, hadVoice, voiceError, message: msg } }];
'''


def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    nodes = json.loads(cur.execute('select nodes from workflow_entity where id=?', (MAIN,)).fetchone()[0])
    connections = json.loads(cur.execute('select connections from workflow_entity where id=?', (MAIN,)).fetchone()[0])
    settings = json.loads(cur.execute('select settings from workflow_entity where id=?', (MAIN,)).fetchone()[0] or '{}')
    name = cur.execute('select name from workflow_entity where id=?', (MAIN,)).fetchone()[0]

    for n in nodes:
        if n.get('name') == 'Intent Admin':
            n['parameters']['jsCode'] = INTENT_JS
            print('patched Intent Admin')
        if n.get('name') == 'Preparar (texto/voz)':
            n['parameters']['jsCode'] = PREP_JS
            print('patched Preparar')

    now = time.strftime('%Y-%m-%d %H:%M:%S.000')
    vid = str(uuid.uuid4())
    nodes_s = json.dumps(nodes, ensure_ascii=False)
    conn_s = json.dumps(connections, ensure_ascii=False)
    set_s = json.dumps(settings, ensure_ascii=False)
    cur.execute(
        '''UPDATE workflow_entity SET nodes=?, connections=?, settings=?, versionId=?, activeVersionId=?,
           active=1, updatedAt=?, versionCounter=COALESCE(versionCounter,0)+1 WHERE id=?''',
        (nodes_s, conn_s, set_s, vid, vid, now, MAIN),
    )
    cur.execute(
        '''INSERT OR REPLACE INTO workflow_history
           (versionId, workflowId, authors, createdAt, updatedAt, nodes, connections, name, autosaved, description, nodeGroups)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
        (vid, MAIN, 'system', now, now, nodes_s, conn_s, name, 0, None, '[]'),
    )
    conn.commit()
    conn.close()
    try:
        os.chown(DB, 1000, 1000)
    except Exception:
        pass
    print('activeVersion', vid)


if __name__ == '__main__':
    main()
