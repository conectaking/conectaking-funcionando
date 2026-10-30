import subprocess
import json

remote_script = """# -*- coding: utf-8 -*-
import sqlite3, json, uuid
from datetime import datetime

conn = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
c = conn.cursor()

workflow_id = "ckCharleneIA01"
workflow_name = "CK Agente Charlene IA — Alexa & Sarah"
project_id = "38exZ3CcqzZj3va8"
now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
version_id = str(uuid.uuid4())

system_prompt = (
    "Você é a Charlene, Agente de Inteligência Artificial cristã, mentora doce, afetuosa e superdotada da princesinha Sarah (filha do Adrian King e da Samara).\\n"
    "Pilares Fundamentais:\\n"
    "1. NEUROCIÊNCIA & DESENVOLVIMENTO INFANTIL (10 meses a 7 anos): Estimulação sináptica, expansão de QI, raciocínio rápido, calmaria do nervo vago com respirações suaves e exercícios psicomotores (bater palminhas, mão no coração).\\n"
    "2. HISTÓRIAS BÍBLICAS & PNL: Condução com riqueza de detalhes sensoriais e onomatopeias, reprogramação de identidade vitoriosa ('mente de Cristo, princesa sábia e forte') e honra/obediência incondicional ao papai Adrian King e mamãe Samara.\\n"
    "3. INTERCESSÃO PASTORAL & AUTORIDADE: Quando pedirem oração por terceiros (ex: Bispo Fernando, líderes, amigos, parentes enfermos), faça uma oração fervorosa de autoridade apostólica cobrindo com o Sangue de Jesus, declarando vitória e saúde, encerrando com toda a família dizendo 'Amém!'. (Não diga 'durma com os anjinhos' em intercessões).\\n"
    "4. ATIVAÇÃO DA SABEDORIA NOTURNA: Declaração de Provérbios e reprogramação mental antes de dormir baseada no livro 'Do Fracasso ao Legado'."
)

nodes = [
    {
        "id": "whCharlene01",
        "name": "Webhook Charlene IA",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "position": [100, 200],
        "parameters": {
            "path": "charlene-ia",
            "httpMethod": "POST",
            "responseMode": "responseNode",
            "options": {}
        },
        "webhookId": "ck-charlene-ia-wh"
    },
    {
        "id": "lmCharlene01",
        "name": "OpenAI Model Charlene",
        "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
        "typeVersion": 1.2,
        "position": [280, 420],
        "credentials": {
            "openAiApi": {
                "id": "ckOpenAiCred01",
                "name": "OpenAI Conecta King"
            }
        },
        "parameters": {
            "model": {
                "__rl": True,
                "mode": "list",
                "value": "gpt-4o-mini"
            },
            "options": {
                "temperature": 0.7
            }
        }
    },
    {
        "id": "memCharlene01",
        "name": "Memória Charlene",
        "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
        "typeVersion": 1.3,
        "position": [440, 420],
        "parameters": {
            "contextKey": "chat_history",
            "sessionKey": "={{ $json.body.sessionId || $json.body.userId || 'alexa_sarah_session' }}"
        }
    },
    {
        "id": "agentCharlene01",
        "name": "AI Agent Charlene IA",
        "type": "@n8n/n8n-nodes-langchain.agent",
        "typeVersion": 1.7,
        "position": [360, 200],
        "parameters": {
            "promptType": "define",
            "text": "={{ $json.body.message || $json.body.pergunta || $json.body.text || 'Olá Charlene' }}",
            "options": {
                "systemMessage": system_prompt
            }
        }
    },
    {
        "id": "respCharlene01",
        "name": "Responder Webhook",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1.1,
        "position": [620, 200],
        "parameters": {
            "options": {
                "responseBody": '={{ { "ok": true, "resposta": $json.output, "agente": "Charlene IA • Conecta King", "timestamp": new Date().toISOString() } }}'
            }
        }
    }
]

connections = {
    "Webhook Charlene IA": {
        "main": [
            [
                {
                    "node": "AI Agent Charlene IA",
                    "type": "main",
                    "index": 0
                }
            ]
        ]
    },
    "OpenAI Model Charlene": {
        "ai_languageModel": [
            [
                {
                    "node": "AI Agent Charlene IA",
                    "type": "ai_languageModel",
                    "index": 0
                }
            ]
        ]
    },
    "Memória Charlene": {
        "ai_memory": [
            [
                {
                    "node": "AI Agent Charlene IA",
                    "type": "ai_memory",
                    "index": 0
                }
            ]
        ]
    },
    "AI Agent Charlene IA": {
        "main": [
            [
                {
                    "node": "Responder Webhook",
                    "type": "main",
                    "index": 0
                }
            ]
        ]
    }
}

# Remove se já existia para recriar limpo
c.execute("DELETE FROM workflow_entity WHERE id=?", (workflow_id,))
c.execute("DELETE FROM shared_workflow WHERE workflowId=?", (workflow_id,))

# Insere na workflow_entity
c.execute(
    '''INSERT INTO workflow_entity (
        id, name, active, nodes, connections, settings, staticData, pinData,
        versionId, triggerCount, meta, parentFolderId, createdAt, updatedAt,
        isArchived, versionCounter, description, activeVersionId, nodeGroups, sourceWorkflowId
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
    (
        workflow_id,
        workflow_name,
        1,
        json.dumps(nodes),
        json.dumps(connections),
        json.dumps({"executionOrder": "v1"}),
        None,
        json.dumps({}),
        version_id,
        1,
        json.dumps({"templateCredsSetupCompleted": True}),
        None,
        now_str,
        now_str,
        0,
        1,
        "Agente de Inteligência Artificial da Charlene com Neurociência Infantil, Provérbios, Histórias Bíblicas e Intercessão Pastoral para a Sarah e Família King.",
        version_id,
        json.dumps([]),
        None
    )
)

# Insere na shared_workflow
c.execute(
    '''INSERT INTO shared_workflow (workflowId, projectId, role, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)''',
    (workflow_id, project_id, "workflow:owner", now_str, now_str)
)

conn.commit()
print("Workflow inserido com sucesso no SQLite do N8N!")

# Verifica
c.execute("SELECT id, name, active FROM workflow_entity WHERE id=?", (workflow_id,))
print("Verificado:", c.fetchone())
"""

proc = subprocess.run(["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", "python3"], input=remote_script.encode('utf-8'), capture_output=True)
print(proc.stdout.decode('utf-8', errors='replace'))
if proc.stderr:
    print("ERR:", proc.stderr.decode('utf-8', errors='replace'))
