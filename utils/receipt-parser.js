/**
 * Pipeline de extração de comprovantes brasileiros (pt-BR).
 * Retorna JSON padrão: status, amount_paid, paid_at, merchant, payment_method, confidence, candidates, raw_ocr_text.
 * REGRA MESTRA: DECLINED primeiro (RECUSADA/NEGADA/etc) => amount_paid = null, parar extração.
 */

const {
    detectIssuer,
    extractBRLMoneyTokens,
    normalizeBRL,
    scoreCandidates,
    isDeclinedLine,
    ISSUER_PROFILES
} = require('./recibo-issuer-profiles');

// Status recusado: prioridade máxima — parar extração de valor
const DECLINED_TERMS = [
    'RECUSADA', 'RECUSADO', 'NEGADA', 'NEGADO', 'CANCELADA', 'CANCELADO',
    'ESTORNADO', 'ESTORNO', 'FALHOU', 'NÃO APROVADO', 'NAO APROVADO',
    'TRANSAÇÃO NÃO AUTORIZADA', 'TRANSACAO NAO AUTORIZADA'
];

function isDeclinedReceipt(rawText) {
    if (!rawText || typeof rawText !== 'string') return false;
    const upper = rawText.toUpperCase();
    return DECLINED_TERMS.some(term => upper.includes(term));
}

// Rejeitar tokens que parecem ID (número longo sem formato BRL típico)
function isValidBRLValue(value, raw) {
    if (value == null || value < 0 || value >= 1000000) return false;
    const s = (raw || String(value)).replace(/\s/g, '');
    if (/^\d{8,}$/.test(s.replace(/[.,]/g, ''))) return false;
    return true;
}

/**
 * Extrai data/hora do texto (DD/MM/YYYY HH:MM:SS, DD.MM.YY HH:MM:SS, etc).
 * @returns {string|null} ISO 8601 ou null
 */
function extractPaidAt(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;
    const lines = rawText.split(/\r?\n/);
    const currentYear = new Date().getFullYear();
    for (const line of lines) {
        let m = line.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})\s+(\d{1,2})[Hh:.](\d{2})[.:]?(\d{2})?/);
        if (m) {
            const d = parseInt(m[1], 10);
            const mo = parseInt(m[2], 10) - 1;
            let y = parseInt(m[3], 10);
            if (y < 100) y += y < 50 ? 2000 : 1900;
            const h = parseInt(m[4], 10);
            const min = parseInt(m[5], 10);
            const sec = m[6] ? parseInt(m[6], 10) : 0;
            const date = new Date(y, mo, d, h, min, sec);
            if (!isNaN(date.getTime())) return date.toISOString();
        }
        m = line.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})/);
        if (m) {
            const d = parseInt(m[1], 10);
            const mo = parseInt(m[2], 10) - 1;
            let y = parseInt(m[3], 10);
            if (y < 100) y += y < 50 ? 2000 : 1900;
            const date = new Date(y, mo, d);
            if (!isNaN(date.getTime())) return date.toISOString();
        }
    }
    return null;
}

/**
 * Detecta método de pagamento no texto.
 * @returns {'PIX'|'DEBITO'|'CREDITO'|'PEDAGIO'|'NFCe'|'OUTRO'}
 */
function extractPaymentMethod(rawText, issuer) {
    if (!rawText || typeof rawText !== 'string') return 'OUTRO';
    const t = rawText.toUpperCase();
    if (/\bPIX\b|RECEBIMENTO PIX|RECEBIMENTO\s+PIX/.test(t)) return 'PIX';
    if (/\bDÉBITO\b|DEBITO\b|F\.PGTO:\s*DEBITO|DÉBITO/.test(t)) return 'DEBITO';
    if (/\bCRÉDITO\b|CREDITO\b|CREDITO A VISTA|À VISTA|A VISTA/.test(t)) return 'CREDITO';
    if (/\bCARTAO\b|CARTÃO|PGTO\s*:\s*CARTAO/.test(t)) return 'CREDITO';
    const pedagio = ['ARTERIS', 'ENTREVIAS', 'VIAPAULISTA', 'CCR', 'ECOVIAS', 'SEM PARAR', 'PEDÁGIO', 'PEDAGIO', 'DFE.', 'VALOR PAGO:R'];
    if (pedagio.some(k => t.includes(k))) return 'PEDAGIO';
    if (/\bNFC-E\b|NFC-E|LINX\b|VALOR PAGO\s*\(R[S$]\)|DOCUMENTO AUXILIAR/.test(t)) return 'NFCe';
    return 'OUTRO';
}

