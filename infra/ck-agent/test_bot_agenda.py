#!/usr/bin/env python3
import json, os, urllib.request

OPENAI_KEY = os.environ.get('OPENAI_API_KEY')
if not OPENAI_KEY:
    # Ler do .env do ck-agent
    with open('/opt/ck-agent/.env') as f:
        for line in f:
            if line.startswith('OPENAI_API_KEY='):
                OPENAI_KEY = line.strip().split('=', 1)[1].strip("'\"")
                break

print(f"OpenAI Key loaded: {OPENAI_KEY[:8]}...")

# 1. Testar pergunta do Adriano King sobre Google Agenda
payload = {
    "model": "gpt-4o-mini",
    "temperature": 0.1,
    "messages": [
        {
            "role": "system",
            "content": """Você é o King Assistente, Assistente Executivo Pessoal e CFO de Elite do Adriano King.
Você atende exclusivamente o Adriano King no Telegram.
Tom de voz: executivo de alto nível, direto, dinâmico, solícito, confiante e resolutivo. Sem respostas robóticas ou burocráticas.

Data e hora atual de Brasília: Quarta-feira, 23/09/2026 (2026-09-23) às 13:50. Fuso: America/Sao_Paulo.
Ano de referência obrigatório: 2026.

1. AGENDA, LEMBRETES & GOOGLE AGENDA:
   - Você é o assistente pessoal que cuida da agenda e dos lembretes do Adriano King.
   - Se o Adriano perguntar se você consegue agendar no Google Agenda ou mandar lembretes, responda afirmativamente e com entusiasmo, explicando que ele pode mandar por áudio ou texto, que você gera o link direto de 1 toque para o Google Agenda com notificação e também o avisa aqui no Telegram!"""
        },
        {
            "role": "user",
            "content": "Deixa eu te perguntar você também consegue agendar qualquer coisa para mim no meu Google agenda se eu pedir para me lembrar aí chegou aviso consegue me avisar algum lembrete que eu pedi"
        }
    ]
}

req = urllib.request.Request(
    'https://api.openai.com/v1/chat/completions',
    headers={'Authorization': f'Bearer {OPENAI_KEY}', 'Content-Type': 'application/json'},
    data=json.dumps(payload).encode('utf-8')
)
with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    print("\nRESPOSTA DO BOT:")
    print(res['choices'][0]['message']['content'])

# 2. Testar chamada de Tool manage_agenda
tools = [
    {
        "type": "function",
        "function": {
            "name": "manage_agenda",
            "description": "Gerencia agenda e lembretes",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {"type": "string", "enum": ["create_event", "create_reminder", "list_agenda", "delete_agenda"]},
                    "titulo": {"type": "string"},
                    "data": {"type": "string"},
                    "hora_inicio": {"type": "string"},
                    "hora_fim": {"type": "string"},
                    "descricao": {"type": "string"},
                    "local": {"type": "string"},
                    "tipo": {"type": "string"}
                },
                "required": ["action"]
            }
        }
    }
]

payload2 = {
    "model": "gpt-4o-mini",
    "temperature": 0.1,
    "tools": tools,
    "messages": [
        {
            "role": "system",
            "content": "Você é o King Assistente. Data de hoje: 2026-09-23 (Quarta-feira). Use a tool manage_agenda."
        },
        {
            "role": "user",
            "content": "Agenda um ensaio com a Larissa amanhã das 14h às 16h no estúdio"
        }
    ]
}

req2 = urllib.request.Request(
    'https://api.openai.com/v1/chat/completions',
    headers={'Authorization': f'Bearer {OPENAI_KEY}', 'Content-Type': 'application/json'},
    data=json.dumps(payload2).encode('utf-8')
)
with urllib.request.urlopen(req2) as resp2:
    res2 = json.loads(resp2.read().decode('utf-8'))
    print("\nCHAMADA DE TOOL (AGENDA):")
    tool_call = res2['choices'][0]['message'].get('tool_calls', [{}])[0]
    print(tool_call.get('function', {}))
