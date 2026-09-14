#!/usr/bin/env python3
"""Lighter voice prep + bump handled via compose separately."""
import json, os, sqlite3, time, uuid

DB = '/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'
MAIN = 'mkK244lveO0N1qPR'

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

if (!text && fileId && tgToken && openaiKey) {
  hadVoice = true;
  try {
    const meta = await this.helpers.httpRequest({
      method: 'GET',
      url: 'https://api.telegram.org/bot' + tgToken + '/getFile',
      qs: { file_id: fileId },
      json: true,
    });
    const filePath = meta?.result?.file_path;
    if (!filePath) throw new Error('file_path vazio');

    // Binary only (no returnFullResponse) — menos memória no runner
    const bin = await this.helpers.httpRequest({
      method: 'GET',
      url: 'https://api.telegram.org/file/bot' + tgToken + '/' + filePath,
      encoding: 'arraybuffer',
      json: false,
    });
    const buf = Buffer.isBuffer(bin) ? bin : Buffer.from(bin || []);
    if (!buf.length) throw new Error('áudio vazio');
    if (buf.length > 2_500_000) throw new Error('áudio grande demais (>2.5MB)');

    const ext = (String(filePath).split('.').pop() || 'ogg').toLowerCase();
    const filename = 'voice.' + (['ogg','oga','mp3','m4a','wav','webm'].includes(ext) ? ext : 'ogg');

    let tr;
    try {
      tr = await this.helpers.httpRequest({
        method: 'POST',
        url: 'https://api.openai.com/v1/audio/transcriptions',
        headers: { Authorization: 'Bearer ' + openaiKey },
        formData: {
          model: 'whisper-1',
          language: 'pt',
          file: {
            value: buf,
            options: { filename, contentType: 'audio/ogg' },
          },
        },
        json: true,
      });
    } catch (eForm) {
      // Fallback multipart manual (sem Content-Length extra)
      const b = '----ck' + Date.now().toString(36);
      const head = Buffer.from(
        '--' + b + '\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n' +
        '--' + b + '\r\nContent-Disposition: form-data; name="language"\r\n\r\npt\r\n' +
        '--' + b + '\r\nContent-Disposition: form-data; name="file"; filename="' + filename + '"\r\nContent-Type: audio/ogg\r\n\r\n',
        'utf8'
      );
      const tail = Buffer.from('\r\n--' + b + '--\r\n', 'utf8');
      const body = Buffer.concat([head, buf, tail]);
      const rawTr = await this.helpers.httpRequest({
        method: 'POST',
        url: 'https://api.openai.com/v1/audio/transcriptions',
        headers: {
          Authorization: 'Bearer ' + openaiKey,
          'Content-Type': 'multipart/form-data; boundary=' + b,
        },
        body,
        json: false,
      });
      tr = typeof rawTr === 'string' ? JSON.parse(rawTr) : rawTr;
    }

    text = String(tr?.text || '').trim();
    if (!text) throw new Error(tr?.error ? JSON.stringify(tr.error).slice(0, 180) : 'Whisper vazio');
  } catch (e) {
    voiceError = String(e.message || e).slice(0, 200);
    text = '[áudio recebido, mas não consegui transcrever]';
  }
} else if (!text && fileId) {
  hadVoice = true;
  text = '[áudio recebido, mas faltam credenciais para transcrever]';
  voiceError = 'token/key ausente';
}

if (!text) text = '[mensagem sem texto]';

return [{ json: {
  adminId, senderId, chatId, firstName, text, hadVoice, voiceError,
  // não espelhar message inteira (economiza memória)
} }];
'''


def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    nodes = json.loads(cur.execute('select nodes from workflow_entity where id=?', (MAIN,)).fetchone()[0])
    connections = json.loads(cur.execute('select connections from workflow_entity where id=?', (MAIN,)).fetchone()[0])
    settings = json.loads(cur.execute('select settings from workflow_entity where id=?', (MAIN,)).fetchone()[0] or '{}')
    name = cur.execute('select name from workflow_entity where id=?', (MAIN,)).fetchone()[0]

    for n in nodes:
        if n.get('name') == 'Preparar (texto/voz)':
            n['parameters']['jsCode'] = PREP_JS
            print('patched Preparar light')
        if n.get('name') == 'Intent Admin':
            js = n['parameters'].get('jsCode', '')
            if 'isVoiceFail' not in js or r'\b(ganho|lucro' not in js:
                print('WARN intent may be stale')
            else:
                print('intent ok')

    now = time.strftime('%Y-%m-%d %H:%M:%S.000')
    vid = str(uuid.uuid4())
    nodes_s = json.dumps(nodes, ensure_ascii=False)
    cur.execute(
        '''UPDATE workflow_entity SET nodes=?, connections=?, settings=?, versionId=?, activeVersionId=?,
           active=1, updatedAt=?, versionCounter=COALESCE(versionCounter,0)+1 WHERE id=?''',
        (nodes_s, json.dumps(connections, ensure_ascii=False), json.dumps(settings), vid, vid, now, MAIN),
    )
    cur.execute(
        '''INSERT OR REPLACE INTO workflow_history
           (versionId, workflowId, authors, createdAt, updatedAt, nodes, connections, name, autosaved, description, nodeGroups)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
        (vid, MAIN, 'system', now, now, nodes_s, json.dumps(connections, ensure_ascii=False), name, 0, None, '[]'),
    )
    conn.commit()
    conn.close()
    try:
        os.chown(DB, 1000, 1000)
    except Exception:
        pass
    print('version', vid)


if __name__ == '__main__':
    main()
