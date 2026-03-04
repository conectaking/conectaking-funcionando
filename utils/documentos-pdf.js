/**
 * Gera PDF de documento (recibo ou orçamento) com layout estilo fatura profissional:
 * header azul com logo no topo esquerdo, título/número no topo direito, faixa laranja,
 * colunas Faturado para / Emitido por, tabela de itens com cabeçalho laranja, total em destaque,
 * condições de pagamento, observações; para recibo inclui imagens dos comprovantes.
 */

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fetch = require('node-fetch');
const logger = require('./logger');
const { QrCodePix } = require('qrcode-pix');

const MARGIN = 40;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LINE_HEIGHT = 14;
const FONT_SIZE = 10;
const FONT_SIZE_TITLE = 18;
const FONT_SIZE_SMALL = 9;

// Cores estilo fatura (azul + laranja + branco) - padrão
function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return null;
    const h = hex.replace(/^#/, '');
    if (!/^[0-9A-Fa-f]{6}$/.test(h)) return null;
    return {
        r: parseInt(h.slice(0, 2), 16) / 255,
        g: parseInt(h.slice(2, 4), 16) / 255,
        b: parseInt(h.slice(4, 6), 16) / 255
    };
}
const DEFAULT_BLUE = '#1e3a5f';
const DEFAULT_ORANGE = '#e67e22';
const RGB_WHITE = { r: 1, g: 1, b: 1 };
const RGB_TEXT = { r: 0.2, g: 0.2, b: 0.25 };
const RGB_MUTED = { r: 0.45, g: 0.45, b: 0.5 };
const RGB_LIGHT_TEXT = { r: 0.9, g: 0.9, b: 0.92 };
const RGB_LIGHT_MUTED = { r: 0.65, g: 0.65, b: 0.7 };

function isDarkBg(hex) {
    if (!hex || typeof hex !== 'string') return false;
    const h = hex.replace(/^#/, '');
    if (!/^[0-9A-Fa-f]{6}$/.test(h)) return false;
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance < 0.5;
}

const HEADER_HEIGHT = 72;
const ORANGE_BAR_HEIGHT = 6;

function formatMoney(n) {
    if (n == null || isNaN(n)) return '-';
    return `R$ ${Number(n).toFixed(2).replace('.', ',')}`;
}

function formatDate(d) {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('pt-BR');
}

async function fetchImage(url) {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) throw new Error(`Falha ao carregar imagem: ${response.status}`);
    const buf = await response.buffer();
    const bytes = new Uint8Array(buf);
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const type = contentType.includes('png') ? 'png' : 'jpg';
    return { type, bytes };
}

