@php($faviconUrl = $faviconUrl ?? 'https://i.ibb.co/60sW9k75/logo.png')
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperar senha - Conecta King</title>
    <link rel="icon" type="image/png" href="{{ $faviconUrl }}">
    <link rel="apple-touch-icon" href="{{ $faviconUrl }}">
    
</head>
<body>
    <div class="container">
        <div class="icon"><i class="fas fa-key"></i></div>
        <h1>Esqueci minha senha</h1>
        <p class="sub">Digite seu e-mail para receber o link de recuperação.</p>
        <div id="msg" class="msg"></div>
        <form id="form" action="#" method="post">
            <div class="form-group">
                <label for="email">E-mail</label>
                <input type="email" id="email" name="email" placeholder="seu@email.com" required autocomplete="email">
            </div>
            <button type="submit" class="btn" id="btn"><i class="fas fa-paper-plane"></i> Enviar link de recuperação</button>
        </form>
        <div class="back"><a href="/"><i class="fas fa-arrow-left"></i> Voltar ao início</a></div>
    </div>
    @vite(['resources/css/fontawesome.css', 'resources/js/pages/recuperar-senha.js'])
</body>
</html>
