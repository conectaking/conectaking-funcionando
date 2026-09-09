<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Editar Convite — ConectaKing</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
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
      <a href="dashboard.html" class="btn btn-secondary" style="margin-left:10px;text-decoration:none"><i class="fas fa-arrow-left"></i> Voltar</a>
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

  <script src="config.js"></script>
  <script>
(function() {
  const API = (window.API_URL || window.API_BASE || 'https://www.conectaking.com.br').replace(/\/$/, '');
  const qs = new URLSearchParams(location.search);
  const itemId = qs.get('itemId');
  const token = localStorage.getItem('conectaKingToken');
  if (!token) {
    location.href = 'login.html?returnUrl=' + encodeURIComponent(location.href);
    return;
  }
  if (!itemId) {
    document.getElementById('err').textContent = 'Informe itemId na URL (conviteEdit.html?itemId=123)';
    document.getElementById('err').classList.add('show');
    return;
  }

  const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

  function showErr(msg) {
    const el = document.getElementById('err');
    el.textContent = msg || '';
    el.classList.toggle('show', !!msg);
    document.getElementById('ok').classList.remove('show');
  }
  function showOk(msg) {
    document.getElementById('ok').textContent = msg || 'Salvo!';
    document.getElementById('ok').classList.add('show');
    document.getElementById('err').classList.remove('show');
  }

  const fields = ['titulo','subtitulo','texto_abrir','subtitulo_extra','texto_pagina_2','data_dia','data_mes','data_ano','dia_semana','hora','local_nome','local_endereco','local_maps_url','dress_code','rsvp_url','rsvp_label','som_habilitado','audio_url','imagem_envelope_url','imagem_fundo_url','imagem_selo_url','cor_primaria','cor_secundaria','tema','mostrar_contagem_regressiva','share_habilitado','calendar_habilitado'];
  let lastPreviewUrl = '';

  function setFileInfo(id, url) {
    var el = document.getElementById(id);
    if (!el) return;
    if (url) {
      var name = url.split('/').pop().split('?')[0] || 'Arquivo carregado';
      el.textContent = name.length > 30 ? name.slice(0, 27) + '—' : name;
    } else el.textContent = '';
  }

  async function load() {
    try {
      const res = await fetch(API + '/api/convite/config/' + itemId, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showErr(data.message || 'Erro ao carregar'); return; }
      const c = data.data || data;
      fields.forEach(function(k) {
        const el = document.getElementById(k);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!c[k];
        else if (c[k] != null) el.value = c[k];
      });
      setFileInfo('info_audio', c.audio_url);
      setFileInfo('info_envelope', c.imagem_envelope_url);
      setFileInfo('info_selo', c.imagem_selo_url);
      setFileInfo('info_fundo', c.imagem_fundo_url);
      document.getElementById('view_count').textContent = c.view_count || 0;
      const statsRes = await fetch(API + '/api/convite/stats/' + itemId, { headers });
      const statsData = await statsRes.json().catch(() => ({}));
      if (statsData.data) {
        document.getElementById('view_count').textContent = statsData.data.view_count || 0;
        document.getElementById('views_7').textContent = statsData.data.views_last_7_days || 0;
      }
    } catch (e) {
      showErr('Falha ao carregar: ' + (e.message || ''));
    }
  }

  async function uploadImage(file, setUrl, setInfo) {
    var fd = new FormData();
    fd.append('image', file);
    var r = await fetch(API + '/api/upload/image', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
    var d = await r.json().catch(function() { return {}; });
    if (!r.ok) { showErr(d.message || 'Erro ao enviar imagem'); return; }
    var url = (d.url || d.imageUrl || d.data && d.data.url) || '';
    if (url) { setUrl(url); setInfo(url); showOk('Imagem enviada.'); }
  }
  async function uploadAudioFile(file, setUrl, setInfo) {
    var fd = new FormData();
    fd.append('file', file);
    var r = await fetch(API + '/api/convite/upload-audio', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
    var d = await r.json().catch(function() { return {}; });
    if (!r.ok) { showErr(d.message || (d.error && d.error.message) || 'Erro ao enviar áudio'); return; }
    var url = (d.data && d.data.url) || d.url || '';
    if (url) { setUrl(url); setInfo(url); showOk('Áudio enviado.'); }
  }
  function bindUpload(fileId, btnId, infoId, urlId, isAudio) {
    var fileEl = document.getElementById(fileId);
    var btn = document.getElementById(btnId);
    var urlEl = document.getElementById(urlId);
    if (!fileEl || !btn || !urlEl) return;
    btn.addEventListener('click', function() { fileEl.click(); });
    fileEl.addEventListener('change', function() {
      var f = fileEl.files && fileEl.files[0];
      if (!f) return;
      if (isAudio) uploadAudioFile(f, function(u) { urlEl.value = u; }, function(u) { document.getElementById(infoId).textContent = f.name; });
      else uploadImage(f, function(u) { urlEl.value = u; }, function(u) { document.getElementById(infoId).textContent = f.name; });
      fileEl.value = '';
    });
  }
  bindUpload('file_audio', 'btn-import-audio', 'info_audio', 'audio_url', true);
  bindUpload('file_envelope', 'btn-import-envelope', 'info_envelope', 'imagem_envelope_url', false);
  bindUpload('file_selo', 'btn-import-selo', 'info_selo', 'imagem_selo_url', false);
  bindUpload('file_fundo', 'btn-import-fundo', 'info_fundo', 'imagem_fundo_url', false);

  document.getElementById('btn-save').addEventListener('click', async function() {
    const payload = {};
    fields.forEach(function(k) {
      const el = document.getElementById(k);
      if (!el) return;
      if (el.type === 'checkbox') payload[k] = el.checked;
      else payload[k] = el.value.trim();
    });
    payload.data_dia = payload.data_dia ? parseInt(payload.data_dia, 10) : null;
    payload.data_ano = payload.data_ano ? parseInt(payload.data_ano, 10) : null;
    try {
      const res = await fetch(API + '/api/convite/config/' + itemId, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showErr(data.message || 'Erro ao salvar'); return; }
      showOk('Convite salvo com sucesso.');
      load();
    } catch (e) {
      showErr('Falha ao salvar: ' + (e.message || ''));
    }
  });

  document.getElementById('btn-preview').addEventListener('click', async function() {
    try {
      const res = await fetch(API + '/api/convite/preview-link?itemId=' + itemId, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showErr(data.message || (data.error && data.error.message) || 'Erro'); return; }
      const url = (data.data && data.data.preview_url) || data.preview_url;
      if (url) {
        lastPreviewUrl = url;
        document.getElementById('preview_url').innerHTML = '<a href="' + url + '" target="_blank" rel="noopener" style="color:#facc15">' + url + '</a>';
        showOk('Link de preview gerado. Clique em "Ver preview" para ver ao lado.');
      }
    } catch (e) {
      showErr(e.message || 'Erro');
    }
  });

  document.getElementById('btn-ver-preview').addEventListener('click', function() {
    if (lastPreviewUrl) {
      document.getElementById('preview-placeholder').style.display = 'none';
      var ifr = document.getElementById('preview-iframe');
      ifr.style.display = 'block';
      ifr.src = lastPreviewUrl;
    } else {
      showErr('Gere o link de preview primeiro (botão "Gerar link de preview").');
    }
  });

  load();
})();
  </script>
</body>
</html>
