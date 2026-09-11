<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }}</title>
    <style>
        :root {
            --primary: {{ $record['primary_color'] ?? '#FFC700' }};
            --preview-bg: {{ $record['background_color'] ?? '#0D0D0F' }};
            --preview-text: {{ $record['text_color'] ?? '#ECECEC' }};
        }
    </style>
    @vite(['resources/css/fonts.css', 'resources/js/pages/cartao-guest-customize.js'])
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
<script>window.__CK_BOOT_GUEST_CUSTOMIZE = { j0: @json($token ?? ''), j1: @json($saveUrl) };</script>

</body>
</html>