/**
 * Extrai nome do estabelecimento (favorecido/merchant).
 */
function extractMerchant(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;
    const linhas = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const ignorar = new Set(['getnet', 'cielo', 'linx', 'via cliente', 'via estab', 'reimpressao', 'documento auxiliar', 'consumidor nao identificado', 'sicredi']);
    let melhor = '';
    for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i];
        const lower = linha.toLowerCase();
        if (ignorar.has(lower) || lower.length < 4) continue;
        if (/EC\s*:.*TERM|TERM\s+[A-Z0-9]/i.test(linha) && linha.length < 70) continue;
        if (/^\d|^R\s*\$\s*|^[\d.,\s]+$/.test(linha)) continue;
        if (/\b(LTDA|S\/A|ME|EPP)\s*$/i.test(linha) && linha.length > 6) return linha;
        if (/POSTO\s+|AUTO\s*POSTO|ENTREVIAS|VIAPAULISTA|SICREDI/i.test(linha) && linha.length <= 80) {
            if (!melhor || linha.length > melhor.length) melhor = linha;
        }
        if (linha.includes('CNPJ') && i > 0) {
            const anterior = linhas[i - 1];
            if (anterior.length > 3 && anterior.length < 80 && !/^\d/.test(anterior)) return anterior;
        }
    }
    if (melhor) return melhor;
    for (const linha of linhas) {
        if (/EC\s*:.*TERM|TERM\s+[A-Z0-9]/i.test(linha) && linha.length < 70) continue;
        if (linha.length >= 8 && linha.length <= 60 && !/^\d|R\s*\$/i.test(linha) && !ignorar.has(linha.toLowerCase()))
            return linha;
    }
    return null;
}

function splitLines(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];
    return rawText.replace(/\r/g, '').split(/\n/).map(l => l.trim()).filter(Boolean);
}

/**
 * Detecta se o texto parece "print de lista" (várias transações).
 * Heurística: muitas linhas com valor + pouco texto de comprovante (sem NFC-e, VIA CLIENTE, etc.).
 */
function looksLikeTransactionList(lines) {
    if (!lines || lines.length < 4) return false;
    const moneyLines = lines.filter(l => /,\d{2}\s*R\$/i.test(l) || /R\$\s*\d+,\d{2}/i.test(l) || /\d+,\d{2}\s*(?:R\$)?/i.test(l));
    const hasReceiptWords = lines.some(l => /DANFE|NFC|VALOR PAGO|CHAVE DE ACESSO|VIA CLIENTE|AUTORIZA|imagedelivery/i.test(l));
    return moneyLines.length >= 4 && !hasReceiptWords;
}

/**
 * Parse de PRINT DE LISTA: extrai cada linha com valor como transação; marca DECLINED se "Recusada" no bloco.
 * Retorna transactions[] e total_paid (soma dos PAID).
 */
function parseTransactionList(rawText) {
    const lines = splitLines(rawText);
    const transactions = [];
    let total = 0;
    for (const line of lines) {
        const up = line.toUpperCase();
        const moneyMatch = line.match(/(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})\s*R\$/i) || line.match(/R\$\s*(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})/i) || line.match(/(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})/);
        if (!moneyMatch) continue;
        const rawVal = moneyMatch[0].replace(/\s+/g, ' ').trim();
        const val = normalizeBRL(rawVal);
        if (val == null || val < 0 || val >= 1000000) continue;
        const declined = up.includes('RECUSADA') || up.includes('RECUSADO') || up.includes('NEGADO') || up.includes('CANCELADO');
        const title = line.replace(rawVal, '').replace(/R\$/gi, '').trim() || 'Transação';
        transactions.push({
            title: title.slice(0, 120),
            amount: val,
            status: declined ? 'DECLINED' : 'PAID',
            evidence: rawVal
        });
        if (!declined) total += val;
    }
    total = Math.round(total * 100) / 100;
    return {
        status: 'PAID',
        amount_paid: null,
        currency: 'BRL',
        paid_at: null,
        merchant: null,
        payment_method: 'OUTRO',
        confidence: transactions.length ? 0.9 : 0.2,
        warnings: transactions.length ? [] : ['nenhuma transação detectada no print'],
        candidates: [],
        raw_ocr_text: rawText,
        transactions,
        total_paid: transactions.length ? total : null
    };
}

