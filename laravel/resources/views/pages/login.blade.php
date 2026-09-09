<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>Login - Conecta King</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link rel="stylesheet" href="/style.css?v=2025-12-23-02">
    <link rel="stylesheet" href="/auth.css?v=2025-12-23-02">
    <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/js/pages/login.js'])
</head>
<body>
    <div class="auth-background"></div>
    <div class="auth-container">
        <div class="auth-card">
            <div class="auth-header">
                <img src="/logo.png" alt="Conecta King Logo" class="auth-logo">
                <h2>CONECTA KING</h2>
                <h1>Bem Vindo</h1>
                <p>Acesse sua ponte de conexão</p>
            </div>

            <div id="localhost-hint" class="localhost-hint" style="display: none; margin-bottom: 16px; padding: 12px; background: rgba(255,215,0,0.12); border: 1px solid rgba(255,215,0,0.35); border-radius: 8px; font-size: 13px; color: #e6c200; text-align: left;"></div>
            <form id="login-form" novalidate>
                <div class="input-group">
                    <label for="email">E-mail</label>
                    <input type="email" id="email" name="email" required autocomplete="username" placeholder="seu@email.com">
                </div>
                <div class="input-group">
                    <label for="password">Senha</label>
                    <div class="password-wrapper">
                       <input type="password" id="password" name="password" required autocomplete="current-password" placeholder="Sua senha">
                       <i class="fas fa-eye-slash password-toggle" role="button" tabindex="0"></i>
                    </div>
                </div>
                <button type="submit" class="btn-submit" id="login-submit-btn">
                    <i class="fas fa-arrow-right"></i> Entrar no Sistema
                </button>
            </form>

            <div id="message" class="message"></div>

            <p class="auth-link" style="margin-top: 20px; margin-bottom: 8px;">
                <a href="/recuperar-senha" style="color: #ffd700; text-decoration: none; font-weight: 600;">
                    <i class="fas fa-key"></i> Esqueceu sua senha?
                </a>
            </p>

            <p class="auth-link">Não tem uma conta? <a href="/registro">Crie a sua</a></p>
        </div>
    </div>
</body>
</html>
