<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title ?? 'Enviado' }}</title>
    <style>
        body { margin:0; font-family: system-ui, sans-serif; background:#0D0D0F; color:#ECECEC;
               display:flex; min-height:100vh; align-items:center; justify-content:center; padding:24px; }
        .card { max-width:420px; text-align:center; background:#16161a; border-radius:16px; padding:32px 24px; }
        h1 { color:#FFC700; margin:0 0 12px; font-size:1.4rem; }
        a { display:inline-block; margin-top:20px; color:#111; background:#FFC700; padding:12px 18px;
            border-radius:10px; text-decoration:none; font-weight:700; }
    </style>
</head>
<body>
<div class="card">
    <h1>{{ $title ?? 'Enviado!' }}</h1>
    <p>{{ $message ?? 'Resposta enviada com sucesso!' }}</p>
    @if(!empty($backUrl))
        <a href="{{ $backUrl }}">Voltar ao formulário</a>
    @endif
</div>
</body>
</html>
