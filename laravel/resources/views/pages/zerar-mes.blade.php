<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestão do mês - Conecta King</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <style>
        :root {
            --bg: #0a0a0c;
            --card: #16161a;
            --border: rgba(255,255,255,0.08);
            --text: #f1f5f9;
            --text2: #64748b;
            --green: #22c55e;
            --red: #ef4444;
            --blue: #3b82f6;
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Inter', -apple-system, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
        .container { max-width: 900px; margin: 0 auto; padding: 24px; }
        header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
        h1 { font-size: 1.5rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 10px; }
        h1 i { color: var(--blue); }
        .back { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; color: var(--text2); text-decoration: none; font-weight: 600; font-size: 0.9rem; transition: all 0.2s; }
        .back:hover { color: var(--text); border-color: rgba(59,130,246,0.4); background: rgba(59,130,246,0.08); }
        .month-bar { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
        .month-bar select { padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--card); color: var(--text); font-size: 0.95rem; cursor: pointer; }
        .month-bar .label { color: var(--text2); font-weight: 500; }
        .card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; margin-bottom: 20px; }
        .toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
        .toolbar label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text2); font-size: 0.9rem; }
        .toolbar input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: var(--blue); }
        .btn { padding: 10px 18px; border-radius: 10px; font-weight: 600; font-size: 0.9rem; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; text-decoration: none; }
        .btn-danger { background: rgba(239,68,68,0.2); color: var(--red); border: 1px solid rgba(239,68,68,0.4); }
        .btn-danger:hover { background: rgba(239,68,68,0.35); }
        .btn-outline { background: transparent; color: var(--text2); border: 1px solid var(--border); }
        .btn-outline:hover { color: var(--text); border-color: var(--text2); }
        .list { display: flex; flex-direction: column; gap: 10px; }
        .item { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; flex-wrap: wrap; }
        .item input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: var(--blue); flex-shrink: 0; }
        .item .type { width: 28px; text-align: center; font-weight: 700; font-size: 1rem; flex-shrink: 0; }
        .item .type.receita { color: var(--green); }
        .item .type.despesa { color: var(--red); }
        .item .desc { flex: 1; min-width: 120px; font-size: 0.95rem; }
        .item .date { color: var(--text2); font-size: 0.85rem; white-space: nowrap; }
        .item .amount { font-weight: 700; font-size: 1rem; white-space: nowrap; }
        .item .amount.receita { color: var(--green); }
        .item .amount.despesa { color: var(--red); }
        .item .btn-remove { padding: 6px 12px; border-radius: 8px; border: none; background: rgba(239,68,68,0.15); color: var(--red); cursor: pointer; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
        .item .btn-remove:hover { background: rgba(239,68,68,0.3); }
        .empty { text-align: center; padding: 48px 24px; color: var(--text2); font-size: 1rem; }
        .empty i { font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5; }
        .loading { text-align: center; padding: 48px; color: var(--text2); }
        .error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; padding: 14px 18px; border-radius: 12px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px; font-size: 0.9rem; color: var(--text2); }
        .summary span strong { color: var(--text); margin-right: 4px; }
    </style>
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

        <div id="error-msg" class="error" style="display: none;"></div>
        <div id="loading" class="loading" style="display: none;"><i class="fas fa-spinner fa-spin"></i> Carregando lançamentos...</div>
        <div id="content" class="card" style="display: none;">
            <div class="summary" id="summary"></div>
            <div class="toolbar">
                <label><input type="checkbox" id="check-all"> Selecionar todos</label>
                <button type="button" class="btn btn-danger" id="btn-delete-selected" style="display: none;"><i class="fas fa-trash-alt"></i> Excluir selecionados</button>
            </div>
            <div class="list" id="list"></div>
        </div>
        <div id="empty" class="empty card" style="display: none;">
            <i class="fas fa-inbox"></i>
            <p>Nenhum lançamento neste mês.</p>
            <a href="/dashboard#finance" class="btn btn-outline" style="margin-top: 12px;">Voltar ao painel</a>
        </div>
    </div>

    
    <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/js/pages/zerar-mes.js'])
</body>
</html>
