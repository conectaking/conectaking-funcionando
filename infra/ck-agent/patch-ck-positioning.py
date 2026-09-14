#!/usr/bin/env python3
"""Fix Conecta King positioning: virtual card + NFC, NOT payments."""
import json, os, sqlite3, time, uuid, re

DB = '/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'
MAIN = 'mkK244lveO0N1qPR'

SYSTEM_CLIENTE = r'''Você é o consultor comercial de elite do Adriano King (King) e da Conecta King.
Fale em português do Brasil, humano, caloroso e persuasivo — sem parecer robô.

## QUEM É O ADRIANO KING (RETRATISTA)
- Não é “só fotógrafo”: é retratista e artista da imagem.
- Extrai a essência das pessoas e coloca no retrato — o que está dentro vem para fora.
- Método: diálogo profundo (quem a pessoa quer ser na foto, o que quer transmitir, autoestima).
- Propósito: ajudar a libertar bloqueios e se ver com verdade e potência.
- Resultado: imagem que eterniza e conecta com o público do cliente.

## O QUE É A CONECTA KING (FOCO = CARTÃO VIRTUAL + NFC)
Adriano é CEO da Conecta King.

PRODUTO PRINCIPAL A VENDER AGORA:
- Cartão virtual / perfil digital + tecnologia NFC (pulseira/tag) + QR Code + link na bio.
- Objetivo: transmitir o cartão virtual de forma fácil e rápida (Android e iPhone) ao encostar via NFC — em cerca de 3 segundos.
- Une redes, WhatsApp, site, mentoria, livros, loja etc. em UM só lugar (organizado, com banners).

O QUE NÃO É (NÃO DIGA ISSO):
- NÃO é foco em pagamentos / maquininha / tag de pagamento.
- NÃO diga “soluções de pagamentos”.
- PIX no cartão, se existir, é recurso secundário — NÃO é o posicionamento de venda.

Site: https://www.conectaking.com.br
Tag: https://tag.conectaking.com.br/{slug}
Entrada comercial ~ R$ 35/mês (confirme no site se pedirem planos maiores).
Código de acesso: só o King/admin libera.

## COMO VENDER
1) Entenda a dor (links espalhados, sumiço de leads, retrato sem alma).
2) Empatia + solução certa (Retrato King e/ou Cartão Conecta King).
3) CTA claro (conhecer cartão / planos / conversa com o King).
4) Se pedirem humano: última linha ESCALATE:YES — senão ESCALATE:NO.

## REGRAS
- Nunca invente foco em pagamento.
- Se áudio falhar ([áudio recebido...]), peça texto.
- Respostas curtas/médias + CTA.
- Sempre termine com ESCALATE:YES ou ESCALATE:NO.
'''

FIX_SNIPPETS = [
    (r'solu[cç][oõ]es de pagamentos?', 'cartão virtual com NFC'),
    (r'focado em (solu[cç][oõ]es de )?pagamentos?', 'focado em cartão virtual e NFC'),
    (r'tag de pagamento', 'cartão virtual NFC'),
]


def scrub(text: str) -> str:
    if not text:
        return text
    out = text
    # explicit product paragraph replace if old KB present
    out = re.sub(
        r'(?i)pagamento[s]? / maquininha|solu[cç][oõ]es de pagamentos?|foco em pagamentos?',
        'cartão virtual + NFC (compartilhar perfil)',
        out,
    )
    for pat, rep in FIX_SNIPPETS:
        out = re.sub(pat, rep, out, flags=re.I)
    # reinforce if CONECTA KING section exists but still weak
    if 'CONECTA KING' in out.upper() and 'NÃO é foco em pagamentos' not in out and 'NÃO diga' not in out:
        out += (
            '\n\nCORREÇÃO OBRIGATÓRIA: Conecta King NÃO é foco em pagamentos. '
            'É cartão virtual + NFC para Android/iPhone transmitir o perfil rápido. '
            'Nunca diga “soluções de pagamentos”.'
        )
    return out


def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    nodes = json.loads(cur.execute('select nodes from workflow_entity where id=?', (MAIN,)).fetchone()[0])
    connections = json.loads(cur.execute('select connections from workflow_entity where id=?', (MAIN,)).fetchone()[0])
    settings = json.loads(cur.execute('select settings from workflow_entity where id=?', (MAIN,)).fetchone()[0] or '{}')
    name = cur.execute('select name from workflow_entity where id=?', (MAIN,)).fetchone()[0]

    for n in nodes:
        nm = n.get('name')
        p = n.setdefault('parameters', {})
        if nm == 'AI Agent Cliente':
            opts = p.setdefault('options', {})
            opts['systemMessage'] = SYSTEM_CLIENTE
            p['systemMessage'] = SYSTEM_CLIENTE
            print('replaced AI Agent Cliente systemMessage')
        if nm == 'AI Agent Admin':
            opts = p.setdefault('options', {})
            sm = opts.get('systemMessage') or p.get('systemMessage') or ''
            sm2 = scrub(sm)
            tip = (
                '\n\nPOSICIONAMENTO CONECTA KING (obrigatório): '
                'NÃO é pagamento. É cartão virtual + NFC (Android/iPhone) para transmitir o perfil fácil e rápido. '
                'Nunca diga “soluções de pagamentos”.'
            )
            if 'NÃO é pagamento' not in sm2:
                sm2 = sm2 + tip
            opts['systemMessage'] = sm2
            p['systemMessage'] = sm2
            print('patched AI Agent Admin')
        if nm == 'Executar Admin':
            code = p.get('jsCode', '')
            code2 = scrub(code)
            # harden KB string inside code
            if 'PIX no cartão' in code2 and 'NÃO é foco em pagamentos' not in code2:
                code2 = code2.replace(
                    'PIX no cartão',
                    'Cartão virtual + NFC (NÃO é foco em pagamentos; PIX se houver é secundário)',
                )
            if code2 != code:
                p['jsCode'] = code2
                print('scrubbed Executar Admin KB')

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
