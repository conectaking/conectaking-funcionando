#!/usr/bin/env python3
"""Root-fix: voice via HTTP nodes (no Code binary). Clean CK positioning. Clear memory."""
import json, os, sqlite3, time, uuid

DB = '/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'
MAIN = 'mkK244lveO0N1qPR'
TG_CRED = {'telegramApi': {'id': 'MFt7IUN9HkKveUW8', 'name': 'Telegram account'}}

PREP_JS = r'''const raw = $input.first().json;
const msg = raw.message || {};
const adminId = String($env.ADMIN_TELEGRAM_ID || '0');
const senderId = String(msg.from?.id || '');
const chatId = String(msg.chat?.id || '');
const firstName = msg.from?.first_name || 'cliente';
const text = String(msg.text || msg.caption || '').trim();
const fileId = msg.voice?.file_id || msg.audio?.file_id || msg.video_note?.file_id || null;
const hadVoice = !text && !!fileId;
return [{ json: {
  adminId, senderId, chatId, firstName,
  text: text || (hadVoice ? '' : '[mensagem sem texto]'),
  hadVoice, fileId: fileId || '',
  voiceError: ''
} }];
'''

UNIR_JS = r'''const prep = $('Preparar (texto/voz)').first().json;
const j = $input.first().json || {};
let text = String(j.text || '').trim();
let voiceError = '';
if (!text) {
  voiceError = String(j.error?.message || j.message || 'whisper vazio').slice(0, 180);
  text = '[áudio recebido, mas não consegui transcrever]';
}
return [{ json: { ...prep, text, hadVoice: true, voiceError } }];
'''

FMT_JS = r'''function from(name) {
  try { return $(name).first().json; } catch (e) { return null; }
}
const prep = from('Unir voz') || from('Preparar (texto/voz)') || {};
const prev = $input.first().json;
let out = String(prev.output || prev.text || '').trim();
const escalate = /ESCALATE:\s*YES/i.test(out) || /humano|falar com o king/i.test(String(prep.text || ''));
out = out.replace(/\n?ESCALATE:\s*(YES|NO)\s*$/i, '').trim();
const chatId = String(prep.chatId || prev.chatId || '');
if (!chatId) throw new Error('chatId vazio após formatar');
return [{ json: {
  ...prep, ...prev,
  output: out,
  outMessage: out || 'Como posso ajudar?',
  chatId,
  senderId: String(prep.senderId || ''),
  firstName: prep.firstName || '',
  text: prep.text || '',
  hadVoice: !!prep.hadVoice,
  escalate
} }];
'''

FMT_ADMIN_JS = r'''function from(name) {
  try { return $(name).first().json; } catch (e) { return null; }
}
const prep = from('Unir voz') || from('Preparar (texto/voz)') || {};
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
  hadVoice: !!prep.hadVoice
} }];
'''

SM_CLIENTE = '''Você é o consultor comercial do Adriano King e da Conecta King. PT-BR, humano, direto.

ADRIANO KING — RETRATISTA
Não é fotógrafo genérico. É retratista: extrai a essência da pessoa e coloca no retrato, com diálogo profundo (quem ela quer ser, o que quer transmitir, autoestima). Imagem que eterniza e conecta com o público do cliente.

CONECTA KING — O QUE É
Adriano é CEO. Produto a vender agora: CARTÃO VIRTUAL (perfil digital).
- Tecnologia NFC (pulseira/tag) + QR Code + link na bio.
- Encosta no iPhone ou Android e transmite o cartão em cerca de 3 segundos.
- Junta redes, WhatsApp, site, mentoria, livros, loja etc. em UM lugar organizado.

CONECTA KING — O QUE NÃO É
PROIBIDO dizer: soluções de pagamentos, tag de pagamento, maquininha, foco em pagamento.
Não venda gestão financeira agora. Foque no cartão virtual + NFC.

Site: https://www.conectaking.com.br
Tag: https://tag.conectaking.com.br/{slug}
Entrada ~ R$ 35/mês (confirme planos maiores no site).
Código de acesso: só o King libera.

CTA claro. Se pedirem humano, última linha: ESCALATE:YES. Senão: ESCALATE:NO.
Se a mensagem for [áudio recebido...], peça o texto.
'''

