(function () {
  const API = resolveApi();
  const path = window.location.pathname || '';
  const meMatch = path.match(/\/bolao\/([^/]+)\/m\/([^/]+)/i);
  const slugMatch = path.match(/\/bolao\/([^/]+)/i);
  const slug = meMatch ? decodeURIComponent(meMatch[1]) : (slugMatch ? decodeURIComponent(slugMatch[1]) : '');
  const meToken = meMatch ? decodeURIComponent(meMatch[2]) : '';

  const errEl = document.getElementById('kb-error');
  const loadingEl = document.getElementById('kb-loading');
  const publicEl = document.getElementById('kb-public');
  const meEl = document.getElementById('kb-me');

  let pollTimer = null;
  let registerState = null;

  function resolveApi() {
    const list = [window.API_URL, window.API_BASE, 'https://conectaking-api.onrender.com'];
    for (const v of list) {
      const raw = String(v || '').trim().replace(/\/$/, '');
      if (raw && /^https?:\/\//i.test(raw)) return raw;
    }
    return window.location.origin;
  }

  function showError(msg) {
    errEl.textContent = msg || 'Erro';
    errEl.classList.add('show');
  }

  function hideError() {
    errEl.classList.remove('show');
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function fmtScore(h, a) {
    return `${h}×${a}`;
  }

  async function init() {
    hideError();
    if (meToken) {
      loadingEl.classList.add('kb-hidden');
      meEl.classList.remove('kb-hidden');
      await loadMe();
      pollTimer = setInterval(loadMe, 20000);
      return;
    }
    if (!slug) {
      loadingEl.textContent = 'Link inválido.';
      return;
    }
    await loadPublic();
    pollTimer = setInterval(loadPublic, 20000);
  }

  async function loadPublic() {
    try {
      const res = await fetch(`${API}/api/king-bolao/public/event/${encodeURIComponent(slug)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Bolão não encontrado');
      loadingEl.classList.add('kb-hidden');
      publicEl.classList.remove('kb-hidden');
      renderPublic(data.event);
    } catch (e) {
      if (!publicEl.innerHTML) {
        loadingEl.textContent = e.message || 'Erro ao carregar';
      }
    }
  }

  function renderPublic(ev) {
    const live = ev.live_home != null ? fmtScore(ev.live_home, ev.live_away) : null;
    const result = ev.result_published_at ? fmtScore(ev.result_home, ev.result_away) : null;
    const cover = ev.cover_image_path
      ? `<img class="kb-cover" src="${API}/api/king-bolao/public/cover?slug=${encodeURIComponent(slug)}" alt="" onerror="this.style.display='none'" />`
      : '';

    let groupsHtml = (ev.groups || []).map((g) => {
      const preds = (g.predictions || []).map((p) => {
        let badge = '';
        if (p.status === 'winner') badge = '<span class="kb-badge-win">GANHOU</span>';
        else if (p.status === 'loser') badge = '<span class="kb-badge-lose">—</span>';
        else if (result) badge = '<span class="kb-badge-lose">—</span>';
        return `<li><span><b>${esc(p.name)}</b> · ${esc(p.prediction)}</span>${badge}</li>`;
      }).join('');
      let winLine = '';
      if (g.winner_count > 0) {
        winLine = `<div class="kb-label" style="margin-top:8px;color:#86efac">${g.winner_count} ganhador(es) · ${esc(g.prize_each_label)} cada</div>`;
      }
      return `<div class="kb-card">
        <h2>${esc(g.name)} · ${esc(g.entry_label)}</h2>
        <div class="kb-label">Prêmio acumulado (70%)</div>
        <div class="kb-pool">${esc(g.winner_pool_label)}</div>
        ${winLine}
        <ul class="kb-list" style="margin-top:12px">${preds || '<li class="kb-muted">Nenhum palpite aprovado ainda</li>'}</ul>
      </div>`;
    }).join('');

    const formBlock = registerState ? renderPixStep(registerState) : renderForm(ev);

    publicEl.innerHTML = `
      <div class="kb-hero">
        ${cover}
        <h1>${esc(ev.title)}</h1>
        <div class="kb-match">${esc(ev.team_home_name)} × ${esc(ev.team_away_name)}</div>
        ${live ? `<div class="kb-label" style="margin-top:8px">Ao vivo: ${esc(live)}</div>` : ''}
        ${result ? `<div class="kb-label" style="margin-top:8px;color:#86efac">Resultado final: ${esc(result)}</div>` : ''}
      </div>
      ${groupsHtml}
      ${ev.status === 'open' ? formBlock : '<div class="kb-card"><p>Palpites encerrados.</p></div>'}
    `;

    if (!registerState) bindForm(ev);
    else bindPix(registerState);
  }

  function renderForm(ev) {
    const opts = (ev.groups || []).map((g) =>
      `<option value="${g.id}">${esc(g.name)} — ${esc(g.entry_label)}</option>`
    ).join('');
    return `<div class="kb-card" id="kb-form-card">
      <h2>Seu palpite</h2>
      <input class="kb-input" id="kb-name" placeholder="Seu nome" maxlength="255" />
      <input class="kb-input" id="kb-whats" placeholder="WhatsApp (com DDD)" inputmode="tel" />
      <select class="kb-select" id="kb-group">${opts}</select>
      <div class="kb-label">Placar</div>
      <div class="kb-quick" id="kb-quick">
        ${['0×0', '1×0', '0×1', '1×1', '2×1', '1×2', '2×2', '3×1', '1×3'].map((s) =>
          `<button type="button" data-score="${s}">${s}</button>`
        ).join('')}
      </div>
      <div class="kb-row">
        <input class="kb-input" id="kb-ph" type="number" min="0" max="20" placeholder="Casa" />
        <input class="kb-input" id="kb-pa" type="number" min="0" max="20" placeholder="Visitante" />
      </div>
      <button class="kb-btn kb-btn-primary" id="kb-submit">Continuar para Pix</button>
    </div>`;
  }

  function bindForm(ev) {
    document.querySelectorAll('#kb-quick button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [h, a] = btn.getAttribute('data-score').split('×');
        document.getElementById('kb-ph').value = h;
        document.getElementById('kb-pa').value = a;
      });
    });
    document.getElementById('kb-submit')?.addEventListener('click', async () => {
      hideError();
      const name = document.getElementById('kb-name').value.trim();
      const whatsapp = document.getElementById('kb-whats').value.trim();
      const group_id = parseInt(document.getElementById('kb-group').value, 10);
      const prediction_home = parseInt(document.getElementById('kb-ph').value, 10);
      const prediction_away = parseInt(document.getElementById('kb-pa').value, 10);
      try {
        const res = await fetch(`${API}/api/king-bolao/public/event/${encodeURIComponent(slug)}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, whatsapp, group_id, prediction_home, prediction_away })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Erro ao cadastrar');
        registerState = data;
        localStorage.setItem(`kb_me_${slug}`, data.participant.access_token);
        const res2 = await fetch(`${API}/api/king-bolao/public/event/${encodeURIComponent(slug)}`);
        const data2 = await res2.json().catch(() => ({}));
        if (data2.event) renderPublic(data2.event);
      } catch (e) {
        showError(e.message);
      }
    });
  }

  function renderPixStep(data) {
    const p = data.participant;
    const pix = data.pix;
    return `<div class="kb-card" id="kb-pix-card">
      <h2>Pagamento Pix</h2>
      <p>Palpite <b>${esc(p.prediction)}</b> · ${esc(p.group_name)}</p>
      <div class="kb-label">Valor</div>
      <div class="kb-pool" style="font-size:1.2rem">${esc(pix.amount_label)}</div>
      <div class="kb-label">Titular</div>
      <p>${esc(pix.pix_holder_name || '—')}</p>
      <div class="kb-label">Chave Pix</div>
      <div class="kb-pix-box" id="kb-pix-key">${esc(pix.pix_key)}</div>
      <button type="button" class="kb-btn kb-btn-secondary" id="kb-copy-key">Copiar chave</button>
      <button type="button" class="kb-btn kb-btn-secondary" id="kb-copy-br" style="margin-top:8px;width:100%">Copiar Pix copia e cola</button>
      <textarea class="kb-input kb-hidden" id="kb-brcode" readonly>${esc(pix.brcode)}</textarea>
      <div class="kb-label" style="margin-top:16px">Envie o comprovante</div>
      <input type="file" accept="image/*" id="kb-proof" capture="environment" />
      <button class="kb-btn kb-btn-primary" id="kb-send-proof" style="margin-top:12px">Enviar comprovante</button>
      <div class="kb-label" style="margin-top:16px">Seu link para acompanhar:</div>
      <div class="kb-pix-box"><a href="${esc(p.me_url)}" style="color:#86efac">${esc(p.me_url)}</a></div>
      <button type="button" class="kb-btn kb-btn-secondary" id="kb-copy-me" style="margin-top:8px;width:100%">Copiar link Meu Palpite</button>
    </div>`;
  }

  function bindPix(data) {
    const token = data.participant.access_token;
    document.getElementById('kb-copy-key')?.addEventListener('click', () => {
      copyText(data.pix.pix_key);
    });
    document.getElementById('kb-copy-br')?.addEventListener('click', () => {
      copyText(data.pix.brcode);
    });
    document.getElementById('kb-copy-me')?.addEventListener('click', () => {
      copyText(data.participant.me_url);
    });
    document.getElementById('kb-send-proof')?.addEventListener('click', async () => {
      const file = document.getElementById('kb-proof')?.files?.[0];
      if (!file) return showError('Selecione a foto do comprovante.');
      hideError();
      const fd = new FormData();
      fd.append('proof', file);
      fd.append('access_token', token);
      try {
        const res = await fetch(`${API}/api/king-bolao/public/payment-proof`, { method: 'POST', body: fd });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.message || 'Erro ao enviar');
        registerState = null;
        alert(j.message || 'Comprovante enviado!');
        window.location.href = data.participant.me_url;
      } catch (e) {
        showError(e.message);
      }
    });
  }

  async function loadMe() {
    try {
      const res = await fetch(`${API}/api/king-bolao/public/me/${encodeURIComponent(meToken)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Link inválido');
      renderMe(data.me);
    } catch (e) {
      meEl.innerHTML = `<div class="kb-card"><p>${esc(e.message)}</p></div>`;
    }
  }

  function renderMe(me) {
    let statusBlock = `<div class="kb-card"><div class="kb-label">Status</div><p><b>${esc(me.status_label)}</b></p></div>`;
    if (me.is_winner) {
      statusBlock = `<div class="kb-status-win">🎉 Você ganhou! ${esc(me.prize_each_label || '')}</div>`;
    } else if (me.is_loser) {
      statusBlock = `<div class="kb-status-lose">Não acertou o placar desta vez</div>`;
    }

    let pixBlock = '';
    if (me.can_upload_proof && me.pix) {
      pixBlock = `<div class="kb-card">
        <h2>Pagar via Pix</h2>
        <div class="kb-pool">${esc(me.pix.amount_label)}</div>
        <div class="kb-pix-box">${esc(me.pix.pix_key)}</div>
        <input type="file" accept="image/*" id="kb-proof-me" />
        <button class="kb-btn kb-btn-primary" id="kb-proof-me-btn" style="margin-top:10px">Enviar comprovante</button>
      </div>`;
    }

    meEl.innerHTML = `
      <div class="kb-hero">
        <h1>${esc(me.event_title)}</h1>
        <p>Palpite: <b>${esc(me.prediction)}</b> · ${esc(me.group_name)}</p>
      </div>
      ${statusBlock}
      <div class="kb-card">
        <div class="kb-label">Prêmio acumulado do seu grupo</div>
        <div class="kb-pool">${esc(me.winner_pool_label)}</div>
        ${me.result ? `<div class="kb-label" style="margin-top:8px">Resultado: ${esc(me.result)}</div>` : ''}
      </div>
      ${pixBlock}
      <a class="kb-btn kb-btn-secondary" style="display:block;text-align:center;text-decoration:none" href="${esc(me.event_url)}">Ver bolão completo</a>
    `;

    document.getElementById('kb-proof-me-btn')?.addEventListener('click', async () => {
      const file = document.getElementById('kb-proof-me')?.files?.[0];
      if (!file) return showError('Selecione o comprovante.');
      const fd = new FormData();
      fd.append('proof', file);
      fd.append('access_token', meToken);
      const res = await fetch(`${API}/api/king-bolao/public/payment-proof`, { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return showError(j.message);
      alert(j.message);
      loadMe();
    });
  }

  function copyText(t) {
    navigator.clipboard?.writeText(t).then(() => alert('Copiado!')).catch(() => {
      prompt('Copie:', t);
    });
  }

  init();
})();
