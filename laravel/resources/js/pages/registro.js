import '@css/style.css';
import '@css/auth.css';
import { getApiBase } from './auth-api.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const registrationCode = document.getElementById('registrationCode').value;
    const messageDiv = document.getElementById('message');
    try {
      const response = await fetch(getApiBase() + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password, registrationCode }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        messageDiv.textContent = data.message || 'Conta criada com sucesso.';
        messageDiv.className = 'message success';
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        messageDiv.textContent = data.message || 'Não foi possível criar a conta.';
        messageDiv.className = 'message error';
      }
    } catch (_) {
      messageDiv.textContent = 'Erro de conexão com o servidor.';
      messageDiv.className = 'message error';
    }
  });

  const passwordToggle = document.querySelector('.password-toggle');
  if (passwordToggle) {
    passwordToggle.addEventListener('click', () => {
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
});
