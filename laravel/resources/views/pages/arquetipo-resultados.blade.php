<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Testes de Arqutipo - ConectaKing</title>
  
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
    @vite(['resources/css/fontawesome.css', 'resources/js/pages/arquetipo-resultados.js'])
</body>
</html>
