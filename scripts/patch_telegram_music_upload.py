import json
import subprocess

# 1. Obter workflow atual do container
res = subprocess.run(["ssh", "root@46.225.100.64", "cat /tmp/mkK244lveO0N1qPR.json"], capture_output=True, text=True, encoding="utf-8")
wf = json.loads(res.stdout)

nodes = wf[0]["nodes"]

# Atualizar Preparar (texto/voz)
for n in nodes:
    if n["name"] == "Preparar (texto/voz)":
        n["parameters"]["jsCode"] = """const raw = $input.first().json;
const msg = raw.message || {};
const adminId = String($env.ADMIN_TELEGRAM_ID || '0');
const senderId = String(msg.from?.id || '');
const chatId = String(msg.chat?.id || '');
const firstName = msg.from?.first_name || 'cliente';
const text = String(msg.text || msg.caption || '').trim();

// Checar se é arquivo de música (áudio do Telegram ou documento .mp3 / áudio)
const isAudioMusic = !!(msg.audio || (msg.document && (msg.document.mime_type?.startsWith('audio/') || msg.document.file_name?.toLowerCase().endsWith('.mp3'))));
const audioMusicFileId = msg.audio?.file_id || msg.document?.file_id || null;
const audioMusicFileName = msg.audio?.file_name || msg.audio?.title || msg.document?.file_name || 'musica_sarah.mp3';

const fileId = msg.voice?.file_id || (isAudioMusic ? null : msg.audio?.file_id) || msg.video_note?.file_id || null;
const hadVoice = !text && !!fileId && !isAudioMusic;

return [{ json: {
  adminId, senderId, chatId, firstName,
  text: text || (hadVoice ? '' : (isAudioMusic ? '[música para sarah]' : '[mensagem sem texto]')),
  hadVoice, fileId: fileId || '',
  voiceError: '',
  isAudioMusic, audioMusicFileId, audioMusicFileName
} }];
"""

# Atualizar Executar Admin
for n in nodes:
    if n["name"] == "Executar Admin":
        curCode = n["parameters"]["jsCode"]
        musicBlock = """// Interceptador de Música para Sarah
if (prev.isAudioMusic && prev.audioMusicFileId) {
  try {
    const uploadRes = await fetch(`${base}/api/alexa/charlene/upload-telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_id: prev.audioMusicFileId,
        file_name: prev.audioMusicFileName
      })
    });
    const upJson = await uploadRes.json();
    if (upJson && upJson.success) {
      return [{
        json: {
          ...prev,
          outMessage: `🎵 *Música adicionada à playlist da Sarah na Alexa!* ✅\\n\\nArquivo: *${upJson.filename || prev.audioMusicFileName}*\\n\\nJá está disponível para ouvir na Alexa:\\n🗣️ _"Alexa, chama a Charlene e toca as músicas da Sarah"_`
        }
      }];
    } else {
      return [{
        json: {
          ...prev,
          outMessage: `⚠️ Não consegui salvar a música da Sarah: ${(upJson && upJson.message) || 'Erro desconhecido'}`
        }
      }];
    }
  } catch (err) {
    return [{
      json: {
        ...prev,
        outMessage: `⚠️ Erro ao salvar música no servidor: ${err.message}`
      }
    }];
  }
}
"""
        # Adicionar logo no topo de Executar Admin
        if "// Interceptador de Música para Sarah" not in curCode:
            idx = curCode.find("async function ck(")
            if idx != -1:
                newCode = curCode[:idx] + musicBlock + "\n" + curCode[idx:]
                n["parameters"]["jsCode"] = newCode

# Salvar nodes atualizados no arquivo local
with open("scripts/patched_nodes.json", "w", encoding="utf-8") as f:
    json.dump(nodes, f, ensure_ascii=False)

# Enviar para VPS e atualizar SQLite diretamente
subprocess.run(["scp", "-O", "scripts/patched_nodes.json", "root@46.225.100.64:/tmp/patched_nodes.json"], check=True)

# Script para rodar no VPS
update_script = """import sqlite3, json

with open('/tmp/patched_nodes.json', 'r', encoding='utf-8') as f:
    nodes = json.load(f)

nodes_str = json.dumps(nodes, ensure_ascii=False)

conn = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
c = conn.cursor()
c.execute("UPDATE workflow_entity SET nodes = ? WHERE id = 'mkK244lveO0N1qPR'", (nodes_str,))
conn.commit()
conn.close()
print('SQLITE UPDATED SUCCESSFULLY!')
"""

with open("scripts/do_update.py", "w", encoding="utf-8") as f:
    f.write(update_script)

subprocess.run(["scp", "-O", "scripts/do_update.py", "root@46.225.100.64:/tmp/do_update.py"], check=True)
subprocess.run(["ssh", "root@46.225.100.64", "python3 /tmp/do_update.py && docker restart ck-agent-n8n"], check=True)
print("SUCCESS: Telegram Music Upload patched in n8n!")
