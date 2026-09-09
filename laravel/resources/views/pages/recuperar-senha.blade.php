@php($faviconUrl = $faviconUrl ?? 'https://i.ibb.co/60sW9k75/logo.png')
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperar senha - Conecta King</title>
    <link rel="icon" type="image/png" href="{{ $faviconUrl }}">
    <link rel="apple-touch-icon" href="{{ $faviconUrl }}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #0D0D0F 0%, #1C1C21 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: #ECECEC;
        }
        .container {
            background: rgba(255,255,255,0.05);
            border: 2px solid rgba(255,255,255,0.1);
            border-radius: 20px;
            padding: 48px;
            max-width: 480px;
            width: 100%;
        }
        .icon { font-size: 48px; color: #FFC700; margin-bottom: 24px; text-align: center; }
        h1 { font-size: 22px; margin-bottom: 8px; color: #FFF; text-align: center; }
        .sub { font-size: 14px; color: #A1A1A1; text-align: center; margin-bottom: 32px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 600; color: #E0E0E0; }
        input[type="email"] {
            width: 100%;
            padding: 14px 18px;
            background: rgba(255,255,255,0.08);
            border: 2px solid rgba(255,255,255,0.15);
            border-radius: 12px;
            color: #FFF;
            font-size: 16px;
        }
        input[type="email"]:focus {
            outline: none;
            border-color: #FFC700;
            box-shadow: 0 0 0 3px rgba(255,199,0,0.2);
        }
        input::placeholder { color: #666; }
        .btn {
            display: block;
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #FFC700, #FFA500);
            color: #000;
            font-weight: 700;
            font-size: 16px;
            text-align: center;
            text-decoration: none;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 8px;
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255,199,0,0.4); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .msg { padding: 14px; border-radius: 12px; margin-bottom: 20px; font-size: 14px; display: none; }
        .msg.success { background: rgba(34,197,94,0.2); border: 1px solid rgba(34,197,94,0.5); color: #86efac; display: block; }
        .msg.error { background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.5); color: #fca5a5; display: block; }
        .back { text-align: center; margin-top: 24px; }
        .back a { color: #FFC700; text-decoration: none; font-size: 14px; }
        .back a:hover { text-decoration: underline; }
    </style>
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
    @vite(['resources/js/pages/recuperar-senha.js'])
</body>
</html>
