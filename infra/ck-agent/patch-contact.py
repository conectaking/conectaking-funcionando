#!/usr/bin/env python3
"""Add Adriano King Instagram + WhatsApp to agent knowledge."""
import json, os, sqlite3, time, uuid

DB = '/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'
MAIN = 'mkK244lveO0N1qPR'

CONTACT = '''
CONTATO DO KING (sempre que pedirem Instagram, WhatsApp, telefone, contato, falar com o King):
- Instagram: @adrianokingg — https://www.instagram.com/adrianokingg
- WhatsApp: +55 11 98878-9417 (11988789417)
Passe esses dados com clareza. Não invente outro @ ou número.
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

CONTATO DO KING (sempre que pedirem Instagram, WhatsApp, telefone, contato, falar com o King):
- Instagram: @adrianokingg — https://www.instagram.com/adrianokingg
- WhatsApp: +55 11 98878-9417 (11988789417)
Passe esses dados com clareza. Não invente outro @ ou número.

Site: https://www.conectaking.com.br
Tag: https://tag.conectaking.com.br/{slug}
Entrada ~ R$ 35/mês (confirme planos maiores no site).
Código de acesso: só o King libera.

CTA claro. Se pedirem humano, dê Instagram e WhatsApp e termine com ESCALATE:YES. Senão: ESCALATE:NO.
Se a mensagem for [áudio recebido...], peça o texto.
'''

SM_ADMIN = '''Você é o Assistente Executivo do Adriano King no Telegram (admin). PT-BR, direto.

Adriano: retratista (essência no retrato) e CEO da Conecta King.
Conecta King: CARTÃO VIRTUAL + NFC (Android/iPhone) para transmitir o perfil rápido.
NÃO é pagamento, maquininha nem tag de pagamento. Nunca diga "soluções de pagamentos".
Venda atual: cartão virtual. Gestão financeira só se o admin pedir lançamento.

CONTATO PÚBLICO (para passar a clientes / usar em respostas):
- Instagram: @adrianokingg — https://www.instagram.com/adrianokingg
- WhatsApp: +55 11 98878-9417 (11988789417)

Ações do sistema só com comando claro:
• lançar despesa/ganho R$ X descrição
• gerar código KING-NOME
• status / diagnóstico

Não diga que criou código/lançamento sem o sistema confirmar.
Áudio transcrito = texto. Respostas curtas.
'''


def upsert(cur, nodes, connections, settings, name):
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
    print('version', vid)


def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    row = cur.execute('select nodes, connections, settings, name from workflow_entity where id=?', (MAIN,)).fetchone()
    nodes = json.loads(row[0])
    connections = json.loads(row[1])
    settings = json.loads(row[2] or '{}')
    name = row[3]

    for n in nodes:
        nm = n.get('name')
        p = n.setdefault('parameters', {})
        if nm == 'AI Agent Cliente':
            opts = p.setdefault('options', {})
            opts['systemMessage'] = SM_CLIENTE
            p['systemMessage'] = SM_CLIENTE
            print('patched cliente')
        if nm == 'AI Agent Admin':
            opts = p.setdefault('options', {})
            opts['systemMessage'] = SM_ADMIN
            p['systemMessage'] = SM_ADMIN
            print('patched admin')
        if 'jsCode' in p:
            code = p['jsCode']
            if 'Instagram: https://www.instagram.com/conectaking' in code:
                code = code.replace(
                    'Instagram: https://www.instagram.com/conectaking',
                    'Instagram do King: @adrianokingg https://www.instagram.com/adrianokingg | WhatsApp: 11988789417',
                )
                p['jsCode'] = code
                print('patched js', nm)
            elif 'CONHECIMENTO CONECTA KING' in code and '@adrianokingg' not in code:
                needle = 'Instagram: https://www.instagram.com/conectaking'
                extra = '\\n- Instagram King: @adrianokingg (https://www.instagram.com/adrianokingg)\\n- WhatsApp King: 11988789417'
                if 'Código de PULSEIRA' in code and extra.strip() not in code:
                    p['jsCode'] = code.replace(
                        '- Instagram: https://www.instagram.com/conectaking',
                        '- Instagram King: @adrianokingg https://www.instagram.com/adrianokingg\\n- WhatsApp King: 11988789417',
                    )
                    if p['jsCode'] == code:
                        # insert before closing backtick of KB if possible
                        p['jsCode'] = code.replace(
                            'só admin configura no usuário.',
                            'só admin configura no usuário.\\n- Instagram King: @adrianokingg https://www.instagram.com/adrianokingg\\n- WhatsApp King: 11988789417',
                        )
                    print('kb patched', nm)

    upsert(cur, nodes, connections, settings, name)
    conn.commit()
    conn.close()
    try:
        os.chown(DB, 1000, 1000)
    except Exception:
        pass
    print('DONE')


if __name__ == '__main__':
    main()
