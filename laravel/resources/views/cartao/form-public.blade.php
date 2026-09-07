<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $form['form_title'] ?? 'Formulário' }}</title>
    <style>
        :root {
            --primary: {{ $form['primary_color'] ?? '#4A90E2' }};
            --bg: {{ $form['background_color'] ?? '#FFFFFF' }};
            --text: {{ $form['text_color'] ?? '#333333' }};
            --card: {{ $form['card_color'] ?? '#FFFFFF' }};
        }
        body { margin:0; font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); }
        .wrap { max-width: 560px; margin: 0 auto; padding: 24px 16px 48px; }
        .card { background: var(--card); border-radius: 12px; padding: 20px; box-shadow: 0 8px 24px rgba(0,0,0,.08); }
        h1 { font-size: 1.4rem; margin: 0 0 8px; }
        p.desc { opacity: .85; margin: 0 0 20px; }
        label { display:block; font-size:.9rem; margin: 14px 0 6px; font-weight:600; }
        input, textarea, select { width:100%; box-sizing:border-box; padding:12px; border:1px solid #ddd; border-radius:8px; font: inherit; }
        button { margin-top: 20px; width:100%; padding:14px; border:0; border-radius:10px; background:var(--primary); color:#fff; font-weight:700; cursor:pointer; }
        .ok { display:none; margin-top:16px; padding:12px; background:#e8f8ef; color:#146c2e; border-radius:8px; }
        .err { display:none; margin-top:16px; padding:12px; background:#fdecea; color:#8a1f11; border-radius:8px; }
        .logo { max-width: 96px; max-height: 96px; margin-bottom: 12px; border-radius: 12px; }
    </style>
</head>
<body>
<div class="wrap">
    <div class="card">
        @if(!empty($form['form_logo_url']))
            <img class="logo" src="{{ $form['form_logo_url'] }}" alt="">
        @endif
        <h1>{{ $form['form_title'] ?? 'Formulário' }}</h1>
        @if(!empty($form['form_description']))
            <p class="desc">{{ $form['form_description'] }}</p>
        @endif
        <form id="ck-form">
            @foreach(($form['form_fields'] ?? []) as $field)
                @php
                    $fid = $field['id'] ?? ('f_'.$loop->index);
                    $label = $field['label'] ?? 'Campo';
                    $type = $field['type'] ?? 'text';
                    $required = !empty($field['required']);
                @endphp
                <label for="{{ $fid }}">{{ $label }}@if($required) * @endif</label>
                @if($type === 'textarea')
                    <textarea id="{{ $fid }}" name="{{ $fid }}" @if($required) required @endif></textarea>
                @elseif($type === 'select' && is_array($field['options'] ?? null))
                    <select id="{{ $fid }}" name="{{ $fid }}" @if($required) required @endif>
                        <option value="">Selecione</option>
                        @foreach($field['options'] as $opt)
                            <option value="{{ is_array($opt) ? ($opt['value'] ?? $opt['label'] ?? '') : $opt }}">
                                {{ is_array($opt) ? ($opt['label'] ?? $opt['value'] ?? '') : $opt }}
                            </option>
                        @endforeach
                    </select>
                @else
                    <input id="{{ $fid }}" name="{{ $fid }}" type="{{ in_array($type, ['email','tel','number','date'], true) ? $type : 'text' }}" @if($required) required @endif>
                @endif
            @endforeach
            <button type="submit">Enviar</button>
            <div class="ok" id="ok">Enviado com sucesso!</div>
            <div class="err" id="err"></div>
        </form>
    </div>
</div>
<script>
(function () {
  var form = document.getElementById('ck-form');
  var ok = document.getElementById('ok');
  var err = document.getElementById('err');
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    ok.style.display = 'none';
    err.style.display = 'none';
    var data = {};
    var name = '', email = '', phone = '';
    Array.from(form.elements).forEach(function (el) {
      if (!el.name || el.type === 'submit') return;
      data[el.name] = el.value;
      var low = (el.name + ' ' + (el.previousElementSibling && el.previousElementSibling.textContent || '')).toLowerCase();
      if (!name && /nome/.test(low)) name = el.value;
      if (!email && (el.type === 'email' || /e-?mail/.test(low))) email = el.value;
      if (!phone && (el.type === 'tel' || /telefone|whats|celular/.test(low))) phone = el.value;
    });
    try {
      var res = await fetch(@json($submitUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ response_data: data, responder_name: name || null, responder_email: email || null, responder_phone: phone || null })
      });
      var json = await res.json().catch(function () { return {}; });
      if (!res.ok || json.success === false) throw new Error(json.message || 'Falha ao enviar');
      form.reset();
      ok.style.display = 'block';
    } catch (ex) {
      err.textContent = ex.message || 'Erro';
      err.style.display = 'block';
    }
  });
})();
</script>
</body>
</html>
