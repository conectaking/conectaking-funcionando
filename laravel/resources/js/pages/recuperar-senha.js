import '@css/pages/recuperar-senha.css';
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form');
  const msg = document.getElementById('msg');
  const btn = document.getElementById('btn');
  const emailInput = document.getElementById('email');
  if (!form || !msg || !btn || !emailInput) return;

  function showMsg(text, isError) {
    msg.textContent = text;
    msg.className = 'msg ' + (isError ? 'error' : 'success');
    msg.style.display = 'block';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) {
      showMsg('Informe seu e-mail.', true);
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    msg.style.display = 'none';

    try {
      const res = await fetch('/api/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        showMsg(
          'Se o e-mail existir, você receberá instruções para recuperar sua senha. Verifique sua caixa de entrada e spam.',
          false
        );
        form.reset();
      } else {
        showMsg(data.message || 'Ocorreu um erro. Tente novamente mais tarde.', true);
      }
    } catch (_) {
      showMsg('Erro de conexão. Verifique sua internet e tente novamente.', true);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar link de recuperação';
    }
  });
});
