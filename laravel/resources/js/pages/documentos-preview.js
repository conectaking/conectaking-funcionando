/** documentos-preview — Vite entry (extracted inline) */
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
