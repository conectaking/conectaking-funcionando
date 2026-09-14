#!/usr/bin/env python3
"""Fix finance profile_id + ganho=INCOME. n8n STOPPED."""
import json, os, sqlite3, time, uuid, subprocess

DB = '/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'
MAIN = 'mkK244lveO0N1qPR'

INTENT_JS = r'''const text = String($json.text || '').trim();
const hadVoice = !!$json.hadVoice;
const voiceError = String($json.voiceError || '').trim();
let intent = 'chat';

const isVoiceFail = hadVoice && (!!voiceError || /^\[áudio recebido/i.test(text));
if (isVoiceFail) {
  return [{ json: { ...$json, intent: 'chat', amount: null, type: null, status: null, description: text, customCode: '', transactionDate: new Date().toISOString().slice(0, 10) } }];
}

const wantsFinance = (/lan[cç]ar|despesa|gasto|\bpaguei\b|\brecebi\b|\bcomprei\b|\bganho\b|\blucro\b|\breceita\b|contas?\s+para\s+pagar|lan[cç]amento|gest[aã]o\s+financeira/i.test(text)
  && /(r\$\s*\d+|\d+[.,]\d{2}|\b\d{1,6}\s*reais?\b|\b\d{1,6}\b)/i.test(text))
  || (/r\$\s*\d+/i.test(text) && /despesa|gasto|receita|pagar|lan[cç]ar|ganho|lucro/i.test(text));

const wantsCode = /(?:gerar|criar|gera|crie|faz(?:er)?)\s+(?:um\s+)?c[oó]digo/i.test(text)
  || /\bc[oó]digo\s+(?:de\s+)?(?:registro|convite|manual|ativa)/i.test(text)
  || /\bKING-[A-Z0-9]{2,30}\b/i.test(text);

const wantsDiag = /\b(diagn[oó]stico|health|status\s+do\s+site|site\s+caiu|\/status)\b/i.test(text)
  || /^(status|diagn[oó]stico)$/i.test(text);

if (wantsFinance) intent = 'finance';
else if (wantsCode) intent = 'code';
else if (wantsDiag) intent = 'diag';

let amount = null;
const am = text.match(/r\$\s*(\d+[.,]?\d*)/i)
  || text.match(/(\d+[.,]\d{2})/)
  || text.match(/\b(\d{1,6})\s*reais?\b/i)
  || (intent === 'finance' ? text.match(/\b(\d{1,6})\b/) : null);
if (am) amount = parseFloat(String(am[1]).replace(',', '.'));

// ganho/lucro/receita/recebi = INCOME; default EXPENSE
let type = /\b(ganho|lucro|receita|recebi|entrou|ganhei|entrada)\b/i.test(text) ? 'INCOME' : 'EXPENSE';
let status = /\bpaguei\b|\bpago\b|j[aá]\s*paguei|j[aá]\s*recebi/i.test(text) ? 'PAID' : 'PENDING';
let description = text.replace(/r\$\s*\d+[.,]?\d*/ig, '').replace(/\s+/g, ' ').trim().slice(0, 180) || 'Lançamento via Telegram';

let customCode = '';
const cm = text.match(/\b(KING-[A-Z0-9]{2,30})\b/i)
  || text.match(/(?:gerar|criar|gera|crie)\s+c[oó]digo\s+([A-Z0-9][-_A-Z0-9]{2,30})/i);
if (cm) customCode = String(cm[1]).replace(/\s+/g, '').toUpperCase().slice(0, 32);

const today = new Date().toISOString().slice(0, 10);
return [{ json: { ...$json, intent, amount, type, status, description, customCode, transactionDate: today } }];
'''


