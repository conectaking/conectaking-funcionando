/**
 * Gera PDF de documento (recibo ou orçamento) com layout profissional:
 * logo, emitente, cliente, tabela de itens, totais, observações, data/validade;
 * para recibo inclui imagens dos comprovantes.
 */

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fetch = require('node-fetch');
const logger = require('./logger');

const MARGIN = 50;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LINE_HEIGHT = 14;
const FONT_SIZE = 10;
const FONT_SIZE_TITLE = 16;
const FONT_SIZE_HEADER = 12;

// Tema escuro (preto e bonito)
const RGB_BG = { r: 15 / 255, g: 23 / 255, b: 42 / 255 };
const RGB_TEXT = { r: 0.95, g: 0.95, b: 0.97 };
const RGB_TEXT_MUTED = { r: 0.6, g: 0.63, b: 0.7 };
const RGB_GOLD = { r: 212 / 255, g: 175 / 255, b: 55 / 255 };

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

/**
 * Busca imagem por URL e retorna { type: 'jpg'|'png', bytes: Uint8Array }.
 */
async function fetchImage(url) {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) throw new Error(`Falha ao carregar imagem: ${response.status}`);
    const buf = await response.buffer();
    const bytes = new Uint8Array(buf);
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const type = contentType.includes('png') ? 'png' : 'jpg';
    return { type, bytes };
}

/**
 * Gera o buffer do PDF do documento.
 * @param {Object} documento - documento do banco (emitente_json, cliente_json, itens_json, anexos_json, tipo, etc.)
 * @returns {Promise<Buffer>}
 */
function fillPageDark(page) {
    page.drawRectangle({
        x: 0,
        y: 0,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        color: rgb(RGB_BG.r, RGB_BG.g, RGB_BG.b)
    });
}