/**
 * Converte score (0..100) e ambiguous em confidence (0..1).
 * score < 55 => max 0.65; top1 - top2 < 10 => ambiguous => reduz.
 */
function scoreToConfidence(topScore, ambiguous) {
    if (topScore == null || topScore <= 0) return 0;
    let c = Math.min(1, 0.5 + (topScore / 100) * 0.5);
    if (topScore < 55) c = Math.min(c, 0.65);
    if (ambiguous) c = Math.min(c, 0.75);
    return Math.round(c * 100) / 100;
}

/**
 * Parse principal: OCR text => JSON padrão da especificação.
 * @param {string|{ text: string }} ocrResult - Texto do OCR ou objeto com .text
 * @returns {{
 *   status: 'PAID'|'DECLINED'|'UNKNOWN',
 *   amount_paid: number|null,
 *   currency: 'BRL',
 *   paid_at: string|null,
 *   merchant: string|null,
 *   payment_method: string,
 *   confidence: number,
 *   candidates: Array<{value: number, score: number, evidence: string}>,
 *   raw_ocr_text: string,
 *   issuer?: string,
 *   ambiguous?: boolean
 * }}
 */
function parseReceipt(ocrResult) {
    const rawText = typeof ocrResult === 'string' ? ocrResult : (ocrResult && ocrResult.text) || '';
    const raw_ocr_text = rawText;

    const defaultOut = {
        status: 'UNKNOWN',
        amount_paid: null,
        currency: 'BRL',
        paid_at: null,
        merchant: null,
        payment_method: 'OUTRO',
        confidence: 0,
        warnings: [],
        candidates: [],
        raw_ocr_text
    };

    if (!rawText || !rawText.trim()) {
        return defaultOut;
    }

    // ----- PRIORIDADE MÁXIMA: comprovante recusado/negado -----
    if (isDeclinedReceipt(rawText)) {
        return {
            ...defaultOut,
            status: 'DECLINED',
            confidence: 0.99,
            warnings: [],
            paid_at: extractPaidAt(rawText),
            merchant: extractMerchant(rawText),
            payment_method: extractPaymentMethod(rawText, null)
        };
    }

    const linesForList = splitLines(rawText);
    if (looksLikeTransactionList(linesForList)) {
        return parseTransactionList(rawText);
    }

    const lines = rawText.split(/\r?\n/);
    const issuer = detectIssuer(rawText);
    const profile = ISSUER_PROFILES[issuer] || ISSUER_PROFILES.GENERIC_BR;

    const declinedLineIndexes = new Set();
    lines.forEach((line, i) => {
        if (isDeclinedLine(line, profile)) declinedLineIndexes.add(i);
    });

    let candidates = extractBRLMoneyTokens(rawText);
    candidates = candidates.filter(c => isValidBRLValue(c.value, c.raw));
    candidates = candidates.filter(c => !declinedLineIndexes.has(c.lineIndex));
    if (candidates.length === 0) {
        candidates = extractBRLMoneyTokens(rawText).filter(c => isValidBRLValue(c.value, c.raw));
    }

    let scored = scoreCandidates(candidates, lines, profile);
    // Bônus se "VALOR PAGO" aparece em linha próxima (acima/abaixo) do candidato
    for (const c of scored) {
        const near = [lines[c.lineIndex - 1], lines[c.lineIndex], lines[c.lineIndex + 1]].filter(Boolean).join(' ').toUpperCase();
        if (near.includes('VALOR PAGO')) { c.score += 35; c.evidence = (c.evidence || c.line || '').trim() || 'perto de VALOR PAGO'; }
        if (near.includes('F.PGTO') || near.includes('F.PGTO:') || near.includes('DEBITO') || near.includes('CRÉDITO') || near.includes('CREDITO')) c.score += 5;
    }
    scored.sort((a, b) => b.score - a.score);

    const top = scored[0];
    const second = scored[1];
    const ambiguous = !!(top && second && top.score > 0 && (top.score - second.score) < 10);
    const lowScore = top && top.score < 55;

    // Usar sempre o melhor candidato para preencher o valor (evita 0 quando a linha tem EC/TERM e score fica baixo)
    const amount_paid = top && top.value != null && top.value > 0 ? top.value : null;
    const confidence = scoreToConfidence(top ? top.score : 0, ambiguous);

    const warnings = [];
    if (!top || (top.value == null || top.value <= 0)) warnings.push('nenhum valor monetário detectado');
    if (ambiguous) warnings.push('ambíguo: dois valores muito próximos');
    if (lowScore) warnings.push('baixa confiança: pedir confirmação do usuário');

    const candidatesOut = scored.slice(0, 10).map(c => ({
        value: c.value,
        score: c.score,
        evidence: (c.evidence || c.line || '').trim().slice(0, 120)
    }));

    return {
        status: amount_paid != null ? 'PAID' : 'UNKNOWN',
        amount_paid,
        currency: 'BRL',
        paid_at: extractPaidAt(rawText),
        merchant: extractMerchant(rawText),
        payment_method: extractPaymentMethod(rawText, issuer),
        confidence,
        warnings,
        candidates: candidatesOut,
        raw_ocr_text,
        issuer,
        ambiguous: ambiguous || lowScore
    };
}

