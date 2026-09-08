<?php

namespace App\Services\Finance;

/**
 * Parser de texto de relatório PDF "Suas ofertas na Serasa" (paridade utils/serasa-pdf-parser.js).
 */
class SerasaPdfParser
{
    /** @var list<string> */
    private const CREDORES = [
        'Banco do Brasil', 'Banco Do Brasil', 'Fort Brasil', 'Atacadão', 'Carrefour', 'PagSeguro',
        'Santander', 'Nubank', 'Itaú', 'Itau', 'Bradesco', 'Recovery', 'Ipanema', 'Inter',
        'Creditas', 'Original', 'C6 Bank', 'C6', 'BTG', 'XP', 'Safra', 'IPK', 'Dandel',
        'Cetam', 'Cétam', 'Magazine Luiza', 'Magalu', 'Casas Bahia', 'Americanas',
        'Serasa', 'Bemol', 'Riachuelo', 'Renner', 'C&A', 'C&A pay', 'Via', 'Lebes', 'Marisa',
        'Digio', 'digio', 'Neon', 'Next', 'PicPay', 'Mercado Pago', 'Banco Pan', 'Pan',
        'Porto Seguro', 'SulAmérica', 'Bradesco Saúde', 'Unimed', 'Notre Dame',
        'Credicard', 'Hipercard', 'Elo', 'Visa', 'Mastercard', 'Alelo', 'Ticket',
        'Cooperativa', 'Sicoob', 'Sicredi', 'Banrisul', 'banrisul', 'SEM PARAR', 'Caixa', 'BB', 'CEF',
    ];

    public static function parseValor(?string $str): ?float
    {
        if ($str === null || $str === '') {
            return null;
        }
        $cleaned = preg_replace('/\s+/', '', $str) ?? '';
        $cleaned = preg_replace('/R\$\s*/i', '', $cleaned) ?? $cleaned;
        $cleaned = str_replace('.', '', $cleaned);
        $cleaned = str_replace(',', '.', $cleaned);
        if (! is_numeric($cleaned)) {
            return null;
        }

        return (float) $cleaned;
    }

    /**
     * @return list<array<string,mixed>>
     */
    public static function parseSerasaOfertas(?string $text): array
    {
        if ($text === null || $text === '') {
            return [];
        }
        $lines = array_values(array_filter(array_map('trim', preg_split('/\r?\n/', $text) ?: []), static fn ($l) => $l !== ''));
        $offers = [];
        $i = 0;
        $n = count($lines);

        while ($i < $n) {
            $line = $lines[$i];
            $matchDePor = null;
            $matchDeSo = null;
            if (preg_match('/De\s*R\$\s*([\d.,\s]+)\s+por\s+R\$\s*([\d.,\s]+)/iu', $line, $m)) {
                $matchDePor = $m;
            } elseif (preg_match('/De\s*R\$\s*([\d.,\s]+)\s+por/iu', $line, $m)) {
                $matchDeSo = $m;
            }
            $matchDe = $matchDePor ?: $matchDeSo;
            if ($matchDe) {
                $valorOriginal = self::parseValor($matchDe[1]);
                $valorNegociado = ($matchDePor && isset($matchDe[2])) ? self::parseValor($matchDe[2]) : null;
                $percentualDesconto = null;
                $tipo = null;
                $parcelas = null;
                $origem = null;
                $blockLines = [$line];
                $j = $i + 1;
                while ($j < $n && $j < $i + 25) {
                    $next = $lines[$j];
                    if ($j > $i && preg_match('/^De\s*R\$/iu', $next)) {
                        break;
                    }
                    $blockLines[] = $next;
                    if ($valorNegociado === null && preg_match('/^R\$\s*[\d.,\s]+$/u', $next)) {
                        $valorNegociado = self::parseValor($next);
                    }
                    if ($valorNegociado === null && preg_match('/^[\d.,\s]+$/u', $next)) {
                        $v = self::parseValor($next);
                        if ($v !== null && $v > 0) {
                            $valorNegociado = $v;
                        }
                    }
                    if (preg_match('/↓\s*(\d+)\s*%|(\d+)\s*%\s*de\s+desconto/iu', $next, $pm)) {
                        $percentualDesconto = (int) ($pm[1] !== '' ? $pm[1] : $pm[2]);
                    }
                    if (preg_match('/At[eé]\s+(\d+)\s+vezes/iu', $next, $pm)) {
                        $parcelas = (int) $pm[1];
                    }
                    if (preg_match('/Conta\s+atrasada|D[ií]vida\s+negativada|Grupo\s+de\s+d[ií]vidas/iu', $next)) {
                        $tipo = $next;
                    }
                    if (preg_match('/^Origem\s+/iu', $next)) {
                        $origem = trim(preg_replace('/^Origem\s+/iu', '', $next) ?? '');
                    }
                    $j++;
                }
                $nome = self::pickCredorNameFromBlock($blockLines);
                if ($origem && $nome) {
                    $nome = $nome.' ('.$origem.')';
                } elseif ($origem && ! $nome) {
                    $nome = $origem;
                }
                if (! $nome) {
                    $textBefore = implode(' ', array_slice($lines, max(0, $i - 5), min(5, $i)));
                    $nome = self::findLastCredorBefore($textBefore);
                }
                $valorTotal = $valorNegociado ?? $valorOriginal;
                if ($nome || $valorTotal !== null) {
                    $offers[] = array_filter([
                        'nome' => $nome ?: 'Credor',
                        'valorTotal' => $valorTotal ?? 0,
                        'valorOriginal' => $valorOriginal,
                        'valorAtual' => $valorNegociado ?? $valorOriginal,
                        'percentualDesconto' => $percentualDesconto,
                        'tipo' => $tipo,
                        'parcelas' => $parcelas,
                    ], static fn ($v) => $v !== null);
                }
                $i = $j;

                continue;
            }
            $i++;
        }

        if (! $offers) {
            if (preg_match_all('/De\s*R\$\s*([\d.,\s]+)\s+por\s+R\$\s*([\d.,\s]+)/iu', $text, $all, PREG_SET_ORDER)) {
                foreach ($all as $m) {
                    $valorOriginal = self::parseValor($m[1]);
                    $valorNegociado = self::parseValor($m[2]);
                    $valorTotal = $valorNegociado ?? $valorOriginal;
                    if ($valorTotal !== null && $valorTotal > 0) {
                        $offers[] = [
                            'nome' => 'Credor',
                            'valorTotal' => $valorTotal,
                            'valorOriginal' => $valorOriginal,
                            'valorAtual' => $valorNegociado ?? $valorOriginal,
                        ];
                    }
                }
            }
        }

        if (! $offers) {
            if (preg_match_all('/R\$\s*[\d.]{1,3}(?:\.\d{3})*,\d{2}/u', $text, $all, PREG_OFFSET_CAPTURE)) {
                $idx = 0;
                foreach ($all[0] as $hit) {
                    $valor = self::parseValor($hit[0]);
                    if ($valor === null || $valor <= 0) {
                        continue;
                    }
                    $pos = $hit[1];
                    $textoAntes = substr($text, max(0, $pos - 400), min(400, $pos));
                    $credor = self::findLastCredorBefore($textoAntes);
                    $idx++;
                    $offers[] = [
                        'nome' => $credor ?: ('Credor '.$idx),
                        'valorTotal' => $valor,
                        'valorAtual' => $valor,
                    ];
                }
            }
        }

        return $offers;
    }

