import '@css/pages/resetar-senha.css';
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form');
  if (!form) return;

  const msg = document.getElementById('msg');
  const btn = document.getElementById('btn');
  const tokenEl = document.getElementById('token');
  const password = document.getElementById('password');
  const confirm = document.getElementById('confirm');
  if (!msg || !btn || !tokenEl || !password || !confirm) return;

  const token = tokenEl.value;

  function showMsg(text, isError) {
    msg.textContent = text;
    msg.className = 'msg ' + (isError ? 'error' : 'success');
    msg.style.display = 'block';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const pwd = password.value;
    const pwdConfirm = confirm.value;
    if (pwd.length < 6) {
      showMsg('A senha precisa ter no mínimo 6 caracteres.', true);
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwd)) {
      showMsg('A senha deve conter maiúscula, minúscula e número.', true);
      return;
    }
    if (pwd !== pwdConfirm) {
      showMsg('As senhas não coincidem.', true);
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Alterando...';
    msg.style.display = 'none';

    try {
      const res = await fetch('/api/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token, password: pwd }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        showMsg('Senha alterada com sucesso! Você já pode fazer login.', false);
        form.reset();
        setTimeout(function () {
          window.location.href = '/login';
        }, 2500);
      } else {
        showMsg(
          data.message || 'Token inválido ou expirado. Solicite uma nova recuperação.',
          true
        );
      }
    } catch (_) {
      showMsg('Erro de conexão. Tente novamente.', true);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> Alterar senha';
    }
  });
});
