<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>Registro - Conecta King</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link rel="stylesheet" href="style.css?v=2025-12-23-02">
    <link rel="stylesheet" href="auth.css?v=2025-12-23-02">
</head>
<body>
    <div class="auth-background"></div>
    <div class="auth-container">
        <div class="auth-card">
            <div class="auth-header">
                <img src="logo.png" alt="Conecta King Logo" class="auth-logo">
                <h2>CONECTA KING</h2>
                <h1>Crie sua Conta</h1>
                <p>O convite real para o futuro do networking.</p>
            </div>

            <form id="register-form">
                <div class="input-group">
                    <label for="email">Seu E-mail</label>
                    <input type="email" id="email" required>
                </div>
                <div class="input-group">
                    <label for="password">Sua Senha</label>
                    <div class="password-wrapper">
                        <input type="password" id="password" required>
                        <i class="fas fa-eye-slash password-toggle"></i>
                    </div>
                </div>
                <div class="input-group">
                    <label for="registrationCode">Código de Convite</label>
                    <input type="text" id="registrationCode" required>
                </div>
                <button type="submit" class="btn-submit">Reivindicar Trono</button>
            </form>
            
            <div id="message" class="message"></div>
            <p class="auth-link">Já faz parte da realeza? <a href="login.html">Acesse seu Reino</a></p>
        </div>
    </div>
    
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            // Lógica de registro que você já tem...
            document.getElementById('register-form').addEventListener('submit', async function (e) {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const registrationCode = document.getElementById('registrationCode').value;
                const messageDiv = document.getElementById('message');
                try {
                    const response = await fetch('https://www.conectaking.com.br/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, registrationCode })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        messageDiv.textContent = data.message;
                        messageDiv.className = 'message success';
                        setTimeout(() => window.location.href = 'login.html', 2000);
                    } else {
                        messageDiv.textContent = data.message;
                        messageDiv.className = 'message error';
                    }
                } catch (error) {
                    messageDiv.textContent = 'Erro de conexão com o servidor.';
                    messageDiv.className = 'message error';
                }
            });

            // Lógica para mostrar/esconder senha
            const passwordToggle = document.querySelector('.password-toggle');
            if (passwordToggle) {
                passwordToggle.addEventListener('click', () => {
                    const passwordInput = document.getElementById('password');
                    if (passwordInput.type === 'password') {
                        passwordInput.type = 'text';
                        passwordToggle.classList.remove('fa-eye-slash');
                        passwordToggle.classList.add('fa-eye');
                    } else {
                        passwordInput.type = 'password';
                        passwordToggle.classList.remove('fa-eye');
                        passwordToggle.classList.add('fa-eye-slash');
                    }
                });
            }
        });
    </script>
</body>