/**
 * Testes unitários: NFC-e, maquininha, pedágio, ticket reimpressão, print Recusada.
 * Executar: node -e "require('./utils/receipt-parser').runTests()"
 */
function runTests() {
    const tests = [
        {
            name: 'NFC-e com VALOR PAGO',
            text: 'LINX\nG E G AUTO POSTO LTDA\nSubtotal R$ 100,00\nValor Total R$ 100,00\nVALOR PAGO (R$) 100,00\nRecebimento PIX\nFederal R$ 7,40',
            expectStatus: 'PAID',
            expectAmount: 100,
            expectMethod: 'PIX'
        },
        {
            name: 'Maquininha com IDs longos + VALOR',
            text: 'SICREDI\nVIA - CLIENTE\nPOSTO MORADA DO SOL\nEC: 000000092248079 TERM: 1FX07E29\nVALOR 173,78\nCREDITO A VISTA\nAUT-415497',
            expectStatus: 'PAID',
            expectAmount: 173.78,
            expectMethod: 'CREDITO'
        },
        {
            name: 'Pedágio Valor Pago:R$',
            text: 'Conc. Rodovias do Interior Paulista S/A\nValor Pago:R$11.20\nF.Pgto: Débito\ndfe.arteris.com.br',
            expectStatus: 'PAID',
            expectAmount: 11.20,
            expectMethod: 'DEBITO'
        },
        {
            name: 'Ticket REIMPRESSÃO Crédito à vista',
            text: 'VIA CLIENTE\nLARANJINHA\nCRÉDITO À VISTA R$ 152,00\nREIMPRESSÃO',
            expectStatus: 'PAID',
            expectAmount: 152,
            expectMethod: 'CREDITO'
        },
        {
            name: 'Print com linha Recusada',
            text: 'P1 21/02 R$ 11,20\nRecusada',
            expectStatus: 'DECLINED',
            expectAmount: null
        },
        {
            name: 'Entrevias pedágio Valor: R$',
            text: 'DOC. FISCAL EQUIVALENTE\nEntrevias\nValor: R$9,10\nPgto:Cartao\nentrevias.com.br/dfe',
            expectStatus: 'PAID',
            expectAmount: 9.10
        },
        {
            name: 'Getnet CREDITO R$',
            text: 'Getnet\nVia Estab\nCREDITO R$ 178,00\nAUT:152940',
            expectStatus: 'PAID',
            expectAmount: 178
        }
    ];
    let ok = 0;
    for (const t of tests) {
        const r = parseReceipt(t.text);
        const statusOk = r.status === t.expectStatus;
        const amountOk = t.expectAmount == null
            ? (r.amount_paid == null)
            : (r.amount_paid != null && Math.abs(r.amount_paid - t.expectAmount) < 0.02);
        const methodOk = !t.expectMethod || r.payment_method === t.expectMethod;
        const pass = statusOk && amountOk && methodOk;
        if (pass) ok++;
        console.log(
            (pass ? '[OK]' : '[FAIL]') + ' ' + t.name +
            ' -> status=' + r.status + ', amount_paid=' + r.amount_paid +
            ', payment_method=' + r.payment_method +
            (t.expectAmount != null ? ' (expected ' + t.expectAmount + ')' : '')
        );
    }
    console.log('--- ' + ok + '/' + tests.length + ' passed');
    return { passed: ok, total: tests.length };
}

module.exports = {
    parseReceipt,
    isDeclinedReceipt,
    extractPaidAt,
    extractPaymentMethod,
    extractMerchant,
    DECLINED_TERMS,
    runTests
};
