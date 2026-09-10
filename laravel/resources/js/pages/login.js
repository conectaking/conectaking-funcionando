/**
 * Login page — Vite entry (extraído do Blade legado).
 */
import '@legacy/style.css';
import '@legacy/auth.css';

(function initLoginPage() {
  'use strict';

  function initLogin() {
    const isLocal =
      typeof location !== 'undefined' &&
      (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

    let reason = '';
    try {
      reason = sessionStorage.getItem('conectaKingLoginReason') || '';
    } catch (_) {
      /* ignore */
    }
    if (reason) {
      try {
        sessionStorage.removeItem('conectaKingLoginReason');
      } catch (_) {
        /* ignore */
      }
    }

    const hintEl = document.getElementById('localhost-hint');
    if (hintEl && isLocal && (reason === 'refresh_500' || reason === 'localhost_401')) {
      hintEl.style.display = 'block';
      hintEl.innerHTML =
        reason === 'refresh_500'
          ? '<strong>KingBrief no localhost:</strong> O servidor devolveu erro 500 ao renovar o token. Faça login abaixo. Confirme que o Laravel está no ar (<code>/health</code>) e tente de novo.'
          : '<strong>KingBrief no localhost:</strong> Sessão inválida ou expirada. Faça login. Se o problema repetir, rode a migration 001 (refresh_tokens), reinicie o backend e entre de novo.';
    }

    const loginForm = document.getElementById('login-form');
    if (!loginForm) {
      console.error('Formulário de login não encontrado!');
      return;
    }

    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      e.stopPropagation();

      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const messageDiv = document.getElementById('message');
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      if (!emailInput || !passwordInput) {
        if (messageDiv) {
          messageDiv.textContent = 'Erro: Campos do formulário não encontrados.';
          messageDiv.className = 'message error';
        }
        return;
      }

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        if (messageDiv) {
          messageDiv.textContent = 'Por favor, preencha todos os campos.';
          messageDiv.className = 'message error';
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
      }
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
          return new Promise((resolve) => setTimeout(resolve, ms));
        }

        async function fetchWithTimeout(url, options, timeoutMs) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
          try {
            return await fetch(url, { ...options, signal: controller.signal });
          } finally {
            clearTimeout(timeoutId);
          }
        }

        function getApiBase() {
          // Mesma origem no domínio do produto; em localhost usa config.js
          const host = String(window.location.hostname || '').toLowerCase();
          if (
            host.endsWith('conectaking.com.br') ||
            host === 'cnking.bio' ||
            host === 'www.cnking.bio'
          ) {
            return window.location.origin;
          }
          const base =
            window.API_URL ||
            window.API_BASE ||
            (typeof API_CONFIG !== 'undefined' && API_CONFIG.baseURL) ||
            PROD;
          if (!isLocalPage()) return PROD;
          return base || PROD;
        }

        async function warmUpApi(apiBase) {
          try {
            await fetchWithTimeout(apiBase + '/health', { method: 'GET', cache: 'no-store' }, 8000);
          } catch (_) {
            /* ignore */
          }
        }

        async function loginWithRetry(apiBase, payload) {
          const attempts = [
            { wait: 0, timeout: 20000 },
            { wait: 1200, timeout: 30000 },
            { wait: 2500, timeout: 30000 },
          ];

          let lastErr = null;
          for (let i = 0; i < attempts.length; i++) {
            const a = attempts[i];
            if (a.wait) await sleep(a.wait);

            if (submitBtn) {
              submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Conectando... (${i + 1}/${attempts.length})`;
            }

            try {
              return await fetchWithTimeout(
                apiBase + '/api/auth/login',
                {
                  method: 'POST',
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'Cache-Control': 'no-cache',
                  },
                  body: JSON.stringify(payload),
                },
                a.timeout
              );
            } catch (err) {
              lastErr = err;
            }
          }
          throw lastErr || new Error('Falha ao conectar');
        }

        const apiBase = getApiBase();
        await warmUpApi(apiBase);
        const response = await loginWithRetry(apiBase, { email, password });

        let data;
        try {
          const text = await response.text();
          data = text ? JSON.parse(text) : {};
        } catch (_) {
          throw new Error('Resposta inválida do servidor');
        }

        if (response.ok) {
          if (messageDiv) {
            messageDiv.textContent = data.message || 'Login realizado com sucesso!';
            messageDiv.className = 'message success';
          }

          if (data.token) {
            localStorage.setItem('conectaKingToken', data.token);
            // Cookie HttpOnly vem no Set-Cookie do login API (AuthenticateJwt).
            // Não gravar document.cookie — JS não consegue sobrescrever HttpOnly.
          }
          if (data.refreshToken) {
            localStorage.setItem('conectaKingRefreshToken', data.refreshToken);
          }
          if (data.user) {
            localStorage.setItem('conectaKingUser', JSON.stringify(data.user));
          }

          const params = new URLSearchParams(window.location.search);
          const returnUrl = params.get('returnUrl');

          function postLoginTarget() {
            const ru = returnUrl && String(returnUrl).trim();
            const looksLikeLogin =
              ru && /\/login(\.html)?([?#/]|$)|(^|\/)login\.html/i.test(ru);
            if (ru && !looksLikeLogin) {
              if (/^https?:\/\//i.test(ru)) {
                try {
                  const u = new URL(ru);
                  if (u.origin === window.location.origin) {
                    return u.href;
                  }
                } catch (_) {
                  /* ignore */
                }
              } else if (ru.indexOf('/') === 0) {
                return window.location.origin + ru;
              } else {
                try {
                  return new URL(ru, window.location.href).href;
                } catch (_) {
                  /* ignore */
                }
              }
            }
            try {
              return new URL('/dashboard', window.location.origin).href;
            } catch (_) {
              return '/dashboard';
            }
          }

          setTimeout(function () {
            window.location.href = postLoginTarget();
          }, 800);
        } else {
          if (messageDiv) {
            messageDiv.textContent =
              data.message || data.error || 'Erro ao fazer login. Tente novamente.';
            messageDiv.className = 'message error';
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Entrar no Sistema';
          }
        }
      } catch (error) {
        let errorMessage = 'Não foi possível conectar ao servidor.';
        if (error && error.name === 'AbortError') {
          errorMessage =
            'Tempo limite excedido. O servidor pode estar a demorar a responder. Aguarde alguns segundos e tente novamente.';
        } else if (error && error.message && error.message.toLowerCase().includes('fetch')) {
          errorMessage =
            'Não foi possível conectar à API. Pode ser instabilidade momentânea. Tente novamente em alguns segundos.';
        } else if (error && error.message) {
          errorMessage = 'Erro: ' + error.message;
        }

        if (messageDiv) {
          messageDiv.textContent = errorMessage;
          messageDiv.className = 'message error';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Entrar no Sistema';
        }
      }
    });

    const passwordToggle = document.querySelector('.password-toggle');
    if (passwordToggle) {
      passwordToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const passwordInput = document.getElementById('password');
        if (!passwordInput) return;
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogin);
  } else {
    initLogin();
  }
})();
