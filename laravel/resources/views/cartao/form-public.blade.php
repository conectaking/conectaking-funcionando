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

@if($bgImg)
        body::before {
            content:''; position:fixed; inset:0; z-index:0;
            background: url('{{ $bgImg }}') center/cover no-repeat;
            opacity: {{ max(0, min(1, $bgOp)) }}; pointer-events:none;
        }
        @endif

@if($headerImg)
        .form-banner.has-image {
            background-image: url('{{ $headerImg }}');
        }
@endif
    </style>
    @vite(['resources/css/fonts.css', 'resources/js/pages/cartao-form-public.js'])
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
<header class="form-banner{{ $headerImg ? ' has-image' : '' }}" role="presentation" aria-hidden="true">
    <span class="form-banner__shine"></span>
</header>
<div class="wrap">
    <div class="card">
        <div class="body">
            @if(!empty($form['form_logo_url']))
                <img class="logo" src="{{ $form['form_logo_url'] }}" alt="{{ $form['form_title'] ?? 'Logo' }}">
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
                                @if($followLabel)<div class="lab ck-fp-96ad60"><span class="bar"></span><span>{{ $followLabel }}</span></div>@endif
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
<script>window.__CK_BOOT_FORM_PUBLIC = { j0: @json($fieldsMeta ?? []), j1: @json($submitUrl) };</script>

</body>
</html>
