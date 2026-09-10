<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Editar Convite — ConectaKing</title>
  <link rel="stylesheet" href="/vendor/fontawesome/css/all.min.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #111; color: #eee; min-height: 100vh; padding: 20px; }
    .layout { display: grid; grid-template-columns: 1fr 400px; gap: 24px; max-width: 1200px; margin: 0 auto; align-items: start; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
    .container { min-width: 0; }
    h1 { font-size: 1.5rem; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    .card { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .card h2 { font-size: 1rem; margin-bottom: 14px; color: #facc15; }
    label { display: block; font-size: 0.85rem; color: #aaa; margin-bottom: 4px; }
    input, select, textarea { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #444; background: #222; color: #fff; font-size: 1rem; margin-bottom: 12px; }
    textarea { min-height: 80px; resize: vertical; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; border: none; font-size: 0.95rem; }
    .btn-primary { background: #facc15; color: #000; }
    .btn-primary:hover { filter: brightness(1.1); }
    .btn-secondary { background: #333; color: #fff; }
    .err { background: rgba(239,68,68,.15); border: 1px solid #ef4444; color: #fecaca; padding: 12px; border-radius: 8px; margin-bottom: 16px; display: none; }
    .err.show { display: block; }
    .ok { background: rgba(34,197,94,.15); color: #86efac; padding: 12px; border-radius: 8px; margin-bottom: 16px; display: none; }
    .ok.show { display: block; }
    .stats { font-size: 0.9rem; color: #aaa; }
    .preview-link { word-break: break-all; font-size: 0.85rem; color: #facc15; }
    .upload-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
    .upload-row input[type="file"] { display: none; }
    .upload-row .file-info { font-size: 0.85rem; color: #888; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .preview-panel { position: sticky; top: 20px; background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 16px; }
    .preview-panel h3 { font-size: 1rem; margin-bottom: 12px; color: #facc15; }
    .preview-panel iframe { width: 100%; height: 560px; border: 1px solid #444; border-radius: 8px; background: #0a0a0a; }
    .preview-panel .preview-placeholder { height: 560px; display: flex; align-items: center; justify-content: center; color: #666; font-size: 0.9rem; border: 1px dashed #444; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="layout">
  <div class="container">
    <h1><i class="fas fa-envelope-open-text"></i> Editar Convite</h1>
    <div id="err" class="err"></div>
    <div id="ok" class="ok"></div>

    <p style="margin-bottom:20px">
      <button type="button" class="btn btn-primary" id="btn-save"><i class="fas fa-save"></i> Salvar convite</button>
      <a href="/dashboard" class="btn btn-secondary" style="margin-left:10px;text-decoration:none"><i class="fas fa-arrow-left"></i> Voltar</a>
    </p>

    <div class="card">
      <h2>Conteúdo principal</h2>
      <label>Título (ex.: CASAMENTO DE)</label>
      <input type="text" id="titulo" placeholder="CASAMENTO DE">
      <label>Nomes / Subtítulo</label>
      <input type="text" id="subtitulo" placeholder="Carlos & Fernanda">
      <label>Texto no envelope (ex.: Toque para abrir)</label>
      <input type="text" id="texto_abrir" placeholder="Toque para abrir">
      <label>Linha extra (opcional)</label>
      <textarea id="subtitulo_extra" placeholder="Temos o prazer de convidar..."></textarea>
    </div>

    <div class="card">
      <h2>Data e hora</h2>
      <div class="row">
        <div><label>Dia</label><input type="number" id="data_dia" min="1" max="31" placeholder="12"></div>
        <div><label>Mês (ex.: FEVEREIRO)</label><input type="text" id="data_mes" placeholder="FEVEREIRO"></div>
      </div>
      <div class="row">
        <div><label>Ano</label><input type="number" id="data_ano" min="2020" max="2030" placeholder="2026"></div>
        <div><label>Dia da semana (ex.: QUINTA-FEIRA)</label><input type="text" id="dia_semana" placeholder="QUINTA-FEIRA"></div>
      </div>
      <label>Hora (ex.: 11H30)</label>
      <input type="text" id="hora" placeholder="11H30">
    </div>

    <div class="card">
      <h2>Local</h2>
      <label>Nome do local</label>
      <input type="text" id="local_nome" placeholder="Salão de festas">
      <label>Endereço</label>
      <textarea id="local_endereco" placeholder="Rua, número, bairro, cidade"></textarea>
      <label>Link do Google Maps</label>
      <input type="url" id="local_maps_url" placeholder="https://maps.google.com/...">
      <label>Traje / Dress code</label>
      <input type="text" id="dress_code" placeholder="Traje esporte fino">
    </div>

    <div class="card">
      <h2>RSVP</h2>
      <label>URL do formulário ou lista (confirmar presença)</label>
      <input type="url" id="rsvp_url" placeholder="https://...">
      <label>Texto do botão</label>
      <input type="text" id="rsvp_label" placeholder="Confirmar presença">
    </div>

    <div class="card">
      <h2>Áudio e imagens</h2>
      <label><input type="checkbox" id="som_habilitado"> Habilitar som</label>
      <label>Áudio (importar do computador ou celular)</label>
      <div class="upload-row">
        <input type="file" id="file_audio" accept="audio/*,.mp3,.ogg,.wav,.m4a">
        <button type="button" class="btn btn-secondary" id="btn-import-audio"><i class="fas fa-upload"></i> Importar áudio</button>
        <span class="file-info" id="info_audio"></span>
      </div>
      <input type="hidden" id="audio_url">
      <label>Imagem do envelope</label>
      <div class="upload-row">
        <input type="file" id="file_envelope" accept="image/*">
        <button type="button" class="btn btn-secondary" id="btn-import-envelope"><i class="fas fa-upload"></i> Importar imagem</button>
        <span class="file-info" id="info_envelope"></span>
      </div>
      <input type="hidden" id="imagem_envelope_url">
      <label>Imagem do selo</label>
      <div class="upload-row">
        <input type="file" id="file_selo" accept="image/*">
        <button type="button" class="btn btn-secondary" id="btn-import-selo"><i class="fas fa-upload"></i> Importar imagem</button>
        <span class="file-info" id="info_selo"></span>
      </div>
      <input type="hidden" id="imagem_selo_url">
      <label>Imagem de fundo</label>
      <div class="upload-row">
        <input type="file" id="file_fundo" accept="image/*">
        <button type="button" class="btn btn-secondary" id="btn-import-fundo"><i class="fas fa-upload"></i> Importar imagem</button>
        <span class="file-info" id="info_fundo"></span>
      </div>
      <input type="hidden" id="imagem_fundo_url">
    </div>

    <div class="card">
      <h2>Aparência</h2>
      <div class="row">
        <div><label>Cor primária</label><input type="text" id="cor_primaria" placeholder="#8B4513"></div>
        <div><label>Cor secundária</label><input type="text" id="cor_secundaria" placeholder="#D2691E"></div>
      </div>
      <label>Tema</label>
      <select id="tema">
        <option value="classico">Clássico</option>
        <option value="minimalista">Minimalista</option>
        <option value="floral">Floral</option>
      </select>
    </div>

    <div class="card">
      <h2>Opções</h2>
      <label><input type="checkbox" id="mostrar_contagem_regressiva" checked> Mostrar contagem regressiva</label>
      <label><input type="checkbox" id="share_habilitado" checked> Botão compartilhar</label>
      <label><input type="checkbox" id="calendar_habilitado" checked> Adicionar ao calendário</label>
    </div>

    <div class="card">
      <h2>Texto da segunda página (opcional)</h2>
      <textarea id="texto_pagina_2" placeholder="Agradecimentos, versinho..."></textarea>
    </div>

    <div class="card">
      <h2>Preview e estatísticas</h2>
      <p class="stats">Visualizações: <strong id="view_count">0</strong> (últimos 7 dias: <strong id="views_7">0</strong>)</p>
      <p style="margin-top:10px">
        <button type="button" class="btn btn-secondary" id="btn-preview"><i class="fas fa-link"></i> Gerar link de preview</button>
        <button type="button" class="btn btn-secondary" id="btn-ver-preview" style="margin-left:8px" title="Atualiza o preview ao lado"><i class="fas fa-eye"></i> Ver preview</button>
      </p>
      <p class="preview-link" id="preview_url"></p>
    </div>
  </div>

  <div class="preview-panel">
    <h3><i class="fas fa-eye"></i> Preview do convite</h3>
    <div class="preview-placeholder" id="preview-placeholder">Gere o link de preview e clique em &quot;Ver preview&quot; para ver como está ficando.</div>
    <iframe id="preview-iframe" style="display:none" title="Preview do convite"></iframe>
  </div>
  </div>

      <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/js/pages/conviteEdit.js'])
</body>
</html>
