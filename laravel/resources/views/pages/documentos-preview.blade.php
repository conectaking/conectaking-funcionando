<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Preview — Orçamento / Recibo</title>
</head>
<body class="doc-preview-page">
    <div class="doc-preview" id="doc-preview">
        <header class="doc-header">
            <div class="doc-header-left">
                <img id="doc-logo-header" class="doc-header-logo ck-hidden" src="" alt="Logo">
                <span class="ck-dp-a57fae" id="doc-logo-placeholder">Sua logo</span>
            </div>
            <div class="doc-header-right">
                <p class="doc-header-titulo" id="doc-titulo">OR?AMENTO</p>
                <p class="doc-header-numero" id="doc-numero">Nº —</p>
            </div>
        </header>
        <div class="doc-header-bar"></div>
        <div class="doc-logo-block ck-hidden" id="doc-logo-block">
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
        <div class="doc-block ck-hidden" id="block-condicoes">
            <h4>Condições de pagamento</h4>
            <p id="condicoes-pagamento"></p>
        </div>
        <div class="doc-block ck-hidden" id="block-observacoes">
            <h4>Observações</h4>
            <p id="observacoes"></p>
        </div>
        <div class="doc-block ck-hidden" id="block-pix">
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
        <div class="doc-notas-fiscais ck-hidden" id="block-notas-fiscais">
            <h4>Notas fiscais</h4>
            <div id="notas-fiscais-preview"></div>
        </div>
        <div class="doc-footer">Obrigado pela preferência.</div>
    </div>
    <div class="no-print doc-buttons-bar ck-dp-ec5ddb">
        <button type="button" id="btn-exportar-pdf" class="px-5 py-2.5 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity ck-dp-fd4114">
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
