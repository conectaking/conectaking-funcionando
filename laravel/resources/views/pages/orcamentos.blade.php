<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Orçamentos - ConectaKing</title>
  </head>
<body>
  <div class="layout">
    <h1><i class="fas fa-file-invoice-dollar"></i> Orçamentos</h1>
    <div id="err" class="err"></div>
    <p class="ck-or-ccddb0">
      <a href="/recibos-orcamentos" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Voltar à página anterior</a>
      <a href="/dashboard" class="btn btn-secondary"><i class="fas fa-home"></i> Voltar ao dashboard</a>
    </p>

    <div class="card">
      <div class="filters">
        <span>Filtrar:</span>
        <select id="filter-ticket">
          <option value="">Todos os tickets</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select id="filter-status">
          <option value="">Todos os status</option>
          <option value="novo">Novo</option>
          <option value="em_contato">Em contato</option>
          <option value="orcamento_enviado">Orçamento enviado</option>
          <option value="convertido">Convertido</option>
          <option value="perdido">Perdido</option>
        </select>
        <button type="button" class="btn btn-secondary" id="btn-refresh"><i class="fas fa-sync-alt"></i> Atualizar</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Nome</th>
            <th>Contato</th>
            <th>Ticket</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="list-body">
          <tr><td colspan="5" class="empty">Carregando...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div id="overlay" class="overlay">
    <div class="modal">
      <h2 id="detail-nome">-</h2>
      <div class="body">
        <div class="row"><span class="label">E-mail</span><br><span id="detail-email">-</span></div>
        <div class="row"><span class="label">WhatsApp</span><br><span id="detail-whatsapp">-</span></div>
        <div class="row"><span class="label">Profissão</span><br><span id="detail-profissao">-</span></div>
        <div class="row"><span class="label">Ticket</span><br><span id="detail-ticket"></span></div>
        <div class="row"><span class="label">Por qu (classificao)</span><br><span class="ck-or-a3cb96" id="detail-reason">-</span></div>
        <div class="row"><span class="label">Recomendao</span><br><span class="ck-or-862b5e" id="detail-recommendation">-</span></div>
        <div class="row"><span class="label">Respostas do formulrio</span><br><ul id="detail-respostas" class="respostas-lista">-</ul></div>
        <div class="row">
          <label class="label">Alterar status</label>
          <select id="detail-status">
            <option value="novo">Novo</option>
            <option value="em_contato">Em contato</option>
            <option value="orcamento_enviado">Orçamento enviado</option>
            <option value="convertido">Convertido</option>
            <option value="perdido">Perdido</option>
          </select>
        </div>
      </div>
      <div class="footer">
        <div class="left">
          <button type="button" class="btn btn-secondary" id="btn-close-modal">Fechar</button>
          <button type="button" class="btn btn-danger" id="btn-delete"><i class="fas fa-trash-alt"></i> Excluir</button>
        </div>
        <button type="button" class="btn btn-primary ck-or-732f33" id="btn-save-status">Salvar status</button>
      </div>
    </div>
  </div>

      <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/css/fontawesome.css', 'resources/js/pages/orcamentos.js'])
</body>
</html>
