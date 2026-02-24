/**
 * Dicionário de Fontes (Issuer Profiles) para OCR de comprovantes brasileiros.
 * Melhora a extração de VALOR PAGO por fonte (maquininha, banco, NFC-e, pedágio, etc.).
 */

const ISSUER_PROFILES = {
    GENERIC_BR: {
        match_any: [],
        strong_value_keys: ['VALOR PAGO', 'TOTAL PAGO', 'VALOR TOTAL', 'TOTAL', 'VALOR DA COMPRA', 'PAGO', 'APROVADO', 'CONFIRMADO', 'CONCLUÍDO', 'REALIZADO'],
        negative_keys: ['TROCO', 'TAXA', 'TARIFA', 'JUROS', 'MULTA', 'SUBTOTAL', 'DESCONTO', 'PARCELA', 'X', '1/', '2/', '10X', 'SEM JUROS', 'NSU', 'AUT', 'AUTORIZAÇÃO', 'AID', 'ARQC', 'TERM', 'DOC', 'CV', 'EC', 'CÓDIGO', 'LINHA DIGITÁVEL', 'PROTOCOLO', 'CHAVE DE ACESSO', 'ICMS', 'TRIBUTOS', 'IBPT', 'SALDO', 'LIMITE', 'VALOR APRX', 'APRX. DE TRIB', 'fonte:IBPT'],
        status_declined_keys: ['RECUSADA', 'RECUSADO', 'NEGADA', 'NEGADO', 'CANCELADA', 'CANCELADO', 'ESTORNADO', 'ESTORNO', 'FALHOU', 'NÃO APROVADO', 'TRANSAÇÃO NÃO AUTORIZADA'],
        method_keys: { PIX: ['PIX'], DEBITO: ['DÉBITO', 'DEBITO'], CREDITO: ['CRÉDITO', 'CREDITO'], BOLETO: ['BOLETO'], TRANSFERENCIA: ['TRANSFERÊNCIA', 'TRANSFERENCIA'] },
        value_position_hint: 'ANY',
        notes: 'Perfil genérico Brasil',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    GETNET: {
        match_any: ['GETNET'],
        strong_value_keys: ['CREDITO', 'DEBITO', 'VALOR', 'R$'],
        negative_keys: ['NSU', 'AUT', 'TERM', 'AID', 'DOC', 'ARQC', 'CV'],
        status_declined_keys: ['RECUSADA', 'RECUSADO'],
        value_position_hint: 'BOTTOM',
        notes: 'Valor em linha destacada CREDITO R$ xxx,xx',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    CIELO: {
        match_any: ['CIELO', 'ELO', 'VIA CLIENTE', 'VIA ESTAB', 'REIMPRESSÃO', 'REIMPRESSAO', 'WWW.CIELO.COM.BR'],
        strong_value_keys: ['VALOR', 'TOTAL', 'R$'],
        negative_keys: ['NSU', 'AUT', 'TERM', 'AID', 'ARQC', 'DOC', 'CV'],
        status_declined_keys: ['RECUSADA', 'RECUSADO'],
        value_position_hint: 'BOTTOM',
        notes: 'Cielo/Via Cliente',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    REDE: {
        match_any: ['REDE', 'REDECARD'],
        strong_value_keys: ['VALOR', 'TOTAL', 'R$'],
        negative_keys: ['NSU', 'AUT', 'TERM', 'AID'],
        value_position_hint: 'BOTTOM',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    STONE: {
        match_any: ['STONE', 'TON'],
        strong_value_keys: ['VALOR', 'TOTAL', 'R$', 'APROVADO'],
        negative_keys: ['NSU', 'AUT', 'TERM'],
        value_position_hint: 'BOTTOM',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    PAGSEGURO: {
        match_any: ['PAGSEGURO', 'UOL'],
        strong_value_keys: ['VALOR', 'TOTAL', 'R$'],
        negative_keys: ['NSU', 'AUT', 'TERM'],
        value_position_hint: 'BOTTOM',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    MERCADO_PAGO: {
        match_any: ['MERCADO PAGO', 'MPOS', 'POINT'],
        strong_value_keys: ['VALOR', 'TOTAL', 'R$'],
        negative_keys: ['NSU', 'AUT'],
        value_position_hint: 'BOTTOM',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    SAFRAPAY: {
        match_any: ['SAFRAPAY'],
        strong_value_keys: ['VALOR', 'TOTAL', 'R$'],
        negative_keys: ['NSU', 'AUT'],
        value_position_hint: 'BOTTOM',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    SUMUP: {
        match_any: ['SUMUP'],
        strong_value_keys: ['VALOR', 'TOTAL', 'R$'],
        negative_keys: ['NSU', 'AUT'],
        value_position_hint: 'BOTTOM',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    VERO: {
        match_any: ['VERO'],
        strong_value_keys: ['VALOR', 'TOTAL', 'R$'],
        negative_keys: ['NSU', 'AUT'],
        value_position_hint: 'BOTTOM',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    SICREDI: {
        match_any: ['SICREDI', 'VIA - CLIENTE', 'VIA CLIENTE'],
        strong_value_keys: ['VALOR', 'R$'],
        negative_keys: ['AUT', 'CV', 'DOC', 'TERM', 'NSU', 'EC:', 'TERM:'],
        value_position_hint: 'BOTTOM',
        notes: 'TEF/maquininha cooperativa (ex.: POSTO MORADA DO SOL, VALOR 173,78)',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    SICOOB: {
        match_any: ['SICOOB'],
        strong_value_keys: ['VALOR', 'TOTAL', 'R$'],
        negative_keys: ['NSU', 'AUT'],
        value_position_hint: 'BOTTOM',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    BANRISUL: {
        match_any: ['BANRISUL'],
        strong_value_keys: ['VALOR', 'TOTAL', 'R$'],
        negative_keys: ['NSU', 'AUT'],
        value_position_hint: 'BOTTOM',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    NUBANK: {
        match_any: ['NUBANK', 'NU PAGAMENTOS', 'NUBANK S.A'],
        strong_value_keys: ['VALOR TRANSFERIDO', 'VALOR ENVIADO', 'PAGO', 'COMPROVANTE PIX'],
        negative_keys: ['SALDO', 'LIMITE'],
        value_position_hint: 'MIDDLE',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    ITAU: {
        match_any: ['ITAÚ', 'ITAU'],
        strong_value_keys: ['VALOR', 'PAGAMENTO REALIZADO', 'COMPROVANTE', 'PIX'],
        negative_keys: ['SALDO'],
        value_position_hint: 'MIDDLE',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    BRADESCO: {
        match_any: ['BRADESCO'],
        strong_value_keys: ['VALOR', 'COMPROVANTE', 'PIX', 'TRANSFERÊNCIA REALIZADA', 'TRANSFERENCIA REALIZADA'],
        negative_keys: ['SALDO'],
        value_position_hint: 'MIDDLE',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    SANTANDER: {
        match_any: ['SANTANDER'],
        strong_value_keys: ['VALOR', 'COMPROVANTE', 'PIX'],
        negative_keys: ['SALDO'],
        value_position_hint: 'MIDDLE',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    BANCO_BRASIL: {
        match_any: ['BANCO DO BRASIL', 'BB'],
        strong_value_keys: ['VALOR', 'COMPROVANTE', 'PIX'],
        negative_keys: ['SALDO'],
        value_position_hint: 'MIDDLE',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    CAIXA: {
        match_any: ['CAIXA', 'CEF'],
        strong_value_keys: ['VALOR', 'COMPROVANTE', 'PIX'],
        negative_keys: ['SALDO'],
        value_position_hint: 'MIDDLE',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    INTER: {
        match_any: ['BANCO INTER', 'INTER'],
        strong_value_keys: ['VALOR', 'COMPROVANTE PIX'],
        negative_keys: ['SALDO'],
        value_position_hint: 'MIDDLE',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    C6: {
        match_any: ['C6 BANK', 'C6'],
        strong_value_keys: ['VALOR', 'COMPROVANTE PIX'],
        negative_keys: ['SALDO'],
        value_position_hint: 'MIDDLE',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    PICPAY: {
        match_any: ['PICPAY'],
        strong_value_keys: ['VALOR', 'PAGO', 'COMPROVANTE'],
        negative_keys: ['SALDO'],
        value_position_hint: 'MIDDLE',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    NFCe: {
        match_any: ['NFC-e', 'NFC E', 'DANFE', 'DOCUMENTO AUXILIAR', 'CONSUMIDOR ELETRÔNICA', 'CHAVE DE ACESSO', 'NOTA FISCAL DE CONSUMIDOR'],
        strong_value_keys: ['VALOR PAGO', 'VALOR TOTAL', 'TOTAL', 'RECEBIMENTO PIX'],
        negative_keys: ['ICMS', 'TRIBUTOS', 'IBPT', 'TROCO', 'SUBTOTAL', 'Federal', 'Estadual', 'Municipal'],
        value_position_hint: 'MIDDLE',
        notes: 'NFC-e genérico',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    SAT: {
        match_any: ['CFe', 'CF-e', 'SAT', 'EXTRATO'],
        strong_value_keys: ['TOTAL', 'VALOR PAGO'],
        negative_keys: ['TROCO', 'SUBTOTAL'],
        value_position_hint: 'BOTTOM',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    LINX: {
        match_any: ['LINX'],
        strong_value_keys: ['VALOR PAGO', 'VALOR TOTAL', 'TOTAL', 'Subtotal', 'RECEBIMENTO PIX'],
        negative_keys: ['ICMS', 'TRIBUTOS', 'TROCO', 'Federal R$', 'Estadual R$'],
        value_position_hint: 'MIDDLE',
        notes: 'Posto/mercado NFC-e (priorizar Valor Total 100,00 e não tributos)',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    BEMATECH: {
        match_any: ['BEMATECH', 'BEMA'],
        strong_value_keys: ['TOTAL', 'VALOR PAGO'],
        negative_keys: ['TROCO', 'SUBTOTAL'],
        value_position_hint: 'BOTTOM',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    ENTREVIAS: {
        match_any: ['ENTREVIAS', 'entrevias.com.br', 'entrevias.com.br/dfe'],
        strong_value_keys: ['Valor', 'VALOR', 'VALOR PAGO', 'R$'],
        negative_keys: ['tributos', 'aprox', 'placa', 'IBPT'],
        value_position_hint: 'MIDDLE',
        notes: 'Pedágio Entrevias (ex.: Valor: R$9,10, Pgto:Cartao)',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    ARTERIS: {
        match_any: ['ARTERIS', 'dfe.arteris.com.br', 'CONC. RODOVIAS', 'RODOVIAS DO INTERIOR', 'INTERIOR PAULISTA', 'PIRASSUNUNGA', 'dfe.arteris'],
        strong_value_keys: ['Valor Pago', 'VALOR PAGO', 'F.Pgto', 'R$'],
        negative_keys: ['tributos', 'aprox', 'placa', 'IBPT'],
        value_position_hint: 'MIDDLE',
        method_keys: { DEBITO: ['Debito', 'Débito'] },
        notes: 'Pedágio Arteris / Conc. Rodovias do Interior Paulista (Valor Pago:R$11.20)',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    CCR: {
        match_any: ['CCR', 'AUTOBAN', 'ROTA DAS BANDEIRAS', 'ROTA SO', 'CONCESSIONARIA ROTA'],
        strong_value_keys: ['Valor Pago', 'VALOR PAGO', 'R$'],
        negative_keys: ['tributos', 'aprox', 'placa'],
        value_position_hint: 'MIDDLE',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    ECOVIAS: {
        match_any: ['ECOVIAS', 'ECOPISTAS', 'ECORODOVIAS'],
        strong_value_keys: ['Valor Pago', 'VALOR PAGO', 'R$'],
        negative_keys: ['tributos', 'aprox'],
        value_position_hint: 'MIDDLE',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    LARANJINHA: {
        match_any: ['LARANJINHA', 'LARANJINHA'],
        strong_value_keys: ['VALOR TOTAL', 'VALOR', 'CREDITO A VISTA', 'CRÉDITO', 'R$'],
        negative_keys: ['AUT', 'AID', 'N.ESTAB', 'TERM'],
        value_position_hint: 'MIDDLE',
        notes: 'Maquininha Laranjinha/Itaú (VIA CLIENTE, Valor Total R$)',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    VIAPAULISTA: {
        match_any: ['RODOVIAS', 'VIAPAULISTA', 'VIA PAULISTA', 'VIAPAULISTA S/A'],
        strong_value_keys: ['Valor Pago', 'VALOR PAGO', 'F.Pgto', 'R$'],
        negative_keys: ['tributos', 'aprox', 'placa'],
        value_position_hint: 'MIDDLE',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    SEM_PARAR: {
        match_any: ['SEM PARAR', 'SEMPARAR'],
        strong_value_keys: ['VALOR', 'COBRANÇA', 'COBRANCA', 'PEDÁGIO', 'PEDAGIO', 'R$'],
        negative_keys: ['tributos'],
        value_position_hint: 'MIDDLE',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    IFOOD: {
        match_any: ['IFOOD', 'IFOOD'],
        strong_value_keys: ['TOTAL', 'VALOR'],
        negative_keys: ['TAXA DE ENTREGA', 'Subtotal'],
        value_position_hint: 'BOTTOM',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    UBER: {
        match_any: ['UBER'],
        strong_value_keys: ['TOTAL', 'R$'],
        negative_keys: ['taxa', 'gorjeta'],
        value_position_hint: 'BOTTOM',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    },
    MERCADO_LIVRE: {
        match_any: ['MERCADO LIVRE'],
        strong_value_keys: ['TOTAL', 'PAGO', 'R$'],
        negative_keys: ['Subtotal'],
        value_position_hint: 'BOTTOM',
        weights: { strong: 40, weak: 15, negative: -50, position_bonus: 10 }
    }
};

const REGEX_BRL = /R\s*\$\s*[\d.]{1,3}(?:\.\d{3})*[,.]\d{2}|R\s*\$\s*\d+[,.]\d{2}|\d{1,3}(?:\.\d{3})*[,.]\d{2}|\d+[,.]\d{2}/gi;

/** Linha é de tributos (18,24% etc.) — não usar como valor pago. */
function isTributosLine(line) {
    if (!line || typeof line !== 'string') return false;
    const u = line.toUpperCase();
    return /VALOR\s*APRX|APRX\.?\s*DE\s*TRIB|TRIB\.?\s*\d|%\s*\(FONTE|FONTE:\s*IBPT/i.test(line);
}

/** Linha é só data/hora (ex.: 21.02.26 17:31:59) — números são data/hora, não valor. */
function isDateTimeOnlyLine(line) {
    if (!line || typeof line !== 'string') return false;
    const t = line.trim();
    return /^\d{1,2}[./]\d{1,2}[./]\d{2,4}\s+\d{1,2}[.:]\d{2}([.:]\d{2})?\s*$/.test(t);
}

/** Linha contém data e hora (ex.: 21.02.26 17:31:59 no meio do texto) — não extrair números como valor. */
function isLineContainingDateTime(line) {
    if (!line || typeof line !== 'string') return false;
    return /\d{1,2}[./]\d{1,2}[./]\d{2,4}\s+\d{1,2}[.:]\d{2}([.:]\d{2})?/.test(line);
}

/** Linha parece CNPJ (ex.: 03.207.703/0001-83) — números são CNPJ, não valor pago. */
function isCNPJLine(line) {
    if (!line || typeof line !== 'string') return false;
    return /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\bCNPJ\s*:/i.test(line.trim());
}

/** Linha é só hora (ex.: 17:31:59 ou 17.31.59) — não extrair como valor. */
function isTimeOnlyLine(line) {
    if (!line || typeof line !== 'string') return false;
    const t = line.trim();
    return /^\d{1,2}[.:]\d{2}[.:]\d{2}\s*$/.test(t);
}

/**
 * Normaliza string BRL para número (ex.: "R$ 1.234,56" ou "37,59" ou "10.50" -> número).
 */
function normalizeBRL(str) {
    if (!str || typeof str !== 'string') return null;
    let s = str.replace(/\s/g, '').replace(/R\$\s*/gi, '');
    if (/,/.test(s)) {
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (/\.\d{2}$/.test(s) && (s.match(/\./g) || []).length === 1) {
        s = s.replace('.', '');
        const n = parseFloat(s) / 100;
        return isNaN(n) ? null : n;
    } else {
        s = s.replace(/\./g, '').replace(',', '.');
    }
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
}

/**
 * Extrai todos os tokens de valor em BRL do texto, com linha e índice.
 */
function extractBRLMoneyTokens(text) {
    if (!text || typeof text !== 'string') return [];
    const lines = text.split(/\r?\n/);
    const candidates = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNorm = line.toUpperCase();
        // Não ignorar linha que tenha data/hora E Valor Pago ou R$ (ex.: "21.02.26 17:31:59 Valor Pago:R$11.20")
        const linhaTemValorPagoOuRs = /Valor\s*Pago|R\s*\$\s*\d/i.test(line);
        const skipLineForGeneric = isTributosLine(line) || isDateTimeOnlyLine(line)
            || (isLineContainingDateTime(line) && !linhaTemValorPagoOuRs)
            || isCNPJLine(line) || isTimeOnlyLine(line);

        if (!skipLineForGeneric) {
            const prevLine = i > 0 ? lines[i - 1] : '';
            const valorPagoNaLinhaAnterior = /Valor\s*Pago/i.test(prevLine);
            const matches = line.match(REGEX_BRL);
            if (matches) {
                for (const m of matches) {
                    const value = normalizeBRL(m);
                    if (value != null && value >= 0 && value < 1000000) {
                        candidates.push({
                            value,
                            raw: m,
                            line: line.trim(),
                            lineNorm,
                            lineIndex: i,
                            fromValorPago: valorPagoNaLinhaAnterior
                        });
                    }
                }
            }
            const matchValor = line.match(/Valor\s*:\s*(\d{1,3}(?:\.\d{3})*[,.]\d{2}|\d+[,.]\d{2})/i);
            if (matchValor) {
                const value = normalizeBRL(matchValor[1]);
                if (value != null && value >= 0 && value < 1000000) {
                    candidates.push({
                        value,
                        raw: matchValor[1],
                        line: line.trim(),
                        lineNorm,
                        lineIndex: i
                    });
                }
            }
        }
        // "Valor: R$9,10" ou "Valor R$9,10" (Entrevias — com ou sem dois pontos)
        const matchValorRs = line.match(/Valor\s*:?\s*R\s*\$\s*(\d{1,3}(?:\.\d{3})*[.,]\d{2}|\d+[.,]\d{2})/i);
        if (matchValorRs) {
            const value = normalizeBRL(matchValorRs[1]);
            if (value != null && value >= 0 && value < 1000000) {
                candidates.push({
                    value,
                    raw: matchValorRs[1],
                    line: line.trim(),
                    lineNorm,
                    lineIndex: i,
                    fromValorPago: true
                });
            }
        }
        // "VALOR 173,78" (Sicredi, maquininha — valor na mesma linha)
        const matchVALORNumero = line.match(/VALOR\s+(\d{1,3}(?:\.\d{3})*[.,]\d{2}|\d+[.,]\d{2})/i);
        if (matchVALORNumero) {
            const value = normalizeBRL(matchVALORNumero[1]);
            if (value != null && value >= 0 && value < 1000000) {
                candidates.push({
                    value,
                    raw: matchVALORNumero[1],
                    line: line.trim(),
                    lineNorm,
                    lineIndex: i,
                    fromValorPago: true
                });
            }
        }
        // "CREDITO A VISTA R$ 152,00" (Laranjinha, reimpressão)
        const matchCreditoVista = line.match(/CREDITO\s+A\s*VISTA\s*R\s*\$\s*(\d{1,3}(?:\.\d{3})*[.,]\d{2}|\d+[.,]\d{2})/i);
        if (matchCreditoVista) {
            const value = normalizeBRL(matchCreditoVista[1]);
            if (value != null && value >= 0 && value < 1000000) {
                candidates.push({
                    value,
                    raw: matchCreditoVista[1],
                    line: line.trim(),
                    lineNorm,
                    lineIndex: i,
                    fromValorPago: true
                });
            }
        }
        // "Valor Pago:R$11.20" ou "Valor Pago R$11.20" (com ou sem dois pontos — OCR pode variar)
        const matchValorPago = line.match(/Valor\s*Pago\s*:?\s*R\s*\$\s*(\d{1,3}(?:\.\d{3})*[.,]\d{2}|\d+[.,]\d{2})/i);
        if (matchValorPago) {
            const value = normalizeBRL(matchValorPago[1]);
            if (value != null && value >= 0 && value < 1000000) {
                candidates.push({
                    value,
                    raw: matchValorPago[1],
                    line: line.trim(),
                    lineNorm,
                    lineIndex: i,
                    fromValorPago: true
                });
            }
        }
        // "Valor Total R$ 100,00" ou "Subtotal R$ 100,00" (NFC-e Linx, posto) — priorizar sobre OCR errado em VALOR PAGO (ex.: 180,66)
        const matchValorTotal = line.match(/(?:Valor\s*Total|Subtotal)\s*R\s*\$\s*(\d{1,3}(?:\.\d{3})*[.,]\d{2}|\d+[.,]\d{2})/i);
        if (matchValorTotal) {
            const value = normalizeBRL(matchValorTotal[1]);
            if (value != null && value >= 0 && value < 1000000) {
                candidates.push({
                    value,
                    raw: matchValorTotal[1],
                    line: line.trim(),
                    lineNorm,
                    lineIndex: i,
                    fromValorPago: true,
                    fromSubtotalOrValorTotal: true
                });
            }
        }
        // "VALOR PAGO (RS) 100,00" — OCR às vezes lê R$ como RS
        const matchValorPagoRs = line.match(/VALOR\s*PAGO\s*\(\s*R[S$]\s*\)\s*(\d{1,3}(?:\.\d{3})*[.,]\d{2}|\d+[.,]\d{2})/i);
        if (matchValorPagoRs) {
            const value = normalizeBRL(matchValorPagoRs[1]);
            if (value != null && value >= 0 && value < 1000000) {
                candidates.push({
                    value,
                    raw: matchValorPagoRs[1],
                    line: line.trim(),
                    lineNorm,
                    lineIndex: i,
                    fromValorPago: true
                });
            }
        }
        // Valor Pago (R$) ou (RS) na linha anterior e valor na linha atual (Linx NFC-e)
        if (i > 0) {
            const prevLine = lines[i - 1].trim();
            if (/VALOR\s*PAGO\s*\(\s*R[S$]\s*\)\s*$/i.test(prevLine) || /VALOR\s*PAGO\s*\(R\$\)\s*$/i.test(prevLine)) {
                const matchNum = line.match(/(\d{1,3}(?:\.\d{3})*[.,]\d{2}|\d+[.,]\d{2})/);
                if (matchNum) {
                    const value = normalizeBRL(matchNum[1]);
                    if (value != null && value >= 0 && value < 1000000) {
                        candidates.push({
                            value,
                            raw: matchNum[1],
                            line: line.trim(),
                            lineNorm,
                            lineIndex: i,
                            fromValorPago: true
                        });
                    }
                }
            }
        }
        // "Valor Total 173,78" ou "Valor Total: R$ 154,00" (Sicredi maquininha / Laranjinha)
        const matchValorTotalG = line.match(/Valor\s*Total\s*:?\s*(?:R\s*\$\s*)?(\d{1,3}(?:\.\d{3})*[.,]\d{2}|\d+[.,]\d{2})/i);
        if (matchValorTotalG) {
            const value = normalizeBRL(matchValorTotalG[1]);
            if (value != null && value >= 0 && value < 1000000) {
                candidates.push({
                    value,
                    raw: matchValorTotalG[1],
                    line: line.trim(),
                    lineNorm,
                    lineIndex: i,
                    fromValorPago: true,
                    fromSubtotalOrValorTotal: true
                });
            }
        }
    }
    return candidates;
}

/**
 * Detecta o emissor (issuer) do comprovante por palavras-chave.
 * @returns {string} issuer_id ou "GENERIC_BR"
 */
// Ordem de detecção: pedágio primeiro (evita INTER casar com "Interior Paulista"), depois resto
const PEDAGIO_IDS = ['ENTREVIAS', 'ARTERIS', 'CCR', 'ECOVIAS', 'VIAPAULISTA', 'SEM_PARAR'];

function detectIssuer(rawText) {
    if (!rawText || typeof rawText !== 'string') return 'GENERIC_BR';
    const upper = rawText.toUpperCase().replace(/\s+/g, ' ');
    const allIds = [...new Set([...PEDAGIO_IDS, ...Object.keys(ISSUER_PROFILES).filter(k => k !== 'GENERIC_BR')])];
    for (const id of allIds) {
        const profile = ISSUER_PROFILES[id];
        if (!profile) continue;
        const keys = profile.match_any || [];
        for (const key of keys) {
            if (upper.includes(key.toUpperCase())) return id;
        }
    }
    return 'GENERIC_BR';
}

/**
 * Calcula score do candidato com base no perfil (strong_value_keys, negative_keys, position_hint).
 */
function scoreCandidates(candidates, lines, profile) {
    if (!profile || !candidates.length) return candidates.map(c => ({ ...c, score: 0 }));
    const totalLines = lines.length;
    const strong = (profile.strong_value_keys || []).map(k => k.toUpperCase());
    const negative = (profile.negative_keys || []).map(k => k.toUpperCase());
    const declined = (profile.status_declined_keys || []).map(k => k.toUpperCase());
    const w = profile.weights || { strong: 40, weak: 15, negative: -50, position_bonus: 10 };

    return candidates.map(c => {
        let score = 0;
        const lineNorm = c.lineNorm || c.line.toUpperCase();

        for (const k of strong) {
            if (lineNorm.includes(k)) {
                score += w.strong || 40;
                break;
            }
        }
        if (score === 0) score += w.weak || 15;

        const strongVal = w.strong || 40;
        const hadStrong = score >= strongVal;
        const technicalNegatives = ['TERM', 'EC', 'NSU', 'AUT', 'AID', 'ARQC', 'DOC', 'CV'];
        for (const k of negative) {
            if (lineNorm.includes(k)) {
                const penalty = w.negative || -50;
                if (hadStrong && technicalNegatives.includes(k)) {
                    score += Math.ceil(penalty / 2);
                } else {
                    score += penalty;
                }
                break;
            }
        }

        for (const k of declined) {
            if (lineNorm.includes(k)) {
                score += w.negative || -50;
                break;
            }
        }

        const hint = (profile.value_position_hint || 'ANY').toUpperCase();
        if (hint === 'BOTTOM' && totalLines > 0) {
            if (c.lineIndex >= totalLines - 4) score += w.position_bonus || 10;
        } else if (hint === 'TOP' && c.lineIndex <= 3) {
            score += w.position_bonus || 10;
        } else if (hint === 'MIDDLE' && totalLines > 4) {
            const mid = totalLines / 2;
            if (c.lineIndex >= mid - 2 && c.lineIndex <= mid + 2) score += w.position_bonus || 10;
        }

        const isRound = (Math.round(c.value * 100) % 100) === 0;
        if (isRound && /TOTAL|VALOR PAGO|PAGO|PIX|Subtotal/i.test(lineNorm)) score += 5;

        if (c.fromValorPago === true) score += 80;

        return { ...c, score };
    });
}

/**
 * Verifica se a linha indica transação recusada/negada.
 */
function isDeclinedLine(line, profile) {
    const keys = (profile && profile.status_declined_keys) || ISSUER_PROFILES.GENERIC_BR.status_declined_keys;
    const upper = (line || '').toUpperCase();
    return keys.some(k => upper.includes(k.toUpperCase()));
}

/**
 * Parse principal: detecta status, extrai candidatos BRL, aplica perfil e retorna melhor valor.
 * @param {string} rawText - Texto completo do OCR
 * @param {string[]} [lines] - Linhas (se não passado, deriva de rawText)
 * @returns {{ value: number|null, issuer: string, status: 'OK'|'DECLINED', needsConfirmation: boolean, transactions?: Array }}
 */
function parseReceipt(rawText, lines) {
    const lineList = lines || (rawText || '').split(/\r?\n/);
    const issuer = detectIssuer(rawText);
    const profile = ISSUER_PROFILES[issuer] || ISSUER_PROFILES.GENERIC_BR;

    const declinedLineIndexes = new Set();
    lineList.forEach((line, i) => {
        if (isDeclinedLine(line, profile)) declinedLineIndexes.add(i);
    });

    const candidates = extractBRLMoneyTokens(rawText);
    const withoutDeclined = candidates.filter(c => !declinedLineIndexes.has(c.lineIndex));
    const toScore = withoutDeclined.length ? withoutDeclined : candidates;

    const scored = scoreCandidates(toScore, lineList, profile);
    scored.sort((a, b) => b.score - a.score);

    const top = scored[0];
    const second = scored[1];
    const needsConfirmation = top && second && top.score > 0 && top.score - second.score < 20;

    return {
        value: top && top.score > 0 ? top.value : null,
        issuer,
        status: declinedLineIndexes.size > 0 && scored.length === 0 ? 'DECLINED' : 'OK',
        needsConfirmation: !!needsConfirmation,
        topCandidate: top || null,
        allCandidates: scored.slice(0, 5)
    };
}

/**
 * Testes/exemplos por categoria (para validar perfis).
 * Executar: node -e "require('./utils/recibo-issuer-profiles').runTests()"
 */
function runTests() {
    const tests = [
        {
            name: 'NFC-e Linx (posto)',
            text: 'LINX\nG E G AUTO POSTO LTDA\nSubtotal R$ 100,00\nValor Total R$ 100,00\nRecebimento PIX 100,00\nFederal R$ 7,40',
            expectIssuer: 'LINX',
            expectValue: 100
        },
        {
            name: 'Pedágio Viapaulista',
            text: 'DOC. FISCAL EQUIVALENTE\nVIAPAULISTA S/A\nValor Pago: R$10.50\nF.Pgto: Debito',
            expectIssuer: 'VIAPAULISTA',
            expectValue: 10.50
        },
        {
            name: 'Getnet cartão',
            text: 'Getnet\nVia Estab\nCREDITO R$ 178,00\nAUT:152940',
            expectIssuer: 'GETNET',
            expectValue: 178
        },
        {
            name: 'Cielo Via Cliente',
            text: 'VIA CLIENTE\nLARANJINHA\nCRÉDITO À VISTA R$ 152,00\nREIMPRESSÃO',
            expectIssuer: 'CIELO',
            expectValue: 152
        },
        {
            name: 'Genérico (sem marca)',
            text: 'Estabelecimento XYZ\nValor Total R$ 50,00',
            expectIssuer: 'GENERIC_BR',
            expectValue: 50
        },
        {
            name: 'Sicredi (Posto Morada do Sol)',
            text: 'SICREDI\nVIA - CLIENTE\nPOSTO MORADA DO SOL ARARAQUARA LTDA\nVALOR 173,78\nCREDITO A VISTA',
            expectIssuer: 'SICREDI',
            expectValue: 173.78
        },
        {
            name: 'Entrevias pedágio',
            text: 'DOC. FISCAL EQUIVALENTE\nEntrevias\nValor: R$9,10\nPgto:Cartao\nentrevias.com.br/dfe',
            expectIssuer: 'ENTREVIAS',
            expectValue: 9.10
        },
        {
            name: 'Arteris / Conc. Rodovias Interior Paulista',
            text: 'Conc. Rodovias do Interior Paulista S/A\nValor Pago:R$11.20\nF.Pgto: Débito\ndfe.arteris.com.br',
            expectIssuer: 'ARTERIS',
            expectValue: 11.20
        }
    ];
    let ok = 0;
    for (const t of tests) {
        const issuer = detectIssuer(t.text);
        const parsed = parseReceipt(t.text);
        const issuerOk = issuer === t.expectIssuer;
        const valueOk = t.expectValue == null ? true : (parsed.value != null && Math.abs(parsed.value - t.expectValue) < 0.02);
        const pass = issuerOk && valueOk;
        if (pass) ok++;
        console.log((pass ? '[OK]' : '[FAIL]') + ' ' + t.name + ' -> issuer=' + issuer + (t.expectIssuer ? ' (expected ' + t.expectIssuer + ')' : '') + ', value=' + parsed.value + (t.expectValue != null ? ' (expected ' + t.expectValue + ')' : ''));
    }
    console.log('--- ' + ok + '/' + tests.length + ' passed');
    return { passed: ok, total: tests.length };
}

module.exports = {
    ISSUER_PROFILES,
    detectIssuer,
    extractBRLMoneyTokens,
    normalizeBRL,
    scoreCandidates,
    parseReceipt,
    isDeclinedLine,
    runTests
};
