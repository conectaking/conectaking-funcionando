#!/usr/bin/env python3
"""Patch live n8n DB: voice multipart, sentry alert WF, error WF. Run with n8n STOPPED."""
import json, os, sqlite3, time, uuid, secrets

DB = '/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'
ADMIN_CHAT = '78792434'
TG_CRED = 'MFt7IUN9HkKveUW8'  # known from prior ops; verify below
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

async function transcribe(buf) {
  const boundary = '----ckVoice' + Date.now().toString(36);
  const head =
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="model"\r\n\r\n' +
    'whisper-1\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="language"\r\n\r\n' +
    'pt\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="file"; filename="voice.ogg"\r\n' +
    'Content-Type: audio/ogg\r\n\r\n';
  const tail = '\r\n--' + boundary + '--\r\n';
  const body = Buffer.concat([Buffer.from(head, 'utf8'), buf, Buffer.from(tail, 'utf8')]);
  const tr = await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.openai.com/v1/audio/transcriptions',
    headers: {
      Authorization: 'Bearer ' + openaiKey,
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
    },
    body,
    json: true,
  });
  return String(tr?.text || '').trim();
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
      });
      const rawBody = audio.body !== undefined ? audio.body : audio;
      const buf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
      if (!buf.length) throw new Error('áudio vazio');
      text = await transcribe.call(this, buf);
      if (!text) throw new Error('Whisper retornou texto vazio');
    } catch (e) {
      voiceError = String(e.message || e).slice(0, 220);
      text = '[áudio recebido, mas não consegui transcrever: ' + voiceError + ']';
    }
  }
}

if (!text && hadVoice) text = '[áudio recebido, mas não consegui transcrever]';
if (!text) text = '[mensagem sem texto]';

return [{ json: { adminId, senderId, chatId, firstName, text, hadVoice, voiceError, message: msg } }];
'''

FMT_ADMIN = r'''const prep = $('Preparar (texto/voz)').first().json;
const prev = $input.first().json;
const out = String(prev.output || prev.text || '').trim();
const chatId = String(prep.chatId || prev.chatId || '');
if (!chatId) throw new Error('chatId vazio após Formatar Admin IA');
return [{ json: {
  ...prep, ...prev,
  output: out,
  outMessage: out || 'Sem resposta da IA.',
  chatId,
  senderId: String(prep.senderId || ''),
  firstName: prep.firstName || '',
  text: prep.text || '',
  hadVoice: !!prep.hadVoice,
}}];
'''

FMT_CLIENTE = r'''const prep = $('Preparar (texto/voz)').first().json;
const prev = $input.first().json;
let out = String(prev.output || prev.text || '').trim();
const escalate = /ESCALATE:\s*YES/i.test(out) || /humano|falar com o king/i.test(String(prep.text || ''));
out = out.replace(/\n?ESCALATE:\s*(YES|NO)\s*$/i, '').trim();
const chatId = String(prep.chatId || prev.chatId || '');
if (!chatId) throw new Error('chatId vazio após Formatar Cliente IA');
if (prep.hadVoice && prep.voiceError) {
  // keep transcription failure visible to user already in prep.text
}
return [{ json: {
  ...prep, ...prev,
  output: out,
  outMessage: out || 'Como posso ajudar?',
  chatId,
  senderId: String(prep.senderId || ''),
  firstName: prep.firstName || '',
  text: prep.text || '',
  escalate,
}}];
'''

SENTRY_FORMAT = r'''const j = $input.first().json;
const body = j.body || j;
const headers = j.headers || {};
const secret = String($env.CK_SENTRY_WEBHOOK_SECRET || '').trim();
const q = j.query || {};
const got = String(headers['x-ck-secret'] || headers['X-Ck-Secret'] || body.secret || q.secret || '').trim();
const looksSentry = !!(body.data && body.data.issue) || body.action === 'triggered' || !!body.resource;
if (secret && got !== secret && !looksSentry) {
  throw new Error('secret inválido');
}

