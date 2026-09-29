<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $form['form_title'] ?? 'Formulário' }}</title>
    @php
        $rawTheme = strtolower(trim((string) ($form['theme'] ?? 'light')));
        $isDark = ($rawTheme === 'dark');
        $primary = $form['primary_color'] ?? '#4A90E2';
        $secondary = $form['secondary_color'] ?? $primary;
        $defaultBg = $isDark ? '#0D0D0F' : '#F5F7FA';
        $defaultCard = $isDark ? '#18181B' : '#FFFFFF';
        $defaultText = $isDark ? '#ECECEC' : '#202124';
        $bg = $form['background_color'] ?? $defaultBg;
        $text = $form['text_color'] ?? $defaultText;
        $card = $form['card_color'] ?? $defaultCard;
        if ($isDark && (strtoupper((string) $card) === '#FFFFFF' || strtoupper((string) $card) === '#FFF')) {
            $card = '#18181B';
        }
        if ($isDark && (strtoupper((string) $bg) === '#F5F7FA' || strtoupper((string) $bg) === '#FFFFFF')) {
            $bg = '#0D0D0F';
        }
        $bar = $form['decorative_bar_color'] ?? $primary;
        $sep = $form['separator_line_color'] ?? ($isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,.08)');
        $inputBg = $isDark ? '#27272A' : '#FFFFFF';
        $inputBorder = $isDark ? 'rgba(255,255,255,0.16)' : '#DADCE0';
        $inputText = $isDark ? '#FFFFFF' : $text;
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
            --input-bg: {{ $inputBg }};
            --input-border: {{ $inputBorder }};
            --input-text: {{ $inputText }};
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
    <!-- Barra de Progresso Interativa -->
    <div class="kf-public-progress" id="kf-public-progress">
        <div class="kf-progress-meta">
            <span class="kf-progress-title">Progresso do formulário</span>
            <span class="kf-progress-text" id="kf-progress-text">0% concluído</span>
        </div>
        <div class="kf-progress-bar-track">
            <div class="kf-progress-bar-fill" id="kf-progress-fill" style="width: 0%;"></div>
        </div>
    </div>

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
                <div class="ok" id="ok">
                    <div class="ok-icon-wrap">
                        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                    <div class="ok-title">Enviado com sucesso!</div>
                    <div class="ok-msg" id="ok-msg">{{ $form['success_message'] ?? 'Sua resposta foi registrada com sucesso.' }}</div>
                    <div id="ok-wa-wrap" class="ok-wa-box" style="display: none;">
                        <a id="ok-wa-btn" href="#" target="_blank" rel="noopener" class="kf-public-wa-btn">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.842-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                            <span>Conversar no WhatsApp</span>
                        </a>
                    </div>
                </div>
                <div class="err" id="err"></div>
            </form>
        </div>
    </div>
</div>
<script>
window.__CK_BOOT_FORM_PUBLIC = {
    j0: @json($fieldsMeta ?? []),
    j1: @json($submitUrl),
    wa: @json(!empty($form['whatsapp_number']) ? $form['whatsapp_number'] : null),
    enableWa: @json(!empty($form['enable_whatsapp']))
};
</script>

</body>
</html>
