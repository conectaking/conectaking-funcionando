<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestão do mês - Conecta King</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/css/fontawesome.css', 'resources/js/pages/zerar-mes.js'])
</head>
<body>
    <div class="container">
        <header>
            <h1><i class="fas fa-eraser"></i> Gestão do mês</h1>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <button type="button" class="btn btn-danger" id="btn-zerar-mes-todo" title="Zerar todos os lançamentos e trabalhos deste mês">
                    <i class="fas fa-trash-alt"></i> Zerar todo o mês
                </button>
                <a href="/dashboard#finance" class="back"><i class="fas fa-arrow-left"></i> Voltar ao painel</a>
            </div>
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
            <div style="margin-top: 14px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button type="button" class="btn btn-danger" id="btn-zerar-mes-empty" title="Garantir que o mês está completamente zerado">
                    <i class="fas fa-trash-alt"></i> Forçar zerar este mês
                </button>
                <a href="/dashboard#finance" class="btn btn-outline">Voltar ao painel</a>
            </div>
        </div>
    </div>

    <!-- Modal de confirmação de Zerar Mês -->
    <div id="modal-zerar" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 9999; align-items: center; justify-content: center; padding: 20px;">
        <div style="background: var(--card); border: 1px solid rgba(239,68,68,0.4); border-radius: 20px; max-width: 440px; width: 100%; padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.8);">
            <h3 style="margin: 0 0 10px 0; color: #f1f5f9; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> Confirmar Zerar Mês
            </h3>
            <p style="color: var(--text2); font-size: 0.9rem; margin-bottom: 20px; line-height: 1.5;">
                Esta ação apagará <strong>todos os lançamentos, trabalhos e receitas</strong> do mês selecionado. Esta operação não pode ser desfeita.
            </p>
            <div style="margin-bottom: 20px;">
                <label style="display: block; color: var(--text2); font-size: 0.85rem; margin-bottom: 6px; font-weight: 600;">Digite sua senha (padrão: 1212):</label>
                <input type="password" id="input-senha-zerar" placeholder="1212" style="width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border); background: rgba(0,0,0,0.3); color: var(--text); font-size: 1rem;">
            </div>
            <div style="display: flex; gap: 12px;">
                <button type="button" class="btn btn-outline" id="btn-cancelar-zerar" style="flex: 1; justify-content: center;">Cancelar</button>
                <button type="button" class="btn btn-danger" id="btn-confirmar-zerar" style="flex: 1; justify-content: center;">Confirmar e Zerar</button>
            </div>
        </div>
    </div>
</body>
</html>
