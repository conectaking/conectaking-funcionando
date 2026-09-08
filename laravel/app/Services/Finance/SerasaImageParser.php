<?php

namespace App\Services\Finance;

/**
 * Parser OCR "Detalhes da dívida" Serasa (paridade utils/serasa-image-parser.js).
 */
class SerasaImageParser
{
    private static function isSerasaLinkOrInvalid(?string $s): bool
    {
        if ($s === null || trim($s) === '') {
            return true;
        }
        $t = trim($s);

        return (bool) preg_match('/n[aã]o\s+reconhece|reconhece\s+a\s+empresa\s*\??/iu', $t) || strlen($t) < 2;
    }

    private static function valueAfterLabel(string $text, string $labelRegex, ?string $valueRegex = null): ?string
    {
        $value = $valueRegex ?: '/R\$\s*[\d.]{1,3}(?:\.\d{3})*,\d{2}/u';
        $lines = array_values(array_filter(array_map('trim', preg_split('/\r?\n/', $text) ?: [])));
        foreach ($lines as $i => $line) {
            if (! preg_match('/'.$labelRegex.'/iu', $line)) {
                continue;
            }
            if (preg_match($value, $line, $m)) {
                return trim($m[0]);
            }
            $next = $lines[$i + 1] ?? null;
            if ($next) {
                if (preg_match($value, $next, $m)) {
                    return trim($m[0]);
                }
                if (preg_match('/n[aã]o\s+reconhece|reconhece\s+a\s+empresa/iu', $next)) {
                    return null;
                }
                if (! preg_match('/^(Razão|Número|Produto|Data|Valor|Total|Conta atrasada)/iu', $next)) {
                    return trim($next);
                }
            }
        }

        return null;
    }

    private static function textAfterLabel(string $text, string $labelRegex, int $maxLines = 2): ?string
    {
        $lines = array_values(array_filter(array_map('trim', preg_split('/\r?\n/', $text) ?: [])));
        foreach ($lines as $i => $line) {
            if (! preg_match('/'.$labelRegex.'/iu', $line)) {
                continue;
            }
            $after = trim(preg_replace('/'.$labelRegex.'/iu', '', $line, 1) ?? '');
            if ($after !== '' && ! self::isSerasaLinkOrInvalid($after) && ! preg_match('/^R\$\s*[\d.,\s]+$/u', $after)) {
                return mb_substr($after, 0, 300);
            }
            for ($j = 1; $j <= $maxLines && ($i + $j) < count($lines); $j++) {
                $next = $lines[$i + $j];
                if (preg_match('/n[aã]o\s+reconhece|reconhece\s+a\s+empresa\s*\??/iu', $next)) {
                    continue;
                }
                if (preg_match('/^(Razão|Número|Produto|Data|Valor|Total|Conta atrasada|Perguntas|O que|Empresa responsável|Entenda)/iu', $next)) {
                    break;
                }
                if ($next !== '' && ! self::isSerasaLinkOrInvalid($next) && ! preg_match('/^R\$\s*[\d.,\s]+$/u', $next)) {
                    return mb_substr($next, 0, 300);
                }
            }
        }

        return null;
    }

    private static function fallbackEmpresaOrigem(string $ocrText): ?string
    {
        if (! preg_match('/Empresa\s+origem/iu', $ocrText)) {
            return null;
        }
        if (preg_match('/Empresa\s+origem\s*[\s:\n]*([A-Za-z][A-Za-z0-9\s\-]+?)(?=\s*\n\s*(?:N[uú]mero|Data|Produto|Valor|Total|Perguntas|O que)|$)/imu', $ocrText, $m)) {
            $v = mb_substr(trim(preg_replace('/\s+/', ' ', $m[1]) ?? ''), 0, 80);
            if (! self::isSerasaLinkOrInvalid($v) && strlen($v) >= 2) {
                return $v;
            }
        }
        $bancos = ['Banco Inter', 'Banco Inter S.A.', 'FORT BRASIL', 'Fort Brasil', 'Santander', 'Itau', 'Nubank', 'C6 Bank', 'Bradesco', 'Caixa', 'Recovery'];
        foreach ($bancos as $b) {
            if (preg_match('/\b'.preg_quote($b, '/').'\b/iu', $ocrText)) {
                return $b;
            }
        }

        return null;
    }

