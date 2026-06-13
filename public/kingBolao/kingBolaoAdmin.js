(function () {
  const API = resolveApi();
  const token = localStorage.getItem('conectaKingToken') || '';
  const HEADERS = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const app = document.getElementById('kb-admin-app');
  const errEl = document.getElementById('kb-error');

  let events = [];
  let currentId = null;
  let detail = null;

  const KB_API_FALLBACK = 'https://conectaking-api.onrender.com';

  function resolveApi() {
    const tryList = [
      window.API_URL,
      window.API_BASE,
      window.API_CONFIG && window.API_CONFIG.baseURL,
      KB_API_FALLBACK
    ];
    for (const v of tryList) {
      const raw = String(v || '').trim().replace(/\/$/, '');
      if (!raw || !/^https?:\/\//i.test(raw)) continue;
      try {
        const h = new URL(raw).hostname.toLowerCase();
        if (h === 'conectaking.com.br' || h === 'www.conectaking.com.br') continue;
        return raw;
      } catch (_) { /* próximo */ }
    }
    return KB_API_FALLBACK;
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function showError(m) {
    errEl.textContent = m;
    errEl.classList.add('show');
  }

  async function api(path, opts = {}) {
    const res = await fetch(`${API}/api/king-bolao${path}`, {
      ...opts,
      headers: { ...HEADERS, ...(opts.headers || {}) }
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
      throw new Error('Sessão expirada');
    }
    if (!res.ok) throw new Error(data.message || 'Erro na API');
    return data;
  }

  async function init() {
    if (!token) {
      window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
      return;
    }
    try {
      const access = await api('/access-check');
      if (!access.allowed) {
        app.innerHTML = '<div class="kb-card"><p>Acesso ao King Bolão não liberado para esta conta.</p></div>';
        return;
      }
      const q = new URLSearchParams(window.location.search);
      currentId = parseInt(q.get('eventId'), 10) || null;
      const list = await api('/events');
      events = list.events || [];
      if (currentId) await loadDetail(currentId);
      else renderList();
    } catch (e) {
      showError(e.message);
      app.innerHTML = '';
    }
  }

  function renderList() {
    const items = events.map((e) => {
      const url = `${window.location.origin}/bolao/${encodeURIComponent(e.slug)}`;
      return `<div class="kb-card">
        <b>${esc(e.title)}</b>
        <div class="kb-label">${esc(e.slug)} · ${esc(e.status)} · ${e.approved_count || 0} aprovados</div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          <a class="kb-btn kb-btn-secondary" href="?eventId=${e.id}">Gerenciar</a>
          <a class="kb-btn kb-btn-secondary" href="${esc(url)}" target="_blank">Abrir público</a>
        </div>
      </div>`;
    }).join('');
    app.innerHTML = `
      <div class="kb-card">
        <h2>Novo bolão</h2>
        <input class="kb-input" id="new-title" placeholder="Nome do bolão" />
        <input class="kb-input" id="new-home" placeholder="Time casa" />
        <input class="kb-input" id="new-away" placeholder="Time visitante" />
        <input class="kb-input" id="new-pix" placeholder="Chave Pix" />
        <input class="kb-input" id="new-holder" placeholder="Nome titular Pix" />
        <button class="kb-btn kb-btn-primary" id="btn-create">Criar bolão</button>
      </div>
      <h2 style="color:var(--kb-muted);font-size:0.9rem;text-transform:uppercase">Meus bolões</h2>
      ${items || '<p>Nenhum bolão ainda.</p>'}
    `;
    document.getElementById('btn-create').onclick = createEvent;
  }

  async function createEvent() {
    try {
      const body = {
        title: document.getElementById('new-title').value.trim(),
        team_home_name: document.getElementById('new-home').value.trim(),
        team_away_name: document.getElementById('new-away').value.trim(),
        pix_key: document.getElementById('new-pix').value.trim(),
        pix_holder_name: document.getElementById('new-holder').value.trim(),
        status: 'open',
        groups: [{ name: 'Grupo R$ 10', entry_cents: 1000 }, { name: 'Grupo R$ 20', entry_cents: 2000 }]
      };
      const data = await api('/events', { method: 'POST', body: JSON.stringify(body) });
      window.location.href = `?eventId=${data.event.id}`;
    } catch (e) {
      showError(e.message);
    }
  }

  async function loadDetail(id) {
    detail = await api(`/events/${id}`);
    renderDetail();
  }

  function renderDetail() {
    const ev = detail.event;
    const publicUrl = `${window.location.origin}/bolao/${encodeURIComponent(ev.slug)}`;
    const pending = (detail.participants || []).filter((p) => p.status === 'pending_approval');
    const pendingHtml = pending.map((p) => {
      const proofUrl = `${API}/api/king-bolao/participants/${p.id}/proof?token=${encodeURIComponent(token)}`;
      return `<div class="kb-pending">
        <b>${esc(p.name)}</b> · ${esc(p.group_name)} · ${p.prediction_home}×${p.prediction_away}
        <div class="kb-label">${esc(p.whatsapp)}</div>
        ${p.proof_file_path ? `<img class="kb-thumb" src="${proofUrl}" alt="comprovante" onclick="window.open(this.src)" />` : ''}
        <div style="margin-top:6px">
          <button class="kb-btn kb-btn-primary kb-approve" data-id="${p.id}">Aprovar</button>
          <button class="kb-btn kb-btn-secondary kb-reject" data-id="${p.id}">Recusar</button>
        </div>
      </div>`;
    }).join('') || '<p>Nenhum comprovante pendente.</p>';

    const groupsHtml = (detail.groups || []).map((g) =>
      `<div class="kb-label">${esc(g.name)} — ${g.approved_count} aprovados · Bruto ${esc(g.gross_label)} · Seu ${Math.round(g.ownerPct || 30)}%: ${esc(g.owner_cut_label)} · Prêmio 70%: ${esc(g.winner_pool_label)}</div>`
    ).join('');

    app.innerHTML = `
      <a href="/kingBolao" class="kb-label" style="display:inline-block;margin-bottom:12px">← Voltar</a>
      <div class="kb-card">
        <h2>${esc(ev.title)}</h2>
        <div class="kb-match">${esc(ev.team_home_name)} × ${esc(ev.team_away_name)}</div>
        <div class="kb-label" style="margin-top:8px">Link: <a href="${esc(publicUrl)}" target="_blank" style="color:#86efac">${esc(publicUrl)}</a></div>
        <button class="kb-btn kb-btn-secondary" id="btn-copy-link" style="margin-top:8px">Copiar link</button>
      </div>
      <div class="kb-admin-grid">
        <div class="kb-card">
          <h2>Configuração Pix</h2>
          <input class="kb-input" id="cfg-pix" value="${esc(ev.pix_key || '')}" placeholder="Chave Pix" />
          <input class="kb-input" id="cfg-holder" value="${esc(ev.pix_holder_name || '')}" placeholder="Titular" />
          <button class="kb-btn kb-btn-primary" id="btn-save-cfg">Salvar</button>
          <div class="kb-label" style="margin-top:12px">Capa do link</div>
          <input type="file" accept="image/*" id="cfg-cover" />
          <button class="kb-btn kb-btn-secondary" id="btn-cover" style="margin-top:8px">Enviar capa</button>
        </div>
        <div class="kb-card">
          <h2>Publicar resultado</h2>
          <div class="kb-row">
            <input class="kb-input" id="res-h" type="number" min="0" placeholder="Gols casa" />
            <input class="kb-input" id="res-a" type="number" min="0" placeholder="Gols visitante" />
          </div>
          <button class="kb-btn kb-btn-primary" id="btn-result">Publicar placar final</button>
        </div>
      </div>
      <div class="kb-card">
        <h2>Financeiro por grupo</h2>
        ${groupsHtml}
        <div class="kb-label" style="margin-top:8px">Total participantes: ${(detail.participants || []).filter((p) => ['approved', 'winner', 'loser'].includes(p.status)).length}</div>
      </div>
      <div class="kb-card">
        <h2>Aguardando aprovação (${pending.length})</h2>
        ${pendingHtml}
      </div>
      <div class="kb-card">
        <h2>Todos participantes (${(detail.participants || []).length})</h2>
        <ul class="kb-list">
          ${(detail.participants || []).map((p) =>
            `<li><span>${esc(p.name)} · ${p.prediction_home}×${p.prediction_away} · ${esc(p.status)}</span></li>`
          ).join('')}
        </ul>
      </div>
    `;

    document.getElementById('btn-copy-link').onclick = () => {
      navigator.clipboard.writeText(publicUrl).then(() => alert('Link copiado!'));
    };
    document.getElementById('btn-save-cfg').onclick = saveCfg;
    document.getElementById('btn-cover').onclick = uploadCover;
    document.getElementById('btn-result').onclick = publishResult;
    document.querySelectorAll('.kb-approve').forEach((b) => {
      b.onclick = () => approve(parseInt(b.dataset.id, 10));
    });
    document.querySelectorAll('.kb-reject').forEach((b) => {
      b.onclick = () => reject(parseInt(b.dataset.id, 10));
    });
  }

  async function saveCfg() {
    try {
      await api(`/events/${currentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          pix_key: document.getElementById('cfg-pix').value.trim(),
          pix_holder_name: document.getElementById('cfg-holder').value.trim()
        })
      });
      await loadDetail(currentId);
      alert('Salvo!');
    } catch (e) {
      showError(e.message);
    }
  }

  async function uploadCover() {
    const file = document.getElementById('cfg-cover').files[0];
    if (!file) return alert('Selecione uma imagem');
    const fd = new FormData();
    fd.append('cover', file);
    const res = await fetch(`${API}/api/king-bolao/events/${currentId}/cover`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return showError(j.message);
    alert('Capa enviada!');
    loadDetail(currentId);
  }

  async function publishResult() {
    const rh = parseInt(document.getElementById('res-h').value, 10);
    const ra = parseInt(document.getElementById('res-a').value, 10);
    if (!Number.isFinite(rh) || !Number.isFinite(ra)) return alert('Informe o placar');
    if (!confirm(`Publicar resultado ${rh}×${ra}?`)) return;
    try {
      await api(`/events/${currentId}/publish-result`, {
        method: 'POST',
        body: JSON.stringify({ result_home: rh, result_away: ra })
      });
      await loadDetail(currentId);
      alert('Resultado publicado!');
    } catch (e) {
      showError(e.message);
    }
  }

  async function approve(id) {
    try {
      await api(`/participants/${id}/approve`, { method: 'POST', body: '{}' });
      await loadDetail(currentId);
    } catch (e) {
      showError(e.message);
    }
  }

  async function reject(id) {
    try {
      await api(`/participants/${id}/reject`, { method: 'POST', body: '{}' });
      await loadDetail(currentId);
    } catch (e) {
      showError(e.message);
    }
  }

  init();
})();
