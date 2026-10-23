<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Músicas da Sara • Charlene Alexa</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0b0f19;
            --card: #151b2b;
            --card-border: #232d42;
            --primary: #8b5cf6;
            --primary-hover: #7c3aed;
            --accent: #ec4899;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --danger: #ef4444;
            --success: #10b981;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Plus Jakarta Sans', sans-serif;
        }

        body {
            background-color: var(--bg);
            color: var(--text);
            min-height: 100vh;
            padding: 24px 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .container {
            width: 100%;
            max-width: 680px;
        }

        .header {
            text-align: center;
            margin-bottom: 28px;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(139, 92, 246, 0.15);
            color: #c4b5fd;
            border: 1px solid rgba(139, 92, 246, 0.3);
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 12px;
        }

        h1 {
            font-size: 2rem;
            font-weight: 800;
            background: linear-gradient(135deg, #f472b6, #c084fc, #60a5fa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
        }

        .subtitle {
            color: var(--text-muted);
            font-size: 0.95rem;
        }

        .alexa-hint {
            background: rgba(236, 72, 153, 0.08);
            border: 1px solid rgba(236, 72, 153, 0.2);
            border-radius: 12px;
            padding: 12px 16px;
            margin-bottom: 24px;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 10px;
            color: #fbcfe8;
        }

        .upload-card {
            background: var(--card);
            border: 2px dashed var(--card-border);
            border-radius: 16px;
            padding: 32px 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: 24px;
        }

        .upload-card:hover, .upload-card.dragover {
            border-color: var(--primary);
            background: rgba(139, 92, 246, 0.05);
        }

        .upload-icon {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }

        .upload-btn {
            background: linear-gradient(135deg, var(--primary), var(--accent));
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 10px;
            font-weight: 700;
            cursor: pointer;
            margin-top: 14px;
            display: inline-block;
            transition: transform 0.15s ease;
        }

        .upload-btn:active {
            transform: scale(0.98);
        }

        .playlist-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 14px;
        }

        .playlist-header h2 {
            font-size: 1.25rem;
            font-weight: 700;
        }

        .playlist-count {
            color: var(--text-muted);
            font-size: 0.85rem;
        }

        .song-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .song-item {
            background: var(--card);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            transition: border-color 0.2s;
        }

        .song-item:hover {
            border-color: #3b4866;
        }

        .song-info {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
            flex: 1;
        }

        .song-icon {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: rgba(139, 92, 246, 0.2);
            color: #c4b5fd;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.1rem;
            flex-shrink: 0;
        }

        .song-name {
            font-size: 0.95rem;
            font-weight: 600;
            color: var(--text);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .song-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }

        audio {
            height: 32px;
            max-width: 200px;
        }

        .del-btn {
            background: rgba(239, 68, 68, 0.15);
            color: #fca5a5;
            border: 1px solid rgba(239, 68, 68, 0.3);
            padding: 6px 10px;
            border-radius: 8px;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s;
        }

        .del-btn:hover {
            background: var(--danger);
            color: white;
        }

        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-muted);
            background: var(--card);
            border-radius: 12px;
            border: 1px solid var(--card-border);
        }

        #progressContainer {
            display: none;
            margin-top: 14px;
        }

        .progress-bar {
            width: 100%;
            height: 6px;
            background: #232d42;
            border-radius: 999px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--primary), var(--accent));
            width: 0%;
            transition: width 0.2s;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="badge">👑 Conecta King • Alexa Skill Charlene</div>
            <h1>Músicas da Sarah</h1>
            <p class="subtitle">Adicione ou remova louvores e canções que tocam na Alexa da Sarah</p>
        </div>

        <div class="alexa-hint">
            <span>🗣️</span>
            <div><strong>Comando de Voz na Alexa:</strong> Diga <em>"Alexa, chama a Charlene e toca as músicas da Sarah"</em>.</div>
        </div>

        <div class="upload-card" id="dropZone" onclick="document.getElementById('fileInput').click()">
            <div class="upload-icon">🎵</div>
            <p style="font-weight: 700; font-size: 1.05rem;">Arraste arquivos de música (MP3) aqui</p>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 4px;">ou clique para selecionar do computador/celular</p>
            <input type="file" id="fileInput" accept="audio/*" multiple style="display: none;">
            <button class="upload-btn" type="button">Escolher Músicas</button>
            <div id="progressContainer">
                <p id="progressText" style="font-size: 0.85rem; color: #c4b5fd; margin-bottom: 6px;">Enviando...</p>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
            </div>
        </div>

        <div class="playlist-header">
            <h2>Playlist Atual</h2>
            <span class="playlist-count" id="songCount">{{ count($musicas) }} música(s)</span>
        </div>

        <div class="song-list" id="songList">
            @forelse($musicas as $song)
                <div class="song-item" id="song-{{ md5($song) }}">
                    <div class="song-info">
                        <div class="song-icon">🎶</div>
                        <div class="song-name" title="{{ $song }}">{{ $song }}</div>
                    </div>
                    <div class="song-actions">
                        <audio controls preload="none">
                            <source src="{{ $baseUrl . rawurlencode($song) }}" type="audio/mpeg">
                        </audio>
                        <button class="del-btn" onclick="deleteSong('{{ addslashes($song) }}')">Remover</button>
                    </div>
                </div>
            @empty
                <div class="empty-state" id="emptyState">
                    Nenhuma música adicionada ainda. Arraste arquivos MP3 acima para começar!
                </div>
            @endforelse
        </div>
    </div>

    <script>
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const progressContainer = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        ['dragenter', 'dragover'].forEach(name => {
            dropZone.addEventListener(name, (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(name => {
            dropZone.addEventListener(name, (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length) uploadFiles(files);
        });

        fileInput.addEventListener('change', (e) => {
            if (fileInput.files.length) uploadFiles(fileInput.files);
        });

        async function uploadFiles(files) {
            progressContainer.style.display = 'block';
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                progressText.innerText = `Enviando (${i + 1}/${files.length}): ${file.name}`;
                progressFill.style.width = `${Math.round(((i + 1) / files.length) * 100)}%`;

                const formData = new FormData();
                formData.append('audio', file);

                try {
                    const res = await fetch('/api/alexa/charlene/upload', {
                        method: 'POST',
                        body: formData
                    });
                    const json = await res.json();
                    if (!json.success) {
                        alert(`Erro ao enviar ${file.name}: ` + json.message);
                    }
                } catch (err) {
                    alert('Erro de conexão ao enviar: ' + file.name);
                }
            }
            progressText.innerText = 'Upload concluído com sucesso!';
            setTimeout(() => {
                location.reload();
            }, 800);
        }

        async function deleteSong(filename) {
            if (!confirm(`Deseja remover "${filename}" da playlist da Sara?`)) return;

            try {
                const res = await fetch('/api/alexa/charlene/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename })
                });
                const json = await res.json();
                if (json.success) {
                    location.reload();
                } else {
                    alert('Erro: ' + json.message);
                }
            } catch (err) {
                alert('Erro de conexão.');
            }
        }
    </script>
</body>
</html>