// Sentry Issue Alert webhook OR OpsAlert custom payload
let title = body.action || body.title || 'alerta';
let issue = body.data?.issue || body.issue || body;
let project = body.project || issue?.project?.slug || issue?.project || 'conectaking';
let culprit = issue?.culprit || body.culprit || '';
let level = (issue?.level || body.level || 'error').toString().toUpperCase();
let url = issue?.web_url || issue?.url || body.url || 'https://conecta-king.sentry.io/issues/';
let msg = issue?.title || issue?.metadata?.value || body.message || body.title || JSON.stringify(body).slice(0, 240);
let envName = issue?.environment || body.environment || 'production';
let server = body.server_name || issue?.tags?.server_name || '';

const lines = [
  '🚨 *Conecta King — alerta*',
  `*Nível:* ${level}`,
  `*Projeto:* ${project}`,
  `*Ambiente:* ${envName}`,
  server ? `*Origem:* ${server}` : '',
  `*Erro:* ${String(msg).slice(0, 350)}`,
  culprit ? `*Onde:* ${String(culprit).slice(0, 180)}` : '',
  `*Sentry:* ${url}`,
  '',
  '_Reaja no admin ou peça detalhes ao King Assistente._',
].filter(Boolean);

return [{ json: {
  outMessage: lines.join('\n'),
  chatId: String($env.ADMIN_TELEGRAM_ID || '78792434'),
  level, project, msg: String(msg).slice(0, 200),
}}];
'''

ERROR_FORMAT = r'''const j = $input.first().json;
const exec = j.execution || {};
const wf = j.workflow || {};
const last = exec.lastNodeExecuted || j.lastNodeExecuted || '?';
const err = exec.error || j.error || {};
const message = err.message || err.description || JSON.stringify(err).slice(0, 240);
const lines = [
  '⚠️ *CK Agent — falha no workflow*',
  `*Workflow:* ${wf.name || wf.id || '?'}`,
  `*Nó:* ${last}`,
  `*Erro:* ${String(message).slice(0, 400)}`,
  `*Exec:* ${exec.id || j.executionId || '?'}`,
  '',
  'Abra: https://n8n.conectaking.com.br',
];
return [{ json: {
  outMessage: lines.join('\n'),
  chatId: String($env.ADMIN_TELEGRAM_ID || '78792434'),
}}];
'''


def new_id():
    return uuid.uuid4().hex[:16]


def upsert_workflow(cur, wf_id, name, nodes, connections, active=1, settings=None):
    now = time.strftime('%Y-%m-%d %H:%M:%S.000')
    version_id = str(uuid.uuid4())
    nodes_s = json.dumps(nodes, ensure_ascii=False)
    conn_s = json.dumps(connections, ensure_ascii=False)
    settings_s = json.dumps(settings or {"executionOrder": "v1"}, ensure_ascii=False)
    exists = cur.execute('select id from workflow_entity where id=?', (wf_id,)).fetchone()
    if exists:
        cur.execute(
            '''UPDATE workflow_entity SET name=?, active=?, nodes=?, connections=?, settings=?,
               versionId=?, activeVersionId=?, updatedAt=?, versionCounter=COALESCE(versionCounter,0)+1
               WHERE id=?''',
            (name, active, nodes_s, conn_s, settings_s, version_id, version_id, now, wf_id),
        )
    else:
        cur.execute(
            '''INSERT INTO workflow_entity
               (id, name, active, nodes, connections, settings, staticData, pinData, versionId,
                triggerCount, meta, parentFolderId, createdAt, updatedAt, isArchived, versionCounter,
                description, activeVersionId, nodeGroups)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
            (wf_id, name, active, nodes_s, conn_s, settings_s, '{}', '{}', version_id,
             1, '{}', None, now, now, 0, 1, None, version_id, '[]'),
        )
    # history snapshot (required for n8n 2.x activeVersionId)
    cur.execute(
        '''INSERT OR REPLACE INTO workflow_history
           (versionId, workflowId, authors, createdAt, updatedAt, nodes, connections, name, autosaved, description, nodeGroups)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
        (version_id, wf_id, 'system', now, now, nodes_s, conn_s, name, 0, None, '[]'),
    )
    # webhook entity rows for webhook nodes
    for n in nodes:
        if n.get('type') == 'n8n-nodes-base.webhook':
            path = n['parameters'].get('path')
            method = (n['parameters'].get('httpMethod') or 'POST').upper()
            webhook_id = n.get('webhookId') or n['id']
            cur.execute('DELETE FROM webhook_entity WHERE workflowId=? AND webhookPath=?', (wf_id, path))
            # n8n stores webhookPath sometimes as path only
            try:
                cur.execute(
                    '''INSERT INTO webhook_entity
                       (webhookPath, method, node, webhookId, pathLength, workflowId)
                       VALUES (?,?,?,?,?,?)''',
                    (path, method, n['name'], webhook_id, path.count('/') + 1 if path else 1, wf_id),
                )
            except Exception as e:
                print('webhook_entity insert skip', e, 'cols', [x[1] for x in cur.execute('pragma table_info(webhook_entity)')])
    return version_id


def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    # resolve telegram credential id
    creds = cur.execute("select id, name, type from credentials_entity").fetchall()
    print('creds', creds)
    tg = next((c[0] for c in creds if 'telegram' in (c[2] or '').lower() or 'Telegram' in (c[1] or '')), TG_CRED)
    print('using tg cred', tg)

    # --- patch main workflow ---
    row = cur.execute('select nodes, connections, settings, activeVersionId from workflow_entity where id=?', (MAIN_WF,)).fetchone()
    nodes = json.loads(row[0])
    connections = json.loads(row[1])
    settings = json.loads(row[2] or '{}')

    for n in nodes:
        name = n.get('name')
        if name == 'Preparar (texto/voz)':
            n['parameters']['jsCode'] = PREP_JS
            print('patched Preparar voice multipart')
        if name == 'Formatar Admin IA':
            n['parameters']['jsCode'] = FMT_ADMIN
        if name == 'Formatar Cliente IA':
            n['parameters']['jsCode'] = FMT_CLIENTE
        if name == 'Enviar Telegram':
            n['parameters']['chatId'] = "={{ $('Preparar (texto/voz)').first().json.chatId }}"
            n['parameters']['text'] = "={{ $json.outMessage || $json.output || 'Sem resposta.' }}"
            n['credentials'] = {'telegramApi': {'id': tg, 'name': 'Telegram'}}

    # point error workflow
    ERR_ID = 'ckErrWfSentry01'
    settings['errorWorkflow'] = ERR_ID
    settings['executionOrder'] = settings.get('executionOrder') or 'v1'

    # soft improve: if AI Agent Cliente system message exists, append robustness tip
    for n in nodes:
        if n.get('name') == 'AI Agent Cliente':
            opts = n.setdefault('parameters', {}).setdefault('options', {})
            # systemMessage may be in options or parameters
            sm = opts.get('systemMessage') or n['parameters'].get('systemMessage') or ''
            tip = '\n\nROBUSTEZ: se a mensagem começar com [áudio recebido, se a transcrição falhou, peça desculpas e peça texto. Nunca invente dados financeiros. Se não souber, diga que vai verificar com o King. Finalize respostas úteis com CTA claro (registro/planos). ESCALATE:YES só se pedir humano.'
            if 'ROBUSTEZ:' not in sm and sm:
                if 'systemMessage' in opts:
                    opts['systemMessage'] = sm + tip
                else:
                    n['parameters']['systemMessage'] = sm + tip
                print('appended robustness tip to AI Agent Cliente')
            break

    upsert_workflow(cur, MAIN_WF, 'CK Agent Telegram IA', nodes, connections, active=1, settings=settings)
    print('main workflow updated')

    # --- Sentry / Ops alert webhook workflow ---
    SENTRY_ID = 'ckSentryAlert01'
    wh_id = 'ck-sentry-wh'
    sentry_nodes = [
        {
            'parameters': {
                'httpMethod': 'POST',
                'path': 'ck-agent-sentry',
                'responseMode': 'onReceived',
                'options': {},
            },
            'id': 's1',
            'name': 'Webhook Sentry',
            'type': 'n8n-nodes-base.webhook',
            'typeVersion': 2,
            'position': [0, 300],
            'webhookId': wh_id,
        },
        {
            'parameters': {'jsCode': SENTRY_FORMAT},
            'id': 's2',
            'name': 'Formatar Alerta',
            'type': 'n8n-nodes-base.code',
            'typeVersion': 2,
            'position': [260, 300],
        },
        {
            'parameters': {
                'chatId': "={{ $json.chatId }}",
                'text': "={{ $json.outMessage }}",
                'additionalFields': {'parse_mode': 'Markdown'},
            },
            'id': 's3',
            'name': 'Avisar Admin TG',
            'type': 'n8n-nodes-base.telegram',
            'typeVersion': 1.2,
            'position': [520, 300],
            'credentials': {'telegramApi': {'id': tg, 'name': 'Telegram'}},
            'webhookId': 'tg-sentry-send',
        },
    ]
    sentry_conn = {
        'Webhook Sentry': {'main': [[{'node': 'Formatar Alerta', 'type': 'main', 'index': 0}]]},
        'Formatar Alerta': {'main': [[{'node': 'Avisar Admin TG', 'type': 'main', 'index': 0}]]},
    }
    upsert_workflow(cur, SENTRY_ID, 'CK Agent — Sentry/Ops Alertas', sentry_nodes, sentry_conn, active=1)
    print('sentry workflow upserted')

    # --- Error workflow ---
    err_nodes = [
        {
            'parameters': {},
            'id': 'e1',
            'name': 'Error Trigger',
            'type': 'n8n-nodes-base.errorTrigger',
            'typeVersion': 1,
            'position': [0, 300],
        },
        {
            'parameters': {'jsCode': ERROR_FORMAT},
            'id': 'e2',
            'name': 'Formatar Erro WF',
            'type': 'n8n-nodes-base.code',
            'typeVersion': 2,
            'position': [260, 300],
        },
        {
            'parameters': {
                'chatId': "={{ $json.chatId }}",
                'text': "={{ $json.outMessage }}",
                'additionalFields': {'parse_mode': 'Markdown'},
            },
            'id': 'e3',
            'name': 'Avisar Admin Erro',
            'type': 'n8n-nodes-base.telegram',
            'typeVersion': 1.2,
            'position': [520, 300],
            'credentials': {'telegramApi': {'id': tg, 'name': 'Telegram'}},
            'webhookId': 'tg-err-send',
        },
    ]
    err_conn = {
        'Error Trigger': {'main': [[{'node': 'Formatar Erro WF', 'type': 'main', 'index': 0}]]},
        'Formatar Erro WF': {'main': [[{'node': 'Avisar Admin Erro', 'type': 'main', 'index': 0}]]},
    }
    upsert_workflow(cur, ERR_ID, 'CK Agent — Error → Telegram', err_nodes, err_conn, active=1)
    print('error workflow upserted')

    # shared workflow for shared_workflow / project
    try:
        proj = cur.execute('select id from project limit 1').fetchone()
        if proj:
            for wid in (MAIN_WF, SENTRY_ID, ERR_ID):
                exists = cur.execute('select workflowId from shared_workflow where workflowId=?', (wid,)).fetchone()
                if not exists:
                    cur.execute(
                        'INSERT INTO shared_workflow (workflowId, projectId, role, createdAt, updatedAt) VALUES (?,?,?,?,?)',
                        (wid, proj[0], 'workflow:owner', time.strftime('%Y-%m-%d %H:%M:%S.000'), time.strftime('%Y-%m-%d %H:%M:%S.000')),
                    )
    except Exception as e:
        print('shared_workflow skip', e)

    conn.commit()
    conn.close()
    try:
        os.chown(DB, 1000, 1000)
    except Exception:
        pass
    print('DONE')


if __name__ == '__main__':
    main()