SM_ADMIN = '''Você é o Assistente Executivo do Adriano King no Telegram (admin). PT-BR, direto.

Adriano: retratista (essência no retrato) e CEO da Conecta King.
Conecta King: CARTÃO VIRTUAL + NFC (Android/iPhone) para transmitir o perfil rápido.
NÃO é pagamento, maquininha nem tag de pagamento. Nunca diga "soluções de pagamentos".
Venda atual: cartão virtual. Gestão financeira só se o admin pedir lançamento.

Ações do sistema só com comando claro:
• lançar despesa/ganho R$ X descrição
• gerar código KING-NOME
• status / diagnóstico

Não diga que criou código/lançamento sem o sistema confirmar.
Áudio transcrito = texto. Respostas curtas.
'''


def http_node(nid, name, pos, params, extra=None):
    n = {
        'parameters': params,
        'id': nid,
        'name': name,
        'type': 'n8n-nodes-base.httpRequest',
        'typeVersion': 4.2,
        'position': pos,
        'onError': 'continueRegularOutput',
        'continueOnFail': True,
    }
    if extra:
        n.update(extra)
    return n


def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    nodes = json.loads(cur.execute('select nodes from workflow_entity where id=?', (MAIN,)).fetchone()[0])
    connections = json.loads(cur.execute('select connections from workflow_entity where id=?', (MAIN,)).fetchone()[0])
    settings = json.loads(cur.execute('select settings from workflow_entity where id=?', (MAIN,)).fetchone()[0] or '{}')
    name = cur.execute('select name from workflow_entity where id=?', (MAIN,)).fetchone()[0]

    # drop previous voice helper nodes if re-run
    drop = {'É Voz?', 'TG getFile', 'Baixar áudio', 'Whisper', 'Unir voz'}
    nodes = [n for n in nodes if n.get('name') not in drop]
    for k in list(connections.keys()):
        if k in drop:
            del connections[k]

    for n in nodes:
        nm = n.get('name')
        p = n.setdefault('parameters', {})
        if nm == 'Preparar (texto/voz)':
            p['jsCode'] = PREP_JS
            print('Preparar JSON-only')
        if nm == 'Formatar Cliente IA':
            p['jsCode'] = FMT_JS
            print('Formatar Cliente')
        if nm == 'Formatar Admin IA':
            p['jsCode'] = FMT_ADMIN_JS
            print('Formatar Admin')
        if nm == 'AI Agent Cliente':
            opts = p.setdefault('options', {})
            opts['systemMessage'] = SM_CLIENTE
            p['systemMessage'] = SM_CLIENTE
            print('SM cliente')
        if nm == 'AI Agent Admin':
            opts = p.setdefault('options', {})
            opts['systemMessage'] = SM_ADMIN
            p['systemMessage'] = SM_ADMIN
            print('SM admin')
        if nm in ('Memória Cliente', 'Memória Admin'):
            p['sessionIdType'] = 'customKey'
            p['sessionKey'] = '={{ $json.chatId }}'
            p['contextWindowLength'] = 6
            print('memory window', nm)

        # scrub leftover payment phrases in any remaining jsCode
        if 'jsCode' in p and 'soluções de pagamentos' in p['jsCode']:
            p['jsCode'] = p['jsCode'].replace('soluções de pagamentos', 'cartão virtual NFC')
        if 'jsCode' in p and 'PIX no cartão' in p['jsCode']:
            p['jsCode'] = p['jsCode'].replace(
                'PIX no cartão',
                'cartão virtual + NFC (NÃO é pagamento)',
            )

    nodes.extend([
        {
            'parameters': {
                'conditions': {
                    'options': {
                        'caseSensitive': True, 'leftValue': '',
                        'typeValidation': 'loose', 'version': 2,
                    },
                    'conditions': [{
                        'id': 'voz1',
                        'leftValue': '={{ $json.hadVoice }}',
                        'rightValue': True,
                        'operator': {'type': 'boolean', 'operation': 'true', 'singleValue': True},
                    }],
                    'combinator': 'and',
                },
                'options': {},
            },
            'id': 'ifVoz01',
            'name': 'É Voz?',
            'type': 'n8n-nodes-base.if',
            'typeVersion': 2.2,
            'position': [480, 304],
        },
        http_node('tgGetFile01', 'TG getFile', [480, 560], {
            'method': 'GET',
            'url': '=https://api.telegram.org/bot{{ $env.TELEGRAM_BOT_TOKEN }}/getFile',
            'sendQuery': True,
            'queryParameters': {'parameters': [
                {'name': 'file_id', 'value': '={{ $json.fileId }}'},
            ]},
            'options': {'timeout': 15000},
        }),
        http_node('tgDlAudio01', 'Baixar áudio', [720, 560], {
            'method': 'GET',
            'url': '=https://api.telegram.org/file/bot{{ $env.TELEGRAM_BOT_TOKEN }}/{{ $json.result.file_path }}',
            'options': {
                'timeout': 25000,
                'response': {'response': {'responseFormat': 'file'}},
            },
        }),
        http_node('whisper01', 'Whisper', [960, 560], {
            'method': 'POST',
            'url': 'https://api.openai.com/v1/audio/transcriptions',
            'sendHeaders': True,
            'headerParameters': {'parameters': [
                {'name': 'Authorization', 'value': '=Bearer {{ $env.OPENAI_API_KEY }}'},
            ]},
            'sendBody': True,
            'contentType': 'multipart-form-data',
            'bodyParameters': {'parameters': [
                {'name': 'model', 'value': 'whisper-1'},
                {'name': 'language', 'value': 'pt'},
                {'parameterType': 'formBinaryData', 'name': 'file', 'inputDataFieldName': 'data'},
            ]},
            'options': {'timeout': 45000},
        }),
        {
            'parameters': {'jsCode': UNIR_JS},
            'id': 'unirVoz01',
            'name': 'Unir voz',
            'type': 'n8n-nodes-base.code',
            'typeVersion': 2,
            'position': [1200, 560],
        },
    ])

    connections['Preparar (texto/voz)'] = {
        'main': [[{'node': 'É Voz?', 'type': 'main', 'index': 0}]]
    }
    connections['É Voz?'] = {
        'main': [
            [{'node': 'TG getFile', 'type': 'main', 'index': 0}],
            [{'node': 'É Admin?', 'type': 'main', 'index': 0}],
        ]
    }
    connections['TG getFile'] = {
        'main': [[{'node': 'Baixar áudio', 'type': 'main', 'index': 0}]]
    }
    connections['Baixar áudio'] = {
        'main': [[{'node': 'Whisper', 'type': 'main', 'index': 0}]]
    }
    connections['Whisper'] = {
        'main': [[{'node': 'Unir voz', 'type': 'main', 'index': 0}]]
    }
    connections['Unir voz'] = {
        'main': [[{'node': 'É Admin?', 'type': 'main', 'index': 0}]]
    }

    # wipe old chat memory (wrong finance/payments context)
    static = cur.execute('select staticData from workflow_entity where id=?', (MAIN,)).fetchone()[0]
    try:
        sd = json.loads(static or '{}')
    except Exception:
        sd = {}
    if isinstance(sd, dict):
        g = sd.get('global') or {}
        g['chats'] = {}
        sd['global'] = g
    static_s = json.dumps(sd, ensure_ascii=False)

    now = time.strftime('%Y-%m-%d %H:%M:%S.000')
    vid = str(uuid.uuid4())
    nodes_s = json.dumps(nodes, ensure_ascii=False)
    conn_s = json.dumps(connections, ensure_ascii=False)
    set_s = json.dumps(settings, ensure_ascii=False)
    cur.execute(
        '''UPDATE workflow_entity SET nodes=?, connections=?, settings=?, staticData=?,
           versionId=?, activeVersionId=?, active=1, updatedAt=?,
           versionCounter=COALESCE(versionCounter,0)+1 WHERE id=?''',
        (nodes_s, conn_s, set_s, static_s, vid, vid, now, MAIN),
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
    print('version', vid)
    print('nodes', [n['name'] for n in nodes])


if __name__ == '__main__':
    main()
