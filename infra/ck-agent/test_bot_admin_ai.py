#!/usr/bin/env python3
import json, os, urllib.request

OPENAI_KEY = None
with open('/opt/ck-agent/.env') as f:
    for line in f:
        if line.startswith('OPENAI_API_KEY='):
            OPENAI_KEY = line.strip().split('=', 1)[1].strip("'\"")
            break

# Read SYSTEM_PROMPT and TOOLS from patch-king-master.py
with open('/opt/ck-agent/patch-king-master.py') as f:
    content = f.read()

# Extract SYSTEM_PROMPT
sp_start = content.find("const SYSTEM_PROMPT = `") + len("const SYSTEM_PROMPT = `")
sp_end = content.find("`;", sp_start)
system_prompt = content[sp_start:sp_end].replace("${KB}", "Plataforma Conecta King.")

# Extract TOOLS json
tools_start = content.find("const TOOLS = [") + len("const TOOLS = ")
tools_end = content.find("];\n\nlet outMessage", tools_start) + 1
# Since it's JS, let's parse via node
import subprocess
node_cmd = f"node -e \"const TOOLS = {content[tools_start:tools_end]}; console.log(JSON.stringify(TOOLS));\""
res = subprocess.check_output(node_cmd, shell=True).decode('utf-8')
tools = json.loads(res)

test_phrases = [
    "Deixa eu te perguntar uma coisa se eu te pedir para tu cadastrar o cliente eu te mandar o e-mail e senha você cadastra ele também nesse código que você acabou de fazer?",
    "Cadastra para mim o cliente carlos@gmail.com com a senha Carlos@123 no código KING-IEVN",
    "Quero renovar a tag do cliente comercial@lapidarpisos.com.br por 1 mês",
    "Muda a conta do cliente comercial@lapidarpisos.com.br para o plano King Prime",
    "Coloca o tema 'Fé Inabalável' no mês 10 dos devocionais"
]

print("=== TESTANDO INTELIGÊNCIA ARTIFICIAL DO AGENTE KING COM PODER TOTAL ===\n")
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
        print(f"👉 Mensagem do King: \"{phrase}\"")
        if choice.get('tool_calls'):
            call = choice['tool_calls'][0]['function']
            print(f"   ⚡ TOOL ACIONADA: {call['name']} -> {call.get('arguments')}\n")
        else:
            print(f"   💬 RESPOSTA: {choice.get('content')}\n")