async function gerarPdfBuffer(documento) {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    fillPageDark(page);
    let y = PAGE_HEIGHT - MARGIN;

    const emitente = documento.emitente_json || {};
    const cliente = documento.cliente_json || {};
    const itens = Array.isArray(documento.itens_json) ? documento.itens_json : [];
    const anexos = Array.isArray(documento.anexos_json) ? documento.anexos_json : [];
    const tipo = (documento.tipo || 'recibo').toLowerCase();
    const tituloDoc = tipo === 'orcamento' ? 'ORÇAMENTO' : 'King';
    const numero = documento.numero_sequencial != null ? `#${documento.numero_sequencial}` : (documento.id ? `#${documento.id}` : '');

    const textColor = () => rgb(RGB_TEXT.r, RGB_TEXT.g, RGB_TEXT.b);
    const goldColor = () => rgb(RGB_GOLD.r, RGB_GOLD.g, RGB_GOLD.b);
    const mutedColor = () => rgb(RGB_TEXT_MUTED.r, RGB_TEXT_MUTED.g, RGB_TEXT_MUTED.b);

    function drawText(text, opts = {}) {
        const size = opts.size || FONT_SIZE;
        const useBold = opts.bold;
        const useGold = opts.gold;
        const useMuted = opts.muted;
        const color = useGold ? goldColor() : (useMuted ? mutedColor() : textColor());
        const lines = (text || '').toString().split(/\n/);
        for (const line of lines) {
            if (y < MARGIN + LINE_HEIGHT) {
                page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                fillPageDark(page);
                y = PAGE_HEIGHT - MARGIN;
            }
            page.drawText(line.slice(0, 120), {
                x: MARGIN,
                y: y - size,
                size,
                font: useBold ? boldFont : font,
                color
            });
            y -= size + 4;
        }
    }

    // Logo (se houver URL)
    if (emitente.logo_url) {
        try {
            const { type, bytes } = await fetchImage(emitente.logo_url);
            const img = type === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
            const scale = Math.min(120 / img.width, 50 / img.height, 1);
            const w = img.width * scale;
            const h = img.height * scale;
            if (y - h < MARGIN) {
                page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                fillPageDark(page);
                y = PAGE_HEIGHT - MARGIN;
            }
            page.drawImage(img, { x: MARGIN, y: y - h, width: w, height: h });
            y -= h + 10;
        } catch (e) {
            logger.warn('documentos-pdf: logo não carregada', { url: emitente.logo_url, message: e.message });
        }
    }

    // Emitente
    if (emitente.nome) drawText(emitente.nome, { bold: true });
    if (emitente.cpf_cnpj) drawText(`CNPJ/CPF: ${emitente.cpf_cnpj}`);
    if (emitente.endereco) drawText(emitente.endereco);
    if (emitente.contato) drawText(emitente.contato);
    y -= 8;

    // Título (dourado)
    drawText(`${tituloDoc} ${numero}`.trim(), { size: FONT_SIZE_TITLE, bold: true, gold: true });
    y -= 8;

    // Cliente
    drawText('Cliente:', { bold: true });
    if (cliente.logo_url) {
        try {
            const { type, bytes } = await fetchImage(cliente.logo_url);
            const img = type === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
            const scale = Math.min(80 / img.width, 40 / img.height, 1);
            const w = img.width * scale;
            const h = img.height * scale;
            if (y - h < MARGIN) {
                page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                fillPageDark(page);
                y = PAGE_HEIGHT - MARGIN;
            }
            page.drawImage(img, { x: MARGIN, y: y - h, width: w, height: h });
            y -= h + 6;
        } catch (e) {
            logger.warn('documentos-pdf: logo do cliente não carregada', { url: cliente.logo_url, message: e.message });
        }
    }
    if (cliente.nome) drawText(cliente.nome);
    if (cliente.cpf_cnpj) drawText(`CNPJ/CPF: ${cliente.cpf_cnpj}`);
    if (cliente.endereco) drawText(cliente.endereco);
    y -= 8;

    // Tabela de itens (com coluna Data quando houver)
    const colDesc = MARGIN;
    const colData = colDesc + 170;
    const colQtd = PAGE_WIDTH - MARGIN - 180;
    const colUnit = PAGE_WIDTH - MARGIN - 120;
    const colTotal = PAGE_WIDTH - MARGIN - 60;

    if (y < MARGIN + 80) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        fillPageDark(page);
        y = PAGE_HEIGHT - MARGIN;
    }
    const cT = textColor();
    const cG = goldColor();
    page.drawText('Descrição', { x: colDesc, y: y - FONT_SIZE, size: FONT_SIZE, font: boldFont, color: cG });
    page.drawText('Data', { x: colData, y: y - FONT_SIZE, size: FONT_SIZE, font: boldFont, color: cG });
    page.drawText('Qtd', { x: colQtd, y: y - FONT_SIZE, size: FONT_SIZE, font: boldFont, color: cG });
    page.drawText('Valor unit.', { x: colUnit, y: y - FONT_SIZE, size: FONT_SIZE, font: boldFont, color: cG });
    page.drawText('Subtotal', { x: colTotal, y: y - FONT_SIZE, size: FONT_SIZE, font: boldFont, color: cG });
    y -= LINE_HEIGHT + 4;

    let totalGeral = 0;
    for (const item of itens) {
        if (y < MARGIN + LINE_HEIGHT) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            fillPageDark(page);
            y = PAGE_HEIGHT - MARGIN;
        }
        const descricao = (item.descricao || '-').slice(0, 38);
        const dataStr = (item.data || '').toString().slice(0, 10);
        const qtd = item.quantidade != null ? item.quantidade : 1;
        const valorUnit = item.valor_unitario != null ? item.valor_unitario : item.valor;
        const valor = item.valor != null ? item.valor : (valorUnit * qtd);
        totalGeral += valor;
        page.drawText(descricao, { x: colDesc, y: y - FONT_SIZE, size: FONT_SIZE, font, color: cT });
        page.drawText(dataStr, { x: colData, y: y - FONT_SIZE, size: FONT_SIZE, font, color: cT });
        page.drawText(String(qtd), { x: colQtd, y: y - FONT_SIZE, size: FONT_SIZE, font, color: cT });
        page.drawText(formatMoney(valorUnit), { x: colUnit, y: y - FONT_SIZE, size: FONT_SIZE, font, color: cT });
        page.drawText(formatMoney(valor), { x: colTotal, y: y - FONT_SIZE, size: FONT_SIZE, font, color: cT });
        y -= LINE_HEIGHT;
    }

    y -= 6;
    page.drawText(`Total: ${formatMoney(totalGeral)}`, { x: colTotal - 60, y: y - FONT_SIZE, size: FONT_SIZE, font: boldFont, color: cG });
    y -= LINE_HEIGHT + 10;

    if (documento.observacoes) {
        drawText('Observações:', { bold: true });
        drawText(documento.observacoes);
        y -= 4;
    }
    if (documento.data_documento) drawText(`Data: ${formatDate(documento.data_documento)}`, { muted: true });
    if (documento.validade_ate && tipo === 'orcamento') drawText(`Válido até: ${formatDate(documento.validade_ate)}`, { muted: true });
    y -= 16;

    // Recibo: imagens dos comprovantes
    if (tipo === 'recibo' && anexos.length > 0) {
        const cM = mutedColor();
        for (const anexo of anexos) {
            if (!anexo.url) continue;
            try {
                const { type, bytes } = await fetchImage(anexo.url);
                const img = type === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
                const maxW = PAGE_WIDTH - 2 * MARGIN;
                const maxH = 320;
                let w = img.width;
                let h = img.height;
                if (w > maxW || h > maxH) {
                    const r = Math.min(maxW / w, maxH / h);
                    w *= r;
                    h *= r;
                }
                if (y - h - LINE_HEIGHT < MARGIN) {
                    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                    fillPageDark(page);
                    y = PAGE_HEIGHT - MARGIN;
                }
                const caption = anexo.descricao || `Comprovante - ${anexo.tipo_categoria || ''}`;
                page.drawText(caption.slice(0, 80), { x: MARGIN, y: y - FONT_SIZE, size: 9, font, color: cM });
                y -= LINE_HEIGHT;
                page.drawImage(img, { x: MARGIN, y: y - h, width: w, height: h });
                y -= h + 12;
            } catch (e) {
                logger.warn('documentos-pdf: anexo não carregado', { url: anexo.url, message: e.message });
            }
        }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}

module.exports = { gerarPdfBuffer };
