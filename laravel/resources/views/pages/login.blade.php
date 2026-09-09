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
    <script src="/config.js?v=2026-09-04-docker-local"></script>
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

    <script src="/config.js?v=2026-09-04-docker-local"></script>
    <script>
        // Garantir que o código execute mesmo se houver erros anteriores
        (function() {
            'use strict';
            
            console.log('Script de login carregado');
            
            function initLogin() {
                console.log('Inicializando login...');
                
                var isLocal = (typeof location !== 'undefined') && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
                var reason = '';
                try { reason = sessionStorage.getItem('conectaKingLoginReason') || ''; } catch (_) {}
                if (reason) try { sessionStorage.removeItem('conectaKingLoginReason'); } catch (_) {}
                var hintEl = document.getElementById('localhost-hint');
                if (hintEl && isLocal && (reason === 'refresh_500' || reason === 'localhost_401')) {
                    hintEl.style.display = 'block';
                    hintEl.innerHTML = reason === 'refresh_500'
                        ? '<strong>KingBrief no localhost:</strong> O servidor devolveu erro 500 ao renovar o token. Faça login abaixo. Confirme que o Laravel está no ar (<code>/health</code>) e tente de novo.'
                        : '<strong>KingBrief no localhost:</strong> Sessão inválida ou expirada. Faça login. Se o problema repetir, rode a migration 001 (refresh_tokens), reinicie o backend e entre de novo.';
                }
                
                const loginForm = document.getElementById('login-form');
                if (!loginForm) {
                    console.error('O Formulário de login não encontrado!');
                    return;
                }
                
                console.log('Formulário de login encontrado');
                
                // Handler de submit
                loginForm.addEventListener('submit', async function (e) {
                    console.log('Submit do formulário detectado');
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const emailInput = document.getElementById('email');
                    const passwordInput = document.getElementById('password');
                    const messageDiv = document.getElementById('message');
                    const submitBtn = loginForm.querySelector('button[type="submit"]');
                    
                    if (!emailInput || !passwordInput) {
                        console.error('O Campos de email ou senha não encontrados!');
                        if (messageDiv) {
                            messageDiv.textContent = 'Erro: Campos do formulário não encontrados.';
                            messageDiv.className = 'message error';
                        }
                        return;
                    }
                    
                    const email = emailInput.value.trim();
                    const password = passwordInput.value;
                    
                    if (!email || !password) {
                        console.warn('Email ou senha vazios');
                        if (messageDiv) {
                            messageDiv.textContent = 'Por favor, preencha todos os campos.';
                            messageDiv.className = 'message error';
                        }
                        return;
                    }
                    
                    console.log('Enviando requisição de login...');
                    
                    // Desabilitar botão durante o processo
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
                    }
                    
                    // Limpar mensagens anteriores
                    if (messageDiv) {
                        messageDiv.textContent = '';
                        messageDiv.className = '';
                    }
                    
                    try {
                        const PROD = 'https://www.conectaking.com.br';

                        function isLocalPage() {
                            return /^localhost$|^127\.0\.0\.1$/.test(window.location.hostname);
                        }

                        function sleep(ms) {
                            return new Promise(resolve => setTimeout(resolve, ms));
                        }

                        async function fetchWithTimeout(url, options, timeoutMs) {
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                            try {
                                const res = await fetch(url, { ...options, signal: controller.signal });
                                return res;
                            } finally {
                                clearTimeout(timeoutId);
                            }
                        }

                        function getApiBase() {
                            // Preferir a base global (config.js) quando existir
                            var base = (window.API_URL || window.API_BASE || (typeof API_CONFIG !== 'undefined' && API_CONFIG.baseURL) || PROD);
                            // Em produção SEMPRE usar PROD (evita celular tentar localhost)
                            if (!isLocalPage()) return PROD;
                            // Em localhost, permitir local via config
                            return base || PROD;
                        }

                        async function warmUpApi(apiBase) {
                            // Ping leve do /health (útil em cold start local)
                            try {
                                await fetchWithTimeout(apiBase + '/health', { method: 'GET', cache: 'no-store' }, 8000);
                            } catch (e) {
                                // Ignorar
                            }
                        }

                        async function loginWithRetry(apiBase, payload) {
                            const attempts = [
                                { wait: 0, timeout: 20000 },
                                { wait: 1200, timeout: 30000 },
                                { wait: 2500, timeout: 30000 }
                            ];

                            let lastErr = null;
                            for (let i = 0; i < attempts.length; i++) {
                                const a = attempts[i];
                                if (a.wait) await sleep(a.wait);

                                if (submitBtn) {
                                    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Conectando... (${i + 1}/${attempts.length})`;
                                }

                                try {
                                    const res = await fetchWithTimeout(apiBase + '/api/auth/login', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Accept': 'application/json',
                                            'Cache-Control': 'no-cache'
                                        },
                                        body: JSON.stringify(payload)
                                    }, a.timeout);

                                    // Se o servidor respondeu, retornamos mesmo em erro HTTP (tratado abaixo)
                                    return res;
                                } catch (err) {
                                    lastErr = err;
                                    // segue tentando
                                }
                            }
                            throw lastErr || new Error('Falha ao conectar');
                        }

                        console.log('Fazendo requisição para API...');
                        var apiBase = getApiBase();

                        // Aquecer API antes do login (sem bloquear se falhar)
                        await warmUpApi(apiBase);

                        const response = await loginWithRetry(apiBase, { email, password });

                        console.log('Resposta recebida:', response.status, response.statusText);
                        
                        let data;
                        try {
                            const text = await response.text();
                            data = text ? JSON.parse(text) : {};
                        } catch (parseError) {
                            console.error('O Erro ao parsear resposta:', parseError);
                            throw new Error('Resposta inválida do servidor');
                        }
                        
                        if (response.ok) {
                            console.log('Login bem-sucedido!');
                            
                            if (messageDiv) {
                                messageDiv.textContent = data.message || 'Login realizado com sucesso!';
                                messageDiv.className = 'message success';
                            }
                            
                            // Salva tokens
                            if (data.token) {
                                localStorage.setItem('conectaKingToken', data.token);
                                console.log('Token salvo no localStorage');
                            } else {
                                console.error('O Token não recebido na resposta do login');
                            }
                            
                            if (data.refreshToken) {
                                localStorage.setItem('conectaKingRefreshToken', data.refreshToken);
                                console.log('Refresh token salvo no localStorage');
                            } else {
                                console.warn('Refresh token não recebido na resposta do login');
                            }
                            
                            if (data.user) {
                                localStorage.setItem('conectaKingUser', JSON.stringify(data.user));
                                console.log('Dados do usuário salvos:', data.user);
                            }
                            
                            // Mesma pasta que /login (evita 404 no mobile com /login/)
                            const params = new URLSearchParams(window.location.search);
                            const returnUrl = params.get('returnUrl');
                            function postLoginTarget() {
                                var ru = returnUrl && String(returnUrl).trim();
                                var looksLikeLogin = ru && /\/login(\.html)?([?#/]|$)|(^|\/)login\.html/i.test(ru);
                                if (ru && !looksLikeLogin) {
                                    if (/^https?:\/\/i.test(ru)) {
                                        try {
                                            var u = new URL(ru);
                                            if (u.origin === window.location.origin) {
                                                return u.href;
                                            }
                                        } catch (e1) {}
                                    } else if (ru.indexOf('/') === 0) {
                                        return window.location.origin + ru;
                                    } else {
                                        try {
                                            return new URL(ru, window.location.href).href;
                                        } catch (e2) {}
                                    }
                                }
                                try {
                                    return new URL('/dashboard', window.location.origin).href;
                                } catch (e3) {
                                    return '/dashboard';
                                }
                            }
                            setTimeout(function () {
                                var t = postLoginTarget();
                                console.log('Redirecionando para', t);
                                window.location.href = t;
                            }, 800);
                        } else {
                            console.error('O Erro no login:', data);
                            if (messageDiv) {
                                messageDiv.textContent = data.message || data.error || 'Erro ao fazer login. Tente novamente.';
                                messageDiv.className = 'message error';
                            }
                            
                            // Reabilitar botão
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Entrar no Sistema';
                            }
                        }
                    } catch (error) {
                        console.error('O Erro ao fazer login:', error);
                        
                        let errorMessage = 'Não foi possível conectar ao servidor.';
                        if (error && error.name === 'AbortError') {
                            errorMessage = 'Tempo limite excedido. O servidor pode estar a demorar a responder. Aguarde alguns segundos e tente novamente.';
                        } else if (error && error.message && error.message.toLowerCase().includes('fetch')) {
                            errorMessage = 'Não foi possível conectar à API. Pode ser instabilidade momentânea. Tente novamente em alguns segundos.';
                        } else if (error.message) {
                            errorMessage = 'Erro: ' + error.message;
                        }
                        
                        if (messageDiv) {
                            messageDiv.textContent = errorMessage;
                            messageDiv.className = 'message error';
                        }
                        
                        // Reabilitar botão
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Entrar no Sistema';
                        }
                    }
                });
                
                // Lógica para mostrar/esconder senha
                const passwordToggle = document.querySelector('.password-toggle');
                if (passwordToggle) {
                    passwordToggle.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const passwordInput = document.getElementById('password');
                        if (passwordInput) {
                            if (passwordInput.type === 'password') {
                                passwordInput.type = 'text';
                                passwordToggle.classList.remove('fa-eye-slash');
                                passwordToggle.classList.add('fa-eye');
                            } else {
                                passwordInput.type = 'password';
                                passwordToggle.classList.remove('fa-eye');
                                passwordToggle.classList.add('fa-eye-slash');
                            }
                        }
                    });
                }
                
                // Também adicionar listener direto no botão como fallback
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.addEventListener('click', function(e) {
                        console.log('Botão de submit clicado diretamente');
                        // O evento de submit do form já vai ser disparado
                    });
                }
                
                console.log('Login inicializado com sucesso');
            }
            
            // Aguardar DOM estar pronto
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initLogin);
            } else {
                // DOM já está pronto
                initLogin();
            }
        })();
    </script>
</body>