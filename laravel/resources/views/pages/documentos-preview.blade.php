<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Preview — Orçamento / Recibo</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <style>
        :root {
            --doc-blue: #1e3a5f;
            --doc-orange: #e67e22;
            --doc-white: #fff;
            --doc-text: #333;
            --doc-muted: #666;
        }
        * { box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
            font-size: 14px;
            color: var(--doc-text);
            max-width: 210mm;
            margin: 0 auto;
            padding: 0;
            background: #f5f5f5;
            overflow-x: hidden;
        }
        .doc-preview * {
            box-sizing: border-box;
        }
        .doc-preview {
            background: var(--doc-white);
            padding: 0;
            min-height: 297mm;
            width: 210mm;
            max-width: 100%;
            margin: 0 auto;
            overflow: visible;
        }
        /* Header azul + laranja */
        .doc-header {
            background: var(--doc-blue);
            color: var(--doc-white);
            padding: 20px 24px 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .doc-header-logo {
            max-width: 120px;
            max-height: 48px;
            object-fit: contain;
        }
        .doc-header-right {
            text-align: right;
            min-width: 110px;
            flex-shrink: 0;
            overflow: visible;
            padding-right: 20px;
        }
        .doc-header-titulo {
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 2px 0;
            line-height: 1.2;
            word-break: keep-all;
        }
        .doc-header-numero {
            font-size: 12px;
            opacity: 0.95;
            white-space: nowrap;
        }
        .doc-header-bar {
            height: 6px;
            background: var(--doc-orange);
        }
        /* Logo abaixo do header (opcional, se não estiver no header) */
        .doc-logo-block {
            padding: 16px 24px 8px;
        }
        .doc-logo-block img {
            max-width: 100px;
            max-height: 44px;
            object-fit: contain;
        }
        /* Colunas Faturado para | Emitido por */
        .doc-columns {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            padding: 16px 24px 20px;
            border-bottom: 1px solid #eee;
        }
        .doc-col {
            min-width: 0;
            overflow: visible;
        }
        .doc-col h3 {
            font-size: 12px;
            color: var(--doc-blue);
            text-transform: uppercase;
            letter-spacing: 0.02em;
            margin: 0 0 12px 0;
        }
        .doc-col p {
            margin: 0 0 4px 0;
            font-size: 13px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            word-break: break-word;
            max-width: 100%;
        }
        .doc-col .muted { color: var(--doc-muted); font-size: 12px; }
        /* Tabela — Valor unit. colado no canto direito */
        .doc-table-wrap {
            padding: 0 24px 0 24px;
            padding-bottom: 20px;
            padding-right: 12px;
            overflow: visible;
        }
        .doc-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .doc-table col.col-desc { width: 52%; }
        .doc-table col.col-data { width: 12%; }
        .doc-table col.col-qtd { width: 8%; }
        .doc-table col.col-valor { width: 28%; }
        .doc-table thead th {
            background: var(--doc-orange);
            color: var(--doc-white);
            font-size: 11px;
            font-weight: 700;
            text-align: left;
            padding: 10px 8px;
        }
        .doc-table thead th:last-child {
            text-align: right;
            padding-right: 12px;
        }
        .doc-table thead th:nth-child(2),
        .doc-table tbody td:nth-child(2) { text-align: center; }
        .doc-table thead th:nth-child(3),
        .doc-table tbody td:nth-child(3) { text-align: center; }
        .doc-table thead th:last-child,
        .doc-table td.num { text-align: right; }
        .doc-table td.num { padding-right: 12px; }
        .doc-table tbody td {
            padding: 8px;
            font-size: 13px;
            border-bottom: 1px solid #eee;
            vertical-align: top;
        }
        .doc-table tbody tr:not(.detalhe-pacote) td { padding-bottom: 6px; }
        .doc-table tbody tr.detalhe-pacote td {
            padding-top: 6px;
            padding-bottom: 10px;
        }
        .doc-table tbody td:first-child {
            word-wrap: break-word;
            overflow-wrap: break-word;
            word-break: break-word;
            overflow: visible;
            min-width: 0;
            width: 52%;
        }
        .doc-table tbody td:first-child .td-desc-inner {
            max-width: 100%;
            word-wrap: break-word;
            overflow-wrap: break-word;
            word-break: break-word;
        }
        .doc-table tbody tr.detalhe-pacote td {
            font-size: 11px;
            color: var(--doc-muted);
            padding-left: 24px;
            border-bottom: 1px solid #eee;
        }
        .doc-table tbody tr.detalhe-pacote td:first-child {
            word-wrap: break-word;
            overflow-wrap: break-word;
            word-break: break-word;
            width: 52%;
        }
        .doc-table tbody tr.detalhe-pacote td.empty-cell {
            padding: 4px 8px;
            border-left: none;
        }
        .doc-total-box {
            display: block;
            width: 100%;
            background: var(--doc-orange);
            color: var(--doc-white);
            padding: 10px 16px;
            font-weight: 700;
            font-size: 14px;
            margin-top: 8px;
            box-sizing: border-box;
        }
        .doc-total-label { margin-right: 8px; }
        /* Blocos texto */
        .doc-block {
            padding: 12px 24px 16px;
            overflow: visible;
            box-sizing: border-box;
        }
        .doc-block h4 {
            font-size: 12px;
            color: var(--doc-blue);
            margin: 0 0 12px 0;
        }
        .doc-block p {
            margin: 0 0 8px 0;
            font-size: 12px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-wrap: break-word;
            word-break: break-word;
            max-width: 100%;
            overflow: visible;
            box-sizing: border-box;
        }
        .doc-meta {
            padding: 8px 24px 16px;
            font-size: 12px;
            color: var(--doc-muted);
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        .doc-footer {
            padding: 20px 24px 24px;
            font-size: 13px;
            font-weight: 600;
            color: var(--doc-blue);
        }
        .doc-notas-fiscais { padding: 8px 24px 24px; }
        .doc-notas-fiscais h4 {
            font-size: 14px;
            color: var(--doc-blue);
            margin: 0 0 16px 0;
        }
        .doc-nota-item {
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        .doc-nota-item h5 {
            font-size: 13px;
            font-weight: 700;
            margin: 0 0 8px 0;
            color: var(--doc-text);
        }
        .doc-nota-item img {
            max-width: 100%;
            max-height: 320px;
            object-fit: contain;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        body.doc-preview-page { padding-bottom: 80px; }
        /* Botão Baixar PDF em destaque (sempre visível) */
        #btn-exportar-pdf { order: -1; min-width: 220px; }
        /* Impressão — evitar PDF em branco */
        @media print {
            body, html { background: #fff !important; padding-bottom: 0 !important; }
            .doc-preview {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                background: #fff !important;
                box-shadow: none !important;
                min-height: auto !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .doc-preview * { visibility: visible !important; }
            .doc-header, .doc-header-bar, .doc-table thead th, .doc-total-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body class="doc-preview-page">
    <div class="doc-preview" id="doc-preview">
        <header class="doc-header">
            <div class="doc-header-left">
                <img id="doc-logo-header" class="doc-header-logo" src="" alt="Logo" style="display: none;">
                <span id="doc-logo-placeholder" style="font-size: 12px; opacity: 0.9;">Sua logo</span>
            </div>
            <div class="doc-header-right">
                <p class="doc-header-titulo" id="doc-titulo">OR?AMENTO</p>
                <p class="doc-header-numero" id="doc-numero">Nº —</p>
            </div>
        </header>
        <div class="doc-header-bar"></div>
        <div class="doc-logo-block" id="doc-logo-block" style="display: none;">
            <img id="doc-logo-img" src="" alt="Logo">
        </div>
        <div class="doc-columns">
            <div class="doc-col">
                <h3>Faturado para</h3>
                <p class="cliente-nome" id="cliente-nome">—</p>
                <p class="muted cliente-cpf" id="cliente-cpf">CNPJ/CPF: —</p>
                <p class="muted cliente-endereco" id="cliente-endereco">—</p>
                <p class="muted cliente-contato" id="cliente-contato"></p>
            </div>
            <div class="doc-col">
                <h3>Emitido por</h3>
                <p class="emitente-nome" id="emitente-nome">—</p>
                <p class="muted emitente-cpf" id="emitente-cpf">CNPJ/CPF: —</p>
                <p class="muted emitente-endereco" id="emitente-endereco">—</p>
                <p class="muted emitente-contato" id="emitente-contato">—</p>
            </div>
        </div>
        <div class="doc-table-wrap">
            <table class="doc-table">
                <colgroup>
                    <col class="col-desc">
                    <col class="col-data">
                    <col class="col-qtd">
                    <col class="col-valor">
                </colgroup>
                <thead>
                    <tr>
                        <th>Descrição</th>
                        <th>Data</th>
                        <th>Qtd</th>
                        <th>Valor unit.</th>
                    </tr>
                </thead>
                <tbody id="itens-body">
                    <tr><td colspan="4">—</td></tr>
                </tbody>
            </table>
            <div class="doc-total-box">
                <span class="doc-total-label">TOTAL:</span>
                <span id="total-geral">R$ 0,00</span>
            </div>
        </div>
        <div class="doc-block" id="block-condicoes" style="display: none;">
            <h4>Condições de pagamento</h4>
            <p id="condicoes-pagamento"></p>
        </div>
        <div class="doc-block" id="block-observacoes" style="display: none;">
            <h4>Observações</h4>
            <p id="observacoes"></p>
        </div>
        <div class="doc-block" id="block-pix" style="display: none;">
            <h4>Pagamento via PIX</h4>
            <div class="flex flex-wrap gap-4 items-start">
                <div id="pix-qr-wrap" class="flex-shrink-0"></div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium mb-1">Chave PIX:</p>
                    <p id="pix-chave" class="text-sm font-mono bg-slate-100 dark:bg-black/40 px-3 py-2 rounded break-all"></p>
                    <button type="button" id="btn-copiar-pix" class="mt-2 text-sm text-primary hover:underline">Copiar chave</button>
                </div>
            </div>
        </div>
        <div class="doc-meta">
            <span id="meta-data"></span>
            <span id="meta-validade"></span>
        </div>
        <div class="doc-notas-fiscais" id="block-notas-fiscais" style="display: none;">
            <h4>Notas fiscais</h4>
            <div id="notas-fiscais-preview"></div>
        </div>
        <div class="doc-footer">Obrigado pela preferência.</div>
    </div>
    <div class="no-print doc-buttons-bar" style="position: fixed; bottom: 0; left: 0; right: 0; padding: 14px 20px; text-align: center; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: center; background: #e8e8e8; border-top: 2px solid #1e3a5f; z-index: 1000; box-shadow: 0 -2px 10px rgba(0,0,0,0.12);">
        <button type="button" id="btn-exportar-pdf" class="px-5 py-2.5 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity" style="display: inline-flex; background: #0d9488; border: 2px solid #0f766e;">
            ? Baixar PDF (como está na tela)
        </button>
        <button type="button" id="btn-imprimir" class="px-5 py-2.5 rounded-lg bg-slate-600 text-white font-medium hover:opacity-90 transition-opacity">
            Imprimir / Guardar como PDF
        </button>
    </div>
    
    <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/js/pages/documentos-preview.js'])
</body>
</html>
