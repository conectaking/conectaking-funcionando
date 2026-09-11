@php($faviconUrl = $faviconUrl ?? 'https://i.ibb.co/60sW9k75/logo.png')
@php($token = trim((string) request()->query('token', '')))
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nova senha - Conecta King</title>
    <link rel="icon" type="image/png" href="{{ $faviconUrl }}">
    <link rel="apple-touch-icon" href="{{ $faviconUrl }}">
    
</head>
<body>
    <div class="container">
        <div class="icon"><i class="fas fa-lock"></i></div>
        <h1>Nova senha</h1>
        <p class="sub">Crie uma nova senha para sua conta.</p>
        <div id="msg" class="msg"></div>
        @if ($token !== '')
        <form id="form" action="#" method="post">
            <input type="hidden" id="token" name="token" value="{{ $token }}">
            <div class="form-group">
                <label for="password">Nova senha</label>
                <input type="password" id="password" name="password" required minlength="6" autocomplete="new-password" placeholder="Mínimo 6 caracteres">
                <p class="hint">Mínimo 6 caracteres, com maiúscula, minúscula e número.</p>
            </div>
            <div class="form-group">
                <label for="confirm">Confirmar senha</label>
                <input type="password" id="confirm" name="confirm" required minlength="6" autocomplete="new-password" placeholder="Repita a senha">
            </div>
            <button type="submit" class="btn" id="btn"><i class="fas fa-check"></i> Alterar senha</button>
        </form>
        @else
        <div class="msg error">Link inválido ou expirado. Solicite uma nova recuperação de senha.</div>
        <div class="back"><a href="/recuperar-senha"><i class="fas fa-key"></i> Recuperar senha</a></div>
        @endif
        <div class="back" style="margin-top: 16px;"><a href="/"><i class="fas fa-arrow-left"></i> Voltar ao início</a></div>
    </div>
    @if ($token !== '')
    @vite(['resources/css/fontawesome.css', 'resources/js/pages/resetar-senha.js'])
    @endif
</body>
</html>