    /**
     * @param  list<string>  $blockLines
     */
    private static function pickCredorNameFromBlock(array $blockLines): ?string
    {
        $skip = [
            '/^R\$\s*[\d.,\s]+$/iu', '/^De\s+R\$/iu', '/Ver\s+detalhes/iu', '/Negociar/iu',
            '/^Pague\s+com\s+Pix/iu', '/At[eé]\s+\d+\s+vezes/iu', '/^Origem\s+/iu',
            '/Conta\s+atrasada/iu', '/D[ií]vida\s+negativada/iu', '/^\d+\s*%\s*de\s+desconto/iu',
            '/↓\s*\d+\s*%/u', '/^Suas\s+ofertas/iu', '/^por\s*$/iu', '/^R\$\s*$/u',
            '/^\d{2}\/\d{2}\/\d{4}$/', '/^\d+$/',
        ];
        $bestByKnown = null;
        $bestByShape = null;
        foreach ($blockLines as $ln) {
            $ln = trim((string) $ln);
            if (strlen($ln) < 2 || strlen($ln) > 70) {
                continue;
            }
            $skipHit = false;
            foreach ($skip as $p) {
                if (preg_match($p, $ln)) {
                    $skipHit = true;
                    break;
                }
            }
            if ($skipHit || preg_match('/^[\d.,\s]+$/', $ln)) {
                continue;
            }
            $known = self::findLastCredorBefore($ln);
            if ($known) {
                $bestByKnown = $known;
                break;
            }
            if ($bestByShape === null && preg_match('/^[A-Za-zÀ-ÿ\s&.-]+$/u', $ln) && ! str_contains($ln, 'R$')) {
                $bestByShape = $ln;
            }
        }

        return $bestByKnown ?: $bestByShape;
    }

    private static function findLastCredorBefore(string $texto): ?string
    {
        $last = null;
        $names = self::CREDORES;
        usort($names, static fn ($a, $b) => strlen($b) <=> strlen($a));
        $pattern = '/(?:'.implode('|', array_map(static fn ($n) => preg_quote($n, '/'), $names)).')/iu';
        if (preg_match_all($pattern, $texto, $m)) {
            $last = $m[0][count($m[0]) - 1] ?? null;
        }

        return $last;
    }
}
