<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }}</title>
    <style>
        :root { --primary: {{ $record['primary_color'] ?? '#FFC700' }}; }
        * { box-sizing: border-box; }
        body {
            margin: 0; font-family: system-ui, sans-serif;
            background: linear-gradient(160deg, #0D0D0F, #1C1C21);
            color: #ECECEC; min-height: 100vh; padding: 20px;
        }
        .wrap { max-width: 920px; margin: 0 auto; }
        h1 { color: var(--primary); font-size: 1.4rem; margin: 0 0 8px; }
        .sub { opacity: .7; margin-bottom: 20px; }
        .card {
            background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08);
            border-radius: 14px; padding: 20px; margin-bottom: 16px;
        }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
        label { display: block; font-size: .8rem; opacity: .8; margin-bottom: 6px; }
        input[type=color] {
            width: 100%; height: 44px; border: none; border-radius: 8px; background: transparent; cursor: pointer;
        }
        input[type=text], input[type=url], input[type=number], select {
            width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,.15);
            background: #16161a; color: #ECECEC;
        }
        .actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
        button, .back {
            border: none; border-radius: 10px; padding: 12px 18px; font-weight: 700; cursor: pointer; text-decoration: none;
        }
        button { background: var(--primary); color: #111; }
        button:disabled { opacity: .6; cursor: wait; }
        .back { background: rgba(255,199,0,.12); color: #FFC700; border: 1px solid rgba(255,199,0,.3); }
        #msg { margin-top: 12px; display: none; }
        #msg.ok { display: block; color: #7dffa0; }
        #msg.err { display: block; color: #ff8a8a; }
        .preview {
            margin-top: 8px; border-radius: 12px; padding: 24px; text-align: center;
            background: {{ $record['background_color'] ?? '#0D0D0F' }};
            color: {{ $record['text_color'] ?? '#ECECEC' }};
            border: 1px solid rgba(255,255,255,.1);
        }
        .preview h2 { color: {{ $record['primary_color'] ?? '#FFC700' }}; margin: 0 0 8px; }
    </style>
</head>
<body>
<div class="wrap">
    <a class="back" href="javascript:history.back()">← Voltar</a>
    <h1 style="margin-top:16px;">{{ $title }}</h1>
    <p class="sub">Item #{{ $profileItemId }} · {{ $kind }}</p>

    <form id="form" class="card">
        <div class="grid">
            @foreach($fields as $field)
                @php $val = $record[$field] ?? ''; @endphp
                <div>
                    <label for="f-{{ $field }}">{{ str_replace('_', ' ', $field) }}</label>
                    @if(str_contains($field, 'color'))
                        <input type="color" id="f-{{ $field }}" name="{{ $field }}" value="{{ $val ?: '#FFC700' }}">
                    @elseif($field === 'background_opacity')
                        <input type="number" id="f-{{ $field }}" name="{{ $field }}" min="0" max="1" step="0.1" value="{{ $val !== '' ? $val : 1 }}">
                    @elseif($field === 'header_banner_fit')
                        <select id="f-{{ $field }}" name="{{ $field }}">
                            <option value="cover" @selected(($val ?: 'cover') === 'cover')>cover</option>
                            <option value="auto" @selected($val === 'auto')>auto</option>
                        </select>
                    @elseif(str_starts_with($field, 'theme_'))
                        <input type="text" id="f-{{ $field }}" name="{{ $field }}" value="{{ $val ?: 'default' }}">
                    @else
                        <input type="text" id="f-{{ $field }}" name="{{ $field }}" value="{{ $val }}">
                    @endif
                </div>
            @endforeach
        </div>
        <div class="actions">
            <button type="submit" id="saveBtn">Salvar</button>
        </div>
        <div id="msg"></div>
    </form>

    <div class="card">
        <label>Prévia rápida</label>
        <div class="preview" id="preview">
            <h2 id="pv-title">{{ $record['event_title_custom'] ?? $record['form_title'] ?? 'Evento' }}</h2>
            <p>{{ $record['portaria_subtitle'] ?? 'Personalização da lista / check-in' }}</p>
        </div>
    </div>
</div>
<script>
(function () {
  var form = document.getElementById('form');
  var msg = document.getElementById('msg');
  var token = @json($token ?? '');
  var saveUrl = @json($saveUrl);

  function syncPreview() {
    var bg = form.background_color && form.background_color.value;
    var tx = form.text_color && form.text_color.value;
    var pr = form.primary_color && form.primary_color.value;
    var pv = document.getElementById('preview');
    if (bg) pv.style.background = bg;
    if (tx) pv.style.color = tx;
    if (pr) document.getElementById('pv-title').style.color = pr;
    var titleEl = form.event_title_custom || form.form_title;
    if (titleEl && titleEl.value) document.getElementById('pv-title').textContent = titleEl.value;
  }
  form.addEventListener('input', syncPreview);

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    msg.className = '';
    msg.textContent = '';
    var btn = document.getElementById('saveBtn');
    btn.disabled = true;
    var body = {};
    Array.from(form.elements).forEach(function (el) {
      if (!el.name) return;
      body[el.name] = el.value;
    });
    try {
      var headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      var res = await fetch(saveUrl, {
        method: 'PUT',
        credentials: 'include',
        headers: headers,
        body: JSON.stringify(body)
      });
      var json = await res.json().catch(function () { return {}; });
      if (!res.ok || json.success === false) throw new Error(json.message || 'Falha ao salvar');
      msg.textContent = json.message || 'Salvo!';
      msg.className = 'ok';
    } catch (err) {
      msg.textContent = err.message || 'Erro';
      msg.className = 'err';
    } finally {
      btn.disabled = false;
    }
  });
})();
</script>
</body>
</html>