    private static function fallbackProdutoServico(string $ocrText): ?string
    {
        if (preg_match('/Produto\s*\/?\s*Servi[cç]o\s*[\s:\n]*([^\n]+?)(?=\s*\n\s*(?:Valor\s+original|Valor\s+atual|Total a negociar|Perguntas|O que)|$)/imu', $ocrText, $m)) {
            $v = mb_substr(trim(preg_replace('/\s+/', ' ', $m[1]) ?? ''), 0, 300);
            if (! self::isSerasaLinkOrInvalid($v) && ! preg_match('/^R\$\s*[\d.,\s]+$/u', $v)) {
                return $v;
            }
        }
        if (preg_match('/Cart[aã]o\s+de\s+Cr[eé]dito|CART[AÃ]O\s+GOLD|MASTERCARD/iu', $ocrText)
            && preg_match('/(Cart[aã]o\s+de\s+Cr[eé]dito\s*[^\n]*?)(?=\n\s*(?:Valor|Total|Perguntas|O que)|$)/imu', $ocrText, $cartao)) {
            $v = mb_substr(trim(preg_replace('/\s+/', ' ', $cartao[1]) ?? ''), 0, 300);
            if (strlen($v) > 10) {
                return $v;
            }
        }

        return null;
    }

    /**
     * @return array<string,mixed>|null
     */
    public static function parseDetalhesDividaText(?string $ocrText): ?array
    {
        if ($ocrText === null || $ocrText === '') {
            return null;
        }
        $nome = self::textAfterLabel($ocrText, 'Razão social|Empresa responsável|BANCO|NOME DA EMPRESA')
            ?: self::textAfterLabel($ocrText, 'Razão social');
        if (preg_match('/FIDC\s+[A-Z0-9\s]+/iu', $ocrText, $fm) && (! $nome || self::isSerasaLinkOrInvalid($nome))) {
            $nome = trim($fm[0]);
        }
        if (self::isSerasaLinkOrInvalid($nome)) {
            $nome = null;
        }
        $empresaOrigem = self::textAfterLabel($ocrText, 'Empresa\\s+origem|Empresa origem', 3);
        if (! $empresaOrigem || self::isSerasaLinkOrInvalid($empresaOrigem)) {
            $empresaOrigem = self::fallbackEmpresaOrigem($ocrText);
        }
        $numeroContrato = self::textAfterLabel($ocrText, 'Número do contrato|Número do contrato');
        if (preg_match('/N[uú]mero\s+do\s+contrato\s*[\s:]*(\d+)/iu', $ocrText, $cm)
            || preg_match('/(\d{6,20})/', $ocrText, $cm)) {
            $numeroContrato = preg_replace('/\D/', '', $cm[1] ?? $cm[0] ?? '') ?? '';
        } elseif (is_string($numeroContrato)) {
            $numeroContrato = preg_replace('/\D/', '', $numeroContrato) ?? '';
        }
        $produtoServico = self::textAfterLabel($ocrText, 'Produto\\s*\\/\\s*Serviço|Produto / Serviço|Produto\\s+ou\\s+serviço|Produto ou Serviço', 3);
        if (! $produtoServico || self::isSerasaLinkOrInvalid($produtoServico)) {
            $produtoServico = self::fallbackProdutoServico($ocrText);
        }
        $dataDivida = self::textAfterLabel($ocrText, 'Data da dívida') ?: self::textAfterLabel($ocrText, 'Data de origem', 1);
        if (preg_match('/Data da d[ií]vida\s*[\s:]*(\d{2}\/\d{2}\/\d{4})/iu', $ocrText, $dm)
            || preg_match('/Data de origem\s*[\s:]*(\d{2}\/\d{2}\/\d{4})/iu', $ocrText, $dm)
            || preg_match('/(\d{2}\/\d{2}\/\d{4})/', $ocrText, $dm)) {
            $dataDivida = trim($dm[1] ?? $dm[0] ?? '');
        }

        $valorOriginalStr = self::valueAfterLabel($ocrText, 'Valor original');
        $valorAtualStr = self::valueAfterLabel($ocrText, 'Valor atual')
            ?: self::valueAfterLabel($ocrText, 'D[ií]vida\\s+[Nn]egativada|Dívida Negativada')
            ?: self::valueAfterLabel($ocrText, 'Conta atrasada');
        $totalNegociarStr = self::valueAfterLabel($ocrText, 'Total a negociar|Total a negociar')
            ?: self::valueAfterLabel($ocrText, 'Valor da negocia[cç]ão|Valor da negocia[cç]ao');

        $valorOriginal = $valorOriginalStr ? SerasaPdfParser::parseValor($valorOriginalStr) : null;
        $valorAtual = $valorAtualStr ? SerasaPdfParser::parseValor($valorAtualStr) : null;
        $valorTotal = $totalNegociarStr ? SerasaPdfParser::parseValor($totalNegociarStr) : ($valorAtual ?? $valorOriginal);

        $tipo = null;
        if (preg_match('/Conta atrasada/iu', $ocrText)) {
            $tipo = 'Conta atrasada';
        } elseif (preg_match('/D[ií]vida\s+negativada/iu', $ocrText)) {
            $tipo = 'Dívida negativada';
        }

        $razaoSocialVal = self::textAfterLabel($ocrText, 'Razão social', 2) ?: self::textAfterLabel($ocrText, 'Empresa responsável', 2);
        if (self::isSerasaLinkOrInvalid($razaoSocialVal)) {
            $razaoSocialVal = null;
        } else {
            $razaoSocialVal = mb_substr(trim((string) $razaoSocialVal), 0, 120);
        }
        $razaoFinal = $nome ?: $razaoSocialVal ?: self::textAfterLabel($ocrText, 'Razão social');
        if (self::isSerasaLinkOrInvalid($razaoFinal)) {
            $razaoFinal = null;
        }
        $nomeClean = ($razaoFinal && ! self::isSerasaLinkOrInvalid($razaoFinal)) ? mb_substr(trim($razaoFinal), 0, 120) : null;
        $empresaOrigemClean = ($empresaOrigem && ! self::isSerasaLinkOrInvalid($empresaOrigem)) ? mb_substr(trim($empresaOrigem), 0, 80) : null;
        $contractNum = is_string($numeroContrato) ? $numeroContrato : (string) ($numeroContrato ?: '');
        $hasContract = strlen($contractNum) >= 6;

        if (! $nomeClean && ! $razaoFinal && $valorTotal === null && $valorAtual === null && $valorOriginal === null) {
            return null;
        }

        return array_filter([
            'nome' => mb_substr(trim($nomeClean ?: $razaoFinal ?: 'Credor'), 0, 120),
            'razaoSocial' => $razaoSocialVal,
            'valorTotal' => $valorTotal ?? ($valorAtual ?? ($valorOriginal ?? 0)),
            'valorOriginal' => $valorOriginal,
            'valorAtual' => $valorAtual,
            'numeroContrato' => $hasContract ? mb_substr($contractNum, 0, 40) : ($numeroContrato ?: null),
            'produtoServico' => $produtoServico ? mb_substr(trim($produtoServico), 0, 300) : null,
            'dataDivida' => (is_string($dataDivida) && preg_match('/^\d{2}\/\d{2}\/\d{4}$/', trim($dataDivida))) ? trim($dataDivida) : null,
            'empresaOrigem' => $empresaOrigemClean,
            'tipo' => $tipo,
        ], static fn ($v) => $v !== null && $v !== '');
    }

    /**
     * @param  list<string>  $ocrTexts
     * @return list<array<string,mixed>>
     */
    public static function parseDetalhesDividaFromMultipleTexts(array $ocrTexts): array
    {
        $results = [];
        foreach ($ocrTexts as $text) {
            $one = self::parseDetalhesDividaText($text);
            if ($one) {
                $results[] = $one;
            }
        }

        return $results;
    }
}
