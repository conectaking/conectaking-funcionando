<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $form['form_title'] ?? 'Formulário' }}</title>
    @php
        $primary = $form['primary_color'] ?? '#4A90E2';
        $secondary = $form['secondary_color'] ?? $primary;
        $bg = $form['background_color'] ?? '#F5F7FA';
        $text = $form['text_color'] ?? '#202124';
        $card = $form['card_color'] ?? '#FFFFFF';
        $bar = $form['decorative_bar_color'] ?? $primary;
        $sep = $form['separator_line_color'] ?? 'rgba(0,0,0,.08)';
        $bgImg = $form['background_image_url'] ?? null;
        $bgOp = isset($form['background_image_opacity']) ? (float) $form['background_image_opacity'] : 0.35;
        $headerImg = $form['header_image_url'] ?? null;
    @endphp
    <style>
        :root {
            --primary: {{ $primary }};
            --secondary: {{ $secondary }};
            --bg: {{ $bg }};
            --text: {{ $text }};
            --card: {{ $card }};
            --bar: {{ $bar }};
            --sep: {{ $sep }};
        }
        * { box-sizing: border-box; }
        body {
            margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
            background: var(--bg); color: var(--text); min-height:100vh; position:relative;
        }
        @if($bgImg)
        body::before {
            content:''; position:fixed; inset:0; z-index:0;
            background: url('{{ $bgImg }}') center/cover no-repeat;
            opacity: {{ max(0, min(1, $bgOp)) }}; pointer-events:none;
        }
        @endif
        .wrap { position:relative; z-index:1; max-width: 640px; margin: 0 auto; padding: 28px 16px 64px; }
        .card {
            background: var(--card); border-radius: 16px; padding: 0 0 28px;
            box-shadow: 0 12px 40px rgba(0,0,0,.12); overflow:hidden;
        }
        .header {
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            min-height: 88px; position:relative;
            @if($headerImg) background-image: url('{{ $headerImg }}'); background-size:cover; background-position:center; @endif
        }
        .body { padding: 22px 22px 0; }
        .logo { max-width: 88px; max-height: 88px; margin: -40px 0 12px; border-radius: 14px; border:3px solid var(--card); background:var(--card); display:block; object-fit:cover; }
        h1 { font-size: 1.45rem; margin: 0 0 8px; line-height:1.25; }
        p.desc { opacity: .85; margin: 0 0 8px; line-height:1.5; }
        .meta { font-size:.88rem; opacity:.75; margin: 0 0 18px; }
        .field { margin: 0 0 18px; padding-bottom: 16px; border-bottom: 1px solid var(--sep); }
        .field:last-of-type { border-bottom:0; }
        .field.hidden-cond { display:none !important; }
        .lab { display:flex; align-items:flex-start; gap:8px; font-size:.95rem; margin: 0 0 10px; font-weight:600; }
        .lab .bar { width:3px; min-height:18px; background:var(--bar); border-radius:2px; margin-top:2px; flex-shrink:0; }
        .req { color: #c62828; }
        input[type=text], input[type=email], input[type=tel], input[type=number], input[type=url],
        input[type=date], input[type=time], input[type=datetime-local], input[type=file],
        textarea, select {
            width:100%; padding:13px 14px; border:2px solid #dadce0; border-radius:12px;
            font: inherit; background:#fff; color: var(--text);
        }
        input:focus, textarea:focus, select:focus { outline:none; border-color: var(--primary); }
        textarea { min-height: 110px; resize: vertical; }
        .opts { display:flex; flex-direction:column; gap:10px; }
        .opt { font-weight:500; display:flex; align-items:center; gap:10px; margin:0; padding:10px 12px;
               border:1px solid #e0e0e0; border-radius:10px; cursor:pointer; }
        .opt:has(input:checked) { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, white); }
        .opt input { width:auto; margin:0; }
        .scale, .rating { display:flex; flex-wrap:wrap; gap:8px; }
        .scale label, .rating label {
            min-width:40px; text-align:center; padding:10px 8px; border:1px solid #dadce0; border-radius:10px; cursor:pointer;
        }
        .scale input, .rating input { display:none; }
        .scale label:has(input:checked), .rating label:has(input:checked) {
            background: var(--primary); color:#fff; border-color: var(--primary);
        }
        .follow { margin-top:12px; display:none; }
        .follow.show { display:block; }
        button[type=submit] {
            margin-top: 8px; width:100%; padding:15px; border:0; border-radius:12px;
            background:var(--primary); color:#fff; font-weight:700; font-size:1rem; cursor:pointer;
        }
        button[type=submit]:disabled { opacity:.6; cursor:wait; }
        .ok { display:none; margin-top:16px; padding:14px; background:#e8f8ef; color:#146c2e; border-radius:10px; }
        .err { display:none; margin-top:16px; padding:14px; background:#fdecea; color:#8a1f11; border-radius:10px; }
        .hint { font-size:.8rem; opacity:.65; margin-top:6px; }
    </style>
</head>
<body>
@php
    $optVal = static function ($opt) {
        if (is_array($opt)) {
            return (string) ($opt['value'] ?? $opt['label'] ?? '');
        }
        return (string) $opt;
    };
    $optLab = static function ($opt) {
        if (is_array($opt)) {
            return (string) ($opt['label'] ?? $opt['value'] ?? '');
        }
        return (string) $opt;
    };
@endphp
<div class="wrap">
    <div class="card">
        <div class="header"></div>
        <div class="body">
            @if(!empty($form['form_logo_url']))
                <img class="logo" src="{{ $form['form_logo_url'] }}" alt="">
            @endif
            <h1>{{ $form['form_title'] ?? 'Formulário' }}</h1>
            @if(!empty($form['form_description']))
                <p class="desc">{{ $form['form_description'] }}</p>
            @endif
            @if(!empty($form['event_date']) || !empty($form['event_address']))
                <p class="meta">
                    @if(!empty($form['event_date']))<span>{{ $form['event_date'] }}</span>@endif
                    @if(!empty($form['event_date']) && !empty($form['event_address'])) · @endif
                    @if(!empty($form['event_address']))<span>{{ $form['event_address'] }}</span>@endif
                </p>
            @endif

            <form id="ck-form" novalidate>
                @foreach(($form['form_fields'] ?? []) as $field)
                    @php
                        $fid = (string) ($field['id'] ?? ('f_'.$loop->index));
                        $label = (string) ($field['label'] ?? 'Campo');
                        $type = strtolower((string) ($field['type'] ?? 'short_text'));
                        $required = !empty($field['required']);
                        $ph = (string) ($field['placeholder'] ?? '');
                        $options = is_array($field['options'] ?? null) ? $field['options'] : [];
                        $depends = $field['dependsOn'] ?? $field['depends_on'] ?? null;
                        $depId = null; $depVal = 'Sim';
                        if (is_array($depends)) {
                            $depId = $depends['fieldId'] ?? $depends['field_id'] ?? null;
                            $depVal = (string) ($depends['value'] ?? 'Sim');
                        } elseif (is_string($depends) && $depends !== '') {
                            $depId = $depends;
                        }
                        $min = $field['min'] ?? ($field['scale_min'] ?? 1);
                        $max = $field['max'] ?? ($field['scale_max'] ?? 5);
                        $followLabel = $field['followUpLabel'] ?? $field['follow_up_label'] ?? '';
                        $followTrigger = (($field['followUpTrigger'] ?? $field['follow_up_trigger'] ?? 'Sim') === 'Não') ? 'Não' : 'Sim';
                    @endphp
                    <div class="field"
                         data-field-id="{{ $fid }}"
                         @if($depId) data-depends-on="{{ $depId }}" data-depends-on-value="{{ $depVal }}" @endif>

                        <div class="lab">
                            <span class="bar"></span>
                            <span>{{ $label }}@if($required) <span class="req">*</span>@endif</span>
                        </div>

                        @if(in_array($type, ['paragraph', 'textarea', 'long_text'], true))
                            <textarea id="{{ $fid }}" name="{{ $fid }}" rows="4" placeholder="{{ $ph }}" @if($required) required @endif></textarea>

                        @elseif(in_array($type, ['dropdown', 'select'], true))
                            <select id="{{ $fid }}" name="{{ $fid }}" @if($required) required @endif>
                                <option value="">Selecione...</option>
                                @foreach($options as $opt)
                                    <option value="{{ $optVal($opt) }}">{{ $optLab($opt) }}</option>
                                @endforeach
                            </select>

                        @elseif(in_array($type, ['multiple_choice', 'radio'], true))
                            <div class="opts">
                                @foreach($options as $oi => $opt)
                                    <label class="opt">
                                        <input type="radio" name="{{ $fid }}" value="{{ $optVal($opt) }}" @if($required && $oi === 0) required @endif>
                                        <span>{{ $optLab($opt) }}</span>
                                    </label>
                                @endforeach
                            </div>

                        @elseif($type === 'yes_no')
                            <div class="opts">
                                <label class="opt"><input type="radio" name="{{ $fid }}" value="Sim" @if($required) required @endif><span>Sim</span></label>
                                <label class="opt"><input type="radio" name="{{ $fid }}" value="Não"><span>Não</span></label>
                            </div>

                        @elseif($type === 'yes_no_with_text')
                            <div class="opts yes-no-follow" data-follow-trigger="{{ $followTrigger }}">
                                <label class="opt"><input type="radio" class="ynwt" name="{{ $fid }}" value="Sim" @if($required) required @endif><span>Sim</span></label>
                                <label class="opt"><input type="radio" class="ynwt" name="{{ $fid }}" value="Não"><span>Não</span></label>
                            </div>
                            <div class="follow" data-follow-for="{{ $fid }}">
                                @if($followLabel)<div class="lab" style="margin-top:4px"><span class="bar"></span><span>{{ $followLabel }}</span></div>@endif
                                <input type="text" name="{{ $fid }}_text" placeholder="{{ $ph !== '' ? $ph : 'Sua resposta' }}">
                            </div>

                        @elseif(in_array($type, ['checkbox', 'checkboxes'], true) && count($options) > 0)
                            <div class="opts">
                                @foreach($options as $opt)
                                    <label class="opt">
                                        <input type="checkbox" name="{{ $fid }}[]" value="{{ $optVal($opt) }}" data-multi="1">
                                        <span>{{ $optLab($opt) }}</span>
                                    </label>
                                @endforeach
                            </div>

                        @elseif($type === 'checkbox')
                            <label class="opt">
                                <input type="checkbox" id="{{ $fid }}" name="{{ $fid }}" value="1" @if($required) required @endif>
                                <span>{{ $ph !== '' ? $ph : 'Sim' }}</span>
                            </label>

                        @elseif($type === 'linear_scale')
                            <div class="scale">
                                @for($i = (int)$min; $i <= (int)$max; $i++)
                                    <label><input type="radio" name="{{ $fid }}" value="{{ $i }}" @if($required && $i === (int)$min) required @endif><span>{{ $i }}</span></label>
                                @endfor
                            </div>

                        @elseif($type === 'rating')
                            <div class="rating">
                                @for($i = 1; $i <= max(1, (int)$max); $i++)
                                    <label><input type="radio" name="{{ $fid }}" value="{{ $i }}" @if($required && $i === 1) required @endif><span>{{ $i }}★</span></label>
                                @endfor
                            </div>

                        @elseif($type === 'file_upload')
                            <input type="file" id="{{ $fid }}" name="{{ $fid }}" @if($required) required @endif>
                            <p class="hint">Envio de arquivo ainda não é persistido neste fluxo; use texto se necessário.</p>

                        @elseif(in_array($type, ['multiple_choice_grid', 'checkbox_grid'], true))
                            <p class="hint">Grade não suportada nesta versão — responda em texto:</p>
                            <textarea id="{{ $fid }}" name="{{ $fid }}" rows="3" @if($required) required @endif placeholder="{{ $ph }}"></textarea>

                        @else
                            @php
                                if ($type === 'email') { $htmlType = 'email'; }
                                elseif (in_array($type, ['phone', 'tel'], true)) { $htmlType = 'tel'; }
                                elseif ($type === 'number') { $htmlType = 'number'; }
                                elseif ($type === 'url') { $htmlType = 'url'; }
                                elseif ($type === 'date') { $htmlType = 'date'; }
                                elseif ($type === 'time') { $htmlType = 'time'; }
                                elseif ($type === 'datetime') { $htmlType = 'datetime-local'; }
                                else { $htmlType = 'text'; }
                            @endphp
                            <input id="{{ $fid }}" name="{{ $fid }}" type="{{ $htmlType }}"
                                   placeholder="{{ $ph }}"
                                   @if($type === 'number' && isset($field['min'])) min="{{ $field['min'] }}" @endif
                                   @if($type === 'number' && isset($field['max'])) max="{{ $field['max'] }}" @endif
                                   @if($required) required @endif
                                   data-field-type="{{ $type }}">
                        @endif
                    </div>
                @endforeach

                <button type="submit">{{ $form['submit_button_text'] ?? 'Enviar' }}</button>
                <div class="ok" id="ok">{{ $form['success_message'] ?? 'Enviado com sucesso!' }}</div>
                <div class="err" id="err"></div>
            </form>
        </div>
    </div>
</div>
<script>
(function () {
  var form = document.getElementById('ck-form');
  var ok = document.getElementById('ok');
  var err = document.getElementById('err');
  var fieldsMeta = @json($fieldsMeta ?? []);

  function applyConditionals() {
    form.querySelectorAll('.field[data-depends-on]').forEach(function (el) {
      var parentId = el.getAttribute('data-depends-on');
      var need = el.getAttribute('data-depends-on-value') || 'Sim';
      var parent = form.querySelector('[name="' + parentId + '"]:checked')
        || form.querySelector('[name="' + parentId + '"]');
      var val = '';
      if (parent) {
        if (parent.type === 'checkbox') val = parent.checked ? (parent.value || '1') : '';
        else val = parent.value || '';
      }
      var radios = form.querySelectorAll('[name="' + parentId + '"]');
      if (radios.length > 1) {
        radios.forEach(function (r) { if (r.checked) val = r.value; });
      }
      var show = String(val) === String(need);
      el.classList.toggle('hidden-cond', !show);
      el.querySelectorAll('input,textarea,select').forEach(function (inp) {
        if (show) {
          if (inp.dataset.wasRequired === '1') inp.required = true;
        } else {
          if (inp.required) inp.dataset.wasRequired = '1';
          inp.required = false;
        }
      });
    });
  }

  form.querySelectorAll('.ynwt').forEach(function (r) {
    r.addEventListener('change', function () {
      var wrap = r.closest('.field');
      var box = wrap && wrap.querySelector('.follow');
      var group = wrap && wrap.querySelector('.yes-no-follow');
      if (!box || !group) return;
      var trigger = group.getAttribute('data-follow-trigger') || 'Sim';
      box.classList.toggle('show', r.checked && r.value === trigger);
    });
  });

  form.addEventListener('change', applyConditionals);
  applyConditionals();

  function pickContact(data) {
    var name = '', email = '', phone = '';
    fieldsMeta.forEach(function (m) {
      if (!m.id) return;
      var v = data[m.id];
      if (v == null || v === '') return;
      var s = Array.isArray(v) ? v.join(', ') : String(v);
      var low = (m.label + ' ' + m.type + ' ' + m.id).toLowerCase();
      if (!name && (m.type === 'short_text' || m.type === 'text') && /nome|name/.test(low)) name = s;
      if (!email && (m.type === 'email' || /e-?mail/.test(low))) email = s;
      if (!phone && (m.type === 'phone' || m.type === 'tel' || /telefone|whats|celular|fone/.test(low))) phone = s;
    });
    return { name: name, email: email, phone: phone };
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    ok.style.display = 'none';
    err.style.display = 'none';
    applyConditionals();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    var data = {};
    Array.from(form.elements).forEach(function (el) {
      if (!el.name || el.type === 'submit' || el.type === 'file') return;
      var fieldEl = el.closest('.field');
      if (fieldEl && fieldEl.classList.contains('hidden-cond')) return;
      var key = el.name.replace(/\[\]$/, '');
      if (el.type === 'checkbox') {
        if (!el.checked) return;
        if (el.name.slice(-2) === '[]' || el.getAttribute('data-multi') === '1') {
          if (!Array.isArray(data[key])) data[key] = [];
          data[key].push(el.value);
        } else {
          data[key] = el.value || '1';
        }
      } else if (el.type === 'radio') {
        if (el.checked) data[key] = el.value;
      } else {
        data[key] = el.value;
      }
    });
    var contact = pickContact(data);
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      var res = await fetch(@json($submitUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          response_data: data,
          responder_name: contact.name || null,
          responder_email: contact.email || null,
          responder_phone: contact.phone || null
        })
      });
      var json = await res.json().catch(function () { return {}; });
      if (!res.ok || json.success === false) throw new Error(json.message || 'Falha ao enviar');
      form.reset();
      applyConditionals();
      ok.style.display = 'block';
      ok.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (ex) {
      err.textContent = ex.message || 'Erro';
      err.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  });
})();
</script>
</body>
</html>
