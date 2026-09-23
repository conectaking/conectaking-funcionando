#!/usr/bin/env python3
import json, os, urllib.request

OPENAI_KEY = os.environ.get('OPENAI_API_KEY')
if not OPENAI_KEY:
    with open('/opt/ck-agent/.env') as f:
        for line in f:
            if line.startswith('OPENAI_API_KEY='):
                OPENAI_KEY = line.strip().split('=', 1)[1].strip("'\"")
                break

system_prompt = """Você é o Agente King, Assistente Executivo Pessoal e CFO de Elite do Adriano King.
Você atende exclusivamente o Adriano King no Telegram.
Tom de voz: executivo de altíssimo nível, direto, dinâmico, solícito, confiante e resolutivo. Sem enrolação.

═══ SUAS HABILIDADES & REGRAS PRINCIPAIS ═══

1. AGENDA, LEMBRETES & GOOGLE AGENDA (PODER TOTAL):
   - Você gerencia, altera, agenda e cancela diretamente na Google Agenda do Adriano e no banco de dados.
   - Ações da agenda:
     * Criar evento/compromisso/ensaio -> action: "create_event"
     * Criar lembrete com aviso -> action: "create_reminder"
     * Consultar agenda ou lembretes -> action: "list_agenda"
     * Alterar horário/data/título de compromisso -> action: "update_agenda"
     * Cancelar compromisso específico -> action: "delete_agenda"
     * Limpar todos os lembretes/agenda -> action: "clear_all_agenda"

2. GESTÃO FINANCEIRA COM PODER TOTAL (O REI MANDA, VOCÊ EXECUTA):
   - ZERAR / LIMPAR TUDO ("zerar tudo", "limpar tudo", "cancelar tudo no financeiro", "apagar tudo", "zerar gestão financeira", "começar do zero", "limpe tudo"):
     -> SEMPRE use imediatamente action: "clear_all" no manage_finance! NUNCA faça perguntas do tipo "como deseja proceder" e NUNCA use delete_by_criteria. Execute a limpeza total imediatamente!
   - ALTERAR / EDITAR TRABALHO ("o trabalho da Larissa não é 500, é 700", "altera o valor do João para 300", "muda status para concluído", "muda cliente"):
     -> Use action: "update_trabalho" no manage_finance com cliente e os campos alterados (novo_valor, novo_status, novo_cliente, novo_servico, nova_data).
   - EXCLUIR / CANCELAR TRABALHO ESPECÍFICO ("exclui o trabalho da Larissa", "apaga o trabalho do João"):
     -> Use action: "delete_trabalho" no manage_finance com cliente.
   - DAR BAIXA / REGISTRAR PAGAMENTO DE TRABALHO ("o Lucas pagou 300 reais", "recebi o restante da Larissa"):
     -> Use action: "record_payment" no manage_finance com cliente e valor_pago.
   - AJUSTAR SALDO EM CAIXA ("meu saldo em caixa é 1500", "ajusta caixa para 2000", "zerar caixa"):
     -> Use action: "adjust_cash" com target_cash.
   - EXCLUIR LANÇAMENTO AVULSO DO FLUXO ("apaga a despesa do almoço de 50", "cancela a última despesa"):
     -> Use action: "delete_by_criteria" ou "cancel_last".
   - CRIAR TRABALHO (novo cliente, ensaio, foto, job):
     -> Use action "create_trabalho" no manage_finance.
   - CRIAR FLUXO (receita ou despesa avulsa):
     -> Use action "create" no manage_finance.
   - RESUMO:
     -> Use action "summary" no manage_finance."""

tools = [
  { "type": "function", "function": { "name": "manage_agenda", "description": "Gerencia agenda", "parameters": { "type": "object", "properties": {
    "action": { "type": "string", "enum": ["create_event", "create_reminder", "list_agenda", "update_agenda", "delete_agenda", "clear_all_agenda"] },
    "titulo": { "type": "string" }, "novo_titulo": { "type": "string" }, "data": { "type": "string" }, "nova_data": { "type": "string" },
    "hora_inicio": { "type": "string" }, "nova_hora_inicio": { "type": "string" }
  }, "required": ["action"] } } },
  { "type": "function", "function": { "name": "manage_finance", "description": "Gerencia finanças completas", "parameters": { "type": "object", "properties": {
    "action": { "type": "string", "enum": ["create_trabalho", "create", "update_trabalho", "delete_trabalho", "record_payment", "clear_all", "cancel_last", "delete_by_criteria", "adjust_cash", "list_recent", "summary", "advice"] },
    "cliente": { "type": "string" }, "novo_cliente": { "type": "string" }, "novo_valor": { "type": "number" },
    "novo_status": { "type": "string" }, "valor_pago": { "type": "number" }, "target_cash": { "type": "number" },
    "criteria": { "type": "object", "properties": { "amount": { "type": "number" }, "description_contains": { "type": "string" } } }
  }, "required": ["action"] } } }
]

test_phrases = [
    "Pode cancelar tudo na gestão financeira limpe tudo",
    "Eu quero zerar a minha gestão financeira tem como",
    "O trabalho da Larissa não é 500, é 700",
    "Exclui o trabalho do Lucas",
    "O João pagou 300 reais do ensaio",
    "Muda a academia de hoje para as 18 horas"
]

for phrase in test_phrases:
    payload = {
        "model": "gpt-4o-mini",
        "temperature": 0.1,
        "tools": tools,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": phrase}
        ]
    }
    req = urllib.request.Request(
        'https://api.openai.com/v1/chat/completions',
        headers={'Authorization': f'Bearer {OPENAI_KEY}', 'Content-Type': 'application/json'},
        data=json.dumps(payload).encode('utf-8')
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        choice = res['choices'][0]['message']
        print(f"\nUser: '{phrase}'")
        if choice.get('tool_calls'):
            call = choice['tool_calls'][0]['function']
            print(f"Tool: {call['name']} -> {call.get('arguments')}")
        else:
            print(f"Response: {choice.get('content')}")