def patch_executar_admin(code: str) -> str:
    """Inject profile_id resolution before finance POST."""
    needle = "if (intent === 'finance')"
    if "resolveFinanceProfileId" in code:
        print('Executar Admin already has profile resolver')
        # still replace intent finance block if old
    helper = r'''
async function resolveFinanceProfileId() {
  try {
    const r = await ck.call(this, 'GET', '/api/finance/profiles');
    const list = (r.body && (r.body.data || r.body.profiles || r.body)) || [];
    const arr = Array.isArray(list) ? list : [];
    const primary = arr.find((p) => p && (p.is_primary === true || p.isPrimary === true));
    const active = arr.find((p) => p && (p.is_active !== false && p.isActive !== false));
    const pick = primary || active || arr[0];
    return pick ? Number(pick.id) : null;
  } catch (_) {
    return null;
  }
}
'''
    if 'resolveFinanceProfileId' not in code:
        # insert after ck() function
        marker = 'async function ck(method, path, body) {'
        idx = code.find(marker)
        if idx < 0:
            raise SystemExit('ck() not found')
        # find end of ck function - next async function or function memory
        end = code.find('function memory()', idx)
        if end < 0:
            end = code.find('async function openaiChat', idx)
        code = code[:end] + helper + '\n' + code[end:]

    # Replace finance body construction - find body = { type:
    # Look for typical finance block
    import re
    # Ensure body includes profile_id
    if "profile_id: profileId" in code or "profile_id: await" in code:
        print('profile_id already in body?')
    else:
        # patch the body object in finance intent
        old = None
        m = re.search(r"const body = \{([^}]+)\};", code)
        # might be multi-line
        m = re.search(r"const body = \{[\s\S]*?\n\s*\};", code)
        if not m:
            # try find finance POST area
            print('body object not found via regex, doing string replace on known fields')
            if "transaction_date: prev.transactionDate" in code and "profile_id" not in code.split("transaction_date: prev.transactionDate")[1][:200]:
                code = code.replace(
                    "transaction_date: prev.transactionDate",
                    "transaction_date: prev.transactionDate,\n        profile_id: profileId",
                    1,
                )
                # add profileId const before body
                code = code.replace(
                    "if (intent === 'finance') {",
                    "if (intent === 'finance') {\n    const profileId = await resolveFinanceProfileId.call(this);",
                    1,
                )
            else:
                # broader: before POST finance
                code = code.replace(
                    "POST', '/api/finance/transactions', body)",
                    "POST', '/api/finance/transactions', Object.assign({}, body, profileId ? { profile_id: profileId } : {}))",
                    1,
                )
                if "const profileId = await resolveFinanceProfileId" not in code:
                    code = code.replace(
                        "if (intent === 'finance') {",
                        "if (intent === 'finance') {\n    const profileId = await resolveFinanceProfileId.call(this);",
                        1,
                    )
        else:
            block = m.group(0)
            if 'profile_id' not in block:
                new_block = block.replace('};', ',\n        profile_id: profileId\n      };', 1)
                code = code.replace(block, new_block, 1)
            if "const profileId = await resolveFinanceProfileId" not in code:
                code = code.replace(
                    "if (intent === 'finance') {",
                    "if (intent === 'finance') {\n    const profileId = await resolveFinanceProfileId.call(this);",
                    1,
                )
    return code


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
            print('patched Intent')
        if n.get('name') == 'Executar Admin':
            n['parameters']['jsCode'] = patch_executar_admin(n['parameters']['jsCode'])
            print('patched Executar Admin')
            # verify
            c = n['parameters']['jsCode']
            print('has resolveFinanceProfileId', 'resolveFinanceProfileId' in c)
            print('has profileId assign', 'const profileId = await resolveFinanceProfileId' in c)

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

    # Fix DB rows so they appear in selected profile
    sql = r'''
UPDATE finance_profiles SET is_primary = TRUE, name = 'Adriano King' WHERE id = 1 AND user_id = 'seed-admin-FNpGSFmV2bHm';
UPDATE finance_transactions SET profile_id = 1 WHERE user_id = 'seed-admin-FNpGSFmV2bHm' AND profile_id IS NULL AND id = 7;
UPDATE finance_transactions SET type = 'INCOME', description = 'Ganho via Telegram (corrigido)' WHERE id = 7;
DELETE FROM finance_transactions WHERE user_id = 'seed-admin-FNpGSFmV2bHm' AND id IN (4,5,6);
SELECT id, profile_id, type, amount, left(description,50), transaction_date FROM finance_transactions ORDER BY id;
'''
    open('/tmp/fix-finance.sql', 'w').write(sql)
    print('sql written')


if __name__ == '__main__':
    main()
