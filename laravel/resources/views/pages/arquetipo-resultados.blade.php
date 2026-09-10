<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Testes de Arqutipo - ConectaKing</title>
  <link rel="stylesheet" href="/vendor/fontawesome/css/all.min.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #111; color: #eee; min-height: 100vh; padding: 20px; }
    .layout { max-width: 1000px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px; font-weight: 600; cursor: pointer; border: none; font-size: 0.95rem; text-decoration: none; }
    .btn-secondary { background: #333; color: #fff; }
    .btn-primary { background: #facc15; color: #000; }
    .card { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #333; }
    th { color: #facc15; font-size: 0.85rem; }
    tr.tr-main:hover { background: rgba(255,255,255,.04); }
    tr.tr-main { cursor: pointer; }
    .detalhe-expansivel-row td { vertical-align: top; padding: 0 !important; border-top: none; }
    .detalhe-card { margin: 12px 8px 16px; padding: 24px; background: rgba(250,204,21,0.06); border-radius: 12px; border-left: 4px solid #facc15; text-align: left; }
    .detalhe-card h4 { color: #facc15; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 12px; }
    .detalhe-card .secao { margin-bottom: 20px; }
    .detalhe-card .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px 24px; }
    .detalhe-card .item { font-size: 0.9rem; color: #ccc; }
    .detalhe-card .item strong { color: #fff; display: block; font-size: 0.75rem; margin-bottom: 2px; }
    .detalhe-card ul { list-style: none; padding: 0; margin: 8px 0; }
    .detalhe-card ul li { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,.06); display: flex; justify-content: space-between; gap: 12px; }
    .arq-bar { height: 8px; border-radius: 4px; background: rgba(255,255,255,.1); overflow: hidden; margin-top: 4px; }
    .arq-bar-fill { height: 100%; background: linear-gradient(90deg, #facc15, #eab308); border-radius: 4px; }
    .err { background: rgba(239,68,68,.15); color: #fecaca; padding: 12px; border-radius: 8px; margin-bottom: 16px; display: none; }
    .err.show { display: block; }
    .empty { color: #666; padding: 40px; text-align: center; }
  </style>
</head>
<body>
  <div class="layout">
    <h1><i class="fas fa-user-check"></i> Testes de Arqutipo</h1>
    <div id="err" class="err"></div>
    <p style="margin-bottom:20px">
      <a href="/dashboard" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Voltar ao dashboard</a>
    </p>

    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Nome</th>
            <th>E-mail</th>
            <th>1 Arqutipo</th>
            <th>Detalhes</th>
          </tr>
        </thead>
        <tbody id="list-body">
          <tr><td colspan="5" class="empty">Carregando...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

      <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/js/pages/arquetipo-resultados.js'])
</body>
</html>
