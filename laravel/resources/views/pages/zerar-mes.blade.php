<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestão do mês - Conecta King</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    </head>
<body>
    <div class="container">
        <header>
            <h1><i class="fas fa-eraser"></i> Gestão do mês</h1>
            <a href="/dashboard#finance" class="back"><i class="fas fa-arrow-left"></i> Voltar ao painel</a>
        </header>

        <div class="month-bar">
            <span class="label">Mês:</span>
            <select id="sel-month">
                <option value="1">Janeiro</option>
                <option value="2">Fevereiro</option>
                <option value="3">Março</option>
                <option value="4">Abril</option>
                <option value="5">Maio</option>
                <option value="6">Junho</option>
                <option value="7">Julho</option>
                <option value="8">Agosto</option>
                <option value="9">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
            </select>
            <span class="label">Ano:</span>
            <select id="sel-year"></select>
        </div>

        <div id="error-msg" class="error ck-hidden"></div>
        <div id="loading" class="loading ck-hidden"><i class="fas fa-spinner fa-spin"></i> Carregando lançamentos...</div>
        <div id="content" class="card ck-hidden">
            <div class="summary" id="summary"></div>
            <div class="toolbar">
                <label><input type="checkbox" id="check-all"> Selecionar todos</label>
                <button type="button" class="btn btn-danger ck-hidden" id="btn-delete-selected"><i class="fas fa-trash-alt"></i> Excluir selecionados</button>
            </div>
            <div class="list" id="list"></div>
        </div>
        <div id="empty" class="empty card ck-hidden">
            <i class="fas fa-inbox"></i>
            <p>Nenhum lançamento neste mês.</p>
            <a href="/dashboard#finance" class="btn btn-outline ck-zm-9c9cee">Voltar ao painel</a>
        </div>
    </div>

    
    <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/css/fontawesome.css', 'resources/js/pages/zerar-mes.js'])
</body>
</html>
