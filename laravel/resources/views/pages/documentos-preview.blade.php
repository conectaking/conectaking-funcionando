<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Preview — Orçamento / Recibo</title>
    <script src="https://www.conectaking.com.br/api-config.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
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
    <script>
        (function applyCoresConfig() {
            try {
                var escurecer = localStorage.getItem('recibosOrcamentosEscurecer') === '1' || localStorage.getItem('recibosOrcamentosEscurecer') === 'true';
                var s = localStorage.getItem('recibosOrcamentosCores');
                var r = document.documentElement.style;
                if (escurecer) {
                    r.setProperty('--doc-white', '#1e1e1e');
                    r.setProperty('--doc-text', '#e5e5e5');
                    r.setProperty('--doc-muted', '#a0a0a0');
                }
                if (s) {
                    var c = JSON.parse(s);
                    if (c.cabecalho) r.setProperty('--doc-blue', c.cabecalho);
                    if (c.destaque) r.setProperty('--doc-orange', c.destaque);
                    if (!escurecer && c.fundo) r.setProperty('--doc-white', c.fundo);
                }
            } catch (e) {}
        })();
        var _docPreviewId = null;
        var _apiBase = (typeof window !== 'undefined' && (window.API_BASE || window.CONECTAKING_API_BASE)) ? (window.API_BASE || window.CONECTAKING_API_BASE).replace(/\/$/, '') : (window.location.origin || '');
        // Exemplo: preencher a partir de um objeto documento (como devolvido pela API)
        function fillPreview(doc) {
            if (!doc) return;
            function esc(str) {
                return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }
            function quebrarLinhasParaHtml(str, maxChars) {
                if (!str || str.length <= (maxChars || 52)) return esc(str);
                var out = [], rest = str, chunk;
                var mx = maxChars || 52;
                while (rest.length > 0) {
                    if (rest.length <= mx) { out.push(esc(rest)); break; }
                    chunk = rest.slice(0, mx);
                    var lastSpace = chunk.lastIndexOf(' ');
                    if (lastSpace > 28) chunk = chunk.slice(0, lastSpace + 1);
                    out.push(esc(chunk.trim()));
                    rest = rest.slice(chunk.length).trim();
                }
                return out.join('<br>');
            }
            var tipo = (doc.tipo || 'orcamento').toLowerCase();
            var titulo = tipo === 'orcamento' ? 'OR?AMENTO' : 'RECIBO';
            var numero = doc.numero_sequencial != null ? '#' + doc.numero_sequencial : (doc.id ? '#' + doc.id : '—');
            document.getElementById('doc-titulo').textContent = titulo;
            document.getElementById('doc-numero').textContent = numero ? 'Nº ' + String(numero).replace(/^#/, '') : '—';
            var numStr = (doc.numero_sequencial != null ? doc.numero_sequencial : (doc.id != null ? doc.id : ''));
            var nomeArquivo = (tipo === 'orcamento' ? 'Orcamento' : 'Recibo') + (numStr ? ' ' + numStr : '');
            document.title = (nomeArquivo ? nomeArquivo + ' — ' : '') + 'ConectaKing';
            try { document.body.dataset.suggestedPdfName = (nomeArquivo ? nomeArquivo.replace(/\s/g, '-').toLowerCase() + '.pdf' : 'documento.pdf'); } catch (e) {}

            var emitente = doc.emitente_json || doc.emitente || {};
            var cliente = doc.cliente_json || doc.cliente || {};
            var logoUrl = (emitente.logo_url || doc.logo_url || '').toString().trim();
            if (logoUrl.endsWith('?') || logoUrl.length < 10) logoUrl = '';
            if (!logoUrl) {
                try {
                    var logoFixa = localStorage.getItem('recibosOrcamentosLogoFixa');
                    if (logoFixa && logoFixa.length > 10) logoUrl = logoFixa;
                } catch (e) {}
            }
            var imgHeader = document.getElementById('doc-logo-header');
            var logoPlaceholder = document.getElementById('doc-logo-placeholder');
            if (logoUrl) {
                imgHeader.removeAttribute('style');
                imgHeader.style.maxWidth = '120px';
                imgHeader.style.maxHeight = '48px';
                imgHeader.style.objectFit = 'contain';
                imgHeader.referrerPolicy = 'no-referrer';
                imgHeader.onerror = function() {
                    imgHeader.style.display = 'none';
                    imgHeader.src = '';
                    if (logoPlaceholder) { logoPlaceholder.style.display = ''; logoPlaceholder.textContent = 'Sua logo'; }
                };
                imgHeader.onload = function() {
                    imgHeader.style.display = 'block';
                    if (logoPlaceholder) logoPlaceholder.style.display = 'none';
                };
                imgHeader.src = logoUrl;
                imgHeader.style.display = 'block';
                if (logoPlaceholder) logoPlaceholder.style.display = 'none';
            } else {
                imgHeader.src = '';
                imgHeader.style.display = 'none';
                if (logoPlaceholder) logoPlaceholder.style.display = '';
            }
            document.getElementById('emitente-nome').textContent = emitente.nome || '—';
            document.getElementById('emitente-cpf').textContent = emitente.cpf_cnpj ? 'CNPJ/CPF: ' + emitente.cpf_cnpj : '—';
            document.getElementById('emitente-endereco').innerHTML = emitente.endereco ? quebrarLinhasParaHtml(emitente.endereco, 38) : '—';
            document.getElementById('emitente-contato').textContent = emitente.contato || '—';

            document.getElementById('cliente-nome').textContent = cliente.nome || '—';
            document.getElementById('cliente-cpf').textContent = cliente.cpf_cnpj ? 'CNPJ/CPF: ' + cliente.cpf_cnpj : '—';
            document.getElementById('cliente-endereco').innerHTML = cliente.endereco ? quebrarLinhasParaHtml(cliente.endereco, 38) : '—';
            document.getElementById('cliente-contato').textContent = cliente.contato || '';

            var itens = Array.isArray(doc.itens_json) ? doc.itens_json : [];
            var tbody = document.getElementById('itens-body');
            var totalGeral = 0;
            function fmtMoney(n) {
                if (n == null || isNaN(n)) return '—';
                return 'R$ ' + Number(n).toFixed(2).replace('.', ',');
            }
            tbody.innerHTML = '';
            itens.forEach(function(item) {
                var qtd = item.quantidade != null ? item.quantidade : 1;
                var vu = item.valor_unitario != null ? item.valor_unitario : item.valor;
                var val = item.valor != null ? item.valor : (vu * qtd);
                totalGeral += val;
                var desc = esc(item.descricao || '—');
                var tr = '<tr><td><div class="td-desc-inner">' + desc + '</div></td><td>' + (item.data || '') + '</td><td>' + qtd + '</td><td class="num">' + fmtMoney(vu) + '</td></tr>';
                tbody.insertAdjacentHTML('beforeend', tr);
                var detalhe = (item.conteudo_pacote || item.detalhes || '').toString().trim();
                if (detalhe) {
                    var txt = quebrarLinhasParaHtml(('— ' + detalhe).replace(/\n/g, ' '), 52);
                    tbody.insertAdjacentHTML('beforeend', '<tr class="detalhe-pacote"><td><div class="td-desc-inner">' + txt + '</div></td><td class="empty-cell"></td><td class="empty-cell"></td><td class="empty-cell"></td></tr>');
                }
            });
            if (itens.length === 0) tbody.innerHTML = '<tr><td colspan="4">—</td></tr>';
            document.getElementById('total-geral').textContent = fmtMoney(totalGeral);

            if (doc.condicoes_pagamento && String(doc.condicoes_pagamento).trim()) {
                document.getElementById('block-condicoes').style.display = 'block';
                var condTxt = String(doc.condicoes_pagamento).trim().replace(/\n/g, ' ');
                document.getElementById('condicoes-pagamento').innerHTML = quebrarLinhasParaHtml(condTxt, 65);
            }
            if (doc.observacoes) {
                document.getElementById('block-observacoes').style.display = 'block';
                document.getElementById('observacoes').textContent = doc.observacoes;
            }
            if (doc.data_documento) document.getElementById('meta-data').textContent = 'Data: ' + (doc.data_documento || '').slice(0, 10);
            if (doc.validade_ate && tipo === 'orcamento') document.getElementById('meta-validade').textContent = (doc.data_documento ? '  |  ' : '') + 'Válido até: ' + (doc.validade_ate || '').slice(0, 10);

            var blockNotas = document.getElementById('block-notas-fiscais');
            var notasWrap = document.getElementById('notas-fiscais-preview');
            var notasItens = itens.filter(function(item) { return item && item.nota_fiscal_url; });
            if (tipo === 'recibo' && notasItens.length > 0 && blockNotas && notasWrap) {
                blockNotas.style.display = 'block';
                notasWrap.innerHTML = notasItens.map(function(item) {
                    var titulo = esc((item.nota_fiscal_titulo || item.descricao || 'Nota fiscal').trim());
                    var url = String(item.nota_fiscal_url || '').replace(/"/g, '&quot;');
                    return '<div class="doc-nota-item"><h5>' + titulo + '</h5><img src="' + url + '" alt="' + titulo + '" referrerpolicy="no-referrer"/></div>';
                }).join('');
            } else if (blockNotas) {
                blockNotas.style.display = 'none';
                if (notasWrap) notasWrap.innerHTML = '';
            }

            var pixChave = (emitente.pix_chave || '').trim();
            var pixBlock = document.getElementById('block-pix');
            if (pixChave && (emitente.pix_nome || '').trim() && (emitente.pix_cidade || '').trim()) {
                pixBlock.style.display = 'block';
                document.getElementById('pix-chave').textContent = pixChave;
                document.getElementById('btn-copiar-pix').onclick = function() {
                    navigator.clipboard.writeText(pixChave).then(function() { alert('Chave copiada!'); }).catch(function() {});
                };
                var nome = String(emitente.pix_nome || '').substring(0, 25).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                var cidade = String(emitente.pix_cidade || '').substring(0, 15).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                var payload = buildPixPayload(pixChave, nome, cidade, totalGeral);
                if (payload) {
                    var qrWrap = document.getElementById('pix-qr-wrap');
                    qrWrap.innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=' + encodeURIComponent(payload) + '" alt="QR PIX" width="120" height="120" class="rounded border"/>';
                }
            } else {
                pixBlock.style.display = 'none';
            }
        }
        function buildPixPayload(key, name, city, value) {
            function genEMV(id, p) { return id + String(p.length).padStart(2, '0') + p; }
            function crc16(s) {
                var c = 0xFFFF;
                for (var i = 0; i < s.length; i++) {
                    c ^= s.charCodeAt(i) << 8;
                    for (var j = 0; j < 8; j++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) : (c << 1);
                }
                return (c & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
            }
            var keyBlock = genEMV('00', 'BR.GOV.BCB.PIX') + genEMV('01', key);
            var parts = [genEMV('00', '01'), genEMV('26', keyBlock), genEMV('52', '0000'), genEMV('53', '986')];
            if (value && value > 0) parts.push(genEMV('54', value.toFixed(2)));
            parts.push(genEMV('58', 'BR'), genEMV('59', name || 'CONECTAKING'), genEMV('60', city || 'SAO PAULO'), genEMV('62', genEMV('05', 'DOC' + Date.now().toString(36).slice(-8))), '6304');
            return parts.join('') + crc16(parts.join(''));
        }
        // Exporta a visualização como PDF: usa impressão (confiável) para evitar PDF em branco
        function exportarVisualizacaoComoPdf() {
            var el = document.getElementById('doc-preview');
            if (!el) { alert('Nada para exportar.'); return; }
            var btn = document.getElementById('btn-exportar-pdf');
            if (btn) { btn.disabled = true; }
            window.print();
            if (btn) { btn.disabled = false; }
            var sug = (document.body && document.body.dataset && document.body.dataset.suggestedPdfName) ? document.body.dataset.suggestedPdfName : '';
            var msg = 'Na janela que abrir:\n\n— Em "Destino" ou "Impressora", escolha "Salvar como PDF" ou "Microsoft Print to PDF".\n— Depois clique em Salvar.\n\nO PDF será gerado com todo o conteúdo que você vê na tela.';
            if (sug) msg += '\n\nSugestão de nome ao salvar: ' + sug;
            alert(msg);
        }

        // Ao carregar: token (link compartilhável), k (localStorage) ou sessionStorage
        (function() {
            try {
                var doc = null;
                var token = (function() { var m = /[?&]token=([^&]+)/.exec(location.search); return m ? m[1] : null; })();
                if (token) {
                    fetch(_apiBase + '/api/documentos/ver/' + encodeURIComponent(token), { credentials: 'include' })
                        .then(function(r) { return r.ok ? r.json() : null; })
                        .then(function(res) {
                            if (res && res.data) {
                                doc = res.data;
                                _docPreviewToken = token;
                                fillPreview(doc);
                                var btnPdf = document.getElementById('btn-exportar-pdf');
                                if (btnPdf) { btnPdf.style.display = 'inline-flex'; }
                            }
                        })
                        .catch(function() {});
                    return;
                }
                var k = (function() { var m = /[?&]k=([^&]+)/.exec(location.search); return m ? m[1] : null; })();
                if (k) {
                    var raw = localStorage.getItem(k);
                    if (raw) { doc = JSON.parse(raw); localStorage.removeItem(k); }
                    var logoBackup = localStorage.getItem('docPreview_logo_' + k);
                    if (logoBackup && logoBackup.length > 10 && doc) {
                        var hasLogo = (doc.emitente_json && doc.emitente_json.logo_url && doc.emitente_json.logo_url.length > 10);
                        if (!hasLogo) {
                            if (!doc.emitente_json) doc.emitente_json = {};
                            doc.emitente_json.logo_url = logoBackup;
                            doc.logo_url = logoBackup;
                        }
                        try { localStorage.removeItem('docPreview_logo_' + k); } catch (e) {}
                    }
                }
                if (!doc) {
                    var stored = sessionStorage.getItem('documentoPreview');
                    if (stored) { doc = JSON.parse(stored); sessionStorage.removeItem('documentoPreview'); }
                }
                if (doc) {
                    fillPreview(doc);
                    var btnPdf = document.getElementById('btn-exportar-pdf');
                    if (btnPdf) { btnPdf.style.display = 'inline-flex'; }
                }
            } catch (e) {}
        })();
        var _docPreviewToken = null;
        document.getElementById('btn-imprimir').onclick = function() { window.print(); };
        document.getElementById('btn-exportar-pdf').onclick = exportarVisualizacaoComoPdf;
    </script>
</body>
</html>