function drawHeader(page, pdfDoc, font, boldFont, tipo, numero, emitente, rgbBlue, rgbOrange, logoImg) {
    const tipoLabel = (tipo || 'recibo').toLowerCase() === 'orcamento' ? 'ORÇAMENTO' : 'RECIBO';
    // Faixa azul no topo
    page.drawRectangle({
        x: 0,
        y: PAGE_HEIGHT - HEADER_HEIGHT,
        width: PAGE_WIDTH,
        height: HEADER_HEIGHT,
        color: rgb(rgbBlue.r, rgbBlue.g, rgbBlue.b)
    });
    // Logo dentro do cabeçalho azul (esquerda) — igual ao preview
    if (logoImg && logoImg.img) {
        const w = logoImg.width;
        const h = logoImg.height;
        const logoY = PAGE_HEIGHT - HEADER_HEIGHT + (HEADER_HEIGHT - h) / 2;
        page.drawImage(logoImg.img, { x: MARGIN, y: logoY, width: w, height: h });
    }
    // Faixa laranja fina abaixo do azul
    page.drawRectangle({
        x: 0,
        y: PAGE_HEIGHT - HEADER_HEIGHT - ORANGE_BAR_HEIGHT,
        width: PAGE_WIDTH,
        height: ORANGE_BAR_HEIGHT,
        color: rgb(rgbOrange.r, rgbOrange.g, rgbOrange.b)
    });
    // Título e número à direita (sobre o azul)
    const tituloNum = `${tipoLabel}  ${numero}`.trim();
    page.drawText(tituloNum, {
        x: PAGE_WIDTH - MARGIN - 130,
        y: PAGE_HEIGHT - HEADER_HEIGHT / 2 - 6,
        size: FONT_SIZE_TITLE,
        font: boldFont,
        color: rgb(RGB_WHITE.r, RGB_WHITE.g, RGB_WHITE.b)
    });
    const numLimpo = numero ? String(numero).replace(/^#/, '') : '';
    if (numLimpo) {
        page.drawText(`Nº ${numLimpo}`, {
            x: PAGE_WIDTH - MARGIN - 80,
            y: PAGE_HEIGHT - HEADER_HEIGHT / 2 - 24,
            size: FONT_SIZE_SMALL,
            font,
            color: rgb(0.9, 0.9, 0.95)
        });
    }
    return PAGE_HEIGHT - HEADER_HEIGHT - ORANGE_BAR_HEIGHT - 16;
}

async function gerarPdfBuffer(documento, colors = null) {
    const rgbBlue = hexToRgb(colors && colors.headerColor ? '#' + colors.headerColor : DEFAULT_BLUE) || hexToRgb(DEFAULT_BLUE);
    const rgbOrange = hexToRgb(colors && colors.accentColor ? '#' + colors.accentColor : DEFAULT_ORANGE) || hexToRgb(DEFAULT_ORANGE);
    const bgHex = colors && colors.bgColor ? '#' + colors.bgColor.replace('#', '') : '#ffffff';
    const darkMode = isDarkBg(bgHex);
    const rgbBg = hexToRgb(bgHex) || { r: 1, g: 1, b: 1 };

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    if (darkMode) {
        page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: rgb(rgbBg.r, rgbBg.g, rgbBg.b) });
    }
    const emitente = documento.emitente_json || {};
    const cliente = documento.cliente_json || {};
    const itens = Array.isArray(documento.itens_json) ? documento.itens_json : [];
    const anexos = Array.isArray(documento.anexos_json) ? documento.anexos_json : [];
    const tipo = (documento.tipo || 'recibo').toLowerCase();
    const numero = documento.numero_sequencial != null ? `#${documento.numero_sequencial}` : (documento.id ? `#${documento.id}` : '');

    const cText = () => darkMode ? rgb(RGB_LIGHT_TEXT.r, RGB_LIGHT_TEXT.g, RGB_LIGHT_TEXT.b) : rgb(RGB_TEXT.r, RGB_TEXT.g, RGB_TEXT.b);
    const cMuted = () => darkMode ? rgb(RGB_LIGHT_MUTED.r, RGB_LIGHT_MUTED.g, RGB_LIGHT_MUTED.b) : rgb(RGB_MUTED.r, RGB_MUTED.g, RGB_MUTED.b);
    const cWhite = () => rgb(RGB_WHITE.r, RGB_WHITE.g, RGB_WHITE.b);
    const cBlue = () => rgb(rgbBlue.r, rgbBlue.g, rgbBlue.b);
    const cOrange = () => rgb(rgbOrange.r, rgbOrange.g, rgbOrange.b);

    // Carregar logo antes do header (para desenhar dentro da barra azul)
    let logoImg = null;
    if (emitente.logo_url) {
        try {
            const { type, bytes } = await fetchImage(emitente.logo_url);
            const img = type === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
            const scale = Math.min(100 / img.width, 44 / img.height, 1);
            logoImg = { img, width: img.width * scale, height: img.height * scale };
        } catch (e) {
            logger.warn('documentos-pdf: logo não carregada', { url: emitente.logo_url, message: e.message });
        }
    }
    let y = drawHeader(page, pdfDoc, font, boldFont, tipo, numero, emitente, rgbBlue, rgbOrange, logoImg);

    // Duas colunas: Faturado para (cliente) | Emitido por (emitente) — mesma altura
    const colLeft = MARGIN;
    const colRight = PAGE_WIDTH / 2 + 20;
    const labelH = 12;
    const yColStart = y;

    page.drawText('Faturado para:', { x: colLeft, y: y - labelH, size: FONT_SIZE, font: boldFont, color: cBlue() });
    y -= labelH + 4;
    if (cliente.nome) { page.drawText(String(cliente.nome).slice(0, 45), { x: colLeft, y: y - FONT_SIZE, size: FONT_SIZE, font, color: cText() }); y -= LINE_HEIGHT; }
    if (cliente.cpf_cnpj) { page.drawText(`CNPJ/CPF: ${String(cliente.cpf_cnpj).slice(0, 30)}`, { x: colLeft, y: y - FONT_SIZE, size: FONT_SIZE_SMALL, font, color: cMuted() }); y -= LINE_HEIGHT - 2; }
    if (cliente.endereco) { page.drawText(String(cliente.endereco).slice(0, 45), { x: colLeft, y: y - FONT_SIZE, size: FONT_SIZE_SMALL, font, color: cMuted() }); y -= LINE_HEIGHT - 2; }
    if (cliente.contato) { page.drawText(String(cliente.contato).slice(0, 45), { x: colLeft, y: y - FONT_SIZE, size: FONT_SIZE_SMALL, font, color: cMuted() }); y -= LINE_HEIGHT - 2; }

    let yRight = yColStart - labelH - 4;
    page.drawText('Emitido por:', { x: colRight, y: yColStart - labelH, size: FONT_SIZE, font: boldFont, color: cBlue() });
    if (emitente.nome) { page.drawText(String(emitente.nome).slice(0, 45), { x: colRight, y: yRight - FONT_SIZE, size: FONT_SIZE, font, color: cText() }); yRight -= LINE_HEIGHT; }
    if (emitente.cpf_cnpj) { page.drawText(`CNPJ/CPF: ${String(emitente.cpf_cnpj).slice(0, 30)}`, { x: colRight, y: yRight - FONT_SIZE, size: FONT_SIZE_SMALL, font, color: cMuted() }); yRight -= LINE_HEIGHT - 2; }
    if (emitente.endereco) { page.drawText(String(emitente.endereco).slice(0, 45), { x: colRight, y: yRight - FONT_SIZE, size: FONT_SIZE_SMALL, font, color: cMuted() }); yRight -= LINE_HEIGHT - 2; }
    if (emitente.contato) { page.drawText(String(emitente.contato).slice(0, 45), { x: colRight, y: yRight - FONT_SIZE, size: FONT_SIZE_SMALL, font, color: cMuted() }); yRight -= LINE_HEIGHT - 2; }

    y = Math.min(y, yRight) - 20;

    // Tabela de itens — cabeçalho laranja (apenas valor unitário por linha; total geral fica na caixa abaixo)
    const colDesc = colLeft;
    const colData = colDesc + 155;
    const colQtd = PAGE_WIDTH - MARGIN - 210;
    const colUnit = PAGE_WIDTH - MARGIN - 115;

    page.drawRectangle({
        x: colDesc - 4,
        y: y - LINE_HEIGHT - 6,
        width: colUnit - colDesc + 60,
        height: LINE_HEIGHT + 10,
        color: cOrange()
    });
    page.drawText('Descrição', { x: colDesc, y: y - 14, size: FONT_SIZE, font: boldFont, color: cWhite() });
    page.drawText('Data', { x: colData, y: y - 14, size: FONT_SIZE, font: boldFont, color: cWhite() });
    page.drawText('Qtd', { x: colQtd, y: y - 14, size: FONT_SIZE, font: boldFont, color: cWhite() });
    page.drawText('Valor unit.', { x: colUnit, y: y - 14, size: FONT_SIZE, font: boldFont, color: cWhite() });
    y -= LINE_HEIGHT + 14;

    let totalGeral = 0;
    for (const item of itens) {
        if (y < MARGIN + LINE_HEIGHT) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            if (darkMode) page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: rgb(rgbBg.r, rgbBg.g, rgbBg.b) });
            y = PAGE_HEIGHT - MARGIN;
        }
        const descricao = (item.descricao || '-').slice(0, 38);
        const dataStr = (item.data || '').toString().slice(0, 10);
        const qtd = item.quantidade != null ? item.quantidade : 1;
        const valorUnit = item.valor_unitario != null ? item.valor_unitario : item.valor;
        const valor = item.valor != null ? item.valor : (valorUnit * qtd);
        totalGeral += valor;
        page.drawText(descricao, { x: colDesc, y: y - FONT_SIZE, size: FONT_SIZE, font, color: cText() });
        page.drawText(dataStr, { x: colData, y: y - FONT_SIZE, size: FONT_SIZE_SMALL, font, color: cText() });
        page.drawText(String(qtd), { x: colQtd, y: y - FONT_SIZE, size: FONT_SIZE, font, color: cText() });
        page.drawText(formatMoney(valorUnit), { x: colUnit, y: y - FONT_SIZE, size: FONT_SIZE, font, color: cText() });
        y -= LINE_HEIGHT;
        const conteudoPacote = (item.conteudo_pacote || item.detalhes || '').toString().trim();
        if (conteudoPacote) {
            const linhas = conteudoPacote.split(/\n/);
            for (const linha of linhas) {
                if (y < MARGIN + 10) { page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]); if (darkMode) page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: rgb(rgbBg.r, rgbBg.g, rgbBg.b) }); y = PAGE_HEIGHT - MARGIN; }
                page.drawText(('  • ' + linha).slice(0, 100), { x: colDesc, y: y - 9, size: FONT_SIZE_SMALL, font, color: cMuted() });
                y -= 10;
            }
            y -= 2;
        }
    }

    y -= 10;
    // Total geral em caixa laranja (estilo fatura)
    const totalW = 95;
    const totalX = colUnit - totalW + 8;
    page.drawRectangle({
        x: totalX - 4,
        y: y - LINE_HEIGHT - 4,
        width: totalW + 8,
        height: LINE_HEIGHT + 10,
        color: cOrange()
    });
    page.drawText(`TOTAL: ${formatMoney(totalGeral)}`, { x: totalX, y: y - 12, size: FONT_SIZE, font: boldFont, color: cWhite() });
    y -= LINE_HEIGHT + 18;

    function drawBlock(title, text) {
        if (!text || !String(text).trim()) return;
        if (y < MARGIN + 30) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            if (darkMode) page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: rgb(rgbBg.r, rgbBg.g, rgbBg.b) });
            y = PAGE_HEIGHT - MARGIN;
        }
        page.drawText(title, { x: MARGIN, y: y - FONT_SIZE, size: FONT_SIZE, font: boldFont, color: cBlue() });
        y -= LINE_HEIGHT;
        const lines = String(text).trim().split(/\n/);
        for (const line of lines) {
            if (y < MARGIN + 12) { page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]); if (darkMode) page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: rgb(rgbBg.r, rgbBg.g, rgbBg.b) }); y = PAGE_HEIGHT - MARGIN; }
            page.drawText(line.slice(0, 110), { x: MARGIN, y: y - FONT_SIZE_SMALL, size: FONT_SIZE_SMALL, font, color: cText() });
            y -= 12;
        }
        y -= 6;
    }

    if (documento.condicoes_pagamento && String(documento.condicoes_pagamento).trim()) {
        drawBlock('Condições de pagamento:', documento.condicoes_pagamento);
    }
    if (documento.observacoes) {
        drawBlock('Observações:', documento.observacoes);
    }

    if (documento.data_documento || (documento.validade_ate && tipo === 'orcamento')) {
        if (y < MARGIN + 20) { page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]); if (darkMode) page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: rgb(rgbBg.r, rgbBg.g, rgbBg.b) }); y = PAGE_HEIGHT - MARGIN; }
        if (documento.data_documento) {
            page.drawText(`Data: ${formatDate(documento.data_documento)}`, { x: MARGIN, y: y - FONT_SIZE_SMALL, size: FONT_SIZE_SMALL, font, color: cMuted() });
            y -= 12;
        }
        if (documento.validade_ate && tipo === 'orcamento') {
            page.drawText(`Válido até: ${formatDate(documento.validade_ate)}`, { x: MARGIN, y: y - FONT_SIZE_SMALL, size: FONT_SIZE_SMALL, font, color: cMuted() });
            y -= 12;
        }
        y -= 8;
    }

    // Bloco PIX (chave + QR Code)
    const pixChave = (emitente.pix_chave || '').trim();
    const pixNome = (emitente.pix_nome || '').trim();
    const pixCidade = (emitente.pix_cidade || '').trim();
    if (pixChave && pixNome && pixCidade) {
        if (y < MARGIN + 100) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            if (darkMode) page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: rgb(rgbBg.r, rgbBg.g, rgbBg.b) });
            y = PAGE_HEIGHT - MARGIN;
        }
        page.drawText('Pagamento via PIX', { x: MARGIN, y: y - FONT_SIZE, size: FONT_SIZE, font: boldFont, color: cBlue() });
        y -= LINE_HEIGHT + 6;
        try {
            const pix = QrCodePix({
                version: '01',
                key: pixChave,
                name: pixNome.substring(0, 25).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
                city: pixCidade.substring(0, 15).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
                value: totalGeral > 0 ? totalGeral : undefined,
                transactionId: 'DOC' + (documento.id || Date.now()).toString().slice(-8)
            });
            const dataUrl = await pix.base64({ width: 120, margin: 1 });
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
            const qrBytes = Buffer.from(base64Data, 'base64');
            const qrImg = await pdfDoc.embedPng(qrBytes);
            const qrSize = 70;
            page.drawImage(qrImg, { x: MARGIN, y: y - qrSize, width: qrSize, height: qrSize });
            page.drawText('Chave PIX:', { x: MARGIN + qrSize + 12, y: y - 12, size: FONT_SIZE_SMALL, font: boldFont, color: cText() });
            page.drawText(pixChave, { x: MARGIN + qrSize + 12, y: y - 26, size: FONT_SIZE_SMALL, font, color: cMuted() });
            y -= qrSize + 16;
        } catch (e) {
            logger.warn('documentos-pdf: PIX QR não gerado', { message: e.message });
            page.drawText('Chave PIX: ' + pixChave, { x: MARGIN, y: y - FONT_SIZE_SMALL, size: FONT_SIZE_SMALL, font, color: cText() });
            y -= 20;
        }
    }

    // Rodapé: Obrigado pela preferência
    if (y < MARGIN + 40) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        if (darkMode) page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: rgb(rgbBg.r, rgbBg.g, rgbBg.b) });
        y = PAGE_HEIGHT - MARGIN;
    }
    page.drawText('Obrigado pela preferência.', { x: MARGIN, y: y - FONT_SIZE, size: FONT_SIZE, font: boldFont, color: cBlue() });
    y -= 28;

    // Recibo: imagens dos comprovantes
    if (tipo === 'recibo' && anexos.length > 0) {
        for (const anexo of anexos) {
            if (!anexo.url) continue;
            try {
                const { type, bytes } = await fetchImage(anexo.url);
                const img = type === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
                const maxW = PAGE_WIDTH - 2 * MARGIN;
                const maxH = 280;
                let w = img.width;
                let h = img.height;
                if (w > maxW || h > maxH) {
                    const r = Math.min(maxW / w, maxH / h);
                    w *= r;
                    h *= r;
                }
                if (y - h - LINE_HEIGHT < MARGIN) {
                    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                    if (darkMode) page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: rgb(rgbBg.r, rgbBg.g, rgbBg.b) });
                    y = PAGE_HEIGHT - MARGIN;
                }
                const caption = (anexo.descricao || `Comprovante - ${anexo.tipo_categoria || ''}`).slice(0, 70);
                page.drawText(caption, { x: MARGIN, y: y - FONT_SIZE_SMALL, size: FONT_SIZE_SMALL, font, color: cMuted() });
                y -= LINE_HEIGHT;
                page.drawImage(img, { x: MARGIN, y: y - h, width: w, height: h });
                y -= h + 14;
            } catch (e) {
                logger.warn('documentos-pdf: anexo não carregado', { url: anexo.url, message: e.message });
            }
        }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}

module.exports = { gerarPdfBuffer };